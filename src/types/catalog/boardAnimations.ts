/**
 * Hand-maintained catalog enum — edit when adding ids, then update the matching config map.
 */

/** Named board animation presets (src/config/boardAnimations.ts). */
export enum BoardAnimationId {
  GoldenFlash = "goldenFlash",
  PopIn = "popIn",
  Sweep = "sweep",
}

export const BOARD_ANIMATION_ID_VALUES = Object.values(BoardAnimationId);
