/**
 * Phase 7.3 — Achievement counters and unlock manifest.
 * Achievements tick quietly during normal play; a floater fires on milestone.
 * At least 10 achievements in Phase 7; Phase 11 can layer cosmetics on top.
 */

import type { GameState } from "../../types/state.js";

export interface AchievementReward {
  coins?: number;
  xp?: number;
  tools?: Record<string, number>;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  counter: string;
  threshold: number;
  target: number;
  reward?: AchievementReward;
  look: { icon: string };
  trigger?: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // chains_committed
  { id: "first_steps",    name: "First Steps",                desc: "Complete your first chain",                      counter: "chains_committed",           threshold: 1,   target: 1,   reward: { coins: 25 },   look: { icon: "ach_first_steps" } },
  { id: "patient_hands",  name: "Patient Hands",              desc: "Complete 10 chains",                             counter: "chains_committed",           threshold: 10,  target: 10,  reward: { coins: 50 },   look: { icon: "ach_patient_hands" } },
  { id: "tireless",       name: "Tireless",                   desc: "Complete 100 chains",                            counter: "chains_committed",           threshold: 100, target: 100, reward: { coins: 100 },  look: { icon: "ach_tireless" } },
  // orders_fulfilled
  { id: "trusted_friend", name: "Trusted Friend",             desc: "Fill 5 villager orders",                         counter: "orders_fulfilled",           threshold: 5,   target: 5,   reward: { coins: 50 },   look: { icon: "ach_trusted_friend" } },
  { id: "village_voice",  name: "Village Voice",              desc: "Fill 25 villager orders",                        counter: "orders_fulfilled",           threshold: 25,  target: 25,  reward: { coins: 150 },  look: { icon: "ach_village_voice" } },
  // bosses_defeated
  { id: "first_blood",    name: "First Blood",                desc: "Defeat your first seasonal boss",                counter: "bosses_defeated",            threshold: 1,   target: 1,   reward: { coins: 200 },  look: { icon: "ach_first_blood" } },
  { id: "champion",       name: "Champion",                   desc: "Defeat 4 seasonal bosses",                       counter: "bosses_defeated",            threshold: 4,   target: 4,   reward: { tools: { magic_wand: 1 } }, look: { icon: "ach_champion" } },
  // distinct_resources_chained
  { id: "naturalist",     name: "Naturalist",                 desc: "Chain 8 different resource types",               counter: "distinct_resources_chained", threshold: 8,   target: 8,   reward: { coins: 75 },   look: { icon: "ach_naturalist" } },
  { id: "polymath",       name: "Polymath",                   desc: "Chain 15 different resource types",              counter: "distinct_resources_chained", threshold: 15,  target: 15,  reward: { tools: { magic_seed: 1 } }, look: { icon: "ach_polymath" } },
  // distinct_buildings_built
  { id: "town_planner",   name: "Town Planner",               desc: "Construct 5 different buildings",                counter: "distinct_buildings_built",   threshold: 5,   target: 5,   reward: { coins: 100 },  look: { icon: "ach_town_planner" } },
  // supplies_converted
  { id: "supply_chain",   name: "Supply Chain",               desc: "Convert 10 grain bundles into supplies",         counter: "supplies_converted",         threshold: 10,  target: 10,  reward: { coins: 50 },   look: { icon: "ach_supply_chain" } },
  // fish_chained — fish-biome harvest milestones
  { id: "first_catch",    name: "First Catch",                desc: "Land your first fish chain at the harbor",       counter: "fish_chained",               threshold: 1,   target: 1,   reward: { coins: 25 },   look: { icon: "ach_first_catch" } },
  { id: "tide_runner",    name: "Tide Runner",                desc: "Harvest 50 fish across the harbor",              counter: "fish_chained",               threshold: 50,  target: 50,  reward: { coins: 75 },   look: { icon: "ach_tide_runner" } },
  { id: "master_angler",  name: "Master Angler",              desc: "Haul in 200 fish across the harbor",             counter: "fish_chained",               threshold: 200, target: 200, reward: { tools: { magic_wand: 1 } }, look: { icon: "ach_master_angler" } },
  // mine_chained — mine-biome harvest milestones
  { id: "first_strike",   name: "First Strike",               desc: "Quarry your first mine chain",                  counter: "mine_chained",               threshold: 1,   target: 1,   reward: { coins: 25 },   look: { icon: "ach_first_strike" } },
  { id: "deep_digger",    name: "Deep Digger",                desc: "Pull 50 stone / ore / coal / gems from the mine", counter: "mine_chained",            threshold: 50,  target: 50,  reward: { coins: 75 },   look: { icon: "ach_deep_digger" } },
  { id: "mine_master",    name: "Mine Master",                desc: "Haul 200 mine resources across all veins",      counter: "mine_chained",               threshold: 200, target: 200, reward: { tools: { magic_seed: 1 } }, look: { icon: "ach_mine_master" } },
  // Per-category harvest milestones
  { id: "veg_patron",     name: "Vegetable Patron",           desc: "Harvest 50 vegetables of any kind",              counter: "veg_chained",                threshold: 50,  target: 50,  reward: { coins: 75 },   look: { icon: "ach_veg_patron" } },
  { id: "orchard_friend", name: "Orchard Hand",               desc: "Pick 50 fruits",                                  counter: "fruit_chained",              threshold: 50,  target: 50,  reward: { coins: 75 },   look: { icon: "ach_orchard_friend" } },
  { id: "pollinator",     name: "Pollinator",                 desc: "Cut 30 flowers from the meadows",                 counter: "flower_chained",             threshold: 30,  target: 30,  reward: { coins: 60 },   look: { icon: "ach_pollinator" } },
  { id: "herder",         name: "Herder",                     desc: "Drive 30 herd animals from the moors",            counter: "herd_chained",               threshold: 30,  target: 30,  reward: { coins: 60 },   look: { icon: "ach_herder" } },
  // Cattle / mount / tree / bird category milestones
  { id: "dairyman",       name: "Dairyman",                   desc: "Drive 30 cattle into the milking shed",          counter: "cattle_chained",             threshold: 30,  target: 30,  reward: { coins: 60 },   look: { icon: "ach_dairyman" } },
  { id: "stable_hand",    name: "Stable Hand",                desc: "Lead 30 mounts through the stables",             counter: "mount_chained",              threshold: 30,  target: 30,  reward: { coins: 60 },   look: { icon: "ach_stable_hand" } },
  { id: "forester",       name: "Forester",                   desc: "Fell 50 trees",                                   counter: "tree_chained",               threshold: 50,  target: 50,  reward: { coins: 75 },   look: { icon: "ach_forester" } },
  { id: "fowler",         name: "Fowler",                     desc: "Gather 50 birds across the yards",               counter: "bird_chained",               threshold: 50,  target: 50,  reward: { coins: 75 },   look: { icon: "ach_fowler" } },
  // Ability-driven achievements (unlocked by the unified abilities pipeline).
  { id: "powerful_keep",   name: "Powerful Keep",       desc: "Trigger 10 building abilities",                  counter: "building_abilities_triggered", threshold: 10, target: 10, reward: { coins: 100 },  look: { icon: "ach_powerful_keep" } },
  { id: "ability_artisan", name: "Ability Artisan",     desc: "Trigger 5 distinct abilities",                   counter: "distinct_abilities_triggered", threshold: 5,  target: 5,  reward: { coins: 150 },  look: { icon: "ach_ability_artisan" } },
];

