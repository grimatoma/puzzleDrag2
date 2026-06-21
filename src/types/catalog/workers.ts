/**
 * Hand-maintained catalog enum — edit when adding ids, then update the matching config map.
 */

/** Worker type-tier ids. */
export enum WorkerTypeId {
  Baker = "baker",
  Farmer = "farmer",
  Lumberjack = "lumberjack",
  Miner = "miner",
  Peasant = "peasant",                  // grass (bulk, step 2)
  Poultryman = "poultryman",            // bird
  VegetablePicker = "vegetable_picker", // vegetables
  FruitPicker = "fruit_picker",         // fruits
  BeeKeeper = "bee_keeper",             // flowers
  Herder = "herder",                    // herd_animals
  Dairywoman = "dairywoman",            // cattle
  Wrangler = "wrangler",                // mounts
  IronMiner = "iron_miner",             // mine_iron_ore
  CoalMiner = "coal_miner",             // mine_coal
  GemCutter = "gem_cutter",             // mine_gem
  GoldMiner = "gold_miner",             // mine_gold
  Digger = "digger",                    // special_dirt (bulk, step 2)
  Fisherman = "fisherman",              // fish
}

export const WORKER_TYPE_ID_VALUES = Object.values(WorkerTypeId);
