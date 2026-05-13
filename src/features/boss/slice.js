import { RECIPES } from "../../constants.js";
import { BOSSES, BOSS_WINDOW_TURNS, bossReward as bossRewardFn } from "../bosses/data.js";
import { awardXp } from "../almanac/data.js";

// Build BOSS_META from the canonical BOSSES list (features/bosses/data.js)
// Preserving UI-only fields (emoji, flavor, goal) inline while sourcing turns
// from BOSS_WINDOW_TURNS and resource/target from each boss def.
const BOSS_META = {
  frostmaw: {
    name: "The Frostmaw",
    emoji: "❄️",
    flavor: "A frozen titan stirs in the deep winter wood. Your hearth must not go dark.",
    goal: "Bring 30 logs in 10 turns to keep the hearth lit.",
    resource: "wood_log",
    targetCount: 30,
    turns: BOSS_WINDOW_TURNS, // §18 locked: 10
    minChain: 5,
  },
  ember_drake: {
    name: "Ember Drake",
    emoji: "🔥",
    flavor: "Scales of cinder, breath of smelting flame — the Drake demands tribute in iron.",
    goal: "Forge 3 ingots before the hour passes.",
    resource: "mine_ingot",
    targetCount: 3,
    turns: BOSS_WINDOW_TURNS,
    minChain: null,
    // Spec §9: heat tiles appear — spawn 1-2 fire tiles per season
    spawnFireTiles: 2,
  },
  quagmire: {
    name: "The Quagmire",
    emoji: "🌿",
    flavor: "The bog has swallowed the lower fields. Only a bountiful harvest can drain its hold.",
    goal: "Drain the bog: harvest 50 hay across 10 turns.",
    resource: "grass_hay",
    targetCount: 50,
    turns: BOSS_WINDOW_TURNS,
    minChain: null,
    // Spec §9: extra log/hay respawn tiles — bias spawn pool +30% log+hay
    spawnBias: { wood_log: 1.3, grass_hay: 1.3 },
  },
  old_stoneface: {
    name: "Old Stoneface",
    emoji: "🪨",
    flavor: "An ancient golem has sealed the mountain pass. Prove your worth at the rock face.",
    goal: "Quarry 20 stone from the rock biome.",
    resource: "mine_stone",
    targetCount: 20,
    turns: BOSS_WINDOW_TURNS,
    minChain: null,
    // Spec §9: rubble tiles block until cleared — spawn 1-2 cave_in tiles per season
    spawnRubbleTiles: 2,
  },
  mossback: {
    name: "Mossback",
    emoji: "🌱",
    flavor: "A mossy titan lurks in the spring glades. Four mystery tiles hide its weakness — reveal them all.",
    goal: "Hide ~4 mystery tiles that flip on chain.",
    resource: "berry",
    targetCount: 30,
    turns: BOSS_WINDOW_TURNS,
    minChain: null,
    hiddenTilesTarget: 4,
  },
  storm: {
    name: "The Storm",
    emoji: "🌩",
    flavor: "A black squall rolls over Saltspray Harbor. Every short cast tears free — only steady, deliberate pulls bring fillets through the chop.",
    goal: "Land 6 fish fillets in 10 turns. Short chains slip the line.",
    resource: "fish_fillet",
    targetCount: 6,
    turns: BOSS_WINDOW_TURNS,
    minChain: 4,
  },
};

// Legacy manual boss rotation. Automatic seasonal/audit spawning is deferred;
// Keeper Trials are the primary boss structure.
const YEAR_BOSS_ROTATION = ["frostmaw", "quagmire", "ember_drake", "old_stoneface", "mossback", "storm"];

// Heirloom IDs eligible to drop from boss victories (rare/legendary picks)

export const initial = {
  boss: null,
  bossPending: false,
  bossMinimized: false,
  bossesDefeated: 0,
  _bossSeasonCount: 0,
  _bossResolvedThisSeason: false,
  // Legacy audit fields retained for save compatibility and tests. CLOSE_SEASON
  // no longer schedules bosses from these values.
  lastAuditBossAt: 0,
  auditBossSeq: 0,
};

