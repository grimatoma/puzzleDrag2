#!/usr/bin/env node
/**
 * applyChangeList — write a dotted-path balance patch BACK into the source.
 *
 * The fs/orchestration shell for src/playtest/applyPatch.ts (the pure codemod).
 * Reads a change-list.json ({ "<dotted path>": <number> }) — the exact shape the
 * playtest harness and Dev Panel cost-matrix export both emit — groups the edits
 * by target file, and rewrites each file's numeric literals in place.
 *
 * Fail-loud contract: if ANY path doesn't resolve to an editable numeric literal,
 * the whole apply aborts and writes NOTHING (a silent half-apply is the one
 * outcome we never want). Resolves the TS through Vite's SSR pipeline, exactly
 * like cli.mjs, so .ts/.js specifiers and the compiler API load as shipped.
 *
 * Usage:
 *   node tools/playtest/applyChangeList.mjs [--apply-from <path>] [--no-write] [--format]
 *
 * Programmatic: `import { applyChangeList, summarizeApply } from "./applyChangeList.mjs"`.
 * cli.mjs's `--apply` flag wraps this and additionally regenerates the harness
 * drift-guard snapshot (balance edits move the fixed-seed metrics by design).
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { seasonalSubjects } from "../vite/seasonalSubjects.mjs";

const execFileP = promisify(execFile);

const DEFAULT_PATCH = "reference/docs/playtest/change-list.json";

/** Load the pure codemod core through Vite SSR (same pipeline as cli.mjs). */
async function loadCore() {
  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
    root: process.cwd(),
    logLevel: "error",
    plugins: [seasonalSubjects()],
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true },
    appType: "custom",
  });
  try {
    const mod = await server.ssrLoadModule("/src/playtest/applyPatch.ts");
    return { mod, close: () => server.close() };
  } catch (e) {
    await server.close();
    throw e;
  }
}

/** change-list.json is a flat { "<dotted path>": <number> } patch. */
function parsePatch(json) {
  const obj = JSON.parse(json);
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    throw new Error("change-list patch must be a JSON object of { path: number }");
  }
  return Object.entries(obj).map(([p, to]) => ({ path: p, to: Number(to) }));
}

/**
 * Apply a patch file. Returns:
 *   { ok, entries, perFile, unresolved, applied, wrote }
 * ok=false (and wrote=[]) when any path is unresolved — nothing is written.
 */
export async function applyChangeList({ patchPath, write = true, format = false } = {}) {
  const { mod, close } = await loadCore();
  let perFile;
  let entries;
  let unresolved;
  try {
    entries = parsePatch(await readFile(patchPath, "utf8"));
    const files = mod.filesForPatch(entries);
    perFile = [];
    unresolved = [];
    for (const rel of files) {
      const abs = path.resolve(process.cwd(), rel);
      const source = await readFile(abs, "utf8");
      const fileEntries = entries.filter((e) => mod.targetFileForPath(e.path) === rel);
      const r = mod.applyPatchToSource(rel, source, fileEntries);
      perFile.push({ rel, abs, r });
      unresolved = unresolved.concat(r.unresolved);
    }
  } finally {
    await close();
  }

  if (unresolved.length) {
    return { ok: false, entries, perFile, unresolved, applied: [], wrote: [] };
  }

  const applied = perFile.flatMap(({ r }) => r.applied);
  const wrote = [];
  if (write) {
    for (const { rel, abs, r } of perFile) {
      if (r.changed) {
        await writeFile(abs, r.source, "utf8");
        wrote.push(rel);
      }
    }
    if (format && wrote.length) {
      try {
        await execFileP("npx", ["eslint", "--fix", ...wrote], { cwd: process.cwd() });
      } catch (e) {
        // eslint --fix exits non-zero when unfixable lint remains; the numeric
        // splices already landed, so warn rather than fail the apply.
        console.warn(`[apply] eslint --fix reported issues:\n${e.stdout || e.message}`);
      }
    }
  }
  return { ok: true, entries, perFile, unresolved, applied, wrote };
}

/** Human-readable console summary of an applyChangeList result. */
export function summarizeApply(res) {
  if (!res.ok) {
    console.error(`\n[apply] ✗ ${res.unresolved.length} unresolved path(s) — wrote NOTHING:`);
    for (const u of res.unresolved) console.error(`   • ${u.path}: ${u.reason}`);
    return;
  }
  if (!res.applied.length) {
    console.log(`\n[apply] nothing to change — patch already satisfied.`);
    return;
  }
  console.log(`\n[apply] ${res.applied.length} edit(s) across ${res.wrote.length} file(s):`);
  for (const e of res.applied) console.log(`   • ${e.path}: ${e.from} → ${e.to}`);
}

async function main() {
  const argv = process.argv.slice(2);
  const get = (flag, def) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : def;
  };
  const patchPath = path.resolve(process.cwd(), get("--apply-from", DEFAULT_PATCH));
  const res = await applyChangeList({
    patchPath,
    write: !argv.includes("--no-write"),
    format: argv.includes("--format"),
  });
  summarizeApply(res);
  if (!res.ok) process.exit(1);
}

// Run main() only when invoked directly (not when imported by cli.mjs).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
