// Seasonal art for the HERD ALPACA board tile (`tile_herd_alpaca`).
//
// A SINGLE parameterized paint renders the whole tile (grass pad + the one
// fluffy alpaca + seasonal dressing) from a tweenable parameter set `P`. The
// four seasons are just four `P` presets; the three forward transitions lerp
// EVERY field of `P` through a quintic smoothstep, so transition(0) === the
// from-season still and transition(1) === the to-season still — no snap.
//
// PALETTE LOCK: the alpaca is ALWAYS the same tall cream/tan fluffy alpaca — a
// rounded woolly fleece body on slender legs, a long upright neck, a small head
// with perky ears, a gentle face, and a fluffy topknot. Seasons change only its
// fleece VOLUME (recently-shorn slimmer in spring → dense extra-fluffed in
// winter), the pad colour, the light wash, and dressing (blossom, fallen
// leaves, frost, back-snow, breath-fog). The animal's cream/tan identity colour
// never changes.
//
// Origin-centered in the −24..+24 design box. Animations are deterministic
// (sin/cos/modulo of `t` in seconds), seamless, and subtle. The subject's
// breathing bob has zero velocity at t=0 (A*(1-cos(w t))*0.5) so anim(…,0)
// matches the still exactly.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Small math helpers ──────────────────────────────────────────────────────

type RGB = [number, number, number];

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
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
function bobAt(t: number, amp = 1.1, w = 1.5): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────

interface P {
  fleeceLight: RGB; // bright top of the cream/tan fleece
  fleeceShadow: RGB; // shaded underside of the fleece
  faceDark: RGB; // muzzle + legs + ear tips (the darker parts)
  faceLight: RGB; // soft tan of the head/neck wool
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  fleeceVolume: number; // 0..1 puff of the fleece (shorn → extra-fluffed)
  frostAmt: number; // 0..1 frost sparkle on the fleece
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad
  breathFogAmt: number; // 0..1 breath puff at the nose
}

