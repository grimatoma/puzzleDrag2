// Production seasonal art for the HEATHER flower board tile — the approved bold
// direction. The SAME heather-mound silhouette in every season (identity rule
// §36: same low flowering-shrub mound all four seasons — never a bare stub,
// never morphing into something else): a bushy mound of fine needle-like
// foliage densely covered in tiny bell/spike flowers, on a small pad. Seasonal
// change is bold COLOUR + frost/snow/light PROPS only; the dense flower-spike
// texture stays recognizable every season.
//
//   • SEASONS read at a glance — colour pushed HARD plus a real seasonal cue:
//       Spring — fresh green heather foliage with the FIRST pink-purple flower
//                spikes opening, a few stray blossoms on the pad; cool-bright.
//       Summer — PEAK bloom: the mound blazing with saturated PURPLE-PINK
//                heather flowers (its signature), high gloss, warm bright light.
//       Autumn — flowers fading to rusty mauve/bronze, foliage bronzing, a
//                fallen leaf on the pad, dulled gloss, amber light.
//       Winter — snow-capped heather: a bold snow cap/blanket over the mound +
//                frost on the spikes, the dried purple-tinted flowers beneath,
//                cool blue-grey light. Clearly snowy, still reads as heather.
//
//   • IDLE is mostly at rest, then a clearly-noticeable fun ACTION on a timer:
//       COMMON  (~6s, ~0.9s window): a BREEZE SWAY — the whole mound leans and
//                nods ~11–14px off the base with anticipation + follow-through,
//                spikes shimmer, then returns to rest with zero velocity.
//       RARE    (~18s, ~1.3s window, +3s phase): a VISITING BEE flies in from
//                one side, hovers at the flowers (fast wing-flap, animBee idiom),
//                then flies off — a charming once-in-a-while moment. Off-screen
//                and at zero offset at the window edges (seamless).
//
// Architecture (mandatory, mirrors pansy.ts): a SINGLE parameterized
// `paint(ctx, p, pose)` draws the whole tile from tweenable params `p` plus a
// `pose` object carrying the sway nod and the bee state. Four `SP` param sets
// feed it. `draw` paints at REST (no bee); `anim` derives a `pose` from the wall
// clock; `transition` lerps EVERY field of `p` through a smootherstep so
// transition(0) ≡ draw(from) and transition(1) ≡ draw(to) exactly (no snap).
//
// Origin-centered in the −24..+24 design box, light from upper-left. NodeNext —
// keep the `.js` import specifier. Edit ONLY this file.

import type { SeasonalTileEntry, SeasonalTransitionSet, SeasonName } from "../types.js";

// ── Tweenable parameter set ──────────────────────────────────────────────────

type RGB = [number, number, number];

interface P {
  // colours (pushed HARD per season for a glance-different read)
  flowerLow: RGB; // flower spikes low on the mound (lightest pink-purple)
  flowerMid: RGB; // flower spikes mid mound (the signature purple-pink)
  flowerTop: RGB; // flower spikes near the crown (deepest)
  flowerHi: RGB; // tiny bell highlight
  foliage: RGB; // fine needle foliage (lit)
  foliageDark: RGB; // needle foliage shade / mound underside
  stem: RGB; // woody base / lower twigs
  pad: RGB; // grass pad top
  padDark: RGB; // pad underside / shaded grass
  soil: RGB; // soil rim under the pad
  outline: RGB; // soft dark outline tint
  light: RGB; // ambient light tint (overlay on whole tile)
  // scalars 0..1 (props + filter amounts; all interpolate)
  lightAmt: number; // strength of the light overlay
  shadowAmt: number; // contact-shadow strength
  bloomAmt: number; // how open/dense the flower spikes read (never a stub)
  foliageShow: number; // how much bare foliage peeks through (autumn/winter up)
  glossAmt: number; // dewy/glossy highlight strength (spring/summer)
  frostAmt: number; // frost flecks on the spikes (winter)
  snowCapAmt: number; // chunky snow cap over the mound crown (winter)
  padSnowAmt: number; // snow blanket on the pad (winter)
  blossomAmt: number; // pink/white blossoms ON the pad (spring)
  fallenLeafAmt: number; // fallen leaves ON the pad (autumn)
  edgeBrownAmt: number; // bronzing/fading on the flowers + foliage (autumn)
}

