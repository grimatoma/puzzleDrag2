// CLI entrypoint.
//   node src/cli.js poll   -> run one poll cycle, print the summary
//   node src/cli.js serve  -> start API server + cron scheduler

import "dotenv/config";

import { loadConfig } from "./config.js";
import { openDb } from "./db.js";
import { createLlmProvider } from "./providers/llm/index.js";
import { createMarketProvider } from "./providers/market/index.js";
import { runPoll } from "./poller.js";
import { createScheduler } from "./scheduler.js";
import { createServer } from "./server.js";

function buildDeps({ forceSpikes = false } = {}) {
  const config = loadConfig();
  // Opt-in spike simulation (used by `simulate --spikes`) is applied before the
  // market provider is built, since the mock reads it at construction time.
  if (forceSpikes) config.mock = { ...config.mock, simulateSpikes: true };
  const db = openDb();
  const llm = createLlmProvider(config);
  // Let the mock market provider see registered "added" events for spike sim.
  const market = createMarketProvider(config, {
    getAddedEvents: () => db.addedEvents(),
  });
  return { config, db, llm, market };
}

function getFlag(args, name, fallback) {
  const hit = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const eq = hit.indexOf("=");
  return eq === -1 ? true : hit.slice(eq + 1);
}

async function cmdPoll() {
  const { config, db, llm, market } = buildDeps();
  console.log(`[poll] llm=${llm.name} market=${market.name} prompts=${config.prompts.filter((p) => p.active).length}`);
  const summary = await runPoll({ db, config, llm, market });
  console.log("[poll] summary:");
  console.log(JSON.stringify(summary, null, 2));
  db.close();
}

async function cmdServe() {
  const { config, db, llm, market } = buildDeps();
  const scheduler = createScheduler({ db, config, llm, market });
  scheduler.start();
  const app = createServer({ db, config, llm, market, scheduler });
  const port = config.port || 4321;
  // Bind to loopback by default: the API can spend LLM/market API credits and
  // exposes config, so it should not be reachable from the network unless the
  // operator explicitly opts in via config.host / HOST.
  const host = process.env.HOST || config.host || "127.0.0.1";
  const server = app.listen(port, host, () => {
    console.log(`[serve] LLM Stock Tracker on http://${host === "0.0.0.0" ? "localhost" : host}:${port}`);
    console.log(`[serve] providers llm=${llm.name} market=${market.name}`);
    console.log(`[serve] poll cron="${config.pollIntervalCron}" price cron="${config.priceWatchCron}"`);
  });

  const shutdown = () => {
    scheduler.stop();
    server.close(() => {
      db.close();
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// Backfill the store with a simulated time range so metrics + dashboard are
// populated immediately instead of waiting days for real hourly polls. It runs
// the REAL pipeline (LLM -> parse -> mind-change diff -> prices) at stepped
// timestamps, plus dense intra-step price sampling so the +1h/+4h/+24h spike
// windows have data. With mock providers this is a self-contained demo; with
// real providers it would replay against whatever they return for `now`.
async function cmdSimulate(args) {
  const hours = Number(getFlag(args, "hours", 72)) || 72;
  const stepH = Number(getFlag(args, "step", 1)) || 1;
  const denseMin = Number(getFlag(args, "dense", 15)) || 15;
  const spikes = Boolean(getFlag(args, "spikes", false));
  const { config, db, llm, market } = buildDeps({ forceSpikes: spikes });

  const stepMs = stepH * 3600_000;
  const denseMs = denseMin * 60_000;
  const end = Date.now();
  const start = end - hours * 3600_000;

  console.log(
    `[simulate] llm=${llm.name} market=${market.name} spikes=${spikes} ` +
      `range=${hours}h step=${stepH}h dense=${denseMin}m`,
  );

  let polls = 0;
  let totalRecs = 0;
  let totalMc = 0;
  let pricePoints = 0;

  for (let t = start; t <= end; t += stepMs) {
    const summary = await runPoll({ db, config, llm, market, now: t });
    polls += 1;
    totalRecs += summary.recommendations;
    totalMc += summary.mindChanges;
    pricePoints += summary.pricesStored;

    // Dense intra-step price watch for ALL tickers ever recommended (+ watchlist)
    // so series stay continuous across the windows we measure.
    const known = Array.from(
      new Set([...(db.allRecommendedTickers() || []), ...config.watchlist]),
    );
    if (known.length) {
      for (let s = t + denseMs; s < t + stepMs && s <= end; s += denseMs) {
        const quotes = market.getQuotes
          ? await market.getQuotes(known, s)
          : await Promise.all(known.map((k) => market.getQuote(k, s)));
        for (const q of quotes) {
          db.insertPrice(q.ticker, q.price, q.ts ?? s, market.name);
          pricePoints += 1;
        }
      }
    }
  }

  console.log(
    `[simulate] done: ${polls} polls, ${totalRecs} recommendations, ` +
      `${totalMc} mind-change events, ${pricePoints} price points stored.`,
  );
  console.log("[simulate] start `npm run serve` and open the dashboard to explore.");
  db.close();
}

const cmd = process.argv[2];
if (cmd === "poll") {
  cmdPoll().catch((err) => {
    console.error("[poll] failed:", err);
    process.exit(1);
  });
} else if (cmd === "serve") {
  cmdServe().catch((err) => {
    console.error("[serve] failed:", err);
    process.exit(1);
  });
} else if (cmd === "simulate") {
  cmdSimulate(process.argv.slice(3)).catch((err) => {
    console.error("[simulate] failed:", err);
    process.exit(1);
  });
} else {
  console.log("Usage: node src/cli.js <poll|serve|simulate>");
  console.log("  poll                                 run one poll cycle now");
  console.log("  serve                                start API + dashboard + scheduler");
  console.log("  simulate [--hours=72] [--step=1]     backfill a simulated time range");
  console.log("           [--dense=15] [--spikes]     (dense=intra-step price minutes)");
  process.exit(1);
}
