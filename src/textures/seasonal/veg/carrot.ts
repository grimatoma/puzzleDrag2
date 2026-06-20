// Seasonal art for the CARROT vegetable tile (`tile_veg_carrot`).
// Source: src/textures/seasonal/veg/carrot.ts
//
// One carrot lying at a natural diagonal slant across a grassy pad: the pointed
// tapering tip toward the LOWER-LEFT, the feathery green leafy top toward the
// UPPER-RIGHT, scaled to fill the tile on its diagonal. The carrot is a ROOT
// veg, so it keeps its leafy top for read (Fruit/Veg framing note).
//
// PALETTE LOCK: the carrot stays BRIGHT ORANGE with a feathery green top every
// season — ripeness shows in surface and shade (paler/matte vs glossy, a couple
// freckles, a frost dusting), NEVER a hue change. The slanted SILHOUETTE is
// IDENTICAL across all seasons; only colours and the small dressing/frost/snow
// amounts change.
//
// This is enforced by a single parameterized `paint(ctx, p, bob)`:
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
  rootLight: RGB;   // lit upper face of the orange carrot skin
  rootMid: RGB;     // body tone (bright orange)
  rootDark: RGB;    // shaded underside / tip
  topLight: RGB;    // lit feathery green leaves
  topMid: RGB;      // body of the green top
  topDark: RGB;     // shaded inner fronds
  padGrass: RGB;    // top of the grass pad
  padDark: RGB;     // shaded pad underside
  soil: RGB;        // contact / base soil under the carrot
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  ripeness: number; // 0..1 surface richness cue (matte→ripe; informs dressing)
  gloss: number;    // 0..1 specular gloss-streak strength on the skin
  freckleAmt: number; // 0..1 faint freckles on the skin (autumn)
  frostAmt: number; // 0..1 cool frost dusting over the orange (winter)
  snowCapAmt: number; // 0..1 snow on the upward side of the carrot
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 a pale blossom on the pad (spring)
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
    rootLight: lerpRGB(a.rootLight, b.rootLight, t),
    rootMid: lerpRGB(a.rootMid, b.rootMid, t),
    rootDark: lerpRGB(a.rootDark, b.rootDark, t),
    topLight: lerpRGB(a.topLight, b.topLight, t),
    topMid: lerpRGB(a.topMid, b.topMid, t),
    topDark: lerpRGB(a.topDark, b.topDark, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    soil: lerpRGB(a.soil, b.soil, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    ripeness: lerp(a.ripeness, b.ripeness, t),
    gloss: lerp(a.gloss, b.gloss, t),
    freckleAmt: lerp(a.freckleAmt, b.freckleAmt, t),
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
    freckleAmt: clamp01(p.freckleAmt),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────
// PALETTE LOCK: rootMid stays a bright orange in EVERY season; the green top
// stays green. Only surface (gloss/matte), shade, freckles, frost, snow, pad
// colour and light change. NO hue swap on the carrot.

const SP: Record<SeasonName, P> = {
  // Spring — a touch paler/matte orange, ferny fresh top; dewy lime pad + a
  // pale blossom. Cool-bright light.
  Spring: {
    rootLight: [252, 176, 96],
    rootMid: [238, 138, 50],
    rootDark: [186, 96, 32],
    topLight: [168, 224, 110],
    topMid: [108, 186, 70],
    topDark: [62, 132, 50],
    padGrass: [128, 206, 86],
    padDark: [72, 138, 58],
    soil: [120, 84, 48],
    outline: [104, 52, 18],
    light: [232, 244, 226],
    lightAmt: 0.16,
    ripeness: 0.35,
    gloss: 0.2,
    freckleAmt: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — full ripe glossy bright-orange carrot, lush green top (PEAK);
  // warm light, strong gloss, mid-green pad.
  Summer: {
    rootLight: [255, 168, 70],
    rootMid: [248, 124, 28],
    rootDark: [184, 80, 18],
    topLight: [132, 214, 84],
    topMid: [78, 174, 56],
    topDark: [42, 120, 42],
    padGrass: [86, 168, 70],
    padDark: [44, 110, 48],
    soil: [126, 86, 48],
    outline: [108, 48, 12],
    light: [255, 240, 206],
    lightAmt: 0.18,
    ripeness: 1.0,
    gloss: 0.95,
    freckleAmt: 0,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — fat carrot, feathery top yellowing, a couple of faint freckles on
  // the skin; olive-tan pad, fallen leaves, low amber light.
  Autumn: {
    rootLight: [240, 150, 64],
    rootMid: [224, 110, 34],
    rootDark: [160, 70, 22],
    topLight: [206, 204, 96],
    topMid: [158, 162, 62],
    topDark: [108, 116, 44],
    padGrass: [150, 152, 86],
    padDark: [104, 96, 52],
    soil: [120, 80, 44],
    outline: [98, 44, 16],
    light: [248, 210, 150],
    lightAmt: 0.2,
    ripeness: 0.85,
    gloss: 0.4,
    freckleAmt: 0.7,
    frostAmt: 0,
    snowCapAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — frost-dusted carrot (pale frost over the orange, still CLEARLY
  // orange) + snow on the pad; cool blue-grey light.
  Winter: {
    rootLight: [240, 162, 96],
    rootMid: [218, 120, 56],
    rootDark: [156, 84, 46],
    topLight: [150, 188, 158],
    topMid: [98, 146, 110],
    topDark: [62, 104, 80],
    padGrass: [176, 196, 214],
    padDark: [120, 146, 172],
    soil: [128, 110, 96],
    outline: [78, 52, 44],
    light: [206, 226, 252],
    lightAmt: 0.3,
    ripeness: 0.7,
    gloss: 0.22,
    freckleAmt: 0,
    frostAmt: 0.7,
    snowCapAmt: 0.8,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Carrot geometry (the SAME slanted silhouette every season) ───────────────
// The carrot lies on a diagonal: tip at lower-left, shoulder (where the green
// top sprouts) at upper-right. Defined as a local axis from TIP→SHOULDER.

const TIP: [number, number] = [-15, 14];      // pointed tip, lower-left
const SHOULDER: [number, number] = [11, -7];  // crown where the top sprouts
const ROOT_HALF = 6.6;                         // half-width at the shoulder

// Unit vector along the carrot axis (tip→shoulder) and its perpendicular.
const AXX = SHOULDER[0] - TIP[0];
const AXY = SHOULDER[1] - TIP[1];
const AXLEN = Math.hypot(AXX, AXY);
const UX = AXX / AXLEN; // along-axis unit
const UY = AXY / AXLEN;
const PX = -UY; // perpendicular unit (points "up" off the body)
const PY = UX;

/** Point at fraction f along axis (0=tip,1=shoulder), offset w perpendicular. */
function onAxis(f: number, w: number): [number, number] {
  const cx = lerp(TIP[0], SHOULDER[0], f);
  const cy = lerp(TIP[1], SHOULDER[1], f);
  return [cx + PX * w, cy + PY * w];
}

/** Trace the tapered carrot root body (tip→shoulder). Same every season. */
function carrotBodyPath(ctx: CanvasRenderingContext2D, bob: number): void {
  // Half-width profile along the axis: 0 at the tip, fattest near the shoulder.
  const widthAt = (f: number): number => {
    // smooth taper that bulges toward the top
    const w = Math.sin(Math.min(1, f * 1.05) * Math.PI * 0.5);
    return ROOT_HALF * (0.12 + 0.88 * w);
  };
  const steps = 14;
  ctx.beginPath();
  // one side, tip → shoulder
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const [x, y] = onAxis(f, widthAt(f));
    if (i === 0) ctx.moveTo(x, y + bob);
    else ctx.lineTo(x, y + bob);
  }
  // round the shoulder cap
  const [sx, sy] = onAxis(1.04, 0);
  ctx.lineTo(sx, sy + bob);
  // other side, shoulder → tip
  for (let i = steps; i >= 0; i--) {
    const f = i / steps;
    const [x, y] = onAxis(f, -widthAt(f));
    ctx.lineTo(x, y + bob);
  }
  ctx.closePath();
}

// Feathery green top: several fronds fanning from the shoulder toward upper-right.
const FRONDS: Array<[number, number]> = [
  // [angle in radians (from +x, up is negative), length]
  [-1.95, 15], [-1.55, 17], [-1.15, 16], [-0.78, 13.5], [-0.42, 11.5],
];

/** Draw the feathery green top. `sway` adds a small per-frond x wobble (idle). */
function carrotTop(
  ctx: CanvasRenderingContext2D,
  p: P,
  bob: number,
  sway: number,
): void {
  const [bx, by0] = onAxis(0.98, 0);
  const by = by0 + bob;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  FRONDS.forEach(([ang, len], i) => {
    const s = sway * (0.4 + i * 0.18);
    const tx = bx + Math.cos(ang) * len + s;
    const ty = by + Math.sin(ang) * len;
    const mx = bx + Math.cos(ang) * len * 0.5 + s * 0.5;
    const my = by + Math.sin(ang) * len * 0.55 - 2;
    // dark base stalk
    ctx.strokeStyle = rgb(p.topDark);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(mx, my, tx, ty);
    ctx.stroke();
    // bright frond over it
    ctx.strokeStyle = rgb(p.topMid);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(mx, my, tx, ty);
    ctx.stroke();
    // feathery leaflets along each frond
    ctx.strokeStyle = rgb(p.topLight);
    ctx.lineWidth = 0.8;
    for (let k = 1; k <= 4; k++) {
      const f = k / 5;
      const px = lerp(bx, tx, f);
      const py = lerp(by, ty, f) + Math.sin(f * Math.PI) * -1.4;
      const nrm = ang - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(nrm) * 2.2, py + Math.sin(nrm) * 2.2);
      ctx.moveTo(px, py);
      ctx.lineTo(px - Math.cos(nrm) * 2.2, py - Math.sin(nrm) * 2.2);
      ctx.stroke();
    }
    // bright leaflet tip
    ctx.fillStyle = rgb(p.topLight);
    ctx.beginPath();
    ctx.arc(tx, ty, 1.1, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

// ── The single parameterized paint ───────────────────────────────────────────

/** The whole tile from ONLY `p` and `bob`. */
function paint(ctx: CanvasRenderingContext2D, raw: P, bob: number): void {
  const p = clampP(raw);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Pad: low flat grass ellipse, x∈[−18,+18], centre y≈+19 ──────────────
    ctx.fillStyle = rgba(p.padDark, 0.4);
    ctx.beginPath();
    ctx.ellipse(3, 21.5, 16, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rgb(p.padDark);
    ctx.beginPath();
    ctx.ellipse(0, 20.4, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(p.padGrass);
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // tufted top edge
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
      ctx.fillStyle = rgba([255, 255, 255], 0.8 * p.padSnowAmt);
      [[-9, 17.6], [5, 19], [11, 17.4], [-3, 20]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // blossom on the pad (spring)
    if (p.blossomAmt > 0.01) {
      const a = p.blossomAmt;
      const spots: Array<[number, number]> = [[-12, 18.8], [12, 17.8]];
      spots.forEach(([bx, by], idx) => {
        ctx.fillStyle = rgba(idx === 0 ? [255, 232, 246] : [255, 250, 252], 0.95 * a);
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
        [13, 18.4, 0.7, [176, 72, 32]],
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

    // ── Contact shadow of the carrot lying on the pad ───────────────────────
    ctx.save();
    ctx.fillStyle = rgba(p.outline, 0.26);
    ctx.beginPath();
    ctx.ellipse(-1, 13.5 + bob * 0.4, 15, 3.4, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Soil smudge near the resting tip
    ctx.fillStyle = rgba(p.soil, 0.85);
    ctx.beginPath();
    ctx.ellipse(TIP[0] + 2, TIP[1] + 1 + bob, 4, 2, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // ── Feathery green top BEHIND-ish? Draw the root over the lower fronds: ──
    // Draw fronds first so the root crown overlaps their base cleanly.
    carrotTop(ctx, p, bob, 0);

    // ── Subject: the carrot root (SAME slanted silhouette every season) ─────
    // 1) soft dark outline pass
    ctx.save();
    ctx.lineJoin = "round";
    carrotBodyPath(ctx, bob);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = rgb(p.outline);
    ctx.stroke();
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();
    ctx.restore();

    // 2) body fill, clipped so shading stays inside the carrot
    ctx.save();
    carrotBodyPath(ctx, bob);
    ctx.clip();

    // base mid orange
    ctx.fillStyle = rgb(p.rootMid);
    ctx.fillRect(-24, -24, 48, 48);

    // light from upper-left: gradient along the perpendicular (lit upper side)
    const [lx0, ly0] = onAxis(0.5, ROOT_HALF + 4);
    const [lx1, ly1] = onAxis(0.5, -ROOT_HALF - 4);
    const litGrad = ctx.createLinearGradient(lx0, ly0 + bob, lx1, ly1 + bob);
    litGrad.addColorStop(0, rgb(p.rootLight));
    litGrad.addColorStop(0.5, rgb(p.rootMid));
    litGrad.addColorStop(1, rgb(p.rootDark));
    ctx.fillStyle = litGrad;
    ctx.globalAlpha = 0.92;
    ctx.fillRect(-24, -24, 48, 48);
    ctx.globalAlpha = 1;

    // taper darkening toward the tip
    const [tgx, tgy] = TIP;
    const [sgx, sgy] = SHOULDER;
    const tipGrad = ctx.createLinearGradient(tgx, tgy + bob, sgx, sgy + bob);
    tipGrad.addColorStop(0, rgba(p.rootDark, 0.55));
    tipGrad.addColorStop(0.35, rgba(p.rootDark, 0));
    ctx.fillStyle = tipGrad;
    ctx.fillRect(-24, -24, 48, 48);

    // carrot's characteristic ringed grooves across the root
    ctx.strokeStyle = rgba(p.rootDark, 0.5);
    ctx.lineWidth = 1.0;
    for (let i = 1; i <= 6; i++) {
      const f = i / 7;
      const [a0x, a0y] = onAxis(f, ROOT_HALF + 2);
      const [a1x, a1y] = onAxis(f, -(ROOT_HALF + 2));
      ctx.beginPath();
      ctx.moveTo(a0x, a0y + bob);
      ctx.lineTo(a1x, a1y + bob);
      ctx.stroke();
    }

    // freckles on the skin (autumn) — faint darker specks
    if (p.freckleAmt > 0.02) {
      ctx.fillStyle = rgba(p.rootDark, 0.5 * p.freckleAmt);
      const fr: Array<[number, number]> = [[0.45, 1.5], [0.6, -2], [0.72, 0.5], [0.55, 2.4]];
      fr.forEach(([f, w]) => {
        const [fx, fy] = onAxis(f, w);
        ctx.beginPath();
        ctx.arc(fx, fy + bob, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // gloss streak along the lit upper side (gloss strength from P)
    if (p.gloss > 0.02) {
      ctx.strokeStyle = rgba([255, 255, 255], 0.18 + 0.55 * p.gloss);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      const [g0x, g0y] = onAxis(0.2, ROOT_HALF * 0.45);
      const [g1x, g1y] = onAxis(0.85, ROOT_HALF * 0.55);
      const [gmx, gmy] = onAxis(0.55, ROOT_HALF * 0.62);
      ctx.moveTo(g0x, g0y + bob);
      ctx.quadraticCurveTo(gmx, gmy + bob, g1x, g1y + bob);
      ctx.stroke();
    }

    // frost dusting (winter) — cool pale speckle over the orange (stays orange)
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([214, 232, 250], 0.26 * p.frostAmt);
      ctx.fillRect(-24, -24, 48, 48);
      ctx.fillStyle = rgba([236, 246, 255], 0.7 * p.frostAmt);
      for (let i = 1; i <= 7; i++) {
        const f = i / 8;
        const [fx, fy] = onAxis(f, (i % 2 === 0 ? 1.6 : -1.4));
        ctx.beginPath();
        ctx.arc(fx, fy + bob, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore(); // end clip

    // 3) snow cap on the upward side (winter) — drawn over, hugging the top edge
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.92 * a);
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const f = i / 12;
        const w = ROOT_HALF * (0.12 + 0.88 * Math.sin(Math.min(1, f * 1.05) * Math.PI * 0.5));
        const [x, y] = onAxis(f, w);
        if (i === 0) ctx.moveTo(x, y + bob);
        else ctx.lineTo(x, y + bob);
      }
      for (let i = 12; i >= 0; i--) {
        const f = i / 12;
        const w = ROOT_HALF * (0.12 + 0.88 * Math.sin(Math.min(1, f * 1.05) * Math.PI * 0.5));
        const [x, y] = onAxis(f, w * 0.45);
        ctx.lineTo(x, y + bob);
      }
      ctx.closePath();
      ctx.fill();
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
    // The static paint draws everything (root + a still top). We then overlay a
    // gently SWAYING feathery top + per-season micro-motion so the leaves move
    // and the silhouette never just slides.
    paint(ctx, SP[season], bob);

    ctx.save();
    try {
      ctx.globalAlpha = 1;
      const p = clampP(SP[season]);

      // Top sway — a gentle frond wobble every season (more in spring/autumn).
      const swayAmp =
        season === "Spring" ? 1.8 : season === "Autumn" ? 1.6 : season === "Summer" ? 1.1 : 0.9;
      const sway = Math.sin(t * 1.7) * swayAmp + Math.sin(t * 1.7 + 1.1) * swayAmp * 0.4;
      // redraw the top over the static one so it visibly sways
      carrotTop(ctx, p, bob, sway);

      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint travelling on the root
        const g = 0.2 + 0.28 * (0.5 + 0.5 * Math.sin(t * 2.2));
        const f = 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.0));
        const [gx, gy] = onAxis(f, ROOT_HALF * 0.4);
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        ctx.beginPath();
        ctx.arc(gx, gy + bob, 1.1 + g * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // a soft bright glint travels along the carrot (seamless via fract)
        const prog = (t * 0.45) % 1;
        const [gx, gy] = onAxis(lerp(0.2, 0.9, prog), ROOT_HALF * 0.5);
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.beginPath();
        ctx.ellipse(gx, gy + bob, 1.6, 1.0, Math.atan2(UY, UX), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.beginPath();
        ctx.arc(gx, gy + bob, 1.0, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // a top-frond flutter — extra leaflet shiver at the frond tips
        ctx.strokeStyle = rgba(p.topLight, 0.7);
        ctx.lineWidth = 0.8;
        const [bx, by] = onAxis(0.98, 0);
        FRONDS.forEach(([ang, len], i) => {
          const flut = Math.sin(t * 3.4 + i * 1.3) * 1.4;
          const tx = bx + Math.cos(ang) * len + sway * (0.4 + i * 0.18) + flut;
          const ty = by + Math.sin(ang) * len;
          ctx.beginPath();
          ctx.moveTo(tx, ty + bob);
          ctx.lineTo(tx + 1.6, ty + bob - 1.4);
          ctx.stroke();
        });
      } else {
        // Winter — drifting snowflakes + a cold sheen on the root
        const seeds: Array<[number, number, number]> = [
          [-10, 0.0, 1.0], [4, 0.4, 0.9], [10, 0.7, 0.8], [-3, 0.25, 0.9],
        ];
        ctx.fillStyle = "#ffffff";
        seeds.forEach(([fx, phase, r]) => {
          const prog = ((t / 3.0 + phase) % 1 + 1) % 1;
          const fy = -22 + prog * 40;
          const dx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
          ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.arc(dx, fy, r, 0, Math.PI * 2);
          ctx.fill();
        });
        // cold sheen pulsing on the carrot's upper side
        const [cx, cy] = onAxis(0.5, ROOT_HALF * 0.3);
        ctx.globalAlpha = 0.1 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.8));
        ctx.fillStyle = "rgba(210,232,255,1)";
        ctx.beginPath();
        ctx.ellipse(cx, cy + bob, 7, 3.2, Math.atan2(UY, UX), 0, Math.PI * 2);
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
