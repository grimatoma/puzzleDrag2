// Unit tests for the change-list write-back codemod (M1 keystone).
//
// Fixtures mimic the real declaration NAMES (ITEMS_DATA, BUILDINGS, RECIPES) so
// resolvePath finds them exactly as it will in src/constants.ts, but stay tiny so
// the byte-identical-neighbours assertions are easy to read.

import { describe, it, expect } from "vitest";
import { applyPatchToSource, targetFileForPath, filesForPatch } from "./applyPatch.js";

const FILE = "src/constants.ts";

const SRC = `// header comment — must survive untouched
const ITEMS_DATA = {
  pearls: { kind: "resource", label: "Pearls", value: 800 },
  pie: { kind: "resource", label: "Pie", value: 90 },
  ironframe: { kind: "resource", label: "Iron Frame", value: 275 },
};
export const ITEMS = { ...ITEMS_DATA, iron_frame: ITEMS_DATA.ironframe } as ItemRecord;
export const BUILDINGS = [
  { id: "hearth", cost: { coins: 0 } },
  { id: "mill", cost: { plank: 8, hay_bundle: 6 } },
];
export const RECIPES = {
  rec_bread: { item: "bread", station: "bakery", inputs: { flour: 3, eggs: 1 } },
};
`;

describe("applyPatch — routing", () => {
  it("routes known roots to constants.ts and rejects unknown roots", () => {
    expect(targetFileForPath("ITEMS.pearls.value")).toBe(FILE);
    expect(targetFileForPath("BUILDINGS.mill.cost.plank")).toBe(FILE);
    expect(targetFileForPath("RECIPES.rec_bread.inputs.flour")).toBe(FILE);
    expect(targetFileForPath("WHATEVER.x")).toBeNull();
    expect(filesForPatch([{ path: "ITEMS.pearls.value", to: 1 }, { path: "WHATEVER.x", to: 1 }])).toEqual([FILE]);
  });
});

describe("applyPatch — ITEMS.value", () => {
  it("rewrites only the targeted numeric literal", () => {
    const r = applyPatchToSource(FILE, SRC, [{ path: "ITEMS.pearls.value", to: 400 }]);
    expect(r.changed).toBe(true);
    expect(r.applied).toEqual([{ path: "ITEMS.pearls.value", from: 800, to: 400, start: expect.any(Number), end: expect.any(Number) }]);
    // The ONLY change is 800→400; every other byte (pie 90, ironframe 275, the
    // comment, formatting) is identical — proven by reconstructing the exact diff.
    expect(r.source).toBe(SRC.replace("value: 800", "value: 400"));
  });

  it("is idempotent: re-applying an already-satisfied edit is a no-op", () => {
    const once = applyPatchToSource(FILE, SRC, [{ path: "ITEMS.pearls.value", to: 400 }]).source;
    const twice = applyPatchToSource(FILE, once, [{ path: "ITEMS.pearls.value", to: 400 }]);
    expect(twice.changed).toBe(false);
    expect(twice.applied).toHaveLength(0);
    expect(twice.unchanged).toEqual([{ path: "ITEMS.pearls.value", value: 400 }]);
    expect(twice.source).toBe(once);
  });

  it("resolves the iron_frame → ironframe spread alias", () => {
    const r = applyPatchToSource(FILE, SRC, [{ path: "ITEMS.iron_frame.value", to: 300 }]);
    expect(r.changed).toBe(true);
    expect(r.source).toBe(SRC.replace('Iron Frame", value: 275', 'Iron Frame", value: 300'));
  });
});

describe("applyPatch — BUILDINGS array-by-id", () => {
  it("edits the cost inside the element whose id matches", () => {
    const r = applyPatchToSource(FILE, SRC, [{ path: "BUILDINGS.mill.cost.plank", to: 6 }]);
    expect(r.applied[0]).toMatchObject({ from: 8, to: 6 });
    expect(r.source).toBe(SRC.replace("plank: 8", "plank: 6"));
    // The hearth element's coins:0 is untouched.
    expect(r.source).toContain('{ id: "hearth", cost: { coins: 0 } }');
  });

  it("fails loudly for an unknown building id", () => {
    const r = applyPatchToSource(FILE, SRC, [{ path: "BUILDINGS.nope.cost.plank", to: 1 }]);
    expect(r.changed).toBe(false);
    expect(r.unresolved).toHaveLength(1);
    expect(r.unresolved[0].path).toBe("BUILDINGS.nope.cost.plank");
    expect(r.source).toBe(SRC);
  });
});

