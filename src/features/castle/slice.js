/**
 * Castle slice — handles CASTLE/CONTRIBUTE.
 * State shape: { contributed: { soup, meat, coal, cocoa, ink } }
 * One-way sink: there is no reset action.
 */
import { CASTLE_NEEDS } from "./data.js";

export const initial = {
  castle: {
    contributed: { soup: 0, meat: 0, mine_coal: 0, cocoa: 0, ink: 0 },
  },
};

/** Defensive accessor — old saves may not have state.castle yet. */
function castleOf(state) {
  const c = state?.castle;
  if (c && c.contributed && typeof c.contributed === "object") {
    return {
      contributed: {
        soup: c.contributed.soup ?? 0,
        meat: c.contributed.meat ?? 0,
        mine_coal: c.contributed.mine_coal ?? 0,
        cocoa: c.contributed.cocoa ?? 0,
        ink: c.contributed.ink ?? 0,
      },
    };
  }
  return { contributed: { soup: 0, meat: 0, mine_coal: 0, cocoa: 0, ink: 0 } };
}

export function reduce(state, action) {
  if (action.type !== "CASTLE/CONTRIBUTE") return state;

  const { key, amount } = action.payload ?? {};
  const need = CASTLE_NEEDS[key];
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
