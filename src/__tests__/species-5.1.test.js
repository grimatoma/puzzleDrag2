import { describe, it, expect } from "vitest";
import { SPECIES, SPECIES_MAP, SPECIES_BY_CATEGORY, CATEGORIES } from "../features/species/data.js";
import { UPGRADE_THRESHOLDS } from "../constants.js";

describe("Phase 5.1 — Species data model", () => {
  it("≥12 species across the 5 farm categories", () => {
    expect(Array.isArray(SPECIES)).toBe(true);
    expect(SPECIES.length).toBeGreaterThanOrEqual(12);
  });

  it("5 farm categories", () => {
    expect(CATEGORIES.length).toBe(5);
    for (const c of ["grass", "grain", "wood", "berry", "bird"]) {
      expect(CATEGORIES).toContain(c);
    }
  });

  it("each category has ≥1 species in SPECIES_BY_CATEGORY", () => {
    for (const c of ["grass", "grain", "wood", "berry", "bird"]) {
      expect(SPECIES_BY_CATEGORY[c]).toBeTruthy();
      expect(SPECIES_BY_CATEGORY[c].length).toBeGreaterThanOrEqual(1);
    }
  });

  it("every entry has required shape and is in SPECIES_MAP", () => {
    for (const s of SPECIES) {
      expect(typeof s.id).toBe("string");
      expect(SPECIES_MAP[s.id]).toBe(s);
      expect(CATEGORIES).toContain(s.category);
      expect(typeof s.baseResource).toBe("string");
      expect(Number.isInteger(s.tier) && s.tier >= 0).toBe(true);
      expect(s.discovery && typeof s.discovery.method).toBe("string");
      expect(["default", "chain", "research", "buy"]).toContain(s.discovery.method);
    }
  });

  it("categories with default species: grass, wood, berry, bird (grain has none — starts null)", () => {
    // Per GAME_SPEC §13 unlock tree, grain category has no default species (all chain/research)
    const withDefault = ["grass", "wood", "berry", "bird"];
    for (const c of withDefault) {
      const defaults = SPECIES_BY_CATEGORY[c].filter((s) => s.discovery.method === "default");
      expect(defaults.length).toBeGreaterThanOrEqual(1);
    }
    // grain has no default — every entry is chain or research
    const grainDefaults = SPECIES_BY_CATEGORY.grain.filter((s) => s.discovery.method === "default");
    expect(grainDefaults.length).toBe(0);
  });

  it("chain-method entries have chainLengthOf and integer chainLength", () => {
    const chainSpecies = SPECIES.filter((s) => s.discovery.method === "chain");
    for (const s of chainSpecies) {
      expect(typeof s.discovery.chainLengthOf).toBe("string");
      expect(Number.isInteger(s.discovery.chainLength) && s.discovery.chainLength >= 1).toBe(true);
    }
  });

  it("research-method entries have researchOf and positive integer researchAmount", () => {
    const researchSpecies = SPECIES.filter((s) => s.discovery.method === "research");
    for (const s of researchSpecies) {
      expect(typeof s.discovery.researchOf).toBe("string");
      expect(Number.isInteger(s.discovery.researchAmount) && s.discovery.researchAmount > 0).toBe(true);
    }
  });

  it("buy-method entries have a positive integer coinCost", () => {
    const buySpecies = SPECIES.filter((s) => s.discovery.method === "buy");
    for (const s of buySpecies) {
      expect(Number.isInteger(s.discovery.coinCost) && s.discovery.coinCost > 0).toBe(true);
    }
  });

  it("wheat chain threshold === UPGRADE_THRESHOLDS.hay (no UPGRADE_EVERY literal)", () => {
    const wheat = SPECIES_MAP.wheat;
    expect(wheat).toBeTruthy();
    expect(wheat.discovery.method).toBe("chain");
    expect(wheat.discovery.chainLength).toBe(UPGRADE_THRESHOLDS.hay);
  });

  it("meadow_grass chains at exactly 20 hay (GAME_SPEC §13)", () => {
    expect(SPECIES_MAP.meadow_grass.discovery.chainLength).toBe(20);
  });

  it("free-move species carry the locked effect values", () => {
    expect(SPECIES_MAP.turkey.effects.freeMoves).toBe(2);
    expect(SPECIES_MAP.clover.effects.freeMoves).toBe(2);
    expect(SPECIES_MAP.melon.effects.freeMoves).toBe(5);
  });
});
