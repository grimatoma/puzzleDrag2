// Seasonal art for the BUCKWHEAT farm tile (`tile_grain_buckwheat`, category grain).
//
// Identity rule: the subject is ALWAYS the same short BUCKWHEAT SPRIG standing on
// a turf pad — a small branching sprig (a central stem with a few side branches),
// a handful of heart-shaped leaves, and three flower/seed cluster nodes at the
// branch tips. It is the harvested grain ITEM (a short sprig), never a full
// stalk or plant. Every season shares the SAME silhouette/outline — the stems,
// leaves and cluster NODES are in the same place each season; only colour, the
// node dressing (buds → full white-pink bloom → dark triangular seeds → frosted
// caps) and the pad change. In winter the sprig stays CLEARLY a sprig, just
// frost-dusted; it is NEVER reduced to a bare twig or whited out.
//
// Architecture: a single parameterized `paint(ctx, p, bob)` draws the whole
// tile from a tweenable parameter set `P`. The four seasons are four `P` values
// in `SP`. `draw` = paint at rest, `anim` = paint at a seamless idle bob plus
// additive per-season micro-motion, and each `transition` lerps every field of
// `P` between neighbouring seasons through a smoothstep so the morph starts
// exactly on the `from` still and ends exactly on the `to` still.
//
// Drawn origin-centered in the ~-24..+24 design box; the caller has already
// translated to the tile centre. Pure Canvas-2D vector art — no images, DOM,
// or libraries. Reads at ~64px.

import type {
  SeasonalTileEntry,
  SeasonalTransitionSet,
  SeasonName,
} from "../types.js";

// ── Tweenable parameter set ─────────────────────────────────────────────────
// EVERY value that differs between seasons lives here as a number or a number
// tuple so it can be interpolated. Colours are [r,g,b]; amounts are 0..1.

type RGB = [number, number, number];

interface P {
  // light / ground
  shadowAmt: number; // contact-shadow strength 0..1
  // pad
  padGrass: RGB; // turf disc top colour
  padGrassDark: RGB; // turf underside / shaded colour
  padSnowAmt: number; // 0..1 white snow cover over the pad
  blossomAmt: number; // 0..1 pale blossom resting on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad (autumn)
  // stems / branches
  stemLight: RGB; // lit stem colour
  stemDark: RGB; // shaded stem / outline tint
  // leaves (heart-shaped, constant placement)
  leaf: RGB; // lit leaf face colour
  leafDark: RGB; // shaded leaf colour
  leafRedAmt: number; // 0..1 reddening of the leaves (autumn)
  // flower clusters (white-pink 5-petal florets at the nodes)
  flowerAmt: number; // 0..1 how full the floral bloom is at the nodes
  petal: RGB; // floret petal colour
  petalCore: RGB; // floret centre colour
  // seeds (dark triangular buckwheat seeds at the nodes)
  seedAmt: number; // 0..1 how prominent the triangular seeds are
  seed: RGB; // seed face colour
  seedDeep: RGB; // seed shadow colour
  // bud (tiny pale knobs before bloom, spring)
  budAmt: number; // 0..1 tiny pale buds forming at the nodes
  // outline
  outline: RGB; // soft dark outline tint
  // winter dressing
  frostAmt: number; // 0..1 frost dusting sparkle on upward surfaces
  snowCapAmt: number; // 0..1 small snow caps sitting on the nodes/leaves
  // surface gloss / dew
  gloss: number; // 0..1 subtle sheen/dew highlight
}

