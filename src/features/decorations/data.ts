/**
 * Decoration buildings — repeatable village ornaments that grant Influence.
 * §3 / §11 locked costs and influence values.
 *
 * Keyed by {@link DecorationId} so missing/extra ids fail at compile time;
 * the `satisfies Record<DecorationId, …>` clause keeps catalog membership and
 * attribute coverage in lockstep.
 */
import { DecorationId } from "../../types/catalogKeys.js";

export interface DecorationDef {
  id: DecorationId;
  name: string;
  cost: Record<string, number>;
  influence: number;
  /** Short in-world line describing the comfort it brings the village. */
  flavor?: string;
}

export const DECORATIONS = {
  [DecorationId.VioletBed]: {
    id: DecorationId.VioletBed,
    name: "Violet Bed",
    cost: { coins: 60, tile_grass_grass: 4 },
    influence: 20,
    flavor: "A splash of colour by the door — Sister Liss says the children adore them.",
  },
  [DecorationId.StoneLantern]: {
    id: DecorationId.StoneLantern,
    name: "Stone Lantern",
    cost: { coins: 120, tile_mine_stone: 6, plank: 2 },
    influence: 35,
    flavor: "Warm light for the evening paths, cut and set by Bram's own hand.",
  },
  [DecorationId.AppleSapling]: {
    id: DecorationId.AppleSapling,
    name: "Apple Sapling",
    cost: { coins: 200, plank: 4, berry: 6 },
    influence: 60,
    flavor: "Plant one now and Old Tomas will be stealing the fruit come autumn.",
  },
  // Harbor-themed decorations — costs lean on fish + wood resources.
  [DecorationId.DriftwoodArch]: {
    id: DecorationId.DriftwoodArch,
    name: "Driftwood Arch",
    cost: { coins: 180, plank: 4, tile_fish_kelp: 6 },
    influence: 55,
    flavor: "Wren shaped this from what the tide gave up. Even the gulls approve.",
  },
  [DecorationId.PearlFountain]: {
    id: DecorationId.PearlFountain,
    name: "Pearl Fountain",
    cost: { coins: 400, tile_mine_stone: 8, tile_fish_oyster: 4 },
    influence: 95,
    flavor: "The vale's pride — pearls from the deep flats, set in cut stone.",
  },
  [DecorationId.FishingDock]: {
    id: DecorationId.FishingDock,
    name: "Fishing Dock",
    cost: { coins: 300, plank: 10, tile_mine_stone: 4 },
    influence: 80,
    flavor: "A sturdy dock where the harbor folk gather to mend their nets.",
  },
  // Mine-themed decorations.
  [DecorationId.CobbleWell]: {
    id: DecorationId.CobbleWell,
    name: "Cobble Well",
    cost: { coins: 220, tile_mine_stone: 12, plank: 2 },
    influence: 65,
    flavor: "Cool, clean water for the whole lane — no more hauling from the river.",
  },
  [DecorationId.SmelterBrazier]: {
    id: DecorationId.SmelterBrazier,
    name: "Smelter Brazier",
    cost: { coins: 350, iron_bar: 2, tile_mine_coal: 8 },
    influence: 90,
    flavor: "Bram's forge-fire, brought up to the square for the festival nights.",
  },
} as const satisfies Record<DecorationId, DecorationDef>;
