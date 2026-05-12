/**
 * Aggregated abilities across every ability-bearing source: hired workers,
 * built buildings, and discovered + active tiles.
 *
 * The actual aggregation engine lives in `src/config/abilitiesAggregate.js`;
 * this module just builds the source list and folds it through.
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

import { TYPE_WORKERS } from "./data.js";
import {
  TILE_TYPES,
  TILE_TYPES_BY_CATEGORY as SPECIES_BY_CATEGORY,
} from "../tileCollection/data.js";
import { BUILDINGS } from "../../constants.js";
import { locBuilt } from "../../locBuilt.js";
import { aggregateAbilities } from "../../config/abilitiesAggregate.js";
import { getAbility } from "../../config/abilities.js";

// Triggers whose contributions the global aggregator should expose as
// channels. Chain-time triggers (`on_chain_collect`, `on_chain_commit`)
// are read off the chained tile's per-tile `effects.*` shape directly,
// so including them here from tile sources would double-count or write
// dead values to channels nobody reads.
const TILE_AGGREGATOR_TRIGGERS = new Set(["passive", "on_board_fill"]);

/** Source list for a worker entity (TYPE_WORKERS). */
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
 * in its category. Only abilities whose trigger fires "passively while
 * active" (`passive`, `on_board_fill`) are included — chain-time abilities
 * are read off the per-tile `effects` shape inside CHAIN_COLLECTED /
 * CHAIN_COMMIT, so feeding them through here would write to dead channels.
 */
export function discoveredTileSources(state) {
  const discovered = state?.tileCollection?.discovered ?? {};
  const activeByCategory = state?.tileCollection?.activeByCategory ?? {};
  const out = [];
  for (const t of TILE_TYPES) {
    if (!Array.isArray(t.abilities) || t.abilities.length === 0) continue;
    if (!discovered[t.id]) continue;
    if (activeByCategory[t.category] !== t.id) continue;
    const passiveAbilities = t.abilities.filter((inst) => {
      const def = getAbility(inst?.id);
      if (!def) return false;
      const trigger = inst.trigger || def.trigger;
      return TILE_AGGREGATOR_TRIGGERS.has(trigger);
    });
    if (passiveAbilities.length === 0) continue;
    out.push({ kind: "tile", sourceId: t.id, abilities: passiveAbilities, weight: 1 });
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
export function computeAggregatedAbilities(state) {
  const typeHired = state?.workers?.hired ?? {};

  const sources = [];
  for (const w of TYPE_WORKERS) {
    const src = workerSource(w, typeHired[w.id] ?? 0);
    if (src) sources.push(src);
  }

  // Buildings + active tiles contribute with weight 1.
  for (const src of builtBuildingSources(state)) sources.push(src);
  for (const src of discoveredTileSources(state)) sources.push(src);

  return aggregateAbilities(sources, { speciesByCategory: SPECIES_BY_CATEGORY });
}

// Legacy alias — many tests + a few production files import the original
// name. Kept as a thin re-export so the rename stays compatible.
export const computeWorkerEffects = computeAggregatedAbilities;
