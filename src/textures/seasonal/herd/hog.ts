// Seasonal art for the HERD HOG board tile (`tile_herd_hog`).
//
// A SINGLE parameterized paint renders the whole tile (grass pad + the one big
// brown hog + seasonal dressing) from a tweenable parameter set `P`. The four
// seasons are just four `P` presets; the three forward transitions lerp EVERY
// field of `P` through a quintic smoothstep, so transition(0) === the
// from-season still and transition(1) === the to-season still — no snap.
//
// PALETTE LOCK: the hog is ALWAYS the same big, heavy, coarse-BROWN hog — a
// broad snout, small ears, stocky legs, a couple of small lower tusks, and a
// bristly hairy hide. Seasons change only its coat VOLUME (a sleeker bristly
// coat in spring → a shaggy thick winter coat), the pad colour, the light wash,
// and dressing (blossom, fallen leaves, frost, back-snow, breath-fog). The
// animal's identity colours never change — it stays coarse brown all year.
//
// Origin-centered in the −24..+24 design box, the hog standing front-¾ turned
// toward lower-left. Animations are deterministic (sin/cos/modulo of `t` in
// seconds), seamless, and subtle. The subject's heavy breathing bob has zero
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

// heavy breathing bob: A*(1-cos(w t))*0.5 — value AND velocity are 0 at t=0,
// seamless over a 2π/w period, peak amplitude A. (slow + heavy for a hog.)
function bobAt(t: number, amp = 1.2, w = 1.2): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────

interface P {
  hideLight: RGB; // lit top of the coarse brown hide
  hideMid: RGB; // body tone
  hideShadow: RGB; // shaded underside / belly
  snout: RGB; // broad snout pad + ear inner
  bristle: RGB; // coarse bristly hair strokes along the back
  tusk: RGB; // the small lower tusks (locked ivory)
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  coatVolume: number; // 0..1 shagginess of the bristly coat
  sheenAmt: number; // 0..1 coarse-coat sheen (summer peak)
  frostAmt: number; // 0..1 frost sparkle on the hide
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad
  breathFogAmt: number; // 0..1 breath puff at the snout
}

