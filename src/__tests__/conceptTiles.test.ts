import { describe, it, expect, vi, afterEach } from "vitest";
import { CONCEPT_TILE_KEYS, CONCEPT_TILE_SPECS, isConceptTileKey } from "../textures/conceptTiles/manifest.js";
import { isConceptTileIconsEnabled } from "../featureFlags.js";

describe("concept tile manifest", () => {
  it("lists exactly seven preview tiles (5 farm + 2 grass)", () => {
    expect(CONCEPT_TILE_KEYS.size).toBe(7);
    expect([...CONCEPT_TILE_KEYS].sort()).toEqual(
      [
        "tile_bird_chicken",
        "tile_fruit_apple",
        "tile_grain_corn",
        "tile_grass_grass",
        "tile_grass_meadow",
        "tile_tree_oak",
        "tile_veg_carrot",
      ].sort(),
    );
  });

  it("maps each key to a gif asset", () => {
    for (const key of CONCEPT_TILE_KEYS) {
      expect(CONCEPT_TILE_SPECS[key]?.gif).toMatch(/\.gif$/);
      expect(isConceptTileKey(key)).toBe(true);
    }
    expect(isConceptTileKey("tile_grass_spiky")).toBe(false);
  });
});

describe("isConceptTileIconsEnabled", () => {
  function stubSearch(search: string) {
    vi.stubGlobal("window", { location: { search } });
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is off by default", () => {
    stubSearch("");
    expect(isConceptTileIconsEnabled()).toBe(false);
  });

  it("enables with ?conceptTiles=1", () => {
    stubSearch("?conceptTiles=1");
    expect(isConceptTileIconsEnabled()).toBe(true);
  });

  it("disables with ?conceptTiles=0", () => {
    stubSearch("?conceptTiles=0");
    expect(isConceptTileIconsEnabled()).toBe(false);
  });
});
