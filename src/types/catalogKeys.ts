/**
 * Closed catalog keys (hand-maintained enums in `./catalog/`).
 * When adding an item: enum member in `catalog/itemKeys.ts`, row in `ITEMS`, reload.
 */

import { CAPPED_INVENTORY_RESOURCES, CAPPED_TILES } from "../constants.js";
import { ALL_ITEM_KEY_VALUES, RESOURCE_KEY_VALUES } from "./catalog/index.js";
import type { ItemKey, ResourceKey } from "./catalog/index.js";

export {
  ALL_ITEM_KEY_VALUES,
  ALL_ITEM_KEY_VALUES as ALL_ITEM_KEYS,
  ITEM_ALIAS_VALUES,
  ITEM_ALIAS_VALUES as ITEM_ALIASES,
  TILE_KEY_VALUES,
  TILE_KEY_VALUES as TILE_KEYS,
  RESOURCE_KEY_VALUES,
  RESOURCE_KEY_VALUES as RESOURCE_KEYS,
  TOOL_KEY_VALUES,
  TOOL_KEY_VALUES as TOOL_KEYS,
  ItemAliasKey,
  ResourceKey,
  TileKey,
  ToolKey,
} from "./catalog/index.js";

export type { ItemKey } from "./catalog/index.js";

export {
  StoryBeatId,
  STORY_BEAT_ID_VALUES,
  StoryFlagId,
  STORY_FLAG_ID_VALUES,
  StoryFlagCategoryId,
  STORY_FLAG_CATEGORY_ID_VALUES,
  StoryTriggerType,
  STORY_TRIGGER_TYPE_VALUES,
  FeatureFlagId,
  FEATURE_FLAG_ID_VALUES,
  TuningKey,
  TUNING_KEY_VALUES,
  DecorationId,
  DECORATION_ID_VALUES,
  BoonId,
  BOON_ID_VALUES,
  WorkerTypeId,
  WORKER_TYPE_ID_VALUES,
} from "./catalog/index.js";

/** Keys that may be written to `state.inventory`. */
export type InventoryResourceKey = ResourceKey;
export type InventoryTileKey = (typeof CAPPED_TILES)[number];
export type InventoryKey = InventoryResourceKey | InventoryTileKey;

/** Keys subject to inventory soft-cap logic. */
export type CappedInventoryKey =
  | (typeof CAPPED_INVENTORY_RESOURCES)[number]
  | InventoryTileKey;

/** Recipe / building input maps. */
export type RecipeInputKey = ItemKey;

const ITEM_KEY_SET = new Set<string>(ALL_ITEM_KEY_VALUES);
const RESOURCE_KEY_SET = new Set<string>(RESOURCE_KEY_VALUES);

/** True when `key` is a known ITEMS or alias key. */
export function isItemKey(key: string): key is ItemKey {
  return ITEM_KEY_SET.has(key);
}

/** True when `key` may appear on `state.inventory`. */
export function isInventoryKey(key: string): key is InventoryKey {
  if ((CAPPED_TILES as readonly string[]).includes(key)) return true;
  return RESOURCE_KEY_SET.has(key);
}
