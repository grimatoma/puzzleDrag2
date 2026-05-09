/**
 * "Long chain gives X" bonuses from REFERENCE_CATALOG §7.
 *
 * Each entry: when the chained resource is `key` AND chainLength ≥ threshold,
 * grant `amount` of `bonusKey` to inventory once per chain. Pure data; the
 * core CHAIN_COLLECTED handler reads this map.
 *
 * Catalog mappings (chain ≥ 12 unless otherwise noted):
 *   Buckwheat → herd animal
 *   Eggplant  → vegetable (any veg slot)
 *   Goose     → vegetable (any veg slot)
 *   Willow    → vegetable
 *   Broccoli  → flower
 *   Warthog   → mount
 */
export const LONG_CHAIN_BONUSES = Object.freeze({
  grain_buckwheat: { threshold: 12, bonusKey: "herd_pig",  amount: 1 },
  veg_eggplant:    { threshold: 12, bonusKey: "veg_carrot", amount: 1 },
  bird_goose:      { threshold: 12, bonusKey: "veg_carrot", amount: 1 },
  tree_willow:     { threshold: 12, bonusKey: "veg_carrot", amount: 1 },
  veg_broccoli:    { threshold: 12, bonusKey: "flower_pansy", amount: 1 },
  herd_warthog:    { threshold: 12, bonusKey: "mount_horse",  amount: 1 },
});

/**
 * Returns the long-chain bonus payload for `resourceKey` at the given chain
 * length, or `null` if no bonus applies.
 *
 * @param {string} resourceKey
 * @param {number} chainLength
 * @returns {{ bonusKey: string, amount: number } | null}
 */
export function longChainBonusFor(resourceKey, chainLength) {
  const def = LONG_CHAIN_BONUSES[resourceKey];
  if (!def) return null;
  if (chainLength < def.threshold) return null;
  return { bonusKey: def.bonusKey, amount: def.amount };
}
