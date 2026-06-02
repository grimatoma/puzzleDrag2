import { RECIPES } from "../../constants.js";
import { BOSSES, BOSS_WINDOW_TURNS, bossReward as bossRewardFn, spawnBoss } from "../bosses/data.js";
import { clearModifier, tickModifier, type BossModifier } from "../bosses/modifiers.js";
import { awardXp } from "../almanac/data.js";
import { BOSS_UI, type BossUiEntry } from "./uiMeta.js";
import type { Action, GameState, Grid } from "../../types/state.js";
import { ResourceKey } from "../../types/catalogKeys.js";

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

export type { BossModifier };

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

function bossYear(state: GameState): number {
  return state.year ?? Math.max(1, Math.ceil(state._bossSeasonCount / 4));
}

function spawnBiasFromModifier(modifier: BossModifier | undefined): Record<string, number> | null {
  if (modifier?.type === "respawn_boost") {
    const boost: string[] = modifier.params?.boost ?? [];
    const factor: number = (modifier.params?.factor as number | undefined) ?? 1.5;
    const out: Record<string, number> = {};
    for (const k of boost) out[k] = factor;
    return out;
  }
  return null;
}

function minChainFromModifier(modifier: BossModifier | undefined): number | null {
  if (modifier?.type === "min_chain") {
    const length = (modifier.params as { length?: number } | undefined)?.length;
    return length ?? null;
  }
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
  const def = (BOSSES as BossDef[]).find((b) => b.id === bossKey);
  if (!def) return state;
  const ui: Partial<BossUiEntry> = BOSS_UI[bossKey] ?? {};
  const year = bossYear(state);
  const spawned = spawnBoss(state, bossKey, year);
  if (!spawned.boss) return state;
  const modifier: BossModifier = def.modifier ?? { type: "", params: {} };
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
  };
}

interface BossAction {
  type: Action["type"];
  bossKey?: string;
  won?: boolean;
  recipeKey?: string;
  payload?: unknown;
  readonly [key: string]: unknown;
}

export function reduce(state: GameState, action: Action): GameState {
  const a = action as BossAction;
  switch (action.type) {
    case "BOSS/TRIGGER": {
      return triggerBoss(state, a.bossKey || YEAR_BOSS_ROTATION[0]);
    }

    case "BOSS/MINIMIZE": {
      return { ...state, bossMinimized: true, modal: null };
    }

    case "BOSS/EXPAND": {
      return { ...state, bossMinimized: false, modal: "boss" };
    }

    case "BOSS/CLOSE": {
      return { ...state, bossMinimized: true, modal: null };
    }

    case "BOSS/REJECT": {
      if (!state.boss) return state;
      if (state.boss.isKeeperTrial) return state;
      return {
        ...state,
        grid: (clearModifier(state.grid) ?? state.grid) as Grid,
        boss: null,
        bossMinimized: false,
        modal: state.modal === "boss" ? null : state.modal,
        bubble: {
          npc: "mira",
          text: `The challenge fades... better luck next season.`,
          ms: 2500,
          id: Date.now(),
        },
      };
    }

    case "BOSS/RESOLVE": {
      const won = !!a.won;
      const activeBoss = state.boss;
      const base: GameState = {
        ...state,
        grid: (clearModifier(state.grid) ?? state.grid) as Grid,
        boss: null,
        bossMinimized: false,
        modal: state.modal === "boss" ? null : state.modal,
        _bossResolvedThisSeason: true,
      };
      if (won && activeBoss) {
        const bossDef: BossDef = (BOSSES as BossDef[]).find((b) => b.id === activeBoss.key) ??
          { id: activeBoss.key, target: { amount: activeBoss.targetCount } };
        const year = bossYear(state);
        const progress = activeBoss.progress ?? 0;
        const bossRewardInput = { target: { resource: bossDef.target.resource ?? "", amount: bossDef.target.amount } };
        const { coins: rewardCoins, runes: rewardRunes } = bossRewardFn(bossRewardInput, progress, year) as { coins: number; runes: number };
        const earnedCoins = rewardCoins > 0 ? rewardCoins : 200 * year;
        const { newState: afterBossXp } = awardXp(base, 25);
        return {
          ...afterBossXp,
          bossesDefeated: state.bossesDefeated + 1,
          coins: afterBossXp.coins + earnedCoins,
          runes: afterBossXp.runes + (rewardRunes ?? 0),
          gems: afterBossXp.gems + 1,
          bubble: {
            npc: "mira",
            text: `Victory! +${earnedCoins}[icon:berry] awarded.`,
            ms: 3200,
            id: Date.now(),
          },
        };
      }
      return {
        ...base,
        bubble: {
          npc: "mira",
          text: `The challenge fades... better luck next season.`,
          ms: 2500,
          id: Date.now(),
        },
      };
    }

    case "CHAIN_COLLECTED": {
      if (state.boss?.isKeeperTrial) return state;
      let next: GameState = { ...state };
      const payload = action.payload;

      if (next.boss) {
        const gained = payload.gained || 0;
        const resourceKey = payload.resource || payload.resourceKey || payload.key || "";
        let added = 0;
        if (resourceKey === next.boss.resource) {
          added = gained;
        } else if (!resourceKey && gained > 0) {
          added = gained;
        }
        if (added > 0) {
          const newProgress = Math.min(next.boss.targetCount, (next.boss.progress || 0) + added);
          next = { ...next, boss: { ...next.boss, progress: newProgress } };
          if (next.boss && newProgress >= next.boss.targetCount) {
            return reduce(next, { type: "BOSS/RESOLVE", won: true });
          }
        }
      }

      return next;
    }

    case "CRAFTING/CRAFT_RECIPE": {
      if (state.boss?.isKeeperTrial) return state;
      if (!state.boss || state.boss.resource !== ResourceKey.IronBar) return state;
      const recipeKey = action.recipeKey ?? action.payload?.key;
      if (!recipeKey) return state;
      const recipe = RECIPES[recipeKey] ?? Object.values(RECIPES).find((r) => r?.item === recipeKey);
      if (!recipe || !recipe.inputs?.[ResourceKey.IronBar]) return state;
      const newProgress = Math.min(state.boss.targetCount, (state.boss.progress || 0) + 1);
      const updatedBoss: BossState = { ...state.boss, progress: newProgress };
      if (newProgress >= state.boss.targetCount) {
        return reduce({ ...state, boss: updatedBoss }, { type: "BOSS/RESOLVE", won: true });
      }
      return { ...state, boss: updatedBoss };
    }

    case "CLOSE_SEASON": {
      let next: GameState = { ...state, _bossSeasonCount: state._bossSeasonCount + 1 };

      if (next.boss) {
        if (next.boss.modifier?.type) {
          const ticked = tickModifier(next, next.boss.modifier) as { newState: GameState };
          next = ticked.newState;
        }
        const currentBoss = next.boss;
        if (currentBoss) {
          const turnsLeft = (currentBoss.turnsLeft || 1) - 1;
          if (turnsLeft <= 0 && currentBoss.progress < currentBoss.targetCount) {
            return reduce(
              { ...next, boss: { ...currentBoss, turnsLeft: 0 } },
              { type: "BOSS/RESOLVE", won: false },
            );
          }
          next = { ...next, boss: { ...currentBoss, turnsLeft } };
        }
      }

      return { ...next, _bossResolvedThisSeason: false };
    }

    default:
      return state;
  }
}
