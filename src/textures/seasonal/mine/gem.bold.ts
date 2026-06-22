// BOLD seasonal-art variant of the GEM mineral tile (`tile_mine_gem`).
//
// This is a side-by-side decision prototype against `gem.ts`. The SUBJECT is the
// SAME faceted bright-BLUE crystal emerging from a grey ROCK on a pad — drawn
// with the IDENTICAL silhouette every season so it is obviously the same tile.
// What is BOLD here vs the subtle original:
//
//   1. SEASONS swing hard. Colour/light push much further between seasons and
//      every season carries a clearly-visible identity-safe PROP that survives
//      transitions because it is a TWEENABLE param (alpha/scale 0->1 in P):
//        - Spring : mossy/dewy rock + a tiny BLOSSOM at the base (blossomAmt).
//        - Summer : warm bright PEAK, gem most brilliant, strong shadow.
//        - Autumn : amber light + a fallen LEAF resting on the rock (fallenLeafAmt).
//        - Winter : a real SNOW CAP + ICICLES + frost (snowCapAmt/icicleAmt/frostAmt);
//                   the gem stays bright and clearly visible (no white-out).
//
//   2. IDLE is a two-tier OCCASIONAL action (Warcraft-3 idle-special style), not
//      a constant subtle nudge. The tile rests most of the time, then:
//        - COMMON every ~6s (win ~0.9s): a facet GLINT sweep travels the gem +
//          a clear bob with anticipation/squash/follow-through (~10-12px travel).
//        - RARE  every ~18s (win ~1.2s): a SPARKLE BURST — the gem flares bright
//          and radiates 4-6 sparkle rays/stars for ~1s, then settles.
//      Both windows return to rest with zero velocity at their edges (seamless),
//      so `anim` at the rest phase is exactly `draw`.
//
// Architecture is the same parameterized-paint contract as gem.ts:
//   - paint(ctx, p: P, pose)         draws the WHOLE tile from p + pose only
//   - draw(season)     = paint(ctx, SP[season], REST)
//   - anim(season)     = paint(ctx, SP[season], poseFromClock(t))
//   - transition(from) = paint(ctx, lerpP(SP[from], SP[to], smoother(p)), REST)
// so transition(0) === draw(from) and transition(1) === draw(to): no snap.
//
// Origin-centered −24..+24 design box, light from upper-left, flat cel-shaded.
// The idle action may paint OUTSIDE the box (sparkle rays) — there is no clip.
// Pure Canvas-2D vector drawing. Never throws; clamps; saves/restores.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable params ─────────────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly. */
interface P {
  rockLight: RGB;   // lit face of the grey rock
  rockMid: RGB;     // body tone of the rock
  rockDark: RGB;    // shadowed underside / crevices of the rock
  gemLight: RGB;    // lit blue facet (PALETTE-LOCKED bright blue)
  gemMid: RGB;      // mid blue facet
  gemDark: RGB;     // shadowed blue facet
  padRock: RGB;     // top of the rocky/earth pad
  padDark: RGB;     // shaded pad underside
  soil: RGB;        // contact / base soil under the rock
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  gemSat: number;   // 0..1 brightness cue for the gem (peak = summer)
  gloss: number;    // 0..1 specular glint strength on the facets
  shadowAmt: number; // 0..1 contact-shadow strength (strongest in summer)
  mossAmt: number;  // 0..1 moss/grass tint at the rock base (spring/summer)
  blossomAmt: number; // 0..1 tiny blossom at the rock base (spring)
  frostAmt: number; // 0..1 cool frost dusting on the facets (winter)
  snowCapAmt: number; // 0..1 snow cap on top of the rock (winter)
  icicleAmt: number;  // 0..1 icicles hanging from the rock crown (winter)
  padSnowAmt: number; // 0..1 snow blanket on the pad (winter)
  dewAmt: number;   // 0..1 dewy sheen on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf resting on the rock (autumn)
}

// ── Idle pose (the gesture carried into paint) ───────────────────────────────

/** The idle gesture, expressed as offsets the paint applies to the SUBJECT
 *  (rock + gem move together) plus dressing amounts for the special burst.
 *  REST is the at-rest pose: zero everywhere → paint == draw. */
