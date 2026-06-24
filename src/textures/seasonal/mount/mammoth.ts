// Production seasonal art for the MOUNT MAMMOTH board tile (`tile_mount_mammoth`)
// — the approved bold direction, mirroring the herd-sheep reference pattern. A
// single parameterized `paint(ctx, p, pose)` + four `P` presets + lerped
// transitions, pushed so the seasons read at a glance and the idle is a real,
// fun ACTION rather than a subtle breath.
//
// PALETTE LOCK: it is ALWAYS the same woolly MAMMOTH — a big shaggy
// REDDISH-BROWN furry body, a high DOMED head, a long curling TRUNK, two very
// long curved ivory TUSKS, small ears, stumpy legs, on a pad. The SILHOUETTE
// and the reddish-brown / ivory-tusk IDENTITY colours are constant across all
// four seasons. Seasons change only its fur VOLUME (it is ALWAYS woolly, just a
// touch shaggier/heavier in winter), the pad colour, the light wash, and BOLD
// dressing — snow on the back AND tusks, a little winter SCARF, a big breath-fog
// puff, blossoms, a fallen leaf, frost, gloss. The animal's identity colours
// never change; the silhouette is identical for every `P` (only volume scales).
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~0.95s): a TRUNK-SWAY — the trunk sways/curls ~10-14px, the
//     ear flaps, the head bobs slowly, with a small body squash.
//   • RARE  ~18s (win ~1.2s, phase +3s): a TRUMPET — the mammoth raises its trunk
//     high and trumpets, head up, with a weighty front stomp (~14-18px) then
//     settles (anticipation → raise trunk → trumpet → settle). May exit the box.
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

// guard a possibly non-finite number to a finite fallback
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

// Anticipation→action shape for the TRUMPET stomp: a brief weight-down crouch
// (negative) before the front-foot stomp/lift, then a clean settle. q∈[0,1].
// Returns a LIFT factor in roughly −0.2..+1 (negative = anticipation squash-down,
// positive = the weighty front rise of the trumpet).
function stompShape(q: number): number {
  if (q <= 0 || q >= 1) return 0;
  const antiEnd = 0.26; // first slice = crouch/anticipation
  if (q < antiEnd) {
    // dip down a little (anticipation), zero slope at q=0
    const a = q / antiEnd;
    return -0.2 * (0.5 - 0.5 * Math.cos(a * Math.PI));
  }
  // the heavy front rise + settle, zero at the seam to the crouch and at q=1
  const a = (q - antiEnd) / (1 - antiEnd);
  return Math.sin(a * Math.PI);
}

// ── The idle POSE (carries all action state into paint) ──────────────────────

interface Pose {
  bob: number; // whole-body vertical bob (design px, + = down) — slow head/body bob
  lean: number; // signed forward/back lean of the body (design px)
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  head: number; // signed head raise (design px, + = up) for the trumpet
  trunk: number; // signed trunk sway/raise driver (design px) — sway + trumpet raise
  ear: number; // 0..1 ear-flap amount
  tail: number; // signed tail flag (design px sideways)
  hop: number; // whole-body lift (design px, + = up) — the weighty trumpet stomp
}

const REST: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, trunk: 0, ear: 0, tail: 0, hop: 0 };

