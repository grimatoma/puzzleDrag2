import { describe, it, expect } from "vitest";
import { ITEMS } from "../constants.js";
import { CAPPED_TILES, CAPPED_INVENTORY_RESOURCES } from "../constants.js";

describe("CAPPED_TILES / CAPPED_INVENTORY_RESOURCES kind invariants", () => {
  it("every key in CAPPED_TILES has kind:\"tile\"", () => {
    for (const k of CAPPED_TILES) {
      expect(ITEMS[k]?.kind, `${k} should have kind "tile"`).toBe("tile");
    }
  });

  it("every key in CAPPED_INVENTORY_RESOURCES has kind:\"resource\"", () => {
    for (const k of CAPPED_INVENTORY_RESOURCES) {
      expect(ITEMS[k]?.kind, `${k} should have kind "resource"`).toBe("resource");
    }
  });

  it("no key appears in both lists", () => {
    const tileSet = new Set(CAPPED_TILES);
    const overlap = CAPPED_INVENTORY_RESOURCES.filter(k => tileSet.has(k));
    expect(overlap).toEqual([]);
  });
});
