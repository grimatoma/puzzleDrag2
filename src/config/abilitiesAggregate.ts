// Unified ability aggregator.
//
// Walks a list of `sources` (each `{ kind, sourceId, abilities, weight }`)
// and folds every ability into the appropriate output channel. The shape
// of the returned object is a superset of the legacy worker-effects shape,
// so existing call sites in state.js (`workerEffects.thresholdReduce[k]`,
// `seasonBonus.coins`, etc.) continue to read what they always did.
//
// New channels added by this refactor:
//   seasonEndTools        { [toolId]: number }
//   seasonEndPoolStep     number
//   boardPreserveBiomes   Set<string>
//   coinBonusFlat / coinBonusPerTile / freeMoves / freeMovesIfChain — these
//     used to live on per-tile `effects` and were read off the chain-tile
//     directly; they now also accumulate across all sources for aggregation.

import { getAbility } from "./abilities.js";

/** Empty channel object — every consumer in the codebase reads from one of these keys. */
export function emptyChannels(): {
  thresholdReduce: Record<string, number>;
  poolWeight: Record<string, number>;
  bonusYield: Record<string, number>;
  seasonBonus: Record<string, number>;
  effectivePoolWeights: Record<string, number>;
  hazardSpawnReduce: Record<string, number>;
  hazardCoinMultiplier: Record<string, number>;
  chainRedirect: Record<string, { toCategory: string; threshold: number; redirectShare: number }>;
  recipeInputReduce: Record<string, Record<string, number>>;
  freeMoves: number;
  freeMovesIfChain: { minChain: number; count: number } | null;
  coinBonusFlat: number;
  coinBonusPerTile: number;
  runeSupportReduce: number;
  seasonEndTools: Record<string, number>;
  seasonEndPoolStep: number;
  boardPreserveBiomes: Set<string>;
  turnBudgetBonus: number;
  inventoryCapBonus: number;
} {
  return {
    thresholdReduce: {},
    poolWeight: {},
    bonusYield: {},
    seasonBonus: {},
    effectivePoolWeights: {},
    hazardSpawnReduce: {},
    hazardCoinMultiplier: {},
    chainRedirect: {},
    recipeInputReduce: {},

    // Tile-derived channels (also exposed on tile.effects for legacy reads).
    freeMoves: 0,
    freeMovesIfChain: null,
    coinBonusFlat: 0,
    coinBonusPerTile: 0,
    runeSupportReduce: 0,

    // Building-only channels (new).
    seasonEndTools: {},
    seasonEndPoolStep: 0,
    boardPreserveBiomes: new Set<string>(),
    turnBudgetBonus: 0,
    inventoryCapBonus: 0,
  };
}

/**
 * Apply one ability instance into the channel object.
 *
 * @param {object} out         Channels object to mutate.
 * @param {object} ability     Catalog entry (from getAbility).
 * @param {object} params      Ability params on the source instance.
 * @param {number} weight      0..1 weight for the source.
 *                              Workers: hiredCount/maxCount.
 *                              Tiles/buildings (active/built): 1.
 * @param {object} ctx         Optional context: { speciesByCategory } for category expansion.
 */
/** Source descriptor entries passed to {@link aggregateAbilities}. */
export interface AbilityInstance {
  id: string;
  params?: Record<string, unknown>;
  trigger?: string;
}

/** Catalog entry as returned by {@link getAbility}. */
export interface AbilityCatalogEntry {
  id: string;
  trigger?: string;
  scope?: readonly string[];
  channel?: string;
  [extra: string]: unknown;
}

export interface AbilitySource {
  abilities?: AbilityInstance[];
  weight?: number;
  kind?: string;
  sourceId?: string;
  [extra: string]: unknown;
}

/** Channel output object — see {@link emptyChannels} for the canonical shape. */
export type AbilityChannels = ReturnType<typeof emptyChannels>;

/** Optional context for the aggregator, e.g. category → tile list for category expansion. */
export interface AbilityContext {
  speciesByCategory?: Record<string, Array<{ baseResource?: string; [k: string]: unknown }>>;
  [extra: string]: unknown;
}

