// Pure metric helpers over price series and recommendation data.
//
// A "series" is an array of { price, ts } sorted ascending by ts (epoch-ms).

const HOUR_MS = 60 * 60 * 1000;

/**
 * priceAt(series, ts, toleranceMs?) -> number | null
 * Nearest sample at/after ts. Falls back to nearest sample BEFORE ts when no
 * later sample exists within tolerance (default 24h).
 */
export function priceAt(series, ts, toleranceMs = 24 * HOUR_MS) {
  if (!Array.isArray(series) || series.length === 0) return null;
  // Binary search for the first index whose ts >= target ("after"); the element
  // immediately preceding it is the nearest sample strictly before ("before").
  // The series is sorted ascending by ts. Preserves the exact original
  // semantics: nearest at/after within tolerance, else nearest before within
  // tolerance, else closest available, else null.
  let lo = 0;
  let hi = series.length; // [lo, hi) candidate range for first ts >= target
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (series[mid].ts >= ts) hi = mid;
    else lo = mid + 1;
  }
  const after = lo < series.length ? series[lo] : null;
  const before = lo > 0 ? series[lo - 1] : null;

  if (after && after.ts - ts <= toleranceMs) return after.price;
  if (before && ts - before.ts <= toleranceMs) return before.price;
  // Beyond tolerance: still return the closest available rather than null only
  // if something exists; callers that need strictness pass a small tolerance.
  if (after) return after.price;
  if (before) return before.price;
  return null;
}

/**
 * downsample(series, maxPoints) -> series
 * Reduce a sorted series to at most maxPoints using a uniform stride. The first
 * and last points are always retained so the chart endpoints are accurate.
 * Pure; does not mutate the input.
 */
export function downsample(series, maxPoints = 600) {
  if (!Array.isArray(series)) return [];
  const n = series.length;
  if (maxPoints < 2) return n ? [series[0]] : [];
  if (n <= maxPoints) return series.slice();
  const stride = (n - 1) / (maxPoints - 1);
  const out = [];
  let lastIdx = -1;
  for (let i = 0; i < maxPoints; i++) {
    const idx = i === maxPoints - 1 ? n - 1 : Math.round(i * stride);
    if (idx !== lastIdx) {
      out.push(series[idx]);
      lastIdx = idx;
    }
  }
  // Guarantee the final point is the true last sample.
  if (out[out.length - 1] !== series[n - 1]) out.push(series[n - 1]);
  return out;
}

/**
 * windowChangePct(series, eventTs, windowHours) -> number | null
 * Percent change from price at eventTs to price at eventTs + windowHours.
 */
export function windowChangePct(series, eventTs, windowHours) {
  const p0 = priceAt(series, eventTs);
  const p1 = priceAt(series, eventTs + windowHours * HOUR_MS);
  if (p0 === null || p1 === null || p0 === 0) return null;
  return ((p1 - p0) / p0) * 100;
}

/**
 * detectSpike(series, eventTs, windowsHours, thresholdPct)
 *   -> { maxChangePct, spike, byWindow: { [hours]: pct|null } }
 * A spike is an UPWARD move >= thresholdPct in any of the given windows.
 */
export function detectSpike(series, eventTs, windowsHours = [1, 4, 24], thresholdPct = 2) {
  const byWindow = {};
  let maxChangePct = null;
  for (const w of windowsHours) {
    const pct = windowChangePct(series, eventTs, w);
    byWindow[w] = pct;
    if (pct !== null && (maxChangePct === null || pct > maxChangePct)) {
      maxChangePct = pct;
    }
  }
  const spike = maxChangePct !== null && maxChangePct >= thresholdPct;
  return { maxChangePct, spike, byWindow };
}

/**
 * leaderboard(recRows) -> aggregated per-ticker stats.
 * recRows: [{ ticker, prompt_key, created_at }]
 */
export function leaderboard(recRows = []) {
  const map = new Map();
  for (const r of recRows) {
    const t = r.ticker;
    let e = map.get(t);
    if (!e) {
      e = { ticker: t, recCount: 0, prompts: new Set(), firstSeen: r.created_at, lastSeen: r.created_at };
      map.set(t, e);
    }
    e.recCount += 1;
    e.prompts.add(r.prompt_key);
    if (r.created_at < e.firstSeen) e.firstSeen = r.created_at;
    if (r.created_at > e.lastSeen) e.lastSeen = r.created_at;
  }
  return Array.from(map.values())
    .map((e) => ({
      ticker: e.ticker,
      recCount: e.recCount,
      promptCount: e.prompts.size,
      firstSeen: e.firstSeen,
      lastSeen: e.lastSeen,
    }))
    .sort((a, b) => b.recCount - a.recCount || a.ticker.localeCompare(b.ticker));
}

/**
 * summary(counts, mceWithSpike) -> overview metrics including spike hit-rate.
 * @param {object} counts { runs, recommendations, uniqueTickers, mindChangeEvents }
 * @param {Array<{spike:boolean}>} evaluatedEvents events that had a measurable window
 */
export function summary(counts = {}, evaluatedEvents = []) {
  const evaluated = evaluatedEvents.length;
  const hits = evaluatedEvents.filter((e) => e.spike).length;
  return {
    runs: counts.runs || 0,
    recommendations: counts.recommendations || 0,
    uniqueTickers: counts.uniqueTickers || 0,
    mindChangeEvents: counts.mindChangeEvents || 0,
    spikeEvaluated: evaluated,
    spikeHits: hits,
    spikeHitRate: evaluated ? hits / evaluated : null,
  };
}
