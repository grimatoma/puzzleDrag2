// Phase 5a — real-time crafting queue: QUEUE_RECIPE / CLAIM_CRAFT / SKIP_CRAFT,
// the craftQueue state, the 4h timer + gem-skip, and the boss-win gem source.
import { describe, it, expect, beforeEach } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { reduce as craftingReduce } from "../features/crafting/slice.js";
import { RECIPES, CRAFT_QUEUE_HOURS, CRAFT_GEM_SKIP_COST } from "../constants.js";

beforeEach(() => global.localStorage.clear());

const RECIPE_KEY = "bread";
const RECIPE = RECIPES[RECIPE_KEY];
const STATION = RECIPE.station;

// A state with the bakery built at home + enough of every input for one bread.
function bakeryReady(over = {}) {
  const s = createInitialState();
  const built = { ...s.built, home: { ...s.built.home, [STATION]: true } };
  const inventory = { ...s.inventory };
  for (const [res, need] of Object.entries(RECIPE.inputs)) inventory[res] = need * 3;
  return { ...s, built, inventory, ...over };
}

describe("constants + fresh state", () => {
  it("exposes CRAFT_QUEUE_HOURS and CRAFT_GEM_SKIP_COST", () => {
    expect(typeof CRAFT_QUEUE_HOURS).toBe("number");
    expect(typeof CRAFT_GEM_SKIP_COST).toBe("number");
  });
  it("fresh state has an empty craftQueue", () => {
    expect(createInitialState().craftQueue).toEqual([]);
  });
});

describe("CRAFTING/QUEUE_RECIPE", () => {
  it("deducts the inputs, adds a queue entry, and does NOT grant the output", () => {
    const s0 = bakeryReady();
    const before = { ...s0.inventory };
    const s1 = rootReducer(s0, { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    for (const [res, need] of Object.entries(RECIPE.inputs)) {
      expect(s1.inventory[res]).toBe(before[res] - need);
    }
    expect(s1.craftQueue).toHaveLength(1);
    expect(s1.craftQueue[0].key).toBe(RECIPE_KEY);
    expect(s1.craftQueue[0].readyAt).toBeGreaterThan(Date.now());
    expect(s1.inventory[RECIPE_KEY] ?? 0).toBe(0); // not granted yet
    expect(s1.coins).toBe(s0.coins);                // coins not granted yet
  });

  it("is a no-op without the station built (slice level)", () => {
    const s = { ...bakeryReady(), built: { home: { hearth: true } } };
    expect(craftingReduce(s, { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } })).toBe(s);
  });

  it("is a no-op without the inputs (slice level)", () => {
    const s = { ...bakeryReady(), inventory: { supplies: 0 } };
    expect(craftingReduce(s, { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } })).toBe(s);
  });
});

describe("CRAFTING/CLAIM_CRAFT", () => {
  it("is a no-op while the craft is still cooking (slice level)", () => {
    const s1 = craftingReduce(bakeryReady(), { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    expect(craftingReduce(s1, { type: "CRAFTING/CLAIM_CRAFT", payload: { idx: 0 } })).toBe(s1);
  });

  it("grants the output + coins + craftedTotals and clears the entry once ready", () => {
    let s = rootReducer(bakeryReady(), { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    // Fast-forward: pretend the timer elapsed.
    s = { ...s, craftQueue: [{ ...s.craftQueue[0], readyAt: Date.now() - 1000 }] };
    const coinsBefore = s.coins;
    s = rootReducer(s, { type: "CRAFTING/CLAIM_CRAFT", payload: { idx: 0 } });
    expect(s.craftQueue).toHaveLength(0);
    expect(s.inventory[RECIPE_KEY]).toBe(1);
    expect(s.coins).toBe(coinsBefore + (RECIPE.coins || 0));
    expect(s.craftedTotals[RECIPE_KEY]).toBe(1);
  });
});

describe("CRAFTING/SKIP_CRAFT", () => {
  it("is a no-op without enough gems", () => {
    const s1 = rootReducer({ ...bakeryReady(), gems: 0 }, { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    expect(rootReducer(s1, { type: "CRAFTING/SKIP_CRAFT", payload: { idx: 0 } })).toBe(s1);
  });

  it("spends a gem, grants the output immediately, and clears the entry", () => {
    let s = rootReducer({ ...bakeryReady(), gems: 2 }, { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    expect(s.craftQueue).toHaveLength(1);
    s = rootReducer(s, { type: "CRAFTING/SKIP_CRAFT", payload: { idx: 0 } });
    expect(s.gems).toBe(2 - CRAFT_GEM_SKIP_COST);
    expect(s.craftQueue).toHaveLength(0);
    expect(s.inventory[RECIPE_KEY]).toBe(1);
    expect(s.craftedTotals[RECIPE_KEY]).toBe(1);
  });
});

describe("queued completions bump totalCrafted + fire craft_made", () => {
  // Wave H — H1: claim/skip used to silently complete without bumping the
  // achievements counter or firing the craft_made event. coreReducer now
  // emits craft_made for both paths; the crafting slice bumps totalCrafted.
  it("CLAIM_CRAFT bumps totalCrafted by 1", () => {
    let s = rootReducer(bakeryReady(), { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    s = { ...s, craftQueue: [{ ...s.craftQueue[0], readyAt: Date.now() - 1000 }] };
    const before = s.totalCrafted ?? 0;
    s = rootReducer(s, { type: "CRAFTING/CLAIM_CRAFT", payload: { idx: 0 } });
    expect(s.totalCrafted).toBe(before + 1);
  });

  it("SKIP_CRAFT bumps totalCrafted by 1", () => {
    let s = rootReducer({ ...bakeryReady(), gems: 2 }, { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    const before = s.totalCrafted ?? 0;
    s = rootReducer(s, { type: "CRAFTING/SKIP_CRAFT", payload: { idx: 0 } });
    expect(s.totalCrafted).toBe(before + 1);
  });

  it("a rejected CLAIM_CRAFT does NOT bump totalCrafted (entry not ready)", () => {
    const s0 = rootReducer(bakeryReady(), { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    const before = s0.totalCrafted ?? 0;
    const s1 = rootReducer(s0, { type: "CRAFTING/CLAIM_CRAFT", payload: { idx: 0 } });
    expect(s1.totalCrafted ?? 0).toBe(before);
  });

  it("a rejected SKIP_CRAFT does NOT bump totalCrafted (no gems)", () => {
    const s0 = rootReducer({ ...bakeryReady(), gems: 0 }, { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    const before = s0.totalCrafted ?? 0;
    const s1 = rootReducer(s0, { type: "CRAFTING/SKIP_CRAFT", payload: { idx: 0 } });
    expect(s1.totalCrafted ?? 0).toBe(before);
  });
});

describe("gems are earnable from boss wins", () => {
  it("a boss victory grants a gem", () => {
    const s0 = { ...createInitialState(), boss: { key: "storm", resource: "fish_fillet", targetCount: 6, progress: 6, turnsLeft: 5 }, modal: "boss", gems: 0 };
    const s1 = rootReducer(s0, { type: "BOSS/RESOLVE", won: true });
    expect(s1.gems).toBe(1);
  });
});
