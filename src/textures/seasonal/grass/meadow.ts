// Seasonal art for the MEADOW GRASS tile (`tile_grass_meadow`).
//
// A taller soft tuft of meadow grass: a dense fan of slender blades plus 3–4
// slender SEED STALKS rising straight up from the centre, each topped by a soft
// oval seed head. The SAME tuft + stalk silhouette is drawn every season — only
// colour and dressing (frost, snow caps, pad blossoms / fallen leaves / snow,
// light tint, droop, going-to-seed) change. Enforced by a single parameterized
// `paint(ctx, p, bob)`:
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
  bladeLight: RGB;   // lit face of the meadow-grass blades
  bladeMid: RGB;     // body tone of the blades
  bladeDark: RGB;    // shadowed base / back blades
  stalk: RGB;        // slender seed-stalk stem
  seedHead: RGB;     // soft oval seed head colour
  seedHeadDark: RGB; // shaded side of the seed head
  padGrass: RGB;     // top of the grass pad
  padDark: RGB;      // shaded pad underside
  soil: RGB;         // contact / base soil under the tuft
  outline: RGB;      // soft dark outline tint
  light: RGB;        // ambient light tint laid over the whole tile
  lightAmt: number;  // 0..1 strength of the ambient light wash
  droop: number;     // 0..1 how much the seed heads bow over (autumn high)
  toSeed: number;    // 0..1 going-to-seed fluff / loose seeds on the heads
  gloss: number;     // 0..1 soft summer shimmer on the blades
  frostAmt: number;  // 0..1 cool frost dusting on the tuft
  snowCapAmt: number; // 0..1 snow caps on the seed heads / upper blades
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
    bladeLight: lerpRGB(a.bladeLight, b.bladeLight, t),
    bladeMid: lerpRGB(a.bladeMid, b.bladeMid, t),
    bladeDark: lerpRGB(a.bladeDark, b.bladeDark, t),
    stalk: lerpRGB(a.stalk, b.stalk, t),
    seedHead: lerpRGB(a.seedHead, b.seedHead, t),
    seedHeadDark: lerpRGB(a.seedHeadDark, b.seedHeadDark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    droop: lerp(a.droop, b.droop, t),
    toSeed: lerp(a.toSeed, b.toSeed, t),
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
    droop: clamp01(p.droop),
    toSeed: clamp01(p.toSeed),
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
  // Spring — fresh green tuft, young pale-green upright stalks; dewy lime pad +
  // blossom. Cool-bright light, stalks crisp and upright.
  Spring: {
    bladeLight: [156, 214, 104],
    bladeMid: [104, 176, 70],
    bladeDark: [58, 118, 48],
    stalk: [168, 206, 118],
    seedHead: [196, 224, 140],
    seedHeadDark: [142, 182, 96],
    padGrass: [128, 206, 86],
    padDark: [72, 138, 58],
    soil: [120, 84, 48],
    outline: [40, 64, 30],
    light: [232, 244, 226],
    lightAmt: 0.16,
    droop: 0.05,
    toSeed: 0.0,
    gloss: 0.2,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — full soft mid-green tuft, plump green seed heads (PEAK). Saturated
  // mid-green pad, warm light, soft shimmer on the blades.
  Summer: {
    bladeLight: [148, 206, 88],
    bladeMid: [86, 168, 60],
    bladeDark: [46, 112, 44],
    stalk: [120, 178, 78],
    seedHead: [150, 196, 96],
    seedHeadDark: [98, 150, 64],
    padGrass: [86, 168, 70],
    padDark: [44, 110, 48],
    soil: [126, 86, 48],
    outline: [34, 70, 28],
    light: [255, 240, 206],
    lightAmt: 0.18,
    droop: 0.1,
    toSeed: 0.0,
    gloss: 0.85,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — amber/straw tuft, seed heads drooping and going to seed; olive-tan
  // pad, a couple fallen leaves. Low amber light.
  Autumn: {
    bladeLight: [214, 178, 96],
    bladeMid: [180, 140, 64],
    bladeDark: [124, 92, 42],
    stalk: [196, 162, 90],
    seedHead: [216, 188, 118],
    seedHeadDark: [160, 128, 72],
    padGrass: [150, 152, 86],
    padDark: [104, 96, 52],
    soil: [120, 80, 44],
    outline: [78, 52, 24],
    light: [248, 210, 150],
    lightAmt: 0.2,
    droop: 0.95,
    toSeed: 0.85,
    gloss: 0.3,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — bleached straw stalks, snow caps on the seed heads, snow blanket on
  // the pad, cool light. Stalks still standing, frost dusting.
  Winter: {
    bladeLight: [196, 188, 158],
    bladeMid: [158, 150, 122],
    bladeDark: [110, 104, 88],
    stalk: [186, 178, 150],
    seedHead: [204, 196, 168],
    seedHeadDark: [150, 144, 122],
    padGrass: [176, 196, 214],
    padDark: [120, 146, 172],
    soil: [128, 110, 96],
    outline: [60, 56, 56],
    light: [206, 226, 252],
    lightAmt: 0.3,
    droop: 0.35,
    toSeed: 0.25,
    gloss: 0.18,
    frostAmt: 0.7,
    snowCapAmt: 0.85,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── The single parameterized paint ───────────────────────────────────────────

// Tuft + stalk geometry constants (the SAME silhouette every season). Origin-
// centered. Base of the tuft rests on the pad; stalks rise straight up.
const TUFT_BASE_Y = 18; // contact line on the pad
const TUFT_TOP = -6; // tip line of the tall blade fan
const STALK_TOP = -22; // top of the seed stalks (upright reach)

// Blade fan: [baseX, tipX, tipY, layer] (layer 0 = back/dark, 1 = front/light).
const BLADES: Array<[number, number, number, number]> = [
  [-12, -16, -2, 0],
  [-8, -12, -7, 0],
  [-4.5, -7, -10, 1],
  [-2, -3.5, TUFT_TOP, 1],
  [0.5, 1, TUFT_TOP - 1, 1],
  [3, 5, -9.5, 1],
  [6.5, 10, -6.5, 0],
  [10, 14, -2.5, 0],
  [13, 17, -1, 0],
];

// Seed stalks: [baseX, headX, layer] — 4 slender stalks rising from the centre.
// headY is computed from STALK_TOP with a small per-stalk variation.
const STALKS: Array<[number, number, number]> = [
  [-4.2, -5.6, 0],
  [-1.3, -1.0, 1],
  [1.6, 2.4, 1],
  [4.4, 6.2, 0],
];

/** Draw one seed stalk + its soft oval seed head, driven by `p` + `bob`.
 *  `sway` is a small horizontal tip offset (idle breeze). */
function drawStalk(
  ctx: CanvasRenderingContext2D,
  p: P,
  baseX: number,
  headX: number,
  layer: number,
  bob: number,
  sway: number,
): void {
  const baseY = TUFT_BASE_Y - 4 + bob;
  // droop bows the head over and lowers it a touch (autumn going to seed)
  const droopX = headX + p.droop * 5 * Math.sign(headX || 1);
  const headY = STALK_TOP + bob + p.droop * 6 + Math.abs(baseX) * 0.4;
  const tipX = droopX + sway;
  // mid-control bends with droop + sway for a natural arc
  const midX = lerp(baseX, tipX, 0.5) + (sway * 0.5) + p.droop * 2 * Math.sign(headX || 1);
  const midY = lerp(baseY, headY, 0.5);

  const stalkCol = layer === 0 ? rgba(p.stalk, 0.9) : rgb(p.stalk);

  // dark base pass (outline) then bright stalk — layered for depth (wheat idiom)
  ctx.strokeStyle = rgba(p.outline, 0.85);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(midX, midY, tipX, headY);
  ctx.stroke();

  ctx.strokeStyle = stalkCol;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(midX, midY, tipX, headY);
  ctx.stroke();

  // soft oval seed head at the tip, tilted toward the droop direction
  const tilt = (p.droop * 0.5) * Math.sign(headX || 1);
  ctx.save();
  ctx.translate(tipX, headY - 1.6);
  ctx.rotate(tilt);
  // outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.6, 4.0, 0, 0, Math.PI * 2);
  ctx.fill();
  // body
  ctx.fillStyle = rgb(p.seedHead);
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.0, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // shaded right side
  ctx.fillStyle = rgba(p.seedHeadDark, 0.7);
  ctx.beginPath();
  ctx.ellipse(0.7, 0.4, 1.1, 3.0, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit upper-left edge
  ctx.fillStyle = rgba(p.bladeLight, 0.5);
  ctx.beginPath();
  ctx.ellipse(-0.7, -1.0, 0.7, 1.8, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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

    // ── Soil contact patch directly under the tuft base ─────────────────────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, TUFT_BASE_Y + bob + 1.5, 8, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // contact shadow of the tuft on the pad
    ctx.fillStyle = rgba(p.outline, 0.28);
    ctx.beginPath();
    ctx.ellipse(2.5, TUFT_BASE_Y + bob + 2, 11, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the meadow tuft (SAME silhouette every season) ─────────────
    // Blade fan, drawn back-to-front; each blade dark base pass then bright top.
    const baseY = TUFT_BASE_Y + bob;
    const drawBladeLayer = (wantLayer: number): void => {
      BLADES.forEach(([bx, tipX, tipY, layer]) => {
        if (layer !== wantLayer) return;
        const ty = tipY + bob;
        const midX = lerp(bx, tipX, 0.5);
        const midY = lerp(baseY, ty, 0.45);
        // dark base
        ctx.strokeStyle = layer === 0 ? rgb(p.bladeDark) : rgba(p.outline, 0.8);
        ctx.lineWidth = layer === 0 ? 3.0 : 3.4;
        ctx.beginPath();
        ctx.moveTo(bx, baseY);
        ctx.quadraticCurveTo(midX, midY, tipX, ty);
        ctx.stroke();
        // bright blade
        ctx.strokeStyle = layer === 0 ? rgba(p.bladeMid, 0.95) : rgb(p.bladeMid);
        ctx.lineWidth = layer === 0 ? 1.6 : 1.9;
        ctx.beginPath();
        ctx.moveTo(bx, baseY);
        ctx.quadraticCurveTo(midX, midY, tipX, ty);
        ctx.stroke();
        // front blades get a lit highlight edge
        if (layer === 1) {
          ctx.strokeStyle = rgba(p.bladeLight, 0.7);
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(bx - 0.6, baseY - 1);
          ctx.quadraticCurveTo(midX - 0.8, midY, tipX - 0.5, ty);
          ctx.stroke();
        }
      });
    };

    // back blades, then seed stalks (mid-depth), then front blades over the base
    drawBladeLayer(0);

    // seed stalks rising straight up from the centre (idle sway = 0 in still)
    STALKS.forEach(([baseX, headX, layer]) => {
      drawStalk(ctx, p, baseX, headX, layer, bob, 0);
    });

    drawBladeLayer(1);

    // going-to-seed loose fluff around the heads (autumn) — tiny pale specks
    if (p.toSeed > 0.02) {
      ctx.fillStyle = rgba([238, 226, 188], 0.5 * p.toSeed);
      const fluff: Array<[number, number]> = [
        [-6, STALK_TOP + 4], [-1, STALK_TOP + 6], [3, STALK_TOP + 3], [7, STALK_TOP + 7],
      ];
      fluff.forEach(([fx, fy]) => {
        ctx.beginPath();
        ctx.arc(fx, fy + bob + p.droop * 5, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // ── Frost dusting (winter) on the upward blade tips + seed heads ─────────
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-12, -2], [-7, -7], [-3, TUFT_TOP], [1, TUFT_TOP - 1], [5, -9],
        [10, -6], [14, -2], [-5, STALK_TOP + 2], [2, STALK_TOP + 2],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy + bob, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // ── Snow caps on the seed heads (winter), drawn over ────────────────────
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      STALKS.forEach(([baseX, headX]) => {
        const droopX = headX + p.droop * 5 * Math.sign(headX || 1);
        const headY = STALK_TOP + bob + p.droop * 6 + Math.abs(baseX) * 0.4;
        ctx.beginPath();
        ctx.ellipse(droopX, headY - 3.6, 2.4, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      // a little snow nestled in the blade fan crown
      ctx.fillStyle = rgba([238, 246, 255], 0.6 * a);
      ctx.beginPath();
      ctx.ellipse(0, TUFT_TOP + bob + 2, 6, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Soft summer shimmer / dewy gloss on the blade fan ───────────────────
    if (p.gloss > 0.02) {
      ctx.strokeStyle = rgba([255, 255, 255], 0.1 + 0.22 * p.gloss);
      ctx.lineWidth = 0.8;
      [-7, -2, 4].forEach((bx) => {
        ctx.beginPath();
        ctx.moveTo(bx, baseY - 3);
        ctx.lineTo(bx - 1.5, lerp(baseY, TUFT_TOP + bob, 0.6));
        ctx.stroke();
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
function bobAt(t: number, amp = 0.7, w = 1.4): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  const p = SP[season];
  return (ctx, t) => {
    const bob = bobAt(t);
    // Seed stalks nod and sway gently in a breeze. We render the base paint at
    // the rest pose for the pad/blades, then redraw the stalks with a seamless
    // horizontal sway so they read as nodding (not sliding the whole subject).
    paint(ctx, p, bob);

    ctx.save();
    try {
      ctx.globalAlpha = 1;
      // gentle breeze: seamless sway via sin, slightly phased per stalk
      const cp = clampP(p);
      STALKS.forEach(([baseX, headX, layer], i) => {
        const sway = Math.sin(t * 1.3 + i * 1.1) * 1.4 + Math.sin(t * 0.7) * 0.5;
        drawStalk(ctx, cp, baseX, headX, layer, bob, sway);
      });

      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint travelling on the blades
        const g = 0.2 + 0.28 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        const gy = -4 + bob + Math.sin(t * 1.1) * 2.0;
        ctx.beginPath();
        ctx.arc(-4, gy, 1.0 + g * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // soft shimmer drifting up the blade fan
        const prog = (t * 0.35) % 1;
        const gy = lerp(TUFT_BASE_Y + bob - 2, TUFT_TOP + bob, prog);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.ellipse(-3, gy, 2.4, 1.2, -0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // a drooping seed head bobs a touch extra + a single drifting seed
        const prog = ((t / 4.0) % 1 + 1) % 1;
        const sx = 4 + Math.sin(prog * Math.PI * 2) * 4;
        const sy = STALK_TOP + 6 + prog * 24;
        ctx.globalAlpha = 0.55 * Math.sin(prog * Math.PI);
        ctx.fillStyle = "rgba(216,188,118,1)";
        ctx.beginPath();
        ctx.ellipse(sx, sy, 1.1, 1.8, prog * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        // Winter — drifting snowflakes + a faint cold sheen
        const seeds: Array<[number, number, number]> = [
          [-9, 0.0, 1.0], [6, 0.4, 0.9], [11, 0.7, 0.8], [-2, 0.25, 0.9],
        ];
        ctx.fillStyle = "#ffffff";
        seeds.forEach(([fx, phase, r]) => {
          const prog = ((t / 3.0 + phase) % 1 + 1) % 1;
          const fy = -22 + prog * 40;
          const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
          ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.arc(dx, fy, r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 0.1 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.8));
        ctx.fillStyle = "rgba(210,232,255,1)";
        ctx.beginPath();
        ctx.ellipse(-3, 2 + bob, 7, 5, -0.2, 0, Math.PI * 2);
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
