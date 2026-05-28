/**
 * Hand-maintained catalog enum — edit when adding ids, then update the matching config map.
 */

/** Mine hazard ids. */
export enum MineHazardId {
  CaveIn = "cave_in",
  GasVent = "gas_vent",
  Lava = "lava",
  Mole = "mole",
}

export const MINE_HAZARD_ID_VALUES = Object.values(MineHazardId);
