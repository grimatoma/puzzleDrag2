// Seasonal art for the GOLDEN APPLE fruit tile (`tile_fruit_golden_apple`).
//
// One glowing GOLDEN apple — classic apple silhouette with a short stem and a
// small leaf — resting low-centre on a grassy pad, a faint warm shimmer/sheen on
// its metallic-gold skin. The SAME apple silhouette is drawn every season; only
// colour, dressing (blossom / fallen leaves / snow / frost), light tint, gloss
// and the warm sheen change. This is enforced by a single parameterized
// `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
//
// PALETTE LOCK: the apple stays a glowing warm GOLD all year. Ripeness shows in
// richness/shade only — NEVER a hue change away from gold. The travelling
// specular glint is the subject's signature, but overall brightness stays
// constant (no flash/bloom).
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
  skinLight: RGB;   // lit upper-left face of the gold skin
  skinMid: RGB;     // body gold tone
  skinDark: RGB;    // shadowed lower-right / underside gold
  stem: RGB;        // short woody stem
  leaf: RGB;        // the small leaf
  padGrass: RGB;    // top of the grass pad
  padDark: RGB;     // shaded pad underside
  soil: RGB;        // contact / base soil under the apple
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  ripeness: number; // 0..1 richness of the gold (shade only — locked hue)
  gloss: number;    // 0..1 specular gloss / sheen strength on the skin
  frostAmt: number; // 0..1 cool frost dusting on the skin (winter)
  snowCapAmt: number; // 0..1 snow cap on the apple's shoulders (winter)
  padSnowAmt: number; // 0..1 snow blanket on the pad (winter)
  blossomAmt: number; // 0..1 tiny blossoms on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad (autumn)
  leafTurn: number; // 0..1 leaf turning amber (autumn) — leaf colour cue only
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

// ── Per-season params ────────────────────────────────────────────────────────
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
    gloss: 0.45,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
    leafTurn: 0,
  },
  // Summer — bright polished PEAK gold; saturated mid-green pad; strong sheen.
  Summer: {
    skinLight: [255, 234, 130],
    skinMid: [246, 196, 58],
    skinDark: [196, 142, 30],
    stem: [112, 82, 42],
    leaf: [86, 170, 70],
    padGrass: [86, 168, 70],
    padDark: [44, 110, 48],
    soil: [126, 86, 48],
    outline: [96, 62, 16],
    light: [255, 240, 200],
    lightAmt: 0.18,
    ripeness: 0.7,
    gloss: 1.0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    leafTurn: 0,
  },
  // Autumn — rich deep glowing-gold; olive-tan pad; fallen leaves; leaf turning amber.
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
    light: [248, 208, 142],
    lightAmt: 0.2,
    ripeness: 1.0,
    gloss: 0.6,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
    leafTurn: 0.9,
  },
  // Winter — frost-rimmed gold + small snow cap; gold still glowing through cool
  // light; snowy pad. The apple stays CLEARLY gold underneath the frost.
  Winter: {
    skinLight: [240, 222, 152],
    skinMid: [214, 176, 78],
    skinDark: [152, 120, 56],
    stem: [104, 86, 64],
    leaf: [128, 150, 120],
    padGrass: [176, 196, 214],
    padDark: [120, 146, 172],
    soil: [128, 110, 96],
    outline: [70, 56, 44],
    light: [206, 226, 252],
    lightAmt: 0.3,
    ripeness: 0.8,
    gloss: 0.4,
    frostAmt: 0.7,
    snowCapAmt: 0.85,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    leafTurn: 0,
  },
};

// ── The single parameterized paint ───────────────────────────────────────────

// Apple geometry constants (the SAME silhouette every season). The classic
// apple shape sits low-centre on the pad. Origin-centered.
const APP_TOP = -8;  // shoulder line (top of the body, just under the dimple)
const APP_BOT = 17;  // base resting on the pad
const APP_HALF = 13; // half-width of the body at its widest

/** Trace the classic apple silhouette (heart-ish, with a top dimple) into the
 *  current ctx path. `bob` shifts the whole body vertically. */
function appleBodyPath(ctx: CanvasRenderingContext2D, bob: number): void {
  const t = APP_TOP + bob;
  const b = APP_BOT + bob;
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

    // ── Soil contact patch + contact shadow directly under the apple base ────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, APP_BOT + bob + 1.5, 9, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.outline, 0.28);
    ctx.beginPath();
    ctx.ellipse(2.5, APP_BOT + bob + 2, 11, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the golden apple (SAME silhouette every season) ────────────
    const top = APP_TOP + bob;
    const bot = APP_BOT + bob;
    const midY = lerp(top, bot, 0.42);

    // 1) soft dark outline pass (full body in outline tint, body fills inset)
    appleBodyPath(ctx, bob);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // 2) body fill, clipped so the outline reads as a soft rim
    ctx.save();
    appleBodyPath(ctx, bob);
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

    // soft warm sheen band across the upper-left shoulder (constant brightness;
    // the travelling glint in anim() rides over this)
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

    ctx.restore(); // end clip

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
function bobAt(t: number, amp = 0.9, w = 1.5): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    paint(ctx, SP[season], bob);

    const top = APP_TOP + bob;
    const bot = APP_BOT + bob;

    ctx.save();
    try {
      ctx.globalAlpha = 1;

      // SIGNATURE: a soft golden specular glint travels across the skin every
      // loop — subtle, constant peak brightness (no flash). Present in ALL
      // seasons so the gold reads as glowing metal; season extras layer over it.
      {
        const prog = (t * 0.4) % 1; // seamless 0..1 sweep, period 2.5s
        // travel diagonally from upper-left shoulder down toward lower-right
        const gx = lerp(-6.5, 6.5, prog);
        const gy = lerp(top + 3, bot - 5, prog);
        // fade in/out at the ends so it never pops
        const edge = Math.sin(prog * Math.PI);
        ctx.fillStyle = `rgba(255,252,228,${0.5 * edge})`;
        ctx.beginPath();
        ctx.ellipse(gx, gy, 1.7, 2.7, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,245,200,${0.22 * edge})`;
        ctx.beginPath();
        ctx.ellipse(gx + 1.2, gy + 0.6, 3.4, 2.0, -0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint resting on the gold skin
        const g = 0.22 + 0.26 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        const gy = top + 4 + Math.sin(t * 1.1) * 1.0;
        ctx.beginPath();
        ctx.arc(-5.5, gy, 1.0 + g * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // autumn leaf flutter — the small leaf gives a gentle extra wobble
        const fl = Math.sin(t * 2.6) * 0.16;
        ctx.translate(-1, top - 5 + bob * 0);
        ctx.rotate(-0.7 + fl);
        const amber: RGB = [212, 150, 54];
        ctx.fillStyle = rgba(amber, 0.5 + 0.2 * (0.5 + 0.5 * Math.sin(t * 2.6)));
        ctx.beginPath();
        ctx.ellipse(-3.2, -0.6, 3.6, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Winter") {
        // drifting snowflakes + a faint cold sheen over the gold
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
        ctx.ellipse(-3, lerp(top, bot, 0.42), 6, 4, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // Summer needs no extra: the signature travelling glint on peak gold IS
      // the summer idle.
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
