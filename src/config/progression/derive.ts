// src/config/progression/derive.ts
// Enrich terse trigger effects with detail read from the live config maps,
// so the feed doesn't hand-maintain (and can't drift from) what a zone brings.

import { ZONES } from "../../features/zones/data.js";
import type { BoardKind } from "../../features/cartography/data.js";

/** Building ids buildable at a zone (empty for unknown zones). */
export function zoneBuildingIds(zoneId: string): string[] {
  const z = ZONES[zoneId];
  return z ? [...z.buildings] : [];
}

/** Board kinds a zone enables, e.g. ["farm"] or ["mine"] (empty for unknown). */
export function zoneBoardKinds(zoneId: string): BoardKind[] {
  const z = ZONES[zoneId];
  if (!z?.boards) return [];
  return Object.keys(z.boards) as BoardKind[];
}
