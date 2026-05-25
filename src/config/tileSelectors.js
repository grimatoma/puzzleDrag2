// @ts-check
/**
 * Tile selectors — one pure function per tool power id.
 * `(grid, params, tap?) → { row, col, key }[]`
 *
 * Shared by the reducer (state mutation) and GameScene (animation targets).
 * No Phaser/React imports.
 */
import { BIOMES, COLS, ROWS } from "../constants.js";
import { tilesInCategory } from "../utils.js";
import { applyAreaBlast } from "../state/boardMutations.js";

const HAZARD_LOCKED = (cell) =>
  !!(cell && (cell.rubble || cell.gas || cell.frozen || cell.key === "rat"));

const DIRS4 = [[0, 1], [0, -1], [1, 0], [-1, 0]];

/**
 * @param {Array<Array<{ key?: string | null }>> | null | undefined} grid
 * @param {number} row
 * @param {number} col
 * @returns {{ row: number, col: number, key: string } | null}
 */
function cellAt(grid, row, col) {
  if (!grid) return null;
  const cell = grid[row]?.[col];
  if (!cell?.key || HAZARD_LOCKED(cell)) return null;
  return { row, col, key: cell.key };
}

/**
 * @param {Array<Array<{ key?: string | null }>> | null | undefined} grid
 * @param {boolean} [excludeSelected]
 */
function allCells(grid, excludeSelected = false) {
  const out = [];
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
function shuffled(cells) {
  const arr = cells.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * @param {Array<Array<{ key?: string | null }>>} grid
 * @param {number} tapRow
 * @param {number} tapCol
 * @param {number} rowSpan
 */
function selectRow(grid, tapRow, tapCol, rowSpan = 1) {
  const out = [];
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

/**
 * @param {Array<Array<{ key?: string | null }>>} grid
 * @param {number} tapRow
 * @param {number} tapCol
 * @param {number} colSpan
 */
function selectColumn(grid, tapRow, tapCol, colSpan = 1) {
  const out = [];
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

/**
 * @param {Array<Array<{ key?: string | null }>>} grid
 * @param {number} tapRow
 * @param {number} tapCol
 */
function selectCross(grid, tapRow, tapCol) {
  const seen = new Set();
  const out = [];
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
function selectComponent(grid, tapRow, tapCol, matchKey = true) {
  const seed = cellAt(grid, tapRow, tapCol);
  if (!seed) return [];
  const targetKey = seed.key;
  const out = [];
  const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
  const queue = [{ row: tapRow, col: tapCol }];
  visited[tapRow][tapCol] = true;
  while (queue.length) {
    const { row: r, col: c } = queue.shift();
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

/**
 * @param {object} params
 * @param {string} [biomeKey]
 */
export function resolveTransformKey(params, biomeKey = "farm") {
  const to = params.to;
  if (to === "biome_base") {
    return BIOMES[biomeKey]?.tiles?.[0]?.key ?? null;
  }
  if (to === "biome_rare") {
    const biome = BIOMES[biomeKey];
    if (!biome) return null;
    if (biome.name === "Mine") return "tile_mine_gem";
    return "tile_fruit_blackberry";
  }
  return typeof to === "string" ? to : null;
}

/** @type {Record<string, (grid: any, params: any, tap?: { row: number, col: number }, ctx?: { biomeKey?: string, biomes?: any }) => Array<{ row: number, col: number, key: string }>>} */
export const TILE_SELECTORS = Object.freeze({
  clear_row(grid, params, tap) {
    if (!tap || typeof tap.row !== "number") return [];
    return selectRow(grid, tap.row, tap.col, params.rowSpan ?? 1);
  },
  clear_column(grid, params, tap) {
    if (!tap || typeof tap.row !== "number") return [];
    return selectColumn(grid, tap.row, tap.col, params.colSpan ?? 1);
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
    const n = params.count ?? 6;
    return shuffled(allCells(grid, true)).slice(0, n);
  },
  transform_random_n(grid, params) {
    const n = params.count ?? 5;
    return shuffled(allCells(grid, true)).slice(0, n);
  },
  area_blast(grid, params, tap) {
    if (!tap || typeof tap.row !== "number") return [];
    const radius = params.radius ?? 1;
    const { grid: blasted } = applyAreaBlast(grid, tap.row, tap.col, radius);
    const out = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const before = grid[r]?.[c];
        const after = blasted[r]?.[c];
        if (before?.key && (!after?.key || after._emptied)) {
          out.push({ row: r, col: c, key: before.key });
        }
      }
    }
    return out;
  },
  tap_clear_type(grid, _params, tap) {
    if (!tap || typeof tap.row !== "number") return [];
    const key = grid[tap.row]?.[tap.col]?.key;
    if (!key) return [];
    const out = [];
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
    const keys = tilesInCategory(params.target);
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
    const fromCategory = tilesInCategory(params.from);
    const fromKeys = fromCategory.length > 0
      ? fromCategory
      : (typeof params.from === "string" ? [params.from] : []);
    const keySet = new Set(fromKeys);
    return allCells(grid).filter((c) => keySet.has(c.key));
  },
  transform_adjacent(grid, params, tap) {
    if (!tap || typeof tap.row !== "number") return [];
    const radius = params.radius ?? 1;
    const fromCategory = tilesInCategory(params.from);
    const fromKeys = fromCategory.length > 0
      ? fromCategory
      : (typeof params.from === "string" ? [params.from] : []);
    const keySet = new Set(fromKeys);
    const r0 = Math.max(0, tap.row - radius);
    const r1 = Math.min(ROWS - 1, tap.row + radius);
    const c0 = Math.max(0, tap.col - radius);
    const c1 = Math.min(COLS - 1, tap.col + radius);
    const out = [];
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const cell = cellAt(grid, r, c);
        if (cell && keySet.has(cell.key)) out.push(cell);
      }
    }
    return out;
  },
});

/**
 * @param {string} powerId
 * @param {Array<Array<object>> | null | undefined} grid
 * @param {object} [params]
 * @param {{ row: number, col: number } | null | undefined} [tap]
 * @param {{ biomeKey?: string, biomes?: object }} [ctx]
 */
export function selectTilesForPower(powerId, grid, params = {}, tap, ctx = {}) {
  const fn = TILE_SELECTORS[powerId];
  if (!fn) return [];
  return fn(grid ?? [], params ?? {}, tap ?? undefined, ctx); // ctx reserved for biome-relative selectors
}
