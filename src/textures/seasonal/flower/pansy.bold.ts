// BOLD seasonal art for the PANSY flower board tile — a side-by-side decision
// prototype variant of `flower/pansy.ts`. Same five-petal violet pansy FACE in
// every season (identity rule §36: same silhouette all four seasons — never a
// bare stub, never morphing into something else), but everything dialled UP:
//
//   • SEASONS read at a glance — colour pushed HARD (vivid violet → mauve →
//     greyed) plus a real seasonal PROP each season:
//       Spring — fresh vivid bloom + a side BUD on its own stalk + pink/white
//                blossoms scattered on the pad.
//       Summer — full PEAK saturated violet bloom (no extra prop; the colour is
//                the statement).
//       Autumn — mauve bloom with browning petal edges + fallen leaves on the pad.
//       Winter — a chunky SNOW CAP sitting on the bloom + frost dusting + the
//                flower nodding a touch under the snow; clearly still a pansy.
//
//   • IDLE is mostly at rest, then a clearly-noticeable fun ACTION on a timer:
//       COMMON  (~6s, ~0.9s window): a BREEZE SWAY — the whole bloom leans and
//                nods ~11px off the stem with anticipation + follow-through, then
//                returns to rest with zero velocity (seamless).
//       RARE    (~18s, ~1.3s window): a VISITING BEE flies in from the right,
//                hovers at the bloom (fast wing-flap, animBee idiom), then flies
//                off the left — a charming once-in-a-while moment. Off-screen and
//                at zero offset at the window edges (seamless).
//
// Architecture (mandatory, mirrors pansy.ts): a SINGLE parameterized
// `paint(ctx, p, pose)` draws the whole tile from tweenable params `p` plus a
// `pose` object that carries the sway nod and the bee state. Four `SP` param
// sets feed it. `draw` paints at REST (no bee); `anim` derives a `pose` from the
// wall clock; `transition` lerps EVERY field of `p` through a smootherstep so
// transition(0) ≡ draw(from) and transition(1) ≡ draw(to) exactly (no snap).
//
// Origin-centered in the −24..+24 design box, light from upper-left. NodeNext —
// keep the `.js` import specifier. Edit ONLY this file; pansy.ts is untouched.

import type { SeasonalTileEntry, SeasonalTransitionSet, SeasonName } from "../types.js";

// ── Tweenable parameter set ──────────────────────────────────────────────────

type RGB = [number, number, number];

interface P {
  // colours (pushed HARD per season for a glance-different read)
  petalLow: RGB; // broad lower petal (lightest)
  petalSide: RGB; // the two side petals (main violet)
  petalUp: RGB; // the two upper petals (darkest)
  petalEdge: RGB; // petal outline (vivid violet → brown → cool grey)
  blotch: RGB; // dark face blotch + nectar whiskers near the throat
  throat: RGB; // yellow centre
  throatDark: RGB; // throat shade
  stem: RGB; // green stem (lit)
  stemDark: RGB; // stem outline / shade
  leaf: RGB; // leaf surface
  leafDark: RGB; // leaf edge / vein
  pad: RGB; // grass pad top
  padDark: RGB; // pad underside / shaded grass
  soil: RGB; // soil rim under the pad
  outline: RGB; // soft dark outline tint
  light: RGB; // ambient light tint (overlay on whole tile)
  // scalars 0..1 (props + filter amounts; all interpolate)
  lightAmt: number; // strength of the light overlay
  shadowAmt: number; // contact-shadow strength
  bloomOpen: number; // petal fan extent (stays high — never a stub)
  droop: number; // downward tilt of the whole face (winter nods under snow)
  whiskerAmt: number; // nectar-line strength
  glossAmt: number; // dewy highlight strength (spring/summer)
  frostAmt: number; // frost flecks on the upper petals (winter)
  snowCapAmt: number; // chunky snow cap on the top petals (winter)
  padSnowAmt: number; // snow blanket on the pad (winter)
  blossomAmt: number; // pink/white blossoms ON the pad (spring)
  fallenLeafAmt: number; // fallen leaves ON the pad (autumn)
  budAmt: number; // a side flower BUD on its own stalk (spring)
  edgeBrownAmt: number; // browning petal edges (autumn)
}

// ── Per-season parameter sets (silhouette constant; only these change) ────────
// Colour is pushed harder than the subtle base: a punchy electric violet at
// peak, a clearly mauve autumn, a distinctly cool greyed winter.

