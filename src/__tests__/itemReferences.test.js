import { describe, it, expect } from "vitest";
import {
  buildItemReferenceIndex,
  groupUsagesByKind,
  usagesFor,
  totalUsageCount,
} from "../balanceManager/itemReferences.js";

describe("buildItemReferenceIndex", () => {
  it("records recipe_input usages with qty + station", () => {
    const idx = buildItemReferenceIndex({
      items: { hay: {}, plank: {} },
      recipes: { rec_bread: { item: "bread", inputs: { hay: 2, plank: 1 }, station: "bakery" } },
      buildings: [],
      storyBeats: [],
      sideBeats: [],
    });
    const hay = idx.get("hay");
    expect(hay).toHaveLength(1);
    expect(hay[0]).toMatchObject({ kind: "recipe_input", recipeId: "rec_bread", qty: 2, station: "bakery" });
  });

  it("records recipe_output usages on the output item", () => {
    const idx = buildItemReferenceIndex({
      items: { bread: {} },
      recipes: { rec_bread: { item: "bread", inputs: {}, station: "bakery" } },
      buildings: [],
      storyBeats: [],
      sideBeats: [],
    });
    const bread = idx.get("bread");
    expect(bread).toHaveLength(1);
    expect(bread[0]).toMatchObject({ kind: "recipe_output", recipeId: "rec_bread", station: "bakery" });
  });

  it("records building_cost usages, skipping pure currency keys", () => {
    const idx = buildItemReferenceIndex({
      items: { plank: {} },
      recipes: {},
      buildings: [{ id: "mill", cost: { coins: 200, plank: 30, runes: 1 } }],
      storyBeats: [],
      sideBeats: [],
    });
    expect(idx.get("plank")?.[0]).toMatchObject({ kind: "building_cost", buildingId: "mill", qty: 30 });
    expect(idx.has("coins")).toBe(false);
    expect(idx.has("runes")).toBe(false);
  });

  it("records chain_next when an item .next-points at the target", () => {
    const idx = buildItemReferenceIndex({
      items: { log: { next: "plank" }, plank: { next: "beam" }, beam: { next: null } },
      recipes: {}, buildings: [], storyBeats: [], sideBeats: [],
    });
    expect(idx.get("plank")?.find((u) => u.kind === "chain_next")?.fromId).toBe("log");
    expect(idx.get("beam")?.find((u) => u.kind === "chain_next")?.fromId).toBe("plank");
  });

  it("records story_outcome usages from beat choice outcomes", () => {
    const idx = buildItemReferenceIndex({
      items: { wood_log: {} },
      recipes: {}, buildings: [],
      storyBeats: [{
        id: "b1", choices: [
          { id: "a", outcome: { resources: { wood_log: 5 } } },
          { id: "b", outcome: { resources: {} } },
        ],
      }],
      sideBeats: [],
    });
    const usages = idx.get("wood_log");
    expect(usages).toHaveLength(1);
    expect(usages[0]).toMatchObject({ kind: "story_outcome", beatId: "b1", choiceId: "a", qty: 5 });
  });

  it("returns an index for the real catalogs without crashing", () => {
    const idx = buildItemReferenceIndex();
    expect(idx.size).toBeGreaterThan(0);
    expect(idx.get("wood_log")?.length).toBeGreaterThan(0);
  });
});

describe("groupUsagesByKind", () => {
  it("returns one bucket per usage kind, preserving order within a bucket", () => {
    const usages = [
      { kind: "recipe_input", recipeId: "a" },
      { kind: "building_cost", buildingId: "x" },
      { kind: "recipe_input", recipeId: "b" },
    ];
    const groups = groupUsagesByKind(usages);
    expect([...groups.keys()].sort()).toEqual(["building_cost", "recipe_input"]);
    expect(groups.get("recipe_input").map((u) => u.recipeId)).toEqual(["a", "b"]);
  });
});

describe("usagesFor / totalUsageCount", () => {
  it("usagesFor accepts a precomputed index", () => {
    const idx = buildItemReferenceIndex({
      items: { x: {} },
      recipes: { r: { item: "x", inputs: { x: 1 }, station: "s" } },
      buildings: [], storyBeats: [], sideBeats: [],
    });
    expect(usagesFor("x", idx)).toHaveLength(2);
  });
  it("totalUsageCount returns 0 for missing items", () => {
    expect(totalUsageCount(undefined)).toBe(0);
    expect(totalUsageCount([])).toBe(0);
  });
});
