// docs/zones — Thornwild Canopy top-down layout (canopy-platforms). Platforms ring giant trunks and
// climb the canopy, linked by rope/vine bridges (spans). Growth reaches higher and spans to new trees;
// the thornvine undergrowth is the receding frontier. Platforms are free-placed; trunks are discs.
const P = [
  // [x, y, tier] — climbs out from the great-tree hearth; indices follow this order (stable/additive)
  [520, 440, 0], [680, 300, 0], [840, 440, 0],
  [380, 560, 1], [560, 620, 1], [820, 600, 1],
  [260, 440, 2], [320, 720, 2], [960, 580, 2], [1040, 400, 2],
  [200, 660, 3], [480, 820, 3], [700, 820, 3], [1080, 640, 3], [900, 780, 3],
];
const sizes = [[106, 88], [98, 86], [108, 90], [102, 88]];
const spec = P.map(([x, y, t], i) => ({ i, free: [x, y], t, side: y < 470 ? "N" : "S" }));
const foot = {}; P.forEach((_, i) => { foot[i] = sizes[i % 4]; });

const LM = [680, 440];
const span = (a, b, t) => ({ kind: "span", pts: [a, b], w: 8, tier: t });

export default {
  id: "thornwild",
  groundMode: "clearing",
  frontierGlyph: "tree",
  terrainSeed: 71,
  setback: 14,
  landmark: { cx: LM[0], cy: LM[1], r: 30 }, // burl hearth → grove totem → sunlight loom → Highcrown
  roads: [],
  features: [
    { kind: "disc", cx: 580, cy: 470, r: 54, ry: 50, col: "#3a2a1a" }, // great trunks
    { kind: "disc", cx: 880, cy: 500, r: 48, ry: 46, col: "#3a2a1a" },
    { kind: "disc", cx: 300, cy: 600, r: 46, ry: 44, col: "#3a2a1a" },
    span([520, 440], [680, 300], 0), span([680, 300], [840, 440], 0), span([680, 300], LM, 0),
    span([380, 560], [520, 440], 1), span([560, 620], LM, 1), span([820, 600], [840, 440], 1),
    span([260, 440], [380, 560], 2), span([320, 720], [380, 560], 2), span([960, 580], [820, 600], 2), span([1040, 400], [960, 580], 2),
    span([200, 660], [260, 440], 3), span([480, 820], [560, 620], 3), span([700, 820], [560, 620], 3), span([1080, 640], [1040, 400], 3), span([900, 780], [960, 580], 3),
  ],
  foot,
  spec,
};
