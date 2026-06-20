// Seasonal art for the MOUNT MAMMOTH board tile (`tile_mount_mammoth`).
//
// A SINGLE parameterized paint renders the whole tile (ground pad + the one
// woolly mammoth + seasonal dressing + light wash) from a tweenable parameter
// set `P`. The four seasons are four `P` presets; the three forward transitions
// lerp EVERY field of `P` through a quintic smoothstep, so transition(0) === the
// from-season still and transition(1) === the to-season still — no snap. The
// engine hands the morph off to the idle at rest (= draw(to)).
//
// PALETTE LOCK: the subject is ALWAYS the same woolly MAMMOTH — a big shaggy
// REDDISH-BROWN furry body, a high DOMED head, a curling TRUNK, two very long
// curved ivory TUSKS, small ears, stumpy legs. The SILHOUETTE and the
// reddish-brown / ivory-tusk IDENTITY colours are constant across all seasons.
// Only the COAT VOLUME (`coatVolume`) — its element is winter, so the coat is
// PATCHY/SHEDDING in spring, THINNEST at PEAK warmth in summer, FULL & THICK in
// autumn, and a HEAVY FROSTED shaggy coat in winter — plus the pad, the light
// wash, and dressing (blossom, shed tufts, fallen leaves, frost, back-snow,
// breath-fog) change. The mammoth is never recoloured, hollowed, or swapped.
//
// Animal framing: the mammoth stands on the pad in front-¾, turned ~15–20°
// toward lower-left; the full body is readable and may overhang the pad width;
// the stumpy legs/feet contact the pad.
//
// Origin-centered in the −24..+24 design box, light from upper-left, flat
// cel-shaded with a soft dark outline. Animations are deterministic (sin/cos/
// modulo of `t` in seconds), seamless, and subtle: a slow heavy breathing bob
// (zero velocity at t=0 → anim(…,0) matches the still), a slow trunk sway/curl,
// an ear flick once per loop, plus per-season micro-motion (spring shed-tuft
// drift + dew shimmer, summer coat sheen, autumn leaf stir, winter breath-fog
// pulse + drifting snowflakes + cold sheen).

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
const smoother = (x: number): number => x * x * x * (x * (6 * x - 15) + 10);

// heavy breathing bob: A*(1-cos(w t))*0.5 — value AND velocity are 0 at t=0,
// seamless over a 2π/w period, peak amplitude A. Slow (heavy beast).
function bobAt(t: number, amp = 1.1, w = 1.05): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────
//
// IDENTITY colours (reddish-brown coat, ivory tusks, dark eye/feet) stay nearly
// constant; they live in P only so the light wash + coat thickness can nudge
// them very slightly between seasons. Everything that genuinely differs per
// season is the coat volume + pad + light + dressing amounts.

interface P {
  coatLight: RGB; // lit top of the shaggy reddish-brown coat
  coatMid: RGB; // body reddish-brown tone
  coatShadow: RGB; // shaded underside of the coat
  tuskLight: RGB; // lit ivory tusk
  tuskShade: RGB; // shaded ivory tusk
  trunkShade: RGB; // shaded reddish-brown of the trunk underside
  darkPart: RGB; // eyes + feet (the dark hard parts)
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  coatVolume: number; // 0..1 coat thickness (shedding/thin → heavy & shaggy)
  shedAmt: number; // 0..1 patchy shedding tufts coming loose (spring)
  gloss: number; // 0..1 glossy-coat sheen strength (summer peak warmth)
  frostAmt: number; // 0..1 frost sparkle on the coat (winter)
  backSnowAmt: number; // 0..1 snow settled on its back (winter)
  padSnowAmt: number; // 0..1 snow blanket on the pad (winter, deeper = its element)
  blossomAmt: number; // 0..1 tiny blossoms on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad (autumn)
  breathFogAmt: number; // 0..1 breath puff at the trunk (winter)
}

