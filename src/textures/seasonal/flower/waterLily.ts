// Production seasonal art for the WATER LILY flower board tile — the approved
// bold direction. The same lily-PAD + lily-FLOWER silhouette floats on a pool
// of WATER in every season (identity rule §36: same silhouette all four seasons
// — never a bare pad, never morphing into something else), with the seasonal
// treatment dialled UP so each season reads at a glance:
//
//   • SEASONS read at a glance — colour pushed HARD on BOTH the water and the
//     pad/flower, plus a real seasonal PROP each season:
//       Spring — fresh green pad on bright clear blue water; the flower a fresh
//                BUD just opening; a few stray blossom petals on the water; cool
//                bright light + gentle dew.
//       Summer — PEAK: vivid green pad, the flower in FULL glorious bloom
//                (saturated white-pink petals, bright yellow centre), sparkling
//                high-gloss water, strong warm light. (The bloom is the statement.)
//       Autumn — pad reddening/bronzing at the edges, the flower fading and
//                DROPPING a petal, a fallen LEAF floating on the dulled water,
//                amber light.
//       Winter — the water FROZEN to ICE around the pad: bold snow/frost on the
//                pad + a snow cap, the flower closed/dormant under frost, cool
//                blue-grey light, icy sheen. Clearly iced, still a water lily.
//
//   • IDLE is mostly at rest, then a clearly-noticeable fun ACTION on a timer:
//       COMMON  (~6s, ~0.95s window): a WATER BOB/RIPPLE — the pad + flower gently
//                rock and bob ~10–14px as a buoyant ripple passes under them,
//                with expanding ripple rings on the water. Settles to the exact
//                rest pose with zero velocity (seamless). In winter the iced
//                water makes this a tiny settle + a sparkle skitter on the ice.
//       RARE    (~18s, ~1.2s window, phase +3s): a VISITING DRAGONFLY darts in
//                from the right, hovers over the bloom (fast wing-shimmer), then
//                darts off to the left — a charming once-in-a-while moment.
//                Off-screen and at zero alpha at the window edges (seamless).
//                In winter the dragonfly is gone (iced over), so the rare beat
//                becomes a brief bright ICE-SPARKLE flash instead — still seamless.
//
// Architecture (mandatory, mirrors pansy.ts): a SINGLE parameterized
// `paint(ctx, p, pose)` draws the whole tile from tweenable params `p` plus a
// `pose` object that carries the water bob/ripple and the visiting-critter
// state. Four `SP` param sets feed it. `draw` paints at REST (no critter); `anim`
// derives a `pose` from the wall clock; `transition` lerps EVERY field of `p`
// through a smootherstep so transition(0) ≡ draw(from) and transition(1) ≡
// draw(to) exactly (no snap).
//
// Origin-centered in the −24..+24 design box, light from upper-left. NodeNext —
// keep the `.js` import specifier. Edit ONLY this file.

import type { SeasonalTileEntry, SeasonalTransitionSet, SeasonName } from "../types.js";

// ── Tweenable parameter set ──────────────────────────────────────────────────

type RGB = [number, number, number];

interface P {
  // colours (pushed HARD per season for a glance-different read)
  petal: RGB; // outer lily-flower petals (white-pink → faded → frosted)
  petalTip: RGB; // petal tip / blush (the pink accent)
  petalInner: RGB; // inner cupping petals (brighter)
  center: RGB; // flower centre (yellow stamens / seed pod)
  centerDark: RGB; // centre shade / stamen dots
  pad: RGB; // lily-pad top (lit)
  padDark: RGB; // lily-pad underside / notch shade
  padEdge: RGB; // pad rim colour (bronzes in autumn)
  water: RGB; // water surface (lit)
  waterDeep: RGB; // water in shadow / depth
  outline: RGB; // soft dark outline tint
  light: RGB; // ambient light tint (overlay on whole tile)
  // scalars 0..1 (props + filter amounts; all interpolate)
  lightAmt: number; // strength of the light overlay
  shadowAmt: number; // contact-shadow strength
  bloomOpen: number; // 0 = closed bud .. 1 = fully open lily (stays mid/high — never a stub)
  gloss: number; // wet sheen / specular strength on water + pad + petals
  iceAmt: number; // 0 = liquid water .. 1 = frozen ice sheet over the pool
  frostAmt: number; // frost sparkle on pad + bloom (winter)
  padSnowAmt: number; // snow cap dusting on the pad (winter)
  padBronzeAmt: number; // reddening/bronzing of the pad edges (autumn)
  dropPetalAmt: number; // a petal dropping off + floating on the water (autumn)
  fallenLeafAmt: number; // a fallen leaf floating on the water (autumn)
  blossomAmt: number; // stray blossom petals on the water/pad (spring)
}

// ── Per-season parameter sets (silhouette constant; only these change) ────────
// Colour is pushed harder than a subtle base: bright clear water in spring,
// sparkling saturated water + full bloom at peak, a clearly dulled olive autumn,
// and a distinctly iced cool blue-grey winter.

