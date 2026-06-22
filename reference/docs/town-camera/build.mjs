// Generates docs/town-camera/index.html — the Town Camera / Projection concept board.
// Self-contained output (inline CSS + inline parametric SVG diagrams). The only
// external assets are the license-clean Wikimedia figures under refs/ (see refs/ATTRIBUTIONS.md).
//
// Run:  node docs/town-camera/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = JSON.parse(fs.readFileSync(path.join(HERE, 'data.json'), 'utf8'));

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ───────────────────────────────────────────────────────────── palette
const PAL = {
  sky1: '#cfe6f2', sky2: '#eef6f9',
  grass: '#a7c46a', grassDark: '#8aa84f', grid: 'rgba(70,90,40,.45)',
  sand: '#e2cda1', sandLine: '#cdb381', water: '#6fa3c9',
  wall: '#efdcb4', wallSide: '#d2ba8b', wallDark: '#bfa477',
  roof: '#c45a38', roofDark: '#9c4329', door: '#6b4a2e',
  win: '#bfe0ef', winLit: '#ffd06a',
  trunk: '#7d5532', canopy: '#5f9442', canopyDark: '#4d7d34',
  ink: '#3a2f20', line: '#5a4a30', accent: '#8a5a2b', accent2: '#4f7a34',
  shadow: 'rgba(40,28,8,.16)', glow: '#ffc890', stone: '#b9b2a3',
};

// ───────────────────────────────────────────────────────────── scene helper (auto-bbox)
function mkScene() {
  const parts = [], pts = [], defs = [];
  const T = (x, y) => pts.push([x, y]);
  const n = (v) => Number(v).toFixed(1);
  return {
    parts, defs, pts,
    raw: (s) => parts.push(s),
    def: (s) => defs.push(s),
    poly(points, fill, stroke = 'none', sw = 1, extra = '') {
      points.forEach((p) => T(p[0], p[1]));
      parts.push(`<polygon points="${points.map((p) => n(p[0]) + ',' + n(p[1])).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`);
    },
    line(a, b, stroke, sw = 1, extra = '') {
      T(a[0], a[1]); T(b[0], b[1]);
      parts.push(`<line x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0])}" y2="${n(b[1])}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`);
    },
    circle(c, r, fill, stroke = 'none', sw = 1, extra = '') {
      T(c[0] - r, c[1] - r); T(c[0] + r, c[1] + r);
      parts.push(`<circle cx="${n(c[0])}" cy="${n(c[1])}" r="${n(r)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`);
    },
    ellipse(c, rx, ry, fill, stroke = 'none', sw = 1, extra = '') {
      T(c[0] - rx, c[1] - ry); T(c[0] + rx, c[1] + ry);
      parts.push(`<ellipse cx="${n(c[0])}" cy="${n(c[1])}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`);
    },
    rect(x, y, w, h, fill, stroke = 'none', sw = 1, rx = 0, extra = '') {
      T(x, y); T(x + w, y + h);
      parts.push(`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`);
    },
    path(d, fill, stroke = 'none', sw = 1, trackPts = [], extra = '') {
      trackPts.forEach((p) => T(p[0], p[1]));
      parts.push(`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`);
    },
    text(x, y, s, opt = {}) {
      const { size = 10.5, fill = PAL.ink, anchor = 'start', weight = 700, mono = true } = opt;
      T(x, y);
      const fam = mono ? 'JetBrains Mono, ui-monospace, monospace' : 'IBM Plex Sans, sans-serif';
      parts.push(`<text x="${n(x)}" y="${n(y)}" font-family="${fam}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`);
    },
  };
}

function finalize(S, vbW = 340, vbH = 232, pad = 14) {
  const xs = S.pts.map((p) => p[0]), ys = S.pts.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX, h = maxY - minY;
  const scale = Math.min((vbW - 2 * pad) / w, (vbH - 2 * pad) / h);
  const tx = pad - minX * scale + (vbW - 2 * pad - w * scale) / 2;
  const ty = pad - minY * scale + (vbH - 2 * pad - h * scale) / 2;
  const defs = S.defs.length ? `<defs>${S.defs.join('')}</defs>` : '';
  return `<svg viewBox="0 0 ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg" class="diag" preserveAspectRatio="xMidYMid meet">`
    + defs
    + `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(3)})">`
    + S.parts.join('') + `</g></svg>`;
}

// ───────────────────────────────────────────────────────────── projection bases
const BASES = {
  DIMETRIC: { ex: [2, 1], ey: [-2, 1], ez: [0, -2.1], k: 12 },
  TRUEISO: { ex: [0.866, 0.5], ey: [-0.866, 0.5], ez: [0, -1], k: 26 },
  FLATTER: { ex: [3, 1], ey: [-3, 1], ez: [0, -2.2], k: 8.5 },
  MILITARY: { ex: [0.74, 0.74], ey: [-0.74, 0.74], ez: [0, -1.05], k: 22 },
  CABINET: { ex: [1, 0], ey: [0.46, -0.46], ez: [0, -1], k: 26 },
  CAVALIER: { ex: [1, 0], ey: [0.74, -0.74], ez: [0, -1], k: 24 },
  TRIMETRIC: { ex: [0.96, 0.40], ey: [-0.56, 0.66], ez: [0, -1.08], k: 22 },
};
function projector(b) {
  return (x, y, z) => [b.k * (b.ex[0] * x + b.ey[0] * y + b.ez[0] * z), b.k * (b.ex[1] * x + b.ey[1] * y + b.ez[1] * z)];
}
const lerp = (a, c, t) => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t];
function bilin(q, u, v) { return lerp(lerp(q[0], q[1], u), lerp(q[3], q[2], u), v); } // q = [bl,br,tr,tl]

// ───────────────────────────────────────────────────────────── axonometric primitives
function groundAxon(S, P, nx, ny) {
  S.poly([P(0, 0, 0), P(nx, 0, 0), P(nx, ny, 0), P(0, ny, 0)], PAL.grass);
  // a sand path column + one water tile for life
  for (let y = 0; y < ny; y++) S.poly([P(1, y, 0), P(2, y, 0), P(2, y + 1, 0), P(1, y + 1, 0)], PAL.sand);
  S.poly([P(0, ny - 1, 0), P(1, ny - 1, 0), P(1, ny, 0), P(0, ny, 0)], PAL.water);
  for (let i = 0; i <= nx; i++) S.line(P(i, 0, 0), P(i, ny, 0), PAL.grid, 0.6);
  for (let j = 0; j <= ny; j++) S.line(P(0, j, 0), P(nx, j, 0), PAL.grid, 0.6);
}
function houseAxon(S, P, x0, y0, x1, y1, wallH, roofH, frontY) {
  const xm = (x0 + x1) / 2;
  const fy = frontY === 'y0' ? y0 : y1;
  // right wall (x = x1)
  S.poly([P(x1, y0, 0), P(x1, y1, 0), P(x1, y1, wallH), P(x1, y0, wallH)], PAL.wallSide, PAL.line, 0.5);
  // back-left roof slope (drawn early so right slope/gable overlay)
  const ridge0 = [xm, y0, wallH + roofH], ridge1 = [xm, y1, wallH + roofH];
  S.poly([P(x0, y0, wallH), P(x0, y1, wallH), P(...ridge1), P(...ridge0)], PAL.roofDark, PAL.line, 0.5);
  // front wall
  const fc = frontY === 'y0'
    ? [P(x0, y0, 0), P(x1, y0, 0), P(x1, y0, wallH), P(x0, y0, wallH)]
    : [P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, wallH), P(x0, y1, wallH)];
  S.poly(fc, PAL.wall, PAL.line, 0.5);
  // right roof slope
  S.poly([P(x1, y0, wallH), P(...ridge0), P(...ridge1), P(x1, y1, wallH)], PAL.roof, PAL.line, 0.5);
  // gable on the front
  const g = frontY === 'y0'
    ? [P(x0, y0, wallH), P(...ridge0), P(x1, y0, wallH)]
    : [P(x0, y1, wallH), P(...ridge1), P(x1, y1, wallH)];
  S.poly(g, PAL.roof, PAL.line, 0.5);
  // door + window on front
  const door = [bilin(fc, 0.40, 0), bilin(fc, 0.58, 0), bilin(fc, 0.58, 0.48), bilin(fc, 0.40, 0.48)];
  S.poly(door, PAL.door);
  const win = [bilin(fc, 0.16, 0.52), bilin(fc, 0.32, 0.52), bilin(fc, 0.32, 0.78), bilin(fc, 0.16, 0.78)];
  S.poly(win, PAL.winLit);
}
function treeAxon(S, P, x, y, th = 2.7, r = 12) {
  const base = P(x, y, 0), top = P(x, y, th);
  S.line(base, P(x, y, th * 0.55), PAL.trunk, 4);
  S.circle(top, r, PAL.canopy, PAL.canopyDark, 1.2);
}
function axonScene(S, baseKey, frontY) {
  const P = projector(BASES[baseKey]);
  groundAxon(S, P, 5, 4);
  houseAxon(S, P, 2.7, 0.5, 4.2, 1.95, 2.2, 1.35, frontY);
  treeAxon(S, P, 0.6, 2.7);
  treeAxon(S, P, 4.4, 3.1, 2.2, 9);
}

