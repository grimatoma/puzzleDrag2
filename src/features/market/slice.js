import { sellPriceFor } from "./pricing.js";

export const initial = {};

/**
 * MARKET/SELL reducer.
 * Deducts qty from inventory and credits coins at the current sell price.
 * Requires state.built.caravan_post === true.
 * Returns state unchanged if caravan_post not built or insufficient inventory.
 */
export function reduce(state, action) {
  if (action.type !== "MARKET/SELL") return state;

  const { resource, qty = 1 } = action.payload ?? {};
  if (!resource) return state;
  // Caravan Post must be built
  if (!state.built?.caravan_post) return state;

  const have = (state.inventory ?? {})[resource] ?? 0;
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