const SP: Record<SeasonName, P> = {
  // Spring — fresh green pad on bright clear blue water; bud just opening; stray
  // blossoms; cool-bright light + dew.
  Spring: {
    petal: [248, 236, 244],
    petalTip: [240, 150, 188],
    petalInner: [255, 246, 250],
    center: [248, 214, 78],
    centerDark: [196, 150, 28],
    pad: [120, 206, 92],
    padDark: [56, 122, 58],
    padEdge: [86, 170, 78],
    water: [118, 196, 236], // bright clear blue
    waterDeep: [62, 138, 200],
    outline: [38, 56, 68],
    light: [224, 242, 255], // cool-bright
    lightAmt: 0.18,
    shadowAmt: 0.2,
    bloomOpen: 0.34, // a fresh bud just opening
    gloss: 0.6,
    iceAmt: 0,
    frostAmt: 0,
    padSnowAmt: 0,
    padBronzeAmt: 0,
    dropPetalAmt: 0,
    fallenLeafAmt: 0,
    blossomAmt: 0.85,
  },
  // Summer — PEAK: vivid green pad, full glorious white-pink bloom, sparkling
  // high-gloss water, strong warm light.
  Summer: {
    petal: [255, 250, 252],
    petalTip: [252, 132, 178],
    petalInner: [255, 252, 254],
    center: [255, 222, 60],
    centerDark: [214, 158, 16],
    pad: [86, 196, 70], // vivid green
    padDark: [40, 116, 46],
    padEdge: [70, 168, 64],
    water: [78, 188, 244], // sparkling saturated blue
    waterDeep: [36, 132, 214],
    outline: [32, 54, 62],
    light: [255, 246, 206], // warm, strong
    lightAmt: 0.16,
    shadowAmt: 0.4,
    bloomOpen: 1, // full glorious bloom
    gloss: 0.95,
    iceAmt: 0,
    frostAmt: 0,
    padSnowAmt: 0,
    padBronzeAmt: 0,
    dropPetalAmt: 0,
    fallenLeafAmt: 0,
    blossomAmt: 0,
  },
  // Autumn — pad reddening/bronzing at the edges, flower fading + dropping a
  // petal, a fallen leaf on dulled olive water; amber light.
  Autumn: {
    petal: [232, 196, 198],
    petalTip: [204, 120, 124],
    petalInner: [240, 214, 210],
    center: [216, 168, 64],
    centerDark: [158, 110, 30],
    pad: [150, 162, 70], // olive, going over
    padDark: [98, 100, 46],
    padEdge: [176, 96, 44], // bronzing rim
    water: [126, 152, 146], // dulled olive water
    waterDeep: [80, 112, 112],
    outline: [50, 50, 44],
    light: [255, 212, 148], // low amber, pushed
    lightAmt: 0.24,
    shadowAmt: 0.28,
    bloomOpen: 0.5, // fading / half-closing
    gloss: 0.34,
    iceAmt: 0,
    frostAmt: 0,
    padSnowAmt: 0,
    padBronzeAmt: 0.9,
    dropPetalAmt: 0.85,
    fallenLeafAmt: 0.85,
    blossomAmt: 0,
  },
  // Winter — water FROZEN to ICE around the pad; bold snow/frost on the pad + a
  // snow cap; flower closed/dormant under frost; cool blue-grey light, icy sheen.
  Winter: {
    petal: [224, 228, 238], // frosted, cool
    petalTip: [196, 196, 214],
    petalInner: [236, 240, 248],
    center: [206, 204, 188], // muted but still reads as the centre
    centerDark: [150, 148, 132],
    pad: [156, 184, 178], // frost-greyed green
    padDark: [98, 130, 132],
    padEdge: [132, 162, 168],
    water: [210, 228, 240], // pale ice
    waterDeep: [168, 198, 218],
    outline: [70, 90, 106],
    light: [206, 226, 250], // cool blue-grey
    lightAmt: 0.26,
    shadowAmt: 0.16,
    bloomOpen: 0.22, // closed / dormant under frost
    gloss: 0.5,
    iceAmt: 0.94,
    frostAmt: 0.9,
    padSnowAmt: 0.85,
    padBronzeAmt: 0,
    dropPetalAmt: 0,
    fallenLeafAmt: 0,
    blossomAmt: 0,
  },
};

// ── Small numeric helpers ────────────────────────────────────────────────────

const clamp01 = (x: number): number => (!Number.isFinite(x) ? 0 : x < 0 ? 0 : x > 1 ? 1 : x);

/** Coerce any non-finite number to a safe fallback (guards t / p from NaN). */
const safeNum = (x: number, fallback = 0): number => (Number.isFinite(x) ? x : fallback);

/** Smootherstep (quintic) easing — zero velocity at both ends. */
const smoother = (x: number): number => {
  const c = clamp01(x);
  return c * c * c * (c * (6 * c - 15) + 10);
};

function rgba(c: RGB, a = 1): string {
  const r = Math.round(clamp01(c[0] / 255) * 255);
  const g = Math.round(clamp01(c[1] / 255) * 255);
  const b = Math.round(clamp01(c[2] / 255) * 255);
  return `rgba(${r},${g},${b},${clamp01(a)})`;
}

function mixRGB(a: RGB, b: RGB, k: number): RGB {
  const t = clamp01(k);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * clamp01(k);
}

