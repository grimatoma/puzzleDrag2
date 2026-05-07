/**
 * Phase 10.3 — Market sell price helper.
 *
 * Convention: 10% of the recipe's listed coin value, rounded half-up
 * (standard Math.round — 0.5 rounds to 1 in JS).
 */
import { RECIPES } from "../../constants.js";

export const SELL_RATE = 0.10;

/**
 * Return the sell price for a crafted item, or 0 if unknown.
 *
 * @param {string} itemId  snake_case or camelCase recipe key
 * @returns {number}
 */
export function sellPriceFor(itemId) {
  const r = RECIPES[itemId];
  if (!r || !r.coins) return 0;
  return Math.round(r.coins * SELL_RATE);
}
