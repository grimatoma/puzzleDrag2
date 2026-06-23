// BOLD seasonal art for the PALM tree board tile (`tile_tree_palm`).
//
// A curved slim palm: a gently-leaning brown segmented trunk topped by a crown
// FAN of long arching green fronds, with a small cluster of coconuts nestled at
// the crown base. The palm IDENTITY is constant every season — the curved trunk
// and the frond-fan silhouette never change; only colour and a small seasonal
// DRESSING (a new-frond bud, a fallen frond/coconut, snow caps + icicle, frost)
// change. The fronds stay GREEN and the trunk stays BROWN all year (palette
// lock). Seasons are made UNMISTAKABLE at a glance (~58 px):
//   Spring — bright FRESH lime fronds + a tiny pink flower / unfurling new frond.
//   Summer — lush vivid PEAK green fronds, full and glossy (the high point).
//   Autumn — lower fronds BROWNING & drooping + a fallen frond AND a fallen
//            coconut resting on the pad.
//   Winter — a cooler frostier palm with a snow DUSTING / caps on the frond tips
//            and a small ICICLE hanging off a low frond. Tropical, so the snow
//            is lighter than a conifer's — but the cool blue cast is clear.
//
// IDENTITY across seasons is enforced by a single parameterized `paint(ctx, p,
// bob)` plus a `paintWithSway(...)` overlay that only adds idle motion:
//   - draw(season)     = paint(ctx, SP[season], 0)
//   - anim(season)     = two-tier WC3 idle (see below) over paint(...)
//   - transition(from) = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
// Because every still is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to).
//
// TWO-TIER WC3 IDLE (deterministic `actionQ` clock; mostly at rest):
//   COMMON  — every ~6 s the frond fan SWAYS in a breeze: a TRAVELING WAVE rolls
//             left→right across the fronds, ~13 px peak tip travel, anticipation
//             then settle, zero velocity at both window edges (seamless).
//   RARE    — every ~18 s a coconut WOBBLES and a small BIRD flits in, perches a
//             beat on a frond, then flits up-and-off. Bold/noticeable, gone by
//             the window edge. (Autumn has no coconuts hanging — only the fallen
//             one — so its rare special is the bird alone.)
// Both tiers come back to the exact rest pose at their window edges.
//
// Origin-centered −24..+24 design box, light from upper-left, flat cel-shaded
// with a soft dark outline. Pure Canvas-2D vector drawing; never throws.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable params ─────────────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly. */
interface P {
  frondLight: RGB;   // lit upper face of the fronds (locked GREEN family)
  frondMid: RGB;     // body green of the fronds
  frondDark: RGB;    // shadowed under-fronds
  frondTip: RGB;     // colour the lower frond TIPS fade toward (autumn browning)
  trunkLight: RGB;   // lit face of the trunk (locked BROWN family)
  trunkDark: RGB;    // shaded side / bark grooves of the trunk
  coconut: RGB;      // the coconut cluster
  padGrass: RGB;     // top of the grass pad
  padDark: RGB;      // shaded pad underside
  soil: RGB;         // contact / base soil under the trunk
  outline: RGB;      // soft dark outline tint
  light: RGB;        // ambient light tint laid over the whole tile
  lightAmt: number;  // 0..1 strength of the ambient light wash
  vigor: number;     // 0..1 frond freshness (reserved colour cue, peaks summer)
  gloss: number;     // 0..1 leaf sheen on the fronds
  tipBrown: number;  // 0..1 how far the LOWER frond tips brown toward frondTip
  droop: number;     // 0..1 extra downward droop of the lower fronds
  frostAmt: number;  // 0..1 cool frost dusting on the fronds
  snowCapAmt: number; // 0..1 snow resting on the upward frond surfaces
  icicleAmt: number;  // 0..1 a small icicle hanging off a low frond (winter)
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad (spring)
  budAmt: number;     // 0..1 a tiny flower / unfurling new frond at the crown (spring)
  coconutAmt: number; // 0..1 how present the HANGING coconut cluster is
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad (autumn)
  fallenFrondAmt: number; // 0..1 a whole fallen frond on the pad (autumn)
  fallenNutAmt: number;   // 0..1 a fallen coconut resting on the pad (autumn)
}

// ── Local math helpers ───────────────────────────────────────────────────────

function clamp01(x: number): number {
  if (!(x >= 0)) return 0; // also catches NaN
  if (x > 1) return 1;
  return x;
}

