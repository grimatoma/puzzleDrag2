// Seasonal art for the WATER LILY flower tile (`tile_flower_water_lily`).
//
// SPECIAL: the "ground" for this tile is a small pool of STILL WATER — not
// grass turf — with a round green lily pad floating on it and a lotus bloom
// resting on the pad. Every season is the SAME subject (a lotus on a lily pad
// on a pool); only the WATER colour, the lily pad colour, the bloom openness,
// the ice/frost, and small dressing change.
//
// Architecture: a single parameterized `paint(ctx, p, bob)` draws the whole
// tile from tweenable params `P`. Each season is a frozen `P` in `SP`. The
// four season redraws, the per-season idle loops, and the three forward
// season→season transition morphs ALL route through `paint`, so:
//   draw(season)        === paint(ctx, SP[season], 0)
//   transition(0)       === draw(from),  transition(1) === draw(to)
// — no snap at the seams, and the subject never disappears.
//
// Origin-centered −24..+24 design box, light from upper-left, flat cel-shaded
// with a soft dark outline (layered dark-then-light like wheat.ts).

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tiny utilities ───────────────────────────────────────────────────────────

type RGB = [number, number, number];

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function rgb(c: RGB, alpha = 1): string {
  const r = Math.round(clamp01(c[0] / 255) * 255);
  const g = Math.round(clamp01(c[1] / 255) * 255);
  const b = Math.round(clamp01(c[2] / 255) * 255);
  return `rgba(${r},${g},${b},${clamp01(alpha)})`;
}

/** Smoothstep^2 (quintic) easing — zero velocity at both ends. */
const smoother = (x: number): number => x * x * x * (x * (6 * x - 15) + 10);

/** Idle bob: 0 with zero velocity at t=0, seamless period. */
function bobAt(t: number, amp = 0.9, w = 1.5): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Tweenable params ─────────────────────────────────────────────────────────

interface P {
  // colours
  petal: RGB; // outer lotus petals
  petalTip: RGB; // petal tip / blush
  center: RGB; // flower centre (seed pod / stamens)
  pad: RGB; // lily pad top
  padDark: RGB; // lily pad shadow / notch
  water: RGB; // water surface (lit)
  waterDeep: RGB; // water in shadow / depth
  outline: RGB; // soft dark outline tint

  // scalars 0..1
  bloomOpen: number; // 0 = closed bud, 1 = fully open lotus
  iceAmt: number; // 0 = liquid water, 1 = frozen ice surface
  frostAmt: number; // frost sparkle on pad + bloom
  padSnowAmt: number; // snow cap dusting on the pad
  padYellow: number; // edge-yellowing of the pad (autumn)
  gloss: number; // wet sheen / specular strength
  dressLeaf: number; // a fallen leaf resting on the water (autumn)
  dressBlossom: number; // a tiny stray petal/blossom on the pad (spring)
}

// Four season parameter sets. SILHOUETTE constant; only these values change.
const SP: Record<SeasonName, P> = {
  // Spring — cool-bright; fresh blue water, new small pad, closed pink bud.
  Spring: {
    petal: [236, 168, 196],
    petalTip: [214, 110, 150],
    center: [232, 214, 120],
    pad: [108, 178, 86],
    padDark: [58, 114, 56],
    water: [122, 186, 224],
    waterDeep: [74, 134, 186],
    outline: [40, 58, 70],
    bloomOpen: 0.18,
    iceAmt: 0,
    frostAmt: 0,
    padSnowAmt: 0,
    padYellow: 0,
    gloss: 0.55,
    dressLeaf: 0,
    dressBlossom: 0.7,
  },
  // Summer — peak; bright saturated blue, glossy green pad, open lotus.
  Summer: {
    petal: [250, 222, 232],
    petalTip: [240, 138, 178],
    center: [248, 212, 78],
    pad: [86, 172, 62],
    padDark: [44, 104, 44],
    water: [86, 174, 230],
    waterDeep: [44, 124, 196],
    outline: [34, 56, 64],
    bloomOpen: 0.95,
    iceAmt: 0,
    frostAmt: 0,
    padSnowAmt: 0,
    padYellow: 0,
    gloss: 0.9,
    dressLeaf: 0,
    dressBlossom: 0,
  },
  // Autumn — low amber light; duller olive water, pad yellowing, bloom closing.
  Autumn: {
    petal: [224, 158, 172],
    petalTip: [196, 96, 110],
    center: [210, 162, 70],
    pad: [134, 156, 64],
    padDark: [92, 100, 44],
    water: [120, 150, 150],
    waterDeep: [78, 110, 116],
    outline: [48, 50, 46],
    bloomOpen: 0.34,
    iceAmt: 0,
    frostAmt: 0,
    padSnowAmt: 0,
    padYellow: 0.85,
    gloss: 0.4,
    dressLeaf: 0.85,
    dressBlossom: 0,
  },
  // Winter — cool blue-grey; water frozen to pale ice, pad & bloom frosted.
  Winter: {
    petal: [222, 224, 234],
    petalTip: [196, 178, 200],
    center: [214, 210, 196],
    pad: [148, 176, 168],
    padDark: [96, 128, 130],
    water: [206, 224, 236],
    waterDeep: [168, 196, 216],
    outline: [70, 88, 104],
    bloomOpen: 0.3,
    iceAmt: 0.92,
    frostAmt: 0.85,
    padSnowAmt: 0.7,
    padYellow: 0,
    gloss: 0.5,
    dressLeaf: 0,
    dressBlossom: 0,
  },
};

