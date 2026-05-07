/**
 * Phase 7.1 — Pure quest helpers: rollQuests, tickQuest, claimQuest.
 */
import { QUEST_TEMPLATES } from "./templates.js";

// ── Mulberry32 seeded PRNG ─────────────────────────────────────────────────────
// Deterministic from a string seed. Mirrors the pattern used in market.js.
function rngFrom(seedStr) {
  // FNV-1a hash to get an initial 32-bit integer from the string
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Roll 6 quests deterministically from (saveSeed, year, season).
 * Same inputs always produce the same 6 quests.
 */
export function rollQuests(saveSeed, year, season) {
  const rng = rngFrom(`${saveSeed}|${year}|${season}`);
  const pool = [...QUEST_TEMPLATES];
  const out = [];
  while (out.length < 6 && pool.length) {
    const idx = Math.floor(rng() * pool.length);
    const tpl = pool.splice(idx, 1)[0];
    const range = tpl.targetMax - tpl.targetMin;
    const target = tpl.targetMin + Math.floor(rng() * (range + 1));
    out.push({
      id: `${tpl.id}-${year}-${season}-${out.length}`,
      template: tpl.id,
      category: tpl.category,
      key: tpl.key,
      item: tpl.item,
      tool: tpl.tool,
      minLength: tpl.minLength,
      target,
      progress: 0,
      claimed: false,
      reward: {
        coins: tpl.coinBase + Math.floor(target * tpl.coinPerUnit),
        xp: 20, // §17 locked: 20 XP per quest claim
      },
    });
  }
  return out;
}

/**
 * Pure: returns a new quest with updated progress for the given event.
 * No mutation.
 */
export function tickQuest(quest, event) {
  if (quest.claimed) return quest;
  let inc = 0;

  if (event.type === "collect" && quest.category === "collect" && quest.key === event.key) {
    inc = event.amount ?? 1;
  } else if (event.type === "craft" && quest.category === "craft" && quest.item === event.item) {
    inc = event.count ?? 1;
  } else if (event.type === "order" && quest.category === "order") {
    inc = 1;
  } else if (event.type === "tool" && quest.category === "tool" && quest.tool === event.tool) {
    inc = 1;
  } else if (event.type === "chain" && quest.category === "chain" && event.length >= quest.minLength) {
    inc = 1;
  }

  if (!inc) return quest;
  return { ...quest, progress: Math.min(quest.target, quest.progress + inc) };
}

/**
 * Pure: claim a quest by id.
 * Returns { ok, newState, xpGain }.
 * xpGain is handled by 7.2 (awardXp).
 */
export function claimQuest(state, questId) {
  const q = (state.quests ?? []).find((qq) => qq.id === questId);
  if (!q || q.claimed || q.progress < q.target) {
    return { ok: false, newState: state, xpGain: 0 };
  }
  return {
    ok: true,
    xpGain: q.reward.xp, // 7.2 wires this into almanac
    newState: {
      ...state,
      coins: state.coins + q.reward.coins,
      quests: state.quests.map((qq) =>
        qq.id === questId ? { ...qq, claimed: true } : qq
      ),
    },
  };
}
