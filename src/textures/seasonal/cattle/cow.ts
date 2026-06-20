// Seasonal art for the CATTLE COW board tile (`tile_cattle_cow`).
//
// A SINGLE parameterized paint renders the whole tile (grass pad + the one
// black-and-white spotted dairy cow + seasonal dressing) from a tweenable
// parameter set `P`. The four seasons are four `P` presets; the three forward
// transitions lerp EVERY field of `P` through a quintic smoothstep, so
// transition(0) === the from-season still and transition(1) === the to-season
// still — no snap.
//
// PALETTE LOCK: the cow is ALWAYS the same big white-bodied, black-spotted,
// pink-muzzled dairy cow with small horns/ears and a tail. The SILHOUETTE and
// the black/white/pink IDENTITY colours are constant across all seasons. Only
// the COAT thickness (`coatVolume` — sleek in spring → thick & shaggy in
// winter), the pad colour, the light wash, and dressing (blossom, fallen
// leaves, frost, back-snow, breath-fog) change. The cow is never recoloured,
// hollowed, or swapped.
//
// Origin-centered in the −24..+24 design box, light from upper-left, flat
// cel-shaded with a soft dark outline. Animations are deterministic
// (sin/cos/modulo of `t` in seconds), seamless, and subtle: a slow breathing
// bob (zero velocity at t=0 → anim(…,0) matches the still), plus an occasional
// ear flick + a tail swish + a small head dip once per loop, plus the
// per-season micro-motion (spring dew shimmer, summer coat sheen, autumn leaf
// stir, winter breath-fog pulse + drifting snowflake).

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Small math helpers ──────────────────────────────────────────────────────

type RGB = [number, number, number];

