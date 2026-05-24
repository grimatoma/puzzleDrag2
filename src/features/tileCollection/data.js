import { UPGRADE_THRESHOLDS, BALANCE_OVERRIDES } from "../../constants.js";
import { applyTileOverrides } from "../../config/applyOverrides.js";
import { expandAbilitiesToEffects } from "../../config/abilitiesAggregate.js";

export const CATEGORIES = [
  // Farm tile species. `wood` and `berry` are intentionally absent — they're
  // resources/items (logs, planks, beams; berries, jam), not board tiles.
  "grass", "grain", "bird", "vegetables",
  "fruits", "flowers", "trees", "herd_animals", "cattle", "mounts",
  // Mine tile species — stone/cobble/block, ore/ingot, coal/coke, gem/cutgem,
  // gold (singleton), dirt (singleton).
  "mine_stone", "mine_iron_ore", "mine_coal", "mine_gem", "mine_gold", "special_dirt",
  // Fish biome category — sardine / mackerel / clam / oyster / kelp.
  "fish",
];

// Tiles-wiki sub-category groups. Each tile-collection category lives in
// exactly one sub-category. The "hazards" sub-category is rendered specially
// (it lists Farm + Mine hazards rather than tile-type categories), and the
// "uncategorized" bucket catches any future category that hasn't been mapped
// yet so nothing silently disappears from the wiki.
export const SUB_CATEGORIES = ["farm", "mining", "water", "hazards", "uncategorized"];

export const SUB_CATEGORY_LABELS = {
  farm: "Farm",
  mining: "Mining",
  water: "Water",
  hazards: "Hazards",
  uncategorized: "Uncategorized",
};

export const SUB_CATEGORY_ICONS = {
  farm: "🌾",
  mining: "⛏",
  water: "🌊",
  hazards: "⚠️",
  uncategorized: "❓",
};

export const CATEGORY_TO_SUBCATEGORY = {
  grass: "farm",
  grain: "farm",
  bird: "farm",
  vegetables: "farm",
  fruits: "farm",
  flowers: "farm",
  trees: "farm",
  herd_animals: "farm",
  cattle: "farm",
  mounts: "farm",
  mine_stone: "mining",
  mine_iron_ore: "mining",
  mine_coal: "mining",
  mine_gem: "mining",
  mine_gold: "mining",
  special_dirt: "mining",
  fish: "water",
};

/** Categories belonging to a sub-category. Unmapped categories fall under
 *  "uncategorized" so the wiki always surfaces them. */
export function categoriesForSubCategory(sub) {
  if (sub === "hazards") return [];
  if (sub === "uncategorized") {
    return CATEGORIES.filter((c) => !CATEGORY_TO_SUBCATEGORY[c]);
  }
  return CATEGORIES.filter((c) => CATEGORY_TO_SUBCATEGORY[c] === sub);
}

