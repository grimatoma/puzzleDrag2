import { EXPEDITION_FOOD_TURNS, getItem } from "../../constants.js";

export const INVENTORY_TAGS = Object.freeze({
  RESOURCE: "resource",
  TOOL: "tool",
  FOOD: "food",
  CARGO: "cargo",
  ITEM: "item",
});

export const INVENTORY_SOURCE_TAGS = Object.freeze({
  FARM: "farm",
  MINE: "mine",
  HARBOR: "harbor",
  CRAFTED: "crafted",
  NATURAL: "natural",
});

const FOOD_KEYS = new Set<string>(Object.keys(EXPEDITION_FOOD_TURNS));
// Harbor cargo is tagged by biome/key prefix below; `supplies` is now a ration
// (FOOD), so this explicit set is currently empty but kept for future cargo goods.
const CARGO_KEYS = new Set<string>([]);

interface ItemDef { kind?: string; biome?: string }

function baseTagForKind(kind: string | undefined): string {
  if (kind === "resource") return INVENTORY_TAGS.RESOURCE;
  if (kind === "tool") return INVENTORY_TAGS.TOOL;
  return INVENTORY_TAGS.ITEM;
}

export function tagsForItemKey(key: string): string[] {
  const item: ItemDef | undefined = getItem(key);
  const tags = new Set<string>([baseTagForKind(item?.kind)]);

  if (FOOD_KEYS.has(key)) tags.add(INVENTORY_TAGS.FOOD);
  if (CARGO_KEYS.has(key) || item?.biome === "fish" || key.startsWith("fish_")) {
    tags.add(INVENTORY_TAGS.CARGO);
  }
  return Array.from(tags);
}

export function itemHasTag(key: string, tag: string): boolean {
  return tagsForItemKey(key).includes(tag);
}

export interface SourceTagsOpts {
  recipesByOutput?: Record<string, unknown[]>;
}

export function sourceTagsForItem(key: string, { recipesByOutput = {} }: SourceTagsOpts = {}): string[] {
  const item: ItemDef | undefined = getItem(key);
  const tags = new Set<string>();
  const biome = item?.biome;
  if (biome === "farm") tags.add(INVENTORY_SOURCE_TAGS.FARM);
  if (biome === "mine") tags.add(INVENTORY_SOURCE_TAGS.MINE);
  if (biome === "fish") tags.add(INVENTORY_SOURCE_TAGS.HARBOR);
  if ((recipesByOutput[key] || []).length > 0) tags.add(INVENTORY_SOURCE_TAGS.CRAFTED);
  if (tags.size === 0) tags.add(INVENTORY_SOURCE_TAGS.NATURAL);
  return Array.from(tags);
}
