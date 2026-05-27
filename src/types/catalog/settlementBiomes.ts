/**
 * Hand-maintained catalog enum — edit when adding ids, then update the matching config map.
 */

/** Settlement founding biome options. */
export enum SettlementBiomeId {
  Arctic = "arctic",
  Coastal = "coastal",
  Coral = "coral",
  DeepCave = "deep_cave",
  Forest = "forest",
  Highland = "highland",
  Marsh = "marsh",
  Mountain = "mountain",
  Prairie = "prairie",
  Tropical = "tropical",
  Tundra = "tundra",
  Volcanic = "volcanic",
}

export const SETTLEMENT_BIOME_ID_VALUES = Object.values(SettlementBiomeId);
