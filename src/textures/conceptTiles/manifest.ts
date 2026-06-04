/** Pixel-art concept GIFs from docs/assets (farm + grass review pages). */

export interface ConceptTileSpec {
  /** GIF filename under `/concept-tiles/` (Vite `public/`). */
  gif: string;
  /** Native sprite width in the GIF (farm = 48, grass = 32). */
  nativeW: number;
  /** Native sprite height in the GIF. */
  nativeH: number;
  /** Milliseconds per frame (matches the concept doc loops). */
  msPerFrame: number;
  /** Frame count in the seamless loop. */
  frameCount: number;
}

/** Seven board tile keys wired for concept-GIF preview (5 farm + 2 grass variants). */
export const CONCEPT_TILE_SPECS: Readonly<Record<string, ConceptTileSpec>> = Object.freeze({
  tile_bird_chicken: { gif: "chicken.gif", nativeW: 48, nativeH: 48, msPerFrame: 70, frameCount: 18 },
  tile_fruit_apple: { gif: "apple.gif", nativeW: 48, nativeH: 48, msPerFrame: 70, frameCount: 18 },
  tile_veg_carrot: { gif: "carrot.gif", nativeW: 48, nativeH: 48, msPerFrame: 70, frameCount: 18 },
  tile_tree_oak: { gif: "oak.gif", nativeW: 48, nativeH: 48, msPerFrame: 70, frameCount: 18 },
  tile_grain_corn: { gif: "corn.gif", nativeW: 48, nativeH: 48, msPerFrame: 70, frameCount: 18 },
  tile_grass_meadow: { gif: "grass-1.gif", nativeW: 32, nativeH: 32, msPerFrame: 80, frameCount: 16 },
  tile_grass_grass: { gif: "grass-2.gif", nativeW: 32, nativeH: 32, msPerFrame: 80, frameCount: 16 },
});

export const CONCEPT_TILE_KEYS: ReadonlySet<string> = new Set(Object.keys(CONCEPT_TILE_SPECS));

export function isConceptTileKey(key: string): boolean {
  return CONCEPT_TILE_KEYS.has(key);
}
