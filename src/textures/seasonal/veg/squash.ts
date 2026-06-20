// Seasonal art for the SQUASH vegetable tile (`tile_veg_squash`).
//
// One plump golden gourd (a butternut shape: a fat rounded base swelling up to a
// thicker neck) with soft vertical ribbing and a short woody stem on top,
// resting low-centre on a grassy pad. The SAME gourd silhouette is drawn every
// season — only colour and dressing (frost, snow cap, pad blossoms / fallen
// leaves / snow, light tint, sheen) change. Category framing: Fruit/Veg — the
// iconic harvested ITEM only, constant outline, ripeness = colour/shade only.
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
// Palette lock: the squash stays a golden/amber gourd in every season; ripeness
// shows only as colour/shade (green-tinged young → full golden → deep amber),
// never an identity change. Origin-centered in the −24..+24 design box, light
// from upper-left, flat cel-shaded with a soft dark outline. Pure Canvas-2D.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable params ─────────────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly. */
interface P {
  skinLight: RGB;   // lit face of the gourd skin
  skinMid: RGB;     // body tone
  skinDark: RGB;    // shadowed ribs / underside
  stem: RGB;        // short woody stem on top
  padGrass: RGB;    // top of the grass pad
  padDark: RGB;     // shaded pad underside
  soil: RGB;        // contact / base soil under the gourd
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  ripeness: number; // 0..1 (reserved colour cue; identity unchanged)
  gloss: number;    // 0..1 specular sheen strength across the ribs
  frostAmt: number; // 0..1 cool frost dusting on the skin
  snowCapAmt: number; // 0..1 snow on the upward shoulders/neck of the gourd
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
    stem: lerpRGB(a.stem, b.stem, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    ripeness: lerp(a.ripeness, b.ripeness, t),
    gloss: lerp(a.gloss, b.gloss, t),
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
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────
// Palette lock: skin tones stay golden/amber gourd in every season. Spring is a
// slightly green-tinged young squash (still clearly a golden gourd), Summer the
// full golden PEAK, Autumn the deepest/richest amber, Winter golden but cooled
// and dusted (still clearly visible under cap + frost).

const SP: Record<SeasonName, P> = {
  // Spring — fresh pastel; young green-tinged golden squash, matte; dewy lime pad + blossom.
  Spring: {
    skinLight: [232, 214, 132],
    skinMid: [206, 176, 84],
    skinDark: [150, 124, 56],
    stem: [126, 150, 74],
    padGrass: [128, 206, 86],
    padDark: [72, 138, 58],
    soil: [120, 84, 48],
    outline: [86, 66, 30],
    light: [232, 244, 226],
    lightAmt: 0.16,
    ripeness: 0.25,
    gloss: 0.14,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — PEAK full golden squash, smooth; saturated mid-green pad, warm light.
  Summer: {
    skinLight: [255, 214, 96],
    skinMid: [238, 174, 50],
    skinDark: [176, 116, 26],
    stem: [120, 132, 60],
    padGrass: [86, 168, 70],
    padDark: [44, 110, 48],
    soil: [126, 86, 48],
    outline: [104, 68, 22],
    light: [255, 240, 206],
    lightAmt: 0.18,
    ripeness: 0.7,
    gloss: 0.6,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — deep amber ripe squash, richest; olive-tan browning pad, fallen leaves.
  Autumn: {
    skinLight: [240, 174, 70],
    skinMid: [212, 132, 38],
    skinDark: [150, 84, 26],
    stem: [128, 110, 52],
    padGrass: [150, 152, 86],
    padDark: [104, 96, 52],
    soil: [120, 80, 44],
    outline: [96, 54, 20],
    light: [248, 210, 150],
    lightAmt: 0.2,
    ripeness: 1.0,
    gloss: 0.4,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — cool blue-grey light; snow-capped + frosted golden squash, snowy pad.
  Winter: {
    skinLight: [222, 184, 104],
    skinMid: [196, 150, 70],
    skinDark: [136, 100, 52],
    stem: [120, 116, 86],
    padGrass: [176, 196, 214],
    padDark: [120, 146, 172],
    soil: [128, 110, 96],
    outline: [70, 54, 44],
    light: [206, 226, 252],
    lightAmt: 0.3,
    ripeness: 0.85,
    gloss: 0.2,
    frostAmt: 0.7,
    snowCapAmt: 0.85,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── The single parameterized paint ───────────────────────────────────────────

// Butternut gourd geometry (the SAME silhouette every season). A fat rounded
// bulb resting low on the pad, swelling UP through a slimmer waist into a
// thicker neck, with a short woody stem on top. Origin-centered.
const BULB_CY = 11;     // centre of the fat rounded base, low on the pad
const BULB_RX = 12.5;   // half-width of the fat base
const BULB_RY = 8.5;    // half-height of the fat base
const WAIST_Y = 0;      // narrowest point between bulb and neck
const WAIST_HALF = 6;   // half-width at the waist
const NECK_TOP_Y = -16; // top of the neck where the stem sits
const NECK_HALF = 5.4;  // half-width of the thicker neck

// Rib x-offsets (as a fraction of the local half-width) for the soft vertical
// ribbing that runs the whole gourd.
const RIB_FRACS: number[] = [-0.62, -0.2, 0.2, 0.62];

/** Trace the butternut-gourd body path (fat base → waist → thicker neck). */
function gourdBodyPath(ctx: CanvasRenderingContext2D, bob: number): void {
  const bcy = BULB_CY + bob;
  const wy = WAIST_Y + bob;
  const nty = NECK_TOP_Y + bob;
  ctx.beginPath();
  // start at the neck top-left, just under the stem
  ctx.moveTo(-NECK_HALF, nty + 1);
  // round the neck crown
  ctx.quadraticCurveTo(-NECK_HALF, nty - 2.5, 0, nty - 3);
  ctx.quadraticCurveTo(NECK_HALF, nty - 2.5, NECK_HALF, nty + 1);
  // right neck down to the waist (slims in)
  ctx.quadraticCurveTo(NECK_HALF + 1.2, lerp(nty, wy, 0.5), WAIST_HALF, wy);
  // waist swelling out into the fat bulb on the right
  ctx.quadraticCurveTo(BULB_RX, bcy - BULB_RY * 0.7, BULB_RX, bcy);
  // round the fat base bottom-right → bottom
  ctx.quadraticCurveTo(BULB_RX, bcy + BULB_RY, 0, bcy + BULB_RY);
  // bottom → bottom-left → up the left bulb
  ctx.quadraticCurveTo(-BULB_RX, bcy + BULB_RY, -BULB_RX, bcy);
  ctx.quadraticCurveTo(-BULB_RX, bcy - BULB_RY * 0.7, -WAIST_HALF, wy);
  // left waist back up to the neck
  ctx.quadraticCurveTo(-NECK_HALF - 1.2, lerp(nty, wy, 0.5), -NECK_HALF, nty + 1);
  ctx.closePath();
}

/** Local half-width of the gourd at design-y `y` (in body-local coords, pre-bob).
 *  Used to place ribs / shading so they hug the silhouette. */
function halfWidthAt(y: number): number {
  if (y <= WAIST_Y) {
    // neck region: NECK_HALF (top) → WAIST_HALF (waist)
    const k = clamp01((y - NECK_TOP_Y) / (WAIST_Y - NECK_TOP_Y));
    return lerp(NECK_HALF, WAIST_HALF, k);
  }
  // bulb region: WAIST_HALF (waist) → BULB_RX (bulb centre) → 0 (bottom)
  const bottom = BULB_CY + BULB_RY;
  if (y <= BULB_CY) {
    const k = clamp01((y - WAIST_Y) / (BULB_CY - WAIST_Y));
    return lerp(WAIST_HALF, BULB_RX, k);
  }
  const k = clamp01((y - BULB_CY) / (bottom - BULB_CY));
  return lerp(BULB_RX, 0.5, k);
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
    // soft contact shadow lower-right, pad colour from P
    ctx.fillStyle = rgba(p.padDark, 0.4);
    ctx.beginPath();
    ctx.ellipse(3, 21.5, 16, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // shaded underside
    ctx.fillStyle = rgb(p.padDark);
    ctx.beginPath();
    ctx.ellipse(0, 20.4, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // grass top
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
      // sparkle on the snow
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

    // ── Soil contact patch directly under the gourd base ────────────────────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, BULB_CY + BULB_RY + bob + 0.5, 9, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // contact shadow of the gourd on the pad
    ctx.fillStyle = rgba(p.outline, 0.28);
    ctx.beginPath();
    ctx.ellipse(2.5, BULB_CY + BULB_RY + bob + 1, 12, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the squash gourd (SAME silhouette every season) ────────────
    // 1) soft dark outline pass (drawn slightly fatter, dark first then light)
    ctx.save();
    ctx.translate(0, 0);
    gourdBodyPath(ctx, bob);
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = rgb(p.outline);
    ctx.stroke();
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();
    ctx.restore();

    // 2) body fill, clipped so the outline shows as a rim
    ctx.save();
    gourdBodyPath(ctx, bob);
    ctx.clip();

    const bcy = BULB_CY + bob;
    const nty = NECK_TOP_Y + bob;

    // base mid tone fill
    ctx.fillStyle = rgb(p.skinMid);
    ctx.fillRect(-BULB_RX - 3, nty - 6, (BULB_RX + 3) * 2, (bcy + BULB_RY) - nty + 12);

    // light from upper-left: a lit ovoid over the upper-left of the body
    const litGrad = ctx.createLinearGradient(-BULB_RX, nty, BULB_RX, bcy + BULB_RY);
    litGrad.addColorStop(0, rgb(p.skinLight));
    litGrad.addColorStop(0.5, rgb(p.skinMid));
    litGrad.addColorStop(1, rgb(p.skinDark));
    ctx.fillStyle = litGrad;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.ellipse(-2.5, lerp(nty, bcy, 0.55), BULB_RX + 2, (bcy + BULB_RY - nty) * 0.6, -0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // soft vertical ribbing — dark grooves following the silhouette, sampled
    // down the body so they hug the bulge. SAME shape every season.
    const yTop = nty - 1;
    const yBot = bcy + BULB_RY - 1;
    RIB_FRACS.forEach((frac) => {
      ctx.strokeStyle = rgba(p.skinDark, 0.62);
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      let first = true;
      for (let y = yTop; y <= yBot; y += 1.6) {
        const hw = halfWidthAt(y - bob);
        const x = frac * hw;
        if (first) { ctx.moveTo(x, y); first = false; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // bright rib catch-light just left of each dark groove
      ctx.strokeStyle = rgba(p.skinLight, 0.4);
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      first = true;
      for (let y = yTop; y <= yBot; y += 1.6) {
        const hw = halfWidthAt(y - bob);
        const x = frac * hw - 1.3;
        if (first) { ctx.moveTo(x, y); first = false; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });

    // rounding shadow along the lower-right of the bulb
    ctx.fillStyle = rgba(p.skinDark, 0.5);
    ctx.beginPath();
    ctx.ellipse(5, bcy + 2.5, BULB_RX * 0.7, BULB_RY * 0.9, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // smooth sheen across the ribs (gloss strength from P)
    if (p.gloss > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.12 + 0.5 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(-4.5, lerp(nty, bcy, 0.4), 2.2, (bcy - nty) * 0.5, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([255, 255, 255], 0.08 + 0.32 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(-6, bcy + 1, 1.8, 3.4, -0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // frost dusting (winter) — cool blue speckle on the upward skin
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.26 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(-1, lerp(nty, bcy, 0.35), BULB_RX, (bcy - nty) * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-7, nty + 4], [-2, nty + 2], [3, nty + 5], [7, nty + 8],
        [-6, lerp(nty, bcy, 0.5)], [5, lerp(nty, bcy, 0.55)], [0, lerp(nty, bcy, 0.35)],
        [-9, bcy], [8, bcy - 1],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end clip

    // 3) snow cap on the neck shoulders (winter) — drawn over, hugging the crown
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(-NECK_HALF - 0.5, nty + 1.5);
      ctx.quadraticCurveTo(-3, nty - 4, 0, nty - 3.5);
      ctx.quadraticCurveTo(3, nty - 4, NECK_HALF + 0.5, nty + 1.5);
      ctx.quadraticCurveTo(2.5, nty + 4, 0, nty + 2.8);
      ctx.quadraticCurveTo(-2.5, nty + 4, -NECK_HALF - 0.5, nty + 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(0, nty + 2, NECK_HALF * 0.7, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // a little snow on the upward shoulder of the bulb
      ctx.fillStyle = rgba([240, 248, 255], 0.7 * a);
      ctx.beginPath();
      ctx.ellipse(-6, bcy - BULB_RY + 1, 3.6, 1.6, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Short woody stem on top (SAME placement every season) ───────────────
    const stemBaseY = nty - 2;
    // stem outline (fat dark) then the woody core
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    ctx.moveTo(0.2, stemBaseY + 1.5);
    ctx.quadraticCurveTo(-0.4, stemBaseY - 3, 1.2, stemBaseY - 6.5);
    ctx.stroke();
    ctx.strokeStyle = rgb(p.stem);
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(0.2, stemBaseY + 1.5);
    ctx.quadraticCurveTo(-0.4, stemBaseY - 3, 1.2, stemBaseY - 6.5);
    ctx.stroke();
    // stem highlight
    ctx.strokeStyle = rgba(p.skinLight, 0.45);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-0.7, stemBaseY - 0.5);
    ctx.quadraticCurveTo(-1.1, stemBaseY - 3.5, 0.4, stemBaseY - 6);
    ctx.stroke();

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

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    // Per-season additive micro-motion. The subject bob itself is 0 at t=0;
    // micro-motion is additive dressing (sheen / dew / snow / leaf glint).
    paint(ctx, SP[season], bob);

    ctx.save();
    try {
      ctx.globalAlpha = 1;
      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint that travels gently on the skin
        const g = 0.24 + 0.28 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        const gy = -2 + bob + Math.sin(t * 1.1) * 1.4;
        ctx.beginPath();
        ctx.arc(-5, gy, 1.0 + g * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // soft sheen travels DOWN across the ribs (seamless via fract)
        const prog = (t * 0.45) % 1;
        const gy = lerp(NECK_TOP_Y + 1 + bob, BULB_CY + BULB_RY - 2 + bob, prog);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.beginPath();
        ctx.ellipse(-4.5, gy, 1.6, 3.0, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.ellipse(0.5, gy * 0.96, 1.0, 2.0, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // faint slow warm sheen pulsing on the shoulder
        const s = 0.1 + 0.14 * (0.5 + 0.5 * Math.sin(t * 0.9));
        ctx.fillStyle = `rgba(255,228,180,${s})`;
        ctx.beginPath();
        ctx.ellipse(-4, 2 + bob, 5.0, 3.6, -0.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Winter — drifting snowflakes + cold sheen
        const seeds: Array<[number, number, number]> = [
          [-9, 0.0, 1.0], [6, 0.4, 0.9], [11, 0.7, 0.8], [-2, 0.25, 0.9],
        ];
        ctx.fillStyle = "#ffffff";
        seeds.forEach(([fx, phase, r]) => {
          const prog = ((t / 3.0 + phase) % 1 + 1) % 1;
          const fy = -22 + prog * 38;
          const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
          ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.arc(dx, fy, r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 0.1 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.8));
        ctx.fillStyle = "rgba(210,232,255,1)";
        ctx.beginPath();
        ctx.ellipse(-3, 4 + bob, 7, 5, -0.2, 0, Math.PI * 2);
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