// ── Per-season parameter sets (silhouette constant; only these change) ────────
// Colour is pushed harder than a subtle base: a punchy saturated purple-pink at
// peak, a clearly rusty bronzed autumn, a distinctly cool snow-blued winter.

const SP: Record<SeasonName, P> = {
  // Spring — fresh green foliage, FIRST pink-purple spikes opening; cool-bright.
  Spring: {
    flowerLow: [236, 176, 222],
    flowerMid: [214, 122, 196],
    flowerTop: [170, 78, 168],
    flowerHi: [252, 222, 244],
    foliage: [104, 184, 70],
    foliageDark: [50, 104, 40],
    stem: [120, 100, 66],
    pad: [132, 222, 100],
    padDark: [70, 150, 60],
    soil: [96, 66, 36],
    outline: [38, 46, 30],
    light: [222, 240, 255], // cool-bright
    lightAmt: 0.18,
    shadowAmt: 0.2,
    bloomAmt: 0.5,
    foliageShow: 0.55,
    glossAmt: 0.5,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
    edgeBrownAmt: 0,
  },
  // Summer — PEAK bloom: saturated PURPLE-PINK signature, high gloss, warm light.
  Summer: {
    flowerLow: [240, 150, 220],
    flowerMid: [216, 64, 188], // signature saturated purple-pink
    flowerTop: [156, 40, 168],
    flowerHi: [255, 206, 242],
    foliage: [70, 150, 52],
    foliageDark: [34, 86, 30],
    stem: [110, 92, 56],
    pad: [80, 184, 74],
    padDark: [44, 122, 48],
    soil: [88, 58, 30],
    outline: [34, 40, 28],
    light: [255, 244, 200], // warm, strong
    lightAmt: 0.16,
    shadowAmt: 0.38,
    bloomAmt: 1,
    foliageShow: 0.22,
    glossAmt: 0.55,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    edgeBrownAmt: 0,
  },
  // Autumn — flowers fading to rusty mauve/bronze, foliage bronzing; amber light.
  Autumn: {
    flowerLow: [200, 142, 150],
    flowerMid: [176, 104, 118], // faded rusty mauve
    flowerTop: [142, 80, 92],
    flowerHi: [212, 168, 150],
    foliage: [140, 130, 60], // bronzing olive
    foliageDark: [92, 76, 32],
    stem: [98, 76, 46],
    pad: [148, 156, 82],
    padDark: [100, 104, 52],
    soil: [92, 60, 30],
    outline: [54, 44, 30],
    light: [255, 214, 150], // low amber, pushed
    lightAmt: 0.24,
    shadowAmt: 0.28,
    bloomAmt: 0.82,
    foliageShow: 0.5,
    glossAmt: 0.12,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
    edgeBrownAmt: 0.9,
  },
  // Winter — snow-capped heather: chunky snow cap + frost on the spikes, dried
  // purple-tinted flowers beneath, snow-blued pad. Still clearly heather.
  Winter: {
    flowerLow: [196, 176, 208],
    flowerMid: [160, 130, 184], // dried, still purple-tinted
    flowerTop: [124, 100, 156],
    flowerHi: [224, 214, 232],
    foliage: [120, 134, 116], // greyed sage
    foliageDark: [70, 84, 74],
    stem: [104, 96, 86],
    pad: [212, 226, 240], // snow-blued grass
    padDark: [150, 170, 192],
    soil: [110, 104, 96],
    outline: [62, 66, 76],
    light: [204, 224, 250], // cool blue-grey
    lightAmt: 0.24,
    shadowAmt: 0.16,
    bloomAmt: 0.6,
    foliageShow: 0.45,
    glossAmt: 0,
    frostAmt: 0.9,
    snowCapAmt: 0.9,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    edgeBrownAmt: 0,
  },
};

