// Production seasonal art for the CORN grain tile (`tile_grain_corn`).
//
// A single upright corn PLANT — a tall central cob/ear wrapped in husk leaves
// with a silk tassel on top, flanked by long blade leaves, standing on a small
// grassy pad. The SAME plant is drawn every season (identity-safe): the cob,
// husk, blade leaves and pad keep one silhouette/structure. The seasons swing
// hard on COLOUR + frost/snow/leaves + light props ONLY — corn never morphs
// into something else.
//
//   IDLE COMMON  (~6s, win ~0.9s): a RUSTLE traveling-wave sway — the stalk and
//       leaves bend ~10–14 design-px side-to-side with a gentle base squash,
//       like wind passing through. Pivot near the base of the pad so the top
//       travels most. Anticipation → peak → settle, zero velocity at the edges.
//   IDLE SPECIAL (~18s, win ~1.2s, phase +3s so it never collides): a STRONG
//       GUST BEND — the whole plant leans hard (~16–20 design-px at the top)
//       then springs back with follow-through (anticipation → big bend →
//       overshoot → settle). May paint outside the −24..+24 box at the apex.
//
// The architecture is a single parameterized `paint(ctx, p, pose)` where
// `interface P` holds tweenable season params (colours + prop amounts) and
// `pose` holds the idle gesture (bob / lean / squash / leafWave). Because every
// season is the same paint with tweened P, transitions are seamless:
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

/** Every field tweens (number or RGB). NO booleans / season strings — paint is
 *  a pure function of these so transitions interpolate cleanly. */
interface P {
  huskLight: RGB;        // lit face of the husk leaves wrapping the cob
  huskMid: RGB;          // husk body tone
  huskDark: RGB;         // shaded husk / outline-side
  bladeLight: RGB;       // lit face of the long flanking blade leaves
  bladeDark: RGB;        // shaded blade leaf
  kernel: RGB;           // exposed kernel / ear face colour
  kernelDeep: RGB;       // kernel shadow colour
  silk: RGB;             // silk tassel strands on top of the ear
  padGrass: RGB;         // top of the grass pad
  padDark: RGB;          // shaded pad underside
  soil: RGB;             // contact / base soil under the plant
  outline: RGB;          // soft dark outline tint
  light: RGB;            // ambient light tint laid over the whole tile
  lightAmt: number;      // 0..1 strength of the ambient light wash
  gloss: number;         // 0..1 specular sheen on the ear/husk
  ripeness: number;      // 0..1 how much golden ear shows through the husk
  frostAmt: number;      // 0..1 cool frost dusting on the plant (winter)
  snowCapAmt: number;    // 0..1 snow cap on the top of the ear/tassel (winter)
  padSnowAmt: number;    // 0..1 snow blanket at the base / on the pad (winter)
  blossomAmt: number;    // 0..1 forming tassel-blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad (autumn)
}

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number;      // vertical offset in design px (negative = up)
  lean: number;     // base-of-plant sway, radians (rock/bend side to side)
  squashX: number;  // additive horizontal scale (+0.18 = 18% wider)
  squashY: number;  // additive vertical scale (+0.18 = 18% taller)
  leafWave: number; // extra traveling-wave bend at the leaf tips, radians
}

