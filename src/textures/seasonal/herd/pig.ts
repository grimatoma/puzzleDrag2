// Production seasonal art for the HERD PIG board tile (`tile_herd_pig`) — the
// approved bold direction, mirroring the herd SHEEP reference pattern. A single
// parameterized `paint(ctx, p, pose)` + four `P` presets + lerped transitions,
// pushed so the seasons read at a glance and the idle is a real, fun ACTION
// rather than a subtle breath.
//
// PALETTE LOCK: it is ALWAYS the same plump pink pig — a fat rounded body, a
// flat round snout with two nostrils, small floppy ears, short legs, and a
// little curly tail. Seasons change only its COAT/bristle VOLUME (sleek pink in
// spring/summer → a bit fluffier/bristlier in winter), the pad colour, the
// light wash, the skin gloss, and BOLD dressing — snow on the back, a little
// winter HOLLY SPRIG at the collar (its festive accessory, not a scarf), a
// breath-fog puff, blossoms, a fallen leaf, frost. The animal's
// identity colour (pink) never changes; the silhouette outline is identical for
// every `P` (only volume modestly fuzzes the bristle fringe). Keeps the snout +
// curly tail in every season — never morphs into another animal.
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~1.0s): a CHEW + ear-flick / snout-twitch — the head bobs
//     ~9px as it chews, an ear flicks, the curly tail wags, the body squashes a
//     touch.
//   • RARE  ~18s (win ~1.2s, phase +3s vs the chew): a happy HOP / wiggle — the
//     pig hops ~14px up with a stretch and a head shake (anticipation crouch →
//     arc → squash landing → settle). May lift OUTSIDE the −24..+24 design box.
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
  lift: number; // whole-body vertical lift (design px, + = up). Hop uses this.
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  headBob: number; // extra head dip (design px, + = down) for the chew
  jaw: number; // 0..1 jaw open / mouth chew amount
  earFlick: number; // 0..1 near-ear flick amount
  tail: number; // signed curly-tail wag (design px)
  shake: number; // signed head shake (design px sideways) for the hop
  fogPuff: number; // 0..1 extra breath-fog reach (winter chew exhale)
}

const REST: Pose = {
  lift: 0,
  squashX: 1,
  squashY: 1,
  headBob: 0,
  jaw: 0,
  earFlick: 0,
  tail: 0,
  shake: 0,
  fogPuff: 0,
};

