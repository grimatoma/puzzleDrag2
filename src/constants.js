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
export let MAX_TURNS = 10;            // Balance Manager: tuning.maxTurns

// Phase 3 — audit-boss cadence. Once the Frostmaw story flag is set, an audit
// boss reappears on a real-time cooldown of this many days (tunable). No
// in-game calendar is involved — it tracks wall-clock elapsed time.
export let AUDIT_BOSS_COOLDOWN_DAYS = 3; // Balance Manager: tuning.auditBossCooldownDays

// Phase 5 — real-time crafting queue (alongside the instant CRAFT_RECIPE). A
// queued craft is ready this many wall-clock hours after it's queued; spending
// CRAFT_GEM_SKIP_COST gems finishes it instantly. Both tunable.
export let CRAFT_QUEUE_HOURS = 4;       // Balance Manager: tuning.craftQueueHours
export let CRAFT_GEM_SKIP_COST = 1;     // Balance Manager: tuning.craftGemSkipCost

// Phase 5 — expedition rations (master doc §VI). Mine/Harbor rounds are
// supply-structured: you bring food before the round, each unit is worth this
// many base turns, and buildings/NPC-bonds bump it (see expeditionTurnsForFood
// in features/zones/data.js). Tunable. `cured_meat` / `festival_loaf` /
// `wedding_pie` / `iron_ration` are forward-declared here — those recipes don't
// exist in the resource pipeline yet; they'll be added with the round flow
// (Phase 5d). `fruit_apple` and `bread` are the live keys today.
// Not frozen — `applyExpeditionOverrides` (Balance Manager) mutates this in place.
export const EXPEDITION_FOOD_TURNS = {
  supplies:      1,
  fruit_apple:   1,
  bread:         1,
  cured_meat:    2,
  festival_loaf: 2,
  wedding_pie:   3,
  iron_ration:   4,
};
// Foods the Smokehouse's "+1 to meat-based foods" modifier applies to.
// Not frozen — replaced/edited via `applyExpeditionOverrides`.
export const EXPEDITION_MEAT_FOODS = ["cured_meat"];
// An expedition needs at least this many turns of food packed before you can
// set out (Phase 5d). Tunable.
export let MIN_EXPEDITION_TURNS = 3;    // Balance Manager: tuning.minExpeditionTurns

// Phase 5e — settlement biomes (master doc §IV). A biome is chosen at founding
// and fixes the two hazards that appear in every round at that settlement, plus
// a resource bonus. Keyed by settlement type. Each entry:
//   { id, name, icon, hazards: [a, b], bonus }
// The `bonus` is descriptive for now — not yet a mechanical spawn multiplier.
export const SETTLEMENT_BIOMES = Object.freeze({
  farm: [
    { id: "prairie",  name: "Prairie",  icon: "🌾", hazards: ["fire", "locusts"],    bonus: "grain yield" },
    { id: "forest",   name: "Forest",   icon: "🌲", hazards: ["wolves", "fungus"],   bonus: "wood & herbs" },
    { id: "marsh",    name: "Marsh",    icon: "🪷", hazards: ["poison", "flooding"], bonus: "rare herbs" },
    { id: "highland", name: "Highland", icon: "⛰️", hazards: ["frost", "rockslide"], bonus: "livestock & hardy crops" },
  ],
  mine: [
    { id: "mountain",  name: "Mountain",  icon: "🏔️", hazards: ["cave_in", "gas_pocket"], bonus: "iron & stone" },
    { id: "tundra",    name: "Tundra",    icon: "❄️", hazards: ["frost", "ice_spike"],     bonus: "gems" },
    { id: "volcanic",  name: "Volcanic",  icon: "🌋", hazards: ["lava", "ash_cloud"],      bonus: "rare metals" },
    { id: "deep_cave", name: "Deep Cave", icon: "🦇", hazards: ["bats", "sinkhole"],       bonus: "crystals & runes" },
  ],
  harbor: [
    { id: "coastal",  name: "Coastal",  icon: "🌊", hazards: ["storm", "shark"],         bonus: "standard fish" },
    { id: "coral",    name: "Coral",    icon: "🪸", hazards: ["jellyfish", "riptide"],    bonus: "pearls" },
    { id: "arctic",   name: "Arctic",   icon: "🧊", hazards: ["iceberg", "frostbite"],    bonus: "exotic catches" },
    { id: "tropical", name: "Tropical", icon: "🏝️", hazards: ["cyclone", "sea_monster"], bonus: "spices & trade goods" },
  ],
});
// The biome `home` is treated as (it's pre-founded, never goes through the picker).
export let DEFAULT_HOME_BIOME = "prairie"; // Balance Manager: tuning.homeBiome

// Save schema version. Forward migrations are not maintained — bump this
// whenever persisted state changes shape and existing saves will be discarded.
export const SAVE_SCHEMA_VERSION = 35;

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
  { name: "Spring", iconKey: "ui_star", bg: 0x7dbd48, fill: 0x8fd85a, accent: 0x5daa35 },
  { name: "Summer", iconKey: "ui_star", bg: 0x8fca45, fill: 0xf6c342, accent: 0xe3a92f },
  { name: "Autumn", iconKey: "ui_star", bg: 0xb77b3a, fill: 0xd9792d, accent: 0xa65722 },
  { name: "Winter", iconKey: "ui_star", bg: 0x78aaca, fill: 0x91d9ff, accent: 0xd9f6ff },
];

