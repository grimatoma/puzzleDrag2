// Seasonal art for the MOUNT DONKEY board tile (`tile_mount_donkey`).
//
// A SINGLE parameterized paint renders the whole tile (grass pad + the one
// grey donkey + seasonal dressing) from a tweenable parameter set `P`. The four
// seasons are four `P` presets; the three forward transitions lerp EVERY field
// of `P` through a quintic smoothstep, so transition(0) === the from-season
// still and transition(1) === the to-season still — no snap.
//
// PALETTE LOCK: the donkey is ALWAYS the same stocky GREY donkey — a grey body,
// a PALE muzzle + belly, VERY LONG upright EARS, a SHORT DARK upright mane and a
// DARK DORSAL STRIPE down the spine, slender legs with dark hooves, and a
// tufted tail. The SILHOUETTE and the grey / pale-muzzle / dark-mane IDENTITY
// colours are constant across all seasons. Only the COAT thickness (`coatVolume`
// — sleek in spring → thicker & fluffed in winter), the pad colour, the light
// wash, and dressing (blossom, fallen leaves, frost, back-snow, breath-fog)
// change. The donkey is never recoloured, hollowed, or swapped, and it stays
// grey with long ears every season.
//
// Animal framing: the donkey stands on the pad in front-¾, turned ~15–20° toward
// lower-left; the full body is readable and may overhang the pad width; the
// legs/hooves contact the pad.
//
// Origin-centered in the −24..+24 design box, light from upper-left, flat
// cel-shaded with a soft dark outline. Animations are deterministic
// (sin/cos/modulo of `t` in seconds), seamless, and subtle: a slow breathing
// bob (zero velocity at t=0 → anim(…,0) matches the still), an ear swivel/flick
// and a tail swish once per loop, plus the per-season micro-motion (spring dew
// shimmer, summer coat sheen, autumn leaf stir, winter breath-fog pulse +
// drifting snowflake).

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

// breathing bob: A*(1-cos(w t))*0.5 — value AND velocity are 0 at t=0,
// seamless over a 2π/w period, peak amplitude A.
function bobAt(t: number, amp = 1.0, w = 1.35): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────
//
// IDENTITY colours (grey coat, pale muzzle/belly, dark mane/stripe, dark
// hooves/eyes) stay nearly constant; they live in P only so the light wash +
// coat thickness can nudge them very slightly between seasons. Everything that
// genuinely differs per season is the coat volume + pad + light + dressing.

interface P {
  coatLight: RGB; // lit top of the grey coat
  coatMid: RGB; // body grey tone
  coatShadow: RGB; // shaded underside of the grey coat
  belly: RGB; // pale muzzle + belly + inner ear (locked pale)
  mane: RGB; // dark upright mane + dorsal stripe + tail tuft (locked dark)
  maneShade: RGB; // deeper shade inside the mane / tuft
  hoofDark: RGB; // hooves + eyes (the dark hard parts)
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  coatVolume: number; // 0..1 coat thickness (sleek → fluffed & puffed outline)
  gloss: number; // 0..1 coat sheen strength (summer peak)
  frostAmt: number; // 0..1 frost sparkle on the coat
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad (autumn)
  breathFogAmt: number; // 0..1 breath puff at the muzzle (winter)
}

