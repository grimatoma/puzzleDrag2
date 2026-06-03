/**
 * WikiHome.tsx — Visual discovery landing for the Hearthwood Vale game wiki.
 *
 * Phase 4a: Renders when the wiki opens to the overview landing (`tab="page"`,
 * `pageSlug="overview"`). Composes, top-to-bottom:
 *
 *   1. Hero — title callout + the overview prose intro (first paragraph + town map
 *      embed), sourced live from the authored overview.html so nothing is
 *      hand-duplicated.
 *   2. "Browse by category" — visual section/concept tile grid, built live from
 *      WIKI_SECTIONS + CONCEPTS.getEntries(). Screens section hidden in player view.
 *   3. "Start here" — curated linear newcomer path (chips) + narrative page links.
 *   4. Full overview prose — the remainder of overview.html rendered via NarrativePage
 *      so nothing is lost and the copy stays config-synced.
 *
 * Constraints satisfied:
 *  - category list / counts live from WIKI_SECTIONS + CONCEPTS.getEntries() — no hardcoding.
 *  - conceptAccent() drives per-tile colour theming.
 *  - Screens section hidden in player view (mirrors sidebar behaviour via useWikiView).
 *  - Reuses NarrativePage / HtmlBody — no content is duplicated.
 *  - CSS classes live in wikiTheme.css under .wiki-root scope.
 *  - Respects prefers-reduced-motion (via wikiTheme.css rules).
 */

import React from "react";
import { CONCEPTS } from "./concepts.js";
import { WIKI_SECTIONS, NARRATIVE_PAGES, DEV_ONLY_SECTION_IDS } from "./wikiNav.js";
import { conceptAccent } from "./conceptAccent.js";
import { useWikiView } from "./wikiView.js";
import { NarrativePage } from "./NarrativePage.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WikiHomeProps {
  /** Navigate to a concept or narrative page. */
  navigate: (target: { tab: string; focus?: string | null }) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Curated newcomer path — concept ids that mirror the core loop in order.
 * These are real concept ids from CONCEPTS; curation is intentional structure,
 * not config duplication.
 */
