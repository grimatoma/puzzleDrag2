import { describe, it, expect } from "vitest";
import { initialState, rootReducer } from "../state.js";
import { discoverTileTypesFromChain } from "../features/tileCollection/effects.js";
import { UPGRADE_THRESHOLDS } from "../constants.js";

describe("Phase 5.4 — Chain-length discovery", () => {
  const base = initialState();

  it("A: 19 hay (wheat already known) → no discovery, same reference", () => {
    const wheatKnown = {
      ...base,
      tileCollection: { ...base.tileCollection, discovered: { ...base.tileCollection.discovered, wheat: true } },
    };
    const a1 = discoverTileTypesFromChain(wheatKnown, { resourceKey: "hay", chainLength: 19 });
    expect(a1.discoveredIds.length).toBe(0);
    expect(a1.newDiscoveredMap).toBe(wheatKnown.tileCollection.discovered);
  });

  it("B: 20 hay (wheat already known) → discovers meadow_grass", () => {
    const wheatKnown = {
      ...base,
      tileCollection: { ...base.tileCollection, discovered: { ...base.tileCollection.discovered, wheat: true } },
    };
    const b1 = discoverTileTypesFromChain(wheatKnown, { resourceKey: "hay", chainLength: 20 });
    expect(b1.discoveredIds).toContain("meadow_grass");
    expect(b1.discoveredIds.length).toBe(1);
  });

  it("C: fresh state + 20 hay → discovers both wheat AND meadow_grass (tier order)", () => {
    const c1 = discoverTileTypesFromChain(base, { resourceKey: "hay", chainLength: 20 });
    expect(c1.discoveredIds).toContain("wheat");
    expect(c1.discoveredIds).toContain("meadow_grass");
    // wheat (tier 0) before meadow_grass (tier 1)
    expect(c1.discoveredIds[0]).toBe("wheat");
  });

  it("D: exactly UPGRADE_THRESHOLDS.hay hay → wheat only", () => {
    const d1 = discoverTileTypesFromChain(base, { resourceKey: "hay", chainLength: UPGRADE_THRESHOLDS.hay });
    expect(d1.discoveredIds.length).toBe(1);
    expect(d1.discoveredIds[0]).toBe("wheat");
  });

  it("E: second 20-hay chain after discovery → no re-fire", () => {
    const afterDiscovery = rootReducer(base, {
      type: "TILE_DISCOVERED",
      payload: { ids: ["wheat", "meadow_grass"] },
    });
    const e1 = discoverTileTypesFromChain(afterDiscovery, { resourceKey: "hay", chainLength: 20 });
    expect(e1.discoveredIds.length).toBe(0);
  });

  it("F: 20 log → does NOT discover meadow_grass, DOES discover plank", () => {
    const f1 = discoverTileTypesFromChain(base, { resourceKey: "log", chainLength: 20 });
    expect(f1.discoveredIds).not.toContain("meadow_grass");
    expect(f1.discoveredIds).toContain("plank");
  });

  it("G: berry chain at UPGRADE_THRESHOLDS.berry discovers jam", () => {
    expect(UPGRADE_THRESHOLDS.berry).toBeDefined();
    const g1 = discoverTileTypesFromChain(base, { resourceKey: "berry", chainLength: UPGRADE_THRESHOLDS.berry });
    expect(g1.discoveredIds).toContain("jam");
    const g2 = discoverTileTypesFromChain(base, { resourceKey: "berry", chainLength: UPGRADE_THRESHOLDS.berry - 1 });
    expect(g2.discoveredIds).not.toContain("jam");
  });

  it("H: TILE_DISCOVERED reducer is idempotent", () => {
    const afterDiscovery = rootReducer(base, {
      type: "TILE_DISCOVERED",
      payload: { ids: ["wheat", "meadow_grass"] },
    });
    const h1 = rootReducer(afterDiscovery, {
      type: "TILE_DISCOVERED",
      payload: { ids: ["wheat"] },
    });
    expect(h1.tileCollection.discovered.wheat).toBe(true);
    // idempotent: same ref or equivalent
    const same = h1 === afterDiscovery ||
      JSON.stringify(h1.tileCollection) === JSON.stringify(afterDiscovery.tileCollection);
    expect(same).toBe(true);
  });

  it("I: discoverTileTypesFromChain does not mutate state", () => {
    const before = JSON.stringify(base);
    discoverTileTypesFromChain(base, { resourceKey: "hay", chainLength: 20 });
    expect(JSON.stringify(base)).toBe(before);
  });
});