export interface AchievementsSlice {
  counters: Record<string, number>;
  unlocked: Record<string, boolean>;
  seenResources: Record<string, boolean>;
  seenBuildings: Record<string, boolean>;
  seenAbilities: Record<string, boolean>;
}

export interface TickAchievementResult {
  newState: GameState;
  unlocked: string[];
}

/**
 * Pure: tick a counter on state.achievements.
 * For distinct_resources_chained, distinct_buildings_built, and
 * distinct_abilities_triggered, pass key= to track first-time seen.
 * Other counters increment by value (default 1).
 *
 * Returns { newState, unlocked: [ids of newly-unlocked achievements] }.
 */
export function tickAchievement(state: GameState, counter: string, value: number = 1, key?: string): TickAchievementResult {
  const ach: AchievementsSlice = (state as GameState & { achievements?: AchievementsSlice }).achievements ?? {
    counters: {}, unlocked: {}, seenResources: {}, seenBuildings: {}, seenAbilities: {},
  };
  let counters: Record<string, number> = ach.counters;
  let seenResources: Record<string, boolean> = ach.seenResources ?? {};
  let seenBuildings: Record<string, boolean> = ach.seenBuildings ?? {};
  let seenAbilities: Record<string, boolean> = ach.seenAbilities ?? {};

  // Distinct-key counters: only tick on first encounter of each key
  if (counter === "distinct_resources_chained" && key) {
    if (seenResources[key]) return { newState: state, unlocked: [] };
    seenResources = { ...seenResources, [key]: true };
    counters = { ...counters, [counter]: (counters[counter] ?? 0) + 1 };
  } else if (counter === "distinct_buildings_built" && key) {
    if (seenBuildings[key]) return { newState: state, unlocked: [] };
    seenBuildings = { ...seenBuildings, [key]: true };
    counters = { ...counters, [counter]: (counters[counter] ?? 0) + 1 };
  } else if (counter === "distinct_abilities_triggered" && key) {
    if (seenAbilities[key]) return { newState: state, unlocked: [] };
    seenAbilities = { ...seenAbilities, [key]: true };
    counters = { ...counters, [counter]: (counters[counter] ?? 0) + 1 };
  } else {
    counters = { ...counters, [counter]: (counters[counter] ?? 0) + value };
  }

  const newCount: number = counters[counter] ?? 0;
  const prevCount: number = ach.counters[counter] ?? 0;

  // Check which achievements just crossed their threshold
  const newlyUnlocked: string[] = [];
  const unlocked: Record<string, boolean> = { ...ach.unlocked };
  let rewardState: GameState = { ...state, achievements: { ...ach, counters, unlocked, seenResources, seenBuildings, seenAbilities } } as GameState;
  for (const a of ACHIEVEMENTS) {
    if (a.counter !== counter) continue;
    if (unlocked[a.id]) continue; // already unlocked — idempotent
    if (prevCount < a.threshold && newCount >= a.threshold) {
      unlocked[a.id] = true;
      newlyUnlocked.push(a.id);
      // Grant reward immediately on unlock
      if (a.reward) {
        if (a.reward.coins) {
          rewardState = { ...rewardState, coins: ((rewardState as GameState & { coins?: number }).coins ?? 0) + a.reward.coins } as GameState;
        }
        if (a.reward.tools) {
          const tools: Record<string, number> = { ...((rewardState as GameState & { tools?: Record<string, number> }).tools ?? {}) };
          for (const [k, v] of Object.entries(a.reward.tools)) {
            tools[k] = (tools[k] ?? 0) + v;
          }
          rewardState = { ...rewardState, tools } as GameState;
        }
      }
    }
  }

  return {
    newState: {
      ...rewardState,
      achievements: { ...ach, counters, unlocked, seenResources, seenBuildings, seenAbilities },
    } as GameState,
    unlocked: newlyUnlocked,
  };
}
