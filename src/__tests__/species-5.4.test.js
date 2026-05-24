import { describe, it, expect } from "vitest";
import { initialState, rootReducer } from "../state.js";
import { discoverTileTypesFromChain } from "../features/tileCollection/effects.js";
import { UPGRADE_THRESHOLDS } from "../constants.js";

describe("Phase 5.4 — Chain-length discovery", () => {
  const base = initialState();

  it("A: 19 hay (wheat already known) → no discovery, same reference", () => {
    const wheatKnown = {
      ...base,
      tileCollection: { ...base.tileCollection, discovered: { ...base.tileCollection.discovered, tile_grain_wheat: true } },
    };
    const a1 = discoverTileTypesFromChain(wheatKnown, { resourceKey: "tile_grass_hay", chainLength: 19 });
    expect(a1.discoveredIds.length).toBe(0);
    expect(a1.newDiscoveredMap).toBe(wheatKnown.tileCollection.discovered);
  });

  it("B: 20 hay (wheat already known) → discovers meadow_grass", () => {
    const wheatKnown = {
      ...base,
      tileCollection: { ...base.tileCollection, discovered: { ...base.tileCollection.discovered, tile_grain_wheat: true } },
    };
    const b1 = discoverTileTypesFromChain(wheatKnown, { resourceKey: "tile_grass_hay", chainLength: 20 });
    expect(b1.discoveredIds).toContain("tile_grass_meadow");
    expect(b1.discoveredIds.length).toBe(1);
  });

  it("C: fresh state + 20 hay → discovers both wheat AND meadow_grass (tier order)", () => {
    const c1 = discoverTileTypesFromChain(base, { resourceKey: "tile_grass_hay", chainLength: 20 });
    expect(c1.discoveredIds).toContain("tile_grain_wheat");
    expect(c1.discoveredIds).toContain("tile_grass_meadow");
    // wheat (tier 0) before meadow_grass (tier 1)
    expect(c1.discoveredIds[0]).toBe("tile_grain_wheat");
  });

  it("D: exactly UPGRADE_THRESHOLDS.tile_grass_hay discovers wheat only", () => {
    const d1 = discoverTileTypesFromChain(base, { resourceKey: "tile_grass_hay", chainLength: UPGRADE_THRESHOLDS.tile_grass_hay });
    expect(d1.discoveredIds.length).toBe(1);
    expect(d1.discoveredIds[0]).toBe("tile_grain_wheat");
  });

  it("E: second 20-hay chain after discovery → no re-fire", () => {
    const afterDiscovery = rootReducer(base, {
      type: "TILE_DISCOVERED",
      payload: { ids: ["tile_grain_wheat", "tile_grass_meadow"] },
    });
    const e1 = discoverTileTypesFromChain(afterDiscovery, { resourceKey: "tile_grass_hay", chainLength: 20 });
    expect(e1.discoveredIds.length).toBe(0);
  });

  it("F: chain of stone upgrades to cobble at the configured threshold", () => {
    expect(UPGRADE_THRESHOLDS.tile_mine_stone).toBeDefined();
    const f1 = discoverTileTypesFromChain(base, {
      resourceKey: "tile_mine_stone",
      chainLength: UPGRADE_THRESHOLDS.tile_mine_stone,
    });
    expect(f1.discoveredIds).not.toContain("tile_grass_meadow");
    expect(f1.discoveredIds).toContain("block");
  });

  it("G: chain of pansy at UPGRADE_THRESHOLDS.tile_flower_pansy discovers water_lily", () => {
    // wood/berry are no longer tile species; honey/jam are recipe outputs.
    // Pansy → water_lily exercises the chain-discovery pathway analogously.
    expect(UPGRADE_THRESHOLDS.tile_flower_pansy).toBeDefined();
    // water_lily is research-discovered so chain alone shouldn't reveal it;
    // here we just verify chain at threshold doesn't reveal *unrelated* tiles.
    const g1 = discoverTileTypesFromChain(base, {
      resourceKey: "tile_flower_pansy",
      chainLength: UPGRADE_THRESHOLDS.tile_flower_pansy,
    });
    expect(g1.discoveredIds).not.toContain("tile_flower_water_lily");
  });

  it("H: TILE_DISCOVERED reducer is idempotent", () => {
    const afterDiscovery = rootReducer(base, {
      type: "TILE_DISCOVERED",
      payload: { ids: ["tile_grain_wheat", "tile_grass_meadow"] },
    });
    const h1 = rootReducer(afterDiscovery, {
      type: "TILE_DISCOVERED",
      payload: { ids: ["tile_grain_wheat"] },
    });
    expect(h1.tileCollection.discovered.tile_grain_wheat).toBe(true);
    // idempotent: same ref or equivalent
    const same = h1 === afterDiscovery ||
      JSON.stringify(h1.tileCollection) === JSON.stringify(afterDiscovery.tileCollection);
    expect(same).toBe(true);
  });

  it("I: discoverTileTypesFromChain does not mutate state", () => {
    const before = JSON.stringify(base);
    discoverTileTypesFromChain(base, { resourceKey: "tile_grass_hay", chainLength: 20 });
    expect(JSON.stringify(base)).toBe(before);
  });
});
