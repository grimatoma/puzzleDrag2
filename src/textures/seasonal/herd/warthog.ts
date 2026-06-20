// Seasonal art for the HERD WARTHOG board tile (`tile_herd_warthog`).
//
// A SINGLE parameterized paint renders the whole tile (grass pad + the one
// grey warthog + seasonal dressing) from a tweenable parameter set `P`. The
// four seasons are just four `P` presets; the three forward transitions lerp
// EVERY field of `P` through a quintic smoothstep, so transition(0) === the
// from-season still and transition(1) === the to-season still — no snap.
//
// PALETTE LOCK: the warthog is ALWAYS the same lean GREY warthog — a flat warty
// head with two pairs of curved upward TUSKS, a spiky tufted MANE running down
// the neck/back, thin legs, and a tufted tail. Seasons change only its coat
// fullness (a `coatVolume`/mane param), the pad colour, the light wash, and
// dressing (blossom, fallen leaves, frost, back-snow, breath-fog). The animal's
// identity colours (grey body, pale tusks, dark mane) never change.
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
  return x < 0 || Number.isNaN(x) ? 0 : x > 1 ? 1 : x;
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
  hideLight: RGB; // lit top of the grey hide
  hideMid: RGB; // body tone
  hideShadow: RGB; // shaded belly / underside
  maneDark: RGB; // spiky mane + tail tuft
  tusk: RGB; // pale curved tusks
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  coatVolume: number; // 0..1 fullness of the spiky mane tuft
  frostAmt: number; // 0..1 frost sparkle on the hide
  backSnowAmt: number; // 0..1 snow settled on its back/mane
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad
  breathFogAmt: number; // 0..1 breath puff at the snout
}

