/**
 * Phase 10.2 — Effective tile pool with per-season modifier.
 */
import { BIOMES } from "../../constants.js";
import { computeAggregatedAbilities } from "../workers/aggregate.js";
import { applyPoolWeightAdds, applySeasonPoolMods } from "./poolMath.js";
import type { GameState } from "../../types/state.js";

interface BiomeDef {
  pool: string[];
}


interface AggregatedAbilities {
  effectivePoolWeights?: Record<string, number>;
}

/**
 * Returns the effective spawn pool for the current board state.
 * Pure function — no side effects.
 */
export function getEffectivePool(state: GameState): string[] {
  const biomeMap = BIOMES as unknown as Record<string, BiomeDef>;
  const biome: BiomeDef = biomeMap[state.biome ?? ""] ?? biomeMap[state.biomeKey ?? ""] ?? biomeMap.farm;
  let bag: string[] = [...biome.pool];

  if (typeof state.tileCollection?.activeFilter === "function") {
    const filter = state.tileCollection.activeFilter;
    bag = bag.filter((k: string) => filter(k) !== false);
  }

  const agg = computeAggregatedAbilities(state) as AggregatedAbilities;
  // `_workerEffects` is a test-only synthetic snapshot some tests pass on top
  // of `state`; cast at the access boundary so production callers (no field)
  // just fall through to the aggregator output.
  const workerEffects = (state as { _workerEffects?: { effectivePoolWeights?: Record<string, number> } })._workerEffects;
  const poolWeights: Record<string, number> = {
    ...(workerEffects?.effectivePoolWeights ?? {}),
    ...(agg.effectivePoolWeights ?? {}),
  };
  bag = applyPoolWeightAdds(bag, poolWeights, state.tileCollection?.activeByCategory);

  if ((state.biome ?? state.biomeKey) === "farm") {
    const seasonName: string =
      typeof state.season === "string"
        ? state.season
        : (["Spring", "Summer", "Autumn", "Winter"][((state.season as number) ?? 0) % 4] ?? "Spring");
    bag = applySeasonPoolMods(bag, seasonName);
  }

  const fallback = biome.pool;
  while (bag.length < 9) {
    bag.push(fallback[bag.length % fallback.length]);
  }

  return bag;
}

export { applyPoolWeightAdds, applySeasonPoolMods } from "./poolMath.js";
