/**
 * Hand-maintained catalog enum — edit when adding ids, then update the matching config map.
 */

/** Worker type-tier ids. */
export enum WorkerTypeId {
  Baker = "baker",
  Farmer = "farmer",
  Lumberjack = "lumberjack",
  Miner = "miner",
}

export const WORKER_TYPE_ID_VALUES = Object.values(WorkerTypeId);
