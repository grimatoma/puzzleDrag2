// Production seasonal art for the CATTLE TRICERATOPS board tile
// (`tile_cattle_triceratops`) — the approved bold "fun action" direction,
// built on the SAME architecture as the herd sheep reference: a single
// parameterized `paint(ctx, p, pose)`, four `P` season presets, lerped
// transitions, and a two-tier occasional-action idle carried through a `Pose`.
//
// SUBJECT: a friendly cartoon triceratops treated as livestock — a stocky
// green/grey scaly dinosaur with a big bony NECK FRILL, THREE horns (two long
// brow horns + one short nose horn), a beaked snout, sturdy legs, standing on a
// grass pad in front-¾ turned toward the lower-left.
//
// PALETTE LOCK / IDENTITY: it is ALWAYS the SAME triceratops — the green hide,
// the pale beak/horns, the frill, and the silhouette OUTLINE are identical for
// every season. A dinosaur does not grow fleece, so the seasonal change is a
// BOLD light/colour wash + a small hide texture/volume nudge + snow / frost /
// leaves + light props ONLY:
//   • Spring : fresh-toned hide, a blossom on the pad, cool-bright light.
//   • Summer : glossy vivid hide, bright warm light — peak.
//   • Autumn : warm-tinted hide, a fallen leaf on the pad (one perched on the
//     frill), dulled gloss, amber light.
//   • Winter : snow piled on the back + along the frill top + a little on the
//     horns, a little winter SCARF, a big steam breath-fog puff (a cold dino),
//     frost, cool blue-grey light. Clearly wintry, still the same triceratops.
//
// IDLE (two-tier occasional action via `actionQ`, carried through `pose`):
//   • COMMON ~6s (win ~0.95s): a CHEW + blink + tail-sway — the head bobs as it
//     chews (~8–12px), a slow tail sway, a small body squash.
//   • RARE  ~18s (win ~1.2s, phase +3s extra): a HEAD-LOWER horn-display /
//     stomp — the triceratops lowers its three-horned head and tosses it up,
//     with a weighty front stomp (~14–18px), settling out (anticipation →
//     display → settle). May exit the box at the apex (fine).
// Both gestures return to REST with zero value AND zero velocity at the window
// edges (raised-cosine windows), so `anim(…, t)` is seamless and `anim(…, 0)`
// (and `draw`) sit exactly at rest.
//
// Origin-centered in the −24..+24 design box. Deterministic in `t` (seconds).
// Never throws; clamps every scalar; guards non-finite t/p; save/restore +
// globalAlpha reset in a `finally`.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Small math helpers ──────────────────────────────────────────────────────

type RGB = [number, number, number];

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

// Coerce any wild / non-finite number to a safe finite fallback (default 0).
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

// Anticipation→action shape for the STOMP / head-display: a brief crouch
// (negative) before the rise, then a clean arc up and settle. q∈[0,1]. Returns
// a factor in roughly −0.2..+1 (negative = anticipation dip, positive = apex).
function stompShape(q: number): number {
  if (q <= 0 || q >= 1) return 0;
  const antiEnd = 0.26; // first slice = crouch/anticipation
  if (q < antiEnd) {
    // dip down a little (anticipation), zero slope at q=0
    const a = q / antiEnd;
    return -0.2 * (0.5 - 0.5 * Math.cos(a * Math.PI));
  }
  // display arc, zero at the seam to the crouch and at q=1
  const a = (q - antiEnd) / (1 - antiEnd);
  return Math.sin(a * Math.PI);
}

// ── The idle POSE (carries all action state into paint) ──────────────────────

interface Pose {
  bob: number; // whole-body vertical bob (design px, + = up). Stomp settle uses it.
  lean: number; // signed forward/back lean (design px) during the head display
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  head: number; // signed head pitch (design px, + = lower the head/horns)
  chew: number; // 0..1 jaw open / chew amount
  ear: number; // 0..1 blink amount (eyelid) tied to the chew/display
  tail: number; // signed tail-tip swish (design px sideways)
  hop: number; // 0..1 extra breath-fog reach (winter exhale on the chew)
}

