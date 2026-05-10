import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { APPRENTICES } from "../features/apprentices/data.js";
import { computeWorkerEffects } from "../features/apprentices/aggregate.js";
import { CATEGORIES } from "../features/tileCollection/data.js";

describe("Sea workers — Fisherman + Trawlerman", () => {
  it("'fish' tile-collection category is registered", () => {
    expect(CATEGORIES).toContain("fish");
  });

  it("Fisherman exists with expected shape", () => {
    const w = APPRENTICES.find((a) => a.id === "fisherman");
    expect(w).toBeDefined();
    expect(w.maxCount).toBe(3);
    expect(w.abilities).toEqual([
      { id: "threshold_reduce_category", params: { category: "fish", amount: 3 } },
    ]);
  });

  it("Trawlerman exists with expected shape", () => {
    const w = APPRENTICES.find((a) => a.id === "trawlerman");
    expect(w).toBeDefined();
    expect(w.maxCount).toBe(2);
    expect(w.abilities).toEqual([
      { id: "pool_weight", params: { target: "fish_sardine", amount: 2 } },
      { id: "pool_weight", params: { target: "fish_mackerel", amount: 2 } },
    ]);
  });

  it("0 hires: no fish-category threshold reduction", () => {
    const eff = computeWorkerEffects(createInitialState());
    expect(eff.thresholdReduce?.fish_sardine ?? 0).toBe(0);
  });

  it("1 hire of Fisherman: fish-category thresholds drop by 1", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { fisherman: 1 }, debt: 0, pool: 1 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.thresholdReduce.fish_sardine).toBe(1);
    expect(eff.thresholdReduce.fish_mackerel).toBe(1);
    expect(eff.thresholdReduce.fish_clam).toBe(1);
    expect(eff.thresholdReduce.fish_oyster).toBe(1);
    expect(eff.thresholdReduce.fish_kelp).toBe(1);
  });

  it("3 hires of Fisherman (max): fish thresholds drop by 3", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { fisherman: 3 }, debt: 0, pool: 3 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.thresholdReduce.fish_sardine).toBe(3);
  });

  it("2 hires of Trawlerman (max): +2 sardine / +2 mackerel pool weight", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { trawlerman: 2 }, debt: 0, pool: 2 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.effectivePoolWeights.fish_sardine).toBe(2);
    expect(eff.effectivePoolWeights.fish_mackerel).toBe(2);
  });

  it("Fisherman cap honoured — fourth hire is rejected", () => {
    let s = {
      ...createInitialState(),
      coins: 100000,
      level: 5,
      townsfolk: { hired: { fisherman: 3 }, debt: 0, pool: 5 },
      inventory: { fish_raw: 99, bread: 99, wood_plank: 99 },
    };
    s = rootReducer(s, { type: "APP/HIRE", payload: { id: "fisherman" } });
    expect(s.townsfolk.hired.fisherman).toBe(3);
  });
});
