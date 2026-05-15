// Achievement progression tracks — groups ACHIEVEMENTS by their `counter`
// and lays out the milestones sorted by threshold so designers can see
// how many checkpoints sit on each counter and how the curve scales
// ("chains_committed = 1 / 10 / 100 — geometric").
//
// Pure module; takes its catalog as an argument with the live one as
// the default.

import { ACHIEVEMENTS } from "../features/achievements/data.js";

function rewardSummary(reward) {
  if (!reward) return "";
  const bits = [];
  if (Number.isFinite(reward.coins) && reward.coins > 0) bits.push(`${reward.coins}◉`);
  if (reward.tools && typeof reward.tools === "object") {
    for (const [tool, qty] of Object.entries(reward.tools)) {
      bits.push(`${qty}× ${tool}`);
    }
  }
  return bits.join(" + ");
}

/**
 * Returns `[{ counter, achievements: [{ id, name, threshold, reward, summary }] }]`
 * sorted by counter name. Within each track, achievements are sorted by
 * threshold ascending. Tracks with only one achievement still appear so
 * the editor can see them in the same place.
 */
export function computeAchievementTracks({ achievements = ACHIEVEMENTS } = {}) {
  const byCounter = new Map();
  for (const a of Array.isArray(achievements) ? achievements : []) {
    if (!a || typeof a.counter !== "string") continue;
    if (!byCounter.has(a.counter)) byCounter.set(a.counter, []);
    byCounter.get(a.counter).push({
      id: a.id, name: a.name || a.id,
      threshold: Number(a.threshold) || 0,
      target: Number(a.target) || Number(a.threshold) || 0,
      reward: a.reward || null,
      summary: rewardSummary(a.reward),
    });
  }
  const out = [];
  for (const [counter, list] of byCounter) {
    list.sort((a, b) => (a.threshold - b.threshold) || a.id.localeCompare(b.id));
    out.push({
      counter,
      achievements: list,
      minThreshold: list[0]?.threshold || 0,
      maxThreshold: list[list.length - 1]?.threshold || 0,
      isGeometric: detectGeometric(list.map((a) => a.threshold)),
    });
  }
  out.sort((a, b) => a.counter.localeCompare(b.counter));
  return out;
}

/** Coarse heuristic: is the threshold series ≥3 milestones with each ≥2× the previous? */
function detectGeometric(thresholds) {
  const arr = thresholds.filter((n) => n > 0).slice().sort((a, b) => a - b);
  if (arr.length < 3) return false;
  for (let i = 1; i < arr.length; i += 1) if (arr[i] < arr[i - 1] * 2) return false;
  return true;
}

/** Total coins promised by all achievements; useful as a sanity stat. */
export function totalAchievementCoins({ achievements = ACHIEVEMENTS } = {}) {
  return (Array.isArray(achievements) ? achievements : [])
    .reduce((s, a) => s + (Number(a?.reward?.coins) || 0), 0);
}

/** Number of achievements awarding a tool. */
export function toolAwardCount({ achievements = ACHIEVEMENTS } = {}) {
  return (Array.isArray(achievements) ? achievements : [])
    .filter((a) => a?.reward?.tools && Object.keys(a.reward.tools).length > 0).length;
}
