// Seasonal art for the RICE farm tile (`tile_grain_rice`, category grain).
//
// Identity rule: the subject is ALWAYS the same small BUNDLE of rice grain
// heads — 3–4 slender arching panicles, heavy with little grains and nodding
// over at the tips, bundled upright on a turf pad. There is no stalk below and
// no plant, just the iconic harvested grain-head bundle. Every season shares
// the SAME silhouette/outline; only colour + frost/snow + pad dressing change.
// Ripeness (green-gold → golden → tan → frosted) is colour only.
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
// or libraries. Reads at ~64px. Light from upper-left, soft shadow lower-right.

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
  // tie / sheaf band holding the bundle
  tie: RGB; // straw tie colour
  tieDark: RGB; // tie shaded colour
  // grain (the little rice grains studding each panicle)
  grainLight: RGB; // lit grain colour
  grainDark: RGB; // shaded grain colour
  // panicle stem (the slender arching rachis the grains hang from)
  stemLight: RGB; // lit stem colour
  stemDark: RGB; // shaded stem colour
  // ripeness staging (drives droop + a little shedding/grain size)
  droop: number; // 0..1 how far the heads nod over (heavier = lower)
  shedAmt: number; // 0..1 a few grains shedding / sparser tips (autumn)
  grainPlump: number; // 0..1 how plump/full the grains read
  // outline
  outline: RGB; // soft dark outline tint
  // winter dressing
  frostAmt: number; // 0..1 frost dusting sparkle on upward surfaces
  snowCapAmt: number; // 0..1 snow caps sitting on the heads
  // surface gloss / dew
  gloss: number; // 0..1 subtle sheen highlight on the grains
}

// ── Season parameter sets ───────────────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — fresh lightly-desaturated pastel; bright GREEN-gold young heads,
  // slim grains, a little dew; bright lime dewy pad + a pale blossom.
  Spring: {
    shadowAmt: 0.5,
    padGrass: [142, 214, 96],
    padGrassDark: [86, 150, 60],
    padSnowAmt: 0,
    blossomAmt: 1,
    fallenLeafAmt: 0,
    tie: [186, 206, 132],
    tieDark: [120, 150, 80],
    grainLight: [196, 220, 120],
    grainDark: [136, 168, 78],
    stemLight: [150, 200, 96],
    stemDark: [86, 140, 56],
    droop: 0.32,
    shedAmt: 0,
    grainPlump: 0.55,
    outline: [56, 92, 44],
    frostAmt: 0,
    snowCapAmt: 0,
    gloss: 0.5,
  },
  // Summer — richest, most-saturated palette (PEAK); GOLDEN plump heavy heads
  // nodding lower under the weight; saturated green pad, warm light.
  Summer: {
    shadowAmt: 0.7,
    padGrass: [104, 184, 70],
    padGrassDark: [62, 126, 46],
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    tie: [214, 184, 96],
    tieDark: [156, 122, 52],
    grainLight: [255, 214, 84],
    grainDark: [206, 150, 36],
    stemLight: [206, 184, 92],
    stemDark: [150, 120, 48],
    droop: 0.85,
    shedAmt: 0,
    grainPlump: 1,
    outline: [104, 76, 28],
    frostAmt: 0,
    snowCapAmt: 0,
    gloss: 0.8,
  },
  // Autumn — gold/orange/rust; TAN dried heads, a few grains shedding; olive-tan
  // pad + a couple of fallen leaves.
  Autumn: {
    shadowAmt: 0.55,
    padGrass: [158, 150, 78],
    padGrassDark: [112, 96, 50],
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1,
    tie: [188, 150, 84],
    tieDark: [130, 96, 48],
    grainLight: [220, 180, 108],
    grainDark: [162, 116, 56],
    stemLight: [186, 156, 96],
    stemDark: [128, 96, 50],
    droop: 0.72,
    shedAmt: 1,
    grainPlump: 0.8,
    outline: [86, 60, 30],
    frostAmt: 0,
    snowCapAmt: 0,
    gloss: 0.45,
  },
  // Winter — cool blue-grey light; frosted heads with small snow caps, cool
  // muted tan; snow-covered pad + frost sparkle; heads stay clearly visible.
  Winter: {
    shadowAmt: 0.4,
    padGrass: [120, 138, 122],
    padGrassDark: [86, 104, 96],
    padSnowAmt: 1,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    tie: [170, 162, 132],
    tieDark: [118, 112, 88],
    grainLight: [206, 196, 158],
    grainDark: [150, 142, 112],
    stemLight: [178, 178, 156],
    stemDark: [120, 124, 104],
    droop: 0.6,
    shedAmt: 0.2,
    grainPlump: 0.75,
    outline: [70, 74, 64],
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
    tie: lerpRGB(a.tie, b.tie, t),
    tieDark: lerpRGB(a.tieDark, b.tieDark, t),
    grainLight: lerpRGB(a.grainLight, b.grainLight, t),
    grainDark: lerpRGB(a.grainDark, b.grainDark, t),
    stemLight: lerpRGB(a.stemLight, b.stemLight, t),
    stemDark: lerpRGB(a.stemDark, b.stemDark, t),
    droop: lerp(a.droop, b.droop, t),
    shedAmt: lerp(a.shedAmt, b.shedAmt, t),
    grainPlump: lerp(a.grainPlump, b.grainPlump, t),
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
    droop: clamp01(p.droop),
    shedAmt: clamp01(p.shedAmt),
    grainPlump: clamp01(p.grainPlump),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    gloss: clamp01(p.gloss),
  };
}

