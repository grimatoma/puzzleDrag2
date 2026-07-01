/**
 * Phase 7.1 — Pure quest helpers: rollQuests, tickQuest, claimQuest.
 */
import { QUEST_TEMPLATES } from "./templates.js";
import { tileFamilyResource, BUILDINGS } from "../../constants.js";
import { inventoryAdd } from "../../types/inventory.js";
import { updateZoneInventory } from "../../state/zoneInventory.js";
import { defaultTileCollectionSlice } from "../../state/helpers.js";
import { TILE_TYPES_MAP } from "../tileCollection/data.js";
import { nextToastId } from "../toasts/data.js";
import type { Toast } from "../toasts/data.js";
import type { InventoryKey } from "../../types/catalogKeys.js";
import type { GameState } from "../../types/state.js";
import type { BoardKind } from "../cartography/data.js";

const BUILDING_IDS = new Set((BUILDINGS as ReadonlyArray<{ id: string }>).map((b) => b.id));

function buildingLabel(id: string): string {
  return (BUILDINGS as ReadonlyArray<{ id: string; name?: string }>).find((b) => b.id === id)?.name ?? id;
}

function tileLabel(id: string): string {
  return (TILE_TYPES_MAP as Record<string, { displayName?: string } | undefined>)[id]?.displayName ?? id;
}

/**
 * Build celebration toasts for any *new* unlock a claim produced, by diffing the
 * pre- and post-grant state. Diffing (rather than reading the reward directly)
 * means a toast only ever fires for a genuine unlock: an invalid building id, an
 * already-discovered tile, or a re-claim all produce no diff and so no toast.
 * Shared by the deterministic and legacy claim paths.
 */
export function questUnlockToasts(before: GameState, after: GameState): Toast[] {
  const out: Toast[] = [];

  const beforeBld = new Set(before.questUnlockedBuildings ?? []);
  for (const id of after.questUnlockedBuildings ?? []) {
    if (beforeBld.has(id)) continue;
    out.push({
      id: nextToastId(),
      title: "Building unlocked!",
      message: `${buildingLabel(id)} — build it anywhere`,
      icon: `bld_${id}`,
      tone: "moss",
    });
  }

  const beforeTiles = before.tileCollection?.discovered ?? {};
  const afterTiles = after.tileCollection?.discovered ?? {};
  for (const id of Object.keys(afterTiles)) {
    if (!afterTiles[id] || beforeTiles[id]) continue;
    out.push({
      id: nextToastId(),
      title: "New tile discovered!",
      message: tileLabel(id),
      icon: id,
      tone: "gold",
    });
  }

  return out;
}

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
  /** Tools granted when this quest is claimed, keyed by tool id → count (e.g. `{ basic: 2, rare: 1 }`). */
  rewardTools?: Record<string, number>;
  /** Resource items granted to the active zone inventory on claim, keyed by resource key → count. */
  rewardItems?: Record<string, number>;
  /** Runes granted on claim. */
  rewardRunes?: number;
  /** Tile key to mark discovered on claim (e.g. `"tile_cattle_triceratops"`). */
  rewardUnlockTile?: string;
  /** Building id to make buildable on claim (e.g. `"mill"`). The player still pays its cost. */
  rewardUnlockBuilding?: string;
}

export interface QuestReward {
  coins: number;
  xp: number;
  /** Tools granted on claim, keyed by tool id → count. */
  tools?: Record<string, number>;
  /** Resource items granted on claim (to the active zone inventory), keyed by resource key → count. */
  items?: Record<string, number>;
  /** Runes granted on claim. */
  runes?: number;
  /** Permanent structural perk latched on claim. */
  structural?: string;
  /** Tile key marked discovered on claim. */
  unlockTile?: string;
  /** Building id made buildable on claim. */
  unlockBuilding?: string;
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
 * Build a concrete {@link Quest} from a template, a chosen target, and a stable
 * id. Coins scale with the target; the reward bundle carries over whichever
 * optional grants the template declares. Shared by {@link rollQuests} (random
 * board) and {@link showcaseQuests} (the fixed starter set) so both paths mint
 * identically-shaped quests.
 */
function questFromTemplate(tpl: QuestTemplate, target: number, id: string): Quest {
  return {
    id,
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
      ...(tpl.rewardTools ? { tools: tpl.rewardTools } : {}),
      ...(tpl.rewardItems ? { items: tpl.rewardItems } : {}),
      ...(tpl.rewardRunes ? { runes: tpl.rewardRunes } : {}),
      ...(tpl.rewardUnlockTile ? { unlockTile: tpl.rewardUnlockTile } : {}),
      ...(tpl.rewardUnlockBuilding ? { unlockBuilding: tpl.rewardUnlockBuilding } : {}),
    },
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
    out.push(questFromTemplate(tpl, target, `${tpl.id}-${year}-${season}-${out.length}`));
  }
  return out;
}

/**
 * A fixed, hand-picked starter board that showcases every quest *type* and the
 * distinct reward-card styles, so a fresh game immediately shows the full range:
 * a plain building unlock (framed gold row + tools), a tile unlock (framed green
 * row + rune), and one basic card per remaining category (collect / craft /
 * order / tool). These are real, fully-functional quests — they tick and claim
 * exactly like a rolled quest — not mock data. Every pick is farm-fulfillable
 * (orders and chains are biome-agnostic to complete), and the board re-rolls
 * normally via {@link rollQuests} once the first season turns.
 *
 * Targets are clamped into each template's authored [targetMin, targetMax].
 */
