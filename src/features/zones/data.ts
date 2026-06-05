// Zone data — each map node IS a zone.
//
// ZONES is derived from MAP_NODES in cartography/data.js and keyed by node id
// (e.g. "home", "meadow", "quarry"). All engine code that previously used
// abstract ids like "zone1" now uses the location id directly.
//
// Zone config fields (defined on each MAP_NODE):
//   boards         — per-board-kind instances (farm: baseTurns/upgradeMap/seasonDrops;
//                    mine/fish: baseTurns only). Presence of a key means that board is enabled.
//   entryCost      — cost object to start a session
//   dangers        — per-location hazard list
//   buildings      — building ids available to build at this location
//
// Farm board instance fields (boards.farm):
//   upgradeMap     — source zone-category → spawned upgrade zone-category
//   seasonDrops    — per-season percentage drop rates per category
//
// Categories (upgradeMap keys / seasonDrops keys):
//   grass, grain, trees, birds, vegetables, fruits,
//   flowers, herd_animals, cattle, mounts
// Special upgrade target: "gold" (board-only coin tile, not in inventory).

import { MAP_NODES, type MapNode, type BoardKind, type ZoneBoards } from "../cartography/data.js";
import type {
  FarmBoardInstance,
  FishBoardInstance,
  MineBoardInstance,
} from "../../config/schemas/boardInstance.js";
import { ZONE_UPGRADE_TARGET_GOLD } from "../../config/schemas/boardInstance.js";
import type { BuildingId } from "../../types/catalog/buildings.js";
import type { SeasonId } from "../../types/catalog/seasons.js";
import type { ZoneCategoryId } from "../../types/catalog/tileCategories.js";
import { computeAggregatedAbilities } from "../workers/aggregate.js";
import { keeperForType } from "../../keepers.js";
import {
  DEFAULT_HOME_BIOME,
  EXPEDITION_FOOD_TURNS,
  EXPEDITION_MEAT_FOODS,
  SETTLEMENT_BIOMES,
} from "../../constants.js";
import type { TuningOverrides } from "../../config/schemas/tuning.js";
import type { GameState, HeirloomsState } from "../../types/state.js";

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
] as const);

export type ZoneCategoryKey = (typeof ZONE_CATEGORIES)[number];

export { ZONE_UPGRADE_TARGET_GOLD };

// Translation from the abstract zone-category names (used in the rules table)
// to the concrete `category` values that exist on items in
// `src/features/tileCollection/data.js`. Note that tileCollection uses
// `bird` (singular) where the rules table uses `birds` (plural). Categories
// like `wood` and `berry` are intentionally excluded — they're resources/
// items, not tile species, so they never appear in zone tile pickers.
export const ZONE_TO_TILE_CATEGORIES: Readonly<Record<string, string[]>> = Object.freeze({
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
  mining: ["mining", "stone"],
});

/**
 * Expand a list of zone-category names into the concrete tile-collection
 * category set used by the spawn pool filter.
 */
export function expandZoneCategories(zoneCats: readonly string[] | null | undefined): Set<string> {
  const out = new Set<string>();
  for (const c of zoneCats ?? []) {
    const targets = ZONE_TO_TILE_CATEGORIES[c];
    if (!targets) continue;
    for (const t of targets) out.add(t);
  }
  return out;
}

export const TILE_CATEGORY_TO_ZONE_CATEGORY: Readonly<Record<string, string>> = Object.freeze(
  Object.entries(ZONE_TO_TILE_CATEGORIES).reduce<Record<string, string>>((acc, [zoneCat, tileCats]) => {
    for (const t of tileCats) acc[t] = zoneCat;
    return acc;
  }, {}),
);

// Names indexed by `seasonIndexInSession` — match `SEASONS` in src/constants.js.
const SESSION_SEASON_NAMES = Object.freeze(["Spring", "Summer", "Autumn", "Winter"] as const);
export type SessionSeasonName = (typeof SESSION_SEASON_NAMES)[number];

/**
 * Phase 3b — split a session's `turnBudget` evenly across four seasons and
 * return the season index for the supplied `turnsUsed`. Returns 0..3.
 */
