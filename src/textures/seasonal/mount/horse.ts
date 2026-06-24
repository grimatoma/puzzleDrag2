// Production seasonal art for the MOUNT HORSE board tile (`tile_mount_horse`) —
// the approved bold direction, mirroring the herd-sheep reference architecture.
// A single parameterized `paint(ctx, p, pose)` + four `P` presets + lerped
// transitions, pushed so the seasons read at a glance and the idle is a real,
// fun ACTION rather than a subtle breath.
//
// PALETTE LOCK: it is ALWAYS the same graceful BROWN horse — a brown body, a
// flowing DARK mane along the neck, a long DARK tail, a long head with perked
// ears, slender legs with dark hooves, standing on a pad. Seasons change only
// its coat VOLUME (sleek spring → thick shaggy winter coat), the coat GLOSS,
// the pad colour, the light wash, and BOLD dressing — snow on the back, a
// little winter SCARF, a breath-fog puff, a blossom, a fallen leaf, frost. The
// horse's identity colours + silhouette never change; it is never morphed into
// another animal and the signature mane + tail are always present.
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~0.9s): a HEAD-BOB — the head dips/bobs ~10–14px with an
//     ear-flick, a tail-swish, and a mane sway, plus a small body squash.
//   • RARE  ~18s (win ~1.2s): a STAMP / head-toss — the horse tosses its head
//     up (~14–18px) with the mane flying and stamps a front hoof, with
//     anticipation → toss/stamp → settle. May exit the box at the apex.
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

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

// coerce a wild / non-finite scalar to a finite fallback (never propagate NaN)
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

// Anticipation→action shape for the STAMP/head-toss: a brief gather (negative)
// before the rise, then a clean arc up and settle. q∈[0,1]. Returns a factor in
// roughly −0.2..+1 (negative = gather/anticipation, positive = peak toss).
function tossShape(q: number): number {
  if (q <= 0 || q >= 1) return 0;
  const antiEnd = 0.24; // first slice = gather/anticipation
  if (q < antiEnd) {
    // gather down a little (anticipation), zero slope at q=0
    const a = q / antiEnd;
    return -0.2 * (0.5 - 0.5 * Math.cos(a * Math.PI));
  }
  // toss arc, zero at the seam to the gather and at q=1
  const a = (q - antiEnd) / (1 - antiEnd);
  return Math.sin(a * Math.PI);
}

// ── The idle POSE (carries all action state into paint) ──────────────────────

interface Pose {
  bob: number; // whole-body vertical bob (design px, + = up). Stamp lifts this.
  lean: number; // signed body lean (design px sideways) during the toss
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  head: number; // head dip (design px, + = down) for the bob / lift for toss
  chew: number; // 0..1 muzzle/mouth motion amount
  ear: number; // 0..1 near-ear flick amount
  tail: number; // signed tail swish (design px sideways)
  mane: number; // signed mane sway (design px sideways)
  hop: number; // 0..1 front-hoof STAMP lift amount
}

const REST: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, chew: 0, ear: 0, tail: 0, mane: 0, hop: 0 };

