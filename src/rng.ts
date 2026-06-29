// Shared deterministic PRNG. Pure + dependency-free — must stay free of any
// game/Phaser/town imports so it is safe to pull into every bundle (the
// playtest harness, the React town-map generators, and the Phaser town/map
// scenes all import it). Health review #13 consolidated six byte-identical
// copies of the mulberry32 stepping core into this one definition; each caller
// keeps its own seed derivation and the output stream is unchanged.

/**
 * mulberry32 — a tiny, fast, well-distributed 32-bit PRNG. Same seed → same
 * sequence of floats in [0, 1). The leading `a |= 0` is a no-op for an integer
 * seed (the post-add `| 0` already coerces), so callers that fold it into the
 * first step produce an identical stream.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
