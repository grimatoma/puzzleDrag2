import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { RECIPES, MARKET_PRICES } from "../constants.js";

describe("fish biome recipes", () => {
  it("chowder recipe exists with the expected shape", () => {
    const r = RECIPES.chowder;
    expect(r).toBeDefined();
    expect(r.station).toBe("larder");
    expect(r.inputs).toEqual({ fish_fillet: 2, milk: 1, veg_carrot: 1 });
    expect(r.coins).toBeGreaterThan(0);
  });

  it("fish_oil_bottled recipe exists with the expected shape", () => {
    const r = RECIPES.fish_oil_bottled;
    expect(r).toBeDefined();
    expect(r.station).toBe("workshop");
    expect(r.inputs).toEqual({ fish_oil: 1, wood_plank: 1 });
    expect(r.coins).toBeGreaterThan(0);
  });

  it("market prices exist for fish chain products", () => {
    for (const k of ["fish_raw", "fish_fillet", "fish_oil", "fish_oil_bottled", "chowder"]) {
      expect(MARKET_PRICES[k], `${k} price`).toBeDefined();
      // Chain products are sell-only — buy: 0 is the convention.
      expect(MARKET_PRICES[k].sell).toBeGreaterThan(0);
    }
  });

  it("crafting chowder consumes inputs, grants coins, and adds 1 chowder to inventory", () => {
    const s0 = {
      ...createInitialState(),
      coins: 0,
      built: { larder: true },
      inventory: { fish_fillet: 5, milk: 2, veg_carrot: 3 },
    };
    const s1 = rootReducer(s0, { type: "CRAFTING/CRAFT_RECIPE", recipeKey: "chowder" });
    expect(s1.inventory.fish_fillet).toBe(3);
    expect(s1.inventory.milk).toBe(1);
    expect(s1.inventory.veg_carrot).toBe(2);
    expect(s1.inventory.chowder).toBe(1);
    expect(s1.coins).toBe(RECIPES.chowder.coins);
  });

  it("crafting chowder is rejected without the larder built", () => {
    const s0 = {
      ...createInitialState(),
      coins: 0,
      built: {},
      inventory: { fish_fillet: 5, milk: 2, veg_carrot: 3 },
    };
    const s1 = rootReducer(s0, { type: "CRAFTING/CRAFT_RECIPE", recipeKey: "chowder" });
    expect(s1.inventory.chowder).toBeUndefined();
    expect(s1.coins).toBe(0);
  });

  it("crafting chowder is rejected if any input is missing", () => {
    const s0 = {
      ...createInitialState(),
      built: { larder: true },
      inventory: { fish_fillet: 1, milk: 1, veg_carrot: 1 }, // need 2 fillet
    };
    const s1 = rootReducer(s0, { type: "CRAFTING/CRAFT_RECIPE", recipeKey: "chowder" });
    expect(s1.inventory.chowder).toBeUndefined();
    expect(s1.inventory.fish_fillet).toBe(1);
  });

  it("crafting fish_oil_bottled consumes inputs, grants coins, adds the bottled product", () => {
    const s0 = {
      ...createInitialState(),
      coins: 5,
      built: { workshop: true },
      inventory: { fish_oil: 2, wood_plank: 1 },
    };
    const s1 = rootReducer(s0, { type: "CRAFTING/CRAFT_RECIPE", recipeKey: "fish_oil_bottled" });
    expect(s1.inventory.fish_oil).toBe(1);
    expect(s1.inventory.wood_plank).toBe(0);
    expect(s1.inventory.fish_oil_bottled).toBe(1);
    expect(s1.coins).toBe(5 + RECIPES.fish_oil_bottled.coins);
  });
});
