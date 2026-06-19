// Seasonal art for the HEATHER flower board tile (`tile_flower_heather`).
//
// ONE upright heather sprig — a slim vertical stem with a couple of side
// shoots, densely lined with many tiny bell-shaped flowers and small
// needle-like leaves, rising from a low grassy pad. The SAME sprig
// silhouette is drawn every season; only the flower colour / openness, the
// frost dusting, and the pad dressing change:
//   Spring — green budding tips, bells mostly closed buds blushing pink.
//   Summer — full vivid violet-magenta bloom, bells open and densest (PEAK).
//   Autumn — rusty-brown faded papery bells, olive foliage, a few fallen leaves.
//   Winter — frosted dried sprig, pale cool dusting, snow on the pad.
//
// Architecture (mandatory): a SINGLE parameterized `paint(ctx, p, bob)` draws
// the whole tile from ONLY tweenable params `p` and a vertical idle offset
// `bob`. Four parameter sets `SP` (one per season) feed it. `draw` calls it at
// rest, `anim` adds seamless micro-motion, and `transition` lerps every field
// of `p` between adjacent seasons with a smootherstep so transition(0) exactly
// reproduces draw(from) and transition(1) exactly reproduces draw(to).

import type { SeasonalTileEntry, SeasonalTransitionSet, SeasonName } from "../types.js";

// ── Tweenable parameter set ──────────────────────────────────────────────────

type RGB = [number, number, number];

interface P {
  // colours
  bell: RGB; // main flower / bell colour
  bellHi: RGB; // bell highlight
  foliage: RGB; // needle leaves
  foliageDark: RGB; // leaf / shading dark pass
  stem: RGB; // woody stem
  pad: RGB; // pad grass surface
  padDark: RGB; // pad underside / shaded grass
  soil: RGB; // soil rim under the pad
  outline: RGB; // soft dark outline tint
  light: RGB; // ambient light tint (overlay on whole tile)
  // scalars 0..1
  bloomAmount: number; // 0 closed green buds .. 1 open full bells
  frostAmt: number; // frost dusting on the sprig
  snowCapAmt: number; // snow caps on the sprig shoulders
  padSnowAmt: number; // snow blanket on the pad
  blossomAmt: number; // tiny stray blossom dots ON the pad (spring)
  fallenLeafAmt: number; // fallen leaves ON the pad (autumn)
  lightAmt: number; // strength of the light overlay
  shadowAmt: number; // contact-shadow strength
}

