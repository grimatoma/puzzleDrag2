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
 * reverts it. The header also grows an "+ Add column" picker so a cost can be
 * staged for ANY resource — even one no entity currently uses — and each
 * user-added column carries a remove (×) button. In Player view the same grid
 * renders as static numbers with no add/remove affordances.
 *
 * Buildings have no baked <Icon>; their row glyph is the inline-SVG
 * <BuildingIllustration> via <EntityVisual>, matching the buildings gallery.
 *
 * React Compiler is on — no manual useMemo/useCallback.
 */

import React from "react";
import Icon from "../../../ui/Icon.jsx";
import { COLORS } from "../../shared.jsx";
import { useCostEdits } from "../costEditsStore.js";
import { useCostColumns } from "../costColumnsStore.js";
import { costColumnOptions } from "../costMatrix.js";
import type { CostMatrix, CostMatrixCell, CostMatrixColumn, CostMatrixRow } from "../costMatrix.js";
import { EntityVisual } from "../EntityVisual.jsx";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

// ─── Row glyph ───────────────────────────────────────────────────────────────

/** Buildings use their inline SVG illustration; everything else a baked icon. */
function RowGlyph({ matrixId, row }: { matrixId: CostMatrix["id"]; row: CostMatrixRow }) {
  if (matrixId === "buildings") {
    return (
      <span className="wiki-cost-rowhead__glyph" aria-hidden>
        <EntityVisual conceptId="buildings" entityKey={row.id} size={24} />
      </span>
    );
  }
  if (row.iconKey) return <Icon iconKey={row.iconKey} size={16} title="" />;
  return null;
}

// ─── Add-column picker ───────────────────────────────────────────────────────

/** A header <select> that stages a new cost column for any resource/currency. */
function AddColumnControl({ matrix }: { matrix: CostMatrix }) {
  const { addColumn } = useCostColumns();
  const groups = costColumnOptions(matrix.columns.map((c) => c.key));
  const exhausted = groups.length === 0;

  return (
    <select
      className="wiki-cost-addcol"
      aria-label={`Add a cost column to ${matrix.title}`}
      value=""
      disabled={exhausted}
      onChange={(e) => {
        const key = e.target.value;
        e.currentTarget.value = "";
        if (key) addColumn(matrix.id, key);
      }}
    >
      <option value="">{exhausted ? "All added" : "+ Add column…"}</option>
      {groups.map((g) => (
        <optgroup key={g.group} label={g.group}>
          {g.options.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
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
  const { removeColumn } = useCostColumns();

  // The add-column affordance only exists in the editor.
  const showAdd = editable;
  const totalCols = 1 + matrix.contextColumns.length + matrix.columns.length + (showAdd ? 1 : 0);

  // Removing a column also clears any edits staged on it (using the real edit
  // paths off the built cells) so a dropped column leaves no orphan changes.
  function handleRemoveColumn(col: CostMatrixColumn) {
    for (const row of matrix.rows) {
      const path = row.cells[col.key]?.editPath;
      if (path) clearEdit(path);
    }
    removeColumn(matrix.id, col.key);
  }

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
                className={`wiki-cost-th wiki-cost-th--num${col.currency ? " wiki-cost-th--currency" : ""}${col.extra ? " wiki-cost-th--extra" : ""}`}
                title={col.label}
              >
                <span className="wiki-cost-th__inner">
                  <Icon iconKey={col.iconKey} size={15} title="" />
                  <span className="wiki-cost-th__label">{col.label}</span>
                  {editable && col.extra && (
                    <button
                      type="button"
                      className="wiki-cost-colremove"
                      aria-label={`Remove ${col.label} column`}
                      title={`Remove ${col.label} column`}
                      onClick={() => handleRemoveColumn(col)}
                    >
                      ✕
                    </button>
                  )}
                </span>
              </th>
            ))}
            {showAdd && (
              <th className="wiki-cost-th wiki-cost-th--add">
                <AddColumnControl matrix={matrix} />
              </th>
            )}
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
                  <RowGlyph matrixId={matrix.id} row={row} />
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
                {showAdd && <td className="wiki-cost-cell wiki-cost-cell--add" aria-hidden />}
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CostMatrixTable;
