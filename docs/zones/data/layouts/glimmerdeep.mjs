// docs/zones — Glimmerdeep top-down layout (linked-chambers). A chain of lit caverns (clusters),
// each a district, joined by mine-cart tunnels (spans); unlit rock is the receding frontier and the
// glowing crystals are the light sources. Free-placed lots; crystals + tunnels are features.
const P = [
  // [x, y, tier] — chamber by chamber outward from the Heart Geode
  [540, 420, 0], [740, 420, 0], [640, 580, 0],                       // C0 — first lit cavern
  [240, 300, 1], [380, 300, 1], [300, 440, 1],                       // C1
  [340, 720, 2], [480, 720, 2], [360, 848, 2], [520, 848, 2],        // C2
  [880, 500, 3], [1020, 500, 3], [900, 640, 3], [1040, 640, 3],      // C3
  [820, 220, 4], [960, 200, 4], [1100, 244, 4], [880, 344, 4], [1024, 340, 4], [1140, 432, 4], // C4 — Geode City
];
const sizes = [[104, 88], [98, 86], [108, 90], [100, 88]];
const spec = P.map(([x, y, t], i) => ({ i, free: [x, y], t, side: y < 470 ? "N" : "S" }));
const foot = {}; P.forEach((_, i) => { foot[i] = sizes[i % 4]; });

const LM = [640, 470];
const tunnel = (a, b, t) => ({ kind: "span", pts: [a, b], w: 13, col: "#5a5278", tier: t });
const crystal = (cx, cy) => ({ kind: "disc", cx, cy, r: 18, ry: 13, col: "#2aa8c4", glow: "#5af0ff" });
// a lit chamber floor — a lighter rock disc so each district reads as its own glowing cavern
const chamber = (cx, cy, r, t) => ({ kind: "disc", cx, cy, r, ry: r * 0.78, col: "#3a3458", tier: t });

export default {
  id: "glimmerdeep",
  groundMode: "clearing",
  frontierGlyph: "crystal",
  terrainSeed: 19,
  setback: 14,
  landmark: { cx: LM[0], cy: LM[1], r: 30 }, // lantern post → geode shrine → resonant spire → Heart Geode
  roads: [],
  features: [
    // lit chamber floors first (under everything), revealed as each district opens
    chamber(640, 490, 150, 0), chamber(310, 360, 130, 1), chamber(430, 790, 140, 2), chamber(960, 560, 140, 3), chamber(990, 290, 180, 4),
    tunnel([540, 420], [300, 440], 1), tunnel([640, 580], [480, 720], 2), tunnel([740, 420], [880, 500], 3), tunnel([1020, 500], [1024, 340], 4),
    crystal(640, 360), crystal(300, 300), crystal(460, 856), crystal(900, 640), crystal(1100, 244),
  ],
  foot,
  spec,
};