const REST: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0, leafWave: 0 };

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
    huskLight: lerpRGB(a.huskLight, b.huskLight, t),
    huskMid: lerpRGB(a.huskMid, b.huskMid, t),
    huskDark: lerpRGB(a.huskDark, b.huskDark, t),
    bladeLight: lerpRGB(a.bladeLight, b.bladeLight, t),
    bladeDark: lerpRGB(a.bladeDark, b.bladeDark, t),
    kernel: lerpRGB(a.kernel, b.kernel, t),
    kernelDeep: lerpRGB(a.kernelDeep, b.kernelDeep, t),
    silk: lerpRGB(a.silk, b.silk, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    gloss: lerp(a.gloss, b.gloss, t),
    ripeness: lerp(a.ripeness, b.ripeness, t),
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
    gloss: clamp01(p.gloss),
    ripeness: clamp01(p.ripeness),
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
  // Spring — young GREEN corn, fresh light-green husk + leaves, a small forming
  // tassel/blossom on the pad, cool-bright light. Ear barely showing.
  Spring: {
    huskLight: [150, 216, 96],
    huskMid: [98, 184, 64],
    huskDark: [52, 128, 50],
    bladeLight: [142, 210, 92],
    bladeDark: [60, 140, 56],
    kernel: [220, 226, 132],
    kernelDeep: [168, 184, 92],
    silk: [206, 226, 150],
    padGrass: [126, 214, 84],
    padDark: [64, 146, 56],
    soil: [120, 84, 48],
    outline: [30, 72, 30],
    light: [226, 248, 218],
    lightAmt: 0.18,
    gloss: 0.3,
    ripeness: 0.08,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 1.0,
    fallenLeafAmt: 0,
  },
  // Summer — peak: tall lush GREEN plant, ripening golden ear starting to show,
  // high gloss, warm bright light.
  Summer: {
    huskLight: [120, 198, 70],
    huskMid: [78, 166, 54],
    huskDark: [42, 110, 44],
    bladeLight: [108, 192, 64],
    bladeDark: [44, 120, 48],
    kernel: [255, 214, 64],
    kernelDeep: [208, 152, 30],
    silk: [240, 214, 120],
    padGrass: [86, 184, 74],
    padDark: [44, 120, 52],
    soil: [128, 88, 48],
    outline: [34, 80, 34],
    light: [255, 244, 200],
    lightAmt: 0.2,
    gloss: 1.0,
    ripeness: 0.55,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — GOLDEN heavy ripe ear, leaves yellow/tan drying, a fallen leaf on
  // the pad, dulled gloss, amber light. The "golden heavy heads" peak.
  Autumn: {
    huskLight: [206, 176, 84],
    huskMid: [168, 132, 56],
    huskDark: [112, 80, 36],
    bladeLight: [198, 168, 80],
    bladeDark: [128, 96, 44],
    kernel: [240, 178, 50],
    kernelDeep: [176, 114, 26],
    silk: [176, 116, 60],
    padGrass: [162, 150, 78],
    padDark: [110, 90, 46],
    soil: [120, 78, 42],
    outline: [70, 48, 22],
    light: [250, 198, 132],
    lightAmt: 0.26,
    gloss: 0.34,
    ripeness: 1.0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1.0,
  },
  // Winter — frosted corn: stalk/leaves dried tan, a bold snow cap on the top
  // of the ear/tassel + a snow blanket at the base, cool blue-grey light. Still
  // clearly corn.
  Winter: {
    huskLight: [188, 184, 150],
    huskMid: [150, 148, 120],
    huskDark: [98, 100, 86],
    bladeLight: [178, 176, 146],
    bladeDark: [110, 116, 104],
    kernel: [212, 192, 128],
    kernelDeep: [150, 134, 88],
    silk: [200, 206, 206],
    padGrass: [182, 202, 220],
    padDark: [122, 150, 178],
    soil: [132, 116, 102],
    outline: [56, 60, 62],
    light: [200, 224, 255],
    lightAmt: 0.36,
    gloss: 0.3,
    ripeness: 0.7,
    frostAmt: 0.82,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Corn plant geometry — the SAME silhouette every season ───────────────────

const EAR_TOP = -20;          // tip of the ear (under the tassel)
const EAR_BOT = 14;           // base of the ear, sitting on the pad
const EAR_HALF = 8.5;         // half-width at the belly of the ear
const PLANT_PIVOT_Y = 17;     // bend/lean about a point near the base of the pad

/** Trace the upright ear/cob body path (origin-local, unposed). Constant. */
function earBodyPath(ctx: CanvasRenderingContext2D): void {
  const t = EAR_TOP;
  const b = EAR_BOT;
  const h = EAR_HALF;
  ctx.beginPath();
  ctx.moveTo(0, t - 2);
  ctx.bezierCurveTo(h * 0.8, t + 2, h, lerp(t, b, 0.3), h * 0.92, lerp(t, b, 0.55));
  ctx.bezierCurveTo(h * 0.84, b - 2, 4, b, 0, b + 0.5);
  ctx.bezierCurveTo(-4, b, -h * 0.84, b - 2, -h * 0.92, lerp(t, b, 0.55));
  ctx.bezierCurveTo(-h, lerp(t, b, 0.3), -h * 0.8, t + 2, 0, t - 2);
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
    leafWave: safeNum(rawPose.leafWave),
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

    // forming tassel-blossom on the pad (spring)
    if (p.blossomAmt > 0.01) {
      const a = p.blossomAmt;
      const spots: Array<[number, number]> = [[-13, 18.5], [12, 17.8], [-4, 21]];
      spots.forEach(([bx, by], idx) => {
        ctx.fillStyle = rgba(idx === 1 ? [255, 244, 214] : [255, 250, 240], 0.95 * a);
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
        [-12, 19.6, -0.5, [206, 152, 38]],
        [12, 18.6, 0.7, [182, 110, 28]],
      ];
      leaves.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgba(col, a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.8, 1.9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba([90, 54, 16], a);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-3.6, 0);
        ctx.lineTo(3.6, 0);
        ctx.stroke();
        ctx.restore();
      });
    }

    // ── Contact shadow under the plant (follows the lean for grounding) ──────
    const tipShift = pose.lean * (PLANT_PIVOT_Y - EAR_TOP); // how far the tip leans
    const shadowSpread = 1 + clamp01(pose.bob < 0 ? -pose.bob / 16 : 0) * 0.4;
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0 + tipShift * 0.16, EAR_BOT + 2.5, 9 * shadowSpread, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.26 / shadowSpread);
    ctx.beginPath();
    ctx.ellipse(2.5 + tipShift * 0.18, EAR_BOT + 3, 11 * shadowSpread, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the corn plant, under the idle pose transform ───────────────
    ctx.save();
    // Pivot near the base of the pad so lean bends the TOP side-to-side and the
    // top travels most; squash anchors at the base (it "stands" on the pad).
    ctx.translate(0, PLANT_PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(0, -PLANT_PIVOT_Y);

    const top = EAR_TOP;
    const bot = EAR_BOT;

    // 1) Flanking blade leaves BEHIND the ear (long, drawn first so the cob
    //    sits in front). Each leaf tip gets the traveling-wave bend (leafWave),
    //    larger at the tip — like wind passing through.
    const blades: Array<[number, number]> = [
      // [side, magnitude] — outer blades sweep further with the wave
      [-1, 1.0],
      [1, 1.0],
      [-1, 0.55],
      [1, 0.55],
    ];
    blades.forEach(([side, mag], idx) => {
      const baseX = side * 3.4;
      const baseY = bot - 1;
      const reach = idx < 2 ? 17 : 11;        // outer blades longer
      const rise = idx < 2 ? 20 : 13;
      const wave = pose.leafWave * mag * (idx < 2 ? 1.0 : 0.7);
      const tipX = baseX + side * reach + Math.sin(wave) * reach * 0.9;
      const tipY = baseY - rise + Math.cos(wave) * 2.2;
      const midX = baseX + side * reach * 0.45 + Math.sin(wave) * reach * 0.4;
      const midY = baseY - rise * 0.55;

      // dark base pass
      ctx.fillStyle = rgb(p.bladeDark);
      ctx.beginPath();
      ctx.moveTo(baseX - side * 1.6, baseY);
      ctx.quadraticCurveTo(midX - side * 3.4, midY, tipX, tipY);
      ctx.quadraticCurveTo(midX + side * 2.2, midY + 3.2, baseX + side * 2.2, baseY);
      ctx.closePath();
      ctx.fill();

      // lit leaf face inset
      ctx.fillStyle = rgb(p.bladeLight);
      ctx.beginPath();
      ctx.moveTo(baseX - side * 0.6, baseY - 0.8);
      ctx.quadraticCurveTo(midX - side * 2.2, midY, tipX - side * 1.4, tipY + 1.4);
      ctx.quadraticCurveTo(midX + side * 1.4, midY + 2.4, baseX + side * 1.6, baseY - 0.8);
      ctx.closePath();
      ctx.fill();

      // central vein
      ctx.strokeStyle = rgba(p.huskDark, 0.7);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(baseX + side * 0.4, baseY - 1);
      ctx.quadraticCurveTo(midX, midY, tipX - side * 0.8, tipY + 0.8);
      ctx.stroke();
    });

    // 2) soft dark outline pass behind the ear
    earBodyPath(ctx);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // 3) ear body fill (the husk-wrapped cob), clipped to the body
    ctx.save();
    earBodyPath(ctx);
    ctx.clip();

    // husk base fill
    ctx.fillStyle = rgb(p.huskMid);
    ctx.fillRect(-EAR_HALF - 3, top - 8, (EAR_HALF + 3) * 2, bot - top + 14);

    // lit husk panel (light from upper-left)
    const litGrad = ctx.createLinearGradient(-EAR_HALF, top - 4, EAR_HALF, bot);
    litGrad.addColorStop(0, rgb(p.huskLight));
    litGrad.addColorStop(0.5, rgb(p.huskMid));
    litGrad.addColorStop(1, rgb(p.huskDark));
    ctx.fillStyle = litGrad;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.ellipse(-1.5, lerp(top, bot, 0.46), EAR_HALF + 2, (bot - top) * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // golden ear showing through the parted husk — grows with `ripeness`.
    if (p.ripeness > 0.02) {
      const rp = p.ripeness;
      const earW = (EAR_HALF - 1.5) * (0.45 + 0.55 * rp);
      const earTopY = top + 3;
      const earBotY = bot - 2;
      // kernel field
      ctx.fillStyle = rgb(p.kernelDeep);
      ctx.beginPath();
      ctx.ellipse(0, lerp(earTopY, earBotY, 0.5), earW, (earBotY - earTopY) * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // rows of kernels
      const rows = 8;
      for (let r = 0; r < rows; r++) {
        const y = lerp(earTopY, earBotY, r / (rows - 1));
        const widthHere = earW * Math.sqrt(Math.max(0, 1 - ((y - lerp(earTopY, earBotY, 0.5)) / ((earBotY - earTopY) * 0.5)) ** 2));
        const cols = 4;
        for (let c = 0; c < cols; c++) {
          const fx = (c / (cols - 1) - 0.5) * 2 * (widthHere - 1.0);
          const sx = fx + (r % 2 === 0 ? 0 : (widthHere - 1.0) / (cols - 1));
          if (Math.abs(sx) > widthHere - 0.4) continue;
          ctx.fillStyle = rgb(p.kernel);
          ctx.beginPath();
          ctx.ellipse(sx, y, 1.5, 1.7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = rgba(lerpRGB(p.kernel, [255, 255, 255], 0.5), 0.5 * (0.4 + 0.6 * p.gloss));
          ctx.beginPath();
          ctx.ellipse(sx - 0.5, y - 0.6, 0.7, 0.8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // husk seam creases (vertical grooves on the wrap)
    ctx.strokeStyle = rgba(p.huskDark, 0.8);
    ctx.lineWidth = 1.6;
    [-5.6, 5.4].forEach((cx) => {
      ctx.beginPath();
      ctx.moveTo(cx, top + 2);
      ctx.quadraticCurveTo(cx * 1.1, lerp(top, bot, 0.55), cx * 0.8, bot - 1.5);
      ctx.stroke();
    });
    ctx.strokeStyle = rgba(p.huskLight, 0.5);
    ctx.lineWidth = 1.0;
    [-3.4, 3.2].forEach((cx) => {
      ctx.beginPath();
      ctx.moveTo(cx, top + 2);
      ctx.quadraticCurveTo(cx, lerp(top, bot, 0.5), cx, bot - 3);
      ctx.stroke();
    });

    // specular sheen on the ear/husk
    if (p.gloss > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.14 + 0.5 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(-4.8, lerp(top, bot, 0.34), 1.6, (bot - top) * 0.26, -0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    // frost dusting (winter)
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.26 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(-1, lerp(top, bot, 0.26), EAR_HALF, (bot - top) * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-6, top + 3], [-2, top + 1], [3, top + 3], [6, top + 5],
        [-5, lerp(top, bot, 0.42)], [4, lerp(top, bot, 0.46)], [0, lerp(top, bot, 0.3)],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end ear clip

    // 4) parting husk-leaf tips at the top of the ear (constant extent; they
    //    flare a touch with ripeness so the golden ear reads as "open").
    const flare = 0.3 + 0.4 * p.ripeness;
    ctx.fillStyle = rgb(p.huskDark);
    ([[-1], [1]] as Array<[number]>).forEach(([side]) => {
      ctx.beginPath();
      ctx.moveTo(side * (EAR_HALF * 0.5), top + 4);
      ctx.quadraticCurveTo(side * (EAR_HALF + 2) * flare, top - 6, side * (EAR_HALF * 0.4), top - 2);
      ctx.quadraticCurveTo(side * 1.5, top + 2, side * (EAR_HALF * 0.5), top + 4);
      ctx.closePath();
      ctx.fill();
    });
    ctx.fillStyle = rgb(p.huskLight);
    ([[-1], [1]] as Array<[number]>).forEach(([side]) => {
      ctx.beginPath();
      ctx.moveTo(side * (EAR_HALF * 0.5), top + 3);
      ctx.quadraticCurveTo(side * (EAR_HALF + 1) * flare, top - 5, side * (EAR_HALF * 0.42), top - 1.4);
      ctx.quadraticCurveTo(side * 1.6, top + 1.6, side * (EAR_HALF * 0.5), top + 3);
      ctx.closePath();
      ctx.fill();
    });

    // 5) silk tassel on top of the ear (rides with the pose; sways with lean)
    const sway = pose.lean * 12 + pose.leafWave * 6;
    ctx.strokeStyle = rgba(p.silk, 0.95);
    ctx.lineWidth = 1.1;
    const strands: Array<[number, number]> = [
      [-4, -0.6], [-2, -0.25], [0, 0], [2, 0.25], [4, 0.6],
    ];
    strands.forEach(([sx, leanK], i) => {
      const tipX = sx + leanK * 6 + sway * (0.4 + i * 0.12);
      const tipY = top - 8 - Math.abs(sx) * 0.3;
      ctx.beginPath();
      ctx.moveTo(sx * 0.4, top - 1);
      ctx.quadraticCurveTo(sx * 0.7 + sway * 0.3, top - 4.5, tipX, tipY);
      ctx.stroke();
    });
    ctx.strokeStyle = rgba(lerpRGB(p.silk, [255, 255, 255], 0.4), 0.8);
    ctx.lineWidth = 0.7;
    strands.forEach(([sx, leanK], i) => {
      const tipX = sx + leanK * 6 + sway * (0.4 + i * 0.12);
      const tipY = top - 8 - Math.abs(sx) * 0.3;
      ctx.beginPath();
      ctx.moveTo(sx * 0.55 + sway * 0.2, top - 4.5);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
    });

    // 6) snow cap on the top of the ear/tassel (winter)
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(-EAR_HALF * 0.86, top + 3);
      ctx.quadraticCurveTo(-5, top - 8, 0, top - 6.5);
      ctx.quadraticCurveTo(5, top - 8, EAR_HALF * 0.86, top + 3);
      ctx.quadraticCurveTo(6.5, top + 5.5, 2, top + 3.6);
      ctx.quadraticCurveTo(0, top + 6, -2, top + 3.6);
      ctx.quadraticCurveTo(-6.5, top + 5.5, -EAR_HALF * 0.86, top + 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(0, top + 3.4, EAR_HALF * 0.66, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // end pose transform

    // ── Ambient light wash over the whole tile (per-season tint) ─────────────
    if (p.lightAmt > 0.001) {
      ctx.globalAlpha = 1;
      const lg = ctx.createRadialGradient(-10, -16, 2, -10, -16, 48);
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
// sin^2(pi q) → smooth in/out, peak at q=0.5.
function hump(q: number): number {
  const s = Math.sin(Math.PI * q);
  return s * s;
}

// An asymmetric anticipation→peak→settle curve, 0 at q=0 and q=1.
// (1-cos) envelope keeps velocity zero at the edges; a windup tilt rides on top.
function anticipate(q: number): number {
  const env = 0.5 * (1 - Math.cos(2 * Math.PI * q)); // 0..1..0, velocity 0 at edges
  const tilt = Math.sin(Math.PI * q) * Math.sin(1.5 * Math.PI * q);
  return env * (0.55 * Math.sin(2 * Math.PI * q) + 0.9 * tilt);
}

/** Build the idle pose from the wall clock. Two tiers:
 *   common RUSTLE every ~6s (win 0.9s), rare GUST BEND every ~18s (win 1.2s). */
function poseFromClock(t: number): Pose {
  const pose: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0, leafWave: 0 };

  // ── COMMON: rustle traveling-wave sway (~6s, win 0.9s) ──
  // The stalk/leaves bend ~10–14px side-to-side. lean bends the whole plant;
  // leafWave adds an extra delayed wave at the leaf tips so the wind reads as
  // "passing through". Pivot near the base ⇒ the top (arm ≈ 37px) travels most.
  const qC = actionQ(t, 6.0, 0.9, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC);        // 0..1..0, zero at edges
    const rock = Math.sin(qC * Math.PI * 3);   // 1.5 rocks within the window
    pose.lean += 0.13 * env * rock;            // ~0.13 rad → ~12px at the tip
    // leaf tips trail the stalk by a quarter cycle → traveling wave
    pose.leafWave += 0.4 * env * Math.sin(qC * Math.PI * 3 - Math.PI * 0.5);
    // gentle base squash as the gust loads the plant
    pose.squashY += -0.05 * hump(qC);
    pose.squashX += 0.045 * hump(qC);
    // faint windup tilt (keeps anticipate() in the seamless toolkit; 0 at edges)
    pose.lean += 0.02 * anticipate(qC);
  }

  // ── RARE SPECIAL: strong GUST BEND (~18s, win 1.2s, phase +3s) ──
  // Anticipation lean back → big bend over (~16–20px at the top) → overshoot
  // the other way → settle. May paint outside the box at the apex (fine).
  const qS = actionQ(t, 18.0, 1.2, 3.0);
  if (qS >= 0) {
    const env = Math.sin(Math.PI * qS); // 0..1..0, zero velocity at edges
    // windup (small back-lean) → strong forward bend → overshoot → settle.
    // A decaying oscillation gives the anticipation + follow-through, all
    // scaled by env so it is exactly 0 with zero velocity at q=0 and q=1.
    const bend =
      -0.16 * Math.sin(qS * Math.PI)            // main hard bend over (one way)
      + 0.07 * Math.sin(qS * Math.PI * 2)       // anticipation + overshoot wobble
      - 0.03 * Math.sin(qS * Math.PI * 3);      // smaller follow-through settle
    pose.lean += env * bend;                    // ~0.21 rad peak → ~18–20px at tip
    // leaves whip with the bend, trailing a touch
    pose.leafWave += env * (1.3 * Math.sin(qS * Math.PI) + 0.5 * Math.sin(qS * Math.PI * 2 - 0.6));
    // the plant compresses/loads at the base through the bend, lifts slightly
    pose.squashY += hump(qS) * 0.1 - Math.abs(env) * 0.04;
    pose.squashX += -hump(qS) * 0.08;
    pose.bob += -hump(qS) * 1.4; // slight lift as it whips over
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
          const fy = -24 + prog * 42;
          const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
          ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.arc(dx, fy, r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      } else if (season === "Spring") {
        // a couple of drifting petals
        ctx.fillStyle = "rgba(255,248,232,0.9)";
        for (let i = 0; i < 2; i++) {
          const prog = ((tt / 4.0 + i * 0.5) % 1 + 1) % 1;
          const px = (i === 0 ? -10 : 9) + Math.sin(prog * Math.PI * 2) * 3;
          const py = -20 + prog * 36;
          ctx.globalAlpha = 0.35 + 0.4 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.ellipse(px, py, 1.4, 0.9, prog * 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (season === "Autumn") {
        // one slow tumbling leaf
        const prog = ((tt / 5.0) % 1 + 1) % 1;
        const px = 12 - prog * 7 + Math.sin(prog * Math.PI * 3) * 2;
        const py = -18 + prog * 34;
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(prog * Math.PI);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(prog * Math.PI * 4);
        ctx.fillStyle = "rgba(208,150,40,1)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.6, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      // Summer: no extra dressing — the gust + glossy golden ear is the show.
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
