// Phase 7 — calendar season effects removed. The 4-season-of-year cycle no
// longer drives harvest bonuses, order multipliers, autumn x2 upgrades, or
// the winter minimum-chain floor. The SEASONS array (visual metadata)
// remains, and the per-(zone, in-session season) spawn-rate sampler still
// reads `seasonNameInSession` from features/zones/data.js — those are local
// to a session and unrelated to the deleted calendar.

export const STORAGE_KEYS = {
  save: "hearth.save.v1",
  settings: "hearth.settings",
  tutorialSeen: "hearth.tutorial.seen",
};

// Custom Phaser scene event names (this.events.emit / .on). Centralised so
// a typo on either side becomes a static reference error instead of a
// silently-dropped event. Phaser's automatic `changedata-<key>` events are
// not listed here — they're derived from registry keys.
export const SCENE_EVENTS = Object.freeze({
  CHAIN_COLLECTED: "chain-collected",
  CHAIN_UPDATE: "chain-update",
  GRID_SYNC: "grid-sync",
  FERTILIZER_CONSUMED: "fertilizer-consumed",
});

export const TILE = 74;
export const COLS = 6;
export const ROWS = 6;
export const MAX_TURNS = 10;

// Save schema version. Forward migrations are not maintained — bump this
// whenever persisted state changes shape and existing saves will be discarded.
export const SAVE_SCHEMA_VERSION = 25;

export const UPGRADE_THRESHOLDS = {
  grass_hay: 6, grass_meadow: 6, grass_spiky: 6,
  grain_wheat: 5, grain: 4,
  wood_log: 5, wood_plank: 4,
  // Flour → Bread (catalog §4: "Grain (6) → Bread"). Our existing model
  // has hay → wheat → grain → flour as the grass-then-grain chain; bread
  // is appended as the terminal tier so the catalog target is reachable
  // via long chains. The bakery recipe (3 flour + 1 egg → 1 bread) remains
  // as a faster alternative path.
  grain_flour: 6,
  berry: 7,
  mine_stone: 8, mine_cobble: 6,
  mine_ore: 6, mine_coal: 7, mine_gem: 5,
  // Birds → Eggs (chain 6). Existing bird tiles get explicit thresholds now
  // that they upgrade to the new `eggs` product.
  bird_egg: 6, bird_turkey: 6, bird_clover: 6, bird_melon: 6,
  veg_carrot: 6, veg_eggplant: 6, veg_turnip: 6, veg_beet: 6, veg_cucumber: 6,
  veg_squash: 6, veg_mushroom: 6, veg_pepper: 6, veg_broccoli: 6,
  // Catalog-import placeholders. All default to 6 — balance comes later.
  grass_heather: 6,
  grain_corn: 6, grain_buckwheat: 6, grain_manna: 6, grain_rice: 6,
  // Fruits → Pie (catalog §4: 7 fruits → 1 pie)
  fruit_apple: 7, fruit_pear: 7, fruit_golden_apple: 7, fruit_blackberry: 7,
  fruit_rambutan: 7, fruit_starfruit: 7, fruit_coconut: 7, fruit_lemon: 7, fruit_jackfruit: 7,
  // Flowers → Honey (catalog §4: 10 flowers → 1 honey)
  flower_pansy: 10, flower_water_lily: 10,
  // Trees — placeholder; new tree species don't yet chain to a product (existing log/plank/beam chain still authoritative for wood).
  tree_oak: 6, tree_birch: 6, tree_willow: 6, tree_fir: 6, tree_cypress: 6, tree_palm: 6,
  // Birds — chain length kept at 6 placeholder; egg/eggs upgrade product would live here once we redesign the bird chain.
  bird_pheasant: 6, bird_chicken: 6, bird_hen: 6, bird_rooster: 6, bird_wild_goose: 6, bird_goose: 6,
  bird_parrot: 6, bird_phoenix: 6, bird_dodo: 6, bird_pig_in_disguise: 6,
  // Herd Animals → Meat (catalog §4: 5 herd → 1 meat)
  herd_pig: 5, herd_hog: 5, herd_boar: 5, herd_warthog: 5,
  herd_sheep: 5, herd_alpaca: 5, herd_goat: 5, herd_ram: 5,
  // Cattle → Milk (catalog §4: 6 cattle → 1 milk)
  cattle_cow: 6, cattle_longhorn: 6, cattle_triceratops: 6,
  // Mounts → Horseshoe (catalog §4: 10 mounts → 1 horseshoe)
  mount_horse: 10, mount_donkey: 10, mount_moose: 10, mount_mammoth: 10,
  // Fish biome (MVP) — Sardine/Mackerel/Clam/Kelp chain to fish_raw, then
  // fillet. Numbers parallel the farm grass→wheat→grain→flour staircase
  // but slightly cheaper since the fish biome opens later than farm.
  fish_sardine: 5, fish_mackerel: 5, fish_clam: 5, fish_kelp: 6, fish_oyster: 5,
  fish_raw: 5, fish_fillet: 4, fish_oil: 6,
};

export const SEASONS = [
  { name: "Spring", icon: "flower", bg: 0x7dbd48, fill: 0x8fd85a, accent: 0x5daa35 },
  { name: "Summer", icon: "sun", bg: 0x8fca45, fill: 0xf6c342, accent: 0xe3a92f },
  { name: "Autumn", icon: "leaf", bg: 0xb77b3a, fill: 0xd9792d, accent: 0xa65722 },
  { name: "Winter", icon: "snow", bg: 0x78aaca, fill: 0x91d9ff, accent: 0xd9f6ff },
];

// Farm board tile pool. Each entry is one slot in the random fill rotation.
// Per-category counts intentionally weighted: staple chains (hay, log) get
// more slots; new chain categories get one each so the player sees them
// without the board becoming chain-impossible at 6×6 = 36 cells.
export const FARM_TILE_POOL = [
  "grass_hay", "grass_hay", "grass_hay",
  "wood_log", "wood_log",
  "grain_wheat",
  "berry", "berry",
  "bird_egg",
  "veg_carrot",
  "fruit_apple",
  "flower_pansy",
  "tree_oak",
  "herd_pig",
  "cattle_cow",
  "mount_horse",
  // Bird category already covered by `egg` slot above; new bird species
  // (chicken, hen, rooster, …) become alternate active species via the
  // species-activation pipeline rather than additional pool slots.
];
export const MINE_TILE_POOL = ["mine_stone", "mine_stone", "mine_stone", "mine_ore", "mine_ore", "mine_coal", "mine_dirt", "mine_dirt", "mine_gem"];

// Fish biome (MVP) — sardines / mackerel are most common, kelp is a filler,
// clam/oyster are mid-rare, fish_raw is rare so it's mostly a chain product.
export const FISH_TILE_POOL = [
  "fish_sardine", "fish_sardine", "fish_sardine",
  "fish_mackerel", "fish_mackerel",
  "fish_clam", "fish_clam",
  "fish_kelp", "fish_kelp",
  "fish_oyster",
];

