// Production seasonal art for the BIRD TURKEY board tile (`tile_bird_turkey`) —
// the approved bold direction, mirroring the HERD SHEEP reference pattern. A
// single parameterized `paint(ctx, p, pose)` + four `P` presets + lerped
// transitions, pushed so the seasons read at a glance and the idle is a real,
// fun ACTION (a peck and a gobble-strut) rather than a subtle breath.
//
// PALETTE LOCK: it is ALWAYS the same plump bronze turkey — a small head with a
// RED wattle/snood at the throat, a dark bronze-brown iridescent body, and a
// big fanned tail of layered feathers spread behind it. Its SILHOUETTE (body +
// fanned tail) is IDENTICAL every season. Seasons change only the plumage
// VOLUME / iridescence, the pad colour, the light wash, and BOLD dressing —
// snow on the back + tail, a little winter SCARF, a breath-fog puff, a blossom,
// a fallen leaf, frost. The turkey's identity colours never change; the
// silhouette outline family is the same for every `P` (only volume scales it).
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~0.95s): a PECK — the head dips ~12px then bobs up with a
//     small body squash and a tail-fan twitch.
//   • RARE  ~18s (win ~1.2s, phase +3s): a GOBBLE-STRUT / TAIL-FAN FLOURISH —
//     the turkey puffs up, fans the tail wider, throws the head with a wattle
//     wobble and a little hop (~16px of motion). Anticipation → flourish →
//     settle; may lift OUTSIDE the −24..+24 design box at the apex.
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
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

