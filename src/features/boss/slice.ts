import { RECIPES } from "../../constants.js";
import { BOSSES, BOSS_WINDOW_TURNS, bossReward as bossRewardFn, spawnBoss } from "../bosses/data.js";
import { tickModifier } from "../bosses/modifiers.js";
import { awardXp } from "../almanac/data.js";
import { BOSS_UI } from "./uiMeta.js";
import type { Action, GameState } from "../../types/state.js";

const YEAR_BOSS_ROTATION = ["frostmaw", "quagmire", "ember_drake", "old_stoneface", "mossback", "storm"];

export interface BossState {
  key: string;
  name?: string;
  emoji?: string;
  flavor?: string;
  goal?: string;
  description?: string | null;
  modifierDescription?: string | null;
  resource?: string;
  targetCount: number;
  progress: number;
  turnsLeft: number;
  turnsRemaining?: number;
  minChain?: number | null;
  spawnBias?: Record<string, number> | null;
  modifier?: BossModifier;
  isKeeperTrial?: boolean;
  id?: string;
}

export interface BossModifier {
  type?: string;
  params?: Record<string, unknown> & {
    boost?: string[];
    factor?: number;
    length?: number;
  };
}

interface BossHostState {
  boss?: BossState | null;
  bossPending?: boolean;
  bossMinimized?: boolean;
  bossesDefeated?: number;
  _bossSeasonCount?: number;
  _bossResolvedThisSeason?: boolean;
  lastAuditBossAt?: number;
  auditBossSeq?: number;
  year?: number;
  modal?: string | null;
  bubble?: { id: number; npc: string; text: string; ms: number } | null;
  coins?: number;
  runes?: number;
  gems?: number;
}

export const initial = {
  boss: null as BossState | null,
  bossPending: false,
  bossMinimized: false,
  bossesDefeated: 0,
  _bossSeasonCount: 0,
  _bossResolvedThisSeason: false,
  lastAuditBossAt: 0,
  auditBossSeq: 0,
};

function spawnBiasFromModifier(modifier: BossModifier | undefined): Record<string, number> | null {
  if (modifier?.type === "respawn_boost") {
    const boost: string[] = modifier.params?.boost ?? [];
    const factor: number = modifier.params?.factor ?? 1.5;
    const out: Record<string, number> = {};
    for (const k of boost) out[k] = factor;
    return out;
  }
  return null;
}

function minChainFromModifier(modifier: BossModifier | undefined): number | null {
  if (modifier?.type === "min_chain") return modifier.params?.length ?? null;
  return null;
}

interface BossDef {
  id: string;
  name?: string;
  description?: string | null;
  modifierDescription?: string | null;
  modifier?: BossModifier;
  target: { resource?: string; amount: number };
}

function triggerBoss(state: GameState, bossKey: string): GameState {
  const s = state as unknown as BossHostState;
  const def = (BOSSES as BossDef[]).find((b) => b.id === bossKey);
  if (!def) return state;
  const ui = (BOSS_UI as Record<string, { displayName?: string; emoji?: string; flavor?: string; goal?: string }>)[bossKey] ?? {};
  const year = s.year ?? Math.max(1, Math.ceil(((s._bossSeasonCount ?? 0) / 4)));
  const spawned = spawnBoss(state, bossKey, year) as GameState & { boss?: BossState | null };
  if (!spawned.boss) return state;
  const modifier: BossModifier = def.modifier ?? {};
  return {
    ...spawned,
    boss: {
      ...spawned.boss,
      key: bossKey,
      name: ui.displayName ?? def.name,
      emoji: ui.emoji,
      flavor: ui.flavor,
      goal: ui.goal,
      description: def.description ?? null,
      modifierDescription: def.modifierDescription ?? null,
      resource: def.target?.resource,
      targetCount: def.target.amount,
      progress: spawned.boss.progress ?? 0,
      turnsLeft: spawned.boss.turnsRemaining ?? BOSS_WINDOW_TURNS,
      minChain: minChainFromModifier(modifier),
      spawnBias: spawnBiasFromModifier(modifier),
      modifier,
    },
    bossPending: false,
    bossMinimized: false,
    modal: "boss",
  } as GameState;
}

interface ChainPayload {
  gained?: number;
  resource?: string;
  key?: string;
}

interface CraftPayload {
  key?: string;
}

interface BossAction extends Action {
  bossKey?: string;
  won?: boolean;
  recipeKey?: string;
}

