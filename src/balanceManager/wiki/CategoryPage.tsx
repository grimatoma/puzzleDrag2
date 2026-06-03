/**
 * CategoryPage.tsx — Concept/category article page for the Dev Panel Wiki.
 *
 * Phase 1 layout (gallery-first):
 *   1. Concept hero   — title + blurb + status badge + banner stat chips
 *   2. Authored intro — optional bodyFor(conceptId, "_index")
 *   3. Entity gallery — entry grid (tiles uses grouped sub-category layout)
 *   4. Analytical sections — EconomyRollup, BossComparison, WorkerComparison,
 *      ProgressionTimeline, recipe graph
 *   5. Field reference — ReferenceSection + ConceptFields (developer view only)
 *
 * READ-ONLY — no editable controls.
 */

import React, { useState } from "react";
import { COLORS } from "../shared.jsx";
import { useBalanceNav } from "../balanceNav.jsx";
import { CONCEPTS } from "./concepts.js";
import EntryGrid from "./EntryGrid.jsx";
import type { WikiEntry, WikiEntryFact } from "./EntryGrid.jsx";
import { ConceptFields } from "./ConceptFields.jsx";
import { bodyFor } from "./htmlContent.js";
import HtmlBody from "./HtmlBody.jsx";
import { statusForConcept } from "./status.js";
import { StatusBadge } from "./StatusBadge.jsx";
import { ReferenceSection } from "./ReferenceSection.jsx";
import { wikiNavTarget } from "./WikiLinkButton.jsx";
import { schemaForConcept } from "./conceptSchemas.js";
import { describeSchema } from "../schemaDoc.js";
import { groupTileEntries } from "./tileGrouping.js";
import { conceptHeadlineStats } from "./conceptStats.js";
import { getEntity } from "./conceptEntities.js";
import { infoboxFacts } from "./infoboxFacts.js";
// Direct import — the graph is inside a collapsed section (graphOpen=false by
// default) so it only renders when the user opens it. No lazy() needed since
// the collapsed-by-default guard already ensures the graph isn't built until
// the user expands the section.
import RecipeGraph from "./RecipeGraph.jsx";
import { EconomyRollup } from "./sections/EconomyRollup.jsx";
import { BossComparison } from "./sections/BossComparison.jsx";
import { WorkerComparison } from "./sections/WorkerComparison.jsx";
import { ProgressionTimeline } from "./sections/ProgressionTimeline.jsx";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Enrich a raw entry with up to 3 fact chips, sourced from infoboxFacts.
 * Pure — reads live entity via getEntity, maps first 2–3 facts to card chips.
 * Returns the entry unchanged when no facts can be derived.
 */
function enrichEntry(conceptId: string, entry: WikiEntry): WikiEntry {
  const entity = getEntity(conceptId, entry.key);
  if (!entity) return entry;
  const rawFacts = infoboxFacts(conceptId, entry.key, entity);
  if (rawFacts.length === 0) return entry;
  const facts: WikiEntryFact[] = rawFacts.map((f) => ({
    value: f.value,
    label: f.label,
    iconKey: f.iconKey,
  }));
  return { ...entry, facts };
}

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

  // Entries from the live config — enriched with up to 3 fact chips each
  const rawEntries = concept.getEntries();
  const entries = rawEntries.map((e) => enrichEntry(conceptId, e as unknown as WikiEntry));

  // Attribute count (used inside ReferenceSection intro line only)
  const cs = schemaForConcept(conceptId);
  let attrCount = 0;
  if (cs != null) {
    try {
      attrCount = describeSchema(cs.schema).fields.length;
    } catch {
      attrCount = 0;
    }
  }

  // Authored intro HTML (optional — none seeded yet; gracefully absent)
  const intro = bodyFor(conceptId, "_index");

  // Status badge
  const status = statusForConcept(conceptId);

  // Headline stats for the hero banner
  const stats = conceptHeadlineStats(conceptId, entries);

  return (
    <div className="flex flex-col gap-3 wiki-reveal-stagger">

      {/* ── 1. Concept hero ────────────────────────────────────────────────── */}
      <div className="wiki-concept-hero">
        {/* Title row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="wiki-concept-title">
            {concept.label}
          </span>
          <StatusBadge status={status} />
        </div>

        {/* Blurb — once, inside the hero */}
        <p
          className="text-[13px] italic m-0"
          style={{ color: COLORS.inkSubtle }}
        >
          {concept.blurb}
        </p>

        {/* Banner strip with stat chips */}
        {stats.length > 0 && (
          <div className="wiki-hero-banner">
            {stats.map((s) => (
              <div key={s.label} className="wiki-stat-chip">
                <span className="wiki-stat-chip__value">{s.value}</span>
                <span className="wiki-stat-chip__label">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 2. Authored intro (optional) ──────────────────────────────────── */}
      {intro != null && (
        <section>
          <HtmlBody source={intro} />
        </section>
      )}

      {/* ── 3. Entity gallery ─────────────────────────────────────────────── */}
      {conceptId === "tiles" ? (
        <div data-testid="wiki-entry-gallery" className="flex flex-col gap-4">
          <div className="wiki-section-heading">
            Entries ({entries.length})
          </div>
          {groupTileEntries(entries).map((subGroup) => (
            <section key={subGroup.sub} className="flex flex-col gap-3">
              {/* Sub-category band heading — icon + label, ember accent */}
              <div
                className="flex items-center gap-2 pb-1"
                style={{ borderBottom: `2px solid ${COLORS.border}` }}
              >
                <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>
                  {subGroup.icon}
                </span>
                <span
                  className="wiki-concept-title"
                  style={{ fontSize: 18 }}
                >
                  {subGroup.label}
                </span>
              </div>

              {subGroup.categories.map((catGroup) => (
                <div key={catGroup.category} className="flex flex-col gap-2">
                  <div
                    className="text-[12px] font-bold uppercase tracking-wide"
                    style={{ color: COLORS.inkSubtle }}
                  >
                    {catGroup.label}
                  </div>
                  <EntryGrid
                    entries={catGroup.entries}
                    onSelect={(key) => navigate(wikiNavTarget(conceptId, key))}
                  />
                </div>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <div data-testid="wiki-entry-gallery">
          <div className="wiki-section-heading mb-2">
            Entries ({entries.length})
          </div>
          <EntryGrid
            entries={entries}
            onSelect={(key) => navigate(wikiNavTarget(conceptId, key))}
          />
        </div>
      )}

      {/* ── 4. Analytical rollups / comparison sections ────────────────────
          Placed below the gallery so the player sees entities first. */}
      {conceptId === "buildings" && <EconomyRollup />}
      {conceptId === "bosses" && <BossComparison />}
      {conceptId === "workers" && <WorkerComparison />}
      {conceptId === "tiles" && <ProgressionTimeline />}

      {/* ── 4b. Recipe relationship graph (recipes concept only) ─────────── */}
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

      {/* ── 5. Field reference — hidden in player view, always at bottom ──── */}
      <div data-testid="wiki-field-reference">
      <ReferenceSection>
        {/* Intro sentence lives here, next to the table, not in the hero. */}
        {attrCount > 0 && (
          <p className="text-[13px] leading-relaxed m-0 mb-2" style={{ color: COLORS.ink }}>
            Every <span className="wiki-mono">{concept.label.toLowerCase()}</span> entry
            shares {attrCount} defined {attrCount === 1 ? "attribute" : "attributes"}.
          </p>
        )}
        <ConceptFields conceptId={conceptId} />
      </ReferenceSection>
      </div>

    </div>
  );
}
