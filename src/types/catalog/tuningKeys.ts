/**
 * Keys accepted by `sanitizeTuning` (`src/config/applyOverrides.ts`) for
 * Dev Panel `balance.json` → `tuning`. Hazard UX toggles also live in
 * `src/featureFlags.ts` (compile-time) and may mirror `fireHazardEnabled` here.
 */

export enum TuningKey {
  CraftQueueHours = "craftQueueHours",
  CraftGemSkipCost = "craftGemSkipCost",
  MinExpeditionTurns = "minExpeditionTurns",
  FoundingBaseCoins = "foundingBaseCoins",
  FoundingGrowth = "foundingGrowth",
  HomeBiome = "homeBiome",
  FireHazardEnabled = "fireHazardEnabled",
}

export const TUNING_KEY_VALUES = Object.values(TuningKey);
