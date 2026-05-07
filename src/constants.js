export const SEASON_EFFECTS = Object.freeze({
  Spring: { harvestBonus: 0.20 },
  Summer: { orderMult: 2 },
  Autumn: { upgradeMult: 2 },
  Winter: { minChain: 5 },
});

export const STORAGE_KEYS = {
  save: "hearth.save.v1",
  settings: "hearth.settings",
  tutorialSeen: "hearth.tutorial.seen",
};

export const TILE = 74;
export const COLS = 6;
export const ROWS = 6;
export const MAX_TURNS = 10;

// Phase 12.2 — save schema version (increment when save shape changes)
export const SAVE_SCHEMA_VERSION = 12;

export const UPGRADE_THRESHOLDS = {
  hay: 6, wheat: 5, grain: 4,
  log: 5, plank: 4,
  berry: 7,
  stone: 8, cobble: 6,
  ore: 6, coal: 7, gem: 5,
};

export const SEASONS = [
  { name: "Spring", icon: "flower", bg: 0x7dbd48, fill: 0x8fd85a, accent: 0x5daa35 },
  { name: "Summer", icon: "sun", bg: 0x8fca45, fill: 0xf6c342, accent: 0xe3a92f },
  { name: "Autumn", icon: "leaf", bg: 0xb77b3a, fill: 0xd9792d, accent: 0xa65722 },
  { name: "Winter", icon: "snow", bg: 0x78aaca, fill: 0x91d9ff, accent: 0xd9f6ff },
];

export const FARM_TILE_POOL = ["hay", "hay", "hay", "log", "log", "wheat", "berry", "berry", "egg"];
export const MINE_TILE_POOL = ["stone", "stone", "stone", "ore", "ore", "coal", "dirt", "dirt", "gem"];

