// BOLD seasonal art for the GOLDEN APPLE fruit tile (`tile_fruit_golden_apple`).
//
// One glowing GOLDEN apple — classic apple silhouette with a short stem and a
// small leaf — resting low-centre on a grassy pad. The SAME apple silhouette is
// drawn every season; only colour, light, gloss and the seasonal dressing
// (blossom / fallen leaf / snow cap + frost / base snow) change. This is the
// APPROVED "bold & fun" direction: the seasons swing HARD on light + a real
// seasonal prop, and the idle is a two-tier WC3-style occasional action rather
// than a constant nudge:
//
//   IDLE COMMON  (~6s, win ~0.9s): a side-to-side WOBBLE — the apple rocks/leans
//       ~10–12 design-px at the top with a little squash at the base.
//       Anticipation → peak → settle, zero velocity at the window edges.
//   IDLE SPECIAL (~18s, win ~1.2s): a small SPARKLE BURST — instead of a plain
//       bounce, the magical golden apple flares bright and radiates a few gold
//       sparkle rays/stars for ~1s (a tiny lift rides under it), then settles.
//       The rays may paint OUTSIDE the −24..+24 box (no engine clip).
//
// Architecture mirrors pepper.bold.ts: a single parameterized `paint(ctx,p,pose)`
// where `interface P` holds tweenable season params (colours + prop amounts) and
// `pose` holds the idle gesture (bob / lean / squash + the sparkle burst).
// Because every season is the same paint with tweened P, transitions are
// seamless: transition(0) ≡ draw(from), transition(1) ≡ draw(to). REST pose has
// all zeros (burst < 0 = off), so draw(season) = paint(ctx, SP[season], REST) and
// the idle's pose is 0 at every action-window edge → seamless loop.
//
// PALETTE LOCK: the apple stays a glowing warm GOLD all year. Ripeness shows in
// richness/shade only — NEVER a hue change away from gold. The gold glow stays
// locked bright even under winter frost.
//
// Origin-centered in the −24..+24 design box (the sparkle burst may paint
// outside it), light from upper-left, flat cel-shaded with a soft dark outline.
// Pure Canvas-2D vector drawing — never throws, clamps everything, save/restore,
// resets globalAlpha.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable season params ──────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — paint is a
 *  pure function of these so transitions interpolate cleanly. */
interface P {
  skinLight: RGB;        // lit upper-left face of the gold skin
  skinMid: RGB;          // body gold tone
  skinDark: RGB;         // shadowed lower-right / underside gold
  stem: RGB;             // short woody stem
  leaf: RGB;             // the small leaf
  padGrass: RGB;         // top of the grass pad
  padDark: RGB;          // shaded pad underside
  soil: RGB;             // contact / base soil under the apple
  outline: RGB;          // soft dark outline tint
  light: RGB;            // ambient light tint laid over the whole tile
  lightAmt: number;      // 0..1 strength of the ambient light wash
  ripeness: number;      // 0..1 richness of the gold (shade only — locked hue)
  gloss: number;         // 0..1 specular gloss / sheen strength on the skin
  frostAmt: number;      // 0..1 cool frost dusting on the skin (winter)
  snowCapAmt: number;    // 0..1 snow cap on the apple's shoulders (winter)
  padSnowAmt: number;    // 0..1 snow blanket on the pad (winter)
  blossomAmt: number;    // 0..1 tiny blossoms on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad (autumn)
  leafTurn: number;      // 0..1 leaf turning amber (autumn) — leaf colour cue only
}

/** The idle gesture, separate from season identity. All zero / burst<0 = REST. */
interface Pose {
  bob: number;     // vertical offset in design px (negative = up)
  lean: number;    // top-of-apple sway, radians (rock side to side)
  squashX: number; // additive horizontal scale (+0.18 = 18% wider)
  squashY: number; // additive vertical scale (+0.18 = 18% taller)
  burst: number;   // 0..1 progress of the rare sparkle burst (<0 = off)
}

