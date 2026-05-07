import { TILE_TYPES, TILE_TYPES_MAP, CATEGORY_OF } from "./data.js";
import { BIOMES } from "../../constants.js";

// ─── 5.4 — Chain-length discovery ─────────────────────────────────────────

/**
 * Pure function: checks all chain-method tile types against the given chain commit.
 * Returns { discoveredIds, newDiscoveredMap }.
 * No allocation when nothing changes (same reference returned for newDiscoveredMap).
 */
export function discoverTileTypesFromChain(state, { resourceKey, chainLength }) {
  const known = state.tileCollection?.discovered ?? {};
  const ids = [];
  for (const t of TILE_TYPES) {
    if (t.discovery.method !== "chain") continue;
    if (t.discovery.chainLengthOf !== resourceKey) continue;
    if (chainLength < t.discovery.chainLength) continue;
    if (known[t.id]) continue;
    ids.push(t.id);
  }
  if (ids.length === 0) {
    return { discoveredIds: [], newDiscoveredMap: known };
  }
  // Stable order: tier ascending, then id alphabetical
  ids.sort((a, b) => {
    const ta = TILE_TYPES_MAP[a], tb = TILE_TYPES_MAP[b];
    return (ta.tier - tb.tier) || (a < b ? -1 : a > b ? 1 : 0);
  });
  const newDiscoveredMap = { ...known };
  for (const id of ids) newDiscoveredMap[id] = true;
  return { discoveredIds: ids, newDiscoveredMap };
}

// ─── 5.6 — Board pool wiring ───────────────────────────────────────────────

/**
 * Returns the active tile type id for the category that contains `key`, or null.
 */
function activeIdForKey(state, key) {
  const cat = CATEGORY_OF[key];
  if (!cat) return null;
  return state?.tileCollection?.activeByCategory?.[cat] ?? null;
}

/**
 * Pure helper: given game state and a biome key, returns the weighted spawn pool
 * as a flat array of resource keys.
 *
 * Algorithm:
 *   1. Start from biome base pool, substituting each key for the active tile type
 *      of its category (if the category is null/disabled, the slot is dropped).
 *   2. Apply worker effectivePoolWeights additively — BUT only when the boosted
 *      key matches the currently-active tile type in its category.
 *
 * The state.registry.effectivePoolWeights field is a test-friendly mirror of what
 * GameScene stores in Phaser's registry after _syncWorkerEffects().
 */
export function getActivePool(state, biomeKey = "farm") {
  const base = BIOMES[biomeKey]?.pool ?? [];
  const active = state?.tileCollection?.activeByCategory ?? {};
  const out = [];

  for (const baseKey of base) {
    const cat = CATEGORY_OF[baseKey];
    if (!cat) {
      // Key has no tile collection category — include as-is
      out.push(baseKey);
      continue;
    }
    const a = active[cat];
    if (a === null || a === undefined) continue; // category disabled — drop slot
    out.push(a); // substitute the active tile type variant
  }

  // Worker pool_weight boost — gated by active tile type
  const boosts = state?.registry?.effectivePoolWeights ?? {};
  for (const [k, n] of Object.entries(boosts)) {
    if (activeIdForKey(state, k) !== k) continue; // boost key must be the active tile type
    const copies = Math.max(0, Math.round(n));
    for (let i = 0; i < copies; i++) out.push(k);
  }
  return out;
}

// ─── 5.8 — Category view model ────────────────────────────────────────────

/**
 * Returns a human-readable status string for a tile type row in the panel.
 */
function statusFor(state, t) {
  const disc = state.tileCollection?.discovered?.[t.id];
  const d = t.discovery ?? {};

  if (d.method === "default") return "Default — always available";

  if (disc) {
    if (d.method === "chain") {
      return `Discovered — chain ${d.chainLength} ${d.chainLengthOf} to find`;
    }
    if (d.method === "research") return `Discovered — researched ${d.researchOf}`;
    if (d.method === "buy") return "Discovered — purchased";
  }

  // Not yet discovered
  if (d.method === "research") {
    const p = state.tileCollection?.researchProgress?.[t.id] ?? 0;
    return `Researching ${d.researchOf}: ${p} / ${d.researchAmount}`;
  }
  if (d.method === "chain") {
    return `Locked — chain ${d.chainLength} ${d.chainLengthOf} to discover`;
  }
  if (d.method === "buy") {
    return `Buy ${d.coinCost}◉`;
  }
  return "Locked";
}

/**
 * Returns an array of view-model rows for the given category.
 * Each row: { id, name, active, locked, status, action }
 * action is "toggle" (discovered), "buy" (buy-only, undiscovered), or null.
 */
export function getCategoryViewModel(state, category) {
  return TILE_TYPES.filter((t) => t.category === category).map((t) => {
    const locked = !state.tileCollection?.discovered?.[t.id];
    const active = !locked && state.tileCollection?.activeByCategory?.[category] === t.id;
    const action = locked
      ? (t.discovery?.method === "buy" ? "buy" : null)
      : "toggle";
    return {
      id: t.id,
      name: t.displayName,
      active,
      locked,
      status: statusFor(state, t),
      action,
      description: t.description ?? null,
    };
  });
}
