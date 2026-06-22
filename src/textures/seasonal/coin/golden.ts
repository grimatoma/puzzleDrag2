// Seasonal art for the GOLDEN COIN treasure tile (`tile_coin_golden`).
//
// One large round GOLD coin standing slightly tilted toward the viewer, leaning
// against a short stack of two coins behind it for read, resting on a rocky/earth
// pad (this is a "mine" biome treasure tile — a rocky pad, NOT grass). The coin
// face has a raised rim and a simple embossed STAR emblem catching the light.
// The SAME gold-coin silhouette — front coin + back stack + raised rim + star —
// is drawn EVERY season; only colours, light and small dressing (moss fleck,
// fallen leaf, snow cap, frost, pad snow) change. Per the Mineral/Treasure
// framing, seasonal change is mostly the global light/pad filter: the gold's own
// colour is LOCKED and stays bright and clearly visible all year.
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
// Idle = a bright specular STAR-GLINT that travels across the coin face (its
// position from the fractional part of t, so it loops seamlessly — a tasteful
// travelling sparkle, NOT a strobe) + a tiny bob. Origin-centered in the
// −24..+24 design box, light from upper-left, soft shadow lower-right, flat
// cel-shaded with a soft dark outline. Pure Canvas-2D vector drawing.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable params ─────────────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly. */
interface P {
  goldLight: RGB;   // bright lit face of the gold coin (LOCKED across seasons)
  goldMid: RGB;     // gold body tone (LOCKED across seasons)
  goldDeep: RGB;    // shaded edge / underside of the gold (LOCKED across seasons)
  goldSpec: RGB;    // bright specular accent on the gold (LOCKED across seasons)
  rimLight: RGB;    // lit raised rim of the coin (LOCKED across seasons)
  rimDark: RGB;     // shaded raised rim (LOCKED across seasons)
  padTop: RGB;      // top of the rocky/earth pad
  padDark: RGB;     // shaded pad underside
  soil: RGB;        // contact / base soil under the coins
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  shadowAmt: number; // 0..1 strength of the cast/contact shadow (PEAK summer)
  shine: number;    // 0..1 specular gloss on the coin face (PEAK summer)
  mossAmt: number;  // 0..1 moss fleck at the pad base (spring/summer)
  frostAmt: number; // 0..1 cool frost sparkle on the embossing (winter)
  snowCapAmt: number; // 0..1 snow cap on the coin's upper rim (winter)
  padSnowAmt: number; // 0..1 snow blanket on the pad (winter)
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad (autumn)
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
    goldLight: lerpRGB(a.goldLight, b.goldLight, t),
    goldMid: lerpRGB(a.goldMid, b.goldMid, t),
    goldDeep: lerpRGB(a.goldDeep, b.goldDeep, t),
    goldSpec: lerpRGB(a.goldSpec, b.goldSpec, t),
    rimLight: lerpRGB(a.rimLight, b.rimLight, t),
    rimDark: lerpRGB(a.rimDark, b.rimDark, t),
    padTop: lerpRGB(a.padTop, b.padTop, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    shadowAmt: lerp(a.shadowAmt, b.shadowAmt, t),
    shine: lerp(a.shine, b.shine, t),
    mossAmt: lerp(a.mossAmt, b.mossAmt, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
  };
}

function clampP(p: P): P {
  return {
    ...p,
    lightAmt: clamp01(p.lightAmt),
    shadowAmt: clamp01(p.shadowAmt),
    shine: clamp01(p.shine),
    mossAmt: clamp01(p.mossAmt),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────
//
// Gold colours are intentionally near-identical across the four sets (a tiny
// warm/cool nudge only) so the gold reads bright and locked all year. The
// anchor palette from the spec: light/face ~ [255,211,76] (0xffd34c), mid ~
// [226,170,40], deep/shaded edge ~ [138,90,12] (0x8a5a0c), bright specular ~
// [255,250,214]. Summer is the warm PEAK (strongest shadow + peak star-glint);
// winter is the coolest (snow cap + frost, gold still clearly bright).

const _GOLD_L: RGB = [255, 211, 76];
const _GOLD_M: RGB = [226, 170, 40];
const _GOLD_D: RGB = [138, 90, 12];
const _GOLD_S: RGB = [255, 250, 214];
const _RIM_L: RGB = [255, 226, 132];
const _RIM_D: RGB = [168, 116, 24];

const SP: Record<SeasonName, P> = {
  // Spring — cool-bright light; gold bright with a soft sheen; faint moss fleck
  // at the pad base.
  Spring: {
    goldLight: [255, 214, 88],
    goldMid: [228, 172, 44],
    goldDeep: [140, 92, 16],
    goldSpec: _GOLD_S,
    rimLight: [255, 228, 138],
    rimDark: [168, 118, 28],
    padTop: [150, 142, 122],
    padDark: [96, 88, 72],
    soil: [120, 100, 76],
    outline: [56, 48, 30],
    light: [232, 242, 248],
    lightAmt: 0.15,
    shadowAmt: 0.55,
    shine: 0.62,
    mossAmt: 0.5,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    fallenLeafAmt: 0,
  },
  // Summer — gold most brilliant (PEAK); warm light, STRONGEST shadow, peak
  // star-glint; dry rocky pad with a little moss.
  Summer: {
    goldLight: [255, 218, 96],
    goldMid: [234, 178, 48],
    goldDeep: [146, 96, 16],
    goldSpec: _GOLD_S,
    rimLight: [255, 232, 150],
    rimDark: [176, 124, 30],
    padTop: [162, 144, 110],
    padDark: [108, 92, 64],
    soil: [134, 108, 74],
    outline: [58, 48, 28],
    light: [255, 242, 206],
    lightAmt: 0.18,
    shadowAmt: 1.0,
    shine: 1.0,
    mossAmt: 0.28,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — low amber light; gold a touch warmer/duller; olive-tan earthy pad;
  // a fallen leaf on the pad.
  Autumn: {
    goldLight: [250, 204, 78],
    goldMid: [222, 164, 40],
    goldDeep: [134, 86, 14],
    goldSpec: [252, 240, 196],
    rimLight: [250, 216, 122],
    rimDark: [162, 110, 24],
    padTop: [158, 142, 96],
    padDark: [110, 96, 58],
    soil: [128, 100, 60],
    outline: [60, 48, 30],
    light: [248, 212, 150],
    lightAmt: 0.2,
    shadowAmt: 0.6,
    shine: 0.55,
    mossAmt: 0.1,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — cool blue-grey light; a snow cap on the coin's upper rim + frost
  // sparkle on the embossing, snow-dusted pad; the gold stays clearly bright
  // underneath (NO white-out).
  Winter: {
    goldLight: [252, 212, 96],
    goldMid: [226, 172, 50],
    goldDeep: [138, 92, 22],
    goldSpec: [248, 244, 214],
    rimLight: [252, 224, 140],
    rimDark: [164, 116, 32],
    padTop: [172, 186, 204],
    padDark: [118, 134, 156],
    soil: [124, 118, 110],
    outline: [50, 50, 56],
    light: [208, 228, 252],
    lightAmt: 0.3,
    shadowAmt: 0.5,
    shine: 0.6,
    mossAmt: 0,
    frostAmt: 0.7,
    snowCapAmt: 0.85,
    padSnowAmt: 0.9,
    fallenLeafAmt: 0,
  },
};

// ── Geometry constants (the SAME silhouette every season) ────────────────────
//
// Front coin: a big round gold disc standing slightly tilted toward the viewer,
// so it reads as an ellipse a touch taller than wide. Behind/left of it a short
// stack of two coins seen edge-on for read. Both seat on the rocky pad.
// Origin-centered; base within ±16 wide.

const COIN_CX = 2.5;   // front coin centre x (nudged right; stack sits to its left)
const COIN_CY = 1.0;   // front coin centre y (rests on the pad, rising upward)
const COIN_RX = 13.5;  // horizontal radius (tilted toward viewer → slightly narrow)
const COIN_RY = 15.0;  // vertical radius (taller: the face leans toward us)
const RIM_W = 2.4;     // raised-rim band width

// Back stack — two coins seen as flat edge-on ellipses, leaned behind-left.
const STACK_CX = -9.5;
const STACK_CY = 6.5;  // lower coin centre y (its base on the pad)
const STACK_RX = 9.5;  // edge-on coin half-width
const STACK_RY = 4.0;  // edge-on coin half-height
const STACK_THICK = 3.2; // visible coin thickness (edge band)
const STACK_GAP = 5.0;  // vertical offset between the two stacked coins

/** Trace the front coin's outer ellipse into the current path. */
function coinFacePath(ctx: CanvasRenderingContext2D, bob: number, grow = 0): void {
  ctx.beginPath();
  ctx.ellipse(COIN_CX, COIN_CY + bob, COIN_RX + grow, COIN_RY + grow, 0, 0, Math.PI * 2);
}

/** Draw one edge-on coin of the back stack (a flat ellipse with a thickness
 *  band below it), at vertical offset `oy`. Constant geometry every season. */
function drawStackCoin(ctx: CanvasRenderingContext2D, p: P, bob: number, oy: number): void {
  const cx = STACK_CX;
  const cy = STACK_CY + oy + bob;

  // outline pass (fatter, dark first) — face ellipse + thickness slab
  ctx.fillStyle = rgb(p.outline);
  ctx.strokeStyle = rgb(p.outline);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, STACK_RX + 0.6, STACK_RY + 0.6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fill();
  // edge thickness band (the rim seen from the side)
  ctx.beginPath();
  ctx.moveTo(cx - STACK_RX - 0.6, cy);
  ctx.lineTo(cx - STACK_RX - 0.6, cy + STACK_THICK);
  ctx.quadraticCurveTo(cx, cy + STACK_THICK + STACK_RY + 0.6, cx + STACK_RX + 0.6, cy + STACK_THICK);
  ctx.lineTo(cx + STACK_RX + 0.6, cy);
  ctx.quadraticCurveTo(cx, cy + STACK_RY + 0.6, cx - STACK_RX - 0.6, cy);
  ctx.closePath();
  ctx.fill();

  // edge band gold (the side wall — darker, vertical gradient)
  const eg = ctx.createLinearGradient(cx, cy, cx, cy + STACK_THICK);
  eg.addColorStop(0, rgb(p.goldMid));
  eg.addColorStop(1, rgb(p.goldDeep));
  ctx.fillStyle = eg;
  ctx.beginPath();
  ctx.moveTo(cx - STACK_RX, cy);
  ctx.lineTo(cx - STACK_RX, cy + STACK_THICK);
  ctx.quadraticCurveTo(cx, cy + STACK_THICK + STACK_RY, cx + STACK_RX, cy + STACK_THICK);
  ctx.lineTo(cx + STACK_RX, cy);
  ctx.quadraticCurveTo(cx, cy + STACK_RY, cx - STACK_RX, cy);
  ctx.closePath();
  ctx.fill();

  // top face of this coin (lit ellipse, light from upper-left)
  const fg = ctx.createLinearGradient(cx - STACK_RX, cy - STACK_RY, cx + STACK_RX, cy + STACK_RY);
  fg.addColorStop(0, rgb(p.goldLight));
  fg.addColorStop(0.55, rgb(p.goldMid));
  fg.addColorStop(1, rgb(p.goldDeep));
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.ellipse(cx, cy, STACK_RX, STACK_RY, 0, 0, Math.PI * 2);
  ctx.fill();
  // raised inner rim ring on the top face
  ctx.strokeStyle = rgba(p.rimDark, 0.75);
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.ellipse(cx, cy, STACK_RX - 2.0, STACK_RY - 1.0, 0, 0, Math.PI * 2);
  ctx.stroke();
  // lit highlight crescent on the upper-left of the face
  ctx.strokeStyle = rgba(p.rimLight, 0.7);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, STACK_RX - 1.0, STACK_RY - 0.5, 0, Math.PI * 0.95, Math.PI * 1.7);
  ctx.stroke();
}

/** Trace a 5-point star centred at (cx,cy) with the given outer radius into the
 *  current path (constant geometry — the embossed emblem on the coin face). */
function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, rOut: number): void {
  const rIn = rOut * 0.46;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    // start at the top point (-90°), step by 36°
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(ang) * r;
    const y = cy + Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
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
    // soft contact shadow lower-right (strength tracks shadowAmt)
    ctx.fillStyle = rgba(p.padDark, 0.32 + 0.18 * p.shadowAmt);
    ctx.beginPath();
    ctx.ellipse(4, 21.5, 16, 4.4, 0, 0, Math.PI * 2);
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
    [[-13, 19.6], [13, 18.8], [-7, 21], [8, 20.6], [1, 18.4]].forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.ellipse(sx, sy, 1.5, 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // moss fleck at the base of the coins (spring/summer)
    if (p.mossAmt > 0.01) {
      const a = p.mossAmt;
      ctx.fillStyle = rgba([110, 168, 78], 0.62 * a);
      [[-14, 18.6], [11, 18.4], [-4, 20.2], [5, 19.6]].forEach(([mx, my], idx) => {
        ctx.beginPath();
        ctx.ellipse(mx, my, 2.8 + (idx % 2), 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      // a couple of tiny grass blades poking up at the foot
      ctx.strokeStyle = rgba([86, 150, 64], 0.8 * a);
      ctx.lineWidth = 1;
      [-12, 12].forEach((gx) => {
        ctx.beginPath();
        ctx.moveTo(gx, 18.8);
        ctx.lineTo(gx - 0.8, 15.8);
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
      [[-10, 17.6], [6, 19], [12, 17.6], [-3, 20]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // fallen leaf on the pad (autumn)
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const leaves: Array<[number, number, number, RGB]> = [
        [-14, 19.8, -0.5, [196, 120, 40]],
        [14, 18.6, 0.7, [176, 72, 32]],
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

    // ── Soil contact patch + cast shadow under the coins ────────────────────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, 17.5, 13, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // soft cast shadow of the coins on the pad toward lower-right (PEAK summer)
    ctx.fillStyle = rgba(p.outline, 0.22 + 0.22 * p.shadowAmt);
    ctx.beginPath();
    ctx.ellipse(5, 18.6 + bob * 0.3, 14, 3.0, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: back stack (behind) → front coin ───────────────────────────
    // Draw the two-coin stack first so the hero coin overlaps/leans on it.
    drawStackCoin(ctx, p, bob, STACK_GAP); // lower coin
    drawStackCoin(ctx, p, bob, 0);         // upper coin (closer to hero)

    // ── Front HERO coin (SAME silhouette every season) ──────────────────────
    // 1) soft dark outline pass (drawn slightly fatter, dark first)
    coinFacePath(ctx, bob, 0.8);
    ctx.fillStyle = rgb(p.outline);
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.fill();

    const cx = COIN_CX;
    const cy = COIN_CY + bob;

    // 2) raised rim band (lit gold ring) — the outer disc
    const rimGrad = ctx.createLinearGradient(cx - COIN_RX, cy - COIN_RY, cx + COIN_RX, cy + COIN_RY);
    rimGrad.addColorStop(0, rgb(p.rimLight));
    rimGrad.addColorStop(0.5, rgb(p.goldMid));
    rimGrad.addColorStop(1, rgb(p.rimDark));
    ctx.fillStyle = rimGrad;
    coinFacePath(ctx, bob, 0);
    ctx.fill();

    // 3) inner face (recessed a touch by the rim width), clipped for detail
    ctx.save();
    coinFacePath(ctx, bob, 0);
    ctx.clip();

    // face gradient (light from upper-left → deep lower-right)
    const faceGrad = ctx.createRadialGradient(
      cx - COIN_RX * 0.4, cy - COIN_RY * 0.42, COIN_RX * 0.2,
      cx, cy, COIN_RX,
    );
    faceGrad.addColorStop(0, rgb(p.goldLight));
    faceGrad.addColorStop(0.55, rgb(p.goldMid));
    faceGrad.addColorStop(1, rgb(p.goldDeep));
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, COIN_RX - RIM_W, COIN_RY - RIM_W, 0, 0, Math.PI * 2);
    ctx.fill();

    // inner rim shadow groove (seats the face below the raised rim)
    ctx.strokeStyle = rgba(p.goldDeep, 0.55);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, COIN_RX - RIM_W + 0.4, COIN_RY - RIM_W + 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();

    // soft lower-right terminator shade to round the coin face
    ctx.fillStyle = rgba(p.goldDeep, 0.42);
    ctx.beginPath();
    ctx.ellipse(cx + COIN_RX * 0.45, cy + COIN_RY * 0.5, COIN_RX * 0.78, COIN_RY * 0.72, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // ── embossed STAR emblem on the face (constant geometry) ────────────────
    const starCx = cx;
    const starCy = cy + 0.5;
    const starR = 7.6;
    // dark recess under the star (engraving shadow, offset down-right)
    starPath(ctx, starCx + 0.7, starCy + 0.8, starR);
    ctx.fillStyle = rgba(p.goldDeep, 0.7);
    ctx.fill();
    // raised star body (mid gold)
    starPath(ctx, starCx, starCy, starR);
    ctx.fillStyle = rgb(p.goldMid);
    ctx.fill();
    // lit upper-left bevel of the star (catches the light)
    starPath(ctx, starCx - 0.5, starCy - 0.6, starR - 0.6);
    ctx.fillStyle = rgba(p.goldLight, 0.85);
    ctx.fill();
    // crisp specular core on the star's upper points
    starPath(ctx, starCx - 0.7, starCy - 0.9, starR * 0.5);
    ctx.fillStyle = rgba(p.goldSpec, 0.4 + 0.4 * p.shine);
    ctx.fill();

    // frost sparkle on the embossing (winter) — cool flecks tracing the star
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        const fx = starCx + Math.cos(ang) * starR * 0.92;
        const fy = starCy + Math.sin(ang) * starR * 0.92;
        ctx.beginPath();
        ctx.arc(fx, fy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      // a faint cool glaze over the upper face
      ctx.fillStyle = rgba([214, 232, 252], 0.16 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(cx, cy - COIN_RY * 0.3, COIN_RX * 0.8, COIN_RY * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // end face clip

    // 4) lit rim highlight crescent on the upper-left of the raised rim
    ctx.strokeStyle = rgba(p.rimLight, 0.85);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(cx, cy, COIN_RX - RIM_W * 0.5, COIN_RY - RIM_W * 0.5, 0, Math.PI * 0.92, Math.PI * 1.62);
    ctx.stroke();
    // a static bright catch-glint on the upper-left rim (the coin reads shiny)
    ctx.fillStyle = rgba(p.goldSpec, 0.5 + 0.4 * p.shine);
    ctx.beginPath();
    ctx.ellipse(cx - COIN_RX * 0.5, cy - COIN_RY * 0.55, 1.8, 2.4, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // 5) snow cap on the coin's UPPER rim (winter) — gold stays bright below
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      const topY = cy - COIN_RY;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(cx - COIN_RX * 0.72, topY + 5.5);
      ctx.quadraticCurveTo(cx - COIN_RX * 0.5, topY - 1.5, cx - COIN_RX * 0.1, topY + 0.5);
      ctx.quadraticCurveTo(cx + COIN_RX * 0.2, topY - 1.2, cx + COIN_RX * 0.55, topY + 1.5);
      ctx.quadraticCurveTo(cx + COIN_RX * 0.74, topY + 3.5, cx + COIN_RX * 0.62, topY + 6.5);
      ctx.quadraticCurveTo(cx + COIN_RX * 0.2, topY + 4.5, cx - COIN_RX * 0.05, topY + 5.5);
      ctx.quadraticCurveTo(cx - COIN_RX * 0.4, topY + 6.8, cx - COIN_RX * 0.72, topY + 5.5);
      ctx.closePath();
      ctx.fill();
      // soft shaded underside of the cap
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(cx - COIN_RX * 0.08, topY + 5.6, COIN_RX * 0.62, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
      // a little snow nestled on the upper rim of the back stack too
      ctx.fillStyle = rgba([246, 251, 255], 0.85 * a);
      ctx.beginPath();
      ctx.ellipse(STACK_CX, STACK_CY - STACK_RY + bob, STACK_RX * 0.7, 1.6, 0, 0, Math.PI * 2);
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
function bobAt(t: number, amp = 0.6, w = 1.3): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

/** Draw a small 4-point sparkle "star glint" at (gx,gy) with the given radius
 *  and alpha — the classic coin sparkle. Additive dressing only. */
function drawSparkle(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  r: number,
  a: number,
  spec: RGB,
): void {
  // soft round bloom
  const bg = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * 1.6);
  bg.addColorStop(0, rgba(spec, a));
  bg.addColorStop(1, rgba(spec, 0));
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(gx, gy, r * 1.6, 0, Math.PI * 2);
  ctx.fill();
  // crisp 4-point star
  ctx.fillStyle = rgba([255, 255, 255], a);
  ctx.beginPath();
  ctx.moveTo(gx, gy - r);
  ctx.lineTo(gx + r * 0.28, gy - r * 0.28);
  ctx.lineTo(gx + r, gy);
  ctx.lineTo(gx + r * 0.28, gy + r * 0.28);
  ctx.lineTo(gx, gy + r);
  ctx.lineTo(gx - r * 0.28, gy + r * 0.28);
  ctx.lineTo(gx - r, gy);
  ctx.lineTo(gx - r * 0.28, gy - r * 0.28);
  ctx.closePath();
  ctx.fill();
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    paint(ctx, SP[season], bob);

    ctx.save();
    try {
      ctx.globalAlpha = 1;

      const cx = COIN_CX;
      const cy = COIN_CY + bob;
      const spec = SP[season].goldSpec;

      // Shared idle: a bright specular STAR-GLINT sweeps across the coin face,
      // its position from the fractional part of t so it loops seamlessly (a
      // tasteful travelling sparkle, NOT a strobe). Clipped to the coin disc so
      // it stays on the metal.
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, COIN_RX - 1, COIN_RY - 1, 0, 0, Math.PI * 2);
      ctx.clip();
      // sweep travels upper-left → lower-right across the face, looping.
      const sweep = (t * 0.45) % 1;
      const gx = cx + lerp(-COIN_RX * 0.62, COIN_RX * 0.62, sweep);
      const gy = cy + lerp(-COIN_RY * 0.58, COIN_RY * 0.5, sweep);
      // brightness eases in/out over the sweep so there's no hard pop at wrap.
      const base = season === "Summer" ? 0.95 : season === "Winter" ? 0.7 : 0.8;
      const env = Math.sin(clamp01(sweep) * Math.PI); // 0 at the edges, 1 mid-face
      drawSparkle(ctx, gx, gy, 2.6 + 1.0 * SP[season].shine, base * env, spec);
      ctx.restore();

      if (season === "Spring") {
        // a faint cool dew shimmer on the pad (additive, seamless)
        const g = 0.16 + 0.2 * (0.5 + 0.5 * Math.sin(t * 2.0));
        ctx.fillStyle = `rgba(235,248,255,${g})`;
        ctx.beginPath();
        ctx.arc(-8, 18.4, 1.0 + g * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // PEAK: a second tiny sparkle twinkles on the rim, out of phase, so the
        // coin reads its most brilliant (still subtle, not a strobe).
        const tw = 0.3 + 0.45 * (0.5 + 0.5 * Math.sin(t * 3.1 + 1.2));
        drawSparkle(ctx, cx - COIN_RX * 0.52, cy - COIN_RY * 0.5, 1.6, tw, spec);
      } else if (season === "Autumn") {
        // a fallen leaf stirs gently on the pad (seamless small rotation)
        const sway = Math.sin(t * 1.4) * 0.25;
        ctx.save();
        ctx.translate(14, 18.6);
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
        // Winter — a drifting snowflake falls past the coin (seamless loop).
        const prog = ((t / 3.2) % 1 + 1) % 1;
        const fy = -20 + prog * 36;
        const fx = 6 + Math.sin(prog * Math.PI * 2) * 3;
        ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(fx, fy, 1.0, 0, Math.PI * 2);
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
