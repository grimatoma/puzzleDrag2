// Seasonal art for the CUCUMBER vegetable tile (`tile_veg_cucumber`).
// Source: src/textures/seasonal/veg/cucumber.ts
//
// Category framing: Fruit / Veg — the iconic harvested ITEM only (never a vine
// or bush). ONE ripe cucumber: an elongated, slightly-curved green cylinder
// with rounded ends, a bumpy / ribbed dark-green skin (small pale speckles),
// resting at a gentle diagonal on a grassy pad, with a tiny yellow cucumber
// flower + a small leaf at the stem end. The SAME silhouette is drawn every
// season — only colour and the small dressing (frost, snow cap, pad
// blossom / fallen leaves / snow, light tint, gloss, speckles) change. Ripeness
// reads as colour/shade only; the cucumber stays green and bumpy all year
// (palette lock).
//
// Enforced by a single parameterized `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
//
// Origin-centered in the −24..+24 design box, light from upper-left, flat
// cel-shaded with a soft dark outline. Pure Canvas-2D vector drawing.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable params ─────────────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly. */
interface P {
  skinLight: RGB;   // lit upper face of the cucumber skin
  skinMid: RGB;     // body tone
  skinDark: RGB;    // shadowed underside / ribs
  speckle: RGB;     // pale speckles dotting the skin
  flower: RGB;      // the little yellow cucumber blossom at the stem end
  leaf: RGB;        // the small leaf at the stem end
  padGrass: RGB;    // top of the grass pad
  padDark: RGB;     // shaded pad underside
  soil: RGB;        // contact / base soil under the cucumber
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  ripeness: number; // 0..1 (reserved colour cue; structure unchanged)
  gloss: number;    // 0..1 specular sheen along the skin
  speckleAmt: number; // 0..1 visibility of pale skin speckles
  frostAmt: number; // 0..1 cool frost dusting on the skin
  snowCapAmt: number; // 0..1 snow ridge along the cucumber's upper side
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
    skinLight: lerpRGB(a.skinLight, b.skinLight, t),
    skinMid: lerpRGB(a.skinMid, b.skinMid, t),
    skinDark: lerpRGB(a.skinDark, b.skinDark, t),
    speckle: lerpRGB(a.speckle, b.speckle, t),
    flower: lerpRGB(a.flower, b.flower, t),
    leaf: lerpRGB(a.leaf, b.leaf, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    ripeness: lerp(a.ripeness, b.ripeness, t),
    gloss: lerp(a.gloss, b.gloss, t),
    speckleAmt: lerp(a.speckleAmt, b.speckleAmt, t),
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
    ripeness: clamp01(p.ripeness),
    gloss: clamp01(p.gloss),
    speckleAmt: clamp01(p.speckleAmt),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — small young PALE-green cucumber, dewy lime pad + tiny blossom.
  Spring: {
    skinLight: [186, 222, 120],
    skinMid: [126, 186, 78],
    skinDark: [76, 138, 58],
    speckle: [214, 240, 168],
    flower: [255, 224, 96],
    leaf: [120, 188, 84],
    padGrass: [128, 206, 86],
    padDark: [72, 138, 58],
    soil: [120, 84, 48],
    outline: [40, 70, 34],
    light: [232, 244, 226],
    lightAmt: 0.16,
    ripeness: 0.2,
    gloss: 0.3,
    speckleAmt: 0.45,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — full firm MID-green cucumber, crisp pale speckles (PEAK). Warm
  // light, strong sheen, saturated mid-green pad.
  Summer: {
    skinLight: [150, 210, 96],
    skinMid: [78, 162, 60],
    skinDark: [40, 108, 46],
    speckle: [206, 238, 156],
    flower: [255, 214, 70],
    leaf: [86, 164, 66],
    padGrass: [86, 168, 70],
    padDark: [44, 110, 48],
    soil: [126, 86, 48],
    outline: [26, 70, 34],
    light: [255, 240, 206],
    lightAmt: 0.18,
    ripeness: 0.75,
    gloss: 0.9,
    speckleAmt: 1.0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — dulling DEEPER green, a touch waxy / overripe; olive-tan pad,
  // fallen leaves. Low amber light. Still clearly green.
  Autumn: {
    skinLight: [120, 158, 74],
    skinMid: [70, 116, 52],
    skinDark: [42, 78, 38],
    speckle: [168, 188, 128],
    flower: [220, 188, 84],
    leaf: [132, 138, 64],
    padGrass: [150, 152, 86],
    padDark: [104, 96, 52],
    soil: [120, 80, 44],
    outline: [34, 56, 30],
    light: [248, 210, 150],
    lightAmt: 0.2,
    ripeness: 1.0,
    gloss: 0.5,
    speckleAmt: 0.6,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — frost-dusted green cucumber + a small snow cap, still clearly
  // GREEN underneath; snowy pad, cool blue-grey light.
  Winter: {
    skinLight: [120, 168, 110],
    skinMid: [70, 126, 78],
    skinDark: [44, 88, 58],
    speckle: [206, 230, 224],
    flower: [228, 206, 120],
    leaf: [104, 142, 96],
    padGrass: [176, 196, 214],
    padDark: [120, 146, 172],
    soil: [128, 110, 96],
    outline: [40, 56, 56],
    light: [206, 226, 252],
    lightAmt: 0.3,
    ripeness: 0.85,
    gloss: 0.3,
    speckleAmt: 0.35,
    frostAmt: 0.7,
    snowCapAmt: 0.85,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── The single parameterized paint ───────────────────────────────────────────

// Cucumber geometry — an elongated cylinder lying on a gentle diagonal, the
// SAME silhouette every season. It runs from the lower-left (blossom/stem end,
// up by the pad) to the upper-right, slightly curved. Origin-centered.
//
// We define the body along a central spine of points (in design px) and a
// half-thickness; both ends are rounded. Drawing is done by stroking a fat
// rounded capsule for the outline, then a thinner one for the body fill.

const CUKE_HALF = 6.4; // half-thickness of the cucumber barrel

// Spine endpoints + a slight curve control. The cucumber lies diagonally with
// a gentle banana-curve. Lower-left end (A) carries the stem/flower; the
// upper-right end (B) is the blossom-scar tip.
const CUKE_AX = -13.5; // stem-end x (lower-left)
const CUKE_AY = 9.5;   // stem-end y (resting near the pad)
const CUKE_BX = 14.5;  // far-tip x (upper-right)
const CUKE_BY = -7.5;  // far-tip y (raised)
const CUKE_CX = 1.5;   // curve control x (bows the belly downward)
const CUKE_CY = 5.5;   // curve control y

/** Sample the curved spine at parameter s∈[0,1] (quadratic Bézier A→C→B). */
function spineAt(s: number): [number, number] {
  const u = 1 - s;
  const x = u * u * CUKE_AX + 2 * u * s * CUKE_CX + s * s * CUKE_BX;
  const y = u * u * CUKE_AY + 2 * u * s * CUKE_CY + s * s * CUKE_BY;
  return [x, y];
}

/** Trace the rounded-capsule cucumber body into the current ctx path, with a
 *  vertical bob offset applied. Same outline for every season. */
function cucumberBodyPath(ctx: CanvasRenderingContext2D, bob: number, half: number): void {
  // Walk one side of the spine offset by +half (normal), round the far tip,
  // walk back offset by −half, round the near (stem) end.
  const N = 14;
  const top: Array<[number, number]> = [];
  const bottomPts: Array<[number, number]> = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const [px, py] = spineAt(s);
    // tangent via finite difference
    const [nx, ny] = spineAt(Math.min(1, s + 0.001));
    const [mx, my] = spineAt(Math.max(0, s - 0.001));
    let tx = nx - mx;
    let ty = ny - my;
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    // normal (perpendicular)
    const onx = -ty;
    const ony = tx;
    // taper a touch toward each end so the ends round in
    const taper = 0.55 + 0.45 * Math.sin(Math.PI * s);
    const h = half * taper;
    top.push([px + onx * h, py + ony * h + bob]);
    bottomPts.push([px - onx * h, py - ony * h + bob]);
  }
  ctx.beginPath();
  ctx.moveTo(top[0][0], top[0][1]);
  for (let i = 1; i < top.length; i++) ctx.lineTo(top[i][0], top[i][1]);
  for (let i = bottomPts.length - 1; i >= 0; i--) ctx.lineTo(bottomPts[i][0], bottomPts[i][1]);
  ctx.closePath();
}

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
        [-12, 19.6, -0.5, [196, 120, 40]],
        [12, 18.6, 0.7, [176, 72, 32]],
      ];
      leaves.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgba(col, a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.2, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba([90, 44, 16], a);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.lineTo(3, 0);
        ctx.stroke();
        ctx.restore();
      });
    }

    // ── Soil contact patch + contact shadow under the resting cucumber ──────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, 15 + bob, 13, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.28);
    ctx.beginPath();
    ctx.ellipse(2.5, 15.6 + bob, 14, 2.4, -0.18, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the cucumber (SAME silhouette every season) ────────────────
    // 1) soft dark outline pass (drawn a touch fatter)
    cucumberBodyPath(ctx, bob, CUKE_HALF + 0.9);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // 2) body fill, clipped so the outline reads as a rim
    ctx.save();
    cucumberBodyPath(ctx, bob, CUKE_HALF);
    ctx.clip();

    // base mid tone
    ctx.fillStyle = rgb(p.skinMid);
    ctx.fillRect(-24, -24, 48, 48);

    // light from upper-left: a lit band running along the upper side of the
    // barrel, dark underside — gives the cylinder its round volume.
    const [lax, lay] = spineAt(0.1);
    const [lbx, lby] = spineAt(0.9);
    const litGrad = ctx.createLinearGradient(lax, lay - CUKE_HALF, lbx, lby + CUKE_HALF);
    litGrad.addColorStop(0, rgb(p.skinLight));
    litGrad.addColorStop(0.5, rgb(p.skinMid));
    litGrad.addColorStop(1, rgb(p.skinDark));
    ctx.fillStyle = litGrad;
    ctx.globalAlpha = 0.92;
    ctx.fillRect(-24, -24, 48, 48);
    ctx.globalAlpha = 1;

    // ridged ribs — a few long grooves running the length of the cucumber,
    // dark on the underside to read as a bumpy / ribbed surface.
    ctx.strokeStyle = rgba(p.skinDark, 0.7);
    ctx.lineWidth = 1.2;
    [-0.55, 0.0, 0.5].forEach((off) => {
      ctx.beginPath();
      for (let i = 0; i <= 14; i++) {
        const s = i / 14;
        const [px, py] = spineAt(s);
        const [nx, ny] = spineAt(Math.min(1, s + 0.001));
        const [mx, my] = spineAt(Math.max(0, s - 0.001));
        let tx = nx - mx, ty = ny - my;
        const len = Math.hypot(tx, ty) || 1;
        const onx = -ty / len, ony = tx / len;
        const taper = 0.55 + 0.45 * Math.sin(Math.PI * s);
        const h = CUKE_HALF * taper * off;
        const x = px + onx * h, y = py + ony * h + bob;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });

    // bumpy speckles — small pale dots scattered along the lit upper face
    if (p.speckleAmt > 0.02) {
      ctx.fillStyle = rgba(p.speckle, 0.85 * p.speckleAmt);
      const bumps: Array<[number, number, number]> = [
        [0.18, -0.45, 0.9], [0.32, 0.1, 0.7], [0.48, -0.25, 0.85],
        [0.62, 0.2, 0.7], [0.74, -0.4, 0.8], [0.88, -0.05, 0.6],
        [0.26, -0.15, 0.6], [0.56, -0.5, 0.7], [0.4, 0.35, 0.6],
      ];
      bumps.forEach(([s, off, r]) => {
        const [px, py] = spineAt(s);
        const [nx, ny] = spineAt(Math.min(1, s + 0.001));
        const [mx, my] = spineAt(Math.max(0, s - 0.001));
        let tx = nx - mx, ty = ny - my;
        const len = Math.hypot(tx, ty) || 1;
        const onx = -ty / len, ony = tx / len;
        const taper = 0.55 + 0.45 * Math.sin(Math.PI * s);
        const h = CUKE_HALF * taper * off;
        ctx.beginPath();
        ctx.arc(px + onx * h, py + ony * h + bob, r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // specular sheen — a soft bright streak along the upper-lit side
    if (p.gloss > 0.02) {
      ctx.strokeStyle = rgba([255, 255, 255], 0.18 + 0.5 * p.gloss);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 2; i <= 12; i++) {
        const s = i / 14;
        const [px, py] = spineAt(s);
        const [nx, ny] = spineAt(Math.min(1, s + 0.001));
        const [mx, my] = spineAt(Math.max(0, s - 0.001));
        let tx = nx - mx, ty = ny - my;
        const len = Math.hypot(tx, ty) || 1;
        const onx = -ty / len, ony = tx / len;
        const taper = 0.55 + 0.45 * Math.sin(Math.PI * s);
        const h = CUKE_HALF * taper * -0.55;
        const x = px + onx * h, y = py + ony * h + bob;
        if (i === 2) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // frost dusting (winter) — cool blue speckle on the upward skin
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.22 * p.frostAmt);
      ctx.fillRect(-24, -24, 48, 28);
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [0.2, -0.4], [0.36, -0.1], [0.5, -0.35], [0.66, 0.0], [0.8, -0.3], [0.9, -0.5],
      ];
      speck.forEach(([s, off]) => {
        const [px, py] = spineAt(s);
        const [nx, ny] = spineAt(Math.min(1, s + 0.001));
        const [mx, my] = spineAt(Math.max(0, s - 0.001));
        let tx = nx - mx, ty = ny - my;
        const len = Math.hypot(tx, ty) || 1;
        const onx = -ty / len, ony = tx / len;
        const h = CUKE_HALF * off;
        ctx.beginPath();
        ctx.arc(px + onx * h, py + ony * h + bob, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end clip

    // 3) snow cap ridge along the cucumber's upper side (winter), over the body
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.92 * a);
      ctx.beginPath();
      for (let i = 2; i <= 12; i++) {
        const s = i / 14;
        const [px, py] = spineAt(s);
        const [nx, ny] = spineAt(Math.min(1, s + 0.001));
        const [mx, my] = spineAt(Math.max(0, s - 0.001));
        let tx = nx - mx, ty = ny - my;
        const len = Math.hypot(tx, ty) || 1;
        const onx = -ty / len, ony = tx / len;
        const taper = 0.55 + 0.45 * Math.sin(Math.PI * s);
        const h = CUKE_HALF * taper * -0.82;
        const x = px + onx * h, y = py + ony * h + bob;
        if (i === 2) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      // back along a slightly lower line to give the ridge thickness
      for (let i = 12; i >= 2; i--) {
        const s = i / 14;
        const [px, py] = spineAt(s);
        const [nx, ny] = spineAt(Math.min(1, s + 0.001));
        const [mx, my] = spineAt(Math.max(0, s - 0.001));
        let tx = nx - mx, ty = ny - my;
        const len = Math.hypot(tx, ty) || 1;
        const onx = -ty / len, ony = tx / len;
        const taper = 0.55 + 0.45 * Math.sin(Math.PI * s);
        const h = CUKE_HALF * taper * -0.38;
        ctx.lineTo(px + onx * h, py + ony * h + bob);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([205, 222, 242], 0.4 * a);
      const [mx2, my2] = spineAt(0.5);
      ctx.beginPath();
      ctx.ellipse(mx2, my2 - CUKE_HALF * 0.6 + bob, 7, 1.4, -0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Stem end: tiny yellow cucumber flower + small leaf (SAME placement) ──
    // The stem end is the near (lower-left) tip A.
    const [sx0, sy0] = spineAt(0.0);
    const stemTipX = sx0 - 3.2;
    const stemTipY = sy0 - 2.6 + bob;

    // short green stem joining the cucumber to the blossom
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(sx0, sy0 + bob);
    ctx.quadraticCurveTo(sx0 - 2.4, sy0 - 1.6 + bob, stemTipX, stemTipY);
    ctx.stroke();
    ctx.strokeStyle = rgb(p.leaf);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(sx0, sy0 + bob);
    ctx.quadraticCurveTo(sx0 - 2.4, sy0 - 1.6 + bob, stemTipX, stemTipY);
    ctx.stroke();

    // small leaf beside the stem
    ctx.save();
    ctx.translate(stemTipX - 1.5, stemTipY + 2.6);
    ctx.rotate(-0.7);
    ctx.fillStyle = rgb(p.leaf);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.4, 1.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(p.outline, 0.7);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-3.2, 0);
    ctx.lineTo(3.2, 0);
    ctx.stroke();
    ctx.restore();

    // the little yellow cucumber blossom at the very stem tip — five petals
    ctx.save();
    ctx.translate(stemTipX, stemTipY);
    // petals
    ctx.fillStyle = rgb(p.flower);
    for (let k = 0; k < 5; k++) {
      const ang = (k / 5) * Math.PI * 2 - 0.3;
      ctx.beginPath();
      ctx.ellipse(Math.cos(ang) * 2.0, Math.sin(ang) * 2.0, 1.5, 1.0, ang, 0, Math.PI * 2);
      ctx.fill();
    }
    // petal outline + warm centre
    ctx.strokeStyle = rgba(p.outline, 0.45);
    ctx.lineWidth = 0.6;
    for (let k = 0; k < 5; k++) {
      const ang = (k / 5) * Math.PI * 2 - 0.3;
      ctx.beginPath();
      ctx.ellipse(Math.cos(ang) * 2.0, Math.sin(ang) * 2.0, 1.5, 1.0, ang, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = rgba([246, 176, 56], 0.95);
    ctx.beginPath();
    ctx.arc(0, 0, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

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
function bobAt(t: number, amp = 0.8, w = 1.5): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

/** The flower's resting screen position (matches paint's placement) at bob=0,
 *  so the season micro-motion can make it nod. */
function flowerAnchor(bob: number): [number, number] {
  const [sx0, sy0] = spineAt(0.0);
  return [sx0 - 3.2, sy0 - 2.6 + bob];
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    // Per-season additive micro-motion drawn OVER the static paint. The subject
    // bob itself is 0 at t=0; micro-motion is additive sheen / dressing.
    paint(ctx, SP[season], bob);

    ctx.save();
    try {
      ctx.globalAlpha = 1;

      // The little flower nods gently every season (a soft additive petal hint
      // riding on a tiny rotation about its anchor).
      const [fx, fy] = flowerAnchor(bob);
      const nod = Math.sin(t * 1.6) * 0.18;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(nod);
      ctx.fillStyle = rgba(SP[season].flower, 0.5);
      ctx.beginPath();
      ctx.ellipse(0, -2.2, 1.3, 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint that drifts along the skin
        const g = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.2));
        const [gx, gy] = spineAt(0.45 + 0.1 * Math.sin(t * 1.1));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        ctx.beginPath();
        ctx.arc(gx, gy - 3 + bob, 1.1 + g * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // a bright glint runs ALONG the skin (seamless via fract)
        const prog = (t * 0.45) % 1;
        const [gx, gy] = spineAt(0.1 + prog * 0.8);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.ellipse(gx, gy - CUKE_HALF * 0.5 + bob, 2.0, 1.1, -0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.ellipse(gx, gy - CUKE_HALF * 0.2 + bob, 1.2, 0.7, -0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // faint slow sheen pulsing along the upper side
        const s = 0.1 + 0.14 * (0.5 + 0.5 * Math.sin(t * 0.9));
        const [gx, gy] = spineAt(0.5);
        ctx.fillStyle = `rgba(255,236,200,${s})`;
        ctx.beginPath();
        ctx.ellipse(gx, gy - 2 + bob, 6, 2.6, -0.7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Winter — drifting snowflakes + cold sheen
        const seeds: Array<[number, number, number]> = [
          [-9, 0.0, 1.0], [6, 0.4, 0.9], [12, 0.7, 0.8], [-2, 0.25, 0.9],
        ];
        ctx.fillStyle = "#ffffff";
        seeds.forEach(([fxs, phase, r]) => {
          const prog = ((t / 3.0 + phase) % 1 + 1) % 1;
          const fys = -22 + prog * 40;
          const dx = fxs + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
          ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.arc(dx, fys, r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 0.1 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.8));
        const [gx, gy] = spineAt(0.5);
        ctx.fillStyle = "rgba(210,232,255,1)";
        ctx.beginPath();
        ctx.ellipse(gx, gy - 1 + bob, 7, 3.2, -0.7, 0, Math.PI * 2);
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
