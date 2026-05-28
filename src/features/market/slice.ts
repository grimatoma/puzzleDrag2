import { sellPriceFor } from "./pricing.js";
import { locBuilt } from "../../locBuilt.js";
import { inventoryQty } from "../../types/inventory.js";
import type { Action, GameState } from "../../types/state.js";

export const initial = {};

/**
 * MARKET/SELL reducer.
 * Deducts qty from inventory and credits coins at the current sell price.
 * Requires state.built.caravan_post === true.
 * Returns state unchanged if caravan_post not built or insufficient inventory.
 */
export function reduce(state: GameState, action: Action): GameState {
  if (action.type !== "MARKET/SELL") return state;

  const payload = (action.payload ?? {}) as { resource?: string; qty?: number };
  const resource = payload.resource;
  const qty = payload.qty ?? 1;
  if (!resource) return state;
  // Caravan Post must be built
  if (!locBuilt(state).caravan_post) return state;

  const have = inventoryQty(state.inventory, resource);
  if (have < qty) return state;

  const price = sellPriceFor(resource);
  if (price <= 0) return state;

  return {
    ...state,
    inventory: {
      ...state.inventory,
      [resource]: have - qty,
    },
    coins: (state.coins ?? 0) + price * qty,
  };
}
