// Coverage fillins for src/features/portal/slice.js (80% pre-PR).
// Branches missing across SUMMON_MAGIC_TOOL guards, every magic tool's
// USE_TOOL path (consumed/refunded/missing-snapshot), CHAIN_COLLECTED
// fertilizer-charge tick.

import { describe, it, expect } from "vitest";
import { reduce as portalReduce } from "../features/portal/slice.js";
import { MAGIC_TOOLS } from "../features/portal/data.js";

describe("portal slice — coverage gaps", () => {
  const baseState = (over = {}) => ({
    built: { portal: true },
    influence: 1000,
    tools: {},
    grid: null,
    inventory: {},
    turnsUsed: 0,
    farmRun: null,
    lastChainSnapshot: null,
    magicFertilizerCharges: 0,
    fertilizerActive: false,
    ...over,
  });

  it("SUMMON_MAGIC_TOOL with unknown id → no-op", () => {
    const s0 = baseState();
    const s1 = portalReduce(s0, { type: "SUMMON_MAGIC_TOOL", payload: { id: "nope" } });
    expect(s1).toBe(s0);
  });

  it("SUMMON_MAGIC_TOOL without portal built → no-op", () => {
    const s0 = baseState({ built: {} });
    const s1 = portalReduce(s0, { type: "SUMMON_MAGIC_TOOL", payload: { id: MAGIC_TOOLS[0].id } });
    expect(s1).toBe(s0);
  });

  it("SUMMON_MAGIC_TOOL with insufficient influence → no-op", () => {
    const def = MAGIC_TOOLS[0];
    const s0 = baseState({ influence: def.influenceCost - 1 });
    const s1 = portalReduce(s0, { type: "SUMMON_MAGIC_TOOL", payload: { id: def.id } });
    expect(s1).toBe(s0);
  });

  it("SUMMON_MAGIC_TOOL success deducts influence + increments tool count", () => {
    const def = MAGIC_TOOLS[0];
    const s0 = baseState({ influence: def.influenceCost + 10 });
    const s1 = portalReduce(s0, { type: "SUMMON_MAGIC_TOOL", payload: { id: def.id } });
    expect(s1.influence).toBe(10);
    expect(s1.tools[def.id]).toBe(1);
  });

  it("USE_TOOL hourglass: 0-count → no-op", () => {
    const s0 = baseState({ tools: { hourglass: 0 } });
    const s1 = portalReduce(s0, { type: "USE_TOOL", payload: { id: "hourglass" } });
    expect(s1).toBe(s0);
  });

  it("USE_TOOL hourglass: no snapshot → refund (no consumption)", () => {
    const s0 = baseState({ tools: { hourglass: 1 }, lastChainSnapshot: null });
    const s1 = portalReduce(s0, { type: "USE_TOOL", payload: { id: "hourglass" } });
    expect(s1).toBe(s0);
  });

  it("USE_TOOL hourglass: snapshot present → restore + decrement", () => {
    const s0 = baseState({
      tools: { hourglass: 2 },
      lastChainSnapshot: { grid: [[]], inventory: { foo: 5 }, turnsUsed: 3 },
      grid: null,
      inventory: {},
      turnsUsed: 5,
    });
    const s1 = portalReduce(s0, { type: "USE_TOOL", payload: { id: "hourglass" } });
    expect(s1.tools.hourglass).toBe(1);
    expect(s1.inventory.foo).toBe(5);
    expect(s1.turnsUsed).toBe(3);
    expect(s1.lastChainSnapshot).toBeNull();
  });

  it("USE_TOOL magic_seed: 0-count → no-op", () => {
    const s0 = baseState({ tools: { magic_seed: 0 } });
    const s1 = portalReduce(s0, { type: "USE_TOOL", payload: { id: "magic_seed" } });
    expect(s1).toBe(s0);
  });

  it("USE_TOOL magic_seed: extends the active farmRun by 5", () => {
    const s0 = baseState({ tools: { magic_seed: 1 }, farmRun: { zoneId: "home", turnBudget: 10, turnsRemaining: 4, startedAt: 1 } });
    const s1 = portalReduce(s0, { type: "USE_TOOL", payload: { id: "magic_seed" } });
    expect(s1.farmRun.turnBudget).toBe(15);
    expect(s1.farmRun.turnsRemaining).toBe(9);
    expect(s1.tools.magic_seed).toBe(0);
  });

  it("USE_TOOL magic_fertilizer: sets 3 charges + decrements count", () => {
    const s0 = baseState({ tools: { magic_fertilizer: 1 } });
    const s1 = portalReduce(s0, { type: "USE_TOOL", payload: { id: "magic_fertilizer" } });
    expect(s1.magicFertilizerCharges).toBe(3);
    expect(s1.tools.magic_fertilizer).toBe(0);
  });

  it("USE_TOOL magic_fertilizer: 0-count → no-op", () => {
    const s0 = baseState({ tools: { magic_fertilizer: 0 } });
    const s1 = portalReduce(s0, { type: "USE_TOOL", payload: { id: "magic_fertilizer" } });
    expect(s1).toBe(s0);
  });

  it("USE_TOOL magic_wand: arms toolPending and decrements count", () => {
    const s0 = baseState({ tools: { magic_wand: 1 } });
    const s1 = portalReduce(s0, { type: "USE_TOOL", payload: { id: "magic_wand" } });
    expect(s1.toolPending).toBe("magic_wand");
    expect(s1.tools.magic_wand).toBe(0);
  });

  it("USE_TOOL magic_wand: 0-count → no-op", () => {
    const s0 = baseState({ tools: { magic_wand: 0 } });
    const s1 = portalReduce(s0, { type: "USE_TOOL", payload: { id: "magic_wand" } });
    expect(s1).toBe(s0);
  });

  it("USE_TOOL with non-magic id → no-op (handled by core)", () => {
    const s0 = baseState();
    const s1 = portalReduce(s0, { type: "USE_TOOL", payload: { id: "rake" } });
    expect(s1).toBe(s0);
  });

  it("USE_TOOL with no id → no-op", () => {
    const s0 = baseState();
    const s1 = portalReduce(s0, { type: "USE_TOOL", payload: {} });
    expect(s1).toBe(s0);
  });

  it("CHAIN_COLLECTED: 0 charges → no-op", () => {
    const s0 = baseState({ magicFertilizerCharges: 0 });
    const s1 = portalReduce(s0, { type: "CHAIN_COLLECTED", payload: {} });
    expect(s1).toBe(s0);
  });

  it("CHAIN_COLLECTED: charges > 0 decrements by 1", () => {
    const s0 = baseState({ magicFertilizerCharges: 3, fertilizerActive: true });
    const s1 = portalReduce(s0, { type: "CHAIN_COLLECTED", payload: {} });
    expect(s1.magicFertilizerCharges).toBe(2);
    expect(s1.fertilizerActive).toBe(true);
  });

  it("CHAIN_COLLECTED: charges hitting 0 clears fertilizerActive", () => {
    const s0 = baseState({ magicFertilizerCharges: 1, fertilizerActive: true });
    const s1 = portalReduce(s0, { type: "CHAIN_COLLECTED", payload: {} });
    expect(s1.magicFertilizerCharges).toBe(0);
    expect(s1.fertilizerActive).toBe(false);
  });

  it("unknown action returns state unchanged", () => {
    const s0 = baseState();
    expect(portalReduce(s0, { type: "NOPE" })).toBe(s0);
  });
});
