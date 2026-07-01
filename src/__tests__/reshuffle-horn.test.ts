import { describe, it, expect } from "vitest";
import { gameReducer } from "../state.js";

// ─── helpers ──────────────────────────────────────────────────────────────────

function minState(overrides = {}) {
  return {
    biomeKey: "farm",
    view: "board",
    coins: 100,
    level: 1,
    xp: 0,
    turnsUsed: 0,
    seasonsCycled: 1,
    inventory: {},
    orders: [],
    tools: { clear: 0, basic: 0, rare: 0, shuffle: 0 },
    built: {},
    bubble: null,
    modal: null,
    pendingView: null,
    seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0 },
    _hintsShown: {},
    ...overrides,
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("Reshuffle Horn — USE_TOOL { key: 'shuffle' }", () => {
  it("decrements tools.shuffle by 1 on use", () => {
    const s = minState({ tools: { shuffle: 2, clear: 0, basic: 0, rare: 0 } });
    const after = gameReducer(s, { type: "USE_TOOL", payload: { key: "shuffle" } });
    expect(after.tools.shuffle).toBe(1);
  });

  it("is a referentially-equal no-op when count is 0", () => {
    const s = minState({ tools: { shuffle: 0, clear: 0, basic: 0, rare: 0 } });
    const after = gameReducer(s, { type: "USE_TOOL", payload: { key: "shuffle" } });
    expect(after).toBe(s);
  });

  it("does not consume a turn", () => {
    const s = minState({ tools: { shuffle: 1, clear: 0, basic: 0, rare: 0 }, turnsUsed: 4 });
    const after = gameReducer(s, { type: "USE_TOOL", payload: { key: "shuffle" } });
    expect(after.turnsUsed).toBe(4);
  });

  it("sets toolPending to 'shuffle'", () => {
    const s = minState({ tools: { shuffle: 1, clear: 0, basic: 0, rare: 0 } });
    const after = gameReducer(s, { type: "USE_TOOL", payload: { key: "shuffle" } });
    expect(after.toolPending).toBe("shuffle");
  });
});
