// BOLD seasonal art for the FIR tree board tile (`tile_tree_fir`).
// File: src/textures/seasonal/tree/fir.ts (category TREE).
//
// A conical EVERGREEN fir: a triangular tree of 4 stacked dark-green needle
// tiers ("skirts" that widen downward) on a short trunk + an apex spike. Because
// it is evergreen, the SILHOUETTE is identical in every season — foliage stays
// FULL all four seasons (it NEVER goes bare). Only the needle COLOUR, the winter
// SNOW LOAD + frost, the light wash, and the pad dressing change. The trunk keeps
// the tree's identity (the recognized-Tree exception).
//
// The seasons are made UNMISTAKABLE at a glance (~58 px):
//   Spring  — bright NEW NEEDLE TIPS lit lime-green at every branch end; dewy
//             lime pad + blossom flecks.
//   Summer  — PEAK deep rich saturated evergreen green; warm light.
//   Autumn  — dustier OLIVE green + a couple of brown CONES nestled in the tiers;
//             olive-tan pad with a few fallen leaves.
//   Winter  — boughs HEAVY WITH SNOW: every tier clearly snow-capped (a real
//             snow load) + a hanging ICICLE + snow-blanketed pad + frost. Green
//             still peeks beneath. NO white-out, NO bare branches.
//
// IDLE mirrors oak.bold's TWO-TIER WC3 clock (deterministic `actionQ`):
//   At rest most of the time. COMMON ~every 6 s: a gentle whole-tree SWAY (the
//   tiers shimmer/lean ~12 px peak, anticipation→settle, 0 velocity at the
//   window edges). RARE ~every 18 s: a small BIRD hops onto a bough, looks
//   around, then flits off (Spring/Summer/Autumn) — OR, in Winter, a SNOW CLUMP
//   plops off a tier and tumbles to the pad. Both windows return to the rest
//   pose seamlessly (sin²/(1−cos) envelopes, zero at both ends).
//
// Built from ONE parameterized paint() so every season shares geometry and each
// season→season morph is just a tween of the parameter set — no popping:
//   draw(season)     = paint(ctx, SP[season], 0, 0)
//   anim(season)     = paint(ctx, SP[season], bob, sway) + clock-driven specials
//   transition(from) = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0, 0)
// so transition(0) ≡ draw(from) and transition(1) ≡ draw(to) — seamless.
//
// Origin-centered in the ~-24..+24 design box; the fir grows UP (negative y)
// from a trunk base near y≈+19 (pad centre), apex near y≈-24. Light from the
// upper-left, one soft contact shadow lower-right. Pure Canvas-2D vector art —
// no images, no DOM, no libs. Animations are deterministic (sin/cos/modulo of
// `t` seconds), seamless, and may paint a little outside the box (bird flit).

import type { SeasonalTileEntry, SeasonalTransitionSet, SeasonName } from "../types.js";

// ── Small math helpers ───────────────────────────────────────────────────────

type RGB = [number, number, number];

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0; // also catches NaN
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f;
}

function lerp3(a: RGB, b: RGB, f: number): RGB {
  return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
}

function scale3(c: RGB, k: number): RGB {
  return [c[0] * k, c[1] * k, c[2] * k];
}

function rgb(c: RGB, alpha = 1): string {
  const r = Math.round(clamp01(c[0] / 255) * 255);
  const g = Math.round(clamp01(c[1] / 255) * 255);
  const b = Math.round(clamp01(c[2] / 255) * 255);
  return `rgba(${r},${g},${b},${clamp01(alpha)})`;
}

// Perlin-style smootherstep for transition pacing.
const smoother = (x: number): number => {
  const c = clamp01(x);
  return c * c * c * (c * (6 * c - 15) + 10);
};

// ── Deterministic two-tier idle clock (mirrors oak.bold's actionQ) ───────────
//
// actionQ returns a phase in [0,1) WHILE inside the action window (length `win`
// seconds, repeating every `period`), or −1 at rest.
function actionQ(t: number, period: number, win: number, phase: number): number {
  const c = (((t + phase) % period) + period) % period;
  return c < win ? c / win : -1;
}

// One-shot bell: rises 0→1→0 over the window with ZERO velocity at both ends
// (sin² is C¹-zero at 0 and 1). Envelopes specials so they start/end at rest.
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

// COMMON action: every ~6 s a noticeable whole-tree SWAY (peak ≈ 12 design px of
// tier lean) over a ~1.1 s window. RARE action: every ~18 s a ~1.4 s special,
// phased to the opposite side of the period so the two windows never collide.
const SWAY_PERIOD = 6.0;
const SWAY_WIN = 1.1;
const SWAY_AMP = 12; // peak horizontal tier travel in design px (BOLD, ~58px read)

const SPECIAL_PERIOD = 18.0;
const SPECIAL_WIN = 1.4;
const SPECIAL_PHASE = SPECIAL_PERIOD / 2;

