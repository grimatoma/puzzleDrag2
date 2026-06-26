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
import { CONCEPTS, craftedResourceKeys } from "./concepts.js";
import EntryGrid from "./EntryGrid.jsx";
import type { WikiEntry, WikiEntryFact } from "./EntryGrid.jsx";
import { EntityVisual } from "./EntityVisual.jsx";
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
import { IconVariantToggle } from "./IconVariantToggle.jsx";
import { conceptHeadlineStats } from "./conceptStats.js";
import { getEntity } from "./conceptEntities.js";
import { infoboxFacts } from "./infoboxFacts.js";
import { groupToolEntries } from "./toolGrouping.js";
import { EconomyRollup } from "./sections/EconomyRollup.jsx";
import { BossComparison } from "./sections/BossComparison.jsx";
import { WorkerComparison } from "./sections/WorkerComparison.jsx";
import { ProgressionTimeline } from "./sections/ProgressionTimeline.jsx";
import { LiveCostMatrix } from "./sections/CostMatrixCard.jsx";
import { useWikiView } from "./wikiView.js";
import type { CostMatrixId } from "./costMatrix.js";
import { conceptAccent } from "./conceptAccent.js";

/** Concepts that get an inline editable cost matrix on their category page. */
const COST_MATRIX_CONCEPTS = new Set<string>(["buildings", "tools", "resources"]);

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
    tone: f.tone,
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
  const { view } = useWikiView();

  // Tiles page only: which icon representation the entry cards bake. "canvas"
  // (the general procedural icon) is the default; "pixel" swaps in each tile's
  // baked seasonal sprite where one exists (tiles with no baked art keep their
  // general icon — the non-puzzle states always show the general icon).
  const [tileIconVariant, setTileIconVariant] = useState<"canvas" | "pixel">("canvas");

  // Resources concept only: filter the gallery between base (gathered) and
  // crafted (recipe-produced) resources.
  const [resourceFilter, setResourceFilter] = useState<"all" | "base" | "crafted">("all");

  // Resolve concept descriptor — fall back to the first concept if unknown
  const concept = CONCEPTS.find((c) => c.id === conceptId) ?? CONCEPTS[0];

  // Entries from the live config — enriched with up to 3 fact chips each
  const rawEntries = concept.getEntries();
  const entries = rawEntries.map((e) => enrichEntry(conceptId, e as unknown as WikiEntry));

  // Base-vs-crafted split for the Resources concept. `crafted` = produced by a
  // recipe; everything else of kind "resource" is gathered from the board.
  const isResources = conceptId === "resources";
  const craftedKeys = isResources ? craftedResourceKeys() : null;
  const craftedCount = craftedKeys
    ? entries.filter((e) => craftedKeys.has(e.key)).length
    : 0;
  const baseCount = entries.length - craftedCount;
  const galleryEntries =
    craftedKeys && resourceFilter !== "all"
      ? entries.filter((e) =>
          resourceFilter === "crafted" ? craftedKeys.has(e.key) : !craftedKeys.has(e.key),
        )
      : entries;
  const RESOURCE_FILTERS: Array<{ id: "all" | "base" | "crafted"; label: string; count: number }> = [
    { id: "all", label: "All", count: entries.length },
    { id: "base", label: "Base", count: baseCount },
    { id: "crafted", label: "Crafted", count: craftedCount },
  ];

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
    <div
      className="flex flex-col gap-3 wiki-reveal-stagger"
      style={{ "--wiki-accent": conceptAccent(conceptId) } as React.CSSProperties}
    >

      {/* ── 1. Concept hero ────────────────────────────────────────────────── */}
      <div className="wiki-concept-hero">
        {/* Title row */}
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="wiki-concept-title" style={{ margin: 0 }}>
            {concept.label}
          </h1>
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
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="wiki-section-heading">
              Entries ({entries.length})
            </h2>
            <IconVariantToggle value={tileIconVariant} onChange={setTileIconVariant} />
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
                    iconVariant={tileIconVariant}
                    conceptId={conceptId}
                  />
                </div>
              ))}
            </section>
          ))}
        </div>
      ) : conceptId === "tools" ? (
        <div data-testid="wiki-entry-gallery" className="flex flex-col gap-4">
          <h2 className="wiki-section-heading">
            Entries ({entries.length})
          </h2>
          {groupToolEntries(entries).map((group) => (
            <section key={group.boardKind} className="flex flex-col gap-3">
              {/* Board-kind band heading — icon + label, ember accent */}
              <div
                className="flex items-center gap-2 pb-1"
                style={{ borderBottom: `2px solid ${COLORS.border}` }}
              >
                <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>
                  {group.icon}
                </span>
                <span className="wiki-concept-title" style={{ fontSize: 18 }}>
                  {group.label}
                </span>
                <span className="text-[12px]" style={{ color: COLORS.inkSubtle }}>
                  ({group.entries.length})
                </span>
              </div>
              <EntryGrid
                entries={group.entries}
                onSelect={(key) => navigate(wikiNavTarget(conceptId, key))}
                conceptId={conceptId}
              />
            </section>
          ))}
        </div>
      ) : (
        <div data-testid="wiki-entry-gallery">
          <h2 className="wiki-section-heading mb-2">
            Entries ({galleryEntries.length})
          </h2>
          {isResources && (
            <div
              role="group"
              aria-label="Filter resources"
              className="flex flex-wrap gap-1 mb-2"
            >
              {RESOURCE_FILTERS.map((option) => {
                const active = resourceFilter === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setResourceFilter(option.id)}
                    className="rounded-md px-2.5 py-1 text-[12px] font-semibold border cursor-pointer transition-colors"
                    style={{
                      borderColor: active ? COLORS.ember : COLORS.border,
                      background: active ? COLORS.ember : COLORS.parchment,
                      color: active ? "#fff" : COLORS.inkSubtle,
                    }}
                  >
                    {option.label}{" "}
                    <span style={{ opacity: 0.75 }}>({option.count})</span>
                  </button>
                );
              })}
            </div>
          )}
          <EntryGrid
            entries={galleryEntries}
            onSelect={(key) => navigate(wikiNavTarget(conceptId, key))}
            conceptId={conceptId}
            renderVisual={
              conceptId === "buildings"
                ? (entry) => (
                    <EntityVisual conceptId="buildings" entityKey={entry.key} size={36} />
                  )
                : undefined
            }
          />
        </div>
      )}

      {/* ── 4. Analytical rollups / comparison sections ────────────────────
          Placed below the gallery so the player sees entities first. */}
      {conceptId === "buildings" && <EconomyRollup />}
      {conceptId === "bosses" && <BossComparison />}
      {conceptId === "workers" && <WorkerComparison />}
      {conceptId === "tiles" && <ProgressionTimeline />}

      {/* ── 4a. Editable cost matrix (Buildings / Tools / Resources) ───────
          Editing is staging-only (Developer view); the unified "Cost matrix"
          dev page stacks all three and exports the staged changes. */}
      {COST_MATRIX_CONCEPTS.has(conceptId) && (
        <LiveCostMatrix matrixId={conceptId as CostMatrixId} editable={view === "developer"} />
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
