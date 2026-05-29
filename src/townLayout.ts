// ─── Procedural town plan (Phase: Town top-down map) ────────────────────────
// Turns a zone's plot count into a *planned* town rendered as a compact 2D
// TOP-DOWN map (1280×960 design space the Town view scales to the viewport).
// A central plaza with a well sits near the middle; curved roads sweep
// corner-to-corner through it; building lots fill the four quarters (nw/ne/sw/
// se) around the plaza without overlapping roads, water, boards or each other;
// trees, fields, fences and water bodies dress the open ground. Everything is
// deterministic per zone: a single seeded mulberry32 PRNG drives all jitter and
// rejection-retry loops in a fixed consumption order, so identical args always
// yield an identical plan.
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

  const plaza = { cx: W / 2 + j(40), cy: H * 0.46 + j(30), rx: 120, ry: 96 };
  const well = { cx: plaza.cx, cy: plaza.cy - 8, r: 16 };

  // Boards FIRST so they act as obstacles for lots/trees.
  const boards: TownPlanBoard[] = kinds
    .filter((k): k is BoardKind => k in BOARD_SPOTS)
    .map((k) => ({ kind: k, ...BOARD_SPOTS[k] }));

  // ── Water ──────────────────────────────────────────────────────────────
  const water: TownPlanWater[] = [];
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
  } else if (rng() < 0.5) {
    const corner = { x: W * 0.82 + j(30), y: H * 0.18 + j(30) };
    const poly: Pt[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      poly.push({ x: corner.x + Math.cos(a) * (75 + j(14)), y: corner.y + Math.sin(a) * (55 + j(12)) });
    }
    water.push({ kind: "pond", polygon: poly });
  } else {
    water.push({
      kind: "river",
      path: [
        { x: W + 10, y: H * 0.04 + j(20) },
        { x: W * 0.78 + j(30), y: H * 0.16 + j(20) },
        { x: W * 0.9 + j(30), y: H * 0.02 + j(10) },
      ],
      width: 42,
    });
  }
  const waterPolys = water.filter((w) => w.polygon).map((w) => w.polygon!);
  const waterPaths = water.filter((w) => w.path).map((w) => w);

  // ── Roads (curved polylines, ≥3 jittered points) ─────────────────────────
  const roads: TownPlanRoad[] = [];
  const mid = (a: Pt, b: Pt, amt: number): Pt => ({ x: (a.x + b.x) / 2 + j(amt), y: (a.y + b.y) / 2 + j(amt) });
  const road3 = (a: Pt, b: Pt, width: number, kind: TownPlanRoad["kind"]) =>
    roads.push({ points: [a, mid(a, b, 60), b], width, kind });
  road3({ x: 30, y: 40 }, { x: W - 30, y: H - 40 }, 46, "main");                 // diagonal main through plaza
  road3({ x: W - 30, y: 40 }, { x: 30, y: H - 40 }, 38, "branch");              // cross diagonal
  road3({ x: plaza.cx, y: plaza.cy }, { x: W - 60, y: H * 0.2 }, 26, "branch"); // branch toward top-right
  if (n >= 6) road3({ x: plaza.cx, y: plaza.cy }, { x: 60, y: H * 0.5 }, 26, "branch");
  if (n >= 9) {
    roads.push({
      kind: "loop",
      width: 24,
      points: [
        { x: plaza.cx - 200 + j(20), y: plaza.cy - 160 + j(20) },
        { x: plaza.cx + 220 + j(20), y: plaza.cy - 150 + j(20) },
        { x: plaza.cx + 200 + j(20), y: plaza.cy + 180 + j(20) },
        { x: plaza.cx - 210 + j(20), y: plaza.cy + 170 + j(20) },
        { x: plaza.cx - 200 + j(20), y: plaza.cy - 160 },
      ],
    });
  }

  // ── Obstacle test for a candidate footprint ──────────────────────────────
  const border = 40;
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

  // ── Lots ─────────────────────────────────────────────────────────────────
  const lots: TownPlanLot[] = [];
  lots.push({ index: 0, cx: plaza.cx + j(8), cy: plaza.cy + plaza.ry * 0.5 + j(6), w: 104, h: 112, row: "plaza" });

  const quarters: Array<{ tag: string; x0: number; x1: number; y0: number; y1: number }> = [
    { tag: "nw", x0: border + 80, x1: plaza.cx - 80, y0: border + 60, y1: plaza.cy - 60 },
    { tag: "ne", x0: plaza.cx + 80, x1: W - border - 80, y0: border + 60, y1: plaza.cy - 60 },
    { tag: "sw", x0: border + 80, x1: plaza.cx - 80, y0: plaza.cy + 60, y1: H - border - 80 },
    { tag: "se", x0: plaza.cx + 80, x1: W - border - 80, y0: plaza.cy + 60, y1: H - border - 80 },
  ];

  for (let i = 1; i < n; i++) {
    const q = quarters[(i - 1) % 4];
    const w = 72 + Math.floor(rng() * 48);
    const h = Math.max(72, Math.min(120, w + Math.floor(j(16))));
    let best: TownPlanLot = { index: i, cx: (q.x0 + q.x1) / 2, cy: (q.y0 + q.y1) / 2, w, h, row: q.tag };
    for (let attempt = 0; attempt < 24; attempt++) {
      const cx = q.x0 + rng() * (q.x1 - q.x0);
      const cy = q.y0 + rng() * (q.y1 - q.y0);
      best = { index: i, cx, cy, w, h, row: q.tag };
      const inBorder = cx - w / 2 > border && cx + w / 2 < W - border && cy - h / 2 > border && cy + h / 2 < H - border;
      const ok = inBorder && !hitsRoad({ x: cx, y: cy }, w / 2) && !hitsWater(cx, cy, w, h)
        && !hitsPlaza(cx, cy) && !hitsBoard(cx, cy, w, h)
        && !lots.some((l) => aabbOverlap(best, l, 12));
      if (ok) break;
    }
    lots.push(best);
  }

  // ── Trees ──────────────────────────────────────────────────────────────
  const trees: TownPlanTree[] = [];
  const clusterN = 3 + Math.floor(rng() * 4); // 3..6
  for (let c = 0; c < clusterN; c++) {
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
      trees.push({ x, y, r, cluster: c, front });
    }
    if (trees.length >= 40) break;
  }

  // ── Fields (near farm board) ─────────────────────────────────────────────
  const fields: TownPlanField[] = [];
  if (kinds.includes("farm")) {
    const fb = BOARD_SPOTS.farm;
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

  // ── Fences (border a field or cluster) ───────────────────────────────────
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

  // ── streets (back-compat 2-pt segments from road polylines) ──────────────
  const streets: TownPlanStreet[] = [];
  for (const rd of roads) {
    for (let i = 0; i < rd.points.length - 1; i++) {
      streets.push({ x1: rd.points[i].x, y1: rd.points[i].y, x2: rd.points[i + 1].x, y2: rd.points[i + 1].y, width: rd.width });
    }
  }

  // ── Waypoints / edges (connected graph) ──────────────────────────────────
  const waypoints: TownPlanWaypoint[] = [];
  const edges: Array<[number, number]> = [];
  const wp = (x: number, y: number): number => { waypoints.push({ x, y }); return waypoints.length - 1; };
  const plazaWp = wp(plaza.cx, plaza.cy + 6);
  for (const rd of roads) {
    const samples: number[] = [];
    for (let i = 0; i < rd.points.length - 1; i++) {
      const a = rd.points[i], b = rd.points[i + 1];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.round(dist / 140));
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        samples.push(wp(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t));
      }
    }
    samples.push(wp(rd.points[rd.points.length - 1].x, rd.points[rd.points.length - 1].y));
    for (let i = 0; i < samples.length - 1; i++) edges.push([samples[i], samples[i + 1]]);
    // Connect plaza to the nearest sample of this road.
    let near = samples[0], bestD = Infinity;
    for (const s of samples) {
      const d = Math.hypot(waypoints[s].x - plaza.cx, waypoints[s].y - plaza.cy);
      if (d < bestD) { bestD = d; near = s; }
    }
    edges.push([plazaWp, near]);
  }

  // ── Props ────────────────────────────────────────────────────────────────
  const props: TownPlanProp[] = [
    { kind: "well", x: well.cx, y: well.cy },
    { kind: "lamppost", x: plaza.cx - plaza.rx + 6, y: plaza.cy + 10 },
    { kind: "lamppost", x: plaza.cx + plaza.rx - 6, y: plaza.cy + 10 },
    { kind: "signpost", x: plaza.cx + 70 + j(10), y: plaza.cy - plaza.ry - 20 },
    { kind: "cart", x: plaza.cx - 160 + j(20), y: plaza.cy + 140 },
    { kind: "planter", x: plaza.cx + 150 + j(20), y: plaza.cy - 120 },
  ];

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