// ── Per-season parameter sets ────────────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  Spring: {
    bell: [150, 196, 96], // green buds blushing
    bellHi: [206, 232, 150],
    foliage: [108, 176, 72],
    foliageDark: [52, 102, 38],
    stem: [120, 110, 70],
    pad: [126, 206, 96],
    padDark: [70, 142, 60],
    soil: [96, 66, 36],
    outline: [40, 54, 28],
    light: [220, 238, 255], // cool-bright
    lightAmt: 0.16,
    shadowAmt: 0.2,
    bloomAmount: 0.18,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.5,
    fallenLeafAmt: 0,
  },
  Summer: {
    bell: [176, 58, 156], // vivid violet-magenta
    bellHi: [232, 142, 214],
    foliage: [70, 138, 50],
    foliageDark: [34, 78, 28],
    stem: [108, 92, 56],
    pad: [78, 168, 70], // saturated mid-green
    padDark: [44, 112, 46],
    soil: [88, 58, 30],
    outline: [38, 48, 26],
    light: [255, 246, 214], // warm
    lightAmt: 0.14,
    shadowAmt: 0.34,
    bloomAmount: 1,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  Autumn: {
    bell: [168, 92, 52], // rusty brown, papery
    bellHi: [206, 142, 92],
    foliage: [120, 124, 58], // olive
    foliageDark: [70, 70, 34],
    stem: [98, 78, 48],
    pad: [140, 150, 84], // olive-tan
    padDark: [96, 102, 54],
    soil: [92, 60, 30],
    outline: [48, 40, 24],
    light: [255, 224, 168], // low amber
    lightAmt: 0.2,
    shadowAmt: 0.26,
    bloomAmount: 0.82, // open but faded
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.7,
  },
  Winter: {
    bell: [150, 118, 120], // dried, dusty mauve-grey
    bellHi: [214, 200, 206],
    foliage: [96, 116, 96], // greyed sage
    foliageDark: [56, 72, 62],
    stem: [104, 96, 84],
    pad: [206, 220, 234], // snow-blued grass
    padDark: [150, 170, 192],
    soil: [110, 104, 96],
    outline: [70, 78, 88],
    light: [206, 224, 248], // cool blue-grey
    lightAmt: 0.22,
    shadowAmt: 0.16,
    bloomAmount: 0.5,
    frostAmt: 0.85,
    snowCapAmt: 0.7,
    padSnowAmt: 0.85,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Small numeric helpers ────────────────────────────────────────────────────

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
const smoother = (x: number): number => x * x * x * (x * (6 * x - 15) + 10);

function rgb(c: RGB, a = 1): string {
  const r = Math.round(clamp01(c[0] / 255) * 255);
  const g = Math.round(clamp01(c[1] / 255) * 255);
  const b = Math.round(clamp01(c[2] / 255) * 255);
  return `rgba(${r},${g},${b},${a})`;
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
    bell: mixRGB(a.bell, b.bell, k),
    bellHi: mixRGB(a.bellHi, b.bellHi, k),
    foliage: mixRGB(a.foliage, b.foliage, k),
    foliageDark: mixRGB(a.foliageDark, b.foliageDark, k),
    stem: mixRGB(a.stem, b.stem, k),
    pad: mixRGB(a.pad, b.pad, k),
    padDark: mixRGB(a.padDark, b.padDark, k),
    soil: mixRGB(a.soil, b.soil, k),
    outline: mixRGB(a.outline, b.outline, k),
    light: mixRGB(a.light, b.light, k),
    lightAmt: lerp(a.lightAmt, b.lightAmt, k),
    shadowAmt: lerp(a.shadowAmt, b.shadowAmt, k),
    bloomAmount: lerp(a.bloomAmount, b.bloomAmount, k),
    frostAmt: lerp(a.frostAmt, b.frostAmt, k),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, k),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, k),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, k),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, k),
  };
}

// ── Constant sprig geometry (silhouette identical every season) ──────────────
//
// Bell anchor positions along the main stem + two side shoots. Each entry is
// [x, y, side(-1/0/1), scale] — `side` orients the little bell. The list is the
// same every season; only how each bell is rendered changes with `p`.

interface Bell {
  x: number;
  y: number;
  side: number;
  s: number;
}

const STEM_BASE: [number, number] = [0, 17];
const STEM_TOP: [number, number] = [-1, -18];

// Quadratic control point of the main stem.
const STEM_CTRL: [number, number] = [3, -2];

function stemPointAt(u: number): [number, number] {
  // u 0..1 along main stem base->top
  const inv = 1 - u;
  const x = inv * inv * STEM_BASE[0] + 2 * inv * u * STEM_CTRL[0] + u * u * STEM_TOP[0];
  const y = inv * inv * STEM_BASE[1] + 2 * inv * u * STEM_CTRL[1] + u * u * STEM_TOP[1];
  return [x, y];
}

// Build the dense bell list once: many tiny bells up the main stem and the
// two side shoots, alternating sides for that lined-with-flowers look.
function buildBells(): Bell[] {
  const list: Bell[] = [];
  // main stem bells (upper ~70%)
  for (let i = 0; i < 11; i++) {
    const u = 0.28 + (i / 10) * 0.72;
    const [px, py] = stemPointAt(u);
    const side = i % 2 === 0 ? -1 : 1;
    const s = 0.7 + 0.35 * u; // smaller near the crown
    list.push({ x: px + side * (1.6 + 1.4 * (1 - u)), y: py, side, s });
  }
  // left side shoot
  for (let i = 0; i < 5; i++) {
    const u = 0.1 + (i / 4) * 0.62;
    list.push({ x: -6.5 - u * 5.5, y: 6 - u * 16, side: -1, s: 0.66 + 0.2 * u });
  }
  // right side shoot
  for (let i = 0; i < 5; i++) {
    const u = 0.1 + (i / 4) * 0.62;
    list.push({ x: 6.5 + u * 4.8, y: 8 - u * 15, side: 1, s: 0.66 + 0.2 * u });
  }
  return list;
}

