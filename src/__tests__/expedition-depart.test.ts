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
  it("MIN_EXPEDITION_TURNS is a positive number; supplies is a 1-turn ration", () => {
    expect(MIN_EXPEDITION_TURNS).toBeGreaterThan(0);
    expect(EXPEDITION_FOOD_TURNS.supplies).toBe(1);
  });
});

describe("EXPEDITION/DEPART — happy path", () => {
  it("packs food, sets the turn budget, switches biome, opens the board", () => {
    const s0 = ready();
    const s1 = rootReducer(s0, { type: "EXPEDITION/DEPART", payload: { biomeKey: "mine", supply: { bread: 4 } } });
    expect(s1.farmRun.turnBudget).toBe(4);       // 4 bread x 1 turn
    expect(s1.farmRun.turnsRemaining).toBe(4);
    expect(inv(s1).bread).toBe(2);          // 6 − 4 packed
    expect(s1.biomeKey).toBe("mine");
    expect(s1.view).toBe("board");
    expect(s1.turnsUsed).toBe(0);
    expect(s1.session?.expedition).toMatchObject({ zoneId: "quarry", turns: 4 });
  });

  it("counts a building bonus (Larder +1 to every ration)", () => {
    const s0 = ready({ built: { ...createInitialState().built, quarry: { larder: true } } });
    const s1 = rootReducer(s0, { type: "EXPEDITION/DEPART", payload: { biomeKey: "mine", supply: { bread: 2 } } });
    expect(s1.farmRun.turnBudget).toBe(4);       // 2 bread x (1 + 1 larder)
    expect(s1.view).toBe("board");
  });

  it("works for the harbor (fish) biome too", () => {
    const s0 = withInv(
      ready({ mapCurrent: "harbor", activeZone: "harbor" }),
      { bread: 6, tile_fruit_apple: 4 },
      "harbor",
    );
    const s1 = rootReducer(s0, { type: "EXPEDITION/DEPART", payload: { biomeKey: "fish", supply: { bread: 5 } } });
    expect(s1.biomeKey).toBe("fish");
    expect(s1.farmRun.turnBudget).toBe(5);
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
    const s1 = rootReducer(s0, { type: "EXPEDITION/DEPART", payload: { biomeKey: "mine", supply: { bread: 1 } } }); // 1 < MIN(3)
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
