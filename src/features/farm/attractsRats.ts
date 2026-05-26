/**
 * "Attracts rats" tag from REFERENCE_CATALOG §7.
 *
 * Manna and Jackfruit attract rats. Each tile of these species visible
 * on the farm board adds a flat bump to the rat-spawn-rate roll.
 *
 * RAT_SPAWN_THRESHOLDS.perFillRate is the base 10% spawn rate; this
 * helper adds a per-tile bonus on top of that.
 */
const ATTRACT_KEYS = new Set<string>(["tile_grain_manna", "tile_fruit_jackfruit"]);

/** Per-tile rat-spawn bonus. Two tiles on the board double the bonus. */
export const ATTRACT_RATE_BONUS = 0.05;

interface GridCell {
  key?: string | null;
}

/** Returns true if the resource key attracts rats. */
export function attractsRats(key: string): boolean {
  return ATTRACT_KEYS.has(key);
}

/**
 * Counts how many "attracts_rats" tiles are currently on the grid.
 * Pure — no side effects.
 */
export function countAttractsRatTiles(grid: Array<Array<GridCell | null>> | null | undefined): number {
  if (!Array.isArray(grid)) return 0;
  let n = 0;
  for (const row of grid) {
    if (!Array.isArray(row)) continue;
    for (const tile of row) {
      if (tile?.key && ATTRACT_KEYS.has(tile.key)) n++;
    }
  }
  return n;
}

/**
 * Returns the effective rat-spawn rate given a base rate and the current
 * grid contents. Capped at 1.0 so the bonus can never exceed certainty.
 */
export function effectiveRatSpawnRate(baseRate: number, grid: Array<Array<GridCell | null>> | null | undefined): number {
  const n = countAttractsRatTiles(grid);
  return Math.min(1.0, baseRate + n * ATTRACT_RATE_BONUS);
}
