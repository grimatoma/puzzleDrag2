// docs/zones — Cinderhold top-down layout (switchback-terrace). Horizontal cooled-obsidian terraces
// stack UP the slope (one per tier); switchback roads connect their ends; buildings front each terrace.
// The lava channel + raw basalt is the receding frontier; the summit furnace is the staged landmark.
export default {
  id: "cinderhold",
  groundMode: "clearing",
  frontierGlyph: "rock",
  terrainSeed: 17,
  setback: 14,
  landmark: { cx: 640, cy: 122, r: 26 }, // summit brazier → tap-furnace → great forge → Magma Crown
  features: [
    { kind: "lava", pts: [[1086, 110], [1044, 300], [1092, 470], [1048, 660], [1100, 900]], w: 22, tier: 0 },
    { kind: "lava", pts: [[150, 130], [120, 360], [150, 620], [120, 900]], w: 16, tier: 0 },
  ],
  roads: [
    { id: "T0", axis: "H", line: 810, half: 14, a: 360, b: 820, tier: 0, kind: "main" },
    { id: "T1", axis: "H", line: 650, half: 14, a: 320, b: 860, tier: 1, kind: "main" },
    { id: "T2", axis: "H", line: 490, half: 14, a: 300, b: 900, tier: 2, kind: "main" },
    { id: "T3", axis: "H", line: 330, half: 14, a: 360, b: 840, tier: 3, kind: "main" },
    { id: "C01", pts: [[806, 798], [850, 664]], half: 11, tier: 1, kind: "lane" }, // switchback right
    { id: "C12", pts: [[332, 638], [314, 504]], half: 11, tier: 2, kind: "lane" }, // switchback left
    { id: "C23", pts: [[896, 504], [838, 344]], half: 11, tier: 3, kind: "lane" }, // switchback right
  ],
  foot: { 0: [120, 92], 1: [108, 90], 2: [122, 92], 3: [110, 90], 4: [118, 90], 5: [106, 92],
    6: [112, 90], 7: [120, 92], 8: [104, 90], 9: [114, 90], 10: [110, 92], 11: [118, 90],
    12: [110, 92], 13: [108, 90] },
  spec: [
    // each terrace's houses front it from the uphill (north) side, so the town visibly climbs
    { i: 0, road: "T0", side: "N", along: 420, t: 0, sb: 2 },
    { i: 1, road: "T0", side: "N", along: 600, t: 0, sb: 0 },
    { i: 2, road: "T0", side: "N", along: 720, t: 0, sb: 4 },
    { i: 3, road: "T1", side: "N", along: 420, t: 1, sb: 2 },
    { i: 4, road: "T1", side: "N", along: 600, t: 1, sb: 0 },
    { i: 5, road: "T1", side: "N", along: 776, t: 1, sb: 4 },
    { i: 6, road: "T2", side: "N", along: 360, t: 2, sb: 0 },
    { i: 7, road: "T2", side: "N", along: 500, t: 2, sb: 4 },
    { i: 8, road: "T2", side: "N", along: 640, t: 2, sb: 0 },
    { i: 9, road: "T2", side: "N", along: 780, t: 2, sb: 2 },
    { i: 10, road: "T3", side: "N", along: 424, t: 3, sb: 2 },
    { i: 11, road: "T3", side: "N", along: 562, t: 3, sb: 0 },
    { i: 12, road: "T3", side: "N", along: 700, t: 3, sb: 4 },
    { i: 13, road: "T3", side: "N", along: 818, t: 3, sb: 0 },
  ],
};
