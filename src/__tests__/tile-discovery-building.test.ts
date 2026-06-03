import { describe, it, expect } from "vitest";
import { patchInventory } from "../testUtils/inventory.js";
import { rootReducer, createInitialState } from "../state.js";
import { BUILDINGS } from "../constants.js";
import {
  discoverTileTypesFromBuilding,
  getTileDetailViewModel,
} from "../features/tileCollection/effects.js";
import { TILE_TYPES, TILE_TYPES_MAP } from "../features/tileCollection/data.js";

describe("own-a-building tile discovery", () => {
  it("Broccoli is gated on owning the Kitchen", () => {
    const broccoli = TILE_TYPES_MAP.tile_veg_broccoli;
    expect(broccoli.discovery.method).toBe("building");
    expect(broccoli.discovery.buildingId).toBe("kitchen");
  });

  it("every building-method tile names a real building", () => {
    const buildingIds = new Set(BUILDINGS.map((b) => b.id));
    for (const t of TILE_TYPES) {
      if (t.discovery?.method !== "building") continue;
      expect(typeof t.discovery.buildingId).toBe("string");
      expect(buildingIds.has(t.discovery.buildingId), `${t.id} → ${t.discovery.buildingId}`).toBe(true);
    }
  });

  it("discoverTileTypesFromBuilding returns matching, not-yet-known tiles", () => {
    const s0 = createInitialState();
    const out = discoverTileTypesFromBuilding(s0, "kitchen");
    expect(out.discoveredIds).toContain("tile_veg_broccoli");
    expect(out.newDiscoveredMap.tile_veg_broccoli).toBe(true);
  });

  it("does not re-fire for already-discovered tiles", () => {
    const s0 = createInitialState();
    const known = { ...s0, tileCollection: { ...s0.tileCollection, discovered: { ...s0.tileCollection.discovered, tile_veg_broccoli: true } } };
    const out = discoverTileTypesFromBuilding(known, "kitchen");
    expect(out.discoveredIds).toEqual([]);
  });

  it("returns nothing for buildings with no gated tiles", () => {
    const s0 = createInitialState();
    expect(discoverTileTypesFromBuilding(s0, "hearth").discoveredIds).toEqual([]);
    expect(discoverTileTypesFromBuilding(s0, "").discoveredIds).toEqual([]);
  });

  it("BUILD on the Kitchen discovers Broccoli end-to-end", () => {
    const def = BUILDINGS.find((b) => b.id === "kitchen");
    const base = createInitialState();
    const stocked = { ...base, ...patchInventory(base, { plank: (def.cost.plank ?? 0) + 10 }), coins: (def.cost.coins ?? 0) + 100 };
    const s0 = {
      ...stocked,
      built: { ...stocked.built, home: { ...(stocked.built.home as object), decorations: {}, _plots: {} } },
    };
    expect(s0.tileCollection.discovered.tile_veg_broccoli).toBeFalsy();
    const s1 = rootReducer(s0, { type: "BUILD", building: def });
    const loc = s1.mapCurrent ?? "home";
    expect(s1.built[loc]?.kitchen).toBe(true);
    expect(s1.tileCollection.discovered.tile_veg_broccoli).toBe(true);
    // First discovery in a category with no active tile auto-activates it.
    expect(s1.tileCollection.activeByCategory.vegetables).toBeTruthy();
  });

  it("detail view model surfaces a build-the-Kitchen action while locked", () => {
    const s0 = createInitialState();
    const vm = getTileDetailViewModel(s0, "tile_veg_broccoli");
    expect(vm?.locked).toBe(true);
    expect(vm?.action).toBe("building");
    expect(vm?.actionLabel).toContain("Kitchen");
    expect(vm?.status).toContain("Kitchen");
  });
});
