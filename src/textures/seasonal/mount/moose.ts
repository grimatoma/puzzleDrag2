// Production seasonal art for the MOUNT MOOSE board tile (`tile_mount_moose`),
// rewritten to the approved BOLD & FUN direction and mirroring the HERD SHEEP
// reference architecture exactly: a single parameterized `paint(ctx, p, pose)`
// + four `P` presets + lerped transitions, pushed so the seasons read at a
// glance and the idle is a real, FUN ACTION rather than a subtle breath.
//
// PALETTE LOCK: it is ALWAYS the same big dark-brown moose — a bulky humped
// body, a long DROOPING snout, a DEWLAP (bell) hanging under the chin, slender
// dark legs, and broad PALMATE (flat, hand-shaped) ANTLERS. The SILHOUETTE and
// the dark-brown identity colours are constant across all four seasons. Seasons
// change only the COAT VOLUME (sleek spring → shaggy thick winter), the ANTLER
// STATE (fuzzy fresh VELVET in spring → full hard antler the rest of the year —
// the big palmate antlers are ALWAYS present, never bare stubs), the pad
// colour, the light wash, and BOLD dressing — snow on the back AND the broad
// antlers, a little winter SCARF, a big breath-fog puff, frost, blossoms, a
// fallen leaf. The moose is never recoloured, hollowed, or swapped, and it
// ALWAYS keeps its signature snout + palmate antlers.
//
// BOLD seasonal cues (readable at ~58px):
//   Spring — sleeker coat, antlers in fresh fuzzy VELVET, a blossom on the pad,
//            cool-bright light.
//   Summer — glossy coat, full hard antlers, bright warm light — PEAK.
//   Autumn — warm-tinted coat, full hard antlers, a fallen leaf on the pad (and
//            one caught in the antlers), dulled gloss, amber light — very
//            autumnal, leaned-in.
//   Winter — SHAGGIER thick coat + snow on the back AND on the broad antlers + a
//            little winter SCARF + a big breath-fog puff, frost, snowy pad, cool
//            blue-grey light. Clearly wintry, still the same moose.
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~0.9s): a CHEW + ear-flick + slow head-sway — the heavy
//     head bobs/sways ~8-12px as it chews, an ear flicks, a small body squash.
//   • RARE  ~18s (win ~1.2s, phase +3s): a BUGLE head-raise / antler-toss — the
//     moose raises its head and tosses the big antlers ~14-18px (anticipation →
//     raise/toss → settle). May exit the box at apex (fine).
// Both gestures return to REST with zero value AND zero velocity at the window
// edges (raised-cosine windows), so `anim(…, t)` is seamless and `anim(…, 0)`
// (and `draw`) sit exactly at rest.
//
// Origin-centered in the −24..+24 design box, light from upper-left, flat
// cel-shaded with a soft dark outline. Deterministic in `t` (seconds). Never
// throws; clamps every scalar; save/restore + globalAlpha reset.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Small math helpers ──────────────────────────────────────────────────────

type RGB = [number, number, number];

// coerce any wild/non-finite input to a finite fallback (never let NaN through)
function safeNum(x: number, fallback = 0): number {
  return Number.isFinite(x) ? x : fallback;
}

function clamp01(x: number): number {
  const v = safeNum(x, 0);
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

// build an rgba() string, clamping channels and alpha (never throws on wild p)
function rgba(c: RGB, a = 1): string {
  const r = Math.round(clamp01(c[0] / 255) * 255);
  const g = Math.round(clamp01(c[1] / 255) * 255);
  const b = Math.round(clamp01(c[2] / 255) * 255);
  return `rgba(${r},${g},${b},${clamp01(a)})`;
}

// quintic smoothstep — zero first & second derivative at both ends
function smoother(x: number): number {
  const v = clamp01(x);
  return v * v * v * (v * (6 * v - 15) + 10);
}

// Two-tier occasional-action clock. Returns a phase in [0,1) WITHIN the action
// window (the fraction of the way through the gesture), or −1 when at rest. The
// window opens once per `period` at `phase` seconds in, and is `win` long.
function actionQ(t: number, period: number, win: number, phase: number): number {
  const tt = safeNum(t, 0);
  const c = (((tt + phase) % period) + period) % period;
  return c < win ? c / win : -1;
}

// A raised-cosine "bump" 0→1→0 over q∈[0,1], with zero slope at both ends, so a
// gesture grows in and settles out seamlessly (no velocity at the window edges).
function bump(q: number): number {
  if (q < 0 || q > 1) return 0;
  return 0.5 - 0.5 * Math.cos(q * Math.PI * 2);
}

// Anticipation→action shape for the BUGLE/antler-toss: a brief dip (negative,
// the head drops in anticipation) before a clean rise and settle. q∈[0,1].
// Returns a RAISE factor in roughly −0.18..+1 (negative = anticipation dip,
// positive = head/antlers raised). Zero value & slope at both ends.
function tossShape(q: number): number {
  if (q <= 0 || q >= 1) return 0;
  const antiEnd = 0.24; // first slice = anticipation dip
  if (q < antiEnd) {
    const a = q / antiEnd;
    return -0.18 * (0.5 - 0.5 * Math.cos(a * Math.PI));
  }
  const a = (q - antiEnd) / (1 - antiEnd);
  return Math.sin(a * Math.PI);
}

// ── The idle POSE (carries all action state into paint) ──────────────────────

interface Pose {
  bob: number; // whole-body vertical bob (design px, + = up). The toss uses this.
  lean: number; // signed body lean (radians, gentle) during the toss
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  head: number; // head/antler raise (design px, + = UP) for the bugle toss
  chew: number; // extra head dip (design px, + = DOWN) for the chew
  ear: number; // 0..1 near-ear flick amount
  tail: number; // signed tail flick (design px sideways)
  hop: number; // 0..1 jaw/mouth open + breath-fog swell as it chews/bugles
}

const REST: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, chew: 0, ear: 0, tail: 0, hop: 0 };