// Four season presets. The alpaca stays the SAME cream/tan fluffy alpaca; only
// fleece volume + pad + light + dressing differ.
const SP: Record<SeasonName, P> = {
  Spring: {
    fleeceLight: [248, 238, 214], // light recently-shorn cream
    fleeceShadow: [216, 198, 162],
    faceDark: [120, 96, 70],
    faceLight: [236, 218, 186],
    padGrass: [126, 198, 86], // bright lime dewy grass
    soil: [86, 132, 54],
    outline: [92, 72, 50],
    lightWash: [212, 238, 255], // cool-bright
    lightWashAmt: 0.16,
    fleeceVolume: 0.16, // recently-shorn: slimmer fleece
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.6,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  Summer: {
    fleeceLight: [244, 230, 200], // full warm cream/tan (PEAK)
    fleeceShadow: [210, 188, 150],
    faceDark: [116, 90, 64],
    faceLight: [230, 210, 176],
    padGrass: [86, 168, 64], // saturated mid-green
    soil: [58, 110, 40],
    outline: [88, 66, 46],
    lightWash: [255, 244, 206], // warm
    lightWashAmt: 0.14,
    fleeceVolume: 0.55, // full fleece (peak coverage)
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  Autumn: {
    fleeceLight: [238, 222, 188], // slightly warmer tan
    fleeceShadow: [204, 178, 138],
    faceDark: [112, 84, 58],
    faceLight: [224, 202, 166],
    padGrass: [156, 142, 78], // olive-tan
    soil: [104, 84, 44],
    outline: [86, 62, 42],
    lightWash: [255, 206, 138], // low amber
    lightWashAmt: 0.2,
    fleeceVolume: 0.74, // thicker fleece
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.7,
    breathFogAmt: 0,
  },
  Winter: {
    fleeceLight: [250, 244, 230], // cool-lit cream, still clearly cream
    fleeceShadow: [214, 204, 192],
    faceDark: [104, 84, 70],
    faceLight: [226, 214, 196],
    padGrass: [222, 232, 244], // snow on the pad
    soil: [150, 168, 190],
    outline: [86, 74, 70],
    lightWash: [206, 222, 248], // cool blue-grey
    lightWashAmt: 0.24,
    fleeceVolume: 1, // dense extra-fluffed fleece
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
    fleeceLight: lerpRGB(a.fleeceLight, b.fleeceLight, t),
    fleeceShadow: lerpRGB(a.fleeceShadow, b.fleeceShadow, t),
    faceDark: lerpRGB(a.faceDark, b.faceDark, t),
    faceLight: lerpRGB(a.faceLight, b.faceLight, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    fleeceVolume: lerp(a.fleeceVolume, b.fleeceVolume, t),
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
    fleeceVolume: clamp01(p.fleeceVolume),
    frostAmt: clamp01(p.frostAmt),
    backSnowAmt: clamp01(p.backSnowAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    breathFogAmt: clamp01(p.breathFogAmt),
  };
}

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat grass pad the alpaca stands on
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

// one slender leg: a thin dark cylinder with a soft foot at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number, dim = false): void {
  ctx.save();
  if (dim) ctx.globalAlpha = 0.85;
  ctx.strokeStyle = rgb(p.faceDark);
  ctx.lineWidth = 2.2; // slender alpaca legs (thinner than a sheep's)
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // foot
  ctx.fillStyle = rgb([54, 40, 30]);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 1.6, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
  ctx.restore();
}

// the fluffy fleece body — a rounded woolly mass whose lumps grow with volume.
// (constant silhouette: only the puff scale changes between seasons.)
function paintFleeceBody(
  ctx: CanvasRenderingContext2D,
  p: P,
  cx: number,
  cy: number,
  fill: string,
  scallop: number,
): void {
  // volume modestly puffs the fleece: from slim (shorn) to dense (winter)
  const vol = 0.86 + p.fleeceVolume * 0.34;
  const rx = 11.5 * vol;
  const ry = 8.4 * vol;
  ctx.fillStyle = fill;
  // base body ellipse
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  // scalloped wool lumps around the perimeter
  const lumps = 11;
  const lumpR = (2 + p.fleeceVolume * 1.5) * scallop;
  for (let i = 0; i < lumps; i++) {
    const a = (i / lumps) * Math.PI * 2 - Math.PI / 2;
    const lx = cx + Math.cos(a) * rx * 0.98;
    const ly = cy + Math.sin(a) * ry * 0.98;
    ctx.beginPath();
    ctx.arc(lx, ly, lumpR, 0, Math.PI * 2);
    ctx.fill();
  }
}

// the long upright neck + small head, swung by `swing` (radians) for idle sway.
// Drawn as its own helper so the neck can sway as a unit around its base.
function paintNeckHead(ctx: CanvasRenderingContext2D, p: P, baseX: number, baseY: number, swing: number, earFlick: number): void {
  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.rotate(swing); // gentle sway pivots the whole neck at its base

  // ── NECK — a tall woolly column rising up toward the head (constant shape)
  const neckTopX = -2.4;
  const neckTopY = -16;
  // outline pass
  ctx.strokeStyle = rgb(p.outline);
  ctx.lineCap = "round";
  ctx.lineWidth = 8 + p.fleeceVolume * 2.4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-3.2, -8, neckTopX, neckTopY);
  ctx.stroke();
  // shaded fleece column
  ctx.strokeStyle = rgb(p.fleeceShadow);
  ctx.lineWidth = 6.4 + p.fleeceVolume * 2.4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-3.2, -8, neckTopX, neckTopY);
  ctx.stroke();
  // light fleece column, offset up-left (light from upper-left)
  ctx.strokeStyle = rgb(p.fleeceLight);
  ctx.lineWidth = 4 + p.fleeceVolume * 2;
  ctx.beginPath();
  ctx.moveTo(-1, -1);
  ctx.quadraticCurveTo(-4.2, -9, neckTopX - 1, neckTopY - 1);
  ctx.stroke();
  ctx.lineCap = "butt";

  // ── HEAD — small, at the top of the neck, turned toward lower-left ──────────
  const hx = neckTopX - 1.6;
  const hy = neckTopY - 3.4;

  // ears (perky, upright) — behind the head; one flicks in idle
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(hx + side * 2.2, hy - 3);
    const flick = side === 1 ? earFlick : 0; // right (near) ear flicks
    ctx.rotate(side * 0.34 + flick * 0.5);
    // outline
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.ellipse(0, -2.6, 1.8, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // fleece-tan ear
    ctx.fillStyle = rgb(p.faceLight);
    ctx.beginPath();
    ctx.ellipse(0, -2.6, 1.2, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // dark inner tip
    ctx.fillStyle = rgb(p.faceDark);
    ctx.beginPath();
    ctx.ellipse(0, -1.6, 0.6, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // head outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 4.4, 4.0, 0, 0, Math.PI * 2);
  ctx.fill();
  // head — soft tan fleece dome
  ctx.fillStyle = rgb(p.faceLight);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 3.7, 3.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // fluffy topknot (the alpaca's signature crown tuft) — sits above the head
  ctx.fillStyle = rgb(p.fleeceLight);
  for (const [tx, ty, tr] of [[-1.4, -3.6, 1.9], [1.2, -4, 1.7], [-0.2, -4.6, 1.5]] as const) {
    ctx.beginPath();
    ctx.arc(hx + tx, hy + ty, tr, 0, Math.PI * 2);
    ctx.fill();
  }

  // muzzle — a short darker snout toward lower-left (gentle face)
  ctx.fillStyle = rgb(p.faceDark);
  ctx.beginPath();
  ctx.ellipse(hx - 2.4, hy + 2.2, 2.4, 1.8, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // gentle cheek light (upper-left)
  ctx.fillStyle = rgb([255, 255, 255], 0.12);
  ctx.beginPath();
  ctx.ellipse(hx - 1.4, hy - 1.2, 1.6, 1.9, 0, 0, Math.PI * 2);
  ctx.fill();
  // eyes — soft and gentle
  ctx.fillStyle = rgb([36, 28, 24]);
  for (const [ex, ey] of [[-2.1, -0.2], [0.6, -0.4]] as const) {
    ctx.beginPath();
    ctx.arc(hx + ex, hy + ey, 0.78, 0, Math.PI * 2);
    ctx.fill();
  }
  // tiny eye glints
  ctx.fillStyle = rgb([255, 255, 255], 0.85);
  for (const [ex, ey] of [[-2.3, -0.45], [0.4, -0.65]] as const) {
    ctx.beginPath();
    ctx.arc(hx + ex, hy + ey, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // nostril dots on the muzzle
  ctx.fillStyle = rgb([24, 18, 16]);
  for (const ex of [-3.2, -2.0]) {
    ctx.beginPath();
    ctx.ellipse(hx + ex, hy + 2.8, 0.42, 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// the whole alpaca, standing front-¾ turned toward lower-left
function paintAlpaca(ctx: CanvasRenderingContext2D, p: P, bob: number, neckSwing: number, earFlick: number): void {
  // body centre lifts with the breathing bob
  const bx = 1;
  const by = 6 - bob;

  // legs first (behind the fleece). Slender; tall alpaca stance, contact on pad.
  // back legs slightly higher contact + dimmer for depth
  paintLeg(ctx, p, bx + 6, by + 5, 18.6, true);
  paintLeg(ctx, p, bx - 5.5, by + 5, 18.9, true);
  // front legs
  paintLeg(ctx, p, bx + 3, by + 5, 19.2);
  paintLeg(ctx, p, bx - 3, by + 5, 19.4);

  // FLEECE BODY — dark outline pass first, then shade, then light (layered)
  paintFleeceBody(ctx, p, bx, by, rgb(p.outline), 1.18); // outline halo
  paintFleeceBody(ctx, p, bx, by, rgb(p.fleeceShadow), 1.0); // shaded fleece
  // light fleece offset up-left (light from upper-left)
  ctx.save();
  ctx.translate(-1.4, -1.6);
  paintFleeceBody(ctx, p, bx, by, rgb(p.fleeceLight), 0.82);
  ctx.restore();

  // small fluffy tail tuft at the upper-right rear of the fleece
  ctx.fillStyle = rgb(p.fleeceLight);
  ctx.beginPath();
  ctx.arc(bx + 11, by - 2, 2.2 + p.fleeceVolume * 0.6, 0, Math.PI * 2);
  ctx.fill();

  // snow settled on the back (winter) — a soft white cap on top of the fleece
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgb([248, 252, 255], 0.92 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 1, by - 7, 8 * (0.9 + p.fleeceVolume * 0.3), 3.1, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb([255, 255, 255], 0.85 * p.backSnowAmt);
    for (const [dx, dy] of [[-4, -7.8], [1, -8.2], [5, -7.2]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.5 + p.fleeceVolume * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the fleece (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([255, 255, 255], 0.8 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-7, 0], [-3, 4], [4, -2], [7, 2], [0, -3], [-4, -5], [6, 4],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── NECK + HEAD — long upright neck rising from the front of the fleece ─────
  // neck base sits at the front-upper-left of the body
  const neckBaseX = bx - 6;
  const neckBaseY = by - 4;
  paintNeckHead(ctx, p, neckBaseX, neckBaseY, neckSwing, earFlick);

  // breath-fog puff at the nose (winter) — at rest a faint static puff.
  // (positioned relative to the head's rest pose; the animated puff is layered
  // additively in anim with the live neck transform.)
  if (p.breathFogAmt > 0.001) {
    ctx.fillStyle = rgb([235, 244, 255], 0.4 * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(neckBaseX - 8, neckBaseY - 17, 3, 2.1, 0.2, 0, Math.PI * 2);
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
  ctx.ellipse(0, 2, 26, 27, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── THE single paint ────────────────────────────────────────────────────────

function paint(ctx: CanvasRenderingContext2D, pIn: P, bob: number, neckSwing = 0, earFlick = 0): void {
  const p = clampP(pIn);
  ctx.save();
  try {
    paintPad(ctx, p);
    paintAlpaca(ctx, p, bob, neckSwing, earFlick);
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

    // ── gentle neck sway + an ear flick once per loop ───────────────────────
    // neck sway: a slow seamless lean, 0 at t=0 so the still matches.
    const neckSwing = 0.06 * (1 - Math.cos(t * 0.9)) * 0.5 * Math.sin(t * 0.45);
    // ear flick: a sharp brief bump once per ~5s loop, seamless (0 at edges).
    const loop = (t % 5) / 5; // 0..1
    const flickGate = Math.max(0, Math.sin(loop * Math.PI * 2)) ** 6;
    const earFlick = Math.sin(t * 9) * flickGate;

    paint(ctx, SP[season], bob, neckSwing, earFlick);

    // ── Additive season micro-motion, drawn over the painted tile ───────────
    ctx.save();
    try {
      const bx = 1;
      const by = 6 - bob;
      const neckBaseX = bx - 6;
      const neckBaseY = by - 4;
      // approximate head position under the live neck sway (small-angle)
      const headX = neckBaseX - 4 - neckSwing * 16;
      const headY = neckBaseY - 19;

      if (season === "Spring") {
        // dew shimmer — a soft glint that pulses on the grass/blossoms
        const g = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.4));
        ctx.fillStyle = rgb([255, 255, 255], g);
        ctx.beginPath();
        ctx.arc(-8, 18.4, 1.1 + g, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(10, 19.6, 0.9 + g * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // soft fleece sheen sweeping across the wool
        const s = 0.5 + 0.5 * Math.sin(t * 1.1);
        const sx = bx - 8 + s * 16;
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([255, 255, 255], 0.32);
        ctx.beginPath();
        ctx.ellipse(sx, by - 1, 3, 5.5, 0.3, 0, Math.PI * 2);
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
        // Winter: breath-fog puff gently pulses outward from the nose +
        // a drifting snowflake + a cold sheen.
        const breathe = 0.5 + 0.5 * Math.sin(t * 1.5);
        const reach = 4 + breathe * 3;
        ctx.fillStyle = rgb([235, 244, 255], (0.18 + 0.32 * breathe) * p.breathFogAmt);
        ctx.beginPath();
        ctx.ellipse(headX - reach, headY + 2, 2.4 + breathe * 1.7, 1.7 + breathe * 1.1, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // one drifting snowflake on a seamless 3.4s fall
        const prog = ((t / 3.4) % 1 + 1) % 1;
        const fy = -20 + prog * 36;
        const fxx = 6 + Math.sin(prog * Math.PI * 2) * 4;
        ctx.fillStyle = rgb([255, 255, 255], 0.85);
        ctx.beginPath();
        ctx.arc(fxx, fy, 1.1, 0, Math.PI * 2);
        ctx.fill();

        // cold sheen pulse on the fleece
        const sheen = 0.5 + 0.5 * Math.sin(t * 0.8);
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([206, 224, 255], 0.12 + sheen * 0.14);
        ctx.beginPath();
        ctx.ellipse(bx, by, 11.5, 8.4, 0, 0, Math.PI * 2);
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
