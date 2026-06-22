// Seasonal art for the WHEAT farm tile (`tile_grain_wheat`, category grain).
//
// Identity rule: the subject is ALWAYS the same small upright cluster of a few
// BEARDED WHEAT EARS — three to four plump grain ears bundled together with
// their long awns/bristles fanning up, tied near the base and standing on a
// turf pad. There is NO stalk below, NO seedling, NO stubble — just the iconic
// harvested ear bundle. Every season shares the SAME silhouette/outline; only
// colour (ripeness) + frost/snow + pad dressing change.
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
  // ears (the grain heads of the bundle)
  grainLight: RGB; // lit grain face colour
  grainDark: RGB; // shaded grain colour
  grainDeep: RGB; // deepest grain shadow colour
  plump: number; // 0..1 how plump/full the grains read (summer peak)
  spread: number; // 0..1 how loose/spread the ears are (autumn looser)
  shedAmt: number; // 0..1 a few grains shedding/falling (autumn)
  // awns (the long bristles fanning up)
  awn: RGB; // awn (bristle) colour
  awnPale: number; // 0..1 paleness of the awn tips (spring pale)
  // tie / binding near the base
  tie: RGB; // colour of the band tying the bundle
  // outline
  outline: RGB; // soft dark outline tint
  // winter dressing
  frostAmt: number; // 0..1 frost dusting sparkle on upward surfaces
  snowCapAmt: number; // 0..1 small snow caps on the upward awns/ears
  // surface gloss / dew
  gloss: number; // 0..1 subtle sheen highlight on the grains / dew
}

// ── Season parameter sets ───────────────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — soft GREEN unripe ears, pale awns, a little dew; bright lime dewy
  // pad + a pale blossom resting on the pad.
  Spring: {
    shadowAmt: 0.5,
    padGrass: [142, 214, 96],
    padGrassDark: [86, 150, 60],
    padSnowAmt: 0,
    blossomAmt: 1,
    fallenLeafAmt: 0,
    grainLight: [176, 210, 110],
    grainDark: [120, 160, 70],
    grainDeep: [86, 122, 48],
    plump: 0.55,
    spread: 0.15,
    shedAmt: 0,
    awn: [196, 220, 140],
    awnPale: 1,
    tie: [150, 192, 96],
    outline: [60, 96, 44],
    frostAmt: 0,
    snowCapAmt: 0,
    gloss: 0.5,
  },
  // Summer — ripe GOLD, plump full ears (PEAK), warm golden awns; saturated
  // green pad, warm light, strong shadow.
  Summer: {
    shadowAmt: 0.7,
    padGrass: [104, 184, 70],
    padGrassDark: [62, 126, 46],
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    grainLight: [248, 206, 92],
    grainDark: [214, 158, 44],
    grainDeep: [160, 108, 24],
    plump: 1,
    spread: 0.1,
    shedAmt: 0,
    awn: [232, 196, 96],
    awnPale: 0.2,
    tie: [206, 150, 56],
    outline: [86, 58, 22],
    frostAmt: 0,
    snowCapAmt: 0,
    gloss: 0.8,
  },
  // Autumn — pale drying gold, the ears a touch looser, a few grains shedding;
  // olive-tan pad + a couple of fallen leaves.
  Autumn: {
    shadowAmt: 0.55,
    padGrass: [158, 150, 78],
    padGrassDark: [112, 96, 50],
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1,
    grainLight: [228, 196, 124],
    grainDark: [188, 150, 78],
    grainDeep: [138, 102, 48],
    plump: 0.7,
    spread: 1,
    shedAmt: 1,
    awn: [206, 178, 110],
    awnPale: 0.45,
    tie: [170, 128, 64],
    outline: [96, 70, 34],
    frostAmt: 0,
    snowCapAmt: 0,
    gloss: 0.45,
  },
  // Winter — frosted ears with small snow caps on the upward awns, cool muted
  // gold; snow-covered pad + frost sparkle. Ears stay CLEARLY visible.
  Winter: {
    shadowAmt: 0.4,
    padGrass: [120, 138, 122],
    padGrassDark: [86, 104, 96],
    padSnowAmt: 1,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    grainLight: [204, 192, 150],
    grainDark: [160, 150, 116],
    grainDeep: [118, 112, 88],
    plump: 0.7,
    spread: 0.35,
    shedAmt: 0,
    awn: [196, 200, 190],
    awnPale: 0.7,
    tie: [150, 150, 142],
    outline: [70, 78, 70],
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
    grainLight: lerpRGB(a.grainLight, b.grainLight, t),
    grainDark: lerpRGB(a.grainDark, b.grainDark, t),
    grainDeep: lerpRGB(a.grainDeep, b.grainDeep, t),
    plump: lerp(a.plump, b.plump, t),
    spread: lerp(a.spread, b.spread, t),
    shedAmt: lerp(a.shedAmt, b.shedAmt, t),
    awn: lerpRGB(a.awn, b.awn, t),
    awnPale: lerp(a.awnPale, b.awnPale, t),
    tie: lerpRGB(a.tie, b.tie, t),
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
    plump: clamp01(p.plump),
    spread: clamp01(p.spread),
    shedAmt: clamp01(p.shedAmt),
    awnPale: clamp01(p.awnPale),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    gloss: clamp01(p.gloss),
  };
}

