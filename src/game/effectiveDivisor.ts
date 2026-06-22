import { TILES_PER_RESOURCE, tileFamily } from "../constants.js";
import { computeAggregatedAbilities } from "../features/workers/aggregate.js";
import { categoryOfTileKey, lineFloor, PRODUCTION_LINES } from "../config/productionLines.js";

/** Resolve the production line that governs a tile's income: the produced-resource
 *  family when it is a production line, else the display category. Mirrors how
 *  TILES_PER_RESOURCE was built so floor and divisor agree for cross-category tiles.
 *
 *  Note: this governs PRICING (divisor + floor) only. Worker threshold reductions
 *  are attributed by DISPLAY category (threshold_reduce_category iterates tiles
 *  grouped by t.category), so the two cross-category tiles — tile_bird_clover
 *  (flowers) and tile_bird_melon (fruits) — are priced on the bird line but their
 *  income is sped up by the flowers/fruits worker, not the Poultryman. Intentional
 *  and harmless (two niche variants); income still reduces and the floor matches. */
function lineCategoryForTileKey(tileKey: string): string | null {
  const fam = tileFamily(tileKey);
  if (fam && PRODUCTION_LINES[fam]) return fam;
  return categoryOfTileKey(tileKey);
}

/**
 * Income divisor for a chained tile key after worker/building reductions, clamped
 * to the line's floor. `thresholdReduce` is keyed by baseResource = the chained
 * tile key for an active tile. Pass a precomputed `agg` when looping many keys in
 * one action to avoid recomputing the aggregate per tile.
 */
export function effectiveTilesPerResource(
  state: Parameters<typeof computeAggregatedAbilities>[0],
  tileKey: string,
  agg?: { thresholdReduce?: Record<string, number> },
): number {
  const base = TILES_PER_RESOURCE[tileKey];
  if (base == null) return Infinity;
  const a = agg ?? computeAggregatedAbilities(state);
  const reduce = a.thresholdReduce?.[tileKey] ?? 0;
  const line = lineCategoryForTileKey(tileKey);
  const floor = line ? lineFloor(line) : 1;
  return Math.max(floor, base - reduce);
}
