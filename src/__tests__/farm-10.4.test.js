/**
 * Phase 10.4 — Rat hazard
 * Tests written FIRST (red phase).
 */
import { describe, it, expect } from "vitest";
import { createInitialState, rootReducer } from "../state.js";
import { RAT_SPAWN_THRESHOLDS } from "../constants.js";
import { rollRatSpawn, tickRats } from "../features/farm/rats.js";

function makeGrid(rows = 2, cols = 3, key = "grass_hay") {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ key })),
  );
}

// ── Threshold constants locked ─────────────────────────────────────────────────

describe("10.4 — RAT_SPAWN_THRESHOLDS constants", () => {
  it("hay > 50 threshold", () => expect(RAT_SPAWN_THRESHOLDS.grass_hay).toBe(50));
  it("wheat > 50 threshold", () => expect(RAT_SPAWN_THRESHOLDS.grain_wheat).toBe(50));
  it("10% per fillBoard", () => expect(RAT_SPAWN_THRESHOLDS.perFillRate).toBe(0.10));
  it("max 4 active rats", () => expect(RAT_SPAWN_THRESHOLDS.maxActive).toBe(4));
});

// ── rollRatSpawn ──────────────────────────────────────────────────────────────

describe("10.4 — rollRatSpawn", () => {
  it("mine biome NEVER spawns rats (1000 rolls)", () => {
    const mine = {
      ...createInitialState(),
      biome: "mine",
      inventory: { grass_hay: 99, grain_wheat: 99 },
      hazards: { caveIn: null, gasVent: null, rats: [] },
    };
    for (let i = 0; i < 1000; i++) {
      expect(rollRatSpawn(mine, () => 0.001)).toBeNull();
    }
  });

  it("hay exactly 50 (not > 50) does not spawn", () => {
    const s = {
      ...createInitialState(),
      biome: "farm",
      inventory: { grass_hay: 50, grain_wheat: 51 },
      hazards: { rats: [] },
      grid: makeGrid(),
    };
    expect(rollRatSpawn(s, () => 0.01)).toBeNull();
  });

  it("hay > 50 AND wheat > 50 → spawns on low rng roll", () => {
    const s = {
      ...createInitialState(),
      biome: "farm",
      inventory: { grass_hay: 51, grain_wheat: 51 },
      hazards: { rats: [] },
      grid: makeGrid(),
    };
    const r = rollRatSpawn(s, () => 0.01);
    expect(r).not.toBeNull();
    expect(Number.isInteger(r.row)).toBe(true);
    expect(r.age).toBe(0);
  });

  it("cap at 4 active rats: no spawn when rats.length === 4", () => {
    const s = {
      ...createInitialState(),
      biome: "farm",
      inventory: { grass_hay: 99, grain_wheat: 99 },
      hazards: { rats: Array.from({ length: 4 }, (_, i) => ({ row: 0, col: i, age: 0 })) },
      grid: makeGrid(),
    };
    expect(rollRatSpawn(s, () => 0.001)).toBeNull();
  });

  it("high rng roll (≥ 0.10) = no spawn", () => {
    const s = {
      ...createInitialState(),
      biome: "farm",
      inventory: { grass_hay: 99, grain_wheat: 99 },
      hazards: { rats: [] },
      grid: makeGrid(),
    };
    expect(rollRatSpawn(s, () => 0.15)).toBeNull();
  });
});

// ── tickRats ──────────────────────────────────────────────────────────────────

