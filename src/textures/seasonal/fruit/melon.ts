// BOLD seasonal art for the MELON fruit tile (`tile_bird_melon` — the "bird"
// key is merge-chain logic only; the subject is a green watermelon-style melon).
//
// A plump, near-spherical striped melon resting low-centre on a grassy pad.
// Darker-green rind stripes curve over the round body (classic watermelon read),
// with a short curly tendril/stem nub + one small leaf at the top. The SAME
// striped round silhouette is drawn EVERY season — only surface colour, frost /
// snow dusting, light tint and the pad dressing (blossom / fallen leaves / snow)
// change. This is enforced by a single parameterized `paint(ctx, p, pose)`.
//
// Seasons swing HARD on colour + a real seasonal prop, and the idle is loud
// rather than subtle — but it's a BIG heavy round melon, so the gestures read as
// weighty rocks, not flicks:
//
//   IDLE COMMON  (~6s, win ~1.0s): a slow HEAVY WOBBLE — the melon rolls/rocks
//       side to side ~10–12 design-px at the rim with a base squash. Zero
//       velocity at the window edges (seamless).
//   IDLE SPECIAL (~18s, win ~1.2s): a bigger BOUNCE — a squash-stretch hop with
//       an anticipation crouch, a (modest, it's heavy) rise, and a squash
//       landing that settles. May rise out of the −24..+24 box.
//
// Architecture mirrors pepper.bold.ts: a single parameterized
// `paint(ctx, p, pose)` where `interface P` holds tweenable season params
// (colours + prop amounts) and `pose` holds the idle gesture (bob / lean /
// squash). Because every season is the same paint with tweened P, transitions
// are seamless:
//   transition(0) ≡ draw(from), transition(1) ≡ draw(to).
// REST pose has all zeros, so draw(season) = paint(ctx, SP[season], REST) and the
// idle's pose is 0 at every action-window edge → seamless loop.
//
// Identity rule: winter only DUSTS the melon with frost + a snow cap on top +
// snow at the base; the green striped rind stays clearly visible (no white-out).
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
  rindLight: RGB;        // lit upper-left face of the rind
  rindMid: RGB;          // body tone of the rind
  rindDark: RGB;         // shaded lower-right of the body
  stripe: RGB;           // dark watermelon rind stripes curving over the body
  highlight: RGB;        // pale sheen colour on the lit shoulder
  leaf: RGB;             // tendril + small top leaf green
  padGrass: RGB;         // top of the grass pad
  padDark: RGB;          // shaded pad underside
  soil: RGB;             // contact / base soil under the melon
  outline: RGB;          // soft dark outline tint
  light: RGB;            // ambient light tint laid over the whole tile
  lightAmt: number;      // 0..1 strength of the ambient light wash
  scale: number;         // 0..1 body scale (spring melon a touch smaller)
  gloss: number;         // 0..1 dewy sheen-streak strength on the rind
  stripeAmt: number;     // 0..1 darkness/crispness of the rind stripes
  leafYellow: number;    // 0..1 top-leaf yellowing (autumn)
  frostAmt: number;      // 0..1 cool frost dusting on the rind (winter)
  snowCapAmt: number;    // 0..1 snow cap sitting on top of the melon (winter)
  padSnowAmt: number;    // 0..1 snow blanket on the pad / at the base (winter)
  blossomAmt: number;    // 0..1 pale blossom resting on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves resting on the pad (autumn)
}

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number;     // vertical offset in design px (negative = up)
  lean: number;    // melon roll/rock, radians (rock side to side)
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
    rindLight: lerpRGB(a.rindLight, b.rindLight, t),
    rindMid: lerpRGB(a.rindMid, b.rindMid, t),
    rindDark: lerpRGB(a.rindDark, b.rindDark, t),
    stripe: lerpRGB(a.stripe, b.stripe, t),
    highlight: lerpRGB(a.highlight, b.highlight, t),
    leaf: lerpRGB(a.leaf, b.leaf, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    scale: lerp(a.scale, b.scale, t),
    gloss: lerp(a.gloss, b.gloss, t),
    stripeAmt: lerp(a.stripeAmt, b.stripeAmt, t),
    leafYellow: lerp(a.leafYellow, b.leafYellow, t),
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
    scale: clamp01(p.scale),
    gloss: clamp01(p.gloss),
    stripeAmt: clamp01(p.stripeAmt),
    leafYellow: clamp01(p.leafYellow),
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
  // Spring — younger, slightly smaller + paler young GREEN melon; dewy sheen;
  // bright lime pad + a prominent pale blossom. Cool-bright light.
  Spring: {
    rindLight: [196, 230, 132],
    rindMid: [128, 188, 80],
    rindDark: [78, 134, 52],
    stripe: [92, 142, 56],
    highlight: [228, 246, 190],
    leaf: [108, 168, 64],
    padGrass: [126, 214, 84],
    padDark: [64, 146, 56],
    soil: [120, 84, 48],
    outline: [40, 72, 32],
    light: [232, 248, 222],
    lightAmt: 0.16,
    scale: 0.88,
    gloss: 0.36,
    stripeAmt: 0.58,
    leafYellow: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 1.0,
    fallenLeafAmt: 0,
  },
  // Summer — full ripe melon: deep saturated GREEN rind, crisp dark stripes
  // (PEAK); bright grass pad. Warm light, strong shadow + sheen.
  Summer: {
    rindLight: [180, 222, 104],
    rindMid: [110, 176, 64],
    rindDark: [56, 108, 38],
    stripe: [50, 96, 34],
    highlight: [220, 244, 168],
    leaf: [92, 156, 56],
    padGrass: [80, 178, 70],
    padDark: [40, 116, 50],
    soil: [128, 88, 48],
    outline: [34, 64, 24],
    light: [255, 244, 200],
    lightAmt: 0.18,
    scale: 1.0,
    gloss: 0.94,
    stripeAmt: 1.0,
    leafYellow: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — deeper, dulling green rind; the top leaf yellows; gold/rust pad
  // with a couple of fallen leaves. Low amber light.
  Autumn: {
    rindLight: [156, 184, 96],
    rindMid: [104, 142, 62],
    rindDark: [60, 92, 40],
    stripe: [54, 84, 34],
    highlight: [204, 218, 156],
    leaf: [150, 152, 64],
    padGrass: [160, 150, 78],
    padDark: [108, 88, 46],
    soil: [120, 78, 42],
    outline: [46, 58, 26],
    light: [250, 198, 132],
    lightAmt: 0.22,
    scale: 1.0,
    gloss: 0.5,
    stripeAmt: 0.84,
    leafYellow: 0.78,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1.0,
  },
  // Winter — cool blue-grey light; frost-dusted melon + a bold snow cap on top;
  // snow drift at the base. The melon stays clearly green-striped underneath
  // (NO white-out, NO ice coating).
  Winter: {
    rindLight: [150, 182, 124],
    rindMid: [102, 142, 84],
    rindDark: [62, 100, 58],
    stripe: [56, 92, 50],
    highlight: [208, 226, 208],
    leaf: [112, 140, 96],
    padGrass: [182, 202, 220],
    padDark: [122, 150, 178],
    soil: [132, 116, 102],
    outline: [50, 58, 56],
    light: [200, 224, 255],
    lightAmt: 0.32,
    scale: 1.0,
    gloss: 0.28,
    stripeAmt: 0.78,
    leafYellow: 0.2,
    frostAmt: 0.78,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Melon geometry — the SAME silhouette every season ─────────────────────────

// Origin-centered; body sits low, resting on the pad. The pose pivot is near the
// base so lean rolls the melon and squash anchors where it sits.
const MEL_CY = 4; // body centre y (slightly below origin, rests on pad)
const MEL_RX = 14; // horizontal radius of the plump body at full scale
const MEL_RY = 13; // vertical radius (a touch shorter → plump, not perfectly round)

/** Body radii for the given scale factor. */
function bodyR(p: P): { rx: number; ry: number } {
  const s = 0.85 + 0.15 * clamp01(p.scale); // keep it readable even at min scale
  return { rx: MEL_RX * s, ry: MEL_RY * s };
}

/** Trace the plump round melon body into the current ctx path. */
function melonBodyPath(ctx: CanvasRenderingContext2D, cy: number, rx: number, ry: number): void {
  ctx.beginPath();
  ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2);
}

/** Map a normalised stripe offset u∈[-1,1] across the spherical body to an
 *  x-position at vertical fraction v∈[-1,1] (foreshortened toward the rim). */
function stripeX(u: number, v: number, rx: number): number {
  return u * rx * Math.sqrt(Math.max(0, 1 - v * v * 0.55));
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

    const { rx, ry } = bodyR(p);
    const cy = MEL_CY; // unposed body centre; the pose transform moves the body
    const botY = cy + ry; // contact point of the melon on the pad
    const pivotY = botY - 1; // roll/squash about a point near the base

    // ── Pad: low flat grass ellipse (does NOT move with the pose) ────────────
    ctx.fillStyle = rgba(p.padDark, 0.4);
    ctx.beginPath();
    ctx.ellipse(3, 21.5, 16, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // shaded underside
    ctx.fillStyle = rgb(p.padDark);
    ctx.beginPath();
    ctx.ellipse(0, 20.4, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // grass top
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

    // fallen leaves on the pad (autumn)
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const leaves: Array<[number, number, number, RGB]> = [
        [-12, 19.6, -0.5, [196, 120, 40]],
        [12, 18.6, 0.7, [176, 72, 32]],
      ];
      leaves.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgba(col, a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.2, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba([90, 44, 16], a);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.lineTo(3, 0);
        ctx.stroke();
        ctx.restore();
      });
    }

    // ── Contact shadow under the melon (follows the bob/lean for grounding) ──
    const rollShift = pose.lean * (pivotY - cy); // how far the body rolls
    const shadowSpread = 1 + clamp01(pose.bob < 0 ? -pose.bob / 14 : 0) * 0.5;
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0 + rollShift * 0.18, botY + 0.5, rx * 0.62 * shadowSpread, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.28 / shadowSpread);
    ctx.beginPath();
    ctx.ellipse(3 + rollShift * 0.2, botY + 1.4, rx * 0.78 * shadowSpread, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the round striped melon, under the idle pose transform ──────
    ctx.save();
    // Pivot near the base so lean rolls the body and squash anchors at the base
    // (it "sits" on the pad). bob raises the whole body.
    ctx.translate(0, pivotY + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(0, -pivotY);

    // 1) soft dark outline pass (body drawn slightly fatter, dark first)
    melonBodyPath(ctx, cy, rx + 1.1, ry + 1.1);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // 2) body fill + shading, clipped to the round silhouette so the outline
    //    reads as a thin rim and the stripes can run to the edge.
    ctx.save();
    melonBodyPath(ctx, cy, rx, ry);
    ctx.clip();

    // base mid tone
    ctx.fillStyle = rgb(p.rindMid);
    ctx.fillRect(-rx - 2, cy - ry - 2, (rx + 2) * 2, (ry + 2) * 2);

    // spherical shading: lit upper-left → mid → shaded lower-right
    const sg = ctx.createRadialGradient(-rx * 0.42, cy - ry * 0.5, rx * 0.18, 0, cy, rx * 1.28);
    sg.addColorStop(0, rgb(p.rindLight));
    sg.addColorStop(0.5, rgb(p.rindMid));
    sg.addColorStop(1, rgb(p.rindDark));
    ctx.fillStyle = sg;
    ctx.fillRect(-rx - 2, cy - ry - 2, (rx + 2) * 2, (ry + 2) * 2);

    // dark watermelon rind stripes curving over the body. Each stripe is a thin
    // vertical band, foreshortened toward the rim → reads as wrapping a sphere.
    if (p.stripeAmt > 0.01) {
      ctx.strokeStyle = rgba(p.stripe, 0.5 + 0.45 * p.stripeAmt);
      const offs = [-0.82, -0.5, -0.16, 0.18, 0.52, 0.84];
      offs.forEach((u) => {
        ctx.lineWidth = 2.2 + 1.4 * (1 - Math.abs(u)); // centre stripes a bit fatter
        ctx.beginPath();
        for (let s = 0; s <= 14; s++) {
          const v = -1 + (s / 14) * 2; // top → bottom of the body
          const x = stripeX(u, v, rx);
          const y = cy + v * ry * 0.99;
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        // a faint dark edge on each stripe for the crisp watermelon split
        ctx.save();
        ctx.strokeStyle = rgba(p.rindDark, 0.3 * p.stripeAmt);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let s = 0; s <= 14; s++) {
          const v = -1 + (s / 14) * 2;
          const x = stripeX(u, v, rx) + 1.6;
          const y = cy + v * ry * 0.99;
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      });
    }

    // lower-right occlusion to deepen the round form
    ctx.fillStyle = rgba(p.rindDark, 0.4);
    ctx.beginPath();
    ctx.ellipse(rx * 0.34, cy + ry * 0.42, rx * 0.78, ry * 0.7, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // soft pale highlight band on the lit upper-left shoulder
    ctx.fillStyle = rgba(p.highlight, 0.55);
    ctx.beginPath();
    ctx.ellipse(-rx * 0.34, cy - ry * 0.46, rx * 0.5, ry * 0.34, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // dewy sheen-streak (gloss strength from P)
    if (p.gloss > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.14 + 0.5 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(-rx * 0.42, cy - ry * 0.42, 1.8, ry * 0.42, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([255, 255, 255], 0.55 * p.gloss);
      ctx.beginPath();
      ctx.arc(-rx * 0.5, cy - ry * 0.52, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // frost dusting (winter) — cool blue speckle on the upward rind
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.26 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(0, cy - ry * 0.3, rx * 0.92, ry * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-rx * 0.5, cy - ry * 0.5], [-rx * 0.18, cy - ry * 0.62], [rx * 0.2, cy - ry * 0.5],
        [rx * 0.5, cy - ry * 0.34], [-rx * 0.34, cy - ry * 0.12], [rx * 0.34, cy - ry * 0.08],
        [0, cy - ry * 0.38],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end body clip

    // 3) snow cap on top (winter) — drawn over, hugging the upper rim
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      const capW = rx * 0.62;
      const capY = cy - ry * 0.86;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(-capW, capY + 2.4);
      ctx.quadraticCurveTo(-capW * 0.5, capY - 4.2, 0, capY - 3.4);
      ctx.quadraticCurveTo(capW * 0.5, capY - 4.2, capW, capY + 2.4);
      ctx.quadraticCurveTo(capW * 0.6, capY + 4.4, capW * 0.3, capY + 2.8);
      ctx.quadraticCurveTo(0, capY + 4.6, -capW * 0.3, capY + 2.8);
      ctx.quadraticCurveTo(-capW * 0.6, capY + 4.4, -capW, capY + 2.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(0, capY + 2.6, capW * 0.78, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Tendril/stem nub + one small top leaf (rides with the pose) ──────────
    const stemX = rx * 0.12;
    const stemY = cy - ry + 0.5; // top of the body
    // short stem nub
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(stemX, stemY + 1);
    ctx.quadraticCurveTo(stemX - 0.6, stemY - 3.4, stemX + 1.4, stemY - 5.2);
    ctx.stroke();
    ctx.strokeStyle = rgb(p.leaf);
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(stemX, stemY + 1);
    ctx.quadraticCurveTo(stemX - 0.6, stemY - 3.4, stemX + 1.4, stemY - 5.2);
    ctx.stroke();

    // curly tendril spiralling off the stem
    ctx.strokeStyle = rgb(p.leaf);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(stemX + 1.4, stemY - 5.0);
    ctx.bezierCurveTo(stemX + 5.4, stemY - 6.0, stemX + 5.8, stemY - 2.4, stemX + 3.4, stemY - 2.0);
    ctx.bezierCurveTo(stemX + 1.6, stemY - 1.8, stemX + 2.0, stemY - 4.0, stemX + 3.6, stemY - 3.8);
    ctx.stroke();

    // one small top leaf (yellows in autumn / a touch dulled in winter)
    const leafCol = lerpRGB(p.leaf, [206, 180, 70], clamp01(p.leafYellow));
    const leafDark = lerpRGB(p.outline, [120, 96, 24], clamp01(p.leafYellow) * 0.7);
    ctx.save();
    ctx.translate(stemX - 4.4, stemY - 2.2);
    ctx.rotate(-0.95);
    // dark backing
    ctx.fillStyle = rgb(leafDark);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(4.0, -3.0, 8.0, 0);
    ctx.quadraticCurveTo(4.0, 3.0, 0, 0);
    ctx.fill();
    // lit fill
    ctx.fillStyle = rgb(leafCol);
    ctx.beginPath();
    ctx.moveTo(0.8, 0);
    ctx.quadraticCurveTo(4.0, -2.2, 7.0, 0);
    ctx.quadraticCurveTo(4.0, 2.2, 0.8, 0);
    ctx.fill();
    // midrib
    ctx.strokeStyle = rgb(leafDark);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0.6, 0);
    ctx.lineTo(6.8, 0);
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // end pose transform

    // ── Ambient light wash over the whole tile (per-season tint) ─────────────
    if (p.lightAmt > 0.001) {
      ctx.globalAlpha = 1;
      // soft upper-left bias so it reads as directional light, not a flat veil
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
// sin^2(pi q) → smooth in/out, peak at q=0.5.
function hump(q: number): number {
  const s = Math.sin(Math.PI * q);
  return s * s;
}

// An asymmetric anticipation→peak→settle curve, 0 at q=0 and q=1.
function anticipate(q: number): number {
  // windup wave: a small negative lobe then a big positive lobe, both returning
  // to zero at the edges. (1-cos) envelope keeps velocity zero at q=0,1.
  const env = 0.5 * (1 - Math.cos(2 * Math.PI * q)); // 0..1..0, velocity 0 at edges
  const tilt = Math.sin(Math.PI * q) * Math.sin(1.5 * Math.PI * q);
  return env * (0.55 * Math.sin(2 * Math.PI * q) + 0.9 * tilt);
}

/** Build the idle pose from the wall clock. Two tiers:
 *   common heavy WOBBLE every ~6s (win 1.0s), rare BOUNCE every ~18s (win 1.2s).
 *  It's a big heavy round melon, so the gestures are slow & weighty. */
function poseFromClock(t: number): Pose {
  const pose: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0 };

  // ── COMMON: slow heavy side-to-side wobble (~6s, win 1.0s) ──
  // One unhurried roll left→right→left, ~0.18 rad lean. Roll arm ≈
  // (pivotY - cy) ≈ ry-1 ≈ 12 px → ~10–12 px sway at the rim, plus a base squash
  // so the weight settles side to side.
  const qC = actionQ(t, 6.0, 1.0, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC); // 0..1..0, zero at edges
    const rock = Math.sin(qC * Math.PI * 2); // one full slow rock within the window
    pose.lean += 0.18 * env * rock;
    // heavy base squat as it rolls (it's a big melon settling its weight)
    pose.squashY += -0.07 * hump(qC);
    pose.squashX += 0.06 * hump(qC);
    // faint windup tilt from the seamless-curve toolkit (still 0 at edges)
    pose.lean += 0.02 * anticipate(qC);
  }

  // ── RARE SPECIAL: squash-stretch BOUNCE hop (~18s, win 1.2s) ──
  // Anticipation crouch → modest rise (it's heavy) → squash landing → settle.
  const qS = actionQ(t, 18.0, 1.2, 3.0); // phase 3s so it doesn't collide w/ wobble
  if (qS >= 0) {
    const crouch = qS < 0.2 ? Math.sin((qS / 0.2) * Math.PI) : 0; // 0..1..0
    const airWin = qS >= 0.2 && qS < 0.82 ? (qS - 0.2) / 0.62 : -1;
    const air = airWin >= 0 ? Math.sin(airWin * Math.PI) : 0; // arc up & down
    const landWin = qS >= 0.74 ? Math.min(1, (qS - 0.74) / 0.26) : -1;
    const land = landWin >= 0 ? Math.sin(landWin * Math.PI) : 0; // squash bump

    // bob: crouch dips down, then a heavy rise (negative = up) ~11px (it's big).
    pose.bob += crouch * 1.8 - air * 11.0;
    // squash-stretch: tall+thin at apex, short+wide on crouch & landing.
    const apex = air; // 0..1 in the air
    pose.squashY += apex * 0.18 - crouch * 0.14 - land * 0.18;
    pose.squashX += -apex * 0.12 + crouch * 0.12 + land * 0.16;
    // a tiny lean wiggle on the way down for life
    pose.lean += 0.05 * Math.sin(qS * Math.PI * 4) * (1 - Math.abs(2 * qS - 1));
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
        // a few drifting snowflakes
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
        ctx.fillStyle = "rgba(196,108,32,1)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.4, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      // Summer: no extra dressing — the bounce + glossy ripe green is the show.
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
