// Generates public/town/tileset.png — a cohesive, hand-authored 32px town
// tileset that REPLACES the Tuxemon placeholder sheet in-place.
//
// Why a generator (not a model): the ground tiles must align edge-to-edge for
// the grass↔path autotiler (src/ui/town/roadAutotile.ts). Seam alignment is a
// geometric guarantee a generative model can't give, so we author the tiles
// procedurally with one baked key light (warm sun upper-left, cool shadow
// lower-right) and one warm storybook palette — the cohesion lever the LLM
// village mock nailed and the old mixed placeholders missed.
//
// We keep the EXACT same sheet geometry (816×1020, 24 cols, 32px tiles,
// margin=1, spacing=2) and the EXACT same tile indices the game references, so
// the index→role contract in roadAutotile.ts / TownScene.ts is untouched — this
// is a pure pixel swap. Cells the game never reads are left transparent.
//
//   node tools/gen-town-tileset.mjs            # writes public/town/tileset.png
//   node tools/gen-town-tileset.mjs --preview  # also writes a QA scene montage
//
// Reproducible & deterministic (seeded). No external deps.

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ── sheet geometry (mirrors TownScene addTilesetImage("tiles", key,32,32,1,2))
const SHEET_W = 816, SHEET_H = 1020;
const COLS = 24, TILE = 32, MARGIN = 1, SPACING = 2;
const STEP = TILE + SPACING; // 34
const tileX = (col) => MARGIN + col * STEP;
const tileY = (row) => MARGIN + row * STEP;
const idxCol = (i) => i % COLS;
const idxRow = (i) => Math.floor(i / COLS);

// ── tiny RGBA canvas ────────────────────────────────────────────────────────
const mk = (w, h) => ({ w, h, data: new Uint8ClampedArray(w * h * 4) });
function put(c, x, y, col, a = 255) {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const o = (y * c.w + x) * 4;
  if (a >= 255) { c.data[o] = col[0]; c.data[o + 1] = col[1]; c.data[o + 2] = col[2]; c.data[o + 3] = 255; return; }
  const t = a / 255, it = 1 - t, ba = c.data[o + 3] / 255;
  const oa = t + ba * it;
  if (oa <= 0) return;
  c.data[o] = (col[0] * t + c.data[o] * ba * it) / oa;
  c.data[o + 1] = (col[1] * t + c.data[o + 1] * ba * it) / oa;
  c.data[o + 2] = (col[2] * t + c.data[o + 2] * ba * it) / oa;
  c.data[o + 3] = oa * 255;
}
const getA = (c, x, y) => (x < 0 || y < 0 || x >= c.w || y >= c.h) ? 0 : c.data[(y * c.w + x) * 4 + 3];

// mulberry32 — deterministic per-tile noise
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

// ── palette (warm storybook, sun from upper-left) ───────────────────────────
const GRASS = { sh2: [78, 122, 55], sh: [95, 138, 58], mid: [120, 166, 71], lt: [148, 196, 96], hi: [182, 220, 124] };
const PATH = { grout: [138, 106, 64], sh: [176, 138, 82], mid: [201, 168, 110], lt: [221, 192, 137], hi: [236, 224, 184] };
const WATER = { dk: [44, 85, 127], mid: [59, 110, 165], lt: [96, 150, 200], hi: [156, 200, 230] };
const STONE = { dk: [86, 86, 100], mid: [128, 128, 142], lt: [172, 172, 184], hi: [210, 210, 220] };
const WOOD = { dk: [102, 70, 40], mid: [138, 96, 56], lt: [172, 126, 76] };
const LEAF = { dk: [60, 102, 50], mid: [82, 138, 64], lt: [110, 176, 84], hi: [150, 206, 110] };
const PINE = { dk: [42, 84, 52], mid: [56, 110, 66], lt: [86, 146, 86], hi: [126, 182, 112] };
const OUTLINE = [40, 46, 36];

