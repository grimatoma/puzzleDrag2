// BOLD seasonal art for the LEMON fruit tile (`tile_fruit_lemon`).
//
// Mirrors the APPROVED produce reference `veg/pepper.bold.ts`: ONE plump oval
// citrus (blunt nub at top + bottom, dimpled rind, a single leaf at the
// shoulder, resting low-centre on a flat grass pad) drawn the SAME every season
// — identity-safe — while the seasons swing HARD on colour + a real seasonal
// prop. The idle is a distinct, in-character CITRUS beat (NOT the generic
// shared squash-stretch bounce that every fruit/veg used to share):
//
//   IDLE COMMON  (~6s, win ~0.9s): a FAST, NERVOUS little wobble — a perky small
//       fruit's higher-frequency, smaller-amplitude jitter (a quick steady tremble
//       at the nub, not a slow rock), with a faint squash at the base. Pose-only.
//       Zero value AND velocity at the window edges (seamless).
//   IDLE RARE    (~18s, win ~1.1s): a CITRUS-SPRITZ — a brief burst of very rapid
//       tiny shakes that damps out (a shiver), while a fine MIST PUFF of tiny
//       droplets sprays outward from the lemon's tip/shoulder (drawn as an
//       additive overlay in anim(), never in the still). The shiver is pose; both
//       the shiver and the mist are exactly 0 at the window edges (so at t=0 the
//       lemon is at REST and no droplet is drawn).
//
// Architecture mirrors pepper.bold.ts: a single parameterized
// `paint(ctx, p, pose)` where `interface P` holds tweenable season params
// (colours + prop amounts) and `pose` holds the idle gesture (bob / lean /
// squash). Because every season is the same paint with tweened P, transitions
// are seamless:
//   transition(0) ≡ draw(from), transition(1) ≡ draw(to).
// REST pose has all zeros, so draw(season) = paint(ctx, SP[season], REST) and
// the idle's pose is 0 (with zero velocity) at every action-window edge →
// seamless loop.
//
// Origin-centered in the −24..+24 design box (actions may paint outside it),
// light from upper-left, flat cel-shaded with a soft dark outline. Pure
// Canvas-2D vector drawing — never throws, clamps everything, save/restore.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable season params ──────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — paint is a
 *  pure function of these so transitions interpolate cleanly. */
interface P {
  skinLight: RGB;        // lit highlight of the rind
  skinMid: RGB;          // body tone
  skinDark: RGB;         // shadowed underside
  leaf: RGB;             // shoulder leaf
  leafVein: RGB;         // leaf vein / dark base
  padGrass: RGB;         // top of the grass pad
  padDark: RGB;          // shaded pad underside
  soil: RGB;             // contact / base soil under the lemon
  outline: RGB;          // soft dark outline tint
  light: RGB;            // ambient light tint laid over the whole tile
  lightAmt: number;      // 0..1 strength of the ambient light wash
  ripeness: number;      // 0 green-unripe → 1 deep waxy; drives dimple contrast
  gloss: number;         // 0..1 specular gloss strength on the rind
  frostAmt: number;      // 0..1 cool frost dusting on the skin (winter)
  snowCapAmt: number;    // 0..1 snow cap on the upper shoulder (winter)
  padSnowAmt: number;    // 0..1 snow blanket at the base / on the pad (winter)
  blossomAmt: number;    // 0..1 blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad (autumn)
}

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number;     // vertical offset in design px (negative = up)
  lean: number;    // top-of-lemon sway, radians (rock side to side)
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

function mix(a: RGB, b: RGB, t: number): RGB {
  return lerpRGB(a, b, clamp01(t));
}

