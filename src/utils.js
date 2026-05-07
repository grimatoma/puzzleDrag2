import { UPGRADE_THRESHOLDS, RESOURCE_CAP_BASE, RESOURCE_CAP_GRANARY } from "./constants.js";

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function upgradeCountForChain(chainLength, resourceKey, thresholdMap = UPGRADE_THRESHOLDS) {
  const t = thresholdMap[resourceKey];
  if (!t) return 0; // terminal or unknown resource
  return Math.floor(chainLength / t);
}

export function resourceGainForChain(chainLength) {
  return chainLength * (chainLength >= 6 ? 2 : 1);
}

const DROUGHT_AFFECTED = new Set(["wheat", "grain"]);

/**
 * Apply weather modification to a resource pool roll.
 * Returns a resource key sampled from the pool with weather rules applied.
 * @param {string[]} pool - array of resource keys (with repetition for weighting)
 * @param {string|null} weather - active weather key, or null
 * @param {() => number} [rand] - optional RNG (defaults to Math.random)
 */
export function rollResourceWithWeather(pool, weather, rand = Math.random) {
  const pick = () => pool[Math.floor(rand() * pool.length)];
  let key = pick();
  if (weather === "drought" && DROUGHT_AFFECTED.has(key)) {
    // 50% chance to re-roll once, reducing wheat/grain appearance by ~50%
    if (rand() < 0.5) key = pick();
  }
  return key;
}

export function hex(num) {
  return `#${num.toString(16).padStart(6, "0")}`;
}

export function makeBubble(npc, text, ms = 1800) {
  return { id: Date.now(), npc, text, ms };
}

/** Returns the season index (0=Spring, 1=Summer, 2=Autumn, 3=Winter) for a given turn count. */
export function seasonIndexForTurns(turns) {
  if (turns <= 2) return 0; // Spring
  if (turns <= 5) return 1; // Summer
  if (turns <= 8) return 2; // Autumn
  return 3;                 // Winter
}

/** Returns the per-resource inventory cap: 500 with Granary, 200 otherwise. */
export function currentCap(state) {
  return state?.built?.granary ? RESOURCE_CAP_GRANARY : RESOURCE_CAP_BASE;
}

// runSelfTests — thin smoke shim for in-game console use (<50ms).
// The comprehensive test suite lives in tests/phase-N-*.test.js (run via npm test).
// Import is lazy to avoid circular deps at module init time.
export async function runSelfTests() {
  const { SMOKE_INVARIANTS } = await import("./smokeTests.js");
  let passed = 0, failed = 0;
  for (const { name, check } of SMOKE_INVARIANTS) {
    try {
      if (check()) {
        passed++;
      } else {
        failed++;
        console.assert(false, name);
      }
    } catch (e) {
      failed++;
      console.error("smoke fail:", name, e);
    }
  }
  console.log(`[smoke] ${passed} passed, ${failed} failed`);
  return failed === 0;
}
