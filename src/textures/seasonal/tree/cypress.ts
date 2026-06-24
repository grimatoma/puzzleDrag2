// BOLD seasonal art for the CYPRESS tree board tile (`tile_tree_cypress`).
//
// A tall narrow COLUMNAR EVERGREEN cypress: a slim, vertical, slightly tapering
// dark-green spire on a short trunk base, filling most of the design-box height
// with a narrow footprint. The trunk base + spire silhouette are the IDENTITY and
// stay constant every season — cypress is an EVERGREEN, so it NEVER goes bare.
// The seasons are made UNMISTAKABLE at a glance (~58 px):
//   Spring  — fresh lighter-green crown + a tiny bright NEW-GROWTH TIP on the
//             crown, dewy lime pad with blossom flecks.
//   Summer  — peak DEEP saturated green spire, full and lush.
//   Autumn  — muted dusty olive-green + a small brown CONE or two on the boughs,
//             olive-tan browning pad.
//   Winter  — a REAL SNOW-LADEN spire: clear snow piled white-capped on the
//             boughs (deep green still visible beneath), a hanging ICICLE, and a
//             deep snow blanket on the pad. Unmistakably snowy.
//
// IDLE is mostly at rest then, on a deterministic `actionQ` clock (mirroring
// oak.bold):
//   COMMON  — every ~6 s a gentle whole-spire SWAY (~12 px lean-and-return).
//   RARE    — every ~18 s a small BIRD lands near the top, looks around, then
//             flits off (~1.3 s) — except in WINTER, where instead a CLUMP OF
//             SNOW plops off a bough and falls to the pad.
// Both actions are enveloped to ZERO velocity at the window edges, so the loop is
// seamless (anim returns to the rest pose at each window boundary, and anim(t=0)
// === draw). Actions may paint slightly outside the design box.
//
// Origin-centered in the ~-24..+24 design box; the spire grows UP (negative y)
// from a short trunk base near y≈+18 (pad center) to ~y≈-23. Reads at ~58 px.

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

// Perlin-style smootherstep for transition pacing.
const smoother = (x: number): number => {
  const c = clamp01(x);
  return c * c * c * (c * (6 * c - 15) + 10);
};

// Deterministic action clock. Returns a phase in [0,1) WHILE inside the action
// window (length `win` seconds, repeating every `period`), or −1 at rest.
function actionQ(t: number, period: number, win: number, phase: number): number {
  const c = (((t + phase) % period) + period) % period;
  return c < win ? c / win : -1;
}

// A one-shot bell that rises 0→1→0 over the window with ZERO velocity at both
// ends (sin² is C¹-zero at 0 and 1). Used to envelope the special action.
function bell(q: number): number {
  if (q < 0) return 0;
  const s = Math.sin(Math.PI * clamp01(q));
  return s * s;
}

// A signed lean: rises, peaks, returns — zero VALUE and zero SLOPE at q=0 and
// q=1. (1−cos(2π q))/2 is C¹-zero at both endpoints.
function leanEnvelope(q: number): number {
  if (q < 0) return 0;
  return (1 - Math.cos(2 * Math.PI * clamp01(q))) * 0.5;
}

// ── Idle clock tuning (two-tier WC3 idle) ────────────────────────────────────
//
// COMMON: every ~6 s a BOLD whole-spire sway (~12 px peak lean) over a ~1.0 s
//   window. RARE: every ~18 s a ~1.3 s special, phased to the period midpoint so
//   it never collides with the sway window.
const SWAY_PERIOD = 6.0;
const SWAY_WIN = 1.0;
const SWAY_AMP = 12; // peak horizontal spire lean in design px (BOLD)

const SPECIAL_PERIOD = 18.0;
const SPECIAL_WIN = 1.3;

// The whole-spire sway offset (design px) at time t — leans right then back,
// returning to 0 (with zero velocity) at the window edges.
function swayAt(t: number): number {
  const q = actionQ(t, SWAY_PERIOD, SWAY_WIN, 0);
  return leanEnvelope(q) * SWAY_AMP;
}