// ── ground textures (all 32×32, seamlessly tileable) ─────────────────────────
// Grass: warm green base with a gentle upper-left light gradient + value noise
// and a few brighter blade flecks. Tiles seamlessly (noise is position-hashed).
function grassTex(seed) {
  const c = mk(TILE, TILE);
  // pre-roll a position-hashed noise so left/right & top/bottom edges match
  const hash = (x, y) => {
    let h = (x * 374761393 + y * 668265263 + seed * 2246822519) >>> 0;
    h = (h ^ (h >>> 13)) * 1274126177 >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const light = 1 - (x + y) / (2 * TILE);          // UL bright → BR dark
    const n = (hash(x, y) - 0.5) * 0.55 + (hash((x + 7) & 31, (y + 13) & 31) - 0.5) * 0.25;
    let t = clamp(0.46 + (light - 0.5) * 0.7 + n, 0, 1);
    let col;
    if (t < 0.22) col = GRASS.sh2; else if (t < 0.44) col = GRASS.sh;
    else if (t < 0.7) col = GRASS.mid; else if (t < 0.88) col = GRASS.lt; else col = GRASS.hi;
    put(c, x, y, col);
  }
  // short vertical blade highlights for hand-painted texture
  for (let i = 0; i < 14; i++) {
    const bx = (hash(i * 3, i * 5) * TILE) | 0, by = (hash(i * 7, i * 2) * (TILE - 3)) | 0;
    const bright = hash(i, i * 9) > 0.5;
    put(c, bx, by, bright ? GRASS.hi : GRASS.sh2, 200);
    put(c, bx, by + 1, bright ? GRASS.lt : GRASS.sh, 160);
  }
  return c;
}

// Cobbled path: warm tan flagstones in running bond, grout in shadow, each
// stone lit upper-left. Period 16/16 so it tiles seamlessly at 32.
function cobbleTex(seed = 99) {
  const c = mk(TILE, TILE);
  const vary = (col, x, y) => { const r = rng((x * 73856093 ^ y * 19349663 ^ seed) >>> 0)(); return mix(col, r > 0.5 ? PATH.hi : PATH.sh, (r - 0.5) * 0.4 < 0 ? 0 : (r - 0.5) * 0.5); };
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const row = Math.floor(y / 8);
    const xoff = (row % 2) * 8;
    const lx = (x + xoff) % 16, ly = y % 8;
    const bcol = Math.floor((x + xoff) / 16), brow = row;
    let col;
    if (lx === 0 || ly === 0) col = PATH.grout;                 // grout seam
    else if (lx <= 2 && ly <= 1) col = PATH.hi;                  // UL specular
    else if (lx <= 5 && ly <= 3) col = PATH.lt;                  // UL face
    else if (lx >= 13 || ly >= 6) col = PATH.sh;                 // BR shadow
    else col = vary(PATH.mid, bcol, brow);
    put(c, x, y, col);
  }
  return c;
}

// Deep water with horizontal ripples + a few specular dashes. Tiles seamlessly.
function waterTex(seed = 7) {
  const c = mk(TILE, TILE);
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const ripple = Math.sin((y / TILE) * Math.PI * 4 + Math.cos((x / TILE) * Math.PI * 2) * 0.8);
    const t = clamp(0.5 + ripple * 0.28, 0, 1);
    put(c, x, y, t < 0.35 ? WATER.dk : t < 0.72 ? WATER.mid : WATER.lt);
  }
  const r = rng(seed);
  for (let i = 0; i < 10; i++) {
    const x = (r() * TILE) | 0, y = (r() * TILE) | 0, len = 2 + ((r() * 3) | 0);
    for (let k = 0; k < len; k++) put(c, (x + k) % TILE, y, WATER.hi, 150);
  }
  return c;
}

