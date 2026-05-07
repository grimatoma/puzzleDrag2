import { describe, it, expect } from "vitest";
import { getActivePool } from "../features/tileCollection/effects.js";
import { BIOMES } from "../constants.js";

describe("Phase 5.6 — Board pool wiring", () => {
  const baseDefaults = {
    grass: "hay", grain: "wheat", wood: "log", berry: "berry", bird: "egg",
    vegetables: "carrot",
    fruits: "fruit_apple", flowers: "flower_pansy", trees: "tree_oak",
    herd_animals: "herd_pig", cattle: "cattle_cow", mounts: "mount_horse",
  };
  const mkState = (overrides = {}, weights = {}) => ({
    tileCollection: {
      activeByCategory: { ...baseDefaults, ...overrides },
      discovered: {
        hay: true, wheat: true, log: true, berry: true, egg: true,
        grain: true, plank: true, jam: true, turkey: true,
        meadow_grass: true, beam: true, spiky_grass: true, flour: true,
        carrot: true, eggplant: true, turnip: true, cucumber: true,
        fruit_apple: true, flower_pansy: true, tree_oak: true,
        herd_pig: true, cattle_cow: true, mount_horse: true,
      },
      researchProgress: {},
    },
    workers: { hired: {}, debt: 0 },
    registry: { effectivePoolWeights: weights },
  });

  it("A: defaults reproduce Phase 1 base pool exactly", () => {
    const r0 = getActivePool(mkState(), "farm");
    expect(r0.join(",")).toBe(BIOMES.farm.pool.join(","));
  });

  it("B: swap wheat for grain in grain category", () => {
    const r1 = getActivePool(mkState({ grain: "grain" }), "farm");
    expect(r1.filter((k) => k === "wheat").length).toBe(0);
    expect(r1.filter((k) => k === "grain").length).toBe(1);
  });

  it("C: setting a category to null removes that category's resource", () => {
    const r2 = getActivePool(mkState({ bird: null }), "farm");
    expect(r2.filter((k) => k === "egg").length).toBe(0);
    expect(r2.filter((k) => k === "hay").length).toBe(3);
  });

  it("D: worker pool_weight stacks when key is the active tile type", () => {
    const r3 = getActivePool(mkState({}, { berry: 2 }), "farm");
    // base 2 + worker 2 = 4
    expect(r3.filter((k) => k === "berry").length).toBe(4);
  });

  it("E: LOCKED — worker pool_weight does NOT add tiles when tile type is null", () => {
    const r4 = getActivePool(mkState({ berry: null }, { berry: 2 }), "farm");
    expect(r4.filter((k) => k === "berry").length).toBe(0);
  });

  it("F: turkey weight ignored when egg is active bird, applied when turkey is active bird", () => {
    const r5a = getActivePool(mkState({ bird: "egg" }, { turkey: 3 }), "farm");
    expect(r5a.filter((k) => k === "turkey").length).toBe(0);

    const r5b = getActivePool(mkState({ bird: "turkey" }, { turkey: 3 }), "farm");
    // turkey: 1 base copy in pool (from egg slot replaced by turkey) + 3 boost = 4
    expect(r5b.filter((k) => k === "turkey").length).toBe(4);
  });

  it("G: getActivePool does not mutate state", () => {
    const st = mkState();
    const before = JSON.stringify(st);
    getActivePool(st, "farm");
    expect(JSON.stringify(st)).toBe(before);
  });
});
