// Production seasonal art for the BIRD PARROT board tile (`tile_bird_parrot`) —
// the approved bold direction. A single parameterized `paint(ctx, p, pose)` +
// four `P` presets + lerped transitions, pushed so the seasons read at a glance
// and the idle is a real, fun ACTION rather than a subtle breath. This mirrors
// the herd-sheep reference architecture exactly (single paint, numeric Pose,
// two-tier occasional-action idle clock, exact-endpoint transitions).
//
// PALETTE LOCK / IDENTITY RULE: it is ALWAYS the same brightly-coloured macaw —
// a RED head/breast, GREEN wings, BLUE tail, and a pale curved hooked beak,
// perched on a short low wooden branch that crosses a small grassy pad. Its
// colours and silhouette stay constant in ALL four seasons. Seasons change only
// the pad colour, the light wash, the feather VOLUME/fluff, and BOLD dressing —
// snow on the back + perch, a little winter SCARF, a breath-fog puff, blossoms,
// a fallen leaf, frost. The parrot stays VIVID even in winter (winter does NOT
// desaturate its identity red-green-blue — it only adds snow/frost/scarf and a
// cooler light wash). It is never morphed into another animal.
//
// BOLD SEASONAL CUES (readable at ~58px):
//   • Spring — sleek bright plumage, a blossom on the pad, cool-bright light.
//   • Summer — full glossy saturated tropical plumage, bright warm light (PEAK).
//   • Autumn — vivid plumage under warm amber light, a fallen leaf, dulled gloss.
//   • Winter — FLUFFED puffy plumage + snow on the back + a little SCARF +
//     breath-fog + frost + a cool blue-grey light wash (still obviously vivid).
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~0.95s): a HEAD-BOB / PREEN — the parrot bobs its head and
//     dips its beak to preen its wing (~10–14px) with a tail flick + body squash.
//   • RARE  ~18s (win ~1.2s, phase +3s): a SQUAWK + WING-FLARE — it leans
//     forward, opens its beak, flares both wings WIDE (~14–18px), then folds back
//     and settles. Anticipation → squawk → settle. May paint OUTSIDE the
//     −24..+24 box at the apex (no engine clip; fine).
// Both gestures return to REST with zero value AND zero velocity at the window
// edges (raised-cosine windows), so `anim(…, t)` is seamless and `anim(…, 0)`
// (and `draw`) sit exactly at rest.
//
// Origin-centered in the −24..+24 design box. Light from upper-left, one soft
// contact shadow lower-right. Deterministic in `t` (seconds). Never throws;
// clamps every scalar; save/restore + globalAlpha reset.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Small math helpers ──────────────────────────────────────────────────────

type RGB = [number, number, number];

function clamp01(x: number): number {
  if (!(x >= 0)) return 0; // also catches NaN
  return x > 1 ? 1 : x;
}

// guard a possibly non-finite scalar (NaN/Infinity → fallback)
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

// Anticipation→action shape for the SQUAWK flare: a brief lean-back (negative)
// before the burst, then a clean flare and settle. q∈[0,1]. Returns a factor in
// roughly −0.16..+1 (negative = anticipation crouch, positive = flared open).
function flareShape(q: number): number {
  if (q <= 0 || q >= 1) return 0;
  const antiEnd = 0.22; // first slice = anticipation
  if (q < antiEnd) {
    const a = q / antiEnd;
    return -0.16 * (0.5 - 0.5 * Math.cos(a * Math.PI));
  }
  const a = (q - antiEnd) / (1 - antiEnd);
  return Math.sin(a * Math.PI);
}

// ── The idle POSE (carries all action state into paint) ──────────────────────

interface Pose {
  bob: number; // whole-body vertical lift (design px, + = up)
  lean: number; // forward lean toward lower-left (design px, + = lean in)
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  head: number; // extra head dip (design px, + = down) for the preen
  peck: number; // 0..1 beak dip toward the wing (preen) — pulls beak inward/down
  hop: number; // 0..1 jaw/beak open (squawk gape)
  wing: number; // 0..1 wing flare amount (both wings open out)
  tail: number; // signed tail flick (radians extra sweep)
}

const REST: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, peck: 0, hop: 0, wing: 0, tail: 0 };

