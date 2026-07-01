// Phase 36 — Sequential per-hire cost ramping for type-tier workers.
// Both `coinsStep` (linear) and `coinsMult` (geometric) are config-driven
// in `src/features/workers/data.js`. Zones-1&2 scope caps each worker at
// (chain − 3), so the ramp tests hire up to those caps (Farmer 2, Miner 5, Baker 2).
import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../../state.js";
import { TYPE_WORKER_MAP, nextHireCost, nextHireResourceCost } from "./data.js";

const FARMER = TYPE_WORKER_MAP.farmer;
const LUMBERJACK = TYPE_WORKER_MAP.lumberjack;
const MINER = TYPE_WORKER_MAP.miner;
const BAKER = TYPE_WORKER_MAP.baker;

function workerState(coins) {
  return {
    ...createInitialState(),
    coins,
    // Plenty of Villagers so these tests exercise the coin/resource ramp, not
    // the Villager hiring gate (covered in tests/phase-4-workers.test.ts).
    villagers: 100,
    inventory: { home: { tile_grass_grass: 10000,
      tile_tree_oak: 10000,
      tile_mine_stone: 10000,
      flour: 10000,
      eggs: 10000, } },
  };
}

describe("Phase 36 — nextHireCost helper", () => {
  it("returns flat base when no ramp keys are set", () => {
    const flat = { hireCost: { coins: 50 }, maxCount: 5 };
    expect(nextHireCost(flat, 0)).toBe(50);
    expect(nextHireCost(flat, 4)).toBe(50);
  });

  it("applies a linear ramp when coinsStep is set", () => {
    expect(FARMER.hireCost.coinsStep).toBe(25);
    expect(nextHireCost(FARMER, 0)).toBe(50); // 1st hire
    expect(nextHireCost(FARMER, 1)).toBe(75); // 2nd hire (Farmer caps at 2)
    expect(nextHireCost(MINER, 4)).toBe(75 + 35 * 4); // 5th Miner (final)
  });

  it("applies a geometric ramp when coinsMult is set", () => {
    // No in-scope worker uses a geometric ramp, but the helper still supports it.
    const geo = { hireCost: { coins: 75, coinsMult: 1.4 } };
    expect(nextHireCost(geo, 0)).toBe(75);  // round(75 * 1.4 ** 0)
    expect(nextHireCost(geo, 1)).toBe(105); // round(75 * 1.4 ** 1)
    expect(nextHireCost(geo, 2)).toBe(147); // round(75 * 1.4 ** 2)
  });

  it("clamps a negative count input to 0", () => {
    expect(nextHireCost(FARMER, -3)).toBe(50);
  });

  it("ramps resource costs every three hires", () => {
    expect(nextHireResourceCost(FARMER, 0)).toEqual({ tile_grass_grass: 2 });
    expect(nextHireResourceCost(FARMER, 2)).toEqual({ tile_grass_grass: 2 });
    expect(nextHireResourceCost(FARMER, 3)).toEqual({ tile_grass_grass: 4 });
    expect(nextHireResourceCost(BAKER, 6)).toEqual({ flour: 3, eggs: 3 });
  });

  it("Lumberjack and Miner ramp linearly per their step", () => {
    expect(nextHireCost(LUMBERJACK, 0)).toBe(60);
    expect(nextHireCost(LUMBERJACK, 1)).toBe(90);
    expect(nextHireCost(MINER, 0)).toBe(75);
    expect(nextHireCost(MINER, 3)).toBe(75 + 35 * 3);
  });
});

describe("Phase 36 — WORKERS/HIRE deducts the ramped cost", () => {
  it("first Farmer costs 50; second costs 75 (caps at 2)", () => {
    let s = workerState(1000);
    s = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "farmer" } });
    expect(s.coins).toBe(950);
    s = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "farmer" } });
    expect(s.coins).toBe(875);
    // 3rd hire exceeds the chain−3 cap of 2 — rejected, coins unchanged.
    s = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "farmer" } });
    expect(s.coins).toBe(875);
    expect(s.workers.hired.farmer).toBe(2);
  });

  it("rejects when the ramped cost exceeds coins", () => {
    let s = workerState(75); // exactly one Miner
    s = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "miner" } });
    expect(s.workers.hired.miner).toBe(1);
    expect(s.coins).toBe(0);
    // 2nd Miner needs 110 — rejected.
    const next = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "miner" } });
    expect(next.coins).toBe(0);
    expect(next.workers.hired.miner).toBe(1);
  });

  it("Baker ramps linearly: 1st=80, 2nd=120", () => {
    let s = workerState(1000);
    s = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "baker" } });
    expect(s.coins).toBe(920); // 1000 - 80
    s = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "baker" } });
    expect(s.coins).toBe(800); // 920 - 120
  });

  it("total cost of hiring all 5 Miners matches the linear sum", () => {
    let s = workerState(100000);
    const startCoins = s.coins;
    for (let i = 0; i < 5; i++) {
      s = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "miner" } });
    }
    // Sum_{i=0..4} (75 + 35*i) = 5*75 + 35 * 10 = 375 + 350 = 725
    expect(startCoins - s.coins).toBe(725);
    expect(s.workers.hired.miner).toBe(5);
  });
});
