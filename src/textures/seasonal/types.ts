// Shared types for seasonal tile art.
//
// A "seasonal tile" is a board tile whose icon is fully redrawn per season
// (Spring/Summer/Autumn/Winter), optionally with a per-frame animation. The
// season name strings here match `SEASONS[i].name` in `src/constants.ts`,
// `SeasonId` enum *values* in `src/types/catalog/seasons.ts`, and the output
// of `seasonNameInSession()` in `src/features/zones/data.ts` — so a single
// string key is valid across all three.

export type SeasonName = "Spring" | "Summer" | "Autumn" | "Winter";

export const SEASON_NAMES: readonly SeasonName[] = ["Spring", "Summer", "Autumn", "Winter"];

/** One season's appearance for a tile. Drawn origin-centered in the ~-24..+24
 *  design box (same space as the static icon-registry draws). */
export interface SeasonalVariant {
  /** Full-art static redraw for this season. */
  draw: (ctx: CanvasRenderingContext2D) => void;
  /** Optional seamless per-frame animation; `t` is elapsed seconds.
   *  Should stay subtle (the board sprite keeps its own sway rotation). */
  anim?: (ctx: CanvasRenderingContext2D, t: number) => void;
}

/** All four seasons for a single tile key. */
export type SeasonalTileEntry = Record<SeasonName, SeasonalVariant>;

/** One FORWARD season→season morph. `p` runs 0..1: at p=0 the canvas should
 *  read as the `from` season's still, at p=1 as the `to` season's still, with
 *  the in-between staging the change (colour + shape — petals opening, leaves
 *  turning then falling, snow settling). Drawn in the same origin-centered
 *  −24..+24 box as the season `draw`s, and must be safe to call for any `p`. */
export type SeasonalTransition = (ctx: CanvasRenderingContext2D, p: number) => void;

/** Forward transitions for a tile, keyed by the FROM-season index:
 *  0 = Spring→Summer, 1 = Summer→Autumn, 2 = Autumn→Winter. There is no
 *  Winter→Spring (a run ends at Winter), so index 3 is intentionally absent. */
export type SeasonalTransitionSet = Partial<Record<0 | 1 | 2, SeasonalTransition>>;
