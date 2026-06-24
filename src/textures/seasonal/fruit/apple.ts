// BOLD seasonal art for the APPLE fruit tile.
//
// Same apple every season (identity-safe): the classic two-lobe apple body with
// a top dimple, a woody stem, and a stem-leaf — reused from the original apple
// geometry. The seasons swing HARD on colour + a readable seasonal prop, and the
// idle is a distinct, in-character two-tier beat (NOT a generic bounce):
//
//   IDLE COMMON  (~6s, win ~1.0s): a small, CALM breathing sway — the apple
//       leans gently a few px to one side and settles, with a faint squash. The
//       quiet beat. Zero value AND velocity at the window edges (seamless).
//   IDLE RARE    (~18s, win ~3.0s): a WORM pokes out of a little hole on the
//       apple's lit cheek, looks around once, and ducks back in (drawn as an
//       additive overlay in anim(), never in the still). The apple gives a tiny
//       flinch (small squash + micro-lean) as the worm emerges. The worm and the
//       flinch are exactly 0 — and the hole is absent — at the window edges.
//
// Architecture mirrors pepper.bold.ts: a single parameterized `paint(ctx,p,pose)`
// where `interface P` holds tweenable season params (colours + prop amounts) and
// `pose` holds the idle gesture (bob / lean / squash). Because every season is
// the same paint with tweened P, transitions are seamless:
//   transition(0) ≡ draw(from), transition(1) ≡ draw(to).
// REST pose has all zeros, so draw(season) = paint(ctx, SP[season], REST) and the
// idle's pose is 0 at every action-window edge → seamless loop.
//
// SEASONAL CUES (same apple, bold colour, props readable at ~58px):
//   Spring — small GREEN unripe apple + a white-pink blossom on the pad.
//   Summer — full ripe glossy RED apple at peak, bright warm light, max gloss.
//   Autumn — deep darker red, the stem-leaf turning AMBER + a fallen leaf on pad.
//   Winter — clear white SNOW CAP on top + snow at the base + frost; apple still
//            clearly red.
//
// Origin-centered in the −24..+24 design box (idle actions may paint outside it),
// light from upper-left. Pure Canvas-2D vector drawing — never throws, clamps
// everything, save/restore, resets globalAlpha.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable season params ──────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — paint is a
 *  pure function of these so transitions interpolate cleanly. */
