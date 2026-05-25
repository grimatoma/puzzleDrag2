// Recipe dependency graph — for a given recipe id, recursively trace its
// inputs back through the recipes that produce them, building a tree
// like:
//
//   rec_bread
//     └── flour  (← rec_flour)
//            └── grain  (← raw)
//     └── water        (← raw)
//
// Useful when tuning unlock-gating: "to craft a steel bar, the player
// needs … (the full upstream chain)".
//
// Pure module; takes catalogs as args so tests run on synthetic data.

import { RECIPES, ITEMS } from "../constants.js";

/** Build a Map(outputItemId → recipeId[]) for fast producer lookup. */
function producerIndex(recipes: Record<string, any>): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [recipeId, recipe] of Object.entries(recipes || {})) {
    const item = recipe?.["item"];
    if (typeof item !== "string") continue;
    if (!out.has(item)) out.set(item, []);
    out.get(item)!.push(recipeId);
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
export function traceRecipe(recipeId: string, { recipes = RECIPES, items = ITEMS, maxDepth = 6 }: { recipes?: Record<string, any>; items?: Record<string, any>; maxDepth?: number } = {}) {
  const producers = producerIndex(recipes);
  const visit = (rid: string, depth: number, stack: Set<string>): any => {
    const recipe = recipes?.[rid];
    if (!recipe) return null;
    if (stack.has(rid)) return { recipeId: rid, station: recipe["station"], output: recipe["item"], cyclical: true, ingredients: [] };
    const nextStack = new Set(stack);
    nextStack.add(rid);
    const ingredients: any[] = [];
    for (const [inputId, qty] of Object.entries(recipe["inputs"] || {})) {
      const sources = (producers.get(inputId) || []);
      const raw = sources.length === 0;
      const expanded = (depth >= maxDepth) ? [] : sources.map((srcId: string) => visit(srcId, depth + 1, nextStack)).filter(Boolean);
      ingredients.push({
        id: inputId,
        qty,
        label: items?.[inputId]?.["label"] || inputId,
        raw,
        sources: expanded,
        truncated: depth >= maxDepth && sources.length > 0,
      });
    }
    return { recipeId: rid, station: recipe["station"], output: recipe["item"], ingredients };
  };
  return visit(recipeId, 1, new Set());
}

/** Flatten the tree to a list of unique upstream recipe ids (for badges/lints). */
export function collectUpstreamRecipes(tree: any): string[] {
  const ids = new Set<string>();
  const walk = (node: any) => {
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
export function countRawInputs(tree: any): number {
  if (!tree) return 0;
  let n = 0;
  for (const ing of (tree.ingredients || [])) {
    if (ing.raw) n += 1;
    else for (const src of ing.sources) n += countRawInputs(src);
  }
  return n;
}
