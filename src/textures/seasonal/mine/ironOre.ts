// Seasonal art for the IRON ORE mineral tile (`tile_mine_iron_ore`).
//
// A chunky grey-brown host ROCK studded and veined with rusty red-orange IRON
// ORE — bands and nuggets of metallic ore with small steel-grey glints —
// sitting on a low rocky/earth pad (NOT grass). The SAME boulder+veins
// silhouette is drawn every season; per the Mineral framing, seasonal change is
// mostly the global light/pad filter: the ore's own rusty colour is LOCKED and
// stays bright and clearly visible all year; the host rock stays grey-brown.
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
// Origin-centered in the −24..+24 design box, light from upper-left, one soft
// contact shadow lower-right, flat cel-shaded with a soft dark outline. Pure
// Canvas-2D vector drawing. Never throws.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable params ─────────────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly. */
interface P {
  rockLight: RGB;   // lit face of the grey-brown host rock
  rockMid: RGB;     // body tone of the host rock
  rockDark: RGB;    // shadowed underside / clefts of the host rock
  oreLight: RGB;    // bright rusty highlight on the iron ore (LOCKED across seasons)
  oreMid: RGB;      // iron-ore body rust tone (LOCKED across seasons)
  oreDark: RGB;     // deep iron rust in shadow (LOCKED across seasons)
  steel: RGB;       // small steel-grey metallic glint on the nuggets (LOCKED)
  padTop: RGB;      // top of the rocky/earth pad
  padDark: RGB;     // shaded pad underside
  soil: RGB;        // contact / base soil under the rock
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  oreShine: number; // 0..1 specular gloss on the metallic ore (peak = summer)
  mossAmt: number;  // 0..1 moss/grass fleck at the rock base (spring/summer)
  frostAmt: number; // 0..1 cool frost dusting on the rock's upward faces
  snowCapAmt: number; // 0..1 snow cap on the rock's upward crown
  padSnowAmt: number; // 0..1 snow blanket on the pad
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
    oreLight: lerpRGB(a.oreLight, b.oreLight, t),
    oreMid: lerpRGB(a.oreMid, b.oreMid, t),
    oreDark: lerpRGB(a.oreDark, b.oreDark, t),
    steel: lerpRGB(a.steel, b.steel, t),
    padTop: lerpRGB(a.padTop, b.padTop, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    oreShine: lerp(a.oreShine, b.oreShine, t),
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
    oreShine: clamp01(p.oreShine),
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
// Ore colours are intentionally near-identical across the four sets (a tiny
// warm/cool/deeper nudge only) so the rusty iron reads bright and LOCKED all
// year. Host rock light ~0xa89890, rock dark ~0x4a3e3a. Summer is the warm PEAK
// metallic glint; autumn deepens the rust a touch; winter the coolest. The grey
// rock stays grey-brown; iron veins stay clearly rusty-red in every season.

// Locked iron-ore ramp (rusty red-orange) + steel glint. Each season nudges
// these only slightly via its own values below.
const _ORE_L: RGB = [181, 104, 58]; // rusty highlight
const _ORE_M: RGB = [150, 78, 42];  // ore body rust
const _ORE_D: RGB = [120, 58, 34];  // deep iron rust
const _STEEL: RGB = [180, 170, 165]; // steel-grey metallic glint

const SP: Record<SeasonName, P> = {
  // Spring — cool damp light; cool grey host rock + clear rusty ore; a small
  // lime moss fleck at the base; dewy pad.
  Spring: {
    rockLight: [168, 158, 152],
    rockMid: [110, 98, 92],
    rockDark: [74, 62, 58],
    oreLight: [178, 102, 60],
    oreMid: [148, 76, 44],
    oreDark: [118, 56, 34],
    steel: [176, 168, 166],
    padTop: [148, 138, 122],
    padDark: [94, 86, 72],
    soil: [118, 98, 74],
    outline: [46, 38, 36],
    light: [226, 238, 246],
    lightAmt: 0.15,
    oreShine: 0.5,
    mossAmt: 0.5,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    dewAmt: 0.65,
    fallenLeafAmt: 0,
  },
  // Summer — warm dry rock, strongest shadow, PEAK metallic glint on the ore;
  // warm light, light moss.
  Summer: {
    rockLight: [178, 164, 154],
    rockMid: [116, 102, 94],
    rockDark: [76, 62, 56],
    oreLight: [192, 112, 62],
    oreMid: [158, 84, 46],
    oreDark: [124, 60, 34],
    steel: [188, 178, 172],
    padTop: [162, 144, 110],
    padDark: [108, 92, 64],
    soil: [132, 106, 72],
    outline: [48, 38, 34],
    light: [255, 242, 206],
    lightAmt: 0.18,
    oreShine: 0.95,
    mossAmt: 0.28,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    dewAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — amber-lit rock; olive-tan earthy pad; a fallen leaf on the pad; low
  // amber light; ore a touch deeper rust.
  Autumn: {
    rockLight: [172, 156, 142],
    rockMid: [114, 100, 90],
    rockDark: [74, 60, 52],
    oreLight: [176, 96, 52],
    oreMid: [146, 72, 38],
    oreDark: [112, 52, 28],
    steel: [178, 166, 158],
    padTop: [156, 140, 96],
    padDark: [110, 94, 58],
    soil: [126, 98, 58],
    outline: [54, 42, 34],
    light: [248, 210, 148],
    lightAmt: 0.2,
    oreShine: 0.5,
    mossAmt: 0.12,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    dewAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — cool blue-grey light; snow cap + frost on the rock's upward faces,
  // snow-dusted pad; iron veins still clearly rusty-red and glinting underneath.
  Winter: {
    rockLight: [170, 168, 172],
    rockMid: [112, 108, 112],
    rockDark: [72, 66, 70],
    oreLight: [178, 100, 58],
    oreMid: [148, 76, 44],
    oreDark: [118, 56, 34],
    steel: [186, 182, 184],
    padTop: [172, 186, 204],
    padDark: [118, 134, 156],
    soil: [122, 116, 110],
    outline: [44, 42, 50],
    light: [208, 228, 252],
    lightAmt: 0.3,
    oreShine: 0.55,
    mossAmt: 0,
    frostAmt: 0.7,
    snowCapAmt: 0.85,
    padSnowAmt: 0.9,
    dewAmt: 0,
    fallenLeafAmt: 0,
  },
};

// Keep the locked-ramp constants referenced so they document intent and lint
// stays clean (they are the anchor the per-season ore tones nudge around).
void _ORE_L;
void _ORE_M;
void _ORE_D;
void _STEEL;

// ── Geometry (the SAME silhouette every season) ──────────────────────────────
//
// A chunky grey-brown host boulder sitting low on the pad, base within ±16
// wide, crown around y≈−14. The iron ore appears as bright rusty veins/bands
// shot across the face plus a few embedded nuggets. Origin-centered.

const ROCK_TOP = -14; // crown of the host boulder
const ROCK_BOT = 17;  // base resting on the pad
const ROCK_HALF = 15; // half-width of the body at the base

/** Trace the chunky angular host-rock body path into the current ctx path. The
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

/** Iron-ore veins/bands as polylines across the rock face (constant geometry).
 *  Flattened later for the travelling glint. */
const VEINS: Array<Array<[number, number]>> = [
  [[-12, 11], [-6, 4], [-1, -1], [4, -8]],
  [[-10, -5], [-3, 0], [4, 4], [11, 9]],
  [[-2, 13], [1, 5], [-1, -1], [3, -9]],
];

/** Embedded iron-ore nuggets glinting on the surface (constant positions). */
const NUGGETS: Array<[number, number, number]> = [
  // [x, y, radius]
  [-7, 1, 2.5],
  [5, -3, 2.0],
  [9, 7, 1.7],
  [-3, 9, 1.6],
];

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
    // earthy/rocky top
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
      ctx.fillStyle = rgba([120, 176, 78], 0.6 * a);
      [[-12, 18.6], [10, 18.3], [-3, 20], [5, 19.5]].forEach(([mx, my], idx) => {
        ctx.beginPath();
        ctx.ellipse(mx, my, 3.0 + (idx % 2), 1.5, 0, 0, Math.PI * 2);
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

    // ── Subject: the iron-ore-bearing host rock (SAME silhouette every season)
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

    // shaded underside to seat the rock on the pad (strongest in summer light)
    ctx.fillStyle = rgba(p.rockDark, 0.6);
    ctx.beginPath();
    ctx.ellipse(0, bot - 2, ROCK_HALF, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Iron-ore veins shot through the host rock (LOCKED rusty colour) ──────
    // dark base pass then bright rusty core, like the house dark-then-light
    // idiom. These are the metallic bands the idle glint travels along.
    VEINS.forEach((pts) => {
      ctx.strokeStyle = rgb(p.oreDark);
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1] + bob);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1] + bob);
      ctx.stroke();
      // bright rusty core
      ctx.strokeStyle = rgb(p.oreMid);
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1] + bob);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1] + bob);
      ctx.stroke();
      // top highlight catching the light (rusty highlight)
      ctx.strokeStyle = rgba(p.oreLight, 0.9);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(pts[0][0] - 0.4, pts[0][1] - 0.5 + bob);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] - 0.4, pts[i][1] - 0.5 + bob);
      ctx.stroke();
    });

    // ── Embedded iron-ore nuggets glinting on the surface (LOCKED colour) ────
    NUGGETS.forEach(([nx, ny, nr]) => {
      const ng = ctx.createRadialGradient(nx - nr * 0.4, ny - nr * 0.4 + bob, nr * 0.2, nx, ny + bob, nr);
      ng.addColorStop(0, rgb(p.oreLight));
      ng.addColorStop(0.6, rgb(p.oreMid));
      ng.addColorStop(1, rgb(p.oreDark));
      ctx.fillStyle = ng;
      ctx.beginPath();
      ctx.arc(nx, ny + bob, nr, 0, Math.PI * 2);
      ctx.fill();
      // dark rim to seat the nugget in the rock
      ctx.strokeStyle = rgba(p.outline, 0.6);
      ctx.lineWidth = 0.7;
      ctx.stroke();
      // small steel-grey metallic glint (scaled by oreShine; ore stays rusty)
      ctx.fillStyle = rgba(p.steel, 0.55 + 0.4 * p.oreShine);
      ctx.beginPath();
      ctx.arc(nx - nr * 0.35, ny - nr * 0.35 + bob, nr * 0.34, 0, Math.PI * 2);
      ctx.fill();
      // a tiny bright specular pip on the steel glint
      ctx.fillStyle = rgba([255, 252, 248], 0.35 + 0.45 * p.oreShine);
      ctx.beginPath();
      ctx.arc(nx - nr * 0.4, ny - nr * 0.42 + bob, nr * 0.16, 0, Math.PI * 2);
      ctx.fill();
    });

    // frost dusting (winter) — cool blue speckle on the upward rock surfaces.
    // Kept off the rusty veins so the ore stays clearly visible (no white-out).
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.24 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(-1, lerp(top, bot, 0.26), ROCK_HALF, (bot - top) * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([235, 246, 255], 0.6 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-9, top + 4], [-4, top + 2], [3, top + 4], [9, top + 5],
        [-11, lerp(top, bot, 0.42)], [11, lerp(top, bot, 0.4)],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end clip

    // 3) snow cap on the host-rock crown (winter) — drawn over, hugging the top
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
 *  specular glint). Flattens the iron-vein polylines into one ordered list. */
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

      // Shared: a soft specular GLINT slides across the iron nuggets/veins —
      // subtle, no flash. The fractional part of t maps along the metallic
      // bands. Brightness/warmth varies a touch by season (peak in summer).
      const prog = (t * 0.4) % 1;
      const [gx, gy] = glintAt(prog);
      const base = season === "Summer" ? 0.7 : season === "Winter" ? 0.42 : 0.52;
      // a cool steely glint in winter, a warm metallic one otherwise
      const glintCol = season === "Summer"
        ? "255,244,212"
        : season === "Winter"
          ? "224,236,255"
          : "255,248,228";
      // fade in/out along the travel so there is no hard pop, seamless across wrap
      const pulse = base * (0.55 + 0.45 * Math.sin(prog * Math.PI));
      ctx.fillStyle = `rgba(${glintCol},${pulse})`;
      ctx.beginPath();
      ctx.ellipse(gx, gy + bob, 1.7, 1.2, -0.25, 0, Math.PI * 2);
      ctx.fill();

      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint on the dewy pad
        const g = 0.2 + 0.28 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(235,248,255,${g})`;
        ctx.beginPath();
        ctx.arc(-6, 18.4, 1.1 + g * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // brightest/warmest metallic glint handled above; add a faint warm
        // bloom on the largest nugget shoulder (peak shine)
        const s = 0.14 + 0.18 * (0.5 + 0.5 * Math.sin(t * 1.1));
        ctx.fillStyle = `rgba(255,224,176,${s})`;
        ctx.beginPath();
        ctx.ellipse(-7, 1 + bob, 3.4, 2.6, -0.2, 0, Math.PI * 2);
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
        // Winter — a drifting snowflake + a faint cold sheen on the rock crown
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
        ctx.ellipse(-3, -8 + bob, 8, 3.5, -0.2, 0, Math.PI * 2);
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
