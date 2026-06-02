import { describe, it, expect } from "vitest";
import { CONCEPTS } from "./concepts.js";
import { getEntity } from "./conceptEntities.js";

describe("wiki categories — tile type metadata and cat_ icons", () => {
  it("category entries expose registered cat_ icon keys", () => {
    const categories = CONCEPTS.find((c) => c.id === "categories")!.getEntries();
    const grass = categories.find((e) => e.key === "grass");
    expect(grass).toBeDefined();
    expect(grass!.iconKey).toBe("cat_grass");
  });

  it("tile entities merge their tile-collection type metadata", () => {
    const tile = getEntity("tiles", "tile_grass_hay");
    expect(tile).not.toBeNull();
    expect(tile!.category).toBe("grass");
    expect(tile!.tier).toBe(0);
    expect(tile!.discovery).toEqual({ method: "default" });
  });

  it("category entities expose their cat_ icon key and sub-category group", () => {
    const category = getEntity("categories", "grass");
    expect(category).not.toBeNull();
    expect(category!.iconKey).toBe("cat_grass");
    expect(category!.subCategory).toBe("farm");
  });
});
