// Phase 5 — per-station real-time crafting queues. Each station has its own
// sequential queue under `craftQueues[station]`. Stations craft in parallel;
// within a station only the head ticks down.
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
  for (const [res, need] of Object.entries(RECIPE.inputs)) inventory[res] = need * 4;
  return { ...s, built, inventory, ...over };
}

describe("constants + fresh state", () => {
  it("exposes CRAFT_QUEUE_HOURS and CRAFT_GEM_SKIP_COST", () => {
    expect(typeof CRAFT_QUEUE_HOURS).toBe("number");
    expect(typeof CRAFT_GEM_SKIP_COST).toBe("number");
  });
  it("fresh state has an empty craftQueues map", () => {
    expect(createInitialState().craftQueues).toEqual({});
  });
});

describe("CRAFTING/QUEUE_RECIPE", () => {
  it("deducts inputs and appends a queue entry under the recipe's station", () => {
    const s0 = bakeryReady();
    const before = { ...s0.inventory };
    const s1 = rootReducer(s0, { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    for (const [res, need] of Object.entries(RECIPE.inputs)) {
      expect(s1.inventory[res]).toBe(before[res] - need);
    }
    expect(s1.craftQueues[STATION]).toHaveLength(1);
    expect(s1.craftQueues[STATION][0].key).toBe(RECIPE_KEY);
    expect(s1.craftQueues[STATION][0].readyAt).toBeGreaterThan(Date.now());
    expect(s1.craftQueues[STATION][0].startAt).toBeLessThanOrEqual(Date.now() + 5);
    expect(s1.craftQueues[STATION][0].durationMs).toBeGreaterThan(0);
    expect(s1.inventory[RECIPE_KEY] ?? 0).toBe(0); // not granted yet
    expect(s1.coins).toBe(s0.coins);                // coins not granted yet
  });

  it("stacks sequentially within a station: 2nd entry's startAt equals 1st's readyAt", () => {
    let s = bakeryReady();
    s = rootReducer(s, { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    s = rootReducer(s, { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    const queue = s.craftQueues[STATION];
    expect(queue).toHaveLength(2);
    expect(queue[1].startAt).toBe(queue[0].readyAt);
    expect(queue[1].readyAt).toBe(queue[0].readyAt + queue[1].durationMs);
  });

  it("keeps each station's queue independent — workshop queue stays empty when queuing bread", () => {
    const s0 = bakeryReady({
      built: { ...bakeryReady().built, home: { ...bakeryReady().built.home, [STATION]: true, workshop: true } },
      inventory: { ...bakeryReady().inventory, wood_plank: 2 },
    });
    const s1 = rootReducer(s0, { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    expect(s1.craftQueues[STATION]).toHaveLength(1);
    expect(s1.craftQueues.workshop ?? []).toHaveLength(0);
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
  it("is a no-op while the head is still cooking (slice level)", () => {
    const s1 = craftingReduce(bakeryReady(), { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    expect(craftingReduce(s1, { type: "CRAFTING/CLAIM_CRAFT", payload: { station: STATION } })).toBe(s1);
  });

  it("is a no-op without a station argument", () => {
    let s = rootReducer(bakeryReady(), { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    s = {
      ...s,
      craftQueues: { ...s.craftQueues, [STATION]: [{ ...s.craftQueues[STATION][0], readyAt: Date.now() - 1000 }] },
    };
    expect(craftingReduce(s, { type: "CRAFTING/CLAIM_CRAFT", payload: {} })).toBe(s);
  });

  it("grants the output + coins + craftedTotals and pops the head once ready", () => {
    let s = rootReducer(bakeryReady(), { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    // Fast-forward: pretend the timer elapsed.
    s = {
      ...s,
      craftQueues: { ...s.craftQueues, [STATION]: [{ ...s.craftQueues[STATION][0], readyAt: Date.now() - 1000 }] },
    };
    const coinsBefore = s.coins;
    s = rootReducer(s, { type: "CRAFTING/CLAIM_CRAFT", payload: { station: STATION } });
    expect(s.craftQueues[STATION]).toHaveLength(0);
    expect(s.inventory[RECIPE_KEY]).toBe(1);
    expect(s.coins).toBe(coinsBefore + (RECIPE.coins || 0));
    expect(s.craftedTotals[RECIPE_KEY]).toBe(1);
  });
});

describe("CRAFTING/SKIP_CRAFT", () => {
  it("is a no-op without enough gems", () => {
    const s1 = rootReducer({ ...bakeryReady(), gems: 0 }, { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    expect(rootReducer(s1, { type: "CRAFTING/SKIP_CRAFT", payload: { station: STATION } })).toBe(s1);
  });

  it("is a no-op without a station argument", () => {
    const s = rootReducer({ ...bakeryReady(), gems: 2 }, { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    expect(craftingReduce(s, { type: "CRAFTING/SKIP_CRAFT", payload: {} })).toBe(s);
  });

  it("spends a gem, grants the output immediately, and pops the head", () => {
    let s = rootReducer({ ...bakeryReady(), gems: 2 }, { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    expect(s.craftQueues[STATION]).toHaveLength(1);
    s = rootReducer(s, { type: "CRAFTING/SKIP_CRAFT", payload: { station: STATION } });
    expect(s.gems).toBe(2 - CRAFT_GEM_SKIP_COST);
    expect(s.craftQueues[STATION]).toHaveLength(0);
    expect(s.inventory[RECIPE_KEY]).toBe(1);
    expect(s.craftedTotals[RECIPE_KEY]).toBe(1);
  });

  it("shifts the rest of THAT station's queue forward by the skipped item's leftover time", () => {
    let s = rootReducer({ ...bakeryReady(), gems: 2 }, { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    s = rootReducer(s, { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    expect(s.craftQueues[STATION]).toHaveLength(2);
    const secondBefore = s.craftQueues[STATION][1];
    s = rootReducer(s, { type: "CRAFTING/SKIP_CRAFT", payload: { station: STATION } });
    expect(s.craftQueues[STATION]).toHaveLength(1);
    const newHead = s.craftQueues[STATION][0];
    expect(newHead.startAt).toBeLessThanOrEqual(Date.now() + 5);
    expect(newHead.startAt).toBeLessThan(secondBefore.startAt);
  });
});

describe("queued completions bump totalCrafted + fire craft_made", () => {
  // Wave H — H1: claim/skip used to silently complete without bumping the
  // achievements counter or firing the craft_made event. coreReducer now
  // emits craft_made for both paths; the crafting slice bumps totalCrafted.
  it("CLAIM_CRAFT bumps totalCrafted by 1", () => {
    let s = rootReducer(bakeryReady(), { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    s = {
      ...s,
      craftQueues: { ...s.craftQueues, [STATION]: [{ ...s.craftQueues[STATION][0], readyAt: Date.now() - 1000 }] },
    };
    const before = s.totalCrafted ?? 0;
    s = rootReducer(s, { type: "CRAFTING/CLAIM_CRAFT", payload: { station: STATION } });
    expect(s.totalCrafted).toBe(before + 1);
  });

  it("SKIP_CRAFT bumps totalCrafted by 1", () => {
    let s = rootReducer({ ...bakeryReady(), gems: 2 }, { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    const before = s.totalCrafted ?? 0;
    s = rootReducer(s, { type: "CRAFTING/SKIP_CRAFT", payload: { station: STATION } });
    expect(s.totalCrafted).toBe(before + 1);
  });

  it("a rejected CLAIM_CRAFT does NOT bump totalCrafted (entry not ready)", () => {
    const s0 = rootReducer(bakeryReady(), { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    const before = s0.totalCrafted ?? 0;
    const s1 = rootReducer(s0, { type: "CRAFTING/CLAIM_CRAFT", payload: { station: STATION } });
    expect(s1.totalCrafted ?? 0).toBe(before);
  });

  it("a rejected SKIP_CRAFT does NOT bump totalCrafted (no gems)", () => {
    const s0 = rootReducer({ ...bakeryReady(), gems: 0 }, { type: "CRAFTING/QUEUE_RECIPE", payload: { key: RECIPE_KEY } });
    const before = s0.totalCrafted ?? 0;
    const s1 = rootReducer(s0, { type: "CRAFTING/SKIP_CRAFT", payload: { station: STATION } });
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
