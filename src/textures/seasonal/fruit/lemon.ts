// Seasonal art for the LEMON fruit tile (`tile_fruit_lemon`).
//
// ARCHITECTURE — a single parameterized `paint`. Every season, every idle
// frame, and every transition frame routes through ONE function whose look is
// driven solely by a tweenable param bundle `P` plus a vertical `bob` offset.
// Because seasons differ only in numbers/colours (never in code branches), the
// season→season transitions are just a per-field lerp of two `P`s — so
// transition(0) is pixel-identical to the FROM still and transition(1) to the
// TO still. No snapping, no flash.
//
// The subject is ONE lemon: a plump oval citrus with a small blunt nub at top
// and bottom, dimpled skin, and a single leaf at the shoulder, resting low-centre
// on a flat pad. The SILHOUETTE is identical in every season — ripeness and
// weather (frost, snow, gloss, leaf colour) ride on top via `P`, never on shape.
//
// Origin-centered in the −24..+24 design box; light comes from the upper-left.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable param bundle ───────────────────────────────────────────────────

type RGB = [number, number, number];

interface P {
  // Subject skin (cel ramp: dark base → mid → light highlight).
  skinDark: RGB;
  skinMid: RGB;
  skinLight: RGB;
  // Leaf colour.
  leaf: RGB;
  leafVein: RGB;
  // Pad grass + soil under-rim.
  padGrass: RGB;
  padShade: RGB;
  soil: RGB;
  // Soft outline tint applied to the subject (mixed toward this for season mood).
  outline: RGB;
  // Ambient light wash over the whole tile (warm/cool mood).
  lightTint: RGB;
  lightAmt: number; // 0..1 strength of the ambient wash
  // Scalars 0..1.
  ripeness: number; // 0 green-unripe → 1 deep waxy; drives dimple contrast
  gloss: number; // specular sharpness on the rind
  frostAmt: number; // cool frost dusting on the skin
  snowCapAmt: number; // snow on the upward shoulder of the lemon
  padSnowAmt: number; // snow blanket on the pad
  blossomAmt: number; // tiny blossom tucked on the pad (spring)
  fallenLeafAmt: number; // fallen leaves on the pad (autumn)
  shadowAmt: number; // contact-shadow strength under the subject
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function rgb(c: RGB, a = 1): string {
  const r = Math.round(clamp01(c[0] / 255) * 255);
  const g = Math.round(clamp01(c[1] / 255) * 255);
  const b = Math.round(clamp01(c[2] / 255) * 255);
  return `rgba(${r},${g},${b},${a})`;
}

function mix(a: RGB, b: RGB, t: number): RGB {
  const k = clamp01(t);
  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ];
}

// ── Per-season param sets ────────────────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Fresh pastel, cool-bright light, dewy lime pad, tiny blossom.
  Spring: {
    skinDark: [150, 168, 60],
    skinMid: [196, 214, 96],
    skinLight: [232, 244, 160],
    leaf: [108, 196, 84],
    leafVein: [70, 142, 56],
    padGrass: [150, 222, 110],
    padShade: [96, 168, 78],
    soil: [96, 70, 42],
    outline: [92, 96, 48],
    lightTint: [222, 240, 255],
    lightAmt: 0.16,
    ripeness: 0.28,
    gloss: 0.18,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
    shadowAmt: 0.2,
  },
  // Peak: richest saturated yellow, glossy, warm light, strong shadow.
  Summer: {
    skinDark: [212, 158, 22],
    skinMid: [248, 208, 44],
    skinLight: [255, 244, 150],
    leaf: [70, 156, 56],
    leafVein: [44, 110, 40],
    padGrass: [86, 174, 66],
    padShade: [54, 122, 48],
    soil: [104, 74, 40],
    outline: [120, 84, 18],
    lightTint: [255, 244, 198],
    lightAmt: 0.22,
    ripeness: 0.72,
    gloss: 0.62,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    shadowAmt: 0.3,
  },
  // Gold/rust, fully ripe waxy, amber low light, olive-tan pad, fallen leaves.
  Autumn: {
    skinDark: [196, 140, 18],
    skinMid: [240, 192, 40],
    skinLight: [252, 226, 122],
    leaf: [196, 150, 52],
    leafVein: [140, 96, 30],
    padGrass: [150, 146, 78],
    padShade: [104, 100, 54],
    soil: [96, 64, 32],
    outline: [110, 72, 16],
    lightTint: [248, 206, 130],
    lightAmt: 0.24,
    ripeness: 0.92,
    gloss: 0.4,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.8,
    shadowAmt: 0.26,
  },
  // Cool blue-grey light, pad snow + frost, snow cap + frost dusting on skin.
  Winter: {
    skinDark: [198, 168, 64],
    skinMid: [236, 206, 96],
    skinLight: [250, 232, 158],
    leaf: [120, 150, 110],
    leafVein: [84, 112, 84],
    padGrass: [196, 214, 224],
    padShade: [150, 174, 196],
    soil: [88, 92, 104],
    outline: [86, 96, 116],
    lightTint: [196, 220, 255],
    lightAmt: 0.26,
    ripeness: 0.82,
    gloss: 0.3,
    frostAmt: 0.7,
    snowCapAmt: 0.85,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    shadowAmt: 0.18,
  },
};

