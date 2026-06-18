// docs/zones — Sunspire Oasis top-down layout (oasis-rings). Concentric rings wrap a central oasis,
// caravan spokes radiate out; the inner ring founds first (rungs 0–1), the outer ring fills the rest
// (rungs 2–4). Encroaching dunes are the receding frontier. Circular rings keep a uniform radial gap.
import { ringLots, arcRoad, footFrom, DEG } from "../../lib/layoutHelpers.mjs";

const cx = 640, cy = 470, TAU = Math.PI * 2;
const sizes = [[104, 88], [98, 86], [108, 90], [100, 88], [106, 86], [102, 90]];

const inner = ringLots({ cx, cy, rx: 205, ry: 205, from: 0, to: TAU * 5 / 6, count: 6, t: 0, startIndex: 0, foot: sizes });
inner.forEach((e, k) => { e.t = (k % 2 === 0) ? 0 : 1; }); // founding wells (t0) then infill (t1)
const outer = ringLots({ cx, cy, rx: 385, ry: 385, from: TAU / 28, to: TAU / 28 + TAU * 13 / 14, count: 14, t: 2, startIndex: 6, foot: sizes });
outer.forEach((e, k) => { e.t = k < 4 ? 2 : k < 8 ? 3 : 4; });

const all = [...inner, ...outer].sort((a, b) => a.t - b.t);
all.forEach((e, i) => { e.i = i; });
const foot = footFrom(all);

const roads = [
  arcRoad({ id: "R0", cx, cy, rx: 120, ry: 120, from: 0, to: TAU, t: 0, half: 12, steps: 40 }),
  arcRoad({ id: "R1", cx, cy, rx: 300, ry: 300, from: 0, to: TAU, t: 2, half: 12, steps: 48 }),
];
// short caravan spokes in the inner-ring gaps (don't reach the dense outer ring)
[30, 150, 210, 330].forEach((deg, k) => {
  const a = deg * DEG;
  roads.push({ id: "SP" + k, pts: [[Math.round(cx + 44 * Math.cos(a)), Math.round(cy + 44 * Math.sin(a))], [Math.round(cx + 298 * Math.cos(a)), Math.round(cy + 298 * Math.sin(a))]], half: 11, tier: k < 2 ? 1 : 3, kind: "lane" });
});

export default {
  id: "sunspire",
  groundMode: "clearing",
  frontierGlyph: "dune",
  terrainSeed: 33,
  setback: 14,
  landmark: { cx, cy, r: 30 }, // wellhead → sundial spire → grand sundial → the Sunspire
  features: [{ kind: "pool", cx, cy, rx: 92, ry: 54, tier: 0 }], // the oasis
  roads,
  foot,
  spec: all,
};
