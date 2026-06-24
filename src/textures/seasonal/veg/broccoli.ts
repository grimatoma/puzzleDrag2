// BOLD seasonal art for the BROCCOLI vegetable tile (`tile_veg_broccoli`).
//
// One broccoli floret: a thick pale-green stalk rising from the pad, topped by a
// single dense rounded DOME head made of a few BRIGHT, READABLE bud CLUMPS (fewer
// and larger than a noisy granular field, with strong lit caps so the head reads
// clearly at ~58px instead of dark noise). The SAME stalk+dome silhouette is
// drawn every season — only colour and the small dressing (frost, snow cap, pad
// blossoms / fallen leaves / snow, light tint, sheen) change, plus the crown buds
// opening & yellowing in autumn (a tweened amount, NOT a shape swap). The seasons
// swing HARD on colour + a real seasonal prop, and the idle is a distinct, in-
// character two-tier beat (NOT a generic wobble/bounce):
//
//   IDLE COMMON  (~6s, win ~1.1s): a gentle SWAY-AND-SETTLE — the head leans
//       calmly a few px to one side, through centre, and rights itself with a
//       faint breath. The quiet beat. Zero value AND velocity at the edges.
//   IDLE RARE    (~18s, win ~1.6s): a TREMBLE-AND-SETTLE — a rapid, small shiver
//       of the whole head (fast low-amplitude lean + squash jitter) that DAMPS
//       OUT to rest. Pose-only. Every factor is 0 with zero velocity at the
//       window edges, so the fast tremble still loops seamlessly.
//
// Architecture mirrors pepper.bold.ts: a single parameterized `paint(ctx, p, pose)`
// where `interface P` holds tweenable season params (colours + prop amounts) and
// `pose` holds the idle gesture (bob / lean / squash). Because every season is the
// same paint with tweened P, transitions are seamless:
//   transition(0) ≡ draw(from), transition(1) ≡ draw(to).
// REST pose has all zeros, so draw(season) = paint(ctx, SP[season], REST) and the
// idle's pose is 0 at every action-window edge → seamless loop.
//
// Origin-centered in the −24..+24 design box (actions may paint outside it),
// light from upper-left, flat cel-shaded with a soft dark outline. Pure Canvas-2D
// vector drawing — never throws, clamps everything, save/restore.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable season params ──────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly. */
interface P {
  budLight: RGB;    // lit top of the packed bud canopy (blue-green)
  budMid: RGB;      // body tone of the bud dome
  budDark: RGB;     // shadowed underside / between-bud grooves
  budCrown: RGB;    // crown buds (autumn: yellowing as they open)
  stalkLight: RGB;  // lit face of the pale stalk
  stalkMid: RGB;    // stalk body
  stalkDark: RGB;   // stalk shaded side
  padGrass: RGB;    // top of the grass pad
  padDark: RGB;     // shaded pad underside
  soil: RGB;        // contact / base soil under the stalk
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  ripeness: number; // 0..1 (reserved colour cue; informs nothing structural)
  gloss: number;    // 0..1 soft sheen over the buds
  loosen: number;   // 0..1 head looseness — spring young/loose, summer tight,
                    //      autumn buds open & yellow at the crown
  frostAmt: number; // 0..1 cool frost dusting on the head
  snowCapAmt: number; // 0..1 snow cap on the crown of the dome
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 a blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad (autumn)
}

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number;     // vertical offset in design px (negative = up)
  lean: number;    // top-of-head sway, radians (rock side to side)
  squashX: number; // additive horizontal scale (+0.18 = 18% wider)
  squashY: number; // additive vertical scale (+0.18 = 18% taller)
}

