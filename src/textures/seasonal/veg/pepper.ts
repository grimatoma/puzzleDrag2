// Seasonal art for the BELL PEPPER vegetable tile (`tile_veg_pepper`).
//
// A single glossy bell pepper sitting low-centre on a grassy pad. The SAME
// blocky 3–4 lobe silhouette is drawn every season — only colour and dressing
// (frost, snow cap, pad blossoms / fallen leaves / snow, light tint, gloss)
// change. This is enforced by a single parameterized `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
//
// Origin-centered in the −24..+24 design box, light from upper-left, flat
// cel-shaded with a soft dark outline. Pure Canvas-2D vector drawing.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable params ─────────────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly. */
interface P {
  skinLight: RGB;   // lit face of the pepper skin
  skinMid: RGB;     // body tone
  skinDark: RGB;    // shadowed lobes / underside
  stem: RGB;        // stem + calyx
  padGrass: RGB;    // top of the grass pad
  padDark: RGB;     // shaded pad underside
  soil: RGB;        // contact / base soil under the pepper
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  ripeness: number; // 0..1 (informs nothing structural; reserved colour cue)
  gloss: number;    // 0..1 specular gloss-streak strength on the skin
  frostAmt: number; // 0..1 cool frost dusting on the skin
  snowCapAmt: number; // 0..1 snow on the shoulders of the pepper
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad (autumn)
}

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
    ripeness: lerp(a.ripeness, b.ripeness, t),
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
    ripeness: clamp01(p.ripeness),
    gloss: clamp01(p.gloss),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — fresh pastel; green unripe pepper; bright lime dewy pad + blossom.
  Spring: {
    skinLight: [150, 210, 96],
    skinMid: [96, 170, 64],
    skinDark: [54, 116, 44],
    stem: [104, 158, 58],
    padGrass: [128, 206, 86],
    padDark: [72, 138, 58],
    soil: [120, 84, 48],
    outline: [40, 64, 30],
    light: [232, 244, 226],
    lightAmt: 0.16,
    ripeness: 0.15,
    gloss: 0.18,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — richest saturated peak; full glossy RED; warm light, strong gloss.
  Summer: {
    skinLight: [248, 96, 70],
    skinMid: [214, 46, 40],
    skinDark: [150, 22, 28],
    stem: [86, 150, 50],
    padGrass: [86, 168, 70],
    padDark: [44, 110, 48],
    soil: [126, 86, 48],
    outline: [86, 18, 22],
    light: [255, 240, 206],
    lightAmt: 0.18,
    ripeness: 0.75,
    gloss: 0.95,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — deeper darker ripe red; gold/rust pad; a couple fallen leaves.
  Autumn: {
    skinLight: [212, 76, 52],
    skinMid: [172, 38, 34],
    skinDark: [108, 22, 26],
    stem: [122, 124, 56],
    padGrass: [150, 152, 86],
    padDark: [104, 96, 52],
    soil: [120, 80, 44],
    outline: [70, 18, 20],
    light: [248, 210, 150],
    lightAmt: 0.2,
    ripeness: 1.0,
    gloss: 0.45,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — cool blue-grey light; frost-dusted red pepper, snow cap, pad snow.
  Winter: {
    skinLight: [196, 84, 70],
    skinMid: [158, 48, 50],
    skinDark: [98, 34, 44],
    stem: [108, 122, 86],
    padGrass: [176, 196, 214],
    padDark: [120, 146, 172],
    soil: [128, 110, 96],
    outline: [56, 40, 52],
    light: [206, 226, 252],
    lightAmt: 0.3,
    ripeness: 0.9,
    gloss: 0.25,
    frostAmt: 0.7,
    snowCapAmt: 0.85,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── The single parameterized paint ───────────────────────────────────────────

// Pepper geometry constants (the SAME silhouette every season). Body sits low
// on the pad, ~45–55% of design-box height. Origin-centered.
const PEP_TOP = -10; // shoulder line
const PEP_BOT = 16; // base resting on the pad
const PEP_HALF = 13; // half-width of the body

// Lobe centres along the bottom (x offsets) for the 3–4 rounded lobes.
const LOBES: number[] = [-8.5, -2.8, 3.2, 9];

/** Trace the chunky blocky bell-pepper body path into the current ctx path. */
function pepperBodyPath(ctx: CanvasRenderingContext2D, bob: number): void {
  const t = PEP_TOP + bob;
  const b = PEP_BOT + bob;
  const h = PEP_HALF;
  ctx.beginPath();
  // start at left shoulder
  ctx.moveTo(-h * 0.78, t + 2);
  // round the top-left shoulder up toward the stem neck
  ctx.quadraticCurveTo(-h * 0.7, t - 4, -3.4, t - 5.4);
  ctx.quadraticCurveTo(0, t - 6.6, 3.4, t - 5.4);
  ctx.quadraticCurveTo(h * 0.7, t - 4, h * 0.78, t + 2);
  // right side bulging out
  ctx.quadraticCurveTo(h + 1, lerp(t, b, 0.45), h * 0.92, b - 5);
  // bottom-right lobe
  ctx.quadraticCurveTo(h * 0.82, b + 1.5, 9, b - 1);
  ctx.quadraticCurveTo(6.6, b + 2.4, 3.2, b - 0.5);
  // bottom-middle lobes
  ctx.quadraticCurveTo(0.3, b + 2.6, -2.8, b - 0.5);
  ctx.quadraticCurveTo(-6, b + 2.4, -8.5, b - 1);
  // bottom-left lobe
  ctx.quadraticCurveTo(-h * 0.82, b + 1.5, -h * 0.92, b - 5);
  // left side back up to shoulder
  ctx.quadraticCurveTo(-h - 1, lerp(t, b, 0.45), -h * 0.78, t + 2);
  ctx.closePath();
}

/** The whole tile from ONLY `p` and `bob`. */
function paint(ctx: CanvasRenderingContext2D, raw: P, bob: number): void {
  const p = clampP(raw);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Pad: low flat grass ellipse, x∈[−18,+18], centre y≈+19 ──────────────
    // soft contact shadow lower-right, pad colour from P
    ctx.fillStyle = rgba(p.padDark, 0.4);
    ctx.beginPath();
    ctx.ellipse(3, 21.5, 16, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // shaded underside
    ctx.fillStyle = rgb(p.padDark);
    ctx.beginPath();
    ctx.ellipse(0, 20.4, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // grass top
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
      // sparkle on the snow
      ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.padSnowAmt);
      [[-9, 17.6], [5, 19], [11, 17.4], [-3, 20]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // blossoms on the pad (spring)
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

    // fallen leaves on the pad (autumn)
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const leaves: Array<[number, number, number, RGB]> = [
        [-12, 19.6, -0.5, [196, 120, 40]],
        [12, 18.6, 0.7, [176, 72, 32]],
      ];
      leaves.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgba(col, a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.2, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba([90, 44, 16], a);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.lineTo(3, 0);
        ctx.stroke();
        ctx.restore();
      });
    }

    // ── Soil contact patch directly under the pepper base ───────────────────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, PEP_BOT + bob + 1.5, 9, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // contact shadow of the pepper on the pad
    ctx.fillStyle = rgba(p.outline, 0.28);
    ctx.beginPath();
    ctx.ellipse(2.5, PEP_BOT + bob + 2, 11, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the bell pepper (SAME silhouette every season) ─────────────
    // 1) soft dark outline pass (drawn slightly fatter, dark first then light)
    pepperBodyPath(ctx, bob);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // 2) mid body fill, inset a touch so the outline shows as a rim
    ctx.save();
    pepperBodyPath(ctx, bob);
    ctx.clip();

    const top = PEP_TOP + bob;
    const bot = PEP_BOT + bob;

    // base mid tone
    ctx.fillStyle = rgb(p.skinMid);
    ctx.fillRect(-PEP_HALF - 3, top - 8, (PEP_HALF + 3) * 2, bot - top + 14);

    // light from upper-left: a lit panel on the left/upper face
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

    // lobe creases — vertical shading grooves between the lobes (dark)
    ctx.strokeStyle = rgba(p.skinDark, 0.85);
    ctx.lineWidth = 2.2;
    LOBES.forEach((lx, i) => {
      if (i === 0) return; // crease sits between lobes
      const cx = (LOBES[i - 1] + lx) / 2;
      ctx.beginPath();
      ctx.moveTo(cx + 1.4, top + 1);
      ctx.quadraticCurveTo(cx, lerp(top, bot, 0.55), cx, bot - 1.5);
      ctx.stroke();
    });
    // a couple of brighter vertical gloss creases (catch light between grooves)
    ctx.strokeStyle = rgba(p.skinLight, 0.5);
    ctx.lineWidth = 1.3;
    [-6.4, 0.2, 6.2].forEach((cx) => {
      ctx.beginPath();
      ctx.moveTo(cx - 1.2, top + 1);
      ctx.quadraticCurveTo(cx - 1.6, lerp(top, bot, 0.5), cx - 1.4, bot - 3);
      ctx.stroke();
    });

    // bottom-lobe shadows to round the base
    ctx.fillStyle = rgba(p.skinDark, 0.55);
    LOBES.forEach((lx) => {
      ctx.beginPath();
      ctx.ellipse(lx, bot - 2.5, 3.2, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // strong vertical specular gloss streaks (gloss strength from P)
    if (p.gloss > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.16 + 0.6 * p.gloss);
      // primary streak on the upper-left lit shoulder
      ctx.beginPath();
      ctx.ellipse(-5.5, lerp(top, bot, 0.34), 1.7, (bot - top) * 0.28, -0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([255, 255, 255], 0.1 + 0.4 * p.gloss);
      // secondary thinner streak
      ctx.beginPath();
      ctx.ellipse(1.5, lerp(top, bot, 0.3), 1.0, (bot - top) * 0.22, -0.05, 0, Math.PI * 2);
      ctx.fill();
    }

    // frost dusting (winter) — cool blue speckle on the upward skin
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

    ctx.restore(); // end clip

    // 3) snow cap on the shoulders (winter) — drawn over, hugging the top rim
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(-PEP_HALF * 0.7, top + 1);
      ctx.quadraticCurveTo(-4, top - 6, 0, top - 4.5);
      ctx.quadraticCurveTo(4, top - 6, PEP_HALF * 0.7, top + 1);
      ctx.quadraticCurveTo(6, top + 3.5, 2, top + 2);
      ctx.quadraticCurveTo(0, top + 4, -2, top + 2);
      ctx.quadraticCurveTo(-6, top + 3.5, -PEP_HALF * 0.7, top + 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(0, top + 1.6, PEP_HALF * 0.62, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Stem + small green calyx cap (SAME placement every season) ──────────
    const stemBaseY = top - 3.5;
    // calyx — a small star-ish green cap hugging the shoulders
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
    // calyx outline
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // short upright stem
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
    // stem highlight
    ctx.strokeStyle = rgba(p.skinLight, 0.4);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-1.1, stemBaseY - 1);
    ctx.quadraticCurveTo(-1.4, stemBaseY - 5, -0.4, stemBaseY - 7.5);
    ctx.stroke();

    // ── Ambient light wash over the whole tile (per-season tint) ────────────
    if (p.lightAmt > 0.001) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = rgba(p.light, p.lightAmt);
      // soft upper-left bias so it reads as directional light, not a flat veil
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

// ── Idle bob (seamless, zero-velocity at t=0) ────────────────────────────────

// A*(1-cos(w t))*0.5 → 0 at t=0 with zero velocity; period 2π/w.
function bobAt(t: number, amp = 0.9, w = 1.5): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    // Per-season additive micro-motion drawn UNDER/OVER the static paint.
    // The subject bob itself is 0 at t=0; micro-motion is additive sparkle/sheen.
    paint(ctx, SP[season], bob);

    ctx.save();
    try {
      ctx.globalAlpha = 1;
      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint that travels gently on the skin
        const g = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        const gy = -2 + bob + Math.sin(t * 1.1) * 1.2;
        ctx.beginPath();
        ctx.arc(-5, gy, 1.1 + g * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // bright gloss streak travels DOWN the lobes (seamless via fract)
        const prog = (t * 0.5) % 1;
        const top = PEP_TOP + bob;
        const bot = PEP_BOT + bob;
        const gy = lerp(top + 1, bot - 2, prog);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.ellipse(-5, gy, 1.5, 2.6, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.beginPath();
        ctx.ellipse(1.5, gy * 0.96, 1.0, 1.9, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // faint slow sheen pulsing on the shoulder
        const s = 0.12 + 0.16 * (0.5 + 0.5 * Math.sin(t * 0.9));
        ctx.fillStyle = `rgba(255,236,200,${s})`;
        ctx.beginPath();
        ctx.ellipse(-4, -4 + bob, 4.5, 3.2, -0.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Winter — drifting snowflakes + cold sheen
        const seeds: Array<[number, number, number]> = [
          [-9, 0.0, 1.0], [6, 0.4, 0.9], [11, 0.7, 0.8], [-2, 0.25, 0.9],
        ];
        ctx.fillStyle = "#ffffff";
        seeds.forEach(([fx, phase, r]) => {
          const prog = ((t / 3.0 + phase) % 1 + 1) % 1;
          const fy = -22 + prog * 38;
          const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
          ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.arc(dx, fy, r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 0.12 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.8));
        ctx.fillStyle = "rgba(210,232,255,1)";
        ctx.beginPath();
        ctx.ellipse(-3, 0 + bob, 6, 4, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    } finally {
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  };
}

// ── Forward season→season transitions ────────────────────────────────────────

function makeTransition(fromIdx: 0 | 1 | 2): (ctx: CanvasRenderingContext2D, p: number) => void {
  const from = SP[SEASON_NAMES[fromIdx]];
  const to = SP[SEASON_NAMES[fromIdx + 1]];
  return (ctx, pp) => {
    const k = smoother(clamp01(pp));
    paint(ctx, lerpP(from, to, k), 0);
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
