import { describe, it, expect } from "vitest";
import {
  simulatePool, simulateSeasonDrops, variancePerCategory, deterministicRng,
} from "../balanceManager/poolSimulator.js";

describe("simulatePool", () => {
  it("emits zero counts when weights total is 0", () => {
    const out = simulatePool({ weights: { a: 0, b: 0 }, pickCount: 100, rng: deterministicRng(1) });
    expect(out.picks).toBe(0);
    expect(out.counts.a).toBe(0);
    expect(out.counts.b).toBe(0);
  });

  it("emits zero picks when pickCount is 0", () => {
    const out = simulatePool({ weights: { a: 1 }, pickCount: 0, rng: deterministicRng(1) });
    expect(out.picks).toBe(0);
    expect(out.counts.a).toBe(0);
  });

  it("counts converge near the weight ratio with a large sample", () => {
    const out = simulatePool({ weights: { a: 0.5, b: 0.5 }, pickCount: 4000, rng: deterministicRng(7) });
    expect(out.picks).toBe(4000);
    expect(Math.abs(out.percents.a - 0.5)).toBeLessThan(0.05);
    expect(Math.abs(out.percents.b - 0.5)).toBeLessThan(0.05);
  });

  it("ignores categories whose weight is zero or negative", () => {
    const out = simulatePool({ weights: { a: 1, b: 0, c: -1 }, pickCount: 50, rng: deterministicRng(2) });
    expect(out.counts.a).toBe(50);
    expect(out.counts.b ?? 0).toBe(0);
    expect(out.counts.c ?? 0).toBe(0);
  });

  it("is deterministic with a seeded RNG", () => {
    const w = { a: 1, b: 2, c: 3 };
    const r1 = simulatePool({ weights: w, pickCount: 200, rng: deterministicRng(42) });
    const r2 = simulatePool({ weights: w, pickCount: 200, rng: deterministicRng(42) });
    expect(r1.counts).toEqual(r2.counts);
  });
});

describe("simulateSeasonDrops", () => {
  it("returns one simulation result per season key", () => {
    const out = simulateSeasonDrops({
      seasonDrops: { Spring: { a: 1 }, Summer: { a: 1, b: 1 } },
      pickCount: 100, rng: deterministicRng(3),
    });
    expect(Object.keys(out).sort()).toEqual(["Spring", "Summer"]);
    expect(out.Spring.counts.a).toBe(100);
  });
});

describe("variancePerCategory", () => {
  it("reports target / actual / delta sorted by |delta| desc", () => {
    const weights = { a: 0.5, b: 0.5 };
    const result = simulatePool({ weights, pickCount: 200, rng: deterministicRng(99) });
    const rows = variancePerCategory(weights, result);
    expect(rows.map((r) => r.category).sort()).toEqual(["a", "b"]);
    for (const row of rows) {
      expect(typeof row.target).toBe("number");
      expect(typeof row.actual).toBe("number");
      expect(typeof row.delta).toBe("number");
    }
    expect(Math.abs(rows[0].delta)).toBeGreaterThanOrEqual(Math.abs(rows[1].delta));
  });

  it("returns an empty list when given no weights", () => {
    expect(variancePerCategory(null, null)).toEqual([]);
  });
});

describe("deterministicRng", () => {
  it("produces a stable sequence per seed", () => {
    const rng = deterministicRng(1);
    const first = [rng(), rng(), rng()];
    const rng2 = deterministicRng(1);
    const second = [rng2(), rng2(), rng2()];
    expect(first).toEqual(second);
  });

  it("yields different sequences for different seeds", () => {
    const rng = deterministicRng(1);
    const rng2 = deterministicRng(2);
    expect(rng()).not.toBe(rng2());
  });
});
