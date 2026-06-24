// Production seasonal art for the MOUNT DONKEY board tile (`tile_mount_donkey`) —
// the approved bold direction, mirroring the herd-sheep reference pattern. A
// single parameterized `paint(ctx, p, pose)` + four `P` presets + lerped
// transitions, pushed so the seasons read at a glance and the idle is a real,
// fun ACTION rather than a subtle breath.
//
// PALETTE LOCK: it is ALWAYS the same stocky GREY donkey — a grey body, a PALE
// muzzle + belly, VERY LONG upright EARS, a SHORT DARK upright mane and a DARK
// DORSAL STRIPE down the spine, slender legs with dark hooves, and a tufted
// tail. The SILHOUETTE and the grey / pale-muzzle / dark-mane IDENTITY colours
// are constant across all seasons. Only the COAT VOLUME (sleek in spring →
// shaggier & fluffed in winter), the pad colour, the light wash, gloss, and
// BOLD dressing — snow on the back, a little winter SCARF, a breath-fog puff,
// blossom, fallen leaf, frost — change. The donkey is never recoloured,
// hollowed, or swapped; it stays grey with long ears + a dorsal stripe every
// season. Never morph it into another animal.
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~0.95s): a HEAD-BOB + big EAR-SWIVEL — the head dips/bobs
//     ~12px while the very long ears swivel/flick (lean into the ears, they're
//     the charm), with a tail swish and a small body squash.
//   • RARE  ~18s (win ~1.2s, phase +3s): a BRAY head-raise / back-kick — the
//     donkey lifts its head to bray (ears back, mouth open) and gives a little
//     back-kick (~16px) then settles (anticipation → bray/kick → settle). May
//     exit the box at the apex (fine).
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

// guard a non-finite scalar (t / p coming in wild) → a safe finite number
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

// Anticipation→action shape for the BRAY/KICK: a brief gather (negative) before
// the burst, then a clean arc and settle. q∈[0,1]. Returns a factor in roughly
// −0.18..+1 (negative = gather/crouch, positive = the burst at apex).
function burstShape(q: number): number {
  if (q <= 0 || q >= 1) return 0;
  const antiEnd = 0.24; // first slice = gather/anticipation
  if (q < antiEnd) {
    const a = q / antiEnd;
    return -0.18 * (0.5 - 0.5 * Math.cos(a * Math.PI));
  }
  const a = (q - antiEnd) / (1 - antiEnd);
  return Math.sin(a * Math.PI);
}

// ── The idle POSE (carries all action state into paint) ──────────────────────

interface Pose {
  bob: number; // head/body vertical dip (design px, + = down) — the head-bob
  lean: number; // small whole-body lean (design px sideways)
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  head: number; // head lift (design px, + = up) — the bray head-raise
  chew: number; // 0..1 mouth-open amount (bray)
  ear: number; // signed ear swivel (radians-ish; + = swivel back, − = perk)
  tail: number; // signed tail swish (design px sideways)
  hop: number; // back-kick lift / impulse (design px, + = up) — the kick
}

const REST: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, chew: 0, ear: 0, tail: 0, hop: 0 };

