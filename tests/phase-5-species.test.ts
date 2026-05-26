// Phase 5 — Species discovery system.
// Migrated from species-5.1 through species-5.8 tests.
import { describe, it, expect } from "vitest";
import { TILE_TYPES as SPECIES, TILE_TYPES_MAP as SPECIES_MAP, CATEGORIES } from "../src/features/tileCollection/data.js";
import { createInitialState, rootReducer } from "../src/state.js";

describe("Phase 5 — species data model", () => {
  it("SPECIES array is non-empty", () => expect(SPECIES.length).toBeGreaterThan(0));

  it("every species has required fields", () => {
    for (const s of SPECIES) {
      expect(typeof s.id).toBe("string");
      expect(typeof s.category).toBe("string");
      expect(CATEGORIES.includes(s.category), `${s.id} has unknown category ${s.category}`).toBe(true);
      expect(s.discovery).toBeDefined();
    }
  });

  it("SPECIES_MAP has an entry for each species", () => {
    for (const s of SPECIES) {
      expect(SPECIES_MAP[s.id]).toBe(s);
    }
  });
});

describe("Phase 5 — fresh state species slice", () => {
  it("fresh state has species.discovered object", () => {
    const s = createInitialState();
    expect(typeof s.tileCollection.discovered).toBe("object");
  });

  it("fresh state has activeByCategory for all categories", () => {
    const s = createInitialState();
    for (const c of CATEGORIES) {
      expect(c in s.tileCollection.activeByCategory).toBe(true);
    }
  });

  it("default species are discovered on init", () => {
    const s = createInitialState();
    const defaultSpecies = SPECIES.filter(sp => sp.discovery.method === "default");
    expect(defaultSpecies.length).toBeGreaterThan(0);
    for (const sp of defaultSpecies) {
      expect(s.tileCollection.discovered[sp.id]).toBe(true);
    }
  });
});

describe("Phase 5 — SPECIES_DISCOVERED action", () => {
  it("discovers a new species", () => {
    const s = createInitialState();
    const researchSpecies = SPECIES.find(sp => sp.discovery.method === "research");
    if (!researchSpecies) return; // skip if none
    const next = rootReducer(s, {
      type: "TILE_DISCOVERED",
      payload: { ids: [researchSpecies.id] },
    });
    expect(next.tileCollection.discovered[researchSpecies.id]).toBe(true);
  });

  it("is idempotent for already-discovered species", () => {
    const s = createInitialState();
    const defaultSpecies = SPECIES.find(sp => sp.discovery.method === "default");
    const next = rootReducer(s, {
      type: "TILE_DISCOVERED",
      payload: { ids: [defaultSpecies.id] },
    });
    expect(next).toBe(s); // no change — already discovered
  });
});