const REST: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, chew: 0, ear: 0, tail: 0, hop: 0 };

// Build a pose from the wall clock: a common CHEW every ~6s and a rare
// HEAD-LOWER/STOMP every ~18s. Returns to REST (all zeros / unit scales) at
// every window edge. Guards non-finite `t`.
function poseFromClock(tIn: number): Pose {
  const t = safeNum(tIn, 0);
  const pose: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, chew: 0, ear: 0, tail: 0, hop: 0 };

  // COMMON ~6s: CHEW (win ~0.95s). Head bobs ~8–12px down as it chews, jaw
  // chatters, a blink, a slow tail sway, a small body squash. Built from
  // raised-cosine windows → seamless. Phase 3.0 opens the window at t≈3.0 (well
  // clear of t=0, so anim(0) sits exactly at REST).
  const cq = actionQ(t, 6, 0.95, 3.0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window
    // two chew dips within the window (head lowers ~8–12px at the peaks)
    pose.head = env * (5.0 + 6.0 * Math.abs(Math.sin(cq * Math.PI * 2)));
    pose.chew = env * (0.45 + 0.55 * Math.abs(Math.sin(cq * Math.PI * 2)));
    pose.ear = env; // a blink
    pose.tail = Math.sin(cq * Math.PI * 6) * env * 3.0; // a slow few-beat sway
    pose.hop = env; // winter: an exhale puff as it chews
    // a small body squash as it bears down to chew
    pose.squashY = 1 - env * 0.05;
    pose.squashX = 1 + env * 0.04;
  }

  // RARE ~18s: HEAD-LOWER horn-display + STOMP (win ~1.2s). The dino lowers its
  // three-horned head, then tosses it up with a weighty front stomp (~14–18px)
  // and settles. Phase 6.0 (= 3.0 base + 3.0 extra) keeps it clear of t=0 and
  // off-phase from the chew. May lift OUTSIDE the design box at the apex.
  const sq = actionQ(t, 18, 1.2, 6.0);
  if (sq >= 0) {
    const s = stompShape(sq); // −0.2..+1 (anticipation then display arc)
    if (s < 0) {
      // anticipation: lower the head/horns and dip the body weight forward
      const c = -s; // 0..0.2
      pose.head = c * 90; // lower the three horns dramatically
      pose.lean = -c * 16; // shift weight forward over the horns
      pose.squashY = 1 - c * 0.6;
      pose.squashX = 1 + c * 0.5;
    } else {
      // display + stomp: toss the head up, heave the body up ~14–18px, stretch
      pose.bob = s * 17; // weighty stomp lift (may exit the box at apex)
      pose.head = -s * 12; // toss the horns up high
      pose.lean = s * 6; // rock back as it heaves up
      pose.squashY = 1 + s * 0.12;
      pose.squashX = 1 - s * 0.08;
    }
    // a tail flag through the whole display
    pose.tail += Math.sin(sq * Math.PI) * 2.2;
    pose.ear = Math.max(pose.ear, bump(sq) * 0.6); // a wary blink at the display
  }

  return pose;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────
//
// IDENTITY: the green hide tones, the pale beak/horn/frill-rim, and the dark
// hard parts live in `P` only so the season tone + light wash can nudge them.
// Everything that genuinely differs per season is the hide tone + pad + light +
// dressing amounts + a small hide volume/texture nudge. NO booleans / season
// strings.