const BELLS: Bell[] = buildBells();

// Needle-leaf positions along the stems (constant silhouette).
const LEAVES: Array<[number, number, number]> = (() => {
  const arr: Array<[number, number, number]> = [];
  for (let i = 0; i < 9; i++) {
    const u = 0.16 + (i / 8) * 0.8;
    const [px, py] = stemPointAt(u);
    const side = i % 2 === 0 ? 1 : -1;
    arr.push([px, py, side]);
  }
  return arr;
})();

// ── The single parameterized paint ───────────────────────────────────────────

function paint(ctx: CanvasRenderingContext2D, p: P, bob: number): void {
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // — contact shadow (soft, lower-right) —
    ctx.fillStyle = `rgba(0,0,0,${0.18 + p.shadowAmt * 0.28})`;
    ctx.beginPath();
    ctx.ellipse(3, 21.5, 15, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();

    drawPad(ctx, p);
    drawSprig(ctx, p, bob);
    drawPadDressing(ctx, p);

    // — global light overlay (cel ambient) —
    if (p.lightAmt > 0.001) {
      ctx.save();
      ctx.globalCompositeOperation = "soft-light";
      const lg = ctx.createRadialGradient(-10, -10, 2, 0, 0, 40);
      lg.addColorStop(0, rgb(p.light, p.lightAmt));
      lg.addColorStop(1, rgb(p.light, 0));
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
    ctx.restore();
  }
}

// — low flat grassy pad —
function drawPad(ctx: CanvasRenderingContext2D, p: P): void {
  const cy = 19;
  // shaded underside
  ctx.fillStyle = rgb(p.padDark);
  ctx.beginPath();
  ctx.ellipse(0, cy + 1.6, 18, 5.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // top surface
  ctx.fillStyle = rgb(p.pad);
  ctx.beginPath();
  ctx.ellipse(0, cy, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // soft outline
  ctx.strokeStyle = rgb(p.outline, 0.5);
  ctx.lineWidth = 1;
  ctx.stroke();

  // tufted grass edge — small upticks around the front rim
  ctx.strokeStyle = rgb(p.padDark);
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 13; i++) {
    const a = Math.PI * (0.08 + (i / 12) * 0.84); // front arc
    const ex = Math.cos(a) * -18;
    const ey = cy + Math.sin(a) * 4.6;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + (i % 2 ? 1.2 : -1.2), ey - 2.4 - (i % 3));
    ctx.stroke();
  }
  // bright grass highlight (upper-left lit edge)
  ctx.strokeStyle = rgb(mixRGB(p.pad, [255, 255, 255], 0.35), 0.7);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(-2, cy - 0.6, 13, 3, 0, Math.PI * 1.05, Math.PI * 1.9);
  ctx.stroke();
}

// — the heather sprig (silhouette constant; colour/frost from p) —
function drawSprig(ctx: CanvasRenderingContext2D, p: P, bob: number): void {
  ctx.save();
  ctx.translate(0, bob);

  // stem (dark pass then lighter) — main stem + two side shoots
  const drawStemPath = () => {
    ctx.beginPath();
    ctx.moveTo(STEM_BASE[0], STEM_BASE[1]);
    ctx.quadraticCurveTo(STEM_CTRL[0], STEM_CTRL[1], STEM_TOP[0], STEM_TOP[1]);
    // left shoot
    ctx.moveTo(0, 9);
    ctx.quadraticCurveTo(-6, 4, -12, -9);
    // right shoot
    ctx.moveTo(1, 11);
    ctx.quadraticCurveTo(7, 6, 11, -7);
  };
  ctx.strokeStyle = rgb(p.outline);
  ctx.lineWidth = 3.2;
  drawStemPath();
  ctx.stroke();
  ctx.strokeStyle = rgb(p.stem);
  ctx.lineWidth = 1.7;
  drawStemPath();
  ctx.stroke();

  // needle leaves — short paired needles along the stems
  LEAVES.forEach(([lx, ly, side]) => {
    const tx = lx + side * 4.4;
    const ty = ly - 2.6;
    ctx.strokeStyle = rgb(p.foliageDark);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.strokeStyle = rgb(p.foliage);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  });

  // bells — tiny bell/urn shapes. openness from bloomAmount: low = slim closed
  // green-ish bud; high = rounder open bell. Colour straight from p.bell.
  const open = clamp01(p.bloomAmount);
  BELLS.forEach((b) => {
    const w = (1.5 + open * 1.0) * b.s;
    const h = (2.4 + open * 0.6) * b.s;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.side * 0.5 * (0.6 + open * 0.4));
    // bell body
    ctx.fillStyle = rgb(p.bell);
    ctx.strokeStyle = rgb(p.outline, 0.8);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    // urn/bell: rounded top, narrowing mouth at the bottom
    ctx.moveTo(-w, -h * 0.3);
    ctx.quadraticCurveTo(-w * 1.05, -h, 0, -h);
    ctx.quadraticCurveTo(w * 1.05, -h, w, -h * 0.3);
    ctx.quadraticCurveTo(w * 0.7, h * 0.9, 0, h);
    ctx.quadraticCurveTo(-w * 0.7, h * 0.9, -w, -h * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // little open-mouth notch when bloomed
    if (open > 0.5) {
      ctx.fillStyle = rgb(mixRGB(p.bell, p.outline, 0.45));
      ctx.beginPath();
      ctx.ellipse(0, h * 0.55, w * 0.5, h * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // upper-left highlight
    ctx.fillStyle = rgb(p.bellHi, 0.85);
    ctx.beginPath();
    ctx.ellipse(-w * 0.35, -h * 0.45, w * 0.32, h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // frost dusting (winter) — pale cool flecks over bells + leaves, sprig still
  // clearly visible (low alpha, scattered, never a white-out).
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = `rgba(232,242,255,${0.55 * p.frostAmt})`;
    BELLS.forEach((b, i) => {
      if (i % 2 === 0) {
        ctx.beginPath();
        ctx.arc(b.x - 0.6, b.y - 0.8, 0.9 * b.s, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    // snow caps on the crown / shoulders
    if (p.snowCapAmt > 0.001) {
      ctx.fillStyle = `rgba(248,252,255,${0.85 * p.snowCapAmt})`;
      const caps: Array<[number, number, number]> = [
        [STEM_TOP[0], STEM_TOP[1] + 1, 2.6],
        [-11, -8, 2],
        [10, -6, 2],
      ];
      caps.forEach(([cx, cyy, r]) => {
        ctx.beginPath();
        ctx.ellipse(cx, cyy, r, r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  ctx.restore();
}

// — dressing that sits ON the pad (blossom dots, fallen leaves, pad snow) —
function drawPadDressing(ctx: CanvasRenderingContext2D, p: P): void {
  const cy = 19;

  // spring stray blossoms — tiny pink-white dots on the grass
  if (p.blossomAmt > 0.001) {
    const spots: Array<[number, number]> = [
      [-12, 18.5],
      [11, 19.5],
      [6, 21],
      [-7, 21],
    ];
    spots.forEach(([sx, sy], i) => {
      if (i / spots.length < p.blossomAmt + 0.05) {
        ctx.fillStyle = `rgba(248,210,232,${0.9 * clamp01(p.blossomAmt * 1.6)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,238,120,${0.9 * clamp01(p.blossomAmt * 1.6)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // autumn fallen leaves on the pad
  if (p.fallenLeafAmt > 0.001) {
    const leaves: Array<[number, number, number, RGB]> = [
      [-11, 20, -0.5, [184, 108, 44]],
      [10, 20.5, 0.7, [156, 76, 36]],
      [2, 22, 0.2, [196, 140, 56]],
    ];
    leaves.forEach(([lx, ly, rot, col], i) => {
      if (i / leaves.length < p.fallenLeafAmt + 0.05) {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgb(col, clamp01(p.fallenLeafAmt * 1.4));
        ctx.strokeStyle = rgb(p.outline, 0.5 * clamp01(p.fallenLeafAmt * 1.4));
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.8, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    });
  }

  // winter snow blanket on the pad top
  if (p.padSnowAmt > 0.001) {
    ctx.save();
    ctx.globalAlpha = clamp01(p.padSnowAmt);
    const sg = ctx.createLinearGradient(0, cy - 4, 0, cy + 4);
    sg.addColorStop(0, "rgba(250,253,255,1)");
    sg.addColorStop(1, "rgba(214,228,244,1)");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.ellipse(-1, cy - 0.8, 16.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // frost sparkle on the pad
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    const sparks: Array<[number, number]> = [
      [-9, 18],
      [5, 19.5],
      [12, 18.5],
      [-2, 20.5],
    ];
    sparks.forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
}

// ── Idle bob: zero value and zero velocity at t=0, seamless ───────────────────

function bobAt(t: number, amp = 0.8, w = 1.4): number {
  // A*(1-cos(w t))*0.5 — starts at 0 with zero velocity.
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── draw / anim / transition factories ───────────────────────────────────────

function makeDraw(season: SeasonName) {
  return (ctx: CanvasRenderingContext2D): void => paint(ctx, SP[season], 0);
}

function makeAnim(season: SeasonName) {
  return (ctx: CanvasRenderingContext2D, t: number): void => {
    const bob = bobAt(t);
    // gentle horizontal sway of the whole sprig, additive; zero at t=0.
    const sway = Math.sin(t * 1.1) * 0.6 * (1 - Math.cos(t * 1.1)) * 0.5;

    ctx.save();
    try {
      ctx.translate(sway, 0);
      paint(ctx, SP[season], bob);

      // per-season micro-motion overlays (subtle, no flash on the subject)
      ctx.translate(0, bob);
      if (season === "Summer") {
        // faint shimmer travelling across the bells
        const k = (t * 0.4) % 1;
        const gy = -14 + k * 26;
        ctx.fillStyle = `rgba(255,228,255,${0.18 + 0.12 * Math.sin(t * 3)})`;
        ctx.beginPath();
        ctx.ellipse(2, gy, 5, 2.4, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // a dry bell flutters loose and drifts a touch
        const k = (t / 3.4) % 1;
        const fx = 13 + Math.sin(k * 6.28) * 2;
        const fy = -6 + k * 18;
        ctx.save();
        ctx.globalAlpha = 0.9 * (1 - k);
        ctx.fillStyle = rgb(SP.Autumn.bell);
        ctx.beginPath();
        ctx.ellipse(fx, fy, 1.3, 1.9, k * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (season === "Winter") {
        // a couple of drifting snowflakes + cold sheen
        const span = 30;
        const flakes: Array<[number, number]> = [
          [-7, 0.0],
          [8, 0.55],
        ];
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        flakes.forEach(([fx, ph]) => {
          const prog = ((t / 3.2 + ph) % 1 + 1) % 1;
          const y = -20 + prog * span;
          const x = fx + Math.sin(prog * 6.28 + ph * 6) * 3;
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.fillStyle = `rgba(210,228,255,${0.1 + 0.08 * (0.5 + 0.5 * Math.sin(t * 0.8))})`;
        ctx.beginPath();
        ctx.ellipse(-2, 0, 10, 16, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Spring — dew shimmer glint on the lower bells
        const glint = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(255,255,255,${glint})`;
        ctx.beginPath();
        ctx.arc(-3, 6, 1 + glint, 0, Math.PI * 2);
        ctx.fill();
      }
    } catch {
      /* never throw */
    } finally {
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  };
}

function makeTransition(from: SeasonName, to: SeasonName) {
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const k = smoother(clamp01(pp));
    paint(ctx, lerpP(SP[from], SP[to], k), 0);
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
