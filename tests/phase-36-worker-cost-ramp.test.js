// Phase 36 — Sequential per-hire cost ramping for type-tier workers.
// Both `coinsStep` (linear) and `coinsMult` (geometric) are config-driven
// in `src/features/workers/data.js`.
import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../src/state.js";
import { TYPE_WORKER_MAP, nextHireCost } from "../src/features/workers/data.js";

const FARMER = TYPE_WORKER_MAP.farmer;
const LUMBERJACK = TYPE_WORKER_MAP.lumberjack;
const MINER = TYPE_WORKER_MAP.miner;
const BAKER = TYPE_WORKER_MAP.baker;

describe("Phase 36 — nextHireCost helper", () => {
  it("returns flat base when no ramp keys are set", () => {
    const flat = { hireCost: { coins: 50 }, maxCount: 5 };
    expect(nextHireCost(flat, 0)).toBe(50);
    expect(nextHireCost(flat, 4)).toBe(50);
  });

  it("applies a linear ramp when coinsStep is set", () => {
    expect(FARMER.hireCost.coinsStep).toBe(25);
    expect(nextHireCost(FARMER, 0)).toBe(50); // 1st hire
    expect(nextHireCost(FARMER, 1)).toBe(75); // 2nd hire
    expect(nextHireCost(FARMER, 2)).toBe(100);
    expect(nextHireCost(FARMER, 9)).toBe(50 + 25 * 9); // 10th hire (final)
  });

  it("applies a geometric ramp when coinsMult is set", () => {
    expect(BAKER.hireCost.coinsMult).toBe(1.4);
    // round(75 * 1.4 ** 0) = 75
    expect(nextHireCost(BAKER, 0)).toBe(75);
    // round(75 * 1.4 ** 1) = 105
    expect(nextHireCost(BAKER, 1)).toBe(105);
    // round(75 * 1.4 ** 2) = 147
    expect(nextHireCost(BAKER, 2)).toBe(147);
  });

  it("clamps a negative count input to 0", () => {
    expect(nextHireCost(FARMER, -3)).toBe(50);
  });

  it("Lumberjack and Miner ramp linearly per their step", () => {
    expect(nextHireCost(LUMBERJACK, 0)).toBe(60);
    expect(nextHireCost(LUMBERJACK, 1)).toBe(90);
    expect(nextHireCost(MINER, 0)).toBe(75);
    expect(nextHireCost(MINER, 3)).toBe(75 + 35 * 3);
  });
});

describe("Phase 36 — WORKERS/HIRE deducts the ramped cost", () => {
  it("first Farmer costs 50; second costs 75; third costs 100", () => {
    let s = { ...createInitialState(), coins: 1000 };
    s = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "farmer" } });
    expect(s.coins).toBe(950);
    s = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "farmer" } });
    expect(s.coins).toBe(875);
    s = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "farmer" } });
    expect(s.coins).toBe(775);
  });

  it("rejects when ramped cost exceeds coins", () => {
    // 7 farmers cost 50+75+100+125+150+175+200 = 875. 8th costs 225.
    let s = { ...createInitialState(), coins: 875 + 100 };
    for (let i = 0; i < 7; i++) {
      s = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "farmer" } });
    }
    expect(s.workers.hired.farmer).toBe(7);
    expect(s.coins).toBe(100);
    // 8th needs 225 — rejected.
    const next = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "farmer" } });
    expect(next.coins).toBe(100);
    expect(next.workers.hired.farmer).toBe(7);
  });

  it("Baker geometric ramp: 1st=75, 2nd=105", () => {
    let s = { ...createInitialState(), coins: 1000 };
    s = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "baker" } });
    expect(s.coins).toBe(925); // 1000 - 75
    s = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "baker" } });
    expect(s.coins).toBe(820); // 925 - 105
  });

  it("total cost of hiring all 10 farmers matches the linear sum", () => {
    let s = { ...createInitialState(), coins: 100000 };
    const startCoins = s.coins;
    for (let i = 0; i < 10; i++) {
      s = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "farmer" } });
    }
    // Sum_{i=0..9} (50 + 25*i) = 10*50 + 25 * 45 = 500 + 1125 = 1625
    expect(startCoins - s.coins).toBe(1625);
    expect(s.workers.hired.farmer).toBe(10);
  });
});
