// Recipe dependency graph — for a given recipe id, recursively trace its
// inputs back through the recipes that produce them, building a tree
// like:
//
//   rec_bread
//     └── grain_flour  (← rec_flour)
//            └── grain  (← raw)
//     └── water        (← raw)
//
// Useful when tuning unlock-gating: "to craft a steel bar, the player
// needs … (the full upstream chain)".
//
// Pure module; takes catalogs as args so tests run on synthetic data.

import { RECIPES, ITEMS } from "../constants.js";

/** Build a Map(outputItemId → recipeId[]) for fast producer lookup. */
function producerIndex(recipes) {
  const out = new Map();
  for (const [recipeId, recipe] of Object.entries(recipes || {})) {
    const item = recipe?.item;
    if (typeof item !== "string") continue;
    if (!out.has(item)) out.set(item, []);
    out.get(item).push(recipeId);
  }
  return out;
}

/**
 * Trace `recipeId` and return its dependency tree:
 *
 *   { recipeId, station, output, qty?, ingredients: [{ id, qty, label, sources: TreeNode[], raw: bool }] }
 *
 * Cycles are detected and short-circuited (a node carries `cyclical: true`).
 * Unknown / raw ingredients (no producing recipe) are marked `raw: true`.
 */
export function traceRecipe(recipeId, { recipes = RECIPES, items = ITEMS, maxDepth = 6 } = {}) {
  const producers = producerIndex(recipes);
  const visit = (rid, depth, stack) => {
    const recipe = recipes?.[rid];
    if (!recipe) return null;
    if (stack.has(rid)) return { recipeId: rid, station: recipe.station, output: recipe.item, cyclical: true, ingredients: [] };
    const nextStack = new Set(stack);
    nextStack.add(rid);
    const ingredients = [];
    for (const [inputId, qty] of Object.entries(recipe.inputs || {})) {
      const sources = (producers.get(inputId) || []);
      const raw = sources.length === 0;
      const expanded = (depth >= maxDepth) ? [] : sources.map((srcId) => visit(srcId, depth + 1, nextStack)).filter(Boolean);
      ingredients.push({
        id: inputId,
        qty,
        label: items?.[inputId]?.label || inputId,
        raw,
        sources: expanded,
        truncated: depth >= maxDepth && sources.length > 0,
      });
    }
    return { recipeId: rid, station: recipe.station, output: recipe.item, ingredients };
  };
  return visit(recipeId, 1, new Set());
}

/** Flatten the tree to a list of unique upstream recipe ids (for badges/lints). */
export function collectUpstreamRecipes(tree) {
  const ids = new Set();
  const walk = (node) => {
    if (!node) return;
    for (const ing of (node.ingredients || [])) {
      for (const src of (ing.sources || [])) {
        if (!ids.has(src.recipeId)) {
          ids.add(src.recipeId);
          walk(src);
        }
      }
    }
  };
  walk(tree);
  return [...ids].sort();
}

/** Count raw (non-craftable) inputs across the full tree. */
export function countRawInputs(tree) {
  if (!tree) return 0;
  let n = 0;
  for (const ing of (tree.ingredients || [])) {
    if (ing.raw) n += 1;
    else for (const src of ing.sources) n += countRawInputs(src);
  }
  return n;
}
