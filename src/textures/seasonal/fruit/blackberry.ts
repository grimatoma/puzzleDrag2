// Seasonal art for the BLACKBERRY fruit tile (`tile_fruit_blackberry`).
//
// The harvested FRUIT only — never a bush. A small cluster of 3–5 plump
// aggregate berries (each berry built from little round drupelets) resting low
// on a short sprig with ONE green leaf, sitting low-centre on a grassy pad.
//
// The SAME drupelet-cluster silhouette is drawn every season — only colour and
// dressing (frost, snow cap, pad blossoms / fallen leaves / snow, light tint,
// gloss, leaf reddening) change. This is enforced by a single parameterized
// `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
//
// PALETTE LOCK: the berries go green → red → glossy black with ripeness while
// keeping the drupelet cluster shape. Origin-centered in the −24..+24 design
// box, light from upper-left, flat cel-shaded with a soft dark outline. Pure
// Canvas-2D vector drawing.  (grep token: fruit/blackberry)

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable params ─────────────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly. */
interface P {
  berryLight: RGB;   // lit face of a drupelet
  berryMid: RGB;     // body tone of the berry
  berryDark: RGB;    // shadowed drupelets / underside
  leafLight: RGB;    // lit face of the single sprig leaf
  leafMid: RGB;      // leaf body
  leafDark: RGB;     // leaf shade / vein
  sprig: RGB;        // short woody sprig / stem
  padGrass: RGB;     // top of the grass pad
  padDark: RGB;      // shaded pad underside
  soil: RGB;         // contact / base soil under the cluster
  outline: RGB;      // soft dark outline tint
  light: RGB;        // ambient light tint laid over the whole tile
  lightAmt: number;  // 0..1 strength of the ambient light wash
  ripeness: number;  // 0..1 (informs nothing structural; reserved colour cue)
  gloss: number;     // 0..1 specular gloss-streak strength on the drupelets
  sunken: number;    // 0..1 overripe sunken-berry darkening (autumn)
  frostAmt: number;  // 0..1 cool frost dusting on the berries
  snowCapAmt: number; // 0..1 snow on the top of the cluster
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad (spring)
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
    berryLight: lerpRGB(a.berryLight, b.berryLight, t),
    berryMid: lerpRGB(a.berryMid, b.berryMid, t),
    berryDark: lerpRGB(a.berryDark, b.berryDark, t),
    leafLight: lerpRGB(a.leafLight, b.leafLight, t),
    leafMid: lerpRGB(a.leafMid, b.leafMid, t),
    leafDark: lerpRGB(a.leafDark, b.leafDark, t),
    sprig: lerpRGB(a.sprig, b.sprig, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    ripeness: lerp(a.ripeness, b.ripeness, t),
    gloss: lerp(a.gloss, b.gloss, t),
    sunken: lerp(a.sunken, b.sunken, t),
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
    sunken: clamp01(p.sunken),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — fresh pastel; UNRIPE green/pale-red berries, matte; bright lime
  // dewy pad + tiny blossom; cool-bright light.
  Spring: {
    berryLight: [186, 214, 120],
    berryMid: [132, 176, 78],
    berryDark: [92, 128, 60],
    leafLight: [150, 210, 96],
    leafMid: [96, 168, 64],
    leafDark: [52, 112, 44],
    sprig: [120, 150, 70],
    padGrass: [128, 206, 86],
    padDark: [72, 138, 58],
    soil: [120, 84, 48],
    outline: [44, 60, 34],
    light: [232, 244, 226],
    lightAmt: 0.16,
    ripeness: 0.1,
    gloss: 0.12,
    sunken: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — PEAK. Plump GLOSSY BLACK ripe berries with tiny highlights;
  // saturated mid-green leaf + pad; warm light, strong gloss.
  Summer: {
    berryLight: [86, 60, 96],
    berryMid: [40, 26, 50],
    berryDark: [16, 10, 22],
    leafLight: [120, 196, 78],
    leafMid: [70, 150, 54],
    leafDark: [38, 98, 40],
    sprig: [110, 86, 50],
    padGrass: [86, 168, 70],
    padDark: [44, 110, 48],
    soil: [126, 86, 48],
    outline: [16, 10, 22],
    light: [255, 240, 206],
    lightAmt: 0.18,
    ripeness: 1.0,
    gloss: 0.95,
    sunken: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — OVERRIPE very dark berries (a touch sunken/matte); the leaf
  // reddening; olive-tan browning pad with a couple of fallen leaves.
  Autumn: {
    berryLight: [62, 40, 60],
    berryMid: [30, 18, 32],
    berryDark: [14, 8, 16],
    leafLight: [206, 120, 56],
    leafMid: [168, 78, 40],
    leafDark: [104, 42, 28],
    sprig: [128, 92, 48],
    padGrass: [150, 152, 86],
    padDark: [104, 96, 52],
    soil: [120, 80, 44],
    outline: [24, 14, 22],
    light: [248, 210, 150],
    lightAmt: 0.2,
    ripeness: 1.0,
    gloss: 0.3,
    sunken: 0.85,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — cool blue-grey light; FROST-DUSTED dark berries + small snow cap,
  // still clearly visible; snowy pad. The berries keep their dark colour under.
  Winter: {
    berryLight: [78, 66, 96],
    berryMid: [42, 34, 56],
    berryDark: [22, 18, 32],
    leafLight: [128, 150, 150],
    leafMid: [92, 116, 120],
    leafDark: [60, 82, 92],
    sprig: [112, 110, 104],
    padGrass: [176, 196, 214],
    padDark: [120, 146, 172],
    soil: [128, 110, 96],
    outline: [40, 36, 52],
    light: [206, 226, 252],
    lightAmt: 0.3,
    ripeness: 0.95,
    gloss: 0.22,
    sunken: 0.25,
    frostAmt: 0.72,
    snowCapAmt: 0.85,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Cluster geometry (the SAME silhouette every season) ──────────────────────
//
// 3–5 plump aggregate berries sit in a tight bunch low-centre on the pad. Each
// berry is a rosette of little round drupelets. The bunch base contacts the pad
// near y≈+14; the cluster rises to about y≈−7. Origin-centered.

// Per-berry: [centre x, centre y, radius]. Five berries forming a compact bunch
// (a couple tucked behind/below so 3–5 read). The arrangement is constant.
const BERRIES: Array<[number, number, number]> = [
  [-6.2, 5.0, 5.2],   // lower-left
  [5.4, 6.2, 5.0],    // lower-right
  [-0.6, 8.6, 4.6],   // bottom-centre (tucked low)
  [-3.0, -1.0, 4.8],  // upper-left
  [4.0, -1.4, 4.4],   // upper-right (hero, catches most light)
];

// Drupelet offsets within one berry (unit circle, scaled by berry radius). A
// centre bump plus a ring of six — gives the bumpy aggregate read.
const DRUPELETS: Array<[number, number, number]> = [
  [0, 0, 0.42],
  [0, -0.62, 0.36],
  [0.58, -0.3, 0.34],
  [0.58, 0.34, 0.34],
  [0, 0.64, 0.34],
  [-0.58, 0.34, 0.34],
  [-0.58, -0.3, 0.34],
];

/** Draw ONE aggregate berry (a rosette of round drupelets) at (cx,cy) r. */
function drawBerry(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  p: P,
): void {
  // soft dark outline pass — a slightly fatter base disc behind the drupelets
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.arc(cx, cy, r + 0.9, 0, Math.PI * 2);
  ctx.fill();

  // matte/overripe darkening pulls the body toward the dark tone
  const bodyMid = lerpRGB(p.berryMid, p.berryDark, 0.55 * p.sunken);

  // each drupelet: dark base then a lit cap (light from upper-left)
  for (const [dx, dy, dr] of DRUPELETS) {
    const px = cx + dx * r;
    const py = cy + dy * r;
    const pr = dr * r;
    // dark base
    ctx.fillStyle = rgb(p.berryDark);
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
    // mid body, inset
    ctx.fillStyle = rgb(bodyMid);
    ctx.beginPath();
    ctx.arc(px, py, pr * 0.86, 0, Math.PI * 2);
    ctx.fill();
    // lit cap toward upper-left
    ctx.fillStyle = rgb(p.berryLight);
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(px - pr * 0.3, py - pr * 0.34, pr * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // tiny specular highlight (gloss strength from P)
    if (p.gloss > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.25 + 0.65 * p.gloss);
      ctx.beginPath();
      ctx.arc(px - pr * 0.36, py - pr * 0.42, pr * 0.2 + 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // unifying shade under the bottom drupelets to round the berry
  ctx.fillStyle = rgba(p.berryDark, 0.4);
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.55, r * 0.7, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // frost dusting (winter) on the upward face — keeps berry clearly visible
  if (p.frostAmt > 0.02) {
    ctx.fillStyle = rgba([214, 232, 250], 0.3 * p.frostAmt);
    ctx.beginPath();
    ctx.arc(cx - r * 0.2, cy - r * 0.25, r * 0.78, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([238, 248, 255], 0.75 * p.frostAmt);
    for (const [dx, dy] of [[-0.4, -0.5], [0.3, -0.4], [-0.1, 0.2], [0.5, 0.1]]) {
      ctx.beginPath();
      ctx.arc(cx + dx * r, cy + dy * r, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** The single sprig leaf behind/above the cluster (constant shape). */
function drawLeaf(ctx: CanvasRenderingContext2D, p: P): void {
  ctx.save();
  ctx.translate(7.5, -3.5);
  ctx.rotate(-0.5);
  // outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.moveTo(-7.5, 0);
  ctx.quadraticCurveTo(-2, -5.2, 7, -1.6);
  ctx.quadraticCurveTo(-1.5, 0.8, -7.5, 0);
  ctx.closePath();
  ctx.fill();
  // body
  ctx.fillStyle = rgb(p.leafMid);
  ctx.beginPath();
  ctx.moveTo(-6.6, 0);
  ctx.quadraticCurveTo(-2, -4.5, 6.2, -1.5);
  ctx.quadraticCurveTo(-1.5, 0.4, -6.6, 0);
  ctx.closePath();
  ctx.fill();
  // lit upper half
  ctx.fillStyle = rgba(p.leafLight, 0.8);
  ctx.beginPath();
  ctx.moveTo(-5.6, -0.6);
  ctx.quadraticCurveTo(-1.5, -4, 5.4, -1.6);
  ctx.quadraticCurveTo(-0.5, -1.2, -5.6, -0.6);
  ctx.closePath();
  ctx.fill();
  // midrib vein
  ctx.strokeStyle = rgb(p.leafDark);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-6, -0.2);
  ctx.quadraticCurveTo(-1, -1.4, 6, -1.5);
  ctx.stroke();
  ctx.restore();
}

// ── The single parameterized paint ───────────────────────────────────────────

/** The whole tile from ONLY `p` and `bob`. */
function paint(ctx: CanvasRenderingContext2D, raw: P, bob: number): void {
  const p = clampP(raw);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Pad: low flat grass ellipse, x∈[−18,+18], centre y≈+19 ──────────────
    // soft contact shadow lower-right, pad colour from P
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

    // ── Soil contact patch + contact shadow directly under the cluster ──────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, 14 + bob + 1.5, 8, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.26);
    ctx.beginPath();
    ctx.ellipse(2.5, 14 + bob + 2, 10, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: short woody sprig + leaf + the berry bunch ─────────────────
    ctx.save();
    ctx.translate(0, bob);

    // short woody sprig rising from the pad into the bunch (constant shape)
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(0.5, 13.5);
    ctx.quadraticCurveTo(2.5, 8, 3.5, 2);
    ctx.stroke();
    ctx.strokeStyle = rgb(p.sprig);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0.5, 13.5);
    ctx.quadraticCurveTo(2.5, 8, 3.5, 2);
    ctx.stroke();

    // one green leaf sits behind/above the bunch
    drawLeaf(ctx, p);

    // the berry bunch — draw back-to-front (upper berries painted last so the
    // hero upper-right reads on top). Order matches a stable depth sort.
    const order = [3, 0, 2, 1, 4]; // upper-left, lower-left, bottom, lower-right, hero
    for (const idx of order) {
      const b = BERRIES[idx];
      drawBerry(ctx, b[0], b[1], b[2], p);
    }

    // snow cap on the top of the cluster (winter) — hugs the upward crown
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(-7, -3.4);
      ctx.quadraticCurveTo(-2, -7.6, 1, -6.4);
      ctx.quadraticCurveTo(5, -8, 8, -3.6);
      ctx.quadraticCurveTo(4, -2.6, 1.5, -3.8);
      ctx.quadraticCurveTo(-2, -2.4, -7, -3.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(0, -3.4, 6.4, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // end bob translate

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
function bobAt(t: number, amp = 0.9, w = 1.5): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    // Per-season additive micro-motion drawn OVER the static paint. The subject
    // bob itself is 0 at t=0; micro-motion is additive sparkle/sheen/drift.
    paint(ctx, SP[season], bob);

    ctx.save();
    try {
      ctx.globalAlpha = 1;
      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint on the unripe berries
        const g = 0.22 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        const gy = -1 + bob + Math.sin(t * 1.1) * 1.2;
        ctx.beginPath();
        ctx.arc(2.5, gy, 1.0 + g * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // soft glint travels across the drupelets, left→right (seamless via fract)
        const prog = (t * 0.45) % 1;
        const gx = lerp(-7, 7, prog);
        const gy = 2 + bob + Math.sin(prog * Math.PI) * -3;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.ellipse(gx, gy, 1.5, 1.9, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.beginPath();
        ctx.ellipse(gx - 2, gy + 1.4, 0.9, 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // the red leaf flutters — a small rocking sheen over the leaf area
        const s = 0.1 + 0.16 * (0.5 + 0.5 * Math.sin(t * 1.6));
        const flx = Math.sin(t * 1.6) * 1.1;
        ctx.fillStyle = `rgba(255,220,170,${s})`;
        ctx.beginPath();
        ctx.ellipse(7.5 + flx, -4 + bob, 4.6, 2.4, -0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Winter — drifting snowflakes + cold sheen
        const seeds: Array<[number, number, number]> = [
          [-9, 0.0, 1.0], [6, 0.4, 0.9], [11, 0.7, 0.8], [-2, 0.25, 0.9],
        ];
        ctx.fillStyle = "#ffffff";
        seeds.forEach(([fx, phase, r]) => {
          const prog = ((t / 3.0 + phase) % 1 + 1) % 1;
          const fy = -22 + prog * 38;
          const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
          ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.arc(dx, fy, r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 0.1 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.8));
        ctx.fillStyle = "rgba(210,232,255,1)";
        ctx.beginPath();
        ctx.ellipse(0, 3 + bob, 7, 4, -0.1, 0, Math.PI * 2);
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
