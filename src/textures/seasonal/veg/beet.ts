// BOLD seasonal art for the BEET / BEETROOT vegetable tile (`tile_veg_beet`).
//
// ONE crimson beetroot — a rounded deep-red bulb with a pointed tip and a thin
// taproot, topped by an upright tuft of dark-green RED-VEINED leaves — sits on a
// low grassy pad. The SAME silhouette is drawn every season (identity-safe), but
// the seasons swing HARD on colour, ripeness/size, and a real seasonal prop
// (blossom / fallen leaf / snow cap + base snow), and the idle is loud rather
// than subtle:
//
//   IDLE COMMON  (~6s, win ~0.9s): a side-to-side WOBBLE — the leaf tuft rocks
//       /leans ~10-12 design-px at the tip with a squash at the base. Zero
//       velocity at the window edges (seamless).
//   IDLE SPECIAL (~18s, win ~1.1s): a bigger SHAKE/BOUNCE — a squash-stretch hop
//       ~12-14 design-px up, anticipation crouch → stretch up → squash landing
//       that settles. May briefly exit the −24..+24 box.
//
// Architecture mirrors pepper.bold.ts: a single parameterized `paint(ctx,p,pose)`
// where `interface P` holds tweenable season params (colours + prop amounts) and
// `pose` holds the idle gesture (bob / lean / squash). Because every season is
// the same paint with tweened P, transitions are seamless:
//   transition(0) ≡ draw(from), transition(1) ≡ draw(to).
// REST pose has all zeros, so draw(season) = paint(ctx, SP[season], REST) and the
// idle's pose is 0 at every action-window edge → seamless loop.
//
// Origin-centered in the −24..+24 design box (actions may paint outside it),
// light from upper-left, flat cel-shaded with a soft dark outline. Pure
// Canvas-2D vector drawing — never throws, clamps everything, save/restore,
// resets globalAlpha.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable season params ──────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — paint is a
 *  pure function of these so transitions interpolate cleanly. */
interface P {
  rootHi: RGB;            // bulb highlight side
  rootMid: RGB;          // bulb body
  rootShade: RGB;        // bulb shadow side / tip
  leafHi: RGB;           // leaf highlight
  leafMid: RGB;          // leaf body
  veins: RGB;            // red veins + stems
  padGrass: RGB;         // pad top grass
  padShade: RGB;         // pad underside
  soil: RGB;             // soil collar where bulb meets pad
  outline: RGB;          // soft dark outline tint
  light: RGB;            // ambient light wash colour
  ripeness: number;      // 0 small/young .. 1 fat/mature (modest size growth)
  frostAmt: number;      // 0..1 frost dusting on subject (winter)
  snowCapAmt: number;    // 0..1 snow cap atop the leaf tuft (winter)
  padSnowAmt: number;    // 0..1 snow blanket on the pad / base (winter)
  blossomAmt: number;    // 0..1 blossom on pad + a sprung bud (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf on pad (autumn)
  leafYellow: number;    // 0..1 leaf-tip yellowing (autumn)
  gloss: number;         // 0..1 bulb sheen strength
  lightAmt: number;      // 0..1 ambient wash strength
}

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number;     // vertical offset in design px (negative = up)
  lean: number;    // top-of-beet sway, radians (rock side to side)
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

function safeNum(x: number): number {
  return Number.isFinite(x) ? x : 0;
}

