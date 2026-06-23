// Production seasonal art for the CLOVER grass tile (engine key `tile_bird_clover`).
//
// Source/grep token: grass/clover
//
// A clump of trefoil (three-leaf) clover — each leaf is three rounded
// heart-shaped leaflets with a pale chevron mark — plus a few round white-pink
// clover flower puffs on short stems, sitting on a low grassy pad. The SAME
// clover silhouette is drawn every season (identity-safe): the trefoil leaves +
// round flower puffs read in every season. The seasons swing HARD on colour
// plus a real seasonal prop (pad blossom / fallen leaf / frost + snow blanket +
// snow caps), and the idle is lively rather than subtle:
//
//   IDLE COMMON  (~6s, win ~0.95s): a SOFT SWAY/NOD — the whole clump bobs and
//       leans ~10–14 design-px in a gentle breeze, pivoting at the base, with a
//       small base squash. Zero velocity at the window edges (seamless).
//   IDLE SPECIAL (~18s, win ~1.2s, phase +3s): a VISITING BEE dips down to the
//       centre flower puff and leaves — flying in from off-screen, hovering at
//       the bloom, then flying back out. Off-screen / zero at the window edges
//       (seamless), so it never collides with the common sway.
//
// The architecture is a single parameterized `paint(ctx, p, pose)` where
// `interface P` holds tweenable season params (colours + prop amounts) and
// `pose` holds the idle gesture (bob / lean / squash + the bee's flight). Every
// season is the same paint with tweened P, so transitions are seamless:
//   transition(0) ≡ draw(from), transition(1) ≡ draw(to).
// REST pose has all zeros, so draw(season) = paint(ctx, SP[season], REST) and the
// idle's pose is 0 at every action-window edge → seamless loop (draw ≡ anim(0)).
//
// Palette lock: a green trefoil clover clump with round white-pink puff blooms.
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
  leafLight: RGB;        // lit upper face of the clover leaflets
  leafMid: RGB;          // body tone of the leaflets
  leafDark: RGB;         // shadowed underside / mound base
  chevron: RGB;          // pale chevron mark on each leaflet
  stem: RGB;             // short blossom stems
  bloomPetal: RGB;       // puff blossom petals (white-pink)
  bloomCore: RGB;        // puff blossom centre
  padGrass: RGB;         // top of the grass pad
  padDark: RGB;          // shaded pad underside
  soil: RGB;             // contact / base soil under the clump
  outline: RGB;          // soft dark outline tint
  light: RGB;            // ambient light tint laid over the whole tile
  lightAmt: number;      // 0..1 strength of the ambient light wash
  gloss: number;         // 0..1 specular gloss-sheen strength on the leaves
  edgeBrown: number;     // 0..1 browning at the leaflet edges (autumn)
  frostAmt: number;      // 0..1 cool frost dusting on the leaves (winter)
  snowCapAmt: number;    // 0..1 snow caps on the upward leaves (winter)
  padSnowAmt: number;    // 0..1 snow blanket on the pad / base (winter)
  bloomAmt: number;      // 0..1 how many / how open the puff blossoms are
  blossomAmt: number;    // 0..1 tiny pad blossoms resting on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen clover leaf on the pad (autumn)
}

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number;     // vertical offset in design px (negative = up)
  lean: number;    // top-of-clump sway, radians (rock side to side)
  squashX: number; // additive horizontal scale (+0.18 = 18% wider)
  squashY: number; // additive vertical scale (+0.18 = 18% taller)
  bee: number;     // 0..1 visiting-bee flight progress (0 = bee off-screen)
}

