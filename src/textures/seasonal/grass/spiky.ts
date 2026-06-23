// Seasonal art for the SPIKY GRASS tile (`tile_grass_spiky`).
// Source path token: seasonal/grass/spiky.ts  (category: GRASS framing).
//
// A stiff CLUMP of sharp, rigid, pointed spikes radiating evenly outward and
// upward from the pad centre — a pampas/reed/sedge-style spiky tuft: stiff,
// architectural, sharply pointed. The SAME spiky-tuft silhouette is drawn every
// season (identity-locked), and the seasons swing HARD on colour + a real
// seasonal prop (blossom on the pad / dry feathery seed-tips + fallen leaf /
// frost + snow blanket at the base + snow caps weighing the tips):
//
//   IDLE COMMON  (~6s, win ~0.95s): a STIFF SWAY — because the spikes are rigid
//       they bend as ONE unit ~10–14 design-px at the tips with a crisp ease and
//       a small base squash, pivoting at the base. Zero velocity at the window
//       edges (seamless).
//   IDLE SPECIAL (~18s, win ~1.2s, phase +3s): a STRONG GUST BEND — the whole
//       stiff clump bends hard (~16–20 px at the tips) with anticipation, a big
//       lean, an overshoot, and a quivering follow-through that settles. May
//       exit the box at apex (fine, no clip).
//
// The architecture is a single parameterized `paint(ctx, p, pose)` where
// `interface P` holds tweenable season params (colours + prop amounts) and
// `pose` holds the idle gesture (bob / lean / squash + a tip quiver). Because
// every season is the same paint with tweened P, transitions are seamless:
//   transition(0) ≡ draw(from), transition(1) ≡ draw(to).
// REST pose has all zeros, so draw(season) = paint(ctx, SP[season], REST) and the
// idle's pose is 0 (zero velocity) at every action-window edge → seamless loop.
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
  bladeLight: RGB;       // lit face of a spike
  bladeMid: RGB;         // spike body tone
  bladeDark: RGB;        // shadowed / inner spikes + base
  tip: RGB;              // sharp pointed tip accent (seed-feather / frost)
  padGrass: RGB;         // top of the grass pad
  padDark: RGB;          // shaded pad underside
  soil: RGB;             // contact / base soil under the clump
  outline: RGB;          // soft dark outline tint
  light: RGB;            // ambient light tint laid over the whole tile
  lightAmt: number;      // 0..1 strength of the ambient light wash
  ripeness: number;      // 0..1 saturation / peak cue (summer = peak)
  gloss: number;         // 0..1 edge sheen along the spike edges
  seedTip: number;       // 0..1 dry feathery seed-tips on the points (autumn)
  frostAmt: number;      // 0..1 frost stiffening + frost on the spike TIPS (winter)
  snowCapAmt: number;    // 0..1 snow caps weighing the spike TIPS + base drift (winter)
  padSnowAmt: number;    // 0..1 snow blanket on the pad (winter)
  blossomAmt: number;    // 0..1 tiny blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad (autumn)
}

/** The idle gesture, separate from season identity. All zero = REST.
 *  The clump is stiff, so `lean` bends the WHOLE tuft as one unit about a pivot
 *  near the base; `tipQuiver` adds a high-frequency follow-through felt only at
 *  the tips (the springy quiver after a gust). */
interface Pose {
  bob: number;       // vertical offset in design px (negative = up)
  lean: number;      // whole-clump bend, radians (sway/gust side-to-side)
  squashX: number;   // additive horizontal scale (+0.18 = 18% wider)
  squashY: number;   // additive vertical scale (+0.18 = 18% taller)
  tipQuiver: number; // extra tip-only sideways spring, design px (gust quiver)
}

const REST: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0, tipQuiver: 0 };

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
    tip: lerpRGB(a.tip, b.tip, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    ripeness: lerp(a.ripeness, b.ripeness, t),
    gloss: lerp(a.gloss, b.gloss, t),
    seedTip: lerp(a.seedTip, b.seedTip, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
  };
}