const REST: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0, burst: -1 };

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
    leaf: lerpRGB(a.leaf, b.leaf, t),
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
    leafTurn: lerp(a.leafTurn, b.leafTurn, t),
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
    leafTurn: clamp01(p.leafTurn),
  };
}

function safeNum(x: number): number {
  return Number.isFinite(x) ? x : 0;
}

// ── Per-season params — pushed HARD (gold stays LOCKED) ──────────────────────
// PALETTE LOCK: skinLight/Mid/Dark stay in the GOLD family every season. Only
// richness/shade shift — never the hue away from gold.

const SP: Record<SeasonName, P> = {
  // Spring — a little pale, gold-green tinged young gold; dewy lime pad + blossom.
  Spring: {
    skinLight: [248, 232, 150],
    skinMid: [224, 192, 88],
    skinDark: [176, 142, 52],
    stem: [120, 92, 50],
    leaf: [134, 196, 92],
    padGrass: [128, 206, 86],
    padDark: [72, 138, 58],
    soil: [120, 84, 48],
    outline: [86, 64, 24],
    light: [234, 244, 222],
    lightAmt: 0.16,
    ripeness: 0.35,
    gloss: 0.5,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 1.0,
    fallenLeafAmt: 0,
    leafTurn: 0,
  },
  // Summer — bright polished PEAK gold; saturated mid-green pad; strong sheen.
  Summer: {
    skinLight: [255, 236, 132],
    skinMid: [250, 198, 54],
    skinDark: [198, 142, 28],
    stem: [112, 82, 42],
    leaf: [86, 170, 70],
    padGrass: [86, 168, 70],
    padDark: [44, 110, 48],
    soil: [126, 86, 48],
    outline: [96, 62, 16],
    light: [255, 240, 196],
    lightAmt: 0.2,
    ripeness: 0.7,
    gloss: 1.0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    leafTurn: 0,
  },
  // Autumn — rich deep glowing-gold; olive-tan pad; fallen leaves; leaf to amber.
  Autumn: {
    skinLight: [248, 214, 104],
    skinMid: [224, 168, 44],
    skinDark: [160, 110, 24],
    stem: [110, 76, 36],
    leaf: [206, 146, 48],
    padGrass: [150, 152, 86],
    padDark: [104, 96, 52],
    soil: [120, 80, 44],
    outline: [82, 52, 14],
    light: [250, 200, 128],
    lightAmt: 0.24,
    ripeness: 1.0,
    gloss: 0.62,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 1.0,
    leafTurn: 0.9,
  },
  // Winter — frost-rimmed gold + a bold snow cap + base snow; gold STAYS bright
  // and glowing through the cool light. Clearly snowy.
  Winter: {
    skinLight: [242, 224, 150],
    skinMid: [216, 178, 76],
    skinDark: [152, 120, 52],
    stem: [104, 86, 64],
    leaf: [128, 150, 120],
    padGrass: [182, 202, 220],
    padDark: [122, 150, 178],
    soil: [128, 110, 96],
    outline: [70, 56, 44],
    light: [200, 224, 255],
    lightAmt: 0.34,
    ripeness: 0.82,
    gloss: 0.46,
    frostAmt: 0.78,
    snowCapAmt: 1.0,
    padSnowAmt: 1.0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    leafTurn: 0,
  },
};

// ── Apple geometry — the SAME silhouette every season ─────────────────────────
// The classic apple shape sits low-centre on the pad. Origin-centered.

const APP_TOP = -8;  // shoulder line (top of the body, just under the dimple)
const APP_BOT = 17;  // base resting on the pad
const APP_HALF = 13; // half-width of the body at its widest
const APP_PIVOT_Y = APP_BOT - 1; // rock/lean about a point near the base

