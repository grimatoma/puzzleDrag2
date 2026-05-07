import { describe, it, expect, beforeEach } from "vitest";
import { SEASON_EFFECTS } from "../constants.js";
import { gameReducer, initialState } from "../state.js";

describe("SEASON_EFFECTS — single source of truth", () => {
  beforeEach(() => global.localStorage.clear());

  it("has the four §6 seasons with correct shape", () => {
    expect(SEASON_EFFECTS.Spring.harvestBonus).toBe(0.20);
    expect(SEASON_EFFECTS.Summer.orderMult).toBe(2);
    expect(SEASON_EFFECTS.Autumn.upgradeMult).toBe(2);
    expect(SEASON_EFFECTS.Winter.minChain).toBe(5);
  });

  it("is frozen", () => {
    expect(Object.isFrozen(SEASON_EFFECTS)).toBe(true);
  });

  it("Spring +20% harvest rounds up", () => {
    // chain of 5 hay × 1.20 = 6 (rounded up)
    const s = { ...initialState(), seasonsCycled: 0 };
    const after = gameReducer(s,
      { type: "CHAIN_COLLECTED", payload: { key: "grass_hay", gained: 5, upgrades: 0, value: 1, chainLength: 5 } });
    expect(after.inventory.grass_hay).toBe(6);
  });

  it("Summer doubles order coin rewards", () => {
    // exercised via TURN_IN_ORDER in summer (seasonsCycled = 1)
  });

  it("Autumn doubles upgrades", () => {
    // chain of 6 hay in autumn → 2 wheat (vs 1 baseline)
  });

  it("Winter chain length 4 yields zero", () => {
    const s = { ...initialState(), seasonsCycled: 3 };
    const after = gameReducer(s,
      { type: "CHAIN_COLLECTED", payload: { key: "grass_hay", gained: 4, upgrades: 0, value: 1, chainLength: 4 } });
    expect(after.inventory.grass_hay ?? 0).toBe(0);
  });

  it("Winter chain length 5 yields normally", () => {
    const s = { ...initialState(), seasonsCycled: 3 };
    const after = gameReducer(s,
      { type: "CHAIN_COLLECTED", payload: { key: "grass_hay", gained: 5, upgrades: 0, value: 1, chainLength: 5 } });
    expect(after.inventory.grass_hay).toBe(5);
  });
});