const SP: Record<SeasonName, P> = {
  // Spring — fresh VIVID bloom; dewy lime pad; a bud + blossoms. Cool-bright.
  Spring: {
    petalLow: [206, 150, 252],
    petalSide: [150, 64, 222],
    petalUp: [96, 38, 158],
    petalEdge: [58, 20, 104],
    blotch: [40, 14, 70],
    throat: [250, 214, 56],
    throatDark: [204, 154, 18],
    stem: [86, 168, 48],
    stemDark: [44, 84, 24],
    leaf: [98, 178, 56],
    leafDark: [47, 98, 28],
    pad: [132, 222, 100],
    padDark: [70, 150, 60],
    soil: [96, 66, 36],
    outline: [38, 38, 42],
    light: [222, 240, 255], // cool-bright
    lightAmt: 0.18,
    shadowAmt: 0.2,
    bloomOpen: 0.94,
    droop: 0,
    whiskerAmt: 0.85,
    glossAmt: 0.55,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
    budAmt: 0.9,
    edgeBrownAmt: 0,
  },
  // Summer — PEAK electric violet bloom, brightest throat; strong warm light.
  Summer: {
    petalLow: [216, 156, 255],
    petalSide: [160, 58, 238],
    petalUp: [104, 38, 176],
    petalEdge: [56, 18, 102],
    blotch: [40, 12, 64],
    throat: [255, 220, 52],
    throatDark: [210, 160, 18],
    stem: [92, 178, 52],
    stemDark: [44, 88, 26],
    leaf: [104, 186, 60],
    leafDark: [48, 102, 30],
    pad: [80, 184, 74],
    padDark: [44, 122, 48],
    soil: [88, 58, 30],
    outline: [36, 36, 40],
    light: [255, 244, 200], // warm, strong
    lightAmt: 0.16,
    shadowAmt: 0.38,
    bloomOpen: 1,
    droop: 0,
    whiskerAmt: 1,
    glossAmt: 0.45,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    budAmt: 0,
    edgeBrownAmt: 0,
  },
  // Autumn — clearly MAUVE bloom, browning petal edges; olive-tan pad + leaves.
  Autumn: {
    petalLow: [206, 158, 196],
    petalSide: [168, 104, 156],
    petalUp: [122, 72, 108],
    petalEdge: [134, 84, 44], // browning
    blotch: [88, 54, 50],
    throat: [228, 176, 58],
    throatDark: [170, 120, 32],
    stem: [128, 120, 58],
    stemDark: [80, 66, 28],
    leaf: [186, 162, 58], // yellowing
    leafDark: [110, 84, 16],
    pad: [148, 156, 82],
    padDark: [100, 104, 52],
    soil: [92, 60, 30],
    outline: [54, 46, 36],
    light: [255, 214, 150], // low amber, pushed
    lightAmt: 0.24,
    shadowAmt: 0.28,
    bloomOpen: 0.9,
    droop: 0.16,
    whiskerAmt: 0.4,
    glossAmt: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
    budAmt: 0,
    edgeBrownAmt: 0.9,
  },
  // Winter — clearly GREYED cool violet, frost-dusted, a CHUNKY snow cap; the
  // bloom nods a touch under the weight. Snow-blued pad. Still a pansy face.
  Winter: {
    petalLow: [198, 184, 214],
    petalSide: [150, 120, 176],
    petalUp: [108, 86, 132],
    petalEdge: [84, 76, 98], // cool grey
    blotch: [72, 64, 84],
    throat: [210, 190, 120], // muted but still reads as the throat
    throatDark: [158, 140, 84],
    stem: [112, 110, 98],
    stemDark: [70, 70, 64],
    leaf: [124, 136, 114], // greyed sage
    leafDark: [72, 84, 72],
    pad: [212, 226, 240], // snow-blued grass
    padDark: [150, 170, 192],
    soil: [110, 104, 96],
    outline: [62, 64, 74],
    light: [204, 224, 250], // cool blue-grey
    lightAmt: 0.24,
    shadowAmt: 0.16,
    bloomOpen: 0.84,
    droop: 0.34,
    whiskerAmt: 0.22,
    glossAmt: 0,
    frostAmt: 0.9,
    snowCapAmt: 0.9, // chunkier than the subtle base
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    budAmt: 0,
    edgeBrownAmt: 0,
  },
};

// ── Small numeric helpers ────────────────────────────────────────────────────

const clamp01 = (x: number): number => (x < 0 || Number.isNaN(x) ? 0 : x > 1 ? 1 : x);
const smoother = (x: number): number => x * x * x * (x * (6 * x - 15) + 10);

function rgb(c: RGB, a = 1): string {
  const r = Math.round(clamp01(c[0] / 255) * 255);
  const g = Math.round(clamp01(c[1] / 255) * 255);
  const b = Math.round(clamp01(c[2] / 255) * 255);
  return `rgba(${r},${g},${b},${clamp01(a)})`;
}

function mixRGB(a: RGB, b: RGB, k: number): RGB {
  const t = clamp01(k);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * clamp01(k);
}