// ── grass↔path autotile blob ────────────────────────────────────────────────
// Each role's tile = path interior with grass encroaching from the neighbours
// that are grass. We reconstruct which of the 8 neighbour blocks are grass from
// the role, then a pixel is grass when it's within R of a grass neighbour block.
// Straight bands on edges, rounded nubs on inner corners — all derived from the
// shared neighbour occupancy, so adjacent roles align seamlessly.
const R = 7.5;
const NB = {
  fill: [], edgeN: ['N'], edgeS: ['S'], edgeW: ['W'], edgeE: ['E'],
  outerNW: ['N', 'W', 'NW'], outerNE: ['N', 'E', 'NE'], outerSW: ['S', 'W', 'SW'], outerSE: ['S', 'E', 'SE'],
  innerNW: ['NW'], innerNE: ['NE'], innerSW: ['SW'], innerSE: ['SE'],
};
function distToBlock(dir, x, y) {
  const cx = x + 0.5, cy = y + 0.5;
  switch (dir) {
    case 'N': return cy; case 'S': return TILE - cy; case 'W': return cx; case 'E': return TILE - cx;
    case 'NW': return Math.hypot(cx, cy); case 'NE': return Math.hypot(TILE - cx, cy);
    case 'SW': return Math.hypot(cx, TILE - cy); case 'SE': return Math.hypot(TILE - cx, TILE - cy);
  }
  return 99;
}
function blobTile(role, grass, cobble) {
  const c = mk(TILE, TILE);
  const dirs = NB[role];
  const isGrass = (x, y) => dirs.some((d) => distToBlock(d, x, y) < R);
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const o = (y * TILE + x) * 4;
    if (isGrass(x, y)) { c.data.set(grass.data.subarray(o, o + 4), o); }
    else { c.data.set(cobble.data.subarray(o, o + 4), o); }
  }
  // soft boundary: darken path pixels touching grass (grass casts a thin shadow)
  if (dirs.length) {
    const copy = c.data.slice();
    const gAt = (x, y) => (x < 0 || y < 0 || x >= TILE || y >= TILE) ? isGrass(clamp(x, 0, 31), clamp(y, 0, 31)) : isGrass(x, y);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      if (isGrass(x, y)) continue;
      if (gAt(x - 1, y) || gAt(x, y - 1) || gAt(x + 1, y) || gAt(x, y + 1)) {
        const o = (y * TILE + x) * 4;
        c.data[o] = copy[o] * 0.72; c.data[o + 1] = copy[o + 1] * 0.72; c.data[o + 2] = copy[o + 2] * 0.74;
      }
    }
  }
  return c;
}

