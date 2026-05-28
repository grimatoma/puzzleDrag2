/**
 * Hand-maintained catalog enum — edit when adding ids, then update the matching config map.
 */

/** Tile discovery method ids. */
export enum TileDiscoveryMethodId {
  Buy = "buy",
  Chain = "chain",
  Daily = "daily",
  Default = "default",
  Research = "research",
}

export const TILE_DISCOVERY_METHOD_ID_VALUES = Object.values(TileDiscoveryMethodId);
