// Production seasonal art for the HERD RAM board tile (`tile_herd_ram`) — the
// approved BOLD direction, the horned counterpart to the sheep. A single
// parameterized `paint(ctx, p, pose)` + four `P` presets + lerped transitions,
// pushed so the seasons read at a glance and the idle is a real, fun ACTION
// rather than a subtle breath.
//
// PALETTE LOCK: it is ALWAYS the same cream-fleeced, dark-faced ram with big
// spiralling CURLED HORNS on the sides of its head. Seasons change only its
// fleece VOLUME (recently-shorn thin in spring → thick fluffy winter fleece),
// the pad colour, the light wash, and BOLD dressing — snow on the back, a little
// winter SCARF, a breath-fog puff, blossoms, a fallen leaf, frost (which also
// dusts the horns). The ram's identity colours and curled-horn silhouette never
// change for any `P` (only fleece volume scales the wool).
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~0.9–1.0s): a CHEW — head/jaw bobs ~8–12px as it chews,
//     with an ear-flick, a tail wag and a small body squash.
//   • RARE  ~18s (win ~1.1–1.3s, phase +3s): a HEAD-BUTT charge feint — the ram
//     lowers its horned head and lunges forward ~14–18px then rocks back
//     (anticipation pull-back → butt → settle). It may exit the box at the apex.
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

// coerce any non-finite scalar to a safe fallback (never throw / never NaN)
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

// Anticipation→action shape for the HEAD-BUTT: a brief pull-back (negative)
// before the lunge, then a clean drive forward and settle. q∈[0,1]. Returns a
// THRUST factor in roughly −0.22..+1 (negative = pull-back/wind-up, positive =
// lunging forward). Zero value AND slope at q=0 and q=1.
function buttShape(q: number): number {
  if (q <= 0 || q >= 1) return 0;
  const antiEnd = 0.28; // first slice = wind-up / pull-back
  if (q < antiEnd) {
    // pull back a little (anticipation), zero slope at q=0
    const a = q / antiEnd;
    return -0.22 * (0.5 - 0.5 * Math.cos(a * Math.PI));
  }
  // lunge forward arc, zero at the seam to the wind-up and at q=1
  const a = (q - antiEnd) / (1 - antiEnd);
  return Math.sin(a * Math.PI);
}

// ── The idle POSE (carries all action state into paint) ──────────────────────

interface Pose {
  bob: number; // whole-body vertical lift (design px, + = up)
  lean: number; // whole-body horizontal lunge (design px, + = forward/left)
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  head: number; // extra head dip/lower (design px, + = down)
  chew: number; // 0..1 jaw open amount for the chew
  ear: number; // 0..1 near-ear flick amount
  tail: number; // signed tail wag (design px sideways)
  hop: number; // 0..1 head-butt drive intensity (drives fog + brace)
}

const REST: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, chew: 0, ear: 0, tail: 0, hop: 0 };

