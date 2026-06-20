// Seasonal art for the BIRD PHEASANT board tile (`tile_bird_pheasant`).
// Source path token: bird/pheasant
//
// A SINGLE parameterized paint renders the whole tile (grass pad + the one
// long-tailed pheasant + seasonal dressing) from a tweenable parameter set
// `P`. The four seasons are just four `P` presets; the three forward
// transitions lerp EVERY field of `P` through a quintic smoothstep, so
// transition(0) === the from-season still and transition(1) === the to-season
// still — no snap.
//
// PALETTE LOCK: the pheasant is ALWAYS the same bird — an iridescent dark-GREEN
// head with a red face wattle, a coppery-chestnut barred body, a white neck
// ring, and a very long pointed barred TAIL trailing behind. The constant
// SILHOUETTE never changes. Seasons change only the plumage richness (a global
// surface lift, not an identity change), winter feather fluff, the pad colour,
// the light wash, and dressing (blossom, fallen leaves, frost, back/tail snow,
// breath-fog). The bird's identity colours never change.
//
// Origin-centered in the −24..+24 design box, light from upper-left. The bird
// stands front-¾ turned ~15–20° toward lower-left on the pad, tail sweeping up
// and back to the upper-right. Animations are deterministic (sin/cos/modulo of
// `t` in seconds), seamless, and subtle. The subject's breathing bob has zero
// velocity at t=0 (A*(1-cos(w t))*0.5) so anim(…,0) matches the still exactly.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Small math helpers ──────────────────────────────────────────────────────

type RGB = [number, number, number];

