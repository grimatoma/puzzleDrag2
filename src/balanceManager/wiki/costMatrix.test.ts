import { describe, it, expect } from "vitest";
import {
  buildBuildingCostMatrix,
  buildToolCostMatrix,
  buildResourceCostMatrix,
  buildCostMatrix,
  buildAllCostMatrices,
  costColumnOptions,
  VALUE_COL,
} from "./costMatrix.js";
import type { CostMatrix } from "./costMatrix.js";

/** First pickable resource/currency key not already a column of `matrix`. */
function firstUnusedColumnKey(matrix: CostMatrix): string {
  const opt = costColumnOptions(matrix.columns.map((c) => c.key)).flatMap((g) => g.options)[0];
  expect(opt, "expected at least one pickable column option").toBeTruthy();
  return opt!.key;
}

function row(matrix: CostMatrix, id: string) {
  const r = matrix.rows.find((x) => x.id === id);
  expect(r, `expected a "${id}" row in the ${matrix.id} matrix`).toBeTruthy();
  return r!;
}

describe("buildBuildingCostMatrix", () => {
  it("exposes coins + material columns and a cell per column on every row", () => {
    const m = buildBuildingCostMatrix();
    expect(m.id).toBe("buildings");
    expect(m.rows.length).toBeGreaterThan(0);
    const colKeys = m.columns.map((c) => c.key);
    expect(colKeys).toContain("coins");
    expect(colKeys).toContain("plank");
    for (const r of m.rows) {
      for (const c of m.columns) expect(r.cells[c.key], `${r.id}.${c.key}`).toBeTruthy();
    }
  });

  it("sorts coins first among the currency columns", () => {
    const m = buildBuildingCostMatrix();
    expect(m.columns[0].key).toBe("coins");
  });

  it("reads the baseline cost from BUILDINGS (mill needs plank)", () => {
    const mill = row(buildBuildingCostMatrix(), "mill");
    expect(mill.cells.plank.original).toBeGreaterThan(0);
    expect(mill.cells.plank.editPath).toBe("BUILDINGS.mill.cost.plank");
    expect(mill.cells.plank.editable).toBe(true);
  });

  it("overlays an override and flags the changed cell", () => {
    const base = row(buildBuildingCostMatrix(), "mill").cells.plank.original;
    const m = buildBuildingCostMatrix({ "BUILDINGS.mill.cost.plank": base + 5 });
    const cell = row(m, "mill").cells.plank;
    expect(cell.value).toBe(base + 5);
    expect(cell.original).toBe(base);
    expect(cell.changed).toBe(true);
  });

  it("treats an override equal to the baseline as unchanged (no-op)", () => {
    const base = row(buildBuildingCostMatrix(), "mill").cells.plank.original;
    const m = buildBuildingCostMatrix({ "BUILDINGS.mill.cost.plank": base });
    expect(row(m, "mill").cells.plank.changed).toBe(false);
  });
});

describe("buildToolCostMatrix", () => {
  it("includes craftable tools with their workshop recipe inputs", () => {
    const m = buildToolCostMatrix();
    expect(m.id).toBe("tools");
    const drill = row(m, "drill");
    expect(drill.cells.iron_bar.original).toBe(2);
    expect(drill.cells.iron_bar.editPath).toBe("RECIPES.rec_drill.inputs.iron_bar");
    expect(drill.cells.iron_bar.editable).toBe(true);
  });
});

describe("buildResourceCostMatrix", () => {
  it("puts the synthetic value column first and reads ITEMS.value", () => {
    const m = buildResourceCostMatrix();
    expect(m.id).toBe("resources");
    expect(m.columns[0].key).toBe(VALUE_COL);
    const crown = row(m, "gemcrown");
    expect(crown.cells[VALUE_COL].original).toBe(325);
    expect(crown.cells[VALUE_COL].editPath).toBe("ITEMS.gemcrown.value");
    expect(crown.cells[VALUE_COL].editable).toBe(true);
  });

  it("reads recipe inputs for crafted resources", () => {
    const crown = row(buildResourceCostMatrix(), "gemcrown");
    expect(crown.cells.gold_bar.original).toBe(2);
    expect(crown.cells.gold_bar.editPath).toBe("RECIPES.rec_gemcrown.inputs.gold_bar");
    expect(crown.group).toMatch(/^Crafted/);
  });

  it("marks input cells of un-craftable raw resources as non-editable", () => {
    const m = buildResourceCostMatrix();
    const raw = m.rows.find((r) => r.group === "Raw / chain-sourced");
    expect(raw, "expected at least one raw resource row").toBeTruthy();
    // Value stays editable; recipe-input columns are inert for a raw resource.
    expect(raw!.cells[VALUE_COL].editable).toBe(true);
    const inputCol = m.columns.find((c) => c.key !== VALUE_COL)!;
    expect(raw!.cells[inputCol.key].editable).toBe(false);
    expect(raw!.cells[inputCol.key].editPath).toBe("");
  });
});