const REST: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0 };

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
    budLight: lerpRGB(a.budLight, b.budLight, t),
    budMid: lerpRGB(a.budMid, b.budMid, t),
    budDark: lerpRGB(a.budDark, b.budDark, t),
    budCrown: lerpRGB(a.budCrown, b.budCrown, t),
    stalkLight: lerpRGB(a.stalkLight, b.stalkLight, t),
    stalkMid: lerpRGB(a.stalkMid, b.stalkMid, t),
    stalkDark: lerpRGB(a.stalkDark, b.stalkDark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    ripeness: lerp(a.ripeness, b.ripeness, t),
    gloss: lerp(a.gloss, b.gloss, t),
    loosen: lerp(a.loosen, b.loosen, t),
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
    ripeness: clamp01(p.ripeness),
    gloss: clamp01(p.gloss),
    loosen: clamp01(p.loosen),
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
  // Spring — small young head, looser & a touch lighter green; dewy lime pad +
  // a prominent blossom. Cool-bright light. Palette stays blue-green (younger).
  Spring: {
    budLight: [168, 228, 158],
    budMid: [92, 176, 120],
    budDark: [40, 104, 76],
    budCrown: [178, 226, 146],
    stalkLight: [200, 226, 170],
    stalkMid: [160, 200, 134],
    stalkDark: [112, 156, 98],
    padGrass: [128, 212, 84],
    padDark: [70, 142, 56],
    soil: [120, 84, 48],
    outline: [28, 66, 48],
    light: [230, 248, 220],
    lightAmt: 0.18,
    ripeness: 0.2,
    gloss: 0.22,
    loosen: 0.46,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 1.0,
    fallenLeafAmt: 0,
  },
  // Summer — PEAK: full TIGHT dense BLUE-GREEN head; richest saturation, mid-green
  // pad, warm light, strong soft sheen over the packed buds.
  Summer: {
    budLight: [120, 204, 150],
    budMid: [48, 148, 104],
    budDark: [16, 86, 64],
    budCrown: [88, 180, 124],
    stalkLight: [208, 228, 168],
    stalkMid: [168, 202, 128],
    stalkDark: [116, 158, 92],
    padGrass: [80, 174, 68],
    padDark: [40, 116, 50],
    soil: [128, 88, 48],
    outline: [12, 56, 44],
    light: [255, 242, 204],
    lightAmt: 0.2,
    ripeness: 0.9,
    gloss: 0.85,
    loosen: 0.0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — head loosening: buds opening & yellowing at the crown; deeper olive
  // blue-green body; olive-tan pad, a fallen leaf. Low amber light.
  Autumn: {
    budLight: [156, 196, 116],
    budMid: [88, 142, 86],
    budDark: [40, 82, 52],
    budCrown: [226, 210, 96], // yellowing open crown
    stalkLight: [198, 210, 138],
    stalkMid: [158, 178, 106],
    stalkDark: [106, 130, 74],
    padGrass: [158, 154, 82],
    padDark: [108, 96, 50],
    soil: [120, 78, 42],
    outline: [44, 56, 34],
    light: [250, 204, 138],
    lightAmt: 0.24,
    ripeness: 1.0,
    gloss: 0.3,
    loosen: 0.92,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1.0,
  },
  // Winter — cool blue-grey light; frost-dusted BLUE-GREEN head still clearly
  // reads, a bold snow cap on the crown + a snow drift at the base. Tight again.
  Winter: {
    budLight: [144, 198, 172],
    budMid: [70, 138, 120],
    budDark: [28, 80, 72],
    budCrown: [124, 180, 156],
    stalkLight: [198, 216, 200],
    stalkMid: [154, 184, 168],
    stalkDark: [106, 144, 134],
    padGrass: [182, 202, 220],
    padDark: [122, 150, 178],
    soil: [132, 116, 102],
    outline: [36, 56, 60],
    light: [200, 224, 255],
    lightAmt: 0.34,
    ripeness: 0.8,
    gloss: 0.26,
    loosen: 0.1,
    frostAmt: 0.8,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Broccoli geometry — the SAME silhouette every season ─────────────────────

// A thick stalk rises from the pad, branching into a couple of stubs, topped by
// one dense dome head.
const STALK_BOT = 17;   // stalk base resting on the pad
const STALK_TOP = -1;   // where the stalk meets the underside of the dome
const STALK_HALF = 4.2; // half-width of the main stalk

const DOME_CY = -7;     // centre of the dome head
const DOME_RX = 14;     // dome half-width
const DOME_RY = 11;     // dome half-height (rounded, a touch taller than flat)

const PIVOT_Y = STALK_BOT - 1; // rock/lean & squash anchor near the base

// A small set of BRIGHT, READABLE bud CLUMPS covering the dome (constant outline /
// positions every season). Each: [x, y, radius] relative to the dome centre.
// Fewer + larger than a granular field on purpose: the head reads as clear
// rounded curds at ~58px rather than dark noise. The dome SILHOUETTE is the
// fixed `domePath` (NOT the hull of these), so it stays identical across seasons;
// the clumps just sit inside that footprint. Larger clumps last (painted later =
// on top) so the lit crown clumps stay legible over the body.
const BUDS: Array<[number, number, number]> = [
  // lower skirt (drawn first → sits behind, over the stalk shoulders)
  [-8.6, 3.4, 3.6], [0.2, 3.6, 3.9], [8.4, 3.6, 3.5],
  // mid band — the broad body of the head
  [-10.4, -0.8, 4.0], [-2.4, -0.6, 4.6], [5.6, -0.8, 4.3], [11.0, -1.2, 3.4],
  // upper band
  [-7.0, -5.6, 4.4], [1.0, -5.4, 4.8], [8.0, -5.2, 4.2],
  // crown clumps (top of the dome) — the readable highlights / autumn yellowing
  [-3.4, -9.0, 4.2], [3.8, -9.0, 4.2],
];

// Which clumps sit at the crown (used for the autumn "opening / yellowing" cue
// and informing the winter snow cap). Indices into BUDS — the two top clumps
// plus the upper band.
const CROWN_IDX = [7, 8, 9, 10, 11];

/** Trace the dome head silhouette (one smooth rounded dome) into the path. */
function domePath(ctx: CanvasRenderingContext2D): void {
  const cy = DOME_CY;
  ctx.beginPath();
  // a rounded dome: full upper bulge, gently flattened underside meeting stalk
  ctx.moveTo(-DOME_RX, cy + DOME_RY * 0.45);
  ctx.quadraticCurveTo(-DOME_RX, cy - DOME_RY * 0.9, -DOME_RX * 0.45, cy - DOME_RY);
  ctx.quadraticCurveTo(0, cy - DOME_RY * 1.18, DOME_RX * 0.45, cy - DOME_RY);
  ctx.quadraticCurveTo(DOME_RX, cy - DOME_RY * 0.9, DOME_RX, cy + DOME_RY * 0.45);
  ctx.quadraticCurveTo(DOME_RX * 0.8, cy + DOME_RY * 0.95, DOME_RX * 0.36, cy + DOME_RY * 0.92);
  ctx.quadraticCurveTo(0, cy + DOME_RY * 0.86, -DOME_RX * 0.36, cy + DOME_RY * 0.92);
  ctx.quadraticCurveTo(-DOME_RX * 0.8, cy + DOME_RY * 0.95, -DOME_RX, cy + DOME_RY * 0.45);
  ctx.closePath();
}

/** Trace the thick stalk (with two short branch stubs) into the path. */
function stalkPath(ctx: CanvasRenderingContext2D): void {
  const b = STALK_BOT;
  const t = STALK_TOP;
  const h = STALK_HALF;
  ctx.beginPath();
  // base flares out a little where it meets the pad
  ctx.moveTo(-h - 1.4, b);
  ctx.quadraticCurveTo(-h - 0.4, b - 6, -h, lerp(t, b, 0.4));
  // left branch stub spreading up-left under the dome
  ctx.quadraticCurveTo(-h - 1.6, t + 5, -h - 4.2, t + 1.5);
  ctx.quadraticCurveTo(-h - 1.2, t + 2.5, -h * 0.5, t + 0.5);
  // crest under the dome
  ctx.quadraticCurveTo(0, t - 1, h * 0.5, t + 0.5);
  // right branch stub spreading up-right
  ctx.quadraticCurveTo(h + 1.2, t + 2.5, h + 4.2, t + 1.5);
  ctx.quadraticCurveTo(h + 1.6, t + 5, h, lerp(t, b, 0.4));
  ctx.quadraticCurveTo(h + 0.4, b - 6, h + 1.4, b);
  ctx.quadraticCurveTo(0, b + 2.4, -h - 1.4, b);
  ctx.closePath();
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

    // pad snow blanket (winter)
    if (p.padSnowAmt > 0.01) {
      ctx.fillStyle = rgba([244, 250, 255], 0.92 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(0, 18.4, 17.4 * (0.6 + 0.4 * p.padSnowAmt), 4.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([210, 226, 244], 0.5 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(2, 20, 16, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.padSnowAmt);
      ([[-9, 17.6], [5, 19], [11, 17.4], [-3, 20]] as Array<[number, number]>).forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // blossom on the pad (spring)
    if (p.blossomAmt > 0.01) {
      const a = p.blossomAmt;
      const spots: Array<[number, number]> = [[-13, 18.5], [12, 17.8], [-4, 21]];
      spots.forEach(([bx, by], idx) => {
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

    // fallen leaf on the pad (autumn)
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const leaves: Array<[number, number, number, RGB]> = [
        [-12, 19.6, -0.5, [206, 124, 38]],
        [12, 18.6, 0.7, [182, 70, 28]],
      ];
      leaves.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgba(col, a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.4, 1.9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba([90, 44, 16], a);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-3.2, 0);
        ctx.lineTo(3.2, 0);
        ctx.stroke();
        ctx.restore();
      });
    }

    // ── Contact shadow under the stalk base (follows the bob/lean) ───────────
    const tipShift = pose.lean * (PIVOT_Y - DOME_CY); // how far the crown leans
    const shadowSpread = 1 + clamp01(pose.bob < 0 ? -pose.bob / 14 : 0) * 0.5;
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0 + tipShift * 0.16, STALK_BOT + 1.5, 8 * shadowSpread, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.28 / shadowSpread);
    ctx.beginPath();
    ctx.ellipse(2.5 + tipShift * 0.18, STALK_BOT + 2, 11 * shadowSpread, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: stalk + dome, under the idle pose transform ─────────────────
    ctx.save();
    // Pivot near the base so lean rocks the head side-to-side and squash anchors
    // at the base (it "sits" on the pad). bob raises the whole floret.
    ctx.translate(0, PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(0, -PIVOT_Y);

    // ── Subject part 1: the thick pale stalk (drawn BEHIND the dome) ─────────
    // soft dark outline pass first
    stalkPath(ctx);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();
    // stalk body fill with left-lit gradient
    ctx.save();
    stalkPath(ctx);
    ctx.clip();
    const sGrad = ctx.createLinearGradient(-STALK_HALF - 4, 0, STALK_HALF + 4, 0);
    sGrad.addColorStop(0, rgb(p.stalkLight));
    sGrad.addColorStop(0.5, rgb(p.stalkMid));
    sGrad.addColorStop(1, rgb(p.stalkDark));
    ctx.fillStyle = sGrad;
    ctx.fillRect(-STALK_HALF - 6, STALK_TOP - 4, (STALK_HALF + 6) * 2, STALK_BOT - STALK_TOP + 10);
    // a couple of vertical grooves on the stalk for fibre read
    ctx.strokeStyle = rgba(p.stalkDark, 0.6);
    ctx.lineWidth = 1.1;
    [-1.6, 1.4].forEach((gx) => {
      ctx.beginPath();
      ctx.moveTo(gx, STALK_TOP + 2);
      ctx.lineTo(gx + 0.4, STALK_BOT - 1);
      ctx.stroke();
    });
    ctx.restore();

    // ── Subject part 2: the dense dome head (SAME silhouette every season) ──
    // 1) soft dark outline pass (the dome footprint)
    domePath(ctx);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // 2) clip to the dome and paint the packed buds inside
    ctx.save();
    domePath(ctx);
    ctx.clip();
    const cy = DOME_CY;

    // base mid fill so gaps between buds read as the body, not transparent
    ctx.fillStyle = rgb(p.budMid);
    ctx.fillRect(-DOME_RX - 2, cy - DOME_RY - 4, (DOME_RX + 2) * 2, DOME_RY * 2 + 10);

    // broad dark→light vertical wash for dome roundness
    const dGrad = ctx.createLinearGradient(0, cy - DOME_RY, 0, cy + DOME_RY);
    dGrad.addColorStop(0, rgb(p.budLight));
    dGrad.addColorStop(0.5, rgb(p.budMid));
    dGrad.addColorStop(1, rgb(p.budDark));
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = dGrad;
    ctx.fillRect(-DOME_RX - 2, cy - DOME_RY - 4, (DOME_RX + 2) * 2, DOME_RY * 2 + 10);
    ctx.globalAlpha = 1;

    // the bud CLUMPS: dark base ring, body fill, then a BRIGHT lit cap + a small
    // bright crest → clear rounded curds that read at small size (not dark noise).
    BUDS.forEach(([bx, by, br], i) => {
      const x = bx;
      const y = by;
      const isCrown = CROWN_IDX.includes(i);
      // crown clumps open & yellow with `loosen` (autumn); a touch larger/separated
      const open = isCrown ? p.loosen : p.loosen * 0.35;
      const r = br * (1 + open * 0.1);
      // shadow ring between clumps (dark) — keeps each curd separated & readable
      ctx.fillStyle = rgb(p.budDark);
      ctx.beginPath();
      ctx.arc(x, y + 0.6, r + 0.6, 0, Math.PI * 2);
      ctx.fill();
      // clump body — crown clumps tilt toward budCrown colour as they yellow/open
      const body: RGB = isCrown ? lerpRGB(p.budMid, p.budCrown, open) : p.budMid;
      ctx.fillStyle = rgb(body);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      // BRIGHT lit cap upper-left — larger + more opaque than before for contrast
      const cap: RGB = isCrown ? lerpRGB(p.budLight, p.budCrown, open * 0.6) : p.budLight;
      ctx.fillStyle = rgba(cap, 0.98);
      ctx.beginPath();
      ctx.arc(x - r * 0.3, y - r * 0.32, r * 0.72, 0, Math.PI * 2);
      ctx.fill();
      // a small bright crest highlight on top of the cap for that fresh-curd pop
      ctx.fillStyle = rgba([255, 255, 255], 0.42);
      ctx.beginPath();
      ctx.arc(x - r * 0.4, y - r * 0.46, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      // a tiny dark fleck centre when clumps open (granular detail, autumn)
      if (open > 0.25) {
        ctx.fillStyle = rgba(p.budDark, 0.5 * open);
        ctx.beginPath();
        ctx.arc(x, y, r * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // soft sheen over the buds (gloss strength from P) — upper-left bias
    if (p.gloss > 0.02) {
      const gl = ctx.createRadialGradient(-5, cy - 4, 1, -5, cy - 4, DOME_RX);
      gl.addColorStop(0, rgba([255, 255, 255], 0.22 + 0.4 * p.gloss));
      gl.addColorStop(1, rgba([255, 255, 255], 0));
      ctx.fillStyle = gl;
      ctx.fillRect(-DOME_RX - 2, cy - DOME_RY - 4, (DOME_RX + 2) * 2, DOME_RY * 2 + 10);
    }

    // frost dusting (winter) — cool blue speckle on the upward buds
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.24 * p.frostAmt);
      ctx.fillRect(-DOME_RX - 2, cy - DOME_RY - 4, (DOME_RX + 2) * 2, DOME_RY);
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-9, cy - 6], [-3, cy - 8], [3, cy - 7], [8, cy - 5],
        [-11, cy - 2], [11, cy - 2], [0, cy - 3], [-6, cy + 1], [6, cy + 1],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end dome clip

    // 3) snow cap on the crown of the dome (winter) — over the buds
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(-DOME_RX * 0.7, cy - DOME_RY * 0.5);
      ctx.quadraticCurveTo(-DOME_RX * 0.5, cy - DOME_RY * 1.05, 0, cy - DOME_RY * 1.02);
      ctx.quadraticCurveTo(DOME_RX * 0.5, cy - DOME_RY * 1.05, DOME_RX * 0.7, cy - DOME_RY * 0.5);
      ctx.quadraticCurveTo(DOME_RX * 0.4, cy - DOME_RY * 0.34, 0, cy - DOME_RY * 0.42);
      ctx.quadraticCurveTo(-DOME_RX * 0.4, cy - DOME_RY * 0.34, -DOME_RX * 0.7, cy - DOME_RY * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(0, cy - DOME_RY * 0.55, DOME_RX * 0.55, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // end pose transform

    // ── Ambient light wash over the whole tile (per-season tint) ────────────
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
// sin^2(pi q) → smooth in/out, peak at q=0.5.
function hump(q: number): number {
  const s = Math.sin(Math.PI * q);
  return s * s;
}

/** A seamless tremble carrier: a fast oscillation that is exactly 0 with zero
 *  velocity at q=0 and q=1. `Math.sin(Math.PI*q)` is 0 at both edges and the fast
 *  `Math.sin(2*Math.PI*freq*q)` (integer `freq`) is 0 at both edges too, so every
 *  term of the product's derivative carries a zero factor → zero slope at the
 *  edges. Multiply by any finite weight (e.g. a decay) and the edges stay clean. */
function tremble(q: number, freq: number): number {
  return Math.sin(Math.PI * q) * Math.sin(2 * Math.PI * freq * q);
}

/** Build the idle pose from the wall clock. Two tiers, neither a bounce:
 *   COMMON — a gentle SWAY-AND-SETTLE every ~6s (win 1.1s): one calm lean out,
 *            through centre, and right itself, with a faint breath.
 *   RARE   — a TREMBLE-AND-SETTLE every ~18s (win 1.6s): a rapid small shiver of
 *            the whole head (fast lean + squash jitter) whose amplitude DAMPS
 *            toward rest. Pose-only.
 *  Each factor is 0 with zero value AND zero velocity at the window edges, so the
 *  loop is seamless even though the rare beat is fast. */
function poseFromClock(t: number): Pose {
  const pose: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0 };

  // ── COMMON: a gentle sway-and-settle (~6s, win 1.1s) ──
  // Calm, not a nervous wobble: one slow lean out and back with a faint breath.
  // env=sin(πq) and the carrier sin(2πq) are each 0 at q=0 and q=1 → seamless.
  const qC = actionQ(t, 6.0, 1.1, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC); // 0..1..0 envelope, zero at edges
    const sway = Math.sin(qC * Math.PI * 2); // one gentle L→centre→R→centre
    pose.lean += 0.07 * env * sway; // ~4–5px crown sway — calm
    // a soft breath settling at the base (0 with zero velocity at the edges)
    pose.squashY += -0.025 * hump(qC);
    pose.squashX += 0.022 * hump(qC);
  }

  // ── RARE: a TREMBLE-AND-SETTLE (~18s, win 1.6s) — NOT a hop ──
  // A rapid low-amplitude shiver of the whole head that damps toward rest. The
  // `tremble` carriers are seamless at the edges; a decaying weight (still finite
  // and smooth) front-loads the shiver so it settles. Phase 3s clears the COMMON
  // beat: the window is t mod 18 ∈ [15,18), ending at the 18≡0 seam where COMMON
  // restarts from REST (verified non-overlapping, like the pear/apple).
  const qR = actionQ(t, 18.0, 1.6, 3.0);
  if (qR >= 0) {
    // decay: 1 → ~0.1 across the window; finite & smooth so it preserves the
    // carriers' zero value+velocity at q=0 and q=1 (0·finite = 0 either edge).
    const decay = Math.exp(-2.6 * qR);
    // fast lean jitter (6 cycles) and a squash jitter a half-step out of phase so
    // the head reads as a shiver, not a pure rock. Small amplitudes (low-key).
    pose.lean += 0.05 * decay * tremble(qR, 6);
    pose.squashX += 0.05 * decay * tremble(qR, 5);
    pose.squashY += -0.05 * decay * tremble(qR, 5);
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
        // one slow tumbling leaf
        const prog = ((tt / 5.0) % 1 + 1) % 1;
        const px = 11 - prog * 6 + Math.sin(prog * Math.PI * 3) * 2;
        const py = -16 + prog * 32;
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(prog * Math.PI);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(prog * Math.PI * 4);
        ctx.fillStyle = "rgba(206,116,40,1)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.4, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      // Summer: no extra dressing — the bright blue-green head + sway is the show.
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
