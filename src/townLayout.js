// ─── Procedural town plan (Phase: Town UX redesign) ─────────────────────────
// Turns a zone's plot count into a *planned* town: a paved central plaza with a
// well, a main street and a couple of cross-lanes, and building lots arranged
// in tidy rows along the lanes (instead of being scattered). Deterministic per
// zone — a tiny seeded PRNG adds a little jitter so each town feels distinct
// without being chaotic. All coordinates live in the same 1100×600 design space
// the Town view scales to the viewport.
//
// Returned shape:
//   { width, height, ground: {top}, plaza: {cx,cy,rx,ry}, well: {cx,cy,r},
//     streets: [{x1,y1,x2,y2,width}],
//     lots: [{ index, cx, cy, w, h, row }],   // index 0 is always the hearth
//     props: [{ kind, x, y }],                // lampposts / cart / signpost / planter
//     waypoints: [{x,y}], edges: [[i,j]] }    // street graph for walking villagers

const W = 1100, H = 600;

// Deterministic 32-bit string hash → seeded mulberry32 PRNG.
function seededRng(str) {
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

// Three rows of lots along three streets, far → near. Each lot is bottom-
// anchored when drawn, so its *base* should land just behind its street; we
// derive the lot centre from `streetY` and the lot height. Depth-sorting by
// bottom edge in Town.jsx then keeps far cottages behind near shopfronts.
const ROWS = [
  { streetY: 256, w: 76,  h: 88,  cap: 4, name: "back"  },  // distant cottages (smallest)
  { streetY: 322, w: 96,  h: 104, cap: 5, name: "mid"   },  // second street
  { streetY: 398, w: 116, h: 120, cap: 5, name: "front" },  // main-street shopfronts (largest)
];
// Where a lot in row `r` sits so its drawn base lands ~6px behind the street.
const rowLotCy = (row) => row.streetY - 6 - row.h / 2;

const PLAZA = { cx: 552, cy: 350, rx: 134, ry: 84 };

/**
 * Build the town plan for a zone. `plotCount` is how many lots to expose
 * (≥ 1); the layout fills the front row first (it's the most prominent),
 * then mid, then back. Lot 0 is the hearth — placed on the plaza edge.
 */
export function buildTownPlan({ zoneId = "home", plotCount = 12, boardKinds = [] } = {}) {
  const rng = seededRng(zoneId);
  const j = (amt) => (rng() - 0.5) * 2 * amt; // ±amt jitter
  const n = Math.max(1, Math.floor(plotCount));
  const kinds = Array.isArray(boardKinds) ? boardKinds : [];

  // Puzzle-board fixtures (farm field / mine entrance / harbor) sit on lots in
  // the town's wings rather than floating over the UI: the farm out to the
  // left, the mine tunnelling into the right-hand hillside, the harbor at the
  // lower-left water's edge. Each board is grounded — its base lands on the
  // packed-earth town floor and a short dirt path links it to the road
  // network below (see `boardPaths`) so it reads as part of the settlement.
  const BOARD_SPOTS = {
    farm: { cx: 134, cy: 268, w: 168, h: 156 },
    mine: { cx: W - 128, cy: 218, w: 178, h: 162 },
    fish: { cx: 148, cy: 438, w: 152, h: 138 },
  };
  const boards = kinds.filter((k) => BOARD_SPOTS[k]).map((k) => ({ kind: k, ...BOARD_SPOTS[k] }));

  // Short dirt paths that tie each board into the main road network. Rendered
  // by TownGround beneath the building lots so the connection reads as a
  // worn track from the village out to the field / mine mouth / harbor.
  const boardPaths = boards.map((b) => {
    const baseY = b.cy + b.h / 2 - 6; // a hair above the board's drawn base
    if (b.kind === "mine") {
      // Curve down from the mine mouth out to the front street on the right.
      return { kind: b.kind, x1: b.cx, y1: baseY, x2: W - 60, y2: ROWS[2].streetY, width: 26, curve: -28 };
    }
    if (b.kind === "fish") {
      return { kind: b.kind, x1: b.cx, y1: baseY, x2: PLAZA.cx - PLAZA.rx - 10, y2: ROWS[2].streetY, width: 22, curve: 14 };
    }
    // Farm: connect down into the front street on the left.
    return { kind: b.kind, x1: b.cx, y1: baseY, x2: 60, y2: ROWS[2].streetY, width: 26, curve: 22 };
  });
  const hasLeftBoard = kinds.includes("farm") || kinds.includes("fish");
  const hasRightBoard = kinds.includes("mine");
  const leftStart = hasLeftBoard ? 210 : 100;   // building rows' left clusters start here
  const rightEnd = hasRightBoard ? W - 210 : W - 100;

  // Decide how many lots land in each row. Front row gets the lion's share;
  // mid next; back last — but never more than each row's cap.
  const order = [ROWS[2], ROWS[1], ROWS[0]]; // front, mid, back
  const counts = [0, 0, 0]; // indexed to match `order`
  let left = n;
  for (let pass = 0; left > 0; pass++) {
    let placed = 0;
    for (let r = 0; r < order.length && left > 0; r++) {
      if (counts[r] < order[r].cap) { counts[r]++; left--; placed++; }
    }
    if (placed === 0) break; // all rows full — extra plots (rare) just won't show
  }

  // The hearth (lot 0) sits on the plaza, just in front of the well. Then we
  // lay out the remaining n-1 lots evenly across the rows we sized above.
  const lots = [];
  lots.push({ index: 0, cx: PLAZA.cx + j(8), cy: PLAZA.cy + 30 + j(4), w: 104, h: 112, row: "plaza" });

  let next = 1;
  for (let r = 0; r < order.length; r++) {
    const row = order[r];
    const cnt = counts[r] - (r === 0 ? 1 : 0); // the hearth came out of the front row's budget
    if (cnt <= 0) continue;
    const cy = rowLotCy(row);
    // Split the row's lots into a left cluster and a right cluster so they
    // straddle the plaza/main street rather than marching through it.
    const half = Math.ceil(cnt / 2);
    const leftSpanEnd = PLAZA.cx - PLAZA.rx - 18;
    const rightSpanStart = PLAZA.cx + PLAZA.rx + 18;
    const place = (k, total, x0, x1) => {
      const t = total === 1 ? 0.5 : k / (total - 1);
      const cx = x0 + (x1 - x0) * t + j(12);
      lots.push({ index: next++, cx, cy: cy + j(8), w: row.w, h: row.h, row: row.name });
    };
    for (let k = 0; k < half; k++)       place(k, half, leftStart, leftSpanEnd);
    for (let k = 0; k < cnt - half; k++) place(k, cnt - half, rightSpanStart, rightEnd);
  }

  // Streets: a paved band along each row + a vertical lane connecting them
  // through the plaza. Widths shrink toward the back for a touch of perspective.
  const streets = [
    { x1: 40,  y1: ROWS[2].streetY, x2: W - 40,  y2: ROWS[2].streetY, width: 48 }, // main street (front)
    { x1: 80,  y1: ROWS[1].streetY, x2: W - 80,  y2: ROWS[1].streetY, width: 34 }, // second lane (mid)
    { x1: 150, y1: ROWS[0].streetY, x2: W - 150, y2: ROWS[0].streetY, width: 24 }, // back lane
    { x1: PLAZA.cx, y1: ROWS[0].streetY, x2: PLAZA.cx, y2: H - 16, width: 30 },     // vertical connector through the plaza
  ];

  // Street furniture so the place reads as lived-in.
  const props = [
    { kind: "well",     x: PLAZA.cx,            y: PLAZA.cy - 8 },
    { kind: "lamppost", x: PLAZA.cx - PLAZA.rx + 6, y: PLAZA.cy + 10 },
    { kind: "lamppost", x: PLAZA.cx + PLAZA.rx - 6, y: PLAZA.cy + 10 },
    { kind: "signpost", x: PLAZA.cx + 70,       y: H - 30 },
    { kind: "cart",     x: 220 + j(20),         y: ROWS[2].streetY + 6 },
    { kind: "planter",  x: 770 + j(30),         y: ROWS[1].streetY - 4 },
    { kind: "planter",  x: 340 + j(30),         y: ROWS[1].streetY - 4 },
    { kind: "lamppost", x: 130,                 y: ROWS[2].streetY - 8 },
    { kind: "lamppost", x: W - 130,             y: ROWS[2].streetY - 8 },
  ];

  // Walking-villager graph: a waypoint at each row's left end, centre (on the
  // connector), and right end, plus the plaza — edges run along the lanes and
  // the connector. The villager sim (Town.jsx) walks this. The end columns pull
  // in when a wing holds a puzzle-board fixture, so folk don't tread on it.
  const waypoints = [];
  const wp = (x, y) => { waypoints.push({ x, y }); return waypoints.length - 1; };
  const rowYs = [ROWS[0].streetY, ROWS[1].streetY, ROWS[2].streetY];
  const cols = [hasLeftBoard ? 215 : 120, PLAZA.cx, hasRightBoard ? W - 215 : W - 120];
  const grid = rowYs.map((y) => cols.map((x) => wp(x, y)));
  const plazaWp = wp(PLAZA.cx, PLAZA.cy + 6);
  const edges = [];
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < cols.length - 1; c++) edges.push([grid[r][c], grid[r][c + 1]]);
  for (let r = 0; r < grid.length - 1; r++) edges.push([grid[r][1], grid[r + 1][1]]);
  edges.push([grid[1][1], plazaWp]);

  return {
    width: W, height: H,
    // Town floor begins just above the highest lot's top edge, so the back-row
    // cottages sit on the ground rather than poking into the hills above.
    ground: { top: Math.round(rowLotCy(ROWS[0]) - ROWS[0].h / 2 - 16) },
    plaza: PLAZA,
    well: { cx: PLAZA.cx, cy: PLAZA.cy - 8, r: 16 },
    streets,
    lots: lots.slice(0, n),
    boards,
    boardPaths,
    props,
    waypoints, edges,
  };
}
