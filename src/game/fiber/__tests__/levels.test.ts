import { describe, expect, test } from "vitest";
import {
  type FiberLevel,
  type FiberProgress,
  FIBER_LEVELS,
  fiberLevelById,
  emptyProgress,
  applyResolveToProgress,
  objectiveProgress,
  objectiveMet,
  allObjectivesMet,
  evaluateLevel,
  computeStars,
} from "../levels.js";
import { RESOURCE_KEY_VALUES } from "../../../types/catalogKeys.js";

const L1 = fiberLevelById("L1")!;
const L2 = fiberLevelById("L2")!;

describe("objectiveProgress", () => {
  test("collect reads total cleared", () => {
    const p: FiberProgress = { cleared: 12, byColor: {}, weaves: 0 };
    expect(objectiveProgress({ type: "collect", target: "wool", count: 40, label: "" }, p)).toBe(12);
  });
  test("dye_color reads the matching colour count", () => {
    const p: FiberProgress = { cleared: 12, byColor: { brown: 5, white: 7 }, weaves: 0 };
    expect(objectiveProgress({ type: "dye_color", target: "brown", count: 15, label: "" }, p)).toBe(5);
  });
  test("weave reads the woven count", () => {
    const p: FiberProgress = { cleared: 0, byColor: {}, weaves: 2 };
    expect(objectiveProgress({ type: "weave", target: "cloth", count: 3, label: "" }, p)).toBe(2);
  });
});

describe("applyResolveToProgress", () => {
  test("accumulates total cleared, per-colour, and woven looms", () => {
    const start = emptyProgress();
    const next = applyResolveToProgress(start, {
      cleared: { white: 3, grey: 0, brown: 4, black: 0, cream: 0 },
      created: { spindle: 1, loom: 2, dyevat: 0 },
    });
    expect(next.cleared).toBe(7);
    expect(next.byColor.white).toBe(3);
    expect(next.byColor.brown).toBe(4);
    expect(next.weaves).toBe(2);
  });

  test("is pure (does not mutate the previous progress)", () => {
    const start = emptyProgress();
    applyResolveToProgress(start, {
      cleared: { white: 3, grey: 0, brown: 0, black: 0, cream: 0 },
      created: { spindle: 0, loom: 0, dyevat: 0 },
    });
    expect(start.cleared).toBe(0);
    expect(start.byColor).toEqual({});
  });
});

describe("evaluateLevel", () => {
  test("playing while objectives unmet and moves remain", () => {
    const p: FiberProgress = { cleared: 10, byColor: {}, weaves: 0 };
    expect(evaluateLevel(L1, p, 5)).toBe("playing");
  });

  test("won only when ALL objectives are met", () => {
    // L2 needs wool ×60 AND brown ×15.
    const partial: FiberProgress = { cleared: 60, byColor: { brown: 5 }, weaves: 0 };
    expect(allObjectivesMet(L2, partial)).toBe(false);
    expect(evaluateLevel(L2, partial, 3)).toBe("playing");

    const complete: FiberProgress = { cleared: 60, byColor: { brown: 15 }, weaves: 0 };
    expect(allObjectivesMet(L2, complete)).toBe(true);
    expect(evaluateLevel(L2, complete, 3)).toBe("won");
  });

  test("won takes priority even on the final move", () => {
    const p: FiberProgress = { cleared: 40, byColor: {}, weaves: 0 };
    expect(evaluateLevel(L1, p, L1.moves)).toBe("won");
  });

  test("lost when moves are exhausted with an objective unmet", () => {
    const p: FiberProgress = { cleared: 39, byColor: {}, weaves: 0 };
    expect(evaluateLevel(L1, p, L1.moves)).toBe("lost");
    expect(evaluateLevel(L1, p, L1.moves + 5)).toBe("lost");
  });

  test("objectiveMet boundary is inclusive", () => {
    const p: FiberProgress = { cleared: 40, byColor: {}, weaves: 0 };
    expect(objectiveMet(L1.objectives[0], p)).toBe(true);
  });
});

describe("computeStars", () => {
  test("3 stars when comfortably under budget, 1 when at the limit", () => {
    expect(computeStars(L1, 1)).toBe(3);
    expect(computeStars(L1, L1.moves)).toBe(1);
  });
});

describe("FIBER_LEVELS catalog sanity", () => {
  test("level ids are unique", () => {
    const ids = FIBER_LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every reward resource is a real catalog resource key", () => {
    const resourceKeys = new Set<string>(RESOURCE_KEY_VALUES);
    for (const level of FIBER_LEVELS) {
      for (const key of Object.keys(level.reward.resources)) {
        expect(resourceKeys.has(key), `${level.id} reward "${key}" is not a ResourceKey`).toBe(true);
      }
    }
  });

  test("every level has at least one objective and a positive move budget", () => {
    for (const level of FIBER_LEVELS as FiberLevel[]) {
      expect(level.objectives.length).toBeGreaterThan(0);
      expect(level.moves).toBeGreaterThan(0);
      expect(level.cols).toBeGreaterThanOrEqual(3);
      expect(level.rows).toBeGreaterThanOrEqual(3);
    }
  });
});
