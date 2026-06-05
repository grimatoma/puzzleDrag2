import { describe, it, expect } from "vitest";
import { SEASONAL_TILES } from "../textures/seasonal/grain.js";
import {
  seasonalTileDraw,
  seasonalTileAnim,
  hasSeasonalTile,
  hasSeasonalTileAnim,
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
  it("registers exactly the 5 grain keys", () => {
    expect([...SEASONAL_TILE_KEYS].sort()).toEqual([...GRAIN_KEYS].sort());
    for (const k of GRAIN_KEYS) expect(hasSeasonalTile(k)).toBe(true);
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
    for (const key of GRAIN_KEYS) {
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
