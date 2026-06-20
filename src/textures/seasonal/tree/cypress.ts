// Seasonal art for the CYPRESS tree board tile (`tile_tree_cypress`).
//
// A tall narrow COLUMNAR evergreen cypress: a slim, vertical, slightly tapering
// dark-green spire on a short trunk base, filling most of the design-box height
// with a narrow footprint. Built — like the birch — from ONE parameterized
// paint() so every season shares geometry and each transition is a pure tween of
// the parameter set (no popping). The short trunk base carries the tree's
// identity in every season; because it is an EVERGREEN, the foliage stays FULL
// all four seasons (leafDensity high year-round) — only colour, snow/frost, and
// the pad dressing change. The dark evergreen green is PALETTE-LOCKED:
//   Spring — fresh-green crown (slightly lighter, dewy), cool-bright light; lime
//            dewy pad with a tiny blossom; dew shimmer idle.
//   Summer — saturated DEEP green (PEAK); mid-green pad; warm light; faint needle
//            shimmer idle.
//   Autumn — muted dusty olive-green; olive-tan pad with a couple fallen leaves;
//            low amber light; faint sway idle.
//   Winter — snow-dusted spire: clumps of snow riding the upward foliage tiers +
//            frost, the deep green STILL clearly visible underneath; snowy pad,
//            cool blue-grey light; a couple of drifting snowflakes + cold sheen.
//
// Origin-centered in the ~-24..+24 design box; the spire grows UP (negative y)
// from a short trunk base near y≈+18 (pad center) to ~y≈-23. Animations are
// deterministic and seamless (sin/cos/modulo of `t` seconds); the subject's idle
// bob is 0 at t=0 with zero velocity (A*(1-cos)) so anim(t=0) === draw.
// Micro-motion (shimmer, drifting flakes, sheen) is additive on top.

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
function bobAt(t: number, A = 0.5, w = 1.2): number {
  return A * (1 - Math.cos(w * t)) * 0.5;
}

// ── Tweenable parameter set ──────────────────────────────────────────────────
// NO booleans / season strings inside paint — everything flows from P.

interface P {
  // colours (the evergreen green is palette-locked; seasons only nudge it)
  foliageDark: RGB; // shaded right/underside of the spire
  foliageMid: RGB; // body tone of the spire
  foliageLight: RGB; // lit upper-left tier faces
  trunk: RGB; // short trunk base body
  trunkShade: RGB; // shaded side of the trunk
  padGrass: RGB;
  soil: RGB;
  outlineTint: RGB; // soft dark outline colour
  lightTint: RGB; // ambient light wash (cool/warm per season)
  // scalars 0..1
  leafDensity: number; // canopy fullness — stays HIGH all year (evergreen)
  greenTint: number; // 0..1 freshness cue (spring dewy → 1), purely cosmetic
  frostAmt: number; // frost sparkle on pad / cold sheen (winter)
  snowCapAmt: number; // snow clumps riding the upward foliage tiers (winter)
  padSnowAmt: number; // snow blanket over the pad (winter)
  blossomAmt: number; // tiny blossom fleck on the pad (spring)
  fallenLeafAmt: number; // leaves resting on the pad (autumn)
  lightStrength: number; // overall ambient wash strength
  shadowStrength: number; // contact shadow opacity
}

// Four parameter sets. paint() reads ONLY these (+ a bob offset). Note every
// foliage colour stays in the dark-evergreen-green family — the seasons shift
// it fresh→deep→olive→muted but NEVER off-green (palette lock).
const SP: Record<"Spring" | "Summer" | "Autumn" | "Winter", P> = {
  Spring: {
    foliageDark: [30, 78, 44],
    foliageMid: [52, 116, 60],
    foliageLight: [108, 168, 92],
    trunk: [120, 88, 56],
    trunkShade: [86, 60, 38],
    padGrass: [126, 196, 86],
    soil: [104, 78, 44],
    outlineTint: [22, 48, 30],
    lightTint: [214, 238, 230], // cool-bright dewy
    leafDensity: 0.96,
    greenTint: 1.0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.7,
    fallenLeafAmt: 0,
    lightStrength: 0.2,
    shadowStrength: 0.2,
  },
  Summer: {
    foliageDark: [18, 62, 34],
    foliageMid: [30, 96, 46],
    foliageLight: [78, 142, 70],
    trunk: [116, 84, 52],
    trunkShade: [82, 56, 34],
    padGrass: [70, 158, 64],
    soil: [96, 70, 40],
    outlineTint: [14, 40, 24],
    lightTint: [255, 244, 206], // warm peak
    leafDensity: 1.0,
    greenTint: 0.6,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    lightStrength: 0.24,
    shadowStrength: 0.28,
  },
  Autumn: {
    foliageDark: [54, 70, 38],
    foliageMid: [86, 104, 56],
    foliageLight: [136, 150, 90],
    trunk: [108, 78, 46],
    trunkShade: [76, 52, 30],
    padGrass: [150, 144, 86],
    soil: [110, 80, 44],
    outlineTint: [40, 46, 26],
    lightTint: [250, 220, 168], // low amber
    leafDensity: 0.94,
    greenTint: 0.3,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.6,
    lightStrength: 0.26,
    shadowStrength: 0.22,
  },
  Winter: {
    foliageDark: [26, 60, 42],
    foliageMid: [40, 86, 54],
    foliageLight: [86, 130, 92],
    trunk: [104, 84, 64],
    trunkShade: [74, 58, 42],
    padGrass: [196, 210, 224],
    soil: [120, 126, 136],
    outlineTint: [28, 46, 40],
    lightTint: [206, 222, 240], // cool blue-grey
    leafDensity: 0.96, // evergreen — stays full under the snow
    greenTint: 0.4,
    frostAmt: 0.8,
    snowCapAmt: 0.9,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    lightStrength: 0.2,
    shadowStrength: 0.16,
  },
};