// Quintic smootherstep, used for transitions (zero velocity at both ends).
const smoother = (x: number): number => x * x * x * (x * (6 * x - 15) + 10);

// ── Shared bundle geometry (IDENTICAL silhouette every season) ──────────────
// Three ears fan out from a single tie point near the base of the pad: a tall
// centre ear and two shorter side ears leaning slightly out. Each ear is a
// vertical spike of grains with long awns fanning above it. The fan ANGLES and
// the tie point are constant for all P (only `spread` nudges the ear lean a
// hair so autumn reads a touch looser — but never changes the read).

const TIE_Y = 13; // where the bundle is tied, sitting on the pad
const TIE_X = 0;

// Per-ear definition: [base-lean angle (rad), ear length, awn length].
// The centre ear is tall and upright; side ears lean out and are shorter.
const EARS: Array<{ lean: number; len: number; awn: number }> = [
  { lean: -0.34, len: 23, awn: 9 }, // left ear
  { lean: 0.0, len: 30, awn: 11 }, // centre ear (tallest)
  { lean: 0.34, len: 23, awn: 9 }, // right ear
];

/** Compute an ear's tip position (the crown where the grains end and the awns
 *  begin), given the bundle's `spread` (autumn looseness) and a small live
 *  `sway` applied to the whole crown. */
