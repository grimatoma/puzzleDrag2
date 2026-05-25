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

const HAZARD_LOCKED = (cell: any) =>
  !!(cell && (cell.rubble || cell.gas || cell.frozen || cell.key === "rat"));

/**
 * Sweep all cells whose key matches any of the supplied tile keys. Returns
 * `{ grid, collected }` where `collected` is a map of `tileKey -> count`.
 * Hazard-locked cells are skipped. Cells set to `key: null` and tagged with
 * `_emptied: true` so the Phaser collapse pipeline picks them up next sync.
 *
 * @param {Array<Array<object>>} board
 * @param {Set<string> | string[]} tileKeys
 * @returns {{ grid: Array<Array<object>>, collected: Record<string, number> }}
 */
export function sweepTileKeys(board: any, tileKeys: any): { grid: any; collected: Record<string, number> } {
  if (!board) return { grid: board, collected: {} };
  const keySet = tileKeys instanceof Set ? tileKeys : new Set(tileKeys);
  if (keySet.size === 0) return { grid: board, collected: {} };
  const collected: Record<string, number> = {};
  const grid = board.map((row: any) =>
    row.map((cell: any) => {
      if (!cell || HAZARD_LOCKED(cell)) return cell;
      if (!keySet.has(cell.key)) return cell;
      collected[cell.key] = (collected[cell.key] ?? 0) + 1;
      return { ...cell, key: null, _emptied: true };
    }),
  );
  return { grid, collected };
}

/**
 * Clear every cell within `radius` (Chebyshev distance) of `(row, col)`,
 * regardless of key. Hazard-locked cells are skipped to keep parity with
 * the other sweep helpers. Returns `{ grid, collected }`.
 *
 * @param {Array<Array<object>>} board
 * @param {number} row
 * @param {number} col
 * @param {number} radius
 */
export function applyAreaBlast(board: any, row: any, col: any, radius: any): { grid: any; collected: Record<string, number> } {
  if (!board) return { grid: board, collected: {} };
  const r0 = Math.max(0, row - radius);
  const r1 = Math.min(board.length - 1, row + radius);
  const collected: Record<string, number> = {};
  const grid = board.map((rowArr: any, ri: any) => {
    if (ri < r0 || ri > r1) return rowArr;
    const c0 = Math.max(0, col - radius);
    const c1 = Math.min(rowArr.length - 1, col + radius);
    return rowArr.map((cell: any, ci: any) => {
      if (ci < c0 || ci > c1) return cell;
      if (!cell || HAZARD_LOCKED(cell)) return cell;
      if (cell.key == null) return cell;
      collected[cell.key] = (collected[cell.key] ?? 0) + 1;
      return { ...cell, key: null, _emptied: true };
    });
  });
  return { grid, collected };
}

/**
 * Clear only the listed coordinates. Returns `{ grid, collected }`.
 *
 * @param {Array<Array<object>>} board
 * @param {Array<{ row: number, col: number, key?: string }>} cells
 */
export function sweepAtCoords(board: any, cells: any): { grid: any; collected: Record<string, number> } {
  if (!board || !cells?.length) return { grid: board, collected: {} };
  const coordSet = new Set(cells.map((c: any) => `${c.row},${c.col}`));
  const collected: Record<string, number> = {};
  const grid = board.map((row: any, ri: any) =>
    row.map((cell: any, ci: any) => {
      if (!coordSet.has(`${ri},${ci}`)) return cell;
      if (!cell || HAZARD_LOCKED(cell) || cell.key == null) return cell;
      collected[cell.key] = (collected[cell.key] ?? 0) + 1;
      return { ...cell, key: null, _emptied: true };
    }),
  );
  return { grid, collected };
}

/**
 * Replace cells at listed coordinates with `toKey`.
 *
 * @param {Array<Array<object>>} board
 * @param {Array<{ row: number, col: number }>} cells
 * @param {string} toKey
 */
