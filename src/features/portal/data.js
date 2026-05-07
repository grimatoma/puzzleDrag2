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
];
