import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { APPRENTICES } from "../features/apprentices/data.js";
import { computeWorkerEffects } from "../features/apprentices/aggregate.js";

describe("Poultryman apprentice (bird category threshold reduce)", () => {
  it("is registered with the expected shape", () => {
    const w = APPRENTICES.find((a) => a.id === "poultryman");
    expect(w).toBeDefined();
    expect(w.name).toBe("Idris");
    expect(w.maxCount).toBe(2);
    expect(w.effect).toEqual({
      type: "threshold_reduce_category",
      category: "bird",
      from: 6,
      to: 4,
    });
    expect(w.requirement?.building).toBe("granary");
  });

  it("0 hires: no bird-category threshold reduction", () => {
    const s = createInitialState();
    const eff = computeWorkerEffects(s);
    expect(eff.thresholdReduce?.bird_egg ?? 0).toBe(0);
    expect(eff.thresholdReduce?.bird_chicken ?? 0).toBe(0);
  });

  it("1 hire: every bird species' threshold drops by 1", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { poultryman: 1 }, debt: 0, pool: 1 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.thresholdReduce.bird_egg).toBe(1);
    expect(eff.thresholdReduce.bird_turkey).toBe(1);
    expect(eff.thresholdReduce.bird_chicken).toBe(1);
  });

  it("2 hires (max): every bird species' threshold drops by 2", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { poultryman: 2 }, debt: 0, pool: 2 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.thresholdReduce.bird_egg).toBe(2);
    expect(eff.thresholdReduce.bird_turkey).toBe(2);
  });

  it("hiring cap honoured — third hire is rejected", () => {
    let s = {
      ...createInitialState(),
      coins: 100000,
      built: { granary: true },
      townsfolk: { hired: { poultryman: 2 }, debt: 0, pool: 5 },
      inventory: { grass_hay: 99, bread: 99, mine_stone: 99 },
    };
    s = rootReducer(s, { type: "APP/HIRE", payload: { id: "poultryman" } });
    expect(s.townsfolk.hired.poultryman).toBe(2);
  });
});
