/**
 * ConceptFields.tsx — Concept-level field reference for the Dev Panel Wiki.
 *
 * Renders a read-only "Fields" table documenting the shared shape of all
 * entities in a concept category (e.g. "the fields every Boss has").
 * Unlike EntityDetail, there is no single live entity — the Value column is
 * omitted.
 *
 * READ-ONLY — no editable controls.
 */

import React from "react";
import { COLORS } from "../shared.jsx";
import { describeSchema } from "../schemaDoc.js";
import { schemaForConcept } from "./conceptSchemas.js";
import { FieldsTable } from "./FieldsTable.jsx";

// ─── ConceptFields ────────────────────────────────────────────────────────────

/**
 * Concept-level field reference.
 *
 * For concepts that have a Zod schema this renders a "Fields" heading and the
 * schema field table (no Value column — there is no single entity in scope).
 * For concepts with no schema it renders a graceful note.
 */
export function ConceptFields({ conceptId }: { conceptId: string }) {
  const cs = schemaForConcept(conceptId);

  // No schema for this concept — live-config-only (hazards, seasons, …)
  if (cs == null) {
    return (
      <p
        className="text-[11px] italic"
        style={{ color: COLORS.inkSubtle }}
      >
        Fields for this concept come straight from live config (no schema reference).
      </p>
    );
  }

  // Attempt to introspect the schema
  let doc: ReturnType<typeof describeSchema> | null = null;
  try {
    doc = describeSchema(cs.schema);
  } catch {
    // doc remains null — fall through to graceful note below
  }

  if (doc == null) {
    return (
      <p
        className="text-[11px] italic"
        style={{ color: COLORS.inkSubtle }}
      >
        Fields for this concept come straight from live config (no schema reference).
      </p>
    );
  }

  return (
    <div>
      {/* Section heading */}
      <div
        className="text-[10px] font-bold uppercase tracking-wide mb-2"
        style={{ color: COLORS.inkSubtle }}
      >
        Fields
        {cs.kind === "override" && (
          <span className="ml-1 normal-case font-normal">
            (override — only fields tunable via balance.json are listed)
          </span>
        )}
      </div>

      {/* Schema field table — no live entity, so Value column is omitted */}
      <FieldsTable fields={doc.fields} showValue={false} />
    </div>
  );
}
