// tests/phase-12-ci.test.ts — minimal smoke on the CI workflow.
// Intentionally NOT a spec of the workflow's exact shape: node-version,
// timeouts, cache keys, artifact names and exact step ordering are benign
// implementation details that churn. We only assert the workflow exists and
// still names the gating jobs, so a rename/removal is caught.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ymlPath = resolve(".github/workflows/ci.yml");

describe("CI pipeline — smoke", () => {
  it("workflow file exists", () => {
    expect(existsSync(ymlPath)).toBe(true);
  });

  it("mentions the gating job names", () => {
    const yml = readFileSync(ymlPath, "utf8");
    for (const job of ["lint", "typecheck", "test", "build", "e2e"]) {
      expect(yml, `ci.yml should mention the "${job}" job`).toContain(job);
    }
  });
});
