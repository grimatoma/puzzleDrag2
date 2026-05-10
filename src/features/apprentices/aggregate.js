/**
 * Aggregated effects across the player's hired townsfolk + type-tier workers.
 *
 * Originally a Phase-9 type-dispatch over each worker's `effect` field. Now a
 * thin wrapper around the unified `aggregateAbilities` engine in
 * `src/config/abilitiesAggregate.js`. The channel shape returned from this
 * function is unchanged so existing call sites in state.js / GameScene
 * (e.g. `workerEffects.thresholdReduce[k]`, `seasonBonus.coins`) keep
 * working without edits.
 *
 * Per-source weight model:
 *   weight = clamp01(hiredCount / maxCount)
 *
 * For abilities whose contribution scales linearly (`threshold_reduce`,
 * `season_bonus`, etc.), `applyAbilityToChannels` multiplies the catalog
 * `amount` by `weight` directly. For abilities that floor per-source
 * (`pool_weight`), it floors `amount * weight` per worker before adding —
 * preserving the Phase 9 contract that 1/2 hire of a +1 worker contributes 0.
 */

import { WORKERS } from "./data.js";
import { TYPE_WORKERS } from "../workers/data.js";
import { TILE_TYPES_BY_CATEGORY as SPECIES_BY_CATEGORY } from "../tileCollection/data.js";
import { aggregateAbilities } from "../../config/abilitiesAggregate.js";

/**
 * Build the weighted source list for a worker entity (TYPE_WORKERS or TOWNSFOLK).
 * Returns null if the worker has no hires (so the aggregator skips it).
 */
function workerSource(def, hiredCount) {
  const count = Math.max(0, Math.min(hiredCount | 0, def.maxCount));
  if (count === 0) return null;
  const weight = count / def.maxCount;
  const abilities = Array.isArray(def.abilities) ? def.abilities : [];
  if (abilities.length === 0) return null;
  return { kind: "worker", sourceId: def.id, abilities, weight };
}

/**
 * Returns an aggregated effects object for the current workforce.
 *
 * Channels (unchanged from the legacy aggregator):
 *   thresholdReduce      { [key]: number }
 *   poolWeight           { [key]: number }   — continuous, used by Phase 4 workers
 *   bonusYield           { [key]: number }
 *   seasonBonus          { [key]: number }
 *   effectivePoolWeights { [key]: integer }  — floored per source
 *   hazardSpawnReduce    { [hazardId]: 0..1 }
 *   hazardCoinMultiplier { [hazardId]: number ≥ 1 }
 *   chainRedirect        { [fromCategory]: { toCategory, threshold, redirectShare } }
 *   recipeInputReduce    { [recipeKey]: { [input]: number } }
 *   plus tile/building channels: freeMoves, coinBonusFlat, coinBonusPerTile,
 *   freeMovesIfChain, seasonEndTools, seasonEndPoolStep, boardPreserveBiomes.
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

  return aggregateAbilities(sources, { speciesByCategory: SPECIES_BY_CATEGORY });
}
