import { describe, it, expect } from "vitest";
import {
  workerCostLadder, allWorkerLadders, totalWorkerEconomy, WORKER_RAMP_KINDS,
} from "../balanceManager/workerCosts.js";

describe("workerCostLadder", () => {
  it("returns null for an empty input", () => {
    expect(workerCostLadder(null)).toBeNull();
    expect(workerCostLadder({})).toBeNull();
  });

  it("emits a flat ladder when neither coinsStep nor coinsMult is set", () => {
    const out = workerCostLadder({ id: "f", name: "F", hireCost: { coins: 50 }, maxCount: 3 });
    expect(out.ramp.kind).toBe("flat");
    expect(out.ladder.map((l) => l.cost)).toEqual([50, 50, 50]);
    expect(out.totalCost).toBe(150);
  });

  it("emits a linear ladder with cumulative running total", () => {
    const out = workerCostLadder({ id: "f", name: "F", hireCost: { coins: 50, coinsStep: 25 }, maxCount: 4 });
    expect(out.ramp.kind).toBe("linear");
    expect(out.ramp.step).toBe(25);
    expect(out.ladder.map((l) => l.cost)).toEqual([50, 75, 100, 125]);
    expect(out.ladder.map((l) => l.cumulative)).toEqual([50, 125, 225, 350]);
    expect(out.totalCost).toBe(350);
  });

  it("emits a geometric ladder when coinsMult is set", () => {
    const out = workerCostLadder({ id: "g", name: "G", hireCost: { coins: 100, coinsMult: 2 }, maxCount: 4 });
    expect(out.ramp.kind).toBe("geometric");
    expect(out.ramp.factor).toBe(2);
    expect(out.ladder.map((l) => l.cost)).toEqual([100, 200, 400, 800]);
    expect(out.totalCost).toBe(1500);
  });

  it("coinsMult wins when both coinsMult and coinsStep are set", () => {
    const out = workerCostLadder({ id: "g", name: "G",
      hireCost: { coins: 10, coinsMult: 3, coinsStep: 1 }, maxCount: 3 });
    expect(out.ramp.kind).toBe("geometric");
    expect(out.ladder.map((l) => l.cost)).toEqual([10, 30, 90]);
  });

  it("treats maxCount=0 as a zero-length ladder", () => {
    const out = workerCostLadder({ id: "f", name: "F", hireCost: { coins: 50 }, maxCount: 0 });
    expect(out.ladder).toEqual([]);
    expect(out.totalCost).toBe(0);
  });
});

describe("allWorkerLadders", () => {
  it("returns one ladder per worker in the live catalog", () => {
    const out = allWorkerLadders();
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((l) => Array.isArray(l.ladder))).toBe(true);
  });

  it("accepts a custom catalog (dependency injection)", () => {
    const out = allWorkerLadders({ workers: [{ id: "a", maxCount: 2, hireCost: { coins: 10 } }] });
    expect(out).toHaveLength(1);
    expect(out[0].totalCost).toBe(20);
  });
});

describe("totalWorkerEconomy", () => {
  it("sums the totalCost across every ladder", () => {
    const ladders = [
      { totalCost: 100 }, { totalCost: 250 }, { totalCost: 75 },
    ];
    expect(totalWorkerEconomy(ladders)).toBe(425);
  });

  it("returns 0 for an empty / null input", () => {
    expect(totalWorkerEconomy([])).toBe(0);
    expect(totalWorkerEconomy(null)).toBe(0);
  });
});

describe("WORKER_RAMP_KINDS", () => {
  it("lists all three ramp kinds", () => {
    expect(new Set(WORKER_RAMP_KINDS)).toEqual(new Set(["flat", "linear", "geometric"]));
  });
});
