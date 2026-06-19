// Seasonal art for the BEET / BEETROOT vegetable tile (`tile_veg_beet`).
//
// ONE crimson beetroot — a rounded deep-red bulb with a pointed tip and a thin
// taproot, topped by an upright tuft of dark-green red-veined leaves — sits on a
// low grassy pad. The SAME silhouette is drawn every season; only colour and the
// dressing on the pad and subject (frost, snow, blossom, fallen leaves) shift.
//
// Architecture (mandatory): a single parameterized `paint(ctx, p, bob)` renders
// the whole tile from a tweenable param set `P`. Four season param sets live in
// `SP`. Season redraws, idle loops, and the three forward season→season morphs
// all funnel through `paint`, so transitions are seamless by construction:
//   transition(from)(ctx, 0) ≡ draw(from)   and   (ctx, 1) ≡ draw(to).
//
// Origin-centered in the −24..+24 design box; light comes from the upper-left.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import type { SeasonName } from "../types.js";

// ── Tiny math helpers ───────────────────────────────────────────────────────

type RGB = [number, number, number];

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function rgb(c: RGB): string {
  return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
}

function rgba(c: RGB, a: number): string {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${clamp01(a)})`;
}

// Perlin-style smootherstep for transition easing (zero velocity at 0 and 1).
function smoother(x: number): number {
  return x * x * x * (x * (6 * x - 15) + 10);
}

// Seamless ease-in bob: 0 at t=0 with zero velocity, oscillates thereafter.
function bobAt(t: number, amp: number, w: number): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Tweenable params ────────────────────────────────────────────────────────
// Every field is a number or RGB so lerpP can interpolate the whole struct.
// NO booleans / season strings — the season "filter" is entirely in these values.

interface P {
  // colours
  rootHi: RGB; // bulb highlight side
  rootMid: RGB; // bulb body
  rootShade: RGB; // bulb shadow side / tip
  leafHi: RGB; // leaf highlight
  leafMid: RGB; // leaf body
  veins: RGB; // red veins + stems
  padGrass: RGB; // pad top grass
  padShade: RGB; // pad underside
  soil: RGB; // soil collar where bulb meets pad
  outline: RGB; // soft dark outline tint
  light: RGB; // ambient light wash colour
  // scalars 0..1
  ripeness: number; // 0 small/young .. 1 fat/mature (very modest size growth)
  frostAmt: number; // frost dusting on subject
  snowCapAmt: number; // snow cap atop leaves/bulb
  padSnowAmt: number; // snow blanket on pad
  blossomAmt: number; // tiny blossom on pad (spring)
  fallenLeafAmt: number; // fallen leaves on pad (autumn)
  leafYellow: number; // leaf-tip yellowing (autumn)
  gloss: number; // bulb sheen strength
  lightAmt: number; // ambient wash strength
}

// ── Four season param sets ──────────────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  Spring: {
    rootHi: [216, 96, 120],
    rootMid: [180, 56, 84],
    rootShade: [126, 32, 58],
    leafHi: [150, 206, 96],
    leafMid: [86, 156, 58],
    veins: [196, 70, 96],
    padGrass: [138, 206, 92],
    padShade: [80, 140, 60],
    soil: [92, 64, 38],
    outline: [70, 30, 40],
    light: [225, 240, 255],
    ripeness: 0.32,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
    leafYellow: 0,
    gloss: 0.3,
    lightAmt: 0.28,
  },
  Summer: {
    rootHi: [214, 70, 96],
    rootMid: [168, 36, 64],
    rootShade: [104, 18, 42],
    leafHi: [120, 184, 70],
    leafMid: [54, 122, 44],
    veins: [186, 48, 72],
    padGrass: [88, 174, 70],
    padShade: [48, 116, 50],
    soil: [82, 54, 30],
    outline: [56, 22, 32],
    light: [255, 244, 210],
    ripeness: 0.62,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    leafYellow: 0,
    gloss: 0.85,
    lightAmt: 0.34,
  },
  Autumn: {
    rootHi: [186, 60, 84],
    rootMid: [138, 30, 56],
    rootShade: [82, 16, 36],
    leafHi: [150, 158, 70],
    leafMid: [78, 104, 44],
    veins: [168, 56, 56],
    padGrass: [150, 154, 84],
    padShade: [104, 100, 56],
    soil: [88, 58, 32],
    outline: [54, 28, 24],
    light: [255, 214, 150],
    ripeness: 0.92,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.8,
    leafYellow: 0.7,
    gloss: 0.4,
    lightAmt: 0.32,
  },
  Winter: {
    rootHi: [176, 92, 110],
    rootMid: [134, 46, 70],
    rootShade: [86, 28, 48],
    leafHi: [120, 158, 118],
    leafMid: [70, 110, 80],
    veins: [150, 78, 86],
    padGrass: [186, 204, 214],
    padShade: [134, 158, 178],
    soil: [96, 84, 78],
    outline: [60, 50, 60],
    light: [206, 226, 255],
    ripeness: 0.78,
    frostAmt: 0.62,
    snowCapAmt: 0.7,
    padSnowAmt: 0.85,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    leafYellow: 0.12,
    gloss: 0.4,
    lightAmt: 0.3,
  },
};

// Interpolate EVERY field of P.
function lerpP(a: P, b: P, t: number): P {
  return {
    rootHi: lerpRGB(a.rootHi, b.rootHi, t),
    rootMid: lerpRGB(a.rootMid, b.rootMid, t),
    rootShade: lerpRGB(a.rootShade, b.rootShade, t),
    leafHi: lerpRGB(a.leafHi, b.leafHi, t),
    leafMid: lerpRGB(a.leafMid, b.leafMid, t),
    veins: lerpRGB(a.veins, b.veins, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padShade: lerpRGB(a.padShade, b.padShade, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    ripeness: lerp(a.ripeness, b.ripeness, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
    leafYellow: lerp(a.leafYellow, b.leafYellow, t),
    gloss: lerp(a.gloss, b.gloss, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
  };
}

// ── The single parameterized paint ──────────────────────────────────────────
// Subject silhouette is IDENTICAL across all P. `bob` shifts the subject (and
// its dressing) vertically; the pad stays put. Everything reads from `p`.

function paint(ctx: CanvasRenderingContext2D, p: P, bob: number): void {
  ctx.save();
  ctx.globalAlpha = 1;

  const outline = rgb(p.outline);

  // ── Pad: low flat ellipse, tufted top + shaded underside + contact shadow ──
  // Soft contact shadow, lower-right.
  ctx.fillStyle = "rgba(0,0,0,0.20)";
  ctx.beginPath();
  ctx.ellipse(3, 21.5, 17, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shaded underside band.
  ctx.fillStyle = rgb(p.padShade);
  ctx.beginPath();
  ctx.ellipse(0, 20.5, 18, 5.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Grass top.
  ctx.fillStyle = rgb(p.padGrass);
  ctx.beginPath();
  ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tufted edge — little blades around the rim.
  ctx.strokeStyle = rgb(p.padGrass);
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  for (let i = 0; i < 11; i++) {
    const a = Math.PI + (i / 10) * Math.PI; // front arc of rim
    const ex = Math.cos(a) * 17.4;
    const ey = 19 + Math.sin(a) * 5.0;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + Math.cos(a) * 0.6, ey - 2.1 - (i % 2) * 0.7);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // Bright lit crescent on the upper-left of the pad.
  ctx.fillStyle = rgba(p.light, 0.18 * p.lightAmt + 0.06);
  ctx.beginPath();
  ctx.ellipse(-5, 17.5, 11, 2.6, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Pad snow blanket (winter).
  if (p.padSnowAmt > 0.01) {
    ctx.fillStyle = rgba([244, 250, 255], 0.9 * p.padSnowAmt);
    ctx.beginPath();
    ctx.ellipse(0, 18.2, 17 * (0.7 + 0.3 * p.padSnowAmt), 4.4 * p.padSnowAmt + 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // sparkle flecks
    ctx.fillStyle = rgba([255, 255, 255], 0.85 * p.padSnowAmt);
    [[-9, 18], [6, 19.5], [12, 17.5], [-2, 20]].forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ── Subject group (bobs as a whole) ──────────────────────────────────────
  ctx.save();
  ctx.translate(0, bob);

  const ripe = clamp01(p.ripeness);
  // Bulb size grows VERY modestly with ripeness — same beet, just plumper.
  const bw = 12 + ripe * 1.8; // half-width
  const bh = 11 + ripe * 1.6; // half-height (upper bulge)
  const cy = 9; // bulb centre y, sitting on the pad
  const tipY = cy + bh + 6.2; // taproot/pointed tip end

  // Soil collar where the bulb meets the pad.
  ctx.fillStyle = rgb(p.soil);
  ctx.beginPath();
  ctx.ellipse(0, cy + bh * 0.4, bw * 0.9, 3.0, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Bulb silhouette: rounded top tapering to a pointed tip + taproot ──
  // Build the same path each season (silhouette invariant).
  function bulbPath(): void {
    ctx.beginPath();
    ctx.moveTo(-bw, cy - bh * 0.1);
    // left shoulder up to crown
    ctx.bezierCurveTo(-bw, cy - bh, -bw * 0.4, cy - bh * 1.25, 0, cy - bh * 1.2);
    // right crown down to right flank
    ctx.bezierCurveTo(bw * 0.4, cy - bh * 1.25, bw, cy - bh, bw, cy - bh * 0.1);
    // right flank tapering toward the tip
    ctx.bezierCurveTo(bw, cy + bh * 0.7, bw * 0.45, cy + bh * 0.95, 2.0, tipY - 2.0);
    // pointed tip
    ctx.lineTo(0.6, tipY);
    ctx.lineTo(-0.6, tipY - 0.4);
    // left flank back up
    ctx.bezierCurveTo(-bw * 0.45, cy + bh * 0.95, -bw, cy + bh * 0.7, -bw, cy - bh * 0.1);
    ctx.closePath();
  }

  // Dark base pass (outline / silhouette), then lighter fills on top.
  bulbPath();
  ctx.fillStyle = rgb(p.rootShade);
  ctx.fill();

  // Mid body, inset slightly so the dark base reads as an outline.
  ctx.save();
  ctx.translate(-0.5, -0.6);
  bulbPath();
  ctx.fillStyle = rgb(p.rootMid);
  ctx.fill();
  ctx.restore();

  // Highlight side (upper-left), clipped to the bulb.
  ctx.save();
  bulbPath();
  ctx.clip();
  ctx.fillStyle = rgb(p.rootHi);
  ctx.beginPath();
  ctx.ellipse(-bw * 0.32, cy - bh * 0.45, bw * 0.7, bh * 0.85, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // soft horizontal ring lines hinting at the beet's bands
  ctx.strokeStyle = rgba(p.rootShade, 0.35);
  ctx.lineWidth = 1;
  for (let r = 0; r < 2; r++) {
    const ry = cy + bh * (0.15 + r * 0.35);
    ctx.beginPath();
    ctx.ellipse(0, ry, bw * (0.7 - r * 0.18), 2.2, 0, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }
  ctx.restore();

  // Glossy sheen highlight (strength from gloss).
  ctx.fillStyle = rgba([255, 240, 244], 0.5 * p.gloss + 0.12);
  ctx.beginPath();
  ctx.ellipse(-bw * 0.38, cy - bh * 0.55, bw * 0.22, bh * 0.32, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Soft outline stroke around the bulb to seat it.
  bulbPath();
  ctx.strokeStyle = rgba(p.outline, 0.55);
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Thin taproot dangling from the tip.
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, tipY - 1);
  ctx.quadraticCurveTo(1.6, tipY + 3, 0.4, tipY + 6);
  ctx.stroke();
  ctx.lineCap = "butt";

  // ── Leaf tuft rising above the bulb (same arrangement every season) ──
  const crownY = cy - bh * 1.18;
  // [base dx, lean dx, tipY, length] — symmetric upright fan, identical shape.
  const leaves: Array<[number, number, number]> = [
    [-5.4, -8.0, -18.5],
    [-2.6, -4.0, -22.0],
    [0.0, 0.0, -23.5],
    [2.6, 4.0, -22.0],
    [5.4, 8.0, -18.5],
  ];

  leaves.forEach(([bx, lean, ty], i) => {
    const baseX = bx * 0.5;
    const baseY = crownY + 1;
    const cpx = bx + lean * 0.4;
    const cpy = crownY - 6;
    const tipX = bx + lean;
    const tipY2 = ty;

    // Red stem (dark base then vein colour).
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(cpx * 0.6, (baseY + cpy) * 0.5, cpx, cpy);
    ctx.stroke();
    ctx.strokeStyle = rgb(p.veins);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(cpx * 0.6, (baseY + cpy) * 0.5, cpx, cpy);
    ctx.stroke();

    // Leaf blade (broad ovate, dark base then mid then highlight).
    const drawBlade = (color: string, inset: number): void => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cpx, cpy + inset);
      ctx.quadraticCurveTo(
        cpx - 4.2 + inset * 0.4,
        (cpy + tipY2) * 0.5,
        tipX,
        tipY2 + inset,
      );
      ctx.quadraticCurveTo(
        cpx + 4.2 - inset * 0.4,
        (cpy + tipY2) * 0.5,
        cpx,
        cpy + inset,
      );
      ctx.closePath();
      ctx.fill();
    };
    drawBlade(outline, 0);
    drawBlade(rgb(p.leafMid), 1.0);
    // highlight along the lit (upper-left) side
    ctx.save();
    ctx.globalAlpha = 0.85;
    drawBlade(rgb(p.leafHi), 2.6);
    ctx.restore();

    // Yellowing leaf tip (autumn) — wash near the tip.
    if (p.leafYellow > 0.02) {
      ctx.fillStyle = rgba([214, 196, 92], 0.7 * p.leafYellow);
      ctx.beginPath();
      ctx.ellipse(tipX, tipY2 + 1.5, 2.4, 4.0, lean * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central red vein.
    ctx.strokeStyle = rgba(p.veins, 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cpx, cpy + 1);
    ctx.quadraticCurveTo((cpx + tipX) * 0.5 - 1, (cpy + tipY2) * 0.5, tipX, tipY2 + 1.5);
    ctx.stroke();

    // Frost on upward leaf surfaces (winter).
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([226, 240, 255], 0.4 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse((cpx + tipX) * 0.5, (cpy + tipY2) * 0.5, 2.0, 4.2, lean * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
    void i;
  });
  ctx.lineCap = "butt";

  // ── Frost dusting on the bulb's upward surface (winter) ──
  if (p.frostAmt > 0.02) {
    ctx.save();
    bulbPath();
    ctx.clip();
    ctx.fillStyle = rgba([220, 236, 255], 0.45 * p.frostAmt);
    ctx.beginPath();
    ctx.ellipse(-bw * 0.1, cy - bh * 0.6, bw * 0.85, bh * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // sparkle flecks on the bulb
    ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.frostAmt);
    [[-4, cy - bh * 0.7], [3, cy - bh * 0.5], [-1, cy - bh * 0.2]].forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // ── Snow cap atop the leaf tuft (winter) ──
  if (p.snowCapAmt > 0.02) {
    ctx.fillStyle = rgba([248, 252, 255], 0.92 * p.snowCapAmt);
    ctx.beginPath();
    ctx.ellipse(0, crownY - 16, 6.5 * p.snowCapAmt + 1.5, 2.6 * p.snowCapAmt + 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-3, crownY - 13, 2.4 * p.snowCapAmt + 0.6, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore(); // end subject group

  // ── Pad dressing that sits ON the pad (does not bob with subject) ──
  // Tiny blossom (spring).
  if (p.blossomAmt > 0.02) {
    const petal = rgba([255, 224, 236], 0.9 * p.blossomAmt);
    const bxC = -12.5;
    const byC = 17.0;
    ctx.fillStyle = petal;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(bxC + Math.cos(a) * 1.7, byC + Math.sin(a) * 1.1, 1.3, 1.0, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = rgba([255, 214, 96], p.blossomAmt);
    ctx.beginPath();
    ctx.arc(bxC, byC, 1.0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fallen leaves on the pad (autumn).
  if (p.fallenLeafAmt > 0.02) {
    const leafCol = rgba([196, 132, 52], 0.95 * p.fallenLeafAmt);
    const edgeCol = rgba([120, 70, 24], 0.9 * p.fallenLeafAmt);
    const fallen: Array<[number, number, number]> = [
      [11.5, 18.5, 0.5],
      [-13, 19.5, -0.7],
    ];
    fallen.forEach(([fx, fy, rot]) => {
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(rot);
      ctx.fillStyle = leafCol;
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.4, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = edgeCol;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-3.2, 0);
      ctx.lineTo(3.2, 0);
      ctx.stroke();
      ctx.restore();
    });
  }

  // ── Ambient light wash over the whole tile ──
  if (p.lightAmt > 0.001) {
    ctx.fillStyle = rgba(p.light, 0.16 * p.lightAmt);
    ctx.beginPath();
    ctx.ellipse(-6, 0, 22, 26, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── draw / anim / transition factories ──────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const base = SP[season];
    // Subject breathing bob — 0 at t=0, zero velocity, seamless.
    const bob = bobAt(t, 0.7, 1.4);

    // Per-season micro-motion expressed as a transient param tweak (additive),
    // never removing the subject. Clone only the touched fields.
    const p: P = base;
    let p2 = p;

    if (season === "Summer") {
      // soft bulb sheen pulse + leaf-sway handled via gloss/light wobble.
      const pulse = (1 - Math.cos(t * 2.0)) * 0.5; // 0..1, 0 at t=0
      p2 = { ...base, gloss: clamp01(base.gloss + pulse * 0.18) };
    } else if (season === "Autumn") {
      // a yellow leaf-tip flutters (yellow wash breathes).
      const flutter = (1 - Math.cos(t * 1.6)) * 0.5;
      p2 = { ...base, leafYellow: clamp01(base.leafYellow + flutter * 0.18) };
    } else if (season === "Winter") {
      // cold sheen breathes (drifting flakes drawn separately below).
      const sheen = (1 - Math.cos(t * 0.9)) * 0.5;
      p2 = { ...base, frostAmt: clamp01(base.frostAmt + sheen * 0.12) };
    } else if (season === "Spring") {
      // dew shimmer — light wash breathes.
      const dew = (1 - Math.cos(t * 1.8)) * 0.5;
      p2 = { ...base, lightAmt: clamp01(base.lightAmt + dew * 0.12) };
    }

    paint(ctx, p2, bob);

    // Drifting snowflakes overlay (winter only) — seamless vertical loops.
    if (season === "Winter") {
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      const seeds: Array<[number, number, number]> = [
        [-9, 0.9, 0.0],
        [5, 0.8, 0.4],
        [12, 0.7, 0.7],
        [-3, 0.85, 0.22],
      ];
      seeds.forEach(([fx, r, phase]) => {
        const prog = (((t / 3.4 + phase) % 1) + 1) % 1;
        const fy = -22 + prog * 40;
        const driftX = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
        ctx.globalAlpha = 0.8 * (1 - prog * 0.3);
        ctx.beginPath();
        ctx.arc(driftX, fy, r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  };
}

const FROM: SeasonName[] = ["Spring", "Summer", "Autumn", "Winter"];

function transition(fromIdx: 0 | 1 | 2): (ctx: CanvasRenderingContext2D, pp: number) => void {
  const a = SP[FROM[fromIdx]];
  const b = SP[FROM[fromIdx + 1]];
  return (ctx, pp) => paint(ctx, lerpP(a, b, smoother(clamp01(pp))), 0);
}

// ── Exports ─────────────────────────────────────────────────────────────────

export const VARIANTS: SeasonalTileEntry = {
  Spring: { draw: draw("Spring"), anim: anim("Spring") },
  Summer: { draw: draw("Summer"), anim: anim("Summer") },
  Autumn: { draw: draw("Autumn"), anim: anim("Autumn") },
  Winter: { draw: draw("Winter"), anim: anim("Winter") },
};

export const TRANSITIONS: SeasonalTransitionSet = {
  0: transition(0), // Spring → Summer
  1: transition(1), // Summer → Autumn
  2: transition(2), // Autumn → Winter
};
