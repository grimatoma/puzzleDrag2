// Production seasonal art for the WHEAT grain tile (`tile_grain_wheat`).
//
// An upright bundle/sheaf of wheat — three to four bearded grain ears bundled
// together with long awns fanning up, tied near the base, with thin leaves on a
// small grassy pad. The SAME sheaf silhouette is drawn every season
// (identity-safe), but the seasons swing HARD on colour (green → gold → golden
// heavy → frosted tan) plus a real seasonal prop (blossom / fallen leaf / snow
// cap + base-snow drift), and the idle is a lively WC3-style two-tier action:
//
//   IDLE COMMON  (~6s, win ~0.95s): a RUSTLE — a traveling-wave sway where the
//       stalks and heads bend ~11–14 design-px side-to-side (wind passing
//       through) with a base squash. Pivots near the base; zero velocity at the
//       window edges (seamless).
//   IDLE SPECIAL (~18s, win ~1.2s, phase +3s): a STRONG GUST BEND — the whole
//       sheaf leans hard ~16–20 design-px at the top then springs back with
//       follow-through (anticipation → big bend → overshoot → settle). May exit
//       the −24..+24 box at apex (no engine clip; fine).
//
// The architecture is a single parameterized `paint(ctx, p, pose)` where
// `interface P` holds tweenable season params (colours + prop amounts) and
// `pose` holds the idle gesture (bob / lean / squash + a `wave` for the
// traveling rustle). Because every season is the same paint with tweened P,
// transitions are seamless:
//   transition(0) ≡ draw(from), transition(1) ≡ draw(to).
// REST pose has all zeros, so draw(season) = paint(ctx, SP[season], REST) and
// the idle's pose is 0 (with zero velocity) at every action-window edge → the
// idle loops seamlessly and draw === anim(0).
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
  grainLight: RGB;       // lit grain face colour
  grainMid: RGB;         // body grain tone
  grainDeep: RGB;        // deepest grain shadow colour
  awn: RGB;              // awn (bristle) colour
  stalk: RGB;            // thin leaf / stalk colour low on the bundle
  tie: RGB;              // colour of the band tying the bundle
  padGrass: RGB;         // top of the grass pad
  padDark: RGB;          // shaded pad underside
  soil: RGB;             // contact / base soil under the bundle
  outline: RGB;          // soft dark outline tint
  light: RGB;            // ambient light tint laid over the whole tile
  lightAmt: number;      // 0..1 strength of the ambient light wash
  gloss: number;         // 0..1 sheen / dew highlight on the grains
  ripeness: number;      // 0..1 how plump/heavy the grain heads read (autumn peak)
  size: number;          // 0..1 extra ear length (summer tall lush wheat)
  awnPale: number;       // 0..1 paleness of the awn tips (spring pale)
  frostAmt: number;      // 0..1 cool frost dusting on the bundle (winter)
  snowCapAmt: number;    // 0..1 snow cap on the upward awns/heads (winter)
  padSnowAmt: number;    // 0..1 snow blanket / drift at the base (winter)
  blossomAmt: number;    // 0..1 blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad (autumn)
}

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number;     // vertical offset in design px (negative = up)
  lean: number;    // whole-sheaf lean about the base, radians
  squashX: number; // additive horizontal scale (+0.18 = 18% wider)
  squashY: number; // additive vertical scale (+0.18 = 18% taller)
  wave: number;    // traveling-wave amplitude (design px) for the rustle bend
}

