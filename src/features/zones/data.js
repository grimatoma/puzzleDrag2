// Zone definitions — Phase 1 of the rule overhaul.
//
// A "zone" is a town container that owns its own farm board (and optionally
// mine / water boards). Each zone configures:
//   - startingTurns   : total puzzle turns for a session
//   - hasFarm/Mine/Water: which biome boards the zone exposes
//   - upgradeMap      : source category -> spawned upgrade tile category
//                       (consumed by the chain pipeline in Phase 3)
//   - dangers         : per-zone hazard list (consumed in a later phase)
//   - entryCost       : cost to start a farm session
//   - seasonDrops     : per-season percentage drop rates per category
//                       (consumed by the spawn pipeline in Phase 3)
//
// Categories referenced here are the abstract ten the request lists:
//   grass, grain, trees, birds, vegetables, fruits,
//   flowers, herd_animals, cattle, mounts
// Plus a special upgrade target "gold" which spawns a gold-coin tile.
//
// Phase 1 ships only the schema + data. The engine still uses the global
// FARM_TILE_POOL / UPGRADE_THRESHOLDS until later phases swap them in.

export const ZONE_CATEGORIES = Object.freeze([
  "grass",
  "grain",
  "trees",
  "birds",
  "vegetables",
  "fruits",
  "flowers",
  "herd_animals",
  "cattle",
  "mounts",
]);

export const ZONE_UPGRADE_TARGET_GOLD = "gold";

// Translation from the abstract zone-category names (used in the rules table)
// to the concrete `category` values that exist on items in
// `src/features/tileCollection/data.js`. The mapping is one-to-many because
// our internal model splits some user-level categories — e.g. "trees" covers
// both the tile-collection `trees` species and the legacy `wood` chain. Note
// that tileCollection uses `bird` (singular) where the rules table uses
// `birds` (plural).
//
// Phase 2 uses this to filter the spawn pool by the player's selected tiles
// in the Start Farming modal.
export const ZONE_TO_TILE_CATEGORIES = Object.freeze({
  grass: ["grass"],
  grain: ["grain"],
  trees: ["trees", "wood"],
  birds: ["bird"],
  vegetables: ["vegetables"],
  fruits: ["fruits"],
  flowers: ["flowers"],
  herd_animals: ["herd_animals"],
  cattle: ["cattle"],
  mounts: ["mounts"],
});

/**
 * Expand a list of zone-category names (e.g. ["birds", "trees"]) into the
 * concrete tile-collection category set used by the spawn pool filter.
 */
export function expandZoneCategories(zoneCats) {
  const out = new Set();
  for (const c of zoneCats ?? []) {
    const targets = ZONE_TO_TILE_CATEGORIES[c];
    if (!targets) continue;
    for (const t of targets) out.add(t);
  }
  return out;
}

// Reverse of ZONE_TO_TILE_CATEGORIES: given a tile-collection category
// (e.g. "wood" or "bird"), return the zone-level category it belongs to.
// Many-to-one for the cases we splice (wood + trees both -> "trees"), but
// one-to-one for everything else.
export const TILE_CATEGORY_TO_ZONE_CATEGORY = Object.freeze(
  Object.entries(ZONE_TO_TILE_CATEGORIES).reduce((acc, [zoneCat, tileCats]) => {
    for (const t of tileCats) acc[t] = zoneCat;
    return acc;
  }, {}),
);

/**
 * Per-zone chain-upgrade redirect.
 *
 * Given the current chain's source resource, look up the active zone's
 * `upgradeMap` to find the upgrade-target zone-category and resolve it to a
 * concrete resource on the supplied biome. Returns `null` when the zone has
 * no override, the target is the special "gold" sentinel (board-only tile,
 * not modeled yet), or no matching resource exists on the biome.
 *
 * Callers should fall back to the resource's native `.next` chain when this
 * helper returns `null` so the existing engine behaviour stays intact for
 * resources/categories the zones config doesn't redirect.
 */
export function nextResourceForZone({
  currentRes,
  zoneId,
  biomeResources,
  tileCollectionActive,
  categoryOf,
}) {
  if (!currentRes || !zoneId) return null;
  const zone = ZONES[zoneId];
  if (!zone || !zone.upgradeMap) return null;

  const sourceTileCat = categoryOf?.[currentRes.key];
  if (!sourceTileCat) return null;

  const sourceZoneCat = TILE_CATEGORY_TO_ZONE_CATEGORY[sourceTileCat];
  if (!sourceZoneCat) return null;

  const targetZoneCat = zone.upgradeMap[sourceZoneCat];
  if (!targetZoneCat || targetZoneCat === ZONE_UPGRADE_TARGET_GOLD) return null;

  const targetTileCats = ZONE_TO_TILE_CATEGORIES[targetZoneCat] ?? [];

  // Prefer the player's active species for the target category if any.
  if (tileCollectionActive) {
    for (const tc of targetTileCats) {
      const activeKey = tileCollectionActive[tc];
      if (!activeKey) continue;
      const r = biomeResources?.find((res) => res.key === activeKey);
      if (r) return r;
    }
  }

  // Otherwise fall back to the first biome resource whose category matches.
  for (const r of biomeResources ?? []) {
    const cat = categoryOf?.[r.key];
    if (cat && targetTileCats.includes(cat)) return r;
  }

  return null;
}

