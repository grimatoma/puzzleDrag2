// Production seasonal art for the HEN bird board tile (`tile_bird_hen`) — the
// approved BOLD direction, built on the same architecture as the reference
// sheep tile. A single parameterized `paint(ctx, p, pose)` + four `P` presets +
// lerped transitions, pushed so the seasons read at a glance and the idle is a
// real, fun ACTION rather than a subtle breath.
//
// IDENTITY (PALETTE LOCK): it is ALWAYS the same plump brown-and-white MOTHER
// HEN settled low on a small straw NEST, with one visible cream EGG at the front
// rim, a small red comb + wattle and an orange beak. The body colours and the
// hen-on-nest silhouette are CONSTANT across all four seasons. Seasons change
// ONLY: plumage VOLUME (sleek spring → broody fluffed winter), the pad colour,
// the light wash, and BOLD dressing — snow on the back, a little winter SCARF, a
// breath-fog puff, blossoms, a fallen leaf, frost. Never morph it into another
// animal; the egg stays visible all seasons.
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~0.95s): a broody PECK + head-bob — the head dips down
//     ~12px to peck at the nest then bobs back up, with a small body settle/
//     squash and a tail flick.
//   • RARE  ~18s (win ~1.2s, phase +3s): a flustered HOP + WING-FLAP — an
//     anticipation crouch, then the whole hen hops ~15px up with the wing thrown
//     open, a squash landing, then settles. The hop may lift OUTSIDE the
//     −24..+24 design box at the apex.
// Both gestures return to REST with zero value AND zero velocity at the window
// edges (raised-cosine windows), so `anim(…, t)` is seamless and `anim(…, 0)`
// (and `draw`) sit exactly at rest.
//
// Origin-centered in the −24..+24 design box. Deterministic in `t` (seconds).
// Never throws; clamps every scalar; save/restore + globalAlpha reset.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Small math helpers ──────────────────────────────────────────────────────

type RGB = [number, number, number];

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

