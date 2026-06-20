// Seasonal art for the WEEPING WILLOW tree board tile (`tile_tree_willow`).
//
// Built from ONE parameterized paint() so all four seasons share geometry and
// every season→season morph is just a tween of the parameter set — no popping.
//
// IDENTITY (constant every season): a short stout trunk topped by a rounded
// crown from which MANY long slender fronds/strands trail straight DOWN — the
// signature weeping curtain — overhanging the pad width. The trunk + crown keep
// the willow's identity; only the strand colour, the strand density/length
// (winter thins toward bare drooping strands via `leafDensity`), frost/snow, the
// pad, and the light change. The trailing-strand SILHOUETTE is the palette lock.
//
//   Spring — cool-bright light; airy dewy lime pad + tiny blossom; pale fresh-
//            green NEW fronds (lighter, a touch thinner), catkin/bud shimmer.
//   Summer — PEAK: saturated mid-green pad, full lush green cascade (densest),
//            warm light, strong shadow.
//   Autumn — low amber light; olive-tan pad with a few fallen leaves; the
//            trailing strands turn pale gold-yellow, 1–2 strands drifting down.
//   Winter — cool blue-grey light; snow + frost-sparkle pad; sparse bare drooping
//            strands with frost, a snow cap + a little snow on the trunk crown;
//            the willow stays clearly itself (the weeping curtain reads). No
//            white-out, no full ice coat, no flash/bloom on the subject.
//
// Origin-centered in the ~-24..+24 design box; the tree grows UP (negative y)
// from a trunk base near y≈+19 (pad center) and the fronds trail back DOWN.
// Animations are deterministic and seamless (sin/cos/modulo of `t` seconds); the
// subject idle bob is 0 at t=0 with zero velocity (A*(1-cos)) so anim(t=0) reads
// as the still. The curtain-sway, drifting leaves/flakes and shimmer are additive.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";

// ── Small math helpers ───────────────────────────────────────────────────────

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

// Perlin-style smootherstep for transition pacing.
const smoother = (x: number): number => {
  const c = clamp01(x);
  return c * c * c * (c * (6 * c - 15) + 10);
};

// Idle bob: 0 at t=0 with zero velocity, seamless period 2π/w. A is amplitude.
function bobAt(t: number, A = 0.5, w = 1.1): number {
  return A * (1 - Math.cos(w * t)) * 0.5;
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
  frostAmt: number; // frost sparkle on pad + strands / cold sheen (winter)
  crownSnowAmt: number; // snow cap on the crown + a little on the trunk (winter)
  padSnowAmt: number; // snow blanket over the pad (winter)
  blossomAmt: number; // tiny blossom flecks on the pad (spring)
  fallenLeafAmt: number; // leaves resting on the pad (autumn)
  lightStrength: number; // overall ambient wash strength
  shadowStrength: number; // contact shadow opacity
}

