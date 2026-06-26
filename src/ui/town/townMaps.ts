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
// polish pass (see reference/docs/town-layout/index.html + the growing-settlement-layout
// skill).
//
// Ground uses the same Tuxemon tileset indices `TownScene` references.
import type { TownPlan } from "./TownScene.js";
import { blankMask, maskBandH, maskBandV, maskDisc, maskRect, paintSandPaths } from "./roadAutotile.js";
import type { GroundSpec, GroundRoad, GroundMaterial } from "./proceduralGround.js";

// Design space — must match TownScene's grid (40×30 @ 32px → 1280×960).
const TILE = 32;
const COLS = 40;
const ROWS = 30;
const DESIGN_W = COLS * TILE; // 1280
const DESIGN_H = ROWS * TILE; // 960

// ── Tileset indices (mirror of the private `T` in TownScene.ts; appendix of
// reference/docs/archive/zone-tier-ladder.html). Authors may also write -1 for a blank cell.
// Clean flat fills — NOT 26/35 or the 50/51/… "variants", which each carry a
// baked dark fleck / sand patch and tile into a regular grid of smudges. See the
// `T` table in TownScene.ts. 125 = clean grass; sand fill is the autotiler's blob
// centre (roadAutotile SAND.fill).
const GRASS = 125;
const GRASS_ALT = [126, 189];
const GRASS_FLOWER = [120, 121];
const WATER = 250; // deep solid water (mirrors TownScene's T.WATER)
const DIRT = 173;  // clean tan path / bridge-deck / dock plank (sand-blob centre)

/** Deterministic mulberry32 RNG (shared by the forest scatter). */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Distance from (px,py) to segment (ax,ay)-(bx,by). */
function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

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
export interface AuthoredTree { x: number; y: number; r: number; cluster: number; species?: string }

export interface AuthoredTownMap {
  groundTiles: Grid;
  lots: AuthoredLot[];
  boards?: AuthoredBoard[];
  props?: AuthoredProp[];
  /** Forest scatter (the town is a clearing in the woods); rendered by TownScene.drawTrees. */
  trees?: AuthoredTree[];
  /**
   * Hand-rolled procedural ground (SDF terrain). When present, TownScene bakes it
   * into a resolution-scalable texture and uses it instead of `groundTiles` (which
   * remains as a flat-tile fallback). See `proceduralGround.ts`.
   */
  groundSpec?: GroundSpec;
  plaza?: { cx: number; cy: number; rx: number; ry: number };
  well?: { cx: number; cy: number; r: number };
}

// ── Town 1 — home (Hearthwood Vale) ladder · 4 rungs (Outpost→City) ──────────
// Ported from reference/docs/town-layout/index.html (the roads-first "growing outpost →
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
// Lots are grouped into clean FRONTAGE ROWS: every lot on a street-side shares a
// constant setback + uniform height, so the building bases (baseY = cy + h/2)
// line up into a tidy row; only the width varies for interest. Front rows:
//   main-street north  cy 385   ·  main-street south  cy 555
//   north back lane    cy 219   ·  south back lane    cy 687   ·  ridge lane (lot 14)
const HOME_LOTS: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [0, 455, 385, 128, 104], [1, 800, 385, 132, 104], [2, 300, 555, 104, 104],         // Outpost (0–2)
  [3, 440, 555, 96, 104], [4, 318, 385, 112, 104], [5, 966, 385, 120, 104],          // Hamlet  (3–5)
  [6, 178, 385, 100, 104], [7, 1110, 385, 128, 104], [8, 356, 219, 108, 104],
  [9, 548, 219, 100, 104], [10, 770, 219, 128, 104], [11, 990, 219, 114, 104],        // Village (6–11)
  [12, 1050, 555, 108, 104], [13, 1182, 555, 96, 104], [14, 1128, 168, 116, 104],
  [15, 300, 687, 110, 104], [16, 446, 687, 100, 104], [17, 612, 687, 128, 104],
  [18, 1056, 687, 108, 104], [19, 1192, 687, 100, 104],                              // City    (12–19)
];
const hlot = (i: number): AuthoredLot => {
  const [index, cx, cy, w, h] = HOME_LOTS[i];
  return { index, cx, cy, w, h };
};
// Total plots at each rung (must equal the matching tiers[].plots in data.ts).
// Zones-1&2 scope: ceiling trimmed 3/6/12/20 → 3/6/9/12 (each rung slices the first
// N stable lots from HOME_LOTS; lots 12–19 are now unused but kept for a future re-open).
const HOME_PLOTS = [3, 6, 9, 12];