/** Trace the classic apple silhouette (heart-ish, with a top dimple), unposed. */
function appleBodyPath(ctx: CanvasRenderingContext2D): void {
  const t = APP_TOP;
  const b = APP_BOT;
  const h = APP_HALF;
  const midY = lerp(t, b, 0.42);
  ctx.beginPath();
  // top dimple centre (stem well)
  ctx.moveTo(0, t + 1.4);
  // up-and-over the right shoulder
  ctx.quadraticCurveTo(3.2, t - 2.2, 6.6, t - 1.4);
  ctx.quadraticCurveTo(h * 0.92, t + 1, h, midY - 2);
  // right belly bulging out to widest, then in to the base lobe
  ctx.quadraticCurveTo(h + 1.2, midY + 5, h * 0.74, b - 4);
  ctx.quadraticCurveTo(h * 0.5, b + 1.6, 4.2, b - 1.2);
  // bottom dimple between the two base lobes
  ctx.quadraticCurveTo(0, b + 1.0, -4.2, b - 1.2);
  // left base lobe up the left belly
  ctx.quadraticCurveTo(-h * 0.5, b + 1.6, -h * 0.74, b - 4);
  ctx.quadraticCurveTo(-h - 1.2, midY + 5, -h, midY - 2);
  // up-and-over the left shoulder back to the dimple
  ctx.quadraticCurveTo(-h * 0.92, t + 1, -6.6, t - 1.4);
  ctx.quadraticCurveTo(-3.2, t - 2.2, 0, t + 1.4);
  ctx.closePath();
}

// Apple centre (in design-box coords, before pose) — anchor for the sparkle burst.
const APP_CX = 0;
const APP_CY = lerp(APP_TOP, APP_BOT, 0.42);

// ── Small dressing helper ─────────────────────────────────────────────────────

/** A four-pointed sparkle star at (x,y). */
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number, color: string): void {
  if (r <= 0 || alpha <= 0) return;
  ctx.fillStyle = `rgba(${color},${clamp01(alpha)})`;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.2, y - r * 0.2, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.2, y + r * 0.2, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.2, y + r * 0.2, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.2, y - r * 0.2, x, y - r);
  ctx.closePath();
  ctx.fill();
}

// ── The single parameterized paint ───────────────────────────────────────────

