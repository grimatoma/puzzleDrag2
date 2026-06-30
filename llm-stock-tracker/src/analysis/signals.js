// Pure cross-prompt CONSENSUS signal detection. NO db, NO network.
//
// Inputs are plain in-memory shapes (already loaded by the poller) so this
// module is fully unit-testable and side-effect free. Side effects (cooldown,
// persistence, webhook) live in src/alerts.js.
//
// A "byPromptForRun" map is { [promptKey]: [{ ticker, stance, rank }, ...] } —
// the same shape db.recommendationsByPromptForRun(runId) returns.

/**
 * Pivot a byPrompt map to per-ticker aggregates.
 * @returns {Map<string, { ticker, promptKeys:Set<string>, count:number,
 *   buy:number, avoid:number, netStance:"buy"|"avoid"|"mixed"|"neutral" }>}
 */
export function pivotByTicker(byPrompt = {}) {
  const map = new Map();
  for (const [promptKey, recs] of Object.entries(byPrompt || {})) {
    // One vote per (ticker, prompt): first occurrence wins so a prompt that
    // lists a ticker twice can't inflate the consensus count.
    const seen = new Set();
    for (const r of recs || []) {
      if (seen.has(r.ticker)) continue;
      seen.add(r.ticker);
      let e = map.get(r.ticker);
      if (!e) {
        e = { ticker: r.ticker, promptKeys: new Set(), count: 0, buy: 0, avoid: 0, netStance: "neutral" };
        map.set(r.ticker, e);
      }
      e.promptKeys.add(promptKey);
      e.count += 1;
      if (r.stance === "buy") e.buy += 1;
      else if (r.stance === "avoid") e.avoid += 1;
    }
  }
  for (const e of map.values()) e.netStance = netStanceOf(e.buy, e.avoid);
  return map;
}

function netStanceOf(buy, avoid) {
  if (buy === 0 && avoid === 0) return "neutral";
  if (buy === avoid) return "mixed"; // tie with both present
  return buy > avoid ? "buy" : "avoid";
}

/**
 * shouldEmit(lastTs, now, cooldownMs) -> boolean
 * Per-(ticker,signalType) cooldown gate. Emits when there is no prior signal or
 * when enough time has elapsed since the last one.
 */
export function shouldEmit(lastTs, now, cooldownMs) {
  if (lastTs === null || lastTs === undefined) return true;
  const cd = Number.isFinite(cooldownMs) ? Math.max(0, cooldownMs) : 0;
  return now - lastTs >= cd;
}

/**
 * computeSignals({ byPromptForRun, prevByPromptForRun, addedEventsForRun,
 *   config, now, firstEverTickers }) -> signal[]
 *
 * Pure. Emits NEW_CONSENSUS (edge-triggered) and STRONG_ADD signals.
 *   signal = { ticker, signalType, promptCount, activePromptCount, netStance,
 *              promptKeys:[...], freshPick, detail }
 */
export function computeSignals({
  byPromptForRun = {},
  prevByPromptForRun = null,
  addedEventsForRun = [],
  config = {},
  now = Date.now(),
  firstEverTickers = new Set(),
} = {}) {
  const consensusCfg = config.consensus || {};
  const threshold = Number.isFinite(consensusCfg.threshold) ? consensusCfg.threshold : 3;
  const strongAddPrompts = Number.isFinite(consensusCfg.strongAddPrompts)
    ? consensusCfg.strongAddPrompts
    : 2;
  const activePromptCount = (config.prompts || []).filter((p) => p.active).length;
  const freshSet = firstEverTickers instanceof Set ? firstEverTickers : new Set(firstEverTickers || []);

  const curr = pivotByTicker(byPromptForRun);
  const prev = prevByPromptForRun ? pivotByTicker(prevByPromptForRun) : null;

  const signals = [];

  // --- NEW_CONSENSUS (edge-triggered) ---
  for (const e of curr.values()) {
    if (e.count < threshold) continue;
    // First run (no prev) cannot be a "crossing" — nothing to rise above.
    const prevCount = prev ? (prev.get(e.ticker)?.count || 0) : null;
    const crossed = prev !== null && prevCount < threshold;
    if (!crossed) continue;
    signals.push({
      ticker: e.ticker,
      signalType: "NEW_CONSENSUS",
      promptCount: e.count,
      activePromptCount,
      netStance: e.netStance,
      promptKeys: Array.from(e.promptKeys),
      freshPick: freshSet.has(e.ticker),
      detail: `Consensus reached: ${e.count} prompts (was ${prevCount}); threshold ${threshold}.`,
    });
  }

  // --- STRONG_ADD ---
  // Group this run's "added" events by ticker, counting distinct prompts.
  const addedByTicker = new Map();
  for (const ev of addedEventsForRun || []) {
    let g = addedByTicker.get(ev.ticker);
    if (!g) {
      g = new Set();
      addedByTicker.set(ev.ticker, g);
    }
    if (ev.prompt_key !== undefined && ev.prompt_key !== null) g.add(ev.prompt_key);
  }
  for (const [ticker, promptKeys] of addedByTicker) {
    if (promptKeys.size < strongAddPrompts) continue;
    const e = curr.get(ticker);
    signals.push({
      ticker,
      signalType: "STRONG_ADD",
      promptCount: e ? e.count : promptKeys.size,
      activePromptCount,
      netStance: e ? e.netStance : "neutral",
      promptKeys: Array.from(promptKeys),
      freshPick: freshSet.has(ticker),
      detail: `Added across ${promptKeys.size} prompts this run (threshold ${strongAddPrompts}).`,
    });
  }

  return signals;
}
