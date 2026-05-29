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
  let after = null;
  let before = null;
  for (const s of series) {
    if (s.ts >= ts) {
      if (after === null || s.ts < after.ts) after = s;
    } else {
      if (before === null || s.ts > before.ts) before = s;
    }
  }
  if (after && after.ts - ts <= toleranceMs) return after.price;
  if (before && ts - before.ts <= toleranceMs) return before.price;
  // Beyond tolerance: still return the closest available rather than null only
  // if something exists; callers that need strictness pass a small tolerance.
  if (after) return after.price;
  if (before) return before.price;
  return null;
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