// ── props (transparent background; baked into sprites by TownScene) ──────────
function disc(c, cx, cy, rx, ry, shade) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry;
    if (dx * dx + dy * dy <= 1) put(c, x, y, shade(x, y, dx, dy));
  }
}
function outlinePass(c) {
  const copy = c.data.slice();
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (copy[(y * c.w + x) * 4 + 3] > 0) continue;
    const n = getA(c, x - 1, y) || getA(c, x + 1, y) || getA(c, x, y - 1) || getA(c, x, y + 1);
    if (n > 0) put(c, x, y, OUTLINE, 235);
  }
}
function leafBlob(seed, pal) {
  const c = mk(TILE, TILE);
  const r = rng(seed);
  const lobes = [[16, 18, 11, 9], [10, 13, 7, 6], [22, 13, 7, 6], [16, 10, 8, 6]];
  for (const [cx, cy, rx, ry] of lobes) {
    disc(c, cx, cy, rx, ry, (x, y, dx, dy) => {
      const light = -(dx + dy) * 0.5;            // UL bright
      const n = (r() - 0.5) * 0.3;
      const t = clamp(0.5 + light + n, 0, 1);
      return t < 0.28 ? pal.dk : t < 0.55 ? pal.mid : t < 0.82 ? pal.lt : pal.hi;
    });
  }
  outlinePass(c);
  return c;
}
function bushTile() {
  const c = leafBlob(412, LEAF);
  const r = rng(91);
  for (let i = 0; i < 4; i++) put(c, 8 + ((r() * 16) | 0), 12 + ((r() * 8) | 0), [200, 70, 70]); // berries
  return c;
}
function rockTile(ore = false) {
  const c = mk(TILE, TILE);
  disc(c, 16, 19, 12, 9, (x, y, dx, dy) => {
    const t = clamp(0.5 - (dx + dy) * 0.5 + 0, 0, 1);
    return t < 0.3 ? STONE.dk : t < 0.62 ? STONE.mid : t < 0.85 ? STONE.lt : STONE.hi;
  });
  if (ore) { const r = rng(77); for (let i = 0; i < 6; i++) { const x = 9 + ((r() * 14) | 0), y = 14 + ((r() * 10) | 0); put(c, x, y, [216, 162, 58]); put(c, x, y + 1, [240, 200, 96], 200); } }
  outlinePass(c);
  return c;
}
function signTile() {
  const c = mk(TILE, TILE);
  for (let y = 10; y < 30; y++) { put(c, 15, y, WOOD.dk); put(c, 16, y, WOOD.mid); put(c, 17, y, WOOD.dk); } // post
  for (let y = 6; y < 16; y++) for (let x = 6; x < 27; x++) put(c, x, y, y < 8 || x < 8 ? WOOD.mid : WOOD.lt); // board
  for (let x = 9; x < 24; x += 4) { put(c, x, 10, WOOD.dk, 180); put(c, x, 12, WOOD.dk, 140); } // engraving hint
  outlinePass(c);
  return c;
}
// Pine drawn into a 32×64 canvas, split into the stacked [168,192] cells.
function pineTall() {
  const c = mk(TILE, 64);
  for (let y = 50; y < 64; y++) { put(c, 15, y, WOOD.dk); put(c, 16, y, WOOD.mid); put(c, 17, y, WOOD.dk); } // trunk
  const tiers = [[8, 7], [16, 11], [26, 15], [38, 19], [50, 23]];
  for (const [ty, half] of tiers) {
    for (let y = ty - 6; y <= ty + 6; y++) {
      const w = Math.round(half * (1 - Math.abs(y - ty) / 9));
      for (let x = 16 - w; x <= 16 + w; x++) {
        const light = -((x - 16) / half + (y - ty) / 8) * 0.5;
        const t = clamp(0.5 + light, 0, 1);
        put(c, x, y, t < 0.3 ? PINE.dk : t < 0.6 ? PINE.mid : t < 0.84 ? PINE.lt : PINE.hi);
      }
    }
  }
  outlinePass(c);
  return c;
}
// Fountain drawn into a 96×96 canvas, split into the 3×3 [272..322] cells.
function fountain() {
  const c = mk(96, 96);
  // stone base ring
  disc(c, 48, 56, 40, 26, (x, y, dx, dy) => {
    const t = clamp(0.5 - (dx + dy) * 0.45, 0, 1);
    return t < 0.32 ? STONE.dk : t < 0.62 ? STONE.mid : t < 0.85 ? STONE.lt : STONE.hi;
  });
  // water pool
  disc(c, 48, 52, 31, 19, (x, y, dx, dy) => {
    const ripple = Math.sin(dy * 6) * 0.2;
    const t = clamp(0.5 - dy * 0.4 + ripple, 0, 1);
    return t < 0.4 ? WATER.dk : t < 0.74 ? WATER.mid : WATER.lt;
  });
  // central pedestal + spout
  for (let y = 22; y < 52; y++) { const w = 4 + Math.round((52 - y) / 8); for (let x = 48 - w; x <= 48 + w; x++) { const t = clamp(0.5 - (x - 48) / 10, 0, 1); put(c, x, y, t < 0.4 ? STONE.dk : t < 0.7 ? STONE.mid : STONE.lt); } }
  disc(c, 48, 22, 8, 5, () => STONE.lt);
  for (let y = 16; y < 26; y++) { put(c, 47, y, WATER.hi, 200); put(c, 48, y, WATER.lt, 220); put(c, 49, y, WATER.hi, 200); } // jet
  outlinePass(c);
  return c;
}

// ── assemble sheet ───────────────────────────────────────────────────────────
const sheet = mk(SHEET_W, SHEET_H);
function blit(tile, index, sx = 0, sy = 0) {
  const dx = tileX(idxCol(index)), dy = tileY(idxRow(index));
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const o = ((sy + y) * tile.w + (sx + x)) * 4;
    const d = ((dy + y) * sheet.w + (dx + x)) * 4;
    sheet.data[d] = tile.data[o]; sheet.data[d + 1] = tile.data[o + 1]; sheet.data[d + 2] = tile.data[o + 2]; sheet.data[d + 3] = tile.data[o + 3];
  }
}

