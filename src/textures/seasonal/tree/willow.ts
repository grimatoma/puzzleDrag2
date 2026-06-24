// BOLD seasonal art for the WEEPING WILLOW tree board tile (`tile_tree_willow`).
//
// A louder, more legible variant built to the APPROVED "bold & fun" direction
// (mirrors oak.bold.ts: bold seasons + light props + a two-tier WC3 idle driven
// by a deterministic `actionQ` clock). Same weeping willow EVERY season — the
// trunk + rounded crown are constant; only the trailing fronds change colour and
// (in winter) THIN toward sparse bare drooping strands. The weeping curtain is
// the identity + palette lock.
//
//   Spring — cool-bright light; pale FRESH-green trailing fronds (lighter, a
//            touch thinner) + a pink/white BLOSSOM puff nestled in the crown.
//   Summer — PEAK: saturated mid-green pad, FULL lush green cascade (densest),
//            warm light, strong shadow; the stout trunk reads at the base.
//   Autumn — low amber light; the trailing strands turn vivid YELLOW (gold→amber)
//            + a steady shed of a few strands/leaves drifting down.
//   Winter — cool blue-grey light; bare drooping strands with FROST, a light SNOW
//            LOAD riding the strand tops + branch/crown tops, a hanging ICICLE,
//            and a snow + frost-sparkle pad. Clearly wintry; still a willow.
//
// IDLE is mostly at rest, then on a deterministic clock:
//   COMMON  (~every 6 s, ~1.2 s window): the trailing strands SWAY as a TRAVELLING
//     WAVE — the signature willow drift. The wave runs down each strand (the tip
//     lags the anchor by a phase proportional to depth) with ~12–16 px tip travel,
//     anticipation→settle, returning to the rest pose with ZERO velocity at the
//     window edges (seamless). A small settle-bob accompanies it.
//   RARE    (~every 18 s, ~1.3 s window): a small BIRD flits in, perches on the
//     crown, looks around, then flits up-and-off (gone by the window edge) — EXCEPT
//     in AUTUMN, where the rare action is instead a GUST that sheds a flurry of
//     yellow strand-leaves off the canopy. Both are bell-enveloped (0 at ends).
//
// Origin-centered in the ~-24..+24 design box; the tree grows UP (negative y)
// from a trunk base near y≈+19 (pad center) and the fronds trail back DOWN.
// Reads at ~58 px. Animations are deterministic (sin/cos/modulo of `t` seconds)
// and seamless; the idle clock may paint a hair outside the box (bird/flurry).

import type { SeasonalTileEntry, SeasonalTransitionSet, SeasonName } from "../types.js";

// ── Small math / clock helpers ───────────────────────────────────────────────

type RGB = [number, number, number];

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f;
}

function lerp3(a: RGB, b: RGB, f: number): RGB {
  return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
}

function rgb(c: RGB, alpha = 1): string {
  const r = Math.round(clamp01(c[0] / 255) * 255);
  const g = Math.round(clamp01(c[1] / 255) * 255);
  const b = Math.round(clamp01(c[2] / 255) * 255);
  return `rgba(${r},${g},${b},${clamp01(alpha)})`;
}

function scale3(c: RGB, k: number): RGB {
  return [c[0] * k, c[1] * k, c[2] * k];
}

// Perlin-style smootherstep for transition + sub-action pacing.
const smoother = (x: number): number => {
  const c = clamp01(x);
  return c * c * c * (c * (6 * c - 15) + 10);
};

// Deterministic action clock. Returns a phase in [0,1) WHILE inside the action
// window (length `win` s, repeating every `period`), or −1 at rest.
function actionQ(t: number, period: number, win: number, phase: number): number {
  const c = (((t + phase) % period) + period) % period;
  return c < win ? c / win : -1;
}

// One-shot bell: 0→1→0 over the window with ZERO velocity at both ends (sin²).
function bell(q: number): number {
  if (q < 0) return 0;
  const s = Math.sin(Math.PI * clamp01(q));
  return s * s;
}

// Signed lean: rises, peaks, returns — zero value AND zero slope at q=0 and q=1.
function leanEnvelope(q: number): number {
  if (q < 0) return 0;
  return (1 - Math.cos(2 * Math.PI * clamp01(q))) * 0.5;
}

// ── Two-tier idle clock (deterministic, like oak.bold's actionQ) ─────────────
//
// COMMON: the travelling-wave curtain sway, ~every 6 s over a ~1.2 s window.
// RARE:   the bird flit / autumn leaf-shed, ~every 18 s over a ~1.3 s window.
const SWAY_PERIOD = 6.0;
const SWAY_WIN = 1.2;
const SWAY_AMP = 15; // peak strand-TIP travel in design px (BOLD willow drift)

const SPECIAL_PERIOD = 18.0;
const SPECIAL_WIN = 1.3;

// Signed whole-curtain lean driver at time t (the wave's overall direction +
// magnitude); the per-strand traveling phase-lag is applied inside strands().
function swayLeanAt(t: number): number {
  return leanEnvelope(actionQ(t, SWAY_PERIOD, SWAY_WIN, 0));
}

// Small settle-bob that accompanies the sway (seamless: 0 at the window edges).
function swayBobAt(t: number): number {
  return bell(actionQ(t, SWAY_PERIOD, SWAY_WIN, 0)) * 0.9;
}

// ── Tweenable parameter set ──────────────────────────────────────────────────
// NO booleans / season strings inside paint — everything flows from P.