// ── Static geometry shared by every season ───────────────────────────────────

// The columnar spire is a stack of overlapping foliage TIERS down the trunk,
// narrowing toward the pointed top — a slim flame/cypress silhouette. Each tier
// is [centerY, halfWidth]; drawn bottom-up so upper tiers overlap lower ones.
// Narrow footprint: max half-width ~7px, so the whole spire is ≲14px wide.
const SPIRE_TOP = -23; // pointed crown
const SPIRE_BASE = 13; // foliage skirt meets the trunk
const TIERS: Array<[number, number]> = [
  [11, 6.8],
  [7, 6.6],
  [3, 6.2],
  [-1, 5.6],
  [-5, 4.9],
  [-9, 4.1],
  [-13, 3.2],
  [-17, 2.3],
  [-20.5, 1.4],
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
  ctx.ellipse(0, 19.4, 6.0, 2.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Spring blossom flecks on the grass.
  if (p.blossomAmt > 0.02) {
    const spots: Array<[number, number]> = [
      [-12, 20], [-6, 21.6], [8, 21], [13, 19.6], [2, 22],
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
      [-9, 20.4, 0.5], [7, 21.4, -0.4], [-1, 22, 0.2], [12, 20, 0.8],
    ];
    leaves.forEach(([lx, ly, rot], i) => {
      if (i / leaves.length > p.fallenLeafAmt + 0.05) return;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.fillStyle = rgb([196, 120, 40], clamp01(p.fallenLeafAmt + 0.3));
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.4, 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgb(p.outlineTint, 0.4);
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-2.4, 0);
      ctx.lineTo(2.4, 0);
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

// The short trunk base. Identity in every season — the spire skirt overlaps its
// top, so only a stubby base shows.
function trunkBase(ctx: CanvasRenderingContext2D, p: P): void {
  // Outline pass (soft dark).
  ctx.fillStyle = rgb(p.outlineTint, 0.9);
  ctx.beginPath();
  ctx.moveTo(-3.2, 19);
  ctx.lineTo(-2.4, 11);
  ctx.lineTo(2.4, 11);
  ctx.lineTo(3.2, 19);
  ctx.closePath();
  ctx.fill();

  // Shaded (right) half.
  ctx.fillStyle = rgb(p.trunkShade, 1);
  ctx.beginPath();
  ctx.moveTo(-2.5, 19);
  ctx.lineTo(-1.9, 11.4);
  ctx.lineTo(2.5, 11.4);
  ctx.lineTo(2.5, 19);
  ctx.closePath();
  ctx.fill();

  // Lit (left) trunk body.
  ctx.fillStyle = rgb(p.trunk, 1);
  ctx.beginPath();
  ctx.moveTo(-2.5, 19);
  ctx.lineTo(-1.9, 11.4);
  ctx.lineTo(0.6, 11.4);
  ctx.lineTo(0.2, 19);
  ctx.closePath();
  ctx.fill();

  // Root flare.
  ctx.fillStyle = rgb(scale3(p.trunk, 0.86), 1);
  ctx.beginPath();
  ctx.moveTo(-2.5, 19);
  ctx.quadraticCurveTo(-5.5, 18.6, -7, 19.6);
  ctx.quadraticCurveTo(-4, 19.4, -2.0, 18.6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(2.5, 19);
  ctx.quadraticCurveTo(5.5, 18.6, 7, 19.6);
  ctx.quadraticCurveTo(4, 19.4, 2.0, 18.6);
  ctx.closePath();
  ctx.fill();
}

// One foliage tier of the spire: a soft horizontal lobe with a dark underside,
// lit mid body, and a bright upper-left nub. Sway leans the tier sideways a hair.
function foliageTier(
  ctx: CanvasRenderingContext2D,
  cy: number,
  hw: number,
  p: P,
  sway: number,
): void {
  if (hw < 0.4) return;
  const s = sway * (0.4 + (SPIRE_BASE - cy) / 40); // upper tiers lean a touch more
  // dark underside skirt
  ctx.fillStyle = rgb(p.foliageDark, 1);
  ctx.beginPath();
  ctx.moveTo(-hw + s, cy + 1.4);
  ctx.quadraticCurveTo(s, cy + 4.0, hw + s, cy + 1.4);
  ctx.quadraticCurveTo(hw * 0.5 + s, cy + 2.2, s, cy + 1.0);
  ctx.quadraticCurveTo(-hw * 0.5 + s, cy + 2.2, -hw + s, cy + 1.4);
  ctx.closePath();
  ctx.fill();
  // mid body lobe
  const grad = ctx.createLinearGradient(-hw + s, cy - 3, hw + s, cy + 2);
  grad.addColorStop(0, rgb(p.foliageLight, 1));
  grad.addColorStop(0.5, rgb(p.foliageMid, 1));
  grad.addColorStop(1, rgb(p.foliageDark, 1));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-hw + s, cy + 1.2);
  ctx.quadraticCurveTo(-hw * 0.7 + s, cy - 3.4, s, cy - 3.0);
  ctx.quadraticCurveTo(hw * 0.7 + s, cy - 3.4, hw + s, cy + 1.2);
  ctx.quadraticCurveTo(hw * 0.5 + s, cy + 2.4, s, cy + 2.0);
  ctx.quadraticCurveTo(-hw * 0.5 + s, cy + 2.4, -hw + s, cy + 1.2);
  ctx.closePath();
  ctx.fill();
  // bright upper-left needle nub
  ctx.fillStyle = rgb(p.foliageLight, 0.75);
  ctx.beginPath();
  ctx.ellipse(-hw * 0.42 + s, cy - 1.6, hw * 0.34, 1.3, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

// The whole columnar spire, bottom-up so upper tiers overlap. leafDensity stays
// high (evergreen) — it only trims the very tips a hair if it ever drops.
function spire(
  ctx: CanvasRenderingContext2D,
  p: P,
  sway: number,
  shimmer: number,
): void {
  const d = clamp01(p.leafDensity);
  TIERS.forEach(([cy, hw], i) => {
    // Evergreen: full year-round. Density only nudges tier width slightly.
    const w = hw * (0.86 + 0.14 * d);
    const sh = Math.sin(shimmer + i * 0.8) * 0.3 * d; // faint per-tier shimmer
    foliageTier(ctx, cy, w, p, sway + sh);
  });
  // A few fine needle flecks along the lit left edge for texture.
  ctx.fillStyle = rgb(p.foliageLight, 0.4 * d);
  TIERS.forEach(([cy, hw], i) => {
    if (i % 2 === 1) return;
    const s = sway * 0.5;
    ctx.beginPath();
    ctx.ellipse(-hw * 0.6 + s, cy - 1, 1.0, 1.8, -0.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Snow clumps riding the UPWARD foliage tiers (winter). Deep green stays visible.
function snowCaps(ctx: CanvasRenderingContext2D, p: P, sway: number): void {
  if (p.snowCapAmt < 0.02) return;
  const a = clamp01(p.snowCapAmt);
  TIERS.forEach(([cy, hw], i) => {
    if (i % 2 === 1) return; // snow on alternating tiers — partial, not a coat
    const s = sway * (0.4 + (SPIRE_BASE - cy) / 40);
    // a soft snow clump hugging the top of this tier's lobe
    ctx.fillStyle = `rgba(244,248,255,${a})`;
    ctx.beginPath();
    ctx.moveTo(-hw * 0.7 + s, cy - 1.4);
    ctx.quadraticCurveTo(-hw * 0.4 + s, cy - 3.4, s, cy - 3.0);
    ctx.quadraticCurveTo(hw * 0.4 + s, cy - 3.4, hw * 0.7 + s, cy - 1.4);
    ctx.quadraticCurveTo(hw * 0.3 + s, cy - 2.2, s, cy - 1.9);
    ctx.quadraticCurveTo(-hw * 0.3 + s, cy - 2.2, -hw * 0.7 + s, cy - 1.4);
    ctx.closePath();
    ctx.fill();
    // pale shadow under the clump
    ctx.fillStyle = `rgba(206,222,240,${a * 0.5})`;
    ctx.beginPath();
    ctx.ellipse(s, cy - 1.5, hw * 0.5, 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // a little snow on the very crown
  ctx.fillStyle = `rgba(248,251,255,${a})`;
  ctx.beginPath();
  ctx.ellipse(sway * 0.7, SPIRE_TOP + 0.6, 1.8, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
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
    trunkBase(ctx, p);
    spire(ctx, p, sway, shimmer);
    snowCaps(ctx, p, sway);
    ctx.restore();

    // Ambient light wash (cool/warm per season), upper-left bias. Additive feel
    // via low-alpha overlay; never a white-out.
    if (p.lightStrength > 0.01) {
      const lg = ctx.createRadialGradient(-7, -16, 4, -2, -8, 34);
      lg.addColorStop(0, rgb(p.lightTint, p.lightStrength));
      lg.addColorStop(1, rgb(p.lightTint, 0));
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.ellipse(-2, -6, 24, 30, 0, 0, Math.PI * 2);
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
    trunk: lerp3(a.trunk, b.trunk, f),
    trunkShade: lerp3(a.trunkShade, b.trunkShade, f),
    padGrass: lerp3(a.padGrass, b.padGrass, f),
    soil: lerp3(a.soil, b.soil, f),
    outlineTint: lerp3(a.outlineTint, b.outlineTint, f),
    lightTint: lerp3(a.lightTint, b.lightTint, f),
    leafDensity: lerp(a.leafDensity, b.leafDensity, f),
    greenTint: lerp(a.greenTint, b.greenTint, f),
    frostAmt: lerp(a.frostAmt, b.frostAmt, f),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, f),
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

// Spring: gentle sway + dew shimmer.
function animSpring(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = bobAt(t, 0.45, 1.3); // 0 at t=0
  const sway = Math.sin(t * 1.4) * 1.0;
  paint(ctx, SP.Spring, bob, sway, t * 2.2);

  // Dew shimmer — a soft pulsing glint travelling on the lit side of the spire.
  ctx.save();
  try {
    const g = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.4));
    const gy = -4 - bob + Math.sin(t * 1.0) * 4;
    ctx.fillStyle = `rgba(255,255,255,${clamp01(g)})`;
    ctx.beginPath();
    ctx.arc(-3.2, gy, 1.0 + g * 0.7, 0, Math.PI * 2);
    ctx.fill();
  } catch {
    /* never throw */
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// Summer: breathing bob + faint needle shimmer.
function animSummer(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = bobAt(t, 0.5, 1.2);
  const sway = Math.sin(t * 1.2) * 0.9;
  paint(ctx, SP.Summer, bob, sway, t * 2.0);

  // Faint needle shimmer — a couple of low-alpha glints flickering on the tiers.
  ctx.save();
  try {
    const spots: Array<[number, number, number]> = [
      [-3, -2, 0.0], [3, -10, 1.4], [-2, -16, 2.6],
    ];
    spots.forEach(([sx, sy, ph]) => {
      const g = 0.1 + 0.16 * (0.5 + 0.5 * Math.sin(t * 3.0 + ph));
      ctx.fillStyle = `rgba(220,250,210,${clamp01(g)})`;
      ctx.beginPath();
      ctx.arc(sx, sy - bob, 0.9, 0, Math.PI * 2);
      ctx.fill();
    });
  } catch {
    /* never throw */
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// Autumn: faint slow sway + a soft warm sheen pulse.
function animAutumn(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = bobAt(t, 0.4, 1.0);
  const sway = Math.sin(t * 0.9) * 0.8;
  paint(ctx, SP.Autumn, bob, sway, t * 1.4);

  ctx.save();
  try {
    const s = 0.1 + 0.14 * (0.5 + 0.5 * Math.sin(t * 0.9));
    ctx.fillStyle = `rgba(250,224,170,${clamp01(s)})`;
    ctx.beginPath();
    ctx.ellipse(-2, -6 - bob, 5.0, 8.0, -0.1, 0, Math.PI * 2);
    ctx.fill();
  } catch {
    /* never throw */
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// Winter: a couple of drifting snowflakes + cold sheen.
function animWinter(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = bobAt(t, 0.32, 0.9);
  const sway = Math.sin(t * 0.8) * 0.7;
  paint(ctx, SP.Winter, bob, sway, 0);

  ctx.save();
  try {
    const span = 36;
    const seeds: Array<[number, number, number]> = [
      [-7, 1.2, 0.0],
      [6, 1.0, 0.5],
      [10, 0.9, 0.75],
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
    ctx.fillStyle = `rgba(200,224,255,${clamp01(sheen)})`;
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
// transition(0) ≡ draw(from), transition(1) ≡ draw(to). Every field lerps —
// the evergreen spire keeps its silhouette while colour, snow, and pad dressing
// cross-fade smoothly.
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
