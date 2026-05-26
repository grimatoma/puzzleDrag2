import { describe, it, expect } from "vitest";
import { RECIPES } from "../../constants.js";
import { buildRecipesByOutput, canonicalRecipeEntries } from "../recipeCatalog.js";

describe("recipeCatalog", () => {
  it("canonicalRecipeEntries omits backward-compat alias keys", () => {
    const entries = canonicalRecipeEntries(RECIPES);
    const ids = entries.map(([id]) => id);
    expect(ids).toContain("rec_rake");
    expect(ids).not.toContain("rake");
    expect(entries.length).toBeLessThan(Object.keys(RECIPES).length);
  });

  it("buildRecipesByOutput lists each tool recipe once", () => {
    const byOutput = buildRecipesByOutput();
    expect(byOutput.rake).toHaveLength(1);
    expect(byOutput.rake[0].recId).toBe("rec_rake");
    expect(byOutput.axe).toHaveLength(1);
  });

  it("buildRecipesByOutput does not duplicate draft overlays for alias recipe keys", () => {
    const byOutput = buildRecipesByOutput({
      draftRecipes: {
        rake: { station: "workshop" },
      },
    });

    expect(byOutput.rake).toHaveLength(1);
    expect(byOutput.rake[0].recId).toBe("rec_rake");
  });

  it("buildRecipesByOutput filters invalid localStorage draft input quantities", () => {
    const byOutput = buildRecipesByOutput({
      recipes: {},
      draftRecipes: {
        rec_test: {
          item: "bread",
          station: "bakery",
          inputs: { flour: 2, milk: 0, eggs: -1, soup: Number.POSITIVE_INFINITY },
        },
      },
    });

    expect(byOutput.bread[0].inputs).toEqual({ flour: 2 });
  });
});
