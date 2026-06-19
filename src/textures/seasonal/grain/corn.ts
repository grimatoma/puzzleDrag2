// Seasonal art for the CORN farm tile (`tile_grain_corn`, category grain).
//
// Identity rule: the subject is ALWAYS a single upright corn COB standing on a
// turf pad — husk leaves wrapping the cob with a silk tuft on top. There is no
// stalk and no plant, just the iconic cob. Every season shares the SAME
// silhouette/outline; only colour + frost/snow + pad dressing change.
//
// Architecture: a single parameterized `paint(ctx, p, bob)` draws the whole
// tile from a tweenable parameter set `P`. The four seasons are four `P`
// values in `SP`. `draw` = paint at rest, `anim` = paint at a seamless idle
// bob plus additive per-season micro-motion, and each `transition` lerps every
// field of `P` between neighbouring seasons through a smoothstep so the morph
// starts exactly on the `from` still and ends exactly on the `to` still.
//
// Drawn origin-centered in the ~-24..+24 design box; the caller has already
// translated to the tile centre. Pure Canvas-2D vector art — no images, DOM,
// or libraries. Reads at ~64px.

import type {
  SeasonalTileEntry,
  SeasonalTransitionSet,
  SeasonName,
} from "../types.js";

// ── Tweenable parameter set ─────────────────────────────────────────────────
// EVERY value that differs between seasons lives here as a number or a number
// tuple so it can be interpolated. Colours are [r,g,b]; amounts are 0..1.

type RGB = [number, number, number];

interface P {
  // light / ground
  shadowAmt: number; // contact-shadow strength 0..1
  // pad
  padGrass: RGB; // turf disc top colour
  padGrassDark: RGB; // turf underside / shaded colour
  padSnowAmt: number; // 0..1 white snow cover over the pad
  blossomAmt: number; // 0..1 pale blossom resting on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad (autumn)
  // husk (the leaves wrapping the cob)
  huskLight: RGB; // lit husk colour
  huskDark: RGB; // shaded husk / outline tint
  huskBrownAmt: number; // 0..1 drying/browning at the husk edges (autumn)
  huskOpen: number; // 0..1 how far the husk peels open at the top/front
  // kernels (revealed through the open husk)
  kernel: RGB; // kernel face colour
  kernelDeep: RGB; // kernel shadow colour
  kernelDent: number; // 0..1 how dented/deep-gold the kernels look
  // silk tuft on top
  silk: RGB; // silk strand colour
  // outline
  outline: RGB; // soft dark outline tint
  // winter dressing
  frostAmt: number; // 0..1 frost dusting sparkle on upward surfaces
  snowCapAmt: number; // 0..1 snow cap sitting on top of the cob/husk
  // surface gloss / dew
  gloss: number; // 0..1 subtle sheen highlight on the cob
}

