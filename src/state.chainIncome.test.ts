/**
 * Reducer income test: verifies that hiring grain workers increases flour yield
 * from a CHAIN_COLLECTED action.
 *
 * grain category: lineBase = 5, lineFloor = 1, lineStep = 1.
 * With 10 farmers (all hired): thresholdReduce["tile_grain_wheat"] = 10
 * → effective divisor = max(1, 5 - 10) = 1.
 * Raw divisor = 5.
 *
 * Chain of 6 tiles, resourceKey "flour":
 *   - No workers:   6 / 5 = 1 flour (remainder 1 in progress)
 *   - 10 farmers:   6 / 1 = 6 flour (remainder 0 in progress)
 *
 * Therefore strict > assertion is achievable.
 */
import { describe, it, expect } from "vitest";
import { gameReducer } from "./state.js";
import { mergeTestState } from "./testUtils/testState.js";
import { inv, zoneProgress } from "./testUtils/inventory.js";

const CHAIN_LENGTH = 6;

function dispatchGrainChain(state: ReturnType<typeof mergeTestState>) {
  return gameReducer(state, {
    type: "CHAIN_COLLECTED",
    payload: {
      key: "tile_grain_wheat",
      gained: CHAIN_LENGTH,
      upgrades: 0,
      value: 2,
      chainLength: CHAIN_LENGTH,
      resourceKey: "flour",
    },
  } as never);
}

describe("CHAIN_COLLECTED: worker reductions increase resource income", () => {
  it("with no workers, wheat income uses raw divisor (baseline check)", () => {
    const state = mergeTestState({
      workers: { hired: { farmer: 0, lumberjack: 0, miner: 0, baker: 0 } },
    });
    const next = dispatchGrainChain(state);
    // raw divisor = 5; chain 6 → floor(6/5) = 1 flour, remainder 1
    expect(inv(next).flour ?? 0).toBe(1);
    expect(zoneProgress(next).flour ?? 0).toBe(1);
  });

  it("with 10 farmers, wheat income uses reduced divisor → more flour", () => {
    const state = mergeTestState({
      workers: { hired: { farmer: 10, lumberjack: 0, miner: 0, baker: 0 } },
    });
    const next = dispatchGrainChain(state);
    // effective divisor = max(1, 5 - 10) = 1; chain 6 → 6 flour
    expect(inv(next).flour ?? 0).toBe(6);
  });

  it("worker income strictly greater than raw-divisor income for the same chain", () => {
    const stateNoWorkers = mergeTestState({
      workers: { hired: { farmer: 0, lumberjack: 0, miner: 0, baker: 0 } },
    });
    const stateFarmers = mergeTestState({
      workers: { hired: { farmer: 10, lumberjack: 0, miner: 0, baker: 0 } },
    });
    const flourNoWorkers = inv(dispatchGrainChain(stateNoWorkers)).flour ?? 0;
    const flourFarmers = inv(dispatchGrainChain(stateFarmers)).flour ?? 0;
    // Strict > because chain=6 yields 1 unit at raw divisor 5, but 6 units at reduced divisor 1
    expect(flourFarmers).toBeGreaterThan(flourNoWorkers);
  });
});

// ---------------------------------------------------------------------------
// Promotion-chain mechanic (Unit 5 / PC2)
// ---------------------------------------------------------------------------
// Steward: grain -> vegetables (soup). baseThreshold=20, minThreshold=10.
// With 10 Stewards hired (weight=1): eff threshold = 20 - (20-10)*1 = 10.
// A grain chain of length 18 >= 10 → promotes; awards ≥1 soup.
// With 0 Stewards hired: no promotion → 0 soup banked.
// ---------------------------------------------------------------------------

const PROMO_CHAIN_LENGTH = 18;

function dispatchLongGrainChain(state: ReturnType<typeof mergeTestState>) {
  return gameReducer(state, {
    type: "CHAIN_COLLECTED",
    payload: {
      key: "tile_grain_wheat",
      gained: PROMO_CHAIN_LENGTH,
      upgrades: 0,
      value: 2,
      chainLength: PROMO_CHAIN_LENGTH,
      resourceKey: "flour",
    },
  } as never);
}

describe("CHAIN_COLLECTED: promotion-chain mechanic (PC2)", () => {
  it("with NO promotion workers, a long grain chain banks 0 soup", () => {
    const state = mergeTestState({
      workers: { hired: { farmer: 0, steward: 0 } },
    });
    const next = dispatchLongGrainChain(state);
    // No Steward hired → no chainRedirect entry → 0 soup
    expect(inv(next).soup ?? 0).toBe(0);
  });

  it("with 10 Stewards, a grain chain of 18 banks exactly 1 soup (promotion fired)", () => {
    // 10 Stewards: eff threshold = 10. Chain 18 >= 10 → promotes.
    // units = max(1, floor(1.0 * 18/10)) = max(1, 1) = 1 soup
    const state = mergeTestState({
      workers: { hired: { steward: 10 } },
    });
    const next = dispatchLongGrainChain(state);
    expect(inv(next).soup ?? 0).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Perfumer promotion: fruits → flowers → honey (Bug-1 regression guard)
// ---------------------------------------------------------------------------
// Perfumer: fruits → flowers. baseThreshold=22, minThreshold=11.
// With 10 Perfumers hired (weight=1): eff threshold = 22 - (22-11)*1 = 11.
// A tile_fruit_apple chain of length 18 >= 11 → promotes; awards honey (NOT eggs).
// ---------------------------------------------------------------------------

const PERFUMER_CHAIN_LENGTH = 18;

function dispatchAppleChain(state: ReturnType<typeof mergeTestState>) {
  return gameReducer(state, {
    type: "CHAIN_COLLECTED",
    payload: {
      key: "tile_fruit_apple",
      gained: PERFUMER_CHAIN_LENGTH,
      upgrades: 0,
      value: 2,
      chainLength: PERFUMER_CHAIN_LENGTH,
      resourceKey: "pie",
    },
  } as never);
}

describe("CHAIN_COLLECTED: Perfumer promotion awards honey not eggs (Bug-1 guard)", () => {
  it("with 10 Perfumers, a fruit chain of 18 banks honey > 0 (NOT eggs)", () => {
    // 10 Perfumers: eff threshold = 11. Chain 18 >= 11 → promotes → honey.
    const state = mergeTestState({
      workers: { hired: { perfumer: 10 } },
    });
    const next = dispatchAppleChain(state);
    expect(inv(next).honey ?? 0).toBeGreaterThan(0);
    // The chain produces pie; promotion produces honey; neither is eggs
    expect(inv(next).eggs ?? 0).toBe(0);
  });
});
