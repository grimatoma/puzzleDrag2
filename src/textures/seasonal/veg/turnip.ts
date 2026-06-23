// BOLD seasonal art for the TURNIP vegetable tile (`tile_veg_turnip`).
// File: src/textures/seasonal/veg/turnip.ts
//
// Category: VEG. The iconic harvested ROOT VEG — a single round turnip bulb
// resting low-centre on a grassy pad. Per the root-veg rule the turnip KEEPS
// its leafy top for read: a small tuft of green leaves sprouts up top and a thin
// taproot tails down into the pad.
//
// PALETTE LOCK (identity, SAME every season): WHITE lower two-thirds + a
// MAGENTA/purple upper shoulder + a small green leafy top. Ripeness/age shows
// ONLY in colour and the bulb's size, never an identity change. The seasons swing
// HARD on colour + a real seasonal prop, and the idle is LOUD rather than subtle.
//
// Architecture mirrors `pepper.bold.ts`: a single parameterized
// `paint(ctx, p, pose)` where `interface P` holds tweenable season params
// (colours + prop amounts) and `pose` holds the idle gesture (bob / lean /
// squash). Because every season is the same paint with tweened P, transitions
// are seamless:
//   transition(0) ≡ draw(from), transition(1) ≡ draw(to).
// REST pose has all zeros, so draw(season) = paint(ctx, SP[season], REST) and the
// idle's pose is 0 with zero velocity at every action-window edge → seamless loop.
//
//   IDLE COMMON  (~6s, win ~0.9s): a side-to-side WOBBLE — the bulb rocks/leans
//       with a squash at the base. Anticipation → peak → settle, zero velocity
//       at the window edges (seamless).
//   IDLE SPECIAL (~18s, win ~1.1s): a bigger SHAKE/BOUNCE — a squash-stretch hop
//       up, with anticipation crouch, stretch on the way up, and a squash landing
//       that overshoots then settles. May exit the −24..+24 box at the apex.
//
// Origin-centered in the −24..+24 design box (actions may paint outside it),
// light from upper-left, flat cel-shaded with a soft dark outline. Pure
// Canvas-2D vector drawing — never throws, clamps everything, save/restore.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable season params ──────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly. */
interface P {
  bulbLight: RGB;        // lit face of the WHITE lower bulb
  bulbMid: RGB;          // body tone of the white bulb
  bulbDark: RGB;         // shadowed underside of the white bulb
  shoulderLight: RGB;    // lit magenta/purple shoulder
  shoulderMid: RGB;      // magenta shoulder body
  shoulderDark: RGB;     // shadowed magenta shoulder
  leafLight: RGB;        // lit green leaf
  leafMid: RGB;          // leaf body
  leafDark: RGB;         // shaded leaf / stems
  root: RGB;             // the thin taproot at the bottom
  padGrass: RGB;         // top of the grass pad
  padDark: RGB;          // shaded pad underside
  soil: RGB;             // contact / base soil under the turnip
  outline: RGB;          // soft dark outline tint
  light: RGB;            // ambient light tint laid over the whole tile
  lightAmt: number;      // 0..1 strength of the ambient light wash
  ripeness: number;      // 0..1 → bulb size (small spring → fat autumn)
  gloss: number;         // 0..1 specular sheen on the bulb (summer peak)
  frostAmt: number;      // 0..1 cool frost dusting on the bulb (winter)
  snowCapAmt: number;    // 0..1 snow cap on the shoulder (winter)
  padSnowAmt: number;    // 0..1 snow blanket at the base / on the pad (winter)
  blossomAmt: number;    // 0..1 blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad (autumn)
}

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number;     // vertical offset in design px (negative = up)
  lean: number;    // top-of-turnip sway, radians (rock side to side)
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
    bulbLight: lerpRGB(a.bulbLight, b.bulbLight, t),
    bulbMid: lerpRGB(a.bulbMid, b.bulbMid, t),
    bulbDark: lerpRGB(a.bulbDark, b.bulbDark, t),
    shoulderLight: lerpRGB(a.shoulderLight, b.shoulderLight, t),
    shoulderMid: lerpRGB(a.shoulderMid, b.shoulderMid, t),
    shoulderDark: lerpRGB(a.shoulderDark, b.shoulderDark, t),
    leafLight: lerpRGB(a.leafLight, b.leafLight, t),
    leafMid: lerpRGB(a.leafMid, b.leafMid, t),
    leafDark: lerpRGB(a.leafDark, b.leafDark, t),
    root: lerpRGB(a.root, b.root, t),
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

