/**
 * Hand-maintained catalog enum — edit when adding ids, then update MAP_NODES in cartography/data.ts.
 */

/** Map zone / node ids (cartography MAP_NODES → ZONES). */
export enum ZoneId {
  Caves = "caves",
  Crossroads = "crossroads",
  Fairground = "fairground",
  Forge = "forge",
  Harbor = "harbor",
  Home = "home",
  Meadow = "meadow",
  Oldcapital = "oldcapital",
  Orchard = "orchard",
  Pit = "pit",
  Quarry = "quarry",
}

export const ZONE_ID_VALUES = Object.values(ZoneId);
