import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { APPRENTICES } from "../features/apprentices/data.js";
import { computeWorkerEffects } from "../features/apprentices/aggregate.js";
import { tryClearRatChain } from "../features/farm/rats.js";
import { RAT_CLEAR_REWARD_PER } from "../constants.js";

describe("Ratcatcher (hazardCoinMultiplier on rats)", () => {
  it("registered with the new effect shape", () => {
    const w = APPRENTICES.find((a) => a.id === "ratcatcher");
    expect(w).toBeDefined();
    expect(w.maxCount).toBe(2);
    expect(w.abilities).toEqual([
      { id: "hazard_coin_multiplier", params: { hazard: "rats", multiplier: 2.0 } },
    ]);
  });

  it("aggregator: 0 hires → multiplier 1×", () => {
    const eff = computeWorkerEffects(createInitialState());
    // Default 1 when no hires, even though no key was ever written
    const m = eff.hazardCoinMultiplier?.rats ?? 1;
    expect(m).toBe(1);
  });

  it("aggregator: 1 hire (per-hire +0.5) → 1.5×", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { ratcatcher: 1 }, debt: 0, pool: 1 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.hazardCoinMultiplier.rats).toBeCloseTo(1.5);
  });

  it("aggregator: 2 hires (max) → 2.0×", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { ratcatcher: 2 }, debt: 0, pool: 2 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.hazardCoinMultiplier.rats).toBeCloseTo(2.0);
  });

  it("tryClearRatChain: no Ratcatcher → base reward", () => {
    const s = {
      ...createInitialState(),
      coins: 0,
      hazards: { rats: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] },
    };
    const chain = [
      { key: "rat", row: 0, col: 0 },
      { key: "rat", row: 0, col: 1 },
      { key: "rat", row: 0, col: 2 },
    ];
    const patch = tryClearRatChain(s, chain);
    expect(patch.coins).toBe(3 * RAT_CLEAR_REWARD_PER);
  });

  it("tryClearRatChain: max-hire Ratcatcher doubles the reward", () => {
    const s = {
      ...createInitialState(),
      coins: 0,
      hazards: { rats: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] },
      townsfolk: { hired: { ratcatcher: 2 }, debt: 0, pool: 2 },
    };
    const chain = [
      { key: "rat", row: 0, col: 0 },
      { key: "rat", row: 0, col: 1 },
      { key: "rat", row: 0, col: 2 },
    ];
    const patch = tryClearRatChain(s, chain);
    expect(patch.coins).toBe(3 * RAT_CLEAR_REWARD_PER * 2);
  });

  it("Ratcatcher cap honoured — third hire is rejected", () => {
    let s = {
      ...createInitialState(),
      coins: 100000,
      built: { inn: true },
      townsfolk: { hired: { ratcatcher: 2 }, debt: 0, pool: 5 },
      inventory: { grass_hay: 99, bread: 99 },
    };
    s = rootReducer(s, { type: "APP/HIRE", payload: { id: "ratcatcher" } });
    expect(s.townsfolk.hired.ratcatcher).toBe(2);
  });
});

describe("Sapper (hazardSpawnReduce on cave_in)", () => {
  it("registered with hazardSpawnReduce { cave_in: 0.6 }", () => {
    const w = APPRENTICES.find((a) => a.id === "sapper");
    expect(w).toBeDefined();
    expect(w.maxCount).toBe(2);
    expect(w.abilities).toEqual([
      { id: "hazard_spawn_reduce", params: { hazard: "cave_in", amount: 0.6 } },
    ]);
  });

  it("aggregator: 1 hire (per-hire +0.3) → 0.3 reduction", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { sapper: 1 }, debt: 0, pool: 1 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.hazardSpawnReduce.cave_in).toBeCloseTo(0.3);
  });

  it("aggregator: max hire → 0.6 reduction (capped at 1.0)", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { sapper: 2 }, debt: 0, pool: 2 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.hazardSpawnReduce.cave_in).toBeCloseTo(0.6);
  });
});
