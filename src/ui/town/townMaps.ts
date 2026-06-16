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
import { blankMask, maskBandH, maskBandV, maskDisc, maskRect, paintSandPaths } from "./roadAutotile.js";

// Design space — must match TownScene's grid (40×30 @ 32px → 1280×960).
const TILE = 32;
const COLS = 40;
const ROWS = 30;
const DESIGN_W = COLS * TILE; // 1280
const DESIGN_H = ROWS * TILE; // 960

// ── Tileset indices (mirror of the private `T` in TownScene.ts; appendix of
// docs/zone-tier-ladder.html). Authors may also write -1 for a blank cell.
// Clean flat fills — NOT 26/35 or the 50/51/… "variants", which each carry a
// baked dark fleck / sand patch and tile into a regular grid of smudges. See the
// `T` table in TownScene.ts. 125 = clean grass; sand fill is the autotiler's blob
// centre (roadAutotile SAND.fill).
const GRASS = 125;
const GRASS_ALT = [126, 189];
const GRASS_FLOWER = [120, 121];

type Grid = number[][];

// ── Grid composition helpers (compose maps instead of typing cell-by-cell) ──
// Ground is grass + AUTOTILED sand: roads/plaza/yards are described as a sand
// MASK (where) and `paintSandPaths` picks the soft grass↔sand transition tile per
// cell (which). See `roadAutotile.ts`. There is no flat-DIRT fill path any more.
function blankGrid(fill = GRASS): Grid {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => fill));
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

// ── Town 1 — home (farm) ladder ─────────────────────────────────────────────
// Lot centres (pixel space) on a 5-col × 4-row grid. Hamlet = cols 0–1 ×
// rows 0–2; Village adds cols 2–3; City adds col 4 and the bottom row. Lot
// indices are STABLE across every rung (appended growth), so a placed building
// never moves as the town grows.
const LOT_W = 112;
const LOT_H = 104;
const HOME_COLS = [110, 240, 370, 500, 630];
const HOME_ROWS = [280, 440, 600, 760];
const lot = (index: number, col: number, row: number): AuthoredLot => ({
  index,
  cx: HOME_COLS[col],
  cy: HOME_ROWS[row],
  w: LOT_W,
  h: LOT_H,
});

// Farm board fixture, shared by all home rungs (right third of the map).
const HOME_FARM_BOARD: AuthoredBoard = { kind: "farm", cx: 1010, cy: 470, w: 380, h: 520 };
const HOME_PLAZA = { cx: 370, cy: 120, rx: px(4), ry: px(2) };
const HOME_WELL = { cx: 370, cy: 120, r: 20 };

/**
 * Paint the ground shared by every home rung. The streets + plaza are described
 * as a single boolean MASK (where sand goes), then AUTOTILED into the grass↔sand
 * blob so every boundary gets a soft rounded transition instead of a hard DIRT
 * seam (see `roadAutotile.ts` + docs/road-system-proposal.html). Street widths
 * are ≥2 so a two-sided border fits — a 1-wide road can't carry one.
 *
 * The network reads as a clear village: a top boulevard off the plaza, a left
 * avenue and a right spine enclosing the lots, three cross streets between the
 * lot rows, and an apron onto the farm board.
 */
function homeGround(seed: number): Grid {
  const g = blankGrid(GRASS);
  const m = blankMask(ROWS, COLS);
  maskDisc(m, 11, 4, 5, 3);          // town-green plaza around the well
  maskBandH(m, 1, 23, 6, 3);         // top boulevard: plaza → spine
  maskBandV(m, 6, 26, 1, 2);         // left avenue
  maskBandV(m, 5, 27, 23, 2);        // spine separating town from the farm board
  maskBandH(m, 1, 23, 11, 2);        // cross street between lot rows 0–1
  maskBandH(m, 1, 23, 16, 2);        // cross street between lot rows 1–2
  maskBandH(m, 1, 23, 21, 2);        // cross street between lot rows 2–3
  maskRect(m, 23, 13, 3, 3);         // apron leading onto the farm board
  paintSandPaths(g, m);              // overlay autotiled sand transitions
  decorateGrass(g, seed);            // sprinkle variants on the remaining grass
  return g;
}

