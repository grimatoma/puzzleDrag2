import { UPGRADE_THRESHOLDS, ROWS, COLS, MAX_TURNS } from "./constants.js";

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

export function runSelfTests() {
  // 1.1 — Per-resource upgrade thresholds
  console.assert(upgradeCountForChain(5,  "hay")   === 0, "5 hay → no upgrade");
  console.assert(upgradeCountForChain(6,  "hay")   === 1, "6 hay → 1 upgrade");
  console.assert(upgradeCountForChain(12, "hay")   === 2, "12 hay → 2 upgrades");
  console.assert(upgradeCountForChain(18, "hay")   === 3, "18 hay → 3 upgrades");
  console.assert(upgradeCountForChain(4,  "grain") === 1, "grain threshold is 4");
  console.assert(upgradeCountForChain(5,  "egg")   === 0, "egg is terminal — no upgrade");
  console.assert(upgradeCountForChain(6,  "egg")   === 0, "egg terminal regardless of length");
  console.assert(upgradeCountForChain(4,  "wheat") === 0, "wheat threshold is 5, not 4");
  console.assert(upgradeCountForChain(5,  "wheat") === 1, "5 wheat → 1 upgrade");
  console.assert(clamp(12, 0, 10) === 10, "clamp upper bound failed");
  // 0.1 — Grid size
  console.assert(ROWS === 6, "ROWS must be 6");
  console.assert(COLS === 6, "COLS must be 6");
  // 0.2 — Turn count
  console.assert(MAX_TURNS === 10, "MAX_TURNS must be 10");
  console.assert(seasonIndexForTurns(0)  === 0, "turn 0 → Spring");
  console.assert(seasonIndexForTurns(3)  === 1, "turn 3 → Summer");
  console.assert(seasonIndexForTurns(6)  === 2, "turn 6 → Autumn");
  console.assert(seasonIndexForTurns(9)  === 3, "turn 9 → Winter");
  console.assert(seasonIndexForTurns(10) === 3, "turn 10 → still Winter");
}
