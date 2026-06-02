/**
 * CategoryPage.tsx — Concept/category article page for the Dev Panel Wiki.
 *
 * Renders the "Bosses page" model for a concept: title + status chip, blurb,
 * an optional authored intro, a field reference (ConceptFields), and the full
 * entity grid (each card navigates to that entity's article).
 *
 * READ-ONLY — no editable controls.
 */

import React, { useState } from "react";
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
// Direct import — the graph is inside a collapsed section (graphOpen=false by
// default) so it only renders when the user opens it. No lazy() needed since
// the collapsed-by-default guard already ensures the graph isn't built until
// the user expands the section.
import RecipeGraph from "./RecipeGraph.jsx";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CategoryPageProps {
  conceptId: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CategoryPage({ conceptId }: CategoryPageProps) {
  const { navigate } = useBalanceNav();

  // Tracks whether the recipe graph section is open (collapsed by default)
  const [graphOpen, setGraphOpen] = useState(false);

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

      {/* ── 3b. Recipe relationship graph (recipes concept only) ──────────── */}
      {conceptId === "recipes" && (
        <section>
          {/* Native <details> for collapsible — collapsed by default so the
              heavy graph only initialises when the user opens the section.
              We use a controlled state toggle so RecipeGraph is only mounted
              when open (avoids building the graph on every page view). */}
          <details
            open={graphOpen}
            onToggle={(e) => setGraphOpen((e.currentTarget as HTMLDetailsElement).open)}
            style={{ borderRadius: 8, overflow: "hidden" }}
          >
            <summary
              onClick={(e) => {
                // Explicitly mirror the native toggle into React state so the
                // mount/unmount of RecipeGraph is React-controlled and
                // testable even in jsdom (which doesn't fully emulate the
                // native details/summary toggle behaviour).
                e.preventDefault();
                setGraphOpen((prev) => !prev);
              }}
              style={{
                cursor: "pointer",
                listStyle: "none",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: COLORS.parchmentDeep,
                border: `1px solid ${COLORS.border}`,
                borderRadius: graphOpen ? "8px 8px 0 0" : 8,
                fontSize: 13,
                fontWeight: 600,
                color: COLORS.ink,
                userSelect: "none",
              }}
            >
              {/* Chevron indicator */}
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 12,
                  fontSize: 10,
                  lineHeight: "12px",
                  textAlign: "center",
                  transform: graphOpen ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 150ms ease",
                  color: COLORS.inkSubtle,
                  flexShrink: 0,
                }}
              >
                ▶
              </span>
              Recipe relationship graph
            </summary>

            {/* Only mount RecipeGraph when the section is open */}
            {graphOpen && (
              <div
                style={{
                  padding: 12,
                  background: COLORS.parchment,
                  border: `1px solid ${COLORS.border}`,
                  borderTop: "none",
                  borderRadius: "0 0 8px 8px",
                }}
              >
                <RecipeGraph />
              </div>
            )}
          </details>
        </section>
      )}

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
