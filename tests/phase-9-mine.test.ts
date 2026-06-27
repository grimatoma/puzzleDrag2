// Phase 9 — Mine biome: hazards, expedition food, mysterious ore.
// Migrated from src/__tests__/mine-9.1 through mine-9.6 tests.
import { describe, it, expect } from "vitest";
import { BIOMES, EXPEDITION_FOOD_TURNS, MIN_EXPEDITION_TURNS, MINE_TILE_POOL, UPGRADE_THRESHOLDS } from "../src/constants.js";
import { createInitialState } from "../src/state.js";

describe("Phase 9 — Mine biome resources", () => {
  it("MINE_TILE_POOL is defined and non-empty", () => {
    expect(Array.isArray(MINE_TILE_POOL)).toBe(true);
    expect(MINE_TILE_POOL.length).toBeGreaterThan(0);
  });

  it("BIOMES.mine exists with resources", () => {
    expect(BIOMES.mine).toBeDefined();
    expect(BIOMES.mine.resources.length).toBeGreaterThan(0);
  });

  it("stone upgrade threshold is 8", () => {
    expect(UPGRADE_THRESHOLDS.tile_mine_stone).toBe(8);
  });

  it("iron ore upgrade threshold is 6", () => {
    expect(UPGRADE_THRESHOLDS.tile_mine_iron_ore).toBe(6);
  });

  it("copper ore upgrade threshold is 6", () => {
    expect(UPGRADE_THRESHOLDS.tile_mine_copper_ore).toBe(6);
  });
});

describe("Phase 9 — fresh state mine hazards", () => {
  it("fresh state has hazards object", () => {
    const s = createInitialState();
    expect(s.hazards).toBeDefined();
    expect(typeof s.hazards).toBe("object");
  });

  it("fresh hazards has caveIn and gasVent fields (nullable)", () => {
    const s = createInitialState();
    expect("caveIn" in s.hazards).toBe(true);
    expect("gasVent" in s.hazards).toBe(true);
  });

  it("fresh hazards has rats array", () => {
    const s = createInitialState();
    expect(Array.isArray(s.hazards.rats)).toBe(true);
  });
});

describe("Phase 9 — Expedition food model", () => {
  it("MIN_EXPEDITION_TURNS is defined", () => {
    expect(MIN_EXPEDITION_TURNS).toBeGreaterThan(0);
  });

  it("any food is a ration, scored by processing tier (raw 1 / staple 2 / rich 3 / dense 4)", () => {
    expect(EXPEDITION_FOOD_TURNS.tile_fruit_apple).toBe(1); // raw produce
    expect(EXPEDITION_FOOD_TURNS.bread).toBe(2);            // crafted staple
    expect(EXPEDITION_FOOD_TURNS.cured_meat).toBe(3);       // rich crafted
    expect((EXPEDITION_FOOD_TURNS as Record<string, number>).supplies).toBe(4); // dense ration
  });
});
