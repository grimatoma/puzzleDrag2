// Production seasonal art for the HERD BOAR board tile (`tile_herd_boar`) — the
// approved bold direction, mirroring the herd SHEEP reference pattern. A single
// parameterized `paint(ctx, p, pose)` + four `P` presets + lerped transitions,
// pushed so the seasons read at a glance and the idle is a real, fun ACTION
// rather than a subtle breath.
//
// PALETTE LOCK: it is ALWAYS the same dark, bristly WILD BOAR — a muscular dark
// grey-brown hump-backed body, a stiff ridge of bristles down the spine, a long
// snout, upright pointed ears, two prominent curved WHITE tusks, small dark
// eyes, sturdy legs. The colour + silhouette are CONSTANT every season; the
// signature tusks + bristly mane never change. Seasons change only the coat
// VOLUME (sleek spring → SHAGGY thick winter), the pad colour, the light wash,
// and BOLD dressing — snow on the back, a little winter SCARF, a breath-fog
// puff (snorting steam), blossom, a fallen leaf, frost. The animal's identity
// colours never change; the silhouette outline is identical for every `P`
// (only volume scales it). The tusks stay bright all year.
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~1.0s): a calm SNUFFLE / BREATH — the body breathes
//     gently (~3px), the snout dips to snuffle the ground, the near ear flicks
//     and the tail gives a lazy wag, a soft breath puffs. Deliberately QUIET —
//     no lunge, no big swing — so it reads as the resting tier.
//   • RARE  ~18s (win ~1.25s, phase +3s): a bold TUSK-GORE LUNGE — the boar
//     drops its head (anticipation crouch), then surges FORWARD + UP tusks-first
//     in a quick gore (the whole body lunges toward lower-left ~10px and rises
//     ~12px as the head throws up so the TUSKS lead the strike), then recovers
//     to rest. Clearly BOLDER than the snuffle so the two-tier lands. The tusks
//     may sweep OUTSIDE the −24..+24 design box at the apex (fine).
// Both gestures return to REST with zero value AND zero velocity at the window
// edges (raised-cosine windows), so `anim(…, t)` is seamless and `anim(…, 0)`
// (and `draw`) sit exactly at rest.
//
// Origin-centered in the −24..+24 design box, light from upper-left. The boar
// stands front-¾ turned ~15–20° toward lower-left. Deterministic in `t`
// (seconds). Never throws; clamps every scalar; save/restore + globalAlpha
// reset.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Small math helpers ──────────────────────────────────────────────────────

type RGB = [number, number, number];

function clamp01(x: number): number {
  return x < 0 || Number.isNaN(x) ? 0 : x > 1 ? 1 : x;
}

