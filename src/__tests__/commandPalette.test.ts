import { describe, it, expect } from "vitest";
import {
  buildCommandIndex, scoreEntry, searchCommandIndex,
} from "../balanceManager/commandPalette.js";

describe("buildCommandIndex", () => {
  it("returns a non-empty index covering all major catalogs", () => {
    const idx = buildCommandIndex();
    expect(idx.length).toBeGreaterThan(0);
    const kinds = new Set(idx.map((e) => e.kind));
    for (const k of ["tile", "item", "recipe", "building", "biome", "zone", "npc", "worker", "boss", "achievement", "beat", "flag"]) {
      expect(kinds.has(k)).toBe(true);
    }
  });

  it("each entry carries the four required fields", () => {
    const idx = buildCommandIndex();
    for (const e of idx.slice(0, 50)) {
      expect(typeof e.id).toBe("string");
      expect(typeof e.kind).toBe("string");
      expect(typeof e.label).toBe("string");
      expect(typeof e.tab).toBe("string");
    }
  });

  it("routes story beats to the story tab and flags to the flags tab", () => {
    const idx = buildCommandIndex();
    const beat = idx.find((e) => e.kind === "beat");
    const flag = idx.find((e) => e.kind === "flag");
    expect(beat.tab).toBe("story");
    expect(flag.tab).toBe("flags");
  });

  it("supports dependency injection (callers can pass synthetic catalogs)", () => {
    const idx = buildCommandIndex({
      items: { test_item: { label: "Test Item", effect: "boom" } },
      recipes: { test_recipe: { name: "Test Recipe", station: "anvil", coins: 7 } },
      buildings: [{ id: "test_b", label: "Test Building", level: 2, coins: 100 }],
      biomes: { home: { name: "Home" } },
      zones: { home: { name: "Home Vale" } },
      npcs: { wren: { name: "Wren" } },
      keepers: {},
      workers: [{ id: "test_w", label: "Test Worker" }],
      bosses: [{ id: "test_boss", name: "Test Boss", season: "Spring" }],
      achievements: [{ id: "test_ach", name: "Test Ach" }],
      storyBeats: [{ id: "test_beat", title: "Test Beat", act: 1, scene: "x" }],
      sideBeats: [],
      flags: [{ id: "test_flag", label: "Test Flag", category: "story" }],
    });
    const kinds = new Set(idx.map((e) => e.kind));
    expect(kinds).toEqual(new Set(["tile", "item", "recipe", "building", "biome", "zone", "npc", "worker", "boss", "achievement", "beat", "flag"]));
  });
});

describe("scoreEntry", () => {
  const entry = { id: "iron_hinge", kind: "recipe", label: "Iron Hinge",
    sublabel: "recipe · forge · 30◉", keywords: ["iron_hinge", "Iron Hinge", "forge"] };

  it("returns 0 for an empty query", () => {
    expect(scoreEntry(entry, "")).toBe(0);
    expect(scoreEntry(entry, "   ")).toBe(0);
  });

  it("returns 0 when any query token has no match anywhere", () => {
    expect(scoreEntry(entry, "iron banana")).toBe(0);
  });

  it("scores an exact label match higher than a prefix match", () => {
    expect(scoreEntry(entry, "iron hinge")).toBeGreaterThan(scoreEntry(entry, "iron"));
  });

  it("scores a prefix match higher than a substring match", () => {
    expect(scoreEntry(entry, "iron")).toBeGreaterThan(scoreEntry(entry, "hinge"));
  });

  it("scores a kind match when query is the kind name", () => {
    expect(scoreEntry(entry, "recipe")).toBeGreaterThan(0);
  });
});

describe("searchCommandIndex", () => {
  const idx = [
    { id: "iron_hinge", kind: "recipe", label: "Iron Hinge", sublabel: "recipe · forge", keywords: ["forge"] },
    { id: "bread", kind: "recipe", label: "Bread", sublabel: "recipe · bakery", keywords: [] },
    { id: "iron_ingot", kind: "item", label: "Iron Ingot", sublabel: "item · 5◉", keywords: [] },
  ];

  it("ranks better matches first", () => {
    const out = searchCommandIndex(idx, "iron");
    expect(out[0].id === "iron_hinge" || out[0].id === "iron_ingot").toBe(true);
    expect(out.map((e) => e.id)).not.toContain("bread");
  });

  it("returns at most `limit` entries", () => {
    const padded = [];
    for (let i = 0; i < 50; i += 1) padded.push({ id: `iron_${i}`, kind: "item", label: `Iron ${i}`, sublabel: "" });
    const out = searchCommandIndex(padded, "iron", 5);
    expect(out).toHaveLength(5);
  });

  it("returns an empty array for an empty or null query", () => {
    expect(searchCommandIndex(idx, "")).toEqual([]);
    expect(searchCommandIndex(idx, null)).toEqual([]);
  });

  it("requires every token to match (AND semantics)", () => {
    const out = searchCommandIndex(idx, "iron forge");
    expect(out.map((e) => e.id)).toEqual(["iron_hinge"]);
  });

  it("returns an empty array when the query matches no entries", () => {
    expect(searchCommandIndex(idx, "nothing-here-xyz")).toEqual([]);
  });
});
