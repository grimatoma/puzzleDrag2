// Seasonal art for the MANNA farm tile (`tile_grain_manna`, category grain).
//
// Identity rule: the subject is ALWAYS the same small cluster of pale luminous
// manna grains — a unified mound of rounded, pearlescent, dewy seeds heaped on
// a turf pad, wrapped in a gentle ambient glow that is part of manna's
// identity. Manna is a MAGICAL grain, so its seasons are NOT a lifecycle: every
// season shares the SAME mound silhouette/outline; only the grain tint, the
// glow colour/strength, the frost/snow dusting, and the pad dressing change.
// The glow is a soft breathing halo, seasonal in colour — never a strobe or a
// flash.
//
// Architecture: a single parameterized `paint(ctx, p, bob)` draws the whole
// tile from a tweenable parameter set `P`. The four seasons are four `P`
// values in `SP`. `draw` = paint at rest, `anim` = paint at a seamless idle
// bob plus additive per-season micro-motion (a slow glow pulse, winter
// snowflakes), and each `transition` lerps every field of `P` between
// neighbouring seasons through a smoothstep so the morph starts exactly on the
// `from` still and ends exactly on the `to` still — including the glow colour
// and strength, which tween smoothly across the boundary.
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
  // manna grain surfaces (the pearlescent mound of rounded seeds)
  grainInner: RGB; // bright lit core of each grain
  grainMid: RGB; // mid pearlescent body colour
  grainRim: RGB; // shaded rim / underside colour
  contour: RGB; // soft outer contour stroke tint
  dimple: RGB; // interior dimple stroke tint (where grains meet)
  // ambient glow (part of manna's identity — gentle halo, seasonal colour)
  glowColor: RGB; // halo colour
  glowAmt: number; // 0..1 ambient glow strength (peaks in summer)
  // surface sheen / dew
  gloss: number; // 0..1 subtle pearlescent sheen on the mound
  sparkle: number; // 0..1 little contained sparkle accents on the mound
  // winter dressing
  frostAmt: number; // 0..1 frost dusting sparkle on upward surfaces
  snowCapAmt: number; // 0..1 little snow caps sitting on the grains
}

// ── Season parameter sets ───────────────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — soft pale sprout: grains tinged pale green-cream, a faint cool
  // -white shimmer (LOW glow); lime dewy pad + a pale blossom.
  Spring: {
    shadowAmt: 0.5,
    padGrass: [142, 214, 96],
    padGrassDark: [86, 150, 60],
    padSnowAmt: 0,
    blossomAmt: 1,
    fallenLeafAmt: 0,
    grainInner: [255, 255, 250],
    grainMid: [240, 244, 210],
    grainRim: [198, 214, 158],
    contour: [148, 170, 104],
    dimple: [140, 162, 96],
    glowColor: [216, 242, 196],
    glowAmt: 0.32,
    gloss: 0.55,
    sparkle: 0.7,
    frostAmt: 0,
    snowCapAmt: 0,
  },
  // Summer — full pale-GOLD glow (PEAK): warm luminous cream grains; saturated
  // green pad, warm light, strong shadow.
  Summer: {
    shadowAmt: 0.7,
    padGrass: [104, 184, 70],
    padGrassDark: [62, 126, 46],
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    grainInner: [255, 255, 248],
    grainMid: [252, 238, 196],
    grainRim: [230, 196, 116],
    contour: [189, 150, 54],
    dimple: [180, 140, 60],
    glowColor: [255, 230, 150],
    glowAmt: 0.85,
    gloss: 0.8,
    sparkle: 0.95,
    frostAmt: 0,
    snowCapAmt: 0,
  },
  // Autumn — dimming cream grains, glow fading to a soft amber (LOWER glow);
  // olive-tan pad + a couple of fallen leaves.
  Autumn: {
    shadowAmt: 0.55,
    padGrass: [158, 150, 78],
    padGrassDark: [112, 96, 50],
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1,
    grainInner: [255, 244, 224],
    grainMid: [240, 210, 154],
    grainRim: [192, 142, 64],
    contour: [140, 92, 32],
    dimple: [140, 90, 30],
    glowColor: [240, 172, 92],
    glowAmt: 0.5,
    gloss: 0.5,
    sparkle: 0.7,
    frostAmt: 0,
    snowCapAmt: 0,
  },
  // Winter — a faint cold-BLUE glow (LOW glow, cool colour); grains frost
  // -dusted with tiny snow caps, but stay clearly visible (no white-out);
  // snow-covered pad + frost sparkle.
  Winter: {
    shadowAmt: 0.4,
    padGrass: [120, 138, 122],
    padGrassDark: [86, 104, 96],
    padSnowAmt: 1,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    grainInner: [255, 255, 255],
    grainMid: [226, 236, 246],
    grainRim: [176, 196, 216],
    contour: [126, 150, 174],
    dimple: [120, 150, 180],
    glowColor: [190, 220, 245],
    glowAmt: 0.34,
    gloss: 0.4,
    sparkle: 0.6,
    frostAmt: 1,
    snowCapAmt: 1,
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
    grainInner: lerpRGB(a.grainInner, b.grainInner, t),
    grainMid: lerpRGB(a.grainMid, b.grainMid, t),
    grainRim: lerpRGB(a.grainRim, b.grainRim, t),
    contour: lerpRGB(a.contour, b.contour, t),
    dimple: lerpRGB(a.dimple, b.dimple, t),
    glowColor: lerpRGB(a.glowColor, b.glowColor, t),
    glowAmt: lerp(a.glowAmt, b.glowAmt, t),
    gloss: lerp(a.gloss, b.gloss, t),
    sparkle: lerp(a.sparkle, b.sparkle, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
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
    glowAmt: clamp01(p.glowAmt),
    gloss: clamp01(p.gloss),
    sparkle: clamp01(p.sparkle),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
  };
}

