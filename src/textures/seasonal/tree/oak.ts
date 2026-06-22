// Seasonal art for the OAK tree board tile.
//
// Four full-art redraws tracing a believable oak lifecycle:
//   Spring  — bare-ish to budding oak: brown trunk + a few main branches,
//             small fresh yellow-green leaf clusters and tiny catkin dots.
//   Summer  — full lush rounded green crown over a sturdy brown trunk.
//   Autumn  — same crown silhouette turned to golds/oranges/russets, thinning
//             with gaps, a couple of acorns, a leaf or two drifting down.
//   Winter  — bare dark wet trunk + branching silhouette, snow caps on the
//             upper branches and a snow blanket on the ground pad.
//
// Each draw is origin-centered in the ~-24..+24 design box; the tree grows
// UPWARD (negative y) from a trunk base near y≈+20, ground pad at y≈+22.
// Animations are deterministic (sin/cos/modulo of `t` in seconds), seamless,
// and subtle — the board sprite supplies its own sway rotation, so these avoid
// large rotations and lean on internal canopy shimmer, gentle branch sway,
// leaf flutter, drifting leaves and snowflakes.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";

// ── Motion helpers (motion-v2) ───────────────────────────────────────────────
//
// MOTION-V2 idles are SLOW, eased gestures: a broad canopy SWAY as a breeze
// passes through, on a ~5–6 s seamless loop. The subject's bob/sway must read
// as a readable lean, not a twitch.
//
// `clamp01` keeps `p` in range; `smoother` is the quintic smoothstep used to
// ease staged morphs; `bobAt`/`swayAt` are the canonical idle primitives.

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function smoother(x: number): number {
  const c = clamp01(x);
  return c * c * c * (c * (6 * c - 15) + 10);
}

// Idle angular frequency: ~5.5 s loop (was ~4.8 s at 1.3 rad/s; halved to ~0.65
// rad/s for the canopy sway, giving a slow, legible breeze gesture).
const IDLE_W = 0.66; // rad/s → period 2π/0.66 ≈ 9.5 s for one full sin cycle…
// …but the broad sway uses a (1−cos) GESTURE envelope that completes its visible
// lean-and-return inside ~5.5 s. See `breezeAt`.

// A slow breeze gesture in design px: rises smoothly from rest, leans, returns —
// position AND velocity are 0 at t=0 (`A*(1−cos(w t))/2`), and it loops
// seamlessly. Amplitude `A` is the peak lean offset.
function breezeAt(t: number, w: number, amp: number): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// A small subject bob (vertical settle): 0 with zero velocity at t=0, seamless.
function bobAt(t: number, w: number, amp: number): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// Per-leaf shimmer: a slow eased twinkle that NEVER reads as a flash on the
// subject — used only for tiny dressing flecks. Returns 0..1, smooth & seamless.
function shimmerAt(t: number, w: number, phase: number): number {
  return 0.5 - 0.5 * Math.cos(w * t + phase);
}

// ── Shared helpers ─────────────────────────────────────────────────────────

