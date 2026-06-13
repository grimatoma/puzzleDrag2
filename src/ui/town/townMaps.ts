// Zone Tier Ladder — hand-authored town maps.
//
// Each (zone, tier) rung is an `AuthoredTownMap`: an explicit 30×40 ground-tile
// grid plus coordinate-based object lists (lots / boards / props). `getTownMap`
// converts one into the `TownPlan` shape `TownScene` consumes, carrying the
// authored `groundTiles` so the scene paints the ground straight from it and
// skips the procedural passes. Zones/tiers with no entry fall back to the
// procedural `buildTownPlan`.
//
// Authoring contract (test-enforced in zone-tier-ladder maps test):
//   • lots.length === tiers[tier].plots for the (zone, tier)
//   • lot `index` is STABLE across rungs — tier N keeps tier N-1's indices and
//     appends higher ones, so a placed building never moves when the town grows.
//
// Ground uses the same Tuxemon tileset indices `TownScene` references.
import type { TownPlan } from "./TownScene.js";

// Design space — must match TownScene's grid (40×30 @ 32px → 1280×960).
const TILE = 32;
const COLS = 40;
const ROWS = 30;
const DESIGN_W = COLS * TILE; // 1280
const DESIGN_H = ROWS * TILE; // 960

// ── Tileset indices (mirror of the private `T` in TownScene.ts; appendix of
// docs/zone-tier-ladder.html). Authors may also write -1 for a blank cell.
const GRASS = 26;
const GRASS_ALT = [50, 51, 76, 77, 98, 99];
const GRASS_FLOWER = [120, 121];
const DIRT = 35;

type Grid = number[][];

// ── Grid composition helpers (compose maps instead of typing cell-by-cell) ──
function blankGrid(fill = GRASS): Grid {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => fill));
}

function inBounds(tx: number, ty: number): boolean {
  return tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS;
}

function setTile(grid: Grid, tx: number, ty: number, idx: number): void {
  if (inBounds(tx, ty)) grid[ty][tx] = idx;
}

/** Fill an axis-aligned tile rect [tx,ty,w,h). */
function rectTiles(grid: Grid, tx: number, ty: number, w: number, h: number, idx: number): void {
  for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) setTile(grid, x, y, idx);
}

/** Horizontal road band, `thick` tiles tall, centred on row `ty`. */
function roadH(grid: Grid, tx1: number, tx2: number, ty: number, thick = 2, idx = DIRT): void {
  const half = Math.floor(thick / 2);
  for (let x = Math.min(tx1, tx2); x <= Math.max(tx1, tx2); x++)
    for (let o = -half; o <= thick - 1 - half; o++) setTile(grid, x, ty + o, idx);
}

/** Vertical road band, `thick` tiles wide, centred on col `tx`. */
function roadV(grid: Grid, ty1: number, ty2: number, tx: number, thick = 2, idx = DIRT): void {
  const half = Math.floor(thick / 2);
  for (let y = Math.min(ty1, ty2); y <= Math.max(ty1, ty2); y++)
    for (let o = -half; o <= thick - 1 - half; o++) setTile(grid, tx + o, y, idx);
}

/** Filled ellipse of `idx` (tile space) — used for the plaza disc. */
function disc(grid: Grid, cx: number, cy: number, rx: number, ry: number, idx: number): void {
  for (let y = cy - ry; y <= cy + ry; y++)
    for (let x = cx - rx; x <= cx + rx; x++)
      if (((x - cx) ** 2) / (rx * rx) + ((y - cy) ** 2) / (ry * ry) <= 1.05) setTile(grid, x, y, idx);
}

/** Deterministic grass variants + flower clusters so plain grass reads alive. */
function decorateGrass(grid: Grid, seedBase: number): void {
  let seed = (seedBase * 2654435761) >>> 0;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (grid[y][x] !== GRASS) continue;
      const r = rnd();
      if (r < 0.04) grid[y][x] = GRASS_FLOWER[Math.floor(rnd() * GRASS_FLOWER.length)];
      else if (r < 0.2) grid[y][x] = GRASS_ALT[Math.floor(rnd() * GRASS_ALT.length)];
    }
  }
}

const px = (tile: number) => tile * TILE;

// ── Authored-map types ──────────────────────────────────────────────────────
export interface AuthoredLot { index: number; cx: number; cy: number; w: number; h: number }
export interface AuthoredBoard { kind: "farm" | "mine" | "fish"; cx: number; cy: number; w: number; h: number }
export interface AuthoredProp { kind: string; x: number; y: number }

export interface AuthoredTownMap {
  groundTiles: Grid;
  lots: AuthoredLot[];
  boards?: AuthoredBoard[];
  props?: AuthoredProp[];
  plaza?: { cx: number; cy: number; rx: number; ry: number };
  well?: { cx: number; cy: number; r: number };
}