// Four season presets. The hog stays the SAME coarse-brown broad-snouted hog;
// only coat volume + pad + light + dressing differ.
const SP: Record<SeasonName, P> = {
  // Spring — fresh pastel light; brown bristly coat (sleeker); dewy lime pad.
  Spring: {
    hideLight: [150, 108, 78],
    hideMid: [118, 80, 54],
    hideShadow: [80, 52, 34],
    snout: [156, 110, 100],
    bristle: [70, 46, 30],
    tusk: [236, 230, 210],
    padGrass: [126, 198, 86], // bright lime dewy grass
    soil: [86, 132, 54],
    outline: [50, 32, 22],
    lightWash: [212, 238, 255], // cool-bright
    lightWashAmt: 0.16,
    coatVolume: 0.3, // sleeker bristly coat
    sheenAmt: 0.1,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.6,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Summer — richest saturated brown (PEAK), full coat; warm light; coat sheen.
  Summer: {
    hideLight: [160, 112, 76],
    hideMid: [124, 82, 52],
    hideShadow: [82, 52, 32],
    snout: [164, 112, 100],
    bristle: [68, 44, 28],
    tusk: [238, 232, 212],
    padGrass: [86, 168, 64], // saturated mid-green
    soil: [58, 110, 40],
    outline: [48, 30, 20],
    lightWash: [255, 244, 206], // warm
    lightWashAmt: 0.14,
    coatVolume: 0.5, // full normal coat
    sheenAmt: 0.7, // coarse-coat sheen peaks
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Autumn — deeper warm brown, fuller coarse coat; olive-tan pad; fallen leaves.
  Autumn: {
    hideLight: [148, 100, 66],
    hideMid: [112, 74, 46],
    hideShadow: [74, 46, 28],
    snout: [152, 102, 92],
    bristle: [62, 40, 24],
    tusk: [232, 224, 202],
    padGrass: [156, 142, 78], // olive-tan browning grass
    soil: [104, 84, 44],
    outline: [46, 28, 18],
    lightWash: [255, 206, 138], // low amber
    lightWashAmt: 0.2,
    coatVolume: 0.72, // fuller, thicker coarse coat
    sheenAmt: 0.3,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.7,
    breathFogAmt: 0,
  },
  // Winter — cool blue-grey light; shaggy thick coat; snow on the back;
  // snowy pad + frost; breath-fog at the snout. Stays clearly brown underneath.
  Winter: {
    hideLight: [138, 100, 76],
    hideMid: [106, 74, 52],
    hideShadow: [72, 50, 36],
    snout: [148, 108, 102],
    bristle: [60, 42, 30],
    tusk: [240, 236, 222],
    padGrass: [222, 232, 244], // snow on the pad (muted grey-green under)
    soil: [150, 168, 190],
    outline: [56, 40, 36],
    lightWash: [206, 222, 248], // cool blue-grey
    lightWashAmt: 0.24,
    coatVolume: 1, // shaggy thick winter coat
    sheenAmt: 0.12,
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
    hideLight: lerpRGB(a.hideLight, b.hideLight, t),
    hideMid: lerpRGB(a.hideMid, b.hideMid, t),
    hideShadow: lerpRGB(a.hideShadow, b.hideShadow, t),
    snout: lerpRGB(a.snout, b.snout, t),
    bristle: lerpRGB(a.bristle, b.bristle, t),
    tusk: lerpRGB(a.tusk, b.tusk, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    coatVolume: lerp(a.coatVolume, b.coatVolume, t),
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
    coatVolume: clamp01(p.coatVolume),
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

// the low flat grass pad the hog stands on
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

// one stocky leg: a short thick dark cylinder with a small cloven hoof
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  ctx.strokeStyle = rgb(p.hideShadow);
  ctx.lineWidth = 4.2; // stocky
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // small dark cloven hoof
  ctx.fillStyle = rgb([30, 22, 18]);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 2.1, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// the heavy body — a big rounded barrel; the SAME silhouette every season,
// only fills + the bristle row change.
function bodyPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
}

// the whole hog, standing front-¾ turned toward lower-left
function paintHog(ctx: CanvasRenderingContext2D, p: P, bob: number): void {
  // body centre lifts with the heavy breathing bob
  const bx = 1;
  const by = 4 - bob;
  // the big barrel body
  const rx = 14.5;
  const ry = 9.6;

  // legs first (behind the body). Two back, two front; contact on the pad.
  ctx.save();
  ctx.globalAlpha = 0.9;
  paintLeg(ctx, p, bx + 8.5, by + 5.5, 18.6);
  paintLeg(ctx, p, bx - 6.5, by + 5.5, 18.9);
  ctx.restore();
  // front legs (nearer)
  paintLeg(ctx, p, bx + 5, by + 6, 19.3);
  paintLeg(ctx, p, bx - 3, by + 6, 19.5);

  // BODY — soft dark outline halo, then mid fill, then lit top (layered).
  bodyPath(ctx, bx, by, rx + 1.2, ry + 1.2);
  ctx.fillStyle = rgb(p.outline);
  ctx.fill();
  bodyPath(ctx, bx, by, rx, ry);
  ctx.fillStyle = rgb(p.hideMid);
  ctx.fill();
  // belly shadow (lower band)
  ctx.save();
  bodyPath(ctx, bx, by, rx, ry);
  ctx.clip();
  ctx.fillStyle = rgb(p.hideShadow, 0.8);
  ctx.beginPath();
  ctx.ellipse(bx, by + 5, rx, ry * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit top offset up-left (light from upper-left)
  ctx.fillStyle = rgb(p.hideLight);
  ctx.beginPath();
  ctx.ellipse(bx - 2.5, by - 3.2, rx * 0.78, ry * 0.6, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // coarse bristly hair along the back — short dark strokes whose length and
  // count grow modestly with coat volume (sleek spring → shaggy winter).
  const bristleLen = 2.2 + p.coatVolume * 3.4;
  const bristleN = Math.round(9 + p.coatVolume * 5);
  ctx.strokeStyle = rgb(p.bristle);
  ctx.lineWidth = 1.1;
  ctx.lineCap = "round";
  for (let i = 0; i < bristleN; i++) {
    const f = i / (bristleN - 1); // 0..1 along the back crest
    const ang = lerp(-2.5, -0.55, f); // sweep over the top arc, left→right
    const sx = bx + Math.cos(ang) * rx * 0.96;
    const sy = by + Math.sin(ang) * ry * 0.96;
    const jitter = (i % 2 === 0 ? 1 : 0.7) * bristleLen;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(ang) * jitter * 0.4, sy - jitter);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // coarse-coat sheen (summer peak) — a soft warm band along the lit back
  if (p.sheenAmt > 0.001) {
    ctx.save();
    bodyPath(ctx, bx, by, rx, ry);
    ctx.clip();
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = rgb([255, 240, 210], 0.4 * p.sheenAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 2, by - 4, rx * 0.7, ry * 0.42, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // snow settled on the back (winter) — a soft white cap over the hide
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgb([248, 252, 255], 0.92 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 1, by - 7.4, rx * 0.7, 3.2, -0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb([255, 255, 255], 0.85 * p.backSnowAmt);
    for (const [dx, dy] of [[-6, -8], [0, -8.6], [6, -7.8]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the hide (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([255, 255, 255], 0.75 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-9, -1], [-3, 3], [5, -2], [9, 2], [1, -4], [-5, -5], [8, 5],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // small curly tail at the upper-right rear
  ctx.strokeStyle = rgb(p.hideShadow);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(bx + rx - 0.5, by - 2);
  ctx.quadraticCurveTo(bx + rx + 3.5, by - 4, bx + rx + 2, by - 0.5);
  ctx.quadraticCurveTo(bx + rx + 0.5, by + 0.8, bx + rx + 2.2, by + 1.2);
  ctx.stroke();

  // ── HEAD (front-¾, lower-left) — broad snout that locks identity ───────────
  const hx = bx - 13.5;
  const hy = by + 2.5;

  // ears (small, upright triangles), behind the head
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(hx + side * 3.2, hy - 5.5);
    ctx.rotate(side * 0.5 - 0.15);
    // outline
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.moveTo(-2.4, 2.2);
    ctx.quadraticCurveTo(-1.2, -3.2, 1.2, -2.6);
    ctx.quadraticCurveTo(2.4, -0.2, 2.2, 2.4);
    ctx.closePath();
    ctx.fill();
    // ear fill (hide) + inner snout-pink
    ctx.fillStyle = rgb(p.hideMid);
    ctx.beginPath();
    ctx.moveTo(-1.8, 1.8);
    ctx.quadraticCurveTo(-0.9, -2.4, 0.9, -1.9);
    ctx.quadraticCurveTo(1.8, -0.1, 1.6, 1.9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgb(p.snout, 0.7);
    ctx.beginPath();
    ctx.ellipse(0, 0.4, 0.8, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // head mass — a heavy brown wedge merging into the body
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(hx + 1, hy, 8.2, 7.4, 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.hideMid);
  ctx.beginPath();
  ctx.ellipse(hx + 1, hy, 7.4, 6.6, 0.08, 0, Math.PI * 2);
  ctx.fill();
  // cheek light (upper-left)
  ctx.fillStyle = rgb(p.hideLight, 0.85);
  ctx.beginPath();
  ctx.ellipse(hx - 1.4, hy - 2.4, 4, 3.4, -0.1, 0, Math.PI * 2);
  ctx.fill();

  // broad snout — a wide forward-jutting muzzle ending in a flat disc
  const snx = hx - 6;
  const sny = hy + 2.6;
  // muzzle bridge (hide) bridging head to snout disc
  ctx.fillStyle = rgb(p.hideMid);
  ctx.beginPath();
  ctx.moveTo(hx - 1, hy - 1.5);
  ctx.quadraticCurveTo(snx - 1, sny - 4, snx - 2.5, sny);
  ctx.quadraticCurveTo(snx - 1, sny + 4.5, hx - 1, hy + 4.5);
  ctx.closePath();
  ctx.fill();
  // the flat snout disc (broad)
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(snx - 2, sny, 3.6, 4.4, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.snout);
  ctx.beginPath();
  ctx.ellipse(snx - 2, sny, 3, 3.8, -0.15, 0, Math.PI * 2);
  ctx.fill();
  // two nostrils on the snout disc
  ctx.fillStyle = rgb([40, 24, 28]);
  for (const ny of [-1.2, 1.4]) {
    ctx.beginPath();
    ctx.ellipse(snx - 2.6, sny + ny, 0.7, 1.0, -0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  // snout-disc highlight (upper-left)
  ctx.fillStyle = rgb([255, 235, 232], 0.3);
  ctx.beginPath();
  ctx.ellipse(snx - 3.4, sny - 1.6, 1.1, 1.4, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // a couple of small lower tusks jutting up from the lower jaw
  ctx.strokeStyle = rgb(p.tusk);
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  for (const side of [0, 1]) {
    const tx = snx + 0.4 + side * 2.6;
    const ty = sny + 3.4;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx - 0.6, ty - 2.2, tx - 0.2, ty - 3.4);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // small dark eye on the head
  ctx.fillStyle = rgb([245, 242, 236]);
  ctx.beginPath();
  ctx.arc(hx + 0.6, hy - 1.4, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb([22, 16, 16]);
  ctx.beginPath();
  ctx.arc(hx + 0.9, hy - 1.3, 0.65, 0, Math.PI * 2);
  ctx.fill();

  // breath-fog puff at the snout (winter) — at rest a faint static puff
  if (p.breathFogAmt > 0.001) {
    ctx.fillStyle = rgb([235, 244, 255], 0.4 * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(snx - 6, sny + 0.6, 3.2, 2.2, 0.1, 0, Math.PI * 2);
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
    ctx.lineJoin = "round";
    paintPad(ctx, p);
    paintHog(ctx, p, bob);
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
    const bob = bobAt(t); // SUBJECT heavy breathing bob, 0 at t=0
    paint(ctx, SP[season], bob);

    // ── Additive micro-motion, drawn over the painted tile ──────────────────
    ctx.save();
    try {
      const bx = 1;
      const by = 4 - bob;
      const hx = bx - 13.5;
      const hy = by + 2.5;
      const snx = hx - 6;
      const sny = hy + 2.6;

      // Once-per-loop ear-flick + snout-dip: a brief gated pulse over ~5s.
      const loop = (t % 5) / 5; // 0..1
      const flickGate = Math.max(0, Math.sin(loop * Math.PI * 2)) ** 6; // sharp brief bump
      const flick = Math.sin(t * 9) * flickGate;
      // the snout dips down a touch during the same gated window
      const snoutDip = flickGate * 1.3;

      // ear flick (redraw a flicking ear over the existing right ear)
      ctx.save();
      ctx.translate(hx + 3.2, hy - 5.5);
      ctx.rotate(0.35 + flick * 0.5);
      ctx.fillStyle = rgb(p.hideMid);
      ctx.beginPath();
      ctx.moveTo(-1.8, 1.8);
      ctx.quadraticCurveTo(-0.9, -2.4, 0.9, -1.9);
      ctx.quadraticCurveTo(1.8, -0.1, 1.6, 1.9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // snout dip — redraw the snout disc a touch lower during the gate
      if (snoutDip > 0.02) {
        ctx.fillStyle = rgb(p.snout);
        ctx.beginPath();
        ctx.ellipse(snx - 2, sny + snoutDip, 3, 3.8, -0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgb([40, 24, 28]);
        for (const ny of [-1.2, 1.4]) {
          ctx.beginPath();
          ctx.ellipse(snx - 2.6, sny + snoutDip + ny, 0.7, 1.0, -0.15, 0, Math.PI * 2);
          ctx.fill();
        }
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
        // coarse-coat sheen sweeping across the lit back
        const s = 0.5 + 0.5 * Math.sin(t * 1.1);
        const sx = bx - 9 + s * 18;
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([255, 244, 214], 0.32);
        ctx.beginPath();
        ctx.ellipse(sx, by - 3, 3.2, 5.4, 0.2, 0, Math.PI * 2);
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
        // Winter: breath-fog pulses outward from the snout + a drifting
        // snowflake + a cold sheen.
        const breathe = 0.5 + 0.5 * Math.sin(t * 1.2);
        const reach = 4 + breathe * 3;
        ctx.fillStyle = rgb([235, 244, 255], (0.18 + 0.32 * breathe) * p.breathFogAmt);
        ctx.beginPath();
        ctx.ellipse(snx - reach, sny + 0.6, 2.6 + breathe * 1.8, 1.8 + breathe * 1.2, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // one drifting snowflake on a seamless 3.4s fall
        const prog = ((t / 3.4) % 1 + 1) % 1;
        const fy = -20 + prog * 36;
        const fxx = 6 + Math.sin(prog * Math.PI * 2) * 4;
        ctx.fillStyle = rgb([255, 255, 255], 0.85);
        ctx.beginPath();
        ctx.arc(fxx, fy, 1.1, 0, Math.PI * 2);
        ctx.fill();

        // cold sheen pulse on the hide
        const sheen = 0.5 + 0.5 * Math.sin(t * 0.8);
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([206, 224, 255], 0.12 + sheen * 0.14);
        ctx.beginPath();
        ctx.ellipse(bx, by, 14.5, 9.6, 0, 0, Math.PI * 2);
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
