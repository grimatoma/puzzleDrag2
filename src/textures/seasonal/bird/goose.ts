// Production seasonal art for the BIRD GOOSE board tile (`tile_bird_goose`) —
// the approved bold direction, mirroring the HERD SHEEP reference pattern. A
// single parameterized `paint(ctx, p, pose)` + four `P` presets + lerped
// transitions, pushed so the seasons read at a glance and the idle is a real,
// fun ACTION (a neck-dip peck and a honking wing-flap) rather than a subtle bob.
//
// PALETTE LOCK: it is ALWAYS the same plump WHITE domestic goose with a long
// curving neck, an ORANGE bill and orange feet, on a pad. Seasons change only
// its plumage VOLUME (sleek spring → fluffed winter), the pad colour, the light
// wash, the gloss, and BOLD dressing — snow on the back, a little winter SCARF,
// a breath-fog puff, blossoms, a fallen leaf, frost. The body colour + the
// signature long-neck/orange-bill silhouette never change; only volume scales it.
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~0.95s): a NECK-DIP PECK — the long neck dips the head
//     down ~12–16px to nibble the ground, then arcs back up, with a small body
//     squash and a tail flick.
//   • RARE  ~18s (win ~1.2s, phase +3s): a HONK + WING-FLAP — the neck stretches
//     UP and forward ~14–18px, the bill opens, the wings flap, then it settles.
//     Anticipation → honk → settle. May reach OUTSIDE the −24..+24 design box.
// Both gestures return to REST with zero value AND zero velocity at the window
// edges (raised-cosine windows), so `anim(…, t)` is seamless and `anim(…, 0)`
// (and `draw`) sit exactly at rest.
//
// Origin-centered in the −24..+24 design box, light from upper-left. Never
// throws; clamps every scalar; save/restore in `finally` + globalAlpha reset.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Small math helpers ──────────────────────────────────────────────────────

type RGB = [number, number, number];

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

// guard a wild/non-finite scalar to a safe finite default
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

// Anticipation→action shape for the HONK: a brief tuck (negative) before the
// neck stretches, then a clean reach and settle. q∈[0,1]. Returns a REACH
// factor in roughly −0.16..+1 (negative = tuck-down anticipation, positive =
// neck stretched up & forward).
function honkShape(q: number): number {
  if (q <= 0 || q >= 1) return 0;
  const antiEnd = 0.24; // first slice = tuck/anticipation
  if (q < antiEnd) {
    // tuck down a little (anticipation), zero slope at q=0
    const a = q / antiEnd;
    return -0.16 * (0.5 - 0.5 * Math.cos(a * Math.PI));
  }
  // stretch arc, zero at the seam to the tuck and at q=1
  const a = (q - antiEnd) / (1 - antiEnd);
  return Math.sin(a * Math.PI);
}

// ── The idle POSE (carries all action state into paint) ──────────────────────

interface Pose {
  bob: number; // whole-body vertical bob (design px, + = down)
  lean: number; // body forward/back lean (design px, + = toward head)
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  neckDip: number; // head/neck vertical travel (design px, + = down peck)
  neckReach: number; // head/neck up+forward stretch (design px, + = up/forward)
  peck: number; // 0..1 ground-nibble bill chatter at the dip bottom
  honk: number; // 0..1 bill-open honk amount
  wing: number; // 0..1 wing-flap amount
  tail: number; // signed tail flick (design px)
  fogPuff: number; // 0..1 extra breath-fog reach (winter exhale)
}

const REST: Pose = {
  bob: 0,
  lean: 0,
  squashX: 1,
  squashY: 1,
  neckDip: 0,
  neckReach: 0,
  peck: 0,
  honk: 0,
  wing: 0,
  tail: 0,
  fogPuff: 0,
};