function lerpP(a: P, b: P, k: number): P {
  return {
    petal: mixRGB(a.petal, b.petal, k),
    petalTip: mixRGB(a.petalTip, b.petalTip, k),
    petalInner: mixRGB(a.petalInner, b.petalInner, k),
    center: mixRGB(a.center, b.center, k),
    centerDark: mixRGB(a.centerDark, b.centerDark, k),
    pad: mixRGB(a.pad, b.pad, k),
    padDark: mixRGB(a.padDark, b.padDark, k),
    padEdge: mixRGB(a.padEdge, b.padEdge, k),
    water: mixRGB(a.water, b.water, k),
    waterDeep: mixRGB(a.waterDeep, b.waterDeep, k),
    outline: mixRGB(a.outline, b.outline, k),
    light: mixRGB(a.light, b.light, k),
    lightAmt: lerp(a.lightAmt, b.lightAmt, k),
    shadowAmt: lerp(a.shadowAmt, b.shadowAmt, k),
    bloomOpen: lerp(a.bloomOpen, b.bloomOpen, k),
    gloss: lerp(a.gloss, b.gloss, k),
    iceAmt: lerp(a.iceAmt, b.iceAmt, k),
    frostAmt: lerp(a.frostAmt, b.frostAmt, k),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, k),
    padBronzeAmt: lerp(a.padBronzeAmt, b.padBronzeAmt, k),
    dropPetalAmt: lerp(a.dropPetalAmt, b.dropPetalAmt, k),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, k),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, k),
  };
}

/** Defensive clamp of every scalar in a P so paint never draws garbage / throws
 *  even if a caller hands in a non-finite or out-of-range value. */
function clampP(raw: P): P {
  return {
    ...raw,
    lightAmt: clamp01(raw.lightAmt),
    shadowAmt: clamp01(raw.shadowAmt),
    bloomOpen: clamp01(raw.bloomOpen),
    gloss: clamp01(raw.gloss),
    iceAmt: clamp01(raw.iceAmt),
    frostAmt: clamp01(raw.frostAmt),
    padSnowAmt: clamp01(raw.padSnowAmt),
    padBronzeAmt: clamp01(raw.padBronzeAmt),
    dropPetalAmt: clamp01(raw.dropPetalAmt),
    fallenLeafAmt: clamp01(raw.fallenLeafAmt),
    blossomAmt: clamp01(raw.blossomAmt),
  };
}

// ── Pose: carries the idle water bob/ripple + the visiting-critter state ──────
// `paint` reads ONLY `p` and `pose`. The pose is the seam between the static art
// and the timed idle: `draw`/`transition` pass REST (no bob, no critter).

interface CritterState {
  on: boolean; // is the dragonfly present this frame?
  x: number; // dragonfly centre x (design px), origin-centered
  y: number; // dragonfly centre y
  flap: number; // wing-shimmer factor
  t: number; // local time for sub-motions (wing buzz)
  alpha: number; // fade at the very edges of the visit
}

interface Pose {
  bob: number; // vertical buoyant bob of the pad + flower (design px; <0 = lifted)
  rock: number; // small rocking tilt of the pad + flower (radians)
  ripple: number; // 0..1 expanding ripple-ring strength on the water
  glint: number; // 0..1 live water/petal sparkle swell
  iceSparkle: number; // 0..1 winter ice-sparkle flash (the rare winter beat)
  critter: CritterState; // visiting dragonfly (warm seasons only)
}

const REST: Pose = {
  bob: 0,
  rock: 0,
  ripple: 0,
  glint: 0,
  iceSparkle: 0,
  critter: { on: false, x: 0, y: 0, flap: 0.5, t: 0, alpha: 0 },
};

// ── Constant geometry (silhouette identical every season) ────────────────────

const POOL_CX = 0;
const POOL_CY = 19;
const POOL_RX = 18;
const POOL_RY = 5.6;
const PAD_CX = 0;
const PAD_CY = 16.5;
const PAD_RX = 14.5;
const PAD_RY = 6.2;
const BLOOM_CX = 0;
const BLOOM_CY_BASE = 6.5; // bud rest y; rises as it opens

// ── The pool of water (the seasonal "ground" disc) ────────────────────────────

