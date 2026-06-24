// Production seasonal art for the CATTLE LONGHORN board tile
// (`tile_cattle_longhorn`) — the approved bold "fun" direction, mirroring the
// HERD SHEEP reference architecture. A single parameterized
// `paint(ctx, p, pose)` + four `P` presets + lerped transitions, pushed so the
// seasons read at a glance and the idle is a real, fun ACTION rather than a
// subtle breath.
//
// SUBJECT = TEXAS LONGHORN: a tan/reddish-brown steer with a white face blaze,
// dark hooves, a tail, and the signature pair of VERY WIDE long horns sweeping
// out to both sides, standing on a grass pad.
//
// PALETTE / IDENTITY LOCK: it is ALWAYS the same tan longhorn. The hide colours
// and the SILHOUETTE (including the very wide horns) are constant across all
// four seasons. Seasons change only the COAT VOLUME (sleek spring → furrier
// thicker winter), the pad colour, the light wash, and BOLD dressing — snow on
// the back AND a little snow on the wide horns, a little winter SCARF, a
// breath-fog puff, frost, blossom, a fallen leaf. The longhorn is never
// recoloured, hollowed, or swapped, and the horns stay WIDE every season.
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~0.9s): a CHEW (cud) — head bobs ~8-12px as it chews,
//     with an ear-flick and a tail-swish. The wide horns sway gently with the
//     head. A small body squash. Winter adds a breath-fog exhale.
//   • RARE  ~18s (win ~1.2s, phase +3s): a HEAD-SWING / snort — the longhorn
//     swings its wide horns side to side / tosses its head ~14-18px
//     (anticipation → swing → settle). May exit the box at the apex (fine).
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

// coerce any non-finite scalar (NaN/Inf from a wild t or p) to a safe default
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

// Anticipation→action shape for the HEAD-SWING: a brief draw-back (negative)
// before the toss, then a clean arc and settle. q∈[0,1]. Returns a SWING factor
// in roughly −0.2..+1 (negative = pull back, positive = toss out).
function swingShape(q: number): number {
  if (q <= 0 || q >= 1) return 0;
  const antiEnd = 0.24; // first slice = anticipation pull-back
  if (q < antiEnd) {
    // draw back a little (anticipation), zero slope at q=0
    const a = q / antiEnd;
    return -0.2 * (0.5 - 0.5 * Math.cos(a * Math.PI));
  }
  // toss arc, zero at the seam to the pull-back and at q=1
  const a = (q - antiEnd) / (1 - antiEnd);
  return Math.sin(a * Math.PI);
}

// ── The idle POSE (carries all action state into paint) ──────────────────────

interface Pose {
  bob: number; // whole-body vertical bob (design px, + = down dip)
  lean: number; // whole-body horizontal lean (design px, signed)
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  head: number; // signed head/horns swing offset (design px sideways) for the toss
  chew: number; // extra head dip (design px, + = down) for the chew
  ear: number; // 0..1 near-ear flick amount
  tail: number; // signed tail swish (design px sideways)
  hop: number; // 0..1 breath-fog exhale reach (winter chew exhale)
}

const REST: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, chew: 0, ear: 0, tail: 0, hop: 0 };

