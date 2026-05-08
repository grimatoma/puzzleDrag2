// Zone data — each map node IS a zone.
//
// ZONES is derived from MAP_NODES in cartography/data.js and keyed by node id
// (e.g. "home", "meadow", "quarry"). All engine code that previously used
// abstract ids like "zone1" now uses the location id directly.
//
// Zone config fields (defined on each MAP_NODE):
//   hasFarm / hasMine / hasWater — which puzzle boards the location exposes
//   startingTurns  — total puzzle turns per session
//   entryCost      — cost object to start a session
//   upgradeMap     — source zone-category → spawned upgrade zone-category
//   seasonDrops    — per-season percentage drop rates per category
//   dangers        — per-location hazard list
//   buildings      — building ids available to build at this location
//
// Categories (upgradeMap keys / seasonDrops keys):
//   grass, grain, trees, birds, vegetables, fruits,
//   flowers, herd_animals, cattle, mounts
// Special upgrade target: "gold" (board-only coin tile, not in inventory).

import { MAP_NODES } from "../cartography/data.js";

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
 * Expand a list of zone-category names into the concrete tile-collection
 * category set used by the spawn pool filter.
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

export const TILE_CATEGORY_TO_ZONE_CATEGORY = Object.freeze(
  Object.entries(ZONE_TO_TILE_CATEGORIES).reduce((acc, [zoneCat, tileCats]) => {
    for (const t of tileCats) acc[t] = zoneCat;
    return acc;
  }, {}),
);

// Names indexed by `seasonIndexInSession` — match `SEASONS` in src/constants.js.
const SESSION_SEASON_NAMES = Object.freeze(["Spring", "Summer", "Autumn", "Winter"]);

/**
 * Phase 3b — split a session's `sessionMaxTurns` evenly across four seasons
 * and return the season index for the supplied `turnsUsed`. Returns 0..3.
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

export function seasonNameInSession(turnsUsed, sessionMaxTurns) {
  return SESSION_SEASON_NAMES[seasonIndexInSession(turnsUsed, sessionMaxTurns)];
}

/**
 * Phase 3b — sample a tile from the active zone's per-(zone, season) drop
 * table. Returns null when the zone has no entry or no resource matches.
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

  if (tileCollectionActive) {
    for (const tc of tileCats) {
      const activeKey = tileCollectionActive[tc];
      if (!activeKey) continue;
      const r2 = biomeResources?.find((res) => res.key === activeKey);
      if (r2) return r2;
    }
  }

  for (const r2 of biomeResources ?? []) {
    const cat = categoryOf?.[r2.key];
    if (cat && tileCats.includes(cat)) return r2;
  }
  return null;
}

/**
 * Per-zone chain-upgrade redirect. Returns null when the zone has no override
 * or the target is the "gold" sentinel. Callers fall back to native .next chain.
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

  if (tileCollectionActive) {
    for (const tc of targetTileCats) {
      const activeKey = tileCollectionActive[tc];
      if (!activeKey) continue;
      const r = biomeResources?.find((res) => res.key === activeKey);
      if (r) return r;
    }
  }

  for (const r of biomeResources ?? []) {
    const cat = categoryOf?.[r.key];
    if (cat && targetTileCats.includes(cat)) return r;
  }

  return null;
}

/**
 * Source categories the zone exposes on the board (keys of upgradeMap).
 * Returns at most 8 entries — the "8 fixed slots" rule from the Start Farming modal.
 */
export function zoneCategories(zoneId) {
  const z = ZONES[zoneId];
  if (!z) return [];
  return Object.keys(z.upgradeMap).slice(0, 8);
}

// ZONES is derived from MAP_NODES so node id === zone id.
// Engine code accesses ZONES[state.mapCurrent] or ZONES[state.activeZone]
// (activeZone mirrors mapCurrent, set in cartography/slice.js on CARTO/TRAVEL).
export const ZONES = Object.freeze(
  Object.fromEntries(
    MAP_NODES.map((n) => [
      n.id,
      Object.freeze({
        id:           n.id,
        name:         n.name,
        hasFarm:      n.hasFarm  ?? false,
        hasMine:      n.hasMine  ?? false,
        hasWater:     n.hasWater ?? false,
        startingTurns: n.startingTurns ?? 16,
        entryCost:    n.entryCost    ?? { coins: 0 },
        upgradeMap:   n.upgradeMap   ?? {},
        seasonDrops:  n.seasonDrops  ?? { Spring: {}, Summer: {}, Autumn: {}, Winter: {} },
        dangers:      n.dangers      ?? [],
        buildings:    n.buildings    ?? [],
      }),
    ]),
  ),
);

export const ZONE_IDS = Object.freeze(Object.keys(ZONES));

export const DEFAULT_ZONE = "home";

// Phase 6 — Balance Manager hook. Apply any committed/draft overrides from
// `src/config/balance.json` + the localStorage draft to the live ZONES table.
import { BALANCE_OVERRIDES } from "../../constants.js";
import { applyZoneOverrides } from "../../config/applyOverrides.js";
applyZoneOverrides(ZONES, BALANCE_OVERRIDES.zones);
