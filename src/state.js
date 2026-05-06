import { BIOMES, NPCS, MAX_TURNS, RECIPES } from "./constants.js";
import * as crafting from "./features/crafting/slice.js";
import * as quests from "./features/quests/slice.js";
import * as achievements from "./features/achievements/slice.js";
import * as tutorial from "./features/tutorial/slice.js";
import * as settings from "./features/settings/slice.js";
import * as boss from "./features/boss/slice.js";
import * as cartography from "./features/cartography/slice.js";
import * as apprentices from "./features/apprentices/slice.js";
import * as mood from "./features/mood/slice.js";

const slices = [crafting, quests, achievements, tutorial, settings, boss, cartography, apprentices, mood];

// ─── Save/load ─────────────────────────────────────────────────────────────
// Persisted: everything except volatile UI fields (modal/bubble/view/pendingView).
const SAVE_KEY = "hearth.save.v1";
const VOLATILE = new Set(["modal", "bubble", "view", "pendingView", "craftingTab"]);

export function loadSavedState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch { return null; }
}

export function persistState(state) {
  try {
    const out = {};
    for (const k of Object.keys(state)) if (!VOLATILE.has(k)) out[k] = state[k];
    localStorage.setItem(SAVE_KEY, JSON.stringify(out));
  } catch {}
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
}

export const xpForLevel = (l) => 50 + l * 80;

const _resourceCache = new Map();
export function resourceByKey(key) {
  if (_resourceCache.has(key)) return _resourceCache.get(key);
  for (const b of Object.values(BIOMES)) {
    const r = b.resources.find((x) => x.key === key);
    if (r) { _resourceCache.set(key, r); return r; }
  }
  return null;
}

function pickNpcKey(excludeKeys = []) {
  const all = Object.keys(NPCS).filter((k) => !excludeKeys.includes(k));
  const pool = all.length ? all : Object.keys(NPCS);
  return pool[Math.floor(Math.random() * pool.length)];
}

// Crafted item pools for advanced orders (level 3+)
const CRAFTED_FARM_POOL = ["bread", "honeyroll", "harvestpie", "preserve", "tincture"];
const CRAFTED_MINE_POOL = ["hinge", "cobblepath", "lantern", "goldring", "gemcrown", "ironframe", "stonework"];

let orderIdSeq = 1;
export function makeOrder(biomeKey, level, excludeNpcs = []) {
  const biome = BIOMES[biomeKey];

  // At level 3+, 30% chance for a crafted item order
  const useCrafted = level >= 3 && Math.random() < 0.30;

  let key, need, reward, resourceLabel;
  if (useCrafted) {
    const craftedPool = biomeKey === "mine" ? CRAFTED_MINE_POOL : CRAFTED_FARM_POOL;
    key = craftedPool[Math.floor(Math.random() * craftedPool.length)];
    const recipe = RECIPES[key];
    need = 1 + Math.floor(Math.random() * 3); // 1–3 crafted items
    reward = Math.round(need * (recipe?.coins || 100) * 1.5);
    resourceLabel = (recipe?.name || key).toLowerCase();
  } else {
    const candidates = biome.pool.filter((k, i, a) => a.indexOf(k) === i);
    key = candidates[Math.floor(Math.random() * candidates.length)];
    const res = resourceByKey(key);
    const baseNeed = res.value < 3 ? 8 : 4;
    need = baseNeed + Math.floor(Math.random() * 4) + Math.floor(level / 3) * 2;
    reward = Math.max(20, need * res.value * 6);
    resourceLabel = res.label.toLowerCase();
  }

  const npc = pickNpcKey(excludeNpcs);
  const lines = NPCS[npc].lines;
  const line = lines[Math.floor(Math.random() * lines.length)]
    .replace("{n}", need)
    .replace("{r}", resourceLabel);
  return { id: `o${orderIdSeq++}`, npc, key, need, reward, line };
}

