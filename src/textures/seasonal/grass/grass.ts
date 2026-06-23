// Production seasonal art for the GRASS tile (`tile_grass_grass`).
//
// One dense raised TUFT of upright grass blades fanning symmetrically from a
// small pad. The SAME tuft silhouette (the SAME set of blade curves) is drawn
// every season (identity-safe) — only colour + a real seasonal prop (blossoms /
// fallen leaf / frost + snow blanket + snow caps) and the light tint change. The
// idle is lively rather than subtle:
//
//   IDLE COMMON  (~6s, win ~0.95s): a WIND WAVE — the blades bend ~12–16 design-px
//       in a traveling-wave sway, each blade phase-offset so the gust ripples
//       across the tuft; pivot at the base, tips travel most, small base squash.
//       Zero with zero velocity at the window edges (seamless).
//   IDLE SPECIAL (~18s, win ~1.2s, phase +3s): a CRITTER PEEKS — a tiny critter
//       (a little mouse-ish head) pops up from within the tuft, looks left then
//       right, then ducks back down. Off-screen / zero at the window edges.
//
// The architecture is a single parameterized `paint(ctx, p, pose)` where
// `interface P` holds tweenable season params (colours + prop amounts) and
// `pose` holds the idle gesture (bob / lean / squash + wind & critter fields).
// Because every season is the same paint with tweened P, transitions are
// seamless:  transition(0) ≡ draw(from),  transition(1) ≡ draw(to).
// REST pose has all zeros, so draw(season) = paint(ctx, SP[season], REST) and the
// idle's pose is 0 at every action-window edge → seamless loop.
//
// Origin-centered in the −24..+24 design box (actions may paint outside it),
// light from upper-left, flat cel-shaded with a soft dark outline. Pure
// Canvas-2D vector drawing — never throws, clamps everything, save/restore.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable season params ──────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — paint is a
 *  pure function of these so transitions interpolate cleanly. */
interface P {
  bladeLight: RGB;        // lit edge of a blade
  bladeMid: RGB;          // body green of a blade
  bladeDark: RGB;         // shadowed base / back blades
  tipTint: RGB;           // tint blended into the blade TIPS (autumn gold etc.)
  padGrass: RGB;          // top of the grass pad
  padDark: RGB;           // shaded pad underside
  soil: RGB;              // contact / base soil under the tuft
  outline: RGB;           // soft dark outline tint
  light: RGB;             // ambient light tint laid over the whole tile
  lightAmt: number;       // 0..1 strength of the ambient light wash
  lushness: number;       // 0..1 fullness read (peak in summer; thins blades when low)
  tipAmt: number;         // 0..1 how strongly `tipTint` shows on the blade tips
  gloss: number;          // 0..1 specular sheen on the blades
  dryness: number;        // 0..1 dry/gone-to-seed read (seed heads on the tips, autumn)
  frostAmt: number;       // 0..1 cool frost dusting on the blade tips (winter)
  snowCapAmt: number;     // 0..1 snow caps clinging at the tuft base (winter)
  snowBlanketAmt: number; // 0..1 snow nestled AMONG the blades (winter)
  padSnowAmt: number;     // 0..1 snow blanket on the pad (winter)
  blossomAmt: number;     // 0..1 wildflowers in/around the tuft (spring/summer)
  fallenLeafAmt: number;  // 0..1 fallen leaf on the pad (autumn)
}

/** The idle gesture, separate from season identity. All zero = REST. */
interface Pose {
  bob: number;     // vertical offset in design px (negative = up)
  lean: number;    // global breeze lean, radians (whole tuft sways)
  squashX: number; // additive horizontal scale at the base (+0.18 = 18% wider)
  squashY: number; // additive vertical scale at the base (+0.18 = 18% taller)
  wind: number;    // wind-wave amplitude in design px (tips travel this far)
  windPhase: number; // traveling-wave phase across the tuft
  critter: number; // 0..1 how far the critter head has popped up (0 = hidden)
  critterLook: number; // -1..+1 critter head turn (look left/right)
}

