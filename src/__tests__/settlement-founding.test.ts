// Phase 4a — settlement founding: state.settlements + FOUND_SETTLEMENT +
// the founding-cost / founded / completed helpers.
import { describe, it, expect, beforeEach } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import {
  isSettlementFounded,
  settlementFoundingCost,
  foundedSettlementCount,
  settlementCompleted,
  completedSettlementCount,
  SETTLEMENT_FOUNDING_BASE_COINS,
  SETTLEMENT_FOUNDING_GROWTH,
} from "../features/zones/data.js";

beforeEach(() => global.localStorage.clear());

describe("fresh state — settlements", () => {
  it("home is founded for free; other zones are not", () => {
    const s = createInitialState();
    expect(s.settlements).toEqual({ home: { founded: true } });
    expect(isSettlementFounded(s, "home")).toBe(true);
    expect(isSettlementFounded(s, "meadow")).toBe(false);
    expect(foundedSettlementCount(s)).toBe(1);
  });
});

describe("settlementFoundingCost — escalating", () => {
  it("the 2nd settlement costs the base price", () => {
    expect(settlementFoundingCost(createInitialState())).toEqual({ coins: SETTLEMENT_FOUNDING_BASE_COINS });
  });
  it("each further founding multiplies by the growth factor", () => {
    const twoFounded = { ...createInitialState(), settlements: { home: { founded: true }, meadow: { founded: true } } };
    expect(settlementFoundingCost(twoFounded)).toEqual({
      coins: Math.round(SETTLEMENT_FOUNDING_BASE_COINS * SETTLEMENT_FOUNDING_GROWTH),
    });
    const threeFounded = { ...twoFounded, settlements: { ...twoFounded.settlements, orchard: { founded: true } } };
    expect(settlementFoundingCost(threeFounded).coins).toBe(
      Math.round(SETTLEMENT_FOUNDING_BASE_COINS * SETTLEMENT_FOUNDING_GROWTH * SETTLEMENT_FOUNDING_GROWTH),
    );
  });
});

describe("FOUND_SETTLEMENT", () => {
  // Phase 6a — founding the *next* settlement requires the previous one (home,
  // for the second founding) to already be complete. Build out home + face its
  // keeper before testing the founding flow itself.
  const homeCompleted = (over = {}) => {
    const built = { decorations: {}, _plots: {} };
    for (const b of ["hearth", "mill", "bakery", "inn", "granary", "larder", "forge", "caravan_post"]) built[b] = true;
    return {
      ...createInitialState(),
      built: { ...createInitialState().built, home: built },
      settlements: { home: { founded: true, biome: "temperate_vale", keeperPath: "coexist" } },
      ...over,
    };
  };

  it("founds a zone, deducts the cost, and bumps the next cost", () => {
    let s = homeCompleted({ coins: 5000 });
    const cost = settlementFoundingCost(s).coins;
    s = rootReducer(s, { type: "FOUND_SETTLEMENT", payload: { zoneId: "meadow" } });
    expect(s.settlements.meadow).toMatchObject({ founded: true }); // Phase 5e adds a `biome`
    expect(isSettlementFounded(s, "meadow")).toBe(true);
    expect(s.coins).toBe(5000 - cost);
    expect(foundedSettlementCount(s)).toBe(2);
    expect(settlementFoundingCost(s).coins).toBeGreaterThan(cost);
  });

  it("rejects an unknown zone", () => {
    const s = homeCompleted({ coins: 9999 });
    expect(rootReducer(s, { type: "FOUND_SETTLEMENT", payload: { zoneId: "nowhere" } })).toBe(s);
  });

  it("rejects an already-founded zone (incl. home)", () => {
    const s = homeCompleted({ coins: 9999 });
    expect(rootReducer(s, { type: "FOUND_SETTLEMENT", payload: { zoneId: "home" } })).toBe(s);
    const s2 = rootReducer(s, { type: "FOUND_SETTLEMENT", payload: { zoneId: "meadow" } });
    expect(rootReducer(s2, { type: "FOUND_SETTLEMENT", payload: { zoneId: "meadow" } })).toBe(s2);
  });

  it("rejects when the player can't afford the cost", () => {
    const s = homeCompleted({ coins: 10 });
    expect(rootReducer(s, { type: "FOUND_SETTLEMENT", payload: { zoneId: "meadow" } })).toBe(s);
  });

  it("rejects founding settlement #2 when no prior settlement is complete", () => {
    // Fresh state — home is auto-founded but not built up or keeper-faced.
    const s = { ...createInitialState(), coins: 9999 };
    const result = rootReducer(s, { type: "FOUND_SETTLEMENT", payload: { zoneId: "meadow" } });
    expect(result.settlements?.meadow).toBeUndefined();
    expect(result.coins).toBe(s.coins); // not deducted
    expect(result.bubble?.text).toMatch(/Complete your first settlement/i);
  });
});

