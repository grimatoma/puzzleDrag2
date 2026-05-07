/**
 * QA Batch 2 — Fix 5: spawnMysteriousOre / tickMysteriousOre wired to game flow
 */
import { describe, it, expect } from "vitest";
import { createInitialState, rootReducer } from "../src/state.js";

function makeGrid(rows = 6, cols = 6, key = "stone") {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ key }))
  );
}

function mineState() {
  global.localStorage?.clear?.();
  const s = createInitialState();
  return {
    ...s,
    biome: "mine",
    biomeKey: "mine",
    grid: makeGrid(),
    mysteriousOre: null,
    story: { ...s.story, flags: { ...s.story?.flags, mine_unlocked: true } },
  };
}

describe("Fix 5 — spawnMysteriousOre wired on mine entry (SET_BIOME)", () => {
  it("SET_BIOME mine with grid spawns mysterious ore", () => {
    const farmState = {
      ...mineState(),
      biome: "farm",
      biomeKey: "farm",
      turnsUsed: 0,
    };
    const next = rootReducer(farmState, { type: "SET_BIOME", id: "mine" });
    expect(next.biome).toBe("mine");
    expect(next.mysteriousOre).not.toBeNull();
    expect(next.mysteriousOre?.turnsRemaining).toBe(5);
  });

  it("SET_BIOME farm clears mysteriousOre", () => {
    const s = {
      ...mineState(),
      turnsUsed: 0,
      mysteriousOre: { row: 2, col: 3, turnsRemaining: 3 },
    };
    const next = rootReducer(s, { type: "SET_BIOME", id: "farm" });
    expect(next.mysteriousOre).toBeNull();
  });
});

describe("Fix 5 — tickMysteriousOre wired on CHAIN_COLLECTED in mine", () => {
  it("CHAIN_COLLECTED in mine decrements mysterious ore countdown", () => {
    const s = {
      ...mineState(),
      mysteriousOre: { row: 2, col: 3, turnsRemaining: 5 },
    };
    const next = rootReducer(s, {
      type: "CHAIN_COLLECTED",
      payload: { key: "stone", gained: 3, upgrades: 0, value: 1, chainLength: 3, noTurn: false },
    });
    expect(next.mysteriousOre?.turnsRemaining).toBe(4);
  });

  it("after 5 CHAIN_COLLECTED actions, mysterious ore expires to dirt", () => {
    let s = {
      ...mineState(),
      mysteriousOre: { row: 2, col: 3, turnsRemaining: 5 },
    };
    const payload = { key: "stone", gained: 2, upgrades: 0, value: 1, chainLength: 2, noTurn: false };
    for (let i = 0; i < 5; i++) {
      s = rootReducer(s, { type: "CHAIN_COLLECTED", payload });
    }
    expect(s.mysteriousOre).toBeNull();
  });

  it("CHAIN_COLLECTED in farm does NOT tick mysterious ore", () => {
    const s = {
      ...mineState(),
      biome: "farm",
      biomeKey: "farm",
      mysteriousOre: { row: 2, col: 3, turnsRemaining: 5 },
    };
    const next = rootReducer(s, {
      type: "CHAIN_COLLECTED",
      payload: { key: "hay", gained: 3, upgrades: 0, value: 1, chainLength: 3, noTurn: false },
    });
    expect(next.mysteriousOre?.turnsRemaining).toBe(5);
  });
});