export function applyAbilityToChannels(out: AbilityChannels, ability: AbilityCatalogEntry | null | undefined, params: Record<string, unknown> | null | undefined, weight: number, ctx: AbilityContext = {}): void {
  if (!ability || weight <= 0) return;
  const p = params || {};

  switch (ability.id) {
    case "threshold_reduce": {
      const target = String(p.target || "");
      const amount = Number(p.amount) || 0;
      if (!target || amount <= 0) break;
      out.thresholdReduce[target] = (out.thresholdReduce[target] ?? 0) + amount * weight;
      break;
    }
    case "threshold_reduce_category": {
      const list = ctx.speciesByCategory?.[String(p.category ?? "")] ?? [];
      const amount = Number(p.amount) || 0;
      if (amount <= 0) break;
      for (const sp of list) {
        const k = sp.baseResource;
        if (!k) continue;
        out.thresholdReduce[k] = (out.thresholdReduce[k] ?? 0) + amount * weight;
      }
      break;
    }
    case "pool_weight_legacy": {
      const target = String(p.target || "");
      const amount = Number(p.amount) || 0;
      if (!target || amount <= 0) break;
      out.poolWeight[target] = (out.poolWeight[target] ?? 0) + amount * weight;
      break;
    }
    case "pool_weight": {
      const target = String(p.target || "");
      const amount = Number(p.amount) || 0;
      if (!target || amount <= 0) break;
      // Per-source floor — preserves Phase 9 semantics where 1/2 hire of a
      // +1 worker contributes 0, not 0.5. Tiles + buildings have weight 1
      // so the floor is a no-op for them.
      const contribution = Math.floor(amount * weight);
      if (contribution > 0) {
        out.effectivePoolWeights[target] =
          (out.effectivePoolWeights[target] ?? 0) + contribution;
      }
      break;
    }
    case "bonus_yield": {
      const target = String(p.target || "");
      const amount = Number(p.amount) || 0;
      if (!target || amount <= 0) break;
      out.bonusYield[target] = (out.bonusYield[target] ?? 0) + amount * weight;
      break;
    }
    case "season_bonus": {
      const resource = String(p.resource || "coins");
      const amount = Number(p.amount) || 0;
      if (amount <= 0) break;
      out.seasonBonus[resource] = (out.seasonBonus[resource] ?? 0) + amount * weight;
      break;
    }
    case "recipe_input_reduce": {
      const recipe = String(p.recipe || "");
      const input = String(p.input || "");
      const amount = Number(p.amount) || 0;
      if (!recipe || !input || amount <= 0) break;
      if (!out.recipeInputReduce[recipe]) out.recipeInputReduce[recipe] = {};
      out.recipeInputReduce[recipe][input] =
        (out.recipeInputReduce[recipe][input] ?? 0) + amount * weight;
      break;
    }
    case "chain_redirect_category": {
      const fromCategory = String(p.fromCategory || "");
      const toCategory = String(p.toCategory || "");
      const baseT = Number(p.baseThreshold) || 0;
      const minT = Number(p.minThreshold) || 0;
      if (!fromCategory || !toCategory || baseT <= 0 || minT <= 0) break;
      // Effective threshold: linear from baseThreshold (weight=0) to
      // minThreshold (weight=1). Multiple workers redirecting the same
      // source category collapse to the lowest (most generous) threshold.
      const eff = baseT - (baseT - minT) * weight;
      const prev = out.chainRedirect[fromCategory];
      if (!prev || eff < prev.threshold) {
        out.chainRedirect[fromCategory] = {
          toCategory,
          threshold: eff,
          redirectShare: weight,
        };
      }
      break;
    }
    case "hazard_spawn_reduce": {
      const hazard = String(p.hazard || "");
      const amount = Number(p.amount) || 0;
      if (!hazard || amount <= 0) break;
      out.hazardSpawnReduce[hazard] = Math.min(
        1.0,
        (out.hazardSpawnReduce[hazard] ?? 0) + amount * weight,
      );
      break;
    }
    case "hazard_coin_multiplier": {
      const hazard = String(p.hazard || "");
      const mult = Number(p.multiplier) || 0;
      if (!hazard || mult <= 1) break;
      const bonus = (mult - 1) * weight; // additive past 1×
      out.hazardCoinMultiplier[hazard] =
        (out.hazardCoinMultiplier[hazard] ?? 1) + bonus;
      break;
    }
    case "free_moves": {
      const count = Number(p.count) || 0;
      if (count <= 0) break;
      out.freeMoves = (out.freeMoves || 0) + Math.floor(count * weight);
      break;
    }
    case "free_turn_if_chain": {
      const minChain = Number(p.minChain) || 0;
      if (minChain <= 1) break;
      // Multiple if-chain hooks — keep the easiest-to-trigger one (lowest minChain).
      if (!out.freeMovesIfChain || minChain < out.freeMovesIfChain.minChain) {
        out.freeMovesIfChain = { minChain, count: 1 };
      }
      break;
    }
    case "coin_bonus_flat": {
      const amount = Number(p.amount) || 0;
      if (amount <= 0) break;
      out.coinBonusFlat = (out.coinBonusFlat || 0) + Math.floor(amount * weight);
      break;
    }
    case "coin_bonus_per_tile": {
      const amount = Number(p.amount) || 0;
      if (amount <= 0) break;
      out.coinBonusPerTile = (out.coinBonusPerTile || 0) + Math.floor(amount * weight);
      break;
    }
    case "rune_support_reduce": {
      const amount = Number(p.amount) || 0;
      if (amount <= 0) break;
      out.runeSupportReduce = (out.runeSupportReduce || 0) + Math.floor(amount * weight);
      break;
    }
    case "turn_budget_bonus": {
      const amount = Number(p.amount) || 0;
      if (amount <= 0) break;
      out.turnBudgetBonus = (out.turnBudgetBonus ?? 0) + Math.floor(amount * weight);
      break;
    }
    case "inventory_cap_bonus": {
      const amount = Number(p.amount) || 0;
      if (amount <= 0) break;
      out.inventoryCapBonus = (out.inventoryCapBonus ?? 0) + Math.floor(amount * weight);
      break;
    }
    case "grant_tool": {
      const tool = String(p.tool || "");
      const amount = Number(p.amount) || 0;
      if (!tool || amount <= 0) break;
      out.seasonEndTools[tool] = (out.seasonEndTools[tool] ?? 0) + Math.floor(amount * weight);
      break;
    }
    case "worker_pool_step": {
      const amount = Number(p.amount) || 0;
      if (amount <= 0) break;
      out.seasonEndPoolStep = (out.seasonEndPoolStep || 0) + Math.floor(amount * weight);
      break;
    }
    case "preserve_board": {
      const biome = String(p.biome || "");
      if (biome) out.boardPreserveBiomes.add(biome);
      break;
    }
    default:
      if (import.meta.env.DEV) {
        throw new Error(`Unknown ability id (no channel handler): "${ability.id}"`);
      }
      break;
  }
}

