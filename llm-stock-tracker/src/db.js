// SQLite storage (better-sqlite3). All timestamps are epoch-ms UTC.
// better-sqlite3 is CJS; import the default export.

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = join(__dirname, "..", "data", "tracker.db");

export function hashText(text) {
  return createHash("sha256").update(String(text)).digest("hex").slice(0, 16);
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  status TEXT NOT NULL DEFAULT 'running'
);

CREATE TABLE IF NOT EXISTS responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  prompt_key TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  raw_text TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS prompt_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt_key TEXT NOT NULL,
  text TEXT NOT NULL,
  hash TEXT NOT NULL,
  first_seen INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_key_hash ON prompt_versions(prompt_key, hash);

CREATE TABLE IF NOT EXISTS recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  prompt_key TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  ticker TEXT NOT NULL,
  stance TEXT NOT NULL,
  confidence REAL,
  rank INTEGER,
  excerpt TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recs_run ON recommendations(run_id);
CREATE INDEX IF NOT EXISTS idx_recs_ticker ON recommendations(ticker);

CREATE TABLE IF NOT EXISTS prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker TEXT NOT NULL,
  price REAL NOT NULL,
  ts INTEGER NOT NULL,
  source TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prices_ticker_ts ON prices(ticker, ts);

CREATE TABLE IF NOT EXISTS mind_change_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt_key TEXT NOT NULL,
  ticker TEXT NOT NULL,
  change_type TEXT NOT NULL,
  prev_stance TEXT,
  new_stance TEXT,
  run_id INTEGER NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mce_ticker ON mind_change_events(ticker);
