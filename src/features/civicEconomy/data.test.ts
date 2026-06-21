import { describe, it, expect } from "vitest";
import type { GameState } from "../../types/state.js";
import {
  CIVIC_CLAIM_COOLDOWN_MS,
  CIVIC_TAX_BASE_PER_SETTLEMENT,
  CIVIC_TAX_PER_BUILDING,
  civicClaimReady,
  mostProgressedZone,
  msUntilNextClaim,
  nextClaimAt,
  provisionsRoster,
  taxYield,
} from "./data.js";

function mkState(over: Partial<GameState> = {}): GameState {
  return {
    coins: 0,
    tools: {},
    settlements: {},
    built: {},
    civicEconomy: { lastClaimedAt: null, pendingProvisions: {} },
    _boardNonce: 0,
    ...over,
  } as unknown as GameState;
}

describe("civicEconomy/data — taxYield (income everywhere)", () => {
  it("sums base + per-building tax across all founded settlements", () => {
    const state = mkState({
      settlements: { home: { founded: true, tier: 1 }, meadow: { founded: true, tier: 0 } },
      built: { home: { hearth: true, mill: true, _plots: 4 }, meadow: {} },
    });
    // home: 30 + 10*2 = 50 ; meadow: 30 + 0 = 30
    expect(taxYield(state)).toBe(80);
  });

  it("ignores un-founded settlements", () => {
    const state = mkState({
      settlements: { home: { founded: true, tier: 0 }, quarry: { founded: false } },
      built: { home: { hearth: true } },
    });
    expect(taxYield(state)).toBe(CIVIC_TAX_BASE_PER_SETTLEMENT + CIVIC_TAX_PER_BUILDING);
  });

  it("is zero with no founded settlements", () => {
    expect(taxYield(mkState())).toBe(0);
  });
});

describe("civicEconomy/data — provisionsRoster (most-progressed town)", () => {
  it("maps the most-progressed town's provisioning buildings to free tools", () => {
    const state = mkState({
      settlements: { home: { founded: true, tier: 2 } },
      built: { home: { mill: true, workshop: true, bakery: true, _plots: 6 } },
    });
    // mill→clear, workshop→basic ; bakery is not a provisioning building
    expect(provisionsRoster(state)).toEqual({ clear: 1, basic: 1 });
  });

  it("is empty when the strongest town has no provisioning buildings", () => {
    const state = mkState({
      settlements: { home: { founded: true, tier: 0 } },
      built: { home: { hearth: true } },
    });
    expect(provisionsRoster(state)).toEqual({});
  });
});

describe("civicEconomy/data — mostProgressedZone", () => {
  it("picks the highest tier, tie-broken by building count", () => {
    const state = mkState({
      settlements: { home: { founded: true, tier: 1 }, meadow: { founded: true, tier: 0 } },
      built: { home: { hearth: true }, meadow: { hearth: true, mill: true } },
    });
    expect(mostProgressedZone(state)).toBe("home"); // higher tier wins over count
  });

  it("breaks tier ties by building count", () => {
    const state = mkState({
      settlements: { home: { founded: true, tier: 0 }, meadow: { founded: true, tier: 0 } },
      built: { home: { hearth: true }, meadow: { hearth: true, mill: true } },
    });
    expect(mostProgressedZone(state)).toBe("meadow");
  });
});

describe("civicEconomy/data — cooldown gate", () => {
  it("is ready when never claimed", () => {
    expect(civicClaimReady(mkState(), 1_000)).toBe(true);
    expect(nextClaimAt(mkState())).toBeNull();
    expect(msUntilNextClaim(mkState(), 1_000)).toBe(0);
  });

  it("is not ready until the cooldown elapses", () => {
    const now = 10_000_000;
    const state = mkState({ civicEconomy: { lastClaimedAt: now, pendingProvisions: {} } });
    expect(civicClaimReady(state, now + CIVIC_CLAIM_COOLDOWN_MS - 1)).toBe(false);
    expect(msUntilNextClaim(state, now + CIVIC_CLAIM_COOLDOWN_MS - 1)).toBe(1);
    expect(civicClaimReady(state, now + CIVIC_CLAIM_COOLDOWN_MS)).toBe(true);
    expect(msUntilNextClaim(state, now + CIVIC_CLAIM_COOLDOWN_MS)).toBe(0);
  });
});
