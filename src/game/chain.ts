import { TILE } from "../constants.js";

const TILE_BASE = TILE;

/** A minimal shape that chain.ts needs from a board cell. */
interface ChainCell {
  res: { key: string };
}

export function computeBakeScale(dpr: number, tileSize: number): number {
  return Math.max(dpr || 1, (tileSize || TILE_BASE) / TILE_BASE);
}

export function hasValidChain(grid: (ChainCell | null | undefined)[][]): boolean {
  const rows = grid.length;
  const cols = rows ? grid[0].length : 0;
  const visited = Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false));
  const DIRS: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  function dfs(r: number, c: number, key: string): number {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return 0;
    if (visited[r][c]) return 0;
    if (!grid[r][c] || grid[r][c]!.res.key !== key) return 0;
    visited[r][c] = true;
    let count = 1;
    for (const [dr, dc] of DIRS) count += dfs(r + dr, c + dc, key);
    return count;
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!grid[r][c] || visited[r][c]) continue;
      if (dfs(r, c, grid[r][c]!.res.key) >= 3) return true;
    }
  }
  return false;
}

/** A board position. */
export interface CellPos {
  col: number;
  row: number;
}

/**
 * 8-directional adjacency (orthogonal + diagonal), excluding the cell itself.
 * Mirrors the drag-chain adjacency check used by `tryAddToPath`.
 */
export function isAdjacent(a: CellPos, b: CellPos): boolean {
  return (
    Math.abs(a.col - b.col) <= 1 &&
    Math.abs(a.row - b.row) <= 1 &&
    !(a.col === b.col && a.row === b.row)
  );
}

/**
 * Effective minimum chain length given the active boss's `minChain` (0 when no
 * boss). The board floor is 3.
 */
export function effectiveMinChain(bossMinChain: number): number {
  return Math.max(3, bossMinChain);
}

/** A tile the player is trying to add to the active chain. */
export interface ExtendCandidate extends CellPos {
  key: string;
  selected: boolean;
}

/**
 * Decide what a drag does when the player's pointer reaches `tile`, given the
 * current path. Pure — the scene supplies the path's tile keys and cell
 * positions and applies the result (pop / push / nothing).
 *
 * - `"backtrack"` — `tile` is the path's previous cell ⇒ pop the head.
 * - `"extend"`    — `tile` is unselected, same key as the chain head, and
 *                   adjacent to the current head ⇒ push it.
 * - `"reject"`    — anything else (empty path, already-selected, wrong key, or
 *                   non-adjacent).
 *
 * Cell identity uses (col,row): during a single drag, tiles don't move, so a
 * board cell is uniquely the same tile the scene compares by reference.
 */
export function canExtendChain(
  pathKeys: ReadonlyArray<string>,
  pathCells: ReadonlyArray<CellPos>,
  tile: ExtendCandidate,
): "extend" | "backtrack" | "reject" {
  if (pathCells.length === 0) return "reject";
  const last = pathCells[pathCells.length - 1];
  const prev = pathCells.length >= 2 ? pathCells[pathCells.length - 2] : null;
  if (prev && prev.col === tile.col && prev.row === tile.row) return "backtrack";
  if (tile.selected) return "reject";
  const same = tile.key === pathKeys[0];
  return same && isAdjacent(tile, last) ? "extend" : "reject";
}

/** Source cell for the selector-grid projection. */
interface SelectorSourceCell {
  res: { key: string };
  selected?: boolean;
}

/** A projected selector-grid cell: `{key, selected}` for live tiles, `{key:null}` for gaps. */
export type SelectorGridCell = { key: string; selected: boolean } | { key: null };

/**
 * Project a live board grid into the reducer-shaped `{key, selected}` grid the
 * tile selectors consume. Pure projection — `null`/empty cells become
 * `{key:null}`.
 */
export function toSelectorGrid(
  grid: ReadonlyArray<ReadonlyArray<SelectorSourceCell | null | undefined>>,
): SelectorGridCell[][] {
  return grid.map((row) =>
    row.map((t) => (t ? { key: t.res.key, selected: !!t.selected } : { key: null })),
  );
}