function earCrown(
  ear: { lean: number; len: number },
  spread: number,
  sway: number,
): { x: number; y: number; ang: number } {
  // spread nudges the side ears a little further out (max ~0.1 rad extra).
  const ang = ear.lean * (1 + spread * 0.3);
  const x = TIE_X + Math.sin(ang) * ear.len + sway * (0.4 + Math.abs(ear.lean));
  const y = TIE_Y - Math.cos(ang) * ear.len;
  return { x, y, ang };
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

/** The long awns/bristles fanning up above one ear crown. The fan SHAPE is
 *  constant; only colour/paleness + a tiny live shimmer change. */
function awnFan(
  ctx: CanvasRenderingContext2D,
  p: P,
  cx: number,
  cy: number,
  baseAng: number,
  awnLen: number,
  shimmer: number,
): void {
  const col = lerpRGB(p.awn, [248, 250, 236], p.awnPale * 0.5);
  // five bristles fanning out around the ear's axis
  const spreadFan = 0.5; // half-angle of the fan
  for (let i = 0; i < 5; i++) {
    const f = i / 4 - 0.5; // -0.5..0.5
    const a = baseAng + f * spreadFan * 2;
    const len = awnLen * (1 - Math.abs(f) * 0.22);
    const wob = Math.sin(shimmer + i * 1.3) * 0.6 * (0.4 + Math.abs(f));
    const tipX = cx + Math.sin(a) * len + wob;
    const tipY = cy - Math.cos(a) * len;
    // dark base pass
    ctx.strokeStyle = rgb(lerpRGB(p.awn, p.outline, 0.4), 0.8);
    ctx.lineWidth = 1.1;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx + Math.sin(a) * 1.5, cy - Math.cos(a) * 1.5);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    // bright bristle
    ctx.strokeStyle = rgb(col, 0.92);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(cx + Math.sin(a) * 1.5, cy - Math.cos(a) * 1.5);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

/** One ear: a vertical spike of grains running from the tie up to its crown,
 *  drawn as two staggered columns of plump grain lobes. Identity-constant; the
 *  grain size/colour reads ripeness via `plump` + the season palette. */
function ear(
  ctx: CanvasRenderingContext2D,
  p: P,
  spec: { lean: number; len: number; awn: number },
  sway: number,
  glint: number | undefined,
): void {
  const crown = earCrown(spec, p.spread, sway);
  const ang = crown.ang;
  // grains run along the ear axis from near the tie to the crown.
  const nGrains = 6;
  const grainStart = 4; // first grain sits a little above the tie band
  const usable = spec.len - grainStart - 1;

  // soft dark spine first for depth
  ctx.strokeStyle = rgb(p.grainDeep, 0.9);
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(TIE_X + Math.sin(ang) * grainStart, TIE_Y - Math.cos(ang) * grainStart);
  ctx.lineTo(crown.x, crown.y);
  ctx.stroke();
  ctx.lineCap = "butt";

  const grainR = lerp(1.7, 2.7, p.plump); // plumper grains in summer
  for (let i = 0; i < nGrains; i++) {
    const f = i / (nGrains - 1);
    const along = grainStart + f * usable;
    const ax = TIE_X + Math.sin(ang) * along + sway * (along / spec.len) * (0.4 + Math.abs(spec.lean));
    const ay = TIE_Y - Math.cos(ang) * along;
    // two grains per node, staggered left/right of the spine
    [-1, 1].forEach((side) => {
      const ox = Math.cos(ang) * side * (grainR * 0.7);
      const oy = Math.sin(ang) * side * (grainR * 0.7);
      const gx = ax + ox;
      const gy = ay + oy;
      // base lobe
      const grad = ctx.createLinearGradient(gx - 2, gy - 3, gx + 2, gy + 3);
      grad.addColorStop(0, rgb(p.grainLight));
      grad.addColorStop(0.6, rgb(p.grainDark));
      grad.addColorStop(1, rgb(p.grainDeep));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(gx, gy, grainR, grainR * 1.5, ang + side * 0.2, 0, Math.PI * 2);
      ctx.fill();
      // outline
      ctx.strokeStyle = rgb(p.outline, 0.7);
      ctx.lineWidth = 0.7;
      ctx.stroke();
      // small lit highlight (not a bloom) on the upper-left of each grain
      ctx.fillStyle = rgb(lerpRGB(p.grainLight, [255, 255, 255], 0.4 * p.gloss));
      ctx.beginPath();
      ctx.ellipse(gx - 0.7, gy - 0.9, grainR * 0.45, grainR * 0.6, ang, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // travelling warm glint along the grains (summer micro-motion, additive)
  if (glint !== undefined) {
    const along = grainStart + glint * usable;
    const gx = TIE_X + Math.sin(ang) * along;
    const gy = TIE_Y - Math.cos(ang) * along;
    ctx.save();
    const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, 4.5);
    gr.addColorStop(0, "rgba(255,250,210,0.75)");
    gr.addColorStop(1, "rgba(255,250,210,0)");
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.ellipse(gx, gy, 4.5, 3, ang, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // the awn fan above the crown
  awnFan(ctx, p, crown.x, crown.y, ang, spec.awn, sway * 0.5);
}

/** The whole ear bundle (back-to-front: side ears, then centre ear on top),
 *  plus the tie band, plus winter snow caps on the upward awns. */
function bundle(
  ctx: CanvasRenderingContext2D,
  p: P,
  sway: number,
  glint: number | undefined,
): void {
  // draw side ears first (left, right), then the tall centre ear in front.
  ear(ctx, p, EARS[0], sway, glint);
  ear(ctx, p, EARS[2], sway, glint);
  ear(ctx, p, EARS[1], sway, glint);

  // tie band binding the bundle near the base
  ctx.save();
  ctx.fillStyle = rgb(p.tie);
  ctx.strokeStyle = rgb(p.outline, 0.7);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(TIE_X, TIE_Y - 0.5, 4.6, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // a little knot highlight
  ctx.fillStyle = rgb(lerpRGB(p.tie, [255, 255, 255], 0.3));
  ctx.beginPath();
  ctx.ellipse(TIE_X - 1, TIE_Y - 1.4, 1.6, 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // snow caps sitting on the upward awn tips (winter)
  if (p.snowCapAmt > 0.01) {
    ctx.save();
    ctx.globalAlpha = p.snowCapAmt;
    ctx.fillStyle = "#f4f8ff";
    EARS.forEach((spec) => {
      const crown = earCrown(spec, p.spread, sway);
      const a = crown.ang;
      // a small cap near the top of the centre bristle of this ear's fan
      const capX = crown.x + Math.sin(a) * spec.awn * 0.7;
      const capY = crown.y - Math.cos(a) * spec.awn * 0.7;
      ctx.beginPath();
      ctx.ellipse(capX, capY, 2.2, 1.4, a, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
}

/** A few grains shedding / falling from the bundle (autumn dressing). */
function shedGrains(
  ctx: CanvasRenderingContext2D,
  p: P,
  fall: number, // 0..1 live fall progress (additive)
): void {
  if (p.shedAmt < 0.02) return;
  ctx.save();
  ctx.globalAlpha = p.shedAmt;
  // a few grains drifting down toward the pad on staggered phases
  const seeds: Array<[number, number]> = [
    [-6, 0.0],
    [5, 0.45],
    [2, 0.8],
  ];
  const grainR = 1.6;
  seeds.forEach(([sx, phase]) => {
    const prog = (((fall + phase) % 1) + 1) % 1;
    const gy = -2 + prog * 18; // from the lower bundle down toward the pad
    const gx = sx + Math.sin(prog * Math.PI * 2 + phase * 6) * 2;
    const fade = 1 - prog * 0.5;
    ctx.globalAlpha = p.shedAmt * fade;
    ctx.fillStyle = rgb(p.grainDark);
    ctx.beginPath();
    ctx.ellipse(gx, gy, grainR, grainR * 1.4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgb(p.outline, 0.5);
    ctx.lineWidth = 0.5;
    ctx.stroke();
  });
  ctx.restore();
}

/** Frost dusting on the bundle's upward surfaces (winter). */
function frostDust(ctx: CanvasRenderingContext2D, p: P): void {
  if (p.frostAmt < 0.01) return;
  ctx.save();
  ctx.globalAlpha = 0.7 * p.frostAmt;
  ctx.fillStyle = "#eaf3ff";
  // fine pale specks scattered over the lit (upper-left) faces of the ears
  const specks: Array<[number, number]> = [
    [-6, -10], [-3, -2], [-8, 2], [0, -14], [-1, -6],
    [3, -10], [6, -3], [2, 4], [-4, -16],
  ];
  specks.forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

// ── The single parameterized paint ──────────────────────────────────────────
// Draws the WHOLE tile from p + a vertical idle offset `bob` (design px;
// bob=0 = rest pose). Optional micro-dressing args are additive and tiny.

interface Micro {
  awnSway?: number; // awn/ear shimmer-sway (all seasons)
  glint?: number; // 0..1 travelling warm glint along the grains (summer)
  shedFall?: number; // 0..1 falling-grain progress (autumn)
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
  const sway = m.awnSway ?? 0;

  // Pad + ground dressing are drawn at rest (do not bob with the subject).
  contactShadow(ctx, p);
  pad(ctx, p);
  blossom(ctx, p);
  fallenLeaves(ctx, p);

  // Subject bobs as a whole.
  ctx.save();
  ctx.translate(0, bob);

  bundle(ctx, p, sway, m.glint);

  // shedding grains (autumn) move within the subject space
  shedGrains(ctx, p, m.shedFall ?? 0);

  frostDust(ctx, p);

  // faint cold sheen pulse (winter), additive, tiny — over the ears
  if (m.coldSheen !== undefined && m.coldSheen > 0.01) {
    ctx.save();
    ctx.globalAlpha = 0.1 * m.coldSheen;
    ctx.fillStyle = "#cfe6ff";
    ctx.beginPath();
    ctx.ellipse(-1, -4, 9, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // dew shimmer (spring), additive, a tiny pulsing droplet glint
  if (m.dew !== undefined && m.dew > 0.01) {
    ctx.save();
    ctx.globalAlpha = m.dew;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(-3, -4, 0.9 + 0.5 * m.dew, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2, 4, 0.7, 0, Math.PI * 2);
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

function drawWheatSpring(ctx: CanvasRenderingContext2D): void {
  paint(ctx, SP.Spring, 0);
}
function drawWheatSummer(ctx: CanvasRenderingContext2D): void {
  paint(ctx, SP.Summer, 0);
}
function drawWheatAutumn(ctx: CanvasRenderingContext2D): void {
  paint(ctx, SP.Autumn, 0);
}
function drawWheatWinter(ctx: CanvasRenderingContext2D): void {
  paint(ctx, SP.Winter, 0);
}

function animWheatSpring(ctx: CanvasRenderingContext2D, t: number): void {
  // soft awn sway + faint dew shimmer; subject bob is zero at t=0.
  const dew = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.8));
  paint(ctx, SP.Spring, bobAt(t), {
    awnSway: Math.sin(t * 1.5) * 1.4,
    dew,
  });
}

function animWheatSummer(ctx: CanvasRenderingContext2D, t: number): void {
  // soft travelling warm glint cycles 0..1 seamlessly via fractional part of t.
  const glint = (t * 0.45) % 1;
  paint(ctx, SP.Summer, bobAt(t), {
    awnSway: Math.sin(t * 1.4) * 1.2,
    glint,
  });
}

function animWheatAutumn(ctx: CanvasRenderingContext2D, t: number): void {
  // looser ears sway a touch more; a few grains shed on a seamless loop.
  const shedFall = (t / 3.4) % 1;
  paint(ctx, SP.Autumn, bobAt(t), {
    awnSway: Math.sin(t * 1.2) * 1.6,
    shedFall,
  });
}

function animWheatWinter(ctx: CanvasRenderingContext2D, t: number): void {
  // a couple of drifting snowflakes + faint cold sheen; gentle awn sway.
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
    awnSway: Math.sin(t * 0.9) * 0.8,
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
  Spring: { draw: drawWheatSpring, anim: animWheatSpring },
  Summer: { draw: drawWheatSummer, anim: animWheatSummer },
  Autumn: { draw: drawWheatAutumn, anim: animWheatAutumn },
  Winter: { draw: drawWheatWinter, anim: animWheatWinter },
};

export const TRANSITIONS: SeasonalTransitionSet = {
  0: springToSummer,
  1: summerToAutumn,
  2: autumnToWinter,
};
