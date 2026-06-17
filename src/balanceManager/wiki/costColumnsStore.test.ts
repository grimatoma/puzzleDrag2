// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getCostColumns,
  addCostColumn,
  removeCostColumn,
  clearAllCostColumns,
} from "./costColumnsStore.js";

beforeEach(() => clearAllCostColumns());
afterEach(() => clearAllCostColumns());

describe("costColumnsStore", () => {
  it("adds columns per matrix without duplicates", () => {
    addCostColumn("buildings", "gems");
    addCostColumn("buildings", "gems"); // no-op
    addCostColumn("buildings", "runes");
    addCostColumn("tools", "plank");

    expect(getCostColumns().buildings).toEqual(["gems", "runes"]);
    expect(getCostColumns().tools).toEqual(["plank"]);
  });

  it("removes a column and drops the matrix key once empty", () => {
    addCostColumn("buildings", "gems");
    removeCostColumn("buildings", "gems");
    expect("buildings" in getCostColumns()).toBe(false);
  });

  it("ignores empty keys and removing absent columns", () => {
    addCostColumn("buildings", "");
    removeCostColumn("buildings", "nope");
    expect(getCostColumns()).toEqual({});
  });

  it("persists to localStorage and clears it when emptied", () => {
    addCostColumn("resources", "coins");
    expect(localStorage.getItem("hearth.wiki.costColumns")).toContain("coins");
    clearAllCostColumns();
    expect(localStorage.getItem("hearth.wiki.costColumns")).toBeNull();
  });
});
