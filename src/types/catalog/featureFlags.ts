/**
 * Feature toggles (compile-time concepts).
 *
 * Note: these are *not* the same as story flags. Story flags live on
 * `state.story.flags` and are enumerated by `StoryFlagId`.
 *
 * This enum exists mainly as a canonical vocabulary for documentation / UI
 * and to avoid drifting naming for the few global feature toggles.
 */

export enum FeatureFlagId {
  /** Mirrors `featureFlags.ts` FIRE_HAZARD_ENABLED + tuning `fireHazardEnabled`. */
  FireHazard = "fireHazard",
  /** Mirrors `featureFlags.ts` RATS_HAZARD_ENABLED. */
  RatsHazard = "ratsHazard",
  /** Mirrors `featureFlags.ts` isDialogsDisabled() behavior. */
  DialogsDisabled = "dialogsDisabled",
}

export const FEATURE_FLAG_ID_VALUES = Object.values(FeatureFlagId);

