// Coverage fillins for src/features/mine/hazards.js (76% pre-PR).
// Branches missing across rollHazard guards, every hazard's tick, and
// the cave-in clear logic.

import { describe, it, expect } from "vitest";
import {
  HAZARDS,
  rollHazard,
  tileBlockedByHazard,
  tickHazards,
  clearCaveIn,
} from "../features/mine/hazards.js";

const makeGrid = (rows = 3, cols = 3) =>
  Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ key: "x" })),
  );

describe("rollHazard guards", () => {
  it("biome != mine → null", () => {
    expect(rollHazard({ biome: "farm" }, () => 0)).toBeNull();
  });

  it("active boss → null", () => {
    expect(rollHazard({ biome: "mine", boss: { key: "frostmaw" } }, () => 0)).toBeNull();
  });

  it("hazard already active → null", () => {
    const s = { biome: "mine", hazards: { gasVent: {} }, grid: makeGrid() };
    expect(rollHazard(s, () => 0)).toBeNull();
  });

  it("base-rate gate: rng() >= rate → null", () => {
    const s = { biome: "mine", grid: makeGrid() };
    // First rng call returns 0.99 → above 0.05 base rate, gate fails
    expect(rollHazard(s, () => 0.99)).toBeNull();
  });

  it("base-rate gate passes → returns one of HAZARDS shape", () => {
    const s = { biome: "mine", grid: makeGrid(4, 4) };
    // rng sequence: 0.01 (passes 0.05 gate), 0 (picks first hazard).
    let i = 0;
    const seq = [0.01, 0, 0.5, 0.5, 0.5];
    const rng = () => seq[(i++) % seq.length];
    const r = rollHazard(s, rng);
    expect(r).not.toBeNull();
    expect(typeof r.id).toBe("string");
  });
});

describe("tileBlockedByHazard", () => {
  it("rubble + lava are blocking", () => {
    expect(tileBlockedByHazard({ rubble: true })).toBe(true);
    expect(tileBlockedByHazard({ lava: true })).toBe(true);
  });

  it("clean tile / null are not blocking", () => {
    expect(tileBlockedByHazard({ key: "x" })).toBe(false);
    expect(tileBlockedByHazard(null)).toBe(false);
    expect(tileBlockedByHazard(undefined)).toBe(false);
  });

  it("gas tiles are NOT blocking (chaining is the counter)", () => {
    expect(tileBlockedByHazard({ gas: true })).toBe(false);
  });
});

