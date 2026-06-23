// Production seasonal art for the HERD WARTHOG board tile (`tile_herd_warthog`)
// — the approved bold direction. A single parameterized `paint(ctx, p, pose)` +
// four `P` presets + lerped transitions, pushed so the seasons read at a glance
// and the idle is a real, fun ACTION rather than a subtle breath.
//
// PALETTE LOCK: it is ALWAYS the same grey-brown warthog — a big flat warty
// head with two pairs of curved upward TUSKS, a spiky tufted MANE / mohawk
// running down the neck/back, thin legs, and a thin tufted tail. Seasons change
// only its coat VOLUME (sleek spring → shaggy fuller winter mane), the pad
// colour, the light wash, and BOLD dressing — snow on the back, a little winter
// SCARF, a breath-fog puff, blossom, a fallen leaf, frost. The animal's
// identity colours never change; the silhouette outline is identical for every
// `P` (only the mane volume scales).
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~0.9s): a CHEW + ear-flick + mane twitch — head bobs
//     ~10px as it chews, the near ear flicks, the tail wags, body squashes.
//   • RARE  ~18s (win ~1.2s, phase +3s): a HEAD-TOSS / kneel-root — the warthog
//     tosses its tusked head and roots/stamps (~16px) then settles
//     (anticipation → toss → settle). The head may swing OUTSIDE the −24..+24
//     design box at the apex.
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
  return x < 0 || Number.isNaN(x) ? 0 : x > 1 ? 1 : x;
}

// guard a non-finite scalar (NaN / ±Infinity) to a safe default
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

// Anticipation→action shape for the HEAD-TOSS / root: a brief dip-down/kneel
// (negative) before the toss, then a clean arc up and settle. q∈[0,1]. Returns a
// TOSS factor in roughly −0.2..+1 (negative = kneel/root crouch, positive =
// head thrown up). Zero value and slope at both ends.
function tossShape(q: number): number {
  if (q <= 0 || q >= 1) return 0;
  const antiEnd = 0.24; // first slice = kneel/root anticipation
  if (q < antiEnd) {
    // dip down a little (root into the ground), zero slope at q=0
    const a = q / antiEnd;
    return -0.2 * (0.5 - 0.5 * Math.cos(a * Math.PI));
  }
  // toss arc up, zero at the seam to the kneel and at q=1
  const a = (q - antiEnd) / (1 - antiEnd);
  return Math.sin(a * Math.PI);
}

// ── The idle POSE (carries all action state into paint) ──────────────────────

interface Pose {
  bob: number; // whole-body vertical bob (design px, + = up). Head-toss uses this.
  lean: number; // signed body lean / head swing (design px sideways at the head)
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  head: number; // extra head dip (design px, + = down) for the chew
  chew: number; // 0..1 jaw open amount for the chew
  ear: number; // 0..1 near-ear flick amount
  tail: number; // signed tail wag (design px sideways)
  hop: number; // 0..1 extra breath-fog reach (winter chew exhale)
}

const REST: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, chew: 0, ear: 0, tail: 0, hop: 0 };

