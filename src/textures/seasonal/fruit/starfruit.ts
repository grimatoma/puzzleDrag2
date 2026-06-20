// Seasonal art for the STARFRUIT fruit tile (`tile_fruit_starfruit`).
//
// One CARAMBOLA / starfruit — an oblong fruit with 5 prominent raised
// longitudinal ridges, so its profile edges read as the points of a star.
// A small stem leaf and a constant ridged outline. The SAME ridged silhouette
// is drawn every season — only colour and dressing (frost, snow cap, pad
// blossoms / fallen leaves / snow, light tint, gloss) change. Ripeness shows
// as colour only: green (spring) → bright yellow (summer peak) → amber (autumn)
// → frosted-but-still-yellow (winter). This is enforced by a single
// parameterized `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
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
  skinLight: RGB;   // lit ridge crests of the starfruit flesh
  skinMid: RGB;     // body tone
  skinDark: RGB;    // shadowed valleys between ridges / underside
  edge: RGB;        // translucent ridge-edge tint (the star points)
  leaf: RGB;        // small stem leaf
  padGrass: RGB;    // top of the grass pad
  padDark: RGB;     // shaded pad underside
  soil: RGB;        // contact / base soil under the fruit
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  ripeness: number; // 0..1 (colour cue: green→yellow; informs edge translucency)
  gloss: number;    // 0..1 specular gloss-streak strength on the skin
  edgeBrown: number; // 0..1 ridge-edge browning (autumn over-ripe cue)
  frostAmt: number; // 0..1 cool frost dusting on the skin
  snowCapAmt: number; // 0..1 snow cap on the top ridge of the fruit
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
    skinLight: lerpRGB(a.skinLight, b.skinLight, t),
    skinMid: lerpRGB(a.skinMid, b.skinMid, t),
    skinDark: lerpRGB(a.skinDark, b.skinDark, t),
    edge: lerpRGB(a.edge, b.edge, t),
    leaf: lerpRGB(a.leaf, b.leaf, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    ripeness: lerp(a.ripeness, b.ripeness, t),
    gloss: lerp(a.gloss, b.gloss, t),
    edgeBrown: lerp(a.edgeBrown, b.edgeBrown, t),
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
    edgeBrown: clamp01(p.edgeBrown),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — unripe GREEN starfruit, crisp ridges; bright lime dewy pad + blossom.
  Spring: {
    skinLight: [186, 224, 110],
    skinMid: [126, 188, 70],
    skinDark: [78, 140, 52],
    edge: [206, 234, 138],
    leaf: [104, 168, 58],
    padGrass: [128, 206, 86],
    padDark: [72, 138, 58],
    soil: [120, 84, 48],
    outline: [50, 86, 36],
    light: [232, 244, 226],
    lightAmt: 0.16,
    ripeness: 0.2,
    gloss: 0.3,
    edgeBrown: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — PEAK: bright ripe YELLOW star, translucent edges; warm light, gloss.
  Summer: {
    skinLight: [255, 240, 120],
    skinMid: [248, 208, 52],
    skinDark: [206, 158, 30],
    edge: [255, 248, 170],
    leaf: [86, 158, 50],
    padGrass: [86, 168, 70],
    padDark: [44, 110, 48],
    soil: [126, 86, 48],
    outline: [150, 110, 24],
    light: [255, 240, 206],
    lightAmt: 0.18,
    ripeness: 0.9,
    gloss: 0.95,
    edgeBrown: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — amber-ripe star, ridge edges browning; gold/rust pad + fallen leaves.
  Autumn: {
    skinLight: [248, 206, 96],
    skinMid: [228, 162, 46],
    skinDark: [176, 112, 32],
    edge: [220, 168, 86],
    leaf: [148, 130, 56],
    padGrass: [150, 152, 86],
    padDark: [104, 96, 52],
    soil: [120, 80, 44],
    outline: [120, 78, 28],
    light: [248, 210, 150],
    lightAmt: 0.2,
    ripeness: 1.0,
    gloss: 0.45,
    edgeBrown: 0.7,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — cool blue-grey light; frost-dusted YELLOW star still visible, snow
  // cap on the top ridge; snowy pad.
  Winter: {
    skinLight: [236, 220, 132],
    skinMid: [214, 188, 76],
    skinDark: [158, 136, 64],
    edge: [228, 224, 176],
    leaf: [124, 142, 96],
    padGrass: [176, 196, 214],
    padDark: [120, 146, 172],
    soil: [128, 110, 96],
    outline: [86, 78, 56],
    light: [206, 226, 252],
    lightAmt: 0.3,
    ripeness: 0.8,
    gloss: 0.25,
    edgeBrown: 0.15,
    frostAmt: 0.7,
    snowCapAmt: 0.85,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── The single parameterized paint ───────────────────────────────────────────

// Starfruit geometry constants (the SAME ridged silhouette every season). The
// oblong fruit rests low on the pad, lying with its long axis near-upright but
// tipped slightly, so we see one full ridge crest down the front and the points
// of the star flaring at the shoulders and base. Origin-centered.
const SF_TOP = -16;    // top tip of the oblong fruit
const SF_BOT = 16;     // base resting toward the pad
const SF_HALF = 11;    // half-width across the widest ridges
const SF_MIDY = 1;     // y of the widest belly (where the star points flare)

// The five ridge crest x-offsets at the belly. The two outermost are the star
// points seen edge-on; the centre three are the front-facing crests.
const _RIDGES: number[] = [-SF_HALF, -5.4, 0, 5.4, SF_HALF];

/** Trace the oblong, ridge-scalloped starfruit body path into the current
 *  ctx path. The belly bulges where the five star points flare. */
function starfruitBodyPath(ctx: CanvasRenderingContext2D, bob: number): void {
  const t = SF_TOP + bob;
  const b = SF_BOT + bob;
  const my = SF_MIDY + bob;
  const h = SF_HALF;
  ctx.beginPath();
  // top tip (pointed, where the stem will sit)
  ctx.moveTo(0, t);
  // right shoulder out to the belly point (the right star tip flares out)
  ctx.quadraticCurveTo(h * 0.55, t + 4, h * 0.72, lerp(t, my, 0.5));
  ctx.quadraticCurveTo(h + 1.4, my - 4, h, my);
  ctx.quadraticCurveTo(h + 1.4, my + 5, h * 0.7, lerp(my, b, 0.55));
  // round the bottom-right toward the base tip
  ctx.quadraticCurveTo(h * 0.5, b - 2, b * 0 + 0, b);
  // mirror up the left side
  ctx.quadraticCurveTo(-h * 0.5, b - 2, -h * 0.7, lerp(my, b, 0.55));
  ctx.quadraticCurveTo(-h - 1.4, my + 5, -h, my);
  ctx.quadraticCurveTo(-h - 1.4, my - 4, -h * 0.72, lerp(t, my, 0.5));
  ctx.quadraticCurveTo(-h * 0.55, t + 4, 0, t);
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

    // ── Soil contact patch directly under the fruit base ────────────────────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, SF_BOT + bob + 1.5, 8, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // contact shadow of the fruit on the pad
    ctx.fillStyle = rgba(p.outline, 0.28);
    ctx.beginPath();
    ctx.ellipse(2.5, SF_BOT + bob + 2, 10, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the starfruit (SAME ridged silhouette every season) ────────
    const top = SF_TOP + bob;
    const bot = SF_BOT + bob;
    const my = SF_MIDY + bob;

    // 1) soft dark outline pass (drawn slightly fatter underneath the body)
    starfruitBodyPath(ctx, bob);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // 2) mid body fill, inset so the outline shows as a rim
    ctx.save();
    starfruitBodyPath(ctx, bob);
    ctx.clip();

    // base mid tone
    ctx.fillStyle = rgb(p.skinMid);
    ctx.fillRect(-SF_HALF - 3, top - 4, (SF_HALF + 3) * 2, bot - top + 8);

    // light from upper-left: a lit belly panel
    const litGrad = ctx.createLinearGradient(-SF_HALF, top, SF_HALF, bot);
    litGrad.addColorStop(0, rgb(p.skinLight));
    litGrad.addColorStop(0.45, rgb(p.skinMid));
    litGrad.addColorStop(1, rgb(p.skinDark));
    ctx.fillStyle = litGrad;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.ellipse(-1.5, lerp(top, bot, 0.5), SF_HALF + 1, (bot - top) * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // ── The five longitudinal ridges (the star points) ──────────────────────
    // valley grooves between the ridges run the length of the fruit (dark).
    // The two centre valleys are most visible on the front face.
    ctx.strokeStyle = rgba(p.skinDark, 0.85);
    ctx.lineWidth = 2.0;
    [-2.7, 2.7].forEach((vx) => {
      ctx.beginPath();
      ctx.moveTo(vx * 0.4, top + 3);
      ctx.quadraticCurveTo(vx, my, vx * 0.4, bot - 3);
      ctx.stroke();
    });
    // outer valleys near the side star points
    ctx.strokeStyle = rgba(p.skinDark, 0.55);
    ctx.lineWidth = 1.5;
    [-8.0, 8.0].forEach((vx) => {
      ctx.beginPath();
      ctx.moveTo(vx * 0.5, top + 5);
      ctx.quadraticCurveTo(vx, my, vx * 0.5, bot - 5);
      ctx.stroke();
    });

    // ridge crests — bright raised highlight ribs catching the light
    ctx.strokeStyle = rgba(p.skinLight, 0.7);
    ctx.lineWidth = 1.8;
    [0].forEach((cx) => {
      ctx.beginPath();
      ctx.moveTo(cx, top + 2);
      ctx.quadraticCurveTo(cx - 0.6, my, cx, bot - 2);
      ctx.stroke();
    });
    ctx.strokeStyle = rgba(p.skinLight, 0.45);
    ctx.lineWidth = 1.3;
    [-5.4, 5.4].forEach((cx) => {
      ctx.beginPath();
      ctx.moveTo(cx * 0.5, top + 4);
      ctx.quadraticCurveTo(cx, my, cx * 0.5, bot - 4);
      ctx.stroke();
    });

    // translucent star-point EDGES — the flared side ridges glow lighter, more
    // so as ripeness rises (summer peak); browning blended in for autumn.
    {
      const edgeCol = lerpRGB(p.edge, [150, 104, 48], p.edgeBrown);
      const ea = 0.3 + 0.4 * p.ripeness;
      ctx.fillStyle = rgba(edgeCol, ea);
      [[-1, my], [1, my]].forEach(([sgn]) => {
        const xx = sgn * (SF_HALF - 1);
        ctx.beginPath();
        ctx.ellipse(xx, my, 2.2, (bot - top) * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // strong vertical specular gloss streak on the front crest (gloss from P)
    if (p.gloss > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.16 + 0.6 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(-3.5, lerp(top, bot, 0.4), 1.4, (bot - top) * 0.3, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([255, 255, 255], 0.1 + 0.4 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(0.8, lerp(top, bot, 0.34), 0.9, (bot - top) * 0.22, -0.04, 0, Math.PI * 2);
      ctx.fill();
    }

    // ridge-edge browning specks (autumn over-ripe cue)
    if (p.edgeBrown > 0.02) {
      ctx.fillStyle = rgba([138, 92, 40], 0.6 * p.edgeBrown);
      const browns: Array<[number, number]> = [
        [-SF_HALF + 1, my - 6], [-SF_HALF + 1.5, my + 5], [SF_HALF - 1, my - 4],
        [SF_HALF - 1.5, my + 6], [0, bot - 4],
      ];
      browns.forEach(([bx, by]) => {
        ctx.beginPath();
        ctx.ellipse(bx, by, 1.3, 2.0, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // frost dusting (winter) — cool blue speckle on the upward skin
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.26 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(-1, lerp(top, my, 0.5), SF_HALF, (my - top) * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-7, top + 4], [-2, top + 2], [3, top + 4], [7, top + 6],
        [-5, my - 2], [5, my], [0, my - 4], [-3, my + 6], [4, my + 8],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end clip

    // 3) snow cap on the top ridge (winter) — drawn over, hugging the top tip
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(-5.5, top + 5);
      ctx.quadraticCurveTo(-3, top - 2, 0, top + 0.5);
      ctx.quadraticCurveTo(3, top - 2, 5.5, top + 5);
      ctx.quadraticCurveTo(2.5, top + 7, 0, top + 5.5);
      ctx.quadraticCurveTo(-2.5, top + 7, -5.5, top + 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(0, top + 4.6, 4.4, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Stem + small leaf at the top tip (SAME placement every season) ──────
    const stemBaseY = top + 0.5;
    // short stem nub
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(0, stemBaseY);
    ctx.quadraticCurveTo(0.6, stemBaseY - 3.5, 2.2, stemBaseY - 5);
    ctx.stroke();
    ctx.strokeStyle = rgb(p.leaf);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, stemBaseY);
    ctx.quadraticCurveTo(0.6, stemBaseY - 3.5, 2.2, stemBaseY - 5);
    ctx.stroke();

    // small stem leaf flaring up-right from the tip
    ctx.fillStyle = rgb(p.leaf);
    ctx.beginPath();
    ctx.moveTo(2.0, stemBaseY - 4.5);
    ctx.quadraticCurveTo(7.5, stemBaseY - 9, 9.5, stemBaseY - 4.5);
    ctx.quadraticCurveTo(6, stemBaseY - 3.5, 2.0, stemBaseY - 4.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 0.9;
    ctx.stroke();
    // leaf midrib highlight
    ctx.strokeStyle = rgba(p.skinLight, 0.45);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(2.6, stemBaseY - 4.6);
    ctx.quadraticCurveTo(6, stemBaseY - 6, 9, stemBaseY - 4.8);
    ctx.stroke();

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
    // Per-season additive micro-motion. The subject bob itself is 0 at t=0;
    // micro-motion is additive sparkle/sheen and the small leaf flutter.
    paint(ctx, SP[season], bob);

    ctx.save();
    try {
      ctx.globalAlpha = 1;

      // Leaf flutter — gentle, in every season, layered over the tip. The leaf
      // sits at the top tip; a small wobble rotates it about the stem base.
      {
        const top = SF_TOP + bob;
        const stemBaseY = top + 0.5;
        const flut = Math.sin(t * 3.1) * 0.12 + Math.sin(t * 1.7) * 0.05;
        ctx.save();
        ctx.translate(2.0, stemBaseY - 4.5);
        ctx.rotate(flut);
        ctx.fillStyle = rgb(SP[season].leaf);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(5.5, -4.5, 7.5, 0);
        ctx.quadraticCurveTo(4, 1, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = rgb(SP[season].outline);
        ctx.lineWidth = 0.9;
        ctx.stroke();
        ctx.restore();
      }

      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint that travels gently on the skin
        const g = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        const gy = -2 + bob + Math.sin(t * 1.1) * 1.6;
        ctx.beginPath();
        ctx.arc(-4, gy, 1.1 + g * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // bright glint travels DOWN a front ridge (seamless via fract)
        const prog = (t * 0.5) % 1;
        const top = SF_TOP + bob;
        const bot = SF_BOT + bob;
        const gy = lerp(top + 2, bot - 2, prog);
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.ellipse(0, gy, 1.4, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.beginPath();
        ctx.ellipse(-3.5, gy * 0.97, 0.9, 1.9, -0.05, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // faint slow amber sheen pulsing on the belly
        const s = 0.12 + 0.16 * (0.5 + 0.5 * Math.sin(t * 0.9));
        ctx.fillStyle = `rgba(255,228,170,${s})`;
        ctx.beginPath();
        ctx.ellipse(-3, 0 + bob, 4.5, 5.5, -0.15, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Winter — drifting snowflakes + cold sheen
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
        ctx.globalAlpha = 0.12 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.8));
        ctx.fillStyle = "rgba(210,232,255,1)";
        ctx.beginPath();
        ctx.ellipse(-2, 0 + bob, 5, 6, -0.15, 0, Math.PI * 2);
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
