// Seasonal-tile registry + accessors.
//
// Aggregates per-category seasonal art (currently just grain) and exposes
// season-aware lookups for the board baker (`src/textures.ts`) and the Dev
// Panel gallery (`IconsTab.tsx`). This is purely additive — base
// `ICON_REGISTRY` keys are never removed or renamed.
//
// IMPORTANT (import cycle): `src/textures.ts` imports from here, so this module
// must NOT import `drawTileIcon` back from `textures.ts`. `seasonalTileDraw`
// returns `null` when a key/season has no variant; callers fall back to their
// own base-draw path. Animation fallback uses `iconAnimation` (no cycle).

import type { SeasonName, SeasonalTileEntry } from "./types.js";
import { SEASONAL_TILES as GRAIN } from "./grain.js";
import { iconAnimation } from "../iconAnimations.js";

const REGISTRY: Record<string, SeasonalTileEntry> = {
  ...GRAIN,
};

export const SEASONAL_TILE_KEYS: ReadonlySet<string> = new Set(Object.keys(REGISTRY));

/** Whether `key` has any seasonal art. */
export function hasSeasonalTile(key: string): boolean {
  return SEASONAL_TILE_KEYS.has(key);
}

/** Whether `key` has a per-frame animation for the given season. */
export function hasSeasonalTileAnim(key: string, season: SeasonName | null): boolean {
  return !!(season && REGISTRY[key]?.[season]?.anim);
}

/** Season-aware static draw, or `null` when no variant exists (caller falls
 *  back to the base icon draw). Returns `null` when `season` is null. */
export function seasonalTileDraw(
  key: string,
  season: SeasonName | null,
): ((ctx: CanvasRenderingContext2D) => void) | null {
  const v = season ? REGISTRY[key]?.[season] : undefined;
  return v ? v.draw : null;
}

/** Season-aware animation: the seasonal variant's anim, else the icon's base
 *  animation (`iconAnimation`), else `null`. */
export function seasonalTileAnim(
  key: string,
  season: SeasonName | null,
): ((ctx: CanvasRenderingContext2D, t: number) => void) | null {
  const v = season ? REGISTRY[key]?.[season] : undefined;
  return v?.anim ?? iconAnimation(key) ?? null;
}
