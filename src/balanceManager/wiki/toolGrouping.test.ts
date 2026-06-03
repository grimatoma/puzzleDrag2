/**
 * toolGrouping.test.ts — unit suite for the pure tool-grouping helper.
 *
 * Uses real tool ids from the tool registry plus one bogus key, and asserts:
 *  - band order is all → farm → mine → fish
 *  - tools land under the correct band (per src/ui/toolRegistry.ts mappings)
 *  - empty bands are skipped
 *  - input/entry order is preserved within a band
 *  - the unknown key falls into the "all" band so nothing disappears
 */

import { describe, it, expect } from "vitest";
import { groupToolEntries, type ToolBoardKindGroup } from "./toolGrouping.js";
import type { WikiEntry } from "./EntryGrid.jsx";

function entry(key: string): WikiEntry {
  return { key, name: key };
}

function findKind(groups: ToolBoardKindGroup[], boardKind: string) {
  return groups.find((g) => g.boardKind === boardKind);
}

describe("groupToolEntries", () => {
  const entries: WikiEntry[] = [
    entry("shuffle"), // all (board-agnostic)
    entry("axe"), // farm
    entry("rake"), // farm
    entry("stone_hammer"), // mine
    entry("drill"), // mine
    entry("not_a_tool"), // unknown → all
  ];

  it("orders bands all → farm → mine (fish absent when empty)", () => {
    const groups = groupToolEntries(entries);
    expect(groups.map((g) => g.boardKind)).toEqual(["all", "farm", "mine"]);
  });

  it("places board-agnostic tools under All boards", () => {
    const all = findKind(groupToolEntries(entries), "all");
    expect(all).toBeDefined();
    expect(all!.entries.map((e) => e.key)).toContain("shuffle");
  });

  it("places farm tools under Farm board", () => {
    const farm = findKind(groupToolEntries(entries), "farm");
    expect(farm).toBeDefined();
    const keys = farm!.entries.map((e) => e.key);
    expect(keys).toContain("axe");
    expect(keys).toContain("rake");
  });

  it("places mine tools under Mine board", () => {
    const mine = findKind(groupToolEntries(entries), "mine");
    expect(mine).toBeDefined();
    const keys = mine!.entries.map((e) => e.key);
    expect(keys).toContain("stone_hammer");
    expect(keys).toContain("drill");
  });

  it("places the unknown key under All boards", () => {
    const all = findKind(groupToolEntries(entries), "all");
    expect(all!.entries.map((e) => e.key)).toContain("not_a_tool");
  });

  it("skips empty bands", () => {
    // Only a farm tool → only the Farm band should appear.
    const groups = groupToolEntries([entry("axe")]);
    expect(groups.map((g) => g.boardKind)).toEqual(["farm"]);
  });

  it("preserves entry order within a band", () => {
    const farm = findKind(groupToolEntries(entries), "farm");
    expect(farm!.entries.map((e) => e.key)).toEqual(["axe", "rake"]);
  });

  it("attaches the band label and icon", () => {
    const farm = findKind(groupToolEntries(entries), "farm");
    expect(farm!.label).toBe("Farm board");
    expect(farm!.icon).toBe("🌾");
  });

  it("returns an empty array for empty input", () => {
    expect(groupToolEntries([])).toEqual([]);
  });
});
