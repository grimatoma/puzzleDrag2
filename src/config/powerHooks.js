// Predefined power hooks that can be attached to any tile via the Balance
// Manager. Each hook has a stable `id`, a human label and description, and a
// list of params that the editor renders as form fields. The runtime reads
// hook entries off a tile's `effects.hooks` array and applies them at the
// appropriate point in the chain pipeline.
//
// To add a new hook:
//   1. Add an entry below.
//   2. Wire its runtime behavior — chain time hooks live in CHAIN_COLLECTED /
//      CHAIN_COMMIT in src/state.js; spawn-time hooks (poolWeightDelta) are
//      already consumed by the apprentices/board-fill aggregator.
//   3. Implement its expansion in `expandHooksToEffects()` so legacy fields
//      (freeMoves, poolWeightDelta) stay populated for code that already
//      reads them.

export const POWER_HOOK_PARAM_TYPES = Object.freeze({
  INT: "int",
  RESOURCE_KEY: "resourceKey",
});

export const POWER_HOOKS = Object.freeze([
  {
    id: "free_moves",
    name: "Free Moves",
    icon: "✨",
    desc: "Grants N free moves whenever a chain containing this tile is collected. Free moves don't consume a turn.",
    params: [
      { key: "count", label: "Free Moves", type: "int", default: 1, min: 1, max: 10 },
    ],
  },
  {
    id: "free_turn_after_n",
    name: "Free Turn (long chain)",
    icon: "⏩",
    desc: "Grants 1 free move only when this tile is part of a chain at least N tiles long.",
    params: [
      { key: "minChain", label: "Min Chain Length", type: "int", default: 6, min: 2, max: 30 },
    ],
  },
  {
    id: "coin_bonus_flat",
    name: "Coin Bonus (flat)",
    icon: "🪙",
    desc: "Adds N coins on top of the chain reward whenever this tile is chained.",
    params: [
      { key: "amount", label: "Coins", type: "int", default: 5, min: 1, max: 1000 },
    ],
  },
  {
    id: "coin_bonus_per_tile",
    name: "Coin Bonus (per tile)",
    icon: "💰",
    desc: "Adds N coins per chained tile when this tile is chained — scales with chain length.",
    params: [
      { key: "amount", label: "Coins / Tile", type: "int", default: 1, min: 1, max: 50 },
    ],
  },
  {
    id: "pool_weight_boost",
    name: "Spawn Boost",
    icon: "🌱",
    desc: "Increases the spawn weight of a target resource on board refill while this tile is discovered.",
    params: [
      { key: "target", label: "Target Resource", type: "resourceKey" },
      { key: "amount", label: "Weight Bonus", type: "int", default: 1, min: 1, max: 5 },
    ],
  },
  {
    id: "threshold_reduction",
    name: "Threshold Reduction",
    icon: "📉",
    desc: "Reduces the upgrade threshold of a target resource by N (passive — applies as long as this tile is discovered).",
    params: [
      { key: "target", label: "Target Resource", type: "resourceKey" },
      { key: "amount", label: "Reduction", type: "int", default: 1, min: 1, max: 5 },
    ],
  },
]);

const HOOK_BY_ID = Object.freeze(Object.fromEntries(POWER_HOOKS.map((h) => [h.id, h])));

export function getPowerHook(id) {
  return HOOK_BY_ID[id] ?? null;
}

/** Default param object for a hook id. */
export function defaultParamsFor(hookId) {
  const hook = HOOK_BY_ID[hookId];
  if (!hook) return {};
  const out = {};
  for (const p of hook.params) {
    if (p.type === "int") out[p.key] = p.default ?? 0;
    else if (p.type === "resourceKey") out[p.key] = "";
    else out[p.key] = p.default ?? null;
  }
  return out;
}

/**
 * Translate an array of `{ id, params }` hook entries into the legacy
 * `effects` object shape that the runtime reads. Existing fields on the
 * passed-in `baseEffects` are preserved unless the hooks override them.
 *
 * Output shape (only fields actually contributed by hooks are present):
 *   {
 *     freeMoves: number,                    // sum of free_moves.count
 *     freeMovesIfChain: { minChain: N, count: 1 },  // free_turn_after_n
 *     coinBonusFlat: number,                // sum of coin_bonus_flat.amount
 *     coinBonusPerTile: number,             // sum of coin_bonus_per_tile.amount
 *     poolWeightDelta: { resKey: number },  // merged from pool_weight_boost
 *     thresholdReduce: { resKey: number },  // merged from threshold_reduction
 *     hooks: original hooks array (kept for editor round-trip)
 *   }
 */
export function expandHooksToEffects(hooks, baseEffects = {}) {
  const out = { ...baseEffects };
  if (!Array.isArray(hooks) || hooks.length === 0) return out;

  out.hooks = hooks;

  for (const entry of hooks) {
    const def = HOOK_BY_ID[entry?.id];
    if (!def) continue;
    const p = entry.params || {};
    switch (entry.id) {
      case "free_moves": {
        const count = Number(p.count) || 0;
        if (count > 0) out.freeMoves = (out.freeMoves || 0) + count;
        break;
      }
      case "free_turn_after_n": {
        const minChain = Number(p.minChain) || 0;
        if (minChain > 1) {
          // The CHAIN_COMMIT handler reads this and grants freeMoves
          // conditionally on chain length.
          out.freeMovesIfChain = { minChain, count: 1 };
        }
        break;
      }
      case "coin_bonus_flat": {
        const amount = Number(p.amount) || 0;
        if (amount > 0) out.coinBonusFlat = (out.coinBonusFlat || 0) + amount;
        break;
      }
      case "coin_bonus_per_tile": {
        const amount = Number(p.amount) || 0;
        if (amount > 0) out.coinBonusPerTile = (out.coinBonusPerTile || 0) + amount;
        break;
      }
      case "pool_weight_boost": {
        const target = String(p.target || "");
        const amount = Number(p.amount) || 0;
        if (target && amount > 0) {
          out.poolWeightDelta = { ...(out.poolWeightDelta || {}) };
          out.poolWeightDelta[target] = (out.poolWeightDelta[target] || 0) + amount;
        }
        break;
      }
      case "threshold_reduction": {
        const target = String(p.target || "");
        const amount = Number(p.amount) || 0;
        if (target && amount > 0) {
          out.thresholdReduce = { ...(out.thresholdReduce || {}) };
          out.thresholdReduce[target] = (out.thresholdReduce[target] || 0) + amount;
        }
        break;
      }
      default: break;
    }
  }
  return out;
}