// ───────────────────────────────────────────────────────────── billboard (¾ top-down)
function billboardScene(S, opt) {
  const { squish = 0.6, frontFrac = 0.55, roofsOnly = false, glow = false, shade = false, heightAxis = false, id = 'b' } = opt;
  const cell = 26, nx = 5, ny = 4;
  const g = (x, y) => [x * cell, y * cell * squish];
  // grass + grid + path
  S.poly([g(0, 0), g(nx, 0), g(nx, ny), g(0, ny)], PAL.grass);
  for (let y = 0; y < ny; y++) S.poly([g(2, y), g(3, y), g(3, y + 1), g(2, y + 1)], PAL.sand);
  for (let i = 0; i <= nx; i++) S.line(g(i, 0), g(i, ny), PAL.grid, 0.7);
  for (let j = 0; j <= ny; j++) S.line(g(0, j), g(nx, j), PAL.grid, 0.7);

  function frontHouse(cx, cyTile, w, lit) {
    const base = g(cx, cyTile);
    const fw = w, fh = cell * 2.5 * frontFrac, rh = cell * 0.85;
    const bx = base[0] - fw / 2, by = base[1];
    if (heightAxis) { S.ellipse([base[0], base[1] + 3], fw * 0.55, 5, PAL.shadow); }
    if (roofsOnly) {
      // top-down roof footprint: a square tile, slightly diamonded
      S.poly([[base[0], by - cell * 0.45], [base[0] + fw / 2, by - cell * 0.45 + cell * 0.32 * squish], [base[0], by - cell * 0.45 + cell * 0.64 * squish], [base[0] - fw / 2, by - cell * 0.45 + cell * 0.32 * squish]], PAL.roof, PAL.roofDark, 1);
      S.line([base[0], by - cell * 0.45], [base[0], by - cell * 0.45 + cell * 0.64 * squish], PAL.roofDark, 0.8);
      return;
    }
    const yoff = heightAxis ? -10 : 0;
    // optional receding roof top (for steeper cameras)
    const topDepth = cell * (1 - frontFrac) * 0.9 * squish;
    if (topDepth > 3) S.poly([[bx, by - fh + yoff], [bx + fw, by - fh + yoff], [bx + fw - 6, by - fh - topDepth + yoff], [bx + 6, by - fh - topDepth + yoff]], PAL.wallSide, PAL.line, 0.5);
    // wall
    S.rect(bx, by - fh + yoff, fw, fh, PAL.wall, PAL.line, 0.5);
    // roof (triangle)
    S.poly([[bx - 3, by - fh + yoff], [bx + fw + 3, by - fh + yoff], [base[0], by - fh - rh + yoff]], PAL.roof, PAL.line, 0.5);
    if (shade) S.rect(bx + fw * 0.55, by - fh + yoff, fw * 0.45, fh, `url(#${id}-shade)`);
    // door + window
    S.rect(base[0] - fw * 0.12, by - fh * 0.5 + yoff, fw * 0.24, fh * 0.5, PAL.door);
    S.rect(bx + fw * 0.12, by - fh * 0.82 + yoff, fw * 0.22, fh * 0.26, lit ? PAL.winLit : PAL.win, PAL.line, 0.4);
    S.rect(bx + fw * 0.66, by - fh * 0.82 + yoff, fw * 0.22, fh * 0.26, lit ? PAL.winLit : PAL.win, PAL.line, 0.4);
    if (glow) S.circle([bx + fw * 0.23, by - fh * 0.69 + yoff], 13, `url(#${id}-glow)`);
  }
  function billTree(cx, cyTile, r) {
    const b = g(cx, cyTile);
    S.ellipse([b[0], b[1] + 2], r * 0.7, 3.5, PAL.shadow);
    S.line(b, [b[0], b[1] - r * 1.4], PAL.trunk, 4);
    S.circle([b[0], b[1] - r * 1.9], r, PAL.canopy, PAL.canopyDark, 1.2);
  }
  if (shade) S.def(`<linearGradient id="${id}-shade" x1="0" x2="1"><stop offset="0" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="rgba(20,15,5,.34)"/></linearGradient>`);
  if (glow) S.def(`<radialGradient id="${id}-glow"><stop offset="0" stop-color="${PAL.glow}" stop-opacity=".95"/><stop offset="1" stop-color="${PAL.glow}" stop-opacity="0"/></radialGradient>`);
  billTree(0.6, 3.4, 11);
  frontHouse(3.5, 2.2, 40, glow);
  frontHouse(1.4, 1.5, 30, false);
  if (glow) { // lanterns
    S.circle(g(2.5, 0.6), 7, `url(#${id}-glow)`); S.circle(g(4.4, 1.1), 7, `url(#${id}-glow)`);
  }
}

// ───────────────────────────────────────────────────────────── side / elevation
function sideScene(S, kind) {
  const W = 300, H = 200, gy = 150;
  S.def(`<linearGradient id="sky-${kind}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bcd9ea"/><stop offset="1" stop-color="#f1e7cf"/></linearGradient>`);
  S.rect(0, 0, W, H, `url(#sky-${kind})`);
  if (kind === 'crosssection') {
    S.rect(0, gy, W, H - gy, '#6b4a2c'); // underground
    S.rect(0, gy, W, 10, PAL.grass);
    // dome on surface
    S.path(`M120 ${gy} A40 40 0 0 1 200 ${gy} Z`, '#d9e3ea', PAL.line, 1.2, [[120, gy], [200, gy]]);
    S.rect(150, gy - 14, 20, 14, PAL.door);
    // tunnels + ore
    S.rect(20, gy + 26, 90, 16, '#3c2a18'); S.rect(150, gy + 50, 120, 16, '#3c2a18');
    [[40, gy + 70], [80, gy + 95], [200, gy + 30], [240, gy + 80]].forEach((c) => S.circle(c, 5, PAL.winLit));
    S.text(8, 22, 'cross-section', { size: 11, fill: PAL.accent });
    return;
  }
  // hills parallax
  S.path(`M0 ${gy} Q70 ${gy - 38} 150 ${gy} T300 ${gy} V${H} H0 Z`, '#9cbf76', 'none', 0, [[0, gy - 40], [300, gy]]);
  S.rect(0, gy, W, H - gy, PAL.grassDark);
  S.line([0, gy], [W, gy], PAL.line, 1);
  function facade(x, w, h, lit) {
    S.rect(x, gy - h, w, h, PAL.wall, PAL.line, 0.8);
    S.poly([[x - 4, gy - h], [x + w + 4, gy - h], [x + w / 2, gy - h - w * 0.45]], PAL.roof, PAL.line, 0.8);
    S.rect(x + w * 0.4, gy - h * 0.45, w * 0.2, h * 0.45, PAL.door);
    S.rect(x + w * 0.12, gy - h * 0.82, w * 0.2, h * 0.24, lit ? PAL.winLit : PAL.win, PAL.line, 0.5);
    S.rect(x + w * 0.68, gy - h * 0.82, w * 0.2, h * 0.24, lit ? PAL.winLit : PAL.win, PAL.line, 0.5);
  }
  if (kind === 'platformer') {
    facade(30, 60, 70, false);
    // a little character
    S.circle([150, gy - 18], 9, '#e8b56a', PAL.line, 1);
    S.rect(143, gy - 10, 14, 18, '#3f7ea8', PAL.line, 0.8, 2);
    S.circle([200, gy - 24], 7, PAL.winLit, PAL.accent, 1); // coin
    S.text(8, 22, 'side-scroller', { size: 11, fill: PAL.accent });
    return;
  }
  // shopfront / frieze: a row of facades
  facade(20, 56, 66, true); facade(96, 64, 86, false); facade(180, 52, 60, true); facade(244, 48, 76, false);
  if (kind === 'frieze') {
    S.rect(92, gy - 92, 72, 100, 'none', PAL.accent, 2.4, 6); // selection box
    S.text(8, 22, 'shop row (menu)', { size: 11, fill: PAL.accent });
  } else {
    S.circle([260, 36], 12, '#fff6d8'); // moon
    S.text(8, 22, 'main-street elevation', { size: 11, fill: PAL.accent });
  }
}

