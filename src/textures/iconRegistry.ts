// Unified icon registry. Imports every per-category icon module from
// `categories/` and merges them into one map. Later spreads override
// earlier ones — `existingFarm`/`existingMine` are placed last so the
// design-bundle's improved drawings take precedence over any in-tree
// version with the same key.

import { ICONS as G_GRASS } from "./categories/grass.js";
import { ICONS as G_GRAIN } from "./categories/grain.js";
import { ICONS as G_VEGETABLES } from "./categories/vegetables.js";
import { ICONS as G_FRUITS } from "./categories/fruits.js";
import { ICONS as G_FLOWERS } from "./categories/flowers.js";
import { ICONS as G_TREES } from "./categories/trees.js";
import { ICONS as G_BIRDS } from "./categories/birds.js";
import { ICONS as G_HERD } from "./categories/herdAnimals.js";
import { ICONS as G_CATTLE } from "./categories/cattle.js";
import { ICONS as G_MOUNTS } from "./categories/mounts.js";
import { ICONS as G_TOOLS_FARM } from "./categories/toolsFarm.js";
import { ICONS as G_TOOLS_MINE } from "./categories/toolsMine.js";
import { ICONS as G_TOOLS_PORTAL } from "./categories/toolsPortal.js";
import { ICONS as G_TOOLS_SEA } from "./categories/toolsSea.js";
import { ICONS as EXISTING_FARM } from "./categories/existingFarm.js";
import { ICONS as EXISTING_MINE } from "./categories/existingMine.js";
import { ICONS as G_CRAFTED } from "./categories/craftedProducts.js";
import { ICONS as G_CHARACTERS } from "./categories/characters.js";
import { ICONS as G_CHARACTERS_V2 } from "./categories/charactersV2.js";
import { ICONS as G_MAP_NODES } from "./categories/mapNodes.js";
import { ICONS as G_DECORATIONS } from "./categories/decorations.js";
import { ICONS as G_PLAYER_TOOLS } from "./categories/playerTools.js";
import { ICONS as G_CRAFTING_STATIONS } from "./categories/craftingStations.js";
import { ICONS as G_HAZARDS } from "./categories/hazards.js";
import { ICONS as G_TILE_CATEGORIES } from "./categories/tileCategories.js";
import { ICONS as G_MINE_HAZARDS } from "./categories/mineHazards.js";
import { ICONS as G_FISH } from "./categories/fish.js";
import { ICONS as G_RECIPES } from "./categories/recipes.js";
import { ICONS as G_UI_ELEMENTS } from "./categories/uiElements.js";
import { ICONS as G_MISSING_ITEMS } from "./categories/missingItems.js";
import { ICONS as G_ACHIEVEMENTS } from "./categories/achievements.js";
import { ICONS as G_QUESTS } from "./categories/quests.js";
import { ICONS as G_CURRENCIES } from "./categories/currencies.js";
import { ICONS as G_FIXED_ICONS } from "./categories/fixed-icons.js";
import { ICONS as G_GEMS } from "./categories/gems.js";
import { ICONS as G_WEATHER } from "./categories/weather.js";
import { ICONS as G_DISHES } from "./categories/dishes.js";
import { ICONS as G_REEF } from "./categories/reef.js";
import { ICONS as G_CRITTERS } from "./categories/critters.js";
import { ICONS as G_ARCANE } from "./categories/arcane.js";
import { ICONS as G_COZY_DECOR } from "./categories/cozyDecor.js";
import { ICONS as G_CELESTIAL } from "./categories/celestial.js";
import { ICONS as G_ORES } from "./categories/ores.js";
import { ICONS as G_PETS } from "./categories/pets.js";
import { ICONS as G_TREASURE } from "./categories/treasure.js";
import { ICONS as G_DRINKS } from "./categories/drinks.js";
import { ICONS as G_FURNITURE } from "./categories/furniture.js";
import { ICONS as G_INSTRUMENTS } from "./categories/instruments.js";
import { ICONS as G_FESTIVE } from "./categories/festive.js";
import { ICONS as G_CROPS } from "./categories/crops.js";
import { ICONS as G_WORKSHOP_TOOLS } from "./categories/workshopTools.js";
import { ICONS as G_NATURE } from "./categories/nature.js";
import { ICONS as G_WEAPONS } from "./categories/weapons.js";
import { ICONS as G_SPELLS } from "./categories/spells.js";
import { ICONS as G_BUILDINGS } from "./categories/buildings.js";
import { ICONS as G_ARCHIVED } from "./categories/archivedIcons.js";
import { paintSeasonalReference, ensureSeasonalArtLoaded, ensureAllSeasonalArtLoaded, seasonalArtActive, seasonalBakedActive, isPotentialBakedSubject, hasSeasonalArtFolder } from "./seasonal/seasonalArt.js";

