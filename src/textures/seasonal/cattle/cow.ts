// Production seasonal art for the CATTLE COW board tile (`tile_cattle_cow`) —
// the approved bold "bold & fun" direction, mirroring the herd-sheep reference
// architecture exactly. A single parameterized `paint(ctx, p, pose)` + four `P`
// presets + lerped transitions, pushed so the seasons read at a glance and the
// idle is a real, fun ACTION rather than a subtle breath.
//
// PALETTE LOCK: it is ALWAYS the same classic dairy cow — a white body with
// black patches, small horns/ears, a pink snout, an udder, and a tufted tail,
// standing on a pad. The signature patch pattern + black/white/pink IDENTITY
// colours and the SILHOUETTE outline are constant across all four seasons. Only
// the coat VOLUME (sleek spring → furrier/thicker winter), the pad colour, the
// light wash, and BOLD dressing — snow on the back, a little winter SCARF, a
// breath-fog puff, blossoms, a fallen leaf, frost, gloss — change. The cow is
// never recoloured, hollowed, or morphed into another animal.
//
// IDLE (two-tier occasional action, carried through a `pose` object):
//   • COMMON ~6s (win ~0.9–1.0s): a CHEW (cud) — the head bobs slowly ~8–12px
//     as it chews, an ear flicks, the tail swishes, with a small body squash.
//   • RARE  ~18s (win ~1.1–1.3s, phase +3s): a MOO head-raise / fly-shake — the
//     cow lifts its head and moos / shakes off a fly ~12–16px
//     (anticipation → raise/shake → settle). May exit the box at apex (fine).
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

// coerce any non-finite scalar to a safe default (never let NaN/∞ reach paint)
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

// Anticipation→action shape for the MOO head-raise: a brief dip (negative)
// before the lift, then a clean arc up and settle. q∈[0,1]. Returns a RAISE
// factor in roughly −0.16..+1 (negative = anticipation droop, positive = up).
function raiseShape(q: number): number {
  if (q <= 0 || q >= 1) return 0;
  const antiEnd = 0.22; // first slice = droop/anticipation
  if (q < antiEnd) {
    // dip down a little (anticipation), zero slope at q=0
    const a = q / antiEnd;
    return -0.16 * (0.5 - 0.5 * Math.cos(a * Math.PI));
  }
  // head arcs up, zero at the seam to the droop and at q=1
  const a = (q - antiEnd) / (1 - antiEnd);
  return Math.sin(a * Math.PI);
}

// ── The idle POSE (carries all action state into paint) ──────────────────────

interface Pose {
  bob: number; // whole-body vertical bob (design px, + = up)
  lean: number; // body horizontal lean (design px sideways)
  squashX: number; // body horizontal scale multiplier (squash/stretch)
  squashY: number; // body vertical scale multiplier
  head: number; // head vertical offset (design px, + = up raise, − = dip)
  chew: number; // 0..1 jaw/cud chew amount
  ear: number; // 0..1 near-ear flick amount
  tail: number; // signed tail swish (design px sideways)
  hop: number; // 0..1 extra breath-fog / exertion reach (moo exhale)
}

const REST: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, chew: 0, ear: 0, tail: 0, hop: 0 };

