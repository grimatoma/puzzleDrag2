/**
 * Hand-maintained catalog enum — edit when adding ids, then update the matching config map.
 */

/** Hash router modal ids. */
export enum ModalId {
  Boss = "boss",
  Debug = "debug",
  Festivals = "festivals",
  Menu = "menu",
  Tutorial = "tutorial",
}

export const MODAL_ID_VALUES = Object.values(ModalId);