export const BIOMES = {
  farm: {
    name: "Farm",
    mine_dirt: 0x6d4a2f,
    dark: 0x3e2a1a,
    dirtColor: 0x6d4a2f,
    palette: { bg: 0x7dbd48, accent: 0x5daa35, dim: 0x3e2a1a },
    tilePool: FARM_TILE_POOL,
    resources: [
      { key: "grass_hay",          label: "Hay",          color: 0xa8c769, dark: 0x4f6b3a, value: 1, next: "grain_wheat", glyph: "🌾", sway: { amp: 4.0, freq: 0.00060, gust: 0.20 } },
      { key: "grass_meadow", label: "Meadow Grass", color: 0x7fb24a, dark: 0x3e5a18, value: 1, next: "grain_wheat", glyph: "🌿", sway: { amp: 4.5, freq: 0.00058, gust: 0.22 } },
      { key: "grass_spiky",  label: "Spiky Grass",  color: 0x9bb55a, dark: 0x4a5e1c, value: 1, next: "grain_wheat", glyph: "🌱", sway: { amp: 2.5, freq: 0.00075, gust: 0.18 } },
      { key: "grain_wheat", label: "Wheat", color: 0xdab947, dark: 0x7e5e1a, value: 2, next: "grain", glyph: "𓂃", sway: { amp: 5.0, freq: 0.00065, gust: 0.22 } },
      { key: "grain", label: "Grain", color: 0xc8923a, dark: 0x5e3e10, value: 4, next: "grain_flour", glyph: "✿", sway: { amp: 1.2, freq: 0.00035, gust: 0.08 } },
      { key: "grain_flour", label: "Flour", color: 0xf4e3c0, dark: 0x8a6a3a, value: 6, next: "bread", glyph: "◈", sway: { amp: 1.0, freq: 0.00030, gust: 0.05 } },
      { key: "wood_log",   label: "Log",   color: 0x9b6b3e, dark: 0x5e3a1d, value: 2, next: "wood_plank", glyph: "🪵" },
      { key: "wood_plank", label: "Plank", color: 0xc98c50, dark: 0x5e3a1d, value: 4, next: "wood_beam",  glyph: "▤" },
      { key: "wood_beam",  label: "Beam",  color: 0x7e4f24, dark: 0x3a1d10, value: 7, next: null,    glyph: "▦" },
      { key: "berry", label: "Berry", color: 0xa3486a, dark: 0x5e1a3a, value: 3, next: "berry_jam",   glyph: "◉", sway: { amp: 3.5, freq: 0.00090, gust: 0.15 } },
      { key: "berry_jam",   label: "Jam",   color: 0xd4658c, dark: 0x7a2f50, value: 5, next: null,    glyph: "◎", sway: { amp: 0.8, freq: 0.00025, gust: 0.00 } },
      { key: "bird_egg",   label: "Egg",   color: 0xf4ecd8, dark: 0x8a785e, value: 3, next: "eggs",    glyph: "◯", sway: { amp: 1.5, freq: 0.00055, gust: 0.08 } },
      { key: "bird_turkey", label: "Turkey", color: 0xb8743a, dark: 0x5e3818, value: 4, next: "eggs", glyph: "🦃", sway: { amp: 1.2, freq: 0.00050, gust: 0.10 } },
      { key: "bird_clover", label: "Clover", color: 0x6fa450, dark: 0x365e22, value: 5, next: "eggs", glyph: "☘", sway: { amp: 2.5, freq: 0.00080, gust: 0.18 } },
      { key: "bird_melon",  label: "Melon",  color: 0xb3d770, dark: 0x4a6e2a, value: 6, next: "eggs", glyph: "🍈", sway: { amp: 0.8, freq: 0.00030, gust: 0.05 } },
      { key: "veg_carrot",   label: "Carrot",   color: 0xe88439, dark: 0x7a3e10, value: 4, next: "soup", glyph: "🥕", sway: { amp: 2.0, freq: 0.00050, gust: 0.10 } },
      { key: "veg_eggplant", label: "Eggplant", color: 0x6b3a8a, dark: 0x301848, value: 4, next: "soup", glyph: "🍆", sway: { amp: 1.8, freq: 0.00048, gust: 0.08 } },
      { key: "veg_turnip",   label: "Turnip",   color: 0xd87aa0, dark: 0x6e2a4a, value: 4, next: "soup", glyph: "🥬", sway: { amp: 1.6, freq: 0.00050, gust: 0.08 } },
      { key: "veg_beet",     label: "Beet",     color: 0x6b1a3a, dark: 0x300818, value: 4, next: "soup", glyph: "🫜", sway: { amp: 1.5, freq: 0.00046, gust: 0.07 } },
      { key: "veg_cucumber", label: "Cucumber", color: 0x4f8c3a, dark: 0x224018, value: 4, next: "soup", glyph: "🥒", sway: { amp: 2.4, freq: 0.00056, gust: 0.10 } },
      { key: "veg_squash",   label: "Squash",   color: 0xe6c14a, dark: 0x7a5e10, value: 4, next: "soup", glyph: "🎃", sway: { amp: 1.7, freq: 0.00048, gust: 0.08 } },
      { key: "veg_mushroom", label: "Mushroom", color: 0xc63a3a, dark: 0x601818, value: 4, next: "soup", glyph: "🍄", sway: { amp: 1.5, freq: 0.00044, gust: 0.06 } },
      { key: "veg_pepper",   label: "Pepper",   color: 0xd83a3a, dark: 0x6e1818, value: 4, next: "soup", glyph: "🌶", sway: { amp: 2.2, freq: 0.00054, gust: 0.10 } },
      { key: "veg_broccoli", label: "Broccoli", color: 0x4a8a3a, dark: 0x1e3e18, value: 4, next: "soup", glyph: "🥦", sway: { amp: 3.0, freq: 0.00060, gust: 0.12 } },
      { key: "soup",     label: "Soup",     color: 0xc46a2f, dark: 0x6e3a18, value: 20, next: null, glyph: "🍲" },
      // Phase: wire-all-chains — terminal chain products from REFERENCE_CATALOG §4.
      { key: "pie",       label: "Pie",       color: 0xb05428, dark: 0x582818, value: 90,  next: null, glyph: "🥧" },
      { key: "honey",     label: "Honey",     color: 0xe8a020, dark: 0x745010, value: 300, next: null, glyph: "🍯" },
      { key: "meat",      label: "Meat",      color: 0xc44848, dark: 0x682424, value: 21,  next: null, glyph: "🍖" },
      { key: "milk",      label: "Milk",      color: 0xfaf6ec, dark: 0x807e74, value: 100, next: null, glyph: "🥛" },
      { key: "horseshoe", label: "Horseshoe", color: 0x8a8a90, dark: 0x46464a, value: 400, next: null, glyph: "🧲" },
      { key: "eggs",      label: "Eggs",      color: 0xf8efd0, dark: 0x807660, value: 5, next: null, glyph: "🥚" },
      { key: "bread",     label: "Bread",     color: 0xc89048, dark: 0x6a4820, value: 4, next: null, glyph: "🍞" },

      // ─── Catalog-import placeholders (assets-only PR) ─────────────────────
      // Resources for every new tile-type in REFERENCE_CATALOG §7. They
      // render via the design-bundle iconRegistry and have placeholder
      // value/next — they don't spawn on the board yet (FARM_TILE_POOL is
      // unchanged), they don't sell at market, and there's no chain → product
      // wiring. Those follow in dedicated chain PRs.
      // Grass
      { key: "grass_heather",      label: "Heather",      color: 0x7a4f8a, dark: 0x3a2548, value: 1, next: null, glyph: "🌿", sway: { amp: 2.5, freq: 0.00060, gust: 0.10 } },
      // Grain
      { key: "grain_corn",         label: "Corn",         color: 0xf4c84a, dark: 0x7a6020, value: 1, next: null, glyph: "🌽", sway: { amp: 4.0, freq: 0.00060, gust: 0.18 } },
      { key: "grain_buckwheat",    label: "Buckwheat",    color: 0x9ab548, dark: 0x4a5820, value: 1, next: null, glyph: "🌾", sway: { amp: 3.5, freq: 0.00058, gust: 0.16 } },
      { key: "grain_manna",        label: "Manna",        color: 0xf8e8c0, dark: 0x7a6e58, value: 1, next: null, glyph: "✨", sway: { amp: 1.5, freq: 0.00040, gust: 0.06 } },
      { key: "grain_rice",         label: "Rice",         color: 0xc8d878, dark: 0x60683c, value: 1, next: null, glyph: "🌾", sway: { amp: 3.0, freq: 0.00056, gust: 0.14 } },
      // Fruits
      { key: "fruit_apple",        label: "Apple",        color: 0xd4543a, dark: 0x6a2a18, value: 1, next: "pie", glyph: "🍎", sway: { amp: 1.2, freq: 0.00040, gust: 0.06 } },
      { key: "fruit_pear",         label: "Pear",         color: 0xbcc436, dark: 0x5e6018, value: 1, next: "pie", glyph: "🍐", sway: { amp: 1.2, freq: 0.00040, gust: 0.06 } },
      { key: "fruit_golden_apple", label: "Golden Apple", color: 0xf4c430, dark: 0x7a6010, value: 1, next: "pie", glyph: "🍏", sway: { amp: 1.2, freq: 0.00040, gust: 0.06 } },
      { key: "fruit_blackberry",   label: "Blackberry",   color: 0x3a1a4a, dark: 0x180a20, value: 1, next: "pie", glyph: "🫐", sway: { amp: 1.0, freq: 0.00038, gust: 0.05 } },
      { key: "fruit_rambutan",     label: "Rambutan",     color: 0xd8344a, dark: 0x6a1820, value: 1, next: "pie", glyph: "🌶", sway: { amp: 1.4, freq: 0.00042, gust: 0.07 } },
      { key: "fruit_starfruit",    label: "Starfruit",    color: 0xe8c83c, dark: 0x726018, value: 1, next: "pie", glyph: "⭐", sway: { amp: 1.0, freq: 0.00040, gust: 0.05 } },
      { key: "fruit_coconut",      label: "Coconut",      color: 0x5e3a14, dark: 0x2e1c08, value: 1, next: "pie", glyph: "🥥", sway: { amp: 0.8, freq: 0.00030, gust: 0.04 } },
      { key: "fruit_lemon",        label: "Lemon",        color: 0xf4d030, dark: 0x7a6818, value: 1, next: "pie", glyph: "🍋", sway: { amp: 1.2, freq: 0.00042, gust: 0.06 } },
      { key: "fruit_jackfruit",    label: "Jackfruit",    color: 0xa8a040, dark: 0x52501c, value: 1, next: "pie", glyph: "🍈", sway: { amp: 1.0, freq: 0.00038, gust: 0.05 } },
      // Flowers
      { key: "flower_pansy",       label: "Pansy",        color: 0x7a3aa8, dark: 0x3c1c54, value: 1, next: "honey", glyph: "🌸", sway: { amp: 2.6, freq: 0.00070, gust: 0.14 } },
      { key: "flower_water_lily",  label: "Water Lily",   color: 0xe890c0, dark: 0x70486a, value: 1, next: "honey", glyph: "🪷", sway: { amp: 0.8, freq: 0.00026, gust: 0.04 } },
      // Trees (distinct from existing log/plank/beam wood chain)
      { key: "tree_oak",           label: "Oak",          color: 0x3a6818, dark: 0x1a3008, value: 1, next: "wood_log", glyph: "🌳", sway: { amp: 1.6, freq: 0.00030, gust: 0.10 } },
      { key: "tree_birch",         label: "Birch",        color: 0xa8c038, dark: 0x546018, value: 1, next: "wood_log", glyph: "🌲", sway: { amp: 2.2, freq: 0.00034, gust: 0.12 } },
      { key: "tree_willow",        label: "Willow",       color: 0x5a8a18, dark: 0x2a4008, value: 1, next: "wood_log", glyph: "🌿", sway: { amp: 3.0, freq: 0.00038, gust: 0.18 } },
      { key: "tree_fir",           label: "Fir",          color: 0x2a5008, dark: 0x142404, value: 1, next: "wood_log", glyph: "🌲", sway: { amp: 0.6, freq: 0.00024, gust: 0.04 } },
      { key: "tree_cypress",       label: "Cypress",      color: 0x1a3a08, dark: 0x0a1804, value: 1, next: "wood_log", glyph: "🌲", sway: { amp: 0.4, freq: 0.00020, gust: 0.02 } },
      { key: "tree_palm",          label: "Palm Tree",    color: 0x5a8a18, dark: 0x2a4008, value: 1, next: "wood_log", glyph: "🌴", sway: { amp: 2.8, freq: 0.00040, gust: 0.16 } },
      // Birds (extends existing `bird` category)
      { key: "bird_pheasant",      label: "Pheasant",     color: 0x8a4a18, dark: 0x44230a, value: 1, next: "eggs", glyph: "🦅", sway: { amp: 1.0, freq: 0.00040, gust: 0.05 } },
      { key: "bird_chicken",       label: "Chicken",      color: 0xf0d8a0, dark: 0x786a48, value: 1, next: "eggs", glyph: "🐔", sway: { amp: 1.0, freq: 0.00040, gust: 0.05 } },
      { key: "bird_hen",           label: "Hen",          color: 0xa86838, dark: 0x52321a, value: 1, next: "eggs", glyph: "🐓", sway: { amp: 1.0, freq: 0.00040, gust: 0.05 } },
      { key: "bird_rooster",       label: "Rooster",      color: 0xd81818, dark: 0x6a0a0a, value: 1, next: "eggs", glyph: "🐓", sway: { amp: 1.2, freq: 0.00044, gust: 0.06 } },
      { key: "bird_wild_goose",    label: "Wild Goose",   color: 0xa89878, dark: 0x524a3a, value: 1, next: "eggs", glyph: "🦢", sway: { amp: 1.2, freq: 0.00044, gust: 0.06 } },
      { key: "bird_goose",         label: "Goose",        color: 0xfffce8, dark: 0x807e74, value: 1, next: "eggs", glyph: "🦆", sway: { amp: 1.2, freq: 0.00044, gust: 0.06 } },
      { key: "bird_parrot",        label: "Parrot",       color: 0xd81818, dark: 0x6a0a0a, value: 1, next: "eggs", glyph: "🦜", sway: { amp: 1.4, freq: 0.00046, gust: 0.07 } },
      { key: "bird_phoenix",       label: "Phoenix",      color: 0xf8a020, dark: 0x7c500e, value: 1, next: "eggs", glyph: "🔥", sway: { amp: 1.6, freq: 0.00050, gust: 0.10 } },
      { key: "bird_dodo",          label: "Dodo",         color: 0xa89878, dark: 0x524a3a, value: 1, next: "eggs", glyph: "🦤", sway: { amp: 0.8, freq: 0.00036, gust: 0.04 } },
      { key: "bird_pig_in_disguise", label: "Pig in Disguise", color: 0xe88a98, dark: 0x72424a, value: 1, next: "eggs", glyph: "🐽", sway: { amp: 0.8, freq: 0.00036, gust: 0.04 } },
      // Herd Animals
      { key: "herd_pig",           label: "Pig",          color: 0xe88a98, dark: 0x72424a, value: 1, next: "meat", glyph: "🐖", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
      { key: "herd_hog",           label: "Hog",          color: 0xa87838, dark: 0x523a1a, value: 1, next: "meat", glyph: "🐗", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
      { key: "herd_boar",          label: "Boar",         color: 0x241408, dark: 0x100804, value: 1, next: "meat", glyph: "🐗", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
      { key: "herd_warthog",       label: "Warthog",      color: 0x5a4828, dark: 0x2c2412, value: 1, next: "meat", glyph: "🐗", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
      { key: "herd_sheep",         label: "Sheep",        color: 0xfffce8, dark: 0x807e74, value: 1, next: "meat", glyph: "🐑", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
      { key: "herd_alpaca",        label: "Alpaca",       color: 0xf8e8c8, dark: 0x7c7264, value: 1, next: "meat", glyph: "🦙", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
      { key: "herd_goat",          label: "Goat",         color: 0xd8c098, dark: 0x6c604a, value: 1, next: "meat", glyph: "🐐", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
      { key: "herd_ram",           label: "Ram",          color: 0xa87838, dark: 0x523a1a, value: 1, next: "meat", glyph: "🐏", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
      // Cattle
      { key: "cattle_cow",         label: "Cow",          color: 0xfffce8, dark: 0x807e74, value: 1, next: "milk", glyph: "🐄", sway: { amp: 0.4, freq: 0.00022, gust: 0.03 } },
      { key: "cattle_longhorn",    label: "Longhorn",     color: 0xd89048, dark: 0x6a4820, value: 1, next: "milk", glyph: "🐂", sway: { amp: 0.4, freq: 0.00022, gust: 0.03 } },
      { key: "cattle_triceratops", label: "Triceratops",  color: 0x5a8a28, dark: 0x2c4414, value: 1, next: "milk", glyph: "🦖", sway: { amp: 0.4, freq: 0.00022, gust: 0.03 } },
      // Mounts
      { key: "mount_horse",        label: "Horse",        color: 0xa86838, dark: 0x52321a, value: 1, next: "horseshoe", glyph: "🐎", sway: { amp: 0.4, freq: 0.00022, gust: 0.03 } },
      { key: "mount_donkey",       label: "Donkey",       color: 0x8a8478, dark: 0x44423a, value: 1, next: "horseshoe", glyph: "🫏", sway: { amp: 0.4, freq: 0.00022, gust: 0.03 } },
      { key: "mount_moose",        label: "Moose",        color: 0x5a3814, dark: 0x2c1c0a, value: 1, next: "horseshoe", glyph: "🦌", sway: { amp: 0.4, freq: 0.00022, gust: 0.03 } },
      { key: "mount_mammoth",      label: "Mammoth",      color: 0xa87838, dark: 0x523a1a, value: 1, next: "horseshoe", glyph: "🐘", sway: { amp: 0.4, freq: 0.00022, gust: 0.03 } },
    ],
    pool: FARM_TILE_POOL,
  },
  mine: {
    name: "Mine",
    mine_dirt: 0x242526,
    dark: 0x151515,
    dirtColor: 0x3e3a36,
    palette: { bg: 0x2a2c30, accent: 0x6a7280, dim: 0x121316 },
    tilePool: MINE_TILE_POOL,
    resources: [
      { key: "mine_stone",  label: "Stone",  color: 0x9da3a8, dark: 0x3e4348, value: 1,  next: "mine_cobble", glyph: "◆" },
      { key: "mine_cobble", label: "Cobble", color: 0xbbc1c6, dark: 0x4e5358, value: 3,  next: "mine_block",  glyph: "◇" },
      { key: "mine_block",  label: "Block",  color: 0x7c8388, dark: 0x2a2e32, value: 6,  next: null,     glyph: "■" },
      { key: "mine_ore",    label: "Ore",    color: 0xb6a3a3, dark: 0x5e4040, value: 3,  next: "mine_ingot",  glyph: "◊", sway: { amp: 0.4, freq: 0.00020, gust: 0.00 } },
      { key: "mine_ingot",  label: "Ingot",  color: 0xe8e0d8, dark: 0x6a5a50, value: 6,  next: null,     glyph: "▭" },
      { key: "mine_coal",   label: "Coal",   color: 0x333333, dark: 0x000000, value: 2,  next: "mine_coke",   glyph: "●" },
      { key: "mine_coke",   label: "Coke",   color: 0x5a5a60, dark: 0x1a1a20, value: 4,  next: null,     glyph: "⬢" },
      { key: "mine_gem",    label: "Gem",    color: 0x65e5ff, dark: 0x1686a3, value: 7,  next: "mine_cutgem", glyph: "◈", sway: { amp: 1.2, freq: 0.00028, gust: 0.04 } },
      { key: "mine_cutgem", label: "CutGem", color: 0xa3f0ff, dark: 0x1686a3, value: 14, next: null,     glyph: "✦", sway: { amp: 1.2, freq: 0.00028, gust: 0.04 } },
      { key: "mine_gold",   label: "Gold",   color: 0xffd34c, dark: 0x946b11, value: 5,  next: null,     glyph: "✺", sway: { amp: 1.0, freq: 0.00024, gust: 0.04 } },
      { key: "mine_dirt",   label: "Dirt",   color: 0x7a6850, dark: 0x3e3a36, value: 1,  next: null,     glyph: "◫" },
    ],
    pool: MINE_TILE_POOL,
  },
  // Fish biome (MVP) — coastal harbor board. Tide cycle, pearl-rune mechanic
  // and recipe wiring (chowder, fish oil) are scoped in docs/FISH_BOARD_SCOPE.md
  // and intentionally not implemented yet. This step adds only the resources,
  // pool and biome entry so the biome can be entered + chained on.
  fish: {
    name: "Harbor",
    mine_dirt: 0x2a4a6a,
    dark: 0x18283a,
    dirtColor: 0x2a4a6a,
    palette: { bg: 0x2a4a6a, accent: 0x4a8aaa, dim: 0x18283a },
    tilePool: FISH_TILE_POOL,
    resources: [
      { key: "fish_sardine",  label: "Sardine",  color: 0x9ab8c4, dark: 0x4a5e68, value: 1, next: "fish_raw",     glyph: "🐟", sway: { amp: 1.4, freq: 0.00050, gust: 0.08 } },
      { key: "fish_mackerel", label: "Mackerel", color: 0x4a7a9a, dark: 0x223a4a, value: 2, next: "fish_raw",     glyph: "🐠", sway: { amp: 1.6, freq: 0.00052, gust: 0.10 } },
      { key: "fish_clam",     label: "Clam",     color: 0xc8a888, dark: 0x705a40, value: 2, next: "fish_raw",     glyph: "🦪", sway: { amp: 0.4, freq: 0.00020, gust: 0.02 } },
      { key: "fish_oyster",   label: "Oyster",   color: 0xd0c0a8, dark: 0x6a5e48, value: 3, next: "fish_raw",     glyph: "🦪", sway: { amp: 0.4, freq: 0.00020, gust: 0.02 } },
      { key: "fish_kelp",     label: "Kelp",     color: 0x3a6a3a, dark: 0x1a3818, value: 1, next: "fish_oil",     glyph: "🌿", sway: { amp: 3.0, freq: 0.00060, gust: 0.18 } },
      { key: "fish_raw",      label: "Fish",     color: 0xb0c8d4, dark: 0x546a78, value: 4, next: "fish_fillet",  glyph: "🐡" },
      { key: "fish_fillet",   label: "Fillet",   color: 0xe8c8b0, dark: 0x7a604c, value: 8, next: null,           glyph: "▰" },
      { key: "fish_oil",      label: "Fish Oil", color: 0xe8d050, dark: 0x7a6818, value: 6, next: null,           glyph: "💧" },
    ],
    pool: FISH_TILE_POOL,
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
  { id: "mill", name: "Mill", desc: "Grinds grain into flour, enabling the grain → flour upgrade chain.", cost: { coins: 200, wood_plank: 30 }, lv: 1, x: 200, y: 380, w: 80, h: 90, color: "#c8923a" },
  { id: "bakery", name: "Bakery", desc: "Craft baked goods — bread, honey rolls, harvest pies — to sell for coins.", cost: { coins: 500, wood_plank: 40, mine_stone: 10 }, lv: 1, x: 320, y: 360, w: 100, h: 110, color: "#8a4a26" },
  { id: "inn", name: "Inn", desc: "Lodgings for helpers. Unlocks apprentice hiring: Pip (Forager) and Tuck (Lookout).", cost: { coins: 400, wood_plank: 20 }, lv: 2, x: 470, y: 350, w: 110, h: 130, color: "#4f6b3a" },
  { id: "granary", name: "Granary", desc: "Keeps the harvest safe. Unlocks Hilda the Farmhand apprentice.", cost: { coins: 300, wood_plank: 20 }, lv: 1, x: 600, y: 380, w: 80, h: 100, color: "#c5a87a" },
  { id: "larder", name: "Larder", desc: "Preserve and bottle your harvest. Craft preserve jars and berry tinctures for coins.", cost: { coins: 700, wood_plank: 30, mine_stone: 20 }, lv: 3, x: 700, y: 395, w: 70, h: 85, color: "#4f6b3a" },
  { id: "forge", name: "Forge", desc: "Smith metal goods — hinges, lanterns, rings, and more — for high coin rewards.", cost: { coins: 1200, mine_stone: 60, mine_ingot: 20 }, lv: 8, x: 800, y: 380, w: 100, h: 100, color: "#5a6973" },
  { id: "caravan_post", name: "Caravan Post", desc: "Opens distant trade routes, letting you sell crafted goods to far-off markets.", cost: { coins: 800, wood_plank: 40 }, lv: 8, x: 940, y: 390, w: 110, h: 90, color: "#7e4f24" },
  { id: "kitchen", name: "Kitchen", desc: "Converts surplus grain into supplies. Three supplies grant standard Mine entry.", cost: { coins: 400, wood_plank: 20 }, lv: 2, x: 60, y: 260, w: 90, h: 100, color: "#8a4a26" },
  { id: "workshop", name: "Workshop", desc: "Crafts shovels and other tools from raw materials.", cost: { coins: 500, wood_plank: 20, mine_stone: 10 }, lv: 3, x: 180, y: 265, w: 90, h: 100, color: "#6a5a3a" },
  { id: "powder_store", name: "Powder Store", desc: "Stockpiles black powder. Produces 2 Bombs at the end of every season.", cost: { coins: 600, mine_stone: 30, mine_ingot: 5 }, lv: 5, x: 310, y: 260, w: 90, h: 100, color: "#3a2a1a" },
  { id: "portal", name: "Magic Portal", desc: "A shimmering gateway. Summons unlock with Influence (Phase 8).", cost: { coins: 2000, runes: 5 }, lv: 8, x: 440, y: 245, w: 100, h: 115, color: "#4a2a7a" },
  { id: "housing", name: "Housing Block",
    desc: "Quarters for hired hands. Each Housing raises your worker capacity by 1.",
    cost: { coins: 300, wood_plank: 25 }, lv: 2,
    x: 430, y: 262, w: 80, h: 92, color: "#a07a4a" },
  { id: "housing2", name: "Housing Block",
    desc: "Quarters for hired hands. Each Housing raises your worker capacity by 1.",
    cost: { coins: 300, wood_plank: 25 }, lv: 2, requires: "housing",
    x: 520, y: 262, w: 80, h: 92, color: "#a07a4a" },
  { id: "housing3", name: "Housing Block",
    desc: "Quarters for hired hands. Each Housing raises your worker capacity by 1.",
    cost: { coins: 300, wood_plank: 25 }, lv: 2, requires: "housing2",
    x: 610, y: 262, w: 80, h: 92, color: "#a07a4a" },
  // Phase 12.5 — §18 LOCKED: Silos/Barns preserve tile layout between sessions
  { id: "silo", name: "Silo",
    desc: "Wood-and-stone grain store. Preserves the tile layout between sessions on the Farm.",
    cost: { coins: 250, wood_plank: 15 }, lv: 4, biome: "farm",
    x: 710, y: 260, w: 90, h: 100, color: "#9a6a3a" },
  { id: "barn", name: "Barn",
    desc: "Reinforced ore shed. Preserves the tile layout between sessions in the Mine.",
    cost: { coins: 400, wood_plank: 25, mine_stone: 5 }, lv: 5, biome: "mine",
    x: 840, y: 260, w: 90, h: 100, color: "#7a4a2a" },
  // Harbor-themed buildings — visual flavour for the fish biome and
  // counts toward the "Town Planner" achievement (5 distinct buildings).
  { id: "harbor_dock", name: "Harbor Dock",
    desc: "A sturdy plank-and-stone pier where the fishing dinghies tie up. Marks the village as a coastal port.",
    cost: { coins: 600, wood_plank: 30, mine_stone: 10 }, lv: 3, biome: "fish",
    x: 60, y: 150, w: 110, h: 80, color: "#3a4a78" },
  { id: "fishmonger", name: "Fishmonger",
    desc: "A salt-stained shop where the day's catch is sorted, scaled, and sold. Driver of fish-flavoured orders.",
    cost: { coins: 800, wood_plank: 30, fish_fillet: 6 }, lv: 4, biome: "fish",
    x: 210, y: 150, w: 100, h: 90, color: "#7a8aa6" },
  { id: "smokehouse", name: "Smokehouse",
    desc: "A peat-fired smoking shed that turns excess fish and meat into long-keeping rations.",
    cost: { coins: 700, wood_plank: 25, mine_stone: 15 }, lv: 4,
    x: 350, y: 150, w: 90, h: 100, color: "#5a4030" },
];

// Phase 10.1 — Workshop tool recipes (no turn cost, board animation).
// §5 lists "1 Wood" for Rake; impl uses `plank` because the §6 wood chain
// names the base tile "wood_log" and the first upgrade "wood_plank".
export const WORKSHOP_RECIPES = {
  rake:        { name: "Rake",          station: "workshop", inputs: { wood_plank: 1 },
                 effect: "clear_all", target: "grass_hay",   anim: "sweep",   ms: 300,
                 desc: "Clears all hay tiles from the board in one sweep. Used by Hilda to tidy overgrown fields." },
  axe:         { name: "Axe",          station: "workshop", inputs: { mine_stone: 1 },
                 effect: "clear_all", target: "wood_log",   anim: "chops",   ms: 200,
                 desc: "Fells all log tiles on the board instantly. Handy when the wood supply is blocking upgrades." },
  fertilizer:  { name: "Fertilizer",   station: "workshop", inputs: { grass_hay: 1, mine_dirt: 1 },
                 effect: "fill_bias", target: "grain",  anim: "shimmer", ms: 600,
                 desc: "Enriches the soil so the next board fill is biased toward grain tiles." },
  // Phase 10.5 — Cat tool (clears all rats, no turn cost)
  cat:         { name: "Cat",          station: "workshop", inputs: { mine_stone: 2, mine_dirt: 1 },
                 effect: "clear_hazard", target: "rats", anim: "scatter", ms: 200,
                 desc: "Dispatches a mouser to clear all active rat hazards from the farm in one go." },
  // Phase 10.6 — Bird Cage + full Scythe
  bird_cage:   { name: "Bird Cage",    station: "workshop", inputs: { grass_hay: 1 },
                 effect: "clear_all", target: "bird_egg",   anim: "cage",    ms: 300,
                 desc: "Sweeps all egg tiles from the board — useful when bird tiles are flooding the farm." },
  scythe_full: { name: "Scythe (full)", station: "workshop", inputs: { mine_stone: 1 },
                 effect: "clear_all", target: "grain", anim: "sweep",   ms: 300,
                 desc: "Harvests all grain tiles at once, clearing the board for a fresh fill." },
  // Phase 10.8 — Wolf counters
  rifle:       { name: "Rifle",        station: "workshop", inputs: { wood_plank: 1, mine_stone: 1, mine_ingot: 1 },
                 effect: "clear_hazard", target: "wolves", anim: "shot",    ms: 300,
                 desc: "Drives off all active wolves permanently, ending the wolf hazard immediately." },
  hound:       { name: "Hound",        station: "workshop", inputs: { bread: 1, mine_stone: 3 },
                 effect: "scatter_hazard", target: "wolves", anim: "bark", ms: 400,
                 desc: "Scares the wolves away for several turns, buying time to chain away their target tiles." },
  // Catalog §8 — additional workshop tools.
  hoe:         { name: "Hoe",          station: "workshop", inputs: { wood_plank: 1, mine_stone: 1 },
                 effect: "clear_all", target: "veg_carrot", anim: "till",   ms: 300,
                 desc: "Tills the soil — clears every veg-carrot tile from the board so a fresh fill can roll." },
  stone_hammer:{ name: "Stone Hammer", station: "workshop", inputs: { mine_stone: 2, wood_plank: 1 },
                 effect: "clear_all", target: "mine_cobble", anim: "smash", ms: 350,
                 desc: "Smashes every cobble tile on the board — a fast way to feed the chain into block tier." },
  iron_pick:   { name: "Iron Pick",    station: "workshop", inputs: { mine_ingot: 1, wood_plank: 1 },
                 effect: "clear_all", target: "mine_ore", anim: "pick",   ms: 320,
                 desc: "Bites into ore veins — clears every ore tile so the chain can be re-spawned cleanly." },
  bird_feed:   { name: "Bird Feed",    station: "workshop", inputs: { grain: 1, grass_hay: 2 },
                 effect: "fill_bias", target: "bird_egg", anim: "scatter", ms: 500,
                 desc: "Scatters feed across the field so the next board fill is biased toward bird tiles." },
  sapling:     { name: "Sapling",      station: "workshop", inputs: { wood_log: 1, grass_hay: 2 },
                 effect: "fill_bias", target: "tree_oak", anim: "shimmer", ms: 600,
                 desc: "Plants a sapling that biases the next fill toward oak (and other tree) tiles." },
};

// NOTE (balance audit, 2026-05): Several bakery recipes appear to sell for
// less than the raw market value of their inputs (e.g. bread = 125 coins for
// 3 flour + 1 egg; selling those raw nets ~370). This may be intentional
// (crafting unlocks orders/quests, not coin profit) or stale data — flagged
// for design review before any code-side rebalance. See REFERENCE_CATALOG §4.
export const RECIPES = {
  shovel:     { name: "Shovel",          inputs: { wood_plank: 1, mine_stone: 1 },          tier: 1, station: "workshop", coins: 25,
                desc: "A sturdy digging tool sold for 25 coins. Essential for farm maintenance and mine entry." },
  water_pump: { name: "Water Pump",      inputs: { wood_plank: 1, mine_stone: 1 },          tier: 2, station: "workshop", coins: 0, tool: "water_pump",
                desc: "Crafts a water pump tool that can irrigate farm tiles, boosting grain yield for one turn." },
  explosives: { name: "Explosives",      inputs: { grass_hay: 1, mine_dirt: 1 },             tier: 2, station: "workshop", coins: 0, tool: "explosives",
                desc: "Crafts a bundle of explosives that clears a 3×3 area of tiles from the mine board." },
  bread:      { name: "Bread Loaf",     inputs: { grain_flour: 3, bird_egg: 1 },            tier: 1, station: "bakery", coins: 125, glyph: "🍞", color: 0xd49060, dark: 0x7a4a28,
                desc: "A wholesome loaf baked from flour and eggs, sold for 125 coins at the Bakery." },
  honeyroll:  { name: "Honey Roll",     inputs: { grain_flour: 2, bird_egg: 1, berry_jam: 1 },   tier: 2, station: "bakery", coins: 175, glyph: "🍯", color: 0xf0c050, dark: 0x8a6010,
                desc: "A sweet honey roll glazed with jam, commanding 175 coins at market." },
  harvestpie: { name: "Harvest Pie",    inputs: { grain_flour: 2, berry_jam: 1, bird_egg: 1 },   tier: 2, station: "bakery", coins: 175, glyph: "🥧", color: 0xd4784a, dark: 0x6a3018,
                desc: "A hearty harvest pie filled with jam and egg, prized by townsfolk for 175 coins." },
  preserve:   { name: "Preserve Jar",   inputs: { berry_jam: 2, bird_egg: 1 },             tier: 1, station: "larder", coins: 100, glyph: "🫙", color: 0x9a6888, dark: 0x502848,
                desc: "Bottled berry preserves sealed with egg-white, fetching 100 coins at the Larder." },
  tincture:   { name: "Berry Tincture", inputs: { berry: 3, berry_jam: 1 },           tier: 1, station: "larder", coins: 125, glyph: "🌿", color: 0x6b8a3a, dark: 0x304018,
                desc: "A medicinal berry tincture used by Sister Liss, sold for 125 coins." },
  iron_hinge: { name: "Iron Hinge",     inputs: { mine_ingot: 2, mine_coke: 1 },          tier: 2, station: "forge",  output: "mine_ingot", coins: 175, glyph: "⚙",  color: 0x7a8a96, dark: 0x2a3a46,
                desc: "A forged iron hinge used in building construction. Story note: Bram requests these for the Caravan Post." },
  cobblepath: { name: "Cobble Path",    inputs: { mine_stone: 5, wood_plank: 2 },         tier: 1, station: "forge",  output: "mine_ingot", coins: 200, glyph: "🪨", color: 0x9a9a8a, dark: 0x404038,
                desc: "Laid cobblestones that pave trade paths, sold to caravans for 200 coins." },
  lantern:    { name: "Iron Lantern",   inputs: { mine_ingot: 1, mine_coke: 1, wood_plank: 1 },tier: 2, station: "forge",  output: "mine_ingot", coins: 150, glyph: "🏮", color: 0xd4783a, dark: 0x6a2800,
                desc: "A wrought-iron lantern that lights the evening market, selling for 150 coins." },
  goldring:   { name: "Gold Ring",      inputs: { mine_gold: 1, mine_ingot: 2 },          tier: 2, station: "forge",  output: "mine_ingot", coins: 225, glyph: "💍", color: 0xffd34c, dark: 0x886810,
                desc: "A gleaming gold ring favoured by merchants, commanding 225 coins at the forge." },
  gemcrown:   { name: "Gem Crown",      inputs: { mine_cutgem: 1, mine_gold: 2 },         tier: 2, station: "forge",  output: "mine_ingot", coins: 325, glyph: "👑", color: 0x65e5ff, dark: 0x1060a0,
                desc: "A jewelled crown set with cut gems — the Forge's most prestigious commission, worth 325 coins." },
  ironframe:  { name: "Iron Frame",     inputs: { wood_beam: 2, mine_ingot: 1 },          tier: 3, station: "forge",  output: "mine_ingot", coins: 275, glyph: "🔲", color: 0x6a7a86, dark: 0x2a3040,
                desc: "A structural iron frame used in advanced buildings and caravan reinforcement, worth 275 coins." },
  stonework:  { name: "Stonework",      inputs: { mine_block: 2, mine_coke: 1 },          tier: 3, station: "forge",  output: "mine_ingot", coins: 300, glyph: "🏗", color: 0x8a8a7a, dark: 0x383828,
                desc: "Dressed stonework for walls and facades — the final tier of Forge crafting, worth 300 coins." },
  // Phase 10.3 — snake_case aliases so tests and saves can use either form
  // Fish biome recipes — chowder (hearty soup) + bottled fish oil (tool feed).
  // Chowder is the larder-tier dish from FISH_BOARD_SCOPE.md; fish oil is a
  // direct one-step refinery so kelp chains have a sale path beyond the
  // chain product itself.
  chowder:    { name: "Chowder",        inputs: { fish_fillet: 2, milk: 1, veg_carrot: 1 },         tier: 2, station: "larder", coins: 280, glyph: "🍲", color: 0xd4b888, dark: 0x6a503a,
                desc: "A creamy seafood chowder thick with fillet, milk, and root vegetables. Larder favourite at 280 coins." },
  fish_oil_bottled: { name: "Fish Oil (Bottled)", inputs: { fish_oil: 1, wood_plank: 1 },        tier: 1, station: "workshop", coins: 80, glyph: "💧", color: 0xe8d050, dark: 0x7a6018,
                desc: "Refined kelp-and-fish oil sealed in a corked plank flask. Used by tinkers and tar-mongers, worth 80 coins." },
  iron_frame: null, // resolved below
  gem_crown:  null,
  gold_ring:  null,
};
// Merge WORKSHOP_RECIPES into RECIPES so all 11 workshop recipes are top-level entries.
// (Previously they lived only in WORKSHOP_RECIPES; the crafting screen's
// Object.entries(RECIPES).filter(station==="workshop") would only see 3.)
Object.assign(RECIPES, WORKSHOP_RECIPES);

// Resolve snake_case aliases to the same objects (no data duplication)
RECIPES.iron_frame = RECIPES.ironframe;
RECIPES.gem_crown  = RECIPES.gemcrown;
RECIPES.gold_ring  = RECIPES.goldring;

// Phase 10.1 — RECIPES.tools aliases WORKSHOP_RECIPES for backwards compat
RECIPES.tools = WORKSHOP_RECIPES;

export const MARKET_PRICES = {
  grass_hay:    { buy: 40,  sell: 0  },
  grain_wheat:  { buy: 60,  sell: 2  },
  grain:  { buy: 80,  sell: 4  },
  grain_flour:  { buy: 100, sell: 6  },
  wood_log:    { buy: 60,  sell: 2  },
  wood_plank:  { buy: 80,  sell: 4  },
  wood_beam:   { buy: 110, sell: 7  },
  berry:  { buy: 70,  sell: 3  },
  berry_jam:    { buy: 90,  sell: 5  },
  bird_egg:    { buy: 70,  sell: 3  },
  mine_stone:  { buy: 50,  sell: 1  },
  mine_cobble: { buy: 70,  sell: 3  },
  mine_block:  { buy: 100, sell: 6  },
  mine_ore:    { buy: 70,  sell: 3  },
  mine_ingot:  { buy: 100, sell: 6  },
  mine_coal:   { buy: 60,  sell: 2  },
  mine_coke:   { buy: 80,  sell: 4  },
  mine_gem:    { buy: 120, sell: 7  },
  mine_cutgem: { buy: 200, sell: 14 },
  mine_gold:   { buy: 100, sell: 5  },
  soup:   { buy: 220, sell: 20 },
  // Phase: wire-all-chains — terminal products from REFERENCE_CATALOG §4.
  pie:       { buy: 840,  sell: 90  },
  honey:     { buy: 1500, sell: 300 },
  meat:      { buy: 240,  sell: 21  },
  milk:      { buy: 900,  sell: 100 },
  horseshoe: { buy: 1600, sell: 400 },
  // Eggs (plural) is the terminal product of bird chains — distinct from
  // `egg` (singular), which is a default bird tile.
  eggs:      { buy: 80,   sell: 5   },
  bread:     { buy: 60,   sell: 4   },
  // Fish biome — buy/sell pairs follow the same ~10× ratio as the rest
  // of MARKET_PRICES. Drift logic in features/market expects both columns
  // populated (buy: 0 would violate the ±15% drift bound).
  fish_raw:         { buy: 80,   sell: 4   },
  fish_fillet:      { buy: 200,  sell: 12  },
  fish_oil:         { buy: 100,  sell: 8   },
  fish_oil_bottled: { buy: 600,  sell: 80  },
  chowder:          { buy: 2400, sell: 280 },
};

// LEGACY — only used by features/quests/slice.js's `dailies` system. The
// canonical seasonal-quest pool lives in features/quests/templates.js with
// a different shape (category/min/max). Don't mix the two; consumers should
// import from the feature module unless they specifically want the legacy
// dailies pool.
export const QUEST_TEMPLATES = [
  { key: "harvest", label: "Harvest 30 hay", target: 30, reward: { coins: 50, almanacXp: 20 } },
  { key: "chain5",  label: "Make 3 chains of 5+", target: 3, reward: { coins: 75, almanacXp: 30 } },
  { key: "deliver", label: "Deliver 4 orders", target: 4, reward: { coins: 60, almanacXp: 25 } },
  { key: "build",   label: "Build 1 building", target: 1, reward: { coins: 100, almanacXp: 40 } },
  { key: "craft",   label: "Craft 2 recipes", target: 2, reward: { coins: 80, almanacXp: 35 } },
  { key: "coins",   label: "Earn 200 coins this season", target: 200, reward: { coins: 50, almanacXp: 20 } },
];

// ─── Phase 4 — Inventory soft caps ───────────────────────────────────────────
export const RESOURCE_CAP_BASE = 200;
export const RESOURCE_CAP_GRANARY = 500;
/** Raw farm + mine resources subject to the inventory cap. */
export const CAPPED_RESOURCES = ["grass_hay","grain_wheat","grain","grain_flour","wood_log","wood_plank",
  "wood_beam","berry","berry_jam","bird_egg","mine_stone","mine_ore","mine_coal",
  "veg_carrot","veg_eggplant","veg_turnip","veg_beet","veg_cucumber","veg_squash","veg_mushroom","veg_pepper","veg_broccoli","soup",
  // Catalog-import placeholders.
  "grass_heather",
  "grain_corn","grain_buckwheat","grain_manna","grain_rice",
  "fruit_apple","fruit_pear","fruit_golden_apple","fruit_blackberry",
  "fruit_rambutan","fruit_starfruit","fruit_coconut","fruit_lemon","fruit_jackfruit",
  "flower_pansy","flower_water_lily",
  "tree_oak","tree_birch","tree_willow","tree_fir","tree_cypress","tree_palm",
  "bird_pheasant","bird_chicken","bird_hen","bird_rooster","bird_wild_goose","bird_goose",
  "bird_parrot","bird_phoenix","bird_dodo","bird_pig_in_disguise",
  "herd_pig","herd_hog","herd_boar","herd_warthog",
  "herd_sheep","herd_alpaca","herd_goat","herd_ram",
  "cattle_cow","cattle_longhorn","cattle_triceratops",
  "mount_horse","mount_donkey","mount_moose","mount_mammoth",
  // Phase: wire-all-chains — terminal products.
  "pie","honey","meat","milk","horseshoe","eggs","bread"];

// ─── Phase 3 Economy ──────────────────────────────────────────────────────────

/** Mine entry pricing tiers (§7). */
export const MINE_ENTRY_TIERS = [
  { id: "free",    supplies: 3,               label: "Standard" },
  { id: "better",  coins: 100, shovels: 10,   label: "Better"   },
  { id: "premium", runes: 2,                  label: "Premium"  },
];

/** Harbor (fish biome) entry pricing tiers — mirrors MINE_ENTRY_TIERS. */
export const HARBOR_ENTRY_TIERS = [
  // "Standard" charters a small dinghy with 3 planks of lumber for the
  // pier repair tax. Free of coins; matches mine "free" tier shape.
  { id: "free",    wood_plank: 3,                       label: "Standard" },
  // "Charter" pays the harbourmaster + tackle for an extended trip —
  // +2 turns. Mirrors mine's "better" 100◉ + supplies tier.
  { id: "better",  coins: 150, wood_plank: 5,           label: "Charter"  },
  // "Premium" hires a deepwater navigator for a single rune. Standard turns.
  { id: "premium", runes: 2,                            label: "Premium"  },
];

/** Daily login-streak reward ladder (GAME_SPEC §16 — locked). */
export const DAILY_REWARDS = {
  1:  { coins: 25 },
  2:  { coins: 50 },
  3:  { tool: "basic",   amount: 1 },
  4:  { coins: 75 },
  5:  { tool: "rare",    amount: 1 },
  7:  { coins: 150, tool: "shuffle", amount: 1 },
  8:  { coins: 60 },  9: { coins: 70 },  10: { coins: 80 },
  11: { coins: 90 }, 12: { coins: 100 }, 13: { coins: 120 },
  14: { coins: 300, runes: 1 },
  15: { coins: 100 }, 16: { coins: 110 }, 17: { coins: 120 },
  18: { coins: 130 }, 19: { coins: 140 }, 20: { coins: 160 },
  21: { coins: 180 }, 22: { coins: 200 }, 23: { coins: 220 },
  24: { coins: 240 }, 25: { coins: 260 }, 26: { coins: 280 },
  27: { coins: 300 }, 28: { coins: 350 }, 29: { coins: 400 },
  30: { coins: 1000, runes: 3, unlockTile: "cattle_triceratops" },
};

// ─── Phase 10 — Tile pool seasonal modifiers ──────────────────────────────────
// Applied additively on BIOMES.farm.pool. Locked: ONLY spawn weights.
// (Calendar-season effects were removed in Phase 7 — see top of file.)
export const SEASON_POOL_MODS = {
  Spring: { berry: +1 },
  Summer: { grain_wheat: +1 },
  Autumn: { wood_log:   +2 },
  Winter: { mine_stone: +1, grass_hay: -1 },
};

// ─── Phase 10.4 — Rat hazard constants ────────────────────────────────────────
export const RAT_SPAWN_THRESHOLDS = {
  grass_hay:         50,
  grain_wheat:       50,
  perFillRate: 0.10,
  maxActive:   4,
};
export const RAT_CLEAR_REWARD_PER = 5;

// ─── Phase 11.1 — Color-blind palettes ───────────────────────────────────────
// The `default` palette reads back from BIOMES + SEASONS to guarantee zero
// visual drift versus the Phase 0–10 hex baseline.
const _defaultTiles = Object.fromEntries(
  [...BIOMES.farm.resources, ...BIOMES.mine.resources, ...BIOMES.fish.resources].map((r) => [r.key, r.color]),
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
      grass_hay:    0xf0d860, grass_meadow: 0x88d048, grass_spiky: 0xb0c850,
      grain_wheat:  0xd4b040, grain:  0xb08828, grain_flour:  0xf4ecd0,
      wood_log:    0x9a6e30, wood_plank:  0xc49050, wood_beam:   0x6a4218,
      berry:  0x1a003a, berry_jam:    0x4a1060,
      bird_egg:    0xf0e8c8, bird_turkey: 0xc06820, bird_clover: 0x70b048, bird_melon: 0xc8e060,
      mine_stone:  0x9da3a8, mine_cobble: 0xbbc1c6, mine_block:  0x7c8388,
      mine_ore:    0xe89040, mine_ingot:  0xf8d880,
      mine_coal:   0x1a1a1a, mine_coke:   0x505060,
      mine_gem:    0x50d8f8, mine_cutgem: 0xa0f0ff, mine_gold:   0xffd34c,
      mine_dirt:   0x7a6850,
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
      grass_hay:    0xffe060, grass_meadow: 0xa0d850, grass_spiky: 0xc8d058,
      grain_wheat:  0xf0c840, grain:  0xd0a020, grain_flour:  0xf8f0e0,
      wood_log:    0xb05018, wood_plank:  0xd07838, wood_beam:   0x783010,
      berry:  0x001050, berry_jam:    0x002888,
      bird_egg:    0xf0e8d0, bird_turkey: 0xc06028, bird_clover: 0x80b860, bird_melon: 0xd8e878,
      mine_stone:  0x9da3a8, mine_cobble: 0xbbc1c6, mine_block:  0x7c8388,
      mine_ore:    0xa0c8e8, mine_ingot:  0xd8f0ff,
      mine_coal:   0x0a1020, mine_coke:   0x283848,
      mine_gem:    0x60e0f8, mine_cutgem: 0xb0f4ff, mine_gold:   0xffd34c,
      mine_dirt:   0x7a6850,
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
      grass_hay:    0xfff070, grass_meadow: 0x90c850, grass_spiky: 0xb8c058,
      grain_wheat:  0xf0d850, grain:  0xd0b030, grain_flour:  0xfcf4e0,
      wood_log:    0xb47030, wood_plank:  0xd49050, wood_beam:   0x7a4818,
      berry:  0x1a003a, berry_jam:    0x48006c,
      bird_egg:    0xf4ecd8, bird_turkey: 0xc06820, bird_clover: 0x80b048, bird_melon: 0xc8d870,
      mine_stone:  0x9da3a8, mine_cobble: 0xbbc1c6, mine_block:  0x7c8388,
      mine_ore:    0xe08820, mine_ingot:  0xf8d060,
      mine_coal:   0x0c0c14, mine_coke:   0x303040,
      mine_gem:    0x50d0f0, mine_cutgem: 0xa8f0ff, mine_gold:   0xffd34c,
      mine_dirt:   0x7a6850,
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

// ─── Balance-Manager overrides ─────────────────────────────────────────────
// The committed `src/config/balance.json` file is merged onto the constants
// above at module-load time. A localStorage draft (written by the in-game
// Balance Manager) is layered on top so designers can preview changes
// without committing. Both layers are optional — the defaults above remain
// the source of truth in production builds when balance.json is empty.
import balanceFile from "./config/balance.json";
import {
  mergeOverrides,
  readBalanceDraft,
  applyUpgradeThresholdOverrides,
  applyResourceOverrides,
  applyRecipeOverrides,
  applyBuildingOverrides,
} from "./config/applyOverrides.js";

export const BALANCE_OVERRIDES = mergeOverrides(balanceFile, readBalanceDraft());

applyUpgradeThresholdOverrides(UPGRADE_THRESHOLDS, BALANCE_OVERRIDES.upgradeThresholds);
applyResourceOverrides(BIOMES, BALANCE_OVERRIDES.resources);
applyRecipeOverrides(RECIPES, BALANCE_OVERRIDES.recipes);
applyBuildingOverrides(BUILDINGS, BALANCE_OVERRIDES.buildings);

// Recompute tile palette so default-palette renders pick up any color overrides.
for (const r of [...BIOMES.farm.resources, ...BIOMES.mine.resources, ...BIOMES.fish.resources]) {
  if (PALETTES.default.tiles[r.key] !== r.color) {
    PALETTES.default.tiles[r.key] = r.color;
  }
}
