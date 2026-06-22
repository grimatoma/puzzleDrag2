// BOLD seasonal art for the HERD SHEEP board tile — a side-by-side decision
// prototype variant of `sheep.ts`. Same architecture (a single parameterized
// `paint(ctx, p, pose)` + four `P` presets + lerped transitions), but pushed
// HARD so the seasons read at a glance and the idle is a real, fun ACTION
// rather than a subtle breath.
//
// PALETTE LOCK: it is ALWAYS the same white, fluffy, dark-faced sheep. Seasons
// change only its fleece VOLUME (recently-shorn in spring → thick fluffy winter
// fleece), the pad colour, the light wash, and BOLD dressing — snow on the back,
// a little winter SCARF, a breath-fog puff, blossoms, a fallen leaf, frost. The
// animal's identity colours never change; the silhouette outline is identical
// for every `P` (only volume scales it).
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~1.0s): a CHEW — head/jaw bobs ~9px as it chews, with an
//     ear-flick and a tail wag.
//   • RARE  ~18s (win ~1.1s): a HOP — the whole sheep bounces ~15px up with a
//     squash before and a stretch during, then settles. The hop may lift
//     OUTSIDE the −24..+24 design box.
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
  jaw: number; // 0..1 jaw open amount for the chew
  earFlick: number; // 0..1 near-ear flick amount
  tail: number; // signed tail wag (design px sideways)
  fogPuff: number; // 0..1 extra breath-fog reach (winter chew exhale)
}

const REST: Pose = { lift: 0, squashX: 1, squashY: 1, headBob: 0, jaw: 0, earFlick: 0, tail: 0, fogPuff: 0 };