const grassBase = grassTex(1001);
const cobble = cobbleTex();
const ROLE_IDX = {
  fill: 173, edgeN: 149, edgeS: 197, edgeW: 172, edgeE: 174,
  outerNW: 148, outerNE: 150, outerSW: 196, outerSE: 198,
  innerSE: 170, innerSW: 171, innerNE: 194, innerNW: 195,
};

// grass + variants + flowers
blit(grassBase, 125);
blit(grassTex(1002), 126);
blit(grassTex(1003), 189);
for (const [i, seed] of [[120, 1004], [121, 1005]]) {
  const g = grassTex(seed); const r = rng(seed);
  for (let k = 0; k < 5; k++) { const x = 4 + ((r() * 24) | 0), y = 4 + ((r() * 24) | 0); const fc = i === 120 ? [222, 96, 96] : [240, 224, 120]; put(g, x, y, fc); put(g, x + 1, y, mix(fc, [255, 255, 255], 0.4)); put(g, x, y - 1, GRASS.hi); }
  blit(g, i);
}
// path blob
for (const [role, index] of Object.entries(ROLE_IDX)) blit(blobTile(role, grassBase, cobble), index);
// water
blit(waterTex(), 250);
// props
blit(leafBlob(303, LEAF), 299);
blit(bushTile(), 275);
blit(rockTile(false), 323);
blit(rockTile(true), 324);
blit(signTile(), 358);
const pine = pineTall();
blit(pine, 168, 0, 0); blit(pine, 192, 0, 32);
const fnt = fountain();
const F = [272, 273, 274, 296, 297, 298, 320, 321, 322];
for (let r = 0; r < 3; r++) for (let cc = 0; cc < 3; cc++) blit(fnt, F[r * 3 + cc], cc * 32, r * 32);

// ── edge-bleed every painted cell 1px into the spacing (avoids zoom seams) ───
function bleed() {
  const painted = new Set([125, 126, 189, 120, 121, 250, 299, 275, 323, 324, 358, 168, 192, ...Object.values(ROLE_IDX), ...F]);
  for (const index of painted) {
    const dx = tileX(idxCol(index)), dy = tileY(idxRow(index));
    const cp = (sxp, syp, dxp, dyp) => { const s = ((syp) * sheet.w + sxp) * 4, d = ((dyp) * sheet.w + dxp) * 4; for (let k = 0; k < 4; k++) sheet.data[d + k] = sheet.data[s + k]; };
    for (let x = 0; x < TILE; x++) { cp(dx + x, dy, dx + x, dy - 1); cp(dx + x, dy + 31, dx + x, dy + 32); }
    for (let y = 0; y < TILE; y++) { cp(dx, dy + y, dx - 1, dy + y); cp(dx + 31, dy + y, dx + 32, dy + y); }
    cp(dx, dy, dx - 1, dy - 1); cp(dx + 31, dy, dx + 32, dy - 1); cp(dx, dy + 31, dx - 1, dy + 32); cp(dx + 31, dy + 31, dx + 32, dy + 32);
  }
}
bleed();

