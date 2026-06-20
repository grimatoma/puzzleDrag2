// Seasonal art for the GOOSE bird tile (`tile_bird_goose`).
// Module: src/textures/seasonal/bird/goose.ts  (category BIRD)
//
// A plump white domestic goose standing on a grassy pad in front-¾ view,
// turned ~15–20° toward the lower-left: a rounded white body, a long curving
// neck, a small head with an orange bill, and orange feet. The SAME silhouette
// is drawn every season — PALETTE LOCK: the body stays white and the bill stays
// orange all year. Seasons change only the pad, the light wash, a winter feather
// "fluff" + a little snow on the back + a breath-fog puff at the bill, and the
// seasonal pad dressing (blossom / fallen leaves / snow).
//
// Enforced by a single parameterized `paint(ctx, p, bob)`:
//   - draw(season)      = paint(ctx, SP[season], 0)
//   - anim(season)      = season micro-motion + paint(ctx, SP[season], bobAt(t))
//   - transition(from)  = paint(ctx, lerpP(SP[from], SP[from+1], smoother(p)), 0)
//
// Because every season is the same paint with tweened params, transitions are
// seamless: transition(0) ≡ draw(from) and transition(1) ≡ draw(to). The body
// bob uses A*(1-cos(w t))*0.5 so bob(0)=0 with zero velocity → seamless idle.
// Origin-centered in the −24..+24 design box, light from upper-left.

import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";
import { SEASON_NAMES, type SeasonName } from "../types.js";

// ── Tweenable params ─────────────────────────────────────────────────────────

type RGB = [number, number, number];

/** Every field tweens (number or RGB). NO booleans / season strings — the
 *  paint must be a pure function of these so transitions interpolate cleanly.
 *  PALETTE LOCK: bodyLight/bodyMid/bodyShade stay white-ish; bill/feet stay
 *  orange across all seasons (only the light wash shifts their read). */
interface P {
  bodyLight: RGB;   // lit white plumage (upper-left face)
  bodyMid: RGB;     // body white in ambient
  bodyShade: RGB;   // shaded under-belly / far side
  bill: RGB;        // orange bill (locked)
  billDark: RGB;    // shaded bill / nostril
  feet: RGB;        // orange feet (locked)
  eye: RGB;         // eye dot
  padGrass: RGB;    // top of the grass pad
  padDark: RGB;     // shaded pad underside
  outline: RGB;     // soft dark outline tint
  light: RGB;       // ambient light tint laid over the whole tile
  lightAmt: number; // 0..1 strength of the ambient light wash
  plumage: number;  // 0..1 plumage cleanliness/brightness cue (colour only)
  fluff: number;    // 0..1 winter feather puff (silhouette stays; soft fringe)
  snowCapAmt: number; // 0..1 snow resting on the back
  frostAmt: number; // 0..1 cool frost dusting on upward feathers
  padSnowAmt: number; // 0..1 snow blanket on the pad
  blossomAmt: number; // 0..1 tiny blossoms on the pad (spring)
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
    bodyLight: lerpRGB(a.bodyLight, b.bodyLight, t),
    bodyMid: lerpRGB(a.bodyMid, b.bodyMid, t),
    bodyShade: lerpRGB(a.bodyShade, b.bodyShade, t),
    bill: lerpRGB(a.bill, b.bill, t),
    billDark: lerpRGB(a.billDark, b.billDark, t),
    feet: lerpRGB(a.feet, b.feet, t),
    eye: lerpRGB(a.eye, b.eye, t),
    padGrass: lerpRGB(a.padGrass, b.padGrass, t),
    padDark: lerpRGB(a.padDark, b.padDark, t),
    outline: lerpRGB(a.outline, b.outline, t),
    light: lerpRGB(a.light, b.light, t),
    lightAmt: lerp(a.lightAmt, b.lightAmt, t),
    plumage: lerp(a.plumage, b.plumage, t),
    fluff: lerp(a.fluff, b.fluff, t),
    snowCapAmt: lerp(a.snowCapAmt, b.snowCapAmt, t),
    frostAmt: lerp(a.frostAmt, b.frostAmt, t),
    padSnowAmt: lerp(a.padSnowAmt, b.padSnowAmt, t),
    blossomAmt: lerp(a.blossomAmt, b.blossomAmt, t),
    fallenLeafAmt: lerp(a.fallenLeafAmt, b.fallenLeafAmt, t),
  };
}