export function showcaseQuests(): Quest[] {
  // Lead with the two eye-catching unlock cards, then one of each basic type.
  const picks: Array<{ id: string; target: number }> = [
    { id: "raise_the_mill", target: 3 },     // order → building unlock + tools
    { id: "bones_back_forty", target: 2 },   // chain → tile unlock + rune + tool
    { id: "collect_hay", target: 30 },       // collect (Gather)
    { id: "craft_bread", target: 3 },        // craft  (Craft)
    { id: "orders_any", target: 4 },         // order  (Deliver)
    { id: "tool_scythe", target: 3 },        // tool   (Toil)
  ];
  const byId = new Map((QUEST_TEMPLATES as QuestTemplate[]).map((t) => [t.id, t]));
  const out: Quest[] = [];
  picks.forEach((p, i) => {
    const tpl = byId.get(p.id);
    if (!tpl) return;
    const target = Math.min(Math.max(p.target, tpl.targetMin), tpl.targetMax);
    out.push(questFromTemplate(tpl, target, `showcase-${tpl.id}-${i}`));
  });
  return out;
}

/**
 * Human-readable quest title. Prefers the template's authored label (with the
 * `{n}` placeholder filled by the target), falling back to the category name.
 * Shared by the toast notifications and any caller that needs a one-liner.
 */
export function questTitle(quest: Pick<Quest, "template" | "category" | "target">): string {
  const tpl = QUEST_TEMPLATES.find((t) => t.id === quest.template);
  if (tpl?.label) return tpl.label.replace("{n}", String(quest.target));
  return `${quest.category} commission`;
}

/**
 * A quest is "done" once progress reaches its target. The deterministic system
 * has no explicit `done` flag (unlike legacy dailies), so this is the canonical
 * completion test.
 */
export function isQuestComplete(quest: Pick<Quest, "progress" | "target">): boolean {
  return quest.progress >= quest.target;
}

/**
 * Count of quests that are finished but whose reward has not been claimed —
 * drives the Quests-tab notification badge. Reads the live deterministic
 * `state.quests`, falling back to legacy `dailies` only when no deterministic
 * quests exist (matching the quest screen's display logic).
 */
export function claimableQuestCount(state: GameState): number {
  const quests = (state.quests ?? []) as Quest[];
  if (quests.length > 0) {
    return quests.filter((q) => !q.claimed && isQuestComplete(q)).length;
  }
  const dailies = ((state as { dailies?: Array<{ claimed?: boolean; done?: boolean; progress: number; target: number }> }).dailies) ?? [];
  return dailies.filter((d) => !d.claimed && (d.done ?? d.progress >= d.target)).length;
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

/**
 * Pure: apply a quest reward's non-coin bundles to state. Tools are global
 * counters; items land in the active zone's inventory; runes add to the rune
 * balance; a structural perk is latched as a flag; an unlockTile marks the tile
 * discovered; an unlockBuilding makes the building buildable anywhere (the player
 * still pays its cost). Returns `state` unchanged when the reward carries none of
 * these. Shared by the deterministic `claimQuest` and the legacy daily claim path
 * so authored rewards never silently drop depending on which system is showing.
 *
 * Coins and almanac XP are granted by the callers (they flow through different
 * paths), so they are deliberately not handled here.
 */
export function grantQuestRewardExtras(
  state: GameState,
  reward:
    | {
        tools?: Record<string, number>;
        items?: Record<string, number>;
        runes?: number;
        structural?: string;
        unlockTile?: string;
        unlockBuilding?: string;
      }
    | null
    | undefined,
): GameState {
  let next = state;
  if (reward?.tools) {
    const nextTools = { ...(next.tools as Record<string, number | boolean | undefined>) };
    for (const [k, v] of Object.entries(reward.tools)) {
      nextTools[k] = ((nextTools[k] as number | undefined) ?? 0) + v;
    }
    next = { ...next, tools: nextTools } as GameState;
  }
  if (reward?.items) {
    const items = reward.items;
    next = updateZoneInventory(next, (inv) => {
      let out = inv;
      for (const [k, v] of Object.entries(items)) {
        out = inventoryAdd(out, k as InventoryKey, v);
      }
      return out;
    });
  }
  if (reward?.runes) {
    next = { ...next, runes: (next.runes ?? 0) + reward.runes } as GameState;
  }
  if (reward?.structural) {
    // Structural perks are latched as flags in state.tools (matching the almanac
    // claim path) so game logic can check them.
    next = {
      ...next,
      tools: { ...(next.tools as Record<string, number | boolean | undefined>), [reward.structural]: true },
    } as GameState;
  }
  if (reward?.unlockTile && (TILE_TYPES_MAP as Record<string, unknown>)[reward.unlockTile]) {
    const tc = next.tileCollection ?? defaultTileCollectionSlice();
    if (!tc.discovered?.[reward.unlockTile]) {
      next = {
        ...next,
        tileCollection: { ...tc, discovered: { ...(tc.discovered ?? {}), [reward.unlockTile]: true } },
      } as GameState;
    }
  }
  if (reward?.unlockBuilding && BUILDING_IDS.has(reward.unlockBuilding)) {
    const cur = next.questUnlockedBuildings ?? [];
    if (!cur.includes(reward.unlockBuilding)) {
      next = { ...next, questUnlockedBuildings: [...cur, reward.unlockBuilding] } as GameState;
    }
  }
  return next;
}

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
  const withCoins: GameState = {
    ...state,
    coins: state.coins + q.reward.coins,
    quests: quests.map((qq) =>
      qq.id === questId ? { ...qq, claimed: true } : qq
    ),
  };
  return {
    ok: true,
    xpGain: q.reward.xp, // 7.2 wires this into almanac
    newState: grantQuestRewardExtras(withCoins, q.reward),
  };
}
