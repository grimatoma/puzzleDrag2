// Production seasonal art for the GRASS tile (`tile_grass_grass`).
//
// One dense raised TUFT of upright grass blades fanning symmetrically from a
// small pad. The SAME tuft silhouette (the SAME set of blade curves) is drawn
// every season (identity-safe) — only colour + a real seasonal prop (a spring
// hero bloom / golden seed-heads + fallen leaf / frost + snow blanket + snow
// caps) and the light tint change. The four stills are pushed to read crisply:
// fresh lime SPRING (a tiny upright daisy standing in the tuft), lush deep-green
// SUMMER (peak gloss), golden-tan AUTUMN (defined seed-heads with awns), and
// snow-dusted WINTER (grass still clearly poking through — frost, never a
// white-out). The idle is lively rather than subtle:
//
//   IDLE COMMON  (~6s, win ~0.95s): a WIND WAVE — the blades bend ~12–16 design-px
//       in a traveling-wave sway, each blade phase-offset so the gust ripples
//       across the tuft; pivot at the base, tips travel most, small base squash.
//       Zero with zero velocity at the window edges (seamless).
//   IDLE SPECIAL (~18s, win ~1.6s, phase +3s): a DANDELION SEED-PUFF RELEASES — a
//       fuzzy seed-head globe rises in a gap that the blades part open, then its
//       seeds detach and drift up/away, fading. The puff is an ADDITIVE OVERLAY
//       in `anim` (NOT in the season still), multiplied by a sin² envelope so it
//       is invisible — value AND velocity 0 — at the window edges (and at t=0).
//       The blades' parting/rustle reaction rides the pose and is also 0 there.
//
// The architecture is a single parameterized `paint(ctx, p, pose)` where
// `interface P` holds tweenable season params (colours + prop amounts) and
// `pose` holds the idle gesture (bob / lean / squash + wind & a centre `part`).
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
  springFlower: number;   // 0..1 one upright hero bloom standing among the blades (spring)
  seedHead: number;       // 0..1 crisp golden seed-heads crowning the tips (autumn)
  fallenLeafAmt: number;  // 0..1 fallen leaf on the pad (autumn)
}

/** The idle gesture, separate from season identity. All zero = REST. The rare
 *  beat (dandelion-puff release) is NOT a pose field — it is drawn as an additive
 *  overlay in `anim`, enveloped to 0 at the window edges (invisible at t=0). The
 *  only pose contribution the rare makes is `part`: the blades parting/quivering
 *  as the puff lets go. */
interface Pose {
  bob: number;     // vertical offset in design px (negative = up)
  lean: number;    // global breeze lean, radians (whole tuft sways)
  squashX: number; // additive horizontal scale at the base (+0.18 = 18% wider)
  squashY: number; // additive vertical scale at the base (+0.18 = 18% taller)
  wind: number;    // wind-wave amplitude in design px (tips travel this far)
  windPhase: number; // traveling-wave phase across the tuft
  part: number;    // 0..1 a centre PARTING — blades near the middle lean aside (puff release)
}

