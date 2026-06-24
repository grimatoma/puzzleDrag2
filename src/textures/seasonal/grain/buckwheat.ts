// Production seasonal art for the BUCKWHEAT grain tile (`tile_grain_buckwheat`).
//
// An upright buckwheat plant standing on a small grassy pad: branching REDDISH
// stems carrying heart-shaped leaves and clusters of small white-pink flowers
// that turn to dark triangular seeds. The SAME buckwheat silhouette is drawn
// every season (identity-safe) — branching reddish stems + flower/seed cluster
// nodes in the same place each season — but the seasons swing hard on colour
// plus a real seasonal prop (blossom / fallen leaf / snow cap + base snow). Its
// idle is built around its SIGNATURE — the white-pink florets — so it reads as
// buckwheat rather than another swaying grain stalk:
//
//   IDLE COMMON  (~6.4s, win ~1.15s): a distinct FLORET FLUTTER — the white-pink
//       floret heads QUIVER in place (each petal shivers on its ring) while the
//       stems give only the faintest answering sway. The flutter is the star;
//       buckwheat siblings (wheat/rice/corn) instead do a stalk traveling-wave,
//       so this reads differently. Zero pose + zero velocity at the window edges
//       (seamless); flutter is 0 at the edges.
//   IDLE RARE    (~17s, win ~1.3s, phase +3s): a BOLDER GUST that visibly bends
//       the stalks (~20–24px at the top: anticipation → hard bend → overshoot →
//       settle) AND a SEED-SPILL — a few seeds/petals tear loose from the heads
//       and scatter off, fading out. The spill is an ADDITIVE overlay enveloped
//       to 0 at both window edges (so it is invisible at rest / t=0). May exit
//       the box at the apex.
//
// The architecture is a single parameterized `paint(ctx, p, pose)` where
// `interface P` holds ONLY tweenable season params (colours + 0..1 prop
// amounts) and `pose` holds the idle gesture (bob / lean / squash / wave /
// flutter).
// Because every season is the same paint with tweened P, transitions are
// seamless: transition(0) ≡ draw(from), transition(1) ≡ draw(to). REST pose has
// all zeros, so draw(season) = paint(ctx, SP[season], REST) and the idle's pose
// is 0 at every action-window edge → seamless loop.
//
// Origin-centered in the −24..+24 design box (actions may paint outside it),
// light from upper-left, flat cel-shaded with a soft dark outline. Pure
// Canvas-2D vector drawing — never throws, clamps everything, save/restore.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable season params ──────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — paint is a
 *  pure function of these so transitions interpolate cleanly. */
interface P {
  stemLight: RGB;        // lit reddish stem colour
  stemMid: RGB;          // stem body tone
  stemDark: RGB;         // shaded stem / branch underside
  leaf: RGB;             // lit heart-leaf face
  leafDark: RGB;         // shaded heart-leaf
  petal: RGB;            // flower floret petal colour (white-pink)
  petalCore: RGB;        // floret warm centre
  seed: RGB;             // dark triangular seed face
  seedDeep: RGB;         // seed shadow
  padGrass: RGB;         // top of the grass pad
  padDark: RGB;          // shaded pad underside
  soil: RGB;             // contact / base soil under the plant
  outline: RGB;          // soft dark outline tint
  light: RGB;            // ambient light tint laid over the whole tile
  lightAmt: number;      // 0..1 strength of the ambient light wash
  gloss: number;         // 0..1 sheen/dew highlight strength on stems/leaves
  leafRedAmt: number;    // 0..1 reddening/bronzing of the leaves (autumn)
  flowerAmt: number;     // 0..1 how full the white-pink bloom is at the nodes
  budAmt: number;        // 0..1 tiny pale buds forming at the nodes (spring)
  seedAmt: number;       // 0..1 prominence of the dark triangular seeds (autumn)
  frostAmt: number;      // 0..1 cool frost dusting on the plant (winter)
  snowCapAmt: number;    // 0..1 snow cap on the seed-head nodes/leaves (winter)
  padSnowAmt: number;    // 0..1 snow blanket / drift at the base (winter)
  blossomAmt: number;    // 0..1 blossom emphasis on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad (autumn)
}

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number;     // vertical offset in design px (negative = up)
  lean: number;    // top-of-plant sway, radians (rock side to side)
  squashX: number; // additive horizontal scale (+0.18 = 18% wider)
  squashY: number; // additive vertical scale (+0.18 = 18% taller)
  wave: number;    // traveling-wave bend amount in design px at the tips
  flutter: number; // floret-head quiver amount (petals shiver on their ring)
}

const REST: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0, wave: 0, flutter: 0 };

// ── Local math helpers ───────────────────────────────────────────────────────

function clamp01(x: number): number {
  if (!(x >= 0)) return 0; // also catches NaN
  if (x > 1) return 1;
  return x;
}

const smoother = (x: number): number => x * x * x * (x * (6 * x - 15) + 10);

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function rgb(c: RGB): string {
  return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
}

