import { describe, it, expect, beforeEach } from "vitest";
import { createInitialState, rootReducer } from "../state.js";
import { turnBudgetForZone } from "../features/zones/data.js";

beforeEach(() => global.localStorage.clear());

function seenTutorial(state) {
  return { ...state, tutorial: { ...state.tutorial, seen: true, active: false } };
}

describe("farmRun turn budgets", () => {
  it("applies additive building bonuses before fertilizer multipliers", () => {
    const base = createInitialState();
    const state = {
      ...base,
      built: { ...base.built, home: { ...base.built.home, granary: true } },
    };
    expect(turnBudgetForZone(state, "home", { useFertilizer: true })).toBe(22);
  });

  it("ends normal farming exactly when turnsRemaining reaches 0", () => {
    const state = seenTutorial({
      ...createInitialState(),
      view: "board",
      farmRun: { zoneId: "home", turnBudget: 2, turnsRemaining: 1, startedAt: 1 },
    });
    const next = rootReducer(state, {
      type: "CHAIN_COLLECTED",
      payload: { key: "grass_hay", gained: 3, upgrades: 0, value: 1, chainLength: 3 },
    });
    expect(next.farmRun.turnsRemaining).toBe(0);
    expect(next.modal).toBe("season");
  });
});

describe("keeper trials", () => {
  function keeperReadyState() {
    const base = createInitialState();
    return seenTutorial({
      ...base,
      built: {
        ...base.built,
        home: { ...base.built.home, granary: true, larder: true, inn: true },
      },
      settlements: { home: { founded: true } },
    });
  }

  it("starts Drive Out as a special keeper trial board", () => {
    const next = rootReducer(keeperReadyState(), {
      type: "KEEPER/START_TRIAL",
      payload: { zoneId: "home", path: "driveout" },
    });
    expect(next.activeTrial).toMatchObject({ zoneId: "home", path: "driveout", status: "active" });
    expect(next.farmRun).toMatchObject({ mode: "keeperTrial", turnBudget: 12, turnsRemaining: 12 });
    expect(next.boss?.isKeeperTrial).toBe(true);
    expect(next.view).toBe("board");
  });

  it("resolving a keeper trial grants the settlement path reward", () => {
    const trial = rootReducer(keeperReadyState(), {
      type: "KEEPER/START_TRIAL",
      payload: { zoneId: "home", path: "driveout" },
    });
    const won = rootReducer(trial, { type: "KEEPER/TRIAL_RESOLVE", payload: { won: true } });
    expect(won.activeTrial).toBeNull();
    expect(won.settlements.home.keeperPath).toBe("driveout");
    expect(won.coreIngots).toBeGreaterThanOrEqual(5);
    expect(won.bossesDefeated).toBe(1);
    expect(won.achievements.counters.bosses_defeated).toBe(1);
  });
});
