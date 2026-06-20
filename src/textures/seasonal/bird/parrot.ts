// Seasonal art for the BIRD PARROT board tile (`tile_bird_parrot`).
//
// A SINGLE parameterized paint renders the whole tile (low turf pad + a short
// wooden perch laid across it + the one vivid tropical parrot + seasonal
// dressing) from a tweenable parameter set `P`. The four seasons are just four
// `P` presets; the three forward transitions lerp EVERY field of `P` through a
// quintic smoothstep, so transition(0) === the from-season still and
// transition(1) === the to-season still — no snap.
//
// PALETTE LOCK: the parrot is ALWAYS the same macaw-like tricolour bird — a RED
// head/breast, GREEN wings, BLUE tail, and a pale curved hooked beak. It always
// sits on a short low wooden perch/branch that crosses the pad. Seasons change
// only the pad colour, the light wash, a little winter feather FLUFF (`fluff`),
// plus winter dressing (snow on the back + perch, frost sparkle, a breath-fog
// puff) and the pad's blossom / fallen-leaf seasonal litter. The bird's identity
// red-green-blue NEVER changes — saturation merely peaks in summer.
//
// Origin-centered in the −24..+24 design box. Light from upper-left, one soft
// contact shadow lower-right. Animations are deterministic (sin/cos/modulo of
// `t` seconds), seamless, and subtle. The breathing bob has zero value AND
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

// breathing bob: A*(1-cos(w t))*0.5 — value AND velocity are 0 at t=0,
// seamless over a 2π/w period, peak amplitude A.
function bobAt(t: number, amp = 0.95, w = 1.5): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint is a pure function of these so transitions interpolate cleanly. */
interface P {
  // Parrot identity colours (PALETTE LOCK — only saturation/value shift slightly)
  headLight: RGB; // lit red of the head/breast
  headDark: RGB; // shaded red
  wingLight: RGB; // lit green of the wing
  wingDark: RGB; // shaded green
  tailLight: RGB; // lit blue of the tail
  tailDark: RGB; // shaded blue
  beak: RGB; // pale curved hooked beak
  // World
  perchLight: RGB; // lit top of the wooden perch
  perchDark: RGB; // shaded underside of the perch
  padGrass: RGB; // top of the turf pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  saturation: number; // 0..1 plumage richness cue (peaks in summer)
  fluff: number; // 0..1 winter feather puff (whimsically fluffed)
  frostAmt: number; // 0..1 frost sparkle on the plumage
  backSnowAmt: number; // 0..1 snow on the back + the perch
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad
  breathFogAmt: number; // 0..1 breath-fog puff at the beak
}

