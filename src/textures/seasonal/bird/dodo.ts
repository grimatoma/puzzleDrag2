// Production seasonal art for the BIRD DODO board tile (`tile_bird_dodo`) — the
// approved bold direction, mirroring the herd-sheep reference architecture. A
// single parameterized `paint(ctx, p, pose)` + four `P` presets + lerped
// transitions, pushed so the seasons read at a glance and the idle is a real,
// FUN action rather than a subtle breath.
//
// PALETTE LOCK: it is ALWAYS the same plump, comical, flightless GREY-BROWN
// dodo — a big round body, a huge hooked yellow-grey beak on a bare greyish
// face, tiny useless stubby wings, a little curly tuft tail, and sturdy YELLOW
// legs, standing on a pad. Seasons change only its plumage VOLUME (sleek spring
// → extra-puffy winter), a warm/cool tone wash, the pad colour, the light wash,
// and BOLD dressing — snow on the back, a little winter SCARF, a breath-fog
// puff, a blossom, a fallen leaf (sometimes perched on its head), frost, gloss.
// The dodo's identity colours + silhouette never change; only volume scales it.
// Never morph it into another animal — lean into its goofy charm.
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~0.95s): a PECK + clumsy head-bob — the big head dips
//     ~12px to peck then bobs up, with a comedic body waddle/squash and a tiny
//     wing twitch.
//   • RARE  ~18s (win ~1.2s, phase +3s): a FLAP-AND-FAIL HOP — the dodo flaps
//     its tiny useless wings and does a clumsy little hop (~14px) that doesn't
//     achieve flight, then plops back with a big squash landing. The hop may
//     lift OUTSIDE the −24..+24 design box at its apex (fine).
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
  if (!(x >= 0)) return 0; // also catches NaN
  return x > 1 ? 1 : x;
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
// rise, then a clean arc up and a settle. q∈[0,1]. Returns a LIFT factor in
// roughly −0.2..+1 (negative = squash-down crouch, positive = airborne).
function hopShape(q: number): number {
  if (q <= 0 || q >= 1) return 0;
  const antiEnd = 0.26; // first slice = crouch/anticipation (a clumsy wind-up)
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
  bob: number; // whole-body vertical lift (design px, + = up). Hop uses this.
  lean: number; // signed body lean / waddle (design px sideways)
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  head: number; // extra head lift (design px, + = up)
  peck: number; // extra head dip (design px, + = down) for the peck
  hop: number; // 0..1 "airborne" amount (drives the fail-flap landing read)
  wing: number; // 0..1 wing twitch / flap amount
  tail: number; // signed tail flag (design px sideways)
  fogPuff: number; // 0..1 extra breath-fog reach (winter exhale)
}

const REST: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, peck: 0, hop: 0, wing: 0, tail: 0, fogPuff: 0 };