// Build a pose from the wall clock: a common CHEW every ~6s and a rare HOP
// every ~18s. Returns to REST (all zeros / unit scales) at every window edge.
function poseFromClock(t: number): Pose {
  const pose: Pose = { lift: 0, squashX: 1, squashY: 1, headBob: 0, jaw: 0, earFlick: 0, tail: 0, fogPuff: 0 };

  // COMMON ~6s: CHEW (win ~1.0s). Head bobs ~9px, jaw chatters, ear flicks,
  // tail wags. Built from raised-cosine windows → seamless. Phase 3.0 opens the
  // window at t≈3.0 (well clear of t=0, so anim(0) sits exactly at REST).
  const cq = actionQ(t, 6, 1.0, 3.0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window
    // two chew bobs within the window (head dips down ~9px at the peak)
    pose.headBob = env * (5.0 + 7.0 * Math.abs(Math.sin(cq * Math.PI * 2)));
    pose.jaw = env * (0.5 + 0.5 * Math.abs(Math.sin(cq * Math.PI * 2)));
    pose.earFlick = env;
    pose.tail = Math.sin(cq * Math.PI * 6) * env * 2.8; // a few wags sideways
    pose.fogPuff = env; // winter: an exhale puff as it chews
  }

  // RARE ~18s: HOP (win ~1.1s). Whole sheep bounces ~15px up with a squash
  // before and a stretch during. May lift OUTSIDE the design box.
  const hq = actionQ(t, 18, 1.1, 4.0);
  if (hq >= 0) {
    const s = hopShape(hq); // −0.18..+1 (crouch then arc)
    pose.lift = Math.max(0, s) * 15; // up to ~15px airborne
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
    // a little tail flag during the hop
    pose.tail += Math.sin(hq * Math.PI) * 1.4;
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────

interface P {
  fleeceLight: RGB; // bright top of the wool
  fleeceShadow: RGB; // shaded underside of the wool
  faceDark: RGB; // face + legs (the dark parts)
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  fleeceVolume: number; // 0..1 BOLD puff of the wool (thin spring → thick winter)
  frostAmt: number; // 0..1 frost sparkle on the fleece
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 blossoms on the pad
  fallenLeafAmt: number; // 0..1 fallen leaf on the pad
  breathFogAmt: number; // 0..1 breath puff at the nose
  scarfAmt: number; // 0..1 a little winter SCARF (tweened alpha)
  scarfColor: RGB; // scarf colour (locked red, fades in via alpha)
}

// Four BOLD season presets. The sheep stays the SAME white woolly dark-faced
// sheep; only volume + pad + light + dressing differ — pushed HARD so each
// season reads at a glance.
const SP: Record<SeasonName, P> = {
  Spring: {
    fleeceLight: [248, 250, 248],
    fleeceShadow: [206, 212, 214],
    faceDark: [58, 52, 56],
    padGrass: [118, 214, 78], // vivid fresh lime
    soil: [78, 140, 48],
    outline: [60, 54, 50],
    lightWash: [196, 240, 255], // cool-bright
    lightWashAmt: 0.2,
    fleeceVolume: 0.06, // BOLD: clearly recently-shorn, very thin coat
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.9,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  Summer: {
    fleeceLight: [252, 252, 248],
    fleeceShadow: [202, 202, 198],
    faceDark: [54, 48, 50],
    padGrass: [72, 184, 58], // saturated mid-green
    soil: [48, 116, 36],
    outline: [54, 48, 44],
    lightWash: [255, 238, 178], // warm
    lightWashAmt: 0.2,
    fleeceVolume: 0.5, // full normal fleece
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  Autumn: {
    fleeceLight: [244, 238, 226],
    fleeceShadow: [196, 186, 172],
    faceDark: [56, 46, 44],
    padGrass: [172, 138, 64], // olive-tan browning
    soil: [112, 82, 40],
    outline: [58, 46, 38],
    lightWash: [255, 184, 96], // low amber, BOLD
    lightWashAmt: 0.3,
    fleeceVolume: 0.78, // thicker
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.95,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [206, 64, 60],
  },
  Winter: {
    fleeceLight: [252, 253, 255],
    fleeceShadow: [202, 214, 230],
    faceDark: [60, 56, 64],
    padGrass: [226, 238, 250], // snow on the pad
    soil: [146, 166, 192],
    outline: [70, 70, 84],
    lightWash: [188, 212, 252], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    fleeceVolume: 1, // BOLD: thick fluffy fleece
    frostAmt: 0.85,
    backSnowAmt: 0.92,
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
    fleeceLight: lerpRGB(a.fleeceLight, b.fleeceLight, t),
    fleeceShadow: lerpRGB(a.fleeceShadow, b.fleeceShadow, t),
    faceDark: lerpRGB(a.faceDark, b.faceDark, t),
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
    scarfAmt: lerp(a.scarfAmt, b.scarfAmt, t),
    scarfColor: lerpRGB(a.scarfColor, b.scarfColor, t),
  };
}

// clamp every scalar field defensively (never throw on a wild `p`)
function clampP(p: P): P {
  return {
    ...p,
    lightWashAmt: clamp01(p.lightWashAmt),
    fleeceVolume: clamp01(p.fleeceVolume),
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

// the low flat grass pad the sheep stands on
function paintPad(ctx: CanvasRenderingContext2D, p: P): void {
  // soft contact shadow, offset to lower-right (light is upper-left)
  ctx.fillStyle = rgb([0, 0, 0], 0.18);
  ctx.beginPath();
  ctx.ellipse(3, 21, 17, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // shaded underside of the pad
  ctx.fillStyle = rgb(p.soil);
  ctx.beginPath();
  ctx.ellipse(0, 20.5, 18, 5.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // grass top
  ctx.fillStyle = rgb(p.padGrass);
  ctx.beginPath();
  ctx.ellipse(0, 19, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // tufted top edge
  ctx.strokeStyle = rgb(p.padGrass);
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
  ctx.fillStyle = rgb([255, 255, 255], 0.1);
  ctx.beginPath();
  ctx.ellipse(-5, 17.5, 9, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // snow blanket over the pad (winter) — BOLD coverage
  if (p.padSnowAmt > 0.001) {
    ctx.fillStyle = rgb([246, 251, 255], 0.92 * p.padSnowAmt);
    ctx.beginPath();
    ctx.ellipse(0, 18.4, 17.4, 4.9, 0, 0, Math.PI * 2);
    ctx.fill();
    // a few frost glints on the snow
    ctx.fillStyle = rgb([255, 255, 255], 0.8 * p.padSnowAmt);
    for (const [sx, sy] of [[-10, 19], [6, 20], [12, 18], [-2, 21]] as const) {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // BOLD blossoms (spring)
  if (p.blossomAmt > 0.001) {
    for (const [bx, by] of [[-12, 18.5], [9, 20], [0, 21], [14, 19], [-5, 20.4]] as const) {
      ctx.fillStyle = rgb([255, 244, 250], 0.95 * p.blossomAmt);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(bx + Math.cos(a) * 1.3, by + Math.sin(a) * 1.3, 1.0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = rgb([252, 208, 96], p.blossomAmt);
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
      ctx.fillStyle = rgb(col, p.fallenLeafAmt);
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.0, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgb([110, 58, 24], p.fallenLeafAmt);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-2.8, 0);
      ctx.lineTo(2.8, 0);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// one leg: a short dark cylinder with a hoof at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  ctx.strokeStyle = rgb(p.faceDark);
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // hoof
  ctx.fillStyle = rgb([28, 24, 26]);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 1.8, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// the fluffy fleece body — a lumpy cloud whose lumps grow BOLDLY with volume
function paintFleeceBody(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number, fill: string, scallop: number): void {
  // BOLD volume: from clearly-shorn slim to thick fluffy winter fleece
  const vol = 0.74 + p.fleeceVolume * 0.62;
  const rx = 13 * vol;
  const ry = 9.2 * vol;
  ctx.fillStyle = fill;
  // base body ellipse
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  // scalloped wool lumps around the perimeter — bigger with volume
  const lumps = 11;
  const lumpR = (1.8 + p.fleeceVolume * 2.6) * scallop;
  for (let i = 0; i < lumps; i++) {
    const a = (i / lumps) * Math.PI * 2 - Math.PI / 2;
    const lx = cx + Math.cos(a) * rx * 0.98;
    const ly = cy + Math.sin(a) * ry * 0.98;
    ctx.beginPath();
    ctx.arc(lx, ly, lumpR, 0, Math.PI * 2);
    ctx.fill();
  }
}

// the whole sheep, standing front-¾ turned toward lower-left, posed by `pose`
function paintSheep(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  // legs stay PLANTED on the pad (they don't lift with the hop — they stretch).
  // Compute a foot contact at the pad and a leg-top that rises with the body.
  const bx = -1;
  const bodyY = 4 - pose.lift; // body centre lifts during the hop
  const legTopBase = bodyY + 6; // where the legs meet the fleece

  // legs first (behind the fleece). Two back, two front.
  ctx.save();
  ctx.globalAlpha = 0.85;
  paintLeg(ctx, p, bx + 6.5, legTopBase, 18.5);
  paintLeg(ctx, p, bx - 7.5, legTopBase, 18.8);
  ctx.restore();
  paintLeg(ctx, p, bx + 3.5, legTopBase, 19.2);
  paintLeg(ctx, p, bx - 4.5, legTopBase, 19.4);

  // The whole upper body (fleece + head + dressing) is drawn under a
  // squash/stretch transform centred on the body, so the hop reads with
  // anticipation squash + airborne stretch.
  ctx.save();
  ctx.translate(bx, bodyY);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-bx, -bodyY);

  const by = bodyY;

  // FLEECE — dark outline pass, then shaded wool, then light wool (layered)
  paintFleeceBody(ctx, p, bx, by, rgb(p.outline), 1.18); // outline halo
  paintFleeceBody(ctx, p, bx, by, rgb(p.fleeceShadow), 1.0); // shaded wool
  ctx.save();
  ctx.translate(-1.4, -1.6);
  paintFleeceBody(ctx, p, bx, by, rgb(p.fleeceLight), 0.82);
  ctx.restore();

  // snow settled on the back (winter) — BOLD white cap on top of the fleece
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgb([248, 252, 255], 0.95 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 1, by - 8.2, 10 * (0.9 + p.fleeceVolume * 0.35), 4.0, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb([255, 255, 255], 0.9 * p.backSnowAmt);
    for (const [dx, dy] of [[-6, -9], [0, -9.8], [6, -8.6], [-2, -10.2]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.8 + p.fleeceVolume * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the fleece (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([255, 255, 255], 0.85 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-8, 0], [-3, 4], [4, -2], [8, 2], [0, -3], [-5, -5], [6, 5],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── HEAD (front-¾, lower-left) — dips/chews via pose ────────────────────────
  const hx = bx - 11;
  const hy = by + 2 + pose.headBob; // chew dips the head down

  // ears (dark), behind the face. The near (left) ear flicks up with the chew.
  ctx.fillStyle = rgb(p.faceDark);
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(hx + side * 2.6, hy - 4);
    const flick = side === -1 ? pose.earFlick * 0.7 : 0;
    ctx.rotate(side * 0.9 - 0.3 + side * flick);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.4, 1.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // a little wool tuft on the crown (between the ears) — keeps it woolly
  ctx.fillStyle = rgb(p.fleeceLight);
  ctx.beginPath();
  ctx.ellipse(hx, hy - 4.4, 3.4, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // face — a soft dark muzzle ovoid, tilted toward lower-left
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(0.28 + pose.headBob * 0.02);
  // outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.8, 5.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // face fill
  ctx.fillStyle = rgb(p.faceDark);
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.1, 4.9, 0, 0, Math.PI * 2);
  ctx.fill();
  // gentle cheek light (upper-left)
  ctx.fillStyle = rgb([255, 255, 255], 0.12);
  ctx.beginPath();
  ctx.ellipse(-1.4, -1.6, 2, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // eyes
  ctx.fillStyle = rgb([245, 245, 240]);
  for (const ex of [-1.6, 1.6]) {
    ctx.beginPath();
    ctx.arc(ex, -1.2, 1.05, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = rgb([20, 18, 20]);
  for (const ex of [-1.4, 1.8]) {
    ctx.beginPath();
    ctx.arc(ex, -1, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // jaw / mouth — opens as it chews
  if (pose.jaw > 0.01) {
    ctx.fillStyle = rgb([18, 16, 18]);
    ctx.beginPath();
    ctx.ellipse(0, 3.0, 1.4, 0.6 + pose.jaw * 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // nostrils on the muzzle
  ctx.fillStyle = rgb([18, 16, 18]);
  for (const ex of [-1.1, 1.1]) {
    ctx.beginPath();
    ctx.ellipse(ex, 3.2, 0.5, 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── SCARF (winter) — a little knitted band around the neck, below the head ──
  if (p.scarfAmt > 0.001) {
    const sx = hx + 4.6;
    const sy = hy - 0.8;
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // wrap band
    ctx.fillStyle = rgb(p.scarfColor);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 5.4, 3.0, 0.32, 0, Math.PI * 2);
    ctx.fill();
    // darker underside for depth
    ctx.fillStyle = rgb([
      Math.max(0, p.scarfColor[0] - 50),
      Math.max(0, p.scarfColor[1] - 30),
      Math.max(0, p.scarfColor[2] - 30),
    ]);
    ctx.beginPath();
    ctx.ellipse(sx + 0.6, sy + 1.4, 5.0, 1.6, 0.32, 0, Math.PI * 2);
    ctx.fill();
    // hanging tail of the scarf, with a knitted notch + fringe
    ctx.fillStyle = rgb(p.scarfColor);
    ctx.beginPath();
    ctx.moveTo(sx - 2.6, sy + 1.8);
    ctx.lineTo(sx + 1.0, sy + 2.4);
    ctx.lineTo(sx + 0.2, sy + 8.4);
    ctx.lineTo(sx - 3.2, sy + 7.6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgb([
      Math.max(0, p.scarfColor[0] - 60),
      Math.max(0, p.scarfColor[1] - 40),
      Math.max(0, p.scarfColor[2] - 40),
    ]);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sx - 1.4, sy + 3.2);
    ctx.lineTo(sx - 1.8, sy + 7.8);
    ctx.stroke();
    // fringe at the bottom
    ctx.strokeStyle = rgb(p.scarfColor);
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
  ctx.fillStyle = rgb(p.fleeceLight);
  ctx.beginPath();
  ctx.arc(bx + 12.5 + pose.tail, by - 1 - Math.abs(pose.tail) * 0.25, 2.4 + p.fleeceVolume * 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // end squash/stretch transform

  // breath-fog puff at the nose (winter) — drawn OUTSIDE the squash transform so
  // it reads as air, not body. Static base puff + an exhale swell during chew.
  if (p.breathFogAmt > 0.001) {
    const reach = 5.4 + pose.fogPuff * 3.2;
    ctx.fillStyle = rgb([235, 244, 255], (0.34 + 0.28 * pose.fogPuff) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(hx - reach, hy + 3.4, 3.0 + pose.fogPuff * 2.0, 2.0 + pose.fogPuff * 1.4, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// the overall colour-of-light wash, painted last over the whole tile
function paintLightWash(ctx: CanvasRenderingContext2D, p: P): void {
  if (p.lightWashAmt <= 0.001) return;
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = rgb(p.lightWash, p.lightWashAmt);
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
    paintSheep(ctx, p, pose);
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
// EXACTLY (drawn at REST, matching the idle hand-off). The fleece VOLUME leads
// (coat fluffs early); snow / frost / breath-fog / scarf LAG (settle late).
function makeTransition(fromIdx: 0 | 1 | 2) {
  const from = SEASON_NAMES[fromIdx];
  const to = SEASON_NAMES[fromIdx + 1];
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const p = clamp01(pp);
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
        ctx.fillStyle = rgb([255, 255, 255], 0.5 * fluff);
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
        ctx.fillStyle = rgb([255, 255, 255], 0.8 * trans * snowGain);
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
        const hy = by + 2;
        ctx.fillStyle = rgb([235, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(hx - (4 + trans * 3), hy + 3.4, 2.6 + trans * 1.8, 1.8 + trans * 1.2, 0.2, 0, Math.PI * 2);
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
