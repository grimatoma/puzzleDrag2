#!/usr/bin/env node
// Strict tsc for one Vitest file (root tsconfig excludes test.ts files).
// Usage: node tools/tsc-test-file.mjs src/__tests__/foo.test.ts
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const file = process.argv[2];
if (!file) {
  console.error("usage: node tools/tsc-test-file.mjs <test.ts>");
  process.exit(2);
}

const root = resolve(import.meta.dirname, "..");
const dir = mkdtempSync(join(tmpdir(), "tsc-one-"));
const cfg = join(dir, "tsconfig.json");
writeFileSync(
  cfg,
  JSON.stringify({
    extends: join(root, "tsconfig.json"),
    include: [resolve(root, file)],
    exclude: ["node_modules", "dist"],
  }),
);

try {
  execSync(`npx tsc --noEmit -p "${cfg}"`, { cwd: root, encoding: "utf8", stdio: "pipe" });
  console.log("OK", file);
} catch (e) {
  const out = (e.stdout || "") + (e.stderr || "");
  const lines = out.split("\n").filter((l) => l.includes(file) && l.includes("error TS"));
  console.log(lines.length || "graph-only", file);
  if (lines.length) console.log(lines.slice(0, 5).join("\n"));
} finally {
  rmSync(dir, { recursive: true, force: true });
}
