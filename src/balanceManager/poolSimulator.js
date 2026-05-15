// Pure Monte-Carlo helper for tile drop tables.
//
// Designers tune `seasonDrops` (per-zone, per-season weights keyed by tile
// category). The numbers represent intentions, but actual play produces
// variance around them — a 5% category will land between 2% and 8% in a
// 100-pick session. This helper simulates N random picks against the
// weights and returns the empirical distribution, so designers can sanity-
// check that their numbers translate into reasonable session experiences.
//
// `rng` defaults to Math.random for normal use; tests inject a deterministic
// LCG so the simulated distribution is reproducible.

const DEFAULT_PICK_COUNT = 1000;

function weightTotal(weights) {
  let total = 0;
  for (const v of Object.values(weights || {})) {
    if (Number.isFinite(v) && v > 0) total += v;
  }
  return total;
}

/**
 * Simulate `pickCount` draws against `weights`. Returns
 * `{ counts: { [category]: n }, percents: { [category]: pct }, total }`.
 */
export function simulatePool({ weights, pickCount = DEFAULT_PICK_COUNT, rng = Math.random } = {}) {
  const w = weights && typeof weights === "object" ? weights : {};
  const total = weightTotal(w);
  const counts = {};
  for (const key of Object.keys(w)) counts[key] = 0;
  if (total <= 0 || pickCount <= 0) {
    return { counts, percents: counts, total: 0, picks: 0 };
  }
  const entries = Object.entries(w).filter(([, v]) => Number.isFinite(v) && v > 0);
  const picks = Math.max(1, Math.trunc(pickCount));
  for (let i = 0; i < picks; i += 1) {
    const r = (typeof rng === "function" ? rng() : Math.random()) * total;
    let acc = 0;
    let chosen = entries[0][0];
    for (const [cat, weight] of entries) {
      acc += weight;
      if (r <= acc) { chosen = cat; break; }
    }
    counts[chosen] = (counts[chosen] || 0) + 1;
  }
  const percents = {};
  for (const [k, n] of Object.entries(counts)) percents[k] = picks > 0 ? n / picks : 0;
  return { counts, percents, total, picks };
}

/**
 * For a `seasonDrops` map `{ Spring: {...}, Summer: {...}, ... }`,
 * simulate each season independently. Useful when comparing a zone's four
 * seasons side-by-side.
 */
export function simulateSeasonDrops({ seasonDrops, pickCount = DEFAULT_PICK_COUNT, rng = Math.random } = {}) {
  const out = {};
  for (const [season, weights] of Object.entries(seasonDrops || {})) {
    out[season] = simulatePool({ weights, pickCount, rng });
  }
  return out;
}

/** Variance check — how far did the empirical % drift from the target %? */
export function variancePerCategory(weights, simulationResult) {
  if (!weights || !simulationResult?.percents) return [];
  const total = weightTotal(weights);
  const rows = [];
  for (const [cat, w] of Object.entries(weights)) {
    if (!Number.isFinite(w) || w <= 0) continue;
    const target = total > 0 ? w / total : 0;
    const actual = simulationResult.percents[cat] || 0;
    rows.push({
      category: cat,
      target: Number(target.toFixed(4)),
      actual: Number(actual.toFixed(4)),
      delta: Number((actual - target).toFixed(4)),
    });
  }
  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return rows;
}

/**
 * Tiny deterministic RNG for tests — Mulberry32. Pass any 32-bit seed.
 * Not used at runtime; exported so the test suite can drive simulatePool
 * without flake.
 */
export function deterministicRng(seed = 0xdeadbeef) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
