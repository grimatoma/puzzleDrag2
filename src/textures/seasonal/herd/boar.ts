// Seasonal art for the HERD BOAR board tile (`tile_herd_boar`).
//
// A SINGLE parameterized paint renders the whole tile (grass pad + the one
// wild boar + seasonal dressing) from a tweenable parameter set `P`. The four
// seasons are just four `P` presets; the three forward transitions lerp EVERY
// field of `P` through a quintic smoothstep, so transition(0) === the
// from-season still and transition(1) === the to-season still — no snap.
//
// PALETTE LOCK: the boar is ALWAYS the same dark, bristly wild boar — a
// muscular dark grey-brown body with a stiff ridge of bristles down the spine,
// a long snout, two prominent curved WHITE tusks, small dark eyes, sturdy legs.
// The silhouette is FIERCE and CONSTANT every season. Seasons change only its
// coat tone + bristle ridge fullness (a `coatVolume` param), the pad colour,
// the light wash, and dressing (blossom, fallen leaves, frost, back-snow,
// breath-fog). The animal's identity colours (dark coat, white tusks) never
// change — the tusks stay bright all year.
//
// Origin-centered in the −24..+24 design box, light from upper-left. Animals
// stand front-¾ turned ~15–20° toward lower-left. Animations are deterministic
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
function bobAt(t: number, amp = 1.0, w = 1.4): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────

interface P {
  coatLight: RGB; // lit top of the dark coat
  coatMid: RGB; // body mid tone
  coatShadow: RGB; // shaded underside / haunch
  bristle: RGB; // the spine ridge of stiff bristles
  snout: RGB; // snout / muzzle tone (warmer dark)
  tusk: RGB; // the white tusks (palette-locked bright)
  hoof: RGB; // dark hooves
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  coatVolume: number; // 0..1 fullness of coat + bristle ridge
  frostAmt: number; // 0..1 frost sparkle on the bristles
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad
  breathFogAmt: number; // 0..1 breath puff at the snout
}

