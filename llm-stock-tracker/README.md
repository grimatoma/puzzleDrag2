# LLM Stock Tracker

> **Educational / research tool. NOT financial advice.** Nothing here is a
> recommendation to buy or sell any security. The default providers are
> **mocks** that fabricate data so the app runs fully offline.

## What it is + thesis

A popular LLM (e.g. ChatGPT) is asked "what stocks should I buy?" by huge numbers
of people. **Hypothesis:** some people act on those answers, so when the model
*changes its mind* — newly suggesting a ticker, dropping one, or flipping its
stance — a small price move ("spike") may follow shortly after.

This app:

1. Polls an LLM on a schedule, asking the same question in **multiple common
   phrasings**.
2. **Parses tickers** out of the prose (cashtags, `Name (TICKER)`, and bare
   symbols validated against a known universe).
3. Detects **mind-change events** by diffing each prompt's tickers/stances
   against the previous run (`added`, `removed`, `stance_flip`).
4. Watches the **prices** of recommended + watchlist tickers densely over time.
5. Reports **spike metrics** (did price move ≥ threshold within 1h/4h/24h after a
   mind-change?) and serves a **dashboard**.

## Architecture

```
src/
  config.js                 load/normalize/save config.json, redacted view for API
  db.js                     better-sqlite3 storage + query helpers (data/tracker.db)
  poller.js                 runPoll(deps): one full poll cycle (LLM -> parse -> diff -> prices)
  scheduler.js              node-cron jobs (poll cron + dense price-watch cron)
  server.js                 express JSON API + static dashboard
  cli.js                    `poll`, `serve`, and `simulate` commands
  parser/tickerParser.js    extractTickers(rawText, {universe})
  analysis/
    mindChange.js           diffRecommendations(prev, curr) -> events  (pure)
    metrics.js              priceAt / windowChangePct / detectSpike / leaderboard / summary (pure)
    report.js               DB-backed composition of the pure metrics
  providers/
    llm/{index,mock,openai}.js          recommend({promptText, model}) -> {rawText, model}
    market/{index,mock,alphaVantage,finnhub}.js   getQuote / getQuotes
public/                     vanilla dashboard (index.html + app.js + styles.css), no CDN
test/                       node --test unit tests
config.json                 source of truth (editable)
.env.example                copy to .env for real API keys
```

**Providers are pluggable and mock-first.** Factories pick the real provider only
when (a) `config` asks for it AND (b) the relevant API key is present in env;
otherwise they fall back to deterministic mocks. So the app always runs offline.

### How mock-first works

- **Mock LLM** (`providers/llm/mock.js`): the recommended set is a deterministic
  function of `(promptText + hour bucket)`, so picks are stable within an hour but
  occasionally change across hours — producing mind-change events. For demos you
  can vary picks within the same hour by setting `MOCK_SEED_SALT` (the CLI/tests
  use this to make mind-changes appear without waiting). It emits realistic prose
  mixing `$AAPL`, `Apple (AAPL)`, and bare-symbol mentions with buy/avoid stances.
- **Mock market** (`providers/market/mock.js`): price is a deterministic seeded
  random walk keyed by `(ticker + 15-min bucket)` — stable within a tick, plausible
  over time. With `mock.simulateSpikes: true` it injects an upward bump in the
  hours after an `added` event (for tests/demos). **Default is `false`** so
  out-of-the-box behavior is honest.

## Setup

```bash
cd llm-stock-tracker
npm install
```

Requires Node 18+ (built/verified on Node v22). Uses the global `fetch` — no axios.

## Running

**One poll cycle (prints a summary):**

```bash
npm run poll
# creates data/tracker.db, runs each active prompt, stores recommendations,
# computes mind-changes vs the previous run, fetches prices, prints JSON summary.
```

Run it a few times to accumulate runs and surface mind-change events. To force
variation between back-to-back runs (so mind-changes appear immediately):

```bash
MOCK_SEED_SALT=a npm run poll
MOCK_SEED_SALT=b npm run poll
```

**Populate a demo timeline (fastest way to see the dashboard with data):**

Real hourly polling takes days to surface trends, so `simulate` backfills the
store by running the *real* pipeline (LLM → parse → mind-change diff → prices)
at stepped timestamps, with dense intra-step price sampling so the `+1h/+4h/+24h`
spike windows have data:

