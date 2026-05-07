// Phase 9 — Mine biome: hazards, mine entry tiers, mysterious ore.
// Migrated from src/__tests__/mine-9.1 through mine-9.6 tests.
import { describe, it, expect } from "vitest";
import { BIOMES, MINE_TILE_POOL, MINE_ENTRY_TIERS, UPGRADE_THRESHOLDS } from "../src/constants.js";
import { createInitialState, rootReducer } from "../src/state.js";

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
    expect(UPGRADE_THRESHOLDS.stone).toBe(8);
  });

  it("ore upgrade threshold is 6", () => {
    expect(UPGRADE_THRESHOLDS.ore).toBe(6);
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

describe("Phase 9 — Mine entry tiers", () => {
  it("MINE_ENTRY_TIERS is defined with at least 2 tiers", () => {
    expect(Array.isArray(MINE_ENTRY_TIERS)).toBe(true);
    expect(MINE_ENTRY_TIERS.length).toBeGreaterThanOrEqual(2);
  });

  it("has a free tier requiring supplies", () => {
    const free = MINE_ENTRY_TIERS.find(t => t.id === "free");
    expect(free).toBeDefined();
    expect(free.supplies).toBeGreaterThan(0);
  });
});
