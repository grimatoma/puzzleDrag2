import { describe, it, expect } from "vitest";
import { producedResource, buildChainUpdatePayload } from "../game/producedResource.js";
import { ITEMS } from "../constants.js";
import { TILE_TYPES_MAP } from "../features/tileCollection/data.js";

describe("producedResource (chain HUD source)", () => {
  it("returns family default for a vegetable tile", () => {
    const carrot = { key: "tile_veg_carrot" };
    expect(producedResource(carrot)).toBe("soup");
  });

  it("returns family default for an oak tile", () => {
    const oak = { key: "tile_tree_oak" };
    expect(producedResource(oak)).toBe("plank");
  });

  it("returns null for tiles with custom output", () => {
    expect(producedResource({ key: "tile_special_dirt" })).toBeNull();
    expect(producedResource({ key: "tile_special_giant_pearl" })).toBeNull();
  });

  it("returns null for missing/invalid inputs", () => {
    expect(producedResource({ key: "tile_unknown_thing" })).toBeNull();
    expect(producedResource({})).toBeNull();
    expect(producedResource(null)).toBeNull();
    expect(producedResource(undefined)).toBeNull();
  });

  it("returns the per-tile override if specified in effects.producesResource", () => {
    const carrotKey = "tile_veg_carrot";
    // Setup: Temporarily add a custom override to a standard tile
    const originalEffects = TILE_TYPES_MAP[carrotKey].effects;
    TILE_TYPES_MAP[carrotKey].effects = {
      ...originalEffects,
      producesResource: "override_soup_variant"
    };

    try {
      expect(producedResource({ key: carrotKey })).toBe("override_soup_variant");
    } finally {
      // Teardown: Restore the original effects object
      TILE_TYPES_MAP[carrotKey].effects = originalEffects;
    }
  });
});

describe("buildChainUpdatePayload", () => {
  function harness(headTileKey, headTileLabel) {
    return buildChainUpdatePayload({
      path: [{ res: { key: headTileKey, label: headTileLabel } }],
      nextUpgradeTile: () => null,
      effectiveThresholds: undefined,
      effectiveMinChain: 3,
    });
  }

  it("emits the produced RESOURCE key, not the tile key, for a vegetable chain", () => {
    const payload = harness("tile_veg_carrot", "Carrot");
    expect(payload.resourceKey).toBe("soup");
    expect(payload.tileKey).toBe("tile_veg_carrot");
  });

  it("emits the produced resource label, not the tile label", () => {
    const payload = harness("tile_veg_carrot", "Carrot");
    expect(payload.resourceLabel).toBe(ITEMS.soup.label);
    expect(payload.tileLabel).toBe("Carrot");
  });

  it("falls back to the tile key/label for tiles with custom output", () => {
    const payload = harness("tile_special_dirt", "Dirt");
    expect(payload.resourceKey).toBe("tile_special_dirt");
    expect(payload.resourceLabel).toBe("Dirt");
    expect(payload.tileKey).toBe("tile_special_dirt");
    expect(payload.tileLabel).toBe("Dirt");
  });

  it("emits a null head when the path is empty", () => {
    const payload = buildChainUpdatePayload({
      path: [],
      nextUpgradeTile: () => null,
      effectiveThresholds: undefined,
      effectiveMinChain: 3,
    });
    expect(payload.count).toBe(0);
    expect(payload.resourceKey).toBeNull();
    expect(payload.tileKey).toBeNull();
    expect(payload.valid).toBe(true);
  });
});
