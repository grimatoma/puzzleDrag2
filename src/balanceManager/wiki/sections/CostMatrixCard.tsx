/**
 * CostMatrixCard.tsx — a titled wrapper around one CostMatrixTable.
 *
 * `CostMatrixCard` is presentational (heading + subtitle + table) and takes a
 * prebuilt matrix — used by the unified Cost-matrix page, which builds all
 * three matrices once for the export report.
 *
 * `LiveCostMatrix` builds a single matrix from the live edit store — used by
 * the per-concept category pages (Buildings / Tools / Resources) so each page
 * shows just its own grid.
 */

import React from "react";
import { COLORS } from "../../shared.jsx";
import { useCostEdits } from "../costEditsStore.js";
import { useCostColumns } from "../costColumnsStore.js";
import { buildCostMatrix } from "../costMatrix.js";
import type { CostMatrix, CostMatrixId } from "../costMatrix.js";
import { CostMatrixTable } from "./CostMatrixTable.jsx";

export interface CostMatrixCardProps {
  matrix: CostMatrix;
  editable: boolean;
  id?: string;
}

export function CostMatrixCard({ matrix, editable, id }: CostMatrixCardProps) {
  return (
    <section id={id} className="wiki-cost-card flex flex-col gap-2">
      <div>
        <h2 className="wiki-section-heading mb-1">{matrix.title}</h2>
        <p className="text-[11px] italic m-0" style={{ color: COLORS.inkSubtle }}>
          {matrix.subtitle}
        </p>
      </div>
      <CostMatrixTable matrix={matrix} editable={editable} />
    </section>
  );
}

export interface LiveCostMatrixProps {
  matrixId: CostMatrixId;
  editable: boolean;
  id?: string;
}

/** Self-building card bound to the live edit + columns stores (category pages). */
export function LiveCostMatrix({ matrixId, editable, id }: LiveCostMatrixProps) {
  const { edits } = useCostEdits();
  const { columns } = useCostColumns();
  const matrix = buildCostMatrix(matrixId, edits, columns[matrixId] ?? []);
  return <CostMatrixCard matrix={matrix} editable={editable} id={id} />;
}

export default CostMatrixCard;
