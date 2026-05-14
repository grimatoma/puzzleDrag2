// Characterization tests for the two largest reducer cases. The intent is
// to pin down current behaviour for branches that the existing per-feature
// suites don't directly assert on, so a future split of CHAIN_COLLECTED /
// CLOSE_SEASON into helper functions can be verified by running these
// unchanged.
//
// Naming: "characterization" rather than "specification" — these tests
// describe what the reducer does today, not what it ought to do. Failures
// during a refactor mean the refactor changed observable state shape.

import { describe, it, expect, beforeEach } from "vitest";
import { rootReducer, createInitialState } from "../state.js";

beforeEach(() => global.localStorage.clear());

const baseState = (overrides = {}) => {
  const fresh = createInitialState();
  // Ensure the tutorial slice doesn't auto-start on the first dispatch — that
  // would clobber `state.modal` and skew CLOSE_SEASON / chain assertions.
  fresh.tutorial = { ...fresh.tutorial, seen: true, active: false };
  return { ...fresh, ...overrides };
};

describe("CHAIN_COLLECTED — noTurn path (tool-driven gains)", () => {
  it("credits resource without advancing turnsUsed", () => {
    const s0 = baseState({ inventory: { grass_hay: 5 }, turnsUsed: 3 });
    const s1 = rootReducer(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "grass_hay", gained: 4, upgrades: 0, value: 1, chainLength: 4, noTurn: true },
    });
    expect(s1.inventory.grass_hay).toBe(9);
    expect(s1.turnsUsed).toBe(3);
  });

  it("does not advance turnsUsed even on long chains", () => {
    const s0 = baseState({ turnsUsed: 5 });
    const s1 = rootReducer(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "grass_hay", gained: 8, upgrades: 1, value: 1, chainLength: 8, noTurn: true },
    });
    // coreReducer's noTurn branch returns before incrementing turnsUsed.
    // Slices may still react to CHAIN_COLLECTED, but turnsUsed is owned by core.
    expect(s1.turnsUsed).toBe(5);
  });

  it("still respects the inventory cap", () => {
    const s0 = baseState({ inventory: { grass_hay: 198 } });
    const s1 = rootReducer(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "grass_hay", gained: 10, upgrades: 0, value: 1, chainLength: 5, noTurn: true },
    });
    expect(s1.inventory.grass_hay).toBe(200);
  });

  it("does not push a stash-full floater on noTurn", () => {
    const s0 = baseState({ inventory: { grass_hay: 198 } });
    const s1 = rootReducer(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "grass_hay", gained: 10, upgrades: 0, value: 1, chainLength: 5, noTurn: true },
    });
    expect(s1.floaters?.some((f) => /stash full/.test(f.text)) ?? false).toBe(false);
  });
});

describe("CHAIN_COLLECTED — boss min-chain rejection", () => {
  it("rejects chains shorter than boss.minChain but still consumes the turn", () => {
    const s0 = baseState({
      boss: { id: "drake", emoji: "🐲", minChain: 5 },
      inventory: { grass_hay: 0 },
      turnsUsed: 2,
    });
    const s1 = rootReducer(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "grass_hay", gained: 3, upgrades: 0, value: 1, chainLength: 3 },
    });
    expect(s1.inventory.grass_hay ?? 0).toBe(0);
    expect(s1.turnsUsed).toBe(3);
  });

  it("opens season modal when boss-rejected chain is the last turn", () => {
    const s0 = baseState({
      boss: { id: "drake", emoji: "🐲", minChain: 5 },
      turnsUsed: 9,
      farmRun: { zoneId: "home", turnBudget: 10, turnsRemaining: 1, startedAt: 1 },
    });
    const s1 = rootReducer(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "grass_hay", gained: 3, upgrades: 0, value: 1, chainLength: 3 },
    });
    expect(s1.modal).toBe("season");
  });
});

describe("CHAIN_COLLECTED — gains-map path", () => {
  it("credits multiple keys in a single dispatch", () => {
    const s0 = baseState({ inventory: { grass_hay: 5, berry: 2 } });
    const s1 = rootReducer(s0, {
      type: "CHAIN_COLLECTED",
      payload: { gains: { grass_hay: 3, berry: 4, wood_log: 1 } },
    });
    expect(s1.inventory.grass_hay).toBe(8);
    expect(s1.inventory.berry).toBe(6);
    expect(s1.inventory.wood_log).toBe(1);
  });

  it("does not advance turnsUsed on gains-map", () => {
    const s0 = baseState({ turnsUsed: 4 });
    const s1 = rootReducer(s0, {
      type: "CHAIN_COLLECTED",
      payload: { gains: { grass_hay: 1 } },
    });
    expect(s1.turnsUsed).toBe(4);
  });
});

// Phase 7 — calendar Spring +20% removed; the cap-clamping behaviour is
// still exercised by the unmultiplied CHAIN_COLLECTED path elsewhere in
// this file.

