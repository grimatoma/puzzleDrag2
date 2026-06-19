// Seasonal art for the PEAR fruit tile (`tile_fruit_pear`).
//
// ONE pear — the classic silhouette: a rounded bulbous bottom narrowing to a
// slimmer neck, a short brown stem on top with one small leaf beside it,
// resting low on a grassy ground pad. The SAME pear every season; only the
// skin colour, surface dressing (blush, gloss, freckles), frost/snow, and the
// pad's grass/snow/blossom/leaf dressing change.
//
// Architecture (mandatory): a single parameterized `paint(ctx, p, bob)` draws
// the whole tile from a tweenable param set `P`. Four season param sets live in
// `SP`. `draw` paints a rest still; `anim` paints a seamless breathing bob plus
// additive per-season micro-motion; `transition` lerps EVERY field of `P`
// between neighbouring seasons through a smootherstep ramp, so transition(0)
// reads exactly as the FROM still and transition(1) exactly as the TO still —
// no snap. Origin-centered in the −24..+24 design box. Pure ctx; never throws.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import type { SeasonName } from "../types.js";

// ── Tweenable params ─────────────────────────────────────────────────────────
// Every value that differs between seasons. Colours as [r,g,b]; the rest are
// scalars (mostly 0..1). NO booleans / season strings inside paint.

type RGB = [number, number, number];

interface P {
  skinTop: RGB; // skin highlight tint (upper-left lit cheek)
  skinMid: RGB; // skin body tint
  skinBot: RGB; // skin shadow tint (lower-right)
  outline: RGB; // soft outline tint
  leaf: RGB; // leaf body colour
  padGrass: RGB; // ground pad top colour
  padGrassDark: RGB; // ground pad shaded underside
  soil: RGB; // soil ring under the pad
  light: RGB; // ambient light wash tint
  lightAmt: number; // 0..1 strength of the light wash
  shadowAmt: number; // 0..1 contact-shadow strength
  ripeness: number; // 0..1 (affects pear scale / fullness)
  gloss: number; // 0..1 specular highlight strength
  blush: number; // 0..1 warm cheek blush
  freckleAmt: number; // 0..1 faint skin freckles
  frostAmt: number; // 0..1 cool frost dusting over skin
  snowCapAmt: number; // 0..1 snow on shoulder / stem
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 pale blossom petals on the pad
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad
}