```bash
# 72h of hourly polls, 15-min price sampling, with injected post-event spikes
npm run simulate -- --hours=72 --step=1 --dense=15 --spikes
# then explore it:
npm run serve   # dashboard at http://localhost:4321
```

Flags: `--hours` (range to backfill), `--step` (hours between polls), `--dense`
(minutes between intra-step price samples), `--spikes` (turn on the mock's
post-recommendation bump so spike detection has something to find — off by
default to keep prices an honest random walk). With real providers configured,
`simulate` replays against whatever they return for each timestamp.

**Server + scheduler (dashboard):**

```bash
npm run serve
# dashboard at http://localhost:4321  (port from config.json)
```

The scheduler runs the poll cron (`pollIntervalCron`, default hourly) and a dense
price-watch cron (`priceWatchCron`, default every 15 min) so post-recommendation
price series fill in between polls.

## Configuration — `config.json`

| Field | Meaning |
|---|---|
| `port` | dashboard/API port (default 4321) |
| `pollIntervalCron` | cron for full polls (default `"0 * * * *"`) |
| `priceWatchCron` | cron for price-only sampling (default `"*/15 * * * *"`) |
| `llm.provider` / `llm.model` | `"mock"` or `"openai"`; model name |
| `market.provider` | `"mock"`, `"alphavantage"`, or `"finnhub"` |
| `mock.simulateSpikes` | inject post-event price bumps (default `false`) |
| `watchlist` | tickers always tracked, even if never recommended |
| `tickerUniverse` | allowlist the parser validates bare symbols against |
| `spike.thresholdPct` | spike threshold (default `2`) |
| `spike.windowsHours` | windows to evaluate (default `[1, 4, 24]`) |
| `prompts[]` | `{ key, label, text, active }` — the phrasings polled |

Edit prompts in the file, or via the dashboard **Prompts** tab / the API
(`POST/PUT/DELETE /api/prompts`). Dashboard edits are persisted back to
`config.json`. Five default prompts ship asking the same thing different ways.

## Real API keys via `.env`

```bash
cp .env.example .env
# fill in any of:
#   OPENAI_API_KEY=...          (and set config.llm.provider="openai")
#   ALPHAVANTAGE_API_KEY=...    (and set config.market.provider="alphavantage")
#   FINNHUB_API_KEY=...         (and set config.market.provider="finnhub")
```

Secrets are read from env only and **never** committed or returned by the API
(`/api/config` reports only `*Present: true/false`). `.env` is gitignored.

## Data model (`data/tracker.db`, epoch-ms UTC)

| Table | Purpose |
|---|---|
| `runs` | one row per poll (`started_at`, `finished_at`, `status`) |
| `responses` | raw LLM text per prompt per run |
| `prompt_versions` | snapshot whenever a prompt's text hash changes |
| `recommendations` | parsed `{ticker, stance, confidence, rank, excerpt}` per prompt per run |
| `prices` | `{ticker, price, ts, source}`, indexed on `(ticker, ts)` |
| `mind_change_events` | `{prompt_key, ticker, change_type, prev_stance, new_stance, run_id, ts}` |

## Metrics definitions

- **Mind-change event** — per prompt, comparing this run to the previous
  successful run: `added` (new ticker), `removed` (dropped ticker), `stance_flip`
  (same ticker, different stance).
- **Spike window** — for each `added` event, the percent price change from the
  event time to `event + Nh` for each `N` in `spike.windowsHours`.
- **Spike** — an upward move `≥ spike.thresholdPct` in *any* window.
- **Spike hit-rate** — `spikes / events-with-a-measurable-window`. Only events
  that have at least one usable price window are counted.

## API

| Method + path | Returns |
|---|---|
| `GET /api/status` | scheduler status, last run, provider modes |
| `GET /api/config` | redacted config (no secrets) |
| `GET /api/metrics/summary` | run/rec/ticker/mind-change counts + spike hit-rate |
| `GET /api/tickers` | leaderboard |
| `GET /api/ticker/:sym` | rec events + price series + spike windows |
| `GET /api/mind-changes` | timeline |
| `GET/POST /api/prompts`, `PUT/DELETE /api/prompts/:key` | manage prompts |
| `POST /api/run-now` | trigger a poll, return its summary |

## Tests

```bash
npm test    # node --test, runs fully offline with the mocks
```

Covers the high-risk pure logic: ticker parsing (false-positive defenses,
stance, dedupe/rank), mind-change diffing, and the metric/aggregation functions.