const REST: Pose = {
  bob: 0,
  lean: 0,
  squashX: 0,
  squashY: 0,
  wind: 0,
  windPhase: 0,
  part: 0,
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
    springFlower: lerp(a.springFlower, b.springFlower, t),
    seedHead: lerp(a.seedHead, b.seedHead, t),
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
    springFlower: clamp01(p.springFlower),
    seedHead: clamp01(p.seedHead),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

function safeNum(x: number): number {
  return Number.isFinite(x) ? x : 0;
}

// ── Per-season params — pushed HARD ──────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — fresh LIME new green blades, crisp dewy bright pad, a tiny upright
  // hero bloom standing in the tuft + scattered pad wildflowers; cool-bright light.
  Spring: {
    bladeLight: [202, 244, 120],
    bladeMid: [124, 210, 76],
    bladeDark: [62, 150, 54],
    tipTint: [224, 250, 150],
    padGrass: [142, 220, 96],
    padDark: [74, 148, 62],
    soil: [120, 84, 48],
    outline: [38, 80, 32],
    light: [230, 250, 232],
    lightAmt: 0.18,
    lushness: 0.52,
    tipAmt: 0.34,
    gloss: 0.32,
    dryness: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    snowBlanketAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.8,
    springFlower: 1.0,
    seedHead: 0,
    fallenLeafAmt: 0,
  },
  // Summer — LUSH thick deep-green tuft at PEAK saturation, little flowers dotted
  // in, high gloss, warm bright light.
  Summer: {
    bladeLight: [158, 226, 84],
    bladeMid: [58, 166, 52],
    bladeDark: [24, 102, 40],
    tipTint: [178, 232, 100],
    padGrass: [78, 178, 70],
    padDark: [38, 114, 48],
    soil: [126, 86, 48],
    outline: [18, 70, 28],
    light: [255, 244, 204],
    lightAmt: 0.2,
    lushness: 1.0,
    tipAmt: 0.22,
    gloss: 0.95,
    dryness: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    snowBlanketAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.55,
    springFlower: 0,
    seedHead: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — DRY golden-tan grass gone to seed, crisp golden SEED-HEADS crowning
  // the tips, dulled gloss, low amber light, a fallen leaf on the pad.
  Autumn: {
    bladeLight: [224, 192, 96],
    bladeMid: [182, 144, 60],
    bladeDark: [122, 90, 44],
    tipTint: [236, 192, 82], // golden seed-head tips
    padGrass: [168, 154, 82],
    padDark: [116, 96, 50],
    soil: [120, 78, 42],
    outline: [72, 50, 24],
    light: [252, 196, 126],
    lightAmt: 0.26,
    lushness: 0.4,
    tipAmt: 0.92,
    gloss: 0.26,
    dryness: 0.9,
    frostAmt: 0,
    snowCapAmt: 0,
    snowBlanketAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    springFlower: 0,
    seedHead: 1.0,
    fallenLeafAmt: 1.0,
  },
  // Winter — grass poking through SNOW: a bold snow blanket/drift over the base,
  // snow caps weighing the blades, frost on the tips; blades still green-grey with
  // a touch more contrast so they clearly read as a tuft; cool blue-grey light.
  // Frost dusts — it never whites the grass out.
  Winter: {
    bladeLight: [160, 190, 156],
    bladeMid: [94, 136, 106],
    bladeDark: [56, 96, 78],
    tipTint: [214, 232, 232],
    padGrass: [184, 202, 220],
    padDark: [120, 146, 172],
    soil: [128, 110, 96],
    outline: [48, 64, 68],
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
    springFlower: 0,
    seedHead: 0,
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

/** Tip offset from the centre PARTING (the rare puff release): blades near the
 *  middle lean OUTWARD to their own side, opening a small gap where the puff
 *  sits; outer blades barely move. `part` is 0 at rest. Returns design-px. */
function bladePart(b: Blade, part: number): number {
  if (part <= 0) return 0;
  // central blades part most (centrality 1 at centre → 0 by |baseX|≈3)
  const centrality = Math.max(0, 1 - Math.abs(b.baseX) / 3.2);
  // push to the blade's own side; a dead-centre blade nudges slightly right
  const side = b.tipX === 0 ? 1 : Math.sign(b.tipX);
  return part * centrality * side * 6;
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
    part: clamp01(safeNum(rawPose.part)),
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
      const sway = bladeSway(b, pose.wind, pose.windPhase) + bladePart(b, pose.part);
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

      // 5) seed head crowning the tip (autumn gone-to-seed) — a crisp golden
      //    oval body with a couple of fine awns, so it reads as a defined
      //    seedhead, not just a smudge of tint. Front blades only.
      const headAmt = Math.max(p.dryness, p.seedHead);
      if (headAmt > 0.04 && !b.back) {
        const tilt = Math.atan2(tipX - cx, -(tipY - cy)); // align to blade direction
        // body — darker gold under, brighter gold over for a little form
        ctx.fillStyle = rgba(p.bladeDark, 0.55 * headAmt);
        ctx.beginPath();
        ctx.ellipse(tipX, tipY + 0.6, 1.1 + 0.7 * headAmt, 1.9 + 0.9 * headAmt, tilt, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba(p.tipTint, 0.9 * headAmt);
        ctx.beginPath();
        ctx.ellipse(tipX - 0.3, tipY - 0.1, 0.9 + 0.6 * headAmt, 1.6 + 0.8 * headAmt, tilt, 0, Math.PI * 2);
        ctx.fill();
        // a couple of fine awns spraying off the crown (crisp seedhead read)
        if (p.seedHead > 0.2) {
          ctx.strokeStyle = rgba(p.tipTint, 0.7 * p.seedHead);
          ctx.lineWidth = 0.6;
          for (let k = -1; k <= 1; k++) {
            const aw = tilt + k * 0.42;
            ctx.beginPath();
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(tipX + Math.sin(aw) * 3.4, tipY - Math.cos(aw) * 3.4);
            ctx.stroke();
          }
        }
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

    // ── Spring hero bloom standing UP among the blades (spring still) ─────────
    // A short stem rises from the tuft base to a small daisy-like bloom, drawn
    // between the back and front rows so the blades overlap it (nestled IN the
    // tuft). It is dressing gated by `springFlower` (0 elsewhere) — it never
    // changes the grass silhouette. It rides the tuft's sway/parting so it moves
    // with the blades rather than floating.
    if (p.springFlower > 0.02) {
      const a = p.springFlower;
      const swayRef: Blade = { baseX: -0.4, tipX: -1.5, tipY: -24, ctrl: -1, width: 2.6, back: false, phase: 0.5 };
      const drift = bladeSway(swayRef, pose.wind, pose.windPhase) + bladePart(swayRef, pose.part);
      const baseX = -1.4;
      const baseY = TUFT_BASE_Y - 1;
      const headX = baseX - 4 + drift;
      const headY = TUFT_BASE_Y - 17;
      const cx = baseX - 3 + drift * 0.6;
      const cy = lerp(baseY, headY, 0.5);
      ctx.save();
      ctx.globalAlpha = clamp01(a);
      // stem (a slim green stalk that bends with the tuft)
      ctx.strokeStyle = rgb(p.bladeDark);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(cx, cy, headX, headY);
      ctx.stroke();
      ctx.strokeStyle = rgba(p.bladeMid, 0.9);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(cx, cy, headX, headY);
      ctx.stroke();
      // bloom — soft outline + white petals + warm centre
      ctx.fillStyle = rgba(p.outline, 0.5);
      ctx.beginPath();
      ctx.arc(headX, headY, 4.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgb(255,250,252)";
      for (let k = 0; k < 6; k++) {
        const ang = (k / 6) * Math.PI * 2 + 0.3;
        ctx.beginPath();
        ctx.ellipse(headX + Math.cos(ang) * 2.2, headY + Math.sin(ang) * 2.2, 1.5, 1.0, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgb(255,206,84)";
      ctx.beginPath();
      ctx.arc(headX, headY, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,236,170,0.9)";
      ctx.beginPath();
      ctx.arc(headX - 0.5, headY - 0.5, 0.7, 0, Math.PI * 2);
      ctx.fill();
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

// ── The RARE beat (dandelion-puff release) window ─────────────────────────────
// One shared clock for the rare so the tuft REACTION (in `poseFromClock`) and the
// puff OVERLAY (in `anim`) stay in lock-step. Period ~18s, window ~1.6s, phase +3s
// so it never collides with the common gust. Progress is −1 outside the window.
const RARE_PERIOD = 18.0;
const RARE_WIN = 1.6;
const RARE_PHASE = 3.0;

function rareProgress(t: number): number {
  return actionQ(t, RARE_PERIOD, RARE_WIN, RARE_PHASE);
}

/** Build the idle pose from the wall clock. Two tiers:
 *   common WIND WAVE every ~6s (win 0.95s), and the tuft REACTION to the rare
 *   dandelion-puff release every ~18s (the puff itself is an additive overlay in
 *   `anim`). Both contributions are 0 with zero velocity at their window edges,
 *   so `poseFromClock(0) === REST` and the loop is seamless. */
function poseFromClock(t: number): Pose {
  const pose: Pose = {
    bob: 0,
    lean: 0,
    squashX: 0,
    squashY: 0,
    wind: 0,
    windPhase: 0,
    part: 0,
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

  // ── RARE: tuft reaction to the dandelion-puff RELEASE (~18s) ──
  // The blades part around the puff, hold, then close — plus a little rustle as
  // the seeds let go. Every term is 0 with zero velocity at q=0 and q=1, so it
  // adds nothing at the window edges (and nothing at t=0).
  const qS = rareProgress(t);
  if (qS >= 0) {
    // open the parting (smoothstep up), hold, then close (smoothstep down)
    const open = clamp01((qS - 0.08) / 0.24);
    const close = clamp01((qS - 0.74) / 0.24);
    const openS = open * open * (3 - 2 * open);
    const closeS = close * close * (3 - 2 * close);
    pose.part = clamp01(openS - closeS);
    // a small rustle as the puff lets go (zero at edges via the hump envelope)
    pose.wind += 4.5 * hump(qS) * Math.sin(qS * Math.PI * 5);
    pose.windPhase += qS * Math.PI * 2;
    // the tuft settles a hair as the seedhead's weight leaves
    pose.squashY += -0.025 * hump(qS);
  }

  return pose;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], REST);
}

// ── RARE beat overlay: a dandelion seed-puff RELEASES ─────────────────────────
// Drawn ADDITIVELY on top of `paint`, entirely inside `anim` — it is NOT part of
// the season still. A fuzzy seed-head globe stands in the parted gap, then its
// seeds detach and drift up/outward, fading. The whole overlay is multiplied by
// `env = sin²(π·qS)`, which is 0 with zero velocity at the window edges, so the
// puff is INVISIBLE at the edges (and absent entirely at t=0, where the window
// has not opened). Deterministic; clamps; never throws.

// Fixed seeds: [angle from head (rad), radius on the globe, release order 0..1].
const PUFF_SEEDS: ReadonlyArray<readonly [number, number, number]> = [
  [-2.35, 6.2, 0.10], [-1.62, 6.6, 0.30], [-0.95, 6.0, 0.55],
  [-0.30, 6.8, 0.72], [0.35, 6.4, 0.20], [1.00, 6.7, 0.45],
  [1.65, 6.1, 0.62], [2.40, 6.5, 0.85], [-2.95, 5.6, 0.38], [2.95, 5.8, 0.78],
];

function drawDandelionRare(ctx: CanvasRenderingContext2D, t: number): void {
  const qS = rareProgress(t);
  if (qS < 0) return; // outside the window (includes t=0) → nothing drawn
  const env = (() => {
    const s = Math.sin(Math.PI * qS);
    return s * s; // 0..1..0, zero value AND zero velocity at q=0 and q=1
  })();
  if (env <= 0.001) return;

  // The puff stands in the parted gap, just above the tuft. A gentle rise as it
  // forms; the stem bends a touch with the rare rustle (kept self-contained).
  const headX = -1.4;
  const headY = TUFT_BASE_Y - 19 - 2 * env; // lifts slightly while present
  const baseX = -1.0;
  const baseY = TUFT_BASE_Y - 2;

  // How much of the globe has shed: 0 until ~0.4, then seeds release outward.
  const shed = clamp01((qS - 0.4) / 0.55);

  ctx.save();
  try {
    // ── stem (slim, pale-green, fades with the overlay) ──
    ctx.globalAlpha = 0.7 * env;
    ctx.strokeStyle = "rgb(120,180,96)";
    ctx.lineWidth = 1.3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX - 1.5, (baseY + headY) / 2, headX, headY);
    ctx.stroke();

    // tiny receptacle where the seeds anchor
    ctx.globalAlpha = 0.8 * env;
    ctx.fillStyle = "rgb(196,206,150)";
    ctx.beginPath();
    ctx.arc(headX, headY, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // ── soft fuzzy globe (the seed-head haze) — thins out as seeds shed ──
    const globeA = (1 - 0.85 * shed) * env;
    if (globeA > 0.01) {
      const g = ctx.createRadialGradient(headX, headY, 0.5, headX, headY, 7);
      g.addColorStop(0, `rgba(255,255,255,${clamp01(0.55 * globeA)})`);
      g.addColorStop(0.6, `rgba(248,250,244,${clamp01(0.32 * globeA)})`);
      g.addColorStop(1, "rgba(248,250,244,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(headX, headY, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── seeds: still attached early, then detach and drift up/out, fading ──
    PUFF_SEEDS.forEach(([ang, rad, order]) => {
      // each seed leaves once `shed` passes its release order
      const fly = clamp01((shed - order * 0.55) / 0.45); // 0 attached → 1 gone
      const dist = rad + fly * (10 + rad); // drifts outward as it flies
      // bias drift upward and to the right (a breeze carrying them off)
      const driftUp = fly * 9;
      const driftRt = fly * 6;
      const sx = headX + Math.cos(ang) * dist + driftRt;
      const sy = headY + Math.sin(ang) * dist - driftUp;
      // alpha: visible while attached, fades to 0 as it flies away
      const seedA = clamp01((1 - 0.9 * fly)) * env;
      if (seedA <= 0.01) return;

      // pappus umbrella — a few fine radiating filaments
      ctx.globalAlpha = clamp01(0.5 * seedA);
      ctx.strokeStyle = "rgb(252,253,250)";
      ctx.lineWidth = 0.5;
      for (let k = -2; k <= 2; k++) {
        const fa = ang + Math.PI + k * 0.32; // splay opposite the travel a touch
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(fa) * 2.6, sy + Math.sin(fa) * 2.6);
        ctx.stroke();
      }
      // seed body — a tiny warm speck
      ctx.globalAlpha = clamp01(0.85 * seedA);
      ctx.fillStyle = "rgb(208,196,150)";
      ctx.beginPath();
      ctx.arc(sx, sy, 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = clamp01(0.7 * seedA);
      ctx.fillStyle = "rgb(255,255,255)";
      ctx.beginPath();
      ctx.arc(sx - 0.3, sy - 0.3, 0.4, 0, Math.PI * 2);
      ctx.fill();
    });
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const tt = Number.isFinite(t) ? t : 0;
    paint(ctx, SP[season], poseFromClock(tt));

    // ── RARE beat (~18s): a dandelion seed-puff releases (additive overlay) ──
    // Invisible at the window edges (and at t=0); the tuft's parting reaction is
    // carried by the pose above. Shown in every season — a fresh-air moment.
    drawDandelionRare(ctx, tt);

    // Light additive season micro-dressing (never the subject's own colour).
    // Kept tiny so the wind WAVE + dandelion release are the stars.
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