// Farm parcel: the doc's fenced FIELD off the plaza, reached by the short farm
// lane dropping south from the main street (no road runs under it).
const HOME_FARM_BOARD: AuthoredBoard = { kind: "farm", cx: 816, cy: 656, w: 224, h: 160 };
const HOME_PLAZA = { cx: 640, cy: 470, rx: 88, ry: 78 };
const HOME_WELL = { cx: 640, cy: 470, r: 20 };

// River + pond (the doc's RIVER / POND / BRIDGES / DOCK, px). The river wraps the
// settlement's west and south edges — "a reason and a pulse" — and the main
// street/back lane bridge it. The pond sits in the NW forest. Water is baked into
// `groundTiles`: grass → autotiled sand shore → solid water, with bridge decks
// and a plank dock laid back over the water.
const HOME_RIVER: ReadonlyArray<readonly [number, number]> = [
  [150, -10], [120, 150], [95, 330], [100, 470], [120, 620], [180, 760], [360, 842], [640, 872], [980, 892], [1290, 918],
];
const RIVER_HALF = 30; // px — water-core half-width
const RIVER_BANK = 20; // px — extra sand shore beyond the water
const HOME_POND = { cx: 110, cy: 105, rx: 78, ry: 64 };
// Bridge decks, tagged by the rung that lays the road which crosses there.
const HOME_BRIDGES: ReadonlyArray<{ x: number; y: number; tier: number }> = [
  { x: 100, y: 470, tier: 2 }, // main street bridges the west river (Village)
  { x: 190, y: 766, tier: 3 }, // south back lane bridges the SW river (City)
];
const HOME_DOCK = { x: 520, y0: 812, y1: 884, tier: 2 }; // plank fishing dock into the south water

function homeRiverDist(px: number, py: number): number {
  let d = 1e9;
  for (let i = 0; i < HOME_RIVER.length - 1; i++) {
    const a = HOME_RIVER[i], b = HOME_RIVER[i + 1];
    d = Math.min(d, distToSeg(px, py, a[0], a[1], b[0], b[1]));
  }
  return d;
}
function inHomePond(px: number, py: number, pad = 0): boolean {
  return ((px - HOME_POND.cx) / (HOME_POND.rx + pad)) ** 2 + ((py - HOME_POND.cy) / (HOME_POND.ry + pad)) ** 2 <= 1;
}
function inHomeWater(px: number, py: number): boolean {
  return homeRiverDist(px, py) <= RIVER_HALF || inHomePond(px, py);
}

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
 * Paint one home rung's ground. The plaza + the roads opened so far + the river's
 * sand shore are described as a single boolean MASK (where sand goes), then
 * AUTOTILED into the grass↔sand blob so every boundary gets a soft rounded
 * transition (see `roadAutotile.ts`). The water core is then carved over the sand
 * shore, and bridge decks + the dock are laid back over the water. The road
 * network + the river crossings visibly grow as `tier` rises.
 */
