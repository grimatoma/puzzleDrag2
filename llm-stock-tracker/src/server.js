// Express server: JSON API + static dashboard. No external CDN — public/ is
// vanilla HTML/CSS/JS and works fully offline.

import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { redactConfig, saveConfig, normalizeConfig } from "./config.js";
import { runPoll } from "./poller.js";
import {
  buildSummary,
  buildLeaderboard,
  buildTickerDetail,
  buildMindChangeTimeline,
} from "./analysis/report.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");

export function createServer({ db, config, llm, market, scheduler }) {
  const app = express();
  app.use(express.json());
  app.use(express.static(PUBLIC_DIR));

  app.get("/api/status", (req, res) => {
    res.json({
      scheduler: scheduler ? scheduler.status() : { running: false },
      lastRunRow: db.lastRunRow(),
      providers: { llm: llm.name, market: market.name },
    });
  });

  app.get("/api/config", (req, res) => {
    res.json(redactConfig(config));
  });

  app.get("/api/metrics/summary", (req, res) => {
    res.json(buildSummary(db, config));
  });

  app.get("/api/tickers", (req, res) => {
    res.json(buildLeaderboard(db));
  });

  app.get("/api/ticker/:sym", (req, res) => {
    res.json(buildTickerDetail(db, config, req.params.sym));
  });

  app.get("/api/mind-changes", (req, res) => {
    const limit = Math.min(2000, Number(req.query.limit) || 200);
    res.json(buildMindChangeTimeline(db, limit));
  });

  app.get("/api/prompts", (req, res) => {
    res.json(config.prompts);
  });

  app.post("/api/prompts", (req, res) => {
    const { key, label, text, active } = req.body || {};
    if (!key || !text) return res.status(400).json({ error: "key and text are required" });
    if (config.prompts.some((p) => p.key === key)) {
      return res.status(409).json({ error: "prompt key already exists" });
    }
    config.prompts.push({ key: String(key), label: String(label || key), text: String(text), active: active !== false });
    persist(config);
    res.status(201).json(config.prompts);
  });

  app.put("/api/prompts/:key", (req, res) => {
    const p = config.prompts.find((x) => x.key === req.params.key);
    if (!p) return res.status(404).json({ error: "not found" });
    const { label, text, active } = req.body || {};
    if (label !== undefined) p.label = String(label);
    if (text !== undefined) p.text = String(text);
    if (active !== undefined) p.active = Boolean(active);
    persist(config);
    res.json(config.prompts);
  });

  app.delete("/api/prompts/:key", (req, res) => {
    const idx = config.prompts.findIndex((x) => x.key === req.params.key);
    if (idx === -1) return res.status(404).json({ error: "not found" });
    config.prompts.splice(idx, 1);
    persist(config);
    res.json(config.prompts);
  });

  app.post("/api/run-now", async (req, res) => {
    try {
      const summary = await runPoll({ db, config, llm, market });
      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: String(err?.message || err) });
    }
  });

  return app;
}

function persist(config) {
  // Re-normalize so saved config stays clean, but keep the live object's
  // identity (other modules hold a reference) by copying fields back.
  const normalized = normalizeConfig(config);
  config.prompts = normalized.prompts;
  saveConfig(config);
}
