/**
 * Keys of the `tuning` section validated by the schema in
 * `src/config/schemas/tuning.ts` (the optional Story Editor / Dev Panel draft).
 * The committed override-apply pipeline was removed, so these no longer patch
 * live constants; hazard UX toggles live in `src/featureFlags.ts` (compile-time)
 * and may mirror `fireHazardEnabled` here.
 */

export enum TuningKey {
  MinExpeditionTurns = "minExpeditionTurns",
  FoundingBaseCoins = "foundingBaseCoins",
  FoundingGrowth = "foundingGrowth",
  HomeBiome = "homeBiome",
  FireHazardEnabled = "fireHazardEnabled",
}

export const TUNING_KEY_VALUES = Object.values(TuningKey);