// Four season presets. The parrot stays the SAME red-green-blue macaw; only
// pad + light + winter fluff/dressing differ. Summer is the saturation PEAK.
const SP: Record<SeasonName, P> = {
  // Spring — bright plumage, dewy lime pad + blossom, cool-bright light.
  Spring: {
    headLight: [236, 70, 60],
    headDark: [168, 32, 36],
    wingLight: [78, 188, 88],
    wingDark: [34, 122, 58],
    tailLight: [74, 132, 230],
    tailDark: [36, 76, 168],
    beak: [236, 226, 200],
    perchLight: [156, 116, 72],
    perchDark: [104, 72, 42],
    padGrass: [128, 206, 86], // bright lime dewy grass
    soil: [86, 132, 54],
    outline: [44, 36, 40],
    lightWash: [214, 238, 255], // cool-bright
    lightWashAmt: 0.16,
    saturation: 0.8,
    fluff: 0.12,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.7,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Summer — richest, most-saturated tricolour (PEAK); saturated mid-green pad.
  Summer: {
    headLight: [248, 58, 48],
    headDark: [182, 22, 28],
    wingLight: [70, 206, 84],
    wingDark: [26, 134, 56],
    tailLight: [58, 122, 244],
    tailDark: [28, 70, 188],
    beak: [244, 234, 206],
    perchLight: [150, 110, 66],
    perchDark: [98, 66, 38],
    padGrass: [86, 168, 64], // saturated mid-green
    soil: [58, 110, 40],
    outline: [40, 32, 36],
    lightWash: [255, 244, 206], // warm
    lightWashAmt: 0.16,
    saturation: 1, // PEAK
    fluff: 0.16,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Autumn — vivid plumage held; olive-tan pad, a couple of fallen leaves.
  Autumn: {
    headLight: [228, 64, 50],
    headDark: [166, 30, 32],
    wingLight: [82, 178, 80],
    wingDark: [38, 118, 54],
    tailLight: [70, 124, 222],
    tailDark: [34, 74, 162],
    beak: [234, 220, 188],
    perchLight: [148, 104, 60],
    perchDark: [98, 64, 36],
    padGrass: [156, 142, 78], // olive-tan browning grass
    soil: [104, 84, 44],
    outline: [46, 36, 36],
    lightWash: [255, 206, 138], // low amber
    lightWashAmt: 0.2,
    saturation: 0.85,
    fluff: 0.22,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.7,
    breathFogAmt: 0,
  },
  // Winter — fluffed feathers, snow on back/perch, breath-fog, snowy pad, cool light.
  Winter: {
    headLight: [220, 78, 70],
    headDark: [150, 40, 46],
    wingLight: [86, 168, 92],
    wingDark: [40, 108, 60],
    tailLight: [82, 128, 210],
    tailDark: [44, 78, 152],
    beak: [228, 224, 214],
    perchLight: [150, 130, 116],
    perchDark: [104, 86, 74],
    padGrass: [222, 232, 244], // snow on the pad (muted grey-green showing)
    soil: [150, 168, 190],
    outline: [54, 48, 58],
    lightWash: [206, 222, 248], // cool blue-grey
    lightWashAmt: 0.26,
    saturation: 0.72,
    fluff: 1, // whimsically puffed against the cold
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
    headLight: lerpRGB(a.headLight, b.headLight, t),
    headDark: lerpRGB(a.headDark, b.headDark, t),
    wingLight: lerpRGB(a.wingLight, b.wingLight, t),
    wingDark: lerpRGB(a.wingDark, b.wingDark, t),
    tailLight: lerpRGB(a.tailLight, b.tailLight, t),
    tailDark: lerpRGB(a.tailDark, b.tailDark, t),
    beak: lerpRGB(a.beak, b.beak, t),
    perchLight: lerpRGB(a.perchLight, b.perchLight, t),
    perchDark: lerpRGB(a.perchDark, b.perchDark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    saturation: lerp(a.saturation, b.saturation, t),
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
    saturation: clamp01(p.saturation),
    fluff: clamp01(p.fluff),
    frostAmt: clamp01(p.frostAmt),
    backSnowAmt: clamp01(p.backSnowAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    breathFogAmt: clamp01(p.breathFogAmt),
  };
}

// ── Geometry constants (the SAME silhouette every season) ────────────────────

// The perch crosses the pad; the parrot perches on it, body rising upward.
const PERCH_Y = 13; // top surface of the perch
const PERCH_HALF = 16; // half-width of the wooden perch
const BODY_CX = 1; // body centre x (turned ~15° toward lower-left)
const BODY_CY = -1; // body centre y (rest); bob lifts it

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat turf pad
function paintPad(ctx: CanvasRenderingContext2D, p: P): void {
  // soft contact shadow, offset to lower-right (light is upper-left)
  ctx.fillStyle = rgb([0, 0, 0], 0.18);
  ctx.beginPath();
  ctx.ellipse(3, 21.5, 17, 4.6, 0, 0, Math.PI * 2);
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

// the short low wooden perch laid across the pad (the parrot's feet grip it)
function paintPerch(ctx: CanvasRenderingContext2D, p: P): void {
  // outline pass (drawn fatter, dark first)
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, PERCH_Y + 1, PERCH_HALF + 1.4, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // shaded underside
  ctx.fillStyle = rgb(p.perchDark);
  ctx.beginPath();
  ctx.ellipse(0, PERCH_Y + 1, PERCH_HALF, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit top of the perch
  ctx.fillStyle = rgb(p.perchLight);
  ctx.beginPath();
  ctx.ellipse(0, PERCH_Y, PERCH_HALF, 2.1, 0, 0, Math.PI * 2);
  ctx.fill();
  // a couple of bark grooves for woodiness
  ctx.strokeStyle = rgb(p.perchDark, 0.7);
  ctx.lineWidth = 0.7;
  for (const gx of [-9, -2, 6, 12] as const) {
    ctx.beginPath();
    ctx.moveTo(gx, PERCH_Y - 1.4);
    ctx.lineTo(gx + 1, PERCH_Y + 1.2);
    ctx.stroke();
  }
  // little nub ends (cut branch)
  ctx.fillStyle = rgb(p.perchDark);
  for (const ex of [-PERCH_HALF, PERCH_HALF] as const) {
    ctx.beginPath();
    ctx.ellipse(ex, PERCH_Y, 1.5, 2.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(p.perchLight, 0.5);
    ctx.beginPath();
    ctx.ellipse(ex, PERCH_Y - 0.3, 0.8, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(p.perchDark);
  }

  // snow settled along the top of the perch (winter)
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgb([248, 252, 255], 0.92 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(0, PERCH_Y - 1.4, PERCH_HALF * 0.92, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// one curled gripping foot on the perch
function paintFoot(ctx: CanvasRenderingContext2D, p: P, x: number, y: number): void {
  ctx.strokeStyle = rgb([70, 58, 52]);
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  // two front toes + one back toe gripping over the perch
  for (const dx of [-1.8, 0.2, 2] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y - 1.6);
    ctx.quadraticCurveTo(x + dx, y - 0.2, x + dx * 1.3, y + 1.4);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

// the whole parrot: blue tail, green wing, red head/breast, hooked beak.
// The SILHOUETTE is identical every season; `fluff` only modestly puffs the
// outer feather edge, never changing the recognizable shape.
function paintParrot(ctx: CanvasRenderingContext2D, p: P, bob: number): void {
  const cx = BODY_CX;
  const cy = BODY_CY - bob; // breathing lift
  const puff = 1 + p.fluff * 0.18; // modest winter feather puff

  // feet gripping the perch (behind the body)
  paintFoot(ctx, p, cx - 3.5, PERCH_Y - 1);
  paintFoot(ctx, p, cx + 2.5, PERCH_Y - 1);

  // ── BLUE TAIL — sweeping down-right behind the body ──────────────────────
  ctx.save();
  ctx.translate(cx + 5, cy + 4);
  ctx.rotate(0.5);
  // outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.4, 12.4 * puff, 0, 0, Math.PI * 2);
  ctx.fill();
  // dark blue
  ctx.fillStyle = rgb(p.tailDark);
  ctx.beginPath();
  ctx.ellipse(0, 0, 3.6, 11.4 * puff, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit blue streak
  ctx.fillStyle = rgb(p.tailLight);
  ctx.beginPath();
  ctx.ellipse(-0.8, -1, 1.8, 9.6 * puff, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── GREEN WING — folded along the back/side ──────────────────────────────
  // outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(cx + 3.4, cy + 1, 7.4 * puff, 9.6 * puff, 0.34, 0, Math.PI * 2);
  ctx.fill();
  // dark green base
  ctx.fillStyle = rgb(p.wingDark);
  ctx.beginPath();
  ctx.ellipse(cx + 3.4, cy + 1, 6.6 * puff, 8.8 * puff, 0.34, 0, Math.PI * 2);
  ctx.fill();
  // lit green
  ctx.fillStyle = rgb(p.wingLight);
  ctx.beginPath();
  ctx.ellipse(cx + 2.2, cy - 0.6, 4.6 * puff, 6.8 * puff, 0.34, 0, Math.PI * 2);
  ctx.fill();
  // a few feather lines on the wing (dark)
  ctx.strokeStyle = rgb(p.wingDark, 0.85);
  ctx.lineWidth = 0.8;
  for (const k of [0, 1, 2] as const) {
    ctx.beginPath();
    ctx.moveTo(cx + 1.2 + k * 1.8, cy - 4 + k * 1.2);
    ctx.quadraticCurveTo(cx + 4 + k * 1.6, cy + 1 + k, cx + 4.6 + k * 1.4, cy + 6 + k * 0.6);
    ctx.stroke();
  }

  // ── RED HEAD / BREAST — the body front (lower-left, turned ~15°) ──────────
  // breast outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(cx - 2.4, cy + 2, 7.4 * puff, 9.4 * puff, -0.12, 0, Math.PI * 2);
  ctx.fill();
  // dark red
  ctx.fillStyle = rgb(p.headDark);
  ctx.beginPath();
  ctx.ellipse(cx - 2.4, cy + 2, 6.6 * puff, 8.6 * puff, -0.12, 0, Math.PI * 2);
  ctx.fill();
  // lit red breast (upper-left light)
  ctx.fillStyle = rgb(p.headLight);
  ctx.beginPath();
  ctx.ellipse(cx - 3.6, cy + 0.4, 4.6 * puff, 6.4 * puff, -0.12, 0, Math.PI * 2);
  ctx.fill();

  // ── HEAD — round red head up-left, with the pale hooked beak ─────────────
  const hx = cx - 5;
  const hy = cy - 7;
  // head outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.arc(hx, hy, 6.1 * puff, 0, Math.PI * 2);
  ctx.fill();
  // dark red
  ctx.fillStyle = rgb(p.headDark);
  ctx.beginPath();
  ctx.arc(hx, hy, 5.4 * puff, 0, Math.PI * 2);
  ctx.fill();
  // lit red crown (upper-left)
  ctx.fillStyle = rgb(p.headLight);
  ctx.beginPath();
  ctx.arc(hx - 1.4, hy - 1.6, 3.8 * puff, 0, Math.PI * 2);
  ctx.fill();

  // pale bare cheek patch (macaw signature) around the eye
  ctx.fillStyle = rgb([244, 238, 228]);
  ctx.beginPath();
  ctx.ellipse(hx - 1.2, hy + 0.2, 3.0, 2.6, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // a couple of faint cheek lines
  ctx.strokeStyle = rgb([200, 120, 110], 0.6);
  ctx.lineWidth = 0.5;
  for (const ly of [-0.6, 0.8] as const) {
    ctx.beginPath();
    ctx.moveTo(hx - 3.4, hy + ly);
    ctx.lineTo(hx + 0.4, hy + ly + 0.3);
    ctx.stroke();
  }

  // eye
  ctx.fillStyle = rgb([250, 248, 240]);
  ctx.beginPath();
  ctx.arc(hx - 1.2, hy - 0.4, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb([24, 20, 22]);
  ctx.beginPath();
  ctx.arc(hx - 1, hy - 0.3, 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb([255, 255, 255], 0.9);
  ctx.beginPath();
  ctx.arc(hx - 1.4, hy - 0.7, 0.32, 0, Math.PI * 2);
  ctx.fill();

  // ── PALE CURVED HOOKED BEAK — pointing down-left ─────────────────────────
  const bxk = hx - 4.4;
  const byk = hy + 1.6;
  // beak outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.moveTo(bxk + 3.2, byk - 2.6);
  ctx.quadraticCurveTo(bxk - 2.8, byk - 1.8, bxk - 2.6, byk + 2.2);
  ctx.quadraticCurveTo(bxk - 1.6, byk + 4.6, bxk + 1, byk + 3.2);
  ctx.quadraticCurveTo(bxk + 2.6, byk + 1.4, bxk + 3.6, byk - 0.6);
  ctx.closePath();
  ctx.fill();
  // pale beak fill
  ctx.fillStyle = rgb(p.beak);
  ctx.beginPath();
  ctx.moveTo(bxk + 2.8, byk - 2);
  ctx.quadraticCurveTo(bxk - 2, byk - 1.2, bxk - 1.8, byk + 1.8);
  ctx.quadraticCurveTo(bxk - 1, byk + 3.6, bxk + 0.8, byk + 2.4);
  ctx.quadraticCurveTo(bxk + 2, byk + 1, bxk + 3, byk - 0.6);
  ctx.closePath();
  ctx.fill();
  // shaded lower mandible + nostril
  ctx.fillStyle = rgb(p.outline, 0.5);
  ctx.beginPath();
  ctx.moveTo(bxk - 1.4, byk + 1.2);
  ctx.quadraticCurveTo(bxk - 0.6, byk + 3, bxk + 0.8, byk + 2.2);
  ctx.lineTo(bxk + 0.2, byk + 1.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgb([60, 48, 44]);
  ctx.beginPath();
  ctx.arc(bxk + 1.8, byk - 1, 0.5, 0, Math.PI * 2);
  ctx.fill();

  // ── snow on the back / head + frost sparkle (winter) ─────────────────────
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgb([248, 252, 255], 0.9 * p.backSnowAmt);
    // cap on the head crown
    ctx.beginPath();
    ctx.ellipse(hx - 0.6, hy - 4.2, 4.0 * puff, 1.8, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // ridge along the wing/back
    ctx.beginPath();
    ctx.ellipse(cx + 3.4, cy - 5, 5.2 * puff, 1.8, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([255, 255, 255], 0.8 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [cx - 4, cy - 2], [cx + 2, cy - 3], [cx + 5, cy + 2], [hx - 2, hy + 3],
      [cx + 4, cy + 6], [cx - 6, cy + 4],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(fx, fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // breath-fog puff at the beak (winter) — faint static puff at rest
  if (p.breathFogAmt > 0.001) {
    ctx.fillStyle = rgb([235, 244, 255], 0.4 * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(bxk - 3.6, byk + 1.4, 3.0, 2.0, 0.2, 0, Math.PI * 2);
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
  ctx.ellipse(0, 2, 26, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// optional plumage-richness sheen — a gentle saturation cue (no white flash on
// the bird; a very soft warm soft-light glaze whose strength tracks saturation).
function paintSaturationGlaze(ctx: CanvasRenderingContext2D, p: P): void {
  if (p.saturation <= 0.001) return;
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = rgb([255, 246, 232], 0.06 * p.saturation);
  ctx.beginPath();
  ctx.ellipse(BODY_CX - 2, BODY_CY, 12, 14, 0, 0, Math.PI * 2);
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
    paintPerch(ctx, p);
    paintParrot(ctx, p, bob);
    paintSaturationGlaze(ctx, p);
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
      const cx = BODY_CX;
      const cy = BODY_CY - bob;
      const hx = cx - 5;
      const hy = cy - 7;

      // Once-per-loop head tilt + tail/wing flick: a brief sharp bump near the
      // end of a ~5s loop, seamless (0 at the edges).
      const loop = (t % 5) / 5; // 0..1
      const flickGate = Math.max(0, Math.sin(loop * Math.PI * 2)) ** 6; // sharp brief bump
      const flick = Math.sin(t * 8) * flickGate;

      // head tilt — redraw the lit crown shifted slightly (reads as a tilt)
      if (flickGate > 0.02) {
        ctx.save();
        ctx.translate(hx, hy);
        ctx.rotate(flick * 0.12);
        ctx.fillStyle = rgb(p.headLight, 0.55);
        ctx.beginPath();
        ctx.arc(-1.4, -1.6, 3.6 * (1 + p.fluff * 0.18), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // tail flick — a faint lit-blue streak swings with the flick
      ctx.save();
      ctx.translate(cx + 5, cy + 4);
      ctx.rotate(0.5 + flick * 0.16);
      ctx.fillStyle = rgb(p.tailLight, 0.45 * flickGate);
      ctx.beginPath();
      ctx.ellipse(-0.8, -1, 1.6, 9.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

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
        // a feather sheen sweeps across the plumage (richest season)
        const s = 0.5 + 0.5 * Math.sin(t * 1.1);
        const sx = cx - 8 + s * 16;
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([255, 255, 255], 0.34);
        ctx.beginPath();
        ctx.ellipse(sx, cy, 3, 8, 0.2, 0, Math.PI * 2);
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
        const bxk = hx - 4.4;
        const byk = hy + 1.6;
        const breathe = 0.5 + 0.5 * Math.sin(t * 1.5);
        const reach = 3 + breathe * 3;
        ctx.fillStyle = rgb([235, 244, 255], (0.18 + 0.32 * breathe) * p.breathFogAmt);
        ctx.beginPath();
        ctx.ellipse(bxk - reach, byk + 1.4, 2.4 + breathe * 1.8, 1.6 + breathe * 1.2, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // one drifting snowflake on a seamless 3.4s fall
        const prog = ((t / 3.4) % 1 + 1) % 1;
        const fy = -20 + prog * 36;
        const fxx = 6 + Math.sin(prog * Math.PI * 2) * 4;
        ctx.fillStyle = rgb([255, 255, 255], 0.85);
        ctx.beginPath();
        ctx.arc(fxx, fy, 1.1, 0, Math.PI * 2);
        ctx.fill();

        // cold sheen pulse over the bird
        const sheen = 0.5 + 0.5 * Math.sin(t * 0.8);
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([206, 224, 255], 0.1 + sheen * 0.12);
        ctx.beginPath();
        ctx.ellipse(cx - 2, cy, 11, 13, 0, 0, Math.PI * 2);
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
