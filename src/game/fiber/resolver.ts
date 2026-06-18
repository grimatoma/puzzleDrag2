/**
 * Fiber Crush — the swap-match resolver. This is the *new verb*, deliberately
 * different from the main game's free 8-direction drag-chain (`src/game/chain.ts`):
 *
 *   - Input is an ADJACENT SWAP of two orthogonally-neighbouring tiles.
 *   - A swap is only legal if it forms at least one LINE (row/column run) of 3+.
 *   - Matches are straight lines, NOT flood-fill blobs.
 *
 * Pure module — no Phaser, no internal randomness. The RNG for refills is
 * injected as `nextColor` so every resolution is deterministic and
 * unit-testable. The Phaser `FiberScene` supplies the real RNG.
 */

export type FiberColor = "white" | "grey" | "brown" | "black" | "cream";
export type FiberSpecial = "spindle" | "loom" | "dyevat";

export interface FiberCell {
  color: FiberColor;
  special?: FiberSpecial | null;
}

/** A grid cell is either a tile or `null` (a transient empty during gravity). */
export type FiberGrid = (FiberCell | null)[][];

/** The five match colours, in canonical order. */
export const FIBER_COLORS: readonly FiberColor[] = ["white", "grey", "brown", "black", "cream"];

/** Per-colour tally returned by {@link resolveSwap}. */
export type ColorTally = Record<FiberColor, number>;

function emptyTally(): ColorTally {
  return { white: 0, grey: 0, brown: 0, black: 0, cream: 0 };
}

const cellKey = (r: number, c: number): string => `${r},${c}`;

function gridDims(grid: FiberGrid): { rows: number; cols: number } {
  const rows = grid.length;
  const cols = rows ? grid[0].length : 0;
  return { rows, cols };
}

/** Deep-ish copy: clones the row arrays and each cell object (cells are flat). */
export function cloneGrid(grid: FiberGrid): FiberGrid {
  return grid.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function inBounds(grid: FiberGrid, r: number, c: number): boolean {
  const { rows, cols } = gridDims(grid);
  return r >= 0 && r < rows && c >= 0 && c < cols;
}

/** A maximal straight run of ≥3 same-colour cells (horizontal or vertical). */
export interface LineRun {
  cells: [number, number][];
  length: number;
  orientation: "h" | "v";
  color: FiberColor;
}

/** All maximal horizontal runs of ≥3 same-colour cells. */
function horizontalRuns(grid: FiberGrid): LineRun[] {
  const { rows, cols } = gridDims(grid);
  const runs: LineRun[] = [];
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      const cell = grid[r][c];
      if (!cell) { c++; continue; }
      const run: [number, number][] = [[r, c]];
      let cc = c + 1;
      while (cc < cols && grid[r][cc] && grid[r][cc]!.color === cell.color) {
        run.push([r, cc]);
        cc++;
      }
      if (run.length >= 3) runs.push({ cells: run, length: run.length, orientation: "h", color: cell.color });
      c = cc;
    }
  }
  return runs;
}

/** All maximal vertical runs of ≥3 same-colour cells. */
function verticalRuns(grid: FiberGrid): LineRun[] {
  const { rows, cols } = gridDims(grid);
  const runs: LineRun[] = [];
  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows) {
      const cell = grid[r][c];
      if (!cell) { r++; continue; }
      const run: [number, number][] = [[r, c]];
      let rr = r + 1;
      while (rr < rows && grid[rr][c] && grid[rr][c]!.color === cell.color) {
        run.push([rr, c]);
        rr++;
      }
      if (run.length >= 3) runs.push({ cells: run, length: run.length, orientation: "v", color: cell.color });
      r = rr;
    }
  }
  return runs;
}

/**
 * All horizontal + vertical runs of ≥3 same-colour cells. Each entry is one
 * maximal straight line. (An L/T shape surfaces as two overlapping runs.)
 */
export function findMatches(grid: FiberGrid): Array<{ cells: [number, number][]; length: number }> {
  return [...horizontalRuns(grid), ...verticalRuns(grid)].map((run) => ({ cells: run.cells, length: run.length }));
}

/** True iff the grid has at least one line of 3+. */
export function hasMatch(grid: FiberGrid): boolean {
  return horizontalRuns(grid).length > 0 || verticalRuns(grid).length > 0;
}

function isAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}

function swapInPlace(grid: FiberGrid, r1: number, c1: number, r2: number, c2: number): void {
  const tmp = grid[r1][c1];
  grid[r1][c1] = grid[r2][c2];
  grid[r2][c2] = tmp;
}

/**
 * True iff swapping (r1,c1)↔(r2,c2) is legal AND creates ≥1 line of 3+.
 * Rejects non-adjacent / diagonal swaps and swaps touching an empty cell.
 * Does not mutate `grid`.
 */
