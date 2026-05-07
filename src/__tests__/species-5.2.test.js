import { describe, it, expect } from "vitest";
import { initialState, rootReducer, mergeLoadedState } from "../state.js";
import { SPECIES } from "../features/species/data.js";

describe("Phase 5.2 — state.species slice", () => {
  it("state.species exists at init", () => {
    const s0 = initialState();
    expect(s0.species).toBeTruthy();
  });

  it("freeMoves starts at 0", () => {
    const s0 = initialState();
    expect(s0.species.freeMoves).toBe(0);
  });

  it("default species are discovered at init, non-defaults are not", () => {
    const s0 = initialState();
    for (const sp of SPECIES) {
      if (sp.discovery.method === "default") {
        expect(s0.species.discovered[sp.id]).toBe(true);
      } else {
        expect(s0.species.discovered[sp.id]).toBeFalsy();
      }
    }
  });

  it("activeByCategory: grass=hay, wood=log, berry=berry, bird=egg, grain=null", () => {
    const s0 = initialState();
    expect(s0.species.activeByCategory.grass).toBe("hay");
    expect(s0.species.activeByCategory.wood).toBe("log");
    expect(s0.species.activeByCategory.berry).toBe("berry");
    expect(s0.species.activeByCategory.bird).toBe("egg");
    expect(s0.species.activeByCategory.grain).toBeNull();
  });

  it("researchProgress seeded at 0 for every research-method species", () => {
    const s0 = initialState();
    for (const sp of SPECIES.filter((s) => s.discovery.method === "research")) {
      expect(typeof s0.species.researchProgress[sp.id]).toBe("number");
      expect(s0.species.researchProgress[sp.id]).toBe(0);
    }
  });

  it("save → load preserves species slice", () => {
    const s0 = initialState();
    const saved = JSON.parse(JSON.stringify(s0));
    const reload1 = mergeLoadedState(saved);
    expect(JSON.stringify(reload1.species)).toBe(JSON.stringify(s0.species));
  });

  it("migration from old save without species slice fills defaults", () => {
    const s0 = initialState();
    const oldSave = { ...JSON.parse(JSON.stringify(s0)) };
    delete oldSave.species;
    const migrated = mergeLoadedState(oldSave);
    expect(migrated.species).toBeTruthy();
    expect(migrated.species.discovered.hay).toBe(true);
    expect(migrated.species.activeByCategory.grass).toBe("hay");
    expect(migrated.species.freeMoves).toBe(0);
  });

  it("migration is idempotent", () => {
    const s0 = initialState();
    const oldSave = { ...JSON.parse(JSON.stringify(s0)) };
    delete oldSave.species;
    const migrated = mergeLoadedState(oldSave);
    const migrated2 = mergeLoadedState(JSON.parse(JSON.stringify(migrated)));
    expect(JSON.stringify(migrated2.species)).toBe(JSON.stringify(migrated.species));
  });

  it("DEV/RESET_GAME resets species to defaults", () => {
    const s0 = initialState();
    const dirty = {
      ...s0,
      species: {
        ...s0.species,
        discovered: { ...s0.species.discovered, wheat: true, meadow_grass: true },
        freeMoves: 7,
      },
    };
    const reset = rootReducer(dirty, { type: "DEV/RESET_GAME" });
    expect(reset.species.discovered.wheat).toBeFalsy();
    expect(reset.species.discovered.meadow_grass).toBeFalsy();
    expect(reset.species.freeMoves).toBe(0);
  });
});
