// BOLD seasonal art for the BIRCH tree board tile.
//
// This mirrors the APPROVED "bold & fun" direction proven on oak.bold.ts —
// LOUD, glance-readable seasons + a two-tier WC3-style idle driven by a
// deterministic action clock — while keeping the BIRCH identity intact: a
// slender WHITE-BARK trunk (with its signature dark lenticel dashes) and an
// airy oval canopy. The trunk geometry is CONSTANT every season (the recognized
// Tree exception); only the foliage shape/colour/density + seasonal props move.
//
// BOLD seasons (unmistakable at ~58 px):
//   Spring — pale dangling CATKINS + young pale-green leaves; cool-bright pad
//            with tiny blossom flecks.
//   Summer — full AIRY mid-green canopy with the WHITE-BARK trunk clearly
//            visible through the airy crown (not buried); warm light.
//   Autumn — VIVID bright GOLD-yellow canopy + a steady fall of leaves; warm
//            olive-tan pad.
//   Winter — BARE white trunk + branch silhouette under a REAL HEAVY SNOW LOAD
//            on the limbs, a hanging ICICLE, and a deep snow blanket on the pad
//            (clearly snowy — not a faint dusting).
//
// TWO-TIER WC3 IDLE (deterministic clock — like oak.bold's actionQ; mostly at
// rest):
//   COMMON  ~every 6 s — a BIG airy canopy SWAY (~13 px lean-and-return).
//   RARE    ~every 18 s — a small BIRD hops onto a branch, looks around, then
//            flits off (~1.3 s). In AUTUMN the rare action is instead a GUST
//            that blows a flurry of gold leaves off the canopy.
// Both actions are enveloped to ZERO value AND zero velocity at the window
// edges, so the loop is seamless. They may paint outside the −24..+24 box.
//
// Transitions are pure parameter tweens (no popping): transition(0) ≡ draw(from)
// and transition(1) ≡ draw(to) EXACTLY, because at p=0/1 paint() is fed the
// from/to parameter set unchanged and at rest (sway=0, shimmer=0, bob=0).
//
// Origin-centered in the ~-24..+24 design box; the tree grows UP (negative y)
// from a trunk base near y≈+19 (pad center). Never throws; clamps; save/restore;
// resets globalAlpha.

import type { SeasonalTileEntry, SeasonalTransitionSet, SeasonName } from "../types.js";

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

// ── Deterministic action clock (the WC3 two-tier idle engine) ─────────────────
//
// actionQ returns a phase in [0,1) WHILE inside an action window (length `win`
// seconds, repeating every `period`), or −1 at rest. Same engine as oak.bold.

function actionQ(t: number, period: number, win: number, phase: number): number {
  const c = (((t + phase) % period) + period) % period;
  return c < win ? c / win : -1;
}

// One-shot bell: rises 0→1→0 with ZERO velocity at both ends (sin²). Used to
// envelope the special so it begins and ends at the rest pose.
function bell(q: number): number {
  if (q < 0) return 0;
  const s = Math.sin(Math.PI * clamp01(q));
  return s * s;
}

// Signed lean: 0 at q=0 and q=1 with zero VALUE and zero SLOPE at both ends.
// (1−cos(2π q))/2 — used for the big canopy sway so it's seamless.
function leanEnvelope(q: number): number {
  if (q < 0) return 0;
  return (1 - Math.cos(2 * Math.PI * clamp01(q))) * 0.5;
}

// COMMON action: a BIG airy canopy sway every ~6 s over a ~1.0 s window.
const SWAY_PERIOD = 6.0;
const SWAY_WIN = 1.0;
const SWAY_AMP = 13; // peak horizontal canopy travel (design px) — BOLD.

// RARE action: a ~1.3 s special every ~18 s (bird hop / autumn leaf-gust).
const SPECIAL_PERIOD = 18.0;
const SPECIAL_WIN = 1.3;