interface P {
  // colours
  frondDark: RGB; // shadowed back strands / crown underside
  frondMid: RGB; // body tone of the trailing strands
  frondLight: RGB; // sunlit front strands / crown top
  bark: RGB; // stout trunk body (lit side)
  barkShade: RGB; // shaded right side of the trunk
  barkLine: RGB; // dark vertical bark furrows
  padGrass: RGB;
  soil: RGB;
  outlineTint: RGB; // soft dark outline colour
  lightTint: RGB; // ambient light wash (cool/warm per season)
  // scalars 0..1
  leafDensity: number; // strand fullness/length (winter ≈ 0 → sparse bare strands)
  catkinAmt: number; // pale buds/catkins shimmer in the crown (spring)
  blossomCrownAmt: number; // pink/white BLOSSOM puff nestled in the crown (spring)
  frostAmt: number; // frost sparkle on pad + strands / cold sheen (winter)
  crownSnowAmt: number; // snow load on crown tops + a little on the trunk (winter)
  strandSnowAmt: number; // light snow load riding the strand tops (winter)
  icicleAmt: number; // a hanging icicle off the crown (winter)
  padSnowAmt: number; // snow blanket over the pad (winter)
  blossomAmt: number; // tiny blossom flecks on the pad (spring)
  fallenLeafAmt: number; // leaves resting on the pad (autumn)
  lightStrength: number; // overall ambient wash strength
  shadowStrength: number; // contact shadow opacity
}

// Four parameter sets. paint() reads ONLY these (+ a bob offset + sway/shimmer).
const SP: Record<"Spring" | "Summer" | "Autumn" | "Winter", P> = {
  // Spring — pale FRESH-green new fronds; airy dewy lime pad + a crown blossom.
  Spring: {
    frondDark: [86, 140, 48],
    frondMid: [148, 206, 78],
    frondLight: [208, 238, 132],
    bark: [120, 92, 58],
    barkShade: [90, 66, 40],
    barkLine: [62, 44, 26],
    padGrass: [128, 206, 86],
    soil: [104, 78, 44],
    outlineTint: [44, 50, 34],
    lightTint: [216, 240, 230], // cool-bright
    leafDensity: 0.74,
    catkinAmt: 0.8,
    blossomCrownAmt: 0.85,
    frostAmt: 0,
    crownSnowAmt: 0,
    strandSnowAmt: 0,
    icicleAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.55,
    fallenLeafAmt: 0,
    lightStrength: 0.24,
    shadowStrength: 0.2,
  },
  // Summer — PEAK: full lush green cascade, densest; warm light, strong shadow.
  Summer: {
    frondDark: [40, 100, 30],
    frondMid: [78, 162, 50],
    frondLight: [156, 212, 88],
    bark: [114, 84, 52],
    barkShade: [84, 60, 36],
    barkLine: [56, 40, 24],
    padGrass: [66, 168, 60],
    soil: [96, 70, 40],
    outlineTint: [32, 48, 26],
    lightTint: [255, 244, 200], // warm
    leafDensity: 1.0,
    catkinAmt: 0,
    blossomCrownAmt: 0,
    frostAmt: 0,
    crownSnowAmt: 0,
    strandSnowAmt: 0,
    icicleAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    lightStrength: 0.26,
    shadowStrength: 0.3,
  },
  // Autumn — vivid YELLOW (gold→amber) trailing strands; olive-tan pad; shed.
  Autumn: {
    frondDark: [176, 122, 28],
    frondMid: [240, 192, 44], // vivid gold-yellow
    frondLight: [255, 230, 110],
    bark: [110, 80, 48],
    barkShade: [82, 58, 34],
    barkLine: [58, 42, 26],
    padGrass: [152, 142, 78],
    soil: [110, 80, 44],
    outlineTint: [56, 44, 22],
    lightTint: [252, 216, 150], // low amber
    leafDensity: 0.84,
    catkinAmt: 0,
    blossomCrownAmt: 0,
    frostAmt: 0,
    crownSnowAmt: 0,
    strandSnowAmt: 0,
    icicleAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.65,
    lightStrength: 0.28,
    shadowStrength: 0.22,
  },
  // Winter — sparse bare drooping strands w/ frost; snow on crown+strands+icicle.
  Winter: {
    frondDark: [118, 124, 116],
    frondMid: [154, 162, 154],
    frondLight: [198, 208, 204],
    bark: [104, 90, 78],
    barkShade: [76, 64, 54],
    barkLine: [52, 46, 42],
    padGrass: [200, 214, 228],
    soil: [120, 126, 136],
    outlineTint: [46, 52, 60],
    lightTint: [208, 224, 242], // cool blue-grey
    leafDensity: 0.2, // sparse bare drooping strands (still reads as a willow)
    catkinAmt: 0,
    blossomCrownAmt: 0,
    frostAmt: 0.85,
    crownSnowAmt: 0.9,
    strandSnowAmt: 0.8,
    icicleAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    lightStrength: 0.22,
    shadowStrength: 0.16,
  },
};

// ── Static geometry shared by every season (the IDENTITY) ────────────────────

