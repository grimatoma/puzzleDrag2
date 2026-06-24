// BOLD seasonal art for the PEAR fruit tile (`tile_fruit_pear`).
//
// ONE pear — the classic silhouette: a rounded bulbous bottom narrowing to a
// slimmer neck, a short brown stem on top with one small leaf beside it,
// resting low on a grassy ground pad. The SAME pear every season (identity-
// safe); only the skin colour, surface dressing (blush, gloss, freckles),
// frost/snow, and the pad's grass/snow/blossom/leaf dressing change — but the
// seasons swing HARD and the idle is LOUD rather than subtle:
//
//   IDLE COMMON  (~6s, win ~1.1s): a slow graceful PENDULUM sway — the bottom-
//       heavy pear rocks like a weighted toy out to one side, through centre, to
//       the other, and rights itself. Zero velocity at the window edges (seamless).
//   IDLE SPECIAL (~18s, win ~1.6s): a BIG deep pendulum swing — a grand slow sway
//       that nearly tips the pear to one side, swings through to the other, and
//       settles upright. A top-heavy pendulum, NOT a hop (the pear shape begs for it).
//
// Architecture mirrors pepper.bold.ts: a single parameterized `paint(ctx, p,
// pose)` where `interface P` holds tweenable season params (colours + prop
// amounts) and `pose` holds the idle gesture (bob / lean / squash). Because
// every season is the same paint with tweened P, transitions are seamless:
//   transition(0) ≡ draw(from), transition(1) ≡ draw(to).
// REST pose has all zeros, so draw(season) = paint(ctx, SP[season], REST) and
// the idle's pose is 0 at every action-window edge → seamless loop.
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
  skinTop: RGB;          // skin highlight tint (upper-left lit cheek)
  skinMid: RGB;          // skin body tint
  skinBot: RGB;          // skin shadow tint (lower-right)
  outline: RGB;          // soft outline tint
  leaf: RGB;             // leaf body colour
  padGrass: RGB;         // ground pad top colour
  padGrassDark: RGB;     // ground pad shaded underside
  soil: RGB;             // soil ring under the pad
  light: RGB;            // ambient light wash tint
  lightAmt: number;      // 0..1 strength of the light wash
  shadowAmt: number;     // 0..1 contact-shadow strength
  ripeness: number;      // 0..1 (affects pear scale / fullness)
  gloss: number;         // 0..1 specular highlight strength
  blush: number;         // 0..1 warm cheek blush
  freckleAmt: number;    // 0..1 faint skin freckles
  frostAmt: number;      // 0..1 cool frost dusting over skin
  snowCapAmt: number;    // 0..1 snow on shoulder / stem
  padSnowAmt: number;    // 0..1 snow blanket on the pad
  blossomAmt: number;    // 0..1 pale blossom petals on the pad
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad
}

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number;     // vertical offset in design px (negative = up)
  lean: number;    // top-of-pear sway, radians (rock side to side)
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
    skinTop: lerpRGB(a.skinTop, b.skinTop, t),
    skinMid: lerpRGB(a.skinMid, b.skinMid, t),
    skinBot: lerpRGB(a.skinBot, b.skinBot, t),
    outline: lerpRGB(a.outline, b.outline, t),
    leaf: lerpRGB(a.leaf, b.leaf, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padGrassDark: lerpRGB(a.padGrassDark, b.padGrassDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    shadowAmt: lerp(a.shadowAmt, b.shadowAmt, t),
    ripeness: lerp(a.ripeness, b.ripeness, t),
    gloss: lerp(a.gloss, b.gloss, t),
    blush: lerp(a.blush, b.blush, t),
    freckleAmt: lerp(a.freckleAmt, b.freckleAmt, t),
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
    shadowAmt: clamp01(p.shadowAmt),
    ripeness: clamp01(p.ripeness),
    gloss: clamp01(p.gloss),
    blush: clamp01(p.blush),
    freckleAmt: clamp01(p.freckleAmt),
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

// A deterministic pseudo-random in [0,1) from an integer seed — for scattering
// freckles / petals / leaves in stable, non-animated positions.
const rand = (n: number): number => {
  const s = Math.sin(n * 127.1 + 0.5) * 43758.5453;
  return s - Math.floor(s);
};

// Shift an RGB toward dark/light by a flat delta (clamped). Used for leaf rib.
function from3(c: RGB, d: number): RGB {
  return [
    Math.max(0, Math.min(255, c[0] + d)),
    Math.max(0, Math.min(255, c[1] + d)),
    Math.max(0, Math.min(255, c[2] + d)),
  ];
}

// ── Per-season params — pushed HARD ──────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — small GREEN unripe pear, matte; bright dewy lime pad + blossom.
  Spring: {
    skinTop: [186, 226, 122],
    skinMid: [134, 192, 78],
    skinBot: [80, 134, 48],
    outline: [48, 88, 34],
    leaf: [120, 200, 86],
    padGrass: [134, 214, 92],
    padGrassDark: [80, 156, 66],
    soil: [120, 90, 54],
    light: [232, 250, 220],
    lightAmt: 0.5,
    shadowAmt: 0.35,
    ripeness: 0.2,
    gloss: 0.1,
    blush: 0.0,
    freckleAmt: 0.0,
    frostAmt: 0.0,
    snowCapAmt: 0.0,
    padSnowAmt: 0.0,
    blossomAmt: 1.0,
    fallenLeafAmt: 0.0,
  },
  // Summer — PEAK: ripe yellow-green, glossy, warm blush; saturated pad.
  Summer: {
    skinTop: [238, 234, 132],
    skinMid: [200, 212, 92],
    skinBot: [138, 158, 52],
    outline: [80, 96, 34],
    leaf: [86, 168, 64],
    padGrass: [100, 184, 78],
    padGrassDark: [58, 130, 54],
    soil: [110, 82, 48],
    light: [255, 248, 210],
    lightAmt: 0.66,
    shadowAmt: 0.55,
    ripeness: 1.0,
    gloss: 0.85,
    blush: 0.7,
    freckleAmt: 0.0,
    frostAmt: 0.0,
    snowCapAmt: 0.0,
    padSnowAmt: 0.0,
    blossomAmt: 0.0,
    fallenLeafAmt: 0.0,
  },
  // Autumn — GOLDEN-ripe warm amber, freckles; leaf turning amber, olive pad,
  // a fallen leaf on the pad.
  Autumn: {
    skinTop: [248, 208, 110],
    skinMid: [228, 158, 56],
    skinBot: [162, 98, 30],
    outline: [98, 58, 20],
    leaf: [214, 150, 52],
    padGrass: [156, 152, 82],
    padGrassDark: [108, 102, 58],
    soil: [108, 78, 44],
    light: [252, 222, 162],
    lightAmt: 0.46,
    shadowAmt: 0.42,
    ripeness: 0.9,
    gloss: 0.22,
    blush: 0.32,
    freckleAmt: 0.75,
    frostAmt: 0.0,
    snowCapAmt: 0.0,
    padSnowAmt: 0.0,
    blossomAmt: 0.0,
    fallenLeafAmt: 1.0,
  },
  // Winter — frost-dusted pale pear (still clearly a pear), a bold SNOW CAP on
  // top + a snow blanket at the base; cool blue-grey light.
  Winter: {
    skinTop: [214, 216, 192],
    skinMid: [182, 184, 158],
    skinBot: [130, 136, 122],
    outline: [78, 84, 88],
    leaf: [150, 160, 142],
    padGrass: [188, 206, 220],
    padGrassDark: [134, 162, 184],
    soil: [122, 112, 104],
    light: [206, 226, 252],
    lightAmt: 0.5,
    shadowAmt: 0.3,
    ripeness: 0.75,
    gloss: 0.18,
    blush: 0.0,
    freckleAmt: 0.0,
    frostAmt: 0.78,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0.0,
    fallenLeafAmt: 0.0,
  },
};

// ── The pear silhouette ──────────────────────────────────────────────────────
// One reusable path so the OUTLINE is byte-identical every season. The pear sits
// low on the pad: bulbous bottom around y≈+18, neck narrowing up to y≈−11.
// `s` only nudges fullness with ripeness; the shape is the same object.

const PEAR_TOP = -11;    // top of the neck
const PEAR_PIVOT_Y = 17; // rock/lean about a point near the base (base ≈ +18)

function pearPath(ctx: CanvasRenderingContext2D, s: number): void {
  // Drawn clockwise from the top of the neck. Coordinates picked to read as the
  // classic pear: narrow rounded top, swelling lower belly, widest near +9.
  const topX = 0;
  const topY = PEAR_TOP * s;
  ctx.beginPath();
  ctx.moveTo(topX, topY);
  // right side of the neck flaring out into the belly
  ctx.bezierCurveTo(5.5 * s, -9 * s, 6.5 * s, -2 * s, 8.0 * s, 4 * s);
  ctx.bezierCurveTo(10.5 * s, 9 * s, 9.5 * s, 17 * s, 0, 18 * s);
  // left side mirrored back up to the top
  ctx.bezierCurveTo(-9.5 * s, 17 * s, -10.5 * s, 9 * s, -8.0 * s, 4 * s);
  ctx.bezierCurveTo(-6.5 * s, -2 * s, -5.5 * s, -9 * s, topX, topY);
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
  const s = 0.92 + p.ripeness * 0.12; // fullness nudge only

  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Ground pad (does NOT move with the pose) ─────────────────────────────
    // Soft contact shadow, lower-right.
    ctx.fillStyle = rgba([0, 0, 0], 0.1 + p.shadowAmt * 0.16);
    ctx.beginPath();
    ctx.ellipse(3, 21, 15, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Soil ring (shaded underside) peeking below the grass.
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, 20, 18, 5.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Grass top — flat low ellipse with a tufted edge.
    const padGrad = ctx.createLinearGradient(0, 15, 0, 23);
    padGrad.addColorStop(0, rgb(p.padGrass));
    padGrad.addColorStop(1, rgb(p.padGrassDark));
    ctx.fillStyle = padGrad;
    ctx.beginPath();
    ctx.ellipse(0, 18.5, 18, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tufted grass-blade fringe along the top arc of the pad.
    ctx.strokeStyle = rgb(p.padGrass);
    ctx.lineWidth = 1.3;
    ctx.lineCap = "round";
    for (let i = 0; i < 11; i++) {
      const tx = -16 + i * 3.2;
      const ty = 15.4 + Math.abs(tx) * 0.06;
      ctx.beginPath();
      ctx.moveTo(tx, ty + 1.4);
      ctx.lineTo(tx + (i % 2 ? 1.1 : -1.1), ty - 2.2);
      ctx.stroke();
    }
    ctx.lineCap = "round";

    // Spring blossom petals scattered on the pad (pale, tiny).
    if (p.blossomAmt > 0.01) {
      const a = p.blossomAmt;
      const spots: Array<[number, number]> = [[-13, 18.5], [12, 17.8], [-4, 21], [6, 20]];
      spots.forEach(([bx, by], idx) => {
        ctx.fillStyle = rgba(idx === 1 ? [255, 232, 246] : [255, 248, 252], 0.95 * a);
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

    // Autumn fallen leaves resting on the pad.
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const leaves: Array<[number, number, number, RGB]> = [
        [-11, 19, -0.5, [206, 124, 38]],
        [10, 20.5, 0.7, [182, 84, 28]],
      ];
      leaves.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgba(col, a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.5, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba([100, 56, 16], 0.85 * a);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-3.2, 0);
        ctx.lineTo(3.2, 0);
        ctx.stroke();
        ctx.restore();
      });
    }

    // Winter snow blanket over the pad.
    if (p.padSnowAmt > 0.01) {
      const a = p.padSnowAmt;
      ctx.fillStyle = rgba([238, 245, 252], 0.55 + 0.4 * a);
      ctx.beginPath();
      ctx.ellipse(0, 18, 17 * a + 4, 4.6 * a + 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([210, 226, 244], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(2, 20, 16, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      // frost sparkle specks
      for (let i = 0; i < 6; i++) {
        const sx = -14 + rand(i + 31) * 28;
        const sy = 16.5 + rand(i + 41) * 4;
        ctx.fillStyle = rgba([255, 255, 255], a * (0.4 + rand(i + 51) * 0.5));
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Contact shadow under the pear (follows the bob/lean for grounding) ────
    const tipShift = pose.lean * (PEAR_PIVOT_Y - PEAR_TOP); // how far the tip leans
    const shadowSpread = 1 + clamp01(pose.bob < 0 ? -pose.bob / 14 : 0) * 0.5;
    ctx.fillStyle = rgba([0, 0, 0], 0.12 + p.shadowAmt * 0.14);
    ctx.beginPath();
    ctx.ellipse(2.5 + tipShift * 0.2, 17.5, 9 * s * shadowSpread, 3.1 / shadowSpread, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the pear, under the idle pose transform ─────────────────────
    ctx.save();
    // Pivot near the base so lean rocks the neck side-to-side and squash anchors
    // at the base (it "sits" on the pad). bob raises the whole body.
    ctx.translate(0, PEAR_PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(0, -PEAR_PIVOT_Y);

    // Stem — short brown, leaning slightly right, drawn before the body's
    // upper edge so the body laps over its base.
    ctx.strokeStyle = rgb([96, 64, 30]);
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0.5 * s, -10 * s);
    ctx.quadraticCurveTo(1.6 * s, -14 * s, 2.6 * s, -16.5 * s);
    ctx.stroke();
    ctx.strokeStyle = rgb([138, 96, 50]);
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0.5 * s, -10 * s);
    ctx.quadraticCurveTo(1.6 * s, -14 * s, 2.6 * s, -16.5 * s);
    ctx.stroke();

    // One small leaf beside the stem (upper-left), body colour from P.
    ctx.save();
    ctx.translate(-1.5 * s, -13.5 * s);
    ctx.rotate(-0.5);
    ctx.fillStyle = rgb(p.leaf);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-5.5 * s, -1.5 * s, -8 * s, -5.5 * s);
    ctx.quadraticCurveTo(-3.5 * s, -3 * s, 0, 0);
    ctx.closePath();
    ctx.fill();
    // leaf midrib + dark outline
    ctx.strokeStyle = rgb(from3(p.leaf, -50));
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-4 * s, -2.4 * s, -7 * s, -5 * s);
    ctx.stroke();
    ctx.restore();

    // Body — dark outline pass first (house idiom: layered dark-then-light).
    ctx.save();
    pearPath(ctx, s);
    ctx.fillStyle = rgb(p.outline);
    ctx.shadowColor = "transparent";
    ctx.fill();
    ctx.restore();

    // Body fill — vertical-ish gradient lit upper-left → shaded lower-right,
    // inset slightly so the dark outline reads as a thin rim.
    ctx.save();
    pearPath(ctx, s * 0.93);
    ctx.clip();
    const bodyGrad = ctx.createLinearGradient(-7 * s, -10 * s, 8 * s, 16 * s);
    bodyGrad.addColorStop(0, rgb(p.skinTop));
    bodyGrad.addColorStop(0.5, rgb(p.skinMid));
    bodyGrad.addColorStop(1, rgb(p.skinBot));
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(-14, -20, 28, 42);

    // Warm cheek blush on the lower-left belly (summer/autumn).
    if (p.blush > 0.01) {
      const bg = ctx.createRadialGradient(-4 * s, 8 * s, 1, -4 * s, 8 * s, 8 * s);
      bg.addColorStop(0, rgba([240, 120, 96], p.blush * 0.55));
      bg.addColorStop(1, rgba([240, 120, 96], 0));
      ctx.fillStyle = bg;
      ctx.fillRect(-14, -20, 28, 42);
    }

    // Faint freckles (autumn).
    if (p.freckleAmt > 0.01) {
      for (let i = 0; i < 8; i++) {
        const fx = -5 + rand(i + 61) * 10;
        const fy = 0 + rand(i + 71) * 14;
        ctx.fillStyle = rgba([150, 96, 30], p.freckleAmt * 0.5);
        ctx.beginPath();
        ctx.arc(fx * s, fy * s - 4, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Specular gloss highlight on the upper-left shoulder.
    if (p.gloss > 0.01) {
      ctx.fillStyle = rgba([255, 255, 255], p.gloss * 0.6);
      ctx.beginPath();
      ctx.ellipse(-4 * s, -3 * s, 2.2 * s, 4.2 * s, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([255, 255, 255], p.gloss * 0.35);
      ctx.beginPath();
      ctx.ellipse(-5.4 * s, 4 * s, 1.0, 2.2, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cool frost dusting over the skin (winter) — fruit still clearly visible.
    if (p.frostAmt > 0.01) {
      ctx.fillStyle = rgba([214, 230, 244], p.frostAmt * 0.4);
      ctx.fillRect(-14, -20, 28, 42);
      for (let i = 0; i < 10; i++) {
        const fx = -7 + rand(i + 81) * 14;
        const fy = -8 + rand(i + 91) * 24;
        ctx.fillStyle = rgba([255, 255, 255], p.frostAmt * (0.3 + rand(i + 101) * 0.4));
        ctx.beginPath();
        ctx.arc(fx * s, fy * s, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore(); // end body clip

    // Snow cap on the shoulder / stem (winter), drawn over the skin.
    if (p.snowCapAmt > 0.01) {
      const a = p.snowCapAmt;
      ctx.save();
      pearPath(ctx, s * 0.93);
      ctx.clip();
      ctx.fillStyle = rgba([244, 249, 255], 0.9);
      ctx.beginPath();
      ctx.ellipse(-1 * s, -8 * s, 6.5 * s * a + 1, 3.2 * a + 0.6, -0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(-1 * s, -6.4 * s, 6.0 * s * a + 0.8, 1.6, -0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // little snow dab on the stem top
      ctx.fillStyle = rgba([248, 251, 255], 0.9);
      ctx.beginPath();
      ctx.arc(2.6 * s, -16.5 * s, 1.6 * a + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // end pose transform

    // ── Ambient light wash over the whole tile (per-season tint) ─────────────
    if (p.lightAmt > 0.001) {
      ctx.globalAlpha = 1;
      const lg = ctx.createRadialGradient(-10, -14, 2, -10, -14, 46);
      lg.addColorStop(0, rgba(p.light, p.lightAmt * 0.32));
      lg.addColorStop(1, rgba(p.light, p.lightAmt * 0.08));
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
// sin^2(pi q) → smooth in/out, peak at q=0.5.
function hump(q: number): number {
  const s = Math.sin(Math.PI * q);
  return s * s;
}

/** Build the idle pose from the wall clock. Two tiers, both PENDULUM sways (the
 *  pear is bottom-heavy and rocks like a weighted toy — never a hop):
 *    common a slow graceful sway every ~6s (win 1.1s),
 *    rare   a big deep swing every ~18s (win 1.6s).
 *  Each is the product of two factors that are BOTH zero at the window edges, so
 *  the pose returns to REST with zero value AND zero velocity (seamless loop). */
function poseFromClock(t: number): Pose {
  const pose: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0 };

  // ── COMMON: a slow, graceful PENDULUM sway (~6s, win 1.1s) ──
  // Out to one side, through centre, to the other, and settle. Slower + more
  // graceful than a nervous wobble; pivots near the base so the neck arcs.
  const qC = actionQ(t, 6.0, 1.1, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC); // 0..1..0 envelope
    const swing = Math.sin(qC * Math.PI * 2); // one full L→centre→R→centre swing
    pose.lean += 0.17 * env * swing;
    // weight settles into the round base as it leans (tiny squat, 0 at edges)
    pose.squashY += -0.045 * hump(qC);
    pose.squashX += 0.04 * hump(qC);
  }

  // ── RARE: a BIG deep pendulum swing (~18s, win 1.6s) — NOT a hop ──
  // A grand slow sway: the top-heavy neck describes a wide arc to one side,
  // swings through to the other, and the pear rights itself.
  const qS = actionQ(t, 18.0, 1.6, 3.0); // phase 3s so it never overlaps the common
  if (qS >= 0) {
    const env = Math.sin(Math.PI * qS); // 0..1..0 overall envelope
    const swing = Math.sin(qS * Math.PI * 2); // one big L→R swing
    pose.lean += 0.30 * env * swing;
    // a small pendulum rise off the low side at the apex of each lean, then
    // settle (a roll on the round bottom — not a jump). Zero at the edges.
    pose.bob += -1.6 * hump(qS) * Math.abs(swing);
    pose.squashY += -0.05 * hump(qS);
    pose.squashX += 0.05 * hump(qS);
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
        ctx.fillStyle = "rgba(208,150,52,1)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.4, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      // Summer: no extra dressing — the slow pendulum sway + glossy pear is the show.
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
