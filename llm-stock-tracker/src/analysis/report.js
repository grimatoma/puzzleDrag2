// DB-backed report helpers that compose the pure metric functions in metrics.js.

import { detectSpike, summary as summaryFn } from "./metrics.js";

/**
 * Evaluate spikes for every mind-change "added" event using stored prices.
 * Returns the list of evaluated events (only those with a measurable window).
 */
export function evaluateAllSpikes(db, config) {
  const spikeCfg = config.spike || { thresholdPct: 2, windowsHours: [1, 4, 24] };
  const events = db.recentMindChanges(10000).filter((e) => e.change_type === "added");
  const seriesCache = new Map();
  const evaluated = [];
  for (const ev of events) {
    let series = seriesCache.get(ev.ticker);
    if (!series) {
      series = db.priceSeries(ev.ticker);
      seriesCache.set(ev.ticker, series);
    }
    const res = detectSpike(series, ev.ts, spikeCfg.windowsHours, spikeCfg.thresholdPct);
    // Only count events where at least one window had a measurable change.
    const measurable = Object.values(res.byWindow).some((v) => v !== null);
    if (measurable) {
      evaluated.push({ ...ev, ...res });
    }
  }
  return evaluated;
}

export function buildSummary(db, config) {
  const counts = db.counts();
  const evaluated = evaluateAllSpikes(db, config);
  return summaryFn(counts, evaluated);
}

export function buildLeaderboard(db) {
  // db.leaderboard() already aggregates in SQL; reshape to the API contract.
  return db.leaderboard().map((r) => ({
    ticker: r.ticker,
    recCount: r.rec_count,
    promptCount: r.prompt_count,
    firstSeen: r.first_seen,
    lastSeen: r.last_seen,
  }));
}

export function buildTickerDetail(db, config, symbol) {
  const sym = String(symbol).toUpperCase();
  const spikeCfg = config.spike || { thresholdPct: 2, windowsHours: [1, 4, 24] };
  const series = db.priceSeries(sym);
  const recEvents = db.recEventsForTicker(sym);
  const mindChanges = db.mindChangesForTicker(sym);

  const spikeWindows = mindChanges
    .filter((e) => e.change_type === "added")
    .map((e) => ({
      ts: e.ts,
      promptKey: e.prompt_key,
      ...detectSpike(series, e.ts, spikeCfg.windowsHours, spikeCfg.thresholdPct),
    }));

  return {
    ticker: sym,
    priceSeries: series,
    recEvents,
    mindChanges,
    spikeWindows,
    spikeConfig: spikeCfg,
  };
}

export function buildMindChangeTimeline(db, limit = 200) {
  return db.recentMindChanges(limit);
}