export function reduce(state: GameState, action: Action): GameState {
  const s = state as unknown as BossHostState;
  const a = action as BossAction;
  switch (action.type) {
    case "BOSS/TRIGGER": {
      return triggerBoss(state, a.bossKey || YEAR_BOSS_ROTATION[0]);
    }

    case "BOSS/MINIMIZE": {
      return { ...state, bossMinimized: true, modal: null } as GameState;
    }

    case "BOSS/EXPAND": {
      return { ...state, bossMinimized: false, modal: "boss" } as GameState;
    }

    case "BOSS/CLOSE": {
      return { ...state, bossMinimized: true, modal: null } as GameState;
    }

    case "BOSS/REJECT": {
      if (!s.boss) return state;
      if (s.boss.isKeeperTrial) return state;
      return {
        ...state,
        boss: null,
        bossMinimized: false,
        modal: s.modal === "boss" ? null : s.modal,
        bubble: {
          npc: "mira",
          text: `The challenge fades... better luck next season.`,
          ms: 2500,
          id: Date.now(),
        },
      } as GameState;
    }

    case "BOSS/RESOLVE": {
      const won = !!a.won;
      const base = {
        ...state,
        boss: null,
        bossMinimized: false,
        modal: s.modal === "boss" ? null : s.modal,
        _bossResolvedThisSeason: true,
      } as GameState;
      if (won) {
        const bossDef: BossDef = (BOSSES as BossDef[]).find((b) => b.id === s.boss?.key) ??
          { id: s.boss?.key ?? "", target: { amount: s.boss?.targetCount ?? 1 } };
        const year = s.year ?? Math.max(1, Math.ceil(((s._bossSeasonCount ?? 0) / 4)));
        const progress = s.boss?.progress ?? 0;
        const { coins: rewardCoins, runes: rewardRunes } = bossRewardFn(bossDef, progress, year) as { coins: number; runes: number };
        const earnedCoins = rewardCoins > 0 ? rewardCoins : 200 * year;
        const { newState: afterBossXp } = awardXp(base, 25);
        const bs = afterBossXp as GameState & { coins?: number; runes?: number; gems?: number };
        return {
          ...afterBossXp,
          bossesDefeated: (s.bossesDefeated || 0) + 1,
          coins: (bs.coins || 0) + earnedCoins,
          runes: (bs.runes ?? 0) + (rewardRunes ?? 0),
          gems: (bs.gems ?? 0) + 1,
          bubble: {
            npc: "mira",
            text: `Victory! +${earnedCoins}[icon:berry] awarded.`,
            ms: 3200,
            id: Date.now(),
          },
        } as GameState;
      }
      return {
        ...base,
        bubble: {
          npc: "mira",
          text: `The challenge fades... better luck next season.`,
          ms: 2500,
          id: Date.now(),
        },
      } as GameState;
    }

    case "CHAIN_COLLECTED": {
      if (s.boss?.isKeeperTrial) return state;
      let next = { ...state } as GameState;
      const ns = next as unknown as BossHostState;
      const payload: ChainPayload = (action.payload as ChainPayload | undefined) ?? {};

      if (ns.boss) {
        const gained = payload.gained || 0;
        const resourceKey = payload.resource || payload.key || "";
        let added = 0;
        if (resourceKey === ns.boss.resource) {
          added = gained;
        } else if (!resourceKey && gained > 0) {
          added = gained;
        }
        if (added > 0) {
          const newProgress = Math.min(ns.boss.targetCount, (ns.boss.progress || 0) + added);
          next = { ...next, boss: { ...ns.boss, progress: newProgress } } as GameState;
          if (newProgress >= ns.boss.targetCount) {
            return reduce(next, { type: "BOSS/RESOLVE", won: true } as Action);
          }
        }
      }

      return next;
    }

    case "CRAFTING/CRAFT_RECIPE": {
      if (s.boss?.isKeeperTrial) return state;
      if (!s.boss || s.boss.resource !== "iron_bar") return state;
      const payload = action.payload as CraftPayload | undefined;
      const recipeKey = a.recipeKey ?? payload?.key;
      if (!recipeKey) return state;
      const recipeMap = RECIPES as unknown as Record<string, { item: string; inputs?: Record<string, number> } | undefined>;
      const recipe = recipeMap[recipeKey] ?? Object.values(recipeMap).find((r) => r?.item === recipeKey);
      if (!recipe || !recipe.inputs?.iron_bar) return state;
      const newProgress = Math.min(s.boss.targetCount, (s.boss.progress || 0) + 1);
      const updatedBoss: BossState = { ...s.boss, progress: newProgress };
      if (newProgress >= s.boss.targetCount) {
        return reduce({ ...state, boss: updatedBoss } as unknown as GameState, { type: "BOSS/RESOLVE", won: true } as Action);
      }
      return { ...state, boss: updatedBoss } as unknown as GameState;
    }

    case "CLOSE_SEASON": {
      let next = { ...state } as GameState;
      const ns = next as unknown as BossHostState;
      const seasonCount = (ns._bossSeasonCount || 0) + 1;
      next = { ...next, _bossSeasonCount: seasonCount } as GameState;

      if (ns.boss) {
        if (ns.boss.modifier?.type) {
          const ticked = tickModifier(next, ns.boss.modifier) as { newState: GameState };
          next = ticked.newState;
        }
        const currentBoss = (next as unknown as BossHostState).boss;
        if (currentBoss) {
          const turnsLeft = (currentBoss.turnsLeft || 1) - 1;
          if (turnsLeft <= 0 && currentBoss.progress < currentBoss.targetCount) {
            return reduce(
              { ...next, boss: { ...currentBoss, turnsLeft: 0 } } as GameState,
              { type: "BOSS/RESOLVE", won: false } as Action,
            );
          }
          next = { ...next, boss: { ...currentBoss, turnsLeft } } as GameState;
        }
      }

      next = { ...next, _bossResolvedThisSeason: false } as GameState;
      return next;
    }

    default:
      return state;
  }
}

/** @deprecated Use BOSS_UI + BOSSES; kept for UI fallbacks. */
export const BOSS_META: Record<string, {
  name: string | undefined;
  emoji: string | undefined;
  flavor: string | undefined;
  goal: string | undefined;
  resource: string | undefined;
  targetCount: number | undefined;
  turns: number;
  minChain: number | null;
}> = Object.fromEntries(
  (BOSSES as BossDef[]).map((b) => {
    const ui = (BOSS_UI as Record<string, { displayName?: string; emoji?: string; flavor?: string; goal?: string }>)[b.id] ?? {};
    return [b.id, {
      name: ui.displayName ?? b.name,
      emoji: ui.emoji,
      flavor: ui.flavor,
      goal: ui.goal,
      resource: b.target?.resource,
      targetCount: b.target?.amount,
      turns: BOSS_WINDOW_TURNS,
      minChain: minChainFromModifier(b.modifier),
    }];
  }),
);