function clamp01(x: number): number {
  if (!(x >= 0)) return 0; // also catches NaN
  if (x > 1) return 1;
  return x;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function rgb(c: RGB, a = 1): string {
  const r = Math.round(clamp01(c[0] / 255) * 255);
  const g = Math.round(clamp01(c[1] / 255) * 255);
  const b = Math.round(clamp01(c[2] / 255) * 255);
  return `rgba(${r},${g},${b},${clamp01(a)})`;
}

// quintic smoothstep — zero first & second derivative at both ends
const smoother = (x: number): number => x * x * x * (x * (6 * x - 15) + 10);

// breathing bob: A*(1-cos(w t))*0.5 — value AND velocity are 0 at t=0,
// seamless over a 2π/w period, peak amplitude A.
function bobAt(t: number, amp = 1.0, w = 1.35): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────
//
// IDENTITY colours (white body, black patches, pink muzzle, dark hooves/horns)
// stay nearly constant; they live in P only so the light wash can nudge them
// very slightly between seasons. Everything that genuinely differs per season
// is the coat volume + pad + light + dressing amounts.

interface P {
  hideLight: RGB; // bright top of the white hide
  hideShadow: RGB; // shaded underside of the white hide
  patch: RGB; // the irregular black/very-dark spots
  muzzle: RGB; // pink muzzle / nose / inner ear / udder hint
  hornDark: RGB; // horns, hooves, eyes (the dark hard parts)
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  coatVolume: number; // 0..1 coat thickness (sleek → shaggy & puffed outline)
  frostAmt: number; // 0..1 frost sparkle on the coat
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad (autumn)
  breathFogAmt: number; // 0..1 breath puff at the muzzle (winter)
}

// Four season presets. The cow stays the SAME white, black-spotted, pink-muzzled
// dairy cow; only coat volume + pad + light + dressing differ.
const SP: Record<SeasonName, P> = {
  // Spring — sleek coat, dewy lime pad + blossom, cool-bright light.
  Spring: {
    hideLight: [250, 250, 248],
    hideShadow: [208, 210, 210],
    patch: [44, 40, 44],
    muzzle: [238, 168, 176],
    hornDark: [60, 54, 50],
    padGrass: [128, 206, 86], // bright lime dewy grass
    soil: [86, 132, 54],
    outline: [54, 48, 46],
    lightWash: [214, 240, 255], // cool-bright
    lightWashAmt: 0.16,
    coatVolume: 0.12, // sleek
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.65,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Summer — normal coat (PEAK), saturated mid-green pad, warm light.
  Summer: {
    hideLight: [252, 251, 247],
    hideShadow: [204, 202, 198],
    patch: [40, 36, 40],
    muzzle: [240, 162, 170],
    hornDark: [56, 50, 46],
    padGrass: [86, 170, 64], // saturated mid-green
    soil: [58, 112, 40],
    outline: [50, 44, 42],
    lightWash: [255, 244, 206], // warm
    lightWashAmt: 0.14,
    coatVolume: 0.42, // normal full coat
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Autumn — slightly fuller coat, olive-tan browning pad, fallen leaves.
  Autumn: {
    hideLight: [246, 242, 234],
    hideShadow: [200, 194, 184],
    patch: [42, 36, 36],
    muzzle: [232, 156, 160],
    hornDark: [58, 48, 42],
    padGrass: [156, 142, 78], // olive-tan
    soil: [104, 84, 44],
    outline: [54, 44, 38],
    lightWash: [255, 206, 138], // low amber
    lightWashAmt: 0.2,
    coatVolume: 0.62, // slightly fuller
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.7,
    breathFogAmt: 0,
  },
  // Winter — thick shaggy coat + back-snow + breath fog, snowy pad, cool light.
  Winter: {
    hideLight: [253, 254, 255],
    hideShadow: [206, 216, 228],
    patch: [50, 46, 54],
    muzzle: [226, 150, 162],
    hornDark: [62, 58, 66],
    padGrass: [222, 232, 244], // snow on the pad
    soil: [150, 168, 190],
    outline: [64, 62, 74],
    lightWash: [206, 222, 248], // cool blue-grey
    lightWashAmt: 0.24,
    coatVolume: 1, // thick & shaggy
    frostAmt: 0.65,
    backSnowAmt: 0.7,
    padSnowAmt: 0.85,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.7,
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    hideLight: lerpRGB(a.hideLight, b.hideLight, t),
    hideShadow: lerpRGB(a.hideShadow, b.hideShadow, t),
    patch: lerpRGB(a.patch, b.patch, t),
    muzzle: lerpRGB(a.muzzle, b.muzzle, t),
    hornDark: lerpRGB(a.hornDark, b.hornDark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    coatVolume: lerp(a.coatVolume, b.coatVolume, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    backSnowAmt: lerp(a.backSnowAmt, b.backSnowAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
    breathFogAmt: lerp(a.breathFogAmt, b.breathFogAmt, t),
  };
}

// clamp every scalar field defensively (never throw on a wild `p`)
function clampP(p: P): P {
  return {
    ...p,
    lightWashAmt: clamp01(p.lightWashAmt),
    coatVolume: clamp01(p.coatVolume),
    frostAmt: clamp01(p.frostAmt),
    backSnowAmt: clamp01(p.backSnowAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    breathFogAmt: clamp01(p.breathFogAmt),
  };
}

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat grass pad the cow stands on
function paintPad(ctx: CanvasRenderingContext2D, p: P): void {
  // soft contact shadow, offset to lower-right (light is upper-left)
  ctx.fillStyle = rgb([0, 0, 0], 0.18);
  ctx.beginPath();
  ctx.ellipse(3, 21, 17, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // shaded underside of the pad
  ctx.fillStyle = rgb(p.soil);
  ctx.beginPath();
  ctx.ellipse(0, 20.5, 18, 5.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // grass top
  ctx.fillStyle = rgb(p.padGrass);
  ctx.beginPath();
  ctx.ellipse(0, 19, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // tufted top edge
  ctx.strokeStyle = rgb(p.padGrass);
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  for (let i = -16; i <= 16; i += 4) {
    const h = 1.6 + (i % 8 === 0 ? 1.4 : 0);
    const yEdge = 19 - Math.sqrt(Math.max(0, 1 - (i / 18) ** 2)) * 5;
    ctx.beginPath();
    ctx.moveTo(i, yEdge);
    ctx.lineTo(i + 1, yEdge - h);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // small highlight band on the pad (light from upper-left)
  ctx.fillStyle = rgb([255, 255, 255], 0.1);
  ctx.beginPath();
  ctx.ellipse(-5, 17.5, 9, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // snow blanket over the pad (winter)
  if (p.padSnowAmt > 0.001) {
    ctx.fillStyle = rgb([244, 250, 255], 0.85 * p.padSnowAmt);
    ctx.beginPath();
    ctx.ellipse(0, 18.6, 17, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // a couple of frost glints on the snow
    ctx.fillStyle = rgb([255, 255, 255], 0.7 * p.padSnowAmt);
    for (const [sx, sy] of [[-9, 19], [6, 20], [12, 18]] as const) {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // tiny blossoms (spring)
  if (p.blossomAmt > 0.001) {
    for (const [bx, by] of [[-13, 18.5], [10, 20], [0, 21], [14, 19]] as const) {
      ctx.fillStyle = rgb([255, 250, 252], 0.9 * p.blossomAmt);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(bx + Math.cos(a) * 1.1, by + Math.sin(a) * 1.1, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = rgb([252, 214, 110], p.blossomAmt);
      ctx.beginPath();
      ctx.arc(bx, by, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // a couple of fallen leaves (autumn)
  if (p.fallenLeafAmt > 0.001) {
    const leaves: Array<[number, number, number, RGB]> = [
      [-12, 20, -0.5, [196, 96, 36]],
      [11, 20.5, 0.7, [212, 150, 52]],
      [2, 21, 0.2, [168, 80, 40]],
    ];
    for (const [lx, ly, rot, col] of leaves) {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.fillStyle = rgb(col, p.fallenLeafAmt);
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.6, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgb([110, 60, 26], p.fallenLeafAmt);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-2.4, 0);
      ctx.lineTo(2.4, 0);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// one leg: a stout pale cylinder with a dark hoof at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  // pale hide leg with outline
  ctx.strokeStyle = rgb(p.outline);
  ctx.lineWidth = 4.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  ctx.strokeStyle = rgb(p.hideShadow);
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY - 1);
  ctx.stroke();
  // dark hoof
  ctx.fillStyle = rgb(p.hornDark);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 2.0, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// Trace the cow's barrel body path (constant silhouette). cx,cy = body centre.
// vol modestly puffs/shaggies the outline; the underlying shape is constant.
function bodyPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, vol: number): void {
  const rx = 13.5 * (0.97 + vol * 0.12);
  const ry = 8.8 * (0.97 + vol * 0.14);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
}

// the whole cow, standing front-¾ turned ~15-20° toward lower-left
function paintCow(ctx: CanvasRenderingContext2D, p: P, bob: number, headDip = 0): void {
  // body centre lifts with the breathing bob
  const bx = 1;
  const by = 2 - bob;
  const vol = p.coatVolume;

  // legs first (behind the body). Two back (dimmer/higher), two front.
  ctx.save();
  ctx.globalAlpha = 0.9;
  paintLeg(ctx, p, bx + 8, by + 6, 18.6);
  paintLeg(ctx, p, bx - 6.5, by + 6, 18.9);
  ctx.restore();
  // front legs (toward lower-left, slightly forward)
  paintLeg(ctx, p, bx + 4, by + 6.5, 19.4);
  paintLeg(ctx, p, bx - 9.5, by + 6.5, 19.6);

  // ── BODY barrel — outline pass then light fill (layered like wheat) ─────────
  // outline halo
  ctx.fillStyle = rgb(p.outline);
  bodyPath(ctx, bx, by, vol);
  ctx.save();
  // fatten the outline by scaling slightly around centre
  ctx.translate(bx, by);
  ctx.scale(1.1, 1.14);
  ctx.translate(-bx, -by);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  ctx.restore();

  // shaded hide
  ctx.fillStyle = rgb(p.hideShadow);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  // lit hide, offset up-left (light from upper-left)
  ctx.save();
  ctx.fillStyle = rgb(p.hideLight);
  ctx.translate(-1.4, -1.6);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  ctx.restore();

  // shaggy winter coat fringe: a few soft tufts along the lower/back edge,
  // only when the coat is thick (vol high). Constant silhouette otherwise.
  if (vol > 0.55) {
    const fr = (vol - 0.55) / 0.45;
    ctx.fillStyle = rgb(p.hideShadow, 0.9);
    const rx = 13.5 * (0.97 + vol * 0.12);
    const ry = 8.8 * (0.97 + vol * 0.14);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 0.15 + (i / 8) * Math.PI * 0.9; // lower-front arc
      const lx = bx + Math.cos(a) * rx * 1.02;
      const ly = by + Math.sin(a) * ry * 1.02;
      ctx.beginPath();
      ctx.arc(lx, ly, (1.2 + 0.9 * fr) * (i % 2 ? 1 : 0.8), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── BLACK PATCHES — irregular spots, clipped to the body (identity) ─────────
  ctx.save();
  bodyPath(ctx, bx, by, vol);
  ctx.clip();
  ctx.fillStyle = rgb(p.patch);
  // a few irregular patches placed within the barrel
  const patches: Array<[number, number, number, number, number]> = [
    [bx - 7, by - 3, 5.2, 4.4, -0.3],
    [bx + 5.5, by - 1.5, 5.8, 5.2, 0.25],
    [bx + 9.5, by + 4, 3.4, 3.0, 0.1],
    [bx - 2, by + 4.5, 4.0, 2.8, -0.15],
  ];
  for (const [px, py, prx, pry, rot] of patches) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    // lumpy patch: an ellipse with a couple of bumps
    ctx.beginPath();
    ctx.ellipse(0, 0, prx, pry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(prx * 0.7, -pry * 0.4, prx * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-prx * 0.5, pry * 0.5, pry * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // subtle hide highlight band over the patches' upper edge (light upper-left)
  ctx.fillStyle = rgb([255, 255, 255], 0.08);
  ctx.beginPath();
  ctx.ellipse(bx - 3, by - 4, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore(); // end body clip

  // snow settled on the back (winter) — a soft white cap on top of the back
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgb([248, 252, 255], 0.92 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx, by - 7.4, 10 * (0.9 + vol * 0.2), 3.2, -0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb([255, 255, 255], 0.85 * p.backSnowAmt);
    for (const [dx, dy] of [[-6, -8.2], [0, -8.8], [6, -8] ] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.5 + vol * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the coat (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([255, 255, 255], 0.8 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-8, 0], [-3, 4], [4, -2], [9, 2], [0, -3], [-5, -5], [7, 5],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // tail at the upper-right rear — a thin line with a dark switch tuft
  ctx.strokeStyle = rgb(p.outline);
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx + 13, by - 2);
  ctx.quadraticCurveTo(bx + 17, by + 3, bx + 15.5, by + 9);
  ctx.stroke();
  ctx.strokeStyle = rgb(p.hideShadow);
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(bx + 13, by - 2);
  ctx.quadraticCurveTo(bx + 17, by + 3, bx + 15.5, by + 9);
  ctx.stroke();
  ctx.lineCap = "butt";
  // tail switch tuft (dark)
  ctx.fillStyle = rgb(p.patch);
  ctx.beginPath();
  ctx.ellipse(bx + 15.5, by + 10, 1.6, 2.6, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // ── HEAD (front-¾, lower-left) — locks identity: white face w/ patch, horns,
  //    ears, pink muzzle. A small head dip lowers it slightly. ────────────────
  const hx = bx - 14;
  const hy = by + 3 + headDip;

  // horns (small, dark) — behind the crown
  ctx.strokeStyle = rgb(p.hornDark);
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  for (const side of [-1, 1] as const) {
    ctx.beginPath();
    ctx.moveTo(hx + side * 2.6, hy - 5.2);
    ctx.quadraticCurveTo(hx + side * 4.6, hy - 7.6, hx + side * 4.0, hy - 8.8);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // ears (white outer + pink inner), set wide
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(hx + side * 5.6, hy - 3.2);
    ctx.rotate(side * 0.7);
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.4, 1.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(p.hideLight);
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.8, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(p.muzzle);
    ctx.beginPath();
    ctx.ellipse(side * -0.3, 0.1, 1.5, 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // head — white ovoid (outline then fill), tilted toward lower-left
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(0.22);
  // outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, 0, 5.4, 6.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // white face fill (shaded then lit)
  ctx.fillStyle = rgb(p.hideShadow);
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.7, 5.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.hideLight);
  ctx.beginPath();
  ctx.ellipse(-0.6, -0.8, 4.1, 5.0, 0, 0, Math.PI * 2);
  ctx.fill();

  // a black patch over one eye/forehead (identity spotting)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.7, 5.7, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = rgb(p.patch);
  ctx.beginPath();
  ctx.ellipse(1.8, -2.2, 2.6, 2.4, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // eyes
  ctx.fillStyle = rgb([245, 245, 240]);
  for (const ex of [-1.8, 1.8]) {
    ctx.beginPath();
    ctx.arc(ex, -1.0, 1.05, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = rgb([20, 18, 20]);
  for (const ex of [-1.6, 2.0]) {
    ctx.beginPath();
    ctx.arc(ex, -0.8, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // pink muzzle — broad soft snout at the lower face
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, 3.6, 4.0, 2.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.muzzle);
  ctx.beginPath();
  ctx.ellipse(0, 3.4, 3.4, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // muzzle highlight + nostrils
  ctx.fillStyle = rgb([255, 255, 255], 0.18);
  ctx.beginPath();
  ctx.ellipse(-1.2, 2.4, 1.4, 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb([150, 70, 84]);
  for (const ex of [-1.2, 1.2]) {
    ctx.beginPath();
    ctx.ellipse(ex, 3.9, 0.55, 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore(); // end head transform

  // breath-fog puff at the muzzle (winter) — at rest a faint static puff
  if (p.breathFogAmt > 0.001) {
    ctx.fillStyle = rgb([235, 244, 255], 0.4 * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(hx - 5.5, hy + 4.4, 3.2, 2.2, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// the overall colour-of-light wash, painted last over the whole tile
function paintLightWash(ctx: CanvasRenderingContext2D, p: P): void {
  if (p.lightWashAmt <= 0.001) return;
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = rgb(p.lightWash, p.lightWashAmt);
  ctx.beginPath();
  ctx.ellipse(0, 4, 26, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── THE single paint ────────────────────────────────────────────────────────

function paint(ctx: CanvasRenderingContext2D, pIn: P, bob: number, headDip = 0): void {
  const p = clampP(pIn);
  ctx.save();
  try {
    ctx.lineJoin = "round";
    paintPad(ctx, p);
    paintCow(ctx, p, bob, headDip);
    paintLightWash(ctx, p);
  } finally {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }
}

// ── Per-season builders ─────────────────────────────────────────────────────

function draw(season: SeasonName) {
  return (ctx: CanvasRenderingContext2D): void => paint(ctx, SP[season], 0);
}

function anim(season: SeasonName) {
  return (ctx: CanvasRenderingContext2D, t: number): void => {
    const p = clampP(SP[season]);
    const bob = bobAt(t); // SUBJECT breathing bob, 0 at t=0

    // small head dip once per loop, seamless (0 at t=0 via 1-cos)
    const dipLoop = (t % 6) / 6; // 0..1 over 6s
    const dip = 0.9 * (1 - Math.cos(dipLoop * Math.PI * 2)) * 0.5; // 0 at edges
    paint(ctx, SP[season], bob, dip);

    // ── Additive micro-motion, drawn over the painted tile ──────────────────
    ctx.save();
    try {
      const bx = 1;
      const by = 2 - bob;
      const hx = bx - 14;
      const hy = by + 3 + dip;

      // Occasional ear flick + tail swish once per ~5s loop. Sharp brief bump,
      // seamless (0 at the loop edges).
      const loop = (t % 5) / 5; // 0..1
      const flickGate = Math.max(0, Math.sin(loop * Math.PI * 2)) ** 6; // brief
      const flick = Math.sin(t * 9) * flickGate;

      // ear flick (redraw the near ear flicking over the existing one)
      ctx.save();
      ctx.translate(hx - 5.6, hy - 3.2);
      ctx.rotate(-0.7 + flick * 0.6);
      ctx.fillStyle = rgb(p.outline);
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.4, 1.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgb(p.hideLight);
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.8, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgb(p.muzzle);
      ctx.beginPath();
      ctx.ellipse(0.3, 0.1, 1.5, 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // tail swish (redraw the tail switch swinging over the existing tail)
      const swish = Math.sin(t * 7) * flickGate * 3.2;
      ctx.strokeStyle = rgb(p.outline);
      ctx.lineWidth = 1.8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(bx + 13, by - 2);
      ctx.quadraticCurveTo(bx + 17 + swish, by + 3, bx + 15.5 + swish, by + 9);
      ctx.stroke();
      ctx.lineCap = "butt";
      ctx.fillStyle = rgb(p.patch);
      ctx.beginPath();
      ctx.ellipse(bx + 15.5 + swish, by + 10, 1.6, 2.6, 0.15, 0, Math.PI * 2);
      ctx.fill();

      if (season === "Spring") {
        // dew shimmer — a soft glint that pulses on the grass/blossoms
        const g = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.4));
        ctx.fillStyle = rgb([255, 255, 255], g);
        ctx.beginPath();
        ctx.arc(-8, 18.4, 1.1 + g, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(10, 19.6, 0.9 + g * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // soft coat sheen sweeping across the hide
        const s = 0.5 + 0.5 * Math.sin(t * 1.1);
        const sx = bx - 10 + s * 20;
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([255, 255, 255], 0.32);
        ctx.beginPath();
        ctx.ellipse(sx, by - 2, 3, 6, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (season === "Autumn") {
        // a fallen leaf stirs — gentle rock + tiny drift, seamless
        const a = Math.sin(t * 1.3) * 0.5;
        const dx = Math.sin(t * 0.7) * 1.2;
        ctx.save();
        ctx.translate(11 + dx, 20.5);
        ctx.rotate(0.7 + a);
        ctx.fillStyle = rgb([212, 150, 52], p.fallenLeafAmt);
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.6, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Winter: breath-fog puff pulses outward from the muzzle + a drifting
        // snowflake + a cold sheen.
        const breathe = 0.5 + 0.5 * Math.sin(t * 1.35);
        const reach = 4 + breathe * 3;
        ctx.fillStyle = rgb([235, 244, 255], (0.18 + 0.32 * breathe) * p.breathFogAmt);
        ctx.beginPath();
        ctx.ellipse(hx - reach - 1, hy + 4.4, 2.6 + breathe * 1.8, 1.8 + breathe * 1.2, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // one drifting snowflake on a seamless 3.4s fall
        const prog = ((t / 3.4) % 1 + 1) % 1;
        const fy = -20 + prog * 36;
        const fxx = 7 + Math.sin(prog * Math.PI * 2) * 4;
        ctx.fillStyle = rgb([255, 255, 255], 0.85);
        ctx.beginPath();
        ctx.arc(fxx, fy, 1.1, 0, Math.PI * 2);
        ctx.fill();

        // cold sheen pulse on the coat
        const sheen = 0.5 + 0.5 * Math.sin(t * 0.8);
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([206, 224, 255], 0.12 + sheen * 0.12);
        ctx.beginPath();
        ctx.ellipse(bx, by, 14, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } finally {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();
    }
  };
}

// ── Forward transitions (lerp EVERY field through quintic smoothstep) ────────

function makeTransition(fromIdx: 0 | 1 | 2) {
  const from = SEASON_NAMES[fromIdx];
  const to = SEASON_NAMES[fromIdx + 1];
  return (ctx: CanvasRenderingContext2D, pp: number): void => {
    const k = smoother(clamp01(pp));
    paint(ctx, lerpP(SP[from], SP[to], k), 0);
  };
}

const springToSummer = makeTransition(0);
const summerToAutumn = makeTransition(1);
const autumnToWinter = makeTransition(2);

// ── Public exports ──────────────────────────────────────────────────────────

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
