import { describe, it, expect } from "vitest";
import { TILE_TYPES, TILE_TYPES_MAP, TILE_TYPES_BY_CATEGORY, CATEGORIES } from "../features/tileCollection/data.js";
import { UPGRADE_THRESHOLDS } from "../constants.js";

describe("Phase 5.1 — Tile Collection data model", () => {
  it("≥12 tile types across the 6 farm categories", () => {
    expect(Array.isArray(TILE_TYPES)).toBe(true);
    expect(TILE_TYPES.length).toBeGreaterThanOrEqual(12);
  });

  it("6 farm categories", () => {
    expect(CATEGORIES.length).toBe(6);
    for (const c of ["grass", "grain", "wood", "berry", "bird", "vegetables"]) {
      expect(CATEGORIES).toContain(c);
    }
  });

  it("each category has ≥1 tile type in TILE_TYPES_BY_CATEGORY", () => {
    for (const c of ["grass", "grain", "wood", "berry", "bird", "vegetables"]) {
      expect(TILE_TYPES_BY_CATEGORY[c]).toBeTruthy();
      expect(TILE_TYPES_BY_CATEGORY[c].length).toBeGreaterThanOrEqual(1);
    }
  });

  it("every entry has required shape and is in TILE_TYPES_MAP", () => {
    for (const t of TILE_TYPES) {
      expect(typeof t.id).toBe("string");
      expect(TILE_TYPES_MAP[t.id]).toBe(t);
      expect(CATEGORIES).toContain(t.category);
      expect(typeof t.baseResource).toBe("string");
      expect(Number.isInteger(t.tier) && t.tier >= 0).toBe(true);
      expect(t.discovery && typeof t.discovery.method).toBe("string");
      expect(["default", "chain", "research", "buy"]).toContain(t.discovery.method);
    }
  });

  it("categories with default tile types: grass, wood, berry, bird, vegetables (grain has none — starts null)", () => {
    // Per GAME_SPEC §13 unlock tree, grain category has no default tile type (all chain/research)
    const withDefault = ["grass", "wood", "berry", "bird", "vegetables"];
    for (const c of withDefault) {
      const defaults = TILE_TYPES_BY_CATEGORY[c].filter((t) => t.discovery.method === "default");
      expect(defaults.length).toBeGreaterThanOrEqual(1);
    }
    // grain has no default — every entry is chain or research
    const grainDefaults = TILE_TYPES_BY_CATEGORY.grain.filter((t) => t.discovery.method === "default");
    expect(grainDefaults.length).toBe(0);
  });

  it("chain-method entries have chainLengthOf and integer chainLength", () => {
    const chainTypes = TILE_TYPES.filter((t) => t.discovery.method === "chain");
    for (const t of chainTypes) {
      expect(typeof t.discovery.chainLengthOf).toBe("string");
      expect(Number.isInteger(t.discovery.chainLength) && t.discovery.chainLength >= 1).toBe(true);
    }
  });

  it("research-method entries have researchOf and positive integer researchAmount", () => {
    const researchTypes = TILE_TYPES.filter((t) => t.discovery.method === "research");
    for (const t of researchTypes) {
      expect(typeof t.discovery.researchOf).toBe("string");
      expect(Number.isInteger(t.discovery.researchAmount) && t.discovery.researchAmount > 0).toBe(true);
    }
  });

  it("buy-method entries have a positive integer coinCost", () => {
    const buyTypes = TILE_TYPES.filter((t) => t.discovery.method === "buy");
    for (const t of buyTypes) {
      expect(Number.isInteger(t.discovery.coinCost) && t.discovery.coinCost > 0).toBe(true);
    }
  });

  it("wheat chain threshold === UPGRADE_THRESHOLDS.hay (no UPGRADE_EVERY literal)", () => {
    const wheat = TILE_TYPES_MAP.wheat;
    expect(wheat).toBeTruthy();
    expect(wheat.discovery.method).toBe("chain");
    expect(wheat.discovery.chainLength).toBe(UPGRADE_THRESHOLDS.hay);
  });

  it("meadow_grass chains at exactly 20 hay (GAME_SPEC §13)", () => {
    expect(TILE_TYPES_MAP.meadow_grass.discovery.chainLength).toBe(20);
  });

  it("free-move tile types carry the locked effect values", () => {
    expect(TILE_TYPES_MAP.turkey.effects.freeMoves).toBe(2);
    expect(TILE_TYPES_MAP.clover.effects.freeMoves).toBe(2);
    expect(TILE_TYPES_MAP.melon.effects.freeMoves).toBe(5);
  });
});
