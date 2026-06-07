// CI guard for docs/parity-matrix.json.
//
// Fails (exit 1) if any row whose godot_status is "full" references a Godot
// test suite (a verified_by entry of the form `run_*.gd`, optionally prefixed
// `suite:`) that does NOT exist at godot/tests/<name>. Non-suite verified_by
// entries (e2e:*, golden:*, ci:*, gdunit4:*, check-*.mjs, etc.) are ignored —
// they are forward-looking aspirational artifacts for not-yet-done rows.
//
// Only "full" rows are validated: the matrix must not claim a system is fully
// ported unless its named suite is real on disk (the anti-"+undefined" guard
// the plan calls for). Run: `node tools/check-parity-matrix.mjs`. Exit 0 clean.
//
// Style mirrors the other .mjs tools in this folder. node: built-ins only.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const dataPath = join(repoRoot, "docs", "parity-matrix.json");
const suiteDir = join(repoRoot, "godot", "tests");

// --- load -------------------------------------------------------------------

let data;
try {
  data = JSON.parse(readFileSync(dataPath, "utf8"));
} catch (err) {
  console.error(`check-parity-matrix: cannot read ${dataPath}: ${err.message}`);
  process.exit(1);
}

const rows = Array.isArray(data.rows) ? data.rows : [];
if (!rows.length) {
  console.error("check-parity-matrix: no rows found in docs/parity-matrix.json");
  process.exit(1);
}

// --- validate ---------------------------------------------------------------

// A verified_by entry names a Godot suite if it matches `run_*.gd` (optionally
// behind a `suite:` prefix). Everything else is ignored for this check.
const SUITE_RE = /^(?:suite:)?(run_[A-Za-z0-9_]+\.gd)$/;

function suiteName(entry) {
  const m = String(entry).trim().match(SUITE_RE);
  return m ? m[1] : null;
}

// Allowed status values. "dropped" = intentionally out of scope (excluded from the
// parity denominator in the renderer). Any other value is a typo / drift and fails.
const ALLOWED_STATUS = new Set(["full", "partial", "absent", "dropped"]);

const failures = [];
const statusFailures = [];
let fullRows = 0;
let suiteRefsChecked = 0;

for (const r of rows) {
  if (!ALLOWED_STATUS.has(r.godot_status)) {
    statusFailures.push({ id: r.id, status: r.godot_status });
  }
  if (r.godot_status !== "full") continue;
  fullRows++;
  const verified = Array.isArray(r.verified_by) ? r.verified_by : [];
  for (const entry of verified) {
    const suite = suiteName(entry);
    if (!suite) continue; // not a Godot suite reference — ignore
    suiteRefsChecked++;
    if (!existsSync(join(suiteDir, suite))) {
      failures.push({ id: r.id, feature: r.feature_or_screen, suite });
    }
  }
}

// --- report -----------------------------------------------------------------

console.log("check-parity-matrix: validating docs/parity-matrix.json");
console.log(`  rows checked:        ${rows.length}`);
console.log(`  full rows validated: ${fullRows}`);
console.log(`  suite refs checked:  ${suiteRefsChecked}`);

if (statusFailures.length) {
  console.error(
    `\nFAIL: ${statusFailures.length} row(s) have an unknown godot_status (allowed: full, partial, absent, dropped):`
  );
  for (const f of statusFailures) {
    console.error(`  - row "${f.id}" -> godot_status "${f.status}"`);
  }
  process.exit(1);
}

if (failures.length) {
  console.error(
    `\nFAIL: ${failures.length} 'full' row(s) reference a Godot suite that does not exist at godot/tests/:`
  );
  for (const f of failures) {
    console.error(`  - row "${f.id}" (${f.feature}) -> ${f.suite} (missing)`);
  }
  console.error(
    "\nFix: a row may only be marked godot_status:\"full\" if every run_*.gd it lists in" +
      "\nverified_by exists on disk. Either add the suite, correct the name, or change the" +
      "\nrow's status away from \"full\"."
  );
  process.exit(1);
}

console.log("\nOK: every 'full' row's run_*.gd suite reference exists on disk.");
process.exit(0);