// ───────────────────────────────────────────────────────────── hex
function hexScene(S) {
  const r = 20, hcol = [PAL.grass, PAL.sand, PAL.water, PAL.canopy];
  const w = Math.sqrt(3) * r, h = 1.5 * r;
  let i = 0;
  for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
    const cx = col * w + (row % 2 ? w / 2 : 0) + r, cy = row * h + r;
    const pts = [];
    for (let a = 0; a < 6; a++) { const ang = Math.PI / 180 * (60 * a - 90); pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]); }
    S.poly(pts, hcol[(row + col) % 4], '#fff', 1.4);
    i++;
  }
  // little house on centre hex
  const cx = w + r + w / 2, cy = h + r;
  S.rect(cx - 9, cy - 6, 18, 14, PAL.wall, PAL.line, 0.6);
  S.poly([[cx - 11, cy - 6], [cx + 11, cy - 6], [cx, cy - 17]], PAL.roof, PAL.line, 0.6);
}

// ───────────────────────────────────────────────────────────── specials
function rotArrow(S, cx, cy, r, a0, a1, col) {
  const p0 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)], p1 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0, sweep = a1 > a0 ? 1 : 0;
  S.path(`M${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A${r} ${r} 0 ${large} ${sweep} ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`, 'none', col, 2.4, [p0, p1]);
  const ah = a1 + (sweep ? 0.0 : 0);
  const tip = p1, dir = [-Math.sin(ah) * (sweep ? 1 : -1), Math.cos(ah) * (sweep ? 1 : -1)];
  S.poly([tip, [tip[0] - dir[0] * 7 + dir[1] * 4, tip[1] - dir[1] * 7 - dir[0] * 4], [tip[0] - dir[0] * 7 - dir[1] * 4, tip[1] - dir[1] * 7 + dir[0] * 4]], col);
}
function isoBox(S, P, x0, y0, x1, y1, h) {
  S.poly([P(x1, y0, 0), P(x1, y1, 0), P(x1, y1, h), P(x1, y0, h)], PAL.wallSide, PAL.line, 0.5);
  S.poly([P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, h), P(x0, y1, h)], PAL.wall, PAL.line, 0.5);
  S.poly([P(x0, y0, h), P(x1, y0, h), P(x1, y1, h), P(x0, y1, h)], PAL.roof, PAL.line, 0.5);
}
function specialScene(S, type) {
  if (type === 'tiltshift') {
    billboardScene(S, { squish: 0.62, frontFrac: 0.55, glow: true, id: 'ts' });
    S.def(`<filter id="ts-blur"><feGaussianBlur stdDeviation="3.2"/></filter>`);
    S.rect(-10, -10, 380, 26, 'rgba(180,200,210,.55)', 'none', 0, 0, 'filter="url(#ts-blur)"');
    S.rect(-10, 86, 380, 30, 'rgba(120,90,40,.45)', 'none', 0, 0, 'filter="url(#ts-blur)"');
    S.text(2, 64, 'focus band', { size: 9, fill: PAL.accent });
    return;
  }
  if (type === 'hd2d') {
    S.def(`<radialGradient id="hd-glow"><stop offset="0" stop-color="${PAL.glow}" stop-opacity=".95"/><stop offset="1" stop-color="${PAL.glow}" stop-opacity="0"/></radialGradient>`);
    S.def(`<filter id="hd-blur"><feGaussianBlur stdDeviation="2.4"/></filter>`);
    // perspective ground
    S.poly([[40, 150], [300, 150], [250, 60], [90, 60]], PAL.grassDark);
    S.poly([[150, 150], [190, 150], [178, 60], [162, 60]], PAL.sand);
    // billboard houses
    [[110, 120, 30], [220, 128, 36], [165, 92, 24]].forEach(([x, y, w], i) => {
      S.rect(x - w / 2, y - w * 1.3, w, w * 1.3, PAL.wall, PAL.line, 0.6);
      S.poly([[x - w / 2 - 2, y - w * 1.3], [x + w / 2 + 2, y - w * 1.3], [x, y - w * 1.7]], PAL.roof, PAL.line, 0.6);
      S.rect(x - w * 0.16, y - w * 0.55, w * 0.32, w * 0.55, PAL.door);
      S.rect(x - w * 0.34, y - w * 0.95, w * 0.22, w * 0.26, PAL.winLit);
      S.circle([x - w * 0.23, y - w * 0.82], 12, 'url(#hd-glow)');
    });
    S.rect(-10, -8, 380, 30, 'rgba(150,180,200,.5)', 'none', 0, 0, 'filter="url(#hd-blur)"');
    S.rect(-10, 150, 380, 24, 'rgba(80,60,30,.4)', 'none', 0, 0, 'filter="url(#hd-blur)"');
    S.text(4, 168, 'tilt-shift + DOF + point-lights', { size: 9.5, fill: PAL.accent });
    return;
  }
  if (type === 'papermario') {
    // perspective ground plane
    S.poly([[30, 160], [310, 160], [250, 70], [90, 70]], PAL.grass, PAL.grassDark, 1);
    for (let i = 1; i < 5; i++) { const t = i / 5; S.line(lerp([30, 160], [90, 70], t), lerp([310, 160], [250, 70], t), PAL.grid, 0.7); }
    // flat cutout house (with a thin side edge to show it's a card)
    S.rect(150, 80, 44, 56, PAL.wall, PAL.line, 0.8);
    S.poly([[146, 80], [198, 80], [172, 58]], PAL.roof, PAL.line, 0.8);
    S.rect(150, 80, 5, 56, 'rgba(0,0,0,.18)'); // paper edge
    S.rect(165, 110, 14, 26, PAL.door);
    rotArrow(S, 172, 150, 70, Math.PI * 0.85, Math.PI * 0.15, PAL.accent);
    S.text(4, 22, 'flat sprite in 3D · free orbit', { size: 9.5, fill: PAL.accent });
    return;
  }
  if (type === 'spritestack') {
    const cx = 150, by = 150;
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      S.rect(cx - 34 + i * 1.6, by - i * 7, 64 - i * 1.0, 12, i % 2 ? PAL.wallSide : PAL.wall, PAL.line, 0.4, 3);
    }
    S.rect(cx - 18, by - 92, 34, 14, PAL.roof, PAL.line, 0.5, 3);
    rotArrow(S, cx, by + 8, 60, Math.PI * 0.9, Math.PI * 0.1, PAL.accent);
    S.text(60, 24, 'stacked slices · 360° spin', { size: 9.5, fill: PAL.accent });
    return;
  }
  if (type === 'render3d') {
    const P = projector(BASES.DIMETRIC);
    isoBox(S, P, 0, 0, 2.2, 2.2, 2.4);
    // pixelation overlay
    for (let a = 0; a < 6; a++) for (let b = 0; b < 5; b++) S.rect(-30 + a * 11, -50 + b * 11, 10, 10, 'none', 'rgba(0,0,0,.12)', 0.6);
    rotArrow(S, 0, 50, 58, Math.PI * 0.88, Math.PI * 0.12, PAL.accent);
    S.text(-44, 70, 'low-poly 3D + pixelate shader', { size: 9, fill: PAL.accent });
    return;
  }
  if (type === 'fixed3d') {
    const P = projector(BASES.DIMETRIC);
    S.def(`<linearGradient id="f3-top" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#d76a47"/><stop offset="1" stop-color="#a8462a"/></linearGradient>`);
    isoBox(S, P, 0, 0, 2.4, 2.4, 2.6);
    // lock + zoom (no orbit)
    S.text(0, 64, '🔒 fixed angle · zoom only', { size: 11, fill: PAL.accent, anchor: 'middle' });
    return;
  }
  if (type === 'curved') {
    // curved ground arc
    S.path('M10 150 Q160 70 310 150', 'none', PAL.grassDark, 10, [[10, 150], [310, 150], [160, 70]]);
    S.path('M10 150 Q160 70 310 150 L310 175 Q160 95 10 175 Z', PAL.grass, PAL.grassDark, 1, [[10, 175], [310, 175]]);
    // house on the curve
    S.rect(146, 96, 30, 26, PAL.wall, PAL.line, 0.7); S.poly([[143, 96], [179, 96], [161, 78]], PAL.roof, PAL.line, 0.7);
    // 3 camera presets
    [[80, 40], [160, 28], [240, 40]].forEach((c, i) => { S.circle(c, 6, PAL.accent); S.line(c, [161, 84], 'rgba(138,90,43,.5)', 1, 'stroke-dasharray="3 3"'); });
    S.text(4, 22, '3 fixed angles · curved world', { size: 9.5, fill: PAL.accent });
    return;
  }
  if (type === 'townscaper') {
    // irregular quad mesh
    const quads = [[[40, 150], [100, 140], [120, 175], [55, 188]], [[100, 140], [165, 138], [180, 172], [120, 175]], [[165, 138], [230, 148], [240, 182], [180, 172]], [[230, 148], [285, 158], [292, 190], [240, 182]]];
    quads.forEach((q) => S.poly(q, PAL.grass, '#fff', 1.2));
    // a little tower of blocks
    const P = projector({ ex: [1.4, 0.7], ey: [-1.4, 0.7], ez: [0, -1.5], k: 11 });
    isoBox(S, (x, y, z) => { const p = P(x, y, z); return [p[0] + 175, p[1] + 120]; }, 0, 0, 1.6, 1.6, 3.4);
    rotArrow(S, 175, 120, 95, Math.PI * 0.95, Math.PI * 0.05, PAL.accent);
    S.text(60, 22, 'true 3D mesh · free orbit', { size: 9.5, fill: PAL.accent });
    return;
  }
  if (type === 'full3d') {
    const P = projector(BASES.DIMETRIC);
    S.def(`<linearGradient id="g3-f" x1="0" x2="1"><stop offset="0" stop-color="#f1ddb4"/><stop offset="1" stop-color="#cdb289"/></linearGradient>`);
    isoBox(S, P, 0, 0, 2.4, 2.4, 2.8);
    rotArrow(S, 0, 40, 66, Math.PI * 0.95, Math.PI * 0.05, PAL.accent);
    rotArrow(S, 0, 40, 66, -Math.PI * 0.05, -Math.PI * 0.45, PAL.accent2);
    S.text(0, 78, 'free orbit + pitch', { size: 10, fill: PAL.accent, anchor: 'middle' });
    return;
  }
  if (type === 'rot4') {
    const P = projector(BASES.DIMETRIC);
    isoBox(S, P, 0, 0, 2.2, 2.2, 2.4);
    [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2].forEach((a) => rotArrow(S, 0, 26, 70, a + 0.18, a + Math.PI / 2 - 0.18, PAL.accent));
    S.text(0, 96, '×4 sprites / building', { size: 10, fill: PAL.accent, anchor: 'middle' });
    return;
  }
  if (type === 'mirror') {
    function card(x, flip) {
      const s = flip ? -1 : 1;
      S.rect(x - 22, 70, 44, 56, flip ? PAL.wallSide : PAL.wall, PAL.line, 0.8);
      S.poly([[x - 25, 70], [x + 25, 70], [x, 50]], PAL.roof, PAL.line, 0.8);
      S.rect(x - 6 + s * 10, 100, 12, 26, PAL.door); // door offset to show handedness
      S.rect(x - 18 + (flip ? 18 : 0), 78, 14, 16, PAL.winLit);
    }
    card(95, false); card(215, true);
    S.line([155, 40], [155, 140], PAL.accent, 1.6, 'stroke-dasharray="5 4"');
    S.text(155, 32, 'mirror', { size: 10, fill: PAL.accent, anchor: 'middle' });
    S.text(155, 158, 'flipX — light flips too', { size: 9, fill: PAL.accent2, anchor: 'middle' });
    return;
  }
}

