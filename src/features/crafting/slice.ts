import { RECIPES, ITEMS, CRAFT_GEM_SKIP_COST, recipeCraftMs } from "../../constants.js";
import { computeWorkerEffects } from "../workers/aggregate.js";
import { locBuilt } from "../../locBuilt.js";
import type { Action, GameState } from "../../types/state.js";

// Phase 5 — per-station crafting queues. Each station (bakery, larder, forge,
// workshop, kitchen, smokehouse, …) has its own sequential queue under
// `craftQueues[station]`. Stations run independently in parallel; within a
// station only the head ticks down.
//
// Queue entry: { key, queuedAt, startAt, readyAt, durationMs }
export interface CraftQueueEntry {
  key: string;
  queuedAt: number;
  startAt: number;
  readyAt: number;
  durationMs: number;
}

export interface CraftingSlice {
  craftedTotals: Record<string, number>;
  craftQueues: Record<string, CraftQueueEntry[]>;
}

export const initial: CraftingSlice = { craftedTotals: {}, craftQueues: {} };

interface RecipeDef {
  item: string;
  station: string;
  inputs: Record<string, number>;
  coins?: number;
  craftMs?: number;
}

interface CraftingHostState {
  inventory?: Record<string, number>;
  tools?: Record<string, number>;
  coins?: number;
  gems?: number;
  craftedTotals?: Record<string, number>;
  craftQueues?: Record<string, CraftQueueEntry[]>;
  totalCrafted?: number;
  bubble?: { id: number; npc: string; text: string; ms: number } | null;
}

interface WorkerEffects {
  recipeInputReduce?: Record<string, Record<string, number>>;
}

/**
 * Phase 4 — apply per-hire recipe-input reductions from `computeWorkerEffects`
 * to the recipe's raw input requirements. Each input is floored at 1 so
 * crafting always costs at least one of every listed resource.
 */
export function effectiveRecipeInputs(state: GameState, recipeKey: string, recipeInputs: Record<string, number>): Record<string, number> {
  const agg = computeWorkerEffects(state) as WorkerEffects;
  const recipeMap = RECIPES as unknown as Record<string, RecipeDef | undefined>;
  const itemKey = recipeMap[recipeKey]?.item;
  const reduce = agg.recipeInputReduce?.[recipeKey] ?? (itemKey ? agg.recipeInputReduce?.[itemKey] : null);
  if (!reduce) return recipeInputs;
  const out: Record<string, number> = {};
  for (const [res, need] of Object.entries(recipeInputs)) {
    const cut = Math.round(reduce[res] ?? 0);
    out[res] = Math.max(1, need - cut);
  }
  return out;
}

export interface CanPayResult {
  recipe: RecipeDef;
  inputs: Record<string, number>;
}

/** Can the player pay for `recipeKey` right now (station built + inputs in hand)? */
export function canPayForRecipe(state: GameState, recipeKey: string): CanPayResult | null {
  const recipeMap = RECIPES as unknown as Record<string, RecipeDef | undefined>;
  const recipe = recipeMap[recipeKey];
  if (!recipe) return null;
  const built = locBuilt(state) as Record<string, boolean>;
  if (!built[recipe.station]) return null;
  const inputs = effectiveRecipeInputs(state, recipeKey, recipe.inputs);
  const s = state as unknown as CraftingHostState;
  const inv: Record<string, number> = s.inventory || {};
  for (const [res, need] of Object.entries(inputs)) {
    if ((inv[res] || 0) < need) return null;
  }
  return { recipe, inputs };
}

/** Deduct `inputs` from inventory; returns the new inventory object. */
function payInputs(inv: Record<string, number>, inputs: Record<string, number>): Record<string, number> {
  const next: Record<string, number> = { ...inv };
  for (const [res, need] of Object.entries(inputs)) next[res] = (next[res] || 0) - need;
  return next;
}

/**
 * Grant the output of a completed craft onto `state` (inventory/tools +
 * craftedTotals) and return the new state. Shared by instant CRAFT_RECIPE,
 * CLAIM_CRAFT, and SKIP_CRAFT. `baseInventory` lets callers pass an already
 * input-deducted inventory (the queue path deducted at queue time).
 */
function grantCraftOutput(state: GameState, recipeKey: string, recipe: RecipeDef, baseInventory?: Record<string, number>): GameState {
  const s = state as unknown as CraftingHostState;
  const inv: Record<string, number> = { ...(baseInventory ?? s.inventory ?? {}) };
  let tools: Record<string, number> | undefined = s.tools;
  const itemMap = ITEMS as unknown as Record<string, { kind?: string; label?: string } | undefined>;
  const itemDef = itemMap[recipe.item];
  if (itemDef?.kind === "tool") {
    tools = { ...(s.tools || {}), [recipe.item]: ((s.tools || {})[recipe.item] ?? 0) + 1 };
  } else {
    inv[recipe.item] = (inv[recipe.item] || 0) + 1;
  }
  return {
    ...state,
    inventory: inv,
    tools,
    coins: (s.coins ?? 0) + (recipe.coins ?? 0),
    craftedTotals: {
      ...s.craftedTotals,
      [recipeKey]: ((s.craftedTotals || {})[recipeKey] || 0) + 1,
    },
  } as unknown as GameState;
}

