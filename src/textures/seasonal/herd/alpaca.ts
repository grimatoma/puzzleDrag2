// Production seasonal art for the HERD ALPACA board tile (`tile_herd_alpaca`).
// The approved bold "bold & fun" direction, built to mirror the herd SHEEP
// reference architecture exactly: a single parameterized `paint(ctx, p, pose)`
// + four `P` presets + lerped transitions, pushed so the seasons read at a
// glance and the idle is a real, fun ACTION rather than a subtle breath.
//
// PALETTE LOCK: it is ALWAYS the same fluffy cream/tan alpaca — a rounded
// woolly fleece body on slender legs, a long upright neck, a small head with a
// fluffy topknot, perky ears, and big gentle eyes. Seasons change only its
// fleece VOLUME (recently-shorn slimmer in spring → thick fluffy winter
// fleece), the pad colour, the light wash, and BOLD dressing — snow on the
// back, a little winter SCARF, a breath-fog puff, blossoms, a fallen leaf,
// frost. The animal's identity colours never change and the silhouette outline
// is identical for every `P` (only volume scales it). Never morphs into
// another animal — it keeps the signature long neck + topknot.
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~0.9s): a CHEW — head bobs ~8–12px as it chews, with an
//     ear-flick, the long neck swaying, and a small body squash.
//   • RARE  ~18s (win ~1.2s, phase +3s): a HEAD-SHAKE / little HOP ("pronk") —
//     anticipation crouch → a springy ~14–18px hop with a head shake → settle.
//     The hop may lift OUTSIDE the −24..+24 design box.
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

// guard a non-finite scalar (NaN / ±Infinity) back to a safe fallback
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
// roughly −0.18..+1 (negative = squash-down crouch, positive = airborne).
function hopShape(q: number): number {
  if (q <= 0 || q >= 1) return 0;
  const antiEnd = 0.22; // first slice = crouch/anticipation
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
  bob: number; // whole-body vertical lift (design px, + = up). Hop uses this.
  lean: number; // signed whole-body lean (radians) during the head-shake/hop
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  head: number; // extra head dip (design px, + = down) for the chew
  chew: number; // 0..1 chew/jaw amount (drives the breath-fog exhale)
  ear: number; // 0..1 near-ear flick amount
  neck: number; // signed neck sway (radians) — the long neck sways as it chews
  hop: number; // 0..1 head-shake intensity during the rare gesture
}

const REST: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, chew: 0, ear: 0, neck: 0, hop: 0 };