// Build a pose from the wall clock: a common CHEW every ~6s and a rare HEAD-BUTT
// charge feint every ~18s. Returns to REST (all zeros / unit scales) at every
// window edge.
function poseFromClock(tIn: number): Pose {
  const t = safeNum(tIn, 0);
  const pose: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, chew: 0, ear: 0, tail: 0, hop: 0 };

  // COMMON ~6s: CHEW (win ~1.0s). Head bobs ~8–12px, jaw chatters, ear flicks,
  // tail wags, small body squash. Built from raised-cosine windows → seamless.
  // Phase 3.0 opens the window at t≈3.0 (well clear of t=0, so anim(0) === REST).
  const cq = actionQ(t, 6, 1.0, 3.0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window
    // two chew bobs within the window (head dips down ~8–12px at the peak)
    pose.head = env * (4.0 + 8.0 * Math.abs(Math.sin(cq * Math.PI * 2)));
    pose.bob = -env * 1.6; // body settles a touch as it lowers to chew
    pose.chew = env * (0.5 + 0.5 * Math.abs(Math.sin(cq * Math.PI * 2)));
    pose.ear = env;
    pose.tail = Math.sin(cq * Math.PI * 6) * env * 2.8; // a few wags sideways
    // a small body squash as it leans down into the chew
    pose.squashY = 1 - env * 0.05;
    pose.squashX = 1 + env * 0.04;
  }

  // RARE ~18s: HEAD-BUTT charge feint (win ~1.2s, phase +3s past the chew).
  // The ram lowers its horned head and lunges forward ~14–18px then rocks back:
  // wind-up pull-back → drive → settle. May exit the box at the apex.
  const hq = actionQ(t, 18, 1.2, 3.0);
  if (hq >= 0) {
    const s = buttShape(hq); // −0.22..+1 (wind-up then forward drive)
    const env = bump(hq); // overall gesture envelope (0 at edges)
    if (s < 0) {
      // wind-up: rock back & rear up slightly, head rises before the strike
      const c = -s; // 0..0.22
      pose.lean = -c * 18; // pull BACK (right) before the lunge
      pose.bob = c * 5; // shoulders rise during the wind-up
      pose.head = -c * 6; // head lifts (chin up) in anticipation
      pose.squashY = 1 + c * 0.5;
      pose.squashX = 1 - c * 0.3;
    } else {
      // strike: drive head DOWN and FORWARD ~14–18px (horns lead)
      pose.lean = s * 17; // lunge forward (toward lower-left)
      pose.head = s * 11; // head lowers hard as it butts
      pose.bob = -s * 3; // shoulders dip into the drive
      pose.squashX = 1 + s * 0.16; // stretch forward
      pose.squashY = 1 - s * 0.1;
      pose.hop = s; // peak drive intensity (fog burst + braced legs)
    }
    // a tail flag through the whole feint
    pose.tail += Math.sin(hq * Math.PI) * env * 1.6;
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────

interface P {
  fleeceLight: RGB; // bright top of the cream wool
  fleeceShadow: RGB; // shaded underside of the cream wool
  faceDark: RGB; // broad dark face
  faceShade: RGB; // shaded side of the face
  hornLight: RGB; // lit side of the curled horns (locked keratin)
  hornShade: RGB; // shaded ridges of the horns
  legDark: RGB; // short legs + hooves (the dark parts)
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  fleeceVolume: number; // 0..1 BOLD puff of the wool (thin spring → thick winter)
  frostAmt: number; // 0..1 frost sparkle on the fleece + frosted horns
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 blossoms on the pad
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad
  breathFogAmt: number; // 0..1 breath puff at the muzzle
  glossAmt: number; // 0..1 healthy fleece gloss / sheen
  scarfAmt: number; // 0..1 a little winter SCARF (tweened alpha)
  scarfColor: RGB; // scarf colour (locked deep teal, fades in via alpha)
}

// Four BOLD season presets. The ram stays the SAME cream woolly dark-faced ram
// with big curled horns; only volume + pad + light + dressing differ — pushed
// HARD so each season reads at a glance.
const SP: Record<SeasonName, P> = {
  Spring: {
    fleeceLight: [248, 244, 232], // cream
    fleeceShadow: [210, 202, 184],
    faceDark: [58, 52, 56],
    faceShade: [42, 38, 42],
    hornLight: [224, 206, 168],
    hornShade: [168, 144, 104],
    legDark: [70, 60, 56],
    padGrass: [118, 214, 78], // vivid fresh lime
    soil: [78, 140, 48],
    outline: [60, 52, 44],
    lightWash: [196, 240, 255], // cool-bright
    lightWashAmt: 0.2,
    fleeceVolume: 0.08, // BOLD: clearly recently-shorn, very thin coat (sleeker)
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.9,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    glossAmt: 0.18, // cool-bright but not peak gloss
    scarfAmt: 0,
    scarfColor: [38, 132, 138],
  },
  Summer: {
    fleeceLight: [250, 248, 234], // cream, richest
    fleeceShadow: [208, 200, 178],
    faceDark: [54, 48, 50],
    faceShade: [40, 36, 38],
    hornLight: [226, 206, 166],
    hornShade: [166, 142, 100],
    legDark: [66, 56, 52],
    padGrass: [72, 184, 58], // saturated mid-green
    soil: [48, 116, 36],
    outline: [56, 48, 42],
    lightWash: [255, 238, 178], // warm
    lightWashAmt: 0.2,
    fleeceVolume: 0.52, // full healthy fleece (PEAK)
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    glossAmt: 0.95, // BOLD glossy peak
    scarfAmt: 0,
    scarfColor: [38, 132, 138],
  },
  Autumn: {
    fleeceLight: [244, 234, 214], // cream warming
    fleeceShadow: [200, 188, 164],
    faceDark: [56, 46, 44],
    faceShade: [42, 34, 34],
    hornLight: [220, 198, 154],
    hornShade: [160, 134, 92],
    legDark: [64, 52, 46],
    padGrass: [172, 138, 64], // olive-tan browning
    soil: [112, 82, 40],
    outline: [58, 46, 38],
    lightWash: [255, 184, 96], // low amber, BOLD
    lightWashAmt: 0.3,
    fleeceVolume: 0.8, // warm-tinted fuller fleece
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.95,
    breathFogAmt: 0,
    glossAmt: 0.28, // dulled gloss
    scarfAmt: 0,
    scarfColor: [38, 132, 138],
  },
  Winter: {
    fleeceLight: [250, 251, 252], // cream cooled toward white by the cold light
    fleeceShadow: [206, 216, 228],
    faceDark: [60, 56, 64],
    faceShade: [44, 42, 50],
    hornLight: [216, 204, 184], // keratin reads cooler under cold light
    hornShade: [156, 142, 120],
    legDark: [66, 62, 66],
    padGrass: [226, 238, 250], // snow on the pad
    soil: [146, 166, 192],
    outline: [70, 68, 78],
    lightWash: [188, 212, 252], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    fleeceVolume: 1, // BOLD: thick fluffy winter fleece
    frostAmt: 0.85,
    backSnowAmt: 0.92,
    padSnowAmt: 0.95,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.85,
    glossAmt: 0.12, // matte under cold overcast
    scarfAmt: 1, // a little scarf appears in winter
    scarfColor: [38, 132, 138],
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    fleeceLight: lerpRGB(a.fleeceLight, b.fleeceLight, t),
    fleeceShadow: lerpRGB(a.fleeceShadow, b.fleeceShadow, t),
    faceDark: lerpRGB(a.faceDark, b.faceDark, t),
    faceShade: lerpRGB(a.faceShade, b.faceShade, t),
    hornLight: lerpRGB(a.hornLight, b.hornLight, t),
    hornShade: lerpRGB(a.hornShade, b.hornShade, t),
    legDark: lerpRGB(a.legDark, b.legDark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    fleeceVolume: lerp(a.fleeceVolume, b.fleeceVolume, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    backSnowAmt: lerp(a.backSnowAmt, b.backSnowAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
    breathFogAmt: lerp(a.breathFogAmt, b.breathFogAmt, t),
    glossAmt: lerp(a.glossAmt, b.glossAmt, t),
    scarfAmt: lerp(a.scarfAmt, b.scarfAmt, t),
    scarfColor: lerpRGB(a.scarfColor, b.scarfColor, t),
  };
}

// clamp every scalar field defensively (never throw on a wild `p`)
function clampP(p: P): P {
  return {
    ...p,
    lightWashAmt: clamp01(safeNum(p.lightWashAmt)),
    fleeceVolume: clamp01(safeNum(p.fleeceVolume)),
    frostAmt: clamp01(safeNum(p.frostAmt)),
    backSnowAmt: clamp01(safeNum(p.backSnowAmt)),
    padSnowAmt: clamp01(safeNum(p.padSnowAmt)),
    blossomAmt: clamp01(safeNum(p.blossomAmt)),
    fallenLeafAmt: clamp01(safeNum(p.fallenLeafAmt)),
    breathFogAmt: clamp01(safeNum(p.breathFogAmt)),
    glossAmt: clamp01(safeNum(p.glossAmt)),
    scarfAmt: clamp01(safeNum(p.scarfAmt)),
  };
}

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat grass pad the ram stands on
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

  // BOLD blossom on the pad (spring)
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

// one short, sturdy leg: a stubby dark cylinder with a hoof at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  ctx.strokeStyle = rgba(p.legDark);
  ctx.lineWidth = 3.4; // sturdy ram legs read a touch thicker than the sheep's
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // hoof
  ctx.fillStyle = rgba([30, 26, 26]);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 1.9, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// the fluffy fleece body — a lumpy cloud whose lumps grow BOLDLY with volume.
// the ram body is a touch larger/sturdier than the sheep.
function paintFleeceBody(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number, fill: string, scallop: number): void {
  // BOLD volume: from clearly-shorn slim to thick fluffy winter fleece
  const vol = 0.78 + p.fleeceVolume * 0.6;
  const rx = 13.6 * vol;
  const ry = 9.8 * vol;
  ctx.fillStyle = fill;
  // base body ellipse
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  // scalloped wool lumps around the perimeter — bigger with volume
  const lumps = 11;
  const lumpR = (2.0 + p.fleeceVolume * 2.6) * scallop;
  for (let i = 0; i < lumps; i++) {
    const a = (i / lumps) * Math.PI * 2 - Math.PI / 2;
    const lx = cx + Math.cos(a) * rx * 0.98;
    const ly = cy + Math.sin(a) * ry * 0.98;
    ctx.beginPath();
    ctx.arc(lx, ly, lumpR, 0, Math.PI * 2);
    ctx.fill();
  }
}

// one big spiralling CURLED HORN — the ram's locked identity feature.
// Drawn as a logarithmic spiral of overlapping discs sweeping down-and-around
// from the crown to a point near the cheek. `side` flips it left/right.
// The silhouette is CONSTANT across seasons; only the keratin colour + frost
// (via `p`) change.
function paintHorn(ctx: CanvasRenderingContext2D, p: P, ox: number, oy: number, side: -1 | 1): void {
  // spiral parameters — a tight ram curl wrapping ~1.5 turns
  const turns = 1.55;
  const steps = 22;
  const a0 = side === 1 ? -1.1 : Math.PI + 1.1; // start angle near the crown
  const r0 = 5.6; // outer radius at the base of the curl
  type Disc = { x: number; y: number; r: number };
  const discs: Disc[] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const ang = a0 + side * f * turns * Math.PI * 2;
    const rad = r0 * (1 - f * 0.78); // spirals inward
    const cx = ox + side * 4.2 + Math.cos(ang) * rad;
    const cy = oy + 0.5 + Math.sin(ang) * rad * 0.9; // slightly squashed
    const thick = 2.9 * (1 - f * 0.55); // tapers toward the tip
    discs.push({ x: cx, y: cy, r: thick });
  }

  // dark outline halo
  ctx.fillStyle = rgba(p.outline);
  for (const d of discs) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r + 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  // lit keratin body
  ctx.fillStyle = rgba(p.hornLight);
  for (const d of discs) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // shaded inner ridge of the spiral (offset down-right for groove read)
  ctx.fillStyle = rgba(p.hornShade);
  for (let i = 0; i < discs.length; i++) {
    const d = discs[i];
    ctx.beginPath();
    ctx.arc(d.x + 0.8, d.y + 0.8, d.r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // a few ridge ticks across the horn for the corrugated keratin look
  ctx.strokeStyle = rgba(p.hornShade, 0.7);
  ctx.lineWidth = 0.7;
  for (let i = 2; i < discs.length - 1; i += 2) {
    const d = discs[i];
    ctx.beginPath();
    ctx.moveTo(d.x - d.r, d.y - d.r * 0.4);
    ctx.lineTo(d.x + d.r, d.y + d.r * 0.4);
    ctx.stroke();
  }

  // winter: frost dusting the upward ridges of the horn
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.frostAmt);
    for (let i = 0; i < discs.length; i += 3) {
      const d = discs[i];
      ctx.beginPath();
      ctx.arc(d.x - 0.6, d.y - d.r * 0.6, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// the whole ram, standing front-¾ turned toward lower-left, posed by `pose`
function paintRam(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  // legs stay PLANTED on the pad (they brace during the butt rather than slide).
  const bx = -1;
  const bodyY = 4 - pose.bob; // body centre lifts/dips with the gesture
  const legTopBase = bodyY + 7; // where the short ram legs meet the fleece

  // SHORT legs first (behind the fleece). Two back, two front; contact on pad.
  ctx.save();
  ctx.globalAlpha = 0.85;
  paintLeg(ctx, p, bx + 6.8, legTopBase, 18.6);
  paintLeg(ctx, p, bx - 7.8, legTopBase, 18.9);
  ctx.restore();
  // front legs
  paintLeg(ctx, p, bx + 3.6, legTopBase, 19.2);
  paintLeg(ctx, p, bx - 4.6, legTopBase, 19.4);

  // The whole upper body (fleece + head + horns + dressing) is drawn under a
  // squash/stretch + lunge transform centred on the body, so the head-butt
  // reads with anticipation wind-up + forward drive.
  ctx.save();
  ctx.translate(bx - pose.lean, bodyY);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-bx, -bodyY);

  const by = bodyY;

  // FLEECE — dark outline pass first, then shaded wool, then light wool (layered)
  paintFleeceBody(ctx, p, bx, by, rgba(p.outline), 1.18); // outline halo
  paintFleeceBody(ctx, p, bx, by, rgba(p.fleeceShadow), 1.0); // shaded wool
  // light wool offset up-left (light from upper-left)
  ctx.save();
  ctx.translate(-1.4, -1.6);
  paintFleeceBody(ctx, p, bx, by, rgba(p.fleeceLight), 0.82);
  ctx.restore();

  // healthy fleece gloss — a soft sheen band across the wool (BOLD in summer)
  if (p.glossAmt > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = rgba([255, 255, 255], 0.45 * p.glossAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 3, by - 3.5, 7.5, 3.4, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // snow settled on the back (winter) — BOLD white cap on top of the fleece
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgba([248, 252, 255], 0.95 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 1, by - 8.2, 10 * (0.9 + p.fleeceVolume * 0.35), 4.0, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.9 * p.backSnowAmt);
    for (const [dx, dy] of [[-6, -9], [0, -9.8], [6, -8.6], [-2, -10.2]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.8 + p.fleeceVolume * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the fleece (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgba([255, 255, 255], 0.85 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-8, 0], [-3, 4], [4, -2], [8, 2], [0, -3], [-5, -5], [6, 5],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── HEAD (front-¾, lower-left) — broad face + big curled horns lock identity ─
  const hx = bx - 11;
  const hy = by + 3 + pose.head; // chew / head-butt lowers the head

  // ears (tucked under the horns), behind the face. The near (left) ear flicks.
  ctx.fillStyle = rgba(p.faceShade);
  for (const sideE of [-1, 1] as const) {
    ctx.save();
    ctx.translate(hx + sideE * 4.4, hy - 1.5);
    const flick = sideE === -1 ? pose.ear * 0.6 : 0;
    ctx.rotate(sideE * 0.7 + 0.1 + sideE * flick);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.2, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // a small wool tuft on the crown (between the horns) — keeps it woolly
  ctx.fillStyle = rgba(p.fleeceLight);
  ctx.beginPath();
  ctx.ellipse(hx, hy - 5, 3.2, 2.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // BIG SPIRALLING CURLED HORNS on the sides of the head (locked silhouette).
  // Drawn before the face so the curl's inner end tucks behind the cheek.
  paintHorn(ctx, p, hx, hy - 2.2, -1);
  paintHorn(ctx, p, hx, hy - 2.2, 1);

  // BROAD face — a wide, soft dark muzzle, tilted toward lower-left
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(0.22 + pose.head * 0.015);
  // outline
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, 0, 6.0, 5.6, 0, 0, Math.PI * 2); // broad (wider than tall)
  ctx.fill();
  // dark face fill
  ctx.fillStyle = rgba(p.faceDark);
  ctx.beginPath();
  ctx.ellipse(0, 0, 5.3, 4.9, 0, 0, Math.PI * 2);
  ctx.fill();
  // shaded right side of the broad face
  ctx.fillStyle = rgba(p.faceShade);
  ctx.beginPath();
  ctx.ellipse(1.8, 0.6, 3.4, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // muzzle — a paler broad nose-bridge running down the face
  ctx.fillStyle = rgba(p.fleeceLight, 0.4);
  ctx.beginPath();
  ctx.ellipse(-0.6, 1.4, 2.0, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // gentle cheek light (upper-left)
  ctx.fillStyle = rgba([255, 255, 255], 0.14);
  ctx.beginPath();
  ctx.ellipse(-2.0, -1.8, 2.0, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // eyes
  ctx.fillStyle = rgba([245, 244, 236]);
  for (const ex of [-2.0, 2.0]) {
    ctx.beginPath();
    ctx.arc(ex, -1.3, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = rgba([26, 22, 22]);
  for (const ex of [-1.8, 2.2]) {
    // horizontal ram-pupil read as a small dark oval
    ctx.beginPath();
    ctx.ellipse(ex, -1.1, 0.7, 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // jaw / mouth — opens as it chews
  if (pose.chew > 0.01) {
    ctx.fillStyle = rgba([18, 16, 18]);
    ctx.beginPath();
    ctx.ellipse(0, 3.4, 1.5, 0.6 + pose.chew * 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // nostrils on the broad muzzle
  ctx.fillStyle = rgba([24, 20, 20]);
  for (const ex of [-1.0, 1.0]) {
    ctx.beginPath();
    ctx.ellipse(ex, 3.6, 0.5, 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── SCARF (winter) — a little knitted band around the neck, below the head ──
  if (p.scarfAmt > 0.001) {
    const sx = hx + 4.6;
    const sy = hy - 0.4;
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // wrap band
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 5.4, 3.0, 0.32, 0, Math.PI * 2);
    ctx.fill();
    // darker underside for depth
    ctx.fillStyle = rgba([
      Math.max(0, p.scarfColor[0] - 26),
      Math.max(0, p.scarfColor[1] - 40),
      Math.max(0, p.scarfColor[2] - 40),
    ]);
    ctx.beginPath();
    ctx.ellipse(sx + 0.6, sy + 1.4, 5.0, 1.6, 0.32, 0, Math.PI * 2);
    ctx.fill();
    // hanging tail of the scarf, with a knitted notch + fringe
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.moveTo(sx - 2.6, sy + 1.8);
    ctx.lineTo(sx + 1.0, sy + 2.4);
    ctx.lineTo(sx + 0.2, sy + 8.4);
    ctx.lineTo(sx - 3.2, sy + 7.6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba([
      Math.max(0, p.scarfColor[0] - 34),
      Math.max(0, p.scarfColor[1] - 54),
      Math.max(0, p.scarfColor[2] - 54),
    ]);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sx - 1.4, sy + 3.2);
    ctx.lineTo(sx - 1.8, sy + 7.8);
    ctx.stroke();
    // fringe at the bottom
    ctx.strokeStyle = rgba(p.scarfColor);
    ctx.lineWidth = 0.9;
    ctx.lineCap = "round";
    for (const fx of [-3.0, -1.8, -0.6]) {
      ctx.beginPath();
      ctx.moveTo(sx + fx, sy + 7.8);
      ctx.lineTo(sx + fx - 0.2, sy + 9.4);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.restore();
  }

  // tail tuft at the upper-right rear of the fleece — wags via pose
  ctx.fillStyle = rgba(p.fleeceLight);
  ctx.beginPath();
  ctx.arc(bx + 13 + pose.tail, by - 1 - Math.abs(pose.tail) * 0.25, 2.5 + p.fleeceVolume * 0.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // end squash/stretch + lunge transform

  // breath-fog puff at the muzzle (winter) — drawn OUTSIDE the body transform so
  // it reads as air, not body. Static base puff + a burst during the head-butt.
  if (p.breathFogAmt > 0.001) {
    const muzX = hx - pose.lean; // follows the lunging head
    const muzY = hy + 4;
    const reach = 5.0 + pose.hop * 4.0;
    ctx.fillStyle = rgba([235, 244, 255], (0.34 + 0.3 * pose.hop) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(muzX - reach, muzY, 3.0 + pose.hop * 2.2, 2.0 + pose.hop * 1.4, 0.2, 0, Math.PI * 2);
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
    paintRam(ctx, p, pose);
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

// ── Forward transitions (lerp EVERY field through quintic smoothstep) ─────────

// A monotone ease that is EXACT at the endpoints but can lead or lag.
function biasedEase(k: number, bias: number): number {
  const x = clamp01(k);
  return Math.pow(smoother(x), bias);
}

// Staged transition. The whole-tile look lerps from SP[from] (p=0) to SP[to]
// (p=1) — so transition(0) === draw(from) and transition(1) === draw(to)
// EXACTLY (drawn at REST, matching the idle hand-off). The fleece VOLUME leads
// (coat fluffs early); snow / frost / breath-fog / scarf LAG (settle late).
function makeTransition(fromIdx: 0 | 1 | 2) {
  const from = SEASON_NAMES[fromIdx];
  const to = SEASON_NAMES[fromIdx + 1];
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const p = clamp01(safeNum(pp, 0));
    const kBase = smoother(p);
    const kCoat = biasedEase(p, 0.62); // fleece volume LEADS
    const kSnow = biasedEase(p, 1.7); // snow / frost / fog / scarf LAG

    const a = SP[from];
    const b = SP[to];
    const blended: P = lerpP(a, b, kBase);
    blended.fleeceVolume = lerp(a.fleeceVolume, b.fleeceVolume, kCoat);
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
      const bx = -1;
      const by = 4;

      // Loose fluff motes lifting off the thickening coat — reads the fleece
      // visibly fluffing/growing. Present in EVERY morph (deterministic in p).
      const fluff = trans * (0.4 + 0.6 * Math.max(0, b.fleeceVolume - a.fleeceVolume + 0.4));
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
        const hx = bx - 11;
        const hy = by + 3;
        ctx.fillStyle = rgba([235, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(hx - (4 + trans * 3), hy + 4, 2.6 + trans * 1.8, 1.8 + trans * 1.2, 0.2, 0, Math.PI * 2);
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