// ── Small numeric helpers ────────────────────────────────────────────────────

const clamp01 = (x: number): number => (x < 0 || Number.isNaN(x) ? 0 : x > 1 ? 1 : x);
const smoother = (x: number): number => x * x * x * (x * (6 * x - 15) + 10);

/** Coerce any non-finite number to a fallback so a bad `t`/`p` can't poison the
 *  draw. */
function safeNum(x: number, fallback = 0): number {
  return Number.isFinite(x) ? x : fallback;
}

function rgba(c: RGB, a = 1): string {
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
    flowerLow: mixRGB(a.flowerLow, b.flowerLow, k),
    flowerMid: mixRGB(a.flowerMid, b.flowerMid, k),
    flowerTop: mixRGB(a.flowerTop, b.flowerTop, k),
    flowerHi: mixRGB(a.flowerHi, b.flowerHi, k),
    foliage: mixRGB(a.foliage, b.foliage, k),
    foliageDark: mixRGB(a.foliageDark, b.foliageDark, k),
    stem: mixRGB(a.stem, b.stem, k),
    pad: mixRGB(a.pad, b.pad, k),
    padDark: mixRGB(a.padDark, b.padDark, k),
    soil: mixRGB(a.soil, b.soil, k),
    outline: mixRGB(a.outline, b.outline, k),
    light: mixRGB(a.light, b.light, k),
    lightAmt: lerp(a.lightAmt, b.lightAmt, k),
    shadowAmt: lerp(a.shadowAmt, b.shadowAmt, k),
    bloomAmt: lerp(a.bloomAmt, b.bloomAmt, k),
    foliageShow: lerp(a.foliageShow, b.foliageShow, k),
    glossAmt: lerp(a.glossAmt, b.glossAmt, k),
    frostAmt: lerp(a.frostAmt, b.frostAmt, k),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, k),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, k),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, k),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, k),
    edgeBrownAmt: lerp(a.edgeBrownAmt, b.edgeBrownAmt, k),
  };
}

/** Clamp every scalar of a `P` into 0..1 and scrub non-finite values; colours
 *  pass through `rgba`'s own clamp. Belt-and-braces so a wild lerp can't break a
 *  draw. */
