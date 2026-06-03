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
}

export const DECORATIONS = {
  [DecorationId.VioletBed]: {
    id: DecorationId.VioletBed,
    name: "Violet Bed",
    cost: { coins: 60, tile_grass_grass: 4 },
    influence: 20,
  },
  [DecorationId.StoneLantern]: {
    id: DecorationId.StoneLantern,
    name: "Stone Lantern",
    cost: { coins: 120, tile_mine_stone: 6, plank: 2 },
    influence: 35,
  },
  [DecorationId.AppleSapling]: {
    id: DecorationId.AppleSapling,
    name: "Apple Sapling",
    cost: { coins: 200, plank: 4, berry: 6 },
    influence: 60,
  },
  // Harbor-themed decorations — costs lean on fish + wood resources.
  [DecorationId.DriftwoodArch]: {
    id: DecorationId.DriftwoodArch,
    name: "Driftwood Arch",
    cost: { coins: 180, plank: 4, tile_fish_kelp: 6 },
    influence: 55,
  },
  [DecorationId.PearlFountain]: {
    id: DecorationId.PearlFountain,
    name: "Pearl Fountain",
    cost: { coins: 400, tile_mine_stone: 8, tile_fish_oyster: 4 },
    influence: 95,
  },
  [DecorationId.FishingDock]: {
    id: DecorationId.FishingDock,
    name: "Fishing Dock",
    cost: { coins: 300, plank: 10, tile_mine_stone: 4 },
    influence: 80,
  },
  // Mine-themed decorations.
  [DecorationId.CobbleWell]: {
    id: DecorationId.CobbleWell,
    name: "Cobble Well",
    cost: { coins: 220, tile_mine_stone: 12, plank: 2 },
    influence: 65,
  },
  [DecorationId.SmelterBrazier]: {
    id: DecorationId.SmelterBrazier,
    name: "Smelter Brazier",
    cost: { coins: 350, iron_bar: 2, tile_mine_coal: 8 },
    influence: 90,
  },
} as const satisfies Record<DecorationId, DecorationDef>;
