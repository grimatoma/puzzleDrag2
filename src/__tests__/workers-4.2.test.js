import { describe, it, expect } from "vitest";
import { computeWorkerEffects } from "../features/apprentices/effects.js";
import { WORKER_MAP } from "../features/apprentices/data.js";

describe("Phase 4.2 — computeWorkerEffects pure aggregator", () => {
  const empty = { workers: { hired: { hilda:0, pip:0, wila:0, tuck:0, osric:0, dren:0 }, debt: 0 } };

  it("zero hires → all zeroes", () => {
    const r0 = computeWorkerEffects(empty);
    expect(r0.thresholdReduce.grass_hay ?? 0).toBe(0);
    expect(r0.poolWeight.berry   ?? 0).toBe(0);
    expect(r0.bonusYield.berry_jam     ?? 0).toBe(0);
    expect(r0.seasonBonus.coins  ?? 0).toBe(0);
  });

  it("per-hire walk on Hilda (max-effect ÷ maxCount)", () => {
    const withHilda = (n) => ({ workers: { hired: { ...empty.workers.hired, hilda: n }, debt: 0 } });
    expect(computeWorkerEffects(withHilda(1)).thresholdReduce.grass_hay).toBe(1);
    expect(computeWorkerEffects(withHilda(2)).thresholdReduce.grass_hay).toBe(2);
    expect(computeWorkerEffects(withHilda(3)).thresholdReduce.grass_hay).toBe(3);
  });

  it("stacking across types", () => {
    const both = { workers: { hired: { ...empty.workers.hired, hilda: 3, pip: 2 }, debt: 0 } };
    const rB = computeWorkerEffects(both);
    expect(rB.thresholdReduce.grass_hay).toBe(3);
    expect(rB.poolWeight.berry).toBe(2);
  });

  it("additive same-key stacking — synthetic worker map", () => {
    const synthMap = {
      ...WORKER_MAP,
      ghost: { id:"ghost", maxCount:2, effect: { type:"threshold_reduce", key:"grass_hay", from:4, to:2 } }
    };
    const synthState = { workers: { hired: { hilda: 3, ghost: 2 }, debt: 0 } };
    expect(computeWorkerEffects(synthState, synthMap).thresholdReduce.grass_hay).toBe(5);
  });

  it("debt > 0 suppresses ALL effects", () => {
    const inDebt = { workers: { hired: { ...empty.workers.hired, hilda: 3, tuck: 1 }, debt: 5 } };
    const rD = computeWorkerEffects(inDebt);
    expect(rD.thresholdReduce.grass_hay ?? 0).toBe(0);
    expect(rD.seasonBonus.coins   ?? 0).toBe(0);
  });

  it("over-hired clamped to full-slot", () => {
    const over = { workers: { hired: { ...empty.workers.hired, hilda: 99 }, debt: 0 } };
    expect(computeWorkerEffects(over).thresholdReduce.grass_hay).toBe(3);
  });

  it("does not mutate state", () => {
    const both = { workers: { hired: { ...empty.workers.hired, hilda: 3, pip: 2 }, debt: 0 } };
    const before = JSON.stringify(both);
    computeWorkerEffects(both);
    expect(JSON.stringify(both)).toBe(before);
  });
});
