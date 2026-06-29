// Idle board-animation timing.
//
// The procedural idle animations (critters breathing, crops swaying, decor
// glinting — see `iconAnimations.ts`) are driven by a single elapsed-seconds
// clock and re-baked into the shared `tile_<key>` texture each frame. Left
// alone they loop back-to-back forever and, because every key reads the same
// clock, the whole board tends to "breathe" in lockstep.
//
// `idleAnimTime` warps that raw clock so each loop is followed by a short rest
// pause (a delay in the looping), and staggers the phase of that pause per
// tile-key so different tiles on the board pause and resume out of sync. The
// warp eases to zero velocity at the rest boundary, so animations decelerate
// into the pause and accelerate out of it rather than freezing abruptly.
//
// Granularity note: every on-board instance of a key shares one baked texture,
// so the achievable stagger is per tile-key (per resource type), not per board
// cell — instances of the same resource necessarily move together.

/** Seconds of animation motion delivered per loop before the rest pause. */
export const IDLE_ACTIVE_SEC = 4.2;
/** Seconds the animation holds at rest between loops. */
export const IDLE_REST_SEC = 3.6;
const CYCLE_SEC = IDLE_ACTIVE_SEC + IDLE_REST_SEC;

/** Stable FNV-1a hash of `key` mapped to [0, 1) — the per-key stagger phase. */
function keyPhase01(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 997) / 997;
}

/**
 * Map raw elapsed seconds → animation-clock seconds for tile `key`, inserting a
 * staggered rest delay between loops.
 *
 * Within each `CYCLE_SEC` window the animation clock advances by exactly
 * `IDLE_ACTIVE_SEC` (smoothstep-eased, so velocity is zero at both ends) and
 * then holds for `IDLE_REST_SEC`. The cycle's phase is offset per key so each
 * tile type rests at a different moment.
 */
export function idleAnimTime(rawSec: number, key: string): number {
  const tt = rawSec + keyPhase01(key) * CYCLE_SEC;
  const cycles = Math.floor(tt / CYCLE_SEC);
  const local = tt - cycles * CYCLE_SEC;
  const f = Math.min(local, IDLE_ACTIVE_SEC) / IDLE_ACTIVE_SEC; // 0..1 active progress
  const eased = f * f * (3 - 2 * f); // smoothstep — zero velocity at f=0 and f=1
  return (cycles + eased) * IDLE_ACTIVE_SEC;
}
