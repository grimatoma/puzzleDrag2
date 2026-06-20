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
// Both ladders are PC2's uniform 6-rung shape (home = Camp→Manor; quarry uses
// mine-themed rung names). Layouts here are functional placeholders — correct
// lot counts/positions on a plain street grid; organic-growth art is a later
// polish pass (see docs/town-layout/index.html + the growing-settlement-layout
// skill).
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

// ── Town 1 — home (Hearthwood Vale) ladder · 4 rungs (Outpost→City) ──────────
// Ported from docs/town-layout/index.html (the roads-first "growing outpost →
// city" mockup) via the growing-settlement-layout skill: a forest clearing on a
// river that grows a single dirt main street into a bridged little city. Lots are
// laid roads-first — each building FRONTS a street at a fixed setback — and the
// 20 stable-additive lot positions slice cleanly at the 3 → 6 → 12 → 20 rung
// cutpoints, so a placed building never moves as the town grows (lot index i
// always sits at HOME_LOTS[i]). River, forest, cobble and the lived-in dressing
// are a later art pass (see the doc + the skill); this port carries the layout +
// the autotiled dirt road network, which grows ONE new route per rung.
//
// `[index, cx, cy, w, h]` (px, 1280×960 design space) is the verbatim resolved
// output of the mockup's SPEC frontage solver, ordered by index so `slice(0,
// plots)` yields each rung. Footprints vary per lot to kill the spreadsheet read.
const HOME_LOTS: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [0, 451, 384, 128, 100], [1, 797, 390, 132, 96], [2, 298, 560, 100, 104],          // Outpost (0–2)
  [3, 439, 552, 92, 100], [4, 318, 374, 112, 108], [5, 967, 387, 134, 98],           // Hamlet  (3–5)
  [6, 160, 373, 92, 118], [7, 1111, 381, 132, 114], [8, 356, 209, 104, 110],
  [9, 544, 210, 96, 124], [10, 769, 216, 134, 100], [11, 990, 216, 114, 112],        // Village (6–11)
  [12, 1051, 557, 104, 106], [13, 1182, 559, 92, 98], [14, 1130, 150, 116, 104],
  [15, 288, 689, 110, 102], [16, 427, 679, 96, 106], [17, 604, 690, 134, 96],
  [18, 1056, 688, 108, 104], [19, 1193, 680, 100, 104],                              // City    (12–19)
];
const hlot = (i: number): AuthoredLot => {
  const [index, cx, cy, w, h] = HOME_LOTS[i];
  return { index, cx, cy, w, h };
};
// Total plots at each rung (must equal the matching tiers[].plots in data.ts).
const HOME_PLOTS = [3, 6, 12, 20];

// Farm parcel: the doc's fenced FIELD off the plaza, reached by the short farm
// lane dropping south from the main street (no road runs under it).
const HOME_FARM_BOARD: AuthoredBoard = { kind: "farm", cx: 816, cy: 656, w: 224, h: 160 };
const HOME_PLAZA = { cx: 640, cy: 470, rx: 88, ry: 78 };
const HOME_WELL = { cx: 640, cy: 470, r: 20 };

// Road network in TILE units (the doc's pixel ROADS ÷32), tagged by the rung that
// OPENS each route. Growth is a new route per rung, never a wider grid: Outpost
// lays the main street + farm lane; Hamlet pushes the street E & W into the woods;
// Village extends the spine and opens the north back lane + its connector; City
// knits blocks with the south back lane, two cross-connectors and a spur into the
// NE woods. Main streets are ≥3 wide so a two-sided autotile border fits.
type HomeRoad =
  | { axis: "H"; row: number; x1: number; x2: number; thick: number; tier: number }
  | { axis: "V"; col: number; y1: number; y2: number; thick: number; tier: number };