// Anchor points along the underside of the rounded crown where the weeping
// strands originate. [anchorX, anchorY, trailLength, baseSway]. The strands all
// trail straight DOWN and overhang the pad width (outer anchors reach wide).
const STRANDS: Array<[number, number, number, number]> = [
  [-16.5, -8.0, 22, 1.30],
  [-13.0, -11.0, 25, 1.15],
  [-9.5, -12.5, 27, 1.00],
  [-6.0, -13.2, 28, 0.90],
  [-2.5, -13.5, 29, 0.82],
  [1.0, -13.5, 29, 0.82],
  [4.5, -13.0, 28, 0.90],
  [8.0, -12.0, 27, 1.00],
  [11.5, -10.5, 25, 1.15],
  [15.0, -7.5, 22, 1.30],
  // a few inner/front strands for layered depth
  [-7.5, -10.0, 24, 0.70],
  [-1.0, -10.5, 25, 0.65],
  [5.5, -10.0, 24, 0.70],
];

// Rounded-crown blob anchors (the dome the strands hang from). [x, y, r].
const CROWN: Array<[number, number, number]> = [
  [-9, -13, 6.0],
  [-2, -16, 6.6],
  [5, -15, 6.4],
  [11, -12, 5.6],
  [-13, -10, 5.0],
  [13, -9, 4.8],
  [0, -11, 5.4],
];

// ── Local paint helpers (all driven by p) ────────────────────────────────────

