// BOLD seasonal art for the MUSHROOM vegetable tile (`tile_veg_mushroom`).
//
// The subject is ALWAYS the same tight cluster of three classic toadstool
// mushrooms — bright RED domed caps with cream spots on plump cream stems on a
// low grass pad. Identity is constant; the seasons swing HARD on colour + cap
// size/openness + a real seasonal PROP (blossom / fallen leaf / snow cap + base
// snow + frost), and the idle is LOUD rather than a subtle breath.
//
// Architecture mirrors `pepper.bold.ts`: a single parameterized
// `paint(ctx, p, pose)` where `interface P` holds tweenable season params
// (colours + prop amounts) and `pose` holds the idle gesture (bob / lean /
// squash). Because every season is the same paint with a tweened P, transitions
// are seamless:  transition(0) ≡ draw(from),  transition(1) ≡ draw(to).
// REST pose has all zeros, so draw(season) = paint(ctx, SP[season], REST) and
// the idle's pose is 0 (with zero velocity) at every action-window edge → the
// loop is seamless.
//
//   IDLE COMMON  (~6s, win 0.9s): a side-to-side WOBBLE — the cluster rocks
//       ~10–12 design-px at the cap with a squash at the base.
//   IDLE SPECIAL (~18s, win 1.1s): a bigger squash-stretch BOUNCE — an
//       anticipation crouch, a hop up ~12–14 design-px, then a squash landing
//       that settles. May briefly paint outside the −24..+24 box.
//
// Origin-centered in the ~−24..+24 design box (actions may paint outside it).
// Light comes from upper-left. Pure Canvas-2D vector drawing — never throws,
// clamps everything, save/restore, resets globalAlpha.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── small math helpers ───────────────────────────────────────────────────────

type RGB = [number, number, number];

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

