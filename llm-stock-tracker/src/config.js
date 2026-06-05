import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, "..", "config.json");

const DEFAULTS = {
  port: 4321,
  pollIntervalCron: "0 * * * *",
  priceWatchCron: "*/15 * * * *",
  llm: { provider: "mock", model: "gpt-4o-mini" },
  market: { provider: "mock" },
  mock: { simulateSpikes: false },
  watchlist: [],
  tickerUniverse: [],
  spike: { thresholdPct: 2, windowsHours: [1, 4, 24] },
  consensus: { threshold: 3, strongAddPrompts: 2 },
  alerts: { webhookUrl: null, cooldownHours: 6 },
  prompts: [],
};

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

/**
 * Validate + normalize a raw config object. Pure (no IO) so it can be unit tested.
 */
export function normalizeConfig(raw) {
  const cfg = { ...DEFAULTS, ...(raw || {}) };

  cfg.port = Number.isFinite(raw?.port) ? raw.port : DEFAULTS.port;
  cfg.pollIntervalCron = String(cfg.pollIntervalCron || DEFAULTS.pollIntervalCron);
  cfg.priceWatchCron = String(cfg.priceWatchCron || DEFAULTS.priceWatchCron);

  const llmProvider = raw?.llm?.provider === "openai" ? "openai" : "mock";
  cfg.llm = {
    provider: llmProvider,
    model: String(raw?.llm?.model || DEFAULTS.llm.model),
  };

  const marketProvider = ["alphavantage", "finnhub", "mock"].includes(raw?.market?.provider)
    ? raw.market.provider
    : "mock";
  cfg.market = { provider: marketProvider };

  cfg.mock = { simulateSpikes: Boolean(raw?.mock?.simulateSpikes) };

  cfg.watchlist = asArray(raw?.watchlist)
    .map((t) => String(t).toUpperCase().trim())
    .filter(Boolean);

  cfg.tickerUniverse = Array.from(
    new Set(
      asArray(raw?.tickerUniverse)
        .map((t) => String(t).toUpperCase().trim())
        .filter(Boolean)
        .concat(cfg.watchlist),
    ),
  );

  const sp = raw?.spike || {};
  cfg.spike = {
    thresholdPct: Number.isFinite(sp.thresholdPct) ? sp.thresholdPct : DEFAULTS.spike.thresholdPct,
    windowsHours:
      Array.isArray(sp.windowsHours) && sp.windowsHours.length
        ? sp.windowsHours.map(Number).filter((n) => Number.isFinite(n) && n > 0)
        : [...DEFAULTS.spike.windowsHours],
  };

  const cons = raw?.consensus || {};
  cfg.consensus = {
    threshold:
      Number.isFinite(cons.threshold) && cons.threshold >= 1
        ? Math.floor(cons.threshold)
        : DEFAULTS.consensus.threshold,
    strongAddPrompts:
      Number.isFinite(cons.strongAddPrompts) && cons.strongAddPrompts >= 1
        ? Math.floor(cons.strongAddPrompts)
        : DEFAULTS.consensus.strongAddPrompts,
  };

  const al = raw?.alerts || {};
  cfg.alerts = {
    webhookUrl: typeof al.webhookUrl === "string" && al.webhookUrl.trim() ? al.webhookUrl.trim() : null,
    cooldownHours:
      Number.isFinite(al.cooldownHours) && al.cooldownHours >= 0
        ? al.cooldownHours
        : DEFAULTS.alerts.cooldownHours,
  };

  const seenKeys = new Set();
  cfg.prompts = asArray(raw?.prompts)
    .map((p, i) => {
      const key = String(p?.key || `prompt_${i}`).trim();
      return {
        key,
        label: String(p?.label || key),
        text: String(p?.text || ""),
        active: p?.active !== false,
      };
    })
    .filter((p) => {
      if (!p.text || seenKeys.has(p.key)) return false;
      seenKeys.add(p.key);
      return true;
    });

  return cfg;
}

export function loadConfig(path = CONFIG_PATH) {
  let raw = {};
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    raw = {};
  }
  const cfg = normalizeConfig(raw);
  cfg.__path = path;
  return cfg;
}

export function saveConfig(cfg, path = cfg.__path || CONFIG_PATH) {
  const { __path, ...rest } = cfg;
  writeFileSync(path, JSON.stringify(rest, null, 2) + "\n", "utf8");
}

/**
 * Redacted view for the API. Never exposes env secrets; reports whether keys are present.
 */
export function redactConfig(cfg) {
  const { __path, ...rest } = cfg;
  // The webhook URL may embed a token/secret — never leak it; report presence.
  const alerts = {
    ...(rest.alerts || {}),
    webhookConfigured: Boolean(rest.alerts?.webhookUrl),
  };
  delete alerts.webhookUrl;
  return {
    ...rest,
    alerts,
    secrets: {
      openaiKeyPresent: Boolean(process.env.OPENAI_API_KEY),
      alphavantageKeyPresent: Boolean(process.env.ALPHAVANTAGE_API_KEY),
      finnhubKeyPresent: Boolean(process.env.FINNHUB_API_KEY),
    },
  };
}
