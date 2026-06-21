import { describe, it, expect } from "vitest";
import {
  progressionPoints,
  cumulativeThrough,
  childrenOf,
  effectKey,
} from "./cumulative.js";
import { ZONES } from "../../features/zones/data.js";

describe("progression cumulative engine", () => {
  it("orders prerequisites before the gates that require them", () => {
    const ids = progressionPoints().map((p) => p.id);
    // Open the Mine requires the Kitchen (a child of Arrive); the Kitchen must
    // therefore precede it in the flattened spine.
    expect(ids).toContain("build_kitchen");
    expect(ids).toContain("open_mine");
    expect(ids.indexOf("build_kitchen")).toBeLessThan(ids.indexOf("open_mine"));
    // Each milestone is immediately followed by its own children.
    expect(ids.indexOf("found_quarry")).toBeLessThan(ids.indexOf("build_workshop"));
  });

  it("returns null for an unknown point", () => {
    expect(cumulativeThrough("nope")).toBeNull();
  });

  it("accumulates monotonically — later points are supersets of earlier ones", () => {
    const points = progressionPoints().map((p) => p.id);
    const seenKeys = new Set<string>();
    for (const id of points) {
      const state = cumulativeThrough(id);
      expect(state).not.toBeNull();
      const keys = new Set(
        state!.unlocked.flatMap((b) => b.effects.map(effectKey)),
      );
      // Everything seen at an earlier point is still present here.
      for (const k of seenKeys) expect(keys.has(k)).toBe(true);
      for (const k of keys) seenKeys.add(k);
    }
  });

  it("reads zone entry costs live from ZONES", () => {
    const atQuarry = cumulativeThrough("found_quarry");
    expect(atQuarry).not.toBeNull();
    const zones = atQuarry!.costs.zoneEntry.map((z) => z.zone);
    expect(zones).toContain("home");
    expect(zones).toContain("quarry");
    for (const entry of atQuarry!.costs.zoneEntry) {
      const expected = (ZONES[entry.zone]?.entryCost as { coins?: number })?.coins ?? 0;
      expect(entry.coins).toBe(expected);
    }
    expect(atQuarry!.costs.runningCoins).toBe(
      atQuarry!.costs.zoneEntry.reduce((s, z) => s + z.coins, 0),
    );
  });

  it("surfaces the home tier ladder once home is founded", () => {
    const atHome = cumulativeThrough("arrive_home");
    expect(atHome).not.toBeNull();
    const homeLadder = atHome!.costs.tierLadders.find((l) => l.zone === "home");
    expect(homeLadder).toBeDefined();
    expect(homeLadder!.tiers.length).toBeGreaterThan(0);
  });

  it("childrenOf returns only non-milestone triggers that require the id", () => {
    for (const child of childrenOf("arrive_home")) {
      expect(child.milestone).not.toBe(true);
      expect(child.requires ?? []).toContain("arrive_home");
    }
  });
});
