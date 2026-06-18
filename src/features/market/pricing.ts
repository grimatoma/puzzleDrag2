/**
 * Phase 10.3 — Market sell price helper.
 *
 * Convention: 10% of the recipe's listed coin value, rounded half-up
 * (standard Math.round — 0.5 rounds to 1 in JS).
 */
import { getItem } from "../../constants.js";

export const SELL_RATE = 0.10;

/**
 * Return the sell price for a crafted item, or 0 if unknown.
 *
 * @param {string} itemId  snake_case or camelCase recipe key
 * @returns {number}
 */
export function sellPriceFor(itemId: string): number {
  const item = getItem(itemId);
  if (!item || !item.value || item.sellable === false) return 0;
  return Math.round(item.value * SELL_RATE);
}

/**
 * Single source of truth for what a key sells for, regardless of whether the
 * UI classifies it as a "resource" (SELL_RESOURCE → applyTrade, reads the live
 * market table) or an "item" (SELL_ITEM). Previously the same key could pay
 * ~10× more via the market path than via the flat 10%-of-value item path; this
 * resolver closes that fork:
 *
 *   - if the key has a positive entry in the live market table, that price wins
 *     (matching exactly what SELL_RESOURCE pays);
 *   - otherwise fall back to the value-based item price (round(value × 10%)).
 *
 * A market entry of 0 (e.g. raw board tiles) is treated as "no market price"
 * so it does not suppress an otherwise-sellable item.
 */
export function effectiveSellPrice(
  itemId: string,
  marketPrices?: Record<string, { sell?: number } | undefined> | null,
): number {
  const market = marketPrices?.[itemId]?.sell;
  if (typeof market === "number" && market > 0) return market;
  return sellPriceFor(itemId);
}