function groundShadow(ctx: CanvasRenderingContext2D, rx = 16, alpha = 0.22): void {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(0, 22, rx, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

// A single oak crown blob: layered dark-then-light for rounded volume, with a
// lighter top-left highlight. `colors` is [dark, mid, light].
function canopyBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  colors: [string, string, string],
  alpha = 1,
): void {
  const [dark, mid, light] = colors;
  ctx.save();
  ctx.globalAlpha = alpha;
  // dark underside pass for depth
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.18, r, r * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  // mid body, lifted up-left
  const grad = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.2, x, y, r);
  grad.addColorStop(0, light);
  grad.addColorStop(0.55, mid);
  grad.addColorStop(1, dark);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.96, r * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();
  // bright top-left highlight nub
  ctx.fillStyle = light;
  ctx.globalAlpha = alpha * 0.7;
  ctx.beginPath();
  ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.34, r * 0.28, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// The oak trunk + a couple of main branch limbs. `wet` darkens it for winter.
function trunk(ctx: CanvasRenderingContext2D, wet = false): void {
  const bark = wet ? "#3c2c1c" : "#6b4a26";
  const barkLight = wet ? "#5a4530" : "#8a6336";
  const barkDark = wet ? "#241a10" : "#4a3318";

  // trunk body — tapering from a wide base, slight S
  ctx.fillStyle = barkDark;
  ctx.beginPath();
  ctx.moveTo(-5.5, 20);
  ctx.quadraticCurveTo(-4, 6, -3, -2);
  ctx.lineTo(3, -2);
  ctx.quadraticCurveTo(4, 6, 5.5, 20);
  ctx.closePath();
  ctx.fill();
  // mid bark
  ctx.fillStyle = bark;
  ctx.beginPath();
  ctx.moveTo(-4.6, 20);
  ctx.quadraticCurveTo(-3.2, 6, -2.4, -2);
  ctx.lineTo(2.4, -2);
  ctx.quadraticCurveTo(3.2, 6, 4.6, 20);
  ctx.closePath();
  ctx.fill();
  // lit left edge
  ctx.strokeStyle = barkLight;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-4, 19);
  ctx.quadraticCurveTo(-2.8, 6, -2, -1);
  ctx.stroke();

  // root flare at the base
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

// Bare branch silhouette fanning up from the trunk top (used in spring base &
// winter). `snow` adds snow caps on the upper limbs. Returns nothing.
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
  snow: boolean,
): void {
  ctx.lineCap = "round";
  BRANCHES.forEach(([cx, cy, tx, ty, w], i) => {
    const s = sway * (0.4 + Math.abs(tx) / 24);
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.quadraticCurveTo(cx + s * 0.5, cy, tx + s, ty);
    ctx.stroke();
    // a small forking twig near the tip
    ctx.lineWidth = w * 0.55;
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.5, cy);
    ctx.lineTo(cx + s * 0.5 + (tx < 0 ? -4 : 4), cy - 5);
    ctx.stroke();
    if (snow) {
      // snow cap riding on top of each upper limb tip
      ctx.fillStyle = "#f4f8ff";
      ctx.beginPath();
      ctx.ellipse(tx + s, ty - 0.5, 2.6 + (i % 2) * 0.6, 1.5, (tx < 0 ? -0.5 : 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.lineCap = "butt";
}

// ── Spring: budding oak ──────────────────────────────────────────────────────

// Spring leaf-cluster anchor points (around the upper branch tips). The airy
// crown is built from small clusters, not a solid mass.
const SPRING_CLUSTERS: Array<[number, number, number]> = [
  // [x, y, r]
  [-12, -15, 4],
  [-5, -20, 4.5],
  [4, -21, 4.5],
  [13, -14, 4],
  [0, -10, 3.5],
  [-15, -8, 3],
  [16, -7, 3],
];

function springOak(
  ctx: CanvasRenderingContext2D,
  sway: number,
  bob: number,
  budPulse: number,
): void {
  groundShadow(ctx, 14, 0.2);
  ctx.save();
  ctx.translate(0, bob); // whole tree settles a touch with the breeze
  trunk(ctx, false);
  branchSilhouette(ctx, "#5a3d20", sway, false);

  const fresh: [string, string, string] = ["#5a7d24", "#86b53a", "#c0e26a"];
  SPRING_CLUSTERS.forEach(([x, y, r]) => {
    const s = sway * (0.3 + Math.abs(x) / 28);
    canopyBlob(ctx, x + s, y, r, fresh, 0.9);
  });

  // tiny fresh leaflet dots scattered for an airy budding look
  ctx.fillStyle = "#a6e06a";
  SPRING_CLUSTERS.forEach(([x, y, r], i) => {
    const s = sway * (0.3 + Math.abs(x) / 28);
    for (let k = 0; k < 3; k++) {
      const a = i * 1.7 + k * 2.1;
      ctx.beginPath();
      ctx.ellipse(x + s + Math.cos(a) * r, y + Math.sin(a) * r, 1.4, 2.2, a, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // tiny catkin / blossom dots emerging — pale shimmer with the bud pulse
  const buds: Array<[number, number]> = [
    [-8, -18], [6, -19], [-2, -14], [11, -12], [-13, -11],
  ];
  buds.forEach(([bx, by], i) => {
    const a = 0.5 + 0.45 * shimmerAt(budPulse, 1, i * 1.3);
    ctx.fillStyle = `rgba(232,224,150,${a})`;
    ctx.beginPath();
    ctx.arc(bx + sway * 0.2, by, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawOakSpring(ctx: CanvasRenderingContext2D): void {
  // rest pose: budPulse=0 ⇒ shimmer=0 ⇒ bud alpha = 0.5 (matches transition end)
  springOak(ctx, 0, 0, 0);
}

function animOakSpring(ctx: CanvasRenderingContext2D, t: number): void {
  // Slow broad canopy sway as a breeze passes through (~5.5 s gesture loop) plus
  // a gentle settle bob; buds twinkle on a slow eased shimmer. All components are
  // 0 with zero velocity at t=0.
  const sway = breezeAt(t, IDLE_W, 2.2);
  const bob = bobAt(t, IDLE_W, 0.5);
  springOak(ctx, sway, bob, t * IDLE_W);
}

// ── Summer: full lush green crown ────────────────────────────────────────────

// Summer crown blobs — overlapping to form a classic rounded oak crown.
const SUMMER_BLOBS: Array<[number, number, number]> = [
  // [x, y, r]
  [0, -16, 11],
  [-9, -13, 7.5],
  [9, -13, 7.5],
  [-6, -21, 6.5],
  [6, -21, 6.5],
  [0, -24, 6],
  [-13, -9, 5.5],
  [13, -9, 5.5],
  [0, -10, 7],
];

function summerOak(
  ctx: CanvasRenderingContext2D,
  sway: number,
  bob: number,
  shimmer: number,
): void {
  groundShadow(ctx, 16, 0.22);
  ctx.save();
  ctx.translate(0, bob);

  // All shimmer terms below are written RELATIVE to their value at shimmer=0, so
  // the rest pose (draw(Summer), shimmer=0) has ZERO shimmer offset and matches
  // transition endpoints exactly, while staying a smooth seamless idle.
  const green: [string, string, string] = ["#2f5418", "#4f8a2a", "#86bf48"];
  SUMMER_BLOBS.forEach(([x, y, r], i) => {
    // broad lean + a tiny per-blob shimmer travelling across the crown
    const sh = shimmerAt(shimmer, 1, i) - shimmerAt(0, 1, i); // 0 at shimmer=0
    const s = sway * (0.25 + Math.abs(x) / 26) + sh * 0.7;
    canopyBlob(ctx, x + s, y, r, green, 1);
  });

  // a few shimmering highlight flecks on the top-left of the crown (eased twinkle)
  ctx.fillStyle = `rgba(190,230,140,${0.4 + 0.3 * shimmerAt(shimmer, 1, 0)})`;
  [[-7, -22, 2], [-2, -19, 1.6], [-11, -14, 1.8]].forEach(([fx, fy, r]) => {
    ctx.beginPath();
    ctx.arc(fx + sway * 0.3, fy, r, 0, Math.PI * 2);
    ctx.fill();
  });

  // one stray leaf shimmering at the lower-right edge — drifts on a slow eased
  // figure, anchored so it sits at its rest spot (15,-6, rot 0) at shimmer=0.
  const flx = 15 + (shimmerAt(shimmer, 0.8, 0) - shimmerAt(0, 0.8, 0)) * 3;
  const fly = -6 + (shimmerAt(shimmer, 1.1, Math.PI / 2) - shimmerAt(0, 1.1, Math.PI / 2)) * 2.4;
  ctx.fillStyle = "#4f8a2a";
  ctx.save();
  ctx.translate(flx, fly);
  ctx.rotate((shimmerAt(shimmer, 1, 0) - shimmerAt(0, 1, 0)) * 0.6);
  ctx.beginPath();
  ctx.ellipse(0, 0, 1.6, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

function drawOakSummer(ctx: CanvasRenderingContext2D): void {
  summerOak(ctx, 0, 0, 0);
}

function animOakSummer(ctx: CanvasRenderingContext2D, t: number): void {
  // Slow broad sway as the breeze moves through the full crown (~5.5 s gesture)
  // plus a gentle settle bob and an internal shimmer travelling the canopy.
  const sway = breezeAt(t, IDLE_W, 2.0);
  const bob = bobAt(t, IDLE_W, 0.5);
  summerOak(ctx, sway, bob, t * IDLE_W);
}

// ── Autumn: golds / oranges / russets, thinning ──────────────────────────────

// Autumn uses the same crown silhouette but with gaps (a few summer blobs are
// dropped) and warm colours. `[x, y, r, hue]` — hue 0..1 picks a russet ramp.
const AUTUMN_BLOBS: Array<[number, number, number, number]> = [
  [0, -16, 10.5, 0.5],
  [-9, -13, 7, 0.2],
  [9, -13, 7, 0.8],
  [-6, -21, 6, 0.4],
  [6, -21, 6, 0.7],
  [0, -24, 5.5, 0.3],
  [-13, -9, 5, 0.9],
  [13, -9, 5, 0.1],
  [0, -10, 6.5, 0.6],
];

// Warm autumn colour ramp via explicit lerp so the palette stays clean.
function autumnColors(hue: number): [string, string, string] {
  // hue 0 = gold, 0.5 = orange, 1 = russet-red
  const stops: Array<[number, [number, number, number]]> = [
    [0, [216, 168, 48]], // gold
    [0.5, [196, 96, 24]], // orange
    [1, [150, 52, 28]], // russet
  ];
  function pick(h: number): [number, number, number] {
    let lo = stops[0];
    let hi = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (h >= stops[i][0] && h <= stops[i + 1][0]) {
        lo = stops[i];
        hi = stops[i + 1];
        break;
      }
    }
    const span = hi[0] - lo[0] || 1;
    const f = (h - lo[0]) / span;
    return [
      lo[1][0] + (hi[1][0] - lo[1][0]) * f,
      lo[1][1] + (hi[1][1] - lo[1][1]) * f,
      lo[1][2] + (hi[1][2] - lo[1][2]) * f,
    ];
  }
  const [r, g, b] = pick(Math.max(0, Math.min(1, hue)));
  const dark = `rgb(${Math.round(r * 0.55)},${Math.round(g * 0.45)},${Math.round(b * 0.4)})`;
  const mid = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  const light = `rgb(${Math.min(255, Math.round(r * 1.25))},${Math.min(255, Math.round(g * 1.25))},${Math.min(255, Math.round(b * 1.2))})`;
  return [dark, mid, light];
}

function acorns(ctx: CanvasRenderingContext2D): void {
  const spots: Array<[number, number]> = [[-4, -9], [7, -7]];
  spots.forEach(([ax, ay]) => {
    // cap
    ctx.fillStyle = "#6b4710";
    ctx.beginPath();
    ctx.ellipse(ax, ay, 2.2, 1.4, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    // nut
    ctx.fillStyle = "#b5762a";
    ctx.beginPath();
    ctx.ellipse(ax, ay + 1.6, 1.8, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,235,180,0.5)";
    ctx.beginPath();
    ctx.arc(ax - 0.6, ay + 1, 0.6, 0, Math.PI * 2);
    ctx.fill();
  });
}

function autumnOak(
  ctx: CanvasRenderingContext2D,
  sway: number,
  bob: number,
  fall: number,
): void {
  groundShadow(ctx, 15, 0.22);
  ctx.save();
  ctx.translate(0, bob);
  trunk(ctx, false);

  // thinning crown — skip blob index 5 (the very top) to show a gap
  AUTUMN_BLOBS.forEach(([x, y, r, hue], i) => {
    if (i === 5) return; // gap at the crown top
    const s = sway * (0.25 + Math.abs(x) / 26);
    canopyBlob(ctx, x + s, y, r, autumnColors(hue), 0.95);
  });

  acorns(ctx);

  // 1–2 leaves drifting down, settling on the ground pad. `fall` 0..1 per leaf.
  const leaves: Array<[number, number, number, number]> = [
    // [startX, hue, phase, swayAmp]
    [-6, 0.3, 0.0, 6],
    [9, 0.8, 0.5, 5],
  ];
  leaves.forEach(([sx, hue, phase, amp]) => {
    const prog = ((fall + phase) % 1 + 1) % 1;
    const ly = -6 + prog * 26; // from canopy base to ground pad
    const lx = sx + Math.sin(prog * Math.PI * 2 + phase * 6) * amp;
    const [, mid] = autumnColors(hue);
    ctx.fillStyle = mid;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(prog * Math.PI * 3 + phase * 4);
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // a couple of fallen leaves resting on the ground pad
  ctx.fillStyle = autumnColors(0.6)[1];
  [[-7, 21], [5, 22]].forEach(([fx, fy]) => {
    ctx.beginPath();
    ctx.ellipse(fx, fy, 2.4, 1.3, 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawOakAutumn(ctx: CanvasRenderingContext2D): void {
  autumnOak(ctx, 0, 0, 0.25);
}

function animOakAutumn(ctx: CanvasRenderingContext2D, t: number): void {
  // Slow broad sway as the breeze stirs the thinning crown (~5.5 s gesture) plus
  // a gentle settle bob; leaves keep drifting down on their own seamless loop.
  const sway = breezeAt(t, IDLE_W, 1.8);
  const bob = bobAt(t, IDLE_W, 0.45);
  const fall = (t * 0.22) % 1; // slower, more legible drift than before
  autumnOak(ctx, sway, bob, fall);
}

// ── Winter: bare snowy oak ───────────────────────────────────────────────────

function winterOak(
  ctx: CanvasRenderingContext2D,
  sway: number,
  bob: number,
  flakes: Array<[number, number, number]>,
  sheen: number,
): void {
  groundShadow(ctx, 16, 0.18);

  // snow blanket on the ground pad (stays put — only the bare tree sways/bobs)
  const snow = ctx.createLinearGradient(0, 16, 0, 24);
  snow.addColorStop(0, "#eef4fb");
  snow.addColorStop(1, "#c2d2e4");
  ctx.fillStyle = snow;
  ctx.beginPath();
  ctx.ellipse(0, 20, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(0, bob);
  trunk(ctx, true);
  branchSilhouette(ctx, "#2e2114", sway, true);
  ctx.restore();

  // faint cold sheen across the snow pad
  ctx.fillStyle = `rgba(200,224,255,${0.16 + sheen * 0.16})`;
  ctx.beginPath();
  ctx.ellipse(-3, 19, 10, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();

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
  // The bare winter canopy sways STIFFER and SLOWER with a smaller amplitude —
  // a slow ~5.5 s gesture lean, position & velocity 0 at t=0. Snowflakes keep
  // their own seamless fall loops; the cold sheen eases on a slow cosine.
  const sway = breezeAt(t, IDLE_W * 0.8, 0.9);
  const bob = bobAt(t, IDLE_W * 0.8, 0.3);
  const span = 36; // vertical travel top to settle line
  const seeds: Array<[number, number, number]> = [
    [-9, 1.3, 0.0],
    [6, 1.1, 0.45],
    [12, 1.0, 0.7],
    [-3, 1.2, 0.25],
  ];
  const flakes: Array<[number, number, number]> = seeds.map(([fx, r, phase]) => {
    const prog = ((t / 4.2 + phase) % 1 + 1) % 1;
    const fy = -24 + prog * span;
    const driftX = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
    return [driftX, fy, r];
  });
  const sheen = shimmerAt(t, 0.5, 0);
  winterOak(ctx, sway, bob, flakes, sheen);
}

// ── Transitions ──────────────────────────────────────────────────────────────

function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f;
}

// 0: Spring → Summer (2.6 s) — the canopy FILLS IN and deepens green. STAGED:
//   • spring airy crown (clusters + leaflet dots + buds) fades over the first
//     ~65% (eased), so at q=0 the frame is EXACTLY draw(Spring);
//   • the lush summer crown grows in r≈0→full, staggered per-blob, easing in
//     over ~25%→100%, so at q=1 the frame is EXACTLY draw(Summer);
//   • TRANSIENT: a "fill breeze" gust (∝ sin(π·q), amplitude 0 at both ends)
//     leans the new foliage as it thickens — peaks mid-morph, gone by the end.
function springToSummer(ctx: CanvasRenderingContext2D, p: number): void {
  const q = clamp01(p);
  const gust = Math.sin(Math.PI * q) * 1.6; // 0 at q=0 and q=1

  groundShadow(ctx, lerp(14, 16, q), lerp(0.2, 0.22, q));
  trunk(ctx, false);
  branchSilhouette(ctx, "#5a3d20", gust * 0.4, false);

  // ── SPRING layer: full spring still art, fading out over the first ~65% ──
  // At q=0 this is alpha 1 ⇒ identical to draw(Spring). Eased fade for clarity.
  const springFade = 1 - smoother(Math.min(1, q / 0.65));
  if (springFade > 0.001) {
    ctx.save();
    ctx.globalAlpha = springFade;
    const fresh: [string, string, string] = ["#5a7d24", "#86b53a", "#c0e26a"];
    SPRING_CLUSTERS.forEach(([x, y, r]) => {
      const s = gust * 0.3 * (0.3 + Math.abs(x) / 28);
      canopyBlob(ctx, x + s, y, r, fresh, 0.9);
    });
    // leaflet dots (part of the spring still — required for q=0 ≡ draw(Spring))
    ctx.fillStyle = "#a6e06a";
    SPRING_CLUSTERS.forEach(([x, y, r], i) => {
      const s = gust * 0.3 * (0.3 + Math.abs(x) / 28);
      for (let k = 0; k < 3; k++) {
        const a = i * 1.7 + k * 2.1;
        ctx.beginPath();
        ctx.ellipse(x + s + Math.cos(a) * r, y + Math.sin(a) * r, 1.4, 2.2, a, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    // bud dots (draw(Spring) bud alpha = 0.5 at budPulse 0)
    const buds: Array<[number, number]> = [
      [-8, -18], [6, -19], [-2, -14], [11, -12], [-13, -11],
    ];
    buds.forEach(([bx, by], i) => {
      // match draw(Spring) exactly at budPulse=0: a = 0.5 + 0.45·shimmer(0,1,i·1.3)
      const a = 0.5 + 0.45 * shimmerAt(0, 1, i * 1.3);
      ctx.fillStyle = `rgba(232,224,150,${a})`;
      ctx.beginPath();
      ctx.arc(bx + gust * 0.2, by, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // ── SUMMER crown: grows in, staggered per-blob, eased; full + warm at q=1 ──
  const green: [string, string, string] = ["#2f5418", "#4f8a2a", "#86bf48"];
  SUMMER_BLOBS.forEach(([x, y, r], i) => {
    // each blob starts a little after the previous → foliage thickens outward-in
    const start = 0.18 + i * 0.04;
    const grow = smoother(clamp01((q - start) / (1 - start)));
    const rr = r * grow;
    if (rr > 0.4) {
      const s = gust * (0.25 + Math.abs(x) / 26);
      canopyBlob(ctx, x + s, y, rr, green, 1);
    }
  });

  // At q≈1 lay in the summer still's dressing so the frame matches draw(Summer)
  // exactly. These fade in only at the very end (∝ smoother over the last 12%).
  const dress = smoother(clamp01((q - 0.88) / 0.12));
  if (dress > 0.001) {
    ctx.save();
    ctx.globalAlpha = dress;
    ctx.fillStyle = "rgba(190,230,140,0.4)"; // summer flecks at shimmer 0
    [[-7, -22, 2], [-2, -19, 1.6], [-11, -14, 1.8]].forEach(([fx, fy, r]) => {
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    // summer stray leaf at its rest spot (shimmer 0): flx=15, fly=-6, rot 0
    ctx.fillStyle = "#4f8a2a";
    ctx.beginPath();
    ctx.ellipse(15, -6, 1.6, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// Draw the AUTUMN still's crown + acorns + drifting/fallen leaves at fall=0.25
// (matches draw(Autumn) = autumnOak(0,0,0.25) exactly when alpha=1). Trunk and
// ground shadow are drawn by the caller so they aren't double-composited.
function autumnCrownStill(ctx: CanvasRenderingContext2D): void {
  AUTUMN_BLOBS.forEach(([x, y, r, hue], i) => {
    if (i === 5) return; // autumn gap at the crown top
    canopyBlob(ctx, x, y, r, autumnColors(hue), 0.95);
  });
  acorns(ctx);
  // drifting leaves frozen at fall=0.25 (the autumn still pose)
  const fall = 0.25;
  const leaves: Array<[number, number, number, number]> = [
    [-6, 0.3, 0.0, 6],
    [9, 0.8, 0.5, 5],
  ];
  leaves.forEach(([sx, hue, phase, amp]) => {
    const prog = ((fall + phase) % 1 + 1) % 1;
    const ly = -6 + prog * 26;
    const lx = sx + Math.sin(prog * Math.PI * 2 + phase * 6) * amp;
    ctx.fillStyle = autumnColors(hue)[1];
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(prog * Math.PI * 3 + phase * 4);
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  // fallen leaves resting on the pad
  ctx.fillStyle = autumnColors(0.6)[1];
  [[-7, 21], [5, 22]].forEach(([fx, fy]) => {
    ctx.beginPath();
    ctx.ellipse(fx, fy, 2.4, 1.3, 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
}

// 1: Summer → Autumn (2.6 s) — green SWEEPS to amber/orange and a couple of
// leaves begin to detach at the edges. STAGED:
//   • the lush summer crown (summer geometry) recolours green→autumn as a
//     left-to-right SWEEP over q≈0→0.6 (per-blob staggered ease), so q=0 is
//     EXACTLY draw(Summer);
//   • the actual autumn still (autumn geometry, gap, acorns, leaves, fallen
//     leaves) crossfades IN over q≈0.45→1, so q=1 is EXACTLY draw(Autumn);
//   • TRANSIENT: 2 edge leaves lift and flutter outward (∝ sin(π·q), so their
//     amplitude is 0 at both ends) — they peak mid-morph and resolve.
function summerToAutumn(ctx: CanvasRenderingContext2D, p: number): void {
  const q = clamp01(p);
  const transient = Math.sin(Math.PI * q); // 0 at q=0 and q=1

  groundShadow(ctx, lerp(16, 15, q), 0.22);
  trunk(ctx, false);

  // autumn still fades in over the back half; summer crown fades out to match.
  const autumnFade = smoother(clamp01((q - 0.45) / 0.55));
  const summerWeight = 1 - autumnFade;

  // ── SUMMER crown recolouring as a left→right sweep ──
  if (summerWeight > 0.001) {
    ctx.save();
    ctx.globalAlpha = summerWeight;
    const greenCols: [string, string, string] = ["#2f5418", "#4f8a2a", "#86bf48"];
    SUMMER_BLOBS.forEach(([x, y, r], i) => {
      const aBlob = AUTUMN_BLOBS[Math.min(i, AUTUMN_BLOBS.length - 1)];
      const autumnCols = autumnColors(aBlob[3]);
      // sweep front: blobs to the left recolour first, right side lags
      const sweep = smoother(clamp01((q * 1.4 - (x + 14) / 28) / 0.6));
      const rr = i === 5 ? r * lerp(1, 0.15, q) : r;
      if (rr > 0.5) {
        canopyBlob(ctx, x, y, rr, greenCols, 1);
        if (sweep > 0.01) canopyBlob(ctx, x, y, rr, autumnCols, sweep);
      }
    });
    // summer dressing (flecks + stray leaf) — present at q=0 to match
    // draw(Summer); they ride out with the summer weight.
    ctx.fillStyle = "rgba(190,230,140,0.4)";
    [[-7, -22, 2], [-2, -19, 1.6], [-11, -14, 1.8]].forEach(([fx, fy, r]) => {
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "#4f8a2a";
    ctx.beginPath();
    ctx.ellipse(15, -6, 1.6, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── AUTUMN still crossfading in (exact draw(Autumn) crown at alpha 1) ──
  if (autumnFade > 0.001) {
    ctx.save();
    ctx.globalAlpha = autumnFade;
    autumnCrownStill(ctx);
    ctx.restore();
  }

  // ── TRANSIENT: a couple of edge leaves lift & flutter outward, mid-morph ──
  if (transient > 0.01) {
    const leaves: Array<[number, number, number]> = [
      [-12, -14, 0.3],
      [13, -12, 0.8],
    ];
    leaves.forEach(([sx, sy, hue], i) => {
      const lift = transient; // 0 at both ends
      const lx = sx + (sx < 0 ? -1 : 1) * lift * 3;
      const ly = sy + lift * 3 - lift * Math.abs(Math.sin(q * Math.PI * 4 + i)) * 1.5;
      ctx.save();
      ctx.globalAlpha = transient;
      ctx.fillStyle = autumnColors(hue)[1];
      ctx.translate(lx, ly);
      ctx.rotate(Math.sin(q * Math.PI * 3 + i) * 0.8);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.6, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
  ctx.globalAlpha = 1;
}

// 2: Autumn → Winter — coloured canopy sheds (leaves fall/fade revealing the
// bare branch silhouette) while snow accumulates on branches and ground pad.
// The WINTER still's snow pad blanket (matches winterOak's pad gradient).
function winterPadStill(ctx: CanvasRenderingContext2D): void {
  const snow = ctx.createLinearGradient(0, 16, 0, 24);
  snow.addColorStop(0, "#eef4fb");
  snow.addColorStop(1, "#c2d2e4");
  ctx.fillStyle = snow;
  ctx.beginPath();
  ctx.ellipse(0, 20, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

// The WINTER still's 4 drifting snowflakes at their rest positions (the
// draw(Winter) flake list), globalAlpha 0.85 as in winterOak.
function winterFlakesStill(ctx: CanvasRenderingContext2D): void {
  const flakes: Array<[number, number, number]> = [
    [-9, -14, 1.3],
    [6, -4, 1.1],
    [12, -18, 1.0],
    [-3, 6, 1.2],
  ];
  ctx.fillStyle = "#ffffff";
  flakes.forEach(([fx, fy, r]) => {
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// 2: Autumn → Winter (3.2 s, the SHOWPIECE) — leaves visibly FALL and drift off
// the canopy while branches go bare and frost/snow settle on the limbs. STAGED:
//   • foliage THINS & the coloured crown sheds over the first ~70% of q (each
//     remaining autumn blob fades + drops), so q=0 is EXACTLY draw(Autumn);
//   • the bare winter tree (wet trunk, dark branch silhouette + snow caps), the
//     snow pad, sheen and resting snowflakes settle in over the LAST ~40%,
//     reaching full at q=1 so q=1 is EXACTLY draw(Winter);
//   • TRANSIENT (showpiece): 3 leaves are RELEASED IN SEQUENCE and flutter down
//     off the canopy, each fully gone (alpha→0, below the pad) by q=1.
function autumnToWinter(ctx: CanvasRenderingContext2D, p: number): void {
  const q = clamp01(p);
  // foliage thins/colours through the first ~70%; snow settles over the last ~40%.
  const shed = smoother(clamp01(q / 0.7)); // 0..1 over q∈[0,0.7]
  const settle = smoother(clamp01((q - 0.6) / 0.4)); // 0..1 over q∈[0.6,1]

  groundShadow(ctx, lerp(15, 16, q), lerp(0.22, 0.18, q));

  // ── WINTER pad/sheen settling in (full at q=1 ⇒ matches winterOak pad) ──
  if (settle > 0.001) {
    ctx.save();
    ctx.globalAlpha = settle;
    winterPadStill(ctx);
    ctx.restore();
  }

  // ── Trunk: brown autumn trunk → wet winter trunk ──
  // Autumn-weighted brown trunk fades out as winter wet trunk fades in, so the
  // composite is exact at both ends (brown at q=0, fully wet at q=1).
  if (1 - settle > 0.001) {
    ctx.save();
    ctx.globalAlpha = 1 - settle;
    trunk(ctx, false);
    ctx.restore();
  }
  if (settle > 0.001) {
    ctx.save();
    ctx.globalAlpha = settle;
    trunk(ctx, true);
    ctx.restore();
  }

  // ── Bare branch silhouette: ABSENT at q=0 (draw(Autumn) has no bare branches),
  // emerges as the crown sheds, becomes the winter silhouette by q=1. Drawn
  // before falling leaves so the leaves read in front. The autumn-brown branch
  // fades in with `shed`; the winter-dark snow-capped branch fades in with
  // `settle` (alpha 1 at q=1 ⇒ exactly draw(Winter)'s branchSilhouette).
  if (shed > 0.001) {
    ctx.save();
    ctx.globalAlpha = shed * (1 - settle);
    branchSilhouette(ctx, "#3a2a18", 0, false);
    ctx.restore();
  }
  if (settle > 0.001) {
    ctx.save();
    ctx.globalAlpha = settle;
    branchSilhouette(ctx, "#2e2114", 0, true);
    ctx.restore();
    // cold sheen on the pad — at settle=1 this is rgba(...,0.224), matching
    // winterOak(sheen=0.4): 0.16 + 0.4*0.16 = 0.224.
    ctx.save();
    ctx.globalAlpha = settle;
    ctx.fillStyle = "rgba(200,224,255,0.224)";
    ctx.beginPath();
    ctx.ellipse(-3, 19, 10, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Coloured canopy SHEDS: the autumn still (crown + acorns + resting leaves)
  // fades out as `shed`→1; remaining blobs drop a little. At q=0 (shed=0) this is
  // alpha 1 and undropped ⇒ EXACTLY draw(Autumn). ──
  const autumnVis = 1 - shed;
  if (autumnVis > 0.003) {
    ctx.save();
    ctx.globalAlpha = autumnVis;
    // crown blobs drop & shrink slightly as they thin
    AUTUMN_BLOBS.forEach(([x, y, r, hue], i) => {
      if (i === 5) return; // autumn gap
      const drop = shed * (6 + Math.abs(x) * 0.25);
      canopyBlob(ctx, x, y + drop, r * (1 - shed * 0.35), autumnColors(hue), 0.95);
    });
    acorns(ctx);
    // resting drifting leaves (autumn still, fall=0.25) also fade out
    const leaves: Array<[number, number, number, number]> = [
      [-6, 0.3, 0.0, 6],
      [9, 0.8, 0.5, 5],
    ];
    leaves.forEach(([sx, hue, phase, amp]) => {
      const prog = ((0.25 + phase) % 1 + 1) % 1;
      const ly = -6 + prog * 26 + shed * 6;
      const lx = sx + Math.sin(prog * Math.PI * 2 + phase * 6) * amp;
      ctx.fillStyle = autumnColors(hue)[1];
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(prog * Math.PI * 3 + phase * 4);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.7, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    // fallen leaves resting on the pad (cleared as winter snow takes over)
    ctx.fillStyle = autumnColors(0.6)[1];
    [[-7, 21], [5, 22]].forEach(([fx, fy]) => {
      ctx.beginPath();
      ctx.ellipse(fx, fy, 2.4, 1.3, 0.4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // ── TRANSIENT showpiece: 3 leaves released IN SEQUENCE, fluttering down off
  // the canopy. Each spawns at a staggered q, falls, and is fully gone (alpha 0,
  // past the pad) by q=1. Amplitude is naturally 0 at q=0 (none spawned yet) and
  // each leaf's own alpha resolves to 0 before q=1. ──
  const fallers: Array<[number, number, number, number]> = [
    // [startX, startY, spawnQ, hue]
    [-11, -13, 0.08, 0.3],
    [12, -11, 0.30, 0.8],
    [3, -17, 0.52, 0.55],
  ];
  fallers.forEach(([sx, sy, spawnQ, hue], i) => {
    const span = 0.9 - spawnQ; // time available before q=1 (kept < 1)
    if (q <= spawnQ || span <= 0) return;
    const prog = clamp01((q - spawnQ) / span); // 0..1, reaches 1 by q≈0.9
    if (prog >= 1) return; // gone
    const ly = sy + prog * (30 - sy); // fall down to ~+30 (below the pad)
    const flutter = Math.sin(prog * Math.PI * 5 + i) * (1 - prog) * 4;
    const lx = sx + flutter + (sx < 0 ? -1 : 1) * prog * 2;
    ctx.save();
    ctx.globalAlpha = (1 - prog) * 0.95; // fades to 0 as it lands → gone by q=1
    ctx.fillStyle = autumnColors(hue)[1];
    ctx.translate(lx, ly);
    ctx.rotate(prog * Math.PI * 3 + i);
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // ── WINTER resting snowflakes settle in last (full at q=1 ⇒ draw(Winter)) ──
  if (settle > 0.001) {
    ctx.save();
    ctx.globalAlpha = settle;
    winterFlakesStill(ctx);
    ctx.restore();
  }
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
