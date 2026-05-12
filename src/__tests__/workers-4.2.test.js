import { describe, it, expect } from "vitest";
import { computeWorkerEffects } from "../features/apprentices/aggregate.js";

describe("Phase 4.2 — computeWorkerEffects pure aggregator", () => {
  const empty = { townsfolk: { hired: { hilda:0, pip:0, wila:0, tuck:0, osric:0, dren:0 }, debt: 0 } };

  it("zero hires → all zeroes", () => {
    const r0 = computeWorkerEffects(empty);
    expect(r0.thresholdReduce.grass_hay ?? 0).toBe(0);
    expect(r0.poolWeight.berry   ?? 0).toBe(0);
    expect(r0.bonusYield.berry_jam     ?? 0).toBe(0);
    expect(r0.seasonBonus.coins  ?? 0).toBe(0);
  });

  it("per-hire walk on Hilda (max-effect ÷ maxCount)", () => {
    const withHilda = (n) => ({ townsfolk: { hired: { ...empty.townsfolk.hired, hilda: n }, debt: 0 } });
    expect(computeWorkerEffects(withHilda(1)).thresholdReduce.grass_hay).toBe(1);
    expect(computeWorkerEffects(withHilda(2)).thresholdReduce.grass_hay).toBe(2);
    expect(computeWorkerEffects(withHilda(3)).thresholdReduce.grass_hay).toBe(3);
  });

  it("stacking across types", () => {
    const both = { townsfolk: { hired: { ...empty.townsfolk.hired, hilda: 3, pip: 2 }, debt: 0 } };
    const rB = computeWorkerEffects(both);
    expect(rB.thresholdReduce.grass_hay).toBe(3);
    expect(rB.poolWeight.berry).toBe(2);
  });

  it("additive same-key stacking — multiple workers reducing the same threshold", () => {
    // brenna threshold_reduce_category vegetables (max delta 1, max=4) +
    // marin chain_redirect_category vegetables→fruits (separate channel,
    // doesn't double-count). Use brenna alone here for simplicity; full
    // stacking is covered in aggregate-coverage.test.js.
    const s = { townsfolk: { hired: { brenna: 4 }, debt: 0 } };
    const out = computeWorkerEffects(s);
    expect(out.thresholdReduce.veg_carrot).toBe(1);
  });

  it("over-hired clamped to full-slot", () => {
    const over = { townsfolk: { hired: { ...empty.townsfolk.hired, hilda: 99 }, debt: 0 } };
    expect(computeWorkerEffects(over).thresholdReduce.grass_hay).toBe(3);
  });

  it("does not mutate state", () => {
    const both = { townsfolk: { hired: { ...empty.townsfolk.hired, hilda: 3, pip: 2 }, debt: 0 } };
    const before = JSON.stringify(both);
    computeWorkerEffects(both);
    expect(JSON.stringify(both)).toBe(before);
  });
});