// Whole-canopy sway offset (design px) at time t — leans right then back, 0 at
// the window edges.
function swayAt(t: number): number {
  return leanEnvelope(actionQ(t, SWAY_PERIOD, SWAY_WIN, 0)) * SWAY_AMP;
}

// A gentle settle bob that accompanies the sway (small, seamless: 0 at edges).
function swayBobAt(t: number): number {
  return bell(actionQ(t, SWAY_PERIOD, SWAY_WIN, 0)) * 1.4;
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
  branchTone: RGB; // bare twig/limb colour — dark in winter so it reads against snow
  padGrass: RGB;
  soil: RGB;
  outlineTint: RGB; // soft dark outline colour
  lightTint: RGB; // ambient light wash (cool/warm per season)
  catkinTint: RGB; // pale catkin colour (spring)
  // scalars 0..1
  leafDensity: number; // canopy fullness (winter ≈ 0 → bare branches)
  airy: number; // how MUCH of the trunk shows through the crown (1 = very airy)
  catkinAmt: number; // pale dangling catkins (spring)
  frostAmt: number; // frost sparkle on pad / cold sheen (winter)
  branchSnowAmt: number; // HEAVY snow load riding the branches (winter)
  padSnowAmt: number; // snow blanket over the pad (winter)
  icicleAmt: number; // hanging icicle off a limb (winter)
  blossomAmt: number; // tiny blossom flecks on the pad (spring)
  fallenLeafAmt: number; // leaves resting on the pad (autumn)
  lightStrength: number; // overall ambient wash strength
  shadowStrength: number; // contact shadow opacity
}