interface P {
  skinHi: RGB;           // lit rim of the apple skin
  skinMid: RGB;          // body tone
  skinLo: RGB;           // shadowed underside
  blush: RGB;            // warm cheek tint
  blushAmt: number;      // 0..1 warm cheek strength
  leafDark: RGB;         // stem-leaf dark backing
  leafLite: RGB;         // stem-leaf light fill
  bark: RGB;             // woody stem tint
  padGrass: RGB;         // top of the grass pad
  padDark: RGB;          // shaded pad underside
  soil: RGB;             // contact / base soil under the apple
  outline: RGB;          // soft dark outline tint
  light: RGB;            // ambient light tint laid over the whole tile
  lightAmt: number;      // 0..1 strength of the ambient light wash
  gloss: number;         // 0..1 specular gloss-streak strength on the skin
  frostAmt: number;      // 0..1 cool frost dusting on the skin (winter)
  snowCapAmt: number;    // 0..1 snow cap on the apple shoulders + twig (winter)
  padSnowAmt: number;    // 0..1 snow blanket at the base / on the pad (winter)
  blossomAmt: number;    // 0..1 blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad (autumn)
}

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number;     // vertical offset in design px (negative = up)
  lean: number;    // top-of-apple sway, radians (rock side to side)
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
    skinHi: lerpRGB(a.skinHi, b.skinHi, t),
    skinMid: lerpRGB(a.skinMid, b.skinMid, t),
    skinLo: lerpRGB(a.skinLo, b.skinLo, t),
    blush: lerpRGB(a.blush, b.blush, t),
    blushAmt: lerp(a.blushAmt, b.blushAmt, t),
    leafDark: lerpRGB(a.leafDark, b.leafDark, t),
    leafLite: lerpRGB(a.leafLite, b.leafLite, t),
    bark: lerpRGB(a.bark, b.bark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
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
    blushAmt: clamp01(p.blushAmt),
    lightAmt: clamp01(p.lightAmt),
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
  // Spring — small GREEN unripe apple, fresh leaf, dewy lime pad, a blossom.
  Spring: {
    skinHi: [196, 232, 120],
    skinMid: [122, 184, 58],
    skinLo: [54, 110, 30],
    blush: [206, 232, 130],
    blushAmt: 0.18,
    leafDark: [47, 89, 22],
    leafLite: [111, 174, 53],
    bark: [122, 88, 44],
    padGrass: [126, 214, 84],
    padDark: [64, 146, 56],
    soil: [120, 84, 48],
    outline: [30, 70, 26],
    light: [228, 248, 214],
    lightAmt: 0.18,
    gloss: 0.3,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 1.0,
    fallenLeafAmt: 0,
  },
  // Summer — full ripe glossy RED apple at peak, bright warm light, max gloss.
  Summer: {
    skinHi: [255, 122, 94],
    skinMid: [220, 46, 40],
    skinLo: [124, 20, 16],
    blush: [255, 198, 110],
    blushAmt: 0.55,
    leafDark: [47, 107, 28],
    leafLite: [111, 174, 53],
    bark: [122, 88, 44],
    padGrass: [80, 178, 70],
    padDark: [40, 116, 50],
    soil: [128, 88, 48],
    outline: [92, 14, 20],
    light: [255, 244, 200],
    lightAmt: 0.2,
    gloss: 1.0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — deep darker red, the stem-leaf turning AMBER, a fallen leaf on pad.
  Autumn: {
    skinHi: [216, 78, 46],
    skinMid: [168, 36, 32],
    skinLo: [92, 18, 18],
    blush: [255, 196, 96],
    blushAmt: 0.7,
    leafDark: [154, 106, 22],
    leafLite: [224, 167, 58],
    bark: [104, 74, 38],
    padGrass: [160, 150, 78],
    padDark: [108, 88, 46],
    soil: [120, 78, 42],
    outline: [60, 14, 16],
    light: [250, 198, 132],
    lightAmt: 0.24,
    gloss: 0.42,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1.0,
  },
  // Winter — cool blue-grey light; frost-dusted apple still clearly RED, a bold
  // white snow cap on top + a snow drift at the base.
  Winter: {
    skinHi: [214, 96, 80],
    skinMid: [170, 52, 50],
    skinLo: [100, 30, 38],
    blush: [188, 110, 96],
    blushAmt: 0.3,
    leafDark: [86, 96, 80],
    leafLite: [134, 150, 132],
    bark: [74, 60, 46],
    padGrass: [182, 202, 220],
    padDark: [122, 150, 178],
    soil: [132, 116, 102],
    outline: [50, 38, 54],
    light: [200, 224, 255],
    lightAmt: 0.34,
    gloss: 0.26,
    frostAmt: 0.8,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Apple geometry — the SAME silhouette every season ────────────────────────
// Reused from the original apple.ts: a two-lobe body with a top dimple, body
// radius R, focal centre at (0, AP_CY). The body sits on the grass pad and the
// pose pivots near its base so lean rocks the top and squash anchors at the base.

const AP_R = 11; // body radius
const AP_CY = 3; // focal apple centre y (rests on the pad)
const AP_TOP = AP_CY - AP_R * 0.78; // dimple line
const AP_BOT = AP_CY + AP_R * 0.95; // base of the body
const AP_PIVOT_Y = AP_BOT - 0.5; // rock/lean about a point near the base

/** Trace the classic two-lobe apple body path (origin-local, centred at AP_CY).
 *  Same silhouette as the original apple draw. */
function appleBodyPath(ctx: CanvasRenderingContext2D): void {
  const r = AP_R;
  ctx.beginPath();
  ctx.moveTo(0, AP_CY - r * 0.78); // top dimple
  ctx.bezierCurveTo(-r * 0.7, AP_CY - r * 1.05, -r * 1.18, AP_CY - r * 0.4, -r * 1.05, AP_CY + r * 0.18);
  ctx.bezierCurveTo(-r * 0.95, AP_CY + r * 0.95, -r * 0.35, AP_CY + r * 1.15, 0, AP_CY + r * 0.95);
  ctx.bezierCurveTo(r * 0.35, AP_CY + r * 1.15, r * 0.95, AP_CY + r * 0.95, r * 1.05, AP_CY + r * 0.18);
  ctx.bezierCurveTo(r * 1.18, AP_CY - r * 0.4, r * 0.7, AP_CY - r * 1.05, 0, AP_CY - r * 0.78);
  ctx.closePath();
}

/** A teardrop stem-leaf (dark backing + light fill + midrib), origin-local. */
function stemLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, len: number, dark: RGB, lite: RGB): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = rgb(dark);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0);
  ctx.fill();
  ctx.fillStyle = rgb(lite);
  ctx.beginPath();
  ctx.moveTo(len * 0.1, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.3, len * 0.86, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.3, len * 0.1, 0);
  ctx.fill();
  ctx.strokeStyle = rgb(dark);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(len * 0.08, 0);
  ctx.lineTo(len * 0.9, 0);
  ctx.stroke();
  ctx.restore();
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

    // pad snow blanket (winter) — a clear drift at the base
    if (p.padSnowAmt > 0.01) {
      ctx.fillStyle = rgba([244, 250, 255], 0.92 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(0, 18.4, 17.4 * (0.6 + 0.4 * p.padSnowAmt), 4.8, 0, 0, Math.PI * 2);
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

    // blossom on the pad (spring) — a white-pink 5-petal flower with a yellow eye
    if (p.blossomAmt > 0.01) {
      const a = p.blossomAmt;
      const spots: Array<[number, number, number]> = [[-13, 18.6, 1.0], [12, 17.8, 0.78], [-4, 21, 0.62]];
      spots.forEach(([bx, by, sc], idx) => {
        ctx.fillStyle = rgba(idx === 0 ? [255, 232, 246] : [255, 250, 252], 0.96 * a);
        for (let k = 0; k < 5; k++) {
          const ang = (k / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(bx + Math.cos(ang) * 1.7 * sc, by + Math.sin(ang) * 1.2 * sc, 1.4 * sc, 1.0 * sc, ang, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = rgba([255, 214, 90], a);
        ctx.beginPath();
        ctx.arc(bx, by, 1.1 * sc, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // fallen leaf on the pad (autumn) — a couple of amber leaves resting
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const leaves: Array<[number, number, number, RGB]> = [
        [-12, 19.8, -0.5, [206, 124, 38]],
        [12, 18.8, 0.7, [182, 70, 28]],
      ];
      leaves.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgba(col, a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.8, 2.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba([90, 44, 16], a);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-3.6, 0);
        ctx.lineTo(3.6, 0);
        ctx.stroke();
        ctx.restore();
      });
    }

    // ── Contact shadow under the apple (follows the bob/lean for grounding) ───
    const tipShift = pose.lean * (AP_PIVOT_Y - AP_TOP); // how far the top leans
    const shadowSpread = 1 + clamp01(pose.bob < 0 ? -pose.bob / 14 : 0) * 0.5;
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0 + tipShift * 0.18, AP_BOT + 1.5, 9 * shadowSpread, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.28 / shadowSpread);
    ctx.beginPath();
    ctx.ellipse(2.5 + tipShift * 0.2, AP_BOT + 2, 11 * shadowSpread, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the apple, under the idle pose transform ────────────────────
    ctx.save();
    // Pivot near the base so lean rocks the TOP side-to-side and squash anchors
    // at the base (it "sits" on the pad). bob raises the whole body.
    ctx.translate(0, AP_PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(0, -AP_PIVOT_Y);

    const r = AP_R;

    // 1) soft dark outline pass
    appleBodyPath(ctx);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // 2) skin body, clipped to the body
    ctx.save();
    appleBodyPath(ctx);
    ctx.clip();

    // radial skin gradient: lit upper-left rim → mid body → shaded base
    const grad = ctx.createRadialGradient(-r * 0.35, AP_CY - r * 0.4, r * 0.15, 0, AP_CY, r * 1.3);
    grad.addColorStop(0, rgb(p.skinHi));
    grad.addColorStop(0.55, rgb(p.skinMid));
    grad.addColorStop(1, rgb(p.skinLo));
    ctx.fillStyle = grad;
    ctx.fillRect(-r * 1.4, AP_CY - r * 1.4, r * 2.8, r * 2.8);

    // warm blush cheek
    if (p.blushAmt > 0.01) {
      ctx.save();
      ctx.globalAlpha = p.blushAmt * 0.85;
      const bg = ctx.createRadialGradient(r * 0.35, AP_CY + r * 0.1, 0, r * 0.35, AP_CY + r * 0.1, r * 0.9);
      bg.addColorStop(0, rgb(p.blush));
      bg.addColorStop(1, rgba(p.blush, 0));
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.ellipse(r * 0.3, AP_CY + r * 0.05, r * 0.78, r * 0.88, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // dimple shadow at the stem socket
    ctx.fillStyle = rgba([0, 0, 0], 0.22);
    ctx.beginPath();
    ctx.ellipse(0, AP_CY - r * 0.72, r * 0.22, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    // strong specular gloss streak on the lit shoulder
    if (p.gloss > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.18 + 0.55 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(-r * 0.4, AP_CY - r * 0.42, r * 0.26, r * 0.36, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([255, 255, 255], 0.2 + 0.5 * p.gloss);
      ctx.beginPath();
      ctx.arc(-r * 0.5, AP_CY - r * 0.52, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }

    // frost dusting (winter) — a cool film over the upper body
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.3 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(-1, AP_CY - r * 0.25, r * 0.95, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-6, AP_CY - 5], [-1, AP_CY - 6], [4, AP_CY - 4], [-4, AP_CY], [3, AP_CY + 1], [0, AP_CY - 2],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end body clip

    // 3) snow cap on the shoulders (winter) — a clear white cap, not a dusting
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.96 * a);
      ctx.beginPath();
      ctx.moveTo(-r * 0.78, AP_CY - r * 0.5);
      ctx.quadraticCurveTo(-r * 0.4, AP_CY - r * 1.18, 0, AP_CY - r * 0.95);
      ctx.quadraticCurveTo(r * 0.4, AP_CY - r * 1.18, r * 0.78, AP_CY - r * 0.5);
      ctx.quadraticCurveTo(r * 0.5, AP_CY - r * 0.34, r * 0.18, AP_CY - r * 0.5);
      ctx.quadraticCurveTo(0, AP_CY - r * 0.32, -r * 0.18, AP_CY - r * 0.5);
      ctx.quadraticCurveTo(-r * 0.5, AP_CY - r * 0.34, -r * 0.78, AP_CY - r * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(0, AP_CY - r * 0.52, r * 0.62, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Stem + stem-leaf (rides with the pose transform) ─────────────────────
    const stemTopY = AP_CY - r * 0.75;
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(0, stemTopY);
    ctx.quadraticCurveTo(r * 0.18, AP_CY - r * 1.2, r * 0.42, AP_CY - r * 1.35);
    ctx.stroke();
    ctx.strokeStyle = rgb(p.bark);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, stemTopY);
    ctx.quadraticCurveTo(r * 0.18, AP_CY - r * 1.2, r * 0.42, AP_CY - r * 1.35);
    ctx.stroke();
    // the stem-leaf — turns AMBER in autumn / greys in winter via leaf colours
    stemLeaf(ctx, r * 0.38, AP_CY - r * 1.28, -0.5, r * 0.72, p.leafDark, p.leafLite);

    // snow on the cap of the stem-leaf (winter)
    if (p.snowCapAmt > 0.02) {
      ctx.fillStyle = rgba([246, 251, 255], 0.85 * p.snowCapAmt);
      ctx.beginPath();
      ctx.ellipse(r * 0.62, AP_CY - r * 1.34, 2.6, 1.3, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }

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

// ── Shared RARE-window clock — the WORM event ────────────────────────────────
// COMMON fires every 6s at phase 0 (win 1.0s) → windows [0,1),[6,7),[12,13) each
// 18s period. The RARE worm uses actionQ(t,18,3,3): with phase 3 the window is
// where (t+3) mod 18 < 3, i.e. t mod 18 ∈ [15,18) — a 3s window that lands
// cleanly BETWEEN the COMMON beats (verified: the two never overlap), and ends
// exactly at the 18≡0 seam where COMMON restarts from REST. One source of truth
// so the apple flinch (poseFromClock) and the worm overlay (anim) stay in lockstep.
const WORM_PERIOD = 18.0;
const WORM_WIN = 3.0;
const WORM_PHASE = 3.0;

/** Progress 0..1 through the worm window, else −1 (worm fully hidden). */
function wormQ(t: number): number {
  return actionQ(t, WORM_PERIOD, WORM_WIN, WORM_PHASE);
}

/** How far the worm is OUT, 0..1 — emerge fast, HOLD out while it looks around,
 *  then duck back. Exactly 0 with zero velocity at q=0 and q=1 (the whole event
 *  fades in and out of REST). A smootherstep ramp up (first ~30%) and a mirrored
 *  ramp down (last ~30%) with a flat hold of 1 in between — `sin(π·q)` would peak
 *  instead of hold, so we shape it explicitly but keep the seamless edges. */
function wormOut(q: number): number {
  if (!(q >= 0) || q >= 1) return 0;
  const up = 0.3; // fraction of the window spent emerging / ducking back
  if (q < up) return smoother(q / up); // 0→1, zero slope at q=0
  if (q > 1 - up) return smoother((1 - q) / up); // 1→0, zero slope at q=1
  return 1; // held fully out (the "looking around" beat)
}

/** Build the idle pose from the wall clock. Two tiers, neither a bounce:
 *   COMMON — a small, calm side-to-side breathing lean+squash every ~6s.
 *   RARE   — a tiny apple FLINCH (small squash + micro-lean) as the worm pops
 *            out, every ~18s, fully synced to the worm overlay in anim(). */
function poseFromClock(t: number): Pose {
  const pose: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0 };

  // ── COMMON: a small, calm breathing sway (~6s, win 1.0s) ──
  // Much gentler than a wobble — one slow lean out and back with a faint squash,
  // the quiet "resting" beat. Zero value AND velocity at the window edges.
  const qC = actionQ(t, 6.0, 1.0, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC); // 0..1..0 envelope, zero at edges
    const sway = Math.sin(qC * Math.PI * 2); // one gentle L→centre→R→centre
    pose.lean += 0.05 * env * sway; // ~3px top sway — calm, not a rock
    pose.squashY += -0.02 * hump(qC); // a soft breath settling
    pose.squashX += 0.018 * hump(qC);
  }

  // ── RARE: a tiny FLINCH as the worm pokes out (~18s) ──
  // The apple gives a small squash + a micro-lean away from the hole when the
  // worm emerges. Every factor is enveloped by the worm's own out-amount, which
  // is 0 at the window edges → the flinch is exactly 0 at q=0 and q=1.
  const out = wormOut(wormQ(t));
  if (out > 0) {
    // a quick double-take pulse so the flinch reads as a "surprise", peaking with
    // the worm; hump() keeps it 0 at the edges, `out` gates it to the window.
    const startle = out * hump(out);
    pose.squashY += -0.05 * out; // squat down a touch
    pose.squashX += 0.045 * out; // and bulge wide
    pose.lean += -0.035 * startle; // micro-lean away from the lit cheek hole
  }

  return pose;
}

// ── The WORM overlay — additive, drawn over the painted apple in anim() ──────
// A short rounded chartreuse-green segmented body with a tiny head that emerges
// from a little hole on the apple's LIT cheek (upper-left), looks around once,
// then ducks back in. Driven ONLY by t. Invisible when `out` (from wormOut) is 0,
// so it is exactly absent at the window edges (and therefore at t=0).

// Hole on the apple's lit upper-left cheek (apple centre (0, AP_CY), radius AP_R).
const WORM_HOLE_X = -4.6;
const WORM_HOLE_Y = AP_CY - 4.4;
// Direction the worm pokes (up-and-out, away from the apple body): unit-ish vector.
const WORM_DIR_X = -0.55;
const WORM_DIR_Y = -0.835;
const WORM_REACH = 12; // design-px the head travels from the hole when fully out

const WORM_BODY: RGB = [150, 198, 70]; // chartreuse green body
const WORM_BODY_HI: RGB = [196, 226, 116]; // lit top of each segment
const WORM_BODY_LO: RGB = [96, 144, 44]; // shaded belly
const WORM_OUTLINE: RGB = [56, 92, 30]; // soft dark green outline

/** Draw the worm at the given out-amount (0..1) and look-amount (−1..1, a head
 *  turn). At out<=0 nothing is drawn (the apple's skin is intact). */
function drawWorm(ctx: CanvasRenderingContext2D, out: number, look: number): void {
  const o = clamp01(out);
  if (o <= 0.001) return;
  const lk = Number.isFinite(look) ? Math.max(-1, Math.min(1, look)) : 0;

  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // A small dark socket/hole — ONLY while the worm is out (never on the still).
    // Sits flat on the lit cheek; fades with `out` so it appears and leaves with
    // the worm rather than being a permanent pit in the apple.
    ctx.fillStyle = rgba([28, 14, 16], 0.55 * o);
    ctx.beginPath();
    ctx.ellipse(WORM_HOLE_X, WORM_HOLE_Y, 3.0, 2.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([72, 30, 28], 0.5 * o);
    ctx.beginPath();
    ctx.ellipse(WORM_HOLE_X + 0.5, WORM_HOLE_Y + 0.4, 2.1, 1.5, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Body as a chain of segments from the hole outward. `o` scales the reach so
    // the worm slides in/out of the hole; `lk` bends the tip for the look-around.
    const reach = WORM_REACH * o;
    const segs = 5;
    type Seg = { x: number; y: number; r: number };
    const chain: Seg[] = [];
    for (let i = 0; i <= segs; i++) {
      const f = i / segs; // 0 at hole, 1 at head
      const d = reach * f; // distance travelled along the poke direction
      // a gentle base curve plus a look-around bend that grows toward the head
      const bend = (0.9 * lk) * f * f; // radians, only the front half really turns
      const dirX = WORM_DIR_X * Math.cos(bend) - WORM_DIR_Y * Math.sin(bend);
      const dirY = WORM_DIR_X * Math.sin(bend) + WORM_DIR_Y * Math.cos(bend);
      const x = WORM_HOLE_X + dirX * d;
      const y = WORM_HOLE_Y + dirY * d;
      const r = 2.6 - 0.9 * f; // tapers slightly toward the head
      chain.push({ x, y, r });
    }

    // dark outline pass (slightly fatter discs)
    ctx.fillStyle = rgb(WORM_OUTLINE);
    for (const s of chain) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r + 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    // body fill
    ctx.fillStyle = rgb(WORM_BODY);
    for (const s of chain) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // lit tops (upper-left) per segment + shaded bellies
    for (const s of chain) {
      ctx.fillStyle = rgba(WORM_BODY_HI, 0.85);
      ctx.beginPath();
      ctx.arc(s.x - s.r * 0.32, s.y - s.r * 0.36, s.r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(WORM_BODY_LO, 0.5);
      ctx.beginPath();
      ctx.arc(s.x + s.r * 0.34, s.y + s.r * 0.4, s.r * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }

    // Head — the last segment, with a tiny dark eye on the lit side. Only show the
    // face once the worm is mostly out so it doesn't peek from inside the hole.
    const head = chain[chain.length - 1];
    const faceA = clamp01((o - 0.45) / 0.4);
    if (faceA > 0.01) {
      // round the head a touch fuller
      ctx.fillStyle = rgb(WORM_BODY);
      ctx.beginPath();
      ctx.arc(head.x, head.y, 2.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(WORM_BODY_HI, 0.9 * faceA);
      ctx.beginPath();
      ctx.arc(head.x - 0.6, head.y - 0.7, 1.0, 0, Math.PI * 2);
      ctx.fill();
      // a single tiny eye, turned with the look
      const eyeX = head.x - 0.4 + lk * 0.9;
      const eyeY = head.y - 0.5;
      ctx.fillStyle = rgba([24, 28, 20], 0.92 * faceA);
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([255, 255, 255], 0.8 * faceA);
      ctx.beginPath();
      ctx.arc(eyeX - 0.2, eyeY - 0.2, 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], REST);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const tt = Number.isFinite(t) ? t : 0;
    paint(ctx, SP[season], poseFromClock(tt));

    // RARE WORM event (all seasons) — a worm pokes out of the lit cheek, looks
    // around once, and ducks back. Additive overlay only; fully synced to the
    // flinch in poseFromClock via the shared worm clock. `out` is 0 at the window
    // edges (and so at t=0), so nothing is drawn at rest.
    const wq = wormQ(tt);
    const out = wormOut(wq);
    if (out > 0) {
      // One left→right glance, gated by `out` so the head only turns while it is
      // actually outside the hole (zero when tucked, zero at the window edges).
      const look = Math.sin(wq * Math.PI * 2) * out;
      drawWorm(ctx, out, look);
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
          const fy = -22 + prog * 38;
          const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
          ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.arc(dx, fy, r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      } else if (season === "Spring") {
        // a couple of drifting blossom petals
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
        // one slow tumbling amber leaf
        const prog = ((tt / 5.0) % 1 + 1) % 1;
        const px = 11 - prog * 6 + Math.sin(prog * Math.PI * 3) * 2;
        const py = -16 + prog * 32;
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(prog * Math.PI);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(prog * Math.PI * 4);
        ctx.fillStyle = "rgba(212,140,44,1)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.4, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      // Summer: no extra dressing — the bounce + glossy red is the show.
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
