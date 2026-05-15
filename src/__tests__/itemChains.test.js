import { describe, it, expect } from "vitest";
import {
  findChainRoots,
  walkChain,
  computeItemChains,
  chainSourcesFor,
} from "../balanceManager/itemChains.js";

describe("findChainRoots", () => {
  it("returns ids whose .next is set but nothing points at them", () => {
    const items = {
      wood_log: { next: "wood_plank" },
      wood_plank: { next: "wood_beam" },
      wood_beam: { next: null },
      grass_hay: { next: null },
      grain: { next: null },
    };
    expect(findChainRoots(items)).toEqual(["wood_log"]);
  });

  it("treats a chain that converges on a shared terminal correctly", () => {
    const items = {
      veg_carrot: { next: "soup" },
      veg_beet: { next: "soup" },
      soup: { next: null },
    };
    // Both veggies are valid roots (neither is the target of another .next).
    expect(findChainRoots(items)).toEqual(["veg_beet", "veg_carrot"]);
  });

  it("skips self-referential pointers", () => {
    const items = { loop: { next: "loop" } };
    expect(findChainRoots(items)).toEqual([]);
  });
});

describe("walkChain", () => {
  it("emits the members in upgrade order, with threshold and value", () => {
    const items = {
      a: { label: "A", value: 1, next: "b" },
      b: { label: "B", value: 2, next: "c" },
      c: { label: "C", value: 5, next: null },
    };
    const thresholds = { a: 6, b: 5 };
    expect(walkChain("a", items, thresholds)).toEqual([
      { id: "a", label: "A", color: undefined, kind: undefined, biome: undefined, value: 1, threshold: 6, next: "b" },
      { id: "b", label: "B", color: undefined, kind: undefined, biome: undefined, value: 2, threshold: 5, next: "c" },
      { id: "c", label: "C", color: undefined, kind: undefined, biome: undefined, value: 5, threshold: 0, next: null },
    ]);
  });

  it("stops if a cycle is encountered", () => {
    const items = {
      a: { value: 1, next: "b" },
      b: { value: 2, next: "a" },
    };
    const chain = walkChain("a", items);
    expect(chain.map((m) => m.id)).toEqual(["a", "b"]);
  });
});

describe("computeItemChains", () => {
  it("returns chains sorted by depth (longest first)", () => {
    const items = {
      a: { value: 1, next: "b" },
      b: { value: 2, next: "c" },
      c: { value: 3, next: null },
      x: { value: 1, next: "y" },
      y: { value: 2, next: null },
    };
    const out = computeItemChains(items);
    expect(out.chains[0].rootId).toBe("a");
    expect(out.chains[1].rootId).toBe("x");
    expect(out.chains[0].depth).toBe(3);
    expect(out.chains[1].depth).toBe(2);
  });

  it("totals chain value across members", () => {
    const items = {
      a: { value: 1, next: "b" },
      b: { value: 2, next: "c" },
      c: { value: 4, next: null },
    };
    expect(computeItemChains(items).chains[0].totalValue).toBe(7);
  });

  it("counts branched targets (target with ≥2 incoming pointers)", () => {
    const items = {
      veg_carrot: { value: 4, next: "soup" },
      veg_beet:   { value: 4, next: "soup" },
      soup:       { value: 6, next: null },
    };
    expect(computeItemChains(items).branchedCount).toBe(1);
  });

  it("counts orphans (no .next and no incoming)", () => {
    const items = {
      a: { value: 1, next: "b" },
      b: { value: 2, next: null },
      lonely: { value: 1, next: null },
    };
    expect(computeItemChains(items).orphanCount).toBe(1);
  });
});

describe("chainSourcesFor", () => {
  it("lists every item whose .next points at the target", () => {
    const items = {
      veg_carrot: { next: "soup" },
      veg_beet:   { next: "soup" },
      veg_turnip: { next: "soup" },
      soup:       { next: null },
    };
    expect(chainSourcesFor("soup", items)).toEqual(["veg_beet", "veg_carrot", "veg_turnip"]);
  });
});
