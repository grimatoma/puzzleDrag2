import { describe, it, expect } from "vitest";
import { CONCEPTS } from "./concepts.js";
import { getEntity } from "./conceptEntities.js";

describe("wiki categories — tile type metadata and cat_ icons", () => {
  it("category entries expose registered cat_ icon keys", () => {
    const categories = CONCEPTS.find((c) => c.id === "categories")!.getEntries();
    const grass = categories.find((e) => e.key === "grass");
    expect(grass).toBeDefined();
    expect(grass!.iconKey).toBe("cat_grass");

    const mineStone = categories.find((e) => e.key === "mine_stone");
    expect(mineStone).toBeDefined();
    expect(mineStone!.iconKey).toBe("cat_mine_stone");
  });

  it("all category entries advertise a cat_ icon key", () => {
    const categories = CONCEPTS.find((c) => c.id === "categories")!.getEntries();
    expect(categories.length).toBeGreaterThan(0);
    for (const category of categories) {
      expect(category.iconKey, `missing icon for ${category.key}`).toBe(`cat_${category.key}`);
    }
  });

  it("tile entities merge their tile-collection type metadata", () => {
    const tile = getEntity("tiles", "tile_grass_hay");
    expect(tile).not.toBeNull();
    expect(tile!.category).toBe("grass");
    expect(tile!.tier).toBe(0);
    expect(tile!.discovery).toEqual({ method: "default" });
  });

  it("category entities expose registered cat_ icon keys and sub-category groups", () => {
    const category = getEntity("categories", "grass");
    expect(category).not.toBeNull();
    expect(category!.iconKey).toBe("cat_grass");
    expect(category!.subCategory).toBe("farm");
  });

  it("category entities expose mine/water cat_ icon aliases", () => {
    const mineCategory = getEntity("categories", "mine_stone");
    expect(mineCategory).not.toBeNull();
    expect(mineCategory!.subCategory).toBe("mining");
    expect(mineCategory!.iconKey).toBe("cat_mine_stone");

    const fishCategory = getEntity("categories", "fish");
    expect(fishCategory).not.toBeNull();
    expect(fishCategory!.subCategory).toBe("water");
    expect(fishCategory!.iconKey).toBe("cat_fish");
  });
});
