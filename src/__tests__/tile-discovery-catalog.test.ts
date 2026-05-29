import { describe, it, expect } from "vitest";
import {
  TILE_DISCOVERY_METHODS,
  TILE_DISCOVERY_METHOD_BY_ID,
  getTileDiscoveryMethod,
  defaultsForTileDiscoveryMethod,
} from "../config/tileDiscoveryMethods.js";
import { TILE_TYPES } from "../features/tileCollection/data.js";

describe("tileDiscoveryMethods catalog", () => {
  it("exposes the expected methods", () => {
    const ids = TILE_DISCOVERY_METHODS.map((m) => m.id).sort();
    expect(ids).toEqual(["building", "buy", "chain", "daily", "default", "research"]);
  });

  it("every entry has id, name, desc, params array", () => {
    for (const m of TILE_DISCOVERY_METHODS) {
      expect(typeof m.id).toBe("string");
      expect(typeof m.name).toBe("string");
      expect(typeof m.desc).toBe("string");
      expect(Array.isArray(m.params)).toBe(true);
    }
  });

  it("TILE_DISCOVERY_METHOD_BY_ID is keyed by id", () => {
    for (const m of TILE_DISCOVERY_METHODS) {
      expect(TILE_DISCOVERY_METHOD_BY_ID[m.id]).toBe(m);
    }
  });

  it("getTileDiscoveryMethod returns entry or null", () => {
    expect(getTileDiscoveryMethod("chain")?.id).toBe("chain");
    expect(getTileDiscoveryMethod("nope")).toBeNull();
  });

  it("defaultsForTileDiscoveryMethod returns object with all param keys", () => {
    const d = defaultsForTileDiscoveryMethod("chain");
    expect(d).toEqual({ chainLengthOf: "", chainLength: 6 });
    expect(defaultsForTileDiscoveryMethod("default")).toEqual({});
    expect(defaultsForTileDiscoveryMethod("nope")).toEqual({});
  });
});

describe("tileDiscoveryMethods drift vs TILE_TYPES", () => {
  it("every tile's discovery.method exists in the catalog", () => {
    const bad = [];
    for (const t of TILE_TYPES) {
      const method = t.discovery?.method;
      if (!method) continue;
      if (!TILE_DISCOVERY_METHOD_BY_ID[method]) {
        bad.push(`${t.id} uses unknown method "${method}"`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("every tile's discovery param keys appear in that method's schema", () => {
    const bad = [];
    for (const t of TILE_TYPES) {
      const d = t.discovery;
      if (!d?.method) continue;
      const schema = TILE_DISCOVERY_METHOD_BY_ID[d.method];
      if (!schema) continue;
      const allowed = new Set(["method", ...schema.params.map((p) => p.key)]);
      for (const key of Object.keys(d)) {
        if (!allowed.has(key)) {
          bad.push(`${t.id} has stray "${key}" not in method "${d.method}" schema`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