// Build a pose from the wall clock: a common HEAD-BOB/PREEN every ~6s and a rare
// SQUAWK+WING-FLARE every ~18s. Returns to REST (all zeros / unit scales) at
// every window edge, so anim(0) sits exactly at REST (== draw).
function poseFromClock(tIn: number): Pose {
  const t = safeNum(tIn, 0);
  const pose: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, peck: 0, hop: 0, wing: 0, tail: 0 };

  // COMMON ~6s: HEAD-BOB / PREEN (win ~0.95s). The head bobs ~10–14px and the
  // beak dips to preen the wing, with a tail flick + a small body squash. Built
  // from raised-cosine windows → seamless. Phase 3.0 opens the window at t≈3.0
  // (well clear of t=0, so anim(0) sits exactly at REST).
  const cq = actionQ(t, 6, 0.95, 3.0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window
    // two preen dips within the window (head dips down ~10–14px at the peak)
    const beat = Math.abs(Math.sin(cq * Math.PI * 2));
    pose.head = env * (5.5 + 8.0 * beat); // ~10–14px bob/dip
    pose.peck = env * (0.45 + 0.55 * beat); // beak dips in to preen the wing
    pose.tail = Math.sin(cq * Math.PI * 6) * env * 0.22; // a few tail flicks
    // a small body squash as it ducks its head down
    pose.squashY = 1 - env * 0.08;
    pose.squashX = 1 + env * 0.06;
    pose.bob = -env * 1.4; // settle the body down a touch as it dips
  }

  // RARE ~18s: SQUAWK + WING-FLARE (win ~1.2s, phase +3s past the preen). It
  // leans forward, opens its beak, flares both wings WIDE (~14–18px), then folds
  // back and settles. May paint OUTSIDE the design box at the apex.
  const sq = actionQ(t, 18, 1.2, 6.0);
  if (sq >= 0) {
    const s = flareShape(sq); // −0.16..+1 (anticipation then flare)
    if (s < 0) {
      // anticipation: lean back + crouch slightly (gather before the burst)
      const c = -s; // 0..0.16
      pose.lean = -c * 6;
      pose.squashY = 1 - c * 0.7;
      pose.squashX = 1 + c * 0.5;
    } else {
      // the burst: lean forward, flare the wings, gape the beak, stretch tall
      pose.wing = s; // 0..1 wing flare
      pose.hop = Math.min(1, s * 1.2); // beak gape (squawk)
      pose.lean = s * 4.5; // lean toward lower-left
      pose.bob = s * 2.2; // a little lift as it puffs up
      pose.squashY = 1 + s * 0.1;
      pose.squashX = 1 + s * 0.04;
    }
    pose.tail += Math.sin(sq * Math.PI) * 0.18; // tail fans during the squawk
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint is a pure function of these so transitions interpolate cleanly. */
interface P {
  // Parrot identity colours (PALETTE LOCK — stay vivid every season)
  headLight: RGB; // lit red of the head/breast
  headDark: RGB; // shaded red
  wingLight: RGB; // lit green of the wing
  wingDark: RGB; // shaded green
  tailLight: RGB; // lit blue of the tail
  tailDark: RGB; // shaded blue
  beak: RGB; // pale curved hooked beak
  // World
  perchLight: RGB; // lit top of the wooden perch
  perchDark: RGB; // shaded underside of the perch
  padGrass: RGB; // top of the turf pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  gloss: number; // 0..1 plumage gloss/sheen cue (peaks in summer, dulls autumn)
  plumageVolume: number; // 0..1 BOLD feather puff (sleek spring → fluffed winter)
  frostAmt: number; // 0..1 frost sparkle on the plumage
  backSnowAmt: number; // 0..1 snow on the back + the perch
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 blossom on the pad
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad
  breathFogAmt: number; // 0..1 breath-fog puff at the beak
  scarfAmt: number; // 0..1 a little winter SCARF (tweened alpha)
  scarfColor: RGB; // scarf colour (locked, fades in via alpha)
}

// Four BOLD season presets. The parrot stays the SAME red-green-blue macaw; only
// pad + light + feather volume + dressing differ — pushed HARD so each season
// reads at a glance. Summer is the gloss/saturation PEAK.
const SP: Record<SeasonName, P> = {
  // Spring — sleek bright plumage, dewy lime pad + a blossom, cool-bright light.
  Spring: {
    headLight: [236, 70, 60],
    headDark: [168, 32, 36],
    wingLight: [78, 188, 88],
    wingDark: [34, 122, 58],
    tailLight: [74, 132, 230],
    tailDark: [36, 76, 168],
    beak: [236, 226, 200],
    perchLight: [156, 116, 72],
    perchDark: [104, 72, 42],
    padGrass: [128, 210, 84], // bright lime dewy grass
    soil: [84, 132, 52],
    outline: [44, 36, 40],
    lightWash: [206, 238, 255], // cool-bright
    lightWashAmt: 0.2,
    gloss: 0.55,
    plumageVolume: 0.08, // BOLD: sleek, clearly slim plumage
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [226, 214, 184], // cream-knit (per-species winter accessory)
  },
  // Summer — richest, glossiest tricolour (PEAK); saturated mid-green pad.
  Summer: {
    headLight: [248, 58, 48],
    headDark: [182, 22, 28],
    wingLight: [70, 206, 84],
    wingDark: [26, 134, 56],
    tailLight: [58, 122, 244],
    tailDark: [28, 70, 188],
    beak: [244, 234, 206],
    perchLight: [150, 110, 66],
    perchDark: [98, 66, 38],
    padGrass: [80, 176, 60], // saturated mid-green
    soil: [54, 112, 38],
    outline: [40, 32, 36],
    lightWash: [255, 240, 190], // bright warm
    lightWashAmt: 0.2,
    gloss: 1, // PEAK glossy plumage
    plumageVolume: 0.42, // full normal plumage
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [226, 214, 184], // cream-knit (per-species winter accessory)
  },
  // Autumn — vivid plumage under warm amber light, a fallen leaf, dulled gloss.
  Autumn: {
    headLight: [228, 64, 50],
    headDark: [166, 30, 32],
    wingLight: [82, 178, 80],
    wingDark: [38, 118, 54],
    tailLight: [70, 124, 222],
    tailDark: [34, 74, 162],
    beak: [234, 220, 188],
    perchLight: [148, 104, 60],
    perchDark: [98, 64, 36],
    padGrass: [168, 140, 70], // olive-tan browning grass
    soil: [110, 84, 42],
    outline: [46, 36, 36],
    lightWash: [255, 188, 100], // low amber, BOLD
    lightWashAmt: 0.3,
    gloss: 0.4, // gloss slightly dulled
    plumageVolume: 0.68, // thicker
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.9,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [226, 214, 184], // cream-knit (per-species winter accessory)
  },
  // Winter — FLUFFED feathers, snow on back/perch, a SCARF, breath-fog, frost,
  // snowy pad, cool blue-grey light. Still obviously the same vivid macaw.
  Winter: {
    headLight: [230, 76, 66], // STILL vivid red (not desaturated)
    headDark: [156, 38, 42],
    wingLight: [80, 186, 92], // STILL vivid green
    wingDark: [38, 116, 60],
    tailLight: [78, 132, 224], // STILL vivid blue
    tailDark: [40, 80, 162],
    beak: [230, 226, 216],
    perchLight: [150, 132, 118],
    perchDark: [104, 88, 76],
    padGrass: [224, 234, 246], // snow on the pad
    soil: [148, 166, 190],
    outline: [54, 48, 58],
    lightWash: [194, 216, 250], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    gloss: 0.32, // soft cold sheen, not glossy
    plumageVolume: 1, // BOLD: fluffed puffy plumage
    frostAmt: 0.82,
    backSnowAmt: 0.88,
    padSnowAmt: 0.92,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.85,
    scarfAmt: 1, // a little scarf appears in winter
    scarfColor: [226, 214, 184], // cream-knit (per-species winter accessory)
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    headLight: lerpRGB(a.headLight, b.headLight, t),
    headDark: lerpRGB(a.headDark, b.headDark, t),
    wingLight: lerpRGB(a.wingLight, b.wingLight, t),
    wingDark: lerpRGB(a.wingDark, b.wingDark, t),
    tailLight: lerpRGB(a.tailLight, b.tailLight, t),
    tailDark: lerpRGB(a.tailDark, b.tailDark, t),
    beak: lerpRGB(a.beak, b.beak, t),
    perchLight: lerpRGB(a.perchLight, b.perchLight, t),
    perchDark: lerpRGB(a.perchDark, b.perchDark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    gloss: lerp(a.gloss, b.gloss, t),
    plumageVolume: lerp(a.plumageVolume, b.plumageVolume, t),
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
    gloss: clamp01(p.gloss),
    plumageVolume: clamp01(p.plumageVolume),
    frostAmt: clamp01(p.frostAmt),
    backSnowAmt: clamp01(p.backSnowAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    breathFogAmt: clamp01(p.breathFogAmt),
    scarfAmt: clamp01(p.scarfAmt),
  };
}

// clamp / sanitize the pose so a wild caller never throws
function clampPose(pose: Pose): Pose {
  return {
    bob: safeNum(pose.bob, 0),
    lean: safeNum(pose.lean, 0),
    squashX: safeNum(pose.squashX, 1),
    squashY: safeNum(pose.squashY, 1),
    head: safeNum(pose.head, 0),
    peck: clamp01(safeNum(pose.peck, 0)),
    hop: clamp01(safeNum(pose.hop, 0)),
    wing: clamp01(safeNum(pose.wing, 0)),
    tail: safeNum(pose.tail, 0),
  };
}

// ── Geometry constants (the SAME silhouette every season) ────────────────────

const PERCH_Y = 13; // top surface of the perch
const PERCH_HALF = 16; // half-width of the wooden perch
const BODY_CX = 1; // body centre x (turned ~15° toward lower-left)
const BODY_CY = -1; // body centre y (rest)

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat turf pad
function paintPad(ctx: CanvasRenderingContext2D, p: P): void {
  // soft contact shadow, offset to lower-right (light is upper-left)
  ctx.fillStyle = rgba([0, 0, 0], 0.18);
  ctx.beginPath();
  ctx.ellipse(3, 21.5, 17, 4.6, 0, 0, Math.PI * 2);
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
    for (const [bx, by] of [[-12, 18.5], [9, 20], [14, 19]] as const) {
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

// the short low wooden perch laid across the pad (the parrot's feet grip it)
function paintPerch(ctx: CanvasRenderingContext2D, p: P): void {
  // outline pass (drawn fatter, dark first)
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, PERCH_Y + 1, PERCH_HALF + 1.4, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // shaded underside
  ctx.fillStyle = rgba(p.perchDark);
  ctx.beginPath();
  ctx.ellipse(0, PERCH_Y + 1, PERCH_HALF, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit top of the perch
  ctx.fillStyle = rgba(p.perchLight);
  ctx.beginPath();
  ctx.ellipse(0, PERCH_Y, PERCH_HALF, 2.1, 0, 0, Math.PI * 2);
  ctx.fill();
  // a couple of bark grooves for woodiness
  ctx.strokeStyle = rgba(p.perchDark, 0.7);
  ctx.lineWidth = 0.7;
  for (const gx of [-9, -2, 6, 12] as const) {
    ctx.beginPath();
    ctx.moveTo(gx, PERCH_Y - 1.4);
    ctx.lineTo(gx + 1, PERCH_Y + 1.2);
    ctx.stroke();
  }
  // little nub ends (cut branch)
  for (const ex of [-PERCH_HALF, PERCH_HALF] as const) {
    ctx.fillStyle = rgba(p.perchDark);
    ctx.beginPath();
    ctx.ellipse(ex, PERCH_Y, 1.5, 2.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.perchLight, 0.5);
    ctx.beginPath();
    ctx.ellipse(ex, PERCH_Y - 0.3, 0.8, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // snow settled along the top of the perch (winter)
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgba([248, 252, 255], 0.92 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(0, PERCH_Y - 1.4, PERCH_HALF * 0.92, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// one curled gripping foot on the perch
function paintFoot(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.strokeStyle = rgba([70, 58, 52]);
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  // two front toes + one back toe gripping over the perch
  for (const dx of [-1.8, 0.2, 2] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y - 1.6);
    ctx.quadraticCurveTo(x + dx, y - 0.2, x + dx * 1.3, y + 1.4);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

// one flared wing, drawn at a side. `flare` 0..1 swings it open and out.
// side −1 = the near (left/front) wing, +1 = the far (right/back) wing.
function paintWing(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number, puff: number, side: 1 | -1, flare: number): void {
  ctx.save();
  // pivot at the shoulder; the wing rotates open and reaches out with flare
  const sx = cx + side * 2.2;
  const sy = cy - 1;
  ctx.translate(sx, sy);
  const baseRot = side === 1 ? 0.34 : -0.34;
  ctx.rotate(baseRot + side * flare * 1.05);
  // reach: folded ellipse grows longer/wider as it flares
  const len = (9.0 + flare * 9.0) * puff; // flared length up to ~18px reach
  const wid = (6.4 + flare * 1.4) * puff;
  const ox = side * (flare * 4.5); // slide the wing outward as it opens
  // outline
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(ox, len * 0.32, wid + 0.8, len * 0.5 + 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  // dark green base
  ctx.fillStyle = rgba(p.wingDark);
  ctx.beginPath();
  ctx.ellipse(ox, len * 0.32, wid, len * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit green
  ctx.fillStyle = rgba(p.wingLight);
  ctx.beginPath();
  ctx.ellipse(ox - side * 1.0, len * 0.22, wid * 0.62, len * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // flight-feather lines spreading along the wing
  ctx.strokeStyle = rgba(p.wingDark, 0.85);
  ctx.lineWidth = 0.8;
  for (const k of [0, 1, 2] as const) {
    const fx = ox + (k - 1) * 1.7;
    ctx.beginPath();
    ctx.moveTo(fx, len * 0.05);
    ctx.lineTo(fx, len * (0.7 + flare * 0.15));
    ctx.stroke();
  }
  ctx.restore();
}

// the whole parrot: blue tail, green wings, red head/breast, hooked beak.
// The SILHOUETTE is identical every season; `plumageVolume` puffs the feather
// edge and `pose` animates it, but it never changes the recognizable shape.
function paintParrot(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  const puff = 1 + p.plumageVolume * 0.2; // BOLD winter feather puff
  const cx0 = BODY_CX - pose.lean; // lean toward lower-left during the squawk
  const cy0 = BODY_CY - pose.bob; // body lift

  // feet grip the perch — PLANTED (they don't move with the body squash)
  paintFoot(ctx, cx0 - 3.5, PERCH_Y - 1);
  paintFoot(ctx, cx0 + 2.5, PERCH_Y - 1);

  // The whole bird is drawn under a squash/stretch transform centred on the
  // body, so the gestures read with anticipation squash + flare stretch.
  ctx.save();
  ctx.translate(cx0, cy0);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-cx0, -cy0);

  const cx = cx0;
  const cy = cy0;

  // ── FAR wing (back) — folded at rest, flares wide during the squawk ──────
  paintWing(ctx, p, cx, cy, puff, 1, pose.wing);

  // ── BLUE TAIL — sweeping down-right behind the body (fans during squawk) ──
  ctx.save();
  ctx.translate(cx + 5, cy + 4);
  ctx.rotate(0.5 + pose.tail);
  // outline
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.4, 12.4 * puff, 0, 0, Math.PI * 2);
  ctx.fill();
  // dark blue
  ctx.fillStyle = rgba(p.tailDark);
  ctx.beginPath();
  ctx.ellipse(0, 0, 3.6, 11.4 * puff, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit blue streak
  ctx.fillStyle = rgba(p.tailLight);
  ctx.beginPath();
  ctx.ellipse(-0.8, -1, 1.8, 9.6 * puff, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── RED HEAD / BREAST — the body front (lower-left, turned ~15°) ──────────
  // breast outline
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(cx - 2.4, cy + 2, 7.4 * puff, 9.4 * puff, -0.12, 0, Math.PI * 2);
  ctx.fill();
  // dark red
  ctx.fillStyle = rgba(p.headDark);
  ctx.beginPath();
  ctx.ellipse(cx - 2.4, cy + 2, 6.6 * puff, 8.6 * puff, -0.12, 0, Math.PI * 2);
  ctx.fill();
  // lit red breast (upper-left light)
  ctx.fillStyle = rgba(p.headLight);
  ctx.beginPath();
  ctx.ellipse(cx - 3.6, cy + 0.4, 4.6 * puff, 6.4 * puff, -0.12, 0, Math.PI * 2);
  ctx.fill();

  // winter plumage fluff: a soft scalloped feather edge round the breast/back,
  // so the silhouette reads visibly PUFFED (identity shape unchanged)
  if (p.plumageVolume > 0.45) {
    const fl = (p.plumageVolume - 0.45) / 0.55; // 0..1 over the fluffy range
    ctx.fillStyle = rgba(p.headLight, 0.9);
    const lumps = 9;
    for (let i = 0; i < lumps; i++) {
      const a = (i / lumps) * Math.PI * 2 - Math.PI / 2;
      const rx = 6.8 * puff;
      const ry = 8.6 * puff;
      const lx = cx - 2.4 + Math.cos(a) * rx * 0.98;
      const ly = cy + 2 + Math.sin(a) * ry * 0.98;
      ctx.beginPath();
      ctx.arc(lx, ly, (1.2 + fl * 1.4), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── NEAR wing (green, folded along the side) — flares during the squawk ──
  // At rest it sits folded over the back/side (the familiar silhouette);
  // pose.wing swings it open and outward.
  if (pose.wing < 0.02) {
    // folded near wing — the classic look
    ctx.fillStyle = rgba(p.outline);
    ctx.beginPath();
    ctx.ellipse(cx + 3.4, cy + 1, 7.4 * puff, 9.6 * puff, 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.wingDark);
    ctx.beginPath();
    ctx.ellipse(cx + 3.4, cy + 1, 6.6 * puff, 8.8 * puff, 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.wingLight);
    ctx.beginPath();
    ctx.ellipse(cx + 2.2, cy - 0.6, 4.6 * puff, 6.8 * puff, 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(p.wingDark, 0.85);
    ctx.lineWidth = 0.8;
    for (const k of [0, 1, 2] as const) {
      ctx.beginPath();
      ctx.moveTo(cx + 1.2 + k * 1.8, cy - 4 + k * 1.2);
      ctx.quadraticCurveTo(cx + 4 + k * 1.6, cy + 1 + k, cx + 4.6 + k * 1.4, cy + 6 + k * 0.6);
      ctx.stroke();
    }
  } else {
    // flared near wing — opens out to the lower-left
    paintWing(ctx, p, cx, cy, puff, -1, pose.wing);
  }

  // ── HEAD — round red head up-left, with the pale hooked beak ─────────────
  // The preen dips the head down (pose.head) and the squawk lifts the gape.
  const hx = cx - 5;
  const hy = cy - 7 + pose.head; // preen dips the head down
  // head outline
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.arc(hx, hy, 6.1 * puff, 0, Math.PI * 2);
  ctx.fill();
  // dark red
  ctx.fillStyle = rgba(p.headDark);
  ctx.beginPath();
  ctx.arc(hx, hy, 5.4 * puff, 0, Math.PI * 2);
  ctx.fill();
  // lit red crown (upper-left)
  ctx.fillStyle = rgba(p.headLight);
  ctx.beginPath();
  ctx.arc(hx - 1.4, hy - 1.6, 3.8 * puff, 0, Math.PI * 2);
  ctx.fill();

  // pale bare cheek patch (macaw signature) around the eye
  ctx.fillStyle = rgba([244, 238, 228]);
  ctx.beginPath();
  ctx.ellipse(hx - 1.2, hy + 0.2, 3.0, 2.6, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // a couple of faint cheek lines
  ctx.strokeStyle = rgba([200, 120, 110], 0.6);
  ctx.lineWidth = 0.5;
  for (const ly of [-0.6, 0.8] as const) {
    ctx.beginPath();
    ctx.moveTo(hx - 3.4, hy + ly);
    ctx.lineTo(hx + 0.4, hy + ly + 0.3);
    ctx.stroke();
  }

  // eye
  ctx.fillStyle = rgba([250, 248, 240]);
  ctx.beginPath();
  ctx.arc(hx - 1.2, hy - 0.4, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([24, 20, 22]);
  ctx.beginPath();
  ctx.arc(hx - 1, hy - 0.3, 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([255, 255, 255], 0.9);
  ctx.beginPath();
  ctx.arc(hx - 1.4, hy - 0.7, 0.32, 0, Math.PI * 2);
  ctx.fill();

  // ── PALE CURVED HOOKED BEAK — pointing down-left ─────────────────────────
  // The preen pulls the beak in toward the wing (pose.peck); the squawk gapes
  // the mandible open (pose.hop).
  const peckIn = pose.peck * 1.6;
  const bxk = hx - 4.4 + peckIn * 0.4;
  const byk = hy + 1.6 + peckIn; // dips toward the wing to preen
  const gape = pose.hop * 2.6; // mandible drop when squawking
  // upper mandible outline
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.moveTo(bxk + 3.2, byk - 2.6);
  ctx.quadraticCurveTo(bxk - 2.8, byk - 1.8, bxk - 2.6, byk + 2.2);
  ctx.quadraticCurveTo(bxk - 1.6, byk + 4.6, bxk + 1, byk + 3.2);
  ctx.quadraticCurveTo(bxk + 2.6, byk + 1.4, bxk + 3.6, byk - 0.6);
  ctx.closePath();
  ctx.fill();
  // pale beak fill (upper mandible)
  ctx.fillStyle = rgba(p.beak);
  ctx.beginPath();
  ctx.moveTo(bxk + 2.8, byk - 2);
  ctx.quadraticCurveTo(bxk - 2, byk - 1.2, bxk - 1.8, byk + 1.8);
  ctx.quadraticCurveTo(bxk - 1, byk + 3.6, bxk + 0.8, byk + 2.4);
  ctx.quadraticCurveTo(bxk + 2, byk + 1, bxk + 3, byk - 0.6);
  ctx.closePath();
  ctx.fill();

  // open gape (squawk) — a dark mouth wedge + a dropped lower mandible
  if (gape > 0.05) {
    ctx.fillStyle = rgba([60, 18, 22]);
    ctx.beginPath();
    ctx.moveTo(bxk - 1.6, byk + 1.6);
    ctx.lineTo(bxk + 1.2, byk + 1.8);
    ctx.lineTo(bxk - 0.4, byk + 2.4 + gape);
    ctx.closePath();
    ctx.fill();
    // dropped lower mandible
    ctx.fillStyle = rgba(p.beak);
    ctx.beginPath();
    ctx.moveTo(bxk - 1.6, byk + 1.8 + gape * 0.4);
    ctx.quadraticCurveTo(bxk - 0.4, byk + 3.6 + gape, bxk + 1.2, byk + 2.0 + gape * 0.5);
    ctx.quadraticCurveTo(bxk - 0.2, byk + 3.0 + gape * 0.6, bxk - 1.6, byk + 1.8 + gape * 0.4);
    ctx.closePath();
    ctx.fill();
  }

  // shaded lower mandible + nostril
  ctx.fillStyle = rgba(p.outline, 0.5);
  ctx.beginPath();
  ctx.moveTo(bxk - 1.4, byk + 1.2);
  ctx.quadraticCurveTo(bxk - 0.6, byk + 3, bxk + 0.8, byk + 2.2);
  ctx.lineTo(bxk + 0.2, byk + 1.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba([60, 48, 44]);
  ctx.beginPath();
  ctx.arc(bxk + 1.8, byk - 1, 0.5, 0, Math.PI * 2);
  ctx.fill();

  // ── SCARF (winter) — a little knitted band around the neck, below the head ─
  if (p.scarfAmt > 0.001) {
    const sx = hx + 2.2;
    const sy = hy + 5.0;
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // wrap band
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 5.4, 2.8, 0.18, 0, Math.PI * 2);
    ctx.fill();
    // darker underside for depth
    ctx.fillStyle = rgba([
      Math.max(0, p.scarfColor[0] - 50),
      Math.max(0, p.scarfColor[1] - 30),
      Math.max(0, p.scarfColor[2] - 30),
    ]);
    ctx.beginPath();
    ctx.ellipse(sx + 0.4, sy + 1.3, 5.0, 1.5, 0.18, 0, Math.PI * 2);
    ctx.fill();
    // hanging tail of the scarf, with a knitted seam + fringe
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.moveTo(sx - 3.0, sy + 1.6);
    ctx.lineTo(sx + 0.6, sy + 2.2);
    ctx.lineTo(sx - 0.2, sy + 7.6);
    ctx.lineTo(sx - 3.6, sy + 6.8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba([
      Math.max(0, p.scarfColor[0] - 60),
      Math.max(0, p.scarfColor[1] - 40),
      Math.max(0, p.scarfColor[2] - 40),
    ]);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sx - 1.8, sy + 3.0);
    ctx.lineTo(sx - 2.2, sy + 7.0);
    ctx.stroke();
    // fringe at the bottom
    ctx.strokeStyle = rgba(p.scarfColor);
    ctx.lineWidth = 0.9;
    ctx.lineCap = "round";
    for (const fx of [-3.4, -2.2, -1.0]) {
      ctx.beginPath();
      ctx.moveTo(sx + fx, sy + 7.0);
      ctx.lineTo(sx + fx - 0.2, sy + 8.6);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.restore();
  }

  // ── snow on the back / head + frost sparkle (winter) ─────────────────────
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgba([248, 252, 255], 0.92 * p.backSnowAmt);
    // cap on the head crown
    ctx.beginPath();
    ctx.ellipse(hx - 0.6, hy - 4.2, 4.0 * puff, 1.8, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // ridge along the wing/back
    ctx.beginPath();
    ctx.ellipse(cx + 3.4, cy - 5, 5.2 * puff, 1.8, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // a few snow lumps
    ctx.fillStyle = rgba([255, 255, 255], 0.9 * p.backSnowAmt);
    for (const [dx, dy] of [[-1, -5.4], [4, -5], [-4, -4.2]] as const) {
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgba([255, 255, 255], 0.82 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [cx - 4, cy - 2], [cx + 2, cy - 3], [cx + 5, cy + 2], [hx - 2, hy + 3],
      [cx + 4, cy + 6], [cx - 6, cy + 4],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(fx, fy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore(); // end squash/stretch transform

  // breath-fog puff at the beak (winter) — drawn OUTSIDE the squash transform so
  // it reads as air, not body. Static base puff + an exhale swell during the
  // squawk gape.
  if (p.breathFogAmt > 0.001) {
    const bxk = cx - 5 - 4.4;
    const byk = cy - 7 + pose.head + 1.6;
    const reach = 3.6 + pose.hop * 3.4;
    ctx.fillStyle = rgba([235, 244, 255], (0.34 + 0.3 * pose.hop) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(bxk - reach, byk + 1.4, 2.8 + pose.hop * 2.0, 1.9 + pose.hop * 1.4, 0.2, 0, Math.PI * 2);
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

// plumage gloss sheen — a soft warm glaze whose strength tracks `gloss` (peaks
// in summer, dulls in autumn/winter). Keeps the bird glossy without a flash.
function paintGloss(ctx: CanvasRenderingContext2D, p: P): void {
  if (p.gloss <= 0.001) return;
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = rgba([255, 248, 234], 0.1 * p.gloss);
  ctx.beginPath();
  ctx.ellipse(BODY_CX - 3, BODY_CY - 1, 11, 13, 0, 0, Math.PI * 2);
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
    paintPerch(ctx, p);
    paintParrot(ctx, p, pose);
    paintGloss(ctx, p);
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

// ── Forward transitions (lerp EVERY field through quintic smoothstep) ────────

// A monotone ease that is EXACT at the endpoints but can lead or lag.
function biasedEase(k: number, bias: number): number {
  const x = clamp01(k);
  return Math.pow(smoother(x), bias);
}

// Staged transition. The whole-tile look lerps from SP[from] (p=0) to SP[to]
// (p=1) — so transition(0) === draw(from) and transition(1) === draw(to)
// EXACTLY (both drawn at REST, matching the idle hand-off). The plumage VOLUME
// leads (feathers fluff early); snow / frost / breath-fog / scarf LAG (settle
// late) for autumn→winter readability.
function makeTransition(fromIdx: 0 | 1 | 2) {
  const from = SEASON_NAMES[fromIdx];
  const to = SEASON_NAMES[fromIdx + 1];
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const p = clamp01(safeNum(pp, 0));
    const kBase = smoother(p);
    const kVol = biasedEase(p, 0.62); // plumage volume LEADS
    const kSnow = biasedEase(p, 1.7); // snow / frost / fog / scarf LAG

    const a = SP[from];
    const b = SP[to];
    const blended: P = lerpP(a, b, kBase);
    blended.plumageVolume = lerp(a.plumageVolume, b.plumageVolume, kVol);
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
      const cx = BODY_CX;
      const cy = BODY_CY;

      // Loose feather motes lifting off the puffing plumage — reads the feathers
      // visibly fluffing. Present in EVERY morph (deterministic in p).
      const fluff = trans * (0.4 + 0.6 * Math.max(0, b.plumageVolume - a.plumageVolume + 0.4));
      if (fluff > 0.01) {
        ctx.fillStyle = rgba(b.wingLight, 0.45 * fluff);
        const motes: Array<[number, number, number]> = [
          [-8, -8, 1.1], [3, -10, 1.2], [9, -6, 0.9], [-3, -11, 1.0],
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
          [-6, -10], [-1, -11], [4, -9.5], [7, -8],
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
        const bxk = cx - 5 - 4.4;
        const byk = cy - 7 + 1.6;
        ctx.fillStyle = rgba([235, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(bxk - (4 + trans * 3), byk + 1.4, 2.6 + trans * 1.8, 1.8 + trans * 1.2, 0.2, 0, Math.PI * 2);
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