const REST: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0, wave: 0 };

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
    grainLight: lerpRGB(a.grainLight, b.grainLight, t),
    grainMid: lerpRGB(a.grainMid, b.grainMid, t),
    grainDeep: lerpRGB(a.grainDeep, b.grainDeep, t),
    awn: lerpRGB(a.awn, b.awn, t),
    stalk: lerpRGB(a.stalk, b.stalk, t),
    tie: lerpRGB(a.tie, b.tie, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    gloss: lerp(a.gloss, b.gloss, t),
    ripeness: lerp(a.ripeness, b.ripeness, t),
    size: lerp(a.size, b.size, t),
    awnPale: lerp(a.awnPale, b.awnPale, t),
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
    size: clamp01(p.size),
    awnPale: clamp01(p.awnPale),
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
  // Spring — young GREEN wheat: fresh green stalks/heads, pale awns, dewy lime
  // pad, a prominent blossom; cool-bright light.
  Spring: {
    grainLight: [186, 226, 116],
    grainMid: [120, 178, 72],
    grainDeep: [78, 130, 50],
    awn: [206, 230, 150],
    stalk: [120, 184, 74],
    tie: [150, 196, 96],
    padGrass: [126, 214, 84],
    padDark: [64, 146, 56],
    soil: [120, 84, 48],
    outline: [44, 92, 40],
    light: [224, 246, 224],
    lightAmt: 0.2,
    gloss: 0.5,
    ripeness: 0.45,
    size: 0.4,
    awnPale: 1.0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 1.0,
    fallenLeafAmt: 0,
  },
  // Summer — peak: tall lush wheat ripening pale-GOLD, high gloss, warm bright
  // light, saturated green pad.
  Summer: {
    grainLight: [252, 218, 110],
    grainMid: [226, 174, 60],
    grainDeep: [168, 116, 30],
    awn: [238, 206, 110],
    stalk: [156, 178, 74],
    tie: [206, 154, 60],
    padGrass: [86, 184, 72],
    padDark: [44, 124, 52],
    soil: [128, 88, 48],
    outline: [96, 64, 24],
    light: [255, 246, 206],
    lightAmt: 0.22,
    gloss: 1.0,
    ripeness: 0.7,
    size: 1.0,
    awnPale: 0.2,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — GOLDEN heavy ripe heads (the peak): deep amber grain, tan/dry
  // stalks, dulled gloss, amber light, a fallen leaf on the pad.
  Autumn: {
    grainLight: [240, 196, 96],
    grainMid: [204, 148, 52],
    grainDeep: [142, 96, 34],
    awn: [214, 178, 100],
    stalk: [172, 144, 74],
    tie: [176, 128, 60],
    padGrass: [162, 150, 78],
    padDark: [110, 90, 48],
    soil: [120, 78, 42],
    outline: [86, 58, 26],
    light: [250, 196, 128],
    lightAmt: 0.26,
    gloss: 0.34,
    ripeness: 1.0,
    size: 0.7,
    awnPale: 0.45,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1.0,
  },
  // Winter — frosted wheat: dried tan stalks with a bold SNOW CAP on the heads
  // + a snow blanket/drift at the base, cool blue-grey light. Still reads wheat.
  Winter: {
    grainLight: [212, 198, 156],
    grainMid: [168, 152, 116],
    grainDeep: [116, 104, 82],
    awn: [202, 206, 196],
    stalk: [150, 152, 138],
    tie: [150, 150, 142],
    padGrass: [182, 202, 220],
    padDark: [122, 150, 178],
    soil: [132, 116, 102],
    outline: [60, 64, 64],
    light: [200, 224, 255],
    lightAmt: 0.34,
    gloss: 0.32,
    ripeness: 0.7,
    size: 0.5,
    awnPale: 0.7,
    frostAmt: 0.85,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Sheaf geometry — the SAME silhouette every season ────────────────────────
// Three ears fan out from a single tie point near the base of the pad: a tall
// centre ear and two shorter side ears leaning slightly out. The fan ANGLES and
// the tie point are constant for all P (only `size` nudges the ear length so
// summer reads tall — but never changes the read).

const TIE_Y = 13;   // where the bundle is tied, sitting on the pad
const TIE_X = 0;
const PIVOT_Y = TIE_Y + 4; // lean/squash pivot, low at the bound base

// Per-ear definition: [base-lean angle (rad), ear length, awn length].
const EARS: Array<{ lean: number; len: number; awn: number }> = [
  { lean: -0.34, len: 23, awn: 9 },  // left ear
  { lean: 0.0, len: 30, awn: 11 },   // centre ear (tallest)
  { lean: 0.34, len: 23, awn: 9 },   // right ear
];

/** Compute an ear's crown (where the grains end and the awns begin), given the
 *  season `size` (ear length) and the traveling-wave `wave` amplitude. Taller
 *  parts of the ear bend more, so the wave reads as wind passing through. */
function earCrown(
  ear: { lean: number; len: number },
  size: number,
  wave: number,
): { x: number; y: number; ang: number; len: number } {
  const len = ear.len * (0.9 + 0.18 * size); // summer a hair taller
  const ang = ear.lean;
  // wave bends the crown sideways proportional to its height above the tie.
  const bend = wave * (0.6 + Math.abs(ear.lean) * 0.5);
  const x = TIE_X + Math.sin(ang) * len + bend;
  const y = TIE_Y - Math.cos(ang) * len;
  return { x, y, ang, len };
}

// ── Sub-part painters (driven by p) ──────────────────────────────────────────

/** The long awns/bristles fanning up above one ear crown. */
function awnFan(
  ctx: CanvasRenderingContext2D,
  p: P,
  cx: number,
  cy: number,
  baseAng: number,
  awnLen: number,
): void {
  const col = lerpRGB(p.awn, [248, 250, 236], p.awnPale * 0.5);
  const spreadFan = 0.5; // half-angle of the fan
  for (let i = 0; i < 5; i++) {
    const f = i / 4 - 0.5; // -0.5..0.5
    const a = baseAng + f * spreadFan * 2;
    const len = awnLen * (1 - Math.abs(f) * 0.22);
    const tipX = cx + Math.sin(a) * len;
    const tipY = cy - Math.cos(a) * len;
    const bx = cx + Math.sin(a) * 1.5;
    const by = cy - Math.cos(a) * 1.5;
    // dark base pass
    ctx.strokeStyle = rgba(lerpRGB(p.awn, p.outline, 0.45), 0.8);
    ctx.lineWidth = 1.1;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    // bright bristle
    ctx.strokeStyle = rgba(col, 0.92);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

/** One ear: a vertical spike of grain lobes from the tie up to its crown, with
 *  the awn fan above. Grain plumpness reads ripeness via `p.ripeness`. */
function ear(
  ctx: CanvasRenderingContext2D,
  p: P,
  spec: { lean: number; len: number; awn: number },
  wave: number,
): void {
  const crown = earCrown(spec, p.size, wave);
  const ang = crown.ang;
  const len = crown.len;
  const nGrains = 6;
  const grainStart = 4;
  const usable = len - grainStart - 1;

  // soft dark spine first for depth (curves with the wave bend toward the crown)
  ctx.strokeStyle = rgba(p.grainDeep, 0.9);
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(TIE_X + Math.sin(ang) * grainStart, TIE_Y - Math.cos(ang) * grainStart);
  ctx.quadraticCurveTo(
    TIE_X + Math.sin(ang) * (len * 0.55),
    TIE_Y - Math.cos(ang) * (len * 0.55),
    crown.x,
    crown.y,
  );
  ctx.stroke();
  ctx.lineCap = "butt";

  const grainR = lerp(1.7, 2.8, p.ripeness); // plumper, heavier grains in autumn
  for (let i = 0; i < nGrains; i++) {
    const f = i / (nGrains - 1);
    const along = grainStart + f * usable;
    // interpolate the bend along the ear: tip bends fully, base barely.
    const tipBend = (crown.x - (TIE_X + Math.sin(ang) * len)) * (along / len) * (along / len);
    const ax = TIE_X + Math.sin(ang) * along + tipBend;
    const ay = TIE_Y - Math.cos(ang) * along;
    [-1, 1].forEach((side) => {
      const ox = Math.cos(ang) * side * (grainR * 0.7);
      const oy = Math.sin(ang) * side * (grainR * 0.7);
      const gx = ax + ox;
      const gy = ay + oy;
      const grad = ctx.createLinearGradient(gx - 2, gy - 3, gx + 2, gy + 3);
      grad.addColorStop(0, rgb(p.grainLight));
      grad.addColorStop(0.6, rgb(p.grainMid));
      grad.addColorStop(1, rgb(p.grainDeep));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(gx, gy, grainR, grainR * 1.5, ang + side * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba(p.outline, 0.7);
      ctx.lineWidth = 0.7;
      ctx.stroke();
      // small lit highlight on the upper-left of each grain (sheen reads gloss)
      ctx.fillStyle = rgb(lerpRGB(p.grainLight, [255, 255, 255], 0.4 * p.gloss));
      ctx.beginPath();
      ctx.ellipse(gx - 0.7, gy - 0.9, grainR * 0.45, grainR * 0.6, ang, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  awnFan(ctx, p, crown.x, crown.y, ang, spec.awn);
}

/** Thin leaves low on the bundle (drawn behind the ears for fullness). */
function leaves(ctx: CanvasRenderingContext2D, p: P, wave: number): void {
  ctx.strokeStyle = rgb(p.stalk);
  ctx.lineWidth = 2.0;
  ctx.lineCap = "round";
  const specs: Array<[number, number, number]> = [
    [-0.9, 14, 0.5],  // [angle, length, wave factor]
    [0.95, 13, 0.5],
    [-0.5, 16, 0.7],
  ];
  specs.forEach(([ang, len, wf]) => {
    const bend = wave * wf;
    const tipX = TIE_X + Math.sin(ang) * len + bend;
    const tipY = TIE_Y - Math.cos(ang) * len + 1;
    ctx.beginPath();
    ctx.moveTo(TIE_X, TIE_Y);
    ctx.quadraticCurveTo(
      TIE_X + Math.sin(ang) * len * 0.5 + bend * 0.4,
      TIE_Y - Math.cos(ang) * len * 0.5,
      tipX,
      tipY,
    );
    ctx.stroke();
  });
  ctx.lineCap = "butt";
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
    wave: safeNum(rawPose.wave),
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

    // pad snow blanket / base drift (winter)
    if (p.padSnowAmt > 0.01) {
      ctx.fillStyle = rgba([244, 250, 255], 0.92 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(0, 18.4, 17.4 * (0.6 + 0.4 * p.padSnowAmt), 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([210, 226, 244], 0.5 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(2, 20, 16, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // a small drift mounded at the bound base of the sheaf
      ctx.fillStyle = rgba([248, 252, 255], 0.9 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(0, TIE_Y + 2, 8, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.padSnowAmt);
      ([[-9, 17.6], [5, 19], [11, 17.4], [-3, 20]] as Array<[number, number]>).forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // blossom on the pad (spring)
    if (p.blossomAmt > 0.01) {
      const a = p.blossomAmt;
      const spots: Array<[number, number]> = [[-13, 18.5], [12, 17.8]];
      spots.forEach(([bx, by], idx) => {
        ctx.fillStyle = rgba(idx === 1 ? [255, 232, 246] : [255, 250, 252], 0.95 * a);
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
      const lv: Array<[number, number, number, RGB]> = [
        [-12, 19.6, -0.5, [206, 124, 38]],
        [12, 18.6, 0.7, [182, 70, 28]],
      ];
      lv.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgba(col, a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.6, 2.0, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba([90, 44, 16], a);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-3.4, 0);
        ctx.lineTo(3.4, 0);
        ctx.stroke();
        ctx.restore();
      });
    }

    // ── Contact shadow under the sheaf (follows the bob/lean for grounding) ───
    const tipShift = pose.lean * (PIVOT_Y - (TIE_Y - 30)); // how far the top leans
    const shadowSpread = 1 + clamp01(pose.bob < 0 ? -pose.bob / 14 : 0) * 0.5;
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0 + tipShift * 0.16, TIE_Y + 6, 9 * shadowSpread, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.26 / shadowSpread);
    ctx.beginPath();
    ctx.ellipse(2.5 + tipShift * 0.18, TIE_Y + 6.5, 11 * shadowSpread, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the wheat sheaf, under the idle pose transform ───────────────
    ctx.save();
    // Pivot low at the bound base so lean rocks the heads side-to-side and
    // squash anchors at the base (the sheaf "stands" on the pad). bob raises it.
    ctx.translate(0, PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(0, -PIVOT_Y);

    // thin leaves behind the ears
    leaves(ctx, p, pose.wave);

    // the ears (side ears first, tall centre ear in front)
    ear(ctx, p, EARS[0], pose.wave);
    ear(ctx, p, EARS[2], pose.wave);
    ear(ctx, p, EARS[1], pose.wave);

    // tie band binding the bundle near the base
    ctx.fillStyle = rgb(p.tie);
    ctx.strokeStyle = rgba(p.outline, 0.7);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(TIE_X, TIE_Y - 0.5, 4.8, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = rgb(lerpRGB(p.tie, [255, 255, 255], 0.3));
    ctx.beginPath();
    ctx.ellipse(TIE_X - 1, TIE_Y - 1.4, 1.6, 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    // frost dusting on the upward grain faces (winter)
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([234, 245, 255], 0.7 * p.frostAmt);
      const specks: Array<[number, number]> = [
        [-6, -10], [-3, -2], [-8, 2], [0, -14], [-1, -6],
        [3, -10], [6, -3], [2, 4], [-4, -16], [4, -16],
      ];
      specks.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx + pose.wave * 0.3, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // bold snow caps sitting on the upward awn tips / heads (winter)
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      EARS.forEach((spec) => {
        const crown = earCrown(spec, p.size, pose.wave);
        const ca = crown.ang;
        const capX = crown.x + Math.sin(ca) * spec.awn * 0.5;
        const capY = crown.y - Math.cos(ca) * spec.awn * 0.5;
        ctx.beginPath();
        ctx.ellipse(capX, capY, 2.8, 1.8, ca, 0, Math.PI * 2);
        ctx.fill();
      });
      // a brighter top glint on the centre cap
      ctx.fillStyle = rgba([255, 255, 255], 0.7 * a);
      const cc = earCrown(EARS[1], p.size, pose.wave);
      ctx.beginPath();
      ctx.ellipse(cc.x - 0.6, cc.y - cc.len * 0.0 - 0.6, 1.4, 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // end pose transform

    // ── Ambient light wash over the whole tile (per-season tint) ──────────────
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
function hump(q: number): number {
  const s = Math.sin(Math.PI * q);
  return s * s;
}

// An asymmetric anticipation→peak→overshoot→settle curve, 0 (with zero
// velocity) at q=0 and q=1. Dips slightly negative early (windup) then a strong
// positive peak with follow-through.
function anticipate(q: number): number {
  const env = 0.5 * (1 - Math.cos(2 * Math.PI * q)); // 0..1..0, velocity 0 at edges
  const tilt = Math.sin(Math.PI * q) * Math.sin(1.5 * Math.PI * q);
  return env * (0.55 * Math.sin(2 * Math.PI * q) + 0.9 * tilt);
}

/** Build the idle pose from the wall clock. Two tiers:
 *   common RUSTLE every ~6s (win 0.95s), rare GUST BEND every ~18s (win 1.2s). */
function poseFromClock(t: number): Pose {
  const pose: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0, wave: 0 };

  // ── COMMON: rustle traveling-wave sway (~6s, win 0.95s) ──
  // The wave amplitude bends the heads ~11–14 px side-to-side (wind passing
  // through), with a small base squash. Zero at the window edges.
  const qC = actionQ(t, 6.0, 0.95, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC); // 0..1..0, zero at edges
    const travel = Math.sin(qC * Math.PI * 3); // ~1.5 passes within the window
    pose.wave += 12.0 * env * travel;
    // a faint whole-sheaf lean rides along so the base moves too
    pose.lean += 0.05 * env * travel;
    // weight settles as the wind passes
    pose.squashY += -0.05 * hump(qC);
    pose.squashX += 0.045 * hump(qC);
    // faint windup tilt (keeps the anticipate() toolkit in play; 0 at edges)
    pose.lean += 0.015 * anticipate(qC);
  }

  // ── RARE SPECIAL: strong GUST BEND (~18s, win 1.2s, phase +3s) ──
  // The whole sheaf leans HARD (~16–20 px at the top) then springs back with
  // anticipation → big bend → overshoot → settle. May exit the box at apex.
  const qS = actionQ(t, 18.0, 1.2, 3.0);
  if (qS >= 0) {
    // anticipate() gives windup (slight reverse) → big bend → overshoot → settle.
    const gust = anticipate(qS);
    // lean arm to the centre crown ≈ 34 px → 0.5 rad ≈ 17 px top travel.
    pose.lean += 0.52 * gust;
    // the heads/awns whip a touch further than the base via the wave channel.
    pose.wave += 7.0 * gust;
    // body compresses as it bends, springs tall on the overshoot.
    pose.squashY += -0.06 * Math.abs(gust);
    pose.squashX += 0.05 * Math.abs(gust);
    // tiny dip at the base of the bend for weight
    pose.bob += 0.8 * hump(qS);
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
          const py = -16 + prog * 34;
          ctx.globalAlpha = 0.35 + 0.4 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.ellipse(px, py, 1.4, 0.9, prog * 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (season === "Autumn") {
        // a couple of grains/chaff shedding off the heavy heads
        ctx.fillStyle = "rgba(196,140,48,1)";
        const seeds: Array<[number, number]> = [[-6, 0.0], [5, 0.5]];
        seeds.forEach(([sx, phase]) => {
          const prog = ((tt / 3.4 + phase) % 1 + 1) % 1;
          const px = sx + Math.sin(prog * Math.PI * 2 + phase * 6) * 2;
          const py = -8 + prog * 24;
          ctx.globalAlpha = (0.4 + 0.4 * Math.sin(prog * Math.PI)) * (1 - prog * 0.4);
          ctx.beginPath();
          ctx.ellipse(px, py, 1.5, 2.1, 0.2, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
      // Summer: no extra dressing — the gust + glossy gold is the show.
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