// Four season presets. The donkey stays the SAME grey, pale-muzzled,
// long-eared, dark-maned donkey; only coat volume + pad + light + dressing.
const SP: Record<SeasonName, P> = {
  // Spring — sleek grey coat, dewy lime pad + blossom, cool-bright light.
  Spring: {
    coatLight: [176, 176, 180],
    coatMid: [140, 140, 146],
    coatShadow: [98, 98, 106],
    belly: [216, 212, 206],
    mane: [60, 56, 56],
    maneShade: [38, 36, 38],
    hoofDark: [46, 42, 44],
    padGrass: [128, 206, 86], // bright lime dewy grass
    soil: [86, 132, 54],
    outline: [54, 50, 52],
    lightWash: [214, 240, 255], // cool-bright
    lightWashAmt: 0.16,
    coatVolume: 0.12, // sleek
    gloss: 0.3,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.65,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Summer — normal grey coat (PEAK), saturated mid-green pad, warm light.
  Summer: {
    coatLight: [186, 184, 186],
    coatMid: [148, 146, 150],
    coatShadow: [100, 98, 104],
    belly: [222, 218, 210],
    mane: [56, 52, 52],
    maneShade: [34, 32, 34],
    hoofDark: [42, 38, 40],
    padGrass: [86, 170, 64], // saturated mid-green
    soil: [58, 112, 40],
    outline: [50, 46, 48],
    lightWash: [255, 244, 206], // warm
    lightWashAmt: 0.14,
    coatVolume: 0.4, // normal full coat
    gloss: 0.95, // glossiest peak
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Autumn — slightly fuller coat, olive-tan browning pad, fallen leaves.
  Autumn: {
    coatLight: [174, 170, 168],
    coatMid: [138, 134, 134],
    coatShadow: [96, 92, 94],
    belly: [216, 210, 198],
    mane: [58, 54, 52],
    maneShade: [36, 33, 33],
    hoofDark: [46, 41, 42],
    padGrass: [156, 142, 78], // olive-tan
    soil: [104, 84, 44],
    outline: [52, 48, 48],
    lightWash: [255, 206, 138], // low amber
    lightWashAmt: 0.2,
    coatVolume: 0.62, // slightly fuller
    gloss: 0.4,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.7,
    breathFogAmt: 0,
  },
  // Winter — thick fluffed coat + back-snow + breath fog, snowy pad, cool light.
  Winter: {
    coatLight: [184, 188, 196],
    coatMid: [146, 150, 158],
    coatShadow: [102, 106, 116],
    belly: [224, 226, 228],
    mane: [60, 58, 60],
    maneShade: [40, 38, 42],
    hoofDark: [50, 46, 48],
    padGrass: [222, 232, 244], // snow on the pad
    soil: [150, 168, 190],
    outline: [56, 52, 56],
    lightWash: [206, 222, 248], // cool blue-grey
    lightWashAmt: 0.24,
    coatVolume: 1, // thick & fluffed
    gloss: 0.2,
    frostAmt: 0.65,
    backSnowAmt: 0.7,
    padSnowAmt: 0.85,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.7,
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    coatLight: lerpRGB(a.coatLight, b.coatLight, t),
    coatMid: lerpRGB(a.coatMid, b.coatMid, t),
    coatShadow: lerpRGB(a.coatShadow, b.coatShadow, t),
    belly: lerpRGB(a.belly, b.belly, t),
    mane: lerpRGB(a.mane, b.mane, t),
    maneShade: lerpRGB(a.maneShade, b.maneShade, t),
    hoofDark: lerpRGB(a.hoofDark, b.hoofDark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    coatVolume: lerp(a.coatVolume, b.coatVolume, t),
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

// the low flat grass pad the donkey stands on
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

// one slender leg: a thin grey cannon with a dark hoof at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  // grey leg with outline
  ctx.strokeStyle = rgb(p.outline);
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  ctx.strokeStyle = rgb(p.coatShadow);
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY - 1.4);
  ctx.stroke();
  // dark hoof
  ctx.fillStyle = rgb(p.hoofDark);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 1.7, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// Trace the donkey's barrel body path (constant silhouette). cx,cy = body
// centre. vol modestly puffs/fluffs the outline; the underlying shape is
// constant. The donkey is a touch stockier/rounder than a horse.
function bodyPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, vol: number): void {
  const rx = 12.0 * (0.97 + vol * 0.12);
  const ry = 8.2 * (0.97 + vol * 0.14);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, -0.05, 0, Math.PI * 2);
}

// the whole donkey, standing front-¾ turned ~15-20° toward lower-left
function paintDonkey(
  ctx: CanvasRenderingContext2D,
  p: P,
  bob: number,
  earSwivel = 0,
  tailSway = 0,
  headToss = 0,
): void {
  // body centre lifts with the breathing bob
  const bx = 2;
  const by = 2 - bob;
  const vol = p.coatVolume;

  // legs first (behind the body). Two far (dimmer/higher), two near.
  ctx.save();
  ctx.globalAlpha = 0.9;
  paintLeg(ctx, p, bx + 8, by + 5.8, 18.8);
  paintLeg(ctx, p, bx - 4, by + 5.8, 19.0);
  ctx.restore();
  // near legs (toward lower-left, slightly forward)
  paintLeg(ctx, p, bx + 5.5, by + 6.2, 19.6);
  paintLeg(ctx, p, bx - 6.5, by + 6.2, 19.8);

  // ── TAIL — drawn behind the body, hanging from the upper-right rump.
  //    A slim dark switch ending in a dark TUFT. tailSway swings the tip. ───────
  {
    const tx0 = bx + 10.5;
    const ty0 = by - 3.5;
    const tipX = tx0 + 3 + tailSway * 1.6;
    const tipY = by + 12.5;
    // slim grey switch (the dock is coat-coloured), then dark toward the tuft
    ctx.strokeStyle = rgb(p.coatShadow);
    ctx.lineWidth = 2.6 * (0.9 + vol * 0.2);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tx0, ty0);
    ctx.quadraticCurveTo(tx0 + 4 + tailSway, by + 4, tipX, tipY - 2);
    ctx.stroke();
    // dark tail TUFT at the tip (donkey signature)
    ctx.fillStyle = rgb(p.maneShade);
    ctx.beginPath();
    ctx.ellipse(tipX, tipY, 2.2, 3.2, 0.1 + tailSway * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgb(p.mane, 0.9);
    ctx.lineWidth = 1.0;
    for (const off of [-1.4, 0, 1.6]) {
      ctx.beginPath();
      ctx.moveTo(tipX + off * 0.5, tipY - 2);
      ctx.quadraticCurveTo(tipX + off, tipY + 1, tipX + off * 1.2, tipY + 3.4);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  }

  // ── BODY barrel — outline pass then light fill (layered like wheat) ─────────
  // outline halo
  ctx.fillStyle = rgb(p.outline);
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(1.1, 1.14);
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
  ctx.translate(-0.4, -0.4);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  ctx.restore();
  // lit coat, offset up-left (light from upper-left)
  ctx.save();
  ctx.fillStyle = rgb(p.coatLight);
  ctx.translate(-1.6, -1.8);
  bodyPath(ctx, bx, by, vol * 0.7);
  ctx.fill();
  ctx.restore();

  // pale belly + lower-flank patch (donkey signature — light underside)
  ctx.save();
  bodyPath(ctx, bx, by, vol);
  ctx.clip();
  ctx.fillStyle = rgb(p.belly, 0.92);
  ctx.beginPath();
  ctx.ellipse(bx - 1, by + 4.4, 9.5, 4.2, -0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── DORSAL STRIPE — a dark line running along the spine (donkey signature).
  //    Curves with the barrel's top; locked dark. ──────────────────────────────
  ctx.strokeStyle = rgb(p.mane, 0.85);
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx - 9, by - 5.4);
  ctx.quadraticCurveTo(bx, by - 8.4, bx + 10.5, by - 3.6);
  ctx.stroke();
  ctx.lineCap = "butt";

  // coat sheen band over the back (summer peak — gloss strong)
  if (p.gloss > 0.02) {
    ctx.save();
    bodyPath(ctx, bx, by, vol);
    ctx.clip();
    ctx.fillStyle = rgb([255, 255, 255], 0.12 + 0.18 * p.gloss);
    ctx.beginPath();
    ctx.ellipse(bx - 2, by - 4.6, 8.6, 2.4, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // fluffed winter coat fringe: a few soft tufts along the lower/belly edge,
  // only when the coat is thick (vol high). Constant silhouette otherwise.
  if (vol > 0.55) {
    const fr = (vol - 0.55) / 0.45;
    ctx.fillStyle = rgb(p.coatShadow, 0.9);
    const rx = 12.0 * (0.97 + vol * 0.12);
    const ry = 8.2 * (0.97 + vol * 0.14);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 0.15 + (i / 8) * Math.PI * 0.9; // lower-front arc
      const lx = bx + Math.cos(a) * rx * 1.02;
      const ly = by + Math.sin(a) * ry * 1.02;
      ctx.beginPath();
      ctx.arc(lx, ly, (1.2 + 0.9 * fr) * (i % 2 ? 1 : 0.8), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // snow settled on the back (winter) — a soft white cap on top of the back
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgb([248, 252, 255], 0.92 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx, by - 7.0, 8.6 * (0.9 + vol * 0.2), 3.0, -0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb([255, 255, 255], 0.85 * p.backSnowAmt);
    for (const [dx, dy] of [[-5, -7.6], [1, -8.2], [6, -7.2]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.4 + vol * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the coat (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([255, 255, 255], 0.75 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-7, 0], [-2, 4], [4, -2], [8, 2], [0, -3], [-4, -5], [6, 4],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── NECK + HEAD (front-¾, lower-left). A blocky grey head with a pale muzzle,
  //    VERY LONG upright ears, and a short upright dark mane along the neck;
  //    headToss lifts/lowers the muzzle. ────────────────────────────────────
  const neckTopX = bx - 8;
  const neckTopY = by - 5;
  const hx = bx - 15; // head centre
  const hy = by - 1 - headToss; // head lifts with a toss

  // neck — a sturdy grey wedge from the shoulder up toward the head
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.moveTo(bx - 3, by - 6);
  ctx.quadraticCurveTo(neckTopX - 1, neckTopY - 1, hx + 2.5, hy - 3.5);
  ctx.lineTo(hx + 4.5, hy + 3.5);
  ctx.quadraticCurveTo(neckTopX + 3, by + 1, bx - 1, by + 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgb(p.coatMid);
  ctx.beginPath();
  ctx.moveTo(bx - 3, by - 5.6);
  ctx.quadraticCurveTo(neckTopX - 0.6, neckTopY - 0.4, hx + 2.6, hy - 3);
  ctx.lineTo(hx + 4.2, hy + 3);
  ctx.quadraticCurveTo(neckTopX + 3, by + 0.6, bx - 1, by + 2.4);
  ctx.closePath();
  ctx.fill();
  // lit front edge of the neck
  ctx.strokeStyle = rgb(p.coatLight, 0.8);
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(hx + 4.0, hy + 2.6);
  ctx.quadraticCurveTo(neckTopX + 3, by + 0.4, bx - 1, by + 2);
  ctx.stroke();
  ctx.lineCap = "butt";

  // ── MANE — SHORT, UPRIGHT, dark, standing along the crest of the neck
  //    (donkey signature: a stiff brush, not a flowing mane). Locked dark. ──────
  {
    // dark base ridge following the neck crest
    ctx.strokeStyle = rgb(p.maneShade);
    ctx.lineWidth = 3.2 * (0.9 + vol * 0.2);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx - 3, by - 6.4);
    ctx.quadraticCurveTo(neckTopX - 1, neckTopY - 1.8, hx + 2.2, hy - 4.6);
    ctx.stroke();
    // short upright bristles standing UP off the crest
    ctx.lineWidth = 1.2;
    const tufts: Array<[number, number, number]> = [
      [bx - 3.5, by - 6.6, 0.1],
      [bx - 6, by - 6.9, 0.35],
      [neckTopX - 0.6, neckTopY - 2.0, 0.6],
      [hx + 1.0, hy - 4.8, 0.85],
    ];
    for (let i = 0; i < tufts.length; i++) {
      const [sx, sy, ph] = tufts[i];
      // bristles point slightly up-and-back, swivel a touch with earSwivel
      const sw = earSwivel * 0.25 * (0.4 + ph);
      ctx.strokeStyle = rgb(i % 2 ? p.mane : p.maneShade, 0.95);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + 0.4 + sw, sy - 1.8, sx + 0.9 + sw, sy - 3.4);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  }

  // VERY LONG upright ears on the crown (grey outer + pale inner), toward
  // lower-left. The defining donkey feature — tall, narrow, near-vertical.
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(hx + 1.2 + side * 1.7, hy - 5.6);
    // near-upright, splayed only slightly; far ear leans a hair more
    ctx.rotate(-0.06 + side * 0.22 + earSwivel * (side > 0 ? 0.0 : 1.0));
    // outer ear (long, narrow)
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.moveTo(0, 3.2);
    ctx.quadraticCurveTo(-1.4, -4.6, 0.3, -7.2);
    ctx.quadraticCurveTo(1.9, -4.4, 1.5, 3.0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgb(p.coatMid);
    ctx.beginPath();
    ctx.moveTo(0.2, 2.8);
    ctx.quadraticCurveTo(-0.8, -4.0, 0.4, -6.2);
    ctx.quadraticCurveTo(1.4, -4.0, 1.1, 2.6);
    ctx.closePath();
    ctx.fill();
    // pale inner ear
    ctx.fillStyle = rgb(p.belly, 0.9);
    ctx.beginPath();
    ctx.ellipse(0.5, -1.4, 0.55, 3.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // head — a blocky grey wedge muzzle, tilted toward lower-left
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(0.34);
  // outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.4, 6.0, 0, 0, Math.PI * 2);
  ctx.fill();
  // grey face fill (shaded then lit)
  ctx.fillStyle = rgb(p.coatShadow);
  ctx.beginPath();
  ctx.ellipse(0, 0, 3.7, 5.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.coatMid);
  ctx.beginPath();
  ctx.ellipse(-0.4, -0.4, 3.3, 4.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.coatLight);
  ctx.beginPath();
  ctx.ellipse(-0.9, -0.9, 2.4, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // short dark forelock tuft between the ears, over the forehead
  ctx.fillStyle = rgb(p.maneShade);
  ctx.beginPath();
  ctx.moveTo(-1.4, -4.8);
  ctx.quadraticCurveTo(0.4, -6.0, 1.4, -4.4);
  ctx.quadraticCurveTo(0.2, -3.4, -1.0, -3.6);
  ctx.closePath();
  ctx.fill();

  // eye
  ctx.fillStyle = rgb(p.hoofDark);
  ctx.beginPath();
  ctx.ellipse(1.4, -1.6, 1.0, 1.3, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb([255, 255, 255], 0.5);
  ctx.beginPath();
  ctx.arc(1.1, -2.0, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // PALE muzzle / nostril at the lower face (donkey signature — soft white
  // muzzle ring around the nose)
  ctx.fillStyle = rgb(p.belly);
  ctx.beginPath();
  ctx.ellipse(0.4, 4.3, 2.7, 2.3, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.hoofDark, 0.85);
  ctx.beginPath();
  ctx.ellipse(0.9, 4.7, 0.6, 0.9, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore(); // end head transform

  // breath-fog puff at the muzzle (winter) — at rest a faint static puff
  if (p.breathFogAmt > 0.001) {
    ctx.fillStyle = rgb([235, 244, 255], 0.4 * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(hx - 4.6, hy + 4.6, 3.0, 2.0, 0.2, 0, Math.PI * 2);
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

function paint(
  ctx: CanvasRenderingContext2D,
  pIn: P,
  bob: number,
  earSwivel = 0,
  tailSway = 0,
  headToss = 0,
): void {
  const p = clampP(pIn);
  ctx.save();
  try {
    ctx.lineJoin = "round";
    paintPad(ctx, p);
    paintDonkey(ctx, p, bob, earSwivel, tailSway, headToss);
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

    // gentle continuous tail switch sway (seamless sine, nonzero is fine — it's
    // a soft idle, not the silhouette; amplitude small).
    const tailSway = Math.sin(t * 1.1 + 0.4) * 1.4;

    // a tail SWISH once per ~6s loop (a brief stronger swing), seamless.
    const swishLoop = (t % 6) / 6;
    const swishGate = Math.max(0, Math.sin(swishLoop * Math.PI * 2)) ** 4;
    const tailSwish = Math.sin(t * 5) * swishGate * 2.0;

    // head toss once per ~6s loop, seamless (0 at the loop edges via 1-cos)
    const tossLoop = (t % 6) / 6;
    const headToss = 1.2 * (1 - Math.cos(tossLoop * Math.PI * 2)) * 0.5;

    paint(ctx, SP[season], bob, 0, tailSway + tailSwish, headToss);

    // ── Additive micro-motion, drawn over the painted tile ──────────────────
    ctx.save();
    try {
      const bx = 2;
      const by = 2 - bob;
      const hx = bx - 15;
      const hy = by - 1 - headToss;

      // Occasional EAR swivel/flick once per ~5s loop. Brief, seamless — the
      // near (left) long ear swings; redraw it flicked over the existing one.
      const loop = (t % 5) / 5; // 0..1
      const flickGate = Math.max(0, Math.sin(loop * Math.PI * 2)) ** 6; // brief
      const earSwivel = Math.sin(t * 7) * flickGate * 0.5;

      // redraw the near (left) long ear swivelling
      ctx.save();
      ctx.translate(hx + 1.2 - 1.7, hy - 5.6);
      ctx.rotate(-0.06 - 0.22 + earSwivel);
      ctx.fillStyle = rgb(p.outline);
      ctx.beginPath();
      ctx.moveTo(0, 3.2);
      ctx.quadraticCurveTo(-1.4, -4.6, 0.3, -7.2);
      ctx.quadraticCurveTo(1.9, -4.4, 1.5, 3.0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgb(p.coatMid);
      ctx.beginPath();
      ctx.moveTo(0.2, 2.8);
      ctx.quadraticCurveTo(-0.8, -4.0, 0.4, -6.2);
      ctx.quadraticCurveTo(1.4, -4.0, 1.1, 2.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgb(p.belly, 0.9);
      ctx.beginPath();
      ctx.ellipse(0.5, -1.4, 0.55, 3.0, 0, 0, Math.PI * 2);
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
        // coat sheen sweeping across the grey hide
        const s = 0.5 + 0.5 * Math.sin(t * 1.1);
        const sx = bx - 9 + s * 18;
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([255, 255, 255], 0.34);
        ctx.beginPath();
        ctx.ellipse(sx, by - 2, 2.8, 5.4, 0.3, 0, Math.PI * 2);
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
        // Winter: breath-fog puff pulses outward from the muzzle + a drifting
        // snowflake + a cold sheen.
        const breathe = 0.5 + 0.5 * Math.sin(t * 1.35);
        const reach = 4 + breathe * 3;
        ctx.fillStyle = rgb([235, 244, 255], (0.18 + 0.32 * breathe) * p.breathFogAmt);
        ctx.beginPath();
        ctx.ellipse(hx - reach + 0.5, hy + 4.6, 2.6 + breathe * 1.8, 1.8 + breathe * 1.2, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // one drifting snowflake on a seamless 3.4s fall
        const prog = ((t / 3.4) % 1 + 1) % 1;
        const fy = -20 + prog * 36;
        const fxx = 7 + Math.sin(prog * Math.PI * 2) * 4;
        ctx.fillStyle = rgb([255, 255, 255], 0.85);
        ctx.beginPath();
        ctx.arc(fxx, fy, 1.1, 0, Math.PI * 2);
        ctx.fill();

        // cold sheen pulse on the coat
        const sheen = 0.5 + 0.5 * Math.sin(t * 0.8);
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([206, 224, 255], 0.12 + sheen * 0.12);
        ctx.beginPath();
        ctx.ellipse(bx, by, 12.5, 8.2, -0.05, 0, Math.PI * 2);
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
