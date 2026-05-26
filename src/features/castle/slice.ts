/**
 * Castle slice — handles CASTLE/CONTRIBUTE.
 * State shape: { contributed: { soup, meat, tile_mine_coal } }
 * One-way sink: there is no reset action.
 */
import { CASTLE_NEEDS } from "./data.js";
import type { Action, GameState } from "../../types/state.js";

interface CastleSubstate {
  contributed: Record<string, number>;
}

export const initial = {
  castle: {
    contributed: { soup: 0, meat: 0, tile_mine_coal: 0 },
  },
};

/** Defensive accessor — old saves may not have state.castle yet. */
function castleOf(state: GameState): CastleSubstate {
  const c = state?.castle as CastleSubstate | undefined;
  if (c && c.contributed && typeof c.contributed === "object") {
    return {
      contributed: {
        soup: c.contributed.soup ?? 0,
        meat: c.contributed.meat ?? 0,
        tile_mine_coal: c.contributed.tile_mine_coal ?? 0,
      },
    };
  }
  return { contributed: { soup: 0, meat: 0, tile_mine_coal: 0 } };
}

export function reduce(state: GameState, action: Action): GameState {
  if (action.type !== "CASTLE/CONTRIBUTE") return state;

  const payload = (action.payload ?? {}) as { key?: string; amount?: number };
  const key = payload.key ?? "";
  const amount = payload.amount ?? 0;
  const need = (CASTLE_NEEDS as Record<string, { target: number; resource: string; label: string } | undefined>)[key];
  if (!need) return state;

  const qty = amount | 0;
  if (qty <= 0) return state;

  const have = (state.inventory ?? {})[need.resource] ?? 0;
  if (have < qty) return state;

  const castle = castleOf(state);
  const already = castle.contributed[key] ?? 0;
  if (already + qty > need.target) return state;

  return {
    ...state,
    inventory: {
      ...state.inventory,
      [need.resource]: have - qty,
    },
    castle: {
      ...castle,
      contributed: {
        ...castle.contributed,
        [key]: already + qty,
      },
    },
  };
}
