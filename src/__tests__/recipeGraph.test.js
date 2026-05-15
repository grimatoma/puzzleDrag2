import { describe, it, expect } from "vitest";
import { traceRecipe, collectUpstreamRecipes, countRawInputs } from "../balanceManager/recipeGraph.js";

describe("traceRecipe", () => {
  const recipes = {
    rec_bread: { item: "bread", inputs: { grain_flour: 2, water: 1 }, station: "bakery" },
    rec_flour: { item: "grain_flour", inputs: { grain: 3 }, station: "mill" },
  };
  const items = { bread: { label: "Bread" }, grain_flour: { label: "Flour" }, grain: { label: "Grain" }, water: { label: "Water" } };

  it("returns a tree rooted at the requested recipe with its raw + producible ingredients", () => {
    const tree = traceRecipe("rec_bread", { recipes, items });
    expect(tree.recipeId).toBe("rec_bread");
    expect(tree.output).toBe("bread");
    expect(tree.ingredients.map((i) => i.id).sort()).toEqual(["grain_flour", "water"]);
    const water = tree.ingredients.find((i) => i.id === "water");
    expect(water.raw).toBe(true);
    const flour = tree.ingredients.find((i) => i.id === "grain_flour");
    expect(flour.raw).toBe(false);
    expect(flour.sources).toHaveLength(1);
    expect(flour.sources[0].recipeId).toBe("rec_flour");
  });

  it("returns null for an unknown recipe id", () => {
    expect(traceRecipe("nope", { recipes, items })).toBeNull();
  });

  it("marks a cyclical recipe so the walker doesn't loop", () => {
    const cyc = {
      a: { item: "x", inputs: { y: 1 } },
      b: { item: "y", inputs: { x: 1 } },
    };
    const tree = traceRecipe("a", { recipes: cyc, items: {} });
    const y = tree.ingredients[0];
    expect(y.sources[0].recipeId).toBe("b");
    expect(y.sources[0].ingredients[0].sources[0].cyclical).toBe(true);
  });

  it("honors maxDepth (truncated ingredients keep their producer count but no expansion)", () => {
    const tree = traceRecipe("rec_bread", { recipes, items, maxDepth: 1 });
    const flour = tree.ingredients.find((i) => i.id === "grain_flour");
    expect(flour.sources).toEqual([]);
    expect(flour.truncated).toBe(true);
  });

  it("traces the live RECIPES catalog without crashing", () => {
    // RECIPES carries both `rec_*` ids and the item-key aliases, so either
    // lookup should resolve to the same tree.
    const tree = traceRecipe("rec_bread", {});
    expect(tree).toBeTruthy();
    expect(tree.recipeId).toBe("rec_bread");
    expect(Array.isArray(tree.ingredients)).toBe(true);
  });
});

describe("collectUpstreamRecipes", () => {
  it("returns a flat de-duplicated list of every upstream recipe id", () => {
    const recipes = {
      rec_pie: { item: "pie", inputs: { grain_flour: 1, berry_jam: 1 } },
      rec_flour: { item: "grain_flour", inputs: { grain: 1 } },
      rec_jam: { item: "berry_jam", inputs: { berry: 1 } },
    };
    const tree = traceRecipe("rec_pie", { recipes, items: {} });
    expect(collectUpstreamRecipes(tree)).toEqual(["rec_flour", "rec_jam"]);
  });

  it("returns an empty list when every input is raw", () => {
    const recipes = { rec_simple: { item: "x", inputs: { raw1: 1, raw2: 2 } } };
    const tree = traceRecipe("rec_simple", { recipes, items: {} });
    expect(collectUpstreamRecipes(tree)).toEqual([]);
  });
});

describe("countRawInputs", () => {
  it("counts every leaf raw input across the recursion", () => {
    const recipes = {
      rec_pie: { item: "pie", inputs: { flour: 1, jam: 1 } },
      rec_flour: { item: "flour", inputs: { grain: 1 } },
      rec_jam: { item: "jam", inputs: { berry: 2 } },
    };
    const tree = traceRecipe("rec_pie", { recipes, items: {} });
    // flour & jam are each produced, leading to grain & berry as raws.
    expect(countRawInputs(tree)).toBe(2);
  });

  it("returns 0 for null trees", () => {
    expect(countRawInputs(null)).toBe(0);
  });
});