// Build a pose from the wall clock: a common CHEW every ~6s and a rare
// HEAD-TOSS every ~18s. Returns to REST (all zeros / unit scales) at every
// window edge.
function poseFromClock(tIn: number): Pose {
  const t = safeNum(tIn, 0);
  const pose: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, chew: 0, ear: 0, tail: 0, hop: 0 };

  // COMMON ~6s: CHEW (win ~0.9s). Head bobs ~10px, jaw chatters, the near ear
  // flicks, the tail wags, the body squashes a touch. Built from raised-cosine
  // windows → seamless. Phase 3.0 opens the window at t≈3.0 (well clear of t=0,
  // so anim(0) sits exactly at REST).
  const cq = actionQ(t, 6, 0.9, 3.0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window
    // two chew bobs within the window (head dips down ~10px at the peak)
    pose.head = env * (4.0 + 6.0 * Math.abs(Math.sin(cq * Math.PI * 2)));
    pose.chew = env * (0.5 + 0.5 * Math.abs(Math.sin(cq * Math.PI * 2)));
    pose.ear = env;
    pose.tail = Math.sin(cq * Math.PI * 6) * env * 2.6; // a few wags sideways
    pose.hop = env; // winter: an exhale puff as it chews
    // a little body squash as it chews down
    pose.squashY = 1 - env * 0.05;
    pose.squashX = 1 + env * 0.04;
  }

  // RARE ~18s: HEAD-TOSS / root (win ~1.2s). Anticipation kneel → the warthog
  // tosses its tusked head up ~16px and swings, then settles. The head may
  // swing OUTSIDE the design box at the apex. Phase 3.0 keeps the window clear
  // of t=0 (and offset from the chew so they don't stack at the seam).
  const hq = actionQ(t, 18, 1.2, 3.0);
  if (hq >= 0) {
    const s = tossShape(hq); // −0.2..+1 (kneel then toss)
    const env = bump(hq);
    pose.bob = Math.max(0, s) * 16; // up to ~16px head/body toss-up
    if (s < 0) {
      // kneel/root anticipation: squash down/wide, head dips into the ground
      const c = -s; // 0..0.2
      pose.squashY = 1 - c * 0.85;
      pose.squashX = 1 + c * 0.6;
      pose.head += c * 14; // snout roots down
    } else {
      // tossing: stretch tall/narrow as the head throws up
      pose.squashY = 1 + s * 0.12;
      pose.squashX = 1 - s * 0.08;
    }
    // a tusked head swing sideways through the toss + a tail flag
    pose.lean += Math.sin(hq * Math.PI * 2) * env * 5.0;
    pose.tail += Math.sin(hq * Math.PI) * 1.6;
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────

interface P {
  hideLight: RGB; // lit top of the grey-brown hide
  hideMid: RGB; // body tone
  hideShadow: RGB; // shaded belly / underside / legs
  maneDark: RGB; // spiky mane mohawk + tail tuft
  tusk: RGB; // pale curved tusks
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  coatVolume: number; // 0..1 BOLD fullness of the spiky mane (sleek spring → shaggy winter)
  glossAmt: number; // 0..1 coat gloss / sheen (peak in summer, dulled autumn)
  frostAmt: number; // 0..1 frost sparkle on the hide
  backSnowAmt: number; // 0..1 snow settled on its back / mane
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 a blossom on the pad
  fallenLeafAmt: number; // 0..1 a fallen leaf on the pad
  breathFogAmt: number; // 0..1 breath puff at the snout
  scarfAmt: number; // 0..1 a little winter SCARF (tweened alpha)
  scarfColor: RGB; // scarf colour (locked, fades in via alpha)
}

// Four BOLD season presets. The warthog stays the SAME grey-brown warty animal
// with its signature tusks + mane mohawk; only mane volume + gloss + pad +
// light + dressing differ — pushed HARD so each season reads at a glance.
const SP: Record<SeasonName, P> = {
  // Spring — sleeker coat, dewy lime pad + a blossom; cool-bright light.
  Spring: {
    hideLight: [158, 152, 146],
    hideMid: [120, 114, 110],
    hideShadow: [82, 78, 76],
    maneDark: [62, 56, 50],
    tusk: [236, 230, 214],
    padGrass: [126, 206, 84], // vivid fresh lime
    soil: [86, 138, 54],
    outline: [44, 40, 36],
    lightWash: [206, 240, 255], // cool-bright
    lightWashAmt: 0.2,
    coatVolume: 0.14, // BOLD: clearly sleeker, slim mane
    glossAmt: 0.18,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.9,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  // Summer — glossy coat (PEAK), saturated mid-green pad; bright warm light.
  Summer: {
    hideLight: [166, 160, 152],
    hideMid: [124, 118, 112],
    hideShadow: [80, 76, 72],
    maneDark: [60, 54, 46],
    tusk: [242, 236, 218],
    padGrass: [82, 178, 60], // saturated mid-green
    soil: [54, 116, 38],
    outline: [42, 38, 32],
    lightWash: [255, 240, 184], // bright warm
    lightWashAmt: 0.22,
    coatVolume: 0.5, // full normal mane
    glossAmt: 0.9, // peak glossy coat
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  // Autumn — warm-tinted coat, fuller mane, olive-tan pad + a fallen leaf;
  // dulled gloss, low amber light.
  Autumn: {
    hideLight: [164, 148, 130],
    hideMid: [124, 110, 94],
    hideShadow: [84, 72, 58],
    maneDark: [62, 50, 38],
    tusk: [236, 224, 198],
    padGrass: [168, 138, 70], // olive-tan browning
    soil: [110, 84, 42],
    outline: [46, 38, 30],
    lightWash: [255, 188, 100], // low amber, BOLD
    lightWashAmt: 0.3,
    coatVolume: 0.78, // fuller mane tuft
    glossAmt: 0.22, // dulled gloss
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.95,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  // Winter — SHAGGIER thick coat / fuller mane, snow on the back, a little
  // scarf, a breath-fog puff, frost, snowy pad; cool blue-grey light.
  Winter: {
    hideLight: [160, 162, 170],
    hideMid: [116, 118, 126],
    hideShadow: [78, 80, 90],
    maneDark: [64, 60, 64],
    tusk: [242, 240, 232],
    padGrass: [224, 236, 248], // snow on the pad
    soil: [150, 168, 192],
    outline: [54, 52, 60],
    lightWash: [192, 214, 252], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    coatVolume: 1, // BOLD: thick shaggy mane
    glossAmt: 0.12,
    frostAmt: 0.85,
    backSnowAmt: 0.92,
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
    hideLight: lerpRGB(a.hideLight, b.hideLight, t),
    hideMid: lerpRGB(a.hideMid, b.hideMid, t),
    hideShadow: lerpRGB(a.hideShadow, b.hideShadow, t),
    maneDark: lerpRGB(a.maneDark, b.maneDark, t),
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

// the low flat grass pad the warthog stands on
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
    for (const [bx, by] of [[-12, 18.5], [9, 20], [0, 21], [14, 19], [-5, 20.4]] as const) {
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

// one thin leg: a slim dark-grey cylinder with a hoof at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  ctx.strokeStyle = rgba(p.hideShadow);
  ctx.lineWidth = 2.4; // thin legs
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // hoof
  ctx.fillStyle = rgba([26, 22, 22]);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 1.6, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// the spiky tufted MANE mohawk running along the neck/back; spikes grow BOLDLY
// with volume (sleek spring → shaggy winter)
function paintMane(
  ctx: CanvasRenderingContext2D,
  p: P,
  pts: Array<[number, number]>,
  fill: string,
  scale: number,
): void {
  ctx.fillStyle = fill;
  const spikeH = (2.6 + p.coatVolume * 5.0) * scale;
  const halfW = 1.7 + p.coatVolume * 0.7; // shaggier = chunkier spikes
  for (let i = 0; i < pts.length; i++) {
    const [sx, sy] = pts[i];
    // alternate spike heights for a ragged tuft
    const h = spikeH * (i % 2 === 0 ? 1 : 0.7);
    ctx.beginPath();
    ctx.moveTo(sx - halfW, sy);
    ctx.lineTo(sx + (i - pts.length / 2) * 0.2, sy - h);
    ctx.lineTo(sx + halfW, sy);
    ctx.closePath();
    ctx.fill();
  }
}

// the lean grey body — an elongated low ellipse (constant silhouette)
function paintHideBody(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  fill: string,
  scale: number,
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 13 * scale, 7.6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

// the whole warthog, standing front-¾ turned toward lower-left, posed by `pose`
function paintWarthog(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  // legs stay PLANTED on the pad (they don't lift with the toss — they stretch).
  const bx = 0;
  const bodyY = 5 - pose.bob; // body centre lifts during the head-toss
  const legTop = bodyY + 5; // where the legs meet the body

  // legs first (behind the body). Two back (dimmer for depth), two front.
  ctx.save();
  ctx.globalAlpha = 0.85;
  paintLeg(ctx, p, bx + 7, legTop, 18.6);
  paintLeg(ctx, p, bx - 6, legTop, 18.9);
  ctx.restore();
  paintLeg(ctx, p, bx + 4, legTop, 19.2);
  paintLeg(ctx, p, bx - 3, legTop, 19.4);

  // The whole upper body (body + mane + head + tusks + dressing) is drawn under
  // a squash/stretch transform centred on the body, so the head-toss reads with
  // anticipation kneel + tossing stretch.
  ctx.save();
  ctx.translate(bx, bodyY);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-bx, -bodyY);

  const by = bodyY;

  // tail: a thin curved line trailing up-right ending in a tuft — wags via pose
  const tailX = bx + 12 + pose.tail;
  ctx.strokeStyle = rgba(p.hideShadow);
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx + 12, by);
  ctx.quadraticCurveTo(tailX + 4, by - 3, tailX + 3, by - 8);
  ctx.stroke();
  ctx.lineCap = "butt";
  // tail tuft (grows with volume)
  ctx.fillStyle = rgba(p.maneDark);
  ctx.beginPath();
  ctx.arc(tailX + 3, by - 8.5, 1.8 + p.coatVolume * 1.0, 0, Math.PI * 2);
  ctx.fill();

  // BODY — dark outline pass first, then shadow, then mid, then lit top
  paintHideBody(ctx, bx, by, rgba(p.outline), 1.12); // outline halo
  paintHideBody(ctx, bx, by, rgba(p.hideShadow), 1.0); // shaded body
  paintHideBody(ctx, bx, by, rgba(p.hideMid), 0.94); // mid tone
  // lit top offset up-left (light from upper-left)
  ctx.save();
  ctx.translate(-1.2, -1.8);
  paintHideBody(ctx, bx, by, rgba(p.hideLight), 0.7);
  ctx.restore();

  // coat gloss — a soft sheen sweep across the back (peaks in summer)
  if (p.glossAmt > 0.001) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = rgba([255, 255, 255], 0.34 * p.glossAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 2, by - 2.4, 7.5, 3.0, -0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // spiky tufted MANE mohawk from the crown down the neck/back (identity)
  const manePts: Array<[number, number]> = [
    [bx - 9.5, by - 4.5],
    [bx - 6.5, by - 6.6],
    [bx - 3, by - 7.4],
    [bx + 0.5, by - 7.4],
    [bx + 4, by - 6.8],
    [bx + 7.5, by - 5.6],
    [bx + 10.5, by - 4],
  ];
  paintMane(ctx, p, manePts, rgba(p.maneDark), 1.0);

  // snow settled on the back/mane (winter) — BOLD white cap
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgba([248, 252, 255], 0.95 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx + 1, by - 6.4, 9.5 * (0.9 + p.coatVolume * 0.3), 3.4, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.9 * p.backSnowAmt);
    for (const [dx, dy] of [[-5, -7.6], [1, -8.4], [6, -7.4], [-1, -9.0]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.6 + p.coatVolume * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the hide (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgba([255, 255, 255], 0.85 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-7, 1], [-2, 4], [4, -1], [8, 2], [0, -2], [-4, -3], [6, 4],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── HEAD (front-¾, lower-left) — big flat warty head that locks identity ───
  // the head dips/chews and swings via pose.head / pose.lean.
  const hx = bx - 12 - pose.lean;
  const hy = by + 2 + pose.head;

  // ears (dark grey), small and behind the head. The near ear flicks with chew.
  ctx.fillStyle = rgba(p.hideShadow);
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(hx + 1.5 + side * 2.2, hy - 5);
    const flick = side === 1 ? pose.ear * 0.7 : 0; // near ear (toward us) flicks
    ctx.rotate(side * 0.7 - 0.2 + side * flick);
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.4, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // head — a big flat ovoid extending into a broad snout toward lower-left
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(0.22 + pose.head * 0.015 - pose.lean * 0.01);
  // outline
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(-1.2, 0.6, 6.6, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // head fill (grey)
  ctx.fillStyle = rgba(p.hideMid);
  ctx.beginPath();
  ctx.ellipse(-1.2, 0.6, 5.9, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit cheek (upper-left)
  ctx.fillStyle = rgba(p.hideLight, 0.85);
  ctx.beginPath();
  ctx.ellipse(-2.6, -1.4, 3, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // broad flat snout disc at the lower-left
  ctx.fillStyle = rgba(p.hideShadow);
  ctx.beginPath();
  ctx.ellipse(-5.4, 2.6, 2.8, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // nostrils on the snout disc
  ctx.fillStyle = rgba([22, 18, 18]);
  for (const ex of [-0.9, 0.9]) {
    ctx.beginPath();
    ctx.ellipse(-5.4 + ex, 2.8, 0.55, 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // two facial WARTS (identity) — small grey bumps below/beside the eye
  ctx.fillStyle = rgba(p.hideLight);
  for (const [wx, wy] of [[-3.6, 1.2], [-1.0, -0.2]] as const) {
    ctx.beginPath();
    ctx.ellipse(wx, wy, 1.4, 1.0, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(p.outline, 0.6);
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
  // eye (one readable beady eye on the near side)
  ctx.fillStyle = rgba([245, 244, 238]);
  ctx.beginPath();
  ctx.arc(0.4, -1.6, 1.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([20, 18, 18]);
  ctx.beginPath();
  ctx.arc(0.6, -1.5, 0.58, 0, Math.PI * 2);
  ctx.fill();
  // mouth — opens as it chews
  if (pose.chew > 0.01) {
    ctx.fillStyle = rgba([18, 14, 14]);
    ctx.beginPath();
    ctx.ellipse(-3.4, 3.4, 1.5, 0.5 + pose.chew * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // two pairs of curved upward TUSKS jutting from the snout (identity)
  // each pair: a long upper tusk + a shorter lower tusk, curving up & out.
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(0.22 + pose.head * 0.015 - pose.lean * 0.01);
  ctx.lineCap = "round";
  const drawTusk = (
    baseX: number,
    baseY: number,
    dir: number,
    len: number,
    width: number,
  ): void => {
    // outline pass
    ctx.strokeStyle = rgba(p.outline);
    ctx.lineWidth = width + 1;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX + dir * 1.6, baseY - len * 0.5, baseX + dir * 1.0, baseY - len);
    ctx.stroke();
    // tusk fill (pale)
    ctx.strokeStyle = rgba(p.tusk);
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX + dir * 1.6, baseY - len * 0.5, baseX + dir * 1.0, baseY - len);
    ctx.stroke();
  };
  // near (front) pair from the snout
  drawTusk(-6.4, 3.2, -1, 5.2, 1.9); // upper, long
  drawTusk(-5.6, 3.6, -1, 3.0, 1.5); // lower, short
  // far pair, slightly behind & dimmer for the ¾ read
  ctx.globalAlpha = 0.85;
  drawTusk(-4.4, 3.4, -1, 4.2, 1.6);
  drawTusk(-3.8, 3.7, -1, 2.4, 1.3);
  ctx.globalAlpha = 1;
  ctx.lineCap = "butt";
  ctx.restore();

  // ── SCARF (winter) — a little knitted band around the neck, below the head ──
  if (p.scarfAmt > 0.001) {
    const sx = hx + 5.4;
    const sy = hy - 0.4;
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // wrap band
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 5.0, 2.8, 0.28, 0, Math.PI * 2);
    ctx.fill();
    // darker underside for depth
    ctx.fillStyle = rgba([
      Math.max(0, p.scarfColor[0] - 50),
      Math.max(0, p.scarfColor[1] - 30),
      Math.max(0, p.scarfColor[2] - 30),
    ]);
    ctx.beginPath();
    ctx.ellipse(sx + 0.6, sy + 1.3, 4.6, 1.5, 0.28, 0, Math.PI * 2);
    ctx.fill();
    // hanging tail of the scarf, with a knitted notch + fringe
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.moveTo(sx - 2.4, sy + 1.6);
    ctx.lineTo(sx + 1.0, sy + 2.2);
    ctx.lineTo(sx + 0.2, sy + 7.8);
    ctx.lineTo(sx - 3.0, sy + 7.0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba([
      Math.max(0, p.scarfColor[0] - 60),
      Math.max(0, p.scarfColor[1] - 40),
      Math.max(0, p.scarfColor[2] - 40),
    ]);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sx - 1.2, sy + 3.0);
    ctx.lineTo(sx - 1.6, sy + 7.2);
    ctx.stroke();
    // fringe at the bottom
    ctx.strokeStyle = rgba(p.scarfColor);
    ctx.lineWidth = 0.9;
    ctx.lineCap = "round";
    for (const fx of [-2.8, -1.6, -0.4]) {
      ctx.beginPath();
      ctx.moveTo(sx + fx, sy + 7.2);
      ctx.lineTo(sx + fx - 0.2, sy + 8.8);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.restore();
  }

  ctx.restore(); // end squash/stretch transform

  // breath-fog puff at the snout (winter) — drawn OUTSIDE the squash transform
  // so it reads as air, not body. Static base puff + an exhale swell during chew.
  if (p.breathFogAmt > 0.001) {
    const reach = 6.0 + pose.hop * 3.2;
    ctx.fillStyle = rgba([235, 244, 255], (0.34 + 0.28 * pose.hop) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(hx - reach, hy + 4, 3.0 + pose.hop * 2.0, 2.0 + pose.hop * 1.4, 0.2, 0, Math.PI * 2);
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
    paintWarthog(ctx, p, pose);
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
// EXACTLY (drawn at REST, matching the idle hand-off). The mane VOLUME leads
// (coat fluffs early); snow / frost / breath-fog / scarf LAG (settle late).
function makeTransition(fromIdx: 0 | 1 | 2) {
  const from = SEASON_NAMES[fromIdx];
  const to = SEASON_NAMES[fromIdx + 1];
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const p = clamp01(pp);
    const kBase = smoother(p);
    const kCoat = biasedEase(p, 0.62); // mane volume LEADS
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
      const bx = 0;
      const by = 5;

      // Loose fluff motes lifting off the thickening mane — reads the coat
      // visibly fluffing/growing. Present in EVERY morph (deterministic in p).
      const fluff = trans * (0.4 + 0.6 * Math.max(0, b.coatVolume - a.coatVolume + 0.4));
      if (fluff > 0.01) {
        ctx.fillStyle = rgba([210, 200, 190], 0.5 * fluff);
        const motes: Array<[number, number, number]> = [
          [-7, -8, 1.1], [2, -10, 1.4], [8, -6, 0.9], [-2, -11, 1.0],
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
          [-5, -9], [0, -10], [5, -8.5], [8, -7],
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
        const hx = bx - 12;
        const hy = by + 2;
        ctx.fillStyle = rgba([235, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(hx - (5 + trans * 3), hy + 4, 2.6 + trans * 1.8, 1.8 + trans * 1.2, 0.2, 0, Math.PI * 2);
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
