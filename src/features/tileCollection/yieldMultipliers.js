/**
 * "2× more" yield multipliers from REFERENCE_CATALOG §7.
 *
 * Catalog mappings:
 *   Jackfruit    → 2× pie
 *   Triceratops  → 2× milk
 *
 * The chain still produces the standard upgrade tile, but the partner
 * product (pie / milk) is granted at double the usual count when the
 * chain key matches.
 */
export const YIELD_MULTIPLIERS = Object.freeze({
  fruit_jackfruit:    { multiplier: 2, productKey: "pie" },
  cattle_triceratops: { multiplier: 2, productKey: "milk" },
});

/**
 * Returns the yield multiplier shape for `resourceKey`, or null.
 * @param {string} resourceKey
 * @returns {{ multiplier: number, productKey: string } | null}
 */
export function yieldMultiplierFor(resourceKey) {
  return YIELD_MULTIPLIERS[resourceKey] ?? null;
}
