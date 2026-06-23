// Production seasonal art for the MANNA grain tile (`tile_grain_manna`, grain).
//
// Manna is a MAGICAL, celestial grain: a unified mound of rounded, pearlescent,
// luminous seeds heaped on a turf pad, wrapped in a gentle ambient glow that is
// part of its identity — it gently shimmers in EVERY season. The SAME mound
// silhouette is drawn every season (identity-safe); the seasons swing hard on
// colour + a real seasonal prop (blossom / fallen leaf / snow cap + base snow +
// frost) and on the glow/sparkle, and the idle is lively rather than subtle:
//
//   IDLE COMMON  (~6s, win ~0.95s): a gentle FLOAT + SHIMMER — the manna lifts
//       and sways ~10–14 design-px (reads as a soft magical float) while its
//       glow pulses. Anticipation → peak → settle, zero velocity at the window
//       edges (seamless).
//   IDLE SPECIAL (~18s, win ~1.2s): a SPARKLE-BURST — a bigger "look-at-me"
//       float ~16–20 design-px up with anticipation crouch → stretch → settle,
//       the glow flaring and sparkles flashing at the apex.
//
// The architecture is a single parameterized `paint(ctx, p, pose)` where
// `interface P` holds tweenable season params (colours + glow + prop amounts)
// and `pose` holds the idle gesture (bob / lean / squash / glow & sparkle
// pulse). Because every season is the same paint with tweened P, transitions
// are seamless: transition(0) ≡ draw(from), transition(1) ≡ draw(to). REST pose
// has all zeros, so draw(season) = paint(ctx, SP[season], REST) and the idle's
// pose is 0 at every action-window edge → seamless loop.
//
// Origin-centered in the −24..+24 design box (actions may paint outside it),
// light from upper-left, soft pearlescent shading. Pure Canvas-2D vector
// drawing — never throws, clamps everything, save/restore. Reads at ~58px.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable season params ──────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — paint is a
 *  pure function of these so transitions interpolate cleanly. */
interface P {
  grainInner: RGB;       // bright lit core of each grain
  grainMid: RGB;         // mid pearlescent body colour
  grainRim: RGB;         // shaded rim / underside colour
  contour: RGB;          // soft outer contour stroke tint
  dimple: RGB;           // interior dimple stroke tint (where grains meet)
  padGrass: RGB;         // top of the turf pad
  padDark: RGB;          // shaded pad underside
  soil: RGB;             // contact / base soil under the mound
  glowColor: RGB;        // ambient halo colour (part of manna's identity)
  light: RGB;            // ambient light tint laid over the whole tile
  lightAmt: number;      // 0..1 strength of the ambient light wash
  glowAmt: number;       // 0..1 ambient glow strength (peaks in summer)
  gloss: number;         // 0..1 pearlescent sheen on the mound
  sparkleAmt: number;    // 0..1 little contained sparkle accents on the mound
  frostAmt: number;      // 0..1 cool frost dusting on the grains (winter)
  snowCapAmt: number;    // 0..1 snow caps sitting on the grains (winter)
  padSnowAmt: number;    // 0..1 snow blanket at the base / on the pad (winter)
  blossomAmt: number;    // 0..1 blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad (autumn)
}

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number;       // vertical offset in design px (negative = up / floating)
  lean: number;      // top-of-mound sway, radians
  squashX: number;   // additive horizontal scale (+0.18 = 18% wider)
  squashY: number;   // additive vertical scale (+0.18 = 18% taller)
  glowPulse: number; // additive boost to the glow halo (0 = rest)
  sparkPulse: number;// additive boost to the sparkle flash (0 = rest)
}