describe("10.4 — tickRats", () => {
  it("rat eats one adjacent plant tile (hay/wheat/grain/berry)", () => {
    const s = {
      ...createInitialState(),
      biome: "farm",
      grid: [
        [{ key: "grass_hay" }, { key: "rat" }, { key: "grain_wheat" }],
        [{ key: "berry" }, { key: "wood_log" }, { key: "stone" }],
      ],
      hazards: { ...createInitialState().hazards, rats: [{ row: 0, col: 1, age: 0 }] },
    };
    const s2 = tickRats(s);
    const eaten = s2.grid.flat().filter((t) => t.key === null || t._eaten).length;
    expect(eaten).toBe(1);
  });

  it("rat age increments", () => {
    const s = {
      ...createInitialState(),
      biome: "farm",
      grid: [
        [{ key: "grass_hay" }, { key: "rat" }, { key: "grain_wheat" }],
      ],
      hazards: { ...createInitialState().hazards, rats: [{ row: 0, col: 1, age: 0 }] },
    };
    const s2 = tickRats(s);
    expect(s2.hazards.rats[0].age).toBe(1);
  });

  it("starving rat (no adjacent plant) — age still ticks, no tile eaten", () => {
    const s = {
      ...createInitialState(),
      biome: "farm",
      grid: [[{ key: "stone" }, { key: "rat" }, { key: "stone" }]],
      hazards: { ...createInitialState().hazards, rats: [{ row: 0, col: 1, age: 2 }] },
    };
    const s2 = tickRats(s);
    expect(s2.hazards.rats[0].age).toBe(3);
    expect(s2.grid.flat().every((t) => t.key !== null)).toBe(true);
  });
});

// ── COMMIT_CHAIN — rat clearing ───────────────────────────────────────────────

describe("10.4 — COMMIT_CHAIN rat chains", () => {
  it("3 rat tiles: cleared, +15◉, no inventory yield", () => {
    const s0 = {
      ...createInitialState(),
      biome: "farm",
      coins: 0,
      hazards: {
        ...createInitialState().hazards,
        rats: [{ row: 1, col: 1, age: 1 }, { row: 1, col: 2, age: 1 }, { row: 1, col: 3, age: 1 }],
      },
    };
    const chain = [
      { key: "rat", row: 1, col: 1 },
      { key: "rat", row: 1, col: 2 },
      { key: "rat", row: 1, col: 3 },
    ];
    const s1 = rootReducer(s0, { type: "COMMIT_CHAIN", chain });
    expect(s1.hazards.rats.length).toBe(0);
    expect(s1.coins).toBe(15);
    expect(s1.inventory?.rat ?? 0).toBe(0);
  });

  it("2-rat chain: rejected, rats stay, coins unchanged", () => {
    const s0 = {
      ...createInitialState(),
      biome: "farm",
      coins: 0,
      hazards: {
        ...createInitialState().hazards,
        rats: [{ row: 1, col: 1, age: 1 }, { row: 1, col: 2, age: 1 }],
      },
    };
    const before = JSON.stringify(s0.hazards.rats);
    const s1 = rootReducer(s0, { type: "COMMIT_CHAIN", chain: [
      { key: "rat", row: 1, col: 1 }, { key: "rat", row: 1, col: 2 },
    ]});
    expect(JSON.stringify(s1.hazards.rats)).toBe(before);
    expect(s1.coins).toBe(0);
  });

  it("mixed rat+hay chain: rejected", () => {
    const s0 = {
      ...createInitialState(),
      biome: "farm",
      coins: 0,
      hazards: {
        ...createInitialState().hazards,
        rats: [{ row: 0, col: 0, age: 0 }, { row: 0, col: 1, age: 0 }, { row: 0, col: 2, age: 0 }],
      },
    };
    const before = JSON.stringify(s0.hazards.rats);
    const s1 = rootReducer(s0, { type: "COMMIT_CHAIN", chain: [
      { key: "rat", row: 0, col: 0 }, { key: "rat", row: 0, col: 1 }, { key: "grass_hay", row: 0, col: 2 },
    ]});
    expect(JSON.stringify(s1.hazards.rats)).toBe(before);
  });
});

// ── Save/load round-trip ──────────────────────────────────────────────────────

describe("10.4 — hazards.rats save/load round-trip", () => {
  it("JSON round-trips rats array exactly", () => {
    const json = JSON.stringify([{ row: 2, col: 3, age: 4 }]);
    expect(JSON.stringify(JSON.parse(json))).toBe(json);
  });

  it("createInitialState() has hazards.rats = []", () => {
    expect(createInitialState().hazards.rats).toEqual([]);
  });
});
