// docs/zones — Aetherreach top-down layout (sky-archipelago). Each building rides its own floating
// islet; sky-bridges (spans) knit them; the empty sky / cloud is the receding frontier that fills with
// anchored islets each rung. Free-placed islets; bridges + clouds + aether-glow are features.
const P = [
  // [x, y, tier] — islets drift in and anchor outward from the Sky Citadel
  [560, 440, 0], [700, 360, 0], [820, 480, 0],
  [400, 520, 1], [560, 620, 1], [900, 600, 1],
  [280, 420, 2], [380, 700, 2], [980, 400, 2], [1040, 580, 2],
  [200, 560, 3], [500, 760, 3], [740, 720, 3], [1080, 700, 3],
  [156, 318, 4], [660, 820, 4], [920, 800, 4], [1120, 420, 4],
];
const sizes = [[104, 86], [98, 88], [108, 86], [100, 90]];
const spec = P.map(([x, y, t], i) => ({ i, free: [x, y], t, side: y < 470 ? "N" : "S" }));
const foot = {}; P.forEach((_, i) => { foot[i] = sizes[i % 4]; });

const LM = [700, 460];
const bridge = (a, b, t) => ({ kind: "span", pts: [a, b], w: 7, col: "#a89878", tier: t });

export default {
  id: "aetherreach",
  groundMode: "clearing",
  frontierGlyph: "cloud",
  terrainSeed: 12,
  setback: 14,
  landmark: { cx: LM[0], cy: LM[1], r: 30 }, // mooring mast → sky-beacon → aether spire → Sky Citadel
  roads: [],
  features: [
    { kind: "disc", cx: 700, cy: 470, r: 64, ry: 26, col: "#b89aff", glow: "#b89aff" }, // aether glow under the citadel
    bridge([560, 440], [700, 360], 0), bridge([700, 360], [820, 480], 0), bridge([560, 440], LM, 0),
    bridge([400, 520], [560, 440], 1), bridge([560, 620], [560, 440], 1), bridge([900, 600], [820, 480], 1),
    bridge([280, 420], [400, 520], 2), bridge([380, 700], [400, 520], 2), bridge([980, 400], [900, 600], 2), bridge([1040, 580], [900, 600], 2),
    bridge([200, 560], [280, 420], 3), bridge([500, 760], [560, 620], 3), bridge([740, 720], [560, 620], 3), bridge([1080, 700], [1040, 580], 3),
    bridge([156, 318], [280, 420], 4), bridge([660, 820], [500, 760], 4), bridge([920, 800], [740, 720], 4), bridge([1120, 420], [980, 400], 4),
  ],
  foot,
  spec,
};
