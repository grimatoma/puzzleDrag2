/**
 * QA Batch 2 — Fix 7: canonical achievements list from features/achievements/data.js
 */
import { describe, it, expect } from "vitest";
import { ACHIEVEMENTS } from "../src/features/achievements/data.js";

describe("Fix 7 — canonical ACHIEVEMENTS list shape", () => {
  it("has at least 12 entries (fish-biome PR added 3 more)", () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(12);
  });

  it("every achievement has id, name, desc, counter, threshold", () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.id, `${a.id} missing id`).toBeTruthy();
      expect(a.name, `${a.id} missing name`).toBeTruthy();
      expect(a.desc, `${a.id} missing desc`).toBeTruthy();
      expect(a.counter, `${a.id} missing counter`).toBeTruthy();
      expect(a.threshold, `${a.id} missing threshold`).toBeGreaterThan(0);
    }
  });

  it("first_steps has threshold 1 and counter chains_committed", () => {
    const a = ACHIEVEMENTS.find((x) => x.id === "first_steps");
    expect(a).toBeDefined();
    expect(a.threshold).toBe(1);
    expect(a.counter).toBe("chains_committed");
    expect(a.name).toBe("First Steps");
    expect(typeof a.desc).toBe("string");
    expect(a.desc.length).toBeGreaterThan(0);
  });

  it("champion has desc string", () => {
    const a = ACHIEVEMENTS.find((x) => x.id === "champion");
    expect(a).toBeDefined();
    expect(typeof a.desc).toBe("string");
    expect(a.desc.length).toBeGreaterThan(0);
  });

  it("all counters are one of the known counter keys", () => {
    const valid = new Set([
      "chains_committed", "orders_fulfilled", "bosses_defeated",
      "festival_won", "distinct_resources_chained", "distinct_buildings_built",
      "supplies_converted",
      // Fish biome counter — credits fish_* chain harvests.
      "fish_chained",
      "mine_chained",
      "veg_chained", "fruit_chained", "flower_chained", "herd_chained",
      "cattle_chained", "mount_chained", "tree_chained", "bird_chained",
      // Unified abilities pipeline (Phase: configurable abilities) —
      // achievements that fire from the building/worker/tile aggregator.
      "abilities_triggered", "building_abilities_triggered",
      "distinct_abilities_triggered", "season_end_building_bonus",
    ]);
    for (const a of ACHIEVEMENTS) {
      expect(valid.has(a.counter), `${a.id} has unknown counter: ${a.counter}`).toBe(true);
    }
  });
});
