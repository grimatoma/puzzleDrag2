import { describe, it, expect, beforeEach } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { MINE_ENTRY_TIERS, MAX_TURNS } from "../constants.js";

beforeEach(() => global.localStorage.clear());

describe("Phase 3.6 — Mine entry tiers", () => {
  it("MINE_ENTRY_TIERS lists three tiers in spec order", () => {
    expect(MINE_ENTRY_TIERS.map((t) => t.id)).toEqual(["free", "better", "premium"]);
  });

  it("rejects MINE/ENTER without mine_unlocked flag", () => {
    const s = { ...createInitialState(), inventory: { supplies: 5 } };
    const r = rootReducer(s, { type: "MINE/ENTER", payload: { tier: "free" } });
    expect(r.biomeKey).toBe("farm");
  });

  it("free tier consumes 3 supplies and switches biome", () => {
    const s = {
      ...createInitialState(),
      inventory: { supplies: 5 },
      story: { flags: { mine_unlocked: true } },
    };
    const r = rootReducer(s, { type: "MINE/ENTER", payload: { tier: "free" } });
    expect(r.biomeKey).toBe("mine");
    expect(r.inventory.supplies).toBe(2);
  });

  it("better tier consumes 100 coins and extends session by 2 turns", () => {
    const s = {
      ...createInitialState(),
      coins: 150,
      story: { flags: { mine_unlocked: true } },
    };
    const r = rootReducer(s, { type: "MINE/ENTER", payload: { tier: "better" } });
    expect(r.biomeKey).toBe("mine");
    expect(r.coins).toBe(50);
    expect(r.sessionMaxTurns).toBe(MAX_TURNS + 2);
  });

  it("better tier rejected when coins short", () => {
    const s = {
      ...createInitialState(),
      coins: 50,
      story: { flags: { mine_unlocked: true } },
    };
    const r = rootReducer(s, { type: "MINE/ENTER", payload: { tier: "better" } });
    expect(r.biomeKey).toBe("farm");
  });

  it("premium tier consumes 2 runes only, no supplies/coins", () => {
    const s = {
      ...createInitialState(),
      runes: 3,
      coins: 0,
      inventory: { supplies: 0 },
      story: { flags: { mine_unlocked: true } },
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
