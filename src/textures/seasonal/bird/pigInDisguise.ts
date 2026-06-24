// Production seasonal art for the PIG-IN-A-BIRD-DISGUISE board tile
// (`tile_bird_pig_in_disguise`) — the approved bold "bold & fun" direction.
// A single parameterized `paint(ctx, p, pose)` + four `P` presets + lerped
// transitions, pushed so the seasons read at a glance and the idle is a real,
// fun ACTION rather than a subtle breath. Mirrors herd/sheep.ts EXACTLY in
// architecture (Pose object, two-tier actionQ idle, raised-cosine windows).
//
// THE JOKE IS THE WHOLE IDENTITY: a round PINK PIG dressed up in a BIRD
// COSTUME — a strapped-on cape of layered teal/blue feathers (little fake
// wings) over its back, a YELLOW BEAK MASK clipped over its pink snout (the
// snout still pink at the edges), and a small fan of fake tail-feathers off the
// rear. It stands front-¾ turned ~15–20° toward the lower-left (ANIMAL framing).
// It is secretly a pig and never becomes a real bird.
//
// PALETTE LOCK / IDENTITY: it is ALWAYS the SAME costumed pink pig — pig pink
// hide + the teal feather costume + the yellow beak mask + the silhouette are
// LOCKED across all four seasons. Seasons change only the COSTUME / plumage
// fluff VOLUME (sleeker spring → puffy winter), the pad colour, the light wash,
// and BOLD dressing — snow on the cape/back, a little winter SCARF (over the
// disguise — extra funny), a breath-fog puff, blossoms, a fallen leaf, frost.
// (Autumn nudges the beak mask a few degrees ASKEW for character — same mask.)
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~0.9s): a clumsy PECK attempt — the pig tries to peck like
//     a bird (head dips ~10–14px) with a body squash and a curly-tail flick /
//     snout twitch. It's a bit clumsy: it sells the gag.
//   • RARE  ~18s (win ~1.2s, phase +3s): a FLAP-AND-OINK HOP — it flaps the fake
//     wings and hops ~12–16px trying to fly like a bird, fails, plops back with a
//     big squash; the disguise (beak mask) slips for a beat. The hop may lift
//     OUTSIDE the −24..+24 design box.
// Both gestures return to REST (zero value AND zero velocity) at the window
// edges (raised-cosine windows), so `anim(…, t)` is seamless and `anim(…, 0)`
// (and `draw`) sit exactly at rest: draw === anim(0).
//
// Origin-centered in the −24..+24 design box, light from upper-left, flat
// cel-shaded with a soft dark outline. Pure Canvas-2D vector drawing; never
// throws for any `t` or `p` (clamps every scalar; save/restore + globalAlpha
// reset in `finally`).

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Small math helpers ───────────────────────────────────────────────────────

type RGB = [number, number, number];

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

// guard a possibly non-finite number (NaN / ±Infinity) to a safe fallback
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
// rise, then a clean arc up and a plop-back settle. q∈[0,1]. Returns a LIFT
// factor in roughly −0.2..+1 (negative = squash-down crouch, positive =
// airborne). Zero value & slope at both ends.
function hopShape(q: number): number {
  if (q <= 0 || q >= 1) return 0;
  const antiEnd = 0.26; // first slice = crouch/anticipation (flap-up wind)
  if (q < antiEnd) {
    // dip down a little (anticipation), zero slope at q=0
    const a = q / antiEnd;
    return -0.2 * (0.5 - 0.5 * Math.cos(a * Math.PI));
  }
  // airborne arc, zero at the seam to the crouch and at q=1 (the plop)
  const a = (q - antiEnd) / (1 - antiEnd);
  return Math.sin(a * Math.PI);
}

// ── The idle POSE (carries all action state into paint) ──────────────────────

interface Pose {
  bob: number; // whole-body vertical offset (design px, + = down dip)
  lift: number; // whole-body vertical lift (design px, + = up). Hop uses this.
  lean: number; // signed forward lean (design px, the peck reach)
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  head: number; // extra head dip (design px, + = down) for the peck
  peck: number; // 0..1 peck thrust amount (drives the beak-mask + snout twitch)
  hop: number; // 0..1 hop airborne amount (drives the mask slip)
  wing: number; // 0..1 fake-wing flap amount (radians scale)
  tail: number; // signed tail-feather flick (radians)
}

const REST: Pose = { bob: 0, lift: 0, lean: 0, squashX: 1, squashY: 1, head: 0, peck: 0, hop: 0, wing: 0, tail: 0 };

