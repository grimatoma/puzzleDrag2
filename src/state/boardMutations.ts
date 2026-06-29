// Pure board-mutation helpers used by tool-power runtime handlers.
//
// Each function takes a board (state.grid) plus parameters and returns either
// a new grid OR a list of changed coordinates. They never mutate state — the
// caller is responsible for stitching the result back into the reducer state.
//
// Conventions:
//   - `board` is `state.grid`: a 2D array of cell objects `{ key, ... }`.
//   - Coordinates are `(row, col)` with row 0 at the top.
//   - Helpers preserve other cell fields (rubble, gas, frozen, hidden, etc.).
//   - Hazard-locked cells (rubble / gas / frozen / rats) are skipped by
//     collection sweeps so a tool can't drain a hazard-locked cell out from
//     under its hazard — mirrors the existing `applyToolPending` rule.

import type { Grid, Tile } from "../types/state.js";

/**
 * A board cell as seen by mutation helpers. The runtime occasionally writes
 * `key: null` while a sweep tags `_emptied: true`; the canonical `Tile.key`
 * is `string`, so we widen here for the duration of the mutation pipeline
 * and the caller is responsible for re-narrowing (the GameScene collapse
 * step replaces emptied cells with fresh tiles before any reader sees them).
 */
export interface MutableCell {
  key?: string | null;
  rubble?: boolean;
  gas?: boolean;
  frozen?: boolean;
  hidden?: boolean;
  selected?: boolean;
  _emptied?: boolean;
  [extra: string]: unknown;
}

export type MutableGrid = MutableCell[][];

/** Coordinate descriptor passed in by callers for targeted sweeps/transforms. */
export interface CellCoord {
  row: number;
  col: number;
  key?: string;
}

/**
 * A board cell as accepted by mutation helpers. The canonical `Tile` (key:
 * string) is a subtype of `MutableCell` (key?: string | null), so callers
 * can pass either shape without coercion.
 */
type AnyCell = Tile | MutableCell;
type AnyGrid = AnyCell[][];

const HAZARD_LOCKED = (cell: MutableCell | Tile | null | undefined): boolean =>
  !!(cell && ((cell as MutableCell).rubble || (cell as MutableCell).gas || (cell as MutableCell).frozen || cell.key === "rat"));

/**
 * Clear every cell within `radius` (Chebyshev distance) of `(row, col)`,
 * regardless of key. Hazard-locked cells are skipped to keep parity with
 * the other sweep helpers. Returns `{ grid, collected }`.
 */
export function applyAreaBlast<G extends AnyGrid | Grid>(board: G | null | undefined, row: number, col: number, radius: number): { grid: G; collected: Record<string, number> } {
  if (!board) return { grid: (board as unknown as G), collected: {} };
  const src = board as MutableGrid;
  const r0 = Math.max(0, row - radius);
  const r1 = Math.min(src.length - 1, row + radius);
  const collected: Record<string, number> = {};
  const grid = src.map((rowArr, ri) => {
    if (ri < r0 || ri > r1) return rowArr;
    const c0 = Math.max(0, col - radius);
    const c1 = Math.min(rowArr.length - 1, col + radius);
    return rowArr.map((cell, ci) => {
      if (ci < c0 || ci > c1) return cell;
      if (!cell || HAZARD_LOCKED(cell)) return cell;
      if (cell.key == null) return cell;
      collected[cell.key] = (collected[cell.key] ?? 0) + 1;
      return { ...cell, key: null, _emptied: true };
    });
  }) as unknown as G;
  return { grid, collected };
}

/**
 * Clear only the listed coordinates. Returns `{ grid, collected }`.
 */
export function sweepAtCoords<G extends AnyGrid | Grid>(board: G | null | undefined, cells: CellCoord[]): { grid: G; collected: Record<string, number> } {
  if (!board || !cells?.length) return { grid: (board as unknown as G), collected: {} };
  const coordSet = new Set(cells.map((c) => `${c.row},${c.col}`));
  const collected: Record<string, number> = {};
  const grid = (board as MutableGrid).map((row, ri) =>
    row.map((cell, ci) => {
      if (!coordSet.has(`${ri},${ci}`)) return cell;
      if (!cell || HAZARD_LOCKED(cell) || cell.key == null) return cell;
      collected[cell.key] = (collected[cell.key] ?? 0) + 1;
      return { ...cell, key: null, _emptied: true };
    }),
  ) as unknown as G;
  return { grid, collected };
}

