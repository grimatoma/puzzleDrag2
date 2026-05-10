import { BIOMES, BUILDINGS } from "../../constants.js";
import { tickAchievement } from "./data.js";
import { getAbility } from "../../config/abilities.js";
import { locBuilt } from "../../locBuilt.js";

export const initial = {
  trophies: {},      // legacy: kept for save-compat, no longer written to
  collected: {},
  totalHarvested: 0,
  totalChains: 0,
  longestChain: 0,
  chainsThisSeason: 0,
  totalOrders: 0,
  totalCrafted: 0,
};

// Tick one or more counters, accumulating into state.achievements canonical shape.
function tick(state, counter, value = 1, key) {
  const { newState } = tickAchievement(state, counter, value, key);
  return newState;
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

      let next = {
        ...state,
        collected,
        totalHarvested,
        totalChains,
        longestChain,
        chainsThisSeason,
      };

      // Tick canonical achievement counters
      next = tick(next, "chains_committed", 1);
      next = tick(next, "distinct_resources_chained", 1, actualKey);
      // Fish-biome milestones — credit every fish_* chain by its tile count.
      if (typeof actualKey === "string" && actualKey.startsWith("fish_") && actualGained > 0) {
        next = tick(next, "fish_chained", actualGained);
      }
      // Mine-biome milestones — credit every mine_* chain by its tile count.
      if (typeof actualKey === "string" && actualKey.startsWith("mine_") && actualGained > 0) {
        next = tick(next, "mine_chained", actualGained);
      }
      // Per-category milestones — prefix-match the chain key.
      if (typeof actualKey === "string" && actualGained > 0) {
        if (actualKey.startsWith("veg_")) next = tick(next, "veg_chained", actualGained);
        else if (actualKey.startsWith("fruit_")) next = tick(next, "fruit_chained", actualGained);
        else if (actualKey.startsWith("flower_")) next = tick(next, "flower_chained", actualGained);
        else if (actualKey.startsWith("herd_")) next = tick(next, "herd_chained", actualGained);
        else if (actualKey.startsWith("cattle_")) next = tick(next, "cattle_chained", actualGained);
        else if (actualKey.startsWith("mount_")) next = tick(next, "mount_chained", actualGained);
        else if (actualKey.startsWith("tree_")) next = tick(next, "tree_chained", actualGained);
        else if (actualKey.startsWith("bird_")) next = tick(next, "bird_chained", actualGained);
      }

      return next;
    }

    case "TURN_IN_ORDER": {
      const order = (state.orders || []).find((o) => o.id === action.id);
      if (!order || ((state.inventory || {})[order.key] || 0) < order.need) return state;
      const next = { ...state, totalOrders: (state.totalOrders || 0) + 1 };
      return tick(next, "orders_fulfilled", 1);
    }

    case "BUILD": {
      const buildKey = action.payload?.key ?? action.key;
      return tick(state, "distinct_buildings_built", 1, buildKey);
    }

    case "BOSS/RESOLVE": {
      if (action.payload?.won === true) return tick(state, "bosses_defeated", 1);
      return state;
    }

    case "CLOSE_SEASON": {
      let next = {
        ...state,
        chainsThisSeason: 0,
      };
      // Building abilities firing at season-end. The achievements slice
      // receives the post-core-reducer state, so `state` here already has the
      // right `built` map for the action. session_end fires at the same
      // lifecycle moment as season_end (the silo/barn snapshot lives inside
      // CLOSE_SEASON), so we tick both triggers here.
      const built = locBuilt(state) || {};
      for (const b of BUILDINGS) {
        if (!built[b.id]) continue;
        if (!Array.isArray(b.abilities) || b.abilities.length === 0) continue;
        for (const inst of b.abilities) {
          const def = getAbility(inst?.id);
          if (!def) continue;
          const trigger = inst.trigger || def.trigger;
          if (trigger !== "season_end" && trigger !== "session_end") continue;
          next = tick(next, "abilities_triggered", 1);
          next = tick(next, "building_abilities_triggered", 1);
          next = tick(next, "distinct_abilities_triggered", 1, inst.id);
          if (inst.id === "grant_tool" || inst.id === "season_bonus") {
            next = tick(next, "season_end_building_bonus", 1);
          }
        }
      }
      return next;
    }

    case "CRAFTING/CRAFT_RECIPE": {
      return { ...state, totalCrafted: (state.totalCrafted || 0) + 1 };
    }

    case "CONVERT_TO_SUPPLY": {
      const qty = Math.max(1, action.payload?.qty | 0);
      return tick(state, "supplies_converted", qty);
    }

    default:
      return state;
  }
}
