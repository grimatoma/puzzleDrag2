// Worker hire-cost curve analysis. Walks each worker's ramp config
// (flat / linear / geometric) via the canonical `nextHireCost` helper
// and emits both the per-hire ladder and the running total cost to fill
// up the worker's `maxCount`. Useful when tuning the worker economy:
// "what's the total cost to max out every Farmer? At what point does
// the geometric Smith become prohibitive?"
//
// Pure module; takes its catalog as an argument with the live catalog
// as the default.

import { TYPE_WORKERS, nextHireCost } from "../features/workers/data.js";

const RAMP_LABELS = {
  flat:      { label: "Flat",      hint: "Every hire costs the same." },
  linear:    { label: "Linear",    hint: "Cost grows by +step each hire." },
  geometric: { label: "Geometric", hint: "Cost multiplies by ×factor each hire." },
};

function rampKindFor(worker) {
  const hc = worker?.hireCost || {};
  if (typeof hc.coinsMult === "number" && hc.coinsMult > 0) return "geometric";
  if (typeof hc.coinsStep === "number" && hc.coinsStep > 0) return "linear";
  return "flat";
}

/**
 * For one worker, build:
 *
 *   {
 *     id, name, ramp: { kind, label, hint, factor, step },
 *     ladder:    [{ n, cost, cumulative }],
 *     totalCost: <sum across all hires to maxCount>,
 *     maxCount,
 *     base,
 *   }
 *
 * `n` is the 0-indexed hire (n=0 is the first hire, n=maxCount-1 is the
 * last). `cumulative` is the sum of costs up to and including hire `n`.
 */
export function workerCostLadder(worker) {
  if (!worker || !worker.id) return null;
  const ramp = rampKindFor(worker);
  const max = Math.max(0, worker.maxCount | 0);
  const ladder = [];
  let cumulative = 0;
  for (let n = 0; n < max; n += 1) {
    const cost = nextHireCost(worker, n);
    cumulative += cost;
    ladder.push({ n, cost, cumulative });
  }
  return {
    id: worker.id,
    name: worker.name || worker.id,
    iconKey: worker.iconKey || null,
    color: worker.color || null,
    base: Number(worker?.hireCost?.coins) || 0,
    maxCount: max,
    ramp: {
      kind: ramp,
      label: RAMP_LABELS[ramp].label,
      hint: RAMP_LABELS[ramp].hint,
      factor: Number(worker?.hireCost?.coinsMult) || null,
      step: Number(worker?.hireCost?.coinsStep) || null,
    },
    ladder,
    totalCost: cumulative,
  };
}

/** Build a ladder for every worker in the catalog. */
export function allWorkerLadders({ workers = TYPE_WORKERS } = {}) {
  return (Array.isArray(workers) ? workers : []).map(workerCostLadder).filter(Boolean);
}

/** Sum the totalCost across every worker — "what's a maxed town worth?" */
export function totalWorkerEconomy(ladders) {
  return (ladders || []).reduce((s, l) => s + (l.totalCost || 0), 0);
}

export const WORKER_RAMP_KINDS = Object.keys(RAMP_LABELS);
