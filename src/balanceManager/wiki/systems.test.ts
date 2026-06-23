/**
 * systems.test.ts — registration coverage for the curated "Mechanics" concept
 * that fronts the Wiki's Systems hub.
 *
 * Uses the real SYSTEMS list + live CONCEPTS; no fakes.
 */

import { describe, it, expect } from "vitest";
import { CONCEPTS } from "./concepts.js";
import { getEntity } from "./conceptEntities.js";
import { SYSTEMS } from "./systems.js";

describe("systems concept — registration", () => {
  it("is registered with one non-empty entry per SYSTEMS def", () => {
    const concept = CONCEPTS.find((c) => c.id === "systems");
    expect(concept, "systems concept should be registered").toBeTruthy();
    const entries = concept!.getEntries();
    expect(entries.length).toBe(SYSTEMS.length);
    for (const e of entries) {
      expect(typeof e.key).toBe("string");
      expect(e.key.length).toBeGreaterThan(0);
      expect(typeof e.name).toBe("string");
      expect(e.name.length).toBeGreaterThan(0);
    }
  });

  it("sits before the trailing post-keeper concepts (newConcepts invariant)", () => {
    const ids = CONCEPTS.map((c) => c.id);
    // The four post-keeper concepts must remain the last four entries.
    expect(ids.slice(-4)).toEqual(["keepers", "boons", "dailyRewards", "achievements"]);
    expect(ids.indexOf("systems")).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf("systems")).toBeLessThan(ids.indexOf("keepers"));
  });

  it("getEntity resolves every system key (and rejects unknowns)", () => {
    for (const s of SYSTEMS) {
      const e = getEntity("systems", s.key);
      expect(e, `getEntity should resolve systems/${s.key}`).not.toBeNull();
      expect(e!.name).toBe(s.name);
    }
    expect(getEntity("systems", "no_such_system")).toBeNull();
  });

  it("entries are sorted by name (shared wiki-concepts sort invariant)", () => {
    const names = CONCEPTS.find((c) => c.id === "systems")!
      .getEntries()
      .map((e) => String(e.name).toLowerCase());
    expect(names).toEqual([...names].sort());
  });
});