function homeGround(tier: number): Grid {
  const g = blankGrid(GRASS);
  const m = blankMask(ROWS, COLS);
  maskDisc(m, 20, 15, 3, 2);     // town-green plaza around the well (centre of the main street)
  paintHomeRoads(m, tier);       // grow the dirt road network one route per rung
  maskRect(m, 24, 18, 4, 2);     // apron where the farm lane meets the fenced field
  // Sand shore: mask every tile near the river/pond so grass → sand → water reads soft.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cx = x * TILE + TILE / 2, cy = y * TILE + TILE / 2;
      if (homeRiverDist(cx, cy) <= RIVER_HALF + RIVER_BANK || inHomePond(cx, cy, RIVER_BANK)) m[y][x] = true;
    }
  }
  paintSandPaths(g, m);          // overlay autotiled grass↔sand transitions (roads + shore)
  // Carve the water core over the shore.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cx = x * TILE + TILE / 2, cy = y * TILE + TILE / 2;
      if (inHomeWater(cx, cy)) g[y][x] = WATER;
    }
  }
  // Bridge decks reconnect the roads across the river (dirt laid back over water).
  for (const b of HOME_BRIDGES) {
    if (b.tier > tier) continue;
    const bx = Math.round(b.x / TILE), by = Math.round(b.y / TILE);
    for (let ox = -2; ox <= 2; ox++)
      for (let oy = -1; oy <= 1; oy++) {
        const xx = bx + ox, yy = by + oy;
        if (yy >= 0 && yy < ROWS && xx >= 0 && xx < COLS) g[yy][xx] = DIRT;
      }
  }
  // Plank fishing dock reaching into the south water (opens with the Village).
  if (HOME_DOCK.tier <= tier) {
    const dx = Math.round(HOME_DOCK.x / TILE);
    for (let py = HOME_DOCK.y0; py <= HOME_DOCK.y1; py += TILE) {
      const yy = Math.round(py / TILE);
      if (yy >= 0 && yy < ROWS && dx >= 0 && dx < COLS) g[yy][dx] = DIRT;
    }
  }
  decorateGrass(g, tier);        // sprinkle variants on the remaining grass
  return g;
}

// ── Forest: the town is a clearing in the woods, and the clearing GROWS each rung
// (receding forest = the progress bar). Trees fill every tile that isn't water,
// road frontage, a lot, the plaza, the farm field, or the central clearing. The
// clear test is monotonic in `tier` (roads + lots only ever grow), so forest only
// ever recedes — it never re-wilds.
function homeCleared(px: number, py: number, tier: number): boolean {
  if (((px - 660) / 250) ** 2 + ((py - 520) / 210) ** 2 <= 1) return true; // central clearing
  if (((px - HOME_PLAZA.cx) / (HOME_PLAZA.rx + 24)) ** 2 + ((py - HOME_PLAZA.cy) / (HOME_PLAZA.ry + 24)) ** 2 <= 1) return true;
  const f = HOME_FARM_BOARD;
  if (px > f.cx - f.w / 2 - 24 && px < f.cx + f.w / 2 + 24 && py > f.cy - f.h / 2 - 24 && py < f.cy + f.h / 2 + 24) return true;
  for (let i = 0; i < HOME_PLOTS[tier]; i++) {
    const [, lx, ly, lw, lh] = HOME_LOTS[i];
    if (Math.abs(px - lx) < lw / 2 + 18 && Math.abs(py - ly) < lh / 2 + 18) return true;
  }
  for (const r of HOME_ROADS) {
    if (r.tier > tier) continue;
    const pad = r.thick * TILE / 2 + 74;
    let d: number;
    if (r.axis === "H") {
      const ry = r.row * TILE + TILE / 2;
      d = distToSeg(px, py, Math.min(r.x1, r.x2) * TILE, ry, Math.max(r.x1, r.x2) * TILE, ry);
    } else {
      const rx = r.col * TILE + TILE / 2;
      d = distToSeg(px, py, rx, Math.min(r.y1, r.y2) * TILE, rx, Math.max(r.y1, r.y2) * TILE);
    }
    if (d <= pad) return true;
  }
  return false;
}

