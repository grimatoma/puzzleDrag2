// BOLD seasonal art for the COCONUT fruit tile (`tile_fruit_coconut`).
//
// One round coconut with a fibrous husk (the three dark "eyes" / face on the
// front) and a small green sprout-tuft on top, resting low-centre on a grassy
// pad. The SAME round silhouette + face + tuft is drawn EVERY season — identity
// is locked; only colour and a real seasonal PROP swing hard:
//
//   Spring:  GREEN young coconut (husk green-tinged) + a blossom on the crown.
//   Summer:  green-brown maturing husk at PEAK, the green tuft fresh + glossy.
//   Autumn:  full ripe BROWN fibrous coconut + a fallen frond/leaf on the pad.
//   Winter:  brown coconut clearly under a white SNOW CAP + base snow + frost.
//
// The idle is a distinct, in-character two-tier beat (NOT a generic bounce):
//   IDLE COMMON  (~6s, win ~1.0s): a slow HEAVY ROCK — the bottom-heavy coconut
//       rocks side-to-side like a palm-weighted nut, ~0.16 rad, with a base
//       squash + a faint sprout sway. The calm, characterful resting beat. Zero
//       value AND velocity at the window edges → seamless.
//   IDLE RARE    (~18s, win ~3.0s): the coconut CRACKS — a jagged split snaps
//       open across the husk and a few drops of coconut WATER well up and fall
//       from the seam, then it settles and the crack fades. Drawn as an additive
//       overlay in anim() (the crack/water are NEVER in the still). The coconut
//       gives a tiny JOLT (a small squash) at the instant it cracks. The crack,
//       the drips, and the jolt are exactly 0 — and the seam absent — at the
//       window edges (and therefore at t=0).
//
// Architecture mirrors apple.bold.ts: a single parameterized
// `paint(ctx, p, pose)` where `interface P` holds tweenable season params
// (colours + prop amounts) and `pose` holds the idle gesture (bob / lean /
// squash); the RARE crack + water ride along in anim() as an additive overlay
// driven by a shared clock that also gates the jolt. Because every season is the
// same paint with tweened P, transitions are seamless: transition(0) ≡
// draw(from), transition(1) ≡ draw(to). REST pose is all zeros, so
// draw(season) = paint(ctx, SP[season], REST) and the idle's pose is 0 at every
// action-window edge → seamless loop.
//
// PALETTE LOCK: the coconut stays BROWN-ish (greener when young) with a GREEN
// sprout-tuft all year. Ripeness is shown ONLY as husk colour green→brown; it
// is never a different object, never hollowed out, never swapped.
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
  huskLight: RGB;        // lit upper-left face of the fibrous husk
  huskMid: RGB;          // body tone of the husk
  huskDark: RGB;         // shadowed lower-right of the husk
  fibre: RGB;            // hair-fibre streaks combed over the husk
  eye: RGB;              // the three dark "eyes" on the face
  tuftLight: RGB;        // lit green sprout-tuft
  tuftDark: RGB;         // shaded sprout-tuft
  padGrass: RGB;         // top of the grass pad
  padDark: RGB;          // shaded pad underside
  soil: RGB;             // contact / base soil under the coconut
  outline: RGB;          // soft dark outline tint
  light: RGB;            // ambient light tint laid over the whole tile
  lightAmt: number;      // 0..1 strength of the ambient light wash
  ripeness: number;      // 0..1 green→brown husk (informs fibre/face contrast)
  gloss: number;         // 0..1 specular sheen on the husk
  frostAmt: number;      // 0..1 cool frost dusting on the husk (winter)
  snowCapAmt: number;    // 0..1 snow cap on the crown of the coconut (winter)
  padSnowAmt: number;    // 0..1 snow blanket on the pad / base (winter)
  blossomAmt: number;    // 0..1 blossom on the crown + pad (spring)
  fallenLeafAmt: number; // 0..1 fallen frond/leaf on the pad (autumn)
}

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number;     // vertical offset in design px (negative = up)
  lean: number;    // top-of-coconut sway, radians (rock side to side)
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
    huskLight: lerpRGB(a.huskLight, b.huskLight, t),
    huskMid: lerpRGB(a.huskMid, b.huskMid, t),
    huskDark: lerpRGB(a.huskDark, b.huskDark, t),
    fibre: lerpRGB(a.fibre, b.fibre, t),
    eye: lerpRGB(a.eye, b.eye, t),
    tuftLight: lerpRGB(a.tuftLight, b.tuftLight, t),
    tuftDark: lerpRGB(a.tuftDark, b.tuftDark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    ripeness: lerp(a.ripeness, b.ripeness, t),
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
    ripeness: clamp01(p.ripeness),
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
//
// PALETTE LOCK: husk stays brown-ish (greener when young), tuft stays green.
// Spring = young GREEN coconut (husk green) + blossom; Summer = green-brown
// maturing husk at PEAK saturation, glossy fresh tuft; Autumn = full ripe BROWN
// fibrous coconut + fallen frond; Winter = brown coconut clearly visible under
// a bold snow cap + base snow + frost.

const SP: Record<SeasonName, P> = {
  // Spring — young GREEN coconut: husk clearly green, dewy lime pad + blossom.
  Spring: {
    huskLight: [168, 210, 110],
    huskMid: [112, 168, 70],
    huskDark: [66, 116, 46],
    fibre: [88, 138, 54],
    eye: [62, 78, 40],
    tuftLight: [158, 224, 100],
    tuftDark: [76, 150, 56],
    padGrass: [128, 210, 86],
    padDark: [68, 142, 58],
    soil: [120, 84, 48],
    outline: [38, 64, 28],
    light: [230, 246, 220],
    lightAmt: 0.18,
    ripeness: 0.12,
    gloss: 0.24,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 1.0,
    fallenLeafAmt: 0,
  },
  // Summer — maturing green-brown husk at PEAK saturation; mid-green pad, gloss.
  Summer: {
    huskLight: [198, 154, 84],
    huskMid: [158, 112, 56],
    huskDark: [104, 68, 34],
    fibre: [126, 86, 42],
    eye: [54, 38, 22],
    tuftLight: [150, 220, 84],
    tuftDark: [62, 146, 48],
    padGrass: [84, 174, 72],
    padDark: [42, 114, 50],
    soil: [126, 86, 48],
    outline: [60, 38, 20],
    light: [255, 242, 204],
    lightAmt: 0.2,
    ripeness: 0.58,
    gloss: 1.0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — full ripe BROWN fibrous coconut; olive-tan pad, fallen frond.
  Autumn: {
    huskLight: [172, 120, 66],
    huskMid: [126, 80, 42],
    huskDark: [82, 48, 26],
    fibre: [104, 62, 30],
    eye: [46, 30, 18],
    tuftLight: [156, 150, 78],
    tuftDark: [106, 108, 50],
    padGrass: [156, 154, 84],
    padDark: [108, 96, 50],
    soil: [120, 80, 44],
    outline: [52, 32, 18],
    light: [250, 204, 138],
    lightAmt: 0.24,
    ripeness: 1.0,
    gloss: 0.36,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1.0,
  },
  // Winter — cool blue-grey light; brown coconut CLEARLY visible under a bold
  // snow cap + a snow drift at the base + frost dusting.
  Winter: {
    huskLight: [156, 118, 82],
    huskMid: [120, 86, 58],
    huskDark: [80, 56, 40],
    fibre: [104, 74, 50],
    eye: [50, 36, 28],
    tuftLight: [132, 174, 122],
    tuftDark: [80, 126, 82],
    padGrass: [182, 202, 220],
    padDark: [122, 150, 178],
    soil: [132, 116, 102],
    outline: [48, 38, 36],
    light: [200, 224, 255],
    lightAmt: 0.34,
    ripeness: 0.9,
    gloss: 0.26,
    frostAmt: 0.8,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Coconut geometry — the SAME silhouette every season ──────────────────────
//
// A round body resting low-centre on the pad. Origin-centered. The crown (top)
// sits a touch left of centre; the tuft rises from there. Idle pose rocks/bounces
// the body about a pivot near the base so it "sits" on the pad.
const COCO_CX = 0;             // body centre x
const COCO_CY = 7;            // body centre y (low on the pad)
const COCO_RX = 13.5;         // body half-width
const COCO_RY = 14;           // body half-height
const TUFT_X = -2;            // tuft sprouts a touch left of crown
const TUFT_Y = COCO_CY - COCO_RY; // crown top
const COCO_BASE_Y = COCO_CY + COCO_RY; // resting base on the pad (pose pivot)

// The three husk "eyes" forming the face, slightly above body centre.
const EYES: Array<[number, number, number]> = [
  [-4.4, COCO_CY - 2.4, 1.7],
  [4.2, COCO_CY - 2.6, 1.7],
  [-0.2, COCO_CY + 1.6, 1.9],
];

/** Trace the round coconut body path (origin-local, unposed). */
function coconutBodyPath(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.ellipse(COCO_CX, COCO_CY, COCO_RX, COCO_RY, 0, 0, Math.PI * 2);
  ctx.closePath();
}

/** Draw the small green sprout-tuft rising from the crown (origin-local). `sway`
 *  shifts the tips horizontally for a faint extra wiggle (0 = rest pose). */
function drawTuft(ctx: CanvasRenderingContext2D, p: P, sway: number): void {
  const baseX = COCO_CX + TUFT_X;
  const baseY = TUFT_Y + 1.5;
  // a few short blades fanning up from the crown
  const blades: Array<[number, number]> = [
    [-3.6, -7.5],
    [-1.2, -10.5],
    [1.4, -9.5],
    [3.6, -6.5],
  ];
  blades.forEach(([dx, dy], i) => {
    const tipX = baseX + dx + sway * (0.6 + i * 0.18);
    const tipY = baseY + dy;
    // dark base pass
    ctx.strokeStyle = rgb(p.tuftDark);
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(baseX + dx * 0.3, baseY);
    ctx.quadraticCurveTo(baseX + dx * 0.8 + sway * 0.4, baseY + dy * 0.5, tipX, tipY);
    ctx.stroke();
    // bright fresh blade
    ctx.strokeStyle = rgb(p.tuftLight);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(baseX + dx * 0.3, baseY);
    ctx.quadraticCurveTo(baseX + dx * 0.8 + sway * 0.4, baseY + dy * 0.5, tipX, tipY);
    ctx.stroke();
  });
  ctx.lineCap = "butt";
  // a small green nub where the tuft meets the husk crown
  ctx.fillStyle = rgb(p.tuftDark);
  ctx.beginPath();
  ctx.ellipse(baseX, baseY + 0.4, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ── The single parameterized paint ───────────────────────────────────────────

/** The whole tile from ONLY `p` (season identity) and `pose` (idle gesture).
 *  `tuftSway` is a faint additive tuft wiggle layered on top of the pose. */
function paint(
  ctx: CanvasRenderingContext2D,
  raw: P,
  rawPose: Pose,
  tuftSway = 0,
): void {
  const p = clampP(raw);
  const pose: Pose = {
    bob: safeNum(rawPose.bob),
    lean: safeNum(rawPose.lean),
    squashX: safeNum(rawPose.squashX),
    squashY: safeNum(rawPose.squashY),
  };
  const sway = safeNum(tuftSway);

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

    // pad snow blanket / base snow (winter)
    if (p.padSnowAmt > 0.01) {
      ctx.fillStyle = rgba([244, 250, 255], 0.92 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(0, 18.4, 17.4 * (0.6 + 0.4 * p.padSnowAmt), 4.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([210, 226, 244], 0.5 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(2, 20, 16, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // snow piled against the coconut base
      ctx.fillStyle = rgba([248, 252, 255], 0.85 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(0, COCO_BASE_Y - 1, 11, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // sparkle on the snow
      ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.padSnowAmt);
      ([[-9, 17.6], [5, 19], [11, 17.4], [-3, 20]] as Array<[number, number]>).forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // blossoms on the pad (spring)
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

    // fallen frond / leaves on the pad (autumn)
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const leaves: Array<[number, number, number, RGB]> = [
        [-12, 19.6, -0.5, [200, 122, 40]],
        [12, 18.6, 0.7, [178, 70, 28]],
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

    // ── Contact shadow under the coconut (follows the bob/lean for grounding) ──
    const tipShift = pose.lean * (COCO_BASE_Y - TUFT_Y); // how far the crown leans
    const shadowSpread = 1 + clamp01(pose.bob < 0 ? -pose.bob / 13 : 0) * 0.5;
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0 + tipShift * 0.15, COCO_BASE_Y + 0.5, 9 * shadowSpread, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.28 / shadowSpread);
    ctx.beginPath();
    ctx.ellipse(3 + tipShift * 0.18, COCO_BASE_Y + 1, 12 * shadowSpread, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the coconut, under the idle pose transform ──────────────────
    ctx.save();
    // Pivot near the base so lean rocks the CROWN side-to-side and squash anchors
    // at the base (it "sits" on the pad). bob raises the whole body.
    ctx.translate(0, COCO_BASE_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(0, -COCO_BASE_Y);

    // 1) soft dark outline pass (drawn slightly fatter, dark first then light)
    ctx.save();
    coconutBodyPath(ctx);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = rgb(p.outline);
    ctx.stroke();
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();
    ctx.restore();

    // 2) husk body fill, clipped so detail stays inside the rim
    ctx.save();
    coconutBodyPath(ctx);
    ctx.clip();

    const cy = COCO_CY;

    // base mid tone
    ctx.fillStyle = rgb(p.huskMid);
    ctx.fillRect(COCO_CX - COCO_RX - 3, cy - COCO_RY - 3, (COCO_RX + 3) * 2, (COCO_RY + 3) * 2);

    // light from upper-left: a lit lobe on the upper-left face
    const litGrad = ctx.createRadialGradient(
      COCO_CX - 5, cy - 6, 2,
      COCO_CX - 2, cy - 1, COCO_RX + 6,
    );
    litGrad.addColorStop(0, rgb(p.huskLight));
    litGrad.addColorStop(0.5, rgb(p.huskMid));
    litGrad.addColorStop(1, rgb(p.huskDark));
    ctx.fillStyle = litGrad;
    ctx.beginPath();
    ctx.ellipse(COCO_CX, cy, COCO_RX, COCO_RY, 0, 0, Math.PI * 2);
    ctx.fill();

    // lower-right shadow lobe to round the body
    ctx.fillStyle = rgba(p.huskDark, 0.55);
    ctx.beginPath();
    ctx.ellipse(COCO_CX + 4, cy + 4, COCO_RX * 0.82, COCO_RY * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();

    // fibrous husk hairs — short combed strokes following the round surface
    ctx.lineCap = "round";
    for (let i = 0; i < 34; i++) {
      // deterministic pseudo-scatter over the body
      const ang = (i * 2.39996) % (Math.PI * 2);
      const rad = ((i * 0.61803) % 1) * 0.86 + 0.06;
      const sx = COCO_CX + Math.cos(ang) * COCO_RX * rad;
      const sy = cy + Math.sin(ang) * COCO_RY * rad;
      // streak runs roughly downward (combed husk), darker on the right
      const dir = sx < COCO_CX ? -1 : 1;
      ctx.strokeStyle = rgba(p.fibre, 0.5 + 0.25 * (0.5 + 0.5 * Math.sin(i)));
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 1.6);
      ctx.quadraticCurveTo(sx + dir * 0.6, sy, sx + dir * 0.4, sy + 2.2);
      ctx.stroke();
    }
    // a few brighter combed highlights on the lit face
    ctx.strokeStyle = rgba(p.huskLight, 0.4);
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 10; i++) {
      const sx = COCO_CX - 6 + (i % 3) * 3 - 1;
      const sy = cy - 6 + Math.floor(i / 3) * 3;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 1.4);
      ctx.lineTo(sx - 0.6, sy + 1.8);
      ctx.stroke();
    }

    // the three husk "eyes" / face — dark recessed dots
    EYES.forEach(([ex, ey, er]) => {
      const y = ey;
      // soft socket shadow
      ctx.fillStyle = rgba(p.huskDark, 0.7);
      ctx.beginPath();
      ctx.ellipse(ex, y, er + 0.8, er + 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      // dark eye
      ctx.fillStyle = rgb(p.eye);
      ctx.beginPath();
      ctx.ellipse(ex, y, er, er, 0, 0, Math.PI * 2);
      ctx.fill();
      // tiny rim highlight upper-left of each eye
      ctx.fillStyle = rgba(p.huskLight, 0.35);
      ctx.beginPath();
      ctx.arc(ex - er * 0.4, y - er * 0.4, er * 0.4, 0, Math.PI * 2);
      ctx.fill();
    });

    // specular sheen on the husk (gloss strength from P)
    if (p.gloss > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.12 + 0.5 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(COCO_CX - 5.5, cy - 6.5, 3.4, 5.2, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([255, 255, 255], 0.08 + 0.3 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(COCO_CX + 1, cy - 8, 1.6, 2.6, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // frost dusting (winter) — cool blue speckle on the upward husk
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.26 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(COCO_CX - 1, cy - 6, COCO_RX * 0.9, COCO_RY * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-8, cy - 7], [-3, cy - 9], [3, cy - 8], [8, cy - 5],
        [-6, cy - 2], [5, cy - 1], [0, cy - 4],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.lineCap = "butt";
    ctx.restore(); // end body clip

    // 3) snow cap on the crown (winter) — drawn over, hugging the top rim
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      const cyTop = cy - COCO_RY;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(COCO_CX - COCO_RX * 0.72, cyTop + 5);
      ctx.quadraticCurveTo(COCO_CX - 5, cyTop - 2, COCO_CX, cyTop - 1);
      ctx.quadraticCurveTo(COCO_CX + 5, cyTop - 2, COCO_CX + COCO_RX * 0.72, cyTop + 5);
      ctx.quadraticCurveTo(COCO_CX + 7.5, cyTop + 8.5, COCO_CX + 2, cyTop + 6.5);
      ctx.quadraticCurveTo(COCO_CX, cyTop + 9, COCO_CX - 2, cyTop + 6.5);
      ctx.quadraticCurveTo(COCO_CX - 7.5, cyTop + 8.5, COCO_CX - COCO_RX * 0.72, cyTop + 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(COCO_CX, cyTop + 5.6, COCO_RX * 0.62, 1.9, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Blossom on the crown (spring) — a bright bloom tucked by the tuft ─────
    if (p.blossomAmt > 0.01) {
      const a = p.blossomAmt;
      const bx = COCO_CX + 5.5;
      const by = COCO_CY - COCO_RY + 4;
      ctx.fillStyle = rgba([255, 250, 252], 0.95 * a);
      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(bx + Math.cos(ang) * 2.0, by + Math.sin(ang) * 1.4, 1.5, 1.1, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = rgba([255, 214, 90], a);
      ctx.beginPath();
      ctx.arc(bx, by, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Green sprout-tuft on top (SAME placement every season) ────────────────
    drawTuft(ctx, p, sway);

    ctx.restore(); // end pose transform

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

// ── Shared RARE-window clock — the CRACK event ───────────────────────────────
// COMMON and RARE never overlap: COMMON fires every 6s at phase 0 (win 1.0s) so
// its windows are t mod 6 ∈ [0,1) (i.e. 0,6,12,18…). The RARE crack uses period
// 18s, phase 3.0s, win 3.0s; because actionQ ADVANCES the clock by `phase`, its
// open window is t mod 18 ∈ [15,18) — a 3s beat that ends right before each 18s
// mark and is fully clear of every COMMON window. One source of truth so the
// coconut JOLT (in poseFromClock) and the crack+water overlay (in anim) stay in
// lockstep.
const CRACK_PERIOD = 18.0;
const CRACK_WIN = 3.0;
const CRACK_PHASE = 3.0;

/** Progress 0..1 through the crack window, else −1 (crack fully hidden). */
function crackQ(t: number): number {
  return actionQ(t, CRACK_PERIOD, CRACK_WIN, CRACK_PHASE);
}

/** How OPEN the crack is, 0..1 — it SNAPS open fast (first ~14%), holds open
 *  while the water wells and drips, then seals back. Exactly 0 with zero slope
 *  at q=0 and q=1 (the whole event fades in and out of REST), so the seam is
 *  absent on the still and at every window edge. `sin(π·q)` would peak instead
 *  of hold, so we shape it explicitly: a smootherstep snap up, a flat hold, and
 *  a mirrored smootherstep seal. */
function crackOpen(q: number): number {
  if (!(q >= 0) || q >= 1) return 0;
  const up = 0.14; // fast SNAP open
  const down = 0.3; // slower seal
  if (q < up) return smoother(q / up); // 0→1, zero slope at q=0
  if (q > 1 - down) return smoother((1 - q) / down); // 1→0, zero slope at q=1
  return 1; // held open while the water drips
}

/** Build the idle pose from the wall clock. Two tiers, neither a bounce:
 *   COMMON — a slow HEAVY palm-like ROCK side-to-side every ~6s (win 1.0s).
 *   RARE   — a tiny JOLT (a quick squash) at the instant the coconut cracks,
 *            every ~18s, fully synced to the crack+water overlay in anim(). */
function poseFromClock(t: number): Pose {
  const pose: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0 };

  // ── COMMON: slow heavy side-to-side rock (~6s, win 1.0s) ──
  // Crown arm ≈ (COCO_BASE_Y - TUFT_Y) ≈ 28 px → ~0.16 rad gives a hefty sway.
  // The bottom-heavy nut leans out, through centre, to the other side, settles.
  const qC = actionQ(t, 6.0, 1.0, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC); // 0..1..0, zero at edges
    const rock = Math.sin(qC * Math.PI * 3); // 1.5 rocks within the window
    pose.lean += 0.16 * env * rock;
    // a heavy squat at the base as it rocks (weight settling side to side)
    pose.squashY += -0.06 * hump(qC);
    pose.squashX += 0.05 * hump(qC);
  }

  // ── RARE: a tiny JOLT as the coconut CRACKS (~18s) ──
  // A quick squash recoil at the instant the seam snaps open. Enveloped by the
  // crack's own open-amount (0 at the window edges) AND a hump that peaks with
  // the snap, so the jolt is exactly 0 at q=0 and q=1 and reads as the impact of
  // the crack rather than a drift.
  const q = crackQ(t);
  const open = crackOpen(q);
  if (open > 0) {
    // a sharp snap pulse concentrated near the moment the crack opens (~q=0.1):
    // 0 at q=0, rises fast, decays back to ~0 over the rest of the window.
    const snap = q < 0.4 ? Math.sin((q / 0.4) * Math.PI) : 0; // 0..1..0 within the snap
    const jolt = snap * open; // gated by open → 0 at the edges
    pose.squashY += -0.08 * jolt; // squat down on the crack
    pose.squashX += 0.07 * jolt; // and bulge wide
    // a faint side recoil that settles, 0 at the edges via `open`
    pose.lean += 0.03 * Math.sin(q * Math.PI * 2) * open;
  }

  return pose;
}

// ── The CRACK + WATER overlay — additive, drawn over the painted coconut ──────
// A jagged split snaps open across the husk's lit upper-left face, beads of
// coconut water well at the seam, and a few droplets fall away and fade. Driven
// ONLY by t through the shared crack clock. Invisible when `open` (from
// crackOpen) is 0, so it is exactly absent at the window edges (and at t=0) and
// NEVER on the still.

// The seam runs from the upper-left shoulder down across toward the centre of
// the body. A fixed jagged polyline (design-local, unposed) traced over the husk.
const CRACK_PTS: Array<[number, number]> = [
  [-9.5, COCO_CY - 9.5],
  [-6.2, COCO_CY - 6.0],
  [-7.4, COCO_CY - 3.0],
  [-3.6, COCO_CY - 0.4],
  [-4.6, COCO_CY + 2.8],
  [-1.0, COCO_CY + 4.6],
];

const WATER: RGB = [206, 236, 244]; // cool coconut-water highlight
const WATER_MID: RGB = [150, 206, 222]; // body of a droplet
const WATER_LO: RGB = [96, 162, 188]; // shaded underside of a droplet

/** Draw the crack seam + welling/falling coconut water. `open` (0..1) snaps the
 *  seam wide and gates ALL alpha; `drip` (0..1) advances the falling droplets
 *  within the window. At open<=0 nothing is drawn (the husk is intact). */
function drawCrack(ctx: CanvasRenderingContext2D, open: number, drip: number): void {
  const o = clamp01(open);
  if (o <= 0.001) return;
  const d = clamp01(drip);

  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // 1) The dark inner gap — a slightly fattened dark stroke that widens with
    //    `open`, so the seam reads as splitting APART (only while open).
    ctx.strokeStyle = rgba([26, 16, 10], 0.85 * o);
    ctx.lineWidth = 0.8 + 2.6 * o;
    ctx.beginPath();
    ctx.moveTo(CRACK_PTS[0][0], CRACK_PTS[0][1]);
    for (let i = 1; i < CRACK_PTS.length; i++) {
      ctx.lineTo(CRACK_PTS[i][0], CRACK_PTS[i][1]);
    }
    ctx.stroke();

    // 2) A thin lit lip along the upper edge of the seam (catches the light).
    ctx.strokeStyle = rgba([240, 224, 196], 0.5 * o);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(CRACK_PTS[0][0] - 0.5, CRACK_PTS[0][1] - 0.6);
    for (let i = 1; i < CRACK_PTS.length; i++) {
      ctx.lineTo(CRACK_PTS[i][0] - 0.5, CRACK_PTS[i][1] - 0.6);
    }
    ctx.stroke();

    // 3) Beads of water welling along the seam (a few fixed spots, alpha by open).
    const beads: Array<[number, number, number]> = [
      [-6.6, COCO_CY - 4.8, 1.2],
      [-4.1, COCO_CY + 0.2, 1.5],
      [-3.0, COCO_CY + 3.4, 1.3],
    ];
    beads.forEach(([bx, by, br]) => {
      ctx.fillStyle = rgba(WATER_MID, 0.85 * o);
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(WATER, 0.9 * o);
      ctx.beginPath();
      ctx.arc(bx - br * 0.3, by - br * 0.35, br * 0.45, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4) Falling droplets — each spawns at a seam point and falls under a simple
    //    accelerating arc, fading near the bottom. The set is phase-staggered so
    //    a little stream trickles out while the seam holds open. Everything is
    //    gated by `o`, so droplets vanish as the crack seals (and at the edges).
    const drops: Array<[number, number, number]> = [
      [-4.1, COCO_CY + 0.6, 0.0],
      [-3.0, COCO_CY + 3.8, 0.35],
      [-5.2, COCO_CY - 2.0, 0.7],
    ];
    drops.forEach(([sx, sy, phase]) => {
      // per-drop progress 0..1, wrapping within the window
      const f = (d + phase) % 1;
      // fall distance accelerates (gravity), out to ~16px below the seam
      const fall = 16 * f * f;
      const dx = sx + Math.sin(phase * 6.2) * 0.6; // slight horizontal offset
      const dy = sy + 2 + fall;
      // fade in as it leaves the seam, fade out as it nears the ground
      const life = Math.sin(Math.min(1, f / 0.9) * Math.PI);
      const a = 0.9 * o * clamp01(life);
      if (a <= 0.01) return;
      // a small teardrop: round bottom, tapered top, with a highlight
      const r = 1.5 - 0.4 * f;
      ctx.fillStyle = rgba(WATER_LO, a);
      ctx.beginPath();
      ctx.moveTo(dx, dy - r * 2.0);
      ctx.quadraticCurveTo(dx + r, dy - r * 0.2, dx, dy + r);
      ctx.quadraticCurveTo(dx - r, dy - r * 0.2, dx, dy - r * 2.0);
      ctx.fill();
      ctx.fillStyle = rgba(WATER_MID, a);
      ctx.beginPath();
      ctx.arc(dx, dy, r * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(WATER, a);
      ctx.beginPath();
      ctx.arc(dx - r * 0.3, dy - r * 0.3, r * 0.32, 0, Math.PI * 2);
      ctx.fill();
    });
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], REST, 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const tt = Number.isFinite(t) ? t : 0;
    // the green tuft sways gently every season (additive, subtle)
    const tuftSway = Math.sin(tt * 1.7) * 1.0 + Math.sin(tt * 1.7 + 1) * 0.4;
    paint(ctx, SP[season], poseFromClock(tt), tuftSway);

    // RARE CRACK event (all seasons) — the husk splits, coconut water wells at
    // the seam and a few droplets fall, then it seals. Additive overlay only;
    // fully synced to the JOLT in poseFromClock via the shared crack clock.
    // `open` is 0 at the window edges (and so at t=0), so nothing is drawn at
    // rest and the seam is never on the still.
    const cq = crackQ(tt);
    const open = crackOpen(cq);
    if (open > 0) {
      // `drip` advances the falling droplets across the open window; tied to cq
      // so the stream only trickles while the seam is actually split.
      drawCrack(ctx, open, cq);
    }

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
        ctx.fillStyle = "rgba(200,98,32,1)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.4, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      // Summer: no extra dressing — the bounce + glossy husk is the show.
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
    paint(ctx, lerpP(from, to, k), REST, 0);
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