// Quintic smootherstep, used for transitions (zero velocity at both ends).
const smoother = (x: number): number => x * x * x * (x * (6 * x - 15) + 10);

// ── Shared bundle geometry (IDENTICAL silhouette every season) ──────────────
// Four panicles fan up from a tie band near the pad, each arching over and
// nodding at its tip. Each panicle is defined by a base x at the tie, a fan
// angle, and a length; the `droop` param only curls the tip lower along the
// SAME arc, so the bundle footprint/extent stays constant.

const TIE_Y = 12; // the straw tie sits just above the pad
const TIE_X = 0; // bundle is centred

interface Panicle {
  baseX: number; // x where it leaves the tie
  spread: number; // how far the arch leans out (px at the apex)
  len: number; // arc length up before nodding
  apexY: number; // height of the apex (negative = up)
  side: number; // -1 nods left, +1 nods right
  grains: number; // grains studding this head
}

// Ordered back-to-front so nearer heads overlap farther ones a touch.
const PANICLES: Panicle[] = [
  { baseX: -2.5, spread: -9.5, len: 30, apexY: -19, side: -1, grains: 9 }, // back-left
  { baseX: 2.5, spread: 9.5, len: 30, apexY: -19, side: 1, grains: 9 }, // back-right
  { baseX: -1, spread: -4.5, len: 34, apexY: -23, side: -1, grains: 10 }, // tall centre-left
  { baseX: 1.5, spread: 5.5, len: 32, apexY: -22, side: 1, grains: 10 }, // centre-right
];

/** Returns the apex point and the nodding tip point of a panicle's arch for a
 *  given droop. The apex stays fixed; the tip curls down/out as droop rises so
 *  the classic nodding rice head forms without changing the overall extent. */