export function isValidSwap(grid: FiberGrid, r1: number, c1: number, r2: number, c2: number): boolean {
  if (!inBounds(grid, r1, c1) || !inBounds(grid, r2, c2)) return false;
  if (!grid[r1][c1] || !grid[r2][c2]) return false;
  if (!isAdjacent(r1, c1, r2, c2)) return false;
  const work = cloneGrid(grid);
  swapInPlace(work, r1, c1, r2, c2);
  return hasMatch(work);
}

/**
 * Generate a starting board with NO pre-existing match and at least one legal
 * swap. Pure: `rng` (0..1) is injected. Colours are placed avoiding any
 * immediate 3-in-a-row at placement time; if the rare result has no valid swap
 * it regenerates (bounded by `maxTries`).
 */
export function generateBoard(
  rows: number,
  cols: number,
  colors: readonly FiberColor[],
  rng: () => number,
  maxTries = 40,
): FiberGrid {
  const pick = (): FiberColor => colors[Math.min(colors.length - 1, Math.floor(rng() * colors.length))];
  for (let attempt = 0; attempt < maxTries; attempt++) {
    const grid: FiberGrid = Array.from({ length: rows }, () => new Array<FiberCell | null>(cols).fill(null));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let color: FiberColor;
        let guard = 0;
        do {
          color = pick();
          guard++;
        } while (
          guard < 50 &&
          ((c >= 2 && grid[r][c - 1]?.color === color && grid[r][c - 2]?.color === color) ||
            (r >= 2 && grid[r - 1][c]?.color === color && grid[r - 2][c]?.color === color))
        );
        grid[r][c] = { color, special: null };
      }
    }
    if (!hasMatch(grid) && hasAnyValidSwap(grid)) return grid;
  }
  // Fallback: return the last attempt (extremely rare with ≥4 colours).
  const grid: FiberGrid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ color: pick(), special: null as FiberSpecial | null })),
  );
  return grid;
}

/** True iff any orthogonal swap on the board would create a match (no-deadlock check). */
export function hasAnyValidSwap(grid: FiberGrid): boolean {
  const { rows, cols } = gridDims(grid);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols && isValidSwap(grid, r, c, r, c + 1)) return true;
      if (r + 1 < rows && isValidSwap(grid, r, c, r + 1, c)) return true;
    }
  }
  return false;
}

// ── Special-tile effects (pure) ────────────────────────────────────────────
// Each returns the list of cells the special clears when it is part of a match.

/** Spindle: clears its entire row and column. */
export function spindleClearedCells(grid: FiberGrid, r: number, c: number): [number, number][] {
  const { rows, cols } = gridDims(grid);
  const out: [number, number][] = [];
  for (let cc = 0; cc < cols; cc++) out.push([r, cc]);
  for (let rr = 0; rr < rows; rr++) if (rr !== r) out.push([rr, c]);
  return out;
}

/** Loom: clears the 3×3 block centred on it (clamped to bounds). */
export function loomClearedCells(grid: FiberGrid, r: number, c: number): [number, number][] {
  const out: [number, number][] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (inBounds(grid, r + dr, c + dc)) out.push([r + dr, c + dc]);
    }
  }
  return out;
}

/**
 * Dye-vat: dissolves every tile sharing the dye-vat's colour into dye — i.e.
 * clears all board cells of that colour. "Converts a colour" into dye output.
 */
export function dyevatClearedCells(grid: FiberGrid, color: FiberColor): [number, number][] {
  const { rows, cols } = gridDims(grid);
  const out: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c]?.color === color) out.push([r, c]);
    }
  }
  return out;
}

/** A special to create at `[r,c]` from a match shape (it survives the clear). */
interface SpecialCreation {
  r: number;
  c: number;
  color: FiberColor;
  type: FiberSpecial;
}

/**
 * Decide which special tiles a set of matched runs creates:
 *   - a straight run of exactly 4 → one spindle (at the run's centre)
 *   - a straight run of 5+        → one loom (at the run's centre)
 *   - an L/T intersection (a cell in both an h-run≥3 and a v-run≥3) → one loom
 */
function computeCreations(hRuns: LineRun[], vRuns: LineRun[]): SpecialCreation[] {
  const creations: SpecialCreation[] = [];
  const claimed = new Set<string>();

  // Intersections first (they take priority and become looms).
  const hCells = new Map<string, FiberColor>();
  for (const run of hRuns) for (const [r, c] of run.cells) hCells.set(cellKey(r, c), run.color);
  for (const run of vRuns) {
    for (const [r, c] of run.cells) {
      const k = cellKey(r, c);
      if (hCells.has(k) && !claimed.has(k)) {
        claimed.add(k);
        creations.push({ r, c, color: run.color, type: "loom" });
      }
    }
  }

  for (const run of [...hRuns, ...vRuns]) {
    if (run.length < 4) continue;
    const mid = run.cells[Math.floor(run.length / 2)];
    const k = cellKey(mid[0], mid[1]);
    if (claimed.has(k)) continue;
    claimed.add(k);
    creations.push({ r: mid[0], c: mid[1], color: run.color, type: run.length >= 5 ? "loom" : "spindle" });
  }
  return creations;
}

