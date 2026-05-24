import { describe, it, expect } from "vitest";
import {
  mergeOverrides,
  applyUpgradeThresholdOverrides,
  applyItemOverrides,
  applyRecipeOverrides,
  applyBuildingOverrides,
  applyTileOverrides,
} from "../config/applyOverrides.js";

describe("Balance Manager — override merge layer", () => {
  it("mergeOverrides shallow-merges nested objects", () => {
    const a = { upgradeThresholds: { tile_grass_hay: 6 }, resources: {} };
    const b = { upgradeThresholds: { tile_grain_wheat: 4 }, recipes: { bread: { coins: 200 } } };
    const out = mergeOverrides(a, b);
    expect(out.upgradeThresholds).toEqual({ tile_grass_hay: 6, tile_grain_wheat: 4 });
    expect(out.recipes).toEqual({ bread: { coins: 200 } });
    expect(out.resources).toEqual({});
  });

  it("applyUpgradeThresholdOverrides mutates in place and rejects bad values", () => {
    const target = { tile_grass_hay: 6, tile_tree_oak: 5 };
    applyUpgradeThresholdOverrides(target, { tile_grass_hay: 8, tile_tree_oak: 0, bogus: -1, also_bogus: "abc" });
    expect(target.tile_grass_hay).toBe(8);
    expect(target.tile_tree_oak).toBe(5); // < 1 rejected
  });

  it("applyItemOverrides patches ITEMS entries by key", () => {
    const items = {
      tile_grass_hay: { label: "Hay", color: 0xa8c769, value: 1, next: "tile_grain_wheat" },
      tile_tree_oak:  { label: "Log", color: 0x9b6b3e, value: 2, next: "plank" },
    };
    applyItemOverrides(items, {
      tile_grass_hay: { label: "Straw", value: 3, next: "tile_tree_oak" },
    });
    expect(items.tile_grass_hay.label).toBe("Straw");
    expect(items.tile_grass_hay.value).toBe(3);
    expect(items.tile_grass_hay.next).toBe("tile_tree_oak");
    expect(items.tile_tree_oak.label).toBe("Log"); // unchanged
  });

  it("applyItemOverrides treats `next: null/empty` as terminal", () => {
    const items = { tile_grass_hay: { label: "Hay", next: "tile_grain_wheat" } };
    applyItemOverrides(items, { tile_grass_hay: { next: null } });
    expect(items.tile_grass_hay.next).toBeNull();
  });

  it("applyRecipeOverrides replaces inputs wholesale and rejects bad qty", () => {
    const recipes = {
      bread: { name: "Bread", inputs: { flour: 3, eggs: 1 }, coins: 125, station: "bakery" },
    };
    applyRecipeOverrides(recipes, {
      bread: { coins: 200, inputs: { flour: 4, bogus: -1 } },
    });
    expect(recipes.bread.coins).toBe(200);
    expect(recipes.bread.inputs).toEqual({ flour: 4 });
  });

  it("applyBuildingOverrides patches matched ids", () => {
    const buildings = [
      { id: "mill", name: "Mill", desc: "Grinds grain", cost: { coins: 200 }, lv: 1 },
      { id: "forge", name: "Forge", desc: "Smith", cost: { coins: 1200 }, lv: 8 },
    ];
    applyBuildingOverrides(buildings, {
      mill: { name: "Windmill", lv: 2, cost: { coins: 100, plank: 10 } },
    });
    expect(buildings[0].name).toBe("Windmill");
    expect(buildings[0].lv).toBe(2);
    expect(buildings[0].cost).toEqual({ coins: 100, plank: 10 });
    expect(buildings[1].name).toBe("Forge"); // unchanged
  });
});

describe("Balance Manager — applyTileOverrides", () => {
  it("merges power hooks into tile.effects via expansion", () => {
    const tiles = [
      { id: "tile_grass_hay", category: "grass", baseResource: "tile_grass_hay", tier: 0,
        discovery: { method: "default" }, effects: {} },
    ];
    applyTileOverrides(tiles, {
      tilePowers: {
        tile_grass_hay: {
          // Legacy `hooks` form is translated 1:1 into the new abilities shape.
          hooks: [{ id: "coin_bonus_flat", params: { amount: 10 } }],
        },
      },
    });
    expect(tiles[0].effects.coinBonusFlat).toBe(10);
    expect(tiles[0].effects.abilities).toEqual([
      { id: "coin_bonus_flat", params: { amount: 10 } },
    ]);
    expect(tiles[0].abilities).toEqual([
      { id: "coin_bonus_flat", params: { amount: 10 } },
    ]);
  });

  it("re-applying with a different hook array replaces the previous derived fields", () => {
    const tiles = [
      { id: "x", baseResource: "x", effects: { freeMoves: 5, hooks: [{ id: "free_moves", params: { count: 5 } }] } },
    ];
    applyTileOverrides(tiles, {
      tilePowers: { x: { hooks: [{ id: "coin_bonus_flat", params: { amount: 3 } }] } },
    });
    expect(tiles[0].effects.freeMoves).toBeUndefined(); // stripped
    expect(tiles[0].effects.coinBonusFlat).toBe(3);
  });

  it("preserves non-hook effects (e.g. hard-coded poolWeightDelta) when applying a hooks override", () => {
    const tiles = [
      { id: "x", baseResource: "x", effects: { poolWeightDelta: { foo: 1 } } },
    ];
    applyTileOverrides(tiles, {
      tilePowers: { x: { hooks: [{ id: "coin_bonus_flat", params: { amount: 1 } }] } },
    });
    expect(tiles[0].effects.poolWeightDelta).toEqual({ foo: 1 });
    expect(tiles[0].effects.coinBonusFlat).toBe(1);
  });

  it("applies tileUnlocks patches with sanitisation", () => {
    const tiles = [
      { id: "tile_a", baseResource: "x", discovery: { method: "default" }, effects: {} },
      { id: "tile_b", baseResource: "y", discovery: { method: "default" }, effects: {} },
    ];
    applyTileOverrides(tiles, {
      tileUnlocks: {
        tile_a: { method: "buy", coinCost: 250 },
        tile_b: { method: "research", researchOf: "x", researchAmount: 40 },
      },
    });
    expect(tiles[0].discovery).toEqual({ method: "buy", coinCost: 250 });
    expect(tiles[1].discovery).toEqual({ method: "research", researchOf: "x", researchAmount: 40 });
  });

  it("applies tileDescriptions overrides", () => {
    const tiles = [{ id: "x", baseResource: "x", description: "old", effects: {} }];
    applyTileOverrides(tiles, { tileDescriptions: { x: "new copy" } });
    expect(tiles[0].description).toBe("new copy");
  });
});