function lerpP(a: P, b: P, k: number): P {
  return {
    petalLow: mixRGB(a.petalLow, b.petalLow, k),
    petalSide: mixRGB(a.petalSide, b.petalSide, k),
    petalUp: mixRGB(a.petalUp, b.petalUp, k),
    petalEdge: mixRGB(a.petalEdge, b.petalEdge, k),
    blotch: mixRGB(a.blotch, b.blotch, k),
    throat: mixRGB(a.throat, b.throat, k),
    throatDark: mixRGB(a.throatDark, b.throatDark, k),
    stem: mixRGB(a.stem, b.stem, k),
    stemDark: mixRGB(a.stemDark, b.stemDark, k),
    leaf: mixRGB(a.leaf, b.leaf, k),
    leafDark: mixRGB(a.leafDark, b.leafDark, k),
    pad: mixRGB(a.pad, b.pad, k),
    padDark: mixRGB(a.padDark, b.padDark, k),
    soil: mixRGB(a.soil, b.soil, k),
    outline: mixRGB(a.outline, b.outline, k),
    light: mixRGB(a.light, b.light, k),
    lightAmt: lerp(a.lightAmt, b.lightAmt, k),
    shadowAmt: lerp(a.shadowAmt, b.shadowAmt, k),
    bloomOpen: lerp(a.bloomOpen, b.bloomOpen, k),
    droop: lerp(a.droop, b.droop, k),
    whiskerAmt: lerp(a.whiskerAmt, b.whiskerAmt, k),
    glossAmt: lerp(a.glossAmt, b.glossAmt, k),
    frostAmt: lerp(a.frostAmt, b.frostAmt, k),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, k),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, k),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, k),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, k),
    budAmt: lerp(a.budAmt, b.budAmt, k),
    edgeBrownAmt: lerp(a.edgeBrownAmt, b.edgeBrownAmt, k),
  };
}

// ── Pose: carries the idle sway nod + the visiting-bee state ──────────────────
// `paint` reads ONLY `p` and `pose`. The pose is the seam between the static
// art and the timed idle: `draw`/`transition` pass REST (no nod, no bee).

interface BeeState {
  on: boolean; // is the bee present this frame?
  x: number; // bee centre x (design px), origin-centered
  y: number; // bee centre y
  flap: number; // wing flap width factor (animBee idiom)
  t: number; // local time for sub-motions (antennae twitch etc.)
  alpha: number; // fade at the very edges of the visit
}

interface Pose {
  bob: number; // vertical breathing/idle offset of the plant (design px)
  swayLean: number; // breeze nod: radians the bloom leans off the stem base
  swayShift: number; // breeze nod: horizontal travel of the bloom (design px)
  glint: number; // 0..1 dew glint swell (spring/summer)
  bee: BeeState;
}

const REST: Pose = {
  bob: 0,
  swayLean: 0,
  swayShift: 0,
  glint: 0,
  bee: { on: false, x: 0, y: 0, flap: 0.5, t: 0, alpha: 0 },
};

// ── Constant geometry (silhouette identical every season) ────────────────────

const BLOOM_CX = 0;
const BLOOM_CY = -4;
const STEM_BASE: [number, number] = [0, 17];

/** One pansy petal: a rounded teardrop fanning out at `angle` (0 = up/−y) from
 *  the throat, length `len`, scaled by `open` (0 furled at centre, 1 full). */
