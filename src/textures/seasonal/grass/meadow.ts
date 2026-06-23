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
//   IDLE SPECIAL (~18s, win ~1.25s): a VISITING BUTTERFLY flits in to a flower,
//       hovers a beat, then flies off — a charming once-in-a-while moment.
//       Off-screen (zero) at both window edges (seamless).
//
// The architecture is a single parameterized `paint(ctx, p, pose)` where
// `interface P` holds tweenable season params (colours + 0..1 prop amounts) and
// `pose` holds the idle gesture (bob / lean / squash / wave / butterfly). Because
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

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number;      // vertical offset in design px (negative = up)
  lean: number;     // base lean, radians (whole tuft tips side to side)
  squashX: number;  // additive horizontal scale (+0.18 = 18% wider)
  squashY: number;  // additive vertical scale (+0.18 = 18% taller)
  wave: number;     // -1..1 wind-wave amplitude scalar (drives traveling sway)
  wavePhase: number; // radians — travel phase of the wind wave across the tuft
  flutter: number;  // 0..1 butterfly visibility / opacity
  flyX: number;     // butterfly x position in design px
  flyY: number;     // butterfly y position in design px
  wing: number;     // -1..1 wing-flap phase
}

const REST: Pose = {
  bob: 0, lean: 0, squashX: 0, squashY: 0,
  wave: 0, wavePhase: 0, flutter: 0, flyX: 0, flyY: 0, wing: 0,
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
  // Spring — fresh green meadow grasses with the FIRST wildflowers opening (its
  // signature). Cool-bright light, dewy lime pad, pad blossoms.
  Spring: {
    bladeLight: [160, 222, 104],
    bladeMid: [102, 184, 68],
    bladeDark: [52, 122, 48],
    stem: [120, 184, 84],
    petal: [255, 232, 250],
    petalDark: [216, 168, 214],
    centre: [255, 210, 78],
    padGrass: [128, 212, 86],
    padDark: [66, 144, 58],
    soil: [120, 84, 48],
    outline: [34, 66, 28],
    light: [228, 248, 218],
    lightAmt: 0.18,
    lushness: 0.4,
    dryness: 0,
    flowerAmt: 0.85,
    seedHeadAmt: 0,
    gloss: 0.24,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — LUSH peak meadow: thick deep green with ABUNDANT colourful
  // wildflowers, high gloss, warm bright light.
  Summer: {
    bladeLight: [150, 212, 92],
    bladeMid: [82, 172, 62],
    bladeDark: [42, 116, 46],
    stem: [86, 158, 60],
    petal: [255, 138, 96],
    petalDark: [206, 78, 88],
    centre: [255, 206, 70],
    padGrass: [82, 176, 72],
    padDark: [42, 116, 50],
    soil: [126, 86, 48],
    outline: [30, 72, 26],
    light: [255, 244, 200],
    lightAmt: 0.2,
    lushness: 1.0,
    dryness: 0,
    flowerAmt: 1.0,
    seedHeadAmt: 0,
    gloss: 0.9,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — DRY GOLD meadow gone to seed: amber/straw blades, flowers turned to
  // fluffy seed-heads, a fallen leaf, dulled gloss, low amber light.
  Autumn: {
    bladeLight: [218, 182, 96],
    bladeMid: [182, 142, 64],
    bladeDark: [124, 92, 42],
    stem: [180, 154, 86],
    petal: [214, 186, 120],
    petalDark: [160, 128, 74],
    centre: [200, 168, 96],
    padGrass: [156, 154, 84],
    padDark: [106, 96, 50],
    soil: [120, 78, 42],
    outline: [74, 50, 24],
    light: [250, 204, 138],
    lightAmt: 0.24,
    lushness: 0.25,
    dryness: 0.95,
    flowerAmt: 0,
    seedHeadAmt: 0.9,
    gloss: 0.3,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.9,
  },
  // Winter — meadow under SNOW: bleached straw stalks, bold snow blanket/drift on
  // the pad + snow weighing the dried stalks, frost, cool blue-grey light. A
  // dried flower stalk still pokes through (low flowerAmt as a bare seed-head).
  Winter: {
    bladeLight: [198, 190, 162],
    bladeMid: [158, 150, 124],
    bladeDark: [108, 102, 88],
    stem: [176, 168, 144],
    petal: [200, 196, 178],
    petalDark: [150, 146, 130],
    centre: [176, 168, 140],
    padGrass: [184, 204, 222],
    padDark: [122, 150, 178],
    soil: [130, 112, 98],
    outline: [56, 54, 56],
    light: [202, 224, 255],
    lightAmt: 0.34,
    lushness: 0.2,
    dryness: 0.55,
    flowerAmt: 0,
    seedHeadAmt: 0.35,
    gloss: 0.18,
    frostAmt: 0.75,
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

/** The whole tile from ONLY `p` (season identity) and `pose` (idle gesture). */
function paint(ctx: CanvasRenderingContext2D, raw: P, rawPose: Pose): void {
  const p = clampP(raw);
  const pose: Pose = {
    bob: safeNum(rawPose.bob),
    lean: safeNum(rawPose.lean),
    squashX: safeNum(rawPose.squashX),
    squashY: safeNum(rawPose.squashY),
    wave: safeNum(rawPose.wave),
    wavePhase: safeNum(rawPose.wavePhase),
    flutter: clamp01(safeNum(rawPose.flutter)),
    flyX: safeNum(rawPose.flyX),
    flyY: safeNum(rawPose.flyY),
    wing: safeNum(rawPose.wing),
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

    // ── Visiting butterfly (idle special) — drawn over the tuft ──────────────
    if (pose.flutter > 0.01) {
      const a = pose.flutter;
      const wingPhase = pose.wing; // -1..1
      const wingOpen = 0.45 + 0.55 * (0.5 + 0.5 * wingPhase); // 0..1 spread
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(pose.flyX, pose.flyY);
      // body
      ctx.fillStyle = rgb([60, 44, 40]);
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.9, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // wings (left + right, flap by squashing horizontally)
      const wingCol: RGB = [255, 156, 70];
      const wingEdge: RGB = [196, 72, 60];
      ([-1, 1] as const).forEach((side) => {
        ctx.save();
        ctx.scale(side * wingOpen, 1);
        ctx.fillStyle = rgb(wingCol);
        ctx.beginPath();
        ctx.ellipse(2.6, -1.2, 2.4, 1.8, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(2.2, 1.4, 1.8, 1.5, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba(wingEdge, 0.8);
        ctx.beginPath();
        ctx.ellipse(3.4, -1.4, 0.9, 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      // antennae
      ctx.strokeStyle = rgb([60, 44, 40]);
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, -2.2);
      ctx.lineTo(-1.2, -4.0);
      ctx.moveTo(0, -2.2);
      ctx.lineTo(1.2, -4.0);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

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
 *   common WIND WAVE every ~6s (win 0.95s), rare BUTTERFLY every ~18s (win 1.25s). */
function poseFromClock(t: number): Pose {
  const pose: Pose = {
    bob: 0, lean: 0, squashX: 0, squashY: 0,
    wave: 0, wavePhase: 0, flutter: 0, flyX: 0, flyY: 0, wing: 0,
  };

  // ── COMMON: wind wave (~6s, win 0.95s) ──
  // A traveling-wave sway: the tuft bends in the wind, blades ripple across.
  // Envelope (sin) is 0 at the window edges; the wave amplitude rides it so the
  // whole gesture has zero velocity at q=0 and q=1 → seamless.
  const qC = actionQ(t, 6.0, 0.95, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC); // 0..1..0, zero at edges
    // amplitude swells & settles; phase travels (gust passes through the tuft)
    pose.wave = env * (0.7 + 0.3 * Math.sin(qC * Math.PI * 2));
    pose.wavePhase = qC * Math.PI * 3.0; // gust travels across during the window
    // whole-tuft base lean in the gust direction + a small base squash
    pose.lean += 0.10 * env;
    pose.squashY += -0.05 * hump(qC);
    pose.squashX += 0.05 * hump(qC);
    // a faint windup tilt (still 0 at edges) keeps anticipate() in the toolkit
    pose.lean += 0.015 * anticipate(qC);
  }

  // ── RARE SPECIAL: visiting butterfly (~18s, win 1.25s, phase +3s) ──
  // Flies in from off-screen left, arcs up to a flower, hovers, then flies off
  // to the right & up. Opacity 0 at both edges → off-screen/zero at the window
  // edges (seamless). Wings flap throughout.
  const qS = actionQ(t, 18.0, 1.25, 3.0);
  if (qS >= 0) {
    // visibility fades in over the first ~12% and out over the last ~15%
    const fadeIn = clamp01(qS / 0.12);
    const fadeOut = clamp01((1 - qS) / 0.15);
    pose.flutter = Math.min(fadeIn, fadeOut);

    // Path: enter low-left → up to a flower head near (-1,-22) → hover → exit
    // up-right. Use a smooth parametric path; endpoints sit off-screen so the
    // fade-zero edges are harmless either way.
    const enterX = -30;
    const exitX = 30;
    const flowerX = -1.0;
    const flowerY = STEM_TOP - 1.0; // just above the central flower head
    const hoverStart = 0.40;
    const hoverEnd = 0.62;
    if (qS < hoverStart) {
      const u = smoother(qS / hoverStart);
      pose.flyX = lerp(enterX, flowerX, u);
      // arc: dip below then rise to the flower (a little bobbing approach)
      pose.flyY = lerp(8, flowerY, u) + Math.sin(u * Math.PI) * -4 + Math.sin(qS * 30) * 0.8;
    } else if (qS < hoverEnd) {
      // hover at the flower with a gentle bob
      const h = (qS - hoverStart) / (hoverEnd - hoverStart);
      pose.flyX = flowerX + Math.sin(h * Math.PI * 2) * 1.2;
      pose.flyY = flowerY + Math.sin(h * Math.PI * 3) * 1.0;
    } else {
      const u = smoother((qS - hoverEnd) / (1 - hoverEnd));
      pose.flyX = lerp(flowerX, exitX, u);
      pose.flyY = lerp(flowerY, -18, u) + Math.sin(u * Math.PI) * -3;
    }
    // wings flap fast throughout
    pose.wing = Math.sin(qS * Math.PI * 26);
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
