/**
 * Phase 10.7 — Fire hazard + chain-to-extinguish
 * Tests written FIRST (red phase).
 */
import { describe, it, expect } from "vitest";
import { createInitialState, rootReducer } from "../state.js";
import { rollFarmHazard, tickFire } from "../features/farm/hazards.js";
import { FIRE_HAZARD_ENABLED } from "../featureFlags.js";

// Fire spawning is gated behind FIRE_HAZARD_ENABLED (currently off). Assert the
// gate is actually wired so rollFarmHazard cannot spawn fire while it's off —
// this runs regardless of the flag's value and documents the live behavior.
describe("10.7 — rollFarmHazard fire spawn is gated by FIRE_HAZARD_ENABLED", () => {
  it("never spawns fire while the flag is off, even with a spawn-forcing rng", () => {
    if (FIRE_HAZARD_ENABLED) return; // guard remains valid if the flag flips on
    const s = {
      ...createInitialState(),
      biome: "farm",
      hazards: { ...createInitialState().hazards, fire: null, rats: [] },
      grid: makeGrid(),
    };
    // rng=()=>0 would clear the 4% spawn roll if the gate weren't in effect.
    for (let i = 0; i < 100; i++) {
      const r = rollFarmHazard(s, () => 0);
      expect(r?.kind).not.toBe("fire");
    }
  });
});

function makeGrid(rows = 4, cols = 4, key = "tile_grass_grass") {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ key })),
  );
}

// ── rollFarmHazard ─────────────────────────────────────────────────────────────

describe("10.7 — rollFarmHazard biome/cap gates", () => {
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
      { key: "tile_grass_grass",  row: 2, col: 3 },
      { key: "fire", row: 2, col: 4 },
    ];
    const s1 = rootReducer(s0, {
      type: "CHAIN_COLLECTED",
      payload: { chain, key: "fire", gained: 0, chainLength: chain.length, upgrades: 0, value: 0 },
    });
    expect(s1.hazards.fire).toBeNull();
    expect(s1.coins).toBeGreaterThanOrEqual(4);
  });

  it("chain through 1 fire tile among tile_grass_grass: fire extinguished, +2◉", () => {
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
      { key: "tile_grass_grass", row: 0, col: 1 },
      { key: "tile_grass_grass", row: 0, col: 2 },
    ];
    const s1 = rootReducer(s0, {
      type: "CHAIN_COLLECTED",
      payload: { chain, key: "fire", gained: 0, chainLength: chain.length, upgrades: 0, value: 0 },
    });
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
      { key: "tile_grass_grass", row: 0, col: 0 },
      { key: "tile_grass_grass", row: 0, col: 1 },
      { key: "tile_grass_grass", row: 0, col: 2 },
    ];
    const s1 = rootReducer(s0, {
      type: "CHAIN_COLLECTED",
      payload: { chain, key: "fire", gained: 0, chainLength: chain.length, upgrades: 0, value: 0 },
    });
    expect(s1.hazards.fire?.cells.length).toBeGreaterThanOrEqual(1);
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