// ── Shared layout grid for the home (farm) ladder ───────────────────────────
// Lot centres (pixel space). Columns C0/C1 are the Hamlet core; C2/C3 are the
// Village/City extension. Indices below are STABLE across all three rungs.
const LOT_W = 128;
const LOT_H = 112;
const HOME_COLS = [150, 300, 450, 600];
const HOME_ROWS = [300, 470, 640];
const lot = (index: number, col: number, row: number): AuthoredLot => ({
  index,
  cx: HOME_COLS[col],
  cy: HOME_ROWS[row],
  w: LOT_W,
  h: LOT_H,
});

// Farm board fixture, shared by all home rungs (right third of the map).
const HOME_FARM_BOARD: AuthoredBoard = { kind: "farm", cx: 1010, cy: 470, w: 380, h: 520 };
const HOME_PLAZA = { cx: 380, cy: 150, rx: px(5), ry: px(3) };
const HOME_WELL = { cx: 380, cy: 150, r: 20 };

/** Paint the ground shared by every home rung (grass, plaza, road skeleton). */
function homeGround(seed: number): Grid {
  const g = blankGrid(GRASS);
  // Plaza disc (tile space) around the well.
  disc(g, 12, 5, 5, 3, DIRT);
  // Main streets: a vertical spine to the board + a cross street through town.
  roadV(g, 2, 28, 23, 2);          // spine separating town from the farm board
  roadH(g, 3, 37, 5, 2);           // plaza-level road reaching across to the board
  roadV(g, 5, 25, 12, 1);          // central town street (between cols C1 and C2)
  roadH(g, 2, 23, 25, 2);          // bottom street
  rectTiles(g, 24, 13, 1, 2, DIRT); // dirt apron leading onto the farm board
  decorateGrass(g, seed);
  return g;
}

// ── Town 1 — home ladder ────────────────────────────────────────────────────
// Hamlet (6 lots): columns C0–C1 × rows 0–2.
const HOME_HAMLET: AuthoredTownMap = {
  groundTiles: homeGround(6),
  plaza: HOME_PLAZA,
  well: HOME_WELL,
  boards: [HOME_FARM_BOARD],
  props: [
    { kind: "signpost", x: 470, y: 165 },
    { kind: "lamppost", x: 250, y: 410 },
  ],
  lots: [
    lot(0, 0, 0), lot(1, 1, 0),
    lot(2, 0, 1), lot(3, 1, 1),
    lot(4, 0, 2), lot(5, 1, 2),
  ],
};

// Village (12 lots): Hamlet + columns C2–C3 (indices 6–11). Lots 0–5 unchanged.
const HOME_VILLAGE: AuthoredTownMap = {
  groundTiles: homeGround(12),
  plaza: HOME_PLAZA,
  well: HOME_WELL,
  boards: [HOME_FARM_BOARD],
  props: [
    { kind: "signpost", x: 470, y: 165 },
    { kind: "lamppost", x: 250, y: 410 },
    { kind: "lamppost", x: 550, y: 410 },
    { kind: "planter", x: 380, y: 760 },
  ],
  lots: [
    lot(0, 0, 0), lot(1, 1, 0), lot(6, 2, 0), lot(7, 3, 0),
    lot(2, 0, 1), lot(3, 1, 1), lot(8, 2, 1), lot(9, 3, 1),
    lot(4, 0, 2), lot(5, 1, 2), lot(10, 2, 2), lot(11, 3, 2),
  ],
};

// ── Registry — keyed by zoneId, indexed by tier ─────────────────────────────
// City (home tier 2) and the quarry ladder are authored in a later step; until
// then those rungs fall back to the procedural town plan.
export const TOWN_MAPS: Record<string, AuthoredTownMap[]> = {
  home: [HOME_HAMLET, HOME_VILLAGE],
};

/** Convert an authored map into the TownPlan shape TownScene consumes. */
function toPlan(m: AuthoredTownMap): TownPlan {
  const plaza = m.plaza ?? { cx: DESIGN_W / 2, cy: 120, rx: 0, ry: 0 };
  return {
    width: DESIGN_W,
    height: DESIGN_H,
    groundTiles: m.groundTiles,
    plaza,
    well: m.well ?? { cx: plaza.cx, cy: plaza.cy, r: 18 },
    lots: m.lots.map((l) => ({ index: l.index, cx: l.cx, cy: l.cy, w: l.w, h: l.h, row: "" })),
    boards: m.boards ? m.boards.map((b) => ({ ...b })) : [],
    props: m.props ? m.props.map((p) => ({ ...p })) : [],
    roads: [],
    water: [],
    trees: [],
    waypoints: [],
    edges: [],
    bridges: [],
    fields: [],
    fences: [],
    lotDecor: [],
    streetTrees: [],
  };
}

/**
 * Authored TownPlan for `(zoneId, tier)`, or null when no map is authored
 * (caller falls back to the procedural `buildTownPlan`).
 */
export function getTownMap(zoneId: string, tier: number): TownPlan | null {
  const maps = TOWN_MAPS[zoneId];
  if (!maps) return null;
  const m = maps[tier];
  if (!m) return null;
  return toPlan(m);
}

/** Lot count an authored `(zone, tier)` map exposes, or null when un-authored. */
export function authoredLotCount(zoneId: string, tier: number): number | null {
  const m = TOWN_MAPS[zoneId]?.[tier];
  return m ? m.lots.length : null;
}