// Build a pose from the wall clock: a common HEAD-BOB every ~6s and a rare
// STAMP / head-toss every ~18s. Returns to REST (all zeros / unit scales) at
// every window edge.
function poseFromClock(tIn: number): Pose {
  const t = safeNum(tIn, 0);
  const pose: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, chew: 0, ear: 0, tail: 0, mane: 0, hop: 0 };

  // COMMON ~6s: HEAD-BOB (win ~0.9s). Head dips ~10–14px, an ear flicks, the
  // tail swishes, the mane sways, small body squash. Built from raised-cosine
  // windows → seamless. Phase 3.0 opens the window at t≈3.0 (well clear of t=0,
  // so anim(0) sits exactly at REST).
  const cq = actionQ(t, 6, 0.9, 3.0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window
    // two head dips within the window (head dips down ~10–14px at the peak)
    pose.head = env * (6.0 + 8.0 * Math.abs(Math.sin(cq * Math.PI * 2)));
    pose.chew = env * (0.4 + 0.6 * Math.abs(Math.sin(cq * Math.PI * 2)));
    pose.ear = env;
    pose.tail = Math.sin(cq * Math.PI * 6) * env * 3.2; // a few swishes sideways
    pose.mane = Math.sin(cq * Math.PI * 4) * env * 2.0; // mane sways with the bob
    // small body squash as the head dips down
    pose.squashY = 1 - env * 0.05;
    pose.squashX = 1 + env * 0.04;
  }

  // RARE ~18s: STAMP / head-toss (win ~1.2s, phase +3s vs the common). The horse
  // tosses its head UP (~14–18px) with the mane flying and stamps a front hoof,
  // with anticipation → toss/stamp → settle. May lift OUTSIDE the design box.
  const hq = actionQ(t, 18, 1.2, 6.0);
  if (hq >= 0) {
    const s = tossShape(hq); // −0.2..+1 (gather then toss)
    const peak = Math.max(0, s);
    pose.bob += peak * 4.0; // a little whole-body lift at the apex
    pose.head -= peak * 17; // head tosses UP ~14–18px (head uses + = down)
    pose.mane += peak * 5.0; // mane flies during the toss
    pose.hop = peak; // front-hoof stamp lift, peaks with the toss
    pose.ear = Math.max(pose.ear, peak); // ears pin/flick during the toss
    pose.tail += Math.sin(hq * Math.PI) * 2.2; // tail flags during the toss
    if (s < 0) {
      // anticipation gather: squash down/wide + a slight lean
      const c = -s; // 0..0.2
      pose.squashY = 1 - c * 0.8;
      pose.squashX = 1 + c * 0.6;
      pose.lean = -c * 2.0;
    } else {
      // toss: stretch tall/narrow + a forward lean
      pose.squashY = 1 + s * 0.12;
      pose.squashX = 1 - s * 0.08;
      pose.lean = s * 1.6;
    }
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────
//
// IDENTITY colours (brown coat, dark mane/tail, soft muzzle, dark hooves/eyes)
// stay nearly constant — they live in P only so the light wash + coat thickness
// can nudge them very slightly between seasons. Everything that genuinely
// differs per season is the coat volume + gloss + pad + light + dressing.

interface P {
  coatLight: RGB; // lit top of the brown coat
  coatMid: RGB; // body brown tone
  coatShadow: RGB; // shaded underside of the brown coat
  mane: RGB; // dark mane + tail + forelock (locked dark)
  maneShade: RGB; // deeper shade inside the mane / tail
  muzzle: RGB; // soft muzzle / nostril / inner ear
  hoofDark: RGB; // hooves + eyes (the dark hard parts)
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  coatVolume: number; // 0..1 BOLD coat thickness (sleek → shaggy & puffed)
  gloss: number; // 0..1 glossy-coat sheen strength (summer peak)
  frostAmt: number; // 0..1 frost sparkle on the coat
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 a blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 a fallen leaf on the pad (autumn)
  breathFogAmt: number; // 0..1 breath puff at the muzzle (winter)
  scarfAmt: number; // 0..1 a little winter SCARF (tweened alpha)
  scarfColor: RGB; // scarf colour (locked plum, fades in via alpha)
}

// Four BOLD season presets. The horse stays the SAME brown, dark-maned,
// dark-tailed horse; only coat volume + gloss + pad + light + dressing differ —
// pushed HARD so each season reads at a glance.
const SP: Record<SeasonName, P> = {
  // Spring — sleek shiny coat, dewy lime pad + a blossom, cool-bright light.
  Spring: {
    coatLight: [172, 118, 70],
    coatMid: [134, 86, 48],
    coatShadow: [92, 56, 30],
    mane: [54, 34, 22],
    maneShade: [34, 20, 12],
    muzzle: [128, 84, 70],
    hoofDark: [44, 34, 28],
    padGrass: [124, 212, 80], // vivid fresh lime
    soil: [80, 142, 50],
    outline: [50, 30, 18],
    lightWash: [200, 240, 255], // cool-bright
    lightWashAmt: 0.2,
    coatVolume: 0.08, // BOLD: clearly sleek, very thin coat
    gloss: 0.55, // sleek shiny coat
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.9,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [122, 60, 110],
  },
  // Summer — glossy brown coat (PEAK), saturated mid-green pad, bright warm light.
  Summer: {
    coatLight: [186, 126, 74],
    coatMid: [146, 90, 46],
    coatShadow: [96, 56, 26],
    mane: [50, 30, 18],
    maneShade: [30, 17, 10],
    muzzle: [132, 86, 70],
    hoofDark: [40, 30, 24],
    padGrass: [76, 186, 60], // saturated mid-green
    soil: [50, 118, 38],
    outline: [46, 28, 16],
    lightWash: [255, 238, 178], // bright warm
    lightWashAmt: 0.2,
    coatVolume: 0.42, // full normal coat
    gloss: 0.98, // glossiest peak
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [122, 60, 110],
  },
  // Autumn — warm-tinted fuller coat, olive-tan pad + a fallen leaf, amber light.
  Autumn: {
    coatLight: [176, 114, 64],
    coatMid: [140, 84, 44],
    coatShadow: [92, 54, 28],
    mane: [52, 32, 20],
    maneShade: [32, 19, 11],
    muzzle: [126, 82, 68],
    hoofDark: [44, 33, 26],
    padGrass: [168, 138, 70], // olive-tan browning
    soil: [110, 84, 42],
    outline: [50, 30, 18],
    lightWash: [255, 184, 100], // low amber, BOLD
    lightWashAmt: 0.3,
    coatVolume: 0.7, // fuller
    gloss: 0.3, // dulled gloss
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.95,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [122, 60, 110],
  },
  // Winter — thick shaggy coat + back-snow + scarf + breath fog, snowy pad, cool light.
  Winter: {
    coatLight: [150, 108, 74],
    coatMid: [118, 80, 50],
    coatShadow: [84, 54, 34],
    mane: [50, 34, 26],
    maneShade: [30, 20, 14],
    muzzle: [124, 86, 76],
    hoofDark: [48, 40, 38],
    padGrass: [226, 238, 250], // snow on the pad
    soil: [146, 166, 192],
    outline: [56, 42, 34],
    lightWash: [188, 212, 252], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    coatVolume: 1, // BOLD: thick & shaggy winter coat
    gloss: 0.16, // matte
    frostAmt: 0.8,
    backSnowAmt: 0.9,
    padSnowAmt: 0.95,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.85,
    scarfAmt: 1, // a little scarf appears in winter
    scarfColor: [122, 60, 110],
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
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    coatVolume: lerp(a.coatVolume, b.coatVolume, t),
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
    coatVolume: clamp01(p.coatVolume),
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

// the low flat grass pad the horse stands on
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

  // a BOLD blossom cluster (spring)
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

// one slender leg: a thin brown cannon with a dark hoof at the base. `lift`
// raises the hoof off the pad (the front-hoof stamp).
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number, lift = 0): void {
  const footY = baseY - lift;
  // brown leg with outline
  ctx.strokeStyle = rgba(p.outline);
  ctx.lineWidth = 3.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, footY);
  ctx.stroke();
  ctx.strokeStyle = rgba(p.coatShadow);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, footY - 1.4);
  ctx.stroke();
  // dark hoof
  ctx.fillStyle = rgba(p.hoofDark);
  ctx.beginPath();
  ctx.ellipse(x, footY, 1.8, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// Trace the horse's barrel body path (constant silhouette). cx,cy = body centre.
// vol modestly puffs/shaggies the outline; the underlying shape is constant.
function bodyPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, vol: number): void {
  const rx = 12.5 * (0.97 + vol * 0.12);
  const ry = 7.8 * (0.97 + vol * 0.14);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, -0.06, 0, Math.PI * 2);
}