export function seasonIndexInSession(turnsUsed: number, turnBudget: number): number {
  const t = Math.max(0, Math.min(turnsUsed | 0, (turnBudget | 0) - 1));
  const S = Math.max(1, turnBudget | 0);
  for (let i = 0; i < 4; i++) {
    const end = Math.floor(((i + 1) * S) / 4);
    if (t < end) return i;
  }
  return 3;
}

export function seasonNameInSession(turnsUsed: number, turnBudget: number): SessionSeasonName {
  return SESSION_SEASON_NAMES[seasonIndexInSession(turnsUsed, turnBudget)];
}

export type { BoardKind, ZoneBoards };
export type { FarmBoardInstance, MineBoardInstance, FishBoardInstance };

export interface Zone {
  id: string;
  name: string;
  boards: ZoneBoards;
  entryCost: { coins?: number };
  dangers: string[];
  buildings: BuildingId[];
  plotCount: number;
}

function resolveZone(zoneOrId: string | Zone | undefined | null): Zone | null {
  if (!zoneOrId) return null;
  if (typeof zoneOrId === "string") return ZONES[zoneOrId] ?? null;
  return zoneOrId;
}

/** True when the zone has a board instance for the given kind. */
export function zoneHasBoard(zoneOrId: string | Zone | undefined | null, kind: BoardKind): boolean {
  const zone = resolveZone(zoneOrId);
  return !!zone?.boards?.[kind];
}

/** Return the board instance for a zone, or null when that board is not enabled. */
export function zoneBoard(
  zoneOrId: string | Zone | undefined | null,
  kind: BoardKind,
): FarmBoardInstance | MineBoardInstance | FishBoardInstance | null {
  const zone = resolveZone(zoneOrId);
  return zone?.boards?.[kind] ?? null;
}

/** Typed shortcut for the farm board instance on a zone. */
export function zoneFarmBoard(zoneOrId: string | Zone | undefined | null): FarmBoardInstance | null {
  const zone = resolveZone(zoneOrId);
  return zone?.boards?.farm ?? null;
}

export function zoneBaseTurns(
  zoneOrId: string | Zone | undefined | null,
  boardKind: BoardKind = "farm",
): number {
  const zone = resolveZone(zoneOrId);
  const board = zone?.boards?.[boardKind];
  const raw = board?.baseTurns ?? 10;
  return Math.max(0, Math.floor(Number(raw) || 0));
}

export function turnBudgetAdditiveBonusForZone(state: GameState, _zoneId?: string): number {
  const agg = computeAggregatedAbilities(state) as { turnBudgetBonus?: number } | undefined;
  let bonus = agg?.turnBudgetBonus ?? 0;
  if (state.tools?.extraTurn) bonus += 1;
  return bonus;
}

export interface TurnBudgetOpts {
  baseTurns?: number;
  additiveBonus?: number;
  bonusTurns?: number;
  multiplier?: number;
  useFertilizer?: boolean;
  boardKind?: BoardKind;
}

export function turnBudgetForZone(state: GameState, zoneId: string, opts: TurnBudgetOpts = {}): number {
  const boardKind = opts.boardKind ?? "farm";
  const baseTurns = opts.baseTurns ?? zoneBaseTurns(zoneId, boardKind);
  const additive = opts.additiveBonus ?? turnBudgetAdditiveBonusForZone(state, zoneId);
  const bonusTurns = opts.bonusTurns ?? 0;
  const multiplier = opts.multiplier ?? (opts.useFertilizer ? 2 : 1);
  return Math.max(1, Math.floor((baseTurns + additive + bonusTurns) * multiplier));
}

export interface ResourceRef {
  key: string;
  label?: string;
  next?: string | null;
}