export const BIOMES = {
  farm: {
    name: "Farm",
    dirt: 0x6d4a2f,
    dark: 0x3e2a1a,
    dirtColor: 0x6d4a2f,
    palette: { bg: 0x7dbd48, accent: 0x5daa35, dim: 0x3e2a1a },
    tilePool: FARM_TILE_POOL,
    resources: [
      { key: "hay",   label: "Hay",   color: 0xa8c769, dark: 0x4f6b3a, value: 1, next: "wheat", glyph: "🌾", sway: { amp: 4.0, freq: 0.00060, gust: 0.20 } },
      { key: "wheat", label: "Wheat", color: 0xdab947, dark: 0x7e5e1a, value: 2, next: "grain", glyph: "𓂃", sway: { amp: 5.0, freq: 0.00065, gust: 0.22 } },
      { key: "grain", label: "Grain", color: 0xc8923a, dark: 0x5e3e10, value: 4, next: "flour", glyph: "✿", sway: { amp: 1.2, freq: 0.00035, gust: 0.08 } },
      { key: "flour", label: "Flour", color: 0xf4e3c0, dark: 0x8a6a3a, value: 6, next: null,    glyph: "◈", sway: { amp: 1.0, freq: 0.00030, gust: 0.05 } },
      { key: "log",   label: "Log",   color: 0x9b6b3e, dark: 0x5e3a1d, value: 2, next: "plank", glyph: "🪵" },
      { key: "plank", label: "Plank", color: 0xc98c50, dark: 0x5e3a1d, value: 4, next: "beam",  glyph: "▤" },
      { key: "beam",  label: "Beam",  color: 0x7e4f24, dark: 0x3a1d10, value: 7, next: null,    glyph: "▦" },
      { key: "berry", label: "Berry", color: 0xa3486a, dark: 0x5e1a3a, value: 3, next: "jam",   glyph: "◉", sway: { amp: 3.5, freq: 0.00090, gust: 0.15 } },
      { key: "jam",   label: "Jam",   color: 0xd4658c, dark: 0x7a2f50, value: 5, next: null,    glyph: "◎", sway: { amp: 0.8, freq: 0.00025, gust: 0.00 } },
      { key: "egg",   label: "Egg",   color: 0xf4ecd8, dark: 0x8a785e, value: 3, next: null,    glyph: "◯", sway: { amp: 1.5, freq: 0.00055, gust: 0.08 } },
    ],
    pool: FARM_TILE_POOL,
  },
  mine: {
    name: "Mine",
    dirt: 0x242526,
    dark: 0x151515,
    dirtColor: 0x3e3a36,
    palette: { bg: 0x2a2c30, accent: 0x6a7280, dim: 0x121316 },
    tilePool: MINE_TILE_POOL,
    resources: [
      { key: "stone",  label: "Stone",  color: 0x9da3a8, dark: 0x3e4348, value: 1,  next: "cobble", glyph: "◆" },
      { key: "cobble", label: "Cobble", color: 0xbbc1c6, dark: 0x4e5358, value: 3,  next: "block",  glyph: "◇" },
      { key: "block",  label: "Block",  color: 0x7c8388, dark: 0x2a2e32, value: 6,  next: null,     glyph: "■" },
      { key: "ore",    label: "Ore",    color: 0xb6a3a3, dark: 0x5e4040, value: 3,  next: "ingot",  glyph: "◊", sway: { amp: 0.4, freq: 0.00020, gust: 0.00 } },
      { key: "ingot",  label: "Ingot",  color: 0xe8e0d8, dark: 0x6a5a50, value: 6,  next: null,     glyph: "▭" },
      { key: "coal",   label: "Coal",   color: 0x333333, dark: 0x000000, value: 2,  next: "coke",   glyph: "●" },
      { key: "coke",   label: "Coke",   color: 0x5a5a60, dark: 0x1a1a20, value: 4,  next: null,     glyph: "⬢" },
      { key: "gem",    label: "Gem",    color: 0x65e5ff, dark: 0x1686a3, value: 7,  next: "cutgem", glyph: "◈", sway: { amp: 1.2, freq: 0.00028, gust: 0.04 } },
      { key: "cutgem", label: "CutGem", color: 0xa3f0ff, dark: 0x1686a3, value: 14, next: null,     glyph: "✦", sway: { amp: 1.2, freq: 0.00028, gust: 0.04 } },
      { key: "gold",   label: "Gold",   color: 0xffd34c, dark: 0x946b11, value: 5,  next: null,     glyph: "✺", sway: { amp: 1.0, freq: 0.00024, gust: 0.04 } },
      { key: "dirt",   label: "Dirt",   color: 0x7a6850, dark: 0x3e3a36, value: 1,  next: null,     glyph: "◫" },
    ],
    pool: MINE_TILE_POOL,
  },
};

export const NPCS = {
  mira: {
    name: "Mira",
    role: "Baker",
    color: "#d6612a",
    lines: [
      "Sundown's coming — bring me {n} {r} for the apprentices' supper.",
      "I've kneaded all morning. Could you spare {n} {r}?",
      "The honey-rolls won't make themselves. {n} {r}, please.",
    ],
  },
  tomas: {
    name: "Old Tomas",
    role: "Beekeeper",
    color: "#c8923a",
    lines: [
      "The hives need bedding — {n} {r} should do.",
      "Slow and steady. I'll trade for {n} {r} when you can.",
    ],
  },
  bram: {
    name: "Bram",
    role: "Smith",
    color: "#5a6973",
    lines: [
      "Forge's hungry. {n} {r}, and quick.",
      "Don't bother me unless you've {n} {r}.",
    ],
  },
  liss: {
    name: "Sister Liss",
    role: "Physician",
    color: "#8d3a5c",
    lines: [
      "For poultices: {n} {r}. The Hartson child is feverish.",
      "{n} {r} for winter tinctures, when convenient.",
    ],
  },
  wren: {
    name: "Wren",
    role: "Scout",
    color: "#4f6b3a",
    lines: [
      "The road south needs {n} {r}. I'll mark it on your map.",
      "Trade route opens with {n} {r} — fair price.",
    ],
  },
};