function petal(
  ctx: CanvasRenderingContext2D,
  angle: number,
  len: number,
  width: number,
  open: number,
  fill: string,
  edge: string,
): void {
  if (open <= 0.001) return;
  const L = len * (0.5 + 0.5 * open);
  const W = width * (0.45 + 0.55 * open);
  ctx.save();
  ctx.rotate(angle);
  ctx.fillStyle = fill;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-W, -L * 0.55, -W * 0.55, -L);
  ctx.quadraticCurveTo(0, -L * 1.12, W * 0.55, -L);
  ctx.quadraticCurveTo(W, -L * 0.55, 0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** The pansy bloom face centered at (cx, cy), driven entirely by `p`. `glint`
 *  is the live dew-swell (0 at rest); set by the idle. */
function drawBloom(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number, glint: number): void {
  const open = clamp01(p.bloomOpen);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(p.droop);

  // Pansy face order (back → front): upper pair, side pair, broad lower petal.
  petal(ctx, Math.PI * 0.18, 9, 6, open, rgb(p.petalUp), rgb(p.petalEdge));
  petal(ctx, -Math.PI * 0.18, 9, 6, open, rgb(p.petalUp), rgb(p.petalEdge));
  petal(ctx, Math.PI * 0.62, 10, 6.6, open, rgb(p.petalSide), rgb(p.petalEdge));
  petal(ctx, -Math.PI * 0.62, 10, 6.6, open, rgb(p.petalSide), rgb(p.petalEdge));
  petal(ctx, Math.PI, 11, 8, open, rgb(p.petalLow), rgb(p.petalEdge));

  // Autumn: browning rims brushed onto the petal tips (clearly fading edges).
  const brown = clamp01(p.edgeBrownAmt);
  if (brown > 0.01) {
    ctx.save();
    ctx.strokeStyle = rgb([120, 74, 38], 0.55 * brown);
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    // arc strokes near each petal tip
    const tips: Array<[number, number]> = [
      [Math.PI * 0.18, 9], [-Math.PI * 0.18, 9],
      [Math.PI * 0.62, 10], [-Math.PI * 0.62, 10],
      [Math.PI, 11],
    ];
    for (const [ang, len] of tips) {
      const L = len * (0.5 + 0.5 * open) * 0.92;
      const tx = Math.sin(ang) * L;
      const ty = -Math.cos(ang) * L;
      ctx.beginPath();
      ctx.arc(tx, ty, 2.4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.restore();
  }

  // dark face blotch around the throat (the classic pansy "face")
  ctx.fillStyle = rgb(p.blotch, 0.9);
  ctx.beginPath();
  ctx.ellipse(0, 2.4, 3.4 * open, 3.0 * open, 0, 0, Math.PI * 2);
  ctx.fill();

  // nectar whisker lines radiating down/out from the throat
  const wA = clamp01(p.whiskerAmt) * Math.max(0, (open - 0.3) / 0.7);
  if (wA > 0.02) {
    ctx.strokeStyle = rgb(p.blotch, wA);
    ctx.lineWidth = 0.9;
    ctx.lineCap = "round";
    for (const a of [-0.95, -0.5, 0, 0.5, 0.95]) {
      const ang = Math.PI - a;
      ctx.beginPath();
      ctx.moveTo(0, 1.4);
      ctx.lineTo(Math.cos(ang + Math.PI / 2) * 7, 1.4 + Math.sin(ang + Math.PI / 2) * 7);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  }

  // yellow throat
  ctx.fillStyle = rgb(p.throat);
  ctx.beginPath();
  ctx.arc(0, 0.6, 2.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.throatDark);
  ctx.beginPath();
  ctx.arc(0, 1.4, 1.4, 0, Math.PI * 2);
  ctx.fill();

  // frost flecks on the upper petals (winter)
  if (p.frostAmt > 0.01) {
    ctx.fillStyle = rgb([236, 244, 255], 0.6 * p.frostAmt);
    for (const [fx, fy] of [[-4.5, -6], [-1, -8], [3.5, -6.5], [-6.5, -3], [5.5, -3.5]] as const) {
      ctx.beginPath();
      ctx.arc(fx, fy, 0.85, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // dewy glint (spring/summer) — static seed from glossAmt + live swell.
  const gl = clamp01(p.glossAmt) * 0.5 + clamp01(glint) * 0.5;
  if (gl > 0.01) {
    ctx.fillStyle = rgb([255, 255, 255], 0.2 + gl * 0.45);
    ctx.beginPath();
    ctx.arc(-2.6, -4.4, 1.2 + gl * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  // CHUNKY snow cap resting on the crest of the top petals (winter) — dusts the
  // upward surface; the bloom below stays clearly visible.
  if (p.snowCapAmt > 0.01) {
    const s = clamp01(p.snowCapAmt);
    ctx.fillStyle = rgb([250, 253, 255], 0.95 * s);
    ctx.beginPath();
    ctx.moveTo(-5.4, -6.8);
    ctx.quadraticCurveTo(-0.4, -11.6, 5.2, -7.0);
    ctx.quadraticCurveTo(2.4, -9.2, 0.2, -8.4);
    ctx.quadraticCurveTo(-2.6, -9.6, -5.4, -6.8);
    ctx.closePath();
    ctx.fill();
    // a little rounded clump on top for weight
    ctx.fillStyle = rgb([255, 255, 255], 0.9 * s);
    ctx.beginPath();
    ctx.arc(-0.4, -8.6, 2.2 * s + 0.6, 0, Math.PI * 2);
    ctx.fill();
    // cool underside shadow of the cap
    ctx.fillStyle = rgb([206, 222, 240], 0.5 * s);
    ctx.beginPath();
    ctx.ellipse(-0.2, -6.6, 4.4, 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** Green stem + a low pair of leaves (silhouette constant; colour from p). */
function drawStemAndLeaves(ctx: CanvasRenderingContext2D, p: P): void {
  ctx.lineCap = "round";
  ctx.strokeStyle = rgb(p.stemDark);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(STEM_BASE[0], STEM_BASE[1]);
  ctx.quadraticCurveTo(1.5, 6, BLOOM_CX, BLOOM_CY + 4);
  ctx.stroke();
  ctx.strokeStyle = rgb(p.stem);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(STEM_BASE[0], STEM_BASE[1]);
  ctx.quadraticCurveTo(1.5, 6, BLOOM_CX, BLOOM_CY + 4);
  ctx.stroke();
  ctx.lineCap = "butt";

  // a pair of leaves low on the stem
  ctx.fillStyle = rgb(p.leaf);
  ctx.strokeStyle = rgb(p.leafDark);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(0, 13);
  ctx.quadraticCurveTo(-11, 12, -15, 5);
  ctx.quadraticCurveTo(-7, 11, 0, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.quadraticCurveTo(11, 11, 15, 4);
  ctx.quadraticCurveTo(7, 10, 0, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** Spring side BUD on its own short stalk (a closed pansy-to-be) — a prop, not
 *  a second bloom; clearly identity-safe (same plant). */
function drawBud(ctx: CanvasRenderingContext2D, p: P): void {
  const a = clamp01(p.budAmt);
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = a;
  // little stalk branching to the right of the main stem
  ctx.strokeStyle = rgb(p.stem);
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(2, 10);
  ctx.quadraticCurveTo(9, 6, 12, 0);
  ctx.stroke();
  ctx.lineCap = "butt";
  // green calyx
  ctx.fillStyle = rgb(p.stem);
  ctx.strokeStyle = rgb(p.stemDark);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(12, -1, 2.6, 3.4, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // a peek of violet at the bud tip (it IS a pansy bud)
  ctx.fillStyle = rgb(p.petalSide);
  ctx.beginPath();
  ctx.ellipse(12.4, -3.4, 1.6, 2.0, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── Visiting bee (animBee idiom: hovering body + fast wing-flap) ──────────────
// Drawn at the bee's current (x,y) with a flap factor. Scaled down to ~0.45 to
// sit nicely against the 48px tile, and shaped like critters.ts animBee.

function drawBee(ctx: CanvasRenderingContext2D, bee: BeeState): void {
  if (!bee.on || bee.alpha <= 0.01) return;
  const t = bee.t;
  const flap = bee.flap;
  ctx.save();
  ctx.globalAlpha = clamp01(bee.alpha);
  ctx.translate(bee.x, bee.y);
  ctx.scale(0.45, 0.45);
  ctx.rotate(0.12 + Math.sin(t * 1.3) * 0.04);

  // Wings — translucent, behind the body, flapping fast.
  [-1, 1].forEach((side) => {
    ctx.save();
    ctx.translate(-2, -6);
    ctx.scale(side * flap, 1);
    const wing = ctx.createLinearGradient(0, -8, 10, 0);
    wing.addColorStop(0, "rgba(230,245,255,0.7)");
    wing.addColorStop(1, "rgba(180,210,235,0.4)");
    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(4, -12, 16, -14, 18, -6);
    ctx.bezierCurveTo(18, -1, 8, 2, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(120,150,180,0.65)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  });

  // Body — fuzzy oval
  const body = ctx.createRadialGradient(-4, -2, 2, 0, 4, 16);
  body.addColorStop(0, "#ffe082");
  body.addColorStop(0.6, "#f5b400");
  body.addColorStop(1, "#a06a00");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 4, 13, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a2606";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Stripes (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 4, 13, 10, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#2a1c04";
  [-2, 6].forEach((x) => {
    ctx.beginPath();
    ctx.ellipse(x, 4, 2.6, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // Stinger
  ctx.fillStyle = "#2a1c04";
  ctx.beginPath();
  ctx.moveTo(12, 4);
  ctx.lineTo(17, 4);
  ctx.lineTo(12, 7);
  ctx.closePath();
  ctx.fill();

  // Head
  ctx.fillStyle = "#2a1c04";
  ctx.beginPath();
  ctx.arc(-12, 1, 5, 0, Math.PI * 2);
  ctx.fill();
  // Eye
  ctx.fillStyle = "#fff8e0";
  ctx.beginPath();
  ctx.arc(-13, 0, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0a0e04";
  ctx.beginPath();
  ctx.arc(-13.4, 0.3, 0.9, 0, Math.PI * 2);
  ctx.fill();

  // Antennae — slight twitch
  const ant = Math.sin(t * 6) * 0.8;
  ctx.strokeStyle = "#2a1c04";
  ctx.lineWidth = 1.2;
  [-1.4, -3].forEach((d) => {
    ctx.beginPath();
    ctx.moveTo(-15, -2);
    ctx.quadraticCurveTo(-19, -7 + d, -20, -8 + d - ant);
    ctx.stroke();
  });
  ctx.restore();
}

// ── The single parameterized paint ───────────────────────────────────────────

function paint(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";

    // — contact shadow (soft, lower-right) —
    ctx.fillStyle = `rgba(0,0,0,${0.16 + p.shadowAmt * 0.26})`;
    ctx.beginPath();
    ctx.ellipse(3, 21.5, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    drawPad(ctx, p);

    // The plant rides the idle bob + the breeze sway nod. The nod pivots around
    // the stem base so the base stays planted while the bloom leans/travels.
    ctx.save();
    ctx.translate(pose.swayShift, pose.bob);
    ctx.translate(STEM_BASE[0], STEM_BASE[1]);
    ctx.rotate(pose.swayLean);
    ctx.translate(-STEM_BASE[0], -STEM_BASE[1]);
    drawStemAndLeaves(ctx, p);
    drawBud(ctx, p);
    drawBloom(ctx, p, BLOOM_CX, BLOOM_CY, pose.glint);
    ctx.restore();

    drawPadDressing(ctx, p);

    // The visiting bee flies in over everything (drawn in plain tile space).
    drawBee(ctx, pose.bee);

    // — global light overlay (cel ambient) —
    if (p.lightAmt > 0.001) {
      ctx.save();
      ctx.globalCompositeOperation = "soft-light";
      const lg = ctx.createRadialGradient(-10, -10, 2, 0, 0, 40);
      lg.addColorStop(0, rgb(p.light, p.lightAmt));
      lg.addColorStop(1, rgb(p.light, 0));
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } catch {
    /* never throw from paint */
  } finally {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }
}

// — low flat grassy pad —
function drawPad(ctx: CanvasRenderingContext2D, p: P): void {
  const cy = 19;
  ctx.fillStyle = rgb(p.padDark);
  ctx.beginPath();
  ctx.ellipse(0, cy + 1.6, 18, 5.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.pad);
  ctx.beginPath();
  ctx.ellipse(0, cy, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgb(p.outline, 0.5);
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = rgb(p.soil);
  ctx.beginPath();
  ctx.ellipse(0, cy - 0.6, 5.5, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = rgb(p.padDark);
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  for (let i = 0; i < 13; i++) {
    const a = Math.PI * (0.08 + (i / 12) * 0.84);
    const ex = Math.cos(a) * -18;
    const ey = cy + Math.sin(a) * 4.6;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + (i % 2 ? 1.2 : -1.2), ey - 2.4 - (i % 3));
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  ctx.strokeStyle = rgb(mixRGB(p.pad, [255, 255, 255], 0.35), 0.7);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(-2, cy - 0.6, 13, 3, 0, Math.PI * 1.05, Math.PI * 1.9);
  ctx.stroke();
}

// — dressing that sits ON the pad (blossoms, fallen leaves, pad snow) —
function drawPadDressing(ctx: CanvasRenderingContext2D, p: P): void {
  const cy = 19;

  // spring blossoms — pink/white dotted flowers on the grass (bolder count)
  if (p.blossomAmt > 0.001) {
    const a = clamp01(p.blossomAmt);
    const spots: Array<[number, number]> = [
      [-12, 18.5], [11, 19.5], [6, 21], [-7, 21], [13, 21.5], [-3, 22.5],
    ];
    spots.forEach(([sx, sy], i) => {
      if (i / spots.length < a + 0.05) {
        // five little petals around a yellow eye
        ctx.fillStyle = `rgba(250,214,234,${0.95 * a})`;
        for (let k = 0; k < 5; k++) {
          const ang = (k / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(sx + Math.cos(ang) * 1.3, sy + Math.sin(ang) * 1.0, 0.95, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(255,236,118,${0.95 * a})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // autumn fallen leaves on the pad
  if (p.fallenLeafAmt > 0.001) {
    const a = clamp01(p.fallenLeafAmt);
    const leaves: Array<[number, number, number, RGB]> = [
      [-11, 20, -0.5, [186, 106, 42]],
      [10, 20.5, 0.7, [156, 74, 34]],
      [2, 22, 0.2, [200, 142, 54]],
      [13, 18.5, -0.9, [168, 92, 38]],
    ];
    leaves.forEach(([lx, ly, rot, col], i) => {
      if (i / leaves.length < a + 0.05) {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgb(col, clamp01(a * 1.4));
        ctx.strokeStyle = rgb(p.outline, 0.5 * clamp01(a * 1.4));
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.0, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // a little midrib
        ctx.strokeStyle = rgb(p.outline, 0.4 * a);
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.lineTo(3, 0);
        ctx.stroke();
        ctx.restore();
      }
    });
  }

  // winter snow blanket on the pad top
  if (p.padSnowAmt > 0.001) {
    ctx.save();
    ctx.globalAlpha = clamp01(p.padSnowAmt);
    const sg = ctx.createLinearGradient(0, cy - 4, 0, cy + 4);
    sg.addColorStop(0, "rgba(250,253,255,1)");
    sg.addColorStop(1, "rgba(214,228,244,1)");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.ellipse(-1, cy - 0.8, 16.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    for (const [sx, sy] of [[-9, 18], [5, 19.5], [12, 18.5], [-2, 20.5]] as const) {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ── Idle clock: two-tier occasional action via `poseFromClock` ────────────────
//
// `actionQ` returns a normalized progress 0..1 inside an action window that
// fires once per `period`, else −1 (at rest). Each action is shaped so value
// AND velocity are zero at the window edges → the tile settles back to the exact
// rest pose and the loop is seamless.

function actionQ(t: number, period: number, win: number, phase: number): number {
  const c = (((t + phase) % period) + period) % period;
  return c < win ? c / win : -1;
}

/** A 0..1 anticipation→action→follow-through→settle bell, 0 (value+slope) at
 *  q=0 and q=1. sin(π q) gives the bell; we add a tiny anticipation dip. */
function swayShape(q: number): number {
  // primary nod forward then back: sin over one full window, but biased so it
  // leans one way (a nod), with a small anticipation pre-lean.
  const main = Math.sin(Math.PI * q); // 0..1..0
  const antic = -0.18 * Math.sin(2 * Math.PI * q) * (1 - q); // tiny early counter-lean
  return main + antic;
}

// Idle timing.
const SWAY_PERIOD = 6.0; // common breeze sway every ~6s
const SWAY_WIN = 0.9; // ~0.9s window
const BEE_PERIOD = 18.0; // rare bee visit every ~18s
const BEE_WIN = 1.3; // ~1.3s window
const BEE_PHASE = 3.0; // offset so bee doesn't collide with the first sway

/** Build the live pose for time `t` (seconds). Mostly REST; a breeze sway every
 *  ~6s and a bee visit every ~18s. Returns a fresh Pose (REST is never mutated). */
function poseFromClock(t: number, season: SeasonName): Pose {
  const p = SP[season];

  // — COMMON: breeze sway (~6s). Bloom leans + travels ~11px off the stem. —
  let swayLean = 0;
  let swayShift = 0;
  let bob = 0;
  let glint = 0;
  const qs = actionQ(t, SWAY_PERIOD, SWAY_WIN, 0);
  if (qs >= 0) {
    const s = swayShape(qs); // ~ -0.18 .. 1 .. 0
    // The bloom sits ~21px above the stem base; a lean of ~0.5 rad would be huge.
    // We want ~11px of bloom travel: arcLength ≈ lean * armLength(≈21) → lean≈0.5.
    // Use a clearly-bold lean and a matching horizontal shift, capped.
    swayLean = s * 0.34; // up to ~19.5°, a real nod (bold, not a nudge)
    swayShift = s * 4.5; // extra horizontal travel of the whole plant
    bob = -Math.abs(s) * 1.4; // a little lift as it leans (follow-through)
  }

  // — dew glint swell rides the same common cadence on spring/summer —
  if (p.glossAmt > 0.01) {
    const qg = actionQ(t, SWAY_PERIOD, SWAY_WIN, 0);
    glint = qg >= 0 ? Math.sin(Math.PI * qg) : 0;
  }

  // — RARE: visiting bee (~18s). Flies in from the right, hovers at the bloom,
  //   flies off to the left. Off-screen + alpha 0 at the window edges. —
  const bee: BeeState = { on: false, x: 0, y: 0, flap: 0.5, t: 0, alpha: 0 };
  const qb = actionQ(t, BEE_PERIOD, BEE_WIN, BEE_PHASE);
  if (qb >= 0) {
    bee.on = true;
    bee.t = t; // continuous local time for wing/antennae motion
    // Fast wing-flap (animBee idiom).
    bee.flap = 0.45 + Math.abs(Math.sin(t * 22)) * 0.75;

    // Flight path: enter from the right (x≈+34), ease to a hover near the bloom
    // (x≈+9, y≈-4), linger, then exit to the left (x≈-34). Endpoints are well
    // off the −24..+24 box so it reads as flying in and away.
    const ENTER_X = 34;
    const HOVER_X = 9;
    const EXIT_X = -34;
    const HOVER_Y = BLOOM_CY - 1;
    if (qb < 0.42) {
      // fly in (ease-out toward hover)
      const k = smoother(qb / 0.42);
      bee.x = ENTER_X + (HOVER_X - ENTER_X) * k;
      bee.y = -16 + (HOVER_Y - -16) * k + Math.sin(qb * 18) * 1.2;
    } else if (qb < 0.62) {
      // hover at the bloom (gentle bob/drift, animBee idiom)
      const h = (qb - 0.42) / 0.2;
      bee.x = HOVER_X + Math.sin(h * Math.PI * 2) * 1.6;
      bee.y = HOVER_Y + Math.sin(t * 3.0) * 1.8;
    } else {
      // fly off to the left (ease-in)
      const k = smoother((qb - 0.62) / 0.38);
      bee.x = HOVER_X + (EXIT_X - HOVER_X) * k;
      bee.y = HOVER_Y + (-18 - HOVER_Y) * k - Math.sin(k * 6) * 1.4;
    }
    // Fade fully at the very window edges so it's invisible at the seams.
    bee.alpha = Math.min(1, Math.sin(Math.PI * qb) * 3);
  }

  return { bob, swayLean, swayShift, glint, bee };
}

// ── draw / anim / transition factories ───────────────────────────────────────

function makeDraw(season: SeasonName) {
  return (ctx: CanvasRenderingContext2D): void => paint(ctx, SP[season], REST);
}

function makeAnim(season: SeasonName) {
  return (ctx: CanvasRenderingContext2D, t: number): void => {
    let pose: Pose;
    try {
      pose = poseFromClock(t, season);
    } catch {
      pose = REST;
    }
    paint(ctx, SP[season], pose);
  };
}

/** Staged colour ease: monotonic smootherstep, lingering a touch in the
 *  mid-tone so the violet→grey shift reads as a crossfade. 0 at p=0, 1 at p=1. */
function stagedEase(p: number): number {
  const s = smoother(clamp01(p));
  const pull = Math.sin(Math.PI * s) * 0.08;
  return clamp01(s + pull * (0.5 - s) * 2);
}

function makeTransition(from: SeasonName, to: SeasonName) {
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const p = clamp01(pp);
    const k = stagedEase(p); // 0 at p=0, 1 at p=1
    const trans = Math.sin(Math.PI * p); // 0 at both ends, peaks at p=0.5
    const lp = lerpP(SP[from], SP[to], k);

    // A through-morph nod: zero at both endpoints (∝ sin(π·p)), so the static
    // endpoints (≡ draw(from)/draw(to)) are untouched.
    const pose: Pose = {
      bob: -0.9 * trans,
      swayLean: 0.05 * trans,
      swayShift: 0,
      glint: 0,
      bee: { on: false, x: 0, y: 0, flap: 0.5, t: 0, alpha: 0 },
    };

    ctx.save();
    try {
      paint(ctx, lp, pose);

      // — per-morph transient overlays — all ∝ trans so 0 at both ends —
      ctx.save();
      ctx.translate(pose.swayShift, pose.bob);
      if (to === "Summer") {
        // Spring→Summer: a brief saturating bloom-glow as colour deepens.
        ctx.globalAlpha = 0.22 * trans;
        ctx.fillStyle = "rgba(255,250,210,1)";
        ctx.beginPath();
        ctx.arc(BLOOM_CX, BLOOM_CY, 9, 0, Math.PI * 2);
        ctx.fill();
      } else if (to === "Autumn") {
        // Summer→Autumn: a few mauve-rust motes lift off the petal edges.
        ctx.fillStyle = `rgba(150,96,60,${0.55 * trans})`;
        for (const [mx, my, ph] of [[-5, -5, 0], [4, -6, 1.7], [6, 0, 3.1]] as const) {
          const rise = trans * 3;
          ctx.beginPath();
          ctx.arc(mx + Math.sin(ph) * 1.5, my - rise, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Autumn→Winter: frost dusts in + a few flakes settle. The snow cap
        // itself rides the lerped snowCapAmt/padSnowAmt in `lp` (exact at p=1).
        ctx.fillStyle = `rgba(236,246,255,${0.7 * trans})`;
        for (const [fx, fy] of [[-5, -6], [-0.5, -8], [4, -6.5], [-7, -2.5], [6, -3]] as const) {
          ctx.beginPath();
          ctx.arc(fx, fy, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(255,255,255,${0.8 * trans})`;
        for (const [fx, ph] of [[-6, 0.2], [7, 0.65]] as const) {
          const yy = -16 + p * 30;
          ctx.beginPath();
          ctx.arc(fx + Math.sin(p * 6 + ph * 6) * 3, yy, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    } catch {
      /* never throw from a transition */
    } finally {
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  };
}

// ── Exports ──────────────────────────────────────────────────────────────────

export const VARIANTS: SeasonalTileEntry = {
  Spring: { draw: makeDraw("Spring"), anim: makeAnim("Spring") },
  Summer: { draw: makeDraw("Summer"), anim: makeAnim("Summer") },
  Autumn: { draw: makeDraw("Autumn"), anim: makeAnim("Autumn") },
  Winter: { draw: makeDraw("Winter"), anim: makeAnim("Winter") },
};

export const TRANSITIONS: SeasonalTransitionSet = {
  0: makeTransition("Spring", "Summer"),
  1: makeTransition("Summer", "Autumn"),
  2: makeTransition("Autumn", "Winter"),
};
