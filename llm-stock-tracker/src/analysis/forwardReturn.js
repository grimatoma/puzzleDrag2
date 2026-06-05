// Pure forward-return / thesis analysis. STRICT, no look-ahead.
//
// Unlike priceAt (lenient: falls back to the closest available sample even
// beyond tolerance), these helpers REQUIRE genuine samples bracketing both the
// event start and the +Wh endpoint within tolMs. This prevents fabricating
// forward returns for young events whose window has not elapsed yet. Returns
// include NEGATIVE moves (no upward-only bias).

const HOUR_MS = 60 * 60 * 1000;

/**
 * Nearest sample to `ts` within tolMs, or null. Binary search; series sorted
 * ascending by ts. "Genuine" = there really is a sample close to ts.
 */
function nearestStrict(series, ts, tolMs) {
  if (!Array.isArray(series) || series.length === 0) return null;
  let lo = 0;
  let hi = series.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (series[mid].ts >= ts) hi = mid;
    else lo = mid + 1;
  }
  const after = lo < series.length ? series[lo] : null;
  const before = lo > 0 ? series[lo - 1] : null;
  let best = null;
  let bestDist = Infinity;
  if (after) {
    const d = Math.abs(after.ts - ts);
    if (d <= tolMs && d < bestDist) { best = after; bestDist = d; }
  }
  if (before) {
    const d = Math.abs(before.ts - ts);
    if (d <= tolMs && d < bestDist) { best = before; bestDist = d; }
  }
  return best;
}

/**
 * forwardReturnStrict(series, eventTs, windowHours, tolMs) -> pct | null
 * Percent change from a genuine sample at the event to a genuine sample at/after
 * eventTs + windowHours, both within tolMs. Returns null if either is missing.
 */
export function forwardReturnStrict(series, eventTs, windowHours, tolMs = HOUR_MS) {
  const start = nearestStrict(series, eventTs, tolMs);
  if (!start) return null;
  const end = nearestStrict(series, eventTs + windowHours * HOUR_MS, tolMs);
  if (!end) return null;
  if (start.price === 0) return null;
  return ((end.price - start.price) / start.price) * 100;
}

function avg(nums) {
  if (!nums.length) return null;
  let sum = 0;
  for (const n of nums) sum += n;
  return sum / nums.length;
}

/**
 * aggregateForwardReturns(events, seriesByTicker, windowsHours, tolMs)
 *   -> { overall:{ n, byWindow:{[w]:{avgPct,n}} },
 *        perPrompt:[{ promptKey, n, byWindow }] }
 * events: [{ ticker, ts, prompt_key }]
 */
export function aggregateForwardReturns(events = [], seriesByTicker = new Map(), windowsHours = [1, 4, 24], tolMs = HOUR_MS) {
  const get = (t) => (seriesByTicker instanceof Map ? seriesByTicker.get(t) : seriesByTicker[t]) || [];

  const overallByWindow = {};
  for (const w of windowsHours) overallByWindow[w] = [];
  const perPromptMap = new Map();
  const overallEventSeen = new Set(); // count an event in overall.n if any window measured

  for (const ev of events) {
    const series = get(ev.ticker);
    let measuredAny = false;
    for (const w of windowsHours) {
      const r = forwardReturnStrict(series, ev.ts, w, tolMs);
      if (r === null) continue;
      measuredAny = true;
      overallByWindow[w].push(r);
      const pk = ev.prompt_key ?? "(unknown)";
      let p = perPromptMap.get(pk);
      if (!p) {
        p = { promptKey: pk, byWindowVals: {}, events: new Set() };
        for (const ww of windowsHours) p.byWindowVals[ww] = [];
        perPromptMap.set(pk, p);
      }
      p.byWindowVals[w].push(r);
      p.events.add(ev);
    }
    if (measuredAny) overallEventSeen.add(ev);
  }

  const overall = { n: overallEventSeen.size, byWindow: {} };
  for (const w of windowsHours) {
    overall.byWindow[w] = { avgPct: avg(overallByWindow[w]), n: overallByWindow[w].length };
  }

  const perPrompt = Array.from(perPromptMap.values()).map((p) => {
    const byWindow = {};
    for (const w of windowsHours) {
      byWindow[w] = { avgPct: avg(p.byWindowVals[w]), n: p.byWindowVals[w].length };
    }
    return { promptKey: p.promptKey, n: p.events.size, byWindow };
  });

  return { overall, perPrompt };
}

