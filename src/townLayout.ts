// ─── Procedural town plan (Phase: Town top-down map) ────────────────────────
// Turns a zone's plot count into a *planned* town rendered as a compact 2D
// TOP-DOWN map (1280×960 design space the Town view scales to the viewport).
// The generator lays out an ORGANIC settlement map: winding dirt roads (a main
// avenue plus branches and loops), a meandering river, and scattered building
// lots of varied size tucked between paths and water. The town square (plaza +
// well) sits near the centre; puzzle boards claim a few perimeter anchors; every
// other valid slot becomes a buildable lot. Trees/fields/fences dress leftover
// ground. Everything is deterministic per zone: a single seeded mulberry32 PRNG
// drives all jitter in a FIXED consumption order, so identical args always yield
// an identical plan.
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
function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
function nearestOnPolyline(p: Pt, poly: Pt[]): { pt: Pt; dist: number } {
  let best = { pt: poly[0], dist: Infinity };
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i], b = poly[i + 1];
    const d = segDist(p, a, b);
    if (d < best.dist) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const len2 = dx * dx + dy * dy || 1;
      let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      best = { pt: { x: a.x + t * dx, y: a.y + t * dy }, dist: d };
    }
  }
  return best;
}
function quarterTag(cx: number, cy: number, px: number, py: number): string {
  return (cy < py ? "n" : "s") + (cx < px ? "w" : "e");
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

  const border = 48;
  const gx0 = border, gy0 = border, gw = W - 2 * border, gh = H - 2 * border;
  const AVENUE = 46;
  const STREET = 30;
  const pushRoad = (points: Pt[], width: number, kind: TownPlanRoad["kind"]) => {
    if (points.length >= 2) roads.push({ points, width, kind });
  };

  // ── 1. Plaza (organic centre, slight zone jitter) ─────────────────────────
  const plaza = {
    cx: W * 0.52 + j(38),
    cy: H * 0.46 + j(30),
    rx: 108 + j(14),
    ry: 86 + j(12),
  };
  const well = { cx: plaza.cx, cy: plaza.cy - 8, r: 16 };

  // ── 2. Winding river ─────────────────────────────────────────────────────
  const water: TownPlanWater[] = [];
  const riverPath: Pt[] = [
    { x: -12 + j(18), y: H * 0.10 + j(22) },
    { x: W * 0.10 + j(32), y: H * 0.20 + j(26) },
    { x: W * 0.20 + j(38), y: H * 0.34 + j(28) },
    { x: W * 0.30 + j(34), y: H * 0.48 + j(24) },
    { x: W * 0.42 + j(36), y: H * 0.58 + j(26) },
    { x: W * 0.54 + j(32), y: H * 0.70 + j(24) },
    { x: W * 0.66 + j(30), y: H * 0.80 + j(22) },
    { x: W * 0.80 + j(26), y: H + 12 },
  ];
  const RIVER_W = 44;
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

  // ── 3. Organic road network (curved polylines, not a uniform grid) ───────
  const roads: TownPlanRoad[] = [];
  pushRoad([
    { x: 58 + j(18), y: 52 + j(14) },
    { x: W * 0.20 + j(36), y: H * 0.16 + j(28) },
    { x: W * 0.36 + j(32), y: H * 0.28 + j(24) },
    { x: plaza.cx - 48 + j(28), y: plaza.cy - 72 + j(22) },
    { x: plaza.cx + 42 + j(26), y: plaza.cy + 24 + j(24) },
    { x: W * 0.60 + j(34), y: H * 0.54 + j(28) },
    { x: W * 0.76 + j(30), y: H * 0.70 + j(24) },
    { x: W - 54 + j(16), y: H - 50 + j(14) },
  ], AVENUE, "main");
  pushRoad([
    { x: W * 0.06 + j(22), y: H * 0.50 + j(28) },
    { x: W * 0.24 + j(34), y: H * 0.42 + j(24) },
    { x: W * 0.44 + j(30), y: H * 0.36 + j(20) },
    { x: W * 0.64 + j(32), y: H * 0.44 + j(24) },
    { x: W * 0.90 + j(18), y: H * 0.52 + j(26) },
  ], AVENUE, "main");
  pushRoad([
    { x: W * 0.48 + j(28), y: H * 0.22 + j(18) },
    { x: W * 0.50 + j(24), y: H * 0.12 + j(14) },
    { x: W * 0.52 + j(20), y: 62 + j(12) },
  ], STREET, "branch");
  pushRoad([
    { x: W * 0.70 + j(28), y: H * 0.32 + j(22) },
    { x: W * 0.84 + j(24), y: H * 0.40 + j(18) },
    { x: W * 0.86 + j(20), y: H * 0.56 + j(22) },
    { x: W * 0.74 + j(28), y: H * 0.66 + j(18) },
  ], STREET, "loop");
  pushRoad([
    { x: W * 0.16 + j(24), y: H * 0.36 + j(20) },
    { x: 88 + j(14), y: H * 0.44 + j(24) },
    { x: 68 + j(12), y: H * 0.56 + j(20) },
  ], STREET, "branch");
  pushRoad([
    { x: W * 0.38 + j(26), y: H * 0.78 + j(20) },
    { x: W * 0.52 + j(24), y: H * 0.84 + j(16) },
    { x: W * 0.66 + j(28), y: H * 0.80 + j(18) },
  ], STREET, "branch");

  // ── 4. Puzzle boards at organic anchor points ─────────────────────────────
  const boardAnchorForKind = (k: BoardKind): Pt => {
    if (k === "farm") return { x: plaza.cx + j(50), y: plaza.cy - 130 + j(28) };
    if (k === "mine") return { x: W * 0.84 + j(32), y: H * 0.14 + j(26) };
    return { x: W * 0.50 + j(40), y: H * 0.86 + j(22) };
  };
  const fallbackBoardSpots: Pt[] = [
    { x: W * 0.12 + j(24), y: H * 0.18 + j(20) },
    { x: W * 0.88 + j(22), y: H * 0.22 + j(22) },
    { x: W * 0.14 + j(26), y: H * 0.82 + j(20) },
    { x: W * 0.86 + j(24), y: H * 0.78 + j(22) },
  ];
  const validKinds = kinds.filter((k): k is BoardKind => k in BOARD_SPOTS);
  const boards: TownPlanBoard[] = [];
  let fallbackIdx = 0;
  const inPlaza = (cx: number, cy: number) =>
    ((cx - plaza.cx) ** 2) / ((plaza.rx + 24) ** 2) + ((cy - plaza.cy) ** 2) / ((plaza.ry + 24) ** 2) < 1;
  const inRiver = (cx: number, cy: number) => {
    const c = { x: cx, y: cy };
    for (let i = 0; i < riverPath.length - 1; i++) {
      if (segDist(c, riverPath[i], riverPath[i + 1]) < RIVER_W / 2 + 36) return true;
    }
    return false;
  };
  for (const k of validKinds) {
    let spot = boardAnchorForKind(k);
    const spotFree = (pt: Pt) => !inPlaza(pt.x, pt.y) && !inRiver(pt.x, pt.y);
    if (!spotFree(spot) && fallbackIdx < fallbackBoardSpots.length) {
      spot = fallbackBoardSpots[fallbackIdx++];
    }
    const spotRef = BOARD_SPOTS[k];
    boards.push({
      kind: k,
      cx: spot.x,
      cy: spot.y,
      w: spotRef.w,
      h: spotRef.h,
    });
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

  // ── 7. Scattered building lots (varied footprints, organic placement) ─────
  const ROAD_PAD = n > 60 ? 10 : n > 24 ? 14 : 20;
  const LOT_MIN = n > 80 ? 32 : n > 40 ? 36 : 40;
  const MAX_LOT = 150;
  const densityScale = n > 80 ? 0.68 : n > 40 ? 0.78 : n > 20 ? 0.88 : 1;
  const clampLot = (v: number) => Math.max(LOT_MIN, Math.min(MAX_LOT, v * densityScale));
  const lotGap = n > 60 ? 6 : n > 24 ? 10 : 14;
  const lotFits = (cx: number, cy: number, w: number, h: number, placed: TownPlanLot[]) => {
    if (cx - w / 2 < border || cx + w / 2 > W - border || cy - h / 2 < border || cy + h / 2 > H - border) return false;
    if (inPlaza(cx, cy) || hitsWater(cx, cy, w, h)) return false;
    if (hitsBoard(cx, cy, w, h)) return false;
    if (hitsRoad({ x: cx, y: cy }, ROAD_PAD + Math.max(w, h) * 0.12)) return false;
    return !placed.some((l) => aabbOverlap({ cx, cy, w, h }, l, lotGap));
  };

  j(8); j(6); // preserve rng stream alignment for trees/fields/fences
  const lots: TownPlanLot[] = [];
  const colN = Math.max(5, Math.ceil(Math.sqrt(n * 3.6)));
  const rowN = Math.max(5, Math.ceil((n * 3.6) / colN));
  const candidates: TownPlanLot[] = [];
  for (let r = 0; r < rowN; r++) {
    for (let c = 0; c < colN; c++) {
      const cx = gx0 + ((c + 0.5) / colN) * gw + j(42);
      const cy = gy0 + ((r + 0.5) / rowN) * gh + j(42);
      const base = 92 + rng() * 52;
      const aspect = 0.88 + rng() * 0.28;
      const w = clampLot(base);
      const h = clampLot(base * aspect);
      if (lotFits(cx, cy, w, h, candidates)) {
        candidates.push({
          index: 0,
          cx, cy, w, h,
          row: quarterTag(cx, cy, plaza.cx, plaza.cy),
        });
      }
    }
  }
  candidates.sort((a, b) => {
    const da = Math.hypot(a.cx - plaza.cx, a.cy - plaza.cy);
    const db = Math.hypot(b.cx - plaza.cx, b.cy - plaza.cy);
    return da - db;
  });
  for (let i = 0; i < Math.min(n, candidates.length); i++) {
    lots.push({ ...candidates[i], index: i });
  }
  // Fallback: random probes if the jittered grid did not yield enough lots.
  for (let attempt = 0; lots.length < n && attempt < n * 150; attempt++) {
    const cx = gx0 + 60 + rng() * (gw - 120);
    const cy = gy0 + 60 + rng() * (gh - 120);
    const w = clampLot(88 + rng() * 56);
    const h = clampLot(84 + rng() * 58);
    if (lotFits(cx, cy, w, h, lots)) {
      lots.push({
        index: lots.length,
        cx, cy, w, h,
        row: quarterTag(cx, cy, plaza.cx, plaza.cy),
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

  // ── 12. Waypoints along winding roads (for villager paths) ───────────────
  const waypoints: TownPlanWaypoint[] = [];
  const edges: Array<[number, number]> = [];
  const nodeIndex = new Map<string, number>();
  const addNode = (p: Pt): number => {
    for (const [key, idx] of nodeIndex) {
      const [ox, oy] = key.split(":").map(Number);
      if (Math.hypot(ox - p.x, oy - p.y) < 38) return idx;
    }
    const idx = waypoints.length;
    waypoints.push({ x: p.x, y: p.y });
    nodeIndex.set(`${Math.round(p.x)}:${Math.round(p.y)}`, idx);
    return idx;
  };
  const link = (a: number, b: number) => {
    if (a !== b && !edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) {
      edges.push([a, b]);
    }
  };
  for (const road of roads) {
    let prev = -1;
    const spacing = 72;
    for (let i = 0; i < road.points.length - 1; i++) {
      const a = road.points[i], b = road.points[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.ceil(len / spacing));
      for (let s = 0; s <= steps; s++) {
        const idx = addNode(lerpPt(a, b, s / steps));
        if (prev >= 0) link(prev, idx);
        prev = idx;
      }
    }
  }
  const plazaWp = addNode({ x: plaza.cx, y: plaza.cy + 6 });
  let nearWp = 0, bestPlazaD = Infinity;
  for (let i = 0; i < waypoints.length; i++) {
    const d = Math.hypot(waypoints[i].x - plaza.cx, waypoints[i].y - plaza.cy);
    if (d < bestPlazaD) { bestPlazaD = d; nearWp = i; }
  }
  link(plazaWp, nearWp);
  for (let i = 0; i < waypoints.length; i++) {
    for (let k = i + 1; k < waypoints.length; k++) {
      if (Math.hypot(waypoints[i].x - waypoints[k].x, waypoints[i].y - waypoints[k].y) < 52) {
        link(i, k);
      }
    }
  }
  {
    const parent = waypoints.map((_, i) => i);
    const find = (i: number): number => {
      while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
      return i;
    };
    const unite = (a: number, b: number) => {
      const ra = find(a), rb = find(b);
      if (ra !== rb) parent[rb] = ra;
    };
    for (const [a, b] of edges) unite(a, b);
    const groups = new Map<number, number[]>();
    for (let i = 0; i < waypoints.length; i++) {
      const r = find(i);
      if (!groups.has(r)) groups.set(r, []);
      groups.get(r)!.push(i);
    }
    const roots = [...groups.keys()];
    for (let g = 1; g < roots.length; g++) {
      const aNodes = groups.get(roots[0])!;
      const bNodes = groups.get(roots[g])!;
      let bestA = aNodes[0], bestB = bNodes[0], bestD = Infinity;
      for (const i of aNodes) {
        for (const k of bNodes) {
          const d = Math.hypot(waypoints[i].x - waypoints[k].x, waypoints[i].y - waypoints[k].y);
          if (d < bestD) { bestD = d; bestA = i; bestB = k; }
        }
      }
      link(bestA, bestB);
      unite(bestA, bestB);
      for (const k of bNodes) groups.get(roots[0])!.push(k);
    }
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
  // Lampposts beside road bends near the plaza (2..4).
  {
    const lampN = 2 + Math.floor(rng() * 3);
    const ordered = waypoints
      .map((p, i) => ({ i, x: p.x, y: p.y, d: Math.hypot(p.x - plaza.cx, p.y - plaza.cy) }))
      .sort((a, b) => a.d - b.d);
    const LAMP_OFF = AVENUE / 2 + 14;
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

  // ── 13b. Front paths (lot → nearest point on the road network) ────────────
  const keptLots = lots.slice(0, n);
  const paths: TownPlanPath[] = [];
  const PATH_W = 14;
  const allRoadPts: Pt[] = roads.flatMap((rd) => rd.points);
  for (const l of keptLots) {
    const { cx, cy, h } = l;
    const start = { x: cx, y: cy + h / 2 };
    let best = { pt: allRoadPts[0] ?? start, dist: Infinity };
    for (const rd of roads) {
      const hit = nearestOnPolyline(start, rd.points);
      if (hit.dist < best.dist) best = hit;
    }
    if (!Number.isFinite(best.dist) || best.dist > 220) continue;
    if (best.pt.y < start.y - 2) continue;
    paths.push({ x1: start.x, y1: start.y, x2: best.pt.x, y2: best.pt.y, width: PATH_W });
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
