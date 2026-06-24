// Production seasonal art for the MEADOW GRASS tile (`tile_grass_meadow`).
//
// A flowery grassland clump: a dense fan of tall mixed grass blades WITH a few
// prominent WILDFLOWERS on slender stems rising from the centre — richer than
// the plain grass tile. The SAME meadow silhouette (blade fan + flower stems +
// pad) is drawn every season (identity-safe); the seasons swing hard on colour
// plus real seasonal props (open wildflowers / seed-heads / fallen leaf / snow +
// base snow + frost), and the idle is lively rather than subtle:
//
//   IDLE COMMON  (~6s, win ~0.95s): a WIND WAVE — the grasses and flower heads
//       bend ~12–16 design-px in a traveling-wave sway, phase-offset per blade so
//       the tuft ripples, with a small base squash. Pivots at the base.
//       Zero velocity at the window edges (seamless).
//   IDLE SPECIAL (~18s, win ~1.3s): a VISITING BEE — a fuzzy striped bee flits in
//       from the right, swoops down to a wildflower head, bobs/hovers a beat to
//       sip, then flits off up-left and fades. The BOLD rare beat. The bee + its
//       soft additive pollen-glow are alpha-enveloped to 0 at both window edges
//       (so it is invisible at t=0 and at the loop seam — seamless). The bee
//       body is drawn over the tuft; the glow is the additive overlay layer.
//
// The architecture is a single parameterized `paint(ctx, p, pose)` where
// `interface P` holds tweenable season params (colours + 0..1 prop amounts) and
// `pose` holds the idle gesture (bob / lean / squash / wave / bee). Because
// every season is the same paint with tweened P, transitions are seamless:
//   transition(0) ≡ draw(from), transition(1) ≡ draw(to).
// REST pose has all zeros, so draw(season) = paint(ctx, SP[season], REST) and the
// idle's pose is 0 at every action-window edge → seamless loop.
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
  bladeLight: RGB;       // lit face of the meadow-grass blades
  bladeMid: RGB;         // body tone of the blades
  bladeDark: RGB;        // shadowed base / back blades
  stem: RGB;             // slender flower stem
  petal: RGB;            // wildflower petal colour
  petalDark: RGB;        // shaded petal side
  centre: RGB;           // flower centre / seed-head core
  padGrass: RGB;         // top of the grass pad
  padDark: RGB;          // shaded pad underside
  soil: RGB;             // contact / base soil under the tuft
  outline: RGB;          // soft dark outline tint
  light: RGB;            // ambient light tint laid over the whole tile
  lightAmt: number;      // 0..1 strength of the ambient light wash
  lushness: number;      // 0..1 thickness / extra back blades (summer peak)
  dryness: number;       // 0..1 stalks dry & droop, seed-heads form (autumn)
  flowerAmt: number;     // 0..1 OPEN wildflower heads (the meadow signature)
  seedHeadAmt: number;   // 0..1 flowers turned to fluffy seed-heads (autumn)
  gloss: number;         // 0..1 soft summer shimmer on the blades
  frostAmt: number;      // 0..1 cool frost dusting on the tuft (winter)
  snowCapAmt: number;    // 0..1 snow weighing the stalks / blade crown (winter)
  padSnowAmt: number;    // 0..1 snow blanket / drift on the pad (winter)
  blossomAmt: number;    // 0..1 tiny pad blossoms (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad (autumn)
}

/** The visiting-bee state for the rare idle (separate from season identity).
 *  `alpha` envelopes the WHOLE pollinator (body + additive glow) to 0 at the
 *  window edges, so it is invisible at t=0 and at the loop seam. */
