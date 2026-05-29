// ─── Procedural town plan (Phase: Town top-down map) ────────────────────────
// Turns a zone's plot count into a *planned* town rendered as a compact 2D
// TOP-DOWN map (1280×960 design space the Town view scales to the viewport).
// The generator lays out a realistic CITY GRID: rectangular blocks separated
// by straight axis-aligned streets (a wide central avenue both ways, narrower
// streets elsewhere). One central block is reserved as the town square (plaza +
// well + hearth lot); a handful of perimeter blocks are reserved for puzzle
// boards; the remaining blocks subdivide into 1–4 building lots whose insets
// make the surrounding streets visibly delineate them. A river cuts a diagonal
// organic break across an off-centre quadrant, and trees/fields/fences dress the
// leftover ground. Everything is deterministic per zone: a single seeded
// mulberry32 PRNG drives all jitter in a FIXED consumption order, so identical
// args always yield an identical plan.
//
// Returned shape (see TownPlan): width/height, ground.top, plaza, well,
// streets (back-compat 2-pt segments), lots, boards, props, waypoints, edges,
// plus roads / water / trees / fields / fences for the top-down renderer.

const W = 1280, H = 960;

/** Design-space dimensions of the town stage, exported for consumers
 *  (Town view, villagers) that need to project plan coordinates. */
export const STAGE_W = W;
export const STAGE_H = H;

