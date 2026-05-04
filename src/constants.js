export const W = 960;
export const H = 640;
export const MOBILE_W = 640;
export const MOBILE_H = 1040;
export const TILE = 74;
export const COLS = 7;
export const ROWS = 6;
export const BOARD_X = 382;
export const BOARD_Y = 96;
export const MAX_TURNS = 8;
export const UPGRADE_EVERY = 3;

export function responsiveGameSize(displayWidth = W) {
  return displayWidth < 760 ? { width: MOBILE_W, height: MOBILE_H, narrow: true } : { width: W, height: H, narrow: false };
}

export function renderResolutionForWidth(displayWidth = W, gameWidth = W) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
  const displayScale = Math.max(displayWidth / gameWidth, 1);
  return Math.min(pixelRatio * displayScale, 3);
}

export const SEASONS = [
  { name: "Spring", icon: "flower", bg: 0x7dbd48, fill: 0x8fd85a, accent: 0x5daa35 },
  { name: "Summer", icon: "sun", bg: 0x8fca45, fill: 0xf6c342, accent: 0xe3a92f },
  { name: "Autumn", icon: "leaf", bg: 0xb77b3a, fill: 0xd9792d, accent: 0xa65722 },
  { name: "Winter", icon: "snow", bg: 0x78aaca, fill: 0x91d9ff, accent: 0xd9f6ff },
];

