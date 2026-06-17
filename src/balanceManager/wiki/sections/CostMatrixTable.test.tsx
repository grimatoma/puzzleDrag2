// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { CostMatrixTable } from "./CostMatrixTable.jsx";
import { buildBuildingCostMatrix } from "../costMatrix.js";
import { getCostEdits, setCostEdit, clearAllCostEdits } from "../costEditsStore.js";
import { getCostColumns, addCostColumn, clearAllCostColumns } from "../costColumnsStore.js";

function reset() {
  clearAllCostEdits();
  clearAllCostColumns();
}

beforeEach(reset);
afterEach(() => {
  cleanup();
  reset();
});

describe("CostMatrixTable", () => {
  it("renders row names and editable number inputs in editable mode", () => {
    const { container, getByText } = render(
      <CostMatrixTable matrix={buildBuildingCostMatrix()} editable />,
    );
    expect(getByText("Mill")).toBeTruthy();
    const inputs = container.querySelectorAll("input");
    expect(inputs.length).toBeGreaterThan(0);
  });

  it("renders static numbers (no inputs) in read-only mode", () => {
    const { container } = render(
      <CostMatrixTable matrix={buildBuildingCostMatrix()} editable={false} />,
    );
    expect(container.querySelectorAll("input").length).toBe(0);
  });

  it("stages an edit into the store when a cell changes", () => {
    const { container } = render(
      <CostMatrixTable matrix={buildBuildingCostMatrix()} editable />,
    );
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="BUILDINGS.mill.cost.plank"]',
    );
    expect(input).toBeTruthy();
    fireEvent.change(input!, { target: { value: "12" } });
    expect(getCostEdits()["BUILDINGS.mill.cost.plank"]).toBe(12);
  });

  it("clears the edit when the cell is emptied", () => {
    const { container } = render(
      <CostMatrixTable matrix={buildBuildingCostMatrix()} editable />,
    );
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="BUILDINGS.mill.cost.plank"]',
    );
    fireEvent.change(input!, { target: { value: "12" } });
    expect(getCostEdits()["BUILDINGS.mill.cost.plank"]).toBe(12);
    fireEvent.change(input!, { target: { value: "" } });
    expect("BUILDINGS.mill.cost.plank" in getCostEdits()).toBe(false);
  });

  it("renders an inline building SVG glyph for building rows", () => {
    const { container } = render(
      <CostMatrixTable matrix={buildBuildingCostMatrix()} editable={false} />,
    );
    expect(container.querySelector(".wiki-cost-rowhead__glyph svg")).toBeTruthy();
  });

  it("shows the add-column picker only in editable mode", () => {
    const ro = render(<CostMatrixTable matrix={buildBuildingCostMatrix()} editable={false} />);
    expect(ro.container.querySelector(".wiki-cost-addcol")).toBeNull();
    cleanup();
    const ed = render(<CostMatrixTable matrix={buildBuildingCostMatrix()} editable />);
    expect(ed.container.querySelector(".wiki-cost-addcol")).toBeTruthy();
  });

  it("stages a new column into the columns store when one is picked", () => {
    const { container } = render(<CostMatrixTable matrix={buildBuildingCostMatrix()} editable />);
    const select = container.querySelector<HTMLSelectElement>(".wiki-cost-addcol")!;
    const opt = select.querySelector<HTMLOptionElement>("optgroup option")!;
    expect(opt).toBeTruthy();
    fireEvent.change(select, { target: { value: opt.value } });
    expect(getCostColumns().buildings ?? []).toContain(opt.value);
  });

  it("removes a user-added column and clears any edit staged on it", () => {
    addCostColumn("buildings", "gems");
    setCostEdit("BUILDINGS.mill.cost.gems", 3);
    const matrix = buildBuildingCostMatrix(getCostEdits(), getCostColumns().buildings);
    const { container } = render(<CostMatrixTable matrix={matrix} editable />);

    const btn = container.querySelector<HTMLButtonElement>(
      ".wiki-cost-th--extra .wiki-cost-colremove",
    )!;
    expect(btn).toBeTruthy();
    fireEvent.click(btn);

    expect(getCostColumns().buildings ?? []).not.toContain("gems");
    expect("BUILDINGS.mill.cost.gems" in getCostEdits()).toBe(false);
  });
});
