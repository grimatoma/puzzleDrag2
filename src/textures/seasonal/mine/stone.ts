// Seasonal art for the STONE mineral tile (`tile_mine_stone`).
//
// A humble rounded GREY FIELDSTONE: one chunky rounded boulder (with a smaller
// stone leaning at its base for read) resting on a low rocky/earth pad. This is
// PLAIN matte stone — NO bright mineral glint or sharp facets — soft cel-shaded
// with a lit upper-left face, a shaded lower-right face, and a soft top
// highlight. The SAME grey boulder silhouette is drawn EVERY season; per the
// Mineral framing only the global light/pad filter, a little spring/summer
// moss/lichen fleck, an autumn fallen leaf, and a winter snow cap + frost
// sparkle change. The stone stays clearly grey underneath all year — no
// white-out in winter.
//
// Enforced by a single parameterized `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle. The
// idle adds only a soft specular light-sweep crossing the top (subtle — matte
// stone, not a gem) plus tiny season dressing; the stone's own brightness is
// constant.
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
  stoneLight: RGB;  // lit upper-left face of the grey stone (LOCKED grey)
  stoneMid: RGB;    // body tone of the stone (LOCKED grey)
  stoneDark: RGB;   // shaded lower-right face / underside (LOCKED grey)
  padTop: RGB;      // top of the rocky/earth pad
  padDark: RGB;     // shaded pad underside
  soil: RGB;        // contact / base soil under the stone
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  topHi: number;    // 0..1 soft top highlight strength on the boulder crown
  contact: number;  // 0..1 contact-shadow strength under the stone (peak=summer)
  mossAmt: number;  // 0..1 moss/lichen fleck at the stone base (spring/summer)
  frostAmt: number; // 0..1 cool frost sparkle on the stone's upward faces
  snowCapAmt: number; // 0..1 snow cap sitting on the boulder's top
  padSnowAmt: number; // 0..1 snow dusting on the pad
  dewAmt: number;   // 0..1 dewy sheen on the stone top + pad (spring)
  fallenLeafAmt: number; // 0..1 a fallen leaf resting against the base (autumn)
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
    stoneLight: lerpRGB(a.stoneLight, b.stoneLight, t),
    stoneMid: lerpRGB(a.stoneMid, b.stoneMid, t),
    stoneDark: lerpRGB(a.stoneDark, b.stoneDark, t),
    padTop: lerpRGB(a.padTop, b.padTop, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    topHi: lerp(a.topHi, b.topHi, t),
    contact: lerp(a.contact, b.contact, t),
    mossAmt: lerp(a.mossAmt, b.mossAmt, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    dewAmt: lerp(a.dewAmt, b.dewAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
  };
}

function clampP(p: P): P {
  return {
    ...p,
    lightAmt: clamp01(p.lightAmt),
    topHi: clamp01(p.topHi),
    contact: clamp01(p.contact),
    mossAmt: clamp01(p.mossAmt),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    dewAmt: clamp01(p.dewAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────
// PALETTE LOCK: the stone stays plain GREY in EVERY season (light ≈ 0x9da3a8,
// dark ≈ 0x3e4348). The stone* colours only get a faint warm/cool/amber nudge
// per the season light; they never change hue identity. Spring is cool damp
// grey, summer warm dry grey (peak contrast), autumn amber-lit grey, winter
// cool blue-grey with snow + frost — the stone is always clearly grey.

const SP: Record<SeasonName, P> = {
  // Spring — cool damp grey, faint dewy sheen on top, a small lime moss patch at
  // the base; bright-ish cool light.
  Spring: {
    stoneLight: [160, 167, 174],
    stoneMid: [112, 118, 125],
    stoneDark: [62, 67, 74],
    padTop: [150, 146, 130],
    padDark: [96, 92, 78],
    soil: [120, 102, 78],
    outline: [40, 44, 50],
    light: [226, 238, 246],
    lightAmt: 0.15,
    topHi: 0.5,
    contact: 0.42,
    mossAmt: 0.55,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    dewAmt: 0.6,
    fallenLeafAmt: 0,
  },
  // Summer — warm dry grey, strongest contact shadow, a tiny ochre lichen speck;
  // warm light (PEAK contrast).
  Summer: {
    stoneLight: [166, 168, 168],
    stoneMid: [116, 119, 121],
    stoneDark: [60, 64, 68],
    padTop: [166, 152, 122],
    padDark: [110, 96, 70],
    soil: [132, 106, 74],
    outline: [42, 44, 48],
    light: [255, 242, 208],
    lightAmt: 0.17,
    topHi: 0.62,
    contact: 0.62,
    mossAmt: 0.3,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    dewAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — amber-lit grey, one fallen leaf resting against the base on the
  // pad; low amber light.
  Autumn: {
    stoneLight: [164, 161, 156],
    stoneMid: [115, 113, 110],
    stoneDark: [62, 61, 60],
    padTop: [156, 140, 96],
    padDark: [108, 94, 60],
    soil: [122, 94, 56],
    outline: [50, 44, 38],
    light: [248, 210, 148],
    lightAmt: 0.2,
    topHi: 0.46,
    contact: 0.5,
    mossAmt: 0.1,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    dewAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — cool blue-grey light; snow cap on the boulder top + frost sparkle
  // on upward faces, snow-dusted pad; the stone stays clearly grey underneath.
  Winter: {
    stoneLight: [158, 166, 178],
    stoneMid: [108, 116, 128],
    stoneDark: [60, 66, 78],
    padTop: [176, 192, 210],
    padDark: [120, 142, 166],
    soil: [124, 116, 108],
    outline: [46, 50, 60],
    light: [208, 228, 252],
    lightAmt: 0.3,
    topHi: 0.4,
    contact: 0.4,
    mossAmt: 0,
    frostAmt: 0.7,
    snowCapAmt: 0.9,
    padSnowAmt: 0.9,
    dewAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Geometry (the SAME silhouette every season) ──────────────────────────────
// Origin-centered. A chunky rounded grey boulder resting low on the pad, with a
// smaller stone leaning at its lower-left for read. Base within ±16 wide.

const ROCK_TOP = -16; // crown of the main boulder
const ROCK_BOT = 17;  // base resting on the pad

/** Trace the chunky ROUNDED main boulder body (smooth, not faceted). The
 *  silhouette is IDENTICAL for all seasons — only fill colours vary. */
function boulderPath(ctx: CanvasRenderingContext2D, bob: number): void {
  const t = ROCK_TOP + bob;
  const b = ROCK_BOT + bob;
  ctx.beginPath();
  // start at lower-left base, sweep clockwise with smooth curves for a rounded
  // fieldstone read (no sharp angular kinks — this is a humble worn boulder)
  ctx.moveTo(-13, b - 1);
  ctx.quadraticCurveTo(-16, b - 8, -14, t + 13);   // bulging lower-left
  ctx.quadraticCurveTo(-12, t + 3, -6, t + 1);      // up to the left of the crown
  ctx.quadraticCurveTo(0, t - 2.5, 7, t + 1);       // over the rounded crown
  ctx.quadraticCurveTo(14, t + 4, 15, t + 13);      // down the right shoulder
  ctx.quadraticCurveTo(16, b - 7, 12, b - 1);       // bulging lower-right
  ctx.quadraticCurveTo(6, b + 2, 0, b + 1.5);       // across the rounded foot
  ctx.quadraticCurveTo(-7, b + 2, -13, b - 1);
  ctx.closePath();
}

// The smaller leaning stone, tucked at the boulder's lower-left for read. Its
// own rounded silhouette, constant for all seasons.
const SMALL_OX = -13.5; // anchor on the pad to the lower-left of the boulder
const SMALL_OY = 13.5;

function smallStonePath(ctx: CanvasRenderingContext2D, bob: number): void {
  const ox = SMALL_OX;
  const oy = SMALL_OY + bob;
  ctx.beginPath();
  ctx.moveTo(ox - 6, oy + 3);
  ctx.quadraticCurveTo(ox - 7.5, oy - 1, ox - 4.5, oy - 4);  // rounded left
  ctx.quadraticCurveTo(ox - 1, oy - 6.5, ox + 3, oy - 4);     // small crown
  ctx.quadraticCurveTo(ox + 6, oy - 1.5, ox + 5, oy + 3);     // rounded right
  ctx.quadraticCurveTo(ox + 1, oy + 4.5, ox - 6, oy + 3);     // foot
  ctx.closePath();
}

// ── Stone-body shading helper (matte cel-shade, reused for both stones) ───────
// Lit upper-left face, shaded lower-right face, soft top highlight. No facets,
// no specular sparkle — plain matte stone.

function shadeStone(
  ctx: CanvasRenderingContext2D,
  p: P,
  cx: number,      // body centre x
  cy: number,      // body centre y
  rx: number,      // body half-width
  ry: number,      // body half-height
  topHiScale: number, // 0..1 extra scale on the top highlight (smaller stone uses less)
): void {
  // base mid tone fills the clipped silhouette
  ctx.fillStyle = rgb(p.stoneMid);
  ctx.fillRect(cx - rx - 4, cy - ry - 4, (rx + 4) * 2, (ry + 4) * 2);

  // lit upper-left face: a soft light pool toward the upper-left
  const litGrad = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
  litGrad.addColorStop(0, rgb(p.stoneLight));
  litGrad.addColorStop(0.5, rgb(p.stoneMid));
  litGrad.addColorStop(1, rgb(p.stoneDark));
  ctx.fillStyle = litGrad;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.22, cy - ry * 0.12, rx + 2, ry * 0.96, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // shaded lower-right face: a darker pool hugging the lower-right
  ctx.fillStyle = rgba(p.stoneDark, 0.55);
  ctx.beginPath();
  ctx.ellipse(cx + rx * 0.34, cy + ry * 0.42, rx * 0.82, ry * 0.72, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // soft top highlight on the crown (matte — broad and gentle, not a glint)
  const hi = clamp01(p.topHi) * topHiScale;
  if (hi > 0.01) {
    ctx.fillStyle = rgba(p.stoneLight, 0.45 * hi);
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.18, cy - ry * 0.62, rx * 0.62, ry * 0.34, -0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  // a couple of faint worn-surface mottles for matte stone character (subtle)
  ctx.fillStyle = rgba(p.stoneDark, 0.18);
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.4, cy + ry * 0.1, rx * 0.22, ry * 0.16, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + rx * 0.18, cy - ry * 0.1, rx * 0.18, ry * 0.14, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // shaded contact at the very bottom to seat the stone
  ctx.fillStyle = rgba(p.stoneDark, 0.5);
  ctx.beginPath();
  ctx.ellipse(cx + 1, cy + ry * 0.84, rx * 0.92, ry * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ── The single parameterized paint ───────────────────────────────────────────

/** The whole tile from ONLY `p` and `bob`. */
function paint(ctx: CanvasRenderingContext2D, raw: P, bob: number): void {
  const p = clampP(raw);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Pad: low flat rocky/earth ellipse, x∈[−18,+18], centre y≈+19 ─────────
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
    // rocky/earth top
    ctx.fillStyle = rgb(p.padTop);
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // scattered pebble specks on the pad (earthy texture, not grass blades)
    ctx.fillStyle = rgba(p.padDark, 0.55);
    const pebbles: Array<[number, number, number]> = [
      [-12, 18.4, 1.2], [-5, 20.6, 0.9], [8, 18.2, 1.1], [13, 19.8, 0.9], [2, 21, 0.8],
    ];
    pebbles.forEach(([px, py, r]) => {
      ctx.beginPath();
      ctx.ellipse(px, py, r, r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // dewy sheen on the pad (spring)
    if (p.dewAmt > 0.01) {
      ctx.fillStyle = rgba([235, 246, 252], 0.28 * p.dewAmt);
      ctx.beginPath();
      ctx.ellipse(-4, 18.4, 12, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // moss/lichen fleck at the stone base (spring = lime moss, summer = ochre
    // lichen via the tween nudging the green toward yellow as mossAmt drops)
    if (p.mossAmt > 0.01) {
      const a = p.mossAmt;
      ctx.fillStyle = rgba([108, 168, 78], 0.5 * a);
      const moss: Array<[number, number, number]> = [
        [-15, 17.6, 3.0], [-2, 20.2, 3.6], [10, 18, 2.6],
      ];
      moss.forEach(([mx, my, r]) => {
        ctx.beginPath();
        ctx.ellipse(mx, my, r, r * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      // a few little grass/lichen tufts poking up at the base
      ctx.strokeStyle = rgba([86, 150, 62], 0.75 * a);
      ctx.lineWidth = 1;
      [-15, -11, 9, 12].forEach((gx, i) => {
        ctx.beginPath();
        ctx.moveTo(gx, 18.2);
        ctx.lineTo(gx + (i % 2 ? 1 : -1), 14.8);
        ctx.stroke();
      });
    }

    // pad snow dusting (winter)
    if (p.padSnowAmt > 0.01) {
      ctx.fillStyle = rgba([244, 250, 255], 0.9 * p.padSnowAmt);
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

    // ── Soil contact patch directly under the stone base ────────────────────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, ROCK_BOT + bob + 1.5, 13, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // one soft contact shadow of the stone on the pad toward lower-right
    // (strength = p.contact; strongest in summer)
    ctx.fillStyle = rgba(p.outline, 0.36 * p.contact + 0.12);
    ctx.beginPath();
    ctx.ellipse(4, ROCK_BOT + bob + 2, 14, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the smaller leaning stone (drawn FIRST, behind the boulder) ──
    // 1) outline pass
    smallStonePath(ctx, bob);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();
    // 2) matte cel-shaded body, clipped to its silhouette
    ctx.save();
    smallStonePath(ctx, bob);
    ctx.clip();
    shadeStone(ctx, p, SMALL_OX, SMALL_OY + bob, 6, 5, 0.7);
    ctx.restore();

    // ── Subject: the main grey boulder (SAME silhouette every season) ───────
    // 1) soft dark outline pass (dark fill first so it reads as a rim)
    boulderPath(ctx, bob);
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // 2) matte cel-shaded body, clipped so shading stays inside the silhouette
    ctx.save();
    boulderPath(ctx, bob);
    ctx.clip();
    const cy = lerp(ROCK_TOP, ROCK_BOT, 0.5) + bob;
    shadeStone(ctx, p, 0.5, cy, 15, (ROCK_BOT - ROCK_TOP) * 0.5, 1.0);

    // frost sparkle on the stone's UPWARD faces (winter) — cool blue speckle,
    // the stone stays clearly grey underneath (no white-out, no bloom)
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.2 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(-1, lerp(ROCK_TOP, ROCK_BOT, 0.3) + bob, 14, (ROCK_BOT - ROCK_TOP) * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([236, 246, 255], 0.65 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-9, ROCK_TOP + 6], [-3, ROCK_TOP + 3], [4, ROCK_TOP + 5], [9, ROCK_TOP + 7],
        [-6, lerp(ROCK_TOP, ROCK_BOT, 0.4)], [6, lerp(ROCK_TOP, ROCK_BOT, 0.42)], [0, lerp(ROCK_TOP, ROCK_BOT, 0.3)],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy + bob, 0.65, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.restore(); // end boulder clip

    // 3) snow cap sitting ON the boulder's top (winter) — drawn over the crown
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      const t = ROCK_TOP + bob;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(-9, t + 6);
      ctx.quadraticCurveTo(-10, t - 1, -5, t + 1);
      ctx.quadraticCurveTo(0, t - 3.5, 7, t + 1);
      ctx.quadraticCurveTo(13, t + 3, 13, t + 8);
      ctx.quadraticCurveTo(8, t + 5.5, 4, t + 6.5);
      ctx.quadraticCurveTo(-2, t + 4.5, -9, t + 6);
      ctx.closePath();
      ctx.fill();
      // soft shaded underside of the cap
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(-0.5, t + 5.5, 9.5, 1.9, 0, 0, Math.PI * 2);
      ctx.fill();
      // a small cap of snow on the leaning stone too
      ctx.fillStyle = rgba([246, 251, 255], 0.92 * a);
      ctx.beginPath();
      const sx = SMALL_OX, sy = SMALL_OY + bob;
      ctx.moveTo(sx - 5, sy - 2.5);
      ctx.quadraticCurveTo(sx - 1, sy - 6, sx + 3.5, sy - 3.5);
      ctx.quadraticCurveTo(sx + 1, sy - 1.5, sx - 5, sy - 2.5);
      ctx.closePath();
      ctx.fill();
    }

    // ── Fallen leaf resting against the base on the pad (autumn) ────────────
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      // one hero leaf leaning on the lower-right of the boulder, plus a tiny one
      const leaves: Array<[number, number, number, RGB]> = [
        [11, ROCK_BOT + bob - 1, 0.55, [196, 120, 40]],
        [-16, ROCK_BOT + bob + 0.5, -0.5, [176, 72, 32]],
      ];
      leaves.forEach(([lx, ly, rot, col], idx) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgba(col, a);
        ctx.beginPath();
        ctx.ellipse(0, 0, idx === 0 ? 3.6 : 2.6, idx === 0 ? 2.0 : 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba([90, 44, 16], a);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(idx === 0 ? -3.4 : -2.4, 0);
        ctx.lineTo(idx === 0 ? 3.4 : 2.4, 0);
        ctx.stroke();
        ctx.restore();
      });
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

// ── Idle bob (seamless, zero-velocity at t=0) ────────────────────────────────

// A*(1-cos(w t))*0.5 → 0 at t=0 with zero velocity; period 2π/w.
function bobAt(t: number, amp = 0.6, w = 1.3): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    // The subject bob is 0 at t=0; the micro-motion below is additive dressing.
    paint(ctx, SP[season], bob);

    ctx.save();
    try {
      ctx.globalAlpha = 1;

      // Shared: a very soft specular LIGHT-SWEEP crosses the boulder's top every
      // season (subtle — matte stone, not a gem). A faint elongated highlight
      // travels left→right across the crown and fades in/out so there is no pop.
      const prog = (t * 0.32) % 1;
      const sx = lerp(-9, 9, prog);
      const sy = ROCK_TOP + bob + 3 + (prog - 0.5) * (prog - 0.5) * 6; // arcs over the rounded crown
      const fade = Math.sin(prog * Math.PI);
      let sweepA = 0.16;
      if (season === "Summer") sweepA = 0.24;        // strongest in dry summer light
      else if (season === "Spring") sweepA = 0.2;    // damp dewy sheen reads a touch brighter
      else if (season === "Autumn") sweepA = 0.15;   // low amber light, gentle
      else sweepA = 0.18;                            // winter cold sheen
      const sweepCol = season === "Winter" ? "224,238,255" : season === "Autumn" ? "255,236,196" : "255,255,255";
      ctx.fillStyle = `rgba(${sweepCol},${sweepA * fade})`;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(-0.18);
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.2, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint on the dewy pad
        const g = 0.18 + 0.24 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(235,248,255,${g})`;
        ctx.beginPath();
        ctx.arc(-7, 18.4 + Math.sin(t * 1.1) * 0.5, 1.0 + g * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // the fallen leaf stirs gently against the base (seamless small rock)
        const sway = Math.sin(t * 1.4) * 0.2;
        ctx.save();
        ctx.translate(11, ROCK_BOT + bob - 1);
        ctx.rotate(0.55 + sway);
        ctx.fillStyle = "rgba(196,120,40,0.9)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.6, 2.0, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(90,44,16,0.9)";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-3.4, 0);
        ctx.lineTo(3.4, 0);
        ctx.stroke();
        ctx.restore();
      } else if (season === "Winter") {
        // a single drifting snowflake + a faint cold sheen on the snow cap
        const flProg = (t / 3.2) % 1;
        const fy = -22 + flProg * 38;
        const fx = -1 + Math.sin(flProg * Math.PI * 2) * 3;
        ctx.globalAlpha = 0.4 + 0.45 * Math.sin(flProg * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(fx, fy, 1.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.08 + 0.07 * (0.5 + 0.5 * Math.sin(t * 0.8));
        ctx.fillStyle = "rgba(210,232,255,1)";
        ctx.beginPath();
        ctx.ellipse(-0.5, ROCK_TOP + bob + 5, 9, 2.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // Summer's stronger sweep is already handled above by sweepA.
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