function gravityAndRefill(grid: FiberGrid, nextColor: () => FiberColor): FiberGrid {
  const { rows, cols } = gridDims(grid);
  const out: FiberGrid = Array.from({ length: rows }, () => new Array<FiberCell | null>(cols).fill(null));
  for (let c = 0; c < cols; c++) {
    const existing: FiberCell[] = [];
    for (let r = 0; r < rows; r++) {
      const cell = grid[r][c];
      if (cell) existing.push(cell);
    }
    const emptyCount = rows - existing.length;
    for (let r = 0; r < rows; r++) {
      if (r < emptyCount) out[r][c] = { color: nextColor(), special: null };
      else out[r][c] = existing[r - emptyCount];
    }
  }
  return out;
}

/** Per-special-type counts (created this resolution or triggered this resolution). */
export interface SpecialTally {
  spindle: number;
  loom: number;
  dyevat: number;
}

function emptySpecialTally(): SpecialTally {
  return { spindle: 0, loom: 0, dyevat: 0 };
}

export interface ResolveResult {
  grid: FiberGrid;
  cleared: ColorTally;
  movesSpent: 1;
  /** Total specials created this resolution (spindle + loom). */
  createdSpecials: number;
  /** Specials created this resolution, by type. */
  created: SpecialTally;
  /** Pre-existing specials detonated this resolution, by type. */
  triggered: SpecialTally;
}

/** Hard cap on cascade iterations — a safety bound so a pathological refill
 *  can never hang the resolver (the loop is otherwise driven to a fixed point). */
const MAX_CASCADES = 200;

/**
 * Apply a swap, then resolve cascades to a fixed point:
 *   clear matches → trigger any matched special tiles → place newly-created
 *   specials → gravity collapse → refill from `nextColor` → repeat.
 *
 * Returns the settled grid, a per-colour tally of every cleared cell (the
 * economy credit), exactly `movesSpent: 1`, and the count of specials created.
 *
 * The swap is applied unconditionally (callers gate legality via
 * {@link isValidSwap}); a swap that forms nothing simply resolves to no
 * clears with the tiles swapped.
 */
export function resolveSwap(
  grid: FiberGrid,
  swap: { r1: number; c1: number; r2: number; c2: number },
  nextColor: () => FiberColor,
): ResolveResult {
  const work = cloneGrid(grid);
  if (inBounds(work, swap.r1, swap.c1) && inBounds(work, swap.r2, swap.c2)) {
    swapInPlace(work, swap.r1, swap.c1, swap.r2, swap.c2);
  }

  const cleared = emptyTally();
  const created = emptySpecialTally();
  const triggered = emptySpecialTally();
  let createdSpecials = 0;
  let current = work;

  for (let pass = 0; pass < MAX_CASCADES; pass++) {
    const hRuns = horizontalRuns(current);
    const vRuns = verticalRuns(current);
    if (hRuns.length === 0 && vRuns.length === 0) break;

    // 1. Base matched cells.
    const toClear = new Set<string>();
    const matched: [number, number][] = [];
    for (const run of [...hRuns, ...vRuns]) {
      for (const [r, c] of run.cells) {
        const k = cellKey(r, c);
        if (!toClear.has(k)) { toClear.add(k); matched.push([r, c]); }
      }
    }

    // 2. Trigger pre-existing specials that landed in the matched set.
    for (const [r, c] of matched) {
      const cell = current[r][c];
      const special = cell?.special;
      if (!special) continue;
      let blast: [number, number][] = [];
      if (special === "spindle") blast = spindleClearedCells(current, r, c);
      else if (special === "loom") blast = loomClearedCells(current, r, c);
      else if (special === "dyevat" && cell) blast = dyevatClearedCells(current, cell.color);
      triggered[special] += 1;
      for (const [br, bc] of blast) toClear.add(cellKey(br, bc));
    }

    // 3. Which special tiles this match CREATES (they survive the clear).
    const creations = computeCreations(hRuns, vRuns);
    createdSpecials += creations.length;
    for (const cre of creations) created[cre.type] += 1;
    const creationAt = new Map<string, SpecialCreation>();
    for (const cre of creations) creationAt.set(cellKey(cre.r, cre.c), cre);

    // 4. Clear everything in toClear except creation sites; tally by colour.
    const next = cloneGrid(current);
    for (const key of toClear) {
      if (creationAt.has(key)) continue;
      const [r, c] = key.split(",").map(Number);
      const cell = next[r][c];
      if (cell) cleared[cell.color] += 1;
      next[r][c] = null;
    }
    // 5. Stamp the created specials into their (surviving) cells.
    for (const cre of creations) {
      next[cre.r][cre.c] = { color: cre.color, special: cre.type };
    }

    // 6. Gravity + refill.
    current = gravityAndRefill(next, nextColor);
  }

  return { grid: current, cleared, movesSpent: 1, createdSpecials, created, triggered };
}