function clamp01(x: number): number {
  if (!(x >= 0)) return 0; // also catches NaN
  return x > 1 ? 1 : x;
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
function bobAt(t: number, amp = 1.0, w = 1.5): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────

interface P {
  bodyLight: RGB; // lit coppery-chestnut body
  bodyMid: RGB; // body mid tone
  bodyDark: RGB; // shaded body / barring
  headGreen: RGB; // iridescent dark-green head
  headHi: RGB; // green head highlight (sheen)
  wattle: RGB; // red face wattle
  ring: RGB; // white neck ring
  beakLeg: RGB; // beak + legs
  tail: RGB; // long pointed tail base tone
  tailBar: RGB; // dark bars on the tail
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  plumage: number; // 0..1 plumage richness lift (saturation/contrast cue)
  fluff: number; // 0..1 winter feather fluff (modest outline puff)
  sheen: number; // 0..1 iridescent head/neck sheen strength
  frostAmt: number; // 0..1 frost sparkle on the plumage
  backSnowAmt: number; // 0..1 snow settled on the back + tail
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad
  breathFogAmt: number; // 0..1 breath puff at the beak
}

// Four season presets. The pheasant stays the SAME bird; only plumage richness
// + fluff + pad + light + dressing differ. Body stays coppery, head green,
// tail long — palette lock.
const SP: Record<SeasonName, P> = {
  // Spring — bright fresh plumage, dewy lime pad + blossom, cool-bright light.
  Spring: {
    bodyLight: [206, 130, 64],
    bodyMid: [168, 96, 44],
    bodyDark: [104, 56, 26],
    headGreen: [30, 86, 60],
    headHi: [74, 150, 110],
    wattle: [206, 48, 44],
    ring: [244, 246, 240],
    beakLeg: [196, 168, 96],
    tail: [180, 132, 74],
    tailBar: [86, 56, 30],
    padGrass: [128, 206, 86], // bright lime dewy grass
    soil: [86, 132, 54],
    outline: [54, 40, 28],
    lightWash: [216, 240, 255], // cool-bright
    lightWashAmt: 0.16,
    plumage: 0.55,
    fluff: 0.1,
    sheen: 0.3,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.7,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Summer — PEAK: richest iridescent copper-and-green, mid-green pad, warm light.
  Summer: {
    bodyLight: [224, 138, 58],
    bodyMid: [186, 98, 38],
    bodyDark: [110, 52, 22],
    headGreen: [22, 98, 66],
    headHi: [96, 188, 138],
    wattle: [224, 42, 40],
    ring: [250, 252, 248],
    beakLeg: [206, 180, 104],
    tail: [198, 142, 76],
    tailBar: [78, 48, 26],
    padGrass: [86, 168, 64], // saturated mid-green
    soil: [58, 110, 40],
    outline: [50, 36, 24],
    lightWash: [255, 244, 206], // warm
    lightWashAmt: 0.14,
    plumage: 1, // peak richness
    fluff: 0.18,
    sheen: 0.85,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Autumn — warm coppery plumage, olive-tan pad, fallen leaves, low amber light.
  Autumn: {
    bodyLight: [212, 124, 50],
    bodyMid: [176, 88, 34],
    bodyDark: [104, 50, 22],
    headGreen: [30, 82, 56],
    headHi: [78, 152, 108],
    wattle: [210, 46, 38],
    ring: [240, 236, 222],
    beakLeg: [200, 168, 92],
    tail: [192, 130, 66],
    tailBar: [82, 50, 26],
    padGrass: [156, 142, 78], // olive-tan browning grass
    soil: [104, 84, 44],
    outline: [56, 40, 26],
    lightWash: [255, 206, 138], // low amber
    lightWashAmt: 0.2,
    plumage: 0.75,
    fluff: 0.32,
    sheen: 0.4,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.7,
    breathFogAmt: 0,
  },
  // Winter — fluffed feathers, snow on back/tail, breath fog, snowy pad, cool light.
  Winter: {
    bodyLight: [192, 122, 62],
    bodyMid: [156, 90, 44],
    bodyDark: [98, 52, 30],
    headGreen: [36, 80, 64],
    headHi: [80, 144, 116],
    wattle: [198, 60, 56],
    ring: [248, 250, 252],
    beakLeg: [192, 176, 124],
    tail: [176, 128, 78],
    tailBar: [80, 54, 36],
    padGrass: [222, 232, 244], // snow on the pad
    soil: [150, 168, 190],
    outline: [62, 50, 50],
    lightWash: [206, 222, 248], // cool blue-grey
    lightWashAmt: 0.24,
    plumage: 0.6,
    fluff: 1, // puffed up against the cold
    sheen: 0.25,
    frostAmt: 0.7,
    backSnowAmt: 0.7,
    padSnowAmt: 0.85,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.7,
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    bodyLight: lerpRGB(a.bodyLight, b.bodyLight, t),
    bodyMid: lerpRGB(a.bodyMid, b.bodyMid, t),
    bodyDark: lerpRGB(a.bodyDark, b.bodyDark, t),
    headGreen: lerpRGB(a.headGreen, b.headGreen, t),
    headHi: lerpRGB(a.headHi, b.headHi, t),
    wattle: lerpRGB(a.wattle, b.wattle, t),
    ring: lerpRGB(a.ring, b.ring, t),
    beakLeg: lerpRGB(a.beakLeg, b.beakLeg, t),
    tail: lerpRGB(a.tail, b.tail, t),
    tailBar: lerpRGB(a.tailBar, b.tailBar, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    plumage: lerp(a.plumage, b.plumage, t),
    fluff: lerp(a.fluff, b.fluff, t),
    sheen: lerp(a.sheen, b.sheen, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    backSnowAmt: lerp(a.backSnowAmt, b.backSnowAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
    breathFogAmt: lerp(a.breathFogAmt, b.breathFogAmt, t),
  };
}

// clamp every scalar field defensively (never throw on a wild `p`)
function clampP(p: P): P {
  return {
    ...p,
    lightWashAmt: clamp01(p.lightWashAmt),
    plumage: clamp01(p.plumage),
    fluff: clamp01(p.fluff),
    sheen: clamp01(p.sheen),
    frostAmt: clamp01(p.frostAmt),
    backSnowAmt: clamp01(p.backSnowAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    breathFogAmt: clamp01(p.breathFogAmt),
  };
}

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat grass pad the pheasant stands on
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
      [10, 20.5, 0.7, [212, 150, 52]],
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

// one leg: a slim cylinder with a small foot at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  ctx.strokeStyle = rgb(p.beakLeg);
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // toes
  ctx.lineWidth = 1.1;
  for (const tx of [-1.8, 0, 1.8]) {
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + tx, baseY + 1.6);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

// The long pointed barred tail — a SHARED silhouette sweeping up and back to
// the upper-right (trailing behind the bird). Drawn outline-then-fill, with
// dark cross-bars and a couple of long central feathers.
function paintTail(ctx: CanvasRenderingContext2D, p: P, bx: number, by: number): void {
  // tail root sits at the rear (upper-right) of the body; the long feathers
  // sweep out to about (+22, -16). One constant fan of three feathers.
  const rootX = bx + 9;
  const rootY = by - 2;

  const feathers: Array<[number, number, number]> = [
    // [tip x, tip y, half-width] — central longest, outer two shorter
    [22, -18, 2.2],
    [23, -13, 1.9],
    [20, -8, 1.7],
  ];

  for (const [tx, ty, hw] of feathers) {
    // outline pass (fatter)
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.moveTo(rootX, rootY + hw + 1);
    ctx.quadraticCurveTo(bx + (tx + rootX) * 0.4, by + (ty - 2), tx, ty);
    ctx.quadraticCurveTo(bx + (tx + rootX) * 0.42, by + (ty + 2), rootX, rootY - hw - 1);
    ctx.closePath();
    ctx.fill();
    // feather fill
    ctx.fillStyle = rgb(p.tail);
    ctx.beginPath();
    ctx.moveTo(rootX, rootY + hw);
    ctx.quadraticCurveTo(bx + (tx + rootX) * 0.4, by + (ty - 1.4), tx, ty);
    ctx.quadraticCurveTo(bx + (tx + rootX) * 0.42, by + (ty + 1.4), rootX, rootY - hw);
    ctx.closePath();
    ctx.fill();

    // dark cross-bars along the feather (constant count)
    ctx.strokeStyle = rgb(p.tailBar, 0.85);
    ctx.lineWidth = 1.1;
    for (let s = 0.2; s < 0.95; s += 0.16) {
      const cxp = lerp(rootX, tx, s);
      const cyp = lerp(rootY, ty, s);
      const nx = (ty - rootY);
      const ny = -(tx - rootX);
      const nlen = Math.hypot(nx, ny) || 1;
      const ux = (nx / nlen) * (hw - 0.4);
      const uy = (ny / nlen) * (hw - 0.4);
      ctx.beginPath();
      ctx.moveTo(cxp - ux, cyp - uy);
      ctx.lineTo(cxp + ux, cyp + uy);
      ctx.stroke();
    }
  }

  // snow settled along the upper edge of the tail (winter)
  if (p.backSnowAmt > 0.001) {
    ctx.strokeStyle = rgb([248, 252, 255], 0.85 * p.backSnowAmt);
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(rootX + 2, rootY - 2);
    ctx.quadraticCurveTo(bx + 14, by - 14, 22, -17);
    ctx.stroke();
    ctx.lineCap = "butt";
  }
}

// the whole pheasant, standing front-¾ turned ~15–20° toward lower-left
function paintPheasant(ctx: CanvasRenderingContext2D, p: P, bob: number): void {
  // body centre lifts with the breathing bob
  const bx = -1;
  const by = 5 - bob;
  // fluff modestly puffs the body outline (winter)
  const vol = 0.92 + p.fluff * 0.16;
  const rx = 11 * vol;
  const ry = 8 * vol;

  // ── Tail FIRST (behind the body) ────────────────────────────────────────
  paintTail(ctx, p, bx, by);

  // ── Legs (behind the body, contact on the pad) ──────────────────────────
  paintLeg(ctx, p, bx + 1.5, by + 5.5, 18.8);
  paintLeg(ctx, p, bx - 3.5, by + 5.5, 19.2);

  // ── BODY — coppery-chestnut ovoid, tilted slightly toward lower-left ─────
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-0.12); // ~7° tilt, head end (lower-left) dips
  // outline halo
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx + 1.2, ry + 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // mid body
  ctx.fillStyle = rgb(p.bodyMid);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit upper-left face
  ctx.fillStyle = rgb(p.bodyLight, 0.92);
  ctx.beginPath();
  ctx.ellipse(-2.4, -2.4, rx * 0.72, ry * 0.66, 0, 0, Math.PI * 2);
  ctx.fill();
  // shaded lower-right belly
  ctx.fillStyle = rgb(p.bodyDark, 0.55);
  ctx.beginPath();
  ctx.ellipse(3, 3, rx * 0.66, ry * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // coppery barring — short dark flecks across the flank (constant pattern)
  ctx.fillStyle = rgb(p.bodyDark, 0.7 + 0.2 * p.plumage);
  for (const [fx, fy] of [
    [-4, -1], [0, -3], [3, -1], [-2, 2], [4, 1.5], [1, 3], [-5, 2.5], [6, -1.5],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(fx, fy, 1.4, 0.9, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // snow settled on the back (winter) — soft white cap over the body top
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgb([248, 252, 255], 0.9 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 0.5, by - ry + 1, rx * 0.78, 3, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb([255, 255, 255], 0.85 * p.backSnowAmt);
    for (const [dx, dy] of [[-4, -ry], [1, -ry - 0.6], [5, -ry + 0.6]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the plumage (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([255, 255, 255], 0.75 * p.frostAmt);
    for (const [fx, fy] of [
      [-6, -2], [-1, 3], [4, -1], [7, 2], [1, -4], [-4, 4],
    ] as const) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── NECK RING + HEAD (front-¾, lower-left) — locks identity ──────────────
  const nx = bx - 8.5; // neck base
  const ny = by - 1;
  const hx = bx - 12.5; // head centre (turned toward lower-left)
  const hy = by - 5;

  // neck — short coppery column from body up to the head
  ctx.strokeStyle = rgb(p.outline);
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(nx + 2, ny + 1);
  ctx.lineTo(hx + 1, hy + 3);
  ctx.stroke();
  ctx.strokeStyle = rgb(p.bodyMid);
  ctx.lineWidth = 4.4;
  ctx.beginPath();
  ctx.moveTo(nx + 2, ny + 1);
  ctx.lineTo(hx + 1, hy + 3);
  ctx.stroke();
  ctx.lineCap = "butt";

  // white neck ring — a bright collar band where neck meets head
  ctx.save();
  ctx.translate((nx + hx) * 0.5 + 1, (ny + hy) * 0.5 + 2);
  ctx.rotate(-0.5);
  ctx.fillStyle = rgb(p.ring);
  ctx.beginPath();
  ctx.ellipse(0, 0, 3.4, 1.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.outline, 0.3);
  ctx.beginPath();
  ctx.ellipse(0, 1, 3, 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // head — iridescent dark-green ovoid
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 4.4, 4.1, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.headGreen);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 3.8, 3.5, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // green sheen highlight (upper-left), strength from plumage/sheen
  ctx.fillStyle = rgb(p.headHi, 0.4 + 0.4 * p.sheen);
  ctx.beginPath();
  ctx.ellipse(hx - 1.4, hy - 1.4, 1.8, 1.5, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // red face wattle — a small patch around the eye/cheek
  ctx.fillStyle = rgb(p.wattle);
  ctx.beginPath();
  ctx.ellipse(hx - 1.6, hy + 0.6, 2.2, 1.7, -0.1, 0, Math.PI * 2);
  ctx.fill();

  // eye
  ctx.fillStyle = rgb([250, 246, 220]);
  ctx.beginPath();
  ctx.arc(hx - 1.4, hy - 0.2, 1.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb([20, 16, 14]);
  ctx.beginPath();
  ctx.arc(hx - 1.6, hy - 0.1, 0.6, 0, Math.PI * 2);
  ctx.fill();

  // beak — short pale wedge pointing lower-left
  ctx.fillStyle = rgb(p.beakLeg);
  ctx.beginPath();
  ctx.moveTo(hx - 3.4, hy + 0.2);
  ctx.lineTo(hx - 7, hy + 1.4);
  ctx.lineTo(hx - 3.4, hy + 1.8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgb(p.outline, 0.6);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(hx - 3.4, hy + 1.0);
  ctx.lineTo(hx - 6.6, hy + 1.5);
  ctx.stroke();

  // breath-fog puff at the beak (winter) — at rest a faint static puff
  if (p.breathFogAmt > 0.001) {
    ctx.fillStyle = rgb([235, 244, 255], 0.4 * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(hx - 9, hy + 1.6, 3, 2, 0.1, 0, Math.PI * 2);
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
  ctx.ellipse(0, 2, 28, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── THE single paint ────────────────────────────────────────────────────────

function paint(ctx: CanvasRenderingContext2D, pIn: P, bob: number): void {
  const p = clampP(pIn);
  ctx.save();
  try {
    paintPad(ctx, p);
    paintPheasant(ctx, p, bob);
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

    // A gentle head-bob and a slow tail-sway, layered on the breathing bob.
    // These are tiny dressing offsets; the silhouette stays the same object.
    // Both are 0 at t=0 so the still matches exactly, seamless over the loop.
    const headBob = (1 - Math.cos(t * 1.5)) * 0.5 * 0.8; // peaks mid-loop, 0 at t=0
    const tailSway = Math.sin(t * 0.7) * 1.2; // slow side-to-side, 0 at t=0

    // Paint with the breathing bob; the head/tail micro-motion is applied to a
    // lightly re-stamped head + tail over the base paint so the silhouette is
    // identical at rest.
    paint(ctx, SP[season], bob);

    // ── Additive micro-motion, drawn over the painted tile ──────────────────
    ctx.save();
    try {
      const bx = -1;
      const by = 5 - bob;
      const hx = bx - 12.5;
      const hy = by - 5;

      // slow tail-sway: re-stamp a faint highlight sweeping the tail (no shape
      // change to the silhouette — just a moving sheen along the feathers)
      if (Math.abs(tailSway) > 0.05) {
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([255, 240, 210], 0.18);
        ctx.beginPath();
        ctx.ellipse(bx + 14 + tailSway, by - 12, 2.4, 5, 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // gentle head-bob: a soft shadow nudge under the head to read the bob
      if (headBob > 0.02) {
        ctx.fillStyle = rgb([0, 0, 0], 0.08);
        ctx.beginPath();
        ctx.ellipse(hx, hy + 4 + headBob, 3.4, 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      if (season === "Spring") {
        // dew shimmer — a soft glint pulsing on the grass / blossoms
        const g = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.4));
        ctx.fillStyle = rgb([255, 255, 255], g);
        ctx.beginPath();
        ctx.arc(-8, 18.4, 1.1 + g, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(10, 19.6, 0.9 + g * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // iridescent head/neck sheen sweeping across the green head
        const s = 0.5 + 0.5 * Math.sin(t * 1.2);
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([130, 220, 170], 0.3 + 0.3 * s);
        ctx.beginPath();
        ctx.ellipse(hx - 0.6, hy - 0.6 + headBob, 2.6, 2.4, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (season === "Autumn") {
        // a fallen leaf stirs — gentle rock + tiny drift, seamless
        const a = Math.sin(t * 1.3) * 0.5;
        const dx = Math.sin(t * 0.7) * 1.2;
        ctx.save();
        ctx.translate(10 + dx, 20.5);
        ctx.rotate(0.7 + a);
        ctx.fillStyle = rgb([212, 150, 52], p.fallenLeafAmt);
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.6, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Winter: breath-fog puff gently pulses outward from the beak +
        // a drifting snowflake + a cold sheen.
        const breathe = 0.5 + 0.5 * Math.sin(t * 1.5);
        const reach = 4 + breathe * 3;
        ctx.fillStyle = rgb([235, 244, 255], (0.18 + 0.32 * breathe) * p.breathFogAmt);
        ctx.beginPath();
        ctx.ellipse(hx - reach - 5, hy + 1.6, 2.6 + breathe * 1.8, 1.8 + breathe * 1.2, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // one drifting snowflake on a seamless 3.4s fall
        const prog = ((t / 3.4) % 1 + 1) % 1;
        const fy = -20 + prog * 36;
        const fxx = 6 + Math.sin(prog * Math.PI * 2) * 4;
        ctx.fillStyle = rgb([255, 255, 255], 0.85);
        ctx.beginPath();
        ctx.arc(fxx, fy, 1.1, 0, Math.PI * 2);
        ctx.fill();

        // cold sheen pulse on the plumage
        const sheen = 0.5 + 0.5 * Math.sin(t * 0.8);
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([206, 224, 255], 0.1 + sheen * 0.12);
        ctx.beginPath();
        ctx.ellipse(bx, by, 11, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
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