// ── Season parameter sets ───────────────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — fresh lightly-desaturated pastel; husk tight & fully closed,
  // fresh green, a little dew; bright lime dewy pad + a pale blossom.
  Spring: {
    shadowAmt: 0.5,
    padGrass: [142, 214, 96],
    padGrassDark: [86, 150, 60],
    padSnowAmt: 0,
    blossomAmt: 1,
    fallenLeafAmt: 0,
    huskLight: [126, 196, 92],
    huskDark: [62, 116, 50],
    huskBrownAmt: 0,
    huskOpen: 0,
    kernel: [232, 214, 120],
    kernelDeep: [190, 162, 80],
    kernelDent: 0,
    silk: [206, 224, 150],
    outline: [44, 70, 36],
    frostAmt: 0,
    snowCapAmt: 0,
    gloss: 0.5,
  },
  // Summer — richest, most-saturated palette (PEAK); husk peels open to show
  // plump bright-yellow kernels in neat rows, golden silk, vivid green husk.
  Summer: {
    shadowAmt: 0.7,
    padGrass: [104, 184, 70],
    padGrassDark: [62, 126, 46],
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    huskLight: [108, 184, 66],
    huskDark: [48, 104, 40],
    huskBrownAmt: 0,
    huskOpen: 1,
    kernel: [255, 214, 64],
    kernelDeep: [206, 150, 28],
    kernelDent: 0,
    silk: [240, 214, 120],
    outline: [40, 66, 32],
    frostAmt: 0,
    snowCapAmt: 0,
    gloss: 0.8,
  },
  // Autumn — gold/orange/rust; husk drying, curling & browning at edges,
  // kernels deeper gold & a touch dented; silk rust-brown; fallen leaves.
  Autumn: {
    shadowAmt: 0.55,
    padGrass: [158, 150, 78],
    padGrassDark: [112, 96, 50],
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1,
    huskLight: [176, 150, 72],
    huskDark: [104, 76, 32],
    huskBrownAmt: 1,
    huskOpen: 0.9,
    kernel: [232, 168, 44],
    kernelDeep: [168, 108, 24],
    kernelDent: 1,
    silk: [168, 108, 56],
    outline: [70, 48, 24],
    frostAmt: 0,
    snowCapAmt: 0,
    gloss: 0.45,
  },
  // Winter — cool blue-grey light; husk muted green-grey, kernels still
  // visible; snow cap + frost dusting on upward surfaces; pad snow-covered.
  Winter: {
    shadowAmt: 0.4,
    padGrass: [120, 138, 122],
    padGrassDark: [86, 104, 96],
    padSnowAmt: 1,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    huskLight: [120, 150, 110],
    huskDark: [70, 96, 76],
    huskBrownAmt: 0.2,
    huskOpen: 0.55,
    kernel: [214, 188, 110],
    kernelDeep: [156, 132, 78],
    kernelDent: 0.4,
    silk: [196, 200, 198],
    outline: [54, 66, 60],
    frostAmt: 1,
    snowCapAmt: 1,
    gloss: 0.35,
  },
};

