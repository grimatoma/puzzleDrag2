import { describe, it, expect } from "vitest";
import { getActivePool } from "../features/tileCollection/effects.js";
import { BIOMES } from "../constants.js";

describe("Phase 5.6 — Board pool wiring", () => {
  const baseDefaults = {
    grass: "grass_hay", grain: "grain_wheat", bird: "bird_pheasant",
    vegetables: "veg_carrot",
    fruits: "fruit_apple", flowers: "flower_pansy", trees: "tree_oak",
    herd_animals: "herd_pig", cattle: "cattle_cow", mounts: "mount_horse",
  };
  const mkState = (overrides = {}, weights = {}) => ({
    tileCollection: {
      activeByCategory: { ...baseDefaults, ...overrides },
      discovered: {
        grass_hay: true, grain_wheat: true, bird_pheasant: true,
        grain: true, bird_turkey: true,
        grass_meadow: true, grass_spiky: true, grain_flour: true,
        veg_carrot: true, veg_eggplant: true, veg_turnip: true, veg_cucumber: true,
        fruit_apple: true, flower_pansy: true, tree_oak: true,
        herd_pig: true, cattle_cow: true, mount_horse: true,
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
    expect(r1.filter((k) => k === "grain_wheat").length).toBe(0);
    expect(r1.filter((k) => k === "grain").length).toBe(1);
  });

  it("C: setting a category to null removes that category's resource", () => {
    const r2 = getActivePool(mkState({ bird: null }), "farm");
    expect(r2.filter((k) => k === "bird_pheasant").length).toBe(0);
    expect(r2.filter((k) => k === "grass_hay").length).toBe(3);
  });

  it("D: worker pool_weight stacks when key is the active tile type", () => {
    const r3 = getActivePool(mkState({}, { tree_oak: 2 }), "farm");
    // base 1 (single tree slot) + worker 2 = 3
    expect(r3.filter((k) => k === "tree_oak").length).toBe(3);
  });

  it("E: LOCKED — worker pool_weight does NOT add tiles when tile type is null", () => {
    const r4 = getActivePool(mkState({ trees: null }, { tree_oak: 2 }), "farm");
    expect(r4.filter((k) => k === "tree_oak").length).toBe(0);
  });

  it("F: turkey weight ignored when egg is active bird, applied when turkey is active bird", () => {
    const r5a = getActivePool(mkState({ bird: "bird_egg" }, { bird_turkey: 3 }), "farm");
    expect(r5a.filter((k) => k === "bird_turkey").length).toBe(0);

    const r5b = getActivePool(mkState({ bird: "bird_turkey" }, { bird_turkey: 3 }), "farm");
    // bird_turkey: 1 base copy in pool (from egg slot replaced by turkey) + 3 boost = 4
    expect(r5b.filter((k) => k === "bird_turkey").length).toBe(4);
  });

  it("G: getActivePool does not mutate state", () => {
    const st = mkState();
    const before = JSON.stringify(st);
    getActivePool(st, "farm");
    expect(JSON.stringify(st)).toBe(before);
  });
});
