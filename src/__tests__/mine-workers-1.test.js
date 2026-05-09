import { describe, it, expect } from "vitest";
import { createInitialState } from "../state.js";
import { APPRENTICES } from "../features/apprentices/data.js";
import { computeWorkerEffects } from "../features/apprentices/aggregate.js";

describe("Mine workers — first batch", () => {
  it("registers Stone Miner / Coal Miner / Jeweler / Digger / Excavator", () => {
    for (const id of ["stone_miner", "coal_miner", "jeweler", "digger", "excavator"]) {
      expect(APPRENTICES.find((a) => a.id === id), id).toBeDefined();
    }
  });

  it("Stone Miner threshold_reduce on mine_cobble (6 → 3)", () => {
    const w = APPRENTICES.find((a) => a.id === "stone_miner");
    expect(w.effect).toEqual({ type: "threshold_reduce", key: "mine_cobble", from: 6, to: 3 });
    expect(w.maxCount).toBe(3);
  });

  it("Coal Miner threshold_reduce on mine_coal (7 → 5)", () => {
    const w = APPRENTICES.find((a) => a.id === "coal_miner");
    expect(w.effect).toEqual({ type: "threshold_reduce", key: "mine_coal", from: 7, to: 5 });
    expect(w.maxCount).toBe(2);
  });

  it("Jeweler threshold_reduce on mine_gem (5 → 3)", () => {
    const w = APPRENTICES.find((a) => a.id === "jeweler");
    expect(w.effect).toEqual({ type: "threshold_reduce", key: "mine_gem", from: 5, to: 3 });
    expect(w.maxCount).toBe(2);
  });

  it("Digger pool_weight: dirt + stone", () => {
    const w = APPRENTICES.find((a) => a.id === "digger");
    expect(w.effect.poolWeight).toEqual({ mine_dirt: 1, mine_stone: 1 });
    expect(w.maxCount).toBe(4);
  });

  it("Excavator bonus_yield on mine_cobble", () => {
    const w = APPRENTICES.find((a) => a.id === "excavator");
    expect(w.effect).toEqual({ type: "bonus_yield", key: "mine_cobble", amount: 1 });
    expect(w.maxCount).toBe(2);
  });

  it("max-hire Stone Miner: thresholdReduce.mine_cobble = 3", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { stone_miner: 3 }, debt: 0, pool: 3 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.thresholdReduce.mine_cobble).toBe(3);
  });

  it("max-hire Coal Miner: thresholdReduce.mine_coal = 2", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { coal_miner: 2 }, debt: 0, pool: 2 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.thresholdReduce.mine_coal).toBe(2);
  });

  it("max-hire Jeweler: thresholdReduce.mine_gem = 2", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { jeweler: 2 }, debt: 0, pool: 2 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.thresholdReduce.mine_gem).toBe(2);
  });

  it("max-hire Digger: effectivePoolWeights.mine_dirt = 1 + .mine_stone = 1", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { digger: 4 }, debt: 0, pool: 4 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.effectivePoolWeights.mine_dirt).toBe(1);
    expect(eff.effectivePoolWeights.mine_stone).toBe(1);
  });

  it("max-hire Excavator: bonusYield.mine_cobble = 1", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { excavator: 2 }, debt: 0, pool: 2 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.bonusYield.mine_cobble).toBe(1);
  });
});