function rgba(c: RGB, a: number): string {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${clamp01(a)})`;
}

function lerpP(a: P, b: P, t: number): P {
  return {
    stemLight: lerpRGB(a.stemLight, b.stemLight, t),
    stemMid: lerpRGB(a.stemMid, b.stemMid, t),
    stemDark: lerpRGB(a.stemDark, b.stemDark, t),
    leaf: lerpRGB(a.leaf, b.leaf, t),
    leafDark: lerpRGB(a.leafDark, b.leafDark, t),
    petal: lerpRGB(a.petal, b.petal, t),
    petalCore: lerpRGB(a.petalCore, b.petalCore, t),
    seed: lerpRGB(a.seed, b.seed, t),
    seedDeep: lerpRGB(a.seedDeep, b.seedDeep, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    gloss: lerp(a.gloss, b.gloss, t),
    leafRedAmt: lerp(a.leafRedAmt, b.leafRedAmt, t),
    flowerAmt: lerp(a.flowerAmt, b.flowerAmt, t),
    budAmt: lerp(a.budAmt, b.budAmt, t),
    seedAmt: lerp(a.seedAmt, b.seedAmt, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
  };
}

function clampP(p: P): P {
  return {
    ...p,
    lightAmt: clamp01(p.lightAmt),
    gloss: clamp01(p.gloss),
    leafRedAmt: clamp01(p.leafRedAmt),
    flowerAmt: clamp01(p.flowerAmt),
    budAmt: clamp01(p.budAmt),
    seedAmt: clamp01(p.seedAmt),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

function safeNum(x: number): number {
  return Number.isFinite(x) ? x : 0;
}

// ── Per-season params — pushed HARD ──────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — young plant, fresh GREEN heart leaves, slightly reddish young
  // stems, fresh WHITE-PINK flowers just blooming (its signature), tiny buds,
  // dewy lime pad + a prominent blossom on the pad; cool-bright light.
  Spring: {
    stemLight: [186, 150, 110],
    stemMid: [156, 92, 72],
    stemDark: [104, 56, 46],
    leaf: [128, 206, 92],
    leafDark: [60, 130, 52],
    petal: [255, 250, 252],
    petalCore: [248, 214, 110],
    seed: [120, 80, 40],
    seedDeep: [78, 48, 22],
    padGrass: [134, 220, 92],
    padDark: [68, 152, 60],
    soil: [120, 84, 48],
    outline: [54, 60, 40],
    light: [224, 244, 232],
    lightAmt: 0.2,
    gloss: 0.5,
    leafRedAmt: 0,
    flowerAmt: 0.7,
    budAmt: 1,
    seedAmt: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 1,
    fallenLeafAmt: 0,
  },
  // Summer — PEAK: full green leaves, abundant white-pink flowers, vivid
  // REDDISH stems, high gloss, warm bright light.
  Summer: {
    stemLight: [212, 132, 110],
    stemMid: [186, 78, 64],
    stemDark: [118, 44, 40],
    leaf: [104, 192, 74],
    leafDark: [48, 120, 46],
    petal: [255, 244, 250],
    petalCore: [248, 196, 116],
    seed: [120, 80, 40],
    seedDeep: [78, 48, 22],
    padGrass: [96, 188, 70],
    padDark: [52, 124, 48],
    soil: [128, 88, 48],
    outline: [70, 30, 28],
    light: [255, 244, 198],
    lightAmt: 0.22,
    gloss: 1,
    leafRedAmt: 0,
    flowerAmt: 1,
    budAmt: 0,
    seedAmt: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — RIPE: dark triangular SEEDS replace the flowers, leaves go vivid
  // RED/bronze, deep reddish-brown stems, dulled gloss, amber light + a fallen
  // leaf on the pad.
  Autumn: {
    stemLight: [196, 110, 66],
    stemMid: [150, 66, 42],
    stemDark: [96, 38, 28],
    leaf: [196, 86, 46],
    leafDark: [124, 46, 28],
    petal: [226, 200, 170],
    petalCore: [198, 150, 88],
    seed: [126, 78, 38],
    seedDeep: [70, 40, 18],
    padGrass: [162, 150, 78],
    padDark: [112, 92, 48],
    soil: [120, 78, 42],
    outline: [62, 30, 20],
    light: [250, 196, 128],
    lightAmt: 0.26,
    gloss: 0.32,
    leafRedAmt: 1,
    flowerAmt: 0.06,
    budAmt: 0,
    seedAmt: 1,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1,
  },
  // Winter — frosted buckwheat: dried REDDISH-BROWN stalks still clearly the
  // same plant, a BOLD snow cap on the seed heads + a snow blanket at the base,
  // cool blue-grey light. Frost-dusted, never whited out.
  Winter: {
    stemLight: [168, 132, 116],
    stemMid: [132, 86, 76],
    stemDark: [88, 56, 52],
    leaf: [150, 132, 116],
    leafDark: [96, 82, 76],
    petal: [224, 232, 240],
    petalCore: [198, 208, 218],
    seed: [128, 110, 98],
    seedDeep: [86, 72, 64],
    padGrass: [184, 204, 220],
    padDark: [124, 152, 178],
    soil: [132, 116, 102],
    outline: [54, 50, 58],
    light: [200, 224, 255],
    lightAmt: 0.36,
    gloss: 0.34,
    leafRedAmt: 0.18,
    flowerAmt: 0,
    budAmt: 0.2,
    seedAmt: 0.3,
    frostAmt: 1,
    snowCapAmt: 1,
    padSnowAmt: 1,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Buckwheat geometry — the SAME silhouette every season ─────────────────────
// A central reddish stem rising from the pad with two side branches. The three
// cluster NODES (where buds/flowers/seeds live) sit at the branch tips. These
// coordinates are constant across all P — only colour / node dressing changes.

const BASE_X = 1;     // base sits naturally on the pad
const BASE_Y = 16;    // contact on the pad
const PIVOT_Y = 15;   // bend / lean / squash anchor near the base
const TOP_Y = -19;    // top of the main stem (apex of the plant)

// One stem branch: base on the trunk → control → tip cluster node. `tipH` is the
// 0..1 height weight (1 = topmost) used to scale the traveling-wave bend so the
// tips move most and the base barely moves.
type Branch = {
  bx: number; by: number;  // start on the main stem
  cx: number; cy: number;  // control point
  tx: number; ty: number;  // tip = a cluster node
  tipH: number;            // 0..1 height weight for the wave
  thick: number;           // base line width
};

const MAIN_TIP: [number, number] = [-1, TOP_Y];

const BRANCHES: Branch[] = [
  // central main trunk (base → top centre node)
  { bx: BASE_X, by: BASE_Y, cx: -1.5, cy: -1, tx: MAIN_TIP[0], ty: MAIN_TIP[1], tipH: 1.0, thick: 2.7 },
  // left branch
  { bx: -0.5, by: 2, cx: -7, cy: -4, tx: -9.5, ty: -11, tipH: 0.78, thick: 1.9 },
  // right branch
  { bx: 0.5, by: -2, cx: 8, cy: -7, tx: 10, ty: -14, tipH: 0.9, thick: 1.9 },
];

// The three cluster nodes (constant placement), with their height weights.
const NODES: Array<[number, number, number]> = [
  [MAIN_TIP[0], MAIN_TIP[1], 1.0],
  [-9.5, -11, 0.78],
  [10, -14, 0.9],
];

// Heart-shaped leaves along the stems: [x, y, size, rotation, faceDir, heightW].
const LEAVES: Array<[number, number, number, number, number, number]> = [
  [-5.5, 4, 4.2, -0.5, -1, 0.42],
  [6, -1, 4.6, 0.55, 1, 0.62],
  [-3.5, -7, 3.4, -0.9, -1, 0.78],
];

// ── Sub-part painters (all driven only by p; `wave` is the idle bend in px) ───

/** Horizontal bend offset for a point at height weight `h` (0=base, 1=tip). */
function bendAt(h: number, wave: number): number {
  // quadratic in height so the base stays planted and tips swing the most.
  return wave * h * h;
}

/** The branching reddish stems (constant skeleton, only colour changes). */
function stems(ctx: CanvasRenderingContext2D, p: P, wave: number): void {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  BRANCHES.forEach((br) => {
    const tipDx = bendAt(br.tipH, wave);
    const ctlDx = bendAt(br.tipH * 0.6, wave);
    // dark base pass for depth
    ctx.strokeStyle = rgb(p.stemDark);
    ctx.lineWidth = br.thick;
    ctx.beginPath();
    ctx.moveTo(br.bx, br.by);
    ctx.quadraticCurveTo(br.cx + ctlDx, br.cy, br.tx + tipDx, br.ty);
    ctx.stroke();
    // mid body
    ctx.strokeStyle = rgb(p.stemMid);
    ctx.lineWidth = br.thick * 0.62;
    ctx.beginPath();
    ctx.moveTo(br.bx, br.by);
    ctx.quadraticCurveTo(br.cx + ctlDx, br.cy, br.tx + tipDx, br.ty);
    ctx.stroke();
    // lit highlight on the upper-left edge
    ctx.strokeStyle = rgb(p.stemLight);
    ctx.lineWidth = br.thick * 0.34;
    ctx.beginPath();
    ctx.moveTo(br.bx - 0.5, br.by);
    ctx.quadraticCurveTo(br.cx - 0.6 + ctlDx, br.cy - 0.6, br.tx - 0.4 + tipDx, br.ty);
    ctx.stroke();
  });
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
}

/** A single heart-shaped leaf, lit upper-left, anchored at (lx,ly). */
function heartLeaf(
  ctx: CanvasRenderingContext2D,
  p: P,
  lx: number,
  ly: number,
  s: number,
  rot: number,
  dir: number,
  flutter: number,
): void {
  // autumn reddening blended into both leaf tones.
  const face = lerpRGB(p.leaf, [196, 86, 46], p.leafRedAmt * 0.5);
  const dark = lerpRGB(p.leafDark, [124, 50, 28], p.leafRedAmt * 0.55);

  ctx.save();
  ctx.translate(lx, ly);
  ctx.rotate(rot + flutter * 0.14 * dir);
  const w = s;
  const h = s * 1.15;
  // dark base pass
  ctx.fillStyle = rgb(dark);
  ctx.beginPath();
  ctx.moveTo(0, h * 0.7);
  ctx.bezierCurveTo(-w, h * 0.2, -w, -h * 0.7, 0, -h * 0.25);
  ctx.bezierCurveTo(w, -h * 0.7, w, h * 0.2, 0, h * 0.7);
  ctx.closePath();
  ctx.fill();
  // lit face inset (upper-left)
  ctx.fillStyle = rgb(face);
  ctx.beginPath();
  ctx.moveTo(0, h * 0.55);
  ctx.bezierCurveTo(-w * 0.78, h * 0.15, -w * 0.78, -h * 0.55, 0, -h * 0.18);
  ctx.bezierCurveTo(w * 0.55, -h * 0.5, w * 0.62, h * 0.1, 0, h * 0.55);
  ctx.closePath();
  ctx.fill();
  // central vein
  ctx.strokeStyle = rgba(dark, 0.75);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.6);
  ctx.lineTo(0, -h * 0.22);
  ctx.stroke();
  // outline
  ctx.strokeStyle = rgba(p.outline, 0.7);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.7);
  ctx.bezierCurveTo(-w, h * 0.2, -w, -h * 0.7, 0, -h * 0.25);
  ctx.bezierCurveTo(w, -h * 0.7, w, h * 0.2, 0, h * 0.7);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function leaves(ctx: CanvasRenderingContext2D, p: P, wave: number, flutter: number): void {
  LEAVES.forEach(([lx, ly, s, rot, dir, hW]) => {
    heartLeaf(ctx, p, lx + bendAt(hW, wave), ly, s, rot, dir, flutter);
  });
}

/** A small white-pink 5-petal buckwheat floret at (fx,fy), scaled by amt.
 *  `flutter` (idle) shivers each petal on its ring — a tiny per-petal angle +
 *  radius wobble — without touching the floret's colour; `seed` is a stable
 *  per-floret phase so neighbouring heads quiver out of step. `twinkle` is the
 *  separate tiny summer sparkle dressing. */
function floret(
  ctx: CanvasRenderingContext2D,
  p: P,
  fx: number,
  fy: number,
  amt: number,
  twinkle: number,
  flutter: number,
  seed: number,
): void {
  const petalR = 1.5 * (0.5 + 0.5 * amt);
  const ringR = 1.7 * (0.55 + 0.45 * amt);
  const fl = flutter;
  for (let i = 0; i < 5; i++) {
    const base = (i / 5) * Math.PI * 2 - Math.PI / 2;
    // per-petal quiver: angle shiver + a little radial in/out breathing. The
    // phase varies by petal index and the head's `seed` so the shimmer is busy
    // but deterministic; `fl` (0 at the window edges) scales it all to rest.
    const a = base + fl * 0.5 * Math.sin(seed * 2.3 + i * 1.9);
    const r = ringR * (1 + fl * 0.16 * Math.sin(seed * 1.7 + i * 2.7));
    const px = fx + Math.cos(a) * r;
    const py = fy + Math.sin(a) * r;
    const pg = ctx.createRadialGradient(px - 0.5, py - 0.5, 0.2, px, py, petalR + 0.1);
    pg.addColorStop(0, rgb(lerpRGB(p.petal, [255, 255, 255], 0.25)));
    pg.addColorStop(1, rgb(p.petal));
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(px, py, petalR, 0, Math.PI * 2);
    ctx.fill();
  }
  // warm centre
  ctx.fillStyle = rgb(p.petalCore);
  ctx.beginPath();
  ctx.arc(fx, fy, 0.95, 0, Math.PI * 2);
  ctx.fill();
  // additive twinkle (summer micro-motion), tiny
  if (twinkle > 0.01) {
    ctx.save();
    ctx.globalAlpha = clamp01(twinkle);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(fx - 0.6, fy - 0.8, 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** A dark triangular buckwheat seed pointing down at (sx,sy), scaled by s. */
function seedTri(
  ctx: CanvasRenderingContext2D,
  p: P,
  sx: number,
  sy: number,
  s: number,
): void {
  const sg = ctx.createLinearGradient(sx, sy - s, sx, sy + s);
  sg.addColorStop(0, rgb(p.seed));
  sg.addColorStop(1, rgb(p.seedDeep));
  ctx.fillStyle = sg;
  ctx.strokeStyle = rgba(p.outline, 0.85);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(sx, sy + s);
  ctx.lineTo(sx - s * 0.9, sy - s * 0.7);
  ctx.lineTo(sx + s * 0.9, sy - s * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // tiny lit facet upper-left
  ctx.fillStyle = rgba(lerpRGB(p.seed, [255, 255, 255], 0.35), 0.8);
  ctx.beginPath();
  ctx.moveTo(sx - s * 0.2, sy - s * 0.5);
  ctx.lineTo(sx - s * 0.55, sy - s * 0.55);
  ctx.lineTo(sx - s * 0.25, sy);
  ctx.closePath();
  ctx.fill();
}

/** The cluster at each node: buds (spring) + florets (bloom) + seeds (autumn),
 *  each scaled by its amount. Node POSITIONS are constant; only the idle wave
 *  offsets them along with their branch tips. `flutter` (0 at rest) shivers the
 *  open florets; `twinkles` is the per-node summer sparkle. */
function clusters(
  ctx: CanvasRenderingContext2D,
  p: P,
  wave: number,
  twinkles: [number, number, number],
  flutter: number,
): void {
  const spray: Array<[number, number]> = [
    [0, 0],
    [-2.2, 1.4],
    [2.2, 1.4],
  ];

  NODES.forEach(([nx0, ny, hW], ni) => {
    const nx = nx0 + bendAt(hW, wave);
    // pale buds first (spring) — tiny knobs under any bloom.
    if (p.budAmt > 0.02) {
      ctx.save();
      ctx.globalAlpha = clamp01(p.budAmt);
      ctx.fillStyle = rgb(lerpRGB(p.petal, p.stemLight, 0.35));
      spray.forEach(([ox, oy]) => {
        ctx.beginPath();
        ctx.arc(nx + ox, ny + oy, 1.05, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
    // triangular seeds (autumn) — beneath florets so a tiny flowerAmt in autumn
    // still reads as "gone to seed".
    if (p.seedAmt > 0.03) {
      ctx.save();
      ctx.globalAlpha = clamp01(p.seedAmt);
      spray.forEach(([ox, oy]) => {
        seedTri(ctx, p, nx + ox, ny + oy + 0.4, 1.9 * (0.55 + 0.45 * p.seedAmt));
      });
      ctx.restore();
    }
    // open florets (summer peak; small in spring/autumn). Each spray floret gets
    // a stable phase seed (node index + spray slot) so the flutter quiver runs
    // out of step head-to-head.
    if (p.flowerAmt > 0.03) {
      ctx.save();
      ctx.globalAlpha = clamp01(p.flowerAmt + 0.15);
      spray.forEach(([ox, oy], si) => {
        floret(ctx, p, nx + ox, ny + oy, p.flowerAmt, twinkles[ni], flutter, ni * 3 + si);
      });
      ctx.restore();
    }
  });
}

/** Subtle sheen/dew highlight on a couple of upward surfaces. */
function sheen(ctx: CanvasRenderingContext2D, p: P, wave: number): void {
  if (p.gloss < 0.02) return;
  ctx.save();
  ctx.globalAlpha = 0.5 * clamp01(p.gloss);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(-2.2 + bendAt(0.55, wave), -10, 0.7, 2.2, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(5.2 + bendAt(0.62, wave), -1.4, 0.6, 1.4, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Frost dusting + small snow caps on the plant's upward surfaces (winter). */
function frostAndSnow(ctx: CanvasRenderingContext2D, p: P, wave: number): void {
  // bold snow caps sitting on each seed-head node + the leaf tops.
  if (p.snowCapAmt > 0.01) {
    ctx.save();
    ctx.globalAlpha = clamp01(p.snowCapAmt);
    const cap = ctx.createLinearGradient(0, -22, 0, -8);
    cap.addColorStop(0, "#ffffff");
    cap.addColorStop(1, "#dbe6f2");
    ctx.fillStyle = cap;
    NODES.forEach(([nx0, ny, hW]) => {
      const nx = nx0 + bendAt(hW, wave);
      ctx.beginPath();
      ctx.ellipse(nx, ny - 1.6, 3.6, 2.0, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    LEAVES.forEach(([lx, ly, , , , hW]) => {
      ctx.beginPath();
      ctx.ellipse(lx + bendAt(hW, wave), ly - 2.2, 2.4, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
  // frost dusting — fine pale specks on the upper-left (lit) surfaces.
  if (p.frostAmt > 0.01) {
    ctx.save();
    ctx.globalAlpha = 0.7 * clamp01(p.frostAmt);
    ctx.fillStyle = "#eaf3ff";
    const specks: Array<[number, number, number]> = [
      [-9.5, -12, 0.78], [10, -15, 0.9], [-1, -20, 1.0], [-5.5, 2, 0.42],
      [6, -2.5, 0.62], [-3.5, -8.5, 0.78], [2, -6, 0.55], [-7, -5, 0.4],
    ];
    specks.forEach(([sx, sy, hW]) => {
      ctx.beginPath();
      ctx.arc(sx + bendAt(hW, wave), sy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
}

// ── The single parameterized paint ───────────────────────────────────────────

/** The whole tile from ONLY `p` (season identity) and `pose` (idle gesture). */
function paint(ctx: CanvasRenderingContext2D, raw: P, rawPose: Pose): void {
  const p = clampP(raw);
  const pose: Pose = {
    bob: safeNum(rawPose.bob),
    lean: safeNum(rawPose.lean),
    squashX: safeNum(rawPose.squashX),
    squashY: safeNum(rawPose.squashY),
    wave: safeNum(rawPose.wave),
    flutter: safeNum(rawPose.flutter),
  };

  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Pad: low flat grass ellipse (does NOT move with the pose) ────────────
    ctx.fillStyle = rgba(p.padDark, 0.4);
    ctx.beginPath();
    ctx.ellipse(3, 21.5, 16, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rgb(p.padDark);
    ctx.beginPath();
    ctx.ellipse(0, 20.4, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(p.padGrass);
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // tufted top edge
    ctx.strokeStyle = rgb(p.padDark);
    ctx.lineWidth = 1.1;
    for (let i = -7; i <= 7; i++) {
      const tx = i * 2.4;
      const ty = 19 - Math.sqrt(Math.max(0, 1 - (tx / 18) ** 2)) * 5.2;
      ctx.beginPath();
      ctx.moveTo(tx, ty + 0.4);
      ctx.lineTo(tx - 0.8, ty - 2.4);
      ctx.stroke();
    }
    // grass-top highlight glints
    ctx.strokeStyle = rgba([255, 255, 255], 0.18);
    ctx.lineWidth = 1;
    for (let i = -5; i <= 5; i += 2) {
      const tx = i * 2.6 - 2;
      ctx.beginPath();
      ctx.moveTo(tx, 18.4);
      ctx.lineTo(tx - 0.6, 16.6);
      ctx.stroke();
    }

    // pad snow blanket / base drift (winter)
    if (p.padSnowAmt > 0.01) {
      ctx.fillStyle = rgba([244, 250, 255], 0.92 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(0, 18.4, 17.4 * (0.6 + 0.4 * p.padSnowAmt), 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([210, 226, 244], 0.5 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(2, 20, 16, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // a little drift heaped at the base of the stalk
      ctx.fillStyle = rgba([255, 255, 255], 0.85 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(1, 15.6, 6.5 * (0.5 + 0.5 * p.padSnowAmt), 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.padSnowAmt);
      ([[-9, 17.6], [5, 19], [11, 17.4], [-3, 20]] as Array<[number, number]>).forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // blossom emphasis on the pad (spring)
    if (p.blossomAmt > 0.01) {
      const a = p.blossomAmt;
      const spots: Array<[number, number]> = [[-13, 18.5], [12, 17.8], [-4, 21]];
      spots.forEach(([bx, by], idx) => {
        ctx.fillStyle = rgba(idx === 1 ? [255, 232, 246] : [255, 250, 252], 0.95 * a);
        for (let k = 0; k < 5; k++) {
          const ang = (k / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(bx + Math.cos(ang) * 1.6, by + Math.sin(ang) * 1.1, 1.2, 0.9, ang, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = rgba([255, 214, 90], a);
        ctx.beginPath();
        ctx.arc(bx, by, 1.0, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // fallen leaf on the pad (autumn)
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const leavesOnPad: Array<[number, number, number, RGB]> = [
        [-12, 19.6, -0.5, [206, 124, 38]],
        [12, 18.6, 0.7, [182, 70, 28]],
      ];
      leavesOnPad.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgba(col, a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.6, 2.0, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba([90, 44, 16], a);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-3.4, 0);
        ctx.lineTo(3.4, 0);
        ctx.stroke();
        ctx.restore();
      });
    }

    // ── Contact shadow under the plant (follows the lean/bob for grounding) ───
    const tipShift = pose.lean * (PIVOT_Y - TOP_Y); // how far the apex leans
    const shadowSpread = 1 + clamp01(pose.bob < 0 ? -pose.bob / 14 : 0) * 0.5;
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0 + tipShift * 0.18, BASE_Y + 4.5, 9 * shadowSpread, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.26 / shadowSpread);
    ctx.beginPath();
    ctx.ellipse(2.5 + tipShift * 0.2, BASE_Y + 5, 11 * shadowSpread, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the buckwheat plant, under the idle pose transform ───────────
    ctx.save();
    // Pivot near the base so lean rocks the TOP side-to-side and squash anchors
    // at the base (it "stands" on the pad). bob raises the whole plant.
    ctx.translate(0, PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(0, -PIVOT_Y);

    // The traveling-wave bend is applied per-part inside the painters via `wave`;
    // the floret quiver via `flutter`.
    stems(ctx, p, pose.wave);
    leaves(ctx, p, pose.wave, pose.wave * 0.06);
    clusters(ctx, p, pose.wave, [0, 0, 0], pose.flutter);
    sheen(ctx, p, pose.wave);
    frostAndSnow(ctx, p, pose.wave);

    ctx.restore(); // end pose transform

    // ── Ambient light wash over the whole tile (per-season tint) ─────────────
    if (p.lightAmt > 0.001) {
      ctx.globalAlpha = 1;
      const lg = ctx.createRadialGradient(-10, -14, 2, -10, -14, 46);
      lg.addColorStop(0, rgba(p.light, p.lightAmt));
      lg.addColorStop(1, rgba(p.light, p.lightAmt * 0.25));
      ctx.fillStyle = lg;
      ctx.fillRect(-24, -24, 48, 48);
    }
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── Idle pose clock — two-tier occasional action ─────────────────────────────

/** Returns 0..1 progress through an action window of length `win` starting at
 *  phase offset within `period`, else −1 (at rest). Seamless because the pose
 *  built from q is zero (with zero velocity) at q=0 and q=1. */
function actionQ(t: number, period: number, win: number, phase: number): number {
  const c = (((t + phase) % period) + period) % period;
  return c < win ? c / win : -1;
}

// A bump shape that is 0 with zero velocity at q=0 and q=1 (single hump).
function hump(q: number): number {
  const s = Math.sin(Math.PI * q);
  return s * s;
}

/** Build the idle pose from the wall clock. Two tiers, chosen to read as
 *  buckwheat specifically:
 *   COMMON FLORET FLUTTER every ~6.4s (win 1.15s) — the floret heads quiver,
 *     the stems barely answer; and
 *   RARE BOLDER GUST every ~17s (win 1.3s, phase +3s) — a hard stalk bend
 *     (the seed-spill overlay rides the same window over in `anim`). */
function poseFromClock(t: number): Pose {
  const pose: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0, wave: 0, flutter: 0 };

  // ── COMMON: FLORET FLUTTER (~6.4s, win 1.15s) ──
  // The white-pink heads shiver in place: `flutter` runs several quiver cycles
  // inside the window (the petals shimmer on their rings) while the stems give
  // only a whisper of sway, so the FLORETS lead the motion — distinct from the
  // stalk traveling-wave the other grains use. The sin(pi*q) envelope makes
  // every channel 0 with zero velocity at both window edges (seamless).
  const qC = actionQ(t, 6.4, 1.15, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC); // 0..1..0, zero velocity at edges
    // busy quiver: ~3.5 shiver cycles across the window, enveloped to rest.
    pose.flutter += env * (0.85 * Math.sin(qC * Math.PI * 7) + 0.3 * Math.sin(qC * Math.PI * 11));
    // the stems only faintly answer the flutter (heads lead, stalk follows).
    pose.wave += 2.4 * env * Math.sin(qC * Math.PI * 3);
    pose.lean += 0.018 * env * Math.sin(qC * Math.PI * 2);
    // a barely-there breathing squash so the head "lives".
    pose.squashY += 0.018 * hump(qC);
    pose.squashX += -0.014 * hump(qC);
  }

  // ── RARE: BOLDER GUST BEND (~17s, win 1.3s, phase +3s so it never collides) ──
  // Anticipation (a brief lean back) → a HARD bend over (~20–24px at the top) →
  // overshoot the other way → settle. Bolder than before so it stands apart and
  // visibly bends the stalks. The seed-spill overlay rides the same window.
  const qS = actionQ(t, 17.0, 1.3, 3.0);
  if (qS >= 0) {
    const env = Math.sin(Math.PI * qS); // 0..1..0, zero velocity at both edges
    // anticipation lobe (negative) then the main bend + a damped overshoot.
    // Every term is multiplied by `env`, so the whole gust is exactly 0 with
    // zero velocity at q=0 and q=1.
    const bend = env * (
      Math.sin(qS * Math.PI)              // main hard bend over (one way)
      + 0.34 * Math.sin(qS * Math.PI * 2) // anticipation + overshoot wobble
      - 0.12 * Math.sin(qS * Math.PI * 3) // smaller follow-through settle
    );
    // top arm ≈ (PIVOT_Y - TOP_Y) ≈ 34px, so 0.6 rad peak ≈ 20–24px at the tip.
    pose.lean += 0.6 * bend;
    // tips whip further than the trunk during the gust.
    pose.wave += 11.0 * bend;
    // the heads also shiver as the gust tears through them.
    pose.flutter += 0.5 * env * Math.sin(qS * Math.PI * 5);
    // crouch/stretch load at the base, settling out.
    pose.squashY += 0.07 * env - 0.05 * hump(qS);
    pose.squashX += -0.06 * env + 0.045 * hump(qS);
    // a touch of lift at the apex of the whip.
    pose.bob += -1.8 * hump(qS);
  }

  return pose;
}

// ── Seed-spill overlay (RARE gust dressing) ──────────────────────────────────

/** A few seeds / petals that tear loose from the heads during the RARE gust and
 *  scatter off, fading out. ADDITIVE dressing painted over the tile, NOT part of
 *  the silhouette. It rides the SAME window as the gust bend (period 17s, win
 *  1.3s, phase +3s) and is enveloped to 0 alpha at BOTH window edges, so:
 *    • at rest / t=0 the window is inactive (qS < 0) → nothing is drawn at all;
 *    • across the active window the particles fade in from and back out to 0.
 *  Deterministic (fixed per-particle launch params); never throws; clamps. */
function seedSpill(
  ctx: CanvasRenderingContext2D,
  p: P,
  t: number,
): void {
  const qS = actionQ(t, 17.0, 1.3, 3.0);
  if (qS < 0) return; // inactive (true at t=0) → invisible at rest
  const env = Math.sin(Math.PI * qS); // 0 at q=0 and q=1 → 0 alpha at both edges
  if (env <= 0) return;

  // Loose debris launches from the three seed-head nodes and blows downwind
  // (+x, the bend direction) and outward, drifting down with a little gravity.
  // [originX, originY, vx, vy, spin, sizeK] — fixed so the scatter is repeatable.
  const bits: Array<[number, number, number, number, number, number]> = [
    [MAIN_TIP[0], MAIN_TIP[1], 17, -6, 5.0, 1.0],
    [10, -14, 15, -2, -4.0, 0.9],
    [-9.5, -11, 12, -9, 3.2, 0.85],
    [MAIN_TIP[0] + 1, MAIN_TIP[1] + 2, 21, 2, 6.0, 0.75],
    [10, -13, 19, 5, -5.5, 0.7],
  ];

  // The spill takes on the head's current content: dark triangular seeds when
  // gone-to-seed (autumn), else pale petals (spring/summer), with winter pale
  // husk-flecks. Read straight from the season params (no identity change).
  const asSeed = p.seedAmt > p.flowerAmt + 0.05;
  const petalCol = lerpRGB(p.petal, [255, 255, 255], 0.15);

  ctx.save();
  try {
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    bits.forEach(([ox, oy, vx, vy, spin, sizeK]) => {
      // travel out along the wind as q advances; gravity pulls down late.
      const px = ox + vx * qS;
      const py = oy + vy * qS + 14 * qS * qS;
      // each bit fades within the window: rise then fall, scaled by the gust env
      // so it is 0 at both edges (alpha 0 at q=0 and q=1).
      const a = clamp01(env * (0.55 + 0.45 * Math.sin(qS * Math.PI)));
      if (a <= 0) return;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(px, py);
      ctx.rotate(spin * qS);
      if (asSeed) {
        // a tiny dark triangular seed flake
        const s = 1.6 * sizeK;
        ctx.fillStyle = rgb(p.seed);
        ctx.beginPath();
        ctx.moveTo(0, s);
        ctx.lineTo(-s * 0.9, -s * 0.7);
        ctx.lineTo(s * 0.9, -s * 0.7);
        ctx.closePath();
        ctx.fill();
      } else {
        // a small pale petal flake
        ctx.fillStyle = rgb(petalCol);
        ctx.beginPath();
        ctx.ellipse(0, 0, 1.5 * sizeK, 0.95 * sizeK, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], REST);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const tt = Number.isFinite(t) ? t : 0;
    paint(ctx, SP[season], poseFromClock(tt));

    // Light additive season micro-sparkle (dressing only — never the subject's
    // own colour/brightness). Kept tiny so the POSE action is the star.
    ctx.save();
    try {
      ctx.globalAlpha = 1;
      if (season === "Winter") {
        const seeds: Array<[number, number, number]> = [
          [-9, 0.0, 1.0], [6, 0.4, 0.9], [11, 0.7, 0.8], [-2, 0.25, 0.9],
        ];
        ctx.fillStyle = "#ffffff";
        seeds.forEach(([fx, phase, r]) => {
          const prog = ((tt / 3.0 + phase) % 1 + 1) % 1;
          const fy = -22 + prog * 38;
          const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
          ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.arc(dx, fy, r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      } else if (season === "Spring") {
        // a couple of drifting petals from the fresh bloom
        ctx.fillStyle = "rgba(255,240,248,0.9)";
        for (let i = 0; i < 2; i++) {
          const prog = ((tt / 4.0 + i * 0.5) % 1 + 1) % 1;
          const px = (i === 0 ? -10 : 9) + Math.sin(prog * Math.PI * 2) * 3;
          const py = -18 + prog * 34;
          ctx.globalAlpha = 0.35 + 0.4 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.ellipse(px, py, 1.4, 0.9, prog * 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (season === "Autumn") {
        // one slow tumbling leaf
        const prog = ((tt / 5.0) % 1 + 1) % 1;
        const px = 11 - prog * 6 + Math.sin(prog * Math.PI * 3) * 2;
        const py = -16 + prog * 32;
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(prog * Math.PI);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(prog * Math.PI * 4);
        ctx.fillStyle = "rgba(196,96,32,1)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.4, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      // Summer: no extra continuous dressing — the gust + abundant bloom is the show.

      // RARE seed-spill: a few seeds/petals scatter off the heads during the
      // gust window and fade. Additive overlay, enveloped to 0 at the window
      // edges, and inactive at rest → invisible at t=0. Runs every season.
      seedSpill(ctx, SP[season], tt);
    } finally {
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  };
}

// ── Forward season→season transitions (seamless endpoints) ───────────────────

function makeTransition(fromIdx: 0 | 1 | 2): (ctx: CanvasRenderingContext2D, p: number) => void {
  const from = SP[SEASON_NAMES[fromIdx]];
  const to = SP[SEASON_NAMES[fromIdx + 1]];
  return (ctx, pp) => {
    const k = smoother(clamp01(pp));
    paint(ctx, lerpP(from, to, k), REST);
  };
}

const springToSummer = makeTransition(0);
const summerToAutumn = makeTransition(1);
const autumnToWinter = makeTransition(2);

// ── Exports ──────────────────────────────────────────────────────────────────

export const VARIANTS: SeasonalTileEntry = {
  Spring: { draw: draw("Spring"), anim: anim("Spring") },
  Summer: { draw: draw("Summer"), anim: anim("Summer") },
  Autumn: { draw: draw("Autumn"), anim: anim("Autumn") },
  Winter: { draw: draw("Winter"), anim: anim("Winter") },
};

export const TRANSITIONS: SeasonalTransitionSet = {
  0: springToSummer,
  1: summerToAutumn,
  2: autumnToWinter,
};
