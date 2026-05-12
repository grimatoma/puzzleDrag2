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

// Translation from the abstract zone-category names (used in the rules table)
// to the concrete `category` values that exist on items in
// `src/features/tileCollection/data.js`. Note that tileCollection uses
// `bird` (singular) where the rules table uses `birds` (plural). Categories
// like `wood` and `berry` are intentionally excluded — they're resources/
// items, not tile species, so they never appear in zone tile pickers.
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
 * Per-zone chain-upgrade redirect for farm tiles. Returns the resource that
 * should spawn as the next-tier upgrade tile, or null when the zone says no
 * tile (gold sentinel, no upgradeMap entry, or target category has no
 * resource on the biome). For farm-category resources (anything in
 * TILE_CATEGORY_TO_ZONE_CATEGORY) the result is authoritative — the zone
 * is the only source of upgrade behaviour.
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
// Inner zone objects are intentionally NOT frozen — `applyZoneOverrides`
// mutates them in place so Balance-Manager toggles (hasMine, hasWater, etc.)
// take effect on the live module export. The outer dict is frozen so the
// set of zone ids is fixed.
export const ZONES = Object.freeze(
  Object.fromEntries(
    MAP_NODES.map((n) => [
      n.id,
      {
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
        plotCount:    n.plotCount    ?? (n.buildings?.length ?? 0),
      },
    ]),
  ),
);

export const ZONE_IDS = Object.freeze(Object.keys(ZONES));

export const DEFAULT_ZONE = "home";

/**
 * Display name for a zone: the player-chosen `state.zoneNames[zoneId]` if set
 * (and non-blank), otherwise the static map-node name, otherwise the id.
 * Used wherever the settlement name is shown (Town header, etc).
 */
export function displayZoneName(state, zoneId) {
  const id = zoneId ?? state?.mapCurrent ?? DEFAULT_ZONE;
  const custom = state?.zoneNames?.[id];
  if (typeof custom === "string" && custom.trim()) return custom.trim();
  return ZONES[id]?.name ?? id;
}

// ─── Settlement founding (Phase 4) ───────────────────────────────────────────
// `home` is founded for free; founding any other zone costs an escalating coin
// price. These constants are tunable (mocked starting values).
//
// DEFERRED (Phase 4b): founding is recorded in state + dispatchable via
// FOUND_SETTLEMENT, but it is NOT yet *enforced* — building/playing at a
// not-yet-founded zone is still allowed (BUILD / StartFarming don't gate on
// isSettlementFounded), and there is no Kingdoms-hub UI on the cartography map
// that surfaces founded/completed status or a "Found this settlement" button.
// Wire both of those in 4b.
export const SETTLEMENT_FOUNDING_BASE_COINS = 300;
export const SETTLEMENT_FOUNDING_GROWTH = 1.7;

/** Number of zones the player has founded. */
export function foundedSettlementCount(state) {
  const map = state?.settlements ?? {};
  return Object.values(map).filter((s) => s && s.founded).length;
}

/** True if `zoneId` has been founded (or is `home`, which is always founded). */
export function isSettlementFounded(state, zoneId) {
  if (zoneId === DEFAULT_ZONE) return true;
  return !!(state?.settlements?.[zoneId]?.founded);
}

/**
 * Coin cost to found the *next* settlement, given how many are already founded.
 * The k-th founding (k = current founded count, so the 2nd settlement is k=1)
 * costs `base * growth^(k-1)`.
 */
export function settlementFoundingCost(state) {
  const k = Math.max(1, foundedSettlementCount(state));
  return { coins: Math.round(SETTLEMENT_FOUNDING_BASE_COINS * Math.pow(SETTLEMENT_FOUNDING_GROWTH, k - 1)) };
}

/**
 * A settlement is "complete" once at least half of the buildings available at
 * that zone have been built there. (Mocked threshold; tunable. Feeds the
 * Phase-7 metaplot — how many settlements have been completed.)
 */
