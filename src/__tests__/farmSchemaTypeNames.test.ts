import { describe, it, expect } from "vitest";
import { z } from "zod";
import { describeSchema, typeString } from "../balanceManager/schemaDoc.js";
import {
  farmBoardInstanceSchema,
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

  it("seasonDrops children use FarmSeasonDropRow per season", () => {
    const doc = describeSchema(farmBoardInstanceSchema);
    const seasonDrops = doc.fields.find((f) => f.field === "seasonDrops");
    expect(seasonDrops?.children?.every((c) => c.type === "FarmSeasonDropRow")).toBe(true);
  });

  it("schemaTypeName on optional wrapper still resolves", () => {
    const named = schemaTypeName("ExampleId", z.string());
    const optional = named.optional();
    expect(typeString(optional)).toBe("ExampleId");
  });
});
