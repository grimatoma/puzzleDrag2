// Concepts Wiki — read-only reference for every distinct game concept.
//
// One sub-tab per concept (tiles, resources, tools, workers, hazards,
// recipes, zones, abilities, …). Each entry is pulled live from its
// canonical source-of-truth map by `wiki/concepts.js`, so adding a new
// tile, hazard, or worker elsewhere in the codebase appears here
// automatically with no edits.
//
// Used as a designer scanning grid and as an alignment artifact for the
// upcoming type-discipline refactor. The tab does not mutate any draft.
//
// Navigation: the selected entity is URL-addressable via the Dev Panel's
// hash router: `#/wiki/<conceptId>:<entityKey>`. The prefixed format is
// unambiguous — bare-key formats (from older links) are supported via the
// `conceptForKey` fallback. `useBalanceNav()` provides the routed `focus`
// and a `navigate` callback. Switching the concept filter clears the focus
// so the grid returns to the selected concept; back/forward buttons navigate
// the entity selection history.
//
// Detail panel: renders WikiArticle (the rich Wikipedia-style template built
// in Phase 4) in place of the older EntityDetail. The grid/landing branch is
// intentionally unchanged — CategoryPage will be wired in Phase 5's WikiShell.

import { useState, useMemo, lazy, Suspense } from "react";
import { CONCEPTS } from "../wiki/concepts.js";
import EntryGrid from "../wiki/EntryGrid.jsx";
import { COLORS, SegmentedFilter } from "../shared.jsx";
import { useBalanceNav } from "../balanceNav.jsx";
import { parseWikiFocus } from "../wiki/conceptEntities.js";

// Lazy-load WikiArticle so the heavy schema-introspection deps it pulls in
// (schemaDoc → Zod schemas, conceptSchemas, conceptEntities, and the constants
// they reach) are only fetched once the designer clicks a card. Keeping this
// off the WikiTab chunk lets EntryGrid paint immediately on tab open — a static
// import here made the chunk heavy enough to race the visual-golden capture and
// catch the Suspense fallback instead of the populated grid.
const WikiArticle = lazy(() => import("../wiki/WikiArticle.jsx"));

const CONCEPT_OPTIONS = CONCEPTS.map((c) => ({ value: c.id, label: c.label }));

export default function WikiTab() {
  const { focus, navigate } = useBalanceNav();

  // Local concept filter state — drives the segmented filter and the grid when
  // there is no active focus.
  const [manualConceptId, setManualConceptId] = useState(CONCEPTS[0].id);

  // Parse the focus string into { conceptId, entityKey } — memoised so the
  // parse only runs when `focus` changes, not on every render.
  const parsedFocus = useMemo(() => parseWikiFocus(focus), [focus]);

  // The active concept id is: the focused entity's concept (when a detail panel
  // is shown), otherwise the manual filter choice. This keeps the segmented
  // filter highlighting the focused concept and means "← Back" lands on that
  // concept's grid — all purely derived from props and local state, no effects.
  const conceptId = parsedFocus?.conceptId ?? manualConceptId;

  const concept = useMemo(
    () => CONCEPTS.find((c) => c.id === conceptId) ?? CONCEPTS[0],
    [conceptId],
  );

  const entries = useMemo(() => concept.getEntries(), [concept]);

  function handleConceptChange(id: string) {
    setManualConceptId(id);
    // Only push a history entry when there is something to clear.
    if (focus !== null) {
      navigate({ tab: "wiki", focus: null });
    }
  }

  // If focus is set and resolvable, show the detail panel; otherwise the grid.
  const showDetail = parsedFocus !== null;

  return (
    <div className="flex flex-col gap-3">
      <SegmentedFilter
        options={CONCEPT_OPTIONS}
        value={concept.id}
        onChange={handleConceptChange}
        ariaLabel="Wiki concept"
      />

      {!showDetail && (
        <div className="flex items-baseline justify-between gap-3">
          <div
            className="text-[11px] italic"
            style={{ color: COLORS.inkSubtle }}
          >
            {concept.blurb}
          </div>
          <div
            className="text-[11px] font-bold flex-shrink-0"
            style={{ color: COLORS.inkSubtle }}
          >
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </div>
        </div>
      )}

      {showDetail ? (
        <Suspense
          fallback={
            <div
              className="text-[11px] italic py-4"
              style={{ color: COLORS.inkSubtle }}
            >
              Loading…
            </div>
          }
        >
          <WikiArticle
            conceptId={parsedFocus!.conceptId}
            entityKey={parsedFocus!.entityKey}
            onBack={() => navigate({ tab: "wiki", focus: null })}
          />
        </Suspense>
      ) : (
        <EntryGrid
          entries={entries as unknown as import("../wiki/EntryGrid.jsx").WikiEntry[]}
          onSelect={(key) => navigate({ tab: "wiki", focus: `${conceptId}:${key}` })}
        />
      )}
    </div>
  );
}
