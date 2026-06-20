// Seasonal art for the CHICKEN bird tile (`tile_bird_chicken`).
// Source: src/textures/seasonal/bird/chicken.ts
//
// A small plump white-and-cream hen standing on a grassy pad in front-¾, turned
// ~15–20° toward lower-left (animal framing). The SAME readable silhouette is
// drawn every season — a rounded body, a small head with a tiny red comb +
// wattle, a small orange beak, orange feet, and a short rounded tail. PALETTE
// LOCK: the hen stays white-and-cream with a RED comb in every season. Only the
// feather fluff/coat volume, the pad, the dressing (chick/blossom/leaves/snow),
// and the light wash change with the season.
//
// Enforced by a single parameterized `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The body
// bob uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
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
  featherLight: RGB; // lit white face of the plumage
  featherMid: RGB; // cream body tone
  featherDark: RGB; // shadowed underside / wing groove
  comb: RGB; // red comb + wattle (LOCKED red, only shaded)
  combDark: RGB; // shadowed comb
  beak: RGB; // orange beak + feet
  beakDark: RGB; // shadowed beak / feet
  padGrass: RGB; // top of the grass pad
  padDark: RGB; // shaded pad underside
  soil: RGB; // contact / base soil under the feet
  outline: RGB; // soft dark outline tint
  light: RGB; // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  fluff: number; // 0..1 feather volume (winter thickest, summer normal)
  sheen: number; // 0..1 soft feather sheen highlight on the back
  frostAmt: number; // 0..1 cool frost dusting on the back feathers
  snowCapAmt: number; // 0..1 snow resting on the back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad (autumn)
  chickAmt: number; // 0..1 a fluffy yellow chick beside the hen (spring)
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
    featherLight: lerpRGB(a.featherLight, b.featherLight, t),
    featherMid: lerpRGB(a.featherMid, b.featherMid, t),
    featherDark: lerpRGB(a.featherDark, b.featherDark, t),
    comb: lerpRGB(a.comb, b.comb, t),
    combDark: lerpRGB(a.combDark, b.combDark, t),
    beak: lerpRGB(a.beak, b.beak, t),
    beakDark: lerpRGB(a.beakDark, b.beakDark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    fluff: lerp(a.fluff, b.fluff, t),
    sheen: lerp(a.sheen, b.sheen, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
    chickAmt: lerp(a.chickAmt, b.chickAmt, t),
  };
}