export interface PickByDropsArgs {
  zoneId?: string;
  seasonName?: string;
  biomeResources?: ResourceRef[];
  tileCollectionActive?: Record<string, string | null>;
  categoryOf?: Record<string, string>;
  rng?: () => number;
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
}: PickByDropsArgs): ResourceRef | null {
  if (!zoneId || !seasonName) return null;
  const farm = zoneFarmBoard(zoneId);
  if (!farm?.seasonDrops) return null;
  const drops = farm.seasonDrops[seasonName as SeasonId];
  if (!drops) return null;

  const total = Object.values(drops).reduce((a: number, b: number) => a + (b > 0 ? b : 0), 0);
  if (total <= 0) return null;

  const r = (typeof rng === "function" ? rng() : Math.random()) * total;
  let acc = 0;
  let chosenZoneCat: string | null = null;
  for (const [zoneCat, pct] of Object.entries(drops) as Array<[string, number]>) {
    if (pct <= 0) continue;
    acc += pct;
    if (r <= acc) {
      chosenZoneCat = zoneCat;
      break;
    }
  }
  if (!chosenZoneCat) return null;

  const tileCats: string[] = ZONE_TO_TILE_CATEGORIES[chosenZoneCat] ?? [];

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

export interface NextResourceArgs {
  currentRes?: ResourceRef | null;
  zoneId?: string;
  biomeResources?: ResourceRef[];
  tileCollectionActive?: Record<string, string | null>;
  categoryOf?: Record<string, string>;
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
}: NextResourceArgs): ResourceRef | null {
  if (!currentRes || !zoneId) return null;
  const farm = zoneFarmBoard(zoneId);
  if (!farm?.upgradeMap) return null;

  const sourceTileCat = categoryOf?.[currentRes.key];
  if (!sourceTileCat) return null;

  const sourceZoneCat = TILE_CATEGORY_TO_ZONE_CATEGORY[sourceTileCat];
  if (!sourceZoneCat) return null;

  const targetZoneCat = farm.upgradeMap[sourceZoneCat as ZoneCategoryId];
  if (!targetZoneCat || targetZoneCat === ZONE_UPGRADE_TARGET_GOLD) return null;

  const targetTileCats: string[] = ZONE_TO_TILE_CATEGORIES[targetZoneCat] ?? [];

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
export function zoneCategories(zoneId: string): string[] {
  const farm = zoneFarmBoard(zoneId);
  if (!farm?.upgradeMap) return [];
  return Object.keys(farm.upgradeMap).slice(0, 8);
}

// ZONES is derived from MAP_NODES so node id === zone id.
// Engine code accesses ZONES[state.mapCurrent] or ZONES[state.activeZone]
// (activeZone mirrors mapCurrent, set in cartography/slice.js on CARTO/TRAVEL).
// Inner zone objects are intentionally NOT frozen — `applyZoneOverrides`
// mutates them in place so Dev Panel patches to boards.* take effect on the
// live module export. The outer dict is frozen so the set of zone ids is fixed.
export const ZONES: Readonly<Record<string, Zone>> = Object.freeze(
  Object.fromEntries(
    (MAP_NODES as MapNode[]).map((n) => [
      n.id,
      {
        id: n.id,
        name: n.name,
        boards: { ...n.boards },
        entryCost: n.entryCost ?? { coins: 0 },
        dangers: n.dangers ?? [],
        buildings: n.buildings ?? [],
        plotCount: n.plotCount ?? (n.buildings?.length ?? 0),
      } as Zone,
    ]),
  ) as Record<string, Zone>,
);

export const ZONE_IDS: ReadonlyArray<string> = Object.freeze(Object.keys(ZONES));

export const DEFAULT_ZONE = "home";

/**
 * Display name for a zone: the player-chosen `state.zoneNames[zoneId]` if set
 * (and non-blank), otherwise the static map-node name, otherwise the id.
 * Used wherever the settlement name is shown (Town header, etc).
 */
export function displayZoneName(state: GameState | null | undefined, zoneId?: string): string {
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
export let SETTLEMENT_FOUNDING_BASE_COINS = 300; // Dev Panel: tuning.foundingBaseCoins
export let SETTLEMENT_FOUNDING_GROWTH = 1.7;   // Dev Panel: tuning.foundingGrowth

/** Apply Dev Panel tuning fields owned by this module. */
export function applySettlementFoundingTuning(tuning: TuningOverrides): void {
  if (tuning.foundingBaseCoins !== undefined) SETTLEMENT_FOUNDING_BASE_COINS = tuning.foundingBaseCoins;
  if (tuning.foundingGrowth !== undefined) SETTLEMENT_FOUNDING_GROWTH = tuning.foundingGrowth;
}

/** Number of zones the player has founded. */
export function foundedSettlementCount(state: GameState | null | undefined): number {
  const map = state?.settlements ?? {};
  return Object.values(map).filter((s2) => !!s2 && !!s2.founded).length;
}

/** True if `zoneId` has been founded (or is `home`, which is always founded). */
export function isSettlementFounded(state: GameState | null | undefined, zoneId: string): boolean {
  if (zoneId === DEFAULT_ZONE) return true;
  return !!(state?.settlements?.[zoneId]?.founded);
}

/**
 * Coin cost to found the *next* settlement, given how many are already founded.
 * The k-th founding (k = current founded count, so the 2nd settlement is k=1)
 * costs `base * growth^(k-1)`.
 */
export function settlementFoundingCost(state: GameState | null | undefined): { coins: number } {
  const k = Math.max(1, foundedSettlementCount(state));
  return { coins: Math.round(SETTLEMENT_FOUNDING_BASE_COINS * Math.pow(SETTLEMENT_FOUNDING_GROWTH, k - 1)) };
}

/**
 * A settlement is "complete" once two conditions hold:
 *   1. enough local buildings are built to draw its keeper, AND
 *   2. its keeper has been resolved (Coexist or Drive Out — `settlementKeeperPath()`
 *      returns a non-null value).
 *
 * Settlements without a keeper type (e.g. crossroads, fairground — non-biome
 * map nodes) only need (1). Zones that have no buildings can never complete.
 */
export function settlementCompleted(state: GameState | null | undefined, zoneId: string): boolean {
  const z = ZONES[zoneId];
  if (!z) return false;
  const need = z.buildings ?? [];
  if (need.length === 0) return false;
  const built = state?.built?.[zoneId] ?? {};
  const have = need.filter((b) => built[b]).length;
  const type = settlementTypeForZone(zoneId);
  const keeper = type ? (keeperForType(type) as { appearsAfterBuildings?: number } | null) : null;
  const neededBuildings = keeper
    ? Math.max(1, keeper.appearsAfterBuildings ?? 4)
    : Math.ceil(need.length / 2);
  if (have < neededBuildings) return false;
  // Keeper gate: if this zone has a settlement type (farm/mine/harbor), require
  // the keeper choice be made. Non-settlement zones (rare; mostly defensive)
  // skip the gate.
  if (type && !settlementKeeperPath(state, zoneId)) return false;
  return true;
}

/** Count of zones that are both founded and completed. */
export function completedSettlementCount(state: GameState | null | undefined): number {
  const map = state?.settlements ?? {};
  return Object.keys(map).filter((id) => !!map[id]?.founded && settlementCompleted(state, id)).length;
}

// ─── Expedition rations (Phase 5, master doc §VI) ────────────────────────────
// Mine/Harbor rounds are supply-structured: bring food, each unit is worth a
// number of turns, and buildings (Larder, Smokehouse, Mining Camp / Pier) bump
// it. This is the value layer; the round flow that *consumes* a food stockpile
// to set a round's turn budget lands in Phase 5d.
//
// DEFERRED: NPC-bond modifiers (the doc has e.g. "Mira bond 10 → Iron Rations
// +1") and building *tiers* (Larder is "+1 per tier" — there are no building
// tiers yet, so it counts as +1) are not applied. Mining Camp / Pier use the
// doc's ids `mining_camp` / `pier` plus the live `harbor_dock` (the existing
// pier-equivalent building).

/** Is `foodKey` a recognised expedition ration? */
export function isExpeditionFood(foodKey: string): boolean {
  return Object.prototype.hasOwnProperty.call(EXPEDITION_FOOD_TURNS, foodKey);
}

/**
 * Turns one unit of `foodKey` is worth on an expedition from `zoneId`,
 * including that zone's building bonuses (master doc §VI). 0 if it isn't food.
 */
export function expeditionTurnsForFood(state: GameState | null | undefined, foodKey: string, zoneId?: string): number {
  if (zoneId === undefined) zoneId = (state?.mapCurrent ?? DEFAULT_ZONE);
  const base = (EXPEDITION_FOOD_TURNS as Record<string, number>)[foodKey];
  if (base == null) return 0;
  let turns: number = base;
  const built = state?.built?.[zoneId] ?? {};
  if (built.larder) turns += 1;                                            // Larder: +1 (per tier — no tiers yet)
  if (built.smokehouse && (EXPEDITION_MEAT_FOODS as string[]).includes(foodKey)) turns += 1; // Smokehouse: +1 to meat
  const type = settlementTypeForZone(zoneId);
  if (type === "mine" && built.mining_camp) turns += 1;                    // Mining Camp: +1 to all (mine only)
  if (type === "harbor" && (built.pier || built.harbor_dock)) turns += 1;  // Pier: +1 to all (harbor only)
  return turns;
}

/**
 * Total turn budget a `{ foodKey: count }` supply stockpile buys for an
 * expedition from `zoneId` — the sum of per-food turns × counts.
 */
export function expeditionTurnsFromSupply(state: GameState | null | undefined, supply: Record<string, number> | null | undefined, zoneId?: string): number {
  if (zoneId === undefined) zoneId = (state?.mapCurrent ?? DEFAULT_ZONE);
  let total = 0;
  for (const [foodKey, count] of Object.entries(supply ?? {})) {
    total += expeditionTurnsForFood(state, foodKey, zoneId) * Math.max(0, Math.floor(count));
  }
  return total;
}

// ─── Hearth-Tokens + the Old Capital gate (Phase 5b, master doc §III) ─────────
// Each completed settlement yields a token keyed by its *type*; collecting all
// three opens the Old Capital. `state.heirlooms.<token>` doubles as the
// per-type latch — once > 0 the token has been earned.
//
// Phase 6a wired the keeper gate into `settlementCompleted` (above): a zone
// only "completes" once enough buildings are up AND its keeper has been
// resolved. `grantEarnedHearthTokens` runs from both BUILD (after a building
// reaches the keeper threshold) and KEEPER/CONFRONT (when the keeper choice
// is the gating step). The Old Capital finale itself is intentionally
// undefined per the master doc — the map node is a locked stub.
const _KIND_BY_ID: Readonly<Record<string, string>> = Object.fromEntries((MAP_NODES as MapNode[]).map((n) => [n.id, n.kind]));

export type SettlementType = "farm" | "mine" | "harbor";

/** A zone's settlement type — 'farm' | 'mine' | 'harbor' — or null if it isn't a settlement. */
export function settlementTypeForZone(zoneId: string): SettlementType | null {
  const kind = _KIND_BY_ID[zoneId];
  if (kind === "home" || kind === "farm") return "farm";
  if (kind === "mine") return "mine";
  if (kind === "fish") return "harbor";
  return null;
}

export const HEARTH_TOKEN_FOR_TYPE: Readonly<Record<SettlementType, string>> = Object.freeze({
  farm: "heirloomSeed",
  mine: "pactIron",
  harbor: "tidesingerPearl",
});

/** All three Hearth-Tokens collected → the Old Capital is reachable. */
export function isOldCapitalUnlocked(state: GameState | null | undefined): boolean {
  // HeirloomsState's index sig is `unknown`; coerce per-key at the read site.
  const h = (state?.heirlooms ?? {}) as Record<string, number>;
  return Object.values(HEARTH_TOKEN_FOR_TYPE).every((tok) => (h[tok] ?? 0) >= 1);
}

/** How many of the three Hearth-Tokens the player holds (0–3). */
export function hearthTokenCount(state: GameState | null | undefined): number {
  const h = (state?.heirlooms ?? {}) as Record<string, number>;
  return Object.values(HEARTH_TOKEN_FOR_TYPE).filter((tok) => (h[tok] ?? 0) >= 1).length;
}

/**
 * Given a state, return an updated `heirlooms` object that has the Hearth-Token
 * for every founded + completed settlement (idempotent — never removes one).
 * Returns the original reference if nothing changed.
 */
export function grantEarnedHearthTokens(state: GameState | null | undefined): HeirloomsState {
  const map = state?.settlements ?? {};
  const h = (state?.heirlooms ?? { heirloomSeed: 0, pactIron: 0, tidesingerPearl: 0 }) as HeirloomsState;
  let next: HeirloomsState = h;
  for (const zoneId of Object.keys(map)) {
    if (!map[zoneId]?.founded || !settlementCompleted(state, zoneId)) continue;
    const type = settlementTypeForZone(zoneId);
    const tok = type ? HEARTH_TOKEN_FOR_TYPE[type] : null;
    if (!tok || ((next[tok] as number | undefined) ?? 0) >= 1) continue;
    if (next === h) next = { ...h };
    next[tok] = 1;
  }
  return next;
}

// ─── Settlement biomes (Phase 5e, master doc §IV) ────────────────────────────
// A biome is picked at founding; it fixes the settlement's two hazards + a
// resource bonus. `home`'s biome is implicit (DEFAULT_HOME_BIOME) since it's
// pre-founded and never goes through the picker.
//
// DEFERRED: the chosen biome's hazards aren't yet wired into the board's hazard
// spawning — GameScene still reads the static per-zone `ZONES[zoneId].dangers`.
// Swap that for `settlementHazards(state, zoneId)` in a follow-on. The biome
// `bonus` is descriptive only (not yet a spawn-rate multiplier).

export interface SettlementBiomeDef {
  id: string;
  name: string;
  look?: { icon?: string };
  hazards: string[];
  bonus?: string;
}

/** Biome options available when founding a settlement of `type`. */
export function biomesForType(type: SettlementType | null | undefined): SettlementBiomeDef[] {
  if (!type) return [];
  return ((SETTLEMENT_BIOMES as unknown) as Record<string, SettlementBiomeDef[]>)[type] ?? [];
}

/** The biome id chosen for `zoneId` (or DEFAULT_HOME_BIOME for home), else null. */
export function settlementBiomeId(state: GameState | null | undefined, zoneId: string): string | null {
  // Settlement entries carry a `biome` field via their open index sig; narrow it
  // to a string at the read boundary.
  const stored = state?.settlements?.[zoneId]?.biome;
  if (typeof stored === "string" && stored) return stored;
  return zoneId === DEFAULT_ZONE ? DEFAULT_HOME_BIOME : null;
}

/** The full biome def ({ id, name, icon, hazards, bonus }) for `zoneId`, else null. */
export function settlementBiome(state: GameState | null | undefined, zoneId: string): SettlementBiomeDef | null {
  const id = settlementBiomeId(state, zoneId);
  if (!id) return null;
  const type = settlementTypeForZone(zoneId);
  if (!type) return null;
  return (((SETTLEMENT_BIOMES as unknown) as Record<string, SettlementBiomeDef[]>)[type] ?? []).find((b: SettlementBiomeDef) => b.id === id) ?? null;
}

/** Hazards that appear in every round at `zoneId` — the biome's, falling back to the static per-zone list. */
export function settlementHazards(state: GameState | null | undefined, zoneId: string): string[] {
  const b = settlementBiome(state, zoneId);
  if (b && Array.isArray(b.hazards)) return b.hazards;
  return ZONES[zoneId]?.dangers ?? [];
}

/** Pick a biome for `type`: the one matching `wanted`, else the first option, else null. */
export function resolveBiomeChoice(type: SettlementType | null | undefined, wanted: string | undefined): SettlementBiomeDef | null {
  if (!type) return null;
  const list = ((SETTLEMENT_BIOMES as unknown) as Record<string, SettlementBiomeDef[]>)[type] ?? [];
  return list.find((b) => b.id === wanted) ?? list[0] ?? null;
}

// ─── Keeper encounters (Phase 6a) ────────────────────────────────────────────
// `state.settlements[zoneId].keeperPath` is 'coexist' | 'driveout' once faced.

/** Count of "real" buildings at a zone (excludes _plots / decorations bookkeeping). */
export function builtCountAt(state: GameState | null | undefined, zoneId: string): number {
  const built = state?.built?.[zoneId] ?? {};
  return Object.keys(built).filter((k) => k !== "_plots" && k !== "decorations" && built[k]).length;
}

/** The keeper path chosen at `zoneId` ('coexist' | 'driveout'), or null if unfaced. */
export function settlementKeeperPath(state: GameState | null | undefined, zoneId: string): "coexist" | "driveout" | null {
  const p = state?.settlements?.[zoneId]?.keeperPath;
  return p === "coexist" || p === "driveout" ? p : null;
}

/**
 * True when `zoneId`'s keeper is ready to be faced — the settlement is founded,
 * has a keeper type, hasn't faced it yet, and has built up enough (per the
 * keeper's `appearsAfterBuildings`).
 */
export function keeperReadyFor(state: GameState | null | undefined, zoneId: string): boolean {
  if (!isSettlementFounded(state, zoneId)) return false;
  if (settlementKeeperPath(state, zoneId)) return false;
  const type = settlementTypeForZone(zoneId);
  const keeper = type ? (keeperForType(type) as { appearsAfterBuildings?: number } | null) : null;
  if (!keeper) return false;
  return builtCountAt(state, zoneId) >= (keeper.appearsAfterBuildings ?? 4);
}
