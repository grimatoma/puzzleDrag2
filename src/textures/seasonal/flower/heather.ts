// Production seasonal art for the HEATHER flower board tile — the approved bold
// direction, redrawn to commit the silhouette UNMISTAKABLY to heather. The SAME
// heather-clump silhouette in every season (identity rule §36: same low
// woody-sprig clump all four seasons — never a bare stub, never morphing into
// something else): several upright WOODY SPRIGS rising from a small pad, each
// stem lined with fine needle foliage and densely stacked tiny BELL-SHAPED
// florets up its length (the signature dense little purple-pink bells of a
// heath). Seasonal change is bold COLOUR + frost/snow/light PROPS only; the
// upright woody-sprig + bell-floret structure stays recognizable every season.
//
//   • SEASONS read at a glance — colour pushed HARD plus a real seasonal cue:
//       Spring — fresh GREEN woody sprigs with the FIRST pink-purple bell buds
//                opening up the stems, a few stray blossoms on the pad; cool-bright.
//       Summer — PEAK bloom: the sprigs blazing with saturated PURPLE-MAGENTA
//                bell florets (its signature), high gloss, warm bright light.
//       Autumn — bells fading to rusty mauve/bronze, foliage bronzing, a fallen
//                leaf on the pad, dulled gloss, amber light.
//       Winter — frost-dusted heather: a light snow cap on the upright tips +
//                frost on the bells, the woody sprig STRUCTURE clearly visible
//                beneath with its dried purple-tinted bells, cool blue-grey light.
//                Frosted, never a bare stub or a white-out — still reads as heather.
//
//   • IDLE is mostly at rest, then a clearly-noticeable fun ACTION on a timer:
//       COMMON  (~6s, ~0.95s window): a BREEZE SWAY — the whole clump leans and
//                nods ~13px off the base with anticipation + follow-through,
//                bells shimmer, then returns to rest with zero velocity (seamless).
//       RARE    (~18s, ~1.25s window, +3s phase): a VISITING BEE flies in from
//                one side, hovers at the bells (fast wing-flap, animBee idiom),
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
  flowerLow: RGB; // bell florets low on each sprig (lightest pink-purple)
  flowerMid: RGB; // bell florets mid sprig (the signature purple-magenta)
  flowerTop: RGB; // bell florets near the sprig tip (deepest)
  flowerHi: RGB; // tiny bell highlight
  foliage: RGB; // fine needle foliage (lit)
  foliageDark: RGB; // needle foliage shade / sprig underside
  stem: RGB; // woody stem / lower twigs
  stemDark: RGB; // woody stem shade
  pad: RGB; // grass pad top
  padDark: RGB; // pad underside / shaded grass
  soil: RGB; // soil rim under the pad
  outline: RGB; // soft dark outline tint
  light: RGB; // ambient light tint (overlay on whole tile)
  // scalars 0..1 (props + filter amounts; all interpolate)
  lightAmt: number; // strength of the light overlay
  shadowAmt: number; // contact-shadow strength
  bloomAmt: number; // how open/dense the bell florets read (never a stub)
  foliageShow: number; // how much bare needle foliage peeks through (autumn/winter up)
  glossAmt: number; // dewy/glossy highlight strength (spring/summer)
  frostAmt: number; // frost flecks on the bells + tips (winter)
  snowCapAmt: number; // snow caps on the upright sprig tips (winter)
  padSnowAmt: number; // snow blanket on the pad (winter)
  blossomAmt: number; // pink/white blossoms ON the pad (spring)
  fallenLeafAmt: number; // fallen leaves ON the pad (autumn)
  edgeBrownAmt: number; // bronzing/fading on the bells + foliage (autumn)
}

// ── Per-season parameter sets (silhouette constant; only these change) ────────
// Colour is pushed harder than a subtle base: a punchy saturated purple-magenta
// at peak, a clearly rusty bronzed autumn, a distinctly cool snow-blued winter.

