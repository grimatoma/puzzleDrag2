// Seasonal art for the OAK tree board tile.
//
// The same recognizable oak EVERY season (the trunk is constant; only the
// foliage shape changes — the recognized Tree exception). The seasons are made
// UNMISTAKABLE at a glance:
//   Spring  — fresh lime canopy DRESSED in pink/white BLOSSOM (a bloom cloud).
//   Summer  — peak deep-saturated lush green crown, full and round.
//   Autumn  — vivid FIRE colour (gold→orange→red) + a steady fall of leaves.
//   Winter  — bare dark wet branches under a REAL HEAVY SNOW LOAD on the limbs,
//             a hanging ICICLE, and a deep snow blanket on the pad.
//
// IDLE is two-tier: mostly at rest, then EVERY ~6 s a clearly-noticeable BIG
// CANOPY SWAY (~13 px lean-and-return), and EVERY ~18 s a RARE special: a small
// bird hops onto a branch, looks around, then flits off (~1.3 s) — except in
// autumn, where the special is instead a GUST that sends a flurry of leaves off
// the canopy. Both the common and rare actions are driven by a deterministic
// clock and return to the rest pose with ZERO velocity at the window edges
// (seamless).
//
// Origin-centered −24..+24 design box; the tree grows UPWARD (negative y) from a
// trunk base near y≈+20, ground pad at y≈+22. Reads at ~64 px.

import type { SeasonalTileEntry, SeasonalTransitionSet, SeasonName } from "../types.js";

// ── Math / clock helpers ─────────────────────────────────────────────────────

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function smoother(x: number): number {
  const c = clamp01(x);
  return c * c * c * (c * (6 * c - 15) + 10);
}

function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f;
}

// Deterministic action clock. Returns a phase in [0,1) WHILE inside the action
// window (length `win` seconds, repeating every `period`), or −1 at rest.
function actionQ(t: number, period: number, win: number, phase: number): number {
  const c = (((t + phase) % period) + period) % period;
  return c < win ? c / win : -1;
}

// A one-shot bell that rises from 0 to 1 and back to 0 over the window, with
// ZERO velocity at both ends (sin² is C¹-zero at 0 and 1). Used to envelope the
// big sway and the special action so they begin and end at the rest pose.
function bell(q: number): number {
  if (q < 0) return 0;
  const s = Math.sin(Math.PI * clamp01(q));
  return s * s;
}

// A signed lean: rises, peaks, returns — zero at q=0 and q=1 with zero velocity.
// (1−cos(2π q))/2 has zero value AND zero slope at both endpoints.)
function leanEnvelope(q: number): number {
  if (q < 0) return 0;
  return (1 - Math.cos(2 * Math.PI * clamp01(q))) * 0.5;
}

// ── Idle composition ─────────────────────────────────────────────────────────
//
// COMMON action: every ~6 s a BIG canopy sway — peak lean ≈ 13 px — over a ~1.0 s
//   window. RARE action: every ~18 s a ~1.3 s special.
const SWAY_PERIOD = 6.0;
const SWAY_WIN = 1.0;
const SWAY_AMP = 13; // peak horizontal canopy travel in design px

const SPECIAL_PERIOD = 18.0;
const SPECIAL_WIN = 1.3;

// The whole-canopy sway offset (design px) at time t. The two windows are phased
// apart so they don't collide; both return to 0 at their edges.
function swayAt(t: number): number {
  const q = actionQ(t, SWAY_PERIOD, SWAY_WIN, 0);
  // signed lean to the right then back; bold amplitude.
  return leanEnvelope(q) * SWAY_AMP * Math.sign(1); // direction: +x
}

// A gentle settle bob that accompanies the sway (small, seamless).
function bobAt(t: number): number {
  const q = actionQ(t, SWAY_PERIOD, SWAY_WIN, 0);
  return bell(q) * 1.6;
}

// ── Shared geometry (reused/adapted from oak.ts so it's the SAME oak) ─────────

