/**
 * conceptEntities.ts — Live-value resolver for the Dev Panel Wiki.
 *
 * Returns the raw live entity object for a concept+key pair by reading the
 * same source-of-truth maps that wiki/concepts.ts uses.
 *
 * Keep this module UI-side; it intentionally imports from constants and
 * feature data. Do NOT add imports of constants to schemaDoc.ts or
 * conceptSchemas.ts (keeps those pure / cycle-free).
 */

import { ITEMS, BUILDINGS, NPCS, RECIPES, SETTLEMENT_BIOMES, SEASONS } from "../../constants.js";
import { TYPE_WORKERS } from "../../features/workers/data.js";
import { ZONES, ZONE_CATEGORIES } from "../../features/zones/data.js";
import { ABILITIES } from "../../config/abilities.js";
import { TOOL_POWERS } from "../../config/toolPowers.js";
import { BOSSES } from "../../features/bosses/data.js";
import { HAZARDS } from "../../features/mine/hazards.js";
import { TILE_DISCOVERY_METHODS } from "../../config/tileDiscoveryMethods.js";
import { KNOWN_VIEWS, KNOWN_MODALS } from "../../router.js";
import { CATEGORIES as TILE_CATEGORIES } from "../../features/tileCollection/data.js";
import { CONCEPTS } from "./concepts.js";

/** Coerce a value to Record<string, unknown> if it is a non-null object, else null. */
function toRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Search an array-like collection for an entry whose `id` field equals `key`.
 * Uses `unknown` as the intermediate type to satisfy strict TypeScript.
 */
function findById(collection: unknown, key: string): Record<string, unknown> | null {
  if (!Array.isArray(collection)) return null;
  const found = (collection as Array<unknown>).find(
    (item) => toRecord(item)?.["id"] === key,
  );
  return toRecord(found ?? null);
}

/**
 * Search a seasons-like array for an entry whose `name` field equals `key`.
 */
function findByName(collection: unknown, key: string): Record<string, unknown> | null {
  if (!Array.isArray(collection)) return null;
  const found = (collection as Array<unknown>).find(
    (item) => toRecord(item)?.["name"] === key,
  );
  return toRecord(found ?? null);
}

/**
 * Return the raw live entity object for the given concept id and entry key,
 * or `null` when the entry cannot be located.
 */
export function getEntity(conceptId: string, key: string): Record<string, unknown> | null {
  switch (conceptId) {
    // ── item kinds ──────────────────────────────────────────────────────────
    case "tiles":
    case "resources":
    case "tools": {
      return toRecord((ITEMS as Record<string, unknown>)[key]);
    }

    // ── world structure ─────────────────────────────────────────────────────
    case "zones": {
      return toRecord((ZONES as Record<string, unknown>)[key]);
    }

    case "buildings": {
      return findById(BUILDINGS, key);
    }

    case "recipes": {
      return toRecord((RECIPES as Record<string, unknown>)[key]);
    }

    case "npcs": {
      return toRecord((NPCS as Record<string, unknown>)[key]);
    }

    case "workers": {
      return findById(TYPE_WORKERS, key);
    }

    case "bosses": {
      return findById(BOSSES, key);
    }

    case "abilities": {
      return findById(ABILITIES, key);
    }

    case "toolPowers": {
      return findById(TOOL_POWERS, key);
    }

    case "settlementBiomes": {
      for (const list of Object.values(SETTLEMENT_BIOMES)) {
        const found = findById(list, key);
        if (found != null) return found;
      }
      return null;
    }

    // ── live-config-only concepts ────────────────────────────────────────────
    case "hazards": {
      return findById(HAZARDS, key);
    }

    case "seasons": {
      return findByName(SEASONS, key);
    }

    case "categories": {
      // Categories are plain strings; represent as a small object.
      const allCats = new Set<string>();
      for (const c of (ZONE_CATEGORIES as unknown as string[])) allCats.add(c);
      for (const c of (TILE_CATEGORIES as unknown as string[])) allCats.add(c);
      return allCats.has(key) ? { id: key, name: key } : null;
    }

    case "tileDiscoveryMethods": {
      return findById(TILE_DISCOVERY_METHODS, key);
    }

    case "views": {
      return KNOWN_VIEWS.has(key) ? { id: key, name: key } : null;
    }

    case "modals": {
      return KNOWN_MODALS.has(key) ? { id: key, name: key } : null;
    }

    default:
      return null;
  }
}

/**
 * Inverse of `getEntity`. Given an entity key, return the first concept id
 * (in CONCEPTS array order) whose `getEntity(conceptId, key)` is non-null.
 *
 * Priority note: entity key namespaces are largely disjoint — tile keys start
 * with `tile_`, recipe keys with `rec_`, and zone/building/npc/worker/boss/
 * ability/toolPower ids are distinct. First-match in CONCEPTS order is
 * sufficient; the CONCEPTS array order is: tiles → resources → tools →
 * categories → zones → settlementBiomes → recipes → buildings → hazards →
 * bosses → workers → npcs → abilities → toolPowers → tileDiscoveryMethods →
 * seasons → views → modals. If a key somehow matches multiple concepts, the
 * earlier concept wins.
 *
 * Returns null if no concept resolves the key.
 */
export function conceptForKey(key: string): string | null {
  for (const concept of CONCEPTS) {
    if (getEntity(concept.id, key) !== null) {
      return concept.id;
    }
  }
  return null;
}
