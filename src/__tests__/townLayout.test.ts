import { describe, it, expect } from "vitest";
import { buildTownPlan, STAGE_W, STAGE_H } from "../townLayout.js";

const W = 1280, H = 960;

describe("townLayout.ts - buildTownPlan (top-down map)", () => {
  it("exports the design-space dimensions", () => {
    expect(STAGE_W).toBe(W);
    expect(STAGE_H).toBe(H);
  });

  it("generates a deterministic plan with default arguments", () => {
    const plan1 = buildTownPlan();
    const plan2 = buildTownPlan();
    expect(plan1).toEqual(plan2);

    expect(plan1.width).toBe(W);
    expect(plan1.height).toBe(H);
    expect(plan1.lots).toHaveLength(12); // default plotCount
    expect(plan1.ground.top).toBe(0);
  });

  it("is deterministic with explicit (non-default) args too", () => {
    const args = { zoneId: "harbor", plotCount: 14, boardKinds: ["fish", "farm"] } as const;
    expect(buildTownPlan(args)).toEqual(buildTownPlan(args));
  });

  it("produces different layouts for different zoneIds", () => {
    const home = buildTownPlan({ zoneId: "home" });
    const forest = buildTownPlan({ zoneId: "forest" });
    const mountain = buildTownPlan({ zoneId: "mountain" });
    expect(home.lots).not.toEqual(forest.lots);
    expect(home.lots).not.toEqual(mountain.lots);
    expect(forest.lots).not.toEqual(mountain.lots);
  });

  it("adjusts lot count and keeps every lot in-bounds; lot0 is the plaza hearth", () => {
    expect(buildTownPlan({ plotCount: 0 }).lots).toHaveLength(1); // clamped to >=1
    expect(buildTownPlan({ plotCount: 1 }).lots).toHaveLength(1);
    expect(buildTownPlan({ plotCount: 12 }).lots).toHaveLength(12);

    const big = buildTownPlan({ plotCount: 40 });
    expect(big.lots).toHaveLength(40);
    expect(big.lots[0].row).toBe("plaza");

    for (const plan of [buildTownPlan({ plotCount: 1 }), big]) {
      for (const lot of plan.lots) {
        expect(lot.cx).toBeGreaterThanOrEqual(0);
        expect(lot.cx).toBeLessThanOrEqual(W);
        expect(lot.cy).toBeGreaterThanOrEqual(0);
        expect(lot.cy).toBeLessThanOrEqual(H);
      }
    }
    // Non-hearth lots carry a quarter tag.
    expect(big.lots.slice(1).every((l) => ["nw", "ne", "sw", "se"].includes(l.row))).toBe(true);
  });

  it("does not collapse to a single lot at extreme plotCount (graceful degradation)", () => {
    // Regression: the lot loop once discarded any subdivided cell below a 56px
    // floor. At very high plotCount every cell fell below it, so EVERY block was
    // dropped and the plan collapsed to just the 1 plaza lot. The fix degrades a
    // too-small block to a SINGLE whole-block lot instead of discarding it, so
    // every non-excluded block still contributes. Exact n is not guaranteed at
    // the extreme (the diagonal river excludes whole blocks, and slice(0,n) only
    // trims surplus), but the count must stay far above the old failure of 1.
    for (const n of [90, 100, 120, 150, 200]) {
      const plan = buildTownPlan({ plotCount: n });
      // Never collapses; for these grids the realised count sits just under n.
      expect(plan.lots.length).toBeGreaterThan(n * 0.8);
      expect(plan.lots.length).toBeLessThanOrEqual(n);
      // Lot 0 is still the plaza hearth; the rest carry quarter tags.
      expect(plan.lots[0].row).toBe("plaza");
      expect(plan.lots.slice(1).every((l) => ["nw", "ne", "sw", "se"].includes(l.row))).toBe(true);
      // Every lot stays inside the design space at the extreme too.
      for (const lot of plan.lots) {
        expect(lot.cx).toBeGreaterThanOrEqual(0);
        expect(lot.cx).toBeLessThanOrEqual(W);
        expect(lot.cy).toBeGreaterThanOrEqual(0);
        expect(lot.cy).toBeLessThanOrEqual(H);
      }
      // Determinism holds at extreme plotCount too.
      expect(buildTownPlan({ plotCount: n })).toEqual(plan);
    }
  });

  it("includes puzzle-board fixtures based on boardKinds", () => {
    const farmPlan = buildTownPlan({ boardKinds: ["farm"] });
    expect(farmPlan.boards.map((b) => b.kind)).toEqual(["farm"]);
    expect(farmPlan.fields.length).toBeGreaterThan(0); // farm board → tilled fields

    const minePlan = buildTownPlan({ boardKinds: ["mine"] });
    expect(minePlan.boards.map((b) => b.kind)).toEqual(["mine"]);

    const fishPlan = buildTownPlan({ boardKinds: ["fish"] });
    expect(fishPlan.boards.map((b) => b.kind)).toEqual(["fish"]);
    expect(fishPlan.water.some((w) => w.kind === "shore")).toBe(true); // fish → shoreline

    const allPlan = buildTownPlan({ boardKinds: ["farm", "mine", "fish"] });
    expect(allPlan.boards.map((b) => b.kind).sort()).toEqual(["farm", "fish", "mine"]);
  });

  it("handles non-array boardKinds gracefully", () => {
    // @ts-expect-error intentionally wrong type
    const plan = buildTownPlan({ boardKinds: "farm" });
    expect(plan.boards).toEqual([]);
  });

  it("always emits at least one water body and straight grid streets", () => {
    const plan = buildTownPlan({ plotCount: 12 });
    expect(plan.water.length).toBeGreaterThan(0);
    expect(plan.roads.length).toBeGreaterThan(0);
    // Roads are straight grid streets stored as 3-pt polylines (endpoint, midpoint,
    // endpoint); streets mirror them as 2-pt segments.
    expect(plan.roads.every((r) => r.points.length >= 3)).toBe(true);
    expect(plan.streets.length).toBeGreaterThan(0);
    expect(plan.streets.every((s) => typeof s.width === "number")).toBe(true);
  });

  it("emits a city grid: every road segment is axis-aligned and colinear", () => {
    const EPS = 0.001;
    for (const args of [
      { plotCount: 12 },
      { plotCount: 40 },
      { zoneId: "harbor", plotCount: 16, boardKinds: ["farm", "mine", "fish"] as const },
    ]) {
      const plan = buildTownPlan(args);
      for (const road of plan.roads) {
        // Per-segment: each segment runs purely vertically or horizontally.
        for (let i = 0; i < road.points.length - 1; i++) {
          const a = road.points[i], b = road.points[i + 1];
          const sharesX = Math.abs(a.x - b.x) < EPS;
          const sharesY = Math.abs(a.y - b.y) < EPS;
          expect(sharesX || sharesY).toBe(true);
        }
        // Whole-polyline: a straight street is colinear — every point shares the
        // same x (vertical road) or the same y (horizontal road).
        const xs = road.points.map((p) => p.x);
        const ys = road.points.map((p) => p.y);
        const sameX = Math.max(...xs) - Math.min(...xs) < EPS;
        const sameY = Math.max(...ys) - Math.min(...ys) < EPS;
        expect(sameX || sameY).toBe(true);
      }
    }
  });

  it("builds a connected waypoint graph (BFS from node 0 reaches all)", () => {
    const plan = buildTownPlan({ plotCount: 16, boardKinds: ["farm", "mine"] });
    const n = plan.waypoints.length;
    expect(n).toBeGreaterThan(0);

    const adj: number[][] = Array.from({ length: n }, () => []);
    for (const [a, b] of plan.edges) {
      adj[a].push(b);
      adj[b].push(a);
    }
    const seen = new Set<number>([0]);
    const queue: number[] = [0];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const nx of adj[cur]) if (!seen.has(nx)) { seen.add(nx); queue.push(nx); }
    }
    expect(seen.size).toBe(n);
  });

  it("caps total tree canopy entries", () => {
    const plan = buildTownPlan({ zoneId: "verdant", plotCount: 6 });
    expect(plan.trees.length).toBeLessThanOrEqual(40);
  });
});