export function reduce(state: GameState, action: Action): GameState {
  const s = state as unknown as CraftingHostState;
  const itemMap = ITEMS as unknown as Record<string, { kind?: string; label?: string } | undefined>;
  const recipeMap = RECIPES as unknown as Record<string, RecipeDef | undefined>;
  switch (action.type) {
    case "CRAFTING/CRAFT_RECIPE": {
      // Support both action.recipeKey (legacy UI) and action.payload.key.
      const recipeKey = action.recipeKey ?? action.payload?.key;
      if (!recipeKey) return state;
      const paid = canPayForRecipe(state, recipeKey);
      if (!paid) return state;
      const inv = payInputs(s.inventory || {}, paid.inputs);
      const next = grantCraftOutput(state, recipeKey, paid.recipe, inv);
      return { ...next, bubble: { npc: "mira", text: `Crafted ${itemMap[paid.recipe.item]?.label}!`, ms: 1500, id: Date.now() } } as GameState;
    }

    case "CRAFTING/QUEUE_RECIPE": {
      const recipeKey = action.recipeKey ?? action.payload?.key;
      if (!recipeKey) return state;
      const paid = canPayForRecipe(state, recipeKey);
      if (!paid) return state;
      const station = paid.recipe.station;
      const inv = payInputs(s.inventory || {}, paid.inputs);
      const now = Date.now();
      const queues: Record<string, CraftQueueEntry[]> = s.craftQueues ?? {};
      const queue: CraftQueueEntry[] = queues[station] ?? [];
      const last = queue[queue.length - 1];
      const startAt = Math.max(now, last?.readyAt ?? 0);
      const durationMs = recipeCraftMs(recipeKey);
      const readyAt = startAt + durationMs;
      return {
        ...state,
        inventory: inv,
        craftQueues: {
          ...queues,
          [station]: [...queue, { key: recipeKey, queuedAt: now, startAt, readyAt, durationMs }],
        },
        bubble: { npc: "mira", text: `Queued ${itemMap[paid.recipe.item]?.label}.`, ms: 1500, id: Date.now() },
      } as GameState;
    }
    case "CRAFTING/CLAIM_CRAFT": {
      // Only the head of `station`'s queue can be claimed, and only when
      // ready. coreReducer (src/state.js) fires the `craft_made` event for
      // story beats + ember_drake boss progress; we also bump achievements
      // `totalCrafted` so the queued path matches instant CRAFT_RECIPE.
      const station = action.payload?.station ?? action.station;
      if (!station) return state;
      const queues: Record<string, CraftQueueEntry[]> = s.craftQueues ?? {};
      const queue: CraftQueueEntry[] = queues[station] ?? [];
      const entry = queue[0];
      if (!entry || (entry.readyAt ?? Infinity) > Date.now()) return state;
      const recipe = recipeMap[entry.key];
      if (!recipe) return state;
      const next = grantCraftOutput(state, entry.key, recipe, s.inventory || {});
      const ns = next as unknown as CraftingHostState;
      return {
        ...next,
        craftQueues: { ...queues, [station]: queue.slice(1) },
        totalCrafted: (ns.totalCrafted || 0) + 1,
        bubble: { npc: "mira", text: `Crafted ${itemMap[recipe.item]?.label}!`, ms: 1500, id: Date.now() },
      } as GameState;
    }
    case "CRAFTING/SKIP_CRAFT": {
      // Spend a gem to finish `station`'s head instantly; the remaining
      // queue shifts earlier by however much time the skipped item still
      // had to run, so the next item begins crafting NOW instead of waiting.
      const station = action.payload?.station ?? action.station;
      if (!station) return state;
      const queues: Record<string, CraftQueueEntry[]> = s.craftQueues ?? {};
      const queue: CraftQueueEntry[] = queues[station] ?? [];
      const entry = queue[0];
      if (!entry) return state;
      const recipe = recipeMap[entry.key];
      if (!recipe) return state;
      if ((s.gems ?? 0) < CRAFT_GEM_SKIP_COST) return state;
      const now = Date.now();
      const shift = Math.max(0, (entry.readyAt ?? now) - now);
      const restShifted: CraftQueueEntry[] = queue.slice(1).map((e: CraftQueueEntry) => ({
        ...e,
        startAt: (e.startAt ?? 0) - shift,
        readyAt: (e.readyAt ?? 0) - shift,
      }));
      const next = grantCraftOutput({ ...state, gems: (s.gems ?? 0) - CRAFT_GEM_SKIP_COST } as GameState, entry.key, recipe, s.inventory || {});
      const ns = next as unknown as CraftingHostState;
      return {
        ...next,
        craftQueues: { ...queues, [station]: restShifted },
        totalCrafted: (ns.totalCrafted || 0) + 1,
        bubble: { npc: "mira", text: `Skipped ahead — crafted ${itemMap[recipe.item]?.label}!`, ms: 1600, id: Date.now() },
      } as GameState;
    }

    default:
      return state;
  }
}
