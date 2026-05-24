import { describe, it, expect } from "vitest";
import { CONCEPTS } from "../balanceManager/wiki/concepts.js";
import { ITEMS } from "../constants.js";

describe("Dev Panel Wiki — CONCEPTS", () => {
  it("exports a non-empty array of concepts with required fields", () => {
    expect(Array.isArray(CONCEPTS)).toBe(true);
    expect(CONCEPTS.length).toBeGreaterThan(0);
    for (const concept of CONCEPTS) {
      expect(typeof concept.id).toBe("string");
      expect(concept.id.length).toBeGreaterThan(0);
      expect(typeof concept.label).toBe("string");
      expect(concept.label.length).toBeGreaterThan(0);
      expect(typeof concept.getEntries).toBe("function");
    }
  });

  it("has unique concept ids", () => {
    const ids = CONCEPTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("getEntries returns a non-throwing array of well-formed entries for every concept", () => {
    for (const concept of CONCEPTS) {
      let entries;
      expect(() => { entries = concept.getEntries(); })
        .not.toThrow();
      expect(Array.isArray(entries)).toBe(true);
      for (const entry of entries) {
        expect(typeof entry.key).toBe("string");
        expect(entry.key.length).toBeGreaterThan(0);
        expect(typeof entry.name).toBe("string");
      }
    }
  });

  it("entries within each concept are sorted alphabetically by name (case-insensitive)", () => {
    for (const concept of CONCEPTS) {
      const entries = concept.getEntries();
      const names = entries.map((e) => String(e.name ?? "").toLowerCase());
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    }
  });

  it("tiles / resources / tools concepts only surface keys with the matching ITEMS kind", () => {
    const kindMap = { tiles: "tile", resources: "resource", tools: "tool" };
    for (const [conceptId, expectedKind] of Object.entries(kindMap)) {
      const concept = CONCEPTS.find((c) => c.id === conceptId);
      expect(concept, `concept ${conceptId} missing`).toBeTruthy();
      const entries = concept.getEntries();
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        const item = ITEMS[entry.key];
        expect(item, `ITEMS[${entry.key}] missing for ${conceptId}`).toBeTruthy();
        expect(item.kind).toBe(expectedKind);
      }
    }
  });

  it("no key appears under more than one of tiles / resources / tools", () => {
    const buckets = {
      tiles: new Set(CONCEPTS.find((c) => c.id === "tiles").getEntries().map((e) => e.key)),
      resources: new Set(CONCEPTS.find((c) => c.id === "resources").getEntries().map((e) => e.key)),
      tools: new Set(CONCEPTS.find((c) => c.id === "tools").getEntries().map((e) => e.key)),
    };
    const pairs = [
      ["tiles", "resources"],
      ["tiles", "tools"],
      ["resources", "tools"],
    ];
    for (const [a, b] of pairs) {
      for (const key of buckets[a]) {
        expect(buckets[b].has(key), `${key} appears in both ${a} and ${b}`).toBe(false);
      }
    }
  });
});