function triggerBoss(state, bossKey) {
  const meta = BOSS_META[bossKey];
  if (!meta) return state;
  // Pull description + modifierDescription from the canonical bosses/data.js list
  const canonicalDef = BOSSES.find((b) => b.id === bossKey) ?? {};
  return {
    ...state,
    boss: {
      key: bossKey,
      name: meta.name,
      emoji: meta.emoji,
      flavor: meta.flavor,
      goal: meta.goal,
      description: canonicalDef.description ?? null,
      modifierDescription: canonicalDef.modifierDescription ?? null,
      resource: meta.resource,
      targetCount: meta.targetCount,
      progress: 0,
      turnsLeft: meta.turns,
      minChain: meta.minChain || null,
      // Board modifier flags (Spec §9: boss-specific board effects)
      spawnBias: meta.spawnBias ?? null,
      spawnFireTiles: meta.spawnFireTiles ?? null,
      spawnRubbleTiles: meta.spawnRubbleTiles ?? null,
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
        // Use year-scaling reward from features/bosses/data.js
        const bossDef = BOSSES.find((b) => b.id === state.boss?.key) ??
          // fallback: construct a minimal def from BOSS_META if id not found
          { target: { amount: state.boss?.targetCount ?? 1 } };
        const year = state.year ?? Math.max(1, Math.ceil(((state._bossSeasonCount ?? 0) / 4)));
        const progress = state.boss?.progress ?? 0;
        const { coins: rewardCoins, runes: rewardRunes } = bossRewardFn(bossDef, progress, year);
        const earnedCoins = rewardCoins > 0 ? rewardCoins : 200 * year; // guaranteed-win floor
        // §17 locked: 25 XP per boss win into almanac
        const { newState: afterBossXp } = awardXp(base, 25);
        let result = {
          ...afterBossXp,
          bossesDefeated: (state.bossesDefeated || 0) + 1,
          coins: (state.coins || 0) + earnedCoins,
          runes: (state.runes ?? 0) + (rewardRunes ?? 0),
          // Phase 5 — a gem per boss win (the current gem source until more
          // land later; tunable). Gems pay to skip a real-time craft.
          gems: (state.gems ?? 0) + 1,
          bubble: {
            npc: "mira",
            text: `Victory! +${earnedCoins}[icon:berry] awarded.`,
            ms: 3200,
            id: Date.now(),
          },
        };
        return result;
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

      // Update boss progress
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
      if (!state.boss || state.boss.resource !== "mine_ingot") return state;
      const recipe = RECIPES[action.payload?.key];
      // Count any forge recipe that consumes mine_ingot as an input ingredient.
      if (!recipe || !recipe.inputs?.mine_ingot) return state;
      const newProgress = Math.min(state.boss.targetCount, (state.boss.progress || 0) + 1);
      const updatedBoss = { ...state.boss, progress: newProgress };
      if (newProgress >= state.boss.targetCount) {
        return reduce({ ...state, boss: updatedBoss }, { type: "BOSS/RESOLVE", won: true });
      }
      return { ...state, boss: updatedBoss };
    }

    case "CLOSE_SEASON": {
      let next = { ...state };

      // Track seasons for boss scheduling (every 4 seasons = 1 year)
      const seasonCount = (next._bossSeasonCount || 0) + 1;
      next = { ...next, _bossSeasonCount: seasonCount };

      // Decrement boss turns if a boss is active
      if (next.boss) {
        const turnsLeft = (next.boss.turnsLeft || 1) - 1;
        if (turnsLeft <= 0 && next.boss.progress < next.boss.targetCount) {
          return reduce({ ...next, boss: { ...next.boss, turnsLeft: 0 } }, { type: "BOSS/RESOLVE", won: false });
        }
        next = { ...next, boss: { ...next.boss, turnsLeft } };
      }

      // Random seasonal bosses are deferred; keeper trials are now the primary
      // boss structure. Manual BOSS/TRIGGER remains for debug/testing.

      // Reset the per-season resolved flag at end of every season
      next = { ...next, _bossResolvedThisSeason: false };
      return next;
    }

    default:
      return state;
  }
}

export { BOSS_META };
