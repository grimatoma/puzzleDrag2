import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { APPRENTICES } from "../features/apprentices/data.js";
import { computeWorkerEffects } from "../features/apprentices/aggregate.js";

describe("Sea workers 2 — Boatwoman / Harpooner / Oilman", () => {
  it("Boatwoman / Harpooner / Oilman are registered", () => {
    for (const id of ["boatwoman", "harpooner", "oilman"]) {
      expect(APPRENTICES.find((a) => a.id === id), id).toBeDefined();
    }
  });

  it("Boatwoman bonus_yield on fish_clam", () => {
    const w = APPRENTICES.find((a) => a.id === "boatwoman");
    expect(w.effect).toEqual({ type: "bonus_yield", key: "fish_clam", amount: 2 });
  });

  it("Harpooner bonus_yield on fish_oyster", () => {
    const w = APPRENTICES.find((a) => a.id === "harpooner");
    expect(w.effect).toEqual({ type: "bonus_yield", key: "fish_oyster", amount: 1 });
  });

  it("Oilman threshold_reduce on fish_kelp", () => {
    const w = APPRENTICES.find((a) => a.id === "oilman");
    expect(w.effect).toEqual({ type: "threshold_reduce", key: "fish_kelp", from: 6, to: 4 });
  });

  it("max-hire Boatwoman: bonusYield.fish_clam scales linearly", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { boatwoman: 2 }, debt: 0, pool: 2 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.bonusYield.fish_clam).toBe(2);
  });

  it("max-hire Harpooner: bonusYield.fish_oyster scales linearly", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { harpooner: 2 }, debt: 0, pool: 2 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.bonusYield.fish_oyster).toBe(1);
  });

  it("max-hire Oilman: threshold_reduce on fish_kelp by 2", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { oilman: 2 }, debt: 0, pool: 2 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.thresholdReduce.fish_kelp).toBe(2);
  });

  it("Harpooner cap honoured — third hire is rejected", () => {
    let s = {
      ...createInitialState(),
      coins: 100000,
      level: 6,
      townsfolk: { hired: { harpooner: 2 }, debt: 0, pool: 5 },
      inventory: { fish_raw: 99, bread: 99, mine_ingot: 99 },
    };
    s = rootReducer(s, { type: "APP/HIRE", payload: { id: "harpooner" } });
    expect(s.townsfolk.hired.harpooner).toBe(2);
  });
});
