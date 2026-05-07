/**
 * Pure weather effect helpers. No Phaser refs.
 * Each function takes current value + weather state and returns the modified value.
 */

/** Rain doubles berry yield. Other resources unchanged. */
export function applyRainBerryBonus(payload, weather) {
  if (weather?.active !== "rain") return payload;
  const out = { ...payload };
  if (out.berry != null) out.berry = out.berry * 2;
  return out;
}

/** Harvest Moon adds +1 to the upgradeCount result. */
export function applyHarvestMoonUpgrade(upgradeCount, weather) {
  return weather?.active === "harvest_moon" ? upgradeCount + 1 : upgradeCount;
}

/**
 * Drought halves wheat and grain spawn weights (pure — returns new pool array).
 * Input pool is not mutated.
 */
export function applyDroughtSpawnWeights(pool, weather) {
  if (weather?.active !== "drought") return pool;
  return pool.map((p) =>
    p.key === "wheat" || p.key === "grain"
      ? { ...p, weight: p.weight * 0.5 }
      : p
  );
}

/**
 * Frost doubles the collapse tween duration (visual only — no inventory change).
 */
export function applyFrostCollapseDuration(baseMs, weather) {
  return weather?.active === "frost" ? baseMs * 2 : baseMs;
}
