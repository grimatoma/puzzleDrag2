import {
  RECIPES,
  getItem,
  type RecipeDefinition,
  type ItemEntry,
} from "../../constants.js";
import { computeWorkerEffects } from "../workers/aggregate.js";
import { locBuilt } from "../../locBuilt.js";
import { inventoryQty } from "../../types/inventory.js";
import { inventoryZone, zoneInventory } from "../../state/zoneInventory.js";
import type { Action, GameState } from "../../types/state.js";

export interface CraftingSlice {
  craftedTotals: Record<string, number>;
}

export const initial: CraftingSlice = { craftedTotals: {} };

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

/** Grant the output of a completed craft onto `state` (inventory/tools + craftedTotals). */
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



    default:
      return state;
  }
}
