// Side-effect dispatcher for computed signals: cooldown gate, persistence,
// logging, and an optional fire-and-forget webhook. A webhook / network failure
// must NEVER fail the poll — every external call is wrapped in try/catch.

import { shouldEmit } from "./analysis/signals.js";

const HOUR_MS = 60 * 60 * 1000;

/**
 * dispatchSignals(db, config, signals, { now }) -> number (emitted count)
 * For each signal: apply per-(ticker,type) cooldown, persist via db.insertSignal,
 * log a line, and optionally POST to config.alerts.webhookUrl.
 */
export function dispatchSignals(db, config, signals = [], { now = Date.now() } = {}) {
  const alertsCfg = config.alerts || {};
  const cooldownMs = Math.max(0, (Number.isFinite(alertsCfg.cooldownHours) ? alertsCfg.cooldownHours : 6)) * HOUR_MS;
  const webhookUrl = alertsCfg.webhookUrl || null;

  let emitted = 0;
  for (const sig of signals) {
    let lastTs = null;
    try {
      lastTs = db.lastSignalTs(sig.ticker, sig.signalType);
    } catch {
      lastTs = null;
    }
    if (!shouldEmit(lastTs, now, cooldownMs)) continue;

    try {
      db.insertSignal({
        run_id: sig.runId ?? null,
        ts: now,
        ticker: sig.ticker,
        signal_type: sig.signalType,
        prompt_count: sig.promptCount ?? 0,
        active_prompt_count: sig.activePromptCount ?? 0,
        net_stance: sig.netStance ?? "neutral",
        prompt_keys: JSON.stringify(sig.promptKeys || []),
        fresh_pick: sig.freshPick ? 1 : 0,
        detail: sig.detail ?? null,
        created_at: now,
      });
    } catch (err) {
      // Persistence failure for one signal shouldn't abort the rest.
      console.error(`[alerts] failed to persist ${sig.signalType} ${sig.ticker}: ${err?.message || err}`);
      continue;
    }

    console.log(
      `[alerts] ${sig.signalType} ${sig.ticker} ` +
        `(${sig.promptCount}/${sig.activePromptCount} prompts, ${sig.netStance}` +
        `${sig.freshPick ? ", FRESH" : ""}) — ${sig.detail || ""}`,
    );
    emitted += 1;

    if (webhookUrl) {
      fireWebhook(webhookUrl, { ...sig, ts: now }).catch(() => {});
    }
  }
  return emitted;
}

// Fire-and-forget POST with a short timeout. Never throws into the caller.
async function fireWebhook(url, signal) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signal),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    console.error(`[alerts] webhook failed: ${err?.message || err}`);
  }
}
