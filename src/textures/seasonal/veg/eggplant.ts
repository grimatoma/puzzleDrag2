// Seasonal art for the EGGPLANT / aubergine vegetable tile (`tile_veg_eggplant`).
// Source: src/textures/seasonal/veg/eggplant.ts
//
// One plump glossy teardrop-oval eggplant sitting low-centre on a grassy pad:
// a deep purple body wider at the bottom and narrowing up, topped by a green
// star-shaped calyx cap + short stem. The SAME silhouette/outline is drawn
// every season — only colour, gloss and the small dressing (frost, snow cap,
// pad blossoms / fallen leaves / snow, light tint) change. The eggplant is
// PALETTE-LOCKED: deep glossy purple body with a green cap all year long;
// ripeness shows as colour/gloss only, never an identity change.
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
  skinLight: RGB;   // lit face of the eggplant skin (deep purple highlight)
  skinMid: RGB;     // body tone (deep glossy purple)
  skinDark: RGB;    // shadowed underside / far flank
  cap: RGB;         // green calyx cap + stem (locked green)
  capDark: RGB;     // shaded underside of the calyx
  padGrass: RGB;    // top of the grass pad
  padDark: RGB;     // shaded pad underside
  soil: RGB;        // contact / base soil under the eggplant
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  ripeness: number; // 0..1 (informs colour cue only; structural identity fixed)
  gloss: number;    // 0..1 specular gloss-streak strength on the skin
  capDry: number;   // 0..1 calyx drying / browning a touch (autumn)
  frostAmt: number; // 0..1 cool frost dusting on the skin
  snowCapAmt: number; // 0..1 snow on the shoulder of the eggplant
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
    cap: lerpRGB(a.cap, b.cap, t),
    capDark: lerpRGB(a.capDark, b.capDark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    ripeness: lerp(a.ripeness, b.ripeness, t),
    gloss: lerp(a.gloss, b.gloss, t),
    capDry: lerp(a.capDry, b.capDry, t),
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
    capDry: clamp01(p.capDry),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────
// PALETTE LOCK: skin stays deep glossy PURPLE, cap stays GREEN every season.
// Seasons only shift it lighter/younger (spring), peak glossy (summer), very
// deep (autumn), or frost-cooled (winter) — never off-purple, never off-green.

const SP: Record<SeasonName, P> = {
  // Spring — small pale young fruit, matte, fresh green cap; lime dewy pad + blossom.
  Spring: {
    skinLight: [168, 126, 196],
    skinMid: [128, 84, 162],
    skinDark: [86, 52, 116],
    cap: [128, 188, 78],
    capDark: [78, 134, 52],
    padGrass: [128, 206, 86],
    padDark: [72, 138, 58],
    soil: [120, 84, 48],
    outline: [44, 28, 56],
    light: [232, 244, 226],
    lightAmt: 0.16,
    ripeness: 0.2,
    gloss: 0.22,
    capDry: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — full glossy deep PURPLE eggplant (PEAK); bright specular streak,
  // mid-green pad, warm light.
  Summer: {
    skinLight: [150, 86, 196],
    skinMid: [96, 44, 142],
    skinDark: [58, 24, 92],
    cap: [96, 174, 60],
    capDark: [56, 122, 44],
    padGrass: [86, 168, 70],
    padDark: [44, 110, 48],
    soil: [126, 86, 48],
    outline: [34, 16, 54],
    light: [255, 240, 206],
    lightAmt: 0.18,
    ripeness: 0.8,
    gloss: 0.96,
    capDry: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — very deep ripe purple, slightly less glossy, calyx drying a touch;
  // olive-tan pad + fallen leaves, low amber light.
  Autumn: {
    skinLight: [120, 66, 156],
    skinMid: [78, 36, 116],
    skinDark: [46, 20, 76],
    cap: [126, 142, 72],
    capDark: [92, 100, 50],
    padGrass: [150, 152, 86],
    padDark: [104, 96, 52],
    soil: [120, 80, 44],
    outline: [32, 16, 48],
    light: [248, 210, 150],
    lightAmt: 0.2,
    ripeness: 1.0,
    gloss: 0.4,
    capDry: 0.65,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — frost-dusted purple (cool, still clearly purple) + snow cap on the
  // shoulder; snowy pad, cool blue-grey light.
  Winter: {
    skinLight: [144, 110, 184],
    skinMid: [104, 70, 148],
    skinDark: [66, 44, 104],
    cap: [120, 150, 120],
    capDark: [82, 112, 86],
    padGrass: [176, 196, 214],
    padDark: [120, 146, 172],
    soil: [128, 110, 96],
    outline: [44, 34, 60],
    light: [206, 226, 252],
    lightAmt: 0.3,
    ripeness: 0.9,
    gloss: 0.28,
    capDry: 0.15,
    frostAmt: 0.7,
    snowCapAmt: 0.85,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── The single parameterized paint ───────────────────────────────────────────

// Eggplant geometry constants (the SAME silhouette every season). A plump
// teardrop-oval body: narrow shoulder near the cap, bulging wide at the bottom.
// Origin-centered, resting low on the pad.
const EGG_TOP = -11; // shoulder / neck line under the cap
const EGG_BOT = 17; // base resting on the pad
const EGG_HALF = 11.5; // half-width at the widest (lower) belly

/** Trace the plump teardrop-oval aubergine body path into the current ctx path.
 *  Narrow at the top shoulder, bulging widest low, rounded base. */
function eggplantBodyPath(ctx: CanvasRenderingContext2D, bob: number): void {
  const t = EGG_TOP + bob; // shoulder
  const b = EGG_BOT + bob; // base
  const h = EGG_HALF;
  const midY = lerp(t, b, 0.62); // widest belly sits low
  ctx.beginPath();
  // start at the narrow neck on the left, just under the cap
  ctx.moveTo(-4.4, t);
  // up over the small rounded shoulder
  ctx.quadraticCurveTo(-4.0, t - 2.6, 0, t - 2.8);
  ctx.quadraticCurveTo(4.0, t - 2.6, 4.4, t);
  // right shoulder flares out and down to the wide belly
  ctx.quadraticCurveTo(7.4, lerp(t, b, 0.22), h * 0.96, midY - 2);
  ctx.quadraticCurveTo(h + 0.6, midY + 1.5, h * 0.86, lerp(midY, b, 0.62));
  // round the bottom-right base
  ctx.quadraticCurveTo(h * 0.6, b + 1.6, 0, b + 2.2);
  // round the bottom-left base back up
  ctx.quadraticCurveTo(-h * 0.6, b + 1.6, -h * 0.86, lerp(midY, b, 0.62));
  // left belly back up to the neck
  ctx.quadraticCurveTo(-h - 0.6, midY + 1.5, -h * 0.96, midY - 2);
  ctx.quadraticCurveTo(-7.4, lerp(t, b, 0.22), -4.4, t);
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

    // ── Soil contact patch directly under the eggplant base ─────────────────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, EGG_BOT + bob + 1.8, 8.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // contact shadow of the eggplant on the pad (toward lower-right)
    ctx.fillStyle = rgba(p.outline, 0.28);
    ctx.beginPath();
    ctx.ellipse(2.5, EGG_BOT + bob + 2.3, 10.5, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the eggplant body (SAME silhouette every season) ───────────
    // 1) soft dark outline pass (drawn slightly fatter, dark first then light)
    eggplantBodyPath(ctx, bob);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // 2) body fill, inset a touch so the outline shows as a rim
    ctx.save();
    eggplantBodyPath(ctx, bob);
    ctx.clip();

    const top = EGG_TOP + bob;
    const bot = EGG_BOT + bob;
    const midY = lerp(top, bot, 0.62);

    // base mid tone — deep glossy purple
    ctx.fillStyle = rgb(p.skinMid);
    ctx.fillRect(-EGG_HALF - 3, top - 6, (EGG_HALF + 3) * 2, bot - top + 12);

    // light from upper-left: a lit lobe on the left/upper belly
    const litGrad = ctx.createLinearGradient(-EGG_HALF, top - 4, EGG_HALF, bot);
    litGrad.addColorStop(0, rgb(p.skinLight));
    litGrad.addColorStop(0.5, rgb(p.skinMid));
    litGrad.addColorStop(1, rgb(p.skinDark));
    ctx.fillStyle = litGrad;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.ellipse(-1.5, lerp(top, bot, 0.5), EGG_HALF + 2, (bot - top) * 0.56, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // rounded form shadow on the far (right/lower) flank
    ctx.fillStyle = rgba(p.skinDark, 0.55);
    ctx.beginPath();
    ctx.ellipse(EGG_HALF * 0.42, midY, EGG_HALF * 0.62, (bot - top) * 0.4, -0.18, 0, Math.PI * 2);
    ctx.fill();
    // deep base shadow to seat the bulb
    ctx.fillStyle = rgba(p.skinDark, 0.5);
    ctx.beginPath();
    ctx.ellipse(0, bot - 1.5, EGG_HALF * 0.8, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // soft glossy highlight band on the upper-left shoulder of the belly
    ctx.fillStyle = rgba(p.skinLight, 0.4 + 0.3 * p.gloss);
    ctx.beginPath();
    ctx.ellipse(-4.5, lerp(top, bot, 0.34), EGG_HALF * 0.5, (bot - top) * 0.34, -0.18, 0, Math.PI * 2);
    ctx.fill();

    // strong vertical specular gloss streak (gloss strength from P) —
    // a bright vertical streak down the lit face, the eggplant's signature sheen
    if (p.gloss > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.14 + 0.62 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(-4.6, lerp(top, bot, 0.42), 1.5, (bot - top) * 0.36, -0.08, 0, Math.PI * 2);
      ctx.fill();
      // secondary thinner streak
      ctx.fillStyle = rgba([255, 255, 255], 0.08 + 0.34 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(-0.5, lerp(top, bot, 0.36), 0.9, (bot - top) * 0.26, -0.04, 0, Math.PI * 2);
      ctx.fill();
    }

    // frost dusting (winter) — cool blue speckle on the upward skin
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.26 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(-1, lerp(top, bot, 0.32), EGG_HALF, (bot - top) * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([235, 246, 255], 0.68 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-7, top + 4], [-2, top + 2.5], [3, top + 4], [7, lerp(top, bot, 0.3)],
        [-5, lerp(top, bot, 0.5)], [5, lerp(top, bot, 0.52)], [0, lerp(top, bot, 0.4)],
        [-3, lerp(top, bot, 0.66)],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.65, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // end clip

    // 3) snow cap on the shoulder (winter) — drawn over, hugging the neck/top
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(-4.6, top + 0.5);
      ctx.quadraticCurveTo(-3.4, top - 4, 0, top - 3.4);
      ctx.quadraticCurveTo(3.4, top - 4, 4.6, top + 0.5);
      ctx.quadraticCurveTo(2.6, top + 2.6, 0, top + 1.6);
      ctx.quadraticCurveTo(-2.6, top + 2.6, -4.6, top + 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([205, 222, 242], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(0, top + 1, 4.0, 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Green star-shaped calyx cap + short stem (SAME placement, locked green)
    const capBaseY = top - 1.5;
    const capBack = lerpRGB(p.cap, p.capDark, 0.5);

    // calyx — a green star with a few pointed sepal leaves hugging the shoulder
    const sepals: Array<[number, number]> = [
      // [angle-ish x reach, downward droop]
      [-6.4, 3.4],
      [-3.4, 4.6],
      [0, 5.0],
      [3.4, 4.6],
      [6.4, 3.4],
    ];
    // back layer (slightly darker) for depth
    ctx.fillStyle = rgb(capBack);
    sepals.forEach(([sx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(sx * 0.35, capBaseY - 1.4);
      ctx.quadraticCurveTo(sx * 0.9, capBaseY + 0.4, sx, capBaseY + dy);
      ctx.quadraticCurveTo(sx * 0.55, capBaseY + dy * 0.5, sx * 0.18, capBaseY + 0.6);
      ctx.closePath();
      ctx.fill();
    });
    // front lit layer
    ctx.fillStyle = rgb(p.cap);
    sepals.forEach(([sx, dy], i) => {
      if (i % 2 === 1) return; // alternate front/back for a star read
      ctx.beginPath();
      ctx.moveTo(sx * 0.32, capBaseY - 1.8);
      ctx.quadraticCurveTo(sx * 0.85, capBaseY - 0.2, sx * 0.92, capBaseY + dy * 0.92);
      ctx.quadraticCurveTo(sx * 0.5, capBaseY + dy * 0.4, sx * 0.14, capBaseY + 0.2);
      ctx.closePath();
      ctx.fill();
    });
    // calyx outline
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 0.9;
    sepals.forEach(([sx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(sx * 0.35, capBaseY - 1.2);
      ctx.quadraticCurveTo(sx * 0.9, capBaseY + 0.4, sx, capBaseY + dy);
      ctx.stroke();
    });
    // calyx hub
    ctx.fillStyle = rgb(p.cap);
    ctx.beginPath();
    ctx.ellipse(0, capBaseY, 3.4, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // cap highlight (lit upper-left)
    ctx.fillStyle = rgba(lerpRGB(p.cap, [255, 255, 240], 0.5), 0.5);
    ctx.beginPath();
    ctx.ellipse(-1.4, capBaseY - 0.8, 1.6, 1.0, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // drying tint on the calyx (autumn) — a tan wash over the sepal tips
    if (p.capDry > 0.02) {
      ctx.fillStyle = rgba([176, 150, 86], 0.5 * p.capDry);
      sepals.forEach(([sx, dy]) => {
        ctx.beginPath();
        ctx.arc(sx, capBaseY + dy * 0.92, 1.4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // short upright stem rising from the calyx hub
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(-0.2, capBaseY - 1);
    ctx.quadraticCurveTo(-0.8, capBaseY - 5.5, 0.8, capBaseY - 8);
    ctx.stroke();
    ctx.strokeStyle = rgb(p.cap);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-0.2, capBaseY - 1);
    ctx.quadraticCurveTo(-0.8, capBaseY - 5.5, 0.8, capBaseY - 8);
    ctx.stroke();
    // stem highlight
    ctx.strokeStyle = rgba(lerpRGB(p.cap, [255, 255, 240], 0.4), 0.45);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-1.0, capBaseY - 2);
    ctx.quadraticCurveTo(-1.4, capBaseY - 5.5, -0.4, capBaseY - 7.5);
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
    // Per-season additive micro-motion drawn OVER the static paint.
    // The subject bob itself is 0 at t=0; micro-motion is additive sheen.
    paint(ctx, SP[season], bob);

    ctx.save();
    try {
      ctx.globalAlpha = 1;
      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint travelling gently on the skin
        const g = 0.22 + 0.28 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        const gy = 0 + bob + Math.sin(t * 1.1) * 1.4;
        ctx.beginPath();
        ctx.arc(-4.5, gy, 1.0 + g * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // bright specular streak slides DOWN the body (seamless via fract)
        const prog = (t * 0.5) % 1;
        const top = EGG_TOP + bob;
        const bot = EGG_BOT + bob;
        const gy = lerp(top + 2, bot - 3, prog);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.ellipse(-4.6, gy, 1.4, 2.8, -0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.beginPath();
        ctx.ellipse(-0.5, gy * 0.96, 0.9, 2.0, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // faint slow sheen pulsing on the shoulder
        const s = 0.1 + 0.14 * (0.5 + 0.5 * Math.sin(t * 0.9));
        ctx.fillStyle = `rgba(255,236,200,${s})`;
        ctx.beginPath();
        ctx.ellipse(-3.5, -2 + bob, 4.2, 3.0, -0.2, 0, Math.PI * 2);
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
        ctx.ellipse(-3, 2 + bob, 5.5, 4, -0.2, 0, Math.PI * 2);
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
