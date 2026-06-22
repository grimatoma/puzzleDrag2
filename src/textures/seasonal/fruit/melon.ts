// Seasonal art for the MELON fruit tile (`tile_bird_melon` — the "bird" key is
// merge-chain logic only; the subject is a green watermelon-style melon).
//
// A plump, near-spherical striped melon resting low-centre on a grassy pad.
// Darker-green rind stripes curve over the round body (classic watermelon read),
// with a short curly tendril/stem nub + one small leaf at the top. The SAME
// striped round silhouette is drawn EVERY season — only surface colour, frost /
// snow dusting, light tint and the pad dressing (blossom / fallen leaves / snow)
// change. This is enforced by a single parameterized `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
//
// Identity rule: winter only DUSTS the melon with frost + a small snow cap; the
// green striped rind stays clearly visible (no white-out, no ice coating).
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
  rindLight: RGB;   // lit upper-left face of the rind
  rindMid: RGB;     // body tone of the rind
  rindDark: RGB;    // shaded lower-right of the body
  stripe: RGB;      // dark watermelon rind stripes curving over the body
  highlight: RGB;   // pale sheen colour on the lit shoulder
  leaf: RGB;        // tendril + small top leaf green
  padGrass: RGB;    // top of the grass pad
  padDark: RGB;     // shaded pad underside
  soil: RGB;        // contact / base soil under the melon
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  ripeness: number; // 0..1 fruit ripeness (reserved colour cue, no structure)
  scale: number;    // 0..1 body scale (spring melon a touch smaller)
  gloss: number;    // 0..1 dewy sheen-streak strength on the rind
  stripeAmt: number; // 0..1 darkness/crispness of the rind stripes
  leafYellow: number; // 0..1 top-leaf yellowing (autumn)
  frostAmt: number; // 0..1 cool frost dusting on the rind
  snowCapAmt: number; // 0..1 snow cap sitting on top of the melon
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 pale blossom resting on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves resting on the pad (autumn)
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
    ripeness: lerp(a.ripeness, b.ripeness, t),
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
    ripeness: clamp01(p.ripeness),
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

