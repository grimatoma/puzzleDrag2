// Type-tier workers — the game's worker system.
//
// Anonymous, generic roles (Farmer, Lumberjack, Miner, Baker) that the
// player hires by type. Each type has a high `maxCount` and a stackable
// per-hire effect: hiring more of a type shaves more tiles off the
// matching chain (or stretches the matching recipe).
//
// Abilities are folded through `features/workers/aggregate.js` alongside
// building + active-tile abilities. `threshold_reduce_category` and
// `recipe_input_reduce` iterate per-hire from `(amount) * hired / maxCount`,
// so worker reductions accumulate additively on the shared channel.
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
    iconKey: "ui_farmer",
    color: "#4f8c3a",
    hireCost: { coins: 50, coinsStep: 25 },
    maxCount: 10,
    abilities: [
      { id: "threshold_reduce_category", params: { category: "grain", amount: 1 } },
    ],
    description: "Each hired Farmer trims one tile off the grain chain.",
  },
  {
    id: "lumberjack",
    name: "Lumberjack",
    role: "Lumberjack",
    iconKey: "ui_star",
    color: "#7a4f1f",
    hireCost: { coins: 60, coinsStep: 30 },
    maxCount: 10,
    abilities: [
      { id: "threshold_reduce_category", params: { category: "trees", amount: 1 } },
    ],
    description: "Each hired Lumberjack trims one tile off the tree-felling chain.",
  },
  {
    id: "miner",
    name: "Miner",
    role: "Miner",
    iconKey: "ui_build",
    color: "#7a8490",
    hireCost: { coins: 75, coinsStep: 35 },
    maxCount: 10,
    abilities: [
      { id: "threshold_reduce_category", params: { category: "wood", amount: 1 } },
    ],
    description: "Each hired Miner trims one tile off the plank-and-beam chain.",
  },
  {
    id: "baker",
    name: "Baker",
    role: "Baker",
    iconKey: "ui_star",
    color: "#c89b6a",
    hireCost: { coins: 75, coinsMult: 1.4 },
    maxCount: 10,
    abilities: [
      { id: "recipe_input_reduce", params: { recipe: "bread", input: "grain_flour", amount: 2 } },
    ],
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
