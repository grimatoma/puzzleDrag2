/**
 * Single source of truth for board-tool animation timing. Tools pick a named
 * animation and supply tiles + an optional tint; duration / stagger / ease /
 * rotation jitter live here so designers can tune everything in one place and
 * the Dev Panel's Animations Demo tab can read from this same module.
 */

export const BOARD_ANIMATIONS = Object.freeze({
  sweep: Object.freeze({
    kind: "fadeOut",        // scale/alpha → 0, with rotation jitter
    duration: 200,
    staggerMs: 15,
    rotationHalfDeg: 17,    // ± degrees per tile
    ease: "Quad.In",
  }),
  popIn: Object.freeze({
    kind: "popIn",          // scale 0 → tile's normal scale
    duration: 180,
    staggerMs: 0,
    ease: "Back.Out",
  }),
  goldenFlash: Object.freeze({
    kind: "twoStage",       // scale 0 → 1.1 → 1.0
    duration: 130,          // first stage
    settleMs: 80,           // second stage
    ease: "Back.Out",
  }),
});

export const BOARD_ANIMATION_NAMES = Object.freeze(Object.keys(BOARD_ANIMATIONS));

/** Catalog anim ids on tool powers → registry keys. */
export const BOARD_ANIM_ALIASES = Object.freeze({
  chops: "sweep",
  shimmer: "sweep",
  scatter: "sweep",
  cage: "sweep",
  shot: "sweep",
  bark: "sweep",
});

export function resolveBoardAnimName(name: string | null | undefined): string | null | undefined {
  if (!name) return name;
  return (BOARD_ANIM_ALIASES as Record<string, string | undefined>)[name] ?? name;
}

/** Collapse + fill delays after a sweep in GameScene (ms, pre-_dur). */
export const SWEEP_COLLAPSE_PIPELINE_MS = 240 + 190 + 210 + 210;

/**
 * How long the animations demo should wait before reloading the scenario.
 * Sweep includes the collapse/fill pipeline; popIn/goldenFlash are tween-only.
 */
interface BoardAnimationEntry {
  kind: string;
  duration: number;
  staggerMs?: number;
  settleMs?: number;
  rotationHalfDeg?: number;
  ease?: string;
}

export function demoBoardAnimResetMs(name: string | null | undefined, tileCount = 1): number {
  const animation = (BOARD_ANIMATIONS as Record<string, BoardAnimationEntry | undefined>)[name ?? ""];
  if (!animation) return 600;
  if (animation.kind === "fadeOut") {
    return SWEEP_COLLAPSE_PIPELINE_MS + 100;
  }
  if (animation.kind === "twoStage") {
    return animation.duration + (animation.settleMs ?? 0) + 100;
  }
  const stagger = (animation.staggerMs ?? 0) * Math.max(0, tileCount - 1);
  return animation.duration + stagger + 100;
}