export function initialState() {
  const biomeKey = "farm";
  const level = 1;
  const o1 = makeOrder(biomeKey, level);
  const o2 = makeOrder(biomeKey, level, [o1.npc]);
  const o3 = makeOrder(biomeKey, level, [o1.npc, o2.npc]);
  const fresh = {
    biomeKey,
    view: "town",
    coins: 150,
    level,
    xp: 0,
    turnsUsed: 0,
    seasonsCycled: 0,
    inventory: {},
    orders: [o1, o2, o3],
    tools: { clear: 2, basic: 1, rare: 1, shuffle: 0 },
    built: { hearth: true },
    bubble: null,
    modal: null,
    pendingView: null,
    seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0 },
    _hintsShown: {},
    ...crafting.initial,
    ...quests.initial,
    ...achievements.initial,
    ...tutorial.initial,
    ...settings.initial,
    ...boss.initial,
    ...cartography.initial,
    ...apprentices.initial,
    ...mood.initial,
  };
  // Hydrate from save if present, but always force board view + clear modals on boot
  const saved = loadSavedState();
  if (saved) {
    // Advance orderIdSeq past any IDs already in saved orders so new replacements
    // never collide with existing ones (orderIdSeq resets to 1 on each module load).
    if (Array.isArray(saved.orders)) {
      for (const o of saved.orders) {
        const n = parseInt((o.id || '').slice(1), 10);
        if (!isNaN(n) && n >= orderIdSeq) orderIdSeq = n + 1;
      }
    }
    return { ...fresh, ...saved, view: "town", turnsUsed: 0, modal: null, bubble: null, pendingView: null,
      seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0 } };
  }
  return fresh;
}

function applyXp(state, xpDelta) {
  let xp = state.xp + xpDelta;
  let level = state.level;
  let leveledUp = false;
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level += 1;
    leveledUp = true;
  }
  return { xp, level, leveledUp };
}

