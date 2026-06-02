/**
 * backlinks.ts — Reverse-index ("What links here") for the Dev Panel Wiki.
 *
 * Pure module: no React, no DOM.
 * `backlinksFor(conceptId, key)` is the inverse of `relationsFor`:
 * given a target entity it returns the entities that link TO it, grouped by
 * the source concept's human label (e.g. "Recipes", "Zones").
 *
 * The index is built once on first call and cached at module scope.
 * `__resetBacklinkIndex()` forces a rebuild (used only in tests).
 */

import { CONCEPTS } from "./concepts.js";
import { getEntity } from "./conceptEntities.js";
import { relationsFor, type RelationGroup, type WikiLink } from "./relations.js";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Composite key for a single entity: "<conceptId>:<entityKey>". */
type EntityKey = string;

/**
 * The module-scope index maps each target EntityKey to a Map whose keys are
 * the SOURCE concept's human label and whose values are the deduplicated list
 * of WikiLinks pointing to that target.
 */
type Index = Map<EntityKey, Map<string, WikiLink[]>>;

// ─── Module-scope cache ───────────────────────────────────────────────────────

let INDEX: Index | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function entityKey(conceptId: string, key: string): EntityKey {
  return `${conceptId}:${key}`;
}

function labelForConcept(id: string): string {
  return CONCEPTS.find((c) => c.id === id)?.label ?? id;
}

// ─── Index builder ────────────────────────────────────────────────────────────

function build(): Index {
  const idx: Index = new Map();

  for (const concept of CONCEPTS) {
    const srcConceptId = concept.id;
    const srcConceptLabel = labelForConcept(srcConceptId);

    for (const entry of concept.getEntries()) {
      // `entry.key` is verified by reading concepts.ts — all entry factories
      // push objects with a `key` field (see itemsOfKind, recipeEntries, etc.).
      const srcKey = (entry as { key: string }).key;
      const srcName = String((entry as { name?: unknown }).name ?? srcKey);
      const srcEntity = getEntity(srcConceptId, srcKey);

      // The backlink WikiLink representing this source entity
      const backLink: WikiLink = {
        conceptId: srcConceptId,
        key: srcKey,
        label: srcName,
      };

      // Walk all forward links produced by this source entity
      const forwardGroups = relationsFor(srcConceptId, srcKey, srcEntity);
      for (const group of forwardGroups) {
        for (const target of group.links) {
          const tk = entityKey(target.conceptId, target.key);

          // Get or create the per-source-concept bucket for this target
          let byConcept = idx.get(tk);
          if (byConcept === undefined) {
            byConcept = new Map<string, WikiLink[]>();
            idx.set(tk, byConcept);
          }

          // Dedupe: each (srcConceptId, srcKey) pair appears at most once per group
          const arr = byConcept.get(srcConceptLabel) ?? [];
          const alreadyPresent = arr.some(
            (l) => l.conceptId === srcConceptId && l.key === srcKey,
          );
          if (!alreadyPresent) {
            arr.push(backLink);
          }
          byConcept.set(srcConceptLabel, arr);
        }
      }
    }
  }

  return idx;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Return the entities that link TO the given concept/key pair, grouped by the
 * source concept's human label (e.g. "Recipes", "Zones").
 *
 * The index is built lazily on first call and cached for the module lifetime.
 * Returns an empty array when nothing links to the given entity.
 */
export function backlinksFor(conceptId: string, key: string): RelationGroup[] {
  if (INDEX === null) INDEX = build();

  const byConcept = INDEX.get(entityKey(conceptId, key));
  if (!byConcept) return [];

  return [...byConcept.entries()].map(([title, links]) => ({ title, links }));
}

/**
 * Reset the cached index back to null so the next `backlinksFor` call forces a
 * full rebuild. Intended for use in tests only.
 */
export function __resetBacklinkIndex(): void {
  INDEX = null;
}