const REST: Pose = {
  bob: 0,
  lean: 0,
  squashX: 0,
  squashY: 0,
  wind: 0,
  windPhase: 0,
  critter: 0,
  critterLook: 0,
};

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
    gloss: lerp(a.gloss, b.gloss, t),
    dryness: lerp(a.dryness, b.dryness, t),
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
    gloss: clamp01(p.gloss),
    dryness: clamp01(p.dryness),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    snowBlanketAmt: clamp01(p.snowBlanketAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

function safeNum(x: number): number {
  return Number.isFinite(x) ? x : 0;
}

// ── Per-season params — pushed HARD ──────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — fresh, sparse-but-BRIGHT new green blades, dewy lime pad, a few
  // wildflowers in the tuft; cool-bright light.
  Spring: {
    bladeLight: [188, 236, 112],
    bladeMid: [120, 204, 74],
    bladeDark: [62, 146, 52],
    tipTint: [216, 248, 146],
    padGrass: [134, 212, 90],
    padDark: [74, 144, 60],
    soil: [120, 84, 48],
    outline: [38, 78, 32],
    light: [228, 248, 230],
    lightAmt: 0.18,
    lushness: 0.5,
    tipAmt: 0.32,
    gloss: 0.3,
    dryness: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    snowBlanketAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.8,
    fallenLeafAmt: 0,
  },
  // Summer — LUSH thick deep-green tuft at PEAK, little flowers dotted in, high
  // gloss, warm bright light.
  Summer: {
    bladeLight: [156, 222, 84],
    bladeMid: [64, 168, 56],
    bladeDark: [28, 106, 42],
    tipTint: [176, 230, 100],
    padGrass: [82, 176, 72],
    padDark: [40, 116, 50],
    soil: [126, 86, 48],
    outline: [20, 72, 30],
    light: [255, 244, 204],
    lightAmt: 0.2,
    lushness: 1.0,
    tipAmt: 0.22,
    gloss: 0.9,
    dryness: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    snowBlanketAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.55,
    fallenLeafAmt: 0,
  },
  // Autumn — DRY gold/tan grass gone to seed, dulled gloss, amber light, a
  // fallen leaf on the pad.
  Autumn: {
    bladeLight: [216, 188, 92],
    bladeMid: [176, 142, 60],
    bladeDark: [120, 92, 46],
    tipTint: [228, 186, 78], // golden seed-head tips
    padGrass: [164, 152, 84],
    padDark: [114, 96, 52],
    soil: [120, 78, 42],
    outline: [70, 50, 24],
    light: [250, 200, 134],
    lightAmt: 0.24,
    lushness: 0.42,
    tipAmt: 0.9,
    gloss: 0.28,
    dryness: 0.85,
    frostAmt: 0,
    snowCapAmt: 0,
    snowBlanketAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1.0,
  },
  // Winter — grass poking through SNOW: a bold snow blanket/drift over the base,
  // snow caps weighing the blades, frost on the tips; blades still green-grey and
  // clearly a tuft; cool blue-grey light.
  Winter: {
    bladeLight: [156, 184, 152],
    bladeMid: [98, 138, 108],
    bladeDark: [62, 100, 82],
    tipTint: [212, 230, 230],
    padGrass: [182, 200, 218],
    padDark: [122, 148, 174],
    soil: [128, 110, 96],
    outline: [50, 66, 70],
    light: [202, 224, 255],
    lightAmt: 0.34,
    lushness: 0.4,
    tipAmt: 0.42,
    gloss: 0.3,
    dryness: 0.18,
    frostAmt: 0.8,
    snowCapAmt: 0.9,
    snowBlanketAmt: 0.85,
    padSnowAmt: 0.95,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Tuft geometry — the SAME silhouette every season ─────────────────────────
//
// Blades fan symmetrically from the pad centre near y=+17. Each blade is a
// curved spear: a base x, a tip x/y, a curvature bias, a width and a back flag
// (back blades darker, drawn first). ~55% of tile width => outer tips reach
// roughly ±13. Many slender blades for density. The `phase` per blade lets the
// wind wave ripple across the tuft.

const TUFT_BASE_Y = 17;

interface Blade {
  baseX: number;  // contact x at the tuft base
  tipX: number;   // resting tip x
  tipY: number;   // resting tip y (negative = up)
  ctrl: number;   // horizontal control-point bias (curvature)
  width: number;  // stroke width of the blade body
  back: boolean;  // back row (darker, drawn first)
  phase: number;  // 0..1 position in the traveling wind wave (left→right)
}

// Symmetric fan: pairs mirrored about centre, plus central blades. Tallest in
// the middle, shorter and more splayed at the edges. `phase` ramps with baseX so
// the gust visibly travels across the tuft.
const BLADES: Blade[] = [
  // back row (darker, drawn first for depth)
  { baseX: -2.0, tipX: -10.5, tipY: -12, ctrl: -5, width: 2.4, back: true, phase: 0.18 },
  { baseX: 2.0, tipX: 10.5, tipY: -12, ctrl: 5, width: 2.4, back: true, phase: 0.82 },
  { baseX: -1.0, tipX: -5.5, tipY: -20, ctrl: -2.5, width: 2.6, back: true, phase: 0.38 },
  { baseX: 1.0, tipX: 5.5, tipY: -20, ctrl: 2.5, width: 2.6, back: true, phase: 0.62 },
  { baseX: 0.0, tipX: 0.5, tipY: -23, ctrl: 0, width: 2.8, back: true, phase: 0.5 },
  // front row (brighter, drawn over)
  { baseX: -3.0, tipX: -13, tipY: -7, ctrl: -8, width: 2.2, back: false, phase: 0.05 },
  { baseX: 3.0, tipX: 13, tipY: -7, ctrl: 8, width: 2.2, back: false, phase: 0.95 },
  { baseX: -2.2, tipX: -8.5, tipY: -15, ctrl: -5.5, width: 2.4, back: false, phase: 0.28 },
  { baseX: 2.2, tipX: 8.5, tipY: -15, ctrl: 5.5, width: 2.4, back: false, phase: 0.72 },
  { baseX: -1.2, tipX: -3, tipY: -21, ctrl: -2, width: 2.5, back: false, phase: 0.44 },
  { baseX: 1.2, tipX: 3, tipY: -21, ctrl: 2, width: 2.5, back: false, phase: 0.56 },
  { baseX: -0.4, tipX: -1.5, tipY: -24, ctrl: -1, width: 2.6, back: false, phase: 0.5 },
];

/** Sway offset applied to a blade's tip & control point during the wind wave.
 *  `wind` is the gust amplitude in design-px (0 = rest); the wave travels across
 *  the tuft via the blade `phase`, and taller/outer blades move most. */
function bladeSway(b: Blade, wind: number, windPhase: number): number {
  // tips that are higher (more negative tipY) and further out sway more
  const reach = (Math.abs(b.tipX) / 13) * 0.55 + (-b.tipY / 24) * 0.45;
  // traveling wave: each blade's phase shifts where it is in the gust cycle
  const wave = Math.sin(windPhase - b.phase * Math.PI * 2);
  return wind * reach * wave;
}

// ── The single parameterized paint ───────────────────────────────────────────

/** The whole tile from ONLY `p` (season identity) and `pose` (idle gesture). */
function paint(ctx: CanvasRenderingContext2D, raw: P, rawPose: Pose): void {
  const p = clampP(raw);
  const pose: Pose = {
    bob: safeNum(rawPose.bob),
    lean: safeNum(rawPose.lean),
    squashX: safeNum(rawPose.squashX),
    squashY: safeNum(rawPose.squashY),
    wind: safeNum(rawPose.wind),
    windPhase: safeNum(rawPose.windPhase),
    critter: clamp01(safeNum(rawPose.critter)),
    critterLook: safeNum(rawPose.critterLook),
  };

  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Pad: low flat grass ellipse (does NOT move with the pose) ────────────
    ctx.fillStyle = rgba(p.padDark, 0.4);
    ctx.beginPath();
    ctx.ellipse(3, 21.5, 16, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rgb(p.padDark);
    ctx.beginPath();
    ctx.ellipse(0, 20.4, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(p.padGrass);
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // tufted top edge — the pad's OWN short grass around the upper rim
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
      ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.padSnowAmt);
      ([[-9, 17.6], [5, 19], [11, 17.4], [-3, 20]] as Array<[number, number]>).forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // wildflowers on the pad (spring/summer) — small blossoms around the tuft
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

    // fallen leaf on the pad (autumn)
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const leaves: Array<[number, number, number, RGB]> = [
        [-12, 19.6, -0.5, [206, 124, 38]],
        [12, 18.6, 0.7, [182, 70, 28]],
      ];
      leaves.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgba(col, a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.4, 1.9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba([90, 44, 16], a);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-3.2, 0);
        ctx.lineTo(3.2, 0);
        ctx.stroke();
        ctx.restore();
      });
    }

    // ── Soil / contact patch directly under the tuft base ────────────────────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, TUFT_BASE_Y + 2, 8, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.26);
    ctx.beginPath();
    ctx.ellipse(2.5, TUFT_BASE_Y + 2.4, 10, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the grass tuft, under the idle pose transform ───────────────
    // The whole tuft pivots at its base: lean rocks it side to side, squash
    // anchors at the base (it "sits" on the pad), bob raises it. The wind WAVE
    // (per-blade sway) is applied inside the blade draw so it ripples.
    ctx.save();
    const pivotY = TUFT_BASE_Y;
    ctx.translate(0, pivotY + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(0, -pivotY);

    // thinner blades when not lush (winter/autumn read sparser; summer fattest)
    const widthScale = 0.82 + 0.32 * p.lushness;

    const drawBlade = (b: Blade): void => {
      const sway = bladeSway(b, pose.wind, pose.windPhase);
      const baseX = b.baseX;
      const baseY = TUFT_BASE_Y;
      const tipX = b.tipX + sway;
      const tipY = b.tipY;
      const cx = (b.baseX + b.ctrl) + sway * 0.6;
      const cy = lerp(baseY, tipY, 0.5) - 2;
      const w = b.width * widthScale;

      // 1) soft dark outline pass
      ctx.strokeStyle = rgb(p.outline);
      ctx.lineWidth = w + 1.6;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(cx, cy, tipX, tipY);
      ctx.stroke();

      // 2) body green
      ctx.strokeStyle = rgb(b.back ? p.bladeDark : p.bladeMid);
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(cx, cy, tipX, tipY);
      ctx.stroke();

      // 3) lit edge highlight on front blades (upper-left light)
      if (!b.back) {
        ctx.strokeStyle = rgba(p.bladeLight, 0.8);
        ctx.lineWidth = Math.max(0.7, w - 1.4);
        ctx.beginPath();
        ctx.moveTo(baseX - 0.3, baseY - 1);
        ctx.quadraticCurveTo(cx - 0.6, cy, tipX - 0.4, tipY);
        ctx.stroke();
      }

      // 4) tip tint (autumn golden tips / spring fresh tips / winter frost)
      if (p.tipAmt > 0.02) {
        ctx.strokeStyle = rgba(p.tipTint, 0.9 * p.tipAmt);
        ctx.lineWidth = w;
        const ttX = lerp(cx, tipX, 0.55);
        const ttY = lerp(cy, tipY, 0.55);
        ctx.beginPath();
        ctx.moveTo(ttX, ttY);
        ctx.quadraticCurveTo(lerp(ttX, tipX, 0.5), lerp(ttY, tipY, 0.5), tipX, tipY);
        ctx.stroke();
      }

      // 5) dry seed head clinging to the tip (autumn gone-to-seed)
      if (p.dryness > 0.04 && !b.back) {
        ctx.fillStyle = rgba(p.tipTint, 0.85 * p.dryness);
        ctx.beginPath();
        ctx.ellipse(tipX, tipY, 1.0 + 0.6 * p.dryness, 1.7 + 0.7 * p.dryness, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 6) gloss sheen glint partway up a lit blade (summer/spring)
      if (p.gloss > 0.04 && !b.back) {
        const gX = lerp(baseX, tipX, 0.55);
        const gY = lerp(baseY, tipY, 0.55);
        ctx.fillStyle = rgba([255, 255, 255], 0.18 + 0.4 * p.gloss);
        ctx.beginPath();
        ctx.ellipse(gX - 0.4, gY, 0.6, 1.6, -0.2, 0, Math.PI * 2);
        ctx.fill();
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
    BLADES.forEach((b) => {
      if (b.back) drawBlade(b);
    });

    // ── Critter peeking up from WITHIN the tuft (rare idle) ───────────────────
    // Drawn between the back and front rows so it nestles inside the blades.
    if (pose.critter > 0.01) {
      const c = pose.critter;
      const headY = TUFT_BASE_Y - 6 - c * 11; // rises out of the tuft
      const headX = 1.2 + pose.critterLook * 2.2;
      ctx.save();
      ctx.globalAlpha = clamp01(c * 1.3);
      // body shadow blob (still partly buried in the blades)
      ctx.fillStyle = "rgba(40,32,28,0.35)";
      ctx.beginPath();
      ctx.ellipse(headX, headY + 3.4, 3.6, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // little grey-brown head
      ctx.fillStyle = "rgb(150,128,110)";
      ctx.beginPath();
      ctx.ellipse(headX, headY, 3.4, 3.0, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgb(176,156,138)";
      ctx.beginPath();
      ctx.ellipse(headX - 0.8, headY - 0.7, 2.0, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
      // ears
      ctx.fillStyle = "rgb(150,128,110)";
      ctx.beginPath();
      ctx.arc(headX - 2.2, headY - 2.6, 1.5, 0, Math.PI * 2);
      ctx.arc(headX + 2.2, headY - 2.6, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgb(210,168,170)";
      ctx.beginPath();
      ctx.arc(headX - 2.2, headY - 2.6, 0.7, 0, Math.PI * 2);
      ctx.arc(headX + 2.2, headY - 2.6, 0.7, 0, Math.PI * 2);
      ctx.fill();
      // eyes (looks left/right via critterLook) — only when mostly up
      const eyeA = clamp01((c - 0.45) / 0.55);
      if (eyeA > 0.01) {
        const ex = headX + pose.critterLook * 0.7;
        ctx.fillStyle = `rgba(28,22,20,${eyeA})`;
        ctx.beginPath();
        ctx.arc(ex - 1.1, headY - 0.2, 0.7, 0, Math.PI * 2);
        ctx.arc(ex + 1.1, headY - 0.2, 0.7, 0, Math.PI * 2);
        ctx.fill();
        // nose
        ctx.fillStyle = `rgba(210,120,128,${eyeA})`;
        ctx.beginPath();
        ctx.arc(headX, headY + 1.4, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    BLADES.forEach((b) => {
      if (!b.back) drawBlade(b);
    });

    // ── Snow nestled AMONG the blades + snow caps at the base (winter) ────────
    // Drawn AFTER the blades so it reads as snow lying between green-grey blades
    // that still poke up clearly.
    if (p.snowBlanketAmt > 0.02) {
      const a = p.snowBlanketAmt;
      const by = TUFT_BASE_Y;
      ctx.fillStyle = rgba([244, 250, 255], 0.9 * a);
      ctx.beginPath();
      ctx.moveTo(-9, by + 1);
      ctx.quadraticCurveTo(-7, by - 5, -3, by - 4.5);
      ctx.quadraticCurveTo(0, by - 6.5, 3, by - 4.5);
      ctx.quadraticCurveTo(7, by - 5, 9, by + 1);
      ctx.quadraticCurveTo(0, by + 3, -9, by + 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([206, 224, 244], 0.55 * a);
      ctx.beginPath();
      ctx.ellipse(0, by + 0.5, 8, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([248, 252, 255], 0.85 * a);
      ([[-4.5, -3], [4, -5], [-1, -8], [2.5, -1]] as Array<[number, number]>).forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.ellipse(sx, by + sy, 1.8, 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    if (p.snowCapAmt > 0.02) {
      ctx.fillStyle = rgba([252, 254, 255], 0.95 * p.snowCapAmt);
      const by = TUFT_BASE_Y;
      ctx.beginPath();
      ctx.ellipse(0, by + 0.5, 9 * (0.6 + 0.4 * p.snowCapAmt), 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // end pose transform

    // ── Ambient light wash over the whole tile (per-season tint) ─────────────
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

// ── Idle pose clock — two-tier occasional action ─────────────────────────────

/** Returns 0..1 progress through an action window of length `win` starting at
 *  phase offset within `period`, else −1 (at rest). Seamless because the pose
 *  built from q is zero (with zero velocity) at q=0 and q=1. */
function actionQ(t: number, period: number, win: number, phase: number): number {
  const c = (((t + phase) % period) + period) % period;
  return c < win ? c / win : -1;
}

// A bump shape that is 0 with zero velocity at q=0 and q=1 (single hump).
// sin^2(pi q) → smooth in/out, peak at q=0.5.
function hump(q: number): number {
  const s = Math.sin(Math.PI * q);
  return s * s;
}

/** Build the idle pose from the wall clock. Two tiers:
 *   common WIND WAVE every ~6s (win 0.95s), rare CRITTER PEEK every ~18s (win
 *   1.2s, phase +3s so it never collides with the gust). */
function poseFromClock(t: number): Pose {
  const pose: Pose = {
    bob: 0,
    lean: 0,
    squashX: 0,
    squashY: 0,
    wind: 0,
    windPhase: 0,
    critter: 0,
    critterLook: 0,
  };

  // ── COMMON: wind WAVE (~6s, win 0.95s) ──
  // A gust sweeps across the tuft: blades bend ~12–16 design-px at the tips in a
  // traveling wave (each blade phase-offset), with a tiny base squash + lean.
  // Envelope (sin πq) makes amplitude 0 with zero velocity at the edges.
  const qC = actionQ(t, 6.0, 0.95, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC); // 0..1..0, zero at edges
    // wind amplitude peaks mid-window; ~14px tips.
    pose.wind = 14 * env;
    // the wave sweeps left→right ~1.5 cycles across the window
    pose.windPhase = qC * Math.PI * 3;
    // whole tuft leans gently with the gust, then back (zero at edges)
    pose.lean += 0.07 * env * Math.sin(qC * Math.PI);
    // small base squash as the gust pushes the tuft over
    pose.squashY += -0.05 * hump(qC);
    pose.squashX += 0.05 * hump(qC);
  }

  // ── RARE SPECIAL: CRITTER PEEK (~18s, win 1.2s, phase 3s) ──
  // A tiny critter pops up from within the tuft, looks left then right, then
  // ducks back down. Zero at the window edges (off-screen / buried) → seamless.
  const qS = actionQ(t, 18.0, 1.2, 3.0);
  if (qS >= 0) {
    // rise/hold/duck: quick up, brief hold while looking, then duck. Use a
    // raised-cosine so critter=0 with zero velocity at q=0 and q=1.
    const up = clamp01((qS - 0.1) / 0.22);     // emerges
    const down = clamp01((qS - 0.78) / 0.22);  // ducks back
    const upS = up * up * (3 - 2 * up);         // smoothstep
    const downS = down * down * (3 - 2 * down);
    pose.critter = clamp01(upS - downS);
    // look left then right while up (settles to 0 at the edges)
    pose.critterLook = Math.sin((qS - 0.1) * Math.PI * 2.0) * pose.critter;
    // the tuft gives a tiny rustle as the critter moves (zero at edges)
    pose.wind += 5 * Math.sin(qS * Math.PI) * Math.sin(qS * Math.PI * 5) * 0.4;
    pose.windPhase += qS * Math.PI * 2;
    pose.squashY += -0.03 * hump(qS);
  }

  return pose;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], REST);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const tt = Number.isFinite(t) ? t : 0;
    paint(ctx, SP[season], poseFromClock(tt));

    // Light additive season micro-dressing (never the subject's own colour).
    // Kept tiny so the wind WAVE + critter peek are the stars.
    ctx.save();
    try {
      ctx.globalAlpha = 1;
      if (season === "Winter") {
        const seeds: Array<[number, number, number]> = [
          [-9, 0.0, 1.0], [6, 0.4, 0.9], [11, 0.7, 0.8], [-2, 0.25, 0.9],
        ];
        ctx.fillStyle = "#ffffff";
        seeds.forEach(([fx, phase, r]) => {
          const prog = ((tt / 3.0 + phase) % 1 + 1) % 1;
          const fy = -22 + prog * 38;
          const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
          ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.arc(dx, fy, r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      } else if (season === "Spring") {
        // a couple of drifting petals
        ctx.fillStyle = "rgba(255,240,248,0.9)";
        for (let i = 0; i < 2; i++) {
          const prog = ((tt / 4.0 + i * 0.5) % 1 + 1) % 1;
          const px = (i === 0 ? -10 : 9) + Math.sin(prog * Math.PI * 2) * 3;
          const py = -18 + prog * 34;
          ctx.globalAlpha = 0.35 + 0.4 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.ellipse(px, py, 1.4, 0.9, prog * 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (season === "Autumn") {
        // one slow tumbling leaf carried on the wind
        const prog = ((tt / 5.0) % 1 + 1) % 1;
        const px = 11 - prog * 6 + Math.sin(prog * Math.PI * 3) * 2;
        const py = -16 + prog * 32;
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(prog * Math.PI);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(prog * Math.PI * 4);
        ctx.fillStyle = "rgba(196,96,32,1)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.4, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      // Summer: no extra dressing — the lush gust + gloss is the show.
    } finally {
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  };
}

// ── Forward season→season transitions (seamless endpoints) ───────────────────

function makeTransition(fromIdx: 0 | 1 | 2): (ctx: CanvasRenderingContext2D, p: number) => void {
  const from = SP[SEASON_NAMES[fromIdx]];
  const to = SP[SEASON_NAMES[fromIdx + 1]];
  return (ctx, pp) => {
    const k = smoother(clamp01(pp));
    paint(ctx, lerpP(from, to, k), REST);
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
