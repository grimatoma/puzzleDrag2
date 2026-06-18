/**
 * Pure spawn-pool assembly, extracted from GameScene.fillBoard so it can be
 * unit-tested without booting Phaser. The scene reads the registry/biome and
 * passes plain values; this module performs the category filter, boss spawn
 * bias, fertilizer bias, and seasonal/weight modifiers — mirroring the former
 * inline logic exactly. The FERTILIZER_CONSUMED side-effect stays in the scene.
 */
import { TILES_WITH_CUSTOM_OUTPUT } from "../constants.js";
import { CATEGORY_OF } from "../features/tileCollection/data.js";
import {
  expandZoneCategories,
  ZONE_UPGRADE_TARGET_GOLD,
  TILE_CATEGORY_TO_ZONE_CATEGORY,
  ZONE_TO_TILE_CATEGORIES,
} from "../features/zones/data.js";
import { applySpawnPoolModifiers } from "../features/farm/poolMath.js";
import { resourceByKey } from "../state/helpers.js";
import type { SeasonName } from "../textures/seasonal/types.js";

const CATEGORY_LOOKUP = CATEGORY_OF as Record<string, string | undefined>;

/** Default fertilizer bias keys when no explicit target is armed. */
const DEFAULT_FERTILIZER_BIAS_KEYS: ReadonlyArray<string> = Object.freeze([
  "seedling",
  "tile_grass_hay",
  "tile_grain_wheat",
]);

export interface SpawnPoolInput {
  /** Base pool, already active-tile-substituted (GameScene.activePool()). */
  basePool: ReadonlyArray<string>;
  biomeKey: string;
  /** Categories picked in the Start Farming modal (farm-only filter; empty = none). */
  sessionSelectedTiles: ReadonlyArray<string>;
  /** Boss spawn bias (resource key → multiplier), or null. */
  spawnBias: Record<string, number> | null;
  /** Fertilizer state: armed + the optional explicit target key. */
  fertilizer: { armed: boolean; targetKey: string | null };
  /** Biome tile keys — used to validate a fertilizer target key. */
  biomeTileKeys: ReadonlyArray<string>;
  poolWeights: Record<string, number>;
  tileCollectionActive: Record<string, string | null> | null;
  seasonName: SeasonName | null;
}

/**
 * Assemble the weighted spawn pool. Returns a fresh array; never mutates the
 * caller's `basePool`. Never returns `[]` unless `applySpawnPoolModifiers`
 * produces one from a genuinely empty base — the session filter falls back to
 * the unfiltered pool when it would otherwise empty the bag.
 */
export function buildSpawnPool(input: SpawnPoolInput): string[] {
  const {
    basePool,
    biomeKey,
    sessionSelectedTiles,
    spawnBias,
    fertilizer,
    biomeTileKeys,
    poolWeights,
    tileCollectionActive,
    seasonName,
  } = input;

  let pool = [...basePool];

  // Phase 2 — restrict the spawn pool to the categories the player picked in
  // the Start Farming modal. Farm board only; an over-restrictive selection
  // that empties the pool falls back to the unfiltered pool.
  if (biomeKey === "farm" && sessionSelectedTiles.length > 0) {
    const allowedCats = expandZoneCategories(sessionSelectedTiles);
    const filtered = pool.filter((k) => {
      const cat = CATEGORY_LOOKUP[k];
      return cat ? allowedCats.has(cat) : true;
    });
    if (filtered.length > 0) pool = filtered;
  }

  // Boss spawnBias: for each resource key, add (factor-1)*baseCount copies.
  if (spawnBias) {
    const baseCounts: Record<string, number> = {};
    for (const k of pool) baseCounts[k] = (baseCounts[k] ?? 0) + 1;
    for (const [k, factor] of Object.entries(spawnBias)) {
      const extra = Math.round((baseCounts[k] ?? 0) * (factor - 1));
      for (let i = 0; i < extra; i++) pool.push(k);
    }
  }

  // Fertilizer bias: double the copies of the target (or default seedling-tier)
  // keys already present in the pool.
  if (fertilizer.armed) {
    const biasKeys = fertilizer.targetKey
      ? [fertilizer.targetKey, `tile_${fertilizer.targetKey}`].filter(
          (k) => resourceByKey(k) || biomeTileKeys.includes(k),
        )
      : DEFAULT_FERTILIZER_BIAS_KEYS;
    const fBase: Record<string, number> = {};
    for (const k of pool) fBase[k] = (fBase[k] ?? 0) + 1;
    for (const k of biasKeys) {
      const extra = fBase[k] ?? 0;
      for (let i = 0; i < extra; i++) pool.push(k);
    }
  }

  return applySpawnPoolModifiers(pool, {
    poolWeights,
    tileCollectionActive,
    biomeKey,
    seasonName,
  });
}

export interface UpgradeResolveInput<T extends { key: string }> {
  /** The tile key being chained (its upgrade target is resolved). */
  tileKey: string;
  /** All resolvable biome tiles (the search space for the target). */
  biomeTiles: ReadonlyArray<T>;
  /** The active zone's farm-board upgradeMap (zoneCat → zoneCat), or null. */
  upgradeMap: Record<string, string | undefined> | null | undefined;
  /** Player's active tile per tile-category, or null. */
  tileCollectionActive: Record<string, string | null> | null;
  /** The biome's dedicated GOLD tile key (BIOME_GOLD_TILE[biomeKey]), or null. */
  goldTileKey: string | null;
}

/**
 * Resolve the tile a chain of `tileKey` upgrades into. Mirrors the former
 * GameScene.nextUpgradeTile body: map source tile-category → zone-category →
 * target zone-category via the zone's upgradeMap, honor the GOLD sentinel, then
 * prefer the player's active tile in the target category, falling back to the
 * first biome tile in any of the target's tile-categories. Returns null when no
 * target resolves. Pure given the registry/biome-derived inputs.
 */
export function resolveUpgradeTile<T extends { key: string }>(
  input: UpgradeResolveInput<T>,
): T | null {
  const { tileKey, biomeTiles, upgradeMap, tileCollectionActive, goldTileKey } = input;
  if (!tileKey) return null;
  if ((TILES_WITH_CUSTOM_OUTPUT as Set<string>).has(tileKey)) return null;

  const tileCat = CATEGORY_LOOKUP[tileKey];
  if (!tileCat) return null;
  const sourceZoneCat = (TILE_CATEGORY_TO_ZONE_CATEGORY as Record<string, string | undefined>)[tileCat];
  if (!sourceZoneCat) return null;

  if (!upgradeMap) return null;
  const targetZoneCat = upgradeMap[sourceZoneCat];
  if (!targetZoneCat) return null;

  // GOLD sentinel: spawn the biome's dedicated gold tile.
  if (targetZoneCat === ZONE_UPGRADE_TARGET_GOLD) {
    if (!goldTileKey) return null;
    return biomeTiles.find((t) => t.key === goldTileKey) ?? null;
  }

  const targetTileCats: string[] = (ZONE_TO_TILE_CATEGORIES as Record<string, string[]>)[targetZoneCat] ?? [];

  // Prefer the player's active tile in the target zone-category.
  if (tileCollectionActive) {
    for (const tc of targetTileCats) {
      const activeKey = tileCollectionActive[tc];
      if (!activeKey) continue;
      const r = biomeTiles.find((t) => t.key === activeKey);
      if (r) return r;
    }
  }

  // Fallback: first biome tile whose category matches the target tile-categories.
  for (const t of biomeTiles) {
    const cat = CATEGORY_LOOKUP[t.key];
    if (cat && targetTileCats.includes(cat)) return t;
  }

  return null;
}
