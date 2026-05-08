// Phase 5b — Type-tier workers.
//
// Distinct from `src/features/apprentices/` (TOWNSFOLK), which models the
// named individuals — Hilda, Pip, Wila, etc. — with personalities and
// one-off requirements. Type-tier workers are anonymous, generic roles
// (Farmer, Lumberjack, Miner, Baker) that the player hires by type. Each
// type has a high `maxCount` and a stackable per-hire effect.
//
// Effect schema is shared with apprentices/aggregate.js — `threshold_reduce_category`
// and `recipe_input_reduce` both iterate per-hire from `(from - to) / maxCount`,
// so type workers and townsfolk reductions accumulate additively on the
// same channel (e.g. a Farmer + Brenna both shrink the vegetables chain).
//
// Hire-cost ramp (config-driven). The cost of hiring the N-th worker of a
// type (0-indexed; the very first hire is N=0) is computed by
// `nextHireCost`:
//
//   coinsStep present  -> coins + coinsStep * N   (linear ramp)
//   coinsMult present  -> round(coins * coinsMult ** N)   (geometric ramp)
//   neither            -> coins                   (flat — pre-ramp default)
//
// Designers can tune any individual worker's curve from here without
// touching engine code. If both keys are present, `coinsMult` wins.
export const TYPE_WORKERS = [
  {
    id: "farmer",
    name: "Farmer",
    role: "Farmer",
    icon: "🧑‍🌾",
    color: "#4f8c3a",
    hireCost: { coins: 50, coinsStep: 25 },
    maxCount: 10,
    effect: {
      type: "threshold_reduce_category",
      category: "grain",
      from: 6,
      to: 5,
    },
    description: "Each hired Farmer trims one tile off the grain chain.",
  },
  {
    id: "lumberjack",
    name: "Lumberjack",
    role: "Lumberjack",
    icon: "🪓",
    color: "#7a4f1f",
    hireCost: { coins: 60, coinsStep: 30 },
    maxCount: 10,
    effect: {
      type: "threshold_reduce_category",
      category: "trees",
      from: 6,
      to: 5,
    },
    description: "Each hired Lumberjack trims one tile off the tree-felling chain.",
  },
  {
    id: "miner",
    name: "Miner",
    role: "Miner",
    icon: "⛏",
    color: "#7a8490",
    hireCost: { coins: 75, coinsStep: 35 },
    maxCount: 10,
    effect: {
      type: "threshold_reduce_category",
      category: "wood",
      from: 7,
      to: 6,
    },
    description: "Each hired Miner trims one tile off the plank-and-beam chain.",
  },
  {
    id: "baker",
    name: "Baker",
    role: "Baker",
    icon: "🥖",
    color: "#c89b6a",
    hireCost: { coins: 75, coinsMult: 1.4 },
    maxCount: 10,
    effect: {
      type: "recipe_input_reduce",
      recipe: "bread",
      input: "grain_flour",
      from: 3,
      to: 1,
    },
    description: "Each hired Baker stretches the bread recipe — needs less flour per loaf.",
  },
];

export const TYPE_WORKER_MAP = Object.fromEntries(TYPE_WORKERS.map((w) => [w.id, w]));

/** Initial workers state slice — hired counts default to 0. */
export function defaultWorkersSlice() {
  const hired = {};
  for (const w of TYPE_WORKERS) hired[w.id] = 0;
  return { hired };
}

/**
 * Cost to hire the next worker of a given type, given the current hired
 * count. Returns the coin price for the (count+1)-th hire.
 *
 *   coinsStep present  -> coins + coinsStep * count   (linear ramp)
 *   coinsMult present  -> round(coins * coinsMult ** count)   (geometric)
 *   neither            -> coins                       (flat)
 *
 * `coinsMult` wins when both are present.
 */
export function nextHireCost(worker, count) {
  const c = Math.max(0, count | 0);
  const base = worker?.hireCost?.coins ?? 0;
  const mult = worker?.hireCost?.coinsMult;
  const step = worker?.hireCost?.coinsStep;
  if (typeof mult === "number" && mult > 0) {
    return Math.round(base * Math.pow(mult, c));
  }
  if (typeof step === "number" && step > 0) {
    return base + step * c;
  }
  return base;
}

// Phase 6 — Balance Manager hook. Apply any committed/draft overrides from
// `src/config/balance.json` + the localStorage draft to the live TYPE_WORKERS
// array at module load time.
import { BALANCE_OVERRIDES } from "../../constants.js";
import { applyWorkerOverrides } from "../../config/applyOverrides.js";
applyWorkerOverrides(TYPE_WORKERS, BALANCE_OVERRIDES.workers);
