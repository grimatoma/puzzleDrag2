// BOLD seasonal art for the JACKFRUIT fruit tile (`tile_fruit_jackfruit`).
//
// The iconic harvested ITEM only: one big heavy knobbly oval jackfruit resting
// low-centre on a grass pad, with a constant bumpy/spiky skin (staggered rows of
// small blunt points around a constant rippled outline) and a short thick stem
// on top. The knobbly SILHOUETTE is IDENTICAL every season — identity is locked.
// What swings HARD (the "bold" direction) is colour, the fruit's apparent SIZE,
// and a real seasonal PROP:
//
//   Spring — a SMALL green knobbly fruit (young/unripe) + a blossom on the pad.
//   Summer — a LARGE ripe GREEN-GOLD fruit at peak, warm light, max sheen.
//   Autumn — a yellow-brown ripe fruit (gold/rust) + a fallen leaf on the pad.
//   Winter — a bold white SNOW CAP + snow drift at the base + frost on the bumps;
//            the green-gold knobbly fruit still clearly reads under the snow.
//
// Architecture mirrors `pepper.bold.ts`: a single parameterized
// `paint(ctx, p, pose)` where `interface P` holds tweenable season params
// (colours + size + prop amounts) and `pose` holds the idle gesture
// (bob / lean / squash). Because every season is the same paint with tweened P,
// transitions are seamless:
//   transition(0) ≡ draw(from), transition(1) ≡ draw(to).
// REST pose is all zeros, so draw(season) = paint(ctx, SP[season], REST) and the
// idle pose is 0 (with zero velocity) at every action-window edge → seamless.
//
// Two-tier idle via `actionQ` — a HEAVY SLOW WOBBLE in character with the
// fruit's big knobbly mass (a low-frequency, high-inertia rock, never a hop):
//   COMMON  (~6s, win ~1.6s): one slow, weighty single rock — a deliberate lean
//       to one side and back over a pronounced base squat.
//   RARE    (~18s, win ~3.6s): a bigger, even slower HEAVE — the fruit leans far,
//       HOLDS over its mass, then settles back with an overshoot squash (mass
//       momentum). Pose-only, no hop.
//
// Origin-centered in the −24..+24 design box (idle actions may paint outside it),
// light from upper-left, flat cel-shaded with a soft dark outline. Pure
// Canvas-2D vector drawing — never throws, clamps everything, save/restore.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable season params ──────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — paint is a
 *  pure function of these so transitions interpolate cleanly. */
