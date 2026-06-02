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
import { KEEPERS } from "../../keepers.js";
import { allBoons } from "../../features/boons/data.js";
import { DAILY_REWARDS } from "../../constants.js";
import { ACHIEVEMENTS } from "../../features/achievements/data.js";
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
 *
 * For the `tiles`, `resources`, and `tools` cases the function is kind-aware:
 * it returns `ITEMS[key]` only when the item exists AND its `kind` field
 * matches the expected kind for the concept (`"tile"`, `"resource"`, `"tool"`
 * respectively). Returning `null` for a mismatched kind is what makes
 * `conceptForKey` accurate — without this check every resource and tool key
 * would resolve to `"tiles"` (the first concept that scans ITEMS).
 */
export function getEntity(conceptId: string, key: string): Record<string, unknown> | null {
  switch (conceptId) {
    // ── item kinds ──────────────────────────────────────────────────────────
    case "tiles": {
      const item = toRecord((ITEMS as Record<string, unknown>)[key]);
      return item !== null && item["kind"] === "tile" ? item : null;
    }
    case "resources": {
      const item = toRecord((ITEMS as Record<string, unknown>)[key]);
      return item !== null && item["kind"] === "resource" ? item : null;
    }
    case "tools": {
      const item = toRecord((ITEMS as Record<string, unknown>)[key]);
      return item !== null && item["kind"] === "tool" ? item : null;
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

    // ── post-keeper progression concepts ─────────────────────────────────────
    case "keepers": {
      // KEEPERS is keyed by biome type; find the keeper whose `id` matches.
      for (const keeper of Object.values(KEEPERS)) {
        const rec = toRecord(keeper);
        if (rec?.["id"] === key) return rec;
      }
      return null;
    }

    case "boons": {
      // Search every catalog for a boon whose id matches.
      return findById(allBoons(), key);
    }

    case "dailyRewards": {
      const day = Number(key);
      if (!Number.isInteger(day)) return null;
      const reward = toRecord((DAILY_REWARDS as Record<string, unknown>)[String(day)]);
      if (reward === null) return null;
      return { day, ...reward };
    }

    case "achievements": {
      return findById(ACHIEVEMENTS, key);
    }

    default:
      return null;
  }
}

/**
 * Inverse of `getEntity`. Given an entity key, return the first concept id
 * (in CONCEPTS array order) whose `getEntity(conceptId, key)` is non-null.
 *
 * **Prefer the `"<conceptId>:<entityKey>"` focus format** (used by WikiTab's
 * hash router) for unambiguous resolution. `conceptForKey` is the best-effort
 * fallback for bare keys — it works correctly for the vast majority of the
 * catalog, but a handful of keys genuinely collide across concepts:
 *   - `"forge"` — both a zone id and a building id
 *   - `"portal"` — both a building id and a view id
 *   - Most tool keys (e.g. `"axe"`, `"bomb"`, `"rake"`, …) also appear as
 *     recipe keys, and most resource keys (e.g. `"bread"`, `"supplies"`, …)
 *     also appear as recipe keys.
 * For these collisions, `conceptForKey` returns the FIRST matching concept in
 * CONCEPTS array order (tiles → resources → tools → categories → zones →
 * settlementBiomes → recipes → buildings → hazards → bosses → workers → npcs
 * → abilities → toolPowers → tileDiscoveryMethods → seasons → views → modals),
 * which may not be the intended one. Callers that need precision should use the
 * prefixed focus format rather than relying on this function.
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

/**
 * Parse a wiki focus string into its component concept id and entity key.
 *
 * The canonical focus format is `"<conceptId>:<entityKey>"` — the router
 * stores the entire string as the opaque second hash segment, and `:` inside
 * it is safe (only `/` would split the segment). Using the prefixed format
 * eliminates ambiguity for keys that appear in multiple concepts (e.g. `forge`
 * is both a zone and a building).
 *
 * Fallback (bare-key) path: if `focus` contains no `:`, or if the parsed
 * prefix is not a known concept / resolves to null via `getEntity`, the
 * function falls back to `conceptForKey(focus)` which returns the first
 * matching concept in CONCEPTS array order. This handles stale/garbled focuses
 * gracefully.
 *
 * Returns `null` when `focus` is null/empty or no concept can be resolved.
 */
export function parseWikiFocus(
  focus: string | null,
): { conceptId: string; entityKey: string } | null {
  if (!focus) return null;

  // Try the prefixed format: "<conceptId>:<entityKey>"
  const colonIdx = focus.indexOf(":");
  if (colonIdx !== -1) {
    const conceptId = focus.slice(0, colonIdx);
    const entityKey = focus.slice(colonIdx + 1);
    // Validate: conceptId must be a known concept, and getEntity must resolve
    const knownConcept = CONCEPTS.find((c) => c.id === conceptId);
    if (knownConcept != null && getEntity(conceptId, entityKey) !== null) {
      return { conceptId, entityKey };
    }
    // Prefix unrecognised or entity not found — fall through to bare-key path
  }

  // Bare-key fallback: treat the whole focus as an entity key
  const resolvedConceptId = conceptForKey(focus);
  if (resolvedConceptId !== null) {
    return { conceptId: resolvedConceptId, entityKey: focus };
  }

  return null;
}
