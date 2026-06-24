// Production seasonal art for the HERD GOAT board tile (`tile_herd_goat`) —
// the approved bold direction. A single parameterized `paint(ctx, p, pose)` +
// four `P` presets + lerped transitions, pushed so the seasons read at a glance
// and the idle is a real, fun ACTION rather than a subtle breath. Mirrors the
// sheep tile's architecture exactly.
//
// PALETTE LOCK: it is ALWAYS the same white-and-tan goat — two backward-curving
// HORNS, a little chin BEARD, upright ears, slender legs, a short tail. The
// silhouette + identity colours never change across seasons; the only seasonal
// changes are coat VOLUME (sleeker spring/summer → shaggier thick winter coat),
// the pad colour, the light wash, gloss, and BOLD dressing — snow on the back,
// a little winter SCARF (a deep BERRY knit), a breath-fog puff, blossom, a
// fallen leaf, frost. The
// goat is never morphed into another animal; the signature horns + beard stay.
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~0.9s): a CHEW — head bobs ~8–12px as it chews, with a
//     beard waggle, an ear-flick, a tail wag and a body squash.
//   • RARE  ~18s (win ~1.2s, phase +3s): a playful HEAD-BUTT / HOP — the goat
//     rears slightly (anticipation), lunges its head into a butt while springing
//     ~14–18px up, then settles. The hop may lift OUTSIDE the −24..+24 box.
// Both gestures return to REST with zero value AND zero velocity at the window
// edges (raised-cosine windows), so `anim(…, t)` is seamless and `anim(…, 0)`
// (and `draw`) sit exactly at rest.
//
// Origin-centered in the −24..+24 design box, light from upper-left, one soft
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

// coerce a wild/non-finite scalar to a safe finite number
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

// Anticipation→action shape for the HEAD-BUTT / HOP: a brief rear-back crouch
// (negative) before the spring, then a clean arc up and settle. q∈[0,1].
// Returns a LIFT factor in roughly −0.2..+1 (negative = crouch, positive = up).
function hopShape(q: number): number {
  if (q <= 0 || q >= 1) return 0;
  const antiEnd = 0.24; // first slice = rear-back / anticipation
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
  lean: number; // head/body lunge toward lower-left (design px) for the butt
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  head: number; // extra head dip (design px, + = down) for the chew
  chew: number; // 0..1 jaw/chew open amount
  ear: number; // 0..1 near-ear flick amount
  tail: number; // signed tail wag (design px sideways)
  hop: number; // 0..1 head-butt/hop intensity (drives beard flag + fog swell)
}

const REST: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, chew: 0, ear: 0, tail: 0, hop: 0 };