function clampP(p: P): P {
  return {
    ...p,
    lightAmt: clamp01(p.lightAmt),
    plumage: clamp01(p.plumage),
    fluff: clamp01(p.fluff),
    snowCapAmt: clamp01(p.snowCapAmt),
    frostAmt: clamp01(p.frostAmt),
    padSnowAmt: clamp01(p.padSnowAmt),
    blossomAmt: clamp01(p.blossomAmt),
    fallenLeafAmt: clamp01(p.fallenLeafAmt),
  };
}

// ── Per-season params ────────────────────────────────────────────────────────
// PALETTE LOCK: body stays white, bill + feet stay orange. Only pad, light,
// plumage cue, and winter fluff/snow/frost amounts differ between seasons.

const SP: Record<SeasonName, P> = {
  // Spring — clean white plumage; bright lime dewy pad + a blossom. Cool-bright.
  Spring: {
    bodyLight: [255, 255, 255],
    bodyMid: [238, 240, 242],
    bodyShade: [196, 202, 212],
    bill: [246, 150, 46],
    billDark: [196, 104, 28],
    feet: [240, 142, 44],
    eye: [40, 34, 30],
    padGrass: [128, 206, 86],
    padDark: [72, 138, 58],
    outline: [70, 70, 84],
    light: [232, 244, 226],
    lightAmt: 0.16,
    plumage: 0.85,
    fluff: 0,
    snowCapAmt: 0,
    frostAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0.85,
    fallenLeafAmt: 0,
  },
  // Summer — brightest white PEAK; saturated mid-green pad; warm strong light.
  Summer: {
    bodyLight: [255, 255, 255],
    bodyMid: [246, 248, 250],
    bodyShade: [206, 210, 218],
    bill: [252, 158, 42],
    billDark: [206, 110, 26],
    feet: [248, 150, 40],
    eye: [38, 32, 28],
    padGrass: [86, 168, 70],
    padDark: [44, 110, 48],
    outline: [74, 70, 78],
    light: [255, 240, 206],
    lightAmt: 0.18,
    plumage: 1.0,
    fluff: 0,
    snowCapAmt: 0,
    frostAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
  // Autumn — white plumage in low amber light; olive-tan pad; fallen leaves.
  Autumn: {
    bodyLight: [255, 252, 244],
    bodyMid: [240, 234, 222],
    bodyShade: [198, 188, 178],
    bill: [240, 138, 40],
    billDark: [190, 96, 26],
    feet: [234, 132, 40],
    eye: [42, 32, 26],
    padGrass: [150, 152, 86],
    padDark: [104, 96, 52],
    outline: [78, 64, 60],
    light: [248, 210, 150],
    lightAmt: 0.2,
    plumage: 0.9,
    fluff: 0,
    snowCapAmt: 0,
    frostAmt: 0,
    padSnowAmt: 0,
    blossomAmt: 0,
    fallenLeafAmt: 0.85,
  },
  // Winter — fluffed white feathers read against COOL blue shadows (not a
  // white-out); snow on the back, frost dusting, breath-fog at the bill, snowy
  // pad. Body stays clearly white; bill stays orange.
  Winter: {
    bodyLight: [250, 252, 255],
    bodyMid: [224, 232, 244],
    bodyShade: [160, 178, 204], // cool blue shadow so white reads in snow
    bill: [238, 138, 48],
    billDark: [184, 96, 34],
    feet: [228, 126, 44],
    eye: [40, 38, 44],
    padGrass: [176, 196, 214],
    padDark: [120, 146, 172],
    outline: [62, 64, 86],
    light: [206, 226, 252],
    lightAmt: 0.3,
    plumage: 0.8,
    fluff: 0.85,
    snowCapAmt: 0.8,
    frostAmt: 0.6,
    padSnowAmt: 0.9,
    blossomAmt: 0,
    fallenLeafAmt: 0,
  },
};

// ── Goose geometry constants (the SAME silhouette every season) ──────────────
// Front-¾ view, turned ~15–20° toward lower-left. Body is a plump egg; the long
// neck rises from the upper-left of the body and curves to a small head with an
// orange bill pointing lower-left.

const BODY_CX = 1.5;   // body centre x (turned right, head reaches left)
const BODY_CY = 4.5;   // body centre y
const BODY_RX = 13.5;  // body half-width
const BODY_RY = 11;    // body half-height
const TAIL_X = 15;     // tail tip (upper-right)
const TAIL_Y = -1.5;

// Neck path control points (base on upper-left of body → head lower-left).
const NECK_BASE_X = -6;
const NECK_BASE_Y = -3;
const HEAD_X = -13.5;
const HEAD_Y = -14;
const HEAD_R = 4.4;
const BILL_TIP_X = -20.5; // orange bill tip, pointing lower-left
const BILL_TIP_Y = -11.5;

/** Trace the plump body egg into the current path. */
function bodyPath(ctx: CanvasRenderingContext2D, bob: number): void {
  ctx.beginPath();
  ctx.ellipse(BODY_CX, BODY_CY + bob, BODY_RX, BODY_RY, -0.12, 0, Math.PI * 2);
}

/** Stroke the curving neck as a tapering band (dark base then light fill).
 *  Returns nothing; uses current strokeStyle. */
function neckStroke(
  ctx: CanvasRenderingContext2D,
  bob: number,
  width: number,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(NECK_BASE_X, NECK_BASE_Y + bob);
  ctx.quadraticCurveTo(-13, -6 + bob, HEAD_X, HEAD_Y + bob);
  ctx.stroke();
}

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

    // tufted top edge — little blades around the upper rim
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

    // blossoms on the pad (spring)
    if (p.blossomAmt > 0.01) {
      const a = p.blossomAmt;
      const spots: Array<[number, number]> = [[-13, 18.5], [12, 17.8], [-4, 21]];
      spots.forEach(([bx, by], idx) => {
        ctx.fillStyle = rgba(idx === 1 ? [255, 232, 246] : [255, 250, 252], 0.95 * a);
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
        [12, 18.6, 0.7, [176, 72, 32]],
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

    // ── Contact shadow of the goose on the pad (lower-right) ─────────────────
    ctx.fillStyle = rgba(p.outline, 0.26);
    ctx.beginPath();
    ctx.ellipse(3, 15.5 + bob * 0.5, 13, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Orange feet on the pad (drawn before the body so it overlaps) ────────
    const footY = 14 + bob * 0.4;
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 2.6;
    [-3.5, 4].forEach((fx) => {
      ctx.beginPath();
      ctx.moveTo(fx, 9 + bob);
      ctx.lineTo(fx + 0.6, footY);
      ctx.stroke();
    });
    ctx.fillStyle = rgb(p.feet);
    [-3.5, 4].forEach((fx) => {
      // little webbed foot fan
      ctx.beginPath();
      ctx.moveTo(fx + 0.6, footY - 1.4);
      ctx.lineTo(fx - 2.4, footY + 1.6);
      ctx.lineTo(fx + 3.4, footY + 1.6);
      ctx.closePath();
      ctx.fill();
    });
    ctx.strokeStyle = rgb(p.feet);
    ctx.lineWidth = 2;
    [-3.5, 4].forEach((fx) => {
      ctx.beginPath();
      ctx.moveTo(fx, 9 + bob);
      ctx.lineTo(fx + 0.6, footY - 0.5);
      ctx.stroke();
    });

    // ── Tail wedge (upper-right of body), drawn before the body fill ─────────
    ctx.fillStyle = rgb(p.bodyShade);
    ctx.beginPath();
    ctx.moveTo(BODY_CX + 9, BODY_CY - 6 + bob);
    ctx.lineTo(TAIL_X + 3, TAIL_Y + bob);
    ctx.lineTo(BODY_CX + 10, BODY_CY + 2 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgb(p.outline);
    ctx.lineWidth = 1;
    ctx.stroke();

    // ── Neck: dark outline pass then white fill ──────────────────────────────
    neckStroke(ctx, bob, 8.6, rgb(p.outline)); // outline rim
    neckStroke(ctx, bob, 6.2, rgb(p.bodyMid)); // white neck
    // neck shading on the right/under edge
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(NECK_BASE_X, NECK_BASE_Y + bob);
    ctx.quadraticCurveTo(-13, -6 + bob, HEAD_X, HEAD_Y + bob);
    ctx.lineWidth = 6.2;
    ctx.strokeStyle = rgb(p.bodyMid);
    ctx.stroke();
    ctx.restore();
    // neck highlight on the lit (upper-left) side
    neckStroke(ctx, bob, 2.2, rgba(p.bodyLight, 0.85));

    // ── Body: outline pass then white fill ───────────────────────────────────
    bodyPath(ctx, bob);
    ctx.fillStyle = rgb(p.outline);
    ctx.save();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = rgb(p.outline);
    ctx.stroke();
    ctx.restore();

    bodyPath(ctx, bob);
    ctx.fillStyle = rgb(p.bodyMid);
    ctx.fill();

    // body shading + lit face (clipped to the body)
    ctx.save();
    bodyPath(ctx, bob);
    ctx.clip();
    // far/under side shade (lower-right)
    ctx.fillStyle = rgba(p.bodyShade, 0.9);
    ctx.beginPath();
    ctx.ellipse(BODY_CX + 4, BODY_CY + 5 + bob, BODY_RX, BODY_RY * 0.7, -0.1, 0, Math.PI * 2);
    ctx.fill();
    // lit upper-left face
    const bg = ctx.createLinearGradient(
      BODY_CX - BODY_RX, BODY_CY - BODY_RY + bob,
      BODY_CX + BODY_RX, BODY_CY + BODY_RY + bob,
    );
    bg.addColorStop(0, rgb(p.bodyLight));
    bg.addColorStop(0.5, rgb(p.bodyMid));
    bg.addColorStop(1, rgb(p.bodyShade));
    ctx.fillStyle = bg;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(BODY_CX - 3, BODY_CY - 2 + bob, BODY_RX * 0.9, BODY_RY * 0.85, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // soft wing crease arc (feather seam) on the side
    ctx.strokeStyle = rgba(p.bodyShade, 0.7);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(BODY_CX - 6, BODY_CY - 3 + bob);
    ctx.quadraticCurveTo(BODY_CX + 6, BODY_CY - 1 + bob, BODY_CX + 11, BODY_CY + 4 + bob);
    ctx.stroke();
    // a couple soft feather lines under the wing
    ctx.strokeStyle = rgba(p.bodyShade, 0.5);
    ctx.lineWidth = 1.1;
    [3, 6].forEach((dy) => {
      ctx.beginPath();
      ctx.moveTo(BODY_CX - 3, BODY_CY + dy + bob);
      ctx.quadraticCurveTo(BODY_CX + 7, BODY_CY + dy + bob, BODY_CX + 11, BODY_CY + dy + 1 + bob);
      ctx.stroke();
    });

    // winter frost dusting on the upward body
    if (p.frostAmt > 0.02) {
      ctx.fillStyle = rgba([214, 232, 250], 0.22 * p.frostAmt);
      ctx.beginPath();
      ctx.ellipse(BODY_CX - 2, BODY_CY - 5 + bob, BODY_RX * 0.85, BODY_RY * 0.45, -0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([240, 248, 255], 0.7 * p.frostAmt);
      const speck: Array<[number, number]> = [
        [-6, -3], [-1, -5], [4, -4], [8, -1], [-3, -1], [2, -2],
      ];
      speck.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(BODY_CX + sx, BODY_CY + sy + bob, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.restore(); // end body clip

    // ── Winter fluff: soft feather fringe around the body silhouette ─────────
    // (additive soft fringe — the silhouette/outline itself is unchanged).
    if (p.fluff > 0.02) {
      ctx.save();
      ctx.strokeStyle = rgba([250, 253, 255], 0.5 * p.fluff);
      ctx.lineWidth = 1.2;
      const n = 22;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2;
        // only fringe the lower & side arc (skip where neck/tail attach)
        const ax = BODY_CX + Math.cos(ang) * BODY_RX;
        const ay = BODY_CY + bob + Math.sin(ang) * BODY_RY;
        const ox = ax + Math.cos(ang) * (1.6 + 1.2 * Math.sin(i * 1.7));
        const oy = ay + Math.sin(ang) * (1.6 + 1.2 * Math.sin(i * 1.3));
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ox, oy);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── Snow cap resting on the back (winter) ────────────────────────────────
    if (p.snowCapAmt > 0.02) {
      const a = p.snowCapAmt;
      ctx.fillStyle = rgba([246, 251, 255], 0.95 * a);
      ctx.beginPath();
      ctx.moveTo(BODY_CX - 9, BODY_CY - 8 + bob);
      ctx.quadraticCurveTo(BODY_CX - 3, BODY_CY - 13 + bob, BODY_CX + 4, BODY_CY - 11 + bob);
      ctx.quadraticCurveTo(BODY_CX + 11, BODY_CY - 9 + bob, BODY_CX + 12, BODY_CY - 5 + bob);
      ctx.quadraticCurveTo(BODY_CX + 6, BODY_CY - 7 + bob, BODY_CX + 1, BODY_CY - 6 + bob);
      ctx.quadraticCurveTo(BODY_CX - 4, BODY_CY - 5 + bob, BODY_CX - 9, BODY_CY - 8 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([210, 226, 244], 0.5 * a);
      ctx.beginPath();
      ctx.ellipse(BODY_CX - 1, BODY_CY - 8 + bob, 8, 1.8, -0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Head + orange bill (drawn over the neck top) ─────────────────────────
    const hx = HEAD_X;
    const hy = HEAD_Y + bob;
    // head outline
    ctx.fillStyle = rgb(p.outline);
    ctx.beginPath();
    ctx.arc(hx, hy, HEAD_R + 0.9, 0, Math.PI * 2);
    ctx.fill();
    // head white
    ctx.fillStyle = rgb(p.bodyMid);
    ctx.beginPath();
    ctx.arc(hx, hy, HEAD_R, 0, Math.PI * 2);
    ctx.fill();
    // head lit highlight (upper-left)
    ctx.fillStyle = rgba(p.bodyLight, 0.9);
    ctx.beginPath();
    ctx.arc(hx - 1.2, hy - 1.4, HEAD_R * 0.6, 0, Math.PI * 2);
    ctx.fill();
    // head under-shade
    ctx.fillStyle = rgba(p.bodyShade, 0.6);
    ctx.beginPath();
    ctx.ellipse(hx + 1, hy + 1.6, HEAD_R * 0.7, HEAD_R * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // orange bill pointing lower-left
    const btx = BILL_TIP_X;
    const bty = BILL_TIP_Y + bob;
    ctx.fillStyle = rgb(p.bill);
    ctx.beginPath();
    ctx.moveTo(hx - 2.4, hy - 1.2);
    ctx.quadraticCurveTo(btx + 2, bty - 1.5, btx, bty);
    ctx.lineTo(btx + 1.5, bty + 2.6);
    ctx.quadraticCurveTo(hx - 3.5, hy + 2.4, hx - 2.4, hy - 1.2);
    ctx.closePath();
    ctx.fill();
    // bill shade + nostril
    ctx.fillStyle = rgb(p.billDark);
    ctx.beginPath();
    ctx.moveTo(hx - 2.4, hy + 0.8);
    ctx.quadraticCurveTo(btx + 2, bty + 1.6, btx + 1.5, bty + 2.6);
    ctx.quadraticCurveTo(hx - 3.5, hy + 2.4, hx - 2.4, hy + 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgb(p.billDark);
    ctx.beginPath();
    ctx.arc(hx - 5.5, hy - 0.2, 0.7, 0, Math.PI * 2);
    ctx.fill();
    // bill outline
    ctx.strokeStyle = rgba(p.outline, 0.7);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(hx - 2.4, hy - 1.2);
    ctx.quadraticCurveTo(btx + 2, bty - 1.5, btx, bty);
    ctx.lineTo(btx + 1.5, bty + 2.6);
    ctx.stroke();

    // eye
    ctx.fillStyle = rgb(p.eye);
    ctx.beginPath();
    ctx.arc(hx - 1.4, hy - 0.6, 1.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], 0.85);
    ctx.beginPath();
    ctx.arc(hx - 1.8, hy - 1.0, 0.4, 0, Math.PI * 2);
    ctx.fill();

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
function bobAt(t: number, amp = 0.9, w = 1.4): number {
  return amp * (1 - Math.cos(w * t)) * 0.5;
}

// ── Per-season draw / anim ───────────────────────────────────────────────────

function draw(season: SeasonName): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => paint(ctx, SP[season], 0);
}

function anim(season: SeasonName): (ctx: CanvasRenderingContext2D, t: number) => void {
  return (ctx, t) => {
    // Gentle breathing bob; a slow neck sway + head-bob once per loop is read
    // through a small extra vertical nod added to the body bob's phase.
    const breathe = bobAt(t);
    // head-bob once per loop: a brief dip layered additively (0 at t=0).
    const nod = 0.6 * (1 - Math.cos(t * 0.7)) * 0.5;
    paint(ctx, SP[season], breathe + nod);

    ctx.save();
    try {
      ctx.globalAlpha = 1;
      if (season === "Spring") {
        // dew shimmer — a soft pulsing glint travelling gently on the pad/blade
        const g = 0.2 + 0.28 * (0.5 + 0.5 * Math.sin(t * 2.0));
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        const gx = -8 + Math.sin(t * 0.8) * 5;
        ctx.beginPath();
        ctx.arc(gx, 17.5, 0.9 + g * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Summer") {
        // a soft feather sheen — a gentle pale glow pulsing on the lit back
        const s = 0.1 + 0.16 * (0.5 + 0.5 * Math.sin(t * 1.1));
        ctx.fillStyle = `rgba(255,255,240,${s})`;
        ctx.beginPath();
        ctx.ellipse(BODY_CX - 3, BODY_CY - 4 + breathe, 7, 4.5, -0.12, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === "Autumn") {
        // a fallen leaf stirs — drifts and rocks slightly on the pad
        const prog = ((t / 4.0) % 1 + 1) % 1;
        const lx = -12 + prog * 4;
        const ly = 19.6 - Math.sin(prog * Math.PI) * 2.0;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(-0.5 + Math.sin(t * 1.6) * 0.4);
        ctx.fillStyle = "rgba(196,120,40,0.95)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.2, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(90,44,16,0.9)";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.lineTo(3, 0);
        ctx.stroke();
        ctx.restore();
      } else {
        // Winter — breath-fog puff pulsing at the bill + a drifting snowflake.
        // breath-fog: a soft white puff that swells and fades near the bill tip.
        const cyc = ((t / 2.6) % 1 + 1) % 1;
        const puff = Math.sin(cyc * Math.PI); // 0→1→0
        if (puff > 0.01) {
          const px = BILL_TIP_X - 2 - cyc * 4;
          const py = BILL_TIP_Y - 1 + breathe - cyc * 2;
          ctx.fillStyle = `rgba(236,244,255,${0.5 * puff})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.6 + cyc * 2.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(255,255,255,${0.3 * puff})`;
          ctx.beginPath();
          ctx.arc(px + 0.8, py + 0.4, 1.0 + cyc * 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
        // a single drifting snowflake
        const fp = ((t / 3.4) % 1 + 1) % 1;
        const fy = -22 + fp * 40;
        const fx = 7 + Math.sin(fp * Math.PI * 2) * 3.5;
        ctx.globalAlpha = 0.4 + 0.45 * Math.sin(fp * Math.PI);
        ctx.fillStyle = "#ffffff";
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
