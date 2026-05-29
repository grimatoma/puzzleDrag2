import { TILE_TYPES, TILE_TYPES_MAP, CATEGORY_OF } from "./data.js";
import { BIOMES } from "../../constants.js";
import type { GameState } from "../../types/state.js";

interface TileTypeDiscovery {
  method?: string;
  chainLengthOf?: string;
  chainLength?: number;
  researchOf?: string;
  researchAmount?: number;
  coinCost?: number;
  day?: number;
  buildingId?: string;
}

interface TileTypeDef {
  id: string;
  category: string;
  displayName: string;
  tier?: number;
  baseResource?: string;
  description?: string | null;
  discovery?: TileTypeDiscovery;
  effects?: Record<string, unknown>;
  abilities?: Array<Record<string, unknown>>;
}

interface ChainCommit {
  resourceKey: string;
  chainLength: number;
}

// ─── 5.4 — Chain-length discovery ─────────────────────────────────────────

/**
 * Pure function: checks all chain-method tile types against the given chain commit.
 * Returns { discoveredIds, newDiscoveredMap }.
 */
export function discoverTileTypesFromChain(state: GameState, { resourceKey, chainLength }: ChainCommit): { discoveredIds: string[]; newDiscoveredMap: Record<string, boolean> } {
  const known: Record<string, boolean> = state.tileCollection?.discovered ?? {};
  const ids: string[] = [];
  const typesMap = TILE_TYPES_MAP as Record<string, TileTypeDef>;
  for (const t of TILE_TYPES as TileTypeDef[]) {
    if (t.discovery?.method !== "chain") continue;
    if (t.discovery.chainLengthOf !== resourceKey) continue;
    if (chainLength < (t.discovery.chainLength ?? 0)) continue;
    if (known[t.id]) continue;
    ids.push(t.id);
  }
  if (ids.length === 0) {
    return { discoveredIds: [], newDiscoveredMap: known };
  }
  // Stable order: tier ascending, then id alphabetical
  ids.sort((a, b) => {
    const ta = typesMap[a];
    const tb = typesMap[b];
    return ((ta?.tier ?? 0) - (tb?.tier ?? 0)) || (a < b ? -1 : a > b ? 1 : 0);
  });
  const newDiscoveredMap: Record<string, boolean> = { ...known };
  for (const id of ids) newDiscoveredMap[id] = true;
  return { discoveredIds: ids, newDiscoveredMap };
}

// ─── 5.6 — Board pool wiring ───────────────────────────────────────────────

/**
 * Returns the active tile type id for the category that contains `key`, or null.
 */
function activeIdForKey(state: GameState, key: string): string | null {
  const cat = (CATEGORY_OF as Record<string, string | undefined>)[key];
  if (!cat) return null;
  return state.tileCollection?.activeByCategory?.[cat] ?? null;
}

/**
 * Pure helper: given game state and a biome key, returns the weighted spawn pool
 * as a flat array of resource keys.
 */
export function getActivePool(state: GameState, biomeKey: string = "farm"): string[] {
  const biomeMap = BIOMES as unknown as Record<string, { pool?: string[] } | undefined>;
  const base: string[] = biomeMap[biomeKey]?.pool ?? [];
  const active: Record<string, string | null> = state.tileCollection?.activeByCategory ?? {};
  const out: string[] = [];

  for (const baseKey of base) {
    const cat = (CATEGORY_OF as Record<string, string | undefined>)[baseKey];
    if (!cat) {
      // Key has no tile collection category — include as-is
      out.push(baseKey);
      continue;
    }
    const a = active[cat];
    if (a === null || a === undefined) continue; // category disabled — drop slot
    out.push(a); // substitute the active tile type variant
  }

  // Worker pool_weight boost — gated by active tile type. `registry` is a
  // test-only side channel for synthesised effective-pool-weights snapshots;
  // production callers don't set it, in which case the default `{}` skips this
  // branch entirely.
  const registry = (state as { registry?: { effectivePoolWeights?: Record<string, number> } }).registry;
  const boosts: Record<string, number> = registry?.effectivePoolWeights ?? {};
  for (const [k, n] of Object.entries(boosts)) {
    if (activeIdForKey(state, k) !== k) continue; // boost key must be the active tile type
    const copies = Math.max(0, Math.round(n));
    for (let i = 0; i < copies; i++) out.push(k);
  }
  return out;
}

// ─── 5.8 — Category view model ────────────────────────────────────────────

const CATEGORY_PREFIXES = [
  "grass_", "grain_", "wood_", "berry_", "bird_", "veg_",
  "fruit_", "flower_", "tree_", "herd_", "cattle_", "mount_",
  "mine_", "fish_", "special_",
];

export function displayKey(k: string): string {
  if (typeof k !== "string") return k;
  // Strip the universal tile_ prefix first, then strip the family prefix.
  let s = k;
  if (s.startsWith("tile_")) s = s.slice(5);
  for (const p of CATEGORY_PREFIXES) {
    if (s.startsWith(p)) return s.slice(p.length);
  }
  return s;
}

