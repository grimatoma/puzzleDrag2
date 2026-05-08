/**
 * Phase 9.4 — Extended worker-effects aggregator.
 *
 * Handles both the legacy type-dispatch effects (Phase 4) and the new
 * structured effects introduced for mine workers (Phase 9):
 *   - hazardSpawnReduce  : { [hazardId]: 0..1 } decimal reduction
 *   - poolWeight (object): { [resourceKey]: integer extra copies }
 *
 * Locked Phase 4 max-effect model:
 *   per-hire contribution = effect_max / maxCount
 *   hires clamped to maxCount (never over-counts)
 *
 * Locked floor rule for integer pool-weight fields:
 *   Math.floor(perHire * hiredCount) — fractional contributions don't round up.
 */

import { WORKERS } from "./data.js";
import { TILE_TYPES_BY_CATEGORY as SPECIES_BY_CATEGORY } from "../tileCollection/data.js";

/**
 * Returns an aggregated effects object for the current workforce.
 *
 * Legacy channels (Phase 4):
 *   thresholdReduce   { [key]: number }
 *   bonusYield        { [key]: number }
 *   seasonBonus       { [key]: number }
 *
 * New channels (Phase 9):
 *   effectivePoolWeights  { [key]: integer }  — integer-floored pool-weight tilt
 *   hazardSpawnReduce     { [hazardId]: 0..1 } — capped at 1.0
 *
 * @param {object} state - game state with state.townsfolk.hired
 * @returns {object}
 */
export function computeWorkerEffects(state) {
  const out = {
    thresholdReduce: {},
    poolWeight: {},          // legacy (Phase 4 type-dispatch)
    bonusYield: {},
    seasonBonus: {},
    effectivePoolWeights: {}, // Phase 9 integer-floored pool tilt
    hazardSpawnReduce: {},    // Phase 9 gas-vent / future hazard reduction
    // Cross-chain redirect: when a worker is hired with `chain_redirect_category`,
    // chain upgrades for every species in `fromCategory` produce a tile from
    // `toCategory` (active species there) instead of the species' native `next`.
    // Shape: { [fromCategory]: { toCategory, threshold, redirectShare } }.
    // `redirectShare` ∈ [0, 1] is hiredCount/maxCount — the engine uses it to
    // decide whether the worker is "fully active" for redirect purposes.
    chainRedirect: {},
    // Phase 4 (zones rule overhaul): recipe-input reductions. Shape:
    //   { [recipeKey]: { [inputResourceKey]: number } }
    // The per-hire delta is `(from - to) / maxCount`; reductions stack across
    // workers that target the same recipe + input. Crafting code rounds the
    // accumulated value and floors the remaining required input at 1.
    recipeInputReduce: {},
  };

  const hired = state?.townsfolk?.hired ?? {};
  const debt = state?.townsfolk?.debt ?? 0;
  if (debt > 0) return out; // LOCKED: debt pauses all worker effects

  for (const w of WORKERS) {
    const raw = hired[w.id] ?? 0;
    const count = Math.max(0, Math.min(raw | 0, w.maxCount));
    if (count === 0) continue;

    const e = w.effect;

    // ── Legacy type-dispatch (Phase 4 workers) ──────────────────────────────
    if (e.type) {
      const perHireScalar = count / w.maxCount;
      switch (e.type) {
        case "threshold_reduce":
          out.thresholdReduce[e.key] =
            (out.thresholdReduce[e.key] ?? 0) + (e.from - e.to) * perHireScalar;
          break;
        case "threshold_reduce_category": {
          // Generalization of threshold_reduce: applies the same per-species
          // delta to every species' baseResource within the named category.
          const list = SPECIES_BY_CATEGORY[e.category] ?? [];
          const delta = (e.from - e.to) * perHireScalar;
          for (const sp of list) {
            const k = sp.baseResource;
            if (!k) continue;
            out.thresholdReduce[k] = (out.thresholdReduce[k] ?? 0) + delta;
          }
          break;
        }
        case "chain_redirect_category": {
          // Cross-chain reducer: chains in `fromCategory` produce a tile from
          // `toCategory` instead of the species' native `next`. Threshold for
          // the redirect is `from` at base hire, scaling linearly to `to` at max.
          // Effective threshold = from − (from − to) × (hiredCount / maxCount).
          const eff = e.from - (e.from - e.to) * perHireScalar;
          const prev = out.chainRedirect[e.fromCategory];
          // If multiple workers redirect the same source category, take the
          // lowest threshold (most generous to the player). This is a rare edge
          // case — by default each fromCategory has at most one redirect worker.
          if (!prev || eff < prev.threshold) {
            out.chainRedirect[e.fromCategory] = {
              toCategory: e.toCategory,
              threshold: eff,
              redirectShare: perHireScalar,
            };
          }
          break;
        }
        case "pool_weight":
          out.poolWeight[e.key] =
            (out.poolWeight[e.key] ?? 0) + e.amount * perHireScalar;
          break;
        case "bonus_yield":
          out.bonusYield[e.key] =
            (out.bonusYield[e.key] ?? 0) + e.amount * perHireScalar;
          break;
        case "season_bonus":
          out.seasonBonus[e.key] =
            (out.seasonBonus[e.key] ?? 0) + e.amount * perHireScalar;
          break;
        case "recipe_input_reduce": {
          // Per-hire delta = (from - to) / maxCount; multiplied by hired count.
          // Crafting rounds + floors at 1 remaining input; reductions accumulate
          // across multiple workers targeting the same recipe + input.
          if (!e.recipe || !e.input) break;
          const delta = (e.from - e.to) * perHireScalar;
          if (!out.recipeInputReduce[e.recipe]) out.recipeInputReduce[e.recipe] = {};
          out.recipeInputReduce[e.recipe][e.input] =
            (out.recipeInputReduce[e.recipe][e.input] ?? 0) + delta;
          break;
        }
        default:
          break;
      }
      continue;
    }

    // ── Structured effects (Phase 9 mine workers) ───────────────────────────

    // hazardSpawnReduce: continuous decimal — sum, clamp at 1.0
    if (e.hazardSpawnReduce) {
      for (const [k, maxVal] of Object.entries(e.hazardSpawnReduce)) {
        const perHire = maxVal / w.maxCount;
        out.hazardSpawnReduce[k] = Math.min(
          1.0,
          (out.hazardSpawnReduce[k] ?? 0) + perHire * count,
        );
      }
    }

    // poolWeight (object form): integer floor — fractional per-hire floored
    if (e.poolWeight && typeof e.poolWeight === "object" && !Array.isArray(e.poolWeight)) {
      for (const [k, maxVal] of Object.entries(e.poolWeight)) {
        const perHire = maxVal / w.maxCount;
        out.effectivePoolWeights[k] =
          (out.effectivePoolWeights[k] ?? 0) + Math.floor(perHire * count);
      }
    }
  }

  return out;
}