export interface IconRegistryEntry {
  label?: string;
  color?: string;
  draw: (ctx: CanvasRenderingContext2D) => void;
  archive?: boolean;
  replacedBy?: string;
}

export type IconRegistryDictionary = Record<string, IconRegistryEntry>;

// Some items in constants.js carry both an underscore form and a
// concatenated form (ITEMS.iron_frame === ITEMS.ironframe etc., see
// src/constants.js:329-331). The active icons live under the
// concatenated form; alias the underscore form so the game's lookup
// `drawIcon("iron_frame")` resolves instead of falling back to "?".
function aliasIconKeys(reg: IconRegistryDictionary) {
  const aliases: Record<string, IconRegistryEntry | undefined> = {
    iron_frame: reg.ironframe,
    gem_crown:  reg.gemcrown,
    gold_ring:  reg.goldring,
    // Phase 3 tool-powers overhaul — the magic-tier portal tools are now
    // registered as ITEMS so the icon-audit test expects an icon under each
    // item key. Their canvas draws live under the portal-icon labels (wand,
    // hourglass, potion, scroll) so we alias the ITEM keys onto those draws.
    magic_wand:        reg.wand,
    magic_seed:        reg.potion,
    magic_fertilizer:  reg.scroll,
    sickle:            reg.sickle ?? reg.scythe ?? reg.axe,
    clear:             reg.player_clear,
    basic:             reg.player_basic,
    rare:              reg.player_rare,
    shuffle:           reg.player_shuffle,
    bomb:              reg.dynamite,
    // Tile/zone category badges used by the Wiki and tile collection UI. The
    // farm categories have bespoke cat_* drawings in tileCategories.ts; these
    // aliases give the mine, treasure, water, and plural zone-category keys the
    // same cat_* contract by reusing their representative tile drawings.
    cat_birds:          reg.cat_bird,
    cat_mine_stone:     reg.tile_mine_stone,
    cat_mine_iron_ore:  reg.tile_mine_iron_ore,
    cat_mine_coal:      reg.tile_mine_coal,
    cat_mine_gem:       reg.tile_mine_gem,
    cat_mine_gold:      reg.tile_mine_gold,
    cat_special_dirt:   reg.tile_special_dirt,
    cat_treasure:       reg.tile_coin_golden ?? reg.coins,
    cat_fish:           reg.tile_fish_sardine,
  };
  for (const [key, value] of Object.entries(aliases)) {
    if (value && !reg[key]) reg[key] = value;
  }
}