const REST: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0, glowPulse: 0, sparkPulse: 0 };

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
    grainInner: lerpRGB(a.grainInner, b.grainInner, t),
    grainMid: lerpRGB(a.grainMid, b.grainMid, t),
    grainRim: lerpRGB(a.grainRim, b.grainRim, t),
    contour: lerpRGB(a.contour, b.contour, t),
    dimple: lerpRGB(a.dimple, b.dimple, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    glowColor: lerpRGB(a.glowColor, b.glowColor, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    glowAmt: lerp(a.glowAmt, b.glowAmt, t),
    gloss: lerp(a.gloss, b.gloss, t),
    sparkleAmt: lerp(a.sparkleAmt, b.sparkleAmt, t),
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
    glowAmt: clamp01(p.glowAmt),
    gloss: clamp01(p.gloss),
    sparkleAmt: clamp01(p.sparkleAmt),
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

// ── Per-season params — pushed HARD (glow kept alive every season) ────────────

const SP: Record<SeasonName, P> = {
  // Spring — young/fresh manna: pale luminous green-gold grains, a small
  // blossom on the lime pad, a soft cool-bright glow.
  Spring: {
    grainInner: [255, 255, 246],
    grainMid: [238, 246, 198],
    grainRim: [192, 214, 142],
    contour: [140, 168, 92],
    dimple: [132, 160, 86],
    padGrass: [142, 214, 96],
    padDark: [76, 150, 60],
    soil: [120, 88, 50],
    glowColor: [214, 244, 188],
    light: [228, 248, 214],
    lightAmt: 0.18,
    glowAmt: 0.4,
    gloss: 0.55,
    sparkleAmt: 0.7,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 1.0,
    fallenLeafAmt: 0,
  },
  // Summer — peak radiant golden manna: brightest glow + sparkle, high gloss,
  // warm bright light.
  Summer: {
    grainInner: [255, 255, 240],
    grainMid: [255, 234, 168],
    grainRim: [236, 188, 92],
    contour: [186, 138, 42],
    dimple: [180, 132, 48],
    padGrass: [104, 184, 70],
    padDark: [56, 124, 46],
    soil: [128, 90, 48],
    glowColor: [255, 226, 132],
    light: [255, 244, 200],
    lightAmt: 0.2,
    glowAmt: 0.95,
    gloss: 0.85,
    sparkleAmt: 1.0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — rich amber-gold manna (heavier, ripe), a fallen leaf on the pad,
  // glow warmer + dimmer, amber light.
  Autumn: {
    grainInner: [255, 240, 210],
    grainMid: [244, 200, 134],
    grainRim: [196, 138, 60],
    contour: [136, 86, 30],
    dimple: [134, 86, 28],
    padGrass: [160, 150, 78],
    padDark: [108, 92, 48],
    soil: [120, 80, 44],
    glowColor: [240, 168, 86],
    light: [250, 198, 132],
    lightAmt: 0.24,
    glowAmt: 0.56,
    gloss: 0.5,
    sparkleAmt: 0.68,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1.0,
  },
  // Winter — frosted manna: pale frosted gold grains, a bold snow cap + base
  // snow drift, a cool crystalline sparkle and a faint cold-blue glow; cool
  // blue-grey light. Clearly snowy, still reads as manna and still glows.
  Winter: {
    grainInner: [255, 255, 255],
    grainMid: [228, 232, 226],
    grainRim: [186, 198, 200],
    contour: [128, 150, 162],
    dimple: [122, 148, 168],
    padGrass: [168, 192, 204],
    padDark: [110, 140, 158],
    soil: [132, 116, 102],
    glowColor: [196, 224, 248],
    light: [200, 224, 255],
    lightAmt: 0.34,
    glowAmt: 0.42,
    gloss: 0.42,
    sparkleAmt: 0.62,
    frostAmt: 0.9,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Mound geometry — the SAME silhouette every season ─────────────────────────
// A unified soft mound of five overlapping rounded grains. Constant across all
// P; only colour, glow, frost and snow change.

interface Bump {
  x: number;
  y: number;
  r: number;
}

const BUMPS: ReadonlyArray<Bump> = [
  { x: -10, y: 6, r: 10 },
  { x: 10, y: 7, r: 9.5 },
  { x: -2, y: -9, r: 11 },
  { x: 7, y: -3, r: 8 },
  { x: -7, y: -2, r: 7 },
];

const MOUND_PIVOT_Y = 16; // float/lean/squash anchor near the base of the mound

// ── The single parameterized paint ───────────────────────────────────────────

/** The whole tile from ONLY `p` (season identity) and `pose` (idle gesture). */
function paint(ctx: CanvasRenderingContext2D, raw: P, rawPose: Pose): void {
  const p = clampP(raw);
  const pose: Pose = {
    bob: safeNum(rawPose.bob),
    lean: safeNum(rawPose.lean),
    squashX: safeNum(rawPose.squashX),
    squashY: safeNum(rawPose.squashY),
    glowPulse: safeNum(rawPose.glowPulse),
    sparkPulse: safeNum(rawPose.sparkPulse),
  };

  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Ambient glow halo behind everything (gentle, seasonal colour) ─────────
    if (p.glowAmt > 0.01) {
      const pulse = 1 + 0.5 * clamp01(pose.glowPulse);
      const alpha = clamp01(0.6 * p.glowAmt * pulse);
      const radius = 23 + 6 * p.glowAmt * pulse + pose.bob * -0.2;
      const g = ctx.createRadialGradient(0, -2, 4, 0, -2, Math.max(8, radius));
      g.addColorStop(0, rgba(p.glowColor, alpha));
      g.addColorStop(1, rgba(p.glowColor, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -2, Math.max(8, radius), 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Pad: low flat turf ellipse (does NOT move with the pose) ──────────────
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
      const spots: Array<[number, number]> = [[-13, 18.5], [12, 17.8]];
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

    // ── Contact shadow under the mound (follows the bob for grounding) ────────
    const shadowSpread = 1 + clamp01(pose.bob < 0 ? -pose.bob / 18 : 0) * 0.5;
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, MOUND_PIVOT_Y + 5, 11 * shadowSpread, 3.0, 0, 0, Math.PI * 2);
    ctx.fill();
    // soft shadow tint borrowed from the contour hue, darkened (manna has no
    // hard outline of its own).
    const shadowTint: RGB = [p.contour[0] * 0.55, p.contour[1] * 0.55, p.contour[2] * 0.55];
    ctx.fillStyle = rgba(shadowTint, 0.26 / shadowSpread);
    ctx.beginPath();
    ctx.ellipse(2.5, MOUND_PIVOT_Y + 5.5, 13 * shadowSpread, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the luminous grain mound, under the idle pose transform ──────
    ctx.save();
    // Pivot near the base so lean rocks the TOP, squash anchors at the base
    // (it "sits"/floats from the pad). bob raises the whole mound.
    ctx.translate(0, MOUND_PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(0, -MOUND_PIVOT_Y);

    // 1) the mound of rounded pearlescent grains — shared soft gradient so the
    //    bumps merge into one mound.
    BUMPS.forEach((b) => {
      const grad = ctx.createRadialGradient(
        b.x - b.r * 0.45,
        b.y - b.r * 0.5,
        1,
        b.x,
        b.y,
        b.r,
      );
      grad.addColorStop(0, rgb(p.grainInner));
      grad.addColorStop(0.55, rgb(p.grainMid));
      grad.addColorStop(1, rgb(p.grainRim));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2) soft contour tracing the outer arc of each rim bump so the cluster
    //    reads as one mound (not separate rings).
    ctx.strokeStyle = rgb(p.contour);
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(BUMPS[2].x, BUMPS[2].y, BUMPS[2].r - 0.3, Math.PI * 1.05, Math.PI * 2.05);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(BUMPS[0].x, BUMPS[0].y, BUMPS[0].r - 0.3, Math.PI * 0.35, Math.PI * 1.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(BUMPS[1].x, BUMPS[1].y, BUMPS[1].r - 0.3, Math.PI * -0.45, Math.PI * 0.65);
    ctx.stroke();

    // 3) soft dimples where grains meet (interior detail, restrained).
    ctx.strokeStyle = rgba(p.dimple, 0.45);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 2, 5, -0.7, 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(2, -6, 4.5, 2.2, 3.6);
    ctx.stroke();

    // 4) soft pearlescent specular highlight upper-left (sheen, never a bloom).
    if (p.gloss > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.5 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(-5, -11, 4, 2.4, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5) contained sparkle accents on the mound (flares with sparkPulse).
    if (p.sparkleAmt > 0.02) {
      const flare = clamp01(pose.sparkPulse);
      const spark = clamp01(p.sparkleAmt * (0.85 + 0.6 * flare));
      ctx.fillStyle = rgba(lerpRGB(p.grainInner, [255, 255, 255], 0.4), 0.95 * spark);
      const pts: Array<[number, number, number]> = [
        [-9, -10, 1.7 + 0.8 * flare],
        [4, -1, 1.3 + 0.6 * flare],
        [6, -12, 1.1 + 0.7 * flare],
      ];
      pts.forEach(([sx, sy, sr]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
        if (flare > 0.2) {
          // a tiny cross-glint at the flare peak
          ctx.strokeStyle = rgba([255, 255, 255], 0.6 * flare);
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(sx - sr - 1.5, sy);
          ctx.lineTo(sx + sr + 1.5, sy);
          ctx.moveTo(sx, sy - sr - 1.5);
          ctx.lineTo(sx, sy + sr + 1.5);
          ctx.stroke();
        }
      });
    }

    // 6) frost dusting (winter) — fine pale specks on the upper (lit) surfaces.
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([234, 243, 255], 0.7 * p.frostAmt);
      const specks: Array<[number, number]> = [
        [-12, -2], [-6, -12], [-2, -5], [3, -13], [8, -4],
        [-9, 3], [1, 1], [5, -8],
      ];
      specks.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 7) snow caps sitting on the top rim of the upward grains (winter). The
    //    grains stay clearly visible underneath — NO white-out.
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      const caps: Array<[number, number, number]> = [
        [-2, -16, 6.5], // top grain
        [-10, -1, 5],   // upper-left grain
        [7, -9, 4.5],   // upper-right grain
      ];
      const capGrad = ctx.createLinearGradient(0, -20, 0, -4);
      capGrad.addColorStop(0, rgba([255, 255, 255], a));
      capGrad.addColorStop(1, rgba([219, 230, 242], a));
      ctx.fillStyle = capGrad;
      caps.forEach(([cx, cy, cw]) => {
        ctx.beginPath();
        ctx.ellipse(cx, cy, cw, cw * 0.42, 0, Math.PI, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end pose transform

    // ── Ambient light wash over the whole tile (per-season tint) ──────────────
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

// An asymmetric anticipation→peak→settle curve, 0 at q=0 and q=1.
function anticipate(q: number): number {
  const env = 0.5 * (1 - Math.cos(2 * Math.PI * q)); // 0..1..0, velocity 0 at edges
  const tilt = Math.sin(Math.PI * q) * Math.sin(1.5 * Math.PI * q);
  return env * (0.55 * Math.sin(2 * Math.PI * q) + 0.9 * tilt);
}

/** Build the idle pose from the wall clock. Two tiers:
 *   common FLOAT+SHIMMER every ~6s (win 0.95s),
 *   rare SPARKLE-BURST every ~18s (win 1.2s). */
function poseFromClock(t: number): Pose {
  const pose: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0, glowPulse: 0, sparkPulse: 0 };

  // ── COMMON: gentle float + shimmer (~6s, win 0.95s) ──
  // Lifts ~10–14px with a soft sway and a glow pulse. Seamless at the edges.
  const qC = actionQ(t, 6.0, 0.95, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC); // 0..1..0, zero at edges
    const rise = hump(qC);              // 0..1..0
    pose.bob += -12.0 * rise;           // float up ~12px
    pose.lean += 0.06 * env * Math.sin(qC * Math.PI * 2);
    pose.squashY += 0.05 * rise;        // a touch of stretch at the apex
    pose.squashX += -0.035 * rise;
    pose.glowPulse += 0.35 * rise;      // glow breathes up with the float
    pose.sparkPulse += 0.25 * rise;     // a gentle shimmer
  }

  // ── RARE SPECIAL: sparkle-burst / bigger float (~18s, win 1.2s, phase +3s) ──
  // Anticipation crouch → big float up ~16–20px → settle, glow flares, sparkles
  // flash at the apex.
  const qS = actionQ(t, 18.0, 1.2, 3.0);
  if (qS >= 0) {
    const crouch = qS < 0.18 ? Math.sin((qS / 0.18) * Math.PI) : 0; // 0..1..0
    const airWin = qS >= 0.18 && qS < 0.82 ? (qS - 0.18) / 0.64 : -1;
    const air = airWin >= 0 ? Math.sin(airWin * Math.PI) : 0; // arc up & down
    const landWin = qS >= 0.74 ? Math.min(1, (qS - 0.74) / 0.26) : -1;
    const land = landWin >= 0 ? Math.sin(landWin * Math.PI) : 0; // settle bump

    // bob: brief dip on the crouch, then a big rise (negative = up) ~18px.
    pose.bob += crouch * 1.8 - air * 18.0;
    // squash-stretch: tall+thin at apex, short+wide on crouch & settle.
    pose.squashY += air * 0.22 - crouch * 0.12 - land * 0.14;
    pose.squashX += -air * 0.15 + crouch * 0.10 + land * 0.12;
    // a tiny lean wiggle for life.
    pose.lean += 0.05 * Math.sin(qS * Math.PI * 4) * (1 - Math.abs(2 * qS - 1));
    // glow + sparkle flare hard at the apex (still 0 at the edges).
    const flare = hump(qS);
    pose.glowPulse += 0.85 * flare;
    pose.sparkPulse += 1.0 * flare;
  }

  // Reference anticipate() so it stays part of the seamless-curve toolkit and
  // adds a faint windup tilt to the common float (still 0 at edges).
  if (qC >= 0) {
    pose.lean += 0.015 * anticipate(qC);
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

    // Light additive season micro-dressing (never the subject's own colour /
    // brightness). Kept tiny so the POSE action is the star.
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
        ctx.fillStyle = "rgba(196,96,32,1)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.4, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      // Summer: no extra dressing — the radiant glow + sparkle-float is the show.
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
