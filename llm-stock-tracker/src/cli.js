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

function buildDeps() {
  const config = loadConfig();
  const db = openDb();
  const llm = createLlmProvider(config);
  // Let the mock market provider see registered "added" events for spike sim.
  const market = createMarketProvider(config, {
    getAddedEvents: () => db.addedEvents(),
  });
  return { config, db, llm, market };
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
} else {
  console.log("Usage: node src/cli.js <poll|serve>");
  process.exit(1);
}
