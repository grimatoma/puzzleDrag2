// Canonical recipe iteration for Dev Panel UIs.
//
// RECIPES includes backward-compat aliases: RECIPES[rake] → same object as
// rec_rake, plus underscore variants (rec_iron_frame → rec_ironframe). UIs
// that map outputs must dedupe by recipe object identity.

import { RECIPES } from "../constants.js";

/**
 * @param {Record<string, object>} recipes
 * @returns {[string, object][]} First-seen key per unique recipe object.
 */
export function canonicalRecipeEntries(recipes: Record<string, unknown> = RECIPES): [string, unknown][] {
  const seen = new Set<object>();
  const out: [string, unknown][] = [];
  for (const [recipeId, recipe] of Object.entries(recipes || {})) {
    if (!recipe || typeof recipe !== "object") continue;
    if (seen.has(recipe as object)) continue;
    seen.add(recipe as object);
    out.push([recipeId, recipe]);
  }
  return out;
}

/**
 * Map item id → recipes that craft it (draft overlays merged per recipe).
 *
 * @param {{ recipes?: Record<string, object>, draftRecipes?: Record<string, object> }} opts
 */
export function buildRecipesByOutput({ recipes = RECIPES, draftRecipes = {} }: { recipes?: Record<string, any>; draftRecipes?: Record<string, any> } = {}) {
  const methods: Record<string, any[]> = {};
  const seen = new Set<object>();

  for (const [recId, rec] of canonicalRecipeEntries(recipes) as [string, Record<string, any>][]) {
    seen.add(rec);
    const draftRec = draftRecipes[recId];
    const effItem = draftRec?.item ?? rec["item"];
    if (!effItem) continue;
    if (!methods[effItem]) methods[effItem] = [];
    methods[effItem].push({ recId, ...rec, ...draftRec });
  }

  // Draft-only recipes (created in Dev Panel, not yet in RECIPES).
  for (const [recId, draftRec] of Object.entries(draftRecipes || {})) {
    const dr = draftRec as Record<string, any>;
    if (!dr?.["item"]) continue;
    const base = recipes[recId];
    if (base && seen.has(base)) continue;
    if (!methods[dr["item"]]) methods[dr["item"]] = [];
    methods[dr["item"]].push({ recId, ...dr });
  }

  return methods;
}