// Build a pose from the wall clock: a common CHEW every ~6s and a rare
// HEAD-BUTT / HOP every ~18s. Returns to REST (all zeros / unit scales) at every
// window edge.
function poseFromClock(tIn: number): Pose {
  const t = safeNum(tIn, 0);
  const pose: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, chew: 0, ear: 0, tail: 0, hop: 0 };

  // COMMON ~6s: CHEW (win ~0.9s). Head bobs ~8–12px, jaw chatters, ear flicks,
  // tail wags, body squashes a touch. Built from raised-cosine windows →
  // seamless. Phase 3.0 opens the window at t≈3.0 (well clear of t=0, so
  // poseFromClock(0) sits exactly at REST).
  const cq = actionQ(t, 6, 0.9, 3.0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window
    // two chew bobs within the window (head dips down ~8–12px at the peak)
    pose.head = env * (4.0 + 7.0 * Math.abs(Math.sin(cq * Math.PI * 2)));
    pose.chew = env * (0.5 + 0.5 * Math.abs(Math.sin(cq * Math.PI * 2)));
    pose.ear = env;
    pose.tail = Math.sin(cq * Math.PI * 6) * env * 2.6; // a few wags sideways
    // a small body squash in time with the chew
    pose.squashY = 1 - env * 0.05 * Math.abs(Math.sin(cq * Math.PI * 2));
    pose.squashX = 1 + env * 0.04 * Math.abs(Math.sin(cq * Math.PI * 2));
  }

  // RARE ~18s: HEAD-BUTT / HOP (win ~1.2s, phase +3s offset from the chew).
  // The goat rears (anticipation), lunges its head into a butt while springing
  // ~14–18px up, then settles. May lift OUTSIDE the design box at the apex.
  const hq = actionQ(t, 18, 1.2, 6.0);
  if (hq >= 0) {
    const s = hopShape(hq); // −0.2..+1 (rear-back crouch then arc)
    const up = Math.max(0, s);
    pose.bob = up * 17; // up to ~17px airborne
    pose.hop = up;
    if (s < 0) {
      // anticipation: rear back / crouch — squash down & wide, lean back a touch
      const c = -s; // 0..0.2
      pose.squashY = 1 - c * 0.9;
      pose.squashX = 1 + c * 0.7;
      pose.lean = c * 4.0; // pull head back (toward upper-right) before the butt
    } else {
      // airborne / lunge: stretch tall & narrow, drive the head down-forward
      pose.squashY = 1 + s * 0.16;
      pose.squashX = 1 - s * 0.1;
      // a sharp head-butt lunge toward lower-left peaking mid-hop
      pose.lean = -Math.sin(((hq - 0.24) / 0.76) * Math.PI) * 6.0;
      pose.head += up * 3.0; // drive the head down into the butt
    }
    // a little tail flag during the hop
    pose.tail += Math.sin(hq * Math.PI) * 1.6;
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────

interface P {
  coatLight: RGB; // bright top of the white body coat
  coatShadow: RGB; // shaded underside of the body coat
  saddleTan: RGB; // the tan saddle/markings (the "tan" of white-and-tan)
  horn: RGB; // the curving horns
  hoofDark: RGB; // muzzle pad, hooves, eyes
  beard: RGB; // the chin beard tuft
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  coatVolume: number; // 0..1 BOLD thickness/shagginess of the coat
  coatGloss: number; // 0..1 sleek summer coat gloss
  frostAmt: number; // 0..1 frost sparkle on the coat
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 a blossom on the pad
  fallenLeafAmt: number; // 0..1 a fallen leaf on the pad
  breathFogAmt: number; // 0..1 breath puff at the muzzle
  scarfAmt: number; // 0..1 a little winter SCARF (tweened alpha)
  scarfColor: RGB; // scarf colour (locked berry, fades in via alpha)
}

// Four BOLD season presets. The goat stays the SAME white-and-tan horned,
// bearded goat; only coat volume + pad + light + gloss + dressing differ —
// pushed HARD so each season reads at a glance.
const SP: Record<SeasonName, P> = {
  // Spring — sleeker coat; dewy lime pad + a blossom; cool-bright light.
  Spring: {
    coatLight: [248, 246, 238],
    coatShadow: [206, 200, 186],
    saddleTan: [206, 168, 116],
    horn: [216, 200, 168],
    hoofDark: [60, 52, 46],
    beard: [232, 226, 212],
    padGrass: [128, 210, 86], // vivid fresh lime
    soil: [86, 138, 52],
    outline: [62, 54, 46],
    lightWash: [200, 240, 255], // cool-bright
    lightWashAmt: 0.2,
    coatVolume: 0.12, // BOLD: sleek, recently-shed thin coat
    coatGloss: 0.3,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.9,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [150, 36, 70],
  },
  // Summer — glossy coat (PEAK); saturated mid-green pad; bright warm light.
  Summer: {
    coatLight: [252, 250, 242],
    coatShadow: [202, 196, 182],
    saddleTan: [200, 158, 102],
    horn: [214, 196, 160],
    hoofDark: [56, 48, 42],
    beard: [236, 230, 218],
    padGrass: [78, 184, 60], // saturated mid-green
    soil: [50, 118, 36],
    outline: [56, 48, 42],
    lightWash: [255, 240, 188], // bright warm
    lightWashAmt: 0.22,
    coatVolume: 0.42, // normal coat
    coatGloss: 0.95, // peak gloss
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [150, 36, 70],
  },
  // Autumn — warm-tinted fuller coat; olive-tan pad + a fallen leaf; amber light.
  Autumn: {
    coatLight: [246, 236, 222],
    coatShadow: [200, 186, 166],
    saddleTan: [190, 138, 78],
    horn: [206, 182, 140],
    hoofDark: [58, 46, 40],
    beard: [228, 218, 200],
    padGrass: [168, 138, 70], // olive-tan browning
    soil: [110, 84, 42],
    outline: [58, 46, 38],
    lightWash: [255, 188, 100], // low amber, BOLD
    lightWashAmt: 0.3,
    coatVolume: 0.72, // fuller, thicker
    coatGloss: 0.28, // dulled gloss
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.92,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [150, 36, 70],
  },
  // Winter — SHAGGY thick coat + back snow + scarf + breath-fog; snowy pad;
  // cool blue-grey light.
  Winter: {
    coatLight: [252, 251, 248],
    coatShadow: [206, 212, 224],
    saddleTan: [186, 152, 108],
    horn: [206, 196, 176],
    hoofDark: [62, 58, 64],
    beard: [238, 236, 232],
    padGrass: [224, 236, 248], // snow on the pad
    soil: [148, 168, 192],
    outline: [70, 70, 84],
    lightWash: [188, 212, 252], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    coatVolume: 1, // BOLD: shaggy thick winter coat
    coatGloss: 0.08,
    frostAmt: 0.85,
    backSnowAmt: 0.9,
    padSnowAmt: 0.95,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.85,
    scarfAmt: 1, // a little scarf appears in winter
    scarfColor: [150, 36, 70],
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    coatLight: lerpRGB(a.coatLight, b.coatLight, t),
    coatShadow: lerpRGB(a.coatShadow, b.coatShadow, t),
    saddleTan: lerpRGB(a.saddleTan, b.saddleTan, t),
    horn: lerpRGB(a.horn, b.horn, t),
    hoofDark: lerpRGB(a.hoofDark, b.hoofDark, t),
    beard: lerpRGB(a.beard, b.beard, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    coatVolume: lerp(a.coatVolume, b.coatVolume, t),
    coatGloss: lerp(a.coatGloss, b.coatGloss, t),
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
    coatGloss: clamp01(p.coatGloss),
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

// the low flat grass pad the goat stands on
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

// one slender leg: a thin coat-toned cylinder with a darker hoof at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  // light coat upper
  ctx.strokeStyle = rgba(p.coatShadow);
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY - 2.4);
  ctx.stroke();
  // lower leg / hoof darker
  ctx.strokeStyle = rgba(p.hoofDark);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x, baseY - 3);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // hoof tip
  ctx.fillStyle = rgba([30, 26, 28]);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 1.6, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// the compact goat body — a solid rounded torso (NOT a wool cloud). The coat
// volume puffs the outline & shag BOLDLY (winter), but the silhouette stays a
// goat.
function paintBody(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number, fill: string, grow: number): void {
  const vol = 0.88 + p.coatVolume * 0.3;
  const rx = 12.5 * vol * grow;
  const ry = 8 * vol * grow;
  ctx.fillStyle = fill;
  ctx.beginPath();
  // a torso ellipse, very slightly higher at the shoulders (front, lower-left)
  ctx.ellipse(cx, cy, rx, ry, -0.06, 0, Math.PI * 2);
  ctx.fill();
}

// soft shaggy fringe along the lower edge of the body (grows with coat volume)
function paintCoatShag(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number): void {
  if (p.coatVolume <= 0.3) return;
  const amt = (p.coatVolume - 0.3) / 0.7; // 0 at spring/summer-ish, 1 at winter
  ctx.fillStyle = rgba(p.coatShadow, 0.9);
  const vol = 0.88 + p.coatVolume * 0.3;
  const rx = 12.5 * vol;
  const ry = 8 * vol;
  const tufts = 10;
  for (let i = 0; i < tufts; i++) {
    const f = i / (tufts - 1);
    const ang = lerp(Math.PI * 0.15, Math.PI * 0.95, f); // along the underbelly arc
    const lx = cx + Math.cos(ang) * rx * 0.96;
    const ly = cy + Math.sin(ang) * ry * 0.96;
    const drop = (2 + amt * 3.8) * (0.6 + 0.4 * Math.sin(i * 1.7));
    ctx.beginPath();
    ctx.moveTo(lx - 1.6, ly - 1);
    ctx.lineTo(lx, ly + drop);
    ctx.lineTo(lx + 1.6, ly - 1);
    ctx.closePath();
    ctx.fill();
  }
}

// the whole goat, standing front-¾ turned ~15–20° toward lower-left, posed by
// `pose`
function paintGoat(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  // legs stay PLANTED on the pad (they don't lift with the hop — they stretch).
  const bx = 1;
  const bodyY = 4 - pose.bob; // body centre lifts during the hop
  const legTop = bodyY + 5;

  // legs first (behind the body). Slender; two back (dimmer), two front.
  ctx.save();
  ctx.globalAlpha = 0.85;
  paintLeg(ctx, p, bx + 7, legTop, 18.6); // back-far
  paintLeg(ctx, p, bx - 6, legTop, 18.9); // back-near
  ctx.restore();
  paintLeg(ctx, p, bx + 4.5, legTop + 0.5, 19.3); // front-far
  paintLeg(ctx, p, bx - 3.5, legTop + 0.5, 19.6); // front-near

  // The whole upper body (torso + head + dressing) is drawn under a
  // squash/stretch transform centred on the body, so the chew + hop read with
  // anticipation squash + airborne stretch.
  ctx.save();
  ctx.translate(bx, bodyY);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-bx, -bodyY);

  const by = bodyY;

  // shaggy underbelly fringe sits behind/under the body fill
  paintCoatShag(ctx, p, bx, by + 1);

  // BODY — dark outline pass first, then shaded coat, then lit coat (layered)
  paintBody(ctx, p, bx, by, rgba(p.outline), 1.1); // outline halo
  paintBody(ctx, p, bx, by, rgba(p.coatShadow), 1.0); // shaded body
  // lit coat offset up-left (light from upper-left)
  ctx.save();
  ctx.translate(-1.2, -1.4);
  paintBody(ctx, p, bx, by, rgba(p.coatLight), 0.82);
  ctx.restore();

  // tan saddle marking across the back/rump — the "tan" of white-and-tan
  ctx.save();
  const sv = 0.88 + p.coatVolume * 0.3;
  ctx.beginPath();
  ctx.ellipse(bx, by, 12.5 * sv, 8 * sv, -0.06, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = rgba(p.saddleTan, 0.92);
  ctx.beginPath();
  ctx.ellipse(bx + 4.5, by - 1.5, 7.5, 5.5, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // a small tan patch on the haunch lower-front for two-tone read
  ctx.fillStyle = rgba(p.saddleTan, 0.7);
  ctx.beginPath();
  ctx.ellipse(bx - 6, by + 3, 4, 3, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // summer coat GLOSS — a soft top sheen band across the back
  if (p.coatGloss > 0.001) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = rgba([255, 255, 255], 0.42 * p.coatGloss);
    ctx.beginPath();
    ctx.ellipse(bx - 1.5, by - 3.5, 8.5, 3.2, -0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // snow settled on the back (winter) — BOLD white cap on top of the coat
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgba([248, 252, 255], 0.95 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx + 1, by - 6.8, 9.6 * (0.9 + p.coatVolume * 0.25), 3.4, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.9 * p.backSnowAmt);
    for (const [dx, dy] of [[-4, -7.6], [2, -8.2], [6, -7.2], [-0.5, -8.6]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.6 + p.coatVolume * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the coat (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgba([255, 255, 255], 0.85 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-8, 0], [-3, 4], [4, -2], [8, 2], [0, -3], [-5, -4], [6, 4],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // short upright tail at the upper-right rear — wags via pose
  const tx = bx + 11 + pose.tail;
  const ty = by - 2 - Math.abs(pose.tail) * 0.2;
  ctx.strokeStyle = rgba(p.coatShadow);
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx + 2.5, ty - 3);
  ctx.stroke();
  ctx.strokeStyle = rgba(p.coatLight);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx + 2.4, ty - 2.8);
  ctx.stroke();
  ctx.lineCap = "butt";

  // ── HEAD (front-¾, lower-left) — horns + beard LOCK the goat identity ───────
  // The head dips with the chew, leans with the head-butt lunge.
  const hx = bx - 11 - pose.lean;
  const hy = by + 1.5 + pose.head;

  // upright ears (one each side). The near (left) ear flicks up with the chew.
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(hx + side * 3.4, hy - 3.2);
    const flick = side === -1 ? pose.ear * 0.6 : 0;
    ctx.rotate(side * 0.5 - 0.1 + side * flick);
    // outline
    ctx.fillStyle = rgba(p.outline);
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.9, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // ear fill (white coat, inner tan)
    ctx.fillStyle = rgba(p.coatLight);
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.4, 3.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.saddleTan, 0.6);
    ctx.beginPath();
    ctx.ellipse(0, 0.4, 0.7, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // two backward-curving HORNS rising from the crown, sweeping up and back
  for (const side of [-1, 1] as const) {
    const baseX = hx + side * 1.6;
    const baseY = hy - 4.2;
    // outline pass (fatter, dark)
    ctx.strokeStyle = rgba(p.outline);
    ctx.lineWidth = 3.0;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX + side * 0.5 + 2.2, baseY - 6.5, baseX + 4.5, baseY - 4.5);
    ctx.stroke();
    // horn fill (curving up then back toward upper-right, away from the muzzle)
    ctx.strokeStyle = rgba(p.horn);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX + side * 0.5 + 2.2, baseY - 6.5, baseX + 4.5, baseY - 4.5);
    ctx.stroke();
    // a ridge highlight on the horn
    ctx.strokeStyle = rgba([255, 255, 255], 0.3);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY - 0.4);
    ctx.quadraticCurveTo(baseX + side * 0.5 + 2.0, baseY - 6.4, baseX + 4.2, baseY - 4.6);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // a little wool tuft / forelock on the crown between the horns
  ctx.fillStyle = rgba(p.coatLight);
  ctx.beginPath();
  ctx.ellipse(hx, hy - 3.8, 2.4, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // FACE — an elongated goat muzzle ovoid, tilted toward lower-left
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(0.34 + pose.head * 0.015);
  // outline
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, 0.4, 4.2, 5.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // white face fill
  ctx.fillStyle = rgba(p.coatLight);
  ctx.beginPath();
  ctx.ellipse(0, 0.4, 3.6, 5.0, 0, 0, Math.PI * 2);
  ctx.fill();
  // tan blaze down the muzzle / brow shade for two-tone read
  ctx.fillStyle = rgba(p.saddleTan, 0.45);
  ctx.beginPath();
  ctx.ellipse(0.4, -1.6, 1.8, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // darker muzzle nose pad at the lower tip
  ctx.fillStyle = rgba(p.hoofDark);
  ctx.beginPath();
  ctx.ellipse(0.2, 4.2, 1.9, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // gentle cheek light (upper-left)
  ctx.fillStyle = rgba([255, 255, 255], 0.16);
  ctx.beginPath();
  ctx.ellipse(-1.4, -1.4, 1.6, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // eyes (goat: a calm dark eye each side)
  ctx.fillStyle = rgba([245, 245, 240]);
  for (const ex of [-1.7, 1.5]) {
    ctx.beginPath();
    ctx.arc(ex, -0.6, 1.0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = rgba([26, 22, 24]);
  for (const ex of [-1.6, 1.6]) {
    ctx.beginPath();
    ctx.ellipse(ex, -0.4, 0.5, 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // jaw / mouth — opens as it chews
  if (pose.chew > 0.01) {
    ctx.fillStyle = rgba([18, 14, 16]);
    ctx.beginPath();
    ctx.ellipse(0.2, 2.6, 1.2, 0.5 + pose.chew * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // nostrils on the muzzle pad
  ctx.fillStyle = rgba([16, 14, 16]);
  for (const ex of [-0.7, 1.0]) {
    ctx.beginPath();
    ctx.ellipse(ex, 4.2, 0.4, 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // chin BEARD — a little tuft hanging off the front of the muzzle/chin. It
  // waggles sideways with the chew and flags during the head-butt/hop.
  {
    const wag = pose.tail * 0.18 + pose.hop * 1.4 - pose.head * 0.06;
    const cxb = hx - 1.6;
    const cyb = hy + 5.6;
    ctx.fillStyle = rgba(p.outline);
    ctx.beginPath();
    ctx.moveTo(cxb - 1.8, cyb - 1.6);
    ctx.lineTo(cxb - 2.4 + wag, cyb + 4.2);
    ctx.lineTo(cxb + wag, cyb + 2.4);
    ctx.lineTo(cxb + 2.0 + wag, cyb + 4.0);
    ctx.lineTo(cxb + 1.6, cyb - 1.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba(p.beard);
    ctx.beginPath();
    ctx.moveTo(cxb - 1.3, cyb - 1.4);
    ctx.lineTo(cxb - 1.8 + wag, cyb + 3.6);
    ctx.lineTo(cxb + wag, cyb + 2.0);
    ctx.lineTo(cxb + 1.5 + wag, cyb + 3.4);
    ctx.lineTo(cxb + 1.2, cyb - 1.4);
    ctx.closePath();
    ctx.fill();
  }

  // ── SCARF (winter) — a little knitted band around the neck, below the head ──
  if (p.scarfAmt > 0.001) {
    const sx = hx + 4.6;
    const sy = hy + 2.2;
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // wrap band
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 5.0, 2.8, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // darker underside for depth
    ctx.fillStyle = rgba([
      Math.max(0, p.scarfColor[0] - 50),
      Math.max(0, p.scarfColor[1] - 30),
      Math.max(0, p.scarfColor[2] - 30),
    ]);
    ctx.beginPath();
    ctx.ellipse(sx + 0.5, sy + 1.3, 4.6, 1.5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // hanging tail of the scarf, with a knitted notch + fringe
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.moveTo(sx - 2.6, sy + 1.6);
    ctx.lineTo(sx + 1.0, sy + 2.2);
    ctx.lineTo(sx + 0.2, sy + 7.8);
    ctx.lineTo(sx - 3.2, sy + 7.0);
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
    ctx.lineTo(sx - 1.8, sy + 7.2);
    ctx.stroke();
    // fringe at the bottom
    ctx.strokeStyle = rgba(p.scarfColor);
    ctx.lineWidth = 0.9;
    ctx.lineCap = "round";
    for (const fx of [-3.0, -1.8, -0.6]) {
      ctx.beginPath();
      ctx.moveTo(sx + fx, sy + 7.2);
      ctx.lineTo(sx + fx - 0.2, sy + 8.8);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.restore();
  }

  ctx.restore(); // end squash/stretch transform

  // breath-fog puff at the muzzle (winter) — drawn OUTSIDE the squash transform
  // so it reads as air, not body. Static base puff + an exhale swell during the
  // chew, and a bigger huff during the head-butt/hop.
  if (p.breathFogAmt > 0.001) {
    const swell = pose.chew * 0.6 + pose.hop * 0.8;
    const reach = 4.4 + swell * 3.4;
    ctx.fillStyle = rgba([235, 244, 255], (0.34 + 0.26 * swell) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(hx - reach, hy + 4.4, 2.8 + swell * 2.0, 1.9 + swell * 1.3, 0.2, 0, Math.PI * 2);
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
    paintGoat(ctx, p, pose);
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
    const p = clamp01(pp);
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
      const bx = 1;
      const by = 4;

      // Loose fluff motes lifting off the thickening coat — reads the coat
      // visibly fluffing/growing. Present in EVERY morph (deterministic in p).
      const fluff = trans * (0.4 + 0.6 * Math.max(0, b.coatVolume - a.coatVolume + 0.4));
      if (fluff > 0.01) {
        ctx.fillStyle = rgba([255, 255, 255], 0.5 * fluff);
        const motes: Array<[number, number, number]> = [
          [-8, -7, 1.1], [3, -9, 1.4], [9, -5, 0.9], [-3, -10, 1.0],
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
          [-6, -9], [-1, -10], [4, -8.5], [7, -7],
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
        const hx = bx - 11;
        const hy = by + 1.5;
        ctx.fillStyle = rgba([235, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(hx - (4 + trans * 3), hy + 4.4, 2.6 + trans * 1.8, 1.8 + trans * 1.2, 0.2, 0, Math.PI * 2);
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