interface P {
  hideLight: RGB; // lit top of the green hide
  hideMid: RGB; // body tone
  hideShadow: RGB; // shaded underside / belly of the green hide
  frill: RGB; // the bony neck frill plate
  frillRim: RGB; // the lighter bumpy rim of the frill
  beak: RGB; // pale beak + horns (the bony pale parts)
  hornDark: RGB; // horn shadow / hoof / eye (the dark hard parts)
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  hideVolume: number; // 0..1 small hide-bulk / scale-texture nudge (NOT fleece)
  glossAmt: number; // 0..1 surface gloss/sheen strength on the hide
  frostAmt: number; // 0..1 frost sparkle on the hide
  backSnowAmt: number; // 0..1 snow on the frill + back + horns
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 a blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 a fallen leaf on the pad + on the frill (autumn)
  breathFogAmt: number; // 0..1 breath-fog puff at the beak (winter)
  scarfAmt: number; // 0..1 a little winter SCARF (tweened alpha)
  scarfColor: RGB; // scarf colour (locked berry, fades in via alpha)
}

// Four BOLD season presets. The triceratops stays the SAME green, three-horned,
// frilled dinosaur; only hide tone + pad + light + dressing + a small volume
// nudge differ — pushed HARD so each season reads at a glance (~58px).
const SP: Record<SeasonName, P> = {
  // Spring — fresh-toned green hide; dewy lime pad + blossom; cool-bright light.
  Spring: {
    hideLight: [150, 208, 100],
    hideMid: [98, 166, 68],
    hideShadow: [58, 112, 50],
    frill: [122, 172, 86],
    frillRim: [180, 218, 128],
    beak: [228, 222, 190],
    hornDark: [70, 70, 56],
    padGrass: [128, 210, 86], // bright lime dewy grass
    soil: [86, 134, 54],
    outline: [40, 60, 34],
    lightWash: [206, 240, 255], // cool-bright
    lightWashAmt: 0.2,
    hideVolume: 0.18,
    glossAmt: 0.26,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.9,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [150, 42, 86],
  },
  // Summer — glossy vivid green hide (PEAK), saturated mid-green pad, warm light.
  Summer: {
    hideLight: [132, 204, 80],
    hideMid: [78, 160, 56],
    hideShadow: [44, 104, 42],
    frill: [106, 162, 72],
    frillRim: [166, 210, 112],
    beak: [234, 226, 190],
    hornDark: [64, 64, 50],
    padGrass: [84, 176, 62], // saturated mid-green
    soil: [62, 118, 44],
    outline: [34, 58, 30],
    lightWash: [255, 240, 184], // bright warm
    lightWashAmt: 0.22,
    hideVolume: 0.42,
    glossAmt: 0.7, // peak gloss
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [150, 42, 86],
  },
  // Autumn — warm-tinted olive-green hide; olive-tan pad; a fallen leaf; dulled
  // gloss; amber light.
  Autumn: {
    hideLight: [156, 174, 88],
    hideMid: [114, 134, 62],
    hideShadow: [74, 90, 42],
    frill: [130, 142, 76],
    frillRim: [176, 184, 108],
    beak: [222, 208, 162],
    hornDark: [70, 62, 44],
    padGrass: [160, 152, 90], // olive-tan browning grass
    soil: [114, 96, 52],
    outline: [54, 50, 28],
    lightWash: [255, 188, 104], // low amber, BOLD
    lightWashAmt: 0.3,
    hideVolume: 0.58,
    glossAmt: 0.22, // dulled
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.95,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [150, 42, 86],
  },
  // Winter — green hide still clearly visible; snow on frill + back + horns; a
  // little scarf; a big breath-fog puff; frost dusting; snowy pad; cool light.
  Winter: {
    hideLight: [120, 170, 96],
    hideMid: [80, 136, 66],
    hideShadow: [50, 98, 52],
    frill: [104, 144, 86],
    frillRim: [158, 190, 124],
    beak: [216, 218, 198],
    hornDark: [62, 64, 58],
    padGrass: [222, 236, 250], // snow over the pad
    soil: [142, 164, 190],
    outline: [50, 62, 56],
    lightWash: [190, 214, 252], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    hideVolume: 0.7,
    glossAmt: 0.16,
    frostAmt: 0.82,
    backSnowAmt: 0.92,
    padSnowAmt: 0.95,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.85,
    scarfAmt: 1, // a little scarf appears in winter
    scarfColor: [150, 42, 86],
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    hideLight: lerpRGB(a.hideLight, b.hideLight, t),
    hideMid: lerpRGB(a.hideMid, b.hideMid, t),
    hideShadow: lerpRGB(a.hideShadow, b.hideShadow, t),
    frill: lerpRGB(a.frill, b.frill, t),
    frillRim: lerpRGB(a.frillRim, b.frillRim, t),
    beak: lerpRGB(a.beak, b.beak, t),
    hornDark: lerpRGB(a.hornDark, b.hornDark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    hideVolume: lerp(a.hideVolume, b.hideVolume, t),
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
    lightWashAmt: clamp01(p.lightWashAmt),
    hideVolume: clamp01(p.hideVolume),
    glossAmt: clamp01(p.glossAmt),
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

// the low flat grass pad the triceratops stands on
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

  // a BOLD blossom (spring) — a hero bloom plus a couple of buds
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

  // BOLD fallen leaves (autumn)
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

// one sturdy leg: a short cylinder with a toed foot at the base
function paintLeg(
  ctx: CanvasRenderingContext2D,
  p: P,
  x: number,
  topY: number,
  baseY: number,
  w: number,
  far: boolean,
): void {
  ctx.strokeStyle = rgba(p.outline);
  ctx.lineWidth = w + 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  ctx.strokeStyle = far ? rgba(p.hideShadow) : rgba(p.hideMid);
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // toed foot
  ctx.fillStyle = rgba(p.hornDark, far ? 0.7 : 1);
  ctx.beginPath();
  ctx.ellipse(x, baseY, w * 0.62, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// Trace the rounded body+haunch mass. `vol` swells the bulk a touch; the path
// is otherwise IDENTICAL every season (identity-locked silhouette).
function bodyPath(ctx: CanvasRenderingContext2D, cy: number, vol: number): void {
  const s = 1 + (vol - 0.4) * 0.12; // tiny bulk nudge, centred on summer
  ctx.beginPath();
  ctx.moveTo(-9 * s, cy + 2);
  ctx.quadraticCurveTo(-4 * s, cy - 7 * s, 5 * s, cy - 6 * s); // arched back
  ctx.quadraticCurveTo(14 * s, cy - 5 * s, 16 * s, cy + 4); // haunch
  ctx.quadraticCurveTo(17 * s, cy + 11, 11 * s, cy + 13); // rump down
  ctx.quadraticCurveTo(2, cy + 16, -7 * s, cy + 13); // belly
  ctx.quadraticCurveTo(-12 * s, cy + 11, -10 * s, cy + 5); // chest up to shoulder
  ctx.closePath();
}

// the big bony NECK FRILL fanning up-left behind the head
function paintFrill(ctx: CanvasRenderingContext2D, p: P, snow: number): void {
  // outline plate
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.moveTo(-1, 7);
  ctx.quadraticCurveTo(-13, 4, -11, -9); // left edge sweeping up
  ctx.quadraticCurveTo(-7, -15, 1, -13); // top arc
  ctx.quadraticCurveTo(9, -12, 9, -3); // right edge
  ctx.quadraticCurveTo(8, 4, 2, 7); // back to neck
  ctx.closePath();
  ctx.fill();
  // frill plate fill (inset)
  ctx.fillStyle = rgba(p.frill);
  ctx.beginPath();
  ctx.moveTo(-0.5, 5.6);
  ctx.quadraticCurveTo(-11, 3, -9.2, -8); // left
  ctx.quadraticCurveTo(-5.6, -13, 1, -11.4); // top
  ctx.quadraticCurveTo(7.4, -10.4, 7.4, -2.6); // right
  ctx.quadraticCurveTo(6.6, 3, 1.6, 5.6); // back
  ctx.closePath();
  ctx.fill();
  // bumpy lighter rim along the top edge (the signature frill scallops)
  ctx.fillStyle = rgba(p.frillRim);
  const bumps: Array<[number, number]> = [
    [-8.6, -7.4], [-5.4, -11], [-1, -12.4], [3.2, -11.4], [6.6, -7.8],
  ];
  for (const [bx, by] of bumps) {
    ctx.beginPath();
    ctx.arc(bx, by, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // radial shading lines on the plate
  ctx.strokeStyle = rgba(p.hideShadow, 0.55);
  ctx.lineWidth = 1;
  [-7.5, -3.5, 0.5, 4.5].forEach((ex, i) => {
    ctx.beginPath();
    ctx.moveTo(0.5, 4);
    ctx.lineTo(ex, -9 + i * 0.4);
    ctx.stroke();
  });

  // snow capping the frill top edge (winter) — BOLD
  if (snow > 0.001) {
    ctx.fillStyle = rgba([246, 251, 255], 0.95 * snow);
    ctx.beginPath();
    ctx.moveTo(-9.2, -8);
    ctx.quadraticCurveTo(-5.6, -14, 1, -12.6);
    ctx.quadraticCurveTo(7, -11.6, 7.4, -5);
    ctx.quadraticCurveTo(4, -9.4, -1, -10);
    ctx.quadraticCurveTo(-6, -10.2, -9.2, -8);
    ctx.closePath();
    ctx.fill();
  }
}

// the HEAD: beaked snout, eye, three horns; a fallen leaf may perch on the frill
// via the caller. `pose.head` pitches it; `pose.chew` opens the jaw; `pose.ear`
// blinks the eye. Snow may cap the horns in winter.
function paintHead(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  ctx.save();
  ctx.translate(-12, 5);
  ctx.rotate(0.12 + pose.head * 0.02); // chew/display pitches the snout down

  // head block outline
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.moveTo(8, -5);
  ctx.quadraticCurveTo(2, -7, -4, -3); // brow → snout top
  ctx.quadraticCurveTo(-9, -1, -8.5, 2.5); // toward beak tip
  ctx.quadraticCurveTo(-6, 5.5, 0, 5); // jaw under
  ctx.quadraticCurveTo(6, 5, 8, 1); // cheek back to neck
  ctx.closePath();
  ctx.fill();

  // head fill
  ctx.fillStyle = rgba(p.hideMid);
  ctx.beginPath();
  ctx.moveTo(7, -3.6);
  ctx.quadraticCurveTo(2, -5.4, -3.4, -1.8);
  ctx.quadraticCurveTo(-7.4, -0.2, -7, 2.2);
  ctx.quadraticCurveTo(-5, 4.4, 0, 3.8);
  ctx.quadraticCurveTo(5, 3.8, 6.6, 0.2);
  ctx.closePath();
  ctx.fill();
  // lit upper cheek
  ctx.fillStyle = rgba(p.hideLight, 0.8);
  ctx.beginPath();
  ctx.ellipse(0, -1.4, 4.2, 2.2, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // pale beak (parrot-like) at the snout tip — opens as it chews
  const jaw = pose.chew * 1.4;
  ctx.fillStyle = rgba(p.beak);
  ctx.beginPath();
  ctx.moveTo(-3.4, -1.6);
  ctx.quadraticCurveTo(-9.4, -0.4, -8.6, 2.6); // upper beak hook
  ctx.quadraticCurveTo(-6.4, 4.2 + jaw, -3, 3.2 + jaw); // lower (drops on chew)
  ctx.quadraticCurveTo(-4.4, 0.8, -3.4, -1.6);
  ctx.closePath();
  ctx.fill();
  if (jaw > 0.05) {
    // dark mouth gap as the beak parts
    ctx.fillStyle = rgba([18, 16, 18]);
    ctx.beginPath();
    ctx.ellipse(-5.4, 2.6 + jaw * 0.5, 2.2, 0.4 + jaw * 0.5, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = rgba(p.hornDark, 0.7);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-7.6, 1);
  ctx.lineTo(-3.6, 0.8);
  ctx.stroke();

  // short NOSE horn (1) — above the beak
  ctx.fillStyle = rgba(p.beak);
  ctx.strokeStyle = rgba(p.hornDark, 0.6);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-3.6, -2.2);
  ctx.quadraticCurveTo(-5.2, -6.2, -2.6, -7.2);
  ctx.quadraticCurveTo(-1.6, -4.4, -1.6, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // two long BROW horns (2 + 3) — sweeping up and forward over the brow
  const browHorns: Array<[number, number, number]> = [
    [1.8, -3.4, -9.6], // near brow horn (lower-left)
    [5.4, -2.4, -10.6], // far brow horn (slightly behind)
  ];
  for (const [sx, dx, dy] of browHorns) {
    ctx.fillStyle = rgba(p.beak);
    ctx.beginPath();
    ctx.moveTo(sx, -3.4);
    ctx.quadraticCurveTo(sx + dx * 0.5, -3.4 + dy * 0.55, sx + dx, -3.4 + dy);
    ctx.quadraticCurveTo(sx + dx + 1.1, -3.4 + dy + 1.2, sx + 1.8, -2.6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(p.hornDark, 0.55);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(sx + 0.6, -3.2);
    ctx.quadraticCurveTo(sx + dx * 0.55, -3.4 + dy * 0.55, sx + dx, -3.4 + dy);
    ctx.stroke();
    // a little snow on the horn tip (winter)
    if (p.backSnowAmt > 0.001) {
      ctx.fillStyle = rgba([248, 252, 255], 0.9 * p.backSnowAmt);
      ctx.beginPath();
      ctx.arc(sx + dx, -3.4 + dy, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // eye — blinks via pose.ear
  const open = 1 - clamp01(pose.ear);
  ctx.fillStyle = rgba(p.hornDark);
  ctx.beginPath();
  ctx.ellipse(1.6, -0.6, 1.15, 1.15 * Math.max(0.12, open), 0, 0, Math.PI * 2);
  ctx.fill();
  if (open > 0.3) {
    ctx.fillStyle = rgba([255, 255, 255], 0.85);
    ctx.beginPath();
    ctx.arc(1.2, -1.0, 0.42, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// the whole triceratops, standing front-¾ toward lower-left, posed by `pose`
function paintTriceratops(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // The legs stay PLANTED on the pad; the body bob/lean lifts the mass above.
  const bx = 0;
  const bodyY = 4 - pose.bob; // body centre lifts during the stomp
  const lean = pose.lean;

  // contact shadow of the beast on the pad
  ctx.fillStyle = rgba(p.outline, 0.26);
  ctx.beginPath();
  ctx.ellipse(2.5, 16.5, 15, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Tail — sweeping to the right, behind the haunch; swishes via pose ──────
  {
    const tx = pose.tail;
    ctx.strokeStyle = rgba(p.outline);
    ctx.lineWidth = 8.5;
    ctx.beginPath();
    ctx.moveTo(13, bodyY + 2);
    ctx.quadraticCurveTo(20, bodyY + 3, 21 + tx, bodyY + 7);
    ctx.stroke();
    ctx.strokeStyle = rgba(p.hideMid);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(13, bodyY + 2);
    ctx.quadraticCurveTo(20, bodyY + 3, 21 + tx, bodyY + 7);
    ctx.stroke();
    ctx.strokeStyle = rgba(p.hideLight, 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(13, bodyY + 0.5);
    ctx.quadraticCurveTo(19, bodyY + 1.5, 20.4 + tx, bodyY + 5.5);
    ctx.stroke();
  }

  // ── Far legs (drawn first, behind the body) — planted on the pad ──────────
  paintLeg(ctx, p, -3, bodyY + 7, 16, 4.6, true); // far foreleg
  paintLeg(ctx, p, 9, bodyY + 7.5, 16.5, 5.4, true); // far hindleg

  // Everything above the legs (frill + body + head + dressing) is drawn under a
  // squash/stretch + lean transform centred on the body, so the chew squash and
  // the stomp anticipation/stretch read.
  ctx.save();
  ctx.translate(bx + lean, bodyY);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-bx, -bodyY);

  // ── Frill — fanned up-left behind the head (snow caps it in winter) ───────
  ctx.save();
  ctx.translate(-4, bodyY - 4);
  paintFrill(ctx, p, p.backSnowAmt);
  // a fallen leaf perched on the frill for autumn charm
  if (p.fallenLeafAmt > 0.001) {
    ctx.save();
    ctx.translate(-2, -10.5);
    ctx.rotate(-0.5);
    ctx.fillStyle = rgba([206, 110, 36], p.fallenLeafAmt);
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.8, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba([110, 58, 24], p.fallenLeafAmt);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-2.6, 0);
    ctx.lineTo(2.6, 0);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // ── Body mass ─────────────────────────────────────────────────────────────
  bodyPath(ctx, bodyY, p.hideVolume);
  ctx.fillStyle = rgba(p.outline);
  ctx.fill();

  ctx.save();
  bodyPath(ctx, bodyY, p.hideVolume);
  ctx.clip();
  // base mid tone
  ctx.fillStyle = rgba(p.hideMid);
  ctx.fillRect(-16, bodyY - 10, 38, 30);
  // lit back (upper-left light)
  const litGrad = ctx.createLinearGradient(-8, bodyY - 6, 10, bodyY + 14);
  litGrad.addColorStop(0, rgba(p.hideLight));
  litGrad.addColorStop(0.5, rgba(p.hideMid));
  litGrad.addColorStop(1, rgba(p.hideShadow));
  ctx.fillStyle = litGrad;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.ellipse(1, bodyY - 2, 16, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // belly shadow
  ctx.fillStyle = rgba(p.hideShadow, 0.7);
  ctx.beginPath();
  ctx.ellipse(0, bodyY + 8, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // scaly back-ridge bumps (a little hide TEXTURE that grows with volume)
  ctx.fillStyle = rgba(p.hideShadow, 0.5);
  [-6, -1, 4, 9].forEach((rx, i) => {
    ctx.beginPath();
    ctx.arc(rx, bodyY - 8 + i * 0.5, 1.2 + p.hideVolume * 0.7, 0, Math.PI * 2);
    ctx.fill();
  });
  // hide gloss/sheen on the shoulder
  if (p.glossAmt > 0.02) {
    ctx.fillStyle = rgba([255, 255, 255], 0.12 + 0.32 * p.glossAmt);
    ctx.beginPath();
    ctx.ellipse(-3, bodyY - 5, 5.5, 3.4, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // frost dusting on the upward hide (winter)
  if (p.frostAmt > 0.02) {
    ctx.fillStyle = rgba([222, 238, 252], 0.24 * p.frostAmt);
    ctx.beginPath();
    ctx.ellipse(1, bodyY - 7, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([240, 248, 255], 0.7 * p.frostAmt);
    [[-7, -8], [-1, -9], [5, -8], [10, -6], [2, -5]].forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, bodyY + sy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.restore(); // end body clip

  // ── Snow piled on the back (winter), drawn over the body ──────────────────
  if (p.backSnowAmt > 0.02) {
    const a = p.backSnowAmt;
    ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
    ctx.beginPath();
    ctx.moveTo(-8, bodyY - 3);
    ctx.quadraticCurveTo(-3, bodyY - 11, 5, bodyY - 10);
    ctx.quadraticCurveTo(13, bodyY - 9, 15, bodyY - 2);
    ctx.quadraticCurveTo(10, bodyY - 6, 4, bodyY - 7);
    ctx.quadraticCurveTo(-3, bodyY - 7.5, -8, bodyY - 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba([214, 230, 246], 0.5 * a);
    ctx.beginPath();
    ctx.ellipse(2, bodyY - 8, 9, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Head + beak + horns + eye, turned toward lower-left ───────────────────
  ctx.save();
  ctx.translate(0, bodyY - 4);
  paintHead(ctx, p, pose);
  ctx.restore();

  // ── SCARF (winter) — a little knitted band around the neck, below the head ─
  if (p.scarfAmt > 0.001) {
    const sx = -7.4;
    const sy = bodyY + 2.2;
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // wrap band
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 5.2, 2.8, 0.28, 0, Math.PI * 2);
    ctx.fill();
    // darker underside for depth
    ctx.fillStyle = rgba([
      Math.max(0, p.scarfColor[0] - 50),
      Math.max(0, p.scarfColor[1] - 30),
      Math.max(0, p.scarfColor[2] - 30),
    ]);
    ctx.beginPath();
    ctx.ellipse(sx + 0.6, sy + 1.4, 4.8, 1.5, 0.28, 0, Math.PI * 2);
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

  ctx.restore(); // end squash/stretch/lean transform

  // ── Near legs (in front of the body) — planted on the pad ─────────────────
  paintLeg(ctx, p, -6, bodyY + 6.5, 16, 5, false); // near foreleg
  paintLeg(ctx, p, 6, bodyY + 7.5, 16.5, 6, false); // near hindleg

  // breath-fog puff at the beak (winter) — drawn OUTSIDE the squash transform so
  // it reads as air, not body. Static base puff + an exhale swell during chew.
  if (p.breathFogAmt > 0.001) {
    const reach = 5.4 + pose.hop * 3.4;
    // beak tip sits near (-22, bodyY+3) after the head translate; track the bob.
    const hx = -22 + lean;
    const hy = bodyY + 3 + pose.head * 0.4;
    ctx.fillStyle = rgba([235, 244, 255], (0.34 + 0.3 * pose.hop) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(hx - reach * 0.4, hy, 3.0 + pose.hop * 2.2, 2.0 + pose.hop * 1.4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([248, 252, 255], (0.24 + 0.22 * pose.hop) * p.breathFogAmt);
    ctx.beginPath();
    ctx.arc(hx - reach, hy - 1.2, 1.6 + pose.hop * 1.2, 0, Math.PI * 2);
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
    paintTriceratops(ctx, p, pose);
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
// EXACTLY (drawn at REST, matching the idle hand-off). The hide VOLUME/tone
// leads; snow / frost / breath-fog / scarf LAG (settle late).
function makeTransition(fromIdx: 0 | 1 | 2) {
  const from = SEASON_NAMES[fromIdx];
  const to = SEASON_NAMES[fromIdx + 1];
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const p = clamp01(safeNum(pp, 0));
    const kBase = smoother(p);
    const kTone = biasedEase(p, 0.62); // hide tone / volume LEADS
    const kSnow = biasedEase(p, 1.7); // snow / frost / fog / scarf LAG

    const a = SP[from];
    const b = SP[to];
    const blended: P = lerpP(a, b, kBase);
    blended.hideVolume = lerp(a.hideVolume, b.hideVolume, kTone);
    blended.glossAmt = lerp(a.glossAmt, b.glossAmt, kTone);
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
      const bx = 0;
      const by = 4;

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

      // A few leaves drifting down during summer→autumn (target gains leaves).
      const leafGain = Math.max(0, b.fallenLeafAmt - a.fallenLeafAmt);
      if (leafGain > 0.01) {
        const motes: Array<[number, number, number]> = [
          [-12, 4, 0.6], [11, 6, -0.5], [2, 2, 0.3],
        ];
        for (const [mx, my, rot] of motes) {
          ctx.save();
          ctx.translate(bx + mx, by + my + (1 - smoother(p)) * 10);
          ctx.rotate(rot + p * Math.PI);
          ctx.fillStyle = rgba([200, 110, 40], 0.85 * trans * leafGain);
          ctx.beginPath();
          ctx.ellipse(0, 0, 2.4, 1.3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // A breath-fog puff appearing as the cold sets in (target gains fog).
      const fogGain = Math.max(0, b.breathFogAmt - a.breathFogAmt);
      if (fogGain > 0.01) {
        const hx = -22;
        const hy = by + 3;
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
