// Production seasonal art for the HERD HOG board tile — the approved bold
// direction, mirroring the sheep reference pattern. A single parameterized
// `paint(ctx, p, pose)` + four `P` presets + lerped transitions, pushed so the
// seasons read at a glance and the idle is a real, fun ACTION rather than a
// subtle breath.
//
// PALETTE LOCK: it is ALWAYS the same big, heavy, coarse greyish-BROWN hog — a
// bulky barrel body, a broad forward-jutting snout, small upright ears, stocky
// legs, a couple of small lower tusks, and a bristly hairy back-crest. Seasons
// change only its coat VOLUME (sleeker bristles in spring → a fluffier shaggy
// winter coat), the pad colour, the light wash, and BOLD dressing — snow on the
// back, a little winter SCARF, a breath-fog puff, a blossom, a fallen leaf,
// frost, gloss. The animal's identity colours never change; the silhouette is
// identical for every `P` (only coat volume scales the bristles).
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~0.9s): a CHEW / snort — head bobs ~8-12px as it chews and
//     snorts, with an ear-flick, a tail wag, and a body squash.
//   • RARE  ~18s (win ~1.2s, phase +3s): a heavy STAMP / head-toss — the hog
//     tosses its head and stamps with a weighty bounce ~12-16px (anticipation →
//     toss/stamp → settle). It may exit the design box at the apex.
// Both gestures return to REST with zero value AND zero velocity at the window
// edges (raised-cosine windows), so `anim(…, t)` is seamless and `anim(…, 0)`
// (and `draw`) sit exactly at rest.
//
// Origin-centered in the −24..+24 design box. Deterministic in `t` (seconds).
// Never throws; clamps every scalar; guards non-finite t/p; save/restore +
// globalAlpha reset.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Small math helpers ──────────────────────────────────────────────────────

type RGB = [number, number, number];

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

// coerce a possibly non-finite number to a safe finite default (never throw)
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

// Anticipation→action shape for the STAMP/head-toss: a brief crouch (negative)
// before the heavy rise, then a clean weighty arc up and settle. q∈[0,1].
// Returns a LIFT factor in roughly −0.22..+1 (negative = squash-down crouch,
// positive = airborne). Heavier/weightier feel than the sheep hop.
function stampShape(q: number): number {
  if (q <= 0 || q >= 1) return 0;
  const antiEnd = 0.26; // first slice = heavy crouch/anticipation
  if (q < antiEnd) {
    // dip down (anticipation), zero slope at q=0
    const a = q / antiEnd;
    return -0.22 * (0.5 - 0.5 * Math.cos(a * Math.PI));
  }
  // airborne arc, zero at the seam to the crouch and at q=1
  const a = (q - antiEnd) / (1 - antiEnd);
  return Math.sin(a * Math.PI);
}

// ── The idle POSE (carries all action state into paint) ──────────────────────

interface Pose {
  lift: number; // whole-body vertical lift (design px, + = up). Stamp uses this.
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  headBob: number; // extra head dip (design px, + = down) for the chew
  headToss: number; // head TOSS (design px, − = up) for the stamp gesture
  chew: number; // 0..1 jaw/snort open amount for the chew
  earFlick: number; // 0..1 near-ear flick amount
  tail: number; // signed tail wag (design px sideways)
  fogPuff: number; // 0..1 extra breath-fog reach (winter snort exhale)
}

const REST: Pose = {
  lift: 0,
  squashX: 1,
  squashY: 1,
  headBob: 0,
  headToss: 0,
  chew: 0,
  earFlick: 0,
  tail: 0,
  fogPuff: 0,
};