function coreReducer(state, action) {
  switch (action.type) {
    case "CHAIN_COLLECTED": {
      const { key, gained, upgrades, value, chainLength } = action.payload;
      const currentSeason = (state.seasonsCycled || 0) % 4;
      const hintsShown = state._hintsShown || {};
      const effectiveChain = chainLength || gained;

      // Boss board modifier: active boss may require longer chains
      const bossMinChain = state.boss?.minChain || 0;
      if (bossMinChain > 0 && effectiveChain < bossMinChain) {
        const turnsUsed = state.turnsUsed + 1;
        const seasonEnded = turnsUsed >= MAX_TURNS;
        return {
          ...state,
          turnsUsed,
          bubble: { id: Date.now(), npc: "mira", text: `${state.boss.emoji} Challenge: chains need ${bossMinChain}+ tiles!`, ms: 2200, priority: 2 },
          modal: seasonEnded ? "season" : state.modal,
        };
      }

      // Winter: chains shorter than 4 tiles yield nothing but still consume the turn
      if (currentSeason === 3 && effectiveChain < 4) {
        const turnsUsed = state.turnsUsed + 1;
        const seasonEnded = turnsUsed >= MAX_TURNS;
        let bubble = state.bubble;
        if (!hintsShown.winterChain) {
          bubble = { id: Date.now(), npc: "wren", text: "❄️ Winter: chains need 4+ tiles to harvest!", ms: 2400, priority: 2 };
        }
        return {
          ...state,
          turnsUsed,
          bubble,
          _hintsShown: { ...hintsShown, winterChain: true },
          modal: seasonEnded ? "season" : state.modal,
        };
      }

      const res = resourceByKey(key);
      const inventory = { ...state.inventory };

      // Spring: +20% resource bonus (rounded up)
      const springBonus = currentSeason === 0 ? Math.ceil(gained * 0.2) : 0;
      const effectiveGained = gained + springBonus;
      inventory[key] = (inventory[key] || 0) + effectiveGained;

      // Autumn: double upgrades
      const effectiveUpgrades = currentSeason === 2 ? upgrades * 2 : upgrades;
      if (res?.next && effectiveUpgrades > 0) {
        inventory[res.next] = (inventory[res.next] || 0) + effectiveUpgrades;
      }

      const coinsGain = Math.max(1, Math.floor((effectiveGained * value) / 2));
      const xpGain = effectiveGained * value * 3 + effectiveUpgrades * 12;
      const xpResult = applyXp(state, xpGain);
      const turnsUsed = state.turnsUsed + 1;
      const seasonEnded = turnsUsed >= MAX_TURNS;
      const seasonStats = {
        ...state.seasonStats,
        harvests: state.seasonStats.harvests + effectiveGained,
        upgrades: state.seasonStats.upgrades + effectiveUpgrades,
        coins: state.seasonStats.coins + coinsGain,
      };

      let bubble = state.bubble;
      let newHintsShown = hintsShown;

      if (xpResult.leveledUp) {
        if (xpResult.level === 2) {
          bubble = { id: Date.now(), npc: "wren", text: "Level 2! ⛏️ Mine biome unlocked — switch with the button below.", ms: 2800, priority: 2 };
        } else {
          bubble = { id: Date.now(), npc: "wren", text: `Level ${xpResult.level}! New things await.`, ms: 2400, priority: 2 };
        }
      } else if (effectiveUpgrades > 0 && !hintsShown.upgradeHint) {
        bubble = { id: Date.now(), npc: "mira", text: "★ Upgrade! Chain 6+ tiles to snowball rare resources.", ms: 2800, priority: 2 };
        newHintsShown = { ...hintsShown, upgradeHint: true };
      }

      return {
        ...state,
        inventory,
        coins: state.coins + coinsGain,
        xp: xpResult.xp,
        level: xpResult.level,
        turnsUsed,
        seasonStats,
        bubble,
        _hintsShown: newHintsShown,
        lastChainLength: effectiveChain,
        modal: seasonEnded ? "season" : state.modal,
      };
    }
    case "TURN_IN_ORDER": {
      const o = state.orders.find((x) => x.id === action.id);
      if (!o) return state;
      if ((state.inventory[o.key] || 0) < o.need) {
        return { ...state, bubble: { id: Date.now(), npc: o.npc, text: "Need more!", ms: 1100 } };
      }
      const inventory = { ...state.inventory };
      inventory[o.key] -= o.need;
      const usedNpcs = state.orders.filter((x) => x.id !== o.id).map((x) => x.npc);
      const replacement = makeOrder(state.biomeKey, state.level, usedNpcs);
      const xpResult = applyXp(state, 12);
      // Summer: orders pay double
      const summerMult = ((state.seasonsCycled || 0) % 4 === 1) ? 2 : 1;
      const actualReward = o.reward * summerMult;
      let bubble = { id: Date.now(), npc: o.npc, text: summerMult > 1 ? `+${actualReward}◉ (☀️ 2×) — thank you!` : `+${actualReward}◉ — thank you!`, ms: 1600 };
      if (xpResult.leveledUp) {
        bubble = { id: Date.now(), npc: "wren", text: `Level ${xpResult.level}! New things await.`, ms: 2400 };
      }
      return {
        ...state,
        inventory,
        coins: state.coins + actualReward,
        xp: xpResult.xp,
        level: xpResult.level,
        orders: state.orders.map((x) => (x.id === o.id ? replacement : x)),
        seasonStats: { ...state.seasonStats, ordersFilled: state.seasonStats.ordersFilled + 1, coins: state.seasonStats.coins + actualReward },
        bubble,
      };
    }
    case "USE_TOOL": {
      const { key } = action;
      if ((state.tools[key] || 0) <= 0) return state;
      const tools = { ...state.tools, [key]: state.tools[key] - 1 };
      if (key === "shuffle") {
        return { ...state, tools, bubble: { id: Date.now(), npc: "bram", text: "Reshuffle Horn — used!", ms: 1500 } };
      }
      const inventory = { ...state.inventory };
      const biome = BIOMES[state.biomeKey];
      if (key === "rare") {
        const r = biome.resources[4] || biome.resources[biome.resources.length - 1];
        inventory[r.key] = (inventory[r.key] || 0) + 2;
        return { ...state, tools, inventory, bubble: { id: Date.now(), npc: "bram", text: "Seedpack — +2 rare!", ms: 1500 } };
      }
      if (key === "basic") {
        const r = biome.resources[0];
        inventory[r.key] = (inventory[r.key] || 0) + 5;
        return { ...state, tools, inventory, bubble: { id: Date.now(), npc: "bram", text: "Seedpack — +5 basic!", ms: 1500 } };
      }
      // key === "clear"
      const r = biome.resources[0];
      inventory[r.key] = (inventory[r.key] || 0) + 5;
      return { ...state, tools, inventory, bubble: { id: Date.now(), npc: "bram", text: "Scythe — clearing tiles!", ms: 1500 } };
    }
    case "SWITCH_BIOME": {
      const { key } = action;
      if (key === state.biomeKey) return state;
      if (key === "mine" && state.level < 2) {
        return { ...state, bubble: { id: Date.now(), npc: "wren", text: "Mine unlocks at Level 2.", ms: 1800 } };
      }
      const excludeNpcs = [];
      const replacements = state.orders.map(() => {
        const o = makeOrder(key, state.level, excludeNpcs);
        excludeNpcs.push(o.npc);
        return o;
      });
      return { ...state, biomeKey: key, orders: replacements };
    }
    case "SET_VIEW": {
      const next = action.view;
      return { ...state, view: next, craftingTab: action.craftingTab ?? (next === "crafting" ? state.craftingTab : null) };
    }
    case "OPEN_MODAL":
      return { ...state, modal: action.modal };
    case "CLOSE_MODAL":
      return { ...state, modal: null };
    case "BUILD": {
      const b = action.building;
      const canCoin = state.coins >= (b.cost.coins || 0);
      const canRes = Object.entries(b.cost).every(([k, v]) => k === "coins" || (state.inventory[k] || 0) >= v);
      if (!canCoin || !canRes) return state;
      const inventory = { ...state.inventory };
      Object.entries(b.cost).forEach(([k, v]) => {
        if (k !== "coins") inventory[k] = (inventory[k] || 0) - v;
      });
      const hintsShown = state._hintsShown || {};
      const CRAFTING_STATIONS = new Set(["bakery", "forge", "larder"]);
      const isCraftStation = CRAFTING_STATIONS.has(b.id);
      let bubble = { id: Date.now(), npc: "mira", text: `${b.name} built! The vale grows warmer.`, ms: 2200 };
      let newHintsShown = hintsShown;
      if (isCraftStation && !hintsShown.craftHint) {
        bubble = { id: Date.now(), npc: "mira", text: `${b.name} built! 🔨 Tap it in Town to open crafting recipes.`, ms: 2800 };
        newHintsShown = { ...hintsShown, craftHint: true };
      } else if (b.id === "inn" && !hintsShown.innHint) {
        bubble = { id: Date.now(), npc: "wren", text: "Inn built! 🧑‍🌾 You can now hire Helpers from the nav below.", ms: 2800 };
        newHintsShown = { ...hintsShown, innHint: true };
      }
      return {
        ...state,
        coins: state.coins - (b.cost.coins || 0),
        inventory,
        built: { ...state.built, [b.id]: true },
        bubble,
        _hintsShown: newHintsShown,
      };
    }
    case "POP_NPC":
      return { ...state, bubble: { id: Date.now(), npc: action.npc, text: action.text, ms: action.ms ?? 1800 } };
    case "DISMISS_BUBBLE":
      return state.bubble && state.bubble.id === action.id ? { ...state, bubble: null } : state;
    case "CLOSE_SEASON": {
      const tools = { ...state.tools, shuffle: (state.tools.shuffle || 0) + 1 };
      return {
        ...state,
        tools,
        coins: state.coins + 25,
        turnsUsed: 0,
        modal: null,
        view: "town",
        pendingView: null,
        seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0 },
        bubble: { id: Date.now(), npc: "tomas", text: "Bonus: +1 Reshuffle Horn · +25◉", ms: 2000 },
      };
    }
    case "DEV/ADD_GOLD":
      return { ...state, coins: state.coins + (action.amount ?? 1000) };

    case "DEV/FILL_STORAGE": {
      const inventory = { ...state.inventory };
      for (const biome of Object.values(BIOMES)) {
        for (const res of biome.resources) {
          inventory[res.key] = (inventory[res.key] || 0) + 100;
        }
      }
      return { ...state, inventory };
    }

    case "DEV/RESET_GAME": {
      // Wipe all persisted state (trophies, bonds, boss, weather, etc.) and reload
      // so every feature slice re-initialises from its default initial state.
      clearSave();
      setTimeout(() => window.location.reload(), 100);
      return state;
    }

    default:
      return state;
  }
}

function rawReducer(state, action) {
  // 1. Core reducer mutates the canonical game state for known actions.
  // 2. Then every feature slice sees the action against the post-core state,
  //    so cross-cutting effects (quests, achievements, etc.) fire.
  const afterCore = coreReducer(state, action);
  return slices.reduce((s, slice) => slice.reduce(s, action), afterCore);
}

export function gameReducer(state, action) {
  const next = rawReducer(state, action);
  if (next !== state) persistState(next);
  return next;
}