function rgb(c: RGB, alpha = 1): string {
  const r = Math.round(c[0]);
  const g = Math.round(c[1]);
  const b = Math.round(c[2]);
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${clamp01(alpha)})`;
}

/** Mix toward a target colour by amount k (0..1). */
function mix(c: RGB, target: RGB, k: number): RGB {
  return lerpRGB(c, target, clamp01(k));
}

function shade(c: RGB, k: number): RGB {
  // k>0 lightens toward white, k<0 darkens toward black
  return k >= 0 ? mix(c, [255, 255, 255], k) : mix(c, [0, 0, 0], -k);
}

function safeNum(x: number): number {
  return Number.isFinite(x) ? x : 0;
}

// ── tweenable param set ──────────────────────────────────────────────────────

/** Every field tweens (number or RGB). NO booleans / season strings — paint is
 *  a pure function of these so transitions interpolate cleanly. */
interface P {
  // colours
  cap: RGB; // mushroom cap red
  spot: RGB; // cream cap spots
  stem: RGB; // cream stem
  grass: RGB; // pad grass top
  soil: RGB; // pad underside / soil
  outline: RGB; // soft dark outline tint
  light: RGB; // ambient light wash colour
  // scalars 0..1
  lightAmt: number; // strength of the ambient light wash
  capOpenAmount: number; // dome size/openness (button → flat-mature)
  gloss: number; // cap highlight strength
  droop: number; // slight downward droop of caps (winter)
  frostAmt: number; // frosty rim/dusting on caps
  snowCapAmt: number; // little snow cap on top of caps
  padSnowAmt: number; // snow blanket over the pad
  blossomAmt: number; // tiny blossom on the pad (spring)
  fallenLeafAmt: number; // fallen leaf on the pad (autumn)
}

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number; // vertical offset in design px (negative = up)
  lean: number; // top-of-cluster sway, radians (rock side to side)
  squashX: number; // additive horizontal scale (+0.18 = 18% wider)
  squashY: number; // additive vertical scale (+0.18 = 18% taller)
}

const REST: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0 };

// ── Per-season params — pushed HARD ──────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — small button caps, fresh bright red, dewy lime pad + a blossom.
  Spring: {
    cap: [228, 70, 60], // fresh bright red
    spot: [255, 250, 240],
    stem: [246, 238, 220],
    grass: [150, 218, 96], // bright lime dewy
    soil: [104, 76, 46],
    outline: [74, 48, 40],
    light: [222, 246, 224], // cool-bright
    lightAmt: 0.28,
    capOpenAmount: 0.14, // small button caps
    gloss: 0.34,
    droop: 0.0,
    frostAmt: 0.0,
    snowCapAmt: 0.0,
    padSnowAmt: 0.0,
    blossomAmt: 1.0,
    fallenLeafAmt: 0.0,
  },
  // Summer — open rounded vivid RED caps, bright white spots, peak gloss.
  Summer: {
    cap: [232, 38, 34], // vivid saturated red (peak)
    spot: [255, 252, 244],
    stem: [242, 232, 208],
    grass: [86, 178, 66], // saturated mid-green
    soil: [96, 70, 42],
    outline: [70, 30, 28],
    light: [255, 246, 206], // warm
    lightAmt: 0.22,
    capOpenAmount: 0.62, // full open rounded domes
    gloss: 1.0,
    droop: 0.0,
    frostAmt: 0.0,
    snowCapAmt: 0.0,
    padSnowAmt: 0.0,
    blossomAmt: 0.0,
    fallenLeafAmt: 0.0,
  },
  // Autumn — large mature caps, deep darker red, amber pad + a fallen leaf.
  Autumn: {
    cap: [180, 38, 34], // deep mature red
    spot: [236, 218, 184], // ageing cream
    stem: [226, 208, 174],
    grass: [156, 146, 78], // olive-tan
    soil: [100, 66, 34],
    outline: [62, 34, 24],
    light: [252, 206, 142], // low amber
    lightAmt: 0.3,
    capOpenAmount: 1.0, // peak size, edges flattening
    gloss: 0.34,
    droop: 0.07,
    frostAmt: 0.0,
    snowCapAmt: 0.0,
    padSnowAmt: 0.0,
    blossomAmt: 0.0,
    fallenLeafAmt: 1.0,
  },
  // Winter — frost-rimmed caps still clearly RED, a snow cap on top + snow at
  // base; cool blue-grey light.
  Winter: {
    cap: [188, 70, 64], // muted but clearly red
    spot: [240, 240, 246],
    stem: [222, 220, 224],
    grass: [150, 176, 188], // cool grey-green under snow
    soil: [104, 100, 110],
    outline: [56, 50, 64],
    light: [202, 224, 252], // cool blue-grey
    lightAmt: 0.36,
    capOpenAmount: 0.78, // mature, drooping a touch
    gloss: 0.24,
    droop: 0.22,
    frostAmt: 0.85,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0.0,
    fallenLeafAmt: 0.0,
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    cap: lerpRGB(a.cap, b.cap, t),
    spot: lerpRGB(a.spot, b.spot, t),
    stem: lerpRGB(a.stem, b.stem, t),
    grass: lerpRGB(a.grass, b.grass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    capOpenAmount: lerp(a.capOpenAmount, b.capOpenAmount, t),
    gloss: lerp(a.gloss, b.gloss, t),
    droop: lerp(a.droop, b.droop, t),
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
    capOpenAmount: clamp01(p.capOpenAmount),
    gloss: clamp01(p.gloss),
    droop: clamp01(p.droop),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── pad (low flat grass ellipse with tufted edge + contact shadow) ───────────

const PAD_CY = 19;
const CLUSTER_PIVOT_Y = 18; // rock/squash about a point near the cluster base

/** The grass pad + seasonal pad dressing. Does NOT move with the idle pose. */
function paintPad(ctx: CanvasRenderingContext2D, p: P): void {
  const cy = PAD_CY;
  // soft contact shadow, offset lower-right
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(3, cy + 2.5, 17, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // shaded underside (soil)
  ctx.fillStyle = rgb(p.soil);
  ctx.beginPath();
  ctx.ellipse(0, cy + 1.4, 18, 5.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // grass top
  ctx.fillStyle = rgb(p.grass);
  ctx.beginPath();
  ctx.ellipse(0, cy - 0.2, 18, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // lighter front lip catches the light
  ctx.fillStyle = rgb(shade(p.grass, 0.22));
  ctx.beginPath();
  ctx.ellipse(-2, cy - 1.4, 13, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // tufted grass blades along the rim
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  for (let i = 0; i < 11; i++) {
    const a = -0.18 + (i / 10) * (Math.PI + 0.36);
    const ex = Math.cos(a) * 17.5;
    const ey = cy - 0.2 + Math.sin(a) * 4.8;
    const lean = ex < 0 ? -1 : 1;
    ctx.strokeStyle = rgb(shade(p.grass, i % 2 ? 0.18 : -0.14));
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + lean * 1.2, ey - 2.6);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // ── pad dressing ──
  // spring blossom: a couple of tiny five-petal flowers
  if (p.blossomAmt > 0.01) {
    const a = clamp01(p.blossomAmt);
    const flowers: Array<[number, number, number]> = [
      [-11, 18, 1.0],
      [12, 20, 0.85],
    ];
    flowers.forEach(([fx, fy, s]) => {
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(fx + Math.cos(ang) * 1.6 * s, fy + Math.sin(ang) * 1.6 * s, 1.0 * s, 1.0 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(255,214,84,0.95)";
      ctx.beginPath();
      ctx.arc(fx, fy, 0.9 * s, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  // autumn fallen leaves
  if (p.fallenLeafAmt > 0.01) {
    const a = clamp01(p.fallenLeafAmt);
    const leaves: Array<[number, number, number, RGB]> = [
      [-12, 20, 0.5, [202, 124, 40]],
      [11, 21, -0.7, [172, 70, 32]],
    ];
    leaves.forEach(([lx, ly, rot, col]) => {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.fillStyle = rgb(col);
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.4, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgb(shade(col, -0.3));
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-3.2, 0);
      ctx.lineTo(3.2, 0);
      ctx.stroke();
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  // winter snow blanket over the pad
  if (p.padSnowAmt > 0.01) {
    const a = clamp01(p.padSnowAmt);
    ctx.globalAlpha = a;
    const snow = ctx.createLinearGradient(0, cy - 4, 0, cy + 4);
    snow.addColorStop(0, "rgba(244,248,255,1)");
    snow.addColorStop(1, "rgba(206,222,240,1)");
    ctx.fillStyle = snow;
    ctx.beginPath();
    ctx.ellipse(0, cy - 0.6, 16.5 * (0.6 + 0.4 * a), 4.4 * (0.6 + 0.4 * a), 0, 0, Math.PI * 2);
    ctx.fill();
    // little snow lumps to read clearly as a snowy winter
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ([[-9, 18.6], [6, 19.6], [11, 18.2], [-3, 20.2]] as Array<[number, number]>).forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.9, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
}

// ── one mushroom (cap + stem) driven entirely by P ───────────────────────────

/** Draw a single mushroom whose base sits at (bx, by). `scale` sizes it; the
 *  shared silhouette is constant — only colours/openness/frost/snow vary. */
function paintMushroom(
  ctx: CanvasRenderingContext2D,
  p: P,
  bx: number,
  by: number,
  scale: number,
  sparkle: number,
): void {
  // dome geometry: openness widens the cap and flattens the dome slightly.
  const open = clamp01(p.capOpenAmount);
  const capW = (6.0 + open * 4.0) * scale; // half-width
  const capH = (5.6 - open * 1.4) * scale; // dome height (flatter when open)
  const droop = clamp01(p.droop) * 2.4 * scale; // caps sag a touch in winter
  const stemH = (9.0 - open * 1.0) * scale;
  const stemW = (2.6 + open * 0.4) * scale;
  const capCy = by - stemH; // cap centre y

  // ── stem ──
  const stemGrad = ctx.createLinearGradient(bx - stemW, 0, bx + stemW, 0);
  stemGrad.addColorStop(0, rgb(shade(p.stem, -0.22)));
  stemGrad.addColorStop(0.45, rgb(p.stem));
  stemGrad.addColorStop(1, rgb(shade(p.stem, 0.12)));
  ctx.fillStyle = stemGrad;
  ctx.beginPath();
  ctx.moveTo(bx - stemW, by);
  ctx.quadraticCurveTo(bx - stemW * 0.7, by - stemH * 0.5, bx - stemW * 0.85, capCy + capH * 0.3);
  ctx.lineTo(bx + stemW * 0.85, capCy + capH * 0.3);
  ctx.quadraticCurveTo(bx + stemW * 0.7, by - stemH * 0.5, bx + stemW, by);
  ctx.closePath();
  ctx.fill();
  // stem outline
  ctx.strokeStyle = rgb(p.outline, 0.9);
  ctx.lineWidth = 1;
  ctx.stroke();

  // ── cap ── dark base then lit dome
  ctx.save();
  ctx.translate(bx, capCy);
  // dark underside / outline pass
  ctx.fillStyle = rgb(shade(p.cap, -0.42));
  ctx.beginPath();
  ctx.ellipse(0, droop + capH * 0.35, capW + 0.8, capH + 0.8, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  // domed top
  const capGrad = ctx.createLinearGradient(-capW, -capH, capW, capH);
  capGrad.addColorStop(0, rgb(shade(p.cap, 0.28)));
  capGrad.addColorStop(0.55, rgb(p.cap));
  capGrad.addColorStop(1, rgb(shade(p.cap, -0.3)));
  ctx.fillStyle = capGrad;
  ctx.beginPath();
  ctx.ellipse(0, droop, capW, capH, 0, Math.PI, Math.PI * 2);
  // flat-ish bottom edge of the dome
  ctx.ellipse(0, droop, capW, capH * 0.4, 0, 0, Math.PI);
  ctx.fill();
  // cap outline
  ctx.strokeStyle = rgb(p.outline);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.ellipse(0, droop, capW, capH, 0, Math.PI, Math.PI * 2);
  ctx.stroke();

  // gloss highlight (upper-left)
  if (p.gloss > 0.01) {
    ctx.globalAlpha = clamp01(p.gloss);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.ellipse(-capW * 0.38, droop - capH * 0.42, capW * 0.34, capH * 0.3, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // cream spots on the cap
  const spots: Array<[number, number, number]> = [
    [-capW * 0.45, droop - capH * 0.3, 0.9],
    [capW * 0.1, droop - capH * 0.55, 1.0],
    [capW * 0.5, droop - capH * 0.2, 0.85],
    [-capW * 0.1, droop - capH * 0.08, 0.8],
    [capW * 0.32, droop - capH * 0.66, 0.6],
  ];
  spots.forEach(([sx, sy, sr], i) => {
    const r = sr * 1.5 * scale;
    ctx.fillStyle = rgb(p.spot);
    ctx.beginPath();
    ctx.ellipse(sx, sy, r, r * 0.86, 0, 0, Math.PI * 2);
    ctx.fill();
    // spring dew shimmer / sparkle glint on the spots
    if (sparkle > 0.01 && i % 2 === 0) {
      ctx.globalAlpha = clamp01(sparkle);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(sx - r * 0.3, sy - r * 0.3, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  });

  // ── winter dressing on the cap ──
  if (p.frostAmt > 0.01) {
    const f = clamp01(p.frostAmt);
    // frost rim along the lower edge of the dome
    ctx.globalAlpha = 0.5 * f;
    ctx.strokeStyle = "rgba(226,240,255,1)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, droop + capH * 0.15, capW * 0.96, capH * 0.92, 0, Math.PI * 0.05, Math.PI * 0.95);
    ctx.stroke();
    // frost sparkle dusting
    ctx.fillStyle = "rgba(240,248,255,1)";
    const frost: Array<[number, number]> = [
      [-capW * 0.6, droop - capH * 0.1],
      [capW * 0.55, droop - capH * 0.35],
      [-capW * 0.2, droop - capH * 0.5],
    ];
    frost.forEach(([fx, fy]) => {
      ctx.globalAlpha = f * (0.4 + 0.5 * clamp01(sparkle) + 0.3);
      ctx.beginPath();
      ctx.arc(fx, fy, 0.7 * scale, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  if (p.snowCapAmt > 0.01) {
    const s = clamp01(p.snowCapAmt);
    ctx.globalAlpha = s;
    ctx.fillStyle = "rgba(248,251,255,1)";
    ctx.beginPath();
    ctx.ellipse(-capW * 0.12, droop - capH * 0.62, capW * 0.62 * s + capW * 0.18, capH * 0.5 * s + 0.6, -0.18, Math.PI, Math.PI * 2);
    ctx.fill();
    // little lumps along the snow front edge
    ctx.beginPath();
    ctx.ellipse(-capW * 0.4, droop - capH * 0.42, 1.4 * scale, 1.0 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(capW * 0.2, droop - capH * 0.5, 1.6 * scale, 1.1 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ── the single parameterized paint ───────────────────────────────────────────

/** The whole tile from ONLY `p` (season identity) and `pose` (idle gesture).
 *  `sparkle` drives the per-season micro-shimmer on the front cap. */
function paint(ctx: CanvasRenderingContext2D, raw: P, rawPose: Pose, sparkle = 0): void {
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

    // ── pad (does NOT move with the idle pose) ──
    paintPad(ctx, p);

    // ── the cluster, under the idle pose transform ──
    // Pivot near the cluster base so lean rocks the caps side-to-side and
    // squash anchors at the base (it "sits" on the pad). bob lifts the cluster.
    ctx.save();
    ctx.translate(0, CLUSTER_PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(0, -CLUSTER_PIVOT_Y);

    // the cluster: one tall front mushroom + two smaller behind.
    const baseY = 18;
    paintMushroom(ctx, p, -8.5, baseY - 1.5, 0.62, 0); // back-left small
    paintMushroom(ctx, p, 9.5, baseY - 0.5, 0.7, 0); // back-right small
    paintMushroom(ctx, p, 0.5, baseY + 0.5, 1.0, sparkle); // front tall (on top)

    ctx.restore(); // end pose transform

    // ambient seasonal light wash over everything (subtle, never a flash)
    if (p.lightAmt > 0.001) {
      ctx.globalAlpha = 1;
      const g = ctx.createRadialGradient(-8, -8, 2, 0, 0, 34);
      g.addColorStop(0, rgb(p.light, 0.16 * p.lightAmt));
      g.addColorStop(1, rgb(p.light, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-24, -24, 48, 48);
    }
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── season stills ────────────────────────────────────────────────────────────

const drawFor = (season: SeasonName) => (ctx: CanvasRenderingContext2D): void =>
  paint(ctx, SP[season], REST);

// ── Idle pose clock — two-tier occasional action ─────────────────────────────

/** Returns 0..1 progress through an action window of length `win` starting at
 *  phase offset within `period`, else −1 (at rest). Seamless because the pose
 *  built from q is zero (with zero velocity) at q=0 and q=1. */
function actionQ(t: number, period: number, win: number, phase: number): number {
  const c = (((t + phase) % period) + period) % period;
  return c < win ? c / win : -1;
}

// A bump shape that is 0 with zero velocity at q=0 and q=1 (single hump).
function hump(q: number): number {
  const s = Math.sin(Math.PI * q);
  return s * s;
}

// An asymmetric anticipation curve, 0 (with zero velocity) at q=0 and q=1.
function anticipate(q: number): number {
  const env = 0.5 * (1 - Math.cos(2 * Math.PI * q)); // 0..1..0, velocity 0 at edges
  const tilt = Math.sin(Math.PI * q) * Math.sin(1.5 * Math.PI * q);
  return env * (0.55 * Math.sin(2 * Math.PI * q) + 0.9 * tilt);
}

/** Build the idle pose from the wall clock. Two tiers:
 *   common WOBBLE every ~6s (win 0.9s), rare BOUNCE every ~18s (win 1.1s). */
function poseFromClock(t: number): Pose {
  const pose: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0 };

  // ── COMMON: side-to-side wobble (~6s, win 0.9s) ──
  // ~0.17 rad lean about a pivot ~25px below the caps → ~10–12 px sway at top.
  const qC = actionQ(t, 6.0, 0.9, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC); // 0..1..0, zero at edges
    const rock = Math.sin(qC * Math.PI * 3); // 1.5 rocks within the window
    pose.lean += 0.17 * env * rock;
    pose.squashY += -0.06 * hump(qC); // little squat as it rocks
    pose.squashX += 0.05 * hump(qC);
    pose.lean += 0.02 * anticipate(qC); // faint windup tilt (still 0 at edges)
  }

  // ── RARE SPECIAL: squash-stretch BOUNCE hop (~18s, win 1.1s) ──
  // Anticipation crouch → stretch up ~12–14px → squash landing → settle.
  const qS = actionQ(t, 18.0, 1.1, 3.0); // phase 3s so it doesn't collide w/ wobble
  if (qS >= 0) {
    const crouch = qS < 0.18 ? Math.sin((qS / 0.18) * Math.PI) : 0; // 0..1..0
    const airWin = qS >= 0.18 && qS < 0.82 ? (qS - 0.18) / 0.64 : -1;
    const air = airWin >= 0 ? Math.sin(airWin * Math.PI) : 0; // arc up & down
    const landWin = qS >= 0.74 ? Math.min(1, (qS - 0.74) / 0.26) : -1;
    const land = landWin >= 0 ? Math.sin(landWin * Math.PI) : 0; // squash bump

    // bob: crouch dips down a touch, then a big rise (negative = up) ~13px.
    pose.bob += crouch * 1.6 - air * 13.0;
    // squash-stretch: tall+thin at apex, short+wide on crouch & landing.
    pose.squashY += air * 0.2 - crouch * 0.12 - land * 0.16;
    pose.squashX += -air * 0.14 + crouch * 0.1 + land * 0.14;
    // a tiny lean wiggle on the way down for life
    pose.lean += 0.05 * Math.sin(qS * Math.PI * 4) * (1 - Math.abs(2 * qS - 1));
  }

  return pose;
}

// ── idle anim: two-tier action pose + per-season micro-shimmer/overlays ──────

const animFor = (season: SeasonName) => (ctx: CanvasRenderingContext2D, t: number): void => {
  const tt = Number.isFinite(t) ? t : 0;
  const p = SP[season];

  // per-season front-cap shimmer (dressing only — never changes identity)
  let sparkle = 0;
  if (season === "Spring") sparkle = 0.4 + 0.4 * (0.5 - 0.5 * Math.cos(tt * 2.2)); // dew shimmer
  if (season === "Summer") sparkle = 0.5 * (0.5 - 0.5 * Math.cos(tt * 1.8)); // soft sheen
  if (season === "Winter") sparkle = 0.45 * (0.5 - 0.5 * Math.cos(tt * 1.4)); // cold sheen

  paint(ctx, p, poseFromClock(tt), sparkle);

  // ── per-season additive overlays (dressing only) ──
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    if (season === "Autumn") {
      // one slow tumbling leaf drifting down
      const prog = ((tt / 5.0) % 1 + 1) % 1;
      const px = 11 - prog * 6 + Math.sin(prog * Math.PI * 3) * 2;
      const py = -16 + prog * 32;
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(prog * Math.PI);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(prog * Math.PI * 4);
      ctx.fillStyle = "rgba(200,108,36,1)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.4, 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    } else if (season === "Winter") {
      // a couple of drifting snowflakes on seamless vertical loops
      const seeds: Array<[number, number, number]> = [
        [-7, 1.0, 0.0],
        [8, 0.8, 0.5],
        [2, 0.7, 0.25],
      ];
      ctx.fillStyle = "#ffffff";
      seeds.forEach(([fx, r, phase]) => {
        const prog = ((tt / 3.4 + phase) % 1 + 1) % 1;
        const fy = -18 + prog * 32;
        const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
        ctx.globalAlpha = 0.85 * Math.sin(prog * Math.PI); // fade in/out at ends
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
    }
    // Summer: no extra dressing — the bounce + glossy red caps are the show.
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

// ── forward season→season transitions (seamless endpoints) ───────────────────

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

// ── exports ──────────────────────────────────────────────────────────────────

export const VARIANTS: SeasonalTileEntry = {
  Spring: { draw: drawFor("Spring"), anim: animFor("Spring") },
  Summer: { draw: drawFor("Summer"), anim: animFor("Summer") },
  Autumn: { draw: drawFor("Autumn"), anim: animFor("Autumn") },
  Winter: { draw: drawFor("Winter"), anim: animFor("Winter") },
};

export const TRANSITIONS: SeasonalTransitionSet = {
  0: springToSummer,
  1: summerToAutumn,
  2: autumnToWinter,
};
