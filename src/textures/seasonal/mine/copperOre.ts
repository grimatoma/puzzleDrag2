// Seasonal art for the COPPER ORE mineral tile (`tile_mine_copper_ore`).
//
// A chunky grey HOST ROCK veined with bright COPPER-ORANGE metal and flecked
// with teal-green patina, sitting on a low rocky/earth pad. The SAME boulder +
// vein silhouette is drawn every season — only colours and small dressing
// (moss fleck, fallen leaf, snow cap, frost, pad snow, light tint) change. Per
// the Mineral framing the seasonal change is mostly the global light/pad
// filter: the copper's own colour is LOCKED and stays bright orange (with its
// teal patina flecks) and clearly visible all year; the grey host rock stays
// grey.
//
// Enforced by a single parameterized `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
//
// Origin-centered in the −24..+24 design box, light from upper-left, soft
// shadow lower-right, flat cel-shaded with a soft dark outline. Pure Canvas-2D
// vector drawing.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable params ─────────────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly. */
interface P {
  rockLight: RGB;   // lit face of the grey host rock
  rockMid: RGB;     // body tone of the rock
  rockDark: RGB;    // shadowed underside / clefts
  copperLight: RGB; // bright lit copper highlight (LOCKED across seasons)
  copperMid: RGB;   // copper body tone (LOCKED across seasons)
  copperDark: RGB;  // shadowed deep copper (LOCKED across seasons)
  patina: RGB;      // teal-green patina flecks (LOCKED across seasons)
  padTop: RGB;      // top of the rocky/earth pad
  padDark: RGB;     // shaded pad underside
  soil: RGB;        // contact / base soil under the rock
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  copperShine: number; // 0..1 specular gloss on the copper veins/nuggets
  mossAmt: number;  // 0..1 moss/grass fleck at the rock base (spring/summer)
  frostAmt: number; // 0..1 cool frost dusting on the rock
  snowCapAmt: number; // 0..1 snow cap on the rock's upward surfaces
  padSnowAmt: number; // 0..1 snow dusting on the pad
  dewAmt: number;   // 0..1 dewy sheen on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf resting on the pad (autumn)
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
    rockLight: lerpRGB(a.rockLight, b.rockLight, t),
    rockMid: lerpRGB(a.rockMid, b.rockMid, t),
    rockDark: lerpRGB(a.rockDark, b.rockDark, t),
    copperLight: lerpRGB(a.copperLight, b.copperLight, t),
    copperMid: lerpRGB(a.copperMid, b.copperMid, t),
    copperDark: lerpRGB(a.copperDark, b.copperDark, t),
    patina: lerpRGB(a.patina, b.patina, t),
    padTop: lerpRGB(a.padTop, b.padTop, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    copperShine: lerp(a.copperShine, b.copperShine, t),
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
    copperShine: clamp01(p.copperShine),
    mossAmt: clamp01(p.mossAmt),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    dewAmt: clamp01(p.dewAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────
//
// Copper colours are intentionally near-identical across the four sets (only a
// tiny warm/cool nudge) so the copper reads bright and locked all year. The
// teal patina flecks are likewise locked. Summer is the warm PEAK; winter is
// the coolest. Grey host rock stays grey; only its brightness/temperature
// shifts with the seasonal light.

// Locked copper ramp — highlight 0xc97f4f, deep 0x6a3a18 (a mid between them).
const _COP_L: RGB = [201, 127, 79];  // 0xc97f4f
const _COP_M: RGB = [156, 92, 50];   // mid copper body
const _COP_D: RGB = [106, 58, 24];   // 0x6a3a18
const _PATINA: RGB = [63, 174, 138]; // 0x3fae8a teal-green patina

const SP: Record<SeasonName, P> = {
  // Spring — cool damp rock, cool-bright light; bright copper + clear patina;
  // a small lime moss fleck at the base; dewy pad.
  Spring: {
    rockLight: [172, 178, 184],
    rockMid: [126, 130, 138],
    rockDark: [82, 84, 92],
    copperLight: [203, 132, 86],
    copperMid: [156, 92, 52],
    copperDark: [104, 58, 26],
    patina: [70, 182, 146],
    padTop: [146, 140, 132],
    padDark: [92, 88, 80],
    soil: [118, 100, 76],
    outline: [50, 48, 52],
    light: [228, 240, 248],
    lightAmt: 0.15,
    copperShine: 0.55,
    mossAmt: 0.55,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    dewAmt: 0.7,
    fallenLeafAmt: 0,
  },
  // Summer — warm dry rock, strongest shadow, PEAK copper glint; warm light.
  Summer: {
    rockLight: [180, 178, 172],
    rockMid: [134, 130, 124],
    rockDark: [82, 78, 72],
    copperLight: [205, 130, 80],
    copperMid: [160, 94, 50],
    copperDark: [108, 58, 22],
    patina: [60, 172, 134],
    padTop: [160, 142, 110],
    padDark: [104, 88, 60],
    soil: [132, 106, 72],
    outline: [54, 48, 44],
    light: [255, 240, 204],
    lightAmt: 0.18,
    copperShine: 0.95,
    mossAmt: 0.3,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    dewAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — amber-lit rock, low amber light; olive-tan earthy pad; a fallen
  // leaf on the pad.
  Autumn: {
    rockLight: [182, 174, 164],
    rockMid: [136, 128, 120],
    rockDark: [86, 80, 74],
    copperLight: [204, 130, 80],
    copperMid: [158, 92, 50],
    copperDark: [106, 58, 24],
    patina: [66, 176, 138],
    padTop: [158, 140, 94],
    padDark: [110, 94, 58],
    soil: [126, 98, 58],
    outline: [56, 48, 40],
    light: [248, 210, 148],
    lightAmt: 0.2,
    copperShine: 0.55,
    mossAmt: 0.12,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    dewAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — snow cap + frost sparkle on the rock faces, snow-dusted pad, cool
  // light; the copper veins stay bright orange with their teal patina.
  Winter: {
    rockLight: [180, 190, 202],
    rockMid: [132, 142, 156],
    rockDark: [84, 92, 108],
    copperLight: [202, 130, 86],
    copperMid: [154, 92, 56],
    copperDark: [104, 58, 30],
    patina: [70, 180, 148],
    padTop: [172, 186, 204],
    padDark: [118, 134, 156],
    soil: [124, 118, 110],
    outline: [50, 52, 62],
    light: [208, 228, 252],
    lightAmt: 0.3,
    copperShine: 0.6,
    mossAmt: 0,
    frostAmt: 0.7,
    snowCapAmt: 0.85,
    padSnowAmt: 0.9,
    dewAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── The single parameterized paint ───────────────────────────────────────────

// Rock geometry constants (the SAME silhouette every season). A chunky boulder
// sitting low on the pad, base within ±16 wide. Origin-centered.
const ROCK_TOP = -14; // crown of the boulder
const ROCK_BOT = 17; // base resting on the pad
const ROCK_HALF = 15; // half-width of the body at the base

/** Trace the chunky angular boulder body path into the current ctx path. The
 *  outline/silhouette is IDENTICAL for all seasons (only fill colours vary). */
function rockBodyPath(ctx: CanvasRenderingContext2D, bob: number): void {
  const t = ROCK_TOP + bob;
  const b = ROCK_BOT + bob;
  ctx.beginPath();
  // left base
  ctx.moveTo(-ROCK_HALF, b - 1);
  // up the left face with a couple of faceted kinks
  ctx.lineTo(-ROCK_HALF + 1.5, b - 11);
  ctx.lineTo(-11.5, t + 12);
  ctx.lineTo(-9, t + 4);
  // crown — a couple of bumps
  ctx.lineTo(-4.5, t + 1);
  ctx.lineTo(-1, t);
  ctx.lineTo(4, t + 3);
  ctx.lineTo(8.5, t + 1.5);
  // down the right face
  ctx.lineTo(12, t + 11);
  ctx.lineTo(ROCK_HALF - 1, b - 10);
  ctx.lineTo(ROCK_HALF, b - 1);
  // across the base (slightly lobed for a rocky foot)
  ctx.lineTo(8, b + 1.5);
  ctx.lineTo(0, b + 0.5);
  ctx.lineTo(-8, b + 1.5);
  ctx.closePath();
}

/** Copper veins as polylines across the rock face (constant geometry). */
const VEINS: Array<Array<[number, number]>> = [
  [[-12, 12], [-6, 4], [-2, -2], [3, -8]],
  [[-9, -6], [-3, -1], [4, 3], [11, 8]],
  [[-1, 14], [1, 6], [-2, 0], [2, -10]],
];

/** Embedded copper nuggets glinting on the surface (constant positions). */
const NUGGETS: Array<[number, number, number]> = [
  // [x, y, radius]
  [-7, 2, 2.4],
  [5, -3, 2.0],
  [9, 6, 1.7],
  [-3, 9, 1.5],
];

/** Teal-green patina flecks dotting the copper (constant positions). */
const PATINA_FLECKS: Array<[number, number, number]> = [
  // [x, y, radius]
  [-9, 7, 1.3],
  [1, -5, 1.1],
  [7, 1, 1.0],
  [-4, 0, 0.9],
  [11, 8, 0.9],
];

/** The whole tile from ONLY `p` and `bob`. */
function paint(ctx: CanvasRenderingContext2D, raw: P, bob: number): void {
  const p = clampP(raw);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Pad: low flat rocky/earth ellipse, x∈[−18,+18], centre y≈+19 ─────────
    // soft contact shadow lower-right
    ctx.fillStyle = rgba(p.padDark, 0.4);
    ctx.beginPath();
    ctx.ellipse(3, 21.5, 16, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // shaded underside
    ctx.fillStyle = rgb(p.padDark);
    ctx.beginPath();
    ctx.ellipse(0, 20.4, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // earthy top
    ctx.fillStyle = rgb(p.padTop);
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // scattered pebbles on the rocky pad (a few darker flecks for texture)
    ctx.fillStyle = rgba(p.padDark, 0.55);
    [[-13, 19.5], [12, 18.6], [-6, 21], [7, 20.6], [0, 18.4]].forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.ellipse(sx, sy, 1.5, 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // dewy sheen on the pad (spring) — a cool bright glaze on the upper rim
    if (p.dewAmt > 0.01) {
      ctx.fillStyle = rgba([235, 248, 255], 0.28 * p.dewAmt);
      ctx.beginPath();
      ctx.ellipse(-3, 18.2, 14, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // moss/grass fleck at the base of the rock (spring/summer)
    if (p.mossAmt > 0.01) {
      const a = p.mossAmt;
      ctx.fillStyle = rgba([120, 178, 84], 0.65 * a);
      [[-12, 18.5], [10, 18.2], [-3, 20], [5, 19.4]].forEach(([mx, my], idx) => {
        ctx.beginPath();
        ctx.ellipse(mx, my, 3.2 + (idx % 2), 1.6, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      // a couple of tiny lime grass blades poking up at the rock foot
      ctx.strokeStyle = rgba([96, 162, 70], 0.8 * a);
      ctx.lineWidth = 1;
      [-10, -2, 6, 11].forEach((gx) => {
        ctx.beginPath();
        ctx.moveTo(gx, 18.6);
        ctx.lineTo(gx - 0.8, 15.6);
        ctx.stroke();
      });
    }

    // pad snow dusting (winter)
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

    // fallen leaf on the pad (autumn)
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const leaves: Array<[number, number, number, RGB]> = [
        [-13, 19.6, -0.5, [196, 120, 40]],
        [13, 18.4, 0.7, [176, 72, 32]],
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

    // ── Soil contact patch directly under the rock base ─────────────────────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, ROCK_BOT + bob + 1.5, 12, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // contact shadow of the rock on the pad (lower-right)
    ctx.fillStyle = rgba(p.outline, 0.3);
    ctx.beginPath();
    ctx.ellipse(3, ROCK_BOT + bob + 2, 13, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the copper-bearing host rock (SAME silhouette every season) ─
    // 1) soft dark outline pass (drawn slightly fatter, dark first then light)
    rockBodyPath(ctx, bob);
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // 2) rock body fill, clipped so detail stays inside the silhouette
    ctx.save();
    rockBodyPath(ctx, bob);
    ctx.clip();

    const top = ROCK_TOP + bob;
    const bot = ROCK_BOT + bob;

    // base mid tone
    ctx.fillStyle = rgb(p.rockMid);
    ctx.fillRect(-ROCK_HALF - 3, top - 4, (ROCK_HALF + 3) * 2, bot - top + 10);

    // light from upper-left: a lit panel on the left/upper face
    const litGrad = ctx.createLinearGradient(-ROCK_HALF, top, ROCK_HALF, bot);
    litGrad.addColorStop(0, rgb(p.rockLight));
    litGrad.addColorStop(0.5, rgb(p.rockMid));
    litGrad.addColorStop(1, rgb(p.rockDark));
    ctx.fillStyle = litGrad;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.ellipse(-2, lerp(top, bot, 0.45), ROCK_HALF + 3, (bot - top) * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // angular facet clefts (dark grooves) to read as faceted stone
    ctx.strokeStyle = rgba(p.rockDark, 0.8);
    ctx.lineWidth = 1.8;
    [
      [[-9, top + 4], [-4, lerp(top, bot, 0.5)], [-6, bot - 2]],
      [[6, top + 5], [9, lerp(top, bot, 0.55)], [11, bot - 3]],
    ].forEach((seg) => {
      ctx.beginPath();
      ctx.moveTo(seg[0][0], seg[0][1]);
      ctx.lineTo(seg[1][0], seg[1][1]);
      ctx.lineTo(seg[2][0], seg[2][1]);
      ctx.stroke();
    });
    // a couple of lighter facet highlights catching the upper-left light
    ctx.strokeStyle = rgba(p.rockLight, 0.5);
    ctx.lineWidth = 1.1;
    [
      [[-10, top + 6], [-7, lerp(top, bot, 0.4)]],
      [[-2, top + 2], [0, lerp(top, bot, 0.3)]],
    ].forEach((seg) => {
      ctx.beginPath();
      ctx.moveTo(seg[0][0], seg[0][1]);
      ctx.lineTo(seg[1][0], seg[1][1]);
      ctx.stroke();
    });

    // shaded underside to seat the rock on the pad
    ctx.fillStyle = rgba(p.rockDark, 0.6);
    ctx.beginPath();
    ctx.ellipse(0, bot - 2, ROCK_HALF, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Copper veins shot through the rock (LOCKED colour, drawn bright) ─────
    // dark base pass then bright core, like the house dark-then-light idiom.
    VEINS.forEach((pts) => {
      ctx.strokeStyle = rgb(p.copperDark);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1] + bob);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1] + bob);
      ctx.stroke();
      // bright copper core
      ctx.strokeStyle = rgb(p.copperMid);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1] + bob);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1] + bob);
      ctx.stroke();
      // top highlight catching the light
      ctx.strokeStyle = rgba(p.copperLight, 0.9);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(pts[0][0] - 0.4, pts[0][1] - 0.5 + bob);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] - 0.4, pts[i][1] - 0.5 + bob);
      ctx.stroke();
    });

    // ── Embedded copper nuggets glinting on the surface (LOCKED colour) ──────
    NUGGETS.forEach(([nx, ny, nr]) => {
      const ng = ctx.createRadialGradient(nx - nr * 0.4, ny - nr * 0.4 + bob, nr * 0.2, nx, ny + bob, nr);
      ng.addColorStop(0, rgb(p.copperLight));
      ng.addColorStop(0.6, rgb(p.copperMid));
      ng.addColorStop(1, rgb(p.copperDark));
      ctx.fillStyle = ng;
      ctx.beginPath();
      ctx.arc(nx, ny + bob, nr, 0, Math.PI * 2);
      ctx.fill();
      // dark rim to seat the nugget in the rock
      ctx.strokeStyle = rgba(p.outline, 0.6);
      ctx.lineWidth = 0.7;
      ctx.stroke();
      // small specular glint (scaled by copperShine; the copper stays bright)
      ctx.fillStyle = rgba([255, 246, 232], 0.4 + 0.45 * p.copperShine);
      ctx.beginPath();
      ctx.arc(nx - nr * 0.35, ny - nr * 0.35 + bob, nr * 0.32, 0, Math.PI * 2);
      ctx.fill();
    });

    // ── Teal-green patina flecks dotting the copper (LOCKED colour) ──────────
    PATINA_FLECKS.forEach(([fx, fy, fr]) => {
      ctx.fillStyle = rgb(p.patina);
      ctx.beginPath();
      ctx.ellipse(fx, fy + bob, fr, fr * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();
      // a soft brighter centre so the patina reads as oxidised crust, not a dot
      ctx.fillStyle = rgba([148, 214, 188], 0.6);
      ctx.beginPath();
      ctx.ellipse(fx - fr * 0.2, fy - fr * 0.2 + bob, fr * 0.5, fr * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // frost dusting (winter) — cool blue speckle on the upward rock surfaces
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.26 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(-1, lerp(top, bot, 0.28), ROCK_HALF, (bot - top) * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([235, 246, 255], 0.65 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-9, top + 4], [-3, top + 2], [4, top + 4], [9, top + 5],
        [-6, lerp(top, bot, 0.4)], [6, lerp(top, bot, 0.45)], [0, lerp(top, bot, 0.32)],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end clip

    // 3) snow cap on the rock crown (winter) — drawn over, hugging the top
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(-10, top + 5);
      ctx.quadraticCurveTo(-9, top - 2, -4.5, top - 1);
      ctx.quadraticCurveTo(-1, top - 3, 4, top - 0.5);
      ctx.quadraticCurveTo(8.5, top - 2, 11, top + 4);
      ctx.quadraticCurveTo(6, top + 6, 4, top + 4);
      ctx.quadraticCurveTo(-1, top + 3, -4, top + 5);
      ctx.quadraticCurveTo(-7, top + 6.5, -10, top + 5);
      ctx.closePath();
      ctx.fill();
      // soft shaded underside of the cap
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(0, top + 4.5, 9.5, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
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
function bobAt(t: number, amp = 0.7, w = 1.3): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

/** Position of a point along all veins at parameter u∈0..1 (for the travelling
 *  glint). Flattens the vein polylines into one ordered list of points so the
 *  glint travels seamlessly along the copper. */
const GLINT_PATH: Array<[number, number]> = VEINS.flat();

function glintAt(u: number): [number, number] {
  const n = GLINT_PATH.length;
  const f = clamp01(u) * (n - 1);
  const i = Math.min(n - 2, Math.floor(f));
  const k = f - i;
  const a = GLINT_PATH[i];
  const b = GLINT_PATH[i + 1];
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    // The subject bob is 0 at t=0; micro-motion below is additive dressing.
    paint(ctx, SP[season], bob);

    ctx.save();
    try {
      ctx.globalAlpha = 1;

      // Shared: a soft specular GLINT travels along the copper veins/nuggets —
      // subtle, no flash. Brightness/warmth varies a touch by season.
      const prog = (t * 0.4) % 1;
      const [gx, gy] = glintAt(prog);
      const base = season === "Summer" ? 0.7 : season === "Winter" ? 0.45 : 0.55;
      const warm = season === "Summer"
        ? "255,228,180"
        : season === "Winter"
          ? "224,238,255"
          : "255,236,206";
      const pulse = base * (0.6 + 0.4 * Math.sin(prog * Math.PI));
      ctx.fillStyle = `rgba(${warm},${pulse})`;
      ctx.beginPath();
      ctx.ellipse(gx, gy + bob, 1.6, 1.2, -0.2, 0, Math.PI * 2);
      ctx.fill();

      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint on the pad
        const g = 0.2 + 0.28 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(235,248,255,${g})`;
        ctx.beginPath();
        ctx.arc(-6, 18.4, 1.1 + g * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // brightest/warmest copper glint already handled above; add a faint
        // warm bloom on the largest nugget shoulder
        const s = 0.16 + 0.2 * (0.5 + 0.5 * Math.sin(t * 1.1));
        ctx.fillStyle = `rgba(255,206,150,${s})`;
        ctx.beginPath();
        ctx.ellipse(-7, 2 + bob, 3.4, 2.6, -0.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // a fallen leaf stirs gently on the pad (seamless small rotation)
        const sway = Math.sin(t * 1.4) * 0.25;
        ctx.save();
        ctx.translate(13, 18.4);
        ctx.rotate(0.7 + sway);
        ctx.fillStyle = "rgba(176,72,32,0.9)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.2, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(90,44,16,0.9)";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.lineTo(3, 0);
        ctx.stroke();
        ctx.restore();
      } else {
        // Winter — a drifting snowflake + a faint cold sheen on the rock
        const prog2 = (t / 3.2) % 1;
        const fy = -20 + prog2 * 36;
        const dx = 4 + Math.sin(prog2 * Math.PI * 2) * 3;
        ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog2 * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(dx, fy, 1.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.1 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.8));
        ctx.fillStyle = "rgba(210,232,255,1)";
        ctx.beginPath();
        ctx.ellipse(-3, -2 + bob, 7, 4.5, -0.2, 0, Math.PI * 2);
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