function panicleGeom(pan: Panicle, droop: number) {
  const apexX = TIE_X + pan.spread;
  const apexY = pan.apexY;
  // The tip nods beyond the apex, curling over and downward with droop.
  const tipX = apexX + pan.side * (1.5 + droop * 5);
  const tipY = apexY + 3 + droop * 11;
  // A control point pulling the upper arc toward the tie at the base.
  const baseX = TIE_X + pan.baseX;
  return { apexX, apexY, tipX, tipY, baseX };
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

/** One arching rice panicle: a slender stem from the tie up to an apex, then
 *  nodding over to its tip, studded with little grains. `sway` bends the upper
 *  arc/tip horizontally (idle motion); `glint` (0..1) lights a travelling band
 *  of grains for summer. The arc EXTENT is constant; droop only curls the tip. */
function panicle(
  ctx: CanvasRenderingContext2D,
  p: P,
  pan: Panicle,
  sway: number,
  glint: number | undefined,
): void {
  const g = panicleGeom(pan, p.droop);
  const swayApex = sway * 0.55;
  const swayTip = sway; // tip swings most
  const apexX = g.apexX + swayApex;
  const tipX = g.tipX + swayTip;

  // The rachis (stem) path: tie → apex → nod to tip.
  const stemPath = (): void => {
    ctx.beginPath();
    ctx.moveTo(g.baseX, TIE_Y);
    ctx.quadraticCurveTo(g.baseX + (apexX - g.baseX) * 0.35, -2, apexX, g.apexY);
    ctx.quadraticCurveTo(
      apexX + (tipX - apexX) * 0.6,
      g.apexY + 1,
      tipX,
      g.tipY,
    );
  };

  // dark stem base pass
  ctx.strokeStyle = rgb(p.stemDark);
  ctx.lineWidth = 2.1;
  ctx.lineCap = "round";
  stemPath();
  ctx.stroke();
  // lit stem overlay
  ctx.strokeStyle = rgb(p.stemLight);
  ctx.lineWidth = 1.0;
  stemPath();
  ctx.stroke();

  // Grains studding the upper arc, spaced from just below the apex to the tip,
  // alternating to each side of the rachis like a real panicle. They get
  // sparser toward the tip when shedding (autumn).
  const n = pan.grains;
  const plump = 0.6 + p.grainPlump * 0.7; // grain radius scale
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1); // 0 near apex region, 1 at tip
    // Sample a point along the apex→tip arc (the nodding head).
    const ax = apexX + (tipX - apexX) * u;
    const ay = g.apexY + (g.tipY - g.apexY) * u;
    // curve bow on the arc so grains hug the nodding head shape
    const bow = Math.sin(u * Math.PI) * 2.2;
    const gx = ax + pan.side * bow * 0.3;
    const gy = ay - bow;
    // a few tip grains drop out when shedding
    if (p.shedAmt > 0.5 && u > 0.72 && (i % 2 === 0)) continue;
    // alternate the grain to a side of the rachis
    const off = (i % 2 === 0 ? 1 : -1) * (1.3 + u * 0.6);
    const fx = gx + off;
    const fy = gy + Math.abs(off) * 0.15;
    const r = (1.0 + (1 - u) * 0.5) * plump;

    // grain body (a little teardrop ellipse), shaded then lit
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(pan.side * 0.5 + u * pan.side * 0.4);
    ctx.fillStyle = rgb(p.grainDark);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.95, r * 1.7, 0, 0, Math.PI * 2);
    ctx.fill();
    let face = p.grainLight;
    // travelling glint band (summer): brighten grains near the sweep
    if (glint !== undefined) {
      const band = Math.abs(u - glint);
      if (band < 0.16) {
        face = lerpRGB(p.grainLight, [255, 252, 224], (1 - band / 0.16) * 0.8);
      }
    }
    ctx.fillStyle = rgb(face);
    ctx.beginPath();
    ctx.ellipse(-0.35, -0.3, r * 0.6, r * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // tiny lit speck (gloss), never a bloom
    ctx.fillStyle = rgb(lerpRGB(face, [255, 255, 255], 0.5 * p.gloss));
    ctx.beginPath();
    ctx.ellipse(-0.4, -0.6, r * 0.3, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // an awn (tiny bristle) off the topmost couple of grains near the apex
    if (i < 2) {
      ctx.strokeStyle = rgb(p.stemDark, 0.7);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(fx, fy - r);
      ctx.lineTo(fx + pan.side * 1.4, fy - r - 3.5);
      ctx.stroke();
    }
  }
}