// Four season presets. The boar stays the SAME dark bristly white-tusked boar;
// only coat tone, bristle/coat volume, pad, light, and dressing differ.
const SP: Record<SeasonName, P> = {
  // Spring — dark bristly coat (lightly cooler), dewy lime pad + blossom.
  Spring: {
    coatLight: [102, 86, 72],
    coatMid: [74, 60, 50],
    coatShadow: [48, 38, 32],
    bristle: [40, 32, 28],
    snout: [70, 54, 48],
    tusk: [248, 246, 234],
    hoof: [30, 24, 22],
    padGrass: [126, 200, 86], // bright lime dewy grass
    soil: [86, 132, 54],
    outline: [30, 24, 20],
    lightWash: [214, 240, 255], // cool-bright
    lightWashAmt: 0.16,
    coatVolume: 0.42, // sleeker spring coat
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.62,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Summer — full dark coat (PEAK richness), saturated mid-green pad, warm light.
  Summer: {
    coatLight: [110, 92, 76],
    coatMid: [78, 62, 50],
    coatShadow: [46, 36, 28],
    bristle: [38, 30, 24],
    snout: [74, 56, 48],
    tusk: [250, 248, 236],
    hoof: [28, 22, 20],
    padGrass: [86, 168, 64], // saturated mid-green
    soil: [58, 110, 40],
    outline: [28, 22, 18],
    lightWash: [255, 244, 206], // warm
    lightWashAmt: 0.16,
    coatVolume: 0.6, // full coat
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Autumn — coat warms slightly, fuller bristle ridge; olive-tan pad + leaves.
  Autumn: {
    coatLight: [114, 88, 66],
    coatMid: [82, 60, 44],
    coatShadow: [50, 36, 26],
    bristle: [44, 32, 24],
    snout: [80, 56, 44],
    tusk: [246, 242, 226],
    hoof: [30, 22, 18],
    padGrass: [156, 142, 78], // olive-tan browning grass
    soil: [104, 84, 44],
    outline: [32, 24, 18],
    lightWash: [255, 206, 138], // low amber
    lightWashAmt: 0.2,
    coatVolume: 0.82, // fuller bristle ridge
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.7,
    breathFogAmt: 0,
  },
  // Winter — cool blue-grey light; frost on bristles + snow on the back; snowy
  // pad; breath-fog at the snout. Tusks stay bright.
  Winter: {
    coatLight: [98, 88, 84],
    coatMid: [70, 60, 58],
    coatShadow: [46, 40, 40],
    bristle: [42, 38, 40],
    snout: [70, 58, 56],
    tusk: [252, 252, 244],
    hoof: [34, 28, 30],
    padGrass: [222, 232, 244], // snow on the pad
    soil: [150, 168, 190],
    outline: [40, 36, 40],
    lightWash: [206, 222, 248], // cool blue-grey
    lightWashAmt: 0.26,
    coatVolume: 1, // thickest winter coat + bristle ridge
    frostAmt: 0.72,
    backSnowAmt: 0.7,
    padSnowAmt: 0.85,
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
    bristle: lerpRGB(a.bristle, b.bristle, t),
    snout: lerpRGB(a.snout, b.snout, t),
    tusk: lerpRGB(a.tusk, b.tusk, t),
    hoof: lerpRGB(a.hoof, b.hoof, t),
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

// the low flat grass pad the boar stands on
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

// one leg: a short dark sturdy cylinder with a hoof at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number, width = 3.4): void {
  ctx.strokeStyle = rgb(p.coatShadow);
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // hoof
  ctx.fillStyle = rgb(p.hoof);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 1.9, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// the boar's chunky body silhouette — a constant fierce hump-backed mass.
// `vol` modestly fattens the haunch/shoulders; the SHAPE stays the same.
function bodyPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, vol: number): void {
  const w = 14 + vol * 1.2; // half-length
  const h = 8.5 + vol * 1.0; // half-height of the trunk
  // a hump-shouldered ovoid: heavier at the front shoulders (toward lower-left)
  ctx.beginPath();
  // rear (upper-right) haunch
  ctx.moveTo(cx + w, cy + 1);
  ctx.quadraticCurveTo(cx + w + 1.5, cy - h * 0.7, cx + w * 0.45, cy - h);
  // the high shoulder hump over the front
  ctx.quadraticCurveTo(cx - w * 0.15, cy - h * 1.25, cx - w * 0.7, cy - h * 0.85);
  // down to the neck/chest (front, lower-left)
  ctx.quadraticCurveTo(cx - w * 1.05, cy - h * 0.5, cx - w * 0.98, cy + h * 0.35);
  // underbelly back toward the rear
  ctx.quadraticCurveTo(cx - w * 0.5, cy + h * 0.95, cx + w * 0.2, cy + h * 0.9);
  ctx.quadraticCurveTo(cx + w * 0.8, cy + h * 0.8, cx + w, cy + 1);
  ctx.closePath();
}

// the stiff ridge of bristles running along the back/spine (identity feature)
function paintBristleRidge(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number, vol: number, twitch: number): void {
  const h = 8.5 + vol * 1.0;
  // ridge runs from the rear haunch up over the shoulder hump (right→left)
  const n = 11;
  ctx.strokeStyle = rgb(p.bristle);
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1); // 0 (rear) .. 1 (front hump)
    // x walks from rear haunch (right) toward the front hump (left)
    const bx = cx + lerp(13, -10, f);
    // y follows the back: dips at rear, peaks at the shoulder hump
    const back = -h - 1.4 - Math.sin(f * Math.PI) * 2.6;
    const by = cy + back;
    // each bristle stands up + slightly back; length grows with coatVolume
    const len = 3 + vol * 2.2 + Math.sin(f * Math.PI) * 1.4;
    const sway = twitch * Math.sin(i * 1.7) * 0.9;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - 1.2 + sway, by - len);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

// the whole boar, standing front-¾ turned ~15–20° toward lower-left.
// `bob` lifts the body for breathing; `twitch` ruffles the ridge; `toss`
// nods the head (all 0 at rest).
function paintBoar(ctx: CanvasRenderingContext2D, p: P, bob: number, twitch: number, toss: number): void {
  const cx = 1;
  const cy = 3 - bob; // body centre; lifts with the breathing bob
  const vol = p.coatVolume;

  // ── Legs (behind the body). Sturdy; two back (right), two front (left). ────
  ctx.save();
  ctx.globalAlpha = 0.9;
  paintLeg(ctx, p, cx + 8, cy + 6, 18.6, 3.6); // far back
  paintLeg(ctx, p, cx - 3, cy + 6, 19.0, 3.6); // far front
  ctx.restore();
  paintLeg(ctx, p, cx + 10.5, cy + 6, 18.9, 3.8); // near back
  paintLeg(ctx, p, cx - 6, cy + 6, 19.3, 3.8); // near front

  // ── BODY — dark outline pass, then mid, then a lit top (layered like wheat) ─
  // outline halo
  ctx.fillStyle = rgb(p.outline);
  bodyPath(ctx, cx, cy, vol + 0.35);
  ctx.fill();
  // mid coat
  ctx.fillStyle = rgb(p.coatMid);
  bodyPath(ctx, cx, cy, vol);
  ctx.fill();

  // shaded underbelly + haunch (clip to the body)
  ctx.save();
  bodyPath(ctx, cx, cy, vol);
  ctx.clip();
  ctx.fillStyle = rgb(p.coatShadow);
  ctx.beginPath();
  ctx.ellipse(cx + 2, cy + 6, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit top (light from upper-left) — over the shoulder hump
  ctx.fillStyle = rgb(p.coatLight);
  ctx.beginPath();
  ctx.ellipse(cx - 3, cy - 5, 10, 4.4, -0.25, 0, Math.PI * 2);
  ctx.fill();
  // a soft body highlight glint on the lit shoulder
  ctx.fillStyle = rgb([255, 255, 255], 0.08);
  ctx.beginPath();
  ctx.ellipse(cx - 4, cy - 6, 4.5, 2.0, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // frost sparkle worked into the coat (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([255, 255, 255], 0.75 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-8, -4], [-2, -6], [4, -3], [9, -1], [0, -2], [-5, 0], [7, 2],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(cx + fx, cy + fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // ── Bristle ridge along the spine (identity) ───────────────────────────────
  paintBristleRidge(ctx, p, cx, cy, vol, twitch);
  // frost dusting on the bristle tips (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([235, 246, 255], 0.7 * p.frostAmt);
    const h = 8.5 + vol * 1.0;
    for (let i = 0; i < 6; i++) {
      const f = i / 5;
      const bx = cx + lerp(11, -8, f);
      const len = 3 + vol * 2.2 + Math.sin(f * Math.PI) * 1.4;
      const by = cy - h - 1.4 - Math.sin(f * Math.PI) * 2.6 - len;
      ctx.beginPath();
      ctx.arc(bx - 1.2, by, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // snow settled on the back (winter) — a soft white cap over the shoulder hump
  if (p.backSnowAmt > 0.001) {
    const h = 8.5 + vol * 1.0;
    ctx.fillStyle = rgb([248, 252, 255], 0.9 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(cx - 3, cy - h - 0.5, 8.5, 3.0, -0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb([255, 255, 255], 0.85 * p.backSnowAmt);
    for (const [dx, dy] of [[-6, -1.2], [-1, -1.6], [4, -0.8]] as const) {
      ctx.beginPath();
      ctx.arc(cx + dx, cy - h - 0.5 + dy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // small curly tail at the rear (upper-right)
  ctx.strokeStyle = rgb(p.coatShadow);
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx + 13.5, cy - 1);
  ctx.quadraticCurveTo(cx + 16.5, cy - 2, cx + 16, cy - 4);
  ctx.quadraticCurveTo(cx + 15.4, cy - 5.4, cx + 16.6, cy - 5.6);
  ctx.stroke();
  ctx.lineCap = "butt";

  // ── HEAD + long snout (front-¾, lower-left) — locks the fierce identity ─────
  // head pivots a touch with the head-toss (about a point at the neck)
  ctx.save();
  ctx.translate(cx - 9, cy + 1);
  ctx.rotate(-toss * 0.14); // nods up on toss
  const hx = 0;
  const hy = 0;

  // ear (dark), set back on the head
  ctx.fillStyle = rgb(p.coatShadow);
  ctx.save();
  ctx.translate(hx + 1.5, hy - 5.5);
  ctx.rotate(-0.5);
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.6, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // head mass — outline then fill
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(hx - 1, hy - 0.5, 7.2, 6.4, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.coatMid);
  ctx.beginPath();
  ctx.ellipse(hx - 1, hy - 0.5, 6.4, 5.7, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // cheek shading (lower-right of head)
  ctx.fillStyle = rgb(p.coatShadow);
  ctx.beginPath();
  ctx.ellipse(hx + 1.5, hy + 2, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // long snout reaching toward lower-left
  ctx.save();
  ctx.translate(hx - 4.5, hy + 2.5);
  ctx.rotate(0.32);
  // snout outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(-3.4, 0, 6.2, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // snout fill
  ctx.fillStyle = rgb(p.snout);
  ctx.beginPath();
  ctx.ellipse(-3.4, 0, 5.4, 2.9, 0, 0, Math.PI * 2);
  ctx.fill();
  // flat nose disc at the tip
  ctx.fillStyle = rgb(p.coatShadow);
  ctx.beginPath();
  ctx.ellipse(-8.2, 0, 2.0, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // nostrils
  ctx.fillStyle = rgb([16, 12, 14]);
  for (const ny of [-0.9, 0.9]) {
    ctx.beginPath();
    ctx.ellipse(-8.4, ny, 0.5, 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore(); // end snout

  // ── TUSKS — two prominent curved WHITE tusks (palette-locked bright) ────────
  // they sweep up-and-out from the lower jaw near the snout base
  for (const side of [1, 0.6] as const) {
    // outline
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 2.6 * side;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(hx - 6.5, hy + 4 + (1 - side) * 1.5);
    ctx.quadraticCurveTo(hx - 9.5, hy + 2.5, hx - 9.8 - side, hy - 1.5 - side);
    ctx.stroke();
    // bright tusk
    ctx.strokeStyle = rgb(p.tusk);
    ctx.lineWidth = 1.7 * side;
    ctx.beginPath();
    ctx.moveTo(hx - 6.5, hy + 4 + (1 - side) * 1.5);
    ctx.quadraticCurveTo(hx - 9.5, hy + 2.5, hx - 9.8 - side, hy - 1.5 - side);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // small dark eye
  ctx.fillStyle = rgb([245, 244, 238]);
  ctx.beginPath();
  ctx.arc(hx + 0.4, hy - 1.4, 1.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb([18, 14, 16]);
  ctx.beginPath();
  ctx.arc(hx + 0.6, hy - 1.3, 0.7, 0, Math.PI * 2);
  ctx.fill();
  // tiny eye glint
  ctx.fillStyle = rgb([255, 255, 255], 0.8);
  ctx.beginPath();
  ctx.arc(hx + 0.2, hy - 1.7, 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // end head group

  // breath-fog puff at the snout (winter) — at rest a faint static puff
  if (p.breathFogAmt > 0.001) {
    ctx.fillStyle = rgb([235, 244, 255], 0.4 * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(cx - 20, cy + 3.5, 3.2, 2.2, 0.1, 0, Math.PI * 2);
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

function paint(ctx: CanvasRenderingContext2D, pIn: P, bob: number, twitch = 0, toss = 0): void {
  const p = clampP(pIn);
  ctx.save();
  try {
    paintPad(ctx, p);
    paintBoar(ctx, p, bob, twitch, toss);
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

    // Once-per-loop bristle twitch + head-toss, gated to a brief seamless bump.
    const loop = (t % 5.5) / 5.5; // 0..1
    const gate = Math.max(0, Math.sin(loop * Math.PI * 2)) ** 5; // sharp brief bump
    const twitch = Math.sin(t * 11) * gate; // ridge ruffle
    const toss = gate; // head-toss nod (0 at edges → seamless)

    paint(ctx, SP[season], bob, twitch, toss);

    // ── Additive season micro-motion, drawn over the painted tile ─────────────
    ctx.save();
    try {
      const cx = 1;
      const cy = 3 - bob;
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
        // soft coat sheen sweeping across the back
        const s = 0.5 + 0.5 * Math.sin(t * 1.1);
        const sx = cx - 11 + s * 22;
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([255, 255, 255], 0.32);
        ctx.beginPath();
        ctx.ellipse(sx, cy - 4, 3, 6, 0.3, 0, Math.PI * 2);
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
        // Winter: breath-fog puff pulses outward from the snout +
        // a drifting snowflake + a cold sheen.
        const breathe = 0.5 + 0.5 * Math.sin(t * 1.5);
        const reach = 2 + breathe * 3;
        ctx.fillStyle = rgb([235, 244, 255], (0.18 + 0.32 * breathe) * p.breathFogAmt);
        ctx.beginPath();
        ctx.ellipse(cx - 20 - reach, cy + 3.5, 2.6 + breathe * 1.8, 1.8 + breathe * 1.2, 0.1, 0, Math.PI * 2);
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
        ctx.fillStyle = rgb([206, 224, 255], 0.1 + sheen * 0.12);
        ctx.beginPath();
        ctx.ellipse(cx, cy - 1, 14, 9, 0, 0, Math.PI * 2);
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
