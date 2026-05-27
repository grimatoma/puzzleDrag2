import { BIOMES, getItem, NPCS, RECIPES, CAPPED_INVENTORY_RESOURCES, CAPPED_TILES } from "../constants.js";
import { TILE_TYPES, CATEGORIES } from "../features/tileCollection/data.js";
import type { InventoryKey, RecipeInputKey } from "../types/catalogKeys.js";
import type { Inventory } from "../types/inventory.js";
import { inventoryPutMut, inventoryQty, parseInventory, quantityFor } from "../types/inventory.js";
import type { GameState, Order } from "../types/state.js";

// ─── Inventory helpers ─────────────────────────────────────────────────────

// Until PR 3 moves tile-counts out of state.inventory, chain-collect still
// writes tile keys into inventory and they need the same cap treatment as
// resource keys. Once PR 3 lands, drop CAPPED_TILES from this union.
const INVENTORY_CAPPED_KEYS = new Set<string>([...CAPPED_INVENTORY_RESOURCES, ...CAPPED_TILES]);

/** One element in the optional floaters draft passed to `addCappedResourceMut`. */
export interface CapFloaterEntry {
  text: string;
  ms: number;
  [extra: string]: unknown;
}

/**
 * Mutates `inv` (and `capFloaters` / `floaters` when provided) to credit
 * `amount` of `key` to inventory, applying the cap when the key is in
 * CAPPED_INVENTORY_RESOURCES (or, transitionally, CAPPED_TILES). When the cap
 * is freshly hit, sets capFloaters[key] and appends a "stash full" floater if
 * a floaters draft is supplied.
 *
 * Caller is responsible for cloning `inv`/`capFloaters`/`floaters` first
 * (they're treated as locally-owned drafts).
 */
export function addCappedResourceMut(
  inv: Inventory,
  /**
   * Cap-hit flags keyed by inventory key. Values are coerced to boolean at
   * use; callers may pass a draft with mixed-shape values (the canonical
   * `SeasonStats.capFloaters` is typed `Record<string, unknown>`).
   */
  capFloaters: Record<string, unknown>,
  /**
   * Optional draft buffer for "stash full" toast messages. The reducer holds
   * floaters as `unknown[]`; we widen the parameter to match.
   */
  floaters: unknown[] | null | undefined,
  key: InventoryKey | string,
  amount: number,
  cap: number,
): void {
  if (!INVENTORY_CAPPED_KEYS.has(key)) {
    inventoryPutMut(inv, key, inventoryQty(inv, key) + amount);
    return;
  }
  const cur = inventoryQty(inv, key);
  const next = Math.min(cap, cur + amount);
  inventoryPutMut(inv, key, next);
  if (next === cap && cur + amount > cap && !capFloaters[key]) {
    capFloaters[key] = true;
    if (floaters) floaters.push({ text: `${key} stash full`, ms: 1200 });
  }
}

/** Returns true if state.inventory has at least `needs[k]` of every key. */
export function hasAllInventory(
  state: GameState | { inventory?: Inventory } | null | undefined,
  needs: Partial<Record<RecipeInputKey, number>>,
): boolean {
  const inv = state?.inventory ?? {};
  for (const [k, n] of Object.entries(needs) as [RecipeInputKey, number][]) {
    if (quantityFor(inv, k) < n) return false;
  }
  return true;
}

/** Returns a new inventory with each `needs[k]` deducted from `inv[k]`. */
export function deductInventory(inv: Inventory, needs: Partial<Record<RecipeInputKey, number>>): Inventory {
  let next: Inventory = { ...inv };
  for (const [k, n] of Object.entries(needs) as [RecipeInputKey, number][]) {
    const cur = quantityFor(next, k);
    (next as Partial<Record<RecipeInputKey, number>>)[k] = cur - n;
  }
  return next;
}

// ─── Tile Collection slice helpers ─────────────────────────────────────────

/** The shape of `state.tileCollection`. */
export interface TileCollectionSlice {
  discovered: Record<string, boolean>;
  researchProgress: Record<string, number>;
  activeByCategory: Record<string, string | null>;
  freeMoves: number;
  [extra: string]: unknown;
}