const HOME_ROADS: HomeRoad[] = [
  { axis: "H", row: 15, x1: 13, x2: 27, thick: 3, tier: 0 }, // HS0 — main street
  { axis: "V", col: 26, y1: 15, y2: 18, thick: 2, tier: 0 }, // FL  — farm lane to the field
  { axis: "H", row: 15, x1: 8, x2: 13, thick: 3, tier: 1 },  // HS1w — push west
  { axis: "H", row: 15, x1: 27, x2: 32, thick: 3, tier: 1 }, // HS1e — push east
  { axis: "H", row: 15, x1: 3, x2: 8, thick: 3, tier: 2 },   // HS2w
  { axis: "H", row: 15, x1: 0, x2: 3, thick: 2, tier: 2 },   // HS3w — west lane stub
  { axis: "H", row: 15, x1: 32, x2: 36, thick: 3, tier: 2 }, // HS2e
  { axis: "H", row: 9, x1: 8, x2: 39, thick: 2, tier: 2 },   // NBL — north back lane
  { axis: "V", col: 18, y1: 9, y2: 14, thick: 2, tier: 2 },  // NS  — connector to the spine
  { axis: "H", row: 24, x1: 5, x2: 39, thick: 2, tier: 3 },  // SBL — south back lane
  { axis: "V", col: 18, y1: 15, y2: 24, thick: 2, tier: 3 }, // CN_w  — west cross-connector
  { axis: "V", col: 31, y1: 15, y2: 24, thick: 2, tier: 3 }, // CN_e  — east cross-connector
  { axis: "V", col: 28, y1: 9, y2: 14, thick: 2, tier: 3 },  // CN_ne — north-east connector
  { axis: "V", col: 35, y1: 5, y2: 9, thick: 2, tier: 3 },   // RID — spur into the NE woods (lot 14)
];

function paintHomeRoads(m: boolean[][], tier: number): void {
  for (const r of HOME_ROADS) {
    if (r.tier > tier) continue;
    if (r.axis === "H") maskBandH(m, r.x1, r.x2, r.row, r.thick);
    else maskBandV(m, r.y1, r.y2, r.col, r.thick);
  }
}

/**
 * Paint one home rung's ground. The plaza + the roads opened so far are described
 * as a single boolean MASK (where dirt goes), then AUTOTILED into the grass↔sand
 * blob so every boundary gets a soft rounded transition instead of a hard DIRT
 * seam (see `roadAutotile.ts`). The network visibly grows as `tier` rises.
 */
function homeGround(tier: number): Grid {
  const g = blankGrid(GRASS);
  const m = blankMask(ROWS, COLS);
  maskDisc(m, 20, 15, 3, 2);     // town-green plaza around the well (centre of the main street)
  paintHomeRoads(m, tier);       // grow the dirt road network one route per rung
  maskRect(m, 24, 18, 4, 2);     // apron where the farm lane meets the fenced field
  paintSandPaths(g, m);          // overlay autotiled grass↔dirt transitions
  decorateGrass(g, tier);        // sprinkle variants on the remaining grass
  return g;
}

const HOME_PROPS_BASE: AuthoredProp[] = [
  { kind: "signpost", x: 706, y: 512 },
  { kind: "lamppost", x: 578, y: 512 },
];

/** Build one home rung map: ground grown to `tier` + the first `plots` stable lots. */
function homeRung(tier: number): AuthoredTownMap {
  const plots = HOME_PLOTS[tier];
  return {
    groundTiles: homeGround(tier),
    plaza: HOME_PLAZA,
    well: HOME_WELL,
    boards: [HOME_FARM_BOARD],
    props: HOME_PROPS_BASE,
    lots: HOME_LOTS.slice(0, plots).map(([index]) => hlot(index)),
  };
}
const HOME_MAPS: AuthoredTownMap[] = HOME_PLOTS.map((_p, tier) => homeRung(tier));

// ── Town 2 — quarry (mine) ladder · 6 rungs (mine-themed) ────────────────────
// A mining settlement growing 2 → 4 → 6 → 8 → 10 → 12 lots on a 4-col × 3-row
// grid. Indices stable across rungs. Mine board on the right.
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

const QUARRY_LOT_POS: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [1, 0],                 // Dig Site      (0–1)
  [0, 1], [1, 1],                 // Prospect Camp (2–3)
  [2, 0], [2, 1],                 // Mining Camp   (4–5)
  [0, 2], [1, 2],                 // Boomtown      (6–7)
  [2, 2], [3, 0],                 // Smeltworks    (8–9)
  [3, 1], [3, 2],                 // Foundry City  (10–11)
];
const QUARRY_PLOTS = [2, 4, 6, 8, 10, 12];

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

/** Build one quarry rung map: ground + the first `plots` stable lots. */
function quarryRung(plots: number): AuthoredTownMap {
  return {
    groundTiles: quarryGround(plots),
    plaza: QUARRY_PLAZA,
    well: QUARRY_WELL,
    boards: [QUARRY_MINE_BOARD],
    props: QUARRY_PROPS,
    lots: QUARRY_LOT_POS.slice(0, plots).map(([c, r], i) => qlot(i, c, r)),
  };
}
const QUARRY_MAPS: AuthoredTownMap[] = QUARRY_PLOTS.map(quarryRung);