// Species per tree for natural groves: willows hug the water, conifers and
// broadleaves cluster by macro-group so a stand reads as one kind, not confetti.
function homeTreeSpecies(x: number, y: number, pine: boolean, c: number): string {
  if (homeRiverDist(x, y) <= RIVER_HALF + 70 || inHomePond(x, y, 70)) {
    return c % 3 === 0 ? "tree_willow" : pine ? "tree_fir" : "tree_oak";
  }
  if (pine) return c % 2 ? "tree_fir" : "tree_cypress";
  return c % 2 ? "tree_oak" : "tree_birch";
}

function homeTrees(tier: number): AuthoredTree[] {
  const rnd = makeRng(0x5eed01);
  const out: AuthoredTree[] = [];
  for (let c = 0; c < 58; c++) {
    const cqx = rnd() * DESIGN_W, cqy = rnd() * DESIGN_H, base = rnd() < 0.5;
    const n = 4 + Math.floor(rnd() * 9);
    for (let k = 0; k < n; k++) {
      const a = rnd() * 6.2832, rad = rnd() * rnd() * 78;
      const x = cqx + Math.cos(a) * rad, y = cqy + Math.sin(a) * rad;
      const pine = rnd() < 0.5 ? !base : base; // draw is consumed regardless so positions stay stable across rungs
      const r = 15 + rnd() * 8;
      if (x < 10 || x > DESIGN_W - 10 || y < 10 || y > DESIGN_H - 10) continue;
      if (inHomeWater(x, y) || homeCleared(x, y, tier)) continue;
      out.push({ x, y, r, cluster: pine ? 0 : 1, species: homeTreeSpecies(x, y, pine, c) });
      if (out.length >= 240) return out;
    }
  }
  return out;
}

/** Place `n` props of `kind` evenly along a segment (inclusive of both ends). */
function lineProps(out: AuthoredProp[], kind: string, x1: number, y1: number, x2: number, y2: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    out.push({ kind, x: Math.round(x1 + (x2 - x1) * t), y: Math.round(y1 + (y2 - y1) * t) });
  }
}

// Street lamps DERIVED from the road geometry so they always hug the pavement and
// line up, instead of floating at hand-typed coordinates. Each lit street is a
// horizontal centre-line (main street + the two back lanes) grown to `tier`; we walk
// it at a fixed spacing and drop a lamp on each verge, just outside the pavement
// (offset = road half-width + a small margin, landing in the grass strip between the
// kerb and the building frontage). The two sides are staggered half a span for the
// classic alternating-streetlamp read, and any lamp that would fall in the river is
// culled.
interface LampLine { y: number; x1: number; x2: number; half: number }
function homeLampLines(tier: number): LampLine[] {
  const lines: LampLine[] = [];
  const mains = HOME_SPEC_ROADS.filter((r) => r.role === "main" && r.tier <= tier);
  if (mains.length) {
    let x1 = Infinity, x2 = -Infinity;
    for (const r of mains) { x1 = Math.min(x1, r.seg[0], r.seg[2]); x2 = Math.max(x2, r.seg[0], r.seg[2]); }
    lines.push({ y: 470, x1, x2, half: 17 });        // main street (full open extent)
  }
  if (tier >= 2) lines.push({ y: 300, x1: 240, x2: 1240, half: 13 }); // north back lane
  if (tier >= 3) lines.push({ y: 768, x1: 255, x2: 1180, half: 13 }); // south back lane
  return lines;
}
function addStreetLamps(out: AuthoredProp[], tier: number): void {
  const SPACING = 178, MARGIN = 9, END_INSET = 26;
  for (const ln of homeLampLines(tier)) {
    const off = ln.half + MARGIN;
    const span = ln.x2 - ln.x1;
    const n = Math.max(1, Math.round(span / SPACING));
    for (let side = 0; side < 2; side++) {
      const y = ln.y + (side ? off : -off);
      const stagger = side ? span / n / 2 : 0;
      for (let i = 0; i <= n; i++) {
        const x = ln.x1 + span * (i / n) + stagger;
        if (x < ln.x1 + END_INSET || x > ln.x2 - END_INSET) continue;
        if (inHomeWater(x, y)) continue;
        out.push({ kind: "lamppost", x: Math.round(x), y: Math.round(y) });
      }
    }
  }
}

