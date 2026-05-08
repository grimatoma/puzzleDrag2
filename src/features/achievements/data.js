/**
 * Phase 7.3 — Achievement counters and unlock manifest.
 * Achievements tick quietly during normal play; a floater fires on milestone.
 * At least 10 achievements in Phase 7; Phase 11 can layer cosmetics on top.
 */

export const ACHIEVEMENTS = [
  // chains_committed
  { id: "first_steps",    name: "First Steps",                desc: "Complete your first chain",                      counter: "chains_committed",           threshold: 1,   target: 1,   reward: { coins: 25 } },
  { id: "patient_hands",  name: "Patient Hands",              desc: "Complete 10 chains",                             counter: "chains_committed",           threshold: 10,  target: 10,  reward: { coins: 50 } },
  { id: "tireless",       name: "Tireless",                   desc: "Complete 100 chains",                            counter: "chains_committed",           threshold: 100, target: 100, reward: { coins: 100 } },
  // orders_fulfilled
  { id: "trusted_friend", name: "Trusted Friend",             desc: "Fill 5 villager orders",                         counter: "orders_fulfilled",           threshold: 5,   target: 5,   reward: { coins: 50 } },
  { id: "village_voice",  name: "Village Voice",              desc: "Fill 25 villager orders",                        counter: "orders_fulfilled",           threshold: 25,  target: 25,  reward: { coins: 150 } },
  // bosses_defeated
  { id: "first_blood",    name: "First Blood",                desc: "Defeat your first seasonal boss",                counter: "bosses_defeated",            threshold: 1,   target: 1,   reward: { coins: 200 } },
  { id: "champion",       name: "Champion",                   desc: "Defeat 4 seasonal bosses",                       counter: "bosses_defeated",            threshold: 4,   target: 4,   reward: { tools: { magic_wand: 1 } } },
  // festival_won
  { id: "true_keeper",    name: "True Keeper of the Vale",    desc: "Win the harvest festival",                       counter: "festival_won",               threshold: 1,   target: 1,   reward: { coins: 500 } },
  // distinct_resources_chained
  { id: "naturalist",     name: "Naturalist",                 desc: "Chain 8 different resource types",               counter: "distinct_resources_chained", threshold: 8,   target: 8,   reward: { coins: 75 } },
  { id: "polymath",       name: "Polymath",                   desc: "Chain 15 different resource types",              counter: "distinct_resources_chained", threshold: 15,  target: 15,  reward: { tools: { magic_seed: 1 } } },
  // distinct_buildings_built
  { id: "town_planner",   name: "Town Planner",               desc: "Construct 5 different buildings",                counter: "distinct_buildings_built",   threshold: 5,   target: 5,   reward: { coins: 100 } },
  // supplies_converted
  { id: "supply_chain",   name: "Supply Chain",               desc: "Convert 10 grain bundles into supplies",         counter: "supplies_converted",         threshold: 10,  target: 10,  reward: { coins: 50 } },
  // fish_chained — fish-biome harvest milestones
  { id: "first_catch",    name: "First Catch",                desc: "Land your first fish chain at the harbor",       counter: "fish_chained",               threshold: 1,   target: 1,   reward: { coins: 25 } },
  { id: "tide_runner",    name: "Tide Runner",                desc: "Harvest 50 fish across the harbor",              counter: "fish_chained",               threshold: 50,  target: 50,  reward: { coins: 75 } },
  { id: "master_angler",  name: "Master Angler",              desc: "Haul in 200 fish across the harbor",             counter: "fish_chained",               threshold: 200, target: 200, reward: { tools: { magic_wand: 1 } } },
  // mine_chained — mine-biome harvest milestones
  { id: "first_strike",   name: "First Strike",               desc: "Quarry your first mine chain",                  counter: "mine_chained",               threshold: 1,   target: 1,   reward: { coins: 25 } },
  { id: "deep_digger",    name: "Deep Digger",                desc: "Pull 50 stone / ore / coal / gems from the mine", counter: "mine_chained",            threshold: 50,  target: 50,  reward: { coins: 75 } },
  { id: "mine_master",    name: "Mine Master",                desc: "Haul 200 mine resources across all veins",      counter: "mine_chained",               threshold: 200, target: 200, reward: { tools: { magic_seed: 1 } } },
  // Per-category harvest milestones
  { id: "veg_patron",     name: "Vegetable Patron",           desc: "Harvest 50 vegetables of any kind",              counter: "veg_chained",                threshold: 50,  target: 50,  reward: { coins: 75 } },
  { id: "orchard_friend", name: "Orchard's Friend",           desc: "Pick 50 fruits across the vale",                  counter: "fruit_chained",              threshold: 50,  target: 50,  reward: { coins: 75 } },
  { id: "pollinator",     name: "Pollinator",                 desc: "Cut 30 flowers from the meadows",                 counter: "flower_chained",             threshold: 30,  target: 30,  reward: { coins: 60 } },
  { id: "herder",         name: "Herder",                     desc: "Drive 30 herd animals from the moors",            counter: "herd_chained",               threshold: 30,  target: 30,  reward: { coins: 60 } },
];