/**
 * computeBaseline(seriesByTicker, windowsHours, tolMs, opts) -> { byWindow:{[w]:avgPct} }
 * Sample each ticker's series at a regular stride as pseudo-events, compute
 * forwardReturnStrict, and average per window. Sample timestamps within
 * excludeNearEventMs AFTER a real event are skipped so the baseline isn't
 * contaminated by the effect being measured.
 *
 * opts: { sampleStride=8 (every Nth sample), excludeNearEventMs=0,
 *         eventTimesByTicker: Map<ticker, number[]> }
 */
export function computeBaseline(
  seriesByTicker = new Map(),
  windowsHours = [1, 4, 24],
  tolMs = HOUR_MS,
  { sampleStride = 8, excludeNearEventMs = 0, eventTimesByTicker = new Map() } = {},
) {
  const entries = seriesByTicker instanceof Map
    ? Array.from(seriesByTicker.entries())
    : Object.entries(seriesByTicker);
  const getEvents = (t) =>
    (eventTimesByTicker instanceof Map ? eventTimesByTicker.get(t) : eventTimesByTicker?.[t]) || [];

  const byWindowVals = {};
  for (const w of windowsHours) byWindowVals[w] = [];
  const stride = Math.max(1, Math.floor(sampleStride) || 1);

  for (const [ticker, series] of entries) {
    if (!Array.isArray(series) || series.length === 0) continue;
    const eventTimes = getEvents(ticker);
    for (let i = 0; i < series.length; i += stride) {
      const ts = series[i].ts;
      // Exclude pseudo-events too close AFTER a real event.
      let contaminated = false;
      if (excludeNearEventMs > 0) {
        for (const et of eventTimes) {
          if (ts >= et && ts - et <= excludeNearEventMs) { contaminated = true; break; }
        }
      }
      if (contaminated) continue;
      for (const w of windowsHours) {
        const r = forwardReturnStrict(series, ts, w, tolMs);
        if (r !== null) byWindowVals[w].push(r);
      }
    }
  }

  const byWindow = {};
  for (const w of windowsHours) byWindow[w] = avg(byWindowVals[w]);
  return { byWindow };
}

/**
 * leadTimeToPeak(series, eventTs, maxWindowHours, tolMs) -> hours | null
 * Hours from the event to the maximum forward price within the window. Requires
 * a genuine start sample within tolMs and at least one sample strictly after the
 * event inside the window. Returns null otherwise.
 */
export function leadTimeToPeak(series, eventTs, maxWindowHours = 24, tolMs = HOUR_MS) {
  if (!Array.isArray(series) || series.length === 0) return null;
  const start = nearestStrict(series, eventTs, tolMs);
  if (!start) return null;
  const endTs = eventTs + maxWindowHours * HOUR_MS;
  let peakPrice = -Infinity;
  let peakTs = null;
  for (const s of series) {
    if (s.ts <= eventTs) continue;
    if (s.ts > endTs) break;
    if (s.price > peakPrice) {
      peakPrice = s.price;
      peakTs = s.ts;
    }
  }
  if (peakTs === null) return null;
  return (peakTs - eventTs) / HOUR_MS;
}

function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

/**
 * aggregateLeadTime(leadHoursList) -> { medianHours, p25, p75, n }
 * Filters out null/non-finite entries.
 */
export function aggregateLeadTime(leadHoursList = []) {
  const vals = leadHoursList.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  return {
    medianHours: quantile(vals, 0.5),
    p25: quantile(vals, 0.25),
    p75: quantile(vals, 0.75),
    n: vals.length,
  };
}
