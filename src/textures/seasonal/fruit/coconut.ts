// Seasonal art for the COCONUT fruit tile (`tile_fruit_coconut`).
//
// One round coconut with a fibrous husk (the three dark "eyes" / face on the
// front) and a small green sprout-tuft on top, resting low-centre on a grassy
// pad. The SAME round silhouette + face + tuft is drawn EVERY season — only
// colour and dressing (frost, snow cap, pad blossoms / fallen leaves / snow,
// light tint, sheen) change. This is enforced by a single parameterized
// `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
//
// PALETTE LOCK: the coconut stays BROWN (fibrous husk) with a GREEN sprout-tuft
// all year. Ripeness is shown ONLY as husk colour green→brown (young green
// coconut in spring → full ripe brown in autumn); it is never a different
// object, never hollowed out, never swapped.
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
  huskLight: RGB;   // lit upper-left face of the fibrous husk
  huskMid: RGB;     // body tone of the husk
  huskDark: RGB;    // shadowed lower-right of the husk
  fibre: RGB;       // hair-fibre streaks combed over the husk
  eye: RGB;         // the three dark "eyes" on the face
  tuftLight: RGB;   // lit green sprout-tuft
  tuftDark: RGB;    // shaded sprout-tuft
  padGrass: RGB;    // top of the grass pad
  padDark: RGB;     // shaded pad underside
  soil: RGB;        // contact / base soil under the coconut
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  ripeness: number; // 0..1 green→brown husk (informs fibre/face contrast only)
  gloss: number;    // 0..1 specular sheen on the husk
  frostAmt: number; // 0..1 cool frost dusting on the husk
  snowCapAmt: number; // 0..1 snow cap on the crown of the coconut
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
    huskLight: lerpRGB(a.huskLight, b.huskLight, t),
    huskMid: lerpRGB(a.huskMid, b.huskMid, t),
    huskDark: lerpRGB(a.huskDark, b.huskDark, t),
    fibre: lerpRGB(a.fibre, b.fibre, t),
    eye: lerpRGB(a.eye, b.eye, t),
    tuftLight: lerpRGB(a.tuftLight, b.tuftLight, t),
    tuftDark: lerpRGB(a.tuftDark, b.tuftDark, t),
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
//
// PALETTE LOCK: husk stays brown-ish (greener when young), tuft stays green.
// Spring = young green coconut (husk green-tinged); Summer = green-brown
// maturing husk at PEAK saturation; Autumn = full ripe brown fibrous coconut;
// Winter = brown coconut clearly visible under a snow cap + frost.