function groundShadow(ctx: CanvasRenderingContext2D, rx = 16, alpha = 0.22): void {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(0, 22, rx, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function grassPad(ctx: CanvasRenderingContext2D, color: [number, number, number]): void {
  const [r, g, b] = color;
  const top = `rgb(${r},${g},${b})`;
  const bot = `rgb(${Math.round(r * 0.7)},${Math.round(g * 0.7)},${Math.round(b * 0.7)})`;
  const grad = ctx.createLinearGradient(0, 16, 0, 24);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bot);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 20, 18, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // a few tuft nicks along the top edge for a turfy read
  ctx.fillStyle = `rgb(${Math.min(255, r + 26)},${Math.min(255, g + 26)},${Math.min(255, b + 18)})`;
  for (let i = -14; i <= 14; i += 4) {
    ctx.beginPath();
    ctx.ellipse(i, 16.5, 1.6, 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// A single oak crown blob: layered dark-then-light for rounded volume.
function canopyBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  colors: [string, string, string],
  alpha = 1,
): void {
  if (r <= 0.3) return;
  const [dark, mid, light] = colors;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.18, r, r * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  const grad = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.2, x, y, r);
  grad.addColorStop(0, light);
  grad.addColorStop(0.55, mid);
  grad.addColorStop(1, dark);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.96, r * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = light;
  ctx.globalAlpha = alpha * 0.7;
  ctx.beginPath();
  ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.34, r * 0.28, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// The oak trunk + root flare — IDENTICAL geometry every season (the identity).
function trunk(ctx: CanvasRenderingContext2D, wet = false): void {
  const bark = wet ? "#3c2c1c" : "#6b4a26";
  const barkLight = wet ? "#5a4530" : "#8a6336";
  const barkDark = wet ? "#241a10" : "#4a3318";

  ctx.fillStyle = barkDark;
  ctx.beginPath();
  ctx.moveTo(-5.5, 20);
  ctx.quadraticCurveTo(-4, 6, -3, -2);
  ctx.lineTo(3, -2);
  ctx.quadraticCurveTo(4, 6, 5.5, 20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = bark;
  ctx.beginPath();
  ctx.moveTo(-4.6, 20);
  ctx.quadraticCurveTo(-3.2, 6, -2.4, -2);
  ctx.lineTo(2.4, -2);
  ctx.quadraticCurveTo(3.2, 6, 4.6, 20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = barkLight;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-4, 19);
  ctx.quadraticCurveTo(-2.8, 6, -2, -1);
  ctx.stroke();

  ctx.fillStyle = barkDark;
  ctx.beginPath();
  ctx.moveTo(-5.5, 20);
  ctx.quadraticCurveTo(-9, 19, -11, 20.5);
  ctx.quadraticCurveTo(-7, 20.5, -4.5, 19.5);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(5.5, 20);
  ctx.quadraticCurveTo(9, 19, 11, 20.5);
  ctx.quadraticCurveTo(7, 20.5, 4.5, 19.5);
  ctx.closePath();
  ctx.fill();
}

// Bare branch silhouette fanning up from the trunk top. `snowLoad` 0..1 piles a
// HEAVY snow load along the upper limbs (winter). `sway` bends the limbs.
const BRANCHES: Array<[number, number, number, number, number]> = [
  // [ctrlX, ctrlY, tipX, tipY, width]
  [-6, -6, -13, -16, 2.6],
  [-2, -10, -6, -22, 2.2],
  [3, -10, 6, -23, 2.4],
  [7, -6, 14, -15, 2.6],
  [0, -8, 1, -24, 2.0],
  [-9, -3, -16, -8, 2.0],
  [9, -3, 17, -7, 2.0],
];

function branchSilhouette(
  ctx: CanvasRenderingContext2D,
  color: string,
  sway: number,
  snowLoad: number,
): void {
  ctx.lineCap = "round";
  BRANCHES.forEach(([cx, cy, tx, ty, w]) => {
    const s = sway * (0.4 + Math.abs(tx) / 24);
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.quadraticCurveTo(cx + s * 0.5, cy, tx + s, ty);
    ctx.stroke();
    ctx.lineWidth = w * 0.55;
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.5, cy);
    ctx.lineTo(cx + s * 0.5 + (tx < 0 ? -4 : 4), cy - 5);
    ctx.stroke();
  });

  // HEAVY snow load: a thick white ridge riding along the top of each limb, from
  // the trunk fork out to the tip. Drawn as a stroked highlight over a fat base.
  if (snowLoad > 0.01) {
    BRANCHES.forEach(([cx, cy, tx, ty, w], idx) => {
      const s = sway * (0.4 + Math.abs(tx) / 24);
      const load = snowLoad;
      // fat snow base sitting on the upper side of the limb (offset up a touch)
      ctx.strokeStyle = "#dfe9f6";
      ctx.lineWidth = (w + 3.4) * load;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, -3.0);
      ctx.quadraticCurveTo(cx + s * 0.5, cy - 1.6, tx + s, ty - 1.4);
      ctx.stroke();
      // bright crown on top of the snow
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = (w + 1.0) * load;
      ctx.beginPath();
      ctx.moveTo(0, -3.4);
      ctx.quadraticCurveTo(cx + s * 0.5, cy - 2.2, tx + s, ty - 2.0);
      ctx.stroke();
      // a plump snow clump on the limb tip
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(tx + s, ty - 1.6, (2.8 + (idx % 2) * 0.8) * load, (1.9 + (idx % 2) * 0.4) * load, (tx < 0 ? -0.5 : 0.5), 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.lineCap = "butt";
}

// A single small bird (front-¾) used by the rare special. Drawn at the given
// branch anchor; `hop` is its vertical hop offset (px, ≤0 = up), `look` rotates
// the head, `wing` opens the wing for the flit-off. Colors locked (robin-ish).
function bird(
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
  ctx.fillStyle = "#5a4636";
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.2, 3.2, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // warm breast
  ctx.fillStyle = "#d2693a";
  ctx.beginPath();
  ctx.ellipse(-1.4, 0.6, 2.4, 2.2, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // tail
  ctx.fillStyle = "#46362a";
  ctx.beginPath();
  ctx.moveTo(3.4, -0.4);
  ctx.lineTo(7.2, -1.8);
  ctx.lineTo(6.6, 1.2);
  ctx.closePath();
  ctx.fill();
  // wing (opens during flit-off)
  ctx.save();
  ctx.translate(0.6, -0.4);
  ctx.rotate(-0.5 * wing);
  ctx.fillStyle = "#3d2f24";
  ctx.beginPath();
  ctx.ellipse(0, 0, 3.2 + wing * 2.0, 1.8 + wing * 1.2, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // head (looks around)
  ctx.save();
  ctx.translate(-3.4, -2.4);
  ctx.rotate(look);
  ctx.fillStyle = "#5a4636";
  ctx.beginPath();
  ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
  ctx.fill();
  // beak
  ctx.fillStyle = "#e2b23a";
  ctx.beginPath();
  ctx.moveTo(-2.2, 0.2);
  ctx.lineTo(-4.4, -0.2);
  ctx.lineTo(-2.2, 1.0);
  ctx.closePath();
  ctx.fill();
  // eye
  ctx.fillStyle = "#0e0a06";
  ctx.beginPath();
  ctx.arc(-0.6, -0.4, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

// ── Season parameter sets (for the spring blossom + autumn fire ramp etc.) ────

// ════════════════════════════ SPRING ═════════════════════════════════════════
// Fresh lime crown DRESSED in bold pink/white blossom — unmistakably spring.

const SPRING_BLOBS: Array<[number, number, number]> = [
  [0, -16, 10.5],
  [-9, -13, 7],
  [9, -13, 7],
  [-6, -21, 6],
  [6, -21, 6],
  [0, -24, 5.5],
  [-13, -9, 5],
  [13, -9, 5],
  [0, -10, 6.5],
];

// Blossom puff anchors riding on the crown (pink/white clouds).
const BLOSSOMS: Array<[number, number, number]> = [
  [-7, -22, 3.4],
  [4, -24, 3.0],
  [11, -15, 3.0],
  [-13, -12, 2.8],
  [-2, -18, 2.6],
  [8, -11, 2.6],
  [0, -27, 2.4],
];

function springOak(ctx: CanvasRenderingContext2D, sway: number, bob: number, _bloom: number): void {
  groundShadow(ctx, 15, 0.2);
  grassPad(ctx, [120, 196, 86]); // bright dewy lime
  ctx.save();
  ctx.translate(0, bob);
  trunk(ctx, false);

  const fresh: [string, string, string] = ["#3f6e1f", "#6cb02f", "#a8e25a"];
  SPRING_BLOBS.forEach(([x, y, r]) => {
    const s = sway * (0.5 + Math.abs(x) / 22);
    canopyBlob(ctx, x + s, y, r, fresh, 1);
  });

  // BOLD blossom puffs — pink with white highlight, resting on the crown.
  BLOSSOMS.forEach(([x, y, r], i) => {
    const s = sway * (0.5 + Math.abs(x) / 22);
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "#f49ac2";
    ctx.beginPath();
    ctx.ellipse(x + s, y, r, r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd9ea";
    ctx.beginPath();
    ctx.ellipse(x + s - r * 0.3, y - r * 0.3, r * 0.45, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // a few white petal dots
    ctx.fillStyle = "#fff4fa";
    for (let k = 0; k < 3; k++) {
      const a = i * 1.6 + k * 2.1;
      ctx.beginPath();
      ctx.arc(x + s + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  // a couple of fallen pink petals resting on the pad
  ctx.fillStyle = "#f4a8c8";
  [[-6, 21], [7, 22]].forEach(([fx, fy]) => {
    ctx.beginPath();
    ctx.ellipse(fx, fy, 1.8, 1.0, 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

// ════════════════════════════ SUMMER ═════════════════════════════════════════
// Peak deep-saturated lush green crown — full and round.

const SUMMER_BLOBS: Array<[number, number, number]> = [
  [0, -16, 11.5],
  [-9.5, -13, 8],
  [9.5, -13, 8],
  [-6, -21, 7],
  [6, -21, 7],
  [0, -24, 6.5],
  [-13, -10, 5],
  [13, -10, 5],
  [0, -11.5, 6.5],
];

function summerOak(ctx: CanvasRenderingContext2D, sway: number, bob: number): void {
  groundShadow(ctx, 16, 0.24);
  grassPad(ctx, [70, 158, 60]); // saturated mid-green
  ctx.save();
  ctx.translate(0, bob);
  trunk(ctx, false);

  const green: [string, string, string] = ["#1f4a12", "#357f1f", "#73c23a"];
  SUMMER_BLOBS.forEach(([x, y, r]) => {
    const s = sway * (0.5 + Math.abs(x) / 24);
    canopyBlob(ctx, x + s, y, r, green, 1);
  });
  // bright top-left highlight flecks
  ctx.fillStyle = "rgba(150,220,90,0.55)";
  [[-8, -23, 2.2], [-2, -20, 1.7], [-12, -14, 1.9]].forEach(([fx, fy, r]) => {
    ctx.beginPath();
    ctx.arc(fx + sway * 0.4, fy, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

// ════════════════════════════ AUTUMN ═════════════════════════════════════════
// Vivid FIRE colour (gold→orange→red) + a steady fall of leaves.

const AUTUMN_BLOBS: Array<[number, number, number, number]> = [
  [0, -16, 11, 0.5],
  [-9.5, -13, 7.5, 0.15],
  [9.5, -13, 7.5, 0.9],
  [-6, -21, 6.5, 0.35],
  [6, -21, 6.5, 0.75],
  [0, -24, 6, 0.25],
  [-13.5, -9, 5.5, 1.0],
  [13.5, -9, 5.5, 0.05],
  [0, -10, 7, 0.6],
];

// Bold fire ramp: 0=gold, 0.5=orange, 1=red.
function autumnColors(hue: number): [string, string, string] {
  const stops: Array<[number, [number, number, number]]> = [
    [0, [240, 184, 36]], // bright gold
    [0.5, [226, 104, 20]], // vivid orange
    [1, [196, 40, 30]], // fire red
  ];
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  const h = clamp01(hue);
  for (let i = 0; i < stops.length - 1; i++) {
    if (h >= stops[i][0] && h <= stops[i + 1][0]) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const span = hi[0] - lo[0] || 1;
  const f = (h - lo[0]) / span;
  const r = lerp(lo[1][0], hi[1][0], f);
  const g = lerp(lo[1][1], hi[1][1], f);
  const b = lerp(lo[1][2], hi[1][2], f);
  const dark = `rgb(${Math.round(r * 0.5)},${Math.round(g * 0.42)},${Math.round(b * 0.4)})`;
  const mid = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  const light = `rgb(${Math.min(255, Math.round(r * 1.22))},${Math.min(255, Math.round(g * 1.2))},${Math.min(255, Math.round(b * 1.15))})`;
  return [dark, mid, light];
}

// `fall` 0..1 drives the steady ambient leaf-fall; `gust` 0..1 adds a flurry
// blown OFF the canopy (the rare autumn special).
function autumnOak(
  ctx: CanvasRenderingContext2D,
  sway: number,
  bob: number,
  fall: number,
  gust: number,
): void {
  groundShadow(ctx, 15, 0.24);
  grassPad(ctx, [150, 128, 64]); // olive-tan browning grass
  ctx.save();
  ctx.translate(0, bob);
  trunk(ctx, false);

  AUTUMN_BLOBS.forEach(([x, y, r, hue]) => {
    const s = sway * (0.5 + Math.abs(x) / 24);
    canopyBlob(ctx, x + s, y, r, autumnColors(hue), 1);
  });
  ctx.restore();

  // Steady ambient drift — 3 leaves spiralling from canopy to pad (seamless loop).
  const drifters: Array<[number, number, number, number]> = [
    [-7, 0.25, 0.0, 6],
    [9, 0.85, 0.4, 5],
    [2, 0.55, 0.72, 5.5],
  ];
  drifters.forEach(([sx, hue, phase, amp]) => {
    const prog = (((fall + phase) % 1) + 1) % 1;
    const ly = -8 + prog * 28;
    const lx = sx + Math.sin(prog * Math.PI * 2 + phase * 6) * amp;
    ctx.save();
    ctx.fillStyle = autumnColors(hue)[1];
    ctx.translate(lx, ly);
    ctx.rotate(prog * Math.PI * 3 + phase * 4);
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.8, 3.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // RARE special: a GUST that lifts a flurry of leaves OFF the canopy and blows
  // them up-and-right, fading out. Amplitude 0 at gust=0 and gust=1 (uses bell).
  if (gust > 0.001) {
    const burst = bell(gust); // 0 at ends
    const flurry: Array<[number, number, number]> = [
      [-10, -16, 0.2],
      [-3, -22, 0.6],
      [5, -20, 0.85],
      [11, -14, 0.4],
      [-6, -12, 0.95],
      [1, -25, 0.5],
    ];
    flurry.forEach(([fx, fy, hue], i) => {
      const travel = burst; // 0..~1..0
      const lx = fx + travel * (14 + i * 1.5) + Math.sin(gust * Math.PI * 4 + i) * 2;
      const ly = fy - travel * (8 + i) ;
      ctx.save();
      ctx.globalAlpha = burst * 0.95;
      ctx.fillStyle = autumnColors(hue)[1];
      ctx.translate(lx, ly);
      ctx.rotate(gust * Math.PI * 6 + i);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.8, 3.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // a couple of fallen leaves resting on the pad
  ctx.save();
  ctx.fillStyle = autumnColors(0.55)[1];
  [[-7, 21], [5, 22]].forEach(([fx, fy]) => {
    ctx.beginPath();
    ctx.ellipse(fx, fy, 2.4, 1.3, 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ════════════════════════════ WINTER ═════════════════════════════════════════
// Bare dark wet branches under a HEAVY snow load + an icicle + deep snow pad.

function winterPad(ctx: CanvasRenderingContext2D, sheen: number): void {
  const snow = ctx.createLinearGradient(0, 15, 0, 24);
  snow.addColorStop(0, "#f3f8ff");
  snow.addColorStop(1, "#bcccdf");
  ctx.fillStyle = snow;
  ctx.beginPath();
  ctx.ellipse(0, 20, 18.5, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // a couple of snow mounds at the base for a deep-blanket read
  ctx.fillStyle = "#ffffff";
  [[-8, 19, 5], [7, 20, 4.5], [0, 21, 6]].forEach(([mx, my, mr]) => {
    ctx.beginPath();
    ctx.ellipse(mx, my, mr, mr * 0.5, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = `rgba(200,224,255,${0.16 + clamp01(sheen) * 0.16})`;
  ctx.beginPath();
  ctx.ellipse(-3, 19, 10, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function icicle(ctx: CanvasRenderingContext2D, x: number, y: number, len: number): void {
  ctx.save();
  const g = ctx.createLinearGradient(x, y, x, y + len);
  g.addColorStop(0, "rgba(220,238,255,0.95)");
  g.addColorStop(1, "rgba(255,255,255,0.65)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 1.2, y);
  ctx.lineTo(x + 1.2, y);
  ctx.lineTo(x, y + len);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function winterOak(
  ctx: CanvasRenderingContext2D,
  sway: number,
  bob: number,
  flakes: Array<[number, number, number]>,
  sheen: number,
): void {
  groundShadow(ctx, 16, 0.18);
  winterPad(ctx, sheen);

  ctx.save();
  ctx.translate(0, bob);
  trunk(ctx, true);
  branchSilhouette(ctx, "#2b1f13", sway, 1); // FULL heavy snow load
  // a hanging icicle off a low-left limb (rides with the sway)
  icicle(ctx, -8 + sway * 0.6, -8.5, 5.5);
  icicle(ctx, 6 + sway * 0.4, -5.5, 4.0);
  ctx.restore();

  // drifting snowflakes
  ctx.fillStyle = "#ffffff";
  flakes.forEach(([fx, fy, r]) => {
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ── Per-season draw + anim ───────────────────────────────────────────────────
//
// The rare special (bird-hop) is shared by Spring/Summer/Winter; Autumn uses the
// leaf-gust instead. The bird perches on a left branch, looks around, then opens
// its wing and flits up-and-off, fully gone by the window edge.

function birdSpecial(ctx: CanvasRenderingContext2D, q: number): void {
  if (q < 0) return;
  // q in [0,1] across the ~1.3 s window.
  // Phase 1 (0..0.25): land (drop in, alpha up). Phase 2 (0.25..0.7): perch,
  // look around. Phase 3 (0.7..1): flit off (rise + fade + wing open).
  const anchorX = -9;
  const anchorY = -15;
  let hop = 0;
  let look = 0;
  let wing = 0;
  let alpha: number;
  let dx = 0;
  let dy = 0;
  if (q < 0.25) {
    const f = q / 0.25;
    alpha = smoother(f);
    dy = -10 * (1 - smoother(f)); // drops down onto the branch from above
    hop = -2 * Math.sin(f * Math.PI); // little hop on landing
  } else if (q < 0.7) {
    const f = (q - 0.25) / 0.45;
    alpha = 1;
    // two little look-arounds + a tiny hop
    look = Math.sin(f * Math.PI * 2) * 0.5;
    hop = -2.0 * Math.abs(Math.sin(f * Math.PI * 2));
  } else {
    const f = (q - 0.7) / 0.3;
    alpha = 1 - smoother(f); // fades as it leaves → gone by q=1
    wing = Math.abs(Math.sin(f * Math.PI * 3)); // flapping
    dx = -10 * smoother(f); // flits up-and-left, ~13px travel total
    dy = -13 * smoother(f);
    look = -0.3;
  }
  bird(ctx, anchorX + dx, anchorY + dy, hop, look, wing, alpha);
}

function drawOakSpring(ctx: CanvasRenderingContext2D): void {
  springOak(ctx, 0, 0, 0);
}
function animOakSpring(ctx: CanvasRenderingContext2D, t: number): void {
  springOak(ctx, swayAt(t), bobAt(t), 0);
  birdSpecial(ctx, actionQ(t, SPECIAL_PERIOD, SPECIAL_WIN, SPECIAL_PERIOD / 2));
}

function drawOakSummer(ctx: CanvasRenderingContext2D): void {
  summerOak(ctx, 0, 0);
}
function animOakSummer(ctx: CanvasRenderingContext2D, t: number): void {
  summerOak(ctx, swayAt(t), bobAt(t));
  birdSpecial(ctx, actionQ(t, SPECIAL_PERIOD, SPECIAL_WIN, SPECIAL_PERIOD / 2));
}

function drawOakAutumn(ctx: CanvasRenderingContext2D): void {
  // rest pose: ambient fall frozen at 0.25, no gust.
  autumnOak(ctx, 0, 0, 0.25, 0);
}
function animOakAutumn(ctx: CanvasRenderingContext2D, t: number): void {
  const fall = (t * 0.22) % 1; // steady ambient drift
  const gust = actionQ(t, SPECIAL_PERIOD, SPECIAL_WIN, SPECIAL_PERIOD / 2);
  autumnOak(ctx, swayAt(t), bobAt(t), fall, gust < 0 ? 0 : gust);
}

function drawOakWinter(ctx: CanvasRenderingContext2D): void {
  winterOak(
    ctx,
    0,
    0,
    [
      [-9, -14, 1.3],
      [6, -4, 1.1],
      [12, -18, 1.0],
      [-3, 6, 1.2],
    ],
    0.4,
  );
}
function animOakWinter(ctx: CanvasRenderingContext2D, t: number): void {
  const sway = swayAt(t) * 0.7; // bare limbs are stiffer
  const bob = bobAt(t) * 0.6;
  const span = 36;
  const seeds: Array<[number, number, number]> = [
    [-9, 1.3, 0.0],
    [6, 1.1, 0.45],
    [12, 1.0, 0.7],
    [-3, 1.2, 0.25],
  ];
  const flakes: Array<[number, number, number]> = seeds.map(([fx, r, phase]) => {
    const prog = (((t / 4.2 + phase) % 1) + 1) % 1;
    const fy = -24 + prog * span;
    const driftX = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
    return [driftX, fy, r];
  });
  const sheen = 0.5 - 0.5 * Math.cos(t * 0.5);
  winterOak(ctx, sway, bob, flakes, sheen);
  birdSpecial(ctx, actionQ(t, SPECIAL_PERIOD, SPECIAL_WIN, SPECIAL_PERIOD / 2));
}

// ── Transitions (seamless: transition(0)≡draw(from), transition(1)≡draw(to)) ──
//
// Each transition draws the FROM still, crossfades the TO still in, and adds a
// short transient that is zero at both ends. The endpoints are exact because at
// p=0 only the from-still is drawn (to weight 0) and at p=1 only the to-still.

// 0: Spring → Summer — crown deepens green, blossom is shed.
function springToSummer(ctx: CanvasRenderingContext2D, p: number): void {
  const q = clamp01(p);
  const w = smoother(q);
  if (1 - w > 0.001) {
    ctx.save();
    ctx.globalAlpha = 1 - w;
    springOak(ctx, 0, 0, 0);
    ctx.restore();
  }
  if (w > 0.001) {
    ctx.save();
    ctx.globalAlpha = w;
    summerOak(ctx, 0, 0);
    ctx.restore();
  }
  // transient: a few blossom petals lift off mid-morph (0 at both ends)
  const burst = bell(q);
  if (burst > 0.01) {
    ctx.save();
    ctx.fillStyle = "#f4a8c8";
    [[-7, -20], [4, -22], [10, -13]].forEach(([sx, sy], i) => {
      ctx.save();
      ctx.globalAlpha = burst * 0.9;
      ctx.translate(sx + burst * (4 + i * 2), sy - burst * 6 + Math.sin(q * Math.PI * 4 + i) * 1.5);
      ctx.rotate(q * Math.PI * 3 + i);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.6, 1.0, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// 1: Summer → Autumn — green sweeps to fire colour; leaves begin detaching.
function summerToAutumn(ctx: CanvasRenderingContext2D, p: number): void {
  const q = clamp01(p);
  const w = smoother(q);
  if (1 - w > 0.001) {
    ctx.save();
    ctx.globalAlpha = 1 - w;
    summerOak(ctx, 0, 0);
    ctx.restore();
  }
  if (w > 0.001) {
    ctx.save();
    ctx.globalAlpha = w;
    // autumn still at its rest pose (fall=0.25, no gust)
    autumnOak(ctx, 0, 0, 0.25, 0);
    ctx.restore();
  }
  // transient: 2 edge leaves lift and flutter outward (0 at both ends)
  const burst = bell(q);
  if (burst > 0.01) {
    const leaves: Array<[number, number, number]> = [
      [-12, -14, 0.3],
      [13, -12, 0.85],
    ];
    leaves.forEach(([sx, sy, hue], i) => {
      ctx.save();
      ctx.globalAlpha = burst;
      ctx.fillStyle = autumnColors(hue)[1];
      ctx.translate(sx + (sx < 0 ? -1 : 1) * burst * 4, sy + burst * 2 - Math.abs(Math.sin(q * Math.PI * 4 + i)) * 2);
      ctx.rotate(Math.sin(q * Math.PI * 3 + i) * 0.8);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.7, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
  ctx.globalAlpha = 1;
}

// 2: Autumn → Winter (showpiece) — leaves FALL off the canopy as branches go bare
// and the heavy snow load + icicle + snow pad settle in.
function autumnToWinter(ctx: CanvasRenderingContext2D, p: number): void {
  const q = clamp01(p);
  const w = smoother(q);
  // FROM: autumn still, dropping/shrinking as it sheds (fades with w).
  if (1 - w > 0.003) {
    ctx.save();
    ctx.globalAlpha = 1 - w;
    autumnOak(ctx, 0, w * 4, 0.25, 0); // drops a touch as it sheds
    ctx.restore();
  }
  // TO: winter still, settling in (fades in with w).
  if (w > 0.001) {
    ctx.save();
    ctx.globalAlpha = w;
    winterOak(
      ctx,
      0,
      0,
      [
        [-9, -14, 1.3],
        [6, -4, 1.1],
        [12, -18, 1.0],
        [-3, 6, 1.2],
      ],
      0.4,
    );
    ctx.restore();
  }
  // transient showpiece: 3 leaves released in sequence, flutter down & gone by q=1.
  const fallers: Array<[number, number, number, number]> = [
    [-11, -13, 0.08, 0.3],
    [12, -11, 0.30, 0.85],
    [3, -17, 0.52, 0.55],
  ];
  fallers.forEach(([sx, sy, spawnQ, hue], i) => {
    const span = 0.9 - spawnQ;
    if (q <= spawnQ || span <= 0) return;
    const prog = clamp01((q - spawnQ) / span);
    if (prog >= 1) return;
    const ly = sy + prog * (30 - sy);
    const flutter = Math.sin(prog * Math.PI * 5 + i) * (1 - prog) * 4;
    const lx = sx + flutter + (sx < 0 ? -1 : 1) * prog * 2;
    ctx.save();
    ctx.globalAlpha = (1 - prog) * 0.95;
    ctx.fillStyle = autumnColors(hue)[1];
    ctx.translate(lx, ly);
    ctx.rotate(prog * Math.PI * 3 + i);
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.8, 3.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  ctx.globalAlpha = 1;
}

export const VARIANTS: SeasonalTileEntry = {
  Spring: { draw: drawOakSpring, anim: animOakSpring },
  Summer: { draw: drawOakSummer, anim: animOakSummer },
  Autumn: { draw: drawOakAutumn, anim: animOakAutumn },
  Winter: { draw: drawOakWinter, anim: animOakWinter },
};

export const TRANSITIONS: SeasonalTransitionSet = {
  0: springToSummer,
  1: summerToAutumn,
  2: autumnToWinter,
};

// Reference the SeasonName type to keep the strict-tsc import meaningful and to
// document that the keys above are exhaustive over the season set.
const _SEASON_KEYS: SeasonName[] = ["Spring", "Summer", "Autumn", "Winter"];
void _SEASON_KEYS;
