#!/usr/bin/env node
/**
 * Strict-ish typecheck of ALL unit/integration test files in ONE tsc program,
 * gated against a frozen error baseline.
 *
 * Why a baseline: the test corpus carries a large amount of pre-existing,
 * loosely-typed debt (stub GameStates, ~160 `as Action` casts). Turning on a
 * real typecheck surfaces hundreds of these at once. Rather than turn the gate
 * red on day one (or leave it vacuous, as the old per-file scanner was — it
 * couldn't resolve @types from /tmp, so it checked ~nothing), we snapshot the
 * current errors into tools/test-tsc-baseline.json and fail only on NEW error
 * signatures. That gives real forward protection (a newly-broken test, a
 * renamed slice payload field, a bad import) while the debt is paid down
 * incrementally — every fix shrinks the baseline.
 *
 * Usage:
 *   node tools/typecheck-test-files.mjs            # check: fail on NEW errors
 *   node tools/typecheck-test-files.mjs --update   # regenerate the baseline
 *
 * See reference/docs/projects/24-test-suite-and-infra-review.html §9.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PROJECT = path.join(ROOT, "tsconfig.test-files.json");
const BASELINE = path.join(ROOT, "tools", "test-tsc-baseline.json");
const UPDATE = process.argv.includes("--update");

// One tsc program over the whole test corpus. `--pretty false` gives stable,
// ANSI-free `file(line,col): error TScode: message` lines.
function runTsc() {
  try {
    execFileSync("npx", ["tsc", "--noEmit", "--pretty", "false", "-p", PROJECT], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: "pipe",
    });
    return "";
  } catch (e) {
    return (e.stdout || "") + (e.stderr || "");
  }
}

// Normalize each primary error to a stable signature: `relpath|TScode|message`.
// Line/column are dropped so a benign edit that shifts lines doesn't churn the
// baseline; the message is kept because it names the offending symbol/type, so a
// genuinely new error (e.g. a renamed field) produces a new signature.
const LINE_RE = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;
function signatures(out) {
  const sigs = new Set();
  for (const raw of out.split(/\r?\n/)) {
    const m = raw.match(LINE_RE);
    if (!m) continue; // skip continuation lines and summaries
    const rel = m[1].split(path.sep).join("/");
    sigs.add(`${rel}|${m[4]}|${m[5].trim()}`);
  }
  return sigs;
}

const out = runTsc();
const current = signatures(out);

if (UPDATE) {
  const sorted = [...current].sort();
  writeFileSync(BASELINE, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`Wrote ${sorted.length} baseline error signatures → tools/test-tsc-baseline.json`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.error("Missing tools/test-tsc-baseline.json — run: node tools/typecheck-test-files.mjs --update");
  process.exit(1);
}
const baseline = new Set(JSON.parse(readFileSync(BASELINE, "utf8")));

const added = [...current].filter((s) => !baseline.has(s)).sort();
const fixed = [...baseline].filter((s) => !current.has(s));

if (fixed.length) {
  console.log(`✓ ${fixed.length} baselined test-file type error(s) no longer present — consider running --update to shrink the baseline.`);
}

if (added.length) {
  console.error(`\n✗ ${added.length} NEW test-file type error(s) not in the baseline:\n`);
  for (const s of added) {
    const [file, code, msg] = s.split("|");
    console.error(`  ${file}: ${code} ${msg}`);
  }
  console.error(
    `\nFix them, or (if intentional) re-baseline with: node tools/typecheck-test-files.mjs --update`,
  );
  process.exit(1);
}

console.log(`OK: no new test-file type errors (${current.size} known, baselined).`);