export const BUILDINGS = [
  { id: "hearth", name: "Hearth", desc: "The heart of the village. Keeps folk warm and anchors the community.", cost: { coins: 0 }, lv: 1, x: 60, y: 360, w: 90, h: 110, color: "#a8431a", built: true },
  { id: "mill", name: "Mill", desc: "Grinds grain into flour, enabling the grain → flour upgrade chain.", cost: { coins: 200, plank: 30 }, lv: 1, x: 200, y: 380, w: 80, h: 90, color: "#c8923a" },
  { id: "bakery", name: "Bakery", desc: "Craft baked goods — bread, honey rolls, harvest pies — to sell for coins.", cost: { coins: 500, plank: 40, stone: 10 }, lv: 1, x: 320, y: 360, w: 100, h: 110, color: "#8a4a26" },
  { id: "inn", name: "Inn", desc: "Lodgings for helpers. Unlocks apprentice hiring: Pip (Forager) and Tuck (Lookout).", cost: { coins: 700, plank: 50 }, lv: 2, x: 470, y: 350, w: 110, h: 130, color: "#4f6b3a" },
  { id: "granary", name: "Granary", desc: "Keeps the harvest safe. Unlocks Hilda the Farmhand apprentice.", cost: { coins: 250, plank: 20 }, lv: 1, x: 600, y: 380, w: 80, h: 100, color: "#c5a87a" },
  { id: "larder", name: "Larder", desc: "Preserve and bottle your harvest. Craft preserve jars and berry tinctures for coins.", cost: { coins: 350, plank: 30, jam: 5 }, lv: 3, x: 700, y: 395, w: 70, h: 85, color: "#4f6b3a" },
  { id: "forge", name: "Forge", desc: "Smith metal goods — hinges, lanterns, rings, and more — for high coin rewards.", cost: { coins: 1200, stone: 60, ingot: 20 }, lv: 8, x: 800, y: 380, w: 100, h: 100, color: "#5a6973" },
  { id: "caravan_post", name: "Caravan Post", desc: "Opens distant trade routes, letting you sell crafted goods to far-off markets.", cost: { coins: 1500 }, lv: 8, x: 940, y: 390, w: 110, h: 90, color: "#7e4f24" },
  { id: "kitchen", name: "Kitchen", desc: "Converts surplus grain into supplies. Three supplies grant standard Mine entry.", cost: { coins: 400, plank: 20 }, lv: 2, x: 1080, y: 360, w: 90, h: 100, color: "#8a4a26" },
  { id: "workshop", name: "Workshop", desc: "Crafts shovels and other tools from raw materials.", cost: { coins: 600, plank: 30, stone: 10 }, lv: 3, x: 1200, y: 370, w: 90, h: 100, color: "#6a5a3a" },
  { id: "powder_store", name: "Powder Store", desc: "Stockpiles black powder. Produces 2 Bombs at the end of every season.", cost: { coins: 600, stone: 30, ingot: 5 }, lv: 5, x: 1080, y: 380, w: 90, h: 100, color: "#3a2a1a" },
  { id: "portal", name: "Magic Portal", desc: "A shimmering gateway. Summons unlock with Influence (Phase 8).", cost: { coins: 2000, runes: 5 }, lv: 8, x: 1320, y: 355, w: 100, h: 115, color: "#4a2a7a" },
  { id: "housing", name: "Housing Block",
    desc: "Quarters for hired hands. Each Housing raises your worker capacity by 1.",
    cost: { coins: 300, plank: 25 }, lv: 2,
    x: 1180, y: 380, w: 90, h: 100, color: "#a07a4a" },
  // Phase 12.5 — §18 LOCKED: Silos/Barns preserve tile layout between sessions
  { id: "silo", name: "Silo",
    desc: "Wood-and-stone grain store. Preserves the tile layout between sessions on the Farm.",
    cost: { coins: 250, plank: 15 }, lv: 4, biome: "farm",
    x: 1280, y: 380, w: 90, h: 100, color: "#9a6a3a" },
  { id: "barn", name: "Barn",
    desc: "Reinforced ore shed. Preserves the tile layout between sessions in the Mine.",
    cost: { coins: 400, plank: 25, stone: 5 }, lv: 5, biome: "mine",
    x: 1380, y: 380, w: 90, h: 100, color: "#7a4a2a" },
];