function statusFor(state: GameState, t: TileTypeDef): string {
  const disc = state.tileCollection?.discovered?.[t.id];
  const d: TileTypeDiscovery = t.discovery ?? {};

  if (d.method === "default") return "Default — always available";

  if (disc) {
    if (d.method === "chain") {
      return `Discovered — chain ${d.chainLength} ${displayKey(d.chainLengthOf ?? "")} to find`;
    }
    if (d.method === "research") return `Discovered — researched ${displayKey(d.researchOf ?? "")}`;
    if (d.method === "buy") return "Discovered — purchased";
    if (d.method === "daily") return `Discovered — Day ${d.day} daily reward`;
    if (d.method === "building") return `Discovered — built ${d.buildingId ?? ""}`;
  }

  // Not yet discovered
  if (d.method === "research") {
    const p = state.tileCollection?.researchProgress?.[t.id] ?? 0;
    return `Researching ${displayKey(d.researchOf ?? "")}: ${p} / ${d.researchAmount}`;
  }
  if (d.method === "chain") {
    return `Locked — chain ${d.chainLength} ${displayKey(d.chainLengthOf ?? "")} to discover`;
  }
  if (d.method === "buy") {
    return `Buy ${d.coinCost}◉`;
  }
  if (d.method === "daily") {
    return `Locked — Day ${d.day} daily reward`;
  }
  if (d.method === "building") {
    return `Locked — build ${d.buildingId ?? "a building"} to discover`;
  }
  return "Locked";
}

export interface CategoryRowViewModel {
  id: string;
  name: string;
  active: boolean;
  locked: boolean;
  status: string;
  action: "toggle" | "buy" | null;
  discovery: TileTypeDiscovery;
  researchProgress: number;
  effects: Record<string, unknown>;
  abilities: Array<Record<string, unknown>>;
  tier: number;
  baseResource: string | undefined;
  description: string | null | undefined;
}

/**
 * Returns an array of view-model rows for the given category.
 */
export function getCategoryViewModel(state: GameState, category: string): CategoryRowViewModel[] {
  return (TILE_TYPES as TileTypeDef[]).filter((t) => t.category === category).map((t) => {
    const locked = !state.tileCollection?.discovered?.[t.id];
    const active = !locked && state.tileCollection?.activeByCategory?.[category] === t.id;
    const action: "toggle" | "buy" | null = locked
      ? (t.discovery?.method === "buy" ? "buy" : null)
      : "toggle";
    return {
      id: t.id,
      name: t.displayName,
      active,
      locked,
      status: statusFor(state, t),
      action,
      discovery: t.discovery ?? {},
      researchProgress: state.tileCollection?.researchProgress?.[t.id] ?? 0,
      effects: t.effects ?? {},
      abilities: t.abilities ?? [],
      tier: t.tier ?? 0,
      baseResource: t.baseResource,
      description: t.description ?? null,
    };
  });
}

export interface TileDetailViewModel {
  id: string;
  category: string;
  name: string;
  active: boolean;
  locked: boolean;
  discovered: boolean;
  status: string;
  action: string | null;
  actionLabel: string;
  actionDisabled: boolean;
  discovery: TileTypeDiscovery;
  researchProgress: number;
  effects: Record<string, unknown>;
  abilities: Array<Record<string, unknown>>;
  tier: number;
  baseResource: string | undefined;
  description: string | null | undefined;
}

export function getTileDetailViewModel(state: GameState, tileId: string): TileDetailViewModel | null {
  const t = (TILE_TYPES_MAP as Record<string, TileTypeDef | undefined>)[tileId];
  if (!t) return null;
  const category = t.category;
  const discovered = !!state.tileCollection?.discovered?.[t.id];
  const active = discovered && state.tileCollection?.activeByCategory?.[category] === t.id;
  const d: TileTypeDiscovery = t.discovery ?? {};
  const researchProgress = state.tileCollection?.researchProgress?.[t.id] ?? 0;
  let action: string | null = null;
  let actionLabel = "Locked";
  let disabled = true;
  if (discovered) {
    action = active ? "active" : "activate";
    actionLabel = active ? "Active" : "Activate";
    disabled = active;
  } else if (d.method === "buy") {
    action = "buy";
    actionLabel = `Buy ${d.coinCost ?? 0}◉`;
    disabled = (state.coins ?? 0) < (d.coinCost ?? 0);
  } else if (d.method === "research") {
    action = "research";
    actionLabel = `Research ${researchProgress} / ${d.researchAmount}`;
  } else if (d.method === "chain") {
    action = "chain";
    actionLabel = `Chain ${d.chainLength} ${displayKey(d.chainLengthOf ?? "")}`;
  } else if (d.method === "daily") {
    action = "daily";
    actionLabel = `Day ${d.day} reward`;
  } else if (d.method === "building") {
    action = "building";
    actionLabel = `Build ${d.buildingId ?? "a building"}`;
  }

  return {
    id: t.id,
    category,
    name: t.displayName,
    active,
    locked: !discovered,
    discovered,
    status: statusFor(state, t),
    action,
    actionLabel,
    actionDisabled: disabled,
    discovery: d,
    researchProgress,
    effects: t.effects ?? {},
    abilities: t.abilities ?? [],
    tier: t.tier ?? 0,
    baseResource: t.baseResource,
    description: t.description ?? null,
  };
}