export function settlementCompleted(state, zoneId) {
  const z = ZONES[zoneId];
  if (!z) return false;
  const need = (z.buildings ?? []).filter((b) => b !== "_plots");
  if (need.length === 0) return false;
  const built = state?.built?.[zoneId] ?? {};
  const have = need.filter((b) => built[b]).length;
  return have >= Math.ceil(need.length / 2);
}

/** Count of zones that are both founded and completed. */
export function completedSettlementCount(state) {
  const map = state?.settlements ?? {};
  return Object.keys(map).filter((id) => map[id]?.founded && settlementCompleted(state, id)).length;
}

// ─── Hearth-Tokens + the Old Capital gate (Phase 5b, master doc §III) ─────────
// Each completed settlement yields a token keyed by its *type*; collecting all
// three opens the Old Capital. `state.heirlooms.<token>` doubles as the
// per-type latch — once > 0 the token has been earned.
//
// DEFERRED: the doc says a settlement "completes" only once its keeper has been
// faced (the Coexist / Drive Out choice — Deer-Spirit for farms, Stone-Knocker
// for mines, Tidesinger for harbors). Those per-biome keepers don't exist yet
// (only the Frostmaw audit boss), so for now `settlementCompleted` (≥ half the
// zone's buildings built + founded) is the bar. Tighten when the keepers land.
// The Old Capital finale itself is intentionally undefined per the doc — the
// map node is a locked stub.
const _KIND_BY_ID = Object.fromEntries(MAP_NODES.map((n) => [n.id, n.kind]));

/** A zone's settlement type — 'farm' | 'mine' | 'harbor' — or null if it isn't a settlement. */
export function settlementTypeForZone(zoneId) {
  const kind = _KIND_BY_ID[zoneId];
  if (kind === "home" || kind === "farm") return "farm";
  if (kind === "mine") return "mine";
  if (kind === "fish") return "harbor";
  return null;
}

export const HEARTH_TOKEN_FOR_TYPE = Object.freeze({
  farm: "heirloomSeed",
  mine: "pactIron",
  harbor: "tidesingerPearl",
});

/** All three Hearth-Tokens collected → the Old Capital is reachable. */
export function isOldCapitalUnlocked(state) {
  const h = state?.heirlooms ?? {};
  return Object.values(HEARTH_TOKEN_FOR_TYPE).every((tok) => (h[tok] ?? 0) >= 1);
}

/** How many of the three Hearth-Tokens the player holds (0–3). */
export function hearthTokenCount(state) {
  const h = state?.heirlooms ?? {};
  return Object.values(HEARTH_TOKEN_FOR_TYPE).filter((tok) => (h[tok] ?? 0) >= 1).length;
}

/**
 * Given a state, return an updated `heirlooms` object that has the Hearth-Token
 * for every founded + completed settlement (idempotent — never removes one).
 * Returns the original reference if nothing changed.
 */
export function grantEarnedHearthTokens(state) {
  const map = state?.settlements ?? {};
  const h = state?.heirlooms ?? {};
  let next = h;
  for (const zoneId of Object.keys(map)) {
    if (!map[zoneId]?.founded || !settlementCompleted(state, zoneId)) continue;
    const type = settlementTypeForZone(zoneId);
    const tok = type && HEARTH_TOKEN_FOR_TYPE[type];
    if (!tok || (next[tok] ?? 0) >= 1) continue;
    if (next === h) next = { ...h };
    next[tok] = 1;
  }
  return next;
}

// Phase 6 — Balance Manager hook. Apply any committed/draft overrides from
// `src/config/balance.json` + the localStorage draft to the live ZONES table.
import { BALANCE_OVERRIDES } from "../../constants.js";
import { applyZoneOverrides } from "../../config/applyOverrides.js";
applyZoneOverrides(ZONES, BALANCE_OVERRIDES.zones);