// Build a pose from the wall clock: a common CHEW every ~6s and a rare MOO
// head-raise every ~18s. Returns to REST (all zeros / unit scales) at every
// window edge.
function poseFromClock(tIn: number): Pose {
  const t = safeNum(tIn, 0);
  const pose: Pose = { bob: 0, lean: 0, squashX: 1, squashY: 1, head: 0, chew: 0, ear: 0, tail: 0, hop: 0 };

  // COMMON ~6s: CHEW (win ~1.0s). Head bobs ~8–12px down as it chews, jaw
  // chatters, ear flicks, tail swishes, small body squash. Built from
  // raised-cosine windows → seamless. Phase 3.0 opens the window at t≈3.0
  // (well clear of t=0, so anim(0) sits exactly at REST).
  const cq = actionQ(t, 6, 1.0, 3.0);
  if (cq >= 0) {
    const env = bump(cq); // 0→1→0 over the window
    // two chew bobs within the window (head dips DOWN ~8–12px at the peak)
    const beat = Math.abs(Math.sin(cq * Math.PI * 2));
    pose.head = -env * (4.0 + 6.0 * beat); // negative = head dips down chewing
    pose.bob = -env * 1.4 * beat; // tiny body settle with each chew
    pose.chew = env * (0.5 + 0.5 * beat);
    pose.ear = env;
    pose.tail = Math.sin(cq * Math.PI * 6) * env * 3.0; // a few swishes sideways
    pose.squashY = 1 - env * 0.04 * beat; // small body squash
    pose.squashX = 1 + env * 0.03 * beat;
    pose.hop = env * 0.5; // winter: a small exhale puff as it chews
  }

  // RARE ~18s: MOO head-raise / fly-shake (win ~1.2s). The cow lifts its head
  // ~12–16px with anticipation droop before and a settle after. May exit the
  // box at the apex (fine). Phase 3.0 keeps it well clear of t=0.
  const mq = actionQ(t, 18, 1.2, 3.0);
  if (mq >= 0) {
    const s = raiseShape(mq); // −0.16..+1 (droop then arc up)
    const env = bump(mq);
    pose.head += s * 15; // up to ~15px head-raise (+ = up)
    if (s < 0) {
      // anticipation: tuck the head/body slightly, squash down
      const c = -s; // 0..0.16
      pose.squashY *= 1 - c * 0.5;
      pose.squashX *= 1 + c * 0.4;
      pose.bob -= c * 2.0;
    } else {
      // raise: body lifts a touch and stretches as the head goes up
      pose.bob += s * 2.4;
      pose.squashY *= 1 + s * 0.06;
    }
    // a fly-shake wobble + a hearty exhale at the apex
    pose.lean += Math.sin(mq * Math.PI * 5) * env * 1.6;
    pose.ear = Math.max(pose.ear, env);
    pose.tail += Math.sin(mq * Math.PI * 3) * env * 2.2;
    pose.hop = Math.max(pose.hop, Math.max(0, s)); // big breath puff at the moo
  }

  return pose;
}

// clamp a pose defensively so a wild clock can never throw or explode the draw
function clampPose(po: Pose): Pose {
  return {
    bob: safeNum(po.bob),
    lean: safeNum(po.lean),
    squashX: clamp01((safeNum(po.squashX, 1) - 0.5) / 1.5) * 1.5 + 0.5,
    squashY: clamp01((safeNum(po.squashY, 1) - 0.5) / 1.5) * 1.5 + 0.5,
    head: safeNum(po.head),
    chew: clamp01(safeNum(po.chew)),
    ear: clamp01(safeNum(po.ear)),
    tail: safeNum(po.tail),
    hop: clamp01(safeNum(po.hop)),
  };
}

// ── Tweenable parameter set ─────────────────────────────────────────────────
//
// IDENTITY colours (white body, black patches, pink snout, dark hooves/horns)
// stay nearly constant; they live in P only so the light wash can nudge them
// very slightly between seasons. Everything that genuinely differs per season
// is the coat volume + pad + light + dressing amounts. All fields are tweenable
// numbers / RGB / 0..1 — no booleans, strings, or season-name.

interface P {
  hideLight: RGB; // bright top of the white hide
  hideShadow: RGB; // shaded underside of the white hide
  patch: RGB; // the irregular black patches (identity spotting)
  snout: RGB; // pink snout / nose / inner ear / udder hint
  hornDark: RGB; // horns, hooves, eyes (the dark hard parts)
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  coatVolume: number; // 0..1 BOLD coat thickness (sleek → furrier & puffed)
  glossAmt: number; // 0..1 coat sheen (peak in summer, dulled in autumn)
  frostAmt: number; // 0..1 frost sparkle on the coat
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 a blossom on the pad (spring)
  fallenLeafAmt: number; // 0..1 a fallen leaf on the pad (autumn)
  breathFogAmt: number; // 0..1 breath puff at the snout (winter)
  scarfAmt: number; // 0..1 a little winter SCARF (tweened alpha)
  scarfColor: RGB; // scarf colour (locked teal, fades in via alpha)
}

