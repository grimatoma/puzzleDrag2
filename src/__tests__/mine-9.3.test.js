import { describe, it, expect } from "vitest";
import {
  HAZARDS,
  rollHazard,
  tickHazards,
  tileBlockedByHazard,
  clearCaveIn,
} from "../features/mine/hazards.js";
import { createInitialState } from "../state.js";

function makeGrid(rows = 6, cols = 6) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ key: "mine_stone" })),
  );
}

describe("Phase 9.3 — Hazards (cave-in, gas vent)", () => {
  // ── Hazard catalog ─────────────────────────────────────────────────────────
  it("contains cave_in and gas_vent entries", () => {
    const ids = HAZARDS.map((h) => h.id);
    expect(ids).toContain("cave_in");
    expect(ids).toContain("gas_vent");
  });

  // ── Farm biome NEVER spawns hazards ───────────────────────────────────────
  it("farm biome never rolls a hazard (1000 rolls)", () => {
    const farm = { ...createInitialState(), biome: "farm", grid: makeGrid() };
    for (let i = 0; i < 1000; i++) {
      const r = rollHazard(farm, Math.random);
      expect(r).toBeNull();
    }
  });

  // ── Mine biome rolls ~5% ───────────────────────────────────────────────────
  it("mine biome rolls hazard at approximately 5% over 1000 rolls", () => {
    const mine = {
      ...createInitialState(),
      biome: "mine",
      boss: null,
      grid: makeGrid(),
      hazards: { caveIn: null, gasVent: null, lava: null, mole: null },
    };
    let hits = 0;
    for (let i = 0; i < 1000; i++) {
      const seedRng = (() => {
        const x = ((i * 9301 + 49297) % 233280) / 233280;
        let n = 0;
        return () => (n++ === 0 ? x : 0.5);
      })();
      if (rollHazard(mine, seedRng)) hits++;
    }
    expect(hits).toBeGreaterThanOrEqual(30);
    expect(hits).toBeLessThanOrEqual(80);
  });

  // ── Hazard cap: no spawn while one is active ──────────────────────────────
  it("no spawn while caveIn is active", () => {
    const mine = {
      ...createInitialState(),
      biome: "mine",
      boss: null,
      grid: makeGrid(),
      hazards: { caveIn: { row: 3 }, gasVent: null, lava: null, mole: null },
    };
    expect(rollHazard(mine, () => 0.01)).toBeNull();
  });

  // ── Tile blocking ──────────────────────────────────────────────────────────
  it("rubble blocks tile", () => {
    expect(tileBlockedByHazard({ rubble: true })).toBe(true);
  });

  it("gas does NOT block tile (chain is counter)", () => {
    expect(tileBlockedByHazard({ gas: true })).toBe(false);
  });

  it("clean tile not blocked", () => {
    expect(tileBlockedByHazard({ rubble: false })).toBe(false);
  });

  // ── Cave-in clear ──────────────────────────────────────────────────────────
  const stoneTile = (r, c) => ({ key: "mine_stone", row: r, col: c });

  it("3 stone in row 2 clears caveIn at row 3", () => {
    const s = {
      ...createInitialState(),
      biome: "mine",
      grid: makeGrid(),
      hazards: { caveIn: { row: 3 }, gasVent: null, lava: null, mole: null },
    };
    const goodChain = [stoneTile(2, 1), stoneTile(2, 2), stoneTile(2, 3)];
    const cleared = clearCaveIn(s, goodChain);
    expect(cleared.hazards.caveIn).toBeNull();
  });

  it("2 stone does not clear caveIn", () => {
    const s = {
      ...createInitialState(),
      biome: "mine",
      grid: makeGrid(),
      hazards: { caveIn: { row: 3 }, gasVent: null, lava: null, mole: null },
    };
    const tooFew = clearCaveIn(s, [stoneTile(2, 1), stoneTile(2, 2)]);
    expect(tooFew.hazards.caveIn).not.toBeNull();
  });

  it("stone chain in non-adjacent row does not clear caveIn", () => {
    const s = {
      ...createInitialState(),
      biome: "mine",
      grid: makeGrid(),
      hazards: { caveIn: { row: 3 }, gasVent: null, lava: null, mole: null },
    };
    const wrongRow = clearCaveIn(s, [stoneTile(0, 1), stoneTile(0, 2), stoneTile(0, 3)]);
    expect(wrongRow.hazards.caveIn).not.toBeNull();
  });

  // ── Gas vent ticks ─────────────────────────────────────────────────────────
  it("gas vent ticks from 3 to 2", () => {
    const g = {
      ...createInitialState(),
      biome: "mine",
      grid: makeGrid(),
      hazards: { caveIn: null, gasVent: { row: 2, col: 3, turnsRemaining: 3 }, lava: null, mole: null },
    };
    const g2 = tickHazards(g);
    expect(g2.hazards.gasVent.turnsRemaining).toBe(2);
  });

  it("gas vent cleared at 0, costs 1 turn", () => {
    let g = {
      ...createInitialState(),
      biome: "mine",
      turnsUsed: 0,
      grid: makeGrid(),
      hazards: { caveIn: null, gasVent: { row: 2, col: 3, turnsRemaining: 3 }, lava: null, mole: null },
    };
    g = tickHazards(g);
    g = tickHazards(g);
    g = tickHazards(g);
    expect(g.hazards.gasVent).toBeNull();
    expect(g.turnsUsed).toBe(1);
  });

  // ── Save/load round-trip ───────────────────────────────────────────────────
  it("hazards round-trips through JSON serialisation", () => {
    const json = JSON.stringify({
      caveIn: { row: 4 },
      gasVent: { row: 1, col: 2, turnsRemaining: 2 },
    });
    expect(JSON.stringify(JSON.parse(json))).toBe(json);
  });
});
