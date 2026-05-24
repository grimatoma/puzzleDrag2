/**
 * Single source of truth for board-tool animation timing. Tools pick a named
 * animation and supply tiles + an optional tint; duration / stagger / ease /
 * rotation jitter live here so designers can tune everything in one place and
 * the Balance Manager's Animations Demo tab can read from this same module.
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