const HOME_PROPS_BASE: AuthoredProp[] = [
  { kind: "signpost", x: 470, y: 135 },
  { kind: "lamppost", x: 305, y: 360 },
];

// Hamlet (6 lots): cols 0–1 × rows 0–2.
const HOME_HAMLET: AuthoredTownMap = {
  groundTiles: homeGround(6),
  plaza: HOME_PLAZA,
  well: HOME_WELL,
  boards: [HOME_FARM_BOARD],
  props: HOME_PROPS_BASE,
  lots: [
    lot(0, 0, 0), lot(1, 1, 0),
    lot(2, 0, 1), lot(3, 1, 1),
    lot(4, 0, 2), lot(5, 1, 2),
  ],
};

// Village (12 lots): Hamlet + cols 2–3 × rows 0–2 (indices 6–11). 0–5 unchanged.
const HOME_VILLAGE: AuthoredTownMap = {
  groundTiles: homeGround(12),
  plaza: HOME_PLAZA,
  well: HOME_WELL,
  boards: [HOME_FARM_BOARD],
  props: [...HOME_PROPS_BASE, { kind: "lamppost", x: 565, y: 360 }, { kind: "planter", x: 370, y: 680 }],
  lots: [
    lot(0, 0, 0), lot(1, 1, 0), lot(6, 2, 0), lot(7, 3, 0),
    lot(2, 0, 1), lot(3, 1, 1), lot(8, 2, 1), lot(9, 3, 1),
    lot(4, 0, 2), lot(5, 1, 2), lot(10, 2, 2), lot(11, 3, 2),
  ],
};

// City (20 lots): Village + col 4 × rows 0–2 (12–14) and the bottom row (15–19).
const HOME_CITY: AuthoredTownMap = {
  groundTiles: homeGround(20),
  plaza: HOME_PLAZA,
  well: HOME_WELL,
  boards: [HOME_FARM_BOARD],
  props: [
    ...HOME_PROPS_BASE,
    { kind: "lamppost", x: 565, y: 360 },
    { kind: "planter", x: 370, y: 680 },
    { kind: "signpost", x: 695, y: 360 },
    { kind: "lamppost", x: 435, y: 760 },
  ],
  lots: [
    lot(0, 0, 0), lot(1, 1, 0), lot(6, 2, 0), lot(7, 3, 0), lot(12, 4, 0),
    lot(2, 0, 1), lot(3, 1, 1), lot(8, 2, 1), lot(9, 3, 1), lot(13, 4, 1),
    lot(4, 0, 2), lot(5, 1, 2), lot(10, 2, 2), lot(11, 3, 2), lot(14, 4, 2),
    lot(15, 0, 3), lot(16, 1, 3), lot(17, 2, 3), lot(18, 3, 3), lot(19, 4, 3),
  ],
};

// ── Town 2 — quarry (mine) ladder ───────────────────────────────────────────
// A mining settlement on a dug-out yard, growing 4 → 6 → 8 → 12. Indices stable
// across rungs. Mine board on the right (drawBoards scatters ore/rock on it).
const Q_LOT_W = 118;
const Q_LOT_H = 106;
const QUARRY_COLS = [160, 310, 460, 610];
const QUARRY_ROWS = [310, 480, 650];
const qlot = (index: number, col: number, row: number): AuthoredLot => ({
  index,
  cx: QUARRY_COLS[col],
  cy: QUARRY_ROWS[row],
  w: Q_LOT_W,
  h: Q_LOT_H,
});
const QUARRY_MINE_BOARD: AuthoredBoard = { kind: "mine", cx: 1010, cy: 470, w: 380, h: 520 };
const QUARRY_PLAZA = { cx: 330, cy: 130, rx: px(4), ry: px(2) };
const QUARRY_WELL = { cx: 330, cy: 130, r: 18 };