interface Pose {
  bob: number;        // vertical offset of the subject in design px (− = up)
  squash: number;     // vertical squash/stretch factor (1 = none)
  glint: number;      // 0..1 progress of the common facet-glint sweep (<0 = off)
  glintIntensity: number; // 0..1 brightness of that glint
  burst: number;      // 0..1 progress of the rare sparkle burst (<0 = off)
}

const REST: Pose = { bob: 0, squash: 1, glint: -1, glintIntensity: 0, burst: -1 };

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
    rockLight: lerpRGB(a.rockLight, b.rockLight, t),
    rockMid: lerpRGB(a.rockMid, b.rockMid, t),
    rockDark: lerpRGB(a.rockDark, b.rockDark, t),
    gemLight: lerpRGB(a.gemLight, b.gemLight, t),
    gemMid: lerpRGB(a.gemMid, b.gemMid, t),
    gemDark: lerpRGB(a.gemDark, b.gemDark, t),
    padRock: lerpRGB(a.padRock, b.padRock, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    gemSat: lerp(a.gemSat, b.gemSat, t),
    gloss: lerp(a.gloss, b.gloss, t),
    shadowAmt: lerp(a.shadowAmt, b.shadowAmt, t),
    mossAmt: lerp(a.mossAmt, b.mossAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
    icicleAmt: lerp(a.icicleAmt, b.icicleAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    dewAmt: lerp(a.dewAmt, b.dewAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
  };
}

function clampP(p: P): P {
  return {
    ...p,
    lightAmt: clamp01(p.lightAmt),
    gemSat: clamp01(p.gemSat),
    gloss: clamp01(p.gloss),
    shadowAmt: clamp01(p.shadowAmt),
    mossAmt: clamp01(p.mossAmt),
    blossomAmt: clamp01(p.blossomAmt),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    icicleAmt: clamp01(p.icicleAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    dewAmt: clamp01(p.dewAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────
// PALETTE LOCK: gem stays bright blue, rock stays grey in EVERY season. BUT the
// LIGHT WASH, pad, props and shadow swing HARD so the seasons are unmistakable.

const SP: Record<SeasonName, P> = {
  // Spring — cool fresh light, vivid lime-green mossy pad, dewy sheen, a tiny
  // pink blossom at the rock base. Gem bright.
  Spring: {
    rockLight: [178, 184, 190],
    rockMid: [128, 134, 144],
    rockDark: [82, 88, 100],
    gemLight: [156, 212, 255],
    gemMid: [72, 144, 244],
    gemDark: [32, 80, 182],
    padRock: [128, 176, 96],   // lime-green mossy turf (bold spring)
    padDark: [78, 118, 60],
    soil: [120, 102, 78],
    outline: [40, 48, 56],
    light: [206, 244, 224],    // cool minty bloom of light
    lightAmt: 0.22,
    gemSat: 0.8,
    gloss: 0.55,
    shadowAmt: 0.4,
    mossAmt: 0.85,
    blossomAmt: 1.0,
    frostAmt: 0,
    snowCapAmt: 0,
    icicleAmt: 0,
    padSnowAmt: 0,
    dewAmt: 0.7,
    fallenLeafAmt: 0,
  },
  // Summer — PEAK. Hot warm light, most brilliant gem, strong dark shadow, dry
  // golden-green pad.
  Summer: {
    rockLight: [192, 192, 188],
    rockMid: [138, 138, 136],
    rockDark: [84, 86, 88],
    gemLight: [188, 230, 255],  // brightest, most brilliant blue
    gemMid: [44, 138, 255],
    gemDark: [18, 74, 214],
    padRock: [186, 176, 104],   // sun-baked golden-green
    padDark: [120, 110, 60],
    soil: [134, 106, 70],
    outline: [44, 40, 44],
    light: [255, 232, 168],     // strong warm sun
    lightAmt: 0.26,
    gemSat: 1.0,
    gloss: 1.0,
    shadowAmt: 1.0,             // strong shadow
    mossAmt: 0.3,
    blossomAmt: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    icicleAmt: 0,
    padSnowAmt: 0,
    dewAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — low amber light, rust/olive pad, a fallen orange leaf on the rock.
  Autumn: {
    rockLight: [184, 168, 150],
    rockMid: [130, 116, 102],
    rockDark: [82, 72, 64],
    gemLight: [154, 200, 240],
    gemMid: [64, 130, 224],
    gemDark: [30, 74, 170],
    padRock: [176, 132, 70],    // rust-tan browning turf
    padDark: [118, 84, 44],
    soil: [120, 88, 50],
    outline: [54, 40, 34],
    light: [252, 184, 104],     // deep amber
    lightAmt: 0.3,
    gemSat: 0.82,
    gloss: 0.5,
    shadowAmt: 0.55,
    mossAmt: 0.12,
    blossomAmt: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    icicleAmt: 0,
    padSnowAmt: 0,
    dewAmt: 0,
    fallenLeafAmt: 1.0,
  },
  // Winter — cold blue-grey light, snowy pad, a real SNOW CAP + ICICLES + frost
  // on the rock. The gem stays bright and clearly visible underneath.
  Winter: {
    rockLight: [176, 186, 202],
    rockMid: [120, 130, 148],
    rockDark: [74, 84, 100],
    gemLight: [160, 212, 255],
    gemMid: [70, 140, 244],
    gemDark: [32, 80, 186],
    padRock: [216, 230, 244],   // bold bright snow pad
    padDark: [150, 172, 198],
    soil: [128, 124, 122],
    outline: [50, 56, 72],
    light: [196, 222, 255],     // cold blue light
    lightAmt: 0.4,
    gemSat: 0.86,
    gloss: 0.5,
    shadowAmt: 0.3,
    mossAmt: 0,
    blossomAmt: 0,
    frostAmt: 0.8,
    snowCapAmt: 1.0,
    icicleAmt: 1.0,
    padSnowAmt: 1.0,
    dewAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Geometry (the SAME silhouette every season) ──────────────────────────────

const ROCK_BASE_Y = 16; // rock contact with the pad
const ROCK_TOP_Y = 0;   // rock crown

/** Trace the chunky grey rock body path. Constant for all P. */
function rockPath(ctx: CanvasRenderingContext2D, bob: number): void {
  const b = ROCK_BASE_Y + bob;
  const t = ROCK_TOP_Y + bob;
  ctx.beginPath();
  ctx.moveTo(-15, b - 1);
  ctx.lineTo(-16, b - 6);
  ctx.lineTo(-12, t + 5);
  ctx.lineTo(-5, t + 1);
  ctx.lineTo(2, t + 4);
  ctx.lineTo(9, t - 1);
  ctx.lineTo(15, t + 7);
  ctx.lineTo(16, b - 5);
  ctx.lineTo(13, b);
  ctx.lineTo(-12, b);
  ctx.closePath();
}

const GEM_OX = -1.5;
const GEM_OY = -2;

const GEM_OUTLINE: Array<[number, number]> = [
  [-6, 2], [-7, -8], [-3, -20], [0, -10], [3, -22], [6, -9], [8, -14], [7, 1], [1, 4],
];

function gemOutlinePath(ctx: CanvasRenderingContext2D, bob: number): void {
  ctx.beginPath();
  GEM_OUTLINE.forEach(([x, y], i) => {
    const px = GEM_OX + x;
    const py = GEM_OY + y + bob;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
}

const GEM_FACETS: Array<{ pts: Array<[number, number]>; tone: 0 | 1 | 2 }> = [
  { pts: [[-6, 2], [-3, -20], [0, -10]], tone: 0 },
  { pts: [[-3, -20], [0, -10], [1, 4]], tone: 2 },
  { pts: [[-6, 2], [0, -10], [1, 4]], tone: 1 },
  { pts: [[1, 4], [3, -22], [0, -10]], tone: 0 },
  { pts: [[1, 4], [3, -22], [6, -9]], tone: 1 },
  { pts: [[3, -22], [6, -9], [8, -14]], tone: 0 },
  { pts: [[6, -9], [8, -14], [7, 1]], tone: 2 },
  { pts: [[1, 4], [6, -9], [7, 1]], tone: 1 },
];

const GEM_EDGES: Array<[[number, number], [number, number]]> = [
  [[-3, -20], [0, -10]],
  [[3, -22], [0, -10]],
  [[3, -22], [6, -9]],
  [[8, -14], [6, -9]],
];

// Gem center (in design-box coords, before bob) — anchor for the sparkle burst.
const GEM_CX = GEM_OX + 1.5;
const GEM_CY = GEM_OY - 12;

// ── Small dressing helpers ───────────────────────────────────────────────────

/** A four-pointed sparkle star at (x,y). */
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number, color: string): void {
  if (r <= 0 || alpha <= 0) return;
  ctx.fillStyle = `rgba(${color},${clamp01(alpha)})`;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.2, y - r * 0.2, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.2, y + r * 0.2, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.2, y + r * 0.2, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.2, y - r * 0.2, x, y - r);
  ctx.closePath();
  ctx.fill();
}

// ── The single parameterized paint ───────────────────────────────────────────

/** The whole tile from ONLY `p` and `pose`. */
function paint(ctx: CanvasRenderingContext2D, raw: P, poseRaw: Pose): void {
  const p = clampP(raw);
  const pose = poseRaw ?? REST;
  const bob = pose.bob;
  const squash = pose.squash > 0 ? pose.squash : 1;

  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Pad (does NOT move with the subject) ────────────────────────────────
    // contact shadow lower-right; strength swings with the season (summer peak)
    ctx.fillStyle = rgba(p.padDark, 0.35 + 0.4 * p.shadowAmt);
    ctx.beginPath();
    ctx.ellipse(3 + p.shadowAmt * 1.5, 21.5, 16 + p.shadowAmt * 2, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rgb(p.padDark);
    ctx.beginPath();
    ctx.ellipse(0, 20.4, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(p.padRock);
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // pebble specks (earthy texture)
    ctx.fillStyle = rgba(p.padDark, 0.55);
    const pebbles: Array<[number, number, number]> = [
      [-12, 18.4, 1.2], [-6, 20.4, 0.9], [7, 18.2, 1.1], [13, 19.8, 0.9], [1, 21, 0.8],
    ];
    pebbles.forEach(([px, py, r]) => {
      ctx.beginPath();
      ctx.ellipse(px, py, r, r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // dewy sheen (spring)
    if (p.dewAmt > 0.01) {
      ctx.fillStyle = rgba([235, 252, 244], 0.32 * p.dewAmt);
      ctx.beginPath();
      ctx.ellipse(-4, 18.4, 12, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // moss/grass tufts at the rock base (spring/summer)
    if (p.mossAmt > 0.01) {
      const a = p.mossAmt;
      ctx.fillStyle = rgba([96, 174, 76], 0.55 * a);
      const moss: Array<[number, number, number]> = [
        [-13, 18, 3.6], [12, 18, 3.2], [-2, 20.4, 4.4],
      ];
      moss.forEach(([mx, my, r]) => {
        ctx.beginPath();
        ctx.ellipse(mx, my, r, r * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.strokeStyle = rgba([74, 158, 58], 0.85 * a);
      ctx.lineWidth = 1;
      [-14, -10, 11, 14].forEach((gx, i) => {
        ctx.beginPath();
        ctx.moveTo(gx, 18.5);
        ctx.lineTo(gx + (i % 2 ? 1 : -1), 14.2);
        ctx.stroke();
      });
    }

    // pad snow blanket (winter)
    if (p.padSnowAmt > 0.01) {
      ctx.fillStyle = rgba([248, 252, 255], 0.94 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(0, 18.4, 17.6 * (0.6 + 0.4 * p.padSnowAmt), 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([206, 224, 246], 0.5 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(2, 20, 16, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([255, 255, 255], 0.85 * p.padSnowAmt);
      [[-9, 17.6], [5, 19], [11, 17.4], [-3, 20]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // ── Subject group (rock + gem) — bob + squash applied here ──────────────
    // squash pivots about the base so the contact stays planted.
    ctx.save();
    const pivotY = ROCK_BASE_Y;
    ctx.translate(0, pivotY);
    ctx.scale(1 + (1 - squash) * 0.5, squash);
    ctx.translate(0, -pivotY);

    // soil + contact shadow follow the subject base
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, ROCK_BASE_Y + bob + 1.5, 13, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.24 + 0.18 * p.shadowAmt);
    ctx.beginPath();
    ctx.ellipse(3, ROCK_BASE_Y + bob + 2, 14, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // grey rock — outline pass
    rockPath(ctx, bob);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // rock body, clipped so the outline reads as a rim
    ctx.save();
    rockPath(ctx, bob);
    ctx.clip();

    const rb = ROCK_BASE_Y + bob;
    const rt = ROCK_TOP_Y + bob;

    ctx.fillStyle = rgb(p.rockMid);
    ctx.fillRect(-18, rt - 6, 36, rb - rt + 14);

    const litGrad = ctx.createLinearGradient(-14, rt - 2, 14, rb);
    litGrad.addColorStop(0, rgb(p.rockLight));
    litGrad.addColorStop(0.5, rgb(p.rockMid));
    litGrad.addColorStop(1, rgb(p.rockDark));
    ctx.fillStyle = litGrad;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.ellipse(-3, lerp(rt, rb, 0.5), 16, (rb - rt) * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = rgba(p.rockDark, 0.8);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-9, rt + 6);
    ctx.lineTo(-6, lerp(rt, rb, 0.6));
    ctx.lineTo(-9, rb - 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(11, rt + 4);
    ctx.lineTo(8, lerp(rt, rb, 0.5));
    ctx.stroke();

    ctx.fillStyle = rgba(p.rockLight, 0.5);
    ctx.beginPath();
    ctx.moveTo(-12, rt + 6);
    ctx.lineTo(-6, rt + 2);
    ctx.lineTo(-7, lerp(rt, rb, 0.45));
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = rgba(p.rockDark, 0.5);
    ctx.beginPath();
    ctx.ellipse(2, rb - 1, 15, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // end rock clip

    // icicles hanging off the rock crown (winter) — drawn before snow cap so the
    // cap sits over their roots
    if (p.icicleAmt > 0.02) {
      const a = p.icicleAmt;
      const ice: Array<[number, number, number]> = [
        [-11, rt + 7, 6 * a],
        [-6, rt + 6, 4.2 * a],
        [13, rt + 8, 5.2 * a],
        [8, rt + 7, 3.4 * a],
      ];
      ice.forEach(([ix, iy, len]) => {
        ctx.fillStyle = rgba([214, 236, 255], 0.85 * a);
        ctx.beginPath();
        ctx.moveTo(ix - 1.5, iy);
        ctx.lineTo(ix + 1.5, iy);
        ctx.lineTo(ix, iy + len);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = rgba([255, 255, 255], 0.7 * a);
        ctx.beginPath();
        ctx.moveTo(ix - 0.6, iy);
        ctx.lineTo(ix + 0.2, iy);
        ctx.lineTo(ix - 0.2, iy + len * 0.7);
        ctx.closePath();
        ctx.fill();
      });
    }

    // snow CAP on top of the rock (winter)
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([248, 252, 255], 0.96 * a);
      ctx.beginPath();
      ctx.moveTo(-12, rt + 5);
      ctx.quadraticCurveTo(-9, rt - 2, -5, rt + 1);
      ctx.quadraticCurveTo(-1, rt + 5, 9, rt - 2);
      ctx.quadraticCurveTo(13, rt + 1, 15, rt + 7);
      ctx.quadraticCurveTo(8, rt + 4, 2, rt + 6);
      ctx.quadraticCurveTo(-5, rt + 8, -12, rt + 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([204, 224, 246], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(-3, rt + 4, 9, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── The blue crystal GEM (PALETTE-LOCKED, same silhouette) ──────────────
    gemOutlinePath(ctx, bob);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    ctx.save();
    gemOutlinePath(ctx, bob);
    ctx.clip();

    GEM_FACETS.forEach(({ pts, tone }) => {
      const col = tone === 0 ? p.gemLight : tone === 1 ? p.gemMid : p.gemDark;
      ctx.fillStyle = rgb(col);
      ctx.beginPath();
      pts.forEach(([x, y], i) => {
        const px = GEM_OX + x;
        const py = GEM_OY + y + bob;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
    });

    // brightness lift in peak summer (keeps the hue, lifts brightness)
    if (p.gemSat > 0.5) {
      ctx.fillStyle = rgba([130, 196, 255], 0.2 * (p.gemSat - 0.5) * 2);
      ctx.fillRect(GEM_OX - 8, GEM_OY - 24 + bob, 18, 30);
    }

    // bright catch-light edges
    ctx.strokeStyle = rgba([224, 242, 255], 0.5 + 0.4 * p.gloss);
    ctx.lineWidth = 1;
    GEM_EDGES.forEach(([[ax, ay], [bx, by]]) => {
      ctx.beginPath();
      ctx.moveTo(GEM_OX + ax, GEM_OY + ay + bob);
      ctx.lineTo(GEM_OX + bx, GEM_OY + by + bob);
      ctx.stroke();
    });

    // static specular sparkle on the tallest lit facet
    if (p.gloss > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.3 + 0.5 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(GEM_OX + 1.5, GEM_OY - 16 + bob, 1.0, 2.2, -0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── COMMON idle GLINT sweep — a bright band travelling the facets ────────
    // clipped to the gem so the streak stays contained. pose.glint in 0..1.
    if (pose.glint >= 0 && pose.glintIntensity > 0.01) {
      const fade = Math.sin(clamp01(pose.glint) * Math.PI); // 0 at edges, 1 mid
      const inten = clamp01(pose.glintIntensity) * fade;
      const travel = -16 + pose.glint * 32;
      ctx.save();
      ctx.translate(GEM_CX + travel, GEM_CY + bob + travel * 0.15);
      ctx.rotate(-Math.PI / 4);
      const band = ctx.createLinearGradient(-6, 0, 6, 0);
      band.addColorStop(0, "rgba(255,255,255,0)");
      band.addColorStop(0.5, `rgba(255,255,255,${0.9 * inten})`);
      band.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = band;
      ctx.fillRect(-6, -30, 12, 60);
      ctx.restore();
    }

    // ── RARE idle SPARKLE BURST — gem flares bright (clipped portion) ────────
    // pose.burst in 0..1; flare peaks mid-window. The radiating rays are drawn
    // OUTSIDE the clip further below.
    if (pose.burst >= 0) {
      const env = Math.sin(clamp01(pose.burst) * Math.PI); // 0->1->0
      ctx.fillStyle = rgba([235, 248, 255], 0.55 * env);
      ctx.fillRect(GEM_OX - 8, GEM_OY - 24 + bob, 18, 30);
    }

    // frost dusting on the facets (winter)
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([212, 232, 252], 0.24 * p.frostAmt);
      ctx.fillRect(GEM_OX - 8, GEM_OY - 24 + bob, 18, 16);
      ctx.fillStyle = rgba([238, 248, 255], 0.72 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-3, -18], [1, -20], [4, -16], [-1, -12], [6, -11], [-5, -9], [2, -6],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(GEM_OX + sx, GEM_OY + sy + bob, 0.6, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end gem clip

    // ── RARE idle SPARKLE BURST — radiating rays + stars (UNCLIPPED) ─────────
    // 4-6 rays sweeping out from the gem center, plus a couple of travelling
    // stars. May paint outside the −24..+24 box (no engine clip).
    if (pose.burst >= 0) {
      const b = clamp01(pose.burst);
      const env = Math.sin(b * Math.PI);        // overall envelope
      const reach = 8 + 16 * b;                  // rays grow outward over window
      const cx = GEM_CX;
      const cy = GEM_CY + bob;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      // central flare
      const flare = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14 + 8 * b);
      flare.addColorStop(0, `rgba(255,255,255,${0.85 * env})`);
      flare.addColorStop(0.4, `rgba(200,230,255,${0.4 * env})`);
      flare.addColorStop(1, "rgba(160,210,255,0)");
      ctx.fillStyle = flare;
      ctx.beginPath();
      ctx.arc(cx, cy, 22 + 8 * b, 0, Math.PI * 2);
      ctx.fill();
      // radiating rays (6, evenly spaced, slow spin)
      const rays = 6;
      const spin = b * 0.5;
      for (let i = 0; i < rays; i++) {
        const ang = (i / rays) * Math.PI * 2 + spin;
        const ex = cx + Math.cos(ang) * reach;
        const ey = cy + Math.sin(ang) * reach;
        const grad = ctx.createLinearGradient(cx, cy, ex, ey);
        grad.addColorStop(0, `rgba(255,255,255,${0.7 * env})`);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        // a star at each ray tip
        sparkle(ctx, ex, ey, 1.4 + 1.2 * env, 0.85 * env, "255,255,255");
      }
      ctx.restore();
    }

    ctx.restore(); // end subject group (bob/squash)

    // ── Fallen leaf resting ON the rock (autumn) — NOT bobbed (sits on pad) ──
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const leaves: Array<[number, number, number, RGB]> = [
        [9, ROCK_TOP_Y + 6, 0.5, [212, 128, 40]],
        [-10, ROCK_BASE_Y - 4, -0.6, [184, 78, 32]],
      ];
      leaves.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgba(col, a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.4, 1.9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba([88, 44, 16], a);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-3.2, 0);
        ctx.lineTo(3.2, 0);
        ctx.stroke();
        ctx.restore();
      });
    }

    // ── Blossom at the rock base (spring) — small pink flower ────────────────
    if (p.blossomAmt > 0.01) {
      const a = p.blossomAmt;
      const bx = -12, by = ROCK_BASE_Y + 1;
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(a, a);
      // stem
      ctx.strokeStyle = rgba([74, 150, 58], 0.9);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 1);
      ctx.lineTo(0, -4);
      ctx.stroke();
      // five petals
      ctx.fillStyle = rgba([248, 178, 206], 0.95);
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(Math.cos(ang) * 2.1, -4 + Math.sin(ang) * 2.1, 1.6, 1.1, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      // center
      ctx.fillStyle = rgba([252, 224, 120], 1);
      ctx.beginPath();
      ctx.arc(0, -4, 1.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

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

// ── Two-tier deterministic idle clock ────────────────────────────────────────

/** Returns a 0..1 ramp inside the action window, or −1 when outside it.
 *  c = where we are in the current period; the action plays while c < win. */
function actionQ(t: number, period: number, win: number, phase: number): number {
  const c = (((t + phase) % period) + period) % period;
  return c < win ? c / win : -1;
}

const COMMON_PERIOD = 6;
const COMMON_WIN = 0.9;
const RARE_PERIOD = 18;
const RARE_WIN = 1.2;

/** Map the clock to the idle pose. Rest most of the time; a common gesture
 *  every ~6s; a rare sparkle burst every ~18s. Each gesture ramps from rest to
 *  peak and back to rest with zero velocity at the window edges (sin envelope),
 *  so anim at rest === draw and the loop is seamless. */
function poseFromClock(t: number): Pose {
  const tt = t >= 0 ? t : 0;

  // RARE special — phase it so it does not collide with the common beat.
  const qr = actionQ(tt, RARE_PERIOD, RARE_WIN, 2.0);
  // COMMON beat.
  const qc = actionQ(tt, COMMON_PERIOD, COMMON_WIN, 0);

  let bob = 0;
  let squash = 1;
  let glint = -1;
  let glintIntensity = 0;
  let burst = -1;

  if (qr >= 0) {
    // ── RARE SPARKLE BURST (~1.2s): a clear bob lift + facet flare + rays ──
    burst = qr;
    // anticipation (dip) -> pop up -> settle, zero velocity at edges
    const env = Math.sin(qr * Math.PI);                 // 0->1->0
    const antic = Math.sin(qr * Math.PI * 2) * (1 - qr); // brief downbeat early
    bob = -10 * env - 2.2 * Math.max(0, antic);          // up to ~12px up
    squash = 1 + 0.12 * env;                             // gentle stretch on the lift
    // a small accompanying glint rides the burst
    glint = qr;
    glintIntensity = 0.5 * env;
  } else if (qc >= 0) {
    // ── COMMON gesture (~0.9s): anticipation -> bob up -> follow-through ──
    // 0..0.25 dip down (anticipation), 0.25..0.65 rise to peak, settle after.
    const env = Math.sin(qc * Math.PI);                  // smooth 0->1->0
    const antic = qc < 0.3 ? -Math.sin((qc / 0.3) * Math.PI) : 0; // early dip
    bob = -11 * env + 2.4 * antic;                       // ~11px up after a ~2px dip
    // squash on anticipation/contact, stretch at the top of the bob
    squash = 1 + 0.10 * antic + 0.08 * env;
    glint = qc;                                          // facet glint sweeps
    glintIntensity = 0.9 * Math.sin(qc * Math.PI);
  }

  return { bob, squash, glint, glintIntensity, burst };
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], REST);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => paint(ctx, SP[season], poseFromClock(t));
}

// ── Forward season→season transitions ────────────────────────────────────────

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
