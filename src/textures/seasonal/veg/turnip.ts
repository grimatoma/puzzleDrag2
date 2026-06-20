// Seasonal art for the TURNIP vegetable tile (`tile_veg_turnip`).
// File: src/textures/seasonal/veg/turnip.ts
//
// Category: VEG (Fruit/Veg framing). The iconic harvested ROOT VEG — a single
// round turnip bulb resting low-centre on a grassy pad. Per the root-veg rule
// the turnip KEEPS its leafy top for read: a small tuft of green leaves sprouts
// up top and a thin taproot tails down into the pad.
//
// PALETTE LOCK: the turnip is WHITE on the lower two-thirds and MAGENTA/purple
// on the upper shoulder, with a green leafy top. That identity is the SAME every
// season — ripeness/age shows ONLY in colour and the bulb's size, never an
// identity change. The constant silhouette + a single parameterized paint make
// the season transitions seamless:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transition(0) is
// identical to draw(from) and transition(1) is identical to draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
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
  bulbLight: RGB;   // lit face of the WHITE lower bulb
  bulbMid: RGB;     // body tone of the white bulb
  bulbDark: RGB;    // shadowed underside of the white bulb
  shoulderLight: RGB; // lit magenta/purple shoulder
  shoulderMid: RGB;   // magenta shoulder body
  shoulderDark: RGB;  // shadowed magenta shoulder
  leafLight: RGB;   // lit green leaf
  leafMid: RGB;     // leaf body
  leafDark: RGB;    // shaded leaf / stems
  root: RGB;        // the thin taproot at the bottom
  padGrass: RGB;    // top of the grass pad
  padDark: RGB;     // shaded pad underside
  soil: RGB;        // contact / base soil under the turnip
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  ripeness: number; // 0..1 → bulb size (small spring → fat autumn)
  gloss: number;    // 0..1 specular sheen on the bulb (summer peak)
  frostAmt: number; // 0..1 cool frost dusting on the bulb (winter)
  snowCapAmt: number; // 0..1 snow cap on the leaves / shoulder (winter)
  padSnowAmt: number; // 0..1 snow blanket on the pad (winter)
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
    bulbLight: lerpRGB(a.bulbLight, b.bulbLight, t),
    bulbMid: lerpRGB(a.bulbMid, b.bulbMid, t),
    bulbDark: lerpRGB(a.bulbDark, b.bulbDark, t),
    shoulderLight: lerpRGB(a.shoulderLight, b.shoulderLight, t),
    shoulderMid: lerpRGB(a.shoulderMid, b.shoulderMid, t),
    shoulderDark: lerpRGB(a.shoulderDark, b.shoulderDark, t),
    leafLight: lerpRGB(a.leafLight, b.leafLight, t),
    leafMid: lerpRGB(a.leafMid, b.leafMid, t),
    leafDark: lerpRGB(a.leafDark, b.leafDark, t),
    root: lerpRGB(a.root, b.root, t),
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

// ── Per-season params ────────────────────────────────────────────────────────
// PALETTE LOCK held across all four: white bulb + magenta shoulder + green top.
// Seasons shift only the lit/shade tones, the pad, the light, and the dressing.

