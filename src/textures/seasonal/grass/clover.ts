// Production seasonal art for the CLOVER grass tile (engine key `tile_bird_clover`).
//
// Source/grep token: grass/clover
//
// A small PATCH OF CLOVER: several slender stems rise from the pad centre, each
// topped by the signature TREFOIL — three rounded heart-shaped leaflets, every
// leaflet marked with the pale crescent "watermark" band that says CLOVER at a
// glance. Two or three round white-pink clover flower-puffs nod above the leaves
// on their own short stems. The TREFOIL is the hero shape: the leaves are drawn
// big and forward against the pad (NOT carpeting a green dome), so the tile reads
// unmistakably as clover, not vague ground-cover.
//
// The SAME clover-patch silhouette (stems + trefoils + puffs) is drawn every
// season (identity-safe). The seasons swing HARD on colour plus a real seasonal
// prop (pad blossom / fallen clover leaf / frost + snow blanket + snow caps),
// and the idle is lively rather than subtle:
//
//   IDLE COMMON  (~6s, win ~0.95s): a SOFT SWAY/NOD — the whole patch bobs and
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
// Palette lock: green trefoil clover leaves (pale crescent watermark) with round
// white-pink puff blooms.
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
  leafDark: RGB;         // shadowed leaflet / back leaves
  crescent: RGB;         // pale crescent watermark band on each leaflet
  stem: RGB;             // slender leaf + blossom stems
  bloomPetal: RGB;       // puff blossom petals (white-pink)
  bloomCore: RGB;        // puff blossom centre
  padGrass: RGB;         // top of the grass pad
  padDark: RGB;          // shaded pad underside
  soil: RGB;             // contact / base soil under the patch
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
  lean: number;    // top-of-patch sway, radians (rock side to side)
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
    crescent: lerpRGB(a.crescent, b.crescent, t),
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
    leafLight: [168, 230, 108],
    leafMid: [104, 196, 70],
    leafDark: [52, 132, 50],
    crescent: [222, 250, 188],
    stem: [110, 178, 64],
    bloomPetal: [255, 248, 252],
    bloomCore: [255, 218, 232],
    padGrass: [132, 214, 88],
    padDark: [72, 146, 60],
    soil: [120, 84, 48],
    outline: [34, 72, 30],
    light: [230, 248, 222],
    lightAmt: 0.18,
    gloss: 0.42,
    edgeBrown: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    bloomAmt: 0.72,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — LUSH peak: deep saturated green trefoils, abundant open flower
  // puffs, high gloss, warm bright light.
  Summer: {
    leafLight: [138, 220, 84],
    leafMid: [66, 172, 56],
    leafDark: [30, 106, 38],
    crescent: [200, 240, 162],
    stem: [80, 158, 50],
    bloomPetal: [255, 252, 254],
    bloomCore: [255, 198, 220],
    padGrass: [84, 176, 70],
    padDark: [42, 116, 50],
    soil: [126, 86, 48],
    outline: [22, 74, 30],
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
  // Autumn — clover going olive/bronze, flower puffs turned to brown seed-puffs;
  // olive-amber pad with a fallen leaf, dulled gloss, low amber light.
  Autumn: {
    leafLight: [194, 168, 86],
    leafMid: [150, 120, 56],
    leafDark: [94, 74, 40],
    crescent: [222, 200, 134],
    stem: [136, 116, 54],
    bloomPetal: [200, 170, 124],
    bloomCore: [150, 112, 64],
    padGrass: [162, 150, 84],
    padDark: [108, 92, 50],
    soil: [120, 78, 42],
    outline: [60, 48, 24],
    light: [250, 200, 138],
    lightAmt: 0.24,
    gloss: 0.3,
    edgeBrown: 0.92,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    bloomAmt: 0.5,
    blossomAmt: 0,
    fallenLeafAmt: 0.9,
  },
  // Winter — frost-dusted clover: a snow blanket over the base + soft snow caps
  // on the upward leaflets, frost speckle, cool blue-grey light; the green-grey
  // trefoils still clearly poke through (NO white-out — the clover stays the
  // hero shape under the frost).
  Winter: {
    leafLight: [134, 168, 134],
    leafMid: [90, 126, 98],
    leafDark: [54, 86, 70],
    crescent: [206, 222, 212],
    stem: [108, 126, 104],
    bloomPetal: [226, 234, 242],
    bloomCore: [198, 210, 222],
    padGrass: [182, 202, 220],
    padDark: [120, 148, 176],
    soil: [132, 114, 100],
    outline: [50, 60, 62],
    light: [202, 226, 255],
    lightAmt: 0.34,
    gloss: 0.26,
    edgeBrown: 0.18,
    frostAmt: 0.78,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    bloomAmt: 0.34,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Clover-patch geometry — the SAME silhouette every season ──────────────────
// Several stems rise from the pad centre, each topped by a hero trefoil; a few
// flower-puffs nod above on their own stems. The pose (lean/squash/bob)
// transforms the WHOLE patch about a pivot near the base so the leaves and puffs
// sway together. The stem + trefoil layout is constant so transitions never snap
// the silhouette.

const BASE_Y = 16.5;          // where the stems meet the pad
const PIVOT_Y = BASE_Y - 1;   // rock/lean about a point near the base

// Trefoil leaves on stems. Each: [baseX, headX, headY, scale, rot, lucky, layer].
// `baseX` = where the stem meets the pad; (headX,headY) = the trefoil centre;
// `rot` tilts the whole trefoil; `lucky` adds a charming fourth leaflet on one
// leaf (the lucky four-leaf clover); `layer` 0 = back (drawn darker, first),
// 1 = front. The leaves fan outward + upward and are drawn BIG so the trefoil is
// the unmistakable hero shape.
const LEAVES: Array<[number, number, number, number, number, number, number]> = [
  [-3.5, -12.5, -3.0, 1.05, -0.62, 0, 0],  // back-left, low
  [3.0, 11.5, -2.0, 1.0, 0.66, 0, 0],      // back-right, low
  [-2.0, -7.5, -12.5, 1.18, -0.30, 0, 1],  // mid-left, tall
  [1.5, 6.5, -14.5, 1.22, 0.16, 1, 1],     // centre, tallest — the lucky one
  [3.0, 12.0, -9.0, 1.08, 0.5, 0, 1],      // right, mid
];

// Round flower-puff placements on stems: [baseX, topX, topY].
const BLOOMS: Array<[number, number, number]> = [
  [-1.5, -3.5, -16.5],
  [2.5, 5.0, -19.5],
];

// The centre puff the visiting bee dips to (matches BLOOMS[1] crown).
const BEE_TARGET_X = 5.0;
const BEE_TARGET_Y = -19.5;

// Pad blossom (spring) spots resting ON the pad.
const PAD_BLOSSOMS: Array<[number, number]> = [[-13, 19], [12, 18.4], [-3, 21]];

// ── A single clover leaflet path (rounded heart with a notch) ─────────────────
// Origin at the leaflet stem-end; the leaflet grows upward (−y). Reused for the
// fill, the crescent clip, the brown rim and the outline so they always agree.
function leafletPath(ctx: CanvasRenderingContext2D, w: number, hgt: number): void {
  ctx.beginPath();
  ctx.moveTo(0, hgt * 0.55); // stem end (toward the trefoil centre)
  ctx.quadraticCurveTo(-w, hgt * 0.1, -w * 0.85, -hgt * 0.7);
  ctx.quadraticCurveTo(-w * 0.4, -hgt, 0, -hgt * 0.55); // outer notch dip
  ctx.quadraticCurveTo(w * 0.4, -hgt, w * 0.85, -hgt * 0.7);
  ctx.quadraticCurveTo(w, hgt * 0.1, 0, hgt * 0.55);
  ctx.closePath();
}

/** Draw one trefoil clover leaf: three rounded heart-shaped leaflets (plus an
 *  optional fourth lucky leaflet), each with the pale crescent watermark band.
 *  Origin at the leaf centre; caller has translated/rotated. The trefoil is the
 *  HERO — leaflets are large and clearly separated so the read is unmistakable. */
function trefoil(ctx: CanvasRenderingContext2D, p: P, s: number, lucky = 0): void {
  // three leaflets at ~120° apart, fanning slightly upward; lucky adds a fourth.
  const base = [-Math.PI / 2 - 0.78, -Math.PI / 2 + 0.78, Math.PI / 2 + 0.04];
  const angles = lucky > 0.5 ? [...base, Math.PI / 2 - 0.9] : base;

  // a short stalk joining the trefoil to its stem (reads as a clover petiole)
  ctx.strokeStyle = rgb(p.stem);
  ctx.lineWidth = 1.4 * s;
  ctx.beginPath();
  ctx.moveTo(0, 1.0 * s);
  ctx.lineTo(0, 4.2 * s);
  ctx.stroke();

  angles.forEach((ang, idx) => {
    const dist = 2.9 * s;
    const lx = Math.cos(ang) * dist;
    const ly = Math.sin(ang) * dist;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(ang + Math.PI / 2);

    const w = 3.0 * s;
    const hgt = 3.7 * s;

    // 1) soft dark outline pass (a slightly fatter leaflet behind the body)
    ctx.save();
    ctx.scale(1.14, 1.12);
    leafletPath(ctx, w, hgt);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();
    ctx.restore();

    // 2) leaflet body
    leafletPath(ctx, w, hgt);
    ctx.fillStyle = rgb(p.leafMid);
    ctx.fill();

    // clip to the leaflet for the shading / marks below
    ctx.save();
    leafletPath(ctx, w, hgt);
    ctx.clip();

    // lit upper-left lobe (light from upper-left)
    ctx.fillStyle = rgba(p.leafLight, 0.9);
    ctx.beginPath();
    ctx.ellipse(-w * 0.22, -hgt * 0.32, w * 0.56, hgt * 0.46, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // shaded lower-right (depth toward the trefoil throat)
    ctx.fillStyle = rgba(p.leafDark, 0.55);
    ctx.beginPath();
    ctx.ellipse(w * 0.32, hgt * 0.34, w * 0.5, hgt * 0.42, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // browning at the leaflet edge (autumn) — a warm rim hugging the outline
    if (p.edgeBrown > 0.02) {
      ctx.strokeStyle = rgba([150, 108, 50], 0.7 * p.edgeBrown);
      ctx.lineWidth = 1.6 * s;
      leafletPath(ctx, w, hgt);
      ctx.stroke();
    }

    // pale CRESCENT watermark — the signature clover band: a curved pale arc
    // bowing across the leaflet (the classic chevron-crescent mark).
    ctx.strokeStyle = rgba(p.crescent, 0.92 * (idx >= 2 ? 0.85 : 1));
    ctx.lineWidth = 1.05 * s;
    ctx.beginPath();
    ctx.moveTo(-w * 0.62, -hgt * 0.02);
    ctx.quadraticCurveTo(0, -hgt * 0.42, w * 0.62, -hgt * 0.02);
    ctx.stroke();
    // a faint inner echo so the crescent reads as a soft band, not a hairline
    ctx.strokeStyle = rgba(p.crescent, 0.4 * (idx >= 2 ? 0.85 : 1));
    ctx.lineWidth = 0.7 * s;
    ctx.beginPath();
    ctx.moveTo(-w * 0.5, -hgt * 0.14);
    ctx.quadraticCurveTo(0, -hgt * 0.5, w * 0.5, -hgt * 0.14);
    ctx.stroke();

    // glossy sheen highlight (summer peak reads wet & lush)
    if (p.gloss > 0.04) {
      ctx.fillStyle = rgba([255, 255, 255], 0.16 + 0.32 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(-w * 0.3, -hgt * 0.46, w * 0.24, hgt * 0.2, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // end leaflet clip

    // 3) crisp outline on top so each leaflet stays a clean read
    ctx.strokeStyle = rgba(p.outline, 0.75);
    ctx.lineWidth = 0.8 * s;
    leafletPath(ctx, w, hgt);
    ctx.stroke();

    ctx.restore();
  });
}

/** Draw one round flower puff on its short stem. `open` 0..1 scales the puff. */
function puffBloom(
  ctx: CanvasRenderingContext2D,
  p: P,
  baseX: number,
  topX: number,
  topY: number,
  open: number,
): void {
  const o = clamp01(open);
  if (o < 0.03) return;
  // short stem from the pad up to the puff
  ctx.strokeStyle = rgb(p.stem);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(baseX, BASE_Y - 4);
  ctx.quadraticCurveTo((baseX + topX) / 2, (BASE_Y - 4 + topY) / 2, topX, topY + 1.5);
  ctx.stroke();
  // round pom: a cluster of small petal florets forming a ball
  const r = 3.4 * (0.55 + 0.45 * o);
  // soft outline halo
  ctx.fillStyle = rgba(p.outline, 0.45);
  ctx.beginPath();
  ctx.arc(topX, topY, r + 0.8, 0, Math.PI * 2);
  ctx.fill();
  // petal florets around the rim (white-pink)
  const n = 9;
  for (let k = 0; k < n; k++) {
    const ang = (k / n) * Math.PI * 2 + 0.2;
    const px = topX + Math.cos(ang) * r * 0.78;
    const py = topY + Math.sin(ang) * r * 0.78;
    ctx.fillStyle = rgb(k % 2 === 0 ? p.bloomPetal : p.bloomCore);
    ctx.beginPath();
    ctx.ellipse(px, py, r * 0.42, r * 0.3, ang, 0, Math.PI * 2);
    ctx.fill();
  }
  // bright core + highlight
  ctx.fillStyle = rgb(p.bloomCore);
  ctx.beginPath();
  ctx.arc(topX, topY, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([255, 255, 255], 0.5 * o);
  ctx.beginPath();
  ctx.arc(topX - r * 0.3, topY - r * 0.3, r * 0.28, 0, Math.PI * 2);
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
      // a heaped drift banked against the patch base
      ctx.fillStyle = rgba([255, 255, 255], 0.85 * p.padSnowAmt);
      ctx.beginPath();
      ctx.moveTo(-15, 18);
      ctx.quadraticCurveTo(-6, 12.5, 0, 13.5);
      ctx.quadraticCurveTo(7, 12.5, 15, 18);
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
      ([[-9, 17.6], [5, 19], [11, 17.4], [-3, 20], [0, 15]] as Array<[number, number]>).forEach(([sx, sy]) => {
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

    // fallen clover leaf on the pad (autumn) — a small browned trefoil resting flat
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
        ctx.scale(0.62, 0.62);
        ctx.globalAlpha = a;
        trefoil(ctx, { ...p, leafMid: col, leafLight: col, leafDark: col, edgeBrown: 1, gloss: 0 }, 0.78);
        ctx.restore();
      });
      ctx.globalAlpha = 1;
    }

    // ── Contact shadow under the patch (follows the bob/lean for grounding) ───
    const tipShift = pose.lean * (PIVOT_Y - BEE_TARGET_Y); // how far the crown leans
    const shadowSpread = 1 + clamp01(pose.bob < 0 ? -pose.bob / 14 : 0) * 0.4;
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0 + tipShift * 0.16, BASE_Y + 2.5, 11 * shadowSpread, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.28 / shadowSpread);
    ctx.beginPath();
    ctx.ellipse(2.5 + tipShift * 0.18, BASE_Y + 3, 13 * shadowSpread, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the clover patch, under the idle pose transform ─────────────
    ctx.save();
    // Pivot near the base so lean rocks the crown side-to-side and squash anchors
    // at the base (it "sits" on the pad). bob raises the whole patch.
    ctx.translate(0, PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(0, -PIVOT_Y);

    // 1) slender stems first, so the trefoils sit on top of their stalks.
    LEAVES.forEach(([baseX, headX, headY, , , , layer]) => {
      const stalkCol = layer === 0 ? rgba(p.stem, 0.9) : rgb(p.stem);
      // dark base pass (outline) then bright stem — layered for depth
      const midX = lerp(baseX, headX, 0.5);
      const midY = lerp(BASE_Y - 2, headY, 0.5);
      ctx.strokeStyle = rgba(p.outline, 0.8);
      ctx.lineWidth = layer === 0 ? 2.2 : 2.6;
      ctx.beginPath();
      ctx.moveTo(baseX, BASE_Y - 1);
      ctx.quadraticCurveTo(midX, midY, headX, headY + 3.0);
      ctx.stroke();
      ctx.strokeStyle = stalkCol;
      ctx.lineWidth = layer === 0 ? 1.2 : 1.5;
      ctx.beginPath();
      ctx.moveTo(baseX, BASE_Y - 1);
      ctx.quadraticCurveTo(midX, midY, headX, headY + 3.0);
      ctx.stroke();
    });

    // 2) trefoil heads — back layer first (drawn slightly darker), then front.
    //    The trefoil is the HERO: big, clearly-separated heart leaflets.
    const drawLeafLayer = (wantLayer: number): void => {
      LEAVES.forEach(([, headX, headY, sc, rot, lucky, layer]) => {
        if (layer !== wantLayer) return;
        ctx.save();
        ctx.translate(headX, headY);
        ctx.rotate(rot);
        if (layer === 0) {
          // back leaves read a touch deeper / smaller so the front trefoils pop
          ctx.globalAlpha = 0.96;
          trefoil(ctx, { ...p, leafMid: p.leafDark, leafLight: p.leafMid }, sc * 0.92, lucky);
          ctx.globalAlpha = 1;
        } else {
          trefoil(ctx, p, sc, lucky);
        }
        ctx.restore();
      });
    };
    drawLeafLayer(0);

    // 3) round flower puffs poking up on short stems (between leaf layers so a
    //    front trefoil can overlap a bloom for depth)
    BLOOMS.forEach(([bx, tx, ty], i) => {
      const open = p.bloomAmt * (i === 0 ? 0.9 : 1);
      puffBloom(ctx, p, bx, tx, ty, open);
    });

    drawLeafLayer(1);

    // 4) frost dusting (winter) — cool blue speckle over the upper leaflets +
    //    a soft frost veil; the trefoils stay clearly visible underneath.
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.16 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(0, -6, 15, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([235, 246, 255], 0.72 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-12, -3], [-7, -12], [6, -14], [12, -9],
        [-3, -16], [2, -7], [-9, 4], [9, 2], [0, -2],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 5) soft snow caps resting on the UPWARD leaflets (winter) — the subject
    //    stays visible; just little white dollops on the top leaves.
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([248, 252, 255], 0.92 * a);
      // a cap on each FRONT trefoil's crown
      LEAVES.forEach(([, headX, headY, sc, , , layer]) => {
        if (layer !== 1) return;
        ctx.beginPath();
        ctx.ellipse(headX - 0.4, headY - 4.2 * sc, 2.6 * sc, 1.5 * sc, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = rgba([214, 230, 246], 0.55 * a);
      LEAVES.forEach(([, headX, headY, sc, , , layer]) => {
        if (layer !== 1) return;
        ctx.beginPath();
        ctx.ellipse(headX + 0.8, headY - 3.2 * sc, 1.6 * sc, 0.9 * sc, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }

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
    //    patch lean so it reads as visiting the swaying centre puff ───────────
    if (pose.bee > 0.001) {
      const b = clamp01(pose.bee);
      // Flight arc: fly in from upper-right off-screen → hover at the centre
      // puff (crown, transformed by the patch lean) → fly back out. A sin
      // envelope keeps the bee fully off-screen (zero contribution) at b→0.
      const env = Math.sin(Math.PI * b); // 0 at edges, 1 mid-window
      const startX = 30;
      const startY = -28;
      // target = the centre puff crown, moved with the patch pose lean/bob
      const leanShift = pose.lean * (PIVOT_Y - BEE_TARGET_Y);
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
  // Two gentle rocks left→right→left, ~0.2 rad lean → crown travels ~10–14 px.
  // Crown arm ≈ (PIVOT_Y - BEE_TARGET_Y) ≈ 35 px, so even a small lean reads.
  const qC = actionQ(t, 6.0, 0.95, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC); // 0..1..0, zero at edges
    const rock = Math.sin(qC * Math.PI * 3); // 1.5 rocks within the window
    pose.lean += 0.16 * env * rock;
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
    // the patch gives a tiny welcoming nod while the bee hovers
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
        // one slow tumbling browning clover leaf
        const prog = ((tt / 5.0) % 1 + 1) % 1;
        const px = 11 - prog * 6 + Math.sin(prog * Math.PI * 3) * 2;
        const py = -16 + prog * 32;
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(prog * Math.PI);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(prog * Math.PI * 4);
        ctx.scale(0.5, 0.5);
        trefoil(ctx, { ...SP.Autumn, leafMid: [158, 116, 52], leafLight: [188, 150, 80], leafDark: [120, 86, 40], edgeBrown: 1, gloss: 0 }, 0.8);
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
