import { describe, it, expect } from "vitest";
import { isDeadlyToPests, tryDeadlyPestsKill } from "../features/farm/deadlyPests.js";
import { rootReducer, createInitialState } from "../state.js";
import { RAT_CLEAR_REWARD_PER } from "../constants.js";

describe("isDeadlyToPests", () => {
  it("returns true for cypress / beet / phoenix", () => {
    expect(isDeadlyToPests("tree_cypress")).toBe(true);
    expect(isDeadlyToPests("veg_beet")).toBe(true);
    expect(isDeadlyToPests("bird_phoenix")).toBe(true);
  });

  it("returns false for non-deadly keys", () => {
    expect(isDeadlyToPests("grass_hay")).toBe(false);
    expect(isDeadlyToPests("fish_sardine")).toBe(false);
    expect(isDeadlyToPests("anything")).toBe(false);
  });
});

describe("tryDeadlyPestsKill", () => {
  it("returns null when chain has no deadly tile", () => {
    const state = { hazards: { rats: [{ row: 0, col: 0 }] } };
    const chain = [{ key: "grass_hay", row: 1, col: 1 }];
    expect(tryDeadlyPestsKill(state, chain)).toBeNull();
  });

  it("returns null when no rats are active", () => {
    const state = { hazards: { rats: [] } };
    const chain = [{ key: "tree_cypress", row: 1, col: 1 }];
    expect(tryDeadlyPestsKill(state, chain)).toBeNull();
  });

  it("returns null when deadly chain has no adjacent rats", () => {
    const state = { hazards: { rats: [{ row: 5, col: 5 }] } };
    const chain = [{ key: "tree_cypress", row: 0, col: 0 }];
    expect(tryDeadlyPestsKill(state, chain)).toBeNull();
  });

  it("kills rats orthogonally adjacent to a chain cell", () => {
    const state = {
      coins: 0,
      hazards: { rats: [{ row: 0, col: 1 }, { row: 5, col: 5 }] }, // first adj to (0,0), second far
    };
    const chain = [{ key: "tree_cypress", row: 0, col: 0 }];
    const r = tryDeadlyPestsKill(state, chain);
    expect(r).not.toBeNull();
    expect(r.hazards.rats).toHaveLength(1);
    expect(r.hazards.rats[0]).toEqual({ row: 5, col: 5 });
    expect(r.coins).toBe(RAT_CLEAR_REWARD_PER);
    expect(r._deadlyKills).toBe(1);
  });

  it("kills rats on the same cell as a chain tile (also counted adjacent)", () => {
    const state = {
      coins: 0,
      hazards: { rats: [{ row: 0, col: 0 }] },
    };
    const chain = [{ key: "veg_beet", row: 0, col: 0 }];
    const r = tryDeadlyPestsKill(state, chain);
    expect(r).not.toBeNull();
    expect(r.hazards.rats).toHaveLength(0);
  });

  it("scales coin reward with kill count", () => {
    const state = {
      coins: 0,
      hazards: { rats: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] },
    };
    const chain = [{ key: "bird_phoenix", row: 0, col: 1 }];
    const r = tryDeadlyPestsKill(state, chain);
    expect(r._deadlyKills).toBe(3);
    expect(r.coins).toBe(3 * RAT_CLEAR_REWARD_PER);
  });

  it("empty chain returns null", () => {
    const state = { hazards: { rats: [{ row: 0, col: 0 }] } };
    expect(tryDeadlyPestsKill(state, [])).toBeNull();
    expect(tryDeadlyPestsKill(state, null)).toBeNull();
  });
});

describe("CHAIN_COLLECTED with deadly_pests in chain (smoke)", () => {
  it("rootReducer applies deadly-pests kill via the chain handler", () => {
    const s0 = {
      ...createInitialState(),
      coins: 0,
      biome: "farm",
      biomeKey: "farm",
      hazards: { ...createInitialState().hazards, rats: [{ row: 0, col: 1 }] },
    };
    const chain = [{ key: "tree_cypress", row: 0, col: 0 }];
    const s1 = rootReducer(s0, {
      type: "CHAIN_COLLECTED",
      payload: { chain, key: "tree_cypress", gained: 1, chainLength: 1, value: 1, upgrades: 0 },
    });
    // Rat at (0,1) is adjacent to chain cell (0,0) → killed.
    expect(s1.hazards.rats).toHaveLength(0);
    // Coin bonus credited.
    expect(s1.coins).toBeGreaterThan(0);
  });
});
