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
import { ICONS as G_ARCHIVED } from "./categories/archivedIcons.js";

// Some items in constants.js carry both an underscore form and a
// concatenated form (ITEMS.iron_frame === ITEMS.ironframe etc., see
// src/constants.js:329-331). The active icons live under the
// concatenated form; alias the underscore form so the game's lookup
// `drawIcon("iron_frame")` resolves instead of falling back to "?".
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
function aliasIconKeys(reg: Record<string, any>) {
  const aliases = {
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
  };
  for (const [key, value] of Object.entries(aliases)) {
    if (value && !reg[key]) reg[key] = value;
  }
}

const REGISTRY_DRAFT = {
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
  // Archived legacy draws live under `legacy_<key>` keys. They render in the
  // Dev Panel's Icons tab but are never used in-game. Spread last so
  // they can never accidentally override an active key.
  ...G_ARCHIVED,
};
aliasIconKeys(REGISTRY_DRAFT);
export const ICON_REGISTRY = Object.freeze(REGISTRY_DRAFT);

export const ICON_KEYS = new Set(Object.keys(ICON_REGISTRY));

/** Draw the registered icon for `key` at the canvas's current origin.
 *  Returns true if the key was found and drawn, false otherwise. */
export function drawIcon(ctx: CanvasRenderingContext2D, key: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entry = (ICON_REGISTRY as Record<string, any>)[key];
  if (!entry) return false;
  entry.draw(ctx);
  return true;
}

/** Get the design's display label for a key, or null if unregistered. */
export function iconLabel(key: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (ICON_REGISTRY as Record<string, any>)[key]?.label ?? null;
}

/** Get the design's accent color hex string for a key, or null. */
export function iconColor(key: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (ICON_REGISTRY as Record<string, any>)[key]?.color ?? null;
}
