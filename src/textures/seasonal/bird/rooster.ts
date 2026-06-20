// Seasonal art for the BIRD ROOSTER board tile (`tile_bird_rooster`).
// Module: src/textures/seasonal/bird/rooster.ts  (token: bird/rooster)
//
// A SINGLE parameterized paint renders the whole tile (grass pad + the one
// proud rooster + seasonal dressing) from a tweenable parameter set `P`. The
// four seasons are just four `P` presets; the three forward transitions lerp
// EVERY field of `P` through a quintic smoothstep, so transition(0) === the
// from-season still and transition(1) === the to-season still — no snap.
//
// PALETTE LOCK: the rooster is ALWAYS the same colourful bird — a big RED comb
// + RED wattle, a red-brown / chestnut body, GOLDEN hackle feathers at the
// neck, and a big arched glossy GREEN-BLACK sickle tail. Its identity colours
// never change between seasons. Seasons change only the pad colour, the light
// wash, a small feather-fluff volume, and winter dressing (frost on the comb,
// snow on the back, a breath-fog puff). The silhouette is IDENTICAL all year.
//
// Animal framing: the bird stands front-¾, turned ~15–20° toward lower-left,
// full body readable, legs/feet contacting the pad. Origin-centered in the
// −24..+24 design box, light from upper-left, one soft contact shadow at
// lower-right. Animations are deterministic (sin/cos/modulo of `t` in seconds),
// seamless, and subtle: the breathing bob uses A*(1-cos(w t))*0.5 so the value
// AND velocity are 0 at t=0 → anim(…,0) matches the still exactly.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Small math helpers ──────────────────────────────────────────────────────

type RGB = [number, number, number];

