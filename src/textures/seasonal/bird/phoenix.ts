// Production seasonal art for the BIRD PHOENIX board tile (`tile_bird_phoenix`)
// — the approved bold "bold & fun" direction. A single parameterized
// `paint(ctx, p, pose)` + four `P` presets + lerped transitions, pushed so the
// seasons read at a glance and the idle is a real, fun ACTION rather than a
// subtle breath. Mirrors the herd-sheep reference architecture exactly.
//
// PALETTE LOCK (the bird's IDENTITY): the phoenix is ALWAYS the same mythical
// FIREBIRD — fiery orange/red/gold plumage, a long flame-like sweeping tail, an
// upright flame crest, wrapped in a warm magical-fire glow. Its FLAME is its
// identity and BURNS in EVERY season (it is magical fire). The silhouette /
// fiery colours are constant all four seasons; seasons change only a bold
// LIGHT/COLOUR wash, the plumage VOLUME (fluff), the pad + light props, and
// winter dressing (snow that MELTS/steams on the warm back, frost, a scarf). We
// NEVER morph it into another animal.
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~0.9–1.0s): a HEAD-BOB + FLAME-FLICKER — the phoenix bobs
//     its head and its flame plume flickers/pulses (~10–14px), small body squash
//     + tail flick. Seamless.
//   • RARE ~18s (win ~1.1–1.3s, phase +3s): a FLARE-UP / WING-SPREAD — the
//     phoenix rears, spreads its flaming wings wide, the glow flares brightly
//     and it lifts (~14–18px), then settles. Anticipation → blaze → settle. May
//     lift OUTSIDE the −24..+24 design box at the apex.
// Both gestures return to REST with zero value AND zero velocity at the window
// edges (raised-cosine windows), so `anim(…, t)` is seamless and `anim(…, 0)`
// (and `draw`) sit exactly at rest.
//
// Origin-centered in the −24..+24 design box, light from upper-left. Deterministic
// in `t` (seconds). Never throws; clamps every scalar; save/restore in `finally`
// with globalAlpha + globalCompositeOperation reset (additive glow is used).

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Small math helpers ──────────────────────────────────────────────────────

type RGB = [number, number, number];

function clamp01(x: number): number {
  if (!(x >= 0)) return 0; // also catches NaN
  return x > 1 ? 1 : x;
}

// guard a non-finite number to a safe fallback
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

// Anticipation→action shape for the FLARE-UP: a brief crouch (negative) before
// the rear-up, then a clean arc up and settle. q∈[0,1]. Returns a LIFT factor in
// roughly −0.18..+1 (negative = squash-down crouch, positive = airborne flare).
function flareShape(q: number): number {
  if (q <= 0 || q >= 1) return 0;
  const antiEnd = 0.24; // first slice = crouch/anticipation
  if (q < antiEnd) {
    // dip down a little (anticipation), zero slope at q=0
    const a = q / antiEnd;
    return -0.18 * (0.5 - 0.5 * Math.cos(a * Math.PI));
  }
  // airborne arc, zero at the seam to the crouch and at q=1
  const a = (q - antiEnd) / (1 - antiEnd);
  return Math.sin(a * Math.PI);
}

// ── The idle POSE (carries all action state into paint) ──────────────────────

interface Pose {
  bob: number; // head/body vertical bob (design px, + = down dip) for the head-bob
  lean: number; // signed body lean (design px sideways)
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  head: number; // extra head dip (design px, + = down) for the bob beat
  peck: number; // 0..1 beak-dip amount during the bob
  hop: number; // whole-body vertical lift (design px, + = up). Flare uses this.
  wing: number; // 0..1 wing-spread amount (flare-up)
  tail: number; // signed tail-tip flick (design px sideways)
  flame: number; // 0..1 extra flame flicker / glow flare amount
  // additive idle drift phases (dressing, not silhouette) — 0..1, default 0
  emberRise: number; // ember-spark rise phase
  steamDrift: number; // steam-wisp drift phase
}

const REST: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, peck: 0, hop: 0, wing: 0, tail: 0, flame: 0, emberRise: 0, steamDrift: 0 };

