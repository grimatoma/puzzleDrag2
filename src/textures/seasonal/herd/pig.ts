// Seasonal art for the HERD PIG board tile (`tile_herd_pig`).
// Module path: src/textures/seasonal/herd/pig.ts (verify token: herd/pig)
//
// A SINGLE parameterized paint renders the whole tile (grass pad + the one
// round plump pig + seasonal dressing) from a tweenable parameter set `P`. The
// four seasons are just four `P` presets; the three forward transitions lerp
// EVERY field of `P` through a quintic smoothstep, so transition(0) === the
// from-season still and transition(1) === the to-season still — no snap.
//
// PALETTE LOCK: the pig is ALWAYS the same round pink pig — a fat rounded body,
// a flat round snout with two nostrils, small floppy triangular ears, short
// legs, and a little curly tail. Seasons change only its COAT/BRISTLE volume
// (smooth in spring → thicker pale bristles in winter), the pad colour, the
// light wash, and dressing (blossom, fallen leaves, frost, back-snow,
// breath-fog). The animal stays pink — its identity colour never changes.
//
// Identity is the CONSTANT silhouette: front-¾ body turned ~15–20° toward
// lower-left, the head + flat round snout reading to the lower-left, four short
// legs on the pad, a curly tail off the upper-right rear.
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
  skinLight: RGB; // lit top of the pink hide
  skinMid: RGB; // body tone
  skinShadow: RGB; // shaded underside of the hide
  snout: RGB; // flat round snout face
  hoof: RGB; // dark hoof / trotter tips
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  coatVolume: number; // 0..1 bristle/coat thickness (smooth → fuzzy)
  bristleAmt: number; // 0..1 pale bristle strokes over the hide
  glossAmt: number; // 0..1 healthy skin sheen on the back
  frostAmt: number; // 0..1 frost sparkle on the hide
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad
  breathFogAmt: number; // 0..1 breath puff at the snout
}

