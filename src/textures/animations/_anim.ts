// Shared helpers for the procedural icon idles (see `iconAnimations.ts`).
//
// Why this exists: the first-draft idles were almost all a single linear
// `Math.sin(t*f)` driving a glint/glow/twinkle over a frozen body — no eased
// timing, no anticipation/overshoot, no shadow reaction, and the per-file
// `glintSweep`/`sweepPhase`/`flicker` helpers had bugs (hard rectangles, a
// teleporting triangle reset, an imperceptible 0.82–1.0 amplitude). This module
// is the shared vocabulary that fixes those once for the whole set:
//   - the 12-principles easing toolkit (`easeOutBack` for overshoot, etc.);
//   - phase/wave helpers that loop seamlessly off `t` (drive position from
//     `loopPhase`/`pingPong` so cycles tile exactly — no sawtooth teleport);
//   - `groundShadow`, which couples the contact shadow to vertical motion so
//     bobs/hops read as leaving the ground;
//   - a feathered low-intensity `glint` (clip to the body first) and a clean
//     `sparkle`/`twinkle` to replace the glitchy cross-twinkle + hard glint bar.
//
// Stub-safety: every draw helper only calls context methods that the icon-
// animation test's no-op stub supports (path/transform/gradient calls). The
// easing/phase functions are pure math (no `Math.random`, no `Date`) so frames
// stay deterministic and loops stay seamless.

export const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ easing */

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}
/** Linear blend a→b by t (unclamped). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Cosine ease-in-out over 0..1 — the gentle default (zero velocity at ends). */
export function easeInOutSine(x: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));
}
/** Smoothstep ease-in-out over 0..1. */
export function easeInOut(x: number): number {
  x = clamp01(x);
  return x * x * (3 - 2 * x);
}
/** Decelerating ease-out (fast start, soft land). */
export function easeOutCubic(x: number): number {
  const u = 1 - clamp01(x);
  return 1 - u * u * u;
}
/** Accelerating ease-in (slow wind-up, fast finish). */
export function easeInCubic(x: number): number {
  x = clamp01(x);
  return x * x * x;
}
export function easeInOutCubic(x: number): number {
  x = clamp01(x);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
/** Ease-out that OVERSHOOTS past 1 then settles back — the overshoot principle.
 *  Bigger `s` = more overshoot. */
export function easeOutBack(x: number, s = 1.70158): number {
  x = clamp01(x);
  const c3 = s + 1;
  const u = x - 1;
  return 1 + c3 * u * u * u + s * u * u;
}
/** Springy elastic settle (a few damped wobbles into 1). */
export function easeOutElastic(x: number, period = 0.32): number {
  x = clamp01(x);
  if (x === 0 || x === 1) return x;
  return Math.pow(2, -10 * x) * Math.sin(((x - period / 4) * TAU) / period) + 1;
}

/* ------------------------------------------------------- looping phase/wave */

/** 0..1 sawtooth over `period` seconds. Drive sin/cos position from this so the
 *  cycle tiles exactly; never use the raw value as a position (it teleports at
 *  the wrap). */
export function loopPhase(t: number, period: number, offset = 0): number {
  return (((t / period + offset) % 1) + 1) % 1;
}

/** Eased there-and-back in 0..1 over `period` (out on the first half, back on
 *  the second), decelerating at both turns. This is the seamless replacement
 *  for the old `sweepPhase` triangle wave that hard-reset. For a -1..1 range use
 *  `pingPong(...) * 2 - 1`. */
export function pingPong(t: number, period: number, offset = 0): number {
  const u = loopPhase(t, period, offset);
  const tri = u < 0.5 ? u * 2 : 2 - u * 2; // 0→1→0
  return easeInOutSine(tri);
}

/** Smooth breathing in [centre-amp, centre+amp] over `period` seconds. */
export function breathe(t: number, period: number, amp = 1, centre = 0, offset = 0): number {
  return centre + amp * Math.sin((t / period + offset) * TAU);
}

/** A short "event" envelope: 0 for most of the cycle, easing up to 1 and back
 *  down within the first `width` fraction of `period`, then resting at 0. Use
 *  for periodic beats (a peck, a strike, a flash, a ping) so the idle has a rest
 *  pose and a moment rather than a constant metronome. */
export function beat(t: number, period: number, width = 0.32, offset = 0): number {
  const u = loopPhase(t, period, offset);
  if (u >= width) return 0;
  return Math.sin((u / width) * Math.PI);
}

/** Anticipation → action → overshoot → settle, as a 0-based displacement over
 *  0..1 progress: a small negative wind-up, then `easeOutBack` past 1 and back.
 *  Scale the result by your move amplitude. */
export function windupOvershoot(u: number, anticipation = 0.16, back = 2.2): number {
  u = clamp01(u);
  if (u < anticipation) {
    return -0.16 * Math.sin((u / anticipation) * (Math.PI / 2));
  }
  return easeOutBack((u - anticipation) / (1 - anticipation), back);
}

/** Sharp twinkle envelope: a brief bright ping once per `period`, dim otherwise. */
export function twinkle(t: number, period: number, offset = 0): number {
  const ph = loopPhase(t, period, offset);
  const s = Math.sin(ph * Math.PI);
  return s * s * s;
}

/* -------------------------------------------------------------- draw helpers */

/** Ground-contact shadow at (`cx`, `baseY`). As the subject lifts by `lift`
 *  design units (positive = rising off the ground) the ellipse shrinks and
 *  fades, so bobs/hops read as leaving the ground instead of dragging a frozen
 *  blob. Draw FIRST, beneath the subject. Pass `lift = 0` for grounded subjects. */
export function groundShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  rx: number,
  ry: number,
  lift = 0,
  alpha = 0.25,
): void {
  const k = clamp(1 - Math.abs(lift) / 26, 0.4, 1);
  ctx.fillStyle = `rgba(0,0,0,${alpha * k})`;
  ctx.beginPath();
  ctx.ellipse(cx, baseY, rx * k, ry * k, 0, 0, TAU);
  ctx.fill();
}

