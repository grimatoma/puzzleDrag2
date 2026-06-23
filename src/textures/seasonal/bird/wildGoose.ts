// Production seasonal art for the WILD GOOSE bird tile (`tile_bird_wild_goose`)
// — rewritten to the approved BOLD & FUN direction, mirroring the herd-sheep
// reference architecture exactly. A single parameterized `paint(ctx, p, pose)`
// + four `P` presets + lerped transitions, pushed so the seasons read at a
// glance and the idle is a real, fun ACTION rather than a subtle breath.
//
// SUBJECT: always the SAME wild goose (Canada-goose feel) — a dark head/neck, a
// pale chinstrap/cheek patch, a brown-grey barred body, webbed feet, on a pad,
// front-¾ turned toward the lower-left. PALETTE LOCK: markings + silhouette are
// CONSTANT all four seasons (the signature dark neck + cheek patch never moves);
// seasons change only the light/colour wash, the plumage VOLUME (sleek spring →
// fluffed winter), snow/frost/leaves, and light props. Never morphs into another
// animal.
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~0.95s): a NECK-DIP PECK — the neck dips the head ~12–16px
//     down toward the pad then arcs back up ALERT, with a small body squash and a
//     tail flick.
//   • RARE  ~18s (win ~1.2s, phase +3s): a HONK + WING-SPREAD / take-off feint —
//     the neck stretches UP and forward (~14–18px), the wings spread as if about
//     to fly, then fold back and settle. Anticipation → spread → settle. May
//     exit the box at the apex (fine).
// Both gestures return to REST with zero value AND zero velocity at the window
// edges (raised-cosine windows), so `anim(…, t)` is seamless and `anim(…, 0)`
// (and `draw`) sit exactly at rest.
//
// Origin-centered in the −24..+24 design box, light from upper-left. Never
// throws; clamps every scalar; save/restore + globalAlpha reset in `finally`.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Small math helpers ──────────────────────────────────────────────────────

type RGB = [number, number, number];

function clamp01(x: number): number {
  return x < 0 || !(x === x) ? 0 : x > 1 ? 1 : x; // NaN → 0
}

// coerce any non-finite scalar to a safe fallback (never let NaN reach canvas)
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

// alias kept for parity with the reference helpers (rgb already supports alpha)
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

// Anticipation→action shape for the PECK / HONK: a brief wind-up (negative)
// before the main move, then a clean arc and settle. q∈[0,1]. Returns a factor
// in roughly −0.18..+1 (negative = wind-up, positive = the main reach).
function reachShape(q: number): number {
  if (q <= 0 || q >= 1) return 0;
  const antiEnd = 0.24; // first slice = wind-up / anticipation
  if (q < antiEnd) {
    const a = q / antiEnd;
    return -0.18 * (0.5 - 0.5 * Math.cos(a * Math.PI));
  }
  const a = (q - antiEnd) / (1 - antiEnd);
  return Math.sin(a * Math.PI);
}

// ── The idle POSE (carries all action state into paint) ──────────────────────

interface Pose {
  bob: number; // whole-body vertical bob (design px, + = down)
  lean: number; // body lean toward the head (design px sideways, − = forward/left)
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  neckDip: number; // head/neck DOWN toward the pad (design px, + = down) — the peck
  neckRise: number; // head/neck UP + forward (design px, + = up reach) — the honk
  peck: number; // 0..1 bill-open / alert head-turn amount
  wing: number; // 0..1 wing-spread amount (0 folded → 1 spread for the honk feint)
  tail: number; // signed tail flick (design px)
}

const REST: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, neckDip: 0, neckRise: 0, peck: 0, wing: 0, tail: 0 };