// Four season presets. The pig stays the SAME round pink pig; only coat/bristle
// volume + pad + light + dressing differ. PALETTE LOCK on the pink hide.
const SP: Record<SeasonName, P> = {
  // Spring — smooth pink, dewy lime pad + blossom, cool-bright light.
  Spring: {
    skinLight: [252, 200, 200],
    skinMid: [238, 162, 168],
    skinShadow: [196, 116, 128],
    snout: [232, 150, 158],
    hoof: [70, 50, 52],
    padGrass: [128, 206, 86], // bright lime dewy grass
    soil: [86, 134, 54],
    outline: [120, 70, 78],
    lightWash: [216, 240, 255], // cool-bright
    lightWashAmt: 0.16,
    coatVolume: 0.1, // smooth-coated
    bristleAmt: 0.05,
    glossAmt: 0.25,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.65,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Summer — healthy PEAK pink, saturated mid-green pad, warm light, soft sheen.
  Summer: {
    skinLight: [255, 196, 196],
    skinMid: [244, 156, 162],
    skinShadow: [196, 106, 120],
    snout: [240, 146, 154],
    hoof: [64, 44, 46],
    padGrass: [86, 170, 64], // saturated mid-green
    soil: [58, 112, 40],
    outline: [116, 62, 70],
    lightWash: [255, 244, 206], // warm
    lightWashAmt: 0.14,
    coatVolume: 0.16, // sleek healthy coat
    bristleAmt: 0.08,
    glossAmt: 0.55, // peak skin sheen
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Autumn — pink with slightly fuller bristles, olive-tan pad, fallen leaves.
  Autumn: {
    skinLight: [246, 192, 188],
    skinMid: [232, 150, 152],
    skinShadow: [190, 104, 112],
    snout: [228, 142, 146],
    hoof: [66, 46, 44],
    padGrass: [156, 142, 78], // olive-tan
    soil: [104, 84, 44],
    outline: [112, 62, 64],
    lightWash: [255, 206, 138], // low amber
    lightWashAmt: 0.2,
    coatVolume: 0.5, // slightly fuller bristles
    bristleAmt: 0.4,
    glossAmt: 0.3,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.7,
    breathFogAmt: 0,
  },
  // Winter — pink under thicker pale bristles + back snow; snowy pad, cool light,
  // breath-fog at the snout. The pink hide stays clearly visible underneath.
  Winter: {
    skinLight: [244, 196, 198],
    skinMid: [224, 156, 162],
    skinShadow: [180, 116, 132],
    snout: [220, 148, 156],
    hoof: [70, 58, 64],
    padGrass: [222, 232, 244], // snow on the pad
    soil: [150, 168, 190],
    outline: [104, 72, 84],
    lightWash: [206, 222, 248], // cool blue-grey
    lightWashAmt: 0.24,
    coatVolume: 1, // thick pale bristles
    bristleAmt: 0.95,
    glossAmt: 0.18,
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
    skinLight: lerpRGB(a.skinLight, b.skinLight, t),
    skinMid: lerpRGB(a.skinMid, b.skinMid, t),
    skinShadow: lerpRGB(a.skinShadow, b.skinShadow, t),
    snout: lerpRGB(a.snout, b.snout, t),
    hoof: lerpRGB(a.hoof, b.hoof, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    coatVolume: lerp(a.coatVolume, b.coatVolume, t),
    bristleAmt: lerp(a.bristleAmt, b.bristleAmt, t),
    glossAmt: lerp(a.glossAmt, b.glossAmt, t),
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
    bristleAmt: clamp01(p.bristleAmt),
    glossAmt: clamp01(p.glossAmt),
    frostAmt: clamp01(p.frostAmt),
    backSnowAmt: clamp01(p.backSnowAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    breathFogAmt: clamp01(p.breathFogAmt),
  };
}

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
  // pink leg
  ctx.strokeStyle = rgb(p.skinShadow);
  ctx.lineWidth = 4.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // trotter / hoof
  ctx.fillStyle = rgb(p.hoof);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 2.0, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// the round plump body — a fat rounded ellipse; CONSTANT silhouette. coatVolume
// only modestly fuzzes the outline (bristles), never reshapes the pig.
function paintBody(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number, fill: string, scale: number): void {
  const rx = 13.4 * scale;
  const ry = 10.4 * scale;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

// the whole pig, standing front-¾ turned ~15–20° toward lower-left
function paintPig(ctx: CanvasRenderingContext2D, p: P, bob: number): void {
  // body centre lifts with the breathing bob
  const bx = 0;
  const by = 5 - bob;

  // ── legs first (behind the body) — four short stubby trotters on the pad ───
  // back legs slightly higher contact + dimmer for depth
  ctx.save();
  ctx.globalAlpha = 0.85;
  paintLeg(ctx, p, bx + 7, by + 6, 18.6);
  paintLeg(ctx, p, bx - 6, by + 6, 18.9);
  ctx.restore();
  // front legs
  paintLeg(ctx, p, bx + 4, by + 7, 19.2);
  paintLeg(ctx, p, bx - 8.5, by + 7, 19.4);

  // ── curly tail off the upper-right rear (behind the body mass) ─────────────
  // a little corkscrew curl. Drawn before the body so the body overlaps its base.
  drawCurlyTail(ctx, p, bx + 12.6, by - 2, 0);

  // ── BODY — dark outline pass first, then mid, then light top (layered) ─────
  paintBody(ctx, p, bx, by, rgb(p.outline), 1.06); // soft outline halo
  paintBody(ctx, p, bx, by, rgb(p.skinMid), 1.0); // body mid tone
  // shaded underside crescent
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(bx, by, 13.4, 10.4, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = rgb(p.skinShadow, 0.7);
  ctx.beginPath();
  ctx.ellipse(bx + 2, by + 5.5, 13, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit top offset up-left (light from upper-left)
  ctx.fillStyle = rgb(p.skinLight);
  ctx.beginPath();
  ctx.ellipse(bx - 2.4, by - 3.4, 9.6, 6.4, -0.12, 0, Math.PI * 2);
  ctx.fill();

  // healthy skin sheen highlight on the back
  if (p.glossAmt > 0.001) {
    ctx.fillStyle = rgb([255, 255, 255], 0.32 * p.glossAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 4, by - 5.2, 4.4, 2.0, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── bristles over the hide (autumn fuller, winter thickest) ────────────────
  if (p.bristleAmt > 0.02) {
    // pale stiff bristle strokes along the upper back, denser with bristleAmt
    const n = Math.round(6 + p.bristleAmt * 10);
    ctx.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const u = i / Math.max(1, n - 1);
      const sx = bx - 9 + u * 19;
      const top = by - 9.4 - Math.sin(u * Math.PI) * 1.4;
      const len = 1.8 + p.coatVolume * 2.2;
      // pale bristles in winter, warmer/darker tipped in autumn
      const pale = rgb([238, 226, 224], 0.55 * p.bristleAmt);
      ctx.strokeStyle = pale;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(sx, top + 1.6);
      ctx.lineTo(sx - 0.6, top - len);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  }

  // snow settled on the back (winter) — a soft white cap on top of the hide
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgb([248, 252, 255], 0.92 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 1, by - 8.4, 9.4, 3.2, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb([255, 255, 255], 0.85 * p.backSnowAmt);
    for (const [dx, dy] of [[-5, -9], [1, -9.6], [5, -8.6]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the hide (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([255, 255, 255], 0.8 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-7, 0], [-2, 4], [4, -1], [8, 2], [0, -2], [-4, -4], [6, 5],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── HEAD + flat round SNOUT (front-¾, lower-left) — locks identity ─────────
  const hx = bx - 11.5;
  const hy = by + 3.2;

  // floppy triangular ears (pink), behind/above the head
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(hx + side * 3.2 - 1, hy - 7.4);
    ctx.rotate(side * 0.5 - 0.25);
    // ear outline
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.moveTo(0, -0.4);
    ctx.lineTo(3.4, 1.2);
    ctx.lineTo(1.0, 5.4);
    ctx.closePath();
    ctx.fill();
    // ear fill (floppy triangle)
    ctx.fillStyle = rgb(p.skinMid);
    ctx.beginPath();
    ctx.moveTo(0.2, 0.2);
    ctx.lineTo(2.8, 1.4);
    ctx.lineTo(1.1, 4.6);
    ctx.closePath();
    ctx.fill();
    // inner ear shadow
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
  // head fill
  ctx.fillStyle = rgb(p.skinMid);
  ctx.beginPath();
  ctx.ellipse(0, 0, 6.6, 5.9, 0, 0, Math.PI * 2);
  ctx.fill();
  // cheek light (upper-left)
  ctx.fillStyle = rgb(p.skinLight, 0.9);
  ctx.beginPath();
  ctx.ellipse(-1.8, -1.8, 3.2, 2.6, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // eyes — small, friendly
  ctx.fillStyle = rgb([245, 245, 240]);
  for (const ex of [-1.6, 1.8]) {
    ctx.beginPath();
    ctx.arc(ex, -1.6, 1.0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = rgb([22, 18, 20]);
  for (const ex of [-1.5, 1.9]) {
    ctx.beginPath();
    ctx.arc(ex, -1.4, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // flat round SNOUT — a disc on the lower-front of the face with two nostrils
  // outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(-0.6, 3.4, 4.6, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // snout face
  ctx.fillStyle = rgb(p.snout);
  ctx.beginPath();
  ctx.ellipse(-0.6, 3.4, 3.9, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  // snout top light rim
  ctx.fillStyle = rgb(p.skinLight, 0.55);
  ctx.beginPath();
  ctx.ellipse(-1.4, 2.2, 2.2, 1.0, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // two nostrils
  ctx.fillStyle = rgb([90, 48, 56]);
  for (const ex of [-2.0, 0.8]) {
    ctx.beginPath();
    ctx.ellipse(ex, 3.6, 0.7, 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // breath-fog puff at the snout (winter) — at rest a faint static puff
  if (p.breathFogAmt > 0.001) {
    ctx.fillStyle = rgb([235, 244, 255], 0.4 * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(hx - 5.6, hy + 3.8, 3.2, 2.2, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// a little corkscrew curly tail. `wiggle` shifts the curl tip for the idle.
function drawCurlyTail(ctx: CanvasRenderingContext2D, p: P, ox: number, oy: number, wiggle: number): void {
  ctx.save();
  ctx.translate(ox, oy);
  // outline pass (fatter, dark)
  ctx.strokeStyle = rgb(p.outline);
  ctx.lineWidth = 3.0;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(3.4, -1.4 + wiggle, 2.6, 1.6 + wiggle);
  ctx.quadraticCurveTo(1.9, 4.0 + wiggle, 4.0, 3.4 + wiggle * 0.6);
  ctx.stroke();
  // pink curl on top
  ctx.strokeStyle = rgb(p.skinMid);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(3.4, -1.4 + wiggle, 2.6, 1.6 + wiggle);
  ctx.quadraticCurveTo(1.9, 4.0 + wiggle, 4.0, 3.4 + wiggle * 0.6);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.restore();
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
    paintPig(ctx, p, bob);
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

    // The once-per-loop ear flick + curly-tail wiggle + snout dip are SUBJECT
    // motions, so they must be baked into the painted pig (drawn at rest at
    // t=0). We compute the gated flick and re-render the moving parts over the
    // base paint — but every motion is 0 at t=0, so anim(…,0) === draw.
    paint(ctx, SP[season], bob);

    ctx.save();
    try {
      const bx = 0;
      const by = 5 - bob;
      const hx = bx - 11.5;
      const hy = by + 3.2;

      // a brief flick once per ~5s loop, seamless (0 at the period edges)
      const loop = (t % 5) / 5; // 0..1
      const flickGate = Math.max(0, Math.sin(loop * Math.PI * 2)) ** 6; // sharp brief bump
      const flick = Math.sin(t * 9) * flickGate;
      // small snout dip once per loop (head nods down a touch)
      const snoutDip = flickGate * 1.4;

      // ear flick — redraw the right ear flicking over the existing one
      ctx.save();
      ctx.translate(hx + 3.2 - 1, hy - 7.4);
      ctx.rotate(0.5 - 0.25 + flick * 0.45);
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
      ctx.restore();

      // curly-tail wiggle — redraw the tail with a wiggle once per loop
      drawCurlyTail(ctx, p, bx + 12.6, by - 2, flick * 1.1);

      // snout dip — a small pink disc nudged down over the snout when dipping
      if (snoutDip > 0.01) {
        ctx.save();
        ctx.translate(hx, hy + snoutDip);
        ctx.rotate(0.16);
        ctx.fillStyle = rgb(p.snout);
        ctx.beginPath();
        ctx.ellipse(-0.6, 3.4, 3.9, 2.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgb([90, 48, 56]);
        for (const ex of [-2.0, 0.8]) {
          ctx.beginPath();
          ctx.ellipse(ex, 3.6, 0.7, 1.1, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

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
        // soft skin sheen sweeping across the back
        const s = 0.5 + 0.5 * Math.sin(t * 1.1);
        const sx = bx - 8 + s * 16;
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([255, 255, 255], 0.35);
        ctx.beginPath();
        ctx.ellipse(sx, by - 4, 3, 5, 0.3, 0, Math.PI * 2);
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
        // Winter: breath-fog puff pulses outward from the snout + a drifting
        // snowflake + a cold sheen.
        const breathe = 0.5 + 0.5 * Math.sin(t * 1.5);
        const reach = 4 + breathe * 3;
        ctx.fillStyle = rgb([235, 244, 255], (0.18 + 0.32 * breathe) * p.breathFogAmt);
        ctx.beginPath();
        ctx.ellipse(hx - 4.4 - reach, hy + 3.8, 2.6 + breathe * 1.8, 1.8 + breathe * 1.2, 0.2, 0, Math.PI * 2);
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
        ctx.ellipse(bx, by, 13.4, 10.4, 0, 0, Math.PI * 2);
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
