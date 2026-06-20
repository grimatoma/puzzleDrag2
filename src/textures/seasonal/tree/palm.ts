// Seasonal art for the PALM tree tile (`tile_tree_palm`).
//
// A curved slim palm: a gently-leaning brown segmented trunk topped by a crown
// fan of several long arching green fronds, with a small cluster of 2–3
// coconuts nestled at the crown base. Palms are EVERGREEN — the trunk + frond
// fan silhouette is IDENTICAL every season; only colour, a little frond droop,
// snow and the small dressing (blossom / fallen leaves / pad snow / frost)
// change. The fronds stay GREEN and the trunk stays BROWN all year (palette
// lock). This is enforced by a single parameterized `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
//
// Tree framing: trunk base sits at the pad centre, the crown fans into the
// upper portion and overhangs the pad width. Origin-centered in the −24..+24
// design box, light from upper-left, flat cel-shaded with a soft dark outline.
// Pure Canvas-2D vector drawing.

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
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad (autumn)
}

// ── Local math helpers ───────────────────────────────────────────────────────

function clamp01(x: number): number {
  if (!(x >= 0)) return 0; // also catches NaN
  if (x > 1) return 1;
  return x;
}

const smoother = (x: number): number => x * x * x * (x * (6 * x - 15) + 10);

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
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
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
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — fresh dewy lime-green fronds; bright lime dewy pad + blossom.
  Spring: {
    frondLight: [168, 224, 104],
    frondMid: [104, 182, 74],
    frondDark: [56, 122, 52],
    frondTip: [150, 210, 96],
    trunkLight: [156, 116, 72],
    trunkDark: [96, 66, 38],
    coconut: [118, 84, 48],
    padGrass: [128, 206, 86],
    padDark: [72, 138, 58],
    soil: [120, 84, 48],
    outline: [40, 60, 30],
    light: [232, 244, 226],
    lightAmt: 0.16,
    vigor: 0.6,
    gloss: 0.28,
    tipBrown: 0,
    droop: 0.08,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — lush vivid PEAK green fronds; saturated mid-green pad; warm light.
  Summer: {
    frondLight: [142, 214, 78],
    frondMid: [70, 162, 56],
    frondDark: [34, 104, 42],
    frondTip: [108, 190, 64],
    trunkLight: [164, 120, 72],
    trunkDark: [100, 66, 36],
    coconut: [110, 76, 42],
    padGrass: [86, 168, 70],
    padDark: [44, 110, 48],
    soil: [126, 86, 48],
    outline: [28, 58, 26],
    light: [255, 240, 206],
    lightAmt: 0.18,
    vigor: 1.0,
    gloss: 0.7,
    tipBrown: 0,
    droop: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — fronds still green but the LOWER tips brown (olive-tan); rust pad.
  Autumn: {
    frondLight: [134, 184, 80],
    frondMid: [86, 144, 58],
    frondDark: [52, 96, 40],
    frondTip: [176, 128, 56], // olive-tan the lower tips fade toward
    trunkLight: [150, 108, 64],
    trunkDark: [92, 60, 32],
    coconut: [104, 70, 38],
    padGrass: [150, 152, 86],
    padDark: [104, 96, 52],
    soil: [120, 80, 44],
    outline: [46, 50, 26],
    light: [248, 210, 150],
    lightAmt: 0.2,
    vigor: 0.7,
    gloss: 0.4,
    tipBrown: 0.85,
    droop: 0.55,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — fronds STILL GREEN under a light snow dusting + frost; snowy pad,
  // cool light. No white-out: the green stays clearly visible underneath.
  Winter: {
    frondLight: [122, 168, 96],
    frondMid: [74, 132, 70],
    frondDark: [44, 92, 58],
    frondTip: [108, 156, 96],
    trunkLight: [140, 112, 84],
    trunkDark: [88, 64, 46],
    coconut: [104, 80, 58],
    padGrass: [176, 196, 214],
    padDark: [120, 146, 172],
    soil: [128, 110, 96],
    outline: [44, 50, 46],
    light: [206, 226, 252],
    lightAmt: 0.3,
    vigor: 0.5,
    gloss: 0.22,
    tipBrown: 0.1,
    droop: 0.35,
    frostAmt: 0.7,
    snowCapAmt: 0.7,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
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
  // mid (rib apex) lifts up; tip falls under gravity + droop
  const midX = ax + dirX * len * 0.55;
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
}

/** The little 2–3 coconut cluster nestled at the crown base. */
function drawCoconuts(ctx: CanvasRenderingContext2D, bob: number, p: P): void {
  const [ax, ay] = [TRUNK_TOP_X, TRUNK_TOP_Y + bob];
  const nuts: Array<[number, number, number]> = [
    [ax - 3.2, ay + 3.4, 2.6],
    [ax + 0.4, ay + 4.6, 2.8],
    [ax - 1.6, ay + 5.6, 2.3],
  ];
  nuts.forEach(([nx, ny, r]) => {
    // outline
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.arc(nx, ny, r + 0.7, 0, Math.PI * 2);
    ctx.fill();
    // body
    ctx.fillStyle = rgb(p.coconut);
    ctx.beginPath();
    ctx.arc(nx, ny, r, 0, Math.PI * 2);
    ctx.fill();
    // lit cheek (upper-left)
    ctx.fillStyle = rgba(lerpRGB(p.coconut, [255, 240, 210], 0.45), 0.7);
    ctx.beginPath();
    ctx.arc(nx - r * 0.35, ny - r * 0.35, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ── The single parameterized paint ───────────────────────────────────────────

/** The whole tile from ONLY `p` and `bob`. */
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
    // Static rest pose: no sway.
    drawCrown(ctx, bob, () => 0, p);

    // ── Coconut cluster at the crown base ───────────────────────────────────
    drawCoconuts(ctx, bob, p);

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

    // ── Snow resting on the upward frond surfaces (winter) ──────────────────
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      const [ax, ay] = [TRUNK_TOP_X, TRUNK_TOP_Y + bob];
      ctx.fillStyle = rgba([246, 251, 255], 0.9 * a);
      // little snow caps riding the two top fronds + the crown heart
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

// A*(1-cos(w t))*0.5 → 0 at t=0 with zero velocity; period 2π/w.
function bobAt(t: number, amp = 0.8, w = 1.4): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

/** Crown breeze-sway paint: the crown fronds gently swing while the trunk bobs.
 *  Seamless (sin of t) and additive — silhouette identity preserved. */
function paintWithSway(
  ctx: CanvasRenderingContext2D,
  season: SeasonName,
  t: number,
  bob: number,
): void {
  // We replicate paint() but feed a per-frond sway into the crown. To keep the
  // single-paint guarantee for stills/transitions, the sway path lives only
  // here in anim. Draw the full tile, then redraw the crown + coconuts with
  // sway on top (same anchor → no doubling artefact, crown overdraws itself).
  paint(ctx, SP[season], bob);
  const p = clampP(SP[season]);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const swayOf = (i: number) => {
      // each frond swings on a shared breeze with a small phase offset
      return Math.sin(t * 1.3 + i * 0.7) * 1.6 + Math.sin(t * 0.8) * 0.8;
    };
    drawCrown(ctx, bob, swayOf, p);
    drawCoconuts(ctx, bob, p);
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    // base tile + swaying crown (the subject bob is 0 at t=0; sway is a gentle
    // breeze that is also ~0 at t=0 since sin(0)·… is small and additive).
    paintWithSway(ctx, season, t, bob);

    ctx.save();
    try {
      ctx.globalAlpha = 1;
      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint resting on a frond
        const g = 0.22 + 0.28 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        const gy = -10 + bob + Math.sin(t * 1.1) * 1.0;
        ctx.beginPath();
        ctx.arc(-2, gy, 1.0 + g * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // frond shimmer — a bright sheen travelling out along a top frond
        const prog = (t * 0.45) % 1;
        const ang = 0.16;
        const dirX = Math.sin(ang);
        const dirY = -Math.cos(ang);
        const r = 4 + prog * 14;
        const gx = TRUNK_TOP_X + dirX * r;
        const gy = TRUNK_TOP_Y + bob + dirY * r - 2;
        ctx.fillStyle = "rgba(232,255,200,0.7)";
        ctx.beginPath();
        ctx.ellipse(gx, gy, 1.6, 1.0, ang, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // browning frond-tip flutter — a small tan fleck quivering at a low tip
        const f = Math.sin(t * 3.0);
        const ang = 1.30;
        const dirX = Math.sin(ang);
        const dirY = -Math.cos(ang);
        const len = 21;
        const tx = TRUNK_TOP_X + dirX * len + f * 1.4;
        const ty = TRUNK_TOP_Y + bob + dirY * len + 11 + Math.abs(f) * 0.6;
        ctx.fillStyle = "rgba(184,132,60,0.85)";
        ctx.beginPath();
        ctx.ellipse(tx, ty, 1.6, 1.0, ang + f * 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Winter — drifting snowflakes + a faint cold sheen
        const seeds: Array<[number, number, number]> = [
          [-9, 0.0, 1.0], [6, 0.4, 0.9], [12, 0.7, 0.8], [-2, 0.25, 0.9],
        ];
        ctx.fillStyle = "#ffffff";
        seeds.forEach(([fx, phase, r]) => {
          const prog = ((t / 3.0 + phase) % 1 + 1) % 1;
          const fy = -22 + prog * 40;
          const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
          ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.arc(dx, fy, r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 0.1 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.8));
        ctx.fillStyle = "rgba(210,232,255,1)";
        ctx.beginPath();
        ctx.ellipse(TRUNK_TOP_X, TRUNK_TOP_Y + bob - 4, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    } finally {
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  };
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
