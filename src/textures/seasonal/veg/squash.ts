// BOLD seasonal art for the SQUASH vegetable tile (`tile_veg_squash`).
//
// One plump golden gourd (a butternut shape: a fat rounded base swelling up to a
// thicker neck) with soft vertical ribbing and a short woody stem on top,
// resting low-centre on a grassy pad. The SAME gourd silhouette is drawn every
// season (identity-safe) — but the seasons swing HARD on colour + a real
// seasonal prop, and the idle is loud rather than subtle (it's a PLUMP gourd):
//
//   Spring : a SMALL green-tinged young squash + a prominent pad blossom.
//   Summer : the full GOLDEN squash at peak ripeness, glossy and warm.
//   Autumn : a deep amber-ripe squash + a fallen leaf on the pad.
//   Winter : a bold SNOW CAP on the neck + snow at the base + frost; the golden
//            gourd still clearly reads through the cold.
//
//   IDLE COMMON  (~6s, win ~1.5s): a HEAVY SLOW WOBBLE — a low-frequency, weighty
//       rock about the base (one slow lean out and back) with a DEEP base squat,
//       reading the gourd's mass. Zero value AND velocity at the window edges
//       (seamless).
//   IDLE SPECIAL (~18s, win ~2.4s): a bigger, slower HEAVE — the heavy gourd
//       leans FAR to one side, HOLDS at the apex, then settles back through
//       centre with a momentum OVERSHOOT and a squash landing. Pose-only (no hop),
//       heavier and bolder than the common wobble. Zero at the window edges.
//
// Architecture mirrors pepper.bold.ts: a single parameterized
// `paint(ctx, p, pose)` where `interface P` holds tweenable season params
// (colours + prop amounts + size) and `pose` holds the idle gesture
// (bob / lean / squash). Because every season is the same paint with tweened P,
// transitions are seamless:
//   transition(0) ≡ draw(from), transition(1) ≡ draw(to).
// REST pose has all zeros, so draw(season) = paint(ctx, SP[season], REST) and the
// idle's pose is 0 (with zero velocity) at every action-window edge → seamless.
//
// Origin-centered in the −24..+24 design box (actions may paint outside it),
// light from upper-left, flat cel-shaded with a soft dark outline. Pure
// Canvas-2D vector drawing — never throws, clamps everything, save/restore,
// resets globalAlpha.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable season params ──────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — paint is a
 *  pure function of these so transitions interpolate cleanly. */