describe("tickHazards — gasVent / lava / mole", () => {
  it("no hazards → state unchanged", () => {
    const s = { hazards: {} };
    const r = tickHazards(s, () => 0);
    expect(r).toBe(s);
  });

  it("gasVent: turnsRemaining > 1 → decrement, no turn cost", () => {
    const s = { hazards: { gasVent: { row: 0, col: 0, turnsRemaining: 3 } }, turnsUsed: 4 };
    const r = tickHazards(s, () => 0);
    expect(r.hazards.gasVent.turnsRemaining).toBe(2);
    expect(r.turnsUsed).toBe(4);
  });

  it("gasVent: turnsRemaining 1 → expires, costs a turn", () => {
    const s = { hazards: { gasVent: { row: 0, col: 0, turnsRemaining: 1 } }, turnsUsed: 4 };
    const r = tickHazards(s, () => 0);
    expect(r.hazards.gasVent).toBeNull();
    expect(r.turnsUsed).toBe(5);
    expect(r._hazardFloater).toMatch(/cough/);
  });

  it("lava: no grid → unchanged", () => {
    const s = { hazards: { lava: { cells: [{ row: 0, col: 0 }], turnsToSpread: 1 } } };
    const r = tickHazards(s, () => 0);
    expect(r.hazards.lava.cells).toHaveLength(1);
  });

  it("lava: spreads to one orthogonally-adjacent free cell", () => {
    const grid = makeGrid(3, 3);
    const s = {
      grid,
      hazards: { lava: { cells: [{ row: 1, col: 1 }], turnsToSpread: 1 } },
    };
    const r = tickHazards(s, () => 0);
    expect(r.hazards.lava.cells).toHaveLength(2);
    // The new cell should be marked 'lava' on the grid
    const newCell = r.hazards.lava.cells.find((c) => c.row !== 1 || c.col !== 1);
    expect(r.grid[newCell.row][newCell.col].key).toBe("lava");
  });

  it("mole: no grid → unchanged", () => {
    const s = { hazards: { mole: { row: 0, col: 0, turnsRemaining: 3 } } };
    const r = tickHazards(s, () => 0);
    expect(r.hazards.mole.turnsRemaining).toBe(3);
  });

  it("mole: turnsRemaining > 0 → decrements + consumes adjacent tile", () => {
    const grid = makeGrid(3, 3);
    const s = {
      grid,
      hazards: { mole: { row: 1, col: 1, turnsRemaining: 3 } },
    };
    const r = tickHazards(s, () => 0);
    expect(r.hazards.mole.turnsRemaining).toBe(2);
    // One adjacent cell should be marked consumed.
    let consumed = 0;
    for (const row of r.grid) for (const t of row) if (t.consumed) consumed++;
    expect(consumed).toBe(1);
  });

  it("mole: turnsRemaining 0 → hops to a free adjacent cell, timer resets", () => {
    const grid = makeGrid(3, 3);
    const s = {
      grid,
      hazards: { mole: { row: 1, col: 1, turnsRemaining: 0 } },
    };
    const r = tickHazards(s, () => 0);
    expect(r.hazards.mole.turnsRemaining).toBe(3);
    // The mole should be at one of the adjacent cells (or stay put if none free).
    const m = r.hazards.mole;
    expect(typeof m.row).toBe("number");
    expect(typeof m.col).toBe("number");
  });
});

describe("clearCaveIn", () => {
  it("no cave-in active → state unchanged", () => {
    const s = { hazards: {} };
    const r = clearCaveIn(s, []);
    expect(r).toBe(s);
  });

  it("chain not adjacent to caveIn row → unchanged", () => {
    const s = { hazards: { caveIn: { row: 0 } } };
    const chain = [
      { key: "mine_stone", row: 4, col: 0 },
      { key: "mine_stone", row: 4, col: 1 },
      { key: "mine_stone", row: 4, col: 2 },
    ];
    const r = clearCaveIn(s, chain);
    expect(r).toBe(s);
  });

  it("chain too short (< 3 stone) → unchanged", () => {
    const s = { hazards: { caveIn: { row: 0 } } };
    const chain = [
      { key: "mine_stone", row: 1, col: 0 },
      { key: "mine_stone", row: 1, col: 1 },
    ];
    const r = clearCaveIn(s, chain);
    expect(r).toBe(s);
  });

  it("chain ≥ 3 stone, adjacent row → clears caveIn", () => {
    const s = { hazards: { caveIn: { row: 0 } } };
    const chain = [
      { key: "mine_stone", row: 1, col: 0 },
      { key: "mine_stone", row: 1, col: 1 },
      { key: "mine_stone", row: 1, col: 2 },
    ];
    const r = clearCaveIn(s, chain);
    expect(r.hazards.caveIn).toBeNull();
  });
});

describe("HAZARDS list shape", () => {
  it("has cave_in / gas_vent / lava / mole entries with weights summing to 100", () => {
    const ids = HAZARDS.map((h) => h.id).sort();
    expect(ids).toEqual(["cave_in", "gas_vent", "lava", "mole"]);
    const total = HAZARDS.reduce((a, h) => a + h.weight, 0);
    expect(total).toBe(100);
  });

  it("each hazard's spawn returns a valid descriptor", () => {
    const grid = makeGrid(4, 4);
    for (const h of HAZARDS) {
      const r = h.spawn(grid, () => 0);
      expect(typeof r).toBe("object");
    }
  });
});
