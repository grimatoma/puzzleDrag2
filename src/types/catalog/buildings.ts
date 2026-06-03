/**
 * Hand-maintained catalog enum — edit when adding ids, then update the matching config map.
 */

/** Town building ids. */
export enum BuildingId {
  Apothecary = "apothecary",
  Apiary = "apiary",
  Bakery = "bakery",
  Barn = "barn",
  Brewery = "brewery",
  CaravanPost = "caravan_post",
  Chapel = "chapel",
  ClockTower = "clock_tower",
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
  Lighthouse = "lighthouse",
  Mill = "mill",
  MiningCamp = "mining_camp",
  Observatory = "observatory",
  Portal = "portal",
  PowderStore = "powder_store",
  PreserveBoard = "preserve_board",
  Sawmill = "sawmill",
  Silo = "silo",
  Smokehouse = "smokehouse",
  Stable = "stable",
  TurnBudgetBonus = "turn_budget_bonus",
  Watchtower = "watchtower",
  WorkerPoolStep = "worker_pool_step",
  Workshop = "workshop",
}

export const BUILDING_ID_VALUES = Object.values(BuildingId);