// ── Season parameter sets ───────────────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — fresh lightly-desaturated green sprig; tiny pale buds just forming
  // at the nodes (no open flowers yet); a little dew; bright lime dewy pad + a
  // pale blossom resting on the pad.
  Spring: {
    shadowAmt: 0.5,
    padGrass: [142, 214, 96],
    padGrassDark: [86, 150, 60],
    padSnowAmt: 0,
    blossomAmt: 1,
    fallenLeafAmt: 0,
    stemLight: [122, 188, 84],
    stemDark: [60, 112, 46],
    leaf: [128, 198, 90],
    leafDark: [66, 120, 50],
    leafRedAmt: 0,
    flowerAmt: 0.12,
    petal: [244, 248, 240],
    petalCore: [228, 214, 130],
    seedAmt: 0,
    seed: [120, 80, 40],
    seedDeep: [78, 48, 22],
    budAmt: 1,
    outline: [44, 78, 38],
    frostAmt: 0,
    snowCapAmt: 0,
    gloss: 0.5,
  },
  // Summer — richest, most-saturated palette (PEAK BLOOM); full white-pink
  // 5-petal florets clustering at every node, fresh green stems & leaves;
  // saturated green pad, warm light, strong shadow.
  Summer: {
    shadowAmt: 0.7,
    padGrass: [104, 184, 70],
    padGrassDark: [62, 126, 46],
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    stemLight: [110, 178, 74],
    stemDark: [52, 104, 42],
    leaf: [108, 184, 72],
    leafDark: [52, 110, 44],
    leafRedAmt: 0,
    flowerAmt: 1,
    petal: [255, 246, 250],
    petalCore: [244, 196, 120],
    seedAmt: 0,
    seed: [120, 80, 40],
    seedDeep: [78, 48, 22],
    budAmt: 0,
    outline: [40, 74, 34],
    frostAmt: 0,
    snowCapAmt: 0,
    gloss: 0.8,
  },
  // Autumn — rusty-red sprig; leaves reddening; flowers gone to seed so dark
  // brown TRIANGULAR seeds are prominent at the nodes; olive-tan browning pad +
  // a couple of fallen leaves on the pad.
  Autumn: {
    shadowAmt: 0.55,
    padGrass: [158, 150, 78],
    padGrassDark: [112, 96, 50],
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1,
    stemLight: [188, 96, 80],
    stemDark: [112, 48, 40],
    leaf: [188, 120, 64],
    leafDark: [120, 64, 32],
    leafRedAmt: 1,
    flowerAmt: 0.08,
    petal: [228, 206, 180],
    petalCore: [196, 150, 90],
    seedAmt: 1,
    seed: [138, 90, 42],
    seedDeep: [78, 46, 18],
    budAmt: 0,
    outline: [78, 44, 26],
    frostAmt: 0,
    snowCapAmt: 0,
    gloss: 0.45,
  },
  // Winter — cool muted blue-grey light; the SAME sprig, now bare of flowers
  // but STILL CLEARLY A SPRIG: frost-dusted grey-green stems & leaves with small
  // snow caps on the nodes; pad snow-covered + frost sparkle. No white-out, no
  // bare-twig stub — the sprig stays visible in its own muted colour.
  Winter: {
    shadowAmt: 0.4,
    padGrass: [120, 138, 122],
    padGrassDark: [86, 104, 96],
    padSnowAmt: 1,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    stemLight: [120, 142, 120],
    stemDark: [74, 96, 80],
    leaf: [124, 146, 122],
    leafDark: [80, 102, 86],
    leafRedAmt: 0.15,
    flowerAmt: 0,
    petal: [222, 230, 236],
    petalCore: [196, 206, 214],
    seedAmt: 0.25,
    seed: [120, 116, 110],
    seedDeep: [86, 84, 80],
    budAmt: 0.2,
    outline: [58, 70, 64],
    frostAmt: 1,
    snowCapAmt: 1,
    gloss: 0.35,
  },
};

