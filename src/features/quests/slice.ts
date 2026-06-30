import { QUEST_TEMPLATES } from "./templates.js";
import { QUEST_CLAIM_XP, claimQuest, grantQuestRewardExtras, isQuestComplete, questTitle, tickQuest } from "./data.js";
import type { Quest, QuestEvent, QuestTemplate } from "./data.js";
import { awardXp, claimAlmanacTier } from "../almanac/data.js";
import { appendToasts, nextToastId } from "../toasts/data.js";
import type { Toast } from "../toasts/data.js";
import { inventoryQty } from "../../types/inventory.js";
import { zoneInventory } from "../../state/zoneInventory.js";
import type { Action, GameState, QuestDailyLegacy } from "../../types/state.js";

interface QuestsSubstate {
  dailies: QuestDailyLegacy[];
  dailyDay: number;
  almanacXp: number;
  almanacTier: number;
  almanacClaimed: number[];
}

let _questIdSeq = 1;

export function seedQuestIdSeq(savedDailies: QuestDailyLegacy[] | null | undefined): void {
  for (const q of (savedDailies || [])) {
    const n = parseInt((q.id || "").slice(1), 10);
    if (!isNaN(n) && n >= _questIdSeq) _questIdSeq = n + 1;
  }
}

function rollFresh(): QuestDailyLegacy[] {
  const pool = [...QUEST_TEMPLATES] as QuestTemplate[];
  const picks: QuestDailyLegacy[] = [];
  while (picks.length < 3 && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    const tpl = pool.splice(idx, 1)[0];
    const target = tpl.targetMin + Math.floor(Math.random() * (tpl.targetMax - tpl.targetMin + 1));
    const key = tpl.key ?? tpl.item ?? tpl.tool ?? "";
    picks.push({
      id: `q${_questIdSeq++}`,
      label: tpl.label,
      target,
      progress: 0,
      done: false,
      claimed: false,
      reward: {
        coins: tpl.coinBase,
        ...(tpl.rewardTools ? { tools: tpl.rewardTools } : {}),
        ...(tpl.rewardItems ? { items: tpl.rewardItems } : {}),
        ...(tpl.rewardRunes ? { runes: tpl.rewardRunes } : {}),
        ...(tpl.rewardUnlockTile ? { unlockTile: tpl.rewardUnlockTile } : {}),
        ...(tpl.rewardUnlockBuilding ? { unlockBuilding: tpl.rewardUnlockBuilding } : {}),
      },
      key,
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

function progressQuests(dailies: QuestDailyLegacy[], key: string, amount: number): QuestDailyLegacy[] {
  return dailies.map((q) => {
    if (q.key !== key || q.done || q.claimed) return q;
    const next = Math.min(q.target, q.progress + amount);
    return { ...q, progress: next, done: next >= q.target };
  });
}

/**
 * Build a "quest complete!" toast for every deterministic quest that crossed
 * from in-progress to done between `prev` and `next`. Matches quests by id so a
 * quest only ever toasts on the transition, never again on later ticks. Already
 * claimed quests are skipped.
 */
function completionToasts(prev: Quest[], next: Quest[]): Toast[] {
  const wasDone = new Map(prev.map((q) => [q.id, isQuestComplete(q)]));
  const out: Toast[] = [];
  for (const q of next) {
    if (q.claimed || !isQuestComplete(q)) continue;
    if (wasDone.get(q.id)) continue; // already finished before this action
    out.push({
      id: nextToastId(),
      title: "Quest complete!",
      message: questTitle(q),
      icon: "quest_book",
      tone: "gold",
    });
  }
  return out;
}

/**
 * Tick the deterministic `state.quests` with one or more events, then enqueue a
 * completion toast for any quest that just finished. Returns the next quest list
 * plus the (possibly unchanged) toast queue so callers can spread both at once.
 */
function tickQuestsWithToasts(
  state: GameState,
  events: QuestEvent[],
): { quests: Quest[]; toasts: Toast[] } {
  const prev = (state.quests ?? []) as Quest[];
  const nextQuests = prev.map((q) => events.reduce((acc, ev) => tickQuest(acc, ev), q));
  const toasts = appendToasts(state.toasts, completionToasts(prev, nextQuests));
  return { quests: nextQuests, toasts };
}

export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "QUESTS/PROGRESS_QUEST": {
      const { key, amount } = action;
      return { ...state, dailies: progressQuests(state.dailies, key, amount) };
    }
    case "QUESTS/CLAIM_QUEST": {
      const { id } = action;

      // New system: look in state.quests first (deterministic 6-slot system)
      const quests = state.quests;
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
      const afterCoins: GameState = {
        ...state,
        dailies,
        coins: (state.coins || 0) + (q.reward.coins || 0),
      };
      const afterExtras = grantQuestRewardExtras(
        afterCoins,
        q.reward as { tools?: Record<string, number>; items?: Record<string, number> },
      );
      const { newState: afterXp } = awardXp(afterExtras, QUEST_CLAIM_XP);
      return afterXp;
    }
    case "QUESTS/CLAIM_ALMANAC": {
      const { tier } = action;
      // Ensure almanac state is initialised so claimAlmanacTier can read it
      const stateWithAlmanac: GameState = state.almanac
        ? state
        : { ...state, almanac: { xp: state.almanacXp ?? 0, level: 1, claimed: {} } };
      // Migrate legacy almanacXp into canonical almanac.xp if needed
      const legacyXp = stateWithAlmanac.almanacXp ?? 0;
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
      const payload = action.payload;
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
      const { quests: newQuests, toasts } = tickQuestsWithToasts(state, [collectEvent, chainEvent]);
      return { ...state, dailies, quests: newQuests, toasts };
    }
    case "TURN_IN_ORDER": {
      const orderId = action.id;
      const order = (state.orders || []).find((o) => o.id === orderId);
      const needed = (order?.need ?? order?.amount) ?? 0;
      if (!order || inventoryQty(zoneInventory(state), order.key) < needed) return state;
      // Legacy dailies
      const dailies = progressQuests(state.dailies || [], "deliver", 1);
      // New deterministic quests
      const { quests: newQuests, toasts } = tickQuestsWithToasts(state, [{ type: "order" }]);
      return { ...state, dailies, quests: newQuests, toasts };
    }
    case "BUILD": {
      const dailies = progressQuests(state.dailies || [], "build", 1);
      return { ...state, dailies };
    }
    case "CRAFTING/CRAFT_RECIPE": {
      const craftKey = action.payload?.key ?? action.recipeKey ?? "";
      const dailies = progressQuests(state.dailies || [], "craft", 1);
      // New deterministic quests
      const craftEvent: QuestEvent = { type: "craft", item: craftKey, count: 1 };
      const { quests: newQuests, toasts } = tickQuestsWithToasts(state, [craftEvent]);
      return { ...state, dailies, quests: newQuests, toasts };
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