function lerpP(a: P, b: P, t: number): P {
  const s = clamp01(t);
  return {
    petal: lerpRGB(a.petal, b.petal, s),
    petalTip: lerpRGB(a.petalTip, b.petalTip, s),
    center: lerpRGB(a.center, b.center, s),
    pad: lerpRGB(a.pad, b.pad, s),
    padDark: lerpRGB(a.padDark, b.padDark, s),
    water: lerpRGB(a.water, b.water, s),
    waterDeep: lerpRGB(a.waterDeep, b.waterDeep, s),
    outline: lerpRGB(a.outline, b.outline, s),
    bloomOpen: lerp(a.bloomOpen, b.bloomOpen, s),
    iceAmt: lerp(a.iceAmt, b.iceAmt, s),
    frostAmt: lerp(a.frostAmt, b.frostAmt, s),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, s),
    padYellow: lerp(a.padYellow, b.padYellow, s),
    gloss: lerp(a.gloss, b.gloss, s),
    dressLeaf: lerp(a.dressLeaf, b.dressLeaf, s),
    dressBlossom: lerp(a.dressBlossom, b.dressBlossom, s),
  };
}

// ── The single parameterized paint ──────────────────────────────────────────
//
// `bob` is the subject's vertical idle offset (0 = rest). `extra` carries
// additive micro-motion (ripple shimmer, glints, drifting dressing) that is
// independent of the still — it is all 0 in the still draws & transitions.

interface Micro {
  ripple: number; // 0..1 ripple shimmer strength on the pool
  petalGlint: number; // 0..1 summer glint on petals
  iceSheen: number; // 0..1 winter cold sheen on the ice
  flakeY: number; // winter drifting snowflake vertical progress (0..1; <0 = none)
  flakeX: number; // winter snowflake x offset
  leafDrift: number; // autumn fallen-leaf horizontal drift (px)
  dewPulse: number; // spring dew shimmer 0..1
}

const NO_MICRO: Micro = {
  ripple: 0,
  petalGlint: 0,
  iceSheen: 0,
  flakeY: -1,
  flakeX: 0,
  leafDrift: 0,
  dewPulse: 0,
};

