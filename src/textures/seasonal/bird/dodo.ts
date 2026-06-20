// Seasonal art for the BIRD DODO board tile (`tile_bird_dodo`).
// Source: src/textures/seasonal/bird/dodo.ts
//
// A SINGLE parameterized paint renders the whole tile (grass pad + the one
// plump dodo + seasonal dressing) from a tweenable parameter set `P`. The four
// seasons are just four `P` presets; the three forward transitions lerp EVERY
// field of `P` through a quintic smoothstep, so transition(0) === the
// from-season still and transition(1) === the to-season still — no snap.
//
// PALETTE LOCK: the dodo is ALWAYS the same round, plump GREY dodo with a big
// hooked YELLOW-GREY beak on a bare greyish face, tiny stubby useless wings,
// sturdy YELLOW legs, and a small tuft of curly tail feathers. The COMICAL
// SILHOUETTE is constant across every season. Seasons change only its plumage
// tone + a modest fluff (winter), the pad colour, the light wash, and dressing
// (blossom, fallen leaves, frost, back-snow, breath-fog). Its identity colours
// never change.
//
// Animal framing: the dodo stands front-¾ on the pad, turned ~15–20° toward
// lower-left, full body readable, legs in contact with the pad.
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
  bodyLight: RGB; // bright top of the grey plumage
  bodyMid: RGB; // body tone
  bodyShadow: RGB; // shaded underside of the plumage
  faceBare: RGB; // bare greyish face skin
  beak: RGB; // big hooked beak (yellow-grey)
  beakDark: RGB; // shaded underside / hook of the beak
  legs: RGB; // sturdy yellow legs + feet
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  plumeVolume: number; // 0..1 modest fluff of the plumage outline (winter)
  sheenAmt: number; // 0..1 soft feather sheen (summer)
  frostAmt: number; // 0..1 frost sparkle on the plumage
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad
  breathFogAmt: number; // 0..1 breath puff at the beak
}