// Four BOLD season presets. The cow stays the SAME white, black-spotted,
// pink-snouted dairy cow; only coat volume + gloss + pad + light + dressing
// differ — pushed HARD so each season reads at a glance.
const SP: Record<SeasonName, P> = {
  // Spring — sleeker coat, a blossom on the pad, cool-bright light.
  Spring: {
    hideLight: [250, 250, 248],
    hideShadow: [208, 210, 210],
    patch: [44, 40, 44],
    snout: [238, 168, 176],
    hornDark: [60, 54, 50],
    padGrass: [124, 212, 80], // vivid fresh lime
    soil: [82, 138, 50],
    outline: [56, 50, 46],
    lightWash: [200, 240, 255], // cool-bright
    lightWashAmt: 0.2,
    coatVolume: 0.08, // BOLD: clearly sleek, very thin coat
    glossAmt: 0.3,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.9,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [44, 150, 150],
  },
  // Summer — glossy coat (PEAK), saturated mid-green pad, bright warm light.
  Summer: {
    hideLight: [253, 252, 248],
    hideShadow: [204, 202, 198],
    patch: [40, 36, 40],
    snout: [240, 162, 170],
    hornDark: [56, 50, 46],
    padGrass: [74, 182, 58], // saturated mid-green
    soil: [50, 116, 38],
    outline: [52, 46, 42],
    lightWash: [255, 240, 184], // bright warm
    lightWashAmt: 0.22,
    coatVolume: 0.42, // normal full coat
    glossAmt: 0.95, // BOLD: peak sheen
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [44, 150, 150],
  },
  // Autumn — warm-tinted fuller coat, a fallen leaf on the pad, dulled gloss.
  Autumn: {
    hideLight: [246, 240, 228],
    hideShadow: [200, 190, 176],
    patch: [42, 36, 36],
    snout: [232, 154, 158],
    hornDark: [58, 48, 42],
    padGrass: [168, 134, 64], // olive-tan browning
    soil: [108, 80, 40],
    outline: [56, 46, 38],
    lightWash: [255, 186, 98], // low amber, BOLD
    lightWashAmt: 0.3,
    coatVolume: 0.68, // fuller
    glossAmt: 0.2, // dulled gloss
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.95,
    breathFogAmt: 0,
    scarfAmt: 0,
    scarfColor: [44, 150, 150],
  },
  // Winter — FURRIER thick coat + back-snow + a little SCARF + breath fog,
  // snowy pad, cool blue-grey light.
  Winter: {
    hideLight: [253, 254, 255],
    hideShadow: [204, 216, 230],
    patch: [50, 46, 54],
    snout: [226, 150, 162],
    hornDark: [62, 58, 66],
    padGrass: [224, 236, 248], // snow on the pad
    soil: [148, 168, 192],
    outline: [66, 64, 76],
    lightWash: [190, 214, 252], // cool blue-grey, BOLD
    lightWashAmt: 0.34,
    coatVolume: 1, // BOLD: thick & furry
    glossAmt: 0.1,
    frostAmt: 0.82,
    backSnowAmt: 0.9,
    padSnowAmt: 0.92,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.85,
    scarfAmt: 1, // a little scarf appears in winter
    scarfColor: [44, 150, 150],
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    hideLight: lerpRGB(a.hideLight, b.hideLight, t),
    hideShadow: lerpRGB(a.hideShadow, b.hideShadow, t),
    patch: lerpRGB(a.patch, b.patch, t),
    snout: lerpRGB(a.snout, b.snout, t),
    hornDark: lerpRGB(a.hornDark, b.hornDark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    coatVolume: lerp(a.coatVolume, b.coatVolume, t),
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
    coatVolume: clamp01(safeNum(p.coatVolume)),
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

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat grass pad the cow stands on
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

// one leg: a stout pale cylinder with a dark hoof at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  // pale hide leg with outline
  ctx.strokeStyle = rgba(p.outline);
  ctx.lineWidth = 4.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  ctx.strokeStyle = rgba(p.hideShadow);
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY - 1);
  ctx.stroke();
  // dark hoof
  ctx.fillStyle = rgba(p.hornDark);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 2.0, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// Trace the cow's barrel body path (constant silhouette). cx,cy = body centre.
// vol modestly puffs/furries the outline; the underlying shape is constant.
function bodyPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, vol: number): void {
  const rx = 13.5 * (0.97 + vol * 0.12);
  const ry = 8.8 * (0.97 + vol * 0.14);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
}

// the whole cow, standing front-¾ turned toward lower-left, posed by `pose`
function paintCow(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  const vol = p.coatVolume;

  // legs stay PLANTED on the pad (they don't lift with the bob — they stretch).
  // Body centre lifts with the bob; head offset handles the chew/moo.
  const bx = 1;
  const bodyY = 2 - pose.bob;
  const legTop = bodyY + 6;

  // legs first (behind the body). Two back (dimmer/higher), two front.
  ctx.save();
  ctx.globalAlpha = 0.9;
  paintLeg(ctx, p, bx + 8, legTop, 18.6);
  paintLeg(ctx, p, bx - 6.5, legTop, 18.9);
  ctx.restore();
  // front legs (toward lower-left, slightly forward)
  paintLeg(ctx, p, bx + 4, legTop + 0.5, 19.4);
  paintLeg(ctx, p, bx - 9.5, legTop + 0.5, 19.6);

  // The whole upper body (barrel + head + dressing) is drawn under a
  // squash/stretch + lean transform centred on the body, so the chew squash and
  // moo stretch read together.
  ctx.save();
  ctx.translate(bx + pose.lean, bodyY);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(-bx, -bodyY);

  const by = bodyY;

  // ── BODY barrel — outline pass then light fill (layered) ────────────────────
  // outline halo (fattened by a slight scale around centre)
  ctx.fillStyle = rgba(p.outline);
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(1.1, 1.14);
  ctx.translate(-bx, -by);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  ctx.restore();

  // shaded hide
  ctx.fillStyle = rgba(p.hideShadow);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  // lit hide, offset up-left (light from upper-left)
  ctx.save();
  ctx.fillStyle = rgba(p.hideLight);
  ctx.translate(-1.4, -1.6);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  ctx.restore();

  // FURRIER winter coat fringe: soft tufts along the lower/back edge, growing
  // BOLDLY only when the coat is thick (vol high). Constant silhouette otherwise.
  if (vol > 0.5) {
    const fr = (vol - 0.5) / 0.5;
    ctx.fillStyle = rgba(p.hideShadow, 0.9);
    const rx = 13.5 * (0.97 + vol * 0.12);
    const ry = 8.8 * (0.97 + vol * 0.14);
    for (let i = 0; i < 11; i++) {
      const a = Math.PI * 0.1 + (i / 10) * Math.PI * 1.05; // lower-front arc
      const lx = bx + Math.cos(a) * rx * 1.02;
      const ly = by + Math.sin(a) * ry * 1.02;
      ctx.beginPath();
      ctx.arc(lx, ly, (1.4 + 1.4 * fr) * (i % 2 ? 1 : 0.78), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // udder hint (pink) tucked under the belly, behind the front legs region
  ctx.fillStyle = rgba(p.snout, 0.92);
  ctx.beginPath();
  ctx.ellipse(bx - 2.5, by + 7.0, 3.6, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([255, 255, 255], 0.14);
  ctx.beginPath();
  ctx.ellipse(bx - 3.4, by + 6.2, 1.4, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── BLACK PATCHES — signature spots, clipped to the body (identity) ─────────
  ctx.save();
  bodyPath(ctx, bx, by, vol);
  ctx.clip();
  ctx.fillStyle = rgba(p.patch);
  // the constant signature patch placement (same all four seasons)
  const patches: Array<[number, number, number, number, number]> = [
    [bx - 7, by - 3, 5.2, 4.4, -0.3],
    [bx + 5.5, by - 1.5, 5.8, 5.2, 0.25],
    [bx + 9.5, by + 4, 3.4, 3.0, 0.1],
    [bx - 2, by + 4.5, 4.0, 2.8, -0.15],
  ];
  for (const [px, py, prx, pry, rot] of patches) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    // lumpy patch: an ellipse with a couple of bumps
    ctx.beginPath();
    ctx.ellipse(0, 0, prx, pry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(prx * 0.7, -pry * 0.4, prx * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-prx * 0.5, pry * 0.5, pry * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // subtle hide highlight band over the patches' upper edge (light upper-left)
  ctx.fillStyle = rgba([255, 255, 255], 0.08);
  ctx.beginPath();
  ctx.ellipse(bx - 3, by - 4, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // gloss sweep across the hide — peak in summer, dulled in autumn/winter
  if (p.glossAmt > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = rgba([255, 255, 255], 0.4 * p.glossAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 3, by - 3.5, 7.5, 3.4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore(); // end body clip

  // snow settled on the back (winter) — BOLD soft white cap on top of the back
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgba([248, 252, 255], 0.94 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx, by - 7.4, 10 * (0.9 + vol * 0.3), 3.6, -0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.9 * p.backSnowAmt);
    for (const [dx, dy] of [[-6, -8.4], [0, -9.2], [6, -8.2], [-2, -9.6]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.7 + vol * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the coat (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgba([255, 255, 255], 0.85 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-8, 0], [-3, 4], [4, -2], [9, 2], [0, -3], [-5, -5], [7, 5],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // tufted tail at the upper-right rear — a thin curve with a dark switch tuft,
  // swishing via pose.tail
  const tsw = pose.tail;
  ctx.strokeStyle = rgba(p.outline);
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx + 13, by - 2);
  ctx.quadraticCurveTo(bx + 17 + tsw, by + 3, bx + 15.5 + tsw, by + 9);
  ctx.stroke();
  ctx.strokeStyle = rgba(p.hideShadow);
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(bx + 13, by - 2);
  ctx.quadraticCurveTo(bx + 17 + tsw, by + 3, bx + 15.5 + tsw, by + 9);
  ctx.stroke();
  ctx.lineCap = "butt";
  // tufted switch (dark)
  ctx.fillStyle = rgba(p.patch);
  ctx.beginPath();
  ctx.ellipse(bx + 15.5 + tsw, by + 10, 1.7, 2.8, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // ── HEAD (front-¾, lower-left) — locks identity: white face w/ patch, horns,
  //    ears, pink snout. pose.head raises (+) or dips (−) the head. ───────────
  const hx = bx - 14;
  const hy = by + 3 - pose.head; // + head = up (raise), − = down (chew dip)

  // horns (small, dark) — behind the crown
  ctx.strokeStyle = rgba(p.hornDark);
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  for (const side of [-1, 1] as const) {
    ctx.beginPath();
    ctx.moveTo(hx + side * 2.6, hy - 5.2);
    ctx.quadraticCurveTo(hx + side * 4.6, hy - 7.6, hx + side * 4.0, hy - 8.8);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // ears (white outer + pink inner), set wide. Near (left) ear flicks via pose.
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(hx + side * 5.6, hy - 3.2);
    const flick = side === -1 ? pose.ear * 0.6 : 0;
    ctx.rotate(side * 0.7 + side * flick);
    ctx.fillStyle = rgba(p.outline);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.4, 1.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.hideLight);
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.8, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.snout);
    ctx.beginPath();
    ctx.ellipse(side * -0.3, 0.1, 1.5, 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // head — white ovoid (outline then fill), tilted toward lower-left
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(0.22 - pose.head * 0.012); // raises the muzzle a touch when mooing
  // outline
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, 0, 5.4, 6.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // white face fill (shaded then lit)
  ctx.fillStyle = rgba(p.hideShadow);
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.7, 5.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.hideLight);
  ctx.beginPath();
  ctx.ellipse(-0.6, -0.8, 4.1, 5.0, 0, 0, Math.PI * 2);
  ctx.fill();

  // a black patch over one eye/forehead (signature spotting)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.7, 5.7, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = rgba(p.patch);
  ctx.beginPath();
  ctx.ellipse(1.8, -2.2, 2.6, 2.4, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // eyes
  ctx.fillStyle = rgba([245, 245, 240]);
  for (const ex of [-1.8, 1.8]) {
    ctx.beginPath();
    ctx.arc(ex, -1.0, 1.05, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = rgba([20, 18, 20]);
  for (const ex of [-1.6, 2.0]) {
    ctx.beginPath();
    ctx.arc(ex, -0.8, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // pink snout — broad soft snout at the lower face
  ctx.fillStyle = rgba(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, 3.6, 4.0, 2.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.snout);
  ctx.beginPath();
  ctx.ellipse(0, 3.4, 3.4, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // snout highlight + nostrils
  ctx.fillStyle = rgba([255, 255, 255], 0.18);
  ctx.beginPath();
  ctx.ellipse(-1.2, 2.4, 1.4, 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([150, 70, 84]);
  for (const ex of [-1.2, 1.2]) {
    ctx.beginPath();
    ctx.ellipse(ex, 3.9, 0.55, 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // mouth opens as it chews cud
  if (pose.chew > 0.01) {
    ctx.fillStyle = rgba([120, 56, 66]);
    ctx.beginPath();
    ctx.ellipse(0, 5.4, 1.6, 0.5 + pose.chew * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore(); // end head transform

  // ── SCARF (winter) — a little knitted band around the neck, below the head ──
  if (p.scarfAmt > 0.001) {
    const sx = hx + 5.0;
    const sy = hy + 4.2;
    ctx.save();
    ctx.globalAlpha = clamp01(p.scarfAmt);
    // wrap band
    ctx.fillStyle = rgba(p.scarfColor);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 5.6, 3.0, 0.30, 0, Math.PI * 2);
    ctx.fill();
    // darker underside for depth
    ctx.fillStyle = rgba([
      Math.max(0, p.scarfColor[0] - 50),
      Math.max(0, p.scarfColor[1] - 30),
      Math.max(0, p.scarfColor[2] - 30),
    ]);
    ctx.beginPath();
    ctx.ellipse(sx + 0.6, sy + 1.4, 5.2, 1.6, 0.30, 0, Math.PI * 2);
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

  ctx.restore(); // end squash/stretch transform

  // breath-fog puff at the snout (winter) — drawn OUTSIDE the squash transform
  // so it reads as air, not body. Static base puff + an exhale swell during
  // chew/moo (pose.hop).
  if (p.breathFogAmt > 0.001) {
    const headWorldX = bx + pose.lean + (hx - bx) * pose.squashX;
    const headWorldY = bodyY + (hy - bodyY) * pose.squashY;
    const reach = 5.4 + pose.hop * 3.4;
    ctx.fillStyle = rgba([235, 244, 255], (0.34 + 0.3 * pose.hop) * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(headWorldX - 5.5 - reach * 0.4, headWorldY + 4.4, 3.0 + pose.hop * 2.2, 2.0 + pose.hop * 1.5, 0.2, 0, Math.PI * 2);
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

function paint(ctx: CanvasRenderingContext2D, pIn: P, poseIn: Pose): void {
  const p = clampP(pIn);
  const pose = clampPose(poseIn);
  ctx.save();
  try {
    ctx.lineJoin = "round";
    paintPad(ctx, p);
    paintCow(ctx, p, pose);
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
    const p = clamp01(safeNum(pp));
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
      const by = 2;

      // Loose fur motes lifting off the thickening coat — reads the coat
      // visibly furring/growing. Present in EVERY morph (deterministic in p).
      const fluff = trans * (0.4 + 0.6 * Math.max(0, b.coatVolume - a.coatVolume + 0.4));
      if (fluff > 0.01) {
        ctx.fillStyle = rgba([255, 255, 255], 0.42 * fluff);
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
        const hx = bx - 14;
        const hy = by + 3;
        ctx.fillStyle = rgba([235, 244, 255], 0.4 * trans * fogGain);
        ctx.beginPath();
        ctx.ellipse(hx - (5 + trans * 3), hy + 4.4, 2.6 + trans * 1.8, 1.8 + trans * 1.2, 0.2, 0, Math.PI * 2);
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
