// Production seasonal art for the BIRD CHICKEN board tile — the approved bold
// "bold & fun" direction, mirroring the herd-sheep reference architecture. A
// single parameterized `paint(ctx, p, pose)` + four `P` presets + lerped
// transitions, pushed so the seasons read at a glance and the idle is a real,
// fun ACTION (a peck and a hop-flap) rather than a subtle breath.
//
// PALETTE LOCK: it is ALWAYS the same plump white/cream barnyard hen — a small
// red comb + wattle, an orange beak, on a small grassy pad. The body colour and
// silhouette stay constant in all four seasons. Seasons change ONLY her plumage
// fluff VOLUME (sleek recently-moulted spring → cold-puffed winter), the pad
// colour, the light wash, gloss, and BOLD dressing — snow on the back, a little
// winter SCARF, a breath-fog puff, frost, blossoms, a fallen leaf. The hen's
// identity colours never change; the silhouette outline is identical for every
// `P` (only volume scales it). Never morph her into another animal.
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~0.95s): a PECK + head-bob — the hen dips her head down
//     ~12px to peck the ground then bobs back up, with a small body squash and a
//     tail flick. Anticipation + settle.
//   • RARE  ~18s (win ~1.2s): a HOP + WING-FLAP — the whole hen hops ~16px up
//     flapping her wings (anticipation crouch → hop with stretch → squash
//     landing → settle). The hop may lift OUTSIDE the −24..+24 design box.
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

// coerce any wild value to a finite number (guards pose / t / p)
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

// alias kept to mirror sheep's helper set name
function rgba(c: RGB, a: number): string {
  return rgb(c, a);
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
  bob: number; // whole-body vertical bob (design px, − = up). Hop lifts via this.
  lean: number; // small forward (left) lean during the peck (design px)
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  head: number; // extra head dip (design px, + = down)
  peck: number; // 0..1 peck commit (beak-open + reach)
  hop: number; // 0..1 wing-flap commit (independent of lift)
  wing: number; // signed wing-spread amount (design px) for the flap
  tail: number; // signed tail flick (design px)
  fog: number; // 0..1 extra breath-fog reach (winter exhale)
}

const REST: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, peck: 0, hop: 0, wing: 0, tail: 0, fog: 0 };

// sanitize a pose so paint never receives a non-finite field
function safePose(po: Pose): Pose {
  return {
    bob: safeNum(po.bob),
    lean: safeNum(po.lean),
    squashX: safeNum(po.squashX, 1),
    squashY: safeNum(po.squashY, 1),
    head: safeNum(po.head),
    peck: clamp01(safeNum(po.peck)),
    hop: clamp01(safeNum(po.hop)),
    wing: safeNum(po.wing),
    tail: safeNum(po.tail),
    fog: clamp01(safeNum(po.fog)),
  };
}

