// costExport.ts — turn staged cost edits into an LLM-ready change request.
//
// The Dev Panel never writes the catalogs (the game always reads the real
// constants). Instead, the "Cost matrix" view stages edits locally and this
// module renders them as:
//
//   - a human-readable Markdown brief, grouped by matrix, listing "from → to",
//   - a machine-readable JSON patch (dotted path → new value),
//
// so the designer can paste the whole thing into a fresh LLM session and have
// it apply the changes to src/constants.ts. PURE — derives everything from the
// built matrices, which already carry the `changed` flag per cell.

import { buildAllCostMatrices } from "./costMatrix.js";
import type { CostMatrix, CostOverrides } from "./costMatrix.js";

export interface CostChange {
  matrixId: string;
  matrixLabel: string;
  entityId: string;
  entityName: string;
  colKey: string;
  colLabel: string;
  from: number;
  to: number;
  path: string;
}

export interface CostReport {
  matrices: CostMatrix[];
  changes: CostChange[];
  count: number;
  markdown: string;
  json: string;
}

/** Walk built matrices and collect every changed cell as a flat change. */
export function collectChanges(matrices: CostMatrix[]): CostChange[] {
  const out: CostChange[] = [];
  for (const matrix of matrices) {
    for (const row of matrix.rows) {
      for (const col of matrix.columns) {
        const cell = row.cells[col.key];
        if (!cell || !cell.changed) continue;
        out.push({
          matrixId: matrix.id,
          matrixLabel: matrix.exportLabel,
          entityId: row.id,
          entityName: row.name,
          colKey: col.key,
          colLabel: col.label,
          from: cell.original,
          to: cell.value,
          path: cell.editPath,
        });
      }
    }
  }
  return out;
}

/** JSON patch: { "<dotted path>": <new value> }, stable-ordered, 2-space. */
export function renderJsonPatch(changes: CostChange[]): string {
  const patch: Record<string, number> = {};
  for (const c of changes) patch[c.path] = c.to;
  return JSON.stringify(patch, null, 2);
}

/** Markdown brief grouped by matrix, ready to paste into a new LLM session. */
export function renderMarkdown(changes: CostChange[]): string {
  if (changes.length === 0) {
    return "# puzzleDrag2 — balance change request\n\nNo pending changes. Edit a cell in the Cost matrix to stage one.";
  }

  const lines: string[] = [];
  lines.push("# puzzleDrag2 — balance change request");
  lines.push("");
  lines.push(
    "Apply the edits below to `src/constants.ts`. Change ONLY the listed fields to their new " +
      "values; leave every other value exactly as-is and do not reformat the file. Each value is " +
      "an integer item/currency count (a value of `0` means remove that cost entirely).",
  );
  lines.push("");

  // Preserve matrix order (buildings → tools → resources) as they appear.
  const order: string[] = [];
  const byMatrix = new Map<string, { label: string; items: CostChange[] }>();
  for (const c of changes) {
    if (!byMatrix.has(c.matrixId)) {
      byMatrix.set(c.matrixId, { label: c.matrixLabel, items: [] });
      order.push(c.matrixId);
    }
    byMatrix.get(c.matrixId)!.items.push(c);
  }

  for (const id of order) {
    const group = byMatrix.get(id)!;
    lines.push(`## ${group.label}`);
    for (const c of group.items) {
      lines.push(`- **${c.entityName}** · ${c.colLabel} (\`${c.path}\`): ${c.from} → ${c.to}`);
    }
    lines.push("");
  }

  lines.push("### Machine-readable patch");
  lines.push("```json");
  lines.push(renderJsonPatch(changes));
  lines.push("```");

  return lines.join("\n");
}

/** Build the full report for a set of staged overrides. */
export function buildCostReport(overrides: CostOverrides = {}): CostReport {
  const matrices = buildAllCostMatrices(overrides);
  const changes = collectChanges(matrices);
  return {
    matrices,
    changes,
    count: changes.length,
    markdown: renderMarkdown(changes),
    json: renderJsonPatch(changes),
  };
}
