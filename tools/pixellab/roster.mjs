// Canonical roster of EVERY planned board-tile subject for the seasonal-tile set, grouped
// by category. This is the master checklist the Assets gallery renders: a subject with art
// on disk shows its real frames; a subject without art shows a placeholder so progress is
// visible as the set fills in.
//
// `slug` is the asset filename stem (docs/seasonal-tile-system/assets/<slug>-summer.png …)
// and MUST match the subject's run-config slug once it is generated — pick it now, keep it.
// `category` keys match gen_gallery's CAT map (drives grouping + the category label/order).
//
// Source of truth for the names/categories is the "All tiles (first pass)" tab in
// docs/seasonal-tile-system/index.html. Add a row here the moment a tile is planned.
//
// Mis-filed-in-constants note: Clover (a four-leaf clover) and Melon (a watermelon) live in
// the `bird` family in constants.ts but are a groundcover and a produce item — filed here
// under their TRUE art playbook, with a `note`.

export default [
  // ── Trees ─────────────────────────────────────────────────────────────────
  { slug: "oak",     name: "Oak",     category: "tree-deciduous" },
  { slug: "birch",   name: "Birch",   category: "tree-deciduous" },
  { slug: "willow",  name: "Willow",  category: "tree-deciduous" },
  { slug: "fir",     name: "Fir",     category: "tree-evergreen" },
  { slug: "cypress", name: "Cypress", category: "tree-evergreen" },
  { slug: "palm",    name: "Palm",    category: "tree-evergreen" },

  // ── Grass / groundcover ───────────────────────────────────────────────────
  { slug: "grass_common", name: "Grass",        category: "grass" },
  { slug: "grass",        name: "Meadow Grass", category: "grass" },
  { slug: "spiky_grass",  name: "Spiky Grass",  category: "grass" },
  { slug: "heather",      name: "Heather",      category: "grass" },
  { slug: "clover",       name: "Clover",       category: "grass", note: "filed as bird in constants.ts" },

  // ── Grain ─────────────────────────────────────────────────────────────────
  { slug: "wheat",    name: "Wheat",    category: "grain" },
  { slug: "corn",     name: "Corn",     category: "grain" },
  { slug: "buckwheat", name: "Buckwheat", category: "grain" },
  { slug: "manna",    name: "Manna",    category: "grain" },
  { slug: "rice",     name: "Rice",     category: "grain" },

  // ── Vegetables ────────────────────────────────────────────────────────────
  { slug: "carrot",   name: "Carrot",   category: "produce-veg" },
  { slug: "eggplant", name: "Eggplant", category: "produce-veg" },
  { slug: "turnip",   name: "Turnip",   category: "produce-veg" },
  { slug: "beet",     name: "Beet",     category: "produce-veg" },
  { slug: "cucumber", name: "Cucumber", category: "produce-veg" },
  { slug: "squash",   name: "Squash",   category: "produce-veg" },
  { slug: "mushroom", name: "Mushroom", category: "produce-veg" },
  { slug: "pepper",   name: "Pepper",   category: "produce-veg" },
  { slug: "broccoli", name: "Broccoli", category: "produce-veg" },
  { slug: "melon",    name: "Melon",    category: "produce-veg", note: "filed as bird in constants.ts" },

  // ── Fruit ─────────────────────────────────────────────────────────────────
  { slug: "apple",       name: "Apple",       category: "produce-fruit" },
  { slug: "pear",        name: "Pear",        category: "produce-fruit" },
  { slug: "golden_apple", name: "Golden Apple", category: "produce-fruit" },
  { slug: "blackberry",  name: "Blackberry",  category: "produce-fruit" },
  { slug: "rambutan",    name: "Rambutan",    category: "produce-fruit" },
  { slug: "starfruit",   name: "Starfruit",   category: "produce-fruit" },
  { slug: "coconut",     name: "Coconut",     category: "produce-fruit" },
  { slug: "lemon",       name: "Lemon",       category: "produce-fruit" },
  { slug: "jackfruit",   name: "Jackfruit",   category: "produce-fruit" },

  // ── Flowers ───────────────────────────────────────────────────────────────
  { slug: "pansy",     name: "Pansy",      category: "flower" },
  { slug: "water_lily", name: "Water Lily", category: "flower" },

  // ── Birds ─────────────────────────────────────────────────────────────────
  { slug: "pheasant",        name: "Pheasant",        category: "bird" },
  { slug: "chicken",         name: "Chicken",         category: "bird" },
  { slug: "hen",             name: "Hen",             category: "bird" },
  { slug: "rooster",         name: "Rooster",         category: "bird" },
  { slug: "wild_goose",      name: "Wild Goose",      category: "bird" },
  { slug: "goose",           name: "Goose",           category: "bird" },
  { slug: "parrot",          name: "Parrot",          category: "bird" },
  { slug: "phoenix",         name: "Phoenix",         category: "bird" },
  { slug: "dodo",            name: "Dodo",            category: "bird" },
  { slug: "pig_in_disguise", name: "Pig in Disguise", category: "bird" },
  { slug: "turkey",          name: "Turkey",          category: "bird" },

  // ── Herd · Cattle · Mounts ────────────────────────────────────────────────
  { slug: "pig",          name: "Pig",          category: "herd" },
  { slug: "hog",          name: "Hog",          category: "herd" },
  { slug: "boar",         name: "Boar",         category: "herd" },
  { slug: "warthog",      name: "Warthog",      category: "herd" },
  { slug: "sheep",        name: "Sheep",        category: "herd" },
  { slug: "alpaca",       name: "Alpaca",       category: "herd" },
  { slug: "goat",         name: "Goat",         category: "herd" },
  { slug: "ram",          name: "Ram",          category: "herd" },
  { slug: "cow",          name: "Cow",          category: "herd" },
  { slug: "longhorn",     name: "Longhorn",     category: "herd" },
  { slug: "triceratops",  name: "Triceratops",  category: "herd" },
  { slug: "horse",        name: "Horse",        category: "herd" },
  { slug: "donkey",       name: "Donkey",       category: "herd" },
  { slug: "moose",        name: "Moose",        category: "herd" },
  { slug: "mammoth",      name: "Mammoth",      category: "herd" },

  // ── Mine / ore ────────────────────────────────────────────────────────────
  { slug: "stone",      name: "Stone",      category: "mineral" },
  { slug: "iron_ore",   name: "Iron Ore",   category: "mineral" },
  { slug: "copper_ore", name: "Copper Ore", category: "mineral" },
  { slug: "coal",       name: "Coal",       category: "mineral" },
  { slug: "gem",        name: "Gem",        category: "mineral" },
  { slug: "gold",       name: "Gold",       category: "mineral" },

  // ── Fish / aquatic ────────────────────────────────────────────────────────
  { slug: "sardine",     name: "Sardine",     category: "aquatic" },
  { slug: "mackerel",    name: "Mackerel",    category: "aquatic" },
  { slug: "clam",        name: "Clam",        category: "aquatic" },
  { slug: "oyster",      name: "Oyster",      category: "aquatic" },
  { slug: "kelp",        name: "Kelp",        category: "aquatic" },
  { slug: "giant_pearl", name: "Giant Pearl", category: "aquatic" },

  // ── Special ───────────────────────────────────────────────────────────────
  { slug: "dirt",        name: "Dirt",        category: "special" },
  { slug: "golden_coin", name: "Golden Coin", category: "special" },
];
