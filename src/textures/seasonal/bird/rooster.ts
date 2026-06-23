// Production seasonal art for the BIRD ROOSTER board tile (`tile_bird_rooster`,
// token: bird/rooster) — the approved bold "bold & fun" direction. A single
// parameterized `paint(ctx, p, pose)` + four `P` presets + lerped transitions,
// pushed so the seasons read at a glance and the idle is a real, fun ACTION
// rather than a subtle breath. Mirrors the herd/sheep reference architecture.
//
// PALETTE LOCK: it is ALWAYS the same proud cockerel — a big RED comb + RED
// wattle, a red-brown / chestnut body, GOLDEN hackle feathers at the neck, and
// a big arched glossy GREEN-BLACK sickle tail, standing on a pad. The bird's
// identity colours + silhouette NEVER change across seasons. A season changes
// only its plumage VOLUME, the pad colour, the light wash, the tail gloss, and
// BOLD dressing — snow on the back, a little winter SCARF, a breath-fog puff,
// blossoms, a fallen leaf, frost. Never morph it into another animal; keep the
// signature comb + tall sweeping tail.
//
// BOLD seasonal cues (readable at ~58px):
//   • Spring — sleek bright plumage, blossom on the pad, cool-bright light.
//   • Summer — full glossy iridescent plumage, bright warm light — PEAK.
//   • Autumn — warm-tinted plumage, a fallen leaf on the pad, dulled gloss,
//     amber light.
//   • Winter — FLUFFED puffy plumage + snow on the back + a little winter SCARF
//     + breath-fog puff, frost, cool blue-grey light. Clearly wintry, still the
//     same rooster.
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~0.95s): a PROUD STRUT — the head juts forward/up and the
//     chest puffs with a tail-flick (~10–14px head travel), small body squash.
//   • RARE  ~18s (win ~1.2s, phase +3s): a CROW — the rooster rears back
//     (anticipation), stretches UP tall (~14–18px) with the head thrown back and
//     wings half-flared, then settles. May exit the box at the apex (fine).
// Both gestures return to REST with zero value AND zero velocity at the window
// edges (raised-cosine windows), so `anim(…, t)` is seamless and `anim(…, 0)`
// (and `draw`) sit exactly at rest.
//
// Origin-centered in the −24..+24 design box, light from upper-left, one soft
// contact shadow at lower-right. Deterministic in `t` (seconds). Never throws;
// clamps every scalar; save/restore + globalAlpha reset.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Small math helpers ──────────────────────────────────────────────────────

type RGB = [number, number, number];

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

// coerce any wild/non-finite value to a finite fallback (never propagate NaN)
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

// Anticipation→action shape for the CROW: a brief rear-back (negative) before
// the tall rise, then a clean stretch up and settle. q∈[0,1]. Returns a RISE
// factor in roughly −0.2..+1 (negative = rear-back crouch, positive = stretch).
function crowShape(q: number): number {
  if (q <= 0 || q >= 1) return 0;
  const antiEnd = 0.26; // first slice = rear-back / anticipation
  if (q < antiEnd) {
    // settle down/back a little (anticipation), zero slope at q=0
    const a = q / antiEnd;
    return -0.2 * (0.5 - 0.5 * Math.cos(a * Math.PI));
  }
  // the tall stretch up, zero at the seam to the crouch and at q=1
  const a = (q - antiEnd) / (1 - antiEnd);
  return Math.sin(a * Math.PI);
}

// ── The idle POSE (carries all action state into paint) ───────────────────────

interface Pose {
  bob: number; // whole-body vertical lift (design px, + = up). Crow uses this.
  lean: number; // body lean toward the head (design px, + = forward/left)
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  head: number; // head jut up/forward (design px, + = up/forward)
  peck: number; // head dip down (design px) — the strut's forward thrust
  hop: number; // unused vertical micro-bounce reserve (design px)
  wing: number; // 0..1 wing half-flare amount (crow)
  tail: number; // signed tail flick (design px sideways/up)
}

const REST: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, peck: 0, hop: 0, wing: 0, tail: 0 };

