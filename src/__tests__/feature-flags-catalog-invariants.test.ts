import { describe, expect, it } from "vitest";
import { FEATURE_FLAG_ID_VALUES } from "../types/catalogKeys.js";
import * as featureFlags from "../featureFlags.js";

describe("feature flag catalog", () => {
  it("FeatureFlagId has the expected stable vocabulary", () => {
    // This is intentionally a small, stable list.
    expect(new Set(FEATURE_FLAG_ID_VALUES)).toEqual(
      new Set(["fireHazard", "ratsHazard", "dialogsDisabled"]),
    );
  });

  it("featureFlags module exports expected toggles", () => {
    expect(typeof featureFlags.FIRE_HAZARD_ENABLED).toBe("boolean");
    expect(typeof featureFlags.RATS_HAZARD_ENABLED).toBe("boolean");
    expect(typeof featureFlags.isFireHazardEnabled).toBe("function");
    expect(typeof featureFlags.isDialogsDisabled).toBe("function");
  });
});

