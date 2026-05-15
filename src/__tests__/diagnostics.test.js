import { describe, it, expect } from "vitest";
import { runDiagnostics, DIAGNOSTIC_SECTIONS } from "../balanceManager/diagnostics.js";
import { emptyDraft } from "../storyEditor/shared.jsx";

describe("runDiagnostics", () => {
  it("returns one section per known audit id", () => {
    const out = runDiagnostics(emptyDraft());
    expect(out.sections.map((s) => s.id).sort()).toEqual([...DIAGNOSTIC_SECTIONS].sort());
  });

  it("every section carries a status + summary string", () => {
    const out = runDiagnostics(emptyDraft());
    for (const s of out.sections) {
      expect(["ok", "warn", "error"]).toContain(s.status);
      expect(typeof s.summary).toBe("string");
      expect(typeof s.label).toBe("string");
    }
  });

  it("worstStatus is the highest-priority status across all sections", () => {
    const out = runDiagnostics(emptyDraft());
    expect(["ok", "warn", "error"]).toContain(out.worstStatus);
    // worstStatus is at least as bad as every individual status.
    const order = { ok: 0, warn: 1, error: 2 };
    for (const s of out.sections) {
      expect(order[out.worstStatus]).toBeGreaterThanOrEqual(order[s.status]);
    }
  });

  it("doesn't crash when given a totally empty draft", () => {
    expect(() => runDiagnostics({})).not.toThrow();
  });

  it("doesn't crash when given null", () => {
    expect(() => runDiagnostics(null)).not.toThrow();
  });
});