const SP: Record<SeasonName, P> = {
  // Spring — fresh green sprigs, FIRST pink-purple bell buds opening; cool-bright.
  Spring: {
    flowerLow: [236, 176, 222],
    flowerMid: [214, 122, 196],
    flowerTop: [170, 78, 168],
    flowerHi: [252, 222, 244],
    foliage: [104, 184, 70],
    foliageDark: [50, 104, 40],
    stem: [128, 104, 66],
    stemDark: [80, 62, 38],
    pad: [132, 222, 100],
    padDark: [70, 150, 60],
    soil: [96, 66, 36],
    outline: [38, 46, 30],
    light: [222, 240, 255], // cool-bright
    lightAmt: 0.18,
    shadowAmt: 0.2,
    bloomAmt: 0.5,
    foliageShow: 0.6,
    glossAmt: 0.5,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
    edgeBrownAmt: 0,
  },
  // Summer — PEAK bloom: saturated PURPLE-MAGENTA signature, high gloss, warm light.
  Summer: {
    flowerLow: [240, 150, 220],
    flowerMid: [216, 64, 188], // signature saturated purple-magenta
    flowerTop: [156, 40, 168],
    flowerHi: [255, 206, 242],
    foliage: [70, 150, 52],
    foliageDark: [34, 86, 30],
    stem: [118, 96, 58],
    stemDark: [72, 56, 32],
    pad: [80, 184, 74],
    padDark: [44, 122, 48],
    soil: [88, 58, 30],
    outline: [34, 40, 28],
    light: [255, 244, 200], // warm, strong
    lightAmt: 0.16,
    shadowAmt: 0.38,
    bloomAmt: 1,
    foliageShow: 0.28,
    glossAmt: 0.55,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    edgeBrownAmt: 0,
  },
  // Autumn — bells fading to rusty mauve/bronze, foliage bronzing; amber light.
  Autumn: {
    flowerLow: [200, 142, 150],
    flowerMid: [176, 104, 118], // faded rusty mauve
    flowerTop: [142, 80, 92],
    flowerHi: [212, 168, 150],
    foliage: [140, 130, 60], // bronzing olive
    foliageDark: [92, 76, 32],
    stem: [104, 78, 46],
    stemDark: [66, 48, 26],
    pad: [148, 156, 82],
    padDark: [100, 104, 52],
    soil: [92, 60, 30],
    outline: [54, 44, 30],
    light: [255, 214, 150], // low amber, pushed
    lightAmt: 0.24,
    shadowAmt: 0.28,
    bloomAmt: 0.82,
    foliageShow: 0.55,
    glossAmt: 0.12,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
    edgeBrownAmt: 0.9,
  },
  // Winter — frost-dusted heather: light snow caps on the upright tips + frost on
  // the bells, dried purple-tinted florets and the woody sprig STRUCTURE clearly
  // visible beneath, snow-blued pad. Still clearly heather, never a white-out.
  Winter: {
    flowerLow: [196, 176, 208],
    flowerMid: [160, 130, 184], // dried, still purple-tinted
    flowerTop: [124, 100, 156],
    flowerHi: [224, 214, 232],
    foliage: [120, 134, 116], // greyed sage
    foliageDark: [70, 84, 74],
    stem: [110, 98, 86],
    stemDark: [72, 62, 54],
    pad: [212, 226, 240], // snow-blued grass
    padDark: [150, 170, 192],
    soil: [110, 104, 96],
    outline: [62, 66, 76],
    light: [204, 224, 250], // cool blue-grey
    lightAmt: 0.24,
    shadowAmt: 0.16,
    bloomAmt: 0.6,
    foliageShow: 0.5,
    glossAmt: 0,
    frostAmt: 0.9,
    snowCapAmt: 0.85,
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
    stemDark: mixRGB(a.stemDark, b.stemDark, k),
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
  bob: number; // vertical breathing/idle offset of the clump (design px)
  swayLean: number; // breeze nod: radians the clump leans off the base
  swayShift: number; // breeze nod: horizontal travel of the clump (design px)
  shimmer: number; // 0..1 bell-shimmer swell (spring/summer)
  bee: BeeState;
}

const REST: Pose = {
  bob: 0,
  swayLean: 0,
  swayShift: 0,
  shimmer: 0,
  bee: { on: false, x: 0, y: 0, flap: 0.5, t: 0, alpha: 0 },
};

// ── Constant clump geometry (silhouette identical every season) ───────────────
//
// Heather reads as several UPRIGHT WOODY SPRIGS rising from a planted base and
// fanning out a touch, each lined with tiny stacked bell florets up its top
// two-thirds and short needle foliage along it. The clump pivots around its base
// so a sway leaves the base planted. Sprigs and their florets are placed once
// into stable lists; only how each is rendered changes with `p`.

const CLUMP_BASE: [number, number] = [0, 16]; // pivot (planted base)

// One upright sprig: a slightly-bowed woody stem from a base offset, leaning by
// `lean` (radians off vertical, + = toward +x), reaching height `h`. Florets
// stack along its upper portion; needles line its lower/mid portion.
interface Sprig {
  bx: number; // base x at the clump foot
  lean: number; // lean off vertical (radians; + = toward +x)
  h: number; // stem length (design px)
  bow: number; // sideways bow of the stem midpoint (design px)
  seed: number; // per-sprig phase for shimmer / bell jitter
}

// A fixed fan of upright sprigs — taller in the middle, shorter + more splayed
// at the sides, so the clump silhouette reads as a heath tuft, not a dome.
const SPRIGS: Sprig[] = [
  { bx: -5.2, lean: -0.5, h: 19, bow: -1.6, seed: 0.11 },
  { bx: -2.6, lean: -0.26, h: 24, bow: -0.8, seed: 0.42 },
  { bx: 0.2, lean: -0.04, h: 27, bow: 0.0, seed: 0.73 },
  { bx: 2.4, lean: 0.2, h: 25, bow: 0.7, seed: 0.27 },
  { bx: 5.0, lean: 0.46, h: 20, bow: 1.5, seed: 0.58 },
  { bx: 1.0, lean: 0.08, h: 22, bow: -0.4, seed: 0.9 }, // a fill sprig behind centre
];

/** A point along a sprig's bowed stem at parameter f (0 = base, 1 = tip), in the
 *  clump's local frame (base of the clump at origin, growing upward into −y). */
function sprigPoint(s: Sprig, f: number): [number, number] {
  const g = clamp01(f);
  // straight axis from base, leaning off vertical
  const ax = s.bx + Math.sin(s.lean) * s.h * g;
  const ay = -Math.cos(s.lean) * s.h * g;
  // add a gentle sideways bow that peaks mid-stem (sin), 0 at both ends
  const bend = Math.sin(Math.PI * g) * s.bow;
  return [ax + bend, ay];
}

// ── Drawing the heather clump (silhouette constant; colour/props from p) ───────

/** A single upright sprig: woody stem + needle foliage + a dense run of tiny
 *  bell florets up its top two-thirds. Drawn in the clump's local frame (base at
 *  origin). `shimmer` nudges bell angles a touch (spring/summer liveliness). */
function drawSprig(ctx: CanvasRenderingContext2D, p: P, s: Sprig, shimmer: number): void {
  const open = clamp01(p.bloomAmt);
  const brown = clamp01(p.edgeBrownAmt);
  const fShow = clamp01(p.foliageShow);

  // — woody stem: a dark base stroke then a lit thinner one (layered for depth) —
  const segs = 8;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= segs; i++) pts.push(sprigPoint(s, i / segs));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = rgba(p.stemDark);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
  ctx.strokeStyle = rgba(p.stem);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();

  // — fine needle foliage: short paired needles along the lower/mid stem —
  const needleN = 5;
  for (let i = 0; i < needleN; i++) {
    const f = 0.12 + (i / needleN) * 0.6; // lower/mid stem only
    if (i / needleN > fShow + 0.5) continue;
    const [nx, ny] = sprigPoint(s, f);
    // tangent direction along the stem (for outward needle angle)
    const [nx2, ny2] = sprigPoint(s, Math.min(1, f + 0.06));
    const tx = nx2 - nx;
    const ty = ny2 - ny;
    const tl = Math.hypot(tx, ty) || 1;
    const ux = tx / tl;
    const uy = ty / tl;
    // perpendicular (rotate tangent 90°), needles splay both sides
    for (const side of [-1, 1] as const) {
      const px = -uy * side;
      const py = ux * side;
      const nl = 2.6;
      ctx.strokeStyle = rgba(p.foliageDark, 0.9);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.lineTo(nx + px * nl - ux * 0.8, ny + py * nl - uy * 0.8);
      ctx.stroke();
      ctx.strokeStyle = rgba(p.foliage, 0.95);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.lineTo(nx + px * nl - ux * 0.8, ny + py * nl - uy * 0.8);
      ctx.stroke();
    }
  }

  // — the dense run of tiny BELL florets up the top two-thirds of the sprig —
  //   each a little nodding bell; colour tier from height; openness from bloom. —
  const bellN = 7;
  for (let i = 0; i < bellN; i++) {
    const f = 0.4 + (i / (bellN - 1)) * 0.6; // top two-thirds
    const tier = clamp01(f); // higher up = deeper tier
    const [bx, by] = sprigPoint(s, f);
    // tangent for the bell's hang direction (bells nod outward/down off the stem)
    const [bx2, by2] = sprigPoint(s, Math.min(1, f + 0.05));
    const tx = bx2 - bx;
    const ty = by2 - by;
    const tl = Math.hypot(tx, ty) || 1;
    const ux = tx / tl;
    const uy = ty / tl;
    const side = i % 2 === 0 ? 1 : -1; // alternate sides up the stem
    // outward perpendicular offset so bells line the stem, not sit on its axis
    const ox = -uy * side;
    const oy = ux * side;

    const tierCol = tier > 0.66 ? p.flowerTop : tier > 0.34 ? p.flowerMid : p.flowerLow;
    const col = brown > 0.01 ? mixRGB(tierCol, [148, 96, 56], 0.45 * brown) : tierCol;
    // shimmer adds a tiny live wobble (spring/summer); 0 at rest
    const sh = clamp01(shimmer) * Math.sin((s.seed + i * 0.21 + shimmer) * Math.PI * 2) * 0.5;
    const bw = (0.85 + open * 0.7) * (0.92 + tier * 0.12); // bell half-width
    const bh = (1.15 + open * 0.6) * (0.92 + tier * 0.12); // bell half-height
    const cx = bx + ox * (1.0 + open * 0.5) + sh;
    const cy = by + oy * (1.0 + open * 0.5);
    // the bell hangs roughly along the outward perpendicular
    const ang = Math.atan2(oy, ox) + Math.PI / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    // bell body (a small rounded urn)
    ctx.fillStyle = rgba(col);
    ctx.strokeStyle = rgba(p.outline, 0.5);
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, bw, bh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // tiny highlight on the upper-left of the bell
    ctx.fillStyle = rgba(p.flowerHi, 0.8);
    ctx.beginPath();
    ctx.arc(-bw * 0.38, -bh * 0.38, bw * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.lineCap = "butt";
}

/** The whole heather clump: the upright sprigs in back-to-front order, plus the
 *  seasonal gloss / frost / snow-cap dressing on the upright tips. `shimmer` is
 *  the live bell-shimmer swell (0 at rest). Drawn in the clump's local frame. */
function drawClump(ctx: CanvasRenderingContext2D, p: P, shimmer: number): void {
  // Draw the fill sprig first (behind), then the fan front-to-back by lean so
  // the silhouette layers cleanly. Order is fixed → constant silhouette.
  const order = [5, 0, 4, 1, 3, 2]; // back fill, outer sides, inner, centre last
  for (const idx of order) drawSprig(ctx, p, SPRIGS[idx], shimmer);

  // — dewy / glossy sheen over the bloom crown (spring/summer) — static seed
  //   from glossAmt plus the live shimmer swell. —
  const gl = clamp01(p.glossAmt) * 0.5 + clamp01(shimmer) * 0.45;
  if (gl > 0.01) {
    ctx.fillStyle = rgba([255, 255, 255], 0.14 + gl * 0.36);
    const [tx, ty] = sprigPoint(SPRIGS[2], 0.82);
    ctx.beginPath();
    ctx.ellipse(tx - 2, ty - 1, 3.6, 1.8, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // — frost flecks scattered over the bells + tips (winter) —
  if (p.frostAmt > 0.01) {
    ctx.fillStyle = rgba([236, 244, 255], 0.6 * p.frostAmt);
    for (const s of SPRIGS) {
      for (const f of [0.55, 0.78, 0.96] as const) {
        const [fx, fy] = sprigPoint(s, f);
        ctx.beginPath();
        ctx.arc(fx - 0.4, fy - 0.6, 0.7 + f * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // — light SNOW CAPS resting on the upright sprig TIPS (winter) — a soft cap on
  //   each tip; the sprig structure + bells below stay clearly visible (no
  //   white-out, no bare stub). —
  if (p.snowCapAmt > 0.01) {
    const s = clamp01(p.snowCapAmt);
    for (const sp of SPRIGS) {
      const [tx, ty] = sprigPoint(sp, 1);
      // a little mounded cap sitting on the tip
      ctx.fillStyle = rgba([250, 253, 255], 0.95 * s);
      ctx.beginPath();
      ctx.ellipse(tx, ty - 1.2, 2.6 * (0.7 + 0.3 * s), 1.8 * (0.7 + 0.3 * s), 0, 0, Math.PI * 2);
      ctx.fill();
      // cool underside shade of the cap
      ctx.fillStyle = rgba([206, 222, 240], 0.45 * s);
      ctx.beginPath();
      ctx.ellipse(tx, ty - 0.2, 2.2 * (0.7 + 0.3 * s), 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Short woody twigs + a little leaf litter at the foot of the clump — anchors
 *  the sprigs to the pad. Drawn in the clump's local frame (base at origin). */
function drawBase(ctx: CanvasRenderingContext2D, p: P): void {
  ctx.strokeStyle = rgba(p.stemDark);
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  for (const [dx, dy] of [[-4, 2.5], [0, 3], [4, 2.5]] as const) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(dx * 0.5, 1.5, dx, dy);
    ctx.stroke();
  }
  // a small woody knot where the sprigs meet
  ctx.fillStyle = rgba(p.stem);
  ctx.beginPath();
  ctx.ellipse(0, 0.4, 3.2, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
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

    // The clump rides the idle bob + the breeze sway nod. The nod pivots around
    // the planted base so the base stays put while the clump leans/travels. The
    // sprigs are drawn in the clump's local frame (base at origin), so translate
    // to the base before drawing.
    ctx.save();
    ctx.translate(pose.swayShift, pose.bob);
    ctx.translate(CLUMP_BASE[0], CLUMP_BASE[1]);
    ctx.rotate(pose.swayLean);
    drawBase(ctx, p);
    drawClump(ctx, p, pose.shimmer);
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

  // — COMMON: breeze sway (~6s). The clump leans + travels ~11–14px off base. —
  let swayLean = 0;
  let swayShift = 0;
  let bob = 0;
  let shimmer = 0;
  const qs = actionQ(tt, SWAY_PERIOD, SWAY_WIN, 0);
  if (qs >= 0) {
    const s = swayShape(qs); // ~ -0.18 .. 1 .. 0
    // The tallest sprig tips sit ~27px above the base; a lean of ~0.32 rad gives
    // ~9px of tip travel plus the shift → a clearly-bold nod, not a nudge.
    swayLean = s * 0.3; // up to ~17°
    swayShift = s * 4.6; // extra horizontal travel of the whole clump
    bob = -Math.abs(s) * 1.4; // a little lift as it leans (follow-through)
    shimmer = Math.max(shimmer, Math.sin(Math.PI * qs)); // bells shimmer with the gust
  }

  // — bell shimmer also rides the common cadence on spring/summer —
  if (p.glossAmt > 0.01) {
    const qg = actionQ(tt, SWAY_PERIOD, SWAY_WIN, 0);
    shimmer = Math.max(shimmer, qg >= 0 ? Math.sin(Math.PI * qg) : 0);
  }

  // — RARE: visiting bee (~18s). Flies in from the right, hovers at the bells,
  //   flies off to the left. Off-screen + alpha 0 at the window edges. —
  const bee: BeeState = { on: false, x: 0, y: 0, flap: 0.5, t: 0, alpha: 0 };
  const qb = actionQ(tt, BEE_PERIOD, BEE_WIN, BEE_PHASE);
  if (qb >= 0) {
    bee.on = true;
    bee.t = tt; // continuous local time for wing/antennae motion
    // Fast wing-flap (animBee idiom).
    bee.flap = 0.45 + Math.abs(Math.sin(tt * 22)) * 0.75;

    // Flight path: enter from the right (x≈+34), ease to a hover at the bells
    // (x≈+6, y≈-10), linger, then exit to the left (x≈-34). Endpoints are well
    // off the −24..+24 box so it reads as flying in and away.
    const ENTER_X = 34;
    const HOVER_X = 6;
    const EXIT_X = -34;
    const HOVER_Y = -10; // up among the upright bell florets
    if (qb < 0.42) {
      // fly in (ease-out toward hover)
      const k = smoother(qb / 0.42);
      bee.x = ENTER_X + (HOVER_X - ENTER_X) * k;
      bee.y = -18 + (HOVER_Y - -18) * k + Math.sin(qb * 18) * 1.2;
    } else if (qb < 0.62) {
      // hover at the bells (gentle bob/drift, animBee idiom)
      const h = (qb - 0.42) / 0.2;
      bee.x = HOVER_X + Math.sin(h * Math.PI * 2) * 1.6;
      bee.y = HOVER_Y + Math.sin(tt * 3.0) * 1.8;
    } else {
      // fly off to the left (ease-in)
      const k = smoother((qb - 0.62) / 0.38);
      bee.x = HOVER_X + (EXIT_X - HOVER_X) * k;
      bee.y = HOVER_Y + (-20 - HOVER_Y) * k - Math.sin(k * 6) * 1.4;
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
      // anchor overlays near the clump crown (in tile space, above the base)
      const CROWN_X = 0;
      const CROWN_Y = -8;
      if (to === "Summer") {
        // Spring→Summer: a brief saturating bloom-glow as the bells deepen.
        ctx.globalAlpha = 0.2 * trans;
        ctx.fillStyle = "rgba(255,210,244,1)";
        ctx.beginPath();
        ctx.ellipse(CROWN_X, CROWN_Y, 11, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (to === "Autumn") {
        // Summer→Autumn: a few mauve-rust motes lift off the bell crown.
        ctx.fillStyle = `rgba(150,96,60,${0.55 * trans})`;
        for (const [mx, my, ph] of [[-5, -6, 0], [4, -7, 1.7], [6, -1, 3.1]] as const) {
          const rise = trans * 3;
          ctx.beginPath();
          ctx.arc(CROWN_X + mx + Math.sin(ph) * 1.5, CROWN_Y + my - rise, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Autumn→Winter: frost dusts in + a few flakes settle. The snow caps
        // themselves ride the lerped snowCapAmt/padSnowAmt in `lp` (exact at p=1).
        ctx.fillStyle = `rgba(236,246,255,${0.7 * trans})`;
        for (const [fx, fy] of [[-5, -7], [-0.5, -9], [4, -7.5], [-7, -3], [6, -3.5]] as const) {
          ctx.beginPath();
          ctx.arc(CROWN_X + fx, CROWN_Y + fy, 0.9, 0, Math.PI * 2);
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
