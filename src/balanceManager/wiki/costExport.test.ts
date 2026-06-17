import { describe, it, expect } from "vitest";
import { buildCostReport, collectChanges, renderJsonPatch } from "./costExport.js";
import { buildAllCostMatrices } from "./costMatrix.js";

describe("buildCostReport", () => {
  it("reports zero changes for empty overrides", () => {
    const report = buildCostReport({});
    expect(report.count).toBe(0);
    expect(report.changes).toEqual([]);
    expect(report.markdown).toMatch(/no pending changes/i);
  });

  it("collects a change across each matrix and renders from → to", () => {
    const overrides = {
      "BUILDINGS.mill.cost.plank": 25,
      "RECIPES.rec_drill.inputs.iron_bar": 3,
      "ITEMS.gemcrown.value": 300,
    };
    const report = buildCostReport(overrides);
    expect(report.count).toBe(3);

    const paths = report.changes.map((c) => c.path).sort();
    expect(paths).toEqual(
      ["BUILDINGS.mill.cost.plank", "ITEMS.gemcrown.value", "RECIPES.rec_drill.inputs.iron_bar"].sort(),
    );

    const plank = report.changes.find((c) => c.path === "BUILDINGS.mill.cost.plank")!;
    expect(plank.to).toBe(25);
    expect(plank.from).toBeGreaterThan(0);
    expect(plank.entityName).toBe("Mill");

    // Markdown groups by matrix and shows arrows.
    expect(report.markdown).toContain("## Buildings — BUILDINGS[*].cost");
    expect(report.markdown).toContain("## Tools — RECIPES[*].inputs (workshop)");
    expect(report.markdown).toContain("→ 25");

    // JSON patch round-trips to { path: value }.
    const patch = JSON.parse(report.json);
    expect(patch["BUILDINGS.mill.cost.plank"]).toBe(25);
    expect(patch["ITEMS.gemcrown.value"]).toBe(300);
    expect(patch["RECIPES.rec_drill.inputs.iron_bar"]).toBe(3);
  });

  it("ignores a no-op override (value equal to baseline)", () => {
    const baseline = buildAllCostMatrices()[0].rows.find((r) => r.id === "mill")!.cells.plank.original;
    const report = buildCostReport({ "BUILDINGS.mill.cost.plank": baseline });
    expect(report.count).toBe(0);
  });

  it("exports a value staged on a user-added column", () => {
    // gems is a currency no building natively costs — add it as a column, then
    // stage a value on the mill. It must surface as a regular change.
    const report = buildCostReport(
      { "BUILDINGS.mill.cost.gems": 4 },
      { buildings: ["gems"] },
    );
    const change = report.changes.find((c) => c.path === "BUILDINGS.mill.cost.gems");
    expect(change, "expected the added-column edit to be collected").toBeTruthy();
    expect(change!.from).toBe(0);
    expect(change!.to).toBe(4);
    expect(JSON.parse(report.json)["BUILDINGS.mill.cost.gems"]).toBe(4);
  });
});

describe("collectChanges / renderJsonPatch", () => {
  it("only emits cells flagged changed", () => {
    const matrices = buildAllCostMatrices({ "ITEMS.gemcrown.value": 999 });
    const changes = collectChanges(matrices);
    expect(changes).toHaveLength(1);
    expect(changes[0].path).toBe("ITEMS.gemcrown.value");
    expect(JSON.parse(renderJsonPatch(changes))).toEqual({ "ITEMS.gemcrown.value": 999 });
  });
});
