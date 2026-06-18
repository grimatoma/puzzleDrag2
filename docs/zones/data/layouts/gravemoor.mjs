// docs/zones — Gravemoor top-down layout (reclaimed-grid). You UNCOVER a buried orthogonal grid of
// ruined streets and re-raise buildings on the ancient footings; the blight-fog recedes to hallowed
// cobble as each rung is reclaimed. Two old high streets (segmented) + a central cross + the warding
// bell plaza. 15 plots across 4 rungs.

const PLAN = [
  // [row, col, tier] — reclaimed centre-outward; indices follow this order (stable/additive)
  ["HAS", 460, 0], ["HBN", 460, 0], ["HAN", 460, 0],
  ["HAS", 740, 1], ["HBN", 740, 1], ["HBS", 460, 1],
  ["HAS", 320, 2], ["HBN", 320, 2], ["HAN", 320, 2], ["HBS", 320, 2],
  ["HAS", 880, 3], ["HBN", 880, 3], ["HAN", 740, 3], ["HAN", 880, 3], ["HBS", 740, 3],
];
const rowDef = { HAN: { line: 360, side: "N" }, HAS: { line: 360, side: "S" }, HBN: { line: 620, side: "N" }, HBS: { line: 620, side: "S" } };
const seg = (line, col) => { const p = line === 360 ? "HA" : "HB"; return col < 420 ? p + "_w" : col > 660 ? p + "_e" : p + "0"; };

const spec = PLAN.map(([row, col, t], i) => ({ i, road: seg(rowDef[row].line, col), side: rowDef[row].side, along: col, t, sb: (i % 3) * 2 }));
const foot = {};
PLAN.forEach((_, i) => { foot[i] = [96 + (i % 4) * 7, 84 + (i % 2) * 6]; });

export default {
  id: "gravemoor",
  groundMode: "clearing",
  frontierGlyph: "fog",
  terrainSeed: 66,
  setback: 14,
  plaza: { cx: 600, cy: 490, rx: 62, ry: 56 },
  landmark: { cx: 600, cy: 490, r: 26 }, // warding fire → broken shrine → consecrated bell → the Dawnlight
  roads: [
    { id: "HA0", axis: "H", line: 360, half: 13, a: 420, b: 660, tier: 0, kind: "main" },
    { id: "HA_w", axis: "H", line: 360, half: 13, a: 160, b: 420, tier: 2, kind: "main" },
    { id: "HA_e", axis: "H", line: 360, half: 13, a: 660, b: 1080, tier: 1, kind: "main" },
    { id: "HB0", axis: "H", line: 620, half: 13, a: 420, b: 660, tier: 0, kind: "main" },
    { id: "HB_w", axis: "H", line: 620, half: 13, a: 160, b: 420, tier: 1, kind: "main" },
    { id: "HB_e", axis: "H", line: 620, half: 13, a: 660, b: 1080, tier: 1, kind: "main" },
    { id: "VC", axis: "V", line: 600, half: 12, a: 200, b: 760, tier: 0, kind: "lane" }, // the old cross-street through the square
  ],
  foot,
  spec,
};
