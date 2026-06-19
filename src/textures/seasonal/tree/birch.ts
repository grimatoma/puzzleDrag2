// Seasonal art for the BIRCH tree board tile.
//
// Unlike the oak's lifecycle (which has four bespoke draws), the birch is built
// from ONE parameterized paint() so all seasons share geometry and every morph
// is just a tween of the parameter set — no popping. The slender WHITE BARK
// trunk (with its dark horizontal lenticel dashes) carries the tree's identity
// in every season; only the foliage colour + density, frost/snow, and the pad
// dressing change:
//   Spring — cool-bright light, dewy lime pad with tiny blossom; airy pale-green
//            young leaves and pale catkins; moderate leaf density.
//   Summer — peak: saturated mid-green pad, full airy green canopy, warm light.
//   Autumn — low amber light, olive-tan pad with a few fallen leaves; bright
//            golden-yellow canopy thinning a touch; a leaf or two drifting.
//   Winter — cool blue-grey light, snow + frost-sparkle pad; BARE white trunk +
//            branch silhouette (leafDensity≈0) with snow lines on the branches —
//            still clearly a birch by its bark. No white-out.
//
// Origin-centered in the ~-24..+24 design box; the tree grows UP (negative y)
// from a trunk base near y≈+19 (pad center). Animations are deterministic and
// seamless (sin/cos/modulo of `t` seconds); the subject's idle bob is 0 at t=0
// with zero velocity (A*(1-cos)) so anim(t=0) === draw. Micro-motion (shimmer,
// drifting leaves/flakes, catkin sway) is additive on top.

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
  return `rgba(${r},${g},${b},${alpha})`;
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
function bobAt(t: number, A = 0.6, w = 1.2): number {
  return A * (1 - Math.cos(w * t)) * 0.5;
}

// ── Tweenable parameter set ──────────────────────────────────────────────────
// NO booleans / season strings inside paint — everything flows from P.

interface P {
  // colours
  foliageDark: RGB;
  foliageMid: RGB;
  foliageLight: RGB;
  bark: RGB; // white-ish birch bark body
  barkShade: RGB; // shaded right side of the trunk
  lenticel: RGB; // dark horizontal bark dashes / branch marks
  padGrass: RGB;
  soil: RGB;
  outlineTint: RGB; // soft dark outline colour
  lightTint: RGB; // ambient light wash (cool/warm per season)
  // scalars 0..1
  leafDensity: number; // canopy fullness (winter ≈ 0 → bare branches)
  catkinAmt: number; // pale dangling catkins (spring)
  frostAmt: number; // frost sparkle on pad / cold sheen (winter)
  branchSnowAmt: number; // snow lines riding the branches (winter)
  padSnowAmt: number; // snow blanket over the pad (winter)
  blossomAmt: number; // tiny blossom flecks on the pad (spring)
  fallenLeafAmt: number; // leaves resting on the pad (autumn)
  lightStrength: number; // overall ambient wash strength
  shadowStrength: number; // contact shadow opacity
}

