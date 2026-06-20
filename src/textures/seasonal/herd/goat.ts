// Seasonal art for the HERD GOAT board tile (`tile_herd_goat`).  herd/goat
//
// A SINGLE parameterized paint renders the whole tile (grass pad + the one
// white-and-tan goat + seasonal dressing) from a tweenable parameter set `P`.
// The four seasons are just four `P` presets; the three forward transitions
// lerp EVERY field of `P` through a quintic smoothstep, so transition(0) ===
// the from-season still and transition(1) === the to-season still — no snap.
//
// PALETTE LOCK: the goat is ALWAYS the same compact white-and-tan goat with
// two backward-curving horns, a little chin beard, upright ears, slender legs
// and a short tail. Seasons change only its coat VOLUME (a shedding patchy-thin
// coat in spring → a shaggy thick winter coat), the pad colour, the light wash,
// and dressing (blossom, fallen leaves, frost, back-snow, breath-fog). The
// animal's identity colours (white body + tan saddle, horns, beard) never
// change — winter only adds snow/frost ON TOP; the goat stays clearly visible.
//
// Origin-centered in the −24..+24 design box, light from upper-left, one soft
// contact shadow lower-right. The goat stands front-¾, turned ~15–20° toward
// lower-left. Animations are deterministic (sin/cos/modulo of `t` in seconds),
// seamless, and subtle. The subject's breathing bob has zero velocity at t=0
// (A*(1-cos(w t))*0.5) so anim(…,0) matches the still exactly.

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
  coatLight: RGB; // bright top of the white body coat
  coatShadow: RGB; // shaded underside of the body coat
  saddleTan: RGB; // the tan saddle/markings (the "tan" of white-and-tan)
  horn: RGB; // the curving horns
  hoofDark: RGB; // muzzle ridge, hooves, eyes, beard root
  beard: RGB; // the chin beard tuft
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  coatVolume: number; // 0..1 thickness/shagginess of the coat
  coatPatchy: number; // 0..1 spring shedding patchiness (tufts shed off)
  coatSheen: number; // 0..1 sleek summer coat gloss
  frostAmt: number; // 0..1 frost sparkle on the coat
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad
  breathFogAmt: number; // 0..1 breath puff at the muzzle
}

