import { describe, it, expect } from "vitest";
import {
  TOOL_POWERS,
  TOOL_POWER_PARAM_TYPES,
  DEFERRED_TOOL_POWERS,
  defaultsForToolPower,
  getToolPower,
} from "../config/toolPowers.js";
import { tilesInCategory } from "../utils.js";

describe("tilesInCategory", () => {
  it("returns every tile_* key whose family matches a single category", () => {
    const trees = tilesInCategory("trees");
    // Every tree tier currently in ITEMS should appear; baseline asserts the
    // canonical tier (tile_tree_oak) is present so we don't false-pass on an
    // accidentally empty array.
    expect(trees).toContain("tile_tree_oak");
    expect(trees.length).toBeGreaterThan(0);
    // Sanity: every result starts with `tile_tree_` (the family prefix).
    for (const k of trees) {
      expect(k.startsWith("tile_tree_")).toBe(true);
    }
  });

  it("accepts an array of categories and returns the union without duplicates", () => {
    const grass = tilesInCategory("grass");
    const grain = tilesInCategory("grain");
    const both = tilesInCategory(["grass", "grain"]);
    // Every element from both inputs is present in the union.
    for (const k of grass) expect(both).toContain(k);
    for (const k of grain) expect(both).toContain(k);
    // No duplicates.
    expect(both.length).toBe(new Set(both).size);
    // Union size equals the sum of disjoint single-category sets.
    expect(both.length).toBe(grass.length + grain.length);
  });

  it("returns [] for an unknown category and does not throw", () => {
    expect(() => tilesInCategory("nonexistent_category")).not.toThrow();
    expect(tilesInCategory("nonexistent_category")).toEqual([]);
  });

  it("resolves the dirt category via the special_dirt synthetic family", () => {
    // `tile_special_dirt` has no entry in TILE_FAMILY_RESOURCE — the helper
    // must still surface it under the `dirt` category.
    expect(tilesInCategory("dirt")).toContain("tile_special_dirt");
  });
});

describe("TOOL_POWERS catalog shape", () => {
  it("every entry has id, name, desc, and params (note is optional)", () => {
    for (const p of TOOL_POWERS) {
      expect(typeof p.id).toBe("string");
      expect(p.id.length).toBeGreaterThan(0);
      expect(typeof p.name).toBe("string");
      expect(typeof p.desc).toBe("string");
      expect(Array.isArray(p.params)).toBe(true);
      if (p.note !== undefined) expect(typeof p.note).toBe("string");
      // Every param has key/label/type.
      for (const param of p.params) {
        expect(typeof param.key).toBe("string");
        expect(typeof param.label).toBe("string");
        expect(typeof param.type).toBe("string");
      }
    }
  });

  it("ids are unique", () => {
    const ids = TOOL_POWERS.map((p) => p.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("exposes the tileCategory param type in TOOL_POWER_PARAM_TYPES", () => {
    expect(TOOL_POWER_PARAM_TYPES.TILE_CATEGORY).toBe("tileCategory");
  });

  it("getToolPower returns the entry by id, or null for unknowns", () => {
    expect(getToolPower("clear_category")).not.toBeNull();
    expect(getToolPower("clear_category").id).toBe("clear_category");
    expect(getToolPower("definitely_not_a_power")).toBeNull();
  });
});

describe("defaultsForToolPower", () => {
  it("returns { target: \"\" } for clear_all — tileKey defaults to \"\" so ItemsTab's cleanup pass strips empty targets", () => {
    expect(defaultsForToolPower("clear_all")).toEqual({ target: "" });
  });

  it("returns { target: null } for clear_category — tileCategory uses null as the 'unset' sentinel", () => {
    expect(defaultsForToolPower("clear_category")).toEqual({ target: null });
  });

  it("returns { from: null, to: \"\", radius: 1 } for transform_adjacent", () => {
    expect(defaultsForToolPower("transform_adjacent")).toEqual({
      from: null,
      to: "",
      radius: 1,
    });
  });

  it("returns { amount: 5 } for restore_turns", () => {
    expect(defaultsForToolPower("restore_turns")).toEqual({ amount: 5 });
  });

  it("returns { from: null, to: \"\" } for transform_tiles", () => {
    expect(defaultsForToolPower("transform_tiles")).toEqual({
      from: null,
      to: "",
    });
  });

  it("returns { radius: 1 } for area_blast", () => {
    expect(defaultsForToolPower("area_blast")).toEqual({ radius: 1 });
  });

  it("returns {} for an unknown power id", () => {
    expect(defaultsForToolPower("unknown_id")).toEqual({});
  });

  it("returns {} for powers with no params (tap_clear_type, undo_move)", () => {
    expect(defaultsForToolPower("tap_clear_type")).toEqual({});
    expect(defaultsForToolPower("undo_move")).toEqual({});
  });
});

describe("DEFERRED_TOOL_POWERS", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(DEFERRED_TOOL_POWERS)).toBe(true);
    expect(DEFERRED_TOOL_POWERS.length).toBeGreaterThan(0);
  });

  it("every entry has { id, pc2Name, intendedPower, blocker, dependsOn }", () => {
    for (const d of DEFERRED_TOOL_POWERS) {
      expect(typeof d.id).toBe("string");
      expect(d.id.length).toBeGreaterThan(0);
      expect(typeof d.pc2Name).toBe("string");
      expect(typeof d.intendedPower).toBe("string");
      expect(typeof d.blocker).toBe("string");
      expect(typeof d.dependsOn).toBe("string");
    }
  });

  it("ids are unique", () => {
    const ids = DEFERRED_TOOL_POWERS.map((d) => d.id);
    expect(ids.length).toBe(new Set(ids).size);
  });
});
