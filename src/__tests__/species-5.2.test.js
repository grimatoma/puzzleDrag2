import { describe, it, expect } from "vitest";
import { initialState, rootReducer, mergeLoadedState } from "../state.js";
import { TILE_TYPES } from "../features/tileCollection/data.js";

describe("Phase 5.2 — state.tileCollection slice", () => {
  it("state.tileCollection exists at init", () => {
    const s0 = initialState();
    expect(s0.tileCollection).toBeTruthy();
  });

  it("freeMoves starts at 0", () => {
    const s0 = initialState();
    expect(s0.tileCollection.freeMoves).toBe(0);
  });

  it("default tile types are discovered at init, non-defaults are not", () => {
    const s0 = initialState();
    for (const t of TILE_TYPES) {
      if (t.discovery.method === "default") {
        expect(s0.tileCollection.discovered[t.id]).toBe(true);
      } else {
        expect(s0.tileCollection.discovered[t.id]).toBeFalsy();
      }
    }
  });

  it("activeByCategory: grass=hay, wood=log, berry=berry, bird=egg", () => {
    const s0 = initialState();
    expect(s0.tileCollection.activeByCategory.grass).toBe("grass_hay");
    expect(s0.tileCollection.activeByCategory.wood).toBe("wood_log");
    expect(s0.tileCollection.activeByCategory.berry).toBe("berry");
    expect(s0.tileCollection.activeByCategory.bird).toBe("bird_egg");
    // Grain previously started null because wheat was the only entry and
    // wheat is `chain`-discovered. After REFERENCE_CATALOG canonicalized
    // Corn/Buckwheat/Rice as `default`, grain auto-activates the first one
    // (currently grain_corn).
    expect(s0.tileCollection.activeByCategory.grain).toBe("grain_corn");
  });

  it("researchProgress seeded at 0 for every research-method tile type", () => {
    const s0 = initialState();
    for (const t of TILE_TYPES.filter((t) => t.discovery.method === "research")) {
      expect(typeof s0.tileCollection.researchProgress[t.id]).toBe("number");
      expect(s0.tileCollection.researchProgress[t.id]).toBe(0);
    }
  });

  it("save → load preserves tileCollection slice", () => {
    const s0 = initialState();
    const saved = JSON.parse(JSON.stringify(s0));
    const reload1 = mergeLoadedState(saved);
    expect(JSON.stringify(reload1.tileCollection)).toBe(JSON.stringify(s0.tileCollection));
  });

  it("migration from old save without tileCollection slice fills defaults", () => {
    const s0 = initialState();
    const oldSave = { ...JSON.parse(JSON.stringify(s0)) };
    delete oldSave.tileCollection;
    const migrated = mergeLoadedState(oldSave);
    expect(migrated.tileCollection).toBeTruthy();
    expect(migrated.tileCollection.discovered.grass_hay).toBe(true);
    expect(migrated.tileCollection.activeByCategory.grass).toBe("grass_hay");
    expect(migrated.tileCollection.freeMoves).toBe(0);
  });

  it("migration is idempotent", () => {
    const s0 = initialState();
    const oldSave = { ...JSON.parse(JSON.stringify(s0)) };
    delete oldSave.tileCollection;
    const migrated = mergeLoadedState(oldSave);
    const migrated2 = mergeLoadedState(JSON.parse(JSON.stringify(migrated)));
    expect(JSON.stringify(migrated2.tileCollection)).toBe(JSON.stringify(migrated.tileCollection));
  });

  it("DEV/RESET_GAME resets tileCollection to defaults", () => {
    const s0 = initialState();
    const dirty = {
      ...s0,
      tileCollection: {
        ...s0.tileCollection,
        discovered: { ...s0.tileCollection.discovered, grain_wheat: true, grass_meadow: true },
        freeMoves: 7,
      },
    };
    const reset = rootReducer(dirty, { type: "DEV/RESET_GAME" });
    expect(reset.tileCollection.discovered.grain_wheat).toBeFalsy();
    expect(reset.tileCollection.discovered.grass_meadow).toBeFalsy();
    expect(reset.tileCollection.freeMoves).toBe(0);
  });
});