// guard a non-finite scalar (NaN/Infinity) down to a safe fallback
function safeNum(x: number, fallback = 0): number {
  return Number.isFinite(x) ? x : fallback;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function rgba(c: RGB, a = 1): string {
  const r = Math.round(clamp01(c[0] / 255) * 255);
  const g = Math.round(clamp01(c[1] / 255) * 255);
  const b = Math.round(clamp01(c[2] / 255) * 255);
  return `rgba(${r},${g},${b},${clamp01(a)})`;
}

// quintic smoothstep — zero first & second derivative at both ends
function smoother(x: number): number {
  return x * x * x * (x * (6 * x - 15) + 10);
}

// Two-tier occasional-action clock. Returns a phase in [0,1) WITHIN the action
// window (the fraction of the way through the gesture), or −1 when at rest. The
// window opens once per `period` at `phase` seconds in, and is `win` long.
function actionQ(t: number, period: number, win: number, phase: number): number {
  const c = (((t + phase) % period) + period) % period;
  return c < win ? c / win : -1;
}

// A raised-cosine "bump" 0→1→0 over q∈[0,1], with zero slope at both ends, so a
// gesture grows in and settles out seamlessly (no velocity at the window edges).
function bump(q: number): number {
  if (q < 0 || q > 1) return 0;
  return 0.5 - 0.5 * Math.cos(q * Math.PI * 2);
}

// Anticipation→action shape for the HOP: a brief crouch (negative) before the
// rise, then a clean arc up and settle. q∈[0,1]. Returns a LIFT factor in
// roughly −0.2..+1 (negative = squash-down crouch, positive = airborne).
function hopShape(q: number): number {
  if (q <= 0 || q >= 1) return 0;
  const antiEnd = 0.24; // first slice = crouch/anticipation
  if (q < antiEnd) {
    // dip down a little (anticipation), zero slope at q=0
    const a = q / antiEnd;
    return -0.2 * (0.5 - 0.5 * Math.cos(a * Math.PI));
  }
  // airborne arc, zero at the seam to the crouch and at q=1
  const a = (q - antiEnd) / (1 - antiEnd);
  return Math.sin(a * Math.PI);
}

// ── The idle POSE (carries all action state into paint) ──────────────────────

interface Pose {
  lift: number; // whole-body vertical lift (design px, + = up). Hop uses this.
  lean: number; // small forward lean (design px, + = toward lower-left peck)
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  head: number; // extra head dip (design px, + = down) for the peck
  peck: number; // 0..1 beak-open / peck intensity
  hop: number; // 0..1 hop progress (for fog exhale + flutter dressing)
  wing: number; // 0..1 wing throw-open amount (flap)
  tail: number; // signed tail flick (design px sideways/up)
}

const REST: Pose = { lift: 0, lean: 0, squashX: 1, squashY: 1, head: 0, peck: 0, hop: 0, wing: 0, tail: 0 };

// Build a pose from the wall clock: a common PECK every ~6s and a rare HOP every
// ~18s. Returns to REST (all zeros / unit scales) at every window edge.
function poseFromClock(tIn: number): Pose {
  const t = safeNum(tIn, 0);
  const pose: Pose = { lift: 0, lean: 0, squashX: 1, squashY: 1, head: 0, peck: 0, hop: 0, wing: 0, tail: 0 };

  // COMMON ~6s: broody PECK + head-bob (win ~0.95s). Head dips ~12px to peck at
  // the nest then bobs back up, with a small body settle squash and a tail flick.
  // Built from raised-cosine windows → seamless. Phase 3.0 opens the window at
  // t≈3.0 (well clear of t=0, so anim(0) sits exactly at REST).
  const cq = actionQ(t, 6, 0.95, 3.0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window
    // two peck dips within the window (head dips DOWN ~12px at the peaks)
    const dip = Math.abs(Math.sin(cq * Math.PI * 2));
    pose.head = env * (4.0 + 8.0 * dip); // ~12px at the peak
    pose.peck = env * (0.45 + 0.55 * dip);
    pose.lean = env * 1.6; // tips a touch toward the peck
    // small body settle: squash down/wide slightly as it bows into the nest
    pose.squashY = 1 - env * 0.05;
    pose.squashX = 1 + env * 0.045;
    pose.tail = Math.sin(cq * Math.PI * 6) * env * 2.6; // a few flicks sideways
  }

  // RARE ~18s: flustered HOP + WING-FLAP (win ~1.2s). Anticipation crouch → the
  // whole hen hops ~15px up with the wing thrown open → squash landing → settle.
  // May lift OUTSIDE the design box at the apex. Phase 6.0 keeps it clear of the
  // common peck window and of t=0.
  const hq = actionQ(t, 18, 1.2, 6.0);
  if (hq >= 0) {
    const s = hopShape(hq); // −0.2..+1 (crouch then arc)
    pose.lift = Math.max(0, s) * 15; // up to ~15px airborne
    pose.hop = bump(hq); // for the fog exhale + flutter dressing
    if (s < 0) {
      // anticipation crouch: squash down/wide
      const c = -s; // 0..0.2
      pose.squashY = 1 - c * 0.85;
      pose.squashX = 1 + c * 0.65;
      pose.wing = 0.18 * c * 5; // wing just begins to lift on the crouch
    } else {
      // airborne: stretch tall/narrow at the apex, wing thrown wide open
      pose.squashY = 1 + s * 0.16;
      pose.squashX = 1 - s * 0.1;
      pose.wing = Math.min(1, s * 1.15);
    }
    // a flustered tail flag during the hop
    pose.tail += Math.sin(hq * Math.PI) * 2.2;
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────

interface P {
  bodyLight: RGB; // bright lit fluffed plumage (the white-ish body)
  bodyShadow: RGB; // shaded underside of the plumage
  wing: RGB; // brown wing patch (the "brown" half of the lock)
  wingDark: RGB; // shaded brown wing
  comb: RGB; // red comb + wattle (locked-ish, warms a touch by light)
  beak: RGB; // orange beak
  egg: RGB; // the visible cream egg (locked)
  straw: RGB; // top of the straw nest
  strawDark: RGB; // shaded nest underside
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  plumageVolume: number; // 0..1 BOLD puff of the plumage (sleek spring → broody winter)
  sheen: number; // 0..1 soft glossy sheen on the feathers (summer peak)
  frostAmt: number; // 0..1 frost sparkle on the plumage
  backSnowAmt: number; // 0..1 snow settled on its back + snow-rim on the nest
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 blossoms on the pad
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad
  breathFogAmt: number; // 0..1 breath puff at the beak
  scarfAmt: number; // 0..1 a little winter SCARF (tweened alpha)
  scarfColor: RGB; // scarf colour (locked plum, fades in via alpha)
}

// Four BOLD season presets. The hen stays the SAME brown-and-white mother hen on
// her straw nest; only plumage volume + pad + light + dressing differ — pushed
// HARD so each season reads at a glance.
const SP: Record<SeasonName, P> = {
  // Spring — sleeker lighter plumage, fresh nest, dewy lime pad + blossom; cool-bright.
  Spring: {
    bodyLight: [250, 248, 242],
    bodyShadow: [200, 192, 178],
    wing: [180, 124, 72],
    wingDark: [128, 84, 48],
    comb: [214, 60, 56],
    beak: [240, 168, 56],
    egg: [248, 240, 222],
    straw: [220, 192, 118],
    strawDark: [160, 130, 70],
    padGrass: [124, 214, 80], // vivid fresh lime
    soil: [78, 140, 50],
    outline: [70, 54, 38],
    lightWash: [200, 240, 255], // cool-bright
    lightWashAmt: 0.2,
    plumageVolume: 0.22, // BOLD: clearly sleeker, light spring coat
    sheen: 0.12,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.9,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [150, 60, 120],
  },
  // Summer — full glossy plumage PEAK, golden straw; saturated green pad; warm light.
  Summer: {
    bodyLight: [255, 253, 248],
    bodyShadow: [206, 192, 170],
    wing: [196, 132, 70],
    wingDark: [138, 86, 44],
    comb: [226, 48, 44],
    beak: [248, 172, 48],
    egg: [250, 242, 220],
    straw: [238, 204, 110],
    strawDark: [176, 138, 64],
    padGrass: [74, 186, 60], // saturated mid-green
    soil: [48, 116, 40],
    outline: [74, 52, 32],
    lightWash: [255, 238, 178], // warm
    lightWashAmt: 0.22,
    plumageVolume: 0.55, // full normal plumage
    sheen: 0.9, // BOLD glossy peak
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [150, 60, 120],
  },
  // Autumn — warm-tinted fuller plumage, drier amber straw; olive-tan pad + leaf.
  Autumn: {
    bodyLight: [248, 238, 222],
    bodyShadow: [196, 176, 150],
    wing: [184, 114, 56],
    wingDark: [126, 76, 36],
    comb: [206, 56, 46],
    beak: [236, 158, 50],
    egg: [246, 234, 210],
    straw: [208, 170, 92],
    strawDark: [150, 116, 56],
    padGrass: [174, 144, 70], // olive-tan browning
    soil: [112, 84, 42],
    outline: [66, 48, 30],
    lightWash: [255, 184, 96], // low amber, BOLD
    lightWashAmt: 0.3,
    plumageVolume: 0.74, // thicker
    sheen: 0.22, // dulled gloss
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.95,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [150, 60, 120],
  },
  // Winter — FLUFFED broody puffy plumage, snow on the back + snow-rimmed nest,
  // a little winter SCARF + breath-fog puff; snowy pad, cool blue-grey light. The
  // hen + straw stay clearly visible in their own colours underneath.
  Winter: {
    bodyLight: [250, 251, 255],
    bodyShadow: [200, 208, 222],
    wing: [170, 118, 74], // wing brown stays — identity lock
    wingDark: [122, 82, 52],
    comb: [200, 74, 70],
    beak: [228, 158, 66],
    egg: [242, 240, 236],
    straw: [200, 176, 120],
    strawDark: [144, 122, 80],
    padGrass: [226, 238, 250], // snow on the pad
    soil: [146, 166, 192],
    outline: [62, 54, 60],
    lightWash: [188, 212, 252], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    plumageVolume: 1, // BOLD: thick broody fluffed plumage
    sheen: 0.16,
    frostAmt: 0.85,
    backSnowAmt: 0.92,
    padSnowAmt: 0.95,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.85,
    scarfAmt: 1, // a little scarf appears in winter
    scarfColor: [150, 60, 120],
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    bodyLight: lerpRGB(a.bodyLight, b.bodyLight, t),
    bodyShadow: lerpRGB(a.bodyShadow, b.bodyShadow, t),
    wing: lerpRGB(a.wing, b.wing, t),
    wingDark: lerpRGB(a.wingDark, b.wingDark, t),
    comb: lerpRGB(a.comb, b.comb, t),
    beak: lerpRGB(a.beak, b.beak, t),
    egg: lerpRGB(a.egg, b.egg, t),
    straw: lerpRGB(a.straw, b.straw, t),
    strawDark: lerpRGB(a.strawDark, b.strawDark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    plumageVolume: lerp(a.plumageVolume, b.plumageVolume, t),
    sheen: lerp(a.sheen, b.sheen, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    backSnowAmt: lerp(a.backSnowAmt, b.backSnowAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
    breathFogAmt: lerp(a.breathFogAmt, b.breathFogAmt, t),
    scarfAmt: lerp(a.scarfAmt, b.scarfAmt, t),
    scarfColor: lerpRGB(a.scarfColor, b.scarfColor, t),
  };
}

// clamp every scalar field defensively (never throw on a wild `p`)
function clampP(p: P): P {
  return {
    ...p,
    lightWashAmt: clamp01(p.lightWashAmt),
    plumageVolume: clamp01(p.plumageVolume),
    sheen: clamp01(p.sheen),
    frostAmt: clamp01(p.frostAmt),
    backSnowAmt: clamp01(p.backSnowAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    breathFogAmt: clamp01(p.breathFogAmt),
    scarfAmt: clamp01(p.scarfAmt),
  };
}

// ── Subject geometry constants (the SAME hen-on-nest every season) ────────────

const NEST_CY = 13; // nest centre y (sits on the pad)
const NEST_RX = 15; // nest half-width
const NEST_RY = 5.4; // nest half-height (a shallow bowl)
const BODY_CX = -1; // hen body centre x (turned slightly toward lower-left)

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat grass pad the hen's nest sits on
function paintPad(ctx: CanvasRenderingContext2D, p: P): void {
  // soft contact shadow, offset to lower-right (light is upper-left)
  ctx.fillStyle = rgba([0, 0, 0], 0.18);
  ctx.beginPath();
  ctx.ellipse(3, 21, 17, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // shaded underside of the pad
  ctx.fillStyle = rgba(p.soil);
  ctx.beginPath();
  ctx.ellipse(0, 20.5, 18, 5.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // grass top
  ctx.fillStyle = rgba(p.padGrass);
  ctx.beginPath();
  ctx.ellipse(0, 19, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // tufted top edge
  ctx.strokeStyle = rgba(p.padGrass);
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  for (let i = -16; i <= 16; i += 4) {
    const h = 1.6 + (i % 8 === 0 ? 1.4 : 0);
    const yEdge = 19 - Math.sqrt(Math.max(0, 1 - (i / 18) ** 2)) * 5;
    ctx.beginPath();
    ctx.moveTo(i, yEdge);
    ctx.lineTo(i + 1, yEdge - h);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // small highlight band on the pad (light from upper-left)
  ctx.fillStyle = rgba([255, 255, 255], 0.1);
  ctx.beginPath();
  ctx.ellipse(-5, 17.5, 9, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // snow blanket over the pad (winter) — BOLD coverage
  if (p.padSnowAmt > 0.001) {
    ctx.fillStyle = rgba([246, 251, 255], 0.92 * p.padSnowAmt);
    ctx.beginPath();
    ctx.ellipse(0, 18.4, 17.4, 4.9, 0, 0, Math.PI * 2);
    ctx.fill();
    // a few frost glints on the snow
    ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.padSnowAmt);
    for (const [sx, sy] of [[-10, 19], [6, 20], [12, 18], [-2, 21]] as const) {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // BOLD blossoms (spring)
  if (p.blossomAmt > 0.001) {
    for (const [bx, by] of [[-13, 18.5], [10, 20], [0, 21], [14, 19], [-5, 20.4]] as const) {
      ctx.fillStyle = rgba([255, 244, 250], 0.95 * p.blossomAmt);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(bx + Math.cos(a) * 1.3, by + Math.sin(a) * 1.3, 1.0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = rgba([252, 208, 96], p.blossomAmt);
      ctx.beginPath();
      ctx.arc(bx, by, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // a BOLD fallen leaf (autumn)
  if (p.fallenLeafAmt > 0.001) {
    const leaves: Array<[number, number, number, RGB]> = [
      [11, 20.4, 0.7, [214, 132, 40]],
      [-12, 20, -0.5, [192, 88, 34]],
      [1, 21, 0.2, [170, 76, 38]],
    ];
    for (const [lx, ly, rot, col] of leaves) {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.fillStyle = rgba(col, p.fallenLeafAmt);
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.0, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba([110, 58, 24], p.fallenLeafAmt);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-2.8, 0);
      ctx.lineTo(2.8, 0);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// the straw NEST bowl (under / behind the hen), with the visible egg at the rim
function paintNest(ctx: CanvasRenderingContext2D, p: P): void {
  // shaded underside of the bowl
  ctx.fillStyle = rgba(p.strawDark);
  ctx.beginPath();
  ctx.ellipse(0, NEST_CY + 1.4, NEST_RX, NEST_RY + 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // straw top rim
  ctx.fillStyle = rgba(p.straw);
  ctx.beginPath();
  ctx.ellipse(0, NEST_CY, NEST_RX, NEST_RY, 0, 0, Math.PI * 2);
  ctx.fill();
  // straw strands — short angled strokes around the front rim for texture
  ctx.lineWidth = 1.1;
  for (let i = -8; i <= 8; i++) {
    const ang = (i / 9) * Math.PI; // around the front semicircle
    const sx = Math.cos(ang) * NEST_RX * 0.96;
    const sy = NEST_CY + Math.sin(ang) * NEST_RY * 0.9;
    ctx.strokeStyle = rgba(i % 2 === 0 ? p.strawDark : p.straw);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(ang) * 2.6, sy + Math.sin(ang) * 1.6 - 1.2);
    ctx.stroke();
  }
  // a couple of light straw highlights
  ctx.strokeStyle = rgba([255, 244, 200], 0.5);
  ctx.lineWidth = 0.9;
  for (const [sx, sy] of [[-9, NEST_CY + 1], [6, NEST_CY + 0.6], [11, NEST_CY + 1.4]] as const) {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + 2.4, sy - 1.2);
    ctx.stroke();
  }

  // the visible EGG — nestled at the front rim, lower-left (stays all seasons)
  const eggX = -7.5;
  const eggY = NEST_CY + 1.2;
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(eggX, eggY, 4.4, 5.4, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.egg);
  ctx.beginPath();
  ctx.ellipse(eggX, eggY - 0.2, 3.6, 4.6, -0.15, 0, Math.PI * 2);
  ctx.fill();
  // egg shading + highlight
  ctx.fillStyle = rgba(p.strawDark, 0.3);
  ctx.beginPath();
  ctx.ellipse(eggX + 1.4, eggY + 0.8, 2.0, 3.0, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([255, 255, 255], 0.7);
  ctx.beginPath();
  ctx.ellipse(eggX - 1.3, eggY - 2.0, 1.0, 1.6, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

// Trace the plump hen body (settled egg-shape) at centre (cx,cy), volume-scaled.
// The SAME ovoid silhouette every season; volume only widens it a touch.
function henBodyPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, vol: number): void {
  const rx = (13.5 + vol * 2.0) ;
  const ry = (11.5 + vol * 1.0);
  ctx.beginPath();
  // back / tail rising to the right, breast bulging lower-left, settled in nest
  ctx.moveTo(cx - rx * 0.55, cy - ry * 0.9);
  ctx.quadraticCurveTo(cx + rx * 0.2, cy - ry * 1.18, cx + rx * 0.86, cy - ry * 0.78);
  ctx.quadraticCurveTo(cx + rx * 1.18, cy - ry * 0.2, cx + rx * 0.96, cy + ry * 0.5);
  ctx.quadraticCurveTo(cx + rx * 0.8, cy + ry * 1.0, cx + rx * 0.2, cy + ry * 1.02);
  ctx.quadraticCurveTo(cx - rx * 0.4, cy + ry * 1.06, cx - rx * 0.86, cy + ry * 0.6);
  ctx.quadraticCurveTo(cx - rx * 1.16, cy + ry * 0.1, cx - rx * 0.92, cy - ry * 0.5);
  ctx.quadraticCurveTo(cx - rx * 0.82, cy - ry * 0.95, cx - rx * 0.55, cy - ry * 0.9);
  ctx.closePath();
}

// the whole hen, settled front-¾ toward lower-left on her nest, posed by `pose`
function paintHen(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  const bx = BODY_CX;
  const bodyY = 2 - pose.lift; // body centre lifts during the hop
  const vol = p.plumageVolume;

  // The whole hen (tail + body + head + dressing) is drawn under a squash/stretch
  // transform centred on the body, so the hop reads with anticipation squash +
  // airborne stretch, and the peck reads with a small settle squash.
  ctx.save();
  ctx.translate(bx + pose.lean, bodyY);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-bx - pose.lean, -bodyY);

  const by = bodyY;

  // ── TAIL fan (behind the body, upper-right) — flicks via pose ────────────────
  {
    const tx = bx + 13 + vol * 0.6 + pose.tail * 0.4;
    const ty = by - 8.5 - Math.abs(pose.tail) * 0.3;
    ctx.fillStyle = rgba(p.outline);
    ctx.beginPath();
    ctx.moveTo(tx - 2, ty + 5);
    ctx.quadraticCurveTo(tx + 5, ty - 3, tx + 7.5, ty - 8.5);
    ctx.quadraticCurveTo(tx + 9, ty - 4, tx + 6, ty + 1);
    ctx.quadraticCurveTo(tx + 4.5, ty + 4.5, tx - 2, ty + 5);
    ctx.closePath();
    ctx.fill();
    // brown sweep into the tail
    ctx.fillStyle = rgba(p.wing, 0.7);
    ctx.beginPath();
    ctx.ellipse(tx + 3.5, ty - 3.5, 4.4, 5.4, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── HEN body (SAME silhouette every season) ─────────────────────────────────
  // 1) soft dark outline halo (a hair larger than the fill → a soft rim)
  henBodyPath(ctx, bx, by, vol + 0.18);
  ctx.fillStyle = rgba(p.outline);
  ctx.fill();

  // 2) body fills, clipped to the silhouette
  ctx.save();
  henBodyPath(ctx, bx, by, vol);
  ctx.clip();

  // base shaded plumage
  ctx.fillStyle = rgba(p.bodyShadow);
  ctx.fillRect(bx - 22, by - 18, 44, 36);
  // light from upper-left: lit breast/back panel
  const litGrad = ctx.createLinearGradient(bx - 14, by - 12, bx + 12, by + 12);
  litGrad.addColorStop(0, rgba(p.bodyLight));
  litGrad.addColorStop(0.55, rgba(p.bodyLight, 0.55));
  litGrad.addColorStop(1, rgba(p.bodyShadow, 0));
  ctx.fillStyle = rgba(p.bodyLight);
  ctx.beginPath();
  ctx.ellipse(bx - 3, by - 1, 13.5, 11.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = litGrad;
  ctx.beginPath();
  ctx.ellipse(bx - 3, by - 1, 14, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // brown WING patch on the side (the "brown" of the lock) — folded over flank.
  // It throws OPEN during the rare hop flap (pose.wing).
  {
    const w = pose.wing; // 0..1
    ctx.save();
    // pivot at the wing shoulder; opening rotates/extends it outward+up
    const pivX = bx + 6.5;
    const pivY = by - 4;
    ctx.translate(pivX, pivY);
    ctx.rotate(-w * 0.7);
    ctx.translate(-pivX, -pivY);
    const ext = w * 5; // wing tips reach further out when flapping
    ctx.fillStyle = rgba(p.wing);
    ctx.beginPath();
    ctx.moveTo(bx + 8.5, by - 5);
    ctx.quadraticCurveTo(bx + 13 + ext, by - 1 - w * 4, bx + 11 + ext, by + 6 - w * 2);
    ctx.quadraticCurveTo(bx + 4, by + 9, bx - 2, by + 6);
    ctx.quadraticCurveTo(bx + 2, by - 1, bx + 8.5, by - 5);
    ctx.closePath();
    ctx.fill();
    // wing shading + a couple of feather lines
    ctx.fillStyle = rgba(p.wingDark, 0.6);
    ctx.beginPath();
    ctx.ellipse(bx + 7, by + 4, 5, 3.4, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(p.wingDark, 0.8);
    ctx.lineWidth = 1;
    for (const k of [0, 1, 2]) {
      ctx.beginPath();
      ctx.moveTo(bx + 9 - k * 2.4 + ext * 0.4, by - 3 + k * 1.2);
      ctx.quadraticCurveTo(bx + 4 - k * 2, by + 3 + k, bx - 1 - k * 1.4, by + 5);
      ctx.stroke();
    }
    ctx.restore();
  }

  // breast fluff shading (lower-left, settled into nest)
  ctx.fillStyle = rgba(p.bodyShadow, 0.5);
  ctx.beginPath();
  ctx.ellipse(bx - 9, by + 7, 7, 5, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // fluff texture — short scalloped down-strokes (denser with broody volume)
  ctx.strokeStyle = rgba(p.bodyShadow, 0.55);
  ctx.lineWidth = 0.9;
  const fluffN = 5 + Math.round(vol * 5);
  for (let i = 0; i < fluffN; i++) {
    const fx = bx - 11 + (i / Math.max(1, fluffN - 1)) * 18;
    const fy = by + 3 + Math.sin(i * 1.7) * 1.5;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.quadraticCurveTo(fx + 1.4, fy + 2.2, fx + 2.8, fy + 0.6);
    ctx.stroke();
  }

  // summer glossy sheen (soft, not a flash — stays a believable highlight)
  if (p.sheen > 0.02) {
    ctx.fillStyle = rgba([255, 255, 255], 0.1 + 0.2 * p.sheen);
    ctx.beginPath();
    ctx.ellipse(bx - 5, by - 4, 6, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // frost sparkle across the plumage (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgba([235, 246, 255], 0.85 * p.frostAmt);
    for (const [fx, fy] of [[-8, -6], [-3, -8], [3, -7], [8, -5], [-6, -3], [5, -3], [0, -6]] as const) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore(); // end body clip

  // 3) snow on the hen's BACK (winter) — BOLD white cap over the upper silhouette
  if (p.backSnowAmt > 0.001) {
    const a = p.backSnowAmt;
    ctx.fillStyle = rgba([248, 252, 255], 0.95 * a);
    ctx.beginPath();
    ctx.moveTo(bx - 9, by - 10);
    ctx.quadraticCurveTo(bx, by - 15 - vol * 1.2, bx + 9, by - 11);
    ctx.quadraticCurveTo(bx + 4, by - 9, bx + 2, by - 10.5);
    ctx.quadraticCurveTo(bx - 2, by - 8.5, bx - 4, by - 10.5);
    ctx.quadraticCurveTo(bx - 7, by - 9, bx - 9, by - 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.9 * a);
    for (const [dx, dy] of [[-6, -10.5], [0, -11.6], [6, -10], [-2, -12]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.5 + vol * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── HEAD + neck (upper-left, turned toward lower-left) — dips/pecks via pose ──
  const headX = bx - 10;
  const headY = by - 11 + pose.head; // peck dips the head DOWN

  // neck plumage connecting body to head (outline then fill)
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.moveTo(bx - 5, by - 7);
  ctx.quadraticCurveTo(bx - 12, by - 8, headX - 1, headY + 4);
  ctx.lineTo(headX + 4, headY + 5);
  ctx.quadraticCurveTo(bx - 4, by - 3, bx - 1, by - 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(p.bodyShadow);
  ctx.beginPath();
  ctx.moveTo(bx - 5.5, by - 7);
  ctx.quadraticCurveTo(bx - 11, by - 8, headX, headY + 3.5);
  ctx.quadraticCurveTo(bx - 5, by - 3.5, bx - 2, by - 6);
  ctx.closePath();
  ctx.fill();

  // head outline
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(headX, headY, 6.2, 6.0, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // head fill (lit)
  const headGrad = ctx.createLinearGradient(headX - 5, headY - 5, headX + 4, headY + 5);
  headGrad.addColorStop(0, rgba(p.bodyLight));
  headGrad.addColorStop(1, rgba(p.bodyShadow));
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.ellipse(headX, headY, 5.0, 4.8, -0.1, 0, Math.PI * 2);
  ctx.fill();

  // small red COMB on top of the head
  ctx.fillStyle = rgba(p.comb);
  ctx.beginPath();
  ctx.moveTo(headX - 2.5, headY - 4.6);
  ctx.quadraticCurveTo(headX - 2, headY - 8, headX, headY - 5.6);
  ctx.quadraticCurveTo(headX + 1.4, headY - 8.2, headX + 2, headY - 5.4);
  ctx.quadraticCurveTo(headX + 3.4, headY - 7.4, headX + 3.6, headY - 4.4);
  ctx.quadraticCurveTo(headX + 1, headY - 3.4, headX - 2.5, headY - 4.6);
  ctx.closePath();
  ctx.fill();
  // small red WATTLE under the beak
  ctx.fillStyle = rgba(p.comb);
  ctx.beginPath();
  ctx.ellipse(headX - 4.2, headY + 3.6, 1.4, 2.2 + pose.peck * 0.8, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // orange BEAK pointing lower-left — opens with the peck
  {
    const open = pose.peck * 2.2; // upper/lower mandible split
    ctx.fillStyle = rgba(p.beak);
    // upper mandible
    ctx.beginPath();
    ctx.moveTo(headX - 4.4, headY - 0.4);
    ctx.lineTo(headX - 9.4, headY + 1.2 - open * 0.5);
    ctx.lineTo(headX - 4.2, headY + 1.4);
    ctx.closePath();
    ctx.fill();
    // lower mandible (drops open during peck)
    ctx.fillStyle = rgba([
      Math.max(0, p.beak[0] - 22),
      Math.max(0, p.beak[1] - 26),
      Math.max(0, p.beak[2] - 18),
    ]);
    ctx.beginPath();
    ctx.moveTo(headX - 4.2, headY + 1.4);
    ctx.lineTo(headX - 9.4, headY + 1.8 + open * 0.6);
    ctx.lineTo(headX - 4.0, headY + 2.6 + open * 0.4);
    ctx.closePath();
    ctx.fill();
  }

  // EYE — small dark dot with a glint
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.arc(headX - 1.6, headY - 0.4, 1.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([255, 255, 255], 0.85);
  ctx.beginPath();
  ctx.arc(headX - 2.0, headY - 0.9, 0.45, 0, Math.PI * 2);
  ctx.fill();

  // snow tuft on the comb/head (winter)
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgba([246, 251, 255], 0.9 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(headX, headY - 5.2, 3.2, 1.3, -0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── SCARF (winter) — a little knitted band around the neck, below the head ───
  if (p.scarfAmt > 0.001) {
    const sx = headX + 4.2;
    const sy = headY + 4.0;
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // wrap band
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 5.0, 2.8, 0.30, 0, Math.PI * 2);
    ctx.fill();
    // darker underside for depth
    ctx.fillStyle = rgba([
      Math.max(0, p.scarfColor[0] - 50),
      Math.max(0, p.scarfColor[1] - 30),
      Math.max(0, p.scarfColor[2] - 40),
    ]);
    ctx.beginPath();
    ctx.ellipse(sx + 0.6, sy + 1.3, 4.6, 1.5, 0.30, 0, Math.PI * 2);
    ctx.fill();
    // hanging tail of the scarf with a fringe
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.moveTo(sx - 2.4, sy + 1.6);
    ctx.lineTo(sx + 1.0, sy + 2.2);
    ctx.lineTo(sx + 0.2, sy + 7.6);
    ctx.lineTo(sx - 3.0, sy + 6.8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(p.scarfColor);
    ctx.lineWidth = 0.9;
    ctx.lineCap = "round";
    for (const fx of [-2.8, -1.6, -0.4]) {
      ctx.beginPath();
      ctx.moveTo(sx + fx, sy + 7.0);
      ctx.lineTo(sx + fx - 0.2, sy + 8.6);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.restore();
  }

  ctx.restore(); // end squash/stretch transform

  // ── Snow rim on the NEST (winter) — over the straw, hen stays visible ────────
  if (p.backSnowAmt > 0.001) {
    const a = p.backSnowAmt;
    ctx.strokeStyle = rgba([246, 251, 255], 0.9 * a);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(0, NEST_CY - 0.4, NEST_RX - 0.6, NEST_RY, 0, Math.PI * 0.08, Math.PI * 0.92);
    ctx.stroke();
    ctx.fillStyle = rgba([255, 255, 255], 0.8 * a);
    for (const [sx, sy] of [[-12, NEST_CY + 1], [12, NEST_CY + 1], [0, NEST_CY + 3.4]] as const) {
      ctx.beginPath();
      ctx.arc(sx, sy, 1.0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // breath-fog puff at the beak (winter) — drawn OUTSIDE the squash transform so
  // it reads as air. Static base puff + an exhale swell during the peck/hop.
  if (p.breathFogAmt > 0.001) {
    const beakTipX = bx - 10 - 9.4;
    const beakTipY = 2 - pose.lift - 11 + pose.head + 1.6;
    const exhale = Math.max(pose.peck, pose.hop);
    const reach = 3.0 + exhale * 3.0;
    ctx.fillStyle = rgba([235, 244, 255], (0.34 + 0.28 * exhale) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(beakTipX - reach, beakTipY + 1.2, 2.6 + exhale * 2.0, 1.9 + exhale * 1.3, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// the overall colour-of-light wash, painted last over the whole tile
function paintLightWash(ctx: CanvasRenderingContext2D, p: P): void {
  if (p.lightWashAmt <= 0.001) return;
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = rgba(p.lightWash, p.lightWashAmt);
  ctx.beginPath();
  ctx.ellipse(0, 4, 26, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── THE single paint ────────────────────────────────────────────────────────

function paint(ctx: CanvasRenderingContext2D, pIn: P, pose: Pose): void {
  const p = clampP(pIn);
  ctx.save();
  try {
    paintPad(ctx, p);
    paintNest(ctx, p);
    paintHen(ctx, p, pose);
    paintLightWash(ctx, p);
  } finally {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }
}

// ── Per-season builders ─────────────────────────────────────────────────────

function draw(season: SeasonName) {
  return (ctx: CanvasRenderingContext2D): void => paint(ctx, SP[season], REST);
}

function anim(season: SeasonName) {
  return (ctx: CanvasRenderingContext2D, t: number): void => {
    paint(ctx, SP[season], poseFromClock(t));
  };
}

// ── Forward transitions (lerp EVERY field through quintic smoothstep) ─────────

// A monotone ease that is EXACT at the endpoints but can lead or lag.
function biasedEase(k: number, bias: number): number {
  const x = clamp01(k);
  return Math.pow(smoother(x), bias);
}

// Staged transition. The whole-tile look lerps from SP[from] (p=0) to SP[to]
// (p=1) — so transition(0) === draw(from) and transition(1) === draw(to)
// EXACTLY (drawn at REST, matching the idle hand-off). The plumage VOLUME leads
// (coat fluffs early); snow / frost / breath-fog / scarf LAG (settle late).
function makeTransition(fromIdx: 0 | 1 | 2) {
  const from = SEASON_NAMES[fromIdx];
  const to = SEASON_NAMES[fromIdx + 1];
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const p = clamp01(pp);
    const kBase = smoother(p);
    const kCoat = biasedEase(p, 0.62); // plumage volume LEADS
    const kSnow = biasedEase(p, 1.7); // snow / frost / fog / scarf LAG

    const a = SP[from];
    const b = SP[to];
    const blended: P = lerpP(a, b, kBase);
    blended.plumageVolume = lerp(a.plumageVolume, b.plumageVolume, kCoat);
    blended.backSnowAmt = lerp(a.backSnowAmt, b.backSnowAmt, kSnow);
    blended.padSnowAmt = lerp(a.padSnowAmt, b.padSnowAmt, kSnow);
    blended.frostAmt = lerp(a.frostAmt, b.frostAmt, kSnow);
    blended.breathFogAmt = lerp(a.breathFogAmt, b.breathFogAmt, kSnow);
    blended.scarfAmt = lerp(a.scarfAmt, b.scarfAmt, kSnow);

    paint(ctx, blended, REST);

    // Transient overlays (strength ∝ sin(π·p): exactly 0 at both ends).
    const trans = Math.sin(Math.PI * p);
    if (trans <= 0.0008) return;

    ctx.save();
    try {
      const bx = BODY_CX;
      const by = 2;

      // Loose down motes lifting off the thickening plumage — reads the coat
      // visibly fluffing/growing. Present in EVERY morph (deterministic in p).
      const fluff = trans * (0.4 + 0.6 * Math.max(0, b.plumageVolume - a.plumageVolume + 0.4));
      if (fluff > 0.01) {
        ctx.fillStyle = rgba([255, 255, 255], 0.5 * fluff);
        const motes: Array<[number, number, number]> = [
          [-8, -8, 1.1], [3, -10, 1.4], [9, -6, 0.9], [-3, -11, 1.0],
        ];
        for (const [mx, my, mr] of motes) {
          const rise = (1 - Math.cos(Math.PI * p)) * 2.2;
          ctx.beginPath();
          ctx.arc(bx + mx, by + my - rise, mr * (0.7 + 0.5 * trans), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Snow settling onto the back during autumn→winter (target gains snow).
      const snowGain = Math.max(0, b.backSnowAmt - a.backSnowAmt);
      if (snowGain > 0.01) {
        ctx.fillStyle = rgba([255, 255, 255], 0.8 * trans * snowGain);
        const land = smoother(p);
        const flecks: Array<[number, number]> = [
          [-6, -10], [-1, -11], [4, -9.5], [7, -8],
        ];
        for (const [fxx, fyy] of flecks) {
          const fall = (1 - land) * 6;
          ctx.beginPath();
          ctx.arc(bx + fxx, by + fyy - fall, 1.0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // A breath-fog puff appearing as the cold sets in (target gains fog).
      const fogGain = Math.max(0, b.breathFogAmt - a.breathFogAmt);
      if (fogGain > 0.01) {
        const hx = bx - 10 - 9.4;
        const hy = by - 11 + 1.6;
        ctx.fillStyle = rgba([235, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(hx - (3 + trans * 3), hy + 1.2, 2.4 + trans * 1.8, 1.7 + trans * 1.2, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } finally {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();
    }
  };
}

const springToSummer = makeTransition(0);
const summerToAutumn = makeTransition(1);
const autumnToWinter = makeTransition(2);

// ── Public exports ──────────────────────────────────────────────────────────

export const VARIANTS: SeasonalTileEntry = {
  Spring: { draw: draw("Spring"), anim: anim("Spring") },
  Summer: { draw: draw("Summer"), anim: anim("Summer") },
  Autumn: { draw: draw("Autumn"), anim: anim("Autumn") },
  Winter: { draw: draw("Winter"), anim: anim("Winter") },
};

export const TRANSITIONS: SeasonalTransitionSet = {
  0: springToSummer,
  1: summerToAutumn,
  2: autumnToWinter,
};