// ── Per-season params ────────────────────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — younger, slightly smaller + paler green melon; faint dewy sheen;
  // bright lime dewy pad + a pale blossom. Cool-bright light.
  Spring: {
    rindLight: [196, 226, 138],
    rindMid: [132, 182, 86],
    rindDark: [86, 132, 56],
    stripe: [96, 138, 60],
    highlight: [224, 242, 188],
    leaf: [108, 160, 66],
    padGrass: [128, 206, 86],
    padDark: [72, 138, 58],
    soil: [120, 84, 48],
    outline: [44, 70, 34],
    light: [232, 244, 226],
    lightAmt: 0.16,
    ripeness: 0.3,
    scale: 0.9,
    gloss: 0.34,
    stripeAmt: 0.6,
    leafYellow: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — full ripe melon: deep saturated green rind, crisp dark stripes
  // (PEAK); bright grass pad. Warm light, strong shadow + sheen.
  Summer: {
    rindLight: [179, 215, 112],
    rindMid: [120, 170, 72],
    rindDark: [70, 110, 44],
    stripe: [74, 110, 42],
    highlight: [216, 238, 170],
    leaf: [96, 150, 60],
    padGrass: [86, 168, 70],
    padDark: [44, 110, 48],
    soil: [126, 86, 48],
    outline: [40, 66, 28],
    light: [255, 240, 206],
    lightAmt: 0.18,
    ripeness: 0.85,
    scale: 1.0,
    gloss: 0.92,
    stripeAmt: 1.0,
    leafYellow: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — deeper, slightly dulling green rind; the top leaf yellows; gold/
  // rust pad with a couple of fallen leaves. Low amber light.
  Autumn: {
    rindLight: [158, 188, 102],
    rindMid: [108, 146, 66],
    rindDark: [66, 98, 42],
    stripe: [62, 92, 38],
    highlight: [206, 220, 162],
    leaf: [142, 150, 64],
    padGrass: [150, 152, 86],
    padDark: [104, 96, 52],
    soil: [120, 80, 44],
    outline: [48, 60, 28],
    light: [248, 210, 150],
    lightAmt: 0.2,
    ripeness: 1.0,
    scale: 1.0,
    gloss: 0.5,
    stripeAmt: 0.86,
    leafYellow: 0.7,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — cool blue-grey light; frost-dusted melon + a small snow cap on top;
  // snow-covered pad with frost sparkle. The melon stays clearly green-striped
  // underneath (NO white-out).
  Winter: {
    rindLight: [150, 180, 122],
    rindMid: [104, 140, 84],
    rindDark: [66, 100, 60],
    stripe: [60, 92, 52],
    highlight: [206, 224, 206],
    leaf: [112, 138, 96],
    padGrass: [176, 196, 214],
    padDark: [120, 146, 172],
    soil: [128, 110, 96],
    outline: [50, 58, 56],
    light: [206, 226, 252],
    lightAmt: 0.3,
    ripeness: 0.85,
    scale: 1.0,
    gloss: 0.28,
    stripeAmt: 0.78,
    leafYellow: 0.2,
    frostAmt: 0.7,
    snowCapAmt: 0.85,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── The single parameterized paint ───────────────────────────────────────────

// Melon geometry constants (the SAME silhouette every season, scaled by p.scale
// about the body centre). Origin-centered; body sits low, resting on the pad.
const MEL_CY = 4; // body centre y (slightly below origin, rests on pad)
const MEL_RX = 14; // horizontal radius of the plump body at full scale
const MEL_RY = 13; // vertical radius (a touch shorter → plump, not perfectly round)

/** Body radii for the given scale factor. */
function bodyR(p: P): { rx: number; ry: number } {
  const s = 0.85 + 0.15 * clamp01(p.scale); // keep it readable even at min scale
  return { rx: MEL_RX * s, ry: MEL_RY * s };
}

/** Trace the plump round melon body into the current ctx path. `cy` is the
 *  (possibly bobbed) body centre. */
function melonBodyPath(ctx: CanvasRenderingContext2D, cy: number, rx: number, ry: number): void {
  ctx.beginPath();
  ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2);
}

/** Map a normalised stripe offset u∈[-1,1] across the spherical body to an
 *  x-position at vertical fraction v∈[-1,1] (foreshortened toward the rim). */
function stripeX(u: number, v: number, rx: number): number {
  return u * rx * Math.sqrt(Math.max(0, 1 - v * v * 0.55));
}

/** The whole tile from ONLY `p` and `bob`. */
function paint(ctx: CanvasRenderingContext2D, raw: P, bob: number): void {
  const p = clampP(raw);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const { rx, ry } = bodyR(p);
    const cy = MEL_CY + bob;
    const botY = cy + ry; // contact point of the melon on the pad

    // ── Pad: low flat grass ellipse, x∈[−18,+18], centre y≈+19 ──────────────
    // soft contact shadow lower-right, pad colour from P
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

    // ── Soil contact patch + contact shadow under the melon base ────────────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, botY + 0.5, rx * 0.62, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.28);
    ctx.beginPath();
    ctx.ellipse(3, botY + 1.4, rx * 0.78, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the round striped melon (SAME silhouette every season) ─────
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

    ctx.restore(); // end clip

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

    // ── Tendril/stem nub + one small top leaf (SAME placement every season) ──
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

    // ── Ambient light wash over the whole tile (per-season tint) ────────────
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

// ── Idle bob (seamless, zero-velocity at t=0) ────────────────────────────────

// A*(1-cos(w t))*0.5 → 0 at t=0 with zero velocity; period 2π/w.
function bobAt(t: number, amp = 0.85, w = 1.5): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    // Per-season additive micro-motion drawn OVER the static paint. The subject
    // bob itself is 0 at t=0; micro-motion is additive dressing (a travelling
    // dewy glint, a leaf stir, a drifting snowflake) — never the silhouette.
    paint(ctx, SP[season], bob);

    ctx.save();
    try {
      ctx.globalAlpha = 1;
      const { rx, ry } = bodyR(SP[season]);
      const cy = MEL_CY + bob;
      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint travelling gently on the rind
        const g = 0.22 + 0.28 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        const gy = cy - ry * 0.4 + Math.sin(t * 1.1) * 1.4;
        ctx.beginPath();
        ctx.arc(-rx * 0.4, gy, 1.0 + g * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // a bright dewy glint travels across the rind (seamless via fract); no flash
        const prog = (t * 0.4) % 1;
        const gx = lerp(-rx * 0.6, rx * 0.45, prog);
        const gy = cy - ry * 0.5 + Math.sin(prog * Math.PI) * ry * 0.5;
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.beginPath();
        ctx.ellipse(gx, gy, 1.6, 2.4, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.arc(gx - 1.4, gy - 1.2, 1.0, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // a tiny stir of the top leaf — a faint sheen pulse on the shoulder
        const s = 0.1 + 0.14 * (0.5 + 0.5 * Math.sin(t * 0.9));
        ctx.fillStyle = `rgba(255,236,200,${s})`;
        ctx.beginPath();
        ctx.ellipse(-rx * 0.3, cy - ry * 0.5, 4.0, 3.0, -0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Winter — a drifting snowflake + a faint cold sheen (no bright flash)
        const seeds: Array<[number, number, number]> = [
          [-9, 0.0, 1.0], [6, 0.4, 0.9], [11, 0.7, 0.8], [-2, 0.25, 0.9],
        ];
        ctx.fillStyle = "#ffffff";
        seeds.forEach(([fx, phase, r]) => {
          const prog = ((t / 3.0 + phase) % 1 + 1) % 1;
          const fy = -22 + prog * 40;
          const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
          ctx.globalAlpha = 0.35 + 0.4 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.arc(dx, fy, r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 0.1 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.8));
        ctx.fillStyle = "rgba(210,232,255,1)";
        ctx.beginPath();
        ctx.ellipse(-rx * 0.3, cy - ry * 0.2, rx * 0.5, ry * 0.4, -0.3, 0, Math.PI * 2);
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
