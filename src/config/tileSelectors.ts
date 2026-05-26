/**
 * Tile selectors — one pure function per tool power id.
 * `(grid, params, tap?) → { row, col, key }[]`
 *
 * Shared by the reducer (state mutation) and GameScene (animation targets).
 * No Phaser/React imports.
 */
import { BIOMES, COLS, ROWS } from "../constants.js";
import { tilesInCategory } from "../utils.js";
import { applyAreaBlast, type MutableCell, type MutableGrid } from "../state/boardMutations.js";

/** Result entry: the coordinate plus the original tile key at that cell. */
export interface TileSelectorCell {
  row: number;
  col: number;
  key: string;
}

/** A tap coordinate as supplied by the caller. */
export interface TapPoint {
  row: number;
  col: number;
}

/** Caller-supplied context for biome-relative selectors. */
export interface TileSelectorContext {
  biomeKey?: string;
  biomes?: Record<string, unknown>;
  [extra: string]: unknown;
}

/** Param bag for power selectors. Each selector reads a subset; we type loosely so callers can pass any shape. */
export type TileSelectorParams = Record<string, unknown> & {
  target?: unknown;
  from?: unknown;
  to?: unknown;
  count?: number;
  rowSpan?: number;
  colSpan?: number;
  matchKey?: unknown;
  radius?: number;
};

const HAZARD_LOCKED = (cell: MutableCell | null | undefined): boolean =>
  !!(cell && (cell.rubble || cell.gas || cell.frozen || cell.key === "rat"));

const DIRS4 = [[0, 1], [0, -1], [1, 0], [-1, 0]] as const;

function cellAt(grid: MutableGrid | null | undefined, row: number, col: number): TileSelectorCell | null {
  if (!grid) return null;
  const cell = grid[row]?.[col];
  if (!cell?.key || HAZARD_LOCKED(cell)) return null;
  return { row, col, key: cell.key };
}

function allCells(grid: MutableGrid | null | undefined, excludeSelected = false): TileSelectorCell[] {
  const out: TileSelectorCell[] = [];
  if (!grid) return out;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = grid[r]?.[c];
      if (!cell?.key || HAZARD_LOCKED(cell)) continue;
      if (excludeSelected && cell.selected) continue;
      out.push({ row: r, col: c, key: cell.key });
    }
  }
  return out;
}

/** Fisher–Yates shuffle (in-place copy). */
function shuffled<T>(cells: T[]): T[] {
  const arr = cells.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function selectRow(grid: MutableGrid | null | undefined, tapRow: number, tapCol: number, rowSpan = 1): TileSelectorCell[] {
  const out: TileSelectorCell[] = [];
  const r0 = Math.max(0, tapRow);
  const r1 = Math.min(ROWS - 1, tapRow + rowSpan - 1);
  for (let r = r0; r <= r1; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cellAt(grid, r, c);
      if (cell) out.push(cell);
    }
  }
  return out;
}

function selectColumn(grid: MutableGrid | null | undefined, tapRow: number, tapCol: number, colSpan = 1): TileSelectorCell[] {
  const out: TileSelectorCell[] = [];
  const c0 = Math.max(0, tapCol);
  const c1 = Math.min(COLS - 1, tapCol + colSpan - 1);
  for (let c = c0; c <= c1; c++) {
    for (let r = 0; r < ROWS; r++) {
      const cell = cellAt(grid, r, c);
      if (cell) out.push(cell);
    }
  }
  return out;
}

function selectCross(grid: MutableGrid | null | undefined, tapRow: number, tapCol: number): TileSelectorCell[] {
  const seen = new Set<string>();
  const out: TileSelectorCell[] = [];
  for (const cell of [...selectRow(grid, tapRow, tapCol), ...selectColumn(grid, tapRow, tapCol)]) {
    const id = `${cell.row},${cell.col}`;
    if (!seen.has(id)) {
      seen.add(id);
      out.push(cell);
    }
  }
  return out;
}

/**
 * 4-connected flood from tap matching tapped key (or any key when matchKey false).
 */
function selectComponent(grid: MutableGrid | null | undefined, tapRow: number, tapCol: number, matchKey = true): TileSelectorCell[] {
  const seed = cellAt(grid, tapRow, tapCol);
  if (!seed) return [];
  const targetKey = seed.key;
  const out: TileSelectorCell[] = [];
  const visited: boolean[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
  const queue: TapPoint[] = [{ row: tapRow, col: tapCol }];
  visited[tapRow][tapCol] = true;
  while (queue.length) {
    const { row: r, col: c } = queue.shift()!;
    const cell = cellAt(grid, r, c);
    if (!cell) continue;
    if (matchKey && cell.key !== targetKey) continue;
    out.push(cell);
    for (const [dr, dc] of DIRS4) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || visited[nr][nc]) continue;
      visited[nr][nc] = true;
      queue.push({ row: nr, col: nc });
    }
  }
  return out;
}

