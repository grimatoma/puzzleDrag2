// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  getCostEdits,
  setCostEdit,
  clearCostEdit,
  clearAllCostEdits,
  subscribeCostEdits,
} from "./costEditsStore.js";

beforeEach(() => {
  clearAllCostEdits();
  localStorage.clear();
});

describe("costEditsStore", () => {
  it("stages, reads back, and persists an edit", () => {
    setCostEdit("BUILDINGS.mill.cost.plank", 25);
    expect(getCostEdits()["BUILDINGS.mill.cost.plank"]).toBe(25);
    expect(JSON.parse(localStorage.getItem("hearth.wiki.costEdits")!)).toEqual({
      "BUILDINGS.mill.cost.plank": 25,
    });
  });

  it("ignores non-finite values", () => {
    setCostEdit("x.y", Number.NaN);
    expect(getCostEdits()).toEqual({});
  });

  it("notifies subscribers on change and clear", () => {
    let hits = 0;
    const unsub = subscribeCostEdits(() => {
      hits += 1;
    });
    setCostEdit("a.b", 1);
    setCostEdit("a.b", 2);
    clearCostEdit("a.b");
    unsub();
    setCostEdit("a.b", 3); // after unsubscribe — no further hit
    expect(hits).toBe(3);
  });

  it("returns a stable snapshot reference when unchanged", () => {
    setCostEdit("a.b", 1);
    const first = getCostEdits();
    setCostEdit("a.b", 1); // no-op
    expect(getCostEdits()).toBe(first);
  });

  it("clearAll empties the store and removes the storage key", () => {
    setCostEdit("a.b", 1);
    clearAllCostEdits();
    expect(getCostEdits()).toEqual({});
    expect(localStorage.getItem("hearth.wiki.costEdits")).toBeNull();
  });
});
