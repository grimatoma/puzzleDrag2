// Pure helpers for the drag-build feedback ladder (audio + haptics).
//
// These compute the per-tile tick pitch, the collectable-threshold crossing
// predicate, and the per-tile haptic strength as a chain grows. They are kept
// free of Phaser / Web-Audio / `window` so they can be unit-tested in node and
// reused by the scene-side funnel (`GameScene.addToPath`).

/** Per-tile tick pitch as the chain grows. 1.0 at length 1, climbing ~6% per
 *  tile, clamped to 2.2 so it always stays under play()'s 2.5 ceiling. Mirrors
 *  the spirit of the post-release chainCollect ladder in useAudio.tsx, but
 *  applied per-add during the drag. */
export function tickPitch(len: number): number {
  return Math.min(2.2, 1 + Math.max(0, len - 1) * 0.06);
}

/** True only on the single add where the chain first becomes collectable:
 *  prevLen was below the threshold and newLen has reached it. Naturally
 *  one-shot for a monotonic chain (once prevLen >= minChain it can never be
 *  true again); a re-cross after backtrack is suppressed by the caller's latch. */
export function crossesThreshold(prevLen: number, newLen: number, minChain: number): boolean {
  return prevLen < minChain && newLen >= minChain;
}

/** Haptic duration (ms) for a per-tile add, escalating with chain length and
 *  clamped to 35ms. Returns 0 to mean "no buzz" so callers can skip the call;
 *  length 1 returns 0 because startPath already fires its own vibrate(10). */
export function tickHapticMs(len: number): number {
  if (len < 2) return 0;
  return Math.min(35, 6 + len * 3);
}
