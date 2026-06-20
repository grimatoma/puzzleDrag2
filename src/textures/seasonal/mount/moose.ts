// Seasonal art for the MOUNT MOOSE board tile (`tile_mount_moose`).
//
// A SINGLE parameterized paint renders the whole tile (grass pad + the one
// large brown moose + seasonal dressing) from a tweenable parameter set `P`.
// The four seasons are four `P` presets; the three forward transitions lerp
// EVERY field of `P` through a quintic smoothstep, so transition(0) === the
// from-season still and transition(1) === the to-season still — no snap.
//
// PALETTE LOCK: the moose is ALWAYS the same large, dark-brown moose — a tall
// dark-brown body with a HUMPED shoulder, a long DROOPING snout, a DEWLAP
// (bell) hanging under the chin, slender dark legs, and broad PALMATE (flat,
// hand-shaped) ANTLERS spreading from the head. The SILHOUETTE and the
// dark-brown identity colours are constant across all seasons. Only the COAT
// thickness (`coatVolume`), the ANTLER STATE (`velvetAmt` — fuzzy velvety vs
// hard polished antler), the pad colour, the light wash, and dressing
// (blossom, fallen leaves, frost, back-snow, antler-snow, breath-fog) change.
// The moose is never recoloured, hollowed, or swapped, and it ALWAYS keeps its
// broad palmate antlers.
//
// Animal framing: the moose stands on the pad in front-¾, turned ~15–20°
// toward lower-left; the full body / antlers are readable and may overhang the
// pad width; the legs/hooves contact the pad.
//
// Per season:
//   Spring — soft VELVET antlers (fuzzy, rounded, velvety sheen), sleek coat,
//            dewy lime pad + blossom, cool-bright light.
//   Summer — full HARD antlers, normal coat (PEAK), saturated mid-green pad,
//            warm light, strong shadow.
//   Autumn — hard POLISHED antlers (rich), fuller coat, olive-tan pad, fallen
//            leaves (rut season), low amber light.
//   Winter — thicker coat + snow on the back AND the broad antlers + a
//            breath-fog puff at the snout, snowy pad, cool blue-grey light.
//
// Origin-centered in the −24..+24 design box, light from upper-left, flat
// cel-shaded with a soft dark outline. Animations are deterministic
// (sin/cos/modulo of `t` in seconds), seamless, and subtle: a slow heavy
// breathing bob (zero velocity at t=0 → anim(…,0) matches the still) + a slow
// head-sway (antlers tilt) + an ear flick once per loop, plus per-season
// micro-motion (spring dew shimmer on the velvet, summer coat sheen, autumn
// fallen-leaf stir, winter breath-fog pulse + drifting snowflake + antler
// snow glints).

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

// slow heavy breathing bob: A*(1-cos(w t))*0.5 — value AND velocity are 0 at
// t=0, seamless over a 2π/w period, peak amplitude A.
function bobAt(t: number, amp = 1.1, w = 1.15): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────
//
// IDENTITY colours (dark-brown coat, darker mane/legs, pale muzzle, dark
// hooves/eyes, bone antlers) stay nearly constant; they live in P only so the
// light wash + coat thickness can nudge them very slightly between seasons.
// Everything that genuinely differs per season is the coat volume + the antler
// state + pad + light + dressing amounts.

interface P {
  coatLight: RGB; // lit top of the dark-brown coat
  coatMid: RGB; // body brown tone
  coatShadow: RGB; // shaded underside of the brown coat
  mane: RGB; // darker neck/hump mane + leg tone (locked dark)
  maneShade: RGB; // deeper shade inside the mane / dewlap
  muzzle: RGB; // soft muzzle / nostril / inner ear
  hoofDark: RGB; // hooves + eyes (the dark hard parts)
  antler: RGB; // the bone of the palmate antlers (locked)
  antlerShade: RGB; // shaded underside of the antler palm
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  coatVolume: number; // 0..1 coat thickness (sleek → shaggy & puffed outline)
  gloss: number; // 0..1 glossy-coat sheen strength (summer peak)
  velvetAmt: number; // 0..1 fuzzy velvet on the antlers (spring) vs hard polish
  antlerSnowAmt: number; // 0..1 snow resting on the broad antlers (winter)
  frostAmt: number; // 0..1 frost sparkle on the coat
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad (spring)
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad (autumn)
  breathFogAmt: number; // 0..1 breath puff at the muzzle (winter)
}