export interface GlintOpts {
  /** Half the travel distance of the band centre (band runs -span..+span). */
  span?: number;
  /** Half-width of the soft band. */
  width?: number;
  /** Band tilt in radians (default −45°, a top-left key light). */
  angle?: number;
  /** Peak alpha — keep it a sheen (≈0.3), not a white bar. */
  intensity?: number;
  /** Band length along its axis (cover the clipped body). */
  length?: number;
  /** Warm (sunlit) vs neutral-white highlight. */
  warm?: boolean;
}

/** A soft specular sweep across the CURRENT CLIP. Clip to the body's silhouette
 *  first (tightly) and pass a 0..1 `phase` (e.g. from `loopPhase`). Feathered
 *  via the gradient and capped to a gentle intensity — the fix for the old hard
 *  rectangle that leaked past loose clips and washed gold to chrome. */
export function glint(ctx: CanvasRenderingContext2D, phase: number, opts: GlintOpts = {}): void {
  const { span = 28, width = 9, angle = -Math.PI / 4, intensity = 0.32, length = 60, warm = false } = opts;
  const travel = -span + clamp01(phase) * span * 2;
  const col = warm ? "255,244,206" : "255,255,255";
  ctx.save();
  ctx.translate(travel, travel * 0.18);
  ctx.rotate(angle);
  const grad = ctx.createLinearGradient(-width, 0, width, 0);
  grad.addColorStop(0, `rgba(${col},0)`);
  grad.addColorStop(0.5, `rgba(${col},${intensity})`);
  grad.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(-width, -length / 2, width * 2, length);
  ctx.restore();
}

/** A clean little 4-point sparkle (diamond star + soft core) at (`x`,`y`).
 *  Replaces the thin two-line "twinkle cross" that read as a compositing glitch.
 *  Pulse it with `alpha`/`r` (e.g. from `twinkle`). */
export function sparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  alpha: number,
  color = "255,255,235",
): void {
  if (alpha <= 0 || r <= 0) return;
  const a = clamp01(alpha);
  ctx.save();
  ctx.fillStyle = `rgba(${color},${a})`;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${a * 0.85})`;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.28, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Warm window/ember flicker in a readable amplitude (default ≈0.7–1.0, vs the
 *  old imperceptible 0.82–1.0). Layered incommensurate sines so it never reads
 *  as a clean pulse. `t` seconds, `phase` per-source offset. */
export function flicker(t: number, phase = 0, low = 0.7, high = 1): number {
  const f =
    Math.sin(t * 3.1 + phase) * 0.5 +
    Math.sin(t * 5.7 + phase * 1.7) * 0.3 +
    Math.sin(t * 1.3 + phase * 0.5) * 0.2;
  const mid = (low + high) / 2;
  const amp = (high - low) / 2;
  return mid + f * amp;
}
