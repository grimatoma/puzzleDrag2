// Vector seasonal art for the SHOWCASE tiles — the hand-drawn, fully-animated
// demonstration of the all-vector pipeline (idle loops + forward season→season
// transitions) as the alternative to the baked PNG route. Three families, three
// motion idioms:
//   • Oak   (tile_tree_oak)   — deciduous tree: canopy sway + leaf-fall.
//   • Pansy (tile_flower_pansy) — flower: petal bloom + sway.
//   • Apple (tile_fruit_apple)  — fruit: ripening glint + drop.
//
// Each per-tile module exports `VARIANTS` (4 seasons of {draw, anim}) and
// `TRANSITIONS` (forward morphs keyed by from-season index). This module just
// keys them by the board tile key; `seasonalTiles.ts` merges them into the
// registry and the engine gives these keys vector precedence over any baked
// PNG anchor (see `seasonalTilePrefersVector`).

import type { SeasonalTileEntry, SeasonalTransitionSet } from "./types.js";
import { VARIANTS as OAK, TRANSITIONS as OAK_T } from "./tree/oak.js";
import { VARIANTS as PANSY, TRANSITIONS as PANSY_T } from "./flower/pansy.js";
import { VARIANTS as APPLE, TRANSITIONS as APPLE_T } from "./fruit/apple.js";

export const SHOWCASE_TILES: Record<string, SeasonalTileEntry> = {
  tile_tree_oak: OAK,
  tile_flower_pansy: PANSY,
  tile_fruit_apple: APPLE,
};

export const SHOWCASE_TRANSITIONS: Record<string, SeasonalTransitionSet> = {
  tile_tree_oak: OAK_T,
  tile_flower_pansy: PANSY_T,
  tile_fruit_apple: APPLE_T,
};
