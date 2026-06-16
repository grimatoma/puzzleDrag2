import { describe, it, expect } from "vitest";
import {
  fallbackIdleIndex,
  seasonalArtActive,
  paintSeasonalReference,
  SEASONAL_SUBJECT_KEYS,
} from "./seasonalArt.js";

// SEASON_NAMES order: 0 Spring, 1 Summer, 2 Autumn, 3 Winter. Summer (1) is the anchor.
const SPRING = 0, SUMMER = 1, AUTUMN = 2, WINTER = 3;

describe("fallbackIdleIndex — incremental season fallback rule", () => {
  it("summer-only renders the summer anchor for EVERY season (the placeholder phase)", () => {
    const present = [false, true, false, false]; // only idle-summer.png dropped
    expect(fallbackIdleIndex(present, SPRING)).toBe(SUMMER);
    expect(fallbackIdleIndex(present, SUMMER)).toBe(SUMMER);
    expect(fallbackIdleIndex(present, AUTUMN)).toBe(SUMMER);
    expect(fallbackIdleIndex(present, WINTER)).toBe(SUMMER);
  });

  it("uses the exact season once present, falling back to summer for the rest", () => {
    const present = [false, true, true, false]; // summer + autumn authored
    expect(fallbackIdleIndex(present, SPRING)).toBe(SUMMER);
    expect(fallbackIdleIndex(present, SUMMER)).toBe(SUMMER);
    expect(fallbackIdleIndex(present, AUTUMN)).toBe(AUTUMN); // swapped in
    expect(fallbackIdleIndex(present, WINTER)).toBe(SUMMER);
  });

  it("a full set maps each season to itself", () => {
    const present = [true, true, true, true];
    expect(fallbackIdleIndex(present, SPRING)).toBe(SPRING);
    expect(fallbackIdleIndex(present, SUMMER)).toBe(SUMMER);
    expect(fallbackIdleIndex(present, AUTUMN)).toBe(AUTUMN);
    expect(fallbackIdleIndex(present, WINTER)).toBe(WINTER);
  });

  it("with no summer, falls back to the first available season", () => {
    const present = [true, false, false, false]; // only spring (off-spec, but robust)
    expect(fallbackIdleIndex(present, SPRING)).toBe(SPRING);
    expect(fallbackIdleIndex(present, WINTER)).toBe(SPRING);
  });

  it("returns -1 when nothing has decoded", () => {
    expect(fallbackIdleIndex([false, false, false, false], SUMMER)).toBe(-1);
  });
});

describe("subject discovery + inactive guards", () => {
  it("discovers the shipped tile-key folders via the virtual manifest", () => {
    // Wired through the seasonalSubjects() Vite plugin scanning public/seasonal-tiles/.
    expect(SEASONAL_SUBJECT_KEYS.has("tile_tree_willow")).toBe(true);
    expect(SEASONAL_SUBJECT_KEYS.has("tile_bird_chicken")).toBe(true);
    expect(SEASONAL_SUBJECT_KEYS.has("tile_veg_carrot")).toBe(true);
  });

  it("art is inactive (procedural fallback) until sheets decode — no fetch in node", () => {
    expect(seasonalArtActive("tile_tree_willow")).toBe(false);
    expect(seasonalArtActive("tile_does_not_exist")).toBe(false);
  });

  it("paintSeasonalReference reports false for an inactive subject without throwing", () => {
    const calls: string[] = [];
    const ctx = { drawImage: () => calls.push("draw"), imageSmoothingEnabled: false } as unknown as CanvasRenderingContext2D;
    expect(paintSeasonalReference(ctx, "tile_tree_willow")).toBe(false);
    expect(calls).toEqual([]);
  });
});
