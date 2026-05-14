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
    expect(UPGRADE_THRESHOLDS.mine_stone).toBe(8);
  });

  it("ore upgrade threshold is 6", () => {
    expect(UPGRADE_THRESHOLDS.mine_ore).toBe(6);
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

  it("supplies remain a one-turn ration for expeditions", () => {
    expect(EXPEDITION_FOOD_TURNS.supplies).toBe(1);
  });
});
