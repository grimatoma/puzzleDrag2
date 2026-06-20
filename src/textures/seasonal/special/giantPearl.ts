// Seasonal art for the GIANT PEARL aquatic tile (`tile_special_giant_pearl`).
//
// A large lustrous white pearl resting in a big OPEN clam/oyster shell (two
// fluted valves cradling it) on a still WATER pad. The pearl is the hero: big,
// round, with a soft pearlescent sheen and one bright highlight. The SAME
// silhouette — shell valves + round pearl — is drawn every season; only colour,
// light, gloss and small dressing (water/ice, petal/leaf/snowflake, frost on the
// shell rim) change. This is enforced by a single parameterized
// `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
//
// Aquatic framing: the ground pad reads as still WATER (a bluish reflective
// ellipse), not grass; winter FREEZES it to pale blue-white ice (iceAmt) with
// frost sparkle, the pearl staying clearly the bright hero. Origin-centered in
// the −24..+24 design box, light from upper-left, flat cel-shaded with a soft
// dark outline. Pure Canvas-2D vector drawing.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable params ─────────────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly. */
interface P {
  pearlLight: RGB;   // lit (upper-left) face of the pearl
  pearlMid: RGB;     // body tone of the pearl
  pearlDark: RGB;    // shaded underside / contact shadow on the pearl
  shellLight: RGB;   // lit ridges of the shell valves
  shellMid: RGB;     // shell body
  shellDark: RGB;    // shell interior / shaded valve
  water: RGB;        // pad surface (still water → ice in winter)
  waterDark: RGB;    // shaded pad underside / deeper water
  outline: RGB;      // soft dark outline tint
  light: RGB;        // ambient light tint laid over the whole tile
  lightAmt: number;  // 0..1 strength of the ambient light wash
  lustre: number;    // 0..1 pearlescent sheen strength (PEAK in summer)
  gloss: number;     // 0..1 specular highlight strength on the pearl
  frostAmt: number;  // 0..1 cool frost dusting on the shell rim (winter)
  snowCapAmt: number; // 0..1 frost/snow cap on the upward shell rim (winter)
  iceAmt: number;    // 0..1 pad frozen to pale blue-white ice (winter)
  padSnowAmt: number; // 0..1 frost sparkle on the pad ice (winter)
  blossomAmt: number; // 0..1 tiny blossom petal floating on the water (spring)
  fallenLeafAmt: number; // 0..1 fallen leaf floating on the water (autumn)
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
    pearlLight: lerpRGB(a.pearlLight, b.pearlLight, t),
    pearlMid: lerpRGB(a.pearlMid, b.pearlMid, t),
    pearlDark: lerpRGB(a.pearlDark, b.pearlDark, t),
    shellLight: lerpRGB(a.shellLight, b.shellLight, t),
    shellMid: lerpRGB(a.shellMid, b.shellMid, t),
    shellDark: lerpRGB(a.shellDark, b.shellDark, t),
    water: lerpRGB(a.water, b.water, t),
    waterDark: lerpRGB(a.waterDark, b.waterDark, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    lustre: lerp(a.lustre, b.lustre, t),
    gloss: lerp(a.gloss, b.gloss, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
    iceAmt: lerp(a.iceAmt, b.iceAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
  };
}

function clampP(p: P): P {
  return {
    ...p,
    lightAmt: clamp01(p.lightAmt),
    lustre: clamp01(p.lustre),
    gloss: clamp01(p.gloss),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    iceAmt: clamp01(p.iceAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────

const SP: Record<SeasonName, P> = {
  // Spring — lustrous pearl in the shell; fresh bright-blue water + a blossom petal.
  Spring: {
    pearlLight: [255, 255, 255],
    pearlMid: [232, 234, 242],
    pearlDark: [186, 192, 210],
    shellLight: [236, 224, 232],
    shellMid: [206, 188, 200],
    shellDark: [150, 130, 148],
    water: [120, 196, 230],
    waterDark: [66, 138, 184],
    outline: [60, 62, 84],
    light: [232, 244, 248],
    lightAmt: 0.16,
    lustre: 0.62,
    gloss: 0.7,
    frostAmt: 0,
    snowCapAmt: 0,
    iceAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — pearl at its most brilliant lustre (PEAK); bright saturated blue water.
  Summer: {
    pearlLight: [255, 255, 255],
    pearlMid: [240, 242, 250],
    pearlDark: [196, 202, 222],
    shellLight: [244, 230, 238],
    shellMid: [214, 194, 208],
    shellDark: [156, 134, 154],
    water: [70, 176, 232],
    waterDark: [30, 116, 184],
    outline: [50, 54, 80],
    light: [255, 246, 220],
    lightAmt: 0.2,
    lustre: 1.0,
    gloss: 1.0,
    frostAmt: 0,
    snowCapAmt: 0,
    iceAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — pearl a touch warmer/cream; duller olive-tinged water + a fallen leaf.
  Autumn: {
    pearlLight: [252, 248, 236],
    pearlMid: [232, 224, 200],
    pearlDark: [184, 174, 146],
    shellLight: [234, 216, 200],
    shellMid: [200, 176, 158],
    shellDark: [144, 118, 102],
    water: [120, 156, 144],
    waterDark: [78, 110, 96],
    outline: [62, 56, 50],
    light: [248, 214, 158],
    lightAmt: 0.22,
    lustre: 0.5,
    gloss: 0.55,
    frostAmt: 0,
    snowCapAmt: 0,
    iceAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — water FROZEN to pale blue-white ice + frost; frost on the shell rim;
  // the lustrous white pearl still the bright hero; cool light.
  Winter: {
    pearlLight: [255, 255, 255],
    pearlMid: [236, 240, 248],
    pearlDark: [190, 200, 220],
    shellLight: [224, 216, 228],
    shellMid: [188, 180, 198],
    shellDark: [134, 128, 150],
    water: [214, 230, 244],
    waterDark: [160, 188, 214],
    outline: [62, 66, 92],
    light: [212, 230, 252],
    lightAmt: 0.3,
    lustre: 0.66,
    gloss: 0.7,
    frostAmt: 0.7,
    snowCapAmt: 0.8,
    iceAmt: 0.95,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Geometry constants (the SAME silhouette every season) ────────────────────

// Pearl — big round hero sitting in the cradle of the open shell.
const PEARL_CX = 0;
const PEARL_CY = 4;   // centre y of the pearl (rests in the shell on the pad)
const PEARL_R = 11.5; // radius — big, the hero

// Shell — two fluted open valves cradling the pearl, base resting on the water.
const SHELL_BASE_Y = 15; // where the lower valve meets the water

/** Trace one fluted valve of the open shell as a fan-shaped path.
 *  `dir` = +1 lower valve (cradle below the pearl), -1 upper valve (behind). */
function shellValvePath(ctx: CanvasRenderingContext2D, dir: number, bob: number): void {
  const hingeY = SHELL_BASE_Y + bob;
  // Lower valve opens upward into a cradle; upper valve fans up behind the pearl.
  const open = dir > 0 ? 1 : 0.78; // upper valve a touch tighter
  ctx.beginPath();
  // hinge at the back-centre, sweep out to a wide fluted rim
  ctx.moveTo(-15.5, hingeY - dir * 1.5);
  ctx.quadraticCurveTo(
    -16.5,
    hingeY - dir * (8 + 5 * open),
    -8,
    hingeY - dir * (12.5 + 6 * open),
  );
  ctx.quadraticCurveTo(
    0,
    hingeY - dir * (15.5 + 7 * open),
    8,
    hingeY - dir * (12.5 + 6 * open),
  );
  ctx.quadraticCurveTo(
    16.5,
    hingeY - dir * (8 + 5 * open),
    15.5,
    hingeY - dir * 1.5,
  );
  // rim back to the hinge along the inner cradle line
  ctx.quadraticCurveTo(8, hingeY + dir * 1.2, 0, hingeY + dir * 1.8);
  ctx.quadraticCurveTo(-8, hingeY + dir * 1.2, -15.5, hingeY - dir * 1.5);
  ctx.closePath();
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

    // ── Pad: still WATER ellipse (Aquatic), x∈[−18,+18], centre y≈+19 ────────
    // soft contact shadow lower-right
    ctx.fillStyle = rgba(p.waterDark, 0.4);
    ctx.beginPath();
    ctx.ellipse(3, 21.5, 16, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // deeper-water shaded underside
    ctx.fillStyle = rgb(p.waterDark);
    ctx.beginPath();
    ctx.ellipse(0, 20.4, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // still-water surface
    ctx.fillStyle = rgb(p.water);
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // reflective water highlight bands (still, glassy reflection)
    ctx.strokeStyle = rgba([255, 255, 255], 0.22);
    ctx.lineWidth = 1.1;
    for (let i = -2; i <= 2; i++) {
      const ry = 18 + i * 1.3;
      const rw = 14 - Math.abs(i) * 2.4;
      ctx.beginPath();
      ctx.ellipse(-2 + i * 1.2, ry, rw, 0.7, 0, 0, Math.PI);
      ctx.stroke();
    }

    // pad frozen to pale blue-white ICE (winter)
    if (p.iceAmt > 0.01) {
      const a = p.iceAmt;
      ctx.fillStyle = rgba([224, 238, 250], 0.9 * a);
      ctx.beginPath();
      ctx.ellipse(0, 19, 17.6, 5.0, 0, 0, Math.PI * 2);
      ctx.fill();
      // cracked-ice facet lines
      ctx.strokeStyle = rgba([170, 200, 226], 0.55 * a);
      ctx.lineWidth = 0.9;
      const cracks: Array<[number, number, number, number]> = [
        [-12, 18, -2, 20], [-2, 20, 9, 17.5], [9, 17.5, 15, 20],
        [-6, 16.5, 1, 21],
      ];
      cracks.forEach(([x0, y0, x1, y1]) => {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      });
      // cool ice sheen rim
      ctx.strokeStyle = rgba([245, 252, 255], 0.6 * a);
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.ellipse(0, 18.4, 17.4, 4.6, 0, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
    }

    // frost sparkle on the pad ice (winter)
    if (p.padSnowAmt > 0.01) {
      ctx.fillStyle = rgba([255, 255, 255], 0.85 * p.padSnowAmt);
      [[-10, 18.4], [6, 19.6], [12, 17.8], [-3, 20.6], [2, 17.4]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // floating blossom petal on the water (spring)
    if (p.blossomAmt > 0.01) {
      const a = p.blossomAmt;
      const spots: Array<[number, number]> = [[-13, 18.6], [12, 18]];
      spots.forEach(([bx, by], idx) => {
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(idx === 0 ? -0.3 : 0.4);
        ctx.fillStyle = rgba(idx === 0 ? [255, 232, 246] : [255, 248, 252], 0.95 * a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.6, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba([255, 214, 220], 0.7 * a);
        ctx.beginPath();
        ctx.ellipse(-0.6, 0, 1.0, 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // floating fallen leaf on the water (autumn)
    if (p.fallenLeafAmt > 0.01) {
      const a = p.fallenLeafAmt;
      const leaves: Array<[number, number, number, RGB]> = [
        [-12, 19.4, -0.5, [196, 120, 40]],
        [12, 18.6, 0.7, [176, 72, 32]],
      ];
      leaves.forEach(([lx, ly, rot, col]) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = rgba(col, a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.2, 1.7, 0, 0, Math.PI * 2);
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

    // ── Contact shadow of the shell on the water ────────────────────────────
    ctx.fillStyle = rgba(p.outline, 0.26);
    ctx.beginPath();
    ctx.ellipse(2.5, SHELL_BASE_Y + bob + 2.5, 15, 3.0, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Subject: open shell cradling the giant pearl ────────────────────────
    // Draw order: upper (back) valve → pearl → lower (front) valve cradle.

    // -- upper/back valve (behind the pearl) --
    // outline pass (fatter, dark first)
    shellValvePath(ctx, -1, bob);
    ctx.fillStyle = rgb(p.outline);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = rgb(p.outline);
    ctx.stroke();
    ctx.fill();
    // body
    ctx.save();
    shellValvePath(ctx, -1, bob);
    ctx.clip();
    const upGrad = ctx.createLinearGradient(0, SHELL_BASE_Y - 22 + bob, 0, SHELL_BASE_Y + bob);
    upGrad.addColorStop(0, rgb(p.shellLight));
    upGrad.addColorStop(0.6, rgb(p.shellMid));
    upGrad.addColorStop(1, rgb(p.shellDark));
    ctx.fillStyle = upGrad;
    ctx.fillRect(-18, SHELL_BASE_Y - 24 + bob, 36, 26);
    // fluting ribs on the back valve
    ctx.strokeStyle = rgba(p.shellDark, 0.7);
    ctx.lineWidth = 1.2;
    [-9, -4.5, 0, 4.5, 9].forEach((rx) => {
      ctx.beginPath();
      ctx.moveTo(rx * 0.18, SHELL_BASE_Y - 0.5 + bob);
      ctx.lineTo(rx * 1.5, SHELL_BASE_Y - 18 + bob);
      ctx.stroke();
    });
    ctx.restore();

    // -- the giant PEARL (hero) --
    const pcx = PEARL_CX;
    const pcy = PEARL_CY + bob;
    // soft drop/contact shadow on the back valve interior under the pearl
    ctx.fillStyle = rgba(p.outline, 0.3);
    ctx.beginPath();
    ctx.ellipse(pcx + 1.5, pcy + PEARL_R - 1.5, PEARL_R * 0.82, PEARL_R * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // pearl outline rim
    ctx.beginPath();
    ctx.arc(pcx, pcy, PEARL_R + 0.6, 0, Math.PI * 2);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();

    // pearl body: radial pearlescent gradient, light from upper-left
    const pGrad = ctx.createRadialGradient(
      pcx - PEARL_R * 0.42, pcy - PEARL_R * 0.46, PEARL_R * 0.1,
      pcx, pcy, PEARL_R,
    );
    pGrad.addColorStop(0, rgb(p.pearlLight));
    pGrad.addColorStop(0.5, rgb(p.pearlMid));
    pGrad.addColorStop(1, rgb(p.pearlDark));
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.arc(pcx, pcy, PEARL_R, 0, Math.PI * 2);
    ctx.fill();

    // pearlescent sheen band — a soft iridescent arc (lustre strength from P)
    if (p.lustre > 0.02) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(pcx, pcy, PEARL_R, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = rgba([214, 226, 255], 0.22 + 0.34 * p.lustre);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(pcx - 1.5, pcy + 1, PEARL_R * 0.78, PEARL_R * 0.5, -0.5, Math.PI * 0.05, Math.PI * 0.95);
      ctx.stroke();
      // a faint warm under-sheen for iridescence
      ctx.strokeStyle = rgba([255, 232, 244], 0.14 + 0.22 * p.lustre);
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(pcx + 1, pcy + 3, PEARL_R * 0.66, PEARL_R * 0.4, -0.4, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
      ctx.restore();
    }

    // soft lower-right terminator shade to round the pearl
    ctx.save();
    ctx.beginPath();
    ctx.arc(pcx, pcy, PEARL_R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = rgba(p.pearlDark, 0.5);
    ctx.beginPath();
    ctx.ellipse(pcx + PEARL_R * 0.5, pcy + PEARL_R * 0.55, PEARL_R * 0.8, PEARL_R * 0.75, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // bright specular highlight on the upper-left (gloss strength from P)
    if (p.gloss > 0.02) {
      ctx.fillStyle = rgba([255, 255, 255], 0.55 + 0.4 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(pcx - PEARL_R * 0.4, pcy - PEARL_R * 0.42, PEARL_R * 0.26, PEARL_R * 0.34, -0.5, 0, Math.PI * 2);
      ctx.fill();
      // tiny crisp catch-light dot
      ctx.fillStyle = rgba([255, 255, 255], 0.85);
      ctx.beginPath();
      ctx.arc(pcx - PEARL_R * 0.52, pcy - PEARL_R * 0.52, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // -- lower/front valve (cradle in front of the pearl base) --
    shellValvePath(ctx, 1, bob);
    ctx.fillStyle = rgb(p.outline);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = rgb(p.outline);
    ctx.stroke();
    ctx.fill();
    ctx.save();
    shellValvePath(ctx, 1, bob);
    ctx.clip();
    const loGrad = ctx.createLinearGradient(0, SHELL_BASE_Y - 4 + bob, 0, SHELL_BASE_Y + 20 + bob);
    loGrad.addColorStop(0, rgb(p.shellLight));
    loGrad.addColorStop(0.55, rgb(p.shellMid));
    loGrad.addColorStop(1, rgb(p.shellDark));
    ctx.fillStyle = loGrad;
    ctx.fillRect(-18, SHELL_BASE_Y - 4 + bob, 36, 26);
    // fluting ribs on the front cradle valve
    ctx.strokeStyle = rgba(p.shellDark, 0.7);
    ctx.lineWidth = 1.2;
    [-9, -4.5, 0, 4.5, 9].forEach((rx) => {
      ctx.beginPath();
      ctx.moveTo(rx * 0.18, SHELL_BASE_Y + 0.5 + bob);
      ctx.lineTo(rx * 1.5, SHELL_BASE_Y + 14 + bob);
      ctx.stroke();
    });
    // lit rim highlight along the front valve lip
    ctx.strokeStyle = rgba(p.shellLight, 0.6);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-14, SHELL_BASE_Y - 0.5 + bob);
    ctx.quadraticCurveTo(0, SHELL_BASE_Y + 2 + bob, 14, SHELL_BASE_Y - 0.5 + bob);
    ctx.stroke();
    ctx.restore();

    // frost cap / snow on the UPWARD shell rim (winter) — pearl stays clear
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.92 * a);
      ctx.beginPath();
      ctx.moveTo(-14, SHELL_BASE_Y - 8.5 + bob);
      ctx.quadraticCurveTo(-8, SHELL_BASE_Y - 12 + bob, -1, SHELL_BASE_Y - 11.5 + bob);
      ctx.quadraticCurveTo(-9, SHELL_BASE_Y - 9 + bob, -14, SHELL_BASE_Y - 8.5 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(14, SHELL_BASE_Y - 8.5 + bob);
      ctx.quadraticCurveTo(8, SHELL_BASE_Y - 12 + bob, 1, SHELL_BASE_Y - 11.5 + bob);
      ctx.quadraticCurveTo(9, SHELL_BASE_Y - 9 + bob, 14, SHELL_BASE_Y - 8.5 + bob);
      ctx.closePath();
      ctx.fill();
    }

    // frost dusting sparkle on the shell rim (winter)
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-13, SHELL_BASE_Y - 9 + bob], [13, SHELL_BASE_Y - 9 + bob],
        [-7, SHELL_BASE_Y - 11.5 + bob], [7, SHELL_BASE_Y - 11.5 + bob],
        [-15, SHELL_BASE_Y + 13 + bob], [15, SHELL_BASE_Y + 13 + bob],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
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

// A*(1-cos(w t))*0.5 → 0 at t=0 with zero velocity; period 2π/w.
function bobAt(t: number, amp = 0.6, w = 1.3): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    paint(ctx, SP[season], bob);

    ctx.save();
    try {
      ctx.globalAlpha = 1;

      // Shared gentle water-ripple shimmer on the pad (subtle, seamless).
      const rippleA = 0.1 + 0.12 * (0.5 + 0.5 * Math.sin(t * 1.4));
      ctx.strokeStyle = `rgba(255,255,255,${rippleA})`;
      ctx.lineWidth = 1.0;
      const rPhase = (t * 0.5) % 1;
      ctx.beginPath();
      ctx.ellipse(-2, 19, 9 + rPhase * 7, 1.6 + rPhase * 1.0, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Soft pearlescent GLINT slowly arcing across the pearl (subtle, no flash).
      const pcx = PEARL_CX;
      const pcy = PEARL_CY + bob;
      // glint travels along an arc on the upper face; brightest in summer.
      const glintBright = season === "Summer" ? 0.5 : season === "Autumn" ? 0.26 : 0.34;
      const ga = ((t * 0.18) % 1 + 1) % 1; // 0..1 slow sweep
      const gang = lerp(Math.PI * 0.85, Math.PI * 0.15, ga); // upper-left → upper-right
      const gx = pcx + Math.cos(gang) * PEARL_R * 0.62;
      const gy = pcy - Math.sin(gang) * PEARL_R * 0.62 + 1;
      ctx.save();
      ctx.beginPath();
      ctx.arc(pcx, pcy, PEARL_R - 0.5, 0, Math.PI * 2);
      ctx.clip();
      const gGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, 5.5);
      gGrad.addColorStop(0, `rgba(255,255,255,${glintBright})`);
      gGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gGrad;
      ctx.beginPath();
      ctx.arc(gx, gy, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (season === "Spring") {
        // dew shimmer — a small soft glint pulsing near the shell rim
        const g = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(t * 2.0));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        ctx.beginPath();
        ctx.arc(-9, SHELL_BASE_Y - 8 + bob, 1.0 + g, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // the floating leaf drifts gently on the water
        const dx = Math.sin(t * 0.9) * 2.0;
        const dy = Math.sin(t * 0.7) * 0.6;
        ctx.save();
        ctx.translate(-12 + dx, 19.4 + dy);
        ctx.rotate(-0.5 + Math.sin(t * 0.8) * 0.12);
        ctx.fillStyle = "rgba(196,120,40,0.9)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.2, 1.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(90,44,16,0.9)";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.lineTo(3, 0);
        ctx.stroke();
        ctx.restore();
      } else if (season === "Winter") {
        // cold sheen on the ice + a drifting snowflake
        ctx.globalAlpha = 0.1 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.8));
        ctx.fillStyle = "rgba(210,232,255,1)";
        ctx.beginPath();
        ctx.ellipse(-3, 19, 10, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        const prog = ((t / 3.4) % 1 + 1) % 1;
        const fy = -22 + prog * 40;
        const fx = 6 + Math.sin(prog * Math.PI * 2) * 4;
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
        ctx.beginPath();
        ctx.arc(fx, fy, 1.0, 0, Math.PI * 2);
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
