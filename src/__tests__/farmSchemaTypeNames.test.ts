import { describe, it, expect } from "vitest";
import { z } from "zod";
import { describeSchema, typeString } from "../balanceManager/schemaDoc.js";
import {
  farmBoardInstanceSchema,
  farmBoardInstancePatchSchema,
  farmUpgradeMapSchema,
  farmSeasonDropsSchema,
} from "../config/schemas/boardInstance.js";
import { schemaTypeName } from "../config/schemas/schemaTypeName.js";

describe("farm board schema type names (wiki)", () => {
  it("farmUpgradeMapSchema renders as FarmUpgradeMap", () => {
    expect(typeString(farmUpgradeMapSchema)).toBe("FarmUpgradeMap");
  });

  it("farmSeasonDropsSchema renders as FarmSeasonDrops", () => {
    expect(typeString(farmSeasonDropsSchema)).toBe("FarmSeasonDrops");
  });

  it("farm board instance fields use aliases instead of inlined enums", () => {
    const doc = describeSchema(farmBoardInstanceSchema);
    const upgradeMap = doc.fields.find((f) => f.field === "upgradeMap");
    const seasonDrops = doc.fields.find((f) => f.field === "seasonDrops");
    expect(upgradeMap?.type).toBe("FarmUpgradeMap");
    expect(seasonDrops?.type).toBe("FarmSeasonDrops");
    expect(upgradeMap?.type).not.toContain("enum:");
    expect(seasonDrops?.type).not.toContain("enum:");
  });

  it("upgradeMap expands enum keys as optional FarmUpgradeTarget rows", () => {
    const doc = describeSchema(farmBoardInstanceSchema);
    const upgradeMap = doc.fields.find((f) => f.field === "upgradeMap");
    expect(upgradeMap?.children?.length).toBeGreaterThan(0);
    expect(upgradeMap?.children?.some((c) => c.field === "grass")).toBe(true);
    expect(upgradeMap?.children?.[0]?.type).toBe("FarmUpgradeTarget");
    expect(upgradeMap?.children?.[0]?.optional).toBe(true);
  });

  it("seasonDrops children use FarmSeasonDropRow per season", () => {
    const doc = describeSchema(farmBoardInstanceSchema);
    const seasonDrops = doc.fields.find((f) => f.field === "seasonDrops");
    expect(seasonDrops?.children?.every((c) => c.type === "FarmSeasonDropRow")).toBe(true);
    expect(seasonDrops?.children?.some((c) => c.field === "Spring")).toBe(true);
  });

  it("patch seasonDrops expands seasons with nested category rows", () => {
    const doc = describeSchema(farmBoardInstancePatchSchema);
    const seasonDrops = doc.fields.find((f) => f.field === "seasonDrops");
    expect(seasonDrops?.type).toBe("FarmSeasonDropsPatch");
    const spring = seasonDrops?.children?.find((c) => c.field === "Spring");
    expect(spring?.type).toBe("FarmSeasonDropRowPatch");
    expect(spring?.children?.some((c) => c.field === "trees")).toBe(true);
  });

  it("schemaTypeName on optional wrapper still resolves", () => {
    const named = schemaTypeName("ExampleId", z.string());
    const optional = named.optional();
    expect(typeString(optional)).toBe("ExampleId");
  });
});