function clampP(p: P): P {
  return {
    ...p,
    lightAmt: clamp01(safeNum(p.lightAmt)),
    shadowAmt: clamp01(safeNum(p.shadowAmt)),
    bloomAmt: clamp01(safeNum(p.bloomAmt)),
    foliageShow: clamp01(safeNum(p.foliageShow)),
    glossAmt: clamp01(safeNum(p.glossAmt)),
    frostAmt: clamp01(safeNum(p.frostAmt)),
    snowCapAmt: clamp01(safeNum(p.snowCapAmt)),
    padSnowAmt: clamp01(safeNum(p.padSnowAmt)),
    blossomAmt: clamp01(safeNum(p.blossomAmt)),
    fallenLeafAmt: clamp01(safeNum(p.fallenLeafAmt)),
    edgeBrownAmt: clamp01(safeNum(p.edgeBrownAmt)),
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
  bob: number; // vertical breathing/idle offset of the mound (design px)
  swayLean: number; // breeze nod: radians the mound leans off the base
  swayShift: number; // breeze nod: horizontal travel of the mound (design px)
  shimmer: number; // 0..1 spike-shimmer swell (spring/summer)
  bee: BeeState;
}

const REST: Pose = {
  bob: 0,
  swayLean: 0,
  swayShift: 0,
  shimmer: 0,
  bee: { on: false, x: 0, y: 0, flap: 0.5, t: 0, alpha: 0 },
};

// ── Constant mound geometry (silhouette identical every season) ───────────────
//
// The mound pivots around its base so a sway leaves the base planted. Spikes and
// foliage tufts are placed once into stable lists; only how each is rendered
// changes with `p`.

const MOUND_BASE: [number, number] = [0, 16]; // pivot (planted base)
const MOUND_CX = 0;
const MOUND_CY = 4; // mound centre
const MOUND_RX = 15; // mound half-width
const MOUND_RY = 12; // mound half-height

// One flower spike: an anchor at the mound surface, an outward angle, a length,
// and a colour tier (0 low .. 1 top). Built once for a dense, lined texture.
interface Spike {
  x: number; // anchor x on the mound
  y: number; // anchor y on the mound
  ang: number; // outward direction (radians, 0 = up/−y)
  len: number; // spike length
  tier: number; // 0..1 vertical tier → colour
  seed: number; // per-spike phase for shimmer/jitter
}

function buildSpikes(): Spike[] {
  const list: Spike[] = [];
  // A pseudo-random but fixed scatter over the upper mound dome, dense, with
  // spikes pointing radially outward from the mound centre.
  const N = 30;
  for (let i = 0; i < N; i++) {
    // golden-angle spiral mapped onto the dome for an even, organic spread
    const a = i * 2.399963; // golden angle
    const r = Math.sqrt((i + 0.5) / N); // 0..1 from centre out
    const ux = Math.cos(a) * r;
    const uy = Math.sin(a) * r;
    // bias to the upper dome (heather flowers crown the mound)
    const x = MOUND_CX + ux * MOUND_RX * 0.92;
    const y = MOUND_CY - Math.abs(uy) * MOUND_RY * 0.95 - 1.5;
    // outward angle from mound centre
    const ang = Math.atan2(x - MOUND_CX, -(y - MOUND_CY)) + (i % 2 ? 0.12 : -0.12);
    const tier = clamp01((MOUND_CY - y) / (MOUND_RY + 2)); // higher = nearer crown
    const len = 3.0 + tier * 2.2;
    list.push({ x, y, ang, len, tier, seed: (i * 0.618) % 1 });
  }
  return list;
}

const SPIKES: Spike[] = buildSpikes();

// Fine needle-foliage tufts that fill the mound body (constant silhouette).
const FOLIAGE: Array<[number, number, number]> = (() => {
  const arr: Array<[number, number, number]> = [];
  const N = 22;
  for (let i = 0; i < N; i++) {
    const a = i * 2.399963;
    const r = Math.sqrt((i + 0.5) / N);
    const x = MOUND_CX + Math.cos(a) * r * MOUND_RX * 0.95;
    const y = MOUND_CY + (Math.sin(a) * 0.45 - 0.45) * MOUND_RY; // fill lower/mid
    const side = i % 2 === 0 ? 1 : -1;
    arr.push([x, y, side]);
  }
  return arr;
})();

// ── Drawing the heather mound (silhouette constant; colour/props from p) ───────

/** The fine needle-foliage mound body + the dense flower spikes, centered at
 *  the mound origin. `shimmer` is the live spike-shimmer swell (0 at rest). */
function drawMound(ctx: CanvasRenderingContext2D, p: P, shimmer: number): void {
  // — mound body: a rounded foliage dome (dark base, lit top) —
  ctx.fillStyle = rgba(p.foliageDark);
  ctx.beginPath();
  ctx.ellipse(MOUND_CX, MOUND_CY + 1.4, MOUND_RX, MOUND_RY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.foliage);
  ctx.beginPath();
  ctx.ellipse(MOUND_CX - 1, MOUND_CY, MOUND_RX - 1.5, MOUND_RY - 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // — fine needle foliage tufts peeking out of the mound surface —
  const fShow = clamp01(p.foliageShow);
  ctx.lineCap = "round";
  FOLIAGE.forEach(([fx, fy, side], i) => {
    if (i / FOLIAGE.length > fShow + 0.45) return;
    const tx = fx + side * 3.2;
    const ty = fy - 3.0;
    ctx.strokeStyle = rgba(p.foliageDark, 0.9);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.strokeStyle = rgba(p.foliage, 0.95);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  });

  // — the dense flower spikes (the signature) — tiny stacked bells up each
  //   spike. Openness/density from bloomAmt; colour tier from p. —
  const open = clamp01(p.bloomAmt);
  const brown = clamp01(p.edgeBrownAmt);
  SPIKES.forEach((sp) => {
    const tierCol =
      sp.tier > 0.62 ? p.flowerTop : sp.tier > 0.3 ? p.flowerMid : p.flowerLow;
    const col = brown > 0.01 ? mixRGB(tierCol, [148, 96, 56], 0.45 * brown) : tierCol;
    const len = sp.len * (0.62 + 0.38 * open);
    // shimmer nudges the spike tip a touch (spring/summer liveliness)
    const sh = clamp01(shimmer) * Math.sin((sp.seed + shimmer) * Math.PI * 2) * 0.12;
    const ang = sp.ang + sh;
    const dx = Math.sin(ang);
    const dy = -Math.cos(ang);

    ctx.save();
    ctx.translate(sp.x, sp.y);
    // spike stalk (a short woody twiglet)
    ctx.strokeStyle = rgba(p.outline, 0.5);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(dx * len, dy * len);
    ctx.stroke();

    // 3 tiny bells stacked along the spike (denser when open)
    const bellN = open > 0.45 ? 3 : 2;
    for (let k = 0; k < bellN; k++) {
      const f = 0.42 + (k / Math.max(1, bellN - 1)) * 0.56;
      const bx = dx * len * f;
      const by = dy * len * f;
      const bw = (0.95 + open * 0.65) * (1 - k * 0.12);
      const bh = (1.25 + open * 0.5) * (1 - k * 0.1);
      ctx.fillStyle = rgba(col);
      ctx.strokeStyle = rgba(p.outline, 0.55);
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.ellipse(bx, by, bw, bh, ang, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // tiny highlight on the upper-left of the topmost bells
      if (k >= bellN - 1) {
        ctx.fillStyle = rgba(p.flowerHi, 0.8);
        ctx.beginPath();
        ctx.arc(bx - bw * 0.4, by - bh * 0.4, bw * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  });
  ctx.lineCap = "butt";

  // — dewy / glossy sheen over the bloom crown (spring/summer) — static seed
  //   from glossAmt plus the live shimmer swell. —
  const gl = clamp01(p.glossAmt) * 0.55 + clamp01(shimmer) * 0.45;
  if (gl > 0.01) {
    ctx.fillStyle = rgba([255, 255, 255], 0.16 + gl * 0.4);
    ctx.beginPath();
    ctx.ellipse(MOUND_CX - 4, MOUND_CY - 6, 4.2, 2.0, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // — frost flecks scattered over the spikes (winter) —
  if (p.frostAmt > 0.01) {
    ctx.fillStyle = rgba([236, 244, 255], 0.6 * p.frostAmt);
    SPIKES.forEach((sp, i) => {
      if (i % 2) return;
      ctx.beginPath();
      ctx.arc(sp.x - 0.5, sp.y - 0.8, 0.8 + sp.tier * 0.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // — CHUNKY snow cap over the mound crown (winter) — dusts the upward dome; the
  //   flowers below stay clearly visible. —
  if (p.snowCapAmt > 0.01) {
    const s = clamp01(p.snowCapAmt);
    ctx.fillStyle = rgba([250, 253, 255], 0.95 * s);
    ctx.beginPath();
    ctx.moveTo(MOUND_CX - MOUND_RX * 0.78, MOUND_CY - MOUND_RY * 0.42);
    ctx.quadraticCurveTo(MOUND_CX - 4, MOUND_CY - MOUND_RY - 2, MOUND_CX + 2, MOUND_CY - MOUND_RY * 0.9);
    ctx.quadraticCurveTo(
      MOUND_CX + MOUND_RX * 0.4,
      MOUND_CY - MOUND_RY - 1,
      MOUND_CX + MOUND_RX * 0.78,
      MOUND_CY - MOUND_RY * 0.36,
    );
    ctx.quadraticCurveTo(MOUND_CX + 4, MOUND_CY - MOUND_RY * 0.62, MOUND_CX, MOUND_CY - MOUND_RY * 0.56);
    ctx.quadraticCurveTo(MOUND_CX - 4, MOUND_CY - MOUND_RY * 0.62, MOUND_CX - MOUND_RX * 0.78, MOUND_CY - MOUND_RY * 0.42);
    ctx.closePath();
    ctx.fill();
    // a couple of rounded clumps on top for weight
    ctx.fillStyle = rgba([255, 255, 255], 0.92 * s);
    for (const [cx, cy, r] of [[-3.5, -MOUND_RY * 0.9 + 4, 2.4], [3.5, -MOUND_RY * 0.78 + 4, 2.0]] as const) {
      ctx.beginPath();
      ctx.arc(MOUND_CX + cx, MOUND_CY + cy, r * s + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // cool underside shadow of the cap
    ctx.fillStyle = rgba([206, 222, 240], 0.45 * s);
    ctx.beginPath();
    ctx.ellipse(MOUND_CX, MOUND_CY - MOUND_RY * 0.4, MOUND_RX * 0.74, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Short woody twigs at the base of the mound — anchors the shrub to the pad. */
function drawBase(ctx: CanvasRenderingContext2D, p: P): void {
  ctx.strokeStyle = rgba(p.stem);
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (const [dx, dy] of [[-4, 8], [0, 9], [4, 8]] as const) {
    ctx.beginPath();
    ctx.moveTo(MOUND_BASE[0], MOUND_BASE[1] - 1);
    ctx.quadraticCurveTo(dx * 0.5, MOUND_CY + 8, MOUND_CX + dx, MOUND_CY + dy);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

// ── Visiting bee (animBee idiom: hovering body + fast wing-flap) ──────────────
// Drawn at the bee's current (x,y) with a flap factor. Scaled down to ~0.45 to
// sit nicely against the tile, and shaped like the pansy/critters animBee.

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

function paint(ctx: CanvasRenderingContext2D, pIn: P, pose: Pose): void {
  const p = clampP(pIn);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";

    // — contact shadow (soft, lower-right) —
    ctx.fillStyle = `rgba(0,0,0,${0.16 + p.shadowAmt * 0.26})`;
    ctx.beginPath();
    ctx.ellipse(3, 21.5, 15, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();

    drawPad(ctx, p);

    // The mound rides the idle bob + the breeze sway nod. The nod pivots around
    // the planted base so the base stays put while the mound leans/travels.
    ctx.save();
    ctx.translate(pose.swayShift, pose.bob);
    ctx.translate(MOUND_BASE[0], MOUND_BASE[1]);
    ctx.rotate(pose.swayLean);
    ctx.translate(-MOUND_BASE[0], -MOUND_BASE[1]);
    drawBase(ctx, p);
    drawMound(ctx, p, pose.shimmer);
    ctx.restore();

    drawPadDressing(ctx, p);

    // The visiting bee flies in over everything (drawn in plain tile space).
    drawBee(ctx, pose.bee);

    // — global light overlay (cel ambient) —
    if (p.lightAmt > 0.001) {
      ctx.save();
      ctx.globalCompositeOperation = "soft-light";
      const lg = ctx.createRadialGradient(-10, -10, 2, 0, 0, 40);
      lg.addColorStop(0, rgba(p.light, p.lightAmt));
      lg.addColorStop(1, rgba(p.light, 0));
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
  ctx.fillStyle = rgba(p.padDark);
  ctx.beginPath();
  ctx.ellipse(0, cy + 1.6, 18, 5.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.pad);
  ctx.beginPath();
  ctx.ellipse(0, cy, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(p.outline, 0.5);
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = rgba(p.soil);
  ctx.beginPath();
  ctx.ellipse(0, cy - 0.6, 5.5, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = rgba(p.padDark);
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
  ctx.strokeStyle = rgba(mixRGB(p.pad, [255, 255, 255], 0.35), 0.7);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(-2, cy - 0.6, 13, 3, 0, Math.PI * 1.05, Math.PI * 1.9);
  ctx.stroke();
}

// — dressing that sits ON the pad (blossoms, fallen leaves, pad snow) —
function drawPadDressing(ctx: CanvasRenderingContext2D, p: P): void {
  const cy = 19;

  // spring blossoms — pink/white dotted flowers on the grass
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
        ctx.fillStyle = rgba(col, clamp01(a * 1.4));
        ctx.strokeStyle = rgba(p.outline, 0.5 * clamp01(a * 1.4));
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.0, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // a little midrib
        ctx.strokeStyle = rgba(p.outline, 0.4 * a);
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
  const main = Math.sin(Math.PI * q); // 0..1..0
  const antic = -0.18 * Math.sin(2 * Math.PI * q) * (1 - q); // tiny early counter-lean
  return main + antic;
}

// Idle timing.
const SWAY_PERIOD = 6.0; // common breeze sway every ~6s
const SWAY_WIN = 0.95; // ~0.95s window
const BEE_PERIOD = 18.0; // rare bee visit every ~18s
const BEE_WIN = 1.25; // ~1.25s window
const BEE_PHASE = 3.0; // offset so the bee doesn't collide with the first sway

/** Build the live pose for time `t` (seconds). Mostly REST; a breeze sway every
 *  ~6s and a bee visit every ~18s. Returns a fresh Pose (REST is never mutated). */
function poseFromClock(t: number, season: SeasonName): Pose {
  const tt = safeNum(t);
  const p = SP[season];

  // — COMMON: breeze sway (~6s). The mound leans + travels ~11–14px off base. —
  let swayLean = 0;
  let swayShift = 0;
  let bob = 0;
  let shimmer = 0;
  const qs = actionQ(tt, SWAY_PERIOD, SWAY_WIN, 0);
  if (qs >= 0) {
    const s = swayShape(qs); // ~ -0.18 .. 1 .. 0
    // The bloom crown sits ~12px above the base; lean ≈ 0.34 rad → ~13px of
    // crown travel. A clearly-bold nod, not a nudge.
    swayLean = s * 0.34; // up to ~19.5°
    swayShift = s * 5.0; // extra horizontal travel of the whole mound
    bob = -Math.abs(s) * 1.4; // a little lift as it leans (follow-through)
    shimmer = Math.max(shimmer, Math.sin(Math.PI * qs)); // spikes shimmer with the gust
  }

  // — spike shimmer also rides the common cadence on spring/summer —
  if (p.glossAmt > 0.01) {
    const qg = actionQ(tt, SWAY_PERIOD, SWAY_WIN, 0);
    shimmer = Math.max(shimmer, qg >= 0 ? Math.sin(Math.PI * qg) : 0);
  }

  // — RARE: visiting bee (~18s). Flies in from the right, hovers at the flowers,
  //   flies off to the left. Off-screen + alpha 0 at the window edges. —
  const bee: BeeState = { on: false, x: 0, y: 0, flap: 0.5, t: 0, alpha: 0 };
  const qb = actionQ(tt, BEE_PERIOD, BEE_WIN, BEE_PHASE);
  if (qb >= 0) {
    bee.on = true;
    bee.t = tt; // continuous local time for wing/antennae motion
    // Fast wing-flap (animBee idiom).
    bee.flap = 0.45 + Math.abs(Math.sin(tt * 22)) * 0.75;

    // Flight path: enter from the right (x≈+34), ease to a hover at the flowers
    // (x≈+8, y≈-2), linger, then exit to the left (x≈-34). Endpoints are well
    // off the −24..+24 box so it reads as flying in and away.
    const ENTER_X = 34;
    const HOVER_X = 8;
    const EXIT_X = -34;
    const HOVER_Y = MOUND_CY - 6;
    if (qb < 0.42) {
      // fly in (ease-out toward hover)
      const k = smoother(qb / 0.42);
      bee.x = ENTER_X + (HOVER_X - ENTER_X) * k;
      bee.y = -16 + (HOVER_Y - -16) * k + Math.sin(qb * 18) * 1.2;
    } else if (qb < 0.62) {
      // hover at the flowers (gentle bob/drift, animBee idiom)
      const h = (qb - 0.42) / 0.2;
      bee.x = HOVER_X + Math.sin(h * Math.PI * 2) * 1.6;
      bee.y = HOVER_Y + Math.sin(tt * 3.0) * 1.8;
    } else {
      // fly off to the left (ease-in)
      const k = smoother((qb - 0.62) / 0.38);
      bee.x = HOVER_X + (EXIT_X - HOVER_X) * k;
      bee.y = HOVER_Y + (-18 - HOVER_Y) * k - Math.sin(k * 6) * 1.4;
    }
    // Fade fully at the very window edges so it's invisible at the seams.
    bee.alpha = Math.min(1, Math.sin(Math.PI * qb) * 3);
  }

  return { bob, swayLean, swayShift, shimmer, bee };
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
 *  mid-tone so the colour shift reads as a crossfade. 0 at p=0, 1 at p=1. */
function stagedEase(p: number): number {
  const s = smoother(clamp01(p));
  const pull = Math.sin(Math.PI * s) * 0.08;
  return clamp01(s + pull * (0.5 - s) * 2);
}

function makeTransition(from: SeasonName, to: SeasonName) {
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const p = clamp01(safeNum(pp));
    const k = stagedEase(p); // 0 at p=0, 1 at p=1
    const trans = Math.sin(Math.PI * p); // 0 at both ends, peaks at p=0.5
    const lp = lerpP(SP[from], SP[to], k);

    // A through-morph nod: zero at both endpoints (∝ sin(π·p)), so the static
    // endpoints (≡ draw(from)/draw(to)) are untouched.
    const pose: Pose = {
      bob: -0.9 * trans,
      swayLean: 0.05 * trans,
      swayShift: 0,
      shimmer: 0,
      bee: { on: false, x: 0, y: 0, flap: 0.5, t: 0, alpha: 0 },
    };

    ctx.save();
    try {
      paint(ctx, lp, pose);

      // — per-morph transient overlays — all ∝ trans so 0 at both ends —
      ctx.save();
      ctx.translate(pose.swayShift, pose.bob);
      if (to === "Summer") {
        // Spring→Summer: a brief saturating bloom-glow as the colour deepens.
        ctx.globalAlpha = 0.2 * trans;
        ctx.fillStyle = "rgba(255,210,244,1)";
        ctx.beginPath();
        ctx.ellipse(MOUND_CX, MOUND_CY - 1, MOUND_RX * 0.7, MOUND_RY * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (to === "Autumn") {
        // Summer→Autumn: a few mauve-rust motes lift off the bloom crown.
        ctx.fillStyle = `rgba(150,96,60,${0.55 * trans})`;
        for (const [mx, my, ph] of [[-5, -6, 0], [4, -7, 1.7], [6, -1, 3.1]] as const) {
          const rise = trans * 3;
          ctx.beginPath();
          ctx.arc(MOUND_CX + mx + Math.sin(ph) * 1.5, MOUND_CY + my - rise, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Autumn→Winter: frost dusts in + a few flakes settle. The snow cap
        // itself rides the lerped snowCapAmt/padSnowAmt in `lp` (exact at p=1).
        ctx.fillStyle = `rgba(236,246,255,${0.7 * trans})`;
        for (const [fx, fy] of [[-5, -7], [-0.5, -9], [4, -7.5], [-7, -3], [6, -3.5]] as const) {
          ctx.beginPath();
          ctx.arc(MOUND_CX + fx, MOUND_CY + fy, 0.9, 0, Math.PI * 2);
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
      ctx.globalCompositeOperation = "source-over";
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
