// Seasonal art for the BIRD TURKEY board tile (`tile_bird_turkey`).
// Source: src/textures/seasonal/bird/turkey.ts
//
// A SINGLE parameterized paint renders the whole tile (grass pad + the one
// bronze turkey + seasonal dressing) from a tweenable parameter set `P`. The
// four seasons are just four `P` presets; the three forward transitions lerp
// EVERY field of `P` through a quintic smoothstep, so transition(0) === the
// from-season still and transition(1) === the to-season still — no snap.
//
// PALETTE LOCK: the subject is ALWAYS the same plump bronze turkey — a small
// head with a RED wattle/snood at the throat, a dark bronze-brown iridescent
// body, and a big fanned tail of layered feathers spread behind it. Its
// SILHOUETTE (body + fanned tail) is IDENTICAL every season. Seasons change
// only the bronze richness/iridescence, the pad colour, the light wash, the
// winter feather fluff (`fluff`), and dressing (blossom, fallen leaves, frost,
// back-snow, breath-fog). The turkey's identity colours never change.
//
// Origin-centered in the −24..+24 design box, light from upper-left. Animations
// are deterministic (sin/cos/modulo of `t` in seconds), seamless, and subtle.
// The subject's breathing bob has zero velocity at t=0 (A*(1-cos(w t))*0.5) so
// anim(…,0) matches the still exactly; season micro-motion is layered additively.

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
  bodyLight: RGB; // lit top of the bronze body
  bodyMid: RGB; // body tone
  bodyDark: RGB; // shaded underside / breast
  sheen: RGB; // iridescent sheen tint on the body + tail
  tailLight: RGB; // lit band of the fanned tail feathers
  tailMid: RGB; // mid band of the tail
  tailDark: RGB; // base / dark band of the tail
  tailTip: RGB; // pale feather-tip band of the fan
  wattle: RGB; // red wattle/snood at the throat (LOCKED red)
  beak: RGB; // small horn beak
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  irid: number; // 0..1 iridescent sheen strength (peak in summer)
  fluff: number; // 0..1 winter feather fluff (modest puff of the body outline)
  frostAmt: number; // 0..1 frost sparkle on the feathers
  backSnowAmt: number; // 0..1 snow settled on its back + tail
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad (autumn)
  breathFogAmt: number; // 0..1 breath puff at the beak (winter)
}

