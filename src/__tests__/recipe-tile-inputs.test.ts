/**
 * Regression guard: no recipe in RECIPES should have a tile_* key in its inputs.
 * Tile keys are source tiles; recipes must reference family resource keys instead
 * (e.g. block, hay_bundle, dirt, gold_bar, soup, coke, jam).
 */
import { describe, it, expect } from "vitest";
import { RECIPES } from "../constants.js";

describe("recipe inputs — no tile_ keys", () => {
  it("no recipe has a tile_* key in its inputs", () => {
    for (const [recipeKey, recipe] of Object.entries(RECIPES)) {
      if (!recipe.inputs) continue;
      for (const inputKey of Object.keys(recipe.inputs)) {
        expect(
          inputKey.startsWith("tile_"),
          `${recipeKey}.inputs.${inputKey} is a tile_ key — use the family resource instead`,
        ).toBe(false);
      }
    }
  });
});