function quarryGround(seed: number): Grid {
  const g = blankGrid(GRASS);
  const m = blankMask(ROWS, COLS);
  maskDisc(m, 10, 4, 4, 2);          // small plaza by the well
  maskBandV(m, 2, 28, 23, 2);        // spine to the mine board
  maskBandH(m, 3, 37, 5, 2);         // top road across to the board
  maskRect(m, 4, 8, 18, 14);         // the excavated quarry yard the lots sit on
  maskRect(m, 23, 13, 3, 3);         // apron onto the mine board
  paintSandPaths(g, m);              // autotiled sand: the yard gets a soft pit edge
  decorateGrass(g, seed);
  return g;
}

const QUARRY_PROPS: AuthoredProp[] = [
  { kind: "signpost", x: 430, y: 145 },
  { kind: "lamppost", x: 110, y: 400 },
];

// Dig Site (4): cols 0–1 × rows 0–1.
const QUARRY_DIG: AuthoredTownMap = {
  groundTiles: quarryGround(4),
  plaza: QUARRY_PLAZA,
  well: QUARRY_WELL,
  boards: [QUARRY_MINE_BOARD],
  props: QUARRY_PROPS,
  lots: [qlot(0, 0, 0), qlot(1, 1, 0), qlot(2, 0, 1), qlot(3, 1, 1)],
};

// Mining Camp (6): + cols 0–1 × row 2 (indices 4–5).
const QUARRY_CAMP: AuthoredTownMap = {
  groundTiles: quarryGround(6),
  plaza: QUARRY_PLAZA,
  well: QUARRY_WELL,
  boards: [QUARRY_MINE_BOARD],
  props: QUARRY_PROPS,
  lots: [
    qlot(0, 0, 0), qlot(1, 1, 0),
    qlot(2, 0, 1), qlot(3, 1, 1),
    qlot(4, 0, 2), qlot(5, 1, 2),
  ],
};

// Boomtown (8): + col 2 × rows 0–1 (indices 6–7).
const QUARRY_BOOM: AuthoredTownMap = {
  groundTiles: quarryGround(8),
  plaza: QUARRY_PLAZA,
  well: QUARRY_WELL,
  boards: [QUARRY_MINE_BOARD],
  props: [...QUARRY_PROPS, { kind: "lamppost", x: 460, y: 400 }],
  lots: [
    qlot(0, 0, 0), qlot(1, 1, 0), qlot(6, 2, 0),
    qlot(2, 0, 1), qlot(3, 1, 1), qlot(7, 2, 1),
    qlot(4, 0, 2), qlot(5, 1, 2),
  ],
};

// Foundry City (12): + col 2 row 2 and col 3 × rows 0–2 (indices 8–11).
const QUARRY_FOUNDRY: AuthoredTownMap = {
  groundTiles: quarryGround(12),
  plaza: QUARRY_PLAZA,
  well: QUARRY_WELL,
  boards: [QUARRY_MINE_BOARD],
  props: [...QUARRY_PROPS, { kind: "lamppost", x: 460, y: 400 }, { kind: "signpost", x: 690, y: 280 }],
  lots: [
    qlot(0, 0, 0), qlot(1, 1, 0), qlot(6, 2, 0), qlot(9, 3, 0),
    qlot(2, 0, 1), qlot(3, 1, 1), qlot(7, 2, 1), qlot(10, 3, 1),
    qlot(4, 0, 2), qlot(5, 1, 2), qlot(8, 2, 2), qlot(11, 3, 2),
  ],
};

// ── Registry — keyed by zoneId, indexed by tier ─────────────────────────────
// Zones/tiers with no entry fall back to the procedural town plan.
export const TOWN_MAPS: Record<string, AuthoredTownMap[]> = {
  home: [HOME_HAMLET, HOME_VILLAGE, HOME_CITY],
  quarry: [QUARRY_DIG, QUARRY_CAMP, QUARRY_BOOM, QUARRY_FOUNDRY],
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
