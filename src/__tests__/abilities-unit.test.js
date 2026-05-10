// Per-ability unit tests. Each ability is exercised against a minimal
// source list so a regression in a single ability is easy to spot.

import { describe, it, expect } from "vitest";
import { aggregateAbilities } from "../config/abilitiesAggregate.js";
import { TILE_TYPES_BY_CATEGORY } from "../features/tileCollection/data.js";

function single(abilityId, params, weight = 1) {
  return aggregateAbilities(
    [{ abilities: [{ id: abilityId, params }], weight }],
    { speciesByCategory: TILE_TYPES_BY_CATEGORY },
  );
}

describe("ability: threshold_reduce", () => {
  it("contributes amount × weight to thresholdReduce[target]", () => {
    const out = single("threshold_reduce", { target: "grass_hay", amount: 4 }, 0.5);
    expect(out.thresholdReduce.grass_hay).toBe(2);
  });
  it("zero weight contributes nothing", () => {
    const out = single("threshold_reduce", { target: "grass_hay", amount: 4 }, 0);
    expect(out.thresholdReduce.grass_hay ?? 0).toBe(0);
  });
});

describe("ability: threshold_reduce_category", () => {
  it("fans out to every species in the category", () => {
    const out = single("threshold_reduce_category", { category: "vegetables", amount: 2 }, 1);
    // veg_carrot is the canonical default; multiple species exist.
    const reduceKeys = Object.keys(out.thresholdReduce);
    expect(reduceKeys.length).toBeGreaterThan(0);
    for (const k of reduceKeys) {
      expect(out.thresholdReduce[k]).toBe(2);
    }
  });
});

describe("ability: pool_weight (floored per source)", () => {
  it("floors fractional contributions", () => {
    const out = single("pool_weight", { target: "mine_ore", amount: 1 }, 0.5);
    expect(out.effectivePoolWeights.mine_ore ?? 0).toBe(0); // 0.5 floored
  });
  it("contributes integer at full weight", () => {
    const out = single("pool_weight", { target: "mine_ore", amount: 3 }, 1);
    expect(out.effectivePoolWeights.mine_ore).toBe(3);
  });
});

describe("ability: pool_weight_legacy (continuous scaling)", () => {
  it("scales continuously without flooring", () => {
    const out = single("pool_weight_legacy", { target: "berry", amount: 4 }, 0.5);
    expect(out.poolWeight.berry).toBe(2);
  });
});

describe("ability: bonus_yield", () => {
  it("contributes amount × weight to bonusYield[target]", () => {
    const out = single("bonus_yield", { target: "fish_clam", amount: 3 }, 0.5);
    expect(out.bonusYield.fish_clam).toBeCloseTo(1.5);
  });
});

describe("ability: season_bonus", () => {
  it("scales by weight", () => {
    const out = single("season_bonus", { resource: "coins", amount: 100 }, 0.3);
    expect(out.seasonBonus.coins).toBe(30);
  });
});

describe("ability: recipe_input_reduce", () => {
  it("nests under recipe → input", () => {
    const out = single("recipe_input_reduce", { recipe: "bread", input: "grain_flour", amount: 2 }, 1);
    expect(out.recipeInputReduce.bread.grain_flour).toBe(2);
  });
});

describe("ability: chain_redirect_category", () => {
  it("computes effective threshold via linear interpolation", () => {
    const out = single("chain_redirect_category", {
      fromCategory: "grain",
      toCategory: "vegetables",
      baseThreshold: 6,
      minThreshold: 4,
    }, 0.5);
    // 6 - (6-4)*0.5 = 5
    expect(out.chainRedirect.grain.threshold).toBeCloseTo(5);
    expect(out.chainRedirect.grain.toCategory).toBe("vegetables");
    expect(out.chainRedirect.grain.redirectShare).toBe(0.5);
  });
});

describe("ability: hazard_spawn_reduce", () => {
  it("caps total reduction at 1.0", () => {
    const out = aggregateAbilities([
      { abilities: [{ id: "hazard_spawn_reduce", params: { hazard: "rats", amount: 0.7 } }], weight: 1 },
      { abilities: [{ id: "hazard_spawn_reduce", params: { hazard: "rats", amount: 0.6 } }], weight: 1 },
    ]);
    expect(out.hazardSpawnReduce.rats).toBe(1.0);
  });
});

describe("ability: hazard_coin_multiplier", () => {
  it("starts at 1× and adds bonus × weight", () => {
    const out = single("hazard_coin_multiplier", { hazard: "rats", multiplier: 2 }, 0.5);
    // bonus = (2-1) × 0.5 = 0.5; final = 1 + 0.5 = 1.5
    expect(out.hazardCoinMultiplier.rats).toBe(1.5);
  });
});

describe("ability: free_moves", () => {
  it("floors count × weight", () => {
    const out = single("free_moves", { count: 5 }, 0.5);
    expect(out.freeMoves).toBe(2); // floor(2.5)
  });
});

describe("ability: free_turn_if_chain", () => {
  it("keeps the lowest minChain when multiple sources contribute", () => {
    const out = aggregateAbilities([
      { abilities: [{ id: "free_turn_if_chain", params: { minChain: 8 } }], weight: 1 },
      { abilities: [{ id: "free_turn_if_chain", params: { minChain: 5 } }], weight: 1 },
    ]);
    expect(out.freeMovesIfChain).toEqual({ minChain: 5, count: 1 });
  });
});

describe("ability: coin_bonus_flat / coin_bonus_per_tile", () => {
  it("flat coin bonus accumulates", () => {
    const out = aggregateAbilities([
      { abilities: [{ id: "coin_bonus_flat", params: { amount: 10 } }], weight: 1 },
      { abilities: [{ id: "coin_bonus_flat", params: { amount: 5 } }], weight: 1 },
    ]);
    expect(out.coinBonusFlat).toBe(15);
  });
  it("per-tile coin bonus accumulates", () => {
    const out = single("coin_bonus_per_tile", { amount: 3 }, 1);
    expect(out.coinBonusPerTile).toBe(3);
  });
});

describe("ability: grant_tool", () => {
  it("writes integer amount × weight to seasonEndTools", () => {
    const out = single("grant_tool", { tool: "bomb", amount: 2 }, 1);
    expect(out.seasonEndTools.bomb).toBe(2);
  });
});

describe("ability: worker_pool_step", () => {
  it("accumulates seasonEndPoolStep across sources", () => {
    const out = aggregateAbilities([
      { abilities: [{ id: "worker_pool_step", params: { amount: 1 } }], weight: 1 },
      { abilities: [{ id: "worker_pool_step", params: { amount: 1 } }], weight: 1 },
      { abilities: [{ id: "worker_pool_step", params: { amount: 1 } }], weight: 1 },
    ]);
    expect(out.seasonEndPoolStep).toBe(3);
  });
});

describe("ability: preserve_board", () => {
  it("collects biome ids into a Set", () => {
    const out = aggregateAbilities([
      { abilities: [{ id: "preserve_board", params: { biome: "farm" } }], weight: 1 },
      { abilities: [{ id: "preserve_board", params: { biome: "mine" } }], weight: 1 },
    ]);
    expect(out.boardPreserveBiomes.has("farm")).toBe(true);
    expect(out.boardPreserveBiomes.has("mine")).toBe(true);
    expect(out.boardPreserveBiomes.size).toBe(2);
  });
});
