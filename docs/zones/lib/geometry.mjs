// docs/zones — shared layout geometry (Node). Resolves frontage spec → lots and verifies the
// growing-settlement contract. Imported by build.mjs (gates page emission) and layoutVerify.mjs.
const W = 1280, H = 960;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const segPts = (r) => r.pts ? r.pts : (r.axis === "H" ? [[r.a, r.line], [r.b, r.line]] : [[r.line, r.a], [r.line, r.b]]);

export function resolveLots(Z) {
  const byId = Object.fromEntries(Z.roads.map((r) => [r.id, r]));
  const setback = Z.setback || 14;
  return Z.spec.map((s) => {
    const f = (Z.foot && Z.foot[s.i]) || [110, 100], w = f[0], h = f[1];
    if (s.free) return { index: s.i, cx: s.free[0], cy: s.free[1], w, h, t: s.t, side: s.side };
    const rd = byId[s.road];
    if (!rd) throw new Error(`${Z.id}: spec ${s.i} references missing road "${s.road}"`);
    const half = rd.half, sb = setback + (s.sb || 0), jx = ((s.i * 37) % 9 - 4);
    let cx, cy;
    if (rd.axis === "H") { cx = s.along + jx; cy = s.side === "N" ? rd.line - half - sb - h / 2 : rd.line + half + sb + h / 2; }
    else { cy = s.along + jx; cx = s.side === "W" ? rd.line - half - sb - w / 2 : rd.line + half + sb + w / 2; }
    cx = clamp(cx, 34 + w / 2, W - 34 - w / 2); cy = clamp(cy, 34 + h / 2, H - 34 - h / 2);
    return { index: s.i, cx, cy, w, h, t: s.t, side: s.side };
  });
}

function segRectDist(p0, p1, l) {
  let best = 1e9;
  const n = Math.max(8, Math.ceil(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / 6)), hx = l.w / 2, hy = l.h / 2;
  for (let k = 0; k <= n; k++) {
    const x = p0[0] + (p1[0] - p0[0]) * k / n, y = p0[1] + (p1[1] - p0[1]) * k / n;
    const dx = Math.max(Math.abs(x - l.cx) - hx, 0), dy = Math.max(Math.abs(y - l.cy) - hy, 0);
    best = Math.min(best, Math.hypot(dx, dy));
  }
  return best;
}
const rectsOverlap = (a, b, gap) => Math.abs(a.cx - b.cx) < (a.w + b.w) / 2 + gap && Math.abs(a.cy - b.cy) < (a.h + b.h) / 2 + gap;

export function verifyLayout(Z, zoneSpec) {
  const problems = [];
  const lots = resolveLots(Z);
  for (const l of lots) if (l.cx - l.w / 2 < 16 || l.cx + l.w / 2 > W - 16 || l.cy - l.h / 2 < 16 || l.cy + l.h / 2 > H - 16) problems.push(`lot ${l.index} out of bounds`);
  for (let i = 0; i < lots.length; i++) for (let j = i + 1; j < lots.length; j++) if (rectsOverlap(lots[i], lots[j], 6)) problems.push(`lot ${lots[i].index} overlaps lot ${lots[j].index}`);
  for (const l of lots) for (const r of Z.roads) { const p = segPts(r); let d = 1e9; for (let k = 0; k < p.length - 1; k++) d = Math.min(d, segRectDist(p[k], p[k + 1], l)); if (d < r.half - 1) problems.push(`lot ${l.index} overlaps road "${r.id}"`); }
  if (Z.landmark) for (const l of lots) { const dx = Math.max(Math.abs(l.cx - Z.landmark.cx) - l.w / 2, 0), dy = Math.max(Math.abs(l.cy - Z.landmark.cy) - l.h / 2, 0); if (Math.hypot(dx, dy) < (Z.landmark.r || 22) + 8) problems.push(`lot ${l.index} overlaps the landmark`); }
  if (Z.plaza) for (const l of lots) { const ddx = Math.max(Math.abs(l.cx - Z.plaza.cx) - l.w / 2, 0), ddy = Math.max(Math.abs(l.cy - Z.plaza.cy) - l.h / 2, 0); if ((ddx / Z.plaza.rx) ** 2 + (ddy / Z.plaza.ry) ** 2 < 1) problems.push(`lot ${l.index} overlaps the plaza`); }
  if (zoneSpec) {
    for (let tier = 0; tier < zoneSpec.tiers.length; tier++) { const shown = lots.filter((l) => l.t <= tier).length, want = zoneSpec.tiers[tier].plots; if (shown !== want) problems.push(`tier ${tier} reveals ${shown} plots, ladder wants ${want}`); }
    if (lots.length !== zoneSpec.tiers.at(-1).plots) problems.push(`total lots ${lots.length} ≠ final ladder ${zoneSpec.tiers.at(-1).plots}`);
  }
  if (new Set(lots.map((l) => l.index)).size !== lots.length) problems.push(`duplicate lot indices`);
  return { lots, problems };
}
