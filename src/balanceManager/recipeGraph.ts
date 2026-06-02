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

export interface RecipeRecord {
  item?: string;
  station?: string;
  inputs?: Record<string, number>;
  tier?: number;
  [extra: string]: unknown;
}

export interface ItemRecord {
  label?: string;
  [extra: string]: unknown;
}

export interface RecipeTreeIngredient {
  id: string;
  qty: number;
  label: string;
  raw: boolean;
  sources: RecipeTreeNode[];
  truncated: boolean;
}

export interface RecipeTreeNode {
  recipeId: string;
  station?: string;
  output?: string;
  cyclical?: boolean;
  ingredients: RecipeTreeIngredient[];
}

/** Build a Map(outputItemId → recipeId[]) for fast producer lookup. */
function producerIndex(recipes: Record<string, RecipeRecord>): Map<string, string[]> {
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
export function traceRecipe(recipeId: string, { recipes = RECIPES, items = ITEMS, maxDepth = 6 }: { recipes?: Record<string, RecipeRecord>; items?: Record<string, ItemRecord>; maxDepth?: number } = {}): RecipeTreeNode | null {
  const producers = producerIndex(recipes);
  const visit = (rid: string, depth: number, stack: Set<string>): RecipeTreeNode | null => {
    const recipe = recipes?.[rid];
    if (!recipe) return null;
    if (stack.has(rid)) return { recipeId: rid, station: recipe["station"], output: recipe["item"], cyclical: true, ingredients: [] };
    const nextStack = new Set(stack);
    nextStack.add(rid);
    const ingredients: RecipeTreeIngredient[] = [];
    for (const [inputId, qty] of Object.entries(recipe["inputs"] || {})) {
      const sources = (producers.get(inputId) || []);
      const raw = sources.length === 0;

      const expanded: RecipeTreeNode[] = [];
      if (depth < maxDepth) {
        for (let i = 0; i < sources.length; i++) {
          const n = visit(sources[i], depth + 1, nextStack);
          if (n) expanded.push(n);
        }
      }

      ingredients.push({
        id: inputId,
        qty: qty as number,
        label: items?.[inputId]?.["label"] as string || inputId,
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
export function collectUpstreamRecipes(tree: RecipeTreeNode | null): string[] {
  const ids = new Set<string>();
  const walk = (node: RecipeTreeNode | null) => {
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
export function countRawInputs(tree: RecipeTreeNode | null): number {
  if (!tree) return 0;
  let n = 0;
  for (const ing of (tree.ingredients || [])) {
    if (ing.raw) n += 1;
    else for (const src of ing.sources) n += countRawInputs(src);
  }
  return n;
}