describe("Founding enforcement — gameplay actions refuse at unfounded zones", () => {
  it("BUILD at an unfounded zone is a no-op (returns a 'Found first' bubble)", () => {
    const s = { ...createInitialState(), coins: 9999, mapCurrent: "meadow", activeZone: "meadow" };
    const result = rootReducer(s, { type: "BUILD", building: { id: "hearth", name: "Hearth", cost: { coins: 0 } } });
    expect(result.built.meadow).toBeUndefined();
    expect(result.bubble?.text).toMatch(/Found .* before you build/i);
  });

  it("FARM/ENTER at an unfounded zone refuses to start the session", () => {
    const s = { ...createInitialState(), coins: 9999, mapCurrent: "meadow", activeZone: "meadow" };
    const result = rootReducer(s, { type: "FARM/ENTER", payload: { selectedTiles: [], useFertilizer: false } });
    expect(result.view).not.toBe("board");
    expect(result.coins).toBe(9999); // not deducted
    expect(result.bubble?.text).toMatch(/Found .* before you farm/i);
  });

  it("EXPEDITION/DEPART at an unfounded zone refuses", () => {
    const s = {
      ...createInitialState(),
      level: 5,
      mapCurrent: "quarry",
      activeZone: "quarry",
      inventory: { ...createInitialState().inventory, bread: 6 },
      story: { ...createInitialState().story, flags: { ...createInitialState().story.flags, mine_unlocked: true } },
    };
    const result = rootReducer(s, { type: "EXPEDITION/DEPART", payload: { biomeKey: "mine", supply: { bread: 4 } } });
    expect(result.view).not.toBe("board");
    expect(result.inventory.bread).toBe(6); // not consumed
    expect(result.bubble?.text).toMatch(/Found .* before you depart/i);
  });

  it("BUILD at home (auto-founded) still works", () => {
    const s = { ...createInitialState(), coins: 9999 };
    const result = rootReducer(s, { type: "BUILD", building: { id: "bakery", name: "Bakery", cost: { coins: 50 } } });
    expect(result.built.home?.bakery).toBe(true);
  });
});

describe("settlementCompleted", () => {
  // Helper: build state with `home` half-built and (optionally) a keeper choice made.
  const homeHalfBuilt = (extra = {}) => {
    const built = { decorations: {}, _plots: {} };
    for (const b of ["hearth", "mill", "bakery", "inn", "granary", "larder", "forge", "caravan_post"]) built[b] = true;
    return {
      ...createInitialState(),
      built: { ...createInitialState().built, home: built },
      ...extra,
    };
  };

  it("is false for home when only the hearth is built", () => {
    expect(settlementCompleted(createInitialState(), "home")).toBe(false);
  });
  it("is false when ≥ half buildings are up but the keeper has not been faced", () => {
    // home has 16 buildings → 8 is half, but no keeper choice yet → still incomplete.
    expect(settlementCompleted(homeHalfBuilt(), "home")).toBe(false);
  });
  it("flips to true once half buildings are up AND the keeper has been faced", () => {
    const s = homeHalfBuilt({
      settlements: { home: { founded: true, biome: "temperate_vale", keeperPath: "coexist" } },
    });
    expect(settlementCompleted(s, "home")).toBe(true);
  });
  it("Drive Out also counts as a keeper choice", () => {
    const s = homeHalfBuilt({
      settlements: { home: { founded: true, biome: "temperate_vale", keeperPath: "driveout" } },
    });
    expect(settlementCompleted(s, "home")).toBe(true);
  });
  it("is false for an unknown zone", () => {
    expect(settlementCompleted(createInitialState(), "nowhere")).toBe(false);
  });
  it("completedSettlementCount only counts founded + completed zones", () => {
    const s = homeHalfBuilt({
      settlements: { home: { founded: true, biome: "temperate_vale", keeperPath: "coexist" } },
    });
    expect(completedSettlementCount(s)).toBe(1); // home, founded + half-built + keeper faced
    // meadow founded but not completed → still 1
    const s2 = rootReducer({ ...s, coins: 9999 }, { type: "FOUND_SETTLEMENT", payload: { zoneId: "meadow" } });
    expect(completedSettlementCount(s2)).toBe(1);
  });
});