// Build a pose from the wall clock: a common CHEW every ~6s and a rare BUGLE
// antler-toss every ~18s. Returns to REST (all zeros / unit scales) at every
// window edge.
function poseFromClock(t: number): Pose {
  const pose: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, chew: 0, ear: 0, tail: 0, hop: 0 };

  // COMMON ~6s: CHEW (win ~0.9s). The heavy head bobs/sways ~8-12px down as it
  // chews, jaw chatters, an ear flicks, the tail flicks, a small body squash.
  // Built from raised-cosine windows → seamless. Phase 3.0 opens the window at
  // t≈3.0 (well clear of t=0, so anim(0) sits exactly at REST).
  const cq = actionQ(t, 6, 0.9, 3.0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window
    // two chew bobs within the window (head dips down ~8-12px at the peak)
    pose.chew = env * (4.0 + 7.0 * Math.abs(Math.sin(cq * Math.PI * 2)));
    pose.hop = env * (0.5 + 0.5 * Math.abs(Math.sin(cq * Math.PI * 2)));
    pose.ear = env;
    pose.tail = Math.sin(cq * Math.PI * 6) * env * 2.6; // a few flicks sideways
    pose.head = -env * 1.0; // a touch of head-sway downward with the chew
    // small body squash with the heavy head motion
    pose.squashY = 1 - env * 0.04;
    pose.squashX = 1 + env * 0.03;
    pose.lean = Math.sin(cq * Math.PI * 2) * env * 0.03; // gentle sway
  }

  // RARE ~18s: BUGLE / antler-toss (win ~1.2s). The moose raises its head and
  // tosses the big antlers ~14-18px up, anticipation → raise → settle. May lift
  // OUTSIDE the design box at the apex.
  const bq = actionQ(t, 18, 1.2, 3.0); // phase +3s (offset from chew origin)
  if (bq >= 0) {
    const s = tossShape(bq); // −0.18..+1 (anticipation dip then raise)
    pose.head += Math.max(0, s) * 17; // up to ~17px head/antler raise
    if (s < 0) {
      // anticipation: head drops, body crouches a touch wide/low
      const c = -s; // 0..0.18
      pose.chew += c * 6; // head dips down in anticipation
      pose.squashY = Math.min(pose.squashY, 1 - c * 0.7);
      pose.squashX = Math.max(pose.squashX, 1 + c * 0.5);
    } else {
      // raise: body stretches tall, leans back as the antlers toss up
      pose.bob += s * 4.0; // a little whole-body lift with the bugle
      pose.squashY = Math.max(pose.squashY, 1 + s * 0.1);
      pose.squashX = Math.min(pose.squashX, 1 - s * 0.06);
      pose.lean += -s * 0.1; // tip the head/antlers back
      pose.hop = Math.max(pose.hop, s); // bellow → mouth open + fog swell
    }
    pose.ear = Math.max(pose.ear, bump(bq) * 0.6);
    pose.tail += Math.sin(bq * Math.PI) * 1.4;
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────
//
// IDENTITY colours (dark-brown coat, darker mane/legs, pale muzzle, dark
// hooves/eyes, bone antlers) stay nearly constant; they live in P only so the
// light wash + coat thickness can nudge them very slightly between seasons.
// Everything that genuinely differs per season is the coat VOLUME + the antler
// state + pad + light + BOLD dressing amounts.

interface P {
  coatLight: RGB; // lit top of the dark-brown coat
  coatMid: RGB; // body brown tone
  coatShadow: RGB; // shaded underside of the brown coat
  mane: RGB; // darker neck/hump mane + leg tone (locked dark)
  maneShade: RGB; // deeper shade inside the mane / dewlap
  muzzle: RGB; // soft muzzle / nostril / inner ear
  hoofDark: RGB; // hooves + eyes (the dark hard parts)
  antler: RGB; // the bone of the palmate antlers (locked)
  antlerShade: RGB; // shaded underside of the antler palm
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  coatVolume: number; // 0..1 coat thickness (sleek → shaggy & puffed outline)
  gloss: number; // 0..1 glossy-coat sheen strength (summer peak)
  velvetAmt: number; // 0..1 fuzzy velvet on the antlers (spring) vs hard polish
  antlerSnowAmt: number; // 0..1 snow resting on the broad antlers (winter)
  antlerLeafAmt: number; // 0..1 a fallen leaf caught in the antlers (autumn)
  frostAmt: number; // 0..1 frost sparkle on the coat
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 blossoms on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad (autumn)
  breathFogAmt: number; // 0..1 breath puff at the muzzle (winter)
  scarfAmt: number; // 0..1 a little winter HOLLY SPRIG (tweened alpha)
  scarfColor: RGB; // holly-berry colour (locked red, fades in via alpha)
}

// Four BOLD season presets. The moose stays the SAME dark-brown, palmate-
// antlered moose; only coat volume + antler state + pad + light + dressing
// differ — pushed HARD so each season reads at a glance.
const SP: Record<SeasonName, P> = {
  // Spring — sleeker coat, fresh fuzzy VELVET antlers, blossom on the pad, cool.
  Spring: {
    coatLight: [110, 78, 52],
    coatMid: [82, 56, 36],
    coatShadow: [54, 36, 24],
    mane: [44, 28, 18],
    maneShade: [28, 18, 12],
    muzzle: [96, 72, 62],
    hoofDark: [34, 26, 22],
    antler: [206, 184, 138], // velvety warm bone
    antlerShade: [150, 128, 88],
    padGrass: [128, 214, 82], // vivid fresh lime
    soil: [86, 140, 52],
    outline: [38, 24, 16],
    lightWash: [200, 240, 255], // cool-bright
    lightWashAmt: 0.2,
    coatVolume: 0.1, // BOLD: clearly sleek spring coat
    gloss: 0.3,
    velvetAmt: 1, // full fuzzy fresh velvet
    antlerSnowAmt: 0,
    antlerLeafAmt: 0,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.9,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [200, 44, 44],
  },
  // Summer — glossy coat, full HARD antlers (PEAK), saturated pad, warm light.
  Summer: {
    coatLight: [120, 84, 54],
    coatMid: [88, 58, 36],
    coatShadow: [56, 36, 22],
    mane: [42, 26, 16],
    maneShade: [26, 16, 10],
    muzzle: [98, 72, 62],
    hoofDark: [32, 24, 20],
    antler: [224, 206, 162], // clean hard bone
    antlerShade: [164, 142, 100],
    padGrass: [80, 180, 60], // saturated mid-green
    soil: [52, 116, 38],
    outline: [36, 22, 14],
    lightWash: [255, 240, 184], // bright warm
    lightWashAmt: 0.2,
    coatVolume: 0.42, // normal full coat
    gloss: 0.92, // glossiest peak
    velvetAmt: 0, // shed velvet — hard antler
    antlerSnowAmt: 0,
    antlerLeafAmt: 0,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [200, 44, 44],
  },
  // Autumn — warm-tinted coat, full hard antlers, fallen leaf on pad + caught in
  // the antlers (rut season), dulled gloss, BOLD amber light.
  Autumn: {
    coatLight: [118, 78, 46],
    coatMid: [90, 56, 30],
    coatShadow: [56, 34, 18],
    mane: [46, 28, 16],
    maneShade: [30, 17, 9],
    muzzle: [96, 70, 58],
    hoofDark: [34, 26, 22],
    antler: [204, 168, 110], // rich polished bone
    antlerShade: [146, 112, 66],
    padGrass: [168, 134, 62], // olive-tan browning
    soil: [110, 82, 40],
    outline: [38, 24, 16],
    lightWash: [255, 182, 92], // low amber, BOLD
    lightWashAmt: 0.32,
    coatVolume: 0.66, // fuller coat
    gloss: 0.34, // dulled gloss
    velvetAmt: 0, // hard polished antler
    antlerSnowAmt: 0,
    antlerLeafAmt: 0.9, // a leaf caught in the antlers
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.95,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [200, 44, 44],
  },
  // Winter — SHAGGY thick coat + back-snow + antler-snow + SCARF + breath fog,
  // snowy pad, BOLD cool blue-grey light.
  Winter: {
    coatLight: [98, 72, 52],
    coatMid: [74, 52, 36],
    coatShadow: [50, 34, 24],
    mane: [44, 30, 22],
    maneShade: [28, 18, 14],
    muzzle: [96, 74, 66],
    hoofDark: [40, 32, 28],
    antler: [196, 180, 150], // cool muted bone
    antlerShade: [140, 124, 100],
    padGrass: [224, 236, 250], // snow on the pad
    soil: [148, 168, 192],
    outline: [44, 30, 22],
    lightWash: [190, 214, 252], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    coatVolume: 1, // BOLD: thick shaggy winter coat
    gloss: 0.16,
    velvetAmt: 0, // hard antler, but snow-capped
    antlerSnowAmt: 0.88,
    antlerLeafAmt: 0,
    frostAmt: 0.7,
    backSnowAmt: 0.9,
    padSnowAmt: 0.92,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.85,
    scarfAmt: 1, // a little scarf appears in winter
    scarfColor: [200, 44, 44],
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    coatLight: lerpRGB(a.coatLight, b.coatLight, t),
    coatMid: lerpRGB(a.coatMid, b.coatMid, t),
    coatShadow: lerpRGB(a.coatShadow, b.coatShadow, t),
    mane: lerpRGB(a.mane, b.mane, t),
    maneShade: lerpRGB(a.maneShade, b.maneShade, t),
    muzzle: lerpRGB(a.muzzle, b.muzzle, t),
    hoofDark: lerpRGB(a.hoofDark, b.hoofDark, t),
    antler: lerpRGB(a.antler, b.antler, t),
    antlerShade: lerpRGB(a.antlerShade, b.antlerShade, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    coatVolume: lerp(a.coatVolume, b.coatVolume, t),
    gloss: lerp(a.gloss, b.gloss, t),
    velvetAmt: lerp(a.velvetAmt, b.velvetAmt, t),
    antlerSnowAmt: lerp(a.antlerSnowAmt, b.antlerSnowAmt, t),
    antlerLeafAmt: lerp(a.antlerLeafAmt, b.antlerLeafAmt, t),
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
    gloss: clamp01(p.gloss),
    velvetAmt: clamp01(p.velvetAmt),
    antlerSnowAmt: clamp01(p.antlerSnowAmt),
    antlerLeafAmt: clamp01(p.antlerLeafAmt),
    frostAmt: clamp01(p.frostAmt),
    backSnowAmt: clamp01(p.backSnowAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    breathFogAmt: clamp01(p.breathFogAmt),
    scarfAmt: clamp01(p.scarfAmt),
  };
}

// clamp every numeric field of a pose (never throw on a wild pose)
function clampPose(po: Pose): Pose {
  return {
    bob: safeNum(po.bob),
    lean: safeNum(po.lean),
    squashX: safeNum(po.squashX, 1),
    squashY: safeNum(po.squashY, 1),
    head: safeNum(po.head),
    chew: safeNum(po.chew),
    ear: safeNum(po.ear),
    tail: safeNum(po.tail),
    hop: safeNum(po.hop),
  };
}

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat grass pad the moose stands on
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

  // BOLD blossom (spring)
  if (p.blossomAmt > 0.001) {
    for (const [bx, by] of [[-12, 18.5], [10, 20], [0, 21], [14, 19]] as const) {
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

  // a BOLD fallen leaf on the pad (autumn)
  if (p.fallenLeafAmt > 0.001) {
    const leaves: Array<[number, number, number, RGB]> = [
      [11, 20.4, 0.7, [214, 132, 40]],
      [-11, 20, -0.5, [192, 88, 34]],
      [2, 21, 0.2, [170, 76, 38]],
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

// one slender leg: a thin dark cannon with a dark hoof at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  // dark leg with outline
  ctx.strokeStyle = rgba(p.outline);
  ctx.lineWidth = 3.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  ctx.strokeStyle = rgba(p.mane);
  ctx.lineWidth = 2.3;
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY - 1.4);
  ctx.stroke();
  // dark hoof
  ctx.fillStyle = rgba(p.hoofDark);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 2.0, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// Trace the moose's deep barrel body path (constant silhouette). cx,cy = body
// centre. vol modestly puffs/shaggies the outline; the underlying shape is
// constant. The body is a bit larger and deeper than a horse's.
function bodyPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, vol: number): void {
  const rx = 13.0 * (0.97 + vol * 0.12);
  const ry = 8.6 * (0.97 + vol * 0.14);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, -0.04, 0, Math.PI * 2);
}

// ── One broad PALMATE antler (flat, hand-shaped) ─────────────────────────────
//
// Drawn around a local origin at the antler's base on the crown; `side` is -1
// (the moose's left, screen-left) or +1. A short beam runs out and up to a flat
// palm whose outer edge sprouts several finger-like tines. `velvet` softens the
// edge to a fuzzy rounded velvety look; `snow` rests a white cap on the palm's
// upward face; the antler colour is locked (`p.antler`). The big palmate antler
// is ALWAYS drawn — never a bare stub.
function paintAntler(
  ctx: CanvasRenderingContext2D,
  p: P,
  baseX: number,
  baseY: number,
  side: 1 | -1,
  velvet: number,
  snow: number,
): void {
  ctx.save();
  ctx.translate(baseX, baseY);
  // outward spread; the screen-left antler reads bigger (nearer in the ¾ view)
  ctx.scale(side, 1);

  // beam from base out to the palm centre
  const palmX = 9.5;
  const palmY = -7.5;

  // outline pass — a fat soft halo, slightly fuzzier with velvet
  ctx.strokeStyle = rgba(p.outline, 0.95);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = 4.4 + velvet * 1.0;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(4.5, -3.5, palmX, palmY);
  ctx.stroke();

  // the broad flat palm — a rounded fan, outline first
  const fingers: Array<[number, number]> = [
    [4.0, -7.2],
    [7.6, -8.6],
    [11.0, -8.4],
    [13.6, -6.4],
    [14.4, -3.4],
  ];
  const palmPath = (): void => {
    ctx.beginPath();
    // inner base of the palm near the beam tip
    ctx.moveTo(palmX - 4.5, palmY + 2.2);
    ctx.quadraticCurveTo(palmX - 5.0, palmY - 3.0, palmX - 1.8, palmY - 4.4);
    // sweep across the finger tips along the outer edge
    for (const [fx, fy] of fingers) {
      ctx.lineTo(palmX + fx - 5.5, palmY + fy + 4.0);
    }
    // back down the outer-lower rim to the beam
    ctx.quadraticCurveTo(palmX + 8.0, palmY + 4.4, palmX + 3.5, palmY + 4.8);
    ctx.quadraticCurveTo(palmX - 1.0, palmY + 4.6, palmX - 4.5, palmY + 2.2);
    ctx.closePath();
  };
  // outline halo around the palm
  ctx.fillStyle = rgba(p.outline, 0.95);
  ctx.save();
  ctx.translate(palmX, palmY);
  ctx.scale(1.16, 1.18);
  ctx.translate(-palmX, -palmY);
  palmPath();
  ctx.fill();
  ctx.restore();

  // beam fill (bone)
  ctx.strokeStyle = rgba(p.antlerShade);
  ctx.lineWidth = 3.0 + velvet * 0.8;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(4.5, -3.5, palmX, palmY);
  ctx.stroke();
  ctx.strokeStyle = rgba(p.antler);
  ctx.lineWidth = 1.7 + velvet * 0.5;
  ctx.beginPath();
  ctx.moveTo(0.4, 0);
  ctx.quadraticCurveTo(4.8, -3.6, palmX, palmY - 0.4);
  ctx.stroke();

  // shaded palm
  ctx.fillStyle = rgba(p.antlerShade);
  palmPath();
  ctx.fill();
  // lit palm, offset up-left
  ctx.save();
  ctx.fillStyle = rgba(p.antler);
  ctx.translate(-1.2, -1.4);
  ctx.scale(0.92, 0.92);
  ctx.translate(palmX, palmY);
  ctx.translate(-palmX, -palmY);
  palmPath();
  ctx.fill();
  ctx.restore();

  // a couple of grooves between the finger tines for the palmate read
  ctx.strokeStyle = rgba(p.antlerShade, 0.85);
  ctx.lineWidth = 1.0;
  for (const [fx, fy] of fingers) {
    ctx.beginPath();
    ctx.moveTo(palmX - 1.5, palmY + 1.5);
    ctx.lineTo(palmX + fx - 5.5, palmY + fy + 4.4);
    ctx.stroke();
  }

  // velvet — fuzzy rounded dabs hugging the palm edge + a soft velvety sheen
  if (velvet > 0.02) {
    ctx.fillStyle = rgba([214, 196, 156], 0.5 * velvet);
    for (const [fx, fy] of fingers) {
      ctx.beginPath();
      ctx.arc(palmX + fx - 5.5, palmY + fy + 4.0, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // velvety highlight wash across the palm
    ctx.save();
    palmPath();
    ctx.clip();
    ctx.fillStyle = rgba([236, 222, 188], 0.28 * velvet);
    ctx.beginPath();
    ctx.ellipse(palmX, palmY - 1, 8, 4, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    // hard antler — a small polished specular glint on the palm
    ctx.fillStyle = rgba([255, 255, 255], 0.3);
    ctx.beginPath();
    ctx.ellipse(palmX - 1, palmY - 2, 2.2, 1.2, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // snow resting on the broad antler palm (winter)
  if (snow > 0.02) {
    ctx.save();
    palmPath();
    ctx.clip();
    ctx.fillStyle = rgba([248, 252, 255], 0.92 * snow);
    ctx.beginPath();
    ctx.ellipse(palmX + 1, palmY - 2.4, 8.4, 3.4, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = rgba([255, 255, 255], 0.85 * snow);
    for (const [fx, fy] of fingers) {
      ctx.beginPath();
      ctx.arc(palmX + fx - 5.5, palmY + fy + 3.0, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.lineCap = "butt";
  ctx.restore();
}

// a single leaf caught in the antlers (autumn) — drawn in head-local space
function paintAntlerLeaf(ctx: CanvasRenderingContext2D, amt: number): void {
  if (amt <= 0.02) return;
  ctx.save();
  ctx.translate(8.5, -12.5); // resting on the screen-left palm
  ctx.rotate(0.5);
  ctx.fillStyle = rgba([206, 110, 38], amt);
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.8, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba([110, 58, 24], amt);
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-2.6, 0);
  ctx.lineTo(2.6, 0);
  ctx.stroke();
  ctx.restore();
}

// the whole moose, standing front-¾ turned ~15-20° toward lower-left, posed by
// `pose`. The legs stay PLANTED; the upper body squashes/stretches; the head &
// antlers chew (dip) and bugle (raise) through the pose.
function paintMoose(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  const bx = 2;
  const bodyY = 3 - pose.bob; // body centre lifts with the bugle bob
  const vol = p.coatVolume;
  const legTop = bodyY + 5.5;

  // legs first (behind the body). Two far (dimmer/higher), two near. They stay
  // planted on the pad (they don't lift — they stretch). Long legs.
  ctx.save();
  ctx.globalAlpha = 0.9;
  paintLeg(ctx, p, bx + 8.5, legTop, 18.6);
  paintLeg(ctx, p, bx - 3.5, legTop, 18.8);
  ctx.restore();
  paintLeg(ctx, p, bx + 5.5, legTop + 0.5, 19.6);
  paintLeg(ctx, p, bx - 6.5, legTop + 0.5, 19.8);

  // The whole upper body (barrel + hump + neck + head + antlers + dressing) is
  // drawn under a squash/stretch transform centred on the body, so the bugle
  // reads with anticipation squash + raised stretch.
  ctx.save();
  ctx.translate(bx, bodyY);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.rotate(pose.lean);
  ctx.translate(-bx, -bodyY);

  const by = bodyY;

  // ── BODY barrel — outline pass then light fill (layered) ────────────────────
  ctx.fillStyle = rgba(p.outline);
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(1.1, 1.14);
  ctx.translate(-bx, -by);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  ctx.restore();

  // shaded coat
  ctx.fillStyle = rgba(p.coatShadow);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  // mid coat
  ctx.fillStyle = rgba(p.coatMid);
  ctx.save();
  ctx.translate(-0.4, -0.4);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  ctx.restore();
  // lit coat, offset up-left (light from upper-left)
  ctx.save();
  ctx.fillStyle = rgba(p.coatLight);
  ctx.translate(-1.6, -1.8);
  bodyPath(ctx, bx, by, vol * 0.7);
  ctx.fill();
  ctx.restore();

  // ── HUMPED SHOULDER — the moose's signature raised mass over the front back ──
  {
    const humpX = bx - 4.5;
    const humpY = by - 7.4;
    ctx.fillStyle = rgba(p.outline);
    ctx.beginPath();
    ctx.ellipse(humpX, humpY, 7.4, 5.4, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.coatShadow);
    ctx.beginPath();
    ctx.ellipse(humpX, humpY, 6.4, 4.6, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.coatMid);
    ctx.beginPath();
    ctx.ellipse(humpX - 0.6, humpY - 0.8, 5.6, 3.9, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.coatLight);
    ctx.beginPath();
    ctx.ellipse(humpX - 1.4, humpY - 1.6, 4.0, 2.6, -0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  // glossy coat sheen band over the back (summer peak — gloss strong)
  if (p.gloss > 0.02) {
    ctx.save();
    bodyPath(ctx, bx, by, vol);
    ctx.clip();
    ctx.fillStyle = rgba([255, 255, 255], 0.1 + 0.16 * p.gloss);
    ctx.beginPath();
    ctx.ellipse(bx - 1, by - 4.6, 9, 2.4, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // shaggy winter coat fringe: soft tufts along the lower/belly edge when the
  // coat is thick (vol high). Constant silhouette otherwise.
  if (vol > 0.55) {
    const fr = (vol - 0.55) / 0.45;
    ctx.fillStyle = rgba(p.coatShadow, 0.9);
    const rx = 13.0 * (0.97 + vol * 0.12);
    const ry = 8.6 * (0.97 + vol * 0.14);
    for (let i = 0; i < 10; i++) {
      const a = Math.PI * 0.12 + (i / 9) * Math.PI * 0.95; // lower-front arc
      const lx = bx + Math.cos(a) * rx * 1.02;
      const ly = by + Math.sin(a) * ry * 1.02;
      ctx.beginPath();
      ctx.arc(lx, ly, (1.3 + 0.9 * fr) * (i % 2 ? 1 : 0.8), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // snow settled on the back + hump (winter)
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgba([248, 252, 255], 0.92 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 2, by - 8.2, 9.5 * (0.9 + vol * 0.2), 3.2, -0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.85 * p.backSnowAmt);
    for (const [dx, dy] of [[-7, -9.4], [-1, -9.0], [5, -7.8]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.5 + vol * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the coat (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgba([255, 255, 255], 0.7 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-7, 0], [-2, 4], [4, -1], [8, 2], [0, -3], [-4, -5], [6, 4],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── NECK + HEAD (front-¾, lower-left). A long head with a drooping snout, a
  //    dewlap (bell) under the chin, broad palmate antlers above. The chew dips
  //    the head; the bugle raises the whole head group. ────────────────────────
  // headRaise: + = the head/antlers lift up (bugle); chew: + = head dips down.
  const headRaise = Math.max(0, pose.head);
  const headDip = pose.chew;
  const neckTopX = bx - 8;
  const neckTopY = by - 4 - headRaise * 0.5;
  const hx = bx - 16; // head centre x
  const hy = by + 1 + headDip - headRaise; // head sits a touch low; chew dips, bugle raises

  // neck — a thick tapering dark-brown wedge from the shoulder to the head
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.moveTo(bx - 2, by - 7);
  ctx.quadraticCurveTo(neckTopX - 1, neckTopY - 2, hx + 3.0, hy - 4.5);
  ctx.lineTo(hx + 5.0, hy + 3.5);
  ctx.quadraticCurveTo(neckTopX + 3, by + 2, bx, by + 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(p.coatMid);
  ctx.beginPath();
  ctx.moveTo(bx - 2, by - 6.6);
  ctx.quadraticCurveTo(neckTopX - 0.6, neckTopY - 1.4, hx + 3.1, hy - 4);
  ctx.lineTo(hx + 4.6, hy + 3);
  ctx.quadraticCurveTo(neckTopX + 3, by + 1.6, bx, by + 3.4);
  ctx.closePath();
  ctx.fill();
  // lit front edge of the neck
  ctx.strokeStyle = rgba(p.coatLight, 0.7);
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(hx + 4.4, hy + 2.6);
  ctx.quadraticCurveTo(neckTopX + 3, by + 1.4, bx, by + 3);
  ctx.stroke();
  ctx.lineCap = "butt";

  // dark mane crest along the top of the neck / hump
  ctx.strokeStyle = rgba(p.maneShade);
  ctx.lineWidth = 2.6 * (0.9 + vol * 0.2);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx - 2, by - 7.4);
  ctx.quadraticCurveTo(neckTopX - 1, neckTopY - 2.6, hx + 2.6, hy - 5.0);
  ctx.stroke();
  ctx.lineCap = "butt";

  // ── head group (raises/dips & tips with the pose) ──────────────────────────
  ctx.save();
  ctx.translate(hx, hy);
  // a gentle head tip during the bugle (lean already tips the body; add a touch)
  ctx.rotate(pose.head * 0.01 + pose.tail * 0.004);

  // broad palmate ANTLERS — drawn first so the crown overlaps their bases. The
  // near (screen-left) ear flicks; the antlers spread wide and are ALWAYS big.
  paintAntler(ctx, p, 1.6, -5.4, 1, p.velvetAmt, p.antlerSnowAmt);
  paintAntler(ctx, p, -1.6, -5.4, -1, p.velvetAmt, p.antlerSnowAmt);

  // a fallen leaf caught in the antlers (autumn)
  paintAntlerLeaf(ctx, p.antlerLeafAmt);

  // ears, low and to the sides, just under the antler bases. The near ear (the
  // screen-left, side -1) flicks up with the pose.
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(side * 3.0, -3.6);
    const flick = side === -1 ? pose.ear * 0.5 : 0;
    ctx.rotate(-0.1 + side * 0.5 - flick);
    ctx.fillStyle = rgba(p.outline);
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.5, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.coatMid);
    ctx.beginPath();
    ctx.ellipse(0, 0.2, 1.0, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.muzzle, 0.8);
    ctx.beginPath();
    ctx.ellipse(0, 0.2, 0.5, 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // head — a long dark wedge with a heavy DROOPING snout. Local origin at the
  // brow; the muzzle bulges down-left. Drawn as a rotated long ovoid.
  ctx.save();
  ctx.rotate(0.28);
  // outline
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(-1, 2.0, 4.6, 7.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // brown face fill (shaded then lit)
  ctx.fillStyle = rgba(p.coatShadow);
  ctx.beginPath();
  ctx.ellipse(-1, 2.0, 3.9, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.coatMid);
  ctx.beginPath();
  ctx.ellipse(-1.4, 1.4, 3.4, 6.0, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.coatLight);
  ctx.beginPath();
  ctx.ellipse(-1.8, 0.6, 2.4, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // the bulbous DROOPING snout — a soft rounded muzzle overhanging the lower face
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(-1.2, 8.4, 3.6, 3.2, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.muzzle);
  ctx.beginPath();
  ctx.ellipse(-1.4, 8.0, 2.9, 2.6, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.coatShadow, 0.6);
  ctx.beginPath();
  ctx.ellipse(-0.6, 9.2, 2.2, 1.5, -0.15, 0, Math.PI * 2);
  ctx.fill();
  // nostril
  ctx.fillStyle = rgba(p.hoofDark, 0.85);
  ctx.beginPath();
  ctx.ellipse(-1.8, 8.6, 0.7, 1.0, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // mouth — opens as it chews / bellows (pose.hop)
  if (pose.hop > 0.01) {
    ctx.fillStyle = rgba([24, 16, 16], 0.9);
    ctx.beginPath();
    ctx.ellipse(-2.0, 6.4, 1.3, 0.5 + clamp01(pose.hop) * 1.5, -0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // eye
  ctx.fillStyle = rgba(p.hoofDark);
  ctx.beginPath();
  ctx.ellipse(0.6, 1.6, 1.0, 1.3, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([255, 255, 255], 0.5);
  ctx.beginPath();
  ctx.arc(0.3, 1.1, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore(); // end rotated head

  // DEWLAP (bell) — a dark flap of skin/fur hanging straight down under the chin
  {
    const dlx = -2.4;
    const dly = 8.0;
    ctx.fillStyle = rgba(p.outline);
    ctx.beginPath();
    ctx.moveTo(dlx - 1.6, dly);
    ctx.quadraticCurveTo(dlx - 2.6, dly + 6.5, dlx - 0.4, dly + 8.4);
    ctx.quadraticCurveTo(dlx + 1.8, dly + 6.5, dlx + 1.4, dly);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba(p.maneShade);
    ctx.beginPath();
    ctx.moveTo(dlx - 1.1, dly);
    ctx.quadraticCurveTo(dlx - 2.0, dly + 6.0, dlx - 0.4, dly + 7.6);
    ctx.quadraticCurveTo(dlx + 1.3, dly + 6.0, dlx + 1.0, dly);
    ctx.closePath();
    ctx.fill();
    // a soft lit edge on the dewlap
    ctx.strokeStyle = rgba(p.mane, 0.7);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(dlx - 1.0, dly + 1);
    ctx.quadraticCurveTo(dlx - 1.8, dly + 5.4, dlx - 0.5, dly + 7.0);
    ctx.stroke();
  }

  // ── HOLLY SPRIG (winter) — instead of a scarf, a little festive holly sprig
  //    (two green leaves + a cluster of berries) tucked at the base of the neck.
  //    Gated by the SAME winter `scarfAmt` tween, so it fades in seamlessly in
  //    winter and is absent every other season. `scarfColor` drives the berries.
  if (p.scarfAmt > 0.001) {
    const sx = 3.0; // head-local: at the base of the neck
    const sy = 5.4;
    const leafGreen: RGB = [36, 110, 56];
    const leafShade: RGB = [22, 78, 40];
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // two serrated holly leaves splaying out across the neck base
    const leaves: Array<[number, number, number, number]> = [
      [sx - 2.2, sy + 1.0, -0.55, 1],
      [sx + 1.8, sy + 1.6, 0.5, -1],
    ];
    for (const [lx, ly, rot, dir] of leaves) {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      // leaf body (outline then fill) — a pointed lobed holly leaf
      ctx.fillStyle = rgba(leafShade);
      ctx.beginPath();
      ctx.moveTo(0, -3.6);
      ctx.quadraticCurveTo(dir * 2.4, -2.2, dir * 1.6, -0.4);
      ctx.quadraticCurveTo(dir * 3.0, 0.6, dir * 1.4, 1.4);
      ctx.quadraticCurveTo(dir * 2.2, 2.8, 0, 3.6);
      ctx.quadraticCurveTo(dir * -2.2, 2.8, dir * -1.4, 1.4);
      ctx.quadraticCurveTo(dir * -3.0, 0.6, dir * -1.6, -0.4);
      ctx.quadraticCurveTo(dir * -2.4, -2.2, 0, -3.6);
      ctx.closePath();
      ctx.fill();
      // lit upper face of the leaf
      ctx.fillStyle = rgba(leafGreen);
      ctx.beginPath();
      ctx.ellipse(dir * -0.3, -0.4, 1.5, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // central vein
      ctx.strokeStyle = rgba(leafShade);
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, -3.0);
      ctx.lineTo(0, 3.0);
      ctx.stroke();
      ctx.restore();
    }
    // a cluster of three berries at the centre (scarfColor)
    const berry = p.scarfColor;
    const berryDark: RGB = [
      Math.max(0, berry[0] - 60),
      Math.max(0, berry[1] - 30),
      Math.max(0, berry[2] - 30),
    ];
    for (const [bxp, byp] of [[sx - 0.6, sy + 0.4], [sx + 1.0, sy + 0.8], [sx + 0.2, sy + 1.8]] as const) {
      ctx.fillStyle = rgba(berryDark);
      ctx.beginPath();
      ctx.arc(bxp + 0.2, byp + 0.2, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(berry);
      ctx.beginPath();
      ctx.arc(bxp, byp, 1.2, 0, Math.PI * 2);
      ctx.fill();
      // tiny specular dot
      ctx.fillStyle = rgba([255, 255, 255], 0.6);
      ctx.beginPath();
      ctx.arc(bxp - 0.4, byp - 0.4, 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore(); // end head group transform

  ctx.restore(); // end squash/stretch transform

  // breath-fog puff at the snout (winter) — drawn OUTSIDE the squash transform
  // so it reads as air, not body. A static base puff + an exhale swell during
  // the chew/bugle (pose.hop). Snout in world space ≈ head centre + droop.
  if (p.breathFogAmt > 0.001) {
    const headDipW = pose.chew;
    const headRaiseW = Math.max(0, pose.head);
    const sxw = bx - 16 - 5.6 - clamp01(pose.hop) * 3.2;
    const syw = (3 - pose.bob) + 1 + headDipW - headRaiseW + 8.6;
    const reachR = 3.0 + clamp01(pose.hop) * 2.2;
    ctx.fillStyle = rgba([235, 244, 255], (0.36 + 0.28 * clamp01(pose.hop)) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(sxw, syw, reachR, 2.0 + clamp01(pose.hop) * 1.4, 0.2, 0, Math.PI * 2);
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

function paint(ctx: CanvasRenderingContext2D, pIn: P, poseIn: Pose): void {
  const p = clampP(pIn);
  const pose = clampPose(poseIn);
  ctx.save();
  try {
    ctx.lineJoin = "round";
    paintPad(ctx, p);
    paintMoose(ctx, p, pose);
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
    paint(ctx, SP[season], poseFromClock(safeNum(t, 0)));
  };
}

// ── Forward transitions (lerp EVERY field through quintic smoothstep) ─────────

// A monotone ease that is EXACT at the endpoints but can lead or lag.
function biasedEase(k: number, bias: number): number {
  return Math.pow(smoother(k), bias);
}

// Staged transition. The whole-tile look lerps from SP[from] (p=0) to SP[to]
// (p=1) — so transition(0) === draw(from) and transition(1) === draw(to)
// EXACTLY (drawn at REST, matching the idle hand-off). The coat VOLUME leads
// (coat fluffs/sleekens early); snow / frost / breath-fog / scarf / antler-snow
// LAG (settle late).
function makeTransition(fromIdx: 0 | 1 | 2) {
  const from = SEASON_NAMES[fromIdx];
  const to = SEASON_NAMES[fromIdx + 1];
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const p = clamp01(pp);
    const kBase = smoother(p);
    const kCoat = biasedEase(p, 0.62); // coat volume + velvet LEAD
    const kSnow = biasedEase(p, 1.7); // snow / frost / fog / scarf LAG

    const a = SP[from];
    const b = SP[to];
    const blended: P = lerpP(a, b, kBase);
    blended.coatVolume = lerp(a.coatVolume, b.coatVolume, kCoat);
    blended.velvetAmt = lerp(a.velvetAmt, b.velvetAmt, kCoat);
    blended.backSnowAmt = lerp(a.backSnowAmt, b.backSnowAmt, kSnow);
    blended.padSnowAmt = lerp(a.padSnowAmt, b.padSnowAmt, kSnow);
    blended.antlerSnowAmt = lerp(a.antlerSnowAmt, b.antlerSnowAmt, kSnow);
    blended.frostAmt = lerp(a.frostAmt, b.frostAmt, kSnow);
    blended.breathFogAmt = lerp(a.breathFogAmt, b.breathFogAmt, kSnow);
    blended.scarfAmt = lerp(a.scarfAmt, b.scarfAmt, kSnow);

    paint(ctx, blended, REST);

    // Transient overlays (strength ∝ sin(π·p): exactly 0 at both ends).
    const trans = Math.sin(Math.PI * p);
    if (trans <= 0.0008) return;

    ctx.save();
    try {
      const bx = 2;
      const by = 3;
      const hx = bx - 16;
      const hy = by + 1;

      // Loose shed-hair / fluff motes lifting off the changing coat — reads the
      // coat visibly fluffing/shedding. Present in EVERY morph (deterministic).
      const fluff = trans * (0.4 + 0.6 * Math.min(1, Math.abs(b.coatVolume - a.coatVolume) + 0.4));
      if (fluff > 0.01) {
        ctx.fillStyle = rgba([210, 190, 160], 0.5 * fluff);
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
        ctx.fillStyle = rgba([235, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(hx - (5 + trans * 3), hy + 8.6, 2.6 + trans * 1.8, 1.8 + trans * 1.2, 0.2, 0, Math.PI * 2);
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
