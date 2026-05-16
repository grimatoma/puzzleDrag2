import { UPGRADE_THRESHOLDS, RESOURCE_CAP_BASE, RESOURCE_CAP_GRANARY } from "./constants.js";
import { locBuilt } from "./locBuilt.js";

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/**
 * WCAG relative luminance for a 24-bit hex colour (e.g. 0xa8c769 or 0x00RRGGBB).
 * Only the lowest 24 bits (RGB) are used; any alpha byte is ignored.
 */
function relativeLuminance(hex) {
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8)  & 0xff) / 255;
  const b = ( hex        & 0xff) / 255;
  const lin = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * WCAG contrast ratio between two numeric hex colours.
 * Returns a value ≥ 1; 7 = maximum (black on white).
 * @param {number} hexA - e.g. 0xa8c769
 * @param {number} hexB - e.g. 0x9b6b3e
 * @returns {number}
 */
export function contrastRatio(hexA, hexB) {
  const L1 = relativeLuminance(hexA);
  const L2 = relativeLuminance(hexB);
  const lighter = Math.max(L1, L2);
  const darker  = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns true if tiles a and b are orthogonally adjacent on the grid.
 * @param {{ row: number, col: number }} a
 * @param {{ row: number, col: number }} b
 * @returns {boolean}
 */
export function isAdjacent(a, b) {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

/**
 * Returns true if the tile can extend the current chain (same resource key,
 * not already in chain). Stub: always returns true when chain is empty.
 * @param {Array<{key: string}>} chain
 * @param {{ key: string }} tile
 * @returns {boolean}
 */
export function canExtendChain(chain, tile) {
  if (chain.length === 0) return true;
  return chain[0].key === tile.key;
}

export function upgradeCountForChain(chainLength, resourceKey, thresholdMap = UPGRADE_THRESHOLDS) {
  const t = thresholdMap[resourceKey];
  if (!t) return 0; // terminal or unknown resource
  return Math.floor(chainLength / t);
}

/**
 * Sample a resource key from a weighted pool (the pool uses repetition for
 * weighting — a key appearing 3× is 3× as likely).
 * @param {string[]} pool - array of resource keys (with repetition for weighting)
 * @param {() => number} [rand] - optional RNG (defaults to Math.random)
 */
export function rollResource(pool, rand = Math.random) {
  return pool[Math.floor(rand() * pool.length)];
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
  const built = state ? locBuilt(state) : {};
  return (built?.granary || state?.built?.granary) ? RESOURCE_CAP_GRANARY : RESOURCE_CAP_BASE;
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
