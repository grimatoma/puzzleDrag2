/**
 * Hand-maintained catalog enum — edit when adding ids, then update the matching config map.
 */

/** Board tile-collection category ids. */
export enum TileCategoryId {
  Bird = "bird",
  Cattle = "cattle",
  Fish = "fish",
  Flowers = "flowers",
  Fruits = "fruits",
  Grain = "grain",
  Grass = "grass",
  HerdAnimals = "herd_animals",
  MineCoal = "mine_coal",
  MineGem = "mine_gem",
  MineGold = "mine_gold",
  MineIronOre = "mine_iron_ore",
  MineStone = "mine_stone",
  Mounts = "mounts",
  SpecialDirt = "special_dirt",
  Trees = "trees",
  Vegetables = "vegetables",
}


/** Zone drop-table category names (rules table). */
export enum ZoneCategoryId {
  Birds = "birds",
  Cattle = "cattle",
  Flowers = "flowers",
  Fruits = "fruits",
  Grain = "grain",
  Grass = "grass",
  HerdAnimals = "herd_animals",
  Mounts = "mounts",
  Trees = "trees",
  Vegetables = "vegetables",
}

export const TILE_CATEGORY_VALUES = Object.values(TileCategoryId);
export const ZONE_CATEGORY_VALUES = Object.values(ZoneCategoryId);
