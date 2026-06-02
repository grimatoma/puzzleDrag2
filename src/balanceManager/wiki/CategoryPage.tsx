/**
 * CategoryPage.tsx — Concept/category article page for the Dev Panel Wiki.
 *
 * Renders the "Bosses page" model for a concept: title + status chip, blurb,
 * an optional authored intro, a field reference (ConceptFields), and the full
 * entity grid (each card navigates to that entity's article).
 *
 * READ-ONLY — no editable controls.
 */

import React from "react";
import { COLORS } from "../shared.jsx";
import { useBalanceNav } from "../balanceNav.jsx";
import { CONCEPTS } from "./concepts.js";
import EntryGrid from "./EntryGrid.jsx";
import type { WikiEntry } from "./EntryGrid.jsx";
import { ConceptFields } from "./ConceptFields.jsx";
import { bodyFor } from "./htmlContent.js";
import HtmlBody from "./HtmlBody.jsx";
import { statusForConcept, WIKI_STATUS_LEGEND } from "./status.js";
import StatusChip from "../../ui/primitives/StatusChip.jsx";
import { wikiNavTarget } from "./WikiLinkButton.jsx";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CategoryPageProps {
  conceptId: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CategoryPage({ conceptId }: CategoryPageProps) {
  const { navigate } = useBalanceNav();

  // Resolve concept descriptor — fall back to the first concept if unknown
  const concept = CONCEPTS.find((c) => c.id === conceptId) ?? CONCEPTS[0];

  // Entries from the live config
  const entries = concept.getEntries();

  // Authored intro HTML (optional — none seeded yet; gracefully absent)
  const intro = bodyFor(conceptId, "_index");

  // Status chip
  const status = statusForConcept(conceptId);
  const statusMeta = WIKI_STATUS_LEGEND[status];

  return (
    <div className="flex flex-col gap-3 wiki-reveal-stagger">
      {/* ── 1. Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Concept title — display serif */}
          <span className="wiki-concept-title">
            {concept.label}
          </span>

          {/* Status chip */}
          <StatusChip
            tone={statusMeta.tone}
            size="xs"
            uppercase
            mono
            title={statusMeta.description}
            aria-label={`Status: ${statusMeta.label}`}
          >
            {statusMeta.label}
          </StatusChip>
        </div>

        {/* Blurb */}
        <p
          className="text-[13px] italic m-0"
          style={{ color: COLORS.inkSubtle }}
        >
          {concept.blurb}
        </p>
      </div>

      {/* ── 2. Authored intro (optional) ──────────────────────────────────── */}
      {intro != null && (
        <section>
          <HtmlBody source={intro} />
        </section>
      )}

      {/* ── 3. Field reference ────────────────────────────────────────────── */}
      <ConceptFields conceptId={conceptId} />

      {/* ── 4. Entity grid ────────────────────────────────────────────────── */}
      <div>
        <div className="wiki-section-heading mb-2">
          Entries ({entries.length})
        </div>
        <EntryGrid
          entries={entries as unknown as WikiEntry[]}
          onSelect={(key) => navigate(wikiNavTarget(conceptId, key))}
        />
      </div>
    </div>
  );
}
