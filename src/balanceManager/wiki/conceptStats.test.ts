/**
 * conceptStats.test.ts — Unit tests for conceptHeadlineStats helper.
 *
 * Uses real data from live config (no mocks). Validates:
 *  - The helper always returns at least one stat (the entry count).
 *  - Concept-specific extras are derived correctly.
 *  - The helper never throws, even for concepts with no extras.
 */

import { describe, it, expect } from "vitest";
import { conceptHeadlineStats } from "./conceptStats.js";
import { CONCEPTS } from "./concepts.js";
import type { WikiEntry } from "./EntryGrid.jsx";

// ─── helpers ──────────────────────────────────────────────────────────────────

function entries(conceptId: string): WikiEntry[] {
  const concept = CONCEPTS.find((c) => c.id === conceptId);
  if (!concept) throw new Error(`Unknown concept: ${conceptId}`);
  return concept.getEntries() as unknown as WikiEntry[];
}

// ─── tiles ────────────────────────────────────────────────────────────────────

describe("conceptHeadlineStats — tiles", () => {
  it("returns at least two stats (species + biomes)", () => {
    const stats = conceptHeadlineStats("tiles", entries("tiles"));
    expect(stats.length).toBeGreaterThanOrEqual(2);
  });

  it("first stat uses 'species' label", () => {
    const stats = conceptHeadlineStats("tiles", entries("tiles"));
    expect(stats[0].label).toBe("species");
  });

  it("first stat value matches live entry count", () => {
    const e = entries("tiles");
    const stats = conceptHeadlineStats("tiles", e);
    expect(stats[0].value).toBe(e.length);
  });

  it("second stat is 'biomes' with a positive count", () => {
    const stats = conceptHeadlineStats("tiles", entries("tiles"));
    const biomeStat = stats.find((s) => s.label === "biomes");
    expect(biomeStat).toBeDefined();
    expect(Number(biomeStat!.value)).toBeGreaterThan(0);
  });

  it("biomes count is between 1 and 3 (farm, mine, fish)", () => {
    const stats = conceptHeadlineStats("tiles", entries("tiles"));
    const biomeStat = stats.find((s) => s.label === "biomes");
    expect(Number(biomeStat!.value)).toBeGreaterThanOrEqual(1);
    expect(Number(biomeStat!.value)).toBeLessThanOrEqual(3);
  });
});

// ─── recipes ──────────────────────────────────────────────────────────────────

describe("conceptHeadlineStats — recipes", () => {
  it("returns at least two stats (entries + stations)", () => {
    const stats = conceptHeadlineStats("recipes", entries("recipes"));
    expect(stats.length).toBeGreaterThanOrEqual(2);
  });

  it("first stat uses 'entries' label", () => {
    const stats = conceptHeadlineStats("recipes", entries("recipes"));
    expect(stats[0].label).toBe("entries");
  });

  it("second stat is 'stations' with a positive count", () => {
    const stats = conceptHeadlineStats("recipes", entries("recipes"));
    const stationStat = stats.find((s) => s.label === "stations");
    expect(stationStat).toBeDefined();
    expect(Number(stationStat!.value)).toBeGreaterThan(0);
  });
});

// ─── buildings ────────────────────────────────────────────────────────────────

describe("conceptHeadlineStats — buildings", () => {
  it("returns at least two stats (entries + recipes)", () => {
    const stats = conceptHeadlineStats("buildings", entries("buildings"));
    expect(stats.length).toBeGreaterThanOrEqual(2);
  });

  it("second stat is 'recipes' with a positive count", () => {
    const stats = conceptHeadlineStats("buildings", entries("buildings"));
    const recipesStat = stats.find((s) => s.label === "recipes");
    expect(recipesStat).toBeDefined();
    expect(Number(recipesStat!.value)).toBeGreaterThan(0);
  });
});

// ─── safety: unknown / count-only concepts ────────────────────────────────────

describe("conceptHeadlineStats — fallback (no concept-specific extras)", () => {
  it("never throws for hazards", () => {
    expect(() => conceptHeadlineStats("hazards", entries("hazards"))).not.toThrow();
  });

  it("returns at least one stat for hazards (entry count)", () => {
    const stats = conceptHeadlineStats("hazards", entries("hazards"));
    expect(stats.length).toBeGreaterThanOrEqual(1);
    expect(stats[0].label).toBe("entries");
  });

  it("never throws for npcs", () => {
    expect(() => conceptHeadlineStats("npcs", entries("npcs"))).not.toThrow();
  });

  it("returns correct count for bosses", () => {
    const e = entries("bosses");
    const stats = conceptHeadlineStats("bosses", e);
    expect(stats[0].value).toBe(e.length);
    expect(stats[0].label).toBe("entries");
  });

  it("never throws for an unknown conceptId", () => {
    expect(() => conceptHeadlineStats("__unknown__", [])).not.toThrow();
    const stats = conceptHeadlineStats("__unknown__", []);
    expect(stats[0].value).toBe(0);
  });
});
