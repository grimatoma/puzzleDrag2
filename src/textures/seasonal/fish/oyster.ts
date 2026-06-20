// Seasonal art for the OYSTER aquatic tile (`tile_fish_oyster`).
//
// A rough craggy grey oyster shell, open, with a pale lustrous pearl resting
// inside on the soft mantle — sitting on a still WATER pad (AQUATIC framing: the
// pad reads as a bluish reflective ellipse, not grass). The SAME open-shell +
// pearl silhouette is drawn every season; only colour and dressing (water tint,
// ice, frost, pad blossom / fallen leaf, light tint, gloss, pearl glint) change.
// This is enforced by a single parameterized `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
//
// Palette lock: the oyster shell stays craggy grey, the pearl stays pale and
// lustrous, all four seasons. Origin-centered in the −24..+24 design box, light
// from upper-left, flat cel-shaded with a soft dark outline. Pure Canvas-2D.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable params ─────────────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly. */
interface P {
  shellLight: RGB; // lit craggy ridge of the grey shell
  shellMid: RGB; // body tone of the shell
  shellDark: RGB; // shadowed shell underside / cupped interior rim
  mantle: RGB; // soft fleshy mantle the pearl rests on
  pearlLight: RGB; // lit face of the pale pearl
  pearlMid: RGB; // pearl body tone
  pearlDark: RGB; // pearl shadowed underside
  water: RGB; // top of the water pad (blue when liquid, pale when frozen)
  waterDark: RGB; // shaded water underside
  soil: RGB; // contact / base shimmer under the shell
  outline: RGB; // soft dark outline tint
  light: RGB; // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  waterSat: number; // 0..1 saturation/brightness of the liquid water (peak summer)
  pearlGloss: number; // 0..1 specular glint strength on the pearl
  frostAmt: number; // 0..1 cool frost dusting on the shell rim
  iceAmt: number; // 0..1 water frozen to pale blue-white ice (winter)
  padSnowAmt: number; // 0..1 frost sparkle on the frozen pad
  blossomAmt: number; // 0..1 tiny blossom petal on the pad (spring)
  fallenLeafAmt: number; // 0..1 floating fallen leaf on the pad (autumn)
}

// ── Local math helpers ───────────────────────────────────────────────────────

function clamp01(x: number): number {
  if (!(x >= 0)) return 0; // also catches NaN
  if (x > 1) return 1;
  return x;
}

const smoother = (x: number): number => x * x * x * (x * (6 * x - 15) + 10);

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

