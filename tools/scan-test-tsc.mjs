#!/usr/bin/env node
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const testDir = join(root, "src/__tests__");
const files = readdirSync(testDir).filter((f) => f.endsWith(".test.ts")).sort();

const dir = mkdtempSync(join(tmpdir(), "tsc-scan-"));
const results = [];

for (const name of files) {
  const rel = `src/__tests__/${name}`;
  const cfg = join(dir, `${name}.json`);
  writeFileSync(
    cfg,
    JSON.stringify({
      extends: join(root, "tsconfig.json"),
      include: [join(root, rel)],
      exclude: ["node_modules", "dist"],
    }),
  );
  let count = 0;
  try {
    execSync(`npx tsc --noEmit -p "${cfg}"`, { cwd: root, encoding: "utf8", stdio: "pipe" });
  } catch (e) {
    const out = (e.stdout || "") + (e.stderr || "");
    count = out.split("\n").filter((l) => l.includes(rel) && l.includes("error TS")).length;
  }
  if (count > 0) results.push({ count, rel });
}

rmSync(dir, { recursive: true, force: true });
results.sort((a, b) => b.count - a.count);
for (const r of results) console.log(`${r.count}\t${r.rel}`);
console.error(`\n${results.length}/${files.length} files with test-local errors`);
if (results.length > 0) process.exit(1);
