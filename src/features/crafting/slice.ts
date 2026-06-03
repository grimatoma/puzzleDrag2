import {
  RECIPES,
  getItem,
  CRAFT_GEM_SKIP_COST,
  recipeCraftMs,
  type RecipeDefinition,
  type ItemEntry,
} from "../../constants.js";
import { computeWorkerEffects } from "../workers/aggregate.js";
import { locBuilt } from "../../locBuilt.js";
import { inventoryQty } from "../../types/inventory.js";
import { inventoryZone, zoneInventory } from "../../state/zoneInventory.js";
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
  const itemKey = RECIPES[recipeKey]?.item;
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
  recipe: RecipeDefinition;
  inputs: Record<string, number>;
}

/** Can the player pay for `recipeKey` right now (station built + inputs in hand)? */
export function canPayForRecipe(state: GameState, recipeKey: string): CanPayResult | null {
  const recipe = RECIPES[recipeKey];
  if (!recipe) return null;
  const built = locBuilt(state) as Record<string, boolean>;
  if (!built[recipe.station]) return null;
  const inputs = effectiveRecipeInputs(state, recipeKey, recipe.inputs);
  const inv = zoneInventory(state);
  for (const [res, need] of Object.entries(inputs)) {
    if (inventoryQty(inv, res) < need) return null;
  }
  return { recipe, inputs };
}

/** Deduct `inputs` from inventory; returns the new inventory object. */
function payInputs(inv: Record<string, number>, inputs: Record<string, number>): Record<string, number> {
  const next: Record<string, number> = { ...inv };
  for (const [res, need] of Object.entries(inputs)) next[res] = (next[res] || 0) - need;
  return next;
}

function itemDef(key: string): ItemEntry | undefined {
  return getItem(key);
}

/**
 * Grant the output of a completed craft onto `state` (inventory/tools +
 * craftedTotals) and return the new state. Shared by instant CRAFT_RECIPE,
 * CLAIM_CRAFT, and SKIP_CRAFT. `baseInventory` lets callers pass an already
 * input-deducted inventory (the queue path deducted at queue time).
 */
function grantCraftOutput(state: GameState, recipeKey: string, recipe: RecipeDefinition, baseInventory?: Record<string, number>): GameState {
  const craftZone = inventoryZone(state);
  const inv: Record<string, number> = { ...(baseInventory ?? zoneInventory(state)) };
  let tools = state.tools;
  const item = itemDef(recipe.item);
  if (item?.kind === "tool") {
    tools = { ...state.tools, [recipe.item]: toolCount(state.tools, recipe.item) + 1 };
  } else {
    inv[recipe.item] = (inv[recipe.item] || 0) + 1;
  }
  return {
    ...state,
    inventory: { ...state.inventory, [craftZone]: inv },
    tools,
    coins: state.coins + (recipe.coins ?? 0),
    craftedTotals: {
      ...(state.craftedTotals ?? {}),
      [recipeKey]: ((state.craftedTotals ?? {})[recipeKey] || 0) + 1,
    },
  };
}

function toolCount(tools: GameState["tools"], key: string): number {
  const raw = tools[key];
  return typeof raw === "number" ? raw : 0;
}

export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "CRAFTING/CRAFT_RECIPE": {
      const recipeKey = action.recipeKey ?? action.payload?.key;
      if (!recipeKey) return state;
      const paid = canPayForRecipe(state, recipeKey);
      if (!paid) return state;
      const inv = payInputs(zoneInventory(state), paid.inputs);
      const next = grantCraftOutput(state, recipeKey, paid.recipe, inv);
      return { ...next, bubble: { npc: "mira", text: `Crafted ${itemDef(paid.recipe.item)?.label}!`, ms: 1500, id: Date.now() } };
    }

    case "CRAFTING/QUEUE_RECIPE": {
      const recipeKey = action.recipeKey ?? action.payload?.key;
      if (!recipeKey) return state;
      const paid = canPayForRecipe(state, recipeKey);
      if (!paid) return state;
      const station = paid.recipe.station;
      const craftZone = inventoryZone(state);
      const inv = payInputs(zoneInventory(state), paid.inputs);
      const now = Date.now();
      const queues = state.craftQueues;
      const queue: CraftQueueEntry[] = queues[station] ?? [];
      const last = queue[queue.length - 1];
      const startAt = Math.max(now, last?.readyAt ?? 0);
      const durationMs = recipeCraftMs(recipeKey);
      const readyAt = startAt + durationMs;
      return {
        ...state,
        inventory: { ...state.inventory, [craftZone]: inv },
        craftQueues: {
          ...queues,
          [station]: [...queue, { key: recipeKey, queuedAt: now, startAt, readyAt, durationMs }],
        },
        bubble: { npc: "mira", text: `Queued ${itemDef(paid.recipe.item)?.label}.`, ms: 1500, id: Date.now() },
      };
    }
    case "CRAFTING/CLAIM_CRAFT": {
      const station = action.payload?.station ?? action.station;
      if (!station) return state;
      const queues = state.craftQueues;
      const queue: CraftQueueEntry[] = queues[station] ?? [];
      const entry = queue[0];
      if (!entry || (entry.readyAt ?? Infinity) > Date.now()) return state;
      const recipe = RECIPES[entry.key];
      if (!recipe) return state;
      const next = grantCraftOutput(state, entry.key, recipe, zoneInventory(state));
      return {
        ...next,
        craftQueues: { ...queues, [station]: queue.slice(1) },
        totalCrafted: state.totalCrafted + 1,
        bubble: { npc: "mira", text: `Crafted ${itemDef(recipe.item)?.label}!`, ms: 1500, id: Date.now() },
      };
    }
    case "CRAFTING/SKIP_CRAFT": {
      const station = action.payload?.station ?? action.station;
      if (!station) return state;
      const queues = state.craftQueues;
      const queue: CraftQueueEntry[] = queues[station] ?? [];
      const entry = queue[0];
      if (!entry) return state;
      const recipe = RECIPES[entry.key];
      if (!recipe) return state;
      if (state.gems < CRAFT_GEM_SKIP_COST) return state;
      const now = Date.now();
      const shift = Math.max(0, (entry.readyAt ?? now) - now);
      const restShifted: CraftQueueEntry[] = queue.slice(1).map((e: CraftQueueEntry) => ({
        ...e,
        startAt: (e.startAt ?? 0) - shift,
        readyAt: (e.readyAt ?? 0) - shift,
      }));
      const next = grantCraftOutput(
        { ...state, gems: state.gems - CRAFT_GEM_SKIP_COST },
        entry.key,
        recipe,
        zoneInventory(state),
      );
      return {
        ...next,
        craftQueues: { ...queues, [station]: restShifted },
        totalCrafted: state.totalCrafted + 1,
        bubble: { npc: "mira", text: `Skipped ahead — crafted ${itemDef(recipe.item)?.label}!`, ms: 1600, id: Date.now() },
      };
    }

    default:
      return state;
  }
}
