// Turn flagged family-value outliers into a cost-matrix-compatible change-list.
//
// Output is byte-compatible with the Dev Panel "Cost matrix" export: it reuses
// `renderMarkdown`/`renderJsonPatch` from src/balanceManager/wiki/costExport.ts,
// so the emitted document is titled "# puzzleDrag2 — balance change request" and
// its JSON patch keys are the SAME dotted constants paths
// (`ITEMS.<key>.value`) the cost-matrix view produces. A human/LLM can paste it
// into a fresh session, or it round-trips through the existing workflow.

import { renderMarkdown, renderJsonPatch, type CostChange } from "../balanceManager/wiki/costExport.js";
import type { FamilyValueSpread } from "./metrics.js";

const RESOURCES_MATRIX_ID = "resources";
const RESOURCES_MATRIX_LABEL = "Resources — ITEMS[*].value & RECIPES[*].inputs";

export interface ChangeListResult {
  changes: CostChange[];
  count: number;
  markdown: string;
  json: string;
}

/**
 * Propose value cuts that compress every HIGH outlier resource down to
 * `outlierFactor × median` realized value-per-tile. Low-value staples (hay,
 * plank, block) are intentional commodity floors and are left untouched. The
 * new `ITEMS.<key>.value` is `round(targetRealized × tilesPerResource)`, so the
 * resource's realized-per-tile lands on the ceiling.
 */
export function buildSpreadChangeList(spread: FamilyValueSpread): ChangeListResult {
  const targetRealized = spread.outlierFactor * spread.median;
  const changes: CostChange[] = [];
  for (const e of spread.entries) {
    if (e.flag !== "high") continue;
    const newValue = Math.max(1, Math.round(targetRealized * e.tilesPerResource));
    if (newValue === e.resourceValue) continue;
    changes.push({
      matrixId: RESOURCES_MATRIX_ID,
      matrixLabel: RESOURCES_MATRIX_LABEL,
      entityId: e.resourceKey,
      entityName: e.resourceLabel,
      colKey: "value",
      colLabel: "Value",
      from: e.resourceValue,
      to: newValue,
      path: `ITEMS.${e.resourceKey}.value`,
    });
  }
  // Stable, path-sorted order so the emitted patch is deterministic.
  changes.sort((a, b) => a.path.localeCompare(b.path));
  return {
    changes,
    count: changes.length,
    markdown: renderMarkdown(changes),
    json: renderJsonPatch(changes),
  };
}
