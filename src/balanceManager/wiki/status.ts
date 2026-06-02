/**
 * status.ts — Concept/entity implementation-status classification for the Dev Panel Wiki.
 *
 * Each wiki concept (and optionally individual entities within a concept) carries
 * one of five status labels that communicate how far along in the implementation
 * the feature is. The status map is seeded from three concrete sources (in priority
 * order): compile-time feature flags, dormant Dev Panel tabs, and the system-by-system
 * assessment in docs/progression-plan-v2.html. Where those sources conflict, code
 * signals win over the doc assessment.
 */

import { FIRE_HAZARD_ENABLED, RATS_HAZARD_ENABLED } from "../../featureFlags.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WikiStatus = "WIRED" | "PARTIAL" | "STUB" | "DOC-ONLY" | "PLANNED";

export interface StatusMeta {
  /** Short display label (same as the status key but friendlier). */
  label: string;
  /** One-line description of the status. */
  description: string;
  /** StatusChip tone to apply. */
  tone: "success" | "info" | "warning" | "danger" | "slate";
}

// ─── Legend ───────────────────────────────────────────────────────────────────

export const WIKI_STATUS_LEGEND: Record<WikiStatus, StatusMeta> = {
  WIRED: {
    label: "WIRED",
    description: "Implemented and runs in normal play.",
    tone: "success",
  },
  PARTIAL: {
    label: "PARTIAL",
    description: "Partly wired — runs only in some paths or has incomplete coverage.",
    tone: "info",
  },
  STUB: {
    label: "STUB",
    description: "Present in code but inert — a placeholder or 'coming soon' shell.",
    tone: "warning",
  },
  "DOC-ONLY": {
    label: "DOC-ONLY",
    description: "In the design doc but not yet in code.",
    tone: "danger",
  },
  PLANNED: {
    label: "PLANNED",
    description: "A planned change not yet built.",
    tone: "slate",
  },
};

// ─── Concept-level status map ─────────────────────────────────────────────────
//
// All concepts default to WIRED. Only non-WIRED concepts are listed here.
// Each entry includes a one-line rationale comment citing the source.

const CONCEPT_STATUS: Partial<Record<string, WikiStatus>> = {
  // SOURCE: dormant Dev Panel tab + v2 doc §17 "Bosses — PARTIAL"
  // Bosses are defined and have modifiers, but are triggered manually (debug/story
  // beats only) — no auto day-cooldown loop; tickModifier runs only in tests.
  bosses: "PARTIAL",

  // SOURCE: dormant Dev Panel tab (biomes: dormant: true in src/balanceManager/index.tsx)
  // Settlement biomes are data-only in SETTLEMENT_BIOMES; the founding flow does
  // read them but the full biome-selection / specialization UX is not wired.
  settlementBiomes: "PARTIAL",

  // SOURCE: v2 doc §14 "Hazards — PARTIAL (biome catalog)"
  // The mine HAZARDS array (cave_in/gas_vent/lava/mole) is fully wired.
  // The farm hazard catalog (fire/wolf/rats) only some are active; overall concept
  // is PARTIAL because the hazard listing mixes fully-wired and gated entries.
  hazards: "PARTIAL",
};

// ─── Entity-level overrides ───────────────────────────────────────────────────
//
// Keyed by conceptId → entityKey → WikiStatus.
// An entity override takes precedence over the concept-level status.

const ENTITY_STATUS: Partial<Record<string, Partial<Record<string, WikiStatus>>>> = {
  hazards: {
    // SOURCE: src/featureFlags.ts — FIRE_HAZARD_ENABLED === false (compile-time flag)
    // fire is present in FARM_HAZARD_META and rollFarmHazard checks isFireHazardEnabled(),
    // but the flag is false at build time, making it inert in normal play.
    fire: FIRE_HAZARD_ENABLED ? "WIRED" : "STUB",

    // SOURCE: src/featureFlags.ts — RATS_HAZARD_ENABLED === true
    // rats is gated by RATS_HAZARD_ENABLED and the flag is true; fully wired.
    rats: RATS_HAZARD_ENABLED ? "WIRED" : "STUB",

    // SOURCE: v2 doc §14 — mine hazards (cave_in/gas_vent/lava/mole) are WIRED
    cave_in: "WIRED",
    gas_vent: "WIRED",
    lava: "WIRED",
    mole: "WIRED",

    // SOURCE: farm/hazards.ts — wolves implemented and not behind a flag
    wolf: "WIRED",
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the implementation status for a whole concept (all entities share it
 * unless an entity-level override is set).
 */
export function statusForConcept(conceptId: string): WikiStatus {
  return CONCEPT_STATUS[conceptId] ?? "WIRED";
}

/**
 * Returns the implementation status for a specific entity within a concept.
 * Checks entity-level overrides first; falls back to the concept-level status.
 */
export function statusForEntity(conceptId: string, entityKey: string): WikiStatus {
  const entityOverrides = ENTITY_STATUS[conceptId];
  if (entityOverrides && Object.prototype.hasOwnProperty.call(entityOverrides, entityKey)) {
    return entityOverrides[entityKey] as WikiStatus;
  }
  return statusForConcept(conceptId);
}
