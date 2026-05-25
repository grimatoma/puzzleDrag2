// Coverage fillins for src/features/tileCollection/effects.js (88% pre-PR).
// Targets the discoverTileTypesFromChain ordering branch, getActivePool
// pool_weight gating, and the statusFor / getCategoryViewModel branches.

import { describe, it, expect } from "vitest";
import {
  discoverTileTypesFromChain,
  getActivePool,
  getCategoryViewModel,
} from "../features/tileCollection/effects.js";

describe("discoverTileTypesFromChain", () => {
  it("returns same-reference newDiscoveredMap when nothing matches", () => {
    const known = { foo: true };
    const state = { tileCollection: { discovered: known } };
    const r = discoverTileTypesFromChain(state, { resourceKey: "no_such_key", chainLength: 99 });
    expect(r.discoveredIds).toEqual([]);
    expect(r.newDiscoveredMap).toBe(known);
  });

  it("does not re-discover already-known ids", () => {
    // tile_grain_wheat is the chain-method discovery for tile_grass_hay (chainLengthOf).
    const state = {
      tileCollection: { discovered: { tile_grain_wheat: true } },
    };
    const r = discoverTileTypesFromChain(state, { resourceKey: "tile_grass_hay", chainLength: 99 });
    expect(r.discoveredIds).not.toContain("tile_grain_wheat");
  });

  it("requires chainLength >= chainLength threshold", () => {
    // tile_grain_wheat needs chain ≥ 6 of tile_grass_hay
    const state = { tileCollection: { discovered: {} } };
    const lo = discoverTileTypesFromChain(state, { resourceKey: "tile_grass_hay", chainLength: 3 });
    expect(lo.discoveredIds).toEqual([]);

    const hi = discoverTileTypesFromChain(state, { resourceKey: "tile_grass_hay", chainLength: 99 });
    // tile_grass_meadow is also chain-method on tile_grass_hay, with a different chainLength.
    // The order returned is tier ascending then alphabetical.
    expect(hi.discoveredIds).toContain("tile_grain_wheat");
    // newDiscoveredMap is a fresh object (not the same as `known`).
    expect(hi.newDiscoveredMap).not.toBe(state.tileCollection.discovered);
  });

  it("missing tileCollection slice falls back to empty discovered map", () => {
    const state = {}; // no tileCollection
    const r = discoverTileTypesFromChain(state, { resourceKey: "tile_grass_hay", chainLength: 99 });
    // Whatever it discovers, it should not throw.
    expect(Array.isArray(r.discoveredIds)).toBe(true);
  });
});

describe("getActivePool", () => {
  const stateWith = (active = {}, registry = {}) => ({
    tileCollection: { activeByCategory: { grass: "tile_grass_hay", wood: "tile_tree_oak", grain: "tile_grain_wheat", berry: "berry", bird: "tile_bird_pheasant", vegetables: "tile_veg_carrot", fruits: "tile_fruit_apple", flowers: "tile_flower_pansy", trees: "tile_tree_oak", herd_animals: "tile_herd_pig", cattle: "tile_cattle_cow", mounts: "tile_mount_horse", ...active } },
    registry,
  });

  it("returns the base biome pool when no overrides set", () => {
    const pool = getActivePool(stateWith(), "farm");
    // Length is at least the base pool length.
    expect(pool.length).toBeGreaterThan(0);
  });

  it("drops slots whose category is disabled (active=null)", () => {
    const s = stateWith({ grass: null, trees: null });
    const pool = getActivePool(s, "farm");
    expect(pool).not.toContain("tile_grass_hay");
    expect(pool).not.toContain("tile_grass_meadow");
    expect(pool).not.toContain("tile_tree_oak");
  });

  it("worker pool_weight only applies when matching key is active in its category", () => {
    const s = stateWith({ grass: "tile_grass_meadow" }, { effectivePoolWeights: { tile_grass_hay: 3 } });
    const pool = getActivePool(s, "farm");
    // tile_grass_hay isn't active so the boost is dropped.
    expect(pool.filter((k) => k === "tile_grass_hay")).toHaveLength(0);
  });

  it("worker pool_weight applies when matching key IS active", () => {
    const s = stateWith({}, { effectivePoolWeights: { tile_grass_hay: 3 } });
    const pool = getActivePool(s, "farm");
    // 3 extra tile_grass_hay copies show up beyond the base pool count.
    const baseCount = 3; // base FARM_TILE_POOL has 3 tile_grass_hay
    expect(pool.filter((k) => k === "tile_grass_hay").length).toBe(baseCount + 3);
  });

  it("biomeKey unknown returns empty pool", () => {
    expect(getActivePool({}, "no_such_biome")).toEqual([]);
  });
});

describe("getCategoryViewModel", () => {
  it("undiscovered chain-method row shows a 'Locked — chain X' status", () => {
    const state = { tileCollection: { discovered: {} } };
    const rows = getCategoryViewModel(state, "grass");
    const meadow = rows.find((r) => r.id === "tile_grass_meadow");
    expect(meadow.locked).toBe(true);
    expect(meadow.status).toMatch(/Locked — chain/);
    expect(meadow.action).toBeNull();
  });

  it("discovered chain-method row shows 'Discovered — chain X'", () => {
    const state = { tileCollection: { discovered: { tile_grass_meadow: true }, activeByCategory: { grass: "tile_grass_meadow" } } };
    const rows = getCategoryViewModel(state, "grass");
    const meadow = rows.find((r) => r.id === "tile_grass_meadow");
    expect(meadow.locked).toBe(false);
    expect(meadow.active).toBe(true);
    expect(meadow.status).toMatch(/Discovered — chain/);
    expect(meadow.action).toBe("toggle");
  });

  it("research-method undiscovered row shows progress fraction", () => {
    const state = {
      tileCollection: {
        discovered: {},
        researchProgress: { tile_grass_spiky: 7 },
      },
    };
    const rows = getCategoryViewModel(state, "grass");
    const spiky = rows.find((r) => r.id === "tile_grass_spiky");
    expect(spiky.status).toMatch(/Researching .+: 7 \/ 50/);
  });

  it("buy-method undiscovered row shows 'Buy X◉' and action: buy", () => {
    const state = { tileCollection: { discovered: {} } };
    // Clover was reclassified from `bird` to `flowers`; the buy-cost contract is unchanged.
    const rows = getCategoryViewModel(state, "flowers");
    const clover = rows.find((r) => r.id === "tile_bird_clover");
    expect(clover.locked).toBe(true);
    expect(clover.status).toMatch(/Buy \d+/);
    expect(clover.action).toBe("buy");
  });

  it("default-method row always reads 'always available'", () => {
    const state = { tileCollection: { discovered: {} } };
    const rows = getCategoryViewModel(state, "grass");
    const hay = rows.find((r) => r.id === "tile_grass_hay");
    expect(hay.status).toBe("Default — always available");
  });
});
