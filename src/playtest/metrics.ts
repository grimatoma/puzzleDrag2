// Balance metrics: the family-value spread (the audit metric) + zone coin-band
// diffs. The spread is computed from the CATALOG (constants), independent of any
// particular run, so it deterministically reproduces the audit finding
// regardless of which zones were simulated.

import {
  FARM_TILE_POOL, MINE_TILE_POOL, FISH_TILE_POOL,
  TILES_PER_RESOURCE, UPGRADE_THRESHOLDS, getItem,
} from "../constants.js";
import { producedResource } from "../game/producedResource.js";
import { FAMILY_SPREAD_OUTLIER_FACTOR, zoneCoinTarget } from "./targets.js";
import type { ZoneAggregate } from "./run.js";

export interface SpreadEntry {
  /** Representative board tile that produces this resource. */
  tileKey: string;
  resourceKey: string;
  resourceLabel: string;
  /** ITEMS[resourceKey].value — the resource's sell worth. */
  resourceValue: number;
  /** TILES_PER_RESOURCE[tileKey] — tiles spent per produced unit. */
  tilesPerResource: number;
  /** resourceValue / tilesPerResource — worth realized per tile chained. */
  realizedValuePerTile: number;
  flag: "high" | "low" | "normal";
}

export interface FamilyValueSpread {
  outlierFactor: number;
  entries: SpreadEntry[];
  byResource: Record<string, SpreadEntry>;
  min: number;
  max: number;
  median: number;
  /** max / min realized value-per-tile across families. */
  ratio: number;
  /** Entries flagged high or low. */
  outliers: SpreadEntry[];
  /** True when the spread ratio exceeds the outlier factor (a balance smell). */
  flagged: boolean;
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Catalog-wide family-value spread over every tile reachable from the farm/mine/
 * fish pools. One entry per distinct produced resource (first tile that reaches
 * it wins as the representative). Sorted high → low by realized value-per-tile.
 */
export function familyValueSpread(
  outlierFactor: number = FAMILY_SPREAD_OUTLIER_FACTOR,
): FamilyValueSpread {
  const tpr = TILES_PER_RESOURCE as Record<string, number>;
  const upg = UPGRADE_THRESHOLDS as Record<string, number>;
  const poolKeys = [...new Set([...FARM_TILE_POOL, ...MINE_TILE_POOL, ...FISH_TILE_POOL])];

  const byResource: Record<string, SpreadEntry> = {};
  for (const tileKey of poolKeys) {
    const resourceKey = producedResource({ key: tileKey });
    if (!resourceKey) continue;                       // special/custom-output tiles
    if (byResource[resourceKey]) continue;            // first representative wins
    const def = getItem(resourceKey) as { value?: number; label?: string } | undefined;
    const resourceValue = def?.value;
    if (typeof resourceValue !== "number") continue;
    const tilesPerResource = tpr[tileKey] ?? upg[tileKey];
    if (!tilesPerResource || tilesPerResource <= 0) continue;
    byResource[resourceKey] = {
      tileKey, resourceKey,
      resourceLabel: def?.label ?? resourceKey,
      resourceValue,
      tilesPerResource,
      realizedValuePerTile: resourceValue / tilesPerResource,
      flag: "normal",
    };
  }

  const entries = Object.values(byResource).sort(
    (a, b) => b.realizedValuePerTile - a.realizedValuePerTile,
  );
  const realized = entries.map((e) => e.realizedValuePerTile);
  const med = median(realized);
  const min = realized.length ? Math.min(...realized) : 0;
  const max = realized.length ? Math.max(...realized) : 0;
  const highCeil = outlierFactor * med;
  const lowFloor = med / outlierFactor;
  for (const e of entries) {
    if (e.realizedValuePerTile > highCeil) e.flag = "high";
    else if (e.realizedValuePerTile < lowFloor) e.flag = "low";
  }

  return {
    outlierFactor,
    entries,
    byResource,
    min, max, median: med,
    ratio: min > 0 ? max / min : Infinity,
    outliers: entries.filter((e) => e.flag !== "normal"),
    flagged: (min > 0 ? max / min : Infinity) > outlierFactor,
  };
}

export interface CoinBandDiff {
  zoneId: string;
  coinsPerRunMean: number;
  target: [number, number] | null;
  /** "below" | "within" | "above" | "no-target" */
  verdict: "below" | "within" | "above" | "no-target";
}

/** Compare a zone's simulated mean coins/run against its declarative band. */
export function coinBandDiff(agg: ZoneAggregate): CoinBandDiff {
  const t = zoneCoinTarget(agg.zoneId);
  const mean = agg.coinsPerRun.mean;
  if (!t) return { zoneId: agg.zoneId, coinsPerRunMean: mean, target: null, verdict: "no-target" };
  const [lo, hi] = t.coinsPerRun;
  const verdict = mean < lo ? "below" : mean > hi ? "above" : "within";
  return { zoneId: agg.zoneId, coinsPerRunMean: mean, target: t.coinsPerRun, verdict };
}
