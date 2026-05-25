import { describe, it, expect } from "vitest";
import { tickRats } from "../features/farm/rats.js";
import { SPECIES_TAGS, hasTag } from "../features/tileCollection/tags.js";

describe("species tag system", () => {
  it("hasTag: known tagged key returns true", () => {
    expect(hasTag("tile_grain_wheat", "avoids_rats")).toBe(true);
    expect(hasTag("tile_veg_cucumber", "avoids_rats")).toBe(true);
    expect(hasTag("tile_tree_cypress", "deadly_pests")).toBe(true);
  });

  it("hasTag: unknown key returns false", () => {
    expect(hasTag("tile_grass_hay", "avoids_rats")).toBe(false);
    expect(hasTag("no_such_key", "anything")).toBe(false);
  });

  it("hasTag: known key, wrong tag returns false", () => {
    expect(hasTag("tile_grain_wheat", "resistant_swamp")).toBe(false);
  });

  it("SPECIES_TAGS is frozen (read-only catalog)", () => {
    expect(Object.isFrozen(SPECIES_TAGS)).toBe(true);
  });
});

describe("rats avoid tagged adjacent tiles", () => {
  // Helper: build a small grid with one rat target choice.
  const makeGrid = (centerKey) => [
    [{ key: "x" }, { key: centerKey }, { key: "x" }],
    [{ key: "x" }, { key: "x" },     { key: "x" }],
    [{ key: "x" }, { key: "x" },     { key: "x" }],
  ];

  it("rat eats tile_grass_hay if adjacent (no avoids_rats tag)", () => {
    const state = {
      grid: makeGrid("tile_grass_hay"),
      hazards: { rats: [{ row: 1, col: 1, age: 0 }] },
    };
    const r = tickRats(state);
    // Rat at (1,1): adjacent (0,1) is tile_grass_hay → eaten.
    expect(r.grid[0][1].key).toBeNull();
    expect(r.grid[0][1]._eaten).toBe(true);
  });

  it("rat skips tile_grain_wheat (avoids_rats tag) and stays put with no other plants", () => {
    const state = {
      grid: makeGrid("tile_grain_wheat"),
      hazards: { rats: [{ row: 1, col: 1, age: 0 }] },
    };
    const r = tickRats(state);
    // Adjacent tile_grain_wheat is tagged avoids_rats → not eaten.
    expect(r.grid[0][1].key).toBe("tile_grain_wheat");
    // Rat aged regardless.
    expect(r.hazards.rats[0].age).toBe(1);
  });

  it("rat skips tile_veg_cucumber, tile_fruit_coconut, tile_fruit_pear, tile_tree_cypress", () => {
    for (const k of ["tile_veg_cucumber", "tile_fruit_coconut", "tile_fruit_pear", "tile_tree_cypress"]) {
      const state = {
        grid: makeGrid(k),
        hazards: { rats: [{ row: 1, col: 1, age: 0 }] },
      };
      const r = tickRats(state);
      expect(r.grid[0][1].key, `rat ate ${k}`).toBe(k);
    }
  });

  it("rat picks an unprotected plant when adjacent options are mixed", () => {
    // (0,1) wheat (avoided), (1,0) hay (eaten), (1,2) wheat (avoided), (2,1) cucumber (avoided)
    const grid = [
      [{ key: "x" },         { key: "tile_grain_wheat" }, { key: "x" }],
      [{ key: "tile_grass_hay" }, { key: "x" },           { key: "tile_grain_wheat" }],
      [{ key: "x" },         { key: "tile_veg_cucumber" }, { key: "x" }],
    ];
    const state = { grid, hazards: { rats: [{ row: 1, col: 1, age: 0 }] } };
    const r = tickRats(state);
    expect(r.grid[1][0].key).toBeNull(); // hay eaten
    expect(r.grid[0][1].key).toBe("tile_grain_wheat"); // protected
    expect(r.grid[2][1].key).toBe("tile_veg_cucumber"); // protected
  });
});
