// Seasonal art for the CLAM aquatic tile (`tile_fish_clam`).
//
// A ridged tan clam shell, slightly open (two hinged fluted valves with
// radiating ribs and a sliver of pale pearl-cream soft body peeking between
// them), resting on a still WATER pad — NOT grass. The SAME shell silhouette is
// drawn every season; only colour, the water/ice treatment, and the small
// dressing (blossom petal, fallen leaf, frost, snow) change. This is enforced
// by a single parameterized `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The bob
// uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
//
// PALETTE LOCK: the clam shell stays TAN every season. Winter FREEZES the water
// pad to pale blue-white ICE (iceAmt) with frost sparkle; the tan shell stays
// clearly visible underneath a light dusting of snow/frost.
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
  shellLight: RGB; // lit ridge tops of the tan shell
  shellMid: RGB; // body tone of the tan shell
  shellDark: RGB; // shadowed grooves / lower valve
  bodyCream: RGB; // pale pearl-cream soft body peeking between the valves
  water: RGB; // top of the water pad
  waterDeep: RGB; // shaded underside / depth of the water
  ice: RGB; // pale blue-white ice tone (winter water)
  outline: RGB; // soft dark outline tint
  light: RGB; // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  openAmt: number; // 0..1 how far the upper valve is lifted (constant-ish; idle nudges it)
  gloss: number; // 0..1 specular gloss-streak strength on the shell
  frostAmt: number; // 0..1 cool frost dusting on the shell (winter)
  snowCapAmt: number; // 0..1 snow on the upward ridges of the shell (winter)
  iceAmt: number; // 0..1 the water pad frozen to ice (winter)
  blossomAmt: number; // 0..1 tiny floating blossom petal on the water (spring)
  fallenLeafAmt: number; // 0..1 floating fallen leaf on the water (autumn)
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
    shellLight: lerpRGB(a.shellLight, b.shellLight, t),
    shellMid: lerpRGB(a.shellMid, b.shellMid, t),
    shellDark: lerpRGB(a.shellDark, b.shellDark, t),
    bodyCream: lerpRGB(a.bodyCream, b.bodyCream, t),
    water: lerpRGB(a.water, b.water, t),
    waterDeep: lerpRGB(a.waterDeep, b.waterDeep, t),
    ice: lerpRGB(a.ice, b.ice, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    openAmt: lerp(a.openAmt, b.openAmt, t),
    gloss: lerp(a.gloss, b.gloss, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
    iceAmt: lerp(a.iceAmt, b.iceAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
  };
}

function clampP(p: P): P {
  return {
    ...p,
    lightAmt: clamp01(p.lightAmt),
    openAmt: clamp01(p.openAmt),
    gloss: clamp01(p.gloss),
    frostAmt: clamp01(p.frostAmt),
    snowCapAmt: clamp01(p.snowCapAmt),
    iceAmt: clamp01(p.iceAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────
// SHELL STAYS TAN every season (palette lock). Only the water/ice, light, and
// pad dressing change between seasons.

const TAN_LIGHT: RGB = [230, 206, 162]; // lit ridge top
const TAN_MID: RGB = [205, 174, 124]; // body tan
const TAN_DARK: RGB = [156, 122, 78]; // shadowed groove
const CREAM: RGB = [244, 232, 214]; // pearl-cream soft body

const SP: Record<SeasonName, P> = {
  // Spring — fresh bright-blue dewy water + a tiny floating blossom petal.
  Spring: {
    shellLight: TAN_LIGHT,
    shellMid: TAN_MID,
    shellDark: TAN_DARK,
    bodyCream: CREAM,
    water: [120, 196, 230],
    waterDeep: [66, 138, 190],
    ice: [222, 238, 248],
    outline: [78, 60, 40],
    light: [232, 244, 250],
    lightAmt: 0.16,
    openAmt: 0.6,
    gloss: 0.4,
    frostAmt: 0,
    snowCapAmt: 0,
    iceAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — bright saturated blue water (PEAK), warm light, strong gloss.
  Summer: {
    shellLight: TAN_LIGHT,
    shellMid: TAN_MID,
    shellDark: TAN_DARK,
    bodyCream: CREAM,
    water: [70, 178, 232],
    waterDeep: [34, 118, 188],
    ice: [222, 238, 248],
    outline: [78, 58, 38],
    light: [255, 242, 208],
    lightAmt: 0.18,
    openAmt: 0.6,
    gloss: 0.95,
    frostAmt: 0,
    snowCapAmt: 0,
    iceAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — duller olive-tinged water + a floating fallen leaf, low amber light.
  Autumn: {
    shellLight: TAN_LIGHT,
    shellMid: TAN_MID,
    shellDark: TAN_DARK,
    bodyCream: CREAM,
    water: [120, 152, 130],
    waterDeep: [78, 108, 92],
    ice: [222, 238, 248],
    outline: [74, 54, 34],
    light: [248, 210, 150],
    lightAmt: 0.2,
    openAmt: 0.58,
    gloss: 0.4,
    frostAmt: 0,
    snowCapAmt: 0,
    iceAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — water FROZEN to pale blue-white ice + frost sparkle; a little
  // snow/frost on the still-clearly-tan shell; cool light.
  Winter: {
    shellLight: TAN_LIGHT,
    shellMid: TAN_MID,
    shellDark: TAN_DARK,
    bodyCream: CREAM,
    water: [182, 210, 226],
    waterDeep: [136, 170, 196],
    ice: [226, 240, 250],
    outline: [70, 62, 60],
    light: [206, 226, 252],
    lightAmt: 0.3,
    openAmt: 0.5,
    gloss: 0.3,
    frostAmt: 0.7,
    snowCapAmt: 0.8,
    iceAmt: 0.95,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Clam geometry constants (the SAME silhouette every season) ───────────────
// Two hinged fluted valves resting on the water pad. The hinge is at the back
// (lower-right); the valves open toward the upper-left. Origin-centered.

const HINGE_X = 4; // hinge pivot
const HINGE_Y = 14;
const SHELL_R = 14.5; // valve radius (fan length)
const RIB_COUNT = 7; // radiating ribs per valve

/** Trace one fluted valve fan as a closed path, given the lip angle (radians,
 *  measured from the hinge) and the open lift. The valve is a wide shallow fan
 *  with a scalloped (fluted) outer rim. */
function valvePath(ctx: CanvasRenderingContext2D, tilt: number, span: number): void {
  // The valve fans from the hinge outward. `tilt` rotates the whole fan;
  // `span` is the angular half-width of the fan.
  ctx.beginPath();
  ctx.moveTo(0, 0); // hinge (local origin)
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const a = tilt - span + (2 * span * i) / steps;
    // fluted rim: small scallop ripple along the outer edge
    const flute = 1 + 0.07 * Math.cos((i / steps) * RIB_COUNT * Math.PI);
    const r = SHELL_R * flute;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
}

/** Draw radiating rib grooves over the current valve (call inside its clip). */
function valveRibs(ctx: CanvasRenderingContext2D, tilt: number, span: number, dark: RGB, light: RGB): void {
  for (let i = 0; i <= RIB_COUNT; i++) {
    const a = tilt - span + (2 * span * i) / RIB_COUNT;
    // dark groove
    ctx.strokeStyle = rgba(dark, 0.8);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 2.5, Math.sin(a) * 2.5);
    ctx.lineTo(Math.cos(a) * (SHELL_R + 0.5), Math.sin(a) * (SHELL_R + 0.5));
    ctx.stroke();
    // bright ridge top alongside it
    const a2 = a + (span / RIB_COUNT) * 0.42;
    ctx.strokeStyle = rgba(light, 0.5);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a2) * 3.5, Math.sin(a2) * 3.5);
    ctx.lineTo(Math.cos(a2) * (SHELL_R - 1), Math.sin(a2) * (SHELL_R - 1));
    ctx.stroke();
  }
}

/** The whole tile from ONLY `p` and `bob`. */
function paint(ctx: CanvasRenderingContext2D, raw: P, bob: number): void {
  const p = clampP(raw);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // ── Pad: a still WATER ellipse (bluish reflective), x∈[−18,+18], y≈+19 ────
    // soft contact shadow lower-right
    ctx.fillStyle = rgba(p.waterDeep, 0.4);
    ctx.beginPath();
    ctx.ellipse(3, 21.5, 16, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // deep water underside
    ctx.fillStyle = rgb(p.waterDeep);
    ctx.beginPath();
    ctx.ellipse(0, 20.4, 18, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // water surface
    const waterGrad = ctx.createLinearGradient(0, 14, 0, 24);
    waterGrad.addColorStop(0, rgb(p.water));
    waterGrad.addColorStop(1, rgb(p.waterDeep));
    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // still-water reflective glints (a couple of pale highlight slivers)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = rgba([255, 255, 255], 0.22);
    ctx.lineWidth = 1.1;
    [[-9, 17.6, 6], [6, 20, 5], [-2, 21, 4]].forEach(([gx, gy, gw]) => {
      ctx.beginPath();
      ctx.moveTo(gx - gw / 2, gy);
      ctx.lineTo(gx + gw / 2, gy);
      ctx.stroke();
    });
    ctx.restore();

    // ── Winter ice: the water frozen to pale blue-white, with frost sparkle ──
    if (p.iceAmt > 0.01) {
      const a = p.iceAmt;
      // milky ice sheet over the water
      ctx.fillStyle = rgba(p.ice, 0.9 * a);
      ctx.beginPath();
      ctx.ellipse(0, 19, 18, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();
      // a darker rim so the ice reads as a frozen disc, not a flat fill
      ctx.strokeStyle = rgba(p.waterDeep, 0.5 * a);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 19, 17.6, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      // angular crack lines across the ice
      ctx.strokeStyle = rgba([255, 255, 255], 0.5 * a);
      ctx.lineWidth = 0.8;
      [[-12, 18, -3, 20], [-2, 17, 9, 20.5], [4, 21, 13, 18.5]].forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });
      // frost sparkle dots
      ctx.fillStyle = rgba([255, 255, 255], 0.85 * a);
      [[-10, 18], [5, 17.6], [11, 19.2], [-4, 20.4], [1, 18.2]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // floating blossom petal on the water (spring)
    if (p.blossomAmt > 0.01) {
      const a = p.blossomAmt;
      const spots: Array<[number, number, number]> = [[-13, 18.5, 0.4], [12, 17.8, -0.6]];
      spots.forEach(([bx, by, rot]) => {
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(rot);
        ctx.fillStyle = rgba([255, 232, 246], 0.95 * a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.6, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba([255, 250, 252], 0.8 * a);
        ctx.beginPath();
        ctx.ellipse(-0.6, -0.3, 1.4, 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // floating fallen leaf on the water (autumn)
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

    // ── Subject: the clam (SAME silhouette every season) ────────────────────
    // The shell sits low-centre on the pad. Lower valve rests flat; upper valve
    // lifts by `openAmt` to reveal the cream body between them. Hinge at back.
    const ox = -2; // shell centred slightly left
    const oy = -1 + bob; // contact roughly on the pad, plus idle bob

    // contact shadow of the shell on the water/ice
    ctx.fillStyle = rgba(p.outline, 0.26);
    ctx.beginPath();
    ctx.ellipse(ox + 2, HINGE_Y + bob + 2.5, 13, 3.0, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(ox + HINGE_X, oy + HINGE_Y); // move local origin to the hinge

    // Fan tilts: valves open toward upper-left. Lower valve is the resting half,
    // upper valve lifts by openAmt. Angles in radians (canvas y-down).
    const baseTilt = Math.PI * 0.92; // points up-left
    const span = 0.66;
    const lowerTilt = baseTilt + 0.34; // lower valve angled toward the water
    const upperTilt = baseTilt - 0.34 - p.openAmt * 0.22; // upper valve lifted open

    // — Lower valve —
    ctx.save();
    valvePath(ctx, lowerTilt, span);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill(); // outline pass (fatter under the fill)
    ctx.restore();

    ctx.save();
    valvePath(ctx, lowerTilt, span * 0.97);
    ctx.clip();
    ctx.fillStyle = rgb(p.shellDark);
    ctx.fillRect(-SHELL_R - 4, -SHELL_R - 4, (SHELL_R + 4) * 2, (SHELL_R + 4) * 2);
    // lit gradient across the lower valve
    const lg = ctx.createLinearGradient(-SHELL_R, -SHELL_R, SHELL_R, SHELL_R);
    lg.addColorStop(0, rgb(p.shellMid));
    lg.addColorStop(1, rgb(p.shellDark));
    ctx.fillStyle = lg;
    ctx.fillRect(-SHELL_R - 4, -SHELL_R - 4, (SHELL_R + 4) * 2, (SHELL_R + 4) * 2);
    valveRibs(ctx, lowerTilt, span, p.shellDark, p.shellMid);
    ctx.restore();

    // — Pearl-cream soft body sliver peeking between the valves (at the hinge) —
    ctx.save();
    ctx.fillStyle = rgb(p.bodyCream);
    ctx.beginPath();
    // a small soft lens of body where the two valves part
    const bodyA = baseTilt;
    const bdx = Math.cos(bodyA);
    const bdy = Math.sin(bodyA);
    ctx.ellipse(bdx * 6.5, bdy * 6.5, 5.5, 2.6, bodyA + Math.PI / 2, 0, Math.PI * 2);
    ctx.fill();
    // a faint shaded crease in the body
    ctx.strokeStyle = rgba(p.shellDark, 0.4);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(bdx * 3, bdy * 3);
    ctx.lineTo(bdx * 10, bdy * 10);
    ctx.stroke();
    ctx.restore();

    // — Upper valve (lifted, lit) — drawn over the body so it overlaps —
    ctx.save();
    valvePath(ctx, upperTilt, span);
    ctx.fillStyle = rgb(p.outline);
    ctx.fill();
    ctx.restore();

    ctx.save();
    valvePath(ctx, upperTilt, span * 0.97);
    ctx.clip();
    ctx.fillStyle = rgb(p.shellMid);
    ctx.fillRect(-SHELL_R - 4, -SHELL_R - 4, (SHELL_R + 4) * 2, (SHELL_R + 4) * 2);
    // lit gradient — upper valve catches more light from upper-left
    const ug = ctx.createLinearGradient(-SHELL_R, -SHELL_R, SHELL_R * 0.4, SHELL_R);
    ug.addColorStop(0, rgb(p.shellLight));
    ug.addColorStop(0.55, rgb(p.shellMid));
    ug.addColorStop(1, rgb(p.shellDark));
    ctx.fillStyle = ug;
    ctx.globalAlpha = 0.95;
    ctx.fillRect(-SHELL_R - 4, -SHELL_R - 4, (SHELL_R + 4) * 2, (SHELL_R + 4) * 2);
    ctx.globalAlpha = 1;
    valveRibs(ctx, upperTilt, span, p.shellDark, p.shellLight);

    // gloss streak on the upper valve (gloss strength from P)
    if (p.gloss > 0.02) {
      const ga = baseTilt - 0.2;
      ctx.fillStyle = rgba([255, 255, 255], 0.12 + 0.5 * p.gloss);
      ctx.beginPath();
      ctx.ellipse(Math.cos(ga) * 7, Math.sin(ga) * 7, 4.4, 1.7, ga + Math.PI / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // frost dusting on the upward shell (winter) — cool speckle, shell stays tan
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([210, 230, 250], 0.22 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(Math.cos(baseTilt) * 8, Math.sin(baseTilt) * 8, SHELL_R * 0.7, 3.4, baseTilt + Math.PI / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([235, 246, 255], 0.7 * p.frostAmt);
      [4, 7, 10, 13].forEach((rr, i) => {
        const fa = baseTilt - span + (i / 3) * span * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(fa) * rr, Math.sin(fa) * rr, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.restore(); // end upper-valve clip

    // — Snow cap on the upper ridges of the lifted valve (winter) —
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.92 * a);
      ctx.beginPath();
      const c1 = upperTilt - span * 0.8;
      const c2 = upperTilt + span * 0.8;
      ctx.moveTo(Math.cos(c1) * (SHELL_R - 1), Math.sin(c1) * (SHELL_R - 1));
      ctx.quadraticCurveTo(
        Math.cos(upperTilt) * (SHELL_R + 2.5),
        Math.sin(upperTilt) * (SHELL_R + 2.5),
        Math.cos(c2) * (SHELL_R - 1),
        Math.sin(c2) * (SHELL_R - 1),
      );
      ctx.quadraticCurveTo(
        Math.cos(upperTilt) * (SHELL_R - 4),
        Math.sin(upperTilt) * (SHELL_R - 4),
        Math.cos(c1) * (SHELL_R - 1),
        Math.sin(c1) * (SHELL_R - 1),
      );
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore(); // end shell hinge translate

    // ── Ambient light wash over the whole tile (per-season tint) ────────────
    if (p.lightAmt > 0.001) {
      ctx.globalAlpha = 1;
      const lgrad = ctx.createRadialGradient(-10, -14, 2, -10, -14, 46);
      lgrad.addColorStop(0, rgba(p.light, p.lightAmt));
      lgrad.addColorStop(1, rgba(p.light, p.lightAmt * 0.25));
      ctx.fillStyle = lgrad;
      ctx.fillRect(-24, -24, 48, 48);
    }
  } finally {
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── Idle bob (seamless, zero-velocity at t=0) ────────────────────────────────

// A*(1-cos(w t))*0.5 → 0 at t=0 with zero velocity; period 2π/w.
function bobAt(t: number, amp = 0.7, w = 1.4): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// "Breathing" of the shell: the upper valve opens a hair and closes, seamless,
// zero at t=0 so it hands off cleanly from the still. Added to openAmt.
function breatheAt(t: number, amp = 0.12, w = 1.0): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    const bob = bobAt(t);
    // The shell "breathes": nudge openAmt seamlessly (0 at t=0).
    const sp = SP[season];
    const breathing: P = { ...sp, openAmt: clamp01(sp.openAmt + breatheAt(t)) };
    paint(ctx, breathing, bob);

    ctx.save();
    try {
      ctx.globalAlpha = 1;
      if (season === "Spring") {
        // gentle water-ripple shimmer + a soft dew glint
        const rippleY = 19 + Math.sin(t * 1.6) * 0.4;
        ctx.strokeStyle = `rgba(255,255,255,${0.16 + 0.12 * (0.5 + 0.5 * Math.sin(t * 1.6))})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, rippleY, 12 + Math.sin(t * 1.1) * 1.5, 3.2, 0, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
        const g = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.2));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        ctx.beginPath();
        ctx.arc(-4, -2 + bob, 1.0 + g * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // bright ripple + a soft glint travelling on the shell
        const rippleY = 19 + Math.sin(t * 1.8) * 0.5;
        ctx.strokeStyle = `rgba(255,255,255,${0.2 + 0.14 * (0.5 + 0.5 * Math.sin(t * 1.8))})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.ellipse(0, rippleY, 13 + Math.sin(t * 1.3) * 1.6, 3.4, 0, Math.PI * 0.1, Math.PI * 0.9);
        ctx.stroke();
        const prog = (t * 0.5) % 1;
        const ga = Math.PI * 0.92 - 0.4 + prog * 0.8;
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.beginPath();
        ctx.ellipse(-2 + Math.cos(ga) * 8, -1 + bob + Math.sin(ga) * 8, 1.7, 1.1, ga, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // ripple + the floating leaf drifts gently across the water
        const rippleY = 19 + Math.sin(t * 1.3) * 0.35;
        ctx.strokeStyle = `rgba(255,255,255,${0.1 + 0.1 * (0.5 + 0.5 * Math.sin(t * 1.3))})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, rippleY, 12, 3.0, 0, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
        // drifting leaf overlay (on top of the static one, gently bobbing)
        const dx = Math.sin(t * 0.6) * 2.5;
        const dy = 19.4 + Math.sin(t * 0.9) * 0.5;
        ctx.save();
        ctx.translate(-12 + dx, dy);
        ctx.rotate(-0.5 + Math.sin(t * 0.5) * 0.15);
        ctx.fillStyle = "rgba(196,120,40,0.9)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.2, 1.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Winter — a cold sheen on the ice + a drifting snowflake
        ctx.globalAlpha = 0.1 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.8));
        ctx.fillStyle = "rgba(210,232,255,1)";
        ctx.beginPath();
        ctx.ellipse(-3, 19, 10, 3.0, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        const seeds: Array<[number, number, number]> = [
          [-9, 0.0, 0.9], [7, 0.5, 0.8], [-2, 0.25, 0.85],
        ];
        ctx.fillStyle = "#ffffff";
        seeds.forEach(([fx, phase, r]) => {
          const prog = ((t / 3.2 + phase) % 1 + 1) % 1;
          const fy = -22 + prog * 40;
          const fdx = fx + Math.sin(prog * Math.PI * 2 + phase * 6) * 3;
          ctx.globalAlpha = 0.4 + 0.45 * Math.sin(prog * Math.PI);
          ctx.beginPath();
          ctx.arc(fdx, fy, r, 0, Math.PI * 2);
          ctx.fill();
        });
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
