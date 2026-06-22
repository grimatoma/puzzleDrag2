import { WorkerTypeId } from "../../types/catalogKeys.js";
import { PRODUCTION_LINES, lineStep } from "../../config/productionLines.js";

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
const BASE_WORKERS: WorkerDef[] = [
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

interface LineWorkerMeta {
  id: WorkerTypeId; category: string; name: string; role: string;
  iconKey: string; color: string; coins: number; coinsStep: number;
  costResource: string; description: string; flavor: string;
}

const LINE_WORKER_META: LineWorkerMeta[] = [
  { id: WorkerTypeId.Peasant, category: "grass", name: "Peasant", role: "Hayward", iconKey: "worker_farmer", color: "#6fa838", coins: 40, coinsStep: 20, costResource: "tile_grass_grass", description: `Each Peasant shaves ${lineStep("grass")} tiles off the hay chain.`, flavor: "Hands that have bundled hay since before the mill turned." },
  { id: WorkerTypeId.Poultryman, category: "bird", name: "Poultryman", role: "Poultryman", iconKey: "worker_farmer", color: "#d9a85c", coins: 55, coinsStep: 25, costResource: "eggs", description: "Each Poultryman trims a tile off the egg chain.", flavor: "Keeps the coop calm and the nests full." },
  { id: WorkerTypeId.VegetablePicker, category: "vegetables", name: "Vegetable Picker", role: "Picker", iconKey: "worker_farmer", color: "#d97b32", coins: 50, coinsStep: 25, costResource: "tile_veg_carrot", description: "Each Picker trims a tile off the vegetable chain.", flavor: "First to the rows at dawn, basket already half full." },
  { id: WorkerTypeId.FruitPicker, category: "fruits", name: "Fruit Picker", role: "Picker", iconKey: "worker_farmer", color: "#d44b48", coins: 60, coinsStep: 30, costResource: "tile_fruit_apple", description: "Each Picker trims a tile off the fruit chain.", flavor: "Knows which orchard ripens first by the smell of the wind." },
  { id: WorkerTypeId.BeeKeeper, category: "flowers", name: "Bee Keeper", role: "Apiarist", iconKey: "worker_farmer", color: "#d96bb0", coins: 80, coinsStep: 40, costResource: "tile_flower_pansy", description: "Each Bee Keeper trims a tile off the flower-to-honey chain.", flavor: "Unhurried among the hives — the bees have never once stung her." },
  { id: WorkerTypeId.Herder, category: "herd_animals", name: "Herder", role: "Herder", iconKey: "worker_farmer", color: "#c97e7a", coins: 55, coinsStep: 25, costResource: "meat", description: "Each Herder trims a tile off the herd chain.", flavor: "A whistle and a nod, and the whole drove turns." },
  { id: WorkerTypeId.Dairywoman, category: "cattle", name: "Dairywoman", role: "Dairywoman", iconKey: "worker_farmer", color: "#9c6230", coins: 60, coinsStep: 30, costResource: "milk", description: "Each Dairywoman trims a tile off the cattle chain.", flavor: "Up before the cock, pails already scrubbed and waiting." },
  { id: WorkerTypeId.Wrangler, category: "mounts", name: "Wrangler", role: "Wrangler", iconKey: "worker_farmer", color: "#6f86b0", coins: 90, coinsStep: 45, costResource: "horseshoe", description: "Each Wrangler trims a tile off the mount chain.", flavor: "Breaks no horse — befriends it." },
  { id: WorkerTypeId.IronMiner, category: "mine_iron_ore", name: "Iron Miner", role: "Miner", iconKey: "worker_miner", color: "#a3795a", coins: 70, coinsStep: 35, costResource: "tile_mine_iron_ore", description: "Each Iron Miner trims a tile off the ore chain.", flavor: "Reads a vein the way Mira reads a recipe." },
  { id: WorkerTypeId.CoalMiner, category: "mine_coal", name: "Coal Miner", role: "Miner", iconKey: "worker_miner", color: "#4a4f57", coins: 70, coinsStep: 35, costResource: "tile_mine_coal", description: "Each Coal Miner trims a tile off the coal chain.", flavor: "Comes up black to the elbows and grinning." },
  { id: WorkerTypeId.GemCutter, category: "mine_gem", name: "Gem-cutter", role: "Lapidary", iconKey: "worker_miner", color: "#9b59c4", coins: 110, coinsStep: 55, costResource: "tile_mine_gem", description: "Each Gem-cutter trims a tile off the gem chain.", flavor: "One steady tap, and the rough stone gives up its fire." },
  { id: WorkerTypeId.GoldMiner, category: "mine_gold", name: "Gold Miner", role: "Miner", iconKey: "worker_miner", color: "#e8c33a", coins: 120, coinsStep: 60, costResource: "tile_mine_gold", description: "Each Gold Miner trims a tile off the gold chain.", flavor: "Follows the glint deeper than the rest dare." },
  { id: WorkerTypeId.Digger, category: "special_dirt", name: "Digger", role: "Digger", iconKey: "worker_miner", color: "#7a5236", coins: 50, coinsStep: 25, costResource: "tile_special_dirt", description: `Each Digger shaves ${lineStep("special_dirt")} tiles off the dirt-clearing work.`, flavor: "Moves more earth in a morning than a mule in a day." },
  { id: WorkerTypeId.Fisherman, category: "fish", name: "Fisherman", role: "Fisher", iconKey: "worker_farmer", color: "#3f9cb5", coins: 50, coinsStep: 25, costResource: "tile_fish_sardine", description: "Each Fisherman trims a tile off the fishing chain.", flavor: "Mends his nets by feel, eyes always on the tide." },
];

function productionLineWorkers(): WorkerDef[] {
  return LINE_WORKER_META.map((m) => ({
    id: m.id, name: m.name, role: m.role,
    look: { iconKey: m.iconKey, color: m.color },
    hireCost: { coins: m.coins, coinsStep: m.coinsStep, resources: { [m.costResource]: 2 }, resourcesStepEvery: 3 },
    maxCount: PRODUCTION_LINES[m.category].maxCount,
    abilities: [{ id: "threshold_reduce_category", params: { category: m.category, amount: lineStep(m.category) } }],
    description: m.description, flavor: m.flavor,
  }));
}

export const TYPE_WORKERS: WorkerDef[] = [
  ...BASE_WORKERS,
  ...productionLineWorkers(),
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