function safeNum(x: number): number {
  return Number.isFinite(x) ? x : 0;
}

// ── Per-season params — pushed HARD ──────────────────────────────────────────
// PALETTE LOCK held across all four: white bulb + magenta shoulder + green top.
// Seasons swing the lit/shade tones, the pad, the light, ripeness, and the prop.

const SP: Record<SeasonName, P> = {
  // Spring — small pale young turnip; bright young lime leaves; dewy lime pad +
  // a prominent blossom. Cool-bright light. (Small bulb via low ripeness.)
  Spring: {
    bulbLight: [248, 250, 248],
    bulbMid: [226, 230, 230],
    bulbDark: [186, 196, 200],
    shoulderLight: [220, 122, 200],
    shoulderMid: [188, 80, 168],
    shoulderDark: [138, 52, 122],
    leafLight: [172, 228, 112],
    leafMid: [112, 192, 76],
    leafDark: [66, 138, 52],
    root: [228, 226, 214],
    padGrass: [128, 210, 86],
    padDark: [70, 140, 58],
    soil: [120, 84, 48],
    outline: [56, 46, 58],
    light: [230, 246, 224],
    lightAmt: 0.18,
    ripeness: 0.18,
    gloss: 0.24,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 1.0,
    fallenLeafAmt: 0,
  },
  // Summer — PEAK: plump ripe turnip, crisp white bulb, VIVID magenta shoulder,
  // lush deep-green leaves; warm light, max gloss; mid-green pad.
  Summer: {
    bulbLight: [255, 255, 255],
    bulbMid: [240, 242, 240],
    bulbDark: [198, 206, 208],
    shoulderLight: [240, 92, 214],
    shoulderMid: [210, 48, 184],
    shoulderDark: [150, 26, 130],
    leafLight: [130, 208, 84],
    leafMid: [78, 168, 58],
    leafDark: [42, 116, 42],
    root: [238, 236, 224],
    padGrass: [86, 170, 70],
    padDark: [42, 110, 48],
    soil: [126, 86, 48],
    outline: [52, 38, 54],
    light: [255, 242, 204],
    lightAmt: 0.2,
    ripeness: 0.8,
    gloss: 1.0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — fat mature turnip (largest bulb); leaves yellowing; olive-tan
  // browning pad + a fallen leaf; low amber light, dulled gloss.
  Autumn: {
    bulbLight: [246, 244, 232],
    bulbMid: [222, 218, 202],
    bulbDark: [178, 172, 154],
    shoulderLight: [212, 96, 168],
    shoulderMid: [176, 60, 142],
    shoulderDark: [126, 44, 106],
    leafLight: [200, 198, 86],
    leafMid: [152, 154, 62],
    leafDark: [104, 102, 46],
    root: [214, 204, 178],
    padGrass: [150, 152, 86],
    padDark: [104, 96, 52],
    soil: [120, 80, 44],
    outline: [62, 46, 44],
    light: [250, 208, 146],
    lightAmt: 0.24,
    ripeness: 1.0,
    gloss: 0.34,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1.0,
  },
  // Winter — cool blue-grey light; frost-dusted turnip + a bold snow cap + snow
  // at the base; the white-and-magenta identity stays CLEARLY visible. No
  // white-out — magenta-and-white still reads.
  Winter: {
    bulbLight: [236, 244, 252],
    bulbMid: [206, 218, 230],
    bulbDark: [158, 176, 196],
    shoulderLight: [198, 118, 190],
    shoulderMid: [160, 80, 154],
    shoulderDark: [110, 56, 110],
    leafLight: [150, 186, 156],
    leafMid: [104, 148, 116],
    leafDark: [64, 104, 82],
    root: [206, 212, 218],
    padGrass: [176, 196, 214],
    padDark: [118, 144, 170],
    soil: [128, 110, 96],
    outline: [50, 46, 62],
    light: [204, 226, 252],
    lightAmt: 0.34,
    ripeness: 0.82,
    gloss: 0.26,
    frostAmt: 0.78,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Turnip geometry — the SAME silhouette every season ────────────────────────
// The bulb is a round body resting low on the pad; the magenta shoulder is the
// upper band, the white lower two-thirds below it, a thin taproot tails out the
// bottom, and a small leafy tuft sprouts up top. Origin-centered.

const BULB_CY = 7;          // bulb centre y (sits low-centre on the pad)
const BULB_RX = 13;         // base half-width at full ripeness
const BULB_RY = 12;         // base half-height at full ripeness
const SHOULDER_FRAC = 0.34; // top fraction of the bulb that is magenta
const PIVOT_Y = BULB_CY + BULB_RY - 1; // rock/lean about a point near the base

/** Bulb radius for a given ripeness (small spring → fat autumn). */
function bulbRadii(ripeness: number): { rx: number; ry: number } {
  const k = 0.74 + 0.26 * clamp01(ripeness); // 0.74..1.0
  return { rx: BULB_RX * k, ry: BULB_RY * k };
}

/** Trace the round turnip bulb body path (slightly tapered to the root). */
function bulbPath(ctx: CanvasRenderingContext2D, cy: number, rx: number, ry: number): void {
  const top = cy - ry;
  const bot = cy + ry;
  ctx.beginPath();
  ctx.moveTo(0, top);
  // left shoulder bulging out
  ctx.bezierCurveTo(-rx * 1.02, top + ry * 0.15, -rx * 1.1, cy + ry * 0.1, -rx * 0.7, bot - ry * 0.12);
  // taper down to a small flat base where the root exits
  ctx.quadraticCurveTo(-rx * 0.42, bot + ry * 0.12, 0, bot);
  ctx.quadraticCurveTo(rx * 0.42, bot + ry * 0.12, rx * 0.7, bot - ry * 0.12);
  // right shoulder back up
  ctx.bezierCurveTo(rx * 1.1, cy + ry * 0.1, rx * 1.02, top + ry * 0.15, 0, top);
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

  const { rx, ry } = bulbRadii(p.ripeness);

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

    // pad snow blanket (winter) — snow at the base
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

    // ── Contact shadow under the turnip (follows the bob/lean for grounding) ──
    const tipShift = pose.lean * (PIVOT_Y - (BULB_CY - ry)); // how far the tip leans
    const shadowSpread = 1 + clamp01(pose.bob < 0 ? -pose.bob / 14 : 0) * 0.5;
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0 + tipShift * 0.18, BULB_CY + ry + 1.5, 8 * shadowSpread, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.28 / shadowSpread);
    ctx.beginPath();
    ctx.ellipse(2.5 + tipShift * 0.2, BULB_CY + ry + 2, 11 * shadowSpread, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the turnip, under the idle pose transform ───────────────────
    ctx.save();
    // Pivot near the base so lean rocks the TOP side-to-side and squash anchors
    // at the base (it "sits" on the pad). bob raises the whole body.
    ctx.translate(0, PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(0, -PIVOT_Y);

    // local geometry, in the (unposed) bulb frame
    const cy = BULB_CY;
    const top = cy - ry;
    const bot = cy + ry;
    const splitY = top + ry * 2 * SHOULDER_FRAC;

    // ── Taproot: a thin tail dropping from the base into the pad ─────────────
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, bot - 1);
    ctx.quadraticCurveTo(0.6, bot + 3.5, -0.4, bot + 7);
    ctx.stroke();
    ctx.strokeStyle = rgb(p.root);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, bot - 1);
    ctx.quadraticCurveTo(0.6, bot + 3.5, -0.4, bot + 7);
    ctx.stroke();

    // 1) soft dark outline pass (drawn slightly fatter under the body fill)
    ctx.save();
    bulbPath(ctx, cy, rx + 1.1, ry + 1.1);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();
    ctx.restore();

    // 2) body fill, clipped to the bulb so the outline reads as a rim
    ctx.save();
    bulbPath(ctx, cy, rx, ry);
    ctx.clip();

    // WHITE lower two-thirds — base mid tone then a lit upper-left face
    ctx.fillStyle = rgb(p.bulbMid);
    ctx.fillRect(-rx - 3, top - 3, (rx + 3) * 2, ry * 2 + 6);
    const bulbGrad = ctx.createLinearGradient(-rx, top, rx, bot);
    bulbGrad.addColorStop(0, rgb(p.bulbLight));
    bulbGrad.addColorStop(0.5, rgb(p.bulbMid));
    bulbGrad.addColorStop(1, rgb(p.bulbDark));
    ctx.fillStyle = bulbGrad;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.ellipse(-1.5, cy + ry * 0.18, rx + 2, ry * 0.96, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // MAGENTA shoulder band over the top third
    const shGrad = ctx.createLinearGradient(0, top, 0, splitY + 2);
    shGrad.addColorStop(0, rgb(p.shoulderLight));
    shGrad.addColorStop(0.55, rgb(p.shoulderMid));
    shGrad.addColorStop(1, rgb(p.shoulderDark));
    ctx.fillStyle = shGrad;
    ctx.beginPath();
    // band hugging the top of the bulb, dipping down at the centre
    ctx.moveTo(-rx - 2, splitY);
    ctx.quadraticCurveTo(0, splitY + ry * 0.34, rx + 2, splitY);
    ctx.lineTo(rx + 2, top - 4);
    ctx.lineTo(-rx - 2, top - 4);
    ctx.closePath();
    ctx.fill();
    // soft blend line where magenta meets white
    ctx.strokeStyle = rgba(p.shoulderDark, 0.4);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-rx, splitY - 0.5);
    ctx.quadraticCurveTo(0, splitY + ry * 0.3, rx, splitY - 0.5);
    ctx.stroke();
    // lit magenta highlight on the upper-left shoulder
    ctx.fillStyle = rgba(p.shoulderLight, 0.5);
    ctx.beginPath();
    ctx.ellipse(-rx * 0.4, top + ry * 0.34, rx * 0.42, ry * 0.3, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // vertical shading on the white body's right side to round it
    ctx.fillStyle = rgba(p.bulbDark, 0.5);
    ctx.beginPath();
    ctx.ellipse(rx * 0.62, cy + ry * 0.28, rx * 0.42, ry * 0.7, 0.15, 0, Math.PI * 2);
    ctx.fill();
    // subtle root-streak grooves on the white lower body
    ctx.strokeStyle = rgba(p.bulbDark, 0.3);
    ctx.lineWidth = 0.8;
    [-rx * 0.4, 0, rx * 0.4].forEach((sx) => {
      ctx.beginPath();
      ctx.moveTo(sx, splitY + 1);
      ctx.quadraticCurveTo(sx * 0.4, lerp(splitY, bot, 0.6), sx * 0.1, bot - 2);
      ctx.stroke();
    });

    // bulb specular sheen (gloss strength from P)
    if (p.gloss > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.18 + 0.55 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(-rx * 0.42, cy - ry * 0.1, rx * 0.22, ry * 0.4, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // frost dusting (winter) — cool blue speckle on the upward bulb
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.28 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(-1, cy - ry * 0.25, rx * 0.92, ry * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-rx * 0.5, top + 4], [-rx * 0.1, top + 2.5], [rx * 0.4, top + 5],
        [-rx * 0.3, cy], [rx * 0.3, cy + 2], [0, cy - ry * 0.4],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end clip

    // 3) snow cap on the shoulder (winter) — drawn over, hugging the top rim
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(-rx * 0.62, top + 2);
      ctx.quadraticCurveTo(-rx * 0.3, top - 5, 0, top - 3.8);
      ctx.quadraticCurveTo(rx * 0.3, top - 5, rx * 0.62, top + 2);
      ctx.quadraticCurveTo(rx * 0.34, top + 4.5, 0, top + 3);
      ctx.quadraticCurveTo(-rx * 0.34, top + 4.5, -rx * 0.62, top + 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(0, top + 2.2, rx * 0.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Leafy top: a small tuft of green leaves (SAME placement every season) ─
    drawLeaves(ctx, p, top, 0);

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

/** The leafy tuft sprouting from the top of the bulb. `sway` is an idle lean
 *  (radians) applied to the whole tuft (0 at rest). Constant shape per season. */
function drawLeaves(ctx: CanvasRenderingContext2D, p: P, topY: number, sway: number): void {
  // Each leaf: [baseAngle (rad, 0=up, neg=left), length, width]
  const leaves: Array<[number, number, number]> = [
    [-0.62, 12, 3.0],
    [-0.26, 15, 3.4],
    [0.04, 16, 3.6],
    [0.34, 14, 3.2],
    [0.66, 11, 2.8],
  ];
  ctx.save();
  ctx.translate(0, topY - 1);
  leaves.forEach(([baseAng, len, w], i) => {
    // outer leaves sway slightly more than inner ones
    const lean = sway * (0.6 + 0.4 * Math.abs(baseAng) / 0.66);
    const ang = baseAng + lean;
    const tipX = Math.sin(ang) * len;
    const tipY = -Math.cos(ang) * len;
    const midX = Math.sin(ang) * len * 0.5 - Math.cos(ang) * 0.6;
    const midY = -Math.cos(ang) * len * 0.5;
    // outline
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = w + 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.stroke();
    // leaf body (alternate light/mid for a little variety)
    ctx.strokeStyle = i % 2 === 0 ? rgb(p.leafMid) : rgb(p.leafLight);
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.stroke();
    // central vein highlight
    ctx.strokeStyle = rgba(p.leafDark, 0.5);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, 0.5);
    ctx.quadraticCurveTo(midX * 0.92, midY * 0.92, tipX * 0.9, tipY * 0.9);
    ctx.stroke();
  });
  // small stem cluster base where leaves meet the bulb
  ctx.fillStyle = rgb(p.leafDark);
  ctx.beginPath();
  ctx.ellipse(0, 1.5, 3.2, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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
  // Two rocks left→right→left; the bulb leans about its base, with a small base
  // squat as it rocks weight side to side.
  const qC = actionQ(t, 6.0, 0.9, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC); // 0..1..0, zero at edges
    const rock = Math.sin(qC * Math.PI * 3); // 1.5 rocks within the window
    pose.lean += 0.16 * env * rock;
    // little squat at the base as it rocks (settle weight side to side)
    pose.squashY += -0.06 * hump(qC);
    pose.squashX += 0.05 * hump(qC);
    // a faint windup tilt (still 0 with zero velocity at the edges)
    pose.lean += 0.02 * anticipate(qC);
  }

  // ── RARE SPECIAL: squash-stretch BOUNCE hop (~18s, win 1.1s) ──
  // Anticipation crouch → stretch up → squash landing → settle.
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
      // Summer: no extra dressing — the bounce + glossy magenta is the show.
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