const smoother = (x: number): number => {
  const c = clamp01(x);
  return c * c * c * (c * (6 * c - 15) + 10);
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function rgb(c: RGB): string {
  return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
}

function rgba(c: RGB, a: number): string {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${clamp01(a)})`;
}

function lerpP(a: P, b: P, t: number): P {
  return {
    frondLight: lerpRGB(a.frondLight, b.frondLight, t),
    frondMid: lerpRGB(a.frondMid, b.frondMid, t),
    frondDark: lerpRGB(a.frondDark, b.frondDark, t),
    frondTip: lerpRGB(a.frondTip, b.frondTip, t),
    trunkLight: lerpRGB(a.trunkLight, b.trunkLight, t),
    trunkDark: lerpRGB(a.trunkDark, b.trunkDark, t),
    coconut: lerpRGB(a.coconut, b.coconut, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    vigor: lerp(a.vigor, b.vigor, t),
    gloss: lerp(a.gloss, b.gloss, t),
    tipBrown: lerp(a.tipBrown, b.tipBrown, t),
    droop: lerp(a.droop, b.droop, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
    icicleAmt: lerp(a.icicleAmt, b.icicleAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    budAmt: lerp(a.budAmt, b.budAmt, t),
    coconutAmt: lerp(a.coconutAmt, b.coconutAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
    fallenFrondAmt: lerp(a.fallenFrondAmt, b.fallenFrondAmt, t),
    fallenNutAmt: lerp(a.fallenNutAmt, b.fallenNutAmt, t),
  };
}

function clampP(p: P): P {
  return {
    ...p,
    lightAmt: clamp01(p.lightAmt),
    vigor: clamp01(p.vigor),
    gloss: clamp01(p.gloss),
    tipBrown: clamp01(p.tipBrown),
    droop: clamp01(p.droop),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    icicleAmt: clamp01(p.icicleAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    budAmt: clamp01(p.budAmt),
    coconutAmt: clamp01(p.coconutAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    fallenFrondAmt: clamp01(p.fallenFrondAmt),
    fallenNutAmt: clamp01(p.fallenNutAmt),
  };
}

// ── Per-season params (BOLD) ──────────────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — BRIGHT fresh lime-green fronds; bright lime dewy pad + blossom and
  // a tiny pink flower / unfurling new frond at the crown.
  Spring: {
    frondLight: [180, 236, 110],
    frondMid: [110, 192, 76],
    frondDark: [54, 124, 50],
    frondTip: [160, 220, 100],
    trunkLight: [156, 116, 72],
    trunkDark: [96, 66, 38],
    coconut: [118, 84, 48],
    padGrass: [132, 212, 88],
    padDark: [72, 142, 58],
    soil: [120, 84, 48],
    outline: [40, 60, 30],
    light: [236, 248, 228],
    lightAmt: 0.17,
    vigor: 0.65,
    gloss: 0.3,
    tipBrown: 0,
    droop: 0.06,
    frostAmt: 0,
    snowCapAmt: 0,
    icicleAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.95,
    budAmt: 0.95,
    coconutAmt: 1,
    fallenLeafAmt: 0,
    fallenFrondAmt: 0,
    fallenNutAmt: 0,
  },
  // Summer — lush vivid PEAK green fronds; saturated mid-green pad; warm glossy.
  Summer: {
    frondLight: [150, 224, 80],
    frondMid: [66, 168, 54],
    frondDark: [28, 102, 40],
    frondTip: [112, 198, 66],
    trunkLight: [164, 120, 72],
    trunkDark: [100, 66, 36],
    coconut: [110, 76, 42],
    padGrass: [86, 172, 70],
    padDark: [44, 112, 48],
    soil: [126, 86, 48],
    outline: [26, 58, 26],
    light: [255, 240, 204],
    lightAmt: 0.19,
    vigor: 1.0,
    gloss: 0.85,
    tipBrown: 0,
    droop: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    icicleAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    budAmt: 0,
    coconutAmt: 1,
    fallenLeafAmt: 0,
    fallenFrondAmt: 0,
    fallenNutAmt: 0,
  },
  // Autumn — fronds still green but the LOWER tips BROWN hard (olive-tan) and
  // droop; rust pad; a whole fallen frond AND a fallen coconut on the pad.
  Autumn: {
    frondLight: [134, 184, 80],
    frondMid: [88, 142, 56],
    frondDark: [50, 92, 38],
    frondTip: [190, 132, 52], // olive-tan the lower tips fade toward (bolder)
    trunkLight: [150, 108, 64],
    trunkDark: [92, 60, 32],
    coconut: [104, 70, 38],
    padGrass: [156, 152, 84],
    padDark: [108, 96, 50],
    soil: [120, 80, 44],
    outline: [46, 50, 26],
    light: [248, 206, 144],
    lightAmt: 0.21,
    vigor: 0.65,
    gloss: 0.38,
    tipBrown: 0.95,
    droop: 0.7,
    frostAmt: 0,
    snowCapAmt: 0,
    icicleAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    budAmt: 0,
    coconutAmt: 0.5, // some have dropped
    fallenLeafAmt: 0.8,
    fallenFrondAmt: 0.95,
    fallenNutAmt: 0.95,
  },
  // Winter — a COOLER, frostier palm. Fronds stay GREEN under a light snow
  // dusting + caps on the tips + frost; a small icicle off a low frond; snowy
  // pad; cold blue light. Tropical = lighter snow than a conifer, but clearly
  // a cooler winter (no white-out: the green stays visible underneath).
  Winter: {
    frondLight: [128, 174, 110],
    frondMid: [76, 138, 84],
    frondDark: [44, 96, 64],
    frondTip: [122, 168, 122],
    trunkLight: [138, 112, 86],
    trunkDark: [86, 64, 48],
    coconut: [104, 80, 58],
    padGrass: [182, 200, 218],
    padDark: [120, 146, 172],
    soil: [128, 110, 96],
    outline: [44, 52, 50],
    light: [200, 222, 252],
    lightAmt: 0.34,
    vigor: 0.5,
    gloss: 0.2,
    tipBrown: 0.08,
    droop: 0.32,
    frostAmt: 0.8,
    snowCapAmt: 0.85,
    icicleAmt: 0.9,
    padSnowAmt: 0.92,
    blossomAmt: 0,
    budAmt: 0,
    coconutAmt: 1,
    fallenLeafAmt: 0,
    fallenFrondAmt: 0,
    fallenNutAmt: 0,
  },
};

// ── Geometry constants (the SAME silhouette every season) ─────────────────────

// Trunk: gently leaning, base at the pad centre, crown high up. Origin-centered.
const TRUNK_BASE_X = 0;     // contact x on the pad
const TRUNK_BASE_Y = 18;    // contact y (on the pad)
const TRUNK_TOP_X = 6;      // crown attach x (lean to the right)
const TRUNK_TOP_Y = -10;    // crown attach y (top of trunk)
const TRUNK_CTRL_X = -2;    // control point biasing the gentle S-curve
const TRUNK_CTRL_Y = 4;
const TRUNK_HALF = 3.4;     // half-width of the trunk at the base
const SEGMENTS = 6;         // bark segment rings up the trunk

// The fronds fan from the crown anchor (TRUNK_TOP). Each: an angle (radians,
// 0 = up, +ve = toward right), a length, and a base droop bias. Constant set →
// constant silhouette; `droop` from P only deepens the lower fronds.
const FRONDS: Array<{ ang: number; len: number; lower: number }> = [
  { ang: -1.32, len: 21, lower: 1.0 }, // far left, sweeps down-left (lower)
  { ang: -0.86, len: 23, lower: 0.45 }, // upper-left
  { ang: -0.34, len: 20, lower: 0.0 }, // top-left
  { ang: 0.16, len: 20, lower: 0.0 }, // top-right
  { ang: 0.74, len: 23, lower: 0.45 }, // upper-right
  { ang: 1.30, len: 21, lower: 1.0 }, // far right, sweeps down-right (lower)
];

// ── Idle clock helpers (deterministic, two-tier WC3) ─────────────────────────

// Deterministic action clock. Returns a phase in [0,1) WHILE inside the action
// window (length `win` seconds, repeating every `period`), or −1 at rest.
function actionQ(t: number, period: number, win: number, phase: number): number {
  const c = (((t + phase) % period) + period) % period;
  return c < win ? c / win : -1;
}

// A one-shot bell: 0 → 1 → 0 over the window with ZERO velocity at both ends
// (sin² is C¹-zero at 0 and 1). Used to envelope the bird / coconut wobble.
function bell(q: number): number {
  if (q < 0) return 0;
  const s = Math.sin(Math.PI * clamp01(q));
  return s * s;
}

// A signed lean: rises, peaks, returns — zero value AND zero slope at q=0,q=1.
function leanEnvelope(q: number): number {
  if (q < 0) return 0;
  return (1 - Math.cos(2 * Math.PI * clamp01(q))) * 0.5;
}

// COMMON breeze: every ~6 s, a ~1.2 s window. RARE special: every ~18 s, ~1.4 s.
const SWAY_PERIOD = 6.0;
const SWAY_WIN = 1.2;
const SWAY_AMP = 13; // peak frond-TIP horizontal travel in design px (BOLD)

const SPECIAL_PERIOD = 18.0;
const SPECIAL_WIN = 1.4;

// Traveling-wave breeze sway for frond `i` at time `t`. The whole envelope is
// driven by the COMMON action window so it is exactly 0 (rest pose) outside the
// window and at both edges. A phase offset per frond makes the gust ROLL across
// the fan (left fronds lead, right fronds follow), and each frond's own tip
// travel scales with how far it points sideways. Bob also rides the window so
// the crown lifts a touch with the gust.
function swayOfFrond(t: number, i: number): number {
  const q = actionQ(t, SWAY_PERIOD, SWAY_WIN, 0);
  if (q < 0) return 0;
  const env = leanEnvelope(q); // 0..1..0, zero-velocity at ends
  // roll the wave across the 6 fronds: ~0.16 of the window between neighbours
  const rolled = clamp01(q - i * 0.06);
  const travel = leanEnvelope(rolled); // delayed per-frond envelope
  // sideways fronds get the most tip travel; top fronds least
  const sideBias = 0.45 + 0.55 * Math.abs(Math.sin(FRONDS[i].ang));
  // blend the shared lean with the per-frond rolled travel for a wave feel
  return (env * 0.35 + travel * 0.65) * SWAY_AMP * sideBias;
}

// A small crown bob that accompanies the breeze (rides the same window → 0 at
// the edges, seamless).
function breezeBob(t: number): number {
  const q = actionQ(t, SWAY_PERIOD, SWAY_WIN, 0);
  return bell(q) * 1.4;
}

// ── Sub-part painters (driven only by P + offsets) ────────────────────────────

/** Trace the slim curved trunk into the current path (as a closed ribbon). */
function trunkPath(ctx: CanvasRenderingContext2D, bob: number): void {
  const bx = TRUNK_BASE_X;
  const by = TRUNK_BASE_Y;
  const tx = TRUNK_TOP_X;
  const ty = TRUNK_TOP_Y + bob;
  const cx = TRUNK_CTRL_X;
  const cy = TRUNK_CTRL_Y + bob;
  const wB = TRUNK_HALF;       // wide at base
  const wT = TRUNK_HALF * 0.62; // narrower at crown
  ctx.beginPath();
  ctx.moveTo(bx - wB, by);
  ctx.quadraticCurveTo(cx - wB, cy, tx - wT, ty);
  ctx.lineTo(tx + wT, ty);
  ctx.quadraticCurveTo(cx + wB, cy, bx + wB, by);
  ctx.closePath();
}

/** Centre-line point of the trunk at parameter u in 0..1 (0=base,1=crown). */
function trunkPoint(u: number, bob: number): [number, number] {
  const bx = TRUNK_BASE_X;
  const by = TRUNK_BASE_Y;
  const tx = TRUNK_TOP_X;
  const ty = TRUNK_TOP_Y + bob;
  const cx = TRUNK_CTRL_X;
  const cy = TRUNK_CTRL_Y + bob;
  const mt = 1 - u;
  const x = mt * mt * bx + 2 * mt * u * cx + u * u * tx;
  const y = mt * mt * by + 2 * mt * u * cy + u * u * ty;
  return [x, y];
}

/** Draw a single arching frond as a leaflet-feathered blade. `sway` shifts the
 *  tip horizontally (idle breeze). `extraDroop` deepens the lower-frond arc. */
function drawFrond(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  ang: number,
  len: number,
  sway: number,
  extraDroop: number,
  p: P,
  tipMix: number,
): void {
  // Direction up-and-out, then gravity bows the tip downward.
  const dirX = Math.sin(ang);
  const dirY = -Math.cos(ang);
  // mid (rib apex) lifts up; tip falls under gravity + droop. The mid also
  // carries a fraction of the sway so the whole blade bends, not just the tip.
  const midX = ax + dirX * len * 0.55 + sway * 0.4;
  const midY = ay + dirY * len * 0.55 - 2;
  const droopFall = 5 + extraDroop * 9;
  const tipX = ax + dirX * len + sway;
  const tipY = ay + dirY * len + droopFall;

  // Frond tip colour (lower fronds brown toward frondTip in autumn).
  const tipCol = lerpRGB(p.frondMid, p.frondTip, clamp01(tipMix));

  // dark under-rib pass for depth
  ctx.strokeStyle = rgb(p.frondDark);
  ctx.lineWidth = 3.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(midX, midY, tipX, tipY);
  ctx.stroke();

  // mid-green rib
  ctx.strokeStyle = rgb(p.frondMid);
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(midX, midY, tipX, tipY);
  ctx.stroke();

  // feather leaflets along the rib, both sides; quadratic param sampling
  const N = 7;
  for (let i = 1; i <= N; i++) {
    const u = i / (N + 1);
    const mt = 1 - u;
    // point on the rib
    const rx = mt * mt * ax + 2 * mt * u * midX + u * u * tipX;
    const ry = mt * mt * ay + 2 * mt * u * midY + u * u * tipY;
    // rib tangent → perpendicular leaflet direction
    const tgX = 2 * mt * (midX - ax) + 2 * u * (tipX - midX);
    const tgY = 2 * mt * (midY - ay) + 2 * u * (tipY - midY);
    const tl = Math.hypot(tgX, tgY) || 1;
    const pxn = -tgY / tl;
    const pyn = tgX / tl;
    const leafLen = (1 - u) * 4.2 + 1.4; // longer near the base
    // leaflets near the tip take the (possibly browned) tip colour
    const lc = u > 0.55 ? lerpRGB(p.frondMid, tipCol, (u - 0.55) / 0.45) : p.frondMid;
    ctx.strokeStyle = rgb(lc);
    ctx.lineWidth = 1.1;
    [1, -1].forEach((side) => {
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + pxn * side * leafLen + dirX * 1.2, ry + pyn * side * leafLen + 2.2);
      ctx.stroke();
    });
  }

  // lit upper edge of the frond (light from upper-left)
  ctx.strokeStyle = rgba(p.frondLight, 0.7);
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(ax, ay - 0.4);
  ctx.quadraticCurveTo(midX - 0.6, midY - 1.2, tipX - sway * 0.3, tipY - 1.2);
  ctx.stroke();
  ctx.lineCap = "butt";
}

/** The whole crown of fronds, anchored at the trunk top. */
function drawCrown(
  ctx: CanvasRenderingContext2D,
  bob: number,
  swayOf: (i: number) => number,
  p: P,
): void {
  const [ax, ay] = [TRUNK_TOP_X, TRUNK_TOP_Y + bob];
  // draw lower/back fronds first, top fronds last so they overlap nicely
  const order = [0, 5, 1, 4, 2, 3];
  order.forEach((idx) => {
    const f = FRONDS[idx];
    const extraDroop = f.lower * p.droop;
    const tipMix = f.lower * p.tipBrown; // only LOWER fronds brown their tips
    drawFrond(ctx, ax, ay, f.ang, f.len, swayOf(idx), extraDroop, p, tipMix);
  });

  // crown heart — a small dark hub where the fronds meet
  ctx.fillStyle = rgb(p.frondDark);
  ctx.beginPath();
  ctx.ellipse(ax, ay - 1, 3.2, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // spring bud — a tiny unfurling new frond + pink flower poking up from centre
  if (p.budAmt > 0.02) {
    const a = p.budAmt;
    // a short pale-lime new frond curling up
    ctx.strokeStyle = rgba(lerpRGB(p.frondLight, [220, 250, 180], 0.5), 0.9 * a);
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(ax, ay - 1);
    ctx.quadraticCurveTo(ax - 1, ay - 7, ax + 1.5, ay - 10);
    ctx.stroke();
    ctx.lineCap = "butt";
    // a tiny pink flower at its tip
    ctx.fillStyle = rgba([248, 150, 196], 0.95 * a);
    for (let k = 0; k < 5; k++) {
      const fa = (k / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(ax + 1.5 + Math.cos(fa) * 1.4, ay - 10 + Math.sin(fa) * 1.1, 1.0, 0.7, fa, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = rgba([255, 224, 96], a);
    ctx.beginPath();
    ctx.arc(ax + 1.5, ay - 10, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The little coconut cluster nestled at the crown base; `amt` fades it (some
 *  drop in autumn). `wobble` nudges the nuts for the rare idle. */
function drawCoconuts(
  ctx: CanvasRenderingContext2D,
  bob: number,
  p: P,
  amt: number,
  wobble: number,
): void {
  if (amt <= 0.02) return;
  const [ax, ay] = [TRUNK_TOP_X, TRUNK_TOP_Y + bob];
  const nuts: Array<[number, number, number]> = [
    [ax - 3.2, ay + 3.4, 2.6],
    [ax + 0.4, ay + 4.6, 2.8],
    [ax - 1.6, ay + 5.6, 2.3],
  ];
  nuts.forEach(([nx, ny, r], idx) => {
    // wobble: each nut swings on a tiny pendulum about its hang point
    const wx = wobble * (idx === 1 ? 1.6 : idx === 0 ? -1.3 : 1.0);
    const wy = Math.abs(wobble) * 0.5;
    const cx = nx + wx;
    const cy = ny + wy;
    // outline
    ctx.fillStyle = rgba(p.outline, clamp01(amt));
    ctx.beginPath();
    ctx.arc(cx, cy, r + 0.7, 0, Math.PI * 2);
    ctx.fill();
    // body
    ctx.fillStyle = rgba(p.coconut, clamp01(amt));
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // lit cheek (upper-left)
    ctx.fillStyle = rgba(lerpRGB(p.coconut, [255, 240, 210], 0.45), 0.7 * clamp01(amt));
    ctx.beginPath();
    ctx.arc(cx - r * 0.35, cy - r * 0.35, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** A small icicle hanging off a low-left frond tip (winter). */
function drawIcicle(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, a: number): void {
  if (a <= 0.02) return;
  ctx.save();
  const g = ctx.createLinearGradient(x, y, x, y + len);
  g.addColorStop(0, `rgba(220,238,255,${0.95 * a})`);
  g.addColorStop(1, `rgba(255,255,255,${0.6 * a})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 1.1, y);
  ctx.lineTo(x + 1.1, y);
  ctx.lineTo(x, y + len);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ── The single parameterized paint ───────────────────────────────────────────

