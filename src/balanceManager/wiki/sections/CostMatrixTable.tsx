/**
 * CostMatrixTable.tsx — the generic editable/read-only cost grid.
 *
 * Renders any CostMatrix (buildings / tools / resources) as one wide table:
 * a sticky row-name column, read-only context columns (level/biome or
 * station/tier), then one editable numeric column per cost resource. Edited
 * cells are highlighted and carry a "was N" tooltip.
 *
 * In Developer view (`editable`) cost cells become number inputs that stage
 * edits into the cost-edit store; clearing a cell or typing the baseline value
 * reverts it. In Player view the same grid renders as static numbers.
 *
 * React Compiler is on — no manual useMemo/useCallback.
 */

import React from "react";
import Icon from "../../../ui/Icon.jsx";
import { COLORS } from "../../shared.jsx";
import { useCostEdits } from "../costEditsStore.js";
import type { CostMatrix, CostMatrixCell } from "../costMatrix.js";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

// ─── Cell ──────────────────────────────────────────────────────────────────────

interface CellProps {
  cell: CostMatrixCell;
  editable: boolean;
  setEdit: (path: string, value: number) => void;
  clearEdit: (path: string) => void;
}

function Cell({ cell, editable, setEdit, clearEdit }: CellProps) {
  // Read-only (Player view) or an inert input cell on an un-craftable row.
  if (!editable || !cell.editable) {
    const empty = cell.value === 0;
    return (
      <span
        className={`wiki-cost-static${cell.changed ? " wiki-cost-static--changed" : ""}`}
        title={cell.changed ? `was ${cell.original}` : undefined}
      >
        {empty ? <span className="wiki-cost-blank" aria-hidden>·</span> : fmt(cell.value)}
      </span>
    );
  }

  // Editable: show empty for an untouched zero so the grid isn't a wall of 0s.
  const display = cell.value === 0 && !cell.changed ? "" : String(cell.value);
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      step={1}
      aria-label={cell.editPath}
      className={`wiki-cost-input${cell.changed ? " wiki-cost-input--changed" : ""}`}
      value={display}
      placeholder="·"
      title={cell.changed ? `was ${cell.original}` : undefined}
      onChange={(e) => {
        const raw = e.target.value.trim();
        if (raw === "") {
          clearEdit(cell.editPath);
          return;
        }
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return;
        const v = Math.round(n);
        if (v === cell.original) clearEdit(cell.editPath);
        else setEdit(cell.editPath, v);
      }}
    />
  );
}

// ─── Table ─────────────────────────────────────────────────────────────────────

export interface CostMatrixTableProps {
  matrix: CostMatrix;
  editable: boolean;
}

export function CostMatrixTable({ matrix, editable }: CostMatrixTableProps) {
  const { setEdit, clearEdit } = useCostEdits();
  const totalCols = 1 + matrix.contextColumns.length + matrix.columns.length;

  if (matrix.rows.length === 0) {
    return (
      <p className="text-[12px] italic m-0" style={{ color: COLORS.inkSubtle }}>
        No {matrix.id} with costs found.
      </p>
    );
  }

  // Annotate rows with whether they open a new grouping band (resources only).
  // Pure: compare each row's group to the previous row's by index.
  const annotated = matrix.rows.map((row, i) => {
    const prevGroup = i > 0 ? matrix.rows[i - 1].group : undefined;
    return { row, showBand: !!row.group && row.group !== prevGroup };
  });

  return (
    <div className="wiki-table-scroll wiki-cost-scroll">
      <table className="wiki-cost-table">
        <thead>
          <tr>
            <th className="wiki-cost-th wiki-cost-th--row">Name</th>
            {matrix.contextColumns.map((c) => (
              <th key={c.key} className="wiki-cost-th wiki-cost-th--ctx">
                {c.label}
              </th>
            ))}
            {matrix.columns.map((col) => (
              <th
                key={col.key}
                className={`wiki-cost-th wiki-cost-th--num${col.currency ? " wiki-cost-th--currency" : ""}`}
                title={col.label}
              >
                <span className="wiki-cost-th__inner">
                  <Icon iconKey={col.iconKey} size={15} title="" />
                  <span className="wiki-cost-th__label">{col.label}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {annotated.map(({ row, showBand }) => (
            <React.Fragment key={row.id}>
              {showBand && (
                <tr className="wiki-cost-band">
                  <td colSpan={totalCols}>{row.group}</td>
                </tr>
              )}
              <tr>
                <th scope="row" className="wiki-cost-rowhead">
                  {row.iconKey && <Icon iconKey={row.iconKey} size={16} title="" />}
                  <span className="wiki-cost-rowhead__name">{row.name}</span>
                </th>
                {row.context.map((c) => (
                  <td key={c.key} className="wiki-cost-ctx">
                    {c.value}
                  </td>
                ))}
                {matrix.columns.map((col) => {
                  const cell = row.cells[col.key];
                  return (
                    <td
                      key={col.key}
                      className={`wiki-cost-cell${cell?.changed ? " wiki-cost-cell--changed" : ""}`}
                    >
                      {cell && (
                        <Cell cell={cell} editable={editable} setEdit={setEdit} clearEdit={clearEdit} />
                      )}
                    </td>
                  );
                })}
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CostMatrixTable;
