// Seasonal art for the JACKFRUIT fruit tile (`tile_fruit_jackfruit`).
//
// Fruit framing note: the iconic harvested ITEM only — one big heavy oval
// jackfruit resting low-centre on the pad (it fills ~55% of the design-box
// height because it's a large heavy fruit), with a constant bumpy/knobbly
// spiky-textured skin (rows of small blunt points around a constant outline)
// and a short thick stem on top. Ripeness is COLOUR ONLY — the knobbly
// silhouette is IDENTICAL in every season.
//
// One parameterized `paint(ctx, p, bob)` drives all four seasons, the idle
// bob, and the three forward transitions:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
//
// Palette lock: the bumpy green-gold jackfruit skin stays green-gold all year
// (it shifts green → green-gold → yellow-brown for ripeness, never another
// identity). Origin-centered in the −24..+24 design box, light from upper-left,
// flat cel-shaded with a soft dark outline. Pure Canvas-2D vector drawing.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable params ─────────────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly. */
interface P {
  skinLight: RGB;   // lit face of the bumpy skin
  skinMid: RGB;     // body tone
  skinDark: RGB;    // shadowed underside / between-knob grooves
  knobTip: RGB;     // the small blunt point caps catching light
  stem: RGB;        // short thick stem
  padGrass: RGB;    // top of the grass pad
  padDark: RGB;     // shaded pad underside
  soil: RGB;        // contact / base soil under the fruit
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  ripeness: number; // 0..1 (colour cue only; never structural)
  gloss: number;    // 0..1 specular sheen across the knobs
  frostAmt: number; // 0..1 cool frost dusting on the bumps (winter)
  snowCapAmt: number; // 0..1 snow on the upward shoulders + stem (winter)
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
    skinLight: lerpRGB(a.skinLight, b.skinLight, t),
    skinMid: lerpRGB(a.skinMid, b.skinMid, t),
    skinDark: lerpRGB(a.skinDark, b.skinDark, t),
    knobTip: lerpRGB(a.knobTip, b.knobTip, t),
    stem: lerpRGB(a.stem, b.stem, t),
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

const SP: Record<SeasonName, P> = {
  // Spring — small green knobbly fruit (still green/unripe); dewy lime pad +
  // a tiny blossom. Cool-bright light. (Same silhouette; colour reads young.)
  Spring: {
    skinLight: [156, 200, 96],
    skinMid: [104, 160, 60],
    skinDark: [56, 104, 42],
    knobTip: [186, 216, 120],
    stem: [108, 86, 44],
    padGrass: [128, 206, 86],
    padDark: [72, 138, 58],
    soil: [120, 84, 48],
    outline: [42, 64, 32],
    light: [232, 244, 226],
    lightAmt: 0.16,
    ripeness: 0.15,
    gloss: 0.2,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — large ripe green-gold fruit (PEAK, richest/most-saturated);
  // mid-green pad, warm light, strong sheen across the knobs.
  Summer: {
    skinLight: [206, 214, 104],
    skinMid: [156, 178, 60],
    skinDark: [98, 124, 42],
    knobTip: [226, 226, 130],
    stem: [120, 90, 44],
    padGrass: [86, 168, 70],
    padDark: [44, 110, 48],
    soil: [126, 86, 48],
    outline: [62, 78, 30],
    light: [255, 240, 206],
    lightAmt: 0.18,
    ripeness: 0.7,
    gloss: 0.9,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — yellow-brown ripe fruit (gold/rust); olive-tan pad, a couple of
  // fallen leaves; low amber light.
  Autumn: {
    skinLight: [216, 184, 92],
    skinMid: [180, 138, 58],
    skinDark: [120, 86, 40],
    knobTip: [228, 198, 116],
    stem: [110, 78, 38],
    padGrass: [150, 152, 86],
    padDark: [104, 96, 52],
    soil: [120, 80, 44],
    outline: [78, 56, 28],
    light: [248, 210, 150],
    lightAmt: 0.2,
    ripeness: 1.0,
    gloss: 0.5,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — green-gold still visible under a snow cap + frost on the bumps;
  // snowy pad, cool blue-grey light. No white-out: the skin stays readable.
  Winter: {
    skinLight: [172, 182, 110],
    skinMid: [128, 142, 72],
    skinDark: [86, 100, 56],
    knobTip: [196, 200, 138],
    stem: [104, 88, 64],
    padGrass: [176, 196, 214],
    padDark: [120, 146, 172],
    soil: [128, 110, 96],
    outline: [54, 56, 50],
    light: [206, 226, 252],
    lightAmt: 0.3,
    ripeness: 0.85,
    gloss: 0.3,
    frostAmt: 0.7,
    snowCapAmt: 0.85,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── The single parameterized paint ───────────────────────────────────────────

// Jackfruit geometry constants (the SAME knobbly silhouette every season). It's
// a big heavy oval resting LOW on the pad — fills ~55% of the box height. Origin
// centered; the body is widest near its lower-middle.
const JF_TOP = -10; // shoulder/top of the oval body
const JF_BOT = 17; // base resting low on the pad
const JF_HALF = 13.5; // half-width of the oval at its widest
const JF_CY = 4.5; // vertical centre of the oval body

// Knob rows: rings of small blunt points across the surface. Each knob is a
// fraction along the body height (v: 0 top .. 1 bottom) and across (u: -1..1).
// The bumpy OUTLINE comes from the rim knobs; these are the SAME every season.
interface Knob { u: number; v: number; r: number; }
const KNOBS: Knob[] = (() => {
  const out: Knob[] = [];
  // five rows down the body, offset each row for a staggered honeycomb look
  const rows = [0.12, 0.3, 0.5, 0.7, 0.87];
  rows.forEach((v, ri) => {
    const widthAt = Math.sin(Math.PI * (0.18 + 0.64 * v)); // fat in the middle
    const count = 5 + (ri % 2);
    const off = (ri % 2) * 0.5;
    for (let i = 0; i < count; i++) {
      const u = ((i + off) / (count - 1) - 0.5) * 2 * widthAt;
      out.push({ u, v, r: 1.9 - 0.4 * Math.abs(u) * 0.6 + (v > 0.6 ? 0.3 : 0) });
    }
  });
  return out;
})();

/** Map a knob's (u,v) to design-space (x,y) for the current bob. */
function knobXY(k: Knob, bob: number): [number, number] {
  const top = JF_TOP + bob;
  const bot = JF_BOT + bob;
  const y = lerp(top, bot, k.v);
  // narrow toward the top and bottom so knobs hug the oval body
  const taper = Math.sin(Math.PI * (0.12 + 0.76 * k.v));
  const x = k.u * JF_HALF * 0.78 * taper;
  return [x, y];
}

/** Trace the big heavy knobbly oval body path (a bumpy rim) into the ctx path. */
function jackfruitBodyPath(ctx: CanvasRenderingContext2D, bob: number): void {
  const cy = JF_CY + bob;
  const rx = JF_HALF;
  const ry = (JF_BOT - JF_TOP) / 2;
  const STEPS = 44;
  ctx.beginPath();
  for (let i = 0; i <= STEPS; i++) {
    const a = (i / STEPS) * Math.PI * 2 - Math.PI / 2;
    // small bumpy ripple on the rim → constant knobbly outline
    const ripple = 1 + 0.05 * Math.sin(a * 9) + 0.03 * Math.sin(a * 15 + 1.3);
    const x = Math.cos(a) * rx * ripple;
    const y = cy + Math.sin(a) * ry * ripple;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
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

    // ── Contact patch + cast shadow directly under the heavy fruit ──────────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, JF_BOT + bob + 1.5, 11, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.3);
    ctx.beginPath();
    ctx.ellipse(3, JF_BOT + bob + 2.2, 13, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the big knobbly jackfruit (SAME silhouette every season) ───
    // 1) soft dark outline pass (drawn under, reads as a rim)
    jackfruitBodyPath(ctx, bob);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // 2) body fill + shading, clipped to the body so detail stays inside
    ctx.save();
    jackfruitBodyPath(ctx, bob);
    ctx.clip();

    const top = JF_TOP + bob;
    const bot = JF_BOT + bob;
    const cy = JF_CY + bob;

    // base mid tone
    ctx.fillStyle = rgb(p.skinMid);
    ctx.fillRect(-JF_HALF - 3, top - 8, (JF_HALF + 3) * 2, bot - top + 16);

    // light from upper-left → a lit panel on the upper-left face
    const litGrad = ctx.createLinearGradient(-JF_HALF, top - 2, JF_HALF, bot);
    litGrad.addColorStop(0, rgb(p.skinLight));
    litGrad.addColorStop(0.5, rgb(p.skinMid));
    litGrad.addColorStop(1, rgb(p.skinDark));
    ctx.fillStyle = litGrad;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.ellipse(-2, cy - 1, JF_HALF + 2, (bot - top) * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // bumpy/knobbly texture — rows of small blunt points. Each knob: a soft
    // shadow groove (dark) then a lit cap (mid→light) then a tip catch.
    KNOBS.forEach((k) => {
      const [kx, ky] = knobXY(k, bob);
      // groove/shadow ring around the base of the knob
      ctx.fillStyle = rgba(p.skinDark, 0.55);
      ctx.beginPath();
      ctx.ellipse(kx + 0.5, ky + 0.6, k.r + 0.7, k.r + 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // the blunt point cap
      ctx.fillStyle = rgb(p.skinMid);
      ctx.beginPath();
      ctx.ellipse(kx, ky, k.r, k.r * 0.92, 0, 0, Math.PI * 2);
      ctx.fill();
      // upper-left lit side of the knob
      ctx.fillStyle = rgba(p.skinLight, 0.85);
      ctx.beginPath();
      ctx.ellipse(kx - 0.5, ky - 0.5, k.r * 0.62, k.r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // tiny tip catch
      ctx.fillStyle = rgba(p.knobTip, 0.9);
      ctx.beginPath();
      ctx.arc(kx - 0.6, ky - 0.6, k.r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    });

    // rounded underside shadow to seat the heavy fruit
    ctx.fillStyle = rgba(p.skinDark, 0.5);
    ctx.beginPath();
    ctx.ellipse(1, bot - 3, JF_HALF * 0.86, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // broad sheen across the knobs (gloss strength from P)
    if (p.gloss > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.1 + 0.4 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(-4.5, cy - 5, JF_HALF * 0.5, (bot - top) * 0.26, -0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // frost dusting (winter) — cool blue speckle across the upward bumps
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.26 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(-1, cy - 6, JF_HALF, (bot - top) * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([236, 246, 255], 0.75 * p.frostAmt);
      // sparkle the upward knob tips
      KNOBS.forEach((k) => {
        if (k.v > 0.42) return; // only the upper rows catch frost
        const [kx, ky] = knobXY(k, bob);
        ctx.beginPath();
        ctx.arc(kx - 0.5, ky - 0.7, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end body clip

    // 3) snow cap on the upward shoulders (winter), over the rim
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(-JF_HALF * 0.78, top + 5);
      ctx.quadraticCurveTo(-6, top - 2, 0, top - 1.5);
      ctx.quadraticCurveTo(6, top - 2, JF_HALF * 0.78, top + 5);
      ctx.quadraticCurveTo(8, top + 8.5, 3, top + 6);
      ctx.quadraticCurveTo(0, top + 8.5, -3, top + 6);
      ctx.quadraticCurveTo(-8, top + 8.5, -JF_HALF * 0.78, top + 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([206, 223, 243], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(0, top + 5, JF_HALF * 0.6, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Short thick stem on top (SAME placement every season) ───────────────
    const stemBaseY = top + 1;
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 5.4;
    ctx.beginPath();
    ctx.moveTo(0, stemBaseY);
    ctx.quadraticCurveTo(0.6, stemBaseY - 4, 1.2, stemBaseY - 7);
    ctx.stroke();
    ctx.strokeStyle = rgb(p.stem);
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(0, stemBaseY);
    ctx.quadraticCurveTo(0.6, stemBaseY - 4, 1.2, stemBaseY - 7);
    ctx.stroke();
    // stem highlight
    ctx.strokeStyle = rgba([220, 200, 150], 0.5);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-1, stemBaseY - 1);
    ctx.quadraticCurveTo(-0.6, stemBaseY - 4, 0.2, stemBaseY - 6.5);
    ctx.stroke();
    // winter snow cap nub on the stem top
    if (p.snowCapAmt > 0.02) {
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * p.snowCapAmt);
      ctx.beginPath();
      ctx.ellipse(1.2, stemBaseY - 7.2, 3, 1.8, -0.2, 0, Math.PI * 2);
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

// A*(1-cos(w t))*0.5 → 0 at t=0 with zero velocity; period 2π/w. Heavy fruit →
// slow, small bob.
function bobAt(t: number, amp = 0.7, w = 1.3): number {
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

    ctx.save();
    try {
      ctx.globalAlpha = 1;
      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint drifting on the upper knobs
        const g = 0.22 + 0.28 * (0.5 + 0.5 * Math.sin(t * 2.1));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        const gy = -3 + bob + Math.sin(t * 1.0) * 1.4;
        ctx.beginPath();
        ctx.arc(-5, gy, 1.0 + g * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // soft sheen travelling DOWN across the knobs (seamless via fract)
        const prog = (t * 0.45) % 1;
        const top = JF_TOP + bob;
        const bot = JF_BOT + bob;
        const gy = lerp(top + 2, bot - 4, prog);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath();
        ctx.ellipse(-5, gy, 4.2, 2.2, -0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.beginPath();
        ctx.ellipse(2, gy + 1, 2.6, 1.6, -0.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // faint slow amber sheen pulsing on the shoulder
        const s = 0.1 + 0.14 * (0.5 + 0.5 * Math.sin(t * 0.9));
        ctx.fillStyle = `rgba(255,236,200,${s})`;
        ctx.beginPath();
        ctx.ellipse(-4, -3 + bob, 5, 3.4, -0.25, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Winter — drifting snowflakes + a faint cold sheen
        const seeds: Array<[number, number, number]> = [
          [-9, 0.0, 1.0], [6, 0.4, 0.9], [11, 0.7, 0.8], [-2, 0.25, 0.9],
        ];
        ctx.fillStyle = "#ffffff";
        seeds.forEach(([fx, phase, r]) => {
          const prog = ((t / 3.0 + phase) % 1 + 1) % 1;
          const fy = -22 + prog * 40;
          const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
          ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.arc(dx, fy, r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 0.1 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.8));
        ctx.fillStyle = "rgba(210,232,255,1)";
        ctx.beginPath();
        ctx.ellipse(-3, 0 + bob, 6.5, 4.4, -0.25, 0, Math.PI * 2);
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