// Build a pose from the wall clock: a common CHEW every ~6s and a rare HOP /
// head-shake every ~18s. Returns to REST (all zeros / unit scales) at every
// window edge.
function poseFromClock(tIn: number): Pose {
  const t = safeNum(tIn, 0);
  const pose: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, chew: 0, ear: 0, neck: 0, hop: 0 };

  // COMMON ~6s: CHEW (win ~0.9s). Head bobs ~8–12px, jaw chatters, near-ear
  // flicks, the long neck sways. Built from raised-cosine windows → seamless.
  // Phase 3.0 opens the window at t≈3.0 (well clear of t=0, so anim(0) sits
  // exactly at REST).
  const cq = actionQ(t, 6, 0.9, 3.0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window
    // two chew bobs within the window (head dips down ~8–12px at the peak)
    pose.head = env * (5.0 + 6.5 * Math.abs(Math.sin(cq * Math.PI * 2)));
    pose.chew = env * (0.5 + 0.5 * Math.abs(Math.sin(cq * Math.PI * 2)));
    pose.ear = env;
    pose.neck = Math.sin(cq * Math.PI * 4) * env * 0.1; // gentle neck sway
  }

  // RARE ~18s: HEAD-SHAKE / little HOP ("pronk", win ~1.2s, phase +3s relative
  // to the chew phase = 4.0). Whole alpaca bounces ~14–18px up with a squash
  // before and a stretch during, and shakes its head. May lift OUTSIDE the box.
  const hq = actionQ(t, 18, 1.2, 4.0);
  if (hq >= 0) {
    const s = hopShape(hq); // −0.18..+1 (crouch then arc)
    const env = bump(hq); // for the head-shake / lean envelopes
    pose.bob = Math.max(0, s) * 16; // up to ~16px airborne (14–18px range)
    if (s < 0) {
      // anticipation crouch: squash down/wide
      const c = -s; // 0..0.18
      pose.squashY = 1 - c * 0.9;
      pose.squashX = 1 + c * 0.7;
    } else {
      // airborne: stretch tall/narrow at the apex
      pose.squashY = 1 + s * 0.14;
      pose.squashX = 1 - s * 0.1;
    }
    // a springy head shake + neck flag during the hop
    pose.hop = env;
    pose.neck += Math.sin(hq * Math.PI * 8) * env * 0.18;
    pose.lean = Math.sin(hq * Math.PI * 4) * env * 0.05;
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────

interface P {
  fleeceLight: RGB; // bright top of the cream/tan fleece
  fleeceShadow: RGB; // shaded underside of the fleece
  faceDark: RGB; // muzzle + legs + ear tips (the darker parts)
  faceLight: RGB; // soft tan of the head/neck wool
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  fleeceVolume: number; // 0..1 BOLD puff of the fleece (shorn → thick winter)
  glossAmt: number; // 0..1 healthy fleece gloss (peak summer → dulled autumn)
  frostAmt: number; // 0..1 frost sparkle on the fleece
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 blossom on the pad
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad
  breathFogAmt: number; // 0..1 breath puff at the nose
  scarfAmt: number; // 0..1 a little winter SCARF (tweened alpha)
  scarfColor: RGB; // scarf colour (locked, fades in via alpha)
}

// Four BOLD season presets. The alpaca stays the SAME cream/tan fluffy alpaca;
// only volume + gloss + pad + light + dressing differ — pushed HARD so each
// season reads at a glance.
const SP: Record<SeasonName, P> = {
  Spring: {
    fleeceLight: [248, 238, 214], // light recently-shorn cream
    fleeceShadow: [216, 198, 162],
    faceDark: [120, 96, 70],
    faceLight: [236, 218, 186],
    padGrass: [122, 210, 80], // vivid fresh lime
    soil: [82, 138, 50],
    outline: [92, 72, 50],
    lightWash: [200, 238, 255], // cool-bright
    lightWashAmt: 0.2,
    fleeceVolume: 0.08, // BOLD: clearly recently-shorn, sleeker coat
    glossAmt: 0.28,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.9,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  Summer: {
    fleeceLight: [246, 232, 202], // full healthy warm cream/tan (PEAK)
    fleeceShadow: [212, 190, 152],
    faceDark: [116, 90, 64],
    faceLight: [230, 210, 176],
    padGrass: [78, 178, 60], // saturated mid-green
    soil: [50, 116, 36],
    outline: [88, 66, 46],
    lightWash: [255, 240, 188], // bright warm
    lightWashAmt: 0.22,
    fleeceVolume: 0.52, // full healthy fleece
    glossAmt: 0.95, // glossy peak
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  Autumn: {
    fleeceLight: [240, 224, 188], // warm-tinted tan
    fleeceShadow: [206, 178, 134],
    faceDark: [112, 84, 58],
    faceLight: [226, 202, 162],
    padGrass: [164, 138, 70], // olive-tan browning
    soil: [108, 82, 42],
    outline: [86, 62, 42],
    lightWash: [255, 188, 104], // low amber, BOLD
    lightWashAmt: 0.32,
    fleeceVolume: 0.78, // warm-tinted fuller fleece
    glossAmt: 0.3, // dulled gloss
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.95,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  Winter: {
    fleeceLight: [250, 246, 234], // cool-lit cream, still clearly cream
    fleeceShadow: [212, 206, 198],
    faceDark: [104, 84, 70],
    faceLight: [226, 216, 200],
    padGrass: [224, 234, 246], // snow on the pad
    soil: [148, 168, 192],
    outline: [82, 74, 74],
    lightWash: [192, 214, 250], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    fleeceVolume: 1, // BOLD: thick fluffy winter fleece
    glossAmt: 0.18,
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
    fleeceLight: lerpRGB(a.fleeceLight, b.fleeceLight, t),
    fleeceShadow: lerpRGB(a.fleeceShadow, b.fleeceShadow, t),
    faceDark: lerpRGB(a.faceDark, b.faceDark, t),
    faceLight: lerpRGB(a.faceLight, b.faceLight, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    fleeceVolume: lerp(a.fleeceVolume, b.fleeceVolume, t),
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
    fleeceVolume: clamp01(p.fleeceVolume),
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

// the low flat grass pad the alpaca stands on
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

// one slender leg: a thin dark cylinder with a soft foot at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number, dim = false): void {
  ctx.save();
  if (dim) ctx.globalAlpha = 0.85;
  ctx.strokeStyle = rgba(p.faceDark);
  ctx.lineWidth = 2.2; // slender alpaca legs (thinner than a sheep's)
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // foot
  ctx.fillStyle = rgba([54, 40, 30]);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 1.6, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
  ctx.restore();
}

// the fluffy fleece body — a rounded woolly mass whose lumps grow BOLDLY with
// volume. (constant silhouette: only the puff scale changes between seasons.)
function paintFleeceBody(
  ctx: CanvasRenderingContext2D,
  p: P,
  cx: number,
  cy: number,
  fill: string,
  scallop: number,
): void {
  // BOLD volume: from clearly-shorn slim to thick fluffy winter fleece
  const vol = 0.78 + p.fleeceVolume * 0.5;
  const rx = 11.5 * vol;
  const ry = 8.4 * vol;
  ctx.fillStyle = fill;
  // base body ellipse
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  // scalloped wool lumps around the perimeter — bigger with volume
  const lumps = 11;
  const lumpR = (1.8 + p.fleeceVolume * 2.4) * scallop;
  for (let i = 0; i < lumps; i++) {
    const a = (i / lumps) * Math.PI * 2 - Math.PI / 2;
    const lx = cx + Math.cos(a) * rx * 0.98;
    const ly = cy + Math.sin(a) * ry * 0.98;
    ctx.beginPath();
    ctx.arc(lx, ly, lumpR, 0, Math.PI * 2);
    ctx.fill();
  }
}

// the long upright neck + small head, swung by `swing` (radians) for idle sway
// and shaken by `shake` (0..1) for the rare head-shake. Drawn as its own helper
// so the neck can sway/shake as a unit around its base.
function paintNeckHead(
  ctx: CanvasRenderingContext2D,
  p: P,
  baseX: number,
  baseY: number,
  swing: number,
  earFlick: number,
  shake: number,
): void {
  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.rotate(swing); // gentle sway/shake pivots the whole neck at its base

  // ── NECK — a tall woolly column rising up toward the head (constant shape)
  const neckTopX = -2.4;
  const neckTopY = -16;
  // outline pass
  ctx.strokeStyle = rgba(p.outline);
  ctx.lineCap = "round";
  ctx.lineWidth = 8 + p.fleeceVolume * 2.4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-3.2, -8, neckTopX, neckTopY);
  ctx.stroke();
  // shaded fleece column
  ctx.strokeStyle = rgba(p.fleeceShadow);
  ctx.lineWidth = 6.4 + p.fleeceVolume * 2.4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-3.2, -8, neckTopX, neckTopY);
  ctx.stroke();
  // light fleece column, offset up-left (light from upper-left)
  ctx.strokeStyle = rgba(p.fleeceLight);
  ctx.lineWidth = 4 + p.fleeceVolume * 2;
  ctx.beginPath();
  ctx.moveTo(-1, -1);
  ctx.quadraticCurveTo(-4.2, -9, neckTopX - 1, neckTopY - 1);
  ctx.stroke();
  ctx.lineCap = "butt";

  // ── HEAD — small, at the top of the neck, turned toward lower-left ──────────
  // the head wobbles a touch extra during the head-shake
  const hx = neckTopX - 1.6 + Math.sin(shake * Math.PI * 6) * shake * 1.2;
  const hy = neckTopY - 3.4;

  // ears (perky, upright) — behind the head; one flicks in idle
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(hx + side * 2.2, hy - 3);
    const flick = side === 1 ? earFlick : 0; // right (near) ear flicks
    ctx.rotate(side * 0.34 + flick * 0.5 + shake * 0.2 * side);
    // outline
    ctx.fillStyle = rgba(p.outline);
    ctx.beginPath();
    ctx.ellipse(0, -2.6, 1.8, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // fleece-tan ear
    ctx.fillStyle = rgba(p.faceLight);
    ctx.beginPath();
    ctx.ellipse(0, -2.6, 1.2, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // dark inner tip
    ctx.fillStyle = rgba(p.faceDark);
    ctx.beginPath();
    ctx.ellipse(0, -1.6, 0.6, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // head outline
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 4.4, 4.0, 0, 0, Math.PI * 2);
  ctx.fill();
  // head — soft tan fleece dome
  ctx.fillStyle = rgba(p.faceLight);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 3.7, 3.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // fluffy topknot (the alpaca's signature crown tuft) — sits above the head,
  // puffs BOLDLY with fleece volume
  ctx.fillStyle = rgba(p.fleeceLight);
  for (const [tx, ty, tr] of [[-1.4, -3.6, 1.9], [1.2, -4, 1.7], [-0.2, -4.6, 1.5]] as const) {
    ctx.beginPath();
    ctx.arc(hx + tx, hy + ty, tr * (0.82 + p.fleeceVolume * 0.4), 0, Math.PI * 2);
    ctx.fill();
  }

  // muzzle — a short darker snout toward lower-left (gentle face)
  ctx.fillStyle = rgba(p.faceDark);
  ctx.beginPath();
  ctx.ellipse(hx - 2.4, hy + 2.2, 2.4, 1.8, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // gentle cheek light (upper-left)
  ctx.fillStyle = rgba([255, 255, 255], 0.12);
  ctx.beginPath();
  ctx.ellipse(hx - 1.4, hy - 1.2, 1.6, 1.9, 0, 0, Math.PI * 2);
  ctx.fill();
  // eyes — big and gentle
  ctx.fillStyle = rgba([36, 28, 24]);
  for (const [ex, ey] of [[-2.1, -0.2], [0.6, -0.4]] as const) {
    ctx.beginPath();
    ctx.arc(hx + ex, hy + ey, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  // tiny eye glints
  ctx.fillStyle = rgba([255, 255, 255], 0.85);
  for (const [ex, ey] of [[-2.3, -0.5], [0.4, -0.7]] as const) {
    ctx.beginPath();
    ctx.arc(hx + ex, hy + ey, 0.34, 0, Math.PI * 2);
    ctx.fill();
  }
  // nostril dots on the muzzle
  ctx.fillStyle = rgba([24, 18, 16]);
  for (const ex of [-3.2, -2.0]) {
    ctx.beginPath();
    ctx.ellipse(hx + ex, hy + 2.8, 0.42, 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── SCARF (winter) — a little knitted band wrapped round the neck base ──────
  if (p.scarfAmt > 0.001) {
    const sx = 0;
    const sy = -4.5;
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // wrap band around the neck column
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 5.2, 2.8, -0.18, 0, Math.PI * 2);
    ctx.fill();
    // darker underside for depth
    ctx.fillStyle = rgba([
      Math.max(0, p.scarfColor[0] - 50),
      Math.max(0, p.scarfColor[1] - 30),
      Math.max(0, p.scarfColor[2] - 30),
    ]);
    ctx.beginPath();
    ctx.ellipse(sx + 0.4, sy + 1.3, 4.8, 1.5, -0.18, 0, Math.PI * 2);
    ctx.fill();
    // hanging tail of the scarf down the front, with a knitted seam + fringe
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.moveTo(sx - 3.0, sy + 1.4);
    ctx.lineTo(sx + 0.4, sy + 2.0);
    ctx.lineTo(sx - 0.6, sy + 8.0);
    ctx.lineTo(sx - 4.0, sy + 7.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba([
      Math.max(0, p.scarfColor[0] - 60),
      Math.max(0, p.scarfColor[1] - 40),
      Math.max(0, p.scarfColor[2] - 40),
    ]);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sx - 1.8, sy + 2.8);
    ctx.lineTo(sx - 2.4, sy + 7.4);
    ctx.stroke();
    // fringe at the bottom
    ctx.strokeStyle = rgba(p.scarfColor);
    ctx.lineWidth = 0.9;
    ctx.lineCap = "round";
    for (const fx of [-3.6, -2.4, -1.2]) {
      ctx.beginPath();
      ctx.moveTo(sx + fx, sy + 7.4);
      ctx.lineTo(sx + fx - 0.2, sy + 9.0);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.restore();
  }

  ctx.restore();
}

// the whole alpaca, standing front-¾ turned toward lower-left, posed by `pose`
function paintAlpaca(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  // legs stay PLANTED on the pad (they don't lift with the hop — they stretch).
  const bx = 1;
  const bodyY = 6 - pose.bob; // body centre lifts during the hop
  const legTop = bodyY + 5; // where the legs meet the fleece

  // legs first (behind the fleece). Slender; tall alpaca stance, contact on pad.
  // back legs slightly higher contact + dimmer for depth
  paintLeg(ctx, p, bx + 6, legTop, 18.6, true);
  paintLeg(ctx, p, bx - 5.5, legTop, 18.9, true);
  // front legs
  paintLeg(ctx, p, bx + 3, legTop, 19.2);
  paintLeg(ctx, p, bx - 3, legTop, 19.4);

  // The whole upper body (fleece + neck + head + dressing) is drawn under a
  // squash/stretch + lean transform centred on the body, so the hop reads with
  // anticipation squash + airborne stretch and the pronk lean.
  ctx.save();
  ctx.translate(bx, bodyY);
  ctx.rotate(pose.lean);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-bx, -bodyY);

  const by = bodyY;

  // FLEECE BODY — dark outline pass first, then shade, then light (layered)
  paintFleeceBody(ctx, p, bx, by, rgba(p.outline), 1.18); // outline halo
  paintFleeceBody(ctx, p, bx, by, rgba(p.fleeceShadow), 1.0); // shaded fleece
  // light fleece offset up-left (light from upper-left)
  ctx.save();
  ctx.translate(-1.4, -1.6);
  paintFleeceBody(ctx, p, bx, by, rgba(p.fleeceLight), 0.82);
  ctx.restore();

  // healthy fleece GLOSS — a soft highlight sheen on the wool (peak in summer,
  // dulled in autumn/winter). Painted as soft-light so it reads as sheen.
  if (p.glossAmt > 0.001) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = rgba([255, 255, 255], 0.5 * p.glossAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 3, by - 3, 5.5, 3.4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // small fluffy tail tuft at the upper-right rear of the fleece
  ctx.fillStyle = rgba(p.fleeceLight);
  ctx.beginPath();
  ctx.arc(bx + 11, by - 2, 2.2 + p.fleeceVolume * 0.8, 0, Math.PI * 2);
  ctx.fill();

  // snow settled on the back (winter) — BOLD white cap on top of the fleece
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgba([248, 252, 255], 0.95 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 1, by - 7.2, 9 * (0.9 + p.fleeceVolume * 0.35), 3.4, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.9 * p.backSnowAmt);
    for (const [dx, dy] of [[-5, -8], [0, -8.6], [5, -7.6], [-2, -9]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.6 + p.fleeceVolume * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the fleece (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgba([255, 255, 255], 0.85 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-7, 0], [-3, 4], [4, -2], [7, 2], [0, -3], [-4, -5], [6, 4],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── NECK + HEAD — long upright neck rising from the front of the fleece ─────
  // neck base sits at the front-upper-left of the body; the chew dips the head
  // (head pose) and sways the neck (neck pose); the rare gesture shakes it.
  const neckBaseX = bx - 6;
  const neckBaseY = by - 4 + pose.head * 0.6; // chew dips the neck base/head down
  paintNeckHead(ctx, p, neckBaseX, neckBaseY, pose.neck, pose.ear, pose.hop);

  ctx.restore(); // end squash/stretch/lean transform

  // breath-fog puff at the nose (winter) — drawn OUTSIDE the squash transform so
  // it reads as air, not body. Static base puff + an exhale swell during chew.
  if (p.breathFogAmt > 0.001) {
    const neckBaseX = bx - 6;
    const neckBaseY = by - 4 + pose.head * 0.6;
    // approximate head/nose position under the live neck sway (small-angle)
    const noseX = neckBaseX - 8 - pose.neck * 16;
    const noseY = neckBaseY - 17 + pose.head * 0.4;
    const reach = 4.4 + pose.chew * 3.2;
    ctx.fillStyle = rgba([235, 244, 255], (0.34 + 0.28 * pose.chew) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(noseX - reach, noseY + 2, 2.8 + pose.chew * 2.0, 1.9 + pose.chew * 1.4, 0.2, 0, Math.PI * 2);
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
  ctx.ellipse(0, 2, 26, 27, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── THE single paint ────────────────────────────────────────────────────────

function paint(ctx: CanvasRenderingContext2D, pIn: P, pose: Pose): void {
  const p = clampP(pIn);
  ctx.save();
  try {
    paintPad(ctx, p);
    paintAlpaca(ctx, p, pose);
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
// EXACTLY (drawn at REST, matching the idle hand-off). The fleece VOLUME leads
// (coat fluffs early); snow / frost / breath-fog / scarf LAG (settle late).
function makeTransition(fromIdx: 0 | 1 | 2) {
  const from = SEASON_NAMES[fromIdx];
  const to = SEASON_NAMES[fromIdx + 1];
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const p = clamp01(safeNum(pp, 0));
    const kBase = smoother(p);
    const kCoat = biasedEase(p, 0.62); // fleece volume LEADS
    const kSnow = biasedEase(p, 1.7); // snow / frost / fog / scarf LAG

    const a = SP[from];
    const b = SP[to];
    const blended: P = lerpP(a, b, kBase);
    blended.fleeceVolume = lerp(a.fleeceVolume, b.fleeceVolume, kCoat);
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

      // Loose fluff motes lifting off the thickening coat — reads the fleece
      // visibly fluffing/growing. Present in EVERY morph (deterministic in p).
      const fluff = trans * (0.4 + 0.6 * Math.max(0, b.fleeceVolume - a.fleeceVolume + 0.4));
      if (fluff > 0.01) {
        ctx.fillStyle = rgba([255, 255, 255], 0.5 * fluff);
        const motes: Array<[number, number, number]> = [
          [-7, -8, 1.1], [3, -9, 1.3], [8, -6, 0.9], [-2, -10, 1.0],
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
        const noseX = bx - 6 - 8;
        const noseY = by - 4 - 17;
        ctx.fillStyle = rgba([235, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(noseX - (4 + trans * 3), noseY + 2, 2.6 + trans * 1.8, 1.8 + trans * 1.2, 0.2, 0, Math.PI * 2);
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