// Build a pose from the wall clock: a common NECK-DIP PECK every ~6s and a rare
// HONK + WING-SPREAD every ~18s. Returns to REST (all zeros / unit scales) at
// every window edge.
function poseFromClock(t: number): Pose {
  const pose: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, neckDip: 0, neckRise: 0, peck: 0, wing: 0, tail: 0 };
  const tt = safeNum(t, 0);

  // COMMON ~6s: NECK-DIP PECK (win ~0.95s). The neck dips the head ~12–16px down
  // toward the pad then arcs back up ALERT, small body squash + tail flick.
  // Built from raised-cosine windows → seamless. Phase 3.0 opens the window at
  // t≈3.0 (well clear of t=0, so anim(0) sits exactly at REST).
  const cq = actionQ(tt, 6, 0.95, 3.0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window
    const r = reachShape(cq); // −0.18..+1 (wind-up then dip-and-recover)
    // head dips down (~14px at the peak), then snaps back up alert
    pose.neckDip = Math.max(0, r) * 15;
    pose.peck = env; // bill opens / alert turn through the dip
    // body squashes down a touch as the neck drives down, recovers on the way up
    pose.squashY = 1 - env * 0.07;
    pose.squashX = 1 + env * 0.05;
    pose.bob = env * 1.2; // tiny settle into the pad
    pose.tail = Math.sin(cq * Math.PI * 4) * env * 3.0; // a couple of tail flicks
  }

  // RARE ~18s: HONK + WING-SPREAD / take-off feint (win ~1.2s, phase +3s). The
  // neck stretches UP + forward (~16px), the wings spread as if about to fly,
  // then fold back and settle. May exit the box at the apex.
  const hq = actionQ(tt, 18, 1.2, 4.0);
  if (hq >= 0) {
    const env = bump(hq);
    const r = reachShape(hq); // −0.18..+1 (crouch then reach up)
    pose.neckRise = Math.max(0, r) * 17; // up to ~17px taller/forward reach
    pose.wing = env; // wings spread through the gesture
    if (r < 0) {
      // anticipation: a brief crouch/squash before the lift
      const c = -r; // 0..0.18
      pose.squashY = 1 - c * 0.8;
      pose.squashX = 1 + c * 0.5;
      pose.bob += c * 4; // settle down before the surge
    } else {
      // surge: stretch tall as it rises for the take-off feint
      pose.squashY = 1 + r * 0.1;
      pose.squashX = 1 - r * 0.06;
      pose.bob -= r * 2.5; // whole body lifts a touch with the feint
    }
    pose.lean -= env * 2.4; // lean forward toward the lift
    pose.tail += Math.sin(hq * Math.PI) * 2.0; // tail flags up during the feint
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────
// PALETTE LOCK: bodyLight/bodyMid/bodyShade stay grey-brown; back/barring stay
// the darker brown-grey; head/neck stay dark; cheek/breast stay pale buff; bill
// + legs stay muted across all seasons (only the light wash shifts their read).
// Seasonal change = light/colour wash + plumage VOLUME + snow/frost/leaves +
// light props ONLY.

interface P {
  bodyLight: RGB; // lit grey-brown plumage (upper-left face)
  bodyMid: RGB; // body grey-brown in ambient
  bodyShade: RGB; // shaded under-belly / far side
  back: RGB; // darker brown-grey back / wing
  barring: RGB; // horizontal feather barring lines (locked dark)
  headNeck: RGB; // dark brown-grey head + neck (locked)
  headNeckDark: RGB; // shaded head/neck
  cheek: RGB; // pale chin/cheek patch + buff breast (locked pale)
  bill: RGB; // stout bill (locked muted)
  billDark: RGB; // shaded bill / nostril
  feet: RGB; // muted-orange legs/feet (locked)
  feetDark: RGB; // shaded leg
  eye: RGB; // eye dot
  padGrass: RGB; // top of the grass pad
  padDark: RGB; // shaded pad underside / soil
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  plumageVolume: number; // 0..1 BOLD plumage puff (sleek spring → fluffed winter)
  gloss: number; // 0..1 feather gloss/sheen (peak in summer, dulled in autumn)
  frostAmt: number; // 0..1 frost sparkle on the upward feathers
  backSnowAmt: number; // 0..1 snow settled on the back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad (autumn)
  breathFogAmt: number; // 0..1 breath-fog puff at the bill (winter)
  scarfAmt: number; // 0..1 a little winter SCARF (tweened alpha)
  scarfColor: RGB; // scarf colour (locked red, fades in via alpha)
}

// Four BOLD season presets. The goose stays the SAME barred grey-brown,
// dark-necked, pale-cheeked wild goose; only volume + pad + light + dressing
// differ — pushed HARD so each season reads at a glance.
const SP: Record<SeasonName, P> = {
  // Spring — sleek plumage; bright lime dewy pad + a blossom; cool-bright light.
  Spring: {
    bodyLight: [192, 176, 144],
    bodyMid: [168, 152, 120],
    bodyShade: [128, 114, 88],
    back: [120, 104, 76],
    barring: [96, 82, 58],
    headNeck: [60, 56, 48],
    headNeckDark: [40, 36, 30],
    cheek: [232, 224, 204], // pale chinstrap/cheek
    bill: [60, 56, 50],
    billDark: [38, 34, 30],
    feet: [150, 96, 52],
    feetDark: [108, 66, 34],
    eye: [22, 18, 16],
    padGrass: [128, 214, 82], // vivid fresh lime
    padDark: [72, 138, 52],
    outline: [54, 48, 40],
    lightWash: [200, 240, 255], // cool-bright
    lightWashAmt: 0.2,
    plumageVolume: 0.1, // BOLD: clearly sleek spring plumage
    gloss: 0.35,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.9,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  // Summer — full glossy plumage PEAK; saturated mid-green pad; bright warm light.
  Summer: {
    bodyLight: [198, 182, 148],
    bodyMid: [172, 156, 122],
    bodyShade: [130, 116, 88],
    back: [122, 106, 76],
    barring: [98, 84, 58],
    headNeck: [58, 54, 46],
    headNeckDark: [38, 34, 28],
    cheek: [236, 228, 206],
    bill: [62, 58, 50],
    billDark: [40, 36, 30],
    feet: [156, 100, 54],
    feetDark: [112, 68, 34],
    eye: [20, 16, 14],
    padGrass: [80, 188, 60], // saturated mid-green
    padDark: [44, 120, 40],
    outline: [52, 46, 38],
    lightWash: [255, 240, 178], // bright warm
    lightWashAmt: 0.22,
    plumageVolume: 0.45, // full normal plumage
    gloss: 0.85, // BOLD glossy peak
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  // Autumn — warm-tinted plumage in low amber light; olive-tan pad; a fallen
  // leaf; gloss dulled (migratory mood).
  Autumn: {
    bodyLight: [200, 176, 134],
    bodyMid: [176, 150, 110],
    bodyShade: [132, 110, 78],
    back: [124, 100, 68],
    barring: [100, 78, 50],
    headNeck: [60, 52, 42],
    headNeckDark: [40, 34, 26],
    cheek: [230, 214, 182],
    bill: [62, 54, 44],
    billDark: [40, 34, 26],
    feet: [152, 94, 48],
    feetDark: [108, 64, 30],
    eye: [24, 18, 14],
    padGrass: [172, 146, 70], // olive-tan browning
    padDark: [114, 88, 44],
    outline: [56, 46, 36],
    lightWash: [255, 184, 96], // low amber, BOLD
    lightWashAmt: 0.32,
    plumageVolume: 0.66, // thickening for migration
    gloss: 0.2, // dulled gloss
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.92,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  // Winter — FLUFFED puffy plumage + snow on the back + a little SCARF + breath
  // fog; frost; cool blue-grey light. Body stays clearly grey-brown; head/neck
  // stay dark; cheek/breast stay pale — still the SAME wild goose.
  Winter: {
    bodyLight: [186, 178, 158],
    bodyMid: [160, 152, 132],
    bodyShade: [116, 114, 106], // cool grey shadow so plumage reads in snow
    back: [110, 102, 86],
    barring: [88, 82, 66],
    headNeck: [56, 54, 50], // stays dark
    headNeckDark: [38, 36, 34],
    cheek: [224, 220, 210], // stays pale
    bill: [62, 60, 54],
    billDark: [40, 38, 34],
    feet: [148, 100, 60],
    feetDark: [104, 66, 38],
    eye: [24, 22, 20],
    padGrass: [220, 234, 250], // snow on the pad
    padDark: [142, 164, 192],
    outline: [58, 56, 56],
    lightWash: [190, 214, 252], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    plumageVolume: 1, // BOLD: fluffed puffy plumage
    gloss: 0.12,
    frostAmt: 0.8,
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
    bodyLight: lerpRGB(a.bodyLight, b.bodyLight, t),
    bodyMid: lerpRGB(a.bodyMid, b.bodyMid, t),
    bodyShade: lerpRGB(a.bodyShade, b.bodyShade, t),
    back: lerpRGB(a.back, b.back, t),
    barring: lerpRGB(a.barring, b.barring, t),
    headNeck: lerpRGB(a.headNeck, b.headNeck, t),
    headNeckDark: lerpRGB(a.headNeckDark, b.headNeckDark, t),
    cheek: lerpRGB(a.cheek, b.cheek, t),
    bill: lerpRGB(a.bill, b.bill, t),
    billDark: lerpRGB(a.billDark, b.billDark, t),
    feet: lerpRGB(a.feet, b.feet, t),
    feetDark: lerpRGB(a.feetDark, b.feetDark, t),
    eye: lerpRGB(a.eye, b.eye, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
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

// ── Wild-goose geometry constants (the SAME silhouette every season) ─────────
// Front-¾ view, turned ~15–20° toward lower-left. Body is a HORIZONTAL EGG
// (~22 wide × ~18 tall), seated a bit low on the pad, the tail tapering to the
// lower-right. A prominent S-CURVED LONG NECK rises from the front/upper of the
// body to a small dark head with a pale cheek patch and a stout bill pointing
// lower-left. This long dark neck + head + cheek patch is the goose's signature.

const BODY_CX = 2.5; // body centre x (turned right, head reaches left)
const BODY_CY = 7.5; // body centre y (seated a bit low on the pad)
const BODY_RX = 11; // body half-width (≈22 wide)
const BODY_RY = 9; // body half-height (≈18 tall — a plump egg body)
const TAIL_X = 13.5; // tail tip (tapers to the lower-right)
const TAIL_Y = 5.5;

// Neck path control points (rest). The pose's neckDip/neckRise/lean nudge the
// upper control points + head so the neck bends, dips, and stretches.
const NECK_BASE_X = -3.5; // neck root, front/upper of the body
const NECK_BASE_Y = 1.5;
const NECK_LOW_X = -7.5; // lower S-bend bulges forward (left)
const NECK_LOW_Y = -5;
const NECK_MID_X = -6; // upper S-bend tucks back slightly
const NECK_MID_Y = -14;
const HEAD_X = -8.5; // head high near the top of the tile
const HEAD_Y = -19.5;
const HEAD_R = 4.2;
const BILL_TIP_X = -15.5; // stout bill tip, pointing lower-left
const BILL_TIP_Y = -17.5;

// ── The current head transform from a pose (shared by paint passes) ───────────
// Returns the head centre + bill tip + neck upper-control offsets after the
// peck (dip down) / honk (rise up + forward) gestures are applied.
interface NeckGeom {
  headX: number;
  headY: number;
  billX: number;
  billY: number;
  midX: number;
  midY: number;
  baseDX: number; // base x shift from lean
}

function neckGeom(pose: Pose): NeckGeom {
  // The peck drives the head DOWN toward the pad (and the upper neck bows down);
  // the honk drives it UP + forward (left). lean nudges everything sideways.
  const dipY = pose.neckDip; // + = down
  const riseY = pose.neckRise; // + = up reach
  const dx = pose.lean - pose.neckRise * 0.35; // forward reach on the honk
  return {
    headX: HEAD_X + dx,
    headY: HEAD_Y + dipY - riseY,
    billX: BILL_TIP_X + dx - pose.neckRise * 0.15,
    billY: BILL_TIP_Y + dipY * 1.1 - riseY,
    midX: NECK_MID_X + dx * 0.6,
    midY: NECK_MID_Y + dipY * 0.45 - riseY * 0.55,
    baseDX: pose.lean * 0.4,
  };
}

/** Trace the horizontal body egg into the current path. */
function bodyPath(ctx: CanvasRenderingContext2D, bob: number): void {
  ctx.beginPath();
  ctx.ellipse(BODY_CX, BODY_CY + bob, BODY_RX, BODY_RY, -0.08, 0, Math.PI * 2);
}

/** Stroke the long S-curved neck as a tapering band, posed by the geometry.
 *  `dx`/`dy` nudge every control point (for the under-shade / highlight passes). */
function neckStroke(
  ctx: CanvasRenderingContext2D,
  bob: number,
  g: NeckGeom,
  width: number,
  color: string,
  dx = 0,
  dy = 0,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(NECK_BASE_X + g.baseDX + dx, NECK_BASE_Y + dy + bob);
  ctx.bezierCurveTo(
    NECK_LOW_X + g.baseDX * 0.7 + dx, NECK_LOW_Y + dy + bob,
    g.midX + dx, g.midY + dy + bob,
    g.headX + dx, g.headY + dy + bob,
  );
  ctx.stroke();
}

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat grass pad the goose stands on, plus its seasonal dressing
function paintPad(ctx: CanvasRenderingContext2D, p: P, bob: number): void {
  // shaded underside of the pad
  ctx.fillStyle = rgba(p.padDark, 0.4);
  ctx.beginPath();
  ctx.ellipse(3, 21.5, 16, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = rgb(p.padDark);
  ctx.beginPath();
  ctx.ellipse(0, 20.4, 18, 5.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.padGrass);
  ctx.beginPath();
  ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // tufted top edge — little blades around the upper rim
  ctx.strokeStyle = rgb(p.padDark);
  ctx.lineWidth = 1.1;
  ctx.lineCap = "round";
  for (let i = -7; i <= 7; i++) {
    const tx = i * 2.4;
    const ty = 19 - Math.sqrt(Math.max(0, 1 - (tx / 18) ** 2)) * 5.2;
    ctx.beginPath();
    ctx.moveTo(tx, ty + 0.4);
    ctx.lineTo(tx - 0.8, ty - 2.4);
    ctx.stroke();
  }
  // grass-top highlight glints
  ctx.strokeStyle = rgba([255, 255, 255], 0.18);
  ctx.lineWidth = 1;
  for (let i = -5; i <= 5; i += 2) {
    const tx = i * 2.6 - 2;
    ctx.beginPath();
    ctx.moveTo(tx, 18.4);
    ctx.lineTo(tx - 0.6, 16.6);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // pad snow blanket (winter) — BOLD coverage
  if (p.padSnowAmt > 0.01) {
    ctx.fillStyle = rgba([244, 250, 255], 0.92 * p.padSnowAmt);
    ctx.beginPath();
    ctx.ellipse(0, 18.4, 17.4, 4.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([210, 226, 244], 0.5 * p.padSnowAmt);
    ctx.beginPath();
    ctx.ellipse(2, 20, 16, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.padSnowAmt);
    for (const [sx, sy] of [[-9, 17.6], [5, 19], [11, 17.4], [-3, 20]] as const) {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // BOLD blossoms (spring)
  if (p.blossomAmt > 0.01) {
    const a = p.blossomAmt;
    const spots: Array<[number, number]> = [[-13, 18.5], [12, 17.8], [-4, 21]];
    for (const [bx, by] of spots) {
      ctx.fillStyle = rgba([255, 248, 252], 0.95 * a);
      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(bx + Math.cos(ang) * 1.5, by + Math.sin(ang) * 1.0, 1.1, 0.8, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = rgba([255, 214, 90], a);
      ctx.beginPath();
      ctx.arc(bx, by, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // a BOLD fallen leaf (autumn)
  if (p.fallenLeafAmt > 0.01) {
    const a = p.fallenLeafAmt;
    const leaves: Array<[number, number, number, RGB]> = [
      [-12, 19.6, -0.5, [214, 132, 40]],
      [12, 18.6, 0.7, [186, 80, 34]],
      [1, 21, 0.2, [170, 76, 38]],
    ];
    for (const [lx, ly, rot, col] of leaves) {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.fillStyle = rgba(col, a);
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.2, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba([110, 58, 24], a);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.lineTo(3, 0);
      ctx.stroke();
      ctx.restore();
    }
  }

  // contact shadow of the goose on the pad (lower-right)
  ctx.fillStyle = rgba(p.outline, 0.26);
  ctx.beginPath();
  ctx.ellipse(3, 17.6 + bob * 0.5, 12, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

// muted-orange legs/feet on the pad (drawn before the body so it overlaps)
function paintFeet(ctx: CanvasRenderingContext2D, p: P, bob: number): void {
  const legTopY = 13.5 + bob; // up inside the body underside
  const footY = 17.6 + bob * 0.4; // webbed feet rest on the pad top
  ctx.lineCap = "round";
  ctx.strokeStyle = rgb(p.feetDark);
  ctx.lineWidth = 2.8;
  for (const fx of [-3, 4.5]) {
    ctx.beginPath();
    ctx.moveTo(fx, legTopY);
    ctx.lineTo(fx + 0.6, footY);
    ctx.stroke();
  }
  ctx.fillStyle = rgb(p.feet);
  for (const fx of [-3, 4.5]) {
    ctx.beginPath();
    ctx.moveTo(fx + 0.6, footY - 1.4);
    ctx.lineTo(fx - 2.4, footY + 1.6);
    ctx.lineTo(fx + 3.4, footY + 1.6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = rgb(p.feet);
  ctx.lineWidth = 2;
  for (const fx of [-3, 4.5]) {
    ctx.beginPath();
    ctx.moveTo(fx, legTopY);
    ctx.lineTo(fx + 0.6, footY - 0.5);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

// a spread wing fan behind the body (the take-off feint) — strength from pose.wing
function paintWing(ctx: CanvasRenderingContext2D, p: P, bob: number, side: -1 | 1, amt: number): void {
  if (amt <= 0.01) return;
  const baseX = BODY_CX + side * 2;
  const baseY = BODY_CY - 4 + bob;
  // wing sweeps up-and-out as it spreads
  const spread = 0.5 + amt; // open angle factor
  const reach = 9 + amt * 9;
  ctx.save();
  ctx.translate(baseX, baseY);
  // primaries: a few tapering feather blades
  for (let i = 0; i < 4; i++) {
    const f = i / 3;
    const ang = side * (-1.5 - spread * (0.5 + f * 0.7)); // fan outward/up
    const len = reach * (1 - f * 0.18);
    const tipX = Math.cos(ang) * len;
    const tipY = Math.sin(ang) * len - 2;
    ctx.fillStyle = rgb(i % 2 === 0 ? p.back : p.barring);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(tipX * 0.5 - side * 2, tipY * 0.5 - 2, tipX, tipY);
    ctx.quadraticCurveTo(tipX * 0.55 + side * 1.5, tipY * 0.55 + 1.5, side * 2, 1);
    ctx.closePath();
    ctx.fill();
  }
  // pale covert edge catching the light
  ctx.strokeStyle = rgba(p.bodyLight, 0.5 * amt);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(side * reach * 0.7, -reach * 0.5);
  ctx.stroke();
  ctx.restore();
}

// the whole goose, posed by `pose`
function paintGoose(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  const bob = pose.bob;
  const g = neckGeom(pose);

  // feet stay planted on the pad; legs/body bob a touch
  paintFeet(ctx, p, bob);

  // spread wings BEHIND the body (the honk feint) — far wing first
  paintWing(ctx, p, bob, 1, pose.wing);

  // The body (+ tail + barring) is drawn under a squash/stretch transform
  // centred on the body, so the peck/honk read with squash + stretch.
  ctx.save();
  ctx.translate(BODY_CX + pose.lean, BODY_CY + bob);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-(BODY_CX + pose.lean), -(BODY_CY + bob));
  ctx.translate(pose.lean, 0);

  // ── Tail wedge (tapering to the lower-right), drawn before the body fill ──
  ctx.fillStyle = rgb(p.back);
  ctx.beginPath();
  ctx.moveTo(BODY_CX + 8, BODY_CY - 4 + bob);
  ctx.lineTo(TAIL_X + 3 + pose.tail, TAIL_Y + bob + Math.abs(pose.tail) * 0.2);
  ctx.lineTo(BODY_CX + 7, BODY_CY + 3 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgb(p.outline);
  ctx.lineWidth = 1;
  ctx.stroke();

  // ── Body: outline pass then grey-brown fill ──────────────────────────────
  bodyPath(ctx, bob);
  ctx.save();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = rgb(p.outline);
  ctx.stroke();
  ctx.restore();

  bodyPath(ctx, bob);
  ctx.fillStyle = rgb(p.bodyMid);
  ctx.fill();

  // body shading + lit face + barring (clipped to the body)
  ctx.save();
  bodyPath(ctx, bob);
  ctx.clip();
  // darker back/wing across the upper-right
  ctx.fillStyle = rgba(p.back, 0.9);
  ctx.beginPath();
  ctx.ellipse(BODY_CX + 5, BODY_CY - 4 + bob, BODY_RX * 0.95, BODY_RY * 0.7, -0.18, 0, Math.PI * 2);
  ctx.fill();
  // far/under side shade (lower-right)
  ctx.fillStyle = rgba(p.bodyShade, 0.9);
  ctx.beginPath();
  ctx.ellipse(BODY_CX + 4, BODY_CY + 5 + bob, BODY_RX, BODY_RY * 0.7, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // paler buff breast on the lower-left (toward the viewer)
  ctx.fillStyle = rgba(p.cheek, 0.8);
  ctx.beginPath();
  ctx.ellipse(BODY_CX - 6, BODY_CY + 3 + bob, BODY_RX * 0.5, BODY_RY * 0.6, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // lit upper-left grey-brown face
  const bg = ctx.createLinearGradient(
    BODY_CX - BODY_RX, BODY_CY - BODY_RY + bob,
    BODY_CX + BODY_RX, BODY_CY + BODY_RY + bob,
  );
  bg.addColorStop(0, rgb(p.bodyLight));
  bg.addColorStop(0.5, rgb(p.bodyMid));
  bg.addColorStop(1, rgb(p.bodyShade));
  ctx.fillStyle = bg;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.ellipse(BODY_CX - 4, BODY_CY - 2 + bob, BODY_RX * 0.78, BODY_RY * 0.8, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // ── Horizontal feather BARRING (wild-goose marking — kept SUBTLE) ─────────
  ctx.strokeStyle = rgba(p.barring, 0.42);
  ctx.lineWidth = 0.9;
  [-3, -0.5, 2, 4.5].forEach((dy, row) => {
    ctx.beginPath();
    const yy = BODY_CY + dy + bob;
    ctx.moveTo(BODY_CX - BODY_RX + 2, yy + 0.4);
    ctx.quadraticCurveTo(BODY_CX - 3, yy - 0.8 + row * 0.12, BODY_CX + 2, yy);
    ctx.quadraticCurveTo(BODY_CX + 7, yy + 0.8, BODY_CX + BODY_RX - 2, yy - 0.4);
    ctx.stroke();
  });
  // a couple light feather edges catching the upper-left light
  ctx.strokeStyle = rgba(p.bodyLight, 0.4);
  ctx.lineWidth = 0.8;
  for (const dy of [-2.5, 0.5]) {
    ctx.beginPath();
    const yy = BODY_CY + dy + bob;
    ctx.moveTo(BODY_CX - BODY_RX + 3, yy - 0.4);
    ctx.quadraticCurveTo(BODY_CX - 2, yy - 1.1, BODY_CX + 4, yy - 0.6);
    ctx.stroke();
  }

  // soft wing crease arc (folded-wing seam) on the side
  ctx.strokeStyle = rgba(p.barring, 0.6);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(BODY_CX - 5, BODY_CY - 2.5 + bob);
  ctx.quadraticCurveTo(BODY_CX + 5, BODY_CY - 1.5 + bob, BODY_CX + 9.5, BODY_CY + 3 + bob);
  ctx.stroke();

  // glossy sheen on the lit back (peak in summer, dulled in autumn/winter)
  if (p.gloss > 0.02) {
    ctx.fillStyle = rgba([255, 250, 236], 0.28 * p.gloss);
    ctx.beginPath();
    ctx.ellipse(BODY_CX - 3, BODY_CY - 4 + bob, 7, 4.2, -0.14, 0, Math.PI * 2);
    ctx.fill();
  }

  // winter frost dusting on the upward body
  if (p.frostAmt > 0.02) {
    ctx.fillStyle = rgba([214, 232, 250], 0.2 * p.frostAmt);
    ctx.beginPath();
    ctx.ellipse(BODY_CX - 2, BODY_CY - 5 + bob, BODY_RX * 0.85, BODY_RY * 0.45, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([240, 248, 255], 0.65 * p.frostAmt);
    for (const [sx, sy] of [[-6, -3], [-1, -5], [4, -4], [8, -1], [-3, -1], [2, -2]] as const) {
      ctx.beginPath();
      ctx.arc(BODY_CX + sx, BODY_CY + sy + bob, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore(); // end body clip

  // ── Winter PLUMAGE FLUFF: soft feather fringe around the body silhouette ──
  // BOLD puffy plumage volume — the silhouette/outline itself is unchanged; the
  // fringe length scales with plumageVolume so winter reads visibly fluffed.
  if (p.plumageVolume > 0.3) {
    const fluff = (p.plumageVolume - 0.3) / 0.7; // 0 at sleek → 1 at full winter
    ctx.save();
    ctx.strokeStyle = rgba(p.bodyLight, 0.45 * fluff);
    ctx.lineWidth = 1.2;
    const n = 22;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const ax = BODY_CX + Math.cos(ang) * BODY_RX;
      const ay = BODY_CY + bob + Math.sin(ang) * BODY_RY;
      const reach = (1.4 + 1.6 * fluff) + 1.0 * Math.sin(i * 1.7);
      const ox = ax + Math.cos(ang) * reach;
      const oy = ay + Math.sin(ang) * reach;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ox, oy);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Snow cap resting on the back (winter) ────────────────────────────────
  if (p.backSnowAmt > 0.02) {
    const a = p.backSnowAmt;
    ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
    ctx.beginPath();
    ctx.moveTo(BODY_CX - 7, BODY_CY - 4 + bob);
    ctx.quadraticCurveTo(BODY_CX - 1, BODY_CY - 8 + bob, BODY_CX + 5, BODY_CY - 6.5 + bob);
    ctx.quadraticCurveTo(BODY_CX + 10, BODY_CY - 5 + bob, BODY_CX + 11, BODY_CY - 1.5 + bob);
    ctx.quadraticCurveTo(BODY_CX + 5, BODY_CY - 3 + bob, BODY_CX + 1, BODY_CY - 2 + bob);
    ctx.quadraticCurveTo(BODY_CX - 3.5, BODY_CY - 1.5 + bob, BODY_CX - 7, BODY_CY - 4 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba([210, 226, 244], 0.5 * a);
    ctx.beginPath();
    ctx.ellipse(BODY_CX - 1, BODY_CY - 4.5 + bob, 7, 1.6, -0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore(); // end body squash/stretch transform

  // near wing IN FRONT of the body during the spread feint
  paintWing(ctx, p, bob, -1, pose.wing);

  // ── Neck: dark outline pass then dark-feather fill (long S-curve, posed) ──
  neckStroke(ctx, bob, g, 8.0, rgb(p.outline)); // outline rim
  neckStroke(ctx, bob, g, 6.2, rgb(p.headNeck)); // dark neck column
  neckStroke(ctx, bob, g, 3.0, rgb(p.headNeckDark), 1, 1); // under-shade
  neckStroke(ctx, bob, g, 1.8, rgba([150, 142, 124], 0.5), -1, 0); // highlight

  // ── SCARF (winter) — a little knitted band low on the neck ───────────────
  if (p.scarfAmt > 0.01) {
    const sx = lerp(NECK_BASE_X, g.midX, 0.35) + 0.5;
    const sy = lerp(NECK_BASE_Y, g.midY, 0.35) + bob;
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // wrap band
    ctx.fillStyle = rgb(p.scarfColor);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 4.4, 2.6, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // darker underside for depth
    ctx.fillStyle = rgb([
      Math.max(0, p.scarfColor[0] - 50),
      Math.max(0, p.scarfColor[1] - 30),
      Math.max(0, p.scarfColor[2] - 30),
    ]);
    ctx.beginPath();
    ctx.ellipse(sx + 0.5, sy + 1.2, 4.0, 1.4, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // hanging tail of the scarf with a fringe
    ctx.fillStyle = rgb(p.scarfColor);
    ctx.beginPath();
    ctx.moveTo(sx - 2.4, sy + 1.4);
    ctx.lineTo(sx + 0.8, sy + 1.9);
    ctx.lineTo(sx + 0.0, sy + 7.0);
    ctx.lineTo(sx - 3.0, sy + 6.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgb(p.scarfColor);
    ctx.lineWidth = 0.9;
    ctx.lineCap = "round";
    for (const fx of [-2.6, -1.6, -0.6]) {
      ctx.beginPath();
      ctx.moveTo(sx + fx, sy + 6.6);
      ctx.lineTo(sx + fx - 0.2, sy + 8.0);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.restore();
  }

  // ── Head + dark crown + pale cheek patch + stout bill (over the neck) ─────
  const hx = g.headX;
  const hy = g.headY + bob;
  // head outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.arc(hx, hy, HEAD_R + 0.9, 0, Math.PI * 2);
  ctx.fill();
  // dark head
  ctx.fillStyle = rgb(p.headNeck);
  ctx.beginPath();
  ctx.arc(hx, hy, HEAD_R, 0, Math.PI * 2);
  ctx.fill();
  // head shading + small lit crown facet + the SIGNATURE pale cheek patch
  ctx.save();
  ctx.beginPath();
  ctx.arc(hx, hy, HEAD_R, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = rgb(p.headNeckDark);
  ctx.beginPath();
  ctx.ellipse(hx + 1.2, hy + 1.8, HEAD_R * 0.8, HEAD_R * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([130, 122, 104], 0.5);
  ctx.beginPath();
  ctx.ellipse(hx - 1.4, hy - 1.6, HEAD_R * 0.55, HEAD_R * 0.42, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // pale chin/cheek patch (the wild-goose ID mark) — lower-front of the face
  ctx.fillStyle = rgb(p.cheek);
  ctx.beginPath();
  ctx.ellipse(hx - 1.6, hy + 1.8, HEAD_R * 0.62, HEAD_R * 0.5, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // stout bill pointing lower-left (opens with the peck/honk)
  const btx = g.billX;
  const bty = g.billY + bob;
  const gape = pose.peck * 1.8 + pose.wing * 1.2; // bill opens during the peck / honk
  ctx.fillStyle = rgb(p.bill);
  ctx.beginPath();
  ctx.moveTo(hx - 2.0, hy - 1.4);
  ctx.quadraticCurveTo(btx + 2, bty - 1.6, btx, bty);
  ctx.lineTo(btx + 1.8, bty + 2.8 + gape);
  ctx.quadraticCurveTo(hx - 3.4, hy + 2.4 + gape * 0.5, hx - 2.0, hy - 1.4);
  ctx.closePath();
  ctx.fill();
  // bill shade (under) + nostril
  ctx.fillStyle = rgb(p.billDark);
  ctx.beginPath();
  ctx.moveTo(hx - 2.0, hy + 0.6);
  ctx.quadraticCurveTo(btx + 2, bty + 1.6 + gape, btx + 1.8, bty + 2.8 + gape);
  ctx.quadraticCurveTo(hx - 3.4, hy + 2.4 + gape * 0.5, hx - 2.0, hy + 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgb(p.billDark);
  ctx.beginPath();
  ctx.arc(hx - 5.2, hy - 0.4, 0.7, 0, Math.PI * 2);
  ctx.fill();
  // bill outline (top edge)
  ctx.strokeStyle = rgba(p.outline, 0.7);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(hx - 2.0, hy - 1.4);
  ctx.quadraticCurveTo(btx + 2, bty - 1.6, btx, bty);
  ctx.lineTo(btx + 1.8, bty + 2.8 + gape);
  ctx.stroke();

  // eye (over the dark head, at the pale cheek edge)
  ctx.fillStyle = rgb(p.eye);
  ctx.beginPath();
  ctx.arc(hx - 1.2, hy - 0.4, 1.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([255, 255, 255], 0.8);
  ctx.beginPath();
  ctx.arc(hx - 1.6, hy - 0.8, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // ── Breath-fog puff at the bill (winter) — drawn last so it reads as air ──
  // Static base puff + an exhale swell during the peck / honk.
  if (p.breathFogAmt > 0.01) {
    const extra = 0.5 * pose.peck + 0.7 * pose.wing;
    const reach = 3.4 + extra * 3.2;
    ctx.fillStyle = rgba([236, 244, 255], (0.34 + 0.3 * extra) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(btx - reach, bty + 0.6, 2.6 + extra * 2.0, 1.9 + extra * 1.4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], (0.22 + 0.22 * extra) * p.breathFogAmt);
    ctx.beginPath();
    ctx.arc(btx - reach - 1.4, bty + 1.0, 1.4 + extra * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// the overall colour-of-light wash, painted last over the whole tile
function paintLightWash(ctx: CanvasRenderingContext2D, p: P): void {
  if (p.lightWashAmt <= 0.001) return;
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  const lg = ctx.createRadialGradient(-10, -14, 2, -10, -14, 46);
  lg.addColorStop(0, rgba(p.lightWash, p.lightWashAmt));
  lg.addColorStop(1, rgba(p.lightWash, p.lightWashAmt * 0.25));
  ctx.fillStyle = lg;
  ctx.fillRect(-24, -24, 48, 48);
  ctx.restore();
}

// ── THE single paint ────────────────────────────────────────────────────────

function paint(ctx: CanvasRenderingContext2D, pIn: P, pose: Pose): void {
  const p = clampP(pIn);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "butt";
    paintPad(ctx, p, pose.bob);
    paintGoose(ctx, p, pose);
    paintLightWash(ctx, p);
  } finally {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }
}

// ── Per-season builders ─────────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], REST);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    paint(ctx, SP[season], poseFromClock(safeNum(t, 0)));
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
function makeTransition(fromIdx: 0 | 1 | 2): (ctx: CanvasRenderingContext2D, p: number) => void {
  const from = SEASON_NAMES[fromIdx];
  const to = SEASON_NAMES[fromIdx + 1];
  return (ctx, pp) => {
    const p = clamp01(safeNum(pp, 0));
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
      ctx.globalAlpha = 1;

      // Loose down motes lifting off the thickening plumage — reads the coat
      // visibly fluffing. Present in EVERY morph (deterministic in p).
      const fluff = trans * (0.4 + 0.6 * Math.max(0, b.plumageVolume - a.plumageVolume + 0.4));
      if (fluff > 0.01) {
        ctx.fillStyle = rgba([255, 255, 255], 0.45 * fluff);
        const rise = (1 - Math.cos(Math.PI * p)) * 2.2;
        for (const [mx, my, mr] of [[-6, -6, 1.0], [4, -8, 1.2], [9, -4, 0.9], [-1, -9, 1.0]] as const) {
          ctx.beginPath();
          ctx.arc(BODY_CX + mx, BODY_CY + my - rise, mr * (0.7 + 0.5 * trans), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Snow settling onto the back during autumn→winter (target gains snow).
      const snowGain = Math.max(0, b.backSnowAmt - a.backSnowAmt);
      if (snowGain > 0.01) {
        ctx.fillStyle = rgba([255, 255, 255], 0.8 * trans * snowGain);
        const land = smoother(p);
        for (const [fxx, fyy] of [[-6, -8], [-1, -9], [4, -7.5], [7, -6]] as const) {
          const fall = (1 - land) * 6;
          ctx.beginPath();
          ctx.arc(BODY_CX + fxx, BODY_CY + fyy - fall, 1.0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // A breath-fog puff appearing as the cold sets in (target gains fog).
      const fogGain = Math.max(0, b.breathFogAmt - a.breathFogAmt);
      if (fogGain > 0.01) {
        ctx.fillStyle = rgba([236, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(BILL_TIP_X - (3 + trans * 3), BILL_TIP_Y + 0.6, 2.4 + trans * 1.8, 1.8 + trans * 1.2, 0.2, 0, Math.PI * 2);
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
