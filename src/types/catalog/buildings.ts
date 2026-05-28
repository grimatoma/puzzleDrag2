/**
 * Hand-maintained catalog enum — edit when adding ids, then update the matching config map.
 */

/** Town building ids. */
export enum BuildingId {
  Bakery = "bakery",
  Barn = "barn",
  CaravanPost = "caravan_post",
  Fishmonger = "fishmonger",
  Forge = "forge",
  Granary = "granary",
  GrantTool = "grant_tool",
  HarborDock = "harbor_dock",
  Hearth = "hearth",
  Housing = "housing",
  Housing2 = "housing2",
  Housing3 = "housing3",
  Inn = "inn",
  InventoryCapBonus = "inventory_cap_bonus",
  Kitchen = "kitchen",
  Larder = "larder",
  Mill = "mill",
  MiningCamp = "mining_camp",
  Portal = "portal",
  PowderStore = "powder_store",
  PreserveBoard = "preserve_board",
  Silo = "silo",
  Smokehouse = "smokehouse",
  TurnBudgetBonus = "turn_budget_bonus",
  WorkerPoolStep = "worker_pool_step",
  Workshop = "workshop",
}

export const BUILDING_ID_VALUES = Object.values(BuildingId);
