// ─── Procedural town plan (Phase: Town top-down map) ────────────────────────
// Turns a zone's plot count into a *planned* town rendered as a compact 2D
// TOP-DOWN map (1280×960 design space the Town view scales to the viewport).
// The generator lays out a realistic CITY GRID: rectangular blocks separated
// by straight axis-aligned streets (a wide central avenue both ways, narrower
// streets elsewhere). One central block is reserved as the town square (plaza +
// well + hearth lot); a handful of perimeter blocks are reserved for puzzle
// boards; every remaining non-excluded block yields exactly ONE building lot,
// and all non-plaza lots share a single global width/height so the town reads as
// a uniform grid of equal-size lots (a grass verge margin keeps each lot clear
// of the surrounding streets). A river cuts a diagonal
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

  // ── 1. Block-grid sizing ─────────────────────────────────────────────────
  // Usable interior region (everything inside the outer border lanes).
  const border = 40;
  const gx0 = 40, gy0 = 40, gw = 1200, gh = 880;
  const AVENUE = 46;   // central avenue gutter width
  const STREET = 30;   // ordinary street gutter width
  const slack = Math.ceil(n * 0.25); // headroom for cells the diagonal river excludes
  const blocksNeeded = n + 4 + slack; // plaza + up to 3 boards + river slack

  // Analytic UPPER bound on how many lots a c×r grid can yield: each non-reserved
  // block now yields exactly ONE uniform lot, and we reserve ≤4 blocks
  // (plaza+boards). So capacity is LINEAR in block count. This is still only an
  // upper bound on realised lots because the diagonal river excludes whatever
  // blocks it crosses; the `slack` term above sizes in extra cells to cover that.
  // `lots.slice(0, n)` trims any surplus. The "exactly one lot per non-excluded
  // block" rule keeps the realised count just under n across the full range.
  const capacityOf = (cols: number, rows: number) => Math.max(0, cols * rows - 4);

  // Start from a roughly square grid biased to the 4:3 design ratio, then grow
  // (cols first, then rows) until linear capacity covers n plus the river slack.
  type Block = { x: number; y: number; w: number; h: number };
  let cols = Math.max(3, Math.round(Math.sqrt(blocksNeeded * (W / H))));
  let rows = Math.max(3, Math.ceil(blocksNeeded / cols));
  while (capacityOf(cols, rows) < n + slack) {
    if (cols <= rows) cols++; else rows++;
  }

  // Grid sizing above consumes no rng (pure arithmetic on n), so the first rng
  // draw (colWeights, below) always starts from the same PRNG state — the
  // consumption order is fixed for given args regardless of the grid shape.

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
  // Usable span left for blocks once gutters are removed. Blocks fill exactly
  // this span (never more), so the grid can never escape the usable region at
  // any plotCount.
  const colSpace = Math.max(0, gw - colGutterTotal);
  const rowSpace = Math.max(0, gh - rowGutterTotal);

  // Block dimensions (gutters excluded). We'd LIKE a 90px readable block floor,
  // but never at the cost of overflowing the usable span — at very high
  // plotCount a hard 90px floor would push block/lot centers off-canvas. So the
  // floor is itself clamped to span/count: blocks shrink below 90px rather than
  // escape the design space. This floor governs block SIZE/bounds only, not the
  // lot COUNT — every non-excluded block always contributes exactly one uniform
  // lot, so shrinking blocks just shrink the global lot size (down to its 40px
  // clamp), never the per-block lot count. Pure arithmetic on the already-drawn
  // weights — no new rng draws, so determinism and consumption order are
  // unchanged.
  const colFloor = Math.min(90, colSpace / cols);
  const rowFloor = Math.min(90, rowSpace / rows);
  const colW = colWeights.map((w) => Math.max(colFloor, (w / colWeightSum) * colSpace));
  const rowH = rowWeights.map((w) => Math.max(rowFloor, (w / rowWeightSum) * rowSpace));

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

  // ── 2. Streets → roads (axis-aligned, 3-pt colinear polylines) ───────────
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

  // ── 3. Central plaza block ────────────────────────────────────────────────
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

  // ── 4. Boards = reserved blocks ───────────────────────────────────────────
  // Farm sits directly ABOVE the town centre (the block just north of the plaza,
  // same column); mine/fish stay on the perimeter. The fallback below relocates
  // any board whose preferred block is unavailable (collision / river).
  const boardPrefForKind = (k: BoardKind): [number, number] => {
    if (k === "farm") return [Math.max(0, pr - 1), pc];
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

  // ── 5. River (always) + shore (when fish) ─────────────────────────────────
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
  // Pure arithmetic on the already-built roads + riverPath — no rng draws. Each
  // road is an axis-aligned polyline, so a crossing angle is always 0 or ±π/2.
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

  // ── 7. Lots: plaza hearth FIRST, then ONE uniform lot per non-excluded block ─
  // Every building lot is the SAME size and SQUARE. We pick a single global side
  // that fits the SMALLEST non-excluded cell in BOTH axes (minus a grass-verge
  // MARGIN to each street), capped at MAX_LOT, then centre that identical lot in
  // every cell so a building fills most of its grid square. Centering means even
  // cells smaller than the lot stay in bounds (only the centre must be inside the
  // design space), so determinism and bounds hold at any plotCount. The empty-lot
  // foundation is drawn smaller than this footprint (see TownGround) so an open
  // plot reads as a small marker while a built building fills the block. Pure
  // arithmetic — no rng draws here.
  const MARGIN = 10;     // grass verge kept between a lot and its surrounding streets
  const MAX_LOT = 150;   // hard cap on a building lot's side
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
  // Single square side: fits the smallest cell in both axes (so a square building
  // never overflows its block), giving big lots at typical plotCounts and
  // shrinking uniformly only when the grid is dense.
  const LOT = clampLot(Math.min(minCellW - 2 * MARGIN, minCellH - 2 * MARGIN));
  const LOT_W = LOT, LOT_H = LOT;

  const lots: TownPlanLot[] = [];
  lots.push({
    index: 0,
    cx: plaza.cx + j(8),
    cy: plaza.cy + plaza.ry * 0.5 + j(6),
    w: 104, h: 112, row: "plaza",
  });

  let lotIndex = 1;
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

  // ── 12. Waypoints / edges = 4-connected grid lattice at intersections ─────
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
  // Lampposts near plaza-adjacent street intersections (2..4, deterministic),
  // offset diagonally off the road onto the nearest free grass corner so they
  // never sit on a road body.
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
    const LAMP_OFF = AVENUE / 2 + 12; // clears even the widest road
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
      // If no corner is free, skip this lamppost rather than place it on a road.
    }
  }

  // ── 13b. Front paths (stub from each kept lot to its nearest gutter) ───────
  // Built from the lots actually RETURNED (after the slice), so a path never
  // refers to a trimmed surplus lot. Each path runs straight from a lot edge
  // midpoint to the nearest adjoining street centerline — pure arithmetic on the
  // already-computed lots + gutter centerlines, no rng draws.
  const keptLots = lots.slice(0, n);
  const paths: TownPlanPath[] = [];
  const PATH_W = 14;
  for (const l of keptLots) {
    if (l.row === "plaza") continue;
    const { cx, cy, w, h } = l;
    // Nearest gutter centerline on each of the lot's four sides (Infinity when
    // there is no gutter on that side).
    let gxL = -Infinity, gxR = Infinity, gyT = -Infinity, gyB = Infinity;
    for (const sx of streetX) {
      if (sx < cx && sx > gxL) gxL = sx;
      if (sx > cx && sx < gxR) gxR = sx;
    }
    for (const sy of streetY) {
      if (sy < cy && sy > gyT) gyT = sy;
      if (sy > cy && sy < gyB) gyB = sy;
    }
    const dL = Number.isFinite(gxL) ? cx - gxL : Infinity;
    const dR = Number.isFinite(gxR) ? gxR - cx : Infinity;
    const dT = Number.isFinite(gyT) ? cy - gyT : Infinity;
    const dB = Number.isFinite(gyB) ? gyB - cy : Infinity;
    const best = Math.min(dL, dR, dT, dB);
    if (!Number.isFinite(best)) continue;
    if (best === dB) paths.push({ x1: cx, y1: cy + h / 2, x2: cx, y2: gyB, width: PATH_W });
    else if (best === dT) paths.push({ x1: cx, y1: cy - h / 2, x2: cx, y2: gyT, width: PATH_W });
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

  // ── 14. Return ────────────────────────────────────────────────────────────
  return {
    width: W, height: H,
    ground: { top: 0 },
    plaza,
    well,
    streets,
    lots: keptLots,
    boards,
    props,
    waypoints, edges,
    roads, water, trees, fields, fences,
    bridges, paths,
    lotDecor, streetTrees,
  };
}