/**
 * Pure: tick a counter on state.achievements.
 * For distinct_resources_chained and distinct_buildings_built, pass key= to
 * track first-time seen. Other counters increment by value (default 1).
 *
 * Returns { newState, unlocked: [ids of newly-unlocked achievements] }.
 */
export function tickAchievement(state, counter, value = 1, key) {
  const ach = state.achievements ?? {
    counters: {}, unlocked: {}, seenResources: {}, seenBuildings: {},
  };
  let counters = ach.counters;
  let seenResources = ach.seenResources ?? {};
  let seenBuildings = ach.seenBuildings ?? {};

  // Distinct-resource counter: only tick on first encounter of each key
  if (counter === "distinct_resources_chained" && key) {
    if (seenResources[key]) return { newState: state, unlocked: [] };
    seenResources = { ...seenResources, [key]: true };
    counters = { ...counters, [counter]: (counters[counter] ?? 0) + 1 };
  } else if (counter === "distinct_buildings_built" && key) {
    if (seenBuildings[key]) return { newState: state, unlocked: [] };
    seenBuildings = { ...seenBuildings, [key]: true };
    counters = { ...counters, [counter]: (counters[counter] ?? 0) + 1 };
  } else {
    counters = { ...counters, [counter]: (counters[counter] ?? 0) + value };
  }

  const newCount = counters[counter] ?? 0;
  const prevCount = ach.counters[counter] ?? 0;

  // Check which achievements just crossed their threshold
  const newlyUnlocked = [];
  const unlocked = { ...ach.unlocked };
  let rewardState = { ...state, achievements: { ...ach, counters, unlocked, seenResources, seenBuildings } };
  for (const a of ACHIEVEMENTS) {
    if (a.counter !== counter) continue;
    if (unlocked[a.id]) continue; // already unlocked — idempotent
    if (prevCount < a.threshold && newCount >= a.threshold) {
      unlocked[a.id] = true;
      newlyUnlocked.push(a.id);
      // Grant reward immediately on unlock
      if (a.reward) {
        if (a.reward.coins) {
          rewardState = { ...rewardState, coins: (rewardState.coins ?? 0) + a.reward.coins };
        }
        if (a.reward.tools) {
          const tools = { ...rewardState.tools };
          for (const [k, v] of Object.entries(a.reward.tools)) {
            tools[k] = (tools[k] ?? 0) + v;
          }
          rewardState = { ...rewardState, tools };
        }
      }
    }
  }

  return {
    newState: {
      ...rewardState,
      achievements: { ...ach, counters, unlocked, seenResources, seenBuildings },
    },
    unlocked: newlyUnlocked,
  };
}