// Four parameter sets. paint() reads ONLY these (+ a bob offset).
const SP: Record<"Spring" | "Summer" | "Autumn" | "Winter", P> = {
  Spring: {
    foliageDark: [78, 122, 52],
    foliageMid: [134, 188, 78],
    foliageLight: [196, 226, 132],
    bark: [238, 240, 236],
    barkShade: [196, 202, 200],
    lenticel: [70, 70, 66],
    padGrass: [126, 196, 86],
    soil: [104, 78, 44],
    outlineTint: [44, 50, 38],
    lightTint: [210, 235, 230], // cool-bright
    leafDensity: 0.6,
    catkinAmt: 0.85,
    frostAmt: 0,
    branchSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.5,
    fallenLeafAmt: 0,
    lightStrength: 0.22,
    shadowStrength: 0.2,
  },
  Summer: {
    foliageDark: [42, 92, 32],
    foliageMid: [70, 142, 44],
    foliageLight: [148, 200, 86],
    bark: [240, 242, 238],
    barkShade: [194, 200, 196],
    lenticel: [64, 64, 60],
    padGrass: [70, 158, 64],
    soil: [96, 70, 40],
    outlineTint: [36, 48, 30],
    lightTint: [255, 244, 206], // warm
    leafDensity: 1.0,
    catkinAmt: 0,
    frostAmt: 0,
    branchSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    lightStrength: 0.24,
    shadowStrength: 0.26,
  },
  Autumn: {
    foliageDark: [150, 92, 24],
    foliageMid: [224, 168, 44],
    foliageLight: [248, 214, 96],
    bark: [232, 230, 220],
    barkShade: [188, 184, 172],
    lenticel: [72, 60, 44],
    padGrass: [150, 144, 86],
    soil: [110, 80, 44],
    outlineTint: [54, 42, 26],
    lightTint: [250, 220, 168], // low amber
    leafDensity: 0.78,
    catkinAmt: 0,
    frostAmt: 0,
    branchSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.6,
    lightStrength: 0.26,
    shadowStrength: 0.22,
  },
  Winter: {
    foliageDark: [120, 132, 120],
    foliageMid: [160, 172, 160],
    foliageLight: [200, 210, 204],
    bark: [236, 240, 244],
    barkShade: [188, 198, 206],
    lenticel: [58, 60, 64],
    padGrass: [196, 210, 224],
    soil: [120, 126, 136],
    outlineTint: [46, 52, 62],
    lightTint: [206, 222, 240], // cool blue-grey
    leafDensity: 0.0,
    catkinAmt: 0,
    frostAmt: 0.8,
    branchSnowAmt: 0.85,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    lightStrength: 0.2,
    shadowStrength: 0.16,
  },
};

// ── Static geometry shared by every season ───────────────────────────────────

// Birch branch skeleton: a slender central leader plus a few up-swept limbs.
// [ctrlX, ctrlY, tipX, tipY, width]
const BRANCHES: Array<[number, number, number, number, number]> = [
  [-5, -6, -13, -15, 2.0],
  [-2, -12, -7, -22, 1.7],
  [3, -12, 7, -23, 1.8],
  [6, -6, 13, -14, 2.0],
  [0, -10, 1, -25, 1.8],
  [-8, -2, -15, -7, 1.6],
  [8, -2, 16, -6, 1.6],
];

// Canopy blob anchors (around the upper branch tips). Airy, not a solid mass.
// [x, y, r]
const CLUSTERS: Array<[number, number, number]> = [
  [-12, -14, 5.0],
  [-5, -20, 5.6],
  [4, -21, 5.6],
  [13, -13, 5.0],
  [0, -9, 4.4],
  [-15, -7, 3.8],
  [16, -6, 3.8],
  [-3, -17, 4.6],
  [7, -16, 4.6],
];

// ── Local paint helpers (all driven by p) ────────────────────────────────────

