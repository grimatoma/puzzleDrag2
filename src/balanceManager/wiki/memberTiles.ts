/**
 * memberTiles.ts — Resolve the tiles that belong to a grouping page.
 *
 *   - categories(<cat>)            → tiles whose tile-type category === <cat>
 *   - tileDiscoveryMethods(<id>)   → tiles whose discovery.method === <id>
 *
 * Returns lightweight entries ({ key, name, iconKey }) suitable for EntryGrid.
 * Pure module — no React, no DOM.
 */

import { ITEMS } from "../../constants.js";
import { TILE_TYPES, TILE_TYPES_BY_CATEGORY } from "../../features/tileCollection/data.js";

export interface MemberTile {
  key: string;
  name: string;
  iconKey: string;
}

function toMember(tileId: string): MemberTile {
  const item = (ITEMS as Record<string, { label?: string } | undefined>)[tileId];
  return { key: tileId, name: item?.label ?? tileId, iconKey: tileId };
}

export function memberTilesFor(conceptId: string, key: string): MemberTile[] {
  if (conceptId === "categories") {
    const byCat = (TILE_TYPES_BY_CATEGORY as Record<string, Array<{ id: string }>>)[key];
    if (!Array.isArray(byCat)) return [];
    return byCat.map((t) => toMember(t.id));
  }

  if (conceptId === "tileDiscoveryMethods") {
    return (TILE_TYPES as Array<{ id: string; discovery?: { method?: string } }>)
      .filter((t) => (t.discovery?.method ?? "default") === key)
      .map((t) => toMember(t.id));
  }

  return [];
}
