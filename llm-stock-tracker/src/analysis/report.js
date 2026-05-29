// DB-backed report helpers that compose the pure metric functions in metrics.js.

import { detectSpike, summary as summaryFn, downsample } from "./metrics.js";
import {
  aggregateForwardReturns,
  computeBaseline,
  leadTimeToPeak,
  aggregateLeadTime,
} from "./forwardReturn.js";

const HOUR_MS = 60 * 60 * 1000;
const MAX_CHART_POINTS = 600;

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

// Memoize the summary keyed on db.counts() so it isn't recomputed on every
// request. The summary only depends on runs/recommendations/mindChangeEvents
// (+ prices via spike evaluation); we key on the count tuple and invalidate
// whenever any count changes.
let _summaryCache = null; // { key, value }
function countsKey(counts) {
  return `${counts.runs}|${counts.recommendations}|${counts.mindChangeEvents}|${counts.signals}`;
}

export function buildSummary(db, config) {
  const counts = db.counts();
  const key = countsKey(counts);
  if (_summaryCache && _summaryCache.key === key) return _summaryCache.value;
  const evaluated = evaluateAllSpikes(db, config);
  const value = summaryFn(counts, evaluated);
  _summaryCache = { key, value };
  return value;
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
    // Spike windows use the FULL series for accuracy (computed above); the chart
    // payload is downsampled to keep the response small (~600 points, endpoints
    // preserved).
    priceSeries: downsample(series, MAX_CHART_POINTS),
    priceSeriesPoints: series.length,
    recEvents,
    mindChanges,
    spikeWindows,
    spikeConfig: spikeCfg,
  };
}

/**
 * buildAnalysis(db, config, { simulated }) -> forward-return / thesis analysis.
 * Composes the STRICT (no-look-ahead) forward-return helpers over every
 * "added" mind-change event. Reuses one price series per ticker.
 */
export function buildAnalysis(db, config, { simulated = false } = {}) {
  const spikeCfg = config.spike || { thresholdPct: 2, windowsHours: [1, 4, 24] };
  const windows = spikeCfg.windowsHours;
  const maxWindow = windows.length ? Math.max(...windows) : 24;
  const tolMs = HOUR_MS; // a genuine sample must sit within 1h of each endpoint

  const events = db.recentMindChanges(10000).filter((e) => e.change_type === "added");

  const seriesByTicker = new Map();
  const eventTimesByTicker = new Map();
  for (const ev of events) {
    if (!seriesByTicker.has(ev.ticker)) seriesByTicker.set(ev.ticker, db.priceSeries(ev.ticker));
    let times = eventTimesByTicker.get(ev.ticker);
    if (!times) {
      times = [];
      eventTimesByTicker.set(ev.ticker, times);
    }
    times.push(ev.ts);
  }

  const { overall, perPrompt } = aggregateForwardReturns(events, seriesByTicker, windows, tolMs);

  const baseline = computeBaseline(seriesByTicker, windows, tolMs, {
    sampleStride: 8,
    excludeNearEventMs: maxWindow * HOUR_MS,
    eventTimesByTicker,
  });

  // Lift = event avgPct - baseline avgPct, per window.
  const perPromptWithLift = perPrompt.map((p) => {
    const liftVsBaseline = {};
    for (const w of windows) {
      const ev = p.byWindow[w]?.avgPct;
      const bl = baseline.byWindow[w];
      liftVsBaseline[w] = ev !== null && ev !== undefined && bl !== null && bl !== undefined ? ev - bl : null;
    }
    return { ...p, liftVsBaseline };
  });
  // Rank by lift at the largest window (descending; nulls last).
  const big = maxWindow;
  perPromptWithLift.sort((a, b) => {
    const la = a.liftVsBaseline[big];
    const lb = b.liftVsBaseline[big];
    if (la === null && lb === null) return 0;
    if (la === null) return 1;
    if (lb === null) return -1;
    return lb - la;
  });

  // Lead time to peak across all events.
  const leadHours = [];
  for (const ev of events) {
    const lt = leadTimeToPeak(seriesByTicker.get(ev.ticker), ev.ts, maxWindow, tolMs);
    if (lt !== null) leadHours.push(lt);
  }
  const leadTime = aggregateLeadTime(leadHours);

  return {
    windows,
    overall,
    baseline,
    perPrompt: perPromptWithLift,
    leadTime,
    simulated: Boolean(simulated),
    generatedAt: Date.now(),
  };
}

export function buildMindChangeTimeline(db, limit = 200) {
  return db.recentMindChanges(limit);
}