// ── Helpers: colour + interpolation ─────────────────────────────────────────

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function rgb([r, g, b]: RGB, a = 1): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** Interpolate EVERY field of P (tuples component-wise, scalars linearly). */
function lerpP(a: P, b: P, t: number): P {
  return {
    shadowAmt: lerp(a.shadowAmt, b.shadowAmt, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padGrassDark: lerpRGB(a.padGrassDark, b.padGrassDark, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
    stemLight: lerpRGB(a.stemLight, b.stemLight, t),
    stemDark: lerpRGB(a.stemDark, b.stemDark, t),
    leaf: lerpRGB(a.leaf, b.leaf, t),
    leafDark: lerpRGB(a.leafDark, b.leafDark, t),
    leafRedAmt: lerp(a.leafRedAmt, b.leafRedAmt, t),
    flowerAmt: lerp(a.flowerAmt, b.flowerAmt, t),
    petal: lerpRGB(a.petal, b.petal, t),
    petalCore: lerpRGB(a.petalCore, b.petalCore, t),
    seedAmt: lerp(a.seedAmt, b.seedAmt, t),
    seed: lerpRGB(a.seed, b.seed, t),
    seedDeep: lerpRGB(a.seedDeep, b.seedDeep, t),
    budAmt: lerp(a.budAmt, b.budAmt, t),
    outline: lerpRGB(a.outline, b.outline, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
    gloss: lerp(a.gloss, b.gloss, t),
  };
}

/** Clamp every amount field so paint never sees out-of-range values. */
function clampP(p: P): P {
  return {
    ...p,
    shadowAmt: clamp01(p.shadowAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    leafRedAmt: clamp01(p.leafRedAmt),
    flowerAmt: clamp01(p.flowerAmt),
    seedAmt: clamp01(p.seedAmt),
    budAmt: clamp01(p.budAmt),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    gloss: clamp01(p.gloss),
  };
}

// Quintic smootherstep, used for transitions (zero velocity at both ends).
const smoother = (x: number): number => x * x * x * (x * (6 * x - 15) + 10);

// ── Shared sprig geometry (IDENTICAL silhouette every season) ────────────────
// The sprig is a central stem rising from the pad with two side branches. The
// three cluster NODES (where buds/flowers/seeds live) sit at the branch tips.
// These coordinates are constant across all P — only colour / node dressing
// changes per season.

const BASE_Y = 16; // sprig contact on the pad
const BASE_X = 1; // tiny offset so the base sits naturally on the pad

// Cubic-ish stem skeleton: [start, control, tip].
type Branch = {
  bx: number;
  by: number; // branch start (on the main stem)
  cx: number;
  cy: number; // control point
  tx: number;
  ty: number; // tip = a cluster node
};

// Main stem tip is the top centre node; two side branches reach the other nodes.
const MAIN_TIP: [number, number] = [-1, -19];
const BRANCHES: Branch[] = [
  // central main stem (drawn from base to top tip)
  { bx: BASE_X, by: BASE_Y, cx: -1.5, cy: -1, tx: MAIN_TIP[0], ty: MAIN_TIP[1] },
  // left branch
  { bx: -0.5, by: 2, cx: -7, cy: -4, tx: -9.5, ty: -11 },
  // right branch
  { bx: 0.5, by: -2, cx: 8, cy: -7, tx: 10, ty: -14 },
];

// The three cluster nodes (constant placement) where buds/flowers/seeds sit.
const NODES: Array<[number, number]> = [
  [MAIN_TIP[0], MAIN_TIP[1]],
  [-9.5, -11],
  [10, -14],
];

// Heart-shaped leaves along the stems: [x, y, size, rotation, faceDir].
const LEAVES: Array<[number, number, number, number, number]> = [
  [-5.5, 4, 4.2, -0.5, -1],
  [6, -1, 4.6, 0.55, 1],
  [-3.5, -7, 3.4, -0.9, -1],
];

// ── Sub-part painters (all driven only by p) ────────────────────────────────

/** Soft contact shadow toward the lower-right, on transparency. */
function contactShadow(ctx: CanvasRenderingContext2D, p: P): void {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${0.26 * p.shadowAmt})`;
  ctx.beginPath();
  ctx.ellipse(3, 21, 15, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Low flat turf disc pad with tufted edge + shaded underside, plus snow. */
function pad(ctx: CanvasRenderingContext2D, p: P): void {
  // shaded underside
  ctx.fillStyle = rgb(p.padGrassDark);
  ctx.beginPath();
  ctx.ellipse(0, 20.5, 18, 5.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // top turf face
  ctx.fillStyle = rgb(p.padGrass);
  ctx.beginPath();
  ctx.ellipse(0, 19, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // soft tufted edge — little blades around the rim
  ctx.strokeStyle = rgb(p.padGrassDark);
  ctx.lineWidth = 1.3;
  ctx.lineCap = "round";
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const ex = Math.cos(a) * 17.2;
    const ey = 19 + Math.sin(a) * 4.6;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + Math.cos(a) * 1.8, ey + Math.sin(a) * 1.4 - 1.4);
    ctx.stroke();
  }
  // lit blades on top
  ctx.strokeStyle = rgb(lerpRGB(p.padGrass, [255, 255, 255], 0.25));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    const ex = Math.cos(a) * 12;
    const ey = 18 + Math.sin(a) * 3.2;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + 0.6, ey - 2);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // snow cover over the pad (winter)
  if (p.padSnowAmt > 0.01) {
    ctx.save();
    ctx.globalAlpha = p.padSnowAmt;
    const snow = ctx.createLinearGradient(0, 14, 0, 23);
    snow.addColorStop(0, "#f3f7fd");
    snow.addColorStop(1, "#cbd8e6");
    ctx.fillStyle = snow;
    ctx.beginPath();
    ctx.ellipse(0, 19, 17, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // frost sparkle specks on the pad
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    const specks: Array<[number, number]> = [
      [-10, 18], [-3, 20], [6, 18.5], [12, 19.5], [2, 17.5],
    ];
    specks.forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
}

/** Pale blossom resting on the pad (spring dressing). */
function blossom(ctx: CanvasRenderingContext2D, p: P): void {
  if (p.blossomAmt < 0.02) return;
  ctx.save();
  ctx.globalAlpha = p.blossomAmt;
  ctx.translate(-12, 19);
  ctx.fillStyle = "rgba(255,240,248,0.96)";
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 2.4, Math.sin(a) * 1.4, 1.7, 1.1, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(248,206,96,0.95)";
  ctx.beginPath();
  ctx.arc(0, 0, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A couple of fallen leaves on the pad (autumn dressing). */
function fallenLeaves(ctx: CanvasRenderingContext2D, p: P): void {
  if (p.fallenLeafAmt < 0.02) return;
  ctx.save();
  ctx.globalAlpha = p.fallenLeafAmt;
  const leaves: Array<[number, number, number, string]> = [
    [-12, 20, -0.5, "#c8772b"],
    [11, 20.5, 0.7, "#b8531f"],
  ];
  leaves.forEach(([lx, ly, rot, col]) => {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(rot);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.4, 1.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(90,48,16,0.7)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-3.2, 0);
    ctx.lineTo(3.2, 0);
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}

/** The branching stems of the sprig (constant skeleton, only colour changes). */
function stems(ctx: CanvasRenderingContext2D, p: P, sway: number): void {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  BRANCHES.forEach((br, i) => {
    // tips sway a touch; the base stays anchored.
    const swx = sway * (0.4 + i * 0.25);
    // dark base pass for depth
    ctx.strokeStyle = rgb(p.stemDark);
    ctx.lineWidth = i === 0 ? 2.6 : 1.9;
    ctx.beginPath();
    ctx.moveTo(br.bx, br.by);
    ctx.quadraticCurveTo(br.cx + swx * 0.5, br.cy, br.tx + swx, br.ty);
    ctx.stroke();
    // lit stem highlight on the upper-left edge
    ctx.strokeStyle = rgb(p.stemLight);
    ctx.lineWidth = i === 0 ? 1.2 : 0.9;
    ctx.beginPath();
    ctx.moveTo(br.bx - 0.5, br.by);
    ctx.quadraticCurveTo(br.cx - 0.6 + swx * 0.5, br.cy - 0.6, br.tx - 0.4 + swx, br.ty);
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
  const face = lerpRGB(p.leaf, [192, 96, 52], p.leafRedAmt * 0.55);
  const dark = lerpRGB(p.leafDark, [124, 56, 28], p.leafRedAmt * 0.6);

  ctx.save();
  ctx.translate(lx, ly);
  ctx.rotate(rot + flutter * 0.12 * dir);
  // heart-shaped blade: two lobes at the top narrowing to a point at the base.
  const w = s;
  const h = s * 1.15;
  // dark base pass
  ctx.fillStyle = rgb(dark);
  ctx.beginPath();
  ctx.moveTo(0, h * 0.7); // tip (points away from stem along base)
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
  ctx.strokeStyle = rgb(dark, 0.75);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.6);
  ctx.lineTo(0, -h * 0.22);
  ctx.stroke();
  // outline
  ctx.strokeStyle = rgb(p.outline, 0.7);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.7);
  ctx.bezierCurveTo(-w, h * 0.2, -w, -h * 0.7, 0, -h * 0.25);
  ctx.bezierCurveTo(w, -h * 0.7, w, h * 0.2, 0, h * 0.7);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function leaves(ctx: CanvasRenderingContext2D, p: P, flutter: number): void {
  LEAVES.forEach(([lx, ly, s, rot, dir]) => {
    heartLeaf(ctx, p, lx, ly, s, rot, dir, flutter);
  });
}

/** A small white-pink 5-petal buckwheat floret at (fx,fy), scaled by amt. */
function floret(
  ctx: CanvasRenderingContext2D,
  p: P,
  fx: number,
  fy: number,
  amt: number,
  twinkle: number,
): void {
  const petalR = 1.5 * (0.5 + 0.5 * amt);
  const ringR = 1.7 * (0.55 + 0.45 * amt);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const px = fx + Math.cos(a) * ringR;
    const py = fy + Math.sin(a) * ringR;
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
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(fx - 0.6, fy - 0.8, 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** A dark triangular buckwheat seed pointing down at (sx,sy), scaled by amt. */
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
  ctx.strokeStyle = rgb(p.outline, 0.85);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(sx, sy + s);
  ctx.lineTo(sx - s * 0.9, sy - s * 0.7);
  ctx.lineTo(sx + s * 0.9, sy - s * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // tiny lit facet upper-left
  ctx.fillStyle = rgb(lerpRGB(p.seed, [255, 255, 255], 0.35), 0.8);
  ctx.beginPath();
  ctx.moveTo(sx - s * 0.2, sy - s * 0.5);
  ctx.lineTo(sx - s * 0.55, sy - s * 0.55);
  ctx.lineTo(sx - s * 0.25, sy);
  ctx.closePath();
  ctx.fill();
}

/** The cluster at each node: buds (spring) + florets (bloom) + seeds (autumn),
 *  each scaled by its amount. The node POSITIONS are constant every season. */
function clusters(
  ctx: CanvasRenderingContext2D,
  p: P,
  twinkles: [number, number, number],
): void {
  // each node carries a tiny 3-floret/seed/bud spray; offsets are constant.
  const spray: Array<[number, number]> = [
    [0, 0],
    [-2.2, 1.4],
    [2.2, 1.4],
  ];

  NODES.forEach(([nx, ny], ni) => {
    // pale buds first (spring) — tiny knobs that sit under any bloom.
    if (p.budAmt > 0.02) {
      ctx.save();
      ctx.globalAlpha = p.budAmt;
      ctx.fillStyle = rgb(lerpRGB(p.petal, p.stemLight, 0.35));
      spray.forEach(([ox, oy]) => {
        ctx.beginPath();
        ctx.arc(nx + ox, ny + oy, 1.05, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
    // triangular seeds (autumn) — drawn beneath florets so a tiny flowerAmt in
    // autumn still reads as "gone to seed".
    if (p.seedAmt > 0.03) {
      ctx.save();
      ctx.globalAlpha = clamp01(p.seedAmt);
      spray.forEach(([ox, oy]) => {
        seedTri(ctx, p, nx + ox, ny + oy + 0.4, 1.9 * (0.55 + 0.45 * p.seedAmt));
      });
      ctx.restore();
    }
    // open florets (summer peak; small in spring/autumn).
    if (p.flowerAmt > 0.03) {
      ctx.save();
      ctx.globalAlpha = clamp01(p.flowerAmt + 0.15);
      spray.forEach(([ox, oy]) => {
        floret(ctx, p, nx + ox, ny + oy, p.flowerAmt, twinkles[ni]);
      });
      ctx.restore();
    }
  });
}

/** Frost dusting + small snow caps on the sprig's upward surfaces (winter). */
function frostAndSnow(ctx: CanvasRenderingContext2D, p: P): void {
  // small snow caps sitting on each cluster node + the top of the stem.
  if (p.snowCapAmt > 0.01) {
    ctx.save();
    ctx.globalAlpha = p.snowCapAmt;
    const cap = ctx.createLinearGradient(0, -22, 0, -8);
    cap.addColorStop(0, "#ffffff");
    cap.addColorStop(1, "#dbe6f2");
    ctx.fillStyle = cap;
    NODES.forEach(([nx, ny]) => {
      ctx.beginPath();
      ctx.ellipse(nx, ny - 1.4, 3.2, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    // a little cap on each leaf top
    LEAVES.forEach(([lx, ly]) => {
      ctx.beginPath();
      ctx.ellipse(lx, ly - 2.2, 2.2, 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
  // frost dusting — fine pale specks on the upper-left (lit) surfaces.
  if (p.frostAmt > 0.01) {
    ctx.save();
    ctx.globalAlpha = 0.7 * p.frostAmt;
    ctx.fillStyle = "#eaf3ff";
    const specks: Array<[number, number]> = [
      [-9.5, -12], [10, -15], [-1, -20], [-5.5, 2], [6, -2.5],
      [-3.5, -8.5], [2, -6], [-7, -5],
    ];
    specks.forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
}

/** Subtle sheen/dew highlight on a couple of upward surfaces, never a bloom. */
function sheen(ctx: CanvasRenderingContext2D, p: P): void {
  if (p.gloss < 0.02) return;
  ctx.save();
  ctx.globalAlpha = 0.5 * p.gloss;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  // a tiny soft sheen on the main stem's upper-left and the right leaf.
  ctx.beginPath();
  ctx.ellipse(-2.2, -10, 0.7, 2.2, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(5.2, -1.4, 0.6, 1.4, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── The single parameterized paint ──────────────────────────────────────────
// Draws the WHOLE tile from p + a vertical idle offset `bob` (design px;
// bob=0 = rest pose). Optional micro-dressing args are additive and tiny.

interface Micro {
  leafFlutter?: number; // heart-leaf flutter
  stemSway?: number; // sprig-tip sway
  florTwinkA?: number; // pollen glint twinkle, node A (summer)
  florTwinkB?: number; // node B
  florTwinkC?: number; // node C
  extraFlakes?: Array<[number, number, number]>; // drifting snowflakes (winter)
  dew?: number; // 0..1 dew shimmer pulse (spring)
  coldSheen?: number; // 0..1 faint cold sheen pulse (winter)
}

function paint(
  ctx: CanvasRenderingContext2D,
  pRaw: P,
  bob: number,
  micro?: Micro,
): void {
  const p = clampP(pRaw);
  const m = micro ?? {};

  // Pad + ground dressing are drawn at rest (do not bob with the subject).
  contactShadow(ctx, p);
  pad(ctx, p);
  blossom(ctx, p);
  fallenLeaves(ctx, p);

  // Subject bobs as a whole.
  ctx.save();
  ctx.translate(0, bob);

  const sway = m.stemSway ?? 0;
  stems(ctx, p, sway);
  leaves(ctx, p, m.leafFlutter ?? 0);
  clusters(ctx, p, [
    m.florTwinkA ?? 0,
    m.florTwinkB ?? 0,
    m.florTwinkC ?? 0,
  ]);
  sheen(ctx, p);
  frostAndSnow(ctx, p);

  // faint cold sheen pulse (winter), additive, tiny — over upward surfaces.
  if (m.coldSheen !== undefined && m.coldSheen > 0.01) {
    ctx.save();
    ctx.globalAlpha = 0.1 * m.coldSheen;
    ctx.fillStyle = "#cfe6ff";
    NODES.forEach(([nx, ny]) => {
      ctx.beginPath();
      ctx.arc(nx, ny, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // dew shimmer (spring), additive, a tiny pulsing droplet glint.
  if (m.dew !== undefined && m.dew > 0.01) {
    ctx.save();
    ctx.globalAlpha = m.dew;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(-3, -7, 0.9 + 0.5 * m.dew, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7, -2, 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore(); // end subject bob

  // drifting snowflakes (winter), additive, in tile space (not bobbed).
  if (m.extraFlakes) {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    m.extraFlakes.forEach(([fx, fy, r]) => {
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  ctx.globalAlpha = 1;
}

// ── Idle bob: seamless, zero at t=0 with zero velocity ──────────────────────
// A*(1-cos(w t))*0.5 : value 0 and derivative 0 at t=0, seamless loop period 2π/w.

function bobAt(t: number): number {
  const A = 1.4; // peak rise in design px
  const w = 1.5; // rad/s
  return -A * (1 - Math.cos(w * t)) * 0.5; // negative = rises upward
}

// ── Per-season draw + anim ──────────────────────────────────────────────────

function drawBuckwheatSpring(ctx: CanvasRenderingContext2D): void {
  paint(ctx, SP.Spring, 0);
}
function drawBuckwheatSummer(ctx: CanvasRenderingContext2D): void {
  paint(ctx, SP.Summer, 0);
}
function drawBuckwheatAutumn(ctx: CanvasRenderingContext2D): void {
  paint(ctx, SP.Autumn, 0);
}
function drawBuckwheatWinter(ctx: CanvasRenderingContext2D): void {
  paint(ctx, SP.Winter, 0);
}

function animBuckwheatSpring(ctx: CanvasRenderingContext2D, t: number): void {
  // faint dew shimmer + gentle leaf flutter; subject bob is zero at t=0.
  const dew = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.8));
  paint(ctx, SP.Spring, bobAt(t), {
    stemSway: Math.sin(t * 1.3) * 0.8,
    leafFlutter: Math.sin(t * 1.6) * 0.9,
    dew,
  });
}

function animBuckwheatSummer(ctx: CanvasRenderingContext2D, t: number): void {
  // soft pollen glint twinkles staggered across the three flower nodes.
  const tw = (ph: number): number => 0.2 + 0.5 * Math.max(0, Math.sin(t * 2.4 + ph));
  paint(ctx, SP.Summer, bobAt(t), {
    stemSway: Math.sin(t * 1.3) * 1,
    leafFlutter: Math.sin(t * 1.7) * 0.8,
    florTwinkA: tw(0),
    florTwinkB: tw(2.1),
    florTwinkC: tw(4.2),
  });
}

function animBuckwheatAutumn(ctx: CanvasRenderingContext2D, t: number): void {
  // leaves and the seed clusters flutter; seamless via sin.
  const leafFlutter = Math.sin(t * 2.2) * 1.3;
  paint(ctx, SP.Autumn, bobAt(t), {
    leafFlutter,
    stemSway: Math.sin(t * 1.1) * 0.8,
  });
}

function animBuckwheatWinter(ctx: CanvasRenderingContext2D, t: number): void {
  // a couple of drifting snowflakes + faint cold sheen.
  const seeds: Array<[number, number, number]> = [
    [-7, 1.1, 0.0],
    [8, 0.9, 0.5],
  ];
  const span = 36;
  const flakes: Array<[number, number, number]> = seeds.map(([fx, r, phase]) => {
    const prog = (((t / 3.6 + phase) % 1) + 1) % 1;
    const fy = -22 + prog * span;
    const driftX = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
    return [driftX, fy, r];
  });
  const coldSheen = 0.5 + 0.5 * Math.sin(t * 0.8);
  paint(ctx, SP.Winter, bobAt(t), {
    stemSway: Math.sin(t * 0.9) * 0.5,
    extraFlakes: flakes,
    coldSheen,
  });
}

// ── Transitions: lerp every field through a smoothstep ──────────────────────
// transition(ctx,0) === draw(from); transition(ctx,1) === draw(to). No snap.

function makeTransition(from: SeasonName, to: SeasonName) {
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const t = smoother(clamp01(pp));
    paint(ctx, lerpP(SP[from], SP[to], t), 0);
  };
}

const springToSummer = makeTransition("Spring", "Summer");
const summerToAutumn = makeTransition("Summer", "Autumn");
const autumnToWinter = makeTransition("Autumn", "Winter");

// ── Exports ─────────────────────────────────────────────────────────────────

export const VARIANTS: SeasonalTileEntry = {
  Spring: { draw: drawBuckwheatSpring, anim: animBuckwheatSpring },
  Summer: { draw: drawBuckwheatSummer, anim: animBuckwheatSummer },
  Autumn: { draw: drawBuckwheatAutumn, anim: animBuckwheatAutumn },
  Winter: { draw: drawBuckwheatWinter, anim: animBuckwheatWinter },
};

export const TRANSITIONS: SeasonalTransitionSet = {
  0: springToSummer,
  1: summerToAutumn,
  2: autumnToWinter,
};
