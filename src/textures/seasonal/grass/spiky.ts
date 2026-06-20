// Seasonal art for the SPIKY GRASS tile (`tile_grass_spiky`).
// Source path token: seasonal/grass/spiky.ts  (category: GRASS framing).
//
// A stiff CLUMP of sharp, rigid, pointed blades radiating evenly outward from
// the pad centre — like a spiky agave / sedge rosette: straight, stiff, sharply
// pointed, olive-toned. The SAME spiky-rosette silhouette is drawn every season
// (palette lock: stiff olive spiky clump) — only colour and the small dressing
// (frost on tips, snow at base, blossom / fallen leaves / pad snow, light tint,
// edge sheen) change. This is enforced by a single parameterized
// `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle. The
// spikes are STIFF, so the idle bob amplitude is deliberately tiny.
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
  bladeLight: RGB;  // lit face of a spike
  bladeMid: RGB;    // spike body tone
  bladeDark: RGB;   // shadowed / inner spikes + base
  tip: RGB;         // sharp pointed tip accent (rust in autumn, frost in winter)
  padGrass: RGB;    // top of the grass pad
  padDark: RGB;     // shaded pad underside
  soil: RGB;        // contact / base soil under the clump
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  ripeness: number; // 0..1 olive saturation/peak cue (summer = peak)
  gloss: number;    // 0..1 edge sheen along the spike edges
  tipRust: number;  // 0..1 rust-tipped, brittle, drier look (autumn)
  frostAmt: number; // 0..1 frost stiffening + frost on the spike TIPS (winter)
  snowCapAmt: number; // 0..1 snow caught at the BASE of the clump (winter)
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
    bladeLight: lerpRGB(a.bladeLight, b.bladeLight, t),
    bladeMid: lerpRGB(a.bladeMid, b.bladeMid, t),
    bladeDark: lerpRGB(a.bladeDark, b.bladeDark, t),
    tip: lerpRGB(a.tip, b.tip, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    ripeness: lerp(a.ripeness, b.ripeness, t),
    gloss: lerp(a.gloss, b.gloss, t),
    tipRust: lerp(a.tipRust, b.tipRust, t),
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
    tipRust: clamp01(p.tipRust),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — vivid new green-olive spikes, crisp; dewy lime pad + blossom.
  Spring: {
    bladeLight: [186, 222, 96],
    bladeMid: [128, 178, 60],
    bladeDark: [78, 124, 42],
    tip: [206, 232, 130],
    padGrass: [128, 206, 86],
    padDark: [72, 138, 58],
    soil: [120, 84, 48],
    outline: [44, 70, 30],
    light: [232, 244, 226],
    lightAmt: 0.16,
    ripeness: 0.4,
    gloss: 0.16,
    tipRust: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — hard saturated OLIVE spikes (PEAK); mid-green pad, warm light.
  Summer: {
    bladeLight: [168, 196, 70],
    bladeMid: [118, 150, 44],
    bladeDark: [74, 100, 30],
    tip: [188, 210, 92],
    padGrass: [86, 168, 70],
    padDark: [44, 110, 48],
    soil: [126, 86, 48],
    outline: [50, 66, 24],
    light: [255, 240, 206],
    lightAmt: 0.18,
    ripeness: 1.0,
    gloss: 0.5,
    tipRust: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — rust-tipped, brittle, drier olive spikes; olive-tan pad + leaves.
  Autumn: {
    bladeLight: [156, 162, 74],
    bladeMid: [120, 120, 52],
    bladeDark: [82, 78, 36],
    tip: [180, 96, 40],
    padGrass: [150, 152, 86],
    padDark: [104, 96, 52],
    soil: [120, 80, 44],
    outline: [62, 52, 26],
    light: [248, 210, 150],
    lightAmt: 0.2,
    ripeness: 0.7,
    gloss: 0.22,
    tipRust: 0.9,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — frost-stiffened spikes, frost on tips + snow caught at the base,
  // olive still visible; snowy pad, cool light. No white-out.
  Winter: {
    bladeLight: [134, 152, 96],
    bladeMid: [98, 116, 70],
    bladeDark: [66, 82, 56],
    tip: [222, 236, 248],
    padGrass: [176, 196, 214],
    padDark: [120, 146, 172],
    soil: [128, 110, 96],
    outline: [54, 56, 56],
    light: [206, 226, 252],
    lightAmt: 0.3,
    ripeness: 0.5,
    gloss: 0.2,
    tipRust: 0,
    frostAmt: 0.8,
    snowCapAmt: 0.85,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── The single parameterized paint ───────────────────────────────────────────

// Spiky rosette geometry — the SAME silhouette every season. The clump base
// sits low-centre on the pad; spikes radiate evenly outward and upward to sharp
// points. Each spike: [angle (rad, 0 = straight up, +right), length, halfWidth].
// Angles chosen so the rosette fans evenly outward; the central spikes are
// tallest, the outer ones flare lower and wider (agave/sedge silhouette).
const CLUMP_BASE_Y = 16; // contact line where all spikes meet the pad
const SPIKES: Array<[number, number, number]> = [
  [-1.18, 16, 2.0], // far left, low flare
  [-0.86, 24, 2.2], // left mid
  [-0.52, 32, 2.3], // left upper
  [-0.20, 38, 2.4], // centre-left (tallest)
  [0.06, 39, 2.4],  // centre (tallest)
  [0.30, 37, 2.4],  // centre-right
  [0.60, 31, 2.3],  // right upper
  [0.92, 23, 2.2],  // right mid
  [1.22, 15, 2.0],  // far right, low flare
];

/** Trace one straight, stiff, sharply-pointed spike as a slim triangle path.
 *  `lean` shifts the tip sideways a touch for the rigid idle quiver. */
function spikePath(
  ctx: CanvasRenderingContext2D,
  ang: number,
  len: number,
  half: number,
  bob: number,
  lean: number,
): { tipX: number; tipY: number } {
  const baseY = CLUMP_BASE_Y + bob;
  // base sits near the clump centre, slightly spread by angle
  const bx = Math.sin(ang) * 3.2;
  const by = baseY;
  // tip radiates outward/upward; lean nudges the sharp point
  const tipX = Math.sin(ang) * len + lean;
  const tipY = by - Math.cos(ang) * len;
  // perpendicular for the two base shoulders (slim → sharp point)
  const px = Math.cos(ang) * half;
  const py = Math.sin(ang) * half;
  ctx.beginPath();
  ctx.moveTo(bx - px, by - py);
  ctx.lineTo(bx + px, by + py);
  ctx.lineTo(tipX, tipY);
  ctx.closePath();
  return { tipX, tipY };
}

/** The whole tile from ONLY `p` and `bob`. `quiver` is a per-spike sideways
 *  lean array (design px) used by the idle; rest pose passes zeros. */
function paint(
  ctx: CanvasRenderingContext2D,
  raw: P,
  bob: number,
  quiver?: number[],
): void {
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

    // ── Soil contact patch directly under the clump base ────────────────────
    ctx.fillStyle = rgb(p.soil);
    ctx.beginPath();
    ctx.ellipse(0, CLUMP_BASE_Y + bob + 1.5, 8, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // contact shadow of the clump on the pad
    ctx.fillStyle = rgba(p.outline, 0.28);
    ctx.beginPath();
    ctx.ellipse(2.5, CLUMP_BASE_Y + bob + 2, 12, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: the spiky rosette (SAME silhouette every season) ───────────
    // Draw back-to-front: outer spikes first (darker, behind), centre last.
    // Render order by absolute angle descending so outermost sit behind.
    const order = SPIKES.map((_, i) => i).sort(
      (a, b) => Math.abs(SPIKES[b][0]) - Math.abs(SPIKES[a][0]),
    );

    order.forEach((i) => {
      const [ang, len, half] = SPIKES[i];
      const lean = quiver ? quiver[i] : 0;
      // depth 0 (outer) .. 1 (centre) for shading
      const depth = 1 - Math.min(1, Math.abs(ang) / 1.25);

      // 1) soft dark outline pass (slightly fatter triangle)
      spikePath(ctx, ang, len + 1.2, half + 0.9, bob, lean);
      ctx.fillStyle = rgb(p.outline);
      ctx.fill();

      // 2) body fill — outer spikes lean darker, centre lean lighter
      const body = lerpRGB(p.bladeDark, p.bladeMid, depth);
      spikePath(ctx, ang, len, half, bob, lean);
      ctx.fillStyle = rgb(body);
      ctx.fill();

      // 3) lit left face — a slim lighter sliver on the upper-left edge
      ctx.save();
      const { tipX, tipY } = spikePath(ctx, ang, len, half, bob, lean);
      ctx.clip();
      const lit = lerpRGB(p.bladeMid, p.bladeLight, 0.7 * depth + 0.3);
      const grad = ctx.createLinearGradient(
        -half - 4, CLUMP_BASE_Y + bob, tipX + half + 4, tipY,
      );
      grad.addColorStop(0, rgb(lit));
      grad.addColorStop(0.5, rgb(body));
      grad.addColorStop(1, rgb(p.bladeDark));
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(-24, -24, 48, 48);
      ctx.globalAlpha = 1;
      ctx.restore();

      // 4) central spine highlight — a crisp ridge line up the spike
      ctx.strokeStyle = rgba(p.bladeLight, 0.45 + 0.3 * depth);
      ctx.lineWidth = 0.9;
      const bx = Math.sin(ang) * 3.2;
      ctx.beginPath();
      ctx.moveTo(bx, CLUMP_BASE_Y + bob - 1);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      // 5) edge sheen (summer peak / glint) along the lit edge
      if (p.gloss > 0.02) {
        ctx.strokeStyle = rgba([255, 255, 255], 0.12 + 0.4 * p.gloss * depth);
        ctx.lineWidth = 0.7;
        const px = Math.cos(ang) * half;
        const py = Math.sin(ang) * half;
        ctx.beginPath();
        ctx.moveTo(bx - px * 0.8, CLUMP_BASE_Y + bob - py * 0.8);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
      }

      // 6) rust-tipped, brittle, drier (autumn) — colour the sharp point
      if (p.tipRust > 0.02) {
        ctx.fillStyle = rgba(p.tip, 0.85 * p.tipRust);
        ctx.beginPath();
        ctx.ellipse(tipX, tipY + 1.4, 1.5, 2.4, ang, 0, Math.PI * 2);
        ctx.fill();
      }

      // 7) frost on the TIPS (winter) — cool pale dusting at the sharp point
      if (p.frostAmt > 0.02) {
        ctx.fillStyle = rgba(p.tip, 0.7 * p.frostAmt);
        ctx.beginPath();
        ctx.ellipse(tipX, tipY + 1.2, 1.6, 2.6, ang, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba([255, 255, 255], 0.7 * p.frostAmt);
        ctx.beginPath();
        ctx.arc(tipX, tipY, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // snow caught at the BASE of the clump (winter) — over the spike roots
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.ellipse(0, CLUMP_BASE_Y + bob - 1.5, 9.5, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([214, 230, 246], 0.55 * a);
      ctx.beginPath();
      ctx.ellipse(1.5, CLUMP_BASE_Y + bob, 8, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      // a few clumps of snow clinging a little up the lower spikes
      ctx.fillStyle = rgba([255, 255, 255], 0.85 * a);
      [[-7, CLUMP_BASE_Y + bob - 3], [6, CLUMP_BASE_Y + bob - 3.5], [-2, CLUMP_BASE_Y + bob - 4]]
        .forEach(([sx, sy]) => {
          ctx.beginPath();
          ctx.ellipse(sx, sy, 1.6, 1.1, 0, 0, Math.PI * 2);
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

// A*(1-cos(w t))*0.5 → 0 at t=0 with zero velocity; period 2π/w. Stiff spikes:
// keep the amplitude small.
function bobAt(t: number, amp = 0.45, w = 1.4): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

/** Per-spike rigid quiver — a very subtle stiff sideways nudge, seamless and
 *  0 at t=0 with zero velocity. Stiff spikes barely move. */
function quiverAt(t: number): number[] {
  return SPIKES.map((_, i) => {
    const w = 1.4;
    const phase = i * 0.7;
    // (1-cos) envelope → 0 at t=0, tiny amplitude, phase per spike
    return 0.35 * (1 - Math.cos(w * t + phase)) * 0.5 * Math.sign(SPIKES[i][0] || 0.1);
  });
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    const quiver = quiverAt(t);
    // The stiff spikes barely move — a tiny rigid quiver/breathing bob.
    paint(ctx, SP[season], bob, quiver);

    ctx.save();
    try {
      ctx.globalAlpha = 1;
      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint resting on the clump
        const g = 0.22 + 0.28 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        const gy = -2 + bob + Math.sin(t * 1.1) * 1.0;
        ctx.beginPath();
        ctx.arc(-3, gy, 1.0 + g * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // faint edge sheen travelling up a centre spike (seamless via fract)
        const prog = (t * 0.45) % 1;
        const sy = lerp(CLUMP_BASE_Y + bob, -22, prog);
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath();
        ctx.ellipse(Math.sin(0.06) * sy * -0.04, sy, 1.0, 2.0, 0.04, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // brittle tip flutter — a faint dry shiver of the rust tips
        const sh = 0.1 + 0.14 * (0.5 + 0.5 * Math.sin(t * 3.4));
        ctx.strokeStyle = `rgba(180,96,40,${sh})`;
        ctx.lineWidth = 0.8;
        SPIKES.forEach(([ang, len], i) => {
          const flick = Math.sin(t * 5 + i * 1.3) * 0.7;
          const tipX = Math.sin(ang) * len + quiver[i] + flick;
          const tipY = CLUMP_BASE_Y + bob - Math.cos(ang) * len;
          ctx.beginPath();
          ctx.moveTo(tipX - flick, tipY + 1.5);
          ctx.lineTo(tipX, tipY - 1.2);
          ctx.stroke();
        });
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
        // cold sheen pulsing over the clump
        ctx.globalAlpha = 0.1 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.8));
        ctx.fillStyle = "rgba(210,232,255,1)";
        ctx.beginPath();
        ctx.ellipse(-2, -2 + bob, 7, 9, 0, 0, Math.PI * 2);
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