function padEllipse(ctx: CanvasRenderingContext2D, p: P): void {
  // Soft contact shadow lower-right.
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
      ctx.fillStyle = `rgba(255,236,246,${a})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(248,210,90,${a})`;
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
      ctx.fillStyle = rgb(p.foliageMid, Math.min(1, p.fallenLeafAmt + 0.3));
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.4, 1.3, 0, 0, Math.PI * 2);
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
    ctx.globalAlpha = p.padSnowAmt;
    ctx.fillStyle = snow;
    ctx.beginPath();
    ctx.ellipse(0, 18.6, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Frost sparkle flecks.
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = `rgba(255,255,255,${0.5 * p.frostAmt + 0.3})`;
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

// The slender white birch trunk + lenticel dashes. Identity in every season.
function trunk(ctx: CanvasRenderingContext2D, p: P): void {
  // Outline pass (soft dark).
  ctx.fillStyle = rgb(p.outlineTint, 0.9);
  ctx.beginPath();
  ctx.moveTo(-4.0, 19);
  ctx.quadraticCurveTo(-3.0, 4, -2.4, -4);
  ctx.lineTo(2.4, -4);
  ctx.quadraticCurveTo(3.0, 4, 4.0, 19);
  ctx.closePath();
  ctx.fill();

  // Shaded (right) half.
  ctx.fillStyle = rgb(p.barkShade, 1);
  ctx.beginPath();
  ctx.moveTo(-3.2, 19);
  ctx.quadraticCurveTo(-2.4, 4, -1.9, -4);
  ctx.lineTo(1.9, -4);
  ctx.quadraticCurveTo(2.4, 4, 3.2, 19);
  ctx.closePath();
  ctx.fill();

  // Lit (left) white-bark body.
  ctx.fillStyle = rgb(p.bark, 1);
  ctx.beginPath();
  ctx.moveTo(-3.2, 19);
  ctx.quadraticCurveTo(-2.4, 4, -1.9, -4);
  ctx.lineTo(0.6, -4);
  ctx.quadraticCurveTo(0.2, 6, -0.4, 19);
  ctx.closePath();
  ctx.fill();

  // Root flare.
  ctx.fillStyle = rgb(scale3(p.bark, 0.86), 1);
  ctx.beginPath();
  ctx.moveTo(-3.2, 19);
  ctx.quadraticCurveTo(-6.5, 18.4, -8, 19.6);
  ctx.quadraticCurveTo(-5, 19.6, -2.8, 18.6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(3.2, 19);
  ctx.quadraticCurveTo(6.5, 18.4, 8, 19.6);
  ctx.quadraticCurveTo(5, 19.6, 2.8, 18.6);
  ctx.closePath();
  ctx.fill();

  // Lenticel dashes — the signature dark horizontal birch marks.
  ctx.strokeStyle = rgb(p.lenticel, 0.9);
  ctx.lineWidth = 1.0;
  ctx.lineCap = "round";
  const marks: Array<[number, number, number]> = [
    [-1.4, 15, 2.2],
    [0.8, 11, 1.6],
    [-1.0, 7, 2.0],
    [1.0, 3, 1.4],
    [-0.8, -0.5, 1.8],
  ];
  marks.forEach(([mx, my, w]) => {
    ctx.beginPath();
    ctx.moveTo(mx - w / 2, my);
    ctx.lineTo(mx + w / 2, my + 0.4);
    ctx.stroke();
  });
  ctx.lineCap = "butt";
}

function branches(ctx: CanvasRenderingContext2D, p: P, sway: number): void {
  ctx.lineCap = "round";
  BRANCHES.forEach(([cx, cy, tx, ty, w], i) => {
    const s = sway * (0.4 + Math.abs(tx) / 24);
    // Branch limb (bark-coloured, thinner than oak — birch is slender).
    ctx.strokeStyle = rgb(scale3(p.bark, 0.9), 1);
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.quadraticCurveTo(cx + s * 0.5, cy, tx + s, ty);
    ctx.stroke();
    // Dark underside edge for a touch of depth.
    ctx.strokeStyle = rgb(p.outlineTint, 0.5);
    ctx.lineWidth = w * 0.45;
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.quadraticCurveTo(cx + s * 0.5 + 0.5, cy + 0.6, tx + s + 0.4, ty + 0.6);
    ctx.stroke();
    // Forking twig near the tip.
    ctx.strokeStyle = rgb(scale3(p.bark, 0.85), 1);
    ctx.lineWidth = w * 0.5;
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.5, cy);
    ctx.lineTo(cx + s * 0.5 + (tx < 0 ? -4 : 4), cy - 5);
    ctx.stroke();

    // Snow lines riding the upper limbs (winter).
    if (p.branchSnowAmt > 0.02 && ty < -8) {
      ctx.strokeStyle = `rgba(244,248,255,${p.branchSnowAmt})`;
      ctx.lineWidth = w * 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.quadraticCurveTo(cx + s * 0.5, cy - 1, tx + s, ty - 1);
      ctx.stroke();
      // Snow cap blob on the tip.
      ctx.fillStyle = `rgba(244,248,255,${p.branchSnowAmt})`;
      ctx.beginPath();
      ctx.ellipse(tx + s, ty - 0.8, 2.2 + (i % 2) * 0.5, 1.3, tx < 0 ? -0.5 : 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.lineCap = "butt";
}

// A single airy canopy blob: dark underside, lifted mid body, top-left highlight.
function canopyBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  p: P,
  alpha: number,
): void {
  if (r < 0.4 || alpha < 0.02) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  // dark underside
  ctx.fillStyle = rgb(p.foliageDark, 1);
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.18, r, r * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  // mid body lifted up-left
  const grad = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.2, x, y, r);
  grad.addColorStop(0, rgb(p.foliageLight, 1));
  grad.addColorStop(0.55, rgb(p.foliageMid, 1));
  grad.addColorStop(1, rgb(p.foliageDark, 1));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.95, r * 0.84, 0, 0, Math.PI * 2);
  ctx.fill();
  // bright top-left nub
  ctx.globalAlpha = alpha * 0.7;
  ctx.fillStyle = rgb(p.foliageLight, 1);
  ctx.beginPath();
  ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.32, r * 0.26, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function canopy(ctx: CanvasRenderingContext2D, p: P, sway: number, shimmer: number): void {
  const d = clamp01(p.leafDensity);
  if (d < 0.03) return; // bare in winter
  CLUSTERS.forEach(([x, y, r], i) => {
    // Outer / higher clusters thin out first as density drops, so the canopy
    // empties from the edges and the silhouette stays believable.
    const threshold = i / CLUSTERS.length; // 0..1 across the list
    const grow = clamp01((d - threshold * 0.55) / 0.45);
    if (grow < 0.04) return;
    const s = sway * (0.3 + Math.abs(x) / 28) + Math.sin(shimmer + i) * 0.35 * d;
    canopyBlob(ctx, x + s, y, r * grow, p, 0.9);
  });

  // Airy leaflet flecks for the dappled birch look.
  const fleckAlpha = 0.5 * d;
  if (fleckAlpha > 0.04) {
    ctx.fillStyle = rgb(p.foliageLight, fleckAlpha);
    CLUSTERS.forEach(([x, y, r], i) => {
      const threshold = i / CLUSTERS.length;
      const grow = clamp01((d - threshold * 0.55) / 0.45);
      if (grow < 0.2) return;
      const s = sway * (0.3 + Math.abs(x) / 28);
      for (let k = 0; k < 2; k++) {
        const a = i * 1.7 + k * 2.3 + shimmer * 0.2;
        ctx.beginPath();
        ctx.ellipse(x + s + Math.cos(a) * r, y + Math.sin(a) * r, 1.2, 1.9, a, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
}

function catkins(ctx: CanvasRenderingContext2D, p: P, sway: number): void {
  if (p.catkinAmt < 0.02) return;
  // Pale dangling catkins from the upper twigs.
  const anchors: Array<[number, number]> = [
    [-9, -16], [4, -18], [-3, -13], [11, -11], [8, -19], [-13, -9],
  ];
  anchors.forEach(([ax, ay], i) => {
    if (i / anchors.length > p.catkinAmt + 0.1) return;
    const dx = sway * 0.6 + Math.sin(i * 1.3) * 0.4;
    ctx.strokeStyle = `rgba(214,206,150,${0.85 * p.catkinAmt})`;
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(ax + dx * 0.5, ay + 3, ax + dx, ay + 6);
    ctx.stroke();
    ctx.lineCap = "butt";
    // pale tip highlight
    ctx.fillStyle = `rgba(238,232,180,${0.9 * p.catkinAmt})`;
    ctx.beginPath();
    ctx.ellipse(ax + dx, ay + 6, 1.0, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
  });
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
    trunk(ctx, p);
    branches(ctx, p, sway);
    canopy(ctx, p, sway, shimmer);
    catkins(ctx, p, sway);
    ctx.restore();

    // Ambient light wash (cool/warm per season), upper-left bias. Additive feel
    // via low-alpha overlay; never a white-out.
    if (p.lightStrength > 0.01) {
      const lg = ctx.createRadialGradient(-8, -16, 4, -2, -8, 34);
      lg.addColorStop(0, rgb(p.lightTint, p.lightStrength));
      lg.addColorStop(1, rgb(p.lightTint, 0));
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.ellipse(-2, -8, 26, 28, 0, 0, Math.PI * 2);
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
    foliageDark: lerp3(a.foliageDark, b.foliageDark, f),
    foliageMid: lerp3(a.foliageMid, b.foliageMid, f),
    foliageLight: lerp3(a.foliageLight, b.foliageLight, f),
    bark: lerp3(a.bark, b.bark, f),
    barkShade: lerp3(a.barkShade, b.barkShade, f),
    lenticel: lerp3(a.lenticel, b.lenticel, f),
    padGrass: lerp3(a.padGrass, b.padGrass, f),
    soil: lerp3(a.soil, b.soil, f),
    outlineTint: lerp3(a.outlineTint, b.outlineTint, f),
    lightTint: lerp3(a.lightTint, b.lightTint, f),
    leafDensity: lerp(a.leafDensity, b.leafDensity, f),
    catkinAmt: lerp(a.catkinAmt, b.catkinAmt, f),
    frostAmt: lerp(a.frostAmt, b.frostAmt, f),
    branchSnowAmt: lerp(a.branchSnowAmt, b.branchSnowAmt, f),
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

// Spring: catkins / buds sway.
function animSpring(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = bobAt(t, 0.5, 1.3); // 0 at t=0
  const sway = Math.sin(t * 1.4) * 1.4;
  paint(ctx, SP.Spring, bob, sway, t * 2.4);
}

// Summer: leaf shimmer + gentle sway.
function animSummer(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = bobAt(t, 0.5, 1.2);
  const sway = Math.sin(t * 1.3) * 1.3;
  paint(ctx, SP.Summer, bob, sway, t * 1.9);
}

// Autumn: 1–2 golden leaves drift down (additive overlay), gentle sway.
function animAutumn(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = bobAt(t, 0.5, 1.1);
  const sway = Math.sin(t * 1.1) * 1.1;
  paint(ctx, SP.Autumn, bob, sway, t * 1.6);

  // Drifting leaves on a seamless loop — drawn after the tree.
  ctx.save();
  try {
    const p = SP.Autumn;
    const leaves: Array<[number, number, number]> = [
      [-6, 0.0, 0.55], // [startX, phase, hueBlend]
      [9, 0.5, 0.35],
    ];
    leaves.forEach(([sx, phase, hb]) => {
      const prog = ((t * 0.28 + phase) % 1 + 1) % 1;
      const ly = -8 + prog * 28; // canopy base to pad
      const lx = sx + Math.sin(prog * Math.PI * 2 + phase * 6) * 6;
      const col = lerp3(p.foliageMid, p.foliageLight, hb);
      ctx.fillStyle = rgb(col, 1 - prog * 0.4);
      ctx.translate(lx, ly);
      ctx.rotate(prog * Math.PI * 3 + phase * 4);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.6, 2.9, 0, 0, Math.PI * 2);
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

// Winter: a couple of drifting snowflakes + cold sheen.
function animWinter(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = bobAt(t, 0.35, 0.9);
  const sway = Math.sin(t * 0.9) * 0.9;
  // Cold sheen rides frostAmt via a tiny additive modulation kept in-paint-safe:
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
// including leafDensity, so the canopy thins/fills smoothly.
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