// Lived-in dressing, grown per rung and kept clear of lots/roads/boards/water. The
// reference's life comes from this layering: a market square, lamps down the paved
// street, fenced farm, construction clutter on the margins, and a living waterside.
function homeProps(tier: number): AuthoredProp[] {
  const out: AuthoredProp[] = [];
  // Plaza approach signage (every rung) + lamps lining every open street.
  out.push({ kind: "signpost", x: 706, y: 512 });
  addStreetLamps(out, tier);

  if (tier >= 1) {
    // Market square wakes up: a striped stall, a bench, planters flanking the well.
    out.push({ kind: "market_stall", x: 500, y: 466 });
    out.push({ kind: "bench", x: 760, y: 466 });
    out.push({ kind: "planter", x: 452, y: 452 }, { kind: "planter", x: 828, y: 452 });
    out.push({ kind: "barrel", x: 548, y: 430 }, { kind: "crate", x: 590, y: 432 });
    // First construction clutter on the open south margin.
    out.push({ kind: "log_pile", x: 360, y: 632 }, { kind: "plank_stack", x: 470, y: 636 });
    // Waterside life along the west river bank + pond.
    out.push({ kind: "cattail", x: 152, y: 300 }, { kind: "cattail", x: 168, y: 372 });
    out.push({ kind: "water_lily", x: 110, y: 104 }, { kind: "water_lily", x: 92, y: 128 });
  }

  if (tier >= 2) {
    // Cobbled square fills in: a second stall, planters, a hanging lantern at the sign.
    out.push({ kind: "market_stall", x: 820, y: 466 });
    out.push({ kind: "flower_pot", x: 600, y: 500 }, { kind: "flower_pot", x: 690, y: 500 });
    out.push({ kind: "lantern", x: 706, y: 438 });
    // Fenced farm field (perimeter pickets) + hay/sacks at the gate.
    lineProps(out, "picket_fence", 712, 580, 920, 580, 6);   // north fence
    lineProps(out, "picket_fence", 712, 732, 920, 732, 6);   // south fence
    out.push({ kind: "hay_bale", x: 690, y: 690 }, { kind: "sacks", x: 700, y: 640 });
    // Boulders + hedges softening the clearing edge.
    out.push({ kind: "boulder", x: 250, y: 300 }, { kind: "rock_cluster", x: 1040, y: 360 });
    out.push({ kind: "hedge", x: 1110, y: 470 }, { kind: "berry_bush", x: 232, y: 470 });
    // The dock comes alive — rowboat + mooring posts + lilies on the south water.
    out.push({ kind: "rowboat", x: 500, y: 858 });
    out.push({ kind: "dock_post", x: 506, y: 815 }, { kind: "dock_post", x: 534, y: 815 });
    out.push({ kind: "water_lily", x: 580, y: 866 }, { kind: "water_lily", x: 632, y: 872 });
    out.push({ kind: "cattail", x: 360, y: 822 }, { kind: "cattail", x: 700, y: 856 });
  }

  if (tier >= 3) {
    // City: stone-block streets, a busy market + workshop clutter (lamps line every
    // street via addStreetLamps).
    out.push({ kind: "market_stall", x: 640, y: 320 });
    out.push({ kind: "bench", x: 560, y: 466 }, { kind: "bench", x: 720, y: 500 });
    out.push({ kind: "stone_pile", x: 1090, y: 700 }, { kind: "plank_stack", x: 1150, y: 690 });
    out.push({ kind: "sawhorse", x: 300, y: 700 }, { kind: "log_pile", x: 250, y: 712 });
    out.push({ kind: "boulder", x: 1200, y: 250 }, { kind: "berry_bush", x: 1180, y: 360 });
    out.push({ kind: "flower_pot", x: 470, y: 500 }, { kind: "flower_pot", x: 820, y: 500 });
  }

  return out;
}

