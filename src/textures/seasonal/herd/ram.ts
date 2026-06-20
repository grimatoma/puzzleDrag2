// Seasonal art for the HERD RAM board tile (`tile_herd_ram`).
//
// A SINGLE parameterized paint renders the whole tile (grass pad + the one
// sturdy woolly ram + seasonal dressing) from a tweenable parameter set `P`.
// The four seasons are just four `P` presets; the three forward transitions
// lerp EVERY field of `P` through a quintic smoothstep, so transition(0) ===
// the from-season still and transition(1) === the to-season still — no snap.
//
// PALETTE LOCK: the ram is ALWAYS the same cream-fleeced, broad-faced ram with
// big spiralling CURLED HORNS on the sides of its head. Seasons change only its
// fleece VOLUME (lighter recently-shorn slimmer fleece in spring → heavy thick
// puffed wool in winter), the pad colour, the light wash, and dressing (blossom,
// fallen leaves, frost, frosted horns, back-snow, breath-fog). The horns and
// the ram's cream identity colour never change — winter only frosts them.
//
// Origin-centered in the −24..+24 design box. Animations are deterministic
// (sin/cos/modulo of `t` in seconds), seamless, and subtle. The subject's
// breathing bob has zero velocity at t=0 (A*(1-cos(w t))*0.5) so anim(…,0)
// matches the still exactly.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Small math helpers ──────────────────────────────────────────────────────

type RGB = [number, number, number];

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
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
function bobAt(t: number, amp = 1.1, w = 1.5): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Tweenable parameter set ─────────────────────────────────────────────────

interface P {
  fleeceLight: RGB; // bright top of the cream wool
  fleeceShadow: RGB; // shaded underside of the cream wool
  faceCoat: RGB; // broad face fur (the warm tan parts)
  faceShade: RGB; // shaded side of the face
  hornLight: RGB; // lit side of the curled horns (locked, cream-tan keratin)
  hornShade: RGB; // shaded ridges of the horns
  legDark: RGB; // short legs + hooves (the dark parts)
  padGrass: RGB; // top of the ground pad
  soil: RGB; // shaded underside / soil of the pad
  outline: RGB; // soft dark outline tint
  lightWash: RGB; // overall colour-of-light wash
  lightWashAmt: number; // 0..1 strength of the light wash
  fleeceVolume: number; // 0..1 puff of the wool outline (shorn → heavy)
  frostAmt: number; // 0..1 frost sparkle on the fleece + frosted horns
  backSnowAmt: number; // 0..1 snow settled on its back
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad
  fallenLeafAmt: number; // 0..1 fallen leaves on the pad
  breathFogAmt: number; // 0..1 breath puff at the muzzle
}