// Four season presets. The moose stays the SAME dark-brown, palmate-antlered
// moose; only coat volume + antler state + pad + light + dressing differ.
const SP: Record<SeasonName, P> = {
  // Spring — sleek coat, soft VELVET antlers, dewy lime pad + blossom, cool light.
  Spring: {
    coatLight: [110, 78, 52],
    coatMid: [82, 56, 36],
    coatShadow: [54, 36, 24],
    mane: [44, 28, 18],
    maneShade: [28, 18, 12],
    muzzle: [96, 72, 62],
    hoofDark: [34, 26, 22],
    antler: [206, 184, 138], // velvety warm bone
    antlerShade: [150, 128, 88],
    padGrass: [128, 206, 86], // bright lime dewy grass
    soil: [86, 132, 54],
    outline: [38, 24, 16],
    lightWash: [214, 240, 255], // cool-bright
    lightWashAmt: 0.16,
    coatVolume: 0.16, // sleek
    gloss: 0.28,
    velvetAmt: 1, // full fuzzy velvet
    antlerSnowAmt: 0,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.65,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Summer — full HARD antlers, normal coat (PEAK), saturated pad, warm light.
  Summer: {
    coatLight: [120, 84, 54],
    coatMid: [88, 58, 36],
    coatShadow: [56, 36, 22],
    mane: [42, 26, 16],
    maneShade: [26, 16, 10],
    muzzle: [98, 72, 62],
    hoofDark: [32, 24, 20],
    antler: [224, 206, 162], // clean hard bone
    antlerShade: [164, 142, 100],
    padGrass: [86, 170, 64], // saturated mid-green
    soil: [58, 112, 40],
    outline: [36, 22, 14],
    lightWash: [255, 244, 206], // warm
    lightWashAmt: 0.14,
    coatVolume: 0.44, // normal full coat
    gloss: 0.9, // glossiest peak
    velvetAmt: 0, // shed velvet — hard antler
    antlerSnowAmt: 0,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  // Autumn — hard POLISHED antlers (rich), fuller coat, olive-tan pad, leaves.
  Autumn: {
    coatLight: [112, 76, 48],
    coatMid: [84, 54, 32],
    coatShadow: [54, 34, 20],
    mane: [44, 28, 18],
    maneShade: [28, 17, 10],
    muzzle: [94, 70, 60],
    hoofDark: [34, 26, 22],
    antler: [200, 168, 116], // rich polished bone
    antlerShade: [142, 112, 70],
    padGrass: [156, 142, 78], // olive-tan
    soil: [104, 84, 44],
    outline: [38, 24, 16],
    lightWash: [255, 206, 138], // low amber
    lightWashAmt: 0.2,
    coatVolume: 0.66, // fuller coat
    gloss: 0.4,
    velvetAmt: 0, // hard polished antler
    antlerSnowAmt: 0,
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.75,
    breathFogAmt: 0,
  },
  // Winter — thick coat + back-snow + antler-snow + breath fog, snowy pad, cool.
  Winter: {
    coatLight: [98, 72, 52],
    coatMid: [74, 52, 36],
    coatShadow: [50, 34, 24],
    mane: [44, 30, 22],
    maneShade: [28, 18, 14],
    muzzle: [96, 74, 66],
    hoofDark: [40, 32, 28],
    antler: [196, 180, 150], // cool muted bone
    antlerShade: [140, 124, 100],
    padGrass: [222, 232, 244], // snow on the pad
    soil: [150, 168, 190],
    outline: [40, 28, 20],
    lightWash: [206, 222, 248], // cool blue-grey
    lightWashAmt: 0.24,
    coatVolume: 1, // thick & shaggy
    gloss: 0.18,
    velvetAmt: 0, // hard antler, but snow-capped
    antlerSnowAmt: 0.8,
    frostAmt: 0.6,
    backSnowAmt: 0.7,
    padSnowAmt: 0.85,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.7,
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    coatLight: lerpRGB(a.coatLight, b.coatLight, t),
    coatMid: lerpRGB(a.coatMid, b.coatMid, t),
    coatShadow: lerpRGB(a.coatShadow, b.coatShadow, t),
    mane: lerpRGB(a.mane, b.mane, t),
    maneShade: lerpRGB(a.maneShade, b.maneShade, t),
    muzzle: lerpRGB(a.muzzle, b.muzzle, t),
    hoofDark: lerpRGB(a.hoofDark, b.hoofDark, t),
    antler: lerpRGB(a.antler, b.antler, t),
    antlerShade: lerpRGB(a.antlerShade, b.antlerShade, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    coatVolume: lerp(a.coatVolume, b.coatVolume, t),
    gloss: lerp(a.gloss, b.gloss, t),
    velvetAmt: lerp(a.velvetAmt, b.velvetAmt, t),
    antlerSnowAmt: lerp(a.antlerSnowAmt, b.antlerSnowAmt, t),
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
    gloss: clamp01(p.gloss),
    velvetAmt: clamp01(p.velvetAmt),
    antlerSnowAmt: clamp01(p.antlerSnowAmt),
    frostAmt: clamp01(p.frostAmt),
    backSnowAmt: clamp01(p.backSnowAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    breathFogAmt: clamp01(p.breathFogAmt),
  };
}

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat grass pad the moose stands on
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

// one slender leg: a thin dark cannon with a dark hoof at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  // dark leg with outline
  ctx.strokeStyle = rgb(p.outline);
  ctx.lineWidth = 3.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  ctx.strokeStyle = rgb(p.mane);
  ctx.lineWidth = 2.3;
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY - 1.4);
  ctx.stroke();
  // dark hoof
  ctx.fillStyle = rgb(p.hoofDark);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 2.0, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// Trace the moose's deep barrel body path (constant silhouette). cx,cy = body
// centre. vol modestly puffs/shaggies the outline; the underlying shape is
// constant. The body is a bit larger and deeper than a horse's.
function bodyPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, vol: number): void {
  const rx = 13.0 * (0.97 + vol * 0.12);
  const ry = 8.6 * (0.97 + vol * 0.14);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, -0.04, 0, Math.PI * 2);
}

// ── One broad PALMATE antler (flat, hand-shaped) ─────────────────────────────
//
// Drawn around a local origin at the antler's base on the crown; `side` is -1
// (the moose's left, screen-left) or +1. A short beam runs out and up to a flat
// palm whose outer edge sprouts several finger-like tines. `velvet` softens the
// edge to a fuzzy rounded velvety look; `snow` rests a white cap on the palm's
// upward face; the antler colour is locked (`p.antler`).
function paintAntler(
  ctx: CanvasRenderingContext2D,
  p: P,
  baseX: number,
  baseY: number,
  side: 1 | -1,
  velvet: number,
  snow: number,
): void {
  ctx.save();
  ctx.translate(baseX, baseY);
  // outward spread; the screen-left antler reads bigger (nearer in the ¾ view)
  ctx.scale(side, 1);

  // beam from base out to the palm centre
  const palmX = 9.5;
  const palmY = -7.5;

  // outline pass — a fat soft halo, slightly fuzzier with velvet
  ctx.strokeStyle = rgb(p.outline, 0.95);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = 4.4 + velvet * 1.0;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(4.5, -3.5, palmX, palmY);
  ctx.stroke();

  // the broad flat palm — a rounded fan, outline first
  const fingers: Array<[number, number]> = [
    [4.0, -7.2],
    [7.6, -8.6],
    [11.0, -8.4],
    [13.6, -6.4],
    [14.4, -3.4],
  ];
  const palmPath = (): void => {
    ctx.beginPath();
    // inner base of the palm near the beam tip
    ctx.moveTo(palmX - 4.5, palmY + 2.2);
    ctx.quadraticCurveTo(palmX - 5.0, palmY - 3.0, palmX - 1.8, palmY - 4.4);
    // sweep across the finger tips along the outer edge
    for (const [fx, fy] of fingers) {
      ctx.lineTo(palmX + fx - 5.5, palmY + fy + 4.0);
    }
    // back down the outer-lower rim to the beam
    ctx.quadraticCurveTo(palmX + 8.0, palmY + 4.4, palmX + 3.5, palmY + 4.8);
    ctx.quadraticCurveTo(palmX - 1.0, palmY + 4.6, palmX - 4.5, palmY + 2.2);
    ctx.closePath();
  };
  // outline halo around the palm
  ctx.fillStyle = rgb(p.outline, 0.95);
  ctx.save();
  ctx.translate(palmX, palmY);
  ctx.scale(1.16, 1.18);
  ctx.translate(-palmX, -palmY);
  palmPath();
  ctx.fill();
  ctx.restore();

  // beam fill (bone)
  ctx.strokeStyle = rgb(p.antlerShade);
  ctx.lineWidth = 3.0 + velvet * 0.8;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(4.5, -3.5, palmX, palmY);
  ctx.stroke();
  ctx.strokeStyle = rgb(p.antler);
  ctx.lineWidth = 1.7 + velvet * 0.5;
  ctx.beginPath();
  ctx.moveTo(0.4, 0);
  ctx.quadraticCurveTo(4.8, -3.6, palmX, palmY - 0.4);
  ctx.stroke();

  // shaded palm
  ctx.fillStyle = rgb(p.antlerShade);
  palmPath();
  ctx.fill();
  // lit palm, offset up-left (light from upper-left → in local space, up-left
  // means up and toward the beam side, which the side-flip handles)
  ctx.save();
  ctx.fillStyle = rgb(p.antler);
  ctx.translate(-1.2, -1.4);
  ctx.scale(0.92, 0.92);
  ctx.translate(palmX, palmY);
  ctx.translate(-palmX, -palmY);
  palmPath();
  ctx.fill();
  ctx.restore();

  // a couple of grooves between the finger tines for the palmate read
  ctx.strokeStyle = rgb(p.antlerShade, 0.85);
  ctx.lineWidth = 1.0;
  for (const [fx, fy] of fingers) {
    ctx.beginPath();
    ctx.moveTo(palmX - 1.5, palmY + 1.5);
    ctx.lineTo(palmX + fx - 5.5, palmY + fy + 4.4);
    ctx.stroke();
  }

  // velvet — fuzzy rounded dabs hugging the palm edge + a soft velvety sheen
  if (velvet > 0.02) {
    ctx.fillStyle = rgb([214, 196, 156], 0.5 * velvet);
    for (const [fx, fy] of fingers) {
      ctx.beginPath();
      ctx.arc(palmX + fx - 5.5, palmY + fy + 4.0, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // velvety highlight wash across the palm
    ctx.save();
    palmPath();
    ctx.clip();
    ctx.fillStyle = rgb([236, 222, 188], 0.28 * velvet);
    ctx.beginPath();
    ctx.ellipse(palmX, palmY - 1, 8, 4, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    // hard antler — a small polished specular glint on the palm
    ctx.fillStyle = rgb([255, 255, 255], 0.3);
    ctx.beginPath();
    ctx.ellipse(palmX - 1, palmY - 2, 2.2, 1.2, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // snow resting on the broad antler palm (winter)
  if (snow > 0.02) {
    ctx.save();
    palmPath();
    ctx.clip();
    ctx.fillStyle = rgb([248, 252, 255], 0.92 * snow);
    ctx.beginPath();
    ctx.ellipse(palmX + 1, palmY - 2.4, 8.4, 3.4, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = rgb([255, 255, 255], 0.85 * snow);
    for (const [fx, fy] of fingers) {
      ctx.beginPath();
      ctx.arc(palmX + fx - 5.5, palmY + fy + 3.0, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.lineCap = "butt";
  ctx.restore();
}

// the whole moose, standing front-¾ turned ~15-20° toward lower-left.
// headSway tilts the head (and therefore the antlers) gently.
function paintMoose(
  ctx: CanvasRenderingContext2D,
  p: P,
  bob: number,
  headSway = 0,
): void {
  // body centre lifts with the breathing bob
  const bx = 2;
  const by = 3 - bob;
  const vol = p.coatVolume;

  // legs first (behind the body). Two far (dimmer/higher), two near. Long legs.
  ctx.save();
  ctx.globalAlpha = 0.9;
  paintLeg(ctx, p, bx + 8.5, by + 5.5, 18.6);
  paintLeg(ctx, p, bx - 3.5, by + 5.5, 18.8);
  ctx.restore();
  // near legs (toward lower-left, slightly forward)
  paintLeg(ctx, p, bx + 5.5, by + 6, 19.6);
  paintLeg(ctx, p, bx - 6.5, by + 6, 19.8);

  // ── BODY barrel — outline pass then light fill (layered like wheat) ─────────
  // outline halo
  ctx.fillStyle = rgb(p.outline);
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(1.1, 1.14);
  ctx.translate(-bx, -by);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  ctx.restore();

  // shaded coat
  ctx.fillStyle = rgb(p.coatShadow);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  // mid coat
  ctx.fillStyle = rgb(p.coatMid);
  ctx.save();
  ctx.translate(-0.4, -0.4);
  bodyPath(ctx, bx, by, vol);
  ctx.fill();
  ctx.restore();
  // lit coat, offset up-left (light from upper-left)
  ctx.save();
  ctx.fillStyle = rgb(p.coatLight);
  ctx.translate(-1.6, -1.8);
  bodyPath(ctx, bx, by, vol * 0.7);
  ctx.fill();
  ctx.restore();

  // ── HUMPED SHOULDER — a raised mass over the front of the back (the moose's
  //    signature). Sits at the front/upper of the barrel. ─────────────────────
  {
    const humpX = bx - 4.5;
    const humpY = by - 7.4;
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.ellipse(humpX, humpY, 7.4, 5.4, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(p.coatShadow);
    ctx.beginPath();
    ctx.ellipse(humpX, humpY, 6.4, 4.6, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(p.coatMid);
    ctx.beginPath();
    ctx.ellipse(humpX - 0.6, humpY - 0.8, 5.6, 3.9, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(p.coatLight);
    ctx.beginPath();
    ctx.ellipse(humpX - 1.4, humpY - 1.6, 4.0, 2.6, -0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  // glossy coat sheen band over the back (summer peak — gloss strong)
  if (p.gloss > 0.02) {
    ctx.save();
    bodyPath(ctx, bx, by, vol);
    ctx.clip();
    ctx.fillStyle = rgb([255, 255, 255], 0.1 + 0.16 * p.gloss);
    ctx.beginPath();
    ctx.ellipse(bx - 1, by - 4.6, 9, 2.4, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // shaggy winter coat fringe: a few soft tufts along the lower/belly edge,
  // only when the coat is thick (vol high). Constant silhouette otherwise.
  if (vol > 0.55) {
    const fr = (vol - 0.55) / 0.45;
    ctx.fillStyle = rgb(p.coatShadow, 0.9);
    const rx = 13.0 * (0.97 + vol * 0.12);
    const ry = 8.6 * (0.97 + vol * 0.14);
    for (let i = 0; i < 10; i++) {
      const a = Math.PI * 0.12 + (i / 9) * Math.PI * 0.95; // lower-front arc
      const lx = bx + Math.cos(a) * rx * 1.02;
      const ly = by + Math.sin(a) * ry * 1.02;
      ctx.beginPath();
      ctx.arc(lx, ly, (1.3 + 0.9 * fr) * (i % 2 ? 1 : 0.8), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // snow settled on the back + hump (winter)
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgb([248, 252, 255], 0.92 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 2, by - 8.2, 9.5 * (0.9 + vol * 0.2), 3.2, -0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb([255, 255, 255], 0.85 * p.backSnowAmt);
    for (const [dx, dy] of [[-7, -9.4], [-1, -9.0], [5, -7.8]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.5 + vol * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the coat (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([255, 255, 255], 0.7 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-7, 0], [-2, 4], [4, -1], [8, 2], [0, -3], [-4, -5], [6, 4],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── NECK + HEAD (front-¾, lower-left). A long head with a drooping snout, a
  //    dewlap (bell) under the chin, broad palmate antlers above. headSway
  //    tilts the head and the antlers gently. ─────────────────────────────────
  const neckTopX = bx - 8;
  const neckTopY = by - 4;
  const hx = bx - 16; // head centre
  const hy = by + 1; // head sits a touch low (the moose carries its head level)

  // neck — a thick tapering dark-brown wedge from the shoulder to the head
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.moveTo(bx - 2, by - 7);
  ctx.quadraticCurveTo(neckTopX - 1, neckTopY - 2, hx + 3.0, hy - 4.5);
  ctx.lineTo(hx + 5.0, hy + 3.5);
  ctx.quadraticCurveTo(neckTopX + 3, by + 2, bx, by + 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgb(p.coatMid);
  ctx.beginPath();
  ctx.moveTo(bx - 2, by - 6.6);
  ctx.quadraticCurveTo(neckTopX - 0.6, neckTopY - 1.4, hx + 3.1, hy - 4);
  ctx.lineTo(hx + 4.6, hy + 3);
  ctx.quadraticCurveTo(neckTopX + 3, by + 1.6, bx, by + 3.4);
  ctx.closePath();
  ctx.fill();
  // lit front edge of the neck
  ctx.strokeStyle = rgb(p.coatLight, 0.7);
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(hx + 4.4, hy + 2.6);
  ctx.quadraticCurveTo(neckTopX + 3, by + 1.4, bx, by + 3);
  ctx.stroke();
  ctx.lineCap = "butt";

  // dark mane crest along the top of the neck / hump
  ctx.strokeStyle = rgb(p.maneShade);
  ctx.lineWidth = 2.6 * (0.9 + vol * 0.2);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx - 2, by - 7.4);
  ctx.quadraticCurveTo(neckTopX - 1, neckTopY - 2.6, hx + 2.6, hy - 5.0);
  ctx.stroke();
  ctx.lineCap = "butt";

  // ── head group (tilts with headSway) ───────────────────────────────────────
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(headSway);

  // broad palmate ANTLERS — drawn first so the crown overlaps their bases.
  // bases sit just above/behind the brow; the antlers spread wide.
  paintAntler(ctx, p, 1.6, -5.4, 1, p.velvetAmt, p.antlerSnowAmt);
  paintAntler(ctx, p, -1.6, -5.4, -1, p.velvetAmt, p.antlerSnowAmt);

  // ears, low and to the sides, just under the antler bases
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(side * 3.0, -3.6);
    ctx.rotate(-0.1 + side * 0.5);
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.5, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(p.coatMid);
    ctx.beginPath();
    ctx.ellipse(0, 0.2, 1.0, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(p.muzzle, 0.8);
    ctx.beginPath();
    ctx.ellipse(0, 0.2, 0.5, 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // head — a long dark wedge with a heavy DROOPING snout. Local origin at the
  // brow; the muzzle bulges down-left (toward screen lower-left after the body
  // ¾ turn). Drawn as a rotated long ovoid.
  ctx.save();
  ctx.rotate(0.28);
  // outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(-1, 2.0, 4.6, 7.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // brown face fill (shaded then lit)
  ctx.fillStyle = rgb(p.coatShadow);
  ctx.beginPath();
  ctx.ellipse(-1, 2.0, 3.9, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.coatMid);
  ctx.beginPath();
  ctx.ellipse(-1.4, 1.4, 3.4, 6.0, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.coatLight);
  ctx.beginPath();
  ctx.ellipse(-1.8, 0.6, 2.4, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // the bulbous DROOPING snout — a soft rounded muzzle overhanging the lower face
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(-1.2, 8.4, 3.6, 3.2, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.muzzle);
  ctx.beginPath();
  ctx.ellipse(-1.4, 8.0, 2.9, 2.6, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(p.coatShadow, 0.6);
  ctx.beginPath();
  ctx.ellipse(-0.6, 9.2, 2.2, 1.5, -0.15, 0, Math.PI * 2);
  ctx.fill();
  // nostril
  ctx.fillStyle = rgb(p.hoofDark, 0.85);
  ctx.beginPath();
  ctx.ellipse(-1.8, 8.6, 0.7, 1.0, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // eye
  ctx.fillStyle = rgb(p.hoofDark);
  ctx.beginPath();
  ctx.ellipse(0.6, 1.6, 1.0, 1.3, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb([255, 255, 255], 0.5);
  ctx.beginPath();
  ctx.arc(0.3, 1.1, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore(); // end rotated head

  // DEWLAP (bell) — a dark flap of skin/fur hanging straight down under the chin
  {
    const dlx = -2.4;
    const dly = 8.0;
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.moveTo(dlx - 1.6, dly);
    ctx.quadraticCurveTo(dlx - 2.6, dly + 6.5, dlx - 0.4, dly + 8.4);
    ctx.quadraticCurveTo(dlx + 1.8, dly + 6.5, dlx + 1.4, dly);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgb(p.maneShade);
    ctx.beginPath();
    ctx.moveTo(dlx - 1.1, dly);
    ctx.quadraticCurveTo(dlx - 2.0, dly + 6.0, dlx - 0.4, dly + 7.6);
    ctx.quadraticCurveTo(dlx + 1.3, dly + 6.0, dlx + 1.0, dly);
    ctx.closePath();
    ctx.fill();
    // a soft lit edge on the dewlap
    ctx.strokeStyle = rgb(p.mane, 0.7);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(dlx - 1.0, dly + 1);
    ctx.quadraticCurveTo(dlx - 1.8, dly + 5.4, dlx - 0.5, dly + 7.0);
    ctx.stroke();
  }

  ctx.restore(); // end head group transform

  // breath-fog puff at the snout (winter) — at rest a faint static puff.
  // Snout in world space ≈ head centre + drooped muzzle offset.
  if (p.breathFogAmt > 0.001) {
    ctx.fillStyle = rgb([235, 244, 255], 0.4 * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(hx - 5.6, hy + 8.6, 3.0, 2.0, 0.2, 0, Math.PI * 2);
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

function paint(
  ctx: CanvasRenderingContext2D,
  pIn: P,
  bob: number,
  headSway = 0,
): void {
  const p = clampP(pIn);
  ctx.save();
  try {
    ctx.lineJoin = "round";
    paintPad(ctx, p);
    paintMoose(ctx, p, bob, headSway);
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
    const bob = bobAt(t); // SUBJECT slow heavy breathing bob, 0 at t=0

    // slow continuous head-sway (the antlers tilt gently). Small amplitude — a
    // soft idle, not the silhouette. Seamless sine.
    const headSway = Math.sin(t * 0.85) * 0.05;

    paint(ctx, SP[season], bob, headSway);

    // ── Additive micro-motion, drawn over the painted tile ──────────────────
    ctx.save();
    try {
      const bx = 2;
      const by = 3 - bob;
      const hx = bx - 16;
      const hy = by + 1;

      // Occasional ear flick once per ~5s loop. Sharp brief bump, seamless.
      const loop = (t % 5) / 5; // 0..1
      const flickGate = Math.max(0, Math.sin(loop * Math.PI * 2)) ** 6; // brief
      const flick = Math.sin(t * 9) * flickGate;

      // ear flick (redraw the near ear flicking over the existing one). The ear
      // sits in the head group; approximate its world transform here.
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(headSway);
      ctx.translate(-3.0, -3.6);
      ctx.rotate(-0.1 - 0.5 + flick * 0.5);
      ctx.fillStyle = rgb(p.outline);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.5, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgb(p.coatMid);
      ctx.beginPath();
      ctx.ellipse(0, 0.2, 1.0, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (season === "Spring") {
        // dew shimmer on the velvet antlers + the grass/blossoms
        const g = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.4));
        ctx.fillStyle = rgb([255, 255, 255], g);
        // glints on the velvety palms (left antler reads bigger)
        ctx.beginPath();
        ctx.arc(hx - 8, hy - 12, 0.9 + g * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hx + 9, hy - 12, 0.8 + g * 0.6, 0, Math.PI * 2);
        ctx.fill();
        // dew on the pad
        ctx.beginPath();
        ctx.arc(-8, 18.4, 1.0 + g, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // glossy coat sheen sweeping across the hide
        const s = 0.5 + 0.5 * Math.sin(t * 1.05);
        const sx = bx - 9 + s * 18;
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([255, 255, 255], 0.32);
        ctx.beginPath();
        ctx.ellipse(sx, by - 2, 2.8, 5.6, 0.3, 0, Math.PI * 2);
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
        // Winter: breath-fog puff pulses outward from the snout + a drifting
        // snowflake + a snow glint on the antlers + a cold sheen.
        const breathe = 0.5 + 0.5 * Math.sin(t * 1.15);
        const reach = 4 + breathe * 3;
        ctx.fillStyle = rgb([235, 244, 255], (0.18 + 0.32 * breathe) * p.breathFogAmt);
        ctx.beginPath();
        ctx.ellipse(hx - reach - 1.6, hy + 8.6, 2.6 + breathe * 1.8, 1.8 + breathe * 1.2, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // one drifting snowflake on a seamless 3.4s fall
        const prog = ((t / 3.4) % 1 + 1) % 1;
        const fy = -20 + prog * 36;
        const fxx = 7 + Math.sin(prog * Math.PI * 2) * 4;
        ctx.fillStyle = rgb([255, 255, 255], 0.85);
        ctx.beginPath();
        ctx.arc(fxx, fy, 1.1, 0, Math.PI * 2);
        ctx.fill();

        // snow glints twinkling on the broad antlers
        const tw = 0.4 + 0.5 * Math.abs(Math.sin(t * 2.0));
        ctx.fillStyle = rgb([255, 255, 255], tw * p.antlerSnowAmt);
        for (const [gx, gy] of [[hx - 7, hy - 13], [hx + 8, hy - 13], [hx - 3, hy - 14]] as const) {
          ctx.beginPath();
          ctx.arc(gx, gy, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }

        // cold sheen pulse on the coat
        const sheen = 0.5 + 0.5 * Math.sin(t * 0.8);
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([206, 224, 255], 0.12 + sheen * 0.12);
        ctx.beginPath();
        ctx.ellipse(bx, by, 13, 8.6, -0.04, 0, Math.PI * 2);
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
