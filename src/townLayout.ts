// ─── Procedural town plan (Phase: Town top-down map) ────────────────────────
// Turns a zone's plot count into a *planned* town rendered as a compact 2D
// TOP-DOWN map (1280×960 design space the Town view scales to the viewport).
// The generator lays out a VILLAGE MAP: a readable block grid of streets and
// building plots (irregular block sizes via seeded weights), a town square at
// the crossing of two main avenues, and a gentle river along the west edge.
// Puzzle boards occupy perimeter blocks; every other buildable block yields one
// lot. Rounded road rendering in TownGround softens the grid without breaking
// coherence. Everything is deterministic per zone: a single seeded mulberry32
// PRNG drives all jitter in a FIXED consumption order.
//
// Returned shape (see TownPlan): width/height, ground.top, plaza, well,
// streets (back-compat 2-pt segments), lots, boards, props, waypoints, edges,
// plus roads / water / trees / fields / fences for the top-down renderer.

import { mulberry32 } from "./rng.js";

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
  return mulberry32(h >>> 0);
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
export interface TownPlanBridge { x: number; y: number; angle: number; width: number }
export interface TownPlanPath { x1: number; y1: number; x2: number; y2: number; width: number }
export interface TownPlanLotDecor { lot: number; x: number; y: number; kind: "bed" | "pots" | "shrub" }
export interface TownPlanStreetTree { x: number; y: number; r: number }

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
  bridges: TownPlanBridge[];
  paths: TownPlanPath[];
  lotDecor: TownPlanLotDecor[];
  streetTrees: TownPlanStreetTree[];
}