// ── Procedural-ground spec — the doc's exact pixel geometry (1280×960). The SDF
// renderer (proceduralGround.ts) draws this as smooth terrain, so the road
// centre-lines + half-widths are the doc's real values (incl. the diagonal NE
// ridge lane, which an SDF renders for free). `tier` is the rung that opens each.
type RoadRole = "main" | "lane" | "farm";
const HOME_SPEC_ROADS: ReadonlyArray<{ seg: readonly [number, number, number, number]; half: number; tier: number; role: RoadRole }> = [
  { seg: [400, 470, 870, 470], half: 17, tier: 0, role: "main" },   // HS0 — main street
  { seg: [816, 487, 816, 576], half: 11, tier: 0, role: "farm" },   // FL  — farm lane
  { seg: [265, 470, 400, 470], half: 17, tier: 1, role: "main" },   // HS1w
  { seg: [870, 470, 1010, 470], half: 17, tier: 1, role: "main" },  // HS1e
  { seg: [80, 470, 265, 470], half: 17, tier: 2, role: "main" },    // HS2w
  { seg: [0, 470, 80, 470], half: 13, tier: 2, role: "lane" },      // HS3w
  { seg: [1010, 470, 1150, 470], half: 17, tier: 2, role: "main" }, // HS2e
  { seg: [240, 300, 1240, 300], half: 13, tier: 2, role: "lane" },  // NBL — north back lane
  { seg: [560, 300, 560, 453], half: 11, tier: 2, role: "lane" },   // NS  — connector
  { seg: [255, 768, 1280, 768], half: 13, tier: 3, role: "lane" },  // SBL — south back lane (stops clear of the SW river)
  { seg: [560, 487, 560, 768], half: 10, tier: 3, role: "lane" },   // CN_w
  { seg: [976, 487, 976, 768], half: 10, tier: 3, role: "lane" },   // CN_e
  { seg: [880, 300, 880, 453], half: 10, tier: 3, role: "lane" },   // CN_ne
  { seg: [1040, 300, 1226, 150], half: 11, tier: 3, role: "lane" }, // RID — diagonal ridge lane
];

// Reusable paving progression — the streets visibly "pave over" as the town tiers
// up: dirt outpost → packed-dirt hamlet → cobble village → crisp stone-block city.
// The farm lane stays gravel; back lanes lag the main street by a tier.
function homeRoadMaterial(role: RoadRole, tier: number): GroundMaterial {
  if (role === "farm") return "gravel";
  if (role === "main") return tier >= 3 ? "stone_block" : tier >= 2 ? "cobble" : tier >= 1 ? "packed_dirt" : "dirt";
  return tier >= 3 ? "cobble" : tier >= 1 ? "packed_dirt" : "dirt";
}

// Frontage paths — a short walkway from every building to the street it fronts, so
// the town reads as "clear roads with a path to each building" instead of houses
// marooned on grass. For each visible lot we drop a perpendicular onto the NEAREST
// open road centre-line (main streets are listed first, so the small frontage-row
// setback always wins the tie over a road on the building's back) and lay a narrow
// packed-dirt path from the lot centre to that foot. The inner half is hidden under
// the building sprite; the visible stretch runs from the building's base to the
// pavement. Paths inherit the stable lot indices, so they never move as the town
// grows. Half-width stays below the main roads' so the SDF lets the wider street win
// at the junction (material is picked by `dist − half`).
function homeFrontagePaths(tier: number): GroundRoad[] {
  const open = HOME_SPEC_ROADS.filter((r) => r.tier <= tier);
  const paths: GroundRoad[] = [];
  for (let i = 0; i < HOME_PLOTS[tier]; i++) {
    const [, cx, cy] = HOME_LOTS[i];
    let best = Infinity, fx = cx, fy = cy;
    for (const r of open) {
      const [x1, y1, x2, y2] = r.seg;
      const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy;
      let t = L ? ((cx - x1) * dx + (cy - y1) * dy) / L : 0;
      t = Math.max(0, Math.min(1, t));
      const fpx = x1 + dx * t, fpy = y1 + dy * t, d = Math.hypot(cx - fpx, cy - fpy);
      if (d < best - 0.5) { best = d; fx = fpx; fy = fpy; } // −0.5 epsilon → ties favour the fronting (earlier) street
    }
    paths.push({ x1: cx, y1: cy, x2: Math.round(fx), y2: Math.round(fy), half: 9, material: "packed_dirt" });
  }
  return paths;
}

