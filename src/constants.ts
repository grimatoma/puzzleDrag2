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
  CHAIN_FLOAT_TEXT: "chain-float-text",
  TOOL_FIRED: "tool-fired",
  REWARD_BURST: "reward-burst",
});

type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type TileId = Brand<`tile_${string}`, "TileId">;
export type ResourceId = Brand<string, "ResourceId">;
export type ToolId = Brand<string, "ToolId">;
export type ItemId = TileId | ResourceId | ToolId;
export type BiomeId = "farm" | "mine" | "fish";
export type RecipeId = Brand<`rec_${string}`, "RecipeId"> | Brand<string, "RecipeAliasId">;
export type StationId = "bakery" | "forge" | "kitchen" | "larder" | "smokehouse" | "workshop" | string;

import type { TuningOverrides } from "./config/schemas/tuning.js";
import type { ToolPowerDefinition } from "./config/schemas/shared.js";
import type {
  TileItemEntry,
  ResourceItemEntry,
  ToolItemEntry,
  ItemEntry,
} from "./config/schemas/item.js";

export type { SwayParams, ToolPowerDefinition } from "./config/schemas/shared.js";
export type {
  TileItemEntry,
  ResourceItemEntry,
  ToolItemEntry,
  ItemEntry,
} from "./config/schemas/item.js";
export type ItemRecord = Record<ItemKey, ItemEntry>;
export type TileRecord = Record<TileKey, TileItemEntry>;
export type ResourceRecord = Record<ResourceKey, ResourceItemEntry>;
export type ToolRecord = Record<ToolKey, ToolItemEntry>;

export type BiomeItemEntry<T extends ItemEntry = ItemEntry> = T & { key: string };

export interface BiomePalette {
  bg: number;
  accent: number;
  dim: number;
}

export interface BiomeDefinition {
  [legacyField: string]: unknown;
  name: string;
  special_dirt: number;
  dark: number;
  dirtColor: number;
  palette: BiomePalette;
  tilePool: string[];
  pool: string[];
  tiles: Array<BiomeItemEntry<TileItemEntry>>;
  resources: Array<BiomeItemEntry<ResourceItemEntry>>;
  resourceOrderPool: string[];
}

export type BiomeRecord = Record<BiomeId, BiomeDefinition> & Record<string, BiomeDefinition>;

import type { ItemKey, RecipeInputKey, ResourceKey, TileKey, ToolKey } from "./types/catalogKeys.js";

/** Closed input map — only keys from the ITEMS catalog. */
export type RecipeInputs = Partial<Record<RecipeInputKey, number>>;

export interface RecipeDefinition {
  [legacyField: string]: unknown;
  item: string;
  station: StationId;
  inputs: RecipeInputs;
  tier?: number;
  craftMs?: number;
  name?: string;
  coins?: number;
  tool?: string;
  color?: number;
  power?: ToolPowerDefinition;
  anim?: string;
  ms?: number;
  desc?: string;
}

export type RecipeRecord = Record<string, RecipeDefinition>;
export type WorkshopRecipeRecord = Record<string, RecipeDefinition>;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function isItemEntry(value: unknown): value is ItemEntry {
  return isObjectRecord(value)
    && (value.kind === "tile" || value.kind === "resource" || value.kind === "tool")
    && typeof value.label === "string";
}

export function isTileItemEntry(value: unknown): value is TileItemEntry {
  return isItemEntry(value) && value.kind === "tile";
}

export function isResourceItemEntry(value: unknown): value is ResourceItemEntry {
  return isItemEntry(value) && value.kind === "resource";
}

export function isToolItemEntry(value: unknown): value is ToolItemEntry {
  return isItemEntry(value) && value.kind === "tool";
}

export function hasLegacyNext(value: unknown): value is ItemEntry & { next: string | null } {
  return isItemEntry(value) && ("next" in value) && (typeof value.next === "string" || value.next === null);
}

export function hasToolPower(value: unknown): value is ItemEntry & { power: ToolPowerDefinition } {
  return isItemEntry(value) && isObjectRecord(value.power) && typeof value.power.id === "string";
}

export function isRecipeDefinition(value: unknown): value is RecipeDefinition {
  return isObjectRecord(value)
    && typeof value.item === "string"
    && typeof value.station === "string"
    && isObjectRecord(value.inputs);
}

export function hasRecipeCraftMs(value: unknown): value is RecipeDefinition & { craftMs: number } {
  return isRecipeDefinition(value) && typeof value.craftMs === "number" && value.craftMs > 0;
}

export function isBiomeDefinition(value: unknown): value is BiomeDefinition {
  return isObjectRecord(value)
    && typeof value.name === "string"
    && Array.isArray(value.tilePool)
    && Array.isArray(value.pool);
}

export const TILE = 74;
export const COLS = 6;
export const ROWS = 6;

// Phase 5 — real-time crafting queues (alongside the instant CRAFT_RECIPE).
// Per-station: each station (bakery, forge, …) has its own sequential queue
// under `state.craftQueues[station]`. Within a station only the head ticks
// down; across stations queues run in parallel. Spending CRAFT_GEM_SKIP_COST
// gems finishes the head instantly. Each recipe may override the default
// duration via a `craftMs` field (see RECIPES); when unset the recipe falls
// back to CRAFT_QUEUE_HOURS hours.
export let CRAFT_QUEUE_HOURS = 4;       // Dev Panel: tuning.craftQueueHours
export let CRAFT_GEM_SKIP_COST = 1;     // Dev Panel: tuning.craftGemSkipCost

/** Wall-clock ms a queued craft of `recipeKey` takes (recipe override or default). */
export function recipeCraftMs(recipeKey: string): number {
  const r = RECIPES[recipeKey];
  if (hasRecipeCraftMs(r)) return r.craftMs;
  return CRAFT_QUEUE_HOURS * 60 * 60 * 1000;
}

// Phase 5 — expedition rations (master doc §VI). Mine/Harbor rounds are
// supply-structured: you bring food before the round, each unit is worth this
// many base turns, and buildings/NPC-bonds bump it (see expeditionTurnsForFood
// in features/zones/data.js). Tunable. `cured_meat` / `festival_loaf` /
// `wedding_pie` / `iron_ration` are forward-declared here — those recipes don't
// exist in the resource pipeline yet; they'll be added with the round flow
// (Phase 5d). `tile_fruit_apple` and `bread` are the live keys today.
// Not frozen — `applyExpeditionOverrides` (Dev Panel) mutates this in place.
export const EXPEDITION_FOOD_TURNS = {
  supplies:      1,
  tile_fruit_apple:   1,
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
export let MIN_EXPEDITION_TURNS = 3;    // Dev Panel: tuning.minExpeditionTurns

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
export let DEFAULT_HOME_BIOME = "prairie"; // Dev Panel: tuning.homeBiome

/** Apply Dev Panel tuning fields owned by this module (`export let` bindings). */
export function applyConstantsTuning(tuning: TuningOverrides): void {
  if (tuning.craftQueueHours !== undefined) CRAFT_QUEUE_HOURS = tuning.craftQueueHours;
  if (tuning.craftGemSkipCost !== undefined) CRAFT_GEM_SKIP_COST = tuning.craftGemSkipCost;
  if (tuning.minExpeditionTurns !== undefined) MIN_EXPEDITION_TURNS = tuning.minExpeditionTurns;
  if (
    tuning.homeBiome !== undefined
    && (SETTLEMENT_BIOMES.farm ?? []).some((b) => b.id === tuning.homeBiome)
  ) {
    DEFAULT_HOME_BIOME = tuning.homeBiome;
  }
}

// Save schema version. Forward migrations are not maintained — bump this
// whenever persisted state changes shape and existing saves will be discarded.
export const SAVE_SCHEMA_VERSION = 42;

export const UPGRADE_THRESHOLDS = {
  tile_grass_hay: 6, tile_grass_meadow: 6, tile_grass_spiky: 6,
  tile_grain_wheat: 5,
  tile_mine_stone: 8,
  tile_mine_iron_ore: 6, tile_mine_copper_ore: 6, tile_mine_coal: 7, tile_mine_gem: 5, tile_mine_gold: 6,
  // Birds → Eggs (chain 6). Existing bird tiles get explicit thresholds now
  // that they upgrade to the new `eggs` product.
  tile_bird_turkey: 6, tile_bird_clover: 6, tile_bird_melon: 6,
  tile_veg_carrot: 6, tile_veg_eggplant: 6, tile_veg_turnip: 6, tile_veg_beet: 6, tile_veg_cucumber: 6,
  tile_veg_squash: 6, tile_veg_mushroom: 6, tile_veg_pepper: 6, tile_veg_broccoli: 6,
  // Catalog-import placeholders. All default to 6 — balance comes later.
  tile_grass_heather: 6,
  tile_grain_corn: 6, tile_grain_buckwheat: 6, tile_grain_manna: 6, tile_grain_rice: 6,
  // Fruits → Pie (catalog §4: 7 fruits → 1 pie)
  tile_fruit_apple: 7, tile_fruit_pear: 7, tile_fruit_golden_apple: 7, tile_fruit_blackberry: 7,
  tile_fruit_rambutan: 7, tile_fruit_starfruit: 7, tile_fruit_coconut: 7, tile_fruit_lemon: 7, tile_fruit_jackfruit: 7,
  // Flowers → Honey (catalog §4: 10 flowers → 1 honey)
  tile_flower_pansy: 10, tile_flower_water_lily: 10,
  // Trees → Plank (one-step)
  tile_tree_oak: 6, tile_tree_birch: 6, tile_tree_willow: 6, tile_tree_fir: 6, tile_tree_cypress: 6, tile_tree_palm: 6,
  // Birds → Eggs (one-step)
  tile_bird_pheasant: 6, tile_bird_chicken: 6, tile_bird_hen: 6, tile_bird_rooster: 6, tile_bird_wild_goose: 6, tile_bird_goose: 6,
  tile_bird_parrot: 6, tile_bird_phoenix: 6, tile_bird_dodo: 6, tile_bird_pig_in_disguise: 6,
  // Herd Animals → Meat (catalog §4: 5 herd → 1 meat)
  tile_herd_pig: 5, tile_herd_hog: 5, tile_herd_boar: 5, tile_herd_warthog: 5,
  tile_herd_sheep: 5, tile_herd_alpaca: 5, tile_herd_goat: 5, tile_herd_ram: 5,
  // Cattle → Milk (catalog §4: 6 cattle → 1 milk)
  tile_cattle_cow: 6, tile_cattle_longhorn: 6, tile_cattle_triceratops: 6,
  // Mounts → Horseshoe (catalog §4: 10 mounts → 1 horseshoe)
  tile_mount_horse: 10, tile_mount_donkey: 10, tile_mount_moose: 10, tile_mount_mammoth: 10,
  // Fish biome — flat one-step chains.
  tile_fish_sardine: 5, tile_fish_mackerel: 5, tile_fish_clam: 5, tile_fish_kelp: 6, tile_fish_oyster: 5,
};

export const SEASONS = [
  { name: "Spring", iconKey: "season_spring", bg: 0x7dbd48, fill: 0x8fd85a, accent: 0x5daa35 },
  { name: "Summer", iconKey: "season_summer", bg: 0x8fca45, fill: 0xf6c342, accent: 0xe3a92f },
  { name: "Autumn", iconKey: "season_autumn", bg: 0xb77b3a, fill: 0xd9792d, accent: 0xa65722 },
  { name: "Winter", iconKey: "season_winter", bg: 0x78aaca, fill: 0x91d9ff, accent: 0xd9f6ff },
];

// Farm board tile pool. Each entry is one slot in the random fill rotation.
// Per-category counts intentionally weighted: the grass staple gets extra
// slots; new chain categories get one each so the player sees them without
// the board becoming chain-impossible at 6×6 = 36 cells. (wood and berry
// are resources/items, not tile species — see BIOMES.farm.resources.)
export const FARM_TILE_POOL = [
  "tile_grass_hay", "tile_grass_hay", "tile_grass_hay",
  "tile_grain_wheat",
  "tile_bird_pheasant",
  "tile_veg_carrot",
  "tile_fruit_apple",
  "tile_flower_pansy",
  "tile_tree_oak",
  "tile_herd_pig",
  "tile_cattle_cow",
  "tile_mount_horse",
  // Bird category slot uses pheasant as pool key; alternate bird species are
  // activated via the species-activation pipeline rather than additional pool slots.
];
export const MINE_TILE_POOL = ["tile_mine_stone", "tile_mine_stone", "tile_mine_stone", "tile_mine_iron_ore", "tile_mine_copper_ore", "tile_mine_coal", "tile_special_dirt", "tile_special_dirt", "tile_mine_gem"];

// Fish biome (MVP) — sardines / mackerel are most common, kelp is a filler,
// clam/oyster are mid-rare, fish_fillet is rare so it's mostly a chain product.
export const FISH_TILE_POOL = [
  "tile_fish_sardine", "tile_fish_sardine", "tile_fish_sardine",
  "tile_fish_mackerel", "tile_fish_mackerel",
  "tile_fish_clam", "tile_fish_clam",
  "tile_fish_kelp", "tile_fish_kelp",
  "tile_fish_oyster",
];

// Maps tile family name -> default produced resource key.
// Read by GameScene.nextResource and the Dev Panel UI to determine
// what a tile produces by default. Per-tile overrides live in tilePowers[id].producesResource.
// Families with custom handlers (special, hazards) are intentionally absent.
export const TILE_FAMILY_RESOURCE = {
  grass: "hay_bundle",
  grain: "flour",
  tree: "plank",
  bird: "eggs",
  herd: "meat",
  cattle: "milk",
  mount: "horseshoe",
  flower: "honey",
  fruit: "pie",
  veg: "soup",
  mine_stone: "block",
  mine_iron_ore: "iron_bar",
  mine_copper_ore: "copper_bar",
  mine_coal: "coke",
  mine_gem: "cut_gem",
  mine_gold: "gold_bar",
  fish: "fish_fillet",
  fish_clam: "sea_shells",
  fish_oyster: "pearls",
  fish_kelp: "fish_oil",
};

// Tiles whose output is not a simple family-default resource — they have
// custom handlers (rune triggers, countdowns) wired in feature code, so the
// chain pipeline intentionally returns null for them.
export const TILES_WITH_CUSTOM_OUTPUT = new Set([
  "tile_special_dirt",
  "tile_special_giant_pearl",
]);

// Extract the family portion of a tile key, e.g. "tile_grass_hay" -> "grass",
// "tile_mine_iron_ore" -> "mine_iron_ore", "tile_fish_clam" -> "fish_clam",
// "tile_fish_sardine" -> "fish". Uses longest-match against TILE_FAMILY_RESOURCE
// keys so compound families (mine_iron_ore, fish_clam, ...) win over their
// shorter prefixes (mine, fish). Returns null if the tile key has no
// registered family.
const _FAMILY_KEYS_LONGEST_FIRST = Object.keys(TILE_FAMILY_RESOURCE).sort(
  (a, b) => b.length - a.length,
);
export function tileFamily(tileKey: string): string | null {
  if (typeof tileKey !== "string" || !tileKey.startsWith("tile_")) return null;
  const rest = tileKey.slice(5); // strip "tile_"
  for (const fam of _FAMILY_KEYS_LONGEST_FIRST) {
    if (rest === fam || rest.startsWith(fam + "_")) return fam;
  }
  return null;
}

// The default produced resource for a tile, based on its family.
// Returns null when the tile has no family default (special/hazards tiles,
// or unknown keys).
export function tileFamilyResource(tileKey: string): string | null {
  const fam = tileFamily(tileKey);
  return fam ? ((TILE_FAMILY_RESOURCE as Record<string, string>)[fam] ?? null) : null;
}

// Derived map: resource key → upgrade threshold of the tile that produces it.
// Built once at module load from UPGRADE_THRESHOLDS + tileFamilyResource.
// When multiple tile variants in the same family share a threshold (grass,
// bird, fruit, etc.) all map to the same resource — we take the first
// threshold encountered (families are uniform in practice).
export const RESOURCE_TO_THRESHOLD: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  for (const [tileKey, threshold] of Object.entries(UPGRADE_THRESHOLDS)) {
    const resource = tileFamilyResource(tileKey);
    if (resource && out[resource] == null) out[resource] = threshold as number;
  }
  return out;
})();

