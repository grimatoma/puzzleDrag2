// tests/phase-12-ci.test.js — meta-test the workflow itself.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ymlPath = resolve(".github/workflows/ci.yml");

describe("Phase 12.3 — CI pipeline", () => {
  it("workflow file exists", () => {
    expect(existsSync(ymlPath)).toBe(true);
  });

  it("workflow has the required top-level structure", () => {
    const yml = readFileSync(ymlPath, "utf8");
    expect(yml).toMatch(/^name:\s*CI/m);
    expect(yml).toMatch(/pull_request:/);
    expect(yml).toMatch(/push:/);
    expect(yml).toMatch(/branches:\s*\[main\]/);
  });

  it("has lint, test, build jobs", () => {
    const yml = readFileSync(ymlPath, "utf8");
    expect(yml).toMatch(/^\s{2}lint:/m);
    expect(yml).toMatch(/^\s{2}test:/m);
    expect(yml).toMatch(/^\s{2}build:/m);
  });

  it("uses Node 20 with npm cache in every job", () => {
    const yml = readFileSync(ymlPath, "utf8");
    const nodeBlocks = yml.match(/setup-node@v4[\s\S]+?(?=\n\s{0,6}-|\n\s{0,4}\w)/g);
    expect(nodeBlocks?.length).toBeGreaterThanOrEqual(3);
    for (const b of nodeBlocks) {
      expect(b).toMatch(/node-version:\s*20/);
      expect(b).toMatch(/cache:\s*npm/);
    }
  });

  it("uploads coverage and dist artifacts", () => {
    const yml = readFileSync(ymlPath, "utf8");
    expect(yml).toMatch(/upload-artifact@v4[\s\S]+?name:\s*coverage/);
    expect(yml).toMatch(/upload-artifact@v4[\s\S]+?name:\s*dist/);
  });

  it("every job has a timeout to fail fast on hangs", () => {
    const yml = readFileSync(ymlPath, "utf8");
    const matches = yml.match(/timeout-minutes:\s*\d+/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });
});