const SP: Record<SeasonName, P> = {
  // Spring — young green coconut: husk still green-tinged, dewy lime pad + blossom.
  Spring: {
    huskLight: [156, 178, 102],
    huskMid: [118, 142, 70],
    huskDark: [80, 100, 46],
    fibre: [96, 116, 56],
    eye: [70, 70, 40],
    tuftLight: [150, 216, 96],
    tuftDark: [76, 144, 54],
    padGrass: [128, 206, 86],
    padDark: [72, 138, 58],
    soil: [120, 84, 48],
    outline: [48, 56, 30],
    light: [232, 244, 226],
    lightAmt: 0.16,
    ripeness: 0.18,
    gloss: 0.2,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — maturing green-brown husk at PEAK saturation; mid-green pad, soft sheen.
  Summer: {
    huskLight: [186, 150, 86],
    huskMid: [150, 110, 58],
    huskDark: [104, 70, 36],
    fibre: [122, 86, 44],
    eye: [58, 40, 24],
    tuftLight: [140, 210, 78],
    tuftDark: [64, 138, 46],
    padGrass: [86, 168, 70],
    padDark: [44, 110, 48],
    soil: [126, 86, 48],
    outline: [62, 40, 22],
    light: [255, 240, 206],
    lightAmt: 0.18,
    ripeness: 0.6,
    gloss: 0.85,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — full ripe brown fibrous coconut; olive-tan pad, fallen leaves.
  Autumn: {
    huskLight: [168, 122, 70],
    huskMid: [128, 84, 44],
    huskDark: [86, 52, 28],
    fibre: [104, 64, 32],
    eye: [50, 32, 20],
    tuftLight: [150, 150, 80],
    tuftDark: [104, 110, 52],
    padGrass: [150, 152, 86],
    padDark: [104, 96, 52],
    soil: [120, 80, 44],
    outline: [56, 34, 20],
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
  // Winter — cool blue-grey light; brown coconut CLEARLY visible under snow cap + frost.
  Winter: {
    huskLight: [156, 118, 80],
    huskMid: [120, 86, 56],
    huskDark: [82, 56, 38],
    fibre: [104, 74, 48],
    eye: [54, 38, 28],
    tuftLight: [128, 168, 120],
    tuftDark: [82, 124, 80],
    padGrass: [176, 196, 214],
    padDark: [120, 146, 172],
    soil: [128, 110, 96],
    outline: [52, 40, 34],
    light: [206, 226, 252],
    lightAmt: 0.3,
    ripeness: 0.9,
    gloss: 0.25,
    frostAmt: 0.7,
    snowCapAmt: 0.85,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── The single parameterized paint ───────────────────────────────────────────

// Coconut geometry constants (the SAME silhouette every season). A round body
// resting low-centre on the pad. Origin-centered. The crown (top) sits a touch
// left of centre; the tuft rises from there.
const COCO_CX = 0; // body centre x
const COCO_CY = 7; // body centre y (low on the pad)
const COCO_RX = 13.5; // body half-width
const COCO_RY = 14; // body half-height
const TUFT_X = -2; // tuft sprouts a touch left of crown
const TUFT_Y = COCO_CY - COCO_RY; // crown top

// The three husk "eyes" forming the face, slightly above body centre.
const EYES: Array<[number, number, number]> = [
  [-4.4, COCO_CY - 2.4, 1.7],
  [4.2, COCO_CY - 2.6, 1.7],
  [-0.2, COCO_CY + 1.6, 1.9],
];

/** Trace the round coconut body path into the current ctx path. */
function coconutBodyPath(ctx: CanvasRenderingContext2D, bob: number): void {
  ctx.beginPath();
  ctx.ellipse(COCO_CX, COCO_CY + bob, COCO_RX, COCO_RY, 0, 0, Math.PI * 2);
  ctx.closePath();
}

/** Draw the small green sprout-tuft rising from the crown. `sway` shifts the
 *  tips horizontally for idle motion (0 = rest pose). */
function drawTuft(ctx: CanvasRenderingContext2D, p: P, bob: number, sway: number): void {
  const baseX = COCO_CX + TUFT_X;
  const baseY = TUFT_Y + bob + 1.5;
  // a few short blades fanning up from the crown
  const blades: Array<[number, number]> = [
    [-3.6, -7.5],
    [-1.2, -10.5],
    [1.4, -9.5],
    [3.6, -6.5],
  ];
  blades.forEach(([dx, dy], i) => {
    const tipX = baseX + dx + sway * (0.6 + i * 0.18);
    const tipY = baseY + dy;
    // dark base pass
    ctx.strokeStyle = rgb(p.tuftDark);
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(baseX + dx * 0.3, baseY);
    ctx.quadraticCurveTo(baseX + dx * 0.8 + sway * 0.4, baseY + dy * 0.5, tipX, tipY);
    ctx.stroke();
    // bright fresh blade
    ctx.strokeStyle = rgb(p.tuftLight);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(baseX + dx * 0.3, baseY);
    ctx.quadraticCurveTo(baseX + dx * 0.8 + sway * 0.4, baseY + dy * 0.5, tipX, tipY);
    ctx.stroke();
  });
  ctx.lineCap = "butt";
  // a small green nub where the tuft meets the husk crown
  ctx.fillStyle = rgb(p.tuftDark);
  ctx.beginPath();
  ctx.ellipse(baseX, baseY + 0.4, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** The whole tile from ONLY `p` and `bob` (plus an idle `tuftSway`). */
function paint(ctx: CanvasRenderingContext2D, raw: P, bob: number, tuftSway = 0): void {
  const p = clampP(raw);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

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

    // ── Soil contact patch directly under the coconut base ──────────────────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, COCO_CY + COCO_RY + bob + 0.5, 9, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // contact shadow of the coconut on the pad
    ctx.fillStyle = rgba(p.outline, 0.28);
    ctx.beginPath();
    ctx.ellipse(3, COCO_CY + COCO_RY + bob + 1, 12, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the coconut (SAME round silhouette every season) ───────────
    // 1) soft dark outline pass (drawn slightly fatter, dark first then light)
    ctx.save();
    coconutBodyPath(ctx, bob);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = rgb(p.outline);
    ctx.stroke();
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();
    ctx.restore();

    // 2) husk body fill, clipped so detail stays inside the rim
    ctx.save();
    coconutBodyPath(ctx, bob);
    ctx.clip();

    const cy = COCO_CY + bob;

    // base mid tone
    ctx.fillStyle = rgb(p.huskMid);
    ctx.fillRect(COCO_CX - COCO_RX - 3, cy - COCO_RY - 3, (COCO_RX + 3) * 2, (COCO_RY + 3) * 2);

    // light from upper-left: a lit lobe on the upper-left face
    const litGrad = ctx.createRadialGradient(
      COCO_CX - 5, cy - 6, 2,
      COCO_CX - 2, cy - 1, COCO_RX + 6,
    );
    litGrad.addColorStop(0, rgb(p.huskLight));
    litGrad.addColorStop(0.5, rgb(p.huskMid));
    litGrad.addColorStop(1, rgb(p.huskDark));
    ctx.fillStyle = litGrad;
    ctx.beginPath();
    ctx.ellipse(COCO_CX, cy, COCO_RX, COCO_RY, 0, 0, Math.PI * 2);
    ctx.fill();

    // lower-right shadow lobe to round the body
    ctx.fillStyle = rgba(p.huskDark, 0.55);
    ctx.beginPath();
    ctx.ellipse(COCO_CX + 4, cy + 4, COCO_RX * 0.82, COCO_RY * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();

    // fibrous husk hairs — short combed strokes following the round surface
    ctx.lineCap = "round";
    for (let i = 0; i < 34; i++) {
      // deterministic pseudo-scatter over the body
      const ang = (i * 2.39996) % (Math.PI * 2);
      const rad = ((i * 0.61803) % 1) * 0.86 + 0.06;
      const sx = COCO_CX + Math.cos(ang) * COCO_RX * rad;
      const sy = cy + Math.sin(ang) * COCO_RY * rad;
      // streak runs roughly downward (combed husk), darker on the right
      const dir = sx < COCO_CX ? -1 : 1;
      ctx.strokeStyle = rgba(p.fibre, 0.5 + 0.25 * (0.5 + 0.5 * Math.sin(i)));
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 1.6);
      ctx.quadraticCurveTo(sx + dir * 0.6, sy, sx + dir * 0.4, sy + 2.2);
      ctx.stroke();
    }
    // a few brighter combed highlights on the lit face
    ctx.strokeStyle = rgba(p.huskLight, 0.4);
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 10; i++) {
      const sx = COCO_CX - 6 + (i % 3) * 3 - 1;
      const sy = cy - 6 + Math.floor(i / 3) * 3;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 1.4);
      ctx.lineTo(sx - 0.6, sy + 1.8);
      ctx.stroke();
    }

    // the three husk "eyes" / face — dark recessed dots
    EYES.forEach(([ex, ey, er]) => {
      const y = ey + bob;
      // soft socket shadow
      ctx.fillStyle = rgba(p.huskDark, 0.7);
      ctx.beginPath();
      ctx.ellipse(ex, y, er + 0.8, er + 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      // dark eye
      ctx.fillStyle = rgb(p.eye);
      ctx.beginPath();
      ctx.ellipse(ex, y, er, er, 0, 0, Math.PI * 2);
      ctx.fill();
      // tiny rim highlight upper-left of each eye
      ctx.fillStyle = rgba(p.huskLight, 0.35);
      ctx.beginPath();
      ctx.arc(ex - er * 0.4, y - er * 0.4, er * 0.4, 0, Math.PI * 2);
      ctx.fill();
    });

    // specular sheen on the husk (gloss strength from P)
    if (p.gloss > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.12 + 0.4 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(COCO_CX - 5.5, cy - 6.5, 3.4, 5.2, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([255, 255, 255], 0.08 + 0.22 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(COCO_CX + 1, cy - 8, 1.6, 2.6, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // frost dusting (winter) — cool blue speckle on the upward husk
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.24 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(COCO_CX - 1, cy - 6, COCO_RX * 0.9, COCO_RY * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-8, cy - 7], [-3, cy - 9], [3, cy - 8], [8, cy - 5],
        [-6, cy - 2], [5, cy - 1], [0, cy - 4],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.lineCap = "butt";
    ctx.restore(); // end clip

    // 3) snow cap on the crown (winter) — drawn over, hugging the top rim
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      const cyTop = cy - COCO_RY;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(COCO_CX - COCO_RX * 0.7, cyTop + 5);
      ctx.quadraticCurveTo(COCO_CX - 5, cyTop - 2, COCO_CX, cyTop - 1);
      ctx.quadraticCurveTo(COCO_CX + 5, cyTop - 2, COCO_CX + COCO_RX * 0.7, cyTop + 5);
      ctx.quadraticCurveTo(COCO_CX + 7, cyTop + 8, COCO_CX + 2, cyTop + 6);
      ctx.quadraticCurveTo(COCO_CX, cyTop + 8.5, COCO_CX - 2, cyTop + 6);
      ctx.quadraticCurveTo(COCO_CX - 7, cyTop + 8, COCO_CX - COCO_RX * 0.7, cyTop + 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(COCO_CX, cyTop + 5.4, COCO_RX * 0.6, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Green sprout-tuft on top (SAME placement every season) ──────────────
    drawTuft(ctx, p, bob, tuftSway);

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
function bobAt(t: number, amp = 0.9, w = 1.4): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0, 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    // the green tuft sways gently every season (additive, subtle)
    const tuftSway = Math.sin(t * 1.7) * 1.2 + Math.sin(t * 1.7 + 1) * 0.5;
    paint(ctx, SP[season], bob, tuftSway);

    ctx.save();
    try {
      ctx.globalAlpha = 1;
      const cy = COCO_CY + bob;
      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint that drifts on the husk
        const g = 0.22 + 0.28 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        const gy = cy - 6 + Math.sin(t * 1.1) * 1.4;
        ctx.beginPath();
        ctx.arc(-5.5, gy, 1.1 + g * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // soft sheen on the husk — a slow gloss travelling the lit shoulder
        const prog = (t * 0.45) % 1;
        const gy = lerp(cy - COCO_RY + 4, cy + COCO_RY - 4, prog);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.beginPath();
        ctx.ellipse(-5, gy, 1.5, 2.8, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.34)";
        ctx.beginPath();
        ctx.ellipse(0.5, gy * 0.96, 1.0, 1.9, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // faint slow sheen pulsing on the shoulder
        const s = 0.1 + 0.14 * (0.5 + 0.5 * Math.sin(t * 0.9));
        ctx.fillStyle = `rgba(255,236,200,${s})`;
        ctx.beginPath();
        ctx.ellipse(-4, cy - 5, 5, 3.6, -0.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Winter — drifting snowflakes + cold sheen
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
        ctx.globalAlpha = 0.1 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.8));
        ctx.fillStyle = "rgba(210,232,255,1)";
        ctx.beginPath();
        ctx.ellipse(-3, cy - 4, 6, 4.4, -0.2, 0, Math.PI * 2);
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
    paint(ctx, lerpP(from, to, k), 0, 0);
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
