// Tests for the between-run macro policies (M2b).
//
// The headline result: the CEILING macro (build the bakery → craft bread → tier
// up) clears the documented home tier-0 `bread` stall and reaches Hamlet, while
// the FLOOR macro (greedy tier-up only) stays stuck at tier 0 — a real floor↔
// ceiling bracket on PROGRESSION, not just per-run economy. All progression is
// driven by genuine reducer actions (BUILD / CRAFTING/CRAFT_RECIPE / TIER_UP).

import { describe, it, expect } from "vitest";
import { createInitialState } from "../state.js";
import { runCampaign } from "./campaign.js";
import { floorMacro, climbMacro } from "./macro.js";

describe("macro policies — referential equality on a no-op", () => {
  it("floor and climb both return the same state ref when nothing is affordable", () => {
    const s = createInitialState(); // fresh home: tier 0, empty inventory
    expect(floorMacro(s, "home")).toBe(s);
    expect(climbMacro(s, "home")).toBe(s);
  });
});

describe("campaign macro bracket — climb clears the home tier-0 bread stall", () => {
  it("floor stalls at tier 0 on crafted bread; climb builds+crafts past it to Hamlet", () => {
    const floor = runCampaign({ zoneId: "home", runs: 60, seed: 1, policy: "climb", macro: "floor" });
    const climb = runCampaign({ zoneId: "home", runs: 60, seed: 1, policy: "climb", macro: "climb" });

    // Floor never builds the Bakery or crafts bread, so the Hamlet rung is
    // permanently blocked on `bread` — the documented stall.
    expect(floor.metrics.finalTier).toBe(0);
    expect(floor.metrics.tierStall?.missing.some((m) => m.key === "bread")).toBe(true);

    // Climb builds the Bakery and crafts bread from farm-produced flour+eggs, so
    // it clears the bread blocker and climbs at least to tier 1.
    expect(climb.metrics.finalTier).toBeGreaterThanOrEqual(1);
  });
});

describe("campaign macro — determinism", () => {
  it("climb macro is reproducible for a fixed seed", () => {
    const a = runCampaign({ zoneId: "home", runs: 16, seed: 2, macro: "climb" });
    const b = runCampaign({ zoneId: "home", runs: 16, seed: 2, macro: "climb" });
    expect(a.metrics).toEqual(b.metrics);
  });
});
