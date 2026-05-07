/**
 * Decoration buildings — repeatable village ornaments that grant Influence.
 * §3 / §11 locked costs and influence values.
 */
export const DECORATIONS = {
  violet_bed: {
    id: "violet_bed",
    name: "Violet Bed",
    cost: { coins: 60, grass_hay: 4 },
    influence: 20,
  },
  stone_lantern: {
    id: "stone_lantern",
    name: "Stone Lantern",
    cost: { coins: 120, mine_stone: 6, wood_plank: 2 },
    influence: 35,
  },
  apple_sapling: {
    id: "apple_sapling",
    name: "Apple Sapling",
    cost: { coins: 200, wood_plank: 4, berry: 6 },
    influence: 60,
  },
};