interface TileTypeEntry {
  id: string;
  category: string;
  discovery: { method: string; [extra: string]: unknown };
  [extra: string]: unknown;
}

export function defaultTileCollectionSlice(): TileCollectionSlice {
  const discovered: Record<string, boolean> = {};
  const researchProgress: Record<string, number> = {};
  const activeByCategory: Record<string, string | null> = {};
  for (const c of CATEGORIES as readonly string[]) activeByCategory[c] = null;
  for (const t of TILE_TYPES as readonly TileTypeEntry[]) {
    if (t.discovery.method === "default") {
      discovered[t.id] = true;
      if (activeByCategory[t.category] === null) {
        activeByCategory[t.category] = t.id;
      }
    } else if (t.discovery.method === "research") {
      researchProgress[t.id] = 0;
    }
  }
  return { discovered, researchProgress, activeByCategory, freeMoves: 0 };
}

/**
 * Merges a loaded save state with current defaults, ensuring the tileCollection slice
 * is always well-formed. Idempotent: calling twice produces the same result.
 */
export function mergeLoadedState(saved: Record<string, unknown> | null | undefined): Record<string, unknown> & { tileCollection: TileCollectionSlice } {
  const freshTileCollection = defaultTileCollectionSlice();
  if (!saved || typeof saved !== "object") return { tileCollection: freshTileCollection };
  const savedRec = saved as Record<string, unknown>;
  const rawTileCollection = savedRec.tileCollection ?? savedRec.species; // backward compat: migrate old saves
  let tileCollection: TileCollectionSlice;
  if (!rawTileCollection || typeof rawTileCollection !== "object") {
    tileCollection = freshTileCollection;
  } else {
    // Deep-merge each sub-key: fill in any missing ids from fresh defaults
    const src = rawTileCollection as Partial<TileCollectionSlice>;
    const discovered = { ...freshTileCollection.discovered, ...(src.discovered ?? {}) };
    const researchProgress = { ...freshTileCollection.researchProgress, ...(src.researchProgress ?? {}) };
    const activeByCategory = { ...freshTileCollection.activeByCategory, ...(src.activeByCategory ?? {}) };
    const freeMoves = typeof src.freeMoves === "number" ? src.freeMoves : 0;
    tileCollection = { discovered, researchProgress, activeByCategory, freeMoves };
  }
  const out = { ...savedRec };
  delete out.species; // remove legacy key if present
  if ("inventory" in out) {
    out.inventory = parseInventory(out.inventory as Record<string, unknown>);
  }
  return { ...out, tileCollection };
}

export const SEASON_END_BONUS_COINS = 25;

/** Legacy non-linear curve — kept for backward compat with any external callers. */
export const xpForLevel = (l: number): number => 50 + l * 80;

/**
 * Look up any ITEMS entry by key (tiles, resources, tools).
 * Returns `{ key, ...item }` or null. O(1) via ITEMS direct lookup.
 * Canonical implementation — used by all callsites (GameScene, fish/slice, state).
 */
export function resourceByKey(key: string | null | undefined): (Record<string, unknown> & { key: string }) | null {
  if (!key) return null;
  const item = getItem(key);
  if (!item) return null;
  return { key, ...item };
}

export function pickNpcKey(excludeKeys: string[] = [], roster: string[] = Object.keys(NPCS)): string {
  const allowed = Array.isArray(roster) && roster.length
    ? roster.filter((k) => (NPCS as Record<string, unknown>)[k])
    : Object.keys(NPCS);
  const all = allowed.filter((k) => !excludeKeys.includes(k));
  const pool = all.length ? all : allowed;
  return pool[Math.floor(Math.random() * pool.length)];
}

const CRAFTED_ORDER_CHANCE = 0.30;

const CRAFTED_STATIONS_BY_BIOME: Record<string, Set<string>> = {
  farm: new Set(["bakery", "larder"]),
  mine: new Set(["forge"]),
  fish: new Set(["bakery", "larder", "workshop"]),
};

interface RecipeEntry {
  item?: string;
  station?: string;
  [extra: string]: unknown;
}

