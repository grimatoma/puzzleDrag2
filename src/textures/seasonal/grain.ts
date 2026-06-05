// Seasonal art for the grain farm-tile family (pilot type).
// Each per-tile module exports a `VARIANTS: SeasonalTileEntry` (4 seasons of
// {draw, anim?}). This module aggregates them keyed by the tile's icon key.

import type { SeasonalTileEntry } from "./types.js";
import { VARIANTS as WHEAT } from "./grain/wheat.js";
import { VARIANTS as CORN } from "./grain/corn.js";
import { VARIANTS as BUCKWHEAT } from "./grain/buckwheat.js";
import { VARIANTS as RICE } from "./grain/rice.js";
import { VARIANTS as MANNA } from "./grain/manna.js";

export const SEASONAL_TILES: Record<string, SeasonalTileEntry> = {
  tile_grain_wheat: WHEAT,
  tile_grain_corn: CORN,
  tile_grain_buckwheat: BUCKWHEAT,
  tile_grain_rice: RICE,
  tile_grain_manna: MANNA,
};
