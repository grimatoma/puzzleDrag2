import { describe, it, expect } from "vitest";
import { discoverTileTypesFromZone } from "../features/tileCollection/effects.js";
import { TILE_TYPES, TILE_TYPES_MAP } from "../features/tileCollection/data.js";
import type { GameState } from "../types/state.js";

// A minimal state stub carrying only the tileCollection slice the resolver reads.
function stateWith(discovered: Record<string, boolean> = {}): GameState {
  return { tileCollection: { discovered, researchProgress: {}, activeByCategory: {}, freeMoves: 0 } } as unknown as GameState;
}

describe("reach-a-zone tile discovery", () => {
  it("returns nothing when no tile is gated on the zone", () => {
    // No tile currently uses method:"zone"; the path is infrastructure that
    // balancing will populate via the Dev Panel. It must no-op cleanly today.
    const out = discoverTileTypesFromZone(stateWith(), "quarry");
    expect(out.discoveredIds).toEqual([]);
  });

  it("ignores an empty zone id", () => {
    expect(discoverTileTypesFromZone(stateWith(), "").discoveredIds).toEqual([]);
  });

  it("discovers a synthetic zone-gated tile and skips already-known ones", () => {
    // Synthesize a zone-gated tile to exercise the matcher without depending on
    // a specific balance assignment. We splice it into the live catalogue, run,
    // then remove it so other suites are unaffected.
    const tiles = TILE_TYPES as unknown as Array<Record<string, unknown>>;
    const map = TILE_TYPES_MAP as unknown as Record<string, unknown>;
    const fake = {
      id: "tile_test_zone_unlock", category: "mounts", displayName: "Test Mount",
      baseResource: "tile_test_zone_unlock", tier: 9,
      discovery: { method: "zone", zoneId: "quarry" }, effects: {},
      description: "test-only",
    };
    tiles.push(fake);
    map[fake.id] = fake;
    try {
      const out = discoverTileTypesFromZone(stateWith(), "quarry");
      expect(out.discoveredIds).toContain("tile_test_zone_unlock");
      expect(out.newDiscoveredMap.tile_test_zone_unlock).toBe(true);

      const known = discoverTileTypesFromZone(stateWith({ tile_test_zone_unlock: true }), "quarry");
      expect(known.discoveredIds).toEqual([]);
    } finally {
      tiles.pop();
      delete map[fake.id];
    }
  });
});
