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
// `src/features/tileCollection/data.js`. Note that tileCollection uses
// `bird` (singular) where the rules table uses `birds` (plural). Categories
// like `wood` and `berry` are intentionally excluded — they're resources/
// items, not tile species, so they never appear in zone tile pickers.
//
// Phase 2 uses this to filter the spawn pool by the player's selected tiles
// in the Start Farming modal.
export const ZONE_TO_TILE_CATEGORIES = Object.freeze({
  grass: ["grass"],
  grain: ["grain"],
  trees: ["trees"],
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

// Names indexed by `seasonIndexInSession` — match `SEASONS` in src/constants.js.
const SESSION_SEASON_NAMES = Object.freeze(["Spring", "Summer", "Autumn", "Winter"]);

/**
 * Phase 3b — split a session's `sessionMaxTurns` evenly across the four
 * seasons and return the season index for the supplied `turnsUsed`. Each
 * season covers `floor(i+1) * S / 4` - `floor(i * S / 4)` turns; for S=16
 * that is 4/4/4/4, for S=10 that is 2/3/2/3. Returns 0..3.
 */
export function seasonIndexInSession(turnsUsed, sessionMaxTurns) {
  const t = Math.max(0, Math.min(turnsUsed | 0, (sessionMaxTurns | 0) - 1));
  const S = Math.max(1, sessionMaxTurns | 0);
  for (let i = 0; i < 4; i++) {
    const end = Math.floor(((i + 1) * S) / 4);
    if (t < end) return i;
  }
  return 3;
}

/**
 * Convenience: name (Spring/Summer/Autumn/Winter) for the current session
 * turn. Useful for keying into a zone's seasonDrops table.
 */
export function seasonNameInSession(turnsUsed, sessionMaxTurns) {
  return SESSION_SEASON_NAMES[seasonIndexInSession(turnsUsed, sessionMaxTurns)];
}

/**
 * Phase 3b — sample a tile from the active zone's per-(zone, season) drop
 * table. Returns null when the zone has no entry, the season's table is
 * empty, or no resource matches the rolled category — in those cases the
 * caller should fall back to the existing weighted pool.
 *
 * The picker is biome-agnostic and pure: callers pass the biome's resource
 * list, the player's active species map, and a 0..1 random source so tests
 * can stub it deterministically.
 */
export function pickByZoneSeasonDrops({
  zoneId,
  seasonName,
  biomeResources,
  tileCollectionActive,
  categoryOf,
  rng,
}) {
  if (!zoneId) return null;
  const zone = ZONES[zoneId];
  if (!zone || !zone.seasonDrops) return null;
  const drops = zone.seasonDrops[seasonName];
  if (!drops) return null;

  const total = Object.values(drops).reduce((a, b) => a + (b > 0 ? b : 0), 0);
  if (total <= 0) return null;

  const r = (typeof rng === "function" ? rng() : Math.random()) * total;
  let acc = 0;
  let chosenZoneCat = null;
  for (const [zoneCat, pct] of Object.entries(drops)) {
    if (pct <= 0) continue;
    acc += pct;
    if (r <= acc) {
      chosenZoneCat = zoneCat;
      break;
    }
  }
  if (!chosenZoneCat) return null;

  const tileCats = ZONE_TO_TILE_CATEGORIES[chosenZoneCat] ?? [];

  // Prefer the player's active species when set.
  if (tileCollectionActive) {
    for (const tc of tileCats) {
      const activeKey = tileCollectionActive[tc];
      if (!activeKey) continue;
      const r2 = biomeResources?.find((res) => res.key === activeKey);
      if (r2) return r2;
    }
  }

  // Otherwise fall back to the first biome resource whose category matches.
  for (const r2 of biomeResources ?? []) {
    const cat = categoryOf?.[r2.key];
    if (cat && tileCats.includes(cat)) return r2;
  }
  return null;
}

/**
 * Returns true when the zone has an explicit upgrade-map entry for the
 * source resource's category. Used by the chain pipeline to decide whether
 * to fall back to the resource's native `next` when `nextResourceForZone`
 * returns null — when the override is explicit (e.g. fruits → gold), the
 * caller should respect it and NOT fall back to the native chain.
 */
export function zoneHasExplicitUpgradeOverride({ currentRes, zoneId, categoryOf }) {
  if (!currentRes || !zoneId) return false;
  const zone = ZONES[zoneId];
  if (!zone || !zone.upgradeMap) return false;
  const sourceTileCat = categoryOf?.[currentRes.key];
  if (!sourceTileCat) return false;
  const sourceZoneCat = TILE_CATEGORY_TO_ZONE_CATEGORY[sourceTileCat];
  if (!sourceZoneCat) return false;
  return Object.prototype.hasOwnProperty.call(zone.upgradeMap, sourceZoneCat);
}

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

// Phase 3b — example zone-1 drops illustrating the user-facing mechanic
// ("trees 20% in Spring, 70% in Winter"). All values are percentages on
// [0, 1] that sum to 1 within each season. Other zones keep an empty
// table for now (the sampler falls through to the existing pool when a
// season has no data).
const ZONE_1_SEASON_DROPS = {
  Spring: {
    grass: 0.20,
    grain: 0.15,
    trees: 0.20,
    birds: 0.05,
    vegetables: 0.10,
    fruits: 0.30,
  },
  Summer: {
    grass: 0.10,
    grain: 0.30,
    trees: 0.10,
    birds: 0.15,
    vegetables: 0.20,
    fruits: 0.15,
  },
  Autumn: {
    grass: 0.10,
    grain: 0.15,
    trees: 0.40,
    birds: 0.15,
    vegetables: 0.15,
    fruits: 0.05,
  },
  Winter: {
    grass: 0.05,
    grain: 0.05,
    trees: 0.70,
    birds: 0.10,
    vegetables: 0.05,
    fruits: 0.05,
  },
};

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
    seasonDrops: ZONE_1_SEASON_DROPS,
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

// Phase 6 — Balance Manager hook. Apply any committed/draft overrides from
// `src/config/balance.json` + the localStorage draft to the live ZONES table
// at module load time. Imports are hoisted so the apply call runs after the
// table is initialised.
import { BALANCE_OVERRIDES } from "../../constants.js";
import { applyZoneOverrides } from "../../config/applyOverrides.js";
applyZoneOverrides(ZONES, BALANCE_OVERRIDES.zones);