/** The whole tile from ONLY `p` (season identity) and `pose` (idle gesture). */
function paint(ctx: CanvasRenderingContext2D, raw: P, rawPose: Pose): void {
  const p = clampP(raw);
  const pose: Pose = {
    bob: safeNum(rawPose.bob),
    lean: safeNum(rawPose.lean),
    squashX: safeNum(rawPose.squashX),
    squashY: safeNum(rawPose.squashY),
    burst: rawPose.burst, // <0 = off; used as 0..1 only when >=0
  };

  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Pad: low flat grass ellipse (does NOT move with the pose) ────────────
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
      ([[-9, 17.6], [5, 19], [11, 17.4], [-3, 20]] as Array<[number, number]>).forEach(([sx, sy]) => {
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

    // ── Contact shadow under the apple (follows the lean/bob for grounding) ───
    const tipShift = pose.lean * (APP_PIVOT_Y - APP_TOP); // how far the top leans
    const shadowSpread = 1 + clamp01(pose.bob < 0 ? -pose.bob / 14 : 0) * 0.5;
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0 + tipShift * 0.18, APP_BOT + 1.5, 9 * shadowSpread, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.28 / shadowSpread);
    ctx.beginPath();
    ctx.ellipse(2.5 + tipShift * 0.2, APP_BOT + 2, 11 * shadowSpread, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the golden apple, under the idle pose transform ──────────────
    ctx.save();
    // Pivot near the base so lean rocks the TOP side-to-side and squash anchors
    // at the base (it "sits" on the pad). bob raises the whole body.
    ctx.translate(0, APP_PIVOT_Y + pose.bob);
    ctx.rotate(pose.lean);
    ctx.scale(1 + pose.squashX, 1 + pose.squashY);
    ctx.translate(0, -APP_PIVOT_Y);

    const top = APP_TOP;
    const bot = APP_BOT;
    const midY = lerp(top, bot, 0.42);

    // 1) soft dark outline pass (full body in outline tint, body fills inset)
    appleBodyPath(ctx);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // 2) body fill, clipped so the outline reads as a soft rim
    ctx.save();
    appleBodyPath(ctx);
    ctx.clip();

    // base mid gold
    ctx.fillStyle = rgb(p.skinMid);
    ctx.fillRect(-APP_HALF - 3, top - 6, (APP_HALF + 3) * 2, bot - top + 12);

    // round volumetric shading: a radial gold gradient lit upper-left
    const bodyGrad = ctx.createRadialGradient(-5, top + 4, 1.5, -1, midY, APP_HALF + 7);
    bodyGrad.addColorStop(0, rgb(p.skinLight));
    bodyGrad.addColorStop(0.5, rgb(p.skinMid));
    bodyGrad.addColorStop(1, rgb(p.skinDark));
    ctx.fillStyle = bodyGrad;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.ellipse(-1, midY, APP_HALF + 3, (bot - top) * 0.66, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // deepen the lower-right underside so the apple reads round
    ctx.fillStyle = rgba(p.skinDark, 0.5);
    ctx.beginPath();
    ctx.ellipse(5, bot - 5, APP_HALF * 0.8, (bot - top) * 0.42, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // soft warm sheen band across the upper-left shoulder + metallic gold glints
    if (p.gloss > 0.02) {
      ctx.fillStyle = rgba([255, 250, 220], 0.18 + 0.34 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(-5, lerp(top, bot, 0.3), 5.6, 3.4, -0.5, 0, Math.PI * 2);
      ctx.fill();
      // primary specular dot — the metallic-gold highlight
      ctx.fillStyle = rgba([255, 255, 244], 0.4 + 0.5 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(-5.5, top + 3.5, 1.9, 2.6, -0.4, 0, Math.PI * 2);
      ctx.fill();
      // small secondary glint lower-right (reflected fill light)
      ctx.fillStyle = rgba([255, 248, 214], 0.22 + 0.3 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(6.5, bot - 6, 1.1, 1.8, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // frost dusting (winter) — cool blue speckle on the upward skin, gold shows
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.24 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(-1, lerp(top, bot, 0.28), APP_HALF, (bot - top) * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-8, top + 3], [-3, top + 2], [3, top + 3.5], [8, top + 5],
        [-6, lerp(top, bot, 0.4)], [5, lerp(top, bot, 0.46)], [0, lerp(top, bot, 0.32)],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // RARE burst — a clipped inner gold flare so the apple itself glows brighter
    if (pose.burst >= 0) {
      const env = Math.sin(clamp01(pose.burst) * Math.PI); // 0->1->0
      ctx.fillStyle = rgba([255, 248, 206], 0.5 * env);
      ctx.beginPath();
      ctx.ellipse(-1, midY, APP_HALF + 2, (bot - top) * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // end body clip

    // 3) snow cap on the shoulders (winter) — hugging the top rim, over the body
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(-APP_HALF * 0.66, top + 1.5);
      ctx.quadraticCurveTo(-4, top - 4.6, 0, top + 0.6);
      ctx.quadraticCurveTo(4, top - 4.6, APP_HALF * 0.66, top + 1.5);
      ctx.quadraticCurveTo(6, top + 4, 2, top + 2.6);
      ctx.quadraticCurveTo(0, top + 4.4, -2, top + 2.6);
      ctx.quadraticCurveTo(-6, top + 4, -APP_HALF * 0.66, top + 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(0, top + 2.4, APP_HALF * 0.58, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Short stem + small leaf in the top dimple (SAME every season) ───────
    const stemBaseY = top + 0.5;
    // short woody stem rising from the dimple, leaning slightly right
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(0, stemBaseY);
    ctx.quadraticCurveTo(1.2, stemBaseY - 4, 2.2, stemBaseY - 7);
    ctx.stroke();
    ctx.strokeStyle = rgb(p.stem);
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(0, stemBaseY);
    ctx.quadraticCurveTo(1.2, stemBaseY - 4, 2.2, stemBaseY - 7);
    ctx.stroke();

    // small leaf off the stem (upper-left). leafTurn nudges colour amber in autumn.
    const leafCol: RGB = lerpRGB(p.leaf, [210, 150, 56], clamp01(p.leafTurn));
    ctx.save();
    ctx.translate(-1, stemBaseY - 5.5);
    ctx.rotate(-0.7);
    // leaf outline
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.ellipse(-3.2, -0.4, 4.4, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // leaf body
    ctx.fillStyle = rgb(leafCol);
    ctx.beginPath();
    ctx.ellipse(-3.2, -0.6, 3.8, 1.9, 0, 0, Math.PI * 2);
    ctx.fill();
    // central vein
    ctx.strokeStyle = rgba(p.outline, 0.6);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-6.6, -0.5);
    ctx.lineTo(0.4, -0.7);
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // end pose transform

    // ── RARE idle SPARKLE BURST — radiating gold rays + stars (UNCLIPPED) ─────
    // A few gold rays sweeping out from the apple center, plus stars at the tips.
    // Fits the magical golden apple; may paint outside the −24..+24 box (no clip).
    if (pose.burst >= 0) {
      const b = clamp01(pose.burst);
      const env = Math.sin(b * Math.PI);  // overall envelope, 0->1->0
      const reach = 9 + 15 * b;            // rays grow outward over the window
      const cx = APP_CX;
      const cy = APP_CY + pose.bob;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      // central warm-gold flare
      const flare = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16 + 8 * b);
      flare.addColorStop(0, `rgba(255,250,210,${0.8 * env})`);
      flare.addColorStop(0.4, `rgba(255,224,130,${0.4 * env})`);
      flare.addColorStop(1, "rgba(255,210,90,0)");
      ctx.fillStyle = flare;
      ctx.beginPath();
      ctx.arc(cx, cy, 22 + 8 * b, 0, Math.PI * 2);
      ctx.fill();
      // a few radiating gold rays (5), slow spin
      const rays = 5;
      const spin = b * 0.5 - Math.PI / 2; // start pointing up
      for (let i = 0; i < rays; i++) {
        const ang = (i / rays) * Math.PI * 2 + spin;
        const ex = cx + Math.cos(ang) * reach;
        const ey = cy + Math.sin(ang) * reach;
        const grad = ctx.createLinearGradient(cx, cy, ex, ey);
        grad.addColorStop(0, `rgba(255,248,206,${0.7 * env})`);
        grad.addColorStop(1, "rgba(255,224,130,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        // a gold star at each ray tip
        sparkle(ctx, ex, ey, 1.4 + 1.2 * env, 0.85 * env, "255,246,200");
      }
      ctx.restore();
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

// ── Idle pose clock — two-tier occasional action ─────────────────────────────

/** Returns 0..1 progress through an action window of length `win` starting at
 *  phase offset within `period`, else −1 (at rest). Seamless because the pose
 *  built from q is zero (with zero velocity) at q=0 and q=1. */
function actionQ(t: number, period: number, win: number, phase: number): number {
  const c = (((t + phase) % period) + period) % period;
  return c < win ? c / win : -1;
}

const COMMON_PERIOD = 6;
const COMMON_WIN = 0.9;
const RARE_PERIOD = 18;
const RARE_WIN = 1.2;

// A bump shape that is 0 with zero velocity at q=0 and q=1 (single hump).
function hump(q: number): number {
  const s = Math.sin(Math.PI * q);
  return s * s;
}

// An asymmetric anticipation→peak→settle curve, 0 at q=0 and q=1.
function anticipate(q: number): number {
  const env = 0.5 * (1 - Math.cos(2 * Math.PI * q)); // 0..1..0, velocity 0 at edges
  const tilt = Math.sin(Math.PI * q) * Math.sin(1.5 * Math.PI * q);
  return env * (0.55 * Math.sin(2 * Math.PI * q) + 0.9 * tilt);
}

/** Build the idle pose from the wall clock. Two tiers:
 *   common WOBBLE every ~6s (win 0.9s), rare SPARKLE BURST every ~18s (win 1.2s). */
function poseFromClock(t: number): Pose {
  const tt = Number.isFinite(t) ? t : 0;
  const pose: Pose = { bob: 0, lean: 0, squashX: 0, squashY: 0, burst: -1 };

  // ── COMMON: side-to-side wobble (~6s, win 0.9s) ──
  // ~0.17 rad lean → top travels ~ pivotArm*0.17. Arm ≈ (APP_PIVOT_Y - APP_TOP)
  // ≈ 24 px → ~10–12 px sway at the top.
  const qC = actionQ(tt, COMMON_PERIOD, COMMON_WIN, 0.0);
  if (qC >= 0) {
    const env = Math.sin(Math.PI * qC); // 0..1..0, zero at edges
    const rock = Math.sin(qC * Math.PI * 3); // 1.5 rocks within the window
    pose.lean += 0.17 * env * rock;
    // little squat at the base as it rocks (settle weight side to side)
    pose.squashY += -0.06 * hump(qC);
    pose.squashX += 0.05 * hump(qC);
    // faint windup tilt from the seamless-curve toolkit (still 0 at edges)
    pose.lean += 0.02 * anticipate(qC);
  }

  // ── RARE SPECIAL: SPARKLE BURST (~18s, win 1.2s) ──
  // A small lift rides under the burst (anticipation dip → pop up → settle),
  // while the radiating gold rays/stars are drawn in paint() from pose.burst.
  const qS = actionQ(tt, RARE_PERIOD, RARE_WIN, 3.0); // phase 3s so it stays clear of the wobble
  if (qS >= 0) {
    pose.burst = qS;
    const env = Math.sin(qS * Math.PI);                 // 0->1->0
    const antic = Math.sin(qS * Math.PI * 2) * (1 - qS); // brief downbeat early
    pose.bob += -6 * env - 1.6 * Math.max(0, antic);     // gentle ~6px lift
    pose.squashY += 0.10 * env;                          // soft stretch on the flare
    pose.squashX += -0.07 * env;
  }

  return pose;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], REST);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const tt = Number.isFinite(t) ? t : 0;
    paint(ctx, SP[season], poseFromClock(tt));

    // Light additive season micro-dressing (drifting particles — never the
    // subject's own colour/brightness). Kept tiny so the POSE action is the star.
    ctx.save();
    try {
      ctx.globalAlpha = 1;
      if (season === "Winter") {
        const seeds: Array<[number, number, number]> = [
          [-9, 0.0, 1.0], [6, 0.4, 0.9], [11, 0.7, 0.8], [-2, 0.25, 0.9],
        ];
        ctx.fillStyle = "#ffffff";
        seeds.forEach(([fx, phase, r]) => {
          const prog = ((tt / 3.0 + phase) % 1 + 1) % 1;
          const fy = -22 + prog * 38;
          const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
          ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.arc(dx, fy, r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      } else if (season === "Spring") {
        // a couple of drifting petals
        ctx.fillStyle = "rgba(255,240,248,0.9)";
        for (let i = 0; i < 2; i++) {
          const prog = ((tt / 4.0 + i * 0.5) % 1 + 1) % 1;
          const px = (i === 0 ? -10 : 9) + Math.sin(prog * Math.PI * 2) * 3;
          const py = -18 + prog * 34;
          ctx.globalAlpha = 0.35 + 0.4 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.ellipse(px, py, 1.4, 0.9, prog * 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (season === "Autumn") {
        // one slow tumbling leaf
        const prog = ((tt / 5.0) % 1 + 1) % 1;
        const px = 11 - prog * 6 + Math.sin(prog * Math.PI * 3) * 2;
        const py = -16 + prog * 32;
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(prog * Math.PI);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(prog * Math.PI * 4);
        ctx.fillStyle = "rgba(196,120,32,1)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.4, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      // Summer: no extra dressing — the peak gold + the sparkle burst is the show.
    } finally {
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  };
}

// ── Forward season→season transitions (seamless endpoints) ───────────────────

function makeTransition(fromIdx: 0 | 1 | 2): (ctx: CanvasRenderingContext2D, p: number) => void {
  const from = SP[SEASON_NAMES[fromIdx]];
  const to = SP[SEASON_NAMES[fromIdx + 1]];
  return (ctx, pp) => {
    const k = smoother(clamp01(pp));
    paint(ctx, lerpP(from, to, k), REST);
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