// Four season presets. The goat stays the SAME white-and-tan horned, bearded
// goat; only coat volume/patchiness + pad + light + dressing differ.
const SP: Record<SeasonName, P> = {
  // Spring — shedding patchy-thin coat; dewy lime pad + blossom; cool-bright.
  Spring: {
    coatLight: [248, 246, 238],
    coatShadow: [206, 200, 186],
    saddleTan: [206, 168, 116],
    horn: [216, 200, 168],
    hoofDark: [60, 52, 46],
    beard: [232, 226, 212],
    padGrass: [128, 206, 88], // bright lime dewy grass
    soil: [86, 134, 54],
    outline: [62, 54, 46],
    lightWash: [214, 240, 255], // cool-bright
    lightWashAmt: 0.16,
    coatVolume: 0.3, // thinned out
    coatPatchy: 0.8, // shedding tufts
    coatSheen: 0.18,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.7,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Summer — normal sleek coat (PEAK); saturated mid-green pad; warm light.
  Summer: {
    coatLight: [250, 248, 240],
    coatShadow: [202, 196, 182],
    saddleTan: [200, 158, 102],
    horn: [214, 196, 160],
    hoofDark: [56, 48, 42],
    beard: [236, 230, 218],
    padGrass: [86, 170, 64], // saturated mid-green
    soil: [58, 112, 40],
    outline: [56, 48, 42],
    lightWash: [255, 244, 206], // warm
    lightWashAmt: 0.15,
    coatVolume: 0.5, // normal coat
    coatPatchy: 0,
    coatSheen: 0.9, // sleek
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Autumn — fuller coat; olive-tan browning pad + fallen leaves; low amber.
  Autumn: {
    coatLight: [244, 238, 226],
    coatShadow: [198, 188, 170],
    saddleTan: [190, 142, 84],
    horn: [206, 184, 144],
    hoofDark: [58, 46, 40],
    beard: [228, 220, 204],
    padGrass: [156, 142, 78], // olive-tan
    soil: [104, 84, 44],
    outline: [58, 46, 38],
    lightWash: [255, 206, 138], // low amber
    lightWashAmt: 0.2,
    coatVolume: 0.72, // fuller, thicker
    coatPatchy: 0,
    coatSheen: 0.35,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.7,
    breathFogAmt: 0,
  },
  // Winter — shaggy thick coat + back snow + breath-fog; snowy pad; cool light.
  Winter: {
    coatLight: [252, 251, 248],
    coatShadow: [208, 210, 218],
    saddleTan: [186, 154, 110],
    horn: [206, 196, 176],
    hoofDark: [62, 58, 64],
    beard: [236, 234, 230],
    padGrass: [222, 232, 244], // snow on the pad
    soil: [150, 168, 190],
    outline: [70, 70, 82],
    lightWash: [206, 222, 248], // cool blue-grey
    lightWashAmt: 0.24,
    coatVolume: 1, // shaggy thick winter coat
    coatPatchy: 0,
    coatSheen: 0.1,
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
    coatLight: lerpRGB(a.coatLight, b.coatLight, t),
    coatShadow: lerpRGB(a.coatShadow, b.coatShadow, t),
    saddleTan: lerpRGB(a.saddleTan, b.saddleTan, t),
    horn: lerpRGB(a.horn, b.horn, t),
    hoofDark: lerpRGB(a.hoofDark, b.hoofDark, t),
    beard: lerpRGB(a.beard, b.beard, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    coatVolume: lerp(a.coatVolume, b.coatVolume, t),
    coatPatchy: lerp(a.coatPatchy, b.coatPatchy, t),
    coatSheen: lerp(a.coatSheen, b.coatSheen, t),
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
    coatPatchy: clamp01(p.coatPatchy),
    coatSheen: clamp01(p.coatSheen),
    frostAmt: clamp01(p.frostAmt),
    backSnowAmt: clamp01(p.backSnowAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    breathFogAmt: clamp01(p.breathFogAmt),
  };
}

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat grass pad the goat stands on
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

// one slender leg: a thin dark-toed cylinder with a hoof at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  // light coat upper, dark hoof lower
  ctx.strokeStyle = rgb(p.coatShadow);
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY - 2.4);
  ctx.stroke();
  // lower leg / hoof darker
  ctx.strokeStyle = rgb(p.hoofDark);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x, baseY - 3);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // hoof tip
  ctx.fillStyle = rgb([30, 26, 28]);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 1.6, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// the compact goat body — a solid rounded torso (NOT a wool cloud). The coat
// volume only modestly puffs the outline & shag; the silhouette stays a goat.
function paintBody(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number, fill: string, grow: number): void {
  const vol = 0.9 + p.coatVolume * 0.22;
  const rx = 12.5 * vol * grow;
  const ry = 8 * vol * grow;
  ctx.fillStyle = fill;
  ctx.beginPath();
  // a torso ellipse, very slightly higher at the shoulders (front, lower-left)
  ctx.ellipse(cx, cy, rx, ry, -0.06, 0, Math.PI * 2);
  ctx.fill();
}

// soft shaggy fringe along the lower edge of the body (grows with coat volume)
function paintCoatShag(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number): void {
  if (p.coatVolume <= 0.34) return;
  const amt = (p.coatVolume - 0.34) / 0.66; // 0 at spring/summer-ish, 1 at winter
  ctx.fillStyle = rgb(p.coatShadow, 0.9);
  const rx = 12.5 * (0.9 + p.coatVolume * 0.22);
  const ry = 8 * (0.9 + p.coatVolume * 0.22);
  const tufts = 9;
  for (let i = 0; i < tufts; i++) {
    const f = i / (tufts - 1);
    const ang = lerp(Math.PI * 0.18, Math.PI * 0.92, f); // along the underbelly arc
    const lx = cx + Math.cos(ang) * rx * 0.96;
    const ly = cy + Math.sin(ang) * ry * 0.96;
    const drop = (2 + amt * 3.2) * (0.6 + 0.4 * Math.sin(i * 1.7));
    ctx.beginPath();
    ctx.moveTo(lx - 1.5, ly - 1);
    ctx.lineTo(lx, ly + drop);
    ctx.lineTo(lx + 1.5, ly - 1);
    ctx.closePath();
    ctx.fill();
  }
}

// the whole goat, standing front-¾ turned ~15–20° toward lower-left
function paintGoat(ctx: CanvasRenderingContext2D, p: P, bob: number): void {
  // body centre lifts with the breathing bob
  const bx = 1;
  const by = 4 - bob;

  // legs first (behind the body). Slender; two back (dimmer), two front.
  ctx.save();
  ctx.globalAlpha = 0.85;
  paintLeg(ctx, p, bx + 7, by + 5, 18.6); // back-far
  paintLeg(ctx, p, bx - 6, by + 5, 18.9); // back-near
  ctx.restore();
  paintLeg(ctx, p, bx + 4.5, by + 5.5, 19.3); // front-far
  paintLeg(ctx, p, bx - 3.5, by + 5.5, 19.6); // front-near

  // shaggy underbelly fringe sits behind/under the body fill
  paintCoatShag(ctx, p, bx, by + 1);

  // BODY — dark outline pass first, then shaded coat, then lit coat (layered)
  paintBody(ctx, p, bx, by, rgb(p.outline), 1.1); // outline halo
  paintBody(ctx, p, bx, by, rgb(p.coatShadow), 1.0); // shaded body
  // lit coat offset up-left (light from upper-left)
  ctx.save();
  ctx.translate(-1.2, -1.4);
  paintBody(ctx, p, bx, by, rgb(p.coatLight), 0.82);
  ctx.restore();

  // tan saddle marking across the back/rump — the "tan" of white-and-tan
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(bx, by, 12.5 * (0.9 + p.coatVolume * 0.22), 8 * (0.9 + p.coatVolume * 0.22), -0.06, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = rgb(p.saddleTan, 0.92);
  ctx.beginPath();
  ctx.ellipse(bx + 4.5, by - 1.5, 7.5, 5.5, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // a small tan patch on the haunch lower-front for two-tone read
  ctx.fillStyle = rgb(p.saddleTan, 0.7);
  ctx.beginPath();
  ctx.ellipse(bx - 6, by + 3, 4, 3, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // spring shedding: patchy thin tufts lifting off the coat (lighter flecks)
  if (p.coatPatchy > 0.001) {
    ctx.fillStyle = rgb(p.coatLight, 0.55 * p.coatPatchy);
    for (const [dx, dy] of [[-6, -5], [2, -6], [6, -3], [-2, -2], [8, 1]] as const) {
      ctx.beginPath();
      ctx.ellipse(bx + dx, by + dy, 1.8, 1.1, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    // a couple of loose shed wisps drifting just off the back
    ctx.strokeStyle = rgb(p.coatShadow, 0.4 * p.coatPatchy);
    ctx.lineWidth = 0.8;
    for (const [wx, wy] of [[-4, -8], [5, -9]] as const) {
      ctx.beginPath();
      ctx.moveTo(bx + wx, by + wy);
      ctx.lineTo(bx + wx + 1.4, by + wy - 2.4);
      ctx.stroke();
    }
  }

  // snow settled on the back (winter) — a soft white cap on top of the coat
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgb([248, 252, 255], 0.92 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx + 1, by - 6.6, 9.5 * (0.9 + p.coatVolume * 0.2), 3.2, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb([255, 255, 255], 0.85 * p.backSnowAmt);
    for (const [dx, dy] of [[-4, -7.4], [2, -8], [6, -7]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.5 + p.coatVolume * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the coat (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([255, 255, 255], 0.8 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-8, 0], [-3, 4], [4, -2], [8, 2], [0, -3], [-5, -4], [6, 4],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // short upright tail at the upper-right rear
  ctx.strokeStyle = rgb(p.coatShadow);
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx + 11, by - 2);
  ctx.lineTo(bx + 13.5, by - 5);
  ctx.stroke();
  ctx.strokeStyle = rgb(p.coatLight);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(bx + 11, by - 2);
  ctx.lineTo(bx + 13.4, by - 4.8);
  ctx.stroke();
  ctx.lineCap = "butt";

  // ── HEAD (front-¾, lower-left) — horns + beard lock the goat identity ──────
  const hx = bx - 11;
  const hy = by + 1.5;

  // upright ears (one each side, behind/beside the head)
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(hx + side * 3.4, hy - 3.2);
    ctx.rotate(side * 0.5 - 0.1);
    // outline
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.9, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // ear fill (white coat, inner tan)
    ctx.fillStyle = rgb(p.coatLight);
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.4, 3.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(p.saddleTan, 0.6);
    ctx.beginPath();
    ctx.ellipse(0, 0.4, 0.7, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // two backward-curving HORNS rising from the crown, sweeping up and back
  for (const side of [-1, 1] as const) {
    const baseX = hx + side * 1.6;
    const baseY = hy - 4.2;
    // outline pass (fatter, dark)
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 3.0;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX + side * 0.5 + 2.2, baseY - 6.5, baseX + 4.5, baseY - 4.5);
    ctx.stroke();
    // horn fill (curving up then back toward upper-right, away from the muzzle)
    ctx.strokeStyle = rgb(p.horn);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX + side * 0.5 + 2.2, baseY - 6.5, baseX + 4.5, baseY - 4.5);
    ctx.stroke();
    // a ridge highlight on the horn
    ctx.strokeStyle = rgb([255, 255, 255], 0.3);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY - 0.4);
    ctx.quadraticCurveTo(baseX + side * 0.5 + 2.0, baseY - 6.4, baseX + 4.2, baseY - 4.6);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // a little wool tuft / forelock on the crown between the horns
  ctx.fillStyle = rgb(p.coatLight);
  ctx.beginPath();
  ctx.ellipse(hx, hy - 3.8, 2.4, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // FACE — an elongated goat muzzle ovoid, tilted toward lower-left
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(0.34);
  // outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, 0.4, 4.2, 5.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // white face fill
  ctx.fillStyle = rgb(p.coatLight);
  ctx.beginPath();
  ctx.ellipse(0, 0.4, 3.6, 5.0, 0, 0, Math.PI * 2);
  ctx.fill();
  // tan blaze down the muzzle / brow shade for two-tone read
  ctx.fillStyle = rgb(p.saddleTan, 0.45);
  ctx.beginPath();
  ctx.ellipse(0.4, -1.6, 1.8, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // darker muzzle nose pad at the lower tip
  ctx.fillStyle = rgb(p.hoofDark);
  ctx.beginPath();
  ctx.ellipse(0.2, 4.2, 1.9, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // gentle cheek light (upper-left)
  ctx.fillStyle = rgb([255, 255, 255], 0.16);
  ctx.beginPath();
  ctx.ellipse(-1.4, -1.4, 1.6, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // eyes (goat: a calm dark eye each side)
  ctx.fillStyle = rgb([245, 245, 240]);
  for (const ex of [-1.7, 1.5]) {
    ctx.beginPath();
    ctx.arc(ex, -0.6, 1.0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = rgb([26, 22, 24]);
  for (const ex of [-1.6, 1.6]) {
    ctx.beginPath();
    ctx.ellipse(ex, -0.4, 0.5, 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // nostrils on the muzzle pad
  ctx.fillStyle = rgb([16, 14, 16]);
  for (const ex of [-0.7, 1.0]) {
    ctx.beginPath();
    ctx.ellipse(ex, 4.2, 0.4, 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // chin BEARD — a little tuft hanging off the front of the muzzle/chin
  {
    // anchor near the muzzle tip (account for the head tilt, lower-left)
    const cxb = hx - 1.6;
    const cyb = hy + 5.6;
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.moveTo(cxb - 1.8, cyb - 1.6);
    ctx.lineTo(cxb - 2.4, cyb + 4.2);
    ctx.lineTo(cxb, cyb + 2.4);
    ctx.lineTo(cxb + 2.0, cyb + 4.0);
    ctx.lineTo(cxb + 1.6, cyb - 1.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgb(p.beard);
    ctx.beginPath();
    ctx.moveTo(cxb - 1.3, cyb - 1.4);
    ctx.lineTo(cxb - 1.8, cyb + 3.6);
    ctx.lineTo(cxb, cyb + 2.0);
    ctx.lineTo(cxb + 1.5, cyb + 3.4);
    ctx.lineTo(cxb + 1.2, cyb - 1.4);
    ctx.closePath();
    ctx.fill();
  }

  // breath-fog puff at the muzzle (winter) — at rest a faint static puff
  if (p.breathFogAmt > 0.001) {
    ctx.fillStyle = rgb([235, 244, 255], 0.4 * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(hx - 4.4, hy + 4.6, 3.0, 2.0, 0.2, 0, Math.PI * 2);
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
    paintGoat(ctx, p, bob);
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
      const bx = 1;
      const by = 4 - bob;
      const hx = bx - 11;
      const hy = by + 1.5;

      // Occasional ear-flick + beard/head bob once per ~5s loop. The gate is a
      // short bump near the end of the period, seamless (0 at the edges).
      const loop = (t % 5) / 5; // 0..1
      const flickGate = Math.max(0, Math.sin(loop * Math.PI * 2)) ** 6; // sharp brief bump
      const flick = Math.sin(t * 9) * flickGate;

      // ear flick (redraw a flicking near-ear over the existing one)
      ctx.save();
      ctx.translate(hx - 3.4, hy - 3.2);
      ctx.rotate(-0.6 + flick * 0.5);
      ctx.fillStyle = rgb(p.outline);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.9, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgb(p.coatLight);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.4, 3.0, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // beard / head bob: a gentle once-per-loop sway of the beard tuft
      const beardSway = flickGate * 0.9 + Math.sin(t * 1.5) * 0.18 * flickGate;
      const cxb = hx - 1.6 + beardSway;
      const cyb = hy + 5.6;
      ctx.fillStyle = rgb(p.beard);
      ctx.beginPath();
      ctx.moveTo(cxb - 1.3, cyb - 1.4);
      ctx.lineTo(cxb - 1.8 + beardSway, cyb + 3.6);
      ctx.lineTo(cxb + beardSway, cyb + 2.0);
      ctx.lineTo(cxb + 1.5 + beardSway, cyb + 3.4);
      ctx.lineTo(cxb + 1.2, cyb - 1.4);
      ctx.closePath();
      ctx.fill();

      if (season === "Spring") {
        // dew shimmer — a soft glint pulsing on the grass/blossoms
        const g = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.4));
        ctx.fillStyle = rgb([255, 255, 255], g);
        ctx.beginPath();
        ctx.arc(-8, 18.4, 1.1 + g, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(10, 19.6, 0.9 + g * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // sleek coat sheen sweeping across the body
        const s = 0.5 + 0.5 * Math.sin(t * 1.1);
        const sx = bx - 9 + s * 18;
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([255, 255, 255], 0.3 + 0.2 * p.coatSheen);
        ctx.beginPath();
        ctx.ellipse(sx, by - 2, 3, 6, 0.3, 0, Math.PI * 2);
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
        // Winter: breath-fog puff pulses outward from the muzzle + a drifting
        // snowflake + a cold sheen.
        const breathe = 0.5 + 0.5 * Math.sin(t * 1.5);
        const reach = 3 + breathe * 3;
        ctx.fillStyle = rgb([235, 244, 255], (0.18 + 0.32 * breathe) * p.breathFogAmt);
        ctx.beginPath();
        ctx.ellipse(hx - reach, hy + 4.6, 2.4 + breathe * 1.6, 1.6 + breathe * 1.0, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // one drifting snowflake on a seamless 3.4s fall
        const prog = ((t / 3.4) % 1 + 1) % 1;
        const fy = -20 + prog * 36;
        const fxx = 6 + Math.sin(prog * Math.PI * 2) * 4;
        ctx.fillStyle = rgb([255, 255, 255], 0.85);
        ctx.beginPath();
        ctx.arc(fxx, fy, 1.1, 0, Math.PI * 2);
        ctx.fill();

        // cold sheen pulse on the coat
        const sheen = 0.5 + 0.5 * Math.sin(t * 0.8);
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([206, 224, 255], 0.12 + sheen * 0.14);
        ctx.beginPath();
        ctx.ellipse(bx, by, 12.5, 8, 0, 0, Math.PI * 2);
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
