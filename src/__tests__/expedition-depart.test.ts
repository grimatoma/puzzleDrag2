// Phase 5d — EXPEDITION/DEPART: supply-structured mine/harbor entry (master doc §VI).
import { describe, it, expect, beforeEach } from "vitest";
import { inv, patchInventory, withInv } from "../testUtils/inventory.js";
import { rootReducer, createInitialState } from "../state.js";
import { MIN_EXPEDITION_TURNS, EXPEDITION_FOOD_TURNS } from "../constants.js";

beforeEach(() => global.localStorage.clear());

// A state ready to set out on a mine expedition from `quarry` with `bread` in
// the larder. `biomeKey` is forced off "mine" so SWITCH_BIOME's no-op guard passes.
// Phase 6a — quarry/harbor must be founded to depart; pre-found them here.
function ready(over = {}) {
  const base = {
    ...createInitialState(),
    level: 5,
    biomeKey: "farm",
    mapCurrent: "quarry",
    activeZone: "quarry",
    settlements: {
      home: { founded: true },
      quarry: { founded: true, biome: "tundra" },
      harbor: { founded: true, biome: "kelp_coast" },
    },
    story: { ...createInitialState().story, flags: { ...createInitialState().story.flags, mine_unlocked: true } },
  };
  return { ...base, ...patchInventory(base, { bread: 6, tile_fruit_apple: 4 }, "quarry"), ...over };
}

describe("constants", () => {
  it("MIN_EXPEDITION_TURNS is the 12-turn pack minimum; any food is a ration", () => {
    expect(MIN_EXPEDITION_TURNS).toBe(12);
    expect(EXPEDITION_FOOD_TURNS.bread).toBe(2);            // crafted staple
    expect(EXPEDITION_FOOD_TURNS.tile_fruit_apple).toBe(1); // raw produce
    expect((EXPEDITION_FOOD_TURNS as Record<string, number>).supplies).toBe(4); // dense ration

  });
});

describe("EXPEDITION/DEPART — happy path", () => {
  it("packs food, sets the turn budget, switches biome, opens the board", () => {
    const s0 = ready();
    const s1 = rootReducer(s0, { type: "EXPEDITION/DEPART", payload: { biomeKey: "mine", supply: { bread: 6 } } });
    expect(s1.farmRun.turnBudget).toBe(12);      // 6 bread x 2 turns
    expect(s1.farmRun.turnsRemaining).toBe(12);
    expect(inv(s1).bread ?? 0).toBe(0);     // 6 − 6 packed
    expect(s1.biomeKey).toBe("mine");
    expect(s1.view).toBe("board");
    expect(s1.turnsUsed).toBe(0);
    expect(s1.session?.expedition).toMatchObject({ zoneId: "quarry", turns: 12 });
  });

  it("counts a building bonus (Larder +1 to every ration)", () => {
    const s0 = ready({ built: { ...createInitialState().built, quarry: { larder: true } } });
    const s1 = rootReducer(s0, { type: "EXPEDITION/DEPART", payload: { biomeKey: "mine", supply: { bread: 4 } } });
    expect(s1.farmRun.turnBudget).toBe(12);      // 4 bread x (2 + 1 larder)
    expect(s1.view).toBe("board");
  });

  it("works for the harbor (fish) biome too", () => {
    const s0 = withInv(
      ready({ mapCurrent: "harbor", activeZone: "harbor" }),
      { bread: 6, tile_fruit_apple: 4 },
      "harbor",
    );
    const s1 = rootReducer(s0, { type: "EXPEDITION/DEPART", payload: { biomeKey: "fish", supply: { bread: 6 } } });
    expect(s1.biomeKey).toBe("fish");
    expect(s1.farmRun.turnBudget).toBe(12);      // 6 bread x 2 turns
    expect(s1.view).toBe("board");
  });
});

describe("EXPEDITION/DEPART — rejections", () => {
  it("not enough food → no change", () => {
    const s0 = withInv(ready(), { bread: 2 }, "quarry");
    const s1 = rootReducer(s0, { type: "EXPEDITION/DEPART", payload: { biomeKey: "mine", supply: { bread: 4 } } });
    expect(s1.view).not.toBe("board");
    expect(inv(s1).bread).toBe(2);
    expect(s1.biomeKey).toBe("farm");
  });

  it("below MIN_EXPEDITION_TURNS → no change", () => {
    const s0 = ready();
    const s1 = rootReducer(s0, { type: "EXPEDITION/DEPART", payload: { biomeKey: "mine", supply: { bread: 1 } } }); // 2 turns < MIN(12)
    expect(s1.view).not.toBe("board");
    expect(inv(s1).bread).toBe(6);
  });

  it("a non-expedition biome (farm) → no change", () => {
    const s0 = ready();
    const s1 = rootReducer(s0, { type: "EXPEDITION/DEPART", payload: { biomeKey: "farm", supply: { bread: 5 } } });
    expect(s1.view).not.toBe("board");
    expect(inv(s1).bread).toBe(6);
  });

  it("a non-ration key in the supply → no change", () => {
    const s0 = withInv(ready(), { bread: 6, tile_mine_stone: 50 }, "quarry");
    const s1 = rootReducer(s0, { type: "EXPEDITION/DEPART", payload: { biomeKey: "mine", supply: { tile_mine_stone: 4 } } });
    expect(s1.view).not.toBe("board");
    expect(inv(s1).tile_mine_stone).toBe(50);
  });

  it("departing from an unfounded zone → no change", () => {
    // Access is gated by founding the zone, not by player level: clear the
    // quarry settlement so the founding guard rejects the expedition.
    const s0 = ready({ settlements: { home: { founded: true } } });
    const s1 = rootReducer(s0, { type: "EXPEDITION/DEPART", payload: { biomeKey: "mine", supply: { bread: 5 } } });
    expect(s1.view).not.toBe("board");
    expect(inv(s1).bread).toBe(6);
  });
});
