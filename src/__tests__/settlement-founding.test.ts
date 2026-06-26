// Phase 4a + Phase 2 — settlement founding: state.settlements + FOUND_SETTLEMENT +
// the founding-cost / founded / completed helpers. Founding now costs a scaling
// **resource basket** paid from the capital's stores (home), not coins.
import { describe, it, expect, beforeEach } from "vitest";
import { inv, patchInventory } from "../testUtils/inventory.js";
import { rootReducer, createInitialState } from "../state.js";
import {
  isSettlementFounded,
  settlementFoundingCost,
  canAffordFounding,
  foundedSettlementCount,
  settlementCompleted,
  completedSettlementCount,
  SETTLEMENT_FOUNDING_BASKET,
  SETTLEMENT_FOUNDING_GROWTH,
} from "../features/zones/data.js";

beforeEach(() => global.localStorage.clear());

// Generous home stores so the basket is always affordable in the success cases.
const stockHome = (s) => patchInventory(s, { plank: 99, bread: 99, hay_bundle: 99 }, "home");

describe("fresh state — settlements", () => {
  it("home is founded for free; other zones are not", () => {
    const s = createInitialState();
    expect(s.settlements).toEqual({ home: { founded: true, tier: 0 } });
    expect(isSettlementFounded(s, "home")).toBe(true);
    expect(isSettlementFounded(s, "orchard")).toBe(false);
    expect(foundedSettlementCount(s)).toBe(1);
  });
});

describe("settlementFoundingCost — escalating resource basket", () => {
  it("the 2nd settlement costs the base basket", () => {
    expect(settlementFoundingCost(createInitialState())).toEqual({ resources: { ...SETTLEMENT_FOUNDING_BASKET } });
  });
  it("each further founding scales every basket amount by the growth factor", () => {
    const twoFounded = { ...createInitialState(), settlements: { home: { founded: true }, meadow: { founded: true } } };
    const c2 = settlementFoundingCost(twoFounded).resources;
    for (const [k, base] of Object.entries(SETTLEMENT_FOUNDING_BASKET)) {
      expect(c2[k]).toBe(Math.round(base * SETTLEMENT_FOUNDING_GROWTH));
    }
    const threeFounded = { ...twoFounded, settlements: { ...twoFounded.settlements, orchard: { founded: true } } };
    const c3 = settlementFoundingCost(threeFounded).resources;
    for (const [k, base] of Object.entries(SETTLEMENT_FOUNDING_BASKET)) {
      expect(c3[k]).toBe(Math.round(base * SETTLEMENT_FOUNDING_GROWTH * SETTLEMENT_FOUNDING_GROWTH));
    }
  });
});

