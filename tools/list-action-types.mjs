#!/usr/bin/env node
/**
 * Parse `ACTION_TYPES` from `src/types/actions.ts` and print or emit a sorted copy.
 *
 * Usage:
 *   node tools/list-action-types.mjs           # count + sorted list (stdout)
 *   node tools/list-action-types.mjs --emit    # full `export const ACTION_TYPES = [...] as const;` (sorted)
 *   node tools/list-action-types.mjs --check   # duplicates + count only (exit 1 on dupes)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ACTIONS_TS = path.join(ROOT, "src/types/actions.ts");

function parseActionTypes() {
  const txt = readFileSync(ACTIONS_TS, "utf8");
  const m = txt.match(/export const ACTION_TYPES = \[([\s\S]*?)\] as const/);
  if (!m) throw new Error(`Could not parse ACTION_TYPES from ${ACTIONS_TS}`);
  const types = [];
  for (const q of m[1].matchAll(/"([^"]+)"/g)) types.push(q[1]);
  return types;
}

const types = parseActionTypes();
const sorted = [...types].sort((a, b) => a.localeCompare(b));
const uniq = new Set(types);

if (uniq.size !== types.length) {
  const dupes = types.filter((t, i) => types.indexOf(t) !== i);
  console.error("Duplicate entries in ACTION_TYPES:", [...new Set(dupes)].join(", "));
  process.exit(1);
}

const argv = process.argv.slice(2);

if (argv.includes("--emit")) {
  const body = sorted.map((t) => `  "${t}",`).join("\n");
  process.stdout.write(`export const ACTION_TYPES = [\n${body}\n] as const;\n`);
  process.exit(0);
}

if (argv.includes("--check")) {
  console.log(`OK: ${types.length} unique action types in src/types/actions.ts`);
  process.exit(0);
}

console.log(`${types.length} action types (source order in actions.ts). Alphabetically:\n`);
console.log(sorted.join("\n"));
