import { RECIPES } from "../../constants.js";

export const initial = { craftedTotals: {} };

export function reduce(state, action) {
  if (action.type !== "CRAFTING/CRAFT_RECIPE") return state;

  // Support both action.recipeKey (legacy UI) and action.payload.key (test/spec form)
  const recipeKey = action.recipeKey ?? action.payload?.key;
  const recipe = RECIPES[recipeKey];
  if (!recipe) return state;

  const built = state.built || {};
  if (!built[recipe.station]) return state;

  const inv = state.inventory || {};
  for (const [res, need] of Object.entries(recipe.inputs)) {
    if ((inv[res] || 0) < need) return state;
  }

  const newInv = { ...inv };
  for (const [res, need] of Object.entries(recipe.inputs)) {
    newInv[res] = (newInv[res] || 0) - need;
  }

  newInv[recipeKey] = (newInv[recipeKey] || 0) + 1;

  return {
    ...state,
    inventory: newInv,
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
