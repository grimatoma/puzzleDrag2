/**
 * Aggregated effects across every ability-bearing source: hired workers,
 * built buildings, and discovered + active tiles.
 *
 * Originally a Phase-9 type-dispatch over each worker's `effect` field. Now a
 * thin wrapper around the unified `aggregateAbilities` engine in
 * `src/config/abilitiesAggregate.js`. The channel shape returned from this
 * function is unchanged from the legacy worker aggregator so existing call
 * sites in state.js / GameScene (e.g. `workerEffects.thresholdReduce[k]`,
 * `seasonBonus.coins`) keep working without edits.
 *
 * The function name is now a slight misnomer (it returns aggregated abilities
 * across all source kinds, not just workers) but the rename was deferred to
 * avoid touching every test/import in the codebase.
 *
 * Per-source weight model:
 *   - Workers:    weight = hiredCount / maxCount
 *   - Buildings:  weight = 1 (built or not)
 *   - Tiles:      weight = 1 (active in its category, otherwise omitted)
 *
 * For abilities whose contribution scales linearly (`threshold_reduce`,
 * `season_bonus`, etc.), `applyAbilityToChannels` multiplies the catalog
 * `amount` by `weight` directly. For abilities that floor per-source
 * (`pool_weight`), it floors `amount * weight` per source before adding.
 */

import { WORKERS } from "./data.js";
import { TYPE_WORKERS } from "../workers/data.js";
import {
  TILE_TYPES,
  TILE_TYPES_BY_CATEGORY as SPECIES_BY_CATEGORY,
  TILE_TYPES_MAP,
} from "../tileCollection/data.js";
import { BUILDINGS } from "../../constants.js";
import { locBuilt } from "../../locBuilt.js";
import { aggregateAbilities } from "../../config/abilitiesAggregate.js";

/** Source list for a worker entity (TYPE_WORKERS or TOWNSFOLK). */
function workerSource(def, hiredCount) {
  const count = Math.max(0, Math.min(hiredCount | 0, def.maxCount));
  if (count === 0) return null;
  const weight = count / def.maxCount;
  const abilities = Array.isArray(def.abilities) ? def.abilities : [];
  if (abilities.length === 0) return null;
  return { kind: "worker", sourceId: def.id, abilities, weight };
}

/** Source list for every BUILDINGS entry currently built in the active map. */
export function builtBuildingSources(state) {
  const built = locBuilt(state) || {};
  const out = [];
  for (const b of BUILDINGS) {
    if (!built[b.id]) continue;
    if (!Array.isArray(b.abilities) || b.abilities.length === 0) continue;
    out.push({ kind: "building", sourceId: b.id, abilities: b.abilities, weight: 1 });
  }
  return out;
}

/**
 * Source list for every tile that is currently both DISCOVERED and ACTIVE
 * in its category. Tiles fire their abilities passively while active.
 *
 * (Tiles whose abilities only trigger on chain — free_moves, coin_bonus_flat,
 * etc. — also flow through `tile.effects.*` via `expandAbilitiesToEffects`,
 * so the chain-time consumers in state.js read off the chained tile directly.
 * Including them here adds spawn-time / passive contributions like
 * `pool_weight` and `threshold_reduce` to the global aggregator.)
 */
export function discoveredTileSources(state) {
  const discovered = state?.tileCollection?.discovered ?? {};
  const activeByCategory = state?.tileCollection?.activeByCategory ?? {};
  const out = [];
  for (const t of TILE_TYPES) {
    if (!Array.isArray(t.abilities) || t.abilities.length === 0) continue;
    if (!discovered[t.id]) continue;
    if (activeByCategory[t.category] !== t.id) continue;
    out.push({ kind: "tile", sourceId: t.id, abilities: t.abilities, weight: 1 });
  }
  return out;
}

/**
 * Returns an aggregated effects object spanning workers + buildings + tiles.
 *
 * Channels (superset of the legacy worker-effects shape):
 *   thresholdReduce      { [key]: number }
 *   poolWeight           { [key]: number }   — continuous, used by Phase 4 workers
 *   bonusYield           { [key]: number }
 *   seasonBonus          { [key]: number }
 *   effectivePoolWeights { [key]: integer }  — floored per source
 *   hazardSpawnReduce    { [hazardId]: 0..1 }
 *   hazardCoinMultiplier { [hazardId]: number ≥ 1 }
 *   chainRedirect        { [fromCategory]: { toCategory, threshold, redirectShare } }
 *   recipeInputReduce    { [recipeKey]: { [input]: number } }
 *   freeMoves, coinBonusFlat, coinBonusPerTile, freeMovesIfChain
 *   seasonEndTools       { [toolId]: integer }
 *   seasonEndPoolStep    integer
 *   boardPreserveBiomes  Set<string>
 */
export function computeWorkerEffects(state) {
  const hired = state?.townsfolk?.hired ?? {};
  const debt = state?.townsfolk?.debt ?? 0;
  // Townsfolk pause when wages are owed; type-tier workers don't.
  const townsfolkActive = !(debt > 0);

  const typeHired = state?.workers?.hired ?? {};

  const sources = [];
  if (townsfolkActive) {
    for (const w of WORKERS) {
      const src = workerSource(w, hired[w.id] ?? 0);
      if (src) sources.push(src);
    }
  }
  for (const w of TYPE_WORKERS) {
    const src = workerSource(w, typeHired[w.id] ?? 0);
    if (src) sources.push(src);
  }

  // Buildings + active tiles contribute with weight 1.
  for (const src of builtBuildingSources(state)) sources.push(src);
  for (const src of discoveredTileSources(state)) sources.push(src);

  return aggregateAbilities(sources, { speciesByCategory: SPECIES_BY_CATEGORY });
}

// Re-export TILE_TYPES_MAP so callers don't need a second import line.
export { TILE_TYPES_MAP };
