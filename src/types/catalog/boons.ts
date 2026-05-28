/**
 * Hand-maintained catalog enum — edit when adding ids, then update the matching config map.
 */

/** Boon catalog ids — keeper-path perks bought with Embers or Core Ingots. */
export enum BoonId {
  // farm coexist
  DeerBlessing = "deer_blessing",
  HearthThrift = "hearth_thrift",
  // farm driveout
  IronMarket = "iron_market",
  DrilledCorps = "drilled_corps",
  // mine coexist
  DeepFriendship = "deep_friendship",
  VeinRichness = "vein_richness",
  // mine driveout
  IngotThrift = "ingot_thrift",
  ForemanDrills = "foreman_drills",
  // harbor coexist
  SailorAmity = "sailor_amity",
  PearlTrove = "pearl_trove",
  // harbor driveout
  HarborTariff = "harbor_tariff",
  PressGang = "press_gang",
}

export const BOON_ID_VALUES = Object.values(BoonId);