// Build a pose from the wall clock: a common HEAD-BOB + FLAME-FLICKER every ~6s
// and a rare FLARE-UP / WING-SPREAD every ~18s. Returns to REST (all zeros /
// unit scales) at every window edge.
function poseFromClock(tIn: number): Pose {
  const t = safeNum(tIn, 0);
  const pose: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, peck: 0, hop: 0, wing: 0, tail: 0, flame: 0, emberRise: 0, steamDrift: 0 };

  // COMMON ~6s: HEAD-BOB + FLAME-FLICKER (win ~0.95s). The phoenix bobs its head
  // ~10–14px while its flame plume flickers/pulses, with a small body squash and
  // a tail flick. Built from raised-cosine windows → seamless. Phase 3.0 opens
  // the window at t≈3.0 (well clear of t=0, so anim(0) sits exactly at REST).
  const cq = actionQ(t, 6, 0.95, 3.0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window
    const beat = Math.abs(Math.sin(cq * Math.PI * 2)); // two bob beats
    // head dips down ~10–14px at the peak
    pose.head = env * (4.0 + 9.0 * beat);
    pose.bob = env * (2.0 + 2.0 * beat);
    pose.peck = env * beat;
    pose.flame = env * (0.5 + 0.5 * beat); // flame flickers/pulses with the bob
    pose.tail = Math.sin(cq * Math.PI * 6) * env * 3.0; // a few flicks sideways
    // a small breathing squash so the body feels alive while it bobs
    pose.squashY = 1 - env * 0.05 * beat;
    pose.squashX = 1 + env * 0.04 * beat;
  }

  // RARE ~18s: FLARE-UP / WING-SPREAD (win ~1.2s). The phoenix rears, spreads its
  // flaming wings wide, the glow flares brightly and it lifts ~14–18px, then
  // settles. May lift OUTSIDE the design box at the apex. Phase +3s after common.
  const fq = actionQ(t, 18, 1.2, 6.0);
  if (fq >= 0) {
    const s = flareShape(fq); // −0.18..+1 (crouch then arc)
    pose.hop = Math.max(0, s) * 17; // up to ~17px airborne at the apex
    if (s < 0) {
      // anticipation crouch: squash down/wide
      const c = -s; // 0..0.18
      pose.squashY = 1 - c * 0.9;
      pose.squashX = 1 + c * 0.7;
    } else {
      // airborne flare: rear up tall, the blaze surges
      pose.squashY = 1 + s * 0.16;
      pose.squashX = 1 - s * 0.06;
    }
    // wings spread on a clean grow-in/settle-out bump → zero at both edges
    pose.wing = bump(fq);
    // the glow FLARES brightly at the apex (additive — never strobes to black)
    pose.flame = Math.max(pose.flame, bump(fq));
    // a tail flag during the flare
    pose.tail += Math.sin(fq * Math.PI) * 2.2;
    pose.lean += Math.sin(fq * Math.PI) * 0.6;
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────
//
// NOTE the palette lock: every fire colour below is held nearly constant across
// the four seasons (only a small warmth nudge; summer = peak blaze). The seasons
// move the pad / light wash / plumage VOLUME / winter dressing, never the bird's
// fiery identity colours.

interface P {
  // — the phoenix's fiery plumage (LOCKED identity colours) —
  plumeLight: RGB; // brightest gold of the lit upper plumage
  plumeMid: RGB; // body orange-gold
  plumeDeep: RGB; // deep fiery red-orange in the shadowed plumage / tail roots
  crest: RGB; // crest + wing-tip flame accents
  beakLeg: RGB; // beak / legs (warm horn)
  emberGlow: RGB; // the warm magical-fire halo colour
  // — pad + surroundings (these MOVE with season) —
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  // — dressing amounts (0..1) —
  fireGlow: number; // 0..1 strength of the magical-fire glow (summer = PEAK)
  gloss: number; // 0..1 glossy sparkle highlight on the plumage (summer)
  emberSparkAmt: number; // 0..1 how many ember sparks rise around the bird
  plumageVolume: number; // 0..1 BOLD fluff of the plumage (lean → FLUFFED winter)
  blossomAmt: number; // 0..1 a blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 a fallen leaf on the pad (autumn)
  frostAmt: number; // 0..1 frost on the pad rim (winter)
  backSnowAmt: number; // 0..1 snow that settles + MELTS on the warm back (winter)
  breathFogAmt: number; // 0..1 a steam/breath puff off the warm back (winter)
  scarfAmt: number; // 0..1 a little winter SCARF (tweened alpha) — disabled here
  scarfColor: RGB; // scarf colour (kept for tween plumbing; scarf unused on the phoenix)
  hollyAmt: number; // 0..1 a little winter HOLLY SPRIG at the collar (tweened alpha)
}

// Four BOLD season presets. The phoenix stays the SAME fiery firebird; only the
// light wash, plumage volume, pad and winter dressing differ — pushed HARD so
// each season reads at a glance. Fire colours barely move.
const SP: Record<SeasonName, P> = {
  // Spring — bright fiery plumage, fresh warm glow, a blossom on the pad, cool-
  // bright light. Plumage trim/fresh.
  Spring: {
    plumeLight: [255, 214, 96],
    plumeMid: [248, 150, 40],
    plumeDeep: [206, 70, 24],
    crest: [255, 176, 56],
    beakLeg: [196, 132, 60],
    emberGlow: [255, 168, 70],
    padGrass: [128, 210, 86], // bright lime dewy grass
    soil: [86, 132, 54],
    outline: [82, 36, 22],
    lightWash: [210, 240, 255], // cool-bright
    lightWashAmt: 0.18,
    fireGlow: 0.66,
    gloss: 0.18,
    emberSparkAmt: 0.5,
    plumageVolume: 0.28, // fresh, fairly trim
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
    frostAmt: 0,
    backSnowAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [120, 70, 200],
    hollyAmt: 0,
  },
  // Summer — PEAK blaze: most intense flame glow + sparkle, glossy gold-red
  // plumage, bright warm light. Saturated mid-green pad.
  Summer: {
    plumeLight: [255, 226, 112],
    plumeMid: [255, 150, 30],
    plumeDeep: [214, 60, 18],
    crest: [255, 186, 48],
    beakLeg: [200, 134, 58],
    emberGlow: [255, 158, 58],
    padGrass: [86, 170, 64], // saturated mid-green
    soil: [58, 110, 40],
    outline: [86, 34, 18],
    lightWash: [255, 240, 196], // bright warm
    lightWashAmt: 0.2,
    fireGlow: 1.0, // PEAK blaze
    gloss: 0.9, // glossy gold-red plumage + sparkle
    emberSparkAmt: 0.95,
    plumageVolume: 0.42, // full but sleek
    blossomAmt: 0,
    fallenLeafAmt: 0,
    frostAmt: 0,
    backSnowAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [120, 70, 200],
    hollyAmt: 0,
  },
  // Autumn — deep ember plumage, glow warm and rich, a fallen leaf on the pad,
  // amber light. Olive-tan browning pad.
  Autumn: {
    plumeLight: [250, 198, 86],
    plumeMid: [242, 132, 32],
    plumeDeep: [192, 56, 20],
    crest: [248, 160, 46],
    beakLeg: [190, 126, 56],
    emberGlow: [252, 146, 56],
    padGrass: [158, 142, 76], // olive-tan
    soil: [104, 84, 44],
    outline: [80, 36, 20],
    lightWash: [255, 188, 110], // rich amber, BOLD
    lightWashAmt: 0.3,
    fireGlow: 0.82,
    gloss: 0.3,
    emberSparkAmt: 0.7,
    plumageVolume: 0.62, // thicker
    blossomAmt: 0,
    fallenLeafAmt: 0.9,
    frostAmt: 0,
    backSnowAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [120, 70, 200],
    hollyAmt: 0,
  },
  // Winter — a firebird IN THE COLD: FLUFFED plumage, snow that MELTS/steams on
  // its warm back (snow + a steam puff), frost on the pad rim, a little winter
  // SCARF, cool blue-grey light wash — but the flame glow STILL BURNS (identity).
  Winter: {
    plumeLight: [252, 206, 96],
    plumeMid: [246, 142, 36],
    plumeDeep: [202, 64, 22],
    crest: [250, 170, 52],
    beakLeg: [188, 128, 64],
    emberGlow: [255, 152, 62],
    padGrass: [212, 226, 242], // snow on the pad
    soil: [140, 158, 180],
    outline: [70, 52, 56],
    lightWash: [190, 214, 250], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    fireGlow: 0.78, // still BURNS — not dimmed, not flashed
    gloss: 0.16,
    emberSparkAmt: 0.5,
    plumageVolume: 1.0, // BOLD: fluffed against the cold
    blossomAmt: 0,
    fallenLeafAmt: 0,
    frostAmt: 0.85,
    backSnowAmt: 0.9, // snow lands on the warm back, then melts/steams
    breathFogAmt: 0.85,
    scarfAmt: 0, // SCARF disabled on the phoenix — it sports a HOLLY SPRIG instead
    scarfColor: [120, 70, 200],
    hollyAmt: 1, // a little holly sprig appears in winter
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    plumeLight: lerpRGB(a.plumeLight, b.plumeLight, t),
    plumeMid: lerpRGB(a.plumeMid, b.plumeMid, t),
    plumeDeep: lerpRGB(a.plumeDeep, b.plumeDeep, t),
    crest: lerpRGB(a.crest, b.crest, t),
    beakLeg: lerpRGB(a.beakLeg, b.beakLeg, t),
    emberGlow: lerpRGB(a.emberGlow, b.emberGlow, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    fireGlow: lerp(a.fireGlow, b.fireGlow, t),
    gloss: lerp(a.gloss, b.gloss, t),
    emberSparkAmt: lerp(a.emberSparkAmt, b.emberSparkAmt, t),
    plumageVolume: lerp(a.plumageVolume, b.plumageVolume, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    backSnowAmt: lerp(a.backSnowAmt, b.backSnowAmt, t),
    breathFogAmt: lerp(a.breathFogAmt, b.breathFogAmt, t),
    scarfAmt: lerp(a.scarfAmt, b.scarfAmt, t),
    scarfColor: lerpRGB(a.scarfColor, b.scarfColor, t),
    hollyAmt: lerp(a.hollyAmt, b.hollyAmt, t),
  };
}

// clamp every scalar field defensively (never throw on a wild `p`)
function clampP(p: P): P {
  return {
    ...p,
    lightWashAmt: clamp01(p.lightWashAmt),
    fireGlow: clamp01(p.fireGlow),
    gloss: clamp01(p.gloss),
    emberSparkAmt: clamp01(p.emberSparkAmt),
    plumageVolume: clamp01(p.plumageVolume),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    frostAmt: clamp01(p.frostAmt),
    backSnowAmt: clamp01(p.backSnowAmt),
    breathFogAmt: clamp01(p.breathFogAmt),
    scarfAmt: clamp01(p.scarfAmt),
    hollyAmt: clamp01(p.hollyAmt),
  };
}

// ── Local paint helpers (driven only by `p` + `pose`) ────────────────────────

// the low flat ground pad the phoenix stands on
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

  // grass / ground top
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

  // snow blanket over the pad (winter) — BOLD coverage on the OUTER pad
  if (p.backSnowAmt > 0.001 || p.frostAmt > 0.001) {
    const cover = Math.max(p.backSnowAmt, p.frostAmt);
    ctx.fillStyle = rgba([244, 250, 255], 0.86 * cover);
    ctx.beginPath();
    ctx.ellipse(0, 18.6, 17.4, 4.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // frost glints on the pad RIM (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.frostAmt);
    for (const [sx, sy] of [[-14, 18.4], [14, 18.0], [-9, 20.6], [11, 20.8], [-2, 21]] as const) {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    // a thin frost line along the rim
    ctx.strokeStyle = rgba([226, 240, 252], 0.55 * p.frostAmt);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 19, 17.6, 4.9, 0, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
  }

  // BOLD blossom (spring)
  if (p.blossomAmt > 0.001) {
    for (const [bx, by] of [[-12, 18.5], [10, 20], [0, 21], [14, 19]] as const) {
      ctx.fillStyle = rgba([255, 248, 252], 0.95 * p.blossomAmt);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(bx + Math.cos(a) * 1.3, by + Math.sin(a) * 1.3, 1.0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = rgba([252, 210, 100], p.blossomAmt);
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

// the warm magical-fire GLOW halo around the bird — its identity, painted UNDER
// the body so it reads as a constant warm aura. `flare` 0..1 surges it (idle).
function paintFireGlow(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number, flare: number): void {
  if (p.fireGlow <= 0.001) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const r = 16 + p.fireGlow * 3 + flare * 4;
  const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
  // strength scales with fireGlow (summer peak) plus the idle flare surge
  const a = (0.14 + 0.16 * p.fireGlow) * (1 + 0.7 * flare);
  g.addColorStop(0, rgba(p.emberGlow, a));
  g.addColorStop(0.55, rgba(p.emberGlow, a * 0.45));
  g.addColorStop(1, rgba(p.emberGlow, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// one leg: a short warm-horn cylinder with a clawed foot at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  ctx.strokeStyle = rgba(p.beakLeg);
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // little splayed toes
  ctx.lineWidth = 1.3;
  for (const dx of [-1.8, 0, 1.8]) {
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + dx, baseY + 1.4);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

// The long flame-like sweeping TAIL — a fan of curved flame plumes sweeping up
// and to the right behind the body. `flick` (design px) bends the plume tips;
// `vol` fluffs the plumes wider (winter); `flame` 0..1 brightens the cores.
function paintTail(ctx: CanvasRenderingContext2D, p: P, bx: number, by: number, flick: number, vol: number, flame: number): void {
  const rootX = bx + 7;
  const rootY = by + 3;
  const widen = 1 + vol * 0.3;
  // each plume: [spread angle bias, length, width, colour]
  const plumes: Array<[number, number, number, RGB]> = [
    [-0.10, 22, 5.2, p.plumeDeep],
    [0.18, 26, 5.6, p.plumeMid],
    [0.42, 23, 4.8, p.crest],
    [0.66, 18, 3.8, p.plumeLight],
  ];
  plumes.forEach(([ang, len, wid, col], i) => {
    wid *= widen;
    // tip sweeps up and to the right; flick adds a gentle flame-lick wobble
    const f = flick * (0.5 + i * 0.22);
    const dirX = Math.cos(ang);
    const tipX = rootX + dirX * len + f;
    const tipY = rootY - Math.cos(ang * 0.6) * len * 0.9 - len * 0.18;
    const ctrlX = rootX + dirX * len * 0.45 + f * 0.5;
    const ctrlY = rootY - len * 0.55;
    ctx.fillStyle = rgba(col);
    ctx.beginPath();
    ctx.moveTo(rootX - wid * 0.5, rootY);
    ctx.quadraticCurveTo(ctrlX - wid * 0.5, ctrlY, tipX, tipY);
    ctx.quadraticCurveTo(ctrlX + wid * 0.6, ctrlY + 1.5, rootX + wid * 0.5, rootY + 1);
    ctx.closePath();
    ctx.fill();
    // bright flame core up the inner edge of the plume — pulses with `flame`
    ctx.strokeStyle = rgba(p.plumeLight, 0.45 + 0.4 * flame);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, tipX - f * 0.3, tipY + 1.5);
    ctx.stroke();
  });
}

// a single spread WING of flame feathers, fanned out from a shoulder pivot.
// `side` = -1 (near/left) or +1 (far/right); `spread` 0..1 opens it for the flare.
function paintSpreadWing(ctx: CanvasRenderingContext2D, p: P, ox: number, oy: number, side: number, spread: number, vol: number): void {
  if (spread <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = clamp01(0.5 + 0.5 * spread);
  // three flame feathers fanning out + up from the shoulder
  const feathers = 3;
  for (let i = 0; i < feathers; i++) {
    const baseAng = side * (0.5 + i * 0.5); // fan outward
    const ang = baseAng * (0.4 + 0.6 * spread); // opens with spread
    const len = (11 + i * 2 + vol * 3) * (0.5 + 0.5 * spread);
    const wid = 3.6 + vol * 1.2;
    const tipX = ox + Math.sin(ang) * len;
    const tipY = oy - Math.cos(ang) * len * 0.78;
    const col = i === feathers - 1 ? p.crest : i === 0 ? p.plumeDeep : p.plumeMid;
    ctx.fillStyle = rgba(col);
    ctx.beginPath();
    ctx.moveTo(ox - side * wid * 0.4, oy + 1);
    ctx.quadraticCurveTo(ox + Math.sin(ang) * len * 0.5, oy - len * 0.5, tipX, tipY);
    ctx.quadraticCurveTo(ox + side * wid * 0.5 + Math.sin(ang) * len * 0.4, oy - len * 0.3 + 1, ox + side * wid * 0.4, oy + 1.5);
    ctx.closePath();
    ctx.fill();
    // bright flame edge
    ctx.strokeStyle = rgba(p.plumeLight, 0.55 * spread);
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.quadraticCurveTo(ox + Math.sin(ang) * len * 0.5, oy - len * 0.5, tipX, tipY);
    ctx.stroke();
  }
  ctx.restore();
}

// the whole phoenix, standing front-¾ turned toward lower-left, posed by `pose`
function paintPhoenix(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  const vol = p.plumageVolume;
  const bx = -2 + pose.lean;
  const bodyY = 4 - pose.hop; // body centre lifts during the flare-up

  // warm fire-glow halo first (under everything; flares with the idle)
  paintFireGlow(ctx, p, bx, bodyY - 1, pose.flame);

  // spread wings drawn UNDER the body so the body overlaps their roots (flare)
  if (pose.wing > 0.001) {
    paintSpreadWing(ctx, p, bx - 4, bodyY - 2, -1, pose.wing, vol); // near wing, left
    paintSpreadWing(ctx, p, bx + 4, bodyY - 2, 1, pose.wing, vol); // far wing, right
  }

  // legs (behind the body); contact stays on the pad while the body lifts/stretches
  paintLeg(ctx, p, bx + 1.5, bodyY + 7, 18.6);
  paintLeg(ctx, p, bx - 2.5, bodyY + 7, 19.0);

  // TAIL behind the body (drawn before the body so the body overlaps its root)
  paintTail(ctx, p, bx, bodyY, pose.tail, vol, pose.flame);

  // The whole upper body (body + head + dressing) is drawn under a squash/stretch
  // transform centred on the body, so the flare reads with anticipation squash +
  // airborne stretch and the bob reads with a small breathing squash.
  ctx.save();
  ctx.translate(bx, bodyY);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-bx, -bodyY);

  const by = bodyY;
  // plumage volume fattens the body silhouette (BOLD fluff in winter)
  const bodyRx = 9.2 * (1 + vol * 0.18);
  const bodyRy = 10.4 * (1 + vol * 0.14);

  // ── BODY — a graceful plump teardrop, breast toward lower-left ──────────────
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(bx, by, bodyRx, bodyRy, -0.12, 0, Math.PI * 2);
  ctx.fill();
  // deep fiery underbelly / shadow
  ctx.fillStyle = rgba(p.plumeDeep);
  ctx.beginPath();
  ctx.ellipse(bx, by + 0.4, bodyRx - 0.8, bodyRy - 0.8, -0.12, 0, Math.PI * 2);
  ctx.fill();
  // mid orange-gold body
  ctx.fillStyle = rgba(p.plumeMid);
  ctx.beginPath();
  ctx.ellipse(bx - 0.6, by - 0.6, bodyRx - 1.6, bodyRy - 1.6, -0.12, 0, Math.PI * 2);
  ctx.fill();
  // lit upper-left plumage (light from upper-left)
  ctx.fillStyle = rgba(p.plumeLight);
  ctx.beginPath();
  ctx.ellipse(bx - 2.4, by - 3.2, 4.8, 5.4, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // FLUFF scallops around the body silhouette — grow BOLDLY with plumageVolume
  if (vol > 0.02) {
    ctx.fillStyle = rgba(p.plumeMid);
    const lumps = 10;
    const lumpR = 1.2 + vol * 2.4;
    for (let i = 0; i < lumps; i++) {
      const a = (i / lumps) * Math.PI * 2 - Math.PI / 2;
      const lx = bx + Math.cos(a) * bodyRx * 0.96;
      const ly = by + Math.sin(a) * bodyRy * 0.96;
      ctx.beginPath();
      ctx.arc(lx, ly, lumpR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // WING folded along the body's right/back side — layered flame feathers
  ctx.save();
  ctx.translate(bx + 2.2, by - 0.5);
  ctx.rotate(-0.18);
  ctx.fillStyle = rgba(p.plumeDeep);
  ctx.beginPath();
  ctx.ellipse(0, 0, 5.6, 7.2, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let row = 0; row < 3; row++) {
    const col = row === 2 ? p.crest : p.plumeMid;
    ctx.fillStyle = rgba(col);
    for (let i = 0; i < 3; i++) {
      const fx = -2 + i * 2.2;
      const fy = -3 + row * 3.2;
      ctx.beginPath();
      ctx.ellipse(fx, fy, 2.0, 3.4, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // breast plumage detail — soft warm feather scallops down the front
  ctx.fillStyle = rgba(p.plumeLight, 0.5);
  for (const [fx, fy] of [[-4.2, -1], [-3.6, 2], [-3.2, 5]] as const) {
    ctx.beginPath();
    ctx.ellipse(bx + fx, by + fy, 1.8, 1.2, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // glossy sparkle highlight on the plumage (summer) — a bright crescent glint
  if (p.gloss > 0.001) {
    ctx.fillStyle = rgba([255, 252, 230], 0.55 * p.gloss);
    ctx.beginPath();
    ctx.ellipse(bx - 3.0, by - 4.4, 2.4, 1.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.7 * p.gloss);
    ctx.beginPath();
    ctx.arc(bx - 3.6, by - 5.0, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  // snow settled + MELTING on the warm back (winter) — a thin white cap with a
  // damp wet edge where the heat melts it (reads as snow on a warm firebird).
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgba([248, 252, 255], 0.9 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 1, by - bodyRy + 1.6, 6.5 * (0.9 + vol * 0.3), 2.8, -0.1, 0, Math.PI * 2);
    ctx.fill();
    // a few snow dabs
    ctx.fillStyle = rgba([255, 255, 255], 0.85 * p.backSnowAmt);
    for (const [dx, dy] of [[-4, -1], [1, -1.6], [4, -0.8]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by - bodyRy + 1.6 + dy, 1.4 + vol * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // wet melt sheen reflecting the warm fire where snow meets warm plumage
    ctx.fillStyle = rgba([255, 180, 90], 0.4 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 1, by - bodyRy + 3.6, 6.0, 1.2, -0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── HEAD (front-¾, turned lower-left) — bobs/dips via pose ──────────────────
  const hx = bx - 6.5;
  const hy = by - 8.5 + pose.head + pose.bob; // head-bob dips the head down

  // neck (warm gradient up to the head)
  ctx.strokeStyle = rgba(p.plumeMid);
  ctx.lineWidth = 5.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx - 2, by - 3);
  ctx.quadraticCurveTo(bx - 5, by - 7, hx + 0.5, hy + 2.5);
  ctx.stroke();
  ctx.lineCap = "butt";

  // head outline + fill
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 4.6, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.plumeMid);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 4.0, 3.8, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit cheek (upper-left)
  ctx.fillStyle = rgba(p.plumeLight);
  ctx.beginPath();
  ctx.ellipse(hx - 1.4, hy - 1.4, 2.2, 2.0, 0, 0, Math.PI * 2);
  ctx.fill();

  // CREST — a few upright flame plumes off the crown (identity flourish). The
  // crest FLICKERS taller with `pose.flame`.
  const flick = pose.flame;
  for (const [cx2, cy2, len, ang] of [
    [hx + 1.2, hy - 3.4, 6, -0.2],
    [hx + 2.6, hy - 2.6, 5, 0.15],
    [hx - 0.2, hy - 3.2, 4.5, -0.5],
  ] as const) {
    const L = len * (1 + flick * 0.35);
    ctx.fillStyle = rgba(p.crest);
    ctx.beginPath();
    ctx.moveTo(cx2 - 1.1, cy2 + 1);
    ctx.quadraticCurveTo(cx2 + Math.sin(ang) * L * 0.5, cy2 - L * 0.6, cx2 + Math.sin(ang) * L, cy2 - L);
    ctx.quadraticCurveTo(cx2 + 1.0, cy2 - L * 0.4, cx2 + 1.1, cy2 + 1);
    ctx.closePath();
    ctx.fill();
  }
  // bright crest tips — brighten with the flame flicker
  ctx.fillStyle = rgba(p.plumeLight, 0.6 + 0.35 * flick);
  for (const [tx, ty] of [[hx + 1.2 + Math.sin(-0.2) * 6, hy - 3.4 - 6 * (1 + flick * 0.35)], [hx + 2.6 + Math.sin(0.15) * 5, hy - 2.6 - 5 * (1 + flick * 0.35)]] as const) {
    ctx.beginPath();
    ctx.arc(tx, ty, 1.0 + flick * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // beak — small warm-horn cone pointing lower-left; opens a touch on the peck
  const gape = pose.peck * 1.4;
  ctx.fillStyle = rgba(p.beakLeg);
  ctx.beginPath();
  ctx.moveTo(hx - 3.4, hy + 0.4);
  ctx.lineTo(hx - 6.4, hy + 1.8 - gape);
  ctx.lineTo(hx - 3.2, hy + 2.4);
  ctx.closePath();
  ctx.fill();
  if (gape > 0.05) {
    // lower mandible drops open
    ctx.fillStyle = rgba([
      Math.max(0, p.beakLeg[0] - 40),
      Math.max(0, p.beakLeg[1] - 30),
      Math.max(0, p.beakLeg[2] - 20),
    ]);
    ctx.beginPath();
    ctx.moveTo(hx - 3.3, hy + 2.0);
    ctx.lineTo(hx - 6.2, hy + 2.2 + gape);
    ctx.lineTo(hx - 3.1, hy + 2.8);
    ctx.closePath();
    ctx.fill();
  }

  // eye — a dark bead with a warm catchlight
  ctx.fillStyle = rgba([28, 18, 14]);
  ctx.beginPath();
  ctx.arc(hx - 1.2, hy - 0.2, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([255, 236, 190], 0.9);
  ctx.beginPath();
  ctx.arc(hx - 1.6, hy - 0.7, 0.45, 0, Math.PI * 2);
  ctx.fill();

  // ── SCARF (winter) — a little knitted band around the neck ──────────────────
  if (p.scarfAmt > 0.001) {
    const sx = hx + 2.6;
    const sy = hy + 3.2;
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 4.6, 2.6, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // darker underside for depth
    ctx.fillStyle = rgba([
      Math.max(0, p.scarfColor[0] - 50),
      Math.max(0, p.scarfColor[1] - 30),
      Math.max(0, p.scarfColor[2] - 40),
    ]);
    ctx.beginPath();
    ctx.ellipse(sx + 0.5, sy + 1.2, 4.2, 1.4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // hanging tail of the scarf with a fringe
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.moveTo(sx - 2.4, sy + 1.4);
    ctx.lineTo(sx + 0.8, sy + 2.0);
    ctx.lineTo(sx + 0.0, sy + 7.0);
    ctx.lineTo(sx - 3.0, sy + 6.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(p.scarfColor);
    ctx.lineWidth = 0.9;
    ctx.lineCap = "round";
    for (const fx of [-2.6, -1.6, -0.6]) {
      ctx.beginPath();
      ctx.moveTo(sx + fx, sy + 6.6);
      ctx.lineTo(sx + fx - 0.2, sy + 8.0);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.restore();
  }

  // ── HOLLY SPRIG (winter) — two little green leaves + red berries pinned at the
  // collar (the firebird's festive winter accessory). Tweened alpha (winter-only,
  // seamless); drawn in the squash frame so it rides with the body. ────────────
  if (p.hollyAmt > 0.01) {
    const hxC = hx + 2.6;
    const hyC = hy + 3.4;
    ctx.save();
    ctx.globalAlpha = clamp01(p.hollyAmt);
    const leafGreen: RGB = [40, 124, 64];
    const leafDark: RGB = [26, 88, 46];
    const berry: RGB = [206, 48, 46];
    // two spiky holly leaves splaying from the collar
    for (const side of [-1, 1] as const) {
      ctx.save();
      ctx.translate(hxC, hyC);
      ctx.rotate(side * 0.6);
      ctx.fillStyle = rgba(leafDark);
      ctx.beginPath();
      ctx.moveTo(0, 1.2);
      ctx.quadraticCurveTo(side * 2.6, -0.6, side * 1.2, -4.2);
      ctx.quadraticCurveTo(side * -0.4, -1.0, 0, 1.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba(leafGreen);
      ctx.beginPath();
      ctx.moveTo(0, 0.6);
      ctx.quadraticCurveTo(side * 2.0, -0.6, side * 0.9, -3.6);
      ctx.quadraticCurveTo(side * -0.2, -0.8, 0, 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // a little cluster of red berries at the centre
    ctx.fillStyle = rgba(berry);
    for (const [dx, dy] of [[-1.0, 0.4], [1.0, 0.6], [0, -0.8]] as const) {
      ctx.beginPath();
      ctx.arc(hxC + dx, hyC + dy, 1.0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = rgba([255, 255, 255], 0.6);
    ctx.beginPath();
    ctx.arc(hxC - 0.4, hyC - 1.1, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore(); // end squash/stretch transform

  // breath/steam puff off the warm back (winter) — drawn OUTSIDE the squash
  // transform so it reads as air, not body. The warm firebird steams in the cold.
  if (p.breathFogAmt > 0.001) {
    const reach = 5.0 + p.breathFogAmt * 2.0;
    ctx.fillStyle = rgba([235, 244, 255], 0.32 * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(bx + 2, bodyY - bodyRy - reach * 0.4, 4.0, reach * 0.6, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

// rising ember sparks around the bird — additive warm motes (a few, drifting up).
// `rise` 0..1 phases them; `flame` boosts them during the idle flare.
function paintEmberSparks(ctx: CanvasRenderingContext2D, p: P, bx: number, by: number, rise: number, flame: number): void {
  if (p.emberSparkAmt <= 0.001) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const seeds: Array<[number, number, number]> = [
    [-7, 0.0, 1.0],
    [5, 0.35, 0.9],
    [9, 0.62, 0.8],
    [-2, 0.8, 1.0],
    [2, 0.18, 0.7],
  ];
  const amt = clamp01(p.emberSparkAmt * (1 + 0.5 * flame));
  const n = Math.max(1, Math.round(seeds.length * amt));
  for (let i = 0; i < n; i++) {
    const [sx, phase, sz] = seeds[i];
    const prog = ((rise + phase) % 1 + 1) % 1;
    const ey = by - 2 - prog * 20; // rise upward and fade
    const ex = bx + sx + Math.sin(prog * Math.PI * 2 + phase * 6) * 2.4;
    const fade = Math.sin(prog * Math.PI); // 0 at both ends → seamless
    ctx.fillStyle = rgba([255, 196, 96], 0.85 * fade * amt);
    ctx.beginPath();
    ctx.arc(ex, ey, sz * (0.7 + 0.5 * fade) * (1 + 0.4 * flame), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// steam / breath wisps rising off the warm winter back.
// `drift` 0..1 phases them; only present when breathFogAmt > 0.
function paintSteam(ctx: CanvasRenderingContext2D, p: P, drift: number): void {
  if (p.breathFogAmt <= 0.001) return;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const seeds: Array<[number, number]> = [
    [-5, 0.0],
    [4, 0.4],
    [0, 0.7],
  ];
  for (const [sx, phase] of seeds) {
    const prog = ((drift + phase) % 1 + 1) % 1;
    const wy = -6 - prog * 14; // rise from the warm back upward
    const wx = sx + Math.sin(prog * Math.PI * 2 + phase * 5) * 3;
    const fade = Math.sin(prog * Math.PI); // 0 at ends → seamless
    ctx.fillStyle = rgba([232, 240, 248], 0.3 * fade * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(wx, wy, 2.6 + prog * 1.6, 3.4 + prog * 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
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
  const bx = -2 + pose.lean;
  const by = 4 - pose.hop;
  ctx.save();
  try {
    paintPad(ctx, p);
    paintSteam(ctx, p, pose.steamDrift);
    paintPhoenix(ctx, p, pose);
    paintEmberSparks(ctx, p, bx, by, pose.emberRise, pose.flame);
    paintLightWash(ctx, p);
  } finally {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }
}

// ── Per-season builders ─────────────────────────────────────────────────────

function draw(season: SeasonName) {
  // at-rest still: REST pose, but ember sparks / steam show their static at-rest
  // dressing phase (they are dressing, not the silhouette — fine to be nonzero).
  return (ctx: CanvasRenderingContext2D): void => paint(ctx, SP[season], { ...REST, emberRise: 0.2, steamDrift: 0.2 });
}

function anim(season: SeasonName) {
  return (ctx: CanvasRenderingContext2D, tIn: number): void => {
    const t = safeNum(tIn, 0);
    const pose = poseFromClock(t);
    // ember sparks rise on a seamless loop; steam drifts on its own loop. Both
    // are anchored at +0.2 so anim(0) matches the static `draw` (which uses the
    // same at-rest 0.2 dressing phase) exactly.
    pose.emberRise = (0.2 + t / 2.6) % 1;
    pose.steamDrift = (0.2 + t / 3.4) % 1;
    // a gentle always-on flame flicker on top of the action flame (additive,
    // never strobes the body) so the fire always reads as living. Built from
    // (1-cos) terms → value AND velocity are 0 at t=0, so anim(0).flame === 0
    // (matching `draw`'s REST flame) and the flicker grows in seamlessly.
    const idleFlicker = 0.12 * (1 - Math.cos(t * 2.3)) * 0.5 + 0.08 * (1 - Math.cos(t * 3.7)) * 0.5;
    pose.flame = clamp01(pose.flame + idleFlicker);
    paint(ctx, SP[season], pose);
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
// EXACTLY (both drawn at REST with the same at-rest sparks/steam dressing). The
// plumage VOLUME leads (coat fluffs early); snow / frost / steam / scarf LAG.
function makeTransition(fromIdx: 0 | 1 | 2) {
  const from = SEASON_NAMES[fromIdx];
  const to = SEASON_NAMES[fromIdx + 1];
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const p = clamp01(safeNum(pp, 0));
    const kBase = smoother(p);
    const kCoat = biasedEase(p, 0.62); // plumage volume LEADS
    const kSnow = biasedEase(p, 1.7); // snow / frost / steam / scarf LAG

    const a = SP[from];
    const b = SP[to];
    const blended: P = lerpP(a, b, kBase);
    blended.plumageVolume = lerp(a.plumageVolume, b.plumageVolume, kCoat);
    blended.backSnowAmt = lerp(a.backSnowAmt, b.backSnowAmt, kSnow);
    blended.frostAmt = lerp(a.frostAmt, b.frostAmt, kSnow);
    blended.breathFogAmt = lerp(a.breathFogAmt, b.breathFogAmt, kSnow);
    blended.scarfAmt = lerp(a.scarfAmt, b.scarfAmt, kSnow);
    blended.hollyAmt = lerp(a.hollyAmt, b.hollyAmt, kSnow); // holly LAGs like the scarf

    // at-rest dressing for sparks/steam so transition(0)===draw(from) and
    // transition(1)===draw(to) (both use the same at-rest 0.2 phases).
    paint(ctx, blended, { ...REST, emberRise: 0.2, steamDrift: 0.2 });

    // Transient overlays (strength ∝ sin(π·p): exactly 0 at both ends).
    const trans = Math.sin(Math.PI * p);
    if (trans <= 0.0008) return;

    ctx.save();
    try {
      const bx = -2;
      const by = 4;

      // Loose fluff motes lifting off the thickening plumage — reads the coat
      // visibly fluffing/growing. Present in EVERY morph (deterministic in p).
      const fluff = trans * (0.4 + 0.6 * Math.max(0, b.plumageVolume - a.plumageVolume + 0.4));
      if (fluff > 0.01) {
        ctx.fillStyle = rgba([255, 220, 150], 0.45 * fluff);
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

      // A steam puff appearing as the cold sets in (target gains steam/fog).
      const fogGain = Math.max(0, b.breathFogAmt - a.breathFogAmt);
      if (fogGain > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = rgba([235, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(bx + 2, by - 12 - trans * 3, 2.8 + trans * 1.8, 3.4 + trans * 2.0, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
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
