import { describe, it, expect } from "vitest";
import { createInitialState } from "../state.js";
import { APPRENTICES } from "../features/apprentices/data.js";
import { computeWorkerEffects } from "../features/apprentices/aggregate.js";

describe("Mine workers — second batch (catalog completion)", () => {
  it("registers iron_miner / silver_miner / engineer / alchemist / sculptor", () => {
    for (const id of ["iron_miner", "silver_miner", "engineer", "alchemist", "sculptor"]) {
      expect(APPRENTICES.find((a) => a.id === id), id).toBeDefined();
    }
  });

  it("Iron Miner pool_weight on mine_ore", () => {
    const w = APPRENTICES.find((a) => a.id === "iron_miner");
    expect(w.abilities).toEqual([
      { id: "pool_weight_legacy", params: { target: "mine_ore", amount: 2 } },
    ]);
  });

  it("Silver Miner pool_weight on mine_gold (single hire cap)", () => {
    const w = APPRENTICES.find((a) => a.id === "silver_miner");
    expect(w.abilities).toEqual([
      { id: "pool_weight_legacy", params: { target: "mine_gold", amount: 1 } },
    ]);
    expect(w.maxCount).toBe(1);
  });

  it("Engineer bonus_yield on mine_stone", () => {
    const w = APPRENTICES.find((a) => a.id === "engineer");
    expect(w.abilities).toEqual([
      { id: "bonus_yield", params: { target: "mine_stone", amount: 1 } },
    ]);
  });

  it("Alchemist bonus_yield on mine_coal", () => {
    const w = APPRENTICES.find((a) => a.id === "alchemist");
    expect(w.abilities).toEqual([
      { id: "bonus_yield", params: { target: "mine_coal", amount: 1 } },
    ]);
  });

  it("Sculptor season_bonus coins 50", () => {
    const w = APPRENTICES.find((a) => a.id === "sculptor");
    expect(w.abilities).toEqual([
      { id: "season_bonus", params: { resource: "coins", amount: 50 } },
    ]);
  });

  it("max-hire Iron Miner: poolWeight.mine_ore = 2", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { iron_miner: 2 }, debt: 0, pool: 2 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.poolWeight.mine_ore).toBe(2);
  });

  it("max-hire Silver Miner: poolWeight.mine_gold = 1", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { silver_miner: 1 }, debt: 0, pool: 1 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.poolWeight.mine_gold).toBe(1);
  });

  it("max-hire Engineer: bonusYield.mine_stone = 1", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { engineer: 2 }, debt: 0, pool: 2 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.bonusYield.mine_stone).toBe(1);
  });

  it("max-hire Alchemist: bonusYield.mine_coal = 1", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { alchemist: 2 }, debt: 0, pool: 2 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.bonusYield.mine_coal).toBe(1);
  });

  it("max-hire Sculptor: seasonBonus.coins = 50", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { sculptor: 1 }, debt: 0, pool: 1 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.seasonBonus.coins).toBe(50);
  });
});
