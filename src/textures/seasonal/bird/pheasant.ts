// Production seasonal art for the BIRD PHEASANT board tile (`tile_bird_pheasant`).
// Source path token: bird/pheasant
//
// The approved bold direction, built on the same pattern as the herd sheep: a
// single parameterized `paint(ctx, p, pose)` + four `P` presets + lerped
// transitions, pushed so the seasons read AT A GLANCE and the idle is a real,
// fun ACTION rather than a subtle breath.
//
// PALETTE LOCK: it is ALWAYS the same ring-necked pheasant — an iridescent
// dark-GREEN head with a red face wattle, a coppery-chestnut barred body, a
// white neck ring, and a very long pointed barred TAIL trailing up and back to
// the upper-right. The constant SILHOUETTE + markings never change. Seasons
// change only the plumage VOLUME (sleek spring → fluffed winter), the plumage
// gloss, the pad colour, the light wash, and BOLD dressing — snow on the back +
// tail, a little winter SCARF, a breath-fog puff, a blossom, a fallen leaf,
// frost. The bird's identity colours never change.
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~0.95s): a PECK — the head dips ~12px and bobs up, with a
//     long-TAIL FLICK and a small body squash. Seamless.
//   • RARE  ~18s (win ~1.2s): a FLUSH / WING-BURST — the bird crouches
//     (anticipation) then BURSTS upward ~16px with wings thrown wide and the
//     long tail streaming, then settles. May lift OUTSIDE the −24..+24 box.
// Both gestures return to REST with zero value AND zero velocity at the window
// edges (raised-cosine windows), so `anim(…, t)` is seamless and `anim(…, 0)`
// (and `draw`) sit exactly at rest.
//
// Origin-centered in the −24..+24 design box, light from upper-left.
// Deterministic in `t` (seconds). Never throws; clamps every scalar;
// save/restore + globalAlpha reset.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Small math helpers ──────────────────────────────────────────────────────

type RGB = [number, number, number];

function clamp01(x: number): number {
  if (!(x >= 0)) return 0; // also catches NaN
  return x > 1 ? 1 : x;
}

// coerce any wild/non-finite number to a safe finite value
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

// Anticipation→action shape for the WING-BURST: a brief crouch (negative) before
// the rise, then a clean arc up and settle. q∈[0,1]. Returns a LIFT factor in
// roughly −0.2..+1 (negative = crouch/anticipation, positive = airborne).
function burstShape(q: number): number {
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
  bob: number; // whole-body vertical bob (design px, + = up). Burst uses this.
  lean: number; // signed body lean (design px, head end shifts) for the peck/flush
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  head: number; // extra head dip (design px, + = down) for the peck
  peck: number; // 0..1 peck "strike" amount (beak thrust + open)
  hop: number; // 0..1 wing-burst flag (drives wing throw + tail stream)
  wing: number; // 0..1 wing-spread amount (wings thrown wide on the burst)
  tail: number; // signed tail flick (design px, tip swings) for both gestures
}

const REST: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, peck: 0, hop: 0, wing: 0, tail: 0 };