// ── Small helpers ────────────────────────────────────────────────────────────

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
const rgb = (c: RGB, a = 1): string =>
  `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const lerpRGB = (a: RGB, b: RGB, t: number): RGB => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

// Quintic smootherstep — zero velocity at both ends, so transitions ease in/out.
const smoother = (x: number): number => x * x * x * (x * (6 * x - 15) + 10);

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

// A deterministic pseudo-random in [0,1) from an integer seed — for scattering
// freckles / petals / leaves in stable, non-animated positions.
const rand = (n: number): number => {
  const s = Math.sin(n * 127.1 + 0.5) * 43758.5453;
  return s - Math.floor(s);
};

// ── The pear silhouette ──────────────────────────────────────────────────────
// One reusable path so the OUTLINE is byte-identical every season. The pear sits
// low on the pad: bulbous bottom around y≈+10, neck narrowing up to y≈−10.
// `scale` only nudges fullness with ripeness; the shape is the same object.

function pearPath(ctx: CanvasRenderingContext2D, s: number): void {
  // Drawn clockwise from the top of the neck. Coordinates picked to read as the
  // classic pear: narrow rounded top, swelling lower belly, widest near +9.
  const topX = 0;
  const topY = -11 * s;
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

// ── The single parameterized paint ──────────────────────────────────────────

function paint(ctx: CanvasRenderingContext2D, pp: P, bob: number): void {
  // Defensive clamp on every scalar so a wild `p`/`t` can never explode a path.
  const p: P = {
    ...pp,
    lightAmt: clamp01(pp.lightAmt),
    shadowAmt: clamp01(pp.shadowAmt),
    ripeness: clamp01(pp.ripeness),
    gloss: clamp01(pp.gloss),
    blush: clamp01(pp.blush),
    freckleAmt: clamp01(pp.freckleAmt),
    frostAmt: clamp01(pp.frostAmt),
    snowCapAmt: clamp01(pp.snowCapAmt),
    padSnowAmt: clamp01(pp.padSnowAmt),
    blossomAmt: clamp01(pp.blossomAmt),
    fallenLeafAmt: clamp01(pp.fallenLeafAmt),
  };
  const s = 0.92 + p.ripeness * 0.12; // fullness nudge only

  ctx.save();

  // ── Ground pad ────────────────────────────────────────────────────────────
  // Soft contact shadow, lower-right.
  ctx.fillStyle = rgb([0, 0, 0], 0.1 + p.shadowAmt * 0.16);
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
  ctx.lineCap = "butt";

  // Spring blossom petals scattered on the pad (pale, tiny).
  if (p.blossomAmt > 0.01) {
    for (let i = 0; i < 5; i++) {
      const bx = -13 + rand(i + 1) * 26;
      const by = 17 + rand(i + 21) * 4;
      ctx.fillStyle = rgb([255, 244, 250], p.blossomAmt * 0.85);
      ctx.beginPath();
      ctx.ellipse(bx, by, 1.7, 1.2, rand(i + 7) * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgb([255, 214, 230], p.blossomAmt * 0.7);
      ctx.beginPath();
      ctx.arc(bx, by, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Autumn fallen leaves resting on the pad.
  if (p.fallenLeafAmt > 0.01) {
    const leaves: Array<[number, number, number, RGB]> = [
      [-11, 19, -0.5, [196, 120, 36]],
      [9, 20.5, 0.7, [176, 92, 28]],
    ];
    leaves.forEach(([lx, ly, rot, col]) => {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.fillStyle = rgb(col, p.fallenLeafAmt);
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.4, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgb([110, 64, 18], p.fallenLeafAmt * 0.8);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.lineTo(3, 0);
      ctx.stroke();
      ctx.restore();
    });
  }

  // Winter snow blanket over the pad.
  if (p.padSnowAmt > 0.01) {
    ctx.fillStyle = rgb([238, 245, 252], 0.55 + p.padSnowAmt * 0.4);
    ctx.beginPath();
    ctx.ellipse(0, 18, 17 * p.padSnowAmt + 4, 4.6 * p.padSnowAmt + 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // frost sparkle specks
    for (let i = 0; i < 6; i++) {
      const sx = -14 + rand(i + 31) * 28;
      const sy = 16.5 + rand(i + 41) * 4;
      ctx.fillStyle = rgb([255, 255, 255], p.padSnowAmt * (0.4 + rand(i + 51) * 0.5));
      ctx.beginPath();
      ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── The pear ───────────────────────────────────────────────────────────────
  // `bob` lifts the whole fruit; rest at bob=0. Centre the body lower on the pad.
  const cy = -2 + bob; // body centre offset; sits low so bottom rests near pad
  ctx.save();
  ctx.translate(0, cy);

  // Soft cast shadow of the fruit on the grass (under the belly, lower-right).
  ctx.save();
  ctx.translate(0, -cy); // shadow stays glued to the pad, not the lifted fruit
  ctx.fillStyle = rgb([0, 0, 0], 0.12 + p.shadowAmt * 0.14);
  ctx.beginPath();
  ctx.ellipse(2.5, 17.5, 9 * s, 3.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

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
  ctx.lineCap = "butt";

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
  ctx.strokeStyle = rgb([from3(p.leaf, -50)[0], from3(p.leaf, -50)[1], from3(p.leaf, -50)[2]]);
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
    bg.addColorStop(0, rgb([240, 120, 96], p.blush * 0.55));
    bg.addColorStop(1, rgb([240, 120, 96], 0));
    ctx.fillStyle = bg;
    ctx.fillRect(-14, -20, 28, 42);
  }

  // Faint freckles (autumn).
  if (p.freckleAmt > 0.01) {
    for (let i = 0; i < 8; i++) {
      const fx = -5 + rand(i + 61) * 10;
      const fy = 0 + rand(i + 71) * 14;
      ctx.fillStyle = rgb([150, 96, 30], p.freckleAmt * 0.5);
      ctx.beginPath();
      ctx.arc(fx * s, fy * s - 4, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Specular gloss highlight on the upper-left shoulder.
  if (p.gloss > 0.01) {
    ctx.fillStyle = rgb([255, 255, 255], p.gloss * 0.6);
    ctx.beginPath();
    ctx.ellipse(-4 * s, -3 * s, 2.2 * s, 4.2 * s, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb([255, 255, 255], p.gloss * 0.35);
    ctx.beginPath();
    ctx.ellipse(-5.4 * s, 4 * s, 1.0, 2.2, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cool frost dusting over the skin (winter) — fruit still clearly visible.
  if (p.frostAmt > 0.01) {
    ctx.fillStyle = rgb([214, 230, 244], p.frostAmt * 0.4);
    ctx.fillRect(-14, -20, 28, 42);
    for (let i = 0; i < 10; i++) {
      const fx = -7 + rand(i + 81) * 14;
      const fy = -8 + rand(i + 91) * 24;
      ctx.fillStyle = rgb([255, 255, 255], p.frostAmt * (0.3 + rand(i + 101) * 0.4));
      ctx.beginPath();
      ctx.arc(fx * s, fy * s, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore(); // end body clip

  // Snow cap on the shoulder / stem (winter), drawn over the skin.
  if (p.snowCapAmt > 0.01) {
    ctx.fillStyle = rgb([244, 249, 255], 0.85);
    ctx.save();
    pearPath(ctx, s * 0.93);
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse(-1 * s, -8 * s, 6.5 * s * p.snowCapAmt + 1, 3.2 * p.snowCapAmt + 0.6, -0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // little snow dab on the stem top
    ctx.fillStyle = rgb([248, 251, 255], 0.9);
    ctx.beginPath();
    ctx.arc(2.6 * s, -16.5 * s, 1.6 * p.snowCapAmt + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore(); // end fruit translate
  ctx.restore(); // end paint save
  ctx.globalAlpha = 1;
}

// Shift an RGB toward dark/light by a flat delta (clamped). Used for leaf rib.
function from3(c: RGB, d: number): RGB {
  return [
    Math.max(0, Math.min(255, c[0] + d)),
    Math.max(0, Math.min(255, c[1] + d)),
    Math.max(0, Math.min(255, c[2] + d)),
  ];
}

// ── Season param sets ────────────────────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — small-ish, green unripe, matte; bright dewy lime pad + blossom.
  Spring: {
    skinTop: [178, 214, 120],
    skinMid: [138, 184, 84],
    skinBot: [92, 134, 54],
    outline: [58, 92, 38],
    leaf: [120, 196, 86],
    padGrass: [134, 206, 96],
    padGrassDark: [86, 156, 70],
    soil: [120, 92, 56],
    light: [236, 248, 224],
    lightAmt: 0.5,
    shadowAmt: 0.35,
    ripeness: 0.25,
    gloss: 0.1,
    blush: 0.0,
    freckleAmt: 0.0,
    frostAmt: 0.0,
    snowCapAmt: 0.0,
    padSnowAmt: 0.0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0.0,
  },
  // Summer — PEAK: ripe yellow-green, warm blush, gentle gloss; saturated pad.
  Summer: {
    skinTop: [232, 230, 138],
    skinMid: [196, 206, 96],
    skinBot: [142, 158, 58],
    outline: [86, 96, 36],
    leaf: [86, 162, 64],
    padGrass: [104, 178, 78],
    padGrassDark: [64, 130, 56],
    soil: [110, 82, 48],
    light: [255, 248, 214],
    lightAmt: 0.65,
    shadowAmt: 0.55,
    ripeness: 1.0,
    gloss: 0.55,
    blush: 0.7,
    freckleAmt: 0.0,
    frostAmt: 0.0,
    snowCapAmt: 0.0,
    padSnowAmt: 0.0,
    blossomAmt: 0.0,
    fallenLeafAmt: 0.0,
  },
  // Autumn — golden-ripe warm amber, faint freckles; leaf turning, olive-tan pad.
  Autumn: {
    skinTop: [244, 206, 116],
    skinMid: [224, 162, 64],
    skinBot: [166, 104, 34],
    outline: [104, 64, 22],
    leaf: [196, 138, 52],
    padGrass: [150, 150, 84],
    padGrassDark: [108, 104, 60],
    soil: [108, 78, 44],
    light: [250, 224, 168],
    lightAmt: 0.45,
    shadowAmt: 0.42,
    ripeness: 0.9,
    gloss: 0.2,
    blush: 0.3,
    freckleAmt: 0.7,
    frostAmt: 0.0,
    snowCapAmt: 0.0,
    padSnowAmt: 0.0,
    blossomAmt: 0.0,
    fallenLeafAmt: 0.8,
  },
  // Winter — pale frost dusting (cool), fruit visible; snow cap + pad snow.
  Winter: {
    skinTop: [214, 214, 188],
    skinMid: [184, 184, 156],
    skinBot: [134, 138, 124],
    outline: [86, 90, 92],
    leaf: [150, 158, 140],
    padGrass: [196, 210, 218],
    padGrassDark: [150, 170, 186],
    soil: [120, 110, 102],
    light: [222, 234, 248],
    lightAmt: 0.5,
    shadowAmt: 0.3,
    ripeness: 0.75,
    gloss: 0.18,
    blush: 0.0,
    freckleAmt: 0.0,
    frostAmt: 0.7,
    snowCapAmt: 0.8,
    padSnowAmt: 0.85,
    blossomAmt: 0.0,
    fallenLeafAmt: 0.0,
  },
};

// ── Idle bob ─────────────────────────────────────────────────────────────────
// bobAt(0) === 0 with zero velocity (1 − cos starts flat), seamless over 2π/w.

const BOB_W = 1.5; // rad/s
const BOB_A = 1.1; // px amplitude
const bobAt = (t: number): number => -BOB_A * (1 - Math.cos(BOB_W * t)) * 0.5;

// ── Per-season micro-motion (additive; may be nonzero at t=0) ─────────────────

// Summer: a soft specular glint travels along the skin.
function summerGlint(ctx: CanvasRenderingContext2D, t: number, bob: number): void {
  const prog = (t * 0.35) % 1; // 0..1 seamless via fractional part
  const gx = -5 + prog * 9;
  const gy = -8 + prog * 18 + bob;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "rgba(255,255,240,0.5)";
  ctx.beginPath();
  ctx.ellipse(gx, gy, 1.8, 3.4, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

// Autumn: the leaf flutters (small extra rotation overlay near the stem).
function autumnLeafFlutter(ctx: CanvasRenderingContext2D, t: number, bob: number): void {
  const flut = Math.sin(t * 2.6) * 0.16 + Math.sin(t * 4.1) * 0.06;
  ctx.save();
  ctx.translate(-1.5, -15.5 + bob);
  ctx.rotate(-0.5 + flut);
  ctx.fillStyle = rgb([210, 150, 58], 0.85);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-5, -1.4, -7.4, -5.2);
  ctx.quadraticCurveTo(-3.2, -2.8, 0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

// Winter: a couple of drifting snowflakes + a faint cold sheen.
function winterSnow(ctx: CanvasRenderingContext2D, t: number): void {
  const seeds: Array<[number, number, number]> = [
    [-7, 0.0, 0.7],
    [6, 0.5, 0.6],
    [1, 0.25, 0.55],
  ];
  ctx.save();
  seeds.forEach(([fx, phase, r]) => {
    const prog = ((t / 3.6 + phase) % 1 + 1) % 1;
    const fy = -20 + prog * 40;
    const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
    ctx.fillStyle = rgb([255, 255, 255], 0.5 + 0.4 * Math.sin(prog * Math.PI));
    ctx.beginPath();
    ctx.arc(dx, fy, r, 0, Math.PI * 2);
    ctx.fill();
  });
  // cold sheen pulse over the skin
  const sheen = 0.08 + 0.06 * (0.5 + 0.5 * Math.sin(t * 0.9));
  ctx.fillStyle = rgb([210, 228, 246], sheen);
  ctx.beginPath();
  ctx.ellipse(-3, 0, 6, 9, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

// Spring: faint dew shimmer near the lit shoulder.
function springDew(ctx: CanvasRenderingContext2D, t: number, bob: number): void {
  const sh = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.2));
  ctx.save();
  ctx.fillStyle = rgb([255, 255, 255], sh);
  ctx.beginPath();
  ctx.arc(-4.5, -2 + bob, 1.0 + sh, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ── Public draw / anim builders ──────────────────────────────────────────────

const draw = (season: SeasonName) => (ctx: CanvasRenderingContext2D): void => {
  paint(ctx, SP[season], 0);
};

const anim = (season: SeasonName) => (ctx: CanvasRenderingContext2D, t: number): void => {
  const bob = bobAt(t);
  paint(ctx, SP[season], bob);
  // additive per-season micro-motion layered over the painted still
  if (season === "Spring") springDew(ctx, t, bob);
  else if (season === "Summer") summerGlint(ctx, t, bob);
  else if (season === "Autumn") autumnLeafFlutter(ctx, t, bob);
  else if (season === "Winter") winterSnow(ctx, t);
};

// ── Transitions: lerp EVERY field through smootherstep; ends on neighbour stills.

const springToSummer = (ctx: CanvasRenderingContext2D, pp: number): void => {
  const u = smoother(clamp01(pp));
  paint(ctx, lerpP(SP.Spring, SP.Summer, u), 0);
};
const summerToAutumn = (ctx: CanvasRenderingContext2D, pp: number): void => {
  const u = smoother(clamp01(pp));
  paint(ctx, lerpP(SP.Summer, SP.Autumn, u), 0);
};
const autumnToWinter = (ctx: CanvasRenderingContext2D, pp: number): void => {
  const u = smoother(clamp01(pp));
  paint(ctx, lerpP(SP.Autumn, SP.Winter, u), 0);
};

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
