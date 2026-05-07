import { ACHIEVEMENTS, BIOMES } from "../../constants.js";


export const initial = {
  trophies: {},
  collected: {},
  totalHarvested: 0,
  totalChains: 0,
  longestChain: 0,
  chainsThisSeason: 0,
  totalOrders: 0,
  totalCrafted: 0,
};

function getMetric(state, eventKey) {
  switch (eventKey) {
    case "totalHarvested":   return state.totalHarvested || 0;
    case "longestChain":     return state.longestChain || 0;
    case "chainsThisSeason": return state.chainsThisSeason || 0;
    case "totalOrders":      return state.totalOrders || 0;
    case "buildingCount": {
      // Count only boolean/true entries (actual buildings), not sub-objects like decorations
      const built = state.built || {};
      return Object.values(built).filter((v) => v === true).length;
    }
    case "seasonsCycled":    return state.seasonsCycled || 0;
    case "totalCrafted":     return state.totalCrafted || 0;
    default:
      // resource key
      return (state.collected || {})[eventKey] || 0;
  }
}

function checkTrophies(state) {
  const trophies = { ...state.trophies };
  let coins = state.coins || 0;
  let xp = state.xp || 0;
  let bubble = state.bubble;
  let changed = false;

  for (const a of ACHIEVEMENTS) {
    if (trophies[a.id] === "claimed") continue;
    const val = getMetric(state, a.eventKey);
    if (val >= a.target && !trophies[a.id]) {
      // Auto-grant reward immediately on unlock
      trophies[a.id] = "claimed";
      coins += (a.reward.coins || 0);
      xp += (a.reward.xp || 0);

      // Only show achievement toast if no higher-priority bubble (level-up, winter, boss) is already set
      if (!bubble || (bubble.priority || 0) < 2) {
        bubble = { id: Date.now(), npc: "wren", text: `🏆 ${a.name}! +${a.reward.coins || 0}◉`, ms: 2000, priority: 1 };
      }
      changed = true;
    }
  }

  if (!changed) return state;
  return { ...state, trophies, coins, xp, bubble };
}

export function reduce(state, action) {
  switch (action.type) {
    case "CHAIN_COLLECTED": {
      const payload = action.payload || action;
      const actualKey = payload.key;
      const actualGained = payload.gained || 0;
      const actualChain = payload.chainLength || 0;
      const upgrades = payload.upgrades || 0;

      const collected = { ...state.collected };
      collected[actualKey] = (collected[actualKey] || 0) + actualGained;

      // credit upgraded resource
      const allRes = [...BIOMES.farm.resources, ...BIOMES.mine.resources];
      const res = allRes.find((r) => r.key === actualKey);
      if (res?.next && upgrades > 0) {
        collected[res.next] = (collected[res.next] || 0) + upgrades;
      }

      const totalHarvested = (state.totalHarvested || 0) + actualGained + upgrades;
      const totalChains = (state.totalChains || 0) + 1;
      const longestChain = Math.max(state.longestChain || 0, actualChain);
      const chainsThisSeason = (state.chainsThisSeason || 0) + 1;

      const next = {
        ...state,
        collected,
        totalHarvested,
        totalChains,
        longestChain,
        chainsThisSeason,
      };
      return checkTrophies(next);
    }

    case "TURN_IN_ORDER": {
      const order = (state.orders || []).find((o) => o.id === action.id);
      if (!order || ((state.inventory || {})[order.key] || 0) < order.need) return state;
      const next = { ...state, totalOrders: (state.totalOrders || 0) + 1 };
      return checkTrophies(next);
    }

    case "BUILD": {
      return checkTrophies(state);
    }

    case "CLOSE_SEASON": {
      const next = {
        ...state,
        chainsThisSeason: 0,
      };
      return checkTrophies(next);
    }

    case "CRAFTING/CRAFT_RECIPE": {
      const next = { ...state, totalCrafted: (state.totalCrafted || 0) + 1 };
      return checkTrophies(next);
    }

    default:
      return state;
  }
}
