// Deterministic PRNG + a scoped Math.random override for the playtest harness.
//
// Why this exists: CHAIN_COLLECTED calls `Math.random()` directly for
// hazard/rat/ore/pearl spawns (src/state.ts ~496/504/516), and
// createInitialState() seeds saveSeed/marketSeed from Math.random too. To make a
// whole run byte-reproducible we override Math.random with a seeded stream for
// the *entire* run (including state construction) and restore it afterward.
//
// Pure + dependency-free. No game logic lives here.

// mulberry32 lives in the shared, bundle-neutral src/rng.ts; re-exported here so
// existing playtest imports keep working. (Health review #13.)
export { mulberry32 } from "../rng.js";
import { mulberry32 } from "../rng.js";

/**
 * Run `fn` with `Math.random` replaced by a fresh seeded stream, restoring the
 * real `Math.random` in a `finally` so a thrown error can never leak the
 * override into the rest of the process. The seeded function is also passed to
 * `fn` so callers can use the *same* stream for their own board sampling
 * (keeping every source of randomness on one deterministic clock).
 */
export function withSeededRandom<T>(seed: number, fn: (rng: () => number) => T): T {
  const rng = mulberry32(seed);
  const realRandom = Math.random;
  Math.random = rng;
  try {
    return fn(rng);
  } finally {
    Math.random = realRandom;
  }
}

/** Pick a uniformly random element of `arr` using `rng`. */
export function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}
