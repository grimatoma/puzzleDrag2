import { describe, it, expect } from "vitest";
import type { Action, GameState } from "../../types/state.js";
import { reduce } from "./slice.js";
import { CIVIC_CLAIM_COOLDOWN_MS } from "./data.js";

function mkState(over: Partial<GameState> = {}): GameState {
  return {
    coins: 100,
    tools: {},
    settlements: { home: { founded: true, tier: 2 } },
    built: { home: { mill: true, workshop: true, _plots: 4 } },
    civicEconomy: { lastClaimedAt: null, pendingProvisions: {} },
    _boardNonce: 0,
    ...over,
  } as unknown as GameState;
}

describe("civicEconomy/slice — CIVIC/CLAIM", () => {
  const claim = (now: number): Action => ({ type: "CIVIC/CLAIM", payload: { now } }) as Action;

  it("pays coin tax, queues provisions, and bumps the board nonce when ready", () => {
    const state = mkState();
    const next = reduce(state, claim(5_000));
    // home: 30 + 10*2 = 50 tax on top of 100 starting coins
    expect(next.coins).toBe(150);
    // mill→clear, workshop→basic queued as pending provisions (not yet in tools)
    expect(next.civicEconomy.pendingProvisions).toEqual({ clear: 1, basic: 1 });
    expect(next.tools).toEqual({});
    expect(next.civicEconomy.lastClaimedAt).toBe(5_000);
    expect((next._boardNonce ?? 0)).toBe(1); // crate seeds onto a fresh board
  });

  it("is a no-op (same reference) before the cooldown elapses", () => {
    const now = 1_000_000;
    const state = mkState({ civicEconomy: { lastClaimedAt: now, pendingProvisions: {} } });
    const next = reduce(state, claim(now + CIVIC_CLAIM_COOLDOWN_MS - 1));
    expect(next).toBe(state);
  });

  it("does not bump the board nonce when there are no provisions to deliver", () => {
    const state = mkState({
      settlements: { home: { founded: true, tier: 0 } },
      built: { home: { hearth: true } }, // hearth is not a provisioning building
    });
    const next = reduce(state, claim(5_000));
    expect(next.coins).toBe(140); // 30 + 10*1 tax
    expect(next.civicEconomy.pendingProvisions).toEqual({});
    expect((next._boardNonce ?? 0)).toBe(0);
  });

  it("accumulates provisions across repeated claims", () => {
    const first = reduce(mkState(), claim(0));
    const second = reduce(first, claim(CIVIC_CLAIM_COOLDOWN_MS));
    expect(second.civicEconomy.pendingProvisions).toEqual({ clear: 2, basic: 2 });
  });
});

describe("civicEconomy/slice — CIVIC/OPEN_CARE_PACKAGE", () => {
  const open: Action = { type: "CIVIC/OPEN_CARE_PACKAGE" } as Action;

  it("deposits queued provisions into the tool bag and clears the queue", () => {
    const state = mkState({
      tools: { clear: 1 },
      civicEconomy: { lastClaimedAt: 0, pendingProvisions: { clear: 2, basic: 1 } },
    });
    const next = reduce(state, open);
    expect(next.tools).toEqual({ clear: 3, basic: 1 });
    expect(next.civicEconomy.pendingProvisions).toEqual({});
  });

  it("is a no-op (same reference) when nothing is queued", () => {
    const state = mkState({ civicEconomy: { lastClaimedAt: 0, pendingProvisions: {} } });
    expect(reduce(state, open)).toBe(state);
  });
});