// Build a pose from the wall clock: a common CHEW every ~6s and a rare
// HEAD-SWING every ~18s. Returns to REST (all zeros / unit scales) at every
// window edge.
function poseFromClock(tIn: number): Pose {
  const t = safeNum(tIn, 0);
  const pose: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, chew: 0, ear: 0, tail: 0, hop: 0 };

  // COMMON ~6s: CHEW (win ~0.9s). Head bobs ~8-12px, jaw chews, ear flicks,
  // tail swishes, small body squash, horns sway with the head. Built from
  // raised-cosine windows → seamless. Phase 3.0 opens the window at t≈3.0
  // (well clear of t=0, so anim(0) sits exactly at REST).
  const cq = actionQ(t, 6, 0.9, 3.0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window
    // two chew bobs within the window (head dips down ~8-12px at the peak)
    pose.chew = env * (5.0 + 6.5 * Math.abs(Math.sin(cq * Math.PI * 2)));
    pose.bob = env * 2.0; // a little body settle with the chew
    pose.head = Math.sin(cq * Math.PI * 4) * env * 2.2; // horns sway gently
    pose.ear = env;
    pose.tail = Math.sin(cq * Math.PI * 6) * env * 3.0; // a few swishes sideways
    // small body squash as it works the jaw
    pose.squashY = 1 - env * 0.05;
    pose.squashX = 1 + env * 0.04;
    pose.hop = env; // winter: an exhale puff as it chews
  }

  // RARE ~18s: HEAD-SWING / snort (win ~1.2s). The longhorn swings its wide
  // horns side to side / tosses its head ~14-18px with an anticipation
  // pull-back. May reach OUTSIDE the design box at the apex.
  const hq = actionQ(t, 18, 1.2, 3.0);
  if (hq >= 0) {
    const s = swingShape(hq); // −0.2..+1 (pull back then toss)
    const env = bump(hq); // overall fade-in/out envelope
    // a full side-to-side sweep of the head + wide horns during the toss
    pose.head += Math.sin(hq * Math.PI * 2) * env * 17;
    // the whole front leans into the swing
    pose.lean += Math.sin(hq * Math.PI * 2) * env * 4.0;
    if (s < 0) {
      // anticipation: drop the head/nose a touch and gather
      const c = -s; // 0..0.2
      pose.chew += c * 6;
      pose.squashY = Math.min(pose.squashY, 1 - c * 0.5);
      pose.squashX = Math.max(pose.squashX, 1 + c * 0.4);
    } else {
      // toss: head lifts a little as the horns sweep up
      pose.chew -= s * 3.0;
    }
    // a tail flag during the swing
    pose.tail += Math.sin(hq * Math.PI) * 1.6;
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────
//
// IDENTITY colours (tan/russet hide, white face blaze, dark hooves/horns) stay
// nearly constant; they live in P only so the light wash can nudge them very
// slightly between seasons. Everything that genuinely differs per season is the
// coat volume + pad + light + dressing amounts. ONLY tweenable numeric / RGB /
// 0..1 season params here — no booleans, no strings, no season name.

interface P {
  hideLight: RGB; // bright top of the tan hide
  hideMid: RGB; // body tone of the tan/russet hide
  hideShadow: RGB; // shaded underside of the hide
  blaze: RGB; // the white face blaze
  hornLight: RGB; // lit face of the long horns (warm ivory)
  hornDark: RGB; // shaded horns, hooves, eyes (the dark hard parts)
  muzzle: RGB; // dark/charcoal muzzle nose
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  coatVolume: number; // 0..1 BOLD coat thickness (sleek → furry thick)
  glossAmt: number; // 0..1 glossy sheen on the coat (summer peak)
  frostAmt: number; // 0..1 frost sparkle on the coat
  hornSnowAmt: number; // 0..1 little snow on the wide horns (winter)
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 a blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 a fallen leaf on the pad (autumn)
  breathFogAmt: number; // 0..1 breath puff at the muzzle (winter)
  scarfAmt: number; // 0..1 a little winter SCARF (tweened alpha)
  scarfColor: RGB; // scarf colour (locked red, fades in via alpha)
}

// Four BOLD season presets. The longhorn stays the SAME tan, white-blazed,
// wide-horned steer; only coat volume + gloss + pad + light + dressing differ —
// pushed HARD so each season reads at a glance.
const SP: Record<SeasonName, P> = {
  // Spring — sleeker tan coat, dewy lime pad + a blossom, cool-bright light.
  Spring: {
    hideLight: [216, 162, 100],
    hideMid: [186, 126, 70],
    hideShadow: [142, 92, 50],
    blaze: [248, 244, 236],
    hornLight: [238, 228, 204],
    hornDark: [88, 72, 56],
    muzzle: [70, 58, 52],
    padGrass: [124, 212, 80], // vivid fresh lime
    soil: [80, 138, 50],
    outline: [66, 48, 36],
    lightWash: [200, 240, 255], // cool-bright
    lightWashAmt: 0.2,
    coatVolume: 0.08, // BOLD: clearly sleek/shed-out, very thin coat
    glossAmt: 0.18,
    frostAmt: 0,
    hornSnowAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.9,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  // Summer — GLOSSY tan coat (PEAK), saturated mid-green pad, bright warm light.
  Summer: {
    hideLight: [224, 164, 92],
    hideMid: [194, 126, 60],
    hideShadow: [146, 86, 40],
    blaze: [250, 246, 238],
    hornLight: [242, 232, 208],
    hornDark: [84, 66, 50],
    muzzle: [66, 54, 48],
    padGrass: [78, 182, 60], // saturated mid-green
    soil: [50, 116, 36],
    outline: [62, 44, 32],
    lightWash: [255, 240, 184], // bright warm
    lightWashAmt: 0.2,
    coatVolume: 0.46, // normal full coat
    glossAmt: 0.85, // peak glossy sheen
    frostAmt: 0,
    hornSnowAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  // Autumn — warm reddish-tinted fuller coat, olive-tan pad, a fallen leaf,
  // dulled gloss, amber light.
  Autumn: {
    hideLight: [204, 134, 76],
    hideMid: [176, 100, 50],
    hideShadow: [132, 70, 36],
    blaze: [244, 238, 226],
    hornLight: [236, 224, 196],
    hornDark: [80, 62, 46],
    muzzle: [64, 50, 44],
    padGrass: [168, 138, 66], // olive-tan browning
    soil: [108, 82, 42],
    outline: [60, 42, 30],
    lightWash: [255, 184, 96], // low amber, BOLD
    lightWashAmt: 0.3,
    coatVolume: 0.74, // thicker
    glossAmt: 0.22, // dulled gloss
    frostAmt: 0,
    hornSnowAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.92,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  // Winter — FURRIER thick coat + frosted/snow-dusted horns + back-snow + a
  // little scarf + breath fog, snowy pad, cool blue-grey light. The tan hide
  // stays clearly visible under the frost — still the same longhorn.
  Winter: {
    hideLight: [202, 154, 104],
    hideMid: [172, 120, 70],
    hideShadow: [134, 90, 56],
    blaze: [250, 250, 252],
    hornLight: [236, 234, 230],
    hornDark: [96, 84, 78],
    muzzle: [74, 64, 62],
    padGrass: [224, 236, 248], // snow on the pad
    soil: [148, 166, 190],
    outline: [70, 58, 54],
    lightWash: [188, 212, 252], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    coatVolume: 1, // BOLD: furry thick winter coat
    glossAmt: 0.1, // matte
    frostAmt: 0.8,
    hornSnowAmt: 0.85, // little snow on the wide horns
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
    hideLight: lerpRGB(a.hideLight, b.hideLight, t),
    hideMid: lerpRGB(a.hideMid, b.hideMid, t),
    hideShadow: lerpRGB(a.hideShadow, b.hideShadow, t),
    blaze: lerpRGB(a.blaze, b.blaze, t),
    hornLight: lerpRGB(a.hornLight, b.hornLight, t),
    hornDark: lerpRGB(a.hornDark, b.hornDark, t),
    muzzle: lerpRGB(a.muzzle, b.muzzle, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    coatVolume: lerp(a.coatVolume, b.coatVolume, t),
    glossAmt: lerp(a.glossAmt, b.glossAmt, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    hornSnowAmt: lerp(a.hornSnowAmt, b.hornSnowAmt, t),
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
    lightWashAmt: clamp01(safeNum(p.lightWashAmt)),
    coatVolume: clamp01(safeNum(p.coatVolume)),
    glossAmt: clamp01(safeNum(p.glossAmt)),
    frostAmt: clamp01(safeNum(p.frostAmt)),
    hornSnowAmt: clamp01(safeNum(p.hornSnowAmt)),
    backSnowAmt: clamp01(safeNum(p.backSnowAmt)),
    padSnowAmt: clamp01(safeNum(p.padSnowAmt)),
    blossomAmt: clamp01(safeNum(p.blossomAmt)),
    fallenLeafAmt: clamp01(safeNum(p.fallenLeafAmt)),
    breathFogAmt: clamp01(safeNum(p.breathFogAmt)),
    scarfAmt: clamp01(safeNum(p.scarfAmt)),
  };
}

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat grass pad the longhorn stands on
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

// one leg: a stout tan cylinder with a dark hoof at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  // tan hide leg with outline
  ctx.strokeStyle = rgba(p.outline);
  ctx.lineWidth = 4.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  ctx.strokeStyle = rgba(p.hideShadow);
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY - 1);
  ctx.stroke();
  // dark hoof
  ctx.fillStyle = rgba(p.hornDark);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 2.0, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// Trace the longhorn's barrel body path (constant silhouette). cx,cy = centre.
// vol modestly puffs the outline; the underlying shape is constant.
function bodyPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, vol: number): void {
  const rx = 13.5 * (0.97 + vol * 0.1);
  const ry = 8.6 * (0.97 + vol * 0.12);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
}

// The signature WIDE horns: one long sweeping horn to each side from the crown.
// Drawn behind the head. The width is CONSTANT every season (palette/silhouette
// lock); winter only adds a snow/frost dusting over them. `swing` shifts the
// horn bases with the head toss so the horns sway with the head.
function paintHorns(ctx: CanvasRenderingContext2D, p: P, hx: number, hy: number, swing: number): void {
  for (const side of [-1, 1] as const) {
    // base near the crown, sweeping far out to the side and tipping up. The
    // tip travels a touch more than the base for a gentle sway.
    const x0 = hx + side * 2.2 + swing * 0.5;
    const y0 = hy - 4.4;
    const cx = hx + side * 12.5 + swing; // far reach
    const cy = hy - 5.6;
    const x1 = hx + side * 17.5 + swing * 1.4; // very wide tip
    const y1 = hy - 8.6; // tipping upward
    // outline pass (fat, dark)
    ctx.strokeStyle = rgba(p.outline);
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
    ctx.stroke();
    // shaded horn
    ctx.strokeStyle = rgba(p.hornDark);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
    ctx.stroke();
    // lit ivory upper edge of the horn
    ctx.strokeStyle = rgba(p.hornLight);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x0, y0 - 0.7);
    ctx.quadraticCurveTo(cx, cy - 0.9, x1, y1 - 0.4);
    ctx.stroke();

    // little snow / frost rime on the wide horns (winter) — cool speckle along
    // the sweep, heavier toward the upper edge.
    if (p.hornSnowAmt > 0.001) {
      ctx.fillStyle = rgba([240, 248, 255], 0.9 * p.hornSnowAmt);
      for (let k = 0; k <= 5; k++) {
        const tt = k / 5;
        // quadratic bezier point
        const bxp = (1 - tt) * (1 - tt) * x0 + 2 * (1 - tt) * tt * cx + tt * tt * x1;
        const byp = (1 - tt) * (1 - tt) * y0 + 2 * (1 - tt) * tt * cy + tt * tt * y1;
        ctx.beginPath();
        ctx.arc(bxp, byp - 0.6, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.lineCap = "butt";
  }
}

// the whole longhorn, standing front-¾ turned ~15-20° toward lower-left, posed
// by `pose`
function paintLonghorn(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  // legs stay PLANTED on the pad; the body bobs/leans/squashes above them.
  const bx = 1 + pose.lean;
  const by = 2 + pose.bob;
  const vol = p.coatVolume;

  // legs first (behind the body). Two back (dimmer/higher), two front. Their
  // tops follow the body lean/bob so the joints stay attached; feet stay put.
  ctx.save();
  ctx.globalAlpha = 0.9;
  paintLeg(ctx, p, bx + 8, by + 6, 18.6);
  paintLeg(ctx, p, bx - 6.5, by + 6, 18.9);
  ctx.restore();
  // front legs (toward lower-left, slightly forward)
  paintLeg(ctx, p, bx + 4, by + 6.5, 19.4);
  paintLeg(ctx, p, bx - 9.5, by + 6.5, 19.6);

  // The whole upper body (barrel + head + horns + dressing) is drawn under a
  // squash/stretch transform centred on the body, so the chew/swing read with
  // a little anticipation squash.
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-bx, -by);

  // ── BODY barrel — outline pass then layered fills ───────────────────────────
  // outline halo
  ctx.fillStyle = rgba(p.outline);
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(1.1, 1.14);
  ctx.translate(-bx, -by);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  ctx.restore();

  // shaded hide
  ctx.fillStyle = rgba(p.hideShadow);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  // mid hide
  ctx.fillStyle = rgba(p.hideMid);
  ctx.save();
  ctx.translate(-0.6, -0.8);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  ctx.restore();
  // lit hide, offset up-left (light from upper-left)
  ctx.save();
  ctx.fillStyle = rgba(p.hideLight);
  ctx.translate(-1.6, -1.8);
  ctx.scale(0.84, 0.78);
  ctx.translate(bx * 0.16, by * 0.22);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  ctx.restore();

  // furrier winter coat fringe: soft tufts along the lower/back edge, only when
  // the coat is thick (vol high). Constant silhouette otherwise.
  if (vol > 0.5) {
    const fr = (vol - 0.5) / 0.5;
    ctx.fillStyle = rgba(p.hideShadow, 0.9);
    const rx = 13.5 * (0.97 + vol * 0.1);
    const ry = 8.6 * (0.97 + vol * 0.12);
    for (let i = 0; i < 11; i++) {
      const a = Math.PI * 0.1 + (i / 10) * Math.PI * 1.0; // lower-front arc
      const lx = bx + Math.cos(a) * rx * 1.03;
      const ly = by + Math.sin(a) * ry * 1.03;
      ctx.beginPath();
      ctx.arc(lx, ly, (1.3 + 1.2 * fr) * (i % 2 ? 1 : 0.8), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── hide shading detail, clipped to the body ────────────────────────────────
  ctx.save();
  bodyPath(ctx, bx, by, vol);
  ctx.clip();
  // a darker russet underbelly band (rounds the barrel)
  ctx.fillStyle = rgba(p.hideShadow, 0.5);
  ctx.beginPath();
  ctx.ellipse(bx, by + 5.5, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // subtle hide highlight band over the back (light upper-left)
  ctx.fillStyle = rgba([255, 255, 255], 0.08);
  ctx.beginPath();
  ctx.ellipse(bx - 3, by - 4, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // glossy sheen sweep across the hide (summer peak) — a soft bright band
  if (p.glossAmt > 0.001) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = rgba([255, 250, 230], 0.5 * p.glossAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 4, by - 3.5, 7, 3.2, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore(); // end body clip

  // snow settled on the back (winter) — BOLD white cap on top of the back
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgba([248, 252, 255], 0.94 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx, by - 7.2, 10.5 * (0.9 + vol * 0.25), 3.4, -0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.88 * p.backSnowAmt);
    for (const [dx, dy] of [[-6, -8.0], [0, -8.8], [6, -7.8], [-2, -9.0]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.6 + vol * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the coat (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgba([255, 255, 255], 0.82 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-8, 0], [-3, 4], [4, -2], [9, 2], [0, -3], [-5, -5], [7, 5],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // tail at the upper-right rear — a thin line with a dark switch tuft, swishes
  // sideways via pose
  const tailX = pose.tail;
  ctx.strokeStyle = rgba(p.outline);
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx + 13, by - 2);
  ctx.quadraticCurveTo(bx + 17 + tailX, by + 3, bx + 15.5 + tailX, by + 9);
  ctx.stroke();
  ctx.strokeStyle = rgba(p.hideMid);
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(bx + 13, by - 2);
  ctx.quadraticCurveTo(bx + 17 + tailX, by + 3, bx + 15.5 + tailX, by + 9);
  ctx.stroke();
  ctx.lineCap = "butt";
  // tail switch tuft (dark)
  ctx.fillStyle = rgba(p.hornDark);
  ctx.beginPath();
  ctx.ellipse(bx + 15.5 + tailX, by + 10, 1.6, 2.6, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // ── HEAD (front-¾, lower-left) — locks identity: tan face w/ white blaze,
  //    WIDE horns, ears, dark muzzle. The head bobs (chew) + swings (toss). ────
  // The head + horns SWING about a neck pivot anchored on the body's front-left
  // shoulder, so the toss ARCS the head (and the wide horns) rather than sliding
  // it sideways — it can never detach from the body. swingAng=0 at rest, so every
  // season still + transition endpoint is pixel-identical to before.
  const neckX = bx - 8;
  const neckY = by + 2;
  const swingAng = Math.max(-0.8, Math.min(0.8, pose.head * 0.045));
  const hx = bx - 14; // rest head x (the toss is the rotation below, not a slide)
  const hy = by + 3 + pose.chew; // chew dips the head down

  ctx.save();
  ctx.translate(neckX, neckY);
  ctx.rotate(swingAng);
  ctx.translate(-neckX, -neckY);

  // a short tan NECK bridging the shoulder to the head base (behind the head) so
  // the join always reads as one animal — especially mid-toss.
  ctx.lineCap = "round";
  ctx.strokeStyle = rgba(p.outline);
  ctx.lineWidth = 7.4;
  ctx.beginPath();
  ctx.moveTo(neckX + 1.5, neckY - 1);
  ctx.lineTo(hx + 3.5, hy - 1.5);
  ctx.stroke();
  ctx.strokeStyle = rgba(p.hideMid);
  ctx.lineWidth = 5.0;
  ctx.beginPath();
  ctx.moveTo(neckX + 1.5, neckY - 1);
  ctx.lineTo(hx + 3.5, hy - 1.5);
  ctx.stroke();
  ctx.lineCap = "butt";

  // the signature WIDE horns (behind the crown), constant width every season —
  // they rotate rigidly with the head via the swing transform above.
  paintHorns(ctx, p, hx, hy, 0);

  // ears (tan outer + lighter inner), set wide, behind the head. The near
  // (left) ear flicks up with the chew.
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(hx + side * 5.4, hy - 1.6);
    const flick = side === -1 ? pose.ear * 0.6 : 0;
    ctx.rotate(side * 0.85 + side * flick);
    ctx.fillStyle = rgba(p.outline);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.2, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.hideMid);
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.6, 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.hideShadow);
    ctx.beginPath();
    ctx.ellipse(side * -0.3, 0.1, 1.4, 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // head — tan ovoid (outline then fill), tilted toward lower-left
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(0.22); // the head-swing rotation (about the neck) supplies the toss tilt
  // outline
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, 0, 5.2, 6.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // tan face fill (shaded then mid)
  ctx.fillStyle = rgba(p.hideShadow);
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.6, 5.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.hideMid);
  ctx.beginPath();
  ctx.ellipse(-0.5, -0.6, 4.2, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // the WHITE FACE BLAZE — a pale stripe down the centre of the face (identity)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.6, 5.7, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = rgba(p.blaze);
  ctx.beginPath();
  ctx.moveTo(-1.3, -5.4);
  ctx.quadraticCurveTo(-2.0, 0, -1.4, 4.4);
  ctx.quadraticCurveTo(0, 5.4, 1.4, 4.4);
  ctx.quadraticCurveTo(2.0, 0, 1.3, -5.4);
  ctx.quadraticCurveTo(0, -6.2, -1.3, -5.4);
  ctx.closePath();
  ctx.fill();
  // a touch of lit tan on the upper-left cheek over the fill
  ctx.fillStyle = rgba(p.hideLight, 0.55);
  ctx.beginPath();
  ctx.ellipse(-2.6, -1.6, 1.8, 2.6, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // eyes (set to either side of the blaze)
  ctx.fillStyle = rgba([245, 243, 238]);
  for (const ex of [-2.4, 2.4]) {
    ctx.beginPath();
    ctx.arc(ex, -1.2, 1.0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = rgba([22, 18, 18]);
  for (const ex of [-2.2, 2.6]) {
    ctx.beginPath();
    ctx.arc(ex, -1.0, 0.58, 0, Math.PI * 2);
    ctx.fill();
  }

  // dark muzzle — broad soft snout at the lower face
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, 3.8, 3.8, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.muzzle);
  ctx.beginPath();
  ctx.ellipse(0, 3.6, 3.2, 2.3, 0, 0, Math.PI * 2);
  ctx.fill();
  // muzzle highlight + nostrils
  ctx.fillStyle = rgba([255, 255, 255], 0.12);
  ctx.beginPath();
  ctx.ellipse(-1.1, 2.6, 1.3, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([18, 14, 14]);
  for (const ex of [-1.1, 1.1]) {
    ctx.beginPath();
    ctx.ellipse(ex, 4.0, 0.55, 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore(); // end head transform
  ctx.restore(); // end head-swing rotation (neck + horns + head arc as one)

  // ── SCARF (winter) — a little knitted band around the neck, below the head ──
  // Drawn OUTSIDE the head-swing rotation so it stays put on the neck while the
  // head tosses (the scarf reads as wrapped around the steady neck).
  if (p.scarfAmt > 0.001) {
    const sx = hx + 5.0;
    const sy = hy + 4.0;
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // wrap band
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 5.2, 2.8, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // darker underside for depth
    ctx.fillStyle = rgba([
      Math.max(0, p.scarfColor[0] - 50),
      Math.max(0, p.scarfColor[1] - 30),
      Math.max(0, p.scarfColor[2] - 30),
    ]);
    ctx.beginPath();
    ctx.ellipse(sx + 0.6, sy + 1.3, 4.8, 1.5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // hanging tail of the scarf, with a knitted notch + fringe
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.moveTo(sx - 2.4, sy + 1.6);
    ctx.lineTo(sx + 1.0, sy + 2.2);
    ctx.lineTo(sx + 0.2, sy + 7.6);
    ctx.lineTo(sx - 3.0, sy + 6.8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba([
      Math.max(0, p.scarfColor[0] - 60),
      Math.max(0, p.scarfColor[1] - 40),
      Math.max(0, p.scarfColor[2] - 40),
    ]);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sx - 1.2, sy + 2.8);
    ctx.lineTo(sx - 1.6, sy + 7.0);
    ctx.stroke();
    // fringe at the bottom
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

  // breath-fog puff at the muzzle (winter) — drawn OUTSIDE the squash transform
  // so it reads as air, not body. Static base puff + an exhale swell during chew.
  if (p.breathFogAmt > 0.001) {
    const reach = 5.4 + pose.hop * 3.2;
    ctx.fillStyle = rgba([235, 244, 255], (0.34 + 0.28 * pose.hop) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(hx - reach, hy + 4.6, 3.0 + pose.hop * 2.0, 2.0 + pose.hop * 1.4, 0.2, 0, Math.PI * 2);
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
    ctx.lineJoin = "round";
    paintPad(ctx, p);
    paintLonghorn(ctx, p, pose);
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
// (coat thickens early); snow / frost / horn-snow / breath-fog / scarf LAG
// (settle late).
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
    blended.hornSnowAmt = lerp(a.hornSnowAmt, b.hornSnowAmt, kSnow);
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
      const by = 2;

      // Loose hair motes lifting off the thickening coat — reads the coat
      // visibly thickening. Present in EVERY morph (deterministic in p).
      const fluff = trans * (0.4 + 0.6 * Math.max(0, b.coatVolume - a.coatVolume + 0.4));
      if (fluff > 0.01) {
        ctx.fillStyle = rgba([232, 208, 176], 0.5 * fluff);
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
        const hx = bx - 14;
        const hy = by + 3;
        ctx.fillStyle = rgba([235, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(hx - (4 + trans * 3), hy + 4.6, 2.6 + trans * 1.8, 1.8 + trans * 1.2, 0.2, 0, Math.PI * 2);
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