// Build a pose from the wall clock: a common CHEW every ~6s and a rare HOP every
// ~18s. Returns to REST (all zeros / unit scales) at every window edge.
function poseFromClock(tIn: number): Pose {
  const t = safeNum(tIn, 0);
  const pose: Pose = {
    lift: 0,
    squashX: 1,
    squashY: 1,
    headBob: 0,
    jaw: 0,
    earFlick: 0,
    tail: 0,
    shake: 0,
    fogPuff: 0,
  };

  // COMMON ~6s: CHEW (win ~1.0s). Head bobs ~9px, mouth chatters, ear flicks,
  // curly tail wags. Built from raised-cosine windows → seamless. Phase 3.0
  // opens the window at t≈3.0 (well clear of t=0, so anim(0) sits at REST).
  const cq = actionQ(t, 6, 1.0, 3.0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window
    // two chew bobs within the window (head dips down ~9px at the peak)
    pose.headBob = env * (5.0 + 7.0 * Math.abs(Math.sin(cq * Math.PI * 2)));
    pose.jaw = env * (0.5 + 0.5 * Math.abs(Math.sin(cq * Math.PI * 2)));
    pose.earFlick = env;
    pose.tail = Math.sin(cq * Math.PI * 6) * env * 2.8; // a few curly wags
    // small body squash in time with the chew
    const sq = env * 0.05;
    pose.squashX = 1 + sq;
    pose.squashY = 1 - sq;
    pose.fogPuff = env; // winter: an exhale puff as it chews
  }

  // RARE ~18s: HOP (win ~1.2s). The whole pig bounces ~14px up with a squash
  // before and a stretch during, plus a head shake. May lift OUTSIDE the box.
  const hq = actionQ(t, 18, 1.2, 4.0);
  if (hq >= 0) {
    const env = bump(hq); // gates the shake to 0 at the edges
    const s = hopShape(hq); // −0.18..+1 (crouch then arc)
    pose.lift = Math.max(0, s) * 14; // up to ~14px airborne
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
    // a happy head shake + a little tail flag during the hop
    pose.shake += Math.sin(hq * Math.PI * 4) * env * 2.4;
    pose.tail += Math.sin(hq * Math.PI) * 1.4;
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────

interface P {
  skinLight: RGB; // lit top of the pink hide
  skinMid: RGB; // body tone
  skinShadow: RGB; // shaded underside of the hide
  snout: RGB; // flat round snout face
  hoof: RGB; // dark hoof / trotter tips
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  coatVolume: number; // 0..1 BOLD bristle/coat thickness (sleek → fluffy)
  bristleAmt: number; // 0..1 pale bristle strokes over the hide
  glossAmt: number; // 0..1 healthy skin sheen on the back
  frostAmt: number; // 0..1 frost sparkle on the hide
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 blossoms on the pad
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad
  breathFogAmt: number; // 0..1 breath puff at the snout
  scarfAmt: number; // 0..1 a little winter SCARF (tweened alpha)
  scarfColor: RGB; // scarf colour (locked, fades in via alpha)
}

// Four BOLD season presets. The pig stays the SAME plump pink snouted curly-
// tailed pig; only coat volume + gloss + pad + light + dressing differ — pushed
// HARD so each season reads at a glance. PALETTE LOCK on the pink hide.
const SP: Record<SeasonName, P> = {
  // Spring — clean sleek pink, a blossom on the pad, cool-bright light.
  Spring: {
    skinLight: [252, 200, 200],
    skinMid: [238, 162, 168],
    skinShadow: [196, 116, 128],
    snout: [232, 150, 158],
    hoof: [70, 50, 52],
    padGrass: [118, 214, 78], // vivid fresh lime
    soil: [78, 140, 48],
    outline: [120, 70, 78],
    lightWash: [196, 240, 255], // cool-bright
    lightWashAmt: 0.2,
    coatVolume: 0.06, // BOLD: clean & sleek
    bristleAmt: 0.04,
    glossAmt: 0.3,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.9,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  // Summer — glossy healthy PEAK pink, saturated green pad, bright warm light.
  Summer: {
    skinLight: [255, 198, 198],
    skinMid: [246, 158, 164],
    skinShadow: [198, 108, 122],
    snout: [240, 146, 154],
    hoof: [64, 44, 46],
    padGrass: [72, 184, 58], // saturated mid-green
    soil: [48, 116, 36],
    outline: [116, 62, 70],
    lightWash: [255, 238, 178], // warm
    lightWashAmt: 0.2,
    coatVolume: 0.16, // sleek healthy coat
    bristleAmt: 0.06,
    glossAmt: 0.7, // peak healthy sheen
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  // Autumn — warm-tinted pink, fuller bristles, a fallen leaf, dulled gloss.
  Autumn: {
    skinLight: [246, 192, 186],
    skinMid: [232, 150, 150],
    skinShadow: [190, 104, 110],
    snout: [228, 142, 144],
    hoof: [66, 46, 44],
    padGrass: [172, 138, 64], // olive-tan browning
    soil: [112, 82, 40],
    outline: [112, 62, 62],
    lightWash: [255, 184, 96], // low amber, BOLD
    lightWashAmt: 0.3,
    coatVolume: 0.55, // fuller bristles
    bristleAmt: 0.45,
    glossAmt: 0.22,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.95,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  // Winter — pink under a bit FLUFFIER pale bristles + back snow + a little
  // SCARF + breath-fog; snowy pad, cool blue-grey light. The pink hide stays
  // clearly visible underneath — same pig, clearly wintry.
  Winter: {
    skinLight: [244, 196, 198],
    skinMid: [224, 156, 162],
    skinShadow: [180, 116, 132],
    snout: [220, 148, 156],
    hoof: [70, 58, 64],
    padGrass: [226, 238, 250], // snow on the pad
    soil: [146, 166, 192],
    outline: [104, 72, 84],
    lightWash: [188, 212, 252], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    coatVolume: 1, // BOLD: a bit fluffier/bristlier
    bristleAmt: 0.95,
    glossAmt: 0.16,
    frostAmt: 0.85,
    backSnowAmt: 0.92,
    padSnowAmt: 0.95,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.85,
    scarfAmt: 1, // the winter accessory (a HOLLY SPRIG) fades in via this tween
    scarfColor: [206, 64, 60], // plumbing only; the holly uses its own greens/berry
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    skinLight: lerpRGB(a.skinLight, b.skinLight, t),
    skinMid: lerpRGB(a.skinMid, b.skinMid, t),
    skinShadow: lerpRGB(a.skinShadow, b.skinShadow, t),
    snout: lerpRGB(a.snout, b.snout, t),
    hoof: lerpRGB(a.hoof, b.hoof, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    coatVolume: lerp(a.coatVolume, b.coatVolume, t),
    bristleAmt: lerp(a.bristleAmt, b.bristleAmt, t),
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
    bristleAmt: clamp01(p.bristleAmt),
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

// the low flat grass pad the pig stands on
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

  // BOLD blossoms (spring)
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

// one short stubby leg: a thick pink stump with a dark trotter at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  // pink leg
  ctx.strokeStyle = rgba(p.skinShadow);
  ctx.lineWidth = 4.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // trotter / hoof
  ctx.fillStyle = rgba(p.hoof);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 2.0, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// the round plump body — a fat rounded ellipse; CONSTANT silhouette. coatVolume
// only modestly fuzzes the bristle fringe, never reshapes the pig.
function paintBody(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number, fill: string, scale: number): void {
  const rx = 13.4 * scale;
  const ry = 10.4 * scale;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

// a little corkscrew curly tail. `wiggle` shifts the curl tip for the idle wag.
function drawCurlyTail(ctx: CanvasRenderingContext2D, p: P, ox: number, oy: number, wiggle: number): void {
  ctx.save();
  ctx.translate(ox, oy);
  // outline pass (fatter, dark)
  ctx.strokeStyle = rgba(p.outline);
  ctx.lineWidth = 3.0;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(3.4, -1.4 + wiggle, 2.6, 1.6 + wiggle);
  ctx.quadraticCurveTo(1.9, 4.0 + wiggle, 4.0, 3.4 + wiggle * 0.6);
  ctx.stroke();
  // pink curl on top
  ctx.strokeStyle = rgba(p.skinMid);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(3.4, -1.4 + wiggle, 2.6, 1.6 + wiggle);
  ctx.quadraticCurveTo(1.9, 4.0 + wiggle, 4.0, 3.4 + wiggle * 0.6);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.restore();
}

// the whole pig, standing front-¾ turned ~15–20° toward lower-left, posed by `pose`
function paintPig(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  // legs stay PLANTED on the pad (they don't lift with the hop — they stretch).
  const bx = 0;
  const bodyY = 5 - pose.lift; // body centre lifts during the hop
  const legTop = bodyY + 6; // where the legs meet the body

  // ── legs first (behind the body) — four short stubby trotters on the pad ───
  // back legs slightly higher contact + dimmer for depth
  ctx.save();
  ctx.globalAlpha = 0.85;
  paintLeg(ctx, p, bx + 7, legTop, 18.6);
  paintLeg(ctx, p, bx - 6, legTop, 18.9);
  ctx.restore();
  // front legs
  paintLeg(ctx, p, bx + 4, legTop + 1, 19.2);
  paintLeg(ctx, p, bx - 8.5, legTop + 1, 19.4);

  // The whole upper body (body + head + tail + dressing) is drawn under a
  // squash/stretch transform centred on the body, so the hop reads with
  // anticipation squash + airborne stretch.
  ctx.save();
  ctx.translate(bx, bodyY);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-bx, -bodyY);

  const by = bodyY;

  // ── curly tail off the upper-right rear — wags via pose (behind the body) ───
  drawCurlyTail(ctx, p, bx + 12.6, by - 2, pose.tail);

  // ── BODY — dark outline pass first, then mid, then light top (layered) ─────
  paintBody(ctx, p, bx, by, rgba(p.outline), 1.06); // soft outline halo
  paintBody(ctx, p, bx, by, rgba(p.skinMid), 1.0); // body mid tone
  // shaded underside crescent + lit top, clipped to the body
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(bx, by, 13.4, 10.4, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = rgba(p.skinShadow, 0.7);
  ctx.beginPath();
  ctx.ellipse(bx + 2, by + 5.5, 13, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit top offset up-left (light from upper-left)
  ctx.fillStyle = rgba(p.skinLight);
  ctx.beginPath();
  ctx.ellipse(bx - 2.4, by - 3.4, 9.6, 6.4, -0.12, 0, Math.PI * 2);
  ctx.fill();
  // healthy skin sheen highlight on the back
  if (p.glossAmt > 0.001) {
    ctx.fillStyle = rgba([255, 255, 255], 0.34 * p.glossAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 4, by - 5.2, 4.4, 2.0, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── bristles over the hide (autumn fuller, winter thickest / fluffier) ─────
  if (p.bristleAmt > 0.02) {
    const n = Math.round(6 + p.bristleAmt * 10);
    ctx.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const u = i / Math.max(1, n - 1);
      const sx = bx - 9 + u * 19;
      const top = by - 9.4 - Math.sin(u * Math.PI) * 1.4;
      const len = 1.8 + p.coatVolume * 2.6;
      ctx.strokeStyle = rgba([238, 226, 224], 0.55 * p.bristleAmt);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(sx, top + 1.6);
      ctx.lineTo(sx - 0.6, top - len);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  }

  // snow settled on the back (winter) — BOLD white cap on top of the hide
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgba([248, 252, 255], 0.95 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 1, by - 8.2, 9.6 * (0.95 + p.coatVolume * 0.2), 3.4, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.9 * p.backSnowAmt);
    for (const [dx, dy] of [[-5, -9], [1, -9.8], [5, -8.6], [-2, -10.2]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.6 + p.coatVolume * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the hide (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgba([255, 255, 255], 0.85 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-7, 0], [-2, 4], [4, -1], [8, 2], [0, -2], [-4, -4], [6, 5],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── HEAD + flat round SNOUT (front-¾, lower-left) — locks identity ─────────
  // chew dips the head; hop shakes it sideways
  const hx = bx - 11.5 + pose.shake;
  const hy = by + 3.2 + pose.headBob;

  // floppy triangular ears (pink), behind/above the head. Near (left) ear flicks.
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(hx + side * 3.2 - 1, hy - 7.4);
    const flick = side === -1 ? pose.earFlick * 0.5 : 0;
    ctx.rotate(side * 0.5 - 0.25 + side * flick);
    // ear outline
    ctx.fillStyle = rgba(p.outline);
    ctx.beginPath();
    ctx.moveTo(0, -0.4);
    ctx.lineTo(3.4, 1.2);
    ctx.lineTo(1.0, 5.4);
    ctx.closePath();
    ctx.fill();
    // ear fill (floppy triangle)
    ctx.fillStyle = rgba(p.skinMid);
    ctx.beginPath();
    ctx.moveTo(0.2, 0.2);
    ctx.lineTo(2.8, 1.4);
    ctx.lineTo(1.1, 4.6);
    ctx.closePath();
    ctx.fill();
    // inner ear shadow
    ctx.fillStyle = rgba(p.skinShadow, 0.7);
    ctx.beginPath();
    ctx.moveTo(0.8, 1.0);
    ctx.lineTo(2.2, 1.7);
    ctx.lineTo(1.3, 3.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // head — a rounded pink ovoid tucked into the front-left of the body
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(0.16 + pose.headBob * 0.012);
  // outline
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, 0, 7.4, 6.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // head fill
  ctx.fillStyle = rgba(p.skinMid);
  ctx.beginPath();
  ctx.ellipse(0, 0, 6.6, 5.9, 0, 0, Math.PI * 2);
  ctx.fill();
  // cheek light (upper-left)
  ctx.fillStyle = rgba(p.skinLight, 0.9);
  ctx.beginPath();
  ctx.ellipse(-1.8, -1.8, 3.2, 2.6, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // eyes — small, friendly
  ctx.fillStyle = rgba([245, 245, 240]);
  for (const ex of [-1.6, 1.8]) {
    ctx.beginPath();
    ctx.arc(ex, -1.6, 1.0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = rgba([22, 18, 20]);
  for (const ex of [-1.5, 1.9]) {
    ctx.beginPath();
    ctx.arc(ex, -1.4, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // flat round SNOUT — a disc on the lower-front of the face with two nostrils
  // outline
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(-0.6, 3.4, 4.6, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // snout face
  ctx.fillStyle = rgba(p.snout);
  ctx.beginPath();
  ctx.ellipse(-0.6, 3.4, 3.9, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  // snout top light rim
  ctx.fillStyle = rgba(p.skinLight, 0.55);
  ctx.beginPath();
  ctx.ellipse(-1.4, 2.2, 2.2, 1.0, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // two nostrils — open a touch as it chews
  ctx.fillStyle = rgba([90, 48, 56]);
  for (const ex of [-2.0, 0.8]) {
    ctx.beginPath();
    ctx.ellipse(ex, 3.6, 0.7, 1.1 + pose.jaw * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // chewing mouth — a small dark line/oval under the snout opening with the jaw
  if (pose.jaw > 0.01) {
    ctx.fillStyle = rgba([70, 36, 44]);
    ctx.beginPath();
    ctx.ellipse(-0.6, 6.0, 1.6, 0.5 + pose.jaw * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.restore(); // end squash/stretch transform

  // ── HOLLY SPRIG (winter) — a little festive holly cluster pinned at the collar
  // instead of a scarf: two serrated holly leaves + a trio of red berries. Drawn
  // OUTSIDE the squash transform, anchored to the (posed) head, and gated by the
  // same winter `scarfAmt` tween (fades in over autumn→winter / out in reverse).
  if (p.scarfAmt > 0.001) {
    const sx = hx + 5.0;
    const sy = hy + 4.4;
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // holly palette (fixed; the pink hide stays the identity colour)
    const leafDark: RGB = [22, 96, 54];
    const leafLight: RGB = [54, 150, 84];
    const berry: RGB = [206, 44, 46];
    // one serrated holly leaf as a spiky lozenge, drawn at a given rotation
    const drawLeaf = (lx: number, ly: number, rot: number, len: number): void => {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      // dark leaf body — a pointed lozenge with a few saw-tooth spikes per side
      ctx.fillStyle = rgba(leafDark);
      ctx.beginPath();
      ctx.moveTo(-len, 0);
      ctx.quadraticCurveTo(-len * 0.4, -2.2, 0, -1.0);
      ctx.quadraticCurveTo(len * 0.5, -2.4, len, 0);
      ctx.quadraticCurveTo(len * 0.5, 2.4, 0, 1.0);
      ctx.quadraticCurveTo(-len * 0.4, 2.2, -len, 0);
      ctx.closePath();
      ctx.fill();
      // lit upper edge for a glossy holly sheen (light from upper-left)
      ctx.fillStyle = rgba(leafLight, 0.85);
      ctx.beginPath();
      ctx.moveTo(-len * 0.8, -0.4);
      ctx.quadraticCurveTo(0, -2.0, len * 0.8, -0.4);
      ctx.quadraticCurveTo(0, -0.8, -len * 0.8, -0.4);
      ctx.closePath();
      ctx.fill();
      // a central vein
      ctx.strokeStyle = rgba(leafDark);
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-len * 0.85, 0);
      ctx.lineTo(len * 0.85, 0);
      ctx.stroke();
      ctx.restore();
    };
    // two leaves splaying from the collar
    drawLeaf(sx - 1.4, sy + 1.2, -0.5, 4.4);
    drawLeaf(sx + 1.8, sy + 1.6, 0.42, 4.0);
    // a trio of glossy red berries nestled where the leaves meet
    for (const [bxp, byp] of [[sx - 0.2, sy + 0.4], [sx + 1.4, sy + 0.8], [sx + 0.5, sy + 2.0]] as const) {
      ctx.fillStyle = rgba(berry);
      ctx.beginPath();
      ctx.arc(bxp, byp, 1.5, 0, Math.PI * 2);
      ctx.fill();
      // tiny highlight glint (upper-left)
      ctx.fillStyle = rgba([255, 220, 210], 0.85);
      ctx.beginPath();
      ctx.arc(bxp - 0.5, byp - 0.5, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // breath-fog puff at the snout (winter) — drawn OUTSIDE the squash transform so
  // it reads as air, not body. Static base puff + an exhale swell during chew.
  if (p.breathFogAmt > 0.001) {
    const reach = 5.6 + pose.fogPuff * 3.2;
    ctx.fillStyle = rgba([235, 244, 255], (0.34 + 0.28 * pose.fogPuff) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(hx - reach, hy + 3.8, 3.0 + pose.fogPuff * 2.0, 2.0 + pose.fogPuff * 1.4, 0.2, 0, Math.PI * 2);
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
    paintPig(ctx, p, pose);
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
// (bristles fuzz early); snow / frost / breath-fog / scarf LAG (settle late).
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
    blended.bristleAmt = lerp(a.bristleAmt, b.bristleAmt, kCoat);
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

      // Loose fluff motes lifting off the thickening coat — reads the coat
      // visibly fluffing/growing. Present in EVERY morph (deterministic in p).
      const fluff = trans * (0.4 + 0.6 * Math.max(0, b.coatVolume - a.coatVolume + 0.4));
      if (fluff > 0.01) {
        ctx.fillStyle = rgba([245, 236, 234], 0.5 * fluff);
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
        const hx = bx - 11.5;
        const hy = by + 3.2;
        ctx.fillStyle = rgba([235, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(hx - (4 + trans * 3), hy + 3.8, 2.6 + trans * 1.8, 1.8 + trans * 1.2, 0.2, 0, Math.PI * 2);
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
