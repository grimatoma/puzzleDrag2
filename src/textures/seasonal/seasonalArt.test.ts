import { describe, it, expect, afterEach } from "vitest";
import {
  fallbackIdleIndex,
  seasonalArtActive,
  seasonalBakedActive,
  paintSeasonalReference,
  advanceTransition,
  type TransState,
  SEASONAL_SUBJECT_KEYS,
  isPixelSpriteOverride,
  setPixelSpriteOverride,
  isPotentialBakedSubject,
  onPixelSpriteOverrideChange,
  SEASONAL_FOLDER_KEYS,
  hasSeasonalArtFolder,
  seasonalTransFrameCount,
  seasonalGestureFrameCount,
  seasonalMaxGestureFrames,
  seasonalHasGesture,
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
    // Keys claimed by the all-vector showcase set (VECTOR_PREFER_KEYS) are filtered
    // OUT of the baked manifest, so the discovered set is the baked-only remainder.
    // tile_special_dirt ships a PNG folder and has NO vector art, so it stays in
    // the baked-only discovered set.
    expect(SEASONAL_SUBJECT_KEYS.has("tile_special_dirt")).toBe(true);
    // ...and vector-preferred keys that ALSO ship a PNG folder (willow, plus the
    // roster-completing mine tiles stone/coal now claimed by the vector set) are
    // filtered OUT of the baked manifest:
    expect(SEASONAL_SUBJECT_KEYS.has("tile_tree_willow")).toBe(false);
    expect(SEASONAL_SUBJECT_KEYS.has("tile_mine_stone")).toBe(false);
    expect(SEASONAL_SUBJECT_KEYS.has("tile_mine_coal")).toBe(false);
  });

  it("art is inactive (procedural fallback) until sheets decode — no fetch in node", () => {
    expect(seasonalArtActive("tile_mine_stone")).toBe(false);
    expect(seasonalArtActive("tile_does_not_exist")).toBe(false);
  });

  it("paintSeasonalReference reports false for an inactive subject without throwing", () => {
    const calls: string[] = [];
    const ctx = { drawImage: () => calls.push("draw"), imageSmoothingEnabled: false } as unknown as CanvasRenderingContext2D;
    expect(paintSeasonalReference(ctx, "tile_mine_stone")).toBe(false);
    expect(calls).toEqual([]);
  });
});

describe("seasonal folder set (wiki Pixel-art toggle)", () => {
  it("SEASONAL_FOLDER_KEYS includes the vector-preferred showcase keys that the baked set excludes", () => {
    // The wiki "Pixel art" toggle can show a baked sprite for ANY key with a folder,
    // including the vector-preferred showcase tiles filtered out of SEASONAL_SUBJECT_KEYS.
    expect(SEASONAL_FOLDER_KEYS.has("tile_tree_willow")).toBe(true);
    expect(SEASONAL_SUBJECT_KEYS.has("tile_tree_willow")).toBe(false);
    // The baked-only subjects are still a subset of the full folder set.
    for (const key of SEASONAL_SUBJECT_KEYS) {
      expect(SEASONAL_FOLDER_KEYS.has(key)).toBe(true);
    }
  });

  it("hasSeasonalArtFolder matches the folder set and rejects unknown keys", () => {
    expect(hasSeasonalArtFolder("tile_tree_willow")).toBe(true);
    expect(hasSeasonalArtFolder("tile_mine_stone")).toBe(true);
    expect(hasSeasonalArtFolder("tile_does_not_exist")).toBe(false);
  });

  it("seasonalTransFrameCount is 0 for inactive / unknown subjects (no sheets decoded in node)", () => {
    expect(seasonalTransFrameCount("tile_mine_stone", 0)).toBe(0);
    expect(seasonalTransFrameCount("tile_does_not_exist", 1)).toBe(0);
  });
});

describe("special-gesture clip accessors", () => {
  // The gesture clip reuses the Summer-anchor fallback (resolveGesture → fallbackIdleIndex,
  // tested above). With no fetch/createImageBitmap in node, no sheets decode, so every
  // accessor reports the empty/absent state — and a subject with no gesture art behaves
  // exactly like today.
  it("report 0 / false for inactive and unknown subjects", () => {
    expect(seasonalGestureFrameCount("tile_special_dirt", "Summer")).toBe(0);
    expect(seasonalGestureFrameCount("tile_does_not_exist", null)).toBe(0);
    expect(seasonalMaxGestureFrames("tile_special_dirt")).toBe(0);
    expect(seasonalMaxGestureFrames("tile_does_not_exist")).toBe(0);
    expect(seasonalHasGesture("tile_special_dirt")).toBe(false);
    expect(seasonalHasGesture("tile_does_not_exist")).toBe(false);
  });
});