// Phase 10.1 — Workshop tool recipes (no turn cost, board animation).
// §5 lists "1 Wood" for Rake; impl uses `plank` because the §6 wood chain
// names the base tile "log" and the first upgrade "plank".
export const WORKSHOP_RECIPES = {
  rake:        { name: "Rake",          station: "workshop", inputs: { plank: 1 },
                 effect: "clear_all", target: "hay",   anim: "sweep",   ms: 300 },
  axe:         { name: "Axe",          station: "workshop", inputs: { stone: 1 },
                 effect: "clear_all", target: "log",   anim: "chops",   ms: 200 },
  fertilizer:  { name: "Fertilizer",   station: "workshop", inputs: { hay: 1, dirt: 1 },
                 effect: "fill_bias", target: "grain",  anim: "shimmer", ms: 600 },
  // Phase 10.5 — Cat tool (clears all rats, no turn cost)
  cat:         { name: "Cat",          station: "workshop", inputs: { stone: 2, water: 1 },
                 effect: "clear_hazard", target: "rats", anim: "scatter", ms: 200 },
  // Phase 10.6 — Bird Cage + full Scythe
  bird_cage:   { name: "Bird Cage",    station: "workshop", inputs: { hay: 1 },
                 effect: "clear_all", target: "egg",   anim: "cage",    ms: 300 },
  scythe_full: { name: "Scythe (full)", station: "workshop", inputs: { stone: 1 },
                 effect: "clear_all", target: "grain", anim: "sweep",   ms: 300 },
  // Phase 10.8 — Wolf counters
  rifle:       { name: "Rifle",        station: "workshop", inputs: { plank: 1, stone: 1, ingot: 1 },
                 effect: "clear_hazard", target: "wolves", anim: "shot",    ms: 300 },
  hound:       { name: "Hound",        station: "workshop", inputs: { bread: 1, stone: 3 },
                 effect: "scatter_hazard", target: "wolves", anim: "bark", ms: 400 },
};

export const RECIPES = {
  shovel:     { name: "Shovel",          inputs: { plank: 1, stone: 1 },          tier: 1, station: "workshop", coins: 25 },
  water_pump: { name: "Water Pump",      inputs: { plank: 1, stone: 1 },          tier: 2, station: "workshop", coins: 0, tool: "water_pump" },
  explosives: { name: "Explosives",      inputs: { hay: 1, dirt: 1 },             tier: 2, station: "workshop", coins: 0, tool: "explosives" },
  bread:      { name: "Bread Loaf",     inputs: { flour: 3, egg: 1 },            tier: 1, station: "bakery", coins: 125, glyph: "🍞", color: 0xd49060, dark: 0x7a4a28 },
  honeyroll:  { name: "Honey Roll",     inputs: { flour: 2, egg: 1, jam: 1 },   tier: 2, station: "bakery", coins: 175, glyph: "🍯", color: 0xf0c050, dark: 0x8a6010 },
  harvestpie: { name: "Harvest Pie",    inputs: { flour: 2, jam: 1, egg: 1 },   tier: 2, station: "bakery", coins: 175, glyph: "🥧", color: 0xd4784a, dark: 0x6a3018 },
  preserve:   { name: "Preserve Jar",   inputs: { jam: 2, egg: 1 },             tier: 1, station: "larder", coins: 100, glyph: "🫙", color: 0x9a6888, dark: 0x502848 },
  tincture:   { name: "Berry Tincture", inputs: { berry: 3, jam: 1 },           tier: 1, station: "larder", coins: 125, glyph: "🌿", color: 0x6b8a3a, dark: 0x304018 },
  iron_hinge: { name: "Iron Hinge",     inputs: { ingot: 2, coke: 1 },          tier: 2, station: "forge",  output: "ingot", coins: 175, glyph: "⚙",  color: 0x7a8a96, dark: 0x2a3a46 },
  cobblepath: { name: "Cobble Path",    inputs: { stone: 5, plank: 2 },         tier: 1, station: "forge",  output: "ingot", coins: 200, glyph: "🪨", color: 0x9a9a8a, dark: 0x404038 },
  lantern:    { name: "Iron Lantern",   inputs: { ingot: 1, coke: 1, plank: 1 },tier: 2, station: "forge",  output: "ingot", coins: 150, glyph: "🏮", color: 0xd4783a, dark: 0x6a2800 },
  goldring:   { name: "Gold Ring",      inputs: { gold: 1, ingot: 2 },          tier: 2, station: "forge",  output: "ingot", coins: 225, glyph: "💍", color: 0xffd34c, dark: 0x886810 },
  gemcrown:   { name: "Gem Crown",      inputs: { cutgem: 1, gold: 2 },         tier: 2, station: "forge",  output: "ingot", coins: 325, glyph: "👑", color: 0x65e5ff, dark: 0x1060a0 },
  ironframe:  { name: "Iron Frame",     inputs: { beam: 2, ingot: 1 },          tier: 3, station: "forge",  output: "ingot", coins: 275, glyph: "🔲", color: 0x6a7a86, dark: 0x2a3040 },
  stonework:  { name: "Stonework",      inputs: { block: 2, coke: 1 },          tier: 3, station: "forge",  output: "ingot", coins: 300, glyph: "🏗", color: 0x8a8a7a, dark: 0x383828 },
  // Phase 10.3 — snake_case aliases so tests and saves can use either form
  iron_frame: null, // resolved below
  gem_crown:  null,
  gold_ring:  null,
};
// Resolve snake_case aliases to the same objects (no data duplication)
RECIPES.iron_frame = RECIPES.ironframe;
RECIPES.gem_crown  = RECIPES.gemcrown;
RECIPES.gold_ring  = RECIPES.goldring;

