import { BIOMES, BUILDINGS } from "../../constants.js";
import { tickAchievement } from "./data.js";
import { getAbility } from "../../config/abilities.js";
import { locBuilt } from "../../locBuilt.js";
import { inventoryQty } from "../../types/inventory.js";
import { zoneInventory } from "../../state/zoneInventory.js";
import type { Action, GameState } from "../../types/state.js";

export const initial = {
  trophies: {} as Record<string, unknown>,      // legacy: kept for save-compat, no longer written to
  collected: {} as Record<string, number>,
  totalHarvested: 0,
  totalChains: 0,
  longestChain: 0,
  chainsThisSeason: 0,
  totalOrders: 0,
  totalCrafted: 0,
};

// Tick one or more counters, accumulating into state.achievements canonical shape.
function tick(state: GameState, counter: string, value: number = 1, key?: string): GameState {
  const { newState } = tickAchievement(state, counter, value, key);
  return newState;
}

interface BuildingAbilityInst { id?: string; trigger?: string }

export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "CHAIN_COLLECTED": {
      const payload = action.payload;
      if (Array.isArray(payload.chain) && payload.chain.length > 0 && payload.chain.every((t: { key?: string }) => t.key === "rat")) {
        return state;
      }
      const actualKey = payload.key;
      const actualGained = payload.gained || 0;
      const actualChain = payload.chainLength || 0;
      const upgrades = payload.upgrades || 0;

      const collected: Record<string, number> = { ...state.collected };
      if (actualKey) {
        collected[actualKey] = (collected[actualKey] || 0) + actualGained;
      }

      // credit upgraded resource
      const allRes = [...BIOMES.farm.resources, ...BIOMES.mine.resources] as Array<{ key: string; next?: string | null }>;
      const res = actualKey ? allRes.find((r) => r.key === actualKey) : undefined;
      if (res?.next && upgrades > 0) {
        collected[res.next] = (collected[res.next] || 0) + upgrades;
      }

      const totalHarvested = state.totalHarvested + actualGained + upgrades;
      const totalChains = state.totalChains + 1;
      const longestChain = Math.max(state.longestChain, actualChain);
      const chainsThisSeason = state.chainsThisSeason + 1;

      let next: GameState = {
        ...state,
        collected,
        totalHarvested,
        totalChains,
        longestChain,
        chainsThisSeason,
      };

      // Tick canonical achievement counters
      next = tick(next, "chains_committed", 1);
      if (actualKey) {
        next = tick(next, "distinct_resources_chained", 1, actualKey);
      }
      // Fish-biome milestones — credit every tile_fish_* chain by its tile count.
      if (typeof actualKey === "string" && actualKey.startsWith("tile_fish_") && actualGained > 0) {
        next = tick(next, "fish_chained", actualGained);
      }
      // Mine-biome milestones — credit every tile_mine_* chain by its tile count.
      if (typeof actualKey === "string" && actualKey.startsWith("tile_mine_") && actualGained > 0) {
        next = tick(next, "mine_chained", actualGained);
      }
      // Per-category milestones — prefix-match the chain key (tile_<family>_).
      if (typeof actualKey === "string" && actualGained > 0) {
        if (actualKey.startsWith("tile_veg_")) next = tick(next, "veg_chained", actualGained);
        else if (actualKey.startsWith("tile_fruit_")) next = tick(next, "fruit_chained", actualGained);
        else if (actualKey.startsWith("tile_flower_")) next = tick(next, "flower_chained", actualGained);
        else if (actualKey.startsWith("tile_herd_")) next = tick(next, "herd_chained", actualGained);
        else if (actualKey.startsWith("tile_cattle_")) next = tick(next, "cattle_chained", actualGained);
        else if (actualKey.startsWith("tile_mount_")) next = tick(next, "mount_chained", actualGained);
        else if (actualKey.startsWith("tile_tree_")) next = tick(next, "tree_chained", actualGained);
        else if (actualKey.startsWith("tile_bird_")) next = tick(next, "bird_chained", actualGained);
      }

      return next;
    }

    case "TURN_IN_ORDER": {
      const order = state.orders.find((o) => o.id === action.id);
      const needed = (order?.need ?? order?.amount) ?? 0;
      if (!order || inventoryQty(zoneInventory(state), order.key) < needed) return state;
      const next: GameState = { ...state, totalOrders: state.totalOrders + 1 };
      return tick(next, "orders_fulfilled", 1);
    }

    case "BUILD": {
      const buildKey = action.building?.id ?? action.payload?.id;
      return tick(state, "distinct_buildings_built", 1, buildKey);
    }

    case "BOSS/RESOLVE": {
      const won = action.won;
      if (won === true) return tick(state, "bosses_defeated", 1);
      return state;
    }

    case "CLOSE_SEASON": {
      let next: GameState = {
        ...state,
        chainsThisSeason: 0,
      };
      // Building abilities firing at season-end. The achievements slice
      // receives the post-core-reducer state, so `state` here already has the
      // right `built` map for the action. session_end fires at the same
      // lifecycle moment as season_end (the silo/barn snapshot lives inside
      // CLOSE_SEASON), so we tick both triggers here.
      const built: Record<string, boolean> = (locBuilt(state) as Record<string, boolean>) || {};
      for (const b of BUILDINGS as Array<{ id: string; abilities?: BuildingAbilityInst[] }>) {
        if (!built[b.id]) continue;
        if (!Array.isArray(b.abilities) || b.abilities.length === 0) continue;
        for (const inst of b.abilities) {
          const def = getAbility(inst?.id) as { trigger?: string } | undefined | null;
          if (!def) continue;
          const trigger = inst.trigger || def.trigger;
          if (trigger !== "season_end" && trigger !== "session_end") continue;
          next = tick(next, "abilities_triggered", 1);
          next = tick(next, "building_abilities_triggered", 1);
          if (inst.id) {
            next = tick(next, "distinct_abilities_triggered", 1, inst.id);
          }
        }
      }
      return next;
    }

    case "CRAFTING/CRAFT_RECIPE": {
      // Instant craft — bump unconditionally; the slice's CRAFT_RECIPE always
      // succeeds (state.js's coreReducer + crafting slice both validate inputs).
      // Queued completions (CLAIM_CRAFT / SKIP_CRAFT) handle their own bump
      // in the crafting slice itself, where the validation lives.
      return { ...state, totalCrafted: state.totalCrafted + 1 };
    }

    case "CONVERT_TO_SUPPLY": {
      const qty = Math.max(1, (action.payload?.qty ?? 0) | 0);
      return tick(state, "supplies_converted", qty);
    }

    default:
      return state;
  }
}
