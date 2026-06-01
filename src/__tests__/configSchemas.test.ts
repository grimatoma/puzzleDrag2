import { describe, it, expect, vi } from "vitest";
import { ITEMS, RECIPES, BUILDINGS, isRecipeDefinition } from "../constants.js";
import { ABILITIES } from "../config/abilities.js";
import { TOOL_POWERS } from "../config/toolPowers.js";
import {
  itemEntrySchema,
  recipeDefinitionSchema,
  buildingDefinitionSchema,
  abilityCatalogEntrySchema,
  toolPowerCatalogEntrySchema,
  balanceSchema,
  parseBalanceOverrides,
  itemOverrideSchema,
  tuningSchema,
  _resetBalanceParseWarningsForTests,
} from "../config/schemas/index.js";

describe("configSchemas — canonical ITEMS", () => {
  it("every ITEMS row matches itemEntrySchema", () => {
    const failures: string[] = [];
    for (const [key, entry] of Object.entries(ITEMS)) {
      const result = itemEntrySchema.safeParse(entry);
      if (!result.success) {
        failures.push(`${key}: ${result.error.message}`);
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
});

describe("configSchemas — RECIPES and BUILDINGS", () => {
  it("every RECIPES row matches recipeDefinitionSchema", () => {
    for (const [key, recipe] of Object.entries(RECIPES)) {
      if (!isRecipeDefinition(recipe)) continue; // e.g. legacy RECIPES.tools nested map
      const result = recipeDefinitionSchema.safeParse(recipe);
      expect(result.success, key).toBe(true);
    }
  });

  it("every BUILDINGS row matches buildingDefinitionSchema", () => {
    for (const b of BUILDINGS) {
      const result = buildingDefinitionSchema.safeParse(b);
      expect(result.success, b.id).toBe(true);
    }
  });
});

describe("configSchemas — catalogs", () => {
  it("ABILITIES entries match abilityCatalogEntrySchema", () => {
    for (const a of ABILITIES) {
      expect(abilityCatalogEntrySchema.safeParse(a).success, a.id).toBe(true);
    }
  });

  it("TOOL_POWERS entries match toolPowerCatalogEntrySchema", () => {
    for (const p of TOOL_POWERS) {
      expect(toolPowerCatalogEntrySchema.safeParse(p).success, p.id).toBe(true);
    }
  });
});

describe("configSchemas — balance overrides", () => {
  it("accepts empty balance document", () => {
    expect(balanceSchema.safeParse({ version: 1, items: {}, tuning: {} }).success).toBe(true);
  });

  it("rejects unknown top-level keys", () => {
    expect(balanceSchema.safeParse({ version: 1, notASection: {} }).success).toBe(false);
  });

  it("itemOverrideSchema rejects patch fields not in allowlist", () => {
    expect(itemOverrideSchema.safeParse({ kind: "tile" }).success).toBe(false);
    expect(itemOverrideSchema.safeParse({ label: "X" }).success).toBe(true);
  });

  it("tuningSchema accepts fireHazardEnabled boolean", () => {
    expect(tuningSchema.safeParse({ fireHazardEnabled: true }).success).toBe(true);
  });
});

describe("parseBalanceOverrides", () => {
  it("returns parsed overrides for valid input", () => {
    const out = parseBalanceOverrides({
      version: 1,
      items: { bread: { label: "Loaf" } },
    });
    expect(out.items?.bread?.label).toBe("Loaf");
  });

  it("throws in DEV on invalid document", () => {
    const prev = import.meta.env.DEV;
    try {
      (import.meta.env as { DEV: boolean }).DEV = true;
      expect(() => parseBalanceOverrides({ version: 1, bogus: true })).toThrow(/Invalid balance/);
    } finally {
      (import.meta.env as { DEV: boolean }).DEV = prev;
    }
  });

  it("warn-once and returns {} in PROD on invalid document", () => {
    _resetBalanceParseWarningsForTests();
    const prevDev = import.meta.env.DEV;
    const prevProd = import.meta.env.PROD;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      (import.meta.env as { DEV: boolean }).DEV = false;
      (import.meta.env as { PROD: boolean }).PROD = true;
      const out = parseBalanceOverrides({ version: 1, bogus: true });
      expect(out).toEqual({ version: 1 });
      expect(warn).toHaveBeenCalled();
    } finally {
      (import.meta.env as { DEV: boolean }).DEV = prevDev;
      (import.meta.env as { PROD: boolean }).PROD = prevProd;
      warn.mockRestore();
    }
  });
});