// Farm board tile pool. Each entry is one slot in the random fill rotation.
// Per-category counts intentionally weighted: the grass staple gets extra
// slots; new chain categories get one each so the player sees them without
// the board becoming chain-impossible at 6×6 = 36 cells. (wood and berry
// are resources/items, not tile species — see BIOMES.farm.resources.)
export const FARM_TILE_POOL = [
  "grass_hay", "grass_hay", "grass_hay",
  "grain_wheat",
  "bird_pheasant",
  "veg_carrot",
  "fruit_apple",
  "flower_pansy",
  "tree_oak",
  "herd_pig",
  "cattle_cow",
  "mount_horse",
  // Bird category slot uses pheasant as pool key; alternate bird species are
  // activated via the species-activation pipeline rather than additional pool slots.
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

export const ITEMS = {
  // Farm tiles/resources
  grass_hay:          { kind: "tile", biome: "farm", label: "Hay",          color: 0xa8c769, dark: 0x4f6b3a, value: 1, next: "grain_wheat", sway: { amp: 4.0, freq: 0.00060, gust: 0.20 } },
  grass_meadow:       { kind: "tile", biome: "farm", label: "Meadow Grass", color: 0x7fb24a, dark: 0x3e5a18, value: 1, next: "grain_wheat", sway: { amp: 4.5, freq: 0.00058, gust: 0.22 } },
  grass_spiky:        { kind: "tile", biome: "farm", label: "Spiky Grass",  color: 0x9bb55a, dark: 0x4a5e1c, value: 1, next: "grain_wheat", sway: { amp: 2.5, freq: 0.00075, gust: 0.18 } },
  grain_wheat:        { kind: "tile", biome: "farm", label: "Wheat", color: 0xdab947, dark: 0x7e5e1a, value: 2, next: "grain", sway: { amp: 5.0, freq: 0.00065, gust: 0.22 } },
  grain:              { kind: "resource", biome: "farm", label: "Grain", color: 0xc8923a, dark: 0x5e3e10, value: 4, next: "grain_flour", sway: { amp: 1.2, freq: 0.00035, gust: 0.08 } },
  grain_flour:        { kind: "resource", biome: "farm", label: "Flour", color: 0xf4e3c0, dark: 0x8a6a3a, value: 6, next: "bread" },
  wood_log:           { kind: "resource", biome: "farm", label: "Log",   color: 0x9b6b3e, dark: 0x5e3a1d, value: 2, next: "wood_plank" },
  wood_plank:         { kind: "resource", biome: "farm", label: "Plank", color: 0xc98c50, dark: 0x5e3a1d, value: 4, next: "wood_beam" },
  wood_beam:          { kind: "resource", biome: "farm", label: "Beam",  color: 0x7e4f24, dark: 0x3a1d10, value: 7, next: null },
  berry:              { kind: "resource", biome: "farm", label: "Berry", color: 0xa3486a, dark: 0x5e1a3a, value: 3, next: "berry_jam", sway: { amp: 3.5, freq: 0.00090, gust: 0.15 } },
  berry_jam:          { kind: "resource", biome: "farm", label: "Jam",   color: 0xd4658c, dark: 0x7a2f50, value: 5, next: null },
  bird_egg:           { kind: "resource", biome: "farm", label: "Egg",   color: 0xf4ecd8, dark: 0x8a785e, value: 3, next: "eggs", sway: { amp: 1.5, freq: 0.00055, gust: 0.08 } },
  bird_turkey:        { kind: "tile", biome: "farm", label: "Turkey", color: 0xb8743a, dark: 0x5e3818, value: 4, next: "eggs", sway: { amp: 1.2, freq: 0.00050, gust: 0.10 } },
  bird_clover:        { kind: "tile", biome: "farm", label: "Clover", color: 0x6fa450, dark: 0x365e22, value: 5, next: "honey", sway: { amp: 2.5, freq: 0.00080, gust: 0.18 } },
  bird_melon:         { kind: "tile", biome: "farm", label: "Melon",  color: 0xb3d770, dark: 0x4a6e2a, value: 6, next: "eggs", sway: { amp: 0.8, freq: 0.00030, gust: 0.05 } },
  veg_carrot:         { kind: "tile", biome: "farm", label: "Carrot",   color: 0xe88439, dark: 0x7a3e10, value: 4, next: "soup", sway: { amp: 2.0, freq: 0.00050, gust: 0.10 } },
  veg_eggplant:       { kind: "tile", biome: "farm", label: "Eggplant", color: 0x6b3a8a, dark: 0x301848, value: 4, next: "soup", sway: { amp: 1.8, freq: 0.00048, gust: 0.08 } },
  veg_turnip:         { kind: "tile", biome: "farm", label: "Turnip",   color: 0xd87aa0, dark: 0x6e2a4a, value: 4, next: "soup", sway: { amp: 1.6, freq: 0.00050, gust: 0.08 } },
  veg_beet:           { kind: "tile", biome: "farm", label: "Beet",     color: 0x6b1a3a, dark: 0x300818, value: 4, next: "soup", sway: { amp: 1.5, freq: 0.00046, gust: 0.07 } },
  veg_cucumber:       { kind: "tile", biome: "farm", label: "Cucumber", color: 0x4f8c3a, dark: 0x224018, value: 4, next: "soup", sway: { amp: 2.4, freq: 0.00056, gust: 0.10 } },
  veg_squash:         { kind: "tile", biome: "farm", label: "Squash",   color: 0xe6c14a, dark: 0x7a5e10, value: 4, next: "soup", sway: { amp: 1.7, freq: 0.00048, gust: 0.08 } },
  veg_mushroom:       { kind: "tile", biome: "farm", label: "Mushroom", color: 0xc63a3a, dark: 0x601818, value: 4, next: "soup", sway: { amp: 1.5, freq: 0.00044, gust: 0.06 } },
  veg_pepper:         { kind: "tile", biome: "farm", label: "Pepper",   color: 0xd83a3a, dark: 0x6e1818, value: 4, next: "soup", sway: { amp: 2.2, freq: 0.00054, gust: 0.10 } },
  veg_broccoli:       { kind: "tile", biome: "farm", label: "Broccoli", color: 0x4a8a3a, dark: 0x1e3e18, value: 4, next: "soup", sway: { amp: 3.0, freq: 0.00060, gust: 0.12 } },
  soup:               { kind: "resource", biome: "farm", label: "Soup",     color: 0xc46a2f, dark: 0x6e3a18, value: 20, next: null },
  pie:                { kind: "resource", biome: "farm", label: "Pie",       color: 0xb05428, dark: 0x582818, value: 90,  next: null },
  honey:              { kind: "resource", biome: "farm", label: "Honey",     color: 0xe8a020, dark: 0x745010, value: 300, next: null },
  meat:               { kind: "resource", biome: "farm", label: "Meat",      color: 0xc44848, dark: 0x682424, value: 21,  next: null },
  milk:               { kind: "resource", biome: "farm", label: "Milk",      color: 0xfaf6ec, dark: 0x807e74, value: 100, next: null },
  horseshoe:          { kind: "resource", biome: "farm", label: "Horseshoe", color: 0x8a8a90, dark: 0x46464a, value: 400, next: null },
  eggs:               { kind: "resource", biome: "farm", label: "Eggs",      color: 0xf8efd0, dark: 0x807660, value: 5, next: null },
  bread:              { kind: "resource", biome: "farm", label: "Bread Loaf", color: 0xd49060, dark: 0x7a4a28, value: 125, next: null, desc: "A wholesome loaf baked from flour and eggs, sold for 125 coins at the Bakery." },

  grass_heather:      { kind: "tile", biome: "farm", label: "Heather",      color: 0x7a4f8a, dark: 0x3a2548, value: 1, next: null, sway: { amp: 2.5, freq: 0.00060, gust: 0.10 } },
  grain_corn:         { kind: "tile", biome: "farm", label: "Corn",         color: 0xf4c84a, dark: 0x7a6020, value: 1, next: null, sway: { amp: 4.0, freq: 0.00060, gust: 0.18 } },
  grain_buckwheat:    { kind: "tile", biome: "farm", label: "Buckwheat",    color: 0x9ab548, dark: 0x4a5820, value: 1, next: null, sway: { amp: 3.5, freq: 0.00058, gust: 0.16 } },
  grain_manna:        { kind: "tile", biome: "farm", label: "Manna",        color: 0xf8e8c0, dark: 0x7a6e58, value: 1, next: null, sway: { amp: 1.5, freq: 0.00040, gust: 0.06 } },
  grain_rice:         { kind: "tile", biome: "farm", label: "Rice",         color: 0xc8d878, dark: 0x60683c, value: 1, next: null, sway: { amp: 3.0, freq: 0.00056, gust: 0.14 } },
  fruit_apple:        { kind: "tile", biome: "farm", label: "Apple",        color: 0xd4543a, dark: 0x6a2a18, value: 1, next: "pie", sway: { amp: 1.2, freq: 0.00040, gust: 0.06 } },
  fruit_pear:         { kind: "tile", biome: "farm", label: "Pear",         color: 0xbcc436, dark: 0x5e6018, value: 1, next: "pie", sway: { amp: 1.2, freq: 0.00040, gust: 0.06 } },
  fruit_golden_apple: { kind: "tile", biome: "farm", label: "Golden Apple", color: 0xf4c430, dark: 0x7a6010, value: 1, next: "pie", sway: { amp: 1.2, freq: 0.00040, gust: 0.06 } },
  fruit_blackberry:   { kind: "tile", biome: "farm", label: "Blackberry",   color: 0x3a1a4a, dark: 0x180a20, value: 1, next: "pie", sway: { amp: 1.0, freq: 0.00038, gust: 0.05 } },
  fruit_rambutan:     { kind: "tile", biome: "farm", label: "Rambutan",     color: 0xd8344a, dark: 0x6a1820, value: 1, next: "pie", sway: { amp: 1.4, freq: 0.00042, gust: 0.07 } },
  fruit_starfruit:    { kind: "tile", biome: "farm", label: "Starfruit",    color: 0xe8c83c, dark: 0x726018, value: 1, next: "pie", sway: { amp: 1.0, freq: 0.00040, gust: 0.05 } },
  fruit_coconut:      { kind: "tile", biome: "farm", label: "Coconut",      color: 0x5e3a14, dark: 0x2e1c08, value: 1, next: "pie", sway: { amp: 0.8, freq: 0.00030, gust: 0.04 } },
  fruit_lemon:        { kind: "tile", biome: "farm", label: "Lemon",        color: 0xf4d030, dark: 0x7a6818, value: 1, next: "pie", sway: { amp: 1.2, freq: 0.00042, gust: 0.06 } },
  fruit_jackfruit:    { kind: "tile", biome: "farm", label: "Jackfruit",    color: 0xa8a040, dark: 0x52501c, value: 1, next: "pie", sway: { amp: 1.0, freq: 0.00038, gust: 0.05 } },
  flower_pansy:       { kind: "tile", biome: "farm", label: "Pansy",        color: 0x7a3aa8, dark: 0x3c1c54, value: 1, next: "honey", sway: { amp: 2.6, freq: 0.00070, gust: 0.14 } },
  flower_water_lily:  { kind: "tile", biome: "farm", label: "Water Lily",   color: 0xe890c0, dark: 0x70486a, value: 1, next: "honey", sway: { amp: 0.8, freq: 0.00026, gust: 0.04 } },
  tree_oak:           { kind: "tile", biome: "farm", label: "Oak",          color: 0x3a6818, dark: 0x1a3008, value: 1, next: "wood_log", sway: { amp: 1.6, freq: 0.00030, gust: 0.10 } },
  tree_birch:         { kind: "tile", biome: "farm", label: "Birch",        color: 0xa8c038, dark: 0x546018, value: 1, next: "wood_log", sway: { amp: 2.2, freq: 0.00034, gust: 0.12 } },
  tree_willow:        { kind: "tile", biome: "farm", label: "Willow",       color: 0x5a8a18, dark: 0x2a4008, value: 1, next: "wood_log", sway: { amp: 3.0, freq: 0.00038, gust: 0.18 } },
  tree_fir:           { kind: "tile", biome: "farm", label: "Fir",          color: 0x2a5008, dark: 0x142404, value: 1, next: "wood_log", sway: { amp: 0.6, freq: 0.00024, gust: 0.04 } },
  tree_cypress:       { kind: "tile", biome: "farm", label: "Cypress",      color: 0x1a3a08, dark: 0x0a1804, value: 1, next: "wood_log", sway: { amp: 0.4, freq: 0.00020, gust: 0.02 } },
  tree_palm:          { kind: "tile", biome: "farm", label: "Palm Tree",    color: 0x5a8a18, dark: 0x2a4008, value: 1, next: "wood_log", sway: { amp: 2.8, freq: 0.00040, gust: 0.16 } },
  bird_pheasant:      { kind: "tile", biome: "farm", label: "Pheasant",     color: 0x8a4a18, dark: 0x44230a, value: 1, next: "eggs", sway: { amp: 1.0, freq: 0.00040, gust: 0.05 } },
  bird_chicken:       { kind: "tile", biome: "farm", label: "Chicken",      color: 0xf0d8a0, dark: 0x786a48, value: 1, next: "eggs", sway: { amp: 1.0, freq: 0.00040, gust: 0.05 } },
  bird_hen:           { kind: "tile", biome: "farm", label: "Hen",          color: 0xa86838, dark: 0x52321a, value: 1, next: "eggs", sway: { amp: 1.0, freq: 0.00040, gust: 0.05 } },
  bird_rooster:       { kind: "tile", biome: "farm", label: "Rooster",      color: 0xd81818, dark: 0x6a0a0a, value: 1, next: "eggs", sway: { amp: 1.2, freq: 0.00044, gust: 0.06 } },
  bird_wild_goose:    { kind: "tile", biome: "farm", label: "Wild Goose",   color: 0xa89878, dark: 0x524a3a, value: 1, next: "eggs", sway: { amp: 1.2, freq: 0.00044, gust: 0.06 } },
  bird_goose:         { kind: "tile", biome: "farm", label: "Goose",        color: 0xfffce8, dark: 0x807e74, value: 1, next: "eggs", sway: { amp: 1.2, freq: 0.00044, gust: 0.06 } },
  bird_parrot:        { kind: "tile", biome: "farm", label: "Parrot",       color: 0xd81818, dark: 0x6a0a0a, value: 1, next: "eggs", sway: { amp: 1.4, freq: 0.00046, gust: 0.07 } },
  bird_phoenix:       { kind: "tile", biome: "farm", label: "Phoenix",      color: 0xf8a020, dark: 0x7c500e, value: 1, next: "eggs", sway: { amp: 1.6, freq: 0.00050, gust: 0.10 } },
  bird_dodo:          { kind: "tile", biome: "farm", label: "Dodo",         color: 0xa89878, dark: 0x524a3a, value: 1, next: "eggs", sway: { amp: 0.8, freq: 0.00036, gust: 0.04 } },
  bird_pig_in_disguise: { kind: "tile", biome: "farm", label: "Pig in Disguise", color: 0xe88a98, dark: 0x72424a, value: 1, next: "eggs", sway: { amp: 0.8, freq: 0.00036, gust: 0.04 } },
  herd_pig:           { kind: "tile", biome: "farm", label: "Pig",          color: 0xe88a98, dark: 0x72424a, value: 1, next: "meat", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
  herd_hog:           { kind: "tile", biome: "farm", label: "Hog",          color: 0xa87838, dark: 0x523a1a, value: 1, next: "meat", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
  herd_boar:          { kind: "tile", biome: "farm", label: "Boar",         color: 0x241408, dark: 0x100804, value: 1, next: "meat", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
  herd_warthog:       { kind: "tile", biome: "farm", label: "Warthog",      color: 0x5a4828, dark: 0x2c2412, value: 1, next: "meat", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
  herd_sheep:         { kind: "tile", biome: "farm", label: "Sheep",        color: 0xfffce8, dark: 0x807e74, value: 1, next: "meat", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
  herd_alpaca:        { kind: "tile", biome: "farm", label: "Alpaca",       color: 0xf8e8c8, dark: 0x7c7264, value: 1, next: "meat", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
  herd_goat:          { kind: "tile", biome: "farm", label: "Goat",         color: 0xd8c098, dark: 0x6c604a, value: 1, next: "meat", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
  herd_ram:           { kind: "tile", biome: "farm", label: "Ram",          color: 0xa87838, dark: 0x523a1a, value: 1, next: "meat", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
  cattle_cow:         { kind: "tile", biome: "farm", label: "Cow",          color: 0xfffce8, dark: 0x807e74, value: 1, next: "milk", sway: { amp: 0.4, freq: 0.00022, gust: 0.03 } },
  cattle_longhorn:    { kind: "tile", biome: "farm", label: "Longhorn",     color: 0xd89048, dark: 0x6a4820, value: 1, next: "milk", sway: { amp: 0.4, freq: 0.00022, gust: 0.03 } },
  cattle_triceratops: { kind: "tile", biome: "farm", label: "Triceratops",  color: 0x5a8a28, dark: 0x2c4414, value: 1, next: "milk", sway: { amp: 0.4, freq: 0.00022, gust: 0.03 } },
  mount_horse:        { kind: "tile", biome: "farm", label: "Horse",        color: 0xa86838, dark: 0x52321a, value: 1, next: "horseshoe", sway: { amp: 0.4, freq: 0.00022, gust: 0.03 } },
  mount_donkey:       { kind: "tile", biome: "farm", label: "Donkey",       color: 0x8a8478, dark: 0x44423a, value: 1, next: "horseshoe", sway: { amp: 0.4, freq: 0.00022, gust: 0.03 } },
  mount_moose:        { kind: "tile", biome: "farm", label: "Moose",        color: 0x5a3814, dark: 0x2c1c0a, value: 1, next: "horseshoe", sway: { amp: 0.4, freq: 0.00022, gust: 0.03 } },
  mount_mammoth:      { kind: "tile", biome: "farm", label: "Mammoth",      color: 0xa87838, dark: 0x523a1a, value: 1, next: "horseshoe", sway: { amp: 0.4, freq: 0.00022, gust: 0.03 } },

  // Mine tiles/resources
  mine_stone:  { kind: "tile", biome: "mine", label: "Stone",  color: 0x9da3a8, dark: 0x3e4348, value: 1,  next: "mine_cobble" },
  mine_cobble: { kind: "resource", biome: "mine", label: "Cobble", color: 0xbbc1c6, dark: 0x4e5358, value: 3,  next: "mine_block" },
  mine_block:  { kind: "resource", biome: "mine", label: "Block",  color: 0x7c8388, dark: 0x2a2e32, value: 6,  next: null },
  mine_ore:    { kind: "tile", biome: "mine", label: "Ore",    color: 0xb6a3a3, dark: 0x5e4040, value: 3,  next: "mine_ingot", sway: { amp: 0.4, freq: 0.00020, gust: 0.00 } },
  mine_ingot:  { kind: "resource", biome: "mine", label: "Ingot",  color: 0xe8e0d8, dark: 0x6a5a50, value: 6,  next: null },
  mine_coal:   { kind: "tile", biome: "mine", label: "Coal",   color: 0x333333, dark: 0x000000, value: 2,  next: "mine_coke" },
  mine_coke:   { kind: "resource", biome: "mine", label: "Coke",   color: 0x5a5a60, dark: 0x1a1a20, value: 4,  next: null },
  mine_gem:    { kind: "tile", biome: "mine", label: "Gem",    color: 0x65e5ff, dark: 0x1686a3, value: 7,  next: "mine_cutgem", sway: { amp: 1.2, freq: 0.00028, gust: 0.04 } },
  mine_cutgem: { kind: "resource", biome: "mine", label: "CutGem", color: 0xa3f0ff, dark: 0x1686a3, value: 14, next: null, sway: { amp: 1.2, freq: 0.00028, gust: 0.04 } },
  mine_gold:   { kind: "tile", biome: "mine", label: "Gold",   color: 0xffd34c, dark: 0x946b11, value: 5,  next: null, sway: { amp: 1.0, freq: 0.00024, gust: 0.04 } },
  mine_dirt:   { kind: "tile", biome: "mine", label: "Dirt",   color: 0x7a6850, dark: 0x3e3a36, value: 1,  next: null },

  // Harbor tiles/resources
  fish_sardine:  { kind: "tile", biome: "fish", label: "Sardine",  color: 0x9ab8c4, dark: 0x4a5e68, value: 1, next: "fish_raw", sway: { amp: 1.4, freq: 0.00050, gust: 0.08 } },
  fish_mackerel: { kind: "tile", biome: "fish", label: "Mackerel", color: 0x4a7a9a, dark: 0x223a4a, value: 2, next: "fish_raw", sway: { amp: 1.6, freq: 0.00052, gust: 0.10 } },
  fish_clam:     { kind: "tile", biome: "fish", label: "Clam",     color: 0xc8a888, dark: 0x705a40, value: 2, next: "fish_raw", sway: { amp: 0.4, freq: 0.00020, gust: 0.02 } },
  fish_oyster:   { kind: "tile", biome: "fish", label: "Oyster",   color: 0xd0c0a8, dark: 0x6a5e48, value: 3, next: "fish_raw", sway: { amp: 0.4, freq: 0.00020, gust: 0.02 } },
  fish_kelp:     { kind: "tile", biome: "fish", label: "Kelp",     color: 0x3a6a3a, dark: 0x1a3818, value: 1, next: "fish_oil", sway: { amp: 3.0, freq: 0.00060, gust: 0.18 } },
  fish_raw:      { kind: "resource", biome: "fish", label: "Fish",     color: 0xb0c8d4, dark: 0x546a78, value: 4, next: "fish_fillet" },
  fish_fillet:   { kind: "resource", biome: "fish", label: "Fillet",   color: 0xe8c8b0, dark: 0x7a604c, value: 8, next: null },
  fish_oil:      { kind: "resource", biome: "fish", label: "Fish Oil", color: 0xe8d050, dark: 0x7a6818, value: 6, next: null },
  fish_pearl:    { kind: "tile", biome: "fish", label: "Pearl",    color: 0xefe8d8, dark: 0x6a6258, value: 0, next: null },

  // Tools
  rake:        { kind: "tool", label: "Rake", effect: "clear_all", target: "grass_hay", anim: "sweep", ms: 300, desc: "Clears all hay tiles from the board in one sweep — handy for tidying an overgrown field." },
  axe:         { kind: "tool", label: "Axe", effect: "clear_all", target: "wood_log", anim: "chops", ms: 200, desc: "Fells all log tiles on the board instantly. Handy when the wood supply is blocking upgrades." },
  fertilizer:  { kind: "tool", label: "Fertilizer", effect: "fill_bias", target: "grain", anim: "shimmer", ms: 600, desc: "Enriches the soil so the next board fill is biased toward grain tiles." },
  cat:         { kind: "tool", label: "Cat", effect: "clear_hazard", target: "rats", anim: "scatter", ms: 200, desc: "Dispatches a mouser to clear all active rat hazards from the farm in one go." },
  bird_cage:   { kind: "tool", label: "Bird Cage", effect: "clear_all", target: "bird_egg", anim: "cage", ms: 300, desc: "Sweeps all egg tiles from the board — useful when bird tiles are flooding the farm." },
  scythe_full: { kind: "tool", label: "Scythe (full)", effect: "clear_all", target: "grain", anim: "sweep", ms: 300, desc: "Harvests all grain tiles at once, clearing the board for a fresh fill." },
  rifle:       { kind: "tool", label: "Rifle", effect: "clear_hazard", target: "wolves", anim: "shot", ms: 300, desc: "Drives off all active wolves permanently, ending the wolf hazard immediately." },
  hound:       { kind: "tool", label: "Hound", effect: "scatter_hazard", target: "wolves", anim: "bark", ms: 400, desc: "Scares the wolves away for several turns, buying time to chain away their target tiles." },
  hoe:         { kind: "tool", label: "Hoe", effect: "clear_all", target: "veg_carrot", anim: "till", ms: 300, desc: "Tills the soil — clears every veg-carrot tile from the board so a fresh fill can roll." },
  stone_hammer:{ kind: "tool", label: "Stone Hammer", effect: "clear_all", target: "mine_cobble", anim: "smash", ms: 350, desc: "Smashes every cobble tile on the board — a fast way to feed the chain into block tier." },
  iron_pick:   { kind: "tool", label: "Iron Pick", effect: "clear_all", target: "mine_ore", anim: "pick", ms: 320, desc: "Bites into ore veins — clears every ore tile so the chain can be re-spawned cleanly." },
  bird_feed:   { kind: "tool", label: "Bird Feed", effect: "fill_bias", target: "bird_egg", anim: "scatter", ms: 500, desc: "Scatters feed across the field so the next board fill is biased toward bird tiles." },
  sapling:     { kind: "tool", label: "Sapling", effect: "fill_bias", target: "tree_oak", anim: "shimmer", ms: 600, desc: "Plants a sapling that biases the next fill toward oak (and other tree) tiles." },
  water_pump:  { kind: "tool", label: "Water Pump", effect: "water_pump", desc: "Crafts a water pump tool that can irrigate farm tiles, boosting grain yield for one turn." },
  explosives:  { kind: "tool", label: "Explosives", effect: "explosives", desc: "Crafts a bundle of explosives that clears a 3×3 area of tiles from the mine board." },

  // Crafted Products
  honeyroll:  { kind: "resource", label: "Honey Roll", color: 0xf0c050, dark: 0x8a6010, value: 175, desc: "A sweet honey roll glazed with jam, commanding 175 coins at market." },
  harvestpie: { kind: "resource", label: "Harvest Pie", color: 0xd4784a, dark: 0x6a3018, value: 175, desc: "A hearty harvest pie filled with jam and egg, prized by townsfolk for 175 coins." },
  preserve:   { kind: "resource", label: "Preserve Jar", color: 0x9a6888, dark: 0x502848, value: 100, desc: "Bottled berry preserves sealed with egg-white, fetching 100 coins at the Larder." },
  tincture:   { kind: "resource", label: "Berry Tincture", color: 0x6b8a3a, dark: 0x304018, value: 125, desc: "A medicinal berry tincture used by Sister Liss, sold for 125 coins." },
  iron_hinge: { kind: "resource", label: "Iron Hinge", color: 0x7a8a96, dark: 0x2a3a46, value: 175, desc: "A forged iron hinge used in building construction. Story note: Bram requests these for the Caravan Post." },
  cobblepath: { kind: "resource", label: "Cobble Path", color: 0x9a9a8a, dark: 0x404038, value: 200, desc: "Laid cobblestones that pave trade paths, sold to caravans for 200 coins." },
  lantern:    { kind: "resource", label: "Iron Lantern", color: 0xd4783a, dark: 0x6a2800, value: 150, desc: "A wrought-iron lantern that lights the evening market, selling for 150 coins." },
  goldring:   { kind: "resource", label: "Gold Ring", color: 0xffd34c, dark: 0x886810, value: 225, desc: "A gleaming gold ring favoured by merchants, commanding 225 coins at the forge." },
  gemcrown:   { kind: "resource", label: "Gem Crown", color: 0x65e5ff, dark: 0x1060a0, value: 325, desc: "A jewelled crown set with cut gems — the Forge's most prestigious commission, worth 325 coins." },
  ironframe:  { kind: "resource", label: "Iron Frame", color: 0x6a7a86, dark: 0x2a3040, value: 275, desc: "A structural iron frame used in advanced buildings and caravan reinforcement, worth 275 coins." },
  stonework:  { kind: "resource", label: "Stonework", color: 0x8a8a7a, dark: 0x383828, value: 300, desc: "Dressed stonework for walls and facades — the final tier of Forge crafting, worth 300 coins." },
  chowder:    { kind: "resource", label: "Chowder", color: 0xd4b888, dark: 0x6a503a, value: 280, desc: "A creamy seafood chowder thick with fillet, milk, and root vegetables. Larder favourite at 280 coins." },
  fish_oil_bottled: { kind: "resource", label: "Fish Oil (Bottled)", color: 0xe8d050, dark: 0x7a6018, value: 80, desc: "Refined kelp-and-fish oil sealed in a corked plank flask. Used by tinkers and tar-mongers, worth 80 coins." }
};
// Underscore-variant aliases for ITEMS (tests and orders use both forms).
ITEMS.iron_frame = ITEMS.ironframe;
ITEMS.gem_crown  = ITEMS.gemcrown;
ITEMS.gold_ring  = ITEMS.goldring;

export const BIOMES = {
  farm: {
    name: "Farm",
    mine_dirt: 0x6d4a2f,
    dark: 0x3e2a1a,
    dirtColor: 0x6d4a2f,
    palette: { bg: 0x7dbd48, accent: 0x5daa35, dim: 0x3e2a1a },
    tilePool: FARM_TILE_POOL,
    pool: FARM_TILE_POOL,
  },
  mine: {
    name: "Mine",
    mine_dirt: 0x242526,
    dark: 0x151515,
    dirtColor: 0x3e3a36,
    palette: { bg: 0x2a2c30, accent: 0x6a7280, dim: 0x121316 },
    tilePool: MINE_TILE_POOL,
    pool: MINE_TILE_POOL,
  },
  fish: {
    name: "Harbor",
    mine_dirt: 0x2a4a6a,
    dark: 0x18283a,
    dirtColor: 0x2a4a6a,
    palette: { bg: 0x2a4a6a, accent: 0x4a8aaa, dim: 0x18283a },
    tilePool: FISH_TILE_POOL,
    pool: FISH_TILE_POOL,
  },
};

// Reattach resources to BIOMES dynamically so we don't break downstream code
// that relies on BIOMES.farm.resources being an array of item objects.
for (const b of Object.values(BIOMES)) {
  b.resources = Object.entries(ITEMS)
    .filter(([, item]) => item.biome === b.name.toLowerCase() || (b.name === "Harbor" && item.biome === "fish"))
    .map(([key, item]) => ({ key, ...item }));
}


export const NPCS = {
  mira: {
    name: "Mira",
    role: "Baker",
    color: "#d6612a",
    lines: [
      "Sundown's coming — bring me {n} {r} for the workers' supper.",
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
  { id: "inn", name: "Inn", desc: "Lodgings for helpers and travelling traders.", cost: { coins: 400, wood_plank: 20 }, lv: 2, x: 470, y: 350, w: 110, h: 130, color: "#4f6b3a" },
  { id: "granary", name: "Granary", desc: "Keeps the harvest safe and dry between sessions.", cost: { coins: 300, wood_plank: 20 }, lv: 1, x: 600, y: 380, w: 80, h: 100, color: "#c5a87a" },
  { id: "larder", name: "Larder", desc: "Preserve and bottle your harvest. Craft preserve jars and berry tinctures for coins.", cost: { coins: 700, wood_plank: 30, mine_stone: 20 }, lv: 3, x: 700, y: 395, w: 70, h: 85, color: "#4f6b3a" },
  { id: "forge", name: "Forge", desc: "Smith metal goods — hinges, lanterns, rings, and more — for high coin rewards.", cost: { coins: 1200, mine_stone: 60, mine_ingot: 20 }, lv: 8, x: 800, y: 380, w: 100, h: 100, color: "#5a6973" },
  { id: "caravan_post", name: "Caravan Post", desc: "Opens distant trade routes, letting you sell crafted goods to far-off markets.", cost: { coins: 800, wood_plank: 40 }, lv: 8, x: 940, y: 390, w: 110, h: 90, color: "#7e4f24" },
  { id: "kitchen", name: "Kitchen", desc: "Converts surplus grain into supplies. Three supplies grant standard Mine entry.", cost: { coins: 400, wood_plank: 20 }, lv: 2, x: 60, y: 260, w: 90, h: 100, color: "#8a4a26" },
  { id: "workshop", name: "Workshop", desc: "Crafts tools from raw materials.", cost: { coins: 500, wood_plank: 20, mine_stone: 10 }, lv: 3, x: 180, y: 265, w: 90, h: 100, color: "#6a5a3a" },
  { id: "powder_store", name: "Powder Store", desc: "Stockpiles black powder. Produces 2 Bombs at the end of every season.", cost: { coins: 600, mine_stone: 30, mine_ingot: 5 }, lv: 5, x: 310, y: 260, w: 90, h: 100, color: "#3a2a1a",
    abilities: [
      { id: "grant_tool", params: { tool: "bomb", amount: 2 }, trigger: "season_end" },
    ] },
  { id: "portal", name: "Magic Portal", desc: "A shimmering gateway. Summons unlock with Influence (Phase 8).", cost: { coins: 2000, runes: 5 }, lv: 8, x: 440, y: 245, w: 100, h: 115, color: "#4a2a7a" },
  { id: "housing", name: "Housing Block",
    desc: "Lodging for the settlement's hired hands.",
    cost: { coins: 300, wood_plank: 25 }, lv: 2,
    x: 430, y: 262, w: 80, h: 92, color: "#a07a4a",
    abilities: [
      { id: "worker_pool_step", params: { amount: 1 }, trigger: "season_end" },
    ] },
  { id: "housing2", name: "Housing Block",
    desc: "Lodging for the settlement's hired hands.",
    cost: { coins: 300, wood_plank: 25 }, lv: 2, requires: "housing",
    x: 520, y: 262, w: 80, h: 92, color: "#a07a4a",
    abilities: [
      { id: "worker_pool_step", params: { amount: 1 }, trigger: "season_end" },
    ] },
  { id: "housing3", name: "Housing Block",
    desc: "Lodging for the settlement's hired hands.",
    cost: { coins: 300, wood_plank: 25 }, lv: 2, requires: "housing2",
    x: 610, y: 262, w: 80, h: 92, color: "#a07a4a",
    abilities: [
      { id: "worker_pool_step", params: { amount: 1 }, trigger: "season_end" },
    ] },
  // Phase 12.5 — §18 LOCKED: Silos/Barns preserve tile layout between sessions
  { id: "silo", name: "Silo",
    desc: "Wood-and-stone grain store. Preserves the tile layout between sessions on the Farm.",
    cost: { coins: 250, wood_plank: 15 }, lv: 4, biome: "farm",
    x: 710, y: 260, w: 90, h: 100, color: "#9a6a3a",
    abilities: [
      { id: "preserve_board", params: { biome: "farm" }, trigger: "session_end" },
    ] },
  { id: "barn", name: "Barn",
    desc: "Reinforced ore shed. Preserves the tile layout between sessions in the Mine.",
    cost: { coins: 400, wood_plank: 25, mine_stone: 5 }, lv: 5, biome: "mine",
    x: 840, y: 260, w: 90, h: 100, color: "#7a4a2a",
    abilities: [
      { id: "preserve_board", params: { biome: "mine" }, trigger: "session_end" },
    ] },
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

export const RECIPES = {
  // Workshop recipes (Tools)
  rec_rake:        { item: "rake",          station: "workshop", inputs: { wood_plank: 1 } },
  rec_axe:         { item: "axe",           station: "workshop", inputs: { mine_stone: 1 } },
  rec_fertilizer:  { item: "fertilizer",    station: "workshop", inputs: { grass_hay: 1, mine_dirt: 1 } },
  rec_cat:         { item: "cat",           station: "workshop", inputs: { mine_stone: 2, mine_dirt: 1 } },
  rec_bird_cage:   { item: "bird_cage",     station: "workshop", inputs: { grass_hay: 1 } },
  rec_scythe_full: { item: "scythe_full",   station: "workshop", inputs: { mine_stone: 1 } },
  rec_rifle:       { item: "rifle",         station: "workshop", inputs: { wood_plank: 1, mine_stone: 1, mine_ingot: 1 } },
  rec_hound:       { item: "hound",         station: "workshop", inputs: { bread: 1, mine_stone: 3 } },
  rec_hoe:         { item: "hoe",           station: "workshop", inputs: { wood_plank: 1, mine_stone: 1 } },
  rec_stone_hammer:{ item: "stone_hammer",  station: "workshop", inputs: { mine_stone: 2, wood_plank: 1 } },
  rec_iron_pick:   { item: "iron_pick",     station: "workshop", inputs: { mine_ingot: 1, wood_plank: 1 } },
  rec_bird_feed:   { item: "bird_feed",     station: "workshop", inputs: { grain: 1, grass_hay: 2 } },
  rec_sapling:     { item: "sapling",       station: "workshop", inputs: { wood_log: 1, grass_hay: 2 } },

  // Tools in workshop originally from RECIPES
  rec_water_pump:  { item: "water_pump",    station: "workshop", tier: 2, inputs: { wood_plank: 1, mine_stone: 1 } },
  rec_explosives:  { item: "explosives",    station: "workshop", tier: 2, inputs: { grass_hay: 1, mine_dirt: 1 } },

  // Crafted goods
  rec_bread:       { item: "bread",         station: "bakery", tier: 1, inputs: { grain_flour: 3, bird_egg: 1 } },
  rec_honeyroll:   { item: "honeyroll",     station: "bakery", tier: 2, inputs: { grain_flour: 2, bird_egg: 1, berry_jam: 1 } },
  rec_harvestpie:  { item: "harvestpie",    station: "bakery", tier: 2, inputs: { grain_flour: 2, berry_jam: 1, bird_egg: 1 } },
  rec_preserve:    { item: "preserve",      station: "larder", tier: 1, inputs: { berry_jam: 2, bird_egg: 1 } },
  rec_tincture:    { item: "tincture",      station: "larder", tier: 1, inputs: { berry: 3, berry_jam: 1 } },
  rec_iron_hinge:  { item: "iron_hinge",    station: "forge",  tier: 2, inputs: { mine_ingot: 2, mine_coke: 1 } },
  rec_cobblepath:  { item: "cobblepath",    station: "forge",  tier: 1, inputs: { mine_stone: 5, wood_plank: 2 } },
  rec_lantern:     { item: "lantern",       station: "forge",  tier: 2, inputs: { mine_ingot: 1, mine_coke: 1, wood_plank: 1 } },
  rec_goldring:    { item: "goldring",      station: "forge",  tier: 2, inputs: { mine_gold: 1, mine_ingot: 2 } },
  rec_gemcrown:    { item: "gemcrown",      station: "forge",  tier: 2, inputs: { mine_cutgem: 1, mine_gold: 2 } },
  rec_ironframe:   { item: "ironframe",     station: "forge",  tier: 3, inputs: { wood_beam: 2, mine_ingot: 1 } },
  rec_stonework:   { item: "stonework",     station: "forge",  tier: 3, inputs: { mine_block: 2, mine_coke: 1 } },
  rec_chowder:     { item: "chowder",       station: "larder", tier: 2, inputs: { fish_fillet: 2, milk: 1, veg_carrot: 1 } },
  rec_fish_oil_bot:{ item: "fish_oil_bottled", station: "workshop", tier: 1, inputs: { fish_oil: 1, wood_plank: 1 } },
};

// ── Backward-compatible aliases ────────────────────────────────────────────
// Old code and tests reference RECIPES by item key (e.g. RECIPES["bread"]).
// Generate aliases: for each recipe, RECIPES[recipe.item] → same object.
for (const rec of Object.values(RECIPES)) {
  if (rec.item && !RECIPES[rec.item]) RECIPES[rec.item] = rec;
}
// Add backward-compatible computed properties to each recipe. Old code reads
// recipe.name, recipe.coins, recipe.tool, recipe.color, recipe.effect etc.
// These are now sourced from ITEMS[recipe.item].
for (const rec of Object.values(RECIPES)) {
  if (!rec.item) continue;
  const itemDef = ITEMS[rec.item];
  if (!itemDef) continue;
  // Legacy compat getters — only add if not already set by the recipe itself.
  if (rec.name === undefined)   rec.name   = itemDef.label;
  if (rec.coins === undefined)  rec.coins  = itemDef.value ?? 0;
  if (rec.color === undefined)  rec.color  = itemDef.color;
  if (rec.effect === undefined) rec.effect = itemDef.effect;
  if (rec.target === undefined) rec.target = itemDef.target;
  if (rec.anim === undefined)   rec.anim   = itemDef.anim;
  if (rec.ms === undefined)     rec.ms     = itemDef.ms;
  if (rec.desc === undefined)   rec.desc   = itemDef.desc;
  // tool property: if the item is a tool, set recipe.tool = item key
  if (itemDef.kind === "tool" && rec.tool === undefined) rec.tool = rec.item;
}
// Explicit retro-compatibility aliases for underscore variants.
RECIPES.rec_iron_frame = RECIPES.rec_ironframe;
RECIPES.rec_gem_crown  = RECIPES.rec_gemcrown;
RECIPES.rec_gold_ring  = RECIPES.rec_goldring;
RECIPES.iron_frame     = RECIPES.rec_ironframe;
RECIPES.gem_crown      = RECIPES.rec_gemcrown;
RECIPES.gold_ring      = RECIPES.rec_goldring;

// Legacy WORKSHOP_RECIPES export — a view keyed by item-name over workshop
// recipes. Tests and a few call sites still import this.
export const WORKSHOP_RECIPES = Object.fromEntries(
  Object.values(RECIPES)
    .filter((r) => r.station === "workshop")
    .map((r) => [r.item, r])
);

// Legacy RECIPES.tools alias (tests reference RECIPES.tools.rake etc.)
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
  { id: "better",  coins: 100,                label: "Better"   },
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

// ─── Tile / season colour table ──────────────────────────────────────────────
// The `default` palette reads back from BIOMES + SEASONS to guarantee zero
// visual drift versus the hex baseline.
const _defaultTiles = Object.fromEntries(
  [...BIOMES.farm.resources, ...BIOMES.mine.resources, ...BIOMES.fish.resources].map((r) => [r.key, r.color]),
);
const _defaultSeasons = Object.fromEntries(
  SEASONS.map((s) => [s.name, { bg: s.bg, fill: s.fill, accent: s.accent }]),
);

// Only the `default` palette remains (the colour-blind variants were removed).
export const PALETTES = {
  default: {
    tiles: _defaultTiles,
    seasons: _defaultSeasons,
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
  applyItemOverrides,
  applyRecipeOverrides,
  applyBuildingOverrides,
  applyExpeditionOverrides,
  applyBiomeOverrides,
  applyDailyRewardOverrides,
  sanitizeTuning,
} from "./config/applyOverrides.js";

export const BALANCE_OVERRIDES = mergeOverrides(balanceFile, readBalanceDraft());
applyDailyRewardOverrides(DAILY_REWARDS, BALANCE_OVERRIDES.dailyRewards);

applyUpgradeThresholdOverrides(UPGRADE_THRESHOLDS, BALANCE_OVERRIDES.upgradeThresholds);
applyItemOverrides(ITEMS, BALANCE_OVERRIDES.items);
applyRecipeOverrides(RECIPES, BALANCE_OVERRIDES.recipes);
applyBuildingOverrides(BUILDINGS, BALANCE_OVERRIDES.buildings);
applyExpeditionOverrides(EXPEDITION_FOOD_TURNS, EXPEDITION_MEAT_FOODS, BALANCE_OVERRIDES.expedition);
applyBiomeOverrides(SETTLEMENT_BIOMES, BALANCE_OVERRIDES.biomes);

// Phase 6 — the Balance Manager "Tuning" section: loose top-level constants.
// `TUNING_OVERRIDES` is the validated subset; the `export let`s above (and the
// SETTLEMENT_FOUNDING_* ones in features/zones/data.js) are reassigned from it.
export const TUNING_OVERRIDES = sanitizeTuning(BALANCE_OVERRIDES.tuning);
if ("maxTurns" in TUNING_OVERRIDES) MAX_TURNS = TUNING_OVERRIDES.maxTurns;
if ("auditBossCooldownDays" in TUNING_OVERRIDES) AUDIT_BOSS_COOLDOWN_DAYS = TUNING_OVERRIDES.auditBossCooldownDays;
if ("craftQueueHours" in TUNING_OVERRIDES) CRAFT_QUEUE_HOURS = TUNING_OVERRIDES.craftQueueHours;
if ("craftGemSkipCost" in TUNING_OVERRIDES) CRAFT_GEM_SKIP_COST = TUNING_OVERRIDES.craftGemSkipCost;
if ("minExpeditionTurns" in TUNING_OVERRIDES) MIN_EXPEDITION_TURNS = TUNING_OVERRIDES.minExpeditionTurns;
if ("homeBiome" in TUNING_OVERRIDES && (SETTLEMENT_BIOMES.farm ?? []).some((b) => b.id === TUNING_OVERRIDES.homeBiome)) {
  DEFAULT_HOME_BIOME = TUNING_OVERRIDES.homeBiome;
}

// Recompute tile palette so default-palette renders pick up any color overrides.
for (const r of [...BIOMES.farm.resources, ...BIOMES.mine.resources, ...BIOMES.fish.resources]) {
  if (PALETTES.default.tiles[r.key] !== r.color) {
    PALETTES.default.tiles[r.key] = r.color;
  }
}
