import { BIOMES, ITEMS, NPCS, RECIPES, CAPPED_INVENTORY_RESOURCES, CAPPED_TILES } from "../constants.js";
import { TILE_TYPES, CATEGORIES } from "../features/tileCollection/data.js";

// ─── Inventory helpers ─────────────────────────────────────────────────────

// Until PR 3 moves tile-counts out of state.inventory, chain-collect still
// writes tile keys into inventory and they need the same cap treatment as
// resource keys. Once PR 3 lands, drop CAPPED_TILES from this union.
const INVENTORY_CAPPED_KEYS = new Set([...CAPPED_INVENTORY_RESOURCES, ...CAPPED_TILES]);

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
export function addCappedResourceMut(inv: any, capFloaters: any, floaters: any, key: any, amount: any, cap: any): void {
  if (!INVENTORY_CAPPED_KEYS.has(key)) {
    inv[key] = (inv[key] ?? 0) + amount;
    return;
  }
  const cur = inv[key] ?? 0;
  const next = Math.min(cap, cur + amount);
  inv[key] = next;
  if (next === cap && cur + amount > cap && !capFloaters[key]) {
    capFloaters[key] = true;
    if (floaters) floaters.push({ text: `${key} stash full`, ms: 1200 });
  }
}

/** Returns true if state.inventory has at least `needs[k]` of every key. */
export function hasAllInventory(state: any, needs: any): boolean {
  const inv = state.inventory ?? {};
  for (const [k, n] of Object.entries(needs)) {
    if ((inv[k] ?? 0) < (n as number)) return false;
  }
  return true;
}

/** Returns a new inventory with each `needs[k]` deducted from `inv[k]`. */
export function deductInventory(inv: any, needs: any): any {
  const next = { ...inv };
  for (const [k, n] of Object.entries(needs)) {
    next[k] = (next[k] ?? 0) - (n as number);
  }
  return next;
}

// ─── Tile Collection slice helpers ─────────────────────────────────────────

export function defaultTileCollectionSlice(): any {
  const discovered: Record<string, any> = {};
  const researchProgress: Record<string, number> = {};
  const activeByCategory: Record<string, any> = {};
  for (const c of CATEGORIES) activeByCategory[c] = null;
  for (const t of TILE_TYPES) {
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
export function mergeLoadedState(saved: any): any {
  const freshTileCollection = defaultTileCollectionSlice();
  if (!saved || typeof saved !== "object") return { tileCollection: freshTileCollection };
  let tileCollection = saved.tileCollection ?? saved.species; // backward compat: migrate old saves
  if (!tileCollection || typeof tileCollection !== "object") {
    tileCollection = freshTileCollection;
  } else {
    // Deep-merge each sub-key: fill in any missing ids from fresh defaults
    const discovered = { ...freshTileCollection.discovered, ...tileCollection.discovered };
    const researchProgress = { ...freshTileCollection.researchProgress, ...tileCollection.researchProgress };
    const activeByCategory = { ...freshTileCollection.activeByCategory, ...tileCollection.activeByCategory };
    const freeMoves = typeof tileCollection.freeMoves === "number" ? tileCollection.freeMoves : 0;
    tileCollection = { discovered, researchProgress, activeByCategory, freeMoves };
  }
  const out = { ...saved };
  delete out.species; // remove legacy key if present
  return { ...out, tileCollection };
}

export const SEASON_END_BONUS_COINS = 25;

/** Legacy non-linear curve — kept for backward compat with any external callers. */
export const xpForLevel = (l: any) => 50 + l * 80;

/**
 * Look up any ITEMS entry by key (tiles, resources, tools).
 * Returns `{ key, ...item }` or null. O(1) via ITEMS direct lookup.
 * Canonical implementation — used by all callsites (GameScene, fish/slice, state).
 */
export function resourceByKey(key: any): any {
  if (!key) return null;
  const item = ITEMS[key];
  if (!item) return null;
  return { key, ...item };
}

export function pickNpcKey(excludeKeys: any[] = [], roster: string[] = Object.keys(NPCS)): string {
  const allowed = Array.isArray(roster) && roster.length ? roster.filter((k) => (NPCS as any)[k]) : Object.keys(NPCS);
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

/** Crafted resource keys eligible for level 3+ orders, from RECIPES by biome station. */
export function craftedOrderPoolForBiome(biomeKey: any): string[] {
  const stations = CRAFTED_STATIONS_BY_BIOME[biomeKey] ?? CRAFTED_STATIONS_BY_BIOME.farm;
  const keys = new Set<string>();
  for (const rec of Object.values(RECIPES) as any[]) {
    if (!rec?.item || !stations.has(rec.station)) continue;
    if ((ITEMS as any)[rec.item]?.kind === "resource") keys.add(rec.item);
  }
  return [...keys];
}

let orderIdSeq = 1;

export function seedOrderIdSeq(orders: any): void {
  if (Array.isArray(orders)) {
    for (const o of orders) {
      const n = parseInt((o.id || '').slice(1), 10);
      if (!isNaN(n) && n >= orderIdSeq) orderIdSeq = n + 1;
    }
  }
}

export function makeOrder(biomeKey: any, level: any, excludeNpcs: any[] = [], excludeOrderKeys: any[] = [], npcRoster: string[] = Object.keys(NPCS)): any {
  const biome = (BIOMES as any)[biomeKey];

  // At level 3+, 30% chance for a crafted item order
  const useCrafted = level >= 3 && Math.random() < CRAFTED_ORDER_CHANCE;

  let key: any, need: any, reward: any, resourceLabel: any;
  if (useCrafted) {
    const craftedPool = craftedOrderPoolForBiome(biomeKey);
    const craftedCandidates = craftedPool.filter((k) => !excludeOrderKeys.includes(k));
    const craftedPickPool = craftedCandidates.length ? craftedCandidates : craftedPool;
    key = craftedPickPool[Math.floor(Math.random() * craftedPickPool.length)];
    const itemDef = (ITEMS as any)[key];
    need = 1 + Math.floor(Math.random() * 3); // 1–3 crafted items
    reward = Math.round(need * (itemDef?.value || 100) * 1.5);
    resourceLabel = (itemDef?.label || key).toLowerCase();
  } else {
    const pool = biome.resourceOrderPool;
    const resourceCandidates = pool.filter((k: any) => !excludeOrderKeys.includes(k));
    const resourcePickPool = resourceCandidates.length ? resourceCandidates : pool;
    key = resourcePickPool[Math.floor(Math.random() * resourcePickPool.length)];
    const res = resourceByKey(key);
    const baseNeed = res.value < 3 ? 8 : 4;
    need = baseNeed + Math.floor(Math.random() * 4) + Math.floor(level / 3) * 2;
    reward = Math.max(20, need * res.value * 6);
    resourceLabel = res.label.toLowerCase();
  }

  const npc = pickNpcKey(excludeNpcs, npcRoster);
  const lines = (NPCS as any)[npc].lines;
  const line = lines[Math.floor(Math.random() * lines.length)]
    .replace("{n}", need)
    .replace("{r}", resourceLabel);
  return { id: `o${orderIdSeq++}`, npc, key, need, reward, line };
}