function paint(
  ctx: CanvasRenderingContext2D,
  raw: P,
  bob: number,
  micro: Micro = NO_MICRO,
): void {
  // Clamp every scalar defensively so we never draw garbage / throw.
  const p: P = {
    ...raw,
    bloomOpen: clamp01(raw.bloomOpen),
    iceAmt: clamp01(raw.iceAmt),
    frostAmt: clamp01(raw.frostAmt),
    padSnowAmt: clamp01(raw.padSnowAmt),
    padYellow: clamp01(raw.padYellow),
    gloss: clamp01(raw.gloss),
    dressLeaf: clamp01(raw.dressLeaf),
    dressBlossom: clamp01(raw.dressBlossom),
  };

  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Contact shadow (lower-right, soft) ──────────────────────────────────
    ctx.fillStyle = rgb([0, 0, 0], 0.2);
    ctx.beginPath();
    ctx.ellipse(2.5, 22.5, 16, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── The pool of water (the "ground" disc) ───────────────────────────────
    const poolCx = 0;
    const poolCy = 19;
    const poolRx = 18;
    const poolRy = 5.6;

    // soft rim / outline under the water
    ctx.fillStyle = rgb(p.outline, 0.55);
    ctx.beginPath();
    ctx.ellipse(poolCx, poolCy + 0.6, poolRx + 1.1, poolRy + 1.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // water body — vertical gradient deep→lit
    const wg = ctx.createLinearGradient(0, poolCy - poolRy, 0, poolCy + poolRy);
    wg.addColorStop(0, rgb(p.water));
    wg.addColorStop(1, rgb(p.waterDeep));
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.ellipse(poolCx, poolCy, poolRx, poolRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // ripple shimmer — additive concentric arcs (idle only)
    if (micro.ripple > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(poolCx, poolCy, poolRx, poolRy, 0, 0, Math.PI * 2);
      ctx.clip();
      const a = 0.16 * micro.ripple;
      ctx.strokeStyle = rgb([255, 255, 255], a);
      ctx.lineWidth = 0.9;
      for (let i = 0; i < 3; i++) {
        const ry = 1.4 + i * 1.6 + micro.ripple * 0.8;
        ctx.beginPath();
        ctx.ellipse(-5 + i * 4, poolCy - 1 + i * 1.2, 7 - i, ry * 0.5, 0, 0, Math.PI);
        ctx.stroke();
      }
      ctx.restore();
    }

    // frozen ice overlay — pale sheet over the water in winter
    if (p.iceAmt > 0.02) {
      const ig = ctx.createLinearGradient(0, poolCy - poolRy, 0, poolCy + poolRy);
      ig.addColorStop(0, rgb([238, 248, 255], 0.9 * p.iceAmt));
      ig.addColorStop(1, rgb([196, 220, 236], 0.85 * p.iceAmt));
      ctx.fillStyle = ig;
      ctx.beginPath();
      ctx.ellipse(poolCx, poolCy, poolRx, poolRy, 0, 0, Math.PI * 2);
      ctx.fill();
      // crack lines
      ctx.strokeStyle = rgb([150, 184, 208], 0.5 * p.iceAmt);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-12, poolCy + 1);
      ctx.lineTo(-3, poolCy - 1.5);
      ctx.lineTo(6, poolCy + 1.6);
      ctx.lineTo(14, poolCy - 0.8);
      ctx.stroke();
      // cold sheen sweep (idle additive) + base specular
      const sheen = 0.18 + micro.iceSheen * 0.28;
      ctx.fillStyle = rgb([255, 255, 255], sheen * p.iceAmt);
      ctx.beginPath();
      ctx.ellipse(-4, poolCy - 1.6, 11, 1.8, -0.08, 0, Math.PI * 2);
      ctx.fill();
      // frost sparkle dots
      ctx.fillStyle = rgb([255, 255, 255], 0.8 * p.frostAmt);
      const sparkles: Array<[number, number]> = [
        [-13, 20], [-6, 17.5], [3, 21], [11, 18.5], [15, 20.5], [-1, 18],
      ];
      for (const [sx, sy] of sparkles) {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // liquid water highlight band (specular, scales with gloss)
      ctx.fillStyle = rgb([255, 255, 255], 0.16 + 0.22 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(-5, poolCy - 2, 9, 1.5, -0.06, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Fallen leaf dressing on the water (autumn) ──────────────────────────
    if (p.dressLeaf > 0.02) {
      ctx.save();
      ctx.globalAlpha = p.dressLeaf;
      const lx = 11 + micro.leafDrift;
      const ly = 21;
      ctx.translate(lx, ly);
      ctx.rotate(0.5 + micro.leafDrift * 0.03);
      ctx.fillStyle = rgb([186, 116, 48]);
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.6, 2.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgb([120, 70, 28]);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-3.4, 0);
      ctx.lineTo(3.4, 0);
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // Everything from here rides the idle bob.
    ctx.translate(0, -bob);

    // ── Lily pad floating on the pool ───────────────────────────────────────
    const padCx = 0;
    const padCy = 16.5;
    const padRx = 14.5;
    const padRy = 6.2;
    const padCol = lerpRGB(p.pad, [196, 182, 86], p.padYellow * 0.55);
    const padDarkCol = lerpRGB(p.padDark, [148, 132, 58], p.padYellow * 0.55);

    // pad outline / underside shadow
    ctx.fillStyle = rgb(p.outline, 0.7);
    ctx.beginPath();
    ctx.ellipse(padCx, padCy + 0.8, padRx + 1, padRy + 1, 0, 0, Math.PI * 2);
    ctx.fill();

    // pad body (dark base, then lit top — like wheat.ts layering)
    ctx.fillStyle = rgb(padDarkCol);
    ctx.beginPath();
    ctx.ellipse(padCx, padCy, padRx, padRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // lit upper face, offset toward upper-left light
    ctx.fillStyle = rgb(padCol);
    ctx.beginPath();
    ctx.ellipse(padCx - 0.6, padCy - 0.9, padRx - 1.2, padRy - 1.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // edge yellowing rim (autumn) — warm ring just inside the rim
    if (p.padYellow > 0.04) {
      ctx.strokeStyle = rgb([206, 184, 78], 0.6 * p.padYellow);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(padCx, padCy, padRx - 1.4, padRy - 1.2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // the classic lily-pad notch (a wedge cut from the front-right)
    ctx.fillStyle = rgb(p.waterDeep);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(padCx + 1, padCy);
    ctx.lineTo(padCx + padRx - 1, padCy + 1.4);
    ctx.lineTo(padCx + padRx - 4, padCy + 3.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // radial vein lines on the pad
    ctx.strokeStyle = rgb(padDarkCol, 0.7);
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2 + 0.25;
      // skip the notch wedge
      if (ang > 0.0 && ang < 0.5) continue;
      ctx.beginPath();
      ctx.moveTo(padCx, padCy - 0.6);
      ctx.lineTo(
        padCx + Math.cos(ang) * (padRx - 2.5),
        padCy - 0.6 + Math.sin(ang) * (padRy - 1.8),
      );
      ctx.stroke();
    }

    // pad glossy sheen
    ctx.fillStyle = rgb([255, 255, 255], 0.12 + 0.18 * p.gloss);
    ctx.beginPath();
    ctx.ellipse(padCx - 4, padCy - 2.4, 5, 1.8, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // pad snow dusting (winter)
    if (p.padSnowAmt > 0.03) {
      ctx.fillStyle = rgb([244, 250, 255], 0.85 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(padCx - 1, padCy - 1.6, padRx - 3.5, padRy - 3, -0.05, 0, Math.PI * 2);
      ctx.fill();
    }

    // tiny stray blossom resting on the pad (spring)
    if (p.dressBlossom > 0.04) {
      ctx.save();
      ctx.globalAlpha = p.dressBlossom;
      ctx.fillStyle = rgb([244, 196, 214]);
      ctx.translate(padCx + 8.5, padCy + 0.5);
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.rotate((i / 5) * Math.PI * 2);
        ctx.beginPath();
        ctx.ellipse(0, -1.6, 0.9, 1.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = rgb([244, 220, 120]);
      ctx.beginPath();
      ctx.arc(0, 0, 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // ── The lotus bloom resting on the pad ──────────────────────────────────
    // Bloom centre sits a little above the pad and rises a touch as it opens.
    const open = p.bloomOpen;
    const bloomCx = 0;
    const bloomCy = 6.5 - open * 4.5; // y ~ +6.5 (bud) .. +2 (open)

    const petalCol = p.petal;
    const tipCol = p.petalTip;
    const outlineCol = p.outline;

    // Helper: one petal as a pointed leaf shape, dark-outlined then filled.
    const drawPetal = (
      angle: number,
      spread: number,
      length: number,
      width: number,
      fill: RGB,
      tip: RGB,
    ): void => {
      ctx.save();
      ctx.translate(bloomCx, bloomCy);
      ctx.rotate(angle);
      // outline
      ctx.fillStyle = rgb(outlineCol, 0.85);
      ctx.beginPath();
      ctx.moveTo(0, spread + 0.6);
      ctx.quadraticCurveTo(-width - 0.6, -length * 0.55, 0, -length - 0.6);
      ctx.quadraticCurveTo(width + 0.6, -length * 0.55, 0, spread + 0.6);
      ctx.fill();
      // body
      const pg = ctx.createLinearGradient(0, spread, 0, -length);
      pg.addColorStop(0, rgb(fill));
      pg.addColorStop(1, rgb(tip));
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.moveTo(0, spread);
      ctx.quadraticCurveTo(-width, -length * 0.55, 0, -length);
      ctx.quadraticCurveTo(width, -length * 0.55, 0, spread);
      ctx.fill();
      ctx.restore();
    };

    // Back row of petals (opens outward with bloomOpen). Drawn first (behind).
    const backCount = 6;
    for (let i = 0; i < backCount; i++) {
      const base = (i - (backCount - 1) / 2) * 0.42;
      // closed → petals near-vertical & tight; open → fanned wide outward.
      const angle = base * (0.35 + open * 1.05);
      const length = lerp(8.5, 12.5, open);
      const width = lerp(2.4, 4.2, open);
      drawPetal(angle, 2.2, length, width, petalCol, tipCol);
    }

    // Front/inner row — tighter, slightly brighter, partly cupping the centre.
    const frontCount = 5;
    const frontFill = lerpRGB(petalCol, [255, 255, 255], 0.18);
    for (let i = 0; i < frontCount; i++) {
      const base = (i - (frontCount - 1) / 2) * 0.4;
      const angle = base * (0.28 + open * 0.7);
      const length = lerp(7.5, 10, open);
      const width = lerp(2.0, 3.2, open);
      drawPetal(angle, 1.4, length, width, frontFill, tipCol);
    }

    // Flower centre — visible mostly when open (seed pod / stamens).
    if (open > 0.12) {
      const ca = clamp01((open - 0.12) / 0.88);
      // pod
      ctx.fillStyle = rgb(outlineCol, 0.8 * ca);
      ctx.beginPath();
      ctx.ellipse(bloomCx, bloomCy - 1.4, 3.2, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgb(p.center, ca);
      ctx.beginPath();
      ctx.ellipse(bloomCx, bloomCy - 1.7, 2.6, 2.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // stamen dots
      ctx.fillStyle = rgb(lerpRGB(p.center, [120, 80, 20], 0.4), ca);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(bloomCx + Math.cos(a) * 1.8, bloomCy - 1.7 + Math.sin(a) * 1.2, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Closed bud: a pink-tipped pointed cap so it still reads as a lotus bud.
      ctx.fillStyle = rgb(outlineCol, 0.8);
      ctx.beginPath();
      ctx.moveTo(bloomCx, bloomCy + 2.4);
      ctx.quadraticCurveTo(bloomCx - 3.6, bloomCy - 3, bloomCx, bloomCy - 9.5);
      ctx.quadraticCurveTo(bloomCx + 3.6, bloomCy - 3, bloomCx, bloomCy + 2.4);
      ctx.fill();
      const bg = ctx.createLinearGradient(0, bloomCy + 2, 0, bloomCy - 9);
      bg.addColorStop(0, rgb(petalCol));
      bg.addColorStop(1, rgb(tipCol));
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(bloomCx, bloomCy + 1.8);
      ctx.quadraticCurveTo(bloomCx - 2.8, bloomCy - 2.8, bloomCx, bloomCy - 8.6);
      ctx.quadraticCurveTo(bloomCx + 2.8, bloomCy - 2.8, bloomCx, bloomCy + 1.8);
      ctx.fill();
    }

    // frost on the bloom (winter) — pale wash + sparkle
    if (p.frostAmt > 0.04) {
      ctx.fillStyle = rgb([236, 246, 255], 0.3 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(bloomCx, bloomCy - 1, 7.5, 8.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgb([255, 255, 255], 0.85 * p.frostAmt);
      const fs: Array<[number, number]> = [[-3, bloomCy - 4], [2.5, bloomCy - 6], [0, bloomCy + 1]];
      for (const [fx, fy] of fs) {
        ctx.beginPath();
        ctx.arc(fx, fy, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // summer petal glint (idle additive) — a soft moving sparkle, no glow.
    if (micro.petalGlint > 0) {
      ctx.fillStyle = rgb([255, 255, 255], 0.45 * micro.petalGlint);
      ctx.beginPath();
      ctx.ellipse(bloomCx - 2.2, bloomCy - 3.5, 1.4, 2.2, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // spring dew on the pad/bud (idle additive)
    if (micro.dewPulse > 0) {
      ctx.fillStyle = rgb([255, 255, 255], 0.5 * micro.dewPulse);
      ctx.beginPath();
      ctx.arc(bloomCx + 2, bloomCy + 1, 1.0 + 0.4 * micro.dewPulse, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // undo bob translate region (paired with ctx.save at top)
    return;
  } catch {
    // never throw out of paint
    try {
      ctx.restore();
    } catch {
      /* ignore */
    }
  }
  ctx.globalAlpha = 1;
}

// Note: the single top-level ctx.save() is balanced by the ctx.restore() on the
// success path (which also discards the inner bob translate); the catch path
// restores too. globalAlpha is reset to 1 after.

// ── Per-season draws ─────────────────────────────────────────────────────────

function makeDraw(season: SeasonName) {
  return (ctx: CanvasRenderingContext2D): void => paint(ctx, SP[season], 0);
}

// ── Per-season idle loops ────────────────────────────────────────────────────
// Subject bob is 0 at t=0 (zero velocity); micro-motion is additive shimmer.

function animSpring(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = bobAt(t, 0.7, 1.4);
  const micro: Micro = {
    ...NO_MICRO,
    ripple: 0.5 + 0.5 * Math.sin(t * 1.8),
    dewPulse: 0.5 + 0.5 * Math.sin(t * 2.2),
  };
  paint(ctx, SP.Spring, bob, micro);
}

function animSummer(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = bobAt(t, 0.9, 1.5);
  const micro: Micro = {
    ...NO_MICRO,
    ripple: 0.5 + 0.5 * Math.sin(t * 2.0),
    petalGlint: 0.5 + 0.5 * Math.sin(t * 1.6),
  };
  paint(ctx, SP.Summer, bob, micro);
}

function animAutumn(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = bobAt(t, 0.6, 1.1);
  // fallen leaf drifts back and forth seamlessly on the water
  const micro: Micro = {
    ...NO_MICRO,
    ripple: 0.4 + 0.4 * Math.sin(t * 1.4),
    leafDrift: Math.sin(t * 0.9) * 4,
  };
  paint(ctx, SP.Autumn, bob, micro);
}

function animWinter(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = bobAt(t, 0.5, 1.0);
  // a single snowflake falls + drifts, then loops seamlessly
  const prog = (t / 3.4) % 1;
  const micro: Micro = {
    ...NO_MICRO,
    iceSheen: 0.5 + 0.5 * Math.sin(t * 0.9),
    flakeY: prog,
    flakeX: Math.sin(prog * Math.PI * 2) * 5,
  };
  paint(ctx, SP.Winter, bob, micro);

  // draw the drifting snowflake on top (outside paint so it floats over all)
  if (micro.flakeY >= 0) {
    const fy = -20 + prog * 40;
    const fx = micro.flakeX;
    ctx.save();
    ctx.globalAlpha = 0.9 * (1 - Math.abs(prog - 0.5) * 0.4);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(fx, fy, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

// ── Forward transitions (smoother-eased, every field interpolated) ───────────

function makeTransition(fromIdx: 0 | 1 | 2) {
  const from = SEASON_NAMES[fromIdx];
  const to = SEASON_NAMES[fromIdx + 1];
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    paint(ctx, lerpP(SP[from], SP[to], smoother(clamp01(pp))), 0);
  };
}

const springToSummer = makeTransition(0);
const summerToAutumn = makeTransition(1);
const autumnToWinter = makeTransition(2);

// ── Exports ──────────────────────────────────────────────────────────────────

export const VARIANTS: SeasonalTileEntry = {
  Spring: { draw: makeDraw("Spring"), anim: animSpring },
  Summer: { draw: makeDraw("Summer"), anim: animSummer },
  Autumn: { draw: makeDraw("Autumn"), anim: animAutumn },
  Winter: { draw: makeDraw("Winter"), anim: animWinter },
};

export const TRANSITIONS: SeasonalTransitionSet = {
  0: springToSummer,
  1: summerToAutumn,
  2: autumnToWinter,
};
