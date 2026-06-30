import { test } from "node:test";
import assert from "node:assert/strict";
import { extractTickers, STOPWORDS } from "../src/parser/tickerParser.js";

const UNIVERSE = ["AAPL", "NVDA", "MSFT", "TSLA", "AMZN", "GOOGL", "META", "AMD", "PLTR"];

test("extracts cashtags", () => {
  const r = extractTickers("I like $AAPL and $NVDA right now.", { universe: UNIVERSE });
  const syms = r.map((x) => x.ticker);
  assert.deepEqual(syms, ["AAPL", "NVDA"]);
});

test("extracts Name (TICKER) pattern", () => {
  const r = extractTickers("Consider Apple (AAPL) and Tesla (TSLA).", { universe: UNIVERSE });
  assert.deepEqual(r.map((x) => x.ticker), ["AAPL", "TSLA"]);
});

test("bare tokens only accepted when in universe", () => {
  const r = extractTickers("Buy NVDA but not ZZZZ.", { universe: UNIVERSE });
  assert.deepEqual(r.map((x) => x.ticker), ["NVDA"]);
});

test("rejects stopwords even as cashtag-like uppercase", () => {
  const r = extractTickers("THE CEO of the ETF said BUY now. USA USD.", { universe: UNIVERSE });
  assert.equal(r.length, 0);
  // sanity: stopword set actually contains these
  for (const w of ["THE", "CEO", "ETF", "BUY", "USA", "USD"]) assert.ok(STOPWORDS.has(w));
});

test("detects buy stance", () => {
  const r = extractTickers("I'm very bullish on Nvidia (NVDA), a strong buy.", { universe: UNIVERSE });
  assert.equal(r[0].ticker, "NVDA");
  assert.equal(r[0].stance, "buy");
});

test("detects avoid stance", () => {
  const r = extractTickers("I would avoid Tesla (TSLA), it looks bearish.", { universe: UNIVERSE });
  assert.equal(r[0].ticker, "TSLA");
  assert.equal(r[0].stance, "avoid");
});

test("neutral when no stance words nearby", () => {
  const r = extractTickers("The company (MSFT) reported earnings.", { universe: UNIVERSE });
  assert.equal(r[0].ticker, "MSFT");
  assert.equal(r[0].stance, "neutral");
});

test("dedupes per ticker and ranks by first appearance", () => {
  const r = extractTickers("$AAPL is great. Apple (AAPL) again. Then $NVDA.", { universe: UNIVERSE });
  assert.deepEqual(r.map((x) => x.ticker), ["AAPL", "NVDA"]);
  assert.equal(r[0].rank, 1);
  assert.equal(r[1].rank, 2);
});

test("cashtag for unknown-but-not-stopword symbol is accepted (cashtags trusted)", () => {
  const r = extractTickers("Watch $RBLX closely.", { universe: UNIVERSE });
  assert.deepEqual(r.map((x) => x.ticker), ["RBLX"]);
});

test("empty input yields empty array", () => {
  assert.deepEqual(extractTickers("", { universe: UNIVERSE }), []);
  assert.deepEqual(extractTickers(null, { universe: UNIVERSE }), []);
});
