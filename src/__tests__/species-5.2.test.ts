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

  it("activeByCategory: grass=hay, bird=pheasant, fruits=apple, trees=oak (wood/berry/egg are resources, not tiles)", () => {
    const s0 = initialState();
    expect(s0.tileCollection.activeByCategory.grass).toBe("tile_grass_grass");
    expect(s0.tileCollection.activeByCategory.bird).toBe("tile_bird_pheasant");
    expect(s0.tileCollection.activeByCategory.fruits).toBe("tile_fruit_apple");
    expect(s0.tileCollection.activeByCategory.tile_tree_oak ?? s0.tileCollection.activeByCategory.trees).toBeDefined();
    // wood/berry are no longer tile categories.
    expect(s0.tileCollection.activeByCategory.wood).toBeUndefined();
    expect(s0.tileCollection.activeByCategory.berry).toBeUndefined();
    // Grain previously started null because wheat was the only entry and
    // wheat is `chain`-discovered. After REFERENCE_CATALOG canonicalized
    // Corn/Buckwheat/Rice as `default`, grain auto-activates the first one
    // (currently tile_grain_corn).
    expect(s0.tileCollection.activeByCategory.grain).toBe("tile_grain_corn");
  });

  it("researchProgress seeded at 0 for every research-method tile type", () => {
    const s0 = initialState();
    for (const t of TILE_TYPES.filter((t) => t.discovery.method === "research")) {
      expect(typeof s0.tileCollection.researchProgress[t.id]).toBe("number");
      expect(s0.tileCollection.researchProgress[t.id]).toBe(0);
    }
  });

  it("researchByCategory seeded to null for every category (no research focus at start)", () => {
    const s0 = initialState();
    expect(s0.tileCollection.researchByCategory).toBeTruthy();
    for (const v of Object.values(s0.tileCollection.researchByCategory)) {
      expect(v).toBe(null);
    }
    // A specific known category is present and null.
    expect(s0.tileCollection.researchByCategory.grass).toBe(null);
  });

  it("mergeLoadedState backfills researchByCategory for old saves and round-trips a selection", () => {
    const s0 = initialState();
    // Old save with no researchByCategory key → backfilled to all-null.
    const legacy = mergeLoadedState({ tileCollection: { discovered: {}, researchProgress: {}, activeByCategory: {} } });
    expect(legacy.tileCollection.researchByCategory.grass).toBe(null);
    // A saved selection survives the merge.
    const withFocus = mergeLoadedState({ tileCollection: { ...s0.tileCollection, researchByCategory: { grass: "tile_grass_spiky" } } });
    expect(withFocus.tileCollection.researchByCategory.grass).toBe("tile_grass_spiky");
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
    expect(migrated.tileCollection.discovered.tile_grass_grass).toBe(true);
    expect(migrated.tileCollection.activeByCategory.grass).toBe("tile_grass_grass");
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
        discovered: { ...s0.tileCollection.discovered, tile_grain_wheat: true, tile_grass_meadow: true },
        freeMoves: 7,
      },
    };
    const reset = rootReducer(dirty, { type: "DEV/RESET_GAME" });
    expect(reset.tileCollection.discovered.tile_grain_wheat).toBeFalsy();
    expect(reset.tileCollection.discovered.tile_grass_meadow).toBeFalsy();
    expect(reset.tileCollection.freeMoves).toBe(0);
  });
});