// Build a pose from the wall clock: a common STRUT every ~6s and a rare CROW
// every ~18s. Returns to REST (all zeros / unit scales) at every window edge.
function poseFromClock(tIn: number): Pose {
  const t = safeNum(tIn, 0);
  const pose: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, peck: 0, hop: 0, wing: 0, tail: 0 };

  // COMMON ~6s: PROUD STRUT (win ~0.95s). The head juts forward/up ~10–14px and
  // the chest puffs with a tail-flick + small body squash. Built from
  // raised-cosine windows → seamless. Phase 3.0 opens the window at t≈3.0 (well
  // clear of t=0, so anim(0) sits exactly at REST).
  const sq = actionQ(t, 6, 0.95, 3.0);
  if (sq >= 0) {
    const env = bump(sq); // 0→1→0 over the window
    // two struts within the window: head thrusts forward/up, chest puffs
    const beat = Math.abs(Math.sin(sq * Math.PI * 2)); // two-beat strut
    pose.head = env * (5.0 + 8.0 * beat); // ~10–14px head travel forward/up
    pose.peck = env * (1.6 * beat); // a small forward dip on each beat
    pose.lean = env * (1.6 + 1.4 * beat); // chest leans forward proudly
    pose.squashX = 1 + env * 0.06 * beat; // chest puffs slightly wider
    pose.squashY = 1 - env * 0.04 * beat;
    pose.tail = Math.sin(sq * Math.PI * 6) * env * 2.6; // a few proud tail-flicks
  }

  // RARE ~18s: CROW (win ~1.2s). The rooster rears back (anticipation), stretches
  // UP tall ~14–18px with the head thrown back and wings half-flared, then
  // settles. May lift OUTSIDE the design box at the apex.
  const cq = actionQ(t, 18, 1.2, 3.0);
  if (cq >= 0) {
    const s = crowShape(cq); // −0.2..+1 (rear-back then tall stretch)
    if (s < 0) {
      // anticipation rear-back: crouch down/wide, head tucks down a touch
      const c = -s; // 0..0.2
      pose.bob -= c * 4.0; // settle down
      pose.squashY = 1 - c * 0.7;
      pose.squashX = 1 + c * 0.5;
      pose.head -= c * 8.0; // head tucks back/down before the call
      pose.lean -= c * 1.2;
    } else {
      // the tall crow: stretch up and narrow, head thrown UP, wings half-flared
      pose.bob += s * 9.0; // whole bird rises
      pose.head += s * 16.0; // head thrown up ~14–18px
      pose.squashY = 1 + s * 0.2; // stretch tall
      pose.squashX = 1 - s * 0.12; // and narrow
      pose.wing = s; // wings half-flare at the apex
      pose.lean += s * 1.0;
    }
    pose.tail += Math.sin(cq * Math.PI) * 1.6; // tail lifts during the call
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────

// NOTE: the rooster's IDENTITY colours (comb red, wattle red, chestnut body,
// golden hackles, green-black tail, yellow beak/legs) are LOCKED — they still
// live in `P` so the paint is a pure function of `p`, but every season's preset
// carries the SAME values for them. Only pad/light/plumage-volume/gloss and the
// winter dressing differ.
interface P {
  comb: RGB; // big red comb + red wattle
  combShade: RGB; // shaded underside of the comb
  bodyLight: RGB; // lit chestnut breast / back
  bodyMid: RGB; // chestnut body tone
  bodyDark: RGB; // shaded belly / underside
  hackle: RGB; // golden neck hackle feathers
  hackleDark: RGB; // shaded hackle
  tail: RGB; // glossy green-black sickle tail
  tailSheen: RGB; // green sheen highlight on the tail
  beak: RGB; // yellow-horn beak + legs
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  plumageVolume: number; // 0..1 BOLD feather puff (sleek spring → fluffed winter)
  gloss: number; // 0..1 glossy iridescent sheen on the tail (summer peak)
  frostAmt: number; // 0..1 frost dusting on the comb / upward surfaces
  backSnowAmt: number; // 0..1 snow settled on the back / tail base
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 blossoms on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad (autumn)
  breathFogAmt: number; // 0..1 breath puff at the beak (winter)
  scarfAmt: number; // 0..1 a little winter SCARF (tweened alpha)
  scarfColor: RGB; // scarf colour (locked, fades in via alpha)
}

// LOCKED identity colours, shared by every season preset.
const COMB: RGB = [214, 44, 42];
const COMB_SHADE: RGB = [150, 26, 30];
const BODY_LIGHT: RGB = [186, 96, 50];
const BODY_MID: RGB = [148, 66, 34];
const BODY_DARK: RGB = [96, 42, 24];
const HACKLE: RGB = [226, 168, 56];
const HACKLE_DARK: RGB = [168, 112, 32];
const TAIL: RGB = [30, 48, 38];
const TAIL_SHEEN: RGB = [70, 132, 92];
const BEAK: RGB = [228, 184, 70];

// Four BOLD season presets. The bird stays the SAME colourful rooster; only the
// pad, light wash, plumage volume, tail gloss, and winter dressing differ —
// pushed HARD so each season reads at a glance.
const SP: Record<SeasonName, P> = {
  // Spring — sleek bright plumage, dewy lime pad + blossom, cool-bright light.
  Spring: {
    comb: COMB,
    combShade: COMB_SHADE,
    bodyLight: BODY_LIGHT,
    bodyMid: BODY_MID,
    bodyDark: BODY_DARK,
    hackle: HACKLE,
    hackleDark: HACKLE_DARK,
    tail: TAIL,
    tailSheen: TAIL_SHEEN,
    beak: BEAK,
    padGrass: [128, 210, 84], // vivid fresh lime
    soil: [84, 134, 52],
    outline: [48, 28, 22],
    lightWash: [200, 238, 255], // cool-bright
    lightWashAmt: 0.2,
    plumageVolume: 0.08, // BOLD: clearly sleek, trim spring coat
    gloss: 0.45,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.9,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [40, 96, 158],
  },
  // Summer — full glossy iridescent plumage (PEAK); saturated mid-green pad;
  // bright warm light.
  Summer: {
    comb: COMB,
    combShade: COMB_SHADE,
    bodyLight: BODY_LIGHT,
    bodyMid: BODY_MID,
    bodyDark: BODY_DARK,
    hackle: HACKLE,
    hackleDark: HACKLE_DARK,
    tail: TAIL,
    tailSheen: TAIL_SHEEN,
    beak: BEAK,
    padGrass: [78, 182, 60], // saturated mid-green
    soil: [50, 116, 38],
    outline: [44, 24, 18],
    lightWash: [255, 240, 184], // bright warm
    lightWashAmt: 0.2,
    plumageVolume: 0.5, // full normal plumage
    gloss: 1, // peak glossy iridescent sheen on the tail
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [40, 96, 158],
  },
  // Autumn — warm-tinted plumage, olive-tan browning pad, a fallen leaf, dulled
  // gloss, amber light.
  Autumn: {
    comb: COMB,
    combShade: COMB_SHADE,
    bodyLight: BODY_LIGHT,
    bodyMid: BODY_MID,
    bodyDark: BODY_DARK,
    hackle: HACKLE,
    hackleDark: HACKLE_DARK,
    tail: TAIL,
    tailSheen: TAIL_SHEEN,
    beak: BEAK,
    padGrass: [170, 138, 66], // olive-tan browning
    soil: [110, 84, 42],
    outline: [50, 28, 20],
    lightWash: [255, 186, 100], // low amber, BOLD
    lightWashAmt: 0.3,
    plumageVolume: 0.74, // thicker
    gloss: 0.4, // dulled gloss
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.95,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [40, 96, 158],
  },
  // Winter — FLUFFED feathers + snow on the back + a little SCARF + breath-fog;
  // frost, snowy pad, cool blue-grey light. Bird stays CLEARLY its own colours.
  Winter: {
    comb: COMB,
    combShade: COMB_SHADE,
    bodyLight: BODY_LIGHT,
    bodyMid: BODY_MID,
    bodyDark: BODY_DARK,
    hackle: HACKLE,
    hackleDark: HACKLE_DARK,
    tail: TAIL,
    tailSheen: TAIL_SHEEN,
    beak: BEAK,
    padGrass: [224, 236, 248], // snow on the pad
    soil: [148, 168, 192],
    outline: [54, 40, 44],
    lightWash: [190, 214, 252], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    plumageVolume: 1, // BOLD: puffed up against the cold
    gloss: 0.3, // muted, cold light
    frostAmt: 0.85,
    backSnowAmt: 0.92,
    padSnowAmt: 0.95,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.85,
    scarfAmt: 1, // a little scarf appears in winter
    scarfColor: [40, 96, 158],
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    comb: lerpRGB(a.comb, b.comb, t),
    combShade: lerpRGB(a.combShade, b.combShade, t),
    bodyLight: lerpRGB(a.bodyLight, b.bodyLight, t),
    bodyMid: lerpRGB(a.bodyMid, b.bodyMid, t),
    bodyDark: lerpRGB(a.bodyDark, b.bodyDark, t),
    hackle: lerpRGB(a.hackle, b.hackle, t),
    hackleDark: lerpRGB(a.hackleDark, b.hackleDark, t),
    tail: lerpRGB(a.tail, b.tail, t),
    tailSheen: lerpRGB(a.tailSheen, b.tailSheen, t),
    beak: lerpRGB(a.beak, b.beak, t),
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

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat grass pad the rooster stands on
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

// one leg: a slim yellow shank with a three-toed foot at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  // dark behind, then yellow shank on top (layered dark-then-light)
  ctx.strokeStyle = rgba(p.outline);
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  ctx.strokeStyle = rgba(p.beak);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // three-toed foot
  ctx.strokeStyle = rgba(p.beak);
  ctx.lineWidth = 1.4;
  for (const dx of [-2.4, 0, 2.4]) {
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + dx, baseY + 1.4);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  ctx.restore();
}

// trace the constant body silhouette (breast + back) — IDENTICAL every season.
// `volume` only gently swells the perimeter; it never changes the shape's identity.
function bodyPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, volume: number): void {
  const s = 1 + volume * 0.1; // modest swell with plumage volume
  const rx = 11 * s;
  const ry = 12.5 * s;
  ctx.beginPath();
  // upright proud oval body, slightly taller than wide, tilted toward lower-left
  ctx.ellipse(cx, cy, rx, ry, -0.12, 0, Math.PI * 2);
}

// the big arched glossy green-black sickle tail (rear-upper-right), constant
// shape. `tailLift` raises the whole sweep a touch during the crow.
function paintTail(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number, tailLift: number): void {
  // base of the tail sits at the rear of the body; sickles arch up and over.
  const baseX = cx + 8;
  const baseY = cy + 2 - tailLift;
  // three layered sickle feathers, outline-dark first then green-black fill
  const sickles: Array<[number, number, number]> = [
    // [tip dx, tip dy, control bulge]
    [14, -20, 10],
    [17, -14, 13],
    [16, -7, 12],
  ];
  // dark outline halo pass
  ctx.strokeStyle = rgba(p.outline);
  ctx.lineWidth = 6.5;
  ctx.lineCap = "round";
  for (const [tx, ty, cb] of sickles) {
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX + cb, baseY - 16, baseX + tx, baseY + ty);
    ctx.stroke();
  }
  // green-black fill pass
  ctx.strokeStyle = rgba(p.tail);
  ctx.lineWidth = 4.4;
  for (const [tx, ty, cb] of sickles) {
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX + cb, baseY - 16, baseX + tx, baseY + ty);
    ctx.stroke();
  }
  // green sheen highlight along the upper edge of the sickles (gloss strength)
  if (p.gloss > 0.02) {
    ctx.strokeStyle = rgba(p.tailSheen, 0.5 + 0.45 * p.gloss);
    ctx.lineWidth = 1.5;
    for (const [tx, ty, cb] of sickles) {
      ctx.beginPath();
      ctx.moveTo(baseX + 1, baseY - 1);
      ctx.quadraticCurveTo(baseX + cb + 1, baseY - 17, baseX + tx + 0.6, baseY + ty - 0.6);
      ctx.stroke();
    }
  }
  ctx.lineCap = "butt";
}