const FARM_ENTRY_COST = Object.freeze({ coins: 50 });

// Helper: empty four-season drop table — each category -> 0 for all seasons.
// Per-zone overrides fill in the configured percentages; unfilled cells stay at 0.
const emptySeasonDrops = () => ({
  Spring: {},
  Summer: {},
  Autumn: {},
  Winter: {},
});

export const ZONES = Object.freeze({
  zone1: {
    id: "zone1",
    name: "Zone 1",
    startingTurns: 16,
    hasFarm: true,
    hasMine: false,
    hasWater: false,
    entryCost: FARM_ENTRY_COST,
    upgradeMap: {
      grass: "birds",
      grain: "vegetables",
      trees: "birds",
      birds: "herd_animals",
      vegetables: "fruits",
      fruits: ZONE_UPGRADE_TARGET_GOLD,
    },
    dangers: [],
    seasonDrops: emptySeasonDrops(),
  },
  zone2: {
    id: "zone2",
    name: "Zone 2",
    startingTurns: 10,
    hasFarm: true,
    hasMine: true,
    hasWater: false,
    entryCost: FARM_ENTRY_COST,
    upgradeMap: {
      grass: "birds",
      grain: "vegetables",
      trees: "birds",
      birds: "vegetables",
      vegetables: "fruits",
      fruits: ZONE_UPGRADE_TARGET_GOLD,
    },
    dangers: [],
    seasonDrops: emptySeasonDrops(),
  },
  zone3: {
    id: "zone3",
    name: "Zone 3",
    startingTurns: 16,
    hasFarm: true,
    hasMine: true,
    hasWater: true,
    entryCost: FARM_ENTRY_COST,
    upgradeMap: {
      grass: "grain",
      grain: "vegetables",
      trees: "vegetables",
      birds: "herd_animals",
      vegetables: "fruits",
      fruits: ZONE_UPGRADE_TARGET_GOLD,
      herd_animals: ZONE_UPGRADE_TARGET_GOLD,
    },
    dangers: [],
    seasonDrops: emptySeasonDrops(),
  },
  zone4: {
    id: "zone4",
    name: "Zone 4",
    startingTurns: 10,
    hasFarm: true,
    hasMine: true,
    hasWater: false,
    entryCost: FARM_ENTRY_COST,
    upgradeMap: {
      grass: "grain",
      grain: "vegetables",
      trees: "birds",
      birds: "herd_animals",
      vegetables: "fruits",
      fruits: ZONE_UPGRADE_TARGET_GOLD,
      herd_animals: ZONE_UPGRADE_TARGET_GOLD,
    },
    dangers: [],
    seasonDrops: emptySeasonDrops(),
  },
  zone5: {
    id: "zone5",
    name: "Zone 5",
    startingTurns: 16,
    hasFarm: true,
    hasMine: true,
    hasWater: true,
    entryCost: FARM_ENTRY_COST,
    upgradeMap: {
      grass: "grain",
      grain: "vegetables",
      trees: "birds",
      birds: "herd_animals",
      vegetables: "fruits",
      fruits: "flowers",
      flowers: ZONE_UPGRADE_TARGET_GOLD,
      herd_animals: "cattle",
      cattle: ZONE_UPGRADE_TARGET_GOLD,
    },
    dangers: [],
    seasonDrops: emptySeasonDrops(),
  },
  zone6: {
    id: "zone6",
    name: "Zone 6",
    startingTurns: 16,
    hasFarm: true,
    hasMine: false,
    hasWater: true,
    entryCost: FARM_ENTRY_COST,
    upgradeMap: {
      grass: "grain",
      grain: "vegetables",
      trees: "birds",
      birds: "herd_animals",
      vegetables: "fruits",
      fruits: "flowers",
      flowers: ZONE_UPGRADE_TARGET_GOLD,
      herd_animals: "cattle",
      cattle: "mounts",
      mounts: ZONE_UPGRADE_TARGET_GOLD,
    },
    dangers: [],
    seasonDrops: emptySeasonDrops(),
  },
});

export const ZONE_IDS = Object.freeze(Object.keys(ZONES));

export const DEFAULT_ZONE = "zone1";

/**
 * Source categories the zone exposes on the board (keys of upgradeMap).
 * Returns at most 8 entries — the "8 fixed slots, 1 per type" rule from the
 * Start Farming modal. Zones that permit fewer categories simply expose fewer.
 */
export function zoneCategories(zoneId) {
  const z = ZONES[zoneId];
  if (!z) return [];
  return Object.keys(z.upgradeMap).slice(0, 8);
}