function padEllipse(ctx: CanvasRenderingContext2D, p: P): void {
  // Soft contact shadow lower-right (willow casts wide).
  ctx.fillStyle = `rgba(0,0,0,${0.24 * p.shadowStrength + 0.04})`;
  ctx.beginPath();
  ctx.ellipse(3, 21.5, 17, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shaded underside of the pad.
  ctx.fillStyle = rgb(scale3(p.padGrass, 0.6), 1);
  ctx.beginPath();
  ctx.ellipse(0, 20.4, 18, 5.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Top grass face.
  ctx.fillStyle = rgb(p.padGrass, 1);
  ctx.beginPath();
  ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tufted edge — little bumps around the rim (skipped under deep snow).
  if (p.padSnowAmt < 0.6) {
    ctx.fillStyle = rgb(scale3(p.padGrass, 1.12), 1 - p.padSnowAmt);
    const tufts = 11;
    for (let i = 0; i < tufts; i++) {
      const a = (i / tufts) * Math.PI * 2;
      const tx = Math.cos(a) * 17;
      const ty = 19 + Math.sin(a) * 4.7;
      if (ty < 17) continue; // only front/lower rim reads
      ctx.beginPath();
      ctx.ellipse(tx, ty, 2.0, 1.3, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Soil core peeking at the trunk base.
  ctx.fillStyle = rgb(p.soil, 1);
  ctx.beginPath();
  ctx.ellipse(0, 19.4, 6.5, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Spring blossom flecks on the grass.
  if (p.blossomAmt > 0.02) {
    const spots: Array<[number, number]> = [
      [-12, 20], [-6, 21.6], [8, 21], [13, 19.6], [2, 22], [-2, 19.6],
    ];
    spots.forEach(([sx, sy], i) => {
      const a = p.blossomAmt * (i % 2 === 0 ? 0.9 : 0.7);
      ctx.fillStyle = `rgba(255,236,246,${clamp01(a)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(248,210,90,${clamp01(a)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.45, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Autumn fallen leaves resting on the pad.
  if (p.fallenLeafAmt > 0.02) {
    const leaves: Array<[number, number, number]> = [
      [-8, 20.4, 0.5], [6, 21.4, -0.4], [-1, 22, 0.2], [11, 20, 0.8],
    ];
    leaves.forEach(([lx, ly, rot], i) => {
      if (i / leaves.length > p.fallenLeafAmt + 0.05) return;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.fillStyle = rgb(p.frondMid, Math.min(1, p.fallenLeafAmt + 0.3));
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.6, 1.1, 0, 0, Math.PI * 2); // long thin willow leaf
      ctx.fill();
      ctx.strokeStyle = rgb(p.outlineTint, 0.4);
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    });
  }

  // Snow blanket over the pad (winter).
  if (p.padSnowAmt > 0.02) {
    const snow = ctx.createLinearGradient(0, 15, 0, 23);
    snow.addColorStop(0, "#eef4fb");
    snow.addColorStop(1, "#c6d6e6");
    ctx.save();
    ctx.globalAlpha = clamp01(p.padSnowAmt);
    ctx.fillStyle = snow;
    ctx.beginPath();
    ctx.ellipse(0, 18.6, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // a couple of snow mounds for a deeper-blanket read
    ctx.fillStyle = "#ffffff";
    ([[-8, 19, 4.6], [7, 20, 4.2], [0, 21, 5.4]] as Array<[number, number, number]>).forEach(
      ([mx, my, mr]) => {
        ctx.beginPath();
        ctx.ellipse(mx, my, mr, mr * 0.5, 0, Math.PI, Math.PI * 2);
        ctx.fill();
      },
    );
    ctx.restore();

    // Frost sparkle flecks.
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = `rgba(255,255,255,${clamp01(0.5 * p.frostAmt + 0.3)})`;
      const sparkle: Array<[number, number]> = [
        [-10, 18], [-4, 20], [3, 19], [9, 20.5], [13, 18.5], [-13, 19.5],
      ];
      sparkle.forEach(([sx, sy], i) => {
        if (i / sparkle.length > p.frostAmt) return;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
}

// The short STOUT willow trunk + vertical bark furrows. Identity every season.
function trunk(ctx: CanvasRenderingContext2D, p: P): void {
  // Outline pass (soft dark) — short and broad, flaring at the roots.
  ctx.fillStyle = rgb(p.outlineTint, 0.9);
  ctx.beginPath();
  ctx.moveTo(-5.6, 19.5);
  ctx.quadraticCurveTo(-5.0, 8, -4.2, -2);
  ctx.quadraticCurveTo(-2.2, -6.5, 0, -6.6);
  ctx.quadraticCurveTo(2.2, -6.5, 4.2, -2);
  ctx.quadraticCurveTo(5.0, 8, 5.6, 19.5);
  ctx.closePath();
  ctx.fill();

  // Shaded (right) half.
  ctx.fillStyle = rgb(p.barkShade, 1);
  ctx.beginPath();
  ctx.moveTo(-4.6, 19);
  ctx.quadraticCurveTo(-4.0, 8, -3.3, -2);
  ctx.quadraticCurveTo(-1.6, -5.6, 0, -5.6);
  ctx.quadraticCurveTo(1.6, -5.6, 3.3, -2);
  ctx.quadraticCurveTo(4.0, 8, 4.6, 19);
  ctx.closePath();
  ctx.fill();

  // Lit (left) bark body.
  ctx.fillStyle = rgb(p.bark, 1);
  ctx.beginPath();
  ctx.moveTo(-4.6, 19);
  ctx.quadraticCurveTo(-4.0, 8, -3.3, -2);
  ctx.quadraticCurveTo(-1.6, -5.6, 0.4, -5.6);
  ctx.quadraticCurveTo(0.1, 6, -0.6, 19);
  ctx.closePath();
  ctx.fill();

  // Root flare (willow has a wide buttressed base).
  ctx.fillStyle = rgb(scale3(p.bark, 0.84), 1);
  ctx.beginPath();
  ctx.moveTo(-4.6, 19);
  ctx.quadraticCurveTo(-8.5, 18.2, -10.5, 19.8);
  ctx.quadraticCurveTo(-6.5, 19.6, -3.8, 18.4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4.6, 19);
  ctx.quadraticCurveTo(8.5, 18.2, 10.5, 19.8);
  ctx.quadraticCurveTo(6.5, 19.6, 3.8, 18.4);
  ctx.closePath();
  ctx.fill();

  // Vertical bark furrows — the signature deep-ridged willow bark.
  ctx.strokeStyle = rgb(p.barkLine, 0.85);
  ctx.lineWidth = 1.0;
  ctx.lineCap = "round";
  const furrows: Array<[number, number]> = [
    [-2.6, 0.2],
    [-0.4, -0.2],
    [2.0, 0.4],
  ];
  furrows.forEach(([fx, lean]) => {
    ctx.beginPath();
    ctx.moveTo(fx, -4.5);
    ctx.quadraticCurveTo(fx + lean, 8, fx + lean * 1.6, 18);
    ctx.stroke();
  });
  ctx.lineCap = "butt";

  // A little snow riding the trunk crown / shoulders (winter).
  if (p.crownSnowAmt > 0.02) {
    ctx.fillStyle = `rgba(244,248,255,${clamp01(0.9 * p.crownSnowAmt)})`;
    ctx.beginPath();
    ctx.ellipse(0, -5.4, 4.4, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// One rounded crown blob: dark underside, lifted mid body, top-left highlight.
function crownBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  p: P,
  alpha: number,
): void {
  if (r < 0.4 || alpha < 0.02) return;
  ctx.save();
  ctx.globalAlpha = clamp01(alpha);
  // dark underside
  ctx.fillStyle = rgb(p.frondDark, 1);
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.2, r, r * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  // mid body lifted up-left
  const grad = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.2, x, y, r);
  grad.addColorStop(0, rgb(p.frondLight, 1));
  grad.addColorStop(0.55, rgb(p.frondMid, 1));
  grad.addColorStop(1, rgb(p.frondDark, 1));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.96, r * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  // bright top-left nub
  ctx.globalAlpha = clamp01(alpha * 0.7);
  ctx.fillStyle = rgb(p.frondLight, 1);
  ctx.beginPath();
  ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.32, r * 0.26, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// The rounded crown dome the strands hang from.
function crown(ctx: CanvasRenderingContext2D, p: P, sway: number, shimmer: number): void {
  const d = clamp01(p.leafDensity);
  // The dome always reads (even bare-ish winter keeps a thin crown), but it
  // shrinks/darkens as density drops.
  const domeA = 0.45 + 0.55 * d;
  CROWN.forEach(([x, y, r], i) => {
    const s = sway * (0.15 + Math.abs(x) / 40) + Math.sin(shimmer + i) * 0.25 * d;
    crownBlob(ctx, x + s, y, r * (0.62 + 0.38 * d), p, domeA);
  });
}

// THE weeping curtain: many long slender strands trailing straight down. This is
// the willow's identity + palette lock. Density scales count/length/opacity so
// winter thins to sparse bare drooping strands without changing the silhouette.
//
// `wave` 0..1 is the COMMON-action travelling-wave amplitude (whole-curtain); the
// wave runs DOWN each strand — the tip lags the anchor by a depth-proportional
// phase so the curtain ripples like a real willow drift. `shimmer` is the tiny
// always-on rustle.
function strands(
  ctx: CanvasRenderingContext2D,
  p: P,
  wave: number,
  shimmer: number,
): void {
  const d = clamp01(p.leafDensity);
  ctx.lineCap = "round";
  STRANDS.forEach(([ax, ay, len, baseSway], i) => {
    // Outer/longer strands thin out first as density drops, so the curtain
    // empties from the fringes and the weeping silhouette stays believable.
    const threshold = (i % 10) / 10; // outer anchors have higher index pressure
    const grow = clamp01((d - threshold * 0.45) / 0.55);
    if (grow < 0.04) return;

    // Strand length retracts a touch in winter but still droops well past the
    // crown so it always reads as "weeping".
    const L = len * (0.62 + 0.38 * grow);
    const tipY = ay + L;

    // Travelling-wave drift: the wave runs down the strand. The MID and TIP lag
    // the anchor (the anchor barely moves — a curtain pinned at the top). Phase
    // lag grows with depth so the ripple visibly travels; per-strand offset `i`
    // keeps neighbours out of lock-step. Tip travel peaks at ~SWAY_AMP px.
    const phase = i * 0.7;
    const tipPhase = wave > 0 ? Math.PI * 0.9 : 0; // tip lags the anchor
    const tipWave = Math.sin(Math.PI * 2 * wave - tipPhase + phase * 0.0);
    const midWave = Math.sin(Math.PI * 2 * wave - tipPhase * 0.5 + phase * 0.0);
    // Envelope the wave by `wave` itself so it's 0 at the window edges; scale by
    // the strand's own responsiveness (baseSway) and a depth taper.
    const env = wave; // 0 at window edges (driven by leanEnvelope upstream)
    const amp = SWAY_AMP * baseSway * (0.55 + 0.45 * grow);
    const tipDrift = tipWave * amp * env + Math.sin(shimmer * 0.8 + phase) * 0.6 * d;
    const midDrift = midWave * amp * 0.5 * env + Math.sin(shimmer * 0.8 + phase) * 0.3 * d;
    const midX = ax + midDrift;
    const tipX = ax + tipDrift;

    // dark back-pass for depth
    ctx.strokeStyle = rgb(p.frondDark, 0.9 * grow);
    ctx.lineWidth = 2.4 * (0.5 + 0.5 * grow);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(midX, ay + L * 0.55, tipX, tipY);
    ctx.stroke();

    // bright body strand
    const col = i % 3 === 0 ? p.frondLight : p.frondMid;
    ctx.strokeStyle = rgb(col, (0.78 + 0.2 * grow) * (0.4 + 0.6 * grow));
    ctx.lineWidth = 1.3 * (0.5 + 0.5 * grow);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(midX, ay + L * 0.55, tipX, tipY);
    ctx.stroke();

    // tiny leaf flecks down the trailing strand (the long thin willow leaves)
    if (grow > 0.35) {
      ctx.fillStyle = rgb(p.frondLight, 0.55 * grow);
      for (let k = 1; k <= 3; k++) {
        const f = k / 4;
        const fx = lerp(ax, tipX, f) + Math.sin(phase + k) * 0.6;
        const fy = ay + L * f;
        ctx.beginPath();
        ctx.ellipse(fx, fy, 0.9, 1.8, tipDrift * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Frost beading along the bare drooping strands (winter).
    if (p.frostAmt > 0.02 && grow < 0.7) {
      ctx.fillStyle = `rgba(228,240,255,${clamp01(0.6 * p.frostAmt)})`;
      const fy = ay + L * 0.78;
      ctx.beginPath();
      ctx.arc(tipX + (midX - tipX) * 0.1, fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // A light SNOW LOAD riding the strand top (winter) — a short bright cap on
    // the upper third of the bare strand, sitting on the windward (left) side.
    if (p.strandSnowAmt > 0.02 && grow < 0.85) {
      ctx.strokeStyle = `rgba(255,255,255,${clamp01(0.85 * p.strandSnowAmt)})`;
      ctx.lineWidth = 1.6 * (0.5 + 0.5 * grow) + 0.6;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(
        ax + (midX - ax) * 0.5,
        ay + L * 0.16,
        ax + (tipX - ax) * 0.32,
        ay + L * 0.32,
      );
      ctx.stroke();
    }
  });
  ctx.lineCap = "butt";

  // Spring catkins / buds: pale flecks nestled in the crown fringe.
  if (p.catkinAmt > 0.02) {
    const anchors: Array<[number, number]> = [
      [-10, -12], [-3, -15], [4, -14], [10, -11], [0, -13], [-6, -10],
    ];
    anchors.forEach(([cx, cy], i) => {
      if (i / anchors.length > p.catkinAmt + 0.1) return;
      const dx = wave * 0.4 + Math.sin(i * 1.3) * 0.4;
      ctx.fillStyle = `rgba(232,232,176,${clamp01(0.85 * p.catkinAmt)})`;
      ctx.beginPath();
      ctx.ellipse(cx + dx, cy, 1.0, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Spring BLOSSOM puff — bold pink/white clouds nestled in the crown.
  if (p.blossomCrownAmt > 0.02) {
    const puffs: Array<[number, number, number]> = [
      [-7, -16, 3.2], [3, -18, 3.0], [9, -13, 2.6], [-2, -13, 2.4],
    ];
    puffs.forEach(([bx, by, br], i) => {
      const s = wave * 0.5 + Math.sin(shimmer + i) * 0.3;
      ctx.save();
      ctx.globalAlpha = clamp01(0.95 * p.blossomCrownAmt);
      ctx.fillStyle = "#f49ac2";
      ctx.beginPath();
      ctx.ellipse(bx + s, by, br, br * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd9ea";
      ctx.beginPath();
      ctx.ellipse(bx + s - br * 0.3, by - br * 0.3, br * 0.45, br * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff4fa";
      for (let k = 0; k < 3; k++) {
        const a = i * 1.6 + k * 2.1;
        ctx.beginPath();
        ctx.arc(bx + s + Math.cos(a) * br * 0.8, by + Math.sin(a) * br * 0.8, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  // Snow load on the crown tops (winter), drawn over the dome.
  if (p.crownSnowAmt > 0.02) {
    ctx.fillStyle = `rgba(244,248,255,${clamp01(0.92 * p.crownSnowAmt)})`;
    const caps: Array<[number, number, number]> = [
      [-7, -17, 5.2], [2, -19, 5.6], [9, -15, 4.6],
    ];
    caps.forEach(([cx, cy, cr]) => {
      ctx.beginPath();
      ctx.ellipse(cx, cy, cr, cr * 0.5, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    });
    // bright crown ridges
    ctx.fillStyle = `rgba(255,255,255,${clamp01(0.8 * p.crownSnowAmt)})`;
    caps.forEach(([cx, cy, cr]) => {
      ctx.beginPath();
      ctx.ellipse(cx - cr * 0.2, cy - 0.6, cr * 0.6, cr * 0.28, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    });
  }

  // A hanging ICICLE off a low-left crown blob (winter), riding the sway a touch.
  if (p.icicleAmt > 0.02) {
    const ix = -9 + wave * 0.6;
    const iy = -7.5;
    const len = 5.4 * clamp01(p.icicleAmt);
    ctx.save();
    const g = ctx.createLinearGradient(ix, iy, ix, iy + len);
    g.addColorStop(0, "rgba(220,238,255,0.95)");
    g.addColorStop(1, "rgba(255,255,255,0.6)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(ix - 1.2, iy);
    ctx.lineTo(ix + 1.2, iy);
    ctx.lineTo(ix, iy + len);
    ctx.closePath();
    ctx.fill();
    // a second smaller icicle on the right shoulder
    const ix2 = 7 + wave * 0.4;
    const iy2 = -5.5;
    const len2 = 3.6 * clamp01(p.icicleAmt);
    const g2 = ctx.createLinearGradient(ix2, iy2, ix2, iy2 + len2);
    g2.addColorStop(0, "rgba(220,238,255,0.9)");
    g2.addColorStop(1, "rgba(255,255,255,0.55)");
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.moveTo(ix2 - 1.0, iy2);
    ctx.lineTo(ix2 + 1.0, iy2);
    ctx.lineTo(ix2, iy2 + len2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// ── THE single parameterized paint ───────────────────────────────────────────
// Whole tile from ONLY p and bob (vertical idle offset; 0 = rest). Never throws.
function paint(
  ctx: CanvasRenderingContext2D,
  p: P,
  bob: number,
  wave = 0,
  shimmer = 0,
): void {
  ctx.save();
  try {
    ctx.globalAlpha = 1;

    // Pad is rooted to the ground (does not bob).
    padEllipse(ctx, p);

    // The tree bobs as one unit (subtle vertical idle).
    ctx.save();
    ctx.translate(0, -bob);
    // Draw order: trunk first, then the dome crown, then the weeping curtain on
    // top so the trailing strands read as the front-most signature element.
    trunk(ctx, p);
    crown(ctx, p, wave, shimmer);
    strands(ctx, p, wave, shimmer);
    ctx.restore();

    // Ambient light wash (cool/warm per season), upper-left bias. Low-alpha
    // overlay; never a white-out.
    if (p.lightStrength > 0.01) {
      const lg = ctx.createRadialGradient(-8, -16, 4, -2, -8, 34);
      lg.addColorStop(0, rgb(p.lightTint, p.lightStrength));
      lg.addColorStop(1, rgb(p.lightTint, 0));
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.ellipse(-2, -6, 27, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } catch {
    // Never throw from a draw callback.
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── Parameter interpolation for transitions ──────────────────────────────────
function lerpP(a: P, b: P, f: number): P {
  return {
    frondDark: lerp3(a.frondDark, b.frondDark, f),
    frondMid: lerp3(a.frondMid, b.frondMid, f),
    frondLight: lerp3(a.frondLight, b.frondLight, f),
    bark: lerp3(a.bark, b.bark, f),
    barkShade: lerp3(a.barkShade, b.barkShade, f),
    barkLine: lerp3(a.barkLine, b.barkLine, f),
    padGrass: lerp3(a.padGrass, b.padGrass, f),
    soil: lerp3(a.soil, b.soil, f),
    outlineTint: lerp3(a.outlineTint, b.outlineTint, f),
    lightTint: lerp3(a.lightTint, b.lightTint, f),
    leafDensity: lerp(a.leafDensity, b.leafDensity, f),
    catkinAmt: lerp(a.catkinAmt, b.catkinAmt, f),
    blossomCrownAmt: lerp(a.blossomCrownAmt, b.blossomCrownAmt, f),
    frostAmt: lerp(a.frostAmt, b.frostAmt, f),
    crownSnowAmt: lerp(a.crownSnowAmt, b.crownSnowAmt, f),
    strandSnowAmt: lerp(a.strandSnowAmt, b.strandSnowAmt, f),
    icicleAmt: lerp(a.icicleAmt, b.icicleAmt, f),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, f),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, f),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, f),
    lightStrength: lerp(a.lightStrength, b.lightStrength, f),
    shadowStrength: lerp(a.shadowStrength, b.shadowStrength, f),
  };
}

// ── A small bird (front-¾) used by the RARE flit special ─────────────────────
// `hop` is its vertical hop offset (px, ≤0 = up), `look` rotates the head, `wing`
// opens the wing for the flit-off. Colours locked (robin-ish). Never throws.
function bird(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hop: number,
  look: number,
  wing: number,
  alpha: number,
): void {
  if (alpha <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = clamp01(alpha);
  ctx.translate(x, y + hop);
  // body
  ctx.fillStyle = "#5a4636";
  ctx.beginPath();
  ctx.ellipse(0, 0, 3.8, 2.9, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // warm breast
  ctx.fillStyle = "#d2693a";
  ctx.beginPath();
  ctx.ellipse(-1.3, 0.6, 2.2, 2.0, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // tail
  ctx.fillStyle = "#46362a";
  ctx.beginPath();
  ctx.moveTo(3.0, -0.4);
  ctx.lineTo(6.6, -1.6);
  ctx.lineTo(6.0, 1.1);
  ctx.closePath();
  ctx.fill();
  // wing (opens during flit-off)
  ctx.save();
  ctx.translate(0.6, -0.4);
  ctx.rotate(-0.5 * wing);
  ctx.fillStyle = "#3d2f24";
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.9 + wing * 1.9, 1.6 + wing * 1.1, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // head (looks around)
  ctx.save();
  ctx.translate(-3.0, -2.2);
  ctx.rotate(look);
  ctx.fillStyle = "#5a4636";
  ctx.beginPath();
  ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // beak
  ctx.fillStyle = "#e2b23a";
  ctx.beginPath();
  ctx.moveTo(-2.0, 0.2);
  ctx.lineTo(-4.0, -0.2);
  ctx.lineTo(-2.0, 0.9);
  ctx.closePath();
  ctx.fill();
  // eye
  ctx.fillStyle = "#0e0a06";
  ctx.beginPath();
  ctx.arc(-0.6, -0.4, 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

// The RARE bird-flit special (Spring/Summer/Winter). The bird drops onto the
// crown, perches and looks around, then opens its wing and flits up-and-off,
// fully gone by the window edge (alpha→0). q in [0,1] across the ~1.3 s window.
function birdSpecial(ctx: CanvasRenderingContext2D, q: number): void {
  if (q < 0) return;
  ctx.save();
  try {
    const anchorX = -8;
    const anchorY = -17; // perched on the crown top-left
    let hop = 0;
    let look = 0;
    let wing = 0;
    let alpha: number;
    let dx = 0;
    let dy = 0;
    if (q < 0.25) {
      const f = q / 0.25;
      alpha = smoother(f);
      dy = -11 * (1 - smoother(f)); // drops down onto the crown from above
      hop = -2 * Math.sin(f * Math.PI);
    } else if (q < 0.7) {
      const f = (q - 0.25) / 0.45;
      alpha = 1;
      look = Math.sin(f * Math.PI * 2) * 0.5; // a couple of look-arounds
      hop = -2.0 * Math.abs(Math.sin(f * Math.PI * 2));
    } else {
      const f = (q - 0.7) / 0.3;
      alpha = 1 - smoother(f); // fades as it leaves → gone by q=1
      wing = Math.abs(Math.sin(f * Math.PI * 3)); // flapping
      dx = 11 * smoother(f); // flits up-and-right, off the crown
      dy = -13 * smoother(f);
      look = 0.3;
    }
    bird(ctx, anchorX + dx, anchorY + dy, hop, look, wing, alpha);
  } catch {
    /* never throw */
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// The RARE autumn special: a GUST that sheds a flurry of yellow strand-leaves OFF
// the canopy, blown down-and-right and fading out. bell()-enveloped (0 at ends).
function leafShedSpecial(ctx: CanvasRenderingContext2D, q: number, p: P): void {
  if (q < 0) return;
  const burst = bell(q);
  if (burst <= 0.001) return;
  ctx.save();
  try {
    const flurry: Array<[number, number, number]> = [
      [-12, -9, 0.2], [-5, -12, 0.6], [3, -11, 0.85], [10, -8, 0.4],
      [-8, -6, 0.95], [1, -13, 0.5], [7, -10, 0.7],
    ];
    flurry.forEach(([fx, fy, hue], i) => {
      const travel = burst;
      const lx = fx + travel * (10 + i * 1.4) + Math.sin(q * Math.PI * 4 + i) * 2;
      const ly = fy + travel * (14 + i) - 2; // drifts DOWN off the curtain
      const col = lerp3(p.frondMid, p.frondLight, hue);
      ctx.save();
      ctx.globalAlpha = burst * 0.95;
      ctx.fillStyle = rgb(col, 1);
      ctx.translate(lx, ly);
      ctx.rotate(q * Math.PI * 6 + i);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.1, 3.0, 0, 0, Math.PI * 2); // long thin willow leaf
      ctx.fill();
      ctx.restore();
    });
  } catch {
    /* never throw */
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── Per-season draw + anim ───────────────────────────────────────────────────

type Season = "Spring" | "Summer" | "Autumn" | "Winter";

function makeDraw(season: Season) {
  // Still pose: rest (no wave, no special) — exactly anim(t) at a clock rest tick.
  return (ctx: CanvasRenderingContext2D): void => paint(ctx, SP[season], 0, 0, 0);
}

// Common-action driver, shared by all seasons: the small settle-bob from the
// deterministic clock plus a faint always-on shimmer so a resting tree isn't
// dead-still. The travelling-wave amplitude (0..1 envelope) is `commonWave`.
function idleCommon(t: number, shimmerRate: number): { bob: number; shimmer: number } {
  return {
    bob: swayBobAt(t),
    shimmer: t * shimmerRate,
  };
}
// The COMMON travelling-wave envelope (0..1): rises and returns to 0 with zero
// velocity at the window edges. strands() multiplies it by SWAY_AMP internally.
function commonWave(t: number): number {
  return swayLeanAt(t);
}

function animSpring(ctx: CanvasRenderingContext2D, t: number): void {
  const { bob, shimmer } = idleCommon(t, 2.4);
  paint(ctx, SP.Spring, bob, commonWave(t), shimmer);
  birdSpecial(ctx, actionQ(t, SPECIAL_PERIOD, SPECIAL_WIN, SPECIAL_PERIOD / 2));
}

function animSummer(ctx: CanvasRenderingContext2D, t: number): void {
  const { bob, shimmer } = idleCommon(t, 1.9);
  paint(ctx, SP.Summer, bob, commonWave(t), shimmer);
  birdSpecial(ctx, actionQ(t, SPECIAL_PERIOD, SPECIAL_WIN, SPECIAL_PERIOD / 2));
}

function animAutumn(ctx: CanvasRenderingContext2D, t: number): void {
  const { bob, shimmer } = idleCommon(t, 1.6);
  paint(ctx, SP.Autumn, bob, commonWave(t), shimmer);

  // Steady ambient shed — 2 yellow strand-leaves drift from the curtain to the
  // pad on a seamless loop (always on, low-key), drawn after the tree.
  ctx.save();
  try {
    const p = SP.Autumn;
    // [startX, fallRate, hueBlend] — distinct rates desync the strands while
    // every one starts at prog 0 (alpha 0) at t=0, so anim(0) matches the
    // leaf-free still and the loop wraps with no visible pop.
    const leaves: Array<[number, number, number]> = [
      [-6, 0.240, 0.55],
      [9, 0.205, 0.35],
    ];
    leaves.forEach(([sx, rate, hb]) => {
      const prog = (t * rate) % 1;
      const ly = -6 + prog * 28; // crown fringe down to the pad
      const lx = sx + Math.sin(prog * Math.PI * 2 + sx) * 6;
      const col = lerp3(p.frondMid, p.frondLight, hb);
      ctx.save();
      ctx.globalAlpha = Math.sin(Math.PI * prog); // fade in at the crown, out at the pad
      ctx.fillStyle = rgb(col, 1);
      ctx.translate(lx, ly);
      ctx.rotate(prog * Math.PI * 2.5 + sx);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.1, 3.0, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  } catch {
    /* never throw */
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // RARE special: a gust sheds a flurry of yellow leaves off the canopy.
  leafShedSpecial(ctx, actionQ(t, SPECIAL_PERIOD, SPECIAL_WIN, SPECIAL_PERIOD / 2), SP.Autumn);
}

function animWinter(ctx: CanvasRenderingContext2D, t: number): void {
  const { bob, shimmer } = idleCommon(t, 0.0);
  // Bare drooping strands are stiffer — damp the wave a touch.
  paint(ctx, SP.Winter, bob * 0.7, commonWave(t) * 0.7, shimmer);

  ctx.save();
  try {
    const span = 36;
    const seeds: Array<[number, number, number]> = [
      [-9, 1.2, 0.0],
      [7, 1.0, 0.5],
      [13, 0.9, 0.7],
    ];
    seeds.forEach(([fx, r, phase]) => {
      const prog = ((t / 3.6 + phase) % 1 + 1) % 1;
      const fy = -24 + prog * span;
      const driftX = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(driftX, fy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    // Gentle cold sheen pulse over the pad.
    const sheen = 0.12 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.7));
    ctx.fillStyle = `rgba(200,224,255,${sheen})`;
    ctx.beginPath();
    ctx.ellipse(-3, 18.6, 11, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  } catch {
    /* never throw */
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // RARE special: a small bird flits in and off (a touch of life in the cold).
  birdSpecial(ctx, actionQ(t, SPECIAL_PERIOD, SPECIAL_WIN, SPECIAL_PERIOD / 2));
}

// ── Transitions: pure parameter tweens (no popping) ──────────────────────────
// transition(0) ≡ draw(from), transition(1) ≡ draw(to). Every field lerps,
// including leafDensity, so the cascade thins/fills and recolours smoothly.
function makeTransition(from: Season, to: Season) {
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const f = smoother(clamp01(pp));
    paint(ctx, lerpP(SP[from], SP[to], f), 0, 0, 0);
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export const VARIANTS: SeasonalTileEntry = {
  Spring: { draw: makeDraw("Spring"), anim: animSpring },
  Summer: { draw: makeDraw("Summer"), anim: animSummer },
  Autumn: { draw: makeDraw("Autumn"), anim: animAutumn },
  Winter: { draw: makeDraw("Winter"), anim: animWinter },
};

export const TRANSITIONS: SeasonalTransitionSet = {
  0: makeTransition("Spring", "Summer"),
  1: makeTransition("Summer", "Autumn"),
  2: makeTransition("Autumn", "Winter"),
};

// Reference the SeasonName type to keep the strict-tsc import meaningful and to
// document that the keys above are exhaustive over the season set.
const _SEASON_KEYS: SeasonName[] = ["Spring", "Summer", "Autumn", "Winter"];
void _SEASON_KEYS;
