/**
 * Hand-maintained catalog enum — edit when adding ids, then update the matching config map.
 */

/** Calendar season names. */
export enum SeasonId {
  Autumn = "Autumn",
  Spring = "Spring",
  Summer = "Summer",
  Winter = "Winter",
}

export const SEASON_ID_VALUES = Object.values(SeasonId);
