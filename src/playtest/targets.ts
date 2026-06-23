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

// ─── Progression pacing targets (campaign harness) ───────────────────────────
// The single-run harness measures per-run economy; the CAMPAIGN harness
// (src/playtest/campaign.ts) measures progression PACING — how many sequential
// runs it takes to reach a coin milestone or a settlement tier. These bands are
// the same kind of hand-maintained, deliberately-wide v1 literal as
// ZONE_COIN_TARGETS: seed them from a real balance pass, don't trust them as
// authored ground truth yet. `runs: [min, max]` is the acceptable window.

export interface ProgressionTarget {
  zoneId: string;
  /** Runs-to-afford a coin balance (e.g. a settlement founding price). */
  coinMilestones?: Array<{ label: string; coins: number; runs: [number, number] }>;
  /** Runs-to-reach a settlement tier rung (by 0-based tier index). */
  tierRuns?: Array<{ tier: number; name: string; runs: [number, number] }>;
}

/**
 * Per-zone progression bands. v1 seeds only `home` and only the coin-economy
 * milestones (the founding ladder), because the home TIER ladder is gated on
 * crafted + cross-zone resources a farm-only campaign cannot earn — so a
 * farm-only campaign legitimately stalls before tier 1 and the harness reports
 * that as a finding rather than pretending a tier band exists. Add tier bands
 * here once the campaign simulates crafting / multiple boards.
 */
export const PROGRESSION_TARGETS: ProgressionTarget[] = [
  {
    zoneId: "home",
    coinMilestones: [
      { label: "found settlement #2 (300c)", coins: 300, runs: [2, 12] },
      { label: "found settlement #3 (510c)", coins: 510, runs: [4, 20] },
    ],
  },
];

export function progressionTarget(zoneId: string): ProgressionTarget | undefined {
  return PROGRESSION_TARGETS.find((t) => t.zoneId === zoneId);
}