interface P {
  skinLight: RGB;        // lit face of the bumpy skin
  skinMid: RGB;          // body tone
  skinDark: RGB;         // shadowed underside / between-knob grooves
  knobTip: RGB;          // the small blunt point caps catching light
  stem: RGB;             // short thick stem
  padGrass: RGB;         // top of the grass pad
  padDark: RGB;          // shaded pad underside
  soil: RGB;             // contact / base soil under the fruit
  outline: RGB;          // soft dark outline tint
  light: RGB;            // ambient light tint laid over the whole tile
  lightAmt: number;      // 0..1 strength of the ambient light wash
  sizeScale: number;     // apparent fruit size (0.84 spring small .. 1.06 summer big)
  ripeness: number;      // 0..1 (colour cue only; never structural)
  gloss: number;         // 0..1 specular sheen across the knobs
  frostAmt: number;      // 0..1 cool frost dusting on the bumps (winter)
  snowCapAmt: number;    // 0..1 snow cap on the upward shoulders + stem (winter)
  padSnowAmt: number;    // 0..1 snow blanket / drift at the base (winter)
  blossomAmt: number;    // 0..1 blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad (autumn)
}

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number;     // vertical offset in design px (negative = up)
  lean: number;    // top-of-fruit sway, radians (rock side to side)
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
    skinLight: lerpRGB(a.skinLight, b.skinLight, t),
    skinMid: lerpRGB(a.skinMid, b.skinMid, t),
    skinDark: lerpRGB(a.skinDark, b.skinDark, t),
    knobTip: lerpRGB(a.knobTip, b.knobTip, t),
    stem: lerpRGB(a.stem, b.stem, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    sizeScale: lerp(a.sizeScale, b.sizeScale, t),
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
  // sizeScale clamped to a sane band so a bad value can never blow up the box.
  const s = Number.isFinite(p.sizeScale) ? Math.min(1.3, Math.max(0.6, p.sizeScale)) : 1;
  return {
    ...p,
    lightAmt: clamp01(p.lightAmt),
    sizeScale: s,
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

const SP: Record<SeasonName, P> = {
  // Spring — clearly SMALL green knobbly fruit (young/unripe), dewy lime pad,
  // prominent blossom. Cool-bright light.
  Spring: {
    skinLight: [156, 200, 96],
    skinMid: [104, 160, 60],
    skinDark: [56, 104, 42],
    knobTip: [190, 220, 122],
    stem: [108, 86, 44],
    padGrass: [128, 206, 86],
    padDark: [72, 138, 58],
    soil: [120, 84, 48],
    outline: [38, 62, 30],
    light: [230, 246, 222],
    lightAmt: 0.16,
    sizeScale: 0.84,
    ripeness: 0.12,
    gloss: 0.2,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 1.0,
    fallenLeafAmt: 0,
  },
  // Summer — LARGE ripe GREEN-GOLD fruit at PEAK (richest/most-saturated);
  // mid-green pad, warm bright light, strong sheen across the knobs.
  Summer: {
    skinLight: [214, 220, 104],
    skinMid: [160, 184, 60],
    skinDark: [100, 128, 42],
    knobTip: [234, 232, 134],
    stem: [120, 90, 44],
    padGrass: [86, 168, 70],
    padDark: [44, 110, 48],
    soil: [126, 86, 48],
    outline: [60, 76, 28],
    light: [255, 240, 200],
    lightAmt: 0.2,
    sizeScale: 1.06,
    ripeness: 0.7,
    gloss: 1.0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — yellow-brown ripe fruit (gold/rust), olive-tan pad, a fallen leaf;
  // low amber light. Slightly settled (a hair smaller than summer's peak).
  Autumn: {
    skinLight: [222, 188, 92],
    skinMid: [184, 140, 58],
    skinDark: [122, 86, 40],
    knobTip: [232, 200, 118],
    stem: [110, 78, 38],
    padGrass: [150, 152, 86],
    padDark: [104, 96, 52],
    soil: [120, 80, 44],
    outline: [76, 54, 26],
    light: [250, 206, 142],
    lightAmt: 0.24,
    sizeScale: 1.0,
    ripeness: 1.0,
    gloss: 0.46,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1.0,
  },
  // Winter — green-gold still readable under a BOLD snow cap + frost on the
  // bumps; snow drift at the base, cool blue-grey light. No white-out.
  Winter: {
    skinLight: [172, 182, 110],
    skinMid: [128, 142, 72],
    skinDark: [86, 100, 56],
    knobTip: [198, 202, 140],
    stem: [104, 88, 64],
    padGrass: [176, 196, 214],
    padDark: [120, 146, 172],
    soil: [128, 110, 96],
    outline: [50, 52, 48],
    light: [204, 226, 252],
    lightAmt: 0.34,
    sizeScale: 0.98,
    ripeness: 0.85,
    gloss: 0.3,
    frostAmt: 0.82,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Jackfruit geometry — the SAME knobbly silhouette every season ────────────

// A big heavy oval resting LOW on the pad (fills ~55% of the box height). Origin
// centered; the body is widest near its lower-middle. The fruit transform pivots
// near its base so it "sits" on the pad through lean/squash.
const JF_TOP = -10; // shoulder/top of the oval body (unscaled)
const JF_BOT = 17;  // base resting low on the pad (unscaled)
const JF_HALF = 13.5; // half-width of the oval at its widest (unscaled)
const JF_CY = 4.5;  // vertical centre of the oval body (unscaled)
const JF_PIVOT_Y = JF_BOT - 1; // rock/lean/scale about a point near the base

// Knob rows: rings of small blunt points across the surface. Each knob is a
// fraction along the body height (v: 0 top .. 1 bottom) and across (u: -1..1).
// The bumpy OUTLINE comes from the rim ripple; these are the SAME every season.
interface Knob { u: number; v: number; r: number; }
const KNOBS: Knob[] = (() => {
  const out: Knob[] = [];
  // five rows down the body, offset each row for a staggered honeycomb look
  const rows = [0.12, 0.3, 0.5, 0.7, 0.87];
  rows.forEach((v, ri) => {
    const widthAt = Math.sin(Math.PI * (0.18 + 0.64 * v)); // fat in the middle
    const count = 5 + (ri % 2);
    const off = (ri % 2) * 0.5;
    for (let i = 0; i < count; i++) {
      const u = ((i + off) / (count - 1) - 0.5) * 2 * widthAt;
      out.push({ u, v, r: 1.9 - 0.4 * Math.abs(u) * 0.6 + (v > 0.6 ? 0.3 : 0) });
    }
  });
  return out;
})();

/** Map a knob's (u,v) to design-space (x,y). */
function knobXY(k: Knob): [number, number] {
  const y = lerp(JF_TOP, JF_BOT, k.v);
  // narrow toward the top and bottom so knobs hug the oval body
  const taper = Math.sin(Math.PI * (0.12 + 0.76 * k.v));
  const x = k.u * JF_HALF * 0.78 * taper;
  return [x, y];
}

/** Trace the big heavy knobbly oval body path (a bumpy rim) into the ctx path. */
function jackfruitBodyPath(ctx: CanvasRenderingContext2D): void {
  const cy = JF_CY;
  const rx = JF_HALF;
  const ry = (JF_BOT - JF_TOP) / 2;
  const STEPS = 44;
  ctx.beginPath();
  for (let i = 0; i <= STEPS; i++) {
    const a = (i / STEPS) * Math.PI * 2 - Math.PI / 2;
    // small bumpy ripple on the rim → constant knobbly outline
    const ripple = 1 + 0.05 * Math.sin(a * 9) + 0.03 * Math.sin(a * 15 + 1.3);
    const x = Math.cos(a) * rx * ripple;
    const y = cy + Math.sin(a) * ry * ripple;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
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

    // pad snow blanket / drift at the base (winter)
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
          ctx.ellipse(bx + Math.cos(ang) * 1.5, by + Math.sin(ang) * 1.0, 1.1, 0.8, ang, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = rgba([255, 214, 90], a);
        ctx.beginPath();
        ctx.arc(bx, by, 0.9, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // fallen leaf on the pad (autumn)
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

    // ── Contact patch + cast shadow under the heavy fruit (follows lean) ─────
    const tipShift = pose.lean * (JF_PIVOT_Y - JF_TOP); // how far the top leans
    const shadowSpread = (1 + clamp01(pose.bob < 0 ? -pose.bob / 14 : 0) * 0.5) * p.sizeScale;
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0 + tipShift * 0.18, JF_BOT + 1.5, 11 * shadowSpread, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.3 / Math.max(0.5, shadowSpread));
    ctx.beginPath();
    ctx.ellipse(3 + tipShift * 0.2, JF_BOT + 2.2, 13 * shadowSpread, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the big knobbly jackfruit, under size + idle-pose transform ──
    ctx.save();
    // Pivot near the base so lean rocks the TOP side-to-side and squash/size
    // anchor at the base (it "sits" on the pad). bob raises the whole body.
    ctx.translate(0, JF_PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(p.sizeScale * (1 + pose.squashX), p.sizeScale * (1 + pose.squashY));
    ctx.translate(0, -JF_PIVOT_Y);

    const top = JF_TOP;
    const bot = JF_BOT;
    const cy = JF_CY;

    // 1) soft dark outline pass (drawn under, reads as a rim)
    jackfruitBodyPath(ctx);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // 2) body fill + shading, clipped to the body so detail stays inside
    ctx.save();
    jackfruitBodyPath(ctx);
    ctx.clip();

    // base mid tone
    ctx.fillStyle = rgb(p.skinMid);
    ctx.fillRect(-JF_HALF - 3, top - 8, (JF_HALF + 3) * 2, bot - top + 16);

    // light from upper-left → a lit panel on the upper-left face
    const litGrad = ctx.createLinearGradient(-JF_HALF, top - 2, JF_HALF, bot);
    litGrad.addColorStop(0, rgb(p.skinLight));
    litGrad.addColorStop(0.5, rgb(p.skinMid));
    litGrad.addColorStop(1, rgb(p.skinDark));
    ctx.fillStyle = litGrad;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.ellipse(-2, cy - 1, JF_HALF + 2, (bot - top) * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // bumpy/knobbly texture — rows of small blunt points. Each knob: a soft
    // shadow groove (dark) then a lit cap (mid→light) then a tip catch.
    KNOBS.forEach((k) => {
      const [kx, ky] = knobXY(k);
      // groove/shadow ring around the base of the knob
      ctx.fillStyle = rgba(p.skinDark, 0.55);
      ctx.beginPath();
      ctx.ellipse(kx + 0.5, ky + 0.6, k.r + 0.7, k.r + 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // the blunt point cap
      ctx.fillStyle = rgb(p.skinMid);
      ctx.beginPath();
      ctx.ellipse(kx, ky, k.r, k.r * 0.92, 0, 0, Math.PI * 2);
      ctx.fill();
      // upper-left lit side of the knob
      ctx.fillStyle = rgba(p.skinLight, 0.85);
      ctx.beginPath();
      ctx.ellipse(kx - 0.5, ky - 0.5, k.r * 0.62, k.r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // tiny tip catch
      ctx.fillStyle = rgba(p.knobTip, 0.9);
      ctx.beginPath();
      ctx.arc(kx - 0.6, ky - 0.6, k.r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    });

    // rounded underside shadow to seat the heavy fruit
    ctx.fillStyle = rgba(p.skinDark, 0.5);
    ctx.beginPath();
    ctx.ellipse(1, bot - 3, JF_HALF * 0.86, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // broad sheen across the knobs (gloss strength from P)
    if (p.gloss > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.1 + 0.4 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(-4.5, cy - 5, JF_HALF * 0.5, (bot - top) * 0.26, -0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // frost dusting (winter) — cool blue speckle across the upward bumps
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.26 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(-1, cy - 6, JF_HALF, (bot - top) * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([236, 246, 255], 0.75 * p.frostAmt);
      // sparkle the upward knob tips
      KNOBS.forEach((k) => {
        if (k.v > 0.42) return; // only the upper rows catch frost
        const [kx, ky] = knobXY(k);
        ctx.beginPath();
        ctx.arc(kx - 0.5, ky - 0.7, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end body clip

    // 3) snow cap on the upward shoulders (winter), over the rim
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(-JF_HALF * 0.82, top + 5);
      ctx.quadraticCurveTo(-6, top - 3, 0, top - 2.5);
      ctx.quadraticCurveTo(6, top - 3, JF_HALF * 0.82, top + 5);
      ctx.quadraticCurveTo(8.5, top + 9, 3, top + 6.2);
      ctx.quadraticCurveTo(0, top + 9, -3, top + 6.2);
      ctx.quadraticCurveTo(-8.5, top + 9, -JF_HALF * 0.82, top + 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([206, 223, 243], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(0, top + 5, JF_HALF * 0.6, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Short thick stem on top (SAME placement every season; rides pose) ────
    const stemBaseY = top + 1;
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 5.4;
    ctx.beginPath();
    ctx.moveTo(0, stemBaseY);
    ctx.quadraticCurveTo(0.6, stemBaseY - 4, 1.2, stemBaseY - 7);
    ctx.stroke();
    ctx.strokeStyle = rgb(p.stem);
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(0, stemBaseY);
    ctx.quadraticCurveTo(0.6, stemBaseY - 4, 1.2, stemBaseY - 7);
    ctx.stroke();
    // stem highlight
    ctx.strokeStyle = rgba([220, 200, 150], 0.5);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-1, stemBaseY - 1);
    ctx.quadraticCurveTo(-0.6, stemBaseY - 4, 0.2, stemBaseY - 6.5);
    ctx.stroke();
    // winter snow cap nub on the stem top
    if (p.snowCapAmt > 0.02) {
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * p.snowCapAmt);
      ctx.beginPath();
      ctx.ellipse(1.2, stemBaseY - 7.2, 3, 1.8, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // end size + pose transform

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

// A ramp-up → HOLD → ramp-down envelope, 0..1..hold..1..0. Smootherstep ramps
// (zero slope at their ends) over the first/last `up` fraction of the window and
// a flat hold of 1 between, so the value AND its velocity are 0 at q=0 and q=1.
// This is what lets the heavy fruit lean far, hold, then settle without a snap.
function holdRamp(q: number, up: number): number {
  if (!(q >= 0) || q >= 1) return 0;
  const u = up > 0.001 ? Math.min(0.5, up) : 0.001;
  if (q < u) return smoother(q / u); // 0→1 with zero slope at q=0
  if (q > 1 - u) return smoother((1 - q) / u); // 1→0 with zero slope at q=1
  return 1; // held over (the slow, weighty hold)
}

/** Build the idle pose from the wall clock. Two tiers, BOTH a heavy slow wobble
 *  that sells the jackfruit's big knobbly MASS — never a hop. The motion is a
 *  low-frequency, high-inertia rock: a slow lean that eases in and out over a
 *  pronounced base squat (the heavy fruit settling its weight).
 *
 *  COMMON (~6s, win 1.6s): one slow, weighty single rock — a deliberate lean to
 *      one side and back over a deep base squat. Slower than a normal wobble.
 *  RARE  (~18s, win 3.6s): a bigger, even slower HEAVE — the heavy fruit leans
 *      far, HOLDS over its mass, then settles back with an overshoot squash
 *      (mass momentum). Pose-only, no hop.
 *
 *  Every additive term is a product of factors that are each 0 at q=0 and q=1
 *  (hump = sin²(πq); holdRamp's smootherstep ends; smoother(q) at q=1), so the
 *  pose returns to REST with zero value AND zero velocity → a seamless loop.
 *  poseFromClock(0) === REST (all zeros). */
function poseFromClock(t: number): Pose {
  const pose: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0 };

  // ── COMMON: one slow, weighty single rock (~6s, win 1.6s) ──
  // A heavy fruit doesn't flick — it leans ponderously to one side and settles
  // back, the base squatting deep under its weight. `hump` eases the lean in and
  // out and is 0 (with zero velocity) at both edges, so it's a clean single rock.
  const qC = actionQ(t, 6.0, 1.6, 0.0);
  if (qC >= 0) {
    const h = hump(qC); // 0..1..0, zero value+velocity at edges
    pose.lean += -0.1 * h;      // a slow, deliberate one-sided lean (~3px at top)
    pose.squashY += -0.07 * h;  // pronounced base squat — settling its weight
    pose.squashX += 0.06 * h;
  }

  // ── RARE: a bigger, even slower HEAVE (~18s, win 3.6s) ──
  // The heavy fruit leans FAR to one side, HOLDS there over its mass, then
  // settles back with an overshoot squash. Slower and bolder than COMMON, and
  // in the opposite direction so the two beats read distinct. Window (t mod 18)
  // ∈ [8, 11.6) — phase 10 places it in the gap between the COMMON rocks at
  // [0,1.6)/[6,7.6)/[12,13.6), so the two tiers never overlap.
  const qS = actionQ(t, 18.0, 3.6, 10.0);
  if (qS >= 0) {
    const heave = holdRamp(qS, 0.34); // 0→1→HOLD→0, zero velocity at edges
    // mass-momentum settle: a late, wide over-squash that peaks on the way back.
    // hump·smoother is 0 at both edges (hump→0) and weighted toward q=1 by
    // smoother(q), so it reads as the body thumping wide as it settles.
    const overshoot = hump(qS) * smoother(qS);
    pose.lean += 0.2 * heave;        // a far, heavy lean — held over (deliberate)
    pose.squashY += -0.1 * heave;    // deep base squat under the held heave
    pose.squashX += 0.09 * heave;
    pose.squashY += -0.06 * overshoot; // extra over-squat as the weight settles
    pose.squashX += 0.055 * overshoot;
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
          const fy = -22 + prog * 40;
          const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
          ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.arc(dx, fy, r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      } else if (season === "Spring") {
        // a couple of drifting blossom petals
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
      // Summer: no extra dressing — the bounce + glossy green-gold is the show.
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