function lerpP(a: P, b: P, t: number): P {
  return {
    skinLight: lerpRGB(a.skinLight, b.skinLight, t),
    skinMid: lerpRGB(a.skinMid, b.skinMid, t),
    skinDark: lerpRGB(a.skinDark, b.skinDark, t),
    leaf: lerpRGB(a.leaf, b.leaf, t),
    leafVein: lerpRGB(a.leafVein, b.leafVein, t),
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

const SP: Record<SeasonName, P> = {
  // Spring — clearly GREEN unripe lemon, dewy lime pad, prominent blossom.
  Spring: {
    skinLight: [220, 240, 150],
    skinMid: [168, 206, 84],
    skinDark: [112, 150, 48],
    leaf: [108, 196, 84],
    leafVein: [62, 134, 52],
    padGrass: [126, 214, 84],
    padDark: [64, 146, 56],
    soil: [120, 84, 48],
    outline: [70, 92, 36],
    light: [228, 248, 214],
    lightAmt: 0.18,
    ripeness: 0.24,
    gloss: 0.2,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 1.0,
    fallenLeafAmt: 0,
  },
  // Summer — bright vivid YELLOW peak, max gloss, warm light.
  Summer: {
    skinLight: [255, 248, 168],
    skinMid: [252, 212, 36],
    skinDark: [206, 150, 16],
    leaf: [70, 156, 56],
    leafVein: [40, 104, 38],
    padGrass: [80, 178, 70],
    padDark: [40, 116, 50],
    soil: [128, 88, 48],
    outline: [128, 88, 16],
    light: [255, 244, 200],
    lightAmt: 0.2,
    ripeness: 0.72,
    gloss: 1.0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — deep golden yellow, dulled gloss, amber pad + a fallen leaf.
  Autumn: {
    skinLight: [250, 222, 110],
    skinMid: [238, 184, 34],
    skinDark: [186, 130, 14],
    leaf: [196, 150, 52],
    leafVein: [138, 94, 30],
    padGrass: [160, 150, 78],
    padDark: [108, 88, 46],
    soil: [120, 78, 42],
    outline: [108, 72, 14],
    light: [250, 198, 132],
    lightAmt: 0.24,
    ripeness: 0.94,
    gloss: 0.36,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1.0,
  },
  // Winter — cool blue-grey light; frost-dusted lemon STILL clearly yellow,
  // a bold white snow cap on top + a snow drift at the base.
  Winter: {
    skinLight: [248, 234, 158],
    skinMid: [232, 198, 78],
    skinDark: [176, 142, 48],
    leaf: [120, 150, 110],
    leafVein: [80, 110, 82],
    padGrass: [182, 202, 220],
    padDark: [122, 150, 178],
    soil: [132, 116, 102],
    outline: [78, 86, 102],
    light: [200, 224, 255],
    lightAmt: 0.34,
    ripeness: 0.82,
    gloss: 0.3,
    frostAmt: 0.78,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Lemon geometry — the SAME silhouette every season ────────────────────────

const BODY_CX = 0;
const BODY_CY = 6;  // rests low-centre on the pad
const BODY_RX = 13;
const BODY_RY = 15;
const TILT = -0.12; // gentle lean of the long axis, radians

// Blunt nub knobs along the tilted long axis (top + bottom).
const NUB_TOP: readonly [number, number] = [
  BODY_CX + Math.sin(TILT) * (BODY_RY + 1.5),
  BODY_CY - Math.cos(TILT) * (BODY_RY + 1.5),
];
const NUB_BOT: readonly [number, number] = [
  BODY_CX - Math.sin(TILT) * (BODY_RY + 1.5),
  BODY_CY + Math.cos(TILT) * (BODY_RY + 1.5),
];

// Pivot near the base so lean rocks the TOP nub side-to-side and squash anchors
// at the base (the lemon "sits" on the pad).
const PIVOT_Y = BODY_CY + BODY_RY - 2;

// Deterministic dimple field across the rind (fixed every season).
const DIMPLES: ReadonlyArray<readonly [number, number]> = [
  [-6, -4], [-2, -7], [3, -5], [7, -1], [-8, 2],
  [-3, 1], [2, 3], [6, 4], [-5, 8], [0, 9], [5, 9], [-9, -2],
  [9, 2], [-1, -3], [4, 7],
];

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

    // tufted top edge
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

    // small soil patch peeking at the subject base
    ctx.fillStyle = rgba(p.soil, 0.5);
    ctx.beginPath();
    ctx.ellipse(0, 18.5, 9, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

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

    // ── Contact shadow under the lemon (follows the bob/lean for grounding) ──
    const tipShift = pose.lean * (PIVOT_Y - (BODY_CY - BODY_RY)); // how far the nub leans
    const shadowSpread = 1 + clamp01(pose.bob < 0 ? -pose.bob / 14 : 0) * 0.5;
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0 + tipShift * 0.18, BODY_CY + BODY_RY + 1, 9 * shadowSpread, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.28 / shadowSpread);
    ctx.beginPath();
    ctx.ellipse(2.5 + tipShift * 0.2, BODY_CY + BODY_RY + 1.5, 11 * shadowSpread, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the lemon, under the idle pose transform ────────────────────
    ctx.save();
    ctx.translate(0, PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(0, -PIVOT_Y);

    drawLemon(ctx, p);

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

// The lemon itself — silhouette identical every season; only colour/dressing vary.
function drawLemon(ctx: CanvasRenderingContext2D, p: P): void {
  // soft dark outline halo + nub knobs sitting inside it
  ctx.fillStyle = rgba(p.outline, 0.92);
  ctx.beginPath();
  ctx.ellipse(BODY_CX, BODY_CY, BODY_RX + 1.4, BODY_RY + 1.4, TILT, 0, Math.PI * 2);
  ctx.fill();
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
  lg.addColorStop(0, rgba(p.skinLight, 0.95));
  lg.addColorStop(0.55, rgba(p.skinMid, 0));
  lg.addColorStop(1, rgba(p.skinMid, 0));
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.ellipse(BODY_CX, BODY_CY, BODY_RX, BODY_RY, TILT, 0, Math.PI * 2);
  ctx.fill();

  // lower-right core shade
  const sg = ctx.createRadialGradient(6, BODY_CY + 7, 2, 6, BODY_CY + 7, BODY_RX + 6);
  sg.addColorStop(0, rgba(p.skinDark, 0.45));
  sg.addColorStop(0.7, rgba(p.skinDark, 0));
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.ellipse(BODY_CX, BODY_CY, BODY_RX, BODY_RY, TILT, 0, Math.PI * 2);
  ctx.fill();

  // dimple/pore texture — paired dark+light specks; contrast grows with ripeness
  const dimC = 0.18 + p.ripeness * 0.32;
  DIMPLES.forEach(([dx, dy]) => {
    ctx.fillStyle = rgba(p.skinDark, dimC * 0.7);
    ctx.beginPath();
    ctx.arc(dx, BODY_CY + dy, 0.95, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.skinLight, dimC * 0.55);
    ctx.beginPath();
    ctx.arc(dx - 0.7, BODY_CY + dy - 0.7, 0.6, 0, Math.PI * 2);
    ctx.fill();
  });

  // frost dusting (winter) — cool blue speckle on the upper rind
  if (p.frostAmt > 0.01) {
    const fa = p.frostAmt;
    ctx.fillStyle = rgba([212, 232, 255], 0.34 * fa);
    ctx.beginPath();
    ctx.ellipse(-2, BODY_CY - 5, BODY_RX - 2, BODY_RY - 4, TILT, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.7 * fa);
    DIMPLES.forEach(([dx, dy], i) => {
      if (i % 2 === 0 && dy < 4) {
        ctx.beginPath();
        ctx.arc(dx, BODY_CY + dy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // specular gloss (sharp toward summer)
  if (p.gloss > 0.02) {
    const glossA = 0.25 + p.gloss * 0.6;
    ctx.fillStyle = rgba([255, 255, 255], glossA);
    ctx.beginPath();
    ctx.ellipse(-5, BODY_CY - 6, 3.6 - p.gloss * 1.2, 6 - p.gloss * 2, TILT - 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore(); // unclip

  // snow cap on the upward (upper-left) shoulder — outside clip, sits on rind
  if (p.snowCapAmt > 0.01) {
    const sa = p.snowCapAmt;
    ctx.fillStyle = rgba([248, 252, 255], 0.95 * sa);
    ctx.beginPath();
    ctx.ellipse(-3.5, BODY_CY - 10, 8.5 * sa + 2, 4.5 * sa + 1.5, TILT - 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([210, 226, 244], 0.6 * sa);
    ctx.beginPath();
    ctx.ellipse(-2, BODY_CY - 8, 7 * sa + 1.5, 2.4, TILT, 0, Math.PI * 2);
    ctx.fill();
  }

  drawLeaf(ctx, p);
}

// A single leaf at the top shoulder; colour from p.leaf (green→amber→winter-sage).
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
  ctx.fillStyle = rgba(mix(p.leaf, [255, 255, 255], 0.4), 0.6);
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

// ── Shared RARE-window clock — the CITRUS-SPRITZ event ────────────────────────
// COMMON and RARE never overlap: COMMON fires every 6s at phase 0 (win 0.9s);
// the RARE spritz fires every 18s at phase 3.0s (win 1.1s) — its window
// [3.0, 4.1) is clear of the COMMON windows at 0, 6, 12 (and 18 ≡ 0). One source
// of truth so the lemon's SHIVER (in poseFromClock) and the MIST PUFF overlay
// (in anim) stay in lockstep and share identical seamless edges.
const SPRITZ_PERIOD = 18.0;
const SPRITZ_WIN = 1.1;
const SPRITZ_PHASE = 3.0;

/** Progress 0..1 through the spritz window, else −1 (no spritz). */
function spritzQ(t: number): number {
  return actionQ(t, SPRITZ_PERIOD, SPRITZ_WIN, SPRITZ_PHASE);
}

/** The spritz "burst that damps out" envelope, 0..~1. A fast smootherstep attack
 *  then an exponential decay (the shakes/spray fade through the window), all
 *  multiplied by sin²(πq) so the result is EXACTLY 0 with zero velocity at q=0
 *  and q=1 — the whole event begins and ends at REST (and so is absent at t=0).
 *  Returns 0 outside the window. */
function spritzBurst(q: number): number {
  if (!(q >= 0) || q > 1) return 0;
  const gate = Math.sin(Math.PI * q);
  const gate2 = gate * gate; // 0 + zero slope at both edges
  const up = 0.12;
  const attack = q < up ? smoother(q / up) : 1; // quick rise, zero slope at q=0
  const decay = Math.exp(-3.0 * q); // the burst damps out across the window
  return gate2 * attack * decay;
}

/** Build the idle pose from the wall clock. Two tiers, NEITHER a bounce:
 *   COMMON — a fast, nervous little wobble (a perky tremble) every ~6s.
 *   RARE   — a citrus-spritz SHIVER (rapid tiny shakes that damp out) every ~18s,
 *            fully synced to the mist-puff overlay in anim() via spritzBurst. */
function poseFromClock(t: number): Pose {
  const pose: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0 };

  // ── COMMON: a FAST, NERVOUS little wobble (~6s, win 0.9s) ──
  // Higher-frequency, smaller-amplitude than a slow rock — a perky small-fruit
  // tremble. The fast oscillation is multiplied by sin²(πqC), which is 0 with
  // zero slope at q=0 and q=1, so the nervous wobble starts and ends at REST.
  const qC = actionQ(t, 6.0, 0.9, 0.0);
  if (qC >= 0) {
    const gate = Math.sin(Math.PI * qC);
    const env = gate * gate; // 0..1..0 with zero velocity at both edges
    const jitter = Math.sin(qC * Math.PI * 5); // 2.5 quick rocks; =0 at q=0 and q=1
    pose.lean += 0.1 * env * jitter; // small amplitude → nub trembles a few px
    // a faint perky squash pulsing with the tremble (0 at edges via hump)
    pose.squashY += -0.032 * hump(qC);
    pose.squashX += 0.028 * hump(qC);
  }

  // ── RARE: the CITRUS-SPRITZ SHIVER (~18s, win 1.1s) ──
  // A brief burst of VERY rapid tiny shakes that damps out as the lemon sprays a
  // mist puff. Every factor rides spritzBurst (which is 0 with zero velocity at
  // the window edges), so the shiver is exactly 0 at q=0 and q=1 — and stays in
  // lockstep with the mist overlay drawn in anim().
  const burst = spritzBurst(spritzQ(t));
  if (burst > 0) {
    const phase = spritzQ(t) * Math.PI * 14; // ~7 oscillations across the window
    const shakeL = Math.sin(phase); // lands on 0 at q=1 (sin of integer·π)
    const shakeS = Math.abs(Math.sin(phase + 1.1)); // squash shimmies, slight phase
    pose.lean += 0.07 * burst * shakeL; // a fine rapid tremor at the nub
    pose.squashX += 0.05 * burst * shakeS; // tiny bulge/relax as it shivers
    pose.squashY += -0.045 * burst * shakeS;
    pose.bob += -0.7 * burst; // a tiny lift on the spritz (settles back to 0)
  }

  return pose;
}

// ── The MIST PUFF overlay — additive, drawn over the painted lemon in anim() ──
// A fine fan of tiny droplets sprays outward from the lemon's tip/shoulder during
// the rare citrus-spritz, then dissipates. Driven ONLY by t through the shared
// spritzBurst envelope, so it is invisible (nothing drawn) at the window edges —
// and therefore at t=0 the still lemon is untouched.

// Spray origin just off the top nub, on the lit upper-left shoulder.
const MIST_ORIG_X = -1.0;
const MIST_ORIG_Y = -12.0;
const MIST_DROPS = 9;

// Deterministic pseudo-random in [0,1) from an integer seed — for a stable,
// repeatable droplet fan (no per-frame randomness, so the spray reads the same
// every spritz).
function mistRand(n: number): number {
  const s = Math.sin(n * 127.1 + 0.5) * 43758.5453;
  return s - Math.floor(s);
}

/** Draw the citrus mist puff at burst amount `b` (0..1) and progress `q` (0..1)
 *  through the spritz window. At b<=0 nothing is drawn. Each droplet travels
 *  outward with `q` (a spray that leaves the rind) and fades with `b` (so the
 *  whole puff is gone at the window edges). Pure additive dressing — never the
 *  lemon's own colour/brightness. */
function drawMist(ctx: CanvasRenderingContext2D, b: number, q: number): void {
  const amt = clamp01(b);
  if (amt <= 0.001) return;
  const prog = clamp01(q); // how far along the spray the droplets have travelled

  ctx.save();
  try {
    ctx.globalAlpha = 1;
    // A faint cool-white haze right at the spray mouth (densest, fades fastest).
    ctx.fillStyle = rgba([255, 255, 255], 0.22 * amt);
    ctx.beginPath();
    ctx.ellipse(MIST_ORIG_X + 1.5, MIST_ORIG_Y - 2, 4.2, 3.2, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // The droplet fan — tiny round specks streaking up-and-out toward open space.
    for (let i = 0; i < MIST_DROPS; i++) {
      const ang = -1.85 + mistRand(i * 3 + 1) * 1.5; // up-left → up-right fan
      const reach = 9 + mistRand(i * 3 + 2) * 8; // px travelled when fully out
      const sz = 0.7 + mistRand(i * 3 + 3) * 0.8;
      // each droplet emerges slightly staggered so the puff "sprays" outward
      const lead = 0.12 * mistRand(i * 3 + 4);
      const dp = clamp01((prog - lead) / Math.max(0.01, 1 - lead));
      const d = reach * dp;
      const dx = MIST_ORIG_X + Math.cos(ang) * d;
      const dy = MIST_ORIG_Y + Math.sin(ang) * d;
      // alpha: gated by the burst (0 at window edges) and trailing off as the
      // droplet flies out and shrinks; clamp keeps it safe.
      const a = amt * (0.85 - 0.45 * dp);
      const r = Math.max(0.2, sz * (1 - 0.4 * dp));
      ctx.fillStyle = rgba([255, 255, 255], clamp01(a));
      ctx.beginPath();
      ctx.arc(dx, dy, r, 0, Math.PI * 2);
      ctx.fill();
      // a fainter cool-tint core for a juicy citrus shimmer
      ctx.fillStyle = rgba([226, 246, 196], clamp01(a * 0.5));
      ctx.beginPath();
      ctx.arc(dx, dy, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], REST);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const tt = Number.isFinite(t) ? t : 0;
    paint(ctx, SP[season], poseFromClock(tt));

    // RARE CITRUS-SPRITZ (all seasons) — a fine mist puff sprays from the lemon's
    // tip/shoulder while it shivers. Additive overlay only; fully synced to the
    // shiver in poseFromClock via the shared spritz clock. `spritzBurst` is 0 at
    // the window edges (and so at t=0), so nothing is drawn at rest.
    const sq = spritzQ(tt);
    const burst = spritzBurst(sq);
    if (burst > 0) {
      drawMist(ctx, burst, sq);
    }

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
        ctx.fillStyle = "rgba(196,150,52,1)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.4, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      // Summer: no extra dressing — the bounce + glossy yellow is the show.
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