function clamp01(x: number): number {
  if (!(x >= 0)) return 0; // also catches NaN
  if (x > 1) return 1;
  return x;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function rgb(c: RGB, a = 1): string {
  const r = Math.round(clamp01(c[0] / 255) * 255);
  const g = Math.round(clamp01(c[1] / 255) * 255);
  const b = Math.round(clamp01(c[2] / 255) * 255);
  return `rgba(${r},${g},${b},${clamp01(a)})`;
}

// quintic smoothstep — zero first & second derivative at both ends
function smoother(x: number): number {
  return x * x * x * (x * (6 * x - 15) + 10);
}

// breathing bob: A*(1-cos(w t))*0.5 — value AND velocity are 0 at t=0,
// seamless over a 2π/w period, peak amplitude A.
function bobAt(t: number, amp = 0.9, w = 1.5): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────

// NOTE: the rooster's IDENTITY colours (comb red, wattle red, chestnut body,
// golden hackles, green-black tail) are LOCKED — they still live in `P` so the
// paint is a pure function of `p`, but every season's preset carries the SAME
// values for them. Only pad/light/fluff/winter-dressing differ.
interface P {
  comb: RGB; // big red comb + red wattle
  combShade: RGB; // shaded underside of the comb
  bodyLight: RGB; // lit chestnut breast / back
  bodyMid: RGB; // chestnut body tone
  bodyDark: RGB; // shaded belly / underside
  hackle: RGB; // golden neck hackle feathers
  hackleDark: RGB; // shaded hackle
  tail: RGB; // glossy green-black sickle tail
  tailSheen: RGB; // green sheen highlight on the tail
  beak: RGB; // yellow-horn beak + legs
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  fluff: number; // 0..1 feather puff (winter fluffs up against the cold)
  frostAmt: number; // 0..1 frost dusting on the comb / upward surfaces
  backSnowAmt: number; // 0..1 snow settled on the back / tail
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad (autumn)
  breathFogAmt: number; // 0..1 breath puff at the beak (winter)
  gloss: number; // 0..1 glossy sheen strength on the tail (summer peak)
}

// LOCKED identity colours, shared by every season preset.
const COMB: RGB = [214, 44, 42];
const COMB_SHADE: RGB = [150, 26, 30];
const BODY_LIGHT: RGB = [186, 96, 50];
const BODY_MID: RGB = [148, 66, 34];
const BODY_DARK: RGB = [96, 42, 24];
const HACKLE: RGB = [226, 168, 56];
const HACKLE_DARK: RGB = [168, 112, 32];
const TAIL: RGB = [30, 48, 38];
const TAIL_SHEEN: RGB = [70, 132, 92];
const BEAK: RGB = [228, 184, 70];

// Four season presets. The bird stays the SAME colourful rooster; only the pad,
// light wash, feather fluff, and winter dressing differ between them.
const SP: Record<SeasonName, P> = {
  // Spring — bright plumage, dewy lime pad + blossom, cool-bright light.
  Spring: {
    comb: COMB,
    combShade: COMB_SHADE,
    bodyLight: BODY_LIGHT,
    bodyMid: BODY_MID,
    bodyDark: BODY_DARK,
    hackle: HACKLE,
    hackleDark: HACKLE_DARK,
    tail: TAIL,
    tailSheen: TAIL_SHEEN,
    beak: BEAK,
    padGrass: [128, 206, 86], // bright lime dewy grass
    soil: [86, 132, 54],
    outline: [48, 28, 22],
    lightWash: [220, 240, 255], // cool-bright
    lightWashAmt: 0.15,
    fluff: 0.32,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.7,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    gloss: 0.4,
  },
  // Summer — richest glossy plumage (PEAK); saturated mid-green pad; warm light.
  Summer: {
    comb: COMB,
    combShade: COMB_SHADE,
    bodyLight: BODY_LIGHT,
    bodyMid: BODY_MID,
    bodyDark: BODY_DARK,
    hackle: HACKLE,
    hackleDark: HACKLE_DARK,
    tail: TAIL,
    tailSheen: TAIL_SHEEN,
    beak: BEAK,
    padGrass: [86, 168, 64], // saturated mid-green
    soil: [58, 110, 40],
    outline: [44, 24, 18],
    lightWash: [255, 244, 206], // warm
    lightWashAmt: 0.16,
    fluff: 0.42,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    gloss: 1, // peak glossy sheen on the tail
  },
  // Autumn — warm plumage, olive-tan browning pad, a couple of fallen leaves.
  Autumn: {
    comb: COMB,
    combShade: COMB_SHADE,
    bodyLight: BODY_LIGHT,
    bodyMid: BODY_MID,
    bodyDark: BODY_DARK,
    hackle: HACKLE,
    hackleDark: HACKLE_DARK,
    tail: TAIL,
    tailSheen: TAIL_SHEEN,
    beak: BEAK,
    padGrass: [156, 142, 78], // olive-tan
    soil: [104, 84, 44],
    outline: [50, 28, 20],
    lightWash: [255, 206, 138], // low amber
    lightWashAmt: 0.2,
    fluff: 0.55,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.7,
    breathFogAmt: 0,
    gloss: 0.55,
  },
  // Winter — frosted comb + fluffed feathers + a little snow on the back +
  // breath-fog; snowy pad, cool light. Bird stays CLEARLY its own colours.
  Winter: {
    comb: COMB,
    combShade: COMB_SHADE,
    bodyLight: BODY_LIGHT,
    bodyMid: BODY_MID,
    bodyDark: BODY_DARK,
    hackle: HACKLE,
    hackleDark: HACKLE_DARK,
    tail: TAIL,
    tailSheen: TAIL_SHEEN,
    beak: BEAK,
    padGrass: [222, 232, 244], // snow on the pad
    soil: [150, 168, 190],
    outline: [54, 40, 44],
    lightWash: [206, 222, 248], // cool blue-grey
    lightWashAmt: 0.24,
    fluff: 1, // puffed up against the cold
    frostAmt: 0.7,
    backSnowAmt: 0.7,
    padSnowAmt: 0.85,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.7,
    gloss: 0.35,
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    comb: lerpRGB(a.comb, b.comb, t),
    combShade: lerpRGB(a.combShade, b.combShade, t),
    bodyLight: lerpRGB(a.bodyLight, b.bodyLight, t),
    bodyMid: lerpRGB(a.bodyMid, b.bodyMid, t),
    bodyDark: lerpRGB(a.bodyDark, b.bodyDark, t),
    hackle: lerpRGB(a.hackle, b.hackle, t),
    hackleDark: lerpRGB(a.hackleDark, b.hackleDark, t),
    tail: lerpRGB(a.tail, b.tail, t),
    tailSheen: lerpRGB(a.tailSheen, b.tailSheen, t),
    beak: lerpRGB(a.beak, b.beak, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    fluff: lerp(a.fluff, b.fluff, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    backSnowAmt: lerp(a.backSnowAmt, b.backSnowAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
    breathFogAmt: lerp(a.breathFogAmt, b.breathFogAmt, t),
    gloss: lerp(a.gloss, b.gloss, t),
  };
}

// clamp every scalar field defensively (never throw on a wild `p`)
function clampP(p: P): P {
  return {
    ...p,
    lightWashAmt: clamp01(p.lightWashAmt),
    fluff: clamp01(p.fluff),
    frostAmt: clamp01(p.frostAmt),
    backSnowAmt: clamp01(p.backSnowAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    breathFogAmt: clamp01(p.breathFogAmt),
    gloss: clamp01(p.gloss),
  };
}

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat grass pad the rooster stands on
function paintPad(ctx: CanvasRenderingContext2D, p: P): void {
  // soft contact shadow, offset to lower-right (light is upper-left)
  ctx.fillStyle = rgb([0, 0, 0], 0.18);
  ctx.beginPath();
  ctx.ellipse(3, 21, 17, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // shaded underside of the pad
  ctx.fillStyle = rgb(p.soil);
  ctx.beginPath();
  ctx.ellipse(0, 20.5, 18, 5.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // grass top
  ctx.fillStyle = rgb(p.padGrass);
  ctx.beginPath();
  ctx.ellipse(0, 19, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // tufted top edge
  ctx.strokeStyle = rgb(p.padGrass);
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  for (let i = -16; i <= 16; i += 4) {
    const h = 1.6 + (i % 8 === 0 ? 1.4 : 0);
    const yEdge = 19 - Math.sqrt(Math.max(0, 1 - (i / 18) ** 2)) * 5;
    ctx.beginPath();
    ctx.moveTo(i, yEdge);
    ctx.lineTo(i + 1, yEdge - h);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // small highlight band on the pad (light from upper-left)
  ctx.fillStyle = rgb([255, 255, 255], 0.1);
  ctx.beginPath();
  ctx.ellipse(-5, 17.5, 9, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // snow blanket over the pad (winter)
  if (p.padSnowAmt > 0.001) {
    ctx.fillStyle = rgb([244, 250, 255], 0.85 * p.padSnowAmt);
    ctx.beginPath();
    ctx.ellipse(0, 18.6, 17, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // a couple of frost glints on the snow
    ctx.fillStyle = rgb([255, 255, 255], 0.7 * p.padSnowAmt);
    for (const [sx, sy] of [[-9, 19], [6, 20], [12, 18]] as const) {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // tiny blossoms (spring)
  if (p.blossomAmt > 0.001) {
    for (const [bx, by] of [[-12, 18.5], [9, 20], [0, 21], [14, 19]] as const) {
      ctx.fillStyle = rgb([255, 250, 252], 0.9 * p.blossomAmt);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(bx + Math.cos(a) * 1.1, by + Math.sin(a) * 1.1, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = rgb([252, 214, 110], p.blossomAmt);
      ctx.beginPath();
      ctx.arc(bx, by, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // a couple of fallen leaves (autumn)
  if (p.fallenLeafAmt > 0.001) {
    const leaves: Array<[number, number, number, RGB]> = [
      [-11, 20, -0.5, [196, 96, 36]],
      [11, 20.5, 0.7, [212, 150, 52]],
      [2, 21, 0.2, [168, 80, 40]],
    ];
    for (const [lx, ly, rot, col] of leaves) {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.fillStyle = rgb(col, p.fallenLeafAmt);
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.6, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgb([110, 60, 26], p.fallenLeafAmt);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-2.4, 0);
      ctx.lineTo(2.4, 0);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// one leg: a slim yellow shank with a three-toed foot at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  // dark behind, then yellow shank on top (layered dark-then-light)
  ctx.strokeStyle = rgb(p.outline);
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  ctx.strokeStyle = rgb(p.beak);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // three-toed foot
  ctx.strokeStyle = rgb(p.beak);
  ctx.lineWidth = 1.4;
  for (const dx of [-2.4, 0, 2.4]) {
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + dx, baseY + 1.4);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  ctx.restore();
}

// trace the constant body silhouette (breast + back) — IDENTICAL every season.
// `fluff` only gently swells the perimeter; it never changes the shape's identity.
function bodyPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, fluff: number): void {
  const s = 1 + fluff * 0.08; // very modest swell
  const rx = 11 * s;
  const ry = 12.5 * s;
  ctx.beginPath();
  // upright proud oval body, slightly taller than wide, tilted toward lower-left
  ctx.ellipse(cx, cy, rx, ry, -0.12, 0, Math.PI * 2);
}

// the big arched glossy green-black sickle tail (rear-upper-right), constant shape
function paintTail(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number): void {
  // base of the tail sits at the rear of the body; sickles arch up and over.
  const baseX = cx + 8;
  const baseY = cy + 2;
  // three layered sickle feathers, outline-dark first then green-black fill
  const sickles: Array<[number, number, number]> = [
    // [tip dx, tip dy, control bulge]
    [14, -20, 10],
    [17, -14, 13],
    [16, -7, 12],
  ];
  // dark outline halo pass
  ctx.strokeStyle = rgb(p.outline);
  ctx.lineWidth = 6.5;
  ctx.lineCap = "round";
  for (const [tx, ty, cb] of sickles) {
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX + cb, baseY - 16, baseX + tx, baseY + ty);
    ctx.stroke();
  }
  // green-black fill pass
  ctx.strokeStyle = rgb(p.tail);
  ctx.lineWidth = 4.4;
  for (const [tx, ty, cb] of sickles) {
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX + cb, baseY - 16, baseX + tx, baseY + ty);
    ctx.stroke();
  }
  // green sheen highlight along the upper edge of the sickles (gloss strength)
  if (p.gloss > 0.02) {
    ctx.strokeStyle = rgb(p.tailSheen, 0.5 + 0.45 * p.gloss);
    ctx.lineWidth = 1.5;
    for (const [tx, ty, cb] of sickles) {
      ctx.beginPath();
      ctx.moveTo(baseX + 1, baseY - 1);
      ctx.quadraticCurveTo(baseX + cb + 1, baseY - 17, baseX + tx + 0.6, baseY + ty - 0.6);
      ctx.stroke();
    }
  }
  ctx.lineCap = "butt";
}

// the whole rooster, standing front-¾ turned ~15–20° toward lower-left
function paintRooster(ctx: CanvasRenderingContext2D, p: P, bob: number, headBob: number, tailFlick: number): void {
  // body centre; the breathing bob lifts the whole bird a touch
  const cx = -1;
  const cy = 2 - bob;

  // ── Tail behind the body (drawn first) ─────────────────────────────────────
  ctx.save();
  ctx.translate(0, tailFlick * 0); // tail flick applied per-feather below
  paintTail(ctx, p, cx, cy);
  ctx.restore();

  // ── Legs (behind the lower body) ───────────────────────────────────────────
  // front-¾: the two legs are close, contacting the pad lower-centre.
  paintLeg(ctx, p, cx - 2.5, cy + 9, 19.2, 1);
  paintLeg(ctx, p, cx + 2.8, cy + 9, 19.0, 0.9);

  // ── BODY — outline halo, then chestnut fill, then lit breast ───────────────
  // dark outline halo
  bodyPath(ctx, cx, cy, p.fluff);
  ctx.fillStyle = rgb(p.outline);
  ctx.save();
  ctx.translate(0, 0);
  bodyPath(ctx, cx, cy, p.fluff + 0.5);
  ctx.fillStyle = rgb(p.outline);
  ctx.fill();
  ctx.restore();

  // chestnut mid body
  bodyPath(ctx, cx, cy, p.fluff);
  ctx.fillStyle = rgb(p.bodyMid);
  ctx.fill();

  // shaded lower-right belly
  ctx.save();
  bodyPath(ctx, cx, cy, p.fluff);
  ctx.clip();
  ctx.fillStyle = rgb(p.bodyDark);
  ctx.beginPath();
  ctx.ellipse(cx + 4, cy + 7, 10, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit breast (upper-left)
  ctx.fillStyle = rgb(p.bodyLight);
  ctx.beginPath();
  ctx.ellipse(cx - 4, cy - 3, 7, 8.5, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // soft feather striations down the breast
  ctx.strokeStyle = rgb(p.bodyDark, 0.4);
  ctx.lineWidth = 1;
  for (const dx of [-5, -1.5, 2]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx, cy - 6);
    ctx.quadraticCurveTo(cx + dx - 1.5, cy, cx + dx - 2.5, cy + 7);
    ctx.stroke();
  }
  ctx.restore();

  // snow settled on the back (winter) — soft white cap over the upper body/tail base
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgb([248, 252, 255], 0.9 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(cx + 3, cy - 8.5, 8 * (0.9 + p.fluff * 0.25), 3, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb([255, 255, 255], 0.85 * p.backSnowAmt);
    for (const [dx, dy] of [[-2, -9.4], [3, -9.6], [7, -8.4]] as const) {
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, 1.4 + p.fluff * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── GOLDEN HACKLE feathers at the neck (constant placement) ────────────────
  // a cape of pointed golden feathers flowing from the head down over the
  // shoulders, on the upper-left of the body.
  const nx = cx - 5;
  const ny = cy - 8 + headBob;
  const hackles: Array<[number, number, number]> = [
    [-5, 6, -0.5],
    [-3, 9, -0.25],
    [0, 10, 0],
    [3, 8, 0.25],
  ];
  // dark hackle base
  for (const [dx, len, rot] of hackles) {
    ctx.save();
    ctx.translate(nx + dx, ny + 3);
    ctx.rotate(rot);
    ctx.fillStyle = rgb(p.hackleDark);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-2.6, len * 0.6, -1.2, len);
    ctx.quadraticCurveTo(0, len * 0.7, 2.6, len * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // bright golden hackle on top (offset up-left, light from upper-left)
  for (const [dx, len, rot] of hackles) {
    ctx.save();
    ctx.translate(nx + dx - 0.6, ny + 2.2);
    ctx.rotate(rot);
    ctx.fillStyle = rgb(p.hackle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-2, len * 0.6, -0.8, len * 0.92);
    ctx.quadraticCurveTo(0, len * 0.6, 2, len * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── HEAD (front-¾, lower-left) — comb + wattle + beak + eye ─────────────────
  const hx = cx - 7;
  const hy = cy - 12 + headBob;

  // head outline + chestnut head fill
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 5.2, 5.4, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.bodyMid);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 4.4, 4.6, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // lit cheek (upper-left)
  ctx.fillStyle = rgb(p.bodyLight);
  ctx.beginPath();
  ctx.ellipse(hx - 1.4, hy - 1.4, 2.4, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // big RED comb — a ridge of rounded points along the crown
  const combY = hy - 4.6;
  ctx.fillStyle = rgb(p.combShade);
  ctx.beginPath();
  ctx.moveTo(hx - 4, combY + 2);
  for (let i = 0; i <= 4; i++) {
    const px = hx - 4 + i * 2.2;
    const peak = combY - 3.4 - (i === 1 || i === 2 ? 1.2 : 0);
    ctx.quadraticCurveTo(px - 0.5, peak, px + 1.1, combY + 1.4);
  }
  ctx.lineTo(hx + 4.6, combY + 2.2);
  ctx.quadraticCurveTo(hx, combY + 3, hx - 4, combY + 2);
  ctx.closePath();
  ctx.fill();
  // bright red comb on top (offset up-left)
  ctx.fillStyle = rgb(p.comb);
  ctx.beginPath();
  ctx.moveTo(hx - 4.4, combY + 1.6);
  for (let i = 0; i <= 4; i++) {
    const px = hx - 4.4 + i * 2.2;
    const peak = combY - 4 - (i === 1 || i === 2 ? 1.2 : 0);
    ctx.quadraticCurveTo(px - 0.6, peak, px + 0.8, combY + 0.8);
  }
  ctx.lineTo(hx + 4, combY + 1.6);
  ctx.quadraticCurveTo(hx, combY + 2.4, hx - 4.4, combY + 1.6);
  ctx.closePath();
  ctx.fill();

  // RED wattle — two soft lobes hanging under the beak
  ctx.fillStyle = rgb(p.comb);
  for (const dx of [-1.4, 1.0]) {
    ctx.beginPath();
    ctx.ellipse(hx - 4.4 + dx, hy + 4.2, 1.5, 2.6, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = rgb(p.combShade, 0.5);
  ctx.beginPath();
  ctx.ellipse(hx - 4.6, hy + 5, 1.3, 1.8, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // yellow beak — a short pointed wedge facing lower-left
  ctx.fillStyle = rgb(p.beak);
  ctx.beginPath();
  ctx.moveTo(hx - 3.8, hy);
  ctx.lineTo(hx - 8.4, hy + 1.8);
  ctx.lineTo(hx - 3.8, hy + 3.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgb(p.outline, 0.6);
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(hx - 8.4, hy + 1.8);
  ctx.lineTo(hx - 4, hy + 1.9);
  ctx.stroke();

  // eye — white + dark pupil, facing the viewer/lower-left
  ctx.fillStyle = rgb([250, 248, 240]);
  ctx.beginPath();
  ctx.arc(hx - 1.2, hy - 0.4, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb([22, 18, 18]);
  ctx.beginPath();
  ctx.arc(hx - 1.4, hy - 0.4, 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb([255, 255, 255], 0.9);
  ctx.beginPath();
  ctx.arc(hx - 1.7, hy - 0.8, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // frost dusting on the comb / upward surfaces (winter) — cool speckle,
  // the comb stays clearly RED underneath.
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([235, 246, 255], 0.55 * p.frostAmt);
    for (const [fx, fy] of [
      [hx - 3, combY - 2.5], [hx, combY - 3.2], [hx + 2.6, combY - 2.2],
      [hx - 1.4, combY - 1], [hx + 1.4, combY - 1.2],
    ] as const) {
      ctx.beginPath();
      ctx.arc(fx, fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    // faint frost on the back/hackles
    ctx.fillStyle = rgb([255, 255, 255], 0.4 * p.frostAmt);
    for (const [fx, fy] of [[cx - 4, cy - 4], [cx + 2, cy - 6], [cx - 1, cy - 1]] as const) {
      ctx.beginPath();
      ctx.arc(fx, fy, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // breath-fog puff at the beak (winter) — at rest a faint static puff
  if (p.breathFogAmt > 0.001) {
    ctx.fillStyle = rgb([235, 244, 255], 0.4 * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(hx - 11, hy + 2.4, 3, 2, 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
}

// the overall colour-of-light wash, painted last over the whole tile
function paintLightWash(ctx: CanvasRenderingContext2D, p: P): void {
  if (p.lightWashAmt <= 0.001) return;
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = rgb(p.lightWash, p.lightWashAmt);
  ctx.beginPath();
  ctx.ellipse(0, 2, 26, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── THE single paint ────────────────────────────────────────────────────────

function paint(ctx: CanvasRenderingContext2D, pIn: P, bob: number, headBob = 0, tailFlick = 0): void {
  const p = clampP(pIn);
  ctx.save();
  try {
    ctx.lineJoin = "round";
    paintPad(ctx, p);
    paintRooster(ctx, p, bob, headBob, tailFlick);
    paintLightWash(ctx, p);
  } finally {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }
}

// ── Per-season builders ─────────────────────────────────────────────────────

function draw(season: SeasonName) {
  return (ctx: CanvasRenderingContext2D): void => paint(ctx, SP[season], 0);
}

function anim(season: SeasonName) {
  return (ctx: CanvasRenderingContext2D, t: number): void => {
    const p = clampP(SP[season]);
    const bob = bobAt(t); // SUBJECT breathing bob, 0 at t=0

    // Once-per-loop proud head-bob + tail-feather flick. Both are gated to a
    // short brief bump near the end of a ~5s loop and are 0 at t=0 (seamless).
    const loop = (t % 5) / 5; // 0..1
    const gate = Math.max(0, Math.sin(loop * Math.PI * 2)) ** 4; // brief bump
    const headBob = gate * -1.4; // a small proud dip-and-lift of the head
    const tailFlick = Math.sin(t * 8) * gate * 1.2;

    paint(ctx, SP[season], bob, headBob, tailFlick);

    // ── Additive season micro-motion, drawn over the painted tile ───────────
    ctx.save();
    try {
      const cx = -1;
      const cy = 2 - bob;
      const hx = cx - 7;
      const hy = cy - 12 + headBob;

      if (season === "Spring") {
        // dew shimmer — soft glints pulsing on the grass/blossoms
        const g = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.4));
        ctx.fillStyle = rgb([255, 255, 255], g);
        ctx.beginPath();
        ctx.arc(-8, 18.4, 1.1 + g, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(10, 19.6, 0.9 + g * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // glossy tail sheen sweeping along the sickle feathers
        const s = 0.5 + 0.5 * Math.sin(t * 1.2);
        const baseX = cx + 8;
        const baseY = cy + 2;
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.strokeStyle = rgb([180, 255, 210], 0.4 + 0.3 * s);
        ctx.lineWidth = 1.4;
        const ty = lerp(-20, -7, s);
        const cb = lerp(10, 12, s);
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.quadraticCurveTo(baseX + cb, baseY - 16, baseX + 15, baseY + ty);
        ctx.stroke();
        ctx.restore();
      } else if (season === "Autumn") {
        // a fallen leaf stirs — gentle rock + tiny drift, seamless
        const a = Math.sin(t * 1.3) * 0.5;
        const dx = Math.sin(t * 0.7) * 1.2;
        ctx.save();
        ctx.translate(11 + dx, 20.5);
        ctx.rotate(0.7 + a);
        ctx.fillStyle = rgb([212, 150, 52], p.fallenLeafAmt);
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.6, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Winter: breath-fog pulses outward from the beak + a drifting snowflake.
        const breathe = 0.5 + 0.5 * Math.sin(t * 1.5);
        const reach = 5 + breathe * 3;
        ctx.fillStyle = rgb([235, 244, 255], (0.18 + 0.3 * breathe) * p.breathFogAmt);
        ctx.beginPath();
        ctx.ellipse(hx - reach - 2, hy + 2.4, 2.6 + breathe * 1.8, 1.8 + breathe * 1.2, 0.15, 0, Math.PI * 2);
        ctx.fill();

        // one drifting snowflake on a seamless 3.4s fall
        const prog = ((t / 3.4) % 1 + 1) % 1;
        const fy = -20 + prog * 36;
        const fxx = 6 + Math.sin(prog * Math.PI * 2) * 4;
        ctx.fillStyle = rgb([255, 255, 255], 0.85);
        ctx.beginPath();
        ctx.arc(fxx, fy, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    } finally {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();
    }
  };
}

// ── Forward transitions (lerp EVERY field through quintic smoothstep) ────────

function makeTransition(fromIdx: 0 | 1 | 2) {
  const from = SEASON_NAMES[fromIdx];
  const to = SEASON_NAMES[fromIdx + 1];
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const k = smoother(clamp01(pp));
    paint(ctx, lerpP(SP[from], SP[to], k), 0);
  };
}

const springToSummer = makeTransition(0);
const summerToAutumn = makeTransition(1);
const autumnToWinter = makeTransition(2);

// ── Public exports ──────────────────────────────────────────────────────────

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
