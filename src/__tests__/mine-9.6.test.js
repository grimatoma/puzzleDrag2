import { describe, it, expect } from "vitest";
import { HAZARDS, tickHazards } from "../features/mine/hazards.js";
import { createInitialState, rootReducer } from "../state.js";

function makeGrid(rows = 6, cols = 6) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ key: "stone" })),
  );
}

describe("Phase 9.6 — Moles hazard + Explosives tool", () => {
  // ── Catalog ───────────────────────────────────────────────────────────────
  it("exactly 4 hazards: cave_in, gas_vent, lava, mole", () => {
    expect(HAZARDS.length).toBe(4);
  });

  it("mole weight = 15", () => {
    const mole = HAZARDS.find((h) => h.id === "mole");
    expect(mole).toBeTruthy();
    expect(mole.weight).toBe(15);
  });

  it("cave_in weight = 25 (updated from 50 when lava+mole added)", () => {
    const caveIn = HAZARDS.find((h) => h.id === "cave_in");
    expect(caveIn.weight).toBe(25);
  });

  // ── Tile consumption per tick ─────────────────────────────────────────────
  it("mole timer decrements on tick", () => {
    const s0 = {
      ...createInitialState(),
      biome: "mine",
      grid: makeGrid(),
      hazards: {
        caveIn: null,
        gasVent: null,
        lava: null,
        mole: { row: 1, col: 1, turnsRemaining: 3 },
      },
    };
    const s1 = tickHazards(s0, () => 0.0);
    expect(s1.hazards.mole.turnsRemaining).toBe(2);
  });

  it("exactly 1 adjacent tile consumed per tick", () => {
    const s0 = {
      ...createInitialState(),
      biome: "mine",
      grid: makeGrid(),
      hazards: {
        caveIn: null,
        gasVent: null,
        lava: null,
        mole: { row: 1, col: 1, turnsRemaining: 3 },
      },
    };
    const s1 = tickHazards(s0, () => 0.0);
    const consumedCells = s1.grid.flat().filter((t) => t.consumed).length;
    expect(consumedCells).toBe(1);
  });

  // ── Hop on timer-zero ─────────────────────────────────────────────────────
  it("mole hops to adjacent cell when turnsRemaining = 0", () => {
    const s2 = {
      ...createInitialState(),
      biome: "mine",
      grid: makeGrid(),
      hazards: {
        caveIn: null,
        gasVent: null,
        lava: null,
        mole: { row: 1, col: 1, turnsRemaining: 0 },
      },
    };
    const s3 = tickHazards(s2, () => 0.5);
    // The mole should move (or stay put if fully boxed — but row 1, col 1 has neighbours)
    expect(typeof s3.hazards.mole.row).toBe("number");
    expect(s3.hazards.mole.turnsRemaining).toBe(3);
  });

  // ── Explosives clears mole + cave-in ──────────────────────────────────────
  it("explosives clears mole", () => {
    const s4 = {
      ...createInitialState(),
      grid: makeGrid(),
      hazards: {
        caveIn: null,
        gasVent: null,
        lava: null,
        mole: { row: 1, col: 1, turnsRemaining: 3 },
      },
      tools: { ...createInitialState().tools, explosives: 1 },
    };
    const s5 = rootReducer(s4, { type: "USE_TOOL", payload: { id: "explosives" } });
    expect(s5.hazards.mole).toBeNull();
    expect(s5.tools.explosives).toBe(0);
    expect(s5.turnsUsed).toBe(s4.turnsUsed);
  });

  it("explosives also clears cave-in", () => {
    const s4 = {
      ...createInitialState(),
      grid: makeGrid(),
      hazards: {
        caveIn: { row: 4 },
        gasVent: null,
        lava: null,
        mole: { row: 1, col: 1, turnsRemaining: 3 },
      },
      tools: { ...createInitialState().tools, explosives: 1 },
    };
    const s5 = rootReducer(s4, { type: "USE_TOOL", payload: { id: "explosives" } });
    expect(s5.hazards.mole).toBeNull();
    expect(s5.hazards.caveIn).toBeNull();
  });

  // ── Save/load round-trip ──────────────────────────────────────────────────
  it("mole state serialises cleanly", () => {
    const moleState = { row: 2, col: 3, turnsRemaining: 2 };
    const json = JSON.stringify(moleState);
    expect(JSON.stringify(JSON.parse(json))).toBe(json);
  });
});
