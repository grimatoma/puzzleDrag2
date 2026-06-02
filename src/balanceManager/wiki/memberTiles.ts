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

/**
 * A handful of TILE_TYPES entries are keyed by a resource id (mine upgrade
 * tiers: block, iron_bar, coke, cut_gem) and carry kind "resource" in ITEMS.
 * We only surface genuine board tiles here, so a member card always links to a
 * real tile article rather than landing on a resource page.
 */
function isTileKey(id: string): boolean {
  const item = (ITEMS as Record<string, { kind?: string } | undefined>)[id];
  return item?.kind === "tile";
}

function toMember(tileId: string): MemberTile {
  const item = (ITEMS as Record<string, { label?: string } | undefined>)[tileId];
  return { key: tileId, name: item?.label ?? tileId, iconKey: tileId };
}

export function memberTilesFor(conceptId: string, key: string): MemberTile[] {
  if (conceptId === "categories") {
    const byCat = (TILE_TYPES_BY_CATEGORY as Record<string, Array<{ id: string }>>)[key];
    if (!Array.isArray(byCat)) return [];
    return byCat
      .map((t) => t.id)
      .filter(isTileKey)
      .map(toMember);
  }

  if (conceptId === "tileDiscoveryMethods") {
    return (TILE_TYPES as Array<{ id: string; discovery?: { method?: string } }>)
      .filter((t) => (t.discovery?.method ?? "default") === key)
      .map((t) => t.id)
      .filter(isTileKey)
      .map(toMember);
  }

  return [];
}
