/**
 * Phase 10.2 — Effective tile pool with per-season modifier.
 */
import { BIOMES } from "../../constants.js";
import { computeAggregatedAbilities } from "../workers/aggregate.js";
import { applyPoolWeightAdds, applySeasonPoolMods } from "./poolMath.js";

/**
 * Returns the effective spawn pool for the current board state.
 * Pure function — no side effects.
 *
 * @param {object} state
 * @returns {string[]}  flat array of tile keys, length ≥ 9
 */
export function getEffectivePool(state) {
  const biome = BIOMES[state.biome] ?? BIOMES[state.biomeKey] ?? BIOMES.farm;
  let bag = [...biome.pool];

  if (typeof state.tileCollection?.activeFilter === "function") {
    bag = bag.filter((k) => state.tileCollection.activeFilter(k) !== false);
  }

  const agg = computeAggregatedAbilities(state);
  const poolWeights = {
    ...(state._workerEffects?.effectivePoolWeights ?? {}),
    ...(agg.effectivePoolWeights ?? {}),
  };
  bag = applyPoolWeightAdds(bag, poolWeights, state.tileCollection?.activeByCategory);

  if ((state.biome ?? state.biomeKey) === "farm") {
    const seasonName =
      typeof state.season === "string"
        ? state.season
        : ["Spring", "Summer", "Autumn", "Winter"][state.season % 4] ?? "Spring";
    bag = applySeasonPoolMods(bag, seasonName);
  }

  const fallback = biome.pool;
  while (bag.length < 9) {
    bag.push(fallback[bag.length % fallback.length]);
  }

  return bag;
}

export { applyPoolWeightAdds, applySeasonPoolMods } from "./poolMath.js";