// Phase 10.1 — RECIPES.tools aliases WORKSHOP_RECIPES for backwards compat
RECIPES.tools = WORKSHOP_RECIPES;

// Phase 10.3 — ID normalisation aliases for old save-file keys
export const RECIPE_ID_ALIASES = {
  ironframe: "iron_frame",
  gemcrown:  "gem_crown",
  goldring:  "gold_ring",
};

export const ACHIEVEMENTS = [
  // Harvest
  { id: "harvest_1",    name: "First Harvest",      desc: "Collect your first resource",            category: "Harvest",  target: 1,    eventKey: "totalHarvested", icon: "🌾", reward: { coins: 25,  xp: 10 } },
  { id: "harvest_100",  name: "Bountiful",           desc: "Collect 100 resources total",            category: "Harvest",  target: 100,  eventKey: "totalHarvested", icon: "🌿", reward: { coins: 75,  xp: 30 } },
  { id: "harvest_1000", name: "Field Master",        desc: "Collect 1000 resources total",           category: "Harvest",  target: 1000, eventKey: "totalHarvested", icon: "🏡", reward: { coins: 200, xp: 80 } },
  { id: "harvest_5000", name: "Granary Full",        desc: "Collect 5000 resources total",           category: "Harvest",  target: 5000, eventKey: "totalHarvested", icon: "🏰", reward: { coins: 500, xp: 200 } },
  // Chains
  { id: "chain_3",      name: "Triple Match",        desc: "Form a chain of 3 or more",             category: "Chains",   target: 3,    eventKey: "longestChain",   icon: "🔗", reward: { coins: 20,  xp: 10 } },
  { id: "chain_6",      name: "Big Chain",           desc: "Form a chain of 6 or more",             category: "Chains",   target: 6,    eventKey: "longestChain",   icon: "⛓", reward: { coins: 60,  xp: 25 } },
  { id: "chain_10",     name: "Mega Chain",          desc: "Form a chain of 10 or more",            category: "Chains",   target: 10,   eventKey: "longestChain",   icon: "💫", reward: { coins: 150, xp: 60 } },
  { id: "chain_speed",  name: "Lightning",           desc: "Make 5 chains in one season",           category: "Chains",   target: 5,    eventKey: "chainsThisSeason", icon: "⚡", reward: { coins: 100, xp: 40 } },
  // Orders
  { id: "orders_5",     name: "Helpful",             desc: "Fill 5 orders",                         category: "Orders",   target: 5,    eventKey: "totalOrders",    icon: "📦", reward: { coins: 50,  xp: 20 } },
  { id: "orders_25",    name: "Trusted",             desc: "Fill 25 orders",                        category: "Orders",   target: 25,   eventKey: "totalOrders",    icon: "🤝", reward: { coins: 150, xp: 60 } },
  { id: "orders_100",   name: "Pillar of the Town",  desc: "Fill 100 orders",                       category: "Orders",   target: 100,  eventKey: "totalOrders",    icon: "🏛", reward: { coins: 400, xp: 150 } },
  // Buildings
  { id: "build_2",      name: "Two Bricks",          desc: "Construct 2 buildings",                 category: "Buildings",target: 2,    eventKey: "buildingCount",  icon: "🪵", reward: { coins: 75,  xp: 30 } },
  { id: "build_5",      name: "Hamlet",              desc: "Construct 5 buildings",                 category: "Buildings",target: 5,    eventKey: "buildingCount",  icon: "🏘", reward: { coins: 200, xp: 80 } },
  { id: "build_7",      name: "Vale",                desc: "Construct all 7 buildings",             category: "Buildings",target: 7,    eventKey: "buildingCount",  icon: "🌆", reward: { coins: 500, xp: 200 } },
  // Seasons
  { id: "seasons_4",    name: "One Cycle",           desc: "Complete 4 seasons",                    category: "Seasons",  target: 4,    eventKey: "seasonsCycled",  icon: "🌀", reward: { coins: 100, xp: 50 } },
  { id: "seasons_16",   name: "Year",                desc: "Complete 16 seasons (a full year)",     category: "Seasons",  target: 16,   eventKey: "seasonsCycled",  icon: "📅", reward: { coins: 300, xp: 120 } },
  // Resources
  { id: "gold_50",      name: "Goldsmith",           desc: "Collect 50 gold",                       category: "Resources",target: 50,   eventKey: "gold",           icon: "✺", reward: { coins: 200, xp: 80 } },
  { id: "cutgem_10",    name: "Gemcutter",           desc: "Collect 10 cut gems",                   category: "Resources",target: 10,   eventKey: "cutgem",         icon: "✦", reward: { coins: 300, xp: 100 } },
  // Crafting
  { id: "craft_1",      name: "First Craft",         desc: "Craft your first recipe",               category: "Crafting", target: 1,    eventKey: "totalCrafted",   icon: "🔨", reward: { coins: 50,  xp: 20 } },
  { id: "craft_50",     name: "Master Craftsman",    desc: "Craft 50 recipes",                      category: "Crafting", target: 50,   eventKey: "totalCrafted",   icon: "⚒",  reward: { coins: 300, xp: 120 } },
];