// Four BOLD parameter sets. paint() reads ONLY these (+ bob/sway/shimmer).
const SP: Record<SeasonName, P> = {
  Spring: {
    foliageDark: [86, 138, 50],
    foliageMid: [150, 206, 84], // young, pale-bright spring green
    foliageLight: [206, 236, 138],
    bark: [240, 242, 238],
    barkShade: [196, 202, 200],
    lenticel: [70, 70, 66],
    branchTone: [150, 138, 116],
    padGrass: [128, 200, 88],
    soil: [104, 78, 44],
    outlineTint: [44, 50, 38],
    lightTint: [214, 238, 232], // cool-bright
    catkinTint: [228, 220, 158],
    leafDensity: 0.62,
    airy: 0.6,
    catkinAmt: 1.0, // BOLD: catkins everywhere
    frostAmt: 0,
    branchSnowAmt: 0,
    padSnowAmt: 0,
    icicleAmt: 0,
    blossomAmt: 0.6,
    fallenLeafAmt: 0,
    lightStrength: 0.22,
    shadowStrength: 0.2,
  },
  Summer: {
    foliageDark: [36, 92, 28],
    foliageMid: [66, 150, 44],
    foliageLight: [150, 206, 86],
    bark: [242, 244, 240],
    barkShade: [194, 200, 196],
    lenticel: [64, 64, 60],
    branchTone: [142, 130, 108],
    padGrass: [70, 158, 64],
    soil: [96, 70, 40],
    outlineTint: [36, 48, 30],
    lightTint: [255, 244, 206], // warm
    catkinTint: [228, 220, 158],
    leafDensity: 1.0,
    airy: 1.0, // AIRY summer crown — the white trunk reads clearly through it
    catkinAmt: 0,
    frostAmt: 0,
    branchSnowAmt: 0,
    padSnowAmt: 0,
    icicleAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    lightStrength: 0.24,
    shadowStrength: 0.26,
  },
  Autumn: {
    foliageDark: [180, 120, 16],
    foliageMid: [248, 188, 24], // VIVID bright gold-yellow
    foliageLight: [255, 226, 90],
    bark: [234, 232, 222],
    barkShade: [188, 184, 172],
    lenticel: [72, 60, 44],
    branchTone: [150, 120, 82],
    padGrass: [156, 142, 78],
    soil: [110, 80, 44],
    outlineTint: [60, 46, 22],
    lightTint: [255, 226, 150], // warm amber
    catkinTint: [228, 220, 158],
    leafDensity: 0.74,
    airy: 0.7,
    catkinAmt: 0,
    frostAmt: 0,
    branchSnowAmt: 0,
    padSnowAmt: 0,
    icicleAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.7,
    lightStrength: 0.26,
    shadowStrength: 0.22,
  },
  Winter: {
    foliageDark: [120, 132, 120],
    foliageMid: [160, 172, 160],
    foliageLight: [200, 210, 204],
    bark: [238, 242, 246],
    barkShade: [190, 200, 208],
    lenticel: [58, 60, 64],
    branchTone: [84, 80, 76], // dark wet twigs — must read against the white snow
    padGrass: [198, 212, 226],
    soil: [120, 126, 136],
    outlineTint: [46, 52, 62],
    lightTint: [206, 222, 240], // cool blue-grey
    catkinTint: [228, 220, 158],
    leafDensity: 0.0, // BARE
    airy: 1.0,
    catkinAmt: 0,
    frostAmt: 0.85,
    branchSnowAmt: 0.6, // lighter snow ridge so the dark twigs read (not a white fan)
    padSnowAmt: 1.0, // deep snow blanket
    icicleAmt: 1.0, // hanging icicle
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
  [-12, -14, 5.4],
  [-5, -20, 6.0],
  [4, -21, 6.0],
  [13, -13, 5.4],
  [0, -9, 4.6],
  [-15, -7, 4.0],
  [16, -6, 4.0],
  [-3, -17, 5.0],
  [7, -16, 5.0],
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
      ctx.arc(sx, sy, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(248,210,90,${a})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Autumn fallen leaves resting on the pad (bigger so they read small).
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
      ctx.ellipse(0, 0, 2.8, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgb(p.outlineTint, 0.4);
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    });
  }

  // Snow blanket over the pad (winter) — bright and deep, with mounds.
  if (p.padSnowAmt > 0.02) {
    const snow = ctx.createLinearGradient(0, 14, 0, 23);
    snow.addColorStop(0, "#f3f8ff");
    snow.addColorStop(1, "#c2d2e4");
    ctx.save();
    ctx.globalAlpha = p.padSnowAmt;
    ctx.fillStyle = snow;
    ctx.beginPath();
    ctx.ellipse(0, 18.4, 18.5, 5.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Plump snow mounds for a deep-blanket read.
    ctx.fillStyle = "#ffffff";
    const mounds: Array<[number, number, number]> = [
      [-8, 18.6, 5], [7, 19.4, 4.5], [0, 20, 6],
    ];
    mounds.forEach(([mx, my, mr]) => {
      ctx.beginPath();
      ctx.ellipse(mx, my, mr, mr * 0.5, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    });
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
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
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
  BRANCHES.forEach(([cx, cy, tx, ty, w]) => {
    const s = sway * (0.4 + Math.abs(tx) / 24);
    // Branch limb — its own twig tone (dark in winter so the bare limbs read
    // against the snow instead of vanishing white-on-white).
    ctx.strokeStyle = rgb(p.branchTone, 1);
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
    ctx.strokeStyle = rgb(scale3(p.branchTone, 0.92), 1);
    ctx.lineWidth = w * 0.5;
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.5, cy);
    ctx.lineTo(cx + s * 0.5 + (tx < 0 ? -4 : 4), cy - 5);
    ctx.stroke();
  });
  ctx.lineCap = "butt";
}

// HEAVY snow load riding the bare limbs (winter). A thick white ridge along the
// upper side of each limb + a plump clump on the tip. Big enough to read small.
function branchSnow(ctx: CanvasRenderingContext2D, p: P, sway: number): void {
  if (p.branchSnowAmt < 0.02) return;
  const load = clamp01(p.branchSnowAmt);
  ctx.lineCap = "round";
  BRANCHES.forEach(([cx, cy, tx, ty, w], idx) => {
    const s = sway * (0.4 + Math.abs(tx) / 24);
    // a SLIM snow ridge on the upper side of the limb (offset up a touch) — half
    // the old width so the dark twig reads beneath it
    ctx.strokeStyle = `rgba(223,233,246,${load})`;
    ctx.lineWidth = (w + 1.2) * load;
    ctx.beginPath();
    ctx.moveTo(0, -4.0);
    ctx.quadraticCurveTo(cx + s * 0.5, cy - 1.6, tx + s, ty - 1.4);
    ctx.stroke();
    // bright crown on top of the snow
    ctx.strokeStyle = `rgba(255,255,255,${load})`;
    ctx.lineWidth = (w + 0.3) * load;
    ctx.beginPath();
    ctx.moveTo(0, -4.4);
    ctx.quadraticCurveTo(cx + s * 0.5, cy - 2.2, tx + s, ty - 2.0);
    ctx.stroke();
    // a small snow clump on the limb tip
    ctx.fillStyle = `rgba(255,255,255,${load})`;
    ctx.beginPath();
    ctx.ellipse(
      tx + s,
      ty - 1.6,
      (1.5 + (idx % 2) * 0.5) * load,
      (1.1 + (idx % 2) * 0.3) * load,
      tx < 0 ? -0.5 : 0.5,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  });
  ctx.lineCap = "butt";
}

// A hanging icicle off a low-left limb (winter). Rides with the sway.
function icicle(ctx: CanvasRenderingContext2D, p: P, sway: number): void {
  if (p.icicleAmt < 0.02) return;
  const a = clamp01(p.icicleAmt);
  const draw = (x: number, y: number, len: number): void => {
    const g = ctx.createLinearGradient(x, y, x, y + len);
    g.addColorStop(0, `rgba(220,238,255,${0.95 * a})`);
    g.addColorStop(1, `rgba(255,255,255,${0.65 * a})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 1.2, y);
    ctx.lineTo(x + 1.2, y);
    ctx.lineTo(x, y + len);
    ctx.closePath();
    ctx.fill();
  };
  draw(-8 + sway * 0.6, -8.0, 5.5 * a);
  draw(6 + sway * 0.4, -5.0, 4.0 * a);
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
  // Airy crowns use a slightly translucent blob so the white trunk reads through
  // (so summer's full crown still shows the bark, per the bold brief).
  const blobAlpha = lerp(0.95, 0.82, clamp01(p.airy));
  CLUSTERS.forEach(([x, y, r], i) => {
    // Outer / higher clusters thin out first as density drops, so the canopy
    // empties from the edges and the silhouette stays believable.
    const threshold = i / CLUSTERS.length; // 0..1 across the list
    const grow = clamp01((d - threshold * 0.55) / 0.45);
    if (grow < 0.04) return;
    const s = sway * (0.3 + Math.abs(x) / 28) + Math.sin(shimmer + i) * 0.35 * d;
    canopyBlob(ctx, x + s, y, r * grow, p, blobAlpha);
  });

  // Airy leaflet flecks for the dappled birch look (bigger so they read small).
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
        ctx.ellipse(x + s + Math.cos(a) * r, y + Math.sin(a) * r, 1.4, 2.1, a, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
}

function catkins(ctx: CanvasRenderingContext2D, p: P, sway: number): void {
  if (p.catkinAmt < 0.02) return;
  // Pale dangling catkins from the upper twigs (bigger so they read small).
  const anchors: Array<[number, number]> = [
    [-9, -16], [4, -18], [-3, -13], [11, -11], [8, -19], [-13, -9], [0, -21],
  ];
  anchors.forEach(([ax, ay], i) => {
    if (i / anchors.length > p.catkinAmt + 0.1) return;
    const dx = sway * 0.6 + Math.sin(i * 1.3) * 0.4;
    ctx.strokeStyle = rgb(p.catkinTint, 0.9 * p.catkinAmt);
    ctx.lineWidth = 2.0;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(ax + dx * 0.5, ay + 4, ax + dx, ay + 7.5);
    ctx.stroke();
    ctx.lineCap = "butt";
    // pale tip highlight
    ctx.fillStyle = rgb(scale3(p.catkinTint, 1.08), 0.95 * p.catkinAmt);
    ctx.beginPath();
    ctx.ellipse(ax + dx, ay + 7.5, 1.3, 2.0, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ── THE single parameterized paint ───────────────────────────────────────────
// Whole tile from ONLY p + idle offsets. Never throws. The canopy + props share
// one `sway` so the BIG idle sway moves the whole crown as a unit.
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

    // Pad is rooted to the ground (does not bob/sway).
    padEllipse(ctx, p);

    // The tree bobs as one unit (subtle vertical idle).
    ctx.save();
    ctx.translate(0, -bob);
    trunk(ctx, p);
    branches(ctx, p, sway);
    branchSnow(ctx, p, sway);
    canopy(ctx, p, sway, shimmer);
    catkins(ctx, p, sway);
    icicle(ctx, p, sway);
    ctx.restore();

    // Ambient light wash (cool/warm per season), upper-left bias. Low-alpha
    // overlay; never a white-out.
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
    branchTone: lerp3(a.branchTone, b.branchTone, f),
    padGrass: lerp3(a.padGrass, b.padGrass, f),
    soil: lerp3(a.soil, b.soil, f),
    outlineTint: lerp3(a.outlineTint, b.outlineTint, f),
    lightTint: lerp3(a.lightTint, b.lightTint, f),
    catkinTint: lerp3(a.catkinTint, b.catkinTint, f),
    leafDensity: lerp(a.leafDensity, b.leafDensity, f),
    airy: lerp(a.airy, b.airy, f),
    catkinAmt: lerp(a.catkinAmt, b.catkinAmt, f),
    frostAmt: lerp(a.frostAmt, b.frostAmt, f),
    branchSnowAmt: lerp(a.branchSnowAmt, b.branchSnowAmt, f),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, f),
    icicleAmt: lerp(a.icicleAmt, b.icicleAmt, f),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, f),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, f),
    lightStrength: lerp(a.lightStrength, b.lightStrength, f),
    shadowStrength: lerp(a.shadowStrength, b.shadowStrength, f),
  };
}

// ── The RARE special: a small bird hops onto a branch and flits off ───────────
// Drawn at a left-branch anchor; lands, looks around twice, then opens its wing
// and flits up-and-left, fully gone by the window edge (alpha → 0). Per-species
// palette: a GOLDFINCH / yellow finch (bright yellow body + pale belly, with a
// dark cap + dark wings/tail) — reads loud against the birch's white bark and
// pale crown. Paints outside the box during the flit-off — that's fine.
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
  // body — bright finch yellow
  ctx.fillStyle = "#e9c12f";
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.2, 3.2, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // pale lemon belly
  ctx.fillStyle = "#f6dc59";
  ctx.beginPath();
  ctx.ellipse(-1.4, 0.6, 2.4, 2.2, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // tail — dark
  ctx.fillStyle = "#26241a";
  ctx.beginPath();
  ctx.moveTo(3.4, -0.4);
  ctx.lineTo(7.2, -1.8);
  ctx.lineTo(6.6, 1.2);
  ctx.closePath();
  ctx.fill();
  // wing (opens during flit-off) — dark goldfinch wing with a pale bar
  ctx.save();
  ctx.translate(0.6, -0.4);
  ctx.rotate(-0.5 * wing);
  ctx.fillStyle = "#1d1c14";
  ctx.beginPath();
  ctx.ellipse(0, 0, 3.2 + wing * 2.0, 1.8 + wing * 1.2, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f3e7b2";
  ctx.beginPath();
  ctx.ellipse(0.4, 0.5, 1.6 + wing * 0.9, 0.6 + wing * 0.4, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // head (looks around) — dark goldfinch cap over a yellow face
  ctx.save();
  ctx.translate(-3.4, -2.4);
  ctx.rotate(look);
  ctx.fillStyle = "#e9c12f";
  ctx.beginPath();
  ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
  ctx.fill();
  // black cap on the crown
  ctx.fillStyle = "#1d1c14";
  ctx.beginPath();
  ctx.arc(0.2, -0.7, 2.4, Math.PI * 1.05, Math.PI * 2.05);
  ctx.fill();
  // beak — pale ivory finch cone
  ctx.fillStyle = "#ecdcab";
  ctx.beginPath();
  ctx.moveTo(-2.2, 0.2);
  ctx.lineTo(-4.4, -0.2);
  ctx.lineTo(-2.2, 1.0);
  ctx.closePath();
  ctx.fill();
  // eye
  ctx.fillStyle = "#0e0a06";
  ctx.beginPath();
  ctx.arc(-0.6, -0.4, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

// Bird special timeline across the ~1.3 s window (q in [0,1], −1 at rest).
function birdSpecial(ctx: CanvasRenderingContext2D, q: number): void {
  if (q < 0) return;
  const anchorX = -9;
  const anchorY = -15;
  let hop = 0;
  let look = 0;
  let wing = 0;
  let alpha: number;
  let dx = 0;
  let dy = 0;
  if (q < 0.25) {
    // land: drop onto the branch from above, alpha up.
    const f = q / 0.25;
    alpha = smoother(f);
    dy = -10 * (1 - smoother(f));
    hop = -2 * Math.sin(f * Math.PI);
  } else if (q < 0.7) {
    // perch + look around (two little hops + head turns).
    const f = (q - 0.25) / 0.45;
    alpha = 1;
    look = Math.sin(f * Math.PI * 2) * 0.5;
    hop = -2.0 * Math.abs(Math.sin(f * Math.PI * 2));
  } else {
    // flit off: rise + fade + wing flapping → gone by q=1.
    const f = (q - 0.7) / 0.3;
    alpha = 1 - smoother(f);
    wing = Math.abs(Math.sin(f * Math.PI * 3));
    dx = -10 * smoother(f);
    dy = -13 * smoother(f);
    look = -0.3;
  }
  bird(ctx, anchorX + dx, anchorY + dy, hop, look, wing, alpha);
}

// The RARE autumn special: a GUST that lifts a flurry of gold leaves OFF the
// canopy and blows them up-and-right, fading out. Zero at q=0 and q=1 (bell).
function autumnGust(ctx: CanvasRenderingContext2D, p: P, q: number): void {
  if (q < 0) return;
  const burst = bell(q);
  if (burst <= 0.001) return;
  const flurry: Array<[number, number, number]> = [
    [-10, -16, 0.2],
    [-3, -22, 0.6],
    [5, -20, 0.85],
    [11, -14, 0.4],
    [-6, -12, 0.95],
    [1, -25, 0.5],
  ];
  flurry.forEach(([fx, fy, hb], i) => {
    const lx = fx + burst * (14 + i * 1.5) + Math.sin(q * Math.PI * 4 + i) * 2;
    const ly = fy - burst * (8 + i);
    ctx.save();
    ctx.globalAlpha = burst * 0.95;
    ctx.fillStyle = rgb(lerp3(p.foliageMid, p.foliageLight, hb), 1);
    ctx.translate(lx, ly);
    ctx.rotate(q * Math.PI * 6 + i);
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.8, 3.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  ctx.globalAlpha = 1;
}

// ── Per-season draw + anim ───────────────────────────────────────────────────

function makeDraw(season: SeasonName) {
  // Rest pose: no idle motion at all → anim(t=0) === draw exactly.
  return (ctx: CanvasRenderingContext2D): void => paint(ctx, SP[season], 0, 0, 0);
}

// Common-action shimmer: a small continuous leaf shimmer for life between sways.
function shimmerAt(t: number, rate: number): number {
  return t * rate;
}

// Spring: airy crown + catkins; the WC3 two-tier idle (sway + rare bird).
function animSpring(ctx: CanvasRenderingContext2D, t: number): void {
  paint(ctx, SP.Spring, swayBobAt(t), swayAt(t), shimmerAt(t, 2.4));
  birdSpecial(ctx, actionQ(t, SPECIAL_PERIOD, SPECIAL_WIN, SPECIAL_PERIOD / 2));
}

// Summer: full airy green crown (white trunk visible); sway + rare bird.
function animSummer(ctx: CanvasRenderingContext2D, t: number): void {
  paint(ctx, SP.Summer, swayBobAt(t), swayAt(t), shimmerAt(t, 1.9));
  birdSpecial(ctx, actionQ(t, SPECIAL_PERIOD, SPECIAL_WIN, SPECIAL_PERIOD / 2));
}

// Autumn: vivid gold crown + steady leaf-fall; the rare action is a leaf-GUST.
function animAutumn(ctx: CanvasRenderingContext2D, t: number): void {
  const p = SP.Autumn;
  paint(ctx, p, swayBobAt(t), swayAt(t), shimmerAt(t, 1.6));

  // Steady ambient leaf-fall on a seamless loop — drawn after the tree.
  ctx.save();
  try {
    // [startX, fallRate, hueBlend] — distinct rates desync the leaves while every
    // one starts at prog 0 (alpha 0) at t=0, so anim(0) matches the leaf-free
    // still and the loop wraps with no visible pop.
    const leaves: Array<[number, number, number]> = [
      [-6, 0.280, 0.55],
      [9, 0.245, 0.35],
      [2, 0.310, 0.7],
    ];
    leaves.forEach(([sx, rate, hb]) => {
      const prog = (t * rate) % 1;
      const ly = -8 + prog * 28; // canopy base to pad
      const lx = sx + Math.sin(prog * Math.PI * 2 + sx) * 6;
      const col = lerp3(p.foliageMid, p.foliageLight, hb);
      ctx.save();
      ctx.globalAlpha = Math.sin(Math.PI * prog); // fade in at the canopy, out at the pad
      ctx.fillStyle = rgb(col, 1);
      ctx.translate(lx, ly);
      ctx.rotate(prog * Math.PI * 3 + sx);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.7, 3.0, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    // RARE: leaf-gust special.
    autumnGust(ctx, p, actionQ(t, SPECIAL_PERIOD, SPECIAL_WIN, SPECIAL_PERIOD / 2));
  } catch {
    /* never throw */
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// Winter: bare snowy limbs + icicle; sway (stiffer) + rare bird + falling snow.
function animWinter(ctx: CanvasRenderingContext2D, t: number): void {
  const sway = swayAt(t) * 0.7; // bare limbs are stiffer
  const bob = swayBobAt(t) * 0.7;
  paint(ctx, SP.Winter, bob, sway, 0);

  ctx.save();
  try {
    const span = 36;
    const seeds: Array<[number, number, number]> = [
      [-9, 1.3, 0.0],
      [7, 1.1, 0.5],
      [13, 1.0, 0.7],
      [-3, 1.2, 0.25],
    ];
    seeds.forEach(([fx, r, phase]) => {
      const prog = ((t / 3.6 + phase) % 1 + 1) % 1;
      const fy = -24 + prog * span;
      const driftX = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
      ctx.fillStyle = "rgba(255,255,255,0.88)";
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

  birdSpecial(ctx, actionQ(t, SPECIAL_PERIOD, SPECIAL_WIN, SPECIAL_PERIOD / 2));
}

// ── Transitions: pure parameter tweens (no popping) ──────────────────────────
// transition(0) ≡ draw(from), transition(1) ≡ draw(to). Every field lerps,
// including leafDensity / branchSnowAmt / catkinAmt, so the canopy thins/fills,
// the snow load settles, and the catkins shed smoothly.
function makeTransition(from: SeasonName, to: SeasonName) {
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
