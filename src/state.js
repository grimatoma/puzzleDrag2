import { BIOMES, NPCS, MAX_TURNS } from "./constants.js";

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
  return {
    biomeKey,
    view: "board",
    coins: 150,
    level,
    xp: 0,
    turnsUsed: 0,
    inventory: {},
    orders: [makeOrder(biomeKey, level), makeOrder(biomeKey, level, ["mira"])],
    tools: { clear: 2, basic: 1, rare: 1, shuffle: 0 },
    built: { hearth: true },
    bubble: null,
    modal: null,
    seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0 },
  };
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

export function gameReducer(state, action) {
  switch (action.type) {
    case "CHAIN_COLLECTED": {
      // payload: { key, gained, upgrades, chainLength, value }
      const { key, gained, upgrades, chainLength, value } = action.payload;
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
      } else {
        const r = biome.resources[0];
        inventory[r.key] = (inventory[r.key] || 0) + 5;
      }
      return {
        ...state,
        tools,
        inventory,
        bubble: { id: Date.now(), npc: "bram", text: `${key === "rare" ? "+Rare" : key === "basic" ? "+Basic" : "Clear"} — used!`, ms: 1500 },
      };
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
    case "SET_VIEW":
      return { ...state, view: action.view };
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
      return {
        ...state,
        tools,
        coins: state.coins + 25,
        turnsUsed: 0,
        modal: null,
        seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0 },
        bubble: { id: Date.now(), npc: "tomas", text: "Bonus: +1 Reshuffle Horn · +25◉", ms: 2000 },
      };
    }
    default:
      return state;
  }
}
