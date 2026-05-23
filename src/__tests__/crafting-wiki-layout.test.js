import { describe, it, expect } from "vitest";
import { buildGraph, NODE_W, NODE_H } from "../../src/features/wiki/graphLayout.js";

const COL_STRIDE = 180;
const labelFn = (key) => key;

const simpleRecipes = {
  rec_a: { item: "a", station: "forge", inputs: { raw1: 2, raw2: 1 } },
  rec_b: { item: "b", station: "bakery", inputs: { raw1: 1 } },
};

const multiTierRecipes = {
  rec_mid: { item: "mid", station: "forge", inputs: { raw: 1 } },
  rec_top: { item: "top", station: "bakery", inputs: { mid: 3 } },
};

describe("buildGraph", () => {
  it("includes all unique input and output keys as nodes", () => {
    const { nodes } = buildGraph(simpleRecipes, labelFn);
    const keys = new Set(nodes.map((n) => n.key));
    expect(keys.has("a")).toBe(true);
    expect(keys.has("b")).toBe(true);
    expect(keys.has("raw1")).toBe(true);
    expect(keys.has("raw2")).toBe(true);
    expect(nodes.length).toBe(4);
  });

  it("keys that never appear as recipe.item get rank 0", () => {
    const { nodes } = buildGraph(simpleRecipes, labelFn);
    const raw1 = nodes.find((n) => n.key === "raw1");
    const raw2 = nodes.find((n) => n.key === "raw2");
    expect(raw1.rank).toBe(0);
    expect(raw2.rank).toBe(0);
  });

  it("crafted outputs get rank >= 1", () => {
    const { nodes } = buildGraph(simpleRecipes, labelFn);
    const a = nodes.find((n) => n.key === "a");
    const b = nodes.find((n) => n.key === "b");
    expect(a.rank).toBeGreaterThanOrEqual(1);
    expect(b.rank).toBeGreaterThanOrEqual(1);
  });

  it("multi-tier: output of a recipe that uses a crafted item gets rank 2", () => {
    const { nodes } = buildGraph(multiTierRecipes, labelFn);
    const raw = nodes.find((n) => n.key === "raw");
    const mid = nodes.find((n) => n.key === "mid");
    const top = nodes.find((n) => n.key === "top");
    expect(raw.rank).toBe(0);
    expect(mid.rank).toBe(1);
    expect(top.rank).toBe(2);
  });

  it("nodes within the same rank are sorted alphabetically by label", () => {
    const recipes = {
      rec_z: { item: "z", station: "forge", inputs: { raw: 1 } },
      rec_a: { item: "a", station: "forge", inputs: { raw: 1 } },
      rec_m: { item: "m", station: "forge", inputs: { raw: 1 } },
    };
    const { nodes } = buildGraph(recipes, labelFn);
    const rank1 = nodes.filter((n) => n.rank === 1).map((n) => n.key);
    expect(rank1).toEqual(["a", "m", "z"]);
  });

  it("edges have correct fromKey, toKey, qty, station", () => {
    const { edges } = buildGraph(simpleRecipes, labelFn);
    const edge = edges.find((e) => e.fromKey === "raw1" && e.toKey === "a");
    expect(edge).toBeDefined();
    expect(edge.qty).toBe(2);
    expect(edge.station).toBe("forge");
  });

  it("totalW equals (maxRank + 1) * COL_STRIDE", () => {
    const { totalW } = buildGraph(multiTierRecipes, labelFn);
    expect(totalW).toBe((2 + 1) * COL_STRIDE);
  });

  it("exports NODE_W and NODE_H", () => {
    expect(NODE_W).toBe(120);
    expect(NODE_H).toBe(72);
  });
});