// Build a pose from the wall clock: a common HEAD-BOB + EAR-SWIVEL every ~6s and
// a rare BRAY/KICK every ~18s. Returns to REST (all zeros / unit scales) at
// every window edge.
function poseFromClock(tIn: number): Pose {
  const t = safeNum(tIn, 0);
  const pose: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, chew: 0, ear: 0, tail: 0, hop: 0 };

  // COMMON ~6s: HEAD-BOB + big EAR-SWIVEL (win ~0.95s). The head dips ~12px, the
  // long ears swivel/flick, the tail swishes, a small body squash. Built from
  // raised-cosine windows → seamless. Phase 3.0 opens the window at t≈3.0 (well
  // clear of t=0, so anim(0) sits exactly at REST).
  const cq = actionQ(t, 6, 0.95, 3.0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window
    // a couple of head dips within the window (down ~10–14px at the peak)
    pose.bob = env * (5.0 + 8.0 * Math.abs(Math.sin(cq * Math.PI * 2)));
    // BIG ear swivel — the ears swing back then perk, the charm of the gesture
    pose.ear = Math.sin(cq * Math.PI * 2) * env * 0.6;
    pose.tail = Math.sin(cq * Math.PI * 6) * env * 3.0; // a few tail swishes
    // small body squash as the head goes down
    pose.squashY = 1 - env * 0.05;
    pose.squashX = 1 + env * 0.04;
  }

  // RARE ~18s: BRAY head-raise + back-KICK (win ~1.2s, phase +3 from the common
  // window). Anticipation gather → bray/kick burst → settle. May exit the box.
  const hq = actionQ(t, 18, 1.2, 6.0);
  if (hq >= 0) {
    const s = burstShape(hq); // −0.18..+1 (gather then burst)
    const burst = Math.max(0, s);
    // head LIFTS to bray (up ~14px at apex)
    pose.head = burst * 14;
    // mouth opens to bray, peaking with the head-raise
    pose.chew = burst;
    // ears go BACK during the bray
    pose.ear += -burst * 0.7;
    // a little back-KICK impulse layered in (rear lifts ~16px)
    pose.hop = burst * 16;
    if (s < 0) {
      // anticipation gather: crouch down/wide
      const c = -s; // 0..0.18
      pose.squashY = Math.min(pose.squashY, 1 - c * 0.85);
      pose.squashX = Math.max(pose.squashX, 1 + c * 0.65);
    } else {
      // burst: stretch tall/narrow at the apex
      pose.squashY = 1 + s * 0.12;
      pose.squashX = 1 - s * 0.08;
    }
    // tail flags during the kick
    pose.tail += Math.sin(hq * Math.PI) * 2.0;
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────
//
// IDENTITY colours (grey coat, pale muzzle/belly, dark mane/stripe, dark
// hooves/eyes) stay nearly constant; they live in P only so the light wash +
// coat thickness can nudge them very slightly between seasons. Everything that
// genuinely differs per season is the coat volume + gloss + pad + light +
// dressing.

interface P {
  coatLight: RGB; // lit top of the grey coat
  coatMid: RGB; // body grey tone
  coatShadow: RGB; // shaded underside of the grey coat
  belly: RGB; // pale muzzle + belly + inner ear (locked pale)
  mane: RGB; // dark upright mane + dorsal stripe + tail tuft (locked dark)
  maneShade: RGB; // deeper shade inside the mane / tuft
  hoofDark: RGB; // hooves + eyes (the dark hard parts)
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  coatVolume: number; // 0..1 BOLD coat thickness (sleek spring → shaggy winter)
  gloss: number; // 0..1 coat sheen strength (summer peak)
  frostAmt: number; // 0..1 frost sparkle on the coat
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 a blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 a fallen leaf on the pad (autumn)
  breathFogAmt: number; // 0..1 breath puff at the muzzle (winter)
  scarfAmt: number; // 0..1 a little winter SCARF (tweened alpha)
  scarfColor: RGB; // scarf colour (locked cream-knit, fades in via alpha)
}

// Four BOLD season presets. The donkey stays the SAME grey, pale-muzzled,
// long-eared, dark-maned donkey; only coat volume + gloss + pad + light +
// dressing differ — pushed HARD so each season reads at a glance.
const SP: Record<SeasonName, P> = {
  // Spring — sleeker grey coat, dewy lime pad + a blossom, cool-bright light.
  Spring: {
    coatLight: [176, 176, 180],
    coatMid: [140, 140, 146],
    coatShadow: [98, 98, 106],
    belly: [216, 212, 206],
    mane: [60, 56, 56],
    maneShade: [38, 36, 38],
    hoofDark: [46, 42, 44],
    padGrass: [124, 212, 82], // BOLD bright lime dewy grass
    soil: [82, 138, 50],
    outline: [54, 50, 52],
    lightWash: [208, 240, 255], // cool-bright
    lightWashAmt: 0.2,
    coatVolume: 0.08, // BOLD: clearly sleek, shed-out spring coat
    gloss: 0.35,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [224, 206, 160],
  },
  // Summer — glossy grey coat (PEAK), saturated mid-green pad, bright warm light.
  Summer: {
    coatLight: [188, 186, 188],
    coatMid: [150, 148, 152],
    coatShadow: [100, 98, 104],
    belly: [224, 220, 212],
    mane: [56, 52, 52],
    maneShade: [34, 32, 34],
    hoofDark: [42, 38, 40],
    padGrass: [80, 178, 60], // saturated mid-green
    soil: [54, 116, 38],
    outline: [50, 46, 48],
    lightWash: [255, 240, 188], // bright warm — peak
    lightWashAmt: 0.22,
    coatVolume: 0.42, // normal full coat
    gloss: 1, // glossiest peak
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [224, 206, 160],
  },
  // Autumn — warm-tinted fuller coat, olive-tan browning pad, a fallen leaf,
  // dulled gloss, amber light.
  Autumn: {
    coatLight: [180, 172, 164],
    coatMid: [144, 136, 130],
    coatShadow: [100, 90, 88],
    belly: [218, 208, 192],
    mane: [58, 52, 48],
    maneShade: [36, 32, 30],
    hoofDark: [46, 40, 40],
    padGrass: [166, 138, 70], // olive-tan browning, BOLD
    soil: [110, 84, 42],
    outline: [52, 46, 44],
    lightWash: [255, 188, 104], // low amber, BOLD
    lightWashAmt: 0.3,
    coatVolume: 0.7, // thicker
    gloss: 0.3, // dulled gloss
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.9,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [224, 206, 160],
  },
  // Winter — SHAGGIER thick fluffed coat + back-snow + a SCARF + breath fog,
  // snowy pad, frost, cool blue-grey light.
  Winter: {
    coatLight: [188, 192, 200],
    coatMid: [148, 152, 160],
    coatShadow: [102, 106, 116],
    belly: [226, 228, 230],
    mane: [62, 60, 64],
    maneShade: [40, 38, 42],
    hoofDark: [50, 46, 48],
    padGrass: [224, 236, 248], // snow on the pad
    soil: [148, 168, 192],
    outline: [60, 58, 64],
    lightWash: [192, 214, 252], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    coatVolume: 1, // BOLD: thick shaggy fluffed coat
    gloss: 0.18,
    frostAmt: 0.82,
    backSnowAmt: 0.9,
    padSnowAmt: 0.95,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.85,
    scarfAmt: 1, // a little scarf appears in winter
    scarfColor: [224, 206, 160],
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    coatLight: lerpRGB(a.coatLight, b.coatLight, t),
    coatMid: lerpRGB(a.coatMid, b.coatMid, t),
    coatShadow: lerpRGB(a.coatShadow, b.coatShadow, t),
    belly: lerpRGB(a.belly, b.belly, t),
    mane: lerpRGB(a.mane, b.mane, t),
    maneShade: lerpRGB(a.maneShade, b.maneShade, t),
    hoofDark: lerpRGB(a.hoofDark, b.hoofDark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    coatVolume: lerp(a.coatVolume, b.coatVolume, t),
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
    coatVolume: clamp01(p.coatVolume),
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

// the low flat grass pad the donkey stands on
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

// one slender leg: a thin grey cannon with a dark hoof at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  // grey leg with outline
  ctx.strokeStyle = rgba(p.outline);
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  ctx.strokeStyle = rgba(p.coatShadow);
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY - 1.4);
  ctx.stroke();
  // dark hoof
  ctx.fillStyle = rgba(p.hoofDark);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 1.7, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// Trace the donkey's barrel body path (constant silhouette). cx,cy = body
// centre. vol modestly puffs/fluffs the outline; the underlying shape is
// constant. The donkey is a touch stockier/rounder than a horse.
function bodyPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, vol: number): void {
  const rx = 12.0 * (0.97 + vol * 0.14);
  const ry = 8.2 * (0.97 + vol * 0.16);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, -0.05, 0, Math.PI * 2);
}

// the whole donkey, standing front-¾ turned ~15-20° toward lower-left, posed by
// `pose`
function paintDonkey(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  // legs stay PLANTED on the pad (they don't lift with the kick — the rear
  // stretches). Compute a body centre that lifts with the kick impulse.
  const bx = 2;
  const bodyY = 2 - pose.hop * 0.5; // body centre lifts a touch on the kick
  const vol = p.coatVolume;

  // legs first (behind the body). Two far (dimmer/higher), two near. The rear
  // (right-side) legs kick UP during the bray/kick; fronts stay planted.
  const rearTop = bodyY + 5.8 - pose.hop; // rear legs lift with the kick
  ctx.save();
  ctx.globalAlpha = 0.9;
  paintLeg(ctx, p, bx + 8, rearTop, 18.8 - pose.hop * 0.6);
  paintLeg(ctx, p, bx - 4, bodyY + 5.8, 19.0);
  ctx.restore();
  // near legs (toward lower-left, slightly forward)
  paintLeg(ctx, p, bx + 5.5, rearTop, 19.6 - pose.hop * 0.5);
  paintLeg(ctx, p, bx - 6.5, bodyY + 6.2, 19.8);

  // The whole upper body (barrel + neck + head + dressing) is drawn under a
  // squash/stretch transform centred on the body, so the gestures read with
  // anticipation squash + apex stretch.
  ctx.save();
  ctx.translate(bx + pose.lean, bodyY);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-bx, -bodyY);

  const by = bodyY;

  // ── TAIL — drawn behind the body, hanging from the upper-right rump.
  //    A slim dark switch ending in a dark TUFT. pose.tail swings the tip. ──────
  {
    const tx0 = bx + 10.5;
    const ty0 = by - 3.5;
    const tipX = tx0 + 3 + pose.tail * 1.6;
    const tipY = by + 12.5 - pose.hop * 0.6;
    // slim grey switch (the dock is coat-coloured), then dark toward the tuft
    ctx.strokeStyle = rgba(p.coatShadow);
    ctx.lineWidth = 2.6 * (0.9 + vol * 0.2);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tx0, ty0);
    ctx.quadraticCurveTo(tx0 + 4 + pose.tail, by + 4, tipX, tipY - 2);
    ctx.stroke();
    // dark tail TUFT at the tip (donkey signature)
    ctx.fillStyle = rgba(p.maneShade);
    ctx.beginPath();
    ctx.ellipse(tipX, tipY, 2.2, 3.2, 0.1 + pose.tail * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(p.mane, 0.9);
    ctx.lineWidth = 1.0;
    for (const off of [-1.4, 0, 1.6]) {
      ctx.beginPath();
      ctx.moveTo(tipX + off * 0.5, tipY - 2);
      ctx.quadraticCurveTo(tipX + off, tipY + 1, tipX + off * 1.2, tipY + 3.4);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  }

  // ── BODY barrel — outline pass then layered light fill ──────────────────────
  // outline halo
  ctx.fillStyle = rgba(p.outline);
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(1.1, 1.14);
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
  ctx.translate(-0.4, -0.4);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  ctx.restore();
  // lit coat, offset up-left (light from upper-left)
  ctx.save();
  ctx.fillStyle = rgba(p.coatLight);
  ctx.translate(-1.6, -1.8);
  bodyPath(ctx, bx, by, vol * 0.7);
  ctx.fill();
  ctx.restore();

  // pale belly + lower-flank patch (donkey signature — light underside)
  ctx.save();
  bodyPath(ctx, bx, by, vol);
  ctx.clip();
  ctx.fillStyle = rgba(p.belly, 0.92);
  ctx.beginPath();
  ctx.ellipse(bx - 1, by + 4.4, 9.5, 4.2, -0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── DORSAL STRIPE — a dark line running along the spine (donkey signature).
  //    Curves with the barrel's top; locked dark. ──────────────────────────────
  ctx.strokeStyle = rgba(p.mane, 0.85);
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx - 9, by - 5.4);
  ctx.quadraticCurveTo(bx, by - 8.4, bx + 10.5, by - 3.6);
  ctx.stroke();
  ctx.lineCap = "butt";

  // coat sheen band over the back (summer peak — gloss strong)
  if (p.gloss > 0.02) {
    ctx.save();
    bodyPath(ctx, bx, by, vol);
    ctx.clip();
    ctx.fillStyle = rgba([255, 255, 255], 0.12 + 0.2 * p.gloss);
    ctx.beginPath();
    ctx.ellipse(bx - 2, by - 4.6, 8.6, 2.4, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // SHAGGY winter coat fringe: a few soft tufts along the lower/belly edge,
  // only when the coat is thick (vol high). Constant silhouette otherwise.
  if (vol > 0.5) {
    const fr = (vol - 0.5) / 0.5;
    ctx.fillStyle = rgba(p.coatShadow, 0.9);
    const rx = 12.0 * (0.97 + vol * 0.14);
    const ry = 8.2 * (0.97 + vol * 0.16);
    for (let i = 0; i < 10; i++) {
      const a = Math.PI * 0.12 + (i / 9) * Math.PI * 0.95; // lower-front arc
      const lx = bx + Math.cos(a) * rx * 1.02;
      const ly = by + Math.sin(a) * ry * 1.02;
      ctx.beginPath();
      ctx.arc(lx, ly, (1.3 + 1.1 * fr) * (i % 2 ? 1 : 0.8), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // snow settled on the back (winter) — a soft white cap on top of the back
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgba([248, 252, 255], 0.94 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx, by - 7.0, 8.8 * (0.9 + vol * 0.25), 3.2, -0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.88 * p.backSnowAmt);
    for (const [dx, dy] of [[-5, -7.8], [1, -8.4], [6, -7.4], [-1, -9]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.5 + vol * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the coat (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgba([255, 255, 255], 0.82 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-7, 0], [-2, 4], [4, -2], [8, 2], [0, -3], [-4, -5], [6, 4],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── NECK + HEAD (front-¾, lower-left). A blocky grey head with a pale muzzle,
  //    VERY LONG upright ears, and a short upright dark mane along the neck.
  //    pose.bob dips the head; pose.head lifts it to bray. ────────────────────
  const headRise = pose.head - pose.bob; // bray lifts (+), bob dips (−)
  const neckTopX = bx - 8;
  const neckTopY = by - 5 - headRise * 0.5;
  const hx = bx - 15; // head centre
  const hy = by - 1 - headRise; // head lifts/dips

  // neck — a sturdy grey wedge from the shoulder up toward the head
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.moveTo(bx - 3, by - 6);
  ctx.quadraticCurveTo(neckTopX - 1, neckTopY - 1, hx + 2.5, hy - 3.5);
  ctx.lineTo(hx + 4.5, hy + 3.5);
  ctx.quadraticCurveTo(neckTopX + 3, by + 1, bx - 1, by + 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(p.coatMid);
  ctx.beginPath();
  ctx.moveTo(bx - 3, by - 5.6);
  ctx.quadraticCurveTo(neckTopX - 0.6, neckTopY - 0.4, hx + 2.6, hy - 3);
  ctx.lineTo(hx + 4.2, hy + 3);
  ctx.quadraticCurveTo(neckTopX + 3, by + 0.6, bx - 1, by + 2.4);
  ctx.closePath();
  ctx.fill();
  // lit front edge of the neck
  ctx.strokeStyle = rgba(p.coatLight, 0.8);
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(hx + 4.0, hy + 2.6);
  ctx.quadraticCurveTo(neckTopX + 3, by + 0.4, bx - 1, by + 2);
  ctx.stroke();
  ctx.lineCap = "butt";

  // ── SCARF (winter) — a little knitted band around the neck, below the head ──
  if (p.scarfAmt > 0.001) {
    const sx = neckTopX - 1;
    const sy = by - 2.4 - headRise * 0.35;
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // wrap band around the neck
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 4.4, 2.8, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // darker underside for depth
    ctx.fillStyle = rgba([
      Math.max(0, p.scarfColor[0] - 50),
      Math.max(0, p.scarfColor[1] - 30),
      Math.max(0, p.scarfColor[2] - 30),
    ]);
    ctx.beginPath();
    ctx.ellipse(sx + 0.4, sy + 1.4, 4.0, 1.5, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // hanging tail of the scarf with a knitted notch + fringe
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.moveTo(sx - 2.6, sy + 1.6);
    ctx.lineTo(sx + 0.8, sy + 2.2);
    ctx.lineTo(sx - 0.2, sy + 8.0);
    ctx.lineTo(sx - 3.4, sy + 7.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba([
      Math.max(0, p.scarfColor[0] - 60),
      Math.max(0, p.scarfColor[1] - 40),
      Math.max(0, p.scarfColor[2] - 40),
    ]);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sx - 1.6, sy + 3.0);
    ctx.lineTo(sx - 2.0, sy + 7.4);
    ctx.stroke();
    // fringe at the bottom
    ctx.strokeStyle = rgba(p.scarfColor);
    ctx.lineWidth = 0.9;
    ctx.lineCap = "round";
    for (const fx of [-3.2, -2.0, -0.8]) {
      ctx.beginPath();
      ctx.moveTo(sx + fx, sy + 7.4);
      ctx.lineTo(sx + fx - 0.2, sy + 9.0);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.restore();
  }

  // ── MANE — SHORT, UPRIGHT, dark, standing along the crest of the neck
  //    (donkey signature: a stiff brush, not a flowing mane). Locked dark. ──────
  {
    // dark base ridge following the neck crest
    ctx.strokeStyle = rgba(p.maneShade);
    ctx.lineWidth = 3.2 * (0.9 + vol * 0.25);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx - 3, by - 6.4);
    ctx.quadraticCurveTo(neckTopX - 1, neckTopY - 1.8, hx + 2.2, hy - 4.6);
    ctx.stroke();
    // short upright bristles standing UP off the crest
    ctx.lineWidth = 1.2;
    const tufts: Array<[number, number, number]> = [
      [bx - 3.5, by - 6.6, 0.1],
      [bx - 6, by - 6.9, 0.35],
      [neckTopX - 0.6, neckTopY - 2.0, 0.6],
      [hx + 1.0, hy - 4.8, 0.85],
    ];
    for (let i = 0; i < tufts.length; i++) {
      const [sx, sy, ph] = tufts[i];
      // bristles point slightly up-and-back, swivel a touch with the ear pose
      const sw = pose.ear * 0.4 * (0.4 + ph);
      ctx.strokeStyle = rgba(i % 2 ? p.mane : p.maneShade, 0.95);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + 0.4 + sw, sy - 1.8, sx + 0.9 + sw, sy - 3.4);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  }

  // VERY LONG upright ears on the crown (grey outer + pale inner), toward
  // lower-left. The defining donkey feature — tall, narrow, near-vertical. They
  // SWIVEL with pose.ear (+ = swing back, − = perk forward).
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(hx + 1.2 + side * 1.7, hy - 5.6);
    // near (left) ear swivels more than the far (right) ear
    const swivel = pose.ear * (side < 0 ? 1.0 : 0.55);
    ctx.rotate(-0.06 + side * 0.22 + swivel);
    // outer ear (long, narrow)
    ctx.fillStyle = rgba(p.outline);
    ctx.beginPath();
    ctx.moveTo(0, 3.2);
    ctx.quadraticCurveTo(-1.4, -4.6, 0.3, -7.2);
    ctx.quadraticCurveTo(1.9, -4.4, 1.5, 3.0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba(p.coatMid);
    ctx.beginPath();
    ctx.moveTo(0.2, 2.8);
    ctx.quadraticCurveTo(-0.8, -4.0, 0.4, -6.2);
    ctx.quadraticCurveTo(1.4, -4.0, 1.1, 2.6);
    ctx.closePath();
    ctx.fill();
    // pale inner ear
    ctx.fillStyle = rgba(p.belly, 0.9);
    ctx.beginPath();
    ctx.ellipse(0.5, -1.4, 0.55, 3.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // head — a blocky grey wedge muzzle, tilted toward lower-left
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(0.34 - pose.head * 0.02); // bray raises the muzzle a touch
  // outline
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.4, 6.0, 0, 0, Math.PI * 2);
  ctx.fill();
  // grey face fill (shaded then lit)
  ctx.fillStyle = rgba(p.coatShadow);
  ctx.beginPath();
  ctx.ellipse(0, 0, 3.7, 5.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.coatMid);
  ctx.beginPath();
  ctx.ellipse(-0.4, -0.4, 3.3, 4.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.coatLight);
  ctx.beginPath();
  ctx.ellipse(-0.9, -0.9, 2.4, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // short dark forelock tuft between the ears, over the forehead
  ctx.fillStyle = rgba(p.maneShade);
  ctx.beginPath();
  ctx.moveTo(-1.4, -4.8);
  ctx.quadraticCurveTo(0.4, -6.0, 1.4, -4.4);
  ctx.quadraticCurveTo(0.2, -3.4, -1.0, -3.6);
  ctx.closePath();
  ctx.fill();

  // eye
  ctx.fillStyle = rgba(p.hoofDark);
  ctx.beginPath();
  ctx.ellipse(1.4, -1.6, 1.0, 1.3, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([255, 255, 255], 0.5);
  ctx.beginPath();
  ctx.arc(1.1, -2.0, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // PALE muzzle / nostril at the lower face (donkey signature — soft white
  // muzzle ring around the nose)
  ctx.fillStyle = rgba(p.belly);
  ctx.beginPath();
  ctx.ellipse(0.4, 4.3, 2.7, 2.3, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.hoofDark, 0.85);
  ctx.beginPath();
  ctx.ellipse(0.9, 4.7, 0.6, 0.9, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // mouth OPENS to bray (pose.chew) — a dark open mouth below the muzzle
  if (pose.chew > 0.02) {
    ctx.fillStyle = rgba([26, 18, 20]);
    ctx.beginPath();
    ctx.ellipse(0.2, 5.6, 1.5, 0.7 + pose.chew * 1.6, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // a glimpse of pale teeth at the top of the open mouth
    ctx.fillStyle = rgba(p.belly, 0.9);
    ctx.beginPath();
    ctx.ellipse(0.2, 5.0 + pose.chew * 0.3, 1.2, 0.4, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore(); // end head transform

  ctx.restore(); // end squash/stretch transform

  // breath-fog puff at the muzzle (winter) — drawn OUTSIDE the squash transform
  // so it reads as air, not body. Static base puff + an exhale swell on the bray.
  if (p.breathFogAmt > 0.001) {
    const reach = 4.6 + pose.chew * 3.4;
    ctx.fillStyle = rgba([235, 244, 255], (0.34 + 0.3 * pose.chew) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(
      hx - reach,
      hy + 4.6 - pose.head,
      3.0 + pose.chew * 2.2,
      2.0 + pose.chew * 1.4,
      0.2,
      0,
      Math.PI * 2,
    );
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
    paintDonkey(ctx, p, pose);
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
    const p = clamp01(safeNum(pp, 0));
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
      const bx = 2;
      const by = 2;

      // Loose fluff motes lifting off the thickening coat — reads the coat
      // visibly fluffing/growing. Present in EVERY morph (deterministic in p).
      const fluff = trans * (0.4 + 0.6 * Math.max(0, b.coatVolume - a.coatVolume + 0.4));
      if (fluff > 0.01) {
        ctx.fillStyle = rgba([220, 222, 228], 0.5 * fluff);
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
        const hx = bx - 15;
        const hy = by - 1;
        ctx.fillStyle = rgba([235, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(hx - (4 + trans * 3), hy + 4.6, 2.6 + trans * 1.8, 1.8 + trans * 1.2, 0.2, 0, Math.PI * 2);
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
