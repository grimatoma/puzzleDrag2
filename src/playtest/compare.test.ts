// Tests for the policy-bracket comparison harness (M2d).

import { describe, it, expect } from "vitest";
import { runComparison, DEFAULT_BRACKET } from "./compare.js";

describe("policy bracket comparison", () => {
  it("surfaces a progression spread: floor stays at tier 0, ceiling climbs higher", () => {
    const { rows } = runComparison({ zoneId: "home", runs: 60, seed: 1 });
    const floor = rows.find((r) => r.label === "floor")!;
    const ceiling = rows.find((r) => r.label === "ceiling")!;
    expect(floor.finalTier).toBe(0);
    expect(ceiling.finalTier).toBeGreaterThan(floor.finalTier);
    // The bracket carries the full agent metadata for the optimizer to read.
    expect(rows.map((r) => r.label)).toEqual(DEFAULT_BRACKET.map((a) => a.label));
  });

  it("is deterministic for a fixed seed", () => {
    const a = runComparison({ zoneId: "home", runs: 16, seed: 3 });
    const b = runComparison({ zoneId: "home", runs: 16, seed: 3 });
    expect(a.rows).toEqual(b.rows);
  });

  it("renders a Markdown table naming every agent", () => {
    const { reportMarkdown } = runComparison({ zoneId: "home", runs: 8, seed: 1 });
    expect(reportMarkdown).toContain("policy bracket");
    for (const a of DEFAULT_BRACKET) expect(reportMarkdown).toContain(a.label);
  });
});
