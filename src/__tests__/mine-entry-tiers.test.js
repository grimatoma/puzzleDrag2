import { describe, it, expect, beforeEach } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { RECIPES, MINE_ENTRY_TIERS, MAX_TURNS } from "../constants.js";

beforeEach(() => global.localStorage.clear());

describe("Phase 3.6 — Mine entry tiers", () => {
  it("registers shovel recipe at workshop tier 1", () => {
    expect(RECIPES.shovel).toMatchObject({
      inputs: { plank: 1, stone: 1 }, tier: 1, station: "workshop", coins: 25,
    });
  });

  it("fresh state seeds shovel = 0", () => {
    expect(createInitialState().shovel).toBe(0);
  });

  it("crafts 1 shovel for 1 plank + 1 stone", () => {
    const s0 = { ...createInitialState(), inventory: { plank: 2, stone: 2 }, built: { hearth: true, workshop: true } };
    const s1 = rootReducer(s0, { type: "CRAFT", payload: { id: "shovel", qty: 1 } });
    expect(s1.shovel).toBe(1);
    expect(s1.inventory.plank).toBe(1);
    expect(s1.inventory.stone).toBe(1);
  });

  it("MINE_ENTRY_TIERS lists three tiers in spec order", () => {
    expect(MINE_ENTRY_TIERS.map((t) => t.id)).toEqual(["free", "better", "premium"]);
  });

  it("rejects MINE/ENTER without act3_mine_opened flag", () => {
    const s = { ...createInitialState(), inventory: { supplies: 5 } };
    const r = rootReducer(s, { type: "MINE/ENTER", payload: { tier: "free" } });
    expect(r.biomeKey).toBe("farm");
  });

  it("free tier consumes 3 supplies and switches biome", () => {
    const s = {
      ...createInitialState(),
      inventory: { supplies: 5 },
      story: { flags: { act3_mine_opened: true } },
    };
    const r = rootReducer(s, { type: "MINE/ENTER", payload: { tier: "free" } });
    expect(r.biomeKey).toBe("mine");
    expect(r.inventory.supplies).toBe(2);
  });

  it("better tier consumes 100 coins + 10 shovels and extends session by 2 turns", () => {
    const s = {
      ...createInitialState(),
      coins: 150,
      shovel: 12,
      story: { flags: { act3_mine_opened: true } },
    };
    const r = rootReducer(s, { type: "MINE/ENTER", payload: { tier: "better" } });
    expect(r.biomeKey).toBe("mine");
    expect(r.coins).toBe(50);
    expect(r.shovel).toBe(2);
    expect(r.sessionMaxTurns).toBe(MAX_TURNS + 2);
  });

  it("better tier rejected when shovels short", () => {
    const s = {
      ...createInitialState(),
      coins: 100,
      shovel: 9,
      story: { flags: { act3_mine_opened: true } },
    };
    const r = rootReducer(s, { type: "MINE/ENTER", payload: { tier: "better" } });
    expect(r.biomeKey).toBe("farm");
    expect(r.coins).toBe(100);
    expect(r.shovel).toBe(9);
  });

  it("better tier rejected when coins short", () => {
    const s = {
      ...createInitialState(),
      coins: 50,
      shovel: 10,
      story: { flags: { act3_mine_opened: true } },
    };
    const r = rootReducer(s, { type: "MINE/ENTER", payload: { tier: "better" } });
    expect(r.biomeKey).toBe("farm");
  });

  it("premium tier consumes 2 runes only, no supplies/shovels/coins", () => {
    const s = {
      ...createInitialState(),
      runes: 3,
      coins: 0,
      shovel: 0,
      inventory: { supplies: 0 },
      story: { flags: { act3_mine_opened: true } },
    };
    const r = rootReducer(s, { type: "MINE/ENTER", payload: { tier: "premium" } });
    expect(r.biomeKey).toBe("mine");
    expect(r.runes).toBe(1);
  });

  it("CLOSE_SEASON resets sessionMaxTurns to MAX_TURNS", () => {
    const s = {
      ...createInitialState(),
      sessionMaxTurns: MAX_TURNS + 2,
    };
    const r = rootReducer(s, { type: "CLOSE_SEASON" });
    expect(r.sessionMaxTurns).toBe(MAX_TURNS);
  });
});