// the whole horse, standing front-¾ turned ~15-20° toward lower-left, posed by `pose`
function paintHorse(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  const vol = p.coatVolume;
  // body centre lifts with the stamp's whole-body bob and leans during the toss
  const bx = 2 + pose.lean;
  const by = 2 - pose.bob;

  // legs first (behind the body). Two far (dimmer/higher), two near. The front
  // near hoof stamps (lifts) with the rare toss.
  ctx.save();
  ctx.globalAlpha = 0.9;
  paintLeg(ctx, p, bx + 8.5, by + 5.5, 18.8);
  paintLeg(ctx, p, bx - 4, by + 5.5, 19.0);
  ctx.restore();
  // near legs (toward lower-left, slightly forward); front near leg stamps
  paintLeg(ctx, p, bx + 5.5, by + 6, 19.6);
  paintLeg(ctx, p, bx - 7, by + 6, 19.8, pose.hop * 5.5);

  // The whole upper body (barrel + neck + head + mane + tail + dressing) is
  // drawn under a squash/stretch transform centred on the body, so the toss
  // reads with anticipation squash + airborne stretch.
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-bx, -by);

  const maneSway = pose.mane;
  const tailSway = pose.tail;

  // ── TAIL — drawn behind the body, hanging from the upper-right rump.
  //    A long dark flowing tail (locked dark). tailSway swings the tip. ─────────
  {
    const tx0 = bx + 11;
    const ty0 = by - 4;
    ctx.strokeStyle = rgba(p.maneShade);
    ctx.lineWidth = 4.4 * (0.9 + vol * 0.25);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tx0, ty0);
    ctx.quadraticCurveTo(tx0 + 5 + tailSway, by + 4, tx0 + 3.5 + tailSway * 1.6, by + 13);
    ctx.stroke();
    ctx.strokeStyle = rgba(p.mane);
    ctx.lineWidth = 2.6 * (0.9 + vol * 0.25);
    ctx.beginPath();
    ctx.moveTo(tx0, ty0);
    ctx.quadraticCurveTo(tx0 + 5 + tailSway, by + 4, tx0 + 3.5 + tailSway * 1.6, by + 13);
    ctx.stroke();
    // wispy tail strands
    ctx.strokeStyle = rgba(p.maneShade, 0.8);
    ctx.lineWidth = 1.1;
    for (const off of [-1.6, 0, 1.8]) {
      ctx.beginPath();
      ctx.moveTo(tx0 + off * 0.4, ty0 + 2);
      ctx.quadraticCurveTo(tx0 + 4 + tailSway + off, by + 5, tx0 + 2.5 + tailSway * 1.6 + off, by + 13.5);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  }

  // ── BODY barrel — outline pass then shaded → mid → lit fill (layered) ────────
  // outline halo
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

  // glossy coat sheen band over the back (summer peak — gloss strong)
  if (p.gloss > 0.02) {
    ctx.save();
    bodyPath(ctx, bx, by, vol);
    ctx.clip();
    ctx.fillStyle = rgba([255, 255, 255], 0.12 + 0.2 * p.gloss);
    ctx.beginPath();
    ctx.ellipse(bx - 2, by - 4.4, 9, 2.4, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // shaggy winter coat fringe: a few soft tufts along the lower/belly edge,
  // only when the coat is thick (vol high). Constant silhouette otherwise.
  if (vol > 0.55) {
    const fr = (vol - 0.55) / 0.45;
    ctx.fillStyle = rgba(p.coatShadow, 0.9);
    const rx = 12.5 * (0.97 + vol * 0.12);
    const ry = 7.8 * (0.97 + vol * 0.14);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 0.15 + (i / 8) * Math.PI * 0.9; // lower-front arc
      const lx = bx + Math.cos(a) * rx * 1.02;
      const ly = by + Math.sin(a) * ry * 1.02;
      ctx.beginPath();
      ctx.arc(lx, ly, (1.2 + 1.1 * fr) * (i % 2 ? 1 : 0.8), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // snow settled on the back (winter) — a soft white cap on top of the back
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgba([248, 252, 255], 0.92 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx, by - 6.6, 9 * (0.9 + vol * 0.25), 3.0, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.85 * p.backSnowAmt);
    for (const [dx, dy] of [[-5, -7.4], [1, -8.0], [6, -7.0]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.6 + vol * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the coat (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-7, 0], [-2, 4], [4, -2], [8, 2], [0, -3], [-4, -5], [6, 4],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── NECK + HEAD (front-¾, lower-left). A long head with perked ears and a
  //    dark flowing mane down the neck; pose.head dips/lifts the muzzle. ───────
  const neckTopX = bx - 8;
  const neckTopY = by - 6;
  const hx = bx - 16; // head centre
  const hy = by - 1 + pose.head; // head dips (+head) on the bob, lifts (-head) on the toss

  // neck — a tapering brown wedge from the shoulder up toward the head
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.moveTo(bx - 3, by - 6);
  ctx.quadraticCurveTo(neckTopX - 1, neckTopY - 1, hx + 2.5, hy - 3.5);
  ctx.lineTo(hx + 4.5, hy + 3.5);
  ctx.quadraticCurveTo(neckTopX + 3, by + 1, bx - 1, by + 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(p.coatMid);
  ctx.beginPath();
  ctx.moveTo(bx - 3, by - 5.6);
  ctx.quadraticCurveTo(neckTopX - 0.6, neckTopY - 0.4, hx + 2.6, hy - 3);
  ctx.lineTo(hx + 4.2, hy + 3);
  ctx.quadraticCurveTo(neckTopX + 3, by + 0.6, bx - 1, by + 2.4);
  ctx.closePath();
  ctx.fill();
  // lit front edge of the neck
  ctx.strokeStyle = rgba(p.coatLight, 0.8);
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(hx + 4.0, hy + 2.6);
  ctx.quadraticCurveTo(neckTopX + 3, by + 0.4, bx - 1, by + 2);
  ctx.stroke();
  ctx.lineCap = "butt";

  // ── MANE — dark, flowing down the back/top of the neck. maneSway ripples
  //    the strand tips. Locked dark colour. ─────────────────────────────────
  {
    ctx.strokeStyle = rgba(p.maneShade);
    ctx.lineWidth = 3.0 * (0.9 + vol * 0.2);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx - 3, by - 6.2);
    ctx.quadraticCurveTo(neckTopX - 1, neckTopY - 1.8, hx + 2.2, hy - 4.6);
    ctx.stroke();
    // individual mane strands fluttering on the outer/back edge of the neck
    ctx.lineWidth = 1.3;
    const strands: Array<[number, number, number]> = [
      [bx - 4, by - 6, 0.2],
      [bx - 7.5, by - 6.8, 0.5],
      [neckTopX - 1, neckTopY - 1.2, 0.8],
      [hx + 1, hy - 4.4, 1.0],
    ];
    for (let i = 0; i < strands.length; i++) {
      const [sx, sy, ph] = strands[i];
      const sway = maneSway * (0.4 + ph);
      ctx.strokeStyle = rgba(i % 2 ? p.mane : p.maneShade, 0.92);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx - 1.4 + sway, sy + 2.4, sx - 0.8 + sway * 1.6, sy + 5.2);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  }

  // perked ears on the crown (brown outer + soft inner), toward lower-left.
  // The near (left) ear flicks with the idle.
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(hx + 1.4 + side * 1.6, hy - 5.2);
    const flick = side === -1 ? pose.ear * 0.5 : 0;
    ctx.rotate(-0.15 + side * 0.34 + flick);
    ctx.fillStyle = rgba(p.outline);
    ctx.beginPath();
    ctx.moveTo(0, 2.2);
    ctx.quadraticCurveTo(-1.0, -2.6, 0.2, -3.4);
    ctx.quadraticCurveTo(1.4, -2.4, 1.2, 2.0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba(p.coatMid);
    ctx.beginPath();
    ctx.moveTo(0.2, 1.8);
    ctx.quadraticCurveTo(-0.5, -2.0, 0.3, -2.8);
    ctx.quadraticCurveTo(1.0, -2.0, 0.9, 1.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba(p.muzzle, 0.8);
    ctx.beginPath();
    ctx.ellipse(0.4, -0.2, 0.5, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // head — long brown wedge muzzle, tilted toward lower-left
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(0.34 - pose.head * 0.01);
  // outline
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.2, 6.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // brown face fill (shaded then lit)
  ctx.fillStyle = rgba(p.coatShadow);
  ctx.beginPath();
  ctx.ellipse(0, 0, 3.5, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.coatMid);
  ctx.beginPath();
  ctx.ellipse(-0.4, -0.4, 3.1, 5.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.coatLight);
  ctx.beginPath();
  ctx.ellipse(-0.8, -0.9, 2.3, 3.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // forelock — a small dark tuft of mane between the ears, over the forehead
  ctx.fillStyle = rgba(p.maneShade);
  ctx.beginPath();
  ctx.moveTo(-1.4, -5.0);
  ctx.quadraticCurveTo(0.4, -6.2, 1.4, -4.6);
  ctx.quadraticCurveTo(0.2, -3.4, -1.0, -3.6);
  ctx.closePath();
  ctx.fill();

  // eye
  ctx.fillStyle = rgba(p.hoofDark);
  ctx.beginPath();
  ctx.ellipse(1.4, -1.6, 1.0, 1.3, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([255, 255, 255], 0.5);
  ctx.beginPath();
  ctx.arc(1.1, -2.0, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // soft muzzle / nostril at the lower face — flares slightly as it chews/snorts
  ctx.fillStyle = rgba(p.muzzle);
  ctx.beginPath();
  ctx.ellipse(0.4, 4.4, 2.4 + pose.chew * 0.4, 2.0, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.hoofDark, 0.85);
  ctx.beginPath();
  ctx.ellipse(0.9, 4.8, 0.6, 0.9 + pose.chew * 0.5, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore(); // end head transform

  // ── SCARF (winter) — a little knitted band around the neck, below the head ──
  if (p.scarfAmt > 0.001) {
    const sx = hx + 5.0;
    const sy = hy + 2.2;
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // wrap band around the neck
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 5.2, 3.0, 0.5, 0, Math.PI * 2);
    ctx.fill();
    // darker underside for depth
    ctx.fillStyle = rgba([
      Math.max(0, p.scarfColor[0] - 50),
      Math.max(0, p.scarfColor[1] - 30),
      Math.max(0, p.scarfColor[2] - 30),
    ]);
    ctx.beginPath();
    ctx.ellipse(sx + 0.8, sy + 1.4, 4.8, 1.6, 0.5, 0, Math.PI * 2);
    ctx.fill();
    // hanging tail of the scarf, with a knitted notch + fringe
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.moveTo(sx - 2.6, sy + 1.6);
    ctx.lineTo(sx + 1.0, sy + 2.2);
    ctx.lineTo(sx + 0.2, sy + 8.0);
    ctx.lineTo(sx - 3.2, sy + 7.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba([
      Math.max(0, p.scarfColor[0] - 60),
      Math.max(0, p.scarfColor[1] - 40),
      Math.max(0, p.scarfColor[2] - 40),
    ]);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sx - 1.4, sy + 3.0);
    ctx.lineTo(sx - 1.8, sy + 7.4);
    ctx.stroke();
    // fringe at the bottom
    ctx.strokeStyle = rgba(p.scarfColor);
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

  ctx.restore(); // end squash/stretch transform

  // breath-fog puff at the muzzle (winter) — drawn OUTSIDE the squash transform
  // so it reads as air, not body. Static base puff + a swell as it chews/snorts.
  if (p.breathFogAmt > 0.001) {
    const reach = 4.6 + pose.chew * 3.0;
    ctx.fillStyle = rgba([235, 244, 255], (0.34 + 0.28 * pose.chew) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(hx - reach, hy + 4.6, 2.8 + pose.chew * 1.8, 1.9 + pose.chew * 1.2, 0.2, 0, Math.PI * 2);
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
    paintHorse(ctx, p, pose);
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
      const bx = 2;
      const by = 2;

      // Loose coat motes lifting off the thickening coat — reads the coat
      // visibly fluffing/growing. Present in EVERY morph (deterministic in p).
      const fluff = trans * (0.4 + 0.6 * Math.max(0, b.coatVolume - a.coatVolume + 0.4));
      if (fluff > 0.01) {
        ctx.fillStyle = rgba([210, 180, 150], 0.4 * fluff);
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
        const hx = bx - 16;
        const hy = by - 1;
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
