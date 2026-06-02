import { describe, it, expect } from "vitest";
import { CONCEPTS } from "./concepts.js";
import { WIKI_SECTIONS, NARRATIVE_PAGES, UTILITIES } from "./wikiNav.js";

describe("WIKI_SECTIONS concept coverage", () => {
  const allIds = WIKI_SECTIONS.flatMap((s) => s.conceptIds);

  it("has no duplicate concept ids across sections", () => {
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("covers every concept exactly once", () => {
    const conceptSet = new Set(CONCEPTS.map((c) => c.id));
    for (const id of allIds) {
      expect(conceptSet.has(id), `"${id}" in WIKI_SECTIONS is not a real concept id`).toBe(true);
    }
    for (const c of CONCEPTS) {
      expect(allIds.includes(c.id), `concept "${c.id}" is missing from WIKI_SECTIONS`).toBe(true);
    }
  });
});

describe("NARRATIVE_PAGES", () => {
  it("is non-empty", () => {
    expect(NARRATIVE_PAGES.length).toBeGreaterThan(0);
  });

  it("includes overview", () => {
    expect(NARRATIVE_PAGES.some((p) => p.slug === "overview")).toBe(true);
  });
});

describe("UTILITIES", () => {
  it("includes icons", () => {
    expect(UTILITIES.some((u) => u.id === "icons")).toBe(true);
  });

  it("includes animationsDemo", () => {
    expect(UTILITIES.some((u) => u.id === "animationsDemo")).toBe(true);
  });
});
