import { describe, it, expect } from "vitest";
import { describeSchema } from "../balanceManager/schemaDoc.js";
import { zoneOverrideSchema } from "../config/schemas/zone.js";

describe("zone schema type names (wiki)", () => {
  it("buildings field renders as BuildingId[]", () => {
    const doc = describeSchema(zoneOverrideSchema);
    const buildings = doc.fields.find((f) => f.field === "buildings");
    expect(buildings?.type).toBe("BuildingId[]");
    expect(buildings?.type).not.toContain("enum:");
  });
});