/** The straw tie band gathering the bundle just above the pad. */
function tieBand(ctx: CanvasRenderingContext2D, p: P): void {
  ctx.save();
  // dark backing
  ctx.fillStyle = rgb(p.tieDark);
  ctx.beginPath();
  ctx.ellipse(TIE_X, TIE_Y, 4.6, 3.0, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit front band
  ctx.fillStyle = rgb(p.tie);
  ctx.beginPath();
  ctx.moveTo(TIE_X - 4.4, TIE_Y - 1.6);
  ctx.quadraticCurveTo(TIE_X, TIE_Y - 2.4, TIE_X + 4.4, TIE_Y - 1.6);
  ctx.quadraticCurveTo(TIE_X + 5.0, TIE_Y, TIE_X + 4.2, TIE_Y + 2.0);
  ctx.quadraticCurveTo(TIE_X, TIE_Y + 1.2, TIE_X - 4.2, TIE_Y + 2.0);
  ctx.quadraticCurveTo(TIE_X - 5.0, TIE_Y, TIE_X - 4.4, TIE_Y - 1.6);
  ctx.closePath();
  ctx.fill();
  // a couple of binding lines
  ctx.strokeStyle = rgb(p.tieDark, 0.85);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(TIE_X - 4, TIE_Y - 0.4);
  ctx.quadraticCurveTo(TIE_X, TIE_Y - 1.2, TIE_X + 4, TIE_Y - 0.4);
  ctx.moveTo(TIE_X - 4, TIE_Y + 1.2);
  ctx.quadraticCurveTo(TIE_X, TIE_Y + 0.4, TIE_X + 4, TIE_Y + 1.2);
  ctx.stroke();
  // a short loose straw end poking down-right
  ctx.strokeStyle = rgb(p.tie);
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(TIE_X + 3, TIE_Y + 1.5);
  ctx.quadraticCurveTo(TIE_X + 5.5, TIE_Y + 4, TIE_X + 5, TIE_Y + 6.5);
  ctx.stroke();
  ctx.lineCap = "butt";
  // soft outline around the tie
  ctx.strokeStyle = rgb(p.outline, 0.8);
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.ellipse(TIE_X, TIE_Y, 4.6, 3.0, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** A couple of shed grains resting on the pad (autumn). */
function shedGrains(ctx: CanvasRenderingContext2D, p: P): void {
  if (p.shedAmt < 0.3) return;
  ctx.save();
  ctx.globalAlpha = clamp01(p.shedAmt);
  const drops: Array<[number, number, number]> = [
    [7, 17, 0.6],
    [-6, 18.5, -0.4],
    [12, 16.5, 0.9],
  ];
  drops.forEach(([dx, dy, rot]) => {
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(rot);
    ctx.fillStyle = rgb(p.grainDark);
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.0, 1.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(p.grainLight);
    ctx.beginPath();
    ctx.ellipse(-0.3, -0.3, 0.6, 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  ctx.restore();
}

/** Frost dusting + small snow caps on the heads' upward surfaces (winter). */
function frostAndSnow(ctx: CanvasRenderingContext2D, p: P, sway: number): void {
  // small snow caps cresting each nodding head
  if (p.snowCapAmt > 0.01) {
    ctx.save();
    ctx.globalAlpha = p.snowCapAmt;
    PANICLES.forEach((pan) => {
      const g = panicleGeom(pan, p.droop);
      const swayTip = sway;
      const capX = (g.apexX + g.tipX) / 2 + swayTip * 0.7;
      const capY = (g.apexY + g.tipY) / 2 - 2.4;
      const cap = ctx.createLinearGradient(capX, capY - 3, capX, capY + 2);
      cap.addColorStop(0, "#ffffff");
      cap.addColorStop(1, "#dbe6f2");
      ctx.fillStyle = cap;
      ctx.beginPath();
      ctx.ellipse(capX, capY, 3.2, 1.8, pan.side * 0.4, 0, Math.PI * 2);
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
      [-7, -16], [-3, -12], [-9, -9], [4, -17], [2, -13],
      [7, -11], [-1, -20], [-5, -6],
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
  sway?: number; // gentle head sway (px) applied to the panicle arcs
  glint?: number; // 0..1 travelling warm glint position along the heads (summer)
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
  const sway = m.sway ?? 0;

  // Pad + ground dressing are drawn at rest (do not bob with the subject).
  contactShadow(ctx, p);
  pad(ctx, p);
  blossom(ctx, p);
  fallenLeaves(ctx, p);
  shedGrains(ctx, p);

  // Subject bobs as a whole.
  ctx.save();
  ctx.translate(0, bob);

  // Panicles back-to-front; nearer panicles sway a touch more for parallax.
  PANICLES.forEach((pan, i) => {
    const local = sway * (0.7 + i * 0.16);
    panicle(ctx, p, pan, local, m.glint);
  });

  tieBand(ctx, p);
  frostAndSnow(ctx, p, sway);

  // faint cold sheen pulse (winter), additive, tiny — over the heads
  if (m.coldSheen !== undefined && m.coldSheen > 0.01) {
    ctx.save();
    ctx.globalAlpha = 0.1 * m.coldSheen;
    ctx.fillStyle = "#cfe6ff";
    ctx.beginPath();
    ctx.ellipse(0, -14, 13, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // dew shimmer (spring), additive, a tiny pulsing droplet glint on a grain
  if (m.dew !== undefined && m.dew > 0.01) {
    ctx.save();
    ctx.globalAlpha = m.dew;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(-4, -15, 0.8 + 0.5 * m.dew, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -13, 0.6, 0, Math.PI * 2);
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

function drawRiceSpring(ctx: CanvasRenderingContext2D): void {
  paint(ctx, SP.Spring, 0);
}
function drawRiceSummer(ctx: CanvasRenderingContext2D): void {
  paint(ctx, SP.Summer, 0);
}
function drawRiceAutumn(ctx: CanvasRenderingContext2D): void {
  paint(ctx, SP.Autumn, 0);
}
function drawRiceWinter(ctx: CanvasRenderingContext2D): void {
  paint(ctx, SP.Winter, 0);
}

function animRiceSpring(ctx: CanvasRenderingContext2D, t: number): void {
  // soft head sway + faint dew shimmer; subject bob is zero at t=0.
  const dew = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.8));
  paint(ctx, SP.Spring, bobAt(t), {
    sway: Math.sin(t * 1.5) * 1.1,
    dew,
  });
}

function animRiceSummer(ctx: CanvasRenderingContext2D, t: number): void {
  // travelling warm glint runs apex→tip along the grains, seamless via frac(t).
  const glint = (t * 0.4) % 1;
  paint(ctx, SP.Summer, bobAt(t), {
    sway: Math.sin(t * 1.3) * 1.3,
    glint,
  });
}

function animRiceAutumn(ctx: CanvasRenderingContext2D, t: number): void {
  // heavy dried heads sway slowly; seamless via sin.
  paint(ctx, SP.Autumn, bobAt(t), {
    sway: Math.sin(t * 1.1) * 1.0,
  });
}

function animRiceWinter(ctx: CanvasRenderingContext2D, t: number): void {
  // a couple of drifting snowflakes + faint cold sheen + slow sway.
  const seeds: Array<[number, number, number]> = [
    [-6, 1.1, 0.0],
    [7, 0.9, 0.5],
  ];
  const span = 38;
  const flakes: Array<[number, number, number]> = seeds.map(([fx, r, phase]) => {
    const prog = (((t / 3.6 + phase) % 1) + 1) % 1;
    const fy = -22 + prog * span;
    const driftX = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
    return [driftX, fy, r];
  });
  const coldSheen = 0.5 + 0.5 * Math.sin(t * 0.8);
  paint(ctx, SP.Winter, bobAt(t), {
    sway: Math.sin(t * 0.9) * 0.7,
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
  Spring: { draw: drawRiceSpring, anim: animRiceSpring },
  Summer: { draw: drawRiceSummer, anim: animRiceSummer },
  Autumn: { draw: drawRiceAutumn, anim: animRiceAutumn },
  Winter: { draw: drawRiceWinter, anim: animRiceWinter },
};

export const TRANSITIONS: SeasonalTransitionSet = {
  0: springToSummer,
  1: summerToAutumn,
  2: autumnToWinter,
};