// Deterministic 32-bit string hash → seeded mulberry32 PRNG.
function seededRng(str: string): () => number {
  let h = 1779033703 ^ String(str).length;
  for (let i = 0; i < String(str).length; i++) {
    h = Math.imul(h ^ String(str).charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Pt { x: number; y: number }
interface BoardSpot { cx: number; cy: number; w: number; h: number }
type BoardKind = "farm" | "mine" | "fish";

const BOARD_SPOTS: Record<BoardKind, BoardSpot> = {
  fish: { cx: W * 0.5, cy: H * 0.82, w: 150, h: 140 },
  mine: { cx: W * 0.8, cy: H * 0.2, w: 150, h: 140 },
  farm: { cx: W * 0.16, cy: H * 0.5, w: 150, h: 140 },
};

export interface TownPlanLot { index: number; cx: number; cy: number; w: number; h: number; row: string }
export interface TownPlanStreet { x1: number; y1: number; x2: number; y2: number; width: number }
export interface TownPlanProp { kind: string; x: number; y: number }
export interface TownPlanWaypoint { x: number; y: number }
export interface TownPlanBoard extends BoardSpot { kind: BoardKind }
export interface TownPlanRoad { points: Pt[]; width: number; kind: "main" | "branch" | "loop" }
export interface TownPlanWater { kind: "pond" | "river" | "shore"; polygon?: Pt[]; path?: Pt[]; width?: number }
export interface TownPlanTree { x: number; y: number; r: number; cluster: number; front?: boolean }
export interface TownPlanField { cx: number; cy: number; w: number; h: number; rows: number; angle: number }
export interface TownPlanFence { points: Pt[] }

export interface TownPlan {
  width: number;
  height: number;
  ground: { top: number };
  plaza: { cx: number; cy: number; rx: number; ry: number };
  well: { cx: number; cy: number; r: number };
  streets: TownPlanStreet[];
  lots: TownPlanLot[];
  boards: TownPlanBoard[];
  props: TownPlanProp[];
  waypoints: TownPlanWaypoint[];
  edges: Array<[number, number]>;
  roads: TownPlanRoad[];
  water: TownPlanWater[];
  trees: TownPlanTree[];
  fields: TownPlanField[];
  fences: TownPlanFence[];
}

// ── Geometry helpers ────────────────────────────────────────────────────────
function segDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
function pointInPoly(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, k = poly.length - 1; i < poly.length; k = i++) {
    const a = poly[i], b = poly[k];
    if ((a.y > p.y) !== (b.y > p.y) &&
        p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function polyBbox(poly: Pt[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of poly) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  return { x0, y0, x1, y1 };
}

export function buildTownPlan(
  { zoneId = "home", plotCount = 12, boardKinds = [] }: {
    zoneId?: string;
    plotCount?: number;
    boardKinds?: readonly string[];
  } = {},
): TownPlan {
  const rng = seededRng(zoneId);
  const j = (amt: number) => (rng() - 0.5) * 2 * amt; // ±amt jitter
  const n = Math.max(1, Math.floor(plotCount));
  const kinds = Array.isArray(boardKinds) ? boardKinds : [];

  // ── 1a. Block-grid sizing ────────────────────────────────────────────────
  // Usable interior region (everything inside the outer border lanes).
  const border = 40;
  const gx0 = 40, gy0 = 40, gw = 1200, gh = 880;
  const AVENUE = 46;   // central avenue gutter width
  const STREET = 30;   // ordinary street gutter width
  const blocksNeeded = n + 4; // plaza + up to 3 boards + slack

  // Analytic upper bound on how many lots a c×r grid can yield: each interior
  // block subdivides into up to 4 lots, and we reserve ≤4 blocks (plaza+boards).
  const capacityOf = (cols: number, rows: number) => Math.max(0, (cols * rows - 4) * 4);

  // Start from a roughly square grid biased to the 4:3 design ratio, then grow
  // (cols first, then rows) until capacity ≥ n. Capacity grows fast (×4/block),
  // so this loop almost never iterates — but it keeps the guarantee explicit.
  let cols = Math.max(3, Math.round(Math.sqrt(blocksNeeded * (W / H))));
  let rows = Math.max(3, Math.ceil(blocksNeeded / cols));
  while (capacityOf(cols, rows) < n) {
    if (cols <= rows) cols++; else rows++;
  }

  // Reusable jitter sequence: re-seeding before every grid attempt keeps the
  // rng consumption order fixed for the FINAL accepted grid regardless of how
  // many sizing iterations ran above (here: zero, but documented for safety).
  type Block = { x: number; y: number; w: number; h: number };

  const pc = Math.floor(cols / 2); // central column index → avenue
  const pr = Math.floor(rows / 2); // central row index → avenue

  // Partition each axis among blocks using seeded weights. Consumption order is
  // FIXED: all column weights first, then all row weights.
  const colWeights = Array.from({ length: cols }, () => 1 + j(0.18));
  const rowWeights = Array.from({ length: rows }, () => 1 + j(0.18));

  // Gutter widths per axis: outer border lanes + one gutter between each pair of
  // blocks; the gutter at the central index is an avenue, the rest are streets.
  const colGutter = (i: number) => (i === pc ? AVENUE : STREET); // gutter to the LEFT of block i (i in 1..cols-1)
  const rowGutter = (i: number) => (i === pr ? AVENUE : STREET);

  // Total interior gutter width = sum of inner gutters; outer border lanes are
  // the `border` margin already excluded from gw/gh.
  let colGutterTotal = 0;
  for (let c = 1; c < cols; c++) colGutterTotal += colGutter(c);
  let rowGutterTotal = 0;
  for (let r = 1; r < rows; r++) rowGutterTotal += rowGutter(r);

  const colWeightSum = colWeights.reduce((a, b) => a + b, 0) || 1;
  const rowWeightSum = rowWeights.reduce((a, b) => a + b, 0) || 1;
  const colSpace = Math.max(cols * 90, gw - colGutterTotal);
  const rowSpace = Math.max(rows * 90, gh - rowGutterTotal);

  // Block dimensions (gutters excluded), clamped to a readable minimum.
  const colW = colWeights.map((w) => Math.max(90, (w / colWeightSum) * colSpace));
  const rowH = rowWeights.map((w) => Math.max(90, (w / rowWeightSum) * rowSpace));

  // Block interiors + gutter centerlines (vertical = streetX, horizontal = streetY).
  // streetX/streetY include the two outer border lanes so streets span edge-to-edge.
  const block: Block[][] = Array.from({ length: rows }, () => []);
  const streetX: number[] = [];
  const streetY: number[] = [];
  {
    // Left outer border lane centerline.
    streetX.push(border / 2);
    let x = gx0;
    for (let c = 0; c < cols; c++) {
      const bx = x;
      for (let r = 0; r < rows; r++) block[r][c] = { x: bx, y: 0, w: colW[c], h: 0 };
      x += colW[c];
      if (c < cols - 1) {
        const g = colGutter(c + 1);
        streetX.push(x + g / 2); // gutter centerline between block c and c+1
        x += g;
      }
    }
    // Right outer border lane centerline.
    streetX.push(W - border / 2);

    streetY.push(border / 2);
    let y = gy0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) { block[r][c].y = y; block[r][c].h = rowH[r]; }
      y += rowH[r];
      if (r < rows - 1) {
        const g = rowGutter(r + 1);
        streetY.push(y + g / 2);
        y += g;
      }
    }
    streetY.push(H - border / 2);
  }

  // ── 1b. Streets → roads (axis-aligned, 3-pt colinear polylines) ──────────
  const roads: TownPlanRoad[] = [];
  // The wide central avenue is the gutter to the LEFT of central column index
  // pc: streetX has the left border lane at index 0, so the gutter between block
  // columns (pc-1) and pc lives at streetX index pc. Same logic for rows.
  const avenueXIndex = pc;     // streetX[pc] is the gutter left of block column pc
  const avenueYIndex = pr;
  const pushRoad = (a: Pt, b: Pt, width: number, kind: TownPlanRoad["kind"]) =>
    roads.push({ points: [a, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, b], width, kind });
  for (let i = 0; i < streetX.length; i++) {
    const x = streetX[i];
    const isAvenue = i === avenueXIndex;
    pushRoad({ x, y: 0 }, { x, y: H }, isAvenue ? AVENUE : STREET, isAvenue ? "main" : "branch");
  }
  for (let i = 0; i < streetY.length; i++) {
    const y = streetY[i];
    const isAvenue = i === avenueYIndex;
    pushRoad({ x: 0, y }, { x: W, y }, isAvenue ? AVENUE : STREET, isAvenue ? "main" : "branch");
  }

  // ── 1c. Central plaza block ───────────────────────────────────────────────
  const plazaBlk = block[pr][pc];
  const plaza = {
    cx: plazaBlk.x + plazaBlk.w / 2,
    cy: plazaBlk.y + plazaBlk.h / 2,
    rx: Math.min(120, plazaBlk.w * 0.42),
    ry: Math.min(96, plazaBlk.h * 0.42),
  };
  const well = { cx: plaza.cx, cy: plaza.cy - 8, r: 16 };

  // Per-block exclusion flags (plaza, boards, water-covered).
  const excluded: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  excluded[pr][pc] = true; // plaza block never subdivides

  // ── 1e. Boards = reserved perimeter blocks ────────────────────────────────
  const boardPrefForKind = (k: BoardKind): [number, number] => {
    if (k === "farm") return [Math.floor(rows / 2), 0];
    if (k === "mine") return [0, cols - 1];
    return [rows - 1, Math.floor(cols / 2)]; // fish
  };
  // Deterministic perimeter scan order for fallbacks (collision on tiny grids).
  const perimScan: Array<[number, number]> = [];
  for (let c = 0; c < cols; c++) perimScan.push([0, c]);
  for (let r = 1; r < rows; r++) perimScan.push([r, cols - 1]);
  for (let c = cols - 2; c >= 0; c--) perimScan.push([rows - 1, c]);
  for (let r = rows - 2; r >= 1; r--) perimScan.push([r, 0]);

  const validKinds = kinds.filter((k): k is BoardKind => k in BOARD_SPOTS);
  const boards: TownPlanBoard[] = [];
  for (const k of validKinds) {
    let [br, bc] = boardPrefForKind(k);
    if (excluded[br][bc] || (br === pr && bc === pc)) {
      const free = perimScan.find(([r, c]) => !excluded[r][c] && !(r === pr && c === pc));
      if (free) [br, bc] = free;
    }
    excluded[br][bc] = true;
    const blk = block[br][bc];
    boards.push({
      kind: k,
      cx: blk.x + blk.w / 2,
      cy: blk.y + blk.h / 2,
      w: Math.min(150, blk.w - 16),
      h: Math.min(140, blk.h - 16),
    });
  }

  // ── 1f. River (always) + shore (when fish) ────────────────────────────────
  // Route an off-centre diagonal that misses the plaza and reserved board
  // blocks: anchor it through the upper-left / lower-right organic band so the
  // central square stays clear. 4 jittered points.
  const water: TownPlanWater[] = [];
  const riverPath: Pt[] = [
    { x: W * 0.08 + j(24), y: -10 },
    { x: W * 0.26 + j(30), y: H * 0.30 + j(24) },
    { x: W * 0.40 + j(30), y: H * 0.64 + j(24) },
    { x: W * 0.58 + j(24), y: H + 10 },
  ];
  const RIVER_W = 42;
  water.push({ kind: "river", path: riverPath, width: RIVER_W });
  if (kinds.includes("fish")) {
    const top = H * 0.82;
    const notch = j(40);
    water.push({
      kind: "shore",
      polygon: [
        { x: 0, y: top + j(20) },
        { x: W * 0.35, y: top + 24 + notch },
        { x: W * 0.5, y: top - 30 + j(20) },
        { x: W * 0.7, y: top + 18 - notch },
        { x: W, y: top + j(20) },
        { x: W, y: H }, { x: 0, y: H },
      ],
    });
  }
  const waterPolys = water.filter((w) => w.polygon).map((w) => w.polygon!);
  const waterPaths = water.filter((w) => w.path).map((w) => w);

  // Exclude blocks whose centre the river runs through.
  const riverHitsBlock = (blk: Block) => {
    const c = { x: blk.x + blk.w / 2, y: blk.y + blk.h / 2 };
    for (let i = 0; i < riverPath.length - 1; i++) {
      if (segDist(c, riverPath[i], riverPath[i + 1]) < RIVER_W / 2 + 24) return true;
    }
    return false;
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (excluded[r][c]) continue;
      if (riverHitsBlock(block[r][c])) excluded[r][c] = true;
    }
  }

  // ── Obstacle helpers (reused by trees/fences) ─────────────────────────────
  const hitsRoad = (p: Pt, pad: number) => roads.some((rd) => {
    for (let i = 0; i < rd.points.length - 1; i++) {
      if (segDist(p, rd.points[i], rd.points[i + 1]) < rd.width / 2 + pad) return true;
    }
    return false;
  });
  const hitsWater = (cx: number, cy: number, w: number, h: number) => {
    const c = { x: cx, y: cy };
    if (waterPolys.some((poly) => pointInPoly(c, poly))) return true;
    return waterPaths.some((wp) => {
      for (let i = 0; i < wp.path!.length - 1; i++) {
        if (segDist(c, wp.path![i], wp.path![i + 1]) < (wp.width ?? 40) / 2 + 14) return true;
      }
      return false;
    }) || waterPolys.some((poly) => {
      const bb = polyBbox(poly);
      return cx + w / 2 > bb.x0 && cx - w / 2 < bb.x1 && cy + h / 2 > bb.y0 && cy - h / 2 < bb.y1
        && pointInPoly({ x: cx, y: cy + h / 2 }, poly);
    });
  };
  const hitsPlaza = (cx: number, cy: number) =>
    ((cx - plaza.cx) ** 2) / ((plaza.rx + 20) ** 2) + ((cy - plaza.cy) ** 2) / ((plaza.ry + 20) ** 2) < 1;
  const hitsBoard = (cx: number, cy: number, w: number, h: number) => boards.some((b) =>
    Math.abs(cx - b.cx) < (w + b.w) / 2 + 12 && Math.abs(cy - b.cy) < (h + b.h) / 2 + 12);
  const aabbOverlap = (a: { cx: number; cy: number; w: number; h: number }, b: typeof a, gap: number) =>
    Math.abs(a.cx - b.cx) < (a.w + b.w) / 2 + gap && Math.abs(a.cy - b.cy) < (a.h + b.h) / 2 + gap;

  // ── 1c/1d. Lots: plaza hearth FIRST, then subdivide remaining blocks ──────
  const lots: TownPlanLot[] = [];
  lots.push({
    index: 0,
    cx: plaza.cx + j(8),
    cy: plaza.cy + plaza.ry * 0.5 + j(6),
    w: 104, h: 112, row: "plaza",
  });

  const LOT_INSET = 12;
  let lotIndex = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (excluded[r][c]) continue;
      const blk = block[r][c];
      const bc = blk.w > 220 ? 2 : 1;
      const brn = blk.h > 200 ? 2 : 1;
      const cellW = blk.w / bc;
      const cellH = blk.h / brn;
      const tag = (r < pr ? "n" : "s") + (c < pc ? "w" : "e");
      for (let mr = 0; mr < brn; mr++) {
        for (let mc = 0; mc < bc; mc++) {
          let w = cellW - LOT_INSET * 2;
          let h = cellH - LOT_INSET * 2;
          if (w < 56 || h < 56) continue;
          // Keep buildings roughly square (renderer anchors aspectRatio:1).
          if (w > h * 1.3) w = h * 1.3;
          if (h > w * 1.3) h = w * 1.3;
          const cx = blk.x + cellW * mc + cellW / 2;
          const cy = blk.y + cellH * mr + cellH / 2;
          lots.push({ index: lotIndex++, cx, cy, w, h, row: tag });
        }
      }
    }
  }

  // ── 1g. Trees (biased toward leftover/dropped blocks, margins, corners) ───
  const trees: TownPlanTree[] = [];
  const clusterN = 3 + Math.floor(rng() * 4); // 3..6
  for (let cl = 0; cl < clusterN; cl++) {
    let center: Pt = { x: W / 2, y: H / 2 };
    for (let attempt = 0; attempt < 16; attempt++) {
      const cx = border + rng() * (W - 2 * border);
      const cy = border + rng() * (H - 2 * border);
      center = { x: cx, y: cy };
      const ok = !hitsRoad(center, 24) && !hitsWater(cx, cy, 30, 30) && !hitsPlaza(cx, cy)
        && !hitsBoard(cx, cy, 30, 30) && !lots.some((l) => aabbOverlap({ cx, cy, w: 30, h: 30 }, l, 8));
      if (ok) break;
    }
    const canopy = 3 + Math.floor(rng() * 5); // 3..7
    for (let t = 0; t < canopy; t++) {
      if (trees.length >= 40) break;
      const x = center.x + j(40), y = center.y + j(40), r = 14 + Math.floor(rng() * 13);
      const front = lots.some((l) => Math.abs(x - l.cx) < l.w * 0.7 && l.cy <= y && y <= l.cy + l.h * 0.8);
      trees.push({ x, y, r, cluster: cl, front });
    }
    if (trees.length >= 40) break;
  }

  // ── 1g. Fields (in/adjacent to the farm board block) ──────────────────────
  const fields: TownPlanField[] = [];
  if (kinds.includes("farm")) {
    const farmBoard = boards.find((b) => b.kind === "farm");
    const fb = farmBoard ?? { cx: W * 0.16, cy: H * 0.5 };
    const fieldN = 1 + Math.floor(rng() * 3); // 1..3
    for (let f = 0; f < fieldN; f++) {
      fields.push({
        cx: fb.cx + j(60),
        cy: fb.cy + (f - fieldN / 2) * 130 + j(20),
        w: 120 + Math.floor(rng() * 80),
        h: 80 + Math.floor(rng() * 60),
        rows: 4 + Math.floor(rng() * 4),
        angle: j(0.15),
      });
    }
  }

  // ── 1g. Fences (border a field or cluster) ────────────────────────────────
  const fences: TownPlanFence[] = [];
  const fenceN = 1 + Math.floor(rng() * 2); // 1..2
  const anchors: Pt[] = fields.length
    ? fields.map((f) => ({ x: f.cx, y: f.cy }))
    : trees.length ? [{ x: trees[0].x, y: trees[0].y }] : [{ x: plaza.cx, y: plaza.cy }];
  for (let f = 0; f < fenceN; f++) {
    const a = anchors[f % anchors.length];
    const pts: Pt[] = [];
    const segs = 3 + Math.floor(rng() * 3); // 3..5
    for (let s = 0; s < segs; s++) pts.push({ x: a.x - 70 + (140 / (segs - 1)) * s + j(10), y: a.y + 70 + j(14) });
    fences.push({ points: pts });
  }

  // ── 1i. streets (back-compat 2-pt segments from road polylines) ───────────
  const streets: TownPlanStreet[] = [];
  for (const rd of roads) {
    for (let i = 0; i < rd.points.length - 1; i++) {
      streets.push({ x1: rd.points[i].x, y1: rd.points[i].y, x2: rd.points[i + 1].x, y2: rd.points[i + 1].y, width: rd.width });
    }
  }

  // ── 1h. Waypoints / edges = 4-connected grid lattice at intersections ─────
  const waypoints: TownPlanWaypoint[] = [];
  const edges: Array<[number, number]> = [];
  const wp = (x: number, y: number): number => { waypoints.push({ x, y }); return waypoints.length - 1; };
  // Lattice node at every (streetX[i] × streetY[k]) intersection. Index 0 lives
  // at the top-left intersection and is part of the connected component.
  const nx = streetX.length, ny = streetY.length;
  const nodeAt: number[][] = Array.from({ length: ny }, () => Array(nx).fill(-1));
  for (let yi = 0; yi < ny; yi++) {
    for (let xi = 0; xi < nx; xi++) {
      nodeAt[yi][xi] = wp(streetX[xi], streetY[yi]);
    }
  }
  // Connect each node to its right and down neighbour (4-connected lattice).
  for (let yi = 0; yi < ny; yi++) {
    for (let xi = 0; xi < nx; xi++) {
      if (xi + 1 < nx) edges.push([nodeAt[yi][xi], nodeAt[yi][xi + 1]]);
      if (yi + 1 < ny) edges.push([nodeAt[yi][xi], nodeAt[yi + 1][xi]]);
    }
  }
  // Plaza waypoint connected to its nearest lattice intersection.
  const plazaWp = wp(plaza.cx, plaza.cy + 6);
  {
    let near = nodeAt[0][0], bestD = Infinity;
    for (let yi = 0; yi < ny; yi++) {
      for (let xi = 0; xi < nx; xi++) {
        const node = nodeAt[yi][xi];
        const d = Math.hypot(waypoints[node].x - plaza.cx, waypoints[node].y - plaza.cy);
        if (d < bestD) { bestD = d; near = node; }
      }
    }
    edges.push([plazaWp, near]);
  }

  // ── 1i. Props ─────────────────────────────────────────────────────────────
  const props: TownPlanProp[] = [
    { kind: "well", x: well.cx, y: well.cy },
    { kind: "signpost", x: plaza.cx + 70 + j(10), y: plaza.cy - plaza.ry - 20 },
    { kind: "cart", x: plaza.cx - 160 + j(20), y: plaza.cy + 140 },
    { kind: "planter", x: plaza.cx + 150 + j(20), y: plaza.cy - 120 },
  ];
  // Lampposts at plaza-adjacent street intersections (2..4, deterministic).
  {
    const lampN = 2 + Math.floor(rng() * 3); // 2..4
    const ordered: Array<{ x: number; y: number; d: number }> = [];
    for (let yi = 0; yi < ny; yi++) {
      for (let xi = 0; xi < nx; xi++) {
        const x = streetX[xi], y = streetY[yi];
        ordered.push({ x, y, d: Math.hypot(x - plaza.cx, y - plaza.cy) });
      }
    }
    ordered.sort((a, b) => a.d - b.d);
    for (let i = 0; i < Math.min(lampN, ordered.length); i++) {
      props.push({ kind: "lamppost", x: ordered[i].x, y: ordered[i].y });
    }
  }

  // ── 1j. Return ────────────────────────────────────────────────────────────
  return {
    width: W, height: H,
    ground: { top: 0 },
    plaza,
    well,
    streets,
    lots: lots.slice(0, n),
    boards,
    props,
    waypoints, edges,
    roads, water, trees, fields, fences,
  };
}
