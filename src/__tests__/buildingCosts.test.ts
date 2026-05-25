import { describe, it, expect } from "vitest";
import { analyseBuildingCosts } from "../balanceManager/buildingCosts.js";

describe("analyseBuildingCosts", () => {
  it("sums per-resource totals across the building list", () => {
    const out = analyseBuildingCosts({
      buildings: [
        { id: "a", name: "A", lv: 1, cost: { coins: 100, plank: 5, stone: 2 } },
        { id: "b", name: "B", lv: 2, cost: { coins: 50, plank: 3 } },
      ],
      items: { plank: { label: "Plank" }, stone: { label: "Stone" } },
    });
    const plank = out.perResource.find((r) => r.key === "plank");
    const stone = out.perResource.find((r) => r.key === "stone");
    expect(plank.qty).toBe(8);
    expect(plank.usedBy).toEqual(["a", "b"]);
    expect(plank.label).toBe("Plank");
    expect(stone.qty).toBe(2);
    expect(stone.usedBy).toEqual(["a"]);
  });

  it("buckets currencies (coins / runes / embers / coreIngots / gems) into totals", () => {
    const out = analyseBuildingCosts({
      buildings: [
        { id: "a", lv: 1, cost: { coins: 100, runes: 1, gems: 2 } },
        { id: "b", lv: 2, cost: { coins: 50, embers: 3 } },
      ],
      items: {},
    });
    expect(out.totals.coins).toBe(150);
    expect(out.totals.runes).toBe(1);
    expect(out.totals.embers).toBe(3);
    expect(out.totals.gems).toBe(2);
    expect(out.totals.coreIngots).toBe(0);
    expect(out.perResource).toEqual([]);
  });

  it("sorts perBuilding by level then id", () => {
    const out = analyseBuildingCosts({
      buildings: [
        { id: "z", lv: 3, cost: {} },
        { id: "b", lv: 1, cost: {} },
        { id: "a", lv: 1, cost: {} },
      ],
      items: {},
    });
    expect(out.perBuilding.map((p) => p.id)).toEqual(["a", "b", "z"]);
  });

  it("sorts perResource by qty descending then key", () => {
    const out = analyseBuildingCosts({
      buildings: [
        { id: "a", lv: 1, cost: { plank: 1, stone: 5, dirt: 5 } },
        { id: "b", lv: 1, cost: { plank: 1 } },
      ],
      items: {},
    });
    expect(out.perResource.map((r) => r.key)).toEqual(["dirt", "stone", "plank"]);
  });

  it("ignores zero / negative / non-finite cost values", () => {
    const out = analyseBuildingCosts({
      buildings: [{ id: "a", lv: 1, cost: { plank: 0, stone: -1, dirt: "abc", real: 5 } }],
      items: {},
    });
    expect(out.perResource).toHaveLength(1);
    expect(out.perResource[0].key).toBe("real");
  });

  it("returns the default catalog without crashing", () => {
    const out = analyseBuildingCosts();
    expect(out.perBuilding.length).toBeGreaterThan(0);
    expect(out.perResource.length).toBeGreaterThan(0);
    expect(out.totals.coins).toBeGreaterThan(0);
  });
});
