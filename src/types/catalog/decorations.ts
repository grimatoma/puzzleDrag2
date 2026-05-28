/**
 * Hand-maintained catalog enum — edit when adding ids, then update the matching config map.
 */

/** Decoration building ids — repeatable village ornaments granting Influence. */
export enum DecorationId {
  VioletBed = "violet_bed",
  StoneLantern = "stone_lantern",
  AppleSapling = "apple_sapling",
  DriftwoodArch = "driftwood_arch",
  PearlFountain = "pearl_fountain",
  FishingDock = "fishing_dock",
  CobbleWell = "cobble_well",
  SmelterBrazier = "smelter_brazier",
}

export const DECORATION_ID_VALUES = Object.values(DecorationId);
