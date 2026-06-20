// Seasonal art for the BIRD PHOENIX board tile (`tile_bird_phoenix`).
//
// A SINGLE parameterized paint renders the whole tile (ground pad +
// surroundings + the one mythical phoenix + seasonal light) from a tweenable
// parameter set `P`. The four seasons are just four `P` presets; the three
// forward transitions lerp EVERY field of `P` through a quintic smoothstep, so
// transition(0) === the from-season still and transition(1) === the to-season
// still — no snap.
//
// PALETTE LOCK (the bird's IDENTITY): the phoenix is ALWAYS the same graceful
// bird with fiery orange-gold glowing plumage and a long flame-like sweeping
// tail, wrapped in a faint warm ember glow with a few rising ember sparks. Its
// FIRE is its identity and stays roughly constant warmth in EVERY season — we
// do NOT brighten/flash it. Seasons change the PAD + surroundings + the light
// wash, NOT the bird's fire. Summer is the richest blaze (peak); winter sits in
// a small MELT RING (its heat melts the surrounding snow into a wet dark ring
// with steam wisps), the fire still glowing warm against cold blue light.
//
// Origin-centered in the −24..+24 design box, light from upper-left. Animations
// are deterministic (sin/cos/modulo of `t` in seconds), seamless, and subtle.
// The subject's breathing bob has zero velocity at t=0 (A*(1-cos(w t))*0.5) so
// anim(…,0) matches the still exactly. The flame flicker and ember sparks are
// ADDITIVE micro-motion that keep the body's overall brightness stable — no
// strobe, no brightness flash.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Small math helpers ──────────────────────────────────────────────────────

type RGB = [number, number, number];

