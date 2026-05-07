/**
 * Phase 7.3 — Achievement counters and unlock manifest.
 * Achievements tick quietly during normal play; a floater fires on milestone.
 * At least 10 achievements in Phase 7; Phase 11 can layer cosmetics on top.
 */

export const ACHIEVEMENTS = [
  // chains_committed
  { id: "first_steps",    name: "First Steps",                counter: "chains_committed",           threshold: 1   },
  { id: "patient_hands",  name: "Patient Hands",              counter: "chains_committed",           threshold: 10  },
  { id: "tireless",       name: "Tireless",                   counter: "chains_committed",           threshold: 100 },
  // orders_fulfilled
  { id: "trusted_friend", name: "Trusted Friend",             counter: "orders_fulfilled",           threshold: 5   },
  { id: "village_voice",  name: "Village Voice",              counter: "orders_fulfilled",           threshold: 25  },
  // bosses_defeated
  { id: "first_blood",    name: "First Blood",                counter: "bosses_defeated",            threshold: 1   },
  { id: "champion",       name: "Champion",                   counter: "bosses_defeated",            threshold: 4   },
  // festival_won
  { id: "true_keeper",    name: "True Keeper of the Vale",    counter: "festival_won",               threshold: 1   },
  // distinct_resources_chained
  { id: "naturalist",     name: "Naturalist",                 counter: "distinct_resources_chained", threshold: 8   },
  { id: "polymath",       name: "Polymath",                   counter: "distinct_resources_chained", threshold: 15  },
  // distinct_buildings_built
  { id: "town_planner",   name: "Town Planner",               counter: "distinct_buildings_built",   threshold: 5   },
  // supplies_converted
  { id: "supply_chain",   name: "Supply Chain",               counter: "supplies_converted",         threshold: 10  },
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
  for (const a of ACHIEVEMENTS) {
    if (a.counter !== counter) continue;
    if (unlocked[a.id]) continue; // already unlocked — idempotent
    if (prevCount < a.threshold && newCount >= a.threshold) {
      unlocked[a.id] = true;
      newlyUnlocked.push(a.id);
    }
  }

  return {
    newState: {
      ...state,
      achievements: { ...ach, counters, unlocked, seenResources, seenBuildings },
    },
    unlocked: newlyUnlocked,
  };
}
