// Per-tile idle playback timing for multi-frame baked board tiles.
//
// `idleAnimTiming.ts` warps a single per-KEY clock, so every instance of a tile
// type still animates in lockstep (they share one baked texture). This module is
// the per-CELL counterpart used once tiles render as a frame-bank spritesheet and
// each sprite can pick its own frame: it answers "which idle frame should the
// tile at (col,row) show right now?" so each board cell runs an independent,
// staggered schedule.
//
// The rhythm per cell: hold the rest frame for a randomized "several seconds",
// then play the idle clip through exactly ONCE, then rest again. The rest length
// and the cycle phase are seeded from (col,row) so no two cells line up and the
// gestures roll across the board instead of pulsing together. Everything is a
// pure function of (ms, col, row, frames) — no Math.random — so a frame is stable
// if queried twice in a tick and identical across re-bakes and reloads.

/** ms per idle frame — matches the bake cadence in `seasonalArt.ts` (IDLE_MS). */
export const IDLE_FRAME_MS = 130;
/** Shortest hold on the rest frame between gestures. */
export const IDLE_REST_MIN_MS = 5000;
/** Longest hold on the rest frame between gestures. */
export const IDLE_REST_MAX_MS = 10000;

/** Stable FNV-1a hash of a salted cell key mapped to [0, 1). */
function cellRand01(col: number, row: number, salt: string): number {
  let h = 2166136261;
  const s = `${col},${row},${salt}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** Per-cell rest hold in ms, in [IDLE_REST_MIN_MS, IDLE_REST_MAX_MS]. Each cell
 *  draws a different (but stable) value so tiles don't share a rhythm. */
export function cellRestMs(col: number, row: number): number {
  return IDLE_REST_MIN_MS + cellRand01(col, row, "rest") * (IDLE_REST_MAX_MS - IDLE_REST_MIN_MS);
}

/**
 * The idle-clip frame to show at time `ms` for the cell at (col,row) of an
 * `frames`-frame clip.
 *
 * One cycle = rest (`cellRestMs`, holding frame 0) followed by the clip played
 * once (`frames * IDLE_FRAME_MS`). A per-cell phase shifts where each cell sits
 * in its cycle, so gestures stagger across the board. A single-frame (static)
 * clip always returns 0.
 */
export function idleFrameAt(ms: number, col: number, row: number, frames: number): number {
  if (frames <= 1 || !Number.isFinite(ms)) return 0;
  const clipMs = frames * IDLE_FRAME_MS;
  const cycle = cellRestMs(col, row) + clipMs;
  const phase = cellRand01(col, row, "phase") * cycle;
  let local = (ms + phase) % cycle;
  if (local < 0) local += cycle;
  const intoClip = local - (cycle - clipMs); // rest occupies [0, cycle-clipMs)
  if (intoClip < 0) return 0; // resting on the rest frame
  return Math.min(frames - 1, Math.max(0, Math.floor(intoClip / IDLE_FRAME_MS)));
}
