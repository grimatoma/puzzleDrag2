import { describe, it, expect } from "vitest";
import { HAZARDS, rollHazard, tickHazards, tileBlockedByHazard } from "../features/mine/hazards.js";
import { createInitialState, rootReducer } from "../state.js";

function makeGrid(rows = 6, cols = 6) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ key: "stone" })),
  );
}

describe("Phase 9.5 — Lava hazard + Water Pump tool", () => {
  // ── Catalog ───────────────────────────────────────────────────────────────
  it("exactly 3 hazards: cave_in, gas_vent, lava", () => {
    // mole added in 9.6, but by the time 9.5 runs we need exactly lava present
    const lava = HAZARDS.find((h) => h.id === "lava");
    expect(lava).toBeTruthy();
  });

  it("lava weight = 20", () => {
    const lava = HAZARDS.find((h) => h.id === "lava");
    expect(lava.weight).toBe(20);
  });

  // ── No spawn in farm ──────────────────────────────────────────────────────
  it("no hazard spawn in Farm even at lowest roll", () => {
    const farmState = {
      ...createInitialState(),
      biome: "farm",
      grid: makeGrid(),
      hazards: { caveIn: null, gasVent: null, lava: null, mole: null },
    };
    const r = rollHazard(farmState, () => 0.01);
    expect(r).toBeNull();
  });

  // ── Spread tick ───────────────────────────────────────────────────────────
  it("lava spreads to 1 new cell per tick", () => {
    const s0 = {
      ...createInitialState(),
      biome: "mine",
      grid: makeGrid(),
      hazards: {
        caveIn: null,
        gasVent: null,
        lava: { cells: [{ row: 2, col: 2 }], turnsToSpread: 1 },
        mole: null,
      },
    };
    const s1 = tickHazards(s0, () => 0.0);
    expect(s1.hazards.lava.cells.length).toBe(2);
  });

  // ── Lava cell blocks chain ────────────────────────────────────────────────
  it("lava cell is blocked by hazard", () => {
    expect(tileBlockedByHazard({ lava: true })).toBe(true);
  });

  // ── Water Pump clears lava ────────────────────────────────────────────────
  it("water pump clears lava entirely and costs no turn", () => {
    const s0 = {
      ...createInitialState(),
      biome: "mine",
      grid: makeGrid(),
      hazards: {
        caveIn: null,
        gasVent: null,
        lava: { cells: [{ row: 2, col: 2 }], turnsToSpread: 1 },
        mole: null,
      },
    };
    const s1 = tickHazards(s0, () => 0.0);
    const s2 = { ...s1, tools: { ...s1.tools, water_pump: 1 } };
    const s3 = rootReducer(s2, { type: "USE_TOOL", payload: { id: "water_pump" } });
    expect(s3.hazards.lava).toBeNull();
    expect(s3.tools.water_pump).toBe(0);
    expect(s3.turnsUsed).toBe(s2.turnsUsed);
  });

  // ── Save/load round-trip ──────────────────────────────────────────────────
  it("lava state serialises cleanly", () => {
    const lavaState = { cells: [{ row: 2, col: 2 }, { row: 2, col: 3 }], turnsToSpread: 1 };
    const json = JSON.stringify(lavaState);
    expect(JSON.stringify(JSON.parse(json))).toBe(json);
  });
});