// ── PNG encode (RGBA, filter 0) ──────────────────────────────────────────────
function crc32(buf) { let c = ~0; for (let i = 0; i < buf.length; i++) { c ^= buf[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); } return ~c >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function encodePng(c) {
  const raw = Buffer.alloc((c.w * 4 + 1) * c.h);
  for (let y = 0; y < c.h; y++) { raw[y * (c.w * 4 + 1)] = 0; for (let x = 0; x < c.w * 4; x++) raw[y * (c.w * 4 + 1) + 1 + x] = c.data[y * c.w * 4 + x]; }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(c.w, 0); ihdr.writeUInt32BE(c.h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const outPath = join(ROOT, 'public/town/tileset.png');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, encodePng(sheet));
console.log('wrote', outPath, `(${SHEET_W}×${SHEET_H})`);

// ── optional QA montage: an autotiled scene rendered from the new sheet ───────
if (process.argv.includes('--preview')) {
  const PW = 30, PH = 18;
  const scene = mk(PW * TILE, PH * TILE);
  // a boolean path mask + a pond, then autotile with the same rules as the game
  const mask = Array.from({ length: PH }, () => Array(PW).fill(false));
  const water = Array.from({ length: PH }, () => Array(PW).fill(false));
  for (let x = 2; x < 28; x++) { mask[6][x] = mask[7][x] = true; }            // horizontal road
  for (let y = 2; y < 16; y++) { mask[y][14] = mask[y][15] = true; }          // vertical road
  for (let y = 10; y < 16; y++) for (let x = 20; x < 27; x++) { const dx = x - 23.5, dy = y - 12.5; if (dx * dx / 12 + dy * dy / 8 <= 1) water[y][x] = true; }
  // a sand ring hugging the pond so grass→sand→water reads
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) if (water[y][x]) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const ny = y + j, nx = x + i; if (ny >= 0 && ny < PH && nx >= 0 && nx < PW && !water[ny][nx]) mask[ny][nx] = true; }
  const on = (m, x, y) => y >= 0 && y < PH && x >= 0 && x < PW && m[y][x];
  const SAND = ROLE_IDX;
  function sandIndex(x, y) {
    const N = on(mask, x, y - 1), E = on(mask, x + 1, y), S = on(mask, x, y + 1), W = on(mask, x - 1, y);
    const NE = on(mask, x + 1, y - 1), NW = on(mask, x - 1, y - 1), SE = on(mask, x + 1, y + 1), SW = on(mask, x - 1, y + 1);
    const gN = !N, gE = !E, gS = !S, gW = !W, card = gN + gE + gS + gW;
    if (card === 0) { if (!SE) return SAND.innerSE; if (!SW) return SAND.innerSW; if (!NE) return SAND.innerNE; if (!NW) return SAND.innerNW; return SAND.fill; }
    if (card === 1) return gN ? SAND.edgeN : gS ? SAND.edgeS : gW ? SAND.edgeW : SAND.edgeE;
    if (card === 2) { if (gN && gW) return SAND.outerNW; if (gN && gE) return SAND.outerNE; if (gS && gW) return SAND.outerSW; if (gS && gE) return SAND.outerSE; return SAND.fill; }
    return SAND.fill;
  }
  const fetchTile = (index) => { const dx = tileX(idxCol(index)), dy = tileY(idxRow(index)), t = mk(TILE, TILE); for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) { const s = ((dy + y) * sheet.w + dx + x) * 4, o = (y * TILE + x) * 4; for (let k = 0; k < 4; k++) t.data[o + k] = sheet.data[s + k]; } return t; };
  const cache = {};
  const tileFor = (index) => (cache[index] ||= fetchTile(index));
  const drawAt = (index, tx, ty) => { const t = tileFor(index), bx = tx * TILE, by = ty * TILE; for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) { const o = (y * TILE + x) * 4; if (t.data[o + 3] === 0) continue; put(scene, bx + x, by + y, [t.data[o], t.data[o + 1], t.data[o + 2]], t.data[o + 3]); } };
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const gi = [125, 126, 189][(x * 7 + y * 13) % 10 < 2 ? 1 + ((x + y) % 2) : 0];
    drawAt(gi, x, y);
    if (water[y][x]) drawAt(250, x, y);
    else if (mask[y][x]) drawAt(sandIndex(x, y), x, y);
  }
  // scatter props
  drawAt(168, 4, 1); drawAt(192, 4, 2);
  drawAt(299, 24, 3); drawAt(275, 9, 9); drawAt(323, 19, 4); drawAt(324, 21, 8); drawAt(358, 11, 11);
  for (let r = 0; r < 3; r++) for (let cc = 0; cc < 3; cc++) drawAt(F[r * 3 + cc], 6 + cc, 12 + r);
  const previewPath = join(ROOT, 'docs/town-tileset-preview.png');
  mkdirSync(dirname(previewPath), { recursive: true });
  writeFileSync(previewPath, encodePng(scene));
  console.log('wrote', previewPath, `(${scene.w}×${scene.h})`);
}
