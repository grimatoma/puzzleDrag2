/* docs/zones — shared TOP-DOWN layout engine (Pass 2).
 * Renders a zone's growing settlement on the real game grid (40×30 @ 32px = 1280×960), roads-first:
 * roads are laid per tier, buildings front them at a setback, the wilderness frontier recedes as the
 * town grows, and a staged landmark levels up in place. This is the flat-colour mockup that ports 1:1
 * to src/ui/town/townMaps.ts. Data comes from window.LAYOUT_DATA[zoneId]; geometry is verified headless
 * (no plot overlaps a road / plaza / another plot) by layoutVerify.mjs before it's trusted.
 * Inlined into each per-zone doc by build.mjs. No external assets. */
(function () {
  "use strict";
  const DATA = window.LAYOUT_DATA || {};
  const RM = matchMedia("(prefers-reduced-motion:reduce)").matches;
  const W = 1280, H = 960, TILE = 32, COLS = 40, ROWS = 30;
  const TAU = Math.PI * 2;
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function mb(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function shade(hex, f) { const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255; if (f >= 0) { r = lerp(r, 255, f); gg = lerp(gg, 255, f); b = lerp(b, 255, f); } else { const k = 1 + f; r *= k; gg *= k; b *= k; } return "rgb(" + (r | 0) + "," + (gg | 0) + "," + (b | 0) + ")"; }
  function segPts(r) { return r.pts ? r.pts : (r.axis === "H" ? [[r.a, r.line], [r.b, r.line]] : [[r.line, r.a], [r.line, r.b]]); }
  function distSeg(x, y, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy; let t = L ? ((x - ax) * dx + (y - ay) * dy) / L : 0; t = clamp(t, 0, 1); return Math.hypot(x - (ax + dx * t), y - (ay + dy * t)); }

  // ── resolve frontage SPEC → LOTS (buildings beside roads, never on them) ─────
  function resolveLots(Z) {
    const byId = Object.fromEntries(Z.roads.map((r) => [r.id, r]));
    return Z.spec.map((s) => {
      const f = (Z.foot && Z.foot[s.i]) || [110, 100], w = f[0], h = f[1];
      if (s.free) return { index: s.i, cx: s.free[0], cy: s.free[1], w, h, t: s.t, side: s.side || "N" };
      const rd = byId[s.road]; const half = rd.half; const sb = (Z.setback || 14) + (s.sb || 0);
      const jx = ((s.i * 37) % 9 - 4);
      let cx, cy;
      if (rd.axis === "H") { cx = s.along + jx; cy = s.side === "N" ? rd.line - half - sb - h / 2 : rd.line + half + sb + h / 2; }
      else { cy = s.along + jx; cx = s.side === "W" ? rd.line - half - sb - w / 2 : rd.line + half + sb + w / 2; }
      cx = clamp(cx, 34 + w / 2, W - 34 - w / 2); cy = clamp(cy, 34 + h / 2, H - 34 - h / 2);
      return { index: s.i, cx, cy, w, h, t: s.t, side: s.side };
    });
  }

  // ── per-topology terrain (top-down, flat colour) ────────────────────────────
  function paintGround(g, Z, lots, tier) {
    const P = Z.palette, seed = Z.terrainSeed || 7, rnd = mb(seed ^ (tier * 2654435761));
    const nearRoad = (x, y, pad) => Z.roads.some((r) => { if (r.tier > tier) return false; const p = segPts(r); for (let k = 0; k < p.length - 1; k++) if (distSeg(x, y, p[k][0], p[k][1], p[k + 1][0], p[k + 1][1]) <= r.half + pad) return true; return false; });
    const onLot = (x, y, m) => lots.some((l) => l.t <= tier && Math.abs(x - l.cx) < l.w / 2 + m && Math.abs(y - l.cy) < l.h / 2 + m);
    const inPlaza = (x, y, pad) => Z.plaza && ((x - Z.plaza.cx) / (Z.plaza.rx + (pad || 0))) ** 2 + ((y - Z.plaza.cy) / (Z.plaza.ry + (pad || 0))) ** 2 <= 1;
    const nearLM = (x, y) => Z.landmark && Math.hypot(x - Z.landmark.cx, y - Z.landmark.cy) < (Z.landmark.r || 36) + 30;
    const nearSpan = (x, y, pad) => (Z.features || []).some((ft) => { if (ft.kind !== "span" || (ft.tier !== undefined && ft.tier > tier)) return false; for (let k = 0; k < ft.pts.length - 1; k++) if (distSeg(x, y, ft.pts[k][0], ft.pts[k][1], ft.pts[k + 1][0], ft.pts[k + 1][1]) <= (ft.w || 8) + pad) return true; return false; });
    const cleared = (x, y) => nearRoad(x, y, 70) || onLot(x, y, 20) || inPlaza(x, y, 10) || nearLM(x, y) || nearSpan(x, y, 38);
    const water = Z.groundMode === "water";

    // base fill
    g.fillStyle = water ? P.surface : (P.frontierFill || shade(P.ground, -0.16));
    g.fillRect(0, 0, W, H);
    // tile-granular ground vs frontier
    for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
      const cx = tx * TILE + 16, cy = ty * TILE + 16, cl = cleared(cx, cy);
      if (water) { if (cl) { g.fillStyle = shade(P.ground, .04 + (rnd() < .5 ? .05 : 0)); g.fillRect(tx * TILE, ty * TILE, TILE, TILE); } }
      else { g.fillStyle = cl ? shade(P.ground, rnd() < .18 ? .07 : 0) : (P.frontierFill || shade(P.ground, -0.16)); g.fillRect(tx * TILE, ty * TILE, TILE, TILE); }
    }
    // soft tonal blotches
    g.save(); for (let i = 0; i < 26; i++) { const x = rnd() * W, y = rnd() * H, r = 50 + rnd() * 150; const gr = g.createRadialGradient(x, y, 0, x, y, r); const dk = rnd() < .5; gr.addColorStop(0, dk ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.05)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } g.restore();

    // special features (pools, lava, lakes, chasms…) drawn declaratively
    for (const ft of (Z.features || [])) drawFeature(g, ft, P, tier);

    // water shimmer
    if (water) { g.save(); g.globalCompositeOperation = "screen"; g.strokeStyle = "rgba(255,255,255,.08)"; g.lineWidth = 2; for (let y = 40; y < H; y += 80) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } g.restore(); }

    // frontier dressing (the receding wilderness glyphs) in the un-cleared zone — but never over
    // an opaque feature (sea / lake / pool), which would scatter forest on the water.
    const inFeat = (x, y) => (Z.features || []).some((ft) => {
      if (ft.tier !== undefined && ft.tier > tier) return false;
      if (ft.kind === "band") return x >= ft.x && x <= ft.x + ft.w && y >= ft.y && y <= ft.y + ft.h;
      if (ft.kind === "lake" || ft.kind === "pool") return ((x - ft.cx) / ft.rx) ** 2 + ((y - ft.cy) / ft.ry) ** 2 <= 1;
      if (ft.kind === "disc") return ((x - ft.cx) / ft.r) ** 2 + ((y - ft.cy) / (ft.ry || ft.r)) ** 2 <= 1.3;
      if (ft.kind === "span") { for (let k = 0; k < ft.pts.length - 1; k++) if (distSeg(x, y, ft.pts[k][0], ft.pts[k][1], ft.pts[k + 1][0], ft.pts[k + 1][1]) <= (ft.w || 8) + 5) return true; return false; }
      return false;
    });
    const glyph = Z.frontierGlyph || "tree";
    const dr = mb((seed * 131) ^ (tier * 40503));
    for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
      const cx = tx * TILE + 8 + dr() * 16, cy = ty * TILE + 8 + dr() * 16;
      if (cleared(cx, cy) || inFeat(cx, cy)) continue; if (dr() > 0.34) continue;
      drawFrontierGlyph(g, glyph, cx, cy, P, dr);
    }
    return { cleared, nearRoad, onLot, inPlaza };
  }

  function drawFeature(g, ft, P, tier) {
    if (ft.tier !== undefined && ft.tier > tier) return;
    g.save();
    if (ft.kind === "pool" || ft.kind === "lake") { g.fillStyle = P.surface; g.beginPath(); g.ellipse(ft.cx, ft.cy, ft.rx, ft.ry, 0, 0, TAU); g.fill(); g.fillStyle = P.surface2; g.beginPath(); g.ellipse(ft.cx, ft.cy, ft.rx * 0.7, ft.ry * 0.7, 0, 0, TAU); g.fill(); g.save(); g.globalCompositeOperation = "screen"; g.fillStyle = "rgba(255,255,255,.12)"; g.beginPath(); g.ellipse(ft.cx - ft.rx * .2, ft.cy - ft.ry * .2, ft.rx * .4, ft.ry * .3, 0, 0, TAU); g.fill(); g.restore(); }
    else if (ft.kind === "lava") { g.save(); g.shadowColor = P.glow; g.shadowBlur = 16; g.strokeStyle = P.surface; g.lineWidth = ft.w || 22; g.lineCap = "round"; g.beginPath(); g.moveTo(ft.pts[0][0], ft.pts[0][1]); for (let i = 1; i < ft.pts.length; i++) g.lineTo(ft.pts[i][0], ft.pts[i][1]); g.stroke(); g.restore(); g.strokeStyle = P.glow; g.lineWidth = (ft.w || 22) * 0.4; g.lineCap = "round"; g.beginPath(); g.moveTo(ft.pts[0][0], ft.pts[0][1]); for (let i = 1; i < ft.pts.length; i++) g.lineTo(ft.pts[i][0], ft.pts[i][1]); g.stroke(); }
    else if (ft.kind === "chasm") { g.fillStyle = P.dark || "#000"; g.beginPath(); g.moveTo(ft.pts[0][0], ft.pts[0][1]); for (let i = 1; i < ft.pts.length; i++) g.lineTo(ft.pts[i][0], ft.pts[i][1]); g.closePath(); g.fill(); }
    else if (ft.kind === "band") { g.fillStyle = ft.col || shade(P.ground, -.1); g.fillRect(ft.x, ft.y, ft.w, ft.h); }
    else if (ft.kind === "disc") { g.fillStyle = ft.col || shade(P.path, -.1); g.beginPath(); g.ellipse(ft.cx, ft.cy, ft.r, ft.ry || ft.r, 0, 0, TAU); g.fill(); if (ft.glow) { g.save(); g.globalCompositeOperation = "screen"; g.fillStyle = ft.glow; g.globalAlpha = .5; g.beginPath(); g.ellipse(ft.cx, ft.cy, ft.r * 1.5, (ft.ry || ft.r) * 1.5, 0, 0, TAU); g.fill(); g.restore(); } }
    else if (ft.kind === "span") { // decorative bridge / cart-rail / sky-bridge between platforms
      g.strokeStyle = ft.col || P.path; g.lineWidth = ft.w || 8; g.lineCap = "round"; g.lineJoin = "round";
      g.beginPath(); g.moveTo(ft.pts[0][0], ft.pts[0][1]); for (let i = 1; i < ft.pts.length; i++) g.lineTo(ft.pts[i][0], ft.pts[i][1]); g.stroke();
      g.strokeStyle = "rgba(0,0,0,.2)"; g.lineWidth = 1.4; g.stroke();
    }
    g.restore();
  }

  function drawFrontierGlyph(g, glyph, x, y, P, rnd) {
    g.save();
    if (glyph === "tree" || glyph === "pine") { g.fillStyle = "rgba(10,18,8,.25)"; g.beginPath(); g.ellipse(x, y + 1, 9, 4, 0, 0, TAU); g.fill(); const pine = glyph === "pine" || rnd() < .5; g.fillStyle = pine ? "#2f5a3a" : "#3a6b3e"; if (pine) { g.beginPath(); g.moveTo(x, y - 22); g.lineTo(x - 9, y); g.lineTo(x + 9, y); g.closePath(); g.fill(); } else { g.beginPath(); g.arc(x, y - 9, 10, 0, TAU); g.fill(); g.fillStyle = "#5a3f24"; g.fillRect(x - 2, y - 4, 4, 6); } }
    else if (glyph === "reed") { g.strokeStyle = P.ground; g.lineWidth = 2; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x + k * 3, y); g.quadraticCurveTo(x + k * 4, y - 12, x + k * 5, y - 18); g.stroke(); } g.fillStyle = shade(P.ground, .15); g.fillRect(x + 4, y - 22, 2, 6); }
    else if (glyph === "dune") { g.fillStyle = shade(P.ground, .08); g.beginPath(); g.ellipse(x, y, 14, 5, 0, 0, Math.PI, true); g.fill(); }
    else if (glyph === "snow") { g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.ellipse(x, y, 9, 4, 0, 0, TAU); g.fill(); }
    else if (glyph === "rock") { g.fillStyle = shade(P.ground, -.12); g.beginPath(); g.moveTo(x - 8, y); g.lineTo(x - 3, y - 8); g.lineTo(x + 5, y - 6); g.lineTo(x + 8, y); g.closePath(); g.fill(); }
    else if (glyph === "crystal") { g.save(); g.shadowColor = P.glow; g.shadowBlur = 8; g.fillStyle = P.glow; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 4, y - 12); g.lineTo(x + 4, y - 12); g.closePath(); g.fill(); g.restore(); }
    else if (glyph === "fog") { g.fillStyle = "rgba(190,186,200,.5)"; g.beginPath(); g.arc(x, y, 12, 0, TAU); g.fill(); }
    else if (glyph === "cloud") { g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.ellipse(x, y, 16, 7, 0, 0, TAU); g.fill(); }
    else if (glyph === "wheat") { g.strokeStyle = shade(P.ground, -.05); g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 12); g.stroke(); g.fillStyle = shade(P.ground, .1); g.beginPath(); g.ellipse(x, y - 14, 2.5, 5, 0, 0, TAU); g.fill(); }
    g.restore();
  }

  // ── roads (tier-gated): dirt/plank/cobble bands ─────────────────────────────
  function drawRoads(g, Z, tier) {
    const P = Z.palette;
    for (const r of Z.roads) { if (r.tier > tier) continue; const p = segPts(r); const col = r.kind === "boardwalk" ? P.path : (tier >= 3 ? (P.cobble || shade(P.path, .12)) : P.path);
      g.strokeStyle = col; g.lineWidth = r.half * 2; g.lineCap = "round"; g.lineJoin = "round";
      g.beginPath(); g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); g.stroke();
      // edge
      g.strokeStyle = "rgba(0,0,0,.12)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); g.stroke();
      if (r.kind === "boardwalk") { // plank cross-hatch
        g.strokeStyle = "rgba(60,40,20,.35)"; g.lineWidth = 1; const a = p[0], b = p[p.length - 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = (b[0] - a[0]) / L, ny = (b[1] - a[1]) / L, px = -ny, py = nx;
        for (let d = 6; d < L; d += 8) { const mx = a[0] + nx * d, my = a[1] + ny * d; g.beginPath(); g.moveTo(mx - px * r.half, my - py * r.half); g.lineTo(mx + px * r.half, my + py * r.half); g.stroke(); }
      }
    }
  }

  // ── plaza (bounded, cobbles from tier 2) ────────────────────────────────────
  function drawPlaza(g, Z, tier) {
    if (!Z.plaza) return; const P = Z.palette, pz = Z.plaza;
    g.save(); g.fillStyle = tier >= 2 ? (P.cobble || shade(P.path, .14)) : P.path; g.beginPath(); g.ellipse(pz.cx, pz.cy, pz.rx, pz.ry, 0, 0, TAU); g.fill();
    if (tier >= 2) { g.strokeStyle = "rgba(0,0,0,.12)"; g.lineWidth = 2; const rb = mb(0xC0BB1E); g.save(); g.clip(); for (let yy = pz.cy - pz.ry; yy < pz.cy + pz.ry; yy += 13) { const off = (((yy - (pz.cy - pz.ry)) / 13 | 0) % 2) ? 7 : 0; for (let xx = pz.cx - pz.rx; xx < pz.cx + pz.rx; xx += 14) { const v = .85 + rb() * .15; g.fillStyle = shade(P.cobble || shade(P.path, .14), -(1 - v) * .5); rr(g, xx + off, yy, 11, 10, 3); g.fill(); } } g.restore(); }
    g.restore();
  }

  // ── lots: plot parcel or built glyph ────────────────────────────────────────
  function drawLot(g, Z, l, tier, showBuildings, labels) {
    const P = Z.palette, isNew = l.t === tier, x = l.cx - l.w / 2, y = l.cy - l.h / 2;
    g.save(); g.fillStyle = "rgba(10,8,16,.18)"; g.beginPath(); g.ellipse(l.cx + 5, y + l.h, l.w * 0.46, 7, 0, 0, TAU); g.fill();
    if (showBuildings) { // simple building glyph
      const roofH = l.h * 0.44, wt = y + roofH;
      g.fillStyle = P.wall; g.strokeStyle = shade(P.wall, -.5); g.lineWidth = 1.6; rr(g, x + 6, wt, l.w - 12, l.h - roofH - 4, 3); g.fill(); g.stroke();
      g.fillStyle = "rgba(0,0,0,.1)"; rr(g, x + 6 + (l.w - 12) * .58, wt, (l.w - 12) * .42, l.h - roofH - 4, 3); g.fill();
      g.fillStyle = P.roof; g.strokeStyle = shade(P.roof, -.45); g.lineWidth = 1.6; g.beginPath(); g.moveTo(x + 2, wt + 2); g.lineTo(l.cx - l.w * .16, y + 2); g.lineTo(l.cx + l.w * .16, y + 2); g.lineTo(x + l.w - 2, wt + 2); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = shade(P.surface, .2); rr(g, l.cx - l.w * .12, wt + (l.h - roofH) * .3, l.w * .24, l.h * .18, 2); g.fill();
    } else { // plot parcel with the street-facing edge bold
      g.fillStyle = isNew ? "rgba(255,210,120,.22)" : "rgba(255,255,255,.10)"; rr(g, x + 2, y + 2, l.w - 4, l.h - 4, 5); g.fill();
      g.strokeStyle = isNew ? P.glow : shade(P.path, -.2); g.lineWidth = isNew ? 3 : 2; g.setLineDash([7, 5]); rr(g, x + 4, y + 4, l.w - 8, l.h - 8, 4); g.stroke(); g.setLineDash([]);
      const fe = l.side === "N" ? y + l.h - 4 : l.side === "S" ? y + 4 : (l.side === "W" ? null : null);
      g.fillStyle = P.accent; if (l.side === "N" || l.side === "S") { const ey = l.side === "N" ? y + l.h - 5 : y + 1; rr(g, x + 8, ey, l.w - 16, 5, 2); g.fill(); } else { const ex = l.side === "W" ? x + 1 : x + l.w - 5; rr(g, ex, y + 8, 5, l.h - 16, 2); g.fill(); }
    }
    if (isNew) { g.strokeStyle = P.glow; g.lineWidth = 3; g.setLineDash([7, 5]); rr(g, x - 3, y - 3, l.w + 6, l.h + 6, 8); g.stroke(); g.setLineDash([]); g.fillStyle = "#fff"; g.font = "700 13px 'JetBrains Mono',monospace"; g.textAlign = "left"; g.fillText("NEW", x + 12, y - 8); }
    if (labels) { g.fillStyle = "rgba(0,0,0,.6)"; g.font = "600 12px 'IBM Plex Sans',sans-serif"; g.textAlign = "center"; const lt = "plot " + (l.index + 1); const tw = g.measureText(lt).width; g.fillStyle = "rgba(20,16,10,.66)"; rr(g, l.cx - tw / 2 - 5, l.cy + 8, tw + 10, 16, 4); g.fill(); g.fillStyle = "#f4ecd8"; g.fillText(lt, l.cx, l.cy + 20); }
    g.restore();
  }

  // ── staged landmark ─────────────────────────────────────────────────────────
  function drawLandmark(g, Z, tier) {
    if (!Z.landmark) return; const P = Z.palette, lm = Z.landmark, r = lm.r || 22;
    g.save(); g.fillStyle = "rgba(10,8,16,.2)"; g.beginPath(); g.ellipse(lm.cx, lm.cy + r * .5, r, r * .4, 0, 0, TAU); g.fill();
    // base pad
    g.fillStyle = tier >= 2 ? (P.cobble || shade(P.path, .14)) : P.path; g.beginPath(); g.arc(lm.cx, lm.cy, r + 6, 0, TAU); g.fill();
    // tiered structure: rises and gains glow
    const stage = tier; const hh = lerp(r * .8, r * 2.2, stage / Math.max(1, (Z.tiers.length - 1)));
    g.fillStyle = shade(P.wall, -.05); rr(g, lm.cx - r * .5, lm.cy - hh, r, hh, 3); g.fill(); g.strokeStyle = shade(P.wall, -.4); g.lineWidth = 1.6; g.stroke();
    g.fillStyle = P.accent; g.beginPath(); g.moveTo(lm.cx - r * .6, lm.cy - hh + 3); g.lineTo(lm.cx, lm.cy - hh - r * .5); g.lineTo(lm.cx + r * .6, lm.cy - hh + 3); g.closePath(); g.fill();
    g.save(); g.globalCompositeOperation = "screen"; g.fillStyle = P.glow; g.globalAlpha = lerp(.15, .6, stage / Math.max(1, Z.tiers.length - 1)); g.beginPath(); g.arc(lm.cx, lm.cy - hh - r * .3, r * .5, 0, TAU); g.fill(); g.restore();
    g.restore();
  }

  // ── runner ──────────────────────────────────────────────────────────────────
  function setup(cv) {
    const id = cv.dataset.layout, Z = DATA[id]; if (!Z) return;
    const ctx = cv.getContext("2d");
    function size() { const dpr = Math.min(2, devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); addEventListener("resize", size);
    const lots = resolveLots(Z);
    const view = { tier: 0, showBuildings: false, labels: true };
    let t = 0, growTimer = null;
    function render() {
      ctx.clearRect(0, 0, W, H);
      paintGround(ctx, Z, lots, view.tier);
      drawPlaza(ctx, Z, view.tier);
      drawRoads(ctx, Z, view.tier);
      // painter's order by baseline y for lots + landmark
      const items = lots.filter((l) => l.t <= view.tier).map((l) => ({ y: l.cy + l.h / 2, d: () => drawLot(ctx, Z, l, view.tier, view.showBuildings, view.labels) }));
      if (Z.landmark) items.push({ y: Z.landmark.cy, d: () => drawLandmark(ctx, Z, view.tier) });
      items.sort((a, b) => a.y - b.y); items.forEach((it) => it.d());
      // vignette
      const v = ctx.createRadialGradient(W / 2, H / 2, H * .4, W / 2, H / 2, H * .8); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.18)"); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }
    function setTier(n) { view.tier = clamp(n, 0, Z.tiers.length - 1); render(); syncUI(); }
    function syncUI() {
      document.querySelectorAll(`[data-tierbtn-for="${id}"] button`).forEach((b) => b.classList.toggle("on", +b.dataset.tier === view.tier));
      const cap = document.querySelector(`[data-caption-for="${id}"]`); if (cap) { const T = Z.tiers[view.tier]; cap.innerHTML = `<b>${T.name} — ${T.plots} plots.</b> ${T.caption}`; }
      const stat = document.querySelector(`[data-stat-for="${id}"]`); if (stat) { const shown = lots.filter((l) => l.t <= view.tier).length; const links = Z.roads.filter((r) => r.tier <= view.tier).length + (Z.features || []).filter((f) => f.kind === "span" && (f.tier === undefined || f.tier <= view.tier)).length; stat.textContent = `tier ${view.tier + 1}/${Z.tiers.length} · ${shown} plots placed · ${links} route/bridge segments · 40×30 grid`; }
    }
    // wire controls
    document.querySelectorAll(`[data-tierbtn-for="${id}"] button`).forEach((b) => b.addEventListener("click", () => { stopGrow(); setTier(+b.dataset.tier); }));
    const growBtn = document.querySelector(`[data-grow-for="${id}"]`);
    function stopGrow() { if (growTimer) { clearInterval(growTimer); growTimer = null; if (growBtn) growBtn.textContent = "Grow ▸"; } }
    if (growBtn) growBtn.addEventListener("click", () => { if (growTimer) { stopGrow(); return; } growBtn.textContent = "❚❚ pause"; setTier(0); let k = 0; growTimer = setInterval(() => { k++; if (k > Z.tiers.length - 1) { stopGrow(); return; } setTier(k); }, 1600); });
    document.querySelectorAll(`[data-toggle-for="${id}"]`).forEach((c) => c.addEventListener("change", () => { const k = c.dataset.toggle; view[k] = c.checked; render(); }));
    render(); syncUI();
  }
  function boot() { document.querySelectorAll("canvas[data-layout]").forEach(setup); }
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", boot); else boot();
  // expose the resolver for the headless verifier
  window.__zoneLayout = { resolveLots, DATA };
})();