interface P {
  skinLight: RGB;        // lit face of the gourd skin
  skinMid: RGB;          // body tone
  skinDark: RGB;         // shadowed ribs / underside
  stem: RGB;             // short woody stem on top
  padGrass: RGB;         // top of the grass pad
  padDark: RGB;          // shaded pad underside
  soil: RGB;             // contact / base soil under the gourd
  outline: RGB;          // soft dark outline tint
  light: RGB;            // ambient light tint laid over the whole tile
  lightAmt: number;      // 0..1 strength of the ambient light wash
  size: number;          // ~0.86..1.0 overall gourd scale (Spring is small)
  gloss: number;         // 0..1 specular sheen strength across the ribs
  frostAmt: number;      // 0..1 cool frost dusting on the skin (winter)
  snowCapAmt: number;    // 0..1 snow cap on the neck shoulders (winter)
  padSnowAmt: number;    // 0..1 snow blanket on the pad (winter)
  blossomAmt: number;    // 0..1 blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad (autumn)
}

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number;     // vertical offset in design px (negative = up)
  lean: number;    // top-of-gourd sway, radians (rock side to side)
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
    stem: lerpRGB(a.stem, b.stem, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    size: lerp(a.size, b.size, t),
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
    // size kept in a sane band so a wild value can never explode the silhouette
    size: 0.7 + 0.4 * clamp01((p.size - 0.7) / 0.4),
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
// Identity lock: the same butternut gourd every season; ripeness shows as
// colour/shade + size only (small green young → full golden peak → deep amber →
// cooled golden under snow), never an identity change.

const SP: Record<SeasonName, P> = {
  // Spring — SMALL young green-tinged squash, matte; dewy lime pad + blossom.
  Spring: {
    skinLight: [196, 220, 120],
    skinMid: [150, 188, 72],
    skinDark: [96, 138, 50],
    stem: [120, 150, 74],
    padGrass: [128, 210, 86],
    padDark: [70, 142, 58],
    soil: [120, 84, 48],
    outline: [56, 92, 34],
    light: [232, 246, 224],
    lightAmt: 0.16,
    size: 0.86,
    gloss: 0.16,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 1.0,
    fallenLeafAmt: 0,
  },
  // Summer — PEAK full golden squash, glossy; saturated mid-green pad, warm light.
  Summer: {
    skinLight: [255, 216, 92],
    skinMid: [242, 174, 44],
    skinDark: [176, 112, 22],
    stem: [120, 132, 60],
    padGrass: [86, 170, 70],
    padDark: [44, 112, 48],
    soil: [126, 86, 48],
    outline: [104, 66, 20],
    light: [255, 242, 204],
    lightAmt: 0.2,
    size: 1.0,
    gloss: 0.78,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — DEEP amber ripe squash, richest; olive-tan browning pad, fallen leaf.
  Autumn: {
    skinLight: [238, 156, 56],
    skinMid: [202, 110, 30],
    skinDark: [134, 66, 20],
    stem: [128, 108, 50],
    padGrass: [152, 150, 84],
    padDark: [106, 94, 50],
    soil: [120, 80, 44],
    outline: [86, 44, 16],
    light: [250, 200, 134],
    lightAmt: 0.24,
    size: 1.0,
    gloss: 0.4,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1.0,
  },
  // Winter — cool blue-grey light; snow-capped + frosted golden squash, snowy pad.
  // Skin stays golden (still clearly a gourd) but cooled + dusted.
  Winter: {
    skinLight: [224, 184, 100],
    skinMid: [198, 148, 66],
    skinDark: [132, 96, 50],
    stem: [118, 116, 88],
    padGrass: [178, 198, 218],
    padDark: [118, 146, 174],
    soil: [128, 112, 98],
    outline: [60, 46, 40],
    light: [202, 224, 255],
    lightAmt: 0.34,
    size: 0.98,
    gloss: 0.22,
    frostAmt: 0.78,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Gourd geometry — the SAME silhouette every season ────────────────────────
// A fat rounded bulb resting low on the pad, swelling UP through a slimmer waist
// into a thicker neck, with a short woody stem on top. Origin-centered.
const BULB_CY = 11;     // centre of the fat rounded base, low on the pad
const BULB_RX = 12.5;   // half-width of the fat base
const BULB_RY = 8.5;    // half-height of the fat base
const WAIST_Y = 0;      // narrowest point between bulb and neck
const WAIST_HALF = 6;   // half-width at the waist
const NECK_TOP_Y = -16; // top of the neck where the stem sits
const NECK_HALF = 5.4;  // half-width of the thicker neck

const GOURD_BOT = BULB_CY + BULB_RY;     // contact line on the pad
const GOURD_PIVOT_Y = GOURD_BOT - 1;     // rock/lean about a point near the base

// Rib x-offsets (as a fraction of the local half-width) for the vertical ribbing
// that runs the whole gourd. Five lobes/grooves (added a centre groove + pushed
// the outer pair wider) to sell the gourd's faceted 3D form more strongly.
const RIB_FRACS: number[] = [-0.74, -0.4, 0.0, 0.4, 0.74];

/** Trace the butternut-gourd body path (fat base → waist → thicker neck),
 *  origin-local and unposed. */
function gourdBodyPath(ctx: CanvasRenderingContext2D): void {
  const bcy = BULB_CY;
  const wy = WAIST_Y;
  const nty = NECK_TOP_Y;
  ctx.beginPath();
  // start at the neck top-left, just under the stem
  ctx.moveTo(-NECK_HALF, nty + 1);
  // round the neck crown
  ctx.quadraticCurveTo(-NECK_HALF, nty - 2.5, 0, nty - 3);
  ctx.quadraticCurveTo(NECK_HALF, nty - 2.5, NECK_HALF, nty + 1);
  // right neck down to the waist (slims in)
  ctx.quadraticCurveTo(NECK_HALF + 1.2, lerp(nty, wy, 0.5), WAIST_HALF, wy);
  // waist swelling out into the fat bulb on the right
  ctx.quadraticCurveTo(BULB_RX, bcy - BULB_RY * 0.7, BULB_RX, bcy);
  // round the fat base bottom-right → bottom
  ctx.quadraticCurveTo(BULB_RX, bcy + BULB_RY, 0, bcy + BULB_RY);
  // bottom → bottom-left → up the left bulb
  ctx.quadraticCurveTo(-BULB_RX, bcy + BULB_RY, -BULB_RX, bcy);
  ctx.quadraticCurveTo(-BULB_RX, bcy - BULB_RY * 0.7, -WAIST_HALF, wy);
  // left waist back up to the neck
  ctx.quadraticCurveTo(-NECK_HALF - 1.2, lerp(nty, wy, 0.5), -NECK_HALF, nty + 1);
  ctx.closePath();
}

/** Local half-width of the gourd at design-y `y` (body-local coords). Used to
 *  place ribs / shading so they hug the silhouette. */
function halfWidthAt(y: number): number {
  if (y <= WAIST_Y) {
    // neck region: NECK_HALF (top) → WAIST_HALF (waist)
    const k = clamp01((y - NECK_TOP_Y) / (WAIST_Y - NECK_TOP_Y));
    return lerp(NECK_HALF, WAIST_HALF, k);
  }
  // bulb region: WAIST_HALF (waist) → BULB_RX (bulb centre) → 0 (bottom)
  const bottom = BULB_CY + BULB_RY;
  if (y <= BULB_CY) {
    const k = clamp01((y - WAIST_Y) / (BULB_CY - WAIST_Y));
    return lerp(WAIST_HALF, BULB_RX, k);
  }
  const k = clamp01((y - BULB_CY) / (bottom - BULB_CY));
  return lerp(BULB_RX, 0.5, k);
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
      // sparkle on the snow
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
      const spots: Array<[number, number]> = [[-13, 18.5], [12, 17.8], [-4, 21]];
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

    // ── Contact shadow under the gourd (follows the bob/lean for grounding) ──
    const tipShift = pose.lean * (GOURD_PIVOT_Y - NECK_TOP_Y); // how far the neck leans
    const shadowSpread = 1 + clamp01(pose.bob < 0 ? -pose.bob / 14 : 0) * 0.5;
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0 + tipShift * 0.18, GOURD_BOT + 1.5, 9 * shadowSpread, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.28 / shadowSpread);
    ctx.beginPath();
    ctx.ellipse(2.5 + tipShift * 0.2, GOURD_BOT + 2, 12 * shadowSpread, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the squash gourd, under the size + idle pose transform ───────
    ctx.save();
    // Pivot near the base so lean rocks the NECK side-to-side and squash anchors
    // at the base (it "sits" on the pad). bob raises the whole body. size scales
    // the whole gourd about the same base pivot (Spring is a small squash).
    ctx.translate(0, GOURD_PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale((1 + pose.squashX) * p.size, (1 + pose.squashY) * p.size);
    ctx.translate(0, -GOURD_PIVOT_Y);

    const bcy = BULB_CY;
    const nty = NECK_TOP_Y;

    // 1) soft dark outline pass (drawn fatter, dark first then light rim shows)
    gourdBodyPath(ctx);
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = rgb(p.outline);
    ctx.stroke();
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // 2) body fill, clipped so the outline shows as a rim
    ctx.save();
    gourdBodyPath(ctx);
    ctx.clip();

    // base mid tone fill
    ctx.fillStyle = rgb(p.skinMid);
    ctx.fillRect(-BULB_RX - 3, nty - 6, (BULB_RX + 3) * 2, (bcy + BULB_RY) - nty + 12);

    // light from upper-left: a lit ovoid over the upper-left of the body
    const litGrad = ctx.createLinearGradient(-BULB_RX, nty, BULB_RX, bcy + BULB_RY);
    litGrad.addColorStop(0, rgb(p.skinLight));
    litGrad.addColorStop(0.5, rgb(p.skinMid));
    litGrad.addColorStop(1, rgb(p.skinDark));
    ctx.fillStyle = litGrad;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.ellipse(-2.5, lerp(nty, bcy, 0.55), BULB_RX + 2, (bcy + BULB_RY - nty) * 0.6, -0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // soft vertical ribbing — dark grooves following the silhouette, sampled
    // down the body so they hug the bulge. SAME shape every season.
    const yTop = nty - 1;
    const yBot = bcy + BULB_RY - 1;
    RIB_FRACS.forEach((frac) => {
      // deeper, darker groove — a two-pass stroke (broad soft shade under a
      // tighter dark core) so each rib reads as a real recess in the form.
      ctx.strokeStyle = rgba(p.skinDark, 0.45);
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      let first = true;
      for (let y = yTop; y <= yBot; y += 1.5) {
        const hw = halfWidthAt(y);
        const x = frac * hw;
        if (first) { ctx.moveTo(x, y); first = false; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = rgba(p.skinDark, 0.82);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      first = true;
      for (let y = yTop; y <= yBot; y += 1.5) {
        const hw = halfWidthAt(y);
        const x = frac * hw;
        if (first) { ctx.moveTo(x, y); first = false; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // bright rib catch-light just left of each dark groove (the lit edge of the
      // adjacent lobe) — brighter now to make the ribbing pop.
      ctx.strokeStyle = rgba(p.skinLight, 0.6);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      first = true;
      for (let y = yTop; y <= yBot; y += 1.5) {
        const hw = halfWidthAt(y);
        const x = frac * hw - 1.5;
        if (first) { ctx.moveTo(x, y); first = false; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });

    // rounding shadow along the lower-right of the bulb
    ctx.fillStyle = rgba(p.skinDark, 0.5);
    ctx.beginPath();
    ctx.ellipse(5, bcy + 2.5, BULB_RX * 0.7, BULB_RY * 0.9, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // smooth sheen across the ribs (gloss strength from P) — an elongated soft
    // sheen running the lit upper-left of the body...
    if (p.gloss > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.12 + 0.5 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(-4.5, lerp(nty, bcy, 0.4), 2.2, (bcy - nty) * 0.5, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([255, 255, 255], 0.08 + 0.34 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(-6, bcy + 1, 1.8, 3.4, -0.1, 0, Math.PI * 2);
      ctx.fill();
      // ...plus a BRIGHTER, tighter specular hotspot on the upper-left shoulder of
      // the bulb — a hard little glint that reads the surface as glossy & rounded.
      const hx = -5.5;
      const hy = lerp(nty, bcy, 0.62);
      const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 4.2);
      hg.addColorStop(0, rgba([255, 255, 255], Math.min(1, 0.5 + 0.5 * p.gloss)));
      hg.addColorStop(0.5, rgba([255, 255, 255], 0.18 + 0.3 * p.gloss));
      hg.addColorStop(1, rgba([255, 255, 255], 0));
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.ellipse(hx, hy, 3.0, 4.2, -0.22, 0, Math.PI * 2);
      ctx.fill();
      // a crisp core dot for the glossiest seasons
      ctx.fillStyle = rgba([255, 255, 255], Math.min(1, 0.35 + 0.55 * p.gloss));
      ctx.beginPath();
      ctx.ellipse(hx - 0.3, hy - 1.0, 1.1, 1.7, -0.22, 0, Math.PI * 2);
      ctx.fill();
    }

    // frost dusting (winter) — cool blue speckle on the upward skin
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.26 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(-1, lerp(nty, bcy, 0.35), BULB_RX, (bcy - nty) * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-7, nty + 4], [-2, nty + 2], [3, nty + 5], [7, nty + 8],
        [-6, lerp(nty, bcy, 0.5)], [5, lerp(nty, bcy, 0.55)], [0, lerp(nty, bcy, 0.35)],
        [-9, bcy], [8, bcy - 1],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end body clip

    // 3) snow cap on the neck shoulders (winter) — drawn over, hugging the crown
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(-NECK_HALF - 0.5, nty + 1.5);
      ctx.quadraticCurveTo(-3, nty - 5, 0, nty - 4);
      ctx.quadraticCurveTo(3, nty - 5, NECK_HALF + 0.5, nty + 1.5);
      ctx.quadraticCurveTo(2.5, nty + 4.4, 0, nty + 3.2);
      ctx.quadraticCurveTo(-2.5, nty + 4.4, -NECK_HALF - 0.5, nty + 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(0, nty + 2.2, NECK_HALF * 0.7, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // a little snow on the upward shoulder of the bulb
      ctx.fillStyle = rgba([240, 248, 255], 0.7 * a);
      ctx.beginPath();
      ctx.ellipse(-6, bcy - BULB_RY + 1, 3.8, 1.7, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Short woody stem on top (SAME placement every season) ────────────────
    const stemBaseY = nty - 2;
    // stem outline (fat dark) then the woody core
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    ctx.moveTo(0.2, stemBaseY + 1.5);
    ctx.quadraticCurveTo(-0.4, stemBaseY - 3, 1.2, stemBaseY - 6.5);
    ctx.stroke();
    ctx.strokeStyle = rgb(p.stem);
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(0.2, stemBaseY + 1.5);
    ctx.quadraticCurveTo(-0.4, stemBaseY - 3, 1.2, stemBaseY - 6.5);
    ctx.stroke();
    // stem highlight
    ctx.strokeStyle = rgba(p.skinLight, 0.45);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-0.7, stemBaseY - 0.5);
    ctx.quadraticCurveTo(-1.1, stemBaseY - 3.5, 0.4, stemBaseY - 6);
    ctx.stroke();

    ctx.restore(); // end size + pose transform

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

/** RARE heave lean profile over q∈[0,1]: ramp FAR to one side, HOLD at the apex,
 *  then swing back through centre with a momentum OVERSHOOT past it before
 *  settling. Returns roughly −0.3..+1 (×amplitude). Built from smootherstep /
 *  hump pieces so it is exactly 0 with ZERO velocity at q=0 and q=1:
 *    up   = smoother(q/0.30)        → 0→1 over [0,0.30]      (flat slope at both ends)
 *    down = smoother((q−0.55)/0.45) → 0→1 over [0.55,1]      (flat slope at both ends)
 *    base = up − down               → 0 →1→ hold →0          (apex held over [0.30,0.55])
 *    os   = −0.34·hump(osWin)       → a dip past centre on the return (0 at its ends)
 *  At q=0: up=down=os=0 → 0. At q=1: up=1, down=1, osWin=1→hump=0 → 0. */
function heaveLean(q: number): number {
  const up = smoother(clamp01(q / 0.3));
  const down = smoother(clamp01((q - 0.55) / 0.45));
  const osWin = clamp01((q - 0.55) / 0.45);
  const os = -0.34 * hump(osWin);
  return up - down + os;
}

/** Build the idle pose from the wall clock. Two tiers, neither a bounce — both
 *  read the gourd's MASS:
 *   COMMON — a HEAVY SLOW WOBBLE every ~6s (win 1.5s): one low-frequency lean out
 *            and back with a deep weighty base squat.
 *   RARE   — a bigger, slower HEAVE every ~18s (win 2.4s): lean FAR, HOLD, settle
 *            back through centre with a momentum overshoot + squash landing.
 *  Every factor is 0 with zero velocity at its window edges → seamless loop. */
function poseFromClock(t: number): Pose {
  const pose: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0 };

  // ── COMMON: heavy SLOW wobble (~6s, win 1.5s) ──
  // Low frequency: a single slow lean out → through → back (one cycle), not a
  // nervous flutter. Tip arm ≈ (GOURD_PIVOT_Y − NECK_TOP_Y) ≈ 34 px, so ~0.16 rad
  // reads as a weighty ~5–6 px sway at the neck. Deep squat sells the mass.
  const qC = actionQ(t, 6.0, 1.5, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC); // 0..1..0 envelope, zero at edges
    const rock = Math.sin(qC * Math.PI * 2); // ONE slow L→centre→R→centre cycle
    pose.lean += 0.16 * env * rock;
    // a deep, weighty squat at the base as it rocks (it's plump and heavy)
    pose.squashY += -0.11 * hump(qC);
    pose.squashX += 0.1 * hump(qC);
  }

  // ── RARE: a bigger, slower HEAVE (~18s, win 2.4s) — pose-only, no hop ──
  // The heavy gourd leans FAR to one side, holds at the apex under its own weight,
  // then settles back through centre with a momentum overshoot and a squash
  // landing. Heavier + bolder + slower than the common wobble. Phase 3s so it
  // lands clear of the common beat.
  const qS = actionQ(t, 18.0, 2.4, 3.0);
  if (qS >= 0) {
    const hv = heaveLean(qS); // ~0 →1→ hold → overshoot(−) → 0
    pose.lean += 0.27 * hv; // a far, weighty lean (bolder than the common 0.16)
    // Deep base squat held through the lean (mass settling into the base) plus an
    // extra squash thump on the return/overshoot (the landing momentum).
    const settle = hump(qS); // 0..1..0 over the whole window
    const osWin = clamp01((qS - 0.55) / 0.45);
    const landing = hump(osWin); // 0 at q=0.55 and q=1 — the settle thump
    pose.squashY += -0.1 * settle - 0.07 * landing;
    pose.squashX += 0.09 * settle + 0.08 * landing;
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
          const fy = -22 + prog * 38;
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
      // Summer: no extra dressing — the heavy wobble + glossy golden gourd is the show.
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
