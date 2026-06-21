import { TILE_TYPES } from "../features/tileCollection/data.js";

/** Per-production-line tuning. One entry per tile category that yields a resource. */
export interface ProductionLine {
  /** tier-0 income divisor (tiles per resource). Equals today's per-category value. */
  lineBase: number;
  /** divisor added per variant tier (chicken tier-1 = lineBase + 1, etc.). */
  tierStep: number;
  /** tiles shaved off the divisor per worker hire. */
  step: number;
  /** max hires of this line's worker. */
  maxCount: number;
  /** minimum effective divisor — premium lines floor higher. */
  floor: number;
}

const DEFAULTS = { tierStep: 1, step: 1, maxCount: 10, floor: 1 } as const;
const line = (lineBase: number, over: Partial<ProductionLine> = {}): ProductionLine => ({
  lineBase, ...DEFAULTS, ...over,
});

// lineBase values mirror today's UPGRADE_THRESHOLDS canonical tier-0 tile so
// tier-0 income is unchanged at introduction. step/floor outliers mirror PC2:
// bulk lines (grass=Peasant, special_dirt=Digger) shave 2; premium lines
// (flowers->honey, mounts->horseshoe, gems, gold) floor higher so a fully
// staffed crew never trivialises high-value resources.
export const PRODUCTION_LINES: Record<string, ProductionLine> = {
  grass: line(6, { step: 2 }),
  grain: line(5),
  bird: line(6),
  vegetables: line(6),
  fruits: line(7),
  flowers: line(10, { floor: 3 }),
  trees: line(6),
  herd_animals: line(5),
  cattle: line(6),
  mounts: line(10, { floor: 3 }),
  mine_stone: line(8),
  mine_iron_ore: line(6),
  mine_coal: line(7),
  mine_gem: line(5, { floor: 2 }),
  mine_gold: line(6, { floor: 2 }),
  special_dirt: line(6, { step: 2 }),
  fish: line(5),
};

export function lineBase(category: string): number {
  return PRODUCTION_LINES[category]?.lineBase ?? 6;
}
export function tierStep(category: string): number {
  return PRODUCTION_LINES[category]?.tierStep ?? DEFAULTS.tierStep;
}
export function lineStep(category: string): number {
  return PRODUCTION_LINES[category]?.step ?? DEFAULTS.step;
}
export function lineFloor(category: string): number {
  return PRODUCTION_LINES[category]?.floor ?? DEFAULTS.floor;
}

const CATEGORY_BY_TILE_KEY: Record<string, string> = Object.fromEntries(
  TILE_TYPES.map((t) => [t.id, t.category]),
);

/** Category for a chained tile key (e.g. "block" -> "mine_stone"). Null if unknown. */
export function categoryOfTileKey(tileKey: string): string | null {
  return CATEGORY_BY_TILE_KEY[tileKey] ?? null;
}

/**
 * Build the TILES_PER_RESOURCE map: seeded from UPGRADE_THRESHOLDS to preserve
 * legacy keys, then tier-scaled per productionLines for every tile in TILE_TYPES.
 * Tier-0 divisors are set to lineBase (unchanged from UPGRADE_THRESHOLDS for most
 * tiles). Board-upgrade gate (UPGRADE_THRESHOLDS) stays flat — only income is
 * tier-scaled here.
 */
export function buildTilesPerResource(
  baseThresholds: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = { ...baseThresholds };
  for (const t of TILE_TYPES) {
    if (!PRODUCTION_LINES[t.category]) {
      // Tiles with no production line (treasure, etc.) use legacy threshold if
      // present, or fall back to the global default of 6 so every tile has a
      // valid positive divisor.
      if (!(t.id in out)) out[t.id] = 6;
      continue;
    }
    const tier = Number(t.tier) || 0;
    out[t.id] = lineBase(t.category) + tier * tierStep(t.category);
  }
  return out;
}
