import { describe, it, expect } from "vitest";
import { getActivePool } from "../features/tileCollection/effects.js";
import { BIOMES } from "../constants.js";

describe("Phase 5.6 — Board pool wiring", () => {
  const baseDefaults = {
    grass: "tile_grass_grass", grain: "tile_grain_wheat", bird: "tile_bird_pheasant",
    vegetables: "tile_veg_carrot",
    fruits: "tile_fruit_apple", flowers: "tile_flower_pansy", trees: "tile_tree_oak",
    herd_animals: "tile_herd_pig", cattle: "tile_cattle_cow", mounts: "tile_mount_horse",
  };
  const mkState = (overrides = {}, weights = {}) => ({
    tileCollection: {
      activeByCategory: { ...baseDefaults, ...overrides },
      discovered: {
        tile_grass_grass: true, tile_grain_wheat: true, tile_bird_pheasant: true,
        grain: true, tile_bird_turkey: true,
        tile_grass_meadow: true, tile_grass_spiky: true, flour: true,
        tile_veg_carrot: true, tile_veg_eggplant: true, tile_veg_turnip: true, tile_veg_cucumber: true,
        tile_fruit_apple: true, tile_flower_pansy: true, tile_tree_oak: true,
        tile_herd_pig: true, tile_cattle_cow: true, tile_mount_horse: true,
      },
      researchProgress: {},
    },
    registry: { effectivePoolWeights: weights },
  });

  it("A: defaults reproduce Phase 1 base pool exactly", () => {
    const r0 = getActivePool(mkState(), "farm");
    expect(r0.join(",")).toBe(BIOMES.farm.pool.join(","));
  });

  it("B: swap wheat for grain in grain category", () => {
    const r1 = getActivePool(mkState({ grain: "grain" }), "farm");
    expect(r1.filter((k) => k === "tile_grain_wheat").length).toBe(0);
    expect(r1.filter((k) => k === "grain").length).toBe(1);
  });

  it("C: setting a category to null removes that category's resource", () => {
    const r2 = getActivePool(mkState({ bird: null }), "farm");
    expect(r2.filter((k) => k === "tile_bird_pheasant").length).toBe(0);
    expect(r2.filter((k) => k === "tile_grass_grass").length).toBe(3);
  });

  it("D: worker pool_weight stacks when key is the active tile type", () => {
    const r3 = getActivePool(mkState({}, { tile_tree_oak: 2 }), "farm");
    // base 1 (single tree slot) + worker 2 = 3
    expect(r3.filter((k) => k === "tile_tree_oak").length).toBe(3);
  });

  it("E: LOCKED — worker pool_weight does NOT add tiles when tile type is null", () => {
    const r4 = getActivePool(mkState({ trees: null }, { tile_tree_oak: 2 }), "farm");
    expect(r4.filter((k) => k === "tile_tree_oak").length).toBe(0);
  });

  it("F: turkey weight ignored when egg is active bird, applied when turkey is active bird", () => {
    const r5a = getActivePool(mkState({ bird: "eggs" }, { tile_bird_turkey: 3 }), "farm");
    expect(r5a.filter((k) => k === "tile_bird_turkey").length).toBe(0);

    const r5b = getActivePool(mkState({ bird: "tile_bird_turkey" }, { tile_bird_turkey: 3 }), "farm");
    // tile_bird_turkey: 1 base copy in pool (from egg slot replaced by turkey) + 3 boost = 4
    expect(r5b.filter((k) => k === "tile_bird_turkey").length).toBe(4);
  });

  it("G: getActivePool does not mutate state", () => {
    const st = mkState();
    const before = JSON.stringify(st);
    getActivePool(st, "farm");
    expect(JSON.stringify(st)).toBe(before);
  });
});