// guard a single scalar against NaN / ±Infinity (used on `t` and `p` inputs)
function safeNum(x: number): number {
  return Number.isFinite(x) ? x : 0;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function rgb(c: RGB, a = 1): string {
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

// Anticipation→strike shape for the TUSK-GORE LUNGE: a deeper, slower head-drop
// crouch (negative) to load the strike, then a fast forward+up GORE arc and a
// settle. q∈[0,1]. Returns a GORE factor in roughly −0.32..+1 (negative =
// head dropped / coiled anticipation, positive = the tusks driven forward-up).
// The strike peak is biased early (a quick jab), with a longer recovery tail.
// Zero value AND zero slope at both ends (seamless window edges).
function goreShape(q: number): number {
  if (q <= 0 || q >= 1) return 0;
  const antiEnd = 0.34; // longer load: the boar coils & drops its head
  if (q < antiEnd) {
    // drop/coil down (anticipation), zero slope at q=0 — deeper than the old toss
    const a = q / antiEnd;
    return -0.32 * (0.5 - 0.5 * Math.cos(a * Math.PI));
  }
  // the gore: a quick forward strike that peaks early then recovers. Built from
  // sin(a·π) skewed by an ease so the rise is fast and the fall is slower; zero
  // at the seam to the crouch and at q=1.
  const a = (q - antiEnd) / (1 - antiEnd); // 0..1 across the strike
  const skew = a < 0.34 ? a / 0.34 * 0.5 : 0.5 + ((a - 0.34) / 0.66) * 0.5; // fast in, slow out
  return Math.sin(skew * Math.PI);
}

// ── The idle POSE (carries all action state into paint) ──────────────────────

interface Pose {
  bob: number; // whole-body vertical bob (design px, + = up)
  lean: number; // signed forward lunge (design px, + = toward lower-left)
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  head: number; // signed head pivot (radians; + = tusks thrown up/forward, − = snout dips down to snuffle)
  chew: number; // 0..1 mouth/snuffle open amount
  ear: number; // 0..1 near-ear flick amount
  tail: number; // signed tail wag (design px)
  hop: number; // 0..1 forward-stamp / gore-drive amount (rare lunge)
  snort: number; // 0..1 extra breath-puff reach (snuffle exhale / gore snort)
}

const REST: Pose = {
  bob: 0,
  lean: 0,
  squashX: 1,
  squashY: 1,
  head: 0,
  chew: 0,
  ear: 0,
  tail: 0,
  hop: 0,
  snort: 0,
};

// Build a pose from the wall clock: a calm SNUFFLE every ~6s and a bold
// TUSK-GORE LUNGE every ~18s. Returns to REST (all zeros / unit scales) at
// every window edge.
function poseFromClock(tIn: number): Pose {
  const t = safeNum(tIn);
  const pose: Pose = {
    bob: 0,
    lean: 0,
    squashX: 1,
    squashY: 1,
    head: 0,
    chew: 0,
    ear: 0,
    tail: 0,
    hop: 0,
    snort: 0,
  };

  // COMMON ~6s: a calm SNUFFLE / BREATH (win ~1.0s). The body breathes gently
  // (~3px), the snout dips a little to snuffle the ground, the near ear flicks
  // and the tail gives a lazy wag, a soft breath puffs. Deliberately QUIET — no
  // lunge, small displacements — so it reads clearly below the rare. Built from
  // raised-cosine windows → seamless. Phase 3.0 opens it at t≈3.0 (clear of t=0,
  // so anim(0) sits exactly at REST).
  const cq = actionQ(t, 6, 1.0, 3.0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window (zero value+slope at edges)
    // Everything is gated by `env`, so each value AND its velocity is zero at
    // both window edges — seamless. The detail terms (snuffle/wag chatter) are
    // multiplied INTO env, never added, so they never leak velocity at the rim.
    pose.bob = env * 1.2; // ribs rise a touch on the breath (small, calm)
    pose.head = -env * (0.10 + 0.04 * Math.abs(Math.sin(cq * Math.PI * 2))); // snout dips to snuffle
    pose.chew = env * 0.35 * (0.6 + 0.4 * Math.abs(Math.sin(cq * Math.PI * 3))); // soft snuffle
    pose.ear = env * 0.7; // a relaxed ear flick
    pose.tail = env * Math.sin(cq * Math.PI * 4) * 1.8; // a lazy wag or two
    pose.snort = env * 0.6; // a soft breath puff (cold-air exhale in winter)
    // barely-there breathing squash
    pose.squashY = 1 - env * 0.02;
    pose.squashX = 1 + env * 0.015;
  }

  // RARE ~18s: a bold TUSK-GORE LUNGE (win ~1.25s, phase +3s). The boar drops
  // its head to coil (anticipation), then surges FORWARD + UP tusks-first in a
  // quick gore (~10px lunge toward lower-left, ~12px rise as the head throws up
  // so the tusks lead), then recovers. Clearly bolder than the snuffle. The
  // tusks may sweep OUTSIDE the design box at the apex. Every contribution is
  // gated by `env` (a raised-cosine window) so value AND velocity are zero at
  // both window edges → seamless.
  const gq = actionQ(t, 18, 1.25, 3.0);
  if (gq >= 0) {
    const s = goreShape(gq); // −0.32..+1 (coil/drop then drive forward-up)
    const env = bump(gq); // raised-cosine window → zero value+slope at edges
    if (s < 0) {
      // anticipation: DROP the snout low, coil down & wide, rock weight back —
      // a clear "head drops" telegraph before the strike.
      const c = -s; // 0..0.32
      pose.head = -c * 0.85; // snout drops low (loading the gore)
      pose.bob = -c * 5; // hunker down
      pose.squashY = 1 - c * 0.7;
      pose.squashX = 1 + c * 0.5;
      pose.lean = -c * 4.5; // weight rocks back before the drive
    } else {
      // the GORE: drive FORWARD (the gore vector) and up, TUSKS-FIRST. Forward
      // lunge dominates the rise so it reads as a horizontal gore-thrust, not a
      // hop. EVERY contribution is gated by `env` (≈1 at the mid-window strike
      // peak, →0 with zero slope at the window edge) so the recovery tail
      // returns to rest with zero value AND velocity — seamless.
      const drive = s * env;
      pose.head = drive * 0.66; // tusks thrown UP/forward — the gore lead
      pose.lean = drive * 13; // big forward lunge toward lower-left (the gore)
      pose.bob = drive * 8.5; // shoulders surge up under the head as it drives
      pose.squashY = 1 + drive * 0.12; // stretch into the drive
      pose.squashX = 1 - drive * 0.07;
      pose.hop = drive; // forward stamp / gore-drive (front leg shoots out)
    }
    pose.ear = Math.max(pose.ear, env * 0.8); // ears pin back during the charge
    pose.snort = Math.max(pose.snort, env); // a hard snort on the gore
    pose.tail += env * Math.sin(gq * Math.PI * 2) * 2.4; // tail flags (env-gated → seamless)
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────

interface P {
  coatLight: RGB; // lit top of the dark coat
  coatMid: RGB; // body mid tone
  coatShadow: RGB; // shaded underside / haunch
  bristle: RGB; // the spine ridge of stiff bristles (the mane)
  snout: RGB; // snout / muzzle tone (warmer dark)
  tusk: RGB; // the white tusks (palette-locked bright)
  hoof: RGB; // dark hooves
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  coatVolume: number; // 0..1 BOLD shagginess of coat + bristle ridge
  glossAmt: number; // 0..1 sheen on the coat (peak in summer)
  frostAmt: number; // 0..1 frost sparkle on the bristles
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 a blossom on the pad
  fallenLeafAmt: number; // 0..1 a fallen leaf on the pad
  breathFogAmt: number; // 0..1 breath puff at the snout (snorting steam)
  scarfAmt: number; // 0..1 a little winter SCARF (tweened alpha)
  scarfColor: RGB; // scarf colour (locked red, fades in via alpha)
}

// Four BOLD season presets. The boar stays the SAME dark bristly white-tusked
// boar; only coat tone + VOLUME, gloss, pad, light, and dressing differ —
// pushed HARD so each season reads at a glance.
const SP: Record<SeasonName, P> = {
  // Spring — sleeker coat, cool-bright light, dewy lime pad + a blossom.
  Spring: {
    coatLight: [102, 86, 72],
    coatMid: [74, 60, 50],
    coatShadow: [48, 38, 32],
    bristle: [40, 32, 28],
    snout: [70, 54, 48],
    tusk: [248, 246, 234],
    hoof: [30, 24, 22],
    padGrass: [126, 210, 84], // vivid fresh lime
    soil: [82, 140, 50],
    outline: [30, 24, 20],
    lightWash: [200, 240, 255], // cool-bright
    lightWashAmt: 0.2,
    coatVolume: 0.18, // BOLD: clearly sleeker, just-shed spring coat
    glossAmt: 0.25,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.9,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  // Summer — glossy full dark coat (PEAK), saturated mid-green pad, bright warm.
  Summer: {
    coatLight: [112, 94, 76],
    coatMid: [80, 64, 52],
    coatShadow: [46, 36, 28],
    bristle: [38, 30, 24],
    snout: [76, 58, 48],
    tusk: [250, 248, 236],
    hoof: [28, 22, 20],
    padGrass: [78, 176, 60], // saturated mid-green
    soil: [50, 116, 38],
    outline: [28, 22, 18],
    lightWash: [255, 240, 184], // bright warm
    lightWashAmt: 0.22,
    coatVolume: 0.5, // full coat
    glossAmt: 0.95, // BOLD: glossy peak coat
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  // Autumn — warm-tinted shaggier coat, dulled gloss; olive-tan pad + a leaf.
  Autumn: {
    coatLight: [120, 90, 64],
    coatMid: [88, 62, 42],
    coatShadow: [52, 36, 24],
    bristle: [46, 32, 22],
    snout: [84, 58, 44],
    tusk: [246, 242, 226],
    hoof: [30, 22, 18],
    padGrass: [168, 138, 70], // olive-tan browning
    soil: [110, 84, 42],
    outline: [32, 24, 18],
    lightWash: [255, 186, 98], // low amber, BOLD
    lightWashAmt: 0.32,
    coatVolume: 0.8, // BOLD: warm shaggy coat
    glossAmt: 0.25, // dulled gloss
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.95,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  // Winter — SHAGGY thick coat + snow on the back + a little winter SCARF +
  // breath-fog; frost on the bristles; snowy pad; cool blue-grey light. Tusks
  // stay bright.
  Winter: {
    coatLight: [98, 90, 86],
    coatMid: [70, 62, 60],
    coatShadow: [46, 40, 40],
    bristle: [44, 40, 42],
    snout: [70, 60, 58],
    tusk: [252, 252, 244],
    hoof: [34, 28, 30],
    padGrass: [224, 236, 248], // snow on the pad
    soil: [148, 168, 192],
    outline: [40, 36, 42],
    lightWash: [192, 214, 250], // cool blue-grey, BOLD
    lightWashAmt: 0.36,
    coatVolume: 1, // BOLD: thickest, shaggiest winter coat + mane
    glossAmt: 0.1, // matte shaggy
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
    coatLight: lerpRGB(a.coatLight, b.coatLight, t),
    coatMid: lerpRGB(a.coatMid, b.coatMid, t),
    coatShadow: lerpRGB(a.coatShadow, b.coatShadow, t),
    bristle: lerpRGB(a.bristle, b.bristle, t),
    snout: lerpRGB(a.snout, b.snout, t),
    tusk: lerpRGB(a.tusk, b.tusk, t),
    hoof: lerpRGB(a.hoof, b.hoof, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    coatVolume: lerp(a.coatVolume, b.coatVolume, t),
    glossAmt: lerp(a.glossAmt, b.glossAmt, t),
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
    coatVolume: clamp01(p.coatVolume),
    glossAmt: clamp01(p.glossAmt),
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

// the low flat grass pad the boar stands on
function paintPad(ctx: CanvasRenderingContext2D, p: P): void {
  // soft contact shadow, offset to lower-right (light is upper-left)
  ctx.fillStyle = rgb([0, 0, 0], 0.18);
  ctx.beginPath();
  ctx.ellipse(3, 21, 17, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // shaded underside of the pad
  ctx.fillStyle = rgb(p.soil);
  ctx.beginPath();
  ctx.ellipse(0, 20.5, 18, 5.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // grass top
  ctx.fillStyle = rgb(p.padGrass);
  ctx.beginPath();
  ctx.ellipse(0, 19, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // tufted top edge
  ctx.strokeStyle = rgb(p.padGrass);
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
  ctx.fillStyle = rgb([255, 255, 255], 0.1);
  ctx.beginPath();
  ctx.ellipse(-5, 17.5, 9, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // snow blanket over the pad (winter) — BOLD coverage
  if (p.padSnowAmt > 0.001) {
    ctx.fillStyle = rgb([246, 251, 255], 0.92 * p.padSnowAmt);
    ctx.beginPath();
    ctx.ellipse(0, 18.4, 17.4, 4.9, 0, 0, Math.PI * 2);
    ctx.fill();
    // a few frost glints on the snow
    ctx.fillStyle = rgb([255, 255, 255], 0.8 * p.padSnowAmt);
    for (const [sx, sy] of [[-10, 19], [6, 20], [12, 18], [-2, 21]] as const) {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // a BOLD blossom (spring)
  if (p.blossomAmt > 0.001) {
    for (const [bx, by] of [[-12, 18.5], [9, 20], [0, 21], [14, 19], [-5, 20.4]] as const) {
      ctx.fillStyle = rgb([255, 244, 250], 0.95 * p.blossomAmt);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(bx + Math.cos(a) * 1.3, by + Math.sin(a) * 1.3, 1.0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = rgb([252, 208, 96], p.blossomAmt);
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
      ctx.fillStyle = rgb(col, p.fallenLeafAmt);
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.0, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgb([110, 58, 24], p.fallenLeafAmt);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-2.8, 0);
      ctx.lineTo(2.8, 0);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// one leg: a short dark sturdy cylinder with a hoof at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number, width = 3.6): void {
  ctx.strokeStyle = rgb(p.coatShadow);
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // hoof
  ctx.fillStyle = rgb(p.hoof);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 1.9, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// the boar's chunky body silhouette — a constant fierce hump-backed mass.
// `vol` modestly fattens the haunch/shoulders; the SHAPE stays the same.
function bodyPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, vol: number): void {
  const w = 14 + vol * 1.4; // half-length
  const h = 8.5 + vol * 1.2; // half-height of the trunk
  // a hump-shouldered ovoid: heavier at the front shoulders (toward lower-left)
  ctx.beginPath();
  // rear (upper-right) haunch
  ctx.moveTo(cx + w, cy + 1);
  ctx.quadraticCurveTo(cx + w + 1.5, cy - h * 0.7, cx + w * 0.45, cy - h);
  // the high shoulder hump over the front
  ctx.quadraticCurveTo(cx - w * 0.15, cy - h * 1.25, cx - w * 0.7, cy - h * 0.85);
  // down to the neck/chest (front, lower-left)
  ctx.quadraticCurveTo(cx - w * 1.05, cy - h * 0.5, cx - w * 0.98, cy + h * 0.35);
  // underbelly back toward the rear
  ctx.quadraticCurveTo(cx - w * 0.5, cy + h * 0.95, cx + w * 0.2, cy + h * 0.9);
  ctx.quadraticCurveTo(cx + w * 0.8, cy + h * 0.8, cx + w, cy + 1);
  ctx.closePath();
}

// the stiff ridge of bristles (the MANE) running along the back/spine — the
// signature identity feature. `vol` grows the ridge BOLDLY (shaggy in winter);
// `twitch` ruffles it during the idle.
function paintBristleRidge(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number, vol: number, twitch: number): void {
  const h = 8.5 + vol * 1.2;
  // ridge runs from the rear haunch up over the shoulder hump (right→left)
  const n = 12;
  ctx.strokeStyle = rgb(p.bristle);
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1); // 0 (rear) .. 1 (front hump)
    // x walks from rear haunch (right) toward the front hump (left)
    const bx = cx + lerp(13, -10, f);
    // y follows the back: dips at rear, peaks at the shoulder hump
    const back = -h - 1.4 - Math.sin(f * Math.PI) * 2.8;
    const by = cy + back;
    // each bristle stands up + slightly back; length grows BOLDLY with volume
    const len = 2.6 + vol * 4.2 + Math.sin(f * Math.PI) * 1.6;
    const sway = twitch * Math.sin(i * 1.7) * 0.9;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - 1.2 + sway, by - len);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

// the whole boar, standing front-¾ turned ~15–20° toward lower-left, posed by
// `pose`. The body squash/stretch + bob + lean come from the idle; the head
// pivots for the chew/toss; the ear flicks; the tail wags.
function paintBoar(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  const cx = 1 + pose.lean * 0.5; // lean shifts the mass toward lower-left
  const cy = 3 - pose.bob; // body centre; bob lifts it
  const vol = p.coatVolume;
  const twitch = pose.ear * Math.sin(pose.tail * 4) * 0.6 + pose.hop * 0.8; // ridge ruffle

  // ── Legs (behind the body). Sturdy; two back (right), two front (left). The
  // near-front leg STAMPS forward on the head-toss lunge. ────────────────────
  const stamp = pose.hop * 2.2;
  ctx.save();
  ctx.globalAlpha = 0.9;
  paintLeg(ctx, p, cx + 8, cy + 6, 18.6, 3.6); // far back
  paintLeg(ctx, p, cx - 3, cy + 6, 19.0, 3.6); // far front
  ctx.restore();
  paintLeg(ctx, p, cx + 10.5, cy + 6, 18.9, 3.8); // near back
  paintLeg(ctx, p, cx - 6 - stamp, cy + 6, 19.3, 3.8); // near front (stamps)

  // The whole upper body (coat + ridge + head + dressing) is drawn under a
  // squash/stretch transform centred on the body, so the toss reads with
  // anticipation squash + lunge stretch.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-cx, -cy);

  // ── BODY — dark outline pass, then mid, then a lit top (layered) ────────────
  // outline halo
  ctx.fillStyle = rgb(p.outline);
  bodyPath(ctx, cx, cy, vol + 0.35);
  ctx.fill();
  // mid coat
  ctx.fillStyle = rgb(p.coatMid);
  bodyPath(ctx, cx, cy, vol);
  ctx.fill();

  // shaded underbelly + haunch + lit top (clip to the body)
  ctx.save();
  bodyPath(ctx, cx, cy, vol);
  ctx.clip();
  ctx.fillStyle = rgb(p.coatShadow);
  ctx.beginPath();
  ctx.ellipse(cx + 2, cy + 6, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit top (light from upper-left) — over the shoulder hump
  ctx.fillStyle = rgb(p.coatLight);
  ctx.beginPath();
  ctx.ellipse(cx - 3, cy - 5, 10, 4.4, -0.25, 0, Math.PI * 2);
  ctx.fill();
  // a soft body highlight glint on the lit shoulder — strength tracks gloss
  ctx.fillStyle = rgb([255, 255, 255], 0.06 + p.glossAmt * 0.22);
  ctx.beginPath();
  ctx.ellipse(cx - 4, cy - 6, 4.5, 2.0, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // a glossy sheen streak across the back (peaks in summer)
  if (p.glossAmt > 0.001) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = rgb([255, 255, 255], 0.4 * p.glossAmt);
    ctx.beginPath();
    ctx.ellipse(cx - 1, cy - 4.5, 9, 2.4, -0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // frost sparkle worked into the coat (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([255, 255, 255], 0.75 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-8, -4], [-2, -6], [4, -3], [9, -1], [0, -2], [-5, 0], [7, 2],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(cx + fx, cy + fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // ── Bristle ridge / MANE along the spine (identity) ────────────────────────
  paintBristleRidge(ctx, p, cx, cy, vol, twitch);
  // frost dusting on the bristle tips (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([235, 246, 255], 0.7 * p.frostAmt);
    const h = 8.5 + vol * 1.2;
    for (let i = 0; i < 6; i++) {
      const f = i / 5;
      const bx = cx + lerp(11, -8, f);
      const len = 2.6 + vol * 4.2 + Math.sin(f * Math.PI) * 1.6;
      const by = cy - h - 1.4 - Math.sin(f * Math.PI) * 2.8 - len;
      ctx.beginPath();
      ctx.arc(bx - 1.2, by, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // snow settled on the back (winter) — BOLD white cap over the shoulder hump
  if (p.backSnowAmt > 0.001) {
    const h = 8.5 + vol * 1.2;
    ctx.fillStyle = rgb([248, 252, 255], 0.92 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(cx - 3, cy - h - 0.5, 9.5 * (0.9 + vol * 0.3), 3.4, -0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb([255, 255, 255], 0.9 * p.backSnowAmt);
    for (const [dx, dy] of [[-6, -1.4], [-1, -1.8], [4, -1.0], [-3, -2.2]] as const) {
      ctx.beginPath();
      ctx.arc(cx + dx, cy - h - 0.5 + dy, 1.7 + vol * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // small curly tail at the rear (upper-right) — wags via pose
  ctx.strokeStyle = rgb(p.coatShadow);
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  const tw = pose.tail * 0.5;
  ctx.moveTo(cx + 13.5, cy - 1);
  ctx.quadraticCurveTo(cx + 16.5 + tw, cy - 2, cx + 16 + tw, cy - 4);
  ctx.quadraticCurveTo(cx + 15.4 + tw, cy - 5.4, cx + 16.6 + tw, cy - 5.6);
  ctx.stroke();
  ctx.lineCap = "butt";

  // ── SCARF (winter) — a little knitted band around the neck, below the head ──
  if (p.scarfAmt > 0.001) {
    const sx = cx - 8.5;
    const sy = cy + 3.2 - pose.bob * 0.2;
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // wrap band
    ctx.fillStyle = rgb(p.scarfColor);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 5.2, 3.0, 0.28, 0, Math.PI * 2);
    ctx.fill();
    // darker underside for depth
    ctx.fillStyle = rgb([
      Math.max(0, p.scarfColor[0] - 50),
      Math.max(0, p.scarfColor[1] - 30),
      Math.max(0, p.scarfColor[2] - 30),
    ]);
    ctx.beginPath();
    ctx.ellipse(sx + 0.6, sy + 1.4, 4.8, 1.6, 0.28, 0, Math.PI * 2);
    ctx.fill();
    // hanging tail of the scarf, with a knitted notch + fringe
    ctx.fillStyle = rgb(p.scarfColor);
    ctx.beginPath();
    ctx.moveTo(sx - 2.6, sy + 1.8);
    ctx.lineTo(sx + 1.0, sy + 2.4);
    ctx.lineTo(sx + 0.2, sy + 8.0);
    ctx.lineTo(sx - 3.2, sy + 7.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgb([
      Math.max(0, p.scarfColor[0] - 60),
      Math.max(0, p.scarfColor[1] - 40),
      Math.max(0, p.scarfColor[2] - 40),
    ]);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sx - 1.4, sy + 3.2);
    ctx.lineTo(sx - 1.8, sy + 7.4);
    ctx.stroke();
    // fringe at the bottom
    ctx.strokeStyle = rgb(p.scarfColor);
    ctx.lineWidth = 0.9;
    ctx.lineCap = "round";
    for (const fx of [-3.0, -1.8, -0.6]) {
      ctx.beginPath();
      ctx.moveTo(sx + fx, sy + 7.4);
      ctx.lineTo(sx + fx - 0.2, sy + 9.0);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.restore();
  }

  // ── HEAD + long snout + TUSKS (front-¾, lower-left) — locks the identity ────
  // The head pivots about a point at the neck: +pose.head throws the snout &
  // tusks UP/forward (the gore lead), −pose.head dips the snout DOWN (snuffle).
  ctx.save();
  ctx.translate(cx - 9, cy + 1);
  ctx.rotate(-pose.head);
  const hx = 0;
  const hy = 0;

  // upright pointed ear (dark), set back on the head — flicks via pose. A
  // pointed triangular ear (boar/pig cue), with a lit front edge for crispness.
  ctx.save();
  ctx.translate(hx + 1.8, hy - 5.2);
  ctx.rotate(-0.5 - pose.ear * 0.5);
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.moveTo(-2.2, 1.6);
  ctx.quadraticCurveTo(-1.4, -3.6, 0.6, -4.4); // back edge up to the point
  ctx.quadraticCurveTo(2.2, -1.4, 2.0, 1.8); // front edge down
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgb(p.coatShadow);
  ctx.beginPath();
  ctx.moveTo(-1.5, 1.4);
  ctx.quadraticCurveTo(-0.9, -2.9, 0.5, -3.6);
  ctx.quadraticCurveTo(1.6, -1.2, 1.4, 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // head mass — outline then fill
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(hx - 1, hy - 0.5, 7.2, 6.4, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.coatMid);
  ctx.beginPath();
  ctx.ellipse(hx - 1, hy - 0.5, 6.4, 5.7, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // lit forehead/brow (light from upper-left) — gives the face form & separates
  // the head from the dark body behind it
  ctx.fillStyle = rgb(p.coatLight, 0.7);
  ctx.beginPath();
  ctx.ellipse(hx - 3.2, hy - 3.0, 3.4, 2.6, -0.35, 0, Math.PI * 2);
  ctx.fill();
  // cheek shading (lower-right of head)
  ctx.fillStyle = rgb(p.coatShadow);
  ctx.beginPath();
  ctx.ellipse(hx + 1.5, hy + 2, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // long snout reaching toward lower-left — a clean tapered MUZZLE that reads
  // crisply against the head (lit top ridge + shaded underside + a flat snout
  // disc), so the boar's long-snouted profile is unmistakable at board size.
  ctx.save();
  ctx.translate(hx - 4.5, hy + 2.5);
  ctx.rotate(0.32);
  // snout outline — a tapered wedge (narrows toward the nose disc), not a blob
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.moveTo(2.4, -3.4);
  ctx.quadraticCurveTo(-3.0, -3.7, -7.0, -2.7); // top edge tapering to the tip
  ctx.quadraticCurveTo(-9.0, -2.1, -9.2, 0); // round over the nose
  ctx.quadraticCurveTo(-9.0, 2.1, -7.0, 2.9); // under the tip
  ctx.quadraticCurveTo(-3.0, 3.8, 2.4, 3.4); // bottom edge back to the cheek
  ctx.closePath();
  ctx.fill();
  // snout fill (warm dark)
  ctx.fillStyle = rgb(p.snout);
  ctx.beginPath();
  ctx.moveTo(2.4, -2.7);
  ctx.quadraticCurveTo(-3.0, -3.0, -6.6, -2.1);
  ctx.quadraticCurveTo(-8.3, -1.6, -8.5, 0);
  ctx.quadraticCurveTo(-8.3, 1.6, -6.6, 2.3);
  ctx.quadraticCurveTo(-3.0, 3.1, 2.4, 2.7);
  ctx.closePath();
  ctx.fill();
  // lit top RIDGE of the snout (light from upper-left) — separates muzzle from head
  ctx.fillStyle = rgb(p.coatLight, 0.85);
  ctx.beginPath();
  ctx.moveTo(1.8, -2.4);
  ctx.quadraticCurveTo(-3.0, -2.7, -6.4, -1.9);
  ctx.quadraticCurveTo(-3.0, -1.5, 1.8, -1.3);
  ctx.closePath();
  ctx.fill();
  // shaded underside of the muzzle
  ctx.fillStyle = rgb(p.coatShadow, 0.6);
  ctx.beginPath();
  ctx.moveTo(1.8, 2.4);
  ctx.quadraticCurveTo(-3.0, 2.8, -6.2, 2.0);
  ctx.quadraticCurveTo(-3.0, 1.6, 1.8, 1.4);
  ctx.closePath();
  ctx.fill();
  // flat round nose disc at the tip (the boar's blunt snout plate)
  ctx.fillStyle = rgb(p.coatShadow);
  ctx.beginPath();
  ctx.ellipse(-8.4, 0, 1.9, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgb(p.outline, 0.7);
  ctx.lineWidth = 0.5;
  ctx.stroke();
  // nostrils — two clear slits on the disc
  ctx.fillStyle = rgb([16, 12, 14]);
  for (const ny of [-0.95, 0.95]) {
    ctx.beginPath();
    ctx.ellipse(-8.6, ny, 0.5, 0.85, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore(); // end snout

  // open jaw line as it chews
  if (pose.chew > 0.01) {
    ctx.strokeStyle = rgb([16, 12, 14]);
    ctx.lineWidth = 0.9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(hx - 6.5, hy + 3.6);
    ctx.lineTo(hx - 10.5, hy + 3.6 + pose.chew * 1.4);
    ctx.stroke();
    ctx.lineCap = "butt";
  }

  // ── TUSKS — two prominent curved WHITE tusks (palette-locked bright) ────────
  // The boar signature, and the key tell vs a pig/hog (which has none): two
  // THIN, sharply-pointed ivory prongs jutting from the lower jaw at the snout
  // base and curving UP & slightly OUT past the muzzle's side — NOT a fan over
  // the face. Each is a slim tapered sliver (root → fine point). A far tusk
  // sits behind (dimmer + smaller); the near tusk is bold up front.
  const drawTusk = (rootX: number, rootY: number, scale: number, alpha: number): void => {
    // tip curls up and a touch outward (lower-left). Slim: ~2px root → point.
    const tipX = rootX - 1.7 * scale;
    const tipY = rootY - 5.0 * scale;
    const ctlX = rootX - 1.9 * scale; // control bows the curve outward
    const ctlY = rootY - 2.7 * scale;
    const halfRoot = 0.95 * scale; // slim root half-width
    ctx.save();
    ctx.globalAlpha = clamp01(alpha);
    // dark outline pass (a slightly fatter sliver behind the ivory)
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.moveTo(rootX - halfRoot - 0.45, rootY + 0.5);
    ctx.quadraticCurveTo(ctlX - 0.45, ctlY, tipX, tipY); // outer edge to the point
    ctx.quadraticCurveTo(ctlX + halfRoot + 0.3, ctlY + 0.6, rootX + halfRoot + 0.45, rootY + 0.5); // inner edge back
    ctx.closePath();
    ctx.fill();
    // bright ivory tusk
    ctx.fillStyle = rgb(p.tusk);
    ctx.beginPath();
    ctx.moveTo(rootX - halfRoot, rootY + 0.3);
    ctx.quadraticCurveTo(ctlX, ctlY, tipX, tipY);
    ctx.quadraticCurveTo(ctlX + halfRoot, ctlY + 0.6, rootX + halfRoot, rootY + 0.3);
    ctx.closePath();
    ctx.fill();
    // a thin shaded edge along the inner curve for roundness
    ctx.strokeStyle = rgb([196, 190, 168], 0.7);
    ctx.lineWidth = 0.5 * scale;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(rootX + halfRoot * 0.3, rootY);
    ctx.quadraticCurveTo(ctlX + 0.5, ctlY + 0.3, tipX + 0.3 * scale, tipY + 0.6 * scale);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.restore();
  };
  // far tusk (set back & inboard, dimmer + smaller) then the bold near tusk,
  // offset so the two prongs read as a clear pair, not one mass.
  drawTusk(hx - 4.7, hy + 4.6, 0.8, 0.72);
  drawTusk(hx - 6.8, hy + 4.4, 1.0, 1.0);

  // small dark eye
  ctx.fillStyle = rgb([245, 244, 238]);
  ctx.beginPath();
  ctx.arc(hx + 0.4, hy - 1.4, 1.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb([18, 14, 16]);
  ctx.beginPath();
  ctx.arc(hx + 0.6, hy - 1.3, 0.7, 0, Math.PI * 2);
  ctx.fill();
  // tiny eye glint
  ctx.fillStyle = rgb([255, 255, 255], 0.8);
  ctx.beginPath();
  ctx.arc(hx + 0.2, hy - 1.7, 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // end head group

  ctx.restore(); // end squash/stretch transform

  // breath-fog / snort puff at the snout (winter) — drawn OUTSIDE the squash
  // transform so it reads as air, not body. Static base puff + an exhale swell
  // during the snuffle / gore snort. Snout tip sits roughly at (cx − 20, cy + 3.5).
  if (p.breathFogAmt > 0.001) {
    const reach = 5.0 + pose.snort * 3.4;
    ctx.fillStyle = rgb([235, 244, 255], (0.34 + 0.28 * pose.snort) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(cx - 20 - reach * 0.4, cy + 3.5, 3.0 + pose.snort * 2.0, 2.0 + pose.snort * 1.4, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

// the overall colour-of-light wash, painted last over the whole tile
function paintLightWash(ctx: CanvasRenderingContext2D, p: P): void {
  if (p.lightWashAmt <= 0.001) return;
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = rgb(p.lightWash, p.lightWashAmt);
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
    paintBoar(ctx, p, pose);
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
// EXACTLY (drawn at REST, matching the idle hand-off). The coat VOLUME leads
// (the coat shaggies early); snow / frost / breath-fog / scarf LAG (settle late).
function makeTransition(fromIdx: 0 | 1 | 2) {
  const from = SEASON_NAMES[fromIdx];
  const to = SEASON_NAMES[fromIdx + 1];
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const p = clamp01(safeNum(pp));
    const kBase = smoother(p);
    const kCoat = biasedEase(p, 0.62); // coat volume LEADS
    const kSnow = biasedEase(p, 1.7); // snow / frost / fog / scarf LAG

    const a = SP[from];
    const b = SP[to];
    const blended: P = lerpP(a, b, kBase);
    blended.coatVolume = lerp(a.coatVolume, b.coatVolume, kCoat);
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
      const cx = 1;
      const cy = 3;

      // Loose bristle/fur motes lifting off the thickening coat — reads the
      // coat visibly shaggying/growing. Present in EVERY morph (det. in p).
      const fluff = trans * (0.4 + 0.6 * Math.max(0, b.coatVolume - a.coatVolume + 0.4));
      if (fluff > 0.01) {
        ctx.fillStyle = rgb([210, 196, 180], 0.5 * fluff);
        const motes: Array<[number, number, number]> = [
          [-8, -9, 1.0], [3, -11, 1.2], [9, -7, 0.8], [-3, -12, 0.9],
        ];
        for (const [mx, my, mr] of motes) {
          const rise = (1 - Math.cos(Math.PI * p)) * 2.2;
          ctx.beginPath();
          ctx.arc(cx + mx, cy + my - rise, mr * (0.7 + 0.5 * trans), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Snow settling onto the back during autumn→winter (target gains snow).
      const snowGain = Math.max(0, b.backSnowAmt - a.backSnowAmt);
      if (snowGain > 0.01) {
        ctx.fillStyle = rgb([255, 255, 255], 0.8 * trans * snowGain);
        const land = smoother(p);
        const flecks: Array<[number, number]> = [
          [-6, -11], [-1, -12], [4, -10.5], [7, -9],
        ];
        for (const [fxx, fyy] of flecks) {
          const fall = (1 - land) * 6;
          ctx.beginPath();
          ctx.arc(cx + fxx, cy + fyy - fall, 1.0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // A breath-fog puff appearing as the cold sets in (target gains fog).
      const fogGain = Math.max(0, b.breathFogAmt - a.breathFogAmt);
      if (fogGain > 0.01) {
        ctx.fillStyle = rgb([235, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(cx - 20 - (2 + trans * 2), cy + 3.5, 2.6 + trans * 1.8, 1.8 + trans * 1.2, 0.1, 0, Math.PI * 2);
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
