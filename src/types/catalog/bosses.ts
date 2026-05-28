/**
 * Hand-maintained catalog enum — edit when adding ids, then update the matching config map.
 */

/** Seasonal boss ids. */
export enum BossId {
  EmberDrake = "ember_drake",
  Frostmaw = "frostmaw",
  Mossback = "mossback",
  OldStoneface = "old_stoneface",
  Quagmire = "quagmire",
  Storm = "storm",
}

export const BOSS_ID_VALUES = Object.values(BossId);