CREATE INDEX IF NOT EXISTS idx_mce_ts ON mind_change_events(ts);
`;

export function openDb(dbPath = DEFAULT_DB_PATH) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  return wrap(db);
}

function wrap(db) {
  const stmts = {
    insertRun: db.prepare("INSERT INTO runs (started_at, status) VALUES (?, 'running')"),
    finishRun: db.prepare("UPDATE runs SET finished_at = ?, status = ? WHERE id = ?"),
    insertResponse: db.prepare(
      `INSERT INTO responses (run_id, prompt_key, prompt_hash, provider, model, raw_text, created_at)
       VALUES (@run_id, @prompt_key, @prompt_hash, @provider, @model, @raw_text, @created_at)`,
    ),
    promptVersionExists: db.prepare(
      "SELECT 1 FROM prompt_versions WHERE prompt_key = ? AND hash = ? LIMIT 1",
    ),
    insertPromptVersion: db.prepare(
      "INSERT INTO prompt_versions (prompt_key, text, hash, first_seen) VALUES (?, ?, ?, ?)",
    ),
    insertRec: db.prepare(
      `INSERT INTO recommendations (run_id, prompt_key, prompt_hash, ticker, stance, confidence, rank, excerpt, created_at)
       VALUES (@run_id, @prompt_key, @prompt_hash, @ticker, @stance, @confidence, @rank, @excerpt, @created_at)`,
    ),
    insertPrice: db.prepare(
      "INSERT INTO prices (ticker, price, ts, source) VALUES (?, ?, ?, ?)",
    ),
    insertMce: db.prepare(
      `INSERT INTO mind_change_events (prompt_key, ticker, change_type, prev_stance, new_stance, run_id, ts)
       VALUES (@prompt_key, @ticker, @change_type, @prev_stance, @new_stance, @run_id, @ts)`,
    ),
    prevRun: db.prepare("SELECT id FROM runs WHERE id < ? AND status = 'ok' ORDER BY id DESC LIMIT 1"),
    recsForRun: db.prepare(
      "SELECT prompt_key, ticker, stance, rank FROM recommendations WHERE run_id = ?",
    ),
    pricesForTicker: db.prepare(
      "SELECT price, ts FROM prices WHERE ticker = ? ORDER BY ts ASC",
    ),
    mceForTicker: db.prepare(
      "SELECT * FROM mind_change_events WHERE ticker = ? ORDER BY ts ASC",
    ),
    allMce: db.prepare("SELECT * FROM mind_change_events ORDER BY ts DESC LIMIT ?"),
    addedEvents: db.prepare(
      "SELECT ticker, ts FROM mind_change_events WHERE change_type = 'added'",
    ),
    recEventsForTicker: db.prepare(
      `SELECT r.prompt_key, r.stance, r.rank, r.run_id, run.started_at AS ts
       FROM recommendations r JOIN runs run ON run.id = r.run_id
       WHERE r.ticker = ? ORDER BY run.started_at ASC`,
    ),
    leaderboard: db.prepare(
      `SELECT ticker,
              COUNT(*) AS rec_count,
              COUNT(DISTINCT prompt_key) AS prompt_count,
              MIN(created_at) AS first_seen,
              MAX(created_at) AS last_seen
       FROM recommendations
       GROUP BY ticker
       ORDER BY rec_count DESC, ticker ASC`,
    ),
    countRuns: db.prepare("SELECT COUNT(*) AS n FROM runs WHERE status = 'ok'"),
    countRecs: db.prepare("SELECT COUNT(*) AS n FROM recommendations"),
    countUniqueTickers: db.prepare("SELECT COUNT(DISTINCT ticker) AS n FROM recommendations"),
    countMce: db.prepare("SELECT COUNT(*) AS n FROM mind_change_events"),
    lastRun: db.prepare("SELECT * FROM runs ORDER BY id DESC LIMIT 1"),
    allRecTickers: db.prepare("SELECT DISTINCT ticker FROM recommendations"),
  };

  return {
    raw: db,
    hashText,

    createRun(startedAt = Date.now()) {
      const info = stmts.insertRun.run(startedAt);
      return Number(info.lastInsertRowid);
    },
    finishRun(runId, status = "ok", finishedAt = Date.now()) {
      stmts.finishRun.run(finishedAt, status, runId);
    },
    insertResponse(row) {
      stmts.insertResponse.run(row);
    },
    snapshotPromptVersionIfNew(promptKey, text, ts = Date.now()) {
      const hash = hashText(text);
      const exists = stmts.promptVersionExists.get(promptKey, hash);
      if (!exists) {
        stmts.insertPromptVersion.run(promptKey, text, hash, ts);
        return true;
      }
      return false;
    },
    insertRecommendation(row) {
      stmts.insertRec.run(row);
    },
    insertPrice(ticker, price, ts, source) {
      stmts.insertPrice.run(String(ticker).toUpperCase(), price, ts, source);
    },
    insertMindChangeEvent(row) {
      stmts.insertMce.run(row);
    },
    previousOkRunId(beforeRunId) {
      const r = stmts.prevRun.get(beforeRunId);
      return r ? r.id : null;
    },
    // Returns { [promptKey]: [{ ticker, stance, rank }] } for a run.
    recommendationsByPromptForRun(runId) {
      const rows = stmts.recsForRun.all(runId);
      const byPrompt = {};
      for (const row of rows) {
        (byPrompt[row.prompt_key] ||= []).push({
          ticker: row.ticker,
          stance: row.stance,
          rank: row.rank,
        });
      }
      return byPrompt;
    },
    priceSeries(ticker) {
      return stmts.pricesForTicker.all(String(ticker).toUpperCase());
    },
    mindChangesForTicker(ticker) {
      return stmts.mceForTicker.all(String(ticker).toUpperCase());
    },
    recentMindChanges(limit = 200) {
      return stmts.allMce.all(limit);
    },
    addedEvents() {
      return stmts.addedEvents.all();
    },
    recEventsForTicker(ticker) {
      return stmts.recEventsForTicker.all(String(ticker).toUpperCase());
    },
    leaderboard() {
      return stmts.leaderboard.all();
    },
    counts() {
      return {
        runs: stmts.countRuns.get().n,
        recommendations: stmts.countRecs.get().n,
        uniqueTickers: stmts.countUniqueTickers.get().n,
        mindChangeEvents: stmts.countMce.get().n,
      };
    },
    lastRunRow() {
      return stmts.lastRun.get() || null;
    },
    allRecommendedTickers() {
      return stmts.allRecTickers.all().map((r) => r.ticker);
    },
    transaction(fn) {
      return db.transaction(fn);
    },
    close() {
      db.close();
    },
  };
}