describe("CHAIN_COLLECTED — lastChainSnapshot capture", () => {
  it("captures pre-chain inventory/grid/turnsUsed for hourglass rewind", () => {
    const preGrid = [[{ key: "grass_hay" }]];
    const s0 = baseState({
      inventory: { grass_hay: 7 },
      grid: preGrid,
      turnsUsed: 4,
    });
    const s1 = rootReducer(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "grass_hay", gained: 3, upgrades: 0, value: 1, chainLength: 3 },
    });
    expect(s1.lastChainSnapshot).toBeDefined();
    expect(s1.lastChainSnapshot.inventory).toBe(s0.inventory);
    expect(s1.lastChainSnapshot.grid).toBe(preGrid);
    expect(s1.lastChainSnapshot.turnsUsed).toBe(4);
  });
});

describe("CHAIN_COLLECTED — seasonStats accumulation", () => {
  it("accumulates harvests and upgrades across multiple chains", () => {
    let s = baseState({ seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0, capFloaters: {} } });
    s = rootReducer(s, { type: "CHAIN_COLLECTED",
      payload: { key: "grass_hay", gained: 4, upgrades: 1, value: 1, chainLength: 6 } });
    s = rootReducer(s, { type: "CHAIN_COLLECTED",
      payload: { key: "grass_hay", gained: 3, upgrades: 0, value: 1, chainLength: 3 } });
    expect(s.seasonStats.harvests).toBeGreaterThanOrEqual(7);
    expect(s.seasonStats.upgrades).toBeGreaterThanOrEqual(1);
  });
});

describe("CLOSE_SEASON — Powder Store grants bombs", () => {
  it("grants 2 bombs at season end when powder_store is built", () => {
    const s0 = baseState({
      built: { powder_store: true },
      tools: { ...createInitialState().tools, bomb: 1 },
    });
    const s1 = rootReducer(s0, { type: "CLOSE_SEASON" });
    expect(s1.tools.bomb).toBe(3);
  });

  it("does not grant bombs without powder_store", () => {
    const s0 = baseState({ tools: { ...createInitialState().tools, bomb: 1 } });
    const s1 = rootReducer(s0, { type: "CLOSE_SEASON" });
    expect(s1.tools.bomb).toBe(1);
  });
});

describe("CLOSE_SEASON — saved-field snapshots", () => {
  it("snapshots the farm board to farm.savedField when Silo is built", () => {
    const grid = [[{ key: "grass_hay" }]];
    const s0 = baseState({
      biomeKey: "farm",
      built: { silo: true },
      grid,
      hazards: { rats: [] },
    });
    const s1 = rootReducer(s0, { type: "CLOSE_SEASON" });
    expect(s1.farm.savedField).toBeDefined();
    expect(s1.farm.savedField.tiles).toBe(grid);
    expect(s1.farm.savedField.turnsUsed).toBe(0);
  });

  it("snapshots the mine board to mine.savedField when Barn is built", () => {
    const grid = [[{ key: "mine_stone" }]];
    const s0 = baseState({
      biomeKey: "mine",
      built: { barn: true },
      grid,
      hazards: { rats: [] },
    });
    const s1 = rootReducer(s0, { type: "CLOSE_SEASON" });
    expect(s1.mine.savedField).toBeDefined();
    expect(s1.mine.savedField.tiles).toBe(grid);
  });

  it("does not snapshot when neither Silo nor Barn is built", () => {
    const s0 = baseState({ biomeKey: "farm", grid: [[{ key: "grass_hay" }]] });
    const s1 = rootReducer(s0, { type: "CLOSE_SEASON" });
    expect(s1.farm.savedField ?? null).toBeNull();
    expect(s1.mine.savedField ?? null).toBeNull();
  });
});

describe("CLOSE_SEASON — bookkeeping resets", () => {
  it("resets turnsUsed and seasonStats", () => {
    const s0 = baseState({
      turnsUsed: 9,
      seasonStats: { harvests: 33, upgrades: 7, ordersFilled: 4, coins: 88, capFloaters: { grass_hay: true } },
    });
    const s1 = rootReducer(s0, { type: "CLOSE_SEASON" });
    expect(s1.turnsUsed).toBe(0);
    expect(s1.seasonStats).toEqual({ harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0, bestChain: 0, capFloaters: {} });
  });

  it("clears fertilizerActive at season end", () => {
    const s0 = baseState({ fertilizerActive: true });
    const s1 = rootReducer(s0, { type: "CLOSE_SEASON" });
    expect(s1.fertilizerActive).toBe(false);
  });

  it("resets tileCollection.freeMoves to 0", () => {
    const s0 = baseState();
    s0.tileCollection = { ...s0.tileCollection, freeMoves: 3 };
    const s1 = rootReducer(s0, { type: "CLOSE_SEASON" });
    expect(s1.tileCollection.freeMoves).toBe(0);
  });

  it("rerolls quests (calendar season was removed; quests still rotate per session)", () => {
    const s0 = baseState();
    const questsBefore = s0.quests;
    const s1 = rootReducer(s0, { type: "CLOSE_SEASON" });
    expect(s1.quests).not.toBe(questsBefore);
  });

  it("forces view back to town and clears modal/pendingView", () => {
    const s0 = baseState({ view: "board", modal: "season", pendingView: "inventory" });
    const s1 = rootReducer(s0, { type: "CLOSE_SEASON" });
    expect(s1.view).toBe("town");
    expect(s1.modal).toBeNull();
    expect(s1.pendingView).toBeNull();
  });
});
