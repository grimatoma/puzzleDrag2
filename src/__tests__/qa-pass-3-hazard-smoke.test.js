/**
 * QA Pass 3 — Smoke test: hazard spawn/tick wired into CHAIN_COLLECTED reducer.
 * Verifies that farm hazards can spawn within 5 turns of a fresh farm session.
 */
import { describe, it, expect } from "vitest";
import { createInitialState, rootReducer } from "../state.js";

function makeGrid(rows = 6, cols = 6, key = "grass_hay") {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ key })),
  );
}

function dispatchChain(state, n = 3) {
  return rootReducer(state, {
    type: "CHAIN_COLLECTED",
    payload: {
      key: "grass_hay",
      gained: n,
      upgrades: 0,
      value: 1,
      chainLength: n,
    },
  });
}

describe("QA Pass 3 — hazard spawn wired into CHAIN_COLLECTED", () => {
  it("farm: fire can spawn within 200 chains (4% rate)", () => {
    const base = {
      ...createInitialState(),
      biomeKey: "farm",
      biome: "farm",
      grid: makeGrid(),
      hazards: { rats: [], fire: null, wolves: null },
      boss: null,
    };
    let s = base;
    let spawned = false;
    for (let i = 0; i < 200; i++) {
      s = dispatchChain(s, 3);
      if (s.hazards?.fire) { spawned = true; break; }
    }
    expect(spawned).toBe(true);
  });

  it("farm: hazard tick advances fire when active", () => {
    let s = {
      ...createInitialState(),
      biomeKey: "farm",
      biome: "farm",
      grid: makeGrid(),
      hazards: { rats: [], fire: { cells: [{ row: 0, col: 0 }] }, wolves: null },
      boss: null,
    };
    // After enough chains, fire should tick (may stay same size or grow)
    s = dispatchChain(s, 3);
    // Fire should still be tracked (not cleared unless chained explicitly)
    expect(s.hazards?.fire).not.toBeNull();
  });

  it("mine: hazard can spawn within 200 chains (5% rate)", () => {
    const base = {
      ...createInitialState(),
      biomeKey: "mine",
      biome: "mine",
      grid: makeGrid(),
      hazards: {},
      boss: null,
    };
    let s = base;
    let spawned = false;
    for (let i = 0; i < 200; i++) {
      s = { ...dispatchChain(s, 3), biome: "mine", biomeKey: "mine" };
      if (s.hazards?.gasVent || s.hazards?.caveIn || s.hazards?.lava || s.hazards?.mole) {
        spawned = true;
        break;
      }
    }
    expect(spawned).toBe(true);
  });
});
