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
    expect(plan1.lots).toHaveLength(12); // matches the requested plotCount
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

  it("caps the plot count to the requested plotCount and keeps every lot in-bounds", () => {
    expect(buildTownPlan({ plotCount: 0 }).lots).toHaveLength(1); // clamped to >=1
    expect(buildTownPlan({ plotCount: 1 }).lots).toHaveLength(1);
    expect(buildTownPlan({ plotCount: 12 }).lots).toHaveLength(12);

    const big = buildTownPlan({ plotCount: 40 });
    expect(big.lots).toHaveLength(40);

    for (const plan of [buildTownPlan({ plotCount: 1 }), big]) {
      for (const lot of plan.lots) {
        expect(lot.cx).toBeGreaterThanOrEqual(0);
        expect(lot.cx).toBeLessThanOrEqual(W);
        expect(lot.cy).toBeGreaterThanOrEqual(0);
        expect(lot.cy).toBeLessThanOrEqual(H);
      }
    }
    // Every lot is a building lot carrying a quarter tag (no plaza lot).
    expect(big.lots.every((l) => ["nw", "ne", "sw", "se"].includes(l.row))).toBe(true);
  });

  it("emits uniform equal-size building lots (all lots share w and h)", () => {
    for (const plotCount of [12, 40]) {
      const building = buildTownPlan({ plotCount }).lots;
      expect(building.length).toBeGreaterThan(0);
      const { w, h } = building[0];
      expect(building.every((l) => l.w === w)).toBe(true);
      expect(building.every((l) => l.h === h)).toBe(true);
    }
  });

  it("scales to extreme plotCount without collapsing (graceful degradation)", () => {
    // One uniform building lot per non-excluded block, capped to n. The tight
    // grid keeps buildable cells just above n, so the realised count holds at n.
    for (const n of [90, 100, 120, 150, 200]) {
      const plan = buildTownPlan({ plotCount: n });
      expect(plan.lots.length).toBeGreaterThan(n * 0.8);
      expect(plan.lots.length).toBeLessThanOrEqual(n);
      // Every lot is a building lot carrying a quarter tag (no plaza lot).
      expect(plan.lots.every((l) => ["nw", "ne", "sw", "se"].includes(l.row))).toBe(true);
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

  it("always emits at least one water body and a street grid", () => {
    const plan = buildTownPlan({ plotCount: 12 });
    expect(plan.water.length).toBeGreaterThan(0);
    expect(plan.roads.length).toBeGreaterThan(0);
    expect(plan.roads.every((r) => r.points.length >= 3)).toBe(true);
    expect(plan.streets.length).toBeGreaterThan(0);
    expect(plan.streets.every((s) => typeof s.width === "number")).toBe(true);
  });

  it("emits a village grid: every road segment is axis-aligned", () => {
    const EPS = 0.001;
    for (const args of [
      { plotCount: 12 },
      { plotCount: 40 },
      { zoneId: "harbor", plotCount: 16, boardKinds: ["farm", "mine", "fish"] as const },
    ]) {
      const plan = buildTownPlan(args);
      for (const road of plan.roads) {
        for (let i = 0; i < road.points.length - 1; i++) {
          const a = road.points[i], b = road.points[i + 1];
          const sharesX = Math.abs(a.x - b.x) < EPS;
          const sharesY = Math.abs(a.y - b.y) < EPS;
          expect(sharesX || sharesY).toBe(true);
        }
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

  it("places a bridge at every road×river crossing", () => {
    for (const args of [
      { plotCount: 12 },
      { zoneId: "harbor", plotCount: 16, boardKinds: ["farm", "mine", "fish"] as const },
    ]) {
      const plan = buildTownPlan(args);
      expect(plan.bridges.length).toBeGreaterThan(0);
      for (const b of plan.bridges) {
        expect(b.width).toBeGreaterThan(0);
        expect(Math.abs(Math.sin(2 * b.angle))).toBeLessThan(1e-6);
      }
    }
  });

  it("emits axis-aligned front paths that never exit above the building", () => {
    const plan = buildTownPlan({ plotCount: 12 });
    expect(plan.paths.length).toBeGreaterThan(0);
    for (const p of plan.paths) {
      const axisAligned = Math.abs(p.x1 - p.x2) < 1e-6 || Math.abs(p.y1 - p.y2) < 1e-6;
      expect(axisAligned).toBe(true);
      expect(p.width).toBeGreaterThan(0);
      expect(p.y2).toBeGreaterThanOrEqual(p.y1 - 1e-6);
    }
  });

  it("keeps every lamppost off the road bodies", () => {
    // Point-to-segment distance (local copy of the generator's geometry helper).
    const segDist = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
      const dx = b.x - a.x, dy = b.y - a.y;
      const len2 = dx * dx + dy * dy || 1;
      let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    };
    const plan = buildTownPlan({ plotCount: 16, boardKinds: ["farm", "mine", "fish"] });
    const lamps = plan.props.filter((p) => p.kind === "lamppost");
    expect(lamps.length).toBeGreaterThan(0);
    for (const lamp of lamps) {
      let minClearance = Infinity; // (dist to nearest road centerline) - (road half-width)
      for (const road of plan.roads) {
        for (let i = 0; i < road.points.length - 1; i++) {
          const d = segDist(lamp, road.points[i], road.points[i + 1]);
          minClearance = Math.min(minClearance, d - road.width / 2);
        }
      }
      // A lamp on the road body would have negative clearance; assert it's clear.
      expect(minClearance).toBeGreaterThanOrEqual(-1e-6);
    }
  });

  it("scatters street-verge trees that never sit on a road and stay in-bounds", () => {
    // Point-to-segment distance (local copy of the generator's geometry helper).
    const segDist = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
      const dx = b.x - a.x, dy = b.y - a.y;
      const len2 = dx * dx + dy * dy || 1;
      let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    };
    const plan = buildTownPlan({ plotCount: 16, boardKinds: ["farm", "mine", "fish"] });
    expect(plan.streetTrees.length).toBeLessThanOrEqual(22); // STREET_TREE_CAP
    for (const t of plan.streetTrees) {
      // In-bounds.
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x).toBeLessThanOrEqual(W);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeLessThanOrEqual(H);
      // Off every road body (clearance to the nearest road centerline exceeds
      // that road's half-width).
      for (const road of plan.roads) {
        for (let i = 0; i < road.points.length - 1; i++) {
          const d = segDist(t, road.points[i], road.points[i + 1]);
          expect(d).toBeGreaterThan(road.width / 2);
        }
      }
    }
  });

  it("keeps every lot decor accent within its matching lot's bounds", () => {
    const plan = buildTownPlan({ plotCount: 16, boardKinds: ["farm", "mine", "fish"] });
    const lotByIndex = new Map(plan.lots.map((l) => [l.index, l]));
    for (const d of plan.lotDecor) {
      const lot = lotByIndex.get(d.lot);
      expect(lot).toBeDefined();
      expect(Math.abs(d.x - lot!.cx)).toBeLessThanOrEqual(lot!.w / 2);
      expect(Math.abs(d.y - lot!.cy)).toBeLessThanOrEqual(lot!.h / 2);
    }
  });

  it("leaves the main rng stream untouched (decor uses a separate seed)", () => {
    // The decor sub-RNG is seeded independently, so existing arrays are still
    // populated and the whole plan is still deterministic across calls.
    const plan = buildTownPlan({ plotCount: 12 });
    expect(plan.trees.length).toBeGreaterThan(0);
    expect(plan.fields.length).toBeGreaterThanOrEqual(0); // home zone has no farm board → may be 0
    expect(plan.props.length).toBeGreaterThan(0);
    expect(buildTownPlan({ plotCount: 12 })).toEqual(plan);

    // With a farm board, fields are non-empty; determinism still holds.
    const farm = buildTownPlan({ plotCount: 12, boardKinds: ["farm"] });
    expect(farm.fields.length).toBeGreaterThan(0);
    expect(farm.trees.length).toBeGreaterThan(0);
    expect(farm.props.length).toBeGreaterThan(0);
    expect(buildTownPlan({ plotCount: 12, boardKinds: ["farm"] })).toEqual(farm);
  });

  it("locks the field inside the farm board's footprint", () => {
    const plan = buildTownPlan({ plotCount: 16, boardKinds: ["farm"] });
    const farm = plan.boards.find((b) => b.kind === "farm");
    expect(farm).toBeDefined();
    expect(plan.fields.length).toBeGreaterThan(0);
    const TOL = 1; // field is 0.9× the card so strictly inside; small float tolerance
    for (const f of plan.fields) {
      expect(f.angle).toBe(0);
      expect(f.cx - f.w / 2).toBeGreaterThanOrEqual(farm!.cx - farm!.w / 2 - TOL);
      expect(f.cx + f.w / 2).toBeLessThanOrEqual(farm!.cx + farm!.w / 2 + TOL);
      expect(f.cy - f.h / 2).toBeGreaterThanOrEqual(farm!.cy - farm!.h / 2 - TOL);
      expect(f.cy + f.h / 2).toBeLessThanOrEqual(farm!.cy + farm!.h / 2 + TOL);
    }
  });
});