// ───────────────────────────────────────────────────────────── diagram dispatch
const DIAGRAM_CFG = {
  'current-34-topdown': ['bill', { squish: 0.6, frontFrac: 0.55, id: 'cur' }],
  'eastward-lit-topdown': ['bill', { squish: 0.6, frontFrac: 0.55, glow: true, id: 'eas' }],
  'normalmapped-topdown': ['bill', { squish: 0.6, frontFrac: 0.55, shade: true, id: 'nrm' }],
  'steep-34': ['bill', { squish: 0.84, frontFrac: 0.33, id: 'stp' }],
  'shallow-34': ['bill', { squish: 0.42, frontFrac: 0.74, id: 'shl' }],
  'pure-topdown': ['bill', { squish: 1.0, frontFrac: 0, roofsOnly: true, id: 'ptd' }],
  'cabinet-oblique': ['axon', 'CABINET', 'y0'],
  'cavalier-oblique': ['axon', 'CAVALIER', 'y0'],
  'oblique-freeiso': ['bill', { squish: 0.56, frontFrac: 0.8, heightAxis: true, id: 'ofi' }],
  'military-planometric': ['axon', 'MILITARY', 'y1'],
  'dimetric-2to1': ['axon', 'DIMETRIC', 'y1'],
  'true-iso-30': ['axon', 'TRUEISO', 'y1'],
  'flatter-dimetric': ['axon', 'FLATTER', 'y1'],
  'trimetric': ['axon', 'TRIMETRIC', 'y1'],
  'side-elevation-shopfront': ['side', 'shopfront'],
  'pure-sideview-platformer': ['side', 'platformer'],
  'dome-keeper-crosssection': ['side', 'crosssection'],
  'front-elevation-frieze': ['side', 'frieze'],
  'tilt-shift-diorama': ['special', 'tiltshift'],
  'hd2d-octopath': ['special', 'hd2d'],
  'paper-mario-billboard': ['special', 'papermario'],
  'sprite-stacking': ['special', 'spritestack'],
  'render3d-pixelate': ['special', 'render3d'],
  'fixed-angle-3d': ['special', 'fixed3d'],
  'curved-world-acnh': ['special', 'curved'],
  'hex-lowpoly-3d': ['hex'],
  'townscaper-quadmesh': ['special', 'townscaper'],
  'full-3d-free-orbit': ['special', 'full3d'],
  '4way-rotatable-iso': ['special', 'rot4'],
  'mirror-flip-pseudorotation': ['special', 'mirror'],
};

function diagramFor(id) {
  const cfg = DIAGRAM_CFG[id];
  const S = mkScene();
  if (!cfg) { S.text(0, 0, '(diagram)'); return finalize(S); }
  const [kind, a, b] = cfg;
  if (kind === 'bill') billboardScene(S, a);
  else if (kind === 'axon') axonScene(S, a, b);
  else if (kind === 'side') sideScene(S, a);
  else if (kind === 'hex') hexScene(S);
  else if (kind === 'special') specialScene(S, a);
  return finalize(S);
}

// ───────────────────────────────────────────────────────────── HTML assembly
const V = DATA.masterVariants;
const REC = DATA.recommendation;
const recPrimaryId = 'current-34-topdown';
const recRunnerId = 'cabinet-oblique';

const effClass = (e) => {
  const k = (e || '').toLowerCase();
  if (k.startsWith('low')) return 'eff-low';
  if (k.startsWith('medium')) return 'eff-med';
  if (k.startsWith('high')) return 'eff-high';
  return 'eff-vhigh';
};
const rotClass = (r) => ((r || '').includes('none') ? 'rot-no' : (r || '').includes('free') ? 'rot-free' : 'rot-some');

const FAMILY_ORDER = [
  ['top-down', 'Top-down family', 'Camera looks (nearly) straight down a square grid. The closest neighbours of what puzzleDrag2 ships today.'],
  ['oblique/axonometric', 'Oblique & axonometric', 'Parallel projections — buildings get real faces/depth without perspective. Some keep the square grid (cheap), some go diamond (expensive).'],
  ['isometric/dimetric', 'Isometric & dimetric', 'The classic "diamond grid" look. Maximum 3D charm for a city — but a structural rewrite of the square-grid stack.'],
  ['side-elevation', 'Side & elevation', 'The world seen edge-on. Great for a shopfront strip or a cross-section; wrong shape for a draggable plot board.'],
  ['front-elevation', 'Front elevation', 'Head-on facades, no ground plane. A presentation screen, not a world.'],
  ['hybrid', 'Hybrid & stylised', 'Filters and tricks layered over a base projection (lighting, tilt-shift, billboards, mirroring).'],
  ['3D-rendered', '3D-rendered', 'Real meshes. The only families where camera rotation is genuinely free — at the cost of leaving Phaser-2D and the pixel pipeline.'],
];

function chip(txt, cls = '') { return `<span class="b ${cls}">${esc(txt)}</span>`; }
function refLinks(games) {
  if (!games || !games.length) return '';
  return `<div class="reflist">` + games.map((g) => g.url
    ? `<a href="${esc(g.url)}" target="_blank" rel="noopener">${esc(g.name)}</a>`
    : `<span class="reflist-x">${esc(g.name)}</span>`).join('') + `</div>`;
}

