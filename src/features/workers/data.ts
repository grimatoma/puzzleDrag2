import { WorkerTypeId } from "../../types/catalogKeys.js";

/** A single ability instance on a worker (or building / tile). */
export interface WorkerAbility {
  id: string;
  params?: Record<string, unknown>;
  trigger?: string;
  [extra: string]: unknown;
}

export interface WorkerHireCost {
  coins?: number;
  coinsStep?: number;
  coinsMult?: number;
  resources?: Record<string, number>;
  resourcesStepEvery?: number;
}

export interface WorkerDef {
  id: WorkerTypeId;
  name: string;
  role: string;
  look: { iconKey: string; color: string };
  hireCost: WorkerHireCost;
  maxCount: number;
  abilities: WorkerAbility[];
  description: string;
  /** Short in-world line giving the worker a place in Hearthwood Vale. */
  flavor?: string;
  [extra: string]: unknown;
}

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
export const TYPE_WORKERS: WorkerDef[] = [
  {
    id: WorkerTypeId.Farmer,
    name: "Farmer",
    role: "Farmer",
    look: { iconKey: "worker_farmer", color: "#4f8c3a" },
    hireCost: { coins: 50, coinsStep: 25, resources: { tile_grass_grass: 2 }, resourcesStepEvery: 3 },
    maxCount: 10,
    abilities: [
      { id: "threshold_reduce_category", params: { category: "grain", amount: 1 } },
    ],
    description: "Each hired Farmer trims one tile off the grain chain.",
    flavor: "Hearthwood's fieldhands know every furrow — and they keep Mira's mill fed.",
  },
  {
    id: WorkerTypeId.Lumberjack,
    name: "Lumberjack",
    role: "Lumberjack",
    look: { iconKey: "worker_lumberjack", color: "#7a4f1f" },
    hireCost: { coins: 60, coinsStep: 30, resources: { tile_tree_oak: 2 }, resourcesStepEvery: 3 },
    maxCount: 10,
    abilities: [
      { id: "threshold_reduce_category", params: { category: "trees", amount: 1 } },
    ],
    description: "Each hired Lumberjack trims one tile off the tree-felling chain.",
    flavor: "Wren's woodcutters. They take only what the grove can spare, and no more.",
  },
  {
    id: WorkerTypeId.Miner,
    name: "Miner",
    role: "Miner",
    look: { iconKey: "worker_miner", color: "#7a8490" },
    hireCost: { coins: 75, coinsStep: 35, resources: { tile_mine_stone: 2 }, resourcesStepEvery: 3 },
    maxCount: 10,
    abilities: [
      { id: "threshold_reduce_category", params: { category: "mine_stone", amount: 1 } },
    ],
    description: "Each hired Miner trims one tile off the stone-mining chain.",
    flavor: "Bram's pickhands, at home in the dark where the good stone hides.",
  },
  {
    id: WorkerTypeId.Baker,
    name: "Baker",
    role: "Baker",
    look: { iconKey: "worker_baker", color: "#c89b6a" },
    hireCost: { coins: 75, coinsMult: 1.4, resources: { flour: 1, eggs: 1 }, resourcesStepEvery: 3 },
    maxCount: 10,
    abilities: [
      { id: "recipe_input_reduce", params: { recipe: "bread", input: "flour", amount: 1 } },
    ],
    description: "Each hired Baker trims one flour off the bread recipe.",
    flavor: "Flour-dusted apprentices from Mira's kitchen, quick at the kneading board.",
  },
];

export const TYPE_WORKER_MAP = Object.fromEntries(TYPE_WORKERS.map((w) => [w.id, w]));

/** Initial workers state slice — hired counts default to 0. */
export function defaultWorkersSlice() {
  const hired: Record<string, number> = {};
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
export function nextHireCost(worker: WorkerDef | null | undefined, count: number): number {
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

/** Resource bundle for the next hire. Multiplies every `resources` entry by
 *  1 + floor(currentCount / resourcesStepEvery). */
export function nextHireResourceCost(worker: WorkerDef | null | undefined, count: number): Record<string, number> {
  const resources = worker?.hireCost?.resources;
  if (!resources || typeof resources !== "object") return {};
  const c = Math.max(0, count | 0);
  const stepEveryRaw = worker?.hireCost?.resourcesStepEvery;
  const stepEvery = Number.isFinite(stepEveryRaw) && (stepEveryRaw ?? 0) > 0 ? Math.floor(stepEveryRaw as number) : 3;
  const mult = 1 + Math.floor(c / stepEvery);
  const out: Record<string, number> = {};
  for (const [key, amount] of Object.entries(resources)) {
    const n = Math.floor(Number(amount));
    if (key && Number.isFinite(n) && n > 0) out[key] = n * mult;
  }
  return out;
}
