/**
 * Hand-maintained catalog enum — edit when adding ids, then update the matching config map.
 */

/** Hash router view ids (shell + feature viewKey exports). */
export enum ViewId {
  Achievements = "achievements",
  Board = "board",
  Boons = "boons",
  Bosses = "bosses",
  Cartography = "cartography",
  Castle = "castle",
  Charter = "charter",
  Chronicle = "chronicle",
  Crafting = "crafting",
  Decorations = "decorations",
  Inventory = "inventory",
  Orders = "orders",
  Portal = "portal",
  Quests = "quests",
  TileCollection = "tileCollection",
  Town = "town",
  Townsfolk = "townsfolk",
}

export const VIEW_ID_VALUES = Object.values(ViewId);
