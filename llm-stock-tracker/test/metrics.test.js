import { test } from "node:test";
import assert from "node:assert/strict";
import {
  priceAt,
  windowChangePct,
  detectSpike,
  leaderboard,
  summary,
  downsample,
} from "../src/analysis/metrics.js";

const HOUR = 60 * 60 * 1000;
const T0 = 1_700_000_000_000;

function series(points) {
  // points: [[hourOffset, price], ...]
  return points.map(([h, p]) => ({ ts: T0 + h * HOUR, price: p }));
}

test("priceAt returns nearest sample at/after ts", () => {
  const s = series([[0, 100], [1, 110], [2, 120]]);
  assert.equal(priceAt(s, T0), 100);
  // exactly between 1h and 2h -> nearest at/after is 2h
  assert.equal(priceAt(s, T0 + 1.5 * HOUR), 120);
});

test("priceAt falls back to nearest before when no later sample", () => {
  const s = series([[0, 100], [1, 110]]);
  assert.equal(priceAt(s, T0 + 5 * HOUR), 110);
});

test("priceAt returns null for empty series", () => {
  assert.equal(priceAt([], T0), null);
});

test("windowChangePct computes percent move over window", () => {
  const s = series([[0, 100], [1, 105], [4, 110]]);
  // from t0 (100) to t0+1h (105) => +5%
  assert.equal(windowChangePct(s, T0, 1), 5);
  // from t0 (100) to t0+4h (110) => +10%
  assert.equal(windowChangePct(s, T0, 4), 10);
});

test("detectSpike returns spike=true when a window exceeds threshold (bump series)", () => {
  // flat then a +6% bump within 4h
  const s = series([[0, 100], [1, 100.5], [2, 103], [4, 106]]);
  const res = detectSpike(s, T0, [1, 4, 24], 2);
  assert.equal(res.spike, true);
  assert.ok(res.maxChangePct >= 6 - 0.001);
  assert.ok(res.byWindow[4] >= 6 - 0.001);
});

test("detectSpike returns spike=false on flat series", () => {
  const s = series([[0, 100], [1, 100.1], [4, 100.2], [24, 100.3]]);
  const res = detectSpike(s, T0, [1, 4, 24], 2);
  assert.equal(res.spike, false);
  assert.ok(res.maxChangePct < 2);
});

test("leaderboard aggregates rec count, prompt count, first/last seen", () => {
  const rows = [
    { ticker: "NVDA", prompt_key: "p1", created_at: T0 },
    { ticker: "NVDA", prompt_key: "p2", created_at: T0 + HOUR },
    { ticker: "NVDA", prompt_key: "p1", created_at: T0 + 2 * HOUR },
    { ticker: "AAPL", prompt_key: "p1", created_at: T0 + HOUR },
  ];
  const lb = leaderboard(rows);
  assert.equal(lb[0].ticker, "NVDA");
  assert.equal(lb[0].recCount, 3);
  assert.equal(lb[0].promptCount, 2);
  assert.equal(lb[0].firstSeen, T0);
  assert.equal(lb[0].lastSeen, T0 + 2 * HOUR);
  assert.equal(lb[1].ticker, "AAPL");
  assert.equal(lb[1].recCount, 1);
});

test("summary computes spike hit-rate", () => {
  const counts = { runs: 3, recommendations: 12, uniqueTickers: 5, mindChangeEvents: 4 };
  const evaluated = [{ spike: true }, { spike: false }, { spike: true }, { spike: true }];
  const s = summary(counts, evaluated);
  assert.equal(s.runs, 3);
  assert.equal(s.spikeEvaluated, 4);
  assert.equal(s.spikeHits, 3);
  assert.equal(s.spikeHitRate, 0.75);
});

test("summary hit-rate is null with no evaluated events", () => {
  const s = summary({ runs: 1 }, []);
  assert.equal(s.spikeHitRate, null);
});

test("binary-search priceAt matches nearest at/after, before fallback, and closest-beyond-tolerance", () => {
  const s = series([[0, 100], [1, 110], [2, 120], [10, 200]]);
  // at/after within tolerance
  assert.equal(priceAt(s, T0 + 0.5 * HOUR), 110);
  // exact hit
  assert.equal(priceAt(s, T0 + 2 * HOUR), 120);
  // no later sample within range but a before exists, tiny tolerance -> closest available
  assert.equal(priceAt(s, T0 + 11 * HOUR, HOUR), 200);
  // before-fallback: target after last sample, generous tolerance
  assert.equal(priceAt(s, T0 + 10.5 * HOUR), 200);
});

test("downsample caps to maxPoints and always keeps first + last", () => {
  const pts = [];
  for (let h = 0; h < 5000; h++) pts.push([h, 100 + h]);
  const s = series(pts);
  const ds = downsample(s, 600);
  assert.ok(ds.length <= 600, `expected <=600, got ${ds.length}`);
  assert.equal(ds[0].ts, s[0].ts);
  assert.equal(ds[ds.length - 1].ts, s[s.length - 1].ts);
  // strictly ascending ts preserved
  for (let i = 1; i < ds.length; i++) assert.ok(ds[i].ts > ds[i - 1].ts);
});

test("downsample returns the series unchanged when already small", () => {
  const s = series([[0, 100], [1, 101], [2, 102]]);
  const ds = downsample(s, 600);
  assert.deepEqual(ds, s);
});

test("downsample handles empty + tiny maxPoints", () => {
  assert.deepEqual(downsample([], 600), []);
  const s = series([[0, 100], [1, 101]]);
  assert.equal(downsample(s, 1).length, 1);
  assert.equal(downsample(s, 1)[0].ts, s[0].ts);
});
