// Orchestrates a single poll cycle. Pure-ish: all IO comes in via `deps` so it
// is callable from the CLI, the scheduler, and the run-now API, and testable.

import { extractTickers } from "./parser/tickerParser.js";
import { diffRecommendations } from "./analysis/mindChange.js";

/**
 * runPoll({ db, config, llm, market, now? }) -> summary
 */
export async function runPoll({ db, config, llm, market, now = Date.now() }) {
  const startedAt = now;
  const runId = db.createRun(startedAt);
  const universe = config.tickerUniverse || [];
  const activePrompts = (config.prompts || []).filter((p) => p.active);

  let recCount = 0;
  const tickerSet = new Set();

  try {
    for (const prompt of activePrompts) {
      const promptHash = db.hashText(prompt.text);
      db.snapshotPromptVersionIfNew(prompt.key, prompt.text, startedAt);

      const { rawText, model } = await llm.recommend({
        promptText: prompt.text,
        model: config.llm.model,
        // Thread the run's clock through so providers that are time-sensitive
        // (e.g. the mock, which varies picks by hour) stay consistent with the
        // run timestamp. Real providers ignore `now`.
        now: startedAt,
      });

      db.insertResponse({
        run_id: runId,
        prompt_key: prompt.key,
        prompt_hash: promptHash,
        provider: llm.name,
        model: model || config.llm.model || null,
        raw_text: rawText,
        created_at: startedAt,
      });

      const recs = extractTickers(rawText, { universe });
      for (const r of recs) {
        db.insertRecommendation({
          run_id: runId,
          prompt_key: prompt.key,
          prompt_hash: promptHash,
          ticker: r.ticker,
          stance: r.stance,
          confidence: r.confidence,
          rank: r.rank,
          excerpt: r.excerpt,
          created_at: startedAt,
        });
        recCount += 1;
        tickerSet.add(r.ticker);
      }
    }

    // Mind-change events vs the previous successful run.
    let mindChangeEvents = [];
    const prevRunId = db.previousOkRunId(runId);
    if (prevRunId) {
      const prevByPrompt = db.recommendationsByPromptForRun(prevRunId);
      const currByPrompt = db.recommendationsByPromptForRun(runId);
      mindChangeEvents = diffRecommendations(prevByPrompt, currByPrompt);
      for (const ev of mindChangeEvents) {
        db.insertMindChangeEvent({ ...ev, run_id: runId, ts: startedAt });
      }
    }

    // Fetch + store current prices for union(recommended, watchlist).
    const watchlist = config.watchlist || [];
    const tickers = Array.from(new Set([...tickerSet, ...watchlist]));
    let pricesStored = 0;
    if (tickers.length) {
      const quotes = market.getQuotes
        ? await market.getQuotes(tickers, now)
        : await Promise.all(tickers.map((t) => market.getQuote(t, now)));
      for (const q of quotes) {
        db.insertPrice(q.ticker, q.price, q.ts ?? now, market.name);
        pricesStored += 1;
      }
    }

    db.finishRun(runId, "ok", Date.now());

    return {
      runId,
      startedAt,
      prompts: activePrompts.length,
      recommendations: recCount,
      uniqueTickers: tickerSet.size,
      mindChanges: mindChangeEvents.length,
      mindChangeBreakdown: countBy(mindChangeEvents, "change_type"),
      pricesStored,
      tickers,
      status: "ok",
    };
  } catch (err) {
    db.finishRun(runId, "error", Date.now());
    throw err;
  }
}

function countBy(arr, key) {
  const out = {};
  for (const x of arr) out[x[key]] = (out[x[key]] || 0) + 1;
  return out;
}
