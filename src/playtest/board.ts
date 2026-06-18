// Synthetic match-3 board for the playtest harness.
//
// The harness never boots Phaser, so it builds its own board out of a zone's
// tile pool and finds chains the same way the game judges them: an 8-directional
// connected component of same-key cells with size >= 3 is a valid chain. This is
// EXACTLY the grouping `src/game/chain.ts:hasValidChain` performs (its DFS counts
// the whole 8-connected same-key component and checks `>= 3`), so a component
// here is one-to-one with the game's notion of "a chain you could collect".
//
// Collapse (gravity + top-refill) is a documented APPROXIMATION of the scene's
// real collapse — close enough to keep chains flowing for v1 balance metrics;
// determinism comes entirely from the injected `rng`.

import { getItem } from "../constants.js";
import { pick } from "./prng.js";

/** A board cell carries the same `res` shape the scene's TileObj exposes:
 *  the tile key plus its catalog fields (notably `value` and `label`). */
export interface CellRes {
  key: string;
  value: number;
  label: string;
}
export type Cell = { res: CellRes } | null;
export type Grid = Cell[][];

/** One collectible chain = a same-key 8-connected component of size >= 3. */
export interface Chain {
  key: string;
  cells: { row: number; col: number }[];
  length: number;
  /** The board tile's `value` (NOT the produced resource's value). */
  tileValue: number;
}

/** Build the `res` object for a tile key: catalog def + the key itself. */
export function tileRes(key: string): CellRes {
  const def = getItem(key) as { value?: number; label?: string } | undefined;
  return { key, value: def?.value ?? 1, label: def?.label ?? key };
}

/** Build a rows×cols board by sampling `pool` with `rng`. */
export function makeBoard(
  pool: readonly string[],
  rng: () => number,
  rows = 6,
  cols = 6,
): Grid {
  const grid: Grid = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) row.push({ res: tileRes(pick(pool, rng)) });
    grid.push(row);
  }
  return grid;
}

const DIRS: [number, number][] = [
  [0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/**
 * Enumerate every same-key 8-connected component (its members), regardless of
 * size. Mirrors the DFS shape of `hasValidChain` so the two agree on what counts
 * as one group. Callers filter by `length >= 3` for valid chains.
 */
export function collectComponents(grid: Grid): Chain[] {
  const rows = grid.length;
  const cols = rows ? grid[0].length : 0;
  const visited = Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false));
  const out: Chain[] = [];
  for (let r0 = 0; r0 < rows; r0++) {
    for (let c0 = 0; c0 < cols; c0++) {
      if (visited[r0][c0] || !grid[r0][c0]) continue;
      const key = grid[r0][c0]!.res.key;
      // Iterative flood fill to avoid deep recursion on large same-key blobs.
      const stack: [number, number][] = [[r0, c0]];
      visited[r0][c0] = true;
      const cells: { row: number; col: number }[] = [];
      while (stack.length) {
        const [r, c] = stack.pop()!;
        cells.push({ row: r, col: c });
        for (const [dr, dc] of DIRS) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          if (visited[nr][nc]) continue;
          const cell = grid[nr][nc];
          if (!cell || cell.res.key !== key) continue;
          visited[nr][nc] = true;
          stack.push([nr, nc]);
        }
      }
      out.push({ key, cells, length: cells.length, tileValue: grid[r0][c0]!.res.value });
    }
  }
  return out;
}

/** All valid chains (components of size >= 3). */
export function enumerateChains(grid: Grid): Chain[] {
  return collectComponents(grid).filter((c) => c.length >= 3);
}

/**
 * Collapse the board after collecting `cells`: null them, let surviving tiles
 * fall down each column (gravity), then refill the emptied top slots from
 * `pool`. Returns a new grid; the input is treated as immutable. APPROXIMATION
 * of the scene's collapse — adequate for v1 metrics, deterministic via `rng`.
 */
export function applyCollapse(
  grid: Grid,
  cells: { row: number; col: number }[],
  rng: () => number,
  pool: readonly string[],
): Grid {
  const rows = grid.length;
  const cols = rows ? grid[0].length : 0;
  // Copy + clear collected cells.
  const next: Grid = grid.map((row) => row.slice());
  for (const { row, col } of cells) next[row][col] = null;
  // Per-column gravity then top-refill.
  for (let c = 0; c < cols; c++) {
    const survivors: Cell[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      if (next[r][c]) survivors.push(next[r][c]);
    }
    for (let r = rows - 1; r >= 0; r--) {
      const fromBottom = rows - 1 - r;
      next[r][c] = fromBottom < survivors.length
        ? survivors[fromBottom]
        : { res: tileRes(pick(pool, rng)) };
    }
  }
  return next;
}
