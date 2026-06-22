import { describe, it, expect } from "vitest";
import { acquirableResourceKeys } from "../features/tileCollection/effects.js";
import { BIOMES } from "../constants.js";

// The idle stockpile lists only resources obtainable from this run's board.
// `acquirableResourceKeys` derives that set from the active tile pool, so it
// must include every active category's chain output and exclude resources that
// can't be chained here (crafted goods, disabled categories, other biomes).
describe("acquirableResourceKeys — run-scoped stockpile filter", () => {
  const baseDefaults = {
    grass: "tile_grass_grass", grain: "tile_grain_wheat", bird: "tile_bird_pheasant",
    vegetables: "tile_veg_carrot",
    fruits: "tile_fruit_apple", flowers: "tile_flower_pansy", trees: "tile_tree_oak",
    herd_animals: "tile_herd_pig", cattle: "tile_cattle_cow", mounts: "tile_mount_horse",
  };
  const mkState = (overrides = {}) => ({
    tileCollection: {
      activeByCategory: { ...baseDefaults, ...overrides },
      discovered: {},
      researchProgress: {},
    },
  });

  it("includes every default farm category's chain output", () => {
    const keys = acquirableResourceKeys(mkState(), "farm");
    for (const r of ["hay_bundle", "flour", "eggs", "soup", "pie", "honey", "plank", "meat", "milk", "horseshoe"]) {
      expect(keys.has(r)).toBe(true);
    }
  });

  it("excludes crafted-only goods and produce from other biomes", () => {
    const keys = acquirableResourceKeys(mkState(), "farm");
    // bread/supplies are crafted at buildings; jam needs blackberries (not the
    // active fruit); dirt comes from a mine tile — none are chainable here.
    for (const r of ["bread", "supplies", "jam", "dirt"]) {
      expect(keys.has(r)).toBe(false);
    }
  });

  it("drops a resource when its category is disabled", () => {
    const keys = acquirableResourceKeys(mkState({ bird: null }), "farm");
    expect(keys.has("eggs")).toBe(false);
    expect(keys.has("flour")).toBe(true);
  });

  it("follows the active tile-type variant when picking the output", () => {
    // Activating blackberries makes jam reachable and pie unreachable.
    const keys = acquirableResourceKeys(mkState({ fruits: "tile_fruit_blackberry" }), "farm");
    expect(keys.has("jam")).toBe(true);
    expect(keys.has("pie")).toBe(false);
  });

  it("never lists a key absent from the biome resource roster", () => {
    const roster = new Set((BIOMES.farm.resources ?? []).map((r) => r.key));
    for (const key of acquirableResourceKeys(mkState(), "farm")) {
      expect(roster.has(key)).toBe(true);
    }
  });
});
