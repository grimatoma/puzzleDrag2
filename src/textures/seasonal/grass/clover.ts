// Seasonal art for the CLOVER grass tile (engine key `tile_bird_clover`).
//
// Source/grep token: grass/clover
//
// A low rounded MOUND of trefoil clover leaves (each leaf = three rounded
// heart-shaped leaflets with a pale chevron mark) filling the ground pad, with
// a few white-pink puff/pom blossoms on short stems poking up. The mound
// SILHOUETTE is IDENTICAL every season — only colours and the small dressing
// amounts (bloom, frost, snow, fallen leaves, light wash) change. Although the
// category is Grass, this is a LOW mound, not tall blades.
//
// Enforced by a single parameterized `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
//
// Palette lock: a green trefoil clover mound with white-pink puff blossoms.
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
  leafLight: RGB;   // lit upper face of the clover leaflets
  leafMid: RGB;     // body tone of the leaflets
  leafDark: RGB;    // shadowed underside / mound base
  chevron: RGB;     // pale chevron mark on each leaflet
  stem: RGB;        // short blossom stems
  bloomPetal: RGB;  // puff blossom petals (white-pink)
  bloomCore: RGB;   // puff blossom centre
  padGrass: RGB;    // top of the grass pad
  padDark: RGB;     // shaded pad underside
  soil: RGB;        // contact / base soil under the mound
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  vitality: number; // 0..1 leaf freshness cue (reserved colour cue)
  edgeBrown: number; // 0..1 browning at the leaflet edges (autumn)
  flatten: number;  // 0..1 winter flattening of the mound
  frostAmt: number; // 0..1 cool frost dusting on the leaves
  snowCapAmt: number; // 0..1 snow dusting on the upward leaves
  padSnowAmt: number; // 0..1 snow blanket on the pad
  bloomAmt: number; // 0..1 how many / how open the puff blossoms are
  blossomAmt: number; // 0..1 tiny pad blossoms resting on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen clover leaves on the pad (autumn)
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
    leafLight: lerpRGB(a.leafLight, b.leafLight, t),
    leafMid: lerpRGB(a.leafMid, b.leafMid, t),
    leafDark: lerpRGB(a.leafDark, b.leafDark, t),
    chevron: lerpRGB(a.chevron, b.chevron, t),
    stem: lerpRGB(a.stem, b.stem, t),
    bloomPetal: lerpRGB(a.bloomPetal, b.bloomPetal, t),
    bloomCore: lerpRGB(a.bloomCore, b.bloomCore, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    vitality: lerp(a.vitality, b.vitality, t),
    edgeBrown: lerp(a.edgeBrown, b.edgeBrown, t),
    flatten: lerp(a.flatten, b.flatten, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    bloomAmt: lerp(a.bloomAmt, b.bloomAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
  };
}

function clampP(p: P): P {
  return {
    ...p,
    lightAmt: clamp01(p.lightAmt),
    vitality: clamp01(p.vitality),
    edgeBrown: clamp01(p.edgeBrown),
    flatten: clamp01(p.flatten),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    bloomAmt: clamp01(p.bloomAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — vivid fresh green trefoil leaves + fresh white-pink puffs; dewy
  // lime pad, cool-bright light, pad blossoms resting on the turf.
  Spring: {
    leafLight: [150, 214, 96],
    leafMid: [96, 178, 64],
    leafDark: [54, 120, 46],
    chevron: [206, 240, 168],
    stem: [108, 168, 60],
    bloomPetal: [255, 246, 250],
    bloomCore: [255, 224, 236],
    padGrass: [132, 210, 88],
    padDark: [74, 142, 60],
    soil: [120, 84, 48],
    outline: [40, 66, 32],
    light: [232, 246, 226],
    lightAmt: 0.16,
    vitality: 0.85,
    edgeBrown: 0,
    flatten: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    bloomAmt: 0.7,
    blossomAmt: 0.8,
    fallenLeafAmt: 0,
  },
  // Summer — lush full green mound in FULL bloom (PEAK, most blossoms); richest
  // saturated palette, mid-green pad, warm strong light.
  Summer: {
    leafLight: [126, 206, 74],
    leafMid: [70, 162, 52],
    leafDark: [34, 100, 36],
    chevron: [188, 232, 150],
    stem: [82, 152, 50],
    bloomPetal: [255, 250, 252],
    bloomCore: [255, 206, 224],
    padGrass: [86, 172, 70],
    padDark: [44, 112, 48],
    soil: [126, 86, 48],
    outline: [26, 70, 28],
    light: [255, 242, 208],
    lightAmt: 0.18,
    vitality: 1.0,
    edgeBrown: 0,
    flatten: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    bloomAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — leaves browning at the edges, blossoms gone brown / to seed;
  // olive-tan pad with a couple of fallen leaves, low amber light.
  Autumn: {
    leafLight: [168, 178, 86],
    leafMid: [120, 134, 56],
    leafDark: [80, 86, 40],
    chevron: [206, 196, 132],
    stem: [134, 120, 56],
    bloomPetal: [206, 178, 132],
    bloomCore: [158, 122, 70],
    padGrass: [156, 152, 88],
    padDark: [106, 96, 52],
    soil: [120, 80, 44],
    outline: [62, 52, 26],
    light: [248, 210, 150],
    lightAmt: 0.2,
    vitality: 0.45,
    edgeBrown: 0.85,
    flatten: 0.15,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    bloomAmt: 0.45,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — mound flattened and frosted, a snow dusting over the leaves,
  // green-grey still visible underneath; snowy pad, cool blue-grey light.
  Winter: {
    leafLight: [120, 156, 122],
    leafMid: [84, 118, 92],
    leafDark: [54, 82, 66],
    chevron: [186, 206, 196],
    stem: [108, 124, 102],
    bloomPetal: [222, 230, 238],
    bloomCore: [196, 206, 218],
    padGrass: [178, 198, 216],
    padDark: [120, 146, 172],
    soil: [128, 110, 96],
    outline: [52, 60, 60],
    light: [206, 226, 252],
    lightAmt: 0.3,
    vitality: 0.3,
    edgeBrown: 0.2,
    flatten: 0.7,
    frostAmt: 0.7,
    snowCapAmt: 0.85,
    padSnowAmt: 0.9,
    bloomAmt: 0.3,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Mound geometry (the SAME silhouette every season) ────────────────────────
// A low rounded dome of clover sitting on the pad. Origin-centered. `flatten`
// only squashes the dome vertically (winter); the OUTLINE shape is otherwise
// constant so transitions never snap the silhouette.

const MOUND_BASE_Y = 15.5;   // where the mound contacts the pad
const MOUND_HALF = 16.5;     // half-width of the mound
const MOUND_TOP_Y = -7;      // crown of the dome at full height

function moundTopY(flatten: number): number {
  // flatten squashes the dome toward the base (never below it).
  return lerp(MOUND_TOP_Y, MOUND_BASE_Y - 6, clamp01(flatten));
}

/** Trace the rounded mound dome path. */
function moundPath(ctx: CanvasRenderingContext2D, bob: number, flatten: number): void {
  const top = moundTopY(flatten) + bob;
  const base = MOUND_BASE_Y + bob;
  const h = MOUND_HALF;
  ctx.beginPath();
  ctx.moveTo(-h, base);
  ctx.quadraticCurveTo(-h, top + 3, -h * 0.5, top + 0.5);
  ctx.quadraticCurveTo(0, top - 2.5, h * 0.5, top + 0.5);
  ctx.quadraticCurveTo(h, top + 3, h, base);
  ctx.quadraticCurveTo(h * 0.5, base + 3, 0, base + 2.6);
  ctx.quadraticCurveTo(-h * 0.5, base + 3, -h, base);
  ctx.closePath();
}

// Trefoil leaf placements across the mound surface: [cx, cy, scale, rot].
// Constant layout every season; colour/dressing varies via P.
const LEAVES: Array<[number, number, number, number]> = [
  [-11, 8, 0.95, -0.35],
  [-6, 0, 1.05, -0.15],
  [0, -3.5, 1.1, 0.0],
  [6, 0, 1.05, 0.15],
  [11, 8, 0.95, 0.35],
  [-9, 13, 0.8, -0.5],
  [9, 13, 0.8, 0.5],
  [0, 9, 0.9, 0.0],
];

// Puff blossom placements on short stems: [baseX, baseY, stemTopX, stemTopY].
const BLOOMS: Array<[number, number, number, number]> = [
  [-7, 2, -8.5, -11],
  [4, -1, 6, -13.5],
  [10, 6, 12.5, -4],
];

// Pad blossom (spring) spots resting ON the pad.
const PAD_BLOSSOMS: Array<[number, number]> = [[-13, 19], [12, 18.4], [-3, 21]];

/** Draw one trefoil clover leaf (three rounded heart-shaped leaflets with a
 *  pale chevron). Origin at the leaf centre; caller has translated/rotated. */
function trefoil(ctx: CanvasRenderingContext2D, p: P, s: number): void {
  // three leaflets at 120° apart, the trio fanning slightly upward
  const angles = [-Math.PI / 2 - 0.7, -Math.PI / 2 + 0.7, Math.PI / 2 + 0.05];
  angles.forEach((ang, idx) => {
    const dist = 2.6 * s;
    const lx = Math.cos(ang) * dist;
    const ly = Math.sin(ang) * dist;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(ang + Math.PI / 2);
    // heart-shaped leaflet: two lobes with a small notch at the outer tip
    const w = 2.6 * s;
    const hgt = 3.2 * s;
    ctx.beginPath();
    ctx.moveTo(0, hgt * 0.55); // stem end (toward centre)
    ctx.quadraticCurveTo(-w, hgt * 0.1, -w * 0.85, -hgt * 0.7);
    ctx.quadraticCurveTo(-w * 0.4, -hgt, 0, -hgt * 0.55); // notch dip
    ctx.quadraticCurveTo(w * 0.4, -hgt, w * 0.85, -hgt * 0.7);
    ctx.quadraticCurveTo(w, hgt * 0.1, 0, hgt * 0.55);
    ctx.closePath();
    // dark-then-light: leaflet body, then a lit upper face
    ctx.fillStyle = rgb(p.leafMid);
    ctx.fill();
    // browning at the edges (autumn) — a warm rim drawn just inside the edge
    if (p.edgeBrown > 0.02) {
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = rgba([150, 110, 50], 0.6 * p.edgeBrown);
      ctx.lineWidth = 1.4 * s;
      ctx.beginPath();
      ctx.moveTo(0, hgt * 0.55);
      ctx.quadraticCurveTo(-w, hgt * 0.1, -w * 0.85, -hgt * 0.7);
      ctx.quadraticCurveTo(-w * 0.4, -hgt, 0, -hgt * 0.55);
      ctx.quadraticCurveTo(w * 0.4, -hgt, w * 0.85, -hgt * 0.7);
      ctx.quadraticCurveTo(w, hgt * 0.1, 0, hgt * 0.55);
      ctx.stroke();
      ctx.restore();
    }
    // lit upper-left lobe
    ctx.fillStyle = rgba(p.leafLight, 0.85);
    ctx.beginPath();
    ctx.ellipse(-w * 0.25, -hgt * 0.3, w * 0.5, hgt * 0.42, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // pale chevron mark (the classic clover band) — a soft V across the leaflet
    ctx.strokeStyle = rgba(p.chevron, 0.85 * (idx === 2 ? 0.85 : 1));
    ctx.lineWidth = 0.9 * s;
    ctx.beginPath();
    ctx.moveTo(-w * 0.5, hgt * 0.05);
    ctx.lineTo(0, -hgt * 0.18);
    ctx.lineTo(w * 0.5, hgt * 0.05);
    ctx.stroke();
    // crisp outline
    ctx.strokeStyle = rgba(p.outline, 0.7);
    ctx.lineWidth = 0.7 * s;
    ctx.beginPath();
    ctx.moveTo(0, hgt * 0.55);
    ctx.quadraticCurveTo(-w, hgt * 0.1, -w * 0.85, -hgt * 0.7);
    ctx.quadraticCurveTo(-w * 0.4, -hgt, 0, -hgt * 0.55);
    ctx.quadraticCurveTo(w * 0.4, -hgt, w * 0.85, -hgt * 0.7);
    ctx.quadraticCurveTo(w, hgt * 0.1, 0, hgt * 0.55);
    ctx.stroke();
    ctx.restore();
  });
}

/** Draw one puff/pom blossom on its short stem. `open` 0..1 scales the puff. */
function puffBloom(
  ctx: CanvasRenderingContext2D,
  p: P,
  baseX: number,
  baseY: number,
  topX: number,
  topY: number,
  open: number,
  sway: number,
): void {
  const o = clamp01(open);
  if (o < 0.03) return;
  const tx = topX + sway;
  // short stem
  ctx.strokeStyle = rgb(p.stem);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo((baseX + tx) / 2 + sway * 0.4, (baseY + topY) / 2, tx, topY + 1.5);
  ctx.stroke();
  // puff: a cluster of small petal florets forming a round pom
  const r = 3.4 * (0.55 + 0.45 * o);
  // soft outline halo
  ctx.fillStyle = rgba(p.outline, 0.45);
  ctx.beginPath();
  ctx.arc(tx, topY, r + 0.8, 0, Math.PI * 2);
  ctx.fill();
  // petal florets around the rim (white-pink)
  const n = 9;
  for (let k = 0; k < n; k++) {
    const ang = (k / n) * Math.PI * 2 + 0.2;
    const px = tx + Math.cos(ang) * r * 0.78;
    const py = topY + Math.sin(ang) * r * 0.78;
    ctx.fillStyle = rgb(k % 2 === 0 ? p.bloomPetal : p.bloomCore);
    ctx.beginPath();
    ctx.ellipse(px, py, r * 0.42, r * 0.3, ang, 0, Math.PI * 2);
    ctx.fill();
  }
  // bright core + highlight
  ctx.fillStyle = rgb(p.bloomCore);
  ctx.beginPath();
  ctx.arc(tx, topY, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([255, 255, 255], 0.5 * o);
  ctx.beginPath();
  ctx.arc(tx - r * 0.3, topY - r * 0.3, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

// ── The single parameterized paint ───────────────────────────────────────────

/** The whole tile from ONLY `p` and `bob`. */
function paint(ctx: CanvasRenderingContext2D, raw: P, bob: number): void {
  const p = clampP(raw);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Pad: low flat grass ellipse, x∈[−18,+18], centre y≈+19 ──────────────
    // soft contact shadow lower-right
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

    // tiny pad blossoms (spring)
    if (p.blossomAmt > 0.01) {
      const a = p.blossomAmt;
      PAD_BLOSSOMS.forEach(([bx, by], idx) => {
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

    // fallen clover leaves on the pad (autumn)
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const fallen: Array<[number, number, number, RGB]> = [
        [-12, 19.6, -0.5, [168, 134, 64]],
        [12, 18.6, 0.7, [148, 96, 44]],
      ];
      fallen.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.scale(0.7, 0.7);
        ctx.globalAlpha = a;
        trefoil(ctx, { ...p, leafMid: col, leafLight: col, edgeBrown: 1 }, 0.85);
        ctx.restore();
      });
      ctx.globalAlpha = 1;
    }

    // ── Soil contact patch directly under the mound base ────────────────────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, MOUND_BASE_Y + bob + 2.5, 12, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // contact shadow of the mound on the pad
    ctx.fillStyle = rgba(p.outline, 0.28);
    ctx.beginPath();
    ctx.ellipse(2.5, MOUND_BASE_Y + bob + 3, 14, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the clover mound (SAME silhouette every season) ────────────
    // 1) soft dark outline pass — the dome drawn as the outline tint first
    moundPath(ctx, bob, p.flatten);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // 2) mound body, clipped so the outline reads as a rim
    ctx.save();
    moundPath(ctx, bob, p.flatten);
    ctx.clip();

    const top = moundTopY(p.flatten) + bob;
    const base = MOUND_BASE_Y + bob;

    // base dark fill for depth
    ctx.fillStyle = rgb(p.leafDark);
    ctx.fillRect(-MOUND_HALF - 2, top - 6, (MOUND_HALF + 2) * 2, base - top + 12);
    // lit dome gradient (upper-left light)
    const dome = ctx.createRadialGradient(-6, top + 2, 2, -2, lerp(top, base, 0.4), 24);
    dome.addColorStop(0, rgb(p.leafLight));
    dome.addColorStop(0.5, rgb(p.leafMid));
    dome.addColorStop(1, rgb(p.leafDark));
    ctx.fillStyle = dome;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.ellipse(0, lerp(top, base, 0.45), MOUND_HALF + 1, (base - top) * 0.7 + 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // trefoil clover leaves carpeting the mound surface (constant layout)
    LEAVES.forEach(([cx, cy, sc, rot]) => {
      ctx.save();
      // map leaf onto the (possibly flattened) dome: lift toward crown a touch
      const ly = lerp(cy, cy * 0.4 + 4, clamp01(p.flatten));
      ctx.translate(cx, top + ly + 0.5);
      ctx.rotate(rot);
      trefoil(ctx, p, sc * lerp(1, 0.86, clamp01(p.flatten)));
      ctx.restore();
    });

    // frost dusting (winter) — cool blue speckle over the upper leaves
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.22 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(0, lerp(top, base, 0.35), MOUND_HALF, (base - top) * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-10, top + 4], [-4, top + 2], [3, top + 3], [9, top + 5],
        [-7, lerp(top, base, 0.4)], [6, lerp(top, base, 0.45)], [0, lerp(top, base, 0.3)],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end mound clip

    // 3) snow dusting on the upward leaves (winter) — soft caps over the crown
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.9 * a);
      ctx.beginPath();
      ctx.moveTo(-MOUND_HALF * 0.7, top + 4);
      ctx.quadraticCurveTo(-6, top - 2, 0, top - 1);
      ctx.quadraticCurveTo(6, top - 2, MOUND_HALF * 0.7, top + 4);
      ctx.quadraticCurveTo(MOUND_HALF * 0.4, top + 6.5, 0, top + 5);
      ctx.quadraticCurveTo(-MOUND_HALF * 0.4, top + 6.5, -MOUND_HALF * 0.7, top + 4);
      ctx.closePath();
      ctx.fill();
      // a few soft snow puffs settled among the leaves
      ctx.fillStyle = rgba([235, 244, 255], 0.7 * a);
      [[-8, top + 6], [5, top + 7], [-2, top + 9], [10, top + 8]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.ellipse(sx, sy, 2.4, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // ── Puff blossoms poking up on short stems (drawn over the mound) ────────
    BLOOMS.forEach(([bx, by, tx, ty], i) => {
      const open = p.bloomAmt * (i === 2 ? 0.85 : 1);
      puffBloom(ctx, p, bx, MOUND_BASE_Y + by * 0 + by + bob, tx, ty + bob, open, 0);
    });

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

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    // Subject bob itself is 0 at t=0; season micro-motion is additive dressing.
    paint(ctx, SP[season], bob);

    ctx.save();
    try {
      ctx.globalAlpha = 1;
      const p = clampP(SP[season]);
      const top = moundTopY(p.flatten) + bob;

      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint travelling gently over the leaves
        const g = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.2));
        const gy = top + 6 + bob + Math.sin(t * 1.1) * 1.4;
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        ctx.beginPath();
        ctx.arc(-5, gy, 1.1 + g * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // soft shimmer over the mound + a blossom nods (the right-hand puff)
        const s = 0.1 + 0.14 * (0.5 + 0.5 * Math.sin(t * 1.3));
        ctx.fillStyle = `rgba(255,255,236,${s})`;
        ctx.beginPath();
        ctx.ellipse(-3, top + 7, 7, 4.5, -0.2, 0, Math.PI * 2);
        ctx.fill();
        // nodding blossom — redraw one puff with a small sway, over the static one
        const sway = Math.sin(t * 1.6) * 1.6;
        puffBloom(ctx, p, 4, -1 + bob, 6, -13.5 + bob, p.bloomAmt, sway);
      } else if (season === "Autumn") {
        // a browning leaf flutters down across the mound, seamless loop
        const prog = (t / 3.0) % 1;
        const fx = 8 - prog * 14 + Math.sin(prog * Math.PI * 2) * 3;
        const fy = top - 4 + prog * 22;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(prog * Math.PI * 2);
        ctx.globalAlpha = 0.5 + 0.45 * Math.sin(prog * Math.PI);
        ctx.scale(0.6, 0.6);
        trefoil(ctx, { ...p, leafMid: [158, 116, 52], leafLight: [188, 150, 80], edgeBrown: 1 }, 0.8);
        ctx.restore();
        ctx.globalAlpha = 1;
      } else {
        // Winter — drifting snowflakes + a faint cold sheen over the frost
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
        ctx.ellipse(-3, top + 6 + bob, 8, 4.5, -0.2, 0, Math.PI * 2);
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