// Build a pose from the wall clock: a common clumsy PECK every ~6s and a rare
// FLAP-AND-OINK HOP every ~18s. Returns to REST (all zeros / unit scales) at
// every window edge.
function poseFromClock(tIn: number): Pose {
  const t = safeNum(tIn, 0);
  const pose: Pose = { bob: 0, lift: 0, lean: 0, squashX: 1, squashY: 1, head: 0, peck: 0, hop: 0, wing: 0, tail: 0 };

  // COMMON ~6s: clumsy PECK (win ~0.9s). Head dips ~10–14px as it tries to peck
  // like a bird, body squashes, the curly tail flicks and the snout twitches.
  // Built from raised-cosine windows → seamless. Phase 3.0 opens the window at
  // t≈3.0 (well clear of t=0, so anim(0) sits exactly at REST).
  const pq = actionQ(t, 6, 0.9, 3.0);
  if (pq >= 0) {
    const env = bump(pq); // 0→1→0 over the window
    // two clumsy peck thrusts within the window (head dips ~10–14px at peaks)
    const thrust = Math.abs(Math.sin(pq * Math.PI * 2));
    pose.head = env * (4.0 + 9.5 * thrust); // ~14px peak dip — BOLD
    pose.lean = env * (2.0 + 2.4 * thrust); // a little forward reach with each peck
    pose.peck = env * (0.4 + 0.6 * thrust); // drives mask/snout twitch
    pose.bob = env * 1.4 * thrust; // small body dip with the thrust
    // body squash as it leans into the peck (clumsy, a bit too much)
    pose.squashY = 1 - env * 0.1 * thrust;
    pose.squashX = 1 + env * 0.08 * thrust;
    pose.tail = Math.sin(pq * Math.PI * 6) * env * 0.5; // curly-tail flick
  }

  // RARE ~18s: FLAP-AND-OINK HOP (win ~1.2s, phase +3s offset from the peck).
  // Flaps the fake wings, hops ~12–16px, fails, plops back with a big squash;
  // the disguise (beak mask) slips for a beat. May lift OUTSIDE the design box.
  const hq = actionQ(t, 18, 1.2, 4.0);
  if (hq >= 0) {
    const s = hopShape(hq); // −0.2..+1 (crouch then arc then plop)
    pose.lift = Math.max(0, s) * 14; // up to ~14px airborne (12–16 range w/ flap)
    if (s < 0) {
      // anticipation crouch: squash down/wide as it winds up the flap
      const c = -s; // 0..0.2
      pose.squashY = 1 - c * 1.0;
      pose.squashX = 1 + c * 0.8;
    } else {
      // airborne: stretch tall/narrow at the apex, then a big plop squash on
      // the way back down (squash grows again near the bottom of the arc)
      pose.squashY = 1 + s * 0.16;
      pose.squashX = 1 - s * 0.11;
    }
    // a big PLOP squash in the final settle slice (it fails and flops)
    if (hq > 0.78) {
      const plop = bump((hq - 0.78) / 0.22); // 0→1→0 over the settle
      pose.squashY = Math.min(pose.squashY, 1 - plop * 0.18);
      pose.squashX = Math.max(pose.squashX, 1 + plop * 0.16);
    }
    // FLAP: the fake wings beat several times across the hop window
    pose.wing = Math.max(pose.wing, Math.abs(Math.sin(hq * Math.PI * 5)) * bump(hq));
    // the disguise slips: the beak mask cocks while airborne
    pose.hop = Math.max(0, s);
    // tail-feathers flag during the hop
    pose.tail += Math.sin(hq * Math.PI * 3) * bump(hq) * 0.6;
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────
//
// Every field tweens (number or RGB). NO booleans / season strings — the paint
// is a pure function of these so transitions interpolate cleanly. The pig hide
// + the costume feather/beak colours are held essentially constant across the
// presets (identity lock); only volume / pad / light / dressing really move.

interface P {
  // pig hide (LOCKED pink across seasons)
  skinLight: RGB; // lit top of the pink hide
  skinMid: RGB; // body mid tone
  skinShadow: RGB; // shaded underside of the hide
  snout: RGB; // pink snout edges peeking past the beak mask
  hoof: RGB; // dark trotter tips
  // bird COSTUME (LOCKED teal feathers + yellow beak mask)
  featherMid: RGB; // teal/blue cape + wing + tail feathers
  featherLight: RGB; // lighter feather tips
  featherDark: RGB; // shadowed feather grooves / straps
  beakMask: RGB; // yellow beak-mask face
  beakMaskDark: RGB; // shaded underside of the beak mask
  // ground + light
  padGrass: RGB; // top of the grass pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  // costume / surface amounts
  costumeVolume: number; // 0..1 BOLD plumage/costume fluff (sleek spring → puffy winter)
  featherSheen: number; // 0..1 soft sheen / gloss on the cape feathers
  maskTilt: number; // radians — beak mask worn ASKEW (autumn) vs straight
  // winter dressing
  scarfAmt: number; // 0..1 knit scarf around the neck (winter)
  capeSnowAmt: number; // 0..1 snow settled on the feather cape / back
  frostAmt: number; // 0..1 frost sparkle across the costume
  padSnowAmt: number; // 0..1 snow blanket on the pad
  breathFogAmt: number; // 0..1 breath puff at the snout
  // seasonal pad litter
  blossomAmt: number; // 0..1 tiny blossoms on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad (autumn)
}

// Scarf knit colour — a STRIPED berry-and-cream knit (the costumed pig's own
// winter accessory, distinct from the other birds). Used only where scarfAmt > 0.
const SCARF: RGB = [180, 52, 76]; // berry base
const SCARF_DARK: RGB = [122, 34, 54]; // shaded berry
const SCARF_STRIPE: RGB = [238, 226, 198]; // cream stripe

// ── Four BOLD season presets ──────────────────────────────────────────────────
// IDENTITY LOCK: skin* + feather* + beakMask* stay essentially constant. Only
// costume volume / pad / light / dressing amounts (+ the autumn mask tilt) move,
// pushed HARD so each season reads at a glance.

const SP: Record<SeasonName, P> = {
  // Spring — smooth pink under a SLEEKER costume; dewy lime pad + blossom; cool
  // bright light.
  Spring: {
    skinLight: [252, 200, 200],
    skinMid: [238, 162, 168],
    skinShadow: [196, 116, 128],
    snout: [245, 180, 190],
    hoof: [70, 50, 52],
    featherMid: [86, 150, 180],
    featherLight: [150, 205, 225],
    featherDark: [52, 104, 132],
    beakMask: [240, 190, 70],
    beakMaskDark: [200, 150, 40],
    padGrass: [128, 214, 84], // BOLD bright lime dewy grass
    soil: [84, 138, 52],
    outline: [120, 70, 78],
    lightWash: [206, 240, 255], // cool-bright
    lightWashAmt: 0.2,
    costumeVolume: 0.1, // BOLD: clearly sleeker / trimmed costume
    featherSheen: 0.4,
    maskTilt: 0,
    scarfAmt: 0,
    capeSnowAmt: 0,
    frostAmt: 0,
    padSnowAmt: 0,
    breathFogAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — healthy PEAK glossy pink, FULL vivid costume, saturated mid-green
  // pad, bright warm light, strongest shadow.
  Summer: {
    skinLight: [255, 198, 198],
    skinMid: [246, 158, 164],
    skinShadow: [192, 102, 116], // deepest shadow (peak)
    snout: [246, 178, 188],
    hoof: [64, 44, 46],
    featherMid: [70, 158, 192], // vivid teal
    featherLight: [156, 214, 232],
    featherDark: [44, 102, 134],
    beakMask: [246, 196, 72],
    beakMaskDark: [202, 152, 40],
    padGrass: [80, 184, 60], // saturated mid-green
    soil: [52, 116, 38],
    outline: [116, 62, 70],
    lightWash: [255, 240, 190], // bright warm
    lightWashAmt: 0.2,
    costumeVolume: 0.5, // full normal costume
    featherSheen: 0.85, // peak gloss
    maskTilt: 0,
    scarfAmt: 0,
    capeSnowAmt: 0,
    frostAmt: 0,
    padSnowAmt: 0,
    breathFogAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — pink + costume warmed by amber light; olive-tan pad + a fallen
  // leaf; dulled gloss; the BEAK MASK sits a few degrees ASKEW.
  Autumn: {
    skinLight: [246, 192, 188],
    skinMid: [232, 150, 152],
    skinShadow: [190, 104, 112],
    snout: [240, 172, 178],
    hoof: [66, 46, 44],
    featherMid: [82, 146, 172],
    featherLight: [148, 200, 218],
    featherDark: [50, 100, 126],
    beakMask: [238, 186, 66],
    beakMaskDark: [196, 146, 38],
    padGrass: [172, 138, 64], // olive-tan browning
    soil: [112, 82, 40],
    outline: [112, 62, 64],
    lightWash: [255, 184, 96], // low amber, BOLD
    lightWashAmt: 0.3,
    costumeVolume: 0.74, // thicker
    featherSheen: 0.34, // dulled gloss
    maskTilt: 0.16, // mask worn crooked (a few degrees)
    scarfAmt: 0,
    capeSnowAmt: 0,
    frostAmt: 0,
    padSnowAmt: 0,
    breathFogAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.9,
  },
  // Winter — pink + costume clearly visible but FLUFFED puffy, under a knit
  // SCARF (over the disguise — extra funny), snow on the cape/back + frost; snowy
  // pad, cool blue-grey light, breath-fog at the snout. Clearly wintry, NO
  // white-out, still the same pig-in-disguise.
  Winter: {
    skinLight: [244, 196, 198],
    skinMid: [224, 156, 162],
    skinShadow: [180, 116, 132],
    snout: [236, 176, 186],
    hoof: [70, 58, 64],
    featherMid: [86, 146, 176], // costume stays teal, slightly cooled
    featherLight: [156, 206, 226],
    featherDark: [52, 100, 130],
    beakMask: [236, 188, 74],
    beakMaskDark: [196, 148, 44],
    padGrass: [224, 234, 248], // snow on the pad
    soil: [148, 166, 190],
    outline: [104, 72, 84],
    lightWash: [190, 214, 252], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    costumeVolume: 1, // BOLD: thick fluffy puffy costume
    featherSheen: 0.28,
    maskTilt: 0,
    scarfAmt: 1, // a little scarf appears in winter
    capeSnowAmt: 0.9,
    frostAmt: 0.7,
    padSnowAmt: 0.95,
    breathFogAmt: 0.85,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    skinLight: lerpRGB(a.skinLight, b.skinLight, t),
    skinMid: lerpRGB(a.skinMid, b.skinMid, t),
    skinShadow: lerpRGB(a.skinShadow, b.skinShadow, t),
    snout: lerpRGB(a.snout, b.snout, t),
    hoof: lerpRGB(a.hoof, b.hoof, t),
    featherMid: lerpRGB(a.featherMid, b.featherMid, t),
    featherLight: lerpRGB(a.featherLight, b.featherLight, t),
    featherDark: lerpRGB(a.featherDark, b.featherDark, t),
    beakMask: lerpRGB(a.beakMask, b.beakMask, t),
    beakMaskDark: lerpRGB(a.beakMaskDark, b.beakMaskDark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    costumeVolume: lerp(a.costumeVolume, b.costumeVolume, t),
    featherSheen: lerp(a.featherSheen, b.featherSheen, t),
    maskTilt: lerp(a.maskTilt, b.maskTilt, t),
    scarfAmt: lerp(a.scarfAmt, b.scarfAmt, t),
    capeSnowAmt: lerp(a.capeSnowAmt, b.capeSnowAmt, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    breathFogAmt: lerp(a.breathFogAmt, b.breathFogAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
  };
}

// clamp every scalar field defensively (never throw on a wild `p`)
function clampP(p: P): P {
  return {
    ...p,
    lightWashAmt: clamp01(p.lightWashAmt),
    costumeVolume: clamp01(p.costumeVolume),
    featherSheen: clamp01(p.featherSheen),
    // maskTilt is a small angle, not a 0..1 amount — clamp to a sane range
    maskTilt: Math.max(-0.6, Math.min(0.6, safeNum(p.maskTilt))),
    scarfAmt: clamp01(p.scarfAmt),
    capeSnowAmt: clamp01(p.capeSnowAmt),
    frostAmt: clamp01(p.frostAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    breathFogAmt: clamp01(p.breathFogAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Subject geometry constants (the SAME silhouette every season) ────────────
// Front-¾ pig turned ~15–20° toward lower-left: round body low-centre, head +
// beak-masked snout reading to the lower-left, tail-feathers off the upper-right.

const BODY_CX = 0; // pig body centre x
const BODY_CY = 5; // pig body centre y (rest; pose lifts/dips it)
const BODY_RX = 13.4; // body half-width
const BODY_RY = 10.4; // body half-height
const HEAD_DX = -11.5; // head offset from body centre (forward / lower-left)
const HEAD_DY = 3.2;

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
  ctx.strokeStyle = rgba(p.skinShadow);
  ctx.lineWidth = 4.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  ctx.fillStyle = rgba(p.hoof);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 2.0, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// the round plump body — a fat rounded ellipse; CONSTANT silhouette. `scale`
// scales the outline halo; `vol` grows the puff BOLDLY with costume volume.
function paintBody(ctx: CanvasRenderingContext2D, cx: number, cy: number, fill: string, scale: number, vol: number): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(cx, cy, BODY_RX * scale * vol, BODY_RY * scale * vol, 0, 0, Math.PI * 2);
  ctx.fill();
}

// A small fan of FAKE tail-feathers off the upper-right rear. `flutter`
// (radians) rocks the fan for the idle; 0 = rest. Mirrors chicken tail-feather
// shaping. `vol` fluffs the fan with costume volume.
function drawTailFeathers(ctx: CanvasRenderingContext2D, p: P, ox: number, oy: number, flutter: number, vol: number): void {
  ctx.save();
  ctx.translate(ox, oy);
  // three layered feather blades fanning up-right
  const blades: Array<[number, number]> = [
    [-0.32, 0.0],
    [0.05, 0.06],
    [0.42, 0.12],
  ];
  blades.forEach(([baseAng, len], i) => {
    ctx.save();
    ctx.rotate(baseAng + flutter * (0.6 + i * 0.25));
    const L = (8.5 + len * 4) * vol;
    // dark feather outline
    ctx.fillStyle = rgba(p.featherDark);
    ctx.beginPath();
    ctx.moveTo(0, 1.6);
    ctx.quadraticCurveTo(2.6, -L * 0.6, 1.0, -L);
    ctx.quadraticCurveTo(-1.0, -L * 0.6, -2.0, 1.0);
    ctx.closePath();
    ctx.fill();
    // teal feather body, inset
    ctx.fillStyle = rgba(p.featherMid);
    ctx.beginPath();
    ctx.moveTo(0, 0.8);
    ctx.quadraticCurveTo(2.0, -L * 0.6, 0.7, -L + 1.2);
    ctx.quadraticCurveTo(-0.7, -L * 0.55, -1.4, 0.6);
    ctx.closePath();
    ctx.fill();
    // light tip
    ctx.fillStyle = rgba(p.featherLight, 0.8);
    ctx.beginPath();
    ctx.ellipse(0.2, -L + 1.6, 0.9, 1.8, baseAng, 0, Math.PI * 2);
    ctx.fill();
    // central groove
    ctx.strokeStyle = rgba(p.featherDark, 0.7);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, 0.4);
    ctx.lineTo(0.4, -L + 1.6);
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}

// One strapped-on fake feather WING (a little stack of teal feathers) over the
// back. `side` = -1 near / +1 far; the cape is two of these plus a collar.
// `flap` (radians) lifts the wing for the idle hop; `vol` fluffs the spread.
function drawWing(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number, side: number, alpha: number, flap: number, vol: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  // pivot at the shoulder so the flap rotates the whole wing up
  ctx.translate(cx, cy);
  ctx.rotate(side * -flap);
  ctx.translate(-cx, -cy);
  // three stacked feather rows sweeping back-and-down toward the rump
  for (let row = 0; row < 3; row++) {
    const ry = cy - 2 + row * 3.0;
    const spread = (6.5 + row * 1.2) * vol;
    // dark base of the row
    ctx.fillStyle = rgba(p.featherDark);
    ctx.beginPath();
    ctx.ellipse(cx + side * 1.0, ry, spread + 0.8, 2.4, side * 0.18, 0, Math.PI * 2);
    ctx.fill();
    // teal feather row
    ctx.fillStyle = rgba(p.featherMid);
    ctx.beginPath();
    ctx.ellipse(cx + side * 1.0, ry - 0.5, spread, 2.0, side * 0.18, 0, Math.PI * 2);
    ctx.fill();
    // scalloped feather tips (little arcs along the lower edge)
    ctx.fillStyle = rgba(p.featherLight, 0.85);
    const tips = 4;
    for (let k = 0; k < tips; k++) {
      const u = (k + 0.5) / tips;
      const tx = cx - spread + u * spread * 2;
      ctx.beginPath();
      ctx.arc(tx, ry + 0.6, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// the whole costumed pig, standing front-¾ turned ~15–20° toward lower-left,
// posed by `pose`.
function paintPig(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  // BOLD costume volume: from clearly-sleeker spring to puffy winter. Drives
  // body puff, wing spread, tail fan, and snow cap width.
  const vol = 0.9 + p.costumeVolume * 0.22;

  const bx = BODY_CX;
  // body lifts during the hop, dips a touch with the peck; legs stay planted.
  const by = BODY_CY - pose.lift + pose.bob;

  // ── legs first (behind the body) — four short stubby trotters on the pad ───
  // legs stay PLANTED on the pad (they stretch to the lifting body, not lift).
  const legTop = by + 6;
  ctx.save();
  ctx.globalAlpha = 0.85;
  paintLeg(ctx, p, bx + 7, legTop, 18.6);
  paintLeg(ctx, p, bx - 6, legTop, 18.9);
  ctx.restore();
  paintLeg(ctx, p, bx + 4, legTop + 1, 19.2);
  paintLeg(ctx, p, bx - 8.5, legTop + 1, 19.4);

  // The whole upper body (body + cape + head + dressing) is drawn under a
  // squash/stretch transform + a slight forward lean, so the peck and hop read
  // with anticipation squash, airborne stretch, and the lean reach.
  ctx.save();
  ctx.translate(bx - pose.lean, by);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-bx, -by);

  // ── tail-feathers off the upper-right rear (behind the body mass) ──────────
  drawTailFeathers(ctx, p, bx + 12.4, by - 1.5, pose.tail, vol);

  // ── BODY — dark outline pass first, then mid, then light top (layered) ─────
  paintBody(ctx, bx, by, rgba(p.outline), 1.06, vol); // soft outline halo
  paintBody(ctx, bx, by, rgba(p.skinMid), 1.0, vol); // pink body mid tone
  // shaded underside crescent + lit top, clipped to the body
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(bx, by, BODY_RX * vol, BODY_RY * vol, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = rgba(p.skinShadow, 0.7);
  ctx.beginPath();
  ctx.ellipse(bx + 2, by + 5.5, 13, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.skinLight);
  ctx.beginPath();
  ctx.ellipse(bx - 2.4, by - 3.4, 9.6, 6.4, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── feather CAPE / strapped-on fake wings over the back (the disguise) ─────
  // a leather strap crossing the chest holds the cape on (reads as "costume")
  ctx.strokeStyle = rgba(p.featherDark);
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx - 9, by + 2.5);
  ctx.quadraticCurveTo(bx - 4, by + 6, bx + 3, by + 5.5);
  ctx.stroke();
  ctx.lineCap = "butt";

  // the cape sits as two fake wings over the upper back. When the idle FLAP is
  // active the wings beat up out past the body, so we clip only when at rest to
  // keep the flapping feathers readable.
  const flap = pose.wing;
  ctx.save();
  if (flap < 0.02) {
    ctx.beginPath();
    ctx.ellipse(bx, by - 0.5, (BODY_RX + 1.5) * vol, (BODY_RY + 1.0) * vol, 0, 0, Math.PI * 2);
    ctx.clip();
  }
  drawWing(ctx, p, bx + 3.5, by - 6.5, +1, 0.92, flap, vol); // far wing
  drawWing(ctx, p, bx - 3.0, by - 6.0, -1, 1.0, flap, vol); // near wing
  // a small upright feather collar where the cape meets the neck
  ctx.fillStyle = rgba(p.featherDark);
  ctx.beginPath();
  ctx.ellipse(bx - 7.5, by - 4.0, 4.4, 3.0, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.featherMid);
  ctx.beginPath();
  ctx.ellipse(bx - 7.8, by - 4.6, 3.6, 2.4, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // soft sheen / gloss sweeping the cape feathers
  if (p.featherSheen > 0.02) {
    ctx.fillStyle = rgba([255, 255, 255], 0.1 + 0.28 * p.featherSheen);
    ctx.beginPath();
    ctx.ellipse(bx - 3, by - 7.5, 7.0 * vol, 2.2, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // snow settled on the cape / back (winter) — BOLD over the feathers, not a
  // white-out. Cap widens with costume volume.
  if (p.capeSnowAmt > 0.001) {
    ctx.fillStyle = rgba([248, 252, 255], 0.92 * p.capeSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 1, by - 9.0, 9.2 * vol, 2.9, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.88 * p.capeSnowAmt);
    for (const [dx, dy] of [[-5, -9.6], [1, -10.2], [5, -9.2], [-1, -8.8]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.5 + p.costumeVolume * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the costume (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-7, -2], [-2, 2], [4, -3], [8, 0], [0, -4], [-4, -6], [6, 3],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── HEAD + beak-MASK over the pink snout (front-¾, lower-left) ──────────────
  // The peck dips the head; the hop slips the disguise. Both feed paintHead.
  paintHead(ctx, p, bx + HEAD_DX, by + HEAD_DY + pose.head, pose);

  // ── knit SCARF around the neck (winter) — over the disguise, BELOW the head so
  // the face stays clear. The pig + costume remain fully visible. (Extra funny.)
  if (p.scarfAmt > 0.001) {
    drawScarf(ctx, p, bx + HEAD_DX, by + HEAD_DY + pose.head, p.scarfAmt);
  }

  ctx.restore(); // end squash/stretch + lean transform
}

// the pig head: pink ears + a rounded pink head, then a YELLOW BEAK MASK
// clipped over the snout (pink snout edges still peeking past it), friendly
// eyes. `pose.peck` thrusts the beak + twitches the snout; `pose.hop` slips the
// mask askew for the failed-flight beat. Mirrors chicken beak.
function paintHead(ctx: CanvasRenderingContext2D, p: P, hx: number, hy: number, pose: Pose): void {
  // floppy triangular pink ears, behind/above the head
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(hx + side * 3.2 - 1, hy - 7.4);
    ctx.rotate(side * 0.5 - 0.25);
    ctx.fillStyle = rgba(p.outline);
    ctx.beginPath();
    ctx.moveTo(0, -0.4);
    ctx.lineTo(3.4, 1.2);
    ctx.lineTo(1.0, 5.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba(p.skinMid);
    ctx.beginPath();
    ctx.moveTo(0.2, 0.2);
    ctx.lineTo(2.8, 1.4);
    ctx.lineTo(1.1, 4.6);
    ctx.closePath();
    ctx.fill();
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
  ctx.rotate(0.16 + pose.head * 0.012); // tips down a touch as it pecks
  // outline
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, 0, 7.4, 6.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // head fill (pink)
  ctx.fillStyle = rgba(p.skinMid);
  ctx.beginPath();
  ctx.ellipse(0, 0, 6.6, 5.9, 0, 0, Math.PI * 2);
  ctx.fill();
  // cheek light (upper-left)
  ctx.fillStyle = rgba(p.skinLight, 0.9);
  ctx.beginPath();
  ctx.ellipse(-1.8, -1.8, 3.2, 2.6, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // eyes — small, friendly (peering out above the beak mask)
  ctx.fillStyle = rgba([245, 245, 240]);
  for (const ex of [-1.6, 1.8]) {
    ctx.beginPath();
    ctx.arc(ex, -1.8, 1.0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = rgba([22, 18, 20]);
  for (const ex of [-1.5, 1.9]) {
    ctx.beginPath();
    ctx.arc(ex, -1.6, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // pink snout edges peeking out from under the beak mask (so the gag reads).
  // The peck makes the snout twitch up a touch (clumsy).
  ctx.fillStyle = rgba(p.snout);
  ctx.beginPath();
  ctx.ellipse(-0.6, 3.6 - pose.peck * 0.5, 4.6, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── the BEAK MASK — a yellow bird-beak clipped over the snout ──────────────
  // Drawn in the head's local frame, hinged near the snout. p.maskTilt cocks it
  // a few degrees askew (autumn); the peck rocks it; during a failed hop the
  // disguise SLIPS (pose.hop) and the mask sags/tilts off-true.
  ctx.save();
  ctx.translate(-0.6, 2.6 + pose.hop * 0.8); // hinge near the top of the snout; slips down on hop
  ctx.rotate(p.maskTilt + pose.peck * 0.12 + pose.hop * 0.5); // peck rock + hop slip
  // an upper + lower beak meeting at a point toward the lower-left
  // upper beak (dark base then yellow)
  ctx.fillStyle = rgba(p.beakMaskDark);
  ctx.beginPath();
  ctx.moveTo(-5.6, 1.0); // tip (lower-left)
  ctx.quadraticCurveTo(0.5, -2.4, 4.2, 0.2); // top edge sweeping to the cheek
  ctx.quadraticCurveTo(1.0, 1.6, -1.0, 1.8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(p.beakMask);
  ctx.beginPath();
  ctx.moveTo(-5.0, 0.9);
  ctx.quadraticCurveTo(0.4, -1.9, 3.6, 0.3);
  ctx.quadraticCurveTo(0.6, 1.3, -1.0, 1.5);
  ctx.closePath();
  ctx.fill();
  // lower beak (slightly smaller, below the seam) — opens a touch as it pecks
  const gap = pose.peck * 1.2;
  ctx.save();
  ctx.translate(0, gap);
  ctx.fillStyle = rgba(p.beakMaskDark);
  ctx.beginPath();
  ctx.moveTo(-5.2, 1.4);
  ctx.quadraticCurveTo(-0.4, 3.6, 3.0, 2.4);
  ctx.quadraticCurveTo(-0.6, 2.3, -5.2, 1.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(p.beakMask);
  ctx.beginPath();
  ctx.moveTo(-4.6, 1.5);
  ctx.quadraticCurveTo(-0.4, 3.1, 2.4, 2.1);
  ctx.quadraticCurveTo(-0.6, 2.1, -4.6, 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // top light rim on the upper beak (light upper-left)
  ctx.fillStyle = rgba([255, 245, 210], 0.6);
  ctx.beginPath();
  ctx.moveTo(-3.8, 0.5);
  ctx.quadraticCurveTo(0.2, -1.3, 2.8, -0.1);
  ctx.lineTo(2.4, 0.4);
  ctx.quadraticCurveTo(0.0, -0.6, -3.6, 0.9);
  ctx.closePath();
  ctx.fill();
  // beak seam (between upper & lower)
  ctx.strokeStyle = rgba(p.beakMaskDark, 0.9);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-5.0, 1.3);
  ctx.quadraticCurveTo(-0.4, 2.6, 3.0, 1.4);
  ctx.stroke();
  // a tiny strap dot where the mask clips behind the cheek
  ctx.fillStyle = rgba(p.featherDark, 0.8);
  ctx.beginPath();
  ctx.arc(4.0, 0.6, 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore(); // end beak mask

  ctx.restore(); // end head local frame
}

// a knit scarf wound around the pig's neck (winter dressing, over the disguise).
// `amt` fades it in/out across the autumn→winter transition.
function drawScarf(ctx: CanvasRenderingContext2D, _p: P, hx: number, hy: number, amt: number): void {
  ctx.save();
  ctx.globalAlpha = clamp01(amt);
  // the wrap around the neck (a fat band just under the head)
  ctx.lineCap = "round";
  ctx.strokeStyle = rgba(SCARF_DARK);
  ctx.lineWidth = 5.2;
  ctx.beginPath();
  ctx.moveTo(hx - 4.5, hy + 4.6);
  ctx.quadraticCurveTo(hx + 1.5, hy + 6.6, hx + 6.0, hy + 4.0);
  ctx.stroke();
  ctx.strokeStyle = rgba(SCARF);
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.moveTo(hx - 4.5, hy + 4.4);
  ctx.quadraticCurveTo(hx + 1.5, hy + 6.2, hx + 6.0, hy + 3.8);
  ctx.stroke();
  // a hanging tail of the scarf dropping off the near side
  ctx.strokeStyle = rgba(SCARF_DARK);
  ctx.lineWidth = 4.0;
  ctx.beginPath();
  ctx.moveTo(hx + 4.5, hy + 4.4);
  ctx.quadraticCurveTo(hx + 6.5, hy + 8.5, hx + 5.2, hy + 11.5);
  ctx.stroke();
  ctx.strokeStyle = rgba(SCARF);
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(hx + 4.5, hy + 4.4);
  ctx.quadraticCurveTo(hx + 6.5, hy + 8.5, hx + 5.2, hy + 11.5);
  ctx.stroke();
  // cream STRIPES across the wrap band (candy-stripe knit, distinct accessory)
  ctx.strokeStyle = rgba(SCARF_STRIPE);
  ctx.lineWidth = 1.3;
  for (let i = -3; i <= 5; i += 2) {
    ctx.beginPath();
    ctx.moveTo(hx + i, hy + 3.4);
    ctx.lineTo(hx + i + 0.5, hy + 6.2);
    ctx.stroke();
  }
  // cream stripes down the hanging tail too
  for (const ty of [6.4, 9.0]) {
    ctx.beginPath();
    ctx.moveTo(hx + 5.0, hy + ty);
    ctx.lineTo(hx + 6.0, hy + ty + 0.4);
    ctx.stroke();
  }
  // little dark knit-row ticks between the stripes for texture
  ctx.strokeStyle = rgba(SCARF_DARK, 0.8);
  ctx.lineWidth = 0.6;
  for (let i = -2; i <= 4; i += 2) {
    ctx.beginPath();
    ctx.moveTo(hx + i, hy + 3.6);
    ctx.lineTo(hx + i + 0.5, hy + 6.0);
    ctx.stroke();
  }
  // a couple of fringe strands at the scarf tail's end
  ctx.lineCap = "butt";
  ctx.strokeStyle = rgba(SCARF_DARK);
  ctx.lineWidth = 0.9;
  for (const fx of [-0.8, 0, 0.8]) {
    ctx.beginPath();
    ctx.moveTo(hx + 5.2 + fx, hy + 11.4);
    ctx.lineTo(hx + 5.0 + fx, hy + 13.2);
    ctx.stroke();
  }
  ctx.restore();
}

// breath-fog puff at the snout (winter). Drawn OUTSIDE the squash transform so
// it reads as air, not body. A faint static base puff + an exhale swell driven
// by the peck (it huffs as it tries to peck).
function drawBreathFog(ctx: CanvasRenderingContext2D, hx: number, hy: number, amt: number, swell: number): void {
  if (amt <= 0.001) return;
  const reach = 5.4 + swell * 3.2;
  ctx.fillStyle = rgba([235, 244, 255], (0.32 + 0.28 * swell) * amt);
  ctx.beginPath();
  ctx.ellipse(hx - 2.0 - reach, hy + 4.2, 2.8 + swell * 2.0, 1.9 + swell * 1.4, 0.2, 0, Math.PI * 2);
  ctx.fill();
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
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    paintPad(ctx, p);
    paintPig(ctx, p, pose);
    // breath-fog at the snout (winter) — drawn over the pig, swells with the
    // peck huff. Head position tracks the pose (lift / bob / peck dip).
    const hx = BODY_CX + HEAD_DX;
    const hy = BODY_CY - pose.lift + pose.bob + HEAD_DY + pose.head;
    drawBreathFog(ctx, hx - pose.lean, hy, p.breathFogAmt, pose.peck);
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
// EXACTLY (drawn at REST, matching the idle hand-off). The costume VOLUME leads
// (the disguise fluffs early); snow / frost / breath-fog / scarf LAG (settle
// late).
function makeTransition(fromIdx: 0 | 1 | 2) {
  const from = SEASON_NAMES[fromIdx];
  const to = SEASON_NAMES[fromIdx + 1];
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const p = clamp01(safeNum(pp));
    const kBase = smoother(p);
    const kVol = biasedEase(p, 0.62); // costume volume LEADS
    const kSnow = biasedEase(p, 1.7); // snow / frost / fog / scarf LAG

    const a = SP[from];
    const b = SP[to];
    const blended: P = lerpP(a, b, kBase);
    blended.costumeVolume = lerp(a.costumeVolume, b.costumeVolume, kVol);
    blended.capeSnowAmt = lerp(a.capeSnowAmt, b.capeSnowAmt, kSnow);
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

      // Loose feather fluff motes lifting off the thickening costume — reads the
      // disguise visibly fluffing/growing. Present in EVERY morph.
      const fluff = trans * (0.4 + 0.6 * Math.max(0, b.costumeVolume - a.costumeVolume + 0.4));
      if (fluff > 0.01) {
        ctx.fillStyle = rgba(b.featherLight, 0.5 * fluff);
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

      // Snow settling onto the cape during autumn→winter (target gains snow).
      const snowGain = Math.max(0, b.capeSnowAmt - a.capeSnowAmt);
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
        const hx = bx + HEAD_DX;
        const hy = by + HEAD_DY;
        ctx.fillStyle = rgba([235, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(hx - (4 + trans * 3), hy + 4.2, 2.6 + trans * 1.8, 1.8 + trans * 1.2, 0.2, 0, Math.PI * 2);
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