// A small settle bob that accompanies the sway (seamless: 0 at the edges).
function swayBobAt(t: number): number {
  const q = actionQ(t, SWAY_PERIOD, SWAY_WIN, 0);
  return bell(q) * 1.2;
}

// ── Tweenable parameter set ──────────────────────────────────────────────────
// NO booleans / season strings inside paint — everything flows from P, so the
// transitions are a pure tween of the parameter set and the silhouette is shared.

interface P {
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
  frostAmt: number; // frost sparkle on pad / cold sheen (winter)
  snowCapAmt: number; // snow piled on the upward foliage boughs (winter)
  padSnowAmt: number; // snow blanket over the pad (winter)
  icicleAmt: number; // hanging icicle off a bough (winter)
  blossomAmt: number; // tiny blossom flecks on the pad (spring)
  newGrowthAmt: number; // bright new-growth tip on the crown (spring)
  fallenLeafAmt: number; // leaves resting on the pad (autumn)
  coneAmt: number; // small brown cones on the boughs (autumn)
  lightStrength: number; // overall ambient wash strength
  shadowStrength: number; // contact shadow opacity
}

// Four parameter sets. paint() reads ONLY these (+ bob/sway). Foliage stays in
// the dark-evergreen-green family — seasons shift it fresh→deep→olive→muted but
// NEVER off-green (palette lock); the BOLD per-season props carry the read.
const SP: Record<"Spring" | "Summer" | "Autumn" | "Winter", P> = {
  Spring: {
    foliageDark: [30, 84, 44],
    foliageMid: [56, 130, 62],
    foliageLight: [124, 188, 96],
    trunk: [120, 88, 56],
    trunkShade: [86, 60, 38],
    padGrass: [126, 200, 86],
    soil: [104, 78, 44],
    outlineTint: [22, 50, 30],
    lightTint: [216, 244, 232], // cool-bright dewy
    leafDensity: 0.96,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    icicleAmt: 0,
    blossomAmt: 0.8,
    newGrowthAmt: 0.9,
    fallenLeafAmt: 0,
    coneAmt: 0,
    lightStrength: 0.22,
    shadowStrength: 0.2,
  },
  Summer: {
    foliageDark: [14, 58, 30],
    foliageMid: [24, 96, 42],
    foliageLight: [70, 150, 64],
    trunk: [116, 84, 52],
    trunkShade: [82, 56, 34],
    padGrass: [64, 162, 60],
    soil: [96, 70, 40],
    outlineTint: [10, 38, 22],
    lightTint: [255, 246, 208], // warm peak
    leafDensity: 1.0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    icicleAmt: 0,
    blossomAmt: 0,
    newGrowthAmt: 0,
    fallenLeafAmt: 0,
    coneAmt: 0,
    lightStrength: 0.26,
    shadowStrength: 0.3,
  },
  Autumn: {
    foliageDark: [56, 72, 38],
    foliageMid: [92, 108, 56],
    foliageLight: [144, 156, 92],
    trunk: [108, 78, 46],
    trunkShade: [76, 52, 30],
    padGrass: [156, 142, 80],
    soil: [110, 80, 44],
    outlineTint: [42, 48, 26],
    lightTint: [250, 218, 162], // low amber
    leafDensity: 0.94,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    icicleAmt: 0,
    blossomAmt: 0,
    newGrowthAmt: 0,
    fallenLeafAmt: 0.6,
    coneAmt: 0.8,
    lightStrength: 0.26,
    shadowStrength: 0.22,
  },
  Winter: {
    foliageDark: [24, 58, 40],
    foliageMid: [38, 84, 52],
    foliageLight: [84, 128, 90],
    trunk: [104, 84, 64],
    trunkShade: [74, 58, 42],
    padGrass: [200, 214, 228],
    soil: [120, 126, 136],
    outlineTint: [28, 46, 40],
    lightTint: [208, 224, 242], // cool blue-grey
    leafDensity: 0.96, // evergreen — stays full under the snow
    frostAmt: 0.85,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    icicleAmt: 1.0,
    blossomAmt: 0,
    newGrowthAmt: 0,
    fallenLeafAmt: 0,
    coneAmt: 0,
    lightStrength: 0.2,
    shadowStrength: 0.16,
  },
};

