import { QUEST_TEMPLATES } from "./templates.js";
import { claimQuest, tickQuest } from "./data.js";
import type { Quest, QuestEvent } from "./data.js";
import { awardXp, claimAlmanacTier } from "../almanac/data.js";
import type { Action, GameState } from "../../types/state.js";

interface LegacyDaily {
  id: string;
  label: string;
  target: number;
  progress: number;
  done: boolean;
  claimed: boolean;
  reward: { coins?: number; almanacXp?: number; [k: string]: unknown };
  key: string;
}

interface QuestsSubstate {
  dailies: LegacyDaily[];
  dailyDay: number;
  almanacXp: number;
  almanacTier: number;
  almanacClaimed: number[];
}

type QuestsGameState = GameState & Partial<QuestsSubstate>;

let _questIdSeq = 1;

export function seedQuestIdSeq(savedDailies: LegacyDaily[] | null | undefined): void {
  for (const q of (savedDailies || [])) {
    const n = parseInt((q.id || "").slice(1), 10);
    if (!isNaN(n) && n >= _questIdSeq) _questIdSeq = n + 1;
  }
}

interface LegacyTemplate {
  label: string;
  target: number;
  reward: { coins?: number; almanacXp?: number; [k: string]: unknown };
  key: string;
}

function rollFresh(): LegacyDaily[] {
  // QUEST_TEMPLATES is the typed pool used by the deterministic system. The
  // legacy `dailies` slice rolls 3 templates randomly with whatever shape they
  // expose; cast to the legacy template shape for the fields we read here.
  const pool = [...(QUEST_TEMPLATES as unknown as LegacyTemplate[])];
  const picks: LegacyDaily[] = [];
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

export const initial: QuestsSubstate = {
  dailies: rollFresh(),
  dailyDay: 0,
  almanacXp: 0,
  almanacTier: 0,
  almanacClaimed: [],
};

function progressQuests(dailies: LegacyDaily[], key: string, amount: number): LegacyDaily[] {
  return dailies.map((q) => {
    if (q.key !== key || q.done || q.claimed) return q;
    const next = Math.min(q.target, q.progress + amount);
    return { ...q, progress: next, done: next >= q.target };
  });
}

export function reduce(state: QuestsGameState, action: Action): GameState {
  switch (action.type) {
    case "QUESTS/PROGRESS_QUEST": {
      const key = action.key as string;
      const amount = action.amount as number;
      return { ...state, dailies: progressQuests(state.dailies || [], key, amount) };
    }
    case "QUESTS/CLAIM_QUEST": {
      const id = action.id as string;

      // New system: look in state.quests first (deterministic 6-slot system)
      const quests = (state.quests || []) as Quest[];
      if (quests.some((q) => q.id === id)) {
        const result = claimQuest(state, id);
        if (!result.ok) return state;
        // Award almanac XP: §17 locked: 20 XP per quest claim
        const { newState: afterXp } = awardXp(result.newState, result.xpGain);
        return afterXp;
      }

      // Legacy system: look in state.dailies (3-slot)
      const dailiesIn = state.dailies || [];
      const q = dailiesIn.find((x) => x.id === id);
      if (!q || !q.done || q.claimed) return state;
      const dailies = dailiesIn.map((x) =>
        x.id === id ? { ...x, claimed: true } : x
      );
      const legacyXp = q.reward.almanacXp || 0;
      let afterLegacy: GameState = {
        ...state,
        dailies,
        coins: (state.coins || 0) + (q.reward.coins || 0),
      };
      if (typeof legacyXp === "number" && legacyXp > 0) {
        const { newState: afterXp } = awardXp(afterLegacy, legacyXp);
        afterLegacy = afterXp;
      }
      return afterLegacy;
    }
    case "QUESTS/CLAIM_ALMANAC": {
      const tier = action.tier as number;
      // Ensure almanac state is initialised so claimAlmanacTier can read it
      const stateWithAlmanac: GameState = state.almanac
        ? state
        : { ...state, almanac: { xp: state.almanacXp ?? 0, level: 1, claimed: {} } };
      // Migrate legacy almanacXp into canonical almanac.xp if needed
      const legacyXp = (stateWithAlmanac as QuestsGameState).almanacXp ?? 0;
      const migratedState: GameState = legacyXp > 0 && !stateWithAlmanac.almanac?.xp
        ? { ...stateWithAlmanac, almanac: { ...stateWithAlmanac.almanac, xp: legacyXp } }
        : stateWithAlmanac;
      const { ok, newState } = claimAlmanacTier(migratedState, tier);
      if (!ok) return state;
      // Keep legacy almanacClaimed in sync for backward compat with UI
      const almanacClaimed = [...(state.almanacClaimed || [])];
      if (!almanacClaimed.includes(tier)) almanacClaimed.push(tier);
      return { ...newState, almanacClaimed };
    }
    case "CHAIN_COLLECTED": {
      const payload = (action.payload ?? {}) as {
        chain?: { key: string }[];
        gained?: number;
        chainLength?: number;
        key?: string;
        value?: number;
      };
      const chainOnly = payload.chain;
      if (Array.isArray(chainOnly) && chainOnly.length > 0 && chainOnly.every((t) => t.key === "rat")) {
        return state;
      }
      const { gained = 0, chainLength = 0, key: chainKey = "" } = payload;
      // Legacy dailies
      let dailies = state.dailies || [];
      dailies = progressQuests(dailies, "harvest", gained);
      if (chainLength >= 5) {
        dailies = progressQuests(dailies, "chain5", 1);
      }
      const coinsGain = Math.max(1, Math.floor((gained * (payload.value || 1)) / 2));
      dailies = dailies.map((q) => {
        if (q.key !== "coins" || q.done || q.claimed) return q;
        const next = Math.min(q.target, q.progress + coinsGain);
        return { ...q, progress: next, done: next >= q.target };
      });
      // New deterministic quests: tick with collect + chain events
      const collectEvent: QuestEvent = { type: "collect", key: chainKey, amount: gained };
      const chainEvent: QuestEvent = { type: "chain", length: chainLength };
      const newQuests = ((state.quests || []) as Quest[]).map((q) => {
        let ticked = tickQuest(q, collectEvent);
        ticked = tickQuest(ticked, chainEvent);
        return ticked;
      });
      return { ...state, dailies, quests: newQuests };
    }
    case "TURN_IN_ORDER": {
      const orderId = action.id;
      const order = (state.orders || []).find((o) => o.id === orderId);
      const needed = (order?.need ?? order?.amount) ?? 0;
      if (!order || ((state.inventory || {})[order.key] || 0) < needed) return state;
      // Legacy dailies
      const dailies = progressQuests(state.dailies || [], "deliver", 1);
      // New deterministic quests
      const orderEvent: QuestEvent = { type: "order" };
      const newQuests = ((state.quests || []) as Quest[]).map((q) => tickQuest(q, orderEvent));
      return { ...state, dailies, quests: newQuests };
    }
    case "BUILD": {
      const dailies = progressQuests(state.dailies || [], "build", 1);
      return { ...state, dailies };
    }
    case "CRAFTING/CRAFT_RECIPE": {
      const payload = (action.payload ?? {}) as { key?: string };
      const craftKey = payload.key ?? "";
      const dailies = progressQuests(state.dailies || [], "craft", 1);
      // New deterministic quests
      const craftEvent: QuestEvent = { type: "craft", item: craftKey, count: 1 };
      const newQuests = ((state.quests || []) as Quest[]).map((q) => tickQuest(q, craftEvent));
      return { ...state, dailies, quests: newQuests };
    }
    case "CLOSE_SEASON": {
      // Legacy dailies re-roll (CLOSE_SEASON in quests/slice — note: state.quests
      // re-roll happens in coreReducer which runs before this slice)
      return { ...state, dailies: rollFresh(), dailyDay: (state.dailyDay || 0) + 1 };
    }
    default:
      return state;
  }
}
