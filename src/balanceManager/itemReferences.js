// Cross-reference index — "where is this item used?"
//
// Walks every catalog that mentions item ids by name (recipes, buildings,
// the upgrade-chain .next pointers, story-beat choice outcomes) and emits
// a flat list of usages per item id. Designers tweaking a resource can
// check the index before retiring or renaming it: anything still pointing
// at the id flags an upcoming break.
//
// Pure module — takes its catalogs as arguments so tests can drive
// synthetic data, with real defaults sourced from src/constants.js.

import { ITEMS, RECIPES, BUILDINGS } from "../constants.js";
import { STORY_BEATS, SIDE_BEATS } from "../story.js";

function asArrayValues(v) {
  return Array.isArray(v) ? v : Object.values(v || {});
}

/**
 * Returns a map `{ [itemId]: Usage[] }` where each usage is one of:
 *
 *   { kind: 'recipe_input',    recipeId, qty, station? }
 *   { kind: 'recipe_output',   recipeId, station? }
 *   { kind: 'building_cost',   buildingId, qty }
 *   { kind: 'chain_next',      fromId }                  (an item whose .next points at this id)
 *   { kind: 'story_outcome',   beatId, choiceId, qty }   (resources awarded by a choice)
 */
export function buildItemReferenceIndex({
  items = ITEMS, recipes = RECIPES, buildings = BUILDINGS,
  storyBeats = STORY_BEATS, sideBeats = SIDE_BEATS,
} = {}) {
  const out = new Map();
  const ensure = (id) => {
    if (!out.has(id)) out.set(id, []);
    return out.get(id);
  };

  for (const [recipeId, recipe] of Object.entries(recipes || {})) {
    for (const [inputId, qty] of Object.entries(recipe?.inputs || {})) {
      ensure(inputId).push({ kind: "recipe_input", recipeId, qty, station: recipe.station });
    }
    if (typeof recipe?.item === "string") {
      ensure(recipe.item).push({ kind: "recipe_output", recipeId, station: recipe.station });
    }
  }

  for (const b of asArrayValues(buildings)) {
    if (!b || !b.id) continue;
    const costs = b.cost || {};
    for (const [costId, qty] of Object.entries(costs)) {
      if (costId === "coins" || costId === "runes" || costId === "embers" || costId === "coreIngots" || costId === "gems") continue;
      ensure(costId).push({ kind: "building_cost", buildingId: b.id, qty });
    }
  }

  for (const [id, item] of Object.entries(items || {})) {
    const target = item?.next;
    if (typeof target === "string" && target && target !== id) {
      ensure(target).push({ kind: "chain_next", fromId: id });
    }
  }

  for (const beat of [...(storyBeats || []), ...(sideBeats || [])]) {
    if (!beat || !Array.isArray(beat.choices)) continue;
    for (const c of beat.choices) {
      const res = c?.outcome?.resources;
      if (!res || typeof res !== "object") continue;
      for (const [resourceId, qty] of Object.entries(res)) {
        if (!Number.isFinite(qty) || qty === 0) continue;
        ensure(resourceId).push({ kind: "story_outcome", beatId: beat.id, choiceId: c.id, qty });
      }
    }
  }

  return out;
}

/** Pretty-friendly grouping of an item's usages by `kind`. */
export function groupUsagesByKind(usages) {
  const groups = new Map();
  for (const u of usages || []) {
    if (!groups.has(u.kind)) groups.set(u.kind, []);
    groups.get(u.kind).push(u);
  }
  return groups;
}

/** Convenience: usages of a single item id (returns []). */
export function usagesFor(itemId, index) {
  const idx = index || buildItemReferenceIndex();
  return idx.get(itemId) || [];
}

/** Total usage count across every kind — handy for badges. */
export function totalUsageCount(usages) {
  return (usages || []).length;
}
