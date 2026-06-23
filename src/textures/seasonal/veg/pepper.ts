// Production seasonal art for the BELL PEPPER vegetable tile (`tile_veg_pepper`).
//
// A single glossy bell pepper sitting low-centre on a grassy pad. The SAME
// glossy bell pepper is drawn every season (identity-safe), but the seasons
// swing hard on colour + a real seasonal prop (blossom / fallen leaf / snow cap
// + base snow), and the idle is lively rather than subtle:
//
//   IDLE COMMON  (~6s, win ~0.9s): a side-to-side WOBBLE — the pepper rocks/leans
//       ~10–12 design-px at the tip with a squash at the base. Anticipation →
//       peak → settle, zero velocity at the window edges (seamless).
//   IDLE SPECIAL (~18s, win ~1.1s): a bigger SHAKE/BOUNCE — a squash-stretch hop
//       ~12–14 design-px up, with anticipation crouch, stretch on the way up, and
//       a squash landing that overshoots then settles.
//
// The architecture is a single parameterized `paint(ctx, p, pose)` where
// `interface P` holds tweenable season params (colours + prop amounts) and
// `pose` holds the idle gesture (bob / lean / squash). Because every season is
// the same paint with tweened P, transitions are seamless:
//   transition(0) ≡ draw(from), transition(1) ≡ draw(to).
// REST pose has all zeros, so draw(season) = paint(ctx, SP[season], REST) and the
// idle's pose is 0 at every action-window edge → seamless loop.
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
  skinLight: RGB;        // lit face of the pepper skin
  skinMid: RGB;          // body tone
  skinDark: RGB;         // shadowed lobes / underside
  stem: RGB;             // stem + calyx
  padGrass: RGB;         // top of the grass pad
  padDark: RGB;          // shaded pad underside
  soil: RGB;             // contact / base soil under the pepper
  outline: RGB;          // soft dark outline tint
  light: RGB;            // ambient light tint laid over the whole tile
  lightAmt: number;      // 0..1 strength of the ambient light wash
  gloss: number;         // 0..1 specular gloss-streak strength on the skin
  frostAmt: number;      // 0..1 cool frost dusting on the skin (winter)
  snowCapAmt: number;    // 0..1 snow cap on the pepper shoulders (winter)
  padSnowAmt: number;    // 0..1 snow blanket at the base / on the pad (winter)
  blossomAmt: number;    // 0..1 blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad (autumn)
}

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number;     // vertical offset in design px (negative = up)
  lean: number;    // top-of-pepper sway, radians (rock side to side)
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
    skinLight: lerpRGB(a.skinLight, b.skinLight, t),
    skinMid: lerpRGB(a.skinMid, b.skinMid, t),
    skinDark: lerpRGB(a.skinDark, b.skinDark, t),
    stem: lerpRGB(a.stem, b.stem, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    gloss: lerp(a.gloss, b.gloss, t),
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
  // Spring — clearly GREEN unripe pepper, dewy lime pad, prominent blossom.
  Spring: {
    skinLight: [168, 224, 96],
    skinMid: [86, 178, 56],
    skinDark: [40, 116, 38],
    stem: [104, 162, 56],
    padGrass: [126, 214, 84],
    padDark: [64, 146, 56],
    soil: [120, 84, 48],
    outline: [30, 70, 26],
    light: [228, 248, 214],
    lightAmt: 0.18,
    gloss: 0.22,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 1.0,
    fallenLeafAmt: 0,
  },
  // Summer — vivid glossy RED peak, bright warm light, max gloss.
  Summer: {
    skinLight: [255, 104, 76],
    skinMid: [228, 40, 36],
    skinDark: [150, 18, 26],
    stem: [80, 156, 46],
    padGrass: [80, 178, 70],
    padDark: [40, 116, 50],
    soil: [128, 88, 48],
    outline: [92, 14, 20],
    light: [255, 244, 200],
    lightAmt: 0.2,
    gloss: 1.0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — deep darker red, dulled gloss, amber pad + a fallen leaf.
  Autumn: {
    skinLight: [196, 64, 42],
    skinMid: [150, 30, 30],
    skinDark: [88, 16, 22],
    stem: [134, 120, 52],
    padGrass: [160, 150, 78],
    padDark: [108, 88, 46],
    soil: [120, 78, 42],
    outline: [60, 14, 16],
    light: [250, 198, 132],
    lightAmt: 0.24,
    gloss: 0.32,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1.0,
  },
  // Winter — cool blue-grey light; frost-dusted RED pepper still clearly red,
  // a bold snow cap on top + a snow drift at the base.
  Winter: {
    skinLight: [202, 86, 74],
    skinMid: [164, 50, 52],
    skinDark: [98, 32, 44],
    stem: [110, 124, 92],
    padGrass: [182, 202, 220],
    padDark: [122, 150, 178],
    soil: [132, 116, 102],
    outline: [50, 38, 54],
    light: [200, 224, 255],
    lightAmt: 0.34,
    gloss: 0.28,
    frostAmt: 0.78,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Pepper geometry — the SAME silhouette every season ───────────────────────

const PEP_TOP = -10; // shoulder line
const PEP_BOT = 16;  // base resting on the pad
const PEP_HALF = 13; // half-width of the body
const PEP_PIVOT_Y = PEP_BOT - 1; // rock/lean about a point near the base

const LOBES: number[] = [-8.5, -2.8, 3.2, 9];

/** Trace the chunky blocky bell-pepper body path (origin-local, unposed). */
function pepperBodyPath(ctx: CanvasRenderingContext2D): void {
  const t = PEP_TOP;
  const b = PEP_BOT;
  const h = PEP_HALF;
  ctx.beginPath();
  ctx.moveTo(-h * 0.78, t + 2);
  ctx.quadraticCurveTo(-h * 0.7, t - 4, -3.4, t - 5.4);
  ctx.quadraticCurveTo(0, t - 6.6, 3.4, t - 5.4);
  ctx.quadraticCurveTo(h * 0.7, t - 4, h * 0.78, t + 2);
  ctx.quadraticCurveTo(h + 1, lerp(t, b, 0.45), h * 0.92, b - 5);
  ctx.quadraticCurveTo(h * 0.82, b + 1.5, 9, b - 1);
  ctx.quadraticCurveTo(6.6, b + 2.4, 3.2, b - 0.5);
  ctx.quadraticCurveTo(0.3, b + 2.6, -2.8, b - 0.5);
  ctx.quadraticCurveTo(-6, b + 2.4, -8.5, b - 1);
  ctx.quadraticCurveTo(-h * 0.82, b + 1.5, -h * 0.92, b - 5);
  ctx.quadraticCurveTo(-h - 1, lerp(t, b, 0.45), -h * 0.78, t + 2);
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

    // ── Contact shadow under the pepper (follows the bob/lean for grounding) ──
    const tipShift = pose.lean * (PEP_PIVOT_Y - PEP_TOP); // how far the tip leans
    const shadowSpread = 1 + clamp01(pose.bob < 0 ? -pose.bob / 14 : 0) * 0.5;
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0 + tipShift * 0.18, PEP_BOT + 1.5, 9 * shadowSpread, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.28 / shadowSpread);
    ctx.beginPath();
    ctx.ellipse(2.5 + tipShift * 0.2, PEP_BOT + 2, 11 * shadowSpread, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the bell pepper, under the idle pose transform ──────────────
    ctx.save();
    // Pivot near the base so lean rocks the TOP side-to-side and squash anchors
    // at the base (it "sits" on the pad). bob raises the whole body.
    ctx.translate(0, PEP_PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(0, -PEP_PIVOT_Y);

    // 1) soft dark outline pass
    pepperBodyPath(ctx);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // 2) mid body fill, clipped to the body
    ctx.save();
    pepperBodyPath(ctx);
    ctx.clip();

    const top = PEP_TOP;
    const bot = PEP_BOT;

    ctx.fillStyle = rgb(p.skinMid);
    ctx.fillRect(-PEP_HALF - 3, top - 8, (PEP_HALF + 3) * 2, bot - top + 14);

    // light from upper-left: a lit panel
    const litGrad = ctx.createLinearGradient(-PEP_HALF, top - 4, PEP_HALF, bot);
    litGrad.addColorStop(0, rgb(p.skinLight));
    litGrad.addColorStop(0.45, rgb(p.skinMid));
    litGrad.addColorStop(1, rgb(p.skinDark));
    ctx.fillStyle = litGrad;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.ellipse(-2, lerp(top, bot, 0.42), PEP_HALF + 2, (bot - top) * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // lobe creases — dark grooves between lobes
    ctx.strokeStyle = rgba(p.skinDark, 0.85);
    ctx.lineWidth = 2.2;
    LOBES.forEach((lx, i) => {
      if (i === 0) return;
      const cx = (LOBES[i - 1] + lx) / 2;
      ctx.beginPath();
      ctx.moveTo(cx + 1.4, top + 1);
      ctx.quadraticCurveTo(cx, lerp(top, bot, 0.55), cx, bot - 1.5);
      ctx.stroke();
    });
    // brighter gloss creases
    ctx.strokeStyle = rgba(p.skinLight, 0.5);
    ctx.lineWidth = 1.3;
    [-6.4, 0.2, 6.2].forEach((cx) => {
      ctx.beginPath();
      ctx.moveTo(cx - 1.2, top + 1);
      ctx.quadraticCurveTo(cx - 1.6, lerp(top, bot, 0.5), cx - 1.4, bot - 3);
      ctx.stroke();
    });

    // bottom-lobe shadows
    ctx.fillStyle = rgba(p.skinDark, 0.55);
    LOBES.forEach((lx) => {
      ctx.beginPath();
      ctx.ellipse(lx, bot - 2.5, 3.2, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // strong vertical specular gloss streaks
    if (p.gloss > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.16 + 0.6 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(-5.5, lerp(top, bot, 0.34), 1.7, (bot - top) * 0.28, -0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([255, 255, 255], 0.1 + 0.4 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(1.5, lerp(top, bot, 0.3), 1.0, (bot - top) * 0.22, -0.05, 0, Math.PI * 2);
      ctx.fill();
    }

    // frost dusting (winter)
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.28 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(-1, lerp(top, bot, 0.28), PEP_HALF, (bot - top) * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-8, top + 2], [-3, top + 1], [3, top + 2.5], [8, top + 3],
        [-6, lerp(top, bot, 0.4)], [5, lerp(top, bot, 0.45)], [0, lerp(top, bot, 0.3)],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end body clip

    // 3) snow cap on the shoulders (winter)
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(-PEP_HALF * 0.72, top + 1.5);
      ctx.quadraticCurveTo(-4, top - 7, 0, top - 5.5);
      ctx.quadraticCurveTo(4, top - 7, PEP_HALF * 0.72, top + 1.5);
      ctx.quadraticCurveTo(6.5, top + 4, 2, top + 2.4);
      ctx.quadraticCurveTo(0, top + 4.6, -2, top + 2.4);
      ctx.quadraticCurveTo(-6.5, top + 4, -PEP_HALF * 0.72, top + 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(0, top + 1.9, PEP_HALF * 0.64, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Stem + calyx (rides with the pose transform) ─────────────────────────
    const stemBaseY = top - 3.5;
    ctx.fillStyle = rgb(p.stem);
    ctx.beginPath();
    ctx.moveTo(-5.4, stemBaseY + 2);
    ctx.quadraticCurveTo(-3, stemBaseY - 1, -1.4, stemBaseY + 1.4);
    ctx.quadraticCurveTo(0, stemBaseY - 1, 1.4, stemBaseY + 1.4);
    ctx.quadraticCurveTo(3, stemBaseY - 1, 5.4, stemBaseY + 2);
    ctx.quadraticCurveTo(2.5, stemBaseY + 3.2, 0, stemBaseY + 2.6);
    ctx.quadraticCurveTo(-2.5, stemBaseY + 3.2, -5.4, stemBaseY + 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 1.1;
    ctx.stroke();

    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(-0.3, stemBaseY + 0.5);
    ctx.quadraticCurveTo(-0.8, stemBaseY - 5, 0.6, stemBaseY - 8);
    ctx.stroke();
    ctx.strokeStyle = rgb(p.stem);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-0.3, stemBaseY + 0.5);
    ctx.quadraticCurveTo(-0.8, stemBaseY - 5, 0.6, stemBaseY - 8);
    ctx.stroke();
    ctx.strokeStyle = rgba(p.skinLight, 0.4);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-1.1, stemBaseY - 1);
    ctx.quadraticCurveTo(-1.4, stemBaseY - 5, -0.4, stemBaseY - 7.5);
    ctx.stroke();

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
// sin^2(pi q) → smooth in/out, peak at q=0.5.
function hump(q: number): number {
  const s = Math.sin(Math.PI * q);
  return s * s;
}

// An asymmetric anticipation→peak→settle curve, 0 at q=0 and q=1.
// Dips slightly negative early (anticipation) then a strong positive peak.
function anticipate(q: number): number {
  // windup wave: a small negative lobe then a big positive lobe, both returning
  // to zero at the edges. (1-cos) envelope keeps velocity zero at q=0,1.
  const env = 0.5 * (1 - Math.cos(2 * Math.PI * q)); // 0..1..0, but velocity 0 at edges
  const tilt = Math.sin(Math.PI * q) * Math.sin(1.5 * Math.PI * q);
  return env * (0.55 * Math.sin(2 * Math.PI * q) + 0.9 * tilt);
}

/** Build the idle pose from the wall clock. Two tiers:
 *   common WOBBLE every ~6s (win 0.9s), rare BOUNCE every ~18s (win 1.1s). */
function poseFromClock(t: number): Pose {
  const pose: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0 };

  // ── COMMON: side-to-side wobble (~6s, win 0.9s) ──
  // Two rocks left→right→left, ~0.16 rad lean → tip travels ~ pivotArm*0.16.
  // Tip arm ≈ (PEP_PIVOT_Y - PEP_TOP) ≈ 25 px → ~10–12 px sway at the tip.
  const qC = actionQ(t, 6.0, 0.9, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC); // 0..1..0, zero at edges
    const rock = Math.sin(qC * Math.PI * 3); // 1.5 rocks within the window
    pose.lean += 0.17 * env * rock;
    // little squat at the base as it rocks (settle weight side to side)
    pose.squashY += -0.06 * hump(qC);
    pose.squashX += 0.05 * hump(qC);
  }

  // ── RARE SPECIAL: squash-stretch BOUNCE hop (~18s, win 1.1s) ──
  // Anticipation crouch → stretch up ~12–14px → squash landing → settle.
  const qS = actionQ(t, 18.0, 1.1, 3.0); // phase 3s so it doesn't collide w/ wobble
  if (qS >= 0) {
    // Hop height profile: brief crouch (q<0.18), launch arc, squash landing.
    const crouch = qS < 0.18 ? Math.sin((qS / 0.18) * Math.PI) : 0; // 0..1..0
    const airWin = qS >= 0.18 && qS < 0.82 ? (qS - 0.18) / 0.64 : -1;
    const air = airWin >= 0 ? Math.sin(airWin * Math.PI) : 0; // arc up & down
    const landWin = qS >= 0.74 ? Math.min(1, (qS - 0.74) / 0.26) : -1;
    const land = landWin >= 0 ? Math.sin(landWin * Math.PI) : 0; // squash bump

    // bob: crouch dips down a touch, then a big rise (negative = up) ~13px.
    pose.bob += crouch * 1.6 - air * 13.0;
    // squash-stretch: tall+thin at apex, short+wide on crouch & landing.
    const apex = air; // 0..1 in the air
    pose.squashY += apex * 0.20 - crouch * 0.12 - land * 0.16;
    pose.squashX += -apex * 0.14 + crouch * 0.10 + land * 0.14;
    // a tiny lean wiggle on the way down for life
    pose.lean += 0.05 * Math.sin(qS * Math.PI * 4) * (1 - Math.abs(2 * qS - 1));
  }

  // Reference anticipate() so it stays part of the seamless-curve toolkit and
  // contributes a faint windup tilt to the common wobble (still 0 at edges).
  if (qC >= 0) {
    pose.lean += 0.02 * anticipate(qC);
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
        ctx.fillStyle = "rgba(196,96,32,1)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.4, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      // Summer: no extra dressing — the bounce + glossy red is the show.
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
