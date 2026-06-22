// Seasonal art for the PIG-IN-A-BIRD-DISGUISE board tile
// (`tile_bird_pig_in_disguise`).
// Source: src/textures/seasonal/bird/pigInDisguise.ts (verify token: bird/pigInDisguise)
//
// The joke is the whole identity: a round PINK PIG dressed up in a BIRD
// COSTUME — a strapped-on cape of layered teal/blue feathers (little wings)
// over its back, a YELLOW BEAK MASK clipped over its pink snout (the snout
// still pink at the edges), and a small fan of tail-feathers off the rear.
// It stands on a grassy pad in front-¾, turned ~15–20° toward the lower-left
// (ANIMAL framing), full body readable. The pig body mirrors herd/pig.ts; the
// feather/beak shapes mirror bird/chicken.ts.
//
// PALETTE + IDENTITY LOCK: the pig stays the SAME costumed pig EVERY season —
// pig pink hide + the teal feather costume + the yellow beak mask are locked.
// Seasons change ONLY the pad, the light wash, and the winter DRESSING
// (a knit scarf, snow on the cape, a breath-fog puff) — never the pig's
// identity, never the costume's colours. (Autumn nudges the beak mask a few
// degrees ASKEW for character — same mask, just worn crooked.)
//
// A SINGLE parameterized `paint(ctx, p, bob)` renders the whole tile from a
// tweenable parameter set `P`. The four seasons are four `P` presets; the
// three forward transitions lerp EVERY field of `P` through a quintic
// smoothstep so transition(0) ≡ draw(from) and transition(1) ≡ draw(to)
// — no snap. The breathing bob uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero
// velocity → seamless idle. Idle also adds a tiny tail-feather flutter + a
// small beak-mask wobble (both 0 at t=0); winter adds breath-fog puffs.
//
// Origin-centered in the −24..+24 design box, light from upper-left, flat
// cel-shaded with a soft dark outline. Pure Canvas-2D vector drawing; never
// throws for any `t` or `p`.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Small math helpers ───────────────────────────────────────────────────────

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
const smoother = (x: number): number => x * x * x * (x * (6 * x - 15) + 10);

// breathing bob: A*(1-cos(w t))*0.5 — value AND velocity are 0 at t=0,
// seamless over a 2π/w period, peak amplitude A.
function bobAt(t: number, amp = 0.9, w = 1.5): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────
//
// Every field tweens (number or RGB). NO booleans / season strings — the paint
// is a pure function of these so transitions interpolate cleanly. The pig hide
// + the costume feather/beak colours are held essentially constant across the
// presets (identity lock); only pad / light / dressing amounts really move.

interface P {
  // pig hide (LOCKED pink across seasons)
  skinLight: RGB; // lit top of the pink hide
  skinMid: RGB; // body mid tone
  skinShadow: RGB; // shaded underside of the hide
  snout: RGB; // pink snout edges peeking past the beak mask
  hoof: RGB; // dark trotter tips
  // bird COSTUME (LOCKED teal feathers + yellow beak mask)
  featherMid: RGB; // teal/blue cape + wing + tail feathers
  featherLight: RGB; // lighter feather tips
  featherDark: RGB; // shadowed feather grooves / straps
  beakMask: RGB; // yellow beak-mask face
  beakMaskDark: RGB; // shaded underside of the beak mask
  // ground + light
  padGrass: RGB; // top of the grass pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  // costume / surface amounts
  featherSheen: number; // 0..1 soft sheen on the cape feathers
  maskTilt: number; // radians — beak mask worn ASKEW (autumn) vs straight
  // winter dressing
  scarfAmt: number; // 0..1 knit scarf around the neck (winter)
  capeSnowAmt: number; // 0..1 snow settled on the feather cape
  frostAmt: number; // 0..1 frost sparkle across the costume
  padSnowAmt: number; // 0..1 snow blanket on the pad
  breathFogAmt: number; // 0..1 breath puff at the snout
  // seasonal pad litter
  blossomAmt: number; // 0..1 tiny blossoms on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad (autumn)
}

// Scarf knit colour is a constant cosy red — used only where scarfAmt > 0.
const SCARF: RGB = [206, 78, 72];
const SCARF_DARK: RGB = [150, 44, 46];

// ── Four season presets ──────────────────────────────────────────────────────
// IDENTITY LOCK: skin* + feather* + beakMask* stay essentially constant. Only
// pad / light / dressing amounts (+ the autumn mask tilt) move.

