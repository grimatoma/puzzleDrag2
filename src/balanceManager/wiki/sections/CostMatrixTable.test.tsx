// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { CostMatrixTable } from "./CostMatrixTable.jsx";
import { buildBuildingCostMatrix } from "../costMatrix.js";
import { getCostEdits, clearAllCostEdits } from "../costEditsStore.js";

beforeEach(() => clearAllCostEdits());
afterEach(() => {
  cleanup();
  clearAllCostEdits();
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
});
