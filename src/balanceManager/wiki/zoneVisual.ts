/**
 * zoneVisual.ts — Cartography map icons for wiki zone entries.
 *
 * Zones with a baked `map_<id>` key in iconRegistry use that asset everywhere
 * in the wiki; nodes without one (harbor, old capital) fall back to the live
 * map-node emoji from cartography data.
 */

import { ICON_REGISTRY } from "../../textures/iconRegistry.js";
import { MAP_NODES } from "../../features/cartography/data.js";

/** Cartography map-node icon key (`map_<zoneId>`) when registered, else null. */
export function zoneMapIconKey(zoneId: string): string | null {
  const k = `map_${zoneId}`;
  return (ICON_REGISTRY as Record<string, unknown>)[k] ? k : null;
}

/** Emoji from the live map-node catalog (harbor, old capital, …). */
export function zoneMapEmoji(zoneId: string): string | null {
  const node = (MAP_NODES as Array<{ id: string; icon?: string }>).find((n) => n.id === zoneId);
  const icon = node?.icon;
  return typeof icon === "string" && icon.length > 0 ? icon : null;
}
