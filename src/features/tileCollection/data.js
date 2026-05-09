import { UPGRADE_THRESHOLDS, BALANCE_OVERRIDES } from "../../constants.js";
import { applyTileOverrides } from "../../config/applyOverrides.js";

export const CATEGORIES = [
  // Farm tile species. `wood` and `berry` are intentionally absent — they're
  // resources/items (logs, planks, beams; berries, jam), not board tiles.
  "grass", "grain", "bird", "vegetables",
  "fruits", "flowers", "trees", "herd_animals", "cattle", "mounts",
  // Mine tile species — stone/cobble/block, ore/ingot, coal/coke, gem/cutgem,
  // gold (singleton), dirt (singleton).
  "mine_stone", "mine_ore", "mine_coal", "mine_gem", "mine_gold", "mine_dirt",
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
  mine_ore: "mining",
  mine_coal: "mining",
  mine_gem: "mining",
  mine_gold: "mining",
  mine_dirt: "mining",
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
    id: "grass_hay", category: "grass", displayName: "Hay", baseResource: "grass_hay", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "The common meadow grass of the vale, harvested as fodder for livestock and thatch for roofs.",
  },
  {
    id: "grass_meadow", category: "grass", displayName: "Meadow Grass",
    baseResource: "grass_meadow", tier: 1,
    discovery: { method: "chain", chainLengthOf: "grass_hay", chainLength: 20 },
    effects: { poolWeightDelta: { grass_hay: 1 } },
    description: "A lush grass variety that grows in dense clumps, boosting hay tile spawn frequency on the board.",
  },
  {
    id: "grass_spiky", category: "grass", displayName: "Spiky Grass",
    baseResource: "grass_spiky", tier: 2,
    discovery: { method: "research", researchOf: "grass_hay", researchAmount: 50 },
    effects: { poolWeightDelta: { grass_hay: 2 } },
    description: "A hardy, drought-tolerant grass that spreads quickly, adding two extra hay tiles to every board fill.",
  },

  // Grain — no "default" tile type; grain category starts null
  {
    id: "grain_wheat", category: "grain", displayName: "Wheat", baseResource: "grain_wheat", tier: 0,
    discovery: { method: "chain", chainLengthOf: "grass_hay", chainLength: UPGRADE_THRESHOLDS.grass_hay },
    effects: {},
    description: "Golden stalks of grain unlocked when hay chains grow long enough to harvest properly.",
  },

  // (grain and grain_flour are resources/items produced by chains, not tile
  // species — see BIOMES.farm.resources.)

  // (wood and berry are resources/items, not tile species — see BIOMES.farm.resources.)

  // Bird (egg is a resource/product, not a board tile — see BIOMES.farm.resources)
  {
    id: "bird_turkey", category: "bird", displayName: "Turkey", baseResource: "bird_turkey", tier: 1,
    discovery: { method: "research", researchOf: "bird_egg", researchAmount: 20 },
    effects: { freeMoves: 2 },
    description: "Broad-winged turkeys that startle and shuffle the board — each active turkey grants 2 free moves per season.",
  },
  {
    id: "bird_clover", category: "flowers", displayName: "Clover", baseResource: "bird_clover", tier: 1,
    discovery: { method: "buy", coinCost: 200 },
    effects: { freeMoves: 2 },
    description: "A flowering clover patch that draws bees by the dozen — chains feed the honey pot and grant 2 extra free moves per season.",
  },
  {
    id: "bird_melon", category: "fruits", displayName: "Melon", baseResource: "bird_melon", tier: 3,
    discovery: { method: "buy", coinCost: 500 },
    effects: { freeMoves: 5 },
    description: "Plump summer melons that attract whole flocks of birds, granting 5 free moves per season.",
  },

  // Vegetables — chain to soup (threshold 6). Carrot is the canonical default.
  {
    id: "veg_carrot", category: "vegetables", displayName: "Carrot",
    baseResource: "veg_carrot", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Easy to collect. Good for your eyes.",
  },
  {
    id: "veg_eggplant", category: "vegetables", displayName: "Eggplant",
    baseResource: "veg_eggplant", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "A long chain gives vegetables. Tastes great with scrambled eggs.",
  },
  {
    id: "veg_turnip", category: "vegetables", displayName: "Turnip",
    baseResource: "veg_turnip", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Great to produce soup, slow to get bonus fruits. You cannot squeeze blood from it.",
  },
  {
    id: "veg_beet", category: "vegetables", displayName: "Beet",
    baseResource: "veg_beet", tier: 1,
    discovery: { method: "chain", chainLengthOf: "veg_turnip", chainLength: UPGRADE_THRESHOLDS.veg_turnip },
    effects: {},
    description: "Deadly to pests. Are you ready for borscht?",
  },
  {
    id: "veg_cucumber", category: "vegetables", displayName: "Cucumber",
    baseResource: "veg_cucumber", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Avoided by rats. It is cool.",
  },
  {
    id: "veg_squash", category: "vegetables", displayName: "Squash",
    baseResource: "veg_squash", tier: 1,
    discovery: { method: "chain", chainLengthOf: "veg_cucumber", chainLength: UPGRADE_THRESHOLDS.veg_cucumber },
    effects: {},
    description: "Can be collected with grain. Loves playing racquet.",
  },
  {
    id: "veg_mushroom", category: "vegetables", displayName: "Mushroom",
    baseResource: "veg_mushroom", tier: 2,
    discovery: { method: "research", researchOf: "veg_carrot", researchAmount: 50 },
    effects: {},
    description: "Resistant to swamp. Can be collected with rambutans. Everybody likes him. He's a fungi.",
  },
  {
    id: "veg_pepper", category: "vegetables", displayName: "Pepper",
    baseResource: "veg_pepper", tier: 2,
    discovery: { method: "research", researchOf: "veg_eggplant", researchAmount: 80 },
    effects: {},
    description: "A peppery silhouette unlocked only by completing a special collection challenge.",
  },
  {
    id: "veg_broccoli", category: "vegetables", displayName: "Broccoli",
    baseResource: "veg_broccoli", tier: 3,
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
    id: "grass_heather", category: "grass", displayName: "Heather",
    baseResource: "grass_heather", tier: 1,
    discovery: { method: "chain", chainLengthOf: "grass_meadow", chainLength: 6 },
    effects: {},
    description: "Eaten by rats. Grows on wuthering heights.",
  },

  // Grain
  {
    id: "grain_corn", category: "grain", displayName: "Corn",
    baseResource: "grain_corn", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "Tall corn stalks. Can be collected with grass. Popcorn is yummy.",
  },
  {
    id: "grain_buckwheat", category: "grain", displayName: "Buckwheat",
    baseResource: "grain_buckwheat", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "A long chain gives herd animals. Some do like it. Really.",
  },
  {
    id: "grain_manna", category: "grain", displayName: "Manna",
    baseResource: "grain_manna", tier: 2,
    discovery: { method: "research", researchOf: "grain_wheat", researchAmount: 200 },
    effects: {},
    description: "Three stars when collected. Attracts rats. Extremely nutritious.",
  },
  {
    id: "grain_rice", category: "grain", displayName: "Rice",
    baseResource: "grain_rice", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "Resistant to swamp. Responsible for the rice of an empire.",
  },

  // Fruits (new category)
  {
    id: "fruit_apple", category: "fruits", displayName: "Apple",
    baseResource: "fruit_apple", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Great to produce pies. One a day keeps the doctor away.",
  },
  {
    id: "fruit_pear", category: "fruits", displayName: "Pear",
    baseResource: "fruit_pear", tier: 1,
    discovery: { method: "chain", chainLengthOf: "fruit_apple", chainLength: 6 },
    effects: {},
    description: "Avoided by rats. It is pear-shaped.",
  },
  {
    id: "fruit_golden_apple", category: "fruits", displayName: "Golden Apple",
    baseResource: "fruit_golden_apple", tier: 2,
    discovery: { method: "default" },
    effects: {},
    description: "Twelve stars when collected. Five coins per harvest. For the most beautiful.",
  },
  {
    id: "fruit_blackberry", category: "fruits", displayName: "Blackberry",
    baseResource: "fruit_blackberry", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Six stars when collected. Easy to collect. It's ironic that it replaces the apple.",
  },
  {
    id: "fruit_rambutan", category: "fruits", displayName: "Rambutan",
    baseResource: "fruit_rambutan", tier: 1,
    discovery: { method: "chain", chainLengthOf: "fruit_blackberry", chainLength: 6 },
    effects: {},
    description: "Resistant to swamp. Can be collected with mushrooms. Badly needs a haircut.",
  },
  {
    id: "fruit_starfruit", category: "fruits", displayName: "Starfruit",
    baseResource: "fruit_starfruit", tier: 2,
    discovery: { method: "research", researchOf: "fruit_rambutan", researchAmount: 100 },
    effects: {},
    description: "Locked behind Rambutan research. Stars on the inside.",
  },
  {
    id: "fruit_coconut", category: "fruits", displayName: "Coconut",
    baseResource: "fruit_coconut", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Avoided by rats. Can be collected with palms. Often mistaken for a horse.",
  },
  {
    id: "fruit_lemon", category: "fruits", displayName: "Lemon",
    baseResource: "fruit_lemon", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Great to get bonus flowers, slow to produce pie. Easily obtained from life.",
  },
  {
    id: "fruit_jackfruit", category: "fruits", displayName: "Jackfruit",
    baseResource: "fruit_jackfruit", tier: 1,
    discovery: { method: "chain", chainLengthOf: "fruit_lemon", chainLength: 6 },
    effects: {},
    description: "Gives two times more pie. A long chain attracts rats. Doesn't know jack.",
  },

  // Flowers (new category)
  {
    id: "flower_pansy", category: "flowers", displayName: "Pansy",
    baseResource: "flower_pansy", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Great to produce honey. Actually a very manly flower.",
  },
  {
    id: "flower_water_lily", category: "flowers", displayName: "Water Lily",
    baseResource: "flower_water_lily", tier: 1,
    discovery: { method: "research", researchOf: "flower_pansy", researchAmount: 15 },
    effects: {},
    description: "Twenty-four stars when collected. Resistant to swamp. Leaves a lasting impression.",
  },

  // Trees (new category — distinct from existing `wood` chain)
  {
    id: "tree_oak", category: "trees", displayName: "Oak",
    baseResource: "tree_oak", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Great to produce wood, slow to bonus birds. Grows from little acorns.",
  },
  {
    id: "tree_birch", category: "trees", displayName: "Birch",
    baseResource: "tree_birch", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Great for bonus birds, slow to produce wood. Tall and flexible.",
  },
  {
    id: "tree_willow", category: "trees", displayName: "Willow",
    baseResource: "tree_willow", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Two stars when collected. A long chain gives vegetables. Listen to the wind in its boughs.",
  },
  {
    id: "tree_fir", category: "trees", displayName: "Fir",
    baseResource: "tree_fir", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Can be collected with sheep. Perfect for the winter holidays.",
  },
  {
    id: "tree_cypress", category: "trees", displayName: "Cypress",
    baseResource: "tree_cypress", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Deadly to pests. Eaten by wolves. Can be a bit prickly.",
  },
  {
    id: "tree_palm", category: "trees", displayName: "Palm Tree",
    baseResource: "tree_palm", tier: 0,
    discovery: { method: "default" },
    effects: { freeMoves: 2 },
    description: "Can be collected with coconuts. Two free moves. A tree in the palm of your hand.",
  },

  // Birds (extends the existing `bird` category)
  {
    id: "bird_pheasant", category: "bird", displayName: "Pheasant",
    baseResource: "bird_pheasant", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "Can be collected with grass. Pleasant.",
  },
  {
    id: "bird_chicken", category: "bird", displayName: "Chicken",
    baseResource: "bird_chicken", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "Great to produce eggs, slow for bonus herd animals. Not very courageous.",
  },
  {
    id: "bird_hen", category: "bird", displayName: "Hen",
    baseResource: "bird_hen", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "Great for bonus herd animals, slow to produce eggs. Not always wet.",
  },
  {
    id: "bird_rooster", category: "bird", displayName: "Rooster",
    baseResource: "bird_rooster", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "Four stars when collected. Avoided by wolves. Can spell cock-a-doodle-doo.",
  },
  {
    id: "bird_wild_goose", category: "bird", displayName: "Wild Goose",
    baseResource: "bird_wild_goose", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "Attracts wolves. Prone to wanderlust.",
  },
  {
    id: "bird_goose", category: "bird", displayName: "Goose",
    baseResource: "bird_goose", tier: 2,
    discovery: { method: "research", researchOf: "bird_chicken", researchAmount: 200 },
    effects: {},
    description: "A long chain gives vegetables. Its quill is said to be quite dangerous.",
  },
  {
    id: "bird_parrot", category: "bird", displayName: "Parrot",
    baseResource: "bird_parrot", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "Three stars when collected. Can be collected with trees. Polly wants a cracker.",
  },
  {
    id: "bird_phoenix", category: "bird", displayName: "Phoenix",
    baseResource: "bird_phoenix", tier: 2,
    discovery: { method: "default" },
    effects: {},
    description: "Two stars when collected. Attracts wolves. Deadly to pests. Can light your fire.",
  },
  {
    id: "bird_dodo", category: "bird", displayName: "Dodo",
    baseResource: "bird_dodo", tier: 3,
    discovery: { method: "buy", coinCost: 250 },
    effects: {},
    description: "All are auto-collected when you make any chain. A proactive bird, always says \"do, do!\". Buy-only.",
  },
  {
    id: "bird_pig_in_disguise", category: "bird", displayName: "Pig in Disguise",
    baseResource: "bird_pig_in_disguise", tier: 3,
    discovery: { method: "buy", coinCost: 100000 },
    effects: {},
    description: "Two stars when collected. Copies the last long-chain bonus. \"Day 236: They still think I'm a bird.\" Buy-only.",
  },

  // Herd Animals (new category)
  {
    id: "herd_pig", category: "herd_animals", displayName: "Pig",
    baseResource: "herd_pig", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "More experience for long chains. Surprisingly tidy.",
  },
  {
    id: "herd_hog", category: "herd_animals", displayName: "Hog",
    baseResource: "herd_hog", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Great to produce meat, slow to bonus cattle. Not into healthy food.",
  },
  {
    id: "herd_boar", category: "herd_animals", displayName: "Boar",
    baseResource: "herd_boar", tier: 1,
    discovery: { method: "chain", chainLengthOf: "herd_hog", chainLength: 6 },
    effects: {},
    description: "Can be collected with vegetables. Works hard not to appear a bore.",
  },
  {
    id: "herd_warthog", category: "herd_animals", displayName: "Warthog",
    baseResource: "herd_warthog", tier: 2,
    discovery: { method: "buy", coinCost: 250 },
    effects: {},
    description: "Avoided by wolves. A long chain gives mounts. A savage pig from a savage age. Buy-only.",
  },
  {
    id: "herd_sheep", category: "herd_animals", displayName: "Sheep",
    baseResource: "herd_sheep", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Avoided by wolves. Very silent.",
  },
  {
    id: "herd_alpaca", category: "herd_animals", displayName: "Alpaca",
    baseResource: "herd_alpaca", tier: 1,
    discovery: { method: "chain", chainLengthOf: "herd_sheep", chainLength: 6 },
    effects: {},
    description: "Avoided by wolves. It's never cold.",
  },
  {
    id: "herd_goat", category: "herd_animals", displayName: "Goat",
    baseResource: "herd_goat", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Can be collected with rats. Stubborn, eats everything.",
  },
  {
    id: "herd_ram", category: "herd_animals", displayName: "Ram",
    baseResource: "herd_ram", tier: 1,
    discovery: { method: "chain", chainLengthOf: "herd_goat", chainLength: 6 },
    effects: {},
    description: "Can be collected with carrots. Sports a fashionable beard.",
  },

  // Cattle (new category)
  {
    id: "cattle_cow", category: "cattle", displayName: "Cow",
    baseResource: "cattle_cow", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Easy to collect. Sorry for the lactose intolerance.",
  },
  {
    id: "cattle_longhorn", category: "cattle", displayName: "Longhorn",
    baseResource: "cattle_longhorn", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "Twenty-four stars when collected. Hardcore vegan.",
  },
  {
    id: "cattle_triceratops", category: "cattle", displayName: "Triceratops",
    baseResource: "cattle_triceratops", tier: 3,
    discovery: { method: "daily", day: 30 },
    effects: {},
    description: "Avoided by wolves. Gives two times more milk. Granted by the Day-30 daily login reward.",
  },

  // Mounts (new category)
  {
    id: "mount_horse", category: "mounts", displayName: "Horse",
    baseResource: "mount_horse", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Easy to collect. Look at it. It's amazing.",
  },
  {
    id: "mount_donkey", category: "mounts", displayName: "Donkey",
    baseResource: "mount_donkey", tier: 1,
    discovery: { method: "chain", chainLengthOf: "mount_horse", chainLength: 6 },
    effects: {},
    description: "Can be collected with vegetables. After his PhD, a real smart ass.",
  },
  {
    id: "mount_moose", category: "mounts", displayName: "Moose",
    baseResource: "mount_moose", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "Twenty-nine stars when collected. Resistant to swamp. Loves chocolate mousse.",
  },
  {
    id: "mount_mammoth", category: "mounts", displayName: "Mammoth",
    baseResource: "mount_mammoth", tier: 3,
    discovery: { method: "buy", coinCost: 300 },
    effects: {},
    description: "Fifty-eight stars when collected. Single-tile collect. A mean mammoth is just a woolly bully. Buy-only.",
  },
  // ── Fish biome (chain reducer category) ────────────────────────────────
  {
    id: "fish_sardine", category: "fish", displayName: "Sardine",
    baseResource: "fish_sardine", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "A common shoaling fish, easy to net at high tide.",
  },
  {
    id: "fish_mackerel", category: "fish", displayName: "Mackerel",
    baseResource: "fish_mackerel", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "A fast pelagic fish that runs in summer.",
  },
  {
    id: "fish_clam", category: "fish", displayName: "Clam",
    baseResource: "fish_clam", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "A tide-pool shellfish gathered at low tide.",
  },
  {
    id: "fish_oyster", category: "fish", displayName: "Oyster",
    baseResource: "fish_oyster", tier: 1,
    discovery: { method: "default" },
    effects: {},
    description: "A rare shellfish that occasionally hides a pearl.",
  },
  {
    id: "fish_kelp", category: "fish", displayName: "Kelp",
    baseResource: "fish_kelp", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "A leafy seaweed — the chain feeds into fish oil.",
  },
  // ── Mine biome ─────────────────────────────────────────────────────────
  {
    id: "mine_stone", category: "mine_stone", displayName: "Stone",
    baseResource: "mine_stone", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Common rock chipped from the cavern walls — the staple of every mining run.",
  },
  {
    id: "mine_cobble", category: "mine_stone", displayName: "Cobble",
    baseResource: "mine_cobble", tier: 1,
    discovery: { method: "chain", chainLengthOf: "mine_stone", chainLength: UPGRADE_THRESHOLDS.mine_stone },
    effects: {},
    description: "Trimmed stone, ready for paving and foundations.",
  },
  {
    id: "mine_block", category: "mine_stone", displayName: "Block",
    baseResource: "mine_block", tier: 2,
    discovery: { method: "chain", chainLengthOf: "mine_cobble", chainLength: UPGRADE_THRESHOLDS.mine_cobble },
    effects: {},
    description: "Squared masonry blocks — the structural backbone of stout buildings.",
  },
  {
    id: "mine_ore", category: "mine_ore", displayName: "Ore",
    baseResource: "mine_ore", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Raw metallic ore prised from a vein — smelt in the forge for ingots.",
  },
  {
    id: "mine_ingot", category: "mine_ore", displayName: "Ingot",
    baseResource: "mine_ingot", tier: 1,
    discovery: { method: "chain", chainLengthOf: "mine_ore", chainLength: UPGRADE_THRESHOLDS.mine_ore },
    effects: {},
    description: "A bar of refined metal, the foundation of forged tools and horseshoes.",
  },
  {
    id: "mine_coal", category: "mine_coal", displayName: "Coal",
    baseResource: "mine_coal", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Sooty fuel for the forge — long coal chains promote it to coke.",
  },
  {
    id: "mine_coke", category: "mine_coal", displayName: "Coke",
    baseResource: "mine_coke", tier: 1,
    discovery: { method: "chain", chainLengthOf: "mine_coal", chainLength: UPGRADE_THRESHOLDS.mine_coal },
    effects: {},
    description: "Hot-burning coke, the forge master's preferred fuel.",
  },
  {
    id: "mine_gem", category: "mine_gem", displayName: "Gem",
    baseResource: "mine_gem", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "A rough gemstone glittering in the rock — chain enough to cut a polished stone.",
  },
  {
    id: "mine_cutgem", category: "mine_gem", displayName: "Cut Gem",
    baseResource: "mine_cutgem", tier: 1,
    discovery: { method: "chain", chainLengthOf: "mine_gem", chainLength: UPGRADE_THRESHOLDS.mine_gem },
    effects: {},
    description: "A faceted gemstone, sold for a small fortune at the market.",
  },
  {
    id: "mine_gold", category: "mine_gold", displayName: "Gold",
    baseResource: "mine_gold", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "A nugget of pure gold pulled from the deeper seams.",
  },
  {
    id: "mine_dirt", category: "mine_dirt", displayName: "Dirt",
    baseResource: "mine_dirt", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Crumbly dirt that backfills tunnels — needed to clear mysterious ore.",
  },
];

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
