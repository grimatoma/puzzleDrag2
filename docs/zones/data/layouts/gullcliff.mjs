// docs/zones — Gullcliff top-down layout (vertical-cliff). Carved cliff shelves stack up the rock
// face (one per tier); switchback stairs / a cargo lift connect them; the sea fills the right; the
// harbour sits at the base. Bare cliff rock is the receding frontier; the beacon is the landmark.
export default {
  id: "gullcliff",
  groundMode: "clearing",
  frontierGlyph: "rock",
  terrainSeed: 23,
  setback: 14,
  landmark: { cx: 360, cy: 176, r: 26 }, // watch-lantern → stone beacon → lighthouse → great headland beacon
  features: [
    { kind: "band", x: 726, y: 0, w: 554, h: 960, col: "#3a7a9a", tier: 0 }, // the sea
    { kind: "lake", cx: 660, cy: 866, rx: 96, ry: 46, tier: 0 },             // tide-pool harbour at the base
  ],
  roads: [
    { id: "S0", axis: "H", line: 786, half: 14, a: 120, b: 560, tier: 0, kind: "main" },
    { id: "S1", axis: "H", line: 632, half: 14, a: 120, b: 626, tier: 1, kind: "main" },
    { id: "S2", axis: "H", line: 482, half: 14, a: 120, b: 668, tier: 2, kind: "main" },
    { id: "S3", axis: "H", line: 338, half: 14, a: 120, b: 612, tier: 3, kind: "main" },
    { id: "L01", pts: [[600, 778], [648, 652]], half: 11, tier: 1, kind: "lane" }, // stair up
    { id: "L12", pts: [[636, 624], [672, 500]], half: 11, tier: 2, kind: "lane" },
    { id: "L23", pts: [[660, 476], [660, 356]], half: 11, tier: 3, kind: "lane" },
    { id: "LIFT", pts: [[702, 800], [682, 360]], half: 12, tier: 1, kind: "lane", col: "#c4502a" }, // cargo lift line to the top
  ],
  foot: { 0: [118, 96], 1: [110, 92], 2: [120, 98], 3: [112, 94], 4: [118, 92], 5: [108, 96],
    6: [114, 94], 7: [120, 98], 8: [106, 92], 9: [116, 96], 10: [110, 94], 11: [118, 92],
    12: [112, 96], 13: [108, 94], 14: [120, 96] },
  spec: [
    { i: 0, road: "S0", side: "N", along: 200, t: 0, sb: 2 },
    { i: 1, road: "S0", side: "N", along: 360, t: 0, sb: 0 },
    { i: 2, road: "S0", side: "N", along: 510, t: 0, sb: 4 },
    { i: 3, road: "S1", side: "N", along: 200, t: 1, sb: 2 },
    { i: 4, road: "S1", side: "N", along: 370, t: 1, sb: 0 },
    { i: 5, road: "S1", side: "N", along: 540, t: 1, sb: 4 },
    { i: 6, road: "S2", side: "N", along: 170, t: 2, sb: 0 },
    { i: 7, road: "S2", side: "N", along: 310, t: 2, sb: 4 },
    { i: 8, road: "S2", side: "N", along: 450, t: 2, sb: 0 },
    { i: 9, road: "S2", side: "N", along: 588, t: 2, sb: 2 },
    { i: 10, road: "S3", side: "N", along: 170, t: 3, sb: 2 },
    { i: 11, road: "S3", side: "N", along: 310, t: 3, sb: 0 },
    { i: 12, road: "S3", side: "N", along: 450, t: 3, sb: 4 },
    { i: 13, road: "S3", side: "N", along: 588, t: 3, sb: 0 },
    { i: 14, free: [556, 858], t: 3, side: "N" }, // harbour-side fish house at the base
  ],
};
