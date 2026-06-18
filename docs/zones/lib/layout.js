/* docs/zones — grounded top-down settlement renderer (tileset-based).
 * A data-driven generalization of docs/town-layout: real tileset ground (grass/dirt/water/forest),
 * marching-squares water that supports MANY features per settlement (rivers, lakes, coves, coast),
 * cottages + civic buildings with roofs/shadows, a mill with a turning wheel, docks, a staged
 * landmark, lived-in dressing + townsfolk, dusk + fireflies. Reads geometry from window.LAYOUT_DATA.
 * Assets load from ../assets/ (self-contained); falls back to flat colour if they don't. */
(function () {
  "use strict";
  const ALL = window.LAYOUT_DATA || {};
  const ID = Object.keys(ALL)[0];
  const Z = ALL[ID] || {};
  const cv = document.querySelector("canvas[data-layout]"); if (!cv) return;
  const ctx = cv.getContext("2d");
  const W = 1280, H = 960, TILE = 32, COLS = 40, ROWS = 30;
  function fit() { const dpr = Math.min(2, devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false; }
  fit(); addEventListener("resize", fit);

  // ── geometry (from data) ───────────────────────────────────────
  const SET = Z.setback || 15;
  const PLAZA = Z.plaza || null;
  const FIELD = Z.field || null;
  const WATER = Z.water || {};
  const RIVERS = WATER.rivers || [];
  const LAKES = WATER.lakes || [];
  const COAST = WATER.coast || null;
  const BRIDGES = Z.bridges || [];
  const DOCK = Z.dock || null;
  const MILL = Z.mill || null;
  const CLEAR_SPOTS = Z.clearSpots || [];
  const FOOT = Z.foot || {};
  const sz = (i) => FOOT[i] || [110, 100];
  const ROADS = Z.roads || [];
  const SPEC = Z.spec || [];
  const SPECIAL = Z.special || {};
  const ROOFS = Z.roofs || ["#b6422c", "#a85a2c", "#9c6b3f", "#6e8b4f", "#4f7a6a", "#8a5a8a", "#b07a32"];
  const WALLS = Z.walls || ["#e8d3a8", "#e6cd9c", "#dec9b2", "#ecd8ad", "#e0cba0"];
  const TIERS = Z.tiers || [{ name: "Outpost", plots: 0, caption: "" }];
  const NT = TIERS.length;
  const TIER_NAMES = TIERS.map((t) => t.name);
  const CAPTIONS = TIERS.map((t) => t.caption || "");
  const byId = Object.fromEntries(ROADS.map((r) => [r.id, r]));
  const segPts = (r) => r.pts ? r.pts : (r.axis === "H" ? [[r.a, r.line], [r.b, r.line]] : [[r.line, r.a], [r.line, r.b]]);
  const LOTS = SPEC.map((s) => {
    const [w, h] = sz(s.i);
    if (s.diag) return { index: s.i, cx: s.cx, cy: s.cy, w, h, t: s.t, side: s.side };
    const rd = s.road ? byId[s.road] : null;
    const line = rd ? rd.line : s.line, half = rd ? rd.half : s.half, axis = rd ? rd.axis : (s.axis || "H");
    const sb = SET + (s.sb || 0), j = ((s.i * 37) % 9 - 4);
    let cx, cy;
    if (axis === "H") { cx = s.along + j; cy = s.side === "N" ? line - half - sb - h / 2 : line + half + sb + h / 2; }
    else { cy = s.along + j; cx = s.side === "W" ? line - half - sb - w / 2 : line + half + sb + w / 2; }
    cx = Math.max(34 + w / 2, Math.min(W - 34 - w / 2, cx)); cy = Math.max(34 + h / 2, Math.min(H - 34 - h / 2, cy));
    return { index: s.i, cx, cy, w, h, t: s.t, side: s.side };
  });

  // ── tileset / atlas ───────────────────────────────────────────
  const TC = 24, TM = 1, TSP = 2;
  const T = { GRASS: 26, ALT: [50, 51, 76, 77, 98, 99], FLOWER: [120, 121], DIRT: 35, WATER: 250, SAND: 248 };
  const REC = { pine: { idx: [168, 192], c: 1, r: 2 }, tree: { idx: [299], c: 1, r: 1 }, bush: { idx: [275], c: 1, r: 1 }, fountain: { idx: [272, 273, 274, 296, 297, 298, 320, 321, 322], c: 3, r: 3 }, rock: { idx: [323], c: 1, r: 1 } };
  const FR = { front: [[1, 1, 30, 43], [33, 1, 30, 43], [65, 1, 30, 43], [33, 1, 30, 43]], back: [[97, 1, 32, 41], [97, 44, 32, 41], [131, 1, 32, 41], [97, 44, 32, 41]], left: [[1, 46, 30, 39], [131, 44, 30, 41], [33, 46, 30, 39], [131, 44, 30, 41]], right: [[65, 46, 30, 39], [163, 44, 30, 41], [165, 1, 30, 39], [163, 44, 30, 41]] };
  let tileset = null, atlas = null, baked = {}, assetsOK = false;
  const tileSrc = (i) => [TM + (i % TC) * (TILE + TSP), TM + Math.floor(i / TC) * (TILE + TSP)];
  function bakeSprite(rec) { const cw = rec.c * TILE, ch = rec.r * TILE, oc = document.createElement("canvas"); oc.width = cw; oc.height = ch; const o = oc.getContext("2d"); o.imageSmoothingEnabled = false; for (let k = 0; k < rec.idx.length; k++) { const [sx, sy] = tileSrc(rec.idx[k]); o.drawImage(tileset, sx, sy, TILE, TILE, (k % rec.c) * TILE, Math.floor(k / rec.c) * TILE, TILE, TILE); } return oc; }
  const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error(src)); im.src = src; });
  async function boot() {
    try { [tileset, atlas] = await Promise.all([loadImg("../assets/tileset.png"), loadImg("../assets/character-atlas.png")]); for (const k in REC) baked[k] = bakeSprite(REC[k]); assetsOK = true; }
    catch (e) { assetsOK = false; }
    rebuildGround(); render(); syncUI(); requestAnimationFrame(loop);
  }

  // ── helpers ───────────────────────────────────────────────────
  function distSeg(x, y, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy; let t = L ? ((x - ax) * dx + (y - ay) * dy) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(x - (ax + dx * t), y - (ay + dy * t)); }
  function polyDist(x, y, pts) { let d = 1e9; for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, distSeg(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])); return d; }
  function inEll(x, y, e, pad) { pad = pad || 0; return ((x - e.cx) / (e.rx + pad)) ** 2 + ((y - e.cy) / (e.ry + pad)) ** 2 <= 1; }
  // signed distance to ANY water (negative = inside) → smooth diagonal shores via marching squares
  function waterDist(x, y) {
    let d = 1e9;
    for (const r of RIVERS) d = Math.min(d, polyDist(x, y, r.pts) - (r.width || 22) / 2);
    for (const l of LAKES) d = Math.min(d, (Math.hypot((x - l.cx) / l.rx, (y - l.cy) / l.ry) - 1) * Math.min(l.rx, l.ry));
    if (COAST) { const c = COAST; let sd; if (c.edge === "S") sd = c.at - y; else if (c.edge === "N") sd = y - c.at; else if (c.edge === "E") sd = c.at - x; else sd = x - c.at; d = Math.min(d, sd); }
    return d;
  }
  const inWater = (x, y) => waterDist(x, y) < 0;
  function nearRoad(x, y, tier, extra) { for (const r of ROADS) { if (r.tier > tier) continue; const p = segPts(r); for (let k = 0; k < p.length - 1; k++) if (distSeg(x, y, p[k][0], p[k][1], p[k + 1][0], p[k + 1][1]) <= r.half + extra) return true; } return false; }
  const onField = (x, y, m) => FIELD && x > FIELD.x - (m || 0) && x < FIELD.x + FIELD.w + (m || 0) && y > FIELD.y - (m || 0) && y < FIELD.y + FIELD.h + (m || 0);
  function onLot(x, y, tier, m) { for (const l of LOTS) { if (l.t > tier) continue; if (Math.abs(x - l.cx) < l.w / 2 + m && Math.abs(y - l.cy) < l.h / 2 + m) return true; } return false; }
  const nearLM = (x, y) => Z.landmark && Math.hypot(x - Z.landmark.cx, y - Z.landmark.cy) < 60;
  const cleared = (x, y, tier) => (PLAZA && inEll(x, y, PLAZA, 6)) || onField(x, y, 18) || onLot(x, y, tier, 16) || nearRoad(x, y, tier, 82) || nearLM(x, y);
  function rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function rrP(o, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); o.beginPath(); o.moveTo(x + r, y); o.arcTo(x + w, y, x + w, y + h, r); o.arcTo(x + w, y + h, x, y + h, r); o.arcTo(x, y + h, x, y, r); o.arcTo(x, y, x + w, y, r); o.closePath(); }
  function mb(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shadow(x, y, rx, ry) { ctx.fillStyle = "rgba(16,14,26,.27)"; ctx.beginPath(); ctx.ellipse(x + 2, y, rx, ry, 0, 0, 7); ctx.fill(); }
  function revLots() { return LOTS.filter((l) => l.t <= TIER); }
  function revRoads() { return ROADS.filter((r) => r.tier <= TIER); }

  // forest scatter (fixed positions; pine vs round; sway phase). treeDensity<1 → open plains/farmland.
  const TREE_DENSITY = Z.treeDensity == null ? 1 : Z.treeDensity;
  const TREES = (() => { const r = mb(0x5EED01), o = [], CN = 64; for (let c = 0; c < CN; c++) { const cqx = r() * W, cqy = r() * H, base = r() < 0.5; const n = Math.round((5 + Math.floor(r() * 11)) * TREE_DENSITY); for (let k = 0; k < n; k++) { const a = r() * 6.28, rad = r() * r() * 72; o.push({ x: cqx + Math.cos(a) * rad, y: cqy + Math.sin(a) * rad, pine: r() < 0.35 ? !base : base, s: 0.82 + r() * 0.5, ph: r() * 6.28 }); } } return o; })();
  const BUSHES = (Z.bushes || []).map((b) => ({ x: b[0], y: b[1], from: b[2] || 0 }));

  function drawTile2(o, i, dx, dy) { if (!tileset) { o.fillStyle = (i === T.WATER ? "#5bb4d6" : i === T.DIRT ? "#c7a86a" : "#6f9a55"); o.fillRect(dx, dy, TILE, TILE); return; } const [sx, sy] = tileSrc(i); o.drawImage(tileset, sx, sy, TILE, TILE, dx, dy, TILE, TILE); }

  // ── ground (cached offscreen per tier) ────────────────────────
  const offG = document.createElement("canvas"); offG.width = W; offG.height = H; const og = offG.getContext("2d"); og.imageSmoothingEnabled = false;
  function msWater(o, thresh, col) { o.fillStyle = col; const N = COLS + 2, dist = []; for (let j = 0; j <= ROWS + 2; j++) { dist.push([]); for (let i = 0; i <= N; i++) dist[j].push(waterDist((i - 1) * 32, (j - 1) * 32) - thresh); } for (let j = 0; j < ROWS + 2; j++) for (let i = 0; i < N; i++) { const X = (i - 1) * 32, Y = (j - 1) * 32, c = [[X, Y, dist[j][i]], [X + 32, Y, dist[j][i + 1]], [X + 32, Y + 32, dist[j + 1][i + 1]], [X, Y + 32, dist[j + 1][i]]], poly = []; for (let k = 0; k < 4; k++) { const a = c[k], b = c[(k + 1) % 4]; if (a[2] < 0) poly.push([a[0], a[1]]); if ((a[2] < 0) !== (b[2] < 0)) { const t = a[2] / (a[2] - b[2]); poly.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } } if (poly.length >= 3) { o.beginPath(); o.moveTo(poly[0][0], poly[0][1]); for (let k = 1; k < poly.length; k++) o.lineTo(poly[k][0], poly[k][1]); o.closePath(); o.fill(); } } }
  let groundDirty = true;
  function rebuildGround() {
    const tier = TIER, g = []; for (let y = 0; y < ROWS; y++) { g.push([]); for (let x = 0; x < COLS; x++) g[y].push(T.GRASS); }
    const setT = (tx, ty, v) => { if (tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS) g[ty][tx] = v; };
    for (const rd of ROADS) { if (rd.tier > tier) continue; const p = segPts(rd); for (let s = 0; s < p.length - 1; s++) { const [ax, ay] = p[s], [bx, by] = p[s + 1]; const x0 = Math.min(ax, bx) - rd.half, x1 = Math.max(ax, bx) + rd.half, y0 = Math.min(ay, by) - rd.half, y1 = Math.max(ay, by) + rd.half; for (let py = y0; py <= y1; py += 8) for (let px = x0; px <= x1; px += 8) if (distSeg(px, py, ax, ay, bx, by) <= rd.half) setT(Math.floor(px / 32), Math.floor(py / 32), T.DIRT); } }
    for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) { const cx = tx * 32 + 16, cy = ty * 32 + 16; if (PLAZA && inEll(cx, cy, PLAZA, 0)) setT(tx, ty, T.DIRT); if (onField(cx, cy, 2)) setT(tx, ty, T.DIRT); if (inWater(cx, cy)) setT(tx, ty, T.WATER); }
    const rnd = mb(0x515A ^ (tier * 2654435761));
    for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) { if (g[ty][tx] !== T.GRASS) continue; if (rnd() < 0.14) g[ty][tx] = T.ALT[Math.floor(rnd() * T.ALT.length)]; }
    og.clearRect(0, 0, W, H);
    if (assetsOK) { for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) drawTile2(og, g[ty][tx] === T.WATER ? T.GRASS : g[ty][tx], tx * 32, ty * 32); }
    else { og.fillStyle = "#6f9a55"; og.fillRect(0, 0, W, H); for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) if (g[ty][tx] === T.DIRT) { og.fillStyle = "#c7a86a"; og.fillRect(tx * 32, ty * 32, 32, 32); } }
    // soft tonal variation
    { const rt = mb(0x70E ^ (tier * 2246822519)); for (let i = 0; i < 30; i++) { const cx = rt() * W, cy = rt() * H, r = 55 + rt() * 150, dark = rt() < 0.5, tx = (cx / 32) | 0, ty = (cy / 32) | 0, v = g[ty] && g[ty][tx]; if (v === T.DIRT || v === T.WATER) continue; const grd = og.createRadialGradient(cx, cy, 0, cx, cy, r); if (dark) { grd.addColorStop(0, "rgba(38,76,40,0.12)"); grd.addColorStop(1, "rgba(38,76,40,0)"); } else { grd.addColorStop(0, "rgba(196,214,128,0.13)"); grd.addColorStop(1, "rgba(196,214,128,0)"); } og.fillStyle = grd; og.beginPath(); og.arc(cx, cy, r, 0, 7); og.fill(); } }
    // wildflowers on grass
    { const rf = mb(0x9F10 ^ (tier * 40503)), fc = ["#e8669a", "#ffd24d", "#fff2f5", "#d98ae0"]; for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) { const v = g[ty][tx]; if (v !== T.GRASS && T.ALT.indexOf(v) < 0) continue; if (rf() < 0.05) { const px = tx * 32 + 4 + rf() * 24, py = ty * 32 + 6 + rf() * 22; og.fillStyle = "#3f7a42"; og.fillRect(px - 0.5, py, 1, 3); og.fillStyle = fc[(rf() * 4) | 0]; og.beginPath(); og.arc(px, py, 1.7, 0, 7); og.fill(); } } }
    // forest-floor undergrowth in the un-cleared woods
    { const ru = mb(0xF0E57 ^ (tier * 2654435761)); for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) { const v = g[ty][tx]; if (v === T.DIRT || v === T.WATER) continue; const wx = tx * 32 + 16, wy = ty * 32 + 16; if (cleared(wx, wy, tier) || inWater(wx, wy)) continue; if (ru() > 0.30) continue; const px = tx * 32 + 5 + ru() * 22, py = ty * 32 + 8 + ru() * 18, t = ru(); if (t < 0.42) { og.strokeStyle = "#3f6b34"; og.lineWidth = 1.5; og.lineCap = "round"; for (let a = -1; a <= 1; a++) { og.beginPath(); og.moveTo(px, py + 4); og.quadraticCurveTo(px + a * 4, py - 2, px + a * 7, py - 6); og.stroke(); } } else if (t < 0.70) { og.fillStyle = "#a8503e"; og.beginPath(); og.ellipse(px, py - 2, 3, 2, 0, 0, 7); og.fill(); og.fillStyle = "#ecdcc4"; og.fillRect(px - 1, py - 2, 2, 4); } else if (t < 0.90) { og.fillStyle = "#3f7a42"; og.beginPath(); og.arc(px, py, 4, 0, 7); og.arc(px + 4, py + 1, 3.4, 0, 7); og.arc(px - 3, py + 1, 3, 0, 7); og.fill(); } else { og.fillStyle = "#8a8276"; og.beginPath(); og.ellipse(px, py, 4, 3, 0, 0, 7); og.fill(); } } }
    // water: smooth diagonal shores
    if (RIVERS.length || LAKES.length || COAST) { msWater(og, 9, "#d9c79a"); msWater(og, 1, "#4c93b8"); msWater(og, -3, "#5bb4d6"); }
    // bridges
    for (const b of BRIDGES) { if (b.from > tier) continue; const span = b.span || 66, hr = b.hr || 17, vert = b.vertical; og.fillStyle = "#b88a52"; og.strokeStyle = "#7a5a32"; og.lineWidth = 2; if (vert) rrP(og, b.x - hr - 2, b.y - span / 2, hr * 2 + 4, span, 3); else rrP(og, b.x - span / 2, b.y - hr - 2, span, hr * 2 + 4, 3); og.fill(); og.stroke(); og.strokeStyle = "rgba(90,66,40,.5)"; og.lineWidth = 1.5; if (vert) { for (let py = b.y - span / 2 + 5; py < b.y + span / 2; py += 7) { og.beginPath(); og.moveTo(b.x - hr, py); og.lineTo(b.x + hr, py); og.stroke(); } } else { for (let px = b.x - span / 2 + 5; px < b.x + span / 2; px += 7) { og.beginPath(); og.moveTo(px, b.y - hr); og.lineTo(px, b.y + hr); og.stroke(); } } }
    // footpaths from cottage doors to the street
    og.strokeStyle = "#c2a468"; og.lineWidth = 6; og.lineCap = "round"; for (const l of revLots()) { if (l.side === "N") { const e = l.cy + l.h / 2; og.beginPath(); og.moveTo(l.cx, e - 3); og.lineTo(l.cx, e + SET + 3); og.stroke(); } else if (l.side === "S") { const e = l.cy - l.h / 2; og.beginPath(); og.moveTo(l.cx, e + 3); og.lineTo(l.cx, e - SET - 3); og.stroke(); } }
    // cobbled plaza from Village onward
    if (PLAZA && tier >= 2) { og.save(); og.beginPath(); og.ellipse(PLAZA.cx, PLAZA.cy, PLAZA.rx - 3, PLAZA.ry - 3, 0, 0, 7); og.clip(); og.fillStyle = "#b3ac9d"; og.fillRect(PLAZA.cx - PLAZA.rx, PLAZA.cy - PLAZA.ry, PLAZA.rx * 2, PLAZA.ry * 2); const rb = mb(0xC0BB1E); for (let yy = PLAZA.cy - PLAZA.ry; yy < PLAZA.cy + PLAZA.ry; yy += 13) { const off = ((((yy - (PLAZA.cy - PLAZA.ry)) / 13) | 0) % 2) ? 7 : 0; for (let xx = PLAZA.cx - PLAZA.rx; xx < PLAZA.cx + PLAZA.rx; xx += 14) { const v = 0.80 + rb() * 0.20; og.fillStyle = "rgb(" + ((178 * v) | 0) + "," + ((170 * v) | 0) + "," + ((151 * v) | 0) + ")"; rrP(og, xx + off, yy, 11, 10, 3); og.fill(); } } og.restore(); og.strokeStyle = "rgba(120,108,86,.45)"; og.lineWidth = 3; og.beginPath(); og.ellipse(PLAZA.cx, PLAZA.cy, PLAZA.rx - 3, PLAZA.ry - 3, 0, 0, 7); og.stroke(); }
    if (tier >= NT - 1) { const rb2 = mb(0x5A1E); for (let yy = 0; yy < H; yy += 8) { const off = (((yy / 8) | 0) % 2) ? 7 : 0; for (let xx = -7; xx < W; xx += 14) { const tx = ((xx + 7) / 32) | 0, ty = (yy / 32) | 0; if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) continue; if (g[ty][tx] !== T.DIRT || onField(xx + 5, yy + 4, 0)) continue; const v = 0.80 + rb2() * 0.20; og.fillStyle = "rgb(" + ((182 * v) | 0) + "," + ((174 * v) | 0) + "," + ((155 * v) | 0) + ")"; rrP(og, xx + off, yy, 11, 7, 3); og.fill(); } } }
    // terrain transitions: diagonal corner-cuts so dirt blends into grass
    { const grass = (tx, ty) => { if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return true; const v = g[ty][tx]; return v !== T.DIRT && v !== T.WATER; }; for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) { if (g[ty][tx] !== T.DIRT) continue; const X = tx * 32, Y = ty * 32, N = grass(tx, ty - 1), S = grass(tx, ty + 1), E = grass(tx + 1, ty), Wt = grass(tx - 1, ty); const cut = (a, b, c, d, e, f) => { og.save(); og.beginPath(); og.moveTo(a, b); og.lineTo(c, d); og.lineTo(e, f); og.closePath(); og.clip(); drawTile2(og, T.GRASS, X, Y); og.restore(); }; if (N && E) cut(X, Y, X + 32, Y, X + 32, Y + 32); if (N && Wt) cut(X, Y, X + 32, Y, X, Y + 32); if (S && E) cut(X + 32, Y, X + 32, Y + 32, X, Y + 32); if (S && Wt) cut(X, Y, X, Y + 32, X + 32, Y + 32); } }
    groundDirty = false;
  }

  // ── trees / bushes ─────────────────────────────────────────────
  function drawTree(t) { const sw = Math.sin(time * 1.1 + t.ph) * 2; if (assetsOK) { const spr = t.pine ? baked.pine : baked.tree, w = spr.width * t.s, h = spr.height * t.s; ctx.fillStyle = "rgba(18,15,28,.28)"; ctx.beginPath(); ctx.ellipse(t.x + w * 0.12, t.y, w * 0.34, w * 0.14, 0, 0, 7); ctx.fill(); ctx.save(); ctx.translate(t.x, t.y); ctx.transform(1, 0, sw * 0.02, 1, 0, 0); ctx.drawImage(spr, -w / 2, -h, w, h); ctx.restore(); } else { shadow(t.x, t.y, 12, 5); ctx.fillStyle = t.pine ? "#356b3e" : "#3f7a42"; ctx.beginPath(); ctx.arc(t.x + sw, t.y - 14, 15 * t.s, 0, 7); ctx.fill(); ctx.fillStyle = "#6e4a26"; ctx.fillRect(t.x - 2, t.y - 8, 4, 8); } }
  function drawBush(b) { if (inWater(b.x, b.y)) return; if (assetsOK) { shadow(b.x, b.y, 12, 5); ctx.drawImage(baked.bush, b.x - 16, b.y - 32, 32, 32); } else { shadow(b.x, b.y, 10, 4); ctx.fillStyle = "#3f7a42"; ctx.beginPath(); ctx.arc(b.x, b.y - 8, 11, 0, 7); ctx.fill(); } }

  function drawField() { if (!FIELD) return; const x = FIELD.x, y = FIELD.y, w = FIELD.w, h = FIELD.h; ctx.save(); ctx.fillStyle = "#7a5230"; rr(x, y, w, h, 6); ctx.fill(); ctx.strokeStyle = "rgba(40,26,12,.4)"; ctx.lineWidth = 3; for (let ry = y + 16; ry < y + h - 8; ry += 18) { ctx.beginPath(); ctx.moveTo(x + 12, ry); ctx.lineTo(x + w - 12, ry); ctx.stroke(); } for (let ry = y + 16; ry < y + h - 8; ry += 18) for (let cx2 = x + 24; cx2 < x + w - 12; cx2 += 26) { const sway = Math.sin(time * 1.6 + cx2 * 0.1 + ry) * 1.2; ctx.fillStyle = "#7bbf5a"; ctx.beginPath(); ctx.arc(cx2 + sway, ry, 3, 0, 7); ctx.fill(); ctx.fillStyle = "#ffd24d"; ctx.fillRect(cx2 - 1 + sway, ry - 1, 2, 2); } ctx.strokeStyle = "#caa46b"; ctx.lineWidth = 5; rr(x - 7, y - 7, w + 14, h + 14, 8); ctx.stroke(); ctx.fillStyle = "#9c7a44"; for (let px = x - 7; px <= x + w + 7; px += 24) { ctx.fillRect(px - 2, y - 11, 4, 8); ctx.fillRect(px - 2, y + h + 3, 4, 8); } for (let py = y - 7; py <= y + h + 7; py += 24) { ctx.fillRect(x - 11, py - 2, 8, 4); ctx.fillRect(x + w + 3, py - 2, 8, 4); } label("🌾 Farm", x + w / 2, y + 20, "#2f4a18", 18, "#f4e6c8"); ctx.restore(); }

  // ── buildings ──────────────────────────────────────────────────
  const BTYPES = ['cottage', 'shop', 'cottage', 'house2', 'cottage', 'inn', 'cottage', 'cottage'];
  function drawCottage(l, isNew) {
    const sp = SPECIAL[l.index]; if (sp === 'chapel') return drawChapel(l, isNew); if (sp === 'townhall') return drawTownHall(l, isNew);
    const x = l.cx - l.w / 2, y = l.cy - l.h / 2, w = l.w, h = l.h, ty = sp === 'inn' ? 'inn' : sp === 'shop' ? 'shop' : BTYPES[l.index % BTYPES.length];
    const roof = ROOFS[(l.index * 3 + 1) % ROOFS.length], wall = WALLS[l.index % WALLS.length]; ctx.save();
    ctx.fillStyle = "rgba(22,18,30,.30)"; ctx.beginPath(); ctx.ellipse(l.cx + 9, y + h, w * 0.47, 10, 0, 0, 7); ctx.fill();
    const ang = (((l.index * 73) % 100) / 100 - 0.5) * 0.11; ctx.translate(l.cx, l.cy); ctx.rotate(ang); ctx.translate(-l.cx, -l.cy);
    const roofH = (ty === 'house2' || ty === 'inn') ? h * 0.40 : h * 0.50, wallTop = y + roofH, wallBot = y + h - 6, wallH = wallBot - wallTop, eave = 4;
    ctx.fillStyle = wall; ctx.strokeStyle = "#6e4a26"; ctx.lineWidth = 2.5; rr(x + 5, wallTop, w - 10, wallH, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,.13)"; rr(x + 5 + (w - 10) * 0.60, wallTop, (w - 10) * 0.40, wallH, 4); ctx.fill();
    ctx.fillStyle = "rgba(255,250,235,.16)"; rr(x + 5, wallTop, (w - 10) * 0.26, wallH, 4); ctx.fill();
    ctx.fillStyle = "rgba(40,26,14,.22)"; ctx.fillRect(x + 7, wallBot - 5, w - 14, 5);
    const rt = ['gable', 'hip', 'gambrel', 'gable', 'hip', 'gable', 'gambrel', 'gable'][(l.index * 5 + 2) % 8], eY = wallTop + 5;
    if (rt === 'hip') { const rx0 = l.cx - w * 0.28, rx1 = l.cx + w * 0.28, ry = y + 2; ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(x - eave, eY); ctx.lineTo(rx0, ry); ctx.lineTo(rx1, ry); ctx.lineTo(x + w + eave, eY); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.16)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(rx0, ry); ctx.lineTo(rx1, ry); ctx.stroke(); ctx.strokeStyle = "rgba(30,16,6,.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - eave, eY); ctx.lineTo(rx0, ry); ctx.lineTo(rx1, ry); ctx.lineTo(x + w + eave, eY); ctx.closePath(); ctx.stroke(); }
    else if (rt === 'gambrel') { const knee = w * 0.36, mY = y + (eY - y) * 0.60; ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(x - eave, eY); ctx.lineTo(l.cx - knee, mY); ctx.lineTo(l.cx, y); ctx.lineTo(l.cx + knee, mY); ctx.lineTo(x + w + eave, eY); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.16)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - eave + 2, eY - 1); ctx.lineTo(l.cx - knee, mY); ctx.lineTo(l.cx, y + 1); ctx.stroke(); ctx.strokeStyle = "rgba(30,16,6,.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - eave, eY); ctx.lineTo(l.cx - knee, mY); ctx.lineTo(l.cx, y); ctx.lineTo(l.cx + knee, mY); ctx.lineTo(x + w + eave, eY); ctx.closePath(); ctx.stroke(); }
    else { ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(x - eave, eY); ctx.lineTo(l.cx, y); ctx.lineTo(x + w + eave, eY); ctx.closePath(); ctx.fill(); ctx.save(); ctx.beginPath(); ctx.moveTo(x - eave, eY); ctx.lineTo(l.cx, y); ctx.lineTo(x + w + eave, eY); ctx.closePath(); ctx.clip(); const band = (eY - y) / 5; for (let s = 0; s < 5; s++) { const by = y + s * band; ctx.fillStyle = s % 2 ? "rgba(0,0,0,.13)" : "rgba(255,255,255,.05)"; ctx.fillRect(x - eave, by, w + 2 * eave, band - 1); ctx.fillStyle = "rgba(255,255,255,.15)"; ctx.fillRect(x - eave, by, w + 2 * eave, 1); } ctx.fillStyle = "rgba(0,0,0,.11)"; ctx.fillRect(l.cx, y, w / 2 + eave, eY - y); ctx.restore(); ctx.strokeStyle = "rgba(255,255,255,.22)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - eave + 2, eY - 1); ctx.lineTo(l.cx, y + 1); ctx.stroke(); ctx.strokeStyle = "rgba(30,16,6,.4)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - eave, eY); ctx.lineTo(l.cx, y); ctx.lineTo(x + w + eave, eY); ctx.closePath(); ctx.stroke(); }
    ctx.fillStyle = "rgba(18,10,4,.20)"; ctx.fillRect(x + 6, wallTop, w - 12, 4);
    const lit = dusk > 0.4, wcol = lit ? "#ffd98a" : "#bfe0ef";
    const win = (wx, wy2) => { ctx.fillStyle = wcol; ctx.fillRect(wx, wy2, 13, 12); ctx.strokeStyle = "#6e4a26"; ctx.lineWidth = 1.2; ctx.strokeRect(wx, wy2, 13, 12); ctx.beginPath(); ctx.moveTo(wx + 6.5, wy2); ctx.lineTo(wx + 6.5, wy2 + 12); ctx.moveTo(wx, wy2 + 6); ctx.lineTo(wx + 13, wy2 + 6); ctx.stroke(); };
    const wy = wallTop + 7; win(x + 12, wy); win(x + w - 25, wy); if (ty === 'house2') { win(x + 12, wy + wallH * 0.45); win(x + w - 25, wy + wallH * 0.45); }
    const fbox = (wx2) => { ctx.fillStyle = "#7a5230"; ctx.fillRect(wx2, wy + 12, 13, 3); const fbc = ["#e2557f", "#ffd24d", "#fff0f2", "#c98ae0"]; for (let i = 0; i < 3; i++) { const sw = Math.sin(time * 2.2 + i + wx2) * 0.6; ctx.fillStyle = fbc[(i + l.index) % fbc.length]; ctx.beginPath(); ctx.arc(wx2 + 3 + i * 4 + sw, wy + 11.5, 1.8, 0, 7); ctx.fill(); } };
    fbox(x + 12); fbox(x + w - 25);
    const dy = wallBot, dxp = l.cx + (l.index % 3 - 1) * (w * 0.18); ctx.fillStyle = "#5e3e22"; rr(dxp - 8, dy - 22, 16, 22, 2); ctx.fill(); ctx.fillStyle = "#caa24a"; ctx.beginPath(); ctx.arc(dxp + 4, dy - 11, 1.5, 0, 7); ctx.fill();
    if (ty === 'shop') { const ay = wallTop + wallH * 0.42, aw = (w - 16) / 4; ctx.fillStyle = "#7a5026"; ctx.fillRect(x + 8, ay - 3, w - 16, 3); for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? "#c0492f" : "#f2e4c4"; ctx.beginPath(); ctx.moveTo(x + 8 + i * aw, ay); ctx.lineTo(x + 8 + (i + 0.5) * aw, ay + 8); ctx.lineTo(x + 8 + (i + 1) * aw, ay); ctx.closePath(); ctx.fill(); } }
    if (ty === 'inn') { ctx.strokeStyle = "#5a3a18"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w + eave - 6, wallTop + 5); ctx.lineTo(x + w + eave - 6, wallTop + 16); ctx.stroke(); ctx.fillStyle = "#9c6b3f"; rr(x + w + eave - 14, wallTop + 16, 17, 12, 2); ctx.fill(); ctx.fillStyle = "#ffd24d"; ctx.beginPath(); ctx.arc(x + w + eave - 5.5, wallTop + 22, 2.6, 0, 7); ctx.fill(); }
    const chx = x + (l.index % 2 ? w - 20 : 12); ctx.fillStyle = "#8a5a32"; ctx.fillRect(chx, y + roofH * 0.42, 9, 14); ctx.fillStyle = "#6e4426"; ctx.fillRect(chx, y + roofH * 0.42, 9, 3);
    if (tg.dressing) { const gyy = wallBot + 3; ctx.fillStyle = "rgba(110,74,44,.9)"; rr(l.cx - 16, gyy, 32, 8, 3); ctx.fill(); const gc = ["#e58fb0", "#ffd24d", "#fff0f2"]; for (let i = -2; i <= 2; i++) { const sw = Math.sin(time * 2 + i + l.cx) * 1; ctx.fillStyle = gc[(i + 2) % 3]; ctx.beginPath(); ctx.arc(l.cx + i * 7 + sw, gyy + 4, 2, 0, 7); ctx.fill(); } const fy2 = y + h + 7, x0 = x + 4, x1 = x + w - 4, gate = 10; ctx.strokeStyle = "#cfae6e"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, fy2 - 3); ctx.lineTo(l.cx - gate, fy2 - 3); ctx.moveTo(l.cx + gate, fy2 - 3); ctx.lineTo(x1, fy2 - 3); ctx.stroke(); for (let px = x0; px <= x1; px += 7) { if (px > l.cx - gate && px < l.cx + gate) continue; ctx.beginPath(); ctx.moveTo(px, fy2 - 6); ctx.lineTo(px, fy2 + 2); ctx.stroke(); } }
    if (isNew && tg.labels) { ctx.strokeStyle = "#e8a33d"; ctx.lineWidth = 3.5; ctx.setLineDash([8, 5]); rr(x - 4, y - 4, w + 8, h + 8, 9); ctx.stroke(); ctx.setLineDash([]); label("NEW", l.cx, y - 11, "#a85d12", 13, "#fff3da"); }
    if (tg.labels) label("plot " + (l.index + 1), l.cx, dy + 12, "#4a361a", 12, "#f4ecd8"); ctx.restore();
  }
  function drawChapel(l, isNew) { const cx = l.cx, w = Math.min(l.w, 92), h = l.h, x = cx - w / 2, y = l.cy - h / 2; ctx.save(); shadow(cx, y + h - 2, w * 0.44, 9); const roofH = h * 0.44, wallTop = y + roofH, wallBot = y + h - 6; ctx.fillStyle = "#e3d7bf"; ctx.strokeStyle = "#6e4a26"; ctx.lineWidth = 2.5; rr(x + 10, wallTop, w - 20, wallBot - wallTop, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#6f8a9c"; ctx.beginPath(); ctx.moveTo(x + 4, wallTop + 5); ctx.lineTo(cx, y - 4); ctx.lineTo(x + w - 4, wallTop + 5); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#cdb784"; ctx.fillRect(cx - 7, y - 20, 14, 15); ctx.fillStyle = "#8a5a32"; ctx.beginPath(); ctx.moveTo(cx - 9, y - 20); ctx.lineTo(cx, y - 29); ctx.lineTo(cx + 9, y - 20); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#cdb784"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, y - 29); ctx.lineTo(cx, y - 37); ctx.moveTo(cx - 4, y - 34); ctx.lineTo(cx + 4, y - 34); ctx.stroke(); const lit = dusk > 0.4; ctx.fillStyle = lit ? "#ffd98a" : "#9ec7e0"; ctx.beginPath(); ctx.moveTo(cx - 7, wallBot - 10); ctx.lineTo(cx - 7, wallTop + 20); ctx.arc(cx, wallTop + 20, 7, Math.PI, 0, false); ctx.lineTo(cx + 7, wallBot - 10); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#5e3e22"; rr(cx - 9, wallBot - 19, 18, 19, 3); ctx.fill(); if (tg.labels) label(isNew ? "NEW" : "Chapel", cx, wallBot + 16, "#3a2f1c", 12, "#f4eede"); ctx.restore(); }
  function drawTownHall(l, isNew) { const cx = l.cx, w = l.w + 10, h = l.h + 6, x = cx - w / 2, y = l.cy - h / 2; ctx.save(); shadow(cx, y + h - 2, w * 0.5, 10); const roofH = h * 0.28, wallTop = y + roofH, wallBot = y + h - 6, wallH = wallBot - wallTop; ctx.fillStyle = "#ecd8ad"; ctx.strokeStyle = "#6e4a26"; ctx.lineWidth = 2.5; rr(x + 5, wallTop, w - 10, wallH, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#9c5a3a"; ctx.beginPath(); ctx.moveTo(x, wallTop + 5); ctx.lineTo(x + w * 0.28, y); ctx.lineTo(x + w * 0.72, y); ctx.lineTo(x + w, wallTop + 5); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#f4ecd8"; ctx.beginPath(); ctx.arc(cx, y + roofH * 0.55, 6, 0, 7); ctx.fill(); ctx.strokeStyle = "#6e4a26"; ctx.lineWidth = 1.5; ctx.stroke(); const fl = Math.sin(time * 3) * 3; ctx.strokeStyle = "#7a5a32"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, y - 14); ctx.stroke(); ctx.fillStyle = "#b6422c"; ctx.beginPath(); ctx.moveTo(cx, y - 14); ctx.lineTo(cx + 12 + fl, y - 11); ctx.lineTo(cx, y - 6); ctx.closePath(); ctx.fill(); const lit = dusk > 0.4, wc = lit ? "#ffd98a" : "#bfe0ef"; const win = (wx, wy) => { ctx.fillStyle = wc; ctx.fillRect(wx, wy, 12, 11); ctx.strokeStyle = "#6e4a26"; ctx.lineWidth = 1; ctx.strokeRect(wx, wy, 12, 11); }; const xs = [x + 14, cx - 6, x + w - 26]; for (const wx of xs) { win(wx, wallTop + 7); win(wx, wallTop + wallH * 0.55); } ctx.fillStyle = "#e0cba0"; ctx.fillRect(cx - 17, wallBot - 17, 5, 17); ctx.fillRect(cx + 12, wallBot - 17, 5, 17); ctx.fillStyle = "#caa46b"; ctx.fillRect(cx - 21, wallBot - 1, 42, 5); ctx.fillStyle = "#5e3e22"; rr(cx - 9, wallBot - 18, 18, 18, 2); ctx.fill(); if (tg.labels) label(isNew ? "NEW" : "Town Hall", cx, wallBot + 16, "#3a2f1c", 12, "#f4eede"); ctx.restore(); }
  const PLOT_KIND = SPECIAL;
  function drawPlot(l, isNew) { const x = l.cx - l.w / 2, y = l.cy - l.h / 2, w = l.w, h = l.h; ctx.save(); ctx.fillStyle = "rgba(20,16,28,.16)"; ctx.beginPath(); ctx.ellipse(l.cx + 6, y + h, w * 0.46, 8, 0, 0, 7); ctx.fill(); ctx.fillStyle = isNew ? "rgba(232,163,61,.22)" : "rgba(199,178,128,.34)"; rr(x + 2, y + 2, w - 4, h - 4, 6); ctx.fill(); ctx.strokeStyle = isNew ? "#e8a33d" : "#8a6a3c"; ctx.lineWidth = isNew ? 3 : 2; ctx.setLineDash([7, 5]); rr(x + 4, y + 4, w - 8, h - 8, 5); ctx.stroke(); ctx.setLineDash([]); const fe = (l.side === 'N') ? y + h - 4 : y + 4; if (l.side === 'N' || l.side === 'S') { ctx.fillStyle = "#6abf3f"; ctx.strokeStyle = "#37611f"; ctx.lineWidth = 1; rr(x + 8, fe - 3, w - 16, 6, 3); ctx.fill(); ctx.stroke(); } ctx.fillStyle = "rgba(110,74,38,.30)"; ctx.beginPath(); ctx.moveTo(l.cx - 10, l.cy); ctx.lineTo(l.cx, l.cy - 11); ctx.lineTo(l.cx + 10, l.cy); ctx.closePath(); ctx.fill(); ctx.fillRect(l.cx - 7, l.cy, 14, 9); const k = PLOT_KIND[l.index]; if (isNew) { ctx.strokeStyle = "#e8a33d"; ctx.lineWidth = 3; ctx.setLineDash([7, 5]); rr(x - 3, y - 3, w + 6, h + 6, 8); ctx.stroke(); ctx.setLineDash([]); label("NEW", x + 15, y - 7, "#a85d12", 10, "#fff3da"); } if (tg.labels) label(k ? k : ("plot " + (l.index + 1)), l.cx, l.cy + 20, "#4a361a", 12, "#f4ecd8"); ctx.restore(); }

  function drawLandmark() { if (!Z.landmark) return; const cx = Z.landmark.cx, cy = Z.landmark.cy; ctx.save();
    if (TIER < 2) { shadow(cx, cy + 6, 22, 6); ctx.fillStyle = "#b7b0a3"; ctx.strokeStyle = "#7c7464"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, 24, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#3b566a"; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, 7); ctx.fill(); ctx.strokeStyle = "#9c6b3f"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx - 20, cy - 24); ctx.lineTo(cx - 20, cy - 40); ctx.moveTo(cx + 20, cy - 24); ctx.lineTo(cx + 20, cy - 40); ctx.moveTo(cx - 24, cy - 38); ctx.lineTo(cx + 24, cy - 38); ctx.stroke(); label("Well", cx, cy + 40, "#4a361a", 14, "#eef3e6"); }
    else if (TIER === 2) { shadow(cx, cy + 10, 40, 10); if (assetsOK) ctx.drawImage(baked.fountain, cx - 48, cy - 72, 96, 96); else { ctx.fillStyle = "#aeb6bd"; ctx.beginPath(); ctx.arc(cx, cy, 38, 0, 7); ctx.fill(); ctx.fillStyle = "#5bb4d6"; ctx.beginPath(); ctx.arc(cx, cy, 28, 0, 7); ctx.fill(); } const jh = 10 + Math.sin(time * 4) * 3; ctx.fillStyle = "rgba(180,225,240,.85)"; ctx.beginPath(); ctx.ellipse(cx, cy - 20 - jh, 4, jh, 0, 0, 7); ctx.fill(); label("Fountain", cx, cy - 58, "#234a5c", 15, "#eef6fb"); }
    else { shadow(cx, cy + 22, 34, 8); ctx.fillStyle = "#9aa1a8"; rr(cx - 30, cy + 6, 60, 16, 4); ctx.fill(); ctx.fillStyle = "#aab0b6"; rr(cx - 23, cy - 4, 46, 12, 3); ctx.fill(); ctx.fillStyle = "#b8bdc2"; rr(cx - 16, cy - 12, 32, 10, 3); ctx.fill(); ctx.fillStyle = "#cdb784"; ctx.beginPath(); ctx.moveTo(cx, cy - 60); ctx.lineTo(cx - 11, cy - 12); ctx.lineTo(cx + 11, cy - 12); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#7a5a32"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy - 60); ctx.lineTo(cx, cy - 72); ctx.stroke(); const fl = Math.sin(time * 3) * 3; ctx.fillStyle = "#b6422c"; ctx.beginPath(); ctx.moveTo(cx, cy - 72); ctx.lineTo(cx + 12 + fl, cy - 69); ctx.lineTo(cx, cy - 64); ctx.closePath(); ctx.fill(); label("Town Square", cx, cy + 34, "#3a2f1c", 15, "#f4eede"); }
    ctx.restore(); }

  function drawMill() { if (!MILL || MILL.from > TIER) return; const x = MILL.x, y = MILL.y; ctx.save(); shadow(x, y, 30, 8); const wx = x - 30, wy = y - 13, wr = 20; ctx.strokeStyle = "#6e4a26"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(wx, wy, wr, 0, 7); ctx.stroke(); ctx.lineWidth = 2.5; for (let i = 0; i < 8; i++) { const a = time * 1.5 + i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr); ctx.stroke(); ctx.save(); ctx.translate(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr); ctx.rotate(a); ctx.fillStyle = "#8a5a32"; ctx.fillRect(-5, -2.5, 10, 5); ctx.restore(); } ctx.fillStyle = "rgba(220,240,250," + (0.45 + 0.3 * Math.abs(Math.sin(time * 5))) + ")"; ctx.beginPath(); ctx.arc(wx - 2, wy + wr + 1, 4.5, 0, 7); ctx.fill(); const bw = 46, bh = 30, bx = x - bw / 2 + 8, by = y - bh; ctx.fillStyle = "#bbb2a2"; ctx.strokeStyle = "#7c7464"; ctx.lineWidth = 2; rr(bx, by, bw, bh, 3); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#e0cba0"; ctx.strokeStyle = "#6e4a26"; rr(bx + 4, by - 13, bw - 8, 15, 3); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#9c4a2c"; ctx.beginPath(); ctx.moveTo(bx - 5, by - 11); ctx.lineTo(x + 8, by - 30); ctx.lineTo(bx + bw + 5, by - 11); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#5e3e22"; rr(x + 2, by + bh - 15, 12, 15, 2); ctx.fill(); const lit = dusk > 0.4; ctx.fillStyle = lit ? "#ffd98a" : "#bfe0ef"; ctx.fillRect(bx + 7, by + 7, 11, 10); label("Mill", x, y + 12, "#3a2f1c", 13, "#f4eede"); ctx.restore(); }
  function drawDock() { if (!DOCK || DOCK.from > TIER) return; ctx.save(); ctx.fillStyle = "#b88a52"; ctx.strokeStyle = "#7a5a32"; ctx.lineWidth = 2; rr(DOCK.x - 13, DOCK.y0, 26, DOCK.y1 - DOCK.y0, 3); ctx.fill(); ctx.stroke(); ctx.strokeStyle = "rgba(90,66,40,.5)"; ctx.lineWidth = 1.5; for (let y = DOCK.y0 + 5; y < DOCK.y1; y += 7) { ctx.beginPath(); ctx.moveTo(DOCK.x - 13, y); ctx.lineTo(DOCK.x + 13, y); ctx.stroke(); } ctx.restore(); }

  // ── widgets (dressing) ─────────────────────────────────────────
  const WIDGETS = Z.widgets || [];
  function drawWidget(wd) { const x = wd.x, y = wd.y; ctx.save();
    if (wd.k === 'lamp') { shadow(x, y + 10, 5, 2); ctx.strokeStyle = "#5a4a36"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x, y - 12); ctx.stroke(); const on = dusk > 0.35; if (on) { const g = ctx.createRadialGradient(x, y - 16, 2, x, y - 16, 34); g.addColorStop(0, "rgba(255,228,150," + (0.78 * dusk) + ")"); g.addColorStop(1, "rgba(255,210,110,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 16, 34, 0, 7); ctx.fill(); } ctx.fillStyle = on ? "#ffe6a0" : "#cdbb8a"; ctx.beginPath(); ctx.arc(x, y - 15, 5, 0, 7); ctx.fill(); ctx.strokeStyle = "#5a4a36"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); return; }
    if (wd.k === 'bench') { shadow(x, y + 4, 15, 3); ctx.fillStyle = "#9c6b3f"; rr(x - 13, y - 3, 26, 7, 2); ctx.fill(); ctx.fillStyle = "#7a5026"; ctx.fillRect(x - 13, y - 12, 4, 12); ctx.fillRect(x + 9, y - 12, 4, 12); ctx.restore(); return; }
    if (wd.k === 'planter') { shadow(x, y + 6, 13, 3); ctx.fillStyle = "#9c6b3f"; rr(x - 12, y - 2, 24, 9, 2); ctx.fill(); const cols = ["#e58fb0", "#ffd24d", "#fff0f2", "#c9a0e0"]; for (let i = -2; i <= 2; i++) { const sw = Math.sin(time * 2 + i + x) * 1.2; ctx.fillStyle = cols[(i + 2) % cols.length]; ctx.beginPath(); ctx.arc(x + i * 6 + sw, y - 4, 3.3, 0, 7); ctx.fill(); } ctx.restore(); return; }
    if (wd.k === 'banner') { ctx.strokeStyle = "#7a5a32"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - 26); ctx.lineTo(x, y + 6); ctx.stroke(); const fl = Math.sin(time * 2.4 + x) * 3; ctx.fillStyle = "#b6422c"; ctx.beginPath(); ctx.moveTo(x, y - 24); ctx.lineTo(x + 18 + fl, y - 20); ctx.lineTo(x, y - 8); ctx.closePath(); ctx.fill(); ctx.restore(); return; }
    if (wd.k === 'signpost') { shadow(x, y + 10, 7, 2); ctx.strokeStyle = "#7a5a32"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x, y - 14); ctx.stroke(); ctx.fillStyle = "#caa46b"; ctx.strokeStyle = "#7a5a32"; ctx.lineWidth = 1.5; rr(x - 1, y - 13, 15, 7, 2); ctx.fill(); ctx.stroke(); rr(x - 14, y - 3, 15, 7, 2); ctx.fill(); ctx.stroke(); ctx.restore(); return; }
    if (wd.k === 'market') { shadow(x, y + 12, 18, 4); ctx.fillStyle = "#caa46b"; ctx.strokeStyle = "#7a5a32"; ctx.lineWidth = 2; rr(x - 16, y - 1, 32, 15, 2); ctx.fill(); ctx.stroke(); for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? "#d9534f" : "#f6ead0"; ctx.beginPath(); ctx.moveTo(x - 16 + i * 6.4, y - 1); ctx.lineTo(x - 16 + i * 6.4 + 3.2, y - 9); ctx.lineTo(x - 16 + (i + 1) * 6.4, y - 1); ctx.closePath(); ctx.fill(); } ctx.fillStyle = "#7a5026"; ctx.fillRect(x - 16, y - 10, 32, 3); ctx.fillStyle = "#b6422c"; ctx.beginPath(); ctx.arc(x - 9, y + 6, 3, 0, 7); ctx.fill(); ctx.fillStyle = "#6e8b4f"; ctx.beginPath(); ctx.arc(x + 1, y + 6, 3, 0, 7); ctx.fill(); ctx.fillStyle = "#e0a33a"; ctx.beginPath(); ctx.arc(x + 9, y + 6, 3, 0, 7); ctx.fill(); ctx.restore(); return; }
    if (wd.k === 'cart') { shadow(x, y + 6, 15, 3); ctx.fillStyle = "#9c6b3f"; rr(x - 14, y - 8, 28, 10, 2); ctx.fill(); ctx.fillStyle = "#e6c34a"; ctx.fillRect(x - 11, y - 12, 22, 5); ctx.fillStyle = "#5a3a18"; ctx.beginPath(); ctx.arc(x - 8, y + 4, 4, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x + 8, y + 4, 4, 0, 7); ctx.fill(); ctx.restore(); return; }
    if (wd.k === 'haybale') { shadow(x, y + 5, 12, 3); ctx.fillStyle = "#e6c34a"; ctx.strokeStyle = "#b89324"; ctx.lineWidth = 1.5; rr(x - 11, y - 9, 22, 16, 4); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x, y + 7); ctx.stroke(); ctx.restore(); return; }
    if (wd.k === 'reed') { const sw = Math.sin(time * 1.8 + x) * 2.2; ctx.strokeStyle = "#4f7a3a"; ctx.lineWidth = 2; ctx.lineCap = "round"; for (let i = 0; i < 3; i++) { const bx = x + (i - 1) * 5; ctx.beginPath(); ctx.moveTo(bx, y + 5); ctx.quadraticCurveTo(bx + sw, y - 8, bx + sw * 1.3, y - 18); ctx.stroke(); ctx.fillStyle = "#7a4a26"; ctx.beginPath(); ctx.ellipse(bx + sw * 1.3, y - 17, 2.2, 5.5, 0, 0, 7); ctx.fill(); } ctx.restore(); return; }
    if (wd.k === 'boat') { const bob = Math.sin(time * 1.2 + x) * 1.6; ctx.translate(0, bob); ctx.fillStyle = "rgba(20,40,60,.25)"; ctx.beginPath(); ctx.ellipse(x, y + 5, 15, 4, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#9c6b3f"; ctx.beginPath(); ctx.moveTo(x - 15, y - 1); ctx.quadraticCurveTo(x, y + 9, x + 15, y - 1); ctx.quadraticCurveTo(x, y + 3, x - 15, y - 1); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#6e4a26"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); return; }
    if (wd.k === 'fishrack') { shadow(x, y + 6, 16, 3); ctx.strokeStyle = "#7a5026"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 15, y + 4); ctx.lineTo(x - 15, y - 14); ctx.lineTo(x + 15, y - 14); ctx.lineTo(x + 15, y + 4); ctx.stroke(); for (let i = 0; i < 3; i++) { const fx = x - 10 + i * 10; ctx.fillStyle = "#b9c6cf"; ctx.beginPath(); ctx.ellipse(fx, y - 4, 3, 6, 0, 0, 7); ctx.fill(); } ctx.restore(); return; }
    if (wd.k === 'woodpile') { shadow(x, y + 6, 17, 4); for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) { const lx = x - 14 + c * 10, ly = y - 1 - r * 8; ctx.fillStyle = "#9c6b3f"; ctx.beginPath(); ctx.arc(lx, ly, 4.6, 0, 7); ctx.fill(); ctx.fillStyle = "#caa46b"; ctx.beginPath(); ctx.arc(lx, ly, 2.4, 0, 7); ctx.fill(); } ctx.restore(); return; }
    if (wd.k === 'logboom') { ctx.fillStyle = "#9c6b3f"; ctx.strokeStyle = "#6e4a26"; ctx.lineWidth = 1.5; for (let i = 0; i < (wd.n || 5); i++) { const lx = x + i * 13, ly = y + Math.sin(time * 0.8 + i) * 1.5; rr(lx - 6, ly - 5, 12, 10, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#caa46b"; ctx.beginPath(); ctx.arc(lx, ly, 2.6, 0, 7); ctx.fill(); ctx.fillStyle = "#9c6b3f"; } ctx.restore(); return; }
    if (wd.k === 'vegplot') { shadow(x, y + 9, 18, 4); ctx.fillStyle = "#7a5230"; rr(x - 16, y - 8, 32, 18, 3); ctx.fill(); ctx.strokeStyle = "rgba(40,26,12,.4)"; ctx.lineWidth = 2; for (let ry = y - 4; ry < y + 8; ry += 5) { ctx.beginPath(); ctx.moveTo(x - 13, ry); ctx.lineTo(x + 13, ry); ctx.stroke(); } const gc = ["#6e8b4f", "#7bbf5a", "#d05a5a"]; for (let i = 0; i < 8; i++) { ctx.fillStyle = gc[i % 3]; ctx.beginPath(); ctx.arc(x - 12 + (i % 4) * 8, y - 3 + (((i / 4) | 0) * 6), 2, 0, 7); ctx.fill(); } ctx.restore(); return; }
    if (wd.k === 'campfire') { shadow(x, y + 5, 13, 3); if (dusk > 0.3) { const g2 = ctx.createRadialGradient(x, y - 6, 2, x, y - 6, 30); g2.addColorStop(0, "rgba(255,160,60," + (0.5 * dusk) + ")"); g2.addColorStop(1, "rgba(255,140,40,0)"); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x, y - 6, 30, 0, 7); ctx.fill(); } ctx.fillStyle = "#7a5026"; ctx.save(); ctx.translate(x, y); ctx.rotate(0.5); ctx.fillRect(-10, -2, 20, 3.5); ctx.rotate(-1.0); ctx.fillRect(-10, -2, 20, 3.5); ctx.restore(); const fl = Math.abs(Math.sin(time * 8 + x)) * 4; ctx.fillStyle = "#e8902a"; ctx.beginPath(); ctx.moveTo(x - 6, y - 1); ctx.quadraticCurveTo(x, y - 14 - fl, x + 6, y - 1); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#f7d64a"; ctx.beginPath(); ctx.moveTo(x - 3, y - 1); ctx.quadraticCurveTo(x, y - 9 - fl, x + 3, y - 1); ctx.closePath(); ctx.fill(); ctx.restore(); return; }
    ctx.restore(); }

  // ── townsfolk ──────────────────────────────────────────────────
  function mkRoute(pts, spd, from) { return { pts, spd: spd || 40, seg: 0, p: 0, from: from || 0, kind: 'walk' }; }
  const ACTORS = (Z.actors || []).map((a) => a.pts ? mkRoute(a.pts, a.spd, a.from) : a);
  { const TINTS = [null, "#3f6fa5", "#b05050", null, "#4f8a5f", "#7a5aa5", "#c89a40", "#50808a", "#a5567a", null, "#3a7a8a", "#9c6b3f"]; ACTORS.forEach((a, i) => { a.tint = TINTS[i % TINTS.length]; }); }
  function actorPos(a) { const A = a.pts[a.seg], B = a.pts[(a.seg + 1) % a.pts.length], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, x = A[0] + dx * a.p, y = A[1] + dy * a.p; let dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'back' : 'front'); return [x, y, dir, L > 2]; }
  function stepActor(a, dt) { if (a.kind !== 'walk') return; const A = a.pts[a.seg], B = a.pts[(a.seg + 1) % a.pts.length], L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1; a.p += a.spd * dt / L; while (a.p >= 1) { a.p -= 1; a.seg = (a.seg + 1) % a.pts.length; } }
  const _tc = document.createElement('canvas'), _tx = _tc.getContext('2d'); _tx.imageSmoothingEnabled = false;
  function drawSprite(f, dx, dy, dw, dh, tint) { if (!tint) { ctx.drawImage(atlas, f[0], f[1], f[2], f[3], dx, dy, dw, dh); return; } _tc.width = f[2]; _tc.height = f[3]; _tx.clearRect(0, 0, f[2], f[3]); _tx.drawImage(atlas, f[0], f[1], f[2], f[3], 0, 0, f[2], f[3]); _tx.globalCompositeOperation = 'source-atop'; _tx.globalAlpha = 0.4; _tx.fillStyle = tint; _tx.fillRect(0, 0, f[2], f[3]); _tx.globalAlpha = 1; _tx.globalCompositeOperation = 'source-over'; ctx.drawImage(_tc, 0, 0, f[2], f[3], dx, dy, dw, dh); }
  function drawActor(a) { let x, y, dir, moving; if (a.kind === 'walk') { [x, y, dir, moving] = actorPos(a); } else { const bob = a.kind === 'kid' ? Math.sin(time * 4 + a.x) * 6 : 0; x = a.x + bob; y = a.y; dir = a.dir; moving = a.kind === 'kid'; } const sc = (a.kind === 'kid') ? 1.0 : 1.35; shadow(x, y, 9 * sc, 3.5 * sc); if (assetsOK && atlas) { let fr = FR[dir] || FR.front, fi = moving ? (((Math.floor(time * 8 + (x || 0)) % 4) + 4) % 4) : 1, f = fr[fi] || fr[1] || FR.front[1]; if (f && isFinite(x) && isFinite(y)) drawSprite(f, x - f[2] * sc / 2, y - f[3] * sc, f[2] * sc, f[3] * sc, a.tint); } else { ctx.fillStyle = "#b6422c"; rr(x - 5 * sc, y - 22 * sc, 10 * sc, 16 * sc, 3); ctx.fill(); ctx.fillStyle = "#e8b48a"; ctx.beginPath(); ctx.arc(x, y - 24 * sc, 5 * sc, 0, 7); ctx.fill(); } }
  const CRITTERS = Z.critters || [];
  function drawCritter(cr) { const x = cr.x, y = cr.y; ctx.save(); if (cr.k === 'chick') { const pk = Math.sin(time * 4 + x) * 2; shadow(x, y + 5, 6, 2); ctx.fillStyle = "#f3f0ea"; ctx.beginPath(); ctx.ellipse(x, y - 3 + pk, 5, 4, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x - 3, y - 7 + pk, 2.4, 0, 7); ctx.fill(); ctx.fillStyle = "#d9534f"; ctx.beginPath(); ctx.arc(x - 3, y - 10 + pk, 1.3, 0, 7); ctx.fill(); } else if (cr.k === 'duck') { const dx = Math.sin(time * 0.9 + x) * 8; shadow(x + dx, y + 4, 7, 2.5); ctx.fillStyle = "#f3f0ea"; ctx.beginPath(); ctx.ellipse(x + dx, y, 7, 4.5, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x + dx - 5, y - 3, 3.2, 0, 7); ctx.fill(); ctx.fillStyle = "#e8902a"; ctx.fillRect(x + dx - 9, y - 3, 3, 2); } else if (cr.k === 'dog') { const tw = Math.sin(time * 6) * 3; shadow(x, y + 4, 9, 3); ctx.fillStyle = "#c98a3a"; ctx.beginPath(); ctx.ellipse(x, y - 3, 7, 4, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x + 6, y - 6, 3.2, 0, 7); ctx.fill(); ctx.fillStyle = "#9c6b3f"; ctx.beginPath(); ctx.moveTo(x - 6, y - 5); ctx.lineTo(x - 9 - tw, y - 9); ctx.lineTo(x - 7, y - 2); ctx.closePath(); ctx.fill(); } ctx.restore(); }

  let smoke = [];
  function emitSmoke(x, y) { if (smoke.length > 120) return; smoke.push({ x, y, vy: -12 - Math.random() * 8, vx: (Math.random() - 0.5) * 8, r: 3 + Math.random() * 2, life: 0, max: 2.6 + Math.random() }); }
  function chimneys() { const out = []; for (const l of revLots()) { if (l.index % 2 !== 0 || SPECIAL[l.index]) continue; out.push([l.cx - l.w / 2 + 16, l.cy - l.h / 2 + l.h * 0.21]); } return out; }
  const FLIES = (() => { const r = mb(0x1337), o = []; for (let i = 0; i < 64; i++) o.push({ x: r() * W, y: 200 + r() * 600, ph: r() * 6.28, sp: 0.4 + r() * 0.6 }); return o; })();

  // ── state + loop ───────────────────────────────────────────────
  let TIER = 0, time = 0, last = 0, dusk = 0, duskTarget = 0, smokeT = 0;
  const tg = { dressing: true, labels: true, forest: true, buildings: true, dusk: false, grid: false };
  function drawWaterShimmer() { ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.strokeStyle = "rgba(255,255,255,.10)"; ctx.lineWidth = 3; for (const r of RIVERS) { for (let i = 0; i < r.pts.length - 1; i++) { const a = r.pts[i], b = r.pts[i + 1]; for (let t = 0; t < 1; t += 0.2) { const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, o = Math.sin(time * 1.4 + i + t) * 5; ctx.beginPath(); ctx.moveTo(x - 8 + o, y); ctx.lineTo(x + 8 + o, y); ctx.stroke(); } } } for (const lk of LAKES) { const po = Math.sin(time * 1.2) * 6; ctx.beginPath(); ctx.ellipse(lk.cx - 6 + po * 0.4, lk.cy - 6, lk.rx * 0.5, lk.ry * 0.35, 0, 0, 7); ctx.stroke(); } ctx.restore(); }
  function loop(ts) { const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts; time += dt; dusk += (duskTarget - dusk) * Math.min(1, dt * 3); for (const a of ACTORS) if (a.from <= TIER) stepActor(a, dt); smokeT += dt; if (smokeT > 0.18) { smokeT = 0; for (const c of chimneys()) if (Math.random() < 0.6) emitSmoke(c[0], c[1]); } try { render(); } catch (e) {} requestAnimationFrame(loop); }

  function render() {
    ctx.clearRect(0, 0, W, H);
    if (groundDirty) rebuildGround();
    ctx.drawImage(offG, 0, 0);
    drawWaterShimmer();
    const items = [];
    if (tg.forest) for (const t of TREES) { if (cleared(t.x, t.y, TIER) || inWater(t.x, t.y)) continue; if (CLEAR_SPOTS.some((s) => Math.abs(t.x - s[0]) < s[2] && Math.abs(t.y - s[1]) < s[3])) continue; items.push({ y: t.y, z: 0, d: () => drawTree(t) }); }
    for (const b of BUSHES) if (b.from <= TIER) items.push({ y: b.y, z: 1, d: () => drawBush(b) });
    for (const l of revLots()) items.push({ y: l.cy + l.h / 2, z: 2, d: () => tg.buildings ? drawCottage(l, l.t === TIER) : drawPlot(l, l.t === TIER) });
    if (FIELD) items.push({ y: FIELD.y + FIELD.h, z: 2, d: drawField });
    if (Z.landmark) items.push({ y: Z.landmark.cy + 6, z: 1, d: drawLandmark });
    if (tg.dressing) for (const wd of WIDGETS) { if (wd.from <= TIER && (wd.to === undefined || TIER <= wd.to)) items.push({ y: wd.y, z: 2, d: () => drawWidget(wd) }); }
    if (DOCK) items.push({ y: DOCK.y1, z: 1, d: drawDock });
    if (MILL) items.push({ y: MILL.y + 8, z: 2, d: drawMill });
    items.sort((p, q) => (p.y - q.y) || (p.z - q.z));
    for (const it of items) it.d();
    for (const s of smoke) { s.life += 1 / 60; s.x += s.vx / 60; s.y += s.vy / 60; } smoke = smoke.filter((s) => s.life < s.max); for (const s of smoke) { const k = s.life / s.max; ctx.fillStyle = "rgba(225,225,228," + (0.4 * (1 - k)) + ")"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r + k * 6, 0, 7); ctx.fill(); }
    for (const a of ACTORS) if (a.from <= TIER) drawActor(a);
    for (const cr of CRITTERS) if (cr.from <= TIER) drawCritter(cr);
    { ctx.save(); ctx.globalCompositeOperation = "soft-light"; const lg = ctx.createLinearGradient(0, 0, W, H); lg.addColorStop(0, "rgba(255,241,201,0.20)"); lg.addColorStop(1, "rgba(54,64,104,0.14)"); ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    if (dusk > 0.01) drawDusk();
    drawVignette();
    if (tg.grid) drawGrid();
  }
  function drawDusk() { ctx.save(); ctx.fillStyle = "rgba(34,28,64," + (0.6 * dusk) + ")"; ctx.globalCompositeOperation = "multiply"; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "overlay"; ctx.fillStyle = "rgba(255,150,70," + (0.10 * dusk) + ")"; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "screen"; for (const f of FLIES) { const fx = (f.x + Math.sin(time * f.sp + f.ph) * 30) % W, fy = f.y + Math.cos(time * f.sp * 0.8 + f.ph) * 18, a = (0.4 + 0.6 * Math.abs(Math.sin(time * 2 + f.ph))) * dusk; ctx.fillStyle = "rgba(255,236,150," + a + ")"; ctx.beginPath(); ctx.arc(fx, fy, 1.8, 0, 7); ctx.fill(); } ctx.restore(); }
  function drawVignette() { ctx.save(); const g = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.35, W / 2, H * 0.5, H * 0.85); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(20,18,10,0.28)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  function drawGrid() { ctx.save(); ctx.strokeStyle = "rgba(0,0,0,.08)"; ctx.lineWidth = 1; for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * TILE, 0); ctx.lineTo(x * TILE, H); ctx.stroke(); } for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * TILE); ctx.lineTo(W, y * TILE); ctx.stroke(); } ctx.restore(); }
  function label(t, x, y, col, size, halo) { ctx.save(); ctx.font = "700 " + (size || 14) + "px 'IBM Plex Sans',sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 4; ctx.strokeStyle = halo || "rgba(255,255,255,.7)"; ctx.lineJoin = "round"; ctx.strokeText(t, x, y); ctx.fillStyle = col; ctx.fillText(t, x, y); ctx.restore(); }

  // ── controls ───────────────────────────────────────────────────
  function syncUI() {
    document.querySelectorAll(`[data-tierbtn-for] button`).forEach((b) => b.classList.toggle("on", +b.dataset.tier === TIER));
    const cap = document.querySelector(`[data-caption-for]`); if (cap) { const Tn = TIERS[TIER]; cap.innerHTML = `<b>${Tn.name} — ${Tn.plots} plots.</b> ${CAPTIONS[TIER]}`; }
    const stat = document.querySelector(`[data-stat-for]`); if (stat) stat.textContent = `${TIER_NAMES[TIER]} · ${revLots().length} plots · ${revRoads().length} road segments · ${TIER >= NT - 1 ? "cobbled streets" : TIER >= 2 ? "dirt + cobbled plaza" : "dirt paths"} · 40×30 grid`;
  }
  function setTier(t) { TIER = Math.max(0, Math.min(NT - 1, t)); groundDirty = true; syncUI(); }
  document.querySelectorAll(`[data-tierbtn-for] button`).forEach((b) => b.addEventListener("click", () => { stopGrow(); setTier(+b.dataset.tier); }));
  let gt = null; const growBtn = document.querySelector(`[data-grow-for]`);
  function stopGrow() { if (gt) { clearInterval(gt); gt = null; if (growBtn) growBtn.textContent = "Grow ▸"; } }
  if (growBtn) growBtn.addEventListener("click", () => { if (gt) { stopGrow(); return; } growBtn.textContent = "❚❚ pause"; setTier(0); let t = 0; gt = setInterval(() => { t++; if (t > NT - 1) { stopGrow(); return; } setTier(t); }, 1600); });
  document.querySelectorAll(`[data-toggle-for]`).forEach((c) => c.addEventListener("change", () => { const k = c.dataset.toggle; tg[k] = c.checked; if (k === 'dusk') duskTarget = c.checked ? 1 : 0; if (k === 'forest') groundDirty = true; render(); }));

  if (document.readyState === "loading") addEventListener("DOMContentLoaded", boot); else boot();
})();
