import { describe, it, expect } from "vitest";
import { SEASONAL_TILES } from "../textures/seasonal/grain.js";
import {
  seasonalTileDraw,
  seasonalTileAnim,
  hasSeasonalTile,
  hasSeasonalTileAnim,
  seasonalTileTransition,
  hasSeasonalTransition,
  seasonalTileHasTransitions,
  seasonalTilePrefersVector,
  seasonalVectorAdvance,
  resetSeasonalVectorState,
  SEASONAL_TILE_KEYS,
} from "../textures/seasonal/seasonalTiles.js";
import { SEASON_NAMES, type SeasonName } from "../textures/seasonal/types.js";
import { ICON_REGISTRY } from "../textures/iconRegistry.js";

const GRAIN_KEYS = [
  "tile_grain_wheat",
  "tile_grain_corn",
  "tile_grain_buckwheat",
  "tile_grain_rice",
  "tile_grain_manna",
];

// The all-vector showcase tiles: per-season draw+anim AND forward transitions.
const SHOWCASE_KEYS = ["tile_tree_oak", "tile_flower_pansy", "tile_fruit_apple"];
const ALL_KEYS = [...GRAIN_KEYS, ...SHOWCASE_KEYS];

// Minimal CanvasRenderingContext2D stub: every method is a no-op, gradient
// factories return an object with addColorStop. Exercises control flow of every
// draw/anim across t-samples to catch obvious runtime errors. (Same approach as
// icon-animations.test.ts.)
function makeStubCtx(): CanvasRenderingContext2D {
  const grad = { addColorStop() {} };
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop) {
      if (prop === "createLinearGradient" || prop === "createRadialGradient" || prop === "createConicGradient") {
        return () => grad;
      }
      if (prop === "canvas") return { width: 64, height: 64 };
      if (prop === "measureText") return () => ({ width: 10 });
      return () => {};
    },
    set() {
      return true;
    },
  };
  return new Proxy({}, handler) as unknown as CanvasRenderingContext2D;
}

describe("seasonal tiles (grain pilot)", () => {
  it("registers the grain pilot + the vector showcase keys", () => {
    expect([...SEASONAL_TILE_KEYS].sort()).toEqual([...ALL_KEYS].sort());
    for (const k of ALL_KEYS) expect(hasSeasonalTile(k)).toBe(true);
    expect(hasSeasonalTile("tile_grass_grass")).toBe(false);
  });

  it("every grain key has a draw for all 4 seasons (and declared anims are arity-2)", () => {
    for (const key of GRAIN_KEYS) {
      const entry = SEASONAL_TILES[key];
      expect(entry, key).toBeDefined();
      for (const season of SEASON_NAMES) {
        const v = entry[season];
        expect(typeof v.draw, `${key}/${season} draw`).toBe("function");
        if (v.anim) {
          expect(v.anim.length, `${key}/${season} anim`).toBe(2);
        }
      }
    }
  });

  it("base keys still resolve in ICON_REGISTRY (additive contract)", () => {
    for (const key of GRAIN_KEYS) {
      expect(ICON_REGISTRY[key], key).toBeDefined();
    }
  });

  it("seasonalTileDraw / seasonalTileAnim run without throwing across t-samples", () => {
    const ctx = makeStubCtx();
    for (const key of ALL_KEYS) {
      for (const season of SEASON_NAMES) {
        const draw = seasonalTileDraw(key, season);
        expect(draw, `${key}/${season}`).toBeTypeOf("function");
        expect(() => draw!(ctx), `${key}/${season} draw`).not.toThrow();
        const anim = seasonalTileAnim(key, season);
        if (anim) {
          for (const t of [0, 0.37, 1.5, 3.14, 7.9, 60.2]) {
            expect(() => anim(ctx, t), `${key}/${season} anim @ ${t}`).not.toThrow();
          }
        }
      }
    }
  });

  it("fallbacks: null season and non-seasonal keys", () => {
    expect(seasonalTileDraw("tile_grain_wheat", null)).toBeNull();
    expect(seasonalTileDraw("tile_not_a_seasonal_key", "Spring" as SeasonName)).toBeNull();
    expect(hasSeasonalTileAnim("tile_grain_wheat", null)).toBe(false);
    // Non-seasonal key with no base icon animation → null.
    expect(seasonalTileAnim("tile_not_a_seasonal_key", "Spring" as SeasonName)).toBeNull();
  });
});

describe("seasonal tile forward transitions (vector showcase)", () => {
  it("only the showcase keys carry transitions, and prefer vector over baked art", () => {
    for (const key of SHOWCASE_KEYS) {
      expect(seasonalTileHasTransitions(key), key).toBe(true);
      expect(seasonalTilePrefersVector(key), key).toBe(true);
    }
    for (const key of GRAIN_KEYS) {
      expect(seasonalTileHasTransitions(key), key).toBe(false);
      expect(seasonalTilePrefersVector(key), key).toBe(false);
    }
  });

  it("each showcase key has all three forward transitions (0,1,2) and no winter→spring", () => {
    for (const key of SHOWCASE_KEYS) {
      for (const fromIdx of [0, 1, 2]) {
        expect(hasSeasonalTransition(key, fromIdx), `${key}#${fromIdx}`).toBe(true);
        expect(seasonalTileTransition(key, fromIdx), `${key}#${fromIdx}`).toBeTypeOf("function");
      }
      expect(hasSeasonalTransition(key, 3), `${key}#3`).toBe(false);
      expect(seasonalTileTransition(key, 3), `${key}#3`).toBeNull();
    }
  });

  it("transitions run without throwing across p-samples (incl. out-of-range)", () => {
    const ctx = makeStubCtx();
    for (const key of SHOWCASE_KEYS) {
      for (const fromIdx of [0, 1, 2]) {
        const fn = seasonalTileTransition(key, fromIdx)!;
        for (const p of [-0.1, 0, 0.13, 0.5, 0.87, 1, 1.2]) {
          expect(() => fn(ctx, p), `${key}#${fromIdx} @ ${p}`).not.toThrow();
        }
      }
    }
  });

  it("seasonalVectorAdvance plays a forward step once then settles into the idle", () => {
    resetSeasonalVectorState();
    const key = "tile_tree_oak";
    // First sighting in Spring: settle, no transition.
    expect(seasonalVectorAdvance(key, "Spring", 0).transitioning).toBe(false);
    // Season flips to Summer → a forward morph begins (fromIdx 0) and progresses.
    const a = seasonalVectorAdvance(key, "Summer", 0);
    expect(a.transitioning).toBe(true);
    expect(a.fromIdx).toBe(0);
    expect(a.p).toBeGreaterThanOrEqual(0);
    const b = seasonalVectorAdvance(key, "Summer", 0.7);
    expect(b.transitioning).toBe(true);
    expect(b.p).toBeGreaterThan(a.p);
    // Past the transition duration it settles — no longer transitioning.
    expect(seasonalVectorAdvance(key, "Summer", 5).transitioning).toBe(false);
  });

  it("seasonalVectorAdvance snaps (no morph) on a non-adjacent jump or season reset", () => {
    resetSeasonalVectorState();
    const key = "tile_flower_pansy";
    expect(seasonalVectorAdvance(key, "Spring", 0).transitioning).toBe(false);
    // Spring → Autumn skips Summer: snap, don't morph.
    expect(seasonalVectorAdvance(key, "Autumn", 1).transitioning).toBe(false);
    // Autumn → Spring (new run wraps backward): snap, don't morph.
    expect(seasonalVectorAdvance(key, "Spring", 2).transitioning).toBe(false);
  });
});
