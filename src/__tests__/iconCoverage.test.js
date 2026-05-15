import { describe, it, expect } from "vitest";
import { auditIconCoverage, coverageRatio } from "../balanceManager/iconCoverage.js";

describe("auditIconCoverage", () => {
  it("matches via item id when no iconKey override exists", () => {
    const out = auditIconCoverage({
      items: { wood_log: { label: "Log" } },
      registry: { wood_log: {} },
    });
    expect(out.ok).toHaveLength(1);
    expect(out.ok[0].source).toBe("id");
    expect(out.missing).toEqual([]);
  });

  it("uses iconKey override when set, and reports source='iconKey'", () => {
    const out = auditIconCoverage({
      items: { wood_log: { label: "Log", iconKey: "custom_log" } },
      registry: { custom_log: {} },
    });
    expect(out.ok[0].source).toBe("iconKey");
  });

  it("flags items whose iconKey isn't in the registry", () => {
    const out = auditIconCoverage({
      items: { lonely: { label: "Lonely", iconKey: "missing_icon" } },
      registry: {},
    });
    expect(out.missing).toHaveLength(1);
    expect(out.missing[0].iconKey).toBe("missing_icon");
  });

  it("flags items with no override and no registry entry", () => {
    const out = auditIconCoverage({
      items: { uncovered: { label: "Uncovered" } },
      registry: {},
    });
    expect(out.missing[0].id).toBe("uncovered");
  });

  it("returns ok/missing sorted by id", () => {
    const out = auditIconCoverage({
      items: { z: {}, a: {}, m: {} },
      registry: { z: {}, a: {} },
    });
    expect(out.ok.map((r) => r.id)).toEqual(["a", "z"]);
    expect(out.missing.map((r) => r.id)).toEqual(["m"]);
  });

  it("runs against the live catalogs without crashing", () => {
    const out = auditIconCoverage();
    expect(typeof out.total).toBe("number");
    expect(out.total).toBeGreaterThan(0);
  });
});

describe("coverageRatio", () => {
  it("returns 1.0 for an empty audit (no items to cover)", () => {
    expect(coverageRatio({ ok: [], missing: [], total: 0 })).toBe(1);
  });
  it("returns 0.5 when half the items are covered", () => {
    expect(coverageRatio({ ok: [{}], missing: [{}], total: 2 })).toBe(0.5);
  });
});
