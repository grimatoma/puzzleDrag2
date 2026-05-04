import { BIOMES, NPCS, MAX_TURNS } from "./constants.js";
import * as crafting from "./features/crafting/slice.js";
import * as quests from "./features/quests/slice.js";
import * as achievements from "./features/achievements/slice.js";
import * as tutorial from "./features/tutorial/slice.js";
import * as settings from "./features/settings/slice.js";
import * as boss from "./features/boss/slice.js";
import * as heirlooms from "./features/heirlooms/slice.js";
import * as longnight from "./features/longnight/slice.js";
import * as beasts from "./features/beasts/slice.js";
import * as cartography from "./features/cartography/slice.js";
import * as festivals from "./features/festivals/slice.js";
import * as memoryweave from "./features/memoryweave/slice.js";
import * as apprentices from "./features/apprentices/slice.js";
import * as mood from "./features/mood/slice.js";
import * as glyphs from "./features/glyphs/slice.js";

const slices = [crafting, quests, achievements, tutorial, settings, boss, heirlooms, longnight, beasts, cartography, festivals, memoryweave, apprentices, mood, glyphs];

// ─── Save/load ─────────────────────────────────────────────────────────────
// Persisted: everything except volatile UI fields (modal/bubble/view/pendingView).
const SAVE_KEY = "hearth.save.v1";
const VOLATILE = new Set(["modal", "bubble", "view", "pendingView"]);

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

export function resourceByKey(key) {
  for (const b of Object.values(BIOMES)) {
    const r = b.resources.find((x) => x.key === key);
    if (r) return r;
  }
  return null;
}

function pickNpcKey(excludeKeys = []) {
  const all = Object.keys(NPCS).filter((k) => !excludeKeys.includes(k));
  const pool = all.length ? all : Object.keys(NPCS);
  return pool[Math.floor(Math.random() * pool.length)];
}

