/**
 * Magic tools available via the Magic Portal.
 * Costs are locked per §18. Player picks one per summon (no random draw).
 */
export const MAGIC_TOOLS = [
  {
    id: "magic_wand",
    name: "Magic Wand",
    influenceCost: 80,
    effect: "Pick a tile type; collect every tile of that type on the board. No turn cost.",
  },
  {
    id: "hourglass",
    name: "Hourglass",
    influenceCost: 120,
    effect: "Restore board, inventory, and turnsUsed to pre-last-chain snapshot (one-deep undo).",
  },
  {
    id: "magic_seed",
    name: "Magic Seed",
    influenceCost: 100,
    effect: "Add 5 to session turnsRemaining (this session only).",
  },
  {
    id: "magic_fertilizer",
    name: "Magic Fertilizer",
    influenceCost: 60,
    effect: "Next 3 fillBoard() calls spawn grain in every cell.",
  },
  // Phase 3 net-new magic tools (tool-powers overhaul). All wire through the
  // typed `power` field on ITEMS — see src/constants.js for the dispatch
  // contract. Influence costs roughly mirror the runtime impact: cheap
  // single-category transforms (carrot/idol/sheep) sit near magic_fertilizer's
  // 60; the higher-value alchemy effects (philosopher's stone, golden apple)
  // sit at hourglass-tier.
  {
    id: "golden_apple",
    name: "Golden Apple",
    influenceCost: 140,
    effect: "Transforms every tree tile on the board into apple-fruit tiles.",
  },
  {
    id: "golden_carrot",
    name: "Golden Carrot",
    influenceCost: 90,
    effect: "Transforms every grass tile on the board into carrot vegetable tiles.",
  },
  {
    id: "golden_idol",
    name: "Golden Idol",
    influenceCost: 110,
    effect: "Transforms every grass tile on the board into cattle (cow) tiles.",
  },
  {
    id: "golden_sheep",
    name: "Golden Sheep",
    influenceCost: 110,
    effect: "Transforms every grass tile on the board into sheep herd tiles.",
  },
  {
    id: "philosophers_stone",
    name: "Philosopher's Stone",
    influenceCost: 200,
    effect: "Transmutes every stone tile in the mine into gold tiles.",
  },
  {
    id: "miners_hat",
    name: "Miner's Hat",
    influenceCost: 50,
    effect: "Reveals every hidden ore tile (coal/iron/gold/gem). No effect until hidden-tile spawning ships — entry exists so the Wiki surfaces it.",
  },
];
