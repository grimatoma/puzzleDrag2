// Seasonal art for the MUSHROOM vegetable tile (`tile_veg_mushroom`).
//
// The subject is ALWAYS the same tight cluster of 2–3 classic toadstool
// mushrooms — bright red domed caps with cream spots on plump cream stems,
// standing on a low grass pad. "Ripeness" across the year is conveyed only by
// cap size/openness, colour, and pad/frost/snow dressing — never by swapping in
// a different object.
//
// Architecture (mandatory): a SINGLE parameterized `paint(ctx, p, bob)` draws
// the entire tile from a tweenable param set `P`. Each season is one `P` in
// `SP`. `draw` paints at rest (bob 0); `anim` adds a seamless breathing bob
// plus per-season micro-motion; each `transition` paints a lerp between two
// adjacent `P`s through a smootherstep ease. Because every visual is a pure
// function of `P`, transition(0) ≡ draw(from) and transition(1) ≡ draw(to) —
// no snap, and the subject is the same cluster every frame.
//
// Origin-centered in the ~−24..+24 design box. Light comes from upper-left.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import type { SeasonName } from "../types.js";

// ── small math helpers ───────────────────────────────────────────────────────

type RGB = [number, number, number];

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

const smoother = (x: number): number => x * x * x * (x * (6 * x - 15) + 10);

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function rgb(c: RGB, alpha = 1): string {
  const r = Math.round(c[0]);
  const g = Math.round(c[1]);
  const b = Math.round(c[2]);
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

/** Mix toward a target colour by amount k (0..1). */
function mix(c: RGB, target: RGB, k: number): RGB {
  return lerpRGB(c, target, clamp01(k));
}

function shade(c: RGB, k: number): RGB {
  // k>0 lightens toward white, k<0 darkens toward black
  return k >= 0 ? mix(c, [255, 255, 255], k) : mix(c, [0, 0, 0], -k);
}

// ── tweenable param set ──────────────────────────────────────────────────────

interface P {
  // colours
  cap: RGB; // mushroom cap red
  spot: RGB; // cream cap spots
  stem: RGB; // cream stem
  grass: RGB; // pad grass top
  soil: RGB; // pad underside / soil
  outline: RGB; // soft dark outline tint
  light: RGB; // ambient light wash colour
  // scalars 0..1
  lightAmt: number; // strength of the ambient light wash
  capOpenAmount: number; // dome size/openness (button → flat-mature)
  gloss: number; // cap highlight strength
  droop: number; // slight downward droop of caps (winter)
  frostAmt: number; // frosty rim/dusting on caps
  snowCapAmt: number; // little snow cap on top of caps
  padSnowAmt: number; // snow blanket over the pad
  blossomAmt: number; // tiny blossom on the pad (spring)
  fallenLeafAmt: number; // fallen leaves on the pad (autumn)
}

const SPRING: P = {
  cap: [223, 74, 64], // fresh bright red
  spot: [255, 250, 240],
  stem: [246, 238, 220],
  grass: [150, 214, 96], // bright lime dewy
  soil: [92, 70, 44],
  outline: [74, 48, 40],
  light: [214, 240, 255], // cool-bright
  lightAmt: 0.32,
  capOpenAmount: 0.18, // small button caps
  gloss: 0.32,
  droop: 0.0,
  frostAmt: 0.0,
  snowCapAmt: 0.0,
  padSnowAmt: 0.0,
  blossomAmt: 0.85,
  fallenLeafAmt: 0.0,
};

const SUMMER: P = {
  cap: [214, 44, 40], // vivid saturated red
  spot: [255, 248, 232],
  stem: [240, 230, 206],
  grass: [86, 168, 64], // saturated mid-green
  soil: [82, 60, 36],
  outline: [66, 40, 32],
  light: [255, 246, 214], // warm
  lightAmt: 0.4,
  capOpenAmount: 0.6, // full rounded domes
  gloss: 0.62,
  droop: 0.0,
  frostAmt: 0.0,
  snowCapAmt: 0.0,
  padSnowAmt: 0.0,
  blossomAmt: 0.0,
  fallenLeafAmt: 0.0,
};

const AUTUMN: P = {
  cap: [176, 40, 36], // deep mature red
  spot: [238, 222, 188], // ageing cream
  stem: [226, 210, 178],
  grass: [150, 142, 78], // olive-tan
  soil: [86, 58, 30],
  outline: [70, 42, 28],
  light: [255, 224, 168], // low amber
  lightAmt: 0.42,
  capOpenAmount: 1.0, // peak size, edges flattening
  gloss: 0.34,
  droop: 0.06,
  frostAmt: 0.0,
  snowCapAmt: 0.0,
  padSnowAmt: 0.0,
  blossomAmt: 0.0,
  fallenLeafAmt: 0.9,
};

const WINTER: P = {
  cap: [168, 76, 70], // muted but clearly red
  spot: [240, 240, 244],
  stem: [222, 220, 222],
  grass: [126, 150, 150], // cool grey-green under snow
  soil: [78, 76, 86],
  outline: [64, 60, 72],
  light: [206, 224, 248], // cool blue-grey
  lightAmt: 0.46,
  capOpenAmount: 0.78, // mature, drooping a touch
  gloss: 0.22,
  droop: 0.22,
  frostAmt: 0.85,
  snowCapAmt: 0.7,
  padSnowAmt: 0.92,
  blossomAmt: 0.0,
  fallenLeafAmt: 0.0,
};

const SP: Record<SeasonName, P> = {
  Spring: SPRING,
  Summer: SUMMER,
  Autumn: AUTUMN,
  Winter: WINTER,
};

function lerpP(a: P, b: P, t: number): P {
  return {
    cap: lerpRGB(a.cap, b.cap, t),
    spot: lerpRGB(a.spot, b.spot, t),
    stem: lerpRGB(a.stem, b.stem, t),
    grass: lerpRGB(a.grass, b.grass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    capOpenAmount: lerp(a.capOpenAmount, b.capOpenAmount, t),
    gloss: lerp(a.gloss, b.gloss, t),
    droop: lerp(a.droop, b.droop, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
  };
}

// ── pad (low flat grass ellipse with tufted edge + contact shadow) ───────────

function paintPad(ctx: CanvasRenderingContext2D, p: P): void {
  const cy = 19;
  // soft contact shadow, offset lower-right
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(3, cy + 2.5, 17, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // shaded underside (soil)
  ctx.fillStyle = rgb(p.soil);
  ctx.beginPath();
  ctx.ellipse(0, cy + 1.4, 18, 5.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // grass top
  ctx.fillStyle = rgb(p.grass);
  ctx.beginPath();
  ctx.ellipse(0, cy - 0.2, 18, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // lighter front lip catches the light
  ctx.fillStyle = rgb(shade(p.grass, 0.22));
  ctx.beginPath();
  ctx.ellipse(-2, cy - 1.4, 13, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // tufted grass blades along the rim
  ctx.strokeStyle = rgb(shade(p.grass, -0.18));
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  for (let i = 0; i < 11; i++) {
    const a = -0.18 + (i / 10) * (Math.PI + 0.36);
    const ex = Math.cos(a) * 17.5;
    const ey = cy - 0.2 + Math.sin(a) * 4.8;
    const lean = ex < 0 ? -1 : 1;
    ctx.strokeStyle = rgb(shade(p.grass, i % 2 ? 0.18 : -0.14));
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + lean * 1.2, ey - 2.6);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // ── pad dressing ──
  // spring blossom: a couple of tiny five-petal flowers
  if (p.blossomAmt > 0.01) {
    const a = clamp01(p.blossomAmt);
    const flowers: Array<[number, number, number]> = [
      [-11, 18, 1.0],
      [12, 20, 0.85],
    ];
    flowers.forEach(([fx, fy, s]) => {
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(fx + Math.cos(ang) * 1.6 * s, fy + Math.sin(ang) * 1.6 * s, 1.0 * s, 1.0 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(255,214,84,0.95)";
      ctx.beginPath();
      ctx.arc(fx, fy, 0.9 * s, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  // autumn fallen leaves
  if (p.fallenLeafAmt > 0.01) {
    const a = clamp01(p.fallenLeafAmt);
    const leaves: Array<[number, number, number, RGB]> = [
      [-12, 20, 0.5, [196, 120, 40]],
      [11, 21, -0.7, [168, 70, 36]],
    ];
    leaves.forEach(([lx, ly, rot, col]) => {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.fillStyle = rgb(col);
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.4, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgb(shade(col, -0.3));
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-3.2, 0);
      ctx.lineTo(3.2, 0);
      ctx.stroke();
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  // winter snow blanket over the pad
  if (p.padSnowAmt > 0.01) {
    const a = clamp01(p.padSnowAmt);
    ctx.globalAlpha = a;
    const snow = ctx.createLinearGradient(0, cy - 4, 0, cy + 4);
    snow.addColorStop(0, "rgba(244,248,255,1)");
    snow.addColorStop(1, "rgba(206,222,240,1)");
    ctx.fillStyle = snow;
    ctx.beginPath();
    ctx.ellipse(0, cy - 0.6, 16.5 * (0.6 + 0.4 * a), 4.4 * (0.6 + 0.4 * a), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ── one mushroom (cap + stem) driven entirely by P ───────────────────────────

/** Draw a single mushroom whose base sits at (bx, by). `scale` sizes it; the
 *  shared silhouette is constant — only colours/openness/frost/snow vary. */
function paintMushroom(
  ctx: CanvasRenderingContext2D,
  p: P,
  bx: number,
  by: number,
  scale: number,
  sparkle: number,
): void {
  // dome geometry: openness widens the cap and flattens the dome slightly.
  const open = clamp01(p.capOpenAmount);
  const capW = (6.0 + open * 4.0) * scale; // half-width
  const capH = (5.6 - open * 1.4) * scale; // dome height (flatter when open)
  const droop = p.droop * 2.4 * scale; // caps sag a touch in winter
  const stemH = (9.0 - open * 1.0) * scale;
  const stemW = (2.6 + open * 0.4) * scale;
  const capCy = by - stemH; // cap centre y

  // ── stem ──
  const stemGrad = ctx.createLinearGradient(bx - stemW, 0, bx + stemW, 0);
  stemGrad.addColorStop(0, rgb(shade(p.stem, -0.22)));
  stemGrad.addColorStop(0.45, rgb(p.stem));
  stemGrad.addColorStop(1, rgb(shade(p.stem, 0.12)));
  ctx.fillStyle = stemGrad;
  ctx.beginPath();
  ctx.moveTo(bx - stemW, by);
  ctx.quadraticCurveTo(bx - stemW * 0.7, by - stemH * 0.5, bx - stemW * 0.85, capCy + capH * 0.3);
  ctx.lineTo(bx + stemW * 0.85, capCy + capH * 0.3);
  ctx.quadraticCurveTo(bx + stemW * 0.7, by - stemH * 0.5, bx + stemW, by);
  ctx.closePath();
  ctx.fill();
  // stem outline
  ctx.strokeStyle = rgb(p.outline, 0.9);
  ctx.lineWidth = 1;
  ctx.stroke();

  // ── cap ── dark base then lit dome (layered like wheat.ts)
  ctx.save();
  ctx.translate(bx, capCy);
  // dark underside / outline pass
  ctx.fillStyle = rgb(shade(p.cap, -0.42));
  ctx.beginPath();
  ctx.ellipse(0, droop + capH * 0.35, capW + 0.8, capH + 0.8, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  // domed top
  const capGrad = ctx.createLinearGradient(-capW, -capH, capW, capH);
  capGrad.addColorStop(0, rgb(shade(p.cap, 0.28)));
  capGrad.addColorStop(0.55, rgb(p.cap));
  capGrad.addColorStop(1, rgb(shade(p.cap, -0.3)));
  ctx.fillStyle = capGrad;
  ctx.beginPath();
  ctx.ellipse(0, droop, capW, capH, 0, Math.PI, Math.PI * 2);
  // flat-ish bottom edge of the dome
  ctx.ellipse(0, droop, capW, capH * 0.4, 0, 0, Math.PI);
  ctx.fill();
  // cap outline
  ctx.strokeStyle = rgb(p.outline);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.ellipse(0, droop, capW, capH, 0, Math.PI, Math.PI * 2);
  ctx.stroke();

  // gloss highlight (upper-left)
  if (p.gloss > 0.01) {
    ctx.globalAlpha = clamp01(p.gloss);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.ellipse(-capW * 0.38, droop - capH * 0.42, capW * 0.34, capH * 0.3, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // cream spots on the cap
  const spots: Array<[number, number, number]> = [
    [-capW * 0.45, droop - capH * 0.3, 0.9],
    [capW * 0.1, droop - capH * 0.55, 1.0],
    [capW * 0.5, droop - capH * 0.2, 0.85],
    [-capW * 0.1, droop - capH * 0.08, 0.8],
    [capW * 0.32, droop - capH * 0.66, 0.6],
  ];
  spots.forEach(([sx, sy, sr], i) => {
    const r = sr * 1.5 * scale;
    ctx.fillStyle = rgb(p.spot);
    ctx.beginPath();
    ctx.ellipse(sx, sy, r, r * 0.86, 0, 0, Math.PI * 2);
    ctx.fill();
    // spring dew shimmer / sparkle glint on the spots
    if (sparkle > 0.01 && i % 2 === 0) {
      ctx.globalAlpha = clamp01(sparkle);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(sx - r * 0.3, sy - r * 0.3, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  });

  // ── winter dressing on the cap ──
  if (p.frostAmt > 0.01) {
    const f = clamp01(p.frostAmt);
    // frost rim along the lower edge of the dome
    ctx.globalAlpha = 0.5 * f;
    ctx.strokeStyle = "rgba(226,240,255,1)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, droop + capH * 0.15, capW * 0.96, capH * 0.92, 0, Math.PI * 0.05, Math.PI * 0.95);
    ctx.stroke();
    // frost sparkle dusting
    ctx.fillStyle = "rgba(240,248,255,1)";
    const frost: Array<[number, number]> = [
      [-capW * 0.6, droop - capH * 0.1],
      [capW * 0.55, droop - capH * 0.35],
      [-capW * 0.2, droop - capH * 0.5],
    ];
    frost.forEach(([fx, fy]) => {
      ctx.globalAlpha = f * (0.4 + 0.5 * sparkle + 0.3);
      ctx.beginPath();
      ctx.arc(fx, fy, 0.7 * scale, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  if (p.snowCapAmt > 0.01) {
    const s = clamp01(p.snowCapAmt);
    ctx.globalAlpha = s;
    ctx.fillStyle = "rgba(248,251,255,1)";
    ctx.beginPath();
    ctx.ellipse(-capW * 0.12, droop - capH * 0.62, capW * 0.62 * s + capW * 0.18, capH * 0.5 * s + 0.6, -0.18, Math.PI, Math.PI * 2);
    ctx.fill();
    // little lumps along the snow front edge
    ctx.beginPath();
    ctx.ellipse(-capW * 0.4, droop - capH * 0.42, 1.4 * scale, 1.0 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(capW * 0.2, droop - capH * 0.5, 1.6 * scale, 1.1 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ── full tile paint ──────────────────────────────────────────────────────────

function paint(ctx: CanvasRenderingContext2D, p: P, bob: number): void {
  ctx.save();
  try {
    paintPad(ctx, p);

    // the cluster: one tall front mushroom + two smaller behind.
    // base y stays on the pad; bob lifts the whole cluster subtly.
    const baseY = 18 + bob;
    // back-left small
    paintMushroom(ctx, p, -8.5, baseY - 1.5, 0.62, 0);
    // back-right small
    paintMushroom(ctx, p, 9.5, baseY - 0.5, 0.7, 0);
    // front tall (drawn last → on top)
    paintMushroom(ctx, p, 0.5, baseY + 0.5, 1.0, 0);

    // ambient seasonal light wash over everything (subtle, never a flash)
    if (p.lightAmt > 0.001) {
      const g = ctx.createRadialGradient(-8, -8, 2, 0, 0, 34);
      g.addColorStop(0, rgb(p.light, 0.16 * p.lightAmt));
      g.addColorStop(1, rgb(p.light, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-24, -24, 48, 48);
    }
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── season stills ────────────────────────────────────────────────────────────

const drawFor = (season: SeasonName) => (ctx: CanvasRenderingContext2D): void =>
  paint(ctx, SP[season], 0);

// ── idle: seamless breathing bob (bob(0)=0, zero velocity) + micro-motion ────

/** A*(1−cos(w t))*0.5 → value 0 and velocity 0 at t=0, smooth & seamless. */
function bobAt(t: number, amp: number, w: number): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

const animFor = (season: SeasonName) => (ctx: CanvasRenderingContext2D, t: number): void => {
  const bob = -bobAt(t, 0.9, 1.5); // gentle rise; subject bob 0 at t=0
  // base cluster with the breathing bob
  ctx.save();
  try {
    paintPad(ctx, SP[season]);
    const p = SP[season];
    const baseY = 18 + bob;
    paintMushroom(ctx, p, -8.5, baseY - 1.5, 0.62, 0);
    paintMushroom(ctx, p, 9.5, baseY - 0.5, 0.7, 0);
    // front mushroom carries the per-season sparkle micro-motion
    let sparkle = 0;
    if (season === "Spring") sparkle = 0.4 + 0.4 * (0.5 - 0.5 * Math.cos(t * 2.2)); // dew shimmer
    if (season === "Summer") sparkle = 0.5 * (0.5 - 0.5 * Math.cos(t * 1.8)); // soft sheen
    if (season === "Winter") sparkle = 0.45 * (0.5 - 0.5 * Math.cos(t * 1.4)); // cold sheen
    paintMushroom(ctx, p, 0.5, baseY + 0.5, 1.0, sparkle);

    // ── per-season additive overlays ──
    if (season === "Autumn") {
      // a fallen leaf stirs on the pad (small seamless rock)
      const rock = Math.sin(t * 1.2) * 0.25;
      ctx.save();
      ctx.globalAlpha = clamp01(p.fallenLeafAmt);
      ctx.translate(-12, 20);
      ctx.rotate(0.5 + rock);
      ctx.fillStyle = "rgb(196,120,40)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.4, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    if (season === "Winter") {
      // a couple of drifting snowflakes on seamless vertical loops
      const seeds: Array<[number, number, number]> = [
        [-7, 1.0, 0.0],
        [8, 0.8, 0.5],
      ];
      ctx.fillStyle = "#ffffff";
      seeds.forEach(([fx, r, phase]) => {
        const prog = ((t / 3.4 + phase) % 1 + 1) % 1;
        const fy = -18 + prog * 32;
        const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
        ctx.globalAlpha = 0.85 * Math.sin(prog * Math.PI); // fade in/out at ends
        ctx.beginPath();
        ctx.arc(dx, fy, r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    // ambient wash (same as paint)
    if (p.lightAmt > 0.001) {
      const g = ctx.createRadialGradient(-8, -8, 2, 0, 0, 34);
      g.addColorStop(0, rgb(p.light, 0.16 * p.lightAmt));
      g.addColorStop(1, rgb(p.light, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-24, -24, 48, 48);
    }
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

// ── forward transitions (smootherstep lerp of every field) ───────────────────

const springToSummer = (ctx: CanvasRenderingContext2D, pp: number): void =>
  paint(ctx, lerpP(SP.Spring, SP.Summer, smoother(clamp01(pp))), 0);

const summerToAutumn = (ctx: CanvasRenderingContext2D, pp: number): void =>
  paint(ctx, lerpP(SP.Summer, SP.Autumn, smoother(clamp01(pp))), 0);

const autumnToWinter = (ctx: CanvasRenderingContext2D, pp: number): void =>
  paint(ctx, lerpP(SP.Autumn, SP.Winter, smoother(clamp01(pp))), 0);

// ── exports ──────────────────────────────────────────────────────────────────

export const VARIANTS: SeasonalTileEntry = {
  Spring: { draw: drawFor("Spring"), anim: animFor("Spring") },
  Summer: { draw: drawFor("Summer"), anim: animFor("Summer") },
  Autumn: { draw: drawFor("Autumn"), anim: animFor("Autumn") },
  Winter: { draw: drawFor("Winter"), anim: animFor("Winter") },
};

export const TRANSITIONS: SeasonalTransitionSet = {
  0: springToSummer,
  1: summerToAutumn,
  2: autumnToWinter,
};