interface BeeState {
  alpha: number; // 0..1 overall pollinator visibility (0 at window edges)
  x: number;     // bee centre x (design px), origin-centered
  y: number;     // bee centre y
  flap: number;  // wing-flap width factor (fast)
  tilt: number;  // body tilt, radians
  clock: number; // continuous local time for wing/antennae micro-motion
}

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number;      // vertical offset in design px (negative = up)
  lean: number;     // base lean, radians (whole tuft tips side to side)
  squashX: number;  // additive horizontal scale (+0.18 = 18% wider)
  squashY: number;  // additive vertical scale (+0.18 = 18% taller)
  wave: number;     // -1..1 wind-wave amplitude scalar (drives traveling sway)
  wavePhase: number; // radians — travel phase of the wind wave across the tuft
  bee: BeeState;    // the rare visiting bee (alpha 0 = absent)
}

const REST: Pose = {
  bob: 0, lean: 0, squashX: 0, squashY: 0,
  wave: 0, wavePhase: 0,
  bee: { alpha: 0, x: 0, y: 0, flap: 0.5, tilt: 0, clock: 0 },
};

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
    bladeLight: lerpRGB(a.bladeLight, b.bladeLight, t),
    bladeMid: lerpRGB(a.bladeMid, b.bladeMid, t),
    bladeDark: lerpRGB(a.bladeDark, b.bladeDark, t),
    stem: lerpRGB(a.stem, b.stem, t),
    petal: lerpRGB(a.petal, b.petal, t),
    petalDark: lerpRGB(a.petalDark, b.petalDark, t),
    centre: lerpRGB(a.centre, b.centre, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    lushness: lerp(a.lushness, b.lushness, t),
    dryness: lerp(a.dryness, b.dryness, t),
    flowerAmt: lerp(a.flowerAmt, b.flowerAmt, t),
    seedHeadAmt: lerp(a.seedHeadAmt, b.seedHeadAmt, t),
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
    lushness: clamp01(p.lushness),
    dryness: clamp01(p.dryness),
    flowerAmt: clamp01(p.flowerAmt),
    seedHeadAmt: clamp01(p.seedHeadAmt),
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
  // Spring — fresh dewy lime meadow with the FIRST wildflowers opening BRIGHT
  // (its signature). Cool-bright pastel light, dewy lime pad, lots of pad
  // blossoms. The bloom colour is pushed vivid so spring reads at a glance.
  Spring: {
    bladeLight: [176, 236, 116],
    bladeMid: [104, 192, 72],
    bladeDark: [48, 122, 50],
    stem: [120, 188, 84],
    petal: [255, 196, 234],
    petalDark: [224, 132, 196],
    centre: [255, 214, 80],
    padGrass: [136, 222, 92],
    padDark: [64, 150, 60],
    soil: [120, 84, 48],
    outline: [32, 64, 28],
    light: [230, 250, 220],
    lightAmt: 0.18,
    lushness: 0.45,
    dryness: 0,
    flowerAmt: 1.0,
    seedHeadAmt: 0,
    gloss: 0.26,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 1.0,
    fallenLeafAmt: 0,
  },
  // Summer — LUSH peak meadow (PEAK): thick deep saturated green with ABUNDANT
  // hot-coloured wildflowers, high gloss, warm bright light. The richest swing.
  Summer: {
    bladeLight: [142, 214, 84],
    bladeMid: [72, 168, 56],
    bladeDark: [34, 110, 42],
    stem: [78, 154, 56],
    petal: [255, 120, 78],
    petalDark: [210, 64, 80],
    centre: [255, 208, 64],
    padGrass: [74, 174, 66],
    padDark: [36, 112, 48],
    soil: [126, 86, 48],
    outline: [26, 70, 24],
    light: [255, 246, 196],
    lightAmt: 0.22,
    lushness: 1.0,
    dryness: 0,
    flowerAmt: 1.0,
    seedHeadAmt: 0,
    gloss: 1.0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — DRY RUST-GOLD meadow gone to seed: amber/straw blades with rust
  // tips, flowers fully turned to fluffy seed-heads, fallen leaves, dulled gloss,
  // low amber light. Pushed warmer/rustier so the seeding read is unmistakable.
  Autumn: {
    bladeLight: [226, 174, 84],
    bladeMid: [188, 132, 56],
    bladeDark: [122, 80, 36],
    stem: [184, 150, 82],
    petal: [210, 176, 112],
    petalDark: [156, 120, 68],
    centre: [202, 162, 88],
    padGrass: [164, 150, 78],
    padDark: [108, 92, 46],
    soil: [118, 74, 40],
    outline: [70, 46, 22],
    light: [252, 196, 124],
    lightAmt: 0.26,
    lushness: 0.22,
    dryness: 1.0,
    flowerAmt: 0,
    seedHeadAmt: 1.0,
    gloss: 0.28,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1.0,
  },
  // Winter — meadow under SNOW: bleached straw stalks (still clearly straw, NOT
  // whited-out), bold snow blanket/drift on the pad + snow weighing the dried
  // stalks, strong frost, cool blue-grey light. A dried seed-head still pokes
  // through. Frost is pushed for a colder read while the tuft stays visible.
  Winter: {
    bladeLight: [192, 186, 158],
    bladeMid: [150, 142, 118],
    bladeDark: [100, 96, 82],
    stem: [172, 164, 140],
    petal: [196, 192, 176],
    petalDark: [146, 142, 128],
    centre: [172, 164, 138],
    padGrass: [190, 210, 228],
    padDark: [118, 148, 178],
    soil: [128, 110, 96],
    outline: [52, 52, 56],
    light: [198, 222, 255],
    lightAmt: 0.4,
    lushness: 0.18,
    dryness: 0.55,
    flowerAmt: 0,
    seedHeadAmt: 0.35,
    gloss: 0.16,
    frostAmt: 0.92,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Meadow geometry — the SAME silhouette every season ───────────────────────

const TUFT_BASE_Y = 18;  // contact line on the pad
const TUFT_TOP = -7;     // tip line of the tall blade fan
const STEM_TOP = -22;    // top of the wildflower stems (upright reach)
const PIVOT_Y = TUFT_BASE_Y; // wind wave + lean pivot at the base

// Blade fan: [baseX, tipX, tipY, layer] (layer 0 = back/dark, 1 = front/light).
const BLADES: Array<[number, number, number, number]> = [
  [-13, -17, -2, 0],
  [-9, -13, -7.5, 0],
  [-5, -8, -11, 1],
  [-2, -3.5, TUFT_TOP, 1],
  [0.5, 1, TUFT_TOP - 1.5, 1],
  [3.2, 5.5, -10, 1],
  [7, 11, -7, 0],
  [10.5, 15, -3, 0],
  [13.5, 18, -1, 0],
];

// Extra back blades that only fill in as `lushness` rises (peak summer).
const LUSH_BLADES: Array<[number, number, number]> = [
  [-11, -14, -4.5],
  [-6.5, -9.5, -8.5],
  [4.5, 7.5, -8],
  [9, 12.5, -5],
];

// Wildflower stems: [baseX, headX, layer]. headY from STEM_TOP + a small var.
const FLOWERS: Array<[number, number, number]> = [
  [-4.4, -6.2, 0],
  [-1.0, -0.6, 1],
  [2.0, 3.2, 1],
  [4.8, 6.6, 0],
];

// ── The single parameterized paint ───────────────────────────────────────────

/** Draw one wildflower stem + its head (open petals or seed-head), driven by
 *  `p`. `wave` is a horizontal tip offset (wind), `bend` lowers/leans the head. */
function drawFlower(
  ctx: CanvasRenderingContext2D,
  p: P,
  baseX: number,
  headX: number,
  layer: number,
  wave: number,
): void {
  const baseY = TUFT_BASE_Y - 4;
  // dryness bows the head over and lowers it a touch (autumn going to seed)
  const droopX = headX + p.dryness * 5 * Math.sign(headX || 1);
  const headY = STEM_TOP + p.dryness * 6 + Math.abs(baseX) * 0.4;
  const tipX = droopX + wave;
  const midX = lerp(baseX, tipX, 0.5) + wave * 0.5 + p.dryness * 2 * Math.sign(headX || 1);
  const midY = lerp(baseY, headY, 0.5);

  const stemCol = layer === 0 ? rgba(p.stem, 0.9) : rgb(p.stem);

  // dark base pass (outline) then bright stem — layered for depth
  ctx.strokeStyle = rgba(p.outline, 0.85);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(midX, midY, tipX, headY);
  ctx.stroke();

  ctx.strokeStyle = stemCol;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(midX, midY, tipX, headY);
  ctx.stroke();

  const tilt = p.dryness * 0.5 * Math.sign(headX || 1);
  ctx.save();
  ctx.translate(tipX, headY - 1.6);
  ctx.rotate(tilt);

  // OPEN wildflower head (spring/summer signature) — fades with flowerAmt.
  if (p.flowerAmt > 0.02) {
    const a = p.flowerAmt;
    ctx.globalAlpha = a;
    // petal ring
    ctx.fillStyle = rgb(p.petal);
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(ang) * 2.4, Math.sin(ang) * 2.4, 1.6, 1.1, ang, 0, Math.PI * 2);
      ctx.fill();
    }
    // shaded lower petals
    ctx.fillStyle = rgba(p.petalDark, 0.7);
    for (let k = 2; k < 5; k++) {
      const ang = (k / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(ang) * 2.4, Math.sin(ang) * 2.4 + 0.4, 1.3, 0.9, ang, 0, Math.PI * 2);
      ctx.fill();
    }
    // bright centre disc
    ctx.fillStyle = rgb(p.centre);
    ctx.beginPath();
    ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.5 * a);
    ctx.beginPath();
    ctx.arc(-0.5, -0.5, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // SEED-HEAD (autumn) and/or bare dried head (winter) — fluffy oval.
  if (p.seedHeadAmt > 0.02) {
    const a = p.seedHeadAmt;
    ctx.globalAlpha = a;
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.4, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(p.centre);
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.8, 3.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.petalDark, 0.6);
    ctx.beginPath();
    ctx.ellipse(0.6, 0.4, 1.0, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // loose fluff specks above
    ctx.fillStyle = rgba([238, 226, 196], 0.55 * a);
    ([[-1.6, -3.2], [1.4, -3.6], [0, -4.4]] as Array<[number, number]>).forEach(([fx, fy]) => {
      ctx.beginPath();
      ctx.arc(fx, fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ── The visiting bee (rare idle) ─────────────────────────────────────────────
// A fuzzy striped honeybee: translucent fast-flapping wings, a banded gold/black
// body, head + eye + twitching antennae — mirrors the on-model bee craft. Drawn
// at the bee's current (x,y), enveloped by `bee.alpha` (0 at the window edges →
// invisible at t=0). A soft pollen-glow halo is laid down ADDITIVELY first; the
// body is then drawn in normal blend so the critter stays crisp and readable.
function drawBee(ctx: CanvasRenderingContext2D, bee: BeeState): void {
  const a = clamp01(bee.alpha);
  if (a <= 0.01) return;
  const t = safeNum(bee.clock);
  const flap = safeNum(bee.flap);

  ctx.save();
  try {
    ctx.translate(safeNum(bee.x), safeNum(bee.y));

    // 1) soft pollen-glow halo — ADDITIVE overlay (the prompt's additive layer).
    //    Warm, low-alpha, scaled by the envelope so it never blows out the tile.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(0, 0, 0.5, 0, 0, 9);
    glow.addColorStop(0, rgba([255, 226, 130], 0.5 * a));
    glow.addColorStop(0.5, rgba([255, 200, 90], 0.22 * a));
    glow.addColorStop(1, rgba([255, 200, 90], 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    // a couple of drifting pollen sparkles trailing the bee
    ctx.fillStyle = rgba([255, 244, 196], 0.6 * a);
    ([[3.6, 2.6, 0.9], [5.2, -1.0, 0.7], [-3.2, 3.4, 0.6]] as Array<[number, number, number]>)
      .forEach(([sx, sy, r]) => {
        const tw = 0.6 + 0.4 * Math.sin(t * 7 + sx);
        ctx.globalAlpha = a * tw;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      });
    ctx.globalAlpha = 1;
    ctx.restore();

    // 2) the bee body — normal blend, crisp. Scaled to sit against the tile.
    ctx.save();
    ctx.globalAlpha = a;
    ctx.scale(0.46, 0.46);
    ctx.rotate(safeNum(bee.tilt) + Math.sin(t * 1.3) * 0.05);
    ctx.lineJoin = "round";

    // wings — translucent, behind the body, flapping fast
    ([-1, 1] as const).forEach((side) => {
      ctx.save();
      ctx.translate(-2, -6);
      ctx.scale(side * flap, 1);
      const wing = ctx.createLinearGradient(0, -8, 10, 0);
      wing.addColorStop(0, "rgba(232,246,255,0.72)");
      wing.addColorStop(1, "rgba(184,212,236,0.4)");
      ctx.fillStyle = wing;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(4, -12, 16, -14, 18, -6);
      ctx.bezierCurveTo(18, -1, 8, 2, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(120,150,180,0.6)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    });

    // body — fuzzy gold oval with a dark outline
    const body = ctx.createRadialGradient(-4, -2, 2, 0, 4, 16);
    body.addColorStop(0, "#ffe082");
    body.addColorStop(0.6, "#f5b400");
    body.addColorStop(1, "#a06a00");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 4, 13, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3a2606";
    ctx.lineWidth = 2;
    ctx.stroke();

    // stripes (clipped to the body)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 4, 13, 10, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#2a1c04";
    [-2, 6].forEach((x) => {
      ctx.beginPath();
      ctx.ellipse(x, 4, 2.6, 11, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // stinger
    ctx.fillStyle = "#2a1c04";
    ctx.beginPath();
    ctx.moveTo(12, 4);
    ctx.lineTo(17, 4);
    ctx.lineTo(12, 7);
    ctx.closePath();
    ctx.fill();

    // head + eye
    ctx.fillStyle = "#2a1c04";
    ctx.beginPath();
    ctx.arc(-12, 1, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff8e0";
    ctx.beginPath();
    ctx.arc(-13, 0, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0a0e04";
    ctx.beginPath();
    ctx.arc(-13.4, 0.3, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // antennae — slight twitch
    const ant = Math.sin(t * 6) * 0.8;
    ctx.strokeStyle = "#2a1c04";
    ctx.lineWidth = 1.2;
    [-1.4, -3].forEach((d) => {
      ctx.beginPath();
      ctx.moveTo(-15, -2);
      ctx.quadraticCurveTo(-19, -7 + d, -20, -8 + d - ant);
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
    ctx.restore();
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

/** The whole tile from ONLY `p` (season identity) and `pose` (idle gesture). */
function paint(ctx: CanvasRenderingContext2D, raw: P, rawPose: Pose): void {
  const p = clampP(raw);
  const rawBee = rawPose.bee ?? REST.bee;
  const pose: Pose = {
    bob: safeNum(rawPose.bob),
    lean: safeNum(rawPose.lean),
    squashX: safeNum(rawPose.squashX),
    squashY: safeNum(rawPose.squashY),
    wave: safeNum(rawPose.wave),
    wavePhase: safeNum(rawPose.wavePhase),
    bee: {
      alpha: clamp01(safeNum(rawBee.alpha)),
      x: safeNum(rawBee.x),
      y: safeNum(rawBee.y),
      flap: safeNum(rawBee.flap),
      tilt: safeNum(rawBee.tilt),
      clock: safeNum(rawBee.clock),
    },
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

    // pad snow blanket / drift (winter)
    if (p.padSnowAmt > 0.01) {
      ctx.fillStyle = rgba([244, 250, 255], 0.92 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(0, 18.4, 17.4 * (0.6 + 0.4 * p.padSnowAmt), 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      // a bolder drift mounding up on the left
      ctx.fillStyle = rgba([248, 252, 255], 0.85 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(-8, 16.6, 8, 3.6, -0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([210, 226, 244], 0.5 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(2, 20, 16, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.padSnowAmt);
      ([[-9, 17.0], [5, 19], [11, 17.4], [-3, 20]] as Array<[number, number]>).forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // tiny blossoms on the pad (spring)
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
        [-12, 19.6, -0.5, [200, 122, 40]],
        [12, 18.6, 0.7, [178, 70, 30]],
      ];
      leaves.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgba(col, a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.4, 1.9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba([90, 44, 16], a);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-3.2, 0);
        ctx.lineTo(3.2, 0);
        ctx.stroke();
        ctx.restore();
      });
    }

    // ── Soil contact patch + contact shadow (follow the lean for grounding) ──
    const tipShift = pose.lean * (PIVOT_Y - TUFT_TOP);
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, TUFT_BASE_Y + 1.5, 8, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.28);
    ctx.beginPath();
    ctx.ellipse(2.5 + tipShift * 0.18, TUFT_BASE_Y + 2, 11, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the meadow tuft, under the idle pose transform ──────────────
    // Pivot at the base so lean + wind bend the TOP and squash anchors at the
    // base (it "sits" on the pad). bob raises the whole tuft.
    ctx.save();
    ctx.translate(0, PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(0, -PIVOT_Y);

    const baseY = TUFT_BASE_Y;

    // Per-element traveling-wave wind offset. Phase travels across x so blades
    // ripple rather than slide together. Amplitude scales with height fraction.
    const waveAt = (x: number, tipY: number): number => {
      if (pose.wave === 0) return 0;
      const heightFrac = (baseY - tipY) / (baseY - STEM_TOP);
      const local = Math.sin(pose.wavePhase + x * 0.32);
      return pose.wave * 13 * heightFrac * local;
    };

    // back blades (incl. lushness-gated extras), then flowers, then front blades
    const drawBladeLayer = (wantLayer: number): void => {
      BLADES.forEach(([bx, tipX, tipY, layer]) => {
        if (layer !== wantLayer) return;
        const ty = tipY;
        const sway = waveAt(tipX, ty);
        const tx = tipX + sway;
        const midX = lerp(bx, tx, 0.5) + sway * 0.4;
        const midY = lerp(baseY, ty, 0.45);
        // dark base
        ctx.strokeStyle = layer === 0 ? rgb(p.bladeDark) : rgba(p.outline, 0.8);
        ctx.lineWidth = layer === 0 ? 3.0 : 3.4;
        ctx.beginPath();
        ctx.moveTo(bx, baseY);
        ctx.quadraticCurveTo(midX, midY, tx, ty);
        ctx.stroke();
        // bright blade
        ctx.strokeStyle = layer === 0 ? rgba(p.bladeMid, 0.95) : rgb(p.bladeMid);
        ctx.lineWidth = layer === 0 ? 1.6 : 1.9;
        ctx.beginPath();
        ctx.moveTo(bx, baseY);
        ctx.quadraticCurveTo(midX, midY, tx, ty);
        ctx.stroke();
        // front blades get a lit highlight edge
        if (layer === 1) {
          ctx.strokeStyle = rgba(p.bladeLight, 0.7);
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(bx - 0.6, baseY - 1);
          ctx.quadraticCurveTo(midX - 0.8, midY, tx - 0.5, ty);
          ctx.stroke();
        }
      });
    };

    // lushness back blades (drawn first, behind everything)
    if (p.lushness > 0.02) {
      ctx.globalAlpha = 0.6 + 0.4 * p.lushness;
      LUSH_BLADES.forEach(([bx, tipX, tipY]) => {
        const sway = waveAt(tipX, tipY);
        const tx = tipX + sway;
        const midX = lerp(bx, tx, 0.5) + sway * 0.4;
        const midY = lerp(baseY, tipY, 0.45);
        ctx.strokeStyle = rgb(p.bladeDark);
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(bx, baseY);
        ctx.quadraticCurveTo(midX, midY, tx, tipY);
        ctx.stroke();
        ctx.strokeStyle = rgba(p.bladeMid, 0.9);
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(bx, baseY);
        ctx.quadraticCurveTo(midX, midY, tx, tipY);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }

    drawBladeLayer(0);

    // wildflower stems rising from the centre (wind sways the heads)
    FLOWERS.forEach(([baseX, headX, layer]) => {
      const sway = waveAt(headX, STEM_TOP);
      drawFlower(ctx, p, baseX, headX, layer, sway);
    });

    drawBladeLayer(1);

    // ── Frost dusting (winter) on the upward blade tips + heads ──────────────
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-13, -2], [-8, -7], [-3, TUFT_TOP], [1, TUFT_TOP - 1], [5, -10],
        [11, -7], [15, -3], [-5, STEM_TOP + 2], [3, STEM_TOP + 2],
      ];
      speck.forEach(([sx, sy]) => {
        const sway = waveAt(sx, sy);
        ctx.beginPath();
        ctx.arc(sx + sway, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // ── Snow weighing the stalks / blade crown (winter) ──────────────────────
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      FLOWERS.forEach(([baseX, headX]) => {
        const droopX = headX + p.dryness * 5 * Math.sign(headX || 1);
        const headY = STEM_TOP + p.dryness * 6 + Math.abs(baseX) * 0.4;
        const sway = waveAt(headX, STEM_TOP);
        ctx.beginPath();
        ctx.ellipse(droopX + sway, headY - 3.6, 2.4, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      // snow nestled in the blade-fan crown
      ctx.fillStyle = rgba([238, 246, 255], 0.6 * a);
      ctx.beginPath();
      ctx.ellipse(0, TUFT_TOP + 2, 6.5, 2.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Soft summer shimmer / dewy gloss on the blade fan ────────────────────
    if (p.gloss > 0.02) {
      ctx.strokeStyle = rgba([255, 255, 255], 0.1 + 0.22 * p.gloss);
      ctx.lineWidth = 0.8;
      [-7, -2, 4].forEach((bx) => {
        ctx.beginPath();
        ctx.moveTo(bx, baseY - 3);
        ctx.lineTo(bx - 1.5, lerp(baseY, TUFT_TOP, 0.6));
        ctx.stroke();
      });
    }

    ctx.restore(); // end pose transform

    // ── Visiting bee (idle special) — the bold rare beat, over the tuft ──────
    // Its soft pollen-glow is an ADDITIVE overlay; the bee body is drawn normally
    // so it reads as a solid critter. The whole thing is enveloped by bee.alpha
    // (0 at the window edges), so it is invisible at t=0 and at the loop seam.
    drawBee(ctx, pose.bee);

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

// An asymmetric anticipation→peak→settle curve, 0 at q=0 and q=1.
function anticipate(q: number): number {
  const env = 0.5 * (1 - Math.cos(2 * Math.PI * q)); // 0..1..0, velocity 0 at edges
  const tilt = Math.sin(Math.PI * q) * Math.sin(1.5 * Math.PI * q);
  return env * (0.55 * Math.sin(2 * Math.PI * q) + 0.9 * tilt);
}

/** Build the idle pose from the wall clock. Two tiers:
 *   common WIND WAVE every ~6s (win 0.95s), rare BEE every ~18s (win 1.3s). */
function poseFromClock(t: number): Pose {
  const pose: Pose = {
    bob: 0, lean: 0, squashX: 0, squashY: 0,
    wave: 0, wavePhase: 0,
    bee: { alpha: 0, x: 0, y: 0, flap: 0.5, tilt: 0, clock: 0 },
  };

  // ── COMMON: wind wave (~6s, win 0.95s) ──
  // A traveling-wave sway: the tuft bends in the wind, blades ripple across.
  // Envelope is `hump` (sin²) so it is 0 WITH ZERO VELOCITY at q=0 and q=1 — the
  // whole gesture eases in and settles out with no tick at the window edges
  // (truly seamless). It still peaks at 1 mid-window, so the sway reads the same.
  const qC = actionQ(t, 6.0, 0.95, 0.0);
  if (qC >= 0) {
    const env = hump(qC); // sin²(πq): 0..1..0, value AND slope 0 at edges
    // amplitude swells & settles; phase travels (gust passes through the tuft)
    pose.wave = env * (0.7 + 0.3 * Math.sin(qC * Math.PI * 2));
    pose.wavePhase = qC * Math.PI * 3.0; // gust travels across during the window
    // whole-tuft base lean in the gust direction + a small base squash
    pose.lean += 0.10 * env;
    pose.squashY += -0.05 * env;
    pose.squashX += 0.05 * env;
    // a faint windup tilt (still 0 at edges) keeps anticipate() in the toolkit
    pose.lean += 0.015 * anticipate(qC);
  }

  // ── RARE SPECIAL: visiting BEE (~18s, win 1.3s, phase +3s) — the bold beat ──
  // Flies in from off-screen RIGHT, swoops down to a wildflower head, bobs/hovers
  // a beat to sip, then flits off up-LEFT. `alpha` (the whole pollinator envelope,
  // body + additive glow) is 0 at both window edges → invisible at t=0 and at the
  // loop seam (seamless). Endpoints sit off-screen so the fade is hidden anyway.
  const qS = actionQ(t, 18.0, 1.3, 3.0);
  if (qS >= 0) {
    const bee = pose.bee;
    // overall envelope: 0 at edges, quick on/off, full through the visit
    bee.alpha = clamp01(Math.sin(Math.PI * qS) * 3);
    bee.clock = t; // continuous local time → wings/antennae keep moving

    // fast wing-flap factor (animBee idiom): a fluttering 0.45..1.2 width
    bee.flap = 0.45 + Math.abs(Math.sin(t * 22)) * 0.75;

    // flight path: enter top-right → flower head → hover/sip → exit up-left
    const enterX = 30;
    const enterY = -16;
    const exitX = -30;
    const exitY = -18;
    const flowerX = 2.0;                 // near a right-of-centre flower head
    const flowerY = STEM_TOP + 1.0;      // just at the bloom (sips here)
    const hoverStart = 0.38;
    const hoverEnd = 0.64;
    if (qS < hoverStart) {
      // swoop in (ease toward the bloom) with a little bobbing approach
      const u = smoother(qS / hoverStart);
      bee.x = lerp(enterX, flowerX, u);
      bee.y = lerp(enterY, flowerY, u) + Math.sin(u * Math.PI) * -3 + Math.sin(qS * 26) * 0.9;
      bee.tilt = 0.32 - 0.28 * u; // nose-down on approach, leveling out
    } else if (qS < hoverEnd) {
      // hover/sip at the bloom with a gentle bob
      const h = (qS - hoverStart) / (hoverEnd - hoverStart);
      bee.x = flowerX + Math.sin(h * Math.PI * 2) * 1.6;
      bee.y = flowerY + Math.sin(h * Math.PI * 3) * 1.4;
      bee.tilt = 0.04 + Math.sin(h * Math.PI * 2) * 0.06;
    } else {
      // flit off up-left
      const u = smoother((qS - hoverEnd) / (1 - hoverEnd));
      bee.x = lerp(flowerX, exitX, u);
      bee.y = lerp(flowerY, exitY, u) + Math.sin(u * Math.PI) * -3;
      bee.tilt = -0.18 - 0.18 * u; // banks the other way leaving
    }
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
    // own colour/brightness). Kept tiny so the POSE actions are the star.
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
        // one slow tumbling leaf + a drifting seed
        const prog = ((tt / 5.0) % 1 + 1) % 1;
        const px = 11 - prog * 6 + Math.sin(prog * Math.PI * 3) * 2;
        const py = -16 + prog * 32;
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(prog * Math.PI);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(prog * Math.PI * 4);
        ctx.fillStyle = "rgba(200,100,36,1)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.4, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      // Summer: no extra dressing — the wind wave + lush flowers are the show.
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