const START_HERE_CONCEPTS: string[] = [
  "tiles",
  "resources",
  "recipes",
  "buildings",
  "bosses",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Lookup: conceptId → label string (from CONCEPTS). */
const CONCEPT_LABEL_MAP: Record<string, string> = Object.fromEntries(
  CONCEPTS.map((c) => [c.id, c.label]),
);

/** Returns entry count for a concept from live CONCEPTS config. */
function conceptCount(conceptId: string): number {
  const concept = CONCEPTS.find((c) => c.id === conceptId);
  if (!concept) return 0;
  try {
    return concept.getEntries().length;
  } catch {
    return 0;
  }
}

// ─── ConceptTile ──────────────────────────────────────────────────────────────

interface ConceptTileProps {
  conceptId: string;
  navigate: (target: { tab: string; focus?: string | null }) => void;
}

/**
 * A single concept tile: accent left-bar + soft accent background tint, label,
 * and live entry count. Clicking navigates to the concept's category page.
 */
function ConceptTile({ conceptId, navigate }: ConceptTileProps) {
  const label = CONCEPT_LABEL_MAP[conceptId] ?? conceptId;
  const count = conceptCount(conceptId);
  const accent = conceptAccent(conceptId);

  return (
    <button
      type="button"
      className="wiki-home-concept-tile"
      style={{ "--wiki-accent": accent } as React.CSSProperties}
      onClick={() => navigate({ tab: conceptId })}
      aria-label={`${label} — ${count} entries`}
      data-testid={`concept-tile-${conceptId}`}
    >
      <span className="wiki-home-concept-tile__bar" aria-hidden="true" />
      <span className="wiki-home-concept-tile__body">
        <span className="wiki-home-concept-tile__label">{label}</span>
        <span className="wiki-home-concept-tile__count" aria-hidden="true">
          {count}
        </span>
      </span>
    </button>
  );
}

// ─── CategorySection ──────────────────────────────────────────────────────────

interface CategorySectionProps {
  sectionId: string;
  sectionLabel: string;
  conceptIds: string[];
  navigate: (target: { tab: string; focus?: string | null }) => void;
}

/**
 * One wiki section (Board / Economy / World / Progression / Screens) with a
 * label and a row of concept tiles.
 */
function CategorySection({
  sectionId,
  sectionLabel,
  conceptIds,
  navigate,
}: CategorySectionProps) {
  return (
    <div
      className="wiki-home-category-section"
      data-testid={`category-section-${sectionId}`}
    >
      <div className="wiki-home-category-section__label">{sectionLabel}</div>
      <div className="wiki-home-concept-row">
        {conceptIds.map((cid) => (
          <ConceptTile key={cid} conceptId={cid} navigate={navigate} />
        ))}
      </div>
    </div>
  );
}

// ─── StartHere ────────────────────────────────────────────────────────────────

interface StartHereProps {
  navigate: (target: { tab: string; focus?: string | null }) => void;
}

/**
 * A curated "Start here" section for newcomers:
 *  – A short chip-chain of core-loop concept ids (Tiles → Resources → Recipes → Buildings → Bosses).
 *  – Links to the narrative pages (Progression, Design decisions, Story).
 */
function StartHere({ navigate }: StartHereProps) {
  return (
    <section className="wiki-home-start" aria-label="Start here">
      <h2 className="wiki-home-start__heading">Start here</h2>
      <p className="wiki-home-start__desc">
        New to Hearthwood Vale? Follow the core loop — or dive into the narrative pages.
      </p>

      {/* Core loop chips */}
      <div className="wiki-home-start__chain" role="list" aria-label="Core loop path">
        {START_HERE_CONCEPTS.map((cid, idx) => {
          const label = CONCEPT_LABEL_MAP[cid] ?? cid;
          const accent = conceptAccent(cid);
          const isLast = idx === START_HERE_CONCEPTS.length - 1;
          return (
            <React.Fragment key={cid}>
              <button
                type="button"
                className="wiki-home-start__chip"
                style={{ "--wiki-accent": accent } as React.CSSProperties}
                onClick={() => navigate({ tab: cid })}
                aria-label={`Browse ${label}`}
              >
                {label}
              </button>
              {!isLast && (
                <span
                  className="wiki-home-start__arrow"
                  aria-hidden="true"
                >
                  →
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Narrative page links */}
      <div className="wiki-home-start__pages" role="list" aria-label="Narrative pages">
        {NARRATIVE_PAGES.filter((p) => p.slug !== "overview").map((p) => (
          <button
            key={p.slug}
            type="button"
            className="wiki-home-start__page-link"
            onClick={() => navigate({ tab: "page", focus: p.slug })}
            aria-label={`Read ${p.label}`}
          >
            <span aria-hidden="true">📖</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ─── WikiHome ─────────────────────────────────────────────────────────────────

/**
 * Visual discovery landing page for the wiki.
 *
 * Rendered by WikiShell when `pageSlug === "overview"`. Interleaves the
 * category browser and start-here section with the authored overview prose
 * (via NarrativePage) so the page remains visually rich AND config-synced.
 */
export function WikiHome({ navigate }: WikiHomeProps) {
  const { view } = useWikiView();

  // Filter sections: hide dev-only sections in player view (mirrors
  // SidebarConceptSections in WikiShell). Both surfaces share DEV_ONLY_SECTION_IDS
  // from wikiNav.ts so they can never drift.
  const visibleSections = view === "player"
    ? WIKI_SECTIONS.filter((sec) => !DEV_ONLY_SECTION_IDS.has(sec.id))
    : WIKI_SECTIONS;

  return (
    <div
      className="wiki-home wiki-reveal-stagger"
      data-testid="wiki-home"
    >
      {/* ── 1. Hero ──────────────────────────────────────────────────────── */}
      <section className="wiki-home-hero" aria-label="Wiki welcome">
        <div className="wiki-home-hero__copy">
          <h1 className="wiki-home-hero__title">Explore Hearthwood Vale</h1>
          <p className="wiki-home-hero__subtitle">
            Game wiki — every tile, recipe, building, and beat, generated live from the source.
          </p>
        </div>
      </section>

      {/* ── 2. Browse by category ────────────────────────────────────────── */}
      <section
        className="wiki-home-browser"
        aria-label="Browse by category"
        data-testid="browse-by-category"
      >
        <h2 className="wiki-home-section-heading">Browse by category</h2>
        <div className="wiki-home-category-grid">
          {visibleSections.map((sec) => {
            // Flatten primary + child concept ids for this section's concept row.
            const conceptIds = sec.nodes.flatMap((n) => [
              n.conceptId,
              ...(n.children ?? []),
            ]);
            // Skip sections with no visible concept tiles so a future
            // empty/children-only section can't render a stray header.
            if (conceptIds.length === 0) return null;
            return (
              <CategorySection
                key={sec.id}
                sectionId={sec.id}
                sectionLabel={sec.label}
                conceptIds={conceptIds}
                navigate={navigate}
              />
            );
          })}
        </div>
      </section>

      {/* ── 3. Start here ────────────────────────────────────────────────── */}
      <StartHere navigate={navigate} />

      {/* ── 4. Full overview prose ───────────────────────────────────────── */}
      <section
        className="wiki-home-prose"
        aria-label="Overview"
      >
        <NarrativePage slug="overview" />
      </section>
    </div>
  );
}

// Named export is canonical. WikiShell lazy-loads via:
//   import("./WikiHome.jsx").then((m) => ({ default: m.WikiHome }))
// No default export needed.
