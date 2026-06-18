// docs/zones — authoring helpers for layout data files (Node, import-time only).
// Generate ring/arc geometry for radial topologies as plain spec/road objects with computed
// coordinates, so the same H/V/pts road + free-lot model handles concentric and grid layouts alike.

/** Lots evenly spread on an ellipse arc, each facing inward (door edge toward the centre). */
export function ringLots({ cx, cy, rx, ry, from, to, count, t, startIndex, foot }) {
  const out = [];
  for (let k = 0; k < count; k++) {
    const a = count === 1 ? (from + to) / 2 : from + (to - from) * k / (count - 1);
    const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    const side = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? (Math.cos(a) > 0 ? "W" : "E") : (Math.sin(a) > 0 ? "N" : "S");
    const e = { i: startIndex + k, free: [Math.round(x), Math.round(y)], t, side };
    if (foot) e._foot = foot[k % foot.length];
    out.push(e);
  }
  return out;
}

/** An elliptical-arc road approximated by a points polyline. */
export function arcRoad({ id, cx, cy, rx, ry, from, to, t, half = 12, kind = "lane", steps = 30 }) {
  const pts = [];
  for (let k = 0; k <= steps; k++) { const a = from + (to - from) * k / steps; pts.push([Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry)]); }
  return { id, pts, half, tier: t, kind };
}

/** Build a foot map from spec entries that carry a private _foot, falling back to a default. */
export function footFrom(spec, fallback = [110, 100]) {
  const foot = {};
  for (const s of spec) foot[s.i] = s._foot || fallback;
  return foot;
}

export const DEG = Math.PI / 180;
