// Seasonal art for the GRASS tile (`tile_grass_grass`).
//
// One dense raised TUFT of upright grass blades fanning symmetrically from the
// pad centre — taller and denser than the pad's own grass top, ~55% of tile
// width, many slender blades. The SAME tuft silhouette (the SAME set of blade
// curves) is drawn every season — only colour and the small dressing amounts
// (frost, snow blanket among the blades, snow caps at the base, pad blossoms /
// fallen leaves / pad snow, light tint) change. This is enforced by a single
// parameterized `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion (breeze sway) + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
//
// PALETTE LOCK: it stays a GREEN grass tuft all year (lime→deep-green→
// golden-tipped→green-grey under snow); ripeness/age is colour only, never an
// identity change.
//
// Origin-centered in the −24..+24 design box, light from upper-left, flat
// cel-shaded with a soft dark outline. Pure Canvas-2D vector drawing.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable params ─────────────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly. */
interface P {
  bladeLight: RGB;   // lit edge of a blade
  bladeMid: RGB;     // body green of a blade
  bladeDark: RGB;    // shadowed base / back blades
  tipTint: RGB;      // tint blended into the blade TIPS (autumn gold etc.)
  padGrass: RGB;     // top of the grass pad
  padDark: RGB;      // shaded pad underside
  soil: RGB;         // contact / base soil under the tuft
  outline: RGB;      // soft dark outline tint
  light: RGB;        // ambient light tint laid over the whole tile
  lightAmt: number;  // 0..1 strength of the ambient light wash
  lushness: number;  // 0..1 (reserved colour cue; higher = greener/fuller read)
  tipAmt: number;    // 0..1 how strongly `tipTint` shows on the blade tips
  bentAmt: number;   // 0..1 a couple of blades bent over (autumn)
  frostAmt: number;  // 0..1 cool frost dusting on the blade tips (winter)
  snowCapAmt: number;// 0..1 snow caps clinging at the tuft base (winter)
  snowBlanketAmt: number; // 0..1 snow nestled AMONG the blades (winter)
  padSnowAmt: number;// 0..1 snow blanket on the pad (winter)
  blossomAmt: number;// 0..1 tiny blossoms on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad (autumn)
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
    bladeLight: lerpRGB(a.bladeLight, b.bladeLight, t),
    bladeMid: lerpRGB(a.bladeMid, b.bladeMid, t),
    bladeDark: lerpRGB(a.bladeDark, b.bladeDark, t),
    tipTint: lerpRGB(a.tipTint, b.tipTint, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    lushness: lerp(a.lushness, b.lushness, t),
    tipAmt: lerp(a.tipAmt, b.tipAmt, t),
    bentAmt: lerp(a.bentAmt, b.bentAmt, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
    snowBlanketAmt: lerp(a.snowBlanketAmt, b.snowBlanketAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
  };
}

function clampP(p: P): P {
  return {
    ...p,
    lightAmt: clamp01(p.lightAmt),
    lushness: clamp01(p.lushness),
    tipAmt: clamp01(p.tipAmt),
    bentAmt: clamp01(p.bentAmt),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    snowBlanketAmt: clamp01(p.snowBlanketAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — fresh lime-green new blades, dewy. Lime dewy pad + blossom.
  Spring: {
    bladeLight: [186, 232, 110],
    bladeMid: [126, 200, 76],
    bladeDark: [70, 138, 50],
    tipTint: [210, 244, 140],
    padGrass: [134, 210, 90],
    padDark: [74, 142, 60],
    soil: [120, 84, 48],
    outline: [40, 70, 32],
    light: [232, 246, 224],
    lightAmt: 0.16,
    lushness: 0.55,
    tipAmt: 0.3,
    bentAmt: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    snowBlanketAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — lush deep-green blades (PEAK). Mid-green pad, warm light.
  Summer: {
    bladeLight: [150, 214, 78],
    bladeMid: [70, 162, 56],
    bladeDark: [34, 104, 42],
    tipTint: [168, 224, 96],
    padGrass: [86, 172, 72],
    padDark: [42, 112, 50],
    soil: [126, 86, 48],
    outline: [24, 70, 30],
    light: [255, 242, 206],
    lightAmt: 0.18,
    lushness: 1.0,
    tipAmt: 0.2,
    bentAmt: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    snowBlanketAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — golden-brown blade tips, a few blades bent. Olive-tan pad, leaves.
  Autumn: {
    bladeLight: [180, 192, 90],
    bladeMid: [120, 146, 60],
    bladeDark: [80, 96, 44],
    tipTint: [216, 170, 64], // golden-brown tips
    padGrass: [156, 152, 88],
    padDark: [108, 98, 54],
    soil: [120, 80, 44],
    outline: [62, 56, 26],
    light: [248, 212, 150],
    lightAmt: 0.2,
    lushness: 0.5,
    tipAmt: 0.85,
    bentAmt: 0.8,
    frostAmt: 0,
    snowCapAmt: 0,
    snowBlanketAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — blades poke up through a snow blanket; frost on tips, snow caps at
  // the base; blades still green-grey visible; cool light.
  Winter: {
    bladeLight: [148, 178, 142],
    bladeMid: [94, 134, 102],
    bladeDark: [60, 96, 78],
    tipTint: [206, 224, 224],
    padGrass: [180, 198, 216],
    padDark: [122, 148, 174],
    soil: [128, 110, 96],
    outline: [50, 66, 70],
    light: [206, 226, 252],
    lightAmt: 0.3,
    lushness: 0.4,
    tipAmt: 0.4,
    bentAmt: 0.15,
    frostAmt: 0.75,
    snowCapAmt: 0.85,
    snowBlanketAmt: 0.8,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Tuft geometry (the SAME silhouette every season) ─────────────────────────
//
// Blades fan symmetrically from the pad centre near y=+17. Each blade is a
// curved spear: a base x, a tip x/y, a sway-pivot factor, a width and a depth
// flag (back blades are darker, front blades lighter). ~55% of tile width =>
// outer tips reach roughly ±13. Many slender blades for density.

const TUFT_BASE_Y = 17;

interface Blade {
  baseX: number;  // contact x at the tuft base
  tipX: number;   // resting tip x
  tipY: number;   // resting tip y (negative = up)
  ctrl: number;   // horizontal control-point bias (curvature)
  width: number;  // stroke width of the blade body
  back: boolean;  // back row (darker, drawn first)
}

// Symmetric fan: pairs mirrored about centre, plus a couple of central blades.
// Tallest in the middle, shorter and more splayed at the edges.
const BLADES: Blade[] = [
  // back row (darker, drawn first for depth)
  { baseX: -2.0, tipX: -10.5, tipY: -12, ctrl: -5, width: 2.4, back: true },
  { baseX: 2.0, tipX: 10.5, tipY: -12, ctrl: 5, width: 2.4, back: true },
  { baseX: -1.0, tipX: -5.5, tipY: -20, ctrl: -2.5, width: 2.6, back: true },
  { baseX: 1.0, tipX: 5.5, tipY: -20, ctrl: 2.5, width: 2.6, back: true },
  { baseX: 0.0, tipX: 0.5, tipY: -23, ctrl: 0, width: 2.8, back: true },
  // front row (brighter, drawn over)
  { baseX: -3.0, tipX: -13, tipY: -7, ctrl: -8, width: 2.2, back: false },
  { baseX: 3.0, tipX: 13, tipY: -7, ctrl: 8, width: 2.2, back: false },
  { baseX: -2.2, tipX: -8.5, tipY: -15, ctrl: -5.5, width: 2.4, back: false },
  { baseX: 2.2, tipX: 8.5, tipY: -15, ctrl: 5.5, width: 2.4, back: false },
  { baseX: -1.2, tipX: -3, tipY: -21, ctrl: -2, width: 2.5, back: false },
  { baseX: 1.2, tipX: 3, tipY: -21, ctrl: 2, width: 2.5, back: false },
  { baseX: -0.4, tipX: -1.5, tipY: -24, ctrl: -1, width: 2.6, back: false },
];

/** Sway offset applied to a blade's tip & control point. `bend` is the global
 *  breeze amount in design-px (0 = rest); outer/taller blades move most. */
function bladeSway(b: Blade, bend: number, phase: number): number {
  // tips that are higher (more negative tipY) and further out sway more
  const reach = (Math.abs(b.tipX) / 13) * 0.6 + (-b.tipY / 24) * 0.4;
  return bend * reach * Math.sin(phase + Math.abs(b.baseX) * 0.5);
}

// ── The single parameterized paint ───────────────────────────────────────────

/** The whole tile from ONLY `p`, `bob`, and a breeze `bend`/`phase`. */
function paint(
  ctx: CanvasRenderingContext2D,
  raw: P,
  bob: number,
  bend = 0,
  phase = 0,
): void {
  const p = clampP(raw);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Pad: low flat grass ellipse, x∈[−18,+18], centre y≈+19 ──────────────
    // soft contact shadow lower-right
    ctx.fillStyle = rgba(p.padDark, 0.4);
    ctx.beginPath();
    ctx.ellipse(3, 21.5, 16, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // shaded underside
    ctx.fillStyle = rgb(p.padDark);
    ctx.beginPath();
    ctx.ellipse(0, 20.4, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // grass top
    ctx.fillStyle = rgb(p.padGrass);
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // tufted top edge — little blades around the upper rim (the pad's OWN grass,
    // shorter than the hero tuft)
    ctx.strokeStyle = rgb(p.padDark);
    ctx.lineWidth = 1.1;
    for (let i = -7; i <= 7; i++) {
      const tx = i * 2.4;
      const ty = 19 - Math.sqrt(Math.max(0, 1 - (tx / 18) ** 2)) * 5.2;
      ctx.beginPath();
      ctx.moveTo(tx, ty + 0.4);
      ctx.lineTo(tx - 0.8, ty - 2.2);
      ctx.stroke();
    }
    // grass-top highlight glints
    ctx.strokeStyle = rgba([255, 255, 255], 0.16);
    ctx.lineWidth = 1;
    for (let i = -5; i <= 5; i += 2) {
      const tx = i * 2.6 - 2;
      ctx.beginPath();
      ctx.moveTo(tx, 18.4);
      ctx.lineTo(tx - 0.6, 16.6);
      ctx.stroke();
    }

    // pad snow blanket (winter)
    if (p.padSnowAmt > 0.01) {
      ctx.fillStyle = rgba([244, 250, 255], 0.92 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(0, 18.4, 17.4 * (0.6 + 0.4 * p.padSnowAmt), 4.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([210, 226, 244], 0.5 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(2, 20, 16, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // sparkle on the snow
      ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.padSnowAmt);
      [[-9, 17.6], [5, 19], [11, 17.4], [-3, 20]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // blossoms on the pad (spring)
    if (p.blossomAmt > 0.01) {
      const a = p.blossomAmt;
      const spots: Array<[number, number]> = [[-13, 18.5], [12, 17.8], [-4, 21]];
      spots.forEach(([bx, by], idx) => {
        ctx.fillStyle = rgba(idx === 1 ? [255, 232, 246] : [255, 250, 252], 0.95 * a);
        for (let k = 0; k < 5; k++) {
          const ang = (k / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(bx + Math.cos(ang) * 1.5, by + Math.sin(ang) * 1.0, 1.1, 0.8, ang, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = rgba([255, 214, 90], a);
        ctx.beginPath();
        ctx.arc(bx, by, 0.9, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // fallen leaves on the pad (autumn)
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const leaves: Array<[number, number, number, RGB]> = [
        [-12, 19.6, -0.5, [196, 120, 40]],
        [12, 18.6, 0.7, [176, 72, 32]],
      ];
      leaves.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgba(col, a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.2, 1.8, 0, 0, Math.PI * 2);
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

    // ── Soil / contact patch directly under the tuft base ───────────────────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, TUFT_BASE_Y + 2, 8, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // contact shadow of the tuft on the pad
    ctx.fillStyle = rgba(p.outline, 0.26);
    ctx.beginPath();
    ctx.ellipse(2.5, TUFT_BASE_Y + 2.4, 10, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the grass tuft (SAME silhouette every season) ──────────────
    // Each blade is drawn as: a fat dark-outline stroke, then the body stroke
    // (back blades darker, front blades brighter), then a tip tint. A couple of
    // blades bend over in autumn (bentAmt).
    const drawBlade = (b: Blade, idx: number): void => {
      const sway = bladeSway(b, bend, phase);
      // bend: pull a few of the OUTER front blades over to the right.
      const bendOver = p.bentAmt * (b.back ? 0 : (idx % 3 === 0 ? 1 : 0));
      const baseX = b.baseX;
      const baseY = TUFT_BASE_Y + bob;
      const tipX = b.tipX + sway + bendOver * (b.tipX > 0 ? 7 : -1.5);
      const tipY = b.tipY + bob + bendOver * 9; // bent blades droop downward
      const cx = (b.baseX + b.ctrl) + sway * 0.6 + bendOver * 3;
      const cy = lerp(baseY, tipY, 0.5) - 2;

      // 1) soft dark outline pass
      ctx.strokeStyle = rgb(p.outline);
      ctx.lineWidth = b.width + 1.6;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(cx, cy, tipX, tipY);
      ctx.stroke();

      // 2) body green
      ctx.strokeStyle = rgb(b.back ? p.bladeDark : p.bladeMid);
      ctx.lineWidth = b.width;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(cx, cy, tipX, tipY);
      ctx.stroke();

      // 3) lit edge highlight on front blades (upper-left light)
      if (!b.back) {
        ctx.strokeStyle = rgba(p.bladeLight, 0.8);
        ctx.lineWidth = Math.max(0.7, b.width - 1.4);
        ctx.beginPath();
        ctx.moveTo(baseX - 0.3, baseY - 1);
        ctx.quadraticCurveTo(cx - 0.6, cy, tipX - 0.4, tipY);
        ctx.stroke();
      }

      // 4) tip tint (autumn golden tips / spring fresh tips / winter frost)
      if (p.tipAmt > 0.02) {
        ctx.strokeStyle = rgba(p.tipTint, 0.9 * p.tipAmt);
        ctx.lineWidth = b.width;
        const ttX = lerp(cx, tipX, 0.55);
        const ttY = lerp(cy, tipY, 0.55);
        ctx.beginPath();
        ctx.moveTo(ttX, ttY);
        ctx.quadraticCurveTo(lerp(ttX, tipX, 0.5), lerp(ttY, tipY, 0.5), tipX, tipY);
        ctx.stroke();
      }

      // frost sparkle clinging to the tip (winter)
      if (p.frostAmt > 0.02) {
        ctx.fillStyle = rgba([236, 248, 255], 0.85 * p.frostAmt);
        ctx.beginPath();
        ctx.arc(tipX, tipY, 0.8 + 0.4 * p.frostAmt, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // back row first, then front row, for depth
    BLADES.forEach((b, i) => {
      if (b.back) drawBlade(b, i);
    });
    BLADES.forEach((b, i) => {
      if (!b.back) drawBlade(b, i);
    });

    // ── Snow nestled AMONG the blades + snow caps at the base (winter) ───────
    // Drawn AFTER the blades so it reads as snow lying between green-grey blades
    // that still poke up clearly.
    if (p.snowBlanketAmt > 0.02) {
      const a = p.snowBlanketAmt;
      const by = TUFT_BASE_Y + bob;
      // a soft mound of snow at the base of the tuft, between the blades
      ctx.fillStyle = rgba([244, 250, 255], 0.9 * a);
      ctx.beginPath();
      ctx.moveTo(-9, by + 1);
      ctx.quadraticCurveTo(-7, by - 5, -3, by - 4.5);
      ctx.quadraticCurveTo(0, by - 6.5, 3, by - 4.5);
      ctx.quadraticCurveTo(7, by - 5, 9, by + 1);
      ctx.quadraticCurveTo(0, by + 3, -9, by + 1);
      ctx.closePath();
      ctx.fill();
      // bluish underside of the snow mound
      ctx.fillStyle = rgba([206, 224, 244], 0.55 * a);
      ctx.beginPath();
      ctx.ellipse(0, by + 0.5, 8, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // little snow clumps caught higher up between the blades
      ctx.fillStyle = rgba([248, 252, 255], 0.85 * a);
      [[-4.5, -3], [4, -5], [-1, -8], [2.5, -1]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.ellipse(sx, by + sy, 1.8, 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    if (p.snowCapAmt > 0.02) {
      // bright snow caps clinging at the very base of the tuft
      ctx.fillStyle = rgba([252, 254, 255], 0.95 * p.snowCapAmt);
      const by = TUFT_BASE_Y + bob;
      ctx.beginPath();
      ctx.ellipse(0, by + 0.5, 9 * (0.6 + 0.4 * p.snowCapAmt), 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
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

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    // Gentle breeze that sways the blade TIPS most (seamless, period 2π/1.5).
    // Breeze is 0 at t=0 (zero velocity) so the idle hands off cleanly from the
    // rest pose; autumn's bent blades flutter via the same breeze.
    const bendBase =
      season === "Summer" ? 1.7 :
      season === "Winter" ? 1.2 :
      season === "Autumn" ? 1.5 : 1.9; // spring breeziest
    const bend = bendBase * (1 - Math.cos(t * 1.5)) * 0.5 + bendBase * 0.35 * Math.sin(t * 0.9);
    const phase = t * 1.5;
    paint(ctx, SP[season], bob, bend, phase);

    ctx.save();
    try {
      ctx.globalAlpha = 1;
      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint resting on a low blade
        const g = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        const gy = -4 + bob + Math.sin(t * 1.1) * 1.4;
        ctx.beginPath();
        ctx.arc(-3, gy, 1.0 + g * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // soft shimmer travelling up a blade (seamless via fract)
        const prog = (t * 0.5) % 1;
        const gy = lerp(15 + bob, -18 + bob, prog);
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.beginPath();
        ctx.ellipse(-4 + prog * 3, gy, 1.2, 2.4, -0.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // faint warm sheen pulsing over the golden tips (the bent-blade flutter
        // itself is carried by the breeze above)
        const s = 0.1 + 0.14 * (0.5 + 0.5 * Math.sin(t * 0.9));
        ctx.fillStyle = `rgba(255,230,170,${s})`;
        ctx.beginPath();
        ctx.ellipse(2, -12 + bob, 6, 4.5, -0.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Winter — drifting snowflakes + a cold sheen
        const seeds: Array<[number, number, number]> = [
          [-9, 0.0, 1.0], [6, 0.4, 0.9], [11, 0.7, 0.8], [-2, 0.25, 0.9],
        ];
        ctx.fillStyle = "#ffffff";
        seeds.forEach(([fx, phaseF, r]) => {
          const prog = ((t / 3.0 + phaseF) % 1 + 1) % 1;
          const fy = -22 + prog * 38;
          const dx = fx + Math.sin(prog * Math.PI * 2 + phaseF * 6) * 3;
          ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.arc(dx, fy, r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 0.1 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.8));
        ctx.fillStyle = "rgba(210,232,255,1)";
        ctx.beginPath();
        ctx.ellipse(-3, -2 + bob, 7, 5, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
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
