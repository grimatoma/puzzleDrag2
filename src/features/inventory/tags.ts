import { EXPEDITION_FOOD_TURNS, ITEMS } from "../../constants.js";

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

const FOOD_KEYS = new Set(Object.keys(EXPEDITION_FOOD_TURNS));
const CARGO_KEYS = new Set(["supplies"]);

function baseTagForKind(kind) {
  if (kind === "resource") return INVENTORY_TAGS.RESOURCE;
  if (kind === "tool") return INVENTORY_TAGS.TOOL;
  return INVENTORY_TAGS.ITEM;
}

export function tagsForItemKey(key) {
  const item = ITEMS[key];
  const tags = new Set([baseTagForKind(item?.kind)]);

  if (FOOD_KEYS.has(key)) tags.add(INVENTORY_TAGS.FOOD);
  if (CARGO_KEYS.has(key) || item?.biome === "fish" || key.startsWith("fish_")) {
    tags.add(INVENTORY_TAGS.CARGO);
  }
  return Array.from(tags);
}

export function itemHasTag(key, tag) {
  return tagsForItemKey(key).includes(tag);
}

export function sourceTagsForItem(key, { recipesByOutput = {} } = {}) {
  const item = ITEMS[key];
  const tags = new Set();
  const biome = item?.biome;
  if (biome === "farm") tags.add(INVENTORY_SOURCE_TAGS.FARM);
  if (biome === "mine") tags.add(INVENTORY_SOURCE_TAGS.MINE);
  if (biome === "fish") tags.add(INVENTORY_SOURCE_TAGS.HARBOR);
  if ((recipesByOutput[key] || []).length > 0) tags.add(INVENTORY_SOURCE_TAGS.CRAFTED);
  if (tags.size === 0) tags.add(INVENTORY_SOURCE_TAGS.NATURAL);
  return Array.from(tags);
}
