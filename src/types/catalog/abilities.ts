/**
 * Hand-maintained catalog enum — edit when adding ids, then update the matching config map.
 */

/** Passive ability ids (Dev Panel: Attributes). */
export enum AbilityId {
  BonusYield = "bonus_yield",
  ChainRedirectCategory = "chain_redirect_category",
  CoinBonusFlat = "coin_bonus_flat",
  CoinBonusPerTile = "coin_bonus_per_tile",
  FreeMoves = "free_moves",
  FreeTurnIfChain = "free_turn_if_chain",
  GrantTool = "grant_tool",
  HazardCoinMultiplier = "hazard_coin_multiplier",
  HazardSpawnReduce = "hazard_spawn_reduce",
  InventoryCapBonus = "inventory_cap_bonus",
  PoolWeight = "pool_weight",
  PoolWeightLegacy = "pool_weight_legacy",
  PreserveBoard = "preserve_board",
  RecipeInputReduce = "recipe_input_reduce",
  SeasonBonus = "season_bonus",
  ThresholdReduce = "threshold_reduce",
  ThresholdReduceCategory = "threshold_reduce_category",
  TurnBudgetBonus = "turn_budget_bonus",
  WorkerPoolStep = "worker_pool_step",
}

export const ABILITY_ID_VALUES = Object.values(AbilityId);