/**
 * The legacy items registry — entries are tiles, resources, or tools
 * discriminated by `kind`. New code should reach for TILES / RESOURCES /
 * TOOLS by kind instead; ITEMS is kept as a Record so string indexing and
 * dynamic mutation (underscore aliases, recipe back-compat) continue to work.
 */

const ITEMS_DATA = {
  // Farm tiles/resources
  tile_grass_hay:          { kind: "tile", biome: "farm", label: "Hay",          color: 0xa8c769, dark: 0x4f6b3a, value: 1, next: "hay_bundle", sway: { amp: 4.0, freq: 0.00060, gust: 0.20 } },
  tile_grass_meadow:       { kind: "tile", biome: "farm", label: "Meadow Grass", color: 0x7fb24a, dark: 0x3e5a18, value: 1, next: "hay_bundle", sway: { amp: 4.5, freq: 0.00058, gust: 0.22 } },
  tile_grass_spiky:        { kind: "tile", biome: "farm", label: "Spiky Grass",  color: 0x9bb55a, dark: 0x4a5e1c, value: 1, next: "hay_bundle", sway: { amp: 2.5, freq: 0.00075, gust: 0.18 } },
  tile_grain_wheat:        { kind: "tile", biome: "farm", label: "Wheat", color: 0xdab947, dark: 0x7e5e1a, value: 2, next: "flour", sway: { amp: 5.0, freq: 0.00065, gust: 0.22 } },
  // Terminal farm resources (flat one-step pipeline).
  flour:              { kind: "resource", biome: "farm", label: "Flour", color: 0xf4e3c0, dark: 0x8a6a3a, value: 8, next: null },
  plank:              { kind: "resource", biome: "farm", label: "Plank", color: 0xc98c50, dark: 0x5e3a1d, value: 6, next: null },
  dirt:               { kind: "resource", biome: "farm", label: "Dirt",  color: 0x6b4a2a, dark: 0x352515, value: 2, next: null, desc: "Fertile soil hauled up from the special dirt tiles. Used in fertilizer, explosives, and animal pens." },
  jam:                { kind: "resource", biome: "farm", label: "Jam",   color: 0x8a1840, dark: 0x450c20, value: 5, next: null, desc: "Sweet preserves cooked down from blackberries. Used in tinctures and festival loaves." },
  tile_bird_turkey:        { kind: "tile", biome: "farm", label: "Turkey", color: 0xb8743a, dark: 0x5e3818, value: 4, next: "eggs", sway: { amp: 1.2, freq: 0.00050, gust: 0.10 } },
  tile_bird_clover:        { kind: "tile", biome: "farm", label: "Clover", color: 0x6fa450, dark: 0x365e22, value: 5, next: "eggs", sway: { amp: 2.5, freq: 0.00080, gust: 0.18 } },
  tile_bird_melon:         { kind: "tile", biome: "farm", label: "Melon",  color: 0xb3d770, dark: 0x4a6e2a, value: 6, next: "eggs", sway: { amp: 0.8, freq: 0.00030, gust: 0.05 } },
  tile_veg_carrot:         { kind: "tile", biome: "farm", label: "Carrot",   color: 0xe88439, dark: 0x7a3e10, value: 4, next: "soup", sway: { amp: 2.0, freq: 0.00050, gust: 0.10 } },
  tile_veg_eggplant:       { kind: "tile", biome: "farm", label: "Eggplant", color: 0x6b3a8a, dark: 0x301848, value: 4, next: "soup", sway: { amp: 1.8, freq: 0.00048, gust: 0.08 } },
  tile_veg_turnip:         { kind: "tile", biome: "farm", label: "Turnip",   color: 0xd87aa0, dark: 0x6e2a4a, value: 4, next: "soup", sway: { amp: 1.6, freq: 0.00050, gust: 0.08 } },
  tile_veg_beet:           { kind: "tile", biome: "farm", label: "Beet",     color: 0x6b1a3a, dark: 0x300818, value: 4, next: "soup", sway: { amp: 1.5, freq: 0.00046, gust: 0.07 } },
  tile_veg_cucumber:       { kind: "tile", biome: "farm", label: "Cucumber", color: 0x4f8c3a, dark: 0x224018, value: 4, next: "soup", sway: { amp: 2.4, freq: 0.00056, gust: 0.10 } },
  tile_veg_squash:         { kind: "tile", biome: "farm", label: "Squash",   color: 0xe6c14a, dark: 0x7a5e10, value: 4, next: "soup", sway: { amp: 1.7, freq: 0.00048, gust: 0.08 } },
  tile_veg_mushroom:       { kind: "tile", biome: "farm", label: "Mushroom", color: 0xc63a3a, dark: 0x601818, value: 4, next: "soup", sway: { amp: 1.5, freq: 0.00044, gust: 0.06 } },
  tile_veg_pepper:         { kind: "tile", biome: "farm", label: "Pepper",   color: 0xd83a3a, dark: 0x6e1818, value: 4, next: "soup", sway: { amp: 2.2, freq: 0.00054, gust: 0.10 } },
  tile_veg_broccoli:       { kind: "tile", biome: "farm", label: "Broccoli", color: 0x4a8a3a, dark: 0x1e3e18, value: 4, next: "soup", sway: { amp: 3.0, freq: 0.00060, gust: 0.12 } },
  soup:               { kind: "resource", biome: "farm", label: "Soup",     color: 0xc46a2f, dark: 0x6e3a18, value: 20, next: null },
  pie:                { kind: "resource", biome: "farm", label: "Pie",       color: 0xb05428, dark: 0x582818, value: 90,  next: null },
  honey:              { kind: "resource", biome: "farm", label: "Honey",     color: 0xe8a020, dark: 0x745010, value: 300, next: null },
  meat:               { kind: "resource", biome: "farm", label: "Meat",      color: 0xc44848, dark: 0x682424, value: 21,  next: null },
  milk:               { kind: "resource", biome: "farm", label: "Milk",      color: 0xfaf6ec, dark: 0x807e74, value: 100, next: null },
  horseshoe:          { kind: "resource", biome: "farm", label: "Horseshoe", color: 0x8a8a90, dark: 0x46464a, value: 400, next: null },
  eggs:               { kind: "resource", biome: "farm", label: "Eggs",      color: 0xf8efd0, dark: 0x807660, value: 5, next: null },
  hay_bundle:         { kind: "resource", biome: "farm", label: "Hay Bundle", color: 0xc9b160, dark: 0x6a5828, value: 6, next: null },
  bread:              { kind: "resource", biome: "farm", label: "Bread Loaf", color: 0xd49060, dark: 0x7a4a28, value: 125, next: null, desc: "A wholesome loaf baked from flour and eggs, sold for 125 coins at the Bakery." },
  supplies:           { kind: "resource", biome: "farm", label: "Supplies",   color: 0x8a6a3a, dark: 0x453519, value: 30,  next: null, desc: "Travel rations packed at the Kitchen. Three supplies grant standard Mine entry." },

  tile_grass_heather:      { kind: "tile", biome: "farm", label: "Heather",      color: 0x7a4f8a, dark: 0x3a2548, value: 1, next: "hay_bundle", sway: { amp: 2.5, freq: 0.00060, gust: 0.10 } },
  tile_grain_corn:         { kind: "tile", biome: "farm", label: "Corn",         color: 0xf4c84a, dark: 0x7a6020, value: 1, next: "flour", sway: { amp: 4.0, freq: 0.00060, gust: 0.18 } },
  tile_grain_buckwheat:    { kind: "tile", biome: "farm", label: "Buckwheat",    color: 0x9ab548, dark: 0x4a5820, value: 1, next: "flour", sway: { amp: 3.5, freq: 0.00058, gust: 0.16 } },
  tile_grain_manna:        { kind: "tile", biome: "farm", label: "Manna",        color: 0xf8e8c0, dark: 0x7a6e58, value: 1, next: "flour", sway: { amp: 1.5, freq: 0.00040, gust: 0.06 } },
  tile_grain_rice:         { kind: "tile", biome: "farm", label: "Rice",         color: 0xc8d878, dark: 0x60683c, value: 1, next: "flour", sway: { amp: 3.0, freq: 0.00056, gust: 0.14 } },
  tile_fruit_apple:        { kind: "tile", biome: "farm", label: "Apple",        color: 0xd4543a, dark: 0x6a2a18, value: 1, next: "pie", sway: { amp: 1.2, freq: 0.00040, gust: 0.06 } },
  tile_fruit_pear:         { kind: "tile", biome: "farm", label: "Pear",         color: 0xbcc436, dark: 0x5e6018, value: 1, next: "pie", sway: { amp: 1.2, freq: 0.00040, gust: 0.06 } },
  tile_fruit_golden_apple: { kind: "tile", biome: "farm", label: "Golden Apple", color: 0xf4c430, dark: 0x7a6010, value: 1, next: "pie", sway: { amp: 1.2, freq: 0.00040, gust: 0.06 } },
  tile_fruit_blackberry:   { kind: "tile", biome: "farm", label: "Blackberry",   color: 0x3a1a4a, dark: 0x180a20, value: 1, next: "jam", sway: { amp: 1.0, freq: 0.00038, gust: 0.05 } },
  tile_fruit_rambutan:     { kind: "tile", biome: "farm", label: "Rambutan",     color: 0xd8344a, dark: 0x6a1820, value: 1, next: "pie", sway: { amp: 1.4, freq: 0.00042, gust: 0.07 } },
  tile_fruit_starfruit:    { kind: "tile", biome: "farm", label: "Starfruit",    color: 0xe8c83c, dark: 0x726018, value: 1, next: "pie", sway: { amp: 1.0, freq: 0.00040, gust: 0.05 } },
  tile_fruit_coconut:      { kind: "tile", biome: "farm", label: "Coconut",      color: 0x5e3a14, dark: 0x2e1c08, value: 1, next: "pie", sway: { amp: 0.8, freq: 0.00030, gust: 0.04 } },
  tile_fruit_lemon:        { kind: "tile", biome: "farm", label: "Lemon",        color: 0xf4d030, dark: 0x7a6818, value: 1, next: "pie", sway: { amp: 1.2, freq: 0.00042, gust: 0.06 } },
  tile_fruit_jackfruit:    { kind: "tile", biome: "farm", label: "Jackfruit",    color: 0xa8a040, dark: 0x52501c, value: 1, next: "pie", sway: { amp: 1.0, freq: 0.00038, gust: 0.05 } },
  tile_flower_pansy:       { kind: "tile", biome: "farm", label: "Pansy",        color: 0x7a3aa8, dark: 0x3c1c54, value: 1, next: "honey", sway: { amp: 2.6, freq: 0.00070, gust: 0.14 } },
  tile_flower_water_lily:  { kind: "tile", biome: "farm", label: "Water Lily",   color: 0xe890c0, dark: 0x70486a, value: 1, next: "honey", sway: { amp: 0.8, freq: 0.00026, gust: 0.04 } },
  tile_tree_oak:           { kind: "tile", biome: "farm", label: "Oak",          color: 0x3a6818, dark: 0x1a3008, value: 1, next: "plank", sway: { amp: 1.6, freq: 0.00030, gust: 0.10 } },
  tile_tree_birch:         { kind: "tile", biome: "farm", label: "Birch",        color: 0xa8c038, dark: 0x546018, value: 1, next: "plank", sway: { amp: 2.2, freq: 0.00034, gust: 0.12 } },
  tile_tree_willow:        { kind: "tile", biome: "farm", label: "Willow",       color: 0x5a8a18, dark: 0x2a4008, value: 1, next: "plank", sway: { amp: 3.0, freq: 0.00038, gust: 0.18 } },
  tile_tree_fir:           { kind: "tile", biome: "farm", label: "Fir",          color: 0x2a5008, dark: 0x142404, value: 1, next: "plank", sway: { amp: 0.6, freq: 0.00024, gust: 0.04 } },
  tile_tree_cypress:       { kind: "tile", biome: "farm", label: "Cypress",      color: 0x1a3a08, dark: 0x0a1804, value: 1, next: "plank", sway: { amp: 0.4, freq: 0.00020, gust: 0.02 } },
  tile_tree_palm:          { kind: "tile", biome: "farm", label: "Palm Tree",    color: 0x5a8a18, dark: 0x2a4008, value: 1, next: "plank", sway: { amp: 2.8, freq: 0.00040, gust: 0.16 } },
  tile_bird_pheasant:      { kind: "tile", biome: "farm", label: "Pheasant",     color: 0x8a4a18, dark: 0x44230a, value: 1, next: "eggs", sway: { amp: 1.0, freq: 0.00040, gust: 0.05 } },
  tile_bird_chicken:       { kind: "tile", biome: "farm", label: "Chicken",      color: 0xf0d8a0, dark: 0x786a48, value: 1, next: "eggs", sway: { amp: 1.0, freq: 0.00040, gust: 0.05 } },
  tile_bird_hen:           { kind: "tile", biome: "farm", label: "Hen",          color: 0xa86838, dark: 0x52321a, value: 1, next: "eggs", sway: { amp: 1.0, freq: 0.00040, gust: 0.05 } },
  tile_bird_rooster:       { kind: "tile", biome: "farm", label: "Rooster",      color: 0xd81818, dark: 0x6a0a0a, value: 1, next: "eggs", sway: { amp: 1.2, freq: 0.00044, gust: 0.06 } },
  tile_bird_wild_goose:    { kind: "tile", biome: "farm", label: "Wild Goose",   color: 0xa89878, dark: 0x524a3a, value: 1, next: "eggs", sway: { amp: 1.2, freq: 0.00044, gust: 0.06 } },
  tile_bird_goose:         { kind: "tile", biome: "farm", label: "Goose",        color: 0xfffce8, dark: 0x807e74, value: 1, next: "eggs", sway: { amp: 1.2, freq: 0.00044, gust: 0.06 } },
  tile_bird_parrot:        { kind: "tile", biome: "farm", label: "Parrot",       color: 0xd81818, dark: 0x6a0a0a, value: 1, next: "eggs", sway: { amp: 1.4, freq: 0.00046, gust: 0.07 } },
  tile_bird_phoenix:       { kind: "tile", biome: "farm", label: "Phoenix",      color: 0xf8a020, dark: 0x7c500e, value: 1, next: "eggs", sway: { amp: 1.6, freq: 0.00050, gust: 0.10 } },
  tile_bird_dodo:          { kind: "tile", biome: "farm", label: "Dodo",         color: 0xa89878, dark: 0x524a3a, value: 1, next: "eggs", sway: { amp: 0.8, freq: 0.00036, gust: 0.04 } },
  tile_bird_pig_in_disguise: { kind: "tile", biome: "farm", label: "Pig in Disguise", color: 0xe88a98, dark: 0x72424a, value: 1, next: "eggs", sway: { amp: 0.8, freq: 0.00036, gust: 0.04 } },
  tile_herd_pig:           { kind: "tile", biome: "farm", label: "Pig",          color: 0xe88a98, dark: 0x72424a, value: 1, next: "meat", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
  tile_herd_hog:           { kind: "tile", biome: "farm", label: "Hog",          color: 0xa87838, dark: 0x523a1a, value: 1, next: "meat", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
  tile_herd_boar:          { kind: "tile", biome: "farm", label: "Boar",         color: 0x241408, dark: 0x100804, value: 1, next: "meat", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
  tile_herd_warthog:       { kind: "tile", biome: "farm", label: "Warthog",      color: 0x5a4828, dark: 0x2c2412, value: 1, next: "meat", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
  tile_herd_sheep:         { kind: "tile", biome: "farm", label: "Sheep",        color: 0xfffce8, dark: 0x807e74, value: 1, next: "meat", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
  tile_herd_alpaca:        { kind: "tile", biome: "farm", label: "Alpaca",       color: 0xf8e8c8, dark: 0x7c7264, value: 1, next: "meat", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
  tile_herd_goat:          { kind: "tile", biome: "farm", label: "Goat",         color: 0xd8c098, dark: 0x6c604a, value: 1, next: "meat", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
  tile_herd_ram:           { kind: "tile", biome: "farm", label: "Ram",          color: 0xa87838, dark: 0x523a1a, value: 1, next: "meat", sway: { amp: 0.6, freq: 0.00028, gust: 0.04 } },
  tile_cattle_cow:         { kind: "tile", biome: "farm", label: "Cow",          color: 0xfffce8, dark: 0x807e74, value: 1, next: "milk", sway: { amp: 0.4, freq: 0.00022, gust: 0.03 } },
  tile_cattle_longhorn:    { kind: "tile", biome: "farm", label: "Longhorn",     color: 0xd89048, dark: 0x6a4820, value: 1, next: "milk", sway: { amp: 0.4, freq: 0.00022, gust: 0.03 } },
  tile_cattle_triceratops: { kind: "tile", biome: "farm", label: "Triceratops",  color: 0x5a8a28, dark: 0x2c4414, value: 1, next: "milk", sway: { amp: 0.4, freq: 0.00022, gust: 0.03 } },
  tile_mount_horse:        { kind: "tile", biome: "farm", label: "Horse",        color: 0xa86838, dark: 0x52321a, value: 1, next: "horseshoe", sway: { amp: 0.4, freq: 0.00022, gust: 0.03 } },
  tile_mount_donkey:       { kind: "tile", biome: "farm", label: "Donkey",       color: 0x8a8478, dark: 0x44423a, value: 1, next: "horseshoe", sway: { amp: 0.4, freq: 0.00022, gust: 0.03 } },
  tile_mount_moose:        { kind: "tile", biome: "farm", label: "Moose",        color: 0x5a3814, dark: 0x2c1c0a, value: 1, next: "horseshoe", sway: { amp: 0.4, freq: 0.00022, gust: 0.03 } },
  tile_mount_mammoth:      { kind: "tile", biome: "farm", label: "Mammoth",      color: 0xa87838, dark: 0x523a1a, value: 1, next: "horseshoe", sway: { amp: 0.4, freq: 0.00022, gust: 0.03 } },

  // Mine tiles/resources (flat one-step chain: tile -> terminal resource)
  tile_mine_stone:        { kind: "tile", biome: "mine", label: "Stone",      color: 0x9da3a8, dark: 0x3e4348, value: 1, next: "block" },
  tile_mine_iron_ore:     { kind: "tile", biome: "mine", label: "Iron Ore",   color: 0xa89890, dark: 0x4a3e3a, value: 3, next: "iron_bar", sway: { amp: 0.4, freq: 0.00020, gust: 0.00 } },
  tile_mine_copper_ore:   { kind: "tile", biome: "mine", label: "Copper Ore", color: 0xc97f4f, dark: 0x6a3a18, value: 3, next: "copper_bar", sway: { amp: 0.4, freq: 0.00020, gust: 0.00 } },
  tile_mine_coal:         { kind: "tile", biome: "mine", label: "Coal",       color: 0x333333, dark: 0x000000, value: 2, next: "coke" },
  tile_mine_gem:          { kind: "tile", biome: "mine", label: "Gem",        color: 0x65e5ff, dark: 0x1686a3, value: 7, next: "cut_gem", sway: { amp: 1.2, freq: 0.00028, gust: 0.04 } },
  tile_mine_gold:         { kind: "tile", biome: "mine", label: "Gold",       color: 0xffd34c, dark: 0x946b11, value: 5, next: "gold_bar", sway: { amp: 1.0, freq: 0.00024, gust: 0.04 } },
  // Golden Coin — a treasure tile that pays out coins directly when chained
  // (no resource output: next is null, and "coin" has no TILE_FAMILY_RESOURCE
  // family, so producedResource() returns null). The coin payout comes from the
  // coin_bonus_per_tile ability on its TILE_TYPES entry. Not in MINE_TILE_POOL,
  // so it never spawns naturally.
  tile_coin_golden:       { kind: "tile", biome: "mine", label: "Golden Coin", color: 0xffd34c, dark: 0x8a5a0c, value: 5, next: null, sway: { amp: 0.6, freq: 0.00022, gust: 0.03 } },
  // Special family (custom mechanics — dirt feeds rune countdown with mysterious ore).
  tile_special_dirt:      { kind: "tile", biome: "mine", label: "Dirt", color: 0x7a6850, dark: 0x3e3a36, value: 1, next: "dirt" },
  // Terminal mine resources.
  block:       { kind: "resource", biome: "mine", label: "Block",   color: 0x7c8388, dark: 0x2a2e32, value: 6,  next: null },
  cut_gem:     { kind: "resource", biome: "mine", label: "Cut Gem", color: 0xa3f0ff, dark: 0x1686a3, value: 14, next: null },
  coke:        { kind: "resource", biome: "mine", label: "Coke",    color: 0x5a5a60, dark: 0x1a1a20, value: 9,  next: null },
  iron_bar:    { kind: "resource", biome: "mine", label: "Iron Bar",   color: 0x8a8e94, dark: 0x3a3e44, value: 8,  next: null },
  copper_bar:  { kind: "resource", biome: "mine", label: "Copper Bar", color: 0xc97f3c, dark: 0x6a3e18, value: 8,  next: null },
  gold_bar:    { kind: "resource", biome: "mine", label: "Gold Bar",   color: 0xf4c430, dark: 0x7a6010, value: 16, next: null },

  // Harbor tiles/resources (flat one-step chain)
  tile_fish_sardine:  { kind: "tile", biome: "fish", label: "Sardine",  color: 0x9ab8c4, dark: 0x4a5e68, value: 1, next: "fish_fillet", sway: { amp: 1.4, freq: 0.00050, gust: 0.08 } },
  tile_fish_mackerel: { kind: "tile", biome: "fish", label: "Mackerel", color: 0x4a7a9a, dark: 0x223a4a, value: 2, next: "fish_fillet", sway: { amp: 1.6, freq: 0.00052, gust: 0.10 } },
  tile_fish_clam:     { kind: "tile", biome: "fish", label: "Clam",     color: 0xc8a888, dark: 0x705a40, value: 2, next: "sea_shells", sway: { amp: 0.4, freq: 0.00020, gust: 0.02 } },
  tile_fish_oyster:   { kind: "tile", biome: "fish", label: "Oyster",   color: 0xd0c0a8, dark: 0x6a5e48, value: 3, next: "pearls", sway: { amp: 0.4, freq: 0.00020, gust: 0.02 } },
  tile_fish_kelp:     { kind: "tile", biome: "fish", label: "Kelp",     color: 0x3a6a3a, dark: 0x1a3818, value: 1, next: "fish_oil", sway: { amp: 3.0, freq: 0.00060, gust: 0.18 } },
  // Special family fish — Giant Pearl, triggers +1 rune on special chain validation.
  tile_special_giant_pearl: { kind: "tile", biome: "fish", label: "Giant Pearl", color: 0xefe8d8, dark: 0x6a6258, value: 0, next: null },
  fish_fillet:   { kind: "resource", biome: "fish", label: "Fillet",   color: 0xe8c8b0, dark: 0x7a604c, value: 8, next: null },
  fish_oil:      { kind: "resource", biome: "fish", label: "Fish Oil", color: 0xe8d050, dark: 0x7a6818, value: 6, next: null },
  sea_shells:    { kind: "resource", biome: "fish", label: "Sea Shells", color: 0xf4ead0, dark: 0x80755a, value: 5, next: null },
  pearls:        { kind: "resource", biome: "fish", label: "Pearls",     color: 0xe8e0e8, dark: 0x807888, value: 12, next: null },

  // Tools — behavior, animation, and arm copy are data-driven via `power` (TOOL_POWERS catalog).
  // Field starter tools
  clear:    { kind: "tool", label: "Scythe", power: { id: "clear_random_n", params: { count: 6 }, anim: "sweep", ms: 240, bubble: "Scythe — clearing tiles!" }, desc: "Clears six random tiles and harvests their basic resources." },
  basic:    { kind: "tool", label: "Seedpack", power: { id: "transform_random_n", params: { count: 5, to: "biome_base" }, anim: "popIn", ms: 220, tint: 0x88ff88, bubble: "Seedpack — placing seeds!" }, desc: "Plants five fresh basic-resource tiles in random spots on the board." },
  rare:     { kind: "tool", label: "Lockbox", power: { id: "transform_random_n", params: { count: 3, to: "biome_rare" }, anim: "goldenFlash", ms: 220, tint: 0xffd248, bubble: "Lockbox — placing rare tiles!" }, desc: "Drops three rare-resource tiles onto the board." },
  shuffle:  { kind: "tool", label: "Reshuffle Horn", power: { id: "reshuffle_board", params: {}, bubble: "Reshuffle Horn — board reshuffled!" }, desc: "Reshuffles every tile on the board for a fresh layout." },
  bomb:     { kind: "tool", label: "Bomb", power: { id: "area_blast", params: { radius: 1 }, tint: 0xff4444, anim: "sweep", ms: 220, bubble: "Bomb armed — tap a tile to detonate!" }, desc: "Tap a tile — destroys a 3×3 area around it." },
  rake:        { kind: "tool", label: "Rake", power: { id: "clear_component", params: {}, tint: 0x88ff88, anim: "sweep", ms: 220, bubble: "Rake armed — tap a connected patch!" }, desc: "Tap a tile — sweeps every 4-connected tile of the same type and collects them." },
  axe:         { kind: "tool", label: "Axe", power: { id: "clear_category", params: { target: "trees" }, anim: "sweep", ms: 300, tint: 0x8b6914 }, desc: "Fells all tree tiles on the board instantly — every oak and related tree is swept into inventory." },
  sickle:      { kind: "tool", label: "Sickle", power: { id: "clear_row", params: {}, tint: 0xff9900, anim: "sweep", ms: 220, bubble: "Sickle armed — tap a row to harvest!" }, desc: "Sweeps a single row in one stroke. Tap any tile to harvest that entire row." },
  fertilizer:  { kind: "tool", label: "Fertilizer", power: { id: "fill_bias", params: { target: "tile_grain_wheat", turns: 1 }, anim: "shimmer", ms: 600 }, desc: "Biases the next board fill toward grain tiles." },
  cat:         { kind: "tool", label: "Cat", power: { id: "clear_hazard", params: { target: "rats" }, anim: "scatter", ms: 200 }, desc: "Dispatches a mouser to clear all active rat hazards from the farm in one go." },
  bird_cage:   { kind: "tool", label: "Bird Cage", power: { id: "clear_all", params: { target: "tile_bird_chicken" }, anim: "cage", ms: 300 }, desc: "Sweeps all chicken tiles from the board — useful when bird tiles are flooding the farm." },
  scythe_full: { kind: "tool", label: "Scythe (full)", power: { id: "clear_all", params: { target: "tile_grain_wheat" }, anim: "sweep", ms: 300 }, desc: "Harvests all wheat tiles at once, clearing the board for a fresh fill." },
  rifle:       { kind: "tool", label: "Rifle", power: { id: "clear_hazard", params: { target: "wolves" }, anim: "shot", ms: 300 }, desc: "Drives off all active wolves permanently, ending the wolf hazard immediately." },
  hound:       { kind: "tool", label: "Hound", power: { id: "scatter_hazard", params: { target: "wolves", turns: 5 }, anim: "bark", ms: 400 }, desc: "Scares the wolves away for several turns, buying time to chain away their target tiles." },
  hoe:         { kind: "tool", label: "Hoe", power: { id: "clear_all", params: { target: "tile_veg_carrot" }, anim: "till", ms: 300 }, desc: "Tills the soil — clears every veg-carrot tile from the board so a fresh fill can roll." },
  stone_hammer:{ kind: "tool", label: "Stone Hammer", power: { id: "clear_all", params: { target: "tile_mine_stone" }, anim: "smash", ms: 350 }, desc: "Smashes every stone tile on the board — a fast way to feed the chain into block tier." },
  iron_pick:   { kind: "tool", label: "Iron Pick", power: { id: "clear_all", params: { target: "tile_mine_iron_ore" }, anim: "pick", ms: 320 }, desc: "Bites into iron ore veins — clears every iron ore tile so the chain can be re-spawned cleanly." },
  auger: { kind: "tool", label: "Auger", power: { id: "clear_column", params: {}, tint: 0x9da3a8, anim: "pick", ms: 280, bubble: "Auger armed — tap a column to bore!" }, desc: "Tap a column — bores straight down, clearing every tile in it." },
  blast_charge: { kind: "tool", label: "Blast Charge", power: { id: "clear_cross", params: {}, tint: 0xff8844, anim: "sweep", ms: 300, bubble: "Blast Charge armed — tap to blast a cross!" }, desc: "Tap a tile — clears its entire row and column in a cross-shaped blast." },
  bird_feed:   { kind: "tool", label: "Bird Feed", power: { id: "fill_bias", params: { target: "tile_bird_chicken" }, anim: "scatter", ms: 500 }, desc: "Scatters feed across the field so the next board fill is biased toward bird tiles." },
  sapling:     { kind: "tool", label: "Sapling", power: { id: "fill_bias", params: { target: "tile_tree_oak" }, anim: "shimmer", ms: 600 }, desc: "Plants a sapling that biases the next fill toward oak (and other tree) tiles." },
  water_pump:  { kind: "tool", label: "Water Pump", power: { id: "water_pump", params: {} }, desc: "Lava Damper — floods all lava cells on the mine board, converting them to stone rubble. PC2's water-collector Water Pump is deferred (no water tile family)." },
  explosives:  { kind: "tool", label: "Explosives", power: { id: "explosives", params: {} }, desc: "Clears every cave-in and mole hazard from the mine." },

  // ── Phase 3 net-new tools (tool-powers overhaul) ────────────────────────
  // Farm tools — all use typed powers exclusively (no legacy effect/target).
  trimmer:        { kind: "tool", label: "Trimmer", anim: "sweep", ms: 320, power: { id: "transform_tiles", params: { from: "trees", to: "tile_grass_hay" } }, desc: "Heavy garden shears — transforms every tree tile into hay so the chain can roll fresh." },
  plough:         { kind: "tool", label: "Plough", anim: "sweep", ms: 360, power: { id: "clear_category", params: { target: ["grass", "grain"] } }, desc: "Two-furrow plough that harvests every grass AND grain tile in one pass." },
  fruit_picker:   { kind: "tool", label: "Fruit Picker", anim: "pick", ms: 320, power: { id: "clear_category", params: { target: "fruits" } }, desc: "Long-handled basket that gathers every fruit tile on the board at once." },
  herders_crook:  { kind: "tool", label: "Herder's Crook", anim: "sweep", ms: 360, power: { id: "clear_category", params: { target: "herd_animals" } }, desc: "A shepherd's crook that rounds up every herd animal tile in one motion." },
  milk_churn:     { kind: "tool", label: "Milk Churn", anim: "sweep", ms: 380, power: { id: "clear_category", params: { target: "cattle" } }, desc: "A heavy churn that calls all the cattle in — sweeps every cattle tile from the board." },
  saddle:         { kind: "tool", label: "Saddle", anim: "sweep", ms: 380, power: { id: "clear_category", params: { target: "mounts" } }, desc: "A worn riding saddle — collects every mount tile on the board into your inventory." },
  bee:            { kind: "tool", label: "Bee", anim: "shimmer", ms: 420, power: { id: "transform_tiles", params: { from: "flowers", to: "tile_fruit_apple" } }, desc: "A worker bee that pollinates every flower tile, ripening them into apple fruit tiles." },
  terrier:        { kind: "tool", label: "Terrier", anim: "scatter", ms: 240, power: { id: "clear_hazard", params: { target: "rats" } }, desc: "A wiry rat-catcher — bolts through the board clearing every rat hazard from the farm." },

  // Mine tools.
  drill:          { kind: "tool", label: "Drill", anim: "smash", ms: 400, power: { id: "transform_tiles", params: { from: "dirt", to: "tile_mine_stone" } }, desc: "A pneumatic drill — converts every special-dirt tile in the mine into rough stone tiles." },
  coal_hammer:    { kind: "tool", label: "Coal Hammer", anim: "smash", ms: 340, power: { id: "clear_category", params: { target: "coal" } }, desc: "A short-handled hammer that breaks every coal tile loose in one sweep." },
  gold_pick:      { kind: "tool", label: "Gold Pick", anim: "pick", ms: 340, power: { id: "clear_category", params: { target: "gold" } }, desc: "A reinforced pick that strikes every gold tile from the board into your stockpile." },
  // Magnet — the plan flags an inventory-credit concern with `transform_adjacent`
  // (the player loses the ore tile without it landing in inventory). We adopt
  // the plan's first option (convert ores → stone) and flag the credit gap as
  // DONE_WITH_CONCERNS rather than introduce a new `sweep_adjacent` power. The
  // player still has to chain the resulting stones for the resource.
  magnet:         { kind: "tool", label: "Magnet", anim: "shimmer", ms: 320, power: { id: "transform_adjacent", params: { from: ["coal", "iron", "gold", "gem"], to: "tile_mine_stone", radius: 1 } }, desc: "Tap a tile — collapses every ore tile (coal/iron/gold/gem) in a 3×3 area into stone rubble for re-chaining." },
  coal_transmuter:{ kind: "tool", label: "Coal Transmuter", anim: "shimmer", ms: 380, power: { id: "transform_adjacent", params: { from: ["stone", "iron", "gold", "gem"], to: "tile_mine_coal", radius: 1 } }, desc: "Tap a tile — transmutes stone and lesser ore in a 3×3 area into coal tiles, fueling the forge." },

  // ── Phase 3 magic-tier tools (Portal) ───────────────────────────────────
  // Existing magic tools — declarative power metadata only; runtime stays in
  // src/features/portal/slice.js to preserve current routing.
  magic_wand:        { kind: "tool", label: "Magic Wand", power: { id: "tap_clear_type", params: {}, tint: 0xa070ff, anim: "sweep", ms: 240, bubble: "Magic Wand armed — tap a tile type to sweep!" }, desc: "Pick a tile type; collect every tile of that type on the board. No turn cost." },
  hourglass:         { kind: "tool", label: "Hourglass", power: { id: "undo_move", params: {} }, desc: "Restores the board, inventory, and turns to the moment before your last chain." },
  magic_seed:        { kind: "tool", label: "Magic Seed", power: { id: "restore_turns", params: { amount: 5 } }, desc: "Adds five turns to the current session." },
  magic_fertilizer:  { kind: "tool", label: "Magic Fertilizer", power: { id: "fill_bias", params: { target: "tile_grain_wheat", turns: 3 } }, desc: "The next three board fills spawn grain in every cell." },
  // Net-new magic tools.
  golden_apple:      { kind: "tool", label: "Golden Apple", power: { id: "transform_tiles", params: { from: "trees", to: "tile_fruit_apple" } }, desc: "A glowing apple — transforms every tree tile on the board into apple-fruit tiles." },
  golden_carrot:     { kind: "tool", label: "Golden Carrot", power: { id: "transform_tiles", params: { from: "grass", to: "tile_veg_carrot" } }, desc: "A shimmering carrot — transforms every grass tile on the board into carrot vegetable tiles." },
  golden_idol:       { kind: "tool", label: "Golden Idol", power: { id: "transform_tiles", params: { from: "grass", to: "tile_cattle_cow" } }, desc: "A small effigy — transforms every grass tile on the board into cattle (cow) tiles." },
  golden_sheep:      { kind: "tool", label: "Golden Sheep", power: { id: "transform_tiles", params: { from: "grass", to: "tile_herd_sheep" } }, desc: "A radiant fleece — transforms every grass tile on the board into sheep herd tiles." },
  philosophers_stone:{ kind: "tool", label: "Philosopher's Stone", power: { id: "transform_tiles", params: { from: "stone", to: "tile_mine_gold" } }, desc: "The mythic stone — transmutes every stone tile in the mine into gold tiles." },
  miners_hat:        { kind: "tool", label: "Miner's Hat", power: { id: "reveal_tiles", params: { target: ["coal", "iron", "gold", "gem"] } }, desc: "A lamp-fronted hat — reveals every hidden ore tile (coal, iron, gold, gem). No effect until hidden-tile spawning ships." },

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
  fish_oil_bottled: { kind: "resource", label: "Fish Oil (Bottled)", color: 0xe8d050, dark: 0x7a6018, value: 80, desc: "Refined kelp-and-fish oil sealed in a corked plank flask. Used by tinkers and tar-mongers, worth 80 coins." },
  cured_meat:    { kind: "resource", biome: "farm", label: "Cured Meat",    color: 0x8a4a26, dark: 0x4a2618, value: 45,  desc: "Salted and dried meat that lasts for weeks. Each unit grants 2 turns on expeditions." },
  iron_ration:   { kind: "resource", biome: "mine", label: "Iron Ration",   color: 0x5a5a60, dark: 0x2a2a30, value: 120, desc: "A calorie-dense, hard-packed block of dried grain and fat. Each unit grants 4 turns on expeditions." },
  festival_loaf: { kind: "resource", biome: "farm", label: "Festival Loaf", color: 0xd49060, dark: 0x7a4a28, value: 60,  desc: "A rich, fruit-studded bread baked for seasonal feasts. Each unit grants 2 turns on expeditions." },
  wedding_pie:   { kind: "resource", biome: "farm", label: "Wedding Pie",  color: 0xb05428, dark: 0x582818, value: 180, desc: "A massive, multi-layered berry pie traditionally served at Hearthwood weddings. Each unit grants 3 turns on expeditions." },
};

/** Closed catalog — keys must exist in {@link ItemKey} enums in `types/catalog/itemKeys.ts`. */
export const ITEMS = {
  ...ITEMS_DATA,
  iron_frame: ITEMS_DATA.ironframe as ResourceItemEntry,
  gem_crown: ITEMS_DATA.gemcrown as ResourceItemEntry,
  gold_ring: ITEMS_DATA.goldring as ResourceItemEntry,
} as ItemRecord;

// ── Compile-time key-coverage check ─────────────────────────────────────────
// Mirrors `src/__tests__/catalog-keys-invariants.test.ts` at the type level:
// every `ItemKey` enum member must appear as a key of the literal ITEMS object,
// and no extra keys may exist. Mismatches surface as a `tsc` error naming the
// offending keys via the `_MissingItemKeys` / `_ExtraItemKeys` check rows below.
//
// `${ItemKey}` coerces the enum members to their underlying string-literal
// values — TS treats enum singletons and structurally identical string
// literals as mutually assignable but not type-equal, so a direct
// `Exclude<ItemKey, "tile_grass_hay">` does *not* remove `TileKey.TileGrassHay`
// and the check would spuriously report every literal key as "extra".
const _ITEMS_KEY_LITERAL = {
  ...ITEMS_DATA,
  iron_frame: ITEMS_DATA.ironframe,
  gem_crown: ITEMS_DATA.gemcrown,
  gold_ring: ITEMS_DATA.goldring,
};
type _ItemKeyValue = `${ItemKey}`;
type _MissingItemKeys = Exclude<_ItemKeyValue, keyof typeof _ITEMS_KEY_LITERAL>;
type _ExtraItemKeys = Exclude<keyof typeof _ITEMS_KEY_LITERAL, _ItemKeyValue>;
// Non-distributive `[T] extends [never]` so the check resolves to `true` only
// when each side is empty (a bare `T extends never` distributes and collapses
// to `never` on either side, defeating the assertion).
const _MISSING_ITEM_KEYS_MUST_BE_NEVER: [_MissingItemKeys] extends [never] ? true : _MissingItemKeys = true;
const _EXTRA_ITEM_KEYS_MUST_BE_NEVER: [_ExtraItemKeys] extends [never] ? true : _ExtraItemKeys = true;
void _MISSING_ITEM_KEYS_MUST_BE_NEVER;
void _EXTRA_ITEM_KEYS_MUST_BE_NEVER;

/** Safe ITEMS lookup; returns undefined for unknown keys. */
export function getItem(key: string): ItemEntry | undefined {
  if (!(key in ITEMS)) return undefined;
  return ITEMS[key as ItemKey];
}

// ── Phase 3a: split ITEMS into three kind-specific maps ───────────────────
// These are the canonical home for tile/resource/tool data. ITEMS is kept as
// a generated re-export for back-compat during the migration; new code should
// reach for TILES / RESOURCES / TOOLS by kind.
export const TILES = Object.freeze(
  Object.fromEntries(
    Object.entries(ITEMS).filter((entry): entry is [string, TileItemEntry] => isTileItemEntry(entry[1])),
  ),
) as TileRecord;
export const RESOURCES = Object.freeze(
  Object.fromEntries(
    Object.entries(ITEMS).filter((entry): entry is [string, ResourceItemEntry] => isResourceItemEntry(entry[1])),
  ),
) as ResourceRecord;
export const TOOLS = Object.freeze(
  Object.fromEntries(
    Object.entries(ITEMS).filter((entry): entry is [string, ToolItemEntry] => isToolItemEntry(entry[1])),
  ),
) as ToolRecord;

// Lifted palette: `palette.bg` is now the biome ACCENT strip color (drawn as
// a thin top edge of the board, not the board fill). `tile_special_dirt` is the
// board's outer frame tone — a soft cream border that lifts into the
// parchment family. `dark` is the ink color used for text contrast.
// `dirtColor` is the tile sprite's dirt/floor color (kept readable against
// parchment without being a saturated brown).

export const BIOMES: BiomeRecord = {
  farm: {
    name: "Farm",
    special_dirt: 0xc9b993,
    dark: 0x2b2218,
    dirtColor: 0xb8a378,
    palette: { bg: 0x7fa848, accent: 0x6f8a3a, dim: 0xc9b993 },
    tilePool: FARM_TILE_POOL,
    pool: FARM_TILE_POOL,
    tiles: [],
    resources: [],
    resourceOrderPool: [],
  },
  mine: {
    name: "Mine",
    special_dirt: 0xc9b993,
    dark: 0x2b2218,
    dirtColor: 0xb8b0a2,
    palette: { bg: 0x6a7d92, accent: 0x7a8ca0, dim: 0xc9b993 },
    tilePool: MINE_TILE_POOL,
    pool: MINE_TILE_POOL,
    tiles: [],
    resources: [],
    resourceOrderPool: [],
  },
  fish: {
    name: "Harbor",
    special_dirt: 0xc9b993,
    dark: 0x2b2218,
    dirtColor: 0xb8b0a2,
    palette: { bg: 0x4a8aa8, accent: 0x6aa0c0, dim: 0xc9b993 },
    tilePool: FISH_TILE_POOL,
    pool: FISH_TILE_POOL,
    tiles: [],
    resources: [],
    resourceOrderPool: [],
  },
};

// Populate biome-specific arrays from ITEMS. Each biome gets:
//   .tiles — kind:"tile" entries matching the biome (board tiles)
//   .resources — kind:"resource" entries matching the biome (chain outputs)
//   .resourceOrderPool — resource keys drawn from chain outputs of biome tiles
//     (used by makeOrder; avoids the old bug where orders were keyed on tile keys)
for (const b of Object.values(BIOMES)) {
  if (!isBiomeDefinition(b)) continue;
  const biomeFilter = b.name === "Harbor" ? "fish" : b.name.toLowerCase();
  const allEntries = Object.entries(ITEMS)
    .filter((entry): entry is [string, ItemEntry] => isItemEntry(entry[1]) && entry[1].biome === biomeFilter)
    .map(([key, item]) => ({ key, ...item }));
  b.tiles     = allEntries.filter((e): e is BiomeItemEntry<TileItemEntry> => e.kind === "tile");
  b.resources = allEntries.filter((e): e is BiomeItemEntry<ResourceItemEntry> => e.kind === "resource");
  // Resource order pool: unique resource keys produced by chaining this biome's tiles.
  const seen = new Set<string>();
  b.resourceOrderPool = b.tiles
    .map((t) => t.next)
    .filter((k: string | null | undefined): k is string => k != null && !seen.has(k) && Boolean(seen.add(k)))
    .filter((k: string) => {
      const item = getItem(k);
      return item ? isResourceItemEntry(item) : false;
    });
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
  { id: "hearth", name: "Hearth", desc: "The heart of the village. Keeps folk warm and anchors the community.", cost: { coins: 0 }, lv: 1, x: 60, y: 360, w: 90, h: 110, color: "#a8431a" },
  { id: "mill", name: "Mill", desc: "Grinds and sorts harvest goods — reduces the flour needed to bake bread by 1.", cost: { coins: 200, plank: 30 }, lv: 1, x: 200, y: 380, w: 80, h: 90, color: "#c8923a",
    abilities: [{ id: "recipe_input_reduce", params: { recipe: "rec_bread", input: "flour", amount: 1 } }] },
  { id: "bakery", name: "Bakery", desc: "Craft baked goods — bread, honey rolls, harvest pies — to sell for coins.", cost: { coins: 500, plank: 40, block: 10 }, lv: 1, x: 320, y: 360, w: 100, h: 110, color: "#8a4a26" },
  { id: "inn", name: "Inn", desc: "A warm roadside inn where travellers rest by the fire.", cost: { coins: 250, plank: 15 }, lv: 2, x: 470, y: 350, w: 110, h: 130, color: "#4f6b3a" },
  {
    id: "granary",
    name: "Granary",
    desc: "Keeps the harvest safe, adds +1 turn to farm sessions, and raises the inventory cap by 300.",
    cost: { coins: 150, plank: 10 },
    lv: 1,
    x: 600,
    y: 380,
    w: 80,
    h: 100,
    color: "#c5a87a",
    abilities: [
      { id: "turn_budget_bonus", params: { amount: 1 } },
      { id: "inventory_cap_bonus", params: { amount: 300 } },
    ],
  },
  {
    id: "mining_camp",
    name: "Mining Camp",
    desc: "Adds +1 expedition turn when departing for mine expeditions.",
    cost: { coins: 200, plank: 15 },
    lv: 1,
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    color: "#8a7a6a",
    hidden: true,
    abilities: [{ id: "turn_budget_bonus", params: { amount: 1 } }],
  },
  { id: "larder", name: "Larder", desc: "Preserve and bottle your harvest. Craft preserve jars and berry tinctures for coins.", cost: { coins: 250, plank: 15 }, lv: 2, x: 700, y: 395, w: 70, h: 85, color: "#4f6b3a" },
  { id: "forge", name: "Forge", desc: "Smith metal goods — hinges, lanterns, rings, and more — for high coin rewards.", cost: { coins: 1200, block: 60, iron_bar: 20 }, lv: 8, x: 800, y: 380, w: 100, h: 100, color: "#5a6973" },
  { id: "caravan_post", name: "Caravan Post", desc: "Opens distant trade routes, letting you sell crafted goods to far-off markets.", cost: { coins: 800, plank: 40 }, lv: 8, x: 940, y: 390, w: 110, h: 90, color: "#7e4f24" },
  { id: "kitchen", name: "Kitchen", desc: "Converts surplus grain into supplies. Three supplies grant standard Mine entry.", cost: { coins: 400, plank: 20 }, lv: 2, x: 60, y: 260, w: 90, h: 100, color: "#8a4a26" },
  { id: "workshop", name: "Workshop", desc: "Crafts tools from raw materials.", cost: { coins: 500, plank: 20, block: 10 }, lv: 3, x: 180, y: 265, w: 90, h: 100, color: "#6a5a3a" },
  { id: "powder_store", name: "Powder Store", desc: "Stockpiles black powder. Produces 2 Bombs at the end of every season.", cost: { coins: 600, block: 30, iron_bar: 5 }, lv: 5, x: 310, y: 260, w: 90, h: 100, color: "#3a2a1a",
    abilities: [
      { id: "grant_tool", params: { tool: "bomb", amount: 2 }, trigger: "season_end" },
    ] },
  { id: "portal", name: "Magic Portal", desc: "A shimmering gateway. Summons unlock with Influence (Phase 8).", cost: { coins: 2000, runes: 5 }, lv: 8, x: 440, y: 245, w: 100, h: 115, color: "#4a2a7a" },
  { id: "housing", name: "Housing Block",
    desc: "Lodging for the settlement's hired hands — adds 1 to the hiring pool each season.",
    cost: { coins: 300, plank: 25 }, lv: 2,
    x: 430, y: 262, w: 80, h: 92, color: "#a07a4a",
    abilities: [
      { id: "worker_pool_step", params: { amount: 1 }, trigger: "season_end" },
    ] },
  { id: "housing2", name: "Housing Block",
    desc: "Lodging for the settlement's hired hands — adds 1 to the hiring pool each season.",
    cost: { coins: 300, plank: 25 }, lv: 2, requires: "housing",
    x: 520, y: 262, w: 80, h: 92, color: "#a07a4a",
    abilities: [
      { id: "worker_pool_step", params: { amount: 1 }, trigger: "season_end" },
    ] },
  { id: "housing3", name: "Housing Block",
    desc: "Lodging for the settlement's hired hands — adds 1 to the hiring pool each season.",
    cost: { coins: 300, plank: 25 }, lv: 2, requires: "housing2",
    x: 610, y: 262, w: 80, h: 92, color: "#a07a4a",
    abilities: [
      { id: "worker_pool_step", params: { amount: 1 }, trigger: "season_end" },
    ] },
  // Phase 12.5 — §18 LOCKED: Silos/Barns preserve tile layout between sessions
  { id: "silo", name: "Silo",
    desc: "Wood-and-stone grain store. Preserves the tile layout between sessions on the Farm.",
    cost: { coins: 250, plank: 15 }, lv: 4, biome: "farm",
    x: 710, y: 260, w: 90, h: 100, color: "#9a6a3a",
    abilities: [
      { id: "preserve_board", params: { biome: "farm" }, trigger: "session_end" },
    ] },
  { id: "barn", name: "Barn",
    desc: "Reinforced ore shed. Preserves the tile layout between sessions in the Mine.",
    cost: { coins: 400, plank: 25, block: 5 }, lv: 5, biome: "mine",
    x: 840, y: 260, w: 90, h: 100, color: "#7a4a2a",
    abilities: [
      { id: "preserve_board", params: { biome: "mine" }, trigger: "session_end" },
    ] },
  // Harbor-themed buildings — visual flavour for the fish biome and
  // counts toward the "Town Planner" achievement (5 distinct buildings).
  { id: "harbor_dock", name: "Harbor Dock",
    desc: "A sturdy plank-and-stone pier where the fishing dinghies tie up. Marks the village as a coastal port.",
    cost: { coins: 600, plank: 30, block: 10 }, lv: 3, biome: "fish",
    x: 60, y: 150, w: 110, h: 80, color: "#3a4a78" },
  { id: "fishmonger", name: "Fishmonger",
    desc: "A salt-stained shop where the day's catch is sorted, scaled, and sold.",
    cost: { coins: 800, plank: 30, fish_fillet: 6 }, lv: 4, biome: "fish",
    x: 210, y: 150, w: 100, h: 90, color: "#7a8aa6" },
  { id: "smokehouse", name: "Smokehouse",
    desc: "A peat-fired smoking shed that turns excess fish and meat into long-keeping rations.",
    cost: { coins: 700, plank: 25, block: 15 }, lv: 4,
    x: 350, y: 150, w: 90, h: 100, color: "#5a4030" },
  // Decorative flavour buildings — purely cosmetic town landmarks that count
  // toward town-planning achievements. No gameplay abilities.
  { id: "clock_tower", name: "Clock Tower",
    desc: "A tall civic tower whose painted clock face keeps the whole village on time.",
    cost: { coins: 900, plank: 40, block: 25 }, lv: 4,
    x: 500, y: 150, w: 70, h: 130, color: "#6a5a8a" },
  { id: "lighthouse", name: "Lighthouse",
    desc: "A whitewashed coastal beacon whose lamp sweeps the night to guide boats home.",
    cost: { coins: 1000, plank: 35, block: 30 }, lv: 4, biome: "fish",
    x: 640, y: 150, w: 70, h: 130, color: "#c8d0d6" },
  { id: "apothecary", name: "Apothecary",
    desc: "A timber-framed shop of bottles and dried herbs where village remedies are mixed.",
    cost: { coins: 700, plank: 30, block: 10 }, lv: 3,
    x: 780, y: 150, w: 90, h: 100, color: "#4a7a5a" },
  { id: "sawmill", name: "Sawmill",
    desc: "A water-driven sawmill — chaining oaks yields an extra plank.",
    cost: { coins: 800, plank: 20, block: 20 }, lv: 4,
    x: 900, y: 150, w: 100, h: 95, color: "#7a5a34",
    abilities: [{ id: "bonus_yield", params: { target: "tile_tree_oak", amount: 1 } }] },
  { id: "watchtower", name: "Watchtower",
    desc: "A timber lookout tower where a sentry keeps an eye on the roads and fields.",
    cost: { coins: 600, plank: 35, block: 10 }, lv: 3,
    x: 60, y: 60, w: 70, h: 130, color: "#5a6a4a" },
  { id: "stable", name: "Stable",
    desc: "A snug stable of stalls and a hayloft — chaining horses yields an extra horseshoe.",
    cost: { coins: 750, plank: 40, block: 10 }, lv: 3,
    x: 200, y: 60, w: 110, h: 95, color: "#8a5a34",
    abilities: [{ id: "bonus_yield", params: { target: "tile_mount_horse", amount: 1 } }] },
  { id: "apiary", name: "Apiary",
    desc: "A tidy row of bee skeps among the flowers — chaining pansies yields extra honey.",
    cost: { coins: 550, plank: 25 }, lv: 2,
    x: 360, y: 60, w: 90, h: 90, color: "#d6a83a",
    abilities: [{ id: "bonus_yield", params: { target: "tile_flower_pansy", amount: 1 } }] },
  { id: "chapel", name: "Chapel",
    desc: "A small stone chapel with a bell-cote and stained glass — tithes add 50 coins at season's end.",
    cost: { coins: 1100, plank: 30, block: 40 }, lv: 5,
    x: 500, y: 60, w: 90, h: 120, color: "#9a8e72",
    abilities: [{ id: "season_bonus", params: { resource: "coins", amount: 50 }, trigger: "season_end" }] },
  { id: "brewery", name: "Brewery",
    desc: "A steamy brewhouse of copper kettles and oak casks that turns grain into ale.",
    cost: { coins: 950, plank: 35, block: 20 }, lv: 4,
    x: 640, y: 60, w: 100, h: 100, color: "#7a4a26" },
  { id: "observatory", name: "Observatory",
    desc: "A domed observatory whose brass telescope charts the deep seams — gem chains upgrade to cut gems one step sooner.",
    cost: { coins: 1400, plank: 30, block: 45, iron_bar: 10 }, lv: 6,
    x: 780, y: 60, w: 90, h: 120, color: "#3a4a6a",
    abilities: [{ id: "threshold_reduce_category", params: { category: "mine_gem", amount: 1 } }] },
];

// `craftMs` is the wall-clock duration of a queued craft. When omitted, the
// recipe falls back to `CRAFT_QUEUE_HOURS` hours via `recipeCraftMs(key)`.
// Values below are demo-tuned (seconds-to-hours) so the queue UI is visible
// without waiting half a day; tune via Dev Panel for shipped balance.
const MIN = 60_000;
const HOUR = 60 * MIN;

export const RECIPES: RecipeRecord = {
  // Workshop recipes (Tools)
  rec_rake:        { item: "rake",          station: "workshop", inputs: { plank: 1 },                            craftMs: 1 * MIN },
  rec_axe:         { item: "axe",           station: "workshop", inputs: { block: 1 },                            craftMs: 1 * MIN },
  rec_sickle:      { item: "sickle",        station: "workshop", inputs: { plank: 1, iron_bar: 1 },               craftMs: 3 * MIN },
  rec_fertilizer:  { item: "fertilizer",    station: "workshop", inputs: { hay_bundle: 1, dirt: 1 },               craftMs: 3 * MIN },
  rec_cat:         { item: "cat",           station: "workshop", inputs: { block: 2, dirt: 1 },              craftMs: 5 * MIN },
  rec_bird_cage:   { item: "bird_cage",     station: "workshop", inputs: { hay_bundle: 1 },                             craftMs: 2 * MIN },
  rec_scythe_full: { item: "scythe_full",   station: "workshop", inputs: { block: 1 },                            craftMs: 5 * MIN },
  rec_rifle:       { item: "rifle",         station: "workshop", inputs: { plank: 1, block: 1, iron_bar: 1 }, craftMs: 30 * MIN },
  rec_hound:       { item: "hound",         station: "workshop", inputs: { bread: 1, block: 3 },                  craftMs: 15 * MIN },
  rec_hoe:         { item: "hoe",           station: "workshop", inputs: { plank: 1, block: 1 },             craftMs: 2 * MIN },
  rec_stone_hammer:{ item: "stone_hammer",  station: "workshop", inputs: { block: 2, plank: 1 },             craftMs: 5 * MIN },
  rec_iron_pick:   { item: "iron_pick",     station: "workshop", inputs: { iron_bar: 1, plank: 1 },             craftMs: 8 * MIN },
  rec_auger:       { item: "auger",         station: "workshop", inputs: { iron_bar: 1, plank: 1 },               craftMs: 5 * MIN },
  rec_blast_charge:{ item: "blast_charge",  station: "workshop", inputs: { iron_bar: 1, coke: 1 },                craftMs: 8 * MIN },
  rec_bird_feed:   { item: "bird_feed",     station: "workshop", inputs: { flour: 1, hay_bundle: 2 },                   craftMs: 3 * MIN },
  rec_sapling:     { item: "sapling",       station: "workshop", inputs: { plank: 1, hay_bundle: 2 },                craftMs: 5 * MIN },

  // Tools in workshop originally from RECIPES
  rec_water_pump:  { item: "water_pump",    station: "workshop", tier: 2, inputs: { plank: 1, block: 1 },    craftMs: 20 * MIN },
  rec_explosives:  { item: "explosives",    station: "workshop", tier: 2, inputs: { hay_bundle: 1, dirt: 1 },      craftMs: 15 * MIN },

  // Phase 3 (tool-powers overhaul) — workshop recipes for the new craftable
  // farm + mine tools. Costs follow the existing tier conventions (sweeping
  // tools cost a plank or two; transmuters / drills cost iron + coal).
  rec_trimmer:        { item: "trimmer",        station: "workshop", tier: 1, inputs: { iron_bar: 1, plank: 1 },           craftMs: 4 * MIN },
  rec_plough:         { item: "plough",         station: "workshop", tier: 2, inputs: { iron_bar: 1, plank: 2 },           craftMs: 8 * MIN },
  rec_fruit_picker:   { item: "fruit_picker",   station: "workshop", tier: 1, inputs: { plank: 2 },                        craftMs: 3 * MIN },
  rec_herders_crook:  { item: "herders_crook",  station: "workshop", tier: 1, inputs: { plank: 1, hay_bundle: 1 },         craftMs: 3 * MIN },
  rec_milk_churn:     { item: "milk_churn",     station: "workshop", tier: 2, inputs: { plank: 2, iron_bar: 1 },           craftMs: 6 * MIN },
  rec_saddle:         { item: "saddle",         station: "workshop", tier: 2, inputs: { plank: 1, iron_bar: 1, hay_bundle: 2 }, craftMs: 6 * MIN },
  rec_bee:            { item: "bee",            station: "workshop", tier: 1, inputs: { honey: 1, hay_bundle: 1 },         craftMs: 4 * MIN },
  rec_terrier:        { item: "terrier",        station: "workshop", tier: 1, inputs: { bread: 1, block: 2 },              craftMs: 10 * MIN },
  rec_drill:          { item: "drill",          station: "workshop", tier: 3, inputs: { iron_bar: 2, coke: 1, plank: 1 },  craftMs: 20 * MIN },
  rec_coal_hammer:    { item: "coal_hammer",    station: "workshop", tier: 2, inputs: { iron_bar: 1, plank: 1 },           craftMs: 5 * MIN },
  rec_gold_pick:      { item: "gold_pick",      station: "workshop", tier: 3, inputs: { iron_bar: 2, gold_bar: 1, plank: 1 }, craftMs: 12 * MIN },
  rec_magnet:         { item: "magnet",         station: "workshop", tier: 3, inputs: { iron_bar: 2, coke: 1 },            craftMs: 12 * MIN },
  rec_coal_transmuter:{ item: "coal_transmuter", station: "workshop", tier: 3, inputs: { iron_bar: 2, coke: 2, block: 1 },  craftMs: 15 * MIN },

  // Crafted goods
  rec_bread:       { item: "bread",         station: "bakery", tier: 1, inputs: { flour: 3, eggs: 1 },           craftMs: 2 * MIN },
  rec_honeyroll:   { item: "honeyroll",     station: "bakery", tier: 2, inputs: { flour: 2, eggs: 1, jam: 1 }, craftMs: 20 * MIN },
  rec_harvestpie:  { item: "harvestpie",    station: "bakery", tier: 2, inputs: { flour: 2, jam: 1, eggs: 1 }, craftMs: 1 * HOUR },
  rec_preserve:    { item: "preserve",      station: "larder", tier: 1, inputs: { jam: 2, eggs: 1 },             craftMs: 4 * MIN },
  rec_tincture:    { item: "tincture",      station: "larder", tier: 1, inputs: { jam: 3 },                craftMs: 5 * MIN },
  rec_iron_hinge:  { item: "iron_hinge",    station: "forge",  tier: 2, inputs: { iron_bar: 2, coke: 1 },           craftMs: 45 * MIN },
  rec_cobblepath:  { item: "cobblepath",    station: "forge",  tier: 1, inputs: { block: 5, plank: 2 },          craftMs: 8 * MIN },
  rec_lantern:     { item: "lantern",       station: "forge",  tier: 2, inputs: { iron_bar: 1, coke: 1, plank: 1 }, craftMs: 30 * MIN },
  rec_goldring:    { item: "goldring",      station: "forge",  tier: 2, inputs: { gold_bar: 1, iron_bar: 2 },           craftMs: 1 * HOUR },
  rec_gemcrown:    { item: "gemcrown",      station: "forge",  tier: 2, inputs: { cut_gem: 1, gold_bar: 2 },          craftMs: 90 * MIN },
  rec_ironframe:   { item: "ironframe",     station: "forge",  tier: 3, inputs: { plank: 2, iron_bar: 1 },           craftMs: 2 * HOUR },
  rec_stonework:   { item: "stonework",     station: "forge",  tier: 3, inputs: { block: 2, coke: 1 },           craftMs: 3 * HOUR },
  rec_chowder:     { item: "chowder",       station: "larder", tier: 2, inputs: { fish_fillet: 2, milk: 1, soup: 1 }, craftMs: 10 * MIN },
  rec_fish_oil_bot:{ item: "fish_oil_bottled", station: "workshop", tier: 1, inputs: { fish_oil: 1, plank: 1 },       craftMs: 10 * MIN },
  rec_cured_meat:  { item: "cured_meat",    station: "smokehouse", tier: 1, inputs: { meat: 2, coke: 1 },             craftMs: 10 * MIN },
  rec_festival_loaf:{ item: "festival_loaf", station: "bakery",     tier: 2, inputs: { flour: 3, jam: 2, eggs: 1 }, craftMs: 45 * MIN },
  rec_wedding_pie: { item: "wedding_pie",   station: "bakery",     tier: 3, inputs: { pie: 1, honey: 1, jam: 2 },    craftMs: 2 * HOUR },
  rec_iron_ration: { item: "iron_ration",   station: "kitchen",    tier: 2, inputs: { flour: 5, meat: 1, iron_bar: 1 },  craftMs: 12 * MIN },
  rec_supplies:    { item: "supplies",      station: "kitchen",    tier: 1, inputs: { flour: 5 },                          craftMs: 5 * MIN },
};

// ── Backward-compatible aliases ────────────────────────────────────────────
// Old code and tests reference RECIPES by item key (e.g. RECIPES["bread"]).
// Generate aliases: for each recipe, RECIPES[recipe.item] → same object.
for (const rec of Object.values(RECIPES)) {
  if (!isRecipeDefinition(rec)) continue;
  if (rec.item && !RECIPES[rec.item]) RECIPES[rec.item] = rec;
}
// Add backward-compatible computed properties to each recipe. Old code reads
// recipe.name, recipe.coins, recipe.tool, recipe.color, recipe.effect etc.
// These are now sourced from ITEMS[recipe.item].
for (const rec of Object.values(RECIPES)) {
  if (!isRecipeDefinition(rec)) continue;
  if (!rec.item) continue;
  const itemDef = getItem(rec.item);
  if (!isItemEntry(itemDef)) continue;
  // Legacy compat getters — only add if not already set by the recipe itself.
  if (rec.name === undefined)   rec.name   = itemDef.label;
  if (rec.coins === undefined)  rec.coins  = itemDef.value ?? 0;
  if (rec.color === undefined)  rec.color  = itemDef.color;
  if (rec.power === undefined && hasToolPower(itemDef)) rec.power = itemDef.power;
  if (rec.anim === undefined)   rec.anim   = (hasToolPower(itemDef) ? itemDef.power.anim : undefined) ?? (isToolItemEntry(itemDef) ? itemDef.anim : undefined);
  if (rec.ms === undefined)     rec.ms     = (hasToolPower(itemDef) ? itemDef.power.ms : undefined) ?? (isToolItemEntry(itemDef) ? itemDef.ms : undefined);
  if (rec.desc === undefined)   rec.desc   = itemDef.desc;
  // tool property: if the item is a tool, set recipe.tool = item key
  if (isToolItemEntry(itemDef) && rec.tool === undefined) rec.tool = rec.item;
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
export const WORKSHOP_RECIPES: WorkshopRecipeRecord = Object.fromEntries(
  Object.values(RECIPES)
    .filter((r): r is RecipeDefinition => isRecipeDefinition(r) && r.station === "workshop")
    .map((r) => [r.item, r])
);

// Legacy RECIPES.tools alias (tests reference RECIPES.tools.rake etc.)
Object.assign(RECIPES, { tools: WORKSHOP_RECIPES });


export const MARKET_PRICES = {
  // Raw tiles (board pieces sometimes sold).
  tile_grass_hay:    { buy: 40,  sell: 0  },
  tile_grain_wheat:  { buy: 60,  sell: 2  },
  tile_mine_stone:   { buy: 50,  sell: 1  },
  tile_mine_coal:    { buy: 60,  sell: 2  },
  tile_mine_gem:     { buy: 120, sell: 7  },
  tile_mine_gold:    { buy: 100, sell: 5  },
  // Terminal farm resources.
  flour:        { buy: 100, sell: 8  },
  plank:        { buy: 90,  sell: 6  },
  jam:          { buy: 90,  sell: 5  },
  hay_bundle:   { buy: 90,  sell: 6  },
  // Terminal mine resources.
  block:        { buy: 90,  sell: 6  },
  cut_gem:      { buy: 220, sell: 14 },
  coke:         { buy: 130, sell: 9  },
  iron_bar:     { buy: 120, sell: 8  },
  copper_bar:   { buy: 120, sell: 8  },
  gold_bar:     { buy: 240, sell: 16 },
  // Soup and other terminal farm products.
  soup:         { buy: 220, sell: 20 },
  // Phase: wire-all-chains — terminal products from REFERENCE_CATALOG §4.
  pie:       { buy: 840,  sell: 90  },
  honey:     { buy: 1500, sell: 300 },
  meat:      { buy: 240,  sell: 21  },
  milk:      { buy: 900,  sell: 100 },
  horseshoe: { buy: 1600, sell: 400 },
  // Eggs (plural) is the terminal product of bird chains.
  eggs:      { buy: 80,   sell: 5   },
  bread:     { buy: 60,   sell: 4   },
  // Fish biome — buy/sell pairs follow the same ~10× ratio as the rest
  // of MARKET_PRICES. Drift logic in features/market expects both columns
  // populated (buy: 0 would violate the ±15% drift bound).
  fish_fillet:      { buy: 200,  sell: 12  },
  fish_oil:         { buy: 100,  sell: 8   },
  fish_oil_bottled: { buy: 600,  sell: 80  },
  sea_shells:       { buy: 70,   sell: 5   },
  pearls:           { buy: 180,  sell: 12  },
  chowder:          { buy: 2400, sell: 280 },
  cured_meat:       { buy: 400,  sell: 45  },
  iron_ration:      { buy: 1200, sell: 120 },
  festival_loaf:    { buy: 600,  sell: 60  },
  wedding_pie:      { buy: 1800, sell: 180 },
};

// Legacy 3-slot dailies roll from features/quests/templates.js (not here).
// Almanac XP on claim is QUEST_CLAIM_XP in features/quests/data.ts.

// ─── Phase 4 — Inventory soft caps ───────────────────────────────────────────
export const RESOURCE_CAP_BASE = 200;
export const RESOURCE_CAP_GRANARY = 500;
/**
 * Board tile keys (kind:"tile") subject to the inventory cap.
 * Used when checking whether a chain collection would exceed the cap.
 * 62 entries — all tile_* keys from the original CAPPED_RESOURCES.
 */
export const CAPPED_TILES = [
  "tile_grass_hay","tile_grain_wheat","tile_mine_stone","tile_mine_iron_ore","tile_mine_copper_ore","tile_mine_coal",
  "tile_veg_carrot","tile_veg_eggplant","tile_veg_turnip","tile_veg_beet","tile_veg_cucumber","tile_veg_squash","tile_veg_mushroom","tile_veg_pepper","tile_veg_broccoli",
  // Catalog-import placeholders.
  "tile_grass_heather",
  "tile_grain_corn","tile_grain_buckwheat","tile_grain_manna","tile_grain_rice",
  "tile_fruit_apple","tile_fruit_pear","tile_fruit_golden_apple","tile_fruit_blackberry",
  "tile_fruit_rambutan","tile_fruit_starfruit","tile_fruit_coconut","tile_fruit_lemon","tile_fruit_jackfruit",
  "tile_flower_pansy","tile_flower_water_lily",
  "tile_tree_oak","tile_tree_birch","tile_tree_willow","tile_tree_fir","tile_tree_cypress","tile_tree_palm",
  "tile_bird_pheasant","tile_bird_chicken","tile_bird_hen","tile_bird_rooster","tile_bird_wild_goose","tile_bird_goose",
  "tile_bird_parrot","tile_bird_phoenix","tile_bird_dodo","tile_bird_pig_in_disguise",
  "tile_herd_pig","tile_herd_hog","tile_herd_boar","tile_herd_warthog",
  "tile_herd_sheep","tile_herd_alpaca","tile_herd_goat","tile_herd_ram",
  "tile_cattle_cow","tile_cattle_longhorn","tile_cattle_triceratops",
  "tile_mount_horse","tile_mount_donkey","tile_mount_moose","tile_mount_mammoth",
] as const;
/**
 * Inventory resource keys (kind:"resource") subject to the inventory cap.
 * Used when checking whether buying or crediting a bare resource would exceed the cap.
 * 12 entries — all non-tile keys from the original CAPPED_RESOURCES.
 */
export const CAPPED_INVENTORY_RESOURCES = [
  "flour","plank","jam","hay_bundle","soup",
  // Phase: wire-all-chains — terminal products.
  "pie","honey","meat","milk","horseshoe","eggs","bread",
] as const;

// ─── Phase 3 Economy ──────────────────────────────────────────────────────────


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
  30: { coins: 1000, runes: 3, unlockTile: "tile_cattle_triceratops" },
};

// ─── Phase 10 — Tile pool seasonal modifiers ──────────────────────────────────
// Applied additively on BIOMES.farm.pool. Locked: ONLY spawn weights.
// (Calendar-season effects were removed in Phase 7 — see top of file.)
export const SEASON_POOL_MODS = {
  Spring: { tile_fruit_blackberry: +1 },
  Summer: { tile_grain_wheat: +1 },
  Autumn: { tile_tree_oak:   +2 },
  Winter: { tile_mine_stone: +1, tile_grass_hay: -1 },
};

// ─── Phase 10.4 — Rat hazard constants ────────────────────────────────────────
export const RAT_SPAWN_THRESHOLDS = {
  tile_grass_hay:         50,
  tile_grain_wheat:       50,
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
export function dayKeyForDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─── Dev Panel overrides ─────────────────────────────────────────────
// Parsed balance.json + optional localStorage draft (no merge onto live tables here).
// Call `initBalanceOverrides()` from app entry / Vitest setup to apply patches.
import { loadBalanceOverrides } from "./config/balance/load.js";

export const BALANCE_OVERRIDES = loadBalanceOverrides();

export { getTuningOverrides } from "./config/balance/init.js";
export type { TuningOverrides } from "./config/balance/applyAll.js";
