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

interface PoolHostState {
  biome?: string;
  biomeKey?: string;
  season?: string | number;
  tileCollection?: {
    activeFilter?: (k: string) => boolean;
    activeByCategory?: Record<string, string | null>;
  };
  _workerEffects?: { effectivePoolWeights?: Record<string, number> };
}

interface AggregatedAbilities {
  effectivePoolWeights?: Record<string, number>;
}

/**
 * Returns the effective spawn pool for the current board state.
 * Pure function — no side effects.
 */
export function getEffectivePool(state: GameState): string[] {
  // eslint-disable-next-line no-restricted-syntax -- pre-existing HostState cast; tracked for follow-up cleanup
  const s = state as unknown as PoolHostState;
  const biomeMap = BIOMES as unknown as Record<string, BiomeDef>;
  const biome: BiomeDef = biomeMap[s.biome ?? ""] ?? biomeMap[s.biomeKey ?? ""] ?? biomeMap.farm;
  let bag: string[] = [...biome.pool];

  if (typeof s.tileCollection?.activeFilter === "function") {
    const filter = s.tileCollection.activeFilter;
    bag = bag.filter((k: string) => filter(k) !== false);
  }

  const agg = computeAggregatedAbilities(state) as AggregatedAbilities;
  const poolWeights: Record<string, number> = {
    ...(s._workerEffects?.effectivePoolWeights ?? {}),
    ...(agg.effectivePoolWeights ?? {}),
  };
  bag = applyPoolWeightAdds(bag, poolWeights, s.tileCollection?.activeByCategory);

  if ((s.biome ?? s.biomeKey) === "farm") {
    const seasonName: string =
      typeof s.season === "string"
        ? s.season
        : (["Spring", "Summer", "Autumn", "Winter"][((s.season as number) ?? 0) % 4] ?? "Spring");
    bag = applySeasonPoolMods(bag, seasonName);
  }

  const fallback = biome.pool;
  while (bag.length < 9) {
    bag.push(fallback[bag.length % fallback.length]);
  }

  return bag;
}

export { applyPoolWeightAdds, applySeasonPoolMods } from "./poolMath.js";