const SP: Record<SeasonName, P> = {
  // Spring — smooth pink under a bright costume; dewy lime pad + blossom; cool
  // bright light.
  Spring: {
    skinLight: [252, 200, 200],
    skinMid: [238, 162, 168],
    skinShadow: [196, 116, 128],
    snout: [245, 180, 190],
    hoof: [70, 50, 52],
    featherMid: [86, 150, 180],
    featherLight: [150, 205, 225],
    featherDark: [52, 104, 132],
    beakMask: [240, 190, 70],
    beakMaskDark: [200, 150, 40],
    padGrass: [128, 206, 86], // bright lime dewy grass
    soil: [86, 134, 54],
    outline: [120, 70, 78],
    lightWash: [216, 240, 255], // cool-bright
    lightWashAmt: 0.16,
    featherSheen: 0.4,
    maskTilt: 0,
    scarfAmt: 0,
    capeSnowAmt: 0,
    frostAmt: 0,
    padSnowAmt: 0,
    breathFogAmt: 0,
    blossomAmt: 0.7,
    fallenLeafAmt: 0,
  },
  // Summer — healthy PEAK pink, vivid costume, saturated mid-green pad, warm
  // light, strongest shadow.
  Summer: {
    skinLight: [255, 196, 196],
    skinMid: [244, 156, 162],
    skinShadow: [192, 102, 116], // deepest shadow (peak)
    snout: [246, 178, 188],
    hoof: [64, 44, 46],
    featherMid: [70, 158, 192], // vivid teal
    featherLight: [156, 214, 232],
    featherDark: [44, 102, 134],
    beakMask: [246, 196, 72],
    beakMaskDark: [202, 152, 40],
    padGrass: [86, 170, 64], // saturated mid-green
    soil: [58, 112, 40],
    outline: [116, 62, 70],
    lightWash: [255, 244, 206], // warm
    lightWashAmt: 0.14,
    featherSheen: 0.7,
    maskTilt: 0,
    scarfAmt: 0,
    capeSnowAmt: 0,
    frostAmt: 0,
    padSnowAmt: 0,
    breathFogAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — pink + costume warmed by amber light; olive-tan pad + fallen
  // leaves; the BEAK MASK sits a few degrees ASKEW.
  Autumn: {
    skinLight: [246, 192, 188],
    skinMid: [232, 150, 152],
    skinShadow: [190, 104, 112],
    snout: [240, 172, 178],
    hoof: [66, 46, 44],
    featherMid: [82, 146, 172],
    featherLight: [148, 200, 218],
    featherDark: [50, 100, 126],
    beakMask: [238, 186, 66],
    beakMaskDark: [196, 146, 38],
    padGrass: [156, 142, 78], // olive-tan
    soil: [104, 84, 44],
    outline: [112, 62, 64],
    lightWash: [255, 206, 138], // low amber
    lightWashAmt: 0.2,
    featherSheen: 0.42,
    maskTilt: 0.16, // mask worn crooked (a few degrees)
    scarfAmt: 0,
    capeSnowAmt: 0,
    frostAmt: 0,
    padSnowAmt: 0,
    breathFogAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.7,
  },
  // Winter — pink + costume clearly visible under a knit SCARF, snow on the
  // cape + frost; snowy pad, cool light, breath-fog at the snout. NO white-out.
  Winter: {
    skinLight: [244, 196, 198],
    skinMid: [224, 156, 162],
    skinShadow: [180, 116, 132],
    snout: [236, 176, 186],
    hoof: [70, 58, 64],
    featherMid: [86, 146, 176], // costume stays teal, slightly cooled
    featherLight: [156, 206, 226],
    featherDark: [52, 100, 130],
    beakMask: [236, 188, 74],
    beakMaskDark: [196, 148, 44],
    padGrass: [222, 232, 244], // snow on the pad
    soil: [150, 168, 190],
    outline: [104, 72, 84],
    lightWash: [206, 222, 248], // cool blue-grey
    lightWashAmt: 0.24,
    featherSheen: 0.3,
    maskTilt: 0,
    scarfAmt: 0.95,
    capeSnowAmt: 0.7,
    frostAmt: 0.6,
    padSnowAmt: 0.85,
    breathFogAmt: 0.7,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    skinLight: lerpRGB(a.skinLight, b.skinLight, t),
    skinMid: lerpRGB(a.skinMid, b.skinMid, t),
    skinShadow: lerpRGB(a.skinShadow, b.skinShadow, t),
    snout: lerpRGB(a.snout, b.snout, t),
    hoof: lerpRGB(a.hoof, b.hoof, t),
    featherMid: lerpRGB(a.featherMid, b.featherMid, t),
    featherLight: lerpRGB(a.featherLight, b.featherLight, t),
    featherDark: lerpRGB(a.featherDark, b.featherDark, t),
    beakMask: lerpRGB(a.beakMask, b.beakMask, t),
    beakMaskDark: lerpRGB(a.beakMaskDark, b.beakMaskDark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    featherSheen: lerp(a.featherSheen, b.featherSheen, t),
    maskTilt: lerp(a.maskTilt, b.maskTilt, t),
    scarfAmt: lerp(a.scarfAmt, b.scarfAmt, t),
    capeSnowAmt: lerp(a.capeSnowAmt, b.capeSnowAmt, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    breathFogAmt: lerp(a.breathFogAmt, b.breathFogAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
  };
}

// clamp every scalar field defensively (never throw on a wild `p`)
function clampP(p: P): P {
  return {
    ...p,
    lightWashAmt: clamp01(p.lightWashAmt),
    featherSheen: clamp01(p.featherSheen),
    // maskTilt is a small angle, not a 0..1 amount — clamp to a sane range
    maskTilt: Math.max(-0.6, Math.min(0.6, p.maskTilt)),
    scarfAmt: clamp01(p.scarfAmt),
    capeSnowAmt: clamp01(p.capeSnowAmt),
    frostAmt: clamp01(p.frostAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    breathFogAmt: clamp01(p.breathFogAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Subject geometry constants (the SAME silhouette every season) ────────────
// Front-¾ pig turned ~15–20° toward lower-left: round body low-centre, head +
// beak-masked snout reading to the lower-left, tail-feathers off the upper-right.

const BODY_CX = 0; // pig body centre x
const BODY_CY = 5; // pig body centre y (rest; bob lifts it)
const BODY_RX = 13.4; // body half-width
const BODY_RY = 10.4; // body half-height
const HEAD_DX = -11.5; // head offset from body centre (forward / lower-left)
const HEAD_DY = 3.2;

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat grass pad the pig stands on
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

// one short stubby leg: a thick pink stump with a dark trotter at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  ctx.strokeStyle = rgb(p.skinShadow);
  ctx.lineWidth = 4.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  ctx.fillStyle = rgb(p.hoof);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 2.0, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// the round plump body — a fat rounded ellipse; CONSTANT silhouette.
function paintBody(ctx: CanvasRenderingContext2D, cx: number, cy: number, fill: string, scale: number): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(cx, cy, BODY_RX * scale, BODY_RY * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

// A small fan of tail-feathers off the upper-right rear. `flutter` (radians)
// rocks the fan for the idle; 0 = rest. Mirrors chicken tail-feather shaping.
function drawTailFeathers(ctx: CanvasRenderingContext2D, p: P, ox: number, oy: number, flutter: number): void {
  ctx.save();
  ctx.translate(ox, oy);
  // three layered feather blades fanning up-right
  const blades: Array<[number, number]> = [
    [-0.32, 0.0],
    [0.05, 0.06],
    [0.42, 0.12],
  ];
  blades.forEach(([baseAng, len], i) => {
    ctx.save();
    ctx.rotate(baseAng + flutter * (0.6 + i * 0.25));
    const L = 8.5 + len * 4;
    // dark feather outline
    ctx.fillStyle = rgb(p.featherDark);
    ctx.beginPath();
    ctx.moveTo(0, 1.6);
    ctx.quadraticCurveTo(2.6, -L * 0.6, 1.0, -L);
    ctx.quadraticCurveTo(-1.0, -L * 0.6, -2.0, 1.0);
    ctx.closePath();
    ctx.fill();
    // teal feather body, inset
    ctx.fillStyle = rgb(p.featherMid);
    ctx.beginPath();
    ctx.moveTo(0, 0.8);
    ctx.quadraticCurveTo(2.0, -L * 0.6, 0.7, -L + 1.2);
    ctx.quadraticCurveTo(-0.7, -L * 0.55, -1.4, 0.6);
    ctx.closePath();
    ctx.fill();
    // light tip
    ctx.fillStyle = rgb(p.featherLight, 0.8);
    ctx.beginPath();
    ctx.ellipse(0.2, -L + 1.6, 0.9, 1.8, baseAng, 0, Math.PI * 2);
    ctx.fill();
    // central groove
    ctx.strokeStyle = rgb(p.featherDark, 0.7);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, 0.4);
    ctx.lineTo(0.4, -L + 1.6);
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}

// One strapped-on feather WING (a little stack of teal feathers) over the
// back. `side` = -1 near / +1 far; the cape is two of these plus a collar.
function drawWing(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number, side: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  // three stacked feather rows sweeping back-and-down toward the rump
  for (let row = 0; row < 3; row++) {
    const ry = cy - 2 + row * 3.0;
    const spread = 6.5 + row * 1.2;
    // dark base of the row
    ctx.fillStyle = rgb(p.featherDark);
    ctx.beginPath();
    ctx.ellipse(cx + side * 1.0, ry, spread + 0.8, 2.4, side * 0.18, 0, Math.PI * 2);
    ctx.fill();
    // teal feather row
    ctx.fillStyle = rgb(p.featherMid);
    ctx.beginPath();
    ctx.ellipse(cx + side * 1.0, ry - 0.5, spread, 2.0, side * 0.18, 0, Math.PI * 2);
    ctx.fill();
    // scalloped feather tips (little arcs along the lower edge)
    ctx.fillStyle = rgb(p.featherLight, 0.85);
    const tips = 4;
    for (let k = 0; k < tips; k++) {
      const u = (k + 0.5) / tips;
      const tx = cx - spread + u * spread * 2;
      ctx.beginPath();
      ctx.arc(tx, ry + 0.6, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// the whole costumed pig, standing front-¾ turned ~15–20° toward lower-left.
// `flutter` (radians) is the idle tail/cape rock; `maskWobble` (radians) is the
// idle beak-mask wobble. Both 0 at rest.
function paintPig(ctx: CanvasRenderingContext2D, p: P, bob: number, flutter: number, maskWobble: number): void {
  const bx = BODY_CX;
  const by = BODY_CY - bob;

  // ── legs first (behind the body) — four short stubby trotters on the pad ───
  ctx.save();
  ctx.globalAlpha = 0.85;
  paintLeg(ctx, p, bx + 7, by + 6, 18.6);
  paintLeg(ctx, p, bx - 6, by + 6, 18.9);
  ctx.restore();
  paintLeg(ctx, p, bx + 4, by + 7, 19.2);
  paintLeg(ctx, p, bx - 8.5, by + 7, 19.4);

  // ── tail-feathers off the upper-right rear (behind the body mass) ──────────
  drawTailFeathers(ctx, p, bx + 12.4, by - 1.5, flutter);

  // ── BODY — dark outline pass first, then mid, then light top (layered) ─────
  paintBody(ctx, bx, by, rgb(p.outline), 1.06); // soft outline halo
  paintBody(ctx, bx, by, rgb(p.skinMid), 1.0); // pink body mid tone
  // shaded underside crescent + lit top, clipped to the body
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(bx, by, BODY_RX, BODY_RY, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = rgb(p.skinShadow, 0.7);
  ctx.beginPath();
  ctx.ellipse(bx + 2, by + 5.5, 13, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.skinLight);
  ctx.beginPath();
  ctx.ellipse(bx - 2.4, by - 3.4, 9.6, 6.4, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── feather CAPE / strapped-on wings over the back (the disguise) ──────────
  // a leather strap crossing the chest holds the cape on (reads as "costume")
  ctx.strokeStyle = rgb(p.featherDark);
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx - 9, by + 2.5);
  ctx.quadraticCurveTo(bx - 4, by + 6, bx + 3, by + 5.5);
  ctx.stroke();
  ctx.lineCap = "butt";

  // the cape sits as two feather wings over the upper back, clipped roughly to
  // the body so it hugs the pig (light upper-left so far wing slightly dimmer)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(bx, by - 0.5, BODY_RX + 1.5, BODY_RY + 1.0, 0, 0, Math.PI * 2);
  ctx.clip();
  drawWing(ctx, p, bx + 3.5, by - 6.5, +1, 0.92); // far wing
  drawWing(ctx, p, bx - 3.0, by - 6.0, -1, 1.0); // near wing
  // a small upright feather collar where the cape meets the neck
  ctx.fillStyle = rgb(p.featherDark);
  ctx.beginPath();
  ctx.ellipse(bx - 7.5, by - 4.0, 4.4, 3.0, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.featherMid);
  ctx.beginPath();
  ctx.ellipse(bx - 7.8, by - 4.6, 3.6, 2.4, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // soft sheen sweeping the cape feathers
  if (p.featherSheen > 0.02) {
    ctx.fillStyle = rgb([255, 255, 255], 0.1 + 0.26 * p.featherSheen);
    ctx.beginPath();
    ctx.ellipse(bx - 3, by - 7.5, 7.0, 2.2, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // snow settled on the cape (winter) — over the feathers, not a white-out
  if (p.capeSnowAmt > 0.001) {
    ctx.fillStyle = rgb([248, 252, 255], 0.9 * p.capeSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 1, by - 9.0, 8.6, 2.8, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb([255, 255, 255], 0.85 * p.capeSnowAmt);
    for (const [dx, dy] of [[-5, -9.4], [1, -10], [5, -9]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the costume (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([255, 255, 255], 0.75 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-7, -2], [-2, 2], [4, -3], [8, 0], [0, -4], [-4, -6], [6, 3],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── HEAD + beak-MASK over the pink snout (front-¾, lower-left) ──────────────
  paintHead(ctx, p, bx + HEAD_DX, by + HEAD_DY, maskWobble);

  // ── knit SCARF around the neck (winter) — drawn over the neck join, BELOW
  // the head so the face stays clear. The pig + costume remain fully visible.
  if (p.scarfAmt > 0.001) {
    drawScarf(ctx, p, bx + HEAD_DX, by + HEAD_DY, p.scarfAmt);
  }
}

// the pig head: pink ears + a rounded pink head, then a YELLOW BEAK MASK
// clipped over the snout (pink snout edges still peeking past it), friendly
// eyes. `maskWobble` rocks the mask a touch for the idle. Mirrors chicken beak.
function paintHead(ctx: CanvasRenderingContext2D, p: P, hx: number, hy: number, maskWobble: number): void {
  // floppy triangular pink ears, behind/above the head
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(hx + side * 3.2 - 1, hy - 7.4);
    ctx.rotate(side * 0.5 - 0.25);
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.moveTo(0, -0.4);
    ctx.lineTo(3.4, 1.2);
    ctx.lineTo(1.0, 5.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgb(p.skinMid);
    ctx.beginPath();
    ctx.moveTo(0.2, 0.2);
    ctx.lineTo(2.8, 1.4);
    ctx.lineTo(1.1, 4.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgb(p.skinShadow, 0.7);
    ctx.beginPath();
    ctx.moveTo(0.8, 1.0);
    ctx.lineTo(2.2, 1.7);
    ctx.lineTo(1.3, 3.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // head — a rounded pink ovoid tucked into the front-left of the body
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(0.16);
  // outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, 0, 7.4, 6.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // head fill (pink)
  ctx.fillStyle = rgb(p.skinMid);
  ctx.beginPath();
  ctx.ellipse(0, 0, 6.6, 5.9, 0, 0, Math.PI * 2);
  ctx.fill();
  // cheek light (upper-left)
  ctx.fillStyle = rgb(p.skinLight, 0.9);
  ctx.beginPath();
  ctx.ellipse(-1.8, -1.8, 3.2, 2.6, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // eyes — small, friendly (peering out above the beak mask)
  ctx.fillStyle = rgb([245, 245, 240]);
  for (const ex of [-1.6, 1.8]) {
    ctx.beginPath();
    ctx.arc(ex, -1.8, 1.0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = rgb([22, 18, 20]);
  for (const ex of [-1.5, 1.9]) {
    ctx.beginPath();
    ctx.arc(ex, -1.6, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // pink snout edges peeking out from under the beak mask (so the gag reads)
  ctx.fillStyle = rgb(p.snout);
  ctx.beginPath();
  ctx.ellipse(-0.6, 3.6, 4.6, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── the BEAK MASK — a yellow bird-beak clipped over the snout ──────────────
  // Drawn in the head's local frame, wobbling about the snout hinge. In autumn
  // p.maskTilt cocks it a few degrees askew; the idle adds maskWobble.
  ctx.save();
  ctx.translate(-0.6, 2.6); // hinge near the top of the snout
  ctx.rotate(p.maskTilt + maskWobble);
  // an upper + lower beak meeting at a point toward the lower-left
  // upper beak (dark base then yellow)
  ctx.fillStyle = rgb(p.beakMaskDark);
  ctx.beginPath();
  ctx.moveTo(-5.6, 1.0); // tip (lower-left)
  ctx.quadraticCurveTo(0.5, -2.4, 4.2, 0.2); // top edge sweeping to the cheek
  ctx.quadraticCurveTo(1.0, 1.6, -1.0, 1.8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgb(p.beakMask);
  ctx.beginPath();
  ctx.moveTo(-5.0, 0.9);
  ctx.quadraticCurveTo(0.4, -1.9, 3.6, 0.3);
  ctx.quadraticCurveTo(0.6, 1.3, -1.0, 1.5);
  ctx.closePath();
  ctx.fill();
  // lower beak (slightly smaller, below the seam)
  ctx.fillStyle = rgb(p.beakMaskDark);
  ctx.beginPath();
  ctx.moveTo(-5.2, 1.4);
  ctx.quadraticCurveTo(-0.4, 3.6, 3.0, 2.4);
  ctx.quadraticCurveTo(-0.6, 2.3, -5.2, 1.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgb(p.beakMask);
  ctx.beginPath();
  ctx.moveTo(-4.6, 1.5);
  ctx.quadraticCurveTo(-0.4, 3.1, 2.4, 2.1);
  ctx.quadraticCurveTo(-0.6, 2.1, -4.6, 1.5);
  ctx.closePath();
  ctx.fill();
  // top light rim on the upper beak (light upper-left)
  ctx.fillStyle = rgb([255, 245, 210], 0.6);
  ctx.beginPath();
  ctx.moveTo(-3.8, 0.5);
  ctx.quadraticCurveTo(0.2, -1.3, 2.8, -0.1);
  ctx.lineTo(2.4, 0.4);
  ctx.quadraticCurveTo(0.0, -0.6, -3.6, 0.9);
  ctx.closePath();
  ctx.fill();
  // beak seam (between upper & lower)
  ctx.strokeStyle = rgb(p.beakMaskDark, 0.9);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-5.0, 1.3);
  ctx.quadraticCurveTo(-0.4, 2.6, 3.0, 1.4);
  ctx.stroke();
  // a tiny strap dot where the mask clips behind the cheek
  ctx.fillStyle = rgb(p.featherDark, 0.8);
  ctx.beginPath();
  ctx.arc(4.0, 0.6, 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore(); // end beak mask

  ctx.restore(); // end head local frame
}

// a knit scarf wound around the pig's neck (winter dressing). `amt` fades it
// in/out across the autumn→winter transition.
function drawScarf(ctx: CanvasRenderingContext2D, p: P, hx: number, hy: number, amt: number): void {
  ctx.save();
  ctx.globalAlpha = clamp01(amt);
  // the wrap around the neck (a fat band just under the head)
  ctx.lineCap = "round";
  ctx.strokeStyle = rgb(SCARF_DARK);
  ctx.lineWidth = 5.2;
  ctx.beginPath();
  ctx.moveTo(hx - 4.5, hy + 4.6);
  ctx.quadraticCurveTo(hx + 1.5, hy + 6.6, hx + 6.0, hy + 4.0);
  ctx.stroke();
  ctx.strokeStyle = rgb(SCARF);
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.moveTo(hx - 4.5, hy + 4.4);
  ctx.quadraticCurveTo(hx + 1.5, hy + 6.2, hx + 6.0, hy + 3.8);
  ctx.stroke();
  // a hanging tail of the scarf dropping off the near side
  ctx.strokeStyle = rgb(SCARF_DARK);
  ctx.lineWidth = 4.0;
  ctx.beginPath();
  ctx.moveTo(hx + 4.5, hy + 4.4);
  ctx.quadraticCurveTo(hx + 6.5, hy + 8.5, hx + 5.2, hy + 11.5);
  ctx.stroke();
  ctx.strokeStyle = rgb(SCARF);
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(hx + 4.5, hy + 4.4);
  ctx.quadraticCurveTo(hx + 6.5, hy + 8.5, hx + 5.2, hy + 11.5);
  ctx.stroke();
  // little knit-row ticks for texture
  ctx.strokeStyle = rgb(SCARF_DARK, 0.8);
  ctx.lineWidth = 0.7;
  for (let i = -3; i <= 5; i += 2) {
    ctx.beginPath();
    ctx.moveTo(hx + i, hy + 3.2);
    ctx.lineTo(hx + i + 0.6, hy + 6.4);
    ctx.stroke();
  }
  // a couple of fringe strands at the scarf tail's end
  ctx.lineCap = "butt";
  ctx.strokeStyle = rgb(SCARF_DARK);
  ctx.lineWidth = 0.9;
  for (const fx of [-0.8, 0, 0.8]) {
    ctx.beginPath();
    ctx.moveTo(hx + 5.2 + fx, hy + 11.4);
    ctx.lineTo(hx + 5.0 + fx, hy + 13.2);
    ctx.stroke();
  }
  ctx.restore();
}

// breath-fog puff at the snout (winter). `reach`/`grow` animate it; at rest a
// faint static puff.
function drawBreathFog(ctx: CanvasRenderingContext2D, hx: number, hy: number, amt: number, reach: number, grow: number): void {
  if (amt <= 0.001) return;
  ctx.fillStyle = rgb([235, 244, 255], (0.18 + 0.26 * grow) * amt);
  ctx.beginPath();
  ctx.ellipse(hx - 7.0 - reach, hy + 4.2, 2.6 + grow * 1.8, 1.8 + grow * 1.2, 0.2, 0, Math.PI * 2);
  ctx.fill();
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
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    paintPad(ctx, p);
    paintPig(ctx, p, bob, 0, 0);
    // breath-fog at rest (winter) — drawn over the pig, faint and static
    drawBreathFog(ctx, BODY_CX + HEAD_DX, BODY_CY - bob + HEAD_DY, p.breathFogAmt, 0, 0);
    paintLightWash(ctx, p);
  } finally {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }
}

// ── Per-season builders ─────────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const p = clampP(SP[season]);
    const bob = bobAt(t); // SUBJECT breathing bob, 0 at t=0

    // Idle SUBJECT motions — a tail-feather flutter + a small beak-mask wobble.
    // Both must be 0 at t=0 so anim(…,0) === draw. Tie them to the bob phase so
    // the whole loop is seamless over the bob period.
    const flutter = Math.sin(t * 1.5) * 0.14 * (1 - Math.cos(t * 1.5)) * 0.5;
    const maskWobble = Math.sin(t * 2.0) * 0.06 * (1 - Math.cos(t * 1.5)) * 0.5;

    // Re-render the costumed pig with the live flutter/wobble (subject bob and
    // both motions are 0 at t=0, so this equals draw at t=0).
    ctx.save();
    try {
      ctx.globalAlpha = 1;
      ctx.lineJoin = "round";
      paintPad(ctx, p);
      paintPig(ctx, p, bob, flutter, maskWobble);

      const hx = BODY_CX + HEAD_DX;
      const hy = BODY_CY - bob + HEAD_DY;

      // ── per-season additive dressing micro-motion ──────────────────────────
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
        // soft feather sheen sweeping across the cape
        const s = 0.5 + 0.5 * Math.sin(t * 1.1);
        const sx = BODY_CX - 8 + s * 16;
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([255, 255, 255], 0.35);
        ctx.beginPath();
        ctx.ellipse(sx, BODY_CY - bob - 6, 3, 4, 0.3, 0, Math.PI * 2);
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
        // Winter — breath-fog puff pulses outward from the snout + a drifting
        // snowflake + a cold sheen on the costume.
        const breathe = 0.5 + 0.5 * Math.sin(t * 1.5);
        drawBreathFog(ctx, hx, hy, p.breathFogAmt, breathe * 3, breathe);

        const prog = ((t / 3.4) % 1 + 1) % 1;
        const fy = -20 + prog * 36;
        const fxx = 6 + Math.sin(prog * Math.PI * 2) * 4;
        ctx.fillStyle = rgb([255, 255, 255], 0.4 + 0.45 * Math.sin(prog * Math.PI));
        ctx.beginPath();
        ctx.arc(fxx, fy, 1.1, 0, Math.PI * 2);
        ctx.fill();

        const sheen = 0.5 + 0.5 * Math.sin(t * 0.8);
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([206, 224, 255], 0.12 + sheen * 0.12);
        ctx.beginPath();
        ctx.ellipse(BODY_CX, BODY_CY - bob - 1, BODY_RX, BODY_RY, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      paintLightWash(ctx, p);
    } finally {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();
    }
  };
}

// ── Forward transitions (lerp EVERY field through quintic smoothstep) ────────

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
