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
