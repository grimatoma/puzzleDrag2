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