// Four season presets. The dodo stays the SAME round grey big-beaked bird;
// only plumage tone + fluff + pad + light + dressing differ.
const SP: Record<SeasonName, P> = {
  // Spring — soft (lightly-desaturated) grey plumage, dewy lime pad + blossom.
  Spring: {
    bodyLight: [188, 192, 196],
    bodyMid: [150, 154, 160],
    bodyShadow: [108, 112, 120],
    faceBare: [176, 174, 170],
    beak: [206, 192, 130],
    beakDark: [150, 134, 84],
    legs: [224, 188, 86],
    padGrass: [128, 206, 86], // bright lime dewy grass
    soil: [86, 132, 54],
    outline: [62, 60, 64],
    lightWash: [216, 240, 255], // cool-bright
    lightWashAmt: 0.16,
    plumeVolume: 0.22,
    sheenAmt: 0,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.7,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Summer — full grey-brown plumage (PEAK, richest), mid-green pad, warm light.
  Summer: {
    bodyLight: [176, 170, 162],
    bodyMid: [138, 130, 122],
    bodyShadow: [96, 90, 86],
    faceBare: [168, 162, 154],
    beak: [212, 196, 126],
    beakDark: [152, 132, 76],
    legs: [232, 192, 80],
    padGrass: [86, 168, 64], // saturated mid-green
    soil: [58, 110, 40],
    outline: [56, 52, 50],
    lightWash: [255, 244, 206], // warm
    lightWashAmt: 0.14,
    plumeVolume: 0.42,
    sheenAmt: 0.6,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Autumn — fuller plumage, olive-tan browning pad, fallen leaves, amber light.
  Autumn: {
    bodyLight: [180, 168, 152],
    bodyMid: [142, 128, 112],
    bodyShadow: [100, 88, 76],
    faceBare: [170, 160, 148],
    beak: [206, 184, 110],
    beakDark: [148, 124, 68],
    legs: [220, 178, 70],
    padGrass: [156, 142, 78], // olive-tan
    soil: [104, 84, 44],
    outline: [58, 50, 44],
    lightWash: [255, 206, 138], // low amber
    lightWashAmt: 0.2,
    plumeVolume: 0.6,
    sheenAmt: 0,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.7,
    breathFogAmt: 0,
  },
  // Winter — fluffed feathers, cool blue-grey light, snow on the back + a breath
  // fog at the beak; snowy pad. The grey dodo stays clearly visible underneath.
  Winter: {
    bodyLight: [196, 200, 208],
    bodyMid: [150, 156, 166],
    bodyShadow: [104, 110, 124],
    faceBare: [178, 178, 182],
    beak: [200, 188, 134],
    beakDark: [146, 130, 86],
    legs: [214, 176, 84],
    padGrass: [222, 232, 244], // snow on the pad
    soil: [150, 168, 190],
    outline: [70, 70, 84],
    lightWash: [206, 222, 248], // cool blue-grey
    lightWashAmt: 0.24,
    plumeVolume: 1, // extra-fluffed feathers
    sheenAmt: 0,
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
    bodyShadow: lerpRGB(a.bodyShadow, b.bodyShadow, t),
    faceBare: lerpRGB(a.faceBare, b.faceBare, t),
    beak: lerpRGB(a.beak, b.beak, t),
    beakDark: lerpRGB(a.beakDark, b.beakDark, t),
    legs: lerpRGB(a.legs, b.legs, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    plumeVolume: lerp(a.plumeVolume, b.plumeVolume, t),
    sheenAmt: lerp(a.sheenAmt, b.sheenAmt, t),
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
    plumeVolume: clamp01(p.plumeVolume),
    sheenAmt: clamp01(p.sheenAmt),
    frostAmt: clamp01(p.frostAmt),
    backSnowAmt: clamp01(p.backSnowAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    breathFogAmt: clamp01(p.breathFogAmt),
  };
}

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat grass pad the dodo stands on
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

// one sturdy yellow leg: a short cylinder with a three-toed foot at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  // leg outline pass for a soft dark rim
  ctx.strokeStyle = rgb(p.outline);
  ctx.lineWidth = 4.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // yellow leg
  ctx.strokeStyle = rgb(p.legs);
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // three-toed foot fanning forward (toward lower-left)
  ctx.strokeStyle = rgb(p.legs);
  ctx.lineWidth = 1.8;
  for (const dx of [-2.6, -0.4, 2] as const) {
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + dx, baseY + 1.4);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

// the round plump body — a fat egg-shaped cloud of grey plumage; the fluffed
// outline grows modestly with plumeVolume (winter), silhouette stays constant.
function paintBody(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number, fill: string, scallop: number): void {
  const vol = 0.9 + p.plumeVolume * 0.22;
  const rx = 11.5 * vol;
  const ry = 12.5 * vol; // taller-than-wide round plump body
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  // soft feathery lumps around the perimeter (gentle, not woolly scallops)
  const lumps = 13;
  const lumpR = (1.6 + p.plumeVolume * 1.4) * scallop;
  for (let i = 0; i < lumps; i++) {
    const a = (i / lumps) * Math.PI * 2 - Math.PI / 2;
    const lx = cx + Math.cos(a) * rx * 0.96;
    const ly = cy + Math.sin(a) * ry * 0.96;
    ctx.beginPath();
    ctx.arc(lx, ly, lumpR, 0, Math.PI * 2);
    ctx.fill();
  }
}

// the whole dodo, standing front-¾ turned toward lower-left
function paintDodo(ctx: CanvasRenderingContext2D, p: P, bob: number): void {
  // body centre lifts with the breathing bob
  const bx = 1;
  const by = 3 - bob;

  // ── legs first (behind the body). Two sturdy yellow legs on the pad. ───────
  paintLeg(ctx, p, bx - 3, by + 8, 19.4);
  paintLeg(ctx, p, bx + 3.5, by + 8, 18.9);

  // ── small curly tail-feather tuft at the upper-right rear (behind body) ────
  ctx.save();
  ctx.strokeStyle = rgb(p.bodyLight);
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  for (const [ox, oy, curl] of [[0, -2, 0.8], [1.6, 0.4, 1.0], [0.6, 2.2, 0.6]] as const) {
    ctx.beginPath();
    ctx.moveTo(bx + 9.5 + ox, by - 4 + oy);
    ctx.quadraticCurveTo(bx + 13 + ox, by - 5 + oy, bx + 13.6 + ox, by - 2 + oy + curl);
    ctx.quadraticCurveTo(bx + 14 + ox, by + 0.6 + oy, bx + 12 + ox, by + oy);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  ctx.restore();

  // ── BODY — dark outline pass first, then shaded fill, then lit fill ────────
  paintBody(ctx, p, bx, by, rgb(p.outline), 1.16); // outline halo
  paintBody(ctx, p, bx, by, rgb(p.bodyShadow), 1.0); // shaded plumage
  // mid body
  ctx.fillStyle = rgb(p.bodyMid);
  ctx.beginPath();
  ctx.ellipse(bx, by, 11.2, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit plumage offset up-left (light from upper-left)
  ctx.save();
  ctx.translate(-1.6, -2);
  ctx.fillStyle = rgb(p.bodyLight);
  ctx.beginPath();
  ctx.ellipse(bx, by, 8.4, 9.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── tiny stubby useless wing on the near (left) flank ──────────────────────
  ctx.save();
  ctx.translate(bx - 8.5, by + 1.5);
  ctx.rotate(0.5);
  ctx.fillStyle = rgb(p.bodyShadow);
  ctx.beginPath();
  ctx.ellipse(0, 0, 3.6, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.bodyMid);
  ctx.beginPath();
  ctx.ellipse(-0.4, -0.4, 2.8, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // snow settled on the back (winter) — a soft white cap on top of the body
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgb([248, 252, 255], 0.92 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 1, by - 9.6, 8 * (0.9 + p.plumeVolume * 0.25), 3.2, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb([255, 255, 255], 0.85 * p.backSnowAmt);
    for (const [dx, dy] of [[-4, -10.6], [1, -11.2], [5, -10] ] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.4 + p.plumeVolume * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the plumage (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([255, 255, 255], 0.8 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-6, -2], [-2, 4], [3, -4], [6, 1], [0, -6], [-4, 1], [4, 5],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── HEAD (front-¾, set high-left over the body) ────────────────────────────
  // The dodo's head sits up-left on a thick neck; bare greyish face + huge beak.
  const hx = bx - 7.5;
  const hy = by - 9.5;

  // thick neck connecting body to head
  ctx.strokeStyle = rgb(p.outline);
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx - 3, by - 5);
  ctx.lineTo(hx + 1.5, hy + 3);
  ctx.stroke();
  ctx.strokeStyle = rgb(p.bodyMid);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(bx - 3, by - 5);
  ctx.lineTo(hx + 1.5, hy + 3);
  ctx.stroke();
  ctx.lineCap = "butt";

  // head — bare greyish face ovoid (outline then fill)
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 6.2, 6.6, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.faceBare);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 5.4, 5.8, -0.12, 0, Math.PI * 2);
  ctx.fill();
  // gentle cheek light (upper-left)
  ctx.fillStyle = rgb([255, 255, 255], 0.12);
  ctx.beginPath();
  ctx.ellipse(hx - 1.6, hy - 1.8, 2.4, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // eye — small, set on the face
  ctx.fillStyle = rgb([245, 245, 240]);
  ctx.beginPath();
  ctx.arc(hx - 1.6, hy - 1, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb([22, 20, 22]);
  ctx.beginPath();
  ctx.arc(hx - 1.8, hy - 0.8, 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb([255, 255, 255], 0.9);
  ctx.beginPath();
  ctx.arc(hx - 2.1, hy - 1.2, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // ── BIG HOOKED BEAK — the iconic dodo feature, pointing down-left ──────────
  // A large yellow-grey beak: a broad base off the lower face curling to a
  // hooked tip. Outline pass, then fill, then a shaded hook + highlight.
  ctx.save();
  ctx.translate(hx - 3.5, hy + 2.6);
  ctx.rotate(0.5);
  // outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.moveTo(2.4, -4);
  ctx.quadraticCurveTo(-6.5, -2.4, -8.6, 3.6); // upper edge sweeping down-left
  ctx.quadraticCurveTo(-9.6, 6.8, -6.2, 7.4); // the hooked tip curling down
  ctx.quadraticCurveTo(-7.4, 4.6, -3, 3.2); // underside back toward the base
  ctx.quadraticCurveTo(0.6, 2.2, 2.4, -1); // base underside
  ctx.closePath();
  ctx.fill();
  // beak fill
  ctx.fillStyle = rgb(p.beak);
  ctx.beginPath();
  ctx.moveTo(2, -3.4);
  ctx.quadraticCurveTo(-6, -1.8, -7.9, 3.6);
  ctx.quadraticCurveTo(-8.7, 6.2, -6, 6.7);
  ctx.quadraticCurveTo(-6.9, 4.4, -2.8, 2.9);
  ctx.quadraticCurveTo(0.4, 1.9, 2, -0.8);
  ctx.closePath();
  ctx.fill();
  // shaded underside + hook (darker)
  ctx.fillStyle = rgb(p.beakDark);
  ctx.beginPath();
  ctx.moveTo(-5.6, 6.6);
  ctx.quadraticCurveTo(-8.6, 6.0, -7.6, 3.4);
  ctx.quadraticCurveTo(-6.4, 4.6, -3, 3.2);
  ctx.quadraticCurveTo(-4.2, 5.2, -5.6, 6.6);
  ctx.closePath();
  ctx.fill();
  // soft highlight along the lit upper ridge
  ctx.strokeStyle = rgb([255, 255, 255], 0.32);
  ctx.lineWidth = 1;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(1.4, -2.6);
  ctx.quadraticCurveTo(-5, -1, -7, 3);
  ctx.stroke();
  // nostril slit near the base
  ctx.strokeStyle = rgb(p.beakDark);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-1.4, -0.4);
  ctx.lineTo(-3.2, 0.8);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.restore();

  // breath-fog puff at the beak tip (winter) — at rest a faint static puff
  if (p.breathFogAmt > 0.001) {
    ctx.fillStyle = rgb([235, 244, 255], 0.4 * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(hx - 9, hy + 6, 3, 2.1, 0.2, 0, Math.PI * 2);
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
  ctx.ellipse(0, 4, 26, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── THE single paint ────────────────────────────────────────────────────────

function paint(ctx: CanvasRenderingContext2D, pIn: P, bob: number): void {
  const p = clampP(pIn);
  ctx.save();
  try {
    paintPad(ctx, p);
    paintDodo(ctx, p, bob);
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

    // A slow head-bob and a comical little waddle sway, once per ~5s loop. Both
    // are seamless (0 at t=0). We pre-translate so the whole dodo sways, then
    // the head is nudged a touch more for the head-bob.
    const loop = (t % 5) / 5; // 0..1
    const waddle = Math.sin(loop * Math.PI * 2) * (1 - bob / 1.2) * 1.4; // sway, fades with bob
    const headDip = Math.max(0, Math.sin(loop * Math.PI * 4)) ** 2 * 1.3; // slow head-bob

    ctx.save();
    ctx.translate(waddle * 0.5, 0);
    paint(ctx, SP[season], bob);
    ctx.restore();

    // ── Additive micro-motion, drawn over the painted tile ──────────────────
    ctx.save();
    try {
      const bx = 1 + waddle * 0.5;
      const by = 3 - bob;
      const hx = bx - 7.5;
      const hy = by - 9.5 + headDip; // head bobs down a touch

      // re-stamp the head + beak nudged by the head-bob so it reads as a bob
      if (headDip > 0.05) {
        // bare face
        ctx.fillStyle = rgb(p.faceBare);
        ctx.beginPath();
        ctx.ellipse(hx, hy, 5.2, 5.6, -0.12, 0, Math.PI * 2);
        ctx.fill();
        // eye
        ctx.fillStyle = rgb([22, 20, 22]);
        ctx.beginPath();
        ctx.arc(hx - 1.8, hy - 0.8, 0.85, 0, Math.PI * 2);
        ctx.fill();
        // a hint of the beak dipping
        ctx.save();
        ctx.translate(hx - 3.5, hy + 2.6);
        ctx.rotate(0.5);
        ctx.fillStyle = rgb(p.beak);
        ctx.beginPath();
        ctx.moveTo(2, -3.4);
        ctx.quadraticCurveTo(-6, -1.8, -7.9, 3.6);
        ctx.quadraticCurveTo(-8.7, 6.2, -6, 6.7);
        ctx.quadraticCurveTo(-6.9, 4.4, -2.8, 2.9);
        ctx.quadraticCurveTo(0.4, 1.9, 2, -0.8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

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
        // soft feather sheen sweeping across the plumage
        const s = 0.5 + 0.5 * Math.sin(t * 1.1);
        const sx = bx - 9 + s * 18;
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([255, 255, 255], 0.3 + 0.15 * p.sheenAmt);
        ctx.beginPath();
        ctx.ellipse(sx, by - 2, 3, 8, 0.3, 0, Math.PI * 2);
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
        ctx.ellipse(hx - 6 - reach, hy + 6, 2.6 + breathe * 1.8, 1.8 + breathe * 1.2, 0.2, 0, Math.PI * 2);
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
        ctx.fillStyle = rgb([206, 224, 255], 0.12 + sheen * 0.14);
        ctx.beginPath();
        ctx.ellipse(bx, by, 11.5, 12.5, 0, 0, Math.PI * 2);
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
