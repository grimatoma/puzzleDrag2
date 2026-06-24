// BOLD seasonal art for the CUCUMBER vegetable tile (`tile_veg_cucumber`).
// Source: src/textures/seasonal/veg/cucumber.ts
//
// Category framing: Fruit / Veg — the iconic harvested ITEM only (never a vine
// or bush). ONE green cucumber: an elongated, slightly-curved cylinder with
// rounded ends and a ribbed dark-green skin, resting at a gentle diagonal on a
// grassy pad, with a tiny yellow cucumber flower + small leaf at the stem end.
// The SAME silhouette is drawn every season — only colour and the small
// dressing change. The cucumber stays GREEN all year (palette lock); ripeness
// reads as colour/shade only.
//
// This is the BOLD variant (mirrors pepper.bold.ts): seasons swing HARD on
// colour + a real seasonal prop (blossom / fallen leaf / snow cap + base snow).
// The idle is a LENGTH-WISE ROLL, not a vertical hop — a long horizontal
// cucumber rolling/rocking about its long axis suits this form far better than
// a jump (there is NO vertical bob anywhere in the idle):
//
//   IDLE COMMON  (~6s, win ~1.0s): a gentle length-wise ROCK/ROLL — the long
//       cucumber rolls a little side-to-side about its long axis (a small lean
//       out, through level, to the other side and back) with a faint flex
//       (squash), as if it might roll away. Calm; NO vertical hop. Zero value
//       AND velocity at the window edges (seamless).
//   IDLE RARE    (~18s, win ~1.6s, phased clear of COMMON): a bigger LENGTH-WISE
//       BEND/ROLL — a fuller roll to one side, through to the other, plus a
//       pronounced bow/flex along its length (wide+thin then settle), then it
//       rights itself. Implemented purely via lean (roll/rock) + squashX/squashY
//       (flex/bow); explicitly NO vertical bounce.
//
// Architecture mirrors pepper.bold.ts: a single parameterized
// `paint(ctx, p, pose)` where `interface P` holds tweenable season params
// (colours + prop amounts) and `pose` holds the idle gesture
// (bob / lean / squash). Because every season is the same paint with tweened P,
// transitions are seamless:
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
  skinLight: RGB;        // lit upper face of the cucumber skin
  skinMid: RGB;          // body tone
  skinDark: RGB;         // shadowed underside / ribs
  speckle: RGB;          // pale speckles dotting the skin
  flower: RGB;           // the little yellow cucumber blossom at the stem end
  leaf: RGB;             // the small leaf at the stem end
  padGrass: RGB;         // top of the grass pad
  padDark: RGB;          // shaded pad underside
  soil: RGB;             // contact / base soil under the cucumber
  outline: RGB;          // soft dark outline tint
  light: RGB;            // ambient light tint laid over the whole tile
  lightAmt: number;      // 0..1 strength of the ambient light wash
  gloss: number;         // 0..1 specular sheen along the skin
  speckleAmt: number;    // 0..1 visibility of pale skin speckles
  frostAmt: number;      // 0..1 cool frost dusting on the skin (winter)
  snowCapAmt: number;    // 0..1 snow ridge along the cucumber's upper side (winter)
  padSnowAmt: number;    // 0..1 snow blanket at the base / on the pad (winter)
  blossomAmt: number;    // 0..1 blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad (autumn)
}

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number;     // vertical offset in design px (negative = up)
  lean: number;    // raised-tip sway, radians (rock side to side)
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
    skinLight: lerpRGB(a.skinLight, b.skinLight, t),
    skinMid: lerpRGB(a.skinMid, b.skinMid, t),
    skinDark: lerpRGB(a.skinDark, b.skinDark, t),
    speckle: lerpRGB(a.speckle, b.speckle, t),
    flower: lerpRGB(a.flower, b.flower, t),
    leaf: lerpRGB(a.leaf, b.leaf, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    gloss: lerp(a.gloss, b.gloss, t),
    speckleAmt: lerp(a.speckleAmt, b.speckleAmt, t),
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
    speckleAmt: clamp01(p.speckleAmt),
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
  // Spring — small young PALE-green cucumber, dewy lime pad + a yellow flower
  // and prominent pad blossoms. Soft cool-bright light.
  Spring: {
    skinLight: [192, 228, 124],
    skinMid: [128, 190, 78],
    skinDark: [74, 138, 56],
    speckle: [220, 244, 172],
    flower: [255, 226, 96],
    leaf: [122, 192, 86],
    padGrass: [128, 210, 86],
    padDark: [70, 140, 58],
    soil: [120, 84, 48],
    outline: [36, 72, 32],
    light: [232, 246, 224],
    lightAmt: 0.18,
    gloss: 0.34,
    speckleAmt: 0.5,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 1.0,
    fallenLeafAmt: 0,
  },
  // Summer — full vivid GREEN cucumber at peak, crisp pale speckles, max gloss.
  // Bright warm light, saturated mid-green pad.
  Summer: {
    skinLight: [156, 224, 92],
    skinMid: [70, 178, 56],
    skinDark: [30, 112, 42],
    speckle: [210, 244, 156],
    flower: [255, 214, 70],
    leaf: [78, 172, 62],
    padGrass: [82, 178, 70],
    padDark: [40, 116, 50],
    soil: [126, 86, 48],
    outline: [20, 72, 32],
    light: [255, 244, 204],
    lightAmt: 0.2,
    gloss: 1.0,
    speckleAmt: 1.0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — dulling DEEP-green cucumber, a touch waxy / overripe; olive-tan
  // pad + a fallen leaf. Low amber light. Still clearly green.
  Autumn: {
    skinLight: [116, 152, 68],
    skinMid: [62, 108, 46],
    skinDark: [36, 70, 34],
    speckle: [162, 184, 120],
    flower: [218, 184, 80],
    leaf: [134, 138, 62],
    padGrass: [152, 152, 84],
    padDark: [106, 96, 50],
    soil: [120, 80, 44],
    outline: [28, 52, 28],
    light: [250, 206, 142],
    lightAmt: 0.24,
    gloss: 0.42,
    speckleAmt: 0.55,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1.0,
  },
  // Winter — frost-dusted GREEN cucumber still clearly green, a bold snow cap
  // along its upper ridge + a snow drift at the base; cool blue-grey light.
  Winter: {
    skinLight: [118, 170, 108],
    skinMid: [64, 126, 76],
    skinDark: [40, 86, 56],
    speckle: [210, 234, 228],
    flower: [226, 204, 118],
    leaf: [102, 142, 94],
    padGrass: [182, 202, 220],
    padDark: [122, 150, 178],
    soil: [132, 116, 102],
    outline: [38, 56, 56],
    light: [200, 224, 255],
    lightAmt: 0.34,
    gloss: 0.3,
    speckleAmt: 0.32,
    frostAmt: 0.78,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Cucumber geometry — the SAME silhouette every season ──────────────────────
//
// An elongated cylinder lying on a gentle diagonal. It runs from the lower-left
// (stem/flower end, near the pad) to the upper-right (raised blossom-scar tip),
// slightly curved. We define a central spine of points (design px) plus a
// half-thickness; both ends round in. The idle pose pivots near the resting
// base so `lean` reads as the long cucumber ROLLING/ROCKING about its long axis
// (the raised tip arcs side to side); `squash` reads as a flex/bow along its
// length. There is NO vertical bob in the idle (a hop suits this long form least).

const CUKE_HALF = 6.4; // half-thickness of the cucumber barrel

const CUKE_AX = -13.5; // stem-end x (lower-left)
const CUKE_AY = 9.5;   // stem-end y (resting near the pad)
const CUKE_BX = 14.5;  // far-tip x (upper-right)
const CUKE_BY = -7.5;  // far-tip y (raised)
const CUKE_CX = 1.5;   // curve control x (bows the belly downward)
const CUKE_CY = 5.5;   // curve control y

// Idle pivot — near the resting stem end so lean rocks the raised tip and
// squash anchors at the base (it "sits" on the pad).
const CUKE_PIVOT_X = -9;
const CUKE_PIVOT_Y = 11;

/** Sample the curved spine at parameter s∈[0,1] (quadratic Bézier A→C→B). */
function spineAt(s: number): [number, number] {
  const u = 1 - s;
  const x = u * u * CUKE_AX + 2 * u * s * CUKE_CX + s * s * CUKE_BX;
  const y = u * u * CUKE_AY + 2 * u * s * CUKE_CY + s * s * CUKE_BY;
  return [x, y];
}

/** Outward unit normal of the spine at s (perpendicular to the tangent). */
function spineNormal(s: number): [number, number] {
  const [nx, ny] = spineAt(Math.min(1, s + 0.001));
  const [mx, my] = spineAt(Math.max(0, s - 0.001));
  const tx = nx - mx;
  const ty = ny - my;
  const len = Math.hypot(tx, ty) || 1;
  return [-ty / len, tx / len];
}

/** Local taper so the ends round in. */
function taperAt(s: number): number {
  return 0.55 + 0.45 * Math.sin(Math.PI * s);
}

/** Trace the rounded-capsule cucumber body into the current ctx path. Same
 *  outline for every season (the idle pose is applied as a ctx transform). */
function cucumberBodyPath(ctx: CanvasRenderingContext2D, half: number): void {
  const N = 14;
  const top: Array<[number, number]> = [];
  const bottomPts: Array<[number, number]> = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const [px, py] = spineAt(s);
    const [onx, ony] = spineNormal(s);
    const h = half * taperAt(s);
    top.push([px + onx * h, py + ony * h]);
    bottomPts.push([px - onx * h, py - ony * h]);
  }
  ctx.beginPath();
  ctx.moveTo(top[0][0], top[0][1]);
  for (let i = 1; i < top.length; i++) ctx.lineTo(top[i][0], top[i][1]);
  for (let i = bottomPts.length - 1; i >= 0; i--) ctx.lineTo(bottomPts[i][0], bottomPts[i][1]);
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

    // fallen leaf on the pad (autumn)
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const leaves: Array<[number, number, number, RGB]> = [
        [-12, 19.6, -0.5, [206, 124, 38]],
        [12, 18.6, 0.7, [182, 70, 28]],
      ];
      leaves.forEach(([lx, ly, rot, col]) => {
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

    // ── Contact shadow under the cucumber (follows the bob for grounding) ─────
    const shadowSpread = 1 + clamp01(pose.bob < 0 ? -pose.bob / 14 : 0) * 0.5;
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, 15.4, 12 * shadowSpread, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.28 / shadowSpread);
    ctx.beginPath();
    ctx.ellipse(2.5, 16, 13 * shadowSpread, 2.4, -0.18, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the cucumber, under the idle pose transform ─────────────────
    ctx.save();
    // Pivot near the resting base so lean rocks the raised tip and squash
    // anchors at the base. bob raises the whole body.
    ctx.translate(CUKE_PIVOT_X, CUKE_PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(-CUKE_PIVOT_X, -CUKE_PIVOT_Y);

    // 1) soft dark outline pass (drawn a touch fatter)
    cucumberBodyPath(ctx, CUKE_HALF + 0.9);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // 2) body fill, clipped so the outline reads as a rim
    ctx.save();
    cucumberBodyPath(ctx, CUKE_HALF);
    ctx.clip();

    // base mid tone
    ctx.fillStyle = rgb(p.skinMid);
    ctx.fillRect(-26, -26, 52, 52);

    // light from upper-left: a lit band running along the upper side of the
    // barrel, dark underside — gives the cylinder its round volume.
    const [lax, lay] = spineAt(0.1);
    const [lbx, lby] = spineAt(0.9);
    const litGrad = ctx.createLinearGradient(lax, lay - CUKE_HALF, lbx, lby + CUKE_HALF);
    litGrad.addColorStop(0, rgb(p.skinLight));
    litGrad.addColorStop(0.5, rgb(p.skinMid));
    litGrad.addColorStop(1, rgb(p.skinDark));
    ctx.fillStyle = litGrad;
    ctx.globalAlpha = 0.92;
    ctx.fillRect(-26, -26, 52, 52);
    ctx.globalAlpha = 1;

    // ridged ribs — a few long grooves running the length of the cucumber,
    // dark on the underside to read as a bumpy / ribbed surface.
    ctx.strokeStyle = rgba(p.skinDark, 0.7);
    ctx.lineWidth = 1.2;
    [-0.55, 0.0, 0.5].forEach((off) => {
      ctx.beginPath();
      for (let i = 0; i <= 14; i++) {
        const s = i / 14;
        const [px, py] = spineAt(s);
        const [onx, ony] = spineNormal(s);
        const h = CUKE_HALF * taperAt(s) * off;
        const x = px + onx * h, y = py + ony * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });

    // bumpy speckles — small pale dots scattered along the lit upper face
    if (p.speckleAmt > 0.02) {
      ctx.fillStyle = rgba(p.speckle, 0.85 * p.speckleAmt);
      const bumps: Array<[number, number, number]> = [
        [0.18, -0.45, 0.9], [0.32, 0.1, 0.7], [0.48, -0.25, 0.85],
        [0.62, 0.2, 0.7], [0.74, -0.4, 0.8], [0.88, -0.05, 0.6],
        [0.26, -0.15, 0.6], [0.56, -0.5, 0.7], [0.4, 0.35, 0.6],
      ];
      bumps.forEach(([s, off, r]) => {
        const [px, py] = spineAt(s);
        const [onx, ony] = spineNormal(s);
        const h = CUKE_HALF * taperAt(s) * off;
        ctx.beginPath();
        ctx.arc(px + onx * h, py + ony * h, r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // specular sheen — a soft bright streak along the upper-lit side
    if (p.gloss > 0.02) {
      ctx.strokeStyle = rgba([255, 255, 255], 0.16 + 0.6 * p.gloss);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 2; i <= 12; i++) {
        const s = i / 14;
        const [px, py] = spineAt(s);
        const [onx, ony] = spineNormal(s);
        const h = CUKE_HALF * taperAt(s) * -0.55;
        const x = px + onx * h, y = py + ony * h;
        if (i === 2) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // frost dusting (winter) — cool blue speckle on the upward skin
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.22 * p.frostAmt);
      ctx.fillRect(-26, -26, 52, 30);
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [0.2, -0.4], [0.36, -0.1], [0.5, -0.35], [0.66, 0.0], [0.8, -0.3], [0.9, -0.5],
      ];
      speck.forEach(([s, off]) => {
        const [px, py] = spineAt(s);
        const [onx, ony] = spineNormal(s);
        const h = CUKE_HALF * off;
        ctx.beginPath();
        ctx.arc(px + onx * h, py + ony * h, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end body clip

    // 3) snow cap ridge along the cucumber's upper side (winter), over the body
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      for (let i = 2; i <= 12; i++) {
        const s = i / 14;
        const [px, py] = spineAt(s);
        const [onx, ony] = spineNormal(s);
        const h = CUKE_HALF * taperAt(s) * -0.82;
        const x = px + onx * h, y = py + ony * h;
        if (i === 2) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      // back along a slightly lower line to give the ridge thickness
      for (let i = 12; i >= 2; i--) {
        const s = i / 14;
        const [px, py] = spineAt(s);
        const [onx, ony] = spineNormal(s);
        const h = CUKE_HALF * taperAt(s) * -0.38;
        ctx.lineTo(px + onx * h, py + ony * h);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([205, 222, 242], 0.45 * a);
      const [mx2, my2] = spineAt(0.5);
      ctx.beginPath();
      ctx.ellipse(mx2, my2 - CUKE_HALF * 0.6, 7, 1.4, -0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Stem end: tiny yellow cucumber flower + small leaf (SAME placement) ──
    // The stem end is the near (lower-left) tip A.
    const [sx0, sy0] = spineAt(0.0);
    const stemTipX = sx0 - 3.2;
    const stemTipY = sy0 - 2.6;

    // short green stem joining the cucumber to the blossom
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(sx0, sy0);
    ctx.quadraticCurveTo(sx0 - 2.4, sy0 - 1.6, stemTipX, stemTipY);
    ctx.stroke();
    ctx.strokeStyle = rgb(p.leaf);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(sx0, sy0);
    ctx.quadraticCurveTo(sx0 - 2.4, sy0 - 1.6, stemTipX, stemTipY);
    ctx.stroke();

    // small leaf beside the stem
    ctx.save();
    ctx.translate(stemTipX - 1.5, stemTipY + 2.6);
    ctx.rotate(-0.7);
    ctx.fillStyle = rgb(p.leaf);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.4, 1.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(p.outline, 0.7);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-3.2, 0);
    ctx.lineTo(3.2, 0);
    ctx.stroke();
    ctx.restore();

    // the little yellow cucumber blossom at the very stem tip — five petals
    ctx.save();
    ctx.translate(stemTipX, stemTipY);
    ctx.fillStyle = rgb(p.flower);
    for (let k = 0; k < 5; k++) {
      const ang = (k / 5) * Math.PI * 2 - 0.3;
      ctx.beginPath();
      ctx.ellipse(Math.cos(ang) * 2.0, Math.sin(ang) * 2.0, 1.5, 1.0, ang, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = rgba(p.outline, 0.45);
    ctx.lineWidth = 0.6;
    for (let k = 0; k < 5; k++) {
      const ang = (k / 5) * Math.PI * 2 - 0.3;
      ctx.beginPath();
      ctx.ellipse(Math.cos(ang) * 2.0, Math.sin(ang) * 2.0, 1.5, 1.0, ang, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = rgba([246, 176, 56], 0.95);
    ctx.beginPath();
    ctx.arc(0, 0, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

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

/** Build the idle pose from the wall clock. Two tiers, BOTH a length-wise
 *  roll/rock — never a vertical hop (a long horizontal cucumber rolls; it does
 *  not jump). `lean` is the roll about the long axis (raised tip arcs side to
 *  side); `squashX`/`squashY` give a flex/bow along the length. `pose.bob` stays
 *  0 throughout. Each factor is a product of terms that are BOTH zero at the
 *  window edges (`env·sway` for lean, `hump` for squash), so the pose returns to
 *  REST with zero value AND zero velocity → seamless loop:
 *    COMMON a gentle roll every ~6s (win 1.0s),
 *    RARE   a bigger roll + length-wise bow every ~18s (win 1.6s). */
function poseFromClock(t: number): Pose {
  const pose: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0 };

  // ── COMMON: a gentle length-wise ROLL/ROCK (~6s, win 1.0s) ──
  // One calm roll out to one side, through level, to the other and back — as if
  // the long cucumber might roll away. NO bob. ~0.10 rad → raised tip arcs ~7px.
  const qC = actionQ(t, 6.0, 1.0, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC); // 0..1..0 envelope, zero at edges
    const roll = Math.sin(qC * Math.PI * 2); // one gentle L→level→R→level roll
    pose.lean += 0.10 * env * roll; // a calm roll about the long axis (no hop)
    // a faint flex as it rolls — slightly wider + a touch flatter, 0 at edges
    pose.squashX += 0.035 * hump(qC);
    pose.squashY += -0.025 * hump(qC);
  }

  // ── RARE: a bigger LENGTH-WISE BEND/ROLL (~18s, win 1.6s) — NO hop ──
  // A fuller roll to one side, through to the other, plus a pronounced bow/flex
  // along the length (the cucumber visibly flexes wide+thin then settles) and
  // rights itself. Phase 3s so it never overlaps the COMMON roll. Still NO bob.
  const qS = actionQ(t, 18.0, 1.6, 3.0);
  if (qS >= 0) {
    const env = Math.sin(Math.PI * qS); // 0..1..0 envelope
    const roll = Math.sin(qS * Math.PI * 2); // one big L→R roll
    pose.lean += 0.22 * env * roll; // a fuller roll about the long axis
    // a length-wise bow: it bulges wide and thins through its length at the apex
    // of the roll, then settles. hump() keeps both 0 (with zero velocity) at the
    // edges, so the bend reads as a flex along the body, not a jump.
    pose.squashX += 0.085 * hump(qS);
    pose.squashY += -0.06 * hump(qS);
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
          [-9, 0.0, 1.0], [6, 0.4, 0.9], [12, 0.7, 0.8], [-2, 0.25, 0.9],
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
        ctx.fillStyle = "rgba(196,96,32,1)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.4, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      // Summer: no extra dressing — the length-wise roll + glossy green is the show.
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