// Four season presets. The mammoth stays the SAME shaggy reddish-brown, ivory-
// tusked beast; only coat volume + pad + light + dressing differ. Winter is its
// element — heaviest coat, deepest pad snow.
const SP: Record<SeasonName, P> = {
  // Spring — patchy SHEDDING coat (tufts loose), dewy lime pad + blossom, cool light.
  Spring: {
    coatLight: [176, 110, 70],
    coatMid: [138, 78, 46],
    coatShadow: [94, 50, 28],
    tuskLight: [244, 236, 214],
    tuskShade: [204, 190, 156],
    trunkShade: [104, 58, 34],
    darkPart: [40, 28, 22],
    padGrass: [128, 206, 86], // bright lime dewy grass
    soil: [86, 132, 54],
    outline: [48, 28, 18],
    lightWash: [214, 240, 255], // cool-bright
    lightWashAmt: 0.16,
    coatVolume: 0.4, // patchy / mid, mid-shed
    shedAmt: 0.85, // tufts coming loose
    gloss: 0.28,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.65,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Summer — lighter THINNER coat (PEAK warmth), saturated mid-green pad, warm light.
  Summer: {
    coatLight: [192, 120, 76],
    coatMid: [150, 84, 50],
    coatShadow: [100, 54, 30],
    tuskLight: [248, 240, 220],
    tuskShade: [206, 192, 158],
    trunkShade: [112, 62, 38],
    darkPart: [38, 26, 20],
    padGrass: [86, 170, 64], // saturated mid-green
    soil: [58, 112, 40],
    outline: [46, 28, 18],
    lightWash: [255, 244, 206], // warm
    lightWashAmt: 0.14,
    coatVolume: 0.18, // thinnest — peak warmth
    shedAmt: 0,
    gloss: 0.9, // glossiest peak
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Autumn — full THICK coat, olive-tan browning pad, fallen leaves, amber light.
  Autumn: {
    coatLight: [180, 108, 64],
    coatMid: [142, 78, 44],
    coatShadow: [96, 50, 28],
    tuskLight: [242, 230, 204],
    tuskShade: [200, 184, 148],
    trunkShade: [106, 56, 34],
    darkPart: [42, 30, 22],
    padGrass: [156, 142, 78], // olive-tan
    soil: [104, 84, 44],
    outline: [48, 28, 18],
    lightWash: [255, 206, 138], // low amber
    lightWashAmt: 0.2,
    coatVolume: 0.74, // full thick coat
    shedAmt: 0,
    gloss: 0.36,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.7,
    breathFogAmt: 0,
  },
  // Winter — heavy FROSTED shaggy coat + back-snow + breath fog, deep snowy pad
  // (its element), cool blue-grey light, tusks bright.
  Winter: {
    coatLight: [158, 104, 72],
    coatMid: [124, 76, 48],
    coatShadow: [86, 52, 32],
    tuskLight: [252, 250, 242], // tusks bright in winter
    tuskShade: [212, 204, 184],
    trunkShade: [98, 56, 36],
    darkPart: [46, 36, 32],
    padGrass: [224, 234, 246], // deep snow on the pad
    soil: [150, 168, 190],
    outline: [50, 36, 28],
    lightWash: [206, 222, 248], // cool blue-grey
    lightWashAmt: 0.26,
    coatVolume: 1, // heaviest shaggy coat (its element)
    shedAmt: 0,
    gloss: 0.18,
    frostAmt: 0.7,
    backSnowAmt: 0.78,
    padSnowAmt: 0.95, // deeper snow
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.72,
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    coatLight: lerpRGB(a.coatLight, b.coatLight, t),
    coatMid: lerpRGB(a.coatMid, b.coatMid, t),
    coatShadow: lerpRGB(a.coatShadow, b.coatShadow, t),
    tuskLight: lerpRGB(a.tuskLight, b.tuskLight, t),
    tuskShade: lerpRGB(a.tuskShade, b.tuskShade, t),
    trunkShade: lerpRGB(a.trunkShade, b.trunkShade, t),
    darkPart: lerpRGB(a.darkPart, b.darkPart, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    coatVolume: lerp(a.coatVolume, b.coatVolume, t),
    shedAmt: lerp(a.shedAmt, b.shedAmt, t),
    gloss: lerp(a.gloss, b.gloss, t),
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
    shedAmt: clamp01(p.shedAmt),
    gloss: clamp01(p.gloss),
    frostAmt: clamp01(p.frostAmt),
    backSnowAmt: clamp01(p.backSnowAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    breathFogAmt: clamp01(p.breathFogAmt),
  };
}

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat grass pad the mammoth stands on
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

  // deep snow blanket over the pad (winter — its element, so a deeper mound)
  if (p.padSnowAmt > 0.001) {
    ctx.fillStyle = rgb([244, 250, 255], 0.88 * p.padSnowAmt);
    ctx.beginPath();
    ctx.ellipse(0, 18.2, 17.4, 5.2 * (0.7 + 0.3 * p.padSnowAmt), 0, 0, Math.PI * 2);
    ctx.fill();
    // a slightly mounded crest of deeper snow
    ctx.fillStyle = rgb([255, 255, 255], 0.6 * p.padSnowAmt);
    ctx.beginPath();
    ctx.ellipse(-2, 17.2, 12, 2.8, -0.04, 0, Math.PI * 2);
    ctx.fill();
    // a couple of frost glints on the snow
    ctx.fillStyle = rgb([255, 255, 255], 0.75 * p.padSnowAmt);
    for (const [sx, sy] of [[-10, 19], [6, 20], [12, 18], [0, 17]] as const) {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // tiny blossoms (spring)
  if (p.blossomAmt > 0.001) {
    for (const [bx, by] of [[-13, 18.5], [10, 20], [0, 21], [14, 19]] as const) {
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
      [-12, 20, -0.5, [196, 96, 36]],
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

// one stumpy column leg with a dark padded foot at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number, vol: number): void {
  const w = 4.6 * (0.95 + vol * 0.18); // shaggier coat = fatter leg
  // outline column
  ctx.strokeStyle = rgb(p.outline);
  ctx.lineWidth = w + 1.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // shaded reddish-brown
  ctx.strokeStyle = rgb(p.coatShadow);
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY - 1.2);
  ctx.stroke();
  // lit front of the leg
  ctx.strokeStyle = rgb(p.coatMid);
  ctx.lineWidth = w * 0.6;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.18, topY + 1);
  ctx.lineTo(x - w * 0.18, baseY - 2);
  ctx.stroke();
  // dark padded foot
  ctx.fillStyle = rgb(p.darkPart);
  ctx.beginPath();
  ctx.ellipse(x, baseY, w * 0.6, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// Trace the mammoth's big barrel body path (constant silhouette). cx,cy = body
// centre. vol modestly puffs/shaggies the outline; the underlying shape stays.
function bodyPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, vol: number): void {
  const rx = 13.5 * (0.97 + vol * 0.14);
  const ry = 9.2 * (0.97 + vol * 0.16);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, -0.05, 0, Math.PI * 2);
}

// a soft shaggy fur fringe around an arc of the body — count/length scale with
// coat volume so the silhouette only gains shag in autumn/winter.
function paintShag(ctx: CanvasRenderingContext2D, cx: number, cy: number, vol: number, col: RGB): void {
  if (vol < 0.3) return;
  const fr = (vol - 0.3) / 0.7; // 0..1 shag strength
  const rx = 13.5 * (0.97 + vol * 0.14);
  const ry = 9.2 * (0.97 + vol * 0.16);
  ctx.fillStyle = rgb(col, 0.9);
  for (let i = 0; i < 14; i++) {
    // lower-front belly arc, where the long fur hangs
    const a = Math.PI * 0.12 + (i / 13) * Math.PI * 1.0;
    const lx = cx + Math.cos(a) * rx * 1.02;
    const ly = cy + Math.sin(a) * ry * 1.02;
    const drop = (1.4 + 2.6 * fr) * (i % 2 ? 1 : 0.78);
    ctx.beginPath();
    ctx.moveTo(lx - 1.2, ly - 0.6);
    ctx.quadraticCurveTo(lx, ly + drop, lx + 1.2, ly - 0.6);
    ctx.closePath();
    ctx.fill();
  }
}

// the whole mammoth, standing front-¾ turned ~15-20° toward lower-left
function paintMammoth(
  ctx: CanvasRenderingContext2D,
  p: P,
  bob: number,
  trunkSway = 0,
  earFlick = 0,
): void {
  // body centre lifts with the heavy breathing bob
  const bx = 3;
  const by = 1 - bob;
  const vol = p.coatVolume;

  // ── legs first (behind/under the body). Stumpy columns. ─────────────────────
  ctx.save();
  ctx.globalAlpha = 0.92;
  paintLeg(ctx, p, bx + 9, by + 6, 19.0, vol); // far rear
  paintLeg(ctx, p, bx - 3, by + 6.5, 19.2, vol); // far front
  ctx.restore();
  paintLeg(ctx, p, bx + 6, by + 7, 19.8, vol); // near rear
  paintLeg(ctx, p, bx - 8, by + 7, 20.0, vol); // near front

  // tiny tuft tail behind the rump
  ctx.strokeStyle = rgb(p.coatShadow);
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx + 12.5, by + 1);
  ctx.quadraticCurveTo(bx + 14.5, by + 5, bx + 13.5, by + 9);
  ctx.stroke();
  ctx.fillStyle = rgb(p.darkPart, 0.9);
  ctx.beginPath();
  ctx.arc(bx + 13.5, by + 9.6, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";

  // shaggy belly/back fur fringe UNDER the body fill (drawn first so it reads as
  // hanging behind the body edge). Scales with coat volume.
  paintShag(ctx, bx, by, vol, p.coatShadow);

  // ── BODY barrel — outline pass then light fill (layered like wheat) ─────────
  // outline halo
  ctx.fillStyle = rgb(p.outline);
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(1.09, 1.12);
  ctx.translate(-bx, -by);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  ctx.restore();

  // shaded coat
  ctx.fillStyle = rgb(p.coatShadow);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  // mid coat
  ctx.fillStyle = rgb(p.coatMid);
  ctx.save();
  ctx.translate(-0.5, -0.5);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  ctx.restore();
  // lit coat, offset up-left (light from upper-left)
  ctx.save();
  ctx.fillStyle = rgb(p.coatLight);
  ctx.translate(-1.8, -2.0);
  bodyPath(ctx, bx, by, vol * 0.7);
  ctx.fill();
  ctx.restore();

  // long-fur strands streaking down the body (clipped to the barrel), denser
  // with coat volume — reads as the shaggy woolly hide.
  {
    ctx.save();
    bodyPath(ctx, bx, by, vol);
    ctx.clip();
    ctx.strokeStyle = rgb(p.coatShadow, 0.55 + 0.3 * vol);
    ctx.lineWidth = 1.0;
    ctx.lineCap = "round";
    const n = 5 + Math.round(vol * 6);
    for (let i = 0; i < n; i++) {
      const sx = bx - 11 + (i / Math.max(1, n - 1)) * 22;
      ctx.beginPath();
      ctx.moveTo(sx, by - 7);
      ctx.quadraticCurveTo(sx - 1.2, by, sx - 0.4, by + 8);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.restore();
  }

  // glossy coat sheen band over the back (summer peak — gloss strong, thin coat)
  if (p.gloss > 0.02) {
    ctx.save();
    bodyPath(ctx, bx, by, vol);
    ctx.clip();
    ctx.fillStyle = rgb([255, 255, 255], 0.1 + 0.16 * p.gloss);
    ctx.beginPath();
    ctx.ellipse(bx - 2, by - 5.2, 10, 2.6, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // patchy SHEDDING tufts coming loose along the back/flank (spring)
  if (p.shedAmt > 0.001) {
    ctx.fillStyle = rgb(p.coatLight, 0.85 * p.shedAmt);
    const tufts: Array<[number, number, number]> = [
      [bx - 8, by - 7, 0.3],
      [bx - 1, by - 8.4, -0.2],
      [bx + 7, by - 6.6, 0.5],
      [bx + 11, by - 1, 0.1],
    ];
    for (const [tx, ty, rot] of tufts) {
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(rot);
      // a frizzy loose clump (two small bumps)
      ctx.beginPath();
      ctx.ellipse(-1, 0, 1.6, 1.1, 0, 0, Math.PI * 2);
      ctx.ellipse(1.2, -0.4, 1.3, 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // snow settled on the back/dome (winter) — a soft white cap
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgb([248, 252, 255], 0.92 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 1, by - 7.6, 10 * (0.9 + vol * 0.2), 3.2, -0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb([255, 255, 255], 0.85 * p.backSnowAmt);
    for (const [dx, dy] of [[-6, -8.4], [0, -9.0], [6, -8.0]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.4 + vol * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the coat (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([255, 255, 255], 0.72 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-8, 0], [-2, 4], [4, -2], [9, 2], [0, -4], [-5, -6], [7, 4], [12, -1],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── HEAD (high DOMED head) — front-¾, lower-left of the body ────────────────
  const hx = bx - 13; // head centre
  const hy = by - 4; // head sits high and forward

  // domed-head outline + fill (a tall rounded dome above the trunk base)
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 7.6, 8.8, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.coatShadow);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 6.8, 8.0, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.coatMid);
  ctx.beginPath();
  ctx.ellipse(hx - 0.5, hy - 0.6, 6.2, 7.4, -0.05, 0, Math.PI * 2);
  ctx.fill();
  // lit dome (upper-left)
  ctx.fillStyle = rgb(p.coatLight);
  ctx.beginPath();
  ctx.ellipse(hx - 1.8, hy - 2.6, 4.0, 4.8, -0.05, 0, Math.PI * 2);
  ctx.fill();

  // the domed crest highlight — a fur-tuft peak on top of the head
  ctx.fillStyle = rgb(p.coatMid);
  ctx.beginPath();
  ctx.moveTo(hx - 3.4, hy - 6.4);
  ctx.quadraticCurveTo(hx - 1, hy - 10.4, hx + 1.4, hy - 6.0);
  ctx.quadraticCurveTo(hx - 1, hy - 7.2, hx - 3.4, hy - 6.4);
  ctx.closePath();
  ctx.fill();
  // a few crest strands of long hair
  ctx.strokeStyle = rgb(p.coatShadow, 0.8);
  ctx.lineWidth = 0.9;
  ctx.lineCap = "round";
  for (const ox of [-2.4, -0.6, 1.2]) {
    ctx.beginPath();
    ctx.moveTo(hx + ox, hy - 6.6);
    ctx.lineTo(hx + ox - 0.4, hy - 9.0 + Math.abs(ox) * 0.5);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // ── small EAR (one near ear visible, low on the back of the head) ──────────
  {
    ctx.save();
    ctx.translate(hx + 4.2, hy - 0.4);
    ctx.rotate(0.25 + earFlick * 0.4);
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.4, 3.0, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(p.coatShadow);
    ctx.beginPath();
    ctx.ellipse(-0.2, 0, 1.8, 2.4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // eye
  ctx.fillStyle = rgb(p.darkPart);
  ctx.beginPath();
  ctx.ellipse(hx - 2.4, hy - 1.2, 1.0, 1.2, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb([255, 255, 255], 0.5);
  ctx.beginPath();
  ctx.arc(hx - 2.7, hy - 1.6, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // ── TUSKS — two very long curved ivory tusks sweeping down & forward, then
  //    curling back up. Drawn before the trunk so the trunk overlaps between
  //    them. The far tusk is dimmer/behind. ────────────────────────────────────
  const drawTusk = (rootX: number, rootY: number, spread: number, dim: number): void => {
    // outline
    ctx.strokeStyle = rgb(p.outline, dim);
    ctx.lineWidth = 3.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    ctx.quadraticCurveTo(rootX - 3 - spread, rootY + 9, rootX - 1 - spread, rootY + 15);
    ctx.quadraticCurveTo(rootX + 1 - spread, rootY + 19, rootX + 5 - spread * 0.5, rootY + 18);
    ctx.stroke();
    // shaded ivory
    ctx.strokeStyle = rgb(p.tuskShade, dim);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    ctx.quadraticCurveTo(rootX - 3 - spread, rootY + 9, rootX - 1 - spread, rootY + 15);
    ctx.quadraticCurveTo(rootX + 1 - spread, rootY + 19, rootX + 5 - spread * 0.5, rootY + 18);
    ctx.stroke();
    // lit ivory front
    ctx.strokeStyle = rgb(p.tuskLight, dim);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(rootX - 0.6, rootY + 1);
    ctx.quadraticCurveTo(rootX - 3.6 - spread, rootY + 9, rootX - 1.6 - spread, rootY + 14.5);
    ctx.stroke();
  };
  // far tusk (slightly behind/right, dimmer)
  drawTusk(hx + 3.2, hy + 4.4, -1.6, 0.85);
  // near tusk (lower-left, full bright)
  drawTusk(hx - 1.4, hy + 4.8, 2.0, 1.0);

  // ── TRUNK — a curling reddish-brown trunk hanging from the head between the
  //    tusks, curving toward lower-left then curling up at the tip. trunkSway
  //    swings/curls the lower segment. ──────────────────────────────────────────
  {
    const t0x = hx - 0.4; // trunk root under the dome
    const t0y = hy + 4.2;
    const tipX = hx - 6 + trunkSway; // curling tip
    const tipY = hy + 16 + trunkSway * 0.4;
    const midX = hx - 5 + trunkSway * 0.6;
    const midY = hy + 11;
    // outline
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 5.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(t0x, t0y);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    // curl the very tip back up
    ctx.quadraticCurveTo(tipX + 2.6, tipY + 2.6, tipX + 3.8 + trunkSway * 0.5, tipY - 0.4);
    ctx.stroke();
    // shaded trunk
    ctx.strokeStyle = rgb(p.trunkShade);
    ctx.lineWidth = 4.0;
    ctx.beginPath();
    ctx.moveTo(t0x, t0y);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.quadraticCurveTo(tipX + 2.6, tipY + 2.6, tipX + 3.8 + trunkSway * 0.5, tipY - 0.4);
    ctx.stroke();
    // lit front of the trunk
    ctx.strokeStyle = rgb(p.coatLight, 0.85);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(t0x - 1.2, t0y + 1);
    ctx.quadraticCurveTo(midX - 1.6, midY, tipX - 1, tipY - 1);
    ctx.stroke();
    // trunk ring creases (a few short cross-ticks for the segmented look)
    ctx.strokeStyle = rgb(p.outline, 0.5);
    ctx.lineWidth = 0.9;
    for (let i = 1; i <= 3; i++) {
      const tt = i / 4;
      const rxp = lerp(t0x, tipX, tt) + (tt * (1 - tt)) * (midX - (t0x + tipX) / 2) * 2;
      const ryp = lerp(t0y, tipY, tt) + (tt * (1 - tt)) * (midY - (t0y + tipY) / 2) * 2;
      ctx.beginPath();
      ctx.moveTo(rxp - 2, ryp);
      ctx.lineTo(rxp + 2, ryp);
      ctx.stroke();
    }
    ctx.lineCap = "butt";

    // breath-fog puff at the trunk tip (winter) — at rest a faint static puff
    if (p.breathFogAmt > 0.001) {
      ctx.fillStyle = rgb([235, 244, 255], 0.4 * p.breathFogAmt);
      ctx.beginPath();
      ctx.ellipse(tipX + 5.4 + trunkSway * 0.5, tipY - 1.4, 3.0, 2.0, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
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

function paint(
  ctx: CanvasRenderingContext2D,
  pIn: P,
  bob: number,
  trunkSway = 0,
  earFlick = 0,
): void {
  const p = clampP(pIn);
  ctx.save();
  try {
    ctx.lineJoin = "round";
    paintPad(ctx, p);
    paintMammoth(ctx, p, bob, trunkSway, earFlick);
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

    // slow continuous trunk sway/curl (seamless sine; soft idle, not silhouette)
    const trunkSway = Math.sin(t * 0.9) * 1.5;

    // ear flick once per ~5s loop — brief sharp bump, seamless (0 at loop edges)
    const loop = (t % 5) / 5;
    const flickGate = Math.max(0, Math.sin(loop * Math.PI * 2)) ** 6; // brief window
    const earFlick = Math.sin(t * 9) * flickGate;

    paint(ctx, SP[season], bob, trunkSway, earFlick);

    // ── Additive micro-motion, drawn over the painted tile ──────────────────
    ctx.save();
    try {
      const bx = 3;
      const by = 1 - bob;
      const hx = bx - 13;
      const hy = by - 4;

      if (season === "Spring") {
        // a shed-tuft drifts loose + falls, seamless 3.6s loop; plus dew shimmer
        const prog = ((t / 3.6) % 1 + 1) % 1;
        const tx = bx - 2 + prog * 6 + Math.sin(prog * Math.PI * 2) * 2;
        const ty = by - 6 + prog * 18;
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(prog * 3);
        ctx.fillStyle = rgb(p.coatLight, (1 - prog) * 0.8);
        ctx.beginPath();
        ctx.ellipse(-1, 0, 1.6, 1.0, 0, 0, Math.PI * 2);
        ctx.ellipse(1.1, -0.3, 1.2, 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // dew shimmer on the grass
        const g = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.4));
        ctx.fillStyle = rgb([255, 255, 255], g);
        ctx.beginPath();
        ctx.arc(-9, 18.4, 1.1 + g, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(10, 19.6, 0.9 + g * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // glossy coat sheen sweeping across the thin-coated hide
        const s = 0.5 + 0.5 * Math.sin(t * 1.0);
        const sx = bx - 10 + s * 20;
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([255, 255, 255], 0.32);
        ctx.beginPath();
        ctx.ellipse(sx, by - 2, 3.0, 6.0, 0.28, 0, Math.PI * 2);
        ctx.fill();
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
        // Winter: breath-fog puff pulses outward from the trunk tip + drifting
        // snowflakes + a cold sheen. (trunk tip mirrors the sway in paint.)
        const trunkSway = Math.sin(t * 0.9) * 1.5;
        const tipX = hx - 6 + trunkSway;
        const tipY = hy + 16 + trunkSway * 0.4;
        const breathe = 0.5 + 0.5 * Math.sin(t * 1.2);
        const reach = 4 + breathe * 3.5;
        ctx.fillStyle = rgb([235, 244, 255], (0.18 + 0.32 * breathe) * p.breathFogAmt);
        ctx.beginPath();
        ctx.ellipse(tipX + 5 + reach * 0.4, tipY - 1.4, 2.8 + breathe * 1.8, 2.0 + breathe * 1.2, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // a couple of drifting snowflakes on seamless falls
        const flakes: Array<[number, number]> = [[8, 0.0], [-6, 0.45]];
        ctx.fillStyle = rgb([255, 255, 255], 0.85);
        for (const [fx, ph] of flakes) {
          const prog = ((t / 3.4 + ph) % 1 + 1) % 1;
          const fy = -20 + prog * 38;
          const fxx = fx + Math.sin(prog * Math.PI * 2 + ph * 6) * 4;
          ctx.globalAlpha = 0.5 + 0.4 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.arc(fxx, fy, 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // cold sheen pulse on the coat
        const sheen = 0.5 + 0.5 * Math.sin(t * 0.8);
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([206, 224, 255], 0.12 + sheen * 0.12);
        ctx.beginPath();
        ctx.ellipse(bx, by, 14, 9, -0.05, 0, Math.PI * 2);
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