// ── Helpers: colour + interpolation ─────────────────────────────────────────

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function rgb([r, g, b]: RGB, a = 1): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** Interpolate EVERY field of P (tuples component-wise, scalars linearly). */
function lerpP(a: P, b: P, t: number): P {
  return {
    shadowAmt: lerp(a.shadowAmt, b.shadowAmt, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padGrassDark: lerpRGB(a.padGrassDark, b.padGrassDark, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
    huskLight: lerpRGB(a.huskLight, b.huskLight, t),
    huskDark: lerpRGB(a.huskDark, b.huskDark, t),
    huskBrownAmt: lerp(a.huskBrownAmt, b.huskBrownAmt, t),
    huskOpen: lerp(a.huskOpen, b.huskOpen, t),
    kernel: lerpRGB(a.kernel, b.kernel, t),
    kernelDeep: lerpRGB(a.kernelDeep, b.kernelDeep, t),
    kernelDent: lerp(a.kernelDent, b.kernelDent, t),
    silk: lerpRGB(a.silk, b.silk, t),
    outline: lerpRGB(a.outline, b.outline, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
    gloss: lerp(a.gloss, b.gloss, t),
  };
}

/** Clamp every amount field so paint never sees out-of-range values. */
function clampP(p: P): P {
  return {
    ...p,
    shadowAmt: clamp01(p.shadowAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    huskBrownAmt: clamp01(p.huskBrownAmt),
    huskOpen: clamp01(p.huskOpen),
    kernelDent: clamp01(p.kernelDent),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    gloss: clamp01(p.gloss),
  };
}

// Quintic smootherstep, used for transitions (zero velocity at both ends).
const smoother = (x: number): number => x * x * x * (x * (6 * x - 15) + 10);

// ── Shared cob geometry (IDENTICAL silhouette every season) ─────────────────

const COB_TOP = -22; // tip of the cob
const COB_BOT = 14; // base sits on the pad
const COB_HALF = 8.5; // half-width at the belly

/** Draw the cob kernel-body outline path. The shape is constant across all P. */
function cobBodyPath(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.moveTo(0, COB_TOP);
  ctx.bezierCurveTo(COB_HALF, COB_TOP + 6, COB_HALF, -2, COB_HALF * 0.86, 6);
  ctx.bezierCurveTo(COB_HALF * 0.7, COB_BOT - 2, 4, COB_BOT, 0, COB_BOT);
  ctx.bezierCurveTo(-4, COB_BOT, -COB_HALF * 0.7, COB_BOT - 2, -COB_HALF * 0.86, 6);
  ctx.bezierCurveTo(-COB_HALF, -2, -COB_HALF, COB_TOP + 6, 0, COB_TOP);
  ctx.closePath();
}

/** The back husk wrap path (constant extent; opening only rotates leaf tips). */
function huskBackPath(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.moveTo(-COB_HALF, COB_TOP + 7);
  ctx.quadraticCurveTo(-COB_HALF - 1, 4, -5, COB_BOT + 1);
  ctx.lineTo(5, COB_BOT + 1);
  ctx.quadraticCurveTo(COB_HALF + 1, 4, COB_HALF, COB_TOP + 7);
  ctx.quadraticCurveTo(0, COB_TOP + 1, -COB_HALF, COB_TOP + 7);
  ctx.closePath();
}

// ── Sub-part painters (all driven only by p) ────────────────────────────────

/** Soft contact shadow toward the lower-right, on transparency. */
function contactShadow(ctx: CanvasRenderingContext2D, p: P): void {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${0.26 * p.shadowAmt})`;
  ctx.beginPath();
  ctx.ellipse(3, 21, 15, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Low flat turf disc pad with tufted edge + shaded underside, plus snow. */
function pad(ctx: CanvasRenderingContext2D, p: P): void {
  // shaded underside
  ctx.fillStyle = rgb(p.padGrassDark);
  ctx.beginPath();
  ctx.ellipse(0, 20.5, 18, 5.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // top turf face
  ctx.fillStyle = rgb(p.padGrass);
  ctx.beginPath();
  ctx.ellipse(0, 19, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // soft tufted edge — little blades around the rim
  ctx.strokeStyle = rgb(p.padGrassDark);
  ctx.lineWidth = 1.3;
  ctx.lineCap = "round";
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const ex = Math.cos(a) * 17.2;
    const ey = 19 + Math.sin(a) * 4.6;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + Math.cos(a) * 1.8, ey + Math.sin(a) * 1.4 - 1.4);
    ctx.stroke();
  }
  // lit blades on top
  ctx.strokeStyle = rgb(lerpRGB(p.padGrass, [255, 255, 255], 0.25));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    const ex = Math.cos(a) * 12;
    const ey = 18 + Math.sin(a) * 3.2;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + 0.6, ey - 2);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // snow cover over the pad (winter)
  if (p.padSnowAmt > 0.01) {
    ctx.save();
    ctx.globalAlpha = p.padSnowAmt;
    const snow = ctx.createLinearGradient(0, 14, 0, 23);
    snow.addColorStop(0, "#f3f7fd");
    snow.addColorStop(1, "#cbd8e6");
    ctx.fillStyle = snow;
    ctx.beginPath();
    ctx.ellipse(0, 19, 17, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // frost sparkle specks on the pad
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    const specks: Array<[number, number]> = [
      [-10, 18], [-3, 20], [6, 18.5], [12, 19.5], [2, 17.5],
    ];
    specks.forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
}

/** Pale blossom resting on the pad (spring dressing). */
function blossom(ctx: CanvasRenderingContext2D, p: P): void {
  if (p.blossomAmt < 0.02) return;
  ctx.save();
  ctx.globalAlpha = p.blossomAmt;
  ctx.translate(-12, 19);
  ctx.fillStyle = "rgba(255,240,248,0.96)";
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 2.4, Math.sin(a) * 1.4, 1.7, 1.1, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(248,206,96,0.95)";
  ctx.beginPath();
  ctx.arc(0, 0, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A couple of fallen leaves on the pad (autumn dressing). */
function fallenLeaves(ctx: CanvasRenderingContext2D, p: P): void {
  if (p.fallenLeafAmt < 0.02) return;
  ctx.save();
  ctx.globalAlpha = p.fallenLeafAmt;
  const leaves: Array<[number, number, number, string]> = [
    [-12, 20, -0.5, "#c8772b"],
    [11, 20.5, 0.7, "#b8531f"],
  ];
  leaves.forEach(([lx, ly, rot, col]) => {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(rot);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.4, 1.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(90,48,16,0.7)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-3.2, 0);
    ctx.lineTo(3.2, 0);
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}

/** The kernel body of the cob (rows of kernels), revealed where husk opens. */
function cobKernels(ctx: CanvasRenderingContext2D, p: P): void {
  ctx.save();
  // clip to the cob body so kernels never spill past the silhouette
  cobBodyPath(ctx);
  ctx.clip();

  // base fill (deep) then rows of lit kernels
  ctx.fillStyle = rgb(p.kernelDeep);
  cobBodyPath(ctx);
  ctx.fill();

  const dentPush = p.kernelDent * 0.6; // dented kernels read smaller/darker
  for (let row = 0; row < 9; row++) {
    const y = COB_TOP + 4 + row * 3.6;
    const halfAtRow = COB_HALF * 0.82 * (1 - Math.abs((y + 4) / 30) * 0.18);
    const cols = 5;
    for (let c = 0; c < cols; c++) {
      const fx = (c / (cols - 1) - 0.5) * 2 * (halfAtRow - 1.4);
      const sx = fx + (row % 2 === 0 ? 0 : (halfAtRow - 1.4) / (cols - 1));
      if (Math.abs(sx) > halfAtRow - 0.6) continue;
      const kr = 1.9 - dentPush;
      const face = lerpRGB(p.kernel, p.kernelDeep, dentPush * 0.5);
      ctx.fillStyle = rgb(face);
      ctx.beginPath();
      ctx.ellipse(sx, y, kr, kr * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();
      // local kernel highlight (not a bloom)
      ctx.fillStyle = rgb(lerpRGB(face, [255, 255, 255], 0.4 * p.gloss));
      ctx.beginPath();
      ctx.ellipse(sx - 0.5, y - 0.6, kr * 0.5, kr * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // soft outline around the kernel body
  ctx.strokeStyle = rgb(p.outline, 0.85);
  ctx.lineWidth = 1.1;
  cobBodyPath(ctx);
  ctx.stroke();
}

/** Silk tuft on top of the cob. */
function silkTuft(ctx: CanvasRenderingContext2D, p: P, sway: number): void {
  ctx.save();
  ctx.translate(0, COB_TOP);
  ctx.strokeStyle = rgb(p.silk, 0.95);
  ctx.lineWidth = 1.1;
  ctx.lineCap = "round";
  const strands: Array<[number, number]> = [
    [-4, -0.5], [-2, -0.2], [0, 0], [2, 0.2], [4, 0.5],
  ];
  strands.forEach(([sx, lean], i) => {
    const tipX = sx + lean * 6 + sway * (0.4 + i * 0.12);
    const tipY = -7 - Math.abs(sx) * 0.3;
    ctx.beginPath();
    ctx.moveTo(sx * 0.4, 0);
    ctx.quadraticCurveTo(sx * 0.7 + sway * 0.3, -3.5, tipX, tipY);
    ctx.stroke();
  });
  // lit tips
  ctx.strokeStyle = rgb(lerpRGB(p.silk, [255, 255, 255], 0.4), 0.8);
  ctx.lineWidth = 0.7;
  strands.forEach(([sx, lean], i) => {
    const tipX = sx + lean * 6 + sway * (0.4 + i * 0.12);
    const tipY = -7 - Math.abs(sx) * 0.3;
    ctx.beginPath();
    ctx.moveTo(sx * 0.55 + sway * 0.2, -3.5);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
  });
  ctx.lineCap = "butt";
  ctx.restore();
}

/** The husk leaves wrapping the cob. `huskOpen` peels the front/top leaves
 *  back to reveal the kernels; the OUTLINE/extent of the husk is constant. */
function husk(ctx: CanvasRenderingContext2D, p: P, leafFlutter: number): void {
  // browning blended into both husk tones at the edges (autumn)
  const light = lerpRGB(p.huskLight, [150, 104, 44], p.huskBrownAmt * 0.5);
  const dark = lerpRGB(p.huskDark, [96, 64, 28], p.huskBrownAmt * 0.6);

  // back husk fill — dark leaf body behind the cob giving the wrap volume
  ctx.fillStyle = rgb(dark);
  huskBackPath(ctx);
  ctx.fill();

  // Two husk leaves per side, anchored at the base; the tip peels outward by
  // `open` (never shrinks the husk footprint, only rotates the tip).
  const leaves: Array<[number, number, number]> = [
    [-1, -7.5, 1],
    [-1, -4, 0.3],
    [1, 7.5, 1],
    [1, 4, 0.3],
  ];
  leaves.forEach(([side, baseX, fw]) => {
    const open = p.huskOpen * (0.45 + (0.55 * Math.abs(baseX)) / 7.5);
    const tipX = baseX + side * (2 + open * 9);
    const tipY = COB_TOP + 5 - open * 7 + leafFlutter * fw;
    const midX = baseX + side * (1 + open * 4);
    const midY = -4;

    // dark base pass for depth
    ctx.fillStyle = rgb(dark);
    ctx.beginPath();
    ctx.moveTo(baseX, COB_BOT);
    ctx.quadraticCurveTo(midX - side * 3, midY, tipX, tipY);
    ctx.quadraticCurveTo(midX + side * 1.5, midY + 3, baseX + side * 2, COB_BOT);
    ctx.closePath();
    ctx.fill();

    // lit leaf face inset
    ctx.fillStyle = rgb(light);
    ctx.beginPath();
    ctx.moveTo(baseX + side * 0.6, COB_BOT - 1);
    ctx.quadraticCurveTo(midX - side * 2, midY, tipX - side * 1.2, tipY + 1.2);
    ctx.quadraticCurveTo(midX + side * 1, midY + 2.5, baseX + side * 1.8, COB_BOT - 1);
    ctx.closePath();
    ctx.fill();

    // central vein
    ctx.strokeStyle = rgb(dark, 0.7);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(baseX + side * 1, COB_BOT - 1);
    ctx.quadraticCurveTo(midX, midY, tipX - side * 0.8, tipY + 0.8);
    ctx.stroke();

    // browning crisp at the very tip (autumn)
    if (p.huskBrownAmt > 0.05) {
      ctx.fillStyle = rgb([120, 78, 32], p.huskBrownAmt);
      ctx.beginPath();
      ctx.ellipse(tipX, tipY, 1.6, 1.1, side * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // husk outline along the wrap
  ctx.strokeStyle = rgb(p.outline, 0.85);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-COB_HALF, COB_TOP + 7);
  ctx.quadraticCurveTo(-COB_HALF - 1, 4, -5, COB_BOT + 1);
  ctx.lineTo(5, COB_BOT + 1);
  ctx.quadraticCurveTo(COB_HALF + 1, 4, COB_HALF, COB_TOP + 7);
  ctx.stroke();
}

/** Frost dusting + snow cap on the cob's upward surfaces (winter). */
function frostAndSnow(ctx: CanvasRenderingContext2D, p: P): void {
  // snow cap sitting on top of the husk/cob tip
  if (p.snowCapAmt > 0.01) {
    ctx.save();
    ctx.globalAlpha = p.snowCapAmt;
    const cap = ctx.createLinearGradient(0, COB_TOP - 3, 0, COB_TOP + 6);
    cap.addColorStop(0, "#ffffff");
    cap.addColorStop(1, "#dbe6f2");
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.moveTo(-COB_HALF + 1, COB_TOP + 7);
    ctx.quadraticCurveTo(-6, COB_TOP - 4, 0, COB_TOP - 3);
    ctx.quadraticCurveTo(6, COB_TOP - 4, COB_HALF - 1, COB_TOP + 7);
    ctx.quadraticCurveTo(0, COB_TOP + 3, -COB_HALF + 1, COB_TOP + 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // frost dusting — fine pale specks on the upper-left (lit) surfaces
  if (p.frostAmt > 0.01) {
    ctx.save();
    ctx.globalAlpha = 0.7 * p.frostAmt;
    ctx.fillStyle = "#eaf3ff";
    const specks: Array<[number, number]> = [
      [-5, -14], [-2, -8], [-6, -2], [-3, 3], [3, -12],
      [5, -5], [1, -16], [-4, 8],
    ];
    specks.forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
}

/** Subtle sheen highlight on the cob (dew/gloss), never a bloom. */
function sheen(ctx: CanvasRenderingContext2D, p: P): void {
  if (p.gloss < 0.02) return;
  ctx.save();
  cobBodyPath(ctx);
  ctx.clip();
  const g = ctx.createLinearGradient(-COB_HALF, COB_TOP, COB_HALF * 0.4, COB_BOT);
  g.addColorStop(0, `rgba(255,255,255,${0.22 * p.gloss})`);
  g.addColorStop(0.5, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  cobBodyPath(ctx);
  ctx.fill();
  ctx.restore();
}

// ── The single parameterized paint ──────────────────────────────────────────
// Draws the WHOLE tile from p + a vertical idle offset `bob` (design px;
// bob=0 = rest pose). Optional micro-dressing args are additive and tiny.

interface Micro {
  leafFlutter?: number; // husk-leaf tip flutter (autumn)
  silkSway?: number; // silk strand sway
  glint?: number; // 0..1 travelling glint position on the cob (summer)
  extraFlakes?: Array<[number, number, number]>; // drifting snowflakes (winter)
  dew?: number; // 0..1 dew shimmer pulse (spring)
  coldSheen?: number; // 0..1 faint cold sheen pulse (winter)
}

function paint(
  ctx: CanvasRenderingContext2D,
  pRaw: P,
  bob: number,
  micro?: Micro,
): void {
  const p = clampP(pRaw);
  const m = micro ?? {};

  // Pad + ground dressing are drawn at rest (do not bob with the subject).
  contactShadow(ctx, p);
  pad(ctx, p);
  blossom(ctx, p);
  fallenLeaves(ctx, p);

  // Subject bobs as a whole.
  ctx.save();
  ctx.translate(0, bob);

  husk(ctx, p, m.leafFlutter ?? 0);
  cobKernels(ctx, p);
  sheen(ctx, p);

  // travelling glint along the kernels (summer micro-motion, additive)
  if (m.glint !== undefined && p.huskOpen > 0.2) {
    ctx.save();
    cobBodyPath(ctx);
    ctx.clip();
    const gy = COB_TOP + 4 + m.glint * 28;
    const grad = ctx.createRadialGradient(-1, gy, 0, -1, gy, 5);
    grad.addColorStop(0, "rgba(255,252,220,0.7)");
    grad.addColorStop(1, "rgba(255,252,220,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(-1, gy, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  silkTuft(ctx, p, m.silkSway ?? 0);
  frostAndSnow(ctx, p);

  // faint cold sheen pulse (winter), additive, tiny — over upward surfaces
  if (m.coldSheen !== undefined && m.coldSheen > 0.01) {
    ctx.save();
    cobBodyPath(ctx);
    ctx.clip();
    ctx.globalAlpha = 0.12 * m.coldSheen;
    ctx.fillStyle = "#cfe6ff";
    cobBodyPath(ctx);
    ctx.fill();
    ctx.restore();
  }

  // dew shimmer (spring), additive, a tiny pulsing droplet glint
  if (m.dew !== undefined && m.dew > 0.01) {
    ctx.save();
    ctx.globalAlpha = m.dew;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(-3, -6, 0.9 + 0.5 * m.dew, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2, 2, 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore(); // end subject bob

  // drifting snowflakes (winter), additive, in tile space (not bobbed)
  if (m.extraFlakes) {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    m.extraFlakes.forEach(([fx, fy, r]) => {
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  ctx.globalAlpha = 1;
}

// ── Idle bob: seamless, zero at t=0 with zero velocity ──────────────────────
// A*(1-cos(w t))*0.5 : value 0 and derivative 0 at t=0, seamless loop period 2π/w.

function bobAt(t: number): number {
  const A = 1.4; // peak rise in design px
  const w = 1.5; // rad/s
  return -A * (1 - Math.cos(w * t)) * 0.5; // negative = rises upward
}

// ── Per-season draw + anim ──────────────────────────────────────────────────

function drawCornSpring(ctx: CanvasRenderingContext2D): void {
  paint(ctx, SP.Spring, 0);
}
function drawCornSummer(ctx: CanvasRenderingContext2D): void {
  paint(ctx, SP.Summer, 0);
}
function drawCornAutumn(ctx: CanvasRenderingContext2D): void {
  paint(ctx, SP.Autumn, 0);
}
function drawCornWinter(ctx: CanvasRenderingContext2D): void {
  paint(ctx, SP.Winter, 0);
}

function animCornSpring(ctx: CanvasRenderingContext2D, t: number): void {
  // faint dew shimmer; subject bob is zero at t=0.
  const dew = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.8));
  paint(ctx, SP.Spring, bobAt(t), {
    silkSway: Math.sin(t * 1.4) * 0.8,
    dew,
  });
}

function animCornSummer(ctx: CanvasRenderingContext2D, t: number): void {
  // soft travelling glint cycles 0..1 seamlessly via fractional part of t.
  const glint = (t * 0.45) % 1;
  paint(ctx, SP.Summer, bobAt(t), {
    silkSway: Math.sin(t * 1.3) * 1,
    glint,
  });
}

function animCornAutumn(ctx: CanvasRenderingContext2D, t: number): void {
  // one husk-leaf tip flutters; seamless via sin.
  const leafFlutter = Math.sin(t * 2.2) * 1.4;
  paint(ctx, SP.Autumn, bobAt(t), {
    leafFlutter,
    silkSway: Math.sin(t * 1.1) * 0.7,
  });
}

function animCornWinter(ctx: CanvasRenderingContext2D, t: number): void {
  // a couple of drifting snowflakes + faint cold sheen.
  const seeds: Array<[number, number, number]> = [
    [-6, 1.1, 0.0],
    [7, 0.9, 0.5],
  ];
  const span = 36;
  const flakes: Array<[number, number, number]> = seeds.map(([fx, r, phase]) => {
    const prog = (((t / 3.6 + phase) % 1) + 1) % 1;
    const fy = -22 + prog * span;
    const driftX = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
    return [driftX, fy, r];
  });
  const coldSheen = 0.5 + 0.5 * Math.sin(t * 0.8);
  paint(ctx, SP.Winter, bobAt(t), {
    silkSway: Math.sin(t * 0.9) * 0.5,
    extraFlakes: flakes,
    coldSheen,
  });
}

// ── Transitions: lerp every field through a smoothstep ──────────────────────
// transition(ctx,0) === draw(from); transition(ctx,1) === draw(to). No snap.

function makeTransition(from: SeasonName, to: SeasonName) {
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const t = smoother(clamp01(pp));
    paint(ctx, lerpP(SP[from], SP[to], t), 0);
  };
}

const springToSummer = makeTransition("Spring", "Summer");
const summerToAutumn = makeTransition("Summer", "Autumn");
const autumnToWinter = makeTransition("Autumn", "Winter");

// ── Exports ─────────────────────────────────────────────────────────────────

export const VARIANTS: SeasonalTileEntry = {
  Spring: { draw: drawCornSpring, anim: animCornSpring },
  Summer: { draw: drawCornSummer, anim: animCornSummer },
  Autumn: { draw: drawCornAutumn, anim: animCornAutumn },
  Winter: { draw: drawCornWinter, anim: animCornWinter },
};

export const TRANSITIONS: SeasonalTransitionSet = {
  0: springToSummer,
  1: summerToAutumn,
  2: autumnToWinter,
};