export const MARKET_PRICES = {
  hay:    { buy: 40,  sell: 0  },
  wheat:  { buy: 60,  sell: 2  },
  grain:  { buy: 80,  sell: 4  },
  flour:  { buy: 100, sell: 6  },
  log:    { buy: 60,  sell: 2  },
  plank:  { buy: 80,  sell: 4  },
  beam:   { buy: 110, sell: 7  },
  berry:  { buy: 70,  sell: 3  },
  jam:    { buy: 90,  sell: 5  },
  egg:    { buy: 70,  sell: 3  },
  stone:  { buy: 50,  sell: 1  },
  cobble: { buy: 70,  sell: 3  },
  block:  { buy: 100, sell: 6  },
  ore:    { buy: 70,  sell: 3  },
  ingot:  { buy: 100, sell: 6  },
  coal:   { buy: 60,  sell: 2  },
  coke:   { buy: 80,  sell: 4  },
  gem:    { buy: 120, sell: 7  },
  cutgem: { buy: 200, sell: 14 },
  gold:   { buy: 100, sell: 5  },
};

export const QUEST_TEMPLATES = [
  { key: "harvest", label: "Harvest 30 hay", target: 30, reward: { coins: 50, almanacXp: 20 } },
  { key: "chain5",  label: "Make 3 chains of 5+", target: 3, reward: { coins: 75, almanacXp: 30 } },
  { key: "deliver", label: "Deliver 4 orders", target: 4, reward: { coins: 60, almanacXp: 25 } },
  { key: "build",   label: "Build 1 building", target: 1, reward: { coins: 100, almanacXp: 40 } },
  { key: "craft",   label: "Craft 2 recipes", target: 2, reward: { coins: 80, almanacXp: 35 } },
  { key: "coins",   label: "Earn 200 coins this season", target: 200, reward: { coins: 50, almanacXp: 20 } },
];

