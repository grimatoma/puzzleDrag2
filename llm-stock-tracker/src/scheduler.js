// node-cron scheduler: one job runs full polls, another densely samples prices
// for all known recommended + watchlist tickers (post-recommendation series).

import cron from "node-cron";
import { runPoll } from "./poller.js";

export function createScheduler({ db, config, llm, market }) {
  let pollJob = null;
  let priceJob = null;
  let lastRun = null;
  let lastError = null;
  let running = false;

  async function doPoll() {
    try {
      lastRun = { type: "poll", at: Date.now(), summary: await runPoll({ db, config, llm, market }) };
      lastError = null;
    } catch (err) {
      lastError = { at: Date.now(), message: String(err?.message || err) };
    }
  }

  async function doPriceWatch() {
    try {
      const tickers = Array.from(
        new Set([...(db.allRecommendedTickers() || []), ...(config.watchlist || [])]),
      );
      if (!tickers.length) return;
      const now = Date.now();
      const quotes = market.getQuotes
        ? await market.getQuotes(tickers, now)
        : await Promise.all(tickers.map((t) => market.getQuote(t, now)));
      for (const q of quotes) db.insertPrice(q.ticker, q.price, q.ts ?? now, market.name);
      lastRun = { type: "price", at: now, tickers: tickers.length };
    } catch (err) {
      lastError = { at: Date.now(), message: String(err?.message || err) };
    }
  }

  return {
    start() {
      if (running) return;
      pollJob = cron.schedule(config.pollIntervalCron, doPoll);
      priceJob = cron.schedule(config.priceWatchCron, doPriceWatch);
      running = true;
    },
    stop() {
      pollJob?.stop();
      priceJob?.stop();
      pollJob = null;
      priceJob = null;
      running = false;
    },
    // Exposed for run-now API + tests.
    doPoll,
    doPriceWatch,
    status() {
      return {
        running,
        pollIntervalCron: config.pollIntervalCron,
        priceWatchCron: config.priceWatchCron,
        lastRun,
        lastError,
        providers: { llm: llm.name, market: market.name },
      };
    },
  };
}