// coerce a possibly non-finite scalar to a finite default (guards wild t/p)
function safeNum(x: number, fallback = 0): number {
  return Number.isFinite(x) ? x : fallback;
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

// Anticipation→action shape for the HOP of the gobble-strut: a brief crouch
// (negative) before the rise, then a clean arc up and settle. q∈[0,1]. Returns
// a LIFT factor in roughly −0.18..+1 (negative = squash-down crouch, positive =
// airborne).
function hopShape(q: number): number {
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
  lift: number; // whole-body vertical lift (design px, + = up). Hop uses this.
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  headBob: number; // extra head dip (design px, + = down) for the peck
  headThrow: number; // extra head raise (design px, + = up) for the gobble
  peck: number; // 0..1 beak-open amount during the peck
  wattle: number; // signed wattle wobble (design px sideways) for the gobble
  fan: number; // extra tail-fan spread (radians) — twitch / flourish
  fogPuff: number; // 0..1 extra breath-fog reach (winter exhale)
}

const REST: Pose = {
  lift: 0,
  squashX: 1,
  squashY: 1,
  headBob: 0,
  headThrow: 0,
  peck: 0,
  wattle: 0,
  fan: 0,
  fogPuff: 0,
};

// Build a pose from the wall clock: a common PECK every ~6s and a rare
// GOBBLE-STRUT every ~18s. Returns to REST (all zeros / unit scales) at every
// window edge.
function poseFromClock(tIn: number): Pose {
  const t = safeNum(tIn, 0);
  const pose: Pose = {
    lift: 0,
    squashX: 1,
    squashY: 1,
    headBob: 0,
    headThrow: 0,
    peck: 0,
    wattle: 0,
    fan: 0,
    fogPuff: 0,
  };

  // COMMON ~6s: PECK (win ~0.95s). Head dips ~12px then bobs up, beak opens,
  // small body squash, a tail-fan twitch. Built from raised-cosine windows →
  // seamless. Phase 3.0 opens the window at t≈3.0 (well clear of t=0, so
  // anim(0) sits exactly at REST).
  const cq = actionQ(t, 6, 0.95, 3.0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window
    // two quick pecks within the window (head dips down ~12px at the peaks)
    const dip = Math.abs(Math.sin(cq * Math.PI * 2));
    pose.headBob = env * (4.0 + 8.0 * dip);
    pose.peck = env * dip;
    pose.fan = env * 0.05; // small fan twitch
    // tiny body squash as it leans down to peck
    pose.squashY = 1 - env * 0.06;
    pose.squashX = 1 + env * 0.05;
    pose.fogPuff = env; // winter: an exhale puff as it pecks
  }

  // RARE ~18s: GOBBLE-STRUT / TAIL-FAN FLOURISH (win ~1.2s). The turkey puffs
  // up, fans the tail wider, throws the head with a wattle wobble and a little
  // hop (~16px). Anticipation → flourish → settle. May lift OUTSIDE the box.
  const hq = actionQ(t, 18, 1.2, 4.0);
  if (hq >= 0) {
    const env = bump(hq); // 0→1→0 over the window
    const s = hopShape(hq); // −0.18..+1 (crouch then arc)
    pose.lift = Math.max(0, s) * 16; // up to ~16px airborne
    if (s < 0) {
      // anticipation crouch: squash down/wide as it puffs up
      const c = -s; // 0..0.18
      pose.squashY = 1 - c * 0.8;
      pose.squashX = 1 + c * 0.9;
    } else {
      // flourish: puff TALL and a touch wide (chest out), peak at apex
      pose.squashY = 1 + s * 0.16;
      pose.squashX = 1 + s * 0.1;
    }
    // throw the head up + back during the flourish
    pose.headThrow += env * 5.0;
    // wattle wobbles side-to-side as it gobbles
    pose.wattle += Math.sin(hq * Math.PI * 5) * env * 2.4;
    // FAN the tail wider during the flourish
    pose.fan += env * 0.22;
    pose.fogPuff = Math.max(pose.fogPuff, env); // a big winter exhale
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────

interface P {
  bodyLight: RGB; // lit top of the bronze body
  bodyMid: RGB; // body tone
  bodyDark: RGB; // shaded underside / breast
  sheen: RGB; // iridescent sheen tint on the body + tail
  tailLight: RGB; // lit band of the fanned tail feathers
  tailMid: RGB; // mid band of the tail
  tailDark: RGB; // base / dark band of the tail
  tailTip: RGB; // pale feather-tip band of the fan
  wattleColor: RGB; // red wattle/snood at the throat (LOCKED red)
  beak: RGB; // small horn beak
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  irid: number; // 0..1 iridescent sheen strength (peak in summer)
  plumage: number; // 0..1 BOLD plumage volume (sleek spring → fluffed winter)
  frostAmt: number; // 0..1 frost sparkle on the feathers
  backSnowAmt: number; // 0..1 snow settled on its back + tail
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 a blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad (autumn)
  breathFogAmt: number; // 0..1 breath puff at the beak (winter)
  scarfAmt: number; // 0..1 a little winter SCARF (tweened alpha)
  scarfColor: RGB; // scarf colour (locked red, fades in via alpha)
}

// Four BOLD season presets. The turkey stays the SAME bronze, red-wattled,
// fan-tailed bird; only plumage volume + iridescence + pad + light + dressing
// differ — pushed HARD so each season reads at a glance.
const SP: Record<SeasonName, P> = {
  // Spring — sleeker plumage, dewy lime pad + blossom, cool-bright light.
  Spring: {
    bodyLight: [150, 104, 54],
    bodyMid: [108, 70, 36],
    bodyDark: [66, 42, 24],
    sheen: [120, 140, 96],
    tailLight: [168, 122, 66],
    tailMid: [120, 80, 42],
    tailDark: [74, 48, 26],
    tailTip: [222, 196, 150],
    wattleColor: [204, 52, 46],
    beak: [206, 170, 96],
    padGrass: [128, 210, 84], // bright lime dewy grass
    soil: [86, 132, 54],
    outline: [44, 28, 18],
    lightWash: [210, 240, 255], // cool-bright
    lightWashAmt: 0.2,
    irid: 0.32,
    plumage: 0.08, // BOLD: clearly sleeker, trimmer coat
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.9,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [210, 158, 44], // mustard knit (per-species winter accessory)
  },
  // Summer — richest iridescent bronze (PEAK), fan proud, saturated mid-green
  // pad, bright warm light.
  Summer: {
    bodyLight: [178, 120, 58],
    bodyMid: [128, 78, 36],
    bodyDark: [76, 44, 22],
    sheen: [96, 168, 132], // strong green-gold iridescence
    tailLight: [192, 138, 70],
    tailMid: [134, 86, 42],
    tailDark: [82, 50, 26],
    tailTip: [236, 210, 158],
    wattleColor: [214, 44, 40],
    beak: [214, 176, 98],
    padGrass: [82, 174, 60], // saturated mid-green
    soil: [54, 112, 38],
    outline: [46, 28, 16],
    lightWash: [255, 240, 188], // bright warm
    lightWashAmt: 0.2,
    irid: 1.0, // PEAK sheen
    plumage: 0.5, // full glossy plumage
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [210, 158, 44], // mustard knit (per-species winter accessory)
  },
  // Autumn — warm bronze-tinted plumage (turkeys read very autumnal — lean in),
  // olive-tan browning pad, a fallen leaf, dulled gloss, low amber light.
  Autumn: {
    bodyLight: [180, 116, 50],
    bodyMid: [132, 76, 32],
    bodyDark: [78, 44, 20],
    sheen: [156, 122, 64], // warm gold sheen, dulled
    tailLight: [198, 132, 58],
    tailMid: [138, 84, 38],
    tailDark: [84, 50, 24],
    tailTip: [232, 196, 130],
    wattleColor: [200, 48, 42],
    beak: [206, 168, 92],
    padGrass: [160, 138, 70], // olive-tan
    soil: [104, 82, 42],
    outline: [48, 30, 18],
    lightWash: [255, 192, 110], // low amber, BOLD
    lightWashAmt: 0.32,
    irid: 0.42, // dulled gloss
    plumage: 0.74, // thicker bronze plumage
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.95,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [210, 158, 44], // mustard knit (per-species winter accessory)
  },
  // Winter — FLUFFED puffy plumage, snow on back + tail, a little winter SCARF,
  // breath-fog, frost; snowy pad, cool blue-grey light. The bronze stays
  // clearly visible underneath — still the same turkey.
  Winter: {
    bodyLight: [142, 100, 56],
    bodyMid: [104, 70, 40],
    bodyDark: [66, 44, 30],
    sheen: [120, 140, 150],
    tailLight: [160, 120, 70],
    tailMid: [116, 82, 48],
    tailDark: [74, 50, 32],
    tailTip: [226, 214, 196],
    wattleColor: [196, 56, 54],
    beak: [200, 172, 116],
    padGrass: [224, 234, 246], // snow on the pad
    soil: [150, 168, 190],
    outline: [54, 42, 38],
    lightWash: [196, 216, 250], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    irid: 0.26,
    plumage: 1, // BOLD: extra-puffed fluffy feathers
    frostAmt: 0.85,
    backSnowAmt: 0.9,
    padSnowAmt: 0.95,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.85,
    scarfAmt: 1, // a little scarf appears in winter
    scarfColor: [210, 158, 44], // mustard knit (per-species winter accessory)
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    bodyLight: lerpRGB(a.bodyLight, b.bodyLight, t),
    bodyMid: lerpRGB(a.bodyMid, b.bodyMid, t),
    bodyDark: lerpRGB(a.bodyDark, b.bodyDark, t),
    sheen: lerpRGB(a.sheen, b.sheen, t),
    tailLight: lerpRGB(a.tailLight, b.tailLight, t),
    tailMid: lerpRGB(a.tailMid, b.tailMid, t),
    tailDark: lerpRGB(a.tailDark, b.tailDark, t),
    tailTip: lerpRGB(a.tailTip, b.tailTip, t),
    wattleColor: lerpRGB(a.wattleColor, b.wattleColor, t),
    beak: lerpRGB(a.beak, b.beak, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    irid: lerp(a.irid, b.irid, t),
    plumage: lerp(a.plumage, b.plumage, t),
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
    irid: clamp01(p.irid),
    plumage: clamp01(p.plumage),
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

// the low flat grass pad the turkey stands on
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

// one leg: a short pink-horn cylinder with a three-toed foot at the base
function paintLeg(ctx: CanvasRenderingContext2D, x: number, topY: number, baseY: number): void {
  ctx.strokeStyle = rgb([196, 132, 96]);
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // simple three-toed foot
  ctx.strokeStyle = rgb([176, 116, 84]);
  ctx.lineWidth = 1.6;
  for (const dx of [-2, 0, 2]) {
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + dx, baseY + 1.6);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

// The big fanned tail of layered feathers spread BEHIND the body. The fan SHAPE
// is constant every season; only colours + plumage volume (slightly wider
// spread) change. `fanSpread` is an additive idle tweak (twitch / flourish).
function paintTailFan(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number, fanSpread: number): void {
  const feathers = 11;
  const half = (feathers - 1) / 2;
  // plumage volume widens the arc & lengthens the feathers (constant family)
  const arc = Math.PI * 0.96 * (1 + p.plumage * 0.08) + fanSpread;
  const len = 18.5 + p.plumage * 1.6;
  // dark outline halo behind the whole fan
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(cx, cy, len * 0.92, len * 0.84, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < feathers; i++) {
    const f = (i - half) / half; // −1..+1
    const ang = -Math.PI / 2 + f * (arc / 2); // fan upward, centered overhead-rear
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang + Math.PI / 2);
    const fl = len; // feather length along its own axis
    // one feather: dark base → mid → pale tip band (layered dark-then-light)
    ctx.fillStyle = rgb(p.tailDark);
    ctx.beginPath();
    ctx.ellipse(0, -fl * 0.5, 2.6, fl * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // mid band
    ctx.fillStyle = rgb(p.tailMid);
    ctx.beginPath();
    ctx.ellipse(0, -fl * 0.56, 2.0, fl * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    // lit band (light from upper-left → feathers on the left read brighter)
    ctx.fillStyle = rgb(p.tailLight, 0.92);
    ctx.beginPath();
    ctx.ellipse(-0.4, -fl * 0.62, 1.4, fl * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    // pale feather tip
    ctx.fillStyle = rgb(p.tailTip);
    ctx.beginPath();
    ctx.ellipse(0, -fl * 0.9, 1.8, 2.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // iridescent sheen sweeping the fan (subtle band of colour-of-light)
  if (p.irid > 0.001) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = rgb(p.sheen, 0.18 + 0.3 * p.irid);
    ctx.beginPath();
    ctx.ellipse(cx, cy - len * 0.42, len * 0.7, len * 0.36, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // snow settled on the upward fan edge (winter) — BOLD
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgb([248, 252, 255], 0.9 * p.backSnowAmt);
    for (let i = 0; i < feathers; i += 2) {
      const f = (i - half) / half;
      const ang = -Math.PI / 2 + f * (arc / 2);
      const tipX = cx + Math.cos(ang) * len;
      const tipY = cy + Math.sin(ang) * len * 0.9;
      ctx.beginPath();
      ctx.ellipse(tipX, tipY, 2.2, 1.5, ang, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// the whole turkey, standing front-¾ turned toward lower-left, posed by `pose`
function paintTurkey(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  // legs stay PLANTED on the pad (they stretch, not lift, during the hop).
  const bx = 1;
  const bodyY = 6 - pose.lift; // body centre lifts during the gobble-strut hop
  const legTop = bodyY + 5; // where the legs meet the body

  // ── Fanned tail BEHIND the body — drawn first ───────────────────────────────
  // tail anchor rides with the body lift; fan spread = season + idle twitch
  paintTailFan(ctx, p, bx + 4, bodyY - 3, pose.fan);

  // legs (in front of the tail, behind/under the body). Contact on the pad.
  paintLeg(ctx, bx - 2.5, legTop, 19.4);
  paintLeg(ctx, bx + 3.5, legTop, 19.2);

  // The whole upper body (body + head + dressing) is drawn under a
  // squash/stretch transform centred on the body, so the hop reads with
  // anticipation squash + airborne stretch.
  ctx.save();
  ctx.translate(bx, bodyY);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-bx, -bodyY);

  const by = bodyY;

  // ── Plump bronze BODY — dark outline pass, then mid, then lit (layered) ─────
  // plumage volume puffs the body outline (winter fluffs it BOLDLY)
  const vol = 1 + p.plumage * 0.16;
  const rx = 12.5 * vol;
  const ry = 10.5 * vol;
  // outline halo
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(bx, by, rx + 1.2, ry + 1.2, -0.12, 0, Math.PI * 2);
  ctx.fill();
  // shaded body
  ctx.fillStyle = rgb(p.bodyDark);
  ctx.beginPath();
  ctx.ellipse(bx, by, rx, ry, -0.12, 0, Math.PI * 2);
  ctx.fill();
  // mid body offset up-left
  ctx.fillStyle = rgb(p.bodyMid);
  ctx.beginPath();
  ctx.ellipse(bx - 1, by - 1, rx * 0.9, ry * 0.88, -0.12, 0, Math.PI * 2);
  ctx.fill();
  // lit breast/back, light from upper-left
  ctx.fillStyle = rgb(p.bodyLight);
  ctx.beginPath();
  ctx.ellipse(bx - 3, by - 3, rx * 0.6, ry * 0.58, -0.12, 0, Math.PI * 2);
  ctx.fill();

  // plumage fluff: soft feather lumps around the lower body outline, bigger
  // with volume (winter reads clearly puffy)
  if (p.plumage > 0.001) {
    ctx.fillStyle = rgb(p.bodyMid, 0.9);
    const lumps = 8;
    for (let i = 0; i < lumps; i++) {
      const a = Math.PI * 0.15 + (i / (lumps - 1)) * Math.PI * 1.0; // lower arc
      const lx = bx + Math.cos(a) * rx * 0.98;
      const ly = by + Math.sin(a) * ry * 0.98;
      ctx.beginPath();
      ctx.arc(lx, ly, 1.4 + p.plumage * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // iridescent sheen on the body (a curved band of colour-of-light)
  if (p.irid > 0.001) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = rgb(p.sheen, 0.2 + 0.34 * p.irid);
    ctx.beginPath();
    ctx.ellipse(bx - 2, by - 1, rx * 0.66, ry * 0.6, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // a soft wing crease on the flank
  ctx.strokeStyle = rgb(p.bodyDark, 0.6);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(bx + 6, by - 3);
  ctx.quadraticCurveTo(bx + 9, by + 2, bx + 5, by + 7);
  ctx.stroke();

  // snow settled on the back (winter) — BOLD cap
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgb([248, 252, 255], 0.95 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 1, by - ry * 0.72, rx * 0.62, 3.0, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb([255, 255, 255], 0.9 * p.backSnowAmt);
    for (const [dx, dy] of [[-5, -8], [1, -8.6], [6, -7.4]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.4 + p.plumage * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the feathers (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([255, 255, 255], 0.85 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-7, -2], [-2, 3], [3, -1], [7, 3], [0, -4], [-4, -5], [5, 5],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── HEAD + NECK (front-¾, lower-left) — small head + RED wattle locks ID ─────
  // peck dips the head DOWN; gobble throws it UP — combine into one offset.
  const headY = -pose.headBob + pose.headThrow; // + = up, − = down
  const nx = bx - 9; // neck base on the upper-left breast
  const ny = by - 5 - headY * 0.35;
  const hx = nx - 4.5; // small head, up and to the left
  const hy = ny - 7.5 - headY * 0.65 + pose.headBob; // peck dips head furthest

  // neck — a slim bronze S from the breast up to the small head
  ctx.strokeStyle = rgb(p.outline);
  ctx.lineWidth = 5.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(nx, ny);
  ctx.quadraticCurveTo(nx - 4, ny - 4, hx, hy + 1.5);
  ctx.stroke();
  ctx.strokeStyle = rgb(p.bodyMid);
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.moveTo(nx, ny);
  ctx.quadraticCurveTo(nx - 4, ny - 4, hx, hy + 1.5);
  ctx.stroke();
  // lit neck highlight
  ctx.strokeStyle = rgb(p.bodyLight, 0.7);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(nx - 1.4, ny - 1);
  ctx.quadraticCurveTo(nx - 5, ny - 4.5, hx - 1, hy + 1.5);
  ctx.stroke();
  ctx.lineCap = "butt";

  // RED wattle/snood at the throat — a small dewlap hanging at the neck base.
  // wobbles sideways during the gobble. LOCKED red every season.
  const ww = pose.wattle;
  ctx.fillStyle = rgb(p.wattleColor);
  ctx.beginPath();
  ctx.ellipse(nx - 2.2 + ww, ny - 1.5, 2.2, 3.4, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(nx - 3.4 + ww * 1.3, ny + 1.5, 1.5, 2.2, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // wattle shading
  ctx.fillStyle = rgb([150, 30, 28], 0.5);
  ctx.beginPath();
  ctx.ellipse(nx - 1.6 + ww, ny + 0.4, 1.1, 2.4, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // ── SCARF (winter) — a little knitted band around the neck, below the head ──
  if (p.scarfAmt > 0.001) {
    const sx = nx - 1.0;
    const sy = ny - 1.0;
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // wrap band around the neck
    ctx.fillStyle = rgb(p.scarfColor);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 4.6, 2.6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // darker underside for depth
    ctx.fillStyle = rgb([
      Math.max(0, p.scarfColor[0] - 50),
      Math.max(0, p.scarfColor[1] - 30),
      Math.max(0, p.scarfColor[2] - 30),
    ]);
    ctx.beginPath();
    ctx.ellipse(sx + 0.4, sy + 1.2, 4.2, 1.4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // hanging tail of the scarf with a knitted notch
    ctx.fillStyle = rgb(p.scarfColor);
    ctx.beginPath();
    ctx.moveTo(sx + 1.8, sy + 1.0);
    ctx.lineTo(sx + 4.6, sy + 1.8);
    ctx.lineTo(sx + 3.8, sy + 7.4);
    ctx.lineTo(sx + 0.8, sy + 6.6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgb([
      Math.max(0, p.scarfColor[0] - 60),
      Math.max(0, p.scarfColor[1] - 40),
      Math.max(0, p.scarfColor[2] - 40),
    ]);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sx + 2.6, sy + 2.4);
    ctx.lineTo(sx + 2.2, sy + 6.8);
    ctx.stroke();
    // fringe at the bottom
    ctx.strokeStyle = rgb(p.scarfColor);
    ctx.lineWidth = 0.9;
    ctx.lineCap = "round";
    for (const fx of [1.2, 2.4, 3.6]) {
      ctx.beginPath();
      ctx.moveTo(sx + fx, sy + 6.8);
      ctx.lineTo(sx + fx - 0.2, sy + 8.4);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.restore();
  }

  // small HEAD — a little bronze-pink dome
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 3.6, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb([198, 142, 108]); // small bare head (pinkish horn)
  ctx.beginPath();
  ctx.ellipse(hx, hy, 3.0, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  // cheek light
  ctx.fillStyle = rgb([255, 255, 255], 0.18);
  ctx.beginPath();
  ctx.ellipse(hx - 1, hy - 1, 1.3, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // snood draping over the beak (red) — wobbles with the gobble
  ctx.fillStyle = rgb(p.wattleColor);
  ctx.beginPath();
  ctx.moveTo(hx - 2.6, hy - 1.2);
  ctx.quadraticCurveTo(hx - 5.2 + ww * 0.6, hy + 0.5, hx - 4.4 + ww, hy + 3.2);
  ctx.quadraticCurveTo(hx - 3.4, hy + 1.2, hx - 2.2, hy + 0.6);
  ctx.closePath();
  ctx.fill();

  // beak — a small horn triangle pointing lower-left; opens during the peck
  ctx.fillStyle = rgb(p.beak);
  ctx.beginPath();
  ctx.moveTo(hx - 2.6, hy + 0.2 - pose.peck * 1.0);
  ctx.lineTo(hx - 5.6, hy + 1.4);
  ctx.lineTo(hx - 2.4, hy + 2.2 + pose.peck * 1.0);
  ctx.closePath();
  ctx.fill();

  // eye
  ctx.fillStyle = rgb([245, 245, 240]);
  ctx.beginPath();
  ctx.arc(hx - 0.6, hy - 0.4, 1.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb([18, 16, 18]);
  ctx.beginPath();
  ctx.arc(hx - 0.7, hy - 0.3, 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // end squash/stretch transform

  // breath-fog puff at the beak (winter) — drawn OUTSIDE the squash transform so
  // it reads as air, not body. Static base puff + an exhale swell during idle.
  if (p.breathFogAmt > 0.001) {
    // recompute the beak tip in untransformed space (squash is ~unit at rest)
    const fhx = bx - 13.5;
    const fhy = bodyY - 12.5 - headY * 0.65 + pose.headBob;
    const reach = 4.2 + pose.fogPuff * 3.4;
    ctx.fillStyle = rgb([235, 244, 255], (0.34 + 0.28 * pose.fogPuff) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(fhx - reach, fhy + 2.0, 3.0 + pose.fogPuff * 2.0, 2.0 + pose.fogPuff * 1.4, 0.1, 0, Math.PI * 2);
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
    paintTurkey(ctx, p, pose);
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
    const p = clamp01(safeNum(pp, 0));
    const kBase = smoother(p);
    const kCoat = biasedEase(p, 0.62); // plumage volume LEADS
    const kSnow = biasedEase(p, 1.7); // snow / frost / fog / scarf LAG

    const a = SP[from];
    const b = SP[to];
    const blended: P = lerpP(a, b, kBase);
    blended.plumage = lerp(a.plumage, b.plumage, kCoat);
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
      const bx = 1;
      const by = 6;

      // Loose feather motes lifting off the thickening plumage — reads the coat
      // visibly fluffing/growing. Present in EVERY morph (deterministic in p).
      const fluff = trans * (0.4 + 0.6 * Math.max(0, b.plumage - a.plumage + 0.4));
      if (fluff > 0.01) {
        ctx.fillStyle = rgb([236, 220, 196], 0.5 * fluff);
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
        ctx.fillStyle = rgb([255, 255, 255], 0.8 * trans * snowGain);
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
        const hx = bx - 13.5;
        const hy = by - 12.5;
        ctx.fillStyle = rgb([235, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(hx - (4 + trans * 3), hy + 2.0, 2.6 + trans * 1.8, 1.8 + trans * 1.2, 0.1, 0, Math.PI * 2);
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