// Four season presets. The warthog stays the SAME lean grey warty animal; only
// mane volume + pad + light + dressing differ. Grey/tusk/mane colours are
// effectively constant (tiny seasonal warm/cool shifts only).
const SP: Record<SeasonName, P> = {
  // Spring — grey coat, dewy lime pad + blossom; cool-bright light.
  Spring: {
    hideLight: [158, 154, 150],
    hideMid: [120, 116, 114],
    hideShadow: [82, 80, 80],
    maneDark: [62, 56, 52],
    tusk: [236, 230, 214],
    padGrass: [126, 198, 86], // bright lime dewy grass
    soil: [86, 132, 54],
    outline: [44, 40, 38],
    lightWash: [212, 238, 255], // cool-bright
    lightWashAmt: 0.16,
    coatVolume: 0.35, // modest mane
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.6,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Summer — full grey coat (PEAK), saturated mid-green pad; warm light.
  Summer: {
    hideLight: [162, 158, 152],
    hideMid: [122, 118, 114],
    hideShadow: [80, 78, 76],
    maneDark: [60, 54, 48],
    tusk: [240, 234, 216],
    padGrass: [86, 168, 64], // saturated mid-green
    soil: [58, 110, 40],
    outline: [42, 38, 34],
    lightWash: [255, 244, 206], // warm
    lightWashAmt: 0.14,
    coatVolume: 0.55, // full normal mane
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Autumn — fuller mane tuft, olive-tan browning pad + fallen leaves; amber.
  Autumn: {
    hideLight: [156, 150, 142],
    hideMid: [118, 112, 106],
    hideShadow: [78, 74, 70],
    maneDark: [58, 50, 42],
    tusk: [236, 226, 202],
    padGrass: [156, 142, 78], // olive-tan
    soil: [104, 84, 44],
    outline: [44, 38, 32],
    lightWash: [255, 206, 138], // low amber
    lightWashAmt: 0.2,
    coatVolume: 0.78, // fuller mane tuft
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.7,
    breathFogAmt: 0,
  },
  // Winter — grey coat dusted with snow on back/mane, breath-fog, snowy pad.
  Winter: {
    hideLight: [160, 162, 168],
    hideMid: [116, 118, 124],
    hideShadow: [78, 80, 88],
    maneDark: [64, 60, 62],
    tusk: [240, 238, 230],
    padGrass: [222, 232, 244], // snow on the pad
    soil: [150, 168, 190],
    outline: [52, 50, 56],
    lightWash: [206, 222, 248], // cool blue-grey
    lightWashAmt: 0.24,
    coatVolume: 1, // thickest mane
    frostAmt: 0.65,
    backSnowAmt: 0.75,
    padSnowAmt: 0.85,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.75,
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    hideLight: lerpRGB(a.hideLight, b.hideLight, t),
    hideMid: lerpRGB(a.hideMid, b.hideMid, t),
    hideShadow: lerpRGB(a.hideShadow, b.hideShadow, t),
    maneDark: lerpRGB(a.maneDark, b.maneDark, t),
    tusk: lerpRGB(a.tusk, b.tusk, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    coatVolume: lerp(a.coatVolume, b.coatVolume, t),
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
    frostAmt: clamp01(p.frostAmt),
    backSnowAmt: clamp01(p.backSnowAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    breathFogAmt: clamp01(p.breathFogAmt),
  };
}

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat grass pad the warthog stands on
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

// one thin leg: a slim dark-grey cylinder with a hoof at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  ctx.strokeStyle = rgb(p.hideShadow);
  ctx.lineWidth = 2.2; // thin legs
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // hoof
  ctx.fillStyle = rgb([26, 22, 22]);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 1.5, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// the spiky tufted mane running along the neck/back; spikes grow with volume
function paintMane(
  ctx: CanvasRenderingContext2D,
  p: P,
  pts: Array<[number, number]>,
  fill: string,
  scale: number,
): void {
  ctx.fillStyle = fill;
  const spikeH = (3.2 + p.coatVolume * 3.4) * scale;
  for (let i = 0; i < pts.length; i++) {
    const [sx, sy] = pts[i];
    // alternate spike heights for a ragged tuft
    const h = spikeH * (i % 2 === 0 ? 1 : 0.7);
    ctx.beginPath();
    ctx.moveTo(sx - 1.7, sy);
    ctx.lineTo(sx + (i - pts.length / 2) * 0.2, sy - h);
    ctx.lineTo(sx + 1.7, sy);
    ctx.closePath();
    ctx.fill();
  }
}

// the lean grey body — an elongated low ellipse (constant silhouette)
function paintHideBody(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  fill: string,
  scale: number,
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 13 * scale, 7.6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

// the whole warthog, standing front-¾ turned toward lower-left
function paintWarthog(ctx: CanvasRenderingContext2D, p: P, bob: number): void {
  // body centre lifts with the breathing bob
  const bx = 0;
  const by = 5 - bob;

  // legs first (behind the body). Two back (dimmer for depth), two front.
  ctx.save();
  ctx.globalAlpha = 0.85;
  paintLeg(ctx, p, bx + 7, by + 5, 18.6);
  paintLeg(ctx, p, bx - 6, by + 5, 18.9);
  ctx.restore();
  paintLeg(ctx, p, bx + 4, by + 5, 19.2);
  paintLeg(ctx, p, bx - 3, by + 5, 19.4);

  // tail: a thin curved line trailing up-right ending in a tuft
  ctx.strokeStyle = rgb(p.hideShadow);
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx + 12, by);
  ctx.quadraticCurveTo(bx + 16, by - 3, bx + 15, by - 8);
  ctx.stroke();
  ctx.lineCap = "butt";
  // tail tuft
  ctx.fillStyle = rgb(p.maneDark);
  ctx.beginPath();
  ctx.arc(bx + 15, by - 8.5, 1.8 + p.coatVolume * 0.7, 0, Math.PI * 2);
  ctx.fill();

  // BODY — dark outline pass first, then mid, then lit top (layered like wheat)
  paintHideBody(ctx, bx, by, rgb(p.outline), 1.12); // outline halo
  paintHideBody(ctx, bx, by, rgb(p.hideShadow), 1.0); // shaded body
  paintHideBody(ctx, bx, by, rgb(p.hideMid), 0.94); // mid tone
  // lit top offset up-left (light from upper-left)
  ctx.save();
  ctx.translate(-1.2, -1.8);
  paintHideBody(ctx, bx, by, rgb(p.hideLight), 0.7);
  ctx.restore();

  // spiky tufted MANE running from the crown down the neck/back (identity)
  const manePts: Array<[number, number]> = [
    [bx - 9.5, by - 4.5],
    [bx - 6.5, by - 6.6],
    [bx - 3, by - 7.4],
    [bx + 0.5, by - 7.4],
    [bx + 4, by - 6.8],
    [bx + 7.5, by - 5.6],
    [bx + 10.5, by - 4],
  ];
  // dark base then a slightly raised dark tuft for read
  paintMane(ctx, p, manePts, rgb(p.maneDark), 1.0);

  // snow settled on the back/mane (winter)
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgb([248, 252, 255], 0.92 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx + 1, by - 6.4, 9 * (0.9 + p.coatVolume * 0.25), 3.0, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb([255, 255, 255], 0.85 * p.backSnowAmt);
    for (const [dx, dy] of [[-5, -7.4], [1, -8], [6, -7]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.5 + p.coatVolume * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the hide (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([255, 255, 255], 0.78 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-7, 1], [-2, 4], [4, -1], [8, 2], [0, -2], [-4, -3], [6, 4],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── HEAD (front-¾, lower-left) — big flat warty head that locks identity ───
  const hx = bx - 12;
  const hy = by + 2;

  // ears (dark grey), small and behind the head
  ctx.fillStyle = rgb(p.hideShadow);
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(hx + 1.5 + side * 2.2, hy - 5);
    ctx.rotate(side * 0.7 - 0.2);
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.4, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // head — a big flat ovoid extending into a broad snout toward lower-left
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(0.22);
  // outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(-1.2, 0.6, 6.6, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // head fill (grey)
  ctx.fillStyle = rgb(p.hideMid);
  ctx.beginPath();
  ctx.ellipse(-1.2, 0.6, 5.9, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit cheek (upper-left)
  ctx.fillStyle = rgb(p.hideLight, 0.85);
  ctx.beginPath();
  ctx.ellipse(-2.6, -1.4, 3, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // broad flat snout disc at the lower-left
  ctx.fillStyle = rgb(p.hideShadow);
  ctx.beginPath();
  ctx.ellipse(-5.4, 2.6, 2.8, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // nostrils on the snout disc
  ctx.fillStyle = rgb([22, 18, 18]);
  for (const ex of [-0.9, 0.9]) {
    ctx.beginPath();
    ctx.ellipse(-5.4 + ex, 2.8, 0.55, 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // two facial WARTS (identity) — small grey bumps below/beside the eyes
  ctx.fillStyle = rgb(p.hideLight);
  for (const [wx, wy] of [[-3.6, 1.2], [-1.0, -0.2]] as const) {
    ctx.beginPath();
    ctx.ellipse(wx, wy, 1.4, 1.0, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgb(p.outline, 0.6);
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
  // eye (one readable beady eye on the near side)
  ctx.fillStyle = rgb([245, 244, 238]);
  ctx.beginPath();
  ctx.arc(0.4, -1.6, 1.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb([20, 18, 18]);
  ctx.beginPath();
  ctx.arc(0.6, -1.5, 0.58, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // two pairs of curved upward TUSKS jutting from the snout (identity)
  // each pair: a long upper tusk + a shorter lower tusk, curving up & out.
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(0.22);
  ctx.lineCap = "round";
  const drawTusk = (
    baseX: number,
    baseY: number,
    dir: number,
    len: number,
    width: number,
  ): void => {
    // outline pass
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = width + 1;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX + dir * 1.6, baseY - len * 0.5, baseX + dir * 1.0, baseY - len);
    ctx.stroke();
    // tusk fill (pale)
    ctx.strokeStyle = rgb(p.tusk);
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX + dir * 1.6, baseY - len * 0.5, baseX + dir * 1.0, baseY - len);
    ctx.stroke();
  };
  // near (front) pair from the snout
  drawTusk(-6.4, 3.2, -1, 5.2, 1.9); // upper, long
  drawTusk(-5.6, 3.6, -1, 3.0, 1.5); // lower, short
  // far pair, slightly behind & dimmer for the ¾ read
  ctx.globalAlpha = 0.85;
  drawTusk(-4.4, 3.4, -1, 4.2, 1.6);
  drawTusk(-3.8, 3.7, -1, 2.4, 1.3);
  ctx.globalAlpha = 1;
  ctx.lineCap = "butt";
  ctx.restore();

  // breath-fog puff at the snout (winter) — at rest a faint static puff
  if (p.breathFogAmt > 0.001) {
    ctx.fillStyle = rgb([235, 244, 255], 0.4 * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(hx - 7, hy + 4, 3.2, 2.2, 0.2, 0, Math.PI * 2);
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
    paintWarthog(ctx, p, bob);
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
    paint(ctx, SP[season], bob);

    // ── Additive micro-motion, drawn over the painted tile ──────────────────
    ctx.save();
    try {
      const bx = 0;
      const by = 5 - bob;
      const hx = bx - 12;
      const hy = by + 2;

      // Occasional mane-twitch + ear-flick: a brief sin pulse once per ~5s loop.
      const loop = (t % 5) / 5; // 0..1
      const flickGate = Math.max(0, Math.sin(loop * Math.PI * 2)) ** 6; // sharp brief bump
      const flick = Math.sin(t * 9) * flickGate;

      // mane tuft twitch — redraw a couple of crown spikes leaning with the flick
      ctx.fillStyle = rgb(p.maneDark);
      const spikeH = 3.2 + p.coatVolume * 3.4;
      for (const sx of [bx - 3, bx + 0.5]) {
        ctx.save();
        ctx.translate(sx, by - 7.4);
        ctx.rotate(flick * 0.35);
        ctx.beginPath();
        ctx.moveTo(-1.7, 0);
        ctx.lineTo(0, -spikeH);
        ctx.lineTo(1.7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      // ear flick (redraw the near ear leaning with the flick)
      ctx.fillStyle = rgb(p.hideShadow);
      ctx.save();
      ctx.translate(hx + 3.7, hy - 5);
      ctx.rotate(0.5 + flick * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.4, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

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
        // soft coat sheen sweeping across the grey hide
        const s = 0.5 + 0.5 * Math.sin(t * 1.1);
        const sx = bx - 10 + s * 20;
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([255, 255, 255], 0.32);
        ctx.beginPath();
        ctx.ellipse(sx, by - 1, 3, 5, 0.3, 0, Math.PI * 2);
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
        // Winter: breath-fog puff gently pulses outward from the snout +
        // a drifting snowflake + a cold sheen.
        const breathe = 0.5 + 0.5 * Math.sin(t * 1.5);
        const reach = 4 + breathe * 3;
        ctx.fillStyle = rgb([235, 244, 255], (0.18 + 0.32 * breathe) * p.breathFogAmt);
        ctx.beginPath();
        ctx.ellipse(hx - 3 - reach, hy + 4, 2.6 + breathe * 1.8, 1.8 + breathe * 1.2, 0.2, 0, Math.PI * 2);
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
        ctx.fillStyle = rgb([206, 224, 255], 0.1 + sheen * 0.12);
        ctx.beginPath();
        ctx.ellipse(bx, by, 13, 7.6, 0, 0, Math.PI * 2);
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
