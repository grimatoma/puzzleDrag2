import { RECIPES } from "../../constants.js";
import { computeWorkerEffects } from "../apprentices/aggregate.js";
import { locBuilt } from "../../locBuilt.js";

export const initial = { craftedTotals: {} };

/**
 * Phase 4 — apply per-hire recipe-input reductions from `computeWorkerEffects`
 * to the recipe's raw input requirements. Each input is floored at 1 so
 * crafting always costs at least one of every listed resource.
 */
function effectiveRecipeInputs(state, recipeKey, recipeInputs) {
  const agg = computeWorkerEffects(state);
  const reduce = agg.recipeInputReduce?.[recipeKey];
  if (!reduce) return recipeInputs;
  const out = {};
  for (const [res, need] of Object.entries(recipeInputs)) {
    const cut = Math.round(reduce[res] ?? 0);
    out[res] = Math.max(1, need - cut);
  }
  return out;
}

export function reduce(state, action) {
  if (action.type !== "CRAFTING/CRAFT_RECIPE") return state;

  // Support both action.recipeKey (legacy UI) and action.payload.key (test/spec form)
  const recipeKey = action.recipeKey ?? action.payload?.key;
  const recipe = RECIPES[recipeKey];
  if (!recipe) return state;

  const built = locBuilt(state);
  if (!built[recipe.station]) return state;

  const inputs = effectiveRecipeInputs(state, recipeKey, recipe.inputs);

  const inv = state.inventory || {};
  for (const [res, need] of Object.entries(inputs)) {
    if ((inv[res] || 0) < need) return state;
  }

  const newInv = { ...inv };
  for (const [res, need] of Object.entries(inputs)) {
    newInv[res] = (newInv[res] || 0) - need;
  }

  // Tool recipes (water_pump, explosives) credit state.tools so the crafted
  // item is usable from the Tools panel. Everything else is a sellable
  // inventory item (bread, jam, planks, …).
  let nextTools = state.tools;
  if (recipe.tool) {
    nextTools = { ...(state.tools || {}), [recipe.tool]: ((state.tools || {})[recipe.tool] ?? 0) + 1 };
  } else {
    newInv[recipeKey] = (newInv[recipeKey] || 0) + 1;
  }

  return {
    ...state,
    inventory: newInv,
    tools: nextTools,
    coins: (state.coins || 0) + recipe.coins,
    craftedTotals: {
      ...state.craftedTotals,
      [recipeKey]: ((state.craftedTotals || {})[recipeKey] || 0) + 1,
    },
    bubble: {
      npc: "mira",
      text: `Crafted ${recipe.name}!`,
      ms: 1500,
      id: Date.now(),
    },
  };
}