// Whole-tree sway offset (design px) at time t — leans right then settles back.
function swayAt(t: number): number {
  const q = actionQ(t, SWAY_PERIOD, SWAY_WIN, 0);
  return leanEnvelope(q) * SWAY_AMP;
}

// Gentle settle bob accompanying the sway (small, seamless, 0 at the edges).
function bobAt(t: number): number {
  const q = actionQ(t, SWAY_PERIOD, SWAY_WIN, 0);
  return bell(q) * 1.4;
}

// ── Tweenable parameter set ──────────────────────────────────────────────────
// NO booleans / season strings inside paint — everything flows from P so the
// transitions interpolate cleanly. Colours are RGB tuples; amounts are 0..1.

interface P {
  // colours (the fir is PALETTE-LOCKED deep evergreen green; these only shift
  // tone/saturation by season, never to another identity colour)
  needleDark: RGB; // shadowed underside of each tier
  needleMid: RGB; // tier body tone
  needleLight: RGB; // lit upper-left edge of each tier
  tipHighlight: RGB; // fresh new needle tips at the branch ends (spring)
  trunk: RGB; // short trunk
  trunkShade: RGB; // shaded side of the trunk
  padGrass: RGB; // top of the grass pad
  soil: RGB; // soil core at the trunk base
  outlineTint: RGB; // soft dark outline colour
  lightTint: RGB; // ambient light wash (cool/warm per season)
  // scalars 0..1
  leafDensity: number; // evergreen → stays HIGH all year (foliage full)
  tipFreshAmt: number; // bright new needle tips at branch ends (spring)
  coneAmt: number; // small brown cones nestled in the tiers (autumn)
  frostAmt: number; // frost sparkle on pad / cold sheen (winter)
  snowLoadAmt: number; // thick snow resting on the tiers (winter)
  padSnowAmt: number; // snow blanket over the pad (winter)
  blossomAmt: number; // tiny blossom flecks on the pad (spring)
  fallenLeafAmt: number; // leaves resting on the pad (autumn)
  lightStrength: number; // overall ambient wash strength
  shadowStrength: number; // contact shadow opacity
}

// Four parameter sets. paint() reads ONLY these (+ a bob offset + tiny sway).
// PALETTE LOCK: every season's needle ramp stays deep evergreen green.
const SP: Record<"Spring" | "Summer" | "Autumn" | "Winter", P> = {
  // Spring — BRIGHT new needle tips lit lime at every branch end; dewy lime pad
  // + blossom. Vivid fresh growth makes spring unmistakable on an evergreen.
  Spring: {
    needleDark: [28, 78, 44],
    needleMid: [46, 116, 62],
    needleLight: [108, 170, 88],
    tipHighlight: [192, 230, 122], // vivid lime new growth at the tips (BOLD)
    trunk: [118, 84, 50],
    trunkShade: [86, 60, 36],
    padGrass: [126, 204, 88],
    soil: [104, 78, 44],
    outlineTint: [22, 46, 30],
    lightTint: [216, 240, 232], // cool-bright
    leafDensity: 1.0,
    tipFreshAmt: 1.0, // every branch end tipped bright (BOLD)
    coneAmt: 0,
    frostAmt: 0,
    snowLoadAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.7,
    fallenLeafAmt: 0,
    lightStrength: 0.22,
    shadowStrength: 0.2,
  },
  // Summer — PEAK: deep saturated rich evergreen green; warm light, strong shadow.
  Summer: {
    needleDark: [16, 62, 32],
    needleMid: [26, 102, 46],
    needleLight: [74, 152, 66],
    tipHighlight: [104, 170, 84],
    trunk: [110, 78, 46],
    trunkShade: [78, 54, 32],
    padGrass: [66, 162, 60],
    soil: [96, 70, 40],
    outlineTint: [12, 44, 22],
    lightTint: [255, 244, 200], // warm
    leafDensity: 1.0,
    tipFreshAmt: 0,
    coneAmt: 0,
    frostAmt: 0,
    snowLoadAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    lightStrength: 0.26,
    shadowStrength: 0.3,
  },
  // Autumn — dustier, OLIVE evergreen green; a couple of clear brown cones;
  // olive-tan pad with a few fallen leaves.
  Autumn: {
    needleDark: [46, 72, 42],
    needleMid: [78, 108, 54],
    needleLight: [126, 152, 80],
    tipHighlight: [134, 150, 80],
    trunk: [108, 76, 44],
    trunkShade: [78, 54, 30],
    padGrass: [156, 146, 82],
    soil: [110, 80, 44],
    outlineTint: [38, 52, 30],
    lightTint: [250, 216, 158], // low amber
    leafDensity: 1.0,
    tipFreshAmt: 0,
    coneAmt: 1.0, // a couple of clear brown cones (BOLD)
    frostAmt: 0,
    snowLoadAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.7,
    lightStrength: 0.28,
    shadowStrength: 0.22,
  },
  // Winter — boughs HEAVY WITH SNOW; cool blue-grey light. Green still shows
  // beneath the thick snow load. Snowy pad + frost + icicle. NO white-out.
  Winter: {
    needleDark: [34, 64, 50],
    needleMid: [46, 88, 60],
    needleLight: [86, 124, 92],
    tipHighlight: [120, 150, 120],
    trunk: [98, 74, 52],
    trunkShade: [70, 52, 38],
    padGrass: [196, 210, 224],
    soil: [120, 126, 136],
    outlineTint: [30, 46, 40],
    lightTint: [206, 222, 240], // cool blue-grey
    leafDensity: 1.0,
    tipFreshAmt: 0,
    coneAmt: 0,
    frostAmt: 0.85,
    snowLoadAmt: 1.0, // thick snow resting on every tier (BOLD, real load)
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    lightStrength: 0.2,
    shadowStrength: 0.16,
  },
};