export const ALMANAC_TIERS = [
  { reward: { coins: 50 } },
  { reward: { tool: "shuffle", amt: 1 } },
  { reward: { coins: 75 } },
  { reward: { tool: "basic", amt: 1 } },
  { reward: { coins: 100 } },
  { reward: { tool: "rare", amt: 1 } },
  { reward: { coins: 150 } },
  { reward: { tool: "shuffle", amt: 2 } },
  { reward: { coins: 200 } },
  { reward: { coins: 100, tool: "rare", amt: 1 } },
];

// ─── Phase 4 — Inventory soft caps ───────────────────────────────────────────
export const RESOURCE_CAP_BASE = 200;
export const RESOURCE_CAP_GRANARY = 500;
/** The 13 raw farm + mine resources subject to the inventory cap. */
export const CAPPED_RESOURCES = ["hay","wheat","grain","flour","log","plank",
  "beam","berry","jam","egg","stone","ore","coal"];

// ─── Phase 3 Economy ──────────────────────────────────────────────────────────

/** Mine entry pricing tiers (§7). */
export const MINE_ENTRY_TIERS = [
  { id: "free",    supplies: 3,               label: "Standard" },
  { id: "better",  coins: 100, shovels: 10,   label: "Better"   },
  { id: "premium", runes: 2,                  label: "Premium"  },
];

/** Daily login-streak reward ladder (GAME_SPEC §16 — locked). */
export const DAILY_REWARDS = {
  1:  { coins: 25 },
  2:  { coins: 50 },
  3:  { tool: "basic",   amount: 1 },
  4:  { coins: 75 },
  5:  { tool: "rare",    amount: 1 },
  6:  { coins: 50 },
  7:  { coins: 150, tool: "shuffle", amount: 1 },
  8:  { coins: 60 },  9: { coins: 70 },  10: { coins: 80 },
  11: { coins: 90 }, 12: { coins: 100 }, 13: { coins: 120 },
  14: { coins: 300, runes: 1 },
  15: { coins: 100 }, 16: { coins: 110 }, 17: { coins: 120 },
  18: { coins: 130 }, 19: { coins: 140 }, 20: { coins: 160 },
  21: { coins: 180 }, 22: { coins: 200 }, 23: { coins: 220 },
  24: { coins: 240 }, 25: { coins: 260 }, 26: { coins: 280 },
  27: { coins: 300 }, 28: { coins: 350 }, 29: { coins: 400 },
  30: { coins: 1000, runes: 3 },
};

// ─── Phase 10 — Tile pool seasonal modifiers ──────────────────────────────────
// Applied additively on BIOMES.farm.pool. Locked: ONLY spawn weights.
// The §6 SEASON_EFFECTS table above is NOT changed here.
export const SEASON_POOL_MODS = {
  Spring: { berry: +1 },
  Summer: { wheat: +1 },
  Autumn: { log:   +2 },
  Winter: { stone: +1, hay: -1 },
};

// ─── Phase 10.4 — Rat hazard constants ────────────────────────────────────────
export const RAT_SPAWN_THRESHOLDS = {
  hay:         50,
  wheat:       50,
  perFillRate: 0.10,
  maxActive:   4,
};
export const RAT_CLEAR_REWARD_PER = 5;

// ─── Phase 11.1 — Color-blind palettes ───────────────────────────────────────
// The `default` palette reads back from BIOMES + SEASONS to guarantee zero
// visual drift versus the Phase 0–10 hex baseline.
const _defaultTiles = Object.fromEntries(
  [...BIOMES.farm.resources, ...BIOMES.mine.resources].map((r) => [r.key, r.color]),
);
const _defaultSeasons = Object.fromEntries(
  SEASONS.map((s) => [s.name, { bg: s.bg, fill: s.fill, accent: s.accent }]),
);