/** The whole tile from ONLY `p` and `bob` (still / transition path). The idle
 *  motion is layered on top by `paintWithIdle`, never here. */
function paint(ctx: CanvasRenderingContext2D, raw: P, bob: number): void {
  const p = clampP(raw);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Pad: low flat grass ellipse, x∈[−18,+18], centre y≈+19 ──────────────
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

    // pad snow blanket (winter)
    if (p.padSnowAmt > 0.01) {
      ctx.fillStyle = rgba([244, 250, 255], 0.92 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(0, 18.4, 17.4 * (0.6 + 0.4 * p.padSnowAmt), 4.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([210, 226, 244], 0.5 * p.padSnowAmt);
      ctx.beginPath();
      ctx.ellipse(2, 20, 16, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.padSnowAmt);
      [[-9, 17.6], [5, 19], [11, 17.4], [-3, 20]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // blossoms on the pad (spring)
    if (p.blossomAmt > 0.01) {
      const a = p.blossomAmt;
      const spots: Array<[number, number]> = [[-13, 18.5], [12, 17.8], [-4, 21]];
      spots.forEach(([bx, by], idx) => {
        ctx.fillStyle = rgba(idx === 1 ? [255, 232, 246] : [255, 250, 252], 0.95 * a);
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
      });
    }

    // fallen leaves on the pad (autumn)
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const leaves: Array<[number, number, number, RGB]> = [
        [-12, 19.6, -0.5, [196, 150, 60]],
        [12, 18.6, 0.7, [176, 120, 44]],
      ];
      leaves.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgba(col, a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.4, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba([90, 64, 24], a);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-3.2, 0);
        ctx.lineTo(3.2, 0);
        ctx.stroke();
        ctx.restore();
      });
    }

    // a whole fallen FROND lying across the pad (autumn) — a clear seasonal cue
    if (p.fallenFrondAmt > 0.01) {
      const a = p.fallenFrondAmt;
      ctx.save();
      ctx.translate(-6, 21.4);
      ctx.rotate(-0.28);
      // rib
      ctx.strokeStyle = rgba(lerpRGB(p.frondMid, p.frondTip, 0.7), a);
      ctx.lineWidth = 2.0;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-7, 0.5);
      ctx.quadraticCurveTo(0, -1.4, 8, 0.8);
      ctx.stroke();
      // a few leaflets fanning off the rib
      ctx.strokeStyle = rgba(lerpRGB(p.frondMid, p.frondTip, 0.85), 0.9 * a);
      ctx.lineWidth = 1.0;
      for (let i = -5; i <= 5; i += 1) {
        const u = (i + 5) / 10;
        const rx = lerp(-7, 8, u);
        const ry = lerp(0.5, 0.8, u) - Math.sin(u * Math.PI) * 1.2;
        [1, -1].forEach((side) => {
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx + i * 0.2, ry + side * 2.0 + 0.4);
          ctx.stroke();
        });
      }
      ctx.lineCap = "butt";
      ctx.restore();
    }

    // a fallen COCONUT resting on the pad (autumn)
    if (p.fallenNutAmt > 0.01) {
      const a = p.fallenNutAmt;
      const nx = 10;
      const ny = 20.2;
      ctx.fillStyle = rgba(p.outline, 0.45 * a);
      ctx.beginPath();
      ctx.ellipse(nx, ny + 2, 3.4, 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(p.coconut, a);
      ctx.beginPath();
      ctx.arc(nx, ny, 3.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(lerpRGB(p.coconut, [255, 240, 210], 0.4), 0.7 * a);
      ctx.beginPath();
      ctx.arc(nx - 1, ny - 1, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Soil contact patch + cast shadow under the trunk base ───────────────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, TRUNK_BASE_Y + 1.5, 7, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.26);
    ctx.beginPath();
    ctx.ellipse(3.5, TRUNK_BASE_Y + 2, 12, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Trunk (SAME slim curved silhouette every season) ────────────────────
    // 1) soft dark outline pass (fatter)
    ctx.save();
    ctx.lineWidth = 1.8;
    trunkPath(ctx, bob);
    ctx.fillStyle = rgb(p.outline);
    ctx.strokeStyle = rgb(p.outline);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 2) trunk body, clipped, lit on the upper-left
    ctx.save();
    trunkPath(ctx, bob);
    ctx.clip();
    // base mid/dark fill
    ctx.fillStyle = rgb(p.trunkDark);
    ctx.fillRect(-8, TRUNK_TOP_Y + bob - 4, 22, TRUNK_BASE_Y - TRUNK_TOP_Y + 12);
    // lit left ribbon
    const tg = ctx.createLinearGradient(-TRUNK_HALF, 0, TRUNK_HALF + 4, 0);
    tg.addColorStop(0, rgb(p.trunkLight));
    tg.addColorStop(0.6, rgb(p.trunkLight));
    tg.addColorStop(1, rgb(p.trunkDark));
    ctx.fillStyle = tg;
    ctx.globalAlpha = 0.92;
    trunkPath(ctx, bob);
    ctx.fill();
    ctx.globalAlpha = 1;
    // segmented bark rings across the trunk
    ctx.strokeStyle = rgba(p.trunkDark, 0.9);
    ctx.lineWidth = 1.3;
    for (let s = 1; s <= SEGMENTS; s++) {
      const u = s / (SEGMENTS + 1);
      const [px, py] = trunkPoint(u, bob);
      const w = lerp(TRUNK_HALF, TRUNK_HALF * 0.62, u) + 1.6;
      ctx.beginPath();
      ctx.moveTo(px - w, py + 1.2);
      ctx.quadraticCurveTo(px, py + 2.6, px + w, py + 0.6);
      ctx.stroke();
    }
    ctx.restore();

    // ── Crown of fronds (anchored at trunk top; SAME fan every season) ──────
    // Static rest pose: no sway. (Idle overlay redraws the crown with sway.)
    drawCrown(ctx, bob, () => 0, p);

    // ── Coconut cluster at the crown base ───────────────────────────────────
    drawCoconuts(ctx, bob, p, p.coconutAmt, 0);

    // ── Frond sheen / gloss (kept on the fronds, never a flash) ─────────────
    if (p.gloss > 0.02) {
      const [ax, ay] = [TRUNK_TOP_X, TRUNK_TOP_Y + bob];
      ctx.strokeStyle = rgba(p.frondLight, 0.28 + 0.4 * p.gloss);
      ctx.lineWidth = 1.0;
      [-0.34, 0.16].forEach((ang) => {
        const dirX = Math.sin(ang);
        const dirY = -Math.cos(ang);
        ctx.beginPath();
        ctx.moveTo(ax + dirX * 4, ay + dirY * 4 - 1);
        ctx.lineTo(ax + dirX * 14, ay + dirY * 14 - 3);
        ctx.stroke();
      });
    }

    // ── Frost dusting on the fronds (winter) — cool, fronds stay GREEN ───────
    if (p.frostAmt > 0.02) {
      const [ax, ay] = [TRUNK_TOP_X, TRUNK_TOP_Y + bob];
      ctx.fillStyle = rgba([225, 240, 255], 0.6 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [ax - 12, ay - 8], [ax - 6, ay - 12], [ax + 2, ay - 13],
        [ax + 10, ay - 9], [ax + 14, ay - 3], [ax - 15, ay - 2],
        [ax - 2, ay - 6], [ax + 6, ay - 5],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // ── Snow resting on the upward frond surfaces + tips (winter) ────────────
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      const [ax, ay] = [TRUNK_TOP_X, TRUNK_TOP_Y + bob];
      ctx.fillStyle = rgba([246, 251, 255], 0.92 * a);
      // snow caps riding the top fronds + crown heart …
      const caps: Array<[number, number, number, number]> = [
        [ax - 6, ay - 6, 3.6, 1.5],
        [ax + 4, ay - 7, 3.8, 1.6],
        [ax - 1, ay - 2, 3.2, 1.4],
      ];
      caps.forEach(([cx, cy, rx, ry]) => {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      // … and little white caps dabbed on the resting FROND TIPS
      FRONDS.forEach((f) => {
        const dirX = Math.sin(f.ang);
        const dirY = -Math.cos(f.ang);
        const droopFall = 5 + f.lower * p.droop * 9;
        const tx = ax + dirX * f.len;
        const ty = ay + dirY * f.len + droopFall;
        ctx.beginPath();
        ctx.ellipse(tx, ty - 1.2, 2.0, 1.1, f.ang * 0.4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // ── A small icicle hanging off a low-left frond tip (winter) ────────────
    if (p.icicleAmt > 0.02) {
      const [ax, ay] = [TRUNK_TOP_X, TRUNK_TOP_Y + bob];
      const f = FRONDS[0]; // far-left lower frond
      const dirX = Math.sin(f.ang);
      const dirY = -Math.cos(f.ang);
      const droopFall = 5 + f.lower * p.droop * 9;
      const tx = ax + dirX * f.len;
      const ty = ay + dirY * f.len + droopFall;
      drawIcicle(ctx, tx, ty, 5.5, p.icicleAmt);
    }

    // ── Ambient light wash over the whole tile (per-season tint) ────────────
    if (p.lightAmt > 0.001) {
      ctx.globalAlpha = 1;
      const lg = ctx.createRadialGradient(-10, -14, 2, -10, -14, 46);
      lg.addColorStop(0, rgba(p.light, p.lightAmt));
      lg.addColorStop(1, rgba(p.light, p.lightAmt * 0.25));
      ctx.fillStyle = lg;
      ctx.fillRect(-24, -24, 48, 48);
    }
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── Idle bob (seamless, zero-velocity at t=0) ────────────────────────────────

// A small ever-present settle bob, plus the breeze bob from the action window.
// A*(1-cos(w t))*0.5 → 0 at t=0 with zero velocity; very subtle baseline.
function baseBobAt(t: number, amp = 0.5, w = 1.1): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Two-tier WC3 idle composition ─────────────────────────────────────────────

/** A small bird (front-¾) used by the rare special. Colors locked. */
function drawBird(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hop: number,
  look: number,
  wing: number,
  alpha: number,
): void {
  if (alpha <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = clamp01(alpha);
  ctx.translate(x, y + hop);
  // body
  ctx.fillStyle = "#3f5a8a";
  ctx.beginPath();
  ctx.ellipse(0, 0, 3.8, 2.9, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // bright belly
  ctx.fillStyle = "#e9d36a";
  ctx.beginPath();
  ctx.ellipse(-1.2, 0.6, 2.1, 2.0, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // tail
  ctx.fillStyle = "#334870";
  ctx.beginPath();
  ctx.moveTo(3.0, -0.4);
  ctx.lineTo(6.6, -1.6);
  ctx.lineTo(6.0, 1.1);
  ctx.closePath();
  ctx.fill();
  // wing (opens during flit-off)
  ctx.save();
  ctx.translate(0.6, -0.4);
  ctx.rotate(-0.5 * wing);
  ctx.fillStyle = "#2b3a5c";
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.9 + wing * 2.0, 1.6 + wing * 1.2, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // head (looks around)
  ctx.save();
  ctx.translate(-3.0, -2.2);
  ctx.rotate(look);
  ctx.fillStyle = "#3f5a8a";
  ctx.beginPath();
  ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // beak
  ctx.fillStyle = "#e2902a";
  ctx.beginPath();
  ctx.moveTo(-2.0, 0.2);
  ctx.lineTo(-4.0, -0.2);
  ctx.lineTo(-2.0, 1.0);
  ctx.closePath();
  ctx.fill();
  // eye
  ctx.fillStyle = "#0e0a06";
  ctx.beginPath();
  ctx.arc(-0.5, -0.4, 0.75, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

/** The rare special: a bird flits in onto a top-left frond, perches a beat
 *  looking around, then opens its wing and flits up-and-off, gone by q=1. The
 *  anchor rides the breeze sway so it sits on the moving frond. */
function birdSpecial(ctx: CanvasRenderingContext2D, q: number, anchorX: number, anchorY: number): void {
  if (q < 0) return;
  let hop = 0;
  let look = 0;
  let wing = 0;
  let alpha: number;
  let dx = 0;
  let dy = 0;
  if (q < 0.25) {
    const f = q / 0.25;
    alpha = smoother(f);
    dy = -11 * (1 - smoother(f)); // drops down onto the frond from above
    hop = -2 * Math.sin(f * Math.PI);
  } else if (q < 0.7) {
    const f = (q - 0.25) / 0.45;
    alpha = 1;
    look = Math.sin(f * Math.PI * 2) * 0.5;
    hop = -2.0 * Math.abs(Math.sin(f * Math.PI * 2));
  } else {
    const f = (q - 0.7) / 0.3;
    alpha = 1 - smoother(f); // fades as it leaves → gone by q=1
    wing = Math.abs(Math.sin(f * Math.PI * 3)); // flapping
    dx = 11 * smoother(f); // flits up-and-right, ~13 px total
    dy = -13 * smoother(f);
    look = 0.3;
  }
  drawBird(ctx, anchorX + dx, anchorY + dy, hop, look, wing, alpha);
}

/** Draw the full tile with the two-tier idle applied at time `t`. */
function paintWithIdle(ctx: CanvasRenderingContext2D, season: SeasonName, t: number): void {
  const p = clampP(SP[season]);
  const bob = baseBobAt(t) + breezeBob(t);

  // 1) Base tile at this bob (crown drawn at rest by paint()).
  paint(ctx, SP[season], bob);

  // 2) COMMON breeze: redraw the crown (and hanging coconuts) with the
  //    traveling-wave sway on top. Same anchor → the crown overdraws itself, so
  //    at rest (sway≡0) this is a no-op overlay and the still is unchanged.
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const swayActive = actionQ(t, SWAY_PERIOD, SWAY_WIN, 0) >= 0;
    const rareQ = actionQ(t, SPECIAL_PERIOD, SPECIAL_WIN, SPECIAL_PERIOD / 2);
    // RARE coconut wobble: a damped swing enveloped to 0 at the window edges.
    const wobble = rareQ < 0 ? 0 : bell(rareQ) * Math.sin(rareQ * Math.PI * 6) * 1.6;

    if (swayActive || wobble !== 0) {
      drawCrown(ctx, bob, (i) => swayOfFrond(t, i), p);
      // hanging coconuts (with the rare wobble) over the swayed crown
      drawCoconuts(ctx, bob, p, p.coconutAmt, wobble);
    }

    // 3) RARE bird: perches on the top-left frond, then flits off. The anchor
    //    rides that frond's breeze sway so it stays planted.
    if (rareQ >= 0) {
      const [ax, ay] = [TRUNK_TOP_X, TRUNK_TOP_Y + bob];
      const f = FRONDS[2]; // top-left frond
      const dirX = Math.sin(f.ang);
      const dirY = -Math.cos(f.ang);
      const u = 0.7; // perch ~70% out along the frond
      const sway = swayOfFrond(t, 2);
      const anchorX = ax + dirX * f.len * u + sway * u;
      const anchorY = ay + dirY * f.len * u - 3;
      birdSpecial(ctx, rareQ, anchorX, anchorY);
    }
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => paintWithIdle(ctx, season, t);
}

// ── Forward season→season transitions ────────────────────────────────────────

function makeTransition(fromIdx: 0 | 1 | 2): (ctx: CanvasRenderingContext2D, p: number) => void {
  const from = SP[SEASON_NAMES[fromIdx]];
  const to = SP[SEASON_NAMES[fromIdx + 1]];
  return (ctx, pp) => {
    const k = smoother(clamp01(pp));
    paint(ctx, lerpP(from, to, k), 0);
  };
}

const springToSummer = makeTransition(0);
const summerToAutumn = makeTransition(1);
const autumnToWinter = makeTransition(2);

// ── Exports ──────────────────────────────────────────────────────────────────

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
