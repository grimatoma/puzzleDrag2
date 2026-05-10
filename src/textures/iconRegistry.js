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
import { ICONS as G_WEATHER } from "./categories/weather.js";
import { ICONS as G_MOOD_FACES } from "./categories/moodFaces.js";
import { ICONS as G_PLAYER_TOOLS } from "./categories/playerTools.js";
import { ICONS as G_CRAFTING_STATIONS } from "./categories/craftingStations.js";
import { ICONS as G_HAZARDS } from "./categories/hazards.js";
import { ICONS as G_TILE_CATEGORIES } from "./categories/tileCategories.js";
import { ICONS as G_MINE_HAZARDS } from "./categories/mineHazards.js";
import { ICONS as G_FISH } from "./categories/fish.js";
import { ICONS as G_RECIPES } from "./categories/recipes.js";

export const ICON_REGISTRY = Object.freeze({
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
  ...G_WEATHER,
  ...G_MOOD_FACES,
  ...G_PLAYER_TOOLS,
  ...G_CRAFTING_STATIONS,
  ...G_HAZARDS,
  ...G_TILE_CATEGORIES,
  ...G_MINE_HAZARDS,
  ...G_FISH,
  ...G_RECIPES,
});

export const ICON_KEYS = new Set(Object.keys(ICON_REGISTRY));

/** Draw the registered icon for `key` at the canvas's current origin.
 *  Returns true if the key was found and drawn, false otherwise. */
export function drawIcon(ctx, key) {
  const entry = ICON_REGISTRY[key];
  if (!entry) return false;
  entry.draw(ctx);
  return true;
}

/** Get the design's display label for a key, or null if unregistered. */
export function iconLabel(key) {
  return ICON_REGISTRY[key]?.label ?? null;
}

/** Get the design's accent color hex string for a key, or null. */
export function iconColor(key) {
  return ICON_REGISTRY[key]?.color ?? null;
}