function clampP(p: P): P {
  return {
    ...p,
    lightAmt: clamp01(p.lightAmt),
    ripeness: clamp01(p.ripeness),
    gloss: clamp01(p.gloss),
    seedTip: clamp01(p.seedTip),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
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
  // Spring — fresh bright-green NEW spikes, crisp; dewy lime pad + a blossom.
  Spring: {
    bladeLight: [190, 230, 104],
    bladeMid: [120, 190, 62],
    bladeDark: [62, 128, 44],
    tip: [216, 244, 150],
    padGrass: [126, 214, 84],
    padDark: [64, 146, 56],
    soil: [120, 84, 48],
    outline: [34, 78, 30],
    light: [228, 248, 222],
    lightAmt: 0.18,
    ripeness: 0.42,
    gloss: 0.2,
    seedTip: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 1.0,
    fallenLeafAmt: 0,
  },
  // Summer — PEAK: tall vivid green stiff spikes, high gloss, warm bright light.
  Summer: {
    bladeLight: [168, 222, 70],
    bladeMid: [96, 172, 44],
    bladeDark: [50, 114, 32],
    tip: [196, 232, 96],
    padGrass: [82, 184, 70],
    padDark: [40, 120, 50],
    soil: [126, 86, 48],
    outline: [38, 84, 22],
    light: [255, 244, 200],
    lightAmt: 0.2,
    ripeness: 1.0,
    gloss: 1.0,
    seedTip: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — DRY GOLD / straw BLEACHED spikes, feathery seed-tips, dulled gloss,
  // amber light, olive-tan pad + a fallen leaf.
  Autumn: {
    bladeLight: [228, 200, 116],
    bladeMid: [196, 158, 78],
    bladeDark: [142, 108, 52],
    tip: [240, 222, 168],
    padGrass: [176, 162, 88],
    padDark: [120, 100, 50],
    soil: [120, 80, 44],
    outline: [86, 62, 30],
    light: [250, 200, 130],
    lightAmt: 0.24,
    ripeness: 0.55,
    gloss: 0.22,
    seedTip: 1.0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1.0,
  },
  // Winter — snow-laden spikes: bold snow blanket/drift at the base + snow caps
  // weighing the spike tips, frost, cool blue-grey light. Olive still visible,
  // still clearly reads as a spiky tuft. No white-out.
  Winter: {
    bladeLight: [140, 158, 104],
    bladeMid: [100, 120, 76],
    bladeDark: [66, 84, 58],
    tip: [224, 238, 250],
    padGrass: [182, 202, 220],
    padDark: [122, 150, 178],
    soil: [130, 112, 98],
    outline: [52, 56, 60],
    light: [200, 224, 255],
    lightAmt: 0.34,
    ripeness: 0.5,
    gloss: 0.2,
    seedTip: 0,
    frostAmt: 0.82,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Spiky-tuft geometry — the SAME silhouette every season ────────────────────

// The clump base sits low-centre on the pad; spikes radiate evenly outward and
// upward to sharp points. Each spike: [angle (rad, 0 = straight up, +right),
// length, halfWidth]. The central spikes are tallest, the outer ones flare
// lower and wider (pampas/sedge silhouette). Drawn under the pose transform so
// the WHOLE stiff clump bends as one unit (rigid identity).
const CLUMP_BASE_Y = 16; // contact line where all spikes meet the pad
const CLUMP_PIVOT_Y = CLUMP_BASE_Y - 1; // bend/lean about a point near the base
const SPIKES: Array<[number, number, number]> = [
  [-1.18, 16, 2.0], // far left, low flare
  [-0.86, 24, 2.2], // left mid
  [-0.52, 32, 2.3], // left upper
  [-0.20, 38, 2.4], // centre-left (tallest)
  [0.06, 39, 2.4],  // centre (tallest)
  [0.30, 37, 2.4],  // centre-right
  [0.60, 31, 2.3],  // right upper
  [0.92, 23, 2.2],  // right mid
  [1.22, 15, 2.0],  // far right, low flare
];

/** Trace one straight, stiff, sharply-pointed spike as a slim triangle path.
 *  `tipLean` shifts the tip sideways (the springy gust quiver felt at the tip,
 *  scaled by how tall this spike is so taller spikes whip more). */
function spikePath(
  ctx: CanvasRenderingContext2D,
  ang: number,
  len: number,
  half: number,
  tipLean: number,
): { tipX: number; tipY: number } {
  // base sits near the clump centre, slightly spread by angle
  const bx = Math.sin(ang) * 3.2;
  const by = CLUMP_BASE_Y;
  // tip radiates outward/upward; tipLean nudges the sharp point sideways
  const tipX = Math.sin(ang) * len + tipLean;
  const tipY = by - Math.cos(ang) * len;
  // perpendicular for the two base shoulders (slim → sharp point)
  const px = Math.cos(ang) * half;
  const py = Math.sin(ang) * half;
  ctx.beginPath();
  ctx.moveTo(bx - px, by - py);
  ctx.lineTo(bx + px, by + py);
  ctx.lineTo(tipX, tipY);
  ctx.closePath();
  return { tipX, tipY };
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
    tipQuiver: safeNum(rawPose.tipQuiver),
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

    // tufted top edge — little blades around the upper rim
    ctx.strokeStyle = rgb(p.padDark);
    ctx.lineWidth = 1.1;
    for (let i = -7; i <= 7; i++) {
      const tx = i * 2.4;
      const ty = 19 - Math.sqrt(Math.max(0, 1 - (tx / 18) ** 2)) * 5.2;
      ctx.beginPath();
      ctx.moveTo(tx, ty + 0.4);
      ctx.lineTo(tx - 0.8, ty - 2.4);
      ctx.stroke();
    }
    // grass-top highlight glints
    ctx.strokeStyle = rgba([255, 255, 255], 0.18);
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
      ([[-9, 17.6], [5, 19], [11, 17.4], [-3, 20]] as Array<[number, number]>).forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // blossom on the pad (spring)
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

    // ── Soil contact patch + clump shadow (follows the bend for grounding) ───
    const tipShift = pose.lean * (CLUMP_PIVOT_Y - (CLUMP_BASE_Y - 39)); // ~lean*38
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, CLUMP_BASE_Y + 1.5, 8, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.28);
    ctx.beginPath();
    ctx.ellipse(2.5 + tipShift * 0.16, CLUMP_BASE_Y + 2, 12, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the spiky tuft, under the idle pose transform ───────────────
    // Rigid clump: bend the WHOLE tuft as one unit about a pivot near the base.
    ctx.save();
    ctx.translate(0, CLUMP_PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(0, -CLUMP_PIVOT_Y);

    // Draw back-to-front: outer spikes first (darker, behind), centre last.
    const order = SPIKES.map((_, i) => i).sort(
      (a, b) => Math.abs(SPIKES[b][0]) - Math.abs(SPIKES[a][0]),
    );

    order.forEach((i) => {
      const [ang, len, half] = SPIKES[i];
      // tip-only springy quiver — scales with spike height so tall spikes whip
      // more, and with horizontal angle so it reads as a sideways flick.
      const tipLean = pose.tipQuiver * (len / 39) * (0.5 + 0.5 * Math.sin(ang));
      // depth 0 (outer) .. 1 (centre) for shading
      const depth = 1 - Math.min(1, Math.abs(ang) / 1.25);

      // 1) soft dark outline pass (slightly fatter triangle)
      spikePath(ctx, ang, len + 1.2, half + 0.9, tipLean);
      ctx.fillStyle = rgb(p.outline);
      ctx.fill();

      // 2) body fill — outer spikes lean darker, centre lean lighter
      const body = lerpRGB(p.bladeDark, p.bladeMid, depth);
      spikePath(ctx, ang, len, half, tipLean);
      ctx.fillStyle = rgb(body);
      ctx.fill();

      // 3) lit left face — a slim lighter sliver on the upper-left edge
      ctx.save();
      const { tipX, tipY } = spikePath(ctx, ang, len, half, tipLean);
      ctx.clip();
      const lit = lerpRGB(p.bladeMid, p.bladeLight, 0.7 * depth + 0.3);
      const grad = ctx.createLinearGradient(
        -half - 4, CLUMP_BASE_Y, tipX + half + 4, tipY,
      );
      grad.addColorStop(0, rgb(lit));
      grad.addColorStop(0.5, rgb(body));
      grad.addColorStop(1, rgb(p.bladeDark));
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(-30, -36, 60, 60);
      ctx.globalAlpha = 1;
      ctx.restore();

      // 4) central spine highlight — a crisp ridge line up the spike
      ctx.strokeStyle = rgba(p.bladeLight, 0.45 + 0.3 * depth);
      ctx.lineWidth = 0.9;
      const bx = Math.sin(ang) * 3.2;
      ctx.beginPath();
      ctx.moveTo(bx, CLUMP_BASE_Y - 1);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      // 5) edge sheen (summer peak / glint) along the lit edge
      if (p.gloss > 0.02) {
        ctx.strokeStyle = rgba([255, 255, 255], 0.12 + 0.4 * p.gloss * depth);
        ctx.lineWidth = 0.7;
        const px = Math.cos(ang) * half;
        const py = Math.sin(ang) * half;
        ctx.beginPath();
        ctx.moveTo(bx - px * 0.8, CLUMP_BASE_Y - py * 0.8);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
      }

      // 6) dry feathery seed-tips (autumn) — a soft bushy plume at the point
      if (p.seedTip > 0.02) {
        const a = p.seedTip;
        ctx.fillStyle = rgba(p.tip, 0.85 * a);
        ctx.beginPath();
        ctx.ellipse(tipX, tipY + 1.2, 2.0, 3.2, ang, 0, Math.PI * 2);
        ctx.fill();
        // feathery barbs spraying off the plume
        ctx.strokeStyle = rgba(p.tip, 0.6 * a);
        ctx.lineWidth = 0.6;
        for (let k = -2; k <= 2; k++) {
          const ba = ang + k * 0.32;
          ctx.beginPath();
          ctx.moveTo(tipX, tipY + 0.6);
          ctx.lineTo(tipX + Math.sin(ba) * 3.4, tipY + 0.6 - Math.cos(ba) * 3.4);
          ctx.stroke();
        }
      }

      // 7) frost on the TIPS (winter) — cool pale dusting at the sharp point
      if (p.frostAmt > 0.02) {
        ctx.fillStyle = rgba(p.tip, 0.7 * p.frostAmt);
        ctx.beginPath();
        ctx.ellipse(tipX, tipY + 1.2, 1.6, 2.6, ang, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba([255, 255, 255], 0.7 * p.frostAmt);
        ctx.beginPath();
        ctx.arc(tipX, tipY, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // 8) snow caps weighing the spike TIPS (winter) — a little white dollop
      if (p.snowCapAmt > 0.02) {
        const a = p.snowCapAmt;
        ctx.fillStyle = rgba([248, 252, 255], 0.95 * a);
        ctx.beginPath();
        ctx.ellipse(tipX - 0.4, tipY + 0.8, 2.2, 1.7, ang * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba([208, 226, 244], 0.5 * a);
        ctx.beginPath();
        ctx.ellipse(tipX + 0.6, tipY + 1.6, 1.5, 1.0, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore(); // end pose transform

    // snow blanket / drift caught at the BASE of the clump (winter) — over roots
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.ellipse(0, CLUMP_BASE_Y - 1.5, 10.5, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([214, 230, 246], 0.55 * a);
      ctx.beginPath();
      ctx.ellipse(1.5, CLUMP_BASE_Y, 9, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // a few mounds of drift clinging up the lower spikes
      ctx.fillStyle = rgba([255, 255, 255], 0.85 * a);
      ([[-7, CLUMP_BASE_Y - 3], [6, CLUMP_BASE_Y - 3.5], [-2, CLUMP_BASE_Y - 4.5]] as Array<[number, number]>)
        .forEach(([sx, sy]) => {
          ctx.beginPath();
          ctx.ellipse(sx, sy, 1.8, 1.2, 0, 0, Math.PI * 2);
          ctx.fill();
        });
    }

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

// An asymmetric anticipation→peak→overshoot→settle curve, 0 at q=0 and q=1.
// (1-cos) envelope keeps velocity zero at the edges; the inner waves give a
// small windup the other way, a big bend, then a decaying overshoot/quiver.
function anticipate(q: number): number {
  const env = 0.5 * (1 - Math.cos(2 * Math.PI * q)); // 0..1..0, velocity 0 at edges
  const tilt = Math.sin(Math.PI * q) * Math.sin(1.5 * Math.PI * q);
  return env * (0.55 * Math.sin(2 * Math.PI * q) + 0.9 * tilt);
}

/** Build the idle pose from the wall clock. Two tiers:
 *   common STIFF SWAY every ~6s (win 0.95s), rare GUST BEND every ~18s (win 1.2s).
 *  Tip arm ≈ (CLUMP_PIVOT_Y - tipY) ≈ 39 px, so a lean of L radians moves the
 *  tallest tip ≈ 39*L design-px. */
function poseFromClock(t: number): Pose {
  const pose: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0, tipQuiver: 0 };

  // ── COMMON: stiff sway (~6s, win 0.95s) ──
  // A crisp one-and-a-half rock as a RIGID unit. lean ≈ 0.32 rad → tips ~12.5 px.
  // Crisper ease than soft grass (sharper rock), small base squash.
  const qC = actionQ(t, 6.0, 0.95, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC);       // 0..1..0, zero at edges
    const rock = Math.sin(qC * Math.PI * 3);  // 1.5 crisp rocks within the window
    pose.lean += 0.32 * env * rock;
    // small base squash as the clump leans its weight side to side
    pose.squashY += -0.05 * hump(qC);
    pose.squashX += 0.045 * hump(qC);
    // a faint windup tilt (still 0 at edges) for crispness
    pose.lean += 0.03 * anticipate(qC);
  }

  // ── RARE SPECIAL: strong GUST BEND (~18s, win 1.2s, phase +3s) ──
  // Anticipation (small bend INTO the wind) → big bend ~0.46 rad (~18 px at the
  // tip) → overshoot the other way → quivering follow-through that settles.
  const qS = actionQ(t, 18.0, 1.2, 3.0);
  if (qS >= 0) {
    // anticipation: brief bend against the gust early (q<0.16)
    const anti = qS < 0.16 ? Math.sin((qS / 0.16) * Math.PI) : 0; // 0..1..0
    // main bend arc: rises to a hard lean then releases
    const bendWin = qS >= 0.12 && qS < 0.62 ? (qS - 0.12) / 0.50 : -1;
    const bend = bendWin >= 0 ? Math.sin(bendWin * Math.PI) : 0; // 0..1..0
    // overshoot + decaying quiver as it springs back and settles (q>0.5)
    const settle = qS >= 0.45 ? (qS - 0.45) / 0.55 : -1; // 0..1 over the tail
    const quiverEnv = settle >= 0 ? Math.sin(settle * Math.PI) : 0; // up then down
    const quiverOsc = settle >= 0 ? Math.sin(settle * Math.PI * 5) : 0;

    // whole-clump lean: anticipate the wrong way, then a strong gust bend.
    pose.lean += -0.10 * anti + 0.46 * bend;
    // base squash: the clump compresses a touch as it bends hard
    pose.squashX += 0.07 * bend - 0.04 * anti;
    pose.squashY += -0.06 * bend + 0.03 * anti;
    // tip-only springy quiver follow-through (felt at the points, decays out)
    pose.tipQuiver += 6.0 * quiverEnv * quiverOsc;
    // a small overshoot lean the OTHER way as it releases, then settle
    pose.lean += -0.12 * quiverEnv * Math.cos(settle * Math.PI * 2.5);
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

    // Light additive season micro-sparkle (dressing only — never the subject's
    // own colour/brightness). Kept tiny so the POSE action is the star.
    ctx.save();
    try {
      ctx.globalAlpha = 1;
      if (season === "Winter") {
        // drifting snowflakes
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
        // a few dry feathery seeds drifting off the plumes
        ctx.fillStyle = "rgba(238,222,168,0.9)";
        for (let i = 0; i < 3; i++) {
          const prog = ((tt / 5.0 + i * 0.34) % 1 + 1) % 1;
          const px = (i - 1) * 8 + Math.sin(prog * Math.PI * 3 + i) * 3;
          const py = -18 + prog * 34;
          ctx.globalAlpha = 0.3 + 0.4 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.ellipse(px, py, 1.1, 0.7, prog * 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      // Summer: no extra dressing — the gust + glossy green is the show.
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
