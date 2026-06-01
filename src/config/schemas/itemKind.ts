/**
 * Discriminator for ITEMS entries. Catalog enums (TileKey, ResourceKey, ToolKey)
 * define membership; ItemKind defines which attribute shape an entry uses.
 */
export const ItemKind = {
  Tile: "tile",
  Resource: "resource",
  Tool: "tool",
} as const;

export type ItemKindValue = (typeof ItemKind)[keyof typeof ItemKind];
