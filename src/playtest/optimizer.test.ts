// Tests for the target-seeking optimizer (M3).

import { describe, it, expect } from "vitest";
import { ITEMS } from "../constants.js";
import { familyValueSpread } from "./metrics.js";
import { optimize, spreadObjective, type OptimizeSpec } from "./optimizer.js";

describe("optimize — coordinate descent (synthetic)", () => {
  it("converges a single knob to the loss minimum and restores it (non-destructive)", () => {
    let x = 0;
    const spec: OptimizeSpec = {
      knobs: [{ path: "x", min: 0, max: 10, integer: true, get: () => x, set: (v) => { x = v; } }],
      loss: () => (x - 5) ** 2,
    };
    const r = optimize(spec);
    expect(r.acceptable).toBe(true);
    expect(r.changeList).toEqual({ x: 5 });
    expect(x).toBe(0); // live value restored — the optimizer changes nothing in place
  });

  it("prefers the least-disruptive value on a tie (highest value clearing the goal)", () => {
    // loss is 0 for any x >= 5; the tie-break should keep x as HIGH as possible.
    let x = 0;
    const spec: OptimizeSpec = {
      knobs: [{ path: "x", min: 0, max: 10, integer: true, get: () => x, set: (v) => { x = v; } }],
      loss: () => (x >= 5 ? 0 : 5 - x),
    };
    const r = optimize(spec);
    expect(r.changeList).toEqual({ x: 10 });
  });
});

describe("optimize — family-value spread objective", () => {
  it("compresses the flagged outliers under the ceiling, then restores constants", () => {
    const before = familyValueSpread();
    const flagged = before.entries.filter((e) => e.flag === "high").map((e) => e.resourceKey);
    expect(flagged.length).toBeGreaterThan(0); // there ARE outliers to fix

    const result = optimize(spreadObjective());

    // The goal (no resource above factor × median) is met...
    expect(result.acceptable).toBe(true);
    expect(result.before).toBeGreaterThan(0);
    expect(result.after).toBeLessThanOrEqual(1e-9);
    // ...by cutting exactly the flagged outliers' ITEMS values (e.g. pearls/jade).
    for (const key of flagged) expect(result.changeList).toHaveProperty(`ITEMS.${key}.value`);
    for (const path of Object.keys(result.changeList)) expect(path).toMatch(/^ITEMS\..+\.value$/);

    // Non-destructive: the live catalog is exactly as it was.
    const after = familyValueSpread();
    expect(after.entries.map((e) => e.resourceValue)).toEqual(before.entries.map((e) => e.resourceValue));
    expect((ITEMS as Record<string, { value: number }>).pearls.value).toBe(before.byResource.pearls.resourceValue);
  });

  it("is deterministic — same proposal every run", () => {
    expect(optimize(spreadObjective()).changeList).toEqual(optimize(spreadObjective()).changeList);
  });
});