function variantCard(v, idx) {
  const ribbon = v.id === recPrimaryId ? `<div class="ribbon rec">★ Recommended</div>`
    : v.id === recRunnerId ? `<div class="ribbon run">Runner-up</div>` : '';
  const pros = (v.prosForUs || []).map((p) => `<li>${esc(p)}</li>`).join('');
  const cons = (v.consForUs || []).map((p) => `<li>${esc(p)}</li>`).join('');
  return `<article class="vcard ${v.id === recPrimaryId ? 'is-rec' : ''} ${v.id === recRunnerId ? 'is-run' : ''}" id="v-${v.id}">
    ${ribbon}
    <div class="vhead">
      <div class="vnum">${String(idx).padStart(2, '0')}</div>
      <h3>${esc(v.name)}</h3>
    </div>
    <div class="vbadges">
      ${chip(v.tileShape || '—', 'tile')}
      ${chip('rot: ' + (v.rotation || '—'), rotClass(v.rotation))}
      ${chip(v.effort || '—', effClass(v.effort))}
    </div>
    <div class="vdiag">${diagramFor(v.id)}</div>
    <p class="vangle"><b>Angle:</b> ${esc(v.angle || '—')}</p>
    <p class="vdesc">${esc(v.description)}</p>
    <div class="proscons">
      <div class="pc pros"><h4>Pros for us</h4><ul>${pros}</ul></div>
      <div class="pc cons"><h4>Cons for us</h4><ul>${cons}</ul></div>
    </div>
    <p class="vmeta"><b>Assets:</b> ${esc(v.assetImplications || '—')}</p>
    <p class="vmeta"><b>Pipeline change:</b> ${esc(v.pipelineChange || '—')}</p>
    ${refLinks(v.gameExamples)}
  </article>`;
}

// comparison matrix
function matrixRows() {
  return V.map((v, i) => `<tr class="${v.id === recPrimaryId ? 'mrec' : v.id === recRunnerId ? 'mrun' : ''}">
    <td class="num">${i + 1}</td>
    <td><a href="#v-${v.id}" class="mlink">${esc(v.name)}</a></td>
    <td>${esc(v.family)}</td>
    <td>${esc(v.tileShape || '—')}</td>
    <td>${esc(v.rotation || '—')}</td>
    <td><span class="b ${effClass(v.effort)}">${esc(v.effort || '—')}</span></td>
    <td class="pipe">${esc((v.pipelineChange || '').split('—')[0].trim() || '—')}</td>
  </tr>`).join('');
}

// proposals grouped by family
function proposalsHTML() {
  let html = '';
  let n = 0;
  const counter = {};
  V.forEach((v) => { counter[v.family] = counter[v.family] || []; counter[v.family].push(v); });
  for (const [fam, title, blurb] of FAMILY_ORDER) {
    const list = counter[fam];
    if (!list || !list.length) continue;
    html += `<section class="fam"><h2>${esc(title)} <span class="famcount">${list.length}</span></h2><p class="famblurb">${esc(blurb)}</p><div class="vgrid">`;
    list.forEach((v) => { n = V.indexOf(v) + 1; html += variantCard(v, n); });
    html += `</div></section>`;
  }
  return html;
}

// reference gallery grouped
const REF_GROUPS = [
  ['Cozy farming & life-sim (the genre)', ['Stardew Valley', 'Fields of Mistria', 'Sun Haven', 'Roots of Pacha', 'Littlewood', 'Coral Island', 'Fae Farm', 'Animal Crossing: New Horizons', 'Cozy Grove', 'Spiritfarer', 'Kynseed', 'Snacko']],
  ['¾ top-down + lighting craft', ['The Legend of Zelda: A Link to the Past', 'Sea of Stars', 'Eastward', 'Graveyard Keeper', 'Hyper Light Drifter', 'CrossCode', 'Moonlighter', 'Tuxemon']],
  ['Isometric & dimetric builders', ['SimCity 2000', 'SimCity (Classic, 1989)', 'EarthBound', 'Ultima VII', 'RollerCoaster Tycoon', 'Civilization II', 'TheoTown', 'Pocket City', 'Habbo Hotel', 'Project Zomboid', 'Age of Empires II', 'Diablo II', 'Bastion', 'Monument Valley', 'Fallout (1997)']],
  ['Rotation: the cost of it', ['SimCity 4', 'Pharaoh', 'RollerCoaster Tycoon 2', "Block'hood"]],
  ['Side / elevation towns', ['Terraria', 'Kingdom: New Lands', 'Dome Keeper']],
  ['3D & free-rotation (left the sprite world)', ['Townscaper', 'Dorfromantik', 'Timberborn', 'Against the Storm', 'Cities: Skylines', 'A Short Hike', 'Octopath Traveler (HD-2D)', "The Legend of Zelda: Link's Awakening (2019)", 'Kainga: Seeds of Civilization', 'Delver']],
];
function refGalleryHTML() {
  const byName = {}; DATA.referenceGames.forEach((g) => { byName[g.name] = g; });
  let html = '';
  for (const [title, names] of REF_GROUPS) {
    const rows = names.map((nm) => byName[nm]).filter(Boolean);
    if (!rows.length) continue;
    html += `<h3>${esc(title)}</h3><table class="reftab"><tbody>`;
    rows.forEach((g) => { html += `<tr><td class="rg-name"><a href="${esc(g.url)}" target="_blank" rel="noopener">${esc(g.name)} ↗</a></td><td class="rg-view">${esc(g.view)}</td></tr>`; });
    html += `</tbody></table>`;
  }
  return html;
}

