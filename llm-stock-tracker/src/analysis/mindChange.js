// Pure mind-change diff between two runs' recommendations.
//
// Input shape (per run): { [promptKey]: [{ ticker, stance, rank }, ...] }
// Emits one event per change:
//   - 'added'        : ticker present now, absent before
//   - 'removed'      : ticker present before, absent now
//   - 'stance_flip'  : ticker present in both but stance changed

function indexByTicker(list) {
  const map = new Map();
  for (const r of list || []) {
    // First occurrence wins (best rank).
    if (!map.has(r.ticker)) map.set(r.ticker, r);
  }
  return map;
}

/**
 * diffRecommendations(prevByPrompt, currByPrompt) -> events[]
 * Each event: { prompt_key, ticker, change_type, prev_stance, new_stance }
 */
export function diffRecommendations(prevByPrompt = {}, currByPrompt = {}) {
  const events = [];
  const promptKeys = new Set([
    ...Object.keys(prevByPrompt || {}),
    ...Object.keys(currByPrompt || {}),
  ]);

  for (const promptKey of promptKeys) {
    const prev = indexByTicker(prevByPrompt[promptKey]);
    const curr = indexByTicker(currByPrompt[promptKey]);

    // Added + stance_flip (iterate current).
    for (const [ticker, c] of curr) {
      const p = prev.get(ticker);
      if (!p) {
        events.push({
          prompt_key: promptKey,
          ticker,
          change_type: "added",
          prev_stance: null,
          new_stance: c.stance,
        });
      } else if (p.stance !== c.stance) {
        events.push({
          prompt_key: promptKey,
          ticker,
          change_type: "stance_flip",
          prev_stance: p.stance,
          new_stance: c.stance,
        });
      }
    }

    // Removed (iterate previous).
    for (const [ticker, p] of prev) {
      if (!curr.has(ticker)) {
        events.push({
          prompt_key: promptKey,
          ticker,
          change_type: "removed",
          prev_stance: p.stance,
          new_stance: null,
        });
      }
    }
  }

  return events;
}
