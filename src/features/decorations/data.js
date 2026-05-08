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
  // Harbor-themed decorations — costs lean on fish + wood resources.
  driftwood_arch: {
    id: "driftwood_arch",
    name: "Driftwood Arch",
    cost: { coins: 180, wood_plank: 4, fish_kelp: 6 },
    influence: 55,
  },
  pearl_fountain: {
    id: "pearl_fountain",
    name: "Pearl Fountain",
    cost: { coins: 400, mine_stone: 8, fish_oyster: 4 },
    influence: 95,
  },
  fishing_dock: {
    id: "fishing_dock",
    name: "Fishing Dock",
    cost: { coins: 300, wood_plank: 10, mine_stone: 4 },
    influence: 80,
  },
  // Mine-themed decorations.
  cobble_well: {
    id: "cobble_well",
    name: "Cobble Well",
    cost: { coins: 220, mine_stone: 12, wood_plank: 2 },
    influence: 65,
  },
  smelter_brazier: {
    id: "smelter_brazier",
    name: "Smelter Brazier",
    cost: { coins: 350, mine_ingot: 2, mine_coal: 8 },
    influence: 90,
  },
};
