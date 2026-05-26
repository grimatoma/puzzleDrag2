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

import { useState, useMemo } from "react";
import { CONCEPTS } from "../wiki/concepts.js";
import EntryGrid from "../wiki/EntryGrid.jsx";
import { COLORS, SegmentedFilter } from "../shared.jsx";

const CONCEPT_OPTIONS = CONCEPTS.map((c) => ({ value: c.id, label: c.label }));

export default function WikiTab() {
  const [conceptId, setConceptId] = useState(CONCEPTS[0].id);

  const concept = useMemo(
    () => CONCEPTS.find((c) => c.id === conceptId) ?? CONCEPTS[0],
    [conceptId],
  );

  const entries = useMemo(() => concept.getEntries(), [concept]);

  return (
    <div className="flex flex-col gap-3">
      <SegmentedFilter
        options={CONCEPT_OPTIONS}
        value={concept.id}
        onChange={setConceptId}
        ariaLabel="Wiki concept"
      />

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

      <EntryGrid entries={entries as unknown as import("../wiki/EntryGrid.jsx").WikiEntry[]} />
    </div>
  );
}