function drawPool(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  // soft rim / outline under the water
  ctx.fillStyle = rgba(p.outline, 0.55);
  ctx.beginPath();
  ctx.ellipse(POOL_CX, POOL_CY + 0.6, POOL_RX + 1.1, POOL_RY + 1.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // water body — vertical gradient lit→deep
  const wg = ctx.createLinearGradient(0, POOL_CY - POOL_RY, 0, POOL_CY + POOL_RY);
  wg.addColorStop(0, rgba(p.water));
  wg.addColorStop(1, rgba(p.waterDeep));
  ctx.fillStyle = wg;
  ctx.beginPath();
  ctx.ellipse(POOL_CX, POOL_CY, POOL_RX, POOL_RY, 0, 0, Math.PI * 2);
  ctx.fill();

  if (p.iceAmt > 0.02) {
    // — frozen ice sheet over the pool (winter) —
    const ig = ctx.createLinearGradient(0, POOL_CY - POOL_RY, 0, POOL_CY + POOL_RY);
    ig.addColorStop(0, rgba([238, 248, 255], 0.9 * p.iceAmt));
    ig.addColorStop(1, rgba([196, 220, 236], 0.85 * p.iceAmt));
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.ellipse(POOL_CX, POOL_CY, POOL_RX, POOL_RY, 0, 0, Math.PI * 2);
    ctx.fill();
    // crack lines (read as ice)
    ctx.strokeStyle = rgba([150, 184, 208], 0.5 * p.iceAmt);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-12, POOL_CY + 1);
    ctx.lineTo(-3, POOL_CY - 1.5);
    ctx.lineTo(6, POOL_CY + 1.6);
    ctx.lineTo(14, POOL_CY - 0.8);
    ctx.stroke();
    // cold sheen sweep + base specular (idle glint rides on top)
    const sheen = 0.18 + clamp01(pose.glint) * 0.18;
    ctx.fillStyle = rgba([255, 255, 255], sheen * p.iceAmt);
    ctx.beginPath();
    ctx.ellipse(-4, POOL_CY - 1.6, 11, 1.8, -0.08, 0, Math.PI * 2);
    ctx.fill();
    // frost sparkle dots
    ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.frostAmt);
    for (const [sx, sy] of [
      [-13, 20], [-6, 17.5], [3, 21], [11, 18.5], [15, 20.5], [-1, 18],
    ] as const) {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    // RARE winter beat: a bright ice-sparkle flash skittering across the sheet.
    const isp = clamp01(pose.iceSparkle);
    if (isp > 0.01) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(POOL_CX, POOL_CY, POOL_RX, POOL_RY, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = rgba([255, 255, 255], 0.95 * isp);
      // a couple of four-point sparkle stars sweeping left→right
      const sx = -12 + isp * 22;
      for (const [ox, oy, r] of [
        [sx, POOL_CY - 1.5, 1.6],
        [sx + 7, POOL_CY + 1.2, 1.1],
      ] as const) {
        ctx.beginPath();
        ctx.moveTo(ox, oy - r);
        ctx.lineTo(ox + r * 0.35, oy);
        ctx.lineTo(ox, oy + r);
        ctx.lineTo(ox - r * 0.35, oy);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(ox - r, oy);
        ctx.lineTo(ox, oy + r * 0.35);
        ctx.lineTo(ox + r, oy);
        ctx.lineTo(ox, oy - r * 0.35);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  } else {
    // — liquid water highlight band (specular, scales with gloss) —
    ctx.fillStyle = rgba([255, 255, 255], 0.16 + 0.24 * p.gloss);
    ctx.beginPath();
    ctx.ellipse(-5, POOL_CY - 2, 9, 1.5, -0.06, 0, Math.PI * 2);
    ctx.fill();

    // — expanding ripple rings under the pad (idle COMMON beat) —
    const rip = clamp01(pose.ripple);
    if (rip > 0.01) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(POOL_CX, POOL_CY, POOL_RX, POOL_RY, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = rgba([255, 255, 255], 0.22 * rip);
      ctx.lineWidth = 0.9;
      for (let i = 0; i < 3; i++) {
        const grow = rip * 6 + i * 4;
        ctx.beginPath();
        ctx.ellipse(0, POOL_CY, 4 + grow, (4 + grow) * (POOL_RY / POOL_RX), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // sparkles dancing on liquid water at peak gloss (idle glint)
  if (p.iceAmt <= 0.02) {
    const g = clamp01(pose.glint) * clamp01(p.gloss);
    if (g > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.7 * g);
      for (const [sx, sy] of [[-10, 18.5], [9, 20.5], [13, 18]] as const) {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.6 + 0.4 * g, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// ── Things floating ON the water, behind the pad (fallen leaf, drifting blossoms,
//    a dropped petal) ──────────────────────────────────────────────────────────

function drawFloating(ctx: CanvasRenderingContext2D, p: P, pose: Pose): void {
  // autumn fallen leaf floating on the water (drifts a touch with the ripple)
  if (p.fallenLeafAmt > 0.02) {
    const a = clamp01(p.fallenLeafAmt);
    const drift = pose.ripple * 2.2;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(11 + drift, 21);
    ctx.rotate(0.5 + pose.ripple * 0.08);
    ctx.fillStyle = rgba([188, 110, 46], a);
    ctx.strokeStyle = rgba([118, 66, 26], 0.9 * a);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.7, 2.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-3.4, 0);
    ctx.lineTo(3.4, 0);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // autumn dropped petal floating away on the water
  if (p.dropPetalAmt > 0.02) {
    const a = clamp01(p.dropPetalAmt);
    const drift = pose.ripple * 2.0;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(-10 - drift, 20.5);
    ctx.rotate(-0.4 - pose.ripple * 0.1);
    ctx.fillStyle = rgba(p.petalTip, a);
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.8, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // spring stray blossom petals dotted on the water near the pad
  if (p.blossomAmt > 0.02) {
    const a = clamp01(p.blossomAmt);
    const spots: Array<[number, number]> = [
      [-12, 21], [12, 20.5], [-6, 22.5], [7, 22],
    ];
    spots.forEach(([sx, sy], i) => {
      if (i / spots.length < a + 0.05) {
        ctx.fillStyle = rgba([250, 214, 234], 0.95 * a);
        for (let k = 0; k < 5; k++) {
          const ang = (k / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(sx + Math.cos(ang) * 1.2, sy + Math.sin(ang) * 0.9, 0.85, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = rgba([255, 236, 118], 0.95 * a);
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
}

// ── The lily pad (silhouette constant; colour + frost/snow/bronze from p) ─────

function drawPad(ctx: CanvasRenderingContext2D, p: P): void {
  const padCol = mixRGB(p.pad, [196, 182, 86], 0); // base; bronze handled via rim
  const padDarkCol = p.padDark;

  // pad outline / underside shadow
  ctx.fillStyle = rgba(p.outline, 0.7);
  ctx.beginPath();
  ctx.ellipse(PAD_CX, PAD_CY + 0.8, PAD_RX + 1, PAD_RY + 1, 0, 0, Math.PI * 2);
  ctx.fill();

  // pad body — dark base then lit top (layered like wheat.ts)
  ctx.fillStyle = rgba(padDarkCol);
  ctx.beginPath();
  ctx.ellipse(PAD_CX, PAD_CY, PAD_RX, PAD_RY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(padCol);
  ctx.beginPath();
  ctx.ellipse(PAD_CX - 0.6, PAD_CY - 0.9, PAD_RX - 1.2, PAD_RY - 1.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // autumn bronzing rim — a bold warm/red ring inside the edge
  if (p.padBronzeAmt > 0.04) {
    const a = clamp01(p.padBronzeAmt);
    ctx.strokeStyle = rgba(p.padEdge, 0.85 * a);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(PAD_CX, PAD_CY, PAD_RX - 1.2, PAD_RY - 1.0, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // classic lily-pad notch (a wedge cut from the front-right)
  ctx.fillStyle = rgba(p.waterDeep);
  ctx.beginPath();
  ctx.moveTo(PAD_CX + 1, PAD_CY);
  ctx.lineTo(PAD_CX + PAD_RX - 1, PAD_CY + 1.4);
  ctx.lineTo(PAD_CX + PAD_RX - 4, PAD_CY + 3.2);
  ctx.closePath();
  ctx.fill();

  // radial vein lines on the pad
  ctx.strokeStyle = rgba(padDarkCol, 0.7);
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * Math.PI * 2 + 0.25;
    if (ang > 0.0 && ang < 0.5) continue; // skip the notch wedge
    ctx.beginPath();
    ctx.moveTo(PAD_CX, PAD_CY - 0.6);
    ctx.lineTo(
      PAD_CX + Math.cos(ang) * (PAD_RX - 2.5),
      PAD_CY - 0.6 + Math.sin(ang) * (PAD_RY - 1.8),
    );
    ctx.stroke();
  }

  // pad glossy sheen
  ctx.fillStyle = rgba([255, 255, 255], 0.1 + 0.2 * p.gloss);
  ctx.beginPath();
  ctx.ellipse(PAD_CX - 4, PAD_CY - 2.4, 5, 1.8, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // winter snow cap dusting on the pad
  if (p.padSnowAmt > 0.03) {
    const a = clamp01(p.padSnowAmt);
    ctx.fillStyle = rgba([246, 251, 255], 0.9 * a);
    ctx.beginPath();
    ctx.ellipse(PAD_CX - 1, PAD_CY - 1.7, PAD_RX - 3.2, PAD_RY - 2.8, -0.05, 0, Math.PI * 2);
    ctx.fill();
    // a couple of chunkier clumps for weight
    ctx.fillStyle = rgba([255, 255, 255], 0.95 * a);
    for (const [sx, sy, r] of [[-5, PAD_CY - 2.4, 2.2], [4, PAD_CY - 1.6, 1.8]] as const) {
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // winter frost sparkle on the pad
  if (p.frostAmt > 0.04) {
    ctx.fillStyle = rgba([255, 255, 255], 0.75 * p.frostAmt);
    for (const [fx, fy] of [[-8, 15.5], [6, 14.5], [10, 17], [-2, 18]] as const) {
      ctx.beginPath();
      ctx.arc(fx, fy, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ── The lily flower resting on the pad (white-pink petals, yellow centre) ─────
// `glint` is the live petal sparkle (0 at rest); set by the idle.

function drawBloom(ctx: CanvasRenderingContext2D, p: P, glint: number): void {
  const open = clamp01(p.bloomOpen);
  const bloomCx = BLOOM_CX;
  const bloomCy = BLOOM_CY_BASE - open * 4.5; // y ~ +6.5 (bud) .. +2 (open)

  const petalCol = p.petal;
  const tipCol = p.petalTip;
  const outlineCol = p.outline;

  // one petal: a pointed leaf shape, dark-outlined then filled
  const drawPetal = (
    angle: number,
    spread: number,
    length: number,
    width: number,
    fill: RGB,
    tip: RGB,
  ): void => {
    ctx.save();
    ctx.translate(bloomCx, bloomCy);
    ctx.rotate(angle);
    // outline
    ctx.fillStyle = rgba(outlineCol, 0.85);
    ctx.beginPath();
    ctx.moveTo(0, spread + 0.6);
    ctx.quadraticCurveTo(-width - 0.6, -length * 0.55, 0, -length - 0.6);
    ctx.quadraticCurveTo(width + 0.6, -length * 0.55, 0, spread + 0.6);
    ctx.fill();
    // body
    const pg = ctx.createLinearGradient(0, spread, 0, -length);
    pg.addColorStop(0, rgba(fill));
    pg.addColorStop(1, rgba(tip));
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.moveTo(0, spread);
    ctx.quadraticCurveTo(-width, -length * 0.55, 0, -length);
    ctx.quadraticCurveTo(width, -length * 0.55, 0, spread);
    ctx.fill();
    ctx.restore();
  };

  // Back row of petals (opens outward with bloomOpen). Drawn first (behind).
  const backCount = 6;
  for (let i = 0; i < backCount; i++) {
    const base = (i - (backCount - 1) / 2) * 0.42;
    const angle = base * (0.35 + open * 1.05);
    const length = lerp(8.5, 12.5, open);
    const width = lerp(2.4, 4.2, open);
    drawPetal(angle, 2.2, length, width, petalCol, tipCol);
  }

  // Front/inner row — tighter, slightly brighter, partly cupping the centre.
  const frontCount = 5;
  const frontFill = p.petalInner;
  for (let i = 0; i < frontCount; i++) {
    const base = (i - (frontCount - 1) / 2) * 0.4;
    const angle = base * (0.28 + open * 0.7);
    const length = lerp(7.5, 10, open);
    const width = lerp(2.0, 3.2, open);
    drawPetal(angle, 1.4, length, width, frontFill, tipCol);
  }

  // Flower centre — visible mostly when open (yellow seed pod / stamens).
  if (open > 0.12) {
    const ca = clamp01((open - 0.12) / 0.88);
    ctx.fillStyle = rgba(outlineCol, 0.8 * ca);
    ctx.beginPath();
    ctx.ellipse(bloomCx, bloomCy - 1.4, 3.2, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.center, ca);
    ctx.beginPath();
    ctx.ellipse(bloomCx, bloomCy - 1.7, 2.6, 2.1, 0, 0, Math.PI * 2);
    ctx.fill();
    // stamen dots
    ctx.fillStyle = rgba(p.centerDark, ca);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(bloomCx + Math.cos(a) * 1.8, bloomCy - 1.7 + Math.sin(a) * 1.2, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Closed bud: a pink-tipped pointed cap so it still reads as a lily bud.
    ctx.fillStyle = rgba(outlineCol, 0.8);
    ctx.beginPath();
    ctx.moveTo(bloomCx, bloomCy + 2.4);
    ctx.quadraticCurveTo(bloomCx - 3.6, bloomCy - 3, bloomCx, bloomCy - 9.5);
    ctx.quadraticCurveTo(bloomCx + 3.6, bloomCy - 3, bloomCx, bloomCy + 2.4);
    ctx.fill();
    const bg = ctx.createLinearGradient(0, bloomCy + 2, 0, bloomCy - 9);
    bg.addColorStop(0, rgba(petalCol));
    bg.addColorStop(1, rgba(tipCol));
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(bloomCx, bloomCy + 1.8);
    ctx.quadraticCurveTo(bloomCx - 2.8, bloomCy - 2.8, bloomCx, bloomCy - 8.6);
    ctx.quadraticCurveTo(bloomCx + 2.8, bloomCy - 2.8, bloomCx, bloomCy + 1.8);
    ctx.fill();
  }

  // frost on the bloom (winter) — pale wash + sparkle (dormant under frost)
  if (p.frostAmt > 0.04) {
    ctx.fillStyle = rgba([236, 246, 255], 0.32 * p.frostAmt);
    ctx.beginPath();
    ctx.ellipse(bloomCx, bloomCy - 1, 7.5, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.85 * p.frostAmt);
    for (const [fx, fy] of [
      [-3, bloomCy - 4], [2.5, bloomCy - 6], [0, bloomCy + 1],
    ] as const) {
      ctx.beginPath();
      ctx.arc(fx, fy, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // live petal glint (spring/summer) — static seed from gloss + live swell.
  const gl = clamp01(p.gloss) * 0.4 + clamp01(glint) * 0.6;
  if (p.iceAmt <= 0.02 && gl > 0.04) {
    ctx.fillStyle = rgba([255, 255, 255], 0.4 * gl);
    ctx.beginPath();
    ctx.ellipse(bloomCx - 2.2, bloomCy - 3.5, 1.3 + 0.5 * gl, 2.1, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Visiting dragonfly (fast wing-shimmer; darts in and away) ─────────────────
// Drawn at the dragonfly's current (x, y) with a flap factor. Scaled to sit
// nicely against the tile.

function drawDragonfly(ctx: CanvasRenderingContext2D, c: CritterState): void {
  if (!c.on || c.alpha <= 0.01) return;
  const t = c.t;
  const flap = c.flap;
  ctx.save();
  ctx.globalAlpha = clamp01(c.alpha);
  ctx.translate(c.x, c.y);
  ctx.scale(0.5, 0.5);
  ctx.rotate(-0.18 + Math.sin(t * 1.6) * 0.05);

  // Wings — two pairs of long translucent blades, shimmering fast.
  [-1, 1].forEach((side) => {
    [0, 1].forEach((pair) => {
      ctx.save();
      ctx.translate(-1 + pair * 4, -1);
      ctx.scale(side, 1);
      ctx.rotate((pair === 0 ? -0.5 : -0.1) + (flap - 0.5) * 0.5);
      const wing = ctx.createLinearGradient(0, 0, 16, -2);
      wing.addColorStop(0, "rgba(210,238,255,0.65)");
      wing.addColorStop(1, "rgba(150,200,235,0.25)");
      ctx.fillStyle = wing;
      ctx.beginPath();
      ctx.ellipse(8, -1, 8, 2.2, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(110,150,190,0.55)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    });
  });

  // Long slender body (thorax + tail) — teal/green sheen.
  const body = ctx.createLinearGradient(-4, 0, 16, 0);
  body.addColorStop(0, "#2f7d6a");
  body.addColorStop(0.5, "#3fae8e");
  body.addColorStop(1, "#1f5a52");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(7, 0, 11, 2, 0, 0, Math.PI * 2); // tail
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-2, 0, 4.2, 3.2, 0, 0, Math.PI * 2); // thorax
  ctx.fill();
  ctx.strokeStyle = "#143b34";
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // tail segments
  ctx.strokeStyle = "rgba(20,59,52,0.7)";
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 4; i++) {
    const sx = 3 + i * 4;
    ctx.beginPath();
    ctx.moveTo(sx, -2);
    ctx.lineTo(sx, 2);
    ctx.stroke();
  }

  // Head + big compound eyes
  ctx.fillStyle = "#1f5a52";
  ctx.beginPath();
  ctx.arc(-6.5, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0c2a26";
  ctx.beginPath();
  ctx.arc(-7.4, -1.2, 1.4, 0, Math.PI * 2);
  ctx.arc(-7.4, 1.2, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(180,230,210,0.7)";
  ctx.beginPath();
  ctx.arc(-7.9, -1.4, 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ── The single parameterized paint ───────────────────────────────────────────

function paint(ctx: CanvasRenderingContext2D, raw: P, pose: Pose): void {
  const p = clampP(raw);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // — contact shadow (soft, lower-right) —
    ctx.fillStyle = `rgba(0,0,0,${0.16 + p.shadowAmt * 0.24})`;
    ctx.beginPath();
    ctx.ellipse(2.5, 22.5, 16, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // — the pool / ice (with idle ripples / ice sparkle) —
    drawPool(ctx, p, pose);

    // — things floating ON the water, behind the pad —
    drawFloating(ctx, p, pose);

    // The pad + flower ride the buoyant bob + a small rocking tilt. The rock
    // pivots around the pad centre so the whole unit rocks as one on the water.
    ctx.save();
    ctx.translate(0, pose.bob);
    ctx.translate(PAD_CX, PAD_CY);
    ctx.rotate(pose.rock);
    ctx.translate(-PAD_CX, -PAD_CY);
    drawPad(ctx, p);
    drawBloom(ctx, p, pose.glint);
    ctx.restore();

    // The visiting dragonfly flies in over everything (plain tile space).
    drawDragonfly(ctx, pose.critter);

    // — global light overlay (cel ambient) —
    if (p.lightAmt > 0.001) {
      ctx.save();
      ctx.globalCompositeOperation = "soft-light";
      const lg = ctx.createRadialGradient(-10, -10, 2, 0, 0, 40);
      lg.addColorStop(0, rgba(p.light, p.lightAmt));
      lg.addColorStop(1, rgba(p.light, 0));
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } catch {
    /* never throw from paint */
  } finally {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }
}

// ── Idle clock: two-tier occasional action via `actionQ` ──────────────────────
//
// `actionQ` returns a normalized progress 0..1 inside an action window that
// fires once per `period`, else −1 (at rest). Each action is shaped so value AND
// velocity are zero at the window edges → the tile settles back to the exact
// rest pose and the loop is seamless.

function actionQ(t: number, period: number, win: number, phase: number): number {
  const c = (((t + phase) % period) + period) % period;
  return c < win ? c / win : -1;
}

/** A 0..1 buoyant bell with a small follow-through dip after the crest, 0
 *  (value + slope) at q=0 and q=1. */
function bobShape(q: number): number {
  const main = Math.sin(Math.PI * q); // 0..1..0
  const follow = -0.16 * Math.sin(2 * Math.PI * q) * q; // small late settle/dip
  return main + follow;
}

// Idle timing.
const BOB_PERIOD = 6.0; // common water bob/ripple every ~6s
const BOB_WIN = 0.95; // ~0.95s window
const RARE_PERIOD = 18.0; // rare special every ~18s
const RARE_WIN = 1.2; // ~1.2s window
const RARE_PHASE = 3.0; // offset so the special doesn't collide with the first bob

/** Build the live pose for time `t` (seconds). Mostly REST; a water bob/ripple
 *  every ~6s and a rare special every ~18s (dragonfly in warm seasons; an
 *  ice-sparkle flash in winter). Returns a fresh Pose (REST is never mutated). */
function poseFromClock(t: number, season: SeasonName): Pose {
  const tt = safeNum(t);
  const p = SP[season];
  const iced = p.iceAmt > 0.5;

  // — COMMON: buoyant water bob/ripple (~6s). The pad + flower rock and bob. —
  let bob = 0;
  let rock = 0;
  let ripple = 0;
  let glint = 0;
  const qb = actionQ(tt, BOB_PERIOD, BOB_WIN, 0);
  if (qb >= 0) {
    const s = bobShape(qb); // ~ 0 .. 1 .. 0 (with a small late dip)
    if (iced) {
      // Iced over: only a tiny settle of the frozen unit + a glint skitter.
      bob = -Math.abs(s) * 2.2;
      rock = Math.sin(Math.PI * qb) * 0.015;
      ripple = 0; // no rings on ice
      glint = Math.sin(Math.PI * qb);
    } else {
      // Liquid water: a bold buoyant bob (~10–14px) + rock + ripple rings.
      bob = -s * 12; // up to ~12px lift as the ripple passes under
      rock = Math.sin(qb * Math.PI * 2) * 0.06; // gentle rock one way then back
      ripple = Math.sin(Math.PI * qb); // rings expand then fade
      glint = Math.sin(Math.PI * qb);
    }
  }

  // — RARE: special every ~18s. —
  const critter: CritterState = { on: false, x: 0, y: 0, flap: 0.5, t: 0, alpha: 0 };
  let iceSparkle = 0;
  const qr = actionQ(tt, RARE_PERIOD, RARE_WIN, RARE_PHASE);
  if (qr >= 0) {
    if (iced) {
      // Winter rare beat: a bright ice-sparkle flash skittering across the sheet.
      // 0 at both window edges (∝ sin(π·qr)) so it's invisible at the seams.
      iceSparkle = Math.min(1, Math.sin(Math.PI * qr) * 2.2);
    } else {
      // Warm-season rare beat: a visiting DRAGONFLY darts in from the right,
      // hovers over the bloom, then darts off to the left.
      critter.on = true;
      critter.t = tt; // continuous local time for wing shimmer
      critter.flap = 0.4 + Math.abs(Math.sin(tt * 30)) * 0.8; // fast wing-shimmer

      const ENTER_X = 34;
      const HOVER_X = 3;
      const EXIT_X = -34;
      const HOVER_Y = -2;
      if (qr < 0.4) {
        const k = smoother(qr / 0.4);
        critter.x = ENTER_X + (HOVER_X - ENTER_X) * k;
        critter.y = -16 + (HOVER_Y - -16) * k + Math.sin(qr * 20) * 1.1;
      } else if (qr < 0.62) {
        const h = (qr - 0.4) / 0.22;
        critter.x = HOVER_X + Math.sin(h * Math.PI * 2) * 2.0;
        critter.y = HOVER_Y + Math.sin(tt * 4.0) * 1.6;
      } else {
        const k = smoother((qr - 0.62) / 0.38);
        critter.x = HOVER_X + (EXIT_X - HOVER_X) * k;
        critter.y = HOVER_Y + (-18 - HOVER_Y) * k - Math.sin(k * 6) * 1.3;
      }
      // Fade fully at the very window edges so it's invisible at the seams.
      critter.alpha = Math.min(1, Math.sin(Math.PI * qr) * 3);
    }
  }

  return { bob, rock, ripple, glint, iceSparkle, critter };
}

// ── draw / anim / transition factories ───────────────────────────────────────

function makeDraw(season: SeasonName) {
  return (ctx: CanvasRenderingContext2D): void => paint(ctx, SP[season], REST);
}

function makeAnim(season: SeasonName) {
  return (ctx: CanvasRenderingContext2D, t: number): void => {
    let pose: Pose;
    try {
      pose = poseFromClock(safeNum(t), season);
    } catch {
      pose = REST;
    }
    paint(ctx, SP[season], pose);
  };
}

function makeTransition(from: SeasonName, to: SeasonName) {
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const p = clamp01(safeNum(pp));
    const k = smoother(p); // 0 at p=0, 1 at p=1 → endpoints are EXACT stills
    const trans = Math.sin(Math.PI * p); // 0 at both ends, peaks at p=0.5
    const lp = lerpP(SP[from], SP[to], k);

    // A through-morph buoyant nod: zero at both endpoints (∝ sin(π·p)), so the
    // static endpoints (≡ draw(from)/draw(to)) are untouched.
    const pose: Pose = {
      bob: -1.4 * trans,
      rock: 0.02 * trans,
      ripple: 0,
      glint: 0,
      iceSparkle: 0,
      critter: { on: false, x: 0, y: 0, flap: 0.5, t: 0, alpha: 0 },
    };

    ctx.save();
    try {
      paint(ctx, lp, pose);

      // — per-morph transient overlays — all ∝ trans so 0 at both ends —
      ctx.save();
      ctx.translate(0, pose.bob);
      if (to === "Summer") {
        // Spring→Summer: a brief saturating bloom-glow as the lily opens.
        ctx.globalAlpha = 0.2 * trans;
        ctx.fillStyle = "rgba(255,250,220,1)";
        ctx.beginPath();
        ctx.arc(BLOOM_CX, BLOOM_CY_BASE - 2.5, 9, 0, Math.PI * 2);
        ctx.fill();
      } else if (to === "Autumn") {
        // Summer→Autumn: a dropped petal lifts off + a couple of rust motes.
        ctx.fillStyle = `rgba(204,120,124,${0.6 * trans})`;
        const rise = trans * 4;
        ctx.beginPath();
        ctx.ellipse(-4, 4 - rise, 2.2, 1.2, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(170,110,60,${0.5 * trans})`;
        for (const [mx, my, ph] of [[3, -2, 0], [6, 2, 1.7]] as const) {
          ctx.beginPath();
          ctx.arc(mx + Math.sin(ph) * 1.4, my - rise, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Autumn→Winter: the water freezes — frost dusts in + a few flakes
        // settle. The ice/snow/frost themselves ride the lerped iceAmt etc. in
        // `lp` (exact at p=1); these are just transient sparkle on top.
        ctx.fillStyle = `rgba(236,246,255,${0.7 * trans})`;
        for (const [fx, fy] of [
          [-5, -4], [-0.5, -6], [4, -4.5], [-7, 16], [6, 17],
        ] as const) {
          ctx.beginPath();
          ctx.arc(fx, fy, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(255,255,255,${0.8 * trans})`;
        for (const [fx, ph] of [[-6, 0.2], [7, 0.65]] as const) {
          const yy = -16 + p * 32;
          ctx.beginPath();
          ctx.arc(fx + Math.sin(p * 6 + ph * 6) * 3, yy, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    } catch {
      /* never throw from a transition */
    } finally {
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  };
}

// ── Exports ──────────────────────────────────────────────────────────────────

export const VARIANTS: SeasonalTileEntry = {
  Spring: { draw: makeDraw("Spring"), anim: makeAnim("Spring") },
  Summer: { draw: makeDraw("Summer"), anim: makeAnim("Summer") },
  Autumn: { draw: makeDraw("Autumn"), anim: makeAnim("Autumn") },
  Winter: { draw: makeDraw("Winter"), anim: makeAnim("Winter") },
};

export const TRANSITIONS: SeasonalTransitionSet = {
  0: makeTransition("Spring", "Summer"),
  1: makeTransition("Summer", "Autumn"),
  2: makeTransition("Autumn", "Winter"),
};