let orderIdSeq = 1;
export function makeOrder(biomeKey, level, excludeNpcs = []) {
  const biome = BIOMES[biomeKey];
  const candidates = biome.pool.filter((k, i, a) => a.indexOf(k) === i);
  const key = candidates[Math.floor(Math.random() * candidates.length)];
  const res = resourceByKey(key);
  const baseNeed = res.value < 3 ? 8 : 4;
  const need = baseNeed + Math.floor(Math.random() * 4) + Math.floor(level / 3) * 2;
  const reward = Math.max(20, need * res.value * 6);
  const npc = pickNpcKey(excludeNpcs);
  const lines = NPCS[npc].lines;
  const line = lines[Math.floor(Math.random() * lines.length)]
    .replace("{n}", need)
    .replace("{r}", res.label.toLowerCase());
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
    inventory: {},
    orders: [o1, o2, o3],
    tools: { clear: 2, basic: 1, rare: 1, shuffle: 0 },
    built: { hearth: true },
    bubble: null,
    modal: null,
    pendingView: null,
    seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0 },
    ...crafting.initial,
    ...quests.initial,
    ...achievements.initial,
    ...tutorial.initial,
    ...settings.initial,
    ...boss.initial,
    ...heirlooms.initial,
    ...longnight.initial,
    ...beasts.initial,
    ...cartography.initial,
    ...festivals.initial,
    ...memoryweave.initial,
    ...apprentices.initial,
    ...mood.initial,
    ...glyphs.initial,
  };
  // Hydrate from save if present, but always force board view + clear modals on boot
  const saved = loadSavedState();
  if (saved) {
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
      const { key, gained, upgrades, value } = action.payload;
      const res = resourceByKey(key);
      const inventory = { ...state.inventory };
      inventory[key] = (inventory[key] || 0) + gained;
      if (res?.next && upgrades > 0) {
        inventory[res.next] = (inventory[res.next] || 0) + upgrades;
      }
      const coinsGain = Math.max(1, Math.floor((gained * value) / 2));
      const xpGain = gained * value * 3 + upgrades * 12;
      const xpResult = applyXp(state, xpGain);
      const turnsUsed = state.turnsUsed + 1;
      const seasonEnded = turnsUsed >= MAX_TURNS;
      const seasonStats = {
        ...state.seasonStats,
        harvests: state.seasonStats.harvests + gained,
        upgrades: state.seasonStats.upgrades + upgrades,
        coins: state.seasonStats.coins + coinsGain,
      };
      let bubble = state.bubble;
      if (xpResult.leveledUp) {
        bubble = { id: Date.now(), npc: "wren", text: `Level ${xpResult.level}! New things await.`, ms: 2400 };
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
      let bubble = { id: Date.now(), npc: o.npc, text: `+${o.reward}◉ — thank you!`, ms: 1600 };
      if (xpResult.leveledUp) {
        bubble = { id: Date.now(), npc: "wren", text: `Level ${xpResult.level}! New things await.`, ms: 2400 };
      }
      return {
        ...state,
        inventory,
        coins: state.coins + o.reward,
        xp: xpResult.xp,
        level: xpResult.level,
        orders: state.orders.map((x) => (x.id === o.id ? replacement : x)),
        seasonStats: { ...state.seasonStats, ordersFilled: state.seasonStats.ordersFilled + 1, coins: state.seasonStats.coins + o.reward },
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
      const replacements = state.orders.map(() => makeOrder(key, state.level));
      return { ...state, biomeKey: key, orders: replacements };
    }
    case "SET_VIEW": {
      const next = action.view;
      // Leaving the board mid-session ends the session (pop summary modal first)
      if (state.view === "board" && next !== "board" && state.turnsUsed > 0 && !state.modal) {
        return { ...state, modal: "season", pendingView: next };
      }
      return { ...state, view: next };
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
      return {
        ...state,
        coins: state.coins - (b.cost.coins || 0),
        inventory,
        built: { ...state.built, [b.id]: true },
        bubble: { id: Date.now(), npc: "mira", text: `${b.name} built! The vale grows warmer.`, ms: 2200 },
      };
    }
    case "POP_NPC":
      return { ...state, bubble: { id: Date.now(), npc: action.npc, text: action.text, ms: action.ms ?? 1800 } };
    case "DISMISS_BUBBLE":
      return state.bubble && state.bubble.id === action.id ? { ...state, bubble: null } : state;
    case "CLOSE_SEASON": {
      const tools = { ...state.tools, shuffle: (state.tools.shuffle || 0) + 1 };
      const view = state.pendingView || state.view;
      return {
        ...state,
        tools,
        coins: state.coins + 25,
        turnsUsed: 0,
        modal: null,
        view,
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
      const biomeKey = "farm";
      const level = 1;
      const o1 = makeOrder(biomeKey, level);
      const o2 = makeOrder(biomeKey, level, [o1.npc]);
      const o3 = makeOrder(biomeKey, level, [o1.npc, o2.npc]);
      return {
        ...state,
        biomeKey,
        coins: 150,
        level,
        xp: 0,
        turnsUsed: 0,
        inventory: {},
        orders: [o1, o2, o3],
        tools: { clear: 2, basic: 1, rare: 1, shuffle: 0 },
        built: { hearth: true },
        modal: null,
        bubble: { id: Date.now(), npc: "wren", text: "Game reset to fresh state.", ms: 2000 },
        seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0 },
      };
    }

    default:
      return state;
  }
}

function rawReducer(state, action) {
  // 1. Core reducer mutates the canonical game state for known actions.
  // 2. Then every feature slice sees the action against the post-core state,
  //    so cross-cutting effects (heirlooms, perks, glyphs, quests, achievements) fire.
  const afterCore = coreReducer(state, action);
  return slices.reduce((s, slice) => slice.reduce(s, action), afterCore);
}

export function gameReducer(state, action) {
  const next = rawReducer(state, action);
  if (next !== state) persistState(next);
  return next;
}
