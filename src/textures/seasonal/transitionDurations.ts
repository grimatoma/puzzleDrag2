// Per-tile season-transition durations (seconds), keyed by icon-registry tile key.
//
// The self-detecting controller (`seasonalVectorAdvance` in `seasonalTiles.ts`)
// plays a tile's forward morph over this many seconds instead of one global
// constant — so motion-heavy subjects (a tree whose foliage shape changes, an
// animal growing a winter coat) can breathe, while small produce stays snappy.
//
// A single number applies to all three forward morphs; a 3-tuple sets
// [Spring→Summer, Summer→Autumn, Autumn→Winter] individually. Any tile absent
// here uses DEFAULT_TRANSITION_SECONDS. Standalone (no imports) so both the
// vector controller and the preview-doc bundle can read it without a cycle.
//
// Tuning lives here on purpose: it's the one place to lengthen/shorten morphs
// without touching the per-tile art (the transition art is a duration-agnostic
// 0..1 progress function; the engine maps wall-time → progress over the value
// below).

export const DEFAULT_TRANSITION_SECONDS = 1.4;

export const TRANSITION_SECONDS: Readonly<
  Record<string, number | readonly [number, number, number]>
> = {
  // ── motion-v2 pilot (farm) ──────────────────────────────────────────────
  // Longer where the morph carries real change; the autumn→winter leaf-fall on
  // the oak gets the most room.
  tile_tree_oak: [2.6, 2.6, 3.2],
  tile_fruit_apple: 1.9,
  tile_flower_pansy: 2.1,
  tile_grain_corn: 2.1,
  tile_herd_sheep: 2.4,
};

/** Forward-transition duration (seconds) for `key`'s `fromIdx → fromIdx+1`
 *  morph, falling back to the default when the tile declares nothing. */
export function transitionSecondsFor(key: string, fromIdx: number): number {
  const v = TRANSITION_SECONDS[key];
  if (v === undefined) return DEFAULT_TRANSITION_SECONDS;
  if (typeof v === "number") return v > 0 ? v : DEFAULT_TRANSITION_SECONDS;
  const s = v[fromIdx];
  return typeof s === "number" && s > 0 ? s : DEFAULT_TRANSITION_SECONDS;
}
