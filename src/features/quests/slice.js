import { QUEST_TEMPLATES, ALMANAC_TIERS } from "../../constants.js";
import { claimQuest } from "./data.js";
import { awardXp } from "../almanac/data.js";

let _questIdSeq = 1;

export function seedQuestIdSeq(savedDailies) {
  for (const q of (savedDailies || [])) {
    const n = parseInt((q.id || "").slice(1), 10);
    if (!isNaN(n) && n >= _questIdSeq) _questIdSeq = n + 1;
  }
}

function rollFresh() {
  const pool = [...QUEST_TEMPLATES];
  const picks = [];
  while (picks.length < 3 && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    const tpl = pool.splice(idx, 1)[0];
    picks.push({
      id: `q${_questIdSeq++}`,
      label: tpl.label,
      target: tpl.target,
      progress: 0,
      done: false,
      claimed: false,
      reward: { ...tpl.reward },
      key: tpl.key,
    });
  }
  return picks;
}

export const initial = {
  dailies: rollFresh(),
  dailyDay: 0,
  almanacXp: 0,
  almanacTier: 0,
  almanacClaimed: [],
};

function progressQuests(dailies, key, amount) {
  return dailies.map((q) => {
    if (q.key !== key || q.done || q.claimed) return q;
    const next = Math.min(q.target, q.progress + amount);
    return { ...q, progress: next, done: next >= q.target };
  });
}

export function reduce(state, action) {
  switch (action.type) {
    case "QUESTS/ROLL_DAILIES": {
      return { ...state, dailies: rollFresh(), dailyDay: (state.dailyDay || 0) + 1 };
    }
    case "QUESTS/PROGRESS_QUEST": {
      const { key, amount } = action;
      return { ...state, dailies: progressQuests(state.dailies || [], key, amount) };
    }
    case "QUESTS/CLAIM_QUEST": {
      const { id } = action;

      // New system: look in state.quests first (deterministic 6-slot system)
      if ((state.quests || []).some((q) => q.id === id)) {
        const result = claimQuest(state, id);
        if (!result.ok) return state;
        // Award almanac XP: §17 locked: 20 XP per quest claim
        const { newState: afterXp } = awardXp(result.newState, result.xpGain);
        return afterXp;
      }

      // Legacy system: look in state.dailies (3-slot)
      const q = (state.dailies || []).find((x) => x.id === id);
      if (!q || !q.done || q.claimed) return state;
      const dailies = (state.dailies || []).map((x) =>
        x.id === id ? { ...x, claimed: true } : x
      );
      const afterLegacy = {
        ...state,
        dailies,
        coins: (state.coins || 0) + (q.reward.coins || 0),
        almanacXp: (state.almanacXp || 0) + (q.reward.almanacXp || 0),
      };
      // Also award almanac XP to canonical almanac slice
      const legacyXp = q.reward.almanacXp || 0;
      if (legacyXp > 0) {
        const { newState: afterXp } = awardXp(afterLegacy, legacyXp);
        return afterXp;
      }
      return afterLegacy;
    }
    case "QUESTS/CLAIM_ALMANAC": {
      const { tier } = action;
      const tierDef = ALMANAC_TIERS[tier - 1];
      if (!tierDef) return state;
      const cost = tier * 100;
      if ((state.almanacXp || 0) < cost) return state;
      if ((state.almanacClaimed || []).includes(tier)) return state;
      const almanacClaimed = [...(state.almanacClaimed || []), tier];
      let coins = state.coins || 0;
      let tools = { ...state.tools };
      if (tierDef.reward.coins) coins += tierDef.reward.coins;
      if (tierDef.reward.tool) {
        tools[tierDef.reward.tool] = (tools[tierDef.reward.tool] || 0) + (tierDef.reward.amt || 1);
      }
      return { ...state, almanacClaimed, coins, tools };
    }
    case "CHAIN_COLLECTED": {
      const { gained = 0, chainLength = 0 } = action.payload || {};
      let dailies = state.dailies || [];
      dailies = progressQuests(dailies, "harvest", gained);
      if (chainLength >= 5) {
        dailies = progressQuests(dailies, "chain5", 1);
      }
      const coinsGain = Math.max(1, Math.floor((gained * (action.payload?.value || 1)) / 2));
      dailies = dailies.map((q) => {
        if (q.key !== "coins" || q.done || q.claimed) return q;
        const next = Math.min(q.target, q.progress + coinsGain);
        return { ...q, progress: next, done: next >= q.target };
      });
      return { ...state, dailies };
    }
    case "TURN_IN_ORDER": {
      const order = (state.orders || []).find((o) => o.id === action.id);
      if (!order || ((state.inventory || {})[order.key] || 0) < order.need) return state;
      const dailies = progressQuests(state.dailies || [], "deliver", 1);
      return { ...state, dailies };
    }
    case "BUILD": {
      const dailies = progressQuests(state.dailies || [], "build", 1);
      return { ...state, dailies };
    }
    case "CRAFTING/CRAFT_RECIPE": {
      const dailies = progressQuests(state.dailies || [], "craft", 1);
      return { ...state, dailies };
    }
    case "CLOSE_SEASON": {
      return { ...state, dailies: rollFresh(), dailyDay: (state.dailyDay || 0) + 1 };
    }
    default:
      return state;
  }
}
