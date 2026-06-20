// Seasonal art for the BROCCOLI vegetable tile (`tile_veg_broccoli`).
//
// One broccoli floret: a thick pale-green stalk rising from the pad, topped by a
// single dense rounded DOME head made of tightly packed tiny blue-green buds
// (bumpy / granular texture). The SAME stalk+dome silhouette is drawn every
// season — only colour and the small dressing (frost, snow cap, pad blossoms /
// fallen leaves / snow, light tint, sheen) change, plus the crown buds opening &
// yellowing slightly in autumn (a tweened amount, NOT a shape swap). Ripeness =
// colour. This is enforced by a single parameterized `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
//
// Palette lock: a dense blue-green broccoli head + pale stalk, in every season.
//
// Origin-centered in the −24..+24 design box, light from upper-left, flat
// cel-shaded with a soft dark outline. Pure Canvas-2D vector drawing.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable params ─────────────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly. */
interface P {
  budLight: RGB;    // lit top of the packed bud canopy (blue-green)
  budMid: RGB;      // body tone of the bud dome
  budDark: RGB;     // shadowed underside / between-bud grooves
  budCrown: RGB;    // crown buds (autumn: yellowing as they open)
  stalkLight: RGB;  // lit face of the pale stalk
  stalkMid: RGB;    // stalk body
  stalkDark: RGB;   // stalk shaded side
  padGrass: RGB;    // top of the grass pad
  padDark: RGB;     // shaded pad underside
  soil: RGB;        // contact / base soil under the stalk
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  ripeness: number; // 0..1 (reserved colour cue; informs nothing structural)
  gloss: number;    // 0..1 soft sheen over the buds
  loosen: number;   // 0..1 head looseness — spring young/loose, summer tight,
                    //      autumn buds open & yellow at the crown
  frostAmt: number; // 0..1 cool frost dusting on the head
  snowCapAmt: number; // 0..1 snow cap on the crown of the dome
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad (autumn)
}

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
    budLight: lerpRGB(a.budLight, b.budLight, t),
    budMid: lerpRGB(a.budMid, b.budMid, t),
    budDark: lerpRGB(a.budDark, b.budDark, t),
    budCrown: lerpRGB(a.budCrown, b.budCrown, t),
    stalkLight: lerpRGB(a.stalkLight, b.stalkLight, t),
    stalkMid: lerpRGB(a.stalkMid, b.stalkMid, t),
    stalkDark: lerpRGB(a.stalkDark, b.stalkDark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    ripeness: lerp(a.ripeness, b.ripeness, t),
    gloss: lerp(a.gloss, b.gloss, t),
    loosen: lerp(a.loosen, b.loosen, t),
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
    loosen: clamp01(p.loosen),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — small young head, looser & a touch lighter green; dewy lime pad +
  // blossom. Cool-bright light. Palette stays blue-green (just younger/lighter).
  Spring: {
    budLight: [128, 196, 132],
    budMid: [74, 152, 104],
    budDark: [40, 100, 74],
    budCrown: [150, 206, 132],
    stalkLight: [196, 222, 168],
    stalkMid: [158, 196, 132],
    stalkDark: [110, 152, 96],
    padGrass: [128, 206, 86],
    padDark: [72, 138, 58],
    soil: [120, 84, 48],
    outline: [30, 64, 48],
    light: [232, 244, 226],
    lightAmt: 0.16,
    ripeness: 0.2,
    gloss: 0.2,
    loosen: 0.42,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — PEAK: full TIGHT dense blue-green head; richest saturation, mid-green
  // pad, warm light, strong soft sheen over the packed buds.
  Summer: {
    budLight: [96, 178, 128],
    budMid: [44, 132, 92],
    budDark: [20, 84, 62],
    budCrown: [70, 158, 110],
    stalkLight: [206, 226, 168],
    stalkMid: [168, 200, 128],
    stalkDark: [116, 156, 92],
    padGrass: [86, 168, 70],
    padDark: [44, 110, 48],
    soil: [126, 86, 48],
    outline: [16, 58, 44],
    light: [255, 240, 206],
    lightAmt: 0.18,
    ripeness: 0.85,
    gloss: 0.6,
    loosen: 0.0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — head loosening: buds opening & yellowing at the crown; deeper olive
  // blue-green body; olive-tan pad, a couple fallen leaves. Low amber light.
  Autumn: {
    budLight: [120, 170, 104],
    budMid: [70, 124, 78],
    budDark: [38, 78, 52],
    budCrown: [206, 200, 96], // yellowing open crown
    stalkLight: [196, 208, 140],
    stalkMid: [158, 178, 108],
    stalkDark: [108, 132, 76],
    padGrass: [150, 152, 86],
    padDark: [104, 96, 52],
    soil: [120, 80, 44],
    outline: [44, 56, 36],
    light: [248, 210, 150],
    lightAmt: 0.2,
    ripeness: 1.0,
    gloss: 0.3,
    loosen: 0.85,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — cool blue-grey light; frost-dusted blue-green head + small snow cap,
  // still clearly broccoli; snowy pad. Tight head again under the snow.
  Winter: {
    budLight: [108, 168, 140],
    budMid: [54, 116, 100],
    budDark: [28, 74, 68],
    budCrown: [96, 158, 134],
    stalkLight: [196, 214, 196],
    stalkMid: [156, 184, 168],
    stalkDark: [108, 144, 134],
    padGrass: [176, 196, 214],
    padDark: [120, 146, 172],
    soil: [128, 110, 96],
    outline: [38, 56, 60],
    light: [206, 226, 252],
    lightAmt: 0.3,
    ripeness: 0.8,
    gloss: 0.22,
    loosen: 0.12,
    frostAmt: 0.7,
    snowCapAmt: 0.8,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── The single parameterized paint ───────────────────────────────────────────

// Broccoli geometry (the SAME silhouette every season). A thick stalk rises from
// the pad, branching into a couple of stubs, topped by one dense dome head.
const STALK_BOT = 17;   // stalk base resting on the pad
const STALK_TOP = -1;   // where the stalk meets the underside of the dome
const STALK_HALF = 4.2; // half-width of the main stalk

const DOME_CY = -7;     // centre of the dome head
const DOME_RX = 14;     // dome half-width
const DOME_RY = 11;     // dome half-height (rounded, a touch taller than flat)

// A fixed cluster of tiny "bud" blobs covering the dome (constant outline /
// positions every season). Each: [x, y, radius] relative to the dome centre.
// The dome silhouette is the convex hull of these; identical for all seasons.
const BUDS: Array<[number, number, number]> = [
  // crown row (top of the dome)
  [-7, -8.2, 3.0], [-2.4, -9.4, 3.2], [2.6, -9.2, 3.2], [7.2, -8.0, 3.0],
  // upper-mid row
  [-11, -5.0, 3.0], [-5.6, -5.4, 3.3], [0, -6.0, 3.4], [5.6, -5.4, 3.3], [11, -5.0, 3.0],
  // mid row
  [-12.6, -0.6, 3.0], [-7.4, -1.0, 3.3], [-2, -1.4, 3.4], [3.4, -1.2, 3.4], [8.4, -0.8, 3.3], [12.8, -0.6, 3.0],
  // lower row (skirt of the dome over the stalk shoulders)
  [-9.6, 3.2, 2.8], [-4.2, 3.0, 3.0], [1.2, 2.8, 3.0], [6.6, 3.0, 2.9], [10.6, 3.4, 2.6],
];

// Which buds sit at the crown (used for the autumn "opening / yellowing" cue and
// the winter snow cap). Indices into BUDS.
const CROWN_IDX = [0, 1, 2, 3, 5, 6, 7];

/** Trace the dome head silhouette (one smooth rounded dome) into the path. */
function domePath(ctx: CanvasRenderingContext2D, bob: number): void {
  const cy = DOME_CY + bob;
  ctx.beginPath();
  // a rounded dome: full upper bulge, gently flattened underside meeting stalk
  ctx.moveTo(-DOME_RX, cy + DOME_RY * 0.45);
  ctx.quadraticCurveTo(-DOME_RX, cy - DOME_RY * 0.9, -DOME_RX * 0.45, cy - DOME_RY);
  ctx.quadraticCurveTo(0, cy - DOME_RY * 1.18, DOME_RX * 0.45, cy - DOME_RY);
  ctx.quadraticCurveTo(DOME_RX, cy - DOME_RY * 0.9, DOME_RX, cy + DOME_RY * 0.45);
  ctx.quadraticCurveTo(DOME_RX * 0.8, cy + DOME_RY * 0.95, DOME_RX * 0.36, cy + DOME_RY * 0.92);
  ctx.quadraticCurveTo(0, cy + DOME_RY * 0.86, -DOME_RX * 0.36, cy + DOME_RY * 0.92);
  ctx.quadraticCurveTo(-DOME_RX * 0.8, cy + DOME_RY * 0.95, -DOME_RX, cy + DOME_RY * 0.45);
  ctx.closePath();
}

/** Trace the thick stalk (with two short branch stubs) into the path. */
function stalkPath(ctx: CanvasRenderingContext2D, bob: number): void {
  const b = STALK_BOT + bob;
  const t = STALK_TOP + bob;
  const h = STALK_HALF;
  ctx.beginPath();
  // base flares out a little where it meets the pad
  ctx.moveTo(-h - 1.4, b);
  ctx.quadraticCurveTo(-h - 0.4, b - 6, -h, lerp(t, b, 0.4));
  // left branch stub spreading up-left under the dome
  ctx.quadraticCurveTo(-h - 1.6, t + 5, -h - 4.2, t + 1.5);
  ctx.quadraticCurveTo(-h - 1.2, t + 2.5, -h * 0.5, t + 0.5);
  // crest under the dome
  ctx.quadraticCurveTo(0, t - 1, h * 0.5, t + 0.5);
  // right branch stub spreading up-right
  ctx.quadraticCurveTo(h + 1.2, t + 2.5, h + 4.2, t + 1.5);
  ctx.quadraticCurveTo(h + 1.6, t + 5, h, lerp(t, b, 0.4));
  ctx.quadraticCurveTo(h + 0.4, b - 6, h + 1.4, b);
  ctx.quadraticCurveTo(0, b + 2.4, -h - 1.4, b);
  ctx.closePath();
}

/** The whole tile from ONLY `p` and `bob`. */
function paint(ctx: CanvasRenderingContext2D, raw: P, bob: number): void {
  const p = clampP(raw);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Pad: low flat grass ellipse, x∈[−18,+18], centre y≈+19 ──────────────
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
      [[-9, 17.6], [5, 19], [11, 17.4], [-3, 20]].forEach(([sx, sy]) => {
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

    // ── Soil contact patch + contact shadow under the stalk base ────────────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, STALK_BOT + bob + 1.5, 8, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.28);
    ctx.beginPath();
    ctx.ellipse(2.5, STALK_BOT + bob + 2, 11, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject part 1: the thick pale stalk (drawn BEHIND the dome) ────────
    // soft dark outline pass first
    stalkPath(ctx, bob);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();
    // stalk body fill with left-lit gradient
    ctx.save();
    stalkPath(ctx, bob);
    ctx.clip();
    const sGrad = ctx.createLinearGradient(-STALK_HALF - 4, 0, STALK_HALF + 4, 0);
    sGrad.addColorStop(0, rgb(p.stalkLight));
    sGrad.addColorStop(0.5, rgb(p.stalkMid));
    sGrad.addColorStop(1, rgb(p.stalkDark));
    ctx.fillStyle = sGrad;
    ctx.fillRect(-STALK_HALF - 6, STALK_TOP + bob - 4, (STALK_HALF + 6) * 2, STALK_BOT - STALK_TOP + 10);
    // a couple of vertical grooves on the stalk for fibre read
    ctx.strokeStyle = rgba(p.stalkDark, 0.6);
    ctx.lineWidth = 1.1;
    [-1.6, 1.4].forEach((gx) => {
      ctx.beginPath();
      ctx.moveTo(gx, STALK_TOP + bob + 2);
      ctx.lineTo(gx + 0.4, STALK_BOT + bob - 1);
      ctx.stroke();
    });
    ctx.restore();

    // ── Subject part 2: the dense dome head (SAME silhouette every season) ──
    // 1) soft dark outline pass (the dome footprint, fattened a touch)
    domePath(ctx, bob);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // 2) clip to the dome and paint the packed buds inside
    ctx.save();
    domePath(ctx, bob);
    ctx.clip();
    const cy = DOME_CY + bob;

    // base mid fill so gaps between buds read as the body, not transparent
    ctx.fillStyle = rgb(p.budMid);
    ctx.fillRect(-DOME_RX - 2, cy - DOME_RY - 4, (DOME_RX + 2) * 2, DOME_RY * 2 + 10);

    // broad dark→light vertical wash for dome roundness
    const dGrad = ctx.createLinearGradient(0, cy - DOME_RY, 0, cy + DOME_RY);
    dGrad.addColorStop(0, rgb(p.budLight));
    dGrad.addColorStop(0.5, rgb(p.budMid));
    dGrad.addColorStop(1, rgb(p.budDark));
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = dGrad;
    ctx.fillRect(-DOME_RX - 2, cy - DOME_RY - 4, (DOME_RX + 2) * 2, DOME_RY * 2 + 10);
    ctx.globalAlpha = 1;

    // the tiny buds: dark base blob, then a lit cap → tightly-packed granular read
    BUDS.forEach(([bx, by, br], i) => {
      const x = bx;
      const y = by + bob;
      const isCrown = CROWN_IDX.includes(i);
      // crown buds open & yellow with `loosen` (autumn); a touch larger/separated
      const open = isCrown ? p.loosen : p.loosen * 0.35;
      const r = br * (1 + open * 0.12);
      // shadow ring between buds (dark)
      ctx.fillStyle = rgb(p.budDark);
      ctx.beginPath();
      ctx.arc(x, y + 0.5, r + 0.5, 0, Math.PI * 2);
      ctx.fill();
      // bud body — crown buds tilt toward budCrown colour as they yellow/open
      const body: RGB = isCrown ? lerpRGB(p.budMid, p.budCrown, open) : p.budMid;
      ctx.fillStyle = rgb(body);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      // lit cap upper-left on each bud
      const cap: RGB = isCrown ? lerpRGB(p.budLight, p.budCrown, open * 0.6) : p.budLight;
      ctx.fillStyle = rgba(cap, 0.9);
      ctx.beginPath();
      ctx.arc(x - r * 0.32, y - r * 0.34, r * 0.62, 0, Math.PI * 2);
      ctx.fill();
      // a tiny dark fleck centre when buds open (granular detail, autumn)
      if (open > 0.25) {
        ctx.fillStyle = rgba(p.budDark, 0.5 * open);
        ctx.beginPath();
        ctx.arc(x, y, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // soft sheen over the buds (gloss strength from P) — upper-left bias
    if (p.gloss > 0.02) {
      const gl = ctx.createRadialGradient(-5, cy - 4, 1, -5, cy - 4, DOME_RX);
      gl.addColorStop(0, rgba([255, 255, 255], 0.22 + 0.3 * p.gloss));
      gl.addColorStop(1, rgba([255, 255, 255], 0));
      ctx.fillStyle = gl;
      ctx.fillRect(-DOME_RX - 2, cy - DOME_RY - 4, (DOME_RX + 2) * 2, DOME_RY * 2 + 10);
    }

    // frost dusting (winter) — cool blue speckle on the upward buds
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.22 * p.frostAmt);
      ctx.fillRect(-DOME_RX - 2, cy - DOME_RY - 4, (DOME_RX + 2) * 2, DOME_RY);
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-9, cy - 6], [-3, cy - 8], [3, cy - 7], [8, cy - 5],
        [-11, cy - 2], [11, cy - 2], [0, cy - 3], [-6, cy + 1], [6, cy + 1],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end dome clip

    // 3) snow cap on the crown of the dome (winter) — over the buds
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(-DOME_RX * 0.7, cy - DOME_RY * 0.5);
      ctx.quadraticCurveTo(-DOME_RX * 0.5, cy - DOME_RY * 1.05, 0, cy - DOME_RY * 1.02);
      ctx.quadraticCurveTo(DOME_RX * 0.5, cy - DOME_RY * 1.05, DOME_RX * 0.7, cy - DOME_RY * 0.5);
      ctx.quadraticCurveTo(DOME_RX * 0.4, cy - DOME_RY * 0.34, 0, cy - DOME_RY * 0.42);
      ctx.quadraticCurveTo(-DOME_RX * 0.4, cy - DOME_RY * 0.34, -DOME_RX * 0.7, cy - DOME_RY * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(0, cy - DOME_RY * 0.55, DOME_RX * 0.55, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Ambient light wash over the whole tile (per-season tint) ────────────
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

// ── Idle bob (seamless, zero-velocity at t=0) ────────────────────────────────

// A*(1-cos(w t))*0.5 → 0 at t=0 with zero velocity; period 2π/w.
function bobAt(t: number, amp = 0.85, w = 1.4): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    // The head subtly "breathes": a tiny extra vertical wobble on the dome only,
    // 0 at t=0 (folded into bob so the silhouette never snaps).
    paint(ctx, SP[season], bob);

    ctx.save();
    try {
      ctx.globalAlpha = 1;
      const cy = DOME_CY + bob;
      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint travelling gently over the buds
        const g = 0.22 + 0.28 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        const gy = cy - 4 + Math.sin(t * 1.1) * 1.4;
        ctx.beginPath();
        ctx.arc(-5, gy, 1.1 + g * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // soft sheen drifts across the packed buds (seamless via fract)
        const prog = (t * 0.4) % 1;
        const gx = lerp(-DOME_RX * 0.6, DOME_RX * 0.6, prog);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "rgba(255,255,255,1)";
        ctx.beginPath();
        ctx.ellipse(gx, cy - 5, 2.6, 4.0, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (season === "Autumn") {
        // faint slow sheen pulsing on the crown
        const s = 0.1 + 0.14 * (0.5 + 0.5 * Math.sin(t * 0.9));
        ctx.fillStyle = `rgba(255,236,200,${s})`;
        ctx.beginPath();
        ctx.ellipse(-3, cy - 6, 5.0, 3.2, -0.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Winter — drifting snowflakes + cold sheen over the head
        const seeds: Array<[number, number, number]> = [
          [-9, 0.0, 1.0], [6, 0.4, 0.9], [11, 0.7, 0.8], [-2, 0.25, 0.9],
        ];
        ctx.fillStyle = "#ffffff";
        seeds.forEach(([fx, phase, r]) => {
          const prog = ((t / 3.0 + phase) % 1 + 1) % 1;
          const fy = -22 + prog * 38;
          const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
          ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.arc(dx, fy, r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 0.1 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.8));
        ctx.fillStyle = "rgba(210,232,255,1)";
        ctx.beginPath();
        ctx.ellipse(-3, cy - 2, 7, 4.5, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    } finally {
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  };
}

// ── Forward season→season transitions ────────────────────────────────────────

function makeTransition(fromIdx: 0 | 1 | 2): (ctx: CanvasRenderingContext2D, p: number) => void {
  const from = SP[SEASON_NAMES[fromIdx]];
  const to = SP[SEASON_NAMES[fromIdx + 1]];
  return (ctx, pp) => {
    const k = smoother(clamp01(pp));
    paint(ctx, lerpP(from, to, k), 0);
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