/** Build the hand-rolled procedural-ground spec for a home rung. */
function homeGroundSpec(tier: number): GroundSpec {
  const roads: GroundRoad[] = [];
  for (const r of HOME_SPEC_ROADS) {
    if (r.tier > tier) continue;
    roads.push({ x1: r.seg[0], y1: r.seg[1], x2: r.seg[2], y2: r.seg[3], half: r.half, material: homeRoadMaterial(r.role, tier) });
  }
  roads.push(...homeFrontagePaths(tier)); // building → street walkways
  // One clean crossing on the main street, baked at the Village. The deck is
  // tilted ~5° so it sits square to the (slightly leaning) river, not rigidly
  // axis-aligned; planks run across the road and the long sides read as rails.
  const bridges = tier >= 2 ? [{ cx: 100, cy: 470, len: 96, wid: 46, angle: -0.09 }] : [];
  return {
    key: `home-t${tier}`,
    width: DESIGN_W,
    height: DESIGN_H,
    seed: 1337,
    river: { pts: HOME_RIVER, half: 27, bank: 22 },
    pond: { cx: HOME_POND.cx, cy: HOME_POND.cy, rx: HOME_POND.rx, ry: HOME_POND.ry, bank: 18 },
    roads,
    // Paved town square: a street-hugging lozenge in the open corridor BETWEEN the
    // north/south lot rows (never under a building), widening + upgrading to crisp
    // stone block at City to match the reference's neat paved square.
    cobble: tier >= 2 ? [{ cx: HOME_PLAZA.cx, cy: HOME_PLAZA.cy, rx: tier >= 3 ? 232 : 196, ry: 33, material: tier >= 3 ? "stone_block" : "flagstone" as GroundMaterial }] : [],
    field: { cx: HOME_FARM_BOARD.cx, cy: HOME_FARM_BOARD.cy, w: HOME_FARM_BOARD.w, h: HOME_FARM_BOARD.h },
    bridges,
    dock: HOME_DOCK.tier <= tier ? { x: HOME_DOCK.x, y0: HOME_DOCK.y0, y1: HOME_DOCK.y1, half: 13 } : null,
  };
}

/** Build one home rung map: ground grown to `tier` + the first `plots` stable lots. */
function homeRung(tier: number): AuthoredTownMap {
  const plots = HOME_PLOTS[tier];
  return {
    groundTiles: homeGround(tier), // flat-tile fallback if procedural baking is unavailable
    groundSpec: homeGroundSpec(tier),
    plaza: HOME_PLAZA,
    well: HOME_WELL,
    boards: [HOME_FARM_BOARD],
    props: homeProps(tier),
    trees: homeTrees(tier),
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
// Ported from reference/docs/zones/data/layouts/mirefen.mjs through `resolveLots()`: a
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
    groundSpec: m.groundSpec,
    plaza,
    well: m.well ?? { cx: plaza.cx, cy: plaza.cy, r: 18 },
    lots: m.lots.map((l) => ({ index: l.index, cx: l.cx, cy: l.cy, w: l.w, h: l.h, row: "" })),
    boards: m.boards ? m.boards.map((b) => ({ ...b })) : [],
    props: m.props ? m.props.map((p) => ({ ...p })) : [],
    roads: [],
    water: [],
    trees: m.trees ? m.trees.map((t) => ({ ...t })) : [],
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
