/**
 * Phase 10.2 — Effective tile pool with per-season modifier.
 *
 * Layering order (additive):
 *   1. Base §6 BIOMES[biome].pool
 *   2. Phase 5 species activeFilter (drops inactive species)
 *   3. Phase 4 worker pool_weight adds
 *   4. Phase 10.2 farm-only season modifier (this file)
 *
 * Locked: SEASON_EFFECTS (harvest +20%, summer 2× coin, etc.) are NOT touched.
 * Locked: Mine biome uses its own pool unmodified.
 */
import { BIOMES, SEASON_POOL_MODS } from "../../constants.js";

/**
 * Returns the effective spawn pool for the current board state.
 * Pure function — no side effects.
 *
 * @param {object} state
 * @returns {string[]}  flat array of tile keys, length ≥ 9
 */
export function getEffectivePool(state) {
  const biome = BIOMES[state.biome] ?? BIOMES.farm;
  let bag = [...biome.pool];

  // Phase 5 — drop tiles whose species is inactive (if filter provided)
  if (typeof state.species?.activeFilter === "function") {
    bag = bag.filter((k) => state.species.activeFilter(k) !== false);
  }

  // Phase 4 — worker pool_weight adds entries
  const adds = state._workerEffects?.effectivePoolWeights ?? {};
  for (const [k, n] of Object.entries(adds)) {
    for (let i = 0; i < n; i++) bag.push(k);
  }

  // Phase 10 — farm-only season modifier layer
  if (state.biome === "farm") {
    const seasonName =
      typeof state.season === "string"
        ? state.season
        : ["Spring", "Summer", "Autumn", "Winter"][state.season % 4] ?? "Spring";
    const mod = SEASON_POOL_MODS[seasonName] ?? {};
    for (const [k, d] of Object.entries(mod)) {
      if (d > 0) {
        for (let i = 0; i < d; i++) bag.push(k);
      } else if (d < 0) {
        let toRemove = -d;
        // Clamp: never remove the last entry of a key
        while (toRemove > 0 && bag.filter((x) => x === k).length > 1) {
          bag.splice(bag.lastIndexOf(k), 1);
          toRemove -= 1;
        }
      }
    }
  }

  // Safety floor: pool must never be shorter than 9 entries
  const fallback = biome.pool;
  while (bag.length < 9) {
    bag.push(fallback[bag.length % fallback.length]);
  }

  return bag;
}
