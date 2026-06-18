// docs/zones — Mirefen Hollow top-down layout (ribbon-stilt over water) on the 40×30 @ 32px grid.
// Boardwalks ARE the roads; stilt platforms front them; reeds are the receding frontier in open water.
// Palette + tier names/plots/captions are merged in from zones.mjs by build.mjs.
export default {
  id: "mirefen",
  groundMode: "water",
  frontierGlyph: "reed",
  terrainSeed: 41,
  setback: 16,
  landmark: { cx: 570, cy: 392, r: 24 }, // staged reed-shrine → Heron Gate beacon, between back lane and spine
  features: [
    { kind: "band", x: 1140, y: 384, w: 124, h: 196, col: "#24403d" }, // fishing-board channel (right edge)
    { kind: "pool", cx: 230, cy: 800, rx: 96, ry: 56, tier: 0 },        // open lily lagoon (sw)
    { kind: "pool", cx: 880, cy: 808, rx: 116, ry: 58, tier: 0 },       // deepwater channel (se)
  ],
  roads: [
    { id: "HS0", axis: "H", line: 480, half: 14, a: 360, b: 760, tier: 0, kind: "boardwalk" },
    { id: "HS1w", axis: "H", line: 480, half: 14, a: 200, b: 360, tier: 1, kind: "boardwalk" },
    { id: "HS1e", axis: "H", line: 480, half: 14, a: 760, b: 950, tier: 1, kind: "boardwalk" },
    { id: "HS2w", axis: "H", line: 480, half: 14, a: 84, b: 200, tier: 2, kind: "boardwalk" },
    { id: "HS3e", axis: "H", line: 480, half: 14, a: 950, b: 1120, tier: 3, kind: "boardwalk" },
    { id: "NBL", axis: "H", line: 300, half: 11, a: 240, b: 940, tier: 2, kind: "boardwalk" }, // north back lane
    { id: "NC", axis: "V", line: 500, half: 10, a: 300, b: 480, tier: 2, kind: "boardwalk" },  // connector to the spine
    { id: "SB", axis: "V", line: 540, half: 11, a: 490, b: 700, tier: 3, kind: "boardwalk" },  // south branch into the lagoon
  ],
  // varied platform footprints kill the uniform-square read
  foot: { 0: [120, 100], 1: [112, 96], 2: [124, 104], 3: [108, 100], 4: [120, 96], 5: [116, 104],
    6: [110, 98], 7: [120, 100], 8: [104, 104], 9: [114, 96], 10: [110, 100], 11: [118, 100],
    12: [112, 98], 13: [108, 104], 14: [114, 100] },
  spec: [
    // tier 0 — 3 platforms on the first spine stretch (HS0), centre kept clear for the shrine
    { i: 0, road: "HS0", side: "N", along: 420, t: 0, sb: 2 },
    { i: 1, road: "HS0", side: "N", along: 700, t: 0, sb: 0 },
    { i: 2, road: "HS0", side: "S", along: 760, t: 0, sb: 4 },
    // tier 1 — spine pushes both ways
    { i: 3, road: "HS1w", side: "N", along: 280, t: 1, sb: 2 },
    { i: 4, road: "HS1w", side: "S", along: 330, t: 1, sb: 0 },
    { i: 5, road: "HS1e", side: "N", along: 844, t: 1, sb: 4 },
    // tier 2 — the north back lane opens with its own row of stilt-houses
    { i: 6, road: "HS2w", side: "N", along: 150, t: 2, sb: 2 },
    { i: 7, road: "NBL", side: "N", along: 360, t: 2, sb: 2 },
    { i: 8, road: "NBL", side: "N", along: 620, t: 2, sb: 0 },
    { i: 9, road: "NBL", side: "N", along: 840, t: 2, sb: 4 },
    // tier 3 — the south branch dips into the lagoon, the far-east channel opens
    { i: 10, road: "HS3e", side: "N", along: 985, t: 3, sb: 2 },
    { i: 11, road: "HS3e", side: "N", along: 1108, t: 3, sb: 4 },
    { i: 12, road: "HS3e", side: "S", along: 1045, t: 3, sb: 0 },
    { i: 13, road: "SB", side: "W", along: 600, t: 3, sb: 2 },
    { i: 14, road: "SB", side: "E", along: 600, t: 3, sb: 0 },
  ],
};
