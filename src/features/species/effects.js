import { SPECIES, SPECIES_MAP, CATEGORY_OF } from "./data.js";
import { BIOMES } from "../../constants.js";

// ─── 5.4 — Chain-length discovery ─────────────────────────────────────────

/**
 * Pure function: checks all chain-method species against the given chain commit.
 * Returns { discoveredIds, newDiscoveredMap }.
 * No allocation when nothing changes (same reference returned for newDiscoveredMap).
 */
export function discoverSpeciesFromChain(state, { resourceKey, chainLength }) {
  const known = state.species?.discovered ?? {};
  const ids = [];
  for (const sp of SPECIES) {
    if (sp.discovery.method !== "chain") continue;
    if (sp.discovery.chainLengthOf !== resourceKey) continue;
    if (chainLength < sp.discovery.chainLength) continue;
    if (known[sp.id]) continue;
    ids.push(sp.id);
  }
  if (ids.length === 0) {
    return { discoveredIds: [], newDiscoveredMap: known };
  }
  // Stable order: tier ascending, then id alphabetical
  ids.sort((a, b) => {
    const sa = SPECIES_MAP[a], sb = SPECIES_MAP[b];
    return (sa.tier - sb.tier) || (a < b ? -1 : a > b ? 1 : 0);
  });
  const newDiscoveredMap = { ...known };
  for (const id of ids) newDiscoveredMap[id] = true;
  return { discoveredIds: ids, newDiscoveredMap };
}

// ─── 5.6 — Board pool wiring ───────────────────────────────────────────────

/**
 * Returns the active species id for the category that contains `key`, or null.
 */
function activeIdForKey(state, key) {
  const cat = CATEGORY_OF[key];
  if (!cat) return null;
  return state?.species?.activeByCategory?.[cat] ?? null;
}

/**
 * Pure helper: given game state and a biome key, returns the weighted spawn pool
 * as a flat array of resource keys.
 *
 * Algorithm:
 *   1. Start from biome base pool, substituting each key for the active species
 *      of its category (if the category is null/disabled, the slot is dropped).
 *   2. Apply worker effectivePoolWeights additively — BUT only when the boosted
 *      key matches the currently-active species in its category.
 *
 * The state.registry.effectivePoolWeights field is a test-friendly mirror of what
 * GameScene stores in Phaser's registry after _syncWorkerEffects().
 */
export function getActivePool(state, biomeKey = "farm") {
  const base = BIOMES[biomeKey]?.pool ?? [];
  const active = state?.species?.activeByCategory ?? {};
  const out = [];

  for (const baseKey of base) {
    const cat = CATEGORY_OF[baseKey];
    if (!cat) {
      // Key has no species category — include as-is
      out.push(baseKey);
      continue;
    }
    const a = active[cat];
    if (a === null || a === undefined) continue; // category disabled — drop slot
    out.push(a); // substitute the active species variant
  }

  // Worker pool_weight boost — gated by active species
  const boosts = state?.registry?.effectivePoolWeights ?? {};
  for (const [k, n] of Object.entries(boosts)) {
    if (activeIdForKey(state, k) !== k) continue; // boost key must be the active species
    const copies = Math.max(0, Math.round(n));
    for (let i = 0; i < copies; i++) out.push(k);
  }
  return out;
}

// ─── 5.8 — Category view model ────────────────────────────────────────────

/**
 * Returns a human-readable status string for a species row in the panel.
 */
function statusFor(state, s) {
  const disc = state.species?.discovered?.[s.id];
  const d = s.discovery ?? {};

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
    const p = state.species?.researchProgress?.[s.id] ?? 0;
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
  return SPECIES.filter((s) => s.category === category).map((s) => {
    const locked = !state.species?.discovered?.[s.id];
    const active = !locked && state.species?.activeByCategory?.[category] === s.id;
    const action = locked
      ? (s.discovery?.method === "buy" ? "buy" : null)
      : "toggle";
    return {
      id: s.id,
      name: s.displayName,
      active,
      locked,
      status: statusFor(state, s),
      action,
    };
  });
}
