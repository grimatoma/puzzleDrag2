/**
 * conceptSchemas.ts — Maps Dev Panel wiki concept ids to their Zod schemas.
 *
 * Pure module: no React, no DOM, no game state.  Importing from
 * src/config/schemas/* only — no src/constants or wiki/concepts.ts imports
 * (prevents import cycles; concept ids are plain strings).
 *
 * "definition" schemas describe the full canonical shape of an entry.
 * "override"   schemas describe partial patches accepted via balance.json.
 *
 * Concepts with no Zod schema (live-config-only: categories, hazards, seasons,
 * views, modals, tileDiscoveryMethods) return null.
 */

import {
  tileItemSchema,
  resourceItemSchema,
  toolItemSchema,
  zoneOverrideSchema,
  settlementBiomeEntrySchema,
  recipeDefinitionSchema,
  buildingDefinitionSchema,
  bossOverrideSchema,
  workerOverrideSchema,
  abilityCatalogEntrySchema,
  toolPowerCatalogEntrySchema,
} from "../../config/schemas/index.js";

// npcOverrideSchema is not re-exported from index.ts — import directly.
import { npcOverrideSchema } from "../../config/schemas/npc.js";

// ─── Public interface ─────────────────────────────────────────────────────────

export interface ConceptSchema {
  /** The resolved Zod object schema (or wrapper). */
  schema: unknown;
  /** "definition" = full canonical entry shape; "override" = partial balance.json patch. */
  kind: "definition" | "override";
}

/**
 * Return the canonical schema for a wiki concept id, or `null` if the concept
 * has no Zod schema (live-config-only concepts).
 */
export function schemaForConcept(conceptId: string): ConceptSchema | null {
  switch (conceptId) {
    // ── item kinds (definitions) ──────────────────────────────────────────
    case "tiles":
      return { schema: tileItemSchema, kind: "definition" };
    case "resources":
      return { schema: resourceItemSchema, kind: "definition" };
    case "tools":
      return { schema: toolItemSchema, kind: "definition" };

    // ── game structure (definitions) ─────────────────────────────────────
    case "zones":
      return { schema: zoneOverrideSchema, kind: "override" };
    case "settlementBiomes":
      return { schema: settlementBiomeEntrySchema, kind: "definition" };
    case "recipes":
      return { schema: recipeDefinitionSchema, kind: "definition" };
    case "buildings":
      return { schema: buildingDefinitionSchema, kind: "definition" };

    // ── override patches ──────────────────────────────────────────────────
    case "bosses":
      return { schema: bossOverrideSchema, kind: "override" };
    case "workers":
      return { schema: workerOverrideSchema, kind: "override" };
    case "npcs":
      return { schema: npcOverrideSchema, kind: "override" };

    // ── catalogs (definitions) ────────────────────────────────────────────
    case "abilities":
      return { schema: abilityCatalogEntrySchema, kind: "definition" };
    case "toolPowers":
      return { schema: toolPowerCatalogEntrySchema, kind: "definition" };

    // ── live-config-only concepts (no Zod schema) ─────────────────────────
    case "categories":
    case "hazards":
    case "seasons":
    case "views":
    case "modals":
    case "tileDiscoveryMethods":
      return null;

    default:
      return null;
  }
}