// Four parameter sets. paint() reads ONLY these (+ a bob offset + sway/shimmer).
const SP: Record<"Spring" | "Summer" | "Autumn" | "Winter", P> = {
  // Spring — pale fresh-green new fronds; airy dewy lime pad + blossom.
  Spring: {
    frondDark: [86, 134, 52],
    frondMid: [140, 196, 80],
    frondLight: [200, 230, 130],
    bark: [120, 92, 58],
    barkShade: [90, 66, 40],
    barkLine: [62, 44, 26],
    padGrass: [126, 200, 86],
    soil: [104, 78, 44],
    outlineTint: [44, 50, 34],
    lightTint: [214, 238, 228], // cool-bright
    leafDensity: 0.72,
    catkinAmt: 0.85,
    frostAmt: 0,
    crownSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.55,
    fallenLeafAmt: 0,
    lightStrength: 0.22,
    shadowStrength: 0.2,
  },
  // Summer — PEAK: full lush green cascade, densest; warm light, strong shadow.
  Summer: {
    frondDark: [48, 102, 36],
    frondMid: [82, 156, 56],
    frondLight: [150, 202, 92],
    bark: [114, 84, 52],
    barkShade: [84, 60, 36],
    barkLine: [56, 40, 24],
    padGrass: [70, 162, 64],
    soil: [96, 70, 40],
    outlineTint: [36, 48, 30],
    lightTint: [255, 244, 206], // warm
    leafDensity: 1.0,
    catkinAmt: 0,
    frostAmt: 0,
    crownSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    lightStrength: 0.24,
    shadowStrength: 0.28,
  },
  // Autumn — pale gold-yellow trailing strands; olive-tan pad; fallen leaves.
  Autumn: {
    frondDark: [168, 124, 36],
    frondMid: [224, 184, 64],
    frondLight: [248, 222, 120],
    bark: [110, 80, 48],
    barkShade: [82, 58, 34],
    barkLine: [58, 42, 26],
    padGrass: [150, 144, 86],
    soil: [110, 80, 44],
    outlineTint: [54, 44, 26],
    lightTint: [250, 220, 162], // low amber
    leafDensity: 0.82,
    catkinAmt: 0,
    frostAmt: 0,
    crownSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.6,
    lightStrength: 0.26,
    shadowStrength: 0.22,
  },
  // Winter — sparse bare drooping strands w/ frost; snow cap on crown + trunk.
  Winter: {
    frondDark: [120, 124, 116],
    frondMid: [156, 162, 154],
    frondLight: [196, 204, 200],
    bark: [108, 92, 78],
    barkShade: [80, 66, 56],
    barkLine: [56, 48, 44],
    padGrass: [196, 210, 224],
    soil: [120, 126, 136],
    outlineTint: [48, 52, 60],
    lightTint: [206, 222, 240], // cool blue-grey
    leafDensity: 0.22, // sparse bare drooping strands (still reads as a willow)
    catkinAmt: 0,
    frostAmt: 0.8,
    crownSnowAmt: 0.85,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    lightStrength: 0.2,
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
function strands(ctx: CanvasRenderingContext2D, p: P, sway: number, shimmer: number): void {
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
    // Per-strand sway: the tip drifts most, the anchor barely moves (curtain).
    const phase = i * 0.7;
    const drift = sway * baseSway + Math.sin(shimmer * 0.8 + phase) * 0.6 * d;
    const midX = ax + drift * 0.45;
    const tipX = ax + drift;

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
        ctx.ellipse(fx, fy, 0.9, 1.8, drift * 0.05, 0, Math.PI * 2);
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
  });
  ctx.lineCap = "butt";

  // Spring catkins / buds: pale flecks nestled in the crown fringe.
  if (p.catkinAmt > 0.02) {
    const anchors: Array<[number, number]> = [
      [-10, -12], [-3, -15], [4, -14], [10, -11], [0, -13], [-6, -10],
    ];
    anchors.forEach(([cx, cy], i) => {
      if (i / anchors.length > p.catkinAmt + 0.1) return;
      const dx = sway * 0.4 + Math.sin(i * 1.3) * 0.4;
      ctx.fillStyle = `rgba(232,232,176,${clamp01(0.85 * p.catkinAmt)})`;
      ctx.beginPath();
      ctx.ellipse(cx + dx, cy, 1.0, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Snow cap on the crown top (winter), drawn over the dome.
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
  }
}

// ── THE single parameterized paint ───────────────────────────────────────────
// Whole tile from ONLY p and bob (vertical idle offset; 0 = rest). Never throws.
function paint(
  ctx: CanvasRenderingContext2D,
  p: P,
  bob: number,
  sway = 0,
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
    crown(ctx, p, sway, shimmer);
    strands(ctx, p, sway, shimmer);
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
    frostAmt: lerp(a.frostAmt, b.frostAmt, f),
    crownSnowAmt: lerp(a.crownSnowAmt, b.crownSnowAmt, f),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, f),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, f),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, f),
    lightStrength: lerp(a.lightStrength, b.lightStrength, f),
    shadowStrength: lerp(a.shadowStrength, b.shadowStrength, f),
  };
}

// ── Per-season draw + anim ───────────────────────────────────────────────────

type Season = "Spring" | "Summer" | "Autumn" | "Winter";

function makeDraw(season: Season) {
  return (ctx: CanvasRenderingContext2D): void => paint(ctx, SP[season], 0, 0, 0);
}

// Spring: the curtain sways gently; catkin/bud shimmer in the crown.
function animSpring(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = bobAt(t, 0.45, 1.2); // 0 at t=0
  const sway = Math.sin(t * 1.3) * 2.2; // curtain breeze
  paint(ctx, SP.Spring, bob, sway, t * 2.4);
}

// Summer: full lush cascade sways like a curtain + faint shimmer.
function animSummer(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = bobAt(t, 0.45, 1.1);
  const sway = Math.sin(t * 1.2) * 2.4; // densest curtain, fullest sway
  paint(ctx, SP.Summer, bob, sway, t * 1.9);
}

// Autumn: curtain sways; 1–2 yellow strands/leaves drift down (additive).
function animAutumn(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = bobAt(t, 0.45, 1.05);
  const sway = Math.sin(t * 1.0) * 2.0;
  paint(ctx, SP.Autumn, bob, sway, t * 1.6);

  // Drifting yellow strands/leaves on a seamless loop — drawn after the tree.
  ctx.save();
  try {
    const p = SP.Autumn;
    const leaves: Array<[number, number, number]> = [
      [-6, 0.0, 0.55], // [startX, phase, hueBlend]
      [9, 0.5, 0.35],
    ];
    leaves.forEach(([sx, phase, hb]) => {
      const prog = ((t * 0.26 + phase) % 1 + 1) % 1;
      const ly = -6 + prog * 28; // crown fringe down to the pad
      const lx = sx + Math.sin(prog * Math.PI * 2 + phase * 6) * 6;
      const col = lerp3(p.frondMid, p.frondLight, hb);
      ctx.fillStyle = rgb(col, 1 - prog * 0.4);
      ctx.translate(lx, ly);
      ctx.rotate(prog * Math.PI * 2.5 + phase * 4);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.1, 3.0, 0, 0, Math.PI * 2); // long thin willow leaf
      ctx.fill();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    });
  } catch {
    /* never throw */
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// Winter: sparse drooping strands sway faintly; drifting snowflakes + cold sheen.
function animWinter(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = bobAt(t, 0.32, 0.9);
  const sway = Math.sin(t * 0.85) * 1.5; // stiffer, colder sway
  paint(ctx, SP.Winter, bob, sway, 0);

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