export const TILE_TYPES = [
  // Grass
  {
    id: "tile_grass_hay", category: "grass", displayName: "Hay", baseResource: "tile_grass_hay", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "The common meadow grass of the vale, harvested as fodder for livestock and thatch for roofs.",
  },
  {
    id: "tile_grass_meadow", category: "grass", displayName: "Meadow Grass",
    baseResource: "tile_grass_meadow", tier: 1,
    discovery: { method: "chain", chainLengthOf: "tile_grass_hay", chainLength: 20 },
    abilities: [
      { id: "pool_weight", params: { target: "tile_grass_hay", amount: 1 } },
    ],
    effects: {},
    description: "A lush grass variety that grows in dense clumps, boosting hay tile spawn frequency on the board.",
  },
  {
    id: "tile_grass_spiky", category: "grass", displayName: "Spiky Grass",
    baseResource: "tile_grass_spiky", tier: 2,
    discovery: { method: "research", researchOf: "tile_grass_hay", researchAmount: 50 },
    abilities: [
      { id: "pool_weight", params: { target: "tile_grass_hay", amount: 2 } },
    ],
    effects: {},
    description: "A hardy, drought-tolerant grass that spreads quickly, adding two extra hay tiles to every board fill.",
  },

  // Grain — no "default" tile type; grain category starts null
  {
    id: "tile_grain_wheat", category: "grain", displayName: "Wheat", baseResource: "tile_grain_wheat", tier: 0,
    discovery: { method: "chain", chainLengthOf: "tile_grass_hay", chainLength: UPGRADE_THRESHOLDS.tile_grass_hay },
    effects: {},
    description: "Golden stalks of grain unlocked when hay chains grow long enough to harvest properly.",
  },

  // (grain and flour are late resources/recipe ingredients, not tile
  // species — see BIOMES.farm.resources.)

  // (wood and berry are resources/items, not tile species — see BIOMES.farm.resources.)

  // Bird (egg is a resource/product, not a board tile — see BIOMES.farm.resources)
  {
    id: "tile_bird_turkey", category: "bird", displayName: "Turkey", baseResource: "tile_bird_turkey", tier: 1,
    discovery: { method: "research", researchOf: "eggs", researchAmount: 20 },
    abilities: [
      { id: "free_moves", params: { count: 2 } },
    ],
    effects: {},
    description: "Broad-winged turkeys that startle and shuffle the board — each active turkey grants 2 free moves per season.",
  },
  {
    id: "tile_bird_clover", category: "flowers", displayName: "Clover", baseResource: "tile_bird_clover", tier: 1,
    discovery: { method: "buy", coinCost: 200 },
    abilities: [
      { id: "free_moves", params: { count: 2 } },
    ],
    effects: {},
    description: "A flowering clover patch that draws bees by the dozen — chains feed the honey pot and grant 2 extra free moves per season.",
  },
  {
    id: "tile_bird_melon", category: "fruits", displayName: "Melon", baseResource: "tile_bird_melon", tier: 3,
    discovery: { method: "buy", coinCost: 500 },
    abilities: [
      { id: "free_moves", params: { count: 5 } },
    ],
    effects: {},
    description: "Plump summer melons that attract whole flocks of birds, granting 5 free moves per season.",
  },

  // Vegetables — chain to soup (threshold 6). Carrot is the canonical default.
  {
    id: "tile_veg_carrot", category: "vegetables", displayName: "Carrot",
    baseResource: "tile_veg_carrot", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Easy to collect. Good for your eyes.",
  },
  {
    id: "tile_veg_eggplant", category: "vegetables", displayName: "Eggplant",
    baseResource: "tile_veg_eggplant", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "A long chain gives vegetables. Tastes great with scrambled eggs.",
  },
  {
    id: "tile_veg_turnip", category: "vegetables", displayName: "Turnip",
    baseResource: "tile_veg_turnip", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Great to produce soup, slow to get bonus fruits. You cannot squeeze blood from it.",
  },
  {
    id: "tile_veg_beet", category: "vegetables", displayName: "Beet",
    baseResource: "tile_veg_beet", tier: 1,
    discovery: { method: "chain", chainLengthOf: "tile_veg_turnip", chainLength: UPGRADE_THRESHOLDS.tile_veg_turnip },
    effects: {},
    description: "Deadly to pests. Are you ready for borscht?",
  },
  {
    id: "tile_veg_cucumber", category: "vegetables", displayName: "Cucumber",
    baseResource: "tile_veg_cucumber", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Avoided by rats. It is cool.",
  },
  {
    id: "tile_veg_squash", category: "vegetables", displayName: "Squash",
    baseResource: "tile_veg_squash", tier: 1,
    discovery: { method: "chain", chainLengthOf: "tile_veg_cucumber", chainLength: UPGRADE_THRESHOLDS.tile_veg_cucumber },
    effects: {},
    description: "Can be collected with grain. Loves playing racquet.",
  },
  {
    id: "tile_veg_mushroom", category: "vegetables", displayName: "Mushroom",
    baseResource: "tile_veg_mushroom", tier: 2,
    discovery: { method: "research", researchOf: "tile_veg_carrot", researchAmount: 50 },
    effects: {},
    description: "Resistant to swamp. Can be collected with rambutans. Everybody likes him. He's a fungi.",
  },
  {
    id: "tile_veg_pepper", category: "vegetables", displayName: "Pepper",
    baseResource: "tile_veg_pepper", tier: 2,
    discovery: { method: "research", researchOf: "tile_veg_eggplant", researchAmount: 80 },
    effects: {},
    description: "A peppery silhouette unlocked only by completing a special collection challenge.",
  },
  {
    id: "tile_veg_broccoli", category: "vegetables", displayName: "Broccoli",
    baseResource: "tile_veg_broccoli", tier: 3,
    discovery: { method: "buy", coinCost: 250 },
    effects: {},
    description: "A long chain gives flowers. Not the best choice for a bouquet. This tile type can only be bought.",
  },

  // ─── Placeholder catalog-import tiers ────────────────────────────────────
  // Imported from REFERENCE_CATALOG §7. Discovery methods follow the catalog;
  // chain/research thresholds use a placeholder of 6 / 100 / 200 except where
  // catalog calls out a specific number. Effects are empty for now — board
  // spawn pool, market prices, worker bonuses, and chain → product wiring all
  // come in follow-up PRs (the assets and data shape are the foundation).

  // Grass
  {
    id: "tile_grass_heather", category: "grass", displayName: "Heather",
    baseResource: "tile_grass_heather", tier: 1,
    discovery: { method: "chain", chainLengthOf: "tile_grass_meadow", chainLength: 6 },
    effects: {},
    description: "Eaten by rats. Grows on wuthering heights.",
  },

  // Grain
  {
    id: "tile_grain_corn", category: "grain", displayName: "Corn",
    baseResource: "tile_grain_corn", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "Tall corn stalks. Can be collected with grass. Popcorn is yummy.",
  },
  {
    id: "tile_grain_buckwheat", category: "grain", displayName: "Buckwheat",
    baseResource: "tile_grain_buckwheat", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "A long chain gives herd animals. Some do like it. Really.",
  },
  {
    id: "tile_grain_manna", category: "grain", displayName: "Manna",
    baseResource: "tile_grain_manna", tier: 2,
    discovery: { method: "research", researchOf: "tile_grain_wheat", researchAmount: 200 },
    effects: {},
    description: "Three stars when collected. Attracts rats. Extremely nutritious.",
  },
  {
    id: "tile_grain_rice", category: "grain", displayName: "Rice",
    baseResource: "tile_grain_rice", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "Resistant to swamp. Responsible for the rice of an empire.",
  },

  // Fruits (new category)
  {
    id: "tile_fruit_apple", category: "fruits", displayName: "Apple",
    baseResource: "tile_fruit_apple", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Great to produce pies. One a day keeps the doctor away.",
  },
  {
    id: "tile_fruit_pear", category: "fruits", displayName: "Pear",
    baseResource: "tile_fruit_pear", tier: 1,
    discovery: { method: "chain", chainLengthOf: "tile_fruit_apple", chainLength: 6 },
    effects: {},
    description: "Avoided by rats. It is pear-shaped.",
  },
  {
    id: "tile_fruit_golden_apple", category: "fruits", displayName: "Golden Apple",
    baseResource: "tile_fruit_golden_apple", tier: 2,
    discovery: { method: "default" },
    effects: {},
    description: "Twelve stars when collected. Five coins per harvest. For the most beautiful.",
  },
  {
    id: "tile_fruit_blackberry", category: "fruits", displayName: "Blackberry",
    baseResource: "tile_fruit_blackberry", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Six stars when collected. Easy to collect. It's ironic that it replaces the apple.",
  },
  {
    id: "tile_fruit_rambutan", category: "fruits", displayName: "Rambutan",
    baseResource: "tile_fruit_rambutan", tier: 1,
    discovery: { method: "chain", chainLengthOf: "tile_fruit_blackberry", chainLength: 6 },
    effects: {},
    description: "Resistant to swamp. Can be collected with mushrooms. Badly needs a haircut.",
  },
  {
    id: "tile_fruit_starfruit", category: "fruits", displayName: "Starfruit",
    baseResource: "tile_fruit_starfruit", tier: 2,
    discovery: { method: "research", researchOf: "tile_fruit_rambutan", researchAmount: 100 },
    effects: {},
    description: "Locked behind Rambutan research. Stars on the inside.",
  },
  {
    id: "tile_fruit_coconut", category: "fruits", displayName: "Coconut",
    baseResource: "tile_fruit_coconut", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Avoided by rats. Can be collected with palms. Often mistaken for a horse.",
  },
  {
    id: "tile_fruit_lemon", category: "fruits", displayName: "Lemon",
    baseResource: "tile_fruit_lemon", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Great to get bonus flowers, slow to produce pie. Easily obtained from life.",
  },
  {
    id: "tile_fruit_jackfruit", category: "fruits", displayName: "Jackfruit",
    baseResource: "tile_fruit_jackfruit", tier: 1,
    discovery: { method: "chain", chainLengthOf: "tile_fruit_lemon", chainLength: 6 },
    effects: {},
    description: "Gives two times more pie. A long chain attracts rats. Doesn't know jack.",
  },

  // Flowers (new category)
  {
    id: "tile_flower_pansy", category: "flowers", displayName: "Pansy",
    baseResource: "tile_flower_pansy", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Great to produce honey. Actually a very manly flower.",
  },
  {
    id: "tile_flower_water_lily", category: "flowers", displayName: "Water Lily",
    baseResource: "tile_flower_water_lily", tier: 1,
    discovery: { method: "research", researchOf: "tile_flower_pansy", researchAmount: 15 },
    effects: {},
    description: "Twenty-four stars when collected. Resistant to swamp. Leaves a lasting impression.",
  },

  // Trees (new category — distinct from existing `wood` chain)
  {
    id: "tile_tree_oak", category: "trees", displayName: "Oak",
    baseResource: "tile_tree_oak", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Great to produce wood, slow to bonus birds. Grows from little acorns.",
  },
  {
    id: "tile_tree_birch", category: "trees", displayName: "Birch",
    baseResource: "tile_tree_birch", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Great for bonus birds, slow to produce wood. Tall and flexible.",
  },
  {
    id: "tile_tree_willow", category: "trees", displayName: "Willow",
    baseResource: "tile_tree_willow", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Two stars when collected. A long chain gives vegetables. Listen to the wind in its boughs.",
  },
  {
    id: "tile_tree_fir", category: "trees", displayName: "Fir",
    baseResource: "tile_tree_fir", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Can be collected with sheep. Perfect for the winter holidays.",
  },
  {
    id: "tile_tree_cypress", category: "trees", displayName: "Cypress",
    baseResource: "tile_tree_cypress", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Deadly to pests. Eaten by wolves. Can be a bit prickly.",
  },
  {
    id: "tile_tree_palm", category: "trees", displayName: "Palm Tree",
    baseResource: "tile_tree_palm", tier: 0,
    discovery: { method: "default" },
    abilities: [
      { id: "free_moves", params: { count: 2 } },
    ],
    effects: {},
    description: "Can be collected with coconuts. Two free moves. A tree in the palm of your hand.",
  },

  // Birds (extends the existing `bird` category)
  {
    id: "tile_bird_pheasant", category: "bird", displayName: "Pheasant",
    baseResource: "tile_bird_pheasant", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "Can be collected with grass. Pleasant.",
  },
  {
    id: "tile_bird_chicken", category: "bird", displayName: "Chicken",
    baseResource: "tile_bird_chicken", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "Great to produce eggs, slow for bonus herd animals. Not very courageous.",
  },
  {
    id: "tile_bird_hen", category: "bird", displayName: "Hen",
    baseResource: "tile_bird_hen", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "Great for bonus herd animals, slow to produce eggs. Not always wet.",
  },
  {
    id: "tile_bird_rooster", category: "bird", displayName: "Rooster",
    baseResource: "tile_bird_rooster", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "Four stars when collected. Avoided by wolves. Can spell cock-a-doodle-doo.",
  },
  {
    id: "tile_bird_wild_goose", category: "bird", displayName: "Wild Goose",
    baseResource: "tile_bird_wild_goose", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "Attracts wolves. Prone to wanderlust.",
  },
  {
    id: "tile_bird_goose", category: "bird", displayName: "Goose",
    baseResource: "tile_bird_goose", tier: 2,
    discovery: { method: "research", researchOf: "tile_bird_chicken", researchAmount: 200 },
    effects: {},
    description: "A long chain gives vegetables. Its quill is said to be quite dangerous.",
  },
  {
    id: "tile_bird_parrot", category: "bird", displayName: "Parrot",
    baseResource: "tile_bird_parrot", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "Three stars when collected. Can be collected with trees. Polly wants a cracker.",
  },
  {
    id: "tile_bird_phoenix", category: "bird", displayName: "Phoenix",
    baseResource: "tile_bird_phoenix", tier: 2,
    discovery: { method: "default" },
    effects: {},
    description: "Two stars when collected. Attracts wolves. Deadly to pests. Can light your fire.",
  },
  {
    id: "tile_bird_dodo", category: "bird", displayName: "Dodo",
    baseResource: "tile_bird_dodo", tier: 3,
    discovery: { method: "buy", coinCost: 250 },
    effects: {},
    description: "All are auto-collected when you make any chain. A proactive bird, always says \"do, do!\". Buy-only.",
  },
  {
    id: "tile_bird_pig_in_disguise", category: "bird", displayName: "Pig in Disguise",
    baseResource: "tile_bird_pig_in_disguise", tier: 3,
    discovery: { method: "buy", coinCost: 100000 },
    effects: {},
    description: "Two stars when collected. Copies the last long-chain bonus. \"Day 236: They still think I'm a bird.\" Buy-only.",
  },

  // Herd Animals (new category)
  {
    id: "tile_herd_pig", category: "herd_animals", displayName: "Pig",
    baseResource: "tile_herd_pig", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "More experience for long chains. Surprisingly tidy.",
  },
  {
    id: "tile_herd_hog", category: "herd_animals", displayName: "Hog",
    baseResource: "tile_herd_hog", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Great to produce meat, slow to bonus cattle. Not into healthy food.",
  },
  {
    id: "tile_herd_boar", category: "herd_animals", displayName: "Boar",
    baseResource: "tile_herd_boar", tier: 1,
    discovery: { method: "chain", chainLengthOf: "tile_herd_hog", chainLength: 6 },
    effects: {},
    description: "Can be collected with vegetables. Works hard not to appear a bore.",
  },
  {
    id: "tile_herd_warthog", category: "herd_animals", displayName: "Warthog",
    baseResource: "tile_herd_warthog", tier: 2,
    discovery: { method: "buy", coinCost: 250 },
    effects: {},
    description: "Avoided by wolves. A long chain gives mounts. A savage pig from a savage age. Buy-only.",
  },
  {
    id: "tile_herd_sheep", category: "herd_animals", displayName: "Sheep",
    baseResource: "tile_herd_sheep", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Avoided by wolves. Very silent.",
  },
  {
    id: "tile_herd_alpaca", category: "herd_animals", displayName: "Alpaca",
    baseResource: "tile_herd_alpaca", tier: 1,
    discovery: { method: "chain", chainLengthOf: "tile_herd_sheep", chainLength: 6 },
    effects: {},
    description: "Avoided by wolves. It's never cold.",
  },
  {
    id: "tile_herd_goat", category: "herd_animals", displayName: "Goat",
    baseResource: "tile_herd_goat", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Can be collected with rats. Stubborn, eats everything.",
  },
  {
    id: "tile_herd_ram", category: "herd_animals", displayName: "Ram",
    baseResource: "tile_herd_ram", tier: 1,
    discovery: { method: "chain", chainLengthOf: "tile_herd_goat", chainLength: 6 },
    effects: {},
    description: "Can be collected with carrots. Sports a fashionable beard.",
  },

  // Cattle (new category)
  {
    id: "tile_cattle_cow", category: "cattle", displayName: "Cow",
    baseResource: "tile_cattle_cow", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Easy to collect. Sorry for the lactose intolerance.",
  },
  {
    id: "tile_cattle_longhorn", category: "cattle", displayName: "Longhorn",
    baseResource: "tile_cattle_longhorn", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "Twenty-four stars when collected. Hardcore vegan.",
  },
  {
    id: "tile_cattle_triceratops", category: "cattle", displayName: "Triceratops",
    baseResource: "tile_cattle_triceratops", tier: 3,
    discovery: { method: "daily", day: 30 },
    effects: {},
    description: "Avoided by wolves. Gives two times more milk. Granted by the Day-30 daily login reward.",
  },

  // Mounts (new category)
  {
    id: "tile_mount_horse", category: "mounts", displayName: "Horse",
    baseResource: "tile_mount_horse", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Easy to collect. Look at it. It's amazing.",
  },
  {
    id: "tile_mount_donkey", category: "mounts", displayName: "Donkey",
    baseResource: "tile_mount_donkey", tier: 1,
    discovery: { method: "chain", chainLengthOf: "tile_mount_horse", chainLength: 6 },
    effects: {},
    description: "Can be collected with vegetables. After his PhD, a real smart ass.",
  },
  {
    id: "tile_mount_moose", category: "mounts", displayName: "Moose",
    baseResource: "tile_mount_moose", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "Twenty-nine stars when collected. Resistant to swamp. Loves chocolate mousse.",
  },
  {
    id: "tile_mount_mammoth", category: "mounts", displayName: "Mammoth",
    baseResource: "tile_mount_mammoth", tier: 3,
    discovery: { method: "buy", coinCost: 300 },
    effects: {},
    description: "Fifty-eight stars when collected. Single-tile collect. A mean mammoth is just a woolly bully. Buy-only.",
  },
  // ── Fish biome (chain reducer category) ────────────────────────────────
  {
    id: "tile_fish_sardine", category: "fish", displayName: "Sardine",
    baseResource: "tile_fish_sardine", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "A common shoaling fish, easy to net at high tide.",
  },
  {
    id: "tile_fish_mackerel", category: "fish", displayName: "Mackerel",
    baseResource: "tile_fish_mackerel", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "A fast pelagic fish that runs in summer.",
  },
  {
    id: "tile_fish_clam", category: "fish", displayName: "Clam",
    baseResource: "tile_fish_clam", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "A tide-pool shellfish gathered at low tide.",
  },
  {
    id: "tile_fish_oyster", category: "fish", displayName: "Oyster",
    baseResource: "tile_fish_oyster", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "A rare shellfish that occasionally hides a pearl.",
  },
  {
    id: "tile_fish_kelp", category: "fish", displayName: "Kelp",
    baseResource: "tile_fish_kelp", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "A leafy seaweed — the chain feeds into fish oil.",
  },
  // ── Mine biome ─────────────────────────────────────────────────────────
  {
    id: "tile_mine_stone", category: "mine_stone", displayName: "Stone",
    baseResource: "tile_mine_stone", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Common rock chipped from the cavern walls — the staple of every mining run.",
  },
  {
    id: "block", category: "mine_stone", displayName: "Block",
    baseResource: "block", tier: 1,
    discovery: { method: "chain", chainLengthOf: "tile_mine_stone", chainLength: UPGRADE_THRESHOLDS.tile_mine_stone },
    effects: {},
    description: "Squared masonry blocks — the structural backbone of stout buildings.",
  },
  {
    id: "tile_mine_iron_ore", category: "mine_iron_ore", displayName: "Ore",
    baseResource: "tile_mine_iron_ore", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Raw metallic ore prised from a vein — smelt in the forge for ingots.",
  },
  {
    id: "iron_bar", category: "mine_iron_ore", displayName: "Ingot",
    baseResource: "iron_bar", tier: 1,
    discovery: { method: "chain", chainLengthOf: "tile_mine_iron_ore", chainLength: UPGRADE_THRESHOLDS.tile_mine_iron_ore },
    effects: {},
    description: "A bar of refined metal, the foundation of forged tools and horseshoes.",
  },
  {
    id: "tile_mine_coal", category: "mine_coal", displayName: "Coal",
    baseResource: "tile_mine_coal", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Sooty fuel for the forge — long coal chains promote it to coke.",
  },
  {
    id: "coke", category: "mine_coal", displayName: "Coke",
    baseResource: "coke", tier: 1,
    discovery: { method: "chain", chainLengthOf: "tile_mine_coal", chainLength: UPGRADE_THRESHOLDS.tile_mine_coal },
    effects: {},
    description: "Hot-burning coke, the forge master's preferred fuel.",
  },
  {
    id: "tile_mine_gem", category: "mine_gem", displayName: "Gem",
    baseResource: "tile_mine_gem", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "A rough gemstone glittering in the rock — chain enough to cut a polished stone.",
  },
  {
    id: "cut_gem", category: "mine_gem", displayName: "Cut Gem",
    baseResource: "cut_gem", tier: 1,
    discovery: { method: "chain", chainLengthOf: "tile_mine_gem", chainLength: UPGRADE_THRESHOLDS.tile_mine_gem },
    effects: {},
    description: "A faceted gemstone, sold for a small fortune at the market.",
  },
  {
    id: "tile_mine_gold", category: "mine_gold", displayName: "Gold",
    baseResource: "tile_mine_gold", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "A nugget of pure gold pulled from the deeper seams.",
  },
  {
    id: "tile_special_dirt", category: "special_dirt", displayName: "Dirt",
    baseResource: "tile_special_dirt", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Crumbly dirt that backfills tunnels — needed to clear mysterious ore.",
  },
];

// Compile each tile's `abilities` array (data-defined) into the legacy
// `effects` shape that GameScene + state.js read from. Done before the
// balance-manager override step so overrides can wholesale-replace the
// abilities and recompile.
for (const t of TILE_TYPES) {
  if (Array.isArray(t.abilities) && t.abilities.length > 0) {
    t.effects = expandAbilitiesToEffects(t.abilities, t.effects || {});
  }
}

// Balance-Manager: apply tile-power, unlock and description overrides in
// place before the lookup maps below are built, so consumers see the
// merged data.
applyTileOverrides(TILE_TYPES, BALANCE_OVERRIDES);

export const TILE_TYPES_MAP = Object.fromEntries(TILE_TYPES.map((t) => [t.id, t]));

export const TILE_TYPES_BY_CATEGORY = Object.fromEntries(
  CATEGORIES.map((c) => [c, TILE_TYPES.filter((t) => t.category === c)]),
);

/** Quick O(1) lookup: resource key → category (or null if not in catalog). */
export const CATEGORY_OF = Object.fromEntries(
  TILE_TYPES.map((t) => [t.baseResource, t.category]),
);
