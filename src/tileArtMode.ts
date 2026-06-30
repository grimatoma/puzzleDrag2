// Single source of truth for how the puzzle board renders its tile art.
//
// Three mutually-exclusive modes, chosen in Settings → Graphics:
//   • "static"   — the hand-drawn VECTOR art, held on each tile's rest frame
//                  (no idle sway / seasonal idle loops). The non-animated look.
//   • "animated" — the same vector art, with the idle motion playing (default).
//   • "pixel"    — the baked PixelLab pixel sprites (the seasonal-art override).
//
// The mode lives in the persisted game settings (`hearth.settings`) so the parts
// that run OUTSIDE React can read it: the Phaser scene (whether idle motion plays)
// and the seasonal-art module (whether the pixel-sprite route is on). This module
// owns the runtime flip — it pushes the pixel dimension into the seasonal-art
// module and notifies motion consumers (the scene) so they re-bake.
//
// Self-contained except for the one-way call into seasonal-art's pixel override;
// seasonal-art does NOT import this module (it reads the raw setting itself), so
// there is no import cycle.

import { setPixelSpriteOverride } from "./textures/seasonal/seasonalArt.js";

export type TileArtMode = "static" | "animated" | "pixel";

export const TILE_ART_MODES: readonly TileArtMode[] = ["static", "animated", "pixel"] as const;

/** The default look: hand-drawn vector art, animated. */
export const DEFAULT_TILE_ART_MODE: TileArtMode = "animated";

const SETTINGS_STORAGE_KEY = "hearth.settings";

/** Coerce an arbitrary persisted value to a valid mode (defaulting on garbage). */
export function normalizeTileArtMode(v: unknown): TileArtMode {
  return v === "static" || v === "animated" || v === "pixel" ? v : DEFAULT_TILE_ART_MODE;
}

/** Resolve the mode from a settings object, honoring the legacy boolean
 *  `pixelSpriteOverride` flag (true → "pixel") for saves made before the
 *  3-way selector existed. */
export function resolveTileArtMode(
  s: { tileArtMode?: unknown; pixelSpriteOverride?: unknown } | null | undefined,
): TileArtMode {
  if (!s) return DEFAULT_TILE_ART_MODE;
  if (s.tileArtMode != null) return normalizeTileArtMode(s.tileArtMode);
  if (s.pixelSpriteOverride) return "pixel";
  return DEFAULT_TILE_ART_MODE;
}

function readModeFromStorage(): TileArtMode {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(SETTINGS_STORAGE_KEY) : null;
    if (raw) return resolveTileArtMode(JSON.parse(raw) as Record<string, unknown>);
  } catch { /* storage unavailable / corrupt */ }
  return DEFAULT_TILE_ART_MODE;
}

let mode: TileArtMode = readModeFromStorage();

/** The current tile-art mode. */
export function getTileArtMode(): TileArtMode {
  return mode;
}

/** Whether idle motion (ambient sway, seasonal idle loops, per-frame re-bakes)
 *  should play. False only for the static art, which holds every tile on its
 *  rest frame; both the animated-vector and pixel modes animate. */
export function tileArtMotionEnabled(): boolean {
  return mode !== "static";
}

// Fires when the mode changes so the Phaser scene can re-bake (hold stills for
// "static", resume motion otherwise).
const listeners = new Set<() => void>();

/** Subscribe to tile-art-mode changes. Returns an unsubscribe. */
export function onTileArtModeChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

/** Flip the tile-art mode at runtime. Drives the pixel-sprite route through the
 *  seasonal-art module (which preloads the now-needed PNGs and re-bakes the
 *  vector-preferred tiles), then notifies motion consumers so the board re-bakes
 *  static stills or resumes its idle animation. No-op when the mode is unchanged. */
export async function setTileArtMode(next: TileArtMode): Promise<void> {
  const normalized = normalizeTileArtMode(next);
  if (mode === normalized) return;
  mode = normalized;
  await setPixelSpriteOverride(normalized === "pixel");
  listeners.forEach((cb) => cb());
}