// Build a pose from the wall clock: a common NECK-DIP PECK every ~6s and a rare
// HONK + WING-FLAP every ~18s. Returns to REST (all zeros / unit scales) at
// every window edge.
function poseFromClock(tIn: number): Pose {
  const t = safeNum(tIn, 0);
  const pose: Pose = {
    bob: 0,
    lean: 0,
    squashX: 1,
    squashY: 1,
    neckDip: 0,
    neckReach: 0,
    peck: 0,
    honk: 0,
    wing: 0,
    tail: 0,
    fogPuff: 0,
  };

  // COMMON ~6s: NECK-DIP PECK (win ~0.95s). The long neck dips the head down
  // ~12–16px to nibble the ground then arcs back up, with a small body squash
  // and a tail flick. Built from raised-cosine windows → seamless. Phase 3.0
  // opens the window at t≈3.0 (well clear of t=0, so anim(0) sits at REST).
  const cq = actionQ(t, 6, 0.95, 3.0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window
    // a smooth down-then-up arc; bottoms out near the middle of the window
    const dipArc = Math.sin(cq * Math.PI); // 0→1→0, peak at the dip bottom
    pose.neckDip = env * (3.0 + 11.0 * dipArc); // head dips ~12–16px down
    pose.lean = env * 2.2 * dipArc; // body tips slightly toward the ground
    // a couple of quick nibbles at the bottom of the dip
    pose.peck = env * dipArc * (0.55 + 0.45 * Math.abs(Math.sin(cq * Math.PI * 5)));
    // small body squash as it leans down to peck
    pose.squashY = 1 - env * dipArc * 0.07;
    pose.squashX = 1 + env * dipArc * 0.05;
    pose.tail = Math.sin(cq * Math.PI * 5) * env * 2.6; // tail flicks
    pose.fogPuff = env * dipArc; // winter: an exhale puff as it nibbles
  }

  // RARE ~18s: HONK + WING-FLAP (win ~1.2s, phase +3s relative to the peck).
  // The neck stretches UP and forward ~14–18px, the bill opens, the wings flap,
  // then it settles. May reach OUTSIDE the design box at the apex.
  const hq = actionQ(t, 18, 1.2, 6.0);
  if (hq >= 0) {
    const env = bump(hq);
    const s = honkShape(hq); // −0.16..+1 (tuck then stretch)
    if (s < 0) {
      // anticipation tuck: pull the head down a touch, squash low/wide
      const c = -s; // 0..0.16
      pose.neckDip += c / 0.16 * 4.0;
      pose.squashY = Math.min(pose.squashY, 1 - c * 0.7);
      pose.squashX = Math.max(pose.squashX, 1 + c * 0.6);
    } else {
      pose.neckReach = s * 16; // neck stretches ~14–18px up & forward
      pose.bob -= s * 1.4; // whole body rises a touch on the call
      // honk: the bill opens, strongest mid-stretch
      pose.honk = Math.max(pose.honk, Math.sin(Math.min(1, s) * Math.PI) * 0.5 + s * 0.5);
      // wings flap a few beats while the call holds
      pose.wing = Math.max(pose.wing, env * (0.4 + 0.6 * Math.abs(Math.sin(hq * Math.PI * 4))));
      // stretch tall/narrow as it reaches up
      pose.squashY = 1 + s * 0.08;
      pose.squashX = 1 - s * 0.05;
    }
    pose.tail += Math.sin(hq * Math.PI) * 1.6; // a tail flag during the call
    pose.fogPuff = Math.max(pose.fogPuff, env * 0.8); // a big exhale on the honk
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────

interface P {
  bodyLight: RGB; // lit white plumage (upper-left face)
  bodyMid: RGB; // body white in ambient
  bodyShade: RGB; // shaded under-belly / far side
  bill: RGB; // orange bill (locked)
  billDark: RGB; // shaded bill / nostril
  feet: RGB; // orange feet (locked)
  eye: RGB; // eye dot
  padGrass: RGB; // top of the grass pad
  padDark: RGB; // shaded pad underside / soil
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  plumageVolume: number; // 0..1 BOLD puff of the plumage (sleek spring → fluffy winter)
  glossAmt: number; // 0..1 glossy sheen on the plumage (peak in summer)
  frostAmt: number; // 0..1 frost sparkle on the plumage
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 blossom on the pad
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad
  breathFogAmt: number; // 0..1 breath puff at the bill
  scarfAmt: number; // 0..1 a little winter SCARF (tweened alpha)
  scarfColor: RGB; // scarf colour (locked red, fades in via alpha)
}

// Four BOLD season presets. The goose stays the SAME white long-necked
// orange-billed goose; only plumage volume + pad + light + gloss + dressing
// differ — pushed HARD so each season reads at a glance.
const SP: Record<SeasonName, P> = {
  // Spring — sleek clean white plumage; bright lime dewy pad + a blossom.
  // Cool-bright light.
  Spring: {
    bodyLight: [255, 255, 255],
    bodyMid: [238, 240, 242],
    bodyShade: [196, 202, 212],
    bill: [246, 150, 46],
    billDark: [196, 104, 28],
    feet: [240, 142, 44],
    eye: [40, 34, 30],
    padGrass: [128, 214, 84], // vivid fresh lime
    padDark: [74, 142, 56],
    outline: [70, 70, 84],
    lightWash: [200, 240, 255], // cool-bright
    lightWashAmt: 0.2,
    plumageVolume: 0.1, // BOLD: clearly sleek, very trim plumage
    glossAmt: 0.45,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.9,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  // Summer — brightest full glossy white PEAK; saturated mid-green pad; warm
  // strong light.
  Summer: {
    bodyLight: [255, 255, 255],
    bodyMid: [246, 248, 250],
    bodyShade: [206, 210, 218],
    bill: [252, 158, 42],
    billDark: [206, 110, 26],
    feet: [248, 150, 40],
    eye: [38, 32, 28],
    padGrass: [72, 184, 58], // saturated mid-green
    padDark: [44, 112, 40],
    outline: [74, 70, 78],
    lightWash: [255, 240, 178], // warm
    lightWashAmt: 0.22,
    plumageVolume: 0.5, // full normal plumage
    glossAmt: 1, // peak glossy sheen
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
  // leaf; dulled gloss.
  Autumn: {
    bodyLight: [255, 250, 238],
    bodyMid: [240, 232, 218],
    bodyShade: [198, 184, 168],
    bill: [240, 138, 40],
    billDark: [190, 96, 26],
    feet: [234, 132, 40],
    eye: [42, 32, 26],
    padGrass: [172, 142, 66], // olive-tan browning
    padDark: [108, 84, 44],
    outline: [78, 64, 60],
    lightWash: [255, 184, 96], // low amber, BOLD
    lightWashAmt: 0.32,
    plumageVolume: 0.66, // a touch fuller heading into cold
    glossAmt: 0.3, // dulled gloss
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.92,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  // Winter — FLUFFED puffy white feathers read against COOL blue shadows (not a
  // white-out); snow on the back, frost dusting, breath-fog at the bill, a
  // little SCARF, snowy pad. Body stays clearly white; bill stays orange.
  Winter: {
    bodyLight: [250, 252, 255],
    bodyMid: [224, 232, 244],
    bodyShade: [160, 178, 204], // cool blue shadow so white reads in snow
    bill: [238, 138, 48],
    billDark: [184, 96, 34],
    feet: [228, 126, 44],
    eye: [40, 38, 44],
    padGrass: [226, 238, 250], // snow on the pad
    padDark: [142, 164, 190],
    outline: [62, 64, 86],
    lightWash: [188, 212, 252], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    plumageVolume: 1, // BOLD: thick fluffy plumage
    glossAmt: 0.2,
    frostAmt: 0.82,
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
    bill: lerpRGB(a.bill, b.bill, t),
    billDark: lerpRGB(a.billDark, b.billDark, t),
    feet: lerpRGB(a.feet, b.feet, t),
    eye: lerpRGB(a.eye, b.eye, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    plumageVolume: lerp(a.plumageVolume, b.plumageVolume, t),
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
    lightWashAmt: clamp01(safeNum(p.lightWashAmt)),
    plumageVolume: clamp01(safeNum(p.plumageVolume)),
    glossAmt: clamp01(safeNum(p.glossAmt)),
    frostAmt: clamp01(safeNum(p.frostAmt)),
    backSnowAmt: clamp01(safeNum(p.backSnowAmt)),
    padSnowAmt: clamp01(safeNum(p.padSnowAmt)),
    blossomAmt: clamp01(safeNum(p.blossomAmt)),
    fallenLeafAmt: clamp01(safeNum(p.fallenLeafAmt)),
    breathFogAmt: clamp01(safeNum(p.breathFogAmt)),
    scarfAmt: clamp01(safeNum(p.scarfAmt)),
  };
}

// ── Goose geometry constants (the SAME silhouette every season) ──────────────
// Front-¾ view, turned ~15–20° toward lower-left. Body is a plump egg; the long
// neck rises from the upper-left of the body and curves to a small head with an
// orange bill pointing lower-left. Plumage VOLUME scales the body radii only.

const BODY_CX = 1.5; // body centre x (turned right, head reaches left)
const BODY_CY = 4.5; // body centre y
const BASE_BODY_RX = 13.5; // body half-width at unit volume
const BASE_BODY_RY = 11; // body half-height at unit volume
const TAIL_X = 15; // tail tip (upper-right)
const TAIL_Y = -1.5;

// Neck path anchors (base on upper-left of body → head lower-left at rest).
const NECK_BASE_X = -6;
const NECK_BASE_Y = -3;
const REST_HEAD_X = -13.5;
const REST_HEAD_Y = -14;
const HEAD_R = 4.4;

// ── Local paint helpers (driven only by `p` + `pose`) ───────────────────────

// volume scale: from clearly-sleek spring to thick fluffy winter
function bodyRadii(p: P): { rx: number; ry: number } {
  const vol = 0.92 + p.plumageVolume * 0.2;
  return { rx: BASE_BODY_RX * vol, ry: BASE_BODY_RY * vol };
}

/** Trace the plump body egg into the current path. */
function bodyPath(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number): void {
  const { rx, ry } = bodyRadii(p);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, -0.12, 0, Math.PI * 2);
}

// the low flat grass pad the goose stands on, plus seasonal pad dressing
function paintPad(ctx: CanvasRenderingContext2D, p: P): void {
  // soft contact shadow, offset to lower-right (light is upper-left)
  ctx.fillStyle = rgba(p.padDark, 0.4);
  ctx.beginPath();
  ctx.ellipse(3, 21.5, 16, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // shaded underside of the pad
  ctx.fillStyle = rgba(p.padDark, 1);
  ctx.beginPath();
  ctx.ellipse(0, 20.4, 18, 5.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // grass top
  ctx.fillStyle = rgba(p.padGrass, 1);
  ctx.beginPath();
  ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // tufted top edge — little blades around the upper rim
  ctx.strokeStyle = rgba(p.padDark, 1);
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
    ctx.fillStyle = rgba([246, 251, 255], 0.92 * p.padSnowAmt);
    ctx.beginPath();
    ctx.ellipse(0, 18.4, 17.4, 4.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([210, 226, 244], 0.5 * p.padSnowAmt);
    ctx.beginPath();
    ctx.ellipse(2, 20, 16, 3.4, 0, 0, Math.PI * 2);
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
  if (p.blossomAmt > 0.01) {
    const a = p.blossomAmt;
    for (const [bx, by, big] of [[-12, 18.5, 1], [11, 20, 0], [0, 21, 0]] as const) {
      const sc = big ? 1.3 : 1;
      ctx.fillStyle = rgba(big ? [255, 232, 246] : [255, 250, 252], 0.95 * a);
      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(bx + Math.cos(ang) * 1.5 * sc, by + Math.sin(ang) * 1.0 * sc, 1.1 * sc, 0.8 * sc, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = rgba([255, 214, 90], a);
      ctx.beginPath();
      ctx.arc(bx, by, 0.9 * sc, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // a BOLD fallen leaf (autumn)
  if (p.fallenLeafAmt > 0.01) {
    const a = p.fallenLeafAmt;
    const leaves: Array<[number, number, number, RGB]> = [
      [10, 20.4, 0.7, [214, 132, 40]],
      [-11, 20, -0.5, [192, 88, 34]],
      [1, 21, 0.2, [170, 76, 38]],
    ];
    for (const [lx, ly, rot, col] of leaves) {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.fillStyle = rgba(col, a);
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.0, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba([110, 58, 24], a);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-2.8, 0);
      ctx.lineTo(2.8, 0);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// the whole goose, standing front-¾ turned toward lower-left, posed by `pose`
function paintGoose(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  const bob = pose.bob;
  const { rx, ry } = bodyRadii(p);

  // Head travel from the pose: the long neck dips DOWN for the peck and reaches
  // UP & FORWARD for the honk. Body centre follows lean + bob.
  const bodyCx = BODY_CX + pose.lean * 0.4;
  const bodyCy = BODY_CY + bob + pose.lean * 0.2;
  const headX = REST_HEAD_X - pose.neckReach * 0.55 - pose.lean * 0.6;
  const headY = REST_HEAD_Y + bob + pose.neckDip - pose.neckReach * 0.85;
  const billTipX = headX - 7;
  const billTipY = headY + 2.5 + pose.neckDip * 0.1;

  // ── Contact shadow of the goose on the pad (lower-right) ──────────────────
  ctx.fillStyle = rgba(p.outline, 0.26);
  ctx.beginPath();
  ctx.ellipse(3, 15.5 + bob * 0.5, 13, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Orange feet on the pad (drawn before the body so it overlaps) ─────────
  const footY = 14 + bob * 0.4;
  ctx.strokeStyle = rgba(p.outline, 1);
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  for (const fx of [-3.5, 4]) {
    ctx.beginPath();
    ctx.moveTo(fx, 9 + bob);
    ctx.lineTo(fx + 0.6, footY);
    ctx.stroke();
  }
  ctx.fillStyle = rgba(p.feet, 1);
  for (const fx of [-3.5, 4]) {
    ctx.beginPath();
    ctx.moveTo(fx + 0.6, footY - 1.4);
    ctx.lineTo(fx - 2.4, footY + 1.6);
    ctx.lineTo(fx + 3.4, footY + 1.6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = rgba(p.feet, 1);
  ctx.lineWidth = 2;
  for (const fx of [-3.5, 4]) {
    ctx.beginPath();
    ctx.moveTo(fx, 9 + bob);
    ctx.lineTo(fx + 0.6, footY - 0.5);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // ── FAR WING flap (behind the body) — opens & beats during the honk ───────
  if (pose.wing > 0.01) {
    ctx.save();
    ctx.translate(bodyCx + 6, bodyCy - 2);
    ctx.rotate(-0.5 - pose.wing * 0.7);
    ctx.fillStyle = rgba(p.bodyShade, 0.95);
    ctx.beginPath();
    ctx.ellipse(6, 0, 9 + pose.wing * 3, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(p.outline, 0.5);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // The whole body+head are drawn under a squash/stretch transform centred on
  // the body, so the peck/honk read with anticipation squash + stretch.
  ctx.save();
  ctx.translate(bodyCx, bodyCy);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-bodyCx, -bodyCy);

  // ── Tail wedge (upper-right of body), flicks via pose ─────────────────────
  ctx.fillStyle = rgba(p.bodyShade, 1);
  ctx.beginPath();
  ctx.moveTo(bodyCx + 9, bodyCy - 6);
  ctx.lineTo(TAIL_X + 3 + pose.tail, TAIL_Y + bob - Math.abs(pose.tail) * 0.3);
  ctx.lineTo(bodyCx + 10, bodyCy + 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(p.outline, 1);
  ctx.lineWidth = 1;
  ctx.stroke();

  // ── Neck: dark outline pass then white fill (curves to the posed head) ────
  const neckPath = (): void => {
    ctx.beginPath();
    ctx.moveTo(NECK_BASE_X, NECK_BASE_Y + bobOffset);
    ctx.quadraticCurveTo(neckCtrlX, neckCtrlY, headX, headY);
  };
  const bobOffset = bob;
  // control point bows the neck: lower-left for the peck, high for the honk
  const neckCtrlX = (NECK_BASE_X + headX) / 2 - 3 - pose.neckReach * 0.2;
  const neckCtrlY = (NECK_BASE_Y + headY) / 2 + 1 + pose.neckDip * 0.25 - pose.neckReach * 0.15;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = rgba(p.outline, 1);
  ctx.lineWidth = 8.6;
  neckPath();
  ctx.stroke();
  ctx.strokeStyle = rgba(p.bodyMid, 1);
  ctx.lineWidth = 6.2;
  neckPath();
  ctx.stroke();
  // neck highlight on the lit (upper-left) side
  ctx.strokeStyle = rgba(p.bodyLight, 0.85);
  ctx.lineWidth = 2.2;
  neckPath();
  ctx.stroke();

  // ── Body: outline pass then white fill ────────────────────────────────────
  bodyPath(ctx, p, bodyCx, bodyCy);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = rgba(p.outline, 1);
  ctx.stroke();

  bodyPath(ctx, p, bodyCx, bodyCy);
  ctx.fillStyle = rgba(p.bodyMid, 1);
  ctx.fill();

  // body shading + lit face (clipped to the body)
  ctx.save();
  bodyPath(ctx, p, bodyCx, bodyCy);
  ctx.clip();
  // far/under side shade (lower-right)
  ctx.fillStyle = rgba(p.bodyShade, 0.9);
  ctx.beginPath();
  ctx.ellipse(bodyCx + 4, bodyCy + 5, rx, ry * 0.7, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // lit upper-left face
  const bg = ctx.createLinearGradient(bodyCx - rx, bodyCy - ry, bodyCx + rx, bodyCy + ry);
  bg.addColorStop(0, rgba(p.bodyLight, 1));
  bg.addColorStop(0.5, rgba(p.bodyMid, 1));
  bg.addColorStop(1, rgba(p.bodyShade, 1));
  ctx.fillStyle = bg;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(bodyCx - 3, bodyCy - 2, rx * 0.9, ry * 0.85, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // glossy sheen highlight (peak in summer) — a bright soft band on the lit back
  if (p.glossAmt > 0.02) {
    ctx.fillStyle = rgba([255, 255, 255], 0.32 * p.glossAmt);
    ctx.beginPath();
    ctx.ellipse(bodyCx - 4, bodyCy - 4, rx * 0.55, ry * 0.32, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // soft wing crease arc (feather seam) on the side
  ctx.strokeStyle = rgba(p.bodyShade, 0.7);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(bodyCx - 6, bodyCy - 3);
  ctx.quadraticCurveTo(bodyCx + 6, bodyCy - 1, bodyCx + 11, bodyCy + 4);
  ctx.stroke();
  // a couple soft feather lines under the wing
  ctx.strokeStyle = rgba(p.bodyShade, 0.5);
  ctx.lineWidth = 1.1;
  for (const dy of [3, 6]) {
    ctx.beginPath();
    ctx.moveTo(bodyCx - 3, bodyCy + dy);
    ctx.quadraticCurveTo(bodyCx + 7, bodyCy + dy, bodyCx + 11, bodyCy + dy + 1);
    ctx.stroke();
  }

  // winter frost dusting on the upward body
  if (p.frostAmt > 0.02) {
    ctx.fillStyle = rgba([214, 232, 250], 0.22 * p.frostAmt);
    ctx.beginPath();
    ctx.ellipse(bodyCx - 2, bodyCy - 5, rx * 0.85, ry * 0.45, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([240, 248, 255], 0.7 * p.frostAmt);
    for (const [sx, sy] of [[-6, -3], [-1, -5], [4, -4], [8, -1], [-3, -1], [2, -2]] as const) {
      ctx.beginPath();
      ctx.arc(bodyCx + sx, bodyCy + sy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore(); // end body clip

  // ── Winter FLUFF: soft puffy feather fringe around the body silhouette ────
  // additive soft fringe — the silhouette/outline itself is unchanged, the
  // plumage just reads BOLDLY puffier in winter.
  if (p.plumageVolume > 0.7) {
    const fl = (p.plumageVolume - 0.7) / 0.3; // 0..1 over the fluffy range
    ctx.save();
    ctx.strokeStyle = rgba([250, 253, 255], 0.5 * fl);
    ctx.lineWidth = 1.2;
    const n = 24;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const ax = bodyCx + Math.cos(ang) * rx;
      const ay = bodyCy + Math.sin(ang) * ry;
      const reach = (1.8 + 1.4 * Math.sin(i * 1.7)) * fl;
      const ox = ax + Math.cos(ang) * reach;
      const oy = ay + Math.sin(ang) * reach;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ox, oy);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Snow cap resting on the back (winter) — BOLD white cap ────────────────
  if (p.backSnowAmt > 0.02) {
    const a = p.backSnowAmt;
    ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
    ctx.beginPath();
    ctx.moveTo(bodyCx - 9, bodyCy - 8);
    ctx.quadraticCurveTo(bodyCx - 3, bodyCy - 13, bodyCx + 4, bodyCy - 11);
    ctx.quadraticCurveTo(bodyCx + 11, bodyCy - 9, bodyCx + 12, bodyCy - 5);
    ctx.quadraticCurveTo(bodyCx + 6, bodyCy - 7, bodyCx + 1, bodyCy - 6);
    ctx.quadraticCurveTo(bodyCx - 4, bodyCy - 5, bodyCx - 9, bodyCy - 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba([210, 226, 244], 0.5 * a);
    ctx.beginPath();
    ctx.ellipse(bodyCx - 1, bodyCy - 8, 8, 1.8, -0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── NEAR WING flap (over the body) — opens & beats during the honk ────────
  if (pose.wing > 0.01) {
    ctx.save();
    ctx.translate(bodyCx - 2, bodyCy);
    ctx.rotate(-0.2 - pose.wing * 0.55);
    ctx.fillStyle = rgba(p.bodyLight, 1);
    ctx.beginPath();
    ctx.ellipse(-7, 0, 9 + pose.wing * 3, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(p.outline, 0.6);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // a few feather lines on the open wing
    ctx.strokeStyle = rgba(p.bodyShade, 0.6);
    ctx.lineWidth = 0.9;
    for (const off of [-3, 0, 3]) {
      ctx.beginPath();
      ctx.moveTo(-3, off * 0.5);
      ctx.lineTo(-14, off);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── SCARF (winter) — a little knitted band around the neck base ───────────
  if (p.scarfAmt > 0.01) {
    const sx = NECK_BASE_X - 1.5;
    const sy = NECK_BASE_Y + bob + 1.5;
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // wrap band
    ctx.fillStyle = rgba(p.scarfColor, 1);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 5.2, 3.0, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // darker underside for depth
    ctx.fillStyle = rgba([
      Math.max(0, p.scarfColor[0] - 50),
      Math.max(0, p.scarfColor[1] - 30),
      Math.max(0, p.scarfColor[2] - 30),
    ], 1);
    ctx.beginPath();
    ctx.ellipse(sx + 0.4, sy + 1.6, 4.8, 1.6, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // hanging tail of the scarf with a fringe
    ctx.fillStyle = rgba(p.scarfColor, 1);
    ctx.beginPath();
    ctx.moveTo(sx - 3.4, sy + 1.2);
    ctx.lineTo(sx - 0.2, sy + 2.6);
    ctx.lineTo(sx - 1.6, sy + 8.4);
    ctx.lineTo(sx - 4.8, sy + 7.0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(p.scarfColor, 1);
    ctx.lineWidth = 0.9;
    ctx.lineCap = "round";
    for (const fx of [-4.4, -3.2, -2.0]) {
      ctx.beginPath();
      ctx.moveTo(sx + fx, sy + 7.4);
      ctx.lineTo(sx + fx - 0.3, sy + 9.0);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.restore();
  }

  // ── Head + orange bill (drawn over the neck top), posed ───────────────────
  const hx = headX;
  const hy = headY;
  // head outline
  ctx.fillStyle = rgba(p.outline, 1);
  ctx.beginPath();
  ctx.arc(hx, hy, HEAD_R + 0.9, 0, Math.PI * 2);
  ctx.fill();
  // head white
  ctx.fillStyle = rgba(p.bodyMid, 1);
  ctx.beginPath();
  ctx.arc(hx, hy, HEAD_R, 0, Math.PI * 2);
  ctx.fill();
  // head lit highlight (upper-left)
  ctx.fillStyle = rgba(p.bodyLight, 0.9);
  ctx.beginPath();
  ctx.arc(hx - 1.2, hy - 1.4, HEAD_R * 0.6, 0, Math.PI * 2);
  ctx.fill();
  // head under-shade
  ctx.fillStyle = rgba(p.bodyShade, 0.6);
  ctx.beginPath();
  ctx.ellipse(hx + 1, hy + 1.6, HEAD_R * 0.7, HEAD_R * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // orange bill pointing lower-left — upper + (honk-opened) lower mandible
  const btx = billTipX;
  const bty = billTipY;
  const gape = pose.honk * 3.2; // bill opens for the honk
  // upper mandible
  ctx.fillStyle = rgba(p.bill, 1);
  ctx.beginPath();
  ctx.moveTo(hx - 2.4, hy - 1.2);
  ctx.quadraticCurveTo(btx + 2, bty - 1.5, btx, bty - gape * 0.5);
  ctx.lineTo(btx + 1.5, bty + 0.6 - gape * 0.5);
  ctx.quadraticCurveTo(hx - 3.5, hy - 0.2, hx - 2.4, hy - 1.2);
  ctx.closePath();
  ctx.fill();
  // open-mouth dark interior when honking
  if (gape > 0.2) {
    ctx.fillStyle = rgba([120, 40, 36], 1);
    ctx.beginPath();
    ctx.moveTo(hx - 2.6, hy + 0.2);
    ctx.lineTo(btx + 1.0, bty - gape * 0.5 + 0.4);
    ctx.lineTo(btx + 1.4, bty + gape * 0.5 + 1.4);
    ctx.closePath();
    ctx.fill();
  }
  // lower mandible (drops with the gape)
  ctx.fillStyle = rgba(p.billDark, 1);
  ctx.beginPath();
  ctx.moveTo(hx - 2.4, hy + 0.8);
  ctx.quadraticCurveTo(btx + 2, bty + 1.6 + gape * 0.5, btx + 1.5, bty + 2.6 + gape);
  ctx.quadraticCurveTo(hx - 3.5, hy + 2.4 + gape * 0.4, hx - 2.4, hy + 0.8);
  ctx.closePath();
  ctx.fill();
  // nostril
  ctx.fillStyle = rgba(p.billDark, 1);
  ctx.beginPath();
  ctx.arc(hx - 5.5, hy - 0.2, 0.7, 0, Math.PI * 2);
  ctx.fill();
  // bill outline (upper edge)
  ctx.strokeStyle = rgba(p.outline, 0.7);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(hx - 2.4, hy - 1.2);
  ctx.quadraticCurveTo(btx + 2, bty - 1.5, btx, bty - gape * 0.5);
  ctx.stroke();

  // eye
  ctx.fillStyle = rgba(p.eye, 1);
  ctx.beginPath();
  ctx.arc(hx - 1.4, hy - 0.6, 1.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([255, 255, 255], 0.85);
  ctx.beginPath();
  ctx.arc(hx - 1.8, hy - 1.0, 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // end squash/stretch transform

  // ── Peck dust / ground-nibble specks (under the bill at the dip bottom) ───
  if (pose.peck > 0.02) {
    ctx.fillStyle = rgba(p.padDark, 0.6 * pose.peck);
    for (const [dx, dy] of [[-1, 2], [2, 3], [-3, 3]] as const) {
      ctx.beginPath();
      ctx.arc(billTipX + dx, billTipY + dy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── breath-fog puff at the bill (winter) — drawn OUTSIDE the squash so it
  // reads as air, not body. Static base puff + an exhale swell during action ──
  if (p.breathFogAmt > 0.01) {
    const reach = 3.6 + pose.fogPuff * 3.2;
    ctx.fillStyle = rgba([235, 244, 255], (0.34 + 0.3 * pose.fogPuff) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(billTipX - reach, billTipY + 0.4, 2.6 + pose.fogPuff * 2.0, 1.9 + pose.fogPuff * 1.4, 0.2, 0, Math.PI * 2);
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
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "butt";
    paintPad(ctx, p);
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
      const bx = BODY_CX;
      const by = BODY_CY;

      // Loose feather motes lifting off the thickening plumage — reads the coat
      // visibly fluffing/growing. Present in EVERY morph (deterministic in p).
      const fluff = trans * (0.4 + 0.6 * Math.max(0, b.plumageVolume - a.plumageVolume + 0.4));
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
        const hx = REST_HEAD_X - 7;
        const hy = REST_HEAD_Y + 2.5;
        ctx.fillStyle = rgba([235, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(hx - (4 + trans * 3), hy, 2.6 + trans * 1.8, 1.8 + trans * 1.2, 0.2, 0, Math.PI * 2);
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