// Build a pose from the wall clock: a common PECK+bob every ~6s and a rare
// FLAP-AND-FAIL HOP every ~18s. Returns to REST (all zeros / unit scales) at
// every window edge.
function poseFromClock(tIn: number): Pose {
  const t = safeNum(tIn, 0);
  const pose: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, peck: 0, hop: 0, wing: 0, tail: 0, fogPuff: 0 };

  // COMMON ~6s: PECK + clumsy head-bob (win ~0.95s). The big head dips ~12px to
  // peck the pad then bobs up, with a comedic body waddle/squash and a tiny wing
  // twitch. Built from raised-cosine windows → seamless. Phase 3.0 opens the
  // window at t≈3.0 (well clear of t=0, so anim(0) sits exactly at REST).
  const cq = actionQ(t, 6, 0.95, 3.0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window
    // a sharp DOWN peck near the front of the window, then bob UP on the way out
    const peckDip = Math.max(0, Math.sin(cq * Math.PI)); // single down-stroke
    pose.peck = env * peckDip * 12.0; // big head dips ~12px to peck
    pose.head = env * (1 - peckDip) * 4.0; // bobs up afterward
    // comedic body waddle/squash following the head
    pose.lean = Math.sin(cq * Math.PI * 2) * env * 2.6;
    pose.squashY = 1 - env * peckDip * 0.07; // squat a touch on the dip
    pose.squashX = 1 + env * peckDip * 0.06;
    pose.wing = env * 0.5 * Math.abs(Math.sin(cq * Math.PI * 4)); // tiny twitch
    pose.tail = Math.sin(cq * Math.PI * 5) * env * 2.0;
    pose.fogPuff = env * peckDip; // winter: an exhale puff as it pecks
  }

  // RARE ~18s: FLAP-AND-FAIL HOP (win ~1.2s, phase +3s extra so it never
  // coincides with the peck at t=0). The dodo flaps its useless wings and hops
  // ~14px — failing to fly — then plops back with a big squash landing. May
  // lift OUTSIDE the design box at the apex.
  const hq = actionQ(t, 18, 1.2, 4.0);
  if (hq >= 0) {
    const s = hopShape(hq); // −0.2..+1 (crouch then arc)
    pose.bob = Math.max(0, s) * 14; // up to ~14px airborne — and no higher
    pose.hop = Math.max(0, s);
    // frantic useless wing-flapping all through the hop (fast, comedic)
    const env = bump(hq);
    pose.wing = Math.max(pose.wing, env * (0.7 + 0.3 * Math.abs(Math.sin(hq * Math.PI * 10))));
    if (s < 0) {
      // anticipation crouch: squash down/wide (clumsy wind-up)
      const c = -s; // 0..0.2
      pose.squashY = 1 - c * 1.0;
      pose.squashX = 1 + c * 0.8;
    } else if (hq > 0.84) {
      // the PLOP landing: a big squash as it thumps back down
      const land = (hq - 0.84) / 0.16; // 0..1 over the tail of the window
      const plop = Math.sin(land * Math.PI); // 0→1→0 landing pulse
      pose.squashY = 1 - plop * 0.22;
      pose.squashX = 1 + plop * 0.2;
    } else {
      // airborne: stretch tall/narrow at the apex
      pose.squashY = 1 + s * 0.12;
      pose.squashX = 1 - s * 0.09;
    }
    // a little tail flag + lean during the hop
    pose.tail += Math.sin(hq * Math.PI) * 1.6;
    pose.lean += Math.sin(hq * Math.PI * 2) * env * 1.2;
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────

interface P {
  bodyLight: RGB; // bright top of the grey-brown plumage
  bodyMid: RGB; // body tone
  bodyShadow: RGB; // shaded underside of the plumage
  faceBare: RGB; // bare greyish face skin
  beak: RGB; // big hooked beak (yellow-grey)
  beakDark: RGB; // shaded underside / hook of the beak
  legs: RGB; // sturdy yellow legs + feet
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  plumeVolume: number; // 0..1 BOLD puff of the plumage (sleek spring → fluffy winter)
  glossAmt: number; // 0..1 glossy feather sheen (peak in summer)
  frostAmt: number; // 0..1 frost sparkle on the plumage
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 a blossom on the pad
  fallenLeafAmt: number; // 0..1 a fallen leaf (pad + perched on the head)
  breathFogAmt: number; // 0..1 breath puff at the beak
  scarfAmt: number; // 0..1 a little winter SCARF (tweened alpha) — disabled here
  scarfColor: RGB; // scarf colour (kept for tween plumbing; scarf unused on the dodo)
  capAmt: number; // 0..1 a little winter BOBBLE/WOOL CAP on the head (tweened alpha)
  capColor: RGB; // cap knit colour
}

// Four BOLD season presets. The dodo stays the SAME round grey-brown big-beaked
// goofy bird; only volume + tone + pad + light + dressing differ — pushed HARD
// so each season reads at a glance.
const SP: Record<SeasonName, P> = {
  // Spring — sleeker plumage, a blossom on the pad, cool-bright light.
  Spring: {
    bodyLight: [190, 194, 198],
    bodyMid: [152, 156, 162],
    bodyShadow: [110, 114, 122],
    faceBare: [176, 174, 170],
    beak: [206, 192, 130],
    beakDark: [150, 134, 84],
    legs: [224, 188, 86],
    padGrass: [128, 212, 84], // vivid fresh lime
    soil: [82, 134, 50],
    outline: [62, 60, 64],
    lightWash: [200, 240, 255], // cool-bright
    lightWashAmt: 0.2,
    plumeVolume: 0.08, // BOLD: clearly sleek / smoothed-down spring coat
    glossAmt: 0,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.9,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
    capAmt: 0,
    capColor: [180, 70, 60],
  },
  // Summer — full glossy plumage (PEAK), saturated green pad, bright warm light.
  Summer: {
    bodyLight: [178, 172, 164],
    bodyMid: [140, 132, 124],
    bodyShadow: [98, 92, 88],
    faceBare: [168, 162, 154],
    beak: [214, 198, 128],
    beakDark: [152, 132, 76],
    legs: [232, 192, 80],
    padGrass: [80, 176, 60], // saturated mid-green
    soil: [50, 116, 38],
    outline: [56, 52, 50],
    lightWash: [255, 238, 178], // bright warm
    lightWashAmt: 0.22,
    plumeVolume: 0.5, // full normal plumage
    glossAmt: 0.85, // glossy peak
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
    capAmt: 0,
    capColor: [180, 70, 60],
  },
  // Autumn — warm-tinted fuller plumage, a fallen leaf (pad + on the head),
  // dulled gloss, amber light.
  Autumn: {
    bodyLight: [184, 168, 148],
    bodyMid: [146, 128, 108],
    bodyShadow: [102, 86, 70],
    faceBare: [172, 158, 144],
    beak: [206, 182, 108],
    beakDark: [148, 122, 66],
    legs: [220, 176, 68],
    padGrass: [168, 138, 70], // olive-tan browning
    soil: [108, 84, 42],
    outline: [58, 48, 42],
    lightWash: [255, 184, 96], // low amber, BOLD
    lightWashAmt: 0.3,
    plumeVolume: 0.74, // thicker
    glossAmt: 0.12, // dulled gloss
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.95,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
    capAmt: 0,
    capColor: [180, 70, 60],
  },
  // Winter — FLUFFED extra-puffy plumage (very round + cute), snow on the back,
  // a little SCARF, a breath-fog puff, frost, cool blue-grey light; snowy pad.
  // The same goofy grey dodo stays clearly visible underneath.
  Winter: {
    bodyLight: [200, 204, 212],
    bodyMid: [152, 158, 168],
    bodyShadow: [104, 110, 124],
    faceBare: [180, 180, 184],
    beak: [200, 188, 134],
    beakDark: [146, 130, 86],
    legs: [214, 176, 84],
    padGrass: [224, 234, 246], // snow on the pad
    soil: [148, 166, 190],
    outline: [70, 70, 84],
    lightWash: [188, 212, 252], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    plumeVolume: 1, // BOLD: extra-fluffed, very round + cute
    glossAmt: 0,
    frostAmt: 0.85,
    backSnowAmt: 0.92,
    padSnowAmt: 0.95,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.85,
    scarfAmt: 0, // SCARF disabled on the dodo — it wears a BOBBLE CAP instead
    scarfColor: [206, 64, 60],
    capAmt: 1, // a little bobble cap appears in winter
    capColor: [180, 70, 60], // warm red wool cap
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    bodyLight: lerpRGB(a.bodyLight, b.bodyLight, t),
    bodyMid: lerpRGB(a.bodyMid, b.bodyMid, t),
    bodyShadow: lerpRGB(a.bodyShadow, b.bodyShadow, t),
    faceBare: lerpRGB(a.faceBare, b.faceBare, t),
    beak: lerpRGB(a.beak, b.beak, t),
    beakDark: lerpRGB(a.beakDark, b.beakDark, t),
    legs: lerpRGB(a.legs, b.legs, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    plumeVolume: lerp(a.plumeVolume, b.plumeVolume, t),
    glossAmt: lerp(a.glossAmt, b.glossAmt, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    backSnowAmt: lerp(a.backSnowAmt, b.backSnowAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
    breathFogAmt: lerp(a.breathFogAmt, b.breathFogAmt, t),
    scarfAmt: lerp(a.scarfAmt, b.scarfAmt, t),
    scarfColor: lerpRGB(a.scarfColor, b.scarfColor, t),
    capAmt: lerp(a.capAmt, b.capAmt, t),
    capColor: lerpRGB(a.capColor, b.capColor, t),
  };
}

// clamp every scalar field defensively (never throw on a wild `p`)
function clampP(p: P): P {
  return {
    ...p,
    lightWashAmt: clamp01(p.lightWashAmt),
    plumeVolume: clamp01(p.plumeVolume),
    glossAmt: clamp01(p.glossAmt),
    frostAmt: clamp01(p.frostAmt),
    backSnowAmt: clamp01(p.backSnowAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    breathFogAmt: clamp01(p.breathFogAmt),
    scarfAmt: clamp01(p.scarfAmt),
    capAmt: clamp01(p.capAmt),
  };
}

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat grass pad the dodo stands on
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
    for (const [bx, by] of [[-12, 18.5], [10, 20], [2, 21]] as const) {
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

// one sturdy yellow leg: a short cylinder with a three-toed foot at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  // leg outline pass for a soft dark rim
  ctx.strokeStyle = rgba(p.outline);
  ctx.lineWidth = 4.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // yellow leg
  ctx.strokeStyle = rgba(p.legs);
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // three-toed foot fanning forward (toward lower-left)
  ctx.strokeStyle = rgba(p.legs);
  ctx.lineWidth = 1.8;
  for (const dx of [-2.6, -0.4, 2] as const) {
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + dx, baseY + 1.4);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

// the round plump body — a fat egg-shaped cloud of grey-brown plumage. The
// fluffed outline grows BOLDLY with plumeVolume (winter); silhouette stays the
// same goofy egg shape.
function paintBody(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number, fill: string, scallop: number): void {
  const vol = 0.86 + p.plumeVolume * 0.4;
  const rx = 11.5 * vol;
  const ry = 12.5 * vol; // taller-than-wide round plump body
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  // soft feathery lumps around the perimeter — bigger with volume (winter fluff)
  const lumps = 13;
  const lumpR = (1.6 + p.plumeVolume * 2.4) * scallop;
  for (let i = 0; i < lumps; i++) {
    const a = (i / lumps) * Math.PI * 2 - Math.PI / 2;
    const lx = cx + Math.cos(a) * rx * 0.96;
    const ly = cy + Math.sin(a) * ry * 0.96;
    ctx.beginPath();
    ctx.arc(lx, ly, lumpR, 0, Math.PI * 2);
    ctx.fill();
  }
}

// the whole dodo, standing front-¾ turned toward lower-left, posed by `pose`
function paintDodo(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  // legs stay PLANTED on the pad (they don't lift with the hop — they stretch).
  const bx = 1;
  const bodyY = 3 - pose.bob; // body centre lifts during the hop
  const by = bodyY;
  const legTop = bodyY + 8; // where the legs meet the body

  // ── legs first (behind the body). Two sturdy yellow legs on the pad. ───────
  paintLeg(ctx, p, bx - 3, legTop, 19.4);
  paintLeg(ctx, p, bx + 3.5, legTop, 18.9);

  // The whole upper body (plumage + head + beak + dressing) is drawn under a
  // squash/stretch transform centred on the body + a sideways waddle lean, so
  // the peck squat and the hop anticipation/landing read.
  ctx.save();
  ctx.translate(bx + pose.lean, bodyY);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-bx, -bodyY);

  // ── small curly tail-feather tuft at the upper-right rear (behind body) ────
  ctx.save();
  ctx.strokeStyle = rgba(p.bodyLight);
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  for (const [ox, oy, curl] of [[0, -2, 0.8], [1.6, 0.4, 1.0], [0.6, 2.2, 0.6]] as const) {
    const tw = pose.tail * 0.4; // tail flags sideways with the pose
    ctx.beginPath();
    ctx.moveTo(bx + 9.5 + ox, by - 4 + oy);
    ctx.quadraticCurveTo(bx + 13 + ox + tw, by - 5 + oy, bx + 13.6 + ox + tw, by - 2 + oy + curl);
    ctx.quadraticCurveTo(bx + 14 + ox + tw, by + 0.6 + oy, bx + 12 + ox, by + oy);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  ctx.restore();

  // ── BODY — dark outline pass first, then shaded fill, then lit fill ────────
  paintBody(ctx, p, bx, by, rgba(p.outline), 1.16); // outline halo
  paintBody(ctx, p, bx, by, rgba(p.bodyShadow), 1.0); // shaded plumage
  // mid body
  const volMid = 0.86 + p.plumeVolume * 0.4;
  ctx.fillStyle = rgba(p.bodyMid);
  ctx.beginPath();
  ctx.ellipse(bx, by, 11.2 * volMid, 12 * volMid, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit plumage offset up-left (light from upper-left)
  ctx.save();
  ctx.translate(-1.6, -2);
  ctx.fillStyle = rgba(p.bodyLight);
  ctx.beginPath();
  ctx.ellipse(bx, by, 8.4 * volMid, 9.2 * volMid, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // glossy feather sheen (summer peak) — a soft bright sweep up-left
  if (p.glossAmt > 0.001) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = rgba([255, 255, 255], 0.5 * p.glossAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 3.5, by - 4, 4.6, 7.0, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── tiny stubby useless wing on the near (left) flank — twitches/flaps ─────
  ctx.save();
  ctx.translate(bx - 8.5, by + 1.5);
  ctx.rotate(0.5 - pose.wing * 0.9); // flaps up as the dodo tries (and fails) to fly
  ctx.fillStyle = rgba(p.bodyShadow);
  ctx.beginPath();
  ctx.ellipse(0, 0, 3.6 + pose.wing * 1.2, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.bodyMid);
  ctx.beginPath();
  ctx.ellipse(-0.4, -0.4, 2.8 + pose.wing * 1.0, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // snow settled on the back (winter) — a BOLD soft white cap on top of the body
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgba([248, 252, 255], 0.95 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 1, by - 9.6 * volMid, 8 * (0.9 + p.plumeVolume * 0.35), 3.4, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.9 * p.backSnowAmt);
    for (const [dx, dy] of [[-4, -10.6], [1, -11.4], [5, -10], [-1, -12]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy * volMid, 1.6 + p.plumeVolume * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the plumage (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgba([255, 255, 255], 0.85 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-6, -2], [-2, 4], [3, -4], [6, 1], [0, -6], [-4, 1], [4, 5],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── HEAD (front-¾, set high-left over the body) — pecks/bobs via pose ───────
  const headShift = pose.peck - pose.head; // + = down (peck), − = up (bob)
  const hx = bx - 7.5;
  const hy = by - 9.5 + headShift;

  // thick neck connecting body to head (follows the head as it pecks/bobs)
  ctx.strokeStyle = rgba(p.outline);
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx - 3, by - 5);
  ctx.lineTo(hx + 1.5, hy + 3);
  ctx.stroke();
  ctx.strokeStyle = rgba(p.bodyMid);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(bx - 3, by - 5);
  ctx.lineTo(hx + 1.5, hy + 3);
  ctx.stroke();
  ctx.lineCap = "butt";

  // head — bare greyish face ovoid (outline then fill)
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 6.2, 6.6, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.faceBare);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 5.4, 5.8, -0.12, 0, Math.PI * 2);
  ctx.fill();
  // gentle cheek light (upper-left)
  ctx.fillStyle = rgba([255, 255, 255], 0.12);
  ctx.beginPath();
  ctx.ellipse(hx - 1.6, hy - 1.8, 2.4, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // eye — small, set on the face
  ctx.fillStyle = rgba([245, 245, 240]);
  ctx.beginPath();
  ctx.arc(hx - 1.6, hy - 1, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([22, 20, 22]);
  ctx.beginPath();
  ctx.arc(hx - 1.8, hy - 0.8, 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([255, 255, 255], 0.9);
  ctx.beginPath();
  ctx.arc(hx - 2.1, hy - 1.2, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // ── BIG HOOKED BEAK — the iconic dodo feature, pointing down-left ──────────
  ctx.save();
  ctx.translate(hx - 3.5, hy + 2.6);
  ctx.rotate(0.5);
  // outline
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.moveTo(2.4, -4);
  ctx.quadraticCurveTo(-6.5, -2.4, -8.6, 3.6); // upper edge sweeping down-left
  ctx.quadraticCurveTo(-9.6, 6.8, -6.2, 7.4); // the hooked tip curling down
  ctx.quadraticCurveTo(-7.4, 4.6, -3, 3.2); // underside back toward the base
  ctx.quadraticCurveTo(0.6, 2.2, 2.4, -1); // base underside
  ctx.closePath();
  ctx.fill();
  // beak fill
  ctx.fillStyle = rgba(p.beak);
  ctx.beginPath();
  ctx.moveTo(2, -3.4);
  ctx.quadraticCurveTo(-6, -1.8, -7.9, 3.6);
  ctx.quadraticCurveTo(-8.7, 6.2, -6, 6.7);
  ctx.quadraticCurveTo(-6.9, 4.4, -2.8, 2.9);
  ctx.quadraticCurveTo(0.4, 1.9, 2, -0.8);
  ctx.closePath();
  ctx.fill();
  // shaded underside + hook (darker)
  ctx.fillStyle = rgba(p.beakDark);
  ctx.beginPath();
  ctx.moveTo(-5.6, 6.6);
  ctx.quadraticCurveTo(-8.6, 6.0, -7.6, 3.4);
  ctx.quadraticCurveTo(-6.4, 4.6, -3, 3.2);
  ctx.quadraticCurveTo(-4.2, 5.2, -5.6, 6.6);
  ctx.closePath();
  ctx.fill();
  // soft highlight along the lit upper ridge
  ctx.strokeStyle = rgba([255, 255, 255], 0.32);
  ctx.lineWidth = 1;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(1.4, -2.6);
  ctx.quadraticCurveTo(-5, -1, -7, 3);
  ctx.stroke();
  // nostril slit near the base
  ctx.strokeStyle = rgba(p.beakDark);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-1.4, -0.4);
  ctx.lineTo(-3.2, 0.8);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.restore();

  // a fallen leaf perched on the head for comedy (autumn) — rides with the head
  if (p.fallenLeafAmt > 0.001) {
    ctx.save();
    ctx.translate(hx + 1.6, hy - 5.4);
    ctx.rotate(-0.4);
    ctx.fillStyle = rgba([206, 110, 40], p.fallenLeafAmt);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.4, 1.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba([110, 58, 24], p.fallenLeafAmt);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-3.0, 0);
    ctx.lineTo(3.0, 0);
    ctx.stroke();
    ctx.restore();
  }

  // ── BOBBLE / WOOL CAP (winter) — a snug knit cap pulled over the dodo's crown
  // with a fuzzy turn-up brim and a little pom-pom on top. Tweened alpha
  // (winter-only, seamless); drawn in the head frame so it rides with the bob. ──
  if (p.capAmt > 0.01) {
    ctx.save();
    ctx.globalAlpha = clamp01(p.capAmt);
    const dk: RGB = [
      Math.max(0, p.capColor[0] - 45),
      Math.max(0, p.capColor[1] - 40),
      Math.max(0, p.capColor[2] - 35),
    ];
    // the knit dome hugging the top of the head (clipped to the upper crown)
    ctx.save();
    ctx.beginPath();
    ctx.rect(hx - 8, hy - 12, 16, 7.2); // only the crown half
    ctx.clip();
    ctx.fillStyle = rgba(p.capColor);
    ctx.beginPath();
    ctx.ellipse(hx, hy - 1.2, 6.2, 6.4, -0.12, 0, Math.PI * 2);
    ctx.fill();
    // a couple of knit ribs
    ctx.strokeStyle = rgba(dk, 0.7);
    ctx.lineWidth = 0.7;
    for (const rx of [-3, 0, 3]) {
      ctx.beginPath();
      ctx.moveTo(hx + rx, hy - 7.4);
      ctx.lineTo(hx + rx + 0.6, hy - 4.4);
      ctx.stroke();
    }
    ctx.restore();
    // fuzzy turn-up brim across the forehead
    ctx.fillStyle = rgba(dk);
    ctx.beginPath();
    ctx.ellipse(hx - 0.2, hy - 4.6, 6.6, 1.8, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.16);
    ctx.beginPath();
    ctx.ellipse(hx - 2.2, hy - 5.0, 2.6, 0.9, -0.12, 0, Math.PI * 2);
    ctx.fill();
    // little pom-pom on top
    ctx.fillStyle = rgba([245, 245, 240]);
    ctx.beginPath();
    ctx.arc(hx + 0.6, hy - 8.0, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([210, 214, 220], 0.7);
    ctx.beginPath();
    ctx.arc(hx + 1.2, hy - 7.5, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore(); // end squash/stretch + lean transform

  // ── SCARF (winter) — a little knitted band around the neck, below the head ──
  // Drawn OUTSIDE the squash transform but tracking the (waddle-leaned) head.
  if (p.scarfAmt > 0.001) {
    const shx = bx + pose.lean - 7.5; // head x in tile space (lean only; scarf sits low)
    const sx = shx + 1.0;
    const sy = (by - 9.5 + headShift) + 5.4;
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // wrap band
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 5.2, 2.9, 0.18, 0, Math.PI * 2);
    ctx.fill();
    // darker underside for depth
    ctx.fillStyle = rgba([
      Math.max(0, p.scarfColor[0] - 50),
      Math.max(0, p.scarfColor[1] - 30),
      Math.max(0, p.scarfColor[2] - 30),
    ]);
    ctx.beginPath();
    ctx.ellipse(sx + 0.4, sy + 1.3, 4.8, 1.5, 0.18, 0, Math.PI * 2);
    ctx.fill();
    // hanging tail of the scarf, with a knitted notch + fringe
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.moveTo(sx - 2.4, sy + 1.6);
    ctx.lineTo(sx + 1.2, sy + 2.2);
    ctx.lineTo(sx + 0.4, sy + 7.6);
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
    ctx.moveTo(sx - 1.2, sy + 3.0);
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

  // breath-fog puff at the beak (winter) — drawn OUTSIDE the squash transform so
  // it reads as air, not body. Static base puff + an exhale swell during the peck.
  if (p.breathFogAmt > 0.001) {
    const fhx = bx + pose.lean - 7.5;
    const fhy = by - 9.5 + headShift;
    const reach = 5.0 + pose.fogPuff * 3.2;
    ctx.fillStyle = rgba([235, 244, 255], (0.34 + 0.28 * pose.fogPuff) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(fhx - reach, fhy + 6, 2.8 + pose.fogPuff * 2.0, 2.0 + pose.fogPuff * 1.4, 0.2, 0, Math.PI * 2);
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
    paintDodo(ctx, p, pose);
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
    const p = clamp01(pp);
    const kBase = smoother(p);
    const kCoat = biasedEase(p, 0.62); // plumage volume LEADS
    const kSnow = biasedEase(p, 1.7); // snow / frost / fog / scarf LAG

    const a = SP[from];
    const b = SP[to];
    const blended: P = lerpP(a, b, kBase);
    blended.plumeVolume = lerp(a.plumeVolume, b.plumeVolume, kCoat);
    blended.backSnowAmt = lerp(a.backSnowAmt, b.backSnowAmt, kSnow);
    blended.padSnowAmt = lerp(a.padSnowAmt, b.padSnowAmt, kSnow);
    blended.frostAmt = lerp(a.frostAmt, b.frostAmt, kSnow);
    blended.breathFogAmt = lerp(a.breathFogAmt, b.breathFogAmt, kSnow);
    blended.scarfAmt = lerp(a.scarfAmt, b.scarfAmt, kSnow);
    blended.capAmt = lerp(a.capAmt, b.capAmt, kSnow); // cap LAGs like the scarf

    paint(ctx, blended, REST);

    // Transient overlays (strength ∝ sin(π·p): exactly 0 at both ends).
    const trans = Math.sin(Math.PI * p);
    if (trans <= 0.0008) return;

    ctx.save();
    try {
      const bx = 1;
      const by = 3;

      // Loose feather motes lifting off the thickening plumage — reads the coat
      // visibly fluffing/growing. Present in EVERY morph (deterministic in p).
      const fluff = trans * (0.4 + 0.6 * Math.max(0, b.plumeVolume - a.plumeVolume + 0.4));
      if (fluff > 0.01) {
        ctx.fillStyle = rgba([255, 255, 255], 0.5 * fluff);
        const motes: Array<[number, number, number]> = [
          [-7, -9, 1.1], [3, -11, 1.4], [8, -7, 0.9], [-2, -12, 1.0],
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
          [-5, -11], [-1, -12], [4, -10.5], [7, -9],
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
        const hx = bx - 7.5;
        const hy = by - 9.5;
        ctx.fillStyle = rgba([235, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(hx - (5 + trans * 3), hy + 6, 2.6 + trans * 1.8, 1.8 + trans * 1.2, 0.2, 0, Math.PI * 2);
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
