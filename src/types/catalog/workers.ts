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
  FruitPicker = "fruit_harvester",      // fruits — value avoids collision with the existing fruit_picker tool item
  BeeKeeper = "bee_keeper",             // flowers
  Herder = "herdsman",                  // herd_animals — value avoids collision with the existing herder achievement
  Dairywoman = "dairywoman",            // cattle
  Wrangler = "wrangler",                // mounts
  IronMiner = "iron_miner",             // mine_iron_ore
  CoalMiner = "coal_miner",             // mine_coal
  GemCutter = "gem_cutter",             // mine_gem
  GoldMiner = "gold_miner",             // mine_gold
  Digger = "digger",                    // special_dirt (bulk, step 2)
  Fisherman = "fisherman",              // fish
  Steward = "steward",                  // grain -> vegetables
  Greengrocer = "greengrocer",          // vegetables -> fruits
  Perfumer = "perfumer",                // fruits -> flowers
  Rancher = "rancher",                  // bird -> herd_animals
  Drover = "drover",                    // herd_animals -> cattle
  Equerry = "equerry",                  // cattle -> mounts
  Smelter = "smelter",                  // mine_iron_ore -> mine_gem
  Assayer = "assayer",                  // mine_gem -> mine_gold
}

export const WORKER_TYPE_ID_VALUES = Object.values(WorkerTypeId);
