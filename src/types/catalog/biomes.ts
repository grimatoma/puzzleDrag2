/**
 * Hand-maintained catalog enum — edit when adding ids, then update the matching config map.
 */

/** Playable biome ids. */
export enum BiomeId {
  Farm = "farm",
  Fish = "fish",
  Mine = "mine",
}

export const BIOME_ID_VALUES = Object.values(BiomeId);