/**
 * Aggregate abilities across many sources into one channel object.
 *
 * @param {Array<{abilities: Array, weight: number, kind?: string, sourceId?: string}>} sources
 * @param {object} ctx — { speciesByCategory } and any future context.
 * @returns {object} channel object (see `emptyChannels`).
 */
export function aggregateAbilities(sources: AbilitySource[] | null | undefined, ctx: AbilityContext = {}): AbilityChannels {
  const out = emptyChannels();
  if (!Array.isArray(sources)) return out;
  for (const src of sources) {
    if (!src || !Array.isArray(src.abilities) || src.abilities.length === 0) continue;
    const weight = Math.max(0, Math.min(1, Number(src.weight) || 0));
    if (weight <= 0) continue;
    for (const inst of src.abilities) {
      if (!inst || typeof inst !== "object") continue;
      if (typeof inst.id !== "string" || inst.id.length === 0) continue;
      const def = getAbility(inst.id);
      if (!def) {
        if (import.meta.env.DEV) throw new Error(`Unknown ability id: "${inst.id}"`);
        continue;
      }
      applyAbilityToChannels(out, def, inst.params || {}, weight, ctx);
    }
  }
  return out;
}

/**
 * Iterate every ability instance in `sources` whose trigger matches `trigger`.
 * Useful for state.js call-sites that want to react per-source rather than
 * via aggregated channels (e.g. dispatching ABILITY_FIRED).
 */
export function forEachAbilityWithTrigger(
  sources: AbilitySource[] | null | undefined,
  trigger: string,
  fn: (entry: { ability: AbilityCatalogEntry; params: Record<string, unknown>; weight: number; source: AbilitySource }) => void,
): void {
  if (!Array.isArray(sources)) return;
  for (const src of sources) {
    if (!src || !Array.isArray(src.abilities)) continue;
    for (const inst of src.abilities) {
      if (!inst || typeof inst !== "object") continue;
      if (typeof inst.id !== "string" || inst.id.length === 0) continue;
      const def = getAbility(inst.id);
      if (!def) {
        if (import.meta.env.DEV) throw new Error(`Unknown ability id: "${inst.id}"`);
        continue;
      }
      // The instance's `trigger` overrides the catalog default when present.
      const t = inst.trigger || def.trigger;
      if (t !== trigger) continue;
      fn({ ability: def, params: inst.params || {}, weight: src.weight ?? 1, source: src });
    }
  }
}