export function transformAtCoords(board: any, cells: any, toKey: any): { grid: any; transformed: number } {
  if (!board || !cells?.length || !toKey) return { grid: board, transformed: 0 };
  const coordSet = new Set(cells.map((c: any) => `${c.row},${c.col}`));
  let transformed = 0;
  const grid = board.map((row: any, ri: any) =>
    row.map((cell: any, ci: any) => {
      if (!coordSet.has(`${ri},${ci}`)) return cell;
      if (!cell || HAZARD_LOCKED(cell)) return cell;
      transformed += 1;
      return { ...cell, key: toKey };
    }),
  );
  return { grid, transformed };
}

/**
 * Replace every cell whose key is in `fromKeys` with `toKey`. Returns
 * `{ grid, transformed }` where `transformed` is the number of cells changed.
 * Hazard-locked cells are skipped — a transform shouldn't quietly undo a
 * hazard's lock.
 *
 * @param {Array<Array<object>>} board
 * @param {Set<string> | string[]} fromKeys
 * @param {string} toKey
 */
export function applyTransformAll(board: any, fromKeys: any, toKey: any): { grid: any; transformed: number } {
  if (!board || !toKey) return { grid: board, transformed: 0 };
  const keySet = fromKeys instanceof Set ? fromKeys : new Set(fromKeys);
  if (keySet.size === 0) return { grid: board, transformed: 0 };
  let transformed = 0;
  const grid = board.map((row: any) =>
    row.map((cell: any) => {
      if (!cell || HAZARD_LOCKED(cell)) return cell;
      if (!keySet.has(cell.key)) return cell;
      transformed += 1;
      return { ...cell, key: toKey };
    }),
  );
  return { grid, transformed };
}

/**
 * Replace every cell within `radius` (Chebyshev) of `(row, col)` whose key
 * is in `fromKeys` with `toKey`. Returns `{ grid, transformed }`. Cells
 * outside the radius or with a non-matching key are passed through.
 *
 * @param {Array<Array<object>>} board
 * @param {number} row
 * @param {number} col
 * @param {number} radius
 * @param {Set<string> | string[]} fromKeys
 * @param {string} toKey
 */
export function applyTransformAdjacent(board: any, row: any, col: any, radius: any, fromKeys: any, toKey: any): { grid: any; transformed: number } {
  if (!board || !toKey) return { grid: board, transformed: 0 };
  const keySet = fromKeys instanceof Set ? fromKeys : new Set(fromKeys);
  if (keySet.size === 0) return { grid: board, transformed: 0 };
  const r0 = Math.max(0, row - radius);
  const r1 = Math.min(board.length - 1, row + radius);
  let transformed = 0;
  const grid = board.map((rowArr: any, ri: any) => {
    if (ri < r0 || ri > r1) return rowArr;
    const c0 = Math.max(0, col - radius);
    const c1 = Math.min(rowArr.length - 1, col + radius);
    return rowArr.map((cell: any, ci: any) => {
      if (ci < c0 || ci > c1) return cell;
      if (!cell || HAZARD_LOCKED(cell)) return cell;
      if (!keySet.has(cell.key)) return cell;
      transformed += 1;
      return { ...cell, key: toKey };
    });
  });
  return { grid, transformed };
}

/**
 * Flip the `hidden` flag to false on every cell whose key matches one of
 * `tileKeys` AND is currently `hidden: true`. Cells without a `hidden`
 * field are passed through unchanged (no-op until hidden-tile spawn ships).
 *
 * @param {Array<Array<object>>} board
 * @param {Set<string> | string[]} tileKeys
 */
export function applyRevealTiles(board: any, tileKeys: any): { grid: any; revealed: number } {
  if (!board) return { grid: board, revealed: 0 };
  const keySet = tileKeys instanceof Set ? tileKeys : new Set(tileKeys);
  if (keySet.size === 0) return { grid: board, revealed: 0 };
  let revealed = 0;
  let anyChange = false;
  const grid = board.map((row: any) =>
    row.map((cell: any) => {
      if (!cell) return cell;
      if (!keySet.has(cell.key)) return cell;
      if (cell.hidden !== true) return cell;
      revealed += 1;
      anyChange = true;
      return { ...cell, hidden: false };
    }),
  );
  return { grid: anyChange ? grid : board, revealed };
}