// Build a pose from the wall clock: a common PECK every ~6s and a rare
// WING-BURST every ~18s. Returns to REST (all zeros / unit scales) at every
// window edge.
function poseFromClock(tIn: number): Pose {
  const t = safeNum(tIn, 0);
  const pose: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, peck: 0, hop: 0, wing: 0, tail: 0 };

  // COMMON ~6s: PECK (win ~0.95s). Head dips ~12px, beak strikes, long tail
  // flicks, small body squash. Built from raised-cosine windows → seamless.
  // Phase 3.0 opens the window at t≈3.0 (well clear of t=0, so anim(0) sits at
  // REST).
  const cq = actionQ(t, 6, 0.95, 3.0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window
    // a sharp dip-and-rise: the head dips down ~10–14px at the strike
    const strike = Math.abs(Math.sin(cq * Math.PI)); // 0→1→0 single strike
    pose.head = env * (4.0 + 9.0 * strike); // ~13px at the peak
    pose.peck = env * strike; // beak thrust + open at the strike
    pose.lean = env * strike * -1.6; // head end leans into the peck
    // long tail flicks up/back to counterbalance the dip (a few quick flicks)
    pose.tail = Math.sin(cq * Math.PI * 5) * env * 5.0;
    // small body squash as it bends to peck
    pose.squashY = 1 - env * strike * 0.08;
    pose.squashX = 1 + env * strike * 0.06;
  }

  // RARE ~18s: WING-BURST / FLUSH (win ~1.2s, phase +3s vs the peck so they do
  // not collide). The bird crouches then bursts ~16px up with wings thrown wide
  // and the long tail streaming. May lift OUTSIDE the design box.
  const hq = actionQ(t, 18, 1.2, 6.0);
  if (hq >= 0) {
    const s = burstShape(hq); // −0.2..+1 (crouch then arc)
    const env = bump(hq); // overall envelope for the wing throw
    pose.bob = Math.max(0, s) * 16; // up to ~16px airborne
    pose.hop = env;
    if (s < 0) {
      // anticipation crouch: squash down/wide
      const c = -s; // 0..0.2
      pose.squashY *= 1 - c * 0.9;
      pose.squashX *= 1 + c * 0.7;
    } else {
      // airborne: stretch tall/narrow at the apex
      pose.squashY *= 1 + s * 0.16;
      pose.squashX *= 1 - s * 0.1;
    }
    // wings thrown wide — ramps up after the crouch, peaks airborne
    pose.wing = clamp01(Math.max(0, s) * 1.15 + env * 0.2);
    // the long tail STREAMS out (large flick) during the burst
    pose.tail += Math.sin(hq * Math.PI) * 16.0;
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────

interface P {
  bodyLight: RGB; // lit coppery-chestnut body
  bodyMid: RGB; // body mid tone
  bodyDark: RGB; // shaded body / barring
  headGreen: RGB; // iridescent dark-green head
  headHi: RGB; // green head highlight (sheen)
  wattle: RGB; // red face wattle
  ring: RGB; // white neck ring
  beakLeg: RGB; // beak + legs
  tail: RGB; // long pointed tail base tone
  tailBar: RGB; // dark bars on the tail
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  plumageVolume: number; // 0..1 BOLD plumage puff (sleek spring → fluffed winter)
  gloss: number; // 0..1 iridescent plumage gloss / sheen strength
  frostAmt: number; // 0..1 frost sparkle on the plumage
  backSnowAmt: number; // 0..1 snow settled on the back + tail
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad (autumn)
  breathFogAmt: number; // 0..1 breath puff at the beak (winter)
  scarfAmt: number; // 0..1 a little winter SCARF (tweened alpha)
  scarfColor: RGB; // scarf colour (locked red, fades in via alpha)
}

// Four BOLD season presets. The pheasant stays the SAME ring-necked bird; only
// plumage VOLUME + gloss + pad + light + dressing differ — pushed HARD so each
// season reads at a glance. Body stays coppery, head green, tail long.
const SP: Record<SeasonName, P> = {
  // Spring — sleek bright plumage, dewy lime pad + a blossom, cool-bright light.
  Spring: {
    bodyLight: [212, 134, 66],
    bodyMid: [170, 98, 46],
    bodyDark: [104, 56, 26],
    headGreen: [30, 90, 62],
    headHi: [80, 158, 116],
    wattle: [210, 50, 46],
    ring: [246, 248, 242],
    beakLeg: [198, 170, 98],
    tail: [184, 134, 76],
    tailBar: [86, 56, 30],
    padGrass: [128, 210, 86], // bright lime dewy grass
    soil: [86, 134, 54],
    outline: [54, 40, 28],
    lightWash: [210, 240, 255], // cool-bright
    lightWashAmt: 0.2,
    plumageVolume: 0.12, // BOLD: clearly sleek, slim spring plumage
    gloss: 0.4,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.9,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  // Summer — PEAK: richest glossy iridescent copper-and-green, mid-green pad,
  // bright warm light.
  Summer: {
    bodyLight: [228, 142, 60],
    bodyMid: [190, 100, 40],
    bodyDark: [110, 52, 22],
    headGreen: [22, 102, 68],
    headHi: [102, 196, 144],
    wattle: [228, 44, 42],
    ring: [250, 252, 248],
    beakLeg: [208, 182, 106],
    tail: [200, 144, 78],
    tailBar: [78, 48, 26],
    padGrass: [86, 172, 64], // saturated mid-green
    soil: [58, 112, 40],
    outline: [50, 36, 24],
    lightWash: [255, 240, 188], // warm
    lightWashAmt: 0.2,
    plumageVolume: 0.5, // full normal plumage
    gloss: 1, // peak iridescence
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  // Autumn — warm coppery plumage GLOWING (pheasants read very autumnal),
  // olive-tan pad + a fallen leaf, dulled gloss, low amber light.
  Autumn: {
    bodyLight: [224, 132, 52], // copper pushed warmer + brighter, glowing
    bodyMid: [184, 92, 34],
    bodyDark: [104, 50, 22],
    headGreen: [30, 84, 56],
    headHi: [80, 150, 106],
    wattle: [212, 48, 40],
    ring: [240, 234, 220],
    beakLeg: [202, 168, 90],
    tail: [200, 134, 64],
    tailBar: [82, 50, 26],
    padGrass: [168, 138, 70], // olive-tan browning grass
    soil: [108, 84, 44],
    outline: [56, 40, 26],
    lightWash: [255, 184, 96], // low amber, BOLD
    lightWashAmt: 0.32,
    plumageVolume: 0.74, // thicker
    gloss: 0.45, // dulled
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.95,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  // Winter — FLUFFED plumage, snow on back/tail, a little SCARF, breath fog,
  // frost, snowy pad, cool blue-grey light.
  Winter: {
    bodyLight: [192, 122, 62],
    bodyMid: [156, 90, 44],
    bodyDark: [98, 52, 30],
    headGreen: [38, 82, 66],
    headHi: [84, 148, 120],
    wattle: [200, 62, 58],
    ring: [248, 250, 252],
    beakLeg: [194, 178, 126],
    tail: [176, 128, 78],
    tailBar: [80, 54, 36],
    padGrass: [226, 238, 250], // snow on the pad
    soil: [148, 168, 192],
    outline: [66, 54, 54],
    lightWash: [188, 212, 252], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    plumageVolume: 1, // BOLD: fully puffed against the cold
    gloss: 0.28,
    frostAmt: 0.85,
    backSnowAmt: 0.9,
    padSnowAmt: 0.95,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.85,
    scarfAmt: 1, // a little scarf appears in winter
    scarfColor: [206, 64, 60],
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    bodyLight: lerpRGB(a.bodyLight, b.bodyLight, t),
    bodyMid: lerpRGB(a.bodyMid, b.bodyMid, t),
    bodyDark: lerpRGB(a.bodyDark, b.bodyDark, t),
    headGreen: lerpRGB(a.headGreen, b.headGreen, t),
    headHi: lerpRGB(a.headHi, b.headHi, t),
    wattle: lerpRGB(a.wattle, b.wattle, t),
    ring: lerpRGB(a.ring, b.ring, t),
    beakLeg: lerpRGB(a.beakLeg, b.beakLeg, t),
    tail: lerpRGB(a.tail, b.tail, t),
    tailBar: lerpRGB(a.tailBar, b.tailBar, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    plumageVolume: lerp(a.plumageVolume, b.plumageVolume, t),
    gloss: lerp(a.gloss, b.gloss, t),
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
    gloss: clamp01(p.gloss),
    frostAmt: clamp01(p.frostAmt),
    backSnowAmt: clamp01(p.backSnowAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    breathFogAmt: clamp01(p.breathFogAmt),
    scarfAmt: clamp01(p.scarfAmt),
  };
}

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat grass pad the pheasant stands on
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

  // a BOLD blossom (spring)
  if (p.blossomAmt > 0.001) {
    for (const [bx, by] of [[-12, 18.5], [10, 20], [1, 21]] as const) {
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
      [10, 20.4, 0.7, [214, 132, 40]],
      [-11, 20, -0.5, [192, 88, 34]],
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

// one leg: a slim cylinder with a small foot at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  ctx.strokeStyle = rgba(p.beakLeg);
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // toes
  ctx.lineWidth = 1.1;
  for (const tx of [-1.8, 0, 1.8]) {
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + tx, baseY + 1.6);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

// The long pointed barred tail — a SHARED silhouette sweeping up and back to
// the upper-right (trailing behind the bird). Drawn outline-then-fill, with
// dark cross-bars. `flick` swings the tips (idle gestures stream the tail).
function paintTail(ctx: CanvasRenderingContext2D, p: P, bx: number, by: number, flick: number): void {
  // tail root sits at the rear (upper-right) of the body; the long feathers
  // sweep out to about (+22, -16). One constant fan of three feathers, lifted
  // by `flick` (the tip-y rises a touch and swings) so the long tail reads as
  // streaming during the peck/burst.
  const rootX = bx + 9;
  const rootY = by - 2;
  const lift = -flick; // positive flick lifts the tips up (more negative y)

  const feathers: Array<[number, number, number]> = [
    // [tip x, tip y, half-width] — central longest, outer two shorter
    [22, -18 + lift, 2.2],
    [23, -13 + lift * 0.85, 1.9],
    [20, -8 + lift * 0.7, 1.7],
  ];

  for (const [tx, ty, hw] of feathers) {
    // outline pass (fatter)
    ctx.fillStyle = rgba(p.outline);
    ctx.beginPath();
    ctx.moveTo(rootX, rootY + hw + 1);
    ctx.quadraticCurveTo(bx + (tx + rootX) * 0.4, by + (ty - 2), tx, ty);
    ctx.quadraticCurveTo(bx + (tx + rootX) * 0.42, by + (ty + 2), rootX, rootY - hw - 1);
    ctx.closePath();
    ctx.fill();
    // feather fill
    ctx.fillStyle = rgba(p.tail);
    ctx.beginPath();
    ctx.moveTo(rootX, rootY + hw);
    ctx.quadraticCurveTo(bx + (tx + rootX) * 0.4, by + (ty - 1.4), tx, ty);
    ctx.quadraticCurveTo(bx + (tx + rootX) * 0.42, by + (ty + 1.4), rootX, rootY - hw);
    ctx.closePath();
    ctx.fill();

    // dark cross-bars along the feather (constant count)
    ctx.strokeStyle = rgba(p.tailBar, 0.85);
    ctx.lineWidth = 1.1;
    for (let s = 0.2; s < 0.95; s += 0.16) {
      const cxp = lerp(rootX, tx, s);
      const cyp = lerp(rootY, ty, s);
      const nx = ty - rootY;
      const ny = -(tx - rootX);
      const nlen = Math.hypot(nx, ny) || 1;
      const ux = (nx / nlen) * (hw - 0.4);
      const uy = (ny / nlen) * (hw - 0.4);
      ctx.beginPath();
      ctx.moveTo(cxp - ux, cyp - uy);
      ctx.lineTo(cxp + ux, cyp + uy);
      ctx.stroke();
    }
  }

  // snow settled along the upper edge of the tail (winter)
  if (p.backSnowAmt > 0.001) {
    ctx.strokeStyle = rgba([248, 252, 255], 0.85 * p.backSnowAmt);
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(rootX + 2, rootY - 2);
    ctx.quadraticCurveTo(bx + 14, by - 14 + lift, 22, -17 + lift);
    ctx.stroke();
    ctx.lineCap = "butt";
  }
}

// one spread WING — a barred copper fan thrown out from the shoulder. Only drawn
// during the wing-burst (amount = pose.wing). `side` = -1 near (front), +1 far.
function paintWing(ctx: CanvasRenderingContext2D, p: P, bx: number, by: number, amount: number, side: number): void {
  if (amount <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = clamp01(amount);
  // shoulder near the front of the body; the fan opens up-and-out
  const shX = bx - 2;
  const shY = by - 2;
  const spread = amount; // 0..1 how far the fan is thrown
  // tip sweeps up and to the side; near wing forward (lower-left), far behind
  const tipX = shX + side * (10 + 8 * spread);
  const tipY = shY - (12 + 6 * spread);
  const midX = shX + side * (4 + 4 * spread);
  const midY = shY - (8 + 5 * spread);
  // outline fan
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.moveTo(shX, shY + 2);
  ctx.quadraticCurveTo(midX - side * 3, midY + 2, tipX, tipY);
  ctx.quadraticCurveTo(midX + side * 4, midY - 1, shX + side * 2, shY - 2);
  ctx.closePath();
  ctx.fill();
  // wing fill (copper)
  ctx.fillStyle = rgba(side < 0 ? p.bodyLight : p.bodyMid);
  ctx.beginPath();
  ctx.moveTo(shX, shY + 1.4);
  ctx.quadraticCurveTo(midX - side * 2.4, midY + 1.6, tipX, tipY + 0.4);
  ctx.quadraticCurveTo(midX + side * 3.2, midY - 0.8, shX + side * 1.6, shY - 1.6);
  ctx.closePath();
  ctx.fill();
  // a couple of dark flight-feather bars
  ctx.strokeStyle = rgba(p.bodyDark, 0.8);
  ctx.lineWidth = 1.0;
  for (const s of [0.45, 0.7, 0.9]) {
    ctx.beginPath();
    ctx.moveTo(lerp(shX, tipX, s * 0.7), lerp(shY, tipY, s));
    ctx.lineTo(lerp(midX + side * 3, tipX, s), lerp(midY, tipY, s) - 0.6);
    ctx.stroke();
  }
  ctx.restore();
}

// the whole pheasant, standing front-¾ turned ~15–20° toward lower-left, posed
// by `pose`.
function paintPheasant(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  // legs stay PLANTED on the pad (they don't lift with the burst — they
  // stretch). Body centre lifts during the wing-burst.
  const bx = -1;
  const by = 5 - pose.bob;
  // plumage VOLUME boldly puffs the body outline (sleek spring → fluffed winter)
  const vol = 0.86 + p.plumageVolume * 0.32;

  // ── Far wing FIRST (behind the body), only during the burst ──────────────
  paintWing(ctx, p, bx, by, pose.wing, 1);

  // ── Tail (behind the body) — streams with the flick ──────────────────────
  paintTail(ctx, p, bx, by, pose.tail);

  // ── Legs (behind the body, contact on the pad) ──────────────────────────
  paintLeg(ctx, p, bx + 1.5, by + 5.5 + pose.bob, 18.8);
  paintLeg(ctx, p, bx - 3.5, by + 5.5 + pose.bob, 19.2);

  // The whole upper body (body + neck + head + dressing) is drawn under a
  // squash/stretch transform centred on the body, so the burst reads with
  // anticipation squash + airborne stretch and the peck with a small bend.
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-bx, -by);

  const rx = 11 * vol;
  const ry = 8 * vol;

  // ── BODY — coppery-chestnut ovoid, tilted slightly toward lower-left ─────
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-0.12 + pose.lean * 0.02); // ~7° tilt; the peck leans into the dip
  // outline halo
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx + 1.2, ry + 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // mid body
  ctx.fillStyle = rgba(p.bodyMid);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit upper-left face
  ctx.fillStyle = rgba(p.bodyLight, 0.92);
  ctx.beginPath();
  ctx.ellipse(-2.4, -2.4, rx * 0.72, ry * 0.66, 0, 0, Math.PI * 2);
  ctx.fill();
  // shaded lower-right belly
  ctx.fillStyle = rgba(p.bodyDark, 0.55);
  ctx.beginPath();
  ctx.ellipse(3, 3, rx * 0.66, ry * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // coppery barring — short dark flecks across the flank (constant pattern)
  ctx.fillStyle = rgba(p.bodyDark, 0.7 + 0.2 * p.gloss);
  for (const [fx, fy] of [
    [-4, -1], [0, -3], [3, -1], [-2, 2], [4, 1.5], [1, 3], [-5, 2.5], [6, -1.5],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(fx, fy, 1.4, 0.9, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // fluffed-plumage rim lumps around the body (winter reads puffy) — count
  // constant, size grows with volume so the silhouette stays the same bird.
  if (p.plumageVolume > 0.3) {
    const puff = (p.plumageVolume - 0.3) / 0.7; // 0..1
    ctx.fillStyle = rgba(p.bodyMid);
    const lumps = 9;
    for (let i = 0; i < lumps; i++) {
      const a = (i / lumps) * Math.PI * 2 + 0.3;
      const lx = Math.cos(a) * rx * 0.98;
      const ly = Math.sin(a) * ry * 0.98;
      ctx.beginPath();
      ctx.arc(lx, ly, 1.0 + puff * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // snow settled on the back (winter) — soft white cap over the body top
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgba([248, 252, 255], 0.92 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 0.5, by - ry + 1, rx * 0.8, 3.2, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.88 * p.backSnowAmt);
    for (const [dx, dy] of [[-4, -ry], [1, -ry - 0.6], [5, -ry + 0.6]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the plumage (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.frostAmt);
    for (const [fx, fy] of [
      [-6, -2], [-1, 3], [4, -1], [7, 2], [1, -4], [-4, 4],
    ] as const) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── NECK RING + HEAD (front-¾, lower-left) — locks identity ──────────────
  // the head dips down with the peck (pose.head), and the whole neck leans.
  const headDip = pose.head;
  const nx = bx - 8.5; // neck base
  const ny = by - 1 + headDip * 0.35;
  const hx = bx - 12.5 + pose.lean; // head centre (turned toward lower-left)
  const hy = by - 5 + headDip;

  // neck — short coppery column from body up to the head
  ctx.strokeStyle = rgba(p.outline);
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(nx + 2, ny + 1);
  ctx.lineTo(hx + 1, hy + 3);
  ctx.stroke();
  ctx.strokeStyle = rgba(p.bodyMid);
  ctx.lineWidth = 4.4;
  ctx.beginPath();
  ctx.moveTo(nx + 2, ny + 1);
  ctx.lineTo(hx + 1, hy + 3);
  ctx.stroke();
  ctx.lineCap = "butt";

  // white neck ring — a bright collar band where neck meets head
  ctx.save();
  ctx.translate((nx + hx) * 0.5 + 1, (ny + hy) * 0.5 + 2);
  ctx.rotate(-0.5);
  ctx.fillStyle = rgba(p.ring);
  ctx.beginPath();
  ctx.ellipse(0, 0, 3.4, 1.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.outline, 0.3);
  ctx.beginPath();
  ctx.ellipse(0, 1, 3, 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── SCARF (winter) — a little knitted band around the neck, below the head ──
  if (p.scarfAmt > 0.001) {
    const sx = (nx + hx) * 0.5 + 1.5;
    const sy = (ny + hy) * 0.5 + 3.2;
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // wrap band
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 4.0, 2.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // darker underside for depth
    ctx.fillStyle = rgba([
      Math.max(0, p.scarfColor[0] - 50),
      Math.max(0, p.scarfColor[1] - 30),
      Math.max(0, p.scarfColor[2] - 30),
    ]);
    ctx.beginPath();
    ctx.ellipse(sx + 0.4, sy + 1.0, 3.6, 1.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // hanging tail of the scarf with a fringe
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.moveTo(sx - 2.0, sy + 1.2);
    ctx.lineTo(sx + 0.6, sy + 1.6);
    ctx.lineTo(sx - 0.2, sy + 6.4);
    ctx.lineTo(sx - 2.8, sy + 6.0);
    ctx.closePath();
    ctx.fill();
    // fringe at the bottom
    ctx.strokeStyle = rgba(p.scarfColor);
    ctx.lineWidth = 0.9;
    ctx.lineCap = "round";
    for (const fx of [-2.4, -1.4, -0.4]) {
      ctx.beginPath();
      ctx.moveTo(sx + fx, sy + 6.0);
      ctx.lineTo(sx + fx - 0.2, sy + 7.4);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.restore();
  }

  // head — iridescent dark-green ovoid
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 4.4, 4.1, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.headGreen);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 3.8, 3.5, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // green sheen highlight (upper-left), strength from gloss
  ctx.fillStyle = rgba(p.headHi, 0.4 + 0.4 * p.gloss);
  ctx.beginPath();
  ctx.ellipse(hx - 1.4, hy - 1.4, 1.8, 1.5, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // red face wattle — a small patch around the eye/cheek
  ctx.fillStyle = rgba(p.wattle);
  ctx.beginPath();
  ctx.ellipse(hx - 1.6, hy + 0.6, 2.2, 1.7, -0.1, 0, Math.PI * 2);
  ctx.fill();

  // eye
  ctx.fillStyle = rgba([250, 246, 220]);
  ctx.beginPath();
  ctx.arc(hx - 1.4, hy - 0.2, 1.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([20, 16, 14]);
  ctx.beginPath();
  ctx.arc(hx - 1.6, hy - 0.1, 0.6, 0, Math.PI * 2);
  ctx.fill();

  // beak — short pale wedge pointing lower-left; thrusts + opens on the peck
  const thrust = pose.peck * 2.0; // beak reaches further on the strike
  const gape = pose.peck * 1.4; // beak opens
  ctx.fillStyle = rgba(p.beakLeg);
  ctx.beginPath();
  ctx.moveTo(hx - 3.4, hy + 0.2 - gape);
  ctx.lineTo(hx - 7 - thrust, hy + 1.4);
  ctx.lineTo(hx - 3.4, hy + 1.8 + gape);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(p.outline, 0.6);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(hx - 3.4, hy + 1.0);
  ctx.lineTo(hx - 6.6 - thrust, hy + 1.5);
  ctx.stroke();

  ctx.restore(); // end squash/stretch transform

  // ── Near wing (in front of the body), only during the burst ──────────────
  paintWing(ctx, p, bx, by, pose.wing, -1);

  // breath-fog puff at the beak (winter) — drawn OUTSIDE the squash transform so
  // it reads as air, not body. Swells a touch with the peck exhale.
  if (p.breathFogAmt > 0.001) {
    const hxF = bx - 12.5 + pose.lean;
    const hyF = by - 5 + pose.head;
    const reach = 8 + pose.peck * 3.0;
    ctx.fillStyle = rgba([235, 244, 255], (0.34 + 0.28 * pose.peck) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(hxF - reach, hyF + 1.6, 3.0 + pose.peck * 1.6, 2.0 + pose.peck * 1.0, 0.1, 0, Math.PI * 2);
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
  ctx.ellipse(0, 2, 28, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── THE single paint ────────────────────────────────────────────────────────

function paint(ctx: CanvasRenderingContext2D, pIn: P, pose: Pose): void {
  const p = clampP(pIn);
  ctx.save();
  try {
    paintPad(ctx, p);
    paintPheasant(ctx, p, pose);
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
// (feathers fluff early); snow / frost / breath-fog / scarf LAG (settle late).
function makeTransition(fromIdx: 0 | 1 | 2) {
  const from = SEASON_NAMES[fromIdx];
  const to = SEASON_NAMES[fromIdx + 1];
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const p = clamp01(pp);
    const kBase = smoother(p);
    const kVol = biasedEase(p, 0.62); // plumage volume LEADS
    const kSnow = biasedEase(p, 1.7); // snow / frost / fog / scarf LAG

    const a = SP[from];
    const b = SP[to];
    const blended: P = lerpP(a, b, kBase);
    blended.plumageVolume = lerp(a.plumageVolume, b.plumageVolume, kVol);
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
      const bx = -1;
      const by = 5;

      // Loose feather motes lifting off the puffing coat — reads the plumage
      // visibly fluffing/growing. Present in EVERY morph (deterministic in p).
      const fluff = trans * (0.4 + 0.6 * Math.max(0, b.plumageVolume - a.plumageVolume + 0.4));
      if (fluff > 0.01) {
        ctx.fillStyle = rgba([255, 248, 236], 0.45 * fluff);
        const motes: Array<[number, number, number]> = [
          [-7, -7, 1.0], [3, -9, 1.3], [8, -5, 0.9], [-2, -10, 1.0],
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
          [-5, -9], [-1, -10], [4, -8.5], [7, -7],
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
        const hx = bx - 12.5;
        const hy = by - 5;
        ctx.fillStyle = rgba([235, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(hx - (7 + trans * 3), hy + 1.6, 2.6 + trans * 1.8, 1.8 + trans * 1.2, 0.1, 0, Math.PI * 2);
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