// Four season presets. The turkey stays the SAME bronze, red-wattled,
// fan-tailed bird; only richness + pad + light + fluff + dressing differ.
const SP: Record<SeasonName, P> = {
  // Spring — bronze plumage, dewy lime pad + blossom, cool-bright light.
  Spring: {
    bodyLight: [150, 104, 54],
    bodyMid: [108, 70, 36],
    bodyDark: [66, 42, 24],
    sheen: [120, 140, 96],
    tailLight: [168, 122, 66],
    tailMid: [120, 80, 42],
    tailDark: [74, 48, 26],
    tailTip: [222, 196, 150],
    wattle: [204, 52, 46],
    beak: [206, 170, 96],
    padGrass: [128, 206, 86], // bright lime dewy grass
    soil: [86, 132, 54],
    outline: [44, 28, 18],
    lightWash: [216, 240, 255], // cool-bright
    lightWashAmt: 0.16,
    irid: 0.32,
    fluff: 0.12,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.6,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Summer — richest iridescent bronze (PEAK), saturated mid-green pad, warm light.
  Summer: {
    bodyLight: [178, 120, 58],
    bodyMid: [128, 78, 36],
    bodyDark: [76, 44, 22],
    sheen: [96, 168, 132], // strong green-gold iridescence
    tailLight: [192, 138, 70],
    tailMid: [134, 86, 42],
    tailDark: [82, 50, 26],
    tailTip: [236, 210, 158],
    wattle: [214, 44, 40],
    beak: [214, 176, 98],
    padGrass: [86, 168, 64], // saturated mid-green
    soil: [58, 110, 40],
    outline: [46, 28, 16],
    lightWash: [255, 244, 206], // warm
    lightWashAmt: 0.16,
    irid: 1.0, // PEAK sheen
    fluff: 0.2,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Autumn — warm bronze, olive-tan browning pad, fallen leaves, low amber light.
  Autumn: {
    bodyLight: [166, 110, 52],
    bodyMid: [120, 72, 34],
    bodyDark: [72, 42, 22],
    sheen: [150, 120, 70], // warm gold sheen
    tailLight: [186, 128, 62],
    tailMid: [128, 80, 40],
    tailDark: [78, 48, 24],
    tailTip: [230, 198, 138],
    wattle: [200, 48, 42],
    beak: [206, 168, 92],
    padGrass: [156, 142, 78], // olive-tan
    soil: [104, 84, 44],
    outline: [48, 30, 18],
    lightWash: [255, 206, 138], // low amber
    lightWashAmt: 0.2,
    irid: 0.5,
    fluff: 0.34,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.7,
    breathFogAmt: 0,
  },
  // Winter — fluffed feathers, a little snow on back/tail, breath fog; snowy
  // pad, cool blue-grey light. The bronze stays clearly visible underneath.
  Winter: {
    bodyLight: [142, 100, 56],
    bodyMid: [104, 70, 40],
    bodyDark: [66, 44, 30],
    sheen: [120, 140, 150],
    tailLight: [160, 120, 70],
    tailMid: [116, 82, 48],
    tailDark: [74, 50, 32],
    tailTip: [226, 214, 196],
    wattle: [196, 56, 54],
    beak: [200, 172, 116],
    padGrass: [222, 232, 244], // snow on the pad
    soil: [150, 168, 190],
    outline: [52, 38, 34],
    lightWash: [206, 222, 248], // cool blue-grey
    lightWashAmt: 0.24,
    irid: 0.28,
    fluff: 1.0, // extra-puffed feathers
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
    sheen: lerpRGB(a.sheen, b.sheen, t),
    tailLight: lerpRGB(a.tailLight, b.tailLight, t),
    tailMid: lerpRGB(a.tailMid, b.tailMid, t),
    tailDark: lerpRGB(a.tailDark, b.tailDark, t),
    tailTip: lerpRGB(a.tailTip, b.tailTip, t),
    wattle: lerpRGB(a.wattle, b.wattle, t),
    beak: lerpRGB(a.beak, b.beak, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    irid: lerp(a.irid, b.irid, t),
    fluff: lerp(a.fluff, b.fluff, t),
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
    irid: clamp01(p.irid),
    fluff: clamp01(p.fluff),
    frostAmt: clamp01(p.frostAmt),
    backSnowAmt: clamp01(p.backSnowAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    breathFogAmt: clamp01(p.breathFogAmt),
  };
}

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat grass pad the turkey stands on
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

// one leg: a short pink-horn cylinder with a three-toed foot at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  ctx.strokeStyle = rgb([196, 132, 96]);
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // simple three-toed foot
  ctx.strokeStyle = rgb([176, 116, 84]);
  ctx.lineWidth = 1.6;
  for (const dx of [-2, 0, 2]) {
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + dx, baseY + 1.6);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

// The big fanned tail of layered feathers spread BEHIND the body. The fan
// SHAPE is constant every season; only colours + fluff (slightly wider spread)
// change. `fanSpread` is a tiny additive tweak used by the idle shimmer only.
function paintTailFan(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number, fanSpread: number): void {
  const feathers = 11;
  const half = (feathers - 1) / 2;
  // fluff widens the arc & lengthens the feathers a touch (constant silhouette family)
  const arc = (Math.PI * 0.96) * (1 + p.fluff * 0.06) + fanSpread;
  const len = 18.5 + p.fluff * 1.2;
  // dark outline halo behind the whole fan
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(cx, cy, len * 0.92, len * 0.84, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < feathers; i++) {
    const f = (i - half) / half; // −1..+1
    const ang = -Math.PI / 2 + f * (arc / 2); // fan upward, centered overhead-rear
    const tipX = cx + Math.cos(ang) * len;
    const tipY = cy + Math.sin(ang) * len * 0.9;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang + Math.PI / 2);
    const fl = len; // feather length along its own axis
    // one feather: dark base → mid → pale tip band (layered dark-then-light)
    // base/dark
    ctx.fillStyle = rgb(p.tailDark);
    ctx.beginPath();
    ctx.ellipse(0, -fl * 0.5, 2.6, fl * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // mid band
    ctx.fillStyle = rgb(p.tailMid);
    ctx.beginPath();
    ctx.ellipse(0, -fl * 0.56, 2.0, fl * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    // lit band (light from upper-left → feathers on the left read brighter)
    ctx.fillStyle = rgb(p.tailLight, 0.92);
    ctx.beginPath();
    ctx.ellipse(-0.4, -fl * 0.62, 1.4, fl * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    // pale feather tip
    ctx.fillStyle = rgb(p.tailTip);
    ctx.beginPath();
    ctx.ellipse(0, -fl * 0.9, 1.8, 2.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    void tipX;
    void tipY;
  }

  // iridescent sheen sweeping the fan (subtle band of colour-of-light)
  if (p.irid > 0.001) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = rgb(p.sheen, 0.18 + 0.3 * p.irid);
    ctx.beginPath();
    ctx.ellipse(cx, cy - len * 0.42, len * 0.7, len * 0.36, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // snow settled on the upward fan edge (winter)
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgb([248, 252, 255], 0.85 * p.backSnowAmt);
    for (let i = 0; i < feathers; i += 2) {
      const f = (i - half) / half;
      const ang = -Math.PI / 2 + f * (arc / 2);
      const tipX = cx + Math.cos(ang) * len;
      const tipY = cy + Math.sin(ang) * len * 0.9;
      ctx.beginPath();
      ctx.ellipse(tipX, tipY, 2.0, 1.4, ang, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// the whole turkey, standing front-¾ turned ~15–20° toward lower-left
function paintTurkey(ctx: CanvasRenderingContext2D, p: P, bob: number, fanSpread: number): void {
  // body centre lifts with the breathing bob
  const bx = 1;
  const by = 6 - bob;

  // ── Fanned tail BEHIND the body — drawn first ───────────────────────────────
  paintTailFan(ctx, p, bx + 4, by - 3, fanSpread);

  // legs (in front of the tail, behind/under the body). Contact on the pad.
  paintLeg(ctx, p, bx - 2.5, by + 5, 19.4);
  paintLeg(ctx, p, bx + 3.5, by + 5, 19.2);

  // ── Plump bronze BODY — dark outline pass, then mid, then lit (layered) ─────
  // fluff modestly puffs the body outline (winter)
  const vol = 1 + p.fluff * 0.12;
  const rx = 12.5 * vol;
  const ry = 10.5 * vol;
  // outline halo
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(bx, by, rx + 1.2, ry + 1.2, -0.12, 0, Math.PI * 2);
  ctx.fill();
  // shaded body
  ctx.fillStyle = rgb(p.bodyDark);
  ctx.beginPath();
  ctx.ellipse(bx, by, rx, ry, -0.12, 0, Math.PI * 2);
  ctx.fill();
  // mid body offset up-left
  ctx.fillStyle = rgb(p.bodyMid);
  ctx.beginPath();
  ctx.ellipse(bx - 1, by - 1, rx * 0.9, ry * 0.88, -0.12, 0, Math.PI * 2);
  ctx.fill();
  // lit breast/back, light from upper-left
  ctx.fillStyle = rgb(p.bodyLight);
  ctx.beginPath();
  ctx.ellipse(bx - 3, by - 3, rx * 0.6, ry * 0.58, -0.12, 0, Math.PI * 2);
  ctx.fill();

  // winter fluff: a few soft feather lumps around the lower body outline
  if (p.fluff > 0.001) {
    ctx.fillStyle = rgb(p.bodyMid, 0.9);
    const lumps = 7;
    for (let i = 0; i < lumps; i++) {
      const a = Math.PI * 0.2 + (i / (lumps - 1)) * Math.PI * 0.9; // lower arc
      const lx = bx + Math.cos(a) * rx * 0.98;
      const ly = by + Math.sin(a) * ry * 0.98;
      ctx.beginPath();
      ctx.arc(lx, ly, 1.6 + p.fluff * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // iridescent sheen on the body (a curved band of colour-of-light)
  if (p.irid > 0.001) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = rgb(p.sheen, 0.2 + 0.34 * p.irid);
    ctx.beginPath();
    ctx.ellipse(bx - 2, by - 1, rx * 0.66, ry * 0.6, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // a soft wing crease on the flank
  ctx.strokeStyle = rgb(p.bodyDark, 0.6);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(bx + 6, by - 3);
  ctx.quadraticCurveTo(bx + 9, by + 2, bx + 5, by + 7);
  ctx.stroke();

  // snow settled on the back (winter)
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgb([248, 252, 255], 0.9 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 1, by - ry * 0.74, rx * 0.6, 2.8, -0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  // frost sparkle across the feathers (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([255, 255, 255], 0.8 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-7, -2], [-2, 3], [3, -1], [7, 3], [0, -4], [-4, -5], [5, 5],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── HEAD + NECK (front-¾, lower-left) — small head + RED wattle locks ID ─────
  const nx = bx - 9; // neck base on the upper-left breast
  const ny = by - 5;
  const hx = nx - 4.5; // small head, up and to the left
  const hy = ny - 7.5;

  // neck — a slim bronze S from the breast up to the small head
  ctx.strokeStyle = rgb(p.outline);
  ctx.lineWidth = 5.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(nx, ny);
  ctx.quadraticCurveTo(nx - 4, ny - 4, hx, hy + 1.5);
  ctx.stroke();
  ctx.strokeStyle = rgb(p.bodyMid);
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.moveTo(nx, ny);
  ctx.quadraticCurveTo(nx - 4, ny - 4, hx, hy + 1.5);
  ctx.stroke();
  // lit neck highlight
  ctx.strokeStyle = rgb(p.bodyLight, 0.7);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(nx - 1.4, ny - 1);
  ctx.quadraticCurveTo(nx - 5, ny - 4.5, hx - 1, hy + 1.5);
  ctx.stroke();
  ctx.lineCap = "butt";

  // RED wattle/snood at the throat — a small dewlap hanging at the neck base,
  // plus a little snood draping over the beak. LOCKED red every season.
  ctx.fillStyle = rgb(p.wattle);
  // throat dewlap
  ctx.beginPath();
  ctx.ellipse(nx - 2.2, ny - 1.5, 2.2, 3.4, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(nx - 3.4, ny + 1.5, 1.5, 2.2, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // wattle shading
  ctx.fillStyle = rgb([150, 30, 28], 0.5);
  ctx.beginPath();
  ctx.ellipse(nx - 1.6, ny + 0.4, 1.1, 2.4, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // small HEAD — a little bronze-pink dome
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 3.6, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb([198, 142, 108]); // small bare head (pinkish horn)
  ctx.beginPath();
  ctx.ellipse(hx, hy, 3.0, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  // cheek light
  ctx.fillStyle = rgb([255, 255, 255], 0.18);
  ctx.beginPath();
  ctx.ellipse(hx - 1, hy - 1, 1.3, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // snood draping over the beak (red)
  ctx.fillStyle = rgb(p.wattle);
  ctx.beginPath();
  ctx.moveTo(hx - 2.6, hy - 1.2);
  ctx.quadraticCurveTo(hx - 5.2, hy + 0.5, hx - 4.4, hy + 3.2);
  ctx.quadraticCurveTo(hx - 3.4, hy + 1.2, hx - 2.2, hy + 0.6);
  ctx.closePath();
  ctx.fill();

  // beak — a small horn triangle pointing lower-left
  ctx.fillStyle = rgb(p.beak);
  ctx.beginPath();
  ctx.moveTo(hx - 2.6, hy + 0.2);
  ctx.lineTo(hx - 5.6, hy + 1.4);
  ctx.lineTo(hx - 2.4, hy + 2.2);
  ctx.closePath();
  ctx.fill();

  // eye
  ctx.fillStyle = rgb([245, 245, 240]);
  ctx.beginPath();
  ctx.arc(hx - 0.6, hy - 0.4, 1.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb([18, 16, 18]);
  ctx.beginPath();
  ctx.arc(hx - 0.7, hy - 0.3, 0.55, 0, Math.PI * 2);
  ctx.fill();

  // breath-fog puff at the beak (winter) — at rest a faint static puff
  if (p.breathFogAmt > 0.001) {
    ctx.fillStyle = rgb([235, 244, 255], 0.4 * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(hx - 6.5, hy + 1.8, 3.0, 2.0, 0.1, 0, Math.PI * 2);
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

function paint(ctx: CanvasRenderingContext2D, pIn: P, bob: number, fanSpread = 0): void {
  const p = clampP(pIn);
  ctx.save();
  try {
    paintPad(ctx, p);
    paintTurkey(ctx, p, bob, fanSpread);
    paintLightWash(ctx, p);
  } finally {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }
}

// ── Per-season builders ─────────────────────────────────────────────────────

function draw(season: SeasonName) {
  return (ctx: CanvasRenderingContext2D): void => paint(ctx, SP[season], 0, 0);
}

function anim(season: SeasonName) {
  return (ctx: CanvasRenderingContext2D, t: number): void => {
    const p = clampP(SP[season]);
    const bob = bobAt(t); // SUBJECT breathing bob, 0 at t=0

    // Once-per-loop slow head-bob + a subtle tail-fan shimmer (seamless).
    // The shimmer is a tiny additive spread of the fan, 0 at t=0.
    const loop = (t % 6) / 6; // 0..1, ~6s loop
    const shimmer = Math.sin(t * 1.5) * 0.5 + 0.5; // 0..1
    const fanSpread = (1 - Math.cos(t * 1.5)) * 0.5 * 0.05; // small, 0 at t=0
    void shimmer;

    paint(ctx, SP[season], bob, fanSpread);

    // ── Additive micro-motion, drawn over the painted tile ──────────────────
    ctx.save();
    try {
      const bx = 1;
      const by = 6 - bob;
      const nx = bx - 9;
      const ny = by - 5;
      const hx = nx - 4.5;
      const hy = ny - 7.5;

      // slow head-bob once per loop: redraw the small head dipping a little.
      // gated bump near the loop midpoint, seamless (0 at edges).
      const headGate = Math.max(0, Math.sin(loop * Math.PI * 2)) ** 3;
      const headDip = headGate * 1.6;
      if (headDip > 0.01) {
        const dhy = hy + headDip;
        // redraw head over its rest position dipped down a touch
        ctx.fillStyle = rgb(p.outline);
        ctx.beginPath();
        ctx.ellipse(hx, dhy, 3.6, 3.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgb([198, 142, 108]);
        ctx.beginPath();
        ctx.ellipse(hx, dhy, 3.0, 2.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgb(p.beak);
        ctx.beginPath();
        ctx.moveTo(hx - 2.6, dhy + 0.2);
        ctx.lineTo(hx - 5.6, dhy + 1.4);
        ctx.lineTo(hx - 2.4, dhy + 2.2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = rgb([18, 16, 18]);
        ctx.beginPath();
        ctx.arc(hx - 0.7, dhy - 0.3, 0.55, 0, Math.PI * 2);
        ctx.fill();
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
        // iridescent tail sheen sweeps across the fan (peak season)
        const s = 0.5 + 0.5 * Math.sin(t * 1.0);
        const sx = bx + 4 - 12 + s * 24;
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb(p.sheen, 0.4);
        ctx.beginPath();
        ctx.ellipse(sx, by - 11, 3.2, 8, 0.2, 0, Math.PI * 2);
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
        // Winter: breath-fog puff pulses outward from the beak + a drifting
        // snowflake + a cold sheen.
        const breathe = 0.5 + 0.5 * Math.sin(t * 1.5);
        const reach = 4 + breathe * 3;
        ctx.fillStyle = rgb([235, 244, 255], (0.18 + 0.32 * breathe) * p.breathFogAmt);
        ctx.beginPath();
        ctx.ellipse(hx - 3 - reach, hy + 1.8, 2.4 + breathe * 1.8, 1.6 + breathe * 1.1, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // one drifting snowflake on a seamless 3.4s fall
        const prog = ((t / 3.4) % 1 + 1) % 1;
        const fy = -20 + prog * 36;
        const fxx = 6 + Math.sin(prog * Math.PI * 2) * 4;
        ctx.fillStyle = rgb([255, 255, 255], 0.85);
        ctx.beginPath();
        ctx.arc(fxx, fy, 1.1, 0, Math.PI * 2);
        ctx.fill();

        // cold sheen pulse on the feathers
        const sheen = 0.5 + 0.5 * Math.sin(t * 0.8);
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([206, 224, 255], 0.1 + sheen * 0.12);
        ctx.beginPath();
        ctx.ellipse(bx, by, 12, 10, 0, 0, Math.PI * 2);
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
    paint(ctx, lerpP(SP[from], SP[to], k), 0, 0);
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