// Accessibility palettes — all adjacency-pair contrast ratios ≥ 3:1 (WCAG AA large text).
// Pairs checked: hay/log, hay/berry, log/berry, ore/coal.
export const PALETTES = {
  default: {
    tiles: _defaultTiles,
    seasons: _defaultSeasons,
  },

  // Deuteranopia (M-cone deficiency): straw-yellow hay, warm-brown log, dark-violet berry.
  // Luminance: hay(0.685) >> log(0.182) >> berry(0.005) — every adjacent pair ≥ 3:1.
  deuteranopia: {
    tiles: {
      hay:    0xf0d860, wheat:  0xd4b040, grain:  0xb08828, flour:  0xf4ecd0,
      log:    0x9a6e30, plank:  0xc49050, beam:   0x6a4218,
      berry:  0x1a003a, jam:    0x4a1060,
      egg:    0xf0e8c8,
      stone:  0x9da3a8, cobble: 0xbbc1c6, block:  0x7c8388,
      ore:    0xe89040, ingot:  0xf8d880,
      coal:   0x1a1a1a, coke:   0x505060,
      gem:    0x50d8f8, cutgem: 0xa0f0ff, gold:   0xffd34c,
      dirt:   0x7a6850,
    },
    seasons: {
      Spring: { bg: 0x5090b0, fill: 0x60b0d0, accent: 0x3870a0 },
      Summer: { bg: 0x9aba40, fill: 0xd4b030, accent: 0xc09020 },
      Autumn: { bg: 0x8c5428, fill: 0xb07030, accent: 0x6a3818 },
      Winter: { bg: 0x607898, fill: 0x80a8cc, accent: 0xc0d8f0 },
    },
  },

  // Protanopia (L-cone deficiency): bright-yellow hay, burnt-orange log, midnight-blue berry.
  // Luminance: hay(0.762) >> log(0.150) >> berry(0.010) — every adjacent pair ≥ 3:1.
  protanopia: {
    tiles: {
      hay:    0xffe060, wheat:  0xf0c840, grain:  0xd0a020, flour:  0xf8f0e0,
      log:    0xb05018, plank:  0xd07838, beam:   0x783010,
      berry:  0x001050, jam:    0x002888,
      egg:    0xf0e8d0,
      stone:  0x9da3a8, cobble: 0xbbc1c6, block:  0x7c8388,
      ore:    0xa0c8e8, ingot:  0xd8f0ff,
      coal:   0x0a1020, coke:   0x283848,
      gem:    0x60e0f8, cutgem: 0xb0f4ff, gold:   0xffd34c,
      dirt:   0x7a6850,
    },
    seasons: {
      Spring: { bg: 0x40a080, fill: 0x50c8a0, accent: 0x207858 },
      Summer: { bg: 0xc8b020, fill: 0xe8d030, accent: 0xa08010 },
      Autumn: { bg: 0xa04820, fill: 0xc86030, accent: 0x782810 },
      Winter: { bg: 0x304870, fill: 0x5080b0, accent: 0xa0c0e8 },
    },
  },

  // Tritanopia (S-cone deficiency): cream-yellow hay, tawny log, dark-violet berry.
  // Luminance: hay(0.848) >> log(0.215) >> berry(0.005) — every adjacent pair ≥ 3:1.
  tritanopia: {
    tiles: {
      hay:    0xfff070, wheat:  0xf0d850, grain:  0xd0b030, flour:  0xfcf4e0,
      log:    0xb47030, plank:  0xd49050, beam:   0x7a4818,
      berry:  0x1a003a, jam:    0x48006c,
      egg:    0xf4ecd8,
      stone:  0x9da3a8, cobble: 0xbbc1c6, block:  0x7c8388,
      ore:    0xe08820, ingot:  0xf8d060,
      coal:   0x0c0c14, coke:   0x303040,
      gem:    0x50d0f0, cutgem: 0xa8f0ff, gold:   0xffd34c,
      dirt:   0x7a6850,
    },
    seasons: {
      Spring: { bg: 0x609080, fill: 0x78b0a0, accent: 0x406858 },
      Summer: { bg: 0xb8a820, fill: 0xd8c830, accent: 0x907808 },
      Autumn: { bg: 0x9a5820, fill: 0xc07030, accent: 0x703808 },
      Winter: { bg: 0x405868, fill: 0x6090b0, accent: 0xa8c8e0 },
    },
  },
};

/** Return local YYYY-MM-DD string for a Date object. */
export function dayKeyForDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
