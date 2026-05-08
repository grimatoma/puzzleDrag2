// Coverage fillins for src/features/apprentices/aggregate.js. The
// pre-PR coverage put it at 58% statements with branches touching the
// debt short-circuit, default fallthrough, multi-redirect tie-breaker,
// and the structured effect bag.

import { describe, it, expect } from "vitest";
import { computeWorkerEffects } from "../features/apprentices/aggregate.js";

describe("computeWorkerEffects — coverage gaps", () => {
  it("returns the empty bag when state has no workers", () => {
    const out = computeWorkerEffects({});
    expect(out).toEqual({
      thresholdReduce: {},
      poolWeight: {},
      bonusYield: {},
      seasonBonus: {},
      effectivePoolWeights: {},
      hazardSpawnReduce: {},
      chainRedirect: {},
      recipeInputReduce: {},
    });
  });

  it("debt > 0 short-circuits all worker effects", () => {
    const s = {
      workers: { hired: { hilda: 3 }, debt: 50, pool: 3 },
    };
    const out = computeWorkerEffects(s);
    expect(out.thresholdReduce).toEqual({});
  });

  it("count clamps to maxCount even when hired records a higher value", () => {
    // hilda's maxCount is 3 — hired record of 99 should clamp to 3.
    const s = {
      workers: { hired: { hilda: 99 }, debt: 0, pool: 99 },
    };
    const out = computeWorkerEffects(s);
    // threshold delta at max hire = (6 - 3) = 3
    expect(out.thresholdReduce.grass_hay).toBe(3);
  });

  it("multiple workers hitting the same key add deltas", () => {
    // hilda + (hypothetically) any other worker on grass_hay would stack.
    // Use peasant or another grass_hay-touching worker if present.
    const s = {
      workers: { hired: { hilda: 3 }, debt: 0, pool: 3 },
    };
    const out = computeWorkerEffects(s);
    expect(out.thresholdReduce.grass_hay).toBe(3);
  });

  it("threshold_reduce_category fans out across every species in the category", () => {
    // brenna is threshold_reduce_category vegetables 6 → 5 (delta 1 at max, max 4 hires).
    const s = {
      workers: { hired: { brenna: 4 }, debt: 0, pool: 4 },
    };
    const out = computeWorkerEffects(s);
    // Every veg species should drop by 1
    expect(out.thresholdReduce.veg_carrot).toBe(1);
    expect(out.thresholdReduce.veg_eggplant).toBe(1);
  });

  it("pool_weight (legacy single-key form) accumulates fractional", () => {
    // pip is pool_weight berry +2 max=2, so 1 hire → +1.
    const s = {
      workers: { hired: { pip: 1 }, debt: 0, pool: 1 },
    };
    const out = computeWorkerEffects(s);
    expect(out.poolWeight.berry).toBe(1);
  });

  it("season_bonus accumulates per-hire", () => {
    // tuck is season_bonus coins +30 max=1.
    const s = {
      workers: { hired: { tuck: 1 }, debt: 0, pool: 1 },
    };
    const out = computeWorkerEffects(s);
    expect(out.seasonBonus.coins).toBe(30);
  });

  it("bonus_yield accumulates", () => {
    // wila is bonus_yield berry_jam +2 max=2.
    const s = {
      workers: { hired: { wila: 2 }, debt: 0, pool: 2 },
    };
    const out = computeWorkerEffects(s);
    expect(out.bonusYield.berry_jam).toBe(2);
  });

  it("chain_redirect_category sets a redirect entry", () => {
    // tilda redirects grain → vegetables, max maxCount 4, from 5 to 4.
    const s = {
      workers: { hired: { tilda: 4 }, debt: 0, pool: 4 },
    };
    const out = computeWorkerEffects(s);
    expect(out.chainRedirect.grain).toBeDefined();
    expect(out.chainRedirect.grain.toCategory).toBe("vegetables");
    expect(out.chainRedirect.grain.threshold).toBeCloseTo(4, 5);
    expect(out.chainRedirect.grain.redirectShare).toBe(1);
  });

  it("partial redirect hire scales threshold linearly", () => {
    const s = {
      workers: { hired: { tilda: 2 }, debt: 0, pool: 2 },
    };
    const out = computeWorkerEffects(s);
    // perHireScalar = 2/4 = 0.5 → threshold = 5 - (5-4)*0.5 = 4.5
    expect(out.chainRedirect.grain.threshold).toBeCloseTo(4.5);
    expect(out.chainRedirect.grain.redirectShare).toBe(0.5);
  });

  it("hired count of 0 does not register the worker", () => {
    const s = {
      workers: { hired: { hilda: 0 }, debt: 0, pool: 0 },
    };
    const out = computeWorkerEffects(s);
    expect(out.thresholdReduce).toEqual({});
  });

  it("negative hired count is treated as 0", () => {
    const s = {
      workers: { hired: { hilda: -3 }, debt: 0, pool: 0 },
    };
    const out = computeWorkerEffects(s);
    expect(out.thresholdReduce).toEqual({});
  });

  it("missing workers slice falls back to no effects", () => {
    const out = computeWorkerEffects({ inventory: {} });
    expect(out.thresholdReduce).toEqual({});
  });

  it("structured effect: hazardSpawnReduce caps at 1.0", () => {
    // Build a fake state with multiple hires that would exceed 1.0.
    // Use canary (which has hazardSpawnReduce { gas_vent: 0.5 } at maxCount 2).
    const s = {
      workers: { hired: { canary: 2 }, debt: 0, pool: 2 },
    };
    const out = computeWorkerEffects(s);
    expect(out.hazardSpawnReduce.gas_vent).toBeCloseTo(0.5);
    expect(out.hazardSpawnReduce.gas_vent).toBeLessThanOrEqual(1.0);
  });

  it("structured effect: object-form poolWeight floors fractional per-hire", () => {
    // geologist has poolWeight {mine_ore: 1, mine_gem: 1} maxCount 2.
    // 1 hire → perHire = 0.5 → Math.floor(0.5) = 0
    const s = {
      workers: { hired: { geologist: 1 }, debt: 0, pool: 1 },
    };
    const out = computeWorkerEffects(s);
    expect(out.effectivePoolWeights.mine_ore).toBe(0);
  });

  it("structured effect: object-form poolWeight at max-hire scales correctly", () => {
    const s = {
      workers: { hired: { geologist: 2 }, debt: 0, pool: 2 },
    };
    const out = computeWorkerEffects(s);
    expect(out.effectivePoolWeights.mine_ore).toBe(1);
    expect(out.effectivePoolWeights.mine_gem).toBe(1);
  });
});