// ── Geometry helpers ────────────────────────────────────────────────────────
function segDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
// Segment a→b intersected with segment c→d. Returns the crossing point, or null
// when they are parallel/collinear or don't overlap within both segments.
function segIntersect(a: Pt, b: Pt, c: Pt, d: Pt): Pt | null {
  const r = { x: b.x - a.x, y: b.y - a.y };
  const s = { x: d.x - c.x, y: d.y - c.y };
  const denom = r.x * s.y - r.y * s.x;
  if (denom === 0) return null; // parallel/collinear
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / denom;
  const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a.x + t * r.x, y: a.y + t * r.y };
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

  const border = 40;
  const gx0 = 40, gy0 = 40, gw = 1200, gh = 880;
  const AVENUE = 46;
  const STREET = 30;
  const nBoards = kinds.filter((k) => k in BOARD_SPOTS).length;
  const reserved = 1 + nBoards;
  const slack = Math.ceil(n * 0.25);
  const capacityOf = (cols: number, rows: number) => Math.max(0, cols * rows - reserved);

  type Block = { x: number; y: number; w: number; h: number };
  const seed = n + reserved;
  let cols = Math.max(3, Math.round(Math.sqrt(seed * (W / H))));
  let rows = Math.max(3, Math.ceil(seed / cols));
  while (capacityOf(cols, rows) < n + slack) {
    if (cols <= rows) cols++; else rows++;
  }

  const pc = Math.floor(cols / 2);
  const pr = Math.floor(rows / 2);
  const colWeights = Array.from({ length: cols }, () => 1 + j(0.22));
  const rowWeights = Array.from({ length: rows }, () => 1 + j(0.22));
  const colGutter = (i: number) => (i === pc ? AVENUE : STREET);
  const rowGutter = (i: number) => (i === pr ? AVENUE : STREET);

  let colGutterTotal = 0;
  for (let c = 1; c < cols; c++) colGutterTotal += colGutter(c);
  let rowGutterTotal = 0;
  for (let r = 1; r < rows; r++) rowGutterTotal += rowGutter(r);

  const colWeightSum = colWeights.reduce((a, b) => a + b, 0) || 1;
  const rowWeightSum = rowWeights.reduce((a, b) => a + b, 0) || 1;
  const colSpace = Math.max(0, gw - colGutterTotal);
  const rowSpace = Math.max(0, gh - rowGutterTotal);
  const colFloor = Math.min(90, colSpace / cols);
  const rowFloor = Math.min(90, rowSpace / rows);
  const colW = colWeights.map((w) => Math.max(colFloor, (w / colWeightSum) * colSpace));
  const rowH = rowWeights.map((w) => Math.max(rowFloor, (w / rowWeightSum) * rowSpace));

  const block: Block[][] = Array.from({ length: rows }, () => []);
  const streetX: number[] = [];
  const streetY: number[] = [];
  {
    streetX.push(border / 2);
    let x = gx0;
    for (let c = 0; c < cols; c++) {
      const bx = x;
      for (let r = 0; r < rows; r++) block[r][c] = { x: bx, y: 0, w: colW[c], h: 0 };
      x += colW[c];
      if (c < cols - 1) {
        const g = colGutter(c + 1);
        streetX.push(x + g / 2);
        x += g;
      }
    }
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

  const roads: TownPlanRoad[] = [];
  const avenueXIndex = pc;
  const avenueYIndex = pr;
  const pushRoad = (a: Pt, b: Pt, width: number, kind: TownPlanRoad["kind"]) =>
    roads.push({ points: [a, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, b], width, kind });
  for (let i = 0; i < streetX.length; i++) {
    const x = streetX[i];
    pushRoad({ x, y: 0 }, { x, y: H }, i === avenueXIndex ? AVENUE : STREET, i === avenueXIndex ? "main" : "branch");
  }
  for (let i = 0; i < streetY.length; i++) {
    const y = streetY[i];
    pushRoad({ x: 0, y }, { x: W, y }, i === avenueYIndex ? AVENUE : STREET, i === avenueYIndex ? "main" : "branch");
  }

  const plazaBlk = block[pr][pc];
  const plaza = {
    cx: plazaBlk.x + plazaBlk.w / 2,
    cy: plazaBlk.y + plazaBlk.h / 2,
    rx: Math.min(120, plazaBlk.w * 0.42),
    ry: Math.min(96, plazaBlk.h * 0.42),
  };
  const well = { cx: plaza.cx, cy: plaza.cy - 8, r: 16 };

  const excluded: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  excluded[pr][pc] = true;

  const boardPrefForKind = (k: BoardKind): [number, number] => {
    if (k === "farm") return [Math.max(0, pr - 1), pc];
    if (k === "mine") return [0, cols - 1];
    return [rows - 1, Math.floor(cols / 2)];
  };
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

  const water: TownPlanWater[] = [];
  const riverPath: Pt[] = [
    { x: -10 + j(10), y: H * 0.12 + j(12) },
    { x: W * 0.10 + j(14), y: H * 0.28 + j(12) },
    { x: W * 0.18 + j(14), y: H * 0.50 + j(12) },
    { x: W * 0.30 + j(14), y: H * 0.72 + j(12) },
    { x: W * 0.44 + j(12), y: H + 10 },
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

  // ── 6. Obstacle helpers (reused by trees/fences) ──────────────────────────
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

  // ── 6b. Bridges (a span wherever a road crosses the river) ─────────────────
  // Pure arithmetic on the already-built roads + riverPath — no rng draws.
  const bridges: TownPlanBridge[] = [];
  {
    const seen = new Set<string>();
    for (const rd of roads) {
      for (let i = 0; i < rd.points.length - 1; i++) {
        const segA = rd.points[i], segB = rd.points[i + 1];
        const angle = Math.atan2(segB.y - segA.y, segB.x - segA.x);
        for (let k = 0; k < riverPath.length - 1; k++) {
          const p = segIntersect(segA, segB, riverPath[k], riverPath[k + 1]);
          if (!p) continue;
          // Defensive: the river already avoids these blocks, but never bridge
          // straight through a board or the plaza.
          if (hitsBoard(p.x, p.y, 1, 1) || hitsPlaza(p.x, p.y)) continue;
          const key = `${Math.round(p.x)}:${Math.round(p.y)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          bridges.push({ x: p.x, y: p.y, angle, width: rd.width });
        }
      }
    }
  }

  // ── 7. Lots: one uniform building lot per buildable block ─────────────────
  const MARGIN = 10;
  const MAX_LOT = 150;
  const clampLot = (v: number) => Math.max(40, Math.min(MAX_LOT, v));

  let minCellW = Infinity, minCellH = Infinity;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (excluded[r][c]) continue;
      const blk = block[r][c];
      if (blk.w < minCellW) minCellW = blk.w;
      if (blk.h < minCellH) minCellH = blk.h;
    }
  }
  if (!Number.isFinite(minCellW)) minCellW = MAX_LOT + 2 * MARGIN;
  if (!Number.isFinite(minCellH)) minCellH = MAX_LOT + 2 * MARGIN;
  const LOT = clampLot(Math.min(minCellW - 2 * MARGIN, minCellH - 2 * MARGIN));
  const LOT_W = LOT, LOT_H = LOT;

  j(8); j(6);
  const lots: TownPlanLot[] = [];
  let lotIndex = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (excluded[r][c]) continue;
      const blk = block[r][c];
      const tag = (r < pr ? "n" : "s") + (c < pc ? "w" : "e");
      lots.push({
        index: lotIndex++,
        cx: blk.x + blk.w / 2,
        cy: blk.y + blk.h / 2,
        w: LOT_W, h: LOT_H, row: tag,
      });
    }
  }

  // ── 8. Trees (biased toward leftover/dropped blocks, margins, corners) ────
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

  // ── 9. Fields (bound to the farm board block) ─────────────────────────────
  // Emit a SINGLE tilled-soil field locked to the farm board's footprint (0.9×
  // the card, centred on it, angle 0) so it can never float free of the card or
  // overlap roads/other lots. We still walk the original 1..3 iteration loop and
  // consume the same per-iteration rng()/j() draws so the downstream PRNG stream
  // (fences, lampposts, …) is unchanged — only the first iteration pushes, and
  // its geometry comes from the board, not the (still-drawn) jitter values.
  const fields: TownPlanField[] = [];
  if (kinds.includes("farm")) {
    const farmBoard = boards.find((b) => b.kind === "farm");
    const fb = farmBoard ?? { cx: W * 0.16, cy: H * 0.5, w: 150, h: 140 };
    const fieldN = 1 + Math.floor(rng() * 3); // 1..3
    for (let f = 0; f < fieldN; f++) {
      // Keep consuming every draw the original code made each iteration so the
      // consumption order / count is identical; only `rows` (an rng draw) is
      // actually used by the single emitted field.
      j(60);
      j(20);
      Math.floor(rng() * 80);
      Math.floor(rng() * 60);
      const rows = 4 + Math.floor(rng() * 4); // 4..7
      j(0.15);
      if (f === 0) {
        fields.push({
          cx: fb.cx,
          cy: fb.cy,
          w: fb.w * 0.9,
          h: fb.h * 0.9,
          rows,
          angle: 0, // no rotation → bounding box can't overflow the board cell
        });
      }
    }
  }

  // ── 10. Fences (border a field or cluster) ────────────────────────────────
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

  // ── 11. streets (back-compat 2-pt segments from road polylines) ───────────
  const streets: TownPlanStreet[] = [];
  for (const rd of roads) {
    for (let i = 0; i < rd.points.length - 1; i++) {
      streets.push({ x1: rd.points[i].x, y1: rd.points[i].y, x2: rd.points[i + 1].x, y2: rd.points[i + 1].y, width: rd.width });
    }
  }

  // ── 12. Waypoints / edges = street-intersection lattice ───────────────────
  const waypoints: TownPlanWaypoint[] = [];
  const edges: Array<[number, number]> = [];
  const wp = (x: number, y: number): number => { waypoints.push({ x, y }); return waypoints.length - 1; };
  const nx = streetX.length, ny = streetY.length;
  const nodeAt: number[][] = Array.from({ length: ny }, () => Array(nx).fill(-1));
  for (let yi = 0; yi < ny; yi++) {
    for (let xi = 0; xi < nx; xi++) {
      nodeAt[yi][xi] = wp(streetX[xi], streetY[yi]);
    }
  }
  for (let yi = 0; yi < ny; yi++) {
    for (let xi = 0; xi < nx; xi++) {
      if (xi + 1 < nx) edges.push([nodeAt[yi][xi], nodeAt[yi][xi + 1]]);
      if (yi + 1 < ny) edges.push([nodeAt[yi][xi], nodeAt[yi + 1][xi]]);
    }
  }
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

  // ── 13. Props ─────────────────────────────────────────────────────────────
  const props: TownPlanProp[] = [
    { kind: "well", x: well.cx, y: well.cy },
    { kind: "signpost", x: plaza.cx + 70 + j(10), y: plaza.cy - plaza.ry - 20 },
    { kind: "cart", x: plaza.cx - 160 + j(20), y: plaza.cy + 140 },
    { kind: "planter", x: plaza.cx + 150 + j(20), y: plaza.cy - 120 },
  ];
  // Nudge any plaza-decoration prop (not the well) that landed on a road back
  // toward the plaza centre. Pure geometry on already-drawn positions — no rng
  // draws. Lerp toward the centre up to 3 times; if still on a road, snap to a
  // point on the plaza ellipse in the prop's original direction.
  const settleProp = (p: TownPlanProp) => {
    if (!hitsRoad({ x: p.x, y: p.y }, 2)) return;
    let x = p.x, y = p.y;
    for (let i = 0; i < 3; i++) {
      x = (x + plaza.cx) / 2;
      y = (y + plaza.cy) / 2;
      if (!hitsRoad({ x, y }, 2)) { p.x = x; p.y = y; return; }
    }
    const theta = Math.atan2(p.y - plaza.cy, p.x - plaza.cx);
    p.x = plaza.cx + Math.cos(theta) * plaza.rx * 0.8;
    p.y = plaza.cy + Math.sin(theta) * plaza.ry * 0.8;
  };
  for (const p of props) if (p.kind !== "well") settleProp(p);
  {
    const lampN = 2 + Math.floor(rng() * 3);
    const ordered: Array<{ x: number; y: number; d: number }> = [];
    for (let yi = 0; yi < ny; yi++) {
      for (let xi = 0; xi < nx; xi++) {
        const x = streetX[xi], y = streetY[yi];
        ordered.push({ x, y, d: Math.hypot(x - plaza.cx, y - plaza.cy) });
      }
    }
    ordered.sort((a, b) => a.d - b.d);
    const LAMP_OFF = AVENUE / 2 + 12;
    const CORNERS: Array<[number, number]> = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (let i = 0; i < Math.min(lampN, ordered.length); i++) {
      const { x, y } = ordered[i];
      for (const [dx, dy] of CORNERS) {
        const c = { x: x + dx * LAMP_OFF, y: y + dy * LAMP_OFF };
        const free = !hitsRoad(c, 2) && !hitsPlaza(c.x, c.y)
          && !lots.some((l) => aabbOverlap({ cx: c.x, cy: c.y, w: 10, h: 10 }, l, 4))
          && c.x > 0 && c.x < W && c.y > 0 && c.y < H;
        if (free) { props.push({ kind: "lamppost", x: c.x, y: c.y }); break; }
      }
    }
  }

  const keptLots = lots.slice(0, n);
  const paths: TownPlanPath[] = [];
  const PATH_W = 14;
  for (const l of keptLots) {
    if (l.row === "plaza") continue;
    const { cx, cy, w, h } = l;
    let gxL = -Infinity, gxR = Infinity, gyB = Infinity;
    for (const sx of streetX) {
      if (sx < cx && sx > gxL) gxL = sx;
      if (sx > cx && sx < gxR) gxR = sx;
    }
    for (const sy of streetY) {
      if (sy > cy && sy < gyB) gyB = sy;
    }
    const dL = Number.isFinite(gxL) ? cx - gxL : Infinity;
    const dR = Number.isFinite(gxR) ? gxR - cx : Infinity;
    const dB = Number.isFinite(gyB) ? gyB - cy : Infinity;
    const best = Math.min(dL, dR, dB);
    if (!Number.isFinite(best)) continue;
    if (best === dB) paths.push({ x1: cx, y1: cy + h / 2, x2: cx, y2: gyB, width: PATH_W });
    else if (best === dR) paths.push({ x1: cx + w / 2, y1: cy, x2: gxR, y2: cy, width: PATH_W });
    else paths.push({ x1: cx - w / 2, y1: cy, x2: gxL, y2: cy, width: PATH_W });
  }

  // ── 13c. Lush decoration (separate decor RNG) ─────────────────────────────
  // Purely-additive greenery driven by an INDEPENDENT sub-RNG seeded off the
  // zone id, so it never touches the main `rng` stream (trees/fields/fences/
  // props stay byte-identical). lotDecor dresses the FRONT of each built home;
  // streetTrees scatter small trees on the grass verges between lots & streets,
  // fully bounds-checked off roads/water/plaza/boards/lots.
  const decorRng = seededRng(zoneId + ":decor");
  const dj = (amt: number) => (decorRng() - 0.5) * 2 * amt; // ±amt jitter (decor stream)

  const lotDecor: TownPlanLotDecor[] = [];
  for (const l of keptLots) {
    if (l.row === "plaza") continue;
    const cnt = Math.floor(decorRng() * 3); // 0..2 accents
    const left = { x: l.cx - l.w * 0.32, y: l.cy + l.h * 0.30 };
    const right = { x: l.cx + l.w * 0.32, y: l.cy + l.h * 0.30 };
    for (let k = 0; k < cnt; k++) {
      const anchor = k === 0 ? left : right;
      const kind = (["bed", "pots", "shrub"] as const)[Math.floor(decorRng() * 3)];
      lotDecor.push({ lot: l.index, x: anchor.x + dj(3), y: anchor.y + dj(2), kind });
    }
  }

  // Street-verge trees: ~40 deterministic candidate attempts, capped at 22,
  // rejecting any candidate that would sit on a road/water/plaza/board/lot or
  // collide with an already-placed verge tree.
  const STREET_TREE_CAP = 22;
  const streetTrees: TownPlanStreetTree[] = [];
  for (let i = 0; i < 40 && streetTrees.length < STREET_TREE_CAP; i++) {
    const x = 40 + decorRng() * (W - 80);
    const y = 40 + decorRng() * (H - 80);
    const r = 8 + Math.floor(decorRng() * 6); // 8..13 (smaller than the main trees)
    const ok =
      !hitsRoad({ x, y }, r + 4) &&
      !hitsWater(x, y, r * 2, r * 2) &&
      !hitsPlaza(x, y) &&
      !hitsBoard(x, y, r * 2, r * 2) &&
      !keptLots.some((l) => aabbOverlap({ cx: x, cy: y, w: r * 2, h: r * 2 }, l, 6)) &&
      !streetTrees.some((t) => Math.hypot(t.x - x, t.y - y) < (t.r + r + 10));
    if (ok) streetTrees.push({ x, y, r });
  }

  // ── 14. Snap coordinates to grid for 32x32 pixel-art rendering ───────────
  const snap32 = (v: number) => Math.round(v / 32) * 32;
  const snap16 = (v: number) => Math.round(v / 16) * 16;

  const snappedPlaza = {
    cx: snap32(plaza.cx),
    cy: snap32(plaza.cy),
    rx: snap32(plaza.rx),
    ry: snap32(plaza.ry),
  };

  const snappedWell = {
    cx: snap32(well.cx),
    cy: snap32(well.cy),
    r: snap16(well.r),
  };

  const snappedStreets = streets.map(s => ({
    x1: snap32(s.x1),
    y1: snap32(s.y1),
    x2: snap32(s.x2),
    y2: snap32(s.y2),
    width: snap16(s.width),
  }));

  const snappedLotW = snap32(LOT_W);
  const snappedLotH = snap32(LOT_H);
  const snappedLots = keptLots.map(l => {
    const left = snap32(l.cx - l.w / 2);
    const top = snap32(l.cy - l.h / 2);
    return {
      ...l,
      cx: left + snappedLotW / 2,
      cy: top + snappedLotH / 2,
      w: snappedLotW,
      h: snappedLotH,
    };
  });

  const snappedBoards = boards.map(b => {
    const bw = snap32(b.w);
    const bh = snap32(b.h);
    const left = snap32(b.cx - b.w / 2);
    const top = snap32(b.cy - b.h / 2);
    return {
      ...b,
      cx: left + bw / 2,
      cy: top + bh / 2,
      w: bw,
      h: bh,
    };
  });

  const snappedRoads = roads.map(r => ({
    ...r,
    points: r.points.map(p => ({ x: snap32(p.x), y: snap32(p.y) })),
    width: snap16(r.width),
  }));

  const snappedWater = water.map(w => {
    const res = { ...w };
    if (w.polygon) {
      res.polygon = w.polygon.map(p => ({ x: snap32(p.x), y: snap32(p.y) }));
    }
    if (w.path) {
      res.path = w.path.map(p => ({ x: snap32(p.x), y: snap32(p.y) }));
    }
    if (w.width !== undefined) {
      res.width = snap16(w.width);
    }
    return res;
  });

  const snappedTrees = trees.map(t => ({
    ...t,
    x: snap16(t.x),
    y: snap16(t.y),
    r: snap16(t.r),
  }));

  const snappedFields = fields.map(f => {
    const fw = snap32(f.w);
    const bh = snap32(f.h);
    const left = snap32(f.cx - f.w / 2);
    const top = snap32(f.cy - f.h / 2);
    return {
      ...f,
      cx: left + fw / 2,
      cy: top + bh / 2,
      w: fw,
      h: bh,
    };
  });

  const snappedFences = fences.map(f => ({
    points: f.points.map(p => ({ x: snap32(p.x), y: snap32(p.y) })),
  }));

  const snappedBridges = bridges.map(b => ({
    ...b,
    x: snap32(b.x),
    y: snap32(b.y),
    width: snap16(b.width),
  }));

  const snappedPaths = paths.map(p => ({
    ...p,
    x1: snap32(p.x1),
    y1: snap32(p.y1),
    x2: snap32(p.x2),
    y2: snap32(p.y2),
    width: snap16(p.width),
  }));

  const snappedWaypoints = waypoints.map(w => ({
    x: snap32(w.x),
    y: snap32(w.y),
  }));

  const snappedProps = props.map(p => ({
    ...p,
    x: snap16(p.x),
    y: snap16(p.y),
  }));

  const snappedLotDecor = lotDecor.map(d => {
    const originalLot = keptLots.find(l => l.index === d.lot);
    const snappedLot = snappedLots.find(l => l.index === d.lot);
    if (originalLot && snappedLot) {
      const dx = d.x - originalLot.cx;
      const dy = d.y - originalLot.cy;
      return {
        ...d,
        x: snappedLot.cx + snap16(dx),
        y: snappedLot.cy + snap16(dy),
      };
    }
    return { ...d, x: snap16(d.x), y: snap16(d.y) };
  });

  const snappedStreetTrees = streetTrees.map(t => ({
    ...t,
    x: snap16(t.x),
    y: snap16(t.y),
  }));

  return {
    width: W, height: H,
    ground: { top: 0 },
    plaza: snappedPlaza,
    well: snappedWell,
    streets: snappedStreets,
    lots: snappedLots,
    boards: snappedBoards,
    props: snappedProps,
    waypoints: snappedWaypoints,
    edges,
    roads: snappedRoads,
    water: snappedWater,
    trees: snappedTrees,
    fields: snappedFields,
    fences: snappedFences,
    bridges: snappedBridges,
    paths: snappedPaths,
    lotDecor: snappedLotDecor,
    streetTrees: snappedStreetTrees,
  };
}