// Build a pose from the wall clock: a common PECK every ~6s and a rare HOP +
// WING-FLAP every ~18s. Returns to REST (all zeros / unit scales) at every
// window edge.
function poseFromClock(tIn: number): Pose {
  const t = safeNum(tIn);
  const pose: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, peck: 0, hop: 0, wing: 0, tail: 0, fog: 0 };

  // COMMON ~6s: PECK + head-bob (win ~0.95s). The head dips down ~12px to peck
  // the ground then bobs back up, with a small body squash and a tail flick.
  // Built from raised-cosine windows → seamless. Phase 3.0 opens the window at
  // t≈3.0 (well clear of t=0, so anim(0) sits exactly at REST).
  const cq = actionQ(t, 6, 0.95, 3.0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window
    // anticipation (early) then a sharp commit dip near the middle
    const dip = Math.max(0, Math.sin(cq * Math.PI)); // 0→1→0 across the window
    pose.head = env * (10.0 + 4.0 * dip * dip); // head reaches ~12-14px down
    pose.peck = env * dip;
    pose.lean = env * 1.6; // a little forward (left) reach
    pose.tail = Math.sin(cq * Math.PI * 5) * env * 2.4; // a tail flick
    pose.fog = env; // winter: an exhale puff as she pecks
    // small body squash as she dips
    pose.squashY = 1 - env * 0.06 * dip;
    pose.squashX = 1 + env * 0.05 * dip;
  }

  // RARE ~18s: HOP + WING-FLAP (win ~1.2s, phase +3s offset from the peck). The
  // whole hen hops ~16px up flapping her wings. May lift OUTSIDE the design box.
  const hq = actionQ(t, 18, 1.2, 6.0);
  if (hq >= 0) {
    const s = hopShape(hq); // −0.2..+1 (crouch then arc)
    const env = bump(hq); // for the flap envelope
    pose.bob = -Math.max(0, s) * 16; // up to ~16px airborne (− = up)
    pose.hop = Math.max(0, s);
    if (s < 0) {
      // anticipation crouch: squash down/wide
      const c = -s; // 0..0.2
      pose.squashY = 1 - c * 0.9;
      pose.squashX = 1 + c * 0.7;
    } else {
      // airborne: stretch tall/narrow at the apex
      pose.squashY = 1 + s * 0.16;
      pose.squashX = 1 - s * 0.1;
    }
    // wings flap a couple of beats through the window
    pose.wing = Math.sin(hq * Math.PI * 4) * env * 6.0;
    // a little tail flag during the hop
    pose.tail += Math.sin(hq * Math.PI) * 1.6;
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────

interface P {
  featherLight: RGB; // lit white face of the plumage
  featherMid: RGB; // cream body tone
  featherShadow: RGB; // shaded underside / wing groove
  comb: RGB; // red comb + wattle (LOCKED red, only shaded)
  combDark: RGB; // shadowed comb
  beak: RGB; // orange beak + feet
  beakDark: RGB; // shadowed beak / feet
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  plumageVolume: number; // 0..1 BOLD puff of the feathers (sleek spring → puffy winter)
  gloss: number; // 0..1 soft feather sheen highlight on the back
  frostAmt: number; // 0..1 frost sparkle on the back feathers
  backSnowAmt: number; // 0..1 snow settled on her back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 a blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 a fallen leaf on the pad (autumn)
  breathFogAmt: number; // 0..1 breath puff at the beak
  scarfAmt: number; // 0..1 a little winter SCARF (tweened alpha)
  scarfColor: RGB; // scarf colour (locked red, fades in via alpha)
}

// Four BOLD season presets. The hen stays the SAME white/cream red-combed hen;
// only volume + pad + light + dressing differ — pushed HARD so each season
// reads at a glance.
const SP: Record<SeasonName, P> = {
  // Spring — sleek/light recently-moulted plumage, fresh look, a blossom on the
  // pad; cool-bright light.
  Spring: {
    featherLight: [252, 250, 244],
    featherMid: [236, 228, 208],
    featherShadow: [196, 184, 158],
    comb: [222, 60, 56],
    combDark: [158, 36, 38],
    beak: [240, 158, 52],
    beakDark: [196, 116, 30],
    padGrass: [122, 212, 80], // vivid fresh lime
    soil: [78, 140, 48],
    outline: [70, 58, 44],
    lightWash: [196, 240, 255], // cool-bright
    lightWashAmt: 0.2,
    plumageVolume: 0.08, // BOLD: clearly sleek, recently moulted
    gloss: 0.22,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.9,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  // Summer — PEAK; full healthy glossy plumage; saturated mid-green pad; bright
  // warm light.
  Summer: {
    featherLight: [255, 253, 248],
    featherMid: [242, 234, 214],
    featherShadow: [200, 186, 156],
    comb: [228, 56, 50],
    combDark: [164, 34, 34],
    beak: [246, 162, 48],
    beakDark: [202, 118, 26],
    padGrass: [72, 184, 58], // saturated mid-green
    soil: [48, 116, 36],
    outline: [66, 54, 40],
    lightWash: [255, 238, 178], // warm
    lightWashAmt: 0.22,
    plumageVolume: 0.5, // full normal plumage
    gloss: 0.85, // peak glossy
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  // Autumn — plumage tinted warm, a fallen leaf on the pad, dulled gloss, amber
  // light.
  Autumn: {
    featherLight: [248, 238, 220],
    featherMid: [232, 214, 184],
    featherShadow: [188, 166, 132],
    comb: [206, 52, 46],
    combDark: [150, 32, 34],
    beak: [232, 150, 46],
    beakDark: [188, 108, 26],
    padGrass: [172, 138, 64], // olive-tan browning
    soil: [112, 82, 40],
    outline: [66, 52, 38],
    lightWash: [255, 184, 96], // low amber, BOLD
    lightWashAmt: 0.32,
    plumageVolume: 0.72, // fuller
    gloss: 0.28, // dulled
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.95,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  // Winter — FLUFFED-UP cold-puffed plumage + snow on the back + a little winter
  // SCARF + a breath-fog puff, frost dusting, cool blue-grey light. Clearly
  // wintry, still obviously the same white/cream hen underneath.
  Winter: {
    featherLight: [248, 250, 254],
    featherMid: [226, 226, 224],
    featherShadow: [180, 186, 192],
    comb: [200, 58, 58],
    combDark: [142, 36, 42],
    beak: [228, 152, 60],
    beakDark: [182, 112, 40],
    padGrass: [226, 238, 250], // snow on the pad
    soil: [146, 166, 192],
    outline: [62, 58, 66],
    lightWash: [188, 212, 252], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    plumageVolume: 1, // BOLD: cold-puffed thick fluff
    gloss: 0.2,
    frostAmt: 0.82,
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
    featherLight: lerpRGB(a.featherLight, b.featherLight, t),
    featherMid: lerpRGB(a.featherMid, b.featherMid, t),
    featherShadow: lerpRGB(a.featherShadow, b.featherShadow, t),
    comb: lerpRGB(a.comb, b.comb, t),
    combDark: lerpRGB(a.combDark, b.combDark, t),
    beak: lerpRGB(a.beak, b.beak, t),
    beakDark: lerpRGB(a.beakDark, b.beakDark, t),
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

// ── Hen geometry constants (the SAME silhouette every season) ────────────────
// Front-¾, turned ~15–20° toward lower-left: head/beak biased to the left,
// tail to the upper-right. Body sits low-centre on the pad.

const BODY_CX = -1.0; // body centre x (slightly left = turned toward lower-left)
const BODY_CY = 4.0; // body centre y
const BODY_RX = 12.5; // body half-width
const BODY_RY = 10.5; // body half-height
const HEAD_CX = -8.5; // head centre x (forward/left)
const HEAD_CY = -6.5; // head centre y (up)
const HEAD_R = 5.6; // head radius
const FOOT_Y = 16.5; // foot contact line on the pad

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat grass pad the hen stands on
function paintPad(ctx: CanvasRenderingContext2D, p: P): void {
  // soft contact shadow, offset to lower-right (light is upper-left)
  ctx.fillStyle = rgb([0, 0, 0], 0.18);
  ctx.beginPath();
  ctx.ellipse(3, 21.5, 16, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // shaded underside of the pad
  ctx.fillStyle = rgb(p.soil);
  ctx.beginPath();
  ctx.ellipse(0, 20.4, 18, 5.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // grass top
  ctx.fillStyle = rgb(p.padGrass);
  ctx.beginPath();
  ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // tufted top edge
  ctx.strokeStyle = rgb(p.padGrass);
  ctx.lineWidth = 1.3;
  ctx.lineCap = "round";
  for (let i = -16; i <= 16; i += 4) {
    const h = 1.6 + (i % 8 === 0 ? 1.3 : 0);
    const yEdge = 19 - Math.sqrt(Math.max(0, 1 - (i / 18) ** 2)) * 5.2;
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
    ctx.fillStyle = rgba([246, 251, 255], 0.92 * p.padSnowAmt);
    ctx.beginPath();
    ctx.ellipse(0, 18.4, 17.4, 4.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.padSnowAmt);
    for (const [sx, sy] of [[-10, 19], [6, 20], [12, 18], [-2, 21]] as const) {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // BOLD blossoms (spring)
  if (p.blossomAmt > 0.001) {
    for (const [bx, by] of [[-13, 18.5], [12, 17.8], [-4, 21], [9, 20.2]] as const) {
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
      [12, 18.6, 0.7, [214, 132, 40]],
      [-12, 19.6, -0.5, [192, 88, 34]],
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

/** Trace the plump hen body (lower-left-turned egg shape) into the ctx path.
 *  `vol` swells the belly a touch (winter puffier) but keeps the silhouette the
 *  same recognizable hen. */
function henBodyPath(ctx: CanvasRenderingContext2D, cy: number, vol: number): void {
  const cx = BODY_CX;
  const rx = BODY_RX + vol * 2.2;
  const ry = BODY_RY + vol * 1.8;
  ctx.beginPath();
  // upper-left breast (toward the viewer / lower-left)
  ctx.moveTo(cx - rx, cy + 1.5);
  ctx.quadraticCurveTo(cx - rx + 1, cy - ry + 1, cx - 2, cy - ry);
  // back rising to the tail base on the upper-right
  ctx.quadraticCurveTo(cx + rx * 0.7, cy - ry - 0.5, cx + rx, cy - ry * 0.4);
  // lower-right belly
  ctx.quadraticCurveTo(cx + rx + 1.5, cy + ry * 0.5, cx + rx * 0.5, cy + ry);
  // round belly bottom
  ctx.quadraticCurveTo(cx - rx * 0.2, cy + ry + 1.5, cx - rx * 0.7, cy + ry * 0.7);
  // breast back up to start
  ctx.quadraticCurveTo(cx - rx - 1, cy + ry * 0.2, cx - rx, cy + 1.5);
  ctx.closePath();
}

// Orange legs + feet under the body, turned slightly toward lower-left. They
// stay PLANTED on the pad (they stretch with a hop rather than lift).
function paintLegs(ctx: CanvasRenderingContext2D, p: P, legTopY: number): void {
  const legs: Array<[number, number]> = [
    [-3.5, FOOT_Y], // front leg (toward viewer)
    [3.5, FOOT_Y - 0.5], // back leg
  ];
  for (const [lx, fy] of legs) {
    ctx.strokeStyle = rgb(p.beakDark);
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lx, legTopY);
    ctx.lineTo(lx - 1, fy);
    ctx.stroke();
    ctx.strokeStyle = rgb(p.beak);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(lx, legTopY);
    ctx.lineTo(lx - 1, fy);
    ctx.stroke();
    // three forward toes
    ctx.strokeStyle = rgb(p.beak);
    ctx.lineWidth = 1.4;
    for (const tx of [-2.4, 0, 2.0]) {
      ctx.beginPath();
      ctx.moveTo(lx - 1, fy);
      ctx.lineTo(lx - 1 + tx, fy + 1.8);
      ctx.stroke();
    }
  }
  ctx.lineCap = "butt";
}

// Short rounded tail on the upper-right, white-and-cream. Flicks via `tail`.
function paintTail(ctx: CanvasRenderingContext2D, p: P, cy: number, tail: number): void {
  const vol = p.plumageVolume;
  const tx = BODY_CX + BODY_RX - 1 + vol * 2.0;
  const ty = cy - BODY_RY * 0.4 - tail * 0.3;
  ctx.save();
  ctx.translate(tx, ty);
  ctx.rotate(tail * 0.05);
  // outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.moveTo(-2, 2);
  ctx.quadraticCurveTo(6, -7, 10, -8);
  ctx.quadraticCurveTo(9, -2, 8, 2);
  ctx.quadraticCurveTo(5, 5, -2, 2);
  ctx.closePath();
  ctx.fill();
  // fill, inset
  ctx.fillStyle = rgb(p.featherMid);
  ctx.beginPath();
  ctx.moveTo(-1, 1.5);
  ctx.quadraticCurveTo(5.5, -6, 9, -7);
  ctx.quadraticCurveTo(8, -2, 7, 1.5);
  ctx.quadraticCurveTo(4, 4, -1, 1.5);
  ctx.closePath();
  ctx.fill();
  // light feather edge on the tail (upper-left lit)
  ctx.strokeStyle = rgba(p.featherLight, 0.6);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(0, 0.5);
  ctx.quadraticCurveTo(5.5, -6, 9, -7);
  ctx.stroke();
  ctx.restore();
}

// One wing, spread out from the body during the hop-flap. `spread` ≥ 0.
function paintWing(ctx: CanvasRenderingContext2D, p: P, cy: number, spread: number): void {
  if (spread <= 0.01) return;
  ctx.save();
  // wing pivots from the upper-back of the body, fanning to the lower-left
  ctx.translate(BODY_CX - 5, cy - 1);
  ctx.rotate(-0.5 - spread * 0.06);
  const len = 7 + spread * 1.4;
  // outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(-len * 0.5, 2, len, 4.2, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // fill
  ctx.fillStyle = rgb(p.featherMid);
  ctx.beginPath();
  ctx.ellipse(-len * 0.5, 2, len - 1.1, 3.3, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // lit upper edge
  ctx.strokeStyle = rgba(p.featherLight, 0.65);
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.ellipse(-len * 0.5, 1.2, len - 1.6, 2.6, 0.2, Math.PI, Math.PI * 2);
  ctx.stroke();
  // a couple of feather grooves
  ctx.strokeStyle = rgba(p.featherShadow, 0.7);
  ctx.lineWidth = 0.8;
  for (const k of [0.35, 0.6, 0.85]) {
    ctx.beginPath();
    ctx.moveTo(-len * k, 1);
    ctx.lineTo(-len * k - 1.5, 4);
    ctx.stroke();
  }
  ctx.restore();
}

// Head: round white head, tiny red comb + wattle, small orange beak, eye.
// Dips/pecks via the pose-driven `headY` and `peck`.
function paintHead(ctx: CanvasRenderingContext2D, p: P, headY: number, peck: number): void {
  const hx = HEAD_CX;
  const hy = headY;
  ctx.save();

  // neck — short, joining head to body
  ctx.strokeStyle = rgb(p.outline);
  ctx.lineWidth = 7.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(hx + 1.5, hy + 3);
  ctx.lineTo(BODY_CX - 5, BODY_CY - 3);
  ctx.stroke();
  ctx.strokeStyle = rgb(p.featherMid);
  ctx.lineWidth = 5.6;
  ctx.beginPath();
  ctx.moveTo(hx + 1.5, hy + 3);
  ctx.lineTo(BODY_CX - 5, BODY_CY - 3);
  ctx.stroke();
  ctx.lineCap = "butt";

  // comb — three small red bumps on top of the head; LOCKED red.
  ctx.fillStyle = rgb(p.combDark);
  [-2.6, 0.2, 2.8].forEach((cx, i) => {
    ctx.beginPath();
    ctx.arc(hx + cx, hy - HEAD_R + 0.5, 2.0 - i * 0.1, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = rgb(p.comb);
  [-2.6, 0.2, 2.8].forEach((cx, i) => {
    ctx.beginPath();
    ctx.arc(hx + cx - 0.4, hy - HEAD_R - 0.1, 1.7 - i * 0.1, 0, Math.PI * 2);
    ctx.fill();
  });

  // head — round, outline then fill
  ctx.lineWidth = 2.0;
  ctx.strokeStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.arc(hx, hy, HEAD_R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = rgb(p.featherMid);
  ctx.fill();
  // head shading
  ctx.save();
  ctx.beginPath();
  ctx.arc(hx, hy, HEAD_R, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = rgb(p.featherShadow);
  ctx.beginPath();
  ctx.ellipse(hx + 1.5, hy + 2.5, HEAD_R, HEAD_R * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.featherLight);
  ctx.beginPath();
  ctx.ellipse(hx - 1.8, hy - 2, HEAD_R * 0.62, HEAD_R * 0.52, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // wattle — small red drop under the beak (LOCKED red)
  ctx.fillStyle = rgb(p.combDark);
  ctx.beginPath();
  ctx.ellipse(hx - 3.2, hy + HEAD_R - 0.5, 1.6, 2.4, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.comb);
  ctx.beginPath();
  ctx.ellipse(hx - 3.5, hy + HEAD_R - 1.0, 1.2, 1.9, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // beak — small orange triangle pointing lower-left. Opens as she pecks.
  const gape = peck * 1.8;
  ctx.fillStyle = rgb(p.beakDark);
  ctx.beginPath();
  ctx.moveTo(hx - HEAD_R + 0.5, hy - 0.5 - gape * 0.4);
  ctx.lineTo(hx - HEAD_R - 4.5, hy + 1.6 - gape * 0.3);
  ctx.lineTo(hx - HEAD_R + 1, hy + 3 + gape * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgb(p.beak);
  ctx.beginPath();
  ctx.moveTo(hx - HEAD_R + 0.8, hy - 0.2 - gape * 0.4);
  ctx.lineTo(hx - HEAD_R - 3.8, hy + 1.4 - gape * 0.3);
  ctx.lineTo(hx - HEAD_R + 1, hy + 2.2 + gape * 0.5);
  ctx.closePath();
  ctx.fill();

  // eye — small dark dot with a tiny catchlight
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.arc(hx - 1.8, hy - 0.6, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(hx - 2.3, hy - 1.1, 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// the whole hen, standing front-¾ turned toward lower-left, posed by `pose`
function paintHen(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  const vol = p.plumageVolume;
  const bodyY = BODY_CY + pose.bob; // body centre lifts during the hop (bob < 0)
  const legTopY = bodyY + BODY_RY * 0.6;

  // contact shadow of the hen on the pad (shrinks as she hops up)
  const liftFrac = clamp01(-pose.bob / 16);
  ctx.fillStyle = rgb(p.outline, 0.26 * (1 - 0.5 * liftFrac));
  ctx.beginPath();
  ctx.ellipse(1.5, FOOT_Y + 1.5, 11 * (1 - 0.25 * liftFrac), 2.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // legs first (behind the body). They stay planted; their top rises with body.
  paintLegs(ctx, p, legTopY);

  // The whole upper body (body + head + dressing) is drawn under a squash/stretch
  // transform centred on the body, so the hop reads with anticipation squash +
  // airborne stretch, and the peck adds a small body squash.
  ctx.save();
  ctx.translate(BODY_CX + pose.lean, bodyY);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-BODY_CX - pose.lean, -bodyY);

  // far wing (behind body) flaps to the back-right during the hop
  if (pose.wing < -0.01 || pose.wing > 0.01) {
    paintWing(ctx, p, bodyY, Math.abs(pose.wing) * 0.8);
  }

  // tail behind the body on the upper-right
  paintTail(ctx, p, bodyY, pose.tail);

  // ── Body (SAME silhouette every season) ──────────────────────────────────
  // 1) soft dark outline pass + mid fill
  ctx.lineJoin = "round";
  henBodyPath(ctx, bodyY, vol);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = rgb(p.outline);
  ctx.stroke();
  ctx.fillStyle = rgb(p.featherMid);
  ctx.fill();

  // 2) cel shading inside the body
  ctx.save();
  henBodyPath(ctx, bodyY, vol);
  ctx.clip();
  // underside shadow
  ctx.fillStyle = rgb(p.featherShadow);
  ctx.beginPath();
  ctx.ellipse(BODY_CX + 2, bodyY + BODY_RY * 0.5, BODY_RX + vol * 2, BODY_RY * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  // mid body
  ctx.fillStyle = rgb(p.featherMid);
  ctx.beginPath();
  ctx.ellipse(BODY_CX, bodyY + 0.5, BODY_RX * 0.92, BODY_RY * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit upper-left back (light from upper-left)
  ctx.fillStyle = rgb(p.featherLight);
  ctx.beginPath();
  ctx.ellipse(BODY_CX - 3.5, bodyY - 4.0, BODY_RX * 0.62, BODY_RY * 0.52, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // wing groove — a soft curved feather line dividing wing from back
  ctx.strokeStyle = rgba(p.featherShadow, 0.8);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(BODY_CX - 6, bodyY - 3.5);
  ctx.quadraticCurveTo(BODY_CX + 4, bodyY - 1.5, BODY_CX + 8.5, bodyY + 4.5);
  ctx.stroke();
  // a couple of light feather flecks on the wing for texture
  ctx.strokeStyle = rgba(p.featherLight, 0.5);
  ctx.lineWidth = 1.0;
  for (const [fx, fy] of [[-4, 1], [0, 3], [4, 5]] as const) {
    ctx.beginPath();
    ctx.moveTo(BODY_CX + fx, bodyY + fy);
    ctx.quadraticCurveTo(BODY_CX + fx + 2, bodyY + fy + 1.5, BODY_CX + fx + 4.5, bodyY + fy + 1);
    ctx.stroke();
  }
  // soft feather gloss on the back
  if (p.gloss > 0.02) {
    ctx.fillStyle = rgba([255, 255, 255], 0.1 + 0.32 * p.gloss);
    ctx.beginPath();
    ctx.ellipse(BODY_CX - 4, bodyY - 5, BODY_RX * 0.5, BODY_RY * 0.32, -0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  // frost dusting on the back feathers (winter)
  if (p.frostAmt > 0.02) {
    ctx.fillStyle = rgba([220, 236, 252], 0.22 * p.frostAmt);
    ctx.beginPath();
    ctx.ellipse(BODY_CX, bodyY - 5.5, BODY_RX * 0.8, BODY_RY * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([240, 248, 255], 0.7 * p.frostAmt);
    for (const [sx, sy] of [[-6, -7], [-1, -8], [3, -7], [7, -5], [-4, -4], [5, -3], [0, -5]] as const) {
      ctx.beginPath();
      ctx.arc(BODY_CX + sx, bodyY + sy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore(); // end body clip

  // fluffy plumage scallops around the lower belly — bigger with volume (BOLD
  // cold-puff in winter), keeping the same silhouette
  if (vol > 0.3) {
    const lumps = 9;
    const lumpR = (vol - 0.3) * 3.4;
    ctx.fillStyle = rgb(p.featherMid);
    const rx = BODY_RX + vol * 2.2;
    const ry = BODY_RY + vol * 1.8;
    for (let i = 0; i < lumps; i++) {
      const a = Math.PI * 0.15 + (i / (lumps - 1)) * Math.PI * 0.9; // lower arc
      const lx = BODY_CX + Math.cos(a) * rx * 0.98;
      const ly = bodyY + Math.sin(a) * ry * 0.98;
      ctx.beginPath();
      ctx.arc(lx, ly, lumpR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3) snow cap on the back (winter) — drawn over, hugging the upper rim
  if (p.backSnowAmt > 0.02) {
    const a = p.backSnowAmt;
    const ty = bodyY - (BODY_RY + vol * 1.8) - 0.2;
    ctx.fillStyle = rgba([248, 252, 255], 0.95 * a);
    ctx.beginPath();
    ctx.moveTo(BODY_CX - 6, ty + 4);
    ctx.quadraticCurveTo(BODY_CX - 3, ty - 1, BODY_CX + 1, ty + 0.5);
    ctx.quadraticCurveTo(BODY_CX + 5, ty - 1.5, BODY_CX + 8, ty + 3);
    ctx.quadraticCurveTo(BODY_CX + 5, ty + 4.5, BODY_CX + 2, ty + 3.5);
    ctx.quadraticCurveTo(BODY_CX - 2, ty + 5, BODY_CX - 6, ty + 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba([208, 224, 244], 0.5 * a);
    ctx.beginPath();
    ctx.ellipse(BODY_CX + 1, ty + 4, 6, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // near wing (in front of body) flaps to the front-left during the hop
  if (pose.wing < -0.01 || pose.wing > 0.01) {
    paintWing(ctx, p, bodyY, Math.abs(pose.wing));
  }

  // ── Head + comb + wattle + beak + eye (dips/pecks via pose) ───────────────
  paintHead(ctx, p, HEAD_CY + pose.bob + pose.head, pose.peck);

  // ── SCARF (winter) — a little knitted band around the neck ─────────────────
  if (p.scarfAmt > 0.001) {
    const sx = BODY_CX - 5.5;
    const sy = bodyY - BODY_RY + 1.0;
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // wrap band
    ctx.fillStyle = rgb(p.scarfColor);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 5.2, 2.8, -0.25, 0, Math.PI * 2);
    ctx.fill();
    // darker underside for depth
    ctx.fillStyle = rgb([
      Math.max(0, p.scarfColor[0] - 50),
      Math.max(0, p.scarfColor[1] - 30),
      Math.max(0, p.scarfColor[2] - 30),
    ]);
    ctx.beginPath();
    ctx.ellipse(sx + 0.4, sy + 1.4, 4.8, 1.5, -0.25, 0, Math.PI * 2);
    ctx.fill();
    // hanging tail of the scarf with a fringe
    ctx.fillStyle = rgb(p.scarfColor);
    ctx.beginPath();
    ctx.moveTo(sx - 3.0, sy + 1.4);
    ctx.lineTo(sx + 0.4, sy + 2.2);
    ctx.lineTo(sx - 0.4, sy + 7.8);
    ctx.lineTo(sx - 3.8, sy + 7.0);
    ctx.closePath();
    ctx.fill();
    // fringe at the bottom
    ctx.strokeStyle = rgb(p.scarfColor);
    ctx.lineWidth = 0.9;
    ctx.lineCap = "round";
    for (const fx of [-3.4, -2.2, -1.0]) {
      ctx.beginPath();
      ctx.moveTo(sx + fx, sy + 7.2);
      ctx.lineTo(sx + fx - 0.2, sy + 8.8);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.restore();
  }

  ctx.restore(); // end squash/stretch transform

  // breath-fog puff at the beak (winter) — drawn OUTSIDE the squash transform so
  // it reads as air, not body. Static base puff + an exhale swell during peck.
  if (p.breathFogAmt > 0.001) {
    const hx = HEAD_CX;
    const hy = HEAD_CY + pose.bob + pose.head;
    const reach = 5.0 + pose.fog * 3.0;
    ctx.fillStyle = rgba([235, 244, 255], (0.32 + 0.3 * pose.fog) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(hx - HEAD_R - reach, hy + 1.4, 2.6 + pose.fog * 2.0, 1.8 + pose.fog * 1.4, 0.2, 0, Math.PI * 2);
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

function paint(ctx: CanvasRenderingContext2D, pIn: P, poseIn: Pose): void {
  const p = clampP(pIn);
  const pose = safePose(poseIn);
  ctx.save();
  try {
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    paintPad(ctx, p);
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
    const p = clamp01(safeNum(pp));
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
      const by = BODY_CY;

      // Loose fluff motes lifting off the thickening plumage — reads the coat
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
        const hx = HEAD_CX;
        const hy = HEAD_CY;
        ctx.fillStyle = rgba([235, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(hx - HEAD_R - (4 + trans * 3), hy + 1.4, 2.6 + trans * 1.8, 1.8 + trans * 1.2, 0.2, 0, Math.PI * 2);
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
