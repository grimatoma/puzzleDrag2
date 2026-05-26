import { describe, it, expect } from "vitest";
import { buildTownPlan } from "../townLayout.js";

describe("townLayout.js - buildTownPlan", () => {
  it("generates a deterministic plan with default arguments", () => {
    const plan1 = buildTownPlan();
    const plan2 = buildTownPlan();

    // The outputs should be exactly the same for default arguments
    expect(plan1).toEqual(plan2);

    // Verify structural properties
    expect(plan1.width).toBe(1100);
    expect(plan1.height).toBe(600);
    expect(plan1.lots).toHaveLength(12); // default plotCount is 12

    // Using snapshot for a comprehensive check of the base shape
    expect(plan1).toMatchSnapshot();
  });

  it("adjusts to different plotCounts", () => {
    // Edge case: plotCount less than 1
    const minPlan = buildTownPlan({ plotCount: 0 });
    expect(minPlan.lots).toHaveLength(1); // capped at min 1

    // A small number of lots
    const smallPlan = buildTownPlan({ plotCount: 5 });
    expect(smallPlan.lots).toHaveLength(5);

    // Lots are capped at the sum of row caps
    // ROWS[2] (front) cap=5, ROWS[1] (mid) cap=5, ROWS[0] (back) cap=4
    // Total cap = 14 (lot 0 sits in the plaza, so we have 1 + 13)
    const overPlan = buildTownPlan({ plotCount: 20 });
    expect(overPlan.lots.length).toBeLessThanOrEqual(14);
  });

  it("includes puzzle-board fixtures based on boardKinds", () => {
    const farmPlan = buildTownPlan({ boardKinds: ["farm"] });
    expect(farmPlan.boards).toEqual([
      expect.objectContaining({ kind: "farm" })
    ]);

    // Should have left board street
    expect(farmPlan.streets.some(s => s.x1 === 118 && s.y1 === 398)).toBe(true);

    const minePlan = buildTownPlan({ boardKinds: ["mine"] });
    expect(minePlan.boards).toEqual([
      expect.objectContaining({ kind: "mine" })
    ]);

    // Should have right board street
    expect(minePlan.streets.some(s => s.x1 === 1100 - 116 && s.y1 === 398)).toBe(true);

    const allPlan = buildTownPlan({ boardKinds: ["farm", "mine", "fish"] });
    expect(allPlan.boards.length).toBe(3);
    expect(allPlan.boards.map(b => b.kind)).toContain("farm");
    expect(allPlan.boards.map(b => b.kind)).toContain("mine");
    expect(allPlan.boards.map(b => b.kind)).toContain("fish");
  });

  it("produces different layouts for different zoneIds (seeded PRNG)", () => {
    const homePlan = buildTownPlan({ zoneId: "home" });
    const forestPlan = buildTownPlan({ zoneId: "forest" });
    const mountainPlan = buildTownPlan({ zoneId: "mountain" });

    // The lots should be placed differently due to PRNG jitter
    expect(homePlan.lots).not.toEqual(forestPlan.lots);
    expect(homePlan.lots).not.toEqual(mountainPlan.lots);
    expect(forestPlan.lots).not.toEqual(mountainPlan.lots);
  });

  it("handles non-array boardKinds gracefully", () => {
    const plan = buildTownPlan({ boardKinds: "farm" }); // Incorrect type
    expect(plan.boards).toEqual([]); // Should default to empty array
  });
});