function lerpP(a: P, b: P, t: number): P {
  return {
    shellLight: lerpRGB(a.shellLight, b.shellLight, t),
    shellMid: lerpRGB(a.shellMid, b.shellMid, t),
    shellDark: lerpRGB(a.shellDark, b.shellDark, t),
    mantle: lerpRGB(a.mantle, b.mantle, t),
    pearlLight: lerpRGB(a.pearlLight, b.pearlLight, t),
    pearlMid: lerpRGB(a.pearlMid, b.pearlMid, t),
    pearlDark: lerpRGB(a.pearlDark, b.pearlDark, t),
    water: lerpRGB(a.water, b.water, t),
    waterDark: lerpRGB(a.waterDark, b.waterDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    waterSat: lerp(a.waterSat, b.waterSat, t),
    pearlGloss: lerp(a.pearlGloss, b.pearlGloss, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    iceAmt: lerp(a.iceAmt, b.iceAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
  };
}

function clampP(p: P): P {
  return {
    ...p,
    lightAmt: clamp01(p.lightAmt),
    waterSat: clamp01(p.waterSat),
    pearlGloss: clamp01(p.pearlGloss),
    frostAmt: clamp01(p.frostAmt),
    iceAmt: clamp01(p.iceAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────
//
// Palette LOCK: shell{Light,Mid,Dark} stay craggy grey and pearl{Light,Mid,Dark}
// stay pale across all four seasons. Only the WATER, light, and dressing change.

const SHELL_LIGHT: RGB = [196, 200, 206];
const SHELL_MID: RGB = [148, 152, 160];
const SHELL_DARK: RGB = [96, 100, 110];
const PEARL_LIGHT: RGB = [250, 248, 244];
const PEARL_MID: RGB = [226, 224, 222];
const PEARL_DARK: RGB = [184, 184, 190];

const SP: Record<SeasonName, P> = {
  // Spring — grey shell + pearl; fresh bright-blue water + a tiny blossom petal.
  Spring: {
    shellLight: SHELL_LIGHT,
    shellMid: SHELL_MID,
    shellDark: SHELL_DARK,
    mantle: [232, 206, 200],
    pearlLight: PEARL_LIGHT,
    pearlMid: PEARL_MID,
    pearlDark: PEARL_DARK,
    water: [120, 196, 224],
    waterDark: [72, 144, 184],
    soil: [96, 150, 168],
    outline: [52, 58, 66],
    light: [232, 244, 248],
    lightAmt: 0.16,
    waterSat: 0.7,
    pearlGloss: 0.6,
    frostAmt: 0,
    iceAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — grey shell; bright saturated blue water (PEAK); pearl glints
  // brightest; warm light.
  Summer: {
    shellLight: SHELL_LIGHT,
    shellMid: SHELL_MID,
    shellDark: SHELL_DARK,
    mantle: [236, 200, 196],
    pearlLight: PEARL_LIGHT,
    pearlMid: PEARL_MID,
    pearlDark: PEARL_DARK,
    water: [60, 168, 224],
    waterDark: [28, 110, 184],
    soil: [70, 140, 176],
    outline: [44, 52, 62],
    light: [255, 244, 214],
    lightAmt: 0.18,
    waterSat: 1.0,
    pearlGloss: 1.0,
    frostAmt: 0,
    iceAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — grey shell; duller olive-tinged water + a floating fallen leaf;
  // low amber light.
  Autumn: {
    shellLight: SHELL_LIGHT,
    shellMid: SHELL_MID,
    shellDark: SHELL_DARK,
    mantle: [220, 192, 184],
    pearlLight: [246, 242, 234],
    pearlMid: PEARL_MID,
    pearlDark: PEARL_DARK,
    water: [108, 150, 138],
    waterDark: [70, 104, 96],
    soil: [96, 116, 96],
    outline: [50, 50, 50],
    light: [248, 212, 156],
    lightAmt: 0.2,
    waterSat: 0.5,
    pearlGloss: 0.5,
    frostAmt: 0,
    iceAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — water FROZEN to pale blue-white ICE + frost sparkle; a little frost
  // on the shell rim; grey shell + pale pearl still clearly visible; cool light.
  Winter: {
    shellLight: SHELL_LIGHT,
    shellMid: [142, 148, 158],
    shellDark: [92, 98, 110],
    mantle: [214, 196, 198],
    pearlLight: PEARL_LIGHT,
    pearlMid: PEARL_MID,
    pearlDark: [186, 190, 198],
    water: [216, 232, 244],
    waterDark: [168, 192, 214],
    soil: [180, 200, 218],
    outline: [60, 64, 76],
    light: [212, 230, 252],
    lightAmt: 0.3,
    waterSat: 0.2,
    pearlGloss: 0.55,
    frostAmt: 0.7,
    iceAmt: 0.92,
    padSnowAmt: 0.85,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── The single parameterized paint ───────────────────────────────────────────

// Oyster geometry constants (the SAME silhouette every season). The open shell
// is a low cupped bottom valve resting on the water, hinged at the back-left,
// with the top valve lifted open behind it and the pearl nestled in the cup.
const SHELL_CX = 0; // shell centre x
const SHELL_CY = 8; // shell cup resting line on the pad
const SHELL_HALF = 15; // half-width of the bottom valve

/** Trace the cupped BOTTOM valve (the part resting on the water). */
function bottomValvePath(ctx: CanvasRenderingContext2D, bob: number): void {
  const cy = SHELL_CY + bob;
  const h = SHELL_HALF;
  ctx.beginPath();
  // craggy rim — a shallow open bowl with a few rough notches
  ctx.moveTo(-h, cy - 1);
  ctx.quadraticCurveTo(-h * 0.8, cy - 5, -h * 0.42, cy - 5.6);
  ctx.quadraticCurveTo(-h * 0.18, cy - 7, 0, cy - 6.6);
  ctx.quadraticCurveTo(h * 0.2, cy - 7, h * 0.44, cy - 5.6);
  ctx.quadraticCurveTo(h * 0.82, cy - 5, h, cy - 1);
  // underside of the cup, bulging down
  ctx.quadraticCurveTo(h * 0.9, cy + 6.5, h * 0.34, cy + 7.6);
  ctx.quadraticCurveTo(0, cy + 8.4, -h * 0.34, cy + 7.6);
  ctx.quadraticCurveTo(-h * 0.9, cy + 6.5, -h, cy - 1);
  ctx.closePath();
}

/** Trace the lifted-open TOP valve behind the cup. */
function topValvePath(ctx: CanvasRenderingContext2D, bob: number): void {
  const cy = SHELL_CY + bob;
  const h = SHELL_HALF;
  ctx.beginPath();
  // hinged low-left, swung up and back so it frames the pearl
  ctx.moveTo(-h + 1, cy - 2);
  ctx.quadraticCurveTo(-h - 1, cy - 13, -3, cy - 17.5);
  ctx.quadraticCurveTo(h * 0.55, cy - 18.5, h - 1, cy - 12);
  ctx.quadraticCurveTo(h + 1, cy - 7, h - 1, cy - 4);
  // inner edge (the rim facing the viewer / pearl)
  ctx.quadraticCurveTo(h * 0.4, cy - 8, 0, cy - 8.2);
  ctx.quadraticCurveTo(-h * 0.5, cy - 8, -h + 1, cy - 2);
  ctx.closePath();
}

/** A few craggy ridge strokes along a valve, driven by P (constant geometry). */
function craggyRidges(
  ctx: CanvasRenderingContext2D,
  cy: number,
  dark: RGB,
  light: RGB,
): void {
  ctx.strokeStyle = rgba(dark, 0.7);
  ctx.lineWidth = 1.3;
  for (let i = -3; i <= 3; i++) {
    const x0 = i * (SHELL_HALF * 0.26);
    ctx.beginPath();
    ctx.moveTo(x0, cy - 5.2);
    ctx.quadraticCurveTo(x0 * 1.05, cy + 1.5, x0 * 1.1, cy + 6.4);
    ctx.stroke();
  }
  // a couple of lit ridge crests catching the upper-left light
  ctx.strokeStyle = rgba(light, 0.55);
  ctx.lineWidth = 0.9;
  [-SHELL_HALF * 0.5, -SHELL_HALF * 0.08, SHELL_HALF * 0.42].forEach((x0) => {
    ctx.beginPath();
    ctx.moveTo(x0 - 0.6, cy - 4.6);
    ctx.quadraticCurveTo(x0 - 0.4, cy + 1, x0 - 0.2, cy + 5.4);
    ctx.stroke();
  });
}

/** The whole tile from ONLY `p` and `bob`. */
function paint(ctx: CanvasRenderingContext2D, raw: P, bob: number): void {
  const p = clampP(raw);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Pad: still WATER ellipse (AQUATIC), x∈[−18,+18], centre y≈+19 ────────
    // soft contact shadow lower-right
    ctx.fillStyle = rgba(p.waterDark, 0.4);
    ctx.beginPath();
    ctx.ellipse(3, 21.5, 16, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // shaded water underside
    ctx.fillStyle = rgb(p.waterDark);
    ctx.beginPath();
    ctx.ellipse(0, 20.4, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // water surface — brighter/bluer with waterSat
    const surf = lerpRGB(p.waterDark, p.water, 0.4 + 0.6 * p.waterSat);
    ctx.fillStyle = rgb(surf);
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // bright top sheen on the water (liquid only — fades as it freezes)
    ctx.fillStyle = rgba([255, 255, 255], 0.16 * (1 - p.iceAmt) * (0.4 + 0.6 * p.waterSat));
    ctx.beginPath();
    ctx.ellipse(-4, 17.6, 11, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // reflective ripple lines on the liquid water
    if (p.iceAmt < 0.5) {
      ctx.strokeStyle = rgba([255, 255, 255], 0.22 * (1 - p.iceAmt));
      ctx.lineWidth = 0.9;
      [-2.6, 0.4, -1].forEach((ry, i) => {
        ctx.beginPath();
        ctx.moveTo(-12 + i * 2, 18.6 + ry);
        ctx.quadraticCurveTo(0, 17.4 + ry, 12 - i * 2, 18.6 + ry);
        ctx.stroke();
      });
    }

    // frozen ICE sheet (winter) — pale blue-white over the water, cracks + glint
    if (p.iceAmt > 0.02) {
      const a = p.iceAmt;
      ctx.fillStyle = rgba([232, 244, 252], 0.85 * a);
      ctx.beginPath();
      ctx.ellipse(0, 18.8, 17.6, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([200, 222, 240], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(2, 20, 16, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // ice cracks
      ctx.strokeStyle = rgba([170, 198, 224], 0.7 * a);
      ctx.lineWidth = 0.8;
      [[-10, 18, -4, 20.5], [3, 17.5, 9, 20], [-2, 21, 4, 18.5]].forEach(([x0, y0, x1, y1]) => {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      });
    }

    // frost sparkle on the frozen pad (winter)
    if (p.padSnowAmt > 0.01) {
      ctx.fillStyle = rgba([255, 255, 255], 0.85 * p.padSnowAmt);
      [[-9, 17.6], [5, 19], [11, 17.8], [-3, 20.2], [8, 20.4]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // blossom petal on the pad (spring) — a tiny pale petal floating on water
    if (p.blossomAmt > 0.01) {
      const a = p.blossomAmt;
      const spots: Array<[number, number]> = [[-13, 18.6], [12, 18]];
      spots.forEach(([bx, by], idx) => {
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(idx === 0 ? -0.4 : 0.5);
        ctx.fillStyle = rgba(idx === 0 ? [255, 232, 246] : [255, 248, 252], 0.95 * a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.4, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba([255, 214, 90], 0.85 * a);
        ctx.beginPath();
        ctx.arc(-0.6, 0, 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // floating fallen leaf on the pad (autumn)
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const leaves: Array<[number, number, number, RGB]> = [
        [-12, 19.4, -0.5, [196, 120, 40]],
        [12, 18.8, 0.7, [176, 72, 32]],
      ];
      leaves.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgba(col, a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.2, 1.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba([90, 44, 16], a);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.lineTo(3, 0);
        ctx.stroke();
        ctx.restore();
      });
    }

    // ── Contact shadow of the shell on the water ────────────────────────────
    ctx.fillStyle = rgba(p.outline, 0.26);
    ctx.beginPath();
    ctx.ellipse(2.5, SHELL_CY + bob + 8.5, 13, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // faint specular soil/sand shimmer right at the shell base
    ctx.fillStyle = rgba(p.soil, 0.45);
    ctx.beginPath();
    ctx.ellipse(0, SHELL_CY + bob + 7.5, 10, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    const cy = SHELL_CY + bob;

    // ── Subject: open oyster (SAME silhouette every season) ─────────────────

    // 1) TOP valve outline + fill (drawn first, behind the cup)
    topValvePath(ctx, bob);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();
    ctx.save();
    topValvePath(ctx, bob);
    ctx.clip();
    // lit grey gradient on the lifted top valve
    const topGrad = ctx.createLinearGradient(-SHELL_HALF, cy - 18, SHELL_HALF, cy - 2);
    topGrad.addColorStop(0, rgb(p.shellLight));
    topGrad.addColorStop(0.5, rgb(p.shellMid));
    topGrad.addColorStop(1, rgb(p.shellDark));
    ctx.fillStyle = topGrad;
    ctx.fillRect(-SHELL_HALF - 3, cy - 20, (SHELL_HALF + 3) * 2, 22);
    // craggy radial ridges fanning from the hinge
    ctx.strokeStyle = rgba(p.shellDark, 0.6);
    ctx.lineWidth = 1.1;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-SHELL_HALF + 1, cy - 2);
      ctx.quadraticCurveTo(i * 3, cy - 12, i * 4.5, cy - 16.5);
      ctx.stroke();
    }
    // shaded inner rim of the top valve (the cupped concave facing us)
    ctx.fillStyle = rgba(p.shellDark, 0.5);
    ctx.beginPath();
    ctx.ellipse(0, cy - 8.5, SHELL_HALF * 0.7, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2) MANTLE + PEARL nestled in the cup (between the valves)
    // soft fleshy mantle pad the pearl sits on
    ctx.fillStyle = rgb(p.mantle);
    ctx.beginPath();
    ctx.ellipse(0, cy - 1.5, SHELL_HALF * 0.72, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.shellDark, 0.3);
    ctx.beginPath();
    ctx.ellipse(0, cy + 0.4, SHELL_HALF * 0.72, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // the pearl — pale lustrous sphere resting on the mantle
    const pearlX = 0.5;
    const pearlY = cy - 2.6;
    const pearlR = 4.6;
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.arc(pearlX, pearlY, pearlR + 0.7, 0, Math.PI * 2);
    ctx.fill();
    const pGrad = ctx.createRadialGradient(
      pearlX - 1.8, pearlY - 1.8, 0.5,
      pearlX, pearlY, pearlR,
    );
    pGrad.addColorStop(0, rgb(p.pearlLight));
    pGrad.addColorStop(0.55, rgb(p.pearlMid));
    pGrad.addColorStop(1, rgb(p.pearlDark));
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.arc(pearlX, pearlY, pearlR, 0, Math.PI * 2);
    ctx.fill();
    // soft pearl specular highlight (strength from pearlGloss; constant, subtle)
    if (p.pearlGloss > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.3 + 0.45 * p.pearlGloss);
      ctx.beginPath();
      ctx.ellipse(pearlX - 1.6, pearlY - 1.8, 1.2, 1.5, -0.4, 0, Math.PI * 2);
      ctx.fill();
      // faint lower lustre rim
      ctx.fillStyle = rgba([244, 240, 250], 0.3 * p.pearlGloss);
      ctx.beginPath();
      ctx.arc(pearlX + 1.4, pearlY + 2, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3) BOTTOM valve (the cup) — drawn over so its near rim overlaps the pearl
    bottomValvePath(ctx, bob);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();
    ctx.save();
    bottomValvePath(ctx, bob);
    ctx.clip();
    // grey cup body
    ctx.fillStyle = rgb(p.shellMid);
    ctx.fillRect(-SHELL_HALF - 3, cy - 8, (SHELL_HALF + 3) * 2, 18);
    // lit upper-left, shaded lower-right
    const cupGrad = ctx.createLinearGradient(-SHELL_HALF, cy - 6, SHELL_HALF, cy + 8);
    cupGrad.addColorStop(0, rgb(p.shellLight));
    cupGrad.addColorStop(0.5, rgb(p.shellMid));
    cupGrad.addColorStop(1, rgb(p.shellDark));
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.ellipse(-1.5, cy + 1.5, SHELL_HALF + 1, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // dark concave interior just inside the near rim (so the cup reads open)
    ctx.fillStyle = rgba(p.shellDark, 0.55);
    ctx.beginPath();
    ctx.ellipse(0, cy - 4.4, SHELL_HALF * 0.78, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    craggyRidges(ctx, cy, p.shellDark, p.shellLight);
    ctx.restore();

    // 4) frost dusting on the shell RIM (winter) — cool speckle on upward edges
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([222, 238, 250], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-SHELL_HALF * 0.8, cy - 4], [-SHELL_HALF * 0.3, cy - 5.4],
        [SHELL_HALF * 0.3, cy - 5.2], [SHELL_HALF * 0.78, cy - 4],
        [-4, cy - 16], [4, cy - 16.5], [0, cy - 17],
        [-SHELL_HALF * 0.9, cy - 11], [SHELL_HALF * 0.9, cy - 11],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
      // a thin frost line along the open rim
      ctx.strokeStyle = rgba([236, 248, 255], 0.5 * p.frostAmt);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-SHELL_HALF * 0.78, cy - 5.4);
      ctx.quadraticCurveTo(0, cy - 7.4, SHELL_HALF * 0.78, cy - 5.4);
      ctx.stroke();
    }

    // ── Ambient light wash over the whole tile (per-season tint) ────────────
    if (p.lightAmt > 0.001) {
      ctx.globalAlpha = 1;
      const lg = ctx.createRadialGradient(-10, -14, 2, -10, -14, 46);
      lg.addColorStop(0, rgba(p.light, p.lightAmt));
      lg.addColorStop(1, rgba(p.light, p.lightAmt * 0.25));
      ctx.fillStyle = lg;
      ctx.fillRect(-24, -24, 48, 48);
    }
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── Idle bob (seamless, zero-velocity at t=0) ────────────────────────────────

// A*(1-cos(w t))*0.5 → 0 at t=0 with zero velocity; period 2π/w.
function bobAt(t: number, amp = 0.7, w = 1.4): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

/** A gentle water-ripple shimmer drawn on the pad surface (additive dressing,
 *  not the subject). Seamless via sin of t. */
function rippleShimmer(ctx: CanvasRenderingContext2D, t: number, iceAmt: number): void {
  const live = 1 - iceAmt;
  if (live <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = `rgba(255,255,255,${0.12 + 0.12 * (0.5 + 0.5 * Math.sin(t * 1.6)) * live})`;
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    const ph = t * 1.3 + i * 1.4;
    const yo = -1.5 + i * 1.6 + Math.sin(ph) * 0.6;
    ctx.beginPath();
    ctx.moveTo(-12, 18.6 + yo);
    ctx.quadraticCurveTo(Math.sin(ph) * 2, 17.6 + yo, 12, 18.6 + yo);
    ctx.stroke();
  }
  ctx.restore();
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    const p = clampP(SP[season]);
    // The shell breathes a hair via bob (0 at t=0). Ripple + glint are additive.
    paint(ctx, SP[season], bob);

    ctx.save();
    try {
      ctx.globalAlpha = 1;
      // shared: gentle water-ripple shimmer on the pad every season (none on ice)
      rippleShimmer(ctx, t, p.iceAmt);

      const cy = SHELL_CY + bob;
      const pearlX = 0.5;
      const pearlY = cy - 2.6;

      if (season === "Spring") {
        // soft slow pearl glint + a dew shimmer near the shell
        const g = 0.2 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.4));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        ctx.beginPath();
        ctx.ellipse(pearlX - 1.6, pearlY - 1.8, 0.9 + g * 0.7, 1.1 + g * 0.7, -0.4, 0, Math.PI * 2);
        ctx.fill();
        // dew sparkle drifting on the shell rim
        const dy = cy - 5 + Math.sin(t * 1.1) * 0.8;
        ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.25 * (0.5 + 0.5 * Math.sin(t * 2.0))})`;
        ctx.beginPath();
        ctx.arc(-5, dy, 0.9, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // pearl glint TRAVELS across the pearl (brightest), seamless via fract
        const prog = (t * 0.5) % 1;
        const ang = prog * Math.PI * 2;
        const gx = pearlX + Math.cos(ang) * 1.7;
        const gy = pearlY + Math.sin(ang) * 1.7;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.ellipse(gx, gy, 1.1, 1.3, ang, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.beginPath();
        ctx.arc(pearlX - 1.4, pearlY - 1.6, 1.0, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // floating leaf drifts gently across the pad (seamless)
        const drift = Math.sin(t * 0.7) * 4;
        const rot = -0.5 + Math.sin(t * 0.7) * 0.3;
        ctx.save();
        ctx.translate(-12 + drift, 19.4 + Math.cos(t * 0.7) * 0.6);
        ctx.rotate(rot);
        ctx.fillStyle = "rgba(196,120,40,0.9)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.2, 1.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(90,44,16,0.9)";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.lineTo(3, 0);
        ctx.stroke();
        ctx.restore();
        // soft slow pearl glint
        const g = 0.18 + 0.2 * (0.5 + 0.5 * Math.sin(t * 1.0));
        ctx.fillStyle = `rgba(255,248,235,${g})`;
        ctx.beginPath();
        ctx.arc(pearlX - 1.4, pearlY - 1.6, 1.0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Winter — cold sheen on the ice + a drifting snowflake; pearl glint soft
        ctx.globalAlpha = 0.12 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.8));
        ctx.fillStyle = "rgba(214,234,255,1)";
        ctx.beginPath();
        ctx.ellipse(-3, 18.6, 9, 2.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // a single drifting snowflake
        const prog = ((t / 3.2) % 1 + 1) % 1;
        const fy = -20 + prog * 36;
        const fx = -4 + Math.sin(prog * Math.PI * 2) * 4;
        ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(fx, fy, 1.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // soft slow pearl glint (subtle, no flash)
        const g = 0.18 + 0.2 * (0.5 + 0.5 * Math.sin(t * 1.0));
        ctx.fillStyle = `rgba(245,248,255,${g})`;
        ctx.beginPath();
        ctx.arc(pearlX - 1.5, pearlY - 1.7, 1.0, 0, Math.PI * 2);
        ctx.fill();
      }
    } finally {
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  };
}

// ── Forward season→season transitions ────────────────────────────────────────

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

// ── Exports ──────────────────────────────────────────────────────────────────

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
