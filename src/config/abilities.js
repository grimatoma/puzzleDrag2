// Unified abilities catalog — the single source of truth for every
// modifier that buildings, workers, or tiles can apply to the game.
//
// Each entry declares:
//   - id        — stable string used by data files
//   - scope     — which entity kinds may attach this ability
//   - trigger   — the lifecycle moment when it fires
//   - channel   — the aggregator output bucket it contributes to
//   - params    — schema for the editor + runtime arguments
//
// To add a new ability:
//   1. Add an entry below.
//   2. Add a switch case to `applyAbilityToChannels` in
//      src/config/abilitiesAggregate.js (or extend an existing one).
//   3. If the runtime needs to react at a new trigger point, add a call
//      to `dispatchAbilityFired` from that reducer/selector.

export const ABILITY_PARAM_TYPES = Object.freeze({
  INT: "int",
  FLOAT: "float",
  RESOURCE_KEY: "resourceKey",
  CATEGORY: "category",
  RECIPE: "recipe",
  TOOL: "tool",
  BIOME: "biome",
  HAZARD: "hazard",
});

export const TRIGGERS = Object.freeze({
  PASSIVE: "passive",
  ON_CHAIN_COLLECT: "on_chain_collect",
  ON_CHAIN_COMMIT: "on_chain_commit",
  SEASON_END: "season_end",
  SESSION_END: "session_end",
  ON_BOARD_FILL: "on_board_fill",
});

export const ABILITY_SCOPES = Object.freeze(["building", "worker", "tile"]);

