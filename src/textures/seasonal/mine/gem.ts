// Seasonal art for the GEM mineral tile (`tile_mine_gem`).
//
// A chunky grey ROCK with a large faceted bright-BLUE crystal emerging from it
// (several sharp angular facets catching the light), sitting on a rocky/earth
// pad. The SAME silhouette is drawn every season — the gem's own colour is
// PALETTE-LOCKED bright blue and the rock stays grey; only the global light
// wash, a little spring/summer moss tint, autumn fallen leaves, and a winter
// snow cap + frost sparkle change. The mineral stays bright and clearly visible
// all year. This is enforced by a single parameterized `paint(ctx, p, bob)`:
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
  rockLight: RGB;   // lit face of the grey rock
  rockMid: RGB;     // body tone of the rock
  rockDark: RGB;    // shadowed underside / crevices of the rock
  gemLight: RGB;    // lit blue facet (PALETTE-LOCKED bright blue)
  gemMid: RGB;      // mid blue facet
  gemDark: RGB;     // shadowed blue facet
  padRock: RGB;     // top of the rocky/earth pad
  padDark: RGB;     // shaded pad underside
  soil: RGB;        // contact / base soil under the rock
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  gemSat: number;   // 0..1 saturation/brightness cue for the gem (peak = summer)
  gloss: number;    // 0..1 specular glint strength on the facets
  mossAmt: number;  // 0..1 moss/grass tint at the rock base (spring/summer)
  frostAmt: number; // 0..1 cool frost dusting on the facets
  snowCapAmt: number; // 0..1 snow cap on top of the rock
  padSnowAmt: number; // 0..1 snow blanket on the pad
  dewAmt: number;   // 0..1 dewy sheen on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves resting on the rock (autumn)
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
    rockLight: lerpRGB(a.rockLight, b.rockLight, t),
    rockMid: lerpRGB(a.rockMid, b.rockMid, t),
    rockDark: lerpRGB(a.rockDark, b.rockDark, t),
    gemLight: lerpRGB(a.gemLight, b.gemLight, t),
    gemMid: lerpRGB(a.gemMid, b.gemMid, t),
    gemDark: lerpRGB(a.gemDark, b.gemDark, t),
    padRock: lerpRGB(a.padRock, b.padRock, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    gemSat: lerp(a.gemSat, b.gemSat, t),
    gloss: lerp(a.gloss, b.gloss, t),
    mossAmt: lerp(a.mossAmt, b.mossAmt, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    dewAmt: lerp(a.dewAmt, b.dewAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
  };
}

function clampP(p: P): P {
  return {
    ...p,
    lightAmt: clamp01(p.lightAmt),
    gemSat: clamp01(p.gemSat),
    gloss: clamp01(p.gloss),
    mossAmt: clamp01(p.mossAmt),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    dewAmt: clamp01(p.dewAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────
// PALETTE LOCK: gem stays bright blue, rock stays grey in EVERY season. The
// gem*/rock* colours only shift in brightness/light, never in hue identity.

const SP: Record<SeasonName, P> = {
  // Spring — cool-bright light; fresh moss tint at the rock base; dewy pad.
  Spring: {
    rockLight: [176, 180, 188],
    rockMid: [128, 132, 142],
    rockDark: [84, 88, 98],
    gemLight: [150, 206, 255],
    gemMid: [70, 138, 240],
    gemDark: [34, 78, 176],
    padRock: [150, 150, 142],
    padDark: [96, 94, 88],
    soil: [120, 102, 78],
    outline: [42, 46, 56],
    light: [228, 240, 246],
    lightAmt: 0.15,
    gemSat: 0.78,
    gloss: 0.55,
    mossAmt: 0.55,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    dewAmt: 0.6,
    fallenLeafAmt: 0,
  },
  // Summer — richest saturated blue gem (PEAK); warm light; dry rocky pad.
  Summer: {
    rockLight: [184, 186, 190],
    rockMid: [134, 136, 140],
    rockDark: [86, 88, 94],
    gemLight: [168, 218, 255],
    gemMid: [54, 130, 252],
    gemDark: [24, 70, 198],
    padRock: [168, 158, 132],
    padDark: [110, 102, 80],
    soil: [128, 104, 74],
    outline: [40, 44, 54],
    light: [255, 242, 210],
    lightAmt: 0.17,
    gemSat: 1.0,
    gloss: 0.95,
    mossAmt: 0.32,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    dewAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — low amber light; olive-tan earthy pad; a couple fallen leaves.
  Autumn: {
    rockLight: [178, 174, 168],
    rockMid: [128, 124, 120],
    rockDark: [82, 80, 78],
    gemLight: [150, 200, 244],
    gemMid: [62, 126, 224],
    gemDark: [30, 72, 168],
    padRock: [156, 140, 96],
    padDark: [108, 94, 60],
    soil: [120, 92, 56],
    outline: [50, 42, 38],
    light: [248, 208, 146],
    lightAmt: 0.2,
    gemSat: 0.82,
    gloss: 0.45,
    mossAmt: 0.1,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    dewAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — cool blue-grey light; snow cap on the rock + frost on the facets;
  // gem still bright underneath; snowy pad.
  Winter: {
    rockLight: [170, 178, 192],
    rockMid: [120, 128, 142],
    rockDark: [78, 86, 100],
    gemLight: [156, 208, 255],
    gemMid: [66, 134, 238],
    gemDark: [30, 76, 178],
    padRock: [178, 196, 214],
    padDark: [120, 144, 170],
    soil: [126, 118, 110],
    outline: [48, 52, 66],
    light: [208, 228, 252],
    lightAmt: 0.3,
    gemSat: 0.8,
    gloss: 0.4,
    mossAmt: 0,
    frostAmt: 0.7,
    snowCapAmt: 0.9,
    padSnowAmt: 0.9,
    dewAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Geometry (the SAME silhouette every season) ──────────────────────────────
// Origin-centered. The rock is a chunky low boulder resting on the pad; the
// blue crystal rises from its top-left with sharp angular facets.

const ROCK_BASE_Y = 16; // rock contact with the pad
const ROCK_TOP_Y = 0;   // rock crown

/** Trace the chunky grey rock body path. Constant for all P. */
function rockPath(ctx: CanvasRenderingContext2D, bob: number): void {
  const b = ROCK_BASE_Y + bob;
  const t = ROCK_TOP_Y + bob;
  ctx.beginPath();
  ctx.moveTo(-15, b - 1);
  ctx.lineTo(-16, b - 6);     // lower-left shoulder
  ctx.lineTo(-12, t + 5);     // up the left face
  ctx.lineTo(-5, t + 1);      // left crown notch
  ctx.lineTo(2, t + 4);       // mid crown dip (gem sits here)
  ctx.lineTo(9, t - 1);       // right crown peak
  ctx.lineTo(15, t + 7);      // down the right face
  ctx.lineTo(16, b - 5);      // lower-right shoulder
  ctx.lineTo(13, b);          // base right
  ctx.lineTo(-12, b);         // base left
  ctx.closePath();
}

// Facet vertices of the blue crystal (a sharp angular gem rising from the rock
// crown). Defined relative to gem origin; bob added at draw time. Constant for
// all P — only colour changes per season.
const GEM_OX = -1.5;  // gem horizontal anchor on the rock crown
const GEM_OY = -2;    // gem vertical anchor

// The crystal silhouette outline (one shard cluster).
const GEM_OUTLINE: Array<[number, number]> = [
  [-6, 2],    // base-left on the rock
  [-7, -8],   // left mid edge
  [-3, -20],  // tall left tip
  [0, -10],   // inner valley
  [3, -22],   // tallest centre tip
  [6, -9],    // right valley
  [8, -14],   // right tip
  [7, 1],     // base-right
  [1, 4],     // base centre
];

function gemOutlinePath(ctx: CanvasRenderingContext2D, bob: number): void {
  ctx.beginPath();
  GEM_OUTLINE.forEach(([x, y], i) => {
    const px = GEM_OX + x;
    const py = GEM_OY + y + bob;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
}

// Internal facet triangles (light / mid / dark) for the cel-shaded crystal.
// Each is a triangle in gem-local coords with a tone selector 0=light 1=mid 2=dark.
const GEM_FACETS: Array<{ pts: Array<[number, number]>; tone: 0 | 1 | 2 }> = [
  // left tall shard — lit front face
  { pts: [[-6, 2], [-3, -20], [0, -10]], tone: 0 },
  // left tall shard — shaded right side
  { pts: [[-3, -20], [0, -10], [1, 4]], tone: 2 },
  // left base under shard
  { pts: [[-6, 2], [0, -10], [1, 4]], tone: 1 },
  // centre tallest shard — lit
  { pts: [[1, 4], [3, -22], [0, -10]], tone: 0 },
  // centre shard — mid
  { pts: [[1, 4], [3, -22], [6, -9]], tone: 1 },
  // right shard — lit upper
  { pts: [[3, -22], [6, -9], [8, -14]], tone: 0 },
  // right shard — dark side
  { pts: [[6, -9], [8, -14], [7, 1]], tone: 2 },
  // right base
  { pts: [[1, 4], [6, -9], [7, 1]], tone: 1 },
];

// Facet edge highlight lines (the bright catch-light edges between facets).
const GEM_EDGES: Array<[[number, number], [number, number]]> = [
  [[-3, -20], [0, -10]],
  [[3, -22], [0, -10]],
  [[3, -22], [6, -9]],
  [[8, -14], [6, -9]],
];

// ── The single parameterized paint ───────────────────────────────────────────

/** The whole tile from ONLY `p` and `bob`. */
function paint(ctx: CanvasRenderingContext2D, raw: P, bob: number): void {
  const p = clampP(raw);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Pad: low flat rocky/earth ellipse, x∈[−18,+18], centre y≈+19 ────────
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
    // rocky/earth top
    ctx.fillStyle = rgb(p.padRock);
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // scattered pebble specks on the pad (earthy texture, not grass blades)
    ctx.fillStyle = rgba(p.padDark, 0.55);
    const pebbles: Array<[number, number, number]> = [
      [-12, 18.4, 1.2], [-6, 20.4, 0.9], [7, 18.2, 1.1], [13, 19.8, 0.9], [1, 21, 0.8],
    ];
    pebbles.forEach(([px, py, r]) => {
      ctx.beginPath();
      ctx.ellipse(px, py, r, r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // dewy sheen on the pad (spring)
    if (p.dewAmt > 0.01) {
      ctx.fillStyle = rgba([235, 246, 252], 0.3 * p.dewAmt);
      ctx.beginPath();
      ctx.ellipse(-4, 18.4, 12, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // moss/grass tint at the rock base (spring/summer)
    if (p.mossAmt > 0.01) {
      const a = p.mossAmt;
      ctx.fillStyle = rgba([108, 168, 78], 0.5 * a);
      const moss: Array<[number, number, number]> = [
        [-13, 18, 3.4], [12, 18, 3.0], [-2, 20.4, 4.2],
      ];
      moss.forEach(([mx, my, r]) => {
        ctx.beginPath();
        ctx.ellipse(mx, my, r, r * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      // a few little grass tufts poking up at the base
      ctx.strokeStyle = rgba([86, 150, 62], 0.8 * a);
      ctx.lineWidth = 1;
      [-14, -10, 11, 14].forEach((gx, i) => {
        ctx.beginPath();
        ctx.moveTo(gx, 18.5);
        ctx.lineTo(gx + (i % 2 ? 1 : -1), 14.5);
        ctx.stroke();
      });
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

    // ── Soil contact patch directly under the rock base ─────────────────────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, ROCK_BASE_Y + bob + 1.5, 13, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // contact shadow of the rock on the pad
    ctx.fillStyle = rgba(p.outline, 0.28);
    ctx.beginPath();
    ctx.ellipse(3, ROCK_BASE_Y + bob + 2, 14, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the grey rock (SAME silhouette every season) ───────────────
    // 1) soft dark outline pass
    rockPath(ctx, bob);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // 2) rock body fill, clipped so the outline reads as a rim
    ctx.save();
    rockPath(ctx, bob);
    ctx.clip();

    const rb = ROCK_BASE_Y + bob;
    const rt = ROCK_TOP_Y + bob;

    // base mid tone
    ctx.fillStyle = rgb(p.rockMid);
    ctx.fillRect(-18, rt - 6, 36, rb - rt + 14);

    // light from upper-left: a lit panel on the left/upper rock face
    const litGrad = ctx.createLinearGradient(-14, rt - 2, 14, rb);
    litGrad.addColorStop(0, rgb(p.rockLight));
    litGrad.addColorStop(0.5, rgb(p.rockMid));
    litGrad.addColorStop(1, rgb(p.rockDark));
    ctx.fillStyle = litGrad;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.ellipse(-3, lerp(rt, rb, 0.5), 16, (rb - rt) * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // a couple of crevice cracks for rocky character (dark)
    ctx.strokeStyle = rgba(p.rockDark, 0.8);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-9, rt + 6);
    ctx.lineTo(-6, lerp(rt, rb, 0.6));
    ctx.lineTo(-9, rb - 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(11, rt + 4);
    ctx.lineTo(8, lerp(rt, rb, 0.5));
    ctx.stroke();

    // facet highlight on the lit left shoulder
    ctx.fillStyle = rgba(p.rockLight, 0.5);
    ctx.beginPath();
    ctx.moveTo(-12, rt + 6);
    ctx.lineTo(-6, rt + 2);
    ctx.lineTo(-7, lerp(rt, rb, 0.45));
    ctx.closePath();
    ctx.fill();

    // bottom shading to seat the rock
    ctx.fillStyle = rgba(p.rockDark, 0.5);
    ctx.beginPath();
    ctx.ellipse(2, rb - 1, 15, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // end rock clip

    // ── Snow cap on TOP of the rock (winter), drawn over the rock crown ──────
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(-12, rt + 5);
      ctx.quadraticCurveTo(-9, rt - 1, -5, rt + 1);
      ctx.quadraticCurveTo(-1, rt + 5, 9, rt - 1);
      ctx.quadraticCurveTo(13, rt + 2, 15, rt + 7);
      ctx.quadraticCurveTo(8, rt + 4, 2, rt + 6);
      ctx.quadraticCurveTo(-5, rt + 8, -12, rt + 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([210, 226, 244], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(-3, rt + 4, 9, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Subject: the blue crystal GEM (PALETTE-LOCKED, same silhouette) ──────
    // 1) soft dark outline pass
    gemOutlinePath(ctx, bob);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // 2) cel-shaded facets, clipped to the gem silhouette
    ctx.save();
    gemOutlinePath(ctx, bob);
    ctx.clip();

    GEM_FACETS.forEach(({ pts, tone }) => {
      const col = tone === 0 ? p.gemLight : tone === 1 ? p.gemMid : p.gemDark;
      ctx.fillStyle = rgb(col);
      ctx.beginPath();
      pts.forEach(([x, y], i) => {
        const px = GEM_OX + x;
        const py = GEM_OY + y + bob;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
    });

    // saturation/brightness cue: in peak summer push a brighter blue wash on
    // the lit facets (keeps the hue, only lifts brightness — palette stays blue)
    if (p.gemSat > 0.5) {
      ctx.fillStyle = rgba([120, 190, 255], 0.18 * (p.gemSat - 0.5) * 2);
      ctx.fillRect(GEM_OX - 8, GEM_OY - 24 + bob, 18, 30);
    }

    // bright catch-light edges between facets
    ctx.strokeStyle = rgba([220, 240, 255], 0.5 + 0.4 * p.gloss);
    ctx.lineWidth = 1;
    GEM_EDGES.forEach(([[ax, ay], [bx, by]]) => {
      ctx.beginPath();
      ctx.moveTo(GEM_OX + ax, GEM_OY + ay + bob);
      ctx.lineTo(GEM_OX + bx, GEM_OY + by + bob);
      ctx.stroke();
    });

    // a small static specular sparkle on the tallest lit facet
    if (p.gloss > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.3 + 0.5 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(GEM_OX + 1.5, GEM_OY - 16 + bob, 1.0, 2.2, -0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    // frost dusting on the facets (winter) — cool blue speckle on upward faces,
    // the gem stays clearly blue underneath (no white-out, no bloom)
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([214, 232, 250], 0.22 * p.frostAmt);
      ctx.fillRect(GEM_OX - 8, GEM_OY - 24 + bob, 18, 16);
      ctx.fillStyle = rgba([236, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-3, -18], [1, -20], [4, -16], [-1, -12], [6, -11], [-5, -9], [2, -6],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(GEM_OX + sx, GEM_OY + sy + bob, 0.6, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end gem clip

    // ── Fallen leaves resting ON the rock (autumn) ──────────────────────────
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const leaves: Array<[number, number, number, RGB]> = [
        [9, rt + 6, 0.5, [196, 120, 40]],
        [-10, rb - 4, -0.6, [176, 72, 32]],
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
function bobAt(t: number, amp = 0.7, w = 1.4): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

// Sample a point along the crystal's tallest facet edge for the travelling
// glint (0..1 maps from base toward tip). Stays inside the gem silhouette.
function glintPoint(prog: number, bob: number): [number, number] {
  const x = GEM_OX + lerp(1.5, 1.5, prog);
  const y = GEM_OY + lerp(2, -20, prog) + bob;
  return [x, y];
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    // The subject bob is 0 at t=0; micro-motion below is additive dressing.
    paint(ctx, SP[season], bob);

    ctx.save();
    try {
      ctx.globalAlpha = 1;

      // A soft specular GLINT travels across the gem facets every season
      // (subtle, no flash). Brightness scaled per season below.
      const prog = (t * 0.4) % 1;
      const [gx, gy] = glintPoint(prog, bob);
      let glintAlpha = 0.4;
      if (season === "Summer") glintAlpha = 0.85; // brightest in summer
      else if (season === "Spring") glintAlpha = 0.5;
      else if (season === "Autumn") glintAlpha = 0.4;
      else glintAlpha = 0.45; // winter cold sheen
      // fade the glint in/out along its travel so there is no hard pop
      const fade = Math.sin(prog * Math.PI);
      const glintCol = season === "Winter" ? "210,232,255" : "255,255,255";
      ctx.fillStyle = `rgba(${glintCol},${glintAlpha * fade})`;
      ctx.beginPath();
      ctx.ellipse(gx, gy, 1.2, 2.4, -0.2, 0, Math.PI * 2);
      ctx.fill();

      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint on the dewy pad
        const g = 0.2 + 0.25 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        ctx.beginPath();
        ctx.arc(-8, 18 + Math.sin(t * 1.1) * 0.6, 1.0 + g * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // a fallen leaf stirs — gentle rock of one leaf on the rock crown
        ctx.save();
        const lrx = 9, lry = ROCK_TOP_Y + bob + 6;
        ctx.translate(lrx, lry);
        ctx.rotate(0.5 + Math.sin(t * 1.3) * 0.18);
        ctx.fillStyle = "rgba(196,120,40,0.9)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.2, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(90,44,16,0.9)";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.lineTo(3, 0);
        ctx.stroke();
        ctx.restore();
      } else if (season === "Winter") {
        // a single drifting snowflake + faint cold sheen on the facets
        const flProg = (t / 3.2) % 1;
        const fy = -22 + flProg * 38;
        const fx = -2 + Math.sin(flProg * Math.PI * 2) * 3;
        ctx.globalAlpha = 0.4 + 0.45 * Math.sin(flProg * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(fx, fy, 1.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.08 + 0.08 * (0.5 + 0.5 * Math.sin(t * 0.8));
        ctx.fillStyle = "rgba(210,232,255,1)";
        ctx.beginPath();
        ctx.ellipse(GEM_OX, GEM_OY - 12 + bob, 7, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // Summer's brightest glint is already handled above by glintAlpha.
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