const REST: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0, bee: 0 };

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
    leafLight: lerpRGB(a.leafLight, b.leafLight, t),
    leafMid: lerpRGB(a.leafMid, b.leafMid, t),
    leafDark: lerpRGB(a.leafDark, b.leafDark, t),
    chevron: lerpRGB(a.chevron, b.chevron, t),
    stem: lerpRGB(a.stem, b.stem, t),
    bloomPetal: lerpRGB(a.bloomPetal, b.bloomPetal, t),
    bloomCore: lerpRGB(a.bloomCore, b.bloomCore, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    gloss: lerp(a.gloss, b.gloss, t),
    edgeBrown: lerp(a.edgeBrown, b.edgeBrown, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    bloomAmt: lerp(a.bloomAmt, b.bloomAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
  };
}

function clampP(p: P): P {
  return {
    ...p,
    lightAmt: clamp01(p.lightAmt),
    gloss: clamp01(p.gloss),
    edgeBrown: clamp01(p.edgeBrown),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    bloomAmt: clamp01(p.bloomAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

function safeNum(x: number): number {
  return Number.isFinite(x) ? x : 0;
}

// ── Per-season params — pushed HARD ──────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — fresh bright-green trefoils + first white-pink puffs opening;
  // dewy lime pad, cool-bright light, pad blossoms resting on the turf.
  Spring: {
    leafLight: [156, 226, 100],
    leafMid: [96, 190, 66],
    leafDark: [50, 126, 48],
    chevron: [212, 246, 174],
    stem: [110, 174, 62],
    bloomPetal: [255, 248, 252],
    bloomCore: [255, 220, 234],
    padGrass: [132, 214, 88],
    padDark: [72, 146, 60],
    soil: [120, 84, 48],
    outline: [36, 70, 30],
    light: [230, 248, 222],
    lightAmt: 0.18,
    gloss: 0.4,
    edgeBrown: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    bloomAmt: 0.7,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — LUSH peak: deep saturated green trefoils, abundant open flower
  // puffs, high gloss, warm bright light.
  Summer: {
    leafLight: [128, 214, 78],
    leafMid: [60, 166, 52],
    leafDark: [28, 102, 36],
    chevron: [190, 236, 152],
    stem: [80, 158, 50],
    bloomPetal: [255, 252, 254],
    bloomCore: [255, 200, 222],
    padGrass: [84, 176, 70],
    padDark: [42, 116, 50],
    soil: [126, 86, 48],
    outline: [22, 72, 30],
    light: [255, 244, 206],
    lightAmt: 0.2,
    gloss: 1.0,
    edgeBrown: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    bloomAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — clover going tan/bronze, flower puffs turned to brown seed-puffs;
  // olive-amber pad with a fallen leaf, dulled gloss, low amber light.
  Autumn: {
    leafLight: [196, 168, 86],
    leafMid: [148, 118, 54],
    leafDark: [92, 72, 38],
    chevron: [216, 196, 130],
    stem: [136, 116, 54],
    bloomPetal: [198, 168, 122],
    bloomCore: [150, 112, 64],
    padGrass: [162, 150, 84],
    padDark: [108, 92, 50],
    soil: [120, 78, 42],
    outline: [60, 48, 24],
    light: [250, 200, 138],
    lightAmt: 0.24,
    gloss: 0.3,
    edgeBrown: 0.9,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    bloomAmt: 0.5,
    blossomAmt: 0,
    fallenLeafAmt: 0.9,
  },
  // Winter — snow-dusted clover: bold snow blanket over the base + snow caps on
  // the leaves, frost, cool blue-grey light; green-grey trefoils still poke
  // through. Clearly snowy, still reads as clover.
  Winter: {
    leafLight: [128, 162, 130],
    leafMid: [86, 122, 96],
    leafDark: [52, 84, 68],
    chevron: [196, 214, 204],
    stem: [108, 126, 104],
    bloomPetal: [226, 234, 242],
    bloomCore: [198, 210, 222],
    padGrass: [182, 202, 220],
    padDark: [120, 148, 176],
    soil: [132, 114, 100],
    outline: [50, 58, 60],
    light: [202, 226, 255],
    lightAmt: 0.34,
    gloss: 0.26,
    edgeBrown: 0.2,
    frostAmt: 0.78,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    bloomAmt: 0.32,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Clump geometry — the SAME silhouette every season ─────────────────────────
// A low rounded clump of clover sitting on the pad. Origin-centered. The pose
// (lean/squash/bob) transforms the whole clump about a pivot near the base so
// the leaves and puffs sway together. The OUTLINE shape is constant so
// transitions never snap the silhouette.

const CLUMP_BASE_Y = 15.5;   // where the clump contacts the pad
const CLUMP_HALF = 16.5;     // half-width of the clump
const CLUMP_TOP_Y = -7;      // crown of the dome
const CLUMP_PIVOT_Y = CLUMP_BASE_Y - 1; // rock/lean about a point near the base

/** Trace the rounded clump dome path (origin-local, unposed). */
function clumpPath(ctx: CanvasRenderingContext2D): void {
  const top = CLUMP_TOP_Y;
  const base = CLUMP_BASE_Y;
  const h = CLUMP_HALF;
  ctx.beginPath();
  ctx.moveTo(-h, base);
  ctx.quadraticCurveTo(-h, top + 3, -h * 0.5, top + 0.5);
  ctx.quadraticCurveTo(0, top - 2.5, h * 0.5, top + 0.5);
  ctx.quadraticCurveTo(h, top + 3, h, base);
  ctx.quadraticCurveTo(h * 0.5, base + 3, 0, base + 2.6);
  ctx.quadraticCurveTo(-h * 0.5, base + 3, -h, base);
  ctx.closePath();
}

// Trefoil leaf placements across the clump surface: [cx, cy, scale, rot, lucky].
// Constant layout every season; colour/dressing varies via P. `lucky` adds a
// fourth leaflet on one charming leaf (the lucky four-leaf clover).
const LEAVES: Array<[number, number, number, number, number]> = [
  [-11, 11, 0.95, -0.35, 0],
  [-6, 3, 1.05, -0.15, 0],
  [0, -0.5, 1.1, 0.0, 0],
  [6, 3, 1.05, 0.15, 1], // the lucky four-leaf clover
  [11, 11, 0.95, 0.35, 0],
  [-9, 16, 0.8, -0.5, 0],
  [9, 16, 0.8, 0.5, 0],
  [0, 12, 0.9, 0.0, 0],
];

// Round flower-puff placements on short stems: [baseX, baseY, topX, topY].
const BLOOMS: Array<[number, number, number, number]> = [
  [-7, 4, -8.5, -11],
  [4, 1, 6, -13.5],
  [10, 9, 12.5, -4],
];

// The centre puff the visiting bee dips to (matches BLOOMS[1] crown).
const BEE_TARGET_X = 6;
const BEE_TARGET_Y = -13.5;

// Pad blossom (spring) spots resting ON the pad.
const PAD_BLOSSOMS: Array<[number, number]> = [[-13, 19], [12, 18.4], [-3, 21]];

/** Draw one trefoil clover leaf (three rounded heart-shaped leaflets with a
 *  pale chevron — plus an optional fourth lucky leaflet). Origin at the leaf
 *  centre; caller has translated/rotated. */
function trefoil(ctx: CanvasRenderingContext2D, p: P, s: number, lucky = 0): void {
  // three leaflets at ~120° apart, fanning slightly upward; lucky adds a fourth.
  const base = [-Math.PI / 2 - 0.7, -Math.PI / 2 + 0.7, Math.PI / 2 + 0.05];
  const angles = lucky > 0.5 ? [...base, Math.PI / 2 - 0.85] : base;
  angles.forEach((ang, idx) => {
    const dist = 2.6 * s;
    const lx = Math.cos(ang) * dist;
    const ly = Math.sin(ang) * dist;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(ang + Math.PI / 2);
    // heart-shaped leaflet: two lobes with a small notch at the outer tip
    const w = 2.6 * s;
    const hgt = 3.2 * s;
    ctx.beginPath();
    ctx.moveTo(0, hgt * 0.55); // stem end (toward centre)
    ctx.quadraticCurveTo(-w, hgt * 0.1, -w * 0.85, -hgt * 0.7);
    ctx.quadraticCurveTo(-w * 0.4, -hgt, 0, -hgt * 0.55); // notch dip
    ctx.quadraticCurveTo(w * 0.4, -hgt, w * 0.85, -hgt * 0.7);
    ctx.quadraticCurveTo(w, hgt * 0.1, 0, hgt * 0.55);
    ctx.closePath();
    // leaflet body
    ctx.fillStyle = rgb(p.leafMid);
    ctx.fill();
    // browning at the edges (autumn) — a warm rim drawn just inside the edge
    if (p.edgeBrown > 0.02) {
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = rgba([150, 110, 50], 0.6 * p.edgeBrown);
      ctx.lineWidth = 1.4 * s;
      ctx.beginPath();
      ctx.moveTo(0, hgt * 0.55);
      ctx.quadraticCurveTo(-w, hgt * 0.1, -w * 0.85, -hgt * 0.7);
      ctx.quadraticCurveTo(-w * 0.4, -hgt, 0, -hgt * 0.55);
      ctx.quadraticCurveTo(w * 0.4, -hgt, w * 0.85, -hgt * 0.7);
      ctx.quadraticCurveTo(w, hgt * 0.1, 0, hgt * 0.55);
      ctx.stroke();
      ctx.restore();
    }
    // lit upper-left lobe
    ctx.fillStyle = rgba(p.leafLight, 0.85);
    ctx.beginPath();
    ctx.ellipse(-w * 0.25, -hgt * 0.3, w * 0.5, hgt * 0.42, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // glossy sheen highlight (summer peak reads wet & lush)
    if (p.gloss > 0.04) {
      ctx.fillStyle = rgba([255, 255, 255], 0.18 + 0.34 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(-w * 0.32, -hgt * 0.42, w * 0.26, hgt * 0.22, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    // pale chevron mark (the classic clover band) — a soft V across the leaflet
    ctx.strokeStyle = rgba(p.chevron, 0.85 * (idx >= 2 ? 0.85 : 1));
    ctx.lineWidth = 0.9 * s;
    ctx.beginPath();
    ctx.moveTo(-w * 0.5, hgt * 0.05);
    ctx.lineTo(0, -hgt * 0.18);
    ctx.lineTo(w * 0.5, hgt * 0.05);
    ctx.stroke();
    // crisp outline
    ctx.strokeStyle = rgba(p.outline, 0.7);
    ctx.lineWidth = 0.7 * s;
    ctx.beginPath();
    ctx.moveTo(0, hgt * 0.55);
    ctx.quadraticCurveTo(-w, hgt * 0.1, -w * 0.85, -hgt * 0.7);
    ctx.quadraticCurveTo(-w * 0.4, -hgt, 0, -hgt * 0.55);
    ctx.quadraticCurveTo(w * 0.4, -hgt, w * 0.85, -hgt * 0.7);
    ctx.quadraticCurveTo(w, hgt * 0.1, 0, hgt * 0.55);
    ctx.stroke();
    ctx.restore();
  });
}

/** Draw one round flower puff on its short stem. `open` 0..1 scales the puff. */
function puffBloom(
  ctx: CanvasRenderingContext2D,
  p: P,
  baseX: number,
  baseY: number,
  topX: number,
  topY: number,
  open: number,
  sway: number,
): void {
  const o = clamp01(open);
  if (o < 0.03) return;
  const tx = topX + sway;
  // short stem
  ctx.strokeStyle = rgb(p.stem);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo((baseX + tx) / 2 + sway * 0.4, (baseY + topY) / 2, tx, topY + 1.5);
  ctx.stroke();
  // round pom: a cluster of small petal florets forming a ball
  const r = 3.4 * (0.55 + 0.45 * o);
  // soft outline halo
  ctx.fillStyle = rgba(p.outline, 0.45);
  ctx.beginPath();
  ctx.arc(tx, topY, r + 0.8, 0, Math.PI * 2);
  ctx.fill();
  // petal florets around the rim (white-pink)
  const n = 9;
  for (let k = 0; k < n; k++) {
    const ang = (k / n) * Math.PI * 2 + 0.2;
    const px = tx + Math.cos(ang) * r * 0.78;
    const py = topY + Math.sin(ang) * r * 0.78;
    ctx.fillStyle = rgb(k % 2 === 0 ? p.bloomPetal : p.bloomCore);
    ctx.beginPath();
    ctx.ellipse(px, py, r * 0.42, r * 0.3, ang, 0, Math.PI * 2);
    ctx.fill();
  }
  // bright core + highlight
  ctx.fillStyle = rgb(p.bloomCore);
  ctx.beginPath();
  ctx.arc(tx, topY, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([255, 255, 255], 0.5 * o);
  ctx.beginPath();
  ctx.arc(tx - r * 0.3, topY - r * 0.3, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw the visiting bee at the given centre, scaled by `s`, wings flapping by
 *  phase `flap`. Origin-centered; caller translates. */
function drawBee(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, flap: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  // wings (translucent, flapping open/closed)
  const wing = 0.55 + 0.45 * Math.abs(Math.sin(flap));
  ctx.fillStyle = "rgba(232,244,255,0.7)";
  ctx.beginPath();
  ctx.ellipse(-1.2, -2.6, 1.8, 1.0 * wing, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(1.2, -2.6, 1.8, 1.0 * wing, 0.5, 0, Math.PI * 2);
  ctx.fill();
  // body — amber with dark bands
  ctx.fillStyle = "rgb(240,190,60)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.6, 1.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgb(44,32,18)";
  ctx.lineWidth = 0.8;
  [-0.9, 0.1, 1.1].forEach((bx) => {
    ctx.beginPath();
    ctx.moveTo(bx, -1.7);
    ctx.lineTo(bx, 1.7);
    ctx.stroke();
  });
  // head + outline
  ctx.fillStyle = "rgb(40,30,16)";
  ctx.beginPath();
  ctx.arc(2.6, -0.2, 1.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(40,30,16,0.9)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.6, 1.9, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
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
    bee: clamp01(safeNum(rawPose.bee)),
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

    // tufted top edge — little blades around the upper rim
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

    // pad snow blanket / drift over the base (winter) — bold and clearly snowy
    if (p.padSnowAmt > 0.01) {
      ctx.fillStyle = rgba([244, 250, 255], 0.92 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(0, 18.4, 17.4 * (0.6 + 0.4 * p.padSnowAmt), 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      // a heaped drift banked against the clump base
      ctx.fillStyle = rgba([255, 255, 255], 0.85 * p.padSnowAmt);
      ctx.beginPath();
      ctx.moveTo(-15, 18);
      ctx.quadraticCurveTo(-6, 11.5, 0, 12.5);
      ctx.quadraticCurveTo(7, 11.5, 15, 18);
      ctx.quadraticCurveTo(8, 20.6, 0, 20.4);
      ctx.quadraticCurveTo(-8, 20.6, -15, 18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([210, 226, 244], 0.5 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(2, 20, 16, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // sparkle on the snow
      ctx.fillStyle = rgba([255, 255, 255], 0.85 * p.padSnowAmt);
      ([[-9, 17.6], [5, 19], [11, 17.4], [-3, 20], [0, 14]] as Array<[number, number]>).forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // tiny pad blossoms (spring)
    if (p.blossomAmt > 0.01) {
      const a = p.blossomAmt;
      PAD_BLOSSOMS.forEach(([bx, by], idx) => {
        ctx.fillStyle = rgba(idx === 1 ? [255, 232, 246] : [255, 250, 252], 0.95 * a);
        for (let k = 0; k < 5; k++) {
          const ang = (k / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(bx + Math.cos(ang) * 1.5, by + Math.sin(ang) * 1.0, 1.1, 0.8, ang, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = rgba([255, 214, 90], a);
        ctx.beginPath();
        ctx.arc(bx, by, 0.9, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // fallen clover leaf on the pad (autumn)
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const fallen: Array<[number, number, number, RGB]> = [
        [-12, 19.6, -0.5, [168, 134, 64]],
        [12, 18.6, 0.7, [148, 96, 44]],
      ];
      fallen.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.scale(0.7, 0.7);
        ctx.globalAlpha = a;
        trefoil(ctx, { ...p, leafMid: col, leafLight: col, edgeBrown: 1 }, 0.85);
        ctx.restore();
      });
      ctx.globalAlpha = 1;
    }

    // ── Contact shadow under the clump (follows the bob/lean for grounding) ───
    const tipShift = pose.lean * (CLUMP_PIVOT_Y - CLUMP_TOP_Y); // how far the crown leans
    const shadowSpread = 1 + clamp01(pose.bob < 0 ? -pose.bob / 14 : 0) * 0.5;
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0 + tipShift * 0.18, CLUMP_BASE_Y + 2.5, 12 * shadowSpread, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.28 / shadowSpread);
    ctx.beginPath();
    ctx.ellipse(2.5 + tipShift * 0.2, CLUMP_BASE_Y + 3, 14 * shadowSpread, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the clover clump, under the idle pose transform ─────────────
    ctx.save();
    // Pivot near the base so lean rocks the crown side-to-side and squash anchors
    // at the base (it "sits" on the pad). bob raises the whole clump.
    ctx.translate(0, CLUMP_PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(0, -CLUMP_PIVOT_Y);

    // 1) soft dark outline pass — the dome drawn as the outline tint first
    clumpPath(ctx);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // 2) clump body, clipped so the outline reads as a rim
    ctx.save();
    clumpPath(ctx);
    ctx.clip();

    const top = CLUMP_TOP_Y;
    const base = CLUMP_BASE_Y;

    // base dark fill for depth
    ctx.fillStyle = rgb(p.leafDark);
    ctx.fillRect(-CLUMP_HALF - 2, top - 6, (CLUMP_HALF + 2) * 2, base - top + 12);
    // lit dome gradient (upper-left light)
    const dome = ctx.createRadialGradient(-6, top + 2, 2, -2, lerp(top, base, 0.4), 24);
    dome.addColorStop(0, rgb(p.leafLight));
    dome.addColorStop(0.5, rgb(p.leafMid));
    dome.addColorStop(1, rgb(p.leafDark));
    ctx.fillStyle = dome;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.ellipse(0, lerp(top, base, 0.45), CLUMP_HALF + 1, (base - top) * 0.7 + 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // trefoil clover leaves carpeting the clump surface (constant layout)
    LEAVES.forEach(([cx, cy, sc, rot, lucky]) => {
      ctx.save();
      ctx.translate(cx, top + cy + 0.5);
      ctx.rotate(rot);
      trefoil(ctx, p, sc, lucky);
      ctx.restore();
    });

    // frost dusting (winter) — cool blue speckle over the upper leaves
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.22 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(0, lerp(top, base, 0.35), CLUMP_HALF, (base - top) * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-10, top + 4], [-4, top + 2], [3, top + 3], [9, top + 5],
        [-7, lerp(top, base, 0.4)], [6, lerp(top, base, 0.45)], [0, lerp(top, base, 0.3)],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end clump clip

    // 3) snow caps on the upward leaves (winter) — bold soft caps over the crown
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.92 * a);
      ctx.beginPath();
      ctx.moveTo(-CLUMP_HALF * 0.72, top + 4);
      ctx.quadraticCurveTo(-6, top - 3, 0, top - 2);
      ctx.quadraticCurveTo(6, top - 3, CLUMP_HALF * 0.72, top + 4);
      ctx.quadraticCurveTo(CLUMP_HALF * 0.4, top + 6.5, 0, top + 5);
      ctx.quadraticCurveTo(-CLUMP_HALF * 0.4, top + 6.5, -CLUMP_HALF * 0.72, top + 4);
      ctx.closePath();
      ctx.fill();
      // a few soft snow caps settled on individual leaves
      ctx.fillStyle = rgba([235, 244, 255], 0.75 * a);
      ([[-8, top + 6], [5, top + 7], [-2, top + 9], [10, top + 8]] as Array<[number, number]>).forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.ellipse(sx, sy, 2.4, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // ── Round flower puffs poking up on short stems (drawn over the clump) ────
    BLOOMS.forEach(([bx, by, tx, ty], i) => {
      const open = p.bloomAmt * (i === 2 ? 0.85 : 1);
      puffBloom(ctx, p, bx, by, tx, ty, open, 0);
    });

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

    // ── Visiting bee (idle special) — drawn last, OVER everything, follows the
    //    clump lean so it reads as visiting the swaying centre puff ───────────
    if (pose.bee > 0.001) {
      const b = clamp01(pose.bee);
      // Flight arc: fly in from upper-right off-screen → hover at the centre
      // puff (crown, transformed by the clump lean) → fly back out. A sin
      // envelope keeps the bee fully off-screen (zero contribution) at b→0.
      const env = Math.sin(Math.PI * b); // 0 at edges, 1 mid-window
      const startX = 30;
      const startY = -26;
      // target = the centre puff crown, moved with the clump pose lean/bob
      const leanShift = pose.lean * (CLUMP_PIVOT_Y - BEE_TARGET_Y);
      const targetX = BEE_TARGET_X + leanShift;
      const targetY = BEE_TARGET_Y + pose.bob - 4; // hover just above the puff
      const bx = lerp(startX, targetX, env);
      const by = lerp(startY, targetY, env) + Math.sin(b * Math.PI * 3) * 1.4; // bob in flight
      const sc = 0.7 + 0.3 * env;
      drawBee(ctx, bx, by, sc, b * 26);
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
// sin^2(pi q) → smooth in/out, peak at q=0.5.
function hump(q: number): number {
  const s = Math.sin(Math.PI * q);
  return s * s;
}

// An asymmetric anticipation→peak→settle curve, 0 at q=0 and q=1.
// (1-cos) envelope keeps velocity zero at q=0,1; used as a faint windup tilt.
function anticipate(q: number): number {
  const env = 0.5 * (1 - Math.cos(2 * Math.PI * q)); // 0..1..0, velocity 0 at edges
  const tilt = Math.sin(Math.PI * q) * Math.sin(1.5 * Math.PI * q);
  return env * (0.55 * Math.sin(2 * Math.PI * q) + 0.9 * tilt);
}

/** Build the idle pose from the wall clock. Two tiers:
 *   common SWAY/NOD every ~6s (win 0.95s), rare BEE VISIT every ~18s (win 1.2s). */
function poseFromClock(t: number): Pose {
  const pose: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0, bee: 0 };

  // ── COMMON: soft sway / nod (~6s, win 0.95s) ──
  // Two gentle rocks left→right→left, ~0.18 rad lean → crown travels ~ arm*0.18.
  // Crown arm ≈ (CLUMP_PIVOT_Y - CLUMP_TOP_Y) ≈ 21.5 px → ~10–14 px sway.
  const qC = actionQ(t, 6.0, 0.95, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC); // 0..1..0, zero at edges
    const rock = Math.sin(qC * Math.PI * 3); // 1.5 rocks within the window
    pose.lean += 0.18 * env * rock;
    // a small base squash as it settles weight side to side (a breeze nod)
    pose.squashY += -0.05 * hump(qC);
    pose.squashX += 0.045 * hump(qC);
    pose.bob += -1.4 * hump(qC); // a gentle lift on the nod
    // a faint windup tilt (still 0 at edges) for life
    pose.lean += 0.02 * anticipate(qC);
  }

  // ── RARE SPECIAL: a visiting bee dips to the centre flower puff (~18s,
  //    win 1.2s, phase +3s so it never collides with the sway) ──
  const qS = actionQ(t, 18.0, 1.2, 3.0);
  if (qS >= 0) {
    // bee flight is driven entirely by pose.bee (0 at edges → bee off-screen).
    pose.bee = hump(qS);
    // the clump gives a tiny welcoming nod while the bee hovers
    pose.bob += -1.0 * hump(qS);
    pose.lean += 0.03 * Math.sin(qS * Math.PI * 2) * Math.sin(Math.PI * qS);
  }

  return pose;
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
    // own colour/brightness). Kept tiny so the POSE actions are the star.
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
        // a couple of drifting petals
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
        // one slow tumbling browning leaf
        const prog = ((tt / 5.0) % 1 + 1) % 1;
        const px = 11 - prog * 6 + Math.sin(prog * Math.PI * 3) * 2;
        const py = -16 + prog * 32;
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(prog * Math.PI);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(prog * Math.PI * 4);
        ctx.scale(0.55, 0.55);
        trefoil(ctx, { ...SP.Autumn, leafMid: [158, 116, 52], leafLight: [188, 150, 80], edgeBrown: 1 }, 0.85);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      // Summer: no extra dressing — the lush gloss + bee visit are the show.
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