// Build a pose from the wall clock: a common TRUNK-SWAY every ~6s and a rare
// TRUMPET every ~18s. Returns to REST (all zeros / unit scales) at every window
// edge.
function poseFromClock(tIn: number): Pose {
  const t = safeNum(tIn, 0);
  const pose: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, trunk: 0, ear: 0, tail: 0, hop: 0 };

  // COMMON ~6s: TRUNK-SWAY (win ~0.95s). The trunk sways/curls ~10-14px, the ear
  // flaps, the head bobs slowly, small body squash. Built from raised-cosine
  // windows → seamless. Phase 0 keeps anim(0) at REST (window opens at t≈0 but
  // bump(0)=0, so the seam is exactly at rest).
  const cq = actionQ(t, 6, 0.95, 0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window
    // the trunk swings out then back across the window (a couple of sways)
    pose.trunk = env * Math.sin(cq * Math.PI * 2) * 13; // ~10-14px sway
    pose.head = -env * (1.4 + 1.2 * Math.abs(Math.sin(cq * Math.PI * 2))); // slow head bob (small raise)
    pose.bob = env * 1.6; // gentle body bob (heavy beast settling)
    pose.ear = env * (0.5 + 0.5 * Math.abs(Math.sin(cq * Math.PI * 2)));
    pose.tail = Math.sin(cq * Math.PI * 5) * env * 2.2; // a few flags sideways
    // a hair of body squash as the weight shifts with the sway
    pose.squashX = 1 + env * 0.03;
    pose.squashY = 1 - env * 0.03;
  }

  // RARE ~18s: TRUMPET (win ~1.2s, phase +3s). Anticipation → raise trunk high →
  // trumpet (head up) → settle, with a weighty front stomp (~14-18px). May exit
  // the design box at the apex (fine).
  const rq = actionQ(t, 18, 1.2, 3.0);
  if (rq >= 0) {
    const env = bump(rq); // overall gate 0→1→0 with ZERO slope at both edges
    // Every value-bearing term is multiplied by `env`, so the gesture (and its
    // velocity) is exactly 0 at the window seams — `stompShape` alone has a
    // non-zero slope at its endpoints, so it MUST be enveloped.
    const s = stompShape(rq) * env; // −0.2..+1 enveloped (seamless at both edges)
    pose.hop = Math.max(0, s) * 18; // up to ~18px weighty front rise (may exit box)
    if (s < 0) {
      // anticipation: weight-down crouch, squash wide
      const c = -s; // 0..~0.2
      pose.squashY = 1 - c * 0.9;
      pose.squashX = 1 + c * 0.7;
      pose.lean += c * 2.2; // weight shifts forward
    } else {
      // trumpeting: stretch tall, head and trunk raise high
      pose.squashY = 1 + s * 0.12;
      pose.squashX = 1 - s * 0.08;
    }
    // raise the trunk HIGH and curl it up to trumpet (drives the trunk tip up)
    pose.trunk += -env * 17; // big upward/curl raise (negative = up & in)
    pose.head += -env * 6; // head up
    pose.ear = Math.max(pose.ear, env); // ears flare with the trumpet
    pose.tail += Math.sin(rq * Math.PI) * env * 1.8; // a tail flag at the apex
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────
//
// IDENTITY colours (reddish-brown coat, ivory tusks, dark eye/feet) stay nearly
// constant; they live in P only so the light wash + coat thickness can nudge
// them very slightly between seasons. Everything that genuinely differs per
// season is the fur VOLUME + pad + light + dressing amounts.

interface P {
  coatLight: RGB; // lit top of the shaggy reddish-brown coat
  coatMid: RGB; // body reddish-brown tone
  coatShadow: RGB; // shaded underside of the coat
  tuskLight: RGB; // lit ivory tusk
  tuskShade: RGB; // shaded ivory tusk
  trunkShade: RGB; // shaded reddish-brown of the trunk underside
  darkPart: RGB; // eyes + feet (the dark hard parts)
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  furVolume: number; // 0..1 BOLD fur volume (always woolly; shaggiest in winter)
  gloss: number; // 0..1 glossy-coat sheen strength (summer peak warmth)
  frostAmt: number; // 0..1 frost sparkle on the coat (winter)
  backSnowAmt: number; // 0..1 snow settled on its back AND tusks (winter)
  padSnowAmt: number; // 0..1 snow blanket on the pad (winter, deeper = its element)
  blossomAmt: number; // 0..1 a blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 a fallen leaf on the pad / caught in fur (autumn)
  breathFogAmt: number; // 0..1 breath puff at the trunk (winter)
  scarfAmt: number; // 0..1 a little winter BOBBLE CAP (tweened alpha)
  scarfColor: RGB; // wool-cap colour (locked navy, fades in via alpha)
}

// Four BOLD season presets. The mammoth stays the SAME shaggy reddish-brown,
// ivory-tusked beast; only fur VOLUME + pad + light + dressing differ — pushed
// HARD so each season reads at a glance. Winter is its element — shaggiest coat,
// deepest pad snow, snow on the tusks, a scarf and a big breath puff.
const SP: Record<SeasonName, P> = {
  // Spring — slightly lighter/cleaner fur, a blossom on the pad, cool-bright light.
  Spring: {
    coatLight: [180, 116, 76],
    coatMid: [142, 82, 50],
    coatShadow: [96, 52, 30],
    tuskLight: [246, 238, 216],
    tuskShade: [206, 192, 158],
    trunkShade: [106, 60, 36],
    darkPart: [40, 28, 22],
    padGrass: [128, 210, 84], // bright lime fresh grass
    soil: [84, 134, 52],
    outline: [48, 28, 18],
    lightWash: [200, 240, 255], // cool-bright
    lightWashAmt: 0.2,
    furVolume: 0.42, // clean, slightly lighter coat (still clearly woolly)
    gloss: 0.3,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.9,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [48, 70, 140],
  },
  // Summer — full healthy fur (an ice-age beast in summer — a touch warm/panting),
  // glossy highlights, bright warm light — PEAK.
  Summer: {
    coatLight: [196, 124, 80],
    coatMid: [154, 88, 52],
    coatShadow: [102, 56, 32],
    tuskLight: [250, 242, 222],
    tuskShade: [208, 194, 160],
    trunkShade: [114, 64, 40],
    darkPart: [38, 26, 20],
    padGrass: [80, 178, 60], // saturated mid-green
    soil: [52, 116, 38],
    outline: [46, 28, 18],
    lightWash: [255, 240, 188], // bright warm — peak
    lightWashAmt: 0.22,
    furVolume: 0.58, // full healthy coat
    gloss: 0.9, // glossiest peak highlights
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [48, 70, 140],
  },
  // Autumn — warm reddish-tinted fur, a fallen leaf, dulled gloss, amber light.
  Autumn: {
    coatLight: [184, 104, 58],
    coatMid: [146, 74, 40],
    coatShadow: [98, 48, 26],
    tuskLight: [242, 228, 200],
    tuskShade: [200, 182, 146],
    trunkShade: [108, 54, 32],
    darkPart: [42, 30, 22],
    padGrass: [166, 138, 70], // olive-tan browning
    soil: [108, 82, 42],
    outline: [50, 28, 18],
    lightWash: [255, 192, 104], // low amber, BOLD
    lightWashAmt: 0.32,
    furVolume: 0.8, // thicker, warm reddish coat
    gloss: 0.3, // dulled gloss
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.95,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [48, 70, 140],
  },
  // Winter — PEAK shaggiest fur + snow on the back AND tusks + a winter SCARF + a
  // big breath-fog puff, heavy frost, deep snowy pad, cool blue-grey light. Its
  // element — clearly wintry, still the same mammoth.
  Winter: {
    coatLight: [160, 106, 74],
    coatMid: [126, 78, 50],
    coatShadow: [88, 54, 34],
    tuskLight: [252, 251, 244], // tusks bright in winter
    tuskShade: [214, 206, 186],
    trunkShade: [100, 58, 38],
    darkPart: [46, 36, 32],
    padGrass: [226, 238, 250], // deep snow on the pad
    soil: [148, 168, 192],
    outline: [54, 40, 30],
    lightWash: [190, 214, 252], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    furVolume: 1, // PEAK shaggiest coat (its element)
    gloss: 0.16,
    frostAmt: 0.85,
    backSnowAmt: 0.9,
    padSnowAmt: 0.95, // deeper snow
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.85,
    scarfAmt: 1, // a little scarf appears in winter
    scarfColor: [48, 70, 140],
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    coatLight: lerpRGB(a.coatLight, b.coatLight, t),
    coatMid: lerpRGB(a.coatMid, b.coatMid, t),
    coatShadow: lerpRGB(a.coatShadow, b.coatShadow, t),
    tuskLight: lerpRGB(a.tuskLight, b.tuskLight, t),
    tuskShade: lerpRGB(a.tuskShade, b.tuskShade, t),
    trunkShade: lerpRGB(a.trunkShade, b.trunkShade, t),
    darkPart: lerpRGB(a.darkPart, b.darkPart, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    furVolume: lerp(a.furVolume, b.furVolume, t),
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
    furVolume: clamp01(p.furVolume),
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

// the low flat grass pad the mammoth stands on
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

  // deep snow blanket over the pad (winter — its element, so a deeper mound)
  if (p.padSnowAmt > 0.001) {
    ctx.fillStyle = rgba([246, 251, 255], 0.9 * p.padSnowAmt);
    ctx.beginPath();
    ctx.ellipse(0, 18.2, 17.4, 5.2 * (0.7 + 0.3 * p.padSnowAmt), 0, 0, Math.PI * 2);
    ctx.fill();
    // a slightly mounded crest of deeper snow
    ctx.fillStyle = rgba([255, 255, 255], 0.6 * p.padSnowAmt);
    ctx.beginPath();
    ctx.ellipse(-2, 17.2, 12, 2.8, -0.04, 0, Math.PI * 2);
    ctx.fill();
    // a couple of frost glints on the snow
    ctx.fillStyle = rgba([255, 255, 255], 0.78 * p.padSnowAmt);
    for (const [sx, sy] of [[-10, 19], [6, 20], [12, 18], [0, 17]] as const) {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.85, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // a BOLD blossom on the pad (spring)
  if (p.blossomAmt > 0.001) {
    for (const [bx, by] of [[-12, 18.5], [10, 20], [0, 21], [14, 19]] as const) {
      ctx.fillStyle = rgba([255, 244, 250], 0.95 * p.blossomAmt);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(bx + Math.cos(a) * 1.3, by + Math.sin(a) * 1.3, 1.0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = rgba([252, 210, 100], p.blossomAmt);
      ctx.beginPath();
      ctx.arc(bx, by, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // a BOLD fallen leaf on the pad (autumn)
  if (p.fallenLeafAmt > 0.001) {
    const leaves: Array<[number, number, number, RGB]> = [
      [-12, 20, -0.5, [200, 96, 36]],
      [11, 20.5, 0.7, [216, 152, 52]],
      [2, 21, 0.2, [172, 80, 40]],
    ];
    for (const [lx, ly, rot, col] of leaves) {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.fillStyle = rgba(col, p.fallenLeafAmt);
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.8, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba([110, 58, 24], p.fallenLeafAmt);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-2.6, 0);
      ctx.lineTo(2.6, 0);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// one stumpy column leg with a dark padded foot at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number, vol: number): void {
  const w = 4.6 * (0.95 + vol * 0.18); // shaggier coat = fatter leg
  // outline column
  ctx.strokeStyle = rgba(p.outline);
  ctx.lineWidth = w + 1.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // shaded reddish-brown
  ctx.strokeStyle = rgba(p.coatShadow);
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY - 1.2);
  ctx.stroke();
  // lit front of the leg
  ctx.strokeStyle = rgba(p.coatMid);
  ctx.lineWidth = w * 0.6;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.18, topY + 1);
  ctx.lineTo(x - w * 0.18, baseY - 2);
  ctx.stroke();
  // dark padded foot
  ctx.fillStyle = rgba(p.darkPart);
  ctx.beginPath();
  ctx.ellipse(x, baseY, w * 0.6, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// Trace the mammoth's big barrel body path (constant silhouette). cx,cy = body
// centre. vol modestly puffs/shaggies the outline; the underlying shape stays.
function bodyPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, vol: number): void {
  const rx = 13.5 * (0.97 + vol * 0.14);
  const ry = 9.2 * (0.97 + vol * 0.16);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, -0.05, 0, Math.PI * 2);
}

// a soft shaggy fur fringe around an arc of the body — count/length scale with
// fur volume so the silhouette gains shag toward winter (always some shag).
function paintShag(ctx: CanvasRenderingContext2D, cx: number, cy: number, vol: number, col: RGB): void {
  const fr = clamp01(vol); // 0..1 shag strength (always at least a little)
  const rx = 13.5 * (0.97 + vol * 0.14);
  const ry = 9.2 * (0.97 + vol * 0.16);
  ctx.fillStyle = rgba(col, 0.9);
  for (let i = 0; i < 14; i++) {
    // lower-front belly arc, where the long fur hangs
    const a = Math.PI * 0.12 + (i / 13) * Math.PI * 1.0;
    const lx = cx + Math.cos(a) * rx * 1.02;
    const ly = cy + Math.sin(a) * ry * 1.02;
    const drop = (1.4 + 2.6 * fr) * (i % 2 ? 1 : 0.78);
    ctx.beginPath();
    ctx.moveTo(lx - 1.2, ly - 0.6);
    ctx.quadraticCurveTo(lx, ly + drop, lx + 1.2, ly - 0.6);
    ctx.closePath();
    ctx.fill();
  }
}

// the whole mammoth, standing front-¾ turned ~15-20° toward lower-left, posed by
// `pose`.
function paintMammoth(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  const vol = p.furVolume;

  // legs stay PLANTED on the pad (they don't lift with the trumpet stomp — they
  // stretch). Compute a body centre that lifts with the trumpet and bobs.
  const bx = 3;
  const bodyY = 1 - pose.hop + pose.bob + pose.lean * 0.2; // body centre lifts/bobs
  const legTopOff = 6; // where the legs meet the body

  // ── legs first (behind/under the body). Stumpy columns, planted feet. ───────
  ctx.save();
  ctx.globalAlpha = 0.92;
  paintLeg(ctx, p, bx + 9, bodyY + legTopOff, 19.0, vol); // far rear
  paintLeg(ctx, p, bx - 3, bodyY + legTopOff + 0.5, 19.2, vol); // far front
  ctx.restore();
  paintLeg(ctx, p, bx + 6, bodyY + legTopOff + 1, 19.8, vol); // near rear
  paintLeg(ctx, p, bx - 8, bodyY + legTopOff + 1, 20.0, vol); // near front

  // The whole upper body (barrel + head + trunk + tusks + dressing) is drawn
  // under a squash/stretch transform centred on the body, so the trumpet reads
  // with anticipation squash + trumpeting stretch.
  ctx.save();
  ctx.translate(bx, bodyY);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-bx, -bodyY);

  const by = bodyY;

  // tiny tuft tail behind the rump — flags via pose
  ctx.strokeStyle = rgba(p.coatShadow);
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx + 12.5, by + 1);
  ctx.quadraticCurveTo(bx + 14.5 + pose.tail, by + 5, bx + 13.5 + pose.tail, by + 9);
  ctx.stroke();
  ctx.fillStyle = rgba(p.darkPart, 0.9);
  ctx.beginPath();
  ctx.arc(bx + 13.5 + pose.tail, by + 9.6, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";

  // shaggy belly/back fur fringe UNDER the body fill (drawn first so it reads as
  // hanging behind the body edge). Scales with fur volume.
  paintShag(ctx, bx, by, vol, p.coatShadow);

  // ── BODY barrel — outline pass then layered light fill ──────────────────────
  // outline halo
  ctx.fillStyle = rgba(p.outline);
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(1.09, 1.12);
  ctx.translate(-bx, -by);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  ctx.restore();

  // shaded coat
  ctx.fillStyle = rgba(p.coatShadow);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  // mid coat
  ctx.fillStyle = rgba(p.coatMid);
  ctx.save();
  ctx.translate(-0.5, -0.5);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  ctx.restore();
  // lit coat, offset up-left (light from upper-left)
  ctx.save();
  ctx.fillStyle = rgba(p.coatLight);
  ctx.translate(-1.8, -2.0);
  bodyPath(ctx, bx, by, vol * 0.7);
  ctx.fill();
  ctx.restore();

  // long-fur strands streaking down the body (clipped to the barrel), denser
  // with fur volume — reads as the shaggy woolly hide.
  {
    ctx.save();
    bodyPath(ctx, bx, by, vol);
    ctx.clip();
    ctx.strokeStyle = rgba(p.coatShadow, 0.55 + 0.3 * vol);
    ctx.lineWidth = 1.0;
    ctx.lineCap = "round";
    const n = 5 + Math.round(vol * 6);
    for (let i = 0; i < n; i++) {
      const sx = bx - 11 + (i / Math.max(1, n - 1)) * 22;
      ctx.beginPath();
      ctx.moveTo(sx, by - 7);
      ctx.quadraticCurveTo(sx - 1.2, by, sx - 0.4, by + 8);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.restore();
  }

  // glossy coat sheen band over the back (summer peak — gloss strong)
  if (p.gloss > 0.02) {
    ctx.save();
    bodyPath(ctx, bx, by, vol);
    ctx.clip();
    ctx.fillStyle = rgba([255, 255, 255], 0.1 + 0.16 * p.gloss);
    ctx.beginPath();
    ctx.ellipse(bx - 2, by - 5.2, 10, 2.6, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // a fallen leaf caught in the back fur (autumn) — a second autumn cue on the body
  if (p.fallenLeafAmt > 0.001) {
    ctx.save();
    ctx.translate(bx + 4, by - 6.4);
    ctx.rotate(0.5);
    ctx.fillStyle = rgba([198, 100, 40], 0.92 * p.fallenLeafAmt);
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.4, 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba([110, 58, 24], p.fallenLeafAmt);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-2.2, 0);
    ctx.lineTo(2.2, 0);
    ctx.stroke();
    ctx.restore();
  }

  // snow settled on the back/dome (winter) — a soft white cap
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgba([248, 252, 255], 0.94 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 1, by - 7.6, 10 * (0.9 + vol * 0.2), 3.4, -0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.88 * p.backSnowAmt);
    for (const [dx, dy] of [[-6, -8.4], [0, -9.0], [6, -8.0]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.5 + vol * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the coat (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgba([255, 255, 255], 0.78 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-8, 0], [-2, 4], [4, -2], [9, 2], [0, -4], [-5, -6], [7, 4], [12, -1],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.75, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── HEAD (high DOMED head) — front-¾, lower-left; raises via pose ────────────
  const hx = bx - 13; // head centre
  const hy = by - 4 - pose.head; // head sits high and forward; raises on trumpet

  // domed-head outline + fill (a tall rounded dome above the trunk base)
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 7.6, 8.8, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.coatShadow);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 6.8, 8.0, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.coatMid);
  ctx.beginPath();
  ctx.ellipse(hx - 0.5, hy - 0.6, 6.2, 7.4, -0.05, 0, Math.PI * 2);
  ctx.fill();
  // lit dome (upper-left)
  ctx.fillStyle = rgba(p.coatLight);
  ctx.beginPath();
  ctx.ellipse(hx - 1.8, hy - 2.6, 4.0, 4.8, -0.05, 0, Math.PI * 2);
  ctx.fill();

  // the domed crest — a fur-tuft peak on top of the head (keeps it woolly)
  ctx.fillStyle = rgba(p.coatMid);
  ctx.beginPath();
  ctx.moveTo(hx - 3.4, hy - 6.4);
  ctx.quadraticCurveTo(hx - 1, hy - 10.4, hx + 1.4, hy - 6.0);
  ctx.quadraticCurveTo(hx - 1, hy - 7.2, hx - 3.4, hy - 6.4);
  ctx.closePath();
  ctx.fill();
  // a few crest strands of long hair, fuller with volume
  ctx.strokeStyle = rgba(p.coatShadow, 0.8);
  ctx.lineWidth = 0.9;
  ctx.lineCap = "round";
  for (const ox of [-2.4, -0.6, 1.2]) {
    ctx.beginPath();
    ctx.moveTo(hx + ox, hy - 6.6);
    ctx.lineTo(hx + ox - 0.4, hy - 9.0 - vol * 1.4 + Math.abs(ox) * 0.5);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // ── small EAR (one near ear visible, low on the back of the head) — flaps ───
  {
    ctx.save();
    ctx.translate(hx + 4.2, hy - 0.4);
    ctx.rotate(0.25 + pose.ear * 0.5);
    ctx.fillStyle = rgba(p.outline);
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.4, 3.0, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.coatShadow);
    ctx.beginPath();
    ctx.ellipse(-0.2, 0, 1.8, 2.4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // eye
  ctx.fillStyle = rgba(p.darkPart);
  ctx.beginPath();
  ctx.ellipse(hx - 2.4, hy - 1.2, 1.0, 1.2, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([255, 255, 255], 0.5);
  ctx.beginPath();
  ctx.arc(hx - 2.7, hy - 1.6, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // ── TUSKS — two very long curved ivory tusks sweeping down & forward, then
  //    curling back up. Drawn before the trunk so the trunk overlaps between
  //    them. The far tusk is dimmer/behind. ────────────────────────────────────
  const drawTusk = (rootX: number, rootY: number, spread: number, dim: number): void => {
    // outline
    ctx.strokeStyle = rgba(p.outline, dim);
    ctx.lineWidth = 3.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    ctx.quadraticCurveTo(rootX - 3 - spread, rootY + 9, rootX - 1 - spread, rootY + 15);
    ctx.quadraticCurveTo(rootX + 1 - spread, rootY + 19, rootX + 5 - spread * 0.5, rootY + 18);
    ctx.stroke();
    // shaded ivory
    ctx.strokeStyle = rgba(p.tuskShade, dim);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    ctx.quadraticCurveTo(rootX - 3 - spread, rootY + 9, rootX - 1 - spread, rootY + 15);
    ctx.quadraticCurveTo(rootX + 1 - spread, rootY + 19, rootX + 5 - spread * 0.5, rootY + 18);
    ctx.stroke();
    // lit ivory front
    ctx.strokeStyle = rgba(p.tuskLight, dim);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(rootX - 0.6, rootY + 1);
    ctx.quadraticCurveTo(rootX - 3.6 - spread, rootY + 9, rootX - 1.6 - spread, rootY + 14.5);
    ctx.stroke();
    // snow piled on the tusk (winter) — a little white cap on the upper curve
    if (p.backSnowAmt > 0.001) {
      ctx.fillStyle = rgba([248, 252, 255], 0.9 * p.backSnowAmt * dim);
      ctx.beginPath();
      ctx.ellipse(rootX - 1.6 - spread, rootY + 8, 2.0, 1.1, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineCap = "butt";
  };
  // far tusk (slightly behind/right, dimmer)
  drawTusk(hx + 3.2, hy + 4.4, -1.6, 0.85);
  // near tusk (lower-left, full bright)
  drawTusk(hx - 1.4, hy + 4.8, 2.0, 1.0);

  // ── TRUNK — a curling reddish-brown trunk hanging from the head between the
  //    tusks. `pose.trunk` swings/curls the lower segment (sway) AND raises it
  //    high (trumpet, large negative). ──────────────────────────────────────────
  {
    const sway = pose.trunk;
    const raise = Math.max(0, -sway); // a strong upward driver = trumpet raise
    const t0x = hx - 0.4; // trunk root under the dome
    const t0y = hy + 4.2;
    // tip swings sideways with sway and lifts/curls up high on a trumpet raise
    const tipX = hx - 6 + sway * 0.5 + raise * 0.3;
    const tipY = hy + 16 - raise * 1.4 + Math.max(0, sway) * 0.3;
    const midX = hx - 5 + sway * 0.4;
    const midY = hy + 11 - raise * 0.7;
    // outline
    ctx.strokeStyle = rgba(p.outline);
    ctx.lineWidth = 5.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(t0x, t0y);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    // curl the very tip back up (curls up more on a trumpet)
    ctx.quadraticCurveTo(tipX + 2.6, tipY + 2.6 - raise * 0.4, tipX + 3.8 + sway * 0.3, tipY - 0.4 - raise * 0.6);
    ctx.stroke();
    // shaded trunk
    ctx.strokeStyle = rgba(p.trunkShade);
    ctx.lineWidth = 4.0;
    ctx.beginPath();
    ctx.moveTo(t0x, t0y);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.quadraticCurveTo(tipX + 2.6, tipY + 2.6 - raise * 0.4, tipX + 3.8 + sway * 0.3, tipY - 0.4 - raise * 0.6);
    ctx.stroke();
    // lit front of the trunk
    ctx.strokeStyle = rgba(p.coatLight, 0.85);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(t0x - 1.2, t0y + 1);
    ctx.quadraticCurveTo(midX - 1.6, midY, tipX - 1, tipY - 1);
    ctx.stroke();
    // trunk ring creases (a few short cross-ticks for the segmented look)
    ctx.strokeStyle = rgba(p.outline, 0.5);
    ctx.lineWidth = 0.9;
    for (let i = 1; i <= 3; i++) {
      const tt = i / 4;
      const rxp = lerp(t0x, tipX, tt) + (tt * (1 - tt)) * (midX - (t0x + tipX) / 2) * 2;
      const ryp = lerp(t0y, tipY, tt) + (tt * (1 - tt)) * (midY - (t0y + tipY) / 2) * 2;
      ctx.beginPath();
      ctx.moveTo(rxp - 2, ryp);
      ctx.lineTo(rxp + 2, ryp);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  }

  // ── BOBBLE CAP (winter) — instead of a scarf, a chunky knitted WOOL CAP with
  //    a pom-pom, pulled down over the high domed head. Gated by the SAME winter
  //    `scarfAmt` tween, so it fades in seamlessly in winter and is absent every
  //    other season. `scarfColor` drives the wool.
  if (p.scarfAmt > 0.001) {
    const cx = hx - 0.6; // cap sits centred on the dome crown
    const cy = hy - 6.6; // up near the top of the dome
    const wool = p.scarfColor;
    const woolDark: RGB = [
      Math.max(0, wool[0] - 50),
      Math.max(0, wool[1] - 30),
      Math.max(0, wool[2] - 30),
    ];
    const woolDeep: RGB = [
      Math.max(0, wool[0] - 70),
      Math.max(0, wool[1] - 45),
      Math.max(0, wool[2] - 45),
    ];
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // rounded cap dome covering the crown
    ctx.fillStyle = rgba(wool);
    ctx.beginPath();
    ctx.ellipse(cx, cy, 7.0, 5.6, -0.05, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, cy, 7.0, 3.0, -0.05, 0, Math.PI);
    ctx.fill();
    // shaded lower-right of the cap dome for roundness
    ctx.fillStyle = rgba(woolDark);
    ctx.beginPath();
    ctx.ellipse(cx + 2.2, cy + 0.4, 4.0, 4.2, -0.05, -0.4, Math.PI * 0.9);
    ctx.fill();
    // knit ribbing lines up the cap
    ctx.strokeStyle = rgba(woolDeep, 0.7);
    ctx.lineWidth = 0.7;
    for (const rx of [-4.6, -2.4, 0, 2.4, 4.6]) {
      ctx.beginPath();
      ctx.moveTo(cx + rx * 0.5, cy - 4.4);
      ctx.lineTo(cx + rx, cy + 2.2);
      ctx.stroke();
    }
    // chunky folded brim band across the bottom of the cap
    ctx.fillStyle = rgba(woolDark);
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2.6, 7.4, 2.4, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(wool);
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2.0, 7.2, 1.7, -0.05, 0, Math.PI * 2);
    ctx.fill();
    // a few brim ribs
    ctx.strokeStyle = rgba(woolDeep, 0.6);
    ctx.lineWidth = 0.6;
    for (const rx of [-5, -3, -1, 1, 3, 5]) {
      ctx.beginPath();
      ctx.moveTo(cx + rx, cy + 1.4);
      ctx.lineTo(cx + rx, cy + 3.6);
      ctx.stroke();
    }
    // pom-pom bobble on top
    ctx.fillStyle = rgba(woolDark);
    ctx.beginPath();
    ctx.arc(cx - 1.2, cy - 5.6, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(wool);
    ctx.beginPath();
    ctx.arc(cx - 1.2, cy - 5.8, 1.9, 0, Math.PI * 2);
    ctx.fill();
    // fluffy bobble strands
    ctx.strokeStyle = rgba(woolDeep, 0.7);
    ctx.lineWidth = 0.5;
    ctx.lineCap = "round";
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx - 1.2 + Math.cos(a) * 1.0, cy - 5.8 + Math.sin(a) * 1.0);
      ctx.lineTo(cx - 1.2 + Math.cos(a) * 2.3, cy - 5.8 + Math.sin(a) * 2.3);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.restore();
  }

  ctx.restore(); // end squash/stretch transform

  // breath-fog puff at the trunk tip (winter) — drawn OUTSIDE the squash
  // transform so it reads as air, not body. Static base puff + a bigger swell on
  // the trumpet exhale. Recompute the (unsquashed) tip position from the pose.
  if (p.breathFogAmt > 0.001) {
    const sway = pose.trunk;
    const raise = Math.max(0, -sway);
    const hxF = bx - 13;
    const hyF = bodyY - 4 - pose.head;
    const tipX = hxF - 6 + sway * 0.5 + raise * 0.3;
    const tipY = hyF + 16 - raise * 1.4 + Math.max(0, sway) * 0.3;
    const exhale = clamp01(raise / 17); // a big puff during the trumpet
    const reach = 5.0 + exhale * 4.0;
    ctx.fillStyle = rgba([235, 244, 255], (0.34 + 0.3 * exhale) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(tipX + reach, tipY - 1.4, 3.0 + exhale * 2.4, 2.0 + exhale * 1.6, 0.2, 0, Math.PI * 2);
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
    ctx.lineJoin = "round";
    paintPad(ctx, p);
    paintMammoth(ctx, p, pose);
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
// EXACTLY (drawn at REST, matching the idle hand-off). The fur VOLUME leads
// (coat fluffs early); snow / frost / breath-fog / scarf LAG (settle late).
function makeTransition(fromIdx: 0 | 1 | 2) {
  const from = SEASON_NAMES[fromIdx];
  const to = SEASON_NAMES[fromIdx + 1];
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const p = clamp01(safeNum(pp, 0));
    const kBase = smoother(p);
    const kCoat = biasedEase(p, 0.62); // fur volume LEADS
    const kSnow = biasedEase(p, 1.7); // snow / frost / fog / scarf LAG

    const a = SP[from];
    const b = SP[to];
    const blended: P = lerpP(a, b, kBase);
    blended.furVolume = lerp(a.furVolume, b.furVolume, kCoat);
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
      const bx = 3;
      const by = 1;

      // Loose fur motes lifting off the thickening coat — reads the fur visibly
      // fluffing/growing. Present in EVERY morph (deterministic in p).
      const fluff = trans * (0.4 + 0.6 * Math.max(0, b.furVolume - a.furVolume + 0.4));
      if (fluff > 0.01) {
        ctx.fillStyle = rgba([
          Math.round((a.coatLight[0] + b.coatLight[0]) / 2),
          Math.round((a.coatLight[1] + b.coatLight[1]) / 2),
          Math.round((a.coatLight[2] + b.coatLight[2]) / 2),
        ], 0.55 * fluff);
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
        const hx = bx - 13;
        const hy = by - 4;
        const tipX = hx - 6;
        const tipY = hy + 16;
        ctx.fillStyle = rgba([235, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(tipX + (5 + trans * 3), tipY - 1.4, 2.6 + trans * 1.8, 1.8 + trans * 1.2, 0.2, 0, Math.PI * 2);
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