// Four season presets. The ram stays the SAME cream woolly broad-faced ram with
// big curled horns; only fleece volume + pad + light + dressing differ.
const SP: Record<SeasonName, P> = {
  Spring: {
    fleeceLight: [248, 244, 232], // cream
    fleeceShadow: [212, 204, 184],
    faceCoat: [216, 196, 162],
    faceShade: [176, 154, 120],
    hornLight: [224, 206, 168],
    hornShade: [168, 144, 104],
    legDark: [92, 78, 64],
    padGrass: [126, 198, 86], // bright lime dewy grass
    soil: [86, 132, 54],
    outline: [62, 52, 42],
    lightWash: [212, 238, 255], // cool-bright, dewy
    lightWashAmt: 0.16,
    fleeceVolume: 0.16, // recently-shorn: lighter, slimmer fleece
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.6,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  Summer: {
    fleeceLight: [250, 246, 232], // cream, richest
    fleeceShadow: [210, 200, 178],
    faceCoat: [220, 198, 160],
    faceShade: [178, 154, 116],
    hornLight: [226, 206, 166],
    hornShade: [166, 142, 100],
    legDark: [88, 74, 60],
    padGrass: [86, 168, 64], // saturated mid-green
    soil: [58, 110, 40],
    outline: [58, 48, 40],
    lightWash: [255, 244, 206], // warm
    lightWashAmt: 0.14,
    fleeceVolume: 0.52, // full fleece (PEAK)
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0,
  },
  Autumn: {
    fleeceLight: [244, 236, 218], // cream warming
    fleeceShadow: [204, 192, 168],
    faceCoat: [212, 188, 148],
    faceShade: [170, 144, 104],
    hornLight: [220, 198, 154],
    hornShade: [160, 134, 92],
    legDark: [86, 70, 56],
    padGrass: [156, 142, 78], // olive-tan
    soil: [104, 84, 44],
    outline: [60, 48, 38],
    lightWash: [255, 206, 138], // low amber
    lightWashAmt: 0.2,
    fleeceVolume: 0.74, // fuller, thicker
    frostAmt: 0,
    backSnowAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.7,
    breathFogAmt: 0,
  },
  Winter: {
    fleeceLight: [250, 250, 246], // cream, cooled toward white by the light
    fleeceShadow: [212, 214, 214],
    faceCoat: [206, 192, 168],
    faceShade: [164, 150, 132],
    hornLight: [216, 204, 184], // keratin reads cooler under cold light
    hornShade: [156, 142, 120],
    legDark: [80, 72, 70],
    padGrass: [222, 232, 244], // snow on the pad
    soil: [150, 168, 190],
    outline: [70, 66, 72],
    lightWash: [206, 222, 248], // cool blue-grey
    lightWashAmt: 0.24,
    fleeceVolume: 1, // heavy thick puffed wool
    frostAmt: 0.7,
    backSnowAmt: 0.7,
    padSnowAmt: 0.85,
    blossomAmt: 0,
    fallenLeafAmt: 0,
    breathFogAmt: 0.7,
  },
};

function lerpP(a: P, b: P, t: number): P {
  return {
    fleeceLight: lerpRGB(a.fleeceLight, b.fleeceLight, t),
    fleeceShadow: lerpRGB(a.fleeceShadow, b.fleeceShadow, t),
    faceCoat: lerpRGB(a.faceCoat, b.faceCoat, t),
    faceShade: lerpRGB(a.faceShade, b.faceShade, t),
    hornLight: lerpRGB(a.hornLight, b.hornLight, t),
    hornShade: lerpRGB(a.hornShade, b.hornShade, t),
    legDark: lerpRGB(a.legDark, b.legDark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    lightWash: lerpRGB(a.lightWash, b.lightWash, t),
    lightWashAmt: lerp(a.lightWashAmt, b.lightWashAmt, t),
    fleeceVolume: lerp(a.fleeceVolume, b.fleeceVolume, t),
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
    fleeceVolume: clamp01(p.fleeceVolume),
    frostAmt: clamp01(p.frostAmt),
    backSnowAmt: clamp01(p.backSnowAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
    breathFogAmt: clamp01(p.breathFogAmt),
  };
}

// ── Local paint helpers (driven only by `p`) ────────────────────────────────

// the low flat grass pad the ram stands on
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
    for (const [bx, by] of [[-12, 18.5], [9, 20], [0, 21], [14, 19]] as const) {
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
      [-11, 20, -0.5, [196, 96, 36]],
      [10, 20.5, 0.7, [212, 150, 52]],
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

// one short, sturdy leg: a stubby dark cylinder with a hoof at the base
function paintLeg(ctx: CanvasRenderingContext2D, p: P, x: number, topY: number, baseY: number): void {
  ctx.strokeStyle = rgb(p.legDark);
  ctx.lineWidth = 3.4; // sturdy ram legs read a touch thicker than the sheep's
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, baseY);
  ctx.stroke();
  // hoof
  ctx.fillStyle = rgb([30, 26, 26]);
  ctx.beginPath();
  ctx.ellipse(x, baseY, 1.9, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

// the fluffy fleece body — a lumpy cloud whose lumps grow modestly with volume.
// the ram body is a touch larger/sturdier than the sheep.
function paintFleeceBody(ctx: CanvasRenderingContext2D, p: P, cx: number, cy: number, fill: string, scallop: number): void {
  // volume modestly puffs the wool: from slim (shorn) to heavy (winter)
  const vol = 0.86 + p.fleeceVolume * 0.42;
  const rx = 13.6 * vol;
  const ry = 9.8 * vol;
  ctx.fillStyle = fill;
  // base body ellipse
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  // scalloped wool lumps around the perimeter
  const lumps = 11;
  const lumpR = (2.3 + p.fleeceVolume * 1.7) * scallop;
  for (let i = 0; i < lumps; i++) {
    const a = (i / lumps) * Math.PI * 2 - Math.PI / 2;
    const lx = cx + Math.cos(a) * rx * 0.98;
    const ly = cy + Math.sin(a) * ry * 0.98;
    ctx.beginPath();
    ctx.arc(lx, ly, lumpR, 0, Math.PI * 2);
    ctx.fill();
  }
}

// one big spiralling CURLED HORN — the ram's locked identity feature.
// Drawn as a logarithmic spiral of overlapping discs sweeping down-and-around
// from the crown to a point near the cheek. `side` flips it left/right.
// The silhouette is CONSTANT across seasons; only the keratin colour + frost
// (via `p`) change.
function paintHorn(ctx: CanvasRenderingContext2D, p: P, ox: number, oy: number, side: -1 | 1): void {
  // spiral parameters — a tight ram curl wrapping ~1.5 turns
  const turns = 1.55;
  const steps = 22;
  const a0 = side === 1 ? -1.1 : Math.PI + 1.1; // start angle near the crown
  const r0 = 5.6; // outer radius at the base of the curl
  // ridge outline pass first (dark), then lit keratin, then shade ridges.
  type Disc = { x: number; y: number; r: number };
  const discs: Disc[] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const ang = a0 + side * f * turns * Math.PI * 2;
    const rad = r0 * (1 - f * 0.78); // spirals inward
    const cx = ox + side * 4.2 + Math.cos(ang) * rad;
    const cy = oy + 0.5 + Math.sin(ang) * rad * 0.9; // slightly squashed
    const thick = 2.9 * (1 - f * 0.55); // tapers toward the tip
    discs.push({ x: cx, y: cy, r: thick });
  }

  // dark outline halo
  ctx.fillStyle = rgb(p.outline);
  for (const d of discs) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r + 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  // lit keratin body
  ctx.fillStyle = rgb(p.hornLight);
  for (const d of discs) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // shaded inner ridge of the spiral (offset down-right for groove read)
  ctx.fillStyle = rgb(p.hornShade);
  for (let i = 0; i < discs.length; i++) {
    const d = discs[i];
    ctx.beginPath();
    ctx.arc(d.x + 0.8, d.y + 0.8, d.r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // a few ridge ticks across the horn for the corrugated keratin look
  ctx.strokeStyle = rgb(p.hornShade, 0.7);
  ctx.lineWidth = 0.7;
  for (let i = 2; i < discs.length - 1; i += 2) {
    const d = discs[i];
    ctx.beginPath();
    ctx.moveTo(d.x - d.r, d.y - d.r * 0.4);
    ctx.lineTo(d.x + d.r, d.y + d.r * 0.4);
    ctx.stroke();
  }

  // winter: frost dusting the upward ridges of the horn
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([255, 255, 255], 0.8 * p.frostAmt);
    for (let i = 0; i < discs.length; i += 3) {
      const d = discs[i];
      ctx.beginPath();
      ctx.arc(d.x - 0.6, d.y - d.r * 0.6, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// the whole ram, standing front-¾ turned toward lower-left
function paintRam(ctx: CanvasRenderingContext2D, p: P, bob: number): void {
  // body centre lifts with the breathing bob
  const bx = -1;
  const by = 4 - bob;

  // SHORT legs first (behind the fleece). Two back, two front; contact on pad.
  ctx.save();
  ctx.globalAlpha = 0.85;
  paintLeg(ctx, p, bx + 6.8, by + 7, 18.6);
  paintLeg(ctx, p, bx - 7.8, by + 7, 18.9);
  ctx.restore();
  // front legs
  paintLeg(ctx, p, bx + 3.6, by + 7, 19.2);
  paintLeg(ctx, p, bx - 4.6, by + 7, 19.4);

  // FLEECE — dark outline pass first, then light fill on top (layered like wheat)
  paintFleeceBody(ctx, p, bx, by, rgb(p.outline), 1.18); // outline halo
  paintFleeceBody(ctx, p, bx, by, rgb(p.fleeceShadow), 1.0); // shaded wool
  // light wool offset up-left (light from upper-left)
  ctx.save();
  ctx.translate(-1.4, -1.6);
  paintFleeceBody(ctx, p, bx, by, rgb(p.fleeceLight), 0.82);
  ctx.restore();

  // snow settled on the back (winter) — a soft white cap on top of the fleece
  if (p.backSnowAmt > 0.001) {
    ctx.fillStyle = rgb([248, 252, 255], 0.92 * p.backSnowAmt);
    ctx.beginPath();
    ctx.ellipse(bx - 1, by - 8, 9.4 * (0.9 + p.fleeceVolume * 0.3), 3.6, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb([255, 255, 255], 0.85 * p.backSnowAmt);
    for (const [dx, dy] of [[-5, -8.8], [1, -9.4], [5, -8.4]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.6 + p.fleeceVolume * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // frost sparkle across the fleece (winter)
  if (p.frostAmt > 0.001) {
    ctx.fillStyle = rgb([255, 255, 255], 0.8 * p.frostAmt);
    const pts: Array<[number, number]> = [
      [-8, 0], [-3, 4], [4, -2], [8, 2], [0, -3], [-5, -5], [6, 5],
    ];
    for (const [fx, fy] of pts) {
      ctx.beginPath();
      ctx.arc(bx + fx, by + fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── HEAD (front-¾, lower-left) — broad face + big curled horns lock identity ─
  const hx = bx - 11;
  const hy = by + 3;

  // ears (tucked under the horns), behind the face
  ctx.fillStyle = rgb(p.faceShade);
  for (const sideE of [-1, 1] as const) {
    ctx.save();
    ctx.translate(hx + sideE * 4.4, hy - 1.5);
    ctx.rotate(sideE * 0.7 + 0.1);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.2, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // a small wool tuft on the crown (between the horns) — keeps it woolly
  ctx.fillStyle = rgb(p.fleeceLight);
  ctx.beginPath();
  ctx.ellipse(hx, hy - 5, 3.2, 2.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // BIG SPIRALLING CURLED HORNS on the sides of the head (locked silhouette).
  // Drawn before the face so the curl's inner end tucks behind the cheek.
  paintHorn(ctx, p, hx, hy - 2.2, -1);
  paintHorn(ctx, p, hx, hy - 2.2, 1);

  // BROAD face — a wide, soft muzzle, tilted toward lower-left
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(0.22);
  // outline
  ctx.fillStyle = rgb(p.outline);
  ctx.beginPath();
  ctx.ellipse(0, 0, 6.0, 5.6, 0, 0, Math.PI * 2); // broad (wider than tall)
  ctx.fill();
  // face coat fill
  ctx.fillStyle = rgb(p.faceCoat);
  ctx.beginPath();
  ctx.ellipse(0, 0, 5.3, 4.9, 0, 0, Math.PI * 2);
  ctx.fill();
  // shaded right side of the broad face
  ctx.fillStyle = rgb(p.faceShade);
  ctx.beginPath();
  ctx.ellipse(1.8, 0.6, 3.4, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // muzzle — a paler broad nose-bridge running down the face
  ctx.fillStyle = rgb(p.fleeceLight, 0.55);
  ctx.beginPath();
  ctx.ellipse(-0.6, 1.4, 2.0, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // gentle cheek light (upper-left)
  ctx.fillStyle = rgb([255, 255, 255], 0.14);
  ctx.beginPath();
  ctx.ellipse(-2.0, -1.8, 2.0, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // eyes
  ctx.fillStyle = rgb([245, 244, 236]);
  for (const ex of [-2.0, 2.0]) {
    ctx.beginPath();
    ctx.arc(ex, -1.3, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = rgb([26, 22, 22]);
  for (const ex of [-1.8, 2.2]) {
    // horizontal ram-pupil read as a small dark oval
    ctx.beginPath();
    ctx.ellipse(ex, -1.1, 0.7, 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // nostrils on the broad muzzle
  ctx.fillStyle = rgb([24, 20, 20]);
  for (const ex of [-1.0, 1.0]) {
    ctx.beginPath();
    ctx.ellipse(ex, 3.6, 0.5, 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // small tail tuft at the upper-right rear of the fleece
  ctx.fillStyle = rgb(p.fleeceLight);
  ctx.beginPath();
  ctx.arc(bx + 13, by - 1, 2.5 + p.fleeceVolume * 0.6, 0, Math.PI * 2);
  ctx.fill();

  // breath-fog puff at the muzzle (winter) — at rest a faint static puff
  if (p.breathFogAmt > 0.001) {
    ctx.fillStyle = rgb([235, 244, 255], 0.4 * p.breathFogAmt);
    ctx.beginPath();
    ctx.ellipse(hx - 6.5, hy + 4, 3.4, 2.3, 0.2, 0, Math.PI * 2);
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

function paint(ctx: CanvasRenderingContext2D, pIn: P, bob: number): void {
  const p = clampP(pIn);
  ctx.save();
  try {
    paintPad(ctx, p);
    paintRam(ctx, p, bob);
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

    // head-dip once per loop layered into the breathing bob — the head sinks a
    // little then lifts; seamless (0 at the loop edges). Small, never silhouette.
    const loop = (t % 6) / 6; // 0..1, 6s idle loop
    const dipGate = Math.max(0, Math.sin(loop * Math.PI)) ** 2; // smooth bump
    const headDip = dipGate * 1.4;

    paint(ctx, SP[season], bob);

    // ── Additive micro-motion, drawn over the painted tile ──────────────────
    ctx.save();
    try {
      const bx = -1;
      const by = 4 - bob;
      const hx = bx - 11;
      const hy = by + 3 + headDip; // dipped head position

      // ear-flick once per loop: a brief sin pulse, seamless (0 at edges).
      const flickGate = Math.max(0, Math.sin(loop * Math.PI * 2)) ** 6;
      const flick = Math.sin(t * 9) * flickGate;

      // redraw the dipped broad face + a flicking ear over the rest pose so the
      // head-dip reads. (Kept subtle; horns/silhouette stay put.)
      if (headDip > 0.05) {
        ctx.save();
        ctx.translate(hx, hy);
        ctx.rotate(0.22);
        ctx.fillStyle = rgb(p.outline);
        ctx.beginPath();
        ctx.ellipse(0, 0, 6.0, 5.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgb(p.faceCoat);
        ctx.beginPath();
        ctx.ellipse(0, 0, 5.3, 4.9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgb(p.faceShade);
        ctx.beginPath();
        ctx.ellipse(1.8, 0.6, 3.4, 4.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgb([245, 244, 236]);
        for (const ex of [-2.0, 2.0]) {
          ctx.beginPath();
          ctx.arc(ex, -1.3, 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = rgb([26, 22, 22]);
        for (const ex of [-1.8, 2.2]) {
          ctx.beginPath();
          ctx.ellipse(ex, -1.1, 0.7, 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = rgb([24, 20, 20]);
        for (const ex of [-1.0, 1.0]) {
          ctx.beginPath();
          ctx.ellipse(ex, 3.6, 0.5, 0.8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // ear flick (redraw a flicking ear over the existing one)
      ctx.fillStyle = rgb(p.faceShade);
      ctx.save();
      ctx.translate(hx + 4.4, hy - 1.5);
      ctx.rotate(0.6 + flick * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.2, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // tail flick
      ctx.fillStyle = rgb(p.fleeceLight);
      ctx.beginPath();
      ctx.arc(bx + 13 + flick * 1.4, by - 1, 2.5 + p.fleeceVolume * 0.6, 0, Math.PI * 2);
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
        // soft fleece sheen sweeping across the wool
        const s = 0.5 + 0.5 * Math.sin(t * 1.1);
        const sx = bx - 9 + s * 18;
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([255, 255, 255], 0.35);
        ctx.beginPath();
        ctx.ellipse(sx, by - 2, 3, 6, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (season === "Autumn") {
        // a fallen leaf stirs — gentle rock + tiny drift, seamless
        const a = Math.sin(t * 1.3) * 0.5;
        const dx = Math.sin(t * 0.7) * 1.2;
        ctx.save();
        ctx.translate(10 + dx, 20.5);
        ctx.rotate(0.7 + a);
        ctx.fillStyle = rgb([212, 150, 52], p.fallenLeafAmt);
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.6, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Winter: breath-fog puff gently pulses outward from the muzzle +
        // a drifting snowflake + a cold sheen.
        const breathe = 0.5 + 0.5 * Math.sin(t * 1.5);
        const reach = 4 + breathe * 3;
        ctx.fillStyle = rgb([235, 244, 255], (0.18 + 0.32 * breathe) * p.breathFogAmt);
        ctx.beginPath();
        ctx.ellipse(hx - 2 - reach, hy + 4, 2.6 + breathe * 1.8, 1.8 + breathe * 1.2, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // one drifting snowflake on a seamless 3.4s fall
        const prog = ((t / 3.4) % 1 + 1) % 1;
        const fy = -20 + prog * 36;
        const fxx = 6 + Math.sin(prog * Math.PI * 2) * 4;
        ctx.fillStyle = rgb([255, 255, 255], 0.85);
        ctx.beginPath();
        ctx.arc(fxx, fy, 1.1, 0, Math.PI * 2);
        ctx.fill();

        // cold sheen pulse on the fleece
        const sheen = 0.5 + 0.5 * Math.sin(t * 0.8);
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = rgb([206, 224, 255], 0.12 + sheen * 0.14);
        ctx.beginPath();
        ctx.ellipse(bx, by, 13.6, 9.8, 0, 0, Math.PI * 2);
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
