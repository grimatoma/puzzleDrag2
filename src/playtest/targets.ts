// Declarative balance targets the report diffs simulated metrics against.
//
// These are intentionally a small, hand-maintained literal — the harness reads
// them, never writes them. Bands are deliberately wide for v1 (the economy has
// never been played against); tighten them as real playtest data lands. The
// concrete, defensible auto-balance output for v1 comes from the family-value
// spread (resource-value-per-tile), not these coin bands.

export interface ZoneCoinTarget {
  zoneId: string;
  /** Acceptable [min, max] pure chain coins per run for a greedy auto-player. */
  coinsPerRun: [number, number];
}

/** PC2-flavoured coin/run bands per zone (rough; refine with playtest data). */
export const ZONE_COIN_TARGETS: ZoneCoinTarget[] = [
  { zoneId: "home", coinsPerRun: [40, 140] },
];

export function zoneCoinTarget(zoneId: string): ZoneCoinTarget | undefined {
  return ZONE_COIN_TARGETS.find((t) => t.zoneId === zoneId);
}

/**
 * Outlier factor for the family-value spread: any produced resource whose
 * realized value-per-tile exceeds `outlierFactor × median` is flagged and gets a
 * proposed value cut toward that ceiling. 3× means "no resource should pay more
 * than 3× the typical tile-spend." Low-value staples (hay, plank, block) are
 * intentional commodity floors and are NOT proposed for change.
 */
export const FAMILY_SPREAD_OUTLIER_FACTOR = 3;
