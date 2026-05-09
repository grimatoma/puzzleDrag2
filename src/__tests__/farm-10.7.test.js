/**
 * Phase 10.7 — Fire hazard + chain-to-extinguish
 * Tests written FIRST (red phase).
 */
import { describe, it, expect } from "vitest";
import { createInitialState, rootReducer } from "../state.js";
import { rollFarmHazard, tickFire } from "../features/farm/hazards.js";
import { FIRE_HAZARD_ENABLED } from "../featureFlags.js";

function makeGrid(rows = 4, cols = 4, key = "grass_hay") {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ key })),
  );
}

// ── rollFarmHazard ─────────────────────────────────────────────────────────────

describe("10.7 — rollFarmHazard fire spawn rate ~4%", () => {
  it.skipIf(!FIRE_HAZARD_ENABLED)("spawns fire at ~4% rate over 2000 farm rolls", () => {
    const s = {
      ...createInitialState(),
      biome: "farm",
      hazards: { ...createInitialState().hazards, fire: null, rats: [] },
      grid: makeGrid(),
    };
    let fires = 0;
    for (let i = 0; i < 2000; i++) {
      const r = rollFarmHazard(s, Math.random);
      if (r?.kind === "fire") fires++;
    }
    // 4% of 2000 = 80 expected; acceptable range 40–120
    expect(fires).toBeGreaterThan(40);
    expect(fires).toBeLessThan(120);
  });

  it("mine biome: rollFarmHazard returns null", () => {
    const s = { ...createInitialState(), biome: "mine" };
    const r = rollFarmHazard(s, () => 0.001);
    expect(r).toBeNull();
  });

  it("returns null when fire cap (3) already reached", () => {
    const s = {
      ...createInitialState(),
      biome: "farm",
      hazards: {
        ...createInitialState().hazards,
        fire: { cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] },
        rats: [],
      },
      grid: makeGrid(),
    };
    expect(rollFarmHazard(s, () => 0.001)).toBeNull();
  });
});

// ── tickFire ──────────────────────────────────────────────────────────────────

describe("10.7 — tickFire spread", () => {
  it("fire spreads to 1 new cell when rng=0 (deterministic)", () => {
    const s = {
      ...createInitialState(),
      biome: "farm",
      grid: makeGrid(),
      hazards: {
        ...createInitialState().hazards,
        fire: { cells: [{ row: 2, col: 2 }] },
      },
    };
    const s2 = tickFire(s, () => 0.0); // 0 < 0.5 → spreads
    expect(s2.hazards.fire.cells.length).toBe(2);
  });

  it("fire does NOT spread when rng >= 0.5", () => {
    const s = {
      ...createInitialState(),
      biome: "farm",
      grid: makeGrid(),
      hazards: {
        ...createInitialState().hazards,
        fire: { cells: [{ row: 2, col: 2 }] },
      },
    };
    const s2 = tickFire(s, () => 0.99);
    expect(s2.hazards.fire.cells.length).toBe(1);
  });

  it("no fire → state unchanged", () => {
    const s = { ...createInitialState(), biome: "farm" };
    const s2 = tickFire(s, Math.random);
    expect(s2).toBe(s);
  });
});

// ── COMMIT_CHAIN chain-extinguish ─────────────────────────────────────────────

describe("10.7 — COMMIT_CHAIN chain-extinguish", () => {
  it("chain through 2 fire tiles: both extinguished, +4◉", () => {
    const s0 = {
      ...createInitialState(),
      biome: "farm",
      coins: 0,
      hazards: {
        ...createInitialState().hazards,
        fire: { cells: [{ row: 2, col: 2 }, { row: 2, col: 4 }] },
      },
    };
    const chain = [
      { key: "fire", row: 2, col: 2 },
      { key: "grass_hay",  row: 2, col: 3 },
      { key: "fire", row: 2, col: 4 },
    ];
    const s1 = rootReducer(s0, { type: "COMMIT_CHAIN", chain });
    expect(s1.hazards.fire).toBeNull();
    expect(s1.coins).toBe(4);
  });

  it("chain through 1 fire tile among grass_hay: fire extinguished, +2◉", () => {
    const s0 = {
      ...createInitialState(),
      biome: "farm",
      coins: 10,
      hazards: {
        ...createInitialState().hazards,
        fire: { cells: [{ row: 0, col: 0 }] },
      },
    };
    const chain = [
      { key: "fire", row: 0, col: 0 },
      { key: "grass_hay", row: 0, col: 1 },
      { key: "grass_hay", row: 0, col: 2 },
    ];
    const s1 = rootReducer(s0, { type: "COMMIT_CHAIN", chain });
    expect(s1.hazards.fire).toBeNull();
    expect(s1.coins).toBeGreaterThanOrEqual(12); // 10 + 2 from fire
  });

  it("chain with no fire tiles: hazards.fire unchanged", () => {
    const fireCells = [{ row: 1, col: 1 }];
    const s0 = {
      ...createInitialState(),
      biome: "farm",
      hazards: {
        ...createInitialState().hazards,
        fire: { cells: fireCells },
      },
    };
    const chain = [
      { key: "grass_hay", row: 0, col: 0 },
      { key: "grass_hay", row: 0, col: 1 },
      { key: "grass_hay", row: 0, col: 2 },
    ];
    const s1 = rootReducer(s0, { type: "COMMIT_CHAIN", chain });
    expect(s1.hazards.fire?.cells.length).toBe(1);
  });
});

// ── Save/load round-trip ──────────────────────────────────────────────────────

describe("10.7 — hazards.fire save/load", () => {
  it("createInitialState() has hazards.fire = null", () => {
    expect(createInitialState().hazards.fire).toBeNull();
  });

  it("fire cells JSON round-trip", () => {
    const json = JSON.stringify({ cells: [{ row: 1, col: 2 }] });
    expect(JSON.stringify(JSON.parse(json))).toBe(json);
  });
});