// ── Static geometry shared by every season ───────────────────────────────────
//
// The columnar spire is a stack of overlapping foliage TIERS down the trunk,
// narrowing toward the pointed top — a slim flame/cypress silhouette. Each tier
// is [centerY, halfWidth]; drawn bottom-up so upper tiers overlap lower ones.
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
    // a couple of snow mounds at the base for a deep-blanket read
    ctx.fillStyle = "#ffffff";
    ([[-8, 19, 5], [7, 20, 4.5], [0, 21, 6]] as Array<[number, number, number]>).forEach(
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
function spire(ctx: CanvasRenderingContext2D, p: P, sway: number): void {
  const d = clamp01(p.leafDensity);
  TIERS.forEach(([cy, hw]) => {
    const w = hw * (0.86 + 0.14 * d);
    foliageTier(ctx, cy, w, p, sway);
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

// Spring NEW-GROWTH TIP: a bright lime candle of fresh growth poking off the
// crown — an unmistakable spring cue on the evergreen.
function newGrowthTip(ctx: CanvasRenderingContext2D, p: P, sway: number): void {
  if (p.newGrowthAmt < 0.02) return;
  const a = clamp01(p.newGrowthAmt);
  const s = sway * 0.9;
  ctx.save();
  ctx.globalAlpha = a;
  // a slim bright candle rising past the crown
  ctx.fillStyle = "rgba(186,236,118,1)";
  ctx.beginPath();
  ctx.moveTo(-1.3 + s, SPIRE_TOP + 1.0);
  ctx.quadraticCurveTo(-0.4 + s * 1.3, SPIRE_TOP - 4.2, 0.2 + s * 1.5, SPIRE_TOP - 5.4);
  ctx.quadraticCurveTo(0.9 + s * 1.3, SPIRE_TOP - 4.0, 1.3 + s, SPIRE_TOP + 1.0);
  ctx.closePath();
  ctx.fill();
  // a couple of side candles lower on the crown
  ctx.fillStyle = "rgba(204,244,140,0.95)";
  ([[-2.6, -16, -0.5], [2.4, -13, 0.5]] as Array<[number, number, number]>).forEach(
    ([cx, cy, rot]) => {
      ctx.save();
      ctx.translate(cx + s * 0.7, cy);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, -1.6, 0.9, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
  );
  ctx.restore();
  ctx.globalAlpha = 1;
}

// Autumn CONES: a small brown cone or two clinging to the boughs.
function cones(ctx: CanvasRenderingContext2D, p: P, sway: number): void {
  if (p.coneAmt < 0.02) return;
  const a = clamp01(p.coneAmt);
  const spots: Array<[number, number]> = [
    [3.6, -3],
    [-3.4, -9],
    [2.4, -14],
  ];
  spots.forEach(([cx, cy], i) => {
    if (i / spots.length > a + 0.05) return;
    const s = sway * (0.4 + (SPIRE_BASE - cy) / 40);
    ctx.save();
    ctx.translate(cx + s, cy);
    // body
    ctx.fillStyle = rgb([122, 78, 38], a);
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.5, 2.2, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // scale shading
    ctx.fillStyle = rgb([84, 50, 24], a * 0.8);
    ctx.beginPath();
    ctx.ellipse(0.4, 0.6, 0.9, 1.4, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // top highlight
    ctx.fillStyle = rgb([162, 116, 64], a * 0.9);
    ctx.beginPath();
    ctx.ellipse(-0.4, -0.9, 0.7, 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// Snow piled WHITE-CAPPED on the upward foliage boughs (winter). The deep green
// stays visible beneath — snow caps the tops, not a full coat. `melt` 0..1 trims
// the load (used by the rare snow-plop special so a bough sheds its clump).
function snowCaps(ctx: CanvasRenderingContext2D, p: P, sway: number, melt = 0): void {
  if (p.snowCapAmt < 0.02) return;
  const a = clamp01(p.snowCapAmt);
  TIERS.forEach(([cy, hw], i) => {
    if (i % 2 === 1) return; // snow on alternating tiers — capped, not a full coat
    // the lowest snowed bough (i===0) is the one that sheds during the plop
    const load = i === 0 ? a * (1 - clamp01(melt)) : a;
    if (load < 0.02) return;
    const s = sway * (0.4 + (SPIRE_BASE - cy) / 40);
    // a soft white snow clump hugging the top of this tier's lobe
    ctx.fillStyle = `rgba(244,248,255,${load})`;
    ctx.beginPath();
    ctx.moveTo(-hw * 0.78 + s, cy - 1.2);
    ctx.quadraticCurveTo(-hw * 0.44 + s, cy - 3.8, s, cy - 3.4);
    ctx.quadraticCurveTo(hw * 0.44 + s, cy - 3.8, hw * 0.78 + s, cy - 1.2);
    ctx.quadraticCurveTo(hw * 0.34 + s, cy - 2.0, s, cy - 1.7);
    ctx.quadraticCurveTo(-hw * 0.34 + s, cy - 2.0, -hw * 0.78 + s, cy - 1.2);
    ctx.closePath();
    ctx.fill();
    // bright cap on top of the clump
    ctx.fillStyle = `rgba(255,255,255,${load})`;
    ctx.beginPath();
    ctx.ellipse(-hw * 0.18 + s, cy - 2.8, hw * 0.4, 0.9, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // pale shadow under the clump
    ctx.fillStyle = `rgba(206,222,240,${load * 0.5})`;
    ctx.beginPath();
    ctx.ellipse(s, cy - 1.3, hw * 0.5, 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // a plump snow cap on the very crown
  ctx.fillStyle = `rgba(248,251,255,${a})`;
  ctx.beginPath();
  ctx.ellipse(sway * 0.7, SPIRE_TOP + 0.4, 2.1, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
}

// A hanging icicle off a low bough (winter). Rides with the sway.
function icicle(ctx: CanvasRenderingContext2D, p: P, sway: number): void {
  if (p.icicleAmt < 0.02) return;
  const a = clamp01(p.icicleAmt);
  const draw = (x: number, y: number, len: number): void => {
    const g = ctx.createLinearGradient(x, y, x, y + len);
    g.addColorStop(0, `rgba(220,238,255,${0.95 * a})`);
    g.addColorStop(1, `rgba(255,255,255,${0.6 * a})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 1.1, y);
    ctx.lineTo(x + 1.1, y);
    ctx.lineTo(x, y + len);
    ctx.closePath();
    ctx.fill();
  };
  draw(-5.4 + sway * 0.6, 5.2, 5.4);
  draw(4.6 + sway * 0.5, 1.0, 3.8);
}

// ── THE single parameterized paint ───────────────────────────────────────────
// Whole tile from p + bob (vertical idle offset) + sway (horizontal lean) and an
// optional snow-melt for the rare winter plop. Never throws.
function paint(
  ctx: CanvasRenderingContext2D,
  p: P,
  bob: number,
  sway = 0,
  snowMelt = 0,
): void {
  ctx.save();
  try {
    ctx.globalAlpha = 1;

    // Pad is rooted to the ground (does not bob/sway).
    padEllipse(ctx, p);

    // The tree leans + bobs as one unit (the idle action).
    ctx.save();
    ctx.translate(0, -bob);
    trunkBase(ctx, p);
    spire(ctx, p, sway);
    cones(ctx, p, sway);
    newGrowthTip(ctx, p, sway);
    snowCaps(ctx, p, sway, snowMelt);
    icicle(ctx, p, sway);
    ctx.restore();

    // Ambient light wash (cool/warm per season), upper-left bias. Low-alpha
    // overlay; never a white-out.
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
    frostAmt: lerp(a.frostAmt, b.frostAmt, f),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, f),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, f),
    icicleAmt: lerp(a.icicleAmt, b.icicleAmt, f),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, f),
    newGrowthAmt: lerp(a.newGrowthAmt, b.newGrowthAmt, f),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, f),
    coneAmt: lerp(a.coneAmt, b.coneAmt, f),
    lightStrength: lerp(a.lightStrength, b.lightStrength, f),
    shadowStrength: lerp(a.shadowStrength, b.shadowStrength, f),
  };
}

// ── Rare specials (deterministic, seamless) ──────────────────────────────────

// A single small bird (front-¾) used by the rare special on the green seasons.
// Per-species palette: a BLUE TIT / bluebird — vivid blue back + blue cap over a
// pale lemon belly. The bright blue reads clearly against the cypress's dark
// evergreen green.
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
  // body — vivid blue back
  ctx.fillStyle = "#2f6fc4";
  ctx.beginPath();
  ctx.ellipse(0, 0, 3.8, 2.9, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // pale lemon belly
  ctx.fillStyle = "#f2e08c";
  ctx.beginPath();
  ctx.ellipse(-1.2, 0.5, 2.1, 2.0, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // tail — deeper blue
  ctx.fillStyle = "#1f4a8c";
  ctx.beginPath();
  ctx.moveTo(3.0, -0.4);
  ctx.lineTo(6.4, -1.6);
  ctx.lineTo(5.9, 1.1);
  ctx.closePath();
  ctx.fill();
  // wing (opens during flit-off) — deep blue
  ctx.save();
  ctx.translate(0.5, -0.4);
  ctx.rotate(-0.5 * wing);
  ctx.fillStyle = "#1f4a8c";
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.9 + wing * 1.9, 1.6 + wing * 1.1, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // head (looks around) — blue cap over a pale cheek
  ctx.save();
  ctx.translate(-3.0, -2.2);
  ctx.rotate(look);
  // pale cheek base
  ctx.fillStyle = "#f4eecf";
  ctx.beginPath();
  ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // blue cap on the crown
  ctx.fillStyle = "#2f6fc4";
  ctx.beginPath();
  ctx.arc(0.1, -0.6, 2.2, Math.PI * 1.04, Math.PI * 2.06);
  ctx.fill();
  // beak — small dark tit bill
  ctx.fillStyle = "#3a3326";
  ctx.beginPath();
  ctx.moveTo(-2.0, 0.2);
  ctx.lineTo(-4.0, -0.2);
  ctx.lineTo(-2.0, 0.9);
  ctx.closePath();
  ctx.fill();
  // eye
  ctx.fillStyle = "#0e0a06";
  ctx.beginPath();
  ctx.arc(-0.5, -0.4, 0.75, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.globalAlpha = 1;
}

// The rare bird special: lands near the top of the spire, looks around, flits
// off up-and-right, fully gone by q=1 (so the loop returns to the rest pose).
function birdSpecial(ctx: CanvasRenderingContext2D, q: number): void {
  if (q < 0) return;
  const anchorX = 6; // just right of the upper spire
  const anchorY = -15;
  let hop = 0;
  let look = 0;
  let wing = 0;
  let alpha: number;
  let dx = 0;
  let dy = 0;
  if (q < 0.25) {
    const f = q / 0.25;
    alpha = smoother(f);
    dy = -10 * (1 - smoother(f)); // drops onto the bough from above
    hop = -2 * Math.sin(f * Math.PI); // little hop on landing
  } else if (q < 0.7) {
    const f = (q - 0.25) / 0.45;
    alpha = 1;
    look = Math.sin(f * Math.PI * 2) * 0.5; // a couple of look-arounds
    hop = -2.0 * Math.abs(Math.sin(f * Math.PI * 2));
  } else {
    const f = (q - 0.7) / 0.3;
    alpha = 1 - smoother(f); // gone by q=1
    wing = Math.abs(Math.sin(f * Math.PI * 3)); // flapping
    dx = 11 * smoother(f); // flits up-and-right
    dy = -13 * smoother(f);
    look = 0.3;
  }
  bird(ctx, anchorX + dx, anchorY + dy, hop, look, wing, alpha);
}

// The rare winter special: a CLUMP of snow plops off the lowest snowed bough and
// falls to the pad, where it splats and fades. Returns the `melt` 0..1 to feed
// snowCaps so that bough is bare while the clump is airborne, restored by q=1.
function snowPlopMelt(q: number): number {
  if (q < 0) return 0;
  // bough is shed for the first ~70% of the window, then snow "re-settles" so the
  // load is full again at q=1 (seamless return to the rest pose).
  if (q < 0.7) return smoother(q / 0.7);
  return 1 - smoother((q - 0.7) / 0.3);
}

function snowPlop(ctx: CanvasRenderingContext2D, q: number, sway: number): void {
  if (q < 0) return;
  // The clump leaves the lowest snowed bough (tier i=0 at cy≈11) and falls. It is
  // released at q≈0.12 and lands by q≈0.7, then a small splat fades by q=1.
  const releaseQ = 0.12;
  const landQ = 0.7;
  const startY = 9.0;
  const startX = 5.0 + sway * (0.4 + (SPIRE_BASE - 11) / 40);
  const landY = 18.0;
  if (q >= releaseQ && q < landQ) {
    const f = (q - releaseQ) / (landQ - releaseQ);
    const fall = f * f; // accelerating fall
    const cx = startX + f * 2.2; // drifts a touch outward
    const cy = startY + fall * (landY - startY);
    const r = 2.6 * (1 - 0.25 * f);
    ctx.save();
    ctx.globalAlpha = clamp01(1 - f * 0.3);
    ctx.fillStyle = "rgba(248,251,255,1)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(206,222,240,0.6)";
    ctx.beginPath();
    ctx.ellipse(cx + 0.4, cy + 0.6, r * 0.6, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  } else if (q >= landQ) {
    // splat on the pad, fading out by q=1
    const f = (q - landQ) / (1 - landQ);
    const a = (1 - smoother(f)) * 0.85;
    if (a > 0.01) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.beginPath();
      ctx.ellipse(startX + 2.4, landY + 1.2, 3.4 + f * 2.4, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
}

// ── Per-season draw + anim ───────────────────────────────────────────────────

type Season = "Spring" | "Summer" | "Autumn" | "Winter";

function makeDraw(season: Season) {
  return (ctx: CanvasRenderingContext2D): void => paint(ctx, SP[season], 0, 0, 0);
}

// Green seasons (Spring/Summer/Autumn) share the two-tier idle: COMMON sway +
// RARE bird. Only the parameter set differs.
function animGreen(ctx: CanvasRenderingContext2D, t: number, season: Season): void {
  const sway = swayAt(t);
  const bob = swayBobAt(t);
  paint(ctx, SP[season], bob, sway, 0);
  birdSpecial(ctx, actionQ(t, SPECIAL_PERIOD, SPECIAL_WIN, SPECIAL_PERIOD / 2));
}

function animSpring(ctx: CanvasRenderingContext2D, t: number): void {
  animGreen(ctx, t, "Spring");
}
function animSummer(ctx: CanvasRenderingContext2D, t: number): void {
  animGreen(ctx, t, "Summer");
}
function animAutumn(ctx: CanvasRenderingContext2D, t: number): void {
  animGreen(ctx, t, "Autumn");
}

// Winter: COMMON sway (bare/stiffer, snow-laden) + RARE snow-plop instead of the
// bird. Plus ambient drifting flakes on top (additive, seamless).
function animWinter(ctx: CanvasRenderingContext2D, t: number): void {
  const sway = swayAt(t) * 0.8; // snow-laden boughs are a touch stiffer
  const bob = swayBobAt(t) * 0.8;
  const plopQ = actionQ(t, SPECIAL_PERIOD, SPECIAL_WIN, SPECIAL_PERIOD / 2);
  const melt = snowPlopMelt(plopQ);
  paint(ctx, SP.Winter, bob, sway, melt);
  snowPlop(ctx, plopQ, sway);

  // Ambient drifting snowflakes + cold sheen (additive on top).
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
// transition(0) ≡ draw(from), transition(1) ≡ draw(to). Every field lerps — the
// evergreen spire keeps its silhouette while colour, snow, cones, new-growth and
// the pad dressing cross-fade smoothly.
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
