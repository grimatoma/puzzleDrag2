// docs/zones — Hoarfrost Hold top-down layout (sheltered-hollow). The town huddles in two arcs around
// a steaming hot-spring (the warm heart): the inner arc fills first (rungs 0–1), then the outer arc
// (rungs 2–3) — growth radiates outward but clings to the warmth. Deep snow is the receding frontier.
import { ringLots, arcRoad, footFrom, DEG } from "../../lib/layoutHelpers.mjs";

const cx = 640, cy = 430;
const sizes = [[106, 88], [100, 86], [108, 90], [102, 88], [106, 86], [104, 90]];

// CIRCULAR rings (uniform radial gap at every angle — ellipses collapse the gap off-axis).
// inner arc: 6 longhouses; the south-facing centre (t0) then the flanks (t1)
const inner = ringLots({ cx, cy, rx: 268, ry: 268, from: -58 * DEG, to: 240 * DEG, count: 6, t: 0, startIndex: 0, foot: sizes });
inner.forEach((e, k) => { e.t = (k >= 1 && k <= 3) ? 0 : 1; });
// outer arc: 9 longhouses behind a windbreak; centre (t2) then the flanks (t3)
const outer = ringLots({ cx, cy, rx: 440, ry: 440, from: -52 * DEG, to: 236 * DEG, count: 9, t: 2, startIndex: 6, foot: sizes });
outer.forEach((e, k) => { e.t = (k >= 2 && k <= 5) ? 2 : 3; });

const all = [...inner, ...outer].sort((a, b) => a.t - b.t);
all.forEach((e, i) => { e.i = i; });
const foot = footFrom(all);

const roads = [
  arcRoad({ id: "R0", cx, cy, rx: 180, ry: 180, from: -58 * DEG, to: 240 * DEG, t: 0, half: 12 }),
  arcRoad({ id: "R1", cx, cy, rx: 354, ry: 354, from: -52 * DEG, to: 236 * DEG, t: 2, half: 12 }),
];

export default {
  id: "hoarfrost",
  groundMode: "clearing",
  frontierGlyph: "pine",
  terrainSeed: 51,
  setback: 14,
  landmark: { cx, cy, r: 30 }, // cairn firepit → spring shrine → aurora bell → the Warm Hall
  features: [{ kind: "pool", cx, cy: cy + 8, rx: 80, ry: 42, tier: 0 }], // the steaming hot-spring
  roads,
  foot,
  spec: all,
};
