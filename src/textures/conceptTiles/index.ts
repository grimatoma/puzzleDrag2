import { isConceptTileIconsEnabled } from "../../featureFlags.js";
import { CONCEPT_TILE_SPECS, isConceptTileKey, type ConceptTileSpec } from "./manifest.js";
import { loadConceptGifPlayer, type ConceptTileDraw } from "./gifPlayer.js";

export { CONCEPT_TILE_KEYS, CONCEPT_TILE_SPECS, isConceptTileKey } from "./manifest.js";

const players = new Map<string, ConceptTileDraw>();
let preloadPromise: Promise<void> | null = null;

function specFor(key: string): ConceptTileSpec | undefined {
  return CONCEPT_TILE_SPECS[key];
}

/** Begin loading concept GIF decoders (no-op when the URL flag is off). */
export function preloadConceptTileGifs(): Promise<void> {
  if (!isConceptTileIconsEnabled()) return Promise.resolve();
  if (!preloadPromise) {
    preloadPromise = Promise.all(
      Object.entries(CONCEPT_TILE_SPECS).map(async ([key, spec]) => {
        const player = await loadConceptGifPlayer(spec);
        if (player) players.set(key, player.draw);
      }),
    ).then(() => {});
  }
  return preloadPromise;
}

/** Whether a loaded concept animation is ready for `key`. */
export function hasConceptTileAnim(key: string): boolean {
  return isConceptTileIconsEnabled() && players.has(key);
}

/** Draw the concept GIF frame for elapsed time `t` (seconds), origin-centered. */
export function conceptTileAnim(key: string): ConceptTileDraw | null {
  if (!isConceptTileIconsEnabled()) return null;
  return players.get(key) ?? null;
}