/** Crafted resource keys eligible for level 3+ orders, from RECIPES by biome station. */
export function craftedOrderPoolForBiome(biomeKey: string): string[] {
  const stations = CRAFTED_STATIONS_BY_BIOME[biomeKey] ?? CRAFTED_STATIONS_BY_BIOME.farm;
  const keys = new Set<string>();
  for (const rec of Object.values(RECIPES) as RecipeEntry[]) {
    if (!rec?.item || !rec.station || !stations.has(rec.station)) continue;
    const item = getItem(rec.item);
    if (item?.kind === "resource") keys.add(rec.item);
  }
  return [...keys];
}

let orderIdSeq = 1;

export function seedOrderIdSeq(orders: unknown): void {
  if (Array.isArray(orders)) {
    for (const o of orders) {
      const oRec = o as { id?: string } | null | undefined;
      const idStr = oRec?.id;
      if (typeof idStr !== "string") continue;
      const n = parseInt(idStr.slice(1), 10);
      if (!isNaN(n) && n >= orderIdSeq) orderIdSeq = n + 1;
    }
  }
}

interface BiomeEntry {
  name?: string;
  resourceOrderPool?: string[];
  pool?: string[];
  [extra: string]: unknown;
}

interface NpcEntry {
  name?: string;
  lines: string[];
  [extra: string]: unknown;
}

export function makeOrder(
  biomeKey: string,
  level: number,
  excludeNpcs: string[] = [],
  excludeOrderKeys: string[] = [],
  npcRoster: string[] = Object.keys(NPCS),
): Order {
  const biome: BiomeEntry = BIOMES[biomeKey];

  // At level 3+, 30% chance for a crafted item order
  const useCrafted = level >= 3 && Math.random() < CRAFTED_ORDER_CHANCE;

  let key: string;
  let need: number;
  let reward: number;
  let resourceLabel: string;
  if (useCrafted) {
    const craftedPool = craftedOrderPoolForBiome(biomeKey);
    const craftedCandidates = craftedPool.filter((k) => !excludeOrderKeys.includes(k));
    const craftedPickPool = craftedCandidates.length ? craftedCandidates : craftedPool;
    key = craftedPickPool[Math.floor(Math.random() * craftedPickPool.length)];
    const itemDef = getItem(key);
    need = 1 + Math.floor(Math.random() * 3); // 1–3 crafted items
    reward = Math.round(need * (itemDef?.value || 100) * 1.5);
    resourceLabel = (itemDef?.label || key).toLowerCase();
  } else {
    const pool = biome.resourceOrderPool ?? [];
    const resourceCandidates = pool.filter((k) => !excludeOrderKeys.includes(k));
    const resourcePickPool = resourceCandidates.length ? resourceCandidates : pool;
    key = resourcePickPool[Math.floor(Math.random() * resourcePickPool.length)];
    const res = resourceByKey(key) as ({ value?: number; label?: string } & { key: string }) | null;
    const value = Number(res?.value) || 1;
    const label = String(res?.label ?? key);
    const baseNeed = value < 3 ? 8 : 4;
    need = baseNeed + Math.floor(Math.random() * 4) + Math.floor(level / 3) * 2;
    reward = Math.max(20, need * value * 6);
    resourceLabel = label.toLowerCase();
  }

  const npc = pickNpcKey(excludeNpcs, npcRoster);
  const npcEntry = (NPCS as Record<string, NpcEntry>)[npc];
  const lines = npcEntry?.lines ?? [];
  const line = (lines[Math.floor(Math.random() * lines.length)] ?? "")
    .replace("{n}", String(need))
    .replace("{r}", resourceLabel);
  // The runtime id is the string `o<seq>` (used as a stable React key); the
  // canonical Order.id is typed `number`. Cast at this single boundary so
  // callers (state.ts, init.ts) can treat the result as an Order directly.
  return {
    id: `o${orderIdSeq++}` as unknown as number,
    npc,
    key: key as import("../types/catalogKeys.js").ResourceKey,
    need,
    reward,
    line,
    amount: need,
  };
}
