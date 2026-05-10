import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { APPRENTICES } from "../features/apprentices/data.js";
import { computeWorkerEffects } from "../features/apprentices/aggregate.js";

describe("Sea workers 4 — Explorer / Navigator / Confectioner / Deckhand", () => {
  it("Explorer / Navigator / Confectioner / Deckhand are registered", () => {
    for (const id of ["explorer", "navigator", "confectioner", "deckhand"]) {
      expect(APPRENTICES.find((a) => a.id === id), id).toBeDefined();
    }
  });

  it("Explorer poolWeight object shape", () => {
    const w = APPRENTICES.find((a) => a.id === "explorer");
    expect(w.abilities).toEqual([
      { id: "pool_weight", params: { target: "fish_clam", amount: 1 } },
      { id: "pool_weight", params: { target: "fish_kelp", amount: 1 } },
    ]);
    expect(w.maxCount).toBe(2);
  });

  it("Navigator season_bonus coins 45", () => {
    const w = APPRENTICES.find((a) => a.id === "navigator");
    expect(w.abilities).toEqual([
      { id: "season_bonus", params: { resource: "coins", amount: 45 } },
    ]);
    expect(w.maxCount).toBe(1);
  });

  it("Confectioner bonus_yield fish_kelp", () => {
    const w = APPRENTICES.find((a) => a.id === "confectioner");
    expect(w.abilities).toEqual([
      { id: "bonus_yield", params: { target: "fish_kelp", amount: 2 } },
    ]);
    expect(w.maxCount).toBe(2);
  });

  it("Deckhand poolWeight object shape (sardine/mackerel/kelp)", () => {
    const w = APPRENTICES.find((a) => a.id === "deckhand");
    expect(w.abilities).toEqual([
      { id: "pool_weight", params: { target: "fish_sardine", amount: 1 } },
      { id: "pool_weight", params: { target: "fish_mackerel", amount: 1 } },
      { id: "pool_weight", params: { target: "fish_kelp", amount: 1 } },
    ]);
    expect(w.maxCount).toBe(4);
  });

  it("max-hire Navigator: seasonBonus.coins = 45", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { navigator: 1 }, debt: 0, pool: 1 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.seasonBonus.coins).toBe(45);
  });

  it("max-hire Confectioner: bonusYield.fish_kelp = 2", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { confectioner: 2 }, debt: 0, pool: 2 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.bonusYield.fish_kelp).toBe(2);
  });

  it("max-hire Deckhand: effectivePoolWeights bumps all three keys by 1", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { deckhand: 4 }, debt: 0, pool: 4 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.effectivePoolWeights.fish_sardine).toBe(1);
    expect(eff.effectivePoolWeights.fish_mackerel).toBe(1);
    expect(eff.effectivePoolWeights.fish_kelp).toBe(1);
  });

  it("Deckhand cap honoured — fifth hire is rejected", () => {
    let s = {
      ...createInitialState(),
      coins: 100000,
      level: 5,
      townsfolk: { hired: { deckhand: 4 }, debt: 0, pool: 5 },
      inventory: { fish_raw: 99, bread: 99, wood_plank: 99 },
    };
    s = rootReducer(s, { type: "APP/HIRE", payload: { id: "deckhand" } });
    expect(s.townsfolk.hired.deckhand).toBe(4);
  });
});