// ── Static geometry shared by every season (the IDENTITY silhouette) ─────────

// The fir is a stack of needle "tiers" (skirts) that widen downward. Each tier
// is described by its centre Y, its half-width, and how deep it droops. Tiers
// are drawn back-to-front (top apex tier last on top). 4 stacked skirts.
// [centreY, halfWidth, skirtDepth]
const TIERS: Array<[number, number, number]> = [
  [13.5, 16.0, 6.0], // bottom (widest) skirt
  [6.0, 12.6, 5.4],
  [-1.0, 9.4, 4.8],
  [-8.5, 6.2, 4.2], // upper skirt; apex spike rises above this
];

const APEX_Y = -23.5; // tip of the conical crown
const TRUNK_TOP = 15.5; // where the lowest tier hides the trunk
const TRUNK_BOT = 19.0; // trunk base resting on the pad

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

  // Tufted edge — little bumps around the front/lower rim (hidden under snow).
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
      [-12, 20], [-6, 21.6], [9, 21], [13, 19.6], [2, 22], [-2, 19.6],
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
    const leaves: Array<[number, number, number, RGB]> = [
      [-9, 20.4, 0.5, [196, 120, 40]],
      [7, 21.4, -0.4, [176, 72, 32]],
      [-1, 22, 0.2, [182, 132, 46]],
    ];
    leaves.forEach(([lx, ly, rot, col], i) => {
      if (i / leaves.length > p.fallenLeafAmt + 0.05) return;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.fillStyle = rgb(col, Math.min(1, p.fallenLeafAmt + 0.3));
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.6, 1.4, 0, 0, Math.PI * 2);
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
    // a couple of plump snow mounds at the base for a deep-blanket read
    ctx.fillStyle = "#ffffff";
    [[-8, 18.4, 5], [7, 19, 4.5], [0, 19.6, 6]].forEach(([mx, my, mr]) => {
      ctx.beginPath();
      ctx.ellipse(mx, my, mr, mr * 0.5, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    });
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

// Short trunk between the pad and the lowest needle tier. Identity in every
// season (mostly hidden by the skirts, a sliver shows at the base).
function trunk(ctx: CanvasRenderingContext2D, p: P): void {
  // soft dark outline
  ctx.fillStyle = rgb(p.outlineTint, 0.9);
  ctx.beginPath();
  ctx.moveTo(-3.2, TRUNK_BOT);
  ctx.lineTo(-2.4, TRUNK_TOP);
  ctx.lineTo(2.4, TRUNK_TOP);
  ctx.lineTo(3.2, TRUNK_BOT);
  ctx.closePath();
  ctx.fill();
  // shaded (right) half
  ctx.fillStyle = rgb(p.trunkShade, 1);
  ctx.beginPath();
  ctx.moveTo(-2.4, TRUNK_BOT);
  ctx.lineTo(-1.8, TRUNK_TOP);
  ctx.lineTo(2.0, TRUNK_TOP);
  ctx.lineTo(2.6, TRUNK_BOT);
  ctx.closePath();
  ctx.fill();
  // lit (left) body
  ctx.fillStyle = rgb(p.trunk, 1);
  ctx.beginPath();
  ctx.moveTo(-2.4, TRUNK_BOT);
  ctx.lineTo(-1.8, TRUNK_TOP);
  ctx.lineTo(0.3, TRUNK_TOP);
  ctx.lineTo(-0.2, TRUNK_BOT);
  ctx.closePath();
  ctx.fill();
}

// Draw ONE needle tier: a drooping skirt of needles. Dark underside first, then
// a lit mid body, then a bright upper-left edge — layered dark-then-light. The
// lower rim is a row of downward needle points (the classic fir skirt).
function needleTier(
  ctx: CanvasRenderingContext2D,
  cy: number,
  half: number,
  depth: number,
  p: P,
  sway: number,
): void {
  const topY = cy - depth * 0.7; // where this tier meets the one above
  const botY = cy + depth; // tip of the drooping points
  const s = sway * (0.4 + half / 18); // outer/lower tiers sway a touch more

  // Build the skirt path: from the left edge, sag down to a centre point, up to
  // the right edge, then a slightly higher top edge back across.
  const tierPath = (insetW: number, insetD: number): void => {
    const h = Math.max(0, half - insetW);
    const d = Math.max(0, depth - insetD);
    ctx.beginPath();
    ctx.moveTo(-h + s, topY + insetD * 0.5);
    // lower edge: a few drooping needle scallops left→right
    const pts = 5;
    for (let i = 0; i <= pts; i++) {
      const f = i / pts;
      const x = lerp(-h, h, f) + s * (1 - Math.abs(f - 0.5) * 0.6);
      // scallop dips: bottom points droop down between branch ends
      const dip = botY + insetD * 0.4 - Math.sin(f * Math.PI) * d * 0.25;
      const pointY = dip;
      ctx.quadraticCurveTo(
        lerp(-h, h, (i - 0.5) / pts) + s,
        cy + d * 0.9,
        x,
        pointY,
      );
    }
    // up the right side to the top edge, then back across the top
    ctx.lineTo(h + s, topY + insetD * 0.5);
    ctx.quadraticCurveTo(s, topY - d * 0.5 + insetD * 0.5, -h + s, topY + insetD * 0.5);
    ctx.closePath();
  };

  // 1) dark underside / outline pass (full size)
  ctx.fillStyle = rgb(p.needleDark, 1);
  tierPath(0, 0);
  ctx.fill();

  // 2) mid body (inset a touch so the dark rim reads as an outline)
  ctx.fillStyle = rgb(p.needleMid, 1);
  tierPath(1.4, 1.2);
  ctx.fill();

  // 3) lit upper-left wedge — light from upper-left
  ctx.save();
  tierPath(1.4, 1.2);
  ctx.clip();
  const lg = ctx.createLinearGradient(-half + s, topY - depth, half + s, botY);
  lg.addColorStop(0, rgb(p.needleLight, 1));
  lg.addColorStop(0.45, rgb(p.needleMid, 1));
  lg.addColorStop(1, rgb(p.needleDark, 0));
  ctx.fillStyle = lg;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(-half * 0.3 + s, cy - depth * 0.2, half * 0.9, depth * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 4) needle-point flecks along the lower rim for texture (dark, then tips).
  ctx.strokeStyle = rgb(p.needleDark, 0.85);
  ctx.lineWidth = 1.0;
  ctx.lineCap = "round";
  const rim = 7;
  for (let i = 0; i <= rim; i++) {
    const f = i / rim;
    const x = lerp(-half + 1, half - 1, f) + s;
    const y0 = cy + depth * (0.35 + Math.sin(f * Math.PI) * 0.18);
    const droop = botY - Math.sin(f * Math.PI) * depth * 0.2;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x - s * 0.1, droop);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // 5) fresh new needle tips at the branch ends (spring) — bright lime dots.
  // BOLD: a touch larger so spring's new growth reads unmistakably at ~58px.
  if (p.tipFreshAmt > 0.02) {
    ctx.fillStyle = rgb(p.tipHighlight, 0.95 * p.tipFreshAmt);
    for (let i = 0; i <= rim; i++) {
      const f = i / rim;
      const x = lerp(-half + 1, half - 1, f) + s;
      const droop = botY - Math.sin(f * Math.PI) * depth * 0.2;
      ctx.beginPath();
      ctx.arc(x - s * 0.1, droop, 1.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// A small brown cone nestled against a tier (autumn).
function cone(ctx: CanvasRenderingContext2D, x: number, y: number, p: P, a: number): void {
  ctx.save();
  ctx.globalAlpha = clamp01(a);
  ctx.fillStyle = rgb([110, 72, 36], 1);
  ctx.beginPath();
  ctx.moveTo(x, y - 3);
  ctx.quadraticCurveTo(x + 2.2, y - 1, x + 1.6, y + 2.4);
  ctx.quadraticCurveTo(x, y + 3.4, x - 1.6, y + 2.4);
  ctx.quadraticCurveTo(x - 2.2, y - 1, x, y - 3);
  ctx.closePath();
  ctx.fill();
  // scale highlights
  ctx.fillStyle = rgb([158, 112, 64], 0.9);
  for (let r = 0; r < 3; r++) {
    ctx.beginPath();
    ctx.ellipse(x, y - 1.6 + r * 1.6, 1.3 - r * 0.1, 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Thick snow load resting on a tier's UPWARD surface (winter). Green still
// shows beneath; the snow caps the top edge of each skirt and the apex. `melt`
// 0..1 shaves the load down (used by the winter snow-clump-plop special on the
// targeted tier so the clump visibly departs).
function tierSnow(
  ctx: CanvasRenderingContext2D,
  cy: number,
  half: number,
  depth: number,
  p: P,
  sway: number,
  melt = 0,
): void {
  if (p.snowLoadAmt < 0.02) return;
  const a = p.snowLoadAmt * (1 - clamp01(melt));
  if (a < 0.02) return;
  const s = sway * (0.4 + half / 18);
  const topY = cy - depth * 0.7;
  const h = half - 1.2;
  // thick snow blanket riding the top edge of the skirt, with lumpy lower fringe
  ctx.save();
  ctx.fillStyle = `rgba(246,251,255,${clamp01(0.95 * a)})`;
  ctx.beginPath();
  ctx.moveTo(-h + s, topY + 0.5);
  ctx.quadraticCurveTo(s, topY - depth * 0.55, h + s, topY + 0.5);
  // lumpy underside of the snow load (a few hanging clumps)
  const lumps = 4;
  for (let i = 0; i <= lumps; i++) {
    const f = 1 - i / lumps;
    const x = lerp(-h, h, f) + s;
    const lumpY = topY + 2.8 + Math.sin(f * Math.PI) * depth * 0.55 * a;
    ctx.quadraticCurveTo(x + 1.4, lumpY + 1.2, x, lumpY);
  }
  ctx.closePath();
  ctx.fill();
  // cool shaded underside of the snow
  ctx.fillStyle = `rgba(205,222,242,${clamp01(0.5 * a)})`;
  ctx.beginPath();
  ctx.ellipse(s, topY + 1.4, h * 0.7, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // bright lit crest along the very top (a real snow-cap read)
  ctx.fillStyle = `rgba(255,255,255,${clamp01(0.85 * a)})`;
  ctx.beginPath();
  ctx.moveTo(-h * 0.85 + s, topY + 0.2);
  ctx.quadraticCurveTo(s, topY - depth * 0.5, h * 0.85 + s, topY + 0.2);
  ctx.quadraticCurveTo(s, topY - depth * 0.18, -h * 0.85 + s, topY + 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// A hanging icicle off a bough (winter). Rides with the sway.
function icicle(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, a: number): void {
  if (a < 0.02) return;
  ctx.save();
  ctx.globalAlpha = clamp01(a);
  const g = ctx.createLinearGradient(x, y, x, y + len);
  g.addColorStop(0, "rgba(220,238,255,0.95)");
  g.addColorStop(1, "rgba(255,255,255,0.6)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 1.2, y);
  ctx.lineTo(x + 1.2, y);
  ctx.lineTo(x, y + len);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ── THE single parameterized paint ───────────────────────────────────────────
// Whole tile from ONLY p, bob (vertical idle offset; 0 = rest) and sway. The
// optional `meltTier` lets the winter snow-plop special shave the load off one
// tier (−1 = none). Never throws.
function paint(
  ctx: CanvasRenderingContext2D,
  p: P,
  bob: number,
  sway = 0,
  meltTier = -1,
  meltAmt = 0,
): void {
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";

    // Pad is rooted to the ground (does not bob).
    padEllipse(ctx, p);

    // The tree bobs as one unit (subtle vertical idle).
    ctx.save();
    ctx.translate(0, -bob);

    trunk(ctx, p);

    // Apex spike rising above the top tier (part of the silhouette).
    const apexS = sway * 0.9;
    ctx.fillStyle = rgb(p.needleDark, 1);
    ctx.beginPath();
    ctx.moveTo(-6.2, -8.5);
    ctx.quadraticCurveTo(-2 + apexS, APEX_Y + 4, apexS, APEX_Y);
    ctx.quadraticCurveTo(2 + apexS, APEX_Y + 4, 6.2, -8.5);
    ctx.quadraticCurveTo(0, -6.0, -6.2, -8.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgb(p.needleMid, 1);
    ctx.beginPath();
    ctx.moveTo(-4.6, -9.0);
    ctx.quadraticCurveTo(-1.4 + apexS, APEX_Y + 4.5, apexS, APEX_Y + 1);
    ctx.quadraticCurveTo(1.4 + apexS, APEX_Y + 4.5, 4.6, -9.0);
    ctx.quadraticCurveTo(0, -7.0, -4.6, -9.0);
    ctx.closePath();
    ctx.fill();
    // lit left edge of the apex
    ctx.fillStyle = rgb(p.needleLight, 0.75);
    ctx.beginPath();
    ctx.moveTo(-3.6, -9.2);
    ctx.quadraticCurveTo(-1.2 + apexS, APEX_Y + 6, apexS - 0.6, APEX_Y + 2);
    ctx.quadraticCurveTo(-1.0, -12, -3.6, -9.2);
    ctx.closePath();
    ctx.fill();

    // Spring fresh-tip highlight at the apex too.
    if (p.tipFreshAmt > 0.02) {
      ctx.fillStyle = rgb(p.tipHighlight, 0.95 * p.tipFreshAmt);
      ctx.beginPath();
      ctx.arc(apexS, APEX_Y + 0.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Needle tiers, drawn BOTTOM (back/widest) → TOP so upper skirts overlap.
    TIERS.forEach(([cy, half, depth]) => {
      needleTier(ctx, cy, half, depth, p, sway);
    });

    // Autumn cones nestled in the upper-middle tiers.
    if (p.coneAmt > 0.02) {
      cone(ctx, 6.5, 2.0, p, p.coneAmt);
      cone(ctx, -5.5, -3.5, p, p.coneAmt * 0.9);
    }

    // Snow load on each tier's upper surface + the apex (winter). Drawn over
    // the green so green shows beneath but the boughs read as snow-laden.
    if (p.snowLoadAmt > 0.02) {
      TIERS.forEach(([cy, half, depth], idx) => {
        const melt = idx === meltTier ? meltAmt : 0;
        tierSnow(ctx, cy, half, depth, p, sway, melt);
      });
      // snow cap on the apex
      const a = p.snowLoadAmt;
      ctx.fillStyle = `rgba(246,251,255,${clamp01(0.95 * a)})`;
      ctx.beginPath();
      ctx.moveTo(-3.4, APEX_Y + 6);
      ctx.quadraticCurveTo(apexS, APEX_Y - 1.5, 3.4, APEX_Y + 6);
      ctx.quadraticCurveTo(apexS, APEX_Y + 4, -3.4, APEX_Y + 6);
      ctx.closePath();
      ctx.fill();
      // a hanging icicle off a low-left bough (rides with the sway)
      icicle(ctx, -9 + sway * 0.6, 7.5, 5.0, a);
      icicle(ctx, 8 + sway * 0.5, 1.0, 3.6, a * 0.9);
    }

    ctx.restore(); // end tree bob group

    // Ambient light wash (cool/warm per season), upper-left bias. Low-alpha
    // overlay; never a white-out / bloom on the subject.
    if (p.lightStrength > 0.01) {
      const lg = ctx.createRadialGradient(-8, -16, 4, -2, -6, 36);
      lg.addColorStop(0, rgb(p.lightTint, p.lightStrength));
      lg.addColorStop(1, rgb(p.lightTint, 0));
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.ellipse(-2, -6, 26, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } catch {
    // Never throw from a draw callback.
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── Rare specials ────────────────────────────────────────────────────────────

// A small bird (front-¾) used by the Spring/Summer/Autumn rare special. Drawn
// at the given anchor; `hop` is vertical hop (≤0 = up), `look` rotates the head,
// `wing` opens the wing for the flit-off. Per-species palette: a CROSSBILL / red
// finch — dull brick-red body with darker brown wings + tail. The warm red
// stands out against the fir's dark evergreen green.
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
  try {
    ctx.globalAlpha = clamp01(alpha);
    ctx.translate(x, y + hop);
    // body — dull brick red
    ctx.fillStyle = "#b14430";
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.0, 3.0, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // brighter red breast
    ctx.fillStyle = "#cf5a3c";
    ctx.beginPath();
    ctx.ellipse(-1.4, 0.6, 2.2, 2.0, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // tail — dark brown
    ctx.fillStyle = "#3a2a1e";
    ctx.beginPath();
    ctx.moveTo(3.2, -0.4);
    ctx.lineTo(6.8, -1.7);
    ctx.lineTo(6.2, 1.1);
    ctx.closePath();
    ctx.fill();
    // wing (opens during flit-off) — dark brown crossbill wing
    ctx.save();
    ctx.translate(0.6, -0.4);
    ctx.rotate(-0.5 * wing);
    ctx.fillStyle = "#34251a";
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.0 + wing * 2.0, 1.7 + wing * 1.2, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // head (looks around) — red, matching the body
    ctx.save();
    ctx.translate(-3.2, -2.3);
    ctx.rotate(look);
    ctx.fillStyle = "#b14430";
    ctx.beginPath();
    ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // beak — pale crossed finch bill
    ctx.fillStyle = "#d8c39a";
    ctx.beginPath();
    ctx.moveTo(-2.0, 0.2);
    ctx.lineTo(-4.2, -0.2);
    ctx.lineTo(-2.0, 0.9);
    ctx.closePath();
    ctx.fill();
    // eye
    ctx.fillStyle = "#0e0a06";
    ctx.beginPath();
    ctx.arc(-0.5, -0.4, 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } catch {
    /* never throw */
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// The bird special: lands on an upper-left bough, looks around, then flits off
// up-and-left, fully gone by the window edge (seamless). `q` is the window phase
// in [0,1] (−1 = not active). Drawn relative to the bobbing tree.
function birdSpecial(ctx: CanvasRenderingContext2D, q: number, bob: number): void {
  if (q < 0) return;
  const anchorX = -8;
  const anchorY = -4 - bob; // perch on the mid-left bough, riding the tree bob
  let hop = 0;
  let look = 0;
  let wing = 0;
  let alpha: number;
  let dx = 0;
  let dy = 0;
  if (q < 0.25) {
    // land: drop in from above + alpha up + a little hop
    const f = q / 0.25;
    alpha = smoother(f);
    dy = -11 * (1 - smoother(f));
    hop = -2 * Math.sin(f * Math.PI);
  } else if (q < 0.7) {
    // perch: look around with a tiny hop
    const f = (q - 0.25) / 0.45;
    alpha = 1;
    look = Math.sin(f * Math.PI * 2) * 0.5;
    hop = -2.0 * Math.abs(Math.sin(f * Math.PI * 2));
  } else {
    // flit off: rise + fade + flap, gone by q=1
    const f = (q - 0.7) / 0.3;
    alpha = 1 - smoother(f);
    wing = Math.abs(Math.sin(f * Math.PI * 3));
    dx = -11 * smoother(f);
    dy = -14 * smoother(f);
    look = -0.3;
  }
  bird(ctx, anchorX + dx, anchorY + dy, hop, look, wing, alpha);
}

// The winter snow-clump-plop special: a clump of snow lets go of one tier and
// tumbles down to the pad, fading as it lands. Returns the tier index + melt
// amount so paint() can shave that tier's load while the clump is in flight.
// `q` is the window phase in [0,1] (−1 = not active). Drawn over the tree.
const PLOP_TIER = 1; // the second-from-bottom tier sheds its load
const PLOP_X = 9.5; // right side of that tier
const PLOP_TOP_Y = 6.0 - 5.4 * 0.7; // tier-1 topY (cy - depth*0.7)

function snowPlopMelt(q: number): number {
  if (q < 0) return 0;
  // The load shrinks on that tier as the clump departs, then snow "settles"
  // back so the still is restored by q=1 (seamless). Bell peaks mid-window.
  return bell(q) * 0.9;
}

function snowPlopSpecial(ctx: CanvasRenderingContext2D, q: number, sway: number, bob: number): void {
  if (q < 0) return;
  const s = sway * (0.4 + 12.6 / 18); // tier-1 sway factor
  const startX = PLOP_X + s;
  const startY = PLOP_TOP_Y - bob + 2;
  // Clump falls under gravity-ish easing, tumbling, then splats on the pad.
  const fall = smoother(clamp01(q / 0.85)); // reaches pad by q≈0.85
  const cx = startX + Math.sin(q * Math.PI * 2) * 1.5;
  const cy = startY + fall * (18.6 - startY); // lands near pad y≈18.6
  // size: a plump clump that flattens (splats) as it lands, then fades.
  const land = clamp01((q - 0.78) / 0.22); // 0..1 over the splat tail
  const wsq = lerp(2.6, 4.2, land); // widen on impact
  const hsq = lerp(2.4, 0.9, land); // flatten on impact
  const alpha = q < 0.85 ? 0.95 : 0.95 * (1 - clamp01((q - 0.85) / 0.15));
  ctx.save();
  try {
    ctx.globalAlpha = clamp01(alpha);
    ctx.fillStyle = "rgba(248,252,255,1)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, wsq, hsq, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(205,222,242,0.6)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + hsq * 0.4, wsq * 0.8, hsq * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // a couple of trailing snow specks during the fall
    if (q < 0.78) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (let k = 0; k < 2; k++) {
        const tf = clamp01(fall - 0.12 * (k + 1));
        const ty = startY + tf * (18.6 - startY);
        ctx.beginPath();
        ctx.arc(cx + (k === 0 ? 1.6 : -1.4), ty, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } catch {
    /* never throw */
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── Parameter interpolation for transitions ──────────────────────────────────
function lerpP(a: P, b: P, f: number): P {
  return {
    needleDark: lerp3(a.needleDark, b.needleDark, f),
    needleMid: lerp3(a.needleMid, b.needleMid, f),
    needleLight: lerp3(a.needleLight, b.needleLight, f),
    tipHighlight: lerp3(a.tipHighlight, b.tipHighlight, f),
    trunk: lerp3(a.trunk, b.trunk, f),
    trunkShade: lerp3(a.trunkShade, b.trunkShade, f),
    padGrass: lerp3(a.padGrass, b.padGrass, f),
    soil: lerp3(a.soil, b.soil, f),
    outlineTint: lerp3(a.outlineTint, b.outlineTint, f),
    lightTint: lerp3(a.lightTint, b.lightTint, f),
    leafDensity: lerp(a.leafDensity, b.leafDensity, f),
    tipFreshAmt: lerp(a.tipFreshAmt, b.tipFreshAmt, f),
    coneAmt: lerp(a.coneAmt, b.coneAmt, f),
    frostAmt: lerp(a.frostAmt, b.frostAmt, f),
    snowLoadAmt: lerp(a.snowLoadAmt, b.snowLoadAmt, f),
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
  return (ctx: CanvasRenderingContext2D): void => paint(ctx, SP[season], 0, 0);
}

// The shared two-tier idle for the green seasons (Spring/Summer/Autumn): COMMON
// sway every ~6 s, RARE bird-hop every ~18 s. `dressing` paints any extra
// per-season ambient sparkle on top of the rested/swaying tree.
function greenIdle(
  ctx: CanvasRenderingContext2D,
  season: Season,
  t: number,
  dressing?: (ctx: CanvasRenderingContext2D, bob: number, sway: number) => void,
): void {
  const sway = swayAt(t);
  const bob = bobAt(t);
  paint(ctx, SP[season], bob, sway);
  if (dressing) dressing(ctx, bob, sway);
  birdSpecial(ctx, actionQ(t, SPECIAL_PERIOD, SPECIAL_WIN, SPECIAL_PHASE), bob);
}

// Spring: idle + a soft dew shimmer riding the bright new needle tips.
function animSpring(ctx: CanvasRenderingContext2D, t: number): void {
  greenIdle(ctx, "Spring", t, (c, bob, sway) => {
    c.save();
    try {
      const g = 0.2 + 0.28 * (0.5 + 0.5 * Math.sin(t * 2.2));
      c.fillStyle = `rgba(255,255,255,${clamp01(g)})`;
      const spots: Array<[number, number]> = [[-7, 3], [6, -2], [-3, 9]];
      spots.forEach(([sx, sy], i) => {
        const gy = sy - bob + Math.sin(t * 1.1 + i) * 0.8;
        c.beginPath();
        c.arc(sx + sway * 0.5, gy, 0.9 + g * 0.6, 0, Math.PI * 2);
        c.fill();
      });
    } catch {
      /* never throw */
    } finally {
      c.globalAlpha = 1;
      c.restore();
    }
  });
}

// Summer: idle + a faint sheen pulse travelling down the cone.
function animSummer(ctx: CanvasRenderingContext2D, t: number): void {
  greenIdle(ctx, "Summer", t, (c, bob, sway) => {
    c.save();
    try {
      const prog = (t * 0.35) % 1;
      const sy = -16 + prog * 28;
      const s = 0.1 + 0.14 * Math.sin(prog * Math.PI);
      c.fillStyle = `rgba(206,236,170,${clamp01(s)})`;
      c.beginPath();
      c.ellipse(-3 + sway * 0.5, sy - bob, 7, 3.2, -0.15, 0, Math.PI * 2);
      c.fill();
    } catch {
      /* never throw */
    } finally {
      c.globalAlpha = 1;
      c.restore();
    }
  });
}

// Autumn: idle (no extra dressing — the cones + fallen leaves carry the season).
function animAutumn(ctx: CanvasRenderingContext2D, t: number): void {
  greenIdle(ctx, "Autumn", t);
}

// Winter: COMMON sway every ~6 s; RARE snow-clump-plop every ~18 s; plus the
// continuous ambient snow drift + cold sheen. The plop shaves PLOP_TIER's load
// while the clump is airborne, then the load settles back (seamless).
function animWinter(ctx: CanvasRenderingContext2D, t: number): void {
  const sway = swayAt(t) * 0.85; // snow-laden boughs are a touch stiffer
  const bob = bobAt(t) * 0.85;
  const plopQ = actionQ(t, SPECIAL_PERIOD, SPECIAL_WIN, SPECIAL_PHASE);
  const melt = snowPlopMelt(plopQ);
  paint(ctx, SP.Winter, bob, sway, plopQ >= 0 ? PLOP_TIER : -1, melt);

  // The falling clump, drawn over the tree.
  snowPlopSpecial(ctx, plopQ, sway, bob);

  // Continuous ambient snow drift + cold sheen.
  ctx.save();
  try {
    const span = 36;
    const seeds: Array<[number, number, number]> = [
      [-9, 1.2, 0.0],
      [7, 1.0, 0.5],
      [13, 0.9, 0.7],
      [-2, 1.1, 0.25],
    ];
    seeds.forEach(([fx, r, phase]) => {
      const prog = ((t / 3.6 + phase) % 1 + 1) % 1;
      const fy = -24 + prog * span;
      const driftX = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
      ctx.fillStyle = `rgba(255,255,255,${clamp01(0.4 + 0.45 * Math.sin(prog * Math.PI))})`;
      ctx.beginPath();
      ctx.arc(driftX, fy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    const sheen = 0.1 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.7));
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
// the fir stays full (leafDensity=1 all year), only colour/snow/cones/pad shift.
function makeTransition(from: Season, to: Season) {
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const f = smoother(clamp01(pp));
    paint(ctx, lerpP(SP[from], SP[to], f), 0, 0);
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
