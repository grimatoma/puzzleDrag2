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
  it("founds a zone, deducts the cost, and bumps the next cost", () => {
    let s = { ...createInitialState(), coins: 5000 };
    const cost = settlementFoundingCost(s).coins;
    s = rootReducer(s, { type: "FOUND_SETTLEMENT", payload: { zoneId: "meadow" } });
    expect(s.settlements.meadow).toMatchObject({ founded: true }); // Phase 5e adds a `biome`
    expect(isSettlementFounded(s, "meadow")).toBe(true);
    expect(s.coins).toBe(5000 - cost);
    expect(foundedSettlementCount(s)).toBe(2);
    expect(settlementFoundingCost(s).coins).toBeGreaterThan(cost);
  });

  it("rejects an unknown zone", () => {
    const s = { ...createInitialState(), coins: 9999 };
    expect(rootReducer(s, { type: "FOUND_SETTLEMENT", payload: { zoneId: "nowhere" } })).toBe(s);
  });

  it("rejects an already-founded zone (incl. home)", () => {
    const s = { ...createInitialState(), coins: 9999 };
    expect(rootReducer(s, { type: "FOUND_SETTLEMENT", payload: { zoneId: "home" } })).toBe(s);
    const s2 = rootReducer(s, { type: "FOUND_SETTLEMENT", payload: { zoneId: "meadow" } });
    expect(rootReducer(s2, { type: "FOUND_SETTLEMENT", payload: { zoneId: "meadow" } })).toBe(s2);
  });

  it("rejects when the player can't afford the cost", () => {
    const s = { ...createInitialState(), coins: 10 };
    expect(rootReducer(s, { type: "FOUND_SETTLEMENT", payload: { zoneId: "meadow" } })).toBe(s);
  });
});

describe("settlementCompleted", () => {
  it("is false for home when only the hearth is built", () => {
    expect(settlementCompleted(createInitialState(), "home")).toBe(false);
  });
  it("is true once at least half of a zone's buildings are built", () => {
    // home has 16 buildings → need ≥ 8.
    const built = {};
    for (const b of ["hearth", "mill", "bakery", "inn", "granary", "larder", "forge", "caravan_post"]) built[b] = true;
    const s = { ...createInitialState(), built: { ...createInitialState().built, home: built } };
    expect(settlementCompleted(s, "home")).toBe(true);
  });
  it("is false for an unknown zone", () => {
    expect(settlementCompleted(createInitialState(), "nowhere")).toBe(false);
  });
  it("completedSettlementCount only counts founded + completed zones", () => {
    const built = {};
    for (const b of ["hearth", "mill", "bakery", "inn", "granary", "larder", "forge", "caravan_post"]) built[b] = true;
    const s = { ...createInitialState(), built: { ...createInitialState().built, home: built } };
    expect(completedSettlementCount(s)).toBe(1); // home, founded + completed
    // meadow founded but not completed → still 1
    const s2 = rootReducer({ ...s, coins: 9999 }, { type: "FOUND_SETTLEMENT", payload: { zoneId: "meadow" } });
    expect(completedSettlementCount(s2)).toBe(1);
  });
});
