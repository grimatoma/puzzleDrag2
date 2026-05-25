import { RECIPES } from "../../constants.js";
import { BOSSES, BOSS_WINDOW_TURNS, bossReward as bossRewardFn, spawnBoss } from "../bosses/data.js";
import { tickModifier } from "../bosses/modifiers.js";
import { awardXp } from "../almanac/data.js";
import { BOSS_UI } from "./uiMeta.js";

const YEAR_BOSS_ROTATION = ["frostmaw", "quagmire", "ember_drake", "old_stoneface", "mossback", "storm"];

export const initial = {
  boss: null,
  bossPending: false,
  bossMinimized: false,
  bossesDefeated: 0,
  _bossSeasonCount: 0,
  _bossResolvedThisSeason: false,
  lastAuditBossAt: 0,
  auditBossSeq: 0,
};

function spawnBiasFromModifier(modifier) {
  if (modifier?.type === "respawn_boost") {
    const boost = modifier.params?.boost ?? [];
    const factor = modifier.params?.factor ?? 1.5;
    const out = {};
    for (const k of boost) out[k] = factor;
    return out;
  }
  return null;
}

function minChainFromModifier(modifier) {
  if (modifier?.type === "min_chain") return modifier.params?.length ?? null;
  return null;
}

function triggerBoss(state, bossKey) {
  const def = BOSSES.find((b) => b.id === bossKey);
  if (!def) return state;
  const ui = BOSS_UI[bossKey] ?? {};
  const year = state.year ?? Math.max(1, Math.ceil(((state._bossSeasonCount ?? 0) / 4)));
  const spawned = spawnBoss(state, bossKey, year);
  if (!spawned.boss) return state;
  const modifier = def.modifier ?? {};
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

export function reduce(state, action) {
  switch (action.type) {
    case "BOSS/TRIGGER": {
      return triggerBoss(state, action.bossKey || YEAR_BOSS_ROTATION[0]);
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
      const won = !!action.won;
      const base = {
        ...state,
        boss: null,
        bossMinimized: false,
        modal: state.modal === "boss" ? null : state.modal,
        _bossResolvedThisSeason: true,
      };
      if (won) {
        const bossDef = BOSSES.find((b) => b.id === state.boss?.key) ??
          { target: { amount: state.boss?.targetCount ?? 1 } };
        const year = state.year ?? Math.max(1, Math.ceil(((state._bossSeasonCount ?? 0) / 4)));
        const progress = state.boss?.progress ?? 0;
        const { coins: rewardCoins, runes: rewardRunes } = bossRewardFn(bossDef, progress, year);
        const earnedCoins = rewardCoins > 0 ? rewardCoins : 200 * year;
        const { newState: afterBossXp } = awardXp(base, 25);
        return {
          ...afterBossXp,
          bossesDefeated: (state.bossesDefeated || 0) + 1,
          coins: (state.coins || 0) + earnedCoins,
          runes: (state.runes ?? 0) + (rewardRunes ?? 0),
          gems: (state.gems ?? 0) + 1,
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
      let next = { ...state };
      const payload = action.payload || {};

      if (next.boss) {
        const gained = payload.gained || 0;
        const resourceKey = payload.resource || payload.key || "";
        let added = 0;
        if (resourceKey === next.boss.resource) {
          added = gained;
        } else if (!resourceKey && gained > 0) {
          added = gained;
        }
        if (added > 0) {
          const newProgress = Math.min(next.boss.targetCount, (next.boss.progress || 0) + added);
          next = { ...next, boss: { ...next.boss, progress: newProgress } };
          if (newProgress >= next.boss.targetCount) {
            return reduce(next, { type: "BOSS/RESOLVE", won: true });
          }
        }
      }

      return next;
    }

    case "CRAFTING/CRAFT_RECIPE": {
      if (state.boss?.isKeeperTrial) return state;
      if (!state.boss || state.boss.resource !== "iron_bar") return state;
      const recipeKey = action.recipeKey ?? action.payload?.key;
      const recipe = RECIPES[recipeKey] ?? Object.values(RECIPES).find((r) => r?.item === recipeKey);
      if (!recipe || !recipe.inputs?.iron_bar) return state;
      const newProgress = Math.min(state.boss.targetCount, (state.boss.progress || 0) + 1);
      const updatedBoss = { ...state.boss, progress: newProgress };
      if (newProgress >= state.boss.targetCount) {
        return reduce({ ...state, boss: updatedBoss }, { type: "BOSS/RESOLVE", won: true });
      }
      return { ...state, boss: updatedBoss };
    }

    case "CLOSE_SEASON": {
      let next = { ...state };
      const seasonCount = (next._bossSeasonCount || 0) + 1;
      next = { ...next, _bossSeasonCount: seasonCount };

      if (next.boss) {
        if (next.boss.modifier?.type) {
          const ticked = tickModifier(next, next.boss.modifier);
          next = ticked.newState;
        }
        const turnsLeft = (next.boss.turnsLeft || 1) - 1;
        if (turnsLeft <= 0 && next.boss.progress < next.boss.targetCount) {
          return reduce({ ...next, boss: { ...next.boss, turnsLeft: 0 } }, { type: "BOSS/RESOLVE", won: false });
        }
        next = { ...next, boss: { ...next.boss, turnsLeft } };
      }

      next = { ...next, _bossResolvedThisSeason: false };
      return next;
    }

    default:
      return state;
  }
}

/** @deprecated Use BOSS_UI + BOSSES; kept for UI fallbacks. */
export const BOSS_META = Object.fromEntries(
  BOSSES.map((b) => {
    const ui = BOSS_UI[b.id] ?? {};
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