/**
 * Compile a list of abilities (typically a single tile's) into the legacy
 * `effects` shape that GameScene + state.js read off `tile.effects.*`.
 *
 * Only the channels that historically lived on tiles are emitted; broader
 * worker-aggregator channels (thresholdReduce, etc.) are collected through
 * the global aggregator instead.
 *
 * Fields written:
 *   abilities:        the input array (round-trip)
 *   freeMoves:        sum of free_moves.count (only set when > 0)
 *   freeMovesIfChain: { minChain, count: 1 } from the lowest minChain hook
 *   coinBonusFlat:    sum of coin_bonus_flat.amount (only set when > 0)
 *   coinBonusPerTile: sum of coin_bonus_per_tile.amount (only set when > 0)
 *   poolWeightDelta:  merged additively with base (preserves hard-coded base entries)
 *   thresholdReduce:  merged additively with base
 *
 * The caller (applyTileOverrides) is responsible for stripping prior
 * ability-derived fields from `baseEffects` when the abilities list is
 * being replaced wholesale. This function only ADDS — it never removes a
 * field that was on `baseEffects`.
 */
export function expandAbilitiesToEffects(abilities: AbilityInstance[] | null | undefined, baseEffects: Record<string, unknown> = {}): Record<string, unknown> {
  const out = { ...baseEffects };
  if (!Array.isArray(abilities)) return out;

  out.abilities = abilities;
  if (abilities.length === 0) return out;

  let freeMoves = 0;
  let coinBonusFlat = 0;
  let coinBonusPerTile = 0;
  let freeMovesIfChain: { minChain: number; count: number } | null = null;
  // poolWeightDelta and thresholdReduce merge additively with base.
  const poolWeightDelta: Record<string, number> = { ...((out.poolWeightDelta as Record<string, number> | undefined) || {}) };
  const thresholdReduce: Record<string, number> = { ...((out.thresholdReduce as Record<string, number> | undefined) || {}) };

  for (const inst of abilities) {
    if (!inst || typeof inst !== "object") continue;
    if (typeof inst.id !== "string" || inst.id.length === 0) continue;
    const def = getAbility(inst.id);
    if (!def) {
      if (import.meta.env.DEV) throw new Error(`Unknown ability id: "${inst.id}"`);
      continue;
    }
    const p = inst.params || {};
    switch (def.id) {
      case "free_moves":
        freeMoves += Math.max(0, Number(p.count) || 0);
        break;
      case "free_turn_if_chain": {
        const minChain = Number(p.minChain) || 0;
        if (minChain > 1 && (!freeMovesIfChain || minChain < freeMovesIfChain.minChain)) {
          freeMovesIfChain = { minChain, count: 1 };
        }
        break;
      }
      case "coin_bonus_flat":
        coinBonusFlat += Math.max(0, Number(p.amount) || 0);
        break;
      case "coin_bonus_per_tile":
        coinBonusPerTile += Math.max(0, Number(p.amount) || 0);
        break;
      case "pool_weight": {
        const target = String(p.target || "");
        const amount = Number(p.amount) || 0;
        if (target && amount > 0) {
          poolWeightDelta[target] = (poolWeightDelta[target] || 0) + amount;
        }
        break;
      }
      case "threshold_reduce": {
        const target = String(p.target || "");
        const amount = Number(p.amount) || 0;
        if (target && amount > 0) {
          thresholdReduce[target] = (thresholdReduce[target] || 0) + amount;
        }
        break;
      }
      default:
        break;
    }
  }

  if (freeMoves > 0) out.freeMoves = freeMoves;
  if (coinBonusFlat > 0) out.coinBonusFlat = coinBonusFlat;
  if (coinBonusPerTile > 0) out.coinBonusPerTile = coinBonusPerTile;
  if (freeMovesIfChain) out.freeMovesIfChain = freeMovesIfChain;
  if (Object.keys(poolWeightDelta).length > 0) out.poolWeightDelta = poolWeightDelta;
  if (Object.keys(thresholdReduce).length > 0) out.thresholdReduce = thresholdReduce;

  return out;
}