// ── Mirefen Hollow — mirefen (fish) ladder · 4 rungs (3/6/10/15) ─────────────
// Ported from docs/zones/data/layouts/mirefen.mjs through `resolveLots()`: a
// ribbon-stilt town whose boardwalks ARE the roads, growing east/west/north
// along the spine then dipping into the south lagoon. The lot list below is the
// verbatim `resolveLots(mirefen)` output (index,cx,cy,w,h), ordered by index so
// `slice(0, plots)` yields each rung (the design's per-lot `t` tier tag is
// cumulative, exactly the stable-additive contract). Ground is a placeholder:
// grass + an autotiled sand boardwalk network mirroring the design's roads[]
// (px→tiles ÷32) — themed water terrain is a later art pass.
const MIREFEN_PLOTS = [3, 6, 10, 15];
// index → [index, cx, cy, w, h] straight from resolveLots(mirefen).
const MIREFEN_LOTS: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [0, 416, 398, 120, 100], [1, 697, 402, 112, 96], [2, 758, 566, 124, 104],   // Fishing Stilt (0–2)
  [3, 279, 398, 108, 100], [4, 330, 558, 120, 96], [5, 845, 394, 116, 104],   // Bogwalk Hamlet (3–5)
  [6, 152, 399, 110, 98], [7, 363, 221, 120, 100], [8, 624, 221, 104, 104], [9, 836, 221, 114, 96], // Mire Village (6–9)
  [10, 982, 398, 110, 100], [11, 1106, 396, 118, 100], [12, 1044, 559, 112, 98], [13, 457, 600, 108, 104], [14, 624, 601, 114, 100], // Fen Town (10–14)
];
const mlot = (i: number): AuthoredLot => {
  const [index, cx, cy, w, h] = MIREFEN_LOTS[i];
  return { index, cx, cy, w, h };
};

// Fishing board: the open south lagoon (the design's two pools), well clear of
// every lot (lots end at y≈652) and the south branch boardwalk.
const MIREFEN_FISH_BOARD: AuthoredBoard = { kind: "fish", cx: 640, cy: 830, w: 860, h: 220 };
const MIREFEN_PLAZA = { cx: 570, cy: 392, rx: px(3), ry: px(2) }; // staged reed-shrine → Heron Gate beacon
const MIREFEN_WELL = { cx: 570, cy: 392, r: 20 };

function mirefenGround(seed: number): Grid {
  const g = blankGrid(GRASS);
  const m = blankMask(ROWS, COLS);
  maskBandH(m, 3, 35, 15, 3);   // the spine boardwalk (HS0/HS1/HS2/HS3 — one run, row 15)
  maskBandH(m, 8, 29, 9, 2);    // north back lane (NBL, row 9)
  maskBandV(m, 9, 15, 16, 2);   // connector to the spine (NC, col 16)
  maskBandV(m, 15, 21, 17, 2);  // south branch into the lagoon (SB, col 17)
  maskDisc(m, 18, 12, 3, 2);    // central platform / reed-shrine plaza (the landmark)
  paintSandPaths(g, m);         // overlay autotiled sand transitions
  decorateGrass(g, seed);       // sprinkle variants on the remaining grass
  return g;
}

const MIREFEN_PROPS: AuthoredProp[] = [
  { kind: "signpost", x: 120, y: 430 },
  { kind: "lamppost", x: 560, y: 360 },
];

/** Build one mirefen rung map: ground + the first `plots` stable lots. */
function mirefenRung(plots: number): AuthoredTownMap {
  return {
    groundTiles: mirefenGround(plots),
    plaza: MIREFEN_PLAZA,
    well: MIREFEN_WELL,
    boards: [MIREFEN_FISH_BOARD],
    props: MIREFEN_PROPS,
    lots: MIREFEN_LOTS.slice(0, plots).map(([index]) => mlot(index)),
  };
}
const MIREFEN_MAPS: AuthoredTownMap[] = MIREFEN_PLOTS.map(mirefenRung);

// ── Registry — keyed by zoneId, indexed by tier ─────────────────────────────
// Zones/tiers with no entry fall back to the procedural town plan.
export const TOWN_MAPS: Record<string, AuthoredTownMap[]> = {
  home: HOME_MAPS,
  quarry: QUARRY_MAPS,
  mirefen: MIREFEN_MAPS,
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