/**
 * Replace every cell whose key is in `fromKeys` with `toKey`. Returns
 * `{ grid, transformed }` where `transformed` is the number of cells changed.
 * Hazard-locked cells are skipped — a transform shouldn't quietly undo a
 * hazard's lock.
 */
export function applyTransformAll<G extends AnyGrid | Grid>(board: G | null | undefined, fromKeys: Set<string> | string[], toKey: string): { grid: G; transformed: number } {
  if (!board || !toKey) return { grid: (board as unknown as G), transformed: 0 };
  const keySet = fromKeys instanceof Set ? fromKeys : new Set(fromKeys);
  if (keySet.size === 0) return { grid: board, transformed: 0 };
  let transformed = 0;
  const grid = (board as MutableGrid).map((row) =>
    row.map((cell) => {
      if (!cell || HAZARD_LOCKED(cell)) return cell;
      if (cell.key == null || !keySet.has(cell.key)) return cell;
      transformed += 1;
      return { ...cell, key: toKey };
    }),
  ) as unknown as G;
  return { grid, transformed };
}

/**
 * Replace every cell within `radius` (Chebyshev) of `(row, col)` whose key
 * is in `fromKeys` with `toKey`. Returns `{ grid, transformed }`. Cells
 * outside the radius or with a non-matching key are passed through.
 */
export function applyTransformAdjacent<G extends AnyGrid | Grid>(board: G | null | undefined, row: number, col: number, radius: number, fromKeys: Set<string> | string[], toKey: string): { grid: G; transformed: number } {
  if (!board || !toKey) return { grid: (board as unknown as G), transformed: 0 };
  const keySet = fromKeys instanceof Set ? fromKeys : new Set(fromKeys);
  if (keySet.size === 0) return { grid: board, transformed: 0 };
  const src = board as MutableGrid;
  const r0 = Math.max(0, row - radius);
  const r1 = Math.min(src.length - 1, row + radius);
  let transformed = 0;
  const grid = src.map((rowArr, ri) => {
    if (ri < r0 || ri > r1) return rowArr;
    const c0 = Math.max(0, col - radius);
    const c1 = Math.min(rowArr.length - 1, col + radius);
    return rowArr.map((cell, ci) => {
      if (ci < c0 || ci > c1) return cell;
      if (!cell || HAZARD_LOCKED(cell)) return cell;
      if (cell.key == null || !keySet.has(cell.key)) return cell;
      transformed += 1;
      return { ...cell, key: toKey };
    });
  }) as unknown as G;
  return { grid, transformed };
}

/**
 * Flip the `hidden` flag to false on every cell whose key matches one of
 * `tileKeys` AND is currently `hidden: true`. Cells without a `hidden`
 * field are passed through unchanged (no-op until hidden-tile spawn ships).
 */
export function applyRevealTiles<G extends AnyGrid | Grid>(board: G | null | undefined, tileKeys: Set<string> | string[]): { grid: G; revealed: number } {
  if (!board) return { grid: (board as unknown as G), revealed: 0 };
  const keySet = tileKeys instanceof Set ? tileKeys : new Set(tileKeys);
  if (keySet.size === 0) return { grid: board, revealed: 0 };
  let revealed = 0;
  let anyChange = false;
  const grid = (board as MutableGrid).map((row) =>
    row.map((cell) => {
      if (!cell) return cell;
      if (cell.key == null || !keySet.has(cell.key)) return cell;
      if (cell.hidden !== true) return cell;
      revealed += 1;
      anyChange = true;
      return { ...cell, hidden: false };
    }),
  ) as unknown as G;
  return { grid: (anyChange ? grid : board) as G, revealed };
}
