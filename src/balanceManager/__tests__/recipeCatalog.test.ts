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
});