const SP: Record<SeasonName, P> = {
  // Spring — small pale young turnip; bright young lime leaves; dewy lime pad +
  // blossom. Cool-bright light. (Small bulb via low ripeness.)
  Spring: {
    bulbLight: [248, 250, 248],
    bulbMid: [226, 230, 230],
    bulbDark: [186, 196, 200],
    shoulderLight: [216, 120, 196],
    shoulderMid: [186, 78, 166],
    shoulderDark: [138, 52, 122],
    leafLight: [168, 224, 110],
    leafMid: [110, 188, 74],
    leafDark: [66, 138, 52],
    root: [228, 226, 214],
    padGrass: [128, 206, 86],
    padDark: [72, 138, 58],
    soil: [120, 84, 48],
    outline: [58, 48, 60],
    light: [232, 244, 226],
    lightAmt: 0.16,
    ripeness: 0.2,
    gloss: 0.22,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — PEAK: plump ripe turnip, crisp white bulb, VIVID magenta shoulder,
  // lush deep-green leaves; warm light, strong gloss; mid-green pad.
  Summer: {
    bulbLight: [255, 255, 255],
    bulbMid: [238, 240, 238],
    bulbDark: [196, 204, 206],
    shoulderLight: [234, 96, 206],
    shoulderMid: [204, 52, 178],
    shoulderDark: [150, 30, 130],
    leafLight: [128, 204, 84],
    leafMid: [78, 166, 58],
    leafDark: [44, 116, 42],
    root: [236, 234, 222],
    padGrass: [86, 168, 70],
    padDark: [44, 110, 48],
    soil: [126, 86, 48],
    outline: [54, 40, 56],
    light: [255, 240, 206],
    lightAmt: 0.18,
    ripeness: 0.78,
    gloss: 0.95,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — fat mature turnip (largest bulb); leaves yellowing a touch;
  // olive-tan browning pad + a couple of fallen leaves; low amber light.
  Autumn: {
    bulbLight: [246, 244, 232],
    bulbMid: [222, 218, 202],
    bulbDark: [180, 174, 156],
    shoulderLight: [210, 96, 168],
    shoulderMid: [176, 60, 142],
    shoulderDark: [128, 44, 108],
    leafLight: [196, 196, 88],
    leafMid: [150, 154, 64],
    leafDark: [104, 104, 48],
    root: [214, 204, 178],
    padGrass: [150, 152, 86],
    padDark: [104, 96, 52],
    soil: [120, 80, 44],
    outline: [62, 46, 44],
    light: [248, 210, 150],
    lightAmt: 0.2,
    ripeness: 1.0,
    gloss: 0.4,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — cool blue-grey light; frost-dusted turnip + a small snow cap; the
  // white-and-magenta identity stays CLEARLY visible; snowy pad. No white-out.
  Winter: {
    bulbLight: [236, 244, 252],
    bulbMid: [206, 218, 230],
    bulbDark: [160, 178, 196],
    shoulderLight: [196, 118, 188],
    shoulderMid: [160, 80, 154],
    shoulderDark: [112, 56, 110],
    leafLight: [150, 186, 156],
    leafMid: [104, 148, 116],
    leafDark: [66, 106, 84],
    root: [206, 212, 218],
    padGrass: [176, 196, 214],
    padDark: [120, 146, 172],
    soil: [128, 110, 96],
    outline: [52, 48, 64],
    light: [206, 226, 252],
    lightAmt: 0.3,
    ripeness: 0.82,
    gloss: 0.25,
    frostAmt: 0.7,
    snowCapAmt: 0.85,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── The single parameterized paint ───────────────────────────────────────────

// Turnip geometry constants (the SAME silhouette every season). The bulb is a
// round body resting low on the pad; the magenta shoulder is the upper band, the
// white lower two-thirds below it, a thin taproot tails out the bottom, and a
// small leafy tuft sprouts up top. Origin-centered.
const BULB_CY = 7;        // bulb centre y (sits low-centre on the pad)
const BULB_RX = 13;       // base half-width at full ripeness
const BULB_RY = 12;       // base half-height at full ripeness
const SHOULDER_FRAC = 0.34; // top fraction of the bulb that is magenta

/** Bulb radius for a given ripeness (small spring → fat autumn). */
function bulbRadii(ripeness: number): { rx: number; ry: number } {
  const k = 0.74 + 0.26 * clamp01(ripeness); // 0.74..1.0
  return { rx: BULB_RX * k, ry: BULB_RY * k };
}

/** Trace the round turnip bulb body path (slightly tapered to the root). */
function bulbPath(ctx: CanvasRenderingContext2D, cy: number, rx: number, ry: number): void {
  const top = cy - ry;
  const bot = cy + ry;
  ctx.beginPath();
  ctx.moveTo(0, top);
  // left shoulder bulging out
  ctx.bezierCurveTo(-rx * 1.02, top + ry * 0.15, -rx * 1.1, cy + ry * 0.1, -rx * 0.7, bot - ry * 0.12);
  // taper down to a small flat base where the root exits
  ctx.quadraticCurveTo(-rx * 0.42, bot + ry * 0.12, 0, bot);
  ctx.quadraticCurveTo(rx * 0.42, bot + ry * 0.12, rx * 0.7, bot - ry * 0.12);
  // right shoulder back up
  ctx.bezierCurveTo(rx * 1.1, cy + ry * 0.1, rx * 1.02, top + ry * 0.15, 0, top);
  ctx.closePath();
}

/** The whole tile from ONLY `p` and `bob`. */
function paint(ctx: CanvasRenderingContext2D, raw: P, bob: number): void {
  const p = clampP(raw);
  const { rx, ry } = bulbRadii(p.ripeness);
  const cy = BULB_CY + bob;
  const top = cy - ry;
  const bot = cy + ry;
  // shoulder band split line (where magenta meets white)
  const splitY = top + ry * 2 * SHOULDER_FRAC;

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

    // ── Soil contact patch directly under the turnip base ───────────────────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, bot + 1.5, 8, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // contact shadow of the turnip on the pad
    ctx.fillStyle = rgba(p.outline, 0.28);
    ctx.beginPath();
    ctx.ellipse(2.5, bot + 2, 11, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Taproot: a thin tail dropping from the base into the pad ─────────────
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, bot - 1);
    ctx.quadraticCurveTo(0.6, bot + 3.5, -0.4, bot + 7);
    ctx.stroke();
    ctx.strokeStyle = rgb(p.root);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, bot - 1);
    ctx.quadraticCurveTo(0.6, bot + 3.5, -0.4, bot + 7);
    ctx.stroke();

    // ── Subject: the turnip bulb (SAME silhouette every season) ─────────────
    // 1) soft dark outline pass (drawn slightly fatter under the body fill)
    ctx.save();
    bulbPath(ctx, cy, rx + 1.1, ry + 1.1);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();
    ctx.restore();

    // 2) body fill, clipped to the bulb so the outline reads as a rim
    ctx.save();
    bulbPath(ctx, cy, rx, ry);
    ctx.clip();

    // WHITE lower two-thirds — base mid tone then a lit upper-left face
    ctx.fillStyle = rgb(p.bulbMid);
    ctx.fillRect(-rx - 3, top - 3, (rx + 3) * 2, ry * 2 + 6);
    const bulbGrad = ctx.createLinearGradient(-rx, top, rx, bot);
    bulbGrad.addColorStop(0, rgb(p.bulbLight));
    bulbGrad.addColorStop(0.5, rgb(p.bulbMid));
    bulbGrad.addColorStop(1, rgb(p.bulbDark));
    ctx.fillStyle = bulbGrad;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.ellipse(-1.5, cy + ry * 0.18, rx + 2, ry * 0.96, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // MAGENTA shoulder band over the top third
    const shGrad = ctx.createLinearGradient(0, top, 0, splitY + 2);
    shGrad.addColorStop(0, rgb(p.shoulderLight));
    shGrad.addColorStop(0.55, rgb(p.shoulderMid));
    shGrad.addColorStop(1, rgb(p.shoulderDark));
    ctx.fillStyle = shGrad;
    ctx.beginPath();
    // band hugging the top of the bulb, dipping down at the centre
    ctx.moveTo(-rx - 2, splitY);
    ctx.quadraticCurveTo(0, splitY + ry * 0.34, rx + 2, splitY);
    ctx.lineTo(rx + 2, top - 4);
    ctx.lineTo(-rx - 2, top - 4);
    ctx.closePath();
    ctx.fill();
    // soft blend line where magenta meets white
    ctx.strokeStyle = rgba(p.shoulderDark, 0.4);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-rx, splitY - 0.5);
    ctx.quadraticCurveTo(0, splitY + ry * 0.3, rx, splitY - 0.5);
    ctx.stroke();
    // lit magenta highlight on the upper-left shoulder
    ctx.fillStyle = rgba(p.shoulderLight, 0.5);
    ctx.beginPath();
    ctx.ellipse(-rx * 0.4, top + ry * 0.34, rx * 0.42, ry * 0.3, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // vertical shading on the white body's right side to round it
    ctx.fillStyle = rgba(p.bulbDark, 0.5);
    ctx.beginPath();
    ctx.ellipse(rx * 0.62, cy + ry * 0.28, rx * 0.42, ry * 0.7, 0.15, 0, Math.PI * 2);
    ctx.fill();
    // subtle root-streak grooves on the white lower body
    ctx.strokeStyle = rgba(p.bulbDark, 0.3);
    ctx.lineWidth = 0.8;
    [-rx * 0.4, 0, rx * 0.4].forEach((sx) => {
      ctx.beginPath();
      ctx.moveTo(sx, splitY + 1);
      ctx.quadraticCurveTo(sx * 0.4, lerp(splitY, bot, 0.6), sx * 0.1, bot - 2);
      ctx.stroke();
    });

    // bulb specular sheen (gloss strength from P)
    if (p.gloss > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.18 + 0.5 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(-rx * 0.42, cy - ry * 0.1, rx * 0.22, ry * 0.4, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // frost dusting (winter) — cool blue speckle on the upward bulb
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.26 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(-1, cy - ry * 0.25, rx * 0.92, ry * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-rx * 0.5, top + 4], [-rx * 0.1, top + 2.5], [rx * 0.4, top + 5],
        [-rx * 0.3, cy], [rx * 0.3, cy + 2], [0, cy - ry * 0.4],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end clip

    // 3) snow cap on the shoulder (winter) — drawn over, hugging the top rim
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(-rx * 0.62, top + 2);
      ctx.quadraticCurveTo(-rx * 0.3, top - 4.5, 0, top - 3.5);
      ctx.quadraticCurveTo(rx * 0.3, top - 4.5, rx * 0.62, top + 2);
      ctx.quadraticCurveTo(rx * 0.34, top + 4.5, 0, top + 3);
      ctx.quadraticCurveTo(-rx * 0.34, top + 4.5, -rx * 0.62, top + 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(0, top + 2.2, rx * 0.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Leafy top: a small tuft of green leaves (SAME placement every season) ─
    drawLeaves(ctx, p, top, 0);

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

/** The leafy tuft sprouting from the top of the bulb. `sway` is an idle lean
 *  (radians) applied to the whole tuft (0 at rest). Constant shape per season. */
function drawLeaves(ctx: CanvasRenderingContext2D, p: P, topY: number, sway: number): void {
  // Each leaf: [baseAngle (rad, 0=up, neg=left), length, width]
  const leaves: Array<[number, number, number]> = [
    [-0.62, 12, 3.0],
    [-0.26, 15, 3.4],
    [0.04, 16, 3.6],
    [0.34, 14, 3.2],
    [0.66, 11, 2.8],
  ];
  ctx.save();
  ctx.translate(0, topY - 1);
  leaves.forEach(([baseAng, len, w], i) => {
    // outer leaves sway slightly more than inner ones
    const lean = sway * (0.6 + 0.4 * Math.abs(baseAng) / 0.66);
    const ang = baseAng + lean;
    const tipX = Math.sin(ang) * len;
    const tipY = -Math.cos(ang) * len;
    const midX = Math.sin(ang) * len * 0.5 - Math.cos(ang) * 0.6;
    const midY = -Math.cos(ang) * len * 0.5;
    // outline
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = w + 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.stroke();
    // leaf body (alternate light/mid for a little variety)
    ctx.strokeStyle = i % 2 === 0 ? rgb(p.leafMid) : rgb(p.leafLight);
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.stroke();
    // central vein highlight
    ctx.strokeStyle = rgba(p.leafDark, 0.5);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, 0.5);
    ctx.quadraticCurveTo(midX * 0.92, midY * 0.92, tipX * 0.9, tipY * 0.9);
    ctx.stroke();
  });
  // small stem cluster base where leaves meet the bulb
  ctx.fillStyle = rgb(p.leafDark);
  ctx.beginPath();
  ctx.ellipse(0, 1.5, 3.2, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── Idle bob (seamless, zero-velocity at t=0) ────────────────────────────────

// A*(1-cos(w t))*0.5 → 0 at t=0 with zero velocity; period 2π/w.
function bobAt(t: number, amp = 0.9, w = 1.5): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    paint(ctx, SP[season], bob);

    // Leafy-top sway — redraw ONLY the leaves with a gentle lean (additive,
    // over the static paint so the tuft visibly sways without moving the bulb).
    const p = clampP(SP[season]);
    const { ry } = bulbRadii(p.ripeness);
    const leafTopY = BULB_CY + bob - ry;
    const sway = Math.sin(t * 1.3) * 0.1;
    ctx.save();
    try {
      drawLeaves(ctx, p, leafTopY, sway);
    } finally {
      ctx.restore();
    }

    ctx.save();
    try {
      ctx.globalAlpha = 1;
      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint that travels gently on the bulb
        const g = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        const gy = BULB_CY + bob + Math.sin(t * 1.1) * 1.2;
        ctx.beginPath();
        ctx.arc(-5, gy, 1.1 + g * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // soft sheen travels DOWN the white bulb (seamless via fract)
        const prog = (t * 0.5) % 1;
        const { ry: ry2 } = bulbRadii(p.ripeness);
        const gy = lerp(BULB_CY + bob - ry2 * 0.4, BULB_CY + bob + ry2 * 0.6, prog);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.beginPath();
        ctx.ellipse(-4.5, gy, 1.4, 2.4, -0.1, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // a single fluttering leaf drifting down past the bulb
        const prog = ((t / 3.4) % 1 + 1) % 1;
        const fx = 9 - prog * 5 + Math.sin(prog * Math.PI * 3) * 2.2;
        const fy = -6 + prog * 26;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(prog * Math.PI * 2);
        ctx.globalAlpha = 0.4 + 0.5 * Math.sin(prog * Math.PI);
        ctx.fillStyle = "rgb(196,150,64)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.6, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Winter — drifting snowflakes + cold sheen on the frosted bulb
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
        ctx.globalAlpha = 0.1 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.8));
        ctx.fillStyle = "rgba(210,232,255,1)";
        ctx.beginPath();
        ctx.ellipse(-3, BULB_CY + bob - 2, 6, 4, -0.2, 0, Math.PI * 2);
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
