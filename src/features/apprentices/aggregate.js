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
import { SPECIES_BY_CATEGORY } from "../species/data.js";

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
 * @param {object} state - game state with state.workers.hired
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
  };

  const hired = state?.workers?.hired ?? {};
  const debt = state?.workers?.debt ?? 0;
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