describe("extra (user-added) columns", () => {
  it("appends an editable column for a resource no building natively costs", () => {
    const base = buildBuildingCostMatrix();
    const key = firstUnusedColumnKey(base);

    const m = buildBuildingCostMatrix({}, [key]);
    const col = m.columns.find((c) => c.key === key);
    expect(col, `expected an added "${key}" column`).toBeTruthy();
    expect(col!.extra).toBe(true);

    const mill = row(m, "mill");
    const cell = mill.cells[key];
    expect(cell.editable).toBe(true);
    expect(cell.original).toBe(0);
    expect(cell.editPath).toBe(`BUILDINGS.mill.cost.${key}`);
  });

  it("does not flag a natural column as extra", () => {
    const m = buildBuildingCostMatrix({}, ["coins"]); // coins is already natural
    expect(m.columns.find((c) => c.key === "coins")!.extra).toBeFalsy();
  });

  it("threads added columns through tools and resources", () => {
    const toolKey = firstUnusedColumnKey(buildToolCostMatrix());
    const tools = buildToolCostMatrix({}, [toolKey]);
    const drill = row(tools, "drill");
    expect(drill.cells[toolKey].editable).toBe(true);
    expect(drill.cells[toolKey].editPath).toBe(`RECIPES.rec_drill.inputs.${toolKey}`);

    const resKey = firstUnusedColumnKey(buildResourceCostMatrix());
    const resources = buildResourceCostMatrix({}, [resKey]);
    expect(resources.columns.find((c) => c.key === resKey)!.extra).toBe(true);
  });

  it("ignores an added column already present in the catalog", () => {
    const before = buildBuildingCostMatrix();
    const after = buildBuildingCostMatrix({}, ["plank"]); // plank already a column
    expect(after.columns.length).toBe(before.columns.length);
  });
});

describe("costColumnOptions", () => {
  it("groups currencies + resources and excludes keys already present", () => {
    const groups = costColumnOptions([]);
    expect(groups.map((g) => g.group)).toContain("Currencies");
    expect(groups.map((g) => g.group)).toContain("Resources");

    // Excluding coins drops it from the currency group.
    const withoutCoins = costColumnOptions(["coins"]).flatMap((g) => g.options).map((o) => o.key);
    expect(withoutCoins).not.toContain("coins");
    expect(costColumnOptions([]).flatMap((g) => g.options).map((o) => o.key)).toContain("coins");
  });
});

describe("buildCostMatrix / buildAllCostMatrices", () => {
  it("dispatches by id", () => {
    expect(buildCostMatrix("buildings").id).toBe("buildings");
    expect(buildCostMatrix("tools").id).toBe("tools");
    expect(buildCostMatrix("resources").id).toBe("resources");
  });

  it("builds all three with one override set", () => {
    const all = buildAllCostMatrices();
    expect(all.map((m) => m.id)).toEqual(["buildings", "tools", "resources"]);
  });

  it("applies a per-matrix extra-columns map", () => {
    // Pick a key unused by BOTH buildings and tools so the per-matrix isolation
    // assertion can't be confounded by a shared natural column.
    const used = [...buildBuildingCostMatrix().columns, ...buildToolCostMatrix().columns].map((c) => c.key);
    const key = costColumnOptions(used).flatMap((g) => g.options)[0].key;

    const [buildings, tools] = buildAllCostMatrices({}, { buildings: [key] });
    expect(buildings.columns.some((c) => c.key === key && c.extra)).toBe(true);
    // The map is per-matrix — tools should be untouched.
    expect(tools.columns.some((c) => c.key === key)).toBe(false);
  });
});