export function resolveTransformKey(params: TileSelectorParams, biomeKey: string = "farm"): string | null {
  const to = params.to;
  if (to === "biome_base") {
    const biome = BIOMES[biomeKey];
    return biome?.tiles?.[0]?.key ?? null;
  }
  if (to === "biome_rare") {
    const biome = BIOMES[biomeKey];
    if (!biome) return null;
    if (biome.name === "Mine") return "tile_mine_gem";
    return "tile_fruit_blackberry";
  }
  return typeof to === "string" ? to : null;
}

/** Selector function signature: takes the board + params + optional tap/ctx and returns matched cells. */
export type TileSelectorFn = (
  grid: MutableGrid | null | undefined,
  params: TileSelectorParams,
  tap?: TapPoint | null,
  ctx?: TileSelectorContext,
) => TileSelectorCell[];

export const TILE_SELECTORS: Readonly<Record<string, TileSelectorFn>> = Object.freeze({
  clear_row(grid, params, tap) {
    if (!tap || typeof tap.row !== "number") return [];
    return selectRow(grid, tap.row, tap.col, Number(params.rowSpan) || 1);
  },
  clear_column(grid, params, tap) {
    if (!tap || typeof tap.row !== "number") return [];
    return selectColumn(grid, tap.row, tap.col, Number(params.colSpan) || 1);
  },
  clear_cross(grid, _params, tap) {
    if (!tap || typeof tap.row !== "number") return [];
    return selectCross(grid, tap.row, tap.col);
  },
  clear_component(grid, params, tap) {
    if (!tap || typeof tap.row !== "number") return [];
    return selectComponent(grid, tap.row, tap.col, params.matchKey !== false);
  },
  clear_random_n(grid, params) {
    const n = Number(params.count) || 6;
    return shuffled(allCells(grid, true)).slice(0, n);
  },
  transform_random_n(grid, params) {
    const n = Number(params.count) || 5;
    return shuffled(allCells(grid, true)).slice(0, n);
  },
  area_blast(grid, params, tap) {
    if (!tap || typeof tap.row !== "number") return [];
    const radius = Number(params.radius) || 1;
    const { grid: blasted } = applyAreaBlast(grid, tap.row, tap.col, radius);
    const out: TileSelectorCell[] = [];
    if (!grid) return out;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const before = grid[r]?.[c];
        const after = blasted[r]?.[c];
        const beforeKey = before?.key;
        if (beforeKey && (!after?.key || after._emptied)) {
          out.push({ row: r, col: c, key: beforeKey });
        }
      }
    }
    return out;
  },
  tap_clear_type(grid, _params, tap) {
    if (!tap || typeof tap.row !== "number" || !grid) return [];
    const key = grid[tap.row]?.[tap.col]?.key;
    if (!key) return [];
    const out: TileSelectorCell[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r]?.[c]?.key === key) {
          const cell = cellAt(grid, r, c);
          if (cell) out.push(cell);
        }
      }
    }
    return out;
  },
  clear_category(grid, params) {
    const keys = tilesInCategory(params.target as string | string[]);
    const keySet = new Set(keys);
    return allCells(grid).filter((c) => keySet.has(c.key));
  },
  clear_all(grid, params) {
    const target = params.target;
    if (target === "*") return allCells(grid);
    return allCells(grid).filter((c) => c.key === target);
  },
  reshuffle_board() {
    return [];
  },
  arm_fill_bias() {
    return [];
  },
  transform_tiles(grid, params) {
    const fromCategory = tilesInCategory(params.from as string | string[]);
    const fromKeys = fromCategory.length > 0
      ? fromCategory
      : (typeof params.from === "string" ? [params.from] : []);
    const keySet = new Set(fromKeys);
    return allCells(grid).filter((c) => keySet.has(c.key));
  },
  transform_adjacent(grid, params, tap) {
    if (!tap || typeof tap.row !== "number") return [];
    const radius = Number(params.radius) || 1;
    const fromCategory = tilesInCategory(params.from as string | string[]);
    const fromKeys = fromCategory.length > 0
      ? fromCategory
      : (typeof params.from === "string" ? [params.from] : []);
    const keySet = new Set(fromKeys);
    const r0 = Math.max(0, tap.row - radius);
    const r1 = Math.min(ROWS - 1, tap.row + radius);
    const c0 = Math.max(0, tap.col - radius);
    const c1 = Math.min(COLS - 1, tap.col + radius);
    const out: TileSelectorCell[] = [];
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const cell = cellAt(grid, r, c);
        if (cell && keySet.has(cell.key)) out.push(cell);
      }
    }
    return out;
  },
});

export function selectTilesForPower(
  powerId: string,
  grid: MutableGrid | null | undefined,
  params: TileSelectorParams = {},
  tap?: TapPoint | null,
  ctx: TileSelectorContext = {},
): TileSelectorCell[] {
  const fn = TILE_SELECTORS[powerId];
  if (!fn) return [];
  return fn(grid ?? [], params ?? {}, tap ?? undefined, ctx); // ctx reserved for biome-relative selectors
}