const REGISTRY_DRAFT: IconRegistryDictionary = {
  ...G_GRASS,
  ...G_GRAIN,
  ...G_VEGETABLES,
  ...G_FRUITS,
  ...G_FLOWERS,
  ...G_TREES,
  ...G_BIRDS,
  ...G_HERD,
  ...G_CATTLE,
  ...G_MOUNTS,
  ...G_TOOLS_FARM,
  ...G_TOOLS_MINE,
  ...G_TOOLS_PORTAL,
  ...G_TOOLS_SEA,
  ...EXISTING_FARM,
  ...EXISTING_MINE,
  ...G_CRAFTED,
  ...G_CHARACTERS,
  ...G_CHARACTERS_V2,
  ...G_MAP_NODES,
  ...G_DECORATIONS,
  ...G_PLAYER_TOOLS,
  ...G_CRAFTING_STATIONS,
  ...G_HAZARDS,
  ...G_TILE_CATEGORIES,
  ...G_MINE_HAZARDS,
  ...G_FISH,
  ...G_RECIPES,
  ...G_UI_ELEMENTS,
  ...G_MISSING_ITEMS,
  ...G_ACHIEVEMENTS,
  ...G_QUESTS,
  ...G_CURRENCIES,
  ...G_FIXED_ICONS,
  // Decorative concept batches — additive icons that surface in the Dev Panel
  // Icons tab (grouped by key prefix). Not referenced by any catalog yet.
  ...G_GEMS,
  ...G_WEATHER,
  ...G_DISHES,
  ...G_REEF,
  ...G_CRITTERS,
  ...G_ARCANE,
  ...G_COZY_DECOR,
  ...G_CELESTIAL,
  ...G_ORES,
  ...G_PETS,
  ...G_TREASURE,
  ...G_DRINKS,
  ...G_FURNITURE,
  ...G_INSTRUMENTS,
  ...G_FESTIVE,
  ...G_CROPS,
  ...G_WORKSHOP_TOOLS,
  ...G_NATURE,
  ...G_WEAPONS,
  ...G_SPELLS,
  ...G_BUILDINGS,
  // Archived legacy draws live under `legacy_<key>` keys. They render in the
  // Dev Panel's Icons tab but are never used in-game. Spread last so
  // they can never accidentally override an active key.
  ...G_ARCHIVED,
};
aliasIconKeys(REGISTRY_DRAFT);
export const ICON_REGISTRY: Readonly<IconRegistryDictionary> = Object.freeze(REGISTRY_DRAFT);

export const ICON_KEYS = new Set(Object.keys(ICON_REGISTRY));

/** Get the full design entry for a key, or null if unregistered. */
export function iconEntry(key: string): IconRegistryEntry | null {
  return ICON_REGISTRY[key] ?? null;
}

/** How an icon resolves between its procedural ("canvas") draw and its baked
 *  pixel-art ("pixel") seasonal reference still:
 *   - `"auto"` (default): the live game behaviour — prefer the baked pixel sprite
 *     whenever it's active (honours the vector preference + pixel-sprite override).
 *   - `"canvas"`: always the procedural draw, never the baked sprite.
 *   - `"pixel"`: prefer the baked sprite for ANY key that ships a folder (even the
 *     vector-preferred showcase tiles), falling back to the procedural draw — i.e.
 *     the "general icon" — for keys with no baked seasonal art. */
export type IconVariant = "auto" | "canvas" | "pixel";

/** Draw the registered icon for `key` at the canvas's current origin.
 *  Returns true if the key was found and drawn, false otherwise.
 *
 *  Baked seasonal subjects (any tile with spritesheets in
 *  `public/seasonal-tiles/<tileKey>/`) render their reference still here so every
 *  menu/wiki icon matches the board — drop-in, no per-icon wiring. Until the sheets
 *  load (and in environments without them, e.g. tests / offline icon render) it kicks
 *  the load and falls through to the subject's procedural icon.
 *
 *  `variant` lets callers (the wiki's tiles toggle) force the procedural draw or the
 *  baked pixel sprite instead of the live "auto" behaviour. */
export function drawIcon(ctx: CanvasRenderingContext2D, key: string, variant: IconVariant = "auto") {
  if (variant === "pixel") {
    if (hasSeasonalArtFolder(key)) {
      if (seasonalArtActive(key) && paintSeasonalReference(ctx, key)) return true;
      ensureAllSeasonalArtLoaded();
    }
    // Fall through to the procedural "general icon" for non-baked keys.
  } else if (variant === "auto" && isPotentialBakedSubject(key)) {
    if (seasonalBakedActive(key) && paintSeasonalReference(ctx, key)) return true;
    ensureSeasonalArtLoaded();
  }
  const entry = iconEntry(key);
  if (!entry) return false;
  entry.draw(ctx);
  return true;
}

/** Get the design's display label for a key, or null if unregistered. */
export function iconLabel(key: string) {
  return iconEntry(key)?.label ?? null;
}

/** Get the design's accent color hex string for a key, or null. */
export function iconColor(key: string) {
  return iconEntry(key)?.color ?? null;
}
