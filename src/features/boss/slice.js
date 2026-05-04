const BOSS_META = {
  frostmaw: {
    name: "The Frostmaw",
    emoji: "❄️",
    flavor: "A frozen titan stirs in the deep winter wood. Your hearth must not go dark.",
    goal: "Bring 30 logs in 5 turns to keep the hearth lit.",
    resource: "log",
    targetCount: 30,
    turns: 5,
    season: "winter",
  },
  ember_drake: {
    name: "Ember Drake",
    emoji: "🔥",
    flavor: "Scales of cinder, breath of smelting flame — the Drake demands tribute in iron.",
    goal: "Forge 3 ingots before the hour passes.",
    resource: "ingot",
    targetCount: 3,
    turns: 5,
    season: "summer",
  },
  quagmire: {
    name: "The Quagmire",
    emoji: "🌿",
    flavor: "The bog has swallowed the lower fields. Only a bountiful harvest can drain its hold.",
    goal: "Drain the bog: harvest 50 hay this season.",
    resource: "hay",
    targetCount: 50,
    turns: 5,
    season: "spring",
  },
  old_stoneface: {
    name: "Old Stoneface",
    emoji: "🪨",
    flavor: "An ancient golem has sealed the mountain pass. Prove your worth at the rock face.",
    goal: "Quarry 20 stone from the rock biome.",
    resource: "stone",
    targetCount: 20,
    turns: 5,
    season: "autumn",
  },
};

const BOSS_KEYS = Object.keys(BOSS_META);

const WEATHER_META = {
  rain: {
    label: "Rain",
    emoji: "🌧",
    desc: "Rain settles over the vale — berry chains double resources for",
    color: "#3a6b8a",
  },
  drought: {
    label: "Drought",
    emoji: "☀️",
    desc: "A dry spell grips the fields — wheat and grain spawn 50% rarer for",
    color: "#c8823a",
  },
  frost: {
    label: "Frost",
    emoji: "🌨",
    desc: "Frost creeps across the land — tile drops slow to a crawl for",
    color: "#7ab8d4",
  },
  harvest_moon: {
    label: "Harvest Moon",
    emoji: "🌕",
    desc: "The Harvest Moon rises — first 3 chains each night yield +1 upgrade for",
    color: "#c8a030",
  },
};

const WEATHER_KEYS = Object.keys(WEATHER_META);

export const initial = {
  boss: null,
  bossPending: false,
  bossMinimized: false,
  weather: null,
  weatherTurnsLeft: 0,
  bossesDefeated: 0,
  _bossSeasonCount: 0,
};

function pickRandomBoss() {
  return BOSS_KEYS[Math.floor(Math.random() * BOSS_KEYS.length)];
}

function pickRandomWeather() {
  return WEATHER_KEYS[Math.floor(Math.random() * WEATHER_KEYS.length)];
}

function triggerBoss(state, bossKey) {
  const key = bossKey || pickRandomBoss();
  const meta = BOSS_META[key];
  if (!meta) return state;
  return {
    ...state,
    boss: {
      key,
      name: meta.name,
      emoji: meta.emoji,
      flavor: meta.flavor,
      goal: meta.goal,
      resource: meta.resource,
      targetCount: meta.targetCount,
      progress: 0,
      turnsLeft: meta.turns,
    },
    bossPending: false,
    bossMinimized: false,
    modal: "boss",
  };
}

export function reduce(state, action) {
  switch (action.type) {
    case "BOSS/TRIGGER": {
      return triggerBoss(state, action.bossKey);
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
      };
      if (won) {
        return {
          ...base,
          bossesDefeated: (state.bossesDefeated || 0) + 1,
          coins: (state.coins || 0) + 200,
          bubble: {
            npc: "mira",
            text: `Victory! +200 coins awarded.`,
            ms: 2500,
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

      // Update boss progress
      if (next.boss) {
        const payload = action.payload || {};
        const gained = payload.gained || 0;
        const resourceKey = payload.resource || payload.key || "";
        let added = 0;
        if (resourceKey === next.boss.resource) {
          added = gained;
        } else if (!resourceKey && gained > 0) {
          // fallback: count all tiles if resource not specified
          added = gained;
        }
        if (added > 0) {
          const newProgress = Math.min(next.boss.targetCount, (next.boss.progress || 0) + added);
          next = { ...next, boss: { ...next.boss, progress: newProgress } };
          if (newProgress >= next.boss.targetCount) {
            // Won!
            return reduce(next, { type: "BOSS/RESOLVE", won: true });
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

      // Decrement boss turns
      if (next.boss) {
        const turnsLeft = (next.boss.turnsLeft || 1) - 1;
        if (turnsLeft <= 0 && next.boss.progress < next.boss.targetCount) {
          // Time ran out — boss wins
          return reduce({ ...next, boss: { ...next.boss, turnsLeft: 0 } }, { type: "BOSS/RESOLVE", won: false });
        }
        next = { ...next, boss: { ...next.boss, turnsLeft } };
      }

      // Auto-trigger pending boss
      if (next.bossPending && !next.boss) {
        next = triggerBoss(next, null);
      }

      // Roll new boss pending every 4 seasons
      if (seasonCount % 4 === 0 && !next.boss && !next.bossPending) {
        next = { ...next, bossPending: true };
        // Will trigger next CLOSE_SEASON
      }

      // Roll weather (1-in-2 chance, independent of boss)
      if (!next.weather && Math.random() < 0.5) {
        const weatherKey = pickRandomWeather();
        const weatherMeta = WEATHER_META[weatherKey];
        const weatherTurns = 2 + Math.floor(Math.random() * 2); // 2 or 3
        next = {
          ...next,
          weather: { key: weatherKey, ...weatherMeta, turns: weatherTurns },
          weatherTurnsLeft: weatherTurns,
          bubble: {
            npc: "mira",
            text: `${weatherMeta.emoji} ${weatherMeta.desc} ${weatherTurns} turn${weatherTurns > 1 ? "s" : ""}.`,
            ms: 3000,
            id: Date.now(),
          },
        };
      }

      return next;
    }

    default:
      return state;
  }
}

export { BOSS_META, WEATHER_META };
