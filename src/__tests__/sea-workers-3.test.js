import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { APPRENTICES } from "../features/apprentices/data.js";
import { computeWorkerEffects } from "../features/apprentices/aggregate.js";

describe("Sea workers 3 — Cook / Chef / Captain", () => {
  it("Cook / Chef / Captain are registered", () => {
    for (const id of ["cook", "chef", "captain"]) {
      expect(APPRENTICES.find((a) => a.id === id), id).toBeDefined();
    }
  });

  it("Cook bonus_yield on fish_fillet", () => {
    const w = APPRENTICES.find((a) => a.id === "cook");
    expect(w.effect).toEqual({ type: "bonus_yield", key: "fish_fillet", amount: 1 });
    expect(w.maxCount).toBe(2);
  });

  it("Chef season_bonus coins", () => {
    const w = APPRENTICES.find((a) => a.id === "chef");
    expect(w.effect).toEqual({ type: "season_bonus", key: "coins", amount: 60 });
    expect(w.maxCount).toBe(1);
  });

  it("Captain pool_weight on fish_oyster", () => {
    const w = APPRENTICES.find((a) => a.id === "captain");
    expect(w.effect).toEqual({ type: "pool_weight", key: "fish_oyster", amount: 2 });
    expect(w.maxCount).toBe(1);
  });

  it("max-hire Cook: bonusYield.fish_fillet = 1 at max", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { cook: 2 }, debt: 0, pool: 2 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.bonusYield.fish_fillet).toBe(1);
  });

  it("max-hire Chef: seasonBonus.coins = 60", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { chef: 1 }, debt: 0, pool: 1 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.seasonBonus.coins).toBe(60);
  });

  it("max-hire Captain: poolWeight.fish_oyster = 2", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { captain: 1 }, debt: 0, pool: 1 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.poolWeight.fish_oyster).toBe(2);
  });

  it("Captain cap honoured — second hire is rejected", () => {
    let s = {
      ...createInitialState(),
      coins: 100000,
      level: 7,
      townsfolk: { hired: { captain: 1 }, debt: 0, pool: 5 },
      inventory: { fish_oil: 99, fish_raw: 99, bread: 99 },
    };
    s = rootReducer(s, { type: "APP/HIRE", payload: { id: "captain" } });
    expect(s.townsfolk.hired.captain).toBe(1);
  });
});