describe("applyPatch — RECIPES inputs", () => {
  it("edits a recipe input and treats to:0 as a literal 0 (remove-cost)", () => {
    const r = applyPatchToSource(FILE, SRC, [
      { path: "RECIPES.rec_bread.inputs.flour", to: 2 },
      { path: "RECIPES.rec_bread.inputs.eggs", to: 0 },
    ]);
    expect(r.applied).toHaveLength(2);
    expect(r.source).toBe(SRC.replace("flour: 3, eggs: 1", "flour: 2, eggs: 0"));
  });
});

describe("applyPatch — failure + multi-edit semantics", () => {
  it("reports an unresolved path and writes nothing for it", () => {
    const r = applyPatchToSource(FILE, SRC, [{ path: "ITEMS.ghost.value", to: 5 }]);
    expect(r.changed).toBe(false);
    expect(r.unresolved[0]).toMatchObject({ path: "ITEMS.ghost.value" });
    expect(r.source).toBe(SRC);
  });

  it("applies multiple edits to one file via descending-offset splice", () => {
    const r = applyPatchToSource(FILE, SRC, [
      { path: "ITEMS.pearls.value", to: 400 },
      { path: "ITEMS.pie.value", to: 50 },
    ]);
    expect(r.applied).toHaveLength(2);
    expect(r.source).toBe(SRC.replace("value: 800", "value: 400").replace("value: 90", "value: 50"));
  });

  it("partial patch: applies the good entry, flags the bad one, no half-writes", () => {
    const r = applyPatchToSource(FILE, SRC, [
      { path: "ITEMS.pearls.value", to: 400 },
      { path: "ITEMS.ghost.value", to: 5 },
    ]);
    expect(r.applied).toHaveLength(1);
    expect(r.unresolved).toHaveLength(1);
    expect(r.source).toBe(SRC.replace("value: 800", "value: 400"));
  });
});

const CARTO_FILE = "src/features/cartography/data.ts";
const CONST_MARKET = `const MARKET_PRICES = { pearls: { buy: 900, sell: 800 }, flour: { buy: 12, sell: 8 } };`;
const CARTO = `const TEMPERATE_FARM_TEMPLATE = { baseTurns: 10, foo: 1 };
export const MAP_NODES = [
  { id: "home", tiers: [
    { id: "outpost" },
    { id: "hamlet", upgradeCost: { resources: { plank: 8, bread: 6 } } },
  ] },
  { id: "meadow", tiers: [{ id: "outpost" }] },
];`;

describe("applyPatch — M5 reach (market, tier costs, session length)", () => {
  it("routes cartography roots to the cartography file, market to constants", () => {
    expect(targetFileForPath("MAP_NODES.home.tiers.hamlet.upgradeCost.resources.bread")).toBe(CARTO_FILE);
    expect(targetFileForPath("TEMPERATE_FARM_TEMPLATE.baseTurns")).toBe(CARTO_FILE);
    expect(targetFileForPath("MARKET_PRICES.pearls.sell")).toBe(FILE);
  });

  it("edits a MARKET_PRICES buy/sell value", () => {
    const r = applyPatchToSource(FILE, CONST_MARKET, [{ path: "MARKET_PRICES.pearls.sell", to: 100 }]);
    expect(r.applied[0]).toMatchObject({ from: 800, to: 100 });
    expect(r.source).toBe(CONST_MARKET.replace("sell: 800", "sell: 100"));
  });

  it("edits a nested MAP_NODES tier cost via id descent AT DEPTH", () => {
    const r = applyPatchToSource(CARTO_FILE, CARTO, [
      { path: "MAP_NODES.home.tiers.hamlet.upgradeCost.resources.bread", to: 3 },
    ]);
    expect(r.applied[0]).toMatchObject({ from: 6, to: 3 });
    expect(r.source).toBe(CARTO.replace("bread: 6", "bread: 3"));
  });

  it("edits a board-template baseTurns (shared session length)", () => {
    const r = applyPatchToSource(CARTO_FILE, CARTO, [{ path: "TEMPERATE_FARM_TEMPLATE.baseTurns", to: 12 }]);
    expect(r.source).toBe(CARTO.replace("baseTurns: 10", "baseTurns: 12"));
  });

  it("fails loud on a missing nested tier id — writes nothing", () => {
    const r = applyPatchToSource(CARTO_FILE, CARTO, [
      { path: "MAP_NODES.home.tiers.nope.upgradeCost.resources.bread", to: 3 },
    ]);
    expect(r.changed).toBe(false);
    expect(r.unresolved).toHaveLength(1);
    expect(r.source).toBe(CARTO);
  });
});
