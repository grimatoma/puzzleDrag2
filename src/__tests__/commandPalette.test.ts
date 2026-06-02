import { describe, it, expect } from "vitest";
import {
  buildCommandIndex, scoreEntry, searchCommandIndex,
} from "../balanceManager/commandPalette.js";
import { CONCEPTS } from "../balanceManager/wiki/concepts.js";

const CONCEPT_IDS = new Set(CONCEPTS.map((c) => c.id));

describe("buildCommandIndex", () => {
  it("returns a non-empty index covering the wiki catalogs", () => {
    const idx = buildCommandIndex();
    expect(idx.length).toBeGreaterThan(0);
    const kinds = new Set(idx.map((e) => e.kind));
    // Items are split per kind (tile/resource/tool); the rest are concept kinds.
    for (const k of ["tile", "resource", "tool", "recipe", "building", "zone", "npc", "worker", "boss"]) {
      expect(kinds.has(k)).toBe(true);
    }
  });

  it("emits ONLY tabs that are valid wiki concept ids", () => {
    const idx = buildCommandIndex();
    for (const e of idx) {
      expect(CONCEPT_IDS.has(e.tab)).toBe(true);
    }
  });

  it("never emits a non-concept tab (no items/biomes/keepers/story/flags tabs)", () => {
    const idx = buildCommandIndex();
    const tabs = new Set(idx.map((e) => e.tab));
    for (const bogus of ["items", "biomes", "keepers", "achievements", "story", "flags"]) {
      expect(tabs.has(bogus)).toBe(false);
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

  it("routes items to their per-kind concept tab (resource → resources, etc.)", () => {
    // Resolve a real resource/tile/tool key from the live concept maps so the
    // assertion tracks the catalog rather than a hardcoded id.
    const resourceKey = CONCEPTS.find((c) => c.id === "resources")!.getEntries()[0].key;
    const tileKey = CONCEPTS.find((c) => c.id === "tiles")!.getEntries()[0].key;
    const toolKey = CONCEPTS.find((c) => c.id === "tools")!.getEntries()[0].key;

    const idx = buildCommandIndex();
    expect(idx.find((e) => e.id === resourceKey)?.tab).toBe("resources");
    expect(idx.find((e) => e.id === tileKey)?.tab).toBe("tiles");
    expect(idx.find((e) => e.id === toolKey)?.tab).toBe("tools");
  });

  it("emits each item exactly once (no duplicate bogus 'tile' rows)", () => {
    const idx = buildCommandIndex();
    const itemKinds = new Set(["tile", "resource", "tool"]);
    const itemRows = idx.filter((e) => itemKinds.has(e.kind));
    const ids = itemRows.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("routes recipes/buildings/zones/npcs/workers/bosses to their concept tabs", () => {
    const idx = buildCommandIndex();
    const tabFor = (kind: string) => idx.find((e) => e.kind === kind)?.tab;
    expect(tabFor("recipe")).toBe("recipes");
    expect(tabFor("building")).toBe("buildings");
    expect(tabFor("zone")).toBe("zones");
    expect(tabFor("npc")).toBe("npcs");
    expect(tabFor("worker")).toBe("workers");
    expect(tabFor("boss")).toBe("bosses");
  });

  it("supports dependency injection (callers can pass synthetic catalogs)", () => {
    const idx = buildCommandIndex({
      items: {
        a_tile: { kind: "tile", label: "A Tile" },
        a_res: { kind: "resource", label: "A Resource" },
        a_tool: { kind: "tool", label: "A Tool", effect: "boom" },
        a_misc: { label: "Kindless — skipped" },
      },
      recipes: { test_recipe: { name: "Test Recipe", station: "anvil", coins: 7 } },
      buildings: [{ id: "test_b", name: "Test Building", level: 2, coins: 100 }],
      zones: { home: { name: "Home Vale" } },
      npcs: { wren: { name: "Wren" } },
      workers: [{ id: "test_w", name: "Test Worker" }],
      bosses: [{ id: "test_boss", name: "Test Boss", season: "Spring" }],
    });
    const byId = Object.fromEntries(idx.map((e) => [e.id, e]));
    expect(byId.a_tile.tab).toBe("tiles");
    expect(byId.a_res.tab).toBe("resources");
    expect(byId.a_tool.tab).toBe("tools");
    // The kindless item is skipped — no concept tab would render it.
    expect(byId.a_misc).toBeUndefined();
    expect(byId.test_recipe.tab).toBe("recipes");
    expect(byId.test_b.tab).toBe("buildings");
    expect(byId.home.tab).toBe("zones");
    expect(byId.wren.tab).toBe("npcs");
    expect(byId.test_w.tab).toBe("workers");
    expect(byId.test_boss.tab).toBe("bosses");
    // Every emitted tab is still a valid concept id.
    for (const e of idx) expect(CONCEPT_IDS.has(e.tab)).toBe(true);
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
    { id: "iron_ingot", kind: "resource", label: "Iron Ingot", sublabel: "resource · 5◉", keywords: [] },
  ];

  it("ranks better matches first", () => {
    const out = searchCommandIndex(idx, "iron");
    expect(out[0].id === "iron_hinge" || out[0].id === "iron_ingot").toBe(true);
    expect(out.map((e) => e.id)).not.toContain("bread");
  });

  it("returns at most `limit` entries", () => {
    const padded = [];
    for (let i = 0; i < 50; i += 1) padded.push({ id: `iron_${i}`, kind: "resource", label: `Iron ${i}`, sublabel: "" });
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
