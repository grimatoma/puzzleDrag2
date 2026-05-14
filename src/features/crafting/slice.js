import { RECIPES, ITEMS, CRAFT_QUEUE_HOURS, CRAFT_GEM_SKIP_COST } from "../../constants.js";
import { computeWorkerEffects } from "../workers/aggregate.js";
import { locBuilt } from "../../locBuilt.js";

export const initial = { craftedTotals: {}, craftQueue: [] };

const CRAFT_QUEUE_MS = CRAFT_QUEUE_HOURS * 60 * 60 * 1000;

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

/** Can the player pay for `recipeKey` right now (station built + inputs in hand)? */
export function canPayForRecipe(state, recipeKey) {
  const recipe = RECIPES[recipeKey];
  if (!recipe) return null;
  const built = locBuilt(state);
  if (!built[recipe.station]) return null;
  const inputs = effectiveRecipeInputs(state, recipeKey, recipe.inputs);
  const inv = state.inventory || {};
  for (const [res, need] of Object.entries(inputs)) {
    if ((inv[res] || 0) < need) return null;
  }
  return { recipe, inputs };
}

/** Deduct `inputs` from inventory; returns the new inventory object. */
function payInputs(inv, inputs) {
  const next = { ...inv };
  for (const [res, need] of Object.entries(inputs)) next[res] = (next[res] || 0) - need;
  return next;
}

/**
 * Grant the output of a completed craft onto `state` (inventory/tools +
 * craftedTotals) and return the new state. Shared by instant CRAFT_RECIPE,
 * CLAIM_CRAFT, and SKIP_CRAFT. `baseInventory` lets callers pass an already
 * input-deducted inventory (the queue path deducted at queue time).
 */
function grantCraftOutput(state, recipeKey, recipe, baseInventory) {
  const inv = { ...(baseInventory ?? state.inventory ?? {}) };
  let tools = state.tools;
  const itemDef = ITEMS[recipe.item];
  if (itemDef?.kind === "tool") {
    tools = { ...(state.tools || {}), [recipe.item]: ((state.tools || {})[recipe.item] ?? 0) + 1 };
  } else {
    inv[recipe.item] = (inv[recipe.item] || 0) + 1;
  }
  return {
    ...state,
    inventory: inv,
    tools,
    coins: (state.coins ?? 0) + (recipe.coins ?? 0),
    craftedTotals: {
      ...state.craftedTotals,
      [recipeKey]: ((state.craftedTotals || {})[recipeKey] || 0) + 1,
    },
  };
}

export function reduce(state, action) {
  switch (action.type) {
    case "CRAFTING/CRAFT_RECIPE": {
      // Support both action.recipeKey (legacy UI) and action.payload.key.
      const recipeKey = action.recipeKey ?? action.payload?.key;
      const paid = canPayForRecipe(state, recipeKey);
      if (!paid) return state;
      const inv = payInputs(state.inventory || {}, paid.inputs);
      const next = grantCraftOutput(state, recipeKey, paid.recipe, inv);
      return { ...next, bubble: { npc: "mira", text: `Crafted ${ITEMS[paid.recipe.item]?.label}!`, ms: 1500, id: Date.now() } };
    }

    // ── Phase 5 — real-time crafting queue ──────────────────────────────────
    case "CRAFTING/QUEUE_RECIPE": {
      const recipeKey = action.recipeKey ?? action.payload?.key;
      const paid = canPayForRecipe(state, recipeKey);
      if (!paid) return state;
      const inv = payInputs(state.inventory || {}, paid.inputs);
      const now = Date.now();
      return {
        ...state,
        inventory: inv,
        craftQueue: [...(state.craftQueue ?? []), { key: recipeKey, queuedAt: now, readyAt: now + CRAFT_QUEUE_MS }],
        bubble: { npc: "mira", text: `Queued ${ITEMS[paid.recipe.item]?.label} — ready in ${CRAFT_QUEUE_HOURS}h.`, ms: 1800, id: Date.now() },
      };
    }
    case "CRAFTING/CLAIM_CRAFT": {
      // Queue-completion path. coreReducer (src/state.js) fires the
      // `craft_made` event for story beats + ember_drake boss progress;
      // we also bump achievements `totalCrafted` here so the queued path
      // contributes to the same counter as the instant CRAFT_RECIPE.
      const idx = action.payload?.idx ?? action.idx;
      const queue = state.craftQueue ?? [];
      const entry = queue[idx];
      if (!entry || (entry.readyAt ?? Infinity) > Date.now()) return state; // not ready
      const recipe = RECIPES[entry.key];
      if (!recipe) return state;
      const next = grantCraftOutput(state, entry.key, recipe, state.inventory || {});
      return {
        ...next,
        craftQueue: queue.filter((_, i) => i !== idx),
        totalCrafted: (next.totalCrafted || 0) + 1,
        bubble: { npc: "mira", text: `Crafted ${ITEMS[recipe.item]?.label}!`, ms: 1500, id: Date.now() },
      };
    }
    case "CRAFTING/SKIP_CRAFT": {
      const idx = action.payload?.idx ?? action.idx;
      const queue = state.craftQueue ?? [];
      const entry = queue[idx];
      if (!entry) return state;
      const recipe = RECIPES[entry.key];
      if (!recipe) return state;
      if ((state.gems ?? 0) < CRAFT_GEM_SKIP_COST) return state;
      const next = grantCraftOutput({ ...state, gems: state.gems - CRAFT_GEM_SKIP_COST }, entry.key, recipe, state.inventory || {});
      return {
        ...next,
        craftQueue: queue.filter((_, i) => i !== idx),
        totalCrafted: (next.totalCrafted || 0) + 1,
        bubble: { npc: "mira", text: `Skipped ahead — crafted ${ITEMS[recipe.item]?.label}!`, ms: 1600, id: Date.now() },
      };
    }

    default:
      return state;
  }
}
