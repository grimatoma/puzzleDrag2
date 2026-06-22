// docs/zones — Goldgrass Reach top-down layout (axial-boulevard). The grand capital: a monumental
// central boulevard (dual-fronted) + two back lanes + a closing ring road, filling out around a great
// monument plaza. 26 plots across 5 rungs — the largest layout. Golden wheat is the receding frontier.
// The spec is generated so the 26 lots get stable, additive indices by rung.

// [row, column-along, tier] — laid out roughly centre-outward; indices follow this order (stable/additive)
const PLAN = [
  // tier 0 — the boulevard core (4)
  ["MBN", 480, 0], ["MBS", 480, 0], ["MBN", 800, 0], ["MBS", 800, 0],
  // tier 1 — the back lanes open (4)
  ["NBL", 520, 1], ["NBL", 786, 1], ["SBL", 520, 1], ["SBL", 786, 1],
  // tier 2 — the inner quarters fill (6)
  ["MBN", 360, 2], ["MBS", 360, 2], ["NBL", 360, 2], ["SBL", 360, 2], ["NBL", 666, 2], ["SBL", 666, 2],
  // tier 3 — the city reaches out, the ring road begins (6)
  ["MBN", 200, 3], ["MBS", 200, 3], ["MBN", 920, 3], ["MBS", 920, 3], ["NBL", 200, 3], ["SBL", 200, 3],
  // tier 4 — the ring road closes, the far districts (6)
  ["MBN", 1080, 4], ["MBS", 1080, 4], ["NBL", 920, 4], ["SBL", 920, 4], ["NBL", 1080, 4], ["SBL", 1080, 4],
];

const rowDef = { NBL: { road: "NBL", side: "N" }, SBL: { road: "SBL", side: "S" }, MBN: { side: "N" }, MBS: { side: "S" } };
const mbSeg = (col) => (col < 380 ? "MB1w" : col > 900 ? "MB1e" : "MB0");

const spec = PLAN.map(([row, col, t], i) => {
  const d = rowDef[row];
  const road = d.road || mbSeg(col);
  return { i, road, side: d.side, along: col, t, sb: (i % 3) * 2 };
});
const foot = {};
PLAN.forEach((_, i) => { foot[i] = [102 + (i % 4) * 7, 86 + (i % 3) * 4]; });

export default {
  id: "goldgrass",
  groundMode: "clearing",
  frontierGlyph: "wheat",
  terrainSeed: 88,
  setback: 14,
  plaza: { cx: 640, cy: 480, rx: 84, ry: 56 },
  landmark: { cx: 640, cy: 480, r: 30 }, // waystone → market cross → civic fountain → Golden Monument
  roads: [
    { id: "MB0", axis: "H", line: 480, half: 22, a: 380, b: 900, tier: 0, kind: "main" },
    { id: "MB1w", axis: "H", line: 480, half: 22, a: 120, b: 380, tier: 1, kind: "main" },
    { id: "MB1e", axis: "H", line: 480, half: 22, a: 900, b: 1160, tier: 1, kind: "main" },
    { id: "NBL", axis: "H", line: 320, half: 12, a: 160, b: 1120, tier: 1, kind: "lane" },
    { id: "SBL", axis: "H", line: 640, half: 12, a: 160, b: 1120, tier: 1, kind: "lane" },
    { id: "RRT", axis: "H", line: 168, half: 12, a: 200, b: 1080, tier: 3, kind: "lane" }, // ring — top
    { id: "RRB", axis: "H", line: 792, half: 12, a: 200, b: 1080, tier: 3, kind: "lane" }, // ring — bottom
    { id: "RRL", axis: "V", line: 114, half: 12, a: 168, b: 792, tier: 4, kind: "lane" },  // ring — left
    { id: "RRR", axis: "V", line: 1166, half: 12, a: 168, b: 792, tier: 4, kind: "lane" }, // ring — right
  ],
  foot,
  spec,
};
