// Achievements integration — when CLOSE_SEASON fires, every built
// building's abilities should be tallied into the new ability counters.

import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../state.js";

function withBuilt(state, ids) {
  const map = state.mapCurrent ?? "home";
  const builtForMap = { ...(state.built?.[map] ?? {}) };
  for (const id of ids) builtForMap[id] = true;
  return { ...state, built: { ...state.built, [map]: builtForMap } };
}

describe("Abilities → achievements counters", () => {
  it("powder_store fires a season_end ability — building_abilities_triggered increments by 1", () => {
    let s = createInitialState();
    s = withBuilt(s, ["hearth", "powder_store"]);
    const after = rootReducer(s, { type: "CLOSE_SEASON" });
    expect(after.achievements?.counters?.building_abilities_triggered ?? 0).toBe(1);
    expect(after.achievements?.counters?.abilities_triggered ?? 0).toBe(1);
  });

  it("housing × 3 + powder_store fire 4 building abilities at once", () => {
    let s = createInitialState();
    s = withBuilt(s, ["hearth", "housing", "housing2", "housing3", "powder_store"]);
    const after = rootReducer(s, { type: "CLOSE_SEASON" });
    expect(after.achievements.counters.building_abilities_triggered).toBe(4);
    // Two distinct ability ids fired: worker_pool_step + grant_tool.
    expect(after.achievements.counters.distinct_abilities_triggered).toBe(2);
  });

  it("silo on farm fires a session_end ability — counts toward building counter", () => {
    let s = createInitialState();
    s = withBuilt(s, ["hearth", "silo"]);
    s = {
      ...s,
      biomeKey: "farm",
      grid: [["grass_hay"]],
      farm: { savedField: null },
    };
    const after = rootReducer(s, { type: "CLOSE_SEASON" });
    expect(after.achievements.counters.building_abilities_triggered).toBe(1);
    expect(after.achievements.counters.distinct_abilities_triggered).toBe(1);
  });

  it("crossing the powerful_keep threshold (10 building abilities) unlocks it", () => {
    let s = createInitialState();
    s = withBuilt(s, ["hearth", "housing", "housing2", "housing3", "powder_store"]);
    // Each season fires 4 building abilities; 3 seasons → 12 ≥ 10.
    let next = s;
    for (let i = 0; i < 3; i++) {
      next = rootReducer(next, { type: "CLOSE_SEASON" });
    }
    expect(next.achievements.counters.building_abilities_triggered).toBe(12);
    expect(next.achievements.unlocked.powerful_keep).toBe(true);
  });

  it("ability_artisan unlocks once 5 distinct abilities have fired", async () => {
    // We don't have 5 distinct building abilities in the default catalog yet —
    // use a hand-built state to exercise the threshold via tickAchievement
    // directly instead of dispatching reducers.
    const s = createInitialState();
    let next = s;
    // distinct_abilities_triggered is incremented on first encounter only.
    // We simulate by calling rootReducer with synthetic state mutations.
    const ids = ["a1", "a2", "a3", "a4", "a5"];
    next = {
      ...next,
      achievements: {
        ...next.achievements,
        counters: { distinct_abilities_triggered: 0 },
        seenAbilities: {},
        unlocked: { ...(next.achievements?.unlocked || {}) },
      },
    };
    // Use tickAchievement directly — verifies the data layer rather than
    // requiring 5 unique abilities in the catalog at once.
    const { tickAchievement } = await import("../features/achievements/data.js");
    for (const id of ids) {
      const r = tickAchievement(next, "distinct_abilities_triggered", 1, id);
      next = r.newState;
    }
    expect(next.achievements.counters.distinct_abilities_triggered).toBe(5);
    expect(next.achievements.unlocked.ability_artisan).toBe(true);
  });
});