// Interpolate EVERY field of P.
function lerpP(a: P, b: P, t: number): P {
  return {
    rootHi: lerpRGB(a.rootHi, b.rootHi, t),
    rootMid: lerpRGB(a.rootMid, b.rootMid, t),
    rootShade: lerpRGB(a.rootShade, b.rootShade, t),
    leafHi: lerpRGB(a.leafHi, b.leafHi, t),
    leafMid: lerpRGB(a.leafMid, b.leafMid, t),
    veins: lerpRGB(a.veins, b.veins, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padShade: lerpRGB(a.padShade, b.padShade, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    ripeness: lerp(a.ripeness, b.ripeness, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
    leafYellow: lerp(a.leafYellow, b.leafYellow, t),
    gloss: lerp(a.gloss, b.gloss, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
  };
}

function clampP(p: P): P {
  return {
    ...p,
    ripeness: clamp01(p.ripeness),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    leafYellow: clamp01(p.leafYellow),
    gloss: clamp01(p.gloss),
    lightAmt: clamp01(p.lightAmt),
  };
}

// ── Per-season params — pushed HARD ──────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — small YOUNG beet, fresh young leaves + a blossom on the pad.
  Spring: {
    rootHi: [226, 110, 134],
    rootMid: [190, 64, 92],
    rootShade: [130, 34, 62],
    leafHi: [168, 224, 104],
    leafMid: [96, 174, 64],
    veins: [206, 78, 104],
    padGrass: [138, 212, 94],
    padShade: [78, 146, 62],
    soil: [104, 72, 42],
    outline: [70, 30, 40],
    light: [228, 244, 255],
    ripeness: 0.22,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 1.0,
    fallenLeafAmt: 0,
    leafYellow: 0,
    gloss: 0.32,
    lightAmt: 0.26,
  },
  // Summer — deep CRIMSON ripe beet at peak, lush red-veined leaves, max gloss.
  Summer: {
    rootHi: [224, 72, 100],
    rootMid: [176, 32, 64],
    rootShade: [104, 16, 40],
    leafHi: [128, 196, 74],
    leafMid: [54, 126, 46],
    veins: [196, 46, 72],
    padGrass: [84, 178, 70],
    padShade: [44, 118, 50],
    soil: [86, 56, 30],
    outline: [56, 18, 30],
    light: [255, 244, 206],
    ripeness: 0.66,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    leafYellow: 0,
    gloss: 1.0,
    lightAmt: 0.34,
  },
  // Autumn — FAT mature beet, leaves yellowing, a fallen leaf on the pad.
  Autumn: {
    rootHi: [192, 60, 86],
    rootMid: [140, 30, 58],
    rootShade: [82, 16, 36],
    leafHi: [176, 168, 70],
    leafMid: [120, 116, 48],
    veins: [176, 58, 56],
    padGrass: [158, 152, 82],
    padShade: [112, 100, 54],
    soil: [90, 58, 32],
    outline: [54, 28, 22],
    light: [255, 206, 138],
    ripeness: 1.0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1.0,
    leafYellow: 0.92,
    gloss: 0.36,
    lightAmt: 0.34,
  },
  // Winter — cool blue-grey light; frosted beet still clearly CRIMSON, a bold
  // snow cap on top + a snow blanket at the base.
  Winter: {
    rootHi: [196, 96, 116],
    rootMid: [150, 48, 74],
    rootShade: [92, 30, 52],
    leafHi: [126, 162, 124],
    leafMid: [72, 112, 84],
    veins: [160, 84, 92],
    padGrass: [188, 206, 220],
    padShade: [128, 154, 180],
    soil: [120, 108, 100],
    outline: [54, 44, 56],
    light: [202, 224, 255],
    ripeness: 0.8,
    frostAmt: 0.8,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    leafYellow: 0.1,
    gloss: 0.4,
    lightAmt: 0.36,
  },
};

// ── Beet geometry — the SAME silhouette every season ─────────────────────────
// The bulb sits on the pad; the leaf tuft rises above. The pose pivot is near
// the bulb base so the lean rocks the leaves side-to-side and squash anchors at
// the contact with the pad.

const BEET_PIVOT_Y = 16; // rock/lean & squash about a point near the bulb base

/** The single parameterized paint — the whole tile from ONLY `p` (season
 *  identity) and `pose` (idle gesture). */
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

    const outline = rgb(p.outline);

    // ── Pad: low flat ellipse (does NOT move with the pose) ──────────────────
    // Soft contact shadow, lower-right.
    ctx.fillStyle = "rgba(0,0,0,0.20)";
    ctx.beginPath();
    ctx.ellipse(3, 21.5, 17, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shaded underside band.
    ctx.fillStyle = rgb(p.padShade);
    ctx.beginPath();
    ctx.ellipse(0, 20.5, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Grass top.
    ctx.fillStyle = rgb(p.padGrass);
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tufted edge — little blades around the front rim.
    ctx.strokeStyle = rgb(p.padGrass);
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 11; i++) {
      const a = Math.PI + (i / 10) * Math.PI; // front arc of rim
      const ex = Math.cos(a) * 17.4;
      const ey = 19 + Math.sin(a) * 5.0;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + Math.cos(a) * 0.6, ey - 2.1 - (i % 2) * 0.7);
      ctx.stroke();
    }

    // Bright lit crescent on the upper-left of the pad.
    ctx.fillStyle = rgba(p.light, 0.18 * p.lightAmt + 0.06);
    ctx.beginPath();
    ctx.ellipse(-5, 17.5, 11, 2.6, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Pad snow blanket / base snow (winter).
    if (p.padSnowAmt > 0.01) {
      ctx.fillStyle = rgba([244, 250, 255], 0.92 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(0, 18.2, 17 * (0.7 + 0.3 * p.padSnowAmt), 4.4 * p.padSnowAmt + 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([210, 226, 244], 0.5 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(2, 20, 16, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      // sparkle flecks
      ctx.fillStyle = rgba([255, 255, 255], 0.85 * p.padSnowAmt);
      ([[-9, 18], [6, 19.5], [12, 17.5], [-2, 20]] as Array<[number, number]>).forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // ── Subject group: beet under the idle pose transform ────────────────────
    ctx.save();
    // Pivot near the bulb base so lean rocks the leaf tuft side-to-side and
    // squash anchors at the base. bob raises the whole body.
    ctx.translate(0, BEET_PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(0, -BEET_PIVOT_Y);

    const ripe = clamp01(p.ripeness);
    // Bulb size grows modestly with ripeness — same beet, just plumper.
    const bw = 11 + ripe * 3.2; // half-width
    const bh = 10 + ripe * 3.0; // half-height (upper bulge)
    const cy = 9; // bulb centre y, sitting on the pad
    const tipY = cy + bh + 6.2; // taproot/pointed tip end

    // Soil collar where the bulb meets the pad.
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, cy + bh * 0.4, bw * 0.9, 3.0, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Bulb silhouette: rounded top tapering to a pointed tip + taproot ──
    // Build the same path each season (silhouette invariant up to ripeness).
    function bulbPath(): void {
      ctx.beginPath();
      ctx.moveTo(-bw, cy - bh * 0.1);
      ctx.bezierCurveTo(-bw, cy - bh, -bw * 0.4, cy - bh * 1.25, 0, cy - bh * 1.2);
      ctx.bezierCurveTo(bw * 0.4, cy - bh * 1.25, bw, cy - bh, bw, cy - bh * 0.1);
      ctx.bezierCurveTo(bw, cy + bh * 0.7, bw * 0.45, cy + bh * 0.95, 2.0, tipY - 2.0);
      ctx.lineTo(0.6, tipY);
      ctx.lineTo(-0.6, tipY - 0.4);
      ctx.bezierCurveTo(-bw * 0.45, cy + bh * 0.95, -bw, cy + bh * 0.7, -bw, cy - bh * 0.1);
      ctx.closePath();
    }

    // Dark base pass (outline / silhouette), then lighter fills on top.
    bulbPath();
    ctx.fillStyle = rgb(p.rootShade);
    ctx.fill();

    // Mid body, inset slightly so the dark base reads as an outline.
    ctx.save();
    ctx.translate(-0.5, -0.6);
    bulbPath();
    ctx.fillStyle = rgb(p.rootMid);
    ctx.fill();
    ctx.restore();

    // Highlight side (upper-left), clipped to the bulb.
    ctx.save();
    bulbPath();
    ctx.clip();
    ctx.fillStyle = rgb(p.rootHi);
    ctx.beginPath();
    ctx.ellipse(-bw * 0.32, cy - bh * 0.45, bw * 0.7, bh * 0.85, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // soft horizontal ring lines hinting at the beet's bands
    ctx.strokeStyle = rgba(p.rootShade, 0.35);
    ctx.lineWidth = 1;
    for (let r = 0; r < 2; r++) {
      const ry = cy + bh * (0.15 + r * 0.35);
      ctx.beginPath();
      ctx.ellipse(0, ry, bw * (0.7 - r * 0.18), 2.2, 0, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();

    // Glossy sheen highlight (strength from gloss).
    ctx.fillStyle = rgba([255, 240, 244], 0.5 * p.gloss + 0.12);
    ctx.beginPath();
    ctx.ellipse(-bw * 0.38, cy - bh * 0.55, bw * 0.22, bh * 0.32, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Soft outline stroke around the bulb to seat it.
    bulbPath();
    ctx.strokeStyle = rgba(p.outline, 0.55);
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Thin taproot dangling from the tip.
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, tipY - 1);
    ctx.quadraticCurveTo(1.6, tipY + 3, 0.4, tipY + 6);
    ctx.stroke();

    // ── Frost dusting on the bulb's upward surface (winter) ──
    if (p.frostAmt > 0.02) {
      ctx.save();
      bulbPath();
      ctx.clip();
      ctx.fillStyle = rgba([220, 236, 255], 0.45 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(-bw * 0.1, cy - bh * 0.6, bw * 0.85, bh * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.frostAmt);
      ([[-4, cy - bh * 0.7], [3, cy - bh * 0.5], [-1, cy - bh * 0.2]] as Array<[number, number]>).forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    // ── Leaf tuft rising above the bulb (same arrangement every season) ──
    const crownY = cy - bh * 1.18;
    // [base dx, lean dx, tipY] — symmetric upright fan, identical shape.
    const leaves: Array<[number, number, number]> = [
      [-5.4, -8.0, -18.5],
      [-2.6, -4.0, -22.0],
      [0.0, 0.0, -23.5],
      [2.6, 4.0, -22.0],
      [5.4, 8.0, -18.5],
    ];

    leaves.forEach(([bx, lean, ty]) => {
      const baseX = bx * 0.5;
      const baseY = crownY + 1;
      const cpx = bx + lean * 0.4;
      const cpy = crownY - 6;
      const tipX = bx + lean;
      const tipY2 = ty;

      // Red stem (dark base then vein colour).
      ctx.strokeStyle = outline;
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(cpx * 0.6, (baseY + cpy) * 0.5, cpx, cpy);
      ctx.stroke();
      ctx.strokeStyle = rgb(p.veins);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(cpx * 0.6, (baseY + cpy) * 0.5, cpx, cpy);
      ctx.stroke();

      // Leaf blade (broad ovate, dark base then mid then highlight).
      const drawBlade = (color: string, inset: number): void => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(cpx, cpy + inset);
        ctx.quadraticCurveTo(
          cpx - 4.2 + inset * 0.4,
          (cpy + tipY2) * 0.5,
          tipX,
          tipY2 + inset,
        );
        ctx.quadraticCurveTo(
          cpx + 4.2 - inset * 0.4,
          (cpy + tipY2) * 0.5,
          cpx,
          cpy + inset,
        );
        ctx.closePath();
        ctx.fill();
      };
      drawBlade(outline, 0);
      drawBlade(rgb(p.leafMid), 1.0);
      // highlight along the lit (upper-left) side
      ctx.save();
      ctx.globalAlpha = 0.85;
      drawBlade(rgb(p.leafHi), 2.6);
      ctx.restore();

      // Yellowing leaf tip (autumn) — wash near the tip.
      if (p.leafYellow > 0.02) {
        ctx.fillStyle = rgba([216, 192, 78], 0.7 * p.leafYellow);
        ctx.beginPath();
        ctx.ellipse(tipX, tipY2 + 1.5, 2.4, 4.0, lean * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }

      // Central red vein.
      ctx.strokeStyle = rgba(p.veins, 0.8);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cpx, cpy + 1);
      ctx.quadraticCurveTo((cpx + tipX) * 0.5 - 1, (cpy + tipY2) * 0.5, tipX, tipY2 + 1.5);
      ctx.stroke();

      // Frost on upward leaf surfaces (winter).
      if (p.frostAmt > 0.02) {
        ctx.fillStyle = rgba([226, 240, 255], 0.4 * p.frostAmt);
        ctx.beginPath();
        ctx.ellipse((cpx + tipX) * 0.5, (cpy + tipY2) * 0.5, 2.0, 4.2, lean * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Spring sprung bud on the centre leaf — a bold seasonal pop.
    if (p.blossomAmt > 0.02) {
      const a = p.blossomAmt;
      const budX = 0.0;
      const budY = -24.5;
      ctx.fillStyle = rgba([255, 232, 246], 0.95 * a);
      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(budX + Math.cos(ang) * 2.0, budY + Math.sin(ang) * 1.6, 1.5, 1.1, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = rgba([255, 214, 90], a);
      ctx.beginPath();
      ctx.arc(budX, budY, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Snow cap atop the leaf tuft (winter) ──
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([248, 252, 255], 0.92 * a);
      ctx.beginPath();
      ctx.ellipse(0, crownY - 16, 6.5 * a + 1.5, 2.6 * a + 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-3, crownY - 13, 2.4 * a + 0.6, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(0, crownY - 14.6, 5.2 * a + 1.0, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // end subject pose transform

    // ── Pad dressing that sits ON the pad (does NOT move with the pose) ──
    // Tiny blossom on the pad (spring).
    if (p.blossomAmt > 0.02) {
      const petal = rgba([255, 224, 236], 0.9 * p.blossomAmt);
      const bxC = -12.5;
      const byC = 17.0;
      ctx.fillStyle = petal;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(bxC + Math.cos(a) * 1.7, byC + Math.sin(a) * 1.1, 1.3, 1.0, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = rgba([255, 214, 96], p.blossomAmt);
      ctx.beginPath();
      ctx.arc(bxC, byC, 1.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fallen leaf on the pad (autumn).
    if (p.fallenLeafAmt > 0.02) {
      const leafCol = rgba([196, 132, 52], 0.95 * p.fallenLeafAmt);
      const edgeCol = rgba([120, 70, 24], 0.9 * p.fallenLeafAmt);
      const fallen: Array<[number, number, number]> = [
        [11.5, 18.5, 0.5],
        [-13, 19.5, -0.7],
      ];
      fallen.forEach(([fx, fy, rot]) => {
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(rot);
        ctx.fillStyle = leafCol;
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.4, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = edgeCol;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-3.2, 0);
        ctx.lineTo(3.2, 0);
        ctx.stroke();
        ctx.restore();
      });
    }

    // ── Ambient light wash over the whole tile (per-season tint) ──
    if (p.lightAmt > 0.001) {
      ctx.globalAlpha = 1;
      const lg = ctx.createRadialGradient(-10, -14, 2, -10, -14, 46);
      lg.addColorStop(0, rgba(p.light, 0.2 * p.lightAmt));
      lg.addColorStop(1, rgba(p.light, 0.05 * p.lightAmt));
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

// An asymmetric anticipation→peak→settle curve, 0 at q=0 and q=1.
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
  // ~0.17 rad lean → leaf-tip arm ≈ (BEET_PIVOT_Y - (-23.5)) ≈ 39 px gives a
  // generous ~10-12 px sway at the tip.
  const qC = actionQ(t, 6.0, 0.9, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC); // 0..1..0, zero at edges
    const rock = Math.sin(qC * Math.PI * 3); // 1.5 rocks within the window
    pose.lean += 0.16 * env * rock;
    // little squat at the base as it rocks (settle weight side to side)
    pose.squashY += -0.06 * hump(qC);
    pose.squashX += 0.05 * hump(qC);
    // faint windup tilt — keeps anticipate() in the seamless toolkit.
    pose.lean += 0.02 * anticipate(qC);
  }

  // ── RARE SPECIAL: squash-stretch BOUNCE hop (~18s, win 1.1s) ──
  // Anticipation crouch → stretch up ~12-14px → squash landing → settle.
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
    pose.squashY += air * 0.20 - crouch * 0.12 - land * 0.16;
    pose.squashX += -air * 0.14 + crouch * 0.10 + land * 0.14;
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
          [-9, 0.0, 1.0], [6, 0.4, 0.9], [12, 0.7, 0.8], [-3, 0.25, 0.9],
        ];
        ctx.fillStyle = "#ffffff";
        seeds.forEach(([fx, phase, r]) => {
          const prog = ((tt / 3.4 + phase) % 1 + 1) % 1;
          const fy = -22 + prog * 40;
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
      // Summer: no extra dressing — the bounce + glossy crimson is the show.
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
