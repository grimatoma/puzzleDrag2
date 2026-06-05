import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSignals, pivotByTicker, shouldEmit } from "../src/analysis/signals.js";

const HOUR = 60 * 60 * 1000;
const T0 = 1_700_000_000_000;

function recs(...entries) {
  // entries: ["promptKey", "ticker", "stance"]
  const byPrompt = {};
  for (const [pk, ticker, stance] of entries) {
    (byPrompt[pk] ||= []).push({ ticker, stance, rank: 1 });
  }
  return byPrompt;
}

const baseConfig = {
  consensus: { threshold: 3, strongAddPrompts: 2 },
  prompts: [
    { key: "p1", active: true },
    { key: "p2", active: true },
    { key: "p3", active: true },
    { key: "p4", active: true },
  ],
};

test("netStance: buy/avoid/mixed/neutral", () => {
  const m = pivotByTicker(
    recs(
      ["p1", "BUYY", "buy"], ["p2", "BUYY", "buy"],
      ["p1", "AVD", "avoid"], ["p2", "AVD", "avoid"],
      ["p1", "MIX", "buy"], ["p2", "MIX", "avoid"],
      ["p1", "NEU", "neutral"], ["p2", "NEU", "neutral"],
    ),
  );
  assert.equal(m.get("BUYY").netStance, "buy");
  assert.equal(m.get("AVD").netStance, "avoid");
  assert.equal(m.get("MIX").netStance, "mixed");
  assert.equal(m.get("NEU").netStance, "neutral");
});

test("NEW_CONSENSUS fires on crossing (below -> >= threshold)", () => {
  const prev = recs(["p1", "NVDA", "buy"], ["p2", "NVDA", "buy"]); // count 2 (<3)
  const curr = recs(["p1", "NVDA", "buy"], ["p2", "NVDA", "buy"], ["p3", "NVDA", "buy"]); // count 3
  const sigs = computeSignals({
    byPromptForRun: curr,
    prevByPromptForRun: prev,
    addedEventsForRun: [],
    config: baseConfig,
    now: T0,
    firstEverTickers: new Set(),
  });
  const nc = sigs.filter((s) => s.signalType === "NEW_CONSENSUS");
  assert.equal(nc.length, 1);
  assert.equal(nc[0].ticker, "NVDA");
  assert.equal(nc[0].promptCount, 3);
  assert.equal(nc[0].netStance, "buy");
});

test("NEW_CONSENSUS does NOT re-fire while consensus persists (edge-trigger)", () => {
  const atThreshold = recs(["p1", "NVDA", "buy"], ["p2", "NVDA", "buy"], ["p3", "NVDA", "buy"]);
  // prev already at/above threshold -> no crossing
  const sigs = computeSignals({
    byPromptForRun: atThreshold,
    prevByPromptForRun: atThreshold,
    addedEventsForRun: [],
    config: baseConfig,
    now: T0,
  });
  assert.equal(sigs.filter((s) => s.signalType === "NEW_CONSENSUS").length, 0);
});

test("NEW_CONSENSUS does not fire on the first run (no prev)", () => {
  const curr = recs(["p1", "NVDA", "buy"], ["p2", "NVDA", "buy"], ["p3", "NVDA", "buy"]);
  const sigs = computeSignals({
    byPromptForRun: curr,
    prevByPromptForRun: null,
    addedEventsForRun: [],
    config: baseConfig,
    now: T0,
  });
  assert.equal(sigs.filter((s) => s.signalType === "NEW_CONSENSUS").length, 0);
});

test("STRONG_ADD fires when added across >= strongAddPrompts distinct prompts", () => {
  const curr = recs(["p1", "TSLA", "buy"], ["p2", "TSLA", "buy"]);
  const added = [
    { ticker: "TSLA", prompt_key: "p1" },
    { ticker: "TSLA", prompt_key: "p2" },
    { ticker: "AMD", prompt_key: "p1" }, // only one prompt -> no STRONG_ADD
  ];
  const sigs = computeSignals({
    byPromptForRun: curr,
    prevByPromptForRun: {},
    addedEventsForRun: added,
    config: baseConfig,
    now: T0,
  });
  const sa = sigs.filter((s) => s.signalType === "STRONG_ADD");
  assert.equal(sa.length, 1);
  assert.equal(sa[0].ticker, "TSLA");
  assert.ok(sa[0].promptKeys.includes("p1") && sa[0].promptKeys.includes("p2"));
});

test("STRONG_ADD does not fire below threshold", () => {
  const added = [{ ticker: "AMD", prompt_key: "p1" }];
  const sigs = computeSignals({
    byPromptForRun: recs(["p1", "AMD", "buy"]),
    prevByPromptForRun: {},
    addedEventsForRun: added,
    config: baseConfig,
    now: T0,
  });
  assert.equal(sigs.filter((s) => s.signalType === "STRONG_ADD").length, 0);
});

test("freshPick flag set when ticker is first-ever", () => {
  const prev = recs(["p1", "NVDA", "buy"], ["p2", "NVDA", "buy"]);
  const curr = recs(["p1", "NVDA", "buy"], ["p2", "NVDA", "buy"], ["p3", "NVDA", "buy"]);
  const sigs = computeSignals({
    byPromptForRun: curr,
    prevByPromptForRun: prev,
    addedEventsForRun: [],
    config: baseConfig,
    now: T0,
    firstEverTickers: new Set(["NVDA"]),
  });
  assert.equal(sigs[0].freshPick, true);
  assert.equal(sigs[0].activePromptCount, 4);
});

test("shouldEmit cooldown gate", () => {
  assert.equal(shouldEmit(null, T0, 6 * HOUR), true); // no prior signal
  assert.equal(shouldEmit(T0, T0 + 6 * HOUR, 6 * HOUR), true); // exactly cooldown elapsed
  assert.equal(shouldEmit(T0, T0 + 3 * HOUR, 6 * HOUR), false); // within cooldown
  assert.equal(shouldEmit(T0, T0 + HOUR, 0), true); // zero cooldown always emits
});
