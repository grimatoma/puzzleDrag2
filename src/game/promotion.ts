// Promotion chains (PC2 "a long chain of X also yields one Y"). Each entry maps a
// source category to the next category it can promote into. The award is gated by
// an aggregated chain_redirect_category worker lowering the threshold.
export const PROMOTION_CHAINS: Record<string, string> = {
  grain: "vegetables",
  vegetables: "fruits",
  fruits: "flowers",
  bird: "herd_animals",
  herd_animals: "cattle",
  cattle: "mounts",
  mine_iron_ore: "mine_gem",
  mine_gem: "mine_gold",
};

export interface PromotionResult { toCategory: string; units: number; }

/** Given the aggregate, the chain's source category, and chain length, return the
 *  promotion award (or null). Fires only when a redirect worker is hired for the
 *  source category and the chain reaches the worker-reduced threshold. */
export function computePromotion(
  agg: { chainRedirect?: Record<string, { toCategory: string; threshold: number; redirectShare: number }> },
  fromCategory: string,
  chainUnits: number,
): PromotionResult | null {
  const entry = agg.chainRedirect?.[fromCategory];
  if (!entry) return null;
  if (chainUnits < entry.threshold) return null;
  const units = Math.max(1, Math.floor(entry.redirectShare * (chainUnits / entry.threshold)));
  return { toCategory: entry.toCategory, units };
}