describe("FOUND_SETTLEMENT", () => {
  // Phase 6a — founding the *next* settlement requires the previous one (home,
  // for the second founding) to already be complete. Build out home + face its
  // keeper, and stock home with the founding basket (paid from home's stores).
  const homeCompleted = (over = {}) => {
    const base = createInitialState();
    const built = { decorations: {}, _plots: {} };
    for (const b of ["hearth", "mill", "bakery", "inn", "granary", "larder", "forge", "caravan_post"]) built[b] = true;
    return stockHome({
      ...base,
      built: { ...base.built, home: built },
      settlements: { home: { founded: true, biome: "temperate_vale", keeperPath: "coexist" } },
      ...over,
    });
  };

  it("founds a zone, deducts the basket from home, and bumps the next cost", () => {
    let s = homeCompleted();
    const cost = settlementFoundingCost(s).resources;
    const before = { ...inv(s, "home") };
    s = rootReducer(s, { type: "FOUND_SETTLEMENT", payload: { zoneId: "orchard" } });
    expect(s.settlements.orchard).toMatchObject({ founded: true }); // Phase 5e adds a `biome`
    expect(isSettlementFounded(s, "orchard")).toBe(true);
    // Basket deducted from home stores (the capital bankrolls expansion).
    expect(inv(s, "home").plank).toBe(before.plank - cost.plank);
    expect(inv(s, "home").bread).toBe(before.bread - cost.bread);
    expect(inv(s, "home").hay_bundle).toBe(before.hay_bundle - cost.hay_bundle);
    expect(foundedSettlementCount(s)).toBe(2);
    expect(settlementFoundingCost(s).resources.plank).toBeGreaterThan(cost.plank);
  });

  it("rejects an unknown zone", () => {
    const s = homeCompleted();
    expect(rootReducer(s, { type: "FOUND_SETTLEMENT", payload: { zoneId: "nowhere" } })).toBe(s);
  });

  it("rejects an already-founded zone (incl. home)", () => {
    const s = homeCompleted();
    expect(rootReducer(s, { type: "FOUND_SETTLEMENT", payload: { zoneId: "home" } })).toBe(s);
    const s2 = rootReducer(s, { type: "FOUND_SETTLEMENT", payload: { zoneId: "orchard" } });
    expect(rootReducer(s2, { type: "FOUND_SETTLEMENT", payload: { zoneId: "orchard" } })).toBe(s2);
  });

  it("rejects when home can't cover the basket", () => {
    // Strip home's stores so the basket is unaffordable.
    const poor = (() => { const s = homeCompleted(); return { ...s, inventory: { ...s.inventory, home: {} } }; })();
    expect(canAffordFounding(poor)).toBe(false);
    expect(rootReducer(poor, { type: "FOUND_SETTLEMENT", payload: { zoneId: "orchard" } })).toBe(poor);
  });

  it("rejects founding settlement #2 when no prior settlement is complete", () => {
    // Fresh state — home is auto-founded but not built up or keeper-faced.
    const s = stockHome({ ...createInitialState() });
    const result = rootReducer(s, { type: "FOUND_SETTLEMENT", payload: { zoneId: "orchard" } });
    expect(result.settlements?.orchard).toBeUndefined();
    expect(result.bubble?.text).toMatch(/Complete your first settlement/i);
  });

  // Zone Tier Ladder — the quarry (Town 2) requires home at its City rung.
  it("rejects founding the quarry until home reaches City", () => {
    // home completed (passes the prior-complete gate) but still at tier 0.
    const s = homeCompleted({ settlements: { home: { founded: true, biome: "temperate_vale", keeperPath: "coexist", tier: 0 } } });
    const blocked = rootReducer(s, { type: "FOUND_SETTLEMENT", payload: { zoneId: "quarry" } });
    expect(blocked.settlements?.quarry).toBeUndefined();
    expect(blocked.bubble?.text).toMatch(/City before founding/i);
  });

  it("allows founding the quarry once home is at City", () => {
    const s = homeCompleted({ settlements: { home: { founded: true, biome: "temperate_vale", keeperPath: "coexist", tier: 4 } } });
    const ok = rootReducer(s, { type: "FOUND_SETTLEMENT", payload: { zoneId: "quarry" } });
    expect(ok.settlements?.quarry).toMatchObject({ founded: true, tier: 0 });
  });
});

describe("Founding enforcement — gameplay actions refuse at unfounded zones", () => {
  it("BUILD at an unfounded zone is a no-op (returns a 'Found first' bubble)", () => {
    const s = { ...createInitialState(), coins: 9999, mapCurrent: "orchard", activeZone: "orchard" };
    const result = rootReducer(s, { type: "BUILD", building: { id: "hearth", name: "Hearth", cost: { coins: 0 } } });
    expect(result.built.orchard).toBeUndefined();
    expect(result.bubble?.text).toMatch(/Found .* before you build/i);
  });

  it("FARM/ENTER at an unfounded zone refuses to start the session", () => {
    const s = { ...createInitialState(), coins: 9999, mapCurrent: "orchard", activeZone: "orchard" };
    const result = rootReducer(s, { type: "FARM/ENTER", payload: { selectedTiles: [], useFertilizer: false } });
    expect(result.view).not.toBe("board");
    expect(result.coins).toBe(9999); // not deducted
    expect(result.bubble?.text).toMatch(/Found .* before you farm/i);
  });

  it("EXPEDITION/DEPART at an unfounded zone refuses", () => {
    const base = {
      ...createInitialState(),
      level: 5,
      mapCurrent: "quarry",
      activeZone: "quarry",
      story: { ...createInitialState().story, flags: { ...createInitialState().story.flags, mine_unlocked: true } },
    };
    const s = { ...base, ...patchInventory(base, { bread: 6 }, "quarry") };
    const result = rootReducer(s, { type: "EXPEDITION/DEPART", payload: { biomeKey: "mine", supply: { bread: 4 } } });
    expect(result.view).not.toBe("board");
    expect(inv(result).bread).toBe(6); // not consumed
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
    // founding another zone doesn't complete it → still 1
    const s2 = rootReducer(stockHome(s), { type: "FOUND_SETTLEMENT", payload: { zoneId: "orchard" } });
    expect(s2.settlements.orchard).toMatchObject({ founded: true });
    expect(completedSettlementCount(s2)).toBe(1);
  });
});
