import { describe, it, expect } from "vitest";
import { memberTilesFor } from "./memberTiles.js";

describe("memberTilesFor", () => {
  it("lists tiles in a tile category", () => {
    const tiles = memberTilesFor("categories", "grain");
    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles.every((t) => typeof t.key === "string" && typeof t.name === "string")).toBe(true);
    expect(tiles.some((t) => t.key === "tile_grain_wheat")).toBe(true);
  });

  it("lists tiles discovered via a given method", () => {
    const tiles = memberTilesFor("tileDiscoveryMethods", "chain");
    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles.some((t) => t.key === "tile_grain_wheat")).toBe(true);
  });

  it("returns [] for a category with no tile members", () => {
    expect(memberTilesFor("categories", "definitely_not_a_tile_category")).toEqual([]);
  });

  it("returns [] for concepts that don't group tiles", () => {
    expect(memberTilesFor("recipes", "rec_bread")).toEqual([]);
  });

  it("excludes resource-kind TILE_TYPES entries (mine upgrade tiers)", () => {
    // `block` is a kind:"resource" entry that lives in TILE_TYPES under the
    // mine_stone category; it must not surface as a member tile.
    const tiles = memberTilesFor("categories", "mine_stone");
    expect(tiles.some((t) => t.key === "block")).toBe(false);
    expect(tiles.every((t) => t.key.startsWith("tile_"))).toBe(true);
  });
});
