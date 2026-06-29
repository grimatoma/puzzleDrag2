/**
 * Phase 7.1 — Pure quest helpers: rollQuests, tickQuest, claimQuest.
 */
import { QUEST_TEMPLATES } from "./templates.js";
import { tileFamilyResource } from "../../constants.js";
import type { GameState } from "../../types/state.js";
import type { BoardKind } from "../cartography/data.js";

export interface QuestTemplate {
  id: string;
  category: "collect" | "craft" | "order" | "tool" | "chain";
  key?: string;
  item?: string;
  tool?: string;
  minLength?: number;
  label: string;
  /** Short in-world commission line shown beneath the title on the board. */
  flavor?: string;
  /**
   * Board biome this quest's target lives in. Templates with no `biome` are
   * always offered (the home farm — always reachable — or biome-agnostic tasks
   * like orders, tool use, and chains). Templates tagged `fish`/`mine` are only
   * rolled once the player has travelled to a node of that biome.
   */
  biome?: BoardKind;
  targetMin: number;
  targetMax: number;
  coinBase: number;
  coinPerUnit: number;
}

export interface QuestReward {
  coins: number;
  xp: number;
}

export interface Quest {
  id: string;
  template: string;
  category: QuestTemplate["category"];
  key?: string;
  item?: string;
  tool?: string;
  minLength?: number;
  target: number;
  progress: number;
  claimed: boolean;
  reward: QuestReward;
}

export type QuestEvent =
  | { type: "collect"; key: string; amount?: number }
  | { type: "craft"; item: string; count?: number }
  | { type: "order" }
  | { type: "tool"; tool: string }
  | { type: "chain"; length: number };

// ── Mulberry32 seeded PRNG ─────────────────────────────────────────────────────
// Deterministic from a string seed. Mirrors the pattern used in market.js.
function rngFrom(seedStr: string): () => number {
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
 *
 * `accessibleBiomes`, when provided, restricts the pool to quests the player
 * can actually fulfil: a template is offered only if it has no `biome` (farm /
 * biome-agnostic) or its `biome` is in the list. Omitting the argument keeps
 * the full pool (used by callers that pre-filter, and by older tests).
 */
export function rollQuests(
  saveSeed: string,
  year: number,
  season: number | string,
  accessibleBiomes?: readonly string[],
): Quest[] {
  const rng = rngFrom(`${saveSeed}|${year}|${season}`);
  let pool: QuestTemplate[] = [...(QUEST_TEMPLATES as QuestTemplate[])];
  if (accessibleBiomes) {
    const allow = new Set(accessibleBiomes);
    pool = pool.filter((t) => !t.biome || allow.has(t.biome));
  }
  const out: Quest[] = [];
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
        xp: QUEST_CLAIM_XP,
      },
    });
  }
  return out;
}

/**
 * Pure: returns a new quest with updated progress for the given event.
 * No mutation.
 */
export function tickQuest(quest: Quest, event: QuestEvent): Quest {
  if (quest.claimed) return quest;
  let inc = 0;

  // Collect templates store either a tile key ("tile_grass_grass") or a
  // resource key ("flour"), but the live CHAIN_COLLECTED event always carries
  // the produced *resource* key (e.g. "hay_bundle"). Match on the raw key for
  // resource-keyed templates, and on the tile→resource mapping for tile-keyed
  // ones, so both flavours of template actually tick in real play.
  if (
    event.type === "collect" &&
    quest.category === "collect" &&
    (quest.key === event.key || tileFamilyResource(quest.key ?? "") === event.key)
  ) {
    inc = event.amount ?? 1;
  } else if (event.type === "craft" && quest.category === "craft" && quest.item === event.item) {
    inc = event.count ?? 1;
  } else if (event.type === "order" && quest.category === "order") {
    inc = 1;
  } else if (event.type === "tool" && quest.category === "tool" && quest.tool === event.tool) {
    inc = 1;
  } else if (
    event.type === "chain" &&
    quest.category === "chain" &&
    quest.minLength != null &&
    event.length >= quest.minLength
  ) {
    inc = 1;
  }

  if (!inc) return quest;
  return { ...quest, progress: Math.min(quest.target, quest.progress + inc) };
}

/** §17 locked: 20 almanac XP per quest claim (legacy dailies + deterministic quests). */
export const QUEST_CLAIM_XP = 20;

export interface ClaimQuestResult {
  ok: boolean;
  newState: GameState;
  xpGain: number;
}

/**
 * Pure: claim a quest by id.
 * Returns { ok, newState, xpGain }.
 * xpGain is handled by 7.2 (awardXp).
 */
export function claimQuest(state: GameState, questId: string): ClaimQuestResult {
  const quests = (state.quests ?? []) as Quest[];
  const q = quests.find((qq) => qq.id === questId);
  if (!q || q.claimed || q.progress < q.target) {
    return { ok: false, newState: state, xpGain: 0 };
  }
  return {
    ok: true,
    xpGain: q.reward.xp, // 7.2 wires this into almanac
    newState: {
      ...state,
      coins: state.coins + q.reward.coins,
      quests: quests.map((qq) =>
        qq.id === questId ? { ...qq, claimed: true } : qq
      ),
    },
  };
}
