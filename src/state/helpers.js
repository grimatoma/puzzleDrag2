import { BIOMES, ITEMS, NPCS, CAPPED_RESOURCES } from "../constants.js";
import { TILE_TYPES, CATEGORIES } from "../features/tileCollection/data.js";

// ─── Inventory helpers ─────────────────────────────────────────────────────

/**
 * Mutates `inv` (and `capFloaters` / `floaters` when provided) to credit
 * `amount` of `key` to inventory, applying the resource cap when the key is
 * in CAPPED_RESOURCES. When the cap is freshly hit, sets capFloaters[key]
 * and appends a "stash full" floater if a floaters draft is supplied.
 *
 * Caller is responsible for cloning `inv`/`capFloaters`/`floaters` first
 * (they're treated as locally-owned drafts).
 */
export function addCappedResourceMut(inv, capFloaters, floaters, key, amount, cap) {
  if (!CAPPED_RESOURCES.includes(key)) {
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
export function hasAllInventory(state, needs) {
  const inv = state.inventory ?? {};
  for (const [k, n] of Object.entries(needs)) {
    if ((inv[k] ?? 0) < n) return false;
  }
  return true;
}

/** Returns a new inventory with each `needs[k]` deducted from `inv[k]`. */
export function deductInventory(inv, needs) {
  const next = { ...inv };
  for (const [k, n] of Object.entries(needs)) {
    next[k] = (next[k] ?? 0) - n;
  }
  return next;
}

// ─── Tile Collection slice helpers ─────────────────────────────────────────

export function defaultTileCollectionSlice() {
  const discovered = {};
  const researchProgress = {};
  const activeByCategory = {};
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
export function mergeLoadedState(saved) {
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

const _resourceCache = new Map();

export const SEASON_END_BONUS_COINS = 25;

/** Legacy non-linear curve — kept for backward compat with any external callers. */
export const xpForLevel = (l) => 50 + l * 80;

export function resourceByKey(key) {
  if (_resourceCache.has(key)) return _resourceCache.get(key);
  for (const b of Object.values(BIOMES)) {
    const r = b.resources.find((x) => x.key === key);
    if (r) { _resourceCache.set(key, r); return r; }
  }
  return null;
}

export function pickNpcKey(excludeKeys = [], roster = Object.keys(NPCS)) {
  const allowed = Array.isArray(roster) && roster.length ? roster.filter((k) => NPCS[k]) : Object.keys(NPCS);
  const all = allowed.filter((k) => !excludeKeys.includes(k));
  const pool = all.length ? all : allowed;
  return pool[Math.floor(Math.random() * pool.length)];
}

const CRAFTED_ORDER_CHANCE = 0.30;

// Crafted item pools for advanced orders (level 3+)
const CRAFTED_FARM_POOL = ["bread", "honeyroll", "harvestpie", "preserve", "tincture"];
const CRAFTED_MINE_POOL = ["iron_hinge", "cobblepath", "lantern", "goldring", "gemcrown", "ironframe", "stonework"];

let orderIdSeq = 1;

export function seedOrderIdSeq(orders) {
  if (Array.isArray(orders)) {
    for (const o of orders) {
      const n = parseInt((o.id || '').slice(1), 10);
      if (!isNaN(n) && n >= orderIdSeq) orderIdSeq = n + 1;
    }
  }
}

export function makeOrder(biomeKey, level, excludeNpcs = [], excludeOrderKeys = [], npcRoster = Object.keys(NPCS)) {
  const biome = BIOMES[biomeKey];

  // At level 3+, 30% chance for a crafted item order
  const useCrafted = level >= 3 && Math.random() < CRAFTED_ORDER_CHANCE;

  let key, need, reward, resourceLabel;
  if (useCrafted) {
    const craftedPool = biomeKey === "mine" ? CRAFTED_MINE_POOL : CRAFTED_FARM_POOL;
    const craftedCandidates = craftedPool.filter((k) => !excludeOrderKeys.includes(k));
    const craftedPickPool = craftedCandidates.length ? craftedCandidates : craftedPool;
    key = craftedPickPool[Math.floor(Math.random() * craftedPickPool.length)];
    const itemDef = ITEMS[key];
    need = 1 + Math.floor(Math.random() * 3); // 1–3 crafted items
    reward = Math.round(need * (itemDef?.value || 100) * 1.5);
    resourceLabel = (itemDef?.label || key).toLowerCase();
  } else {
    const candidates = biome.pool.filter((k, i, a) => a.indexOf(k) === i);
    const resourceCandidates = candidates.filter((k) => !excludeOrderKeys.includes(k));
    const resourcePickPool = resourceCandidates.length ? resourceCandidates : candidates;
    key = resourcePickPool[Math.floor(Math.random() * resourcePickPool.length)];
    const res = resourceByKey(key);
    const baseNeed = res.value < 3 ? 8 : 4;
    need = baseNeed + Math.floor(Math.random() * 4) + Math.floor(level / 3) * 2;
    reward = Math.max(20, need * res.value * 6);
    resourceLabel = res.label.toLowerCase();
  }

  const npc = pickNpcKey(excludeNpcs, npcRoster);
  const lines = NPCS[npc].lines;
  const line = lines[Math.floor(Math.random() * lines.length)]
    .replace("{n}", need)
    .replace("{r}", resourceLabel);
  return { id: `o${orderIdSeq++}`, npc, key, need, reward, line };
}