// Build a pose from the wall clock: a common CHEW/snort every ~6s and a rare
// STAMP/head-toss every ~18s. Returns to REST (all zeros / unit scales) at every
// window edge.
function poseFromClock(tIn: number): Pose {
  const t = safeNum(tIn, 0);
  const pose: Pose = {
    lift: 0,
    squashX: 1,
    squashY: 1,
    headBob: 0,
    headToss: 0,
    chew: 0,
    earFlick: 0,
    tail: 0,
    fogPuff: 0,
  };

  // COMMON ~6s: CHEW / snort (win ~0.9s). Head bobs ~8-12px as it chews/snorts,
  // jaw works, ear flicks, tail wags, body squashes. Built from raised-cosine
  // windows → seamless. Phase 3.0 opens the window at t≈3.0 (well clear of t=0,
  // so anim(0) sits exactly at REST).
  const cq = actionQ(t, 6, 0.9, 3.0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window
    // two chew bobs within the window (head dips down ~8-12px at the peak)
    pose.headBob = env * (4.0 + 8.0 * Math.abs(Math.sin(cq * Math.PI * 2)));
    pose.chew = env * (0.5 + 0.5 * Math.abs(Math.sin(cq * Math.PI * 2)));
    pose.earFlick = env;
    pose.tail = Math.sin(cq * Math.PI * 6) * env * 2.6; // a few wags sideways
    pose.fogPuff = env; // winter: a snort exhale puff as it chews
    // a small body squash as it leans into the chew
    pose.squashY = 1 - env * 0.05;
    pose.squashX = 1 + env * 0.04;
  }

  // RARE ~18s: STAMP / head-toss (win ~1.2s, phase +3s). The hog tosses its head
  // and stamps with a weighty bounce ~12-16px. May lift OUTSIDE the design box.
  const hq = actionQ(t, 18, 1.2, 3.0);
  if (hq >= 0) {
    const s = stampShape(hq); // −0.22..+1 (heavy crouch then arc)
    pose.lift = Math.max(0, s) * 15; // up to ~15px airborne (weighty bounce)
    if (s < 0) {
      // anticipation crouch: squash down/wide (heavier than the sheep)
      const c = -s; // 0..0.22
      pose.squashY = 1 - c * 1.0;
      pose.squashX = 1 + c * 0.8;
    } else {
      // airborne: stretch a touch tall/narrow at the apex
      pose.squashY = 1 + s * 0.12;
      pose.squashX = 1 - s * 0.08;
    }
    // the head TOSSES up during the rise (− = up), settling at the edges
    pose.headToss = Math.max(0, s) * 7.0;
    // a heavy tail flag + ear flick during the stamp
    pose.tail += Math.sin(hq * Math.PI) * 1.6;
    pose.earFlick = Math.max(pose.earFlick, bump(hq) * 0.8);
    pose.fogPuff = Math.max(pose.fogPuff, bump(hq)); // a hard snort at the toss
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────

interface P {
  hideLight: RGB; // lit top of the coarse greyish-brown hide
  hideMid: RGB; // body tone
  hideShadow: RGB; // shaded underside / belly
  snout: RGB; // broad snout pad + ear inner
  bristle: RGB; // coarse bristly hair strokes along the back
  tusk: RGB; // the small lower tusks (locked ivory)
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  coatVolume: number; // 0..1 BOLD shagginess of the bristly coat (sleek→shaggy)
  glossAmt: number; // 0..1 healthy coat gloss/sheen (summer peak)
  frostAmt: number; // 0..1 frost sparkle on the hide
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 a blossom on the pad
  fallenLeafAmt: number; // 0..1 a fallen leaf on the pad
  breathFogAmt: number; // 0..1 breath puff at the snout
  scarfAmt: number; // 0..1 a little winter SCARF (tweened alpha)
  scarfColor: RGB; // scarf colour (locked, fades in via alpha)
}

// Four BOLD season presets. The hog stays the SAME coarse greyish-brown
// broad-snouted hog; only coat volume + pad + light + dressing differ — pushed
// HARD so each season reads at a glance.
const SP: Record<SeasonName, P> = {
  // Spring — cleaner sleek coat; cool-bright light; dewy lime pad; a blossom.
  Spring: {
    hideLight: [156, 124, 102],
    hideMid: [120, 90, 70],
    hideShadow: [82, 60, 46],
    snout: [162, 118, 108],
    bristle: [72, 52, 38],
    tusk: [238, 232, 212],
    padGrass: [118, 214, 78], // vivid fresh lime
    soil: [78, 140, 48],
    outline: [54, 38, 28],
    lightWash: [196, 240, 255], // cool-bright
    lightWashAmt: 0.2,
    coatVolume: 0.12, // BOLD: clean sleek coat
    glossAmt: 0.2,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.9,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [70, 120, 150],
  },
  // Summer — glossy healthy coat (PEAK); bright warm light; saturated green pad.
  Summer: {
    hideLight: [166, 130, 102],
    hideMid: [126, 94, 70],
    hideShadow: [84, 60, 44],
    snout: [170, 120, 110],
    bristle: [70, 50, 36],
    tusk: [240, 234, 214],
    padGrass: [72, 184, 58], // saturated mid-green
    soil: [48, 116, 36],
    outline: [52, 36, 26],
    lightWash: [255, 238, 178], // warm, bright
    lightWashAmt: 0.2,
    coatVolume: 0.42, // full normal coat
    glossAmt: 0.85, // healthy coat gloss peaks
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [70, 120, 150],
  },
  // Autumn — warm-tinted deeper brown; amber light; olive-tan pad; a fallen leaf.
  Autumn: {
    hideLight: [152, 114, 84],
    hideMid: [116, 84, 60],
    hideShadow: [78, 54, 38],
    snout: [158, 110, 100],
    bristle: [64, 44, 30],
    tusk: [234, 226, 204],
    padGrass: [172, 138, 64], // olive-tan browning
    soil: [112, 82, 40],
    outline: [50, 34, 24],
    lightWash: [255, 184, 96], // low amber, BOLD
    lightWashAmt: 0.3,
    coatVolume: 0.7, // fuller, thicker coarse coat
    glossAmt: 0.35, // dulled gloss
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.95,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [70, 120, 150],
  },
  // Winter — cool blue-grey light; FLUFFIER/bristlier shaggy coat; snow on the
  // back; a little winter SCARF; a breath-fog puff; frost; snowy pad. Stays
  // clearly the same greyish-brown hog underneath.
  Winter: {
    hideLight: [144, 116, 96],
    hideMid: [110, 84, 66],
    hideShadow: [76, 56, 44],
    snout: [154, 116, 110],
    bristle: [62, 46, 34],
    tusk: [242, 238, 224],
    padGrass: [226, 238, 250], // snow on the pad
    soil: [146, 166, 192],
    outline: [62, 50, 46],
    lightWash: [188, 212, 252], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    coatVolume: 1, // BOLD: shaggy thick fluffy winter coat
    glossAmt: 0.14,
    frostAmt: 0.85,
    backSnowAmt: 0.92,
    padSnowAmt: 0.95,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.85,
    scarfAmt: 1, // a little scarf appears in winter
    scarfColor: [70, 120, 150],
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    hideLight: lerpRGB(a.hideLight, b.hideLight, t),
    hideMid: lerpRGB(a.hideMid, b.hideMid, t),
    hideShadow: lerpRGB(a.hideShadow, b.hideShadow, t),
    snout: lerpRGB(a.snout, b.snout, t),
    bristle: lerpRGB(a.bristle, b.bristle, t),
    tusk: lerpRGB(a.tusk, b.tusk, t),
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

// the low flat grass pad the hog stands on
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

  // a BOLD blossom on the pad (spring)
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

// one stocky leg: a short thick dark cylinder with a small cloven hoof
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  ctx.strokeStyle = rgb(p.hideShadow);
  ctx.lineWidth = 4.2; // stocky
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // small dark cloven hoof
  ctx.fillStyle = rgb([30, 22, 18]);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 2.1, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// the heavy barrel body — the SAME silhouette every season; only fills + the
// bristle crest change with coat volume.
function bodyPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
}

// the whole hog, standing front-¾ turned toward lower-left, posed by `pose`
function paintHog(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  // legs stay PLANTED on the pad (they stretch with the stamp, don't float).
  const bx = 1;
  const bodyY = 4 - pose.lift; // body centre lifts during the stamp
  const legTop = bodyY + 5.5; // where the legs meet the body
  const by = bodyY;

  // the big barrel body dimensions
  const rx = 14.5;
  const ry = 9.6;

  // legs first (behind the body). Two back, two front; contact on the pad.
  ctx.save();
  ctx.globalAlpha = 0.9;
  paintLeg(ctx, p, bx + 8.5, legTop, 18.6);
  paintLeg(ctx, p, bx - 6.5, legTop, 18.9);
  ctx.restore();
  // front legs (nearer)
  paintLeg(ctx, p, bx + 5, legTop + 0.5, 19.3);
  paintLeg(ctx, p, bx - 3, legTop + 0.5, 19.5);

  // The whole upper body (body + head + dressing) is drawn under a squash/stretch
  // transform centred on the body, so the stamp reads with anticipation squash +
  // airborne stretch.
  ctx.save();
  ctx.translate(bx, bodyY);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-bx, -bodyY);

  // BODY — soft dark outline halo, then mid fill, then lit top (layered).
  bodyPath(ctx, bx, by, rx + 1.2, ry + 1.2);
  ctx.fillStyle = rgb(p.outline);
  ctx.fill();
  bodyPath(ctx, bx, by, rx, ry);
  ctx.fillStyle = rgb(p.hideMid);
  ctx.fill();
  // belly shadow (lower band)
  ctx.save();
  bodyPath(ctx, bx, by, rx, ry);
  ctx.clip();
  ctx.fillStyle = rgb(p.hideShadow, 0.8);
  ctx.beginPath();
  ctx.ellipse(bx, by + 5, rx, ry * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit top offset up-left (light from upper-left)
  ctx.fillStyle = rgb(p.hideLight);
  ctx.beginPath();
  ctx.ellipse(bx - 2.5, by - 3.2, rx * 0.78, ry * 0.6, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // coarse bristly hair along the back — short dark strokes whose length and
  // count grow BOLDLY with coat volume (sleek spring → shaggy fluffy winter).
  const bristleLen = 2.0 + p.coatVolume * 5.2;
  const bristleN = Math.round(9 + p.coatVolume * 8);
  ctx.strokeStyle = rgb(p.bristle);
  ctx.lineWidth = 1.1 + p.coatVolume * 0.5;
  ctx.lineCap = "round";
  for (let i = 0; i < bristleN; i++) {
    const f = i / (bristleN - 1); // 0..1 along the back crest
    const ang = lerp(-2.5, -0.55, f); // sweep over the top arc, left→right
    const sx = bx + Math.cos(ang) * rx * 0.96;
    const sy = by + Math.sin(ang) * ry * 0.96;
    const jitter = (i % 2 === 0 ? 1 : 0.7) * bristleLen;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(ang) * jitter * 0.4, sy - jitter);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // healthy coat gloss (summer peak) — a soft warm band along the lit back
  if (p.glossAmt > 0.001) {
    ctx.save();
    bodyPath(ctx, bx, by, rx, ry);
    ctx.clip();
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = rgb([255, 240, 210], 0.42 * p.glossAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 2, by - 4, rx * 0.7, ry * 0.42, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // snow settled on the back (winter) — BOLD white cap over the hide
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgb([248, 252, 255], 0.95 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 1, by - 7.6, rx * 0.74, 3.4, -0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb([255, 255, 255], 0.9 * p.backSnowAmt);
    for (const [dx, dy] of [[-6, -8.2], [0, -8.8], [6, -8], [-2, -9.2]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.7 + p.coatVolume * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the hide (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([255, 255, 255], 0.8 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-9, -1], [-3, 3], [5, -2], [9, 2], [1, -4], [-5, -5], [8, 5],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // small curly tail at the upper-right rear — wags via pose
  ctx.strokeStyle = rgb(p.hideShadow);
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx + rx - 0.5, by - 2);
  ctx.quadraticCurveTo(bx + rx + 3.5 + pose.tail, by - 4, bx + rx + 2 + pose.tail, by - 0.5);
  ctx.quadraticCurveTo(bx + rx + 0.5 + pose.tail, by + 0.8, bx + rx + 2.2 + pose.tail, by + 1.2);
  ctx.stroke();
  ctx.lineCap = "butt";

  // ── HEAD (front-¾, lower-left) — broad snout that locks identity. Chews/tosses
  //    via pose: headBob dips it down, headToss lifts it up. ─────────────────
  const hx = bx - 13.5;
  const hy = by + 2.5 + pose.headBob - pose.headToss;

  // ears (small, upright triangles), behind the head. The near (right) ear
  // flicks with the chew/stamp.
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(hx + side * 3.2, hy - 5.5);
    const flick = side === 1 ? pose.earFlick * 0.5 : 0;
    ctx.rotate(side * 0.5 - 0.15 + side * flick);
    // outline
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.moveTo(-2.4, 2.2);
    ctx.quadraticCurveTo(-1.2, -3.2, 1.2, -2.6);
    ctx.quadraticCurveTo(2.4, -0.2, 2.2, 2.4);
    ctx.closePath();
    ctx.fill();
    // ear fill (hide) + inner snout-pink
    ctx.fillStyle = rgb(p.hideMid);
    ctx.beginPath();
    ctx.moveTo(-1.8, 1.8);
    ctx.quadraticCurveTo(-0.9, -2.4, 0.9, -1.9);
    ctx.quadraticCurveTo(1.8, -0.1, 1.6, 1.9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgb(p.snout, 0.7);
    ctx.beginPath();
    ctx.ellipse(0, 0.4, 0.8, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // head mass — a heavy brown wedge merging into the body
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(hx + 1, hy, 8.2, 7.4, 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.hideMid);
  ctx.beginPath();
  ctx.ellipse(hx + 1, hy, 7.4, 6.6, 0.08, 0, Math.PI * 2);
  ctx.fill();
  // cheek light (upper-left)
  ctx.fillStyle = rgb(p.hideLight, 0.85);
  ctx.beginPath();
  ctx.ellipse(hx - 1.4, hy - 2.4, 4, 3.4, -0.1, 0, Math.PI * 2);
  ctx.fill();

  // broad snout — a wide forward-jutting muzzle ending in a flat disc
  const snx = hx - 6;
  const sny = hy + 2.6;
  // muzzle bridge (hide) bridging head to snout disc
  ctx.fillStyle = rgb(p.hideMid);
  ctx.beginPath();
  ctx.moveTo(hx - 1, hy - 1.5);
  ctx.quadraticCurveTo(snx - 1, sny - 4, snx - 2.5, sny);
  ctx.quadraticCurveTo(snx - 1, sny + 4.5, hx - 1, hy + 4.5);
  ctx.closePath();
  ctx.fill();
  // the flat snout disc (broad), with a small chew/snort widen
  const snortW = 1 + pose.chew * 0.16;
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(snx - 2, sny, 3.6 * snortW, 4.4, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.snout);
  ctx.beginPath();
  ctx.ellipse(snx - 2, sny, 3 * snortW, 3.8, -0.15, 0, Math.PI * 2);
  ctx.fill();
  // two nostrils on the snout disc — flare a touch with the snort
  ctx.fillStyle = rgb([40, 24, 28]);
  for (const ny of [-1.2, 1.4]) {
    ctx.beginPath();
    ctx.ellipse(snx - 2.6, sny + ny, 0.7 + pose.chew * 0.3, 1.0, -0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  // snout-disc highlight (upper-left)
  ctx.fillStyle = rgb([255, 235, 232], 0.3);
  ctx.beginPath();
  ctx.ellipse(snx - 3.4, sny - 1.6, 1.1, 1.4, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // jaw / mouth — opens as it chews (a dark slit under the snout)
  if (pose.chew > 0.01) {
    ctx.fillStyle = rgb([26, 16, 18]);
    ctx.beginPath();
    ctx.ellipse(snx + 0.4, sny + 3.0, 1.6, 0.5 + pose.chew * 1.3, -0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // a couple of small lower tusks jutting up from the lower jaw
  ctx.strokeStyle = rgb(p.tusk);
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  for (const side of [0, 1]) {
    const tx = snx + 0.4 + side * 2.6;
    const ty = sny + 3.4;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx - 0.6, ty - 2.2, tx - 0.2, ty - 3.4);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // small dark eye on the head
  ctx.fillStyle = rgb([245, 242, 236]);
  ctx.beginPath();
  ctx.arc(hx + 0.6, hy - 1.4, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb([22, 16, 16]);
  ctx.beginPath();
  ctx.arc(hx + 0.9, hy - 1.3, 0.65, 0, Math.PI * 2);
  ctx.fill();

  // ── SCARF (winter) — a little knitted band around the neck, below the head ──
  if (p.scarfAmt > 0.001) {
    const scx = hx + 4.8;
    const scy = hy + 4.6;
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // wrap band
    ctx.fillStyle = rgb(p.scarfColor);
    ctx.beginPath();
    ctx.ellipse(scx, scy, 5.4, 3.0, 0.28, 0, Math.PI * 2);
    ctx.fill();
    // darker underside for depth
    ctx.fillStyle = rgb([
      Math.max(0, p.scarfColor[0] - 40),
      Math.max(0, p.scarfColor[1] - 40),
      Math.max(0, p.scarfColor[2] - 40),
    ]);
    ctx.beginPath();
    ctx.ellipse(scx + 0.6, scy + 1.4, 5.0, 1.6, 0.28, 0, Math.PI * 2);
    ctx.fill();
    // hanging tail of the scarf, with a knitted notch + fringe
    ctx.fillStyle = rgb(p.scarfColor);
    ctx.beginPath();
    ctx.moveTo(scx - 2.6, scy + 1.8);
    ctx.lineTo(scx + 1.0, scy + 2.4);
    ctx.lineTo(scx + 0.2, scy + 8.0);
    ctx.lineTo(scx - 3.2, scy + 7.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgb([
      Math.max(0, p.scarfColor[0] - 55),
      Math.max(0, p.scarfColor[1] - 55),
      Math.max(0, p.scarfColor[2] - 55),
    ]);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(scx - 1.4, scy + 3.2);
    ctx.lineTo(scx - 1.8, scy + 7.4);
    ctx.stroke();
    // fringe at the bottom
    ctx.strokeStyle = rgb(p.scarfColor);
    ctx.lineWidth = 0.9;
    ctx.lineCap = "round";
    for (const fx of [-3.0, -1.8, -0.6]) {
      ctx.beginPath();
      ctx.moveTo(scx + fx, scy + 7.4);
      ctx.lineTo(scx + fx - 0.2, scy + 9.0);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.restore();
  }

  ctx.restore(); // end squash/stretch transform

  // breath-fog puff at the snout (winter) — drawn OUTSIDE the squash transform so
  // it reads as air, not body. Static base puff + an exhale swell during the
  // chew/snort. Tracks the posed head/snout position.
  if (p.breathFogAmt > 0.001) {
    const fhx = bx - 13.5;
    const fhy = by + 2.5 + pose.headBob - pose.headToss;
    const fsnx = fhx - 6;
    const fsny = fhy + 2.6;
    const reach = 6 + pose.fogPuff * 3.4;
    ctx.fillStyle = rgb([235, 244, 255], (0.34 + 0.28 * pose.fogPuff) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(fsnx - reach, fsny + 0.6, 3.0 + pose.fogPuff * 2.0, 2.0 + pose.fogPuff * 1.4, 0.1, 0, Math.PI * 2);
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
    ctx.lineJoin = "round";
    paintPad(ctx, p);
    paintHog(ctx, p, pose);
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
  const x = clamp01(k);
  return Math.pow(smoother(x), bias);
}

// Staged transition. The whole-tile look lerps from SP[from] (p=0) to SP[to]
// (p=1) — so transition(0) === draw(from) and transition(1) === draw(to)
// EXACTLY (drawn at REST, matching the idle hand-off). The coat VOLUME leads
// (coat fluffs early); snow / frost / breath-fog / scarf LAG (settle late).
function makeTransition(fromIdx: 0 | 1 | 2) {
  const from = SEASON_NAMES[fromIdx];
  const to = SEASON_NAMES[fromIdx + 1];
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const p = clamp01(safeNum(pp, 0));
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
      const bx = 1;
      const by = 4;

      // Loose bristle/fluff motes lifting off the thickening coat — reads the
      // coat visibly fluffing/growing. Present in EVERY morph (deterministic in
      // p).
      const fluff = trans * (0.4 + 0.6 * Math.max(0, b.coatVolume - a.coatVolume + 0.4));
      if (fluff > 0.01) {
        ctx.fillStyle = rgb([255, 255, 255], 0.45 * fluff);
        const motes: Array<[number, number, number]> = [
          [-8, -8, 1.0], [3, -10, 1.3], [9, -6, 0.9], [-3, -11, 1.0],
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
          [-6, -9], [-1, -10], [4, -8.5], [7, -7],
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
        const hy = by + 2.5;
        const snx = hx - 6;
        const sny = hy + 2.6;
        ctx.fillStyle = rgb([235, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(snx - (5 + trans * 3), sny + 0.6, 2.6 + trans * 1.8, 1.8 + trans * 1.2, 0.1, 0, Math.PI * 2);
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