describe("pixel-sprite override", () => {
  afterEach(async () => { await setPixelSpriteOverride(false); });

  it("defaults to off", () => {
    expect(isPixelSpriteOverride()).toBe(false);
  });

  it("flips on/off and notifies subscribers (both directions)", async () => {
    const calls: boolean[] = [];
    const unsub = onPixelSpriteOverrideChange(() => calls.push(isPixelSpriteOverride()));
    await setPixelSpriteOverride(true);
    expect(isPixelSpriteOverride()).toBe(true);
    await setPixelSpriteOverride(true); // no-op — already on
    await setPixelSpriteOverride(false);
    expect(isPixelSpriteOverride()).toBe(false);
    unsub();
    expect(calls).toEqual([true, false]);
  });

  it("a vector-preferred key only counts as a potential baked subject while the override is on", async () => {
    expect(SEASONAL_SUBJECT_KEYS.has("tile_tree_willow")).toBe(false);
    expect(isPotentialBakedSubject("tile_tree_willow")).toBe(false);
    await setPixelSpriteOverride(true);
    expect(isPotentialBakedSubject("tile_tree_willow")).toBe(true);
  });

  it("seasonalBakedActive stays false for unloaded art regardless of the override (no fetch in node)", async () => {
    expect(seasonalBakedActive("tile_tree_willow")).toBe(false);
    expect(seasonalArtActive("tile_tree_willow")).toBe(false);
    await setPixelSpriteOverride(true);
    expect(seasonalBakedActive("tile_tree_willow")).toBe(false);
  });
});

describe("advanceTransition — season transition state machine", () => {
  const idle = (curIdx: number): TransState => ({ curIdx, mode: "idle", transTo: 0, transStart: 0 });
  const hasAll = () => true;
  const frames8 = () => 8; // 8-frame transition clips (≈ willow)

  it("snaps to the target season on a static bake (tSec <= 0)", () => {
    const r = advanceTransition(idle(SUMMER), WINTER, hasAll, frames8, 0);
    expect(r.transitioning).toBe(false);
    expect(r.state).toMatchObject({ curIdx: WINTER, mode: "idle" });
  });

  it("holds idle when the season hasn't changed", () => {
    const r = advanceTransition(idle(SUMMER), SUMMER, hasAll, frames8, 5);
    expect(r.transitioning).toBe(false);
    expect(r.settledSeasonIdx).toBe(SUMMER);
  });

  it("enters a transition on an adjacent forward change with a clip", () => {
    const r = advanceTransition(idle(SUMMER), AUTUMN, hasAll, frames8, 10);
    expect(r.transitioning).toBe(true);
    expect(r.transFromIdx).toBe(SUMMER);
    expect(r.transFrame).toBe(0);
    expect(r.state).toMatchObject({ mode: "trans", transTo: AUTUMN, transStart: 10 });
  });

  it("plays the transition once, then settles into the new idle season", () => {
    // Start the transition at t=10s.
    let st = advanceTransition(idle(SUMMER), AUTUMN, hasAll, frames8, 10).state;
    // Mid-clip (2 frames * 70ms = 140ms in): still transitioning.
    const mid = advanceTransition(st, AUTUMN, hasAll, frames8, 10.14);
    expect(mid.transitioning).toBe(true);
    expect(mid.transFrame).toBe(2);
    st = mid.state;
    // Past the clip (8 frames * 70ms = 560ms): settles to AUTUMN idle.
    const done = advanceTransition(st, AUTUMN, hasAll, frames8, 11);
    expect(done.transitioning).toBe(false);
    expect(done.settledSeasonIdx).toBe(AUTUMN);
    expect(done.state).toMatchObject({ curIdx: AUTUMN, mode: "idle" });
  });

  it("snaps (no transition) when the forward season has no transition clip", () => {
    const noClip = () => false;
    const r = advanceTransition(idle(SUMMER), AUTUMN, noClip, () => 0, 10);
    expect(r.transitioning).toBe(false);
    expect(r.state).toMatchObject({ curIdx: AUTUMN, mode: "idle" });
  });

  it("snaps on a backward or non-adjacent season jump", () => {
    expect(advanceTransition(idle(AUTUMN), SPRING, hasAll, frames8, 10).transitioning).toBe(false);
    expect(advanceTransition(idle(SPRING), WINTER, hasAll, frames8, 10).transitioning).toBe(false);
  });
});