// the whole rooster, standing front-¾ turned ~15–20° toward lower-left, posed by
// `pose` (strut / crow gestures).
function paintRooster(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  // body centre; the pose bob lifts the whole bird, lean nudges it forward/left.
  const cx = -1 - pose.lean;
  const cy = 2 - pose.bob;

  // legs stay PLANTED on the pad (they don't lift with the crow — they stretch).
  // front-¾: the two legs are close, contacting the pad lower-centre.
  paintLeg(ctx, p, cx - 2.5, cy + 9, 19.2, 1);
  paintLeg(ctx, p, cx + 2.8, cy + 9, 19.0, 0.9);

  // The whole upper body (tail + body + hackles + head + dressing) is drawn under
  // a squash/stretch transform centred on the body, so the crow reads with
  // anticipation squash + tall airborne stretch and the strut with a chest puff.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-cx, -cy);

  // ── Tail behind the body (drawn first) ─────────────────────────────────────
  paintTail(ctx, p, cx, cy, Math.abs(pose.tail) * 0.4 + pose.wing * 2.0);

  // ── BODY — outline halo, then chestnut fill, then lit breast ───────────────
  // dark outline halo
  bodyPath(ctx, cx, cy, p.plumageVolume + 0.5);
  ctx.fillStyle = rgba(p.outline);
  ctx.fill();

  // chestnut mid body
  bodyPath(ctx, cx, cy, p.plumageVolume);
  ctx.fillStyle = rgba(p.bodyMid);
  ctx.fill();

  // shaded lower-right belly + lit breast (clipped to the body)
  ctx.save();
  bodyPath(ctx, cx, cy, p.plumageVolume);
  ctx.clip();
  ctx.fillStyle = rgba(p.bodyDark);
  ctx.beginPath();
  ctx.ellipse(cx + 4, cy + 7, 10, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit breast (upper-left)
  ctx.fillStyle = rgba(p.bodyLight);
  ctx.beginPath();
  ctx.ellipse(cx - 4, cy - 3, 7, 8.5, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // soft feather striations down the breast
  ctx.strokeStyle = rgba(p.bodyDark, 0.4);
  ctx.lineWidth = 1;
  for (const dx of [-5, -1.5, 2]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx, cy - 6);
    ctx.quadraticCurveTo(cx + dx - 1.5, cy, cx + dx - 2.5, cy + 7);
    ctx.stroke();
  }
  ctx.restore();

  // ── WING — a folded wing on the body side; half-flares out during the crow ──
  {
    const wx = cx + 2.5;
    const wy = cy + 1;
    const flare = pose.wing; // 0..1
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(flare * 0.5); // the wing lifts/opens at the apex of the crow
    // outline
    ctx.fillStyle = rgba(p.outline);
    ctx.beginPath();
    ctx.ellipse(0, 0, 6.4 + flare * 2.2, 4.2 + flare * 0.8, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // chestnut wing fill
    ctx.fillStyle = rgba(p.bodyMid);
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.6 + flare * 2.0, 3.6 + flare * 0.7, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // a couple of dark covert feather lines
    ctx.strokeStyle = rgba(p.bodyDark, 0.5);
    ctx.lineWidth = 1;
    for (const dy of [-1.2, 0.4, 2.0]) {
      ctx.beginPath();
      ctx.moveTo(-4.6, dy);
      ctx.quadraticCurveTo(0, dy + 1.2, 4.8 + flare * 1.6, dy + 0.6);
      ctx.stroke();
    }
    ctx.restore();
  }

  // snow settled on the back (winter) — soft white cap over the upper body
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgba([248, 252, 255], 0.92 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(cx + 3, cy - 8.5, 8 * (0.9 + p.plumageVolume * 0.3), 3.2, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.88 * p.backSnowAmt);
    for (const [dx, dy] of [[-2, -9.4], [3, -9.6], [7, -8.4]] as const) {
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, 1.5 + p.plumageVolume * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── GOLDEN HACKLE feathers at the neck (constant placement) ────────────────
  // a cape of pointed golden feathers flowing from the head down over the
  // shoulders, on the upper-left of the body. They lift a touch with the head.
  const nx = cx - 5;
  const ny = cy - 8 - pose.head * 0.4 + pose.peck * 0.3;
  const hackles: Array<[number, number, number]> = [
    [-5, 6, -0.5],
    [-3, 9, -0.25],
    [0, 10, 0],
    [3, 8, 0.25],
  ];
  // dark hackle base
  for (const [dx, len, rot] of hackles) {
    ctx.save();
    ctx.translate(nx + dx, ny + 3);
    ctx.rotate(rot);
    ctx.fillStyle = rgba(p.hackleDark);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-2.6, len * 0.6, -1.2, len);
    ctx.quadraticCurveTo(0, len * 0.7, 2.6, len * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // bright golden hackle on top (offset up-left, light from upper-left)
  for (const [dx, len, rot] of hackles) {
    ctx.save();
    ctx.translate(nx + dx - 0.6, ny + 2.2);
    ctx.rotate(rot);
    ctx.fillStyle = rgba(p.hackle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-2, len * 0.6, -0.8, len * 0.92);
    ctx.quadraticCurveTo(0, len * 0.6, 2, len * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── SCARF (winter) — a little knitted band around the neck, below the head ──
  // Drawn before the head so the head + comb read clearly on top.
  if (p.scarfAmt > 0.001) {
    const sx = cx - 6;
    const sy = cy - 6 - pose.head * 0.3;
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // wrap band
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 5.0, 2.8, -0.18, 0, Math.PI * 2);
    ctx.fill();
    // darker underside for depth
    ctx.fillStyle = rgba([
      Math.max(0, p.scarfColor[0] - 30),
      Math.max(0, p.scarfColor[1] - 40),
      Math.max(0, p.scarfColor[2] - 50),
    ]);
    ctx.beginPath();
    ctx.ellipse(sx + 0.4, sy + 1.4, 4.6, 1.5, -0.18, 0, Math.PI * 2);
    ctx.fill();
    // hanging tail of the scarf with a fringe
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.moveTo(sx - 2.6, sy + 1.4);
    ctx.lineTo(sx + 0.6, sy + 2.0);
    ctx.lineTo(sx - 0.4, sy + 7.6);
    ctx.lineTo(sx - 3.4, sy + 6.8);
    ctx.closePath();
    ctx.fill();
    // fringe at the bottom
    ctx.strokeStyle = rgba(p.scarfColor);
    ctx.lineWidth = 0.9;
    ctx.lineCap = "round";
    for (const fx of [-3.0, -1.8, -0.8]) {
      ctx.beginPath();
      ctx.moveTo(sx + fx, sy + 7.0);
      ctx.lineTo(sx + fx - 0.2, sy + 8.6);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.restore();
  }

  // ── HEAD (front-¾, lower-left) — comb + wattle + beak + eye ─────────────────
  // The strut juts the head forward/up; the crow throws it up tall.
  const hx = cx - 7 - pose.head * 0.32;
  const hy = cy - 12 - pose.head + pose.peck;

  // head outline + chestnut head fill
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 5.2, 5.4, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.bodyMid);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 4.4, 4.6, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // lit cheek (upper-left)
  ctx.fillStyle = rgba(p.bodyLight);
  ctx.beginPath();
  ctx.ellipse(hx - 1.4, hy - 1.4, 2.4, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // big RED comb — a ridge of rounded points along the crown
  const combY = hy - 4.6;
  ctx.fillStyle = rgba(p.combShade);
  ctx.beginPath();
  ctx.moveTo(hx - 4, combY + 2);
  for (let i = 0; i <= 4; i++) {
    const px = hx - 4 + i * 2.2;
    const peak = combY - 3.4 - (i === 1 || i === 2 ? 1.2 : 0);
    ctx.quadraticCurveTo(px - 0.5, peak, px + 1.1, combY + 1.4);
  }
  ctx.lineTo(hx + 4.6, combY + 2.2);
  ctx.quadraticCurveTo(hx, combY + 3, hx - 4, combY + 2);
  ctx.closePath();
  ctx.fill();
  // bright red comb on top (offset up-left)
  ctx.fillStyle = rgba(p.comb);
  ctx.beginPath();
  ctx.moveTo(hx - 4.4, combY + 1.6);
  for (let i = 0; i <= 4; i++) {
    const px = hx - 4.4 + i * 2.2;
    const peak = combY - 4 - (i === 1 || i === 2 ? 1.2 : 0);
    ctx.quadraticCurveTo(px - 0.6, peak, px + 0.8, combY + 0.8);
  }
  ctx.lineTo(hx + 4, combY + 1.6);
  ctx.quadraticCurveTo(hx, combY + 2.4, hx - 4.4, combY + 1.6);
  ctx.closePath();
  ctx.fill();

  // RED wattle — two soft lobes hanging under the beak
  ctx.fillStyle = rgba(p.comb);
  for (const dx of [-1.4, 1.0]) {
    ctx.beginPath();
    ctx.ellipse(hx - 4.4 + dx, hy + 4.2, 1.5, 2.6, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = rgba(p.combShade, 0.5);
  ctx.beginPath();
  ctx.ellipse(hx - 4.6, hy + 5, 1.3, 1.8, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // yellow beak — a short pointed wedge facing lower-left
  ctx.fillStyle = rgba(p.beak);
  ctx.beginPath();
  ctx.moveTo(hx - 3.8, hy);
  ctx.lineTo(hx - 8.4, hy + 1.8);
  ctx.lineTo(hx - 3.8, hy + 3.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(p.outline, 0.6);
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(hx - 8.4, hy + 1.8);
  ctx.lineTo(hx - 4, hy + 1.9);
  ctx.stroke();

  // eye — white + dark pupil, facing the viewer/lower-left
  ctx.fillStyle = rgba([250, 248, 240]);
  ctx.beginPath();
  ctx.arc(hx - 1.2, hy - 0.4, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([22, 18, 18]);
  ctx.beginPath();
  ctx.arc(hx - 1.4, hy - 0.4, 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([255, 255, 255], 0.9);
  ctx.beginPath();
  ctx.arc(hx - 1.7, hy - 0.8, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // frost dusting on the comb / upward surfaces (winter) — cool speckle,
  // the comb stays clearly RED underneath.
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgba([235, 246, 255], 0.55 * p.frostAmt);
    for (const [fx, fy] of [
      [hx - 3, combY - 2.5], [hx, combY - 3.2], [hx + 2.6, combY - 2.2],
      [hx - 1.4, combY - 1], [hx + 1.4, combY - 1.2],
    ] as const) {
      ctx.beginPath();
      ctx.arc(fx, fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    // faint frost on the back/hackles
    ctx.fillStyle = rgba([255, 255, 255], 0.4 * p.frostAmt);
    for (const [fx, fy] of [[cx - 4, cy - 4], [cx + 2, cy - 6], [cx - 1, cy - 1]] as const) {
      ctx.beginPath();
      ctx.arc(fx, fy, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore(); // end squash/stretch transform

  // breath-fog puff at the beak (winter) — drawn OUTSIDE the squash transform so
  // it reads as air, not body. Static base puff + an exhale swell during the
  // strut/crow when the head juts forward.
  if (p.breathFogAmt > 0.001) {
    const hxOut = cx - 7 - pose.head * 0.32;
    const hyOut = cy - 12 - pose.head + pose.peck;
    const exhale = clamp01(pose.head / 16); // bigger puff at full head-throw
    const reach = 9 + exhale * 4;
    ctx.fillStyle = rgba([235, 244, 255], (0.34 + 0.26 * exhale) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(hxOut - reach, hyOut + 2.4, 2.8 + exhale * 2.0, 1.9 + exhale * 1.4, 0.15, 0, Math.PI * 2);
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
  ctx.ellipse(0, 2, 26, 26, 0, 0, Math.PI * 2);
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
    paintRooster(ctx, p, pose);
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
    const p = clamp01(pp);
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
      const cx = -1;
      const cy = 2;

      // Loose feather motes lifting off the puffing plumage — reads the coat
      // visibly fluffing/growing. Present in EVERY morph (deterministic in p).
      const fluff = trans * (0.4 + 0.6 * Math.max(0, b.plumageVolume - a.plumageVolume + 0.4));
      if (fluff > 0.01) {
        ctx.fillStyle = rgba([255, 244, 220], 0.45 * fluff);
        const motes: Array<[number, number, number]> = [
          [-8, -6, 1.0], [3, -9, 1.3], [9, -4, 0.9], [-3, -10, 1.0],
        ];
        for (const [mx, my, mr] of motes) {
          const rise = (1 - Math.cos(Math.PI * p)) * 2.2;
          ctx.beginPath();
          ctx.arc(cx + mx, cy + my - rise, mr * (0.7 + 0.5 * trans), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Snow settling onto the back during autumn→winter (target gains snow).
      const snowGain = Math.max(0, b.backSnowAmt - a.backSnowAmt);
      if (snowGain > 0.01) {
        ctx.fillStyle = rgba([255, 255, 255], 0.8 * trans * snowGain);
        const land = smoother(p);
        const flecks: Array<[number, number]> = [
          [-6, -9], [-1, -10], [4, -8.5], [7, -7],
        ];
        for (const [fxx, fyy] of flecks) {
          const fall = (1 - land) * 6;
          ctx.beginPath();
          ctx.arc(cx + fxx, cy + fyy - fall, 1.0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // A breath-fog puff appearing as the cold sets in (target gains fog).
      const fogGain = Math.max(0, b.breathFogAmt - a.breathFogAmt);
      if (fogGain > 0.01) {
        const hx = cx - 7;
        const hy = cy - 12;
        ctx.fillStyle = rgba([235, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(hx - (8 + trans * 3), hy + 2.4, 2.6 + trans * 1.8, 1.8 + trans * 1.2, 0.15, 0, Math.PI * 2);
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