export const ABILITIES = Object.freeze([
  // ── Threshold / pool / yield ───────────────────────────────────────────
  {
    id: "threshold_reduce",
    name: "Threshold Reduce",
    iconKey: "ui_warning",
    desc: "Reduces the upgrade threshold of a target resource by N (scaled by source weight).",
    scope: ["worker", "tile", "building"],
    trigger: "passive",
    channel: "thresholdReduce",
    params: [
      { key: "target", label: "Target Resource", type: "resourceKey" },
      { key: "amount", label: "Reduction", type: "int", default: 1, min: 1, max: 20 },
    ],
  },
  {
    id: "threshold_reduce_category",
    name: "Threshold Reduce (category)",
    iconKey: "ui_warning",
    desc: "Reduces the upgrade threshold of every species in a category.",
    scope: ["worker", "building"],
    trigger: "passive",
    channel: "thresholdReduce",
    params: [
      { key: "category", label: "Category", type: "category" },
      { key: "amount", label: "Reduction", type: "int", default: 1, min: 1, max: 20 },
    ],
  },
  {
    id: "pool_weight_legacy",
    name: "Spawn Boost (continuous)",
    iconKey: "grass_spiky",
    desc: "Adds extra spawn-pool weight on a resource. Contribution scales continuously with source weight (used by Phase 4 workers).",
    scope: ["worker"],
    trigger: "on_board_fill",
    channel: "poolWeight",
    params: [
      { key: "target", label: "Target Resource", type: "resourceKey" },
      { key: "amount", label: "Weight Bonus", type: "int", default: 1, min: 1, max: 10 },
    ],
  },
  {
    id: "pool_weight",
    name: "Spawn Boost",
    iconKey: "grass_spiky",
    desc: "Adds extra spawn-pool weight on a resource. Per-source contribution is floored to integer (used by Phase 9+ workers and tiles).",
    scope: ["worker", "tile", "building"],
    trigger: "on_board_fill",
    channel: "effectivePoolWeights",
    params: [
      { key: "target", label: "Target Resource", type: "resourceKey" },
      { key: "amount", label: "Weight Bonus", type: "int", default: 1, min: 1, max: 10 },
    ],
  },
  {
    id: "bonus_yield",
    name: "Bonus Yield",
    iconKey: "goldring",
    desc: "Adds bonus copies of a resource whenever a chain producing it is collected.",
    scope: ["worker", "tile", "building"],
    trigger: "on_chain_collect",
    channel: "bonusYield",
    params: [
      { key: "target", label: "Target Resource", type: "resourceKey" },
      { key: "amount", label: "Bonus Amount", type: "int", default: 1, min: 1, max: 10 },
    ],
  },
  {
    id: "season_bonus",
    name: "Season Bonus",
    iconKey: "goldring",
    desc: "Pays extra of a resource (typically coins) at season end.",
    scope: ["worker", "building"],
    trigger: "season_end",
    channel: "seasonBonus",
    params: [
      { key: "resource", label: "Resource", type: "resourceKey", default: "coins" },
      { key: "amount", label: "Amount", type: "int", default: 30, min: 1, max: 1000 },
    ],
  },
  {
    id: "recipe_input_reduce",
    name: "Recipe Input Reduce",
    iconKey: "ui_scale",
    desc: "Reduces a recipe's required input quantity for one resource.",
    scope: ["worker", "building"],
    trigger: "passive",
    channel: "recipeInputReduce",
    params: [
      { key: "recipe", label: "Recipe", type: "recipe" },
      { key: "input", label: "Input Resource", type: "resourceKey" },
      { key: "amount", label: "Reduction", type: "int", default: 1, min: 1, max: 10 },
    ],
  },
  {
    id: "chain_redirect_category",
    name: "Chain Redirect (category)",
    iconKey: "ui_enter",
    desc: "Chains in the source category produce a tile from the target category instead of the species' native upgrade.",
    scope: ["worker"],
    trigger: "on_chain_commit",
    channel: "chainRedirect",
    params: [
      { key: "fromCategory", label: "From Category", type: "category" },
      { key: "toCategory", label: "To Category", type: "category" },
      { key: "baseThreshold", label: "Base Threshold", type: "int", default: 6, min: 2, max: 20 },
      { key: "minThreshold", label: "Min Threshold (at full weight)", type: "int", default: 5, min: 2, max: 20 },
    ],
  },

  // ── Hazards (mine biome) ───────────────────────────────────────────────
  {
    id: "hazard_spawn_reduce",
    name: "Hazard Spawn Reduce",
    iconKey: "ui_warning",
    desc: "Reduces the spawn rate of a hazard. Capped at 1.0.",
    scope: ["worker", "building"],
    trigger: "passive",
    channel: "hazardSpawnReduce",
    params: [
      { key: "hazard", label: "Hazard", type: "hazard" },
      { key: "amount", label: "Reduction (0..1)", type: "float", default: 0.5, min: 0, max: 1 },
    ],
  },
  {
    id: "hazard_coin_multiplier",
    name: "Hazard Coin Multiplier",
    iconKey: "goldring",
    desc: "Increases the coin payout when clearing a hazard. Multiplier ≥ 1.",
    scope: ["worker"],
    trigger: "on_chain_commit",
    channel: "hazardCoinMultiplier",
    params: [
      { key: "hazard", label: "Hazard", type: "hazard" },
      { key: "multiplier", label: "Multiplier (×)", type: "float", default: 2.0, min: 1, max: 10 },
    ],
  },

  // ── Tile-style chain abilities ────────────────────────────────────────
  {
    id: "free_moves",
    name: "Free Moves",
    iconKey: "ui_star",
    desc: "Grants N free moves whenever a chain involving this source is collected.",
    scope: ["tile", "building"],
    trigger: "on_chain_collect",
    channel: "freeMoves",
    params: [
      { key: "count", label: "Free Moves", type: "int", default: 1, min: 1, max: 10 },
    ],
  },
  {
    id: "free_turn_if_chain",
    name: "Free Turn (long chain)",
    iconKey: "ui_enter",
    desc: "Grants 1 free move only when the chain is at least N tiles long.",
    scope: ["tile"],
    trigger: "on_chain_commit",
    channel: "freeMovesIfChain",
    params: [
      { key: "minChain", label: "Min Chain Length", type: "int", default: 6, min: 2, max: 30 },
    ],
  },
  {
    id: "coin_bonus_flat",
    name: "Coin Bonus (flat)",
    iconKey: "goldring",
    desc: "Adds N coins on top of the chain reward.",
    scope: ["tile", "building"],
    trigger: "on_chain_commit",
    channel: "coinBonusFlat",
    params: [
      { key: "amount", label: "Coins", type: "int", default: 5, min: 1, max: 1000 },
    ],
  },
  {
    id: "coin_bonus_per_tile",
    name: "Coin Bonus (per tile)",
    iconKey: "goldring",
    desc: "Adds N coins per chained tile — scales with chain length.",
    scope: ["tile"],
    trigger: "on_chain_commit",
    channel: "coinBonusPerTile",
    params: [
      { key: "amount", label: "Coins / Tile", type: "int", default: 1, min: 1, max: 50 },
    ],
  },

  // ── Building-only abilities (new for this refactor) ───────────────────
  {
    id: "grant_tool",
    name: "Grant Tool",
    iconKey: "ui_build",
    desc: "Grants N copies of a tool at the trigger moment (typically season end).",
    scope: ["building"],
    trigger: "season_end",
    channel: "seasonEndTools",
    params: [
      { key: "tool", label: "Tool", type: "tool" },
      { key: "amount", label: "Amount", type: "int", default: 1, min: 1, max: 50 },
    ],
  },
  {
    id: "worker_pool_step",
    name: "Worker Pool Step",
    iconKey: "ui_home",
    desc: "Adds N to the townsfolk hiring pool each season end (Housing Block).",
    scope: ["building"],
    trigger: "season_end",
    channel: "seasonEndPoolStep",
    params: [
      { key: "amount", label: "Pool Step", type: "int", default: 1, min: 1, max: 10 },
    ],
  },
  {
    id: "preserve_board",
    name: "Preserve Board",
    iconKey: "ui_build",
    desc: "Preserves the tile layout between sessions for the named biome (Silo, Barn).",
    scope: ["building"],
    trigger: "session_end",
    channel: "boardPreserveBiomes",
    params: [
      { key: "biome", label: "Biome", type: "biome" },
    ],
  },
]);

const ABILITY_BY_ID = Object.freeze(
  Object.fromEntries(ABILITIES.map((a) => [a.id, a])),
);

export function getAbility(id) {
  return ABILITY_BY_ID[id] ?? null;
}

/** Default param object for an ability id. */
export function defaultParamsFor(abilityId) {
  const a = ABILITY_BY_ID[abilityId];
  if (!a) return {};
  const out = {};
  for (const p of a.params) {
    if (p.type === ABILITY_PARAM_TYPES.INT) out[p.key] = p.default ?? 0;
    else if (p.type === ABILITY_PARAM_TYPES.FLOAT) out[p.key] = p.default ?? 0;
    else out[p.key] = p.default ?? "";
  }
  return out;
}

/** Returns the catalog entries that may be attached to entities of the given scope. */
export function abilitiesForScope(scope) {
  return ABILITIES.filter((a) => a.scope.includes(scope));
}

/** True if the given ability id is allowed on the given scope. */
export function abilityAllowedInScope(abilityId, scope) {
  const a = ABILITY_BY_ID[abilityId];
  return !!a && a.scope.includes(scope);
}
