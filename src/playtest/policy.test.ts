// Tests for the state-aware board policies (M2a).
//
// The interface widened from (chains) to (PolicyContext); these pin the selection
// logic of each policy and prove the new STATE-aware policy (needAwareClimb)
// actually steers chain choice toward the next tier rung's shortfalls — the
// strategic intent the naive greedy floor lacks.

import { describe, it, expect } from "vitest";
import { createInitialState } from "../state.js";
import { FARM_TILE_POOL } from "../constants.js";
import { producedResource } from "../game/producedResource.js";
import { currentTierDef, maxTier } from "../features/zones/data.js";
import type { GameState } from "../types/state.js";
import { greedyLongest, greedyValue, needAwareClimb, searchPolicy, type PolicyContext } from "./policy.js";
import { simulateRun } from "./run.js";
import { makeBoard, enumerateChains, type Chain } from "./board.js";
import { mulberry32 } from "./prng.js";

function chain(key: string, length: number, tileValue = 1): Chain {
  const cells = Array.from({ length }, (_, i) => ({ row: 0, col: i }));
  return { key, cells, length, tileValue };
}

function mkCtx(chains: Chain[], state: GameState, zoneId = "home"): PolicyContext {
  return { chains, state, zoneId, grid: [], rng: () => 0, turnsRemaining: 5 };
}

describe("greedyLongest (floor)", () => {
  it("picks the longest chain, ties broken by tile value", () => {
    const s = createInitialState();
    expect(greedyLongest(mkCtx([chain("a", 3), chain("b", 5), chain("c", 4)], s))?.key).toBe("b");
    expect(greedyLongest(mkCtx([chain("a", 4, 2), chain("b", 4, 9)], s))?.key).toBe("b");
  });
});

describe("greedyValue", () => {
  it("maximises length × tile value (a coin-chaser)", () => {
    const s = createInitialState();
    // a: 5×1=5, b: 3×3=9 → b wins despite being shorter.
    expect(greedyValue(mkCtx([chain("a", 5, 1), chain("b", 3, 3)], s))?.key).toBe("b");
  });
});

describe("needAwareClimb (ceiling building block)", () => {
  // Find a farm tile that produces a resource the home Hamlet rung still needs.
  const needs = (currentTierDef("home", 1)?.upgradeCost?.resources ?? {}) as Record<string, number>;
  const needKeys = new Set(Object.keys(needs));
  const tNeed = FARM_TILE_POOL.find((k) => {
    const r = producedResource({ key: k });
    return r != null && needKeys.has(r);
  });
  const tOther = FARM_TILE_POOL.find((k) => {
    const r = producedResource({ key: k });
    return r != null && !needKeys.has(r);
  });

  it("the home Hamlet rung needs a farm-produced resource (fixture sanity)", () => {
    // If this ever fails the rung was re-costed; the steering test below adapts.
    expect(tNeed).toBeDefined();
    expect(tOther).toBeDefined();
  });

  it("prefers a SHORT chain that yields a needed resource over a LONGER unhelpful one", () => {
    if (!tNeed || !tOther) return; // guarded by the sanity test above
    const s = createInitialState(); // fresh → inventory below every rung need
    const chains = [chain(tNeed, 3), chain(tOther, 5)];
    // Greedy grabs the longer unhelpful chain; the climb steers to the needed one.
    expect(greedyLongest(mkCtx(chains, s))?.key).toBe(tOther);
    expect(needAwareClimb(mkCtx(chains, s))?.key).toBe(tNeed);
  });

  it("falls back to greedy when there is no next rung to climb toward", () => {
    const s = createInitialState();
    s.settlements = { ...s.settlements, home: { founded: true, tier: maxTier("home") } };
    const chains = [chain("x", 3), chain("y", 6)];
    expect(needAwareClimb(mkCtx(chains, s))?.key).toBe("y"); // == greedyLongest
  });
});

describe("searchPolicy (board-level lookahead)", () => {
  function boardCtx(seed: number): PolicyContext {
    const grid = makeBoard(["tile_grass_grass", "tile_grain_wheat", "tile_bird_turkey", "tile_veg_carrot"], mulberry32(seed), 6, 6);
    return { chains: [], state: createInitialState(), zoneId: "home", grid, rng: () => 0, turnsRemaining: 5 } as PolicyContext;
  }
  it("returns a chain from the available set and is deterministic", () => {
    const ctx = boardCtx(7);
    ctx.chains = enumerateChains(ctx.grid);
    if (!ctx.chains.length) return; // unlucky board with no chain — nothing to assert
    const pick = searchPolicy(ctx);
    expect(ctx.chains).toContain(pick);
    expect(searchPolicy(ctx)).toBe(pick); // pure → same pick every call
  });

  it("simulateRun is deterministic and entered under each named policy", () => {
    for (const policy of [greedyValue, needAwareClimb, searchPolicy]) {
      const a = simulateRun({ zoneId: "home", seed: 3, policy });
      const b = simulateRun({ zoneId: "home", seed: 3, policy });
      expect(a).toEqual(b);
      expect(a.entered).toBe(true);
    }
  });
});