// Quintic smootherstep, used for transitions (zero velocity at both ends).
const smoother = (x: number): number => x * x * x * (x * (6 * x - 15) + 10);

// ── Shared mound geometry (IDENTICAL silhouette every season) ────────────────
// The cluster of rounded pearlescent grains — a unified soft mound made of
// five overlapping bumps. This shape is constant across all P; only colour,
// glow, frost and snow change.

interface Bump {
  x: number;
  y: number;
  r: number;
}

const BUMPS: ReadonlyArray<Bump> = [
  { x: -10, y: 6, r: 10 },
  { x: 10, y: 7, r: 9.5 },
  { x: -2, y: -9, r: 11 },
  { x: 7, y: -3, r: 8 },
  { x: -7, y: -2, r: 7 },
];

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

/** The ambient glow halo — a gentle seasonal-coloured luminescence behind the
 *  mound. `pulse` (≈1 at rest) lets the idle breathe the halo subtly. The
 *  strength comes from `glowAmt`; this is a soft halo, never a flash. */
function glowHalo(ctx: CanvasRenderingContext2D, p: P, pulse: number): void {
  if (p.glowAmt < 0.01) return;
  ctx.save();
  // gentle ambient halo: peak alpha scales with glowAmt and the slow pulse.
  const alpha = 0.6 * p.glowAmt * pulse;
  const radius = 23 + 1.5 * p.glowAmt * pulse;
  const g = ctx.createRadialGradient(0, -2, 4, 0, -2, radius);
  g.addColorStop(0, rgb(p.glowColor, alpha));
  g.addColorStop(1, rgb(p.glowColor, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, -2, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The unified pearlescent mound of grains (bumps + contour + dimples + a soft
 *  specular). The SHAPE is constant for every season; only colour changes. */
function mound(ctx: CanvasRenderingContext2D, p: P): void {
  // Base fill: draw all bumps with a shared soft gradient so they merge into
  // one soft mound of rounded grains.
  BUMPS.forEach((b) => {
    const grad = ctx.createRadialGradient(
      b.x - b.r * 0.45,
      b.y - b.r * 0.5,
      1,
      b.x,
      b.y,
      b.r,
    );
    grad.addColorStop(0, rgb(p.grainInner));
    grad.addColorStop(0.55, rgb(p.grainMid));
    grad.addColorStop(1, rgb(p.grainRim));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Single soft contour tracing only the outer arc of each rim bump so the
  // cluster reads as one mound (not separate rings).
  ctx.strokeStyle = rgb(p.contour);
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(BUMPS[2].x, BUMPS[2].y, BUMPS[2].r - 0.3, Math.PI * 1.05, Math.PI * 2.05);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(BUMPS[0].x, BUMPS[0].y, BUMPS[0].r - 0.3, Math.PI * 0.35, Math.PI * 1.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(BUMPS[1].x, BUMPS[1].y, BUMPS[1].r - 0.3, Math.PI * -0.45, Math.PI * 0.65);
  ctx.stroke();

  // Soft dimples where grains meet (interior detail, restrained).
  ctx.strokeStyle = rgb(p.dimple, 0.45);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 2, 5, -0.7, 0.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(2, -6, 4.5, 2.2, 3.6);
  ctx.stroke();

  // Soft pearlescent specular highlight upper-left (sheen, never a bloom).
  if (p.gloss > 0.02) {
    ctx.save();
    ctx.fillStyle = rgb([255, 255, 255], 0.5 * p.gloss);
    ctx.beginPath();
    ctx.ellipse(-5, -11, 4, 2.4, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** Static contained sparkle accents on the mound (upper-left bias). */
function sparkles(ctx: CanvasRenderingContext2D, p: P): void {
  if (p.sparkle < 0.02) return;
  ctx.save();
  ctx.fillStyle = rgb(lerpRGB(p.grainInner, [255, 255, 255], 0.4), 0.95 * p.sparkle);
  const pts: Array<[number, number, number]> = [
    [-9, -10, 1.7],
    [4, -1, 1.3],
  ];
  pts.forEach(([sx, sy, sr]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

/** Frost dusting + little snow caps on the mound's upward surfaces (winter).
 *  The grains stay clearly visible underneath — NO white-out. */
function frostAndSnow(ctx: CanvasRenderingContext2D, p: P): void {
  // small snow caps sitting on the top rim of the upward grains
  if (p.snowCapAmt > 0.01) {
    ctx.save();
    ctx.globalAlpha = p.snowCapAmt;
    const caps: Array<[number, number, number]> = [
      [-2, -16, 6.5], // top grain
      [-10, -1, 5], // upper-left grain
      [7, -9, 4.5], // upper-right grain
    ];
    const capGrad = ctx.createLinearGradient(0, -20, 0, -4);
    capGrad.addColorStop(0, "#ffffff");
    capGrad.addColorStop(1, "#dbe6f2");
    ctx.fillStyle = capGrad;
    caps.forEach(([cx, cy, cw]) => {
      ctx.beginPath();
      // a shallow cap hugging the top of the grain (not covering it)
      ctx.ellipse(cx, cy, cw, cw * 0.42, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
  // frost dusting — fine pale specks on the upper-left (lit) surfaces
  if (p.frostAmt > 0.01) {
    ctx.save();
    ctx.globalAlpha = 0.7 * p.frostAmt;
    ctx.fillStyle = "#eaf3ff";
    const specks: Array<[number, number]> = [
      [-12, -2], [-6, -12], [-2, -5], [3, -13], [8, -4],
      [-9, 3], [1, 1], [5, -8],
    ];
    specks.forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
}

// ── The single parameterized paint ──────────────────────────────────────────
// Draws the WHOLE tile from p + a vertical idle offset `bob` (design px;
// bob=0 = rest pose). Optional micro-dressing args are additive and tiny.

interface Micro {
  glowPulse?: number; // ≈1 slow breathing of the ambient halo
  twinkle?: number; // 0..1 extra sparkle shimmer on the mound
  extraFlakes?: Array<[number, number, number]>; // drifting snowflakes (winter)
}

function paint(
  ctx: CanvasRenderingContext2D,
  pRaw: P,
  bob: number,
  micro?: Micro,
): void {
  const p = clampP(pRaw);
  const m = micro ?? {};

  // Ambient glow halo sits behind everything (gentle, seasonal colour).
  glowHalo(ctx, p, m.glowPulse ?? 1);

  // Pad + ground dressing are drawn at rest (do not bob with the subject).
  contactShadow(ctx, p);
  pad(ctx, p);
  blossom(ctx, p);
  fallenLeaves(ctx, p);

  // Subject (the grain mound) bobs as a whole.
  ctx.save();
  ctx.translate(0, bob);

  mound(ctx, p);
  sparkles(ctx, p);

  // extra twinkle shimmer on the mound (additive micro-motion, tiny)
  if (m.twinkle !== undefined && m.twinkle > 0.01) {
    ctx.save();
    ctx.fillStyle = rgb(lerpRGB(p.grainInner, [255, 255, 255], 0.5), 0.5 * m.twinkle);
    const pts: Array<[number, number, number]> = [
      [-2, -14, 1.1],
      [8, -8, 1.0],
    ];
    pts.forEach(([sx, sy, sr]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  frostAndSnow(ctx, p);

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
  const A = 1.3; // peak rise in design px
  const w = 1.4; // rad/s
  return -A * (1 - Math.cos(w * t)) * 0.5; // negative = rises upward
}

// ── Per-season draw + anim ──────────────────────────────────────────────────

function drawMannaSpring(ctx: CanvasRenderingContext2D): void {
  paint(ctx, SP.Spring, 0);
}
function drawMannaSummer(ctx: CanvasRenderingContext2D): void {
  paint(ctx, SP.Summer, 0);
}
function drawMannaAutumn(ctx: CanvasRenderingContext2D): void {
  paint(ctx, SP.Autumn, 0);
}
function drawMannaWinter(ctx: CanvasRenderingContext2D): void {
  paint(ctx, SP.Winter, 0);
}

function animMannaSpring(ctx: CanvasRenderingContext2D, t: number): void {
  // gentle breathing of the cool-white halo + a faint twinkle; bob 0 at t=0.
  paint(ctx, SP.Spring, bobAt(t), {
    glowPulse: 1 + 0.12 * Math.sin(t * 1.4),
    twinkle: 0.4 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.8)),
  });
}

function animMannaSummer(ctx: CanvasRenderingContext2D, t: number): void {
  // the pale-gold halo breathes a little stronger (still gentle, no flash).
  paint(ctx, SP.Summer, bobAt(t), {
    glowPulse: 1 + 0.16 * Math.sin(t * 1.6),
    twinkle: 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2.2)),
  });
}

function animMannaAutumn(ctx: CanvasRenderingContext2D, t: number): void {
  // the soft amber halo breathes slowly as it dims.
  paint(ctx, SP.Autumn, bobAt(t), {
    glowPulse: 1 + 0.12 * Math.sin(t * 1.3),
    twinkle: 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.7)),
  });
}

function animMannaWinter(ctx: CanvasRenderingContext2D, t: number): void {
  // faint cold-blue halo breathes; a couple of drifting snowflakes fall.
  const seeds: Array<[number, number, number]> = [
    [-6, 1.1, 0.0],
    [7, 0.9, 0.5],
  ];
  const span = 36;
  const flakes: Array<[number, number, number]> = seeds.map(([fx, r, phase]) => {
    const prog = (((t / 3.6 + phase) % 1) + 1) % 1;
    const fy = -20 + prog * span;
    const driftX = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
    return [driftX, fy, r];
  });
  paint(ctx, SP.Winter, bobAt(t), {
    glowPulse: 1 + 0.12 * Math.sin(t * 1.5),
    twinkle: 0.3 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.0)),
    extraFlakes: flakes,
  });
}

// ── Transitions: lerp every field through a smoothstep ──────────────────────
// transition(ctx,0) === draw(from); transition(ctx,1) === draw(to). No snap.
// The glow colour and strength tween smoothly across the boundary too.

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
  Spring: { draw: drawMannaSpring, anim: animMannaSpring },
  Summer: { draw: drawMannaSummer, anim: animMannaSummer },
  Autumn: { draw: drawMannaAutumn, anim: animMannaAutumn },
  Winter: { draw: drawMannaWinter, anim: animMannaWinter },
};

export const TRANSITIONS: SeasonalTransitionSet = {
  0: springToSummer,
  1: summerToAutumn,
  2: autumnToWinter,
};