function clampP(p: P): P {
  return {
    ...p,
    lightAmt: clamp01(p.lightAmt),
    fluff: clamp01(p.fluff),
    sheen: clamp01(p.sheen),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    chickAmt: clamp01(p.chickAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────
//
// PALETTE LOCK: featherLight/Mid/Dark stay white-and-cream and the comb stays
// red across all seasons. Only fluff, pad, light + dressing amounts move.

const SP: Record<SeasonName, P> = {
  // Spring — fresh pastel; lime dewy pad + blossom + a yellow chick beside her.
  Spring: {
    featherLight: [252, 250, 244],
    featherMid: [236, 228, 208],
    featherDark: [196, 184, 158],
    comb: [220, 60, 56],
    combDark: [158, 36, 38],
    beak: [240, 158, 52],
    beakDark: [196, 116, 30],
    padGrass: [128, 206, 86],
    padDark: [72, 138, 58],
    soil: [120, 84, 48],
    outline: [70, 58, 44],
    light: [232, 244, 226],
    lightAmt: 0.16,
    fluff: 0.4,
    sheen: 0.2,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
    chickAmt: 1.0,
  },
  // Summer — PEAK; normal full plumage; saturated mid-green pad; warm light.
  Summer: {
    featherLight: [255, 253, 248],
    featherMid: [242, 234, 214],
    featherDark: [200, 186, 156],
    comb: [228, 56, 50],
    combDark: [164, 34, 34],
    beak: [246, 162, 48],
    beakDark: [202, 118, 26],
    padGrass: [86, 168, 70],
    padDark: [44, 110, 48],
    soil: [126, 86, 48],
    outline: [66, 54, 40],
    light: [255, 240, 206],
    lightAmt: 0.18,
    fluff: 0.5,
    sheen: 0.7,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    chickAmt: 0,
  },
  // Autumn — slightly fuller feathers; olive-tan browning pad; fallen leaves.
  Autumn: {
    featherLight: [250, 246, 236],
    featherMid: [234, 222, 196],
    featherDark: [190, 174, 144],
    comb: [206, 52, 46],
    combDark: [150, 32, 34],
    beak: [232, 150, 46],
    beakDark: [188, 108, 26],
    padGrass: [150, 152, 86],
    padDark: [104, 96, 52],
    soil: [120, 80, 44],
    outline: [66, 52, 38],
    light: [248, 210, 150],
    lightAmt: 0.2,
    fluff: 0.66,
    sheen: 0.32,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
    chickAmt: 0,
  },
  // Winter — cool blue-grey light; feathers fluffed thick; snow on the back +
  // frost; snowy pad. Hen stays clearly white-and-cream underneath.
  Winter: {
    featherLight: [248, 250, 254],
    featherMid: [224, 224, 222],
    featherDark: [176, 182, 188],
    comb: [196, 56, 56],
    combDark: [140, 36, 42],
    beak: [224, 150, 60],
    beakDark: [180, 112, 40],
    padGrass: [176, 196, 214],
    padDark: [120, 146, 172],
    soil: [128, 110, 96],
    outline: [60, 56, 64],
    light: [206, 226, 252],
    lightAmt: 0.3,
    fluff: 1.0,
    sheen: 0.22,
    frostAmt: 0.7,
    snowCapAmt: 0.85,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    chickAmt: 0,
  },
};

// ── Hen geometry constants (the SAME silhouette every season) ────────────────
// Front-¾, turned ~15–20° toward lower-left: head/beak biased to the left,
// tail to the upper-right. Body sits low-centre on the pad.

const BODY_CX = -1.0; // body centre x (slightly left = turned toward lower-left)
const BODY_CY = 4.0; // body centre y
const BODY_RX = 12.5; // body half-width
const BODY_RY = 10.5; // body half-height
const HEAD_CX = -8.5; // head centre x (forward/left)
const HEAD_CY = -6.5; // head centre y (up)
const HEAD_R = 5.6; // head radius
const FOOT_Y = 16.5; // foot contact line on the pad

/** Trace the plump hen body (lower-left-turned egg shape) into the ctx path.
 *  `fluff` swells the lower belly a touch (winter puffier) but keeps the
 *  silhouette the same recognizable hen. */
function henBodyPath(ctx: CanvasRenderingContext2D, bob: number, fluff: number): void {
  const cx = BODY_CX;
  const cy = BODY_CY + bob;
  const rx = BODY_RX + fluff * 1.6;
  const ry = BODY_RY + fluff * 1.2;
  ctx.beginPath();
  // upper-left breast (toward the viewer / lower-left)
  ctx.moveTo(cx - rx, cy + 1.5);
  ctx.quadraticCurveTo(cx - rx + 1, cy - ry + 1, cx - 2, cy - ry);
  // back rising to the tail base on the upper-right
  ctx.quadraticCurveTo(cx + rx * 0.7, cy - ry - 0.5, cx + rx, cy - ry * 0.4);
  // lower-right belly
  ctx.quadraticCurveTo(cx + rx + 1.5, cy + ry * 0.5, cx + rx * 0.5, cy + ry);
  // round belly bottom
  ctx.quadraticCurveTo(cx - rx * 0.2, cy + ry + 1.5, cx - rx * 0.7, cy + ry * 0.7);
  // breast back up to start
  ctx.quadraticCurveTo(cx - rx - 1, cy + ry * 0.2, cx - rx, cy + 1.5);
  ctx.closePath();
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

    // ── Contact shadow of the hen on the pad ────────────────────────────────
    ctx.fillStyle = rgba(p.outline, 0.26);
    ctx.beginPath();
    ctx.ellipse(1.5, FOOT_Y + 1.5 + bob * 0.4, 11, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Spring chick beside the hen (drawn behind the hen's right side) ──────
    if (p.chickAmt > 0.01) drawChick(ctx, p, bob);

    // ── Legs + feet (orange) under the body ─────────────────────────────────
    const bcy = BODY_CY + bob;
    drawLegs(ctx, p, bcy);

    // ── Tail (short rounded), drawn behind the body on the upper-right ──────
    drawTail(ctx, p, bob);

    // ── Subject: the hen body (SAME silhouette every season) ────────────────
    // 1) soft dark outline pass
    ctx.lineJoin = "round";
    henBodyPath(ctx, bob, p.fluff);
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = rgb(p.outline);
    ctx.stroke();
    ctx.fillStyle = rgb(p.featherMid);
    ctx.fill();

    // 2) cel shading inside the body
    ctx.save();
    henBodyPath(ctx, bob, p.fluff);
    ctx.clip();
    // underside shadow
    ctx.fillStyle = rgb(p.featherDark);
    ctx.beginPath();
    ctx.ellipse(BODY_CX + 2, bcy + BODY_RY * 0.5, BODY_RX, BODY_RY * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    // mid body
    ctx.fillStyle = rgb(p.featherMid);
    ctx.beginPath();
    ctx.ellipse(BODY_CX, bcy + 0.5, BODY_RX * 0.92, BODY_RY * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    // lit upper-left back (light from upper-left)
    ctx.fillStyle = rgb(p.featherLight);
    ctx.beginPath();
    ctx.ellipse(BODY_CX - 3.5, bcy - 4.0, BODY_RX * 0.62, BODY_RY * 0.52, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // wing groove — a soft curved feather line dividing wing from back
    ctx.strokeStyle = rgba(p.featherDark, 0.8);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(BODY_CX - 6, bcy - 3.5);
    ctx.quadraticCurveTo(BODY_CX + 4, bcy - 1.5, BODY_CX + 8.5, bcy + 4.5);
    ctx.stroke();
    // a couple of light feather flecks on the wing for texture
    ctx.strokeStyle = rgba(p.featherLight, 0.5);
    ctx.lineWidth = 1.0;
    [[-4, 1], [0, 3], [4, 5]].forEach(([fx, fy]) => {
      ctx.beginPath();
      ctx.moveTo(BODY_CX + fx, bcy + fy);
      ctx.quadraticCurveTo(BODY_CX + fx + 2, bcy + fy + 1.5, BODY_CX + fx + 4.5, bcy + fy + 1);
      ctx.stroke();
    });

    // soft feather sheen on the back (sheen from P)
    if (p.sheen > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.1 + 0.32 * p.sheen);
      ctx.beginPath();
      ctx.ellipse(BODY_CX - 4, bcy - 5, BODY_RX * 0.5, BODY_RY * 0.32, -0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // frost dusting on the back feathers (winter)
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([220, 236, 252], 0.22 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(BODY_CX, bcy - 5.5, BODY_RX * 0.8, BODY_RY * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([240, 248, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-6, -7], [-1, -8], [3, -7], [7, -5], [-4, -4], [5, -3], [0, -5],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(BODY_CX + sx, bcy + sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.restore(); // end body clip

    // 3) snow cap on the back (winter) — drawn over, hugging the upper rim
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      const ty = bcy - BODY_RY - p.fluff * 1.2;
      ctx.fillStyle = rgba([248, 252, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(BODY_CX - 6, ty + 4);
      ctx.quadraticCurveTo(BODY_CX - 3, ty - 1, BODY_CX + 1, ty + 0.5);
      ctx.quadraticCurveTo(BODY_CX + 5, ty - 1.5, BODY_CX + 8, ty + 3);
      ctx.quadraticCurveTo(BODY_CX + 5, ty + 4.5, BODY_CX + 2, ty + 3.5);
      ctx.quadraticCurveTo(BODY_CX - 2, ty + 5, BODY_CX - 6, ty + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([208, 224, 244], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(BODY_CX + 1, ty + 4, 6, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Head + comb + wattle + beak + eye (SAME placement every season) ─────
    drawHead(ctx, p, bob);

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

// ── Sub-part helpers (all driven by p) ───────────────────────────────────────

/** Orange legs + feet under the body, turned slightly toward lower-left. */
function drawLegs(ctx: CanvasRenderingContext2D, p: P, bcy: number): void {
  const legs: Array<[number, number]> = [
    [-3.5, FOOT_Y], // front leg (toward viewer)
    [3.5, FOOT_Y - 0.5], // back leg
  ];
  legs.forEach(([lx, fy]) => {
    // leg
    ctx.strokeStyle = rgb(p.beakDark);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(lx, bcy + BODY_RY * 0.6);
    ctx.lineTo(lx - 1, fy);
    ctx.stroke();
    ctx.strokeStyle = rgb(p.beak);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(lx, bcy + BODY_RY * 0.6);
    ctx.lineTo(lx - 1, fy);
    ctx.stroke();
    // three forward toes
    ctx.strokeStyle = rgb(p.beak);
    ctx.lineWidth = 1.4;
    [-2.4, 0, 2.0].forEach((tx) => {
      ctx.beginPath();
      ctx.moveTo(lx - 1, fy);
      ctx.lineTo(lx - 1 + tx, fy + 1.8);
      ctx.stroke();
    });
  });
}

/** Short rounded tail on the upper-right, white-and-cream. */
function drawTail(ctx: CanvasRenderingContext2D, p: P, bob: number): void {
  const tx = BODY_CX + BODY_RX - 1;
  const ty = BODY_CY + bob - BODY_RY * 0.4;
  ctx.save();
  // outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.moveTo(tx - 2, ty + 2);
  ctx.quadraticCurveTo(tx + 6, ty - 7, tx + 10, ty - 8);
  ctx.quadraticCurveTo(tx + 9, ty - 2, tx + 8, ty + 2);
  ctx.quadraticCurveTo(tx + 5, ty + 5, tx - 2, ty + 2);
  ctx.closePath();
  ctx.fill();
  // fill, inset
  ctx.fillStyle = rgb(p.featherMid);
  ctx.beginPath();
  ctx.moveTo(tx - 1, ty + 1.5);
  ctx.quadraticCurveTo(tx + 5.5, ty - 6, tx + 9, ty - 7);
  ctx.quadraticCurveTo(tx + 8, ty - 2, tx + 7, ty + 1.5);
  ctx.quadraticCurveTo(tx + 4, ty + 4, tx - 1, ty + 1.5);
  ctx.closePath();
  ctx.fill();
  // light feather edge on the tail (upper-left lit)
  ctx.strokeStyle = rgba(p.featherLight, 0.6);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(tx, ty + 0.5);
  ctx.quadraticCurveTo(tx + 5.5, ty - 6, tx + 9, ty - 7);
  ctx.stroke();
  // a couple of tail-feather grooves
  ctx.strokeStyle = rgba(p.featherDark, 0.6);
  ctx.lineWidth = 0.9;
  [[2, -1], [4, -2.5]].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(tx + dx, ty + dy + 2);
    ctx.lineTo(tx + dx + 3, ty + dy - 3);
    ctx.stroke();
  });
  ctx.restore();
}

/** Head: round white head, tiny red comb + wattle, small orange beak, eye. */
function drawHead(ctx: CanvasRenderingContext2D, p: P, bob: number): void {
  const hx = HEAD_CX;
  const hy = HEAD_CY + bob;
  ctx.save();

  // neck — short, joining head to body
  ctx.strokeStyle = rgb(p.outline);
  ctx.lineWidth = 7.5;
  ctx.beginPath();
  ctx.moveTo(hx + 1.5, hy + 3);
  ctx.lineTo(BODY_CX - 5, BODY_CY + bob - 3);
  ctx.stroke();
  ctx.strokeStyle = rgb(p.featherMid);
  ctx.lineWidth = 5.6;
  ctx.beginPath();
  ctx.moveTo(hx + 1.5, hy + 3);
  ctx.lineTo(BODY_CX - 5, BODY_CY + bob - 3);
  ctx.stroke();

  // comb — three small red bumps on top of the head (drawn before head fill so
  // it tucks behind the crown a touch); LOCKED red.
  ctx.fillStyle = rgb(p.combDark);
  [-2.6, 0.2, 2.8].forEach((cx, i) => {
    ctx.beginPath();
    ctx.arc(hx + cx, hy - HEAD_R + 0.5, 2.0 - i * 0.1, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = rgb(p.comb);
  [-2.6, 0.2, 2.8].forEach((cx, i) => {
    ctx.beginPath();
    ctx.arc(hx + cx - 0.4, hy - HEAD_R - 0.1, 1.7 - i * 0.1, 0, Math.PI * 2);
    ctx.fill();
  });

  // head — round, outline then fill
  ctx.lineWidth = 2.0;
  ctx.strokeStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.arc(hx, hy, HEAD_R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = rgb(p.featherMid);
  ctx.fill();
  // head shading
  ctx.save();
  ctx.beginPath();
  ctx.arc(hx, hy, HEAD_R, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = rgb(p.featherDark);
  ctx.beginPath();
  ctx.ellipse(hx + 1.5, hy + 2.5, HEAD_R, HEAD_R * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.featherLight);
  ctx.beginPath();
  ctx.ellipse(hx - 1.8, hy - 2, HEAD_R * 0.62, HEAD_R * 0.52, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // wattle — small red drop under the beak (LOCKED red)
  ctx.fillStyle = rgb(p.combDark);
  ctx.beginPath();
  ctx.ellipse(hx - 3.2, hy + HEAD_R - 0.5, 1.6, 2.4, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.comb);
  ctx.beginPath();
  ctx.ellipse(hx - 3.5, hy + HEAD_R - 1.0, 1.2, 1.9, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // beak — small orange triangle pointing lower-left
  ctx.fillStyle = rgb(p.beakDark);
  ctx.beginPath();
  ctx.moveTo(hx - HEAD_R + 0.5, hy - 0.5);
  ctx.lineTo(hx - HEAD_R - 4.5, hy + 1.6);
  ctx.lineTo(hx - HEAD_R + 1, hy + 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgb(p.beak);
  ctx.beginPath();
  ctx.moveTo(hx - HEAD_R + 0.8, hy - 0.2);
  ctx.lineTo(hx - HEAD_R - 3.8, hy + 1.4);
  ctx.lineTo(hx - HEAD_R + 1, hy + 2.2);
  ctx.closePath();
  ctx.fill();

  // eye — small dark dot with a tiny catchlight
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.arc(hx - 1.8, hy - 0.6, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(hx - 2.3, hy - 1.1, 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Spring chick — a tiny fluffy yellow chick standing on the pad beside the
 *  hen (to her lower-right). chickAmt fades it in/out across transitions. */
function drawChick(ctx: CanvasRenderingContext2D, p: P, bob: number): void {
  const a = clamp01(p.chickAmt);
  if (a <= 0.01) return;
  const cx = 13.5;
  const cy = 12.0 + bob * 0.5;
  ctx.save();
  ctx.globalAlpha = a;
  // contact shadow
  ctx.fillStyle = rgba(p.outline, 0.22 * a);
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4.5, 4.2, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  // tiny orange legs
  ctx.strokeStyle = rgb(p.beak);
  ctx.lineWidth = 1.0;
  [-1.2, 1.2].forEach((lx) => {
    ctx.beginPath();
    ctx.moveTo(cx + lx, cy + 2.5);
    ctx.lineTo(cx + lx, cy + 4.5);
    ctx.stroke();
  });
  // body — fluffy yellow round
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = rgb(p.outline);
  ctx.fillStyle = "rgb(248,214,86)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 0.5, 3.4, 3.0, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // head
  ctx.fillStyle = "rgb(252,224,104)";
  ctx.beginPath();
  ctx.arc(cx - 2.0, cy - 2.4, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgb(p.outline);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // lit highlight
  ctx.fillStyle = "rgba(255,245,190,0.8)";
  ctx.beginPath();
  ctx.ellipse(cx - 2.8, cy - 3.2, 1.2, 0.9, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // tiny beak
  ctx.fillStyle = rgb(p.beakDark);
  ctx.beginPath();
  ctx.moveTo(cx - 4.0, cy - 2.4);
  ctx.lineTo(cx - 5.6, cy - 1.8);
  ctx.lineTo(cx - 4.0, cy - 1.4);
  ctx.closePath();
  ctx.fill();
  // eye
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.arc(cx - 2.4, cy - 2.6, 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── Idle bob (seamless, zero-velocity at t=0) ────────────────────────────────

// A*(1-cos(w t))*0.5 → 0 at t=0 with zero velocity; period 2π/w.
function bobAt(t: number, amp = 0.7, w = 1.4): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// A once-per-loop downward PECK + head-bob, additive head motion (px). Sharp
// quick dip near the middle of the loop, rest elsewhere. Seamless (0 at the
// loop edges). Returns a downward y-offset for the head, in design px.
function peckAt(t: number, w = 1.4): number {
  // loop phase 0..1 over one bob period
  const ph = ((w * t) / (Math.PI * 2)) % 1;
  // a brief peck window around ph≈0.5; smooth hump that returns to 0
  const x = clamp01((ph - 0.32) / 0.36); // 0..1 across the window
  const hump = x <= 0 || x >= 1 ? 0 : Math.sin(x * Math.PI); // 0→1→0
  return hump * hump * 3.2; // squared = sharper, quick dip
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    // Gentle breathing bob for the whole hen; a small downward peck/head-bob is
    // layered by re-drawing the head a touch lower once per loop. paint() draws
    // the rest pose at `bob`; we then overlay the pecking head when active.
    const peck = peckAt(t);

    if (peck < 0.05) {
      // no peck this instant — single clean paint
      paint(ctx, SP[season], bob);
    } else {
      // paint body at bob, but nudge the whole subject's head down by re-running
      // paint with a slightly larger bob only affects body; instead we paint
      // normally then redraw the head lower so it reads as a peck (glance of
      // life). The body breathing stays at `bob`.
      paint(ctx, SP[season], bob);
      ctx.save();
      try {
        ctx.translate(-1.0, peck); // head dips down + slightly forward (left)
        ctx.globalAlpha = 1;
        drawHead(ctx, clampP(SP[season]), bob);
      } finally {
        ctx.restore();
      }
    }

    ctx.save();
    try {
      ctx.globalAlpha = 1;
      if (season === "Spring") {
        // the chick bobs too — a small extra fluffy yellow bob overlaid
        const cb = Math.sin(t * 2.0) * 0.8;
        const sp = clampP(SP.Spring);
        ctx.save();
        ctx.translate(0, cb);
        drawChick(ctx, sp, bob);
        ctx.restore();
      } else if (season === "Summer") {
        // soft feather sheen travelling gently across the back
        const g = 0.18 + 0.26 * (0.5 + 0.5 * Math.sin(t * 1.6));
        const sx = BODY_CX - 5 + Math.sin(t * 0.9) * 3;
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        ctx.beginPath();
        ctx.ellipse(sx, BODY_CY + bob - 5, 3.6, 2.0, -0.35, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // a fallen leaf stirs — gently rocking on the pad
        const rock = Math.sin(t * 1.3) * 0.4;
        ctx.save();
        ctx.translate(-12, 19.6);
        ctx.rotate(-0.5 + rock);
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
      } else {
        // Winter — a breath-fog puff that PULSES at the beak + a drifting flake
        const hx = HEAD_CX;
        const hy = HEAD_CY + bob + peck; // puff tracks the pecking head
        const puff = 0.5 + 0.5 * Math.sin(t * 1.8); // 0..1 pulse
        const px = hx - HEAD_R - 4.5;
        ctx.fillStyle = `rgba(232,242,255,${0.12 + 0.34 * puff})`;
        ctx.beginPath();
        ctx.ellipse(px - puff * 2, hy + 1.4, 2.0 + puff * 2.4, 1.6 + puff * 1.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(244,250,255,${0.1 + 0.2 * puff})`;
        ctx.beginPath();
        ctx.arc(px - puff * 3.5, hy + 0.6, 1.0 + puff * 1.2, 0, Math.PI * 2);
        ctx.fill();
        // one drifting snowflake
        const prog = ((t / 3.0) % 1 + 1) % 1;
        const fy = -22 + prog * 38;
        const fx = 6 + Math.sin(prog * Math.PI * 2) * 3;
        ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(fx, fy, 1.0, 0, Math.PI * 2);
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