const FIGURES = [
  { src: 'refs/projection-comparison.png', cap: 'The master map: one object rendered through orthographic, isometric, dimetric, trimetric, oblique and perspective projection. Every family in this doc lives somewhere on this chart.', attr: 'Wikimedia Commons · CC BY-SA 3.0 / GFDL · SharkD' },
  { src: 'refs/cabinet-oblique.svg', cap: 'Cabinet oblique — a cube above a plane. True front face, half-depth side. This is the runner-up projection (variant 07): it keeps the square ground while giving buildings real volume.', attr: 'Wikimedia Commons · CC BY-SA 4.0 · SharkD / Datumizer' },
  { src: 'refs/iso-dimetric-oblique.svg', cap: 'Isometric vs dimetric vs oblique-front axis schemes — the geometry behind the "diamond grid" families (variants 11–14).', attr: 'Wikimedia Commons · Public domain · Yuri Raysper' },
  { src: 'refs/military-projection.svg', cap: 'Military / planometric projection — the plan is rotated 45° but not tilted, so the top stays a true, un-foreshortened square (variant 10).', attr: 'Wikimedia Commons · CC BY 4.0 · Wittiko' },
  { src: 'refs/true-iso-camera.png', cap: 'True isometric: the camera sits at 35.264° (arctan(sin 45°)). Mathematically pure, but the 30° on-screen slope does not land on clean pixel steps — the pixel-art jaggy trap (variant 12).', attr: 'Wikimedia Commons · CC BY-SA 4.0 · SharkD' },
];
function figuresHTML() {
  return FIGURES.map((f) => `<figure class="fig"><img src="${f.src}" alt="${esc(f.cap)}" loading="lazy"><figcaption>${esc(f.cap)}<span class="attr">${esc(f.attr)}</span></figcaption></figure>`).join('');
}

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Town Camera & Projection — 30 proposals + recommendation</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,800;9..144,900&family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --ink:#2b2418; --muted:#7a6f5c; --line:#e3d9c4; --bg:#faf6ec; --paper:#fffdf6; --code:#efe7d3;
    --accent:#8a5a2b; --accent2:#4f7a34;
    --shadow:0 1px 2px rgba(50,35,8,.06), 0 6px 20px -10px rgba(50,35,8,.22);
    --ok:#3f8f3a; --warn:#c9750c; --info:#2767b0; --danger:#b03a23;
    --serif:"Fraunces",Georgia,serif; --sans:"IBM Plex Sans",system-ui,sans-serif; --mono:"JetBrains Mono",ui-monospace,monospace;
  }
  *{box-sizing:border-box;} html{scroll-behavior:smooth;}
  body{font:400 16px/1.62 var(--sans);color:var(--ink);margin:0;
    background:radial-gradient(1200px 520px at 80% -8%,color-mix(in srgb,var(--accent) 10%,transparent),transparent 60%),
      radial-gradient(1000px 460px at -10% 4%,color-mix(in srgb,var(--accent2) 9%,transparent),transparent 55%),
      linear-gradient(180deg,var(--bg),#f1e9d6);background-attachment:fixed;background-color:var(--bg);}
  a{color:var(--accent);text-decoration:none;} a:hover{text-decoration:underline;}
  code{background:var(--code);padding:.08rem .36rem;border-radius:4px;font:.84em var(--mono);color:#6a5230;}
  .page{max-width:1240px;margin:0 auto;padding:1.5rem 1.25rem 5rem;}
  header.hero{border-bottom:3px solid var(--accent);padding:1.5rem 1.6rem 1.2rem;margin-bottom:1rem;
    background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 11%,transparent),color-mix(in srgb,var(--accent2) 7%,transparent));
    border-radius:14px 14px 6px 6px;box-shadow:var(--shadow);}
  header.hero h1{font:800 2.7rem/1.07 var(--serif);letter-spacing:-.015em;margin:.1rem 0 .4rem;}
  .sub{color:#5e5341;font-size:1.05rem;margin:.2rem 0 .75rem;max-width:80ch;}
  .meta{font-size:.8rem;color:var(--muted);margin:.4rem 0 .7rem;}
  .chips{display:flex;flex-wrap:wrap;gap:.4rem;} .chip{font-size:.78rem;font-weight:600;padding:.2rem .6rem;border-radius:999px;background:color-mix(in srgb,var(--accent) 12%,#fff);color:var(--accent);border:1px solid color-mix(in srgb,var(--accent) 30%,#fff);}
  .demolink{display:inline-block;font:800 .92rem/1 var(--sans);color:#fff;background:var(--accent2);padding:.55rem .85rem;border-radius:9px;box-shadow:var(--shadow);}
  .demolink:hover{background:#3f6a28;text-decoration:none;}
  .demo-callout{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem 1rem;background:color-mix(in srgb,var(--accent2) 9%,#fff);border:1px solid var(--line);border-left:6px solid var(--accent2);border-radius:0 11px 11px 0;padding:.8rem 1.1rem;margin:1rem 0;box-shadow:var(--shadow);}
  .demo-callout b{font-family:var(--serif);}
  nav.tabs{display:flex;gap:.35rem;flex-wrap:wrap;border-bottom:2px solid var(--line);margin:.2rem 0 1.5rem;position:sticky;top:0;z-index:30;background:linear-gradient(var(--bg) 78%,transparent);backdrop-filter:blur(3px);padding-top:.4rem;}
  nav.tabs button{font:700 1.02rem/1 var(--serif);letter-spacing:-.01em;padding:.7rem 1.2rem;cursor:pointer;color:var(--muted);background:transparent;border:1px solid transparent;border-bottom:none;border-radius:11px 11px 0 0;margin-bottom:-2px;transition:all .14s;}
  nav.tabs button:hover{color:var(--accent);background:color-mix(in srgb,var(--accent) 8%,transparent);}
  nav.tabs button.on{color:var(--ink);background:var(--paper);border-color:var(--line);border-top:3px solid var(--accent);box-shadow:0 -5px 16px -9px rgba(50,35,8,.3);}
  .panel{display:none;} .panel.on{display:block;animation:fade .35s both;}
  @keyframes fade{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
  h2{font:800 1.6rem/1.15 var(--serif);letter-spacing:-.01em;margin:2rem 0 .35rem;border-bottom:1px solid var(--line);padding-bottom:.25rem;}
  h3{font:700 1.16rem/1.25 var(--serif);margin:1.4rem 0 .35rem;}
  p,li{margin:.45rem 0;}
  .lead{font-size:1.06rem;max-width:84ch;}
  .verdict{background:var(--paper);border:1px solid var(--line);border-left:7px solid var(--accent2);border-radius:0 12px 12px 0;padding:1rem 1.25rem;margin:1.1rem 0;box-shadow:var(--shadow);}
  .verdict.no{border-left-color:var(--danger);} .verdict h3{margin:.1rem 0 .5rem;font-size:1.28rem;} .verdict.no h3{color:var(--danger);} .verdict.go h3{color:var(--accent2);}
  .verdict .tag{display:inline-block;font:800 .72rem/1 var(--mono);letter-spacing:.06em;padding:.28rem .55rem;border-radius:6px;color:#fff;background:var(--accent2);margin-bottom:.5rem;text-transform:uppercase;}
  .verdict.no .tag{background:var(--danger);}
  .ladder{counter-reset:step;list-style:none;padding:0;margin:.8rem 0;}
  .ladder li{position:relative;padding:.55rem .8rem .55rem 2.6rem;margin:.4rem 0;background:color-mix(in srgb,var(--accent2) 6%,#fff);border:1px solid var(--line);border-radius:9px;}
  .ladder li::before{counter-increment:step;content:counter(step);position:absolute;left:.7rem;top:.5rem;width:1.5rem;height:1.5rem;border-radius:50%;background:var(--accent2);color:#fff;font:800 .85rem/1.5rem var(--mono);text-align:center;}
  .box{background:color-mix(in srgb,var(--accent2) 8%,#fff);border-left:4px solid var(--accent2);padding:.7rem 1rem;margin:1rem 0;border-radius:0 8px 8px 0;box-shadow:var(--shadow);}
  .box.warn{background:color-mix(in srgb,var(--danger) 7%,#fff);border-left-color:var(--danger);} .box.tip{background:color-mix(in srgb,var(--ok) 9%,#fff);border-left-color:var(--ok);} .box.info{background:color-mix(in srgb,var(--info) 8%,#fff);border-left-color:var(--info);}
  .box b{font-family:var(--serif);}
  table{border-collapse:collapse;width:100%;margin:.9rem 0;font-size:.84rem;background:var(--paper);border-radius:10px;overflow:hidden;box-shadow:var(--shadow);}
  th,td{border:1px solid var(--line);padding:.42rem .6rem;text-align:left;vertical-align:top;}
  th{background:color-mix(in srgb,var(--accent) 9%,#fff);font-weight:700;position:sticky;} tbody tr:nth-child(even){background:color-mix(in srgb,var(--bg) 60%,#fff);}
  td.num,th.num{text-align:right;font-family:var(--mono);font-size:.8rem;width:2.2rem;}
  td.pipe{font-size:.78rem;color:var(--muted);}
  tr.mrec{background:color-mix(in srgb,var(--accent2) 13%,#fff)!important;} tr.mrun{background:color-mix(in srgb,var(--accent) 9%,#fff)!important;}
  .mlink{font-weight:600;}
  .b{display:inline-block;font:700 .7rem/1.3 var(--mono);padding:.12rem .45rem;border-radius:6px;background:var(--code);color:#6a5230;border:1px solid color-mix(in srgb,var(--accent) 16%,#fff);}
  .b.tile{background:color-mix(in srgb,var(--info) 12%,#fff);color:var(--info);}
  .eff-low{background:color-mix(in srgb,var(--ok) 18%,#fff);color:#2c6b2a;border-color:transparent;}
  .eff-med{background:color-mix(in srgb,var(--warn) 18%,#fff);color:#9a5a09;border-color:transparent;}
  .eff-high{background:color-mix(in srgb,var(--danger) 15%,#fff);color:#9a3320;border-color:transparent;}
  .eff-vhigh{background:#3a2f2a;color:#f3d9cf;border-color:transparent;}
  .rot-no{background:color-mix(in srgb,var(--ok) 14%,#fff);color:#2c6b2a;border-color:transparent;}
  .rot-some{background:color-mix(in srgb,var(--warn) 16%,#fff);color:#9a5a09;border-color:transparent;}
  .rot-free{background:color-mix(in srgb,var(--info) 14%,#fff);color:#235e9e;border-color:transparent;}
  .fam{margin:1.4rem 0 1rem;} .fam h2{display:flex;align-items:center;gap:.6rem;}
  .famcount{font:700 .8rem/1 var(--mono);background:var(--accent);color:#fff;padding:.2rem .5rem;border-radius:999px;}
  .famblurb{color:var(--muted);max-width:80ch;margin-top:.1rem;}
  .vgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:1.1rem;margin:1rem 0;}
  .vcard{position:relative;background:var(--paper);border:1px solid var(--line);border-radius:13px;padding:.9rem 1rem 1rem;box-shadow:var(--shadow);display:flex;flex-direction:column;}
  .vcard.is-rec{border:2px solid var(--accent2);box-shadow:0 0 0 4px color-mix(in srgb,var(--accent2) 12%,transparent),var(--shadow);}
  .vcard.is-run{border:2px solid var(--accent);}
  .ribbon{position:absolute;top:.7rem;right:-.3rem;font:800 .68rem/1 var(--mono);letter-spacing:.04em;color:#fff;padding:.3rem .55rem;border-radius:6px 0 0 6px;text-transform:uppercase;box-shadow:var(--shadow);}
  .ribbon.rec{background:var(--accent2);} .ribbon.run{background:var(--accent);}
  .vhead{display:flex;align-items:baseline;gap:.5rem;padding-right:5.5rem;}
  .vnum{font:800 .9rem/1 var(--mono);color:#fff;background:var(--accent);border-radius:6px;padding:.28rem .4rem;}
  .vhead h3{margin:0;font:800 1.06rem/1.18 var(--serif);}
  .vbadges{display:flex;flex-wrap:wrap;gap:.3rem;margin:.5rem 0 .2rem;}
  .vdiag{margin:.5rem 0;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:linear-gradient(180deg,#dcebf3 0%,#eef6f9 55%,#f6efdd 100%);}
  .vdiag svg.diag{display:block;width:100%;height:auto;}
  .vangle{font-size:.82rem;margin:.3rem 0;color:#5e5341;} .vangle b{font-family:var(--serif);}
  .vdesc{font-size:.9rem;color:#4a4232;margin:.35rem 0 .5rem;}
  .proscons{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin:.3rem 0;}
  @media(max-width:520px){.proscons{grid-template-columns:1fr;}}
  .pc h4{margin:.2rem 0 .2rem;font:700 .74rem/1 var(--mono);text-transform:uppercase;letter-spacing:.04em;}
  .pc.pros h4{color:var(--accent2);} .pc.cons h4{color:var(--danger);}
  .pc ul{margin:.1rem 0;padding-left:1rem;} .pc li{font-size:.8rem;line-height:1.42;margin:.18rem 0;}
  .vmeta{font-size:.79rem;color:#5e5341;margin:.3rem 0 0;border-top:1px dashed var(--line);padding-top:.4rem;} .vmeta b{font-family:var(--serif);color:var(--accent);}
  .reflist{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.55rem;}
  .reflist a{font-size:.74rem;background:color-mix(in srgb,var(--accent) 7%,#fff);border:1px solid var(--line);padding:.22rem .5rem;border-radius:7px;color:#5e5341;}
  .reflist a:hover{border-color:var(--accent);color:var(--accent);text-decoration:none;} .reflist a::after{content:" ↗";font-size:.66rem;color:var(--muted);}
  .reflist-x{font-size:.74rem;color:var(--muted);padding:.22rem .4rem;}
  .reftab td{font-size:.84rem;} .rg-name{white-space:nowrap;font-weight:600;width:1%;} .rg-view{color:#4a4232;}
  .figs{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem;margin:1rem 0;}
  .fig{margin:0;background:var(--paper);border:1px solid var(--line);border-radius:12px;overflow:hidden;box-shadow:var(--shadow);}
  .fig img{display:block;width:100%;height:200px;object-fit:contain;background:#fff;padding:.6rem;}
  .fig figcaption{font-size:.8rem;color:#4a4232;padding:.6rem .8rem .7rem;} .fig .attr{display:block;color:var(--muted);font-size:.7rem;margin-top:.35rem;}
  .matrix-wrap{overflow:auto;max-height:none;}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:1.2rem;margin:1rem 0;} @media(max-width:880px){.two{grid-template-columns:1fr;}}
  .legend{display:flex;flex-wrap:wrap;gap:.4rem .9rem;font-size:.76rem;color:var(--muted);margin:.5rem 0;}
  footer{margin-top:2.5rem;padding-top:1rem;border-top:1px solid var(--line);color:var(--muted);font-size:.82rem;}
  @media (max-width:820px){header.hero h1{font-size:2.05rem;}}
  @media (prefers-reduced-motion:reduce){*{animation:none!important;}}
</style>
</head>
<body>
<div class="page">
  <header class="hero">
    <h1>Town Camera &amp; Projection</h1>
    <p class="sub">Locking down the <b>camera view of the town map</b> before any building art is committed — every asset is drawn <i>on top of</i> this decision. <b>30 projection options</b> with a custom geometry diagram each, a clear recommendation, and a straight answer on <b>rotation</b>. Companion to <a href="../town-layout/index.html">Town Layout</a> &amp; the <a href="../art-style-board/index.html">Art Style Board</a>.</p>
    <p class="meta">puzzleDrag2 · <span class="chip">Decision proposal — 2026-06-17</span> · today's town = Phaser&nbsp;2D, 40×30 @ 32px square grid, Tuxemon ¾ tileset, fixed pan/zoom camera</p>
    <div class="chips"><span class="chip">★ Keep the ¾ top-down</span><span class="chip">＋ dynamic 2D lighting</span><span class="chip">Runner-up: cabinet oblique</span><span class="chip">Rotation: NO</span><span class="chip">30 options surveyed</span></div>
    <p style="margin:.9rem 0 0;"><a class="demolink" href="demo/index.html">▶ Open the live interactive demo</a> &nbsp;— ONE cozy scene built from the game's real pixel sprites, flippable between ¾ / cabinet / iso with day-night lighting &amp; tilt-shift (variants 01·02·07·11·19).</p>
  </header>

  <nav class="tabs" id="tabs">
    <button data-tab="rec" class="on">★ Recommendation</button>
    <button data-tab="all">All 30 proposals</button>
    <button data-tab="rot">Rotation?</button>
    <button data-tab="ref">References &amp; figures</button>
  </nav>

  <!-- ───────────── RECOMMENDATION ───────────── -->
  <div class="panel on" id="panel-rec">
    <p class="lead">Short version: <b>don't change the projection — invest in it.</b> The ¾ high top-down with front-faced buildings that puzzleDrag2 already ships is the cozy-farming genre standard (Stardew, Sun Haven, Fields of Mistria, Roots of Pacha). The highest-value move is to raise its production value cheaply with lighting and polish, not to rebuild the whole square-grid stack for a diamond grid players don't demand.</p>

    <div class="demo-callout">
      <a class="demolink" href="demo/index.html">▶ Open the live interactive demo</a>
      <span><b>See it, don't just read it.</b> One farm-village scene built from the game's real pixel sprites, rendered live through each candidate camera — flip between ¾, cabinet &amp; isometric, drag day→night to watch windows glow (variant 02), toggle tilt-shift (19), and try rotating to feel why it would cost 4× the art.</span>
    </div>

    <div class="verdict go">
      <span class="tag">Recommended</span>
      <h3>★ Keep the ¾ high top-down, then add a dynamic 2D lighting layer</h3>
      <p>${esc(REC.rationale)}</p>
    </div>

    <h3>The cheap upgrade ladder (do these in order)</h3>
    <ol class="ladder">
      <li><b>Ship the ¾ top-down as-is, but polish the art.</b> Zero engine change — same grid, autotiler, <code>townMaps.ts</code>, seasonal tiles, Y-sort. This is variant 01.</li>
      <li><b>Add a Phaser dynamic-lighting layer</b> (warm lantern pools, glowing windows, dusk gradients) — the Sea of Stars / Eastward path. This is what delivers the cozy-night-diorama mood from your reference images. Variant 02.</li>
      <li><b>Optionally garnish with a tilt-shift / DOF pass</b> rendered hi-res then downscaled, for the "tiny model town" feel. Variant 19.</li>
      <li><b>If — and only if — you still want more building dimensionality:</b> move to <b>cabinet oblique</b> (variant 07, the runner-up). It keeps the square grid intact and reuses your flat-front building kit as a true elevation, at one sprite per building.</li>
    </ol>

    <div class="box warn"><b>Critical gotcha (from the codebase).</b> ${esc(REC.migrationNote.split('CRITICAL GOTCHA:')[1] ? 'CRITICAL GOTCHA:' + REC.migrationNote.split('CRITICAL GOTCHA:')[1].split('RUNNER-UP')[0] : REC.migrationNote)}</div>

    <h3>Your five reference images, mapped to this menu</h3>
    <table>
      <thead><tr><th>Your image</th><th>What it is</th><th>Maps to</th></tr></thead>
      <tbody>
        <tr><td>1 · Stardew farm</td><td>¾ high top-down, square grid, front-faced buildings</td><td><a href="#v-current-34-topdown"><b>01 — exactly what we ship today ★</b></a></td></tr>
        <tr><td>2 · Cozy night town w/ lanterns</td><td>2:1 dimetric diorama + warm lighting + a touch of tilt-shift</td><td><a href="#v-eastward-lit-topdown">02 lighting</a> + <a href="#v-tilt-shift-diorama">19 tilt-shift</a> (mood) · <a href="#v-dimetric-2to1">11 dimetric</a> (the angle)</td></tr>
        <tr><td>3 · Busy colourful city</td><td>Classic 2:1 "pixel isometric" city</td><td><a href="#v-dimetric-2to1">11 — dimetric 2:1</a> (high effort)</td></tr>
        <tr><td>4 · Top-down village + fountain</td><td>Mid/steep ¾ top-down on a square grid</td><td><a href="#v-current-34-topdown">01</a> / <a href="#v-steep-34">04 steeper</a></td></tr>
        <tr><td>5 · Front-on farm building</td><td>Near-flat front elevation / oblique</td><td><a href="#v-cabinet-oblique">07 cabinet oblique ▸</a> / <a href="#v-side-elevation-shopfront">15 side elevation</a></td></tr>
      </tbody>
    </table>

    <h3>All 30 at a glance</h3>
    <p class="legend"><span class="b eff-low">Low</span> <span class="b eff-med">Medium</span> <span class="b eff-high">High</span> <span class="b eff-vhigh">Very High</span> effort · <span class="b rot-no">fixed</span> <span class="b rot-some">stepped</span> <span class="b rot-free">free</span> rotation · click a name to jump to its card</p>
    <div class="matrix-wrap"><table>
      <thead><tr><th class="num">#</th><th>Projection</th><th>Family</th><th>Tile</th><th>Rotation</th><th>Effort</th><th>Pipeline change</th></tr></thead>
      <tbody>${matrixRows()}</tbody>
    </table></div>
  </div>

  <!-- ───────────── ALL PROPOSALS ───────────── -->
  <div class="panel" id="panel-all">
    <p class="lead">Thirty distinct ways to frame the town, grouped by family and ordered roughly from "closest to today / cheapest" to "most exotic / total rewrite". Each diagram draws the <b>same scene</b> — a little house, a tree, a grid — through that projection, so you can compare angles directly. Diagrams are original schematics (not screenshots); real games are linked under each card.</p>
    ${proposalsHTML()}
  </div>

  <!-- ───────────── ROTATION ───────────── -->
  <div class="panel" id="panel-rot">
    <div class="verdict no">
      <span class="tag">Verdict: No rotation</span>
      <h3>Don't build camera rotation</h3>
      <p>${esc(REC.rotationVerdict)}</p>
    </div>

    <h3>Why rotation is so expensive in a 2D sprite game</h3>
    <p>In a sprite engine the world isn't 3D geometry — it's hand-drawn pictures. Every angle you let the player turn to is <b>another full set of pictures someone has to draw</b>. Rotation is "free" only when the GPU re-renders real meshes (i.e. a full 3D game).</p>
    <table>
      <thead><tr><th>Rotation model</th><th>Art per building</th><th>What it costs us</th><th>Seen in</th></tr></thead>
      <tbody>
        <tr class="mrec"><td><b>Fixed (1 angle) ★</b></td><td>×1</td><td>Nothing — today's model. Lets baked light, AA &amp; hue-shift look their best.</td><td>Stardew, Cozy Grove, Bastion, TheoTown, Coral Island (3D, still locked)</td></tr>
        <tr><td>Mirror-only (flipX)</td><td>×1–1.5</td><td>Free 2nd facing for symmetric props/townsfolk; breaks on handed art &amp; baked light. Not real rotation.</td><td>universal for characters</td></tr>
        <tr><td>4-way iso (90° steps)</td><td>×2.5–4</td><td>Every building re-drawn 4×; <b>seasonal tiles ×4</b> (4 seasons × 4 facings); orientation-aware autotiler/road/river/farm rewrite; ×4 visual goldens.</td><td>SimCity 4, Pharaoh, RCT2</td></tr>
        <tr><td>8-way / pre-rendered</td><td>×8 or 3D-to-sprite</td><td>Abandons hand-pixel craft; you're really running a 3D pipeline that bakes to sprites.</td><td>Diablo II (actors only), AoE2</td></tr>
        <tr><td>Sprite-stacking</td><td>N voxel slices</td><td>Free 360° spin but a chunky voxel look that fights the crisp seasonal art; needs a moving camera.</td><td>Delver</td></tr>
        <tr><td>Full 3D meshes</td><td>×1 mesh (free angles)</td><td>Rotation truly free — but it's a different engine &amp; a different game; discards the entire pixel pipeline.</td><td>Townscaper, Timberborn, Cities: Skylines</td></tr>
      </tbody>
    </table>

    <div class="box info"><b>The clinching data points.</b> <b>Coral Island</b> is a full 3D farm sim — rotation would be free — yet the devs deliberately <b>locked</b> the camera to a fixed ¾ bird's-eye for readability. <b>SimCity 4</b>'s Building Architect Tool exports <b>40 images per building</b> (4 rotations × 5 zooms × day/night) — the canonical proof of the art-multiply. <b>Age of Empires II</b> rotates units but renders <b>buildings one direction only</b>, because building rotation is where the cost explodes. Even <b>Animal Crossing</b>'s curved-world 3-angle model still draws occlusion complaints — so rotation doesn't even fully deliver what players think they want.</p></div>

    <h3>What to do instead (within a fixed camera)</h3>
    <ul>
      <li><b>Fade / x-ray tall sprites</b> that occlude the player's row — the standard Stardew trick, solves the real occlusion pain.</li>
      <li><b>Camera pan + zoom + a photo mode</b> for screenshot framing (we already pan/zoom).</li>
      <li><b>Free horizontal mirror (<code>setFlipX</code>)</b> for symmetric props, animals and townsfolk facing — near-zero cost variety.</li>
      <li><b>If rotation ever becomes a hard requirement</b>, the only sane path is a full 3D reboot (Timberborn / Townscaper / low-poly-3D + pixelation) — out of scope for a cozy 2D puzzle-farming game.</li>
    </ul>
  </div>

  <!-- ───────────── REFERENCES ───────────── -->
  <div class="panel" id="panel-ref">
    <h2>Formal projection figures</h2>
    <p class="lead">License-clean reference diagrams (Wikimedia Commons) for the geometry behind the families above. The two most decision-relevant alternatives to our ¾ view are <b>cabinet oblique</b> (the runner-up) and the <b>isometric/dimetric</b> diamond — both shown here.</p>
    <div class="figs">${figuresHTML()}</div>
    <div class="box"><b>On "reference images from online".</b> The per-proposal visuals are original schematic diagrams (the cleanest way to compare 30 angles side-by-side, and IP-safe to commit). Real games that exemplify each view are linked below and under every card — rather than committing copyrighted screenshots into the repo. The ${FIGURES.length} figures above are freely-licensed and attributed (see <code>refs/ATTRIBUTIONS.md</code>).</div>

    <h2>Reference games — see each view in the wild</h2>
    <p class="lead">${DATA.referenceGames.length} games surveyed, grouped by the view they exemplify. Every link opens the official/Steam/Wikipedia page.</p>
    ${refGalleryHTML()}
  </div>

  <footer>
    Generated by <code>docs/town-camera/build.mjs</code> from <code>data.json</code> (a multi-agent web-research synthesis). 30 projection variants · ${DATA.referenceGames.length} reference games · ${FIGURES.length} license-clean figures. Diagrams are original SVG schematics rendered per-projection. · puzzleDrag2 · 2026-06-17
  </footer>
</div>
<script>
  const tabs=document.getElementById('tabs');
  tabs.addEventListener('click',(e)=>{const b=e.target.closest('button');if(!b)return;
    document.querySelectorAll('nav.tabs button').forEach(x=>x.classList.remove('on'));
    document.querySelectorAll('.panel').forEach(x=>x.classList.remove('on'));
    b.classList.add('on');document.getElementById('panel-'+b.dataset.tab).classList.add('on');
    window.scrollTo({top:0,behavior:'smooth'});});
  // deep links to cards switch to the proposals tab first
  document.querySelectorAll('a[href^="#v-"]').forEach(a=>a.addEventListener('click',()=>{
    document.querySelectorAll('nav.tabs button').forEach(x=>x.classList.remove('on'));
    document.querySelectorAll('.panel').forEach(x=>x.classList.remove('on'));
    document.querySelector('nav.tabs button[data-tab="all"]').classList.add('on');
    document.getElementById('panel-all').classList.add('on');}));
</script>
</body>
</html>`;

fs.writeFileSync(path.join(HERE, 'index.html'), HTML, 'utf8');
console.log('Wrote index.html (' + (HTML.length / 1024).toFixed(1) + ' KB) · ' + V.length + ' variants');

// ── dev-only: a flat gallery of every diagram for visual QA (not committed)
if (process.env.DIAGCHECK) {
  const cells = V.map((v, i) => `<div class="c"><div class="d" style="background:linear-gradient(180deg,#dcebf3,#eef6f9 55%,#f6efdd)">${diagramFor(v.id)}</div><div class="l">${String(i + 1).padStart(2, '0')} · ${esc(v.name)}</div></div>`).join('');
  const g = `<!DOCTYPE html><meta charset="utf8"><style>body{margin:0;background:#faf6ec;font:600 12px/1.3 system-ui}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:14px}.c{border:1px solid #e3d9c4;border-radius:10px;overflow:hidden;background:#fffdf6}.d svg{display:block;width:100%;height:auto}.l{padding:6px 8px;color:#5e5341;font-family:'JetBrains Mono',monospace}</style><div class="grid">${cells}</div>`;
  fs.writeFileSync(path.join(HERE, '_diagcheck.html'), g, 'utf8');
  console.log('Wrote _diagcheck.html (DIAGCHECK)');
}