// ── Param interpolation for transitions ──────────────────────────────────────

function lerpN(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpP(a: P, b: P, t: number): P {
  const k = clamp01(t);
  return {
    skinDark: mix(a.skinDark, b.skinDark, k),
    skinMid: mix(a.skinMid, b.skinMid, k),
    skinLight: mix(a.skinLight, b.skinLight, k),
    leaf: mix(a.leaf, b.leaf, k),
    leafVein: mix(a.leafVein, b.leafVein, k),
    padGrass: mix(a.padGrass, b.padGrass, k),
    padShade: mix(a.padShade, b.padShade, k),
    soil: mix(a.soil, b.soil, k),
    outline: mix(a.outline, b.outline, k),
    lightTint: mix(a.lightTint, b.lightTint, k),
    lightAmt: lerpN(a.lightAmt, b.lightAmt, k),
    ripeness: lerpN(a.ripeness, b.ripeness, k),
    gloss: lerpN(a.gloss, b.gloss, k),
    frostAmt: lerpN(a.frostAmt, b.frostAmt, k),
    snowCapAmt: lerpN(a.snowCapAmt, b.snowCapAmt, k),
    padSnowAmt: lerpN(a.padSnowAmt, b.padSnowAmt, k),
    blossomAmt: lerpN(a.blossomAmt, b.blossomAmt, k),
    fallenLeafAmt: lerpN(a.fallenLeafAmt, b.fallenLeafAmt, k),
    shadowAmt: lerpN(a.shadowAmt, b.shadowAmt, k),
  };
}

// ── Geometry constants (shared silhouette, every season) ─────────────────────

// The lemon body: an oval centred a touch above the pad surface.
const BODY_CX = 0;
const BODY_CY = 6; // rests low-centre on the pad
const BODY_RX = 13;
const BODY_RY = 15;
// Nub centres (top + bottom blunt points along the slightly tilted long axis).
const TILT = -0.12; // gentle lean, radians
const NUB_TOP: readonly [number, number] = [
  BODY_CX + Math.sin(TILT) * (BODY_RY + 1.5),
  BODY_CY - Math.cos(TILT) * (BODY_RY + 1.5),
];
const NUB_BOT: readonly [number, number] = [
  BODY_CX - Math.sin(TILT) * (BODY_RY + 1.5),
  BODY_CY + Math.cos(TILT) * (BODY_RY + 1.5),
];

// Deterministic dimple field across the rind (fixed every season).
const DIMPLES: ReadonlyArray<readonly [number, number]> = [
  [-6, -4], [-2, -7], [3, -5], [7, -1], [-8, 2],
  [-3, 1], [2, 3], [6, 4], [-5, 8], [0, 9], [5, 9], [-9, -2],
  [9, 2], [-1, -3], [4, 7],
];

// ── The single parameterized paint ───────────────────────────────────────────

function paint(ctx: CanvasRenderingContext2D, p: P, bob: number): void {
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    drawPad(ctx, p);
    ctx.save();
    ctx.translate(0, -bob); // subject + its dressing breathe together
    drawLemon(ctx, p);
    ctx.restore();
    drawAmbient(ctx, p);
  } catch {
    // never throw out of a paint
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// Low flat pad ellipse with tufted edge, shaded underside, contact shadow,
// and season dressing (blossom / fallen leaves / snow).
function drawPad(ctx: CanvasRenderingContext2D, p: P): void {
  // soft contact shadow, offset lower-right (under the subject)
  ctx.fillStyle = rgb(p.padShade, 0.35 * p.shadowAmt + 0.18);
  ctx.beginPath();
  ctx.ellipse(2.5, 21, 15, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // pad underside (darker, slightly lower) reads as thickness
  ctx.fillStyle = rgb(p.padShade);
  ctx.beginPath();
  ctx.ellipse(0, 20.5, 18, 5.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // pad top
  ctx.fillStyle = rgb(p.padGrass);
  ctx.beginPath();
  ctx.ellipse(0, 19, 18, 5.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // tufted edge: little blades round the visible rim
  ctx.strokeStyle = rgb(mix(p.padGrass, p.padShade, 0.4));
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 13; i++) {
    const a = Math.PI * (0.04 + (i / 12) * 0.92); // along the front arc
    const ex = Math.cos(a) * 18;
    const ey = 19 + Math.sin(a) * 5.4;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - 0.6, ey + 2.2);
    ctx.stroke();
  }

  // brighter grass sheen toward the light (upper-left of the pad)
  ctx.fillStyle = rgb(mix(p.padGrass, [255, 255, 255], 0.28), 0.5);
  ctx.beginPath();
  ctx.ellipse(-5, 17.5, 9, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // small soil patch peeking at the subject base
  ctx.fillStyle = rgb(p.soil, 0.5);
  ctx.beginPath();
  ctx.ellipse(0, 18.5, 9, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();

  drawPadDressing(ctx, p);
}

function drawPadDressing(ctx: CanvasRenderingContext2D, p: P): void {
  // Spring blossom tucked at the pad's left.
  if (p.blossomAmt > 0.02) {
    const a = clamp01(p.blossomAmt);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(-12, 17.5);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      ctx.fillStyle = "rgba(255,236,246,1)";
      ctx.beginPath();
      ctx.ellipse(Math.cos(ang) * 2.4, Math.sin(ang) * 1.7, 1.9, 1.4, ang, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,206,86,1)";
    ctx.beginPath();
    ctx.arc(0, 0, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // Autumn fallen leaves on the pad.
  if (p.fallenLeafAmt > 0.02) {
    const a = clamp01(p.fallenLeafAmt);
    const leaves: ReadonlyArray<readonly [number, number, number, RGB]> = [
      [-11, 19.5, 0.5, [206, 120, 42]],
      [12, 18.5, -0.7, [190, 92, 36]],
    ];
    leaves.forEach(([lx, ly, rot, col]) => {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.fillStyle = rgb(col);
      ctx.beginPath();
      ctx.ellipse(0, 0, 4, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgb(mix(col, [80, 40, 16], 0.5));
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(4, 0);
      ctx.stroke();
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  // Winter pad snow blanket + frost sparkle.
  if (p.padSnowAmt > 0.02) {
    const a = clamp01(p.padSnowAmt);
    ctx.save();
    ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(0, 14, 0, 24);
    g.addColorStop(0, "rgba(244,248,255,1)");
    g.addColorStop(1, "rgba(206,222,240,1)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 18.5, 17, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // a few sparkle flecks
    ctx.fillStyle = "rgba(255,255,255,1)";
    [[-10, 18], [-3, 20], [6, 17.5], [11, 19.5]].forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.9, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

// The lemon itself — silhouette identical every season; only colour/dressing vary.
function drawLemon(ctx: CanvasRenderingContext2D, p: P): void {
  // soft dark outline halo (layered dark-then-light, like wheat)
  ctx.fillStyle = rgb(p.outline, 0.9);
  ctx.beginPath();
  ctx.ellipse(BODY_CX, BODY_CY, BODY_RX + 1.4, BODY_RY + 1.4, TILT, 0, Math.PI * 2);
  ctx.fill();
  // nub knobs sit inside the halo
  ctx.beginPath();
  ctx.ellipse(NUB_TOP[0], NUB_TOP[1], 3.2, 2.6, TILT, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(NUB_BOT[0], NUB_BOT[1], 2.8, 2.4, TILT, 0, Math.PI * 2);
  ctx.fill();

  // body base (dark cel)
  ctx.fillStyle = rgb(p.skinDark);
  ctx.beginPath();
  ctx.ellipse(BODY_CX, BODY_CY, BODY_RX, BODY_RY, TILT, 0, Math.PI * 2);
  ctx.fill();

  // clip everything else to the body so dimples/gloss/frost stay on the rind
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(BODY_CX, BODY_CY, BODY_RX, BODY_RY, TILT, 0, Math.PI * 2);
  ctx.clip();

  // mid tone covering most of the rind
  ctx.fillStyle = rgb(p.skinMid);
  ctx.beginPath();
  ctx.ellipse(BODY_CX, BODY_CY, BODY_RX, BODY_RY, TILT, 0, Math.PI * 2);
  ctx.fill();

  // lit upper-left lobe (radial light shape)
  const lg = ctx.createRadialGradient(-5, BODY_CY - 6, 2, -3, BODY_CY - 3, BODY_RX + 4);
  lg.addColorStop(0, rgb(p.skinLight, 0.95));
  lg.addColorStop(0.55, rgb(p.skinMid, 0.0));
  lg.addColorStop(1, rgb(p.skinMid, 0.0));
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.ellipse(BODY_CX, BODY_CY, BODY_RX, BODY_RY, TILT, 0, Math.PI * 2);
  ctx.fill();

  // lower-right core shade
  const sg = ctx.createRadialGradient(6, BODY_CY + 7, 2, 6, BODY_CY + 7, BODY_RX + 6);
  sg.addColorStop(0, rgb(p.skinDark, 0.45));
  sg.addColorStop(0.7, rgb(p.skinDark, 0.0));
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.ellipse(BODY_CX, BODY_CY, BODY_RX, BODY_RY, TILT, 0, Math.PI * 2);
  ctx.fill();

  // dimple/pore texture — paired dark+light specks; contrast grows with ripeness
  const dimC = 0.18 + p.ripeness * 0.32;
  DIMPLES.forEach(([dx, dy]) => {
    ctx.fillStyle = rgb(p.skinDark, dimC * 0.7);
    ctx.beginPath();
    ctx.arc(dx, BODY_CY + dy, 0.95, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(p.skinLight, dimC * 0.55);
    ctx.beginPath();
    ctx.arc(dx - 0.7, BODY_CY + dy - 0.7, 0.6, 0, Math.PI * 2);
    ctx.fill();
  });

  // frost dusting (winter) — cool blue speckle on the upper rind
  if (p.frostAmt > 0.01) {
    const fa = clamp01(p.frostAmt);
    ctx.fillStyle = `rgba(212,232,255,${0.34 * fa})`;
    ctx.beginPath();
    ctx.ellipse(-2, BODY_CY - 5, BODY_RX - 2, BODY_RY - 4, TILT, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${0.7 * fa})`;
    DIMPLES.forEach(([dx, dy], i) => {
      if (i % 2 === 0 && dy < 4) {
        ctx.beginPath();
        ctx.arc(dx, BODY_CY + dy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // specular gloss (sharp toward summer)
  const glossA = 0.25 + p.gloss * 0.6;
  ctx.fillStyle = `rgba(255,255,255,${glossA})`;
  ctx.beginPath();
  ctx.ellipse(-5, BODY_CY - 6, 3.6 - p.gloss * 1.2, 6 - p.gloss * 2, TILT - 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // unclip

  // snow cap on the upward (upper-left) shoulder — outside clip, sits on rind
  if (p.snowCapAmt > 0.01) {
    const sa = clamp01(p.snowCapAmt);
    ctx.fillStyle = `rgba(248,252,255,${0.95 * sa})`;
    ctx.beginPath();
    ctx.ellipse(-3.5, BODY_CY - 10, 8.5 * sa + 2, 4.5 * sa + 1.5, TILT - 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(210,226,244,${0.6 * sa})`;
    ctx.beginPath();
    ctx.ellipse(-2, BODY_CY - 8, 7 * sa + 1.5, 2.4, TILT, 0, Math.PI * 2);
    ctx.fill();
  }

  drawLeaf(ctx, p);
}

// A single leaf at the top shoulder; colour from p.leaf (green→amber).
function drawLeaf(ctx: CanvasRenderingContext2D, p: P): void {
  ctx.save();
  ctx.translate(NUB_TOP[0] + 1, NUB_TOP[1] - 1);
  ctx.rotate(-0.5);
  // dark base
  ctx.fillStyle = rgb(mix(p.leaf, p.leafVein, 0.5));
  ctx.beginPath();
  ctx.ellipse(5.5, 0, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // leaf body
  ctx.fillStyle = rgb(p.leaf);
  ctx.beginPath();
  ctx.ellipse(5, -0.4, 6.4, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // highlight
  ctx.fillStyle = rgb(mix(p.leaf, [255, 255, 255], 0.4), 0.6);
  ctx.beginPath();
  ctx.ellipse(3.5, -1, 2.8, 1, 0, 0, Math.PI * 2);
  ctx.fill();
  // vein
  ctx.strokeStyle = rgb(p.leafVein);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-0.5, 0);
  ctx.lineTo(11, -0.6);
  ctx.stroke();
  ctx.restore();
}

// Whole-tile ambient light wash for season mood (cool-bright / warm / amber / cold).
function drawAmbient(ctx: CanvasRenderingContext2D, p: P): void {
  if (p.lightAmt <= 0) return;
  const g = ctx.createRadialGradient(-8, -6, 4, 0, 4, 34);
  g.addColorStop(0, rgb(p.lightTint, p.lightAmt));
  g.addColorStop(1, rgb(p.lightTint, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-24, -24, 48, 48);
}

// ── Idle bob (seamless, zero-velocity at t=0) ────────────────────────────────

function bobAt(t: number, amp = 1.1, w = 1.5): number {
  // A*(1-cos(w t))/2 → value 0 and derivative 0 at t=0; smooth seamless loop.
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Per-season micro-motion (additive, never moves the subject at t=0) ───────

function microMotion(ctx: CanvasRenderingContext2D, season: SeasonName, t: number): void {
  switch (season) {
    case "Spring": {
      // dew shimmer: a soft highlight pulse on the rind
      const a = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(t * 2.2));
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.arc(-4, BODY_CY - 4, 1.6 + a, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "Summer": {
      // specular glint travels along the rind
      const prog = (t * 0.35) % 1;
      const gx = -7 + prog * 14;
      const gy = BODY_CY - 8 + prog * 14;
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.ellipse(gx, gy, 1.8, 3, -0.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "Autumn": {
      // leaf flutter: small rotating amber accent near the leaf tip
      const fl = Math.sin(t * 2.6) * 1.2;
      ctx.save();
      ctx.translate(NUB_TOP[0] + 9, NUB_TOP[1] - 5);
      ctx.rotate(fl * 0.12);
      ctx.fillStyle = "rgba(212,150,60,0.7)";
      ctx.beginPath();
      ctx.ellipse(fl * 0.4, 0, 2.4, 1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "Winter": {
      // drifting snowflakes + cold sheen
      const seeds: ReadonlyArray<readonly [number, number]> = [
        [-9, 0.0], [-2, 0.4], [6, 0.7], [11, 0.25],
      ];
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      seeds.forEach(([fx, ph]) => {
        const prog = ((t / 3.4 + ph) % 1 + 1) % 1;
        const fy = -20 + prog * 36;
        const dx = fx + Math.sin(prog * Math.PI * 2 + ph * 6) * 2.4;
        ctx.beginPath();
        ctx.arc(dx, fy, 1.0, 0, Math.PI * 2);
        ctx.fill();
      });
      const sheen = 0.1 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.9));
      ctx.fillStyle = `rgba(200,224,255,${sheen})`;
      ctx.beginPath();
      ctx.ellipse(-3, BODY_CY - 4, 7, 3, TILT, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}

// ── Smootherstep for transitions ─────────────────────────────────────────────

const smoother = (x: number): number => x * x * x * (x * (6 * x - 15) + 10);

// ── Public factories ─────────────────────────────────────────────────────────

function makeDraw(season: SeasonName) {
  return (ctx: CanvasRenderingContext2D): void => paint(ctx, SP[season], 0);
}

function makeAnim(season: SeasonName) {
  return (ctx: CanvasRenderingContext2D, t: number): void => {
    paint(ctx, SP[season], bobAt(t));
    // micro-motion is additive overlay on top of the painted subject
    ctx.save();
    try {
      ctx.translate(0, -bobAt(t)); // ride with the bobbing subject
      microMotion(ctx, season, t);
    } catch {
      /* never throw */
    } finally {
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  };
}

function makeTransition(fromIdx: 0 | 1 | 2) {
  const from = SEASON_NAMES[fromIdx];
  const to = SEASON_NAMES[fromIdx + 1];
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const k = smoother(clamp01(pp));
    paint(ctx, lerpP(SP[from], SP[to], k), 0);
  };
}

// ── Exports ──────────────────────────────────────────────────────────────────

export const VARIANTS: SeasonalTileEntry = {
  Spring: { draw: makeDraw("Spring"), anim: makeAnim("Spring") },
  Summer: { draw: makeDraw("Summer"), anim: makeAnim("Summer") },
  Autumn: { draw: makeDraw("Autumn"), anim: makeAnim("Autumn") },
  Winter: { draw: makeDraw("Winter"), anim: makeAnim("Winter") },
};

export const TRANSITIONS: SeasonalTransitionSet = {
  0: makeTransition(0), // Spring → Summer
  1: makeTransition(1), // Summer → Autumn
  2: makeTransition(2), // Autumn → Winter
};