export const BIOMES = {
  farm: {
    name: "Farm",
    dirt: 0x6d4a2f,
    dark: 0x3e2a1a,
    resources: [
      { key: "hay", label: "Hay", color: 0xa8c769, dark: 0x4f6b3a, value: 1, next: "wheat", glyph: "🌾" },
      { key: "wheat", label: "Wheat", color: 0xdab947, dark: 0x7e5e1a, value: 2, next: "grain", glyph: "𓂃" },
      { key: "grain", label: "Grain", color: 0xc8923a, dark: 0x5e3e10, value: 4, next: "flour", glyph: "✿" },
      { key: "flour", label: "Flour", color: 0xf4e3c0, dark: 0x8a6a3a, value: 6, next: null, glyph: "◈" },
      { key: "log", label: "Log", color: 0x9b6b3e, dark: 0x5e3a1d, value: 2, next: "plank", glyph: "🪵" },
      { key: "plank", label: "Plank", color: 0xc98c50, dark: 0x5e3a1d, value: 4, next: "beam", glyph: "▤" },
      { key: "beam", label: "Beam", color: 0x7e4f24, dark: 0x3a1d10, value: 7, next: null, glyph: "▦" },
      { key: "berry", label: "Berry", color: 0xa3486a, dark: 0x5e1a3a, value: 3, next: "jam", glyph: "◉" },
      { key: "jam", label: "Jam", color: 0xd4658c, dark: 0x7a2f50, value: 5, next: null, glyph: "◎" },
      { key: "egg", label: "Egg", color: 0xf4ecd8, dark: 0x8a785e, value: 3, next: null, glyph: "◯" },
    ],
    pool: ["hay", "hay", "hay", "log", "log", "wheat", "berry", "berry", "egg"],
  },
  mine: {
    name: "Mine",
    dirt: 0x242526,
    dark: 0x151515,
    resources: [
      { key: "stone", label: "Stone", color: 0x9da3a8, dark: 0x3e4348, value: 1, next: "cobble", glyph: "◆" },
      { key: "cobble", label: "Cobble", color: 0xbbc1c6, dark: 0x4e5358, value: 3, next: "block", glyph: "◇" },
      { key: "block", label: "Block", color: 0x7c8388, dark: 0x2a2e32, value: 6, next: null, glyph: "■" },
      { key: "ore", label: "Ore", color: 0xb6a3a3, dark: 0x5e4040, value: 3, next: "ingot", glyph: "◊" },
      { key: "ingot", label: "Ingot", color: 0xe8e0d8, dark: 0x6a5a50, value: 6, next: null, glyph: "▭" },
      { key: "coal", label: "Coal", color: 0x333333, dark: 0x000000, value: 2, next: "coke", glyph: "●" },
      { key: "coke", label: "Coke", color: 0x5a5a60, dark: 0x1a1a20, value: 4, next: null, glyph: "⬢" },
      { key: "gem", label: "Gem", color: 0x65e5ff, dark: 0x1686a3, value: 7, next: "cutgem", glyph: "◈" },
      { key: "cutgem", label: "CutGem", color: 0xa3f0ff, dark: 0x1686a3, value: 14, next: null, glyph: "✦" },
      { key: "gold", label: "Gold", color: 0xffd34c, dark: 0x946b11, value: 5, next: null, glyph: "✺" },
    ],
    pool: ["stone", "stone", "stone", "ore", "ore", "coal", "coal", "gold", "gem"],
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
  { id: "hearth", name: "Hearth", cost: { coins: 0 }, lv: 1, x: 60, y: 360, w: 90, h: 110, color: "#a8431a", built: true },
  { id: "mill", name: "Mill", cost: { coins: 200, plank: 30 }, lv: 1, x: 200, y: 380, w: 80, h: 90, color: "#c8923a" },
  { id: "bakery", name: "Bakery", cost: { coins: 500, plank: 40, stone: 10 }, lv: 1, x: 320, y: 360, w: 100, h: 110, color: "#8a4a26" },
  { id: "inn", name: "Inn", cost: { coins: 700, plank: 50 }, lv: 2, x: 470, y: 350, w: 110, h: 130, color: "#4f6b3a" },
  { id: "granary", name: "Granary", cost: { coins: 250, plank: 20 }, lv: 1, x: 600, y: 380, w: 80, h: 100, color: "#c5a87a" },
  { id: "larder", name: "Larder", cost: { coins: 350, plank: 30, jam: 5 }, lv: 3, x: 700, y: 395, w: 70, h: 85, color: "#4f6b3a" },
  { id: "forge", name: "Forge", cost: { coins: 1200, stone: 60, ingot: 20 }, lv: 8, x: 800, y: 380, w: 100, h: 100, color: "#5a6973" },
  { id: "caravan", name: "Caravan Post", cost: { coins: 1500 }, lv: 8, x: 940, y: 390, w: 110, h: 90, color: "#7e4f24" },
];

export const RECIPES = {
  bread:      { name: "Bread Loaf",     inputs: { flour: 3, egg: 1 },            tier: 1, station: "bakery", coins: 125, glyph: "🍞", color: 0xd49060, dark: 0x7a4a28 },
  honeyroll:  { name: "Honey Roll",     inputs: { flour: 2, egg: 1, jam: 1 },   tier: 2, station: "bakery", coins: 175, glyph: "🍯", color: 0xf0c050, dark: 0x8a6010 },
  harvestpie: { name: "Harvest Pie",    inputs: { flour: 2, jam: 1, egg: 1 },   tier: 2, station: "bakery", coins: 175, glyph: "🥧", color: 0xd4784a, dark: 0x6a3018 },
  preserve:   { name: "Preserve Jar",   inputs: { jam: 2, egg: 1 },             tier: 1, station: "larder", coins: 100, glyph: "🫙", color: 0x9a6888, dark: 0x502848 },
  tincture:   { name: "Berry Tincture", inputs: { berry: 3, jam: 1 },           tier: 1, station: "larder", coins: 125, glyph: "🌿", color: 0x6b8a3a, dark: 0x304018 },
  hinge:      { name: "Iron Hinge",     inputs: { ingot: 2, coke: 1 },          tier: 2, station: "forge",  coins: 175, glyph: "⚙",  color: 0x7a8a96, dark: 0x2a3a46 },
  cobblepath: { name: "Cobble Path",    inputs: { stone: 5, plank: 2 },         tier: 1, station: "forge",  coins: 200, glyph: "🪨", color: 0x9a9a8a, dark: 0x404038 },
  lantern:    { name: "Iron Lantern",   inputs: { ingot: 1, coke: 1, plank: 1 },tier: 2, station: "forge",  coins: 150, glyph: "🏮", color: 0xd4783a, dark: 0x6a2800 },
  goldring:   { name: "Gold Ring",      inputs: { gold: 1, ingot: 2 },          tier: 2, station: "forge",  coins: 225, glyph: "💍", color: 0xffd34c, dark: 0x886810 },
  gemcrown:   { name: "Gem Crown",      inputs: { cutgem: 1, gold: 2 },         tier: 2, station: "forge",  coins: 325, glyph: "👑", color: 0x65e5ff, dark: 0x1060a0 },
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
