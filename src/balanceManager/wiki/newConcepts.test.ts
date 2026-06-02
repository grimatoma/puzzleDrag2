/**
 * newConcepts.test.ts — registration coverage for the keepers, boons,
 * dailyRewards, and achievements wiki concepts (PR4-Task1).
 *
 * Uses real data from the live maps; no fakes.
 */

import { describe, it, expect } from "vitest";
import { CONCEPTS } from "./concepts.js";
import { getEntity, conceptForKey } from "./conceptEntities.js";

const NEW_IDS = ["keepers", "boons", "dailyRewards", "achievements"] as const;

describe("new wiki concepts — registration", () => {
  it("CONCEPTS includes the four new ids, each with non-empty entries", () => {
    for (const id of NEW_IDS) {
      const concept = CONCEPTS.find((c) => c.id === id);
      expect(concept, `concept ${id} should be registered`).toBeTruthy();
      const entries = concept!.getEntries();
      expect(entries.length, `concept ${id} should have entries`).toBeGreaterThan(0);
      for (const e of entries) {
        expect(typeof e.key).toBe("string");
        expect(e.key.length).toBeGreaterThan(0);
        expect(typeof e.name).toBe("string");
        expect(e.name.length).toBeGreaterThan(0);
      }
    }
  });

  it("appends the new concepts at the END of the array", () => {
    const ids = CONCEPTS.map((c) => c.id);
    const lastFour = ids.slice(-4);
    expect(lastFour).toEqual([...NEW_IDS]);
  });

  it("dailyRewardEntries is sorted numerically (Day 2 before Day 10)", () => {
    const concept = CONCEPTS.find((c) => c.id === "dailyRewards")!;
    const entries = concept.getEntries();
    const day2 = entries.findIndex((e) => e.key === "2");
    const day10 = entries.findIndex((e) => e.key === "10");
    expect(day2).toBeGreaterThanOrEqual(0);
    expect(day10).toBeGreaterThanOrEqual(0);
    expect(day2).toBeLessThan(day10);
    // The full sequence of numeric keys must be ascending.
    const nums = entries.map((e) => Number(e.key));
    const sorted = [...nums].sort((a, b) => a - b);
    expect(nums).toEqual(sorted);
  });

  it("daily reward entry names read 'Day N'", () => {
    const concept = CONCEPTS.find((c) => c.id === "dailyRewards")!;
    const first = concept.getEntries()[0];
    expect(first.name).toMatch(/^Day \d+$/);
  });
});

describe("new wiki concepts — getEntity", () => {
  it("resolves a keeper by id", () => {
    const e = getEntity("keepers", "deer_spirit");
    expect(e).not.toBeNull();
    expect(e!.id).toBe("deer_spirit");
    expect(e!.name).toBe("The Deer-Spirit");
    expect(getEntity("keepers", "nope")).toBeNull();
  });

  it("resolves a boon by id", () => {
    const e = getEntity("boons", "deer_blessing");
    expect(e).not.toBeNull();
    expect(e!.id).toBe("deer_blessing");
    expect(e!.name).toBe("Deer-Blessing");
    expect(getEntity("boons", "nope")).toBeNull();
  });

  it("resolves a daily reward by day string and includes the day", () => {
    const e = getEntity("dailyRewards", "7");
    expect(e).not.toBeNull();
    expect(e!.day).toBe(7);
    // Day 7 grants coins + a shuffle tool in the live config.
    expect(e!.coins).toBe(150);
    expect(getEntity("dailyRewards", "999")).toBeNull();
    expect(getEntity("dailyRewards", "abc")).toBeNull();
  });

  it("resolves an achievement by id", () => {
    const e = getEntity("achievements", "first_steps");
    expect(e).not.toBeNull();
    expect(e!.id).toBe("first_steps");
    expect(e!.icon).toBe("ach_first_steps");
    expect(getEntity("achievements", "nope")).toBeNull();
  });

  it("the new keys resolve back to their own concept via conceptForKey", () => {
    expect(conceptForKey("deer_spirit")).toBe("keepers");
    expect(conceptForKey("deer_blessing")).toBe("boons");
    expect(conceptForKey("first_steps")).toBe("achievements");
  });
});
