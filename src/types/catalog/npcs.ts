/**
 * Hand-maintained catalog enum — edit when adding ids, then update the matching config map.
 */

/** NPC roster ids. */
export enum NpcId {
  Bram = "bram",
  Liss = "liss",
  Mira = "mira",
  Tomas = "tomas",
  Wren = "wren",
}

export const NPC_ID_VALUES = Object.values(NpcId);
