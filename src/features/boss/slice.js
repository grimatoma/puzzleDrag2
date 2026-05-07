import { BIOMES, RECIPES } from "../../constants.js";
import { BOSSES, BOSS_WINDOW_TURNS, bossReward as bossRewardFn } from "../bosses/data.js";
import { rollWeather } from "../weather/data.js";
import { awardXp } from "../almanac/data.js";

const ALL_RESOURCES = [...BIOMES.farm.resources, ...BIOMES.mine.resources];

// Build BOSS_META from the canonical BOSSES list (features/bosses/data.js)
// Preserving UI-only fields (emoji, flavor, goal) inline while sourcing turns
// from BOSS_WINDOW_TURNS and resource/target from each boss def.
const BOSS_META = {
  frostmaw: {
    name: "The Frostmaw",
    emoji: "❄️",
    flavor: "A frozen titan stirs in the deep winter wood. Your hearth must not go dark.",
    goal: "Bring 30 logs in 10 turns to keep the hearth lit.",
    resource: "log",
    targetCount: 30,
    turns: BOSS_WINDOW_TURNS, // §18 locked: 10
    minChain: 5,
  },
  ember_drake: {
    name: "Ember Drake",
    emoji: "🔥",
    flavor: "Scales of cinder, breath of smelting flame — the Drake demands tribute in iron.",
    goal: "Forge 3 ingots before the hour passes.",
    resource: "ingot",
    targetCount: 3,
    turns: BOSS_WINDOW_TURNS,
    minChain: null,
  },
  quagmire: {
    name: "The Quagmire",
    emoji: "🌿",
    flavor: "The bog has swallowed the lower fields. Only a bountiful harvest can drain its hold.",
    goal: "Drain the bog: harvest 50 hay across 10 turns.",
    resource: "hay",
    targetCount: 50,
    turns: BOSS_WINDOW_TURNS,
    minChain: null,
  },
  old_stoneface: {
    name: "Old Stoneface",
    emoji: "🪨",
    flavor: "An ancient golem has sealed the mountain pass. Prove your worth at the rock face.",
    goal: "Quarry 20 stone from the rock biome.",
    resource: "stone",
    targetCount: 20,
    turns: BOSS_WINDOW_TURNS,
    minChain: null,
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
};

// Seasonal boss rotation — one per year, cycling through the 5 bosses (includes mossback)
const YEAR_BOSS_ROTATION = ["frostmaw", "quagmire", "ember_drake", "old_stoneface", "mossback"];

// Heirloom IDs eligible to drop from boss victories (rare/legendary picks)

// WEATHER_META: all 5 weather types from the canonical weather table.
const WEATHER_META = {
  rain: {
    label: "Rain",
    emoji: "🌧",
    desc: "Rain settles over the vale — berry chains double resources for",
    color: "#3a6b8a",
  },
  harvest_moon: {
    label: "Harvest Moon",
    emoji: "🌕",
    desc: "The Harvest Moon rises — first 3 chains each night yield +1 upgrade for",
    color: "#c8a030",
  },
  drought: {
    label: "Drought",
    emoji: "☀️",
    desc: "A dry spell grips the vale — wheat and grain yields are halved for",
    color: "#c8820a",
  },
  frost: {
    label: "Frost",
    emoji: "🌨",
    desc: "Frost creeps across the fields — tile-fall slows for",
    color: "#7ab8d4",
  },
};

export const initial = {
  boss: null,
  bossPending: false,
  bossMinimized: false,
  weather: null,
  weatherTurnsLeft: 0,
  bossesDefeated: 0,
  _bossSeasonCount: 0,
  _bossResolvedThisSeason: false,
};

// eslint-disable-next-line no-unused-vars
function pickRandomWeather() {
  // Legacy stub kept for reference — use rollWeatherEvent() instead
  const keys = Object.keys(WEATHER_META).filter((k) => k !== "none");
  return keys[Math.floor(Math.random() * keys.length)];
}

function triggerBoss(state, bossKey) {
  const meta = BOSS_META[bossKey];
  if (!meta) return state;
  return {
    ...state,
    boss: {
      key: bossKey,
      name: meta.name,
      emoji: meta.emoji,
      flavor: meta.flavor,
      goal: meta.goal,
      resource: meta.resource,
      targetCount: meta.targetCount,
      progress: 0,
      turnsLeft: meta.turns,
      minChain: meta.minChain || null,
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
        return {
          ...afterBossXp,
          bossesDefeated: (state.bossesDefeated || 0) + 1,
          coins: (state.coins || 0) + earnedCoins,
          runes: (state.runes ?? 0) + (rewardRunes ?? 0),
          bubble: {
            npc: "mira",
            text: `Victory! +${earnedCoins}◉ awarded.`,
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

      // Apply active weather bonus before decrementing turns
      if (next.weather && (next.weatherTurnsLeft || 0) > 0) {
        const wKey = next.weather.key;
        const chainKey = payload.key || "";
        const gained = payload.gained || 0;

        if (wKey === "rain" && chainKey === "berry" && gained > 0) {
          const inv = { ...(next.inventory || {}) };
          inv.berry = (inv.berry || 0) + gained;
          next = { ...next, inventory: inv };
        } else if (wKey === "harvest_moon" && (payload.upgrades || 0) > 0) {
          const baseRes = ALL_RESOURCES.find((r) => r.key === chainKey);
          if (baseRes?.next) {
            const inv = { ...(next.inventory || {}) };
            inv[baseRes.next] = (inv[baseRes.next] || 0) + 1;
            next = { ...next, inventory: inv };
          }
        }
      }

      // Decrement weather turns
      if (next.weatherTurnsLeft > 0) {
        const wLeft = next.weatherTurnsLeft - 1;
        next = {
          ...next,
          weatherTurnsLeft: wLeft,
          weather: wLeft <= 0 ? null : next.weather,
        };
      }

      return next;
    }

    case "CRAFTING/CRAFT_RECIPE": {
      if (!state.boss || state.boss.resource !== "ingot") return state;
      const recipe = RECIPES[action.payload?.key];
      if (!recipe || recipe.output !== "ingot") return state;
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

      // Trigger a seasonal boss climax at the end of every 4th season (1 year).
      // Skip if a boss was already resolved this season to avoid two boss events in one beat.
      if (seasonCount % 4 === 0 && !next.boss && !next._bossResolvedThisSeason) {
        const yearIndex = Math.floor(seasonCount / 4) - 1;
        const bossKey = YEAR_BOSS_ROTATION[yearIndex % YEAR_BOSS_ROTATION.length];
        next = triggerBoss(next, bossKey);
        // No weather roll this season — the boss is the event
        return next;
      }

      // Roll weather using the canonical 5-entry weighted table from features/weather/data.js
      if (!next.weather) {
        const rolled = rollWeather(Math.random);
        if (rolled.active) {
          const weatherMeta = WEATHER_META[rolled.active];
          const weatherTurns = rolled.turnsRemaining;
          next = {
            ...next,
            weather: { key: rolled.active, ...weatherMeta, turns: weatherTurns },
            weatherTurnsLeft: weatherTurns,
            bubble: {
              npc: "mira",
              text: `${weatherMeta.emoji} ${weatherMeta.desc} ${weatherTurns} turn${weatherTurns > 1 ? "s" : ""}.`,
              ms: 3000,
              id: Date.now(),
            },
          };
        }
      }

      // Reset the per-season resolved flag at end of every season
      next = { ...next, _bossResolvedThisSeason: false };
      return next;
    }

    default:
      return state;
  }
}

export { BOSS_META, WEATHER_META };
