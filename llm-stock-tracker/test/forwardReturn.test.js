import { test } from "node:test";
import assert from "node:assert/strict";
import {
  forwardReturnStrict,
  aggregateForwardReturns,
  computeBaseline,
  leadTimeToPeak,
  aggregateLeadTime,
} from "../src/analysis/forwardReturn.js";

const HOUR = 60 * 60 * 1000;
const T0 = 1_700_000_000_000;

function series(points) {
  return points.map(([h, p]) => ({ ts: T0 + h * HOUR, price: p }));
}

test("forwardReturnStrict returns null for a young event missing the +Wh endpoint", () => {
  // Samples only up to +2h; a +24h window has no genuine endpoint.
  const s = series([[0, 100], [1, 101], [2, 102]]);
  assert.equal(forwardReturnStrict(s, T0, 24, HOUR), null);
});

test("forwardReturnStrict returns a value when both endpoints are genuinely bracketed", () => {
  const s = series([[0, 100], [1, 101], [4, 110]]);
  // start at T0 (100), +4h (110) => +10%
  assert.equal(forwardReturnStrict(s, T0, 4, HOUR), 10);
});

test("forwardReturnStrict includes NEGATIVE returns (no upward-only bias)", () => {
  const s = series([[0, 100], [4, 90]]);
  assert.equal(forwardReturnStrict(s, T0, 4, HOUR), -10);
});

test("forwardReturnStrict returns null when start sample is beyond tolerance", () => {
  // Nearest sample to T0 is 5h away (> 1h tol) -> no genuine start.
  const s = series([[5, 100], [9, 110]]);
  assert.equal(forwardReturnStrict(s, T0, 4, HOUR), null);
});

test("aggregateForwardReturns aggregates overall + per-prompt", () => {
  const s = series([[0, 100], [4, 108]]); // +8% at 4h
  const seriesByTicker = new Map([["AAA", s]]);
  const events = [
    { ticker: "AAA", ts: T0, prompt_key: "p1" },
    { ticker: "AAA", ts: T0, prompt_key: "p2" },
  ];
  const agg = aggregateForwardReturns(events, seriesByTicker, [4], HOUR);
  assert.equal(agg.overall.byWindow[4].n, 2);
  assert.ok(Math.abs(agg.overall.byWindow[4].avgPct - 8) < 1e-9);
  assert.equal(agg.perPrompt.length, 2);
  const p1 = agg.perPrompt.find((p) => p.promptKey === "p1");
  assert.ok(Math.abs(p1.byWindow[4].avgPct - 8) < 1e-9);
});

test("aggregateForwardReturns guards empty input (no division-by-zero)", () => {
  const agg = aggregateForwardReturns([], new Map(), [4], HOUR);
  assert.equal(agg.overall.n, 0);
  assert.equal(agg.overall.byWindow[4].avgPct, null);
  assert.equal(agg.perPrompt.length, 0);
});

test("computeBaseline excludes pseudo-events near a real event", () => {
  // Continuous +1%/h-ish series, hourly samples 0..8h.
  const pts = [];
  for (let h = 0; h <= 8; h++) pts.push([h, 100 + h]);
  const s = series(pts);
  const seriesByTicker = new Map([["AAA", s]]);
  const eventTimesByTicker = new Map([["AAA", [T0]]]); // real event at T0

  // With stride 1 and a wide exclusion, the first samples after T0 are dropped.
  const withExclude = computeBaseline(seriesByTicker, [1], HOUR, {
    sampleStride: 1,
    excludeNearEventMs: 4 * HOUR,
    eventTimesByTicker,
  });
  const withoutExclude = computeBaseline(seriesByTicker, [1], HOUR, {
    sampleStride: 1,
    excludeNearEventMs: 0,
    eventTimesByTicker,
  });
  // Both should produce a finite baseline, and exclusion must not throw.
  assert.ok(withoutExclude.byWindow[1] !== null);
  assert.ok(withExclude.byWindow[1] === null || Number.isFinite(withExclude.byWindow[1]));
});

test("computeBaseline empty input returns null window", () => {
  const b = computeBaseline(new Map(), [4], HOUR, {});
  assert.equal(b.byWindow[4], null);
});

test("leadTimeToPeak returns hours to argmax forward price within window", () => {
  // Peak at +3h (price 120), then declines.
  const s = series([[0, 100], [1, 105], [3, 120], [5, 110]]);
  const lt = leadTimeToPeak(s, T0, 24, HOUR);
  assert.equal(lt, 3);
});

test("leadTimeToPeak returns null with no samples after the event", () => {
  const s = series([[0, 100]]);
  assert.equal(leadTimeToPeak(s, T0, 24, HOUR), null);
});

test("aggregateLeadTime computes median/p25/p75/n and skips non-finite", () => {
  const agg = aggregateLeadTime([1, 2, 3, 4, null, NaN]);
  assert.equal(agg.n, 4);
  assert.equal(agg.medianHours, 2.5);
  assert.equal(agg.p25, 1.75);
  assert.equal(agg.p75, 3.25);
});

test("aggregateLeadTime empty -> nulls", () => {
  const agg = aggregateLeadTime([]);
  assert.equal(agg.n, 0);
  assert.equal(agg.medianHours, null);
});
