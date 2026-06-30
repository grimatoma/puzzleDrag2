import { test } from "node:test";
import assert from "node:assert/strict";
import { diffRecommendations } from "../src/analysis/mindChange.js";

function byType(events, type) {
  return events.filter((e) => e.change_type === type);
}

test("detects added tickers", () => {
  const prev = { p1: [{ ticker: "AAPL", stance: "buy" }] };
  const curr = { p1: [{ ticker: "AAPL", stance: "buy" }, { ticker: "NVDA", stance: "buy" }] };
  const events = diffRecommendations(prev, curr);
  const added = byType(events, "added");
  assert.equal(added.length, 1);
  assert.equal(added[0].ticker, "NVDA");
  assert.equal(added[0].new_stance, "buy");
  assert.equal(added[0].prev_stance, null);
});

test("detects removed tickers", () => {
  const prev = { p1: [{ ticker: "AAPL", stance: "buy" }, { ticker: "TSLA", stance: "buy" }] };
  const curr = { p1: [{ ticker: "AAPL", stance: "buy" }] };
  const removed = byType(diffRecommendations(prev, curr), "removed");
  assert.equal(removed.length, 1);
  assert.equal(removed[0].ticker, "TSLA");
  assert.equal(removed[0].prev_stance, "buy");
  assert.equal(removed[0].new_stance, null);
});

test("detects stance flip", () => {
  const prev = { p1: [{ ticker: "AAPL", stance: "buy" }] };
  const curr = { p1: [{ ticker: "AAPL", stance: "avoid" }] };
  const flips = byType(diffRecommendations(prev, curr), "stance_flip");
  assert.equal(flips.length, 1);
  assert.equal(flips[0].ticker, "AAPL");
  assert.equal(flips[0].prev_stance, "buy");
  assert.equal(flips[0].new_stance, "avoid");
});

test("no change yields no events", () => {
  const prev = { p1: [{ ticker: "AAPL", stance: "buy" }, { ticker: "NVDA", stance: "avoid" }] };
  const curr = { p1: [{ ticker: "AAPL", stance: "buy" }, { ticker: "NVDA", stance: "avoid" }] };
  assert.deepEqual(diffRecommendations(prev, curr), []);
});

test("changes are scoped per prompt key", () => {
  const prev = { p1: [{ ticker: "AAPL", stance: "buy" }], p2: [{ ticker: "TSLA", stance: "buy" }] };
  const curr = { p1: [{ ticker: "AAPL", stance: "buy" }], p2: [{ ticker: "NVDA", stance: "buy" }] };
  const events = diffRecommendations(prev, curr);
  // p2 lost TSLA (removed) and gained NVDA (added); p1 unchanged.
  assert.equal(events.length, 2);
  assert.ok(events.every((e) => e.prompt_key === "p2"));
  assert.equal(byType(events, "added")[0].ticker, "NVDA");
  assert.equal(byType(events, "removed")[0].ticker, "TSLA");
});

test("new prompt key (no prior) only yields added", () => {
  const prev = {};
  const curr = { p1: [{ ticker: "AAPL", stance: "buy" }] };
  const events = diffRecommendations(prev, curr);
  assert.equal(events.length, 1);
  assert.equal(events[0].change_type, "added");
});

test("dedupes within a prompt keeping first occurrence stance", () => {
  const prev = {};
  const curr = { p1: [{ ticker: "AAPL", stance: "buy" }, { ticker: "AAPL", stance: "avoid" }] };
  const added = byType(diffRecommendations(prev, curr), "added");
  assert.equal(added.length, 1);
  assert.equal(added[0].new_stance, "buy");
});
