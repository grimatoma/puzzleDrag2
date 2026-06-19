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

function springOak(ctx: CanvasRenderingContext2D, sway: number, budPulse: number): void {
  groundShadow(ctx, 14, 0.2);
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
    const a = 0.5 + 0.45 * (0.5 + 0.5 * Math.sin(budPulse + i * 1.3));
    ctx.fillStyle = `rgba(232,224,150,${a})`;
    ctx.beginPath();
    ctx.arc(bx + sway * 0.2, by, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawOakSpring(ctx: CanvasRenderingContext2D): void {
  springOak(ctx, 0, 0.6);
}

function animOakSpring(ctx: CanvasRenderingContext2D, t: number): void {
  // gentle branch sway, seamless period 2π/1.3 s, plus shimmering buds
  const sway = Math.sin(t * 1.3) * 1.6;
  springOak(ctx, sway, t * 2.4);
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

function summerOak(ctx: CanvasRenderingContext2D, sway: number, shimmer: number): void {
  groundShadow(ctx, 16, 0.22);
  trunk(ctx, false);

  const green: [string, string, string] = ["#2f5418", "#4f8a2a", "#86bf48"];
  SUMMER_BLOBS.forEach(([x, y, r], i) => {
    const s = sway * (0.25 + Math.abs(x) / 26) + Math.sin(shimmer + i) * 0.4;
    canopyBlob(ctx, x + s, y, r, green, 1);
  });

  // a few shimmering highlight flecks on the top-left of the crown
  ctx.fillStyle = `rgba(190,230,140,${0.4 + 0.3 * (0.5 + 0.5 * Math.sin(shimmer))})`;
  [[-7, -22, 2], [-2, -19, 1.6], [-11, -14, 1.8]].forEach(([fx, fy, r]) => {
    ctx.beginPath();
    ctx.arc(fx + sway * 0.3, fy, r, 0, Math.PI * 2);
    ctx.fill();
  });

  // one stray leaf fluttering at the lower-right edge
  const flx = 15 + Math.sin(shimmer * 0.8) * 1.5;
  const fly = -6 + Math.cos(shimmer * 1.1) * 1.2;
  ctx.fillStyle = "#4f8a2a";
  ctx.save();
  ctx.translate(flx, fly);
  ctx.rotate(Math.sin(shimmer) * 0.4);
  ctx.beginPath();
  ctx.ellipse(0, 0, 1.6, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawOakSummer(ctx: CanvasRenderingContext2D): void {
  summerOak(ctx, 0, 0);
}

function animOakSummer(ctx: CanvasRenderingContext2D, t: number): void {
  // slow sway + internal canopy shimmer, seamless period 2π/1.3 s
  const sway = Math.sin(t * 1.3) * 1.4;
  summerOak(ctx, sway, t * 1.9);
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
  fall: number,
): void {
  groundShadow(ctx, 15, 0.22);
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
}

function drawOakAutumn(ctx: CanvasRenderingContext2D): void {
  autumnOak(ctx, 0, 0.25);
}

function animOakAutumn(ctx: CanvasRenderingContext2D, t: number): void {
  // warm canopy with leaves falling on a seamless loop, gentle sway
  const sway = Math.sin(t * 1.1) * 1.2;
  const fall = (t * 0.28) % 1;
  autumnOak(ctx, sway, fall);
}

// ── Winter: bare snowy oak ───────────────────────────────────────────────────

function winterOak(
  ctx: CanvasRenderingContext2D,
  sway: number,
  flakes: Array<[number, number, number]>,
  sheen: number,
): void {
  groundShadow(ctx, 16, 0.18);

  // snow blanket on the ground pad
  const snow = ctx.createLinearGradient(0, 16, 0, 24);
  snow.addColorStop(0, "#eef4fb");
  snow.addColorStop(1, "#c2d2e4");
  ctx.fillStyle = snow;
  ctx.beginPath();
  ctx.ellipse(0, 20, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  trunk(ctx, true);
  branchSilhouette(ctx, "#2e2114", sway, true);

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
  // slow branch sway + four snowflakes each on their own seamless fall loop
  const sway = Math.sin(t * 0.9) * 1.0;
  const span = 36; // vertical travel top to settle line
  const seeds: Array<[number, number, number]> = [
    [-9, 1.3, 0.0],
    [6, 1.1, 0.45],
    [12, 1.0, 0.7],
    [-3, 1.2, 0.25],
  ];
  const flakes: Array<[number, number, number]> = seeds.map(([fx, r, phase]) => {
    const prog = ((t / 3.6 + phase) % 1 + 1) % 1;
    const fy = -24 + prog * span;
    const driftX = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
    return [driftX, fy, r];
  });
  const sheen = 0.5 + 0.5 * Math.sin(t * 0.7);
  winterOak(ctx, sway, flakes, sheen);
}

// ── Transitions ──────────────────────────────────────────────────────────────

function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f;
}

// 0: Spring → Summer — branches fill in, airy clusters thicken into the full
// green crown; bud dots fade as leaves grow. Colour green-warms slightly.
function springToSummer(ctx: CanvasRenderingContext2D, p: number): void {
  const q = Math.max(0, Math.min(1, p));
  groundShadow(ctx, lerp(14, 16, q), 0.21);
  trunk(ctx, false);
  branchSilhouette(ctx, "#5a3d20", 0, false);

  // spring clusters present at low p, fading as the summer crown takes over
  const fresh: [string, string, string] = ["#5a7d24", "#86b53a", "#c0e26a"];
  SPRING_CLUSTERS.forEach(([x, y, r]) => {
    const a = 0.9 * (1 - q);
    if (a > 0.02) canopyBlob(ctx, x, y, lerp(r, r * 0.8, q), fresh, a);
  });

  // summer crown grows in from r≈0; blobs warm from fresh-green to lush green
  const green: [string, string, string] = ["#2f5418", "#4f8a2a", "#86bf48"];
  SUMMER_BLOBS.forEach(([x, y, r], i) => {
    const grow = Math.max(0, q * 1.15 - i * 0.015);
    const rr = r * Math.min(1, grow);
    if (rr > 0.5) canopyBlob(ctx, x, y, rr, green, Math.min(1, q + 0.15));
  });

  // bud dots fade out across the first half
  const buds: Array<[number, number]> = [
    [-8, -18], [6, -19], [-2, -14], [11, -12], [-13, -11],
  ];
  const budA = Math.max(0, 0.6 * (1 - q * 1.6));
  if (budA > 0.02) {
    buds.forEach(([bx, by]) => {
      ctx.fillStyle = `rgba(232,224,150,${budA})`;
      ctx.beginPath();
      ctx.arc(bx, by, 1.4, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.globalAlpha = 1;
}

// 1: Summer → Autumn — green canopy shifts hue green→gold/orange/russet
// per-blob, and a few leaves begin to detach near the end (don't fully fall).
function summerToAutumn(ctx: CanvasRenderingContext2D, p: number): void {
  const q = Math.max(0, Math.min(1, p));
  groundShadow(ctx, lerp(16, 15, q), 0.22);
  trunk(ctx, false);

  // each summer blob morphs toward its autumn counterpart's colour; the top
  // blob (index 5) shrinks toward the autumn gap.
  SUMMER_BLOBS.forEach(([x, y, r], i) => {
    // pick a corresponding autumn hue from the autumn list (clamped)
    const aBlob = AUTUMN_BLOBS[Math.min(i, AUTUMN_BLOBS.length - 1)];
    const [adark, amid, alight] = autumnColors(aBlob[3]);
    // interpolate colour by blending alpha of an overlaid autumn blob
    const greenCols: [string, string, string] = ["#2f5418", "#4f8a2a", "#86bf48"];
    const autumnCols: [string, string, string] = [adark, amid, alight];
    // shrink the top blob into the gap as autumn thins the crown
    const rr = i === 5 ? r * lerp(1, 0.15, q) : r;
    if (rr > 0.5) {
      canopyBlob(ctx, x, y, rr, greenCols, 1);
      if (q > 0.01) canopyBlob(ctx, x, y, rr, autumnCols, q);
    }
  });

  // acorns appear in the second half
  if (q > 0.5) {
    ctx.save();
    ctx.globalAlpha = (q - 0.5) * 2;
    acorns(ctx);
    ctx.restore();
  }

  // a couple of leaves just beginning to detach near the very end — they lift
  // off the canopy edge but only drift a little (don't fully fall yet).
  if (q > 0.65) {
    const d = (q - 0.65) / 0.35; // 0..1 over the last third
    const leaves: Array<[number, number, number]> = [
      [-6, -6, 0.4],
      [9, -8, 0.8],
    ];
    leaves.forEach(([sx, sy, hue]) => {
      const lx = sx + d * 2;
      const ly = sy + d * 5; // small drop only
      ctx.fillStyle = autumnColors(hue)[1];
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(d * 1.4);
      ctx.globalAlpha = 1 - d * 0.3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.7, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
  ctx.globalAlpha = 1;
}

// 2: Autumn → Winter — coloured canopy sheds (leaves fall/fade revealing the
// bare branch silhouette) while snow accumulates on branches and ground pad.
// Staged: leaves leave first, snow settles second.
function autumnToWinter(ctx: CanvasRenderingContext2D, p: number): void {
  const q = Math.max(0, Math.min(1, p));
  // leaves shed over the first ~70%, snow accumulates over the last ~60%
  const shed = Math.min(1, q / 0.7); // 0..1
  const snowAmt = Math.max(0, (q - 0.4) / 0.6); // 0..1

  groundShadow(ctx, lerp(15, 16, q), lerp(0.22, 0.18, q));

  // ground pad: bare soil → snow blanket grows in
  if (snowAmt > 0.01) {
    const snow = ctx.createLinearGradient(0, 16, 0, 24);
    snow.addColorStop(0, "#eef4fb");
    snow.addColorStop(1, "#c2d2e4");
    ctx.save();
    ctx.globalAlpha = snowAmt;
    ctx.fillStyle = snow;
    ctx.beginPath();
    ctx.ellipse(0, 20, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // trunk darkens (wets) as winter arrives — overlay a wet trunk over the brown
  trunk(ctx, false);
  if (snowAmt > 0.01) {
    ctx.save();
    ctx.globalAlpha = snowAmt;
    trunk(ctx, true);
    ctx.restore();
  }

  // branch silhouette emerges as leaves shed; snow caps fade in with snowAmt.
  // Draw branches first so falling leaves read in front of them.
  branchSilhouette(ctx, "#3a2a18", 0, false);

  // coloured canopy sheds: blobs shrink + fade and drop as shed→1
  AUTUMN_BLOBS.forEach(([x, y, r, hue], i) => {
    if (i === 5) return; // already a gap in autumn
    const a = 0.95 * (1 - shed);
    if (a > 0.03) {
      const drop = shed * (8 + Math.abs(x) * 0.3); // outer blobs fall further
      canopyBlob(ctx, x, y + drop, r * (1 - shed * 0.4), autumnColors(hue), a);
    }
  });

  // a few individual leaves visibly falling away during the shed
  if (shed > 0.05 && shed < 0.98) {
    const leaves: Array<[number, number, number, number]> = [
      [-6, 0.3, 0.0, 6],
      [9, 0.8, 0.4, 5],
      [2, 0.6, 0.7, 5],
    ];
    leaves.forEach(([sx, hue, phase, amp]) => {
      const prog = Math.min(1, shed + phase * 0.3);
      const ly = -8 + prog * 30;
      const lx = sx + Math.sin(prog * Math.PI * 2 + phase * 6) * amp;
      ctx.fillStyle = autumnColors(hue)[1];
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(prog * Math.PI * 3 + phase * 4);
      ctx.globalAlpha = 1 - prog * 0.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.7, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // snow caps accumulate on the upper branch tips as snowAmt grows
  if (snowAmt > 0.02) {
    ctx.save();
    ctx.globalAlpha = snowAmt;
    BRANCHES.forEach(([_cx, _cy, tx, ty], i) => {
      ctx.fillStyle = "#f4f8ff";
      ctx.beginPath();
      ctx.ellipse(tx, ty - 0.5, 2.6 + (i % 2) * 0.6, 1.5, (tx < 0 ? -0.5 : 0.5), 0, Math.PI * 2);
      ctx.fill();
    });
    // faint cold sheen on the pad
    ctx.fillStyle = `rgba(200,224,255,${0.16 * snowAmt})`;
    ctx.beginPath();
    ctx.ellipse(-3, 19, 10, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
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