function clamp01(x: number): number {
  if (!(x >= 0)) return 0; // also catches NaN
  return x > 1 ? 1 : x;
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
function smoother(x: number): number {
  return x * x * x * (x * (6 * x - 15) + 10);
}

// breathing bob: A*(1-cos(w t))*0.5 — value AND velocity are 0 at t=0,
// seamless over a 2π/w period, peak amplitude A.
function bobAt(t: number, amp = 1.0, w = 1.5): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────
//
// NOTE the palette lock: every fire colour below is held nearly constant across
// the four seasons (only the tiniest warmth nudge, summer = peak). The seasons
// move the pad / surroundings / light / dressing amounts, never the bird's fire.

interface P {
  // — the phoenix's fiery plumage (LOCKED identity colours) —
  plumeLight: RGB; // brightest gold of the lit upper plumage
  plumeMid: RGB; // body orange-gold
  plumeDeep: RGB; // deep fiery red-orange in the shadowed plumage / tail roots
  crest: RGB; // crest + wing-tip flame accents
  beakLeg: RGB; // beak / legs (warm horn)
  emberGlow: RGB; // the faint warm ember halo colour
  // — pad + surroundings (these MOVE with season) —
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  // — dressing amounts (0..1) —
  fireWarmth: number; // 0..1 small warmth/saturation nudge of the blaze (summer=peak)
  emberSparkAmt: number; // 0..1 how many ember sparks rise around the bird
  blossomAmt: number; // 0..1 tiny blossoms on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad (autumn)
  padSnowAmt: number; // 0..1 snow blanket on the pad (winter, OUTSIDE the melt ring)
  meltRingAmt: number; // 0..1 wet dark melt ring around the bird (winter)
  steamAmt: number; // 0..1 steam/mist wisps rising from the melt ring (winter)
}

// Four season presets. The phoenix stays the SAME fiery orange-gold bird; only
// the pad, surroundings, light and dressing differ. Fire colours barely move.
const SP: Record<SeasonName, P> = {
  // Spring — fiery plumage; dewy bright-lime pad + blossom; a few ember sparks.
  Spring: {
    plumeLight: [255, 214, 96],
    plumeMid: [248, 150, 40],
    plumeDeep: [206, 70, 24],
    crest: [255, 176, 56],
    beakLeg: [196, 132, 60],
    emberGlow: [255, 168, 70],
    padGrass: [128, 206, 86], // bright lime dewy grass
    soil: [86, 132, 54],
    outline: [82, 36, 22],
    lightWash: [220, 240, 255], // cool-bright
    lightWashAmt: 0.14,
    fireWarmth: 0.78,
    emberSparkAmt: 0.5,
    blossomAmt: 0.7,
    fallenLeafAmt: 0,
    padSnowAmt: 0,
    meltRingAmt: 0,
    steamAmt: 0,
  },
  // Summer — richest blazing orange-gold (PEAK); saturated mid-green pad.
  Summer: {
    plumeLight: [255, 224, 110],
    plumeMid: [255, 150, 30],
    plumeDeep: [214, 60, 18],
    crest: [255, 186, 48],
    beakLeg: [200, 134, 58],
    emberGlow: [255, 160, 60],
    padGrass: [86, 168, 64], // saturated mid-green
    soil: [58, 110, 40],
    outline: [86, 34, 18],
    lightWash: [255, 240, 200], // warm
    lightWashAmt: 0.16,
    fireWarmth: 1.0, // PEAK blaze
    emberSparkAmt: 0.85,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    padSnowAmt: 0,
    meltRingAmt: 0,
    steamAmt: 0,
  },
  // Autumn — warm fiery plumage; olive-tan browning pad; a couple fallen leaves.
  Autumn: {
    plumeLight: [252, 204, 92],
    plumeMid: [244, 140, 36],
    plumeDeep: [198, 62, 22],
    crest: [250, 168, 50],
    beakLeg: [190, 126, 56],
    emberGlow: [252, 158, 64],
    padGrass: [156, 142, 78], // olive-tan
    soil: [104, 84, 44],
    outline: [80, 36, 20],
    lightWash: [255, 200, 130], // low amber
    lightWashAmt: 0.2,
    fireWarmth: 0.82,
    emberSparkAmt: 0.6,
    blossomAmt: 0,
    fallenLeafAmt: 0.7,
    padSnowAmt: 0,
    meltRingAmt: 0,
    steamAmt: 0,
  },
  // Winter — cold blue-grey light; pad snow-covered FURTHER OUT, but the bird's
  // heat melts a wet dark MELT RING around it with rising steam. Fire still warm.
  Winter: {
    plumeLight: [252, 206, 96],
    plumeMid: [246, 142, 36],
    plumeDeep: [202, 64, 22],
    crest: [250, 170, 52],
    beakLeg: [188, 128, 64],
    emberGlow: [255, 156, 66],
    padGrass: [206, 222, 238], // muted grey-green under snow
    soil: [140, 158, 180],
    outline: [70, 52, 56],
    lightWash: [200, 220, 250], // cool blue-grey
    lightWashAmt: 0.26,
    fireWarmth: 0.8, // still warm — NOT dimmed, NOT flashed
    emberSparkAmt: 0.45,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    padSnowAmt: 0.85,
    meltRingAmt: 0.9,
    steamAmt: 0.75,
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    plumeLight: lerpRGB(a.plumeLight, b.plumeLight, t),
    plumeMid: lerpRGB(a.plumeMid, b.plumeMid, t),
    plumeDeep: lerpRGB(a.plumeDeep, b.plumeDeep, t),
    crest: lerpRGB(a.crest, b.crest, t),
    beakLeg: lerpRGB(a.beakLeg, b.beakLeg, t),
    emberGlow: lerpRGB(a.emberGlow, b.emberGlow, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    fireWarmth: lerp(a.fireWarmth, b.fireWarmth, t),
    emberSparkAmt: lerp(a.emberSparkAmt, b.emberSparkAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    meltRingAmt: lerp(a.meltRingAmt, b.meltRingAmt, t),
    steamAmt: lerp(a.steamAmt, b.steamAmt, t),
  };
}

// clamp every scalar field defensively (never throw on a wild `p`)
function clampP(p: P): P {
  return {
    ...p,
    lightWashAmt: clamp01(p.lightWashAmt),
    fireWarmth: clamp01(p.fireWarmth),
    emberSparkAmt: clamp01(p.emberSparkAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    meltRingAmt: clamp01(p.meltRingAmt),
    steamAmt: clamp01(p.steamAmt),
  };
}

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat ground pad the phoenix stands on
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

  // grass / ground top
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

  // pad snow blanket (winter) — settled snow on the OUTER pad, beyond the ring
  if (p.padSnowAmt > 0.001) {
    ctx.fillStyle = rgb([244, 250, 255], 0.88 * p.padSnowAmt);
    ctx.beginPath();
    ctx.ellipse(0, 18.6, 17.4, 4.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // a couple of frost glints on the outer snow
    ctx.fillStyle = rgb([255, 255, 255], 0.7 * p.padSnowAmt);
    for (const [sx, sy] of [[-13, 18.6], [13, 18.2], [-9, 20.4], [11, 20.6]] as const) {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // MELT RING (winter) — the phoenix's heat melts the snow around it into a wet
  // dark ring: a dark damp ellipse with a faint wet sheen, snow remaining
  // further out (drawn above by padSnow). Reads as bare wet ground around the bird.
  if (p.meltRingAmt > 0.001) {
    const a = p.meltRingAmt;
    // wet dark ground patch right under/around the bird
    ctx.fillStyle = rgb([54, 46, 50], 0.62 * a);
    ctx.beginPath();
    ctx.ellipse(0, 19.2, 11.5, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // inner darker damp core
    ctx.fillStyle = rgb([40, 34, 40], 0.55 * a);
    ctx.beginPath();
    ctx.ellipse(0, 19.4, 8.2, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // wet sheen reflecting the warm fire
    ctx.fillStyle = rgb([255, 170, 80], 0.22 * a);
    ctx.beginPath();
    ctx.ellipse(-1.5, 18.8, 6, 1.7, 0, 0, Math.PI * 2);
    ctx.fill();
    // slushy bright snow lip where melt meets snow
    ctx.strokeStyle = rgb([226, 238, 250], 0.5 * a);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 19.2, 11.5, 3.6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // tiny blossoms (spring)
  if (p.blossomAmt > 0.001) {
    for (const [bx, by] of [[-12, 18.5], [10, 20], [0, 21], [14, 19]] as const) {
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
      [1, 21, 0.2, [168, 80, 40]],
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

// the faint warm ember GLOW halo around the bird — its identity, painted UNDER
// the body so it reads as a constant warm aura (not a flash on the body itself).
function paintEmberGlow(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number): void {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const r = 17;
  const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
  // warmth held roughly constant (small fireWarmth nudge only)
  const a = 0.16 + 0.07 * p.fireWarmth;
  g.addColorStop(0, rgb(p.emberGlow, a));
  g.addColorStop(0.55, rgb(p.emberGlow, a * 0.45));
  g.addColorStop(1, rgb(p.emberGlow, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// one leg: a short warm-horn cylinder with a clawed foot at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  ctx.strokeStyle = rgb(p.beakLeg);
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // little splayed toes
  ctx.lineWidth = 1.3;
  for (const dx of [-1.8, 0, 1.8]) {
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + dx, baseY + 1.4);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

// The long flame-like sweeping TAIL — a fan of curved flame plumes sweeping up
// and to the right behind the body. `flick` (design px) bends the plume tips.
function paintTail(ctx: CanvasRenderingContext2D, p: P, bx: number, by: number, flick: number): void {
  // tail root sits at the lower-right rear of the body; plumes sweep up-right.
  const rootX = bx + 7;
  const rootY = by + 3;
  // each plume: [spread angle bias, length, width, colour]
  const plumes: Array<[number, number, number, RGB]> = [
    [-0.10, 22, 5.2, p.plumeDeep],
    [0.18, 26, 5.6, p.plumeMid],
    [0.42, 23, 4.8, p.crest],
    [0.66, 18, 3.8, p.plumeLight],
  ];
  plumes.forEach(([ang, len, wid, col], i) => {
    // tip sweeps up and to the right; flick adds a gentle flame-lick wobble
    const f = flick * (0.5 + i * 0.22);
    const dirX = Math.cos(ang) ;
    const tipX = rootX + dirX * len + f;
    const tipY = rootY - Math.cos(ang * 0.6) * len * 0.9 - len * 0.18;
    const ctrlX = rootX + dirX * len * 0.45 + f * 0.5;
    const ctrlY = rootY - len * 0.55;
    ctx.fillStyle = rgb(col);
    ctx.beginPath();
    ctx.moveTo(rootX - wid * 0.5, rootY);
    ctx.quadraticCurveTo(ctrlX - wid * 0.5, ctrlY, tipX, tipY);
    ctx.quadraticCurveTo(ctrlX + wid * 0.6, ctrlY + 1.5, rootX + wid * 0.5, rootY + 1);
    ctx.closePath();
    ctx.fill();
    // bright flame core up the inner edge of the plume
    ctx.strokeStyle = rgb(p.plumeLight, 0.5);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, tipX - f * 0.3, tipY + 1.5);
    ctx.stroke();
  });
}

// the whole phoenix, standing front-¾ turned toward lower-left
function paintPhoenix(ctx: CanvasRenderingContext2D, p: P, bob: number, tailFlick: number): void {
  // body centre lifts with the breathing bob
  const bx = -2;
  const by = 4 - bob;

  // warm ember glow halo first (under everything, constant warmth)
  paintEmberGlow(ctx, p, bx, by - 1);

  // legs (behind the body); contact on the pad
  paintLeg(ctx, p, bx + 1.5, by + 7, 18.6);
  paintLeg(ctx, p, bx - 2.5, by + 7, 19.0);

  // TAIL behind the body (drawn before the body so the body overlaps its root)
  paintTail(ctx, p, bx, by, tailFlick);

  // ── BODY — a graceful plump teardrop, breast toward lower-left ──────────────
  // outline pass
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(bx, by, 9.2, 10.4, -0.12, 0, Math.PI * 2);
  ctx.fill();
  // deep fiery underbelly / shadow
  ctx.fillStyle = rgb(p.plumeDeep);
  ctx.beginPath();
  ctx.ellipse(bx, by + 0.4, 8.4, 9.6, -0.12, 0, Math.PI * 2);
  ctx.fill();
  // mid orange-gold body
  ctx.fillStyle = rgb(p.plumeMid);
  ctx.beginPath();
  ctx.ellipse(bx - 0.6, by - 0.6, 7.6, 8.8, -0.12, 0, Math.PI * 2);
  ctx.fill();
  // lit upper-left plumage (light from upper-left)
  ctx.fillStyle = rgb(p.plumeLight);
  ctx.beginPath();
  ctx.ellipse(bx - 2.4, by - 3.2, 4.8, 5.4, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // WING folded along the body's right/back side — layered flame feathers
  ctx.save();
  ctx.translate(bx + 2.2, by - 0.5);
  ctx.rotate(-0.18);
  // wing base
  ctx.fillStyle = rgb(p.plumeDeep);
  ctx.beginPath();
  ctx.ellipse(0, 0, 5.6, 7.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // feather rows (mid then crest tips) sweeping down-right
  for (let row = 0; row < 3; row++) {
    const col = row === 2 ? p.crest : p.plumeMid;
    ctx.fillStyle = rgb(col);
    for (let i = 0; i < 3; i++) {
      const fx = -2 + i * 2.2;
      const fy = -3 + row * 3.2;
      ctx.beginPath();
      ctx.ellipse(fx, fy, 2.0, 3.4, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // breast plumage detail — soft warm feather scallops down the front
  ctx.fillStyle = rgb(p.plumeLight, 0.5);
  for (const [fx, fy] of [[-4.2, -1], [-3.6, 2], [-3.2, 5]] as const) {
    ctx.beginPath();
    ctx.ellipse(bx + fx, by + fy, 1.8, 1.2, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── HEAD (front-¾, turned lower-left) ──────────────────────────────────────
  const hx = bx - 6.5;
  const hy = by - 8.5;

  // neck (warm gradient up to the head)
  ctx.strokeStyle = rgb(p.plumeMid);
  ctx.lineWidth = 5.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx - 2, by - 3);
  ctx.quadraticCurveTo(bx - 5, by - 7, hx + 0.5, hy + 2.5);
  ctx.stroke();
  ctx.lineCap = "butt";

  // head outline + fill
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 4.6, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.plumeMid);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 4.0, 3.8, 0, 0, Math.PI * 2);
  ctx.fill();
  // lit cheek (upper-left)
  ctx.fillStyle = rgb(p.plumeLight);
  ctx.beginPath();
  ctx.ellipse(hx - 1.4, hy - 1.4, 2.2, 2.0, 0, 0, Math.PI * 2);
  ctx.fill();

  // CREST — a few upright flame plumes off the crown (identity flourish)
  for (const [cx2, cy2, len, ang] of [
    [hx + 1.2, hy - 3.4, 6, -0.2],
    [hx + 2.6, hy - 2.6, 5, 0.15],
    [hx - 0.2, hy - 3.2, 4.5, -0.5],
  ] as const) {
    ctx.fillStyle = rgb(p.crest);
    ctx.beginPath();
    ctx.moveTo(cx2 - 1.1, cy2 + 1);
    ctx.quadraticCurveTo(cx2 + Math.sin(ang) * len * 0.5, cy2 - len * 0.6, cx2 + Math.sin(ang) * len, cy2 - len);
    ctx.quadraticCurveTo(cx2 + 1.0, cy2 - len * 0.4, cx2 + 1.1, cy2 + 1);
    ctx.closePath();
    ctx.fill();
  }
  // bright crest tips
  ctx.fillStyle = rgb(p.plumeLight, 0.7);
  for (const [tx, ty] of [[hx + 1.2 + Math.sin(-0.2) * 6, hy - 3.4 - 6], [hx + 2.6 + Math.sin(0.15) * 5, hy - 2.6 - 5]] as const) {
    ctx.beginPath();
    ctx.arc(tx, ty, 1.0, 0, Math.PI * 2);
    ctx.fill();
  }

  // beak — small warm-horn cone pointing lower-left
  ctx.fillStyle = rgb(p.beakLeg);
  ctx.beginPath();
  ctx.moveTo(hx - 3.4, hy + 0.4);
  ctx.lineTo(hx - 6.4, hy + 1.8);
  ctx.lineTo(hx - 3.2, hy + 2.4);
  ctx.closePath();
  ctx.fill();

  // eye — a dark bead with a warm catchlight
  ctx.fillStyle = rgb([28, 18, 14]);
  ctx.beginPath();
  ctx.arc(hx - 1.2, hy - 0.2, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb([255, 236, 190], 0.9);
  ctx.beginPath();
  ctx.arc(hx - 1.6, hy - 0.7, 0.45, 0, Math.PI * 2);
  ctx.fill();
}

// rising ember sparks around the bird — additive warm motes (a few, drifting up).
// `rise` 0..1 phases them; kept subtle so it never strobes the body brightness.
function paintEmberSparks(ctx: CanvasRenderingContext2D, p: P, bx: number, by: number, rise: number): void {
  if (p.emberSparkAmt <= 0.001) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // a handful of seeds [x offset, phase, size]
  const seeds: Array<[number, number, number]> = [
    [-7, 0.0, 1.0],
    [5, 0.35, 0.9],
    [9, 0.62, 0.8],
    [-2, 0.8, 1.0],
    [2, 0.18, 0.7],
  ];
  const n = Math.max(1, Math.round(seeds.length * p.emberSparkAmt));
  for (let i = 0; i < n; i++) {
    const [sx, phase, sz] = seeds[i];
    const prog = ((rise + phase) % 1 + 1) % 1;
    const ey = by - 2 - prog * 20; // rise upward and fade
    const ex = bx + sx + Math.sin(prog * Math.PI * 2 + phase * 6) * 2.4;
    // fade in then out across the rise (0 at both ends → seamless)
    const fade = Math.sin(prog * Math.PI);
    ctx.fillStyle = rgb([255, 196, 96], 0.85 * fade * p.emberSparkAmt);
    ctx.beginPath();
    ctx.arc(ex, ey, sz * (0.7 + 0.5 * fade), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// steam / mist wisps rising from the winter MELT RING.
// `drift` 0..1 phases them; only present when steamAmt > 0.
function paintSteam(ctx: CanvasRenderingContext2D, p: P, drift: number): void {
  if (p.steamAmt <= 0.001) return;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const seeds: Array<[number, number]> = [
    [-7, 0.0],
    [6, 0.4],
    [0, 0.7],
  ];
  for (const [sx, phase] of seeds) {
    const prog = ((drift + phase) % 1 + 1) % 1;
    const wy = 17 - prog * 16; // rise from the melt ring upward
    const wx = sx + Math.sin(prog * Math.PI * 2 + phase * 5) * 3;
    const fade = Math.sin(prog * Math.PI); // 0 at ends → seamless
    ctx.fillStyle = rgb([232, 240, 248], 0.34 * fade * p.steamAmt);
    ctx.beginPath();
    ctx.ellipse(wx, wy, 2.6 + prog * 1.6, 3.4 + prog * 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
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
// `bob` = subject breathing offset; `tailFlick`/`emberRise`/`steamDrift` are
// additive idle motion params (all 0/at-rest for the static draw).
function paint(
  ctx: CanvasRenderingContext2D,
  pIn: P,
  bob: number,
  tailFlick = 0,
  emberRise = 0,
  steamDrift = 0,
): void {
  const p = clampP(pIn);
  ctx.save();
  try {
    paintPad(ctx, p);
    paintSteam(ctx, p, steamDrift); // mist sits behind/around the bird's lower body
    paintPhoenix(ctx, p, bob, tailFlick);
    paintEmberSparks(ctx, p, -2, 4 - bob, emberRise);
    paintLightWash(ctx, p);
  } finally {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }
}

// ── Per-season builders ─────────────────────────────────────────────────────

function draw(season: SeasonName) {
  // at-rest still: bob 0, but ember sparks / steam show their static at-rest
  // dressing (sparks/steam are dressing, not the silhouette — fine to be nonzero).
  return (ctx: CanvasRenderingContext2D): void => paint(ctx, SP[season], 0, 0, 0.2, 0.2);
}

function anim(season: SeasonName) {
  return (ctx: CanvasRenderingContext2D, t: number): void => {
    const p = clampP(SP[season]);
    const bob = bobAt(t); // SUBJECT breathing bob, 0 at t=0

    // Flame-tail flicker: a gentle additive wobble of the plume tips. Summer
    // flickers brightest (largest amplitude). Seamless sin; NO body brightness change.
    const flickAmp = 1.4 + 1.6 * p.fireWarmth + (season === "Summer" ? 1.0 : 0);
    const tailFlick = Math.sin(t * 2.3) * flickAmp + Math.sin(t * 3.7) * (0.5 * flickAmp);

    // ember sparks rise on a seamless loop; steam drifts on its own loop.
    const emberRise = (t / 2.6) % 1;
    const steamDrift = (t / 3.4) % 1;

    paint(ctx, SP[season], bob, tailFlick, emberRise, steamDrift);

    // ── Additive season micro-motion over the painted tile ──────────────────
    ctx.save();
    try {
      if (season === "Spring") {
        // dew shimmer mixed with the ember sparks — a soft glint on the dewy pad
        const g = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.4));
        ctx.fillStyle = rgb([255, 255, 255], g);
        ctx.beginPath();
        ctx.arc(-9, 18.4, 1.1 + g, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(11, 19.6, 0.9 + g * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // peak blaze: an extra bright ember mote rising near the crest (additive,
        // small — keeps overall body brightness stable)
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const pr = (t / 1.8) % 1;
        const ey = -10 + 4 - pr * 14;
        const fade = Math.sin(pr * Math.PI);
        ctx.fillStyle = rgb([255, 214, 120], 0.7 * fade);
        ctx.beginPath();
        ctx.arc(-1 + Math.sin(pr * 6) * 2, ey, 1.0 + fade * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (season === "Autumn") {
        // a fallen leaf stirs + an ember drifts — gentle rock + tiny drift
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
        // Winter: steam wisps already drift from the melt ring (in paint). Add a
        // faint cold sheen pulse on the surroundings — the fire stays warm,
        // unchanged. One drifting snowflake outside the melt ring.
        const prog = ((t / 3.4) % 1 + 1) % 1;
        const fy = -20 + prog * 30;
        const fxx = 13 + Math.sin(prog * Math.PI * 2) * 3;
        ctx.fillStyle = rgb([255, 255, 255], 0.8 * (0.5 + 0.5 * Math.sin(prog * Math.PI)));
        ctx.beginPath();
        ctx.arc(fxx, fy, 1.0, 0, Math.PI * 2);
        ctx.fill();
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
    // at-rest dressing for sparks/steam so transition(0)===draw(from) and
    // transition(1)===draw(to) (both use the same at-rest 0.2 phases).
    paint(ctx, lerpP(SP[from], SP[to], k), 0, 0, 0.2, 0.2);
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
