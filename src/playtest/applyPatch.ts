// applyPatch.ts — write a dotted-path balance change-list BACK into the source.
//
// The playtest harness (emitChangeList.ts) and the Dev Panel cost-matrix export
// (costExport.ts) both emit the SAME machine-readable patch shape: a flat map of
// dotted constants paths → new numeric value, e.g.
//
//   { "ITEMS.pearls.value": 400, "BUILDINGS.mill.cost.plank": 6,
//     "RECIPES.rec_bread.inputs.flour": 2 }
//
// Until now that patch was a dead end: a human pasted it into an LLM session to
// hand-edit src/constants.ts. This module CLOSES the loop — it parses constants.ts
// with the TypeScript compiler API, walks each dotted path down to its numeric
// literal, and rewrites JUST that literal by text-span splice. It does NOT
// re-print the AST (that would reflow the whole file): every other byte —
// formatting, comments, trailing commas, hand-authored layout — is preserved, so
// the only diff is the changed numbers. That diff IS the reviewable record of the
// balance change.
//
// PURE: no fs, no argv. Takes a file's source text + the entries targeting it and
// returns the rewritten text plus a per-edit report. The fs/orchestration shell
// lives in tools/playtest/applyChangeList.mjs; the optimizer (M3) calls this core
// against an in-memory copy of constants to sweep knobs without touching disk.

import ts from "typescript";

export interface PatchEntry {
  /** Dotted constants path, e.g. "ITEMS.pearls.value". */
  path: string;
  /** New numeric value to write. `0` on a recipe/building input means "no cost". */
  to: number;
}

export interface ResolvedEdit {
  path: string;
  from: number;
  to: number;
  /** Source-text span [start, end) of the numeric literal being replaced. */
  start: number;
  end: number;
}

export interface ApplyResult {
  /** Rewritten source (input unchanged when nothing applied). */
  source: string;
  /** Edits actually spliced in (value differed from target). */
  applied: ResolvedEdit[];
  /** Paths whose literal already equalled `to` (idempotent no-ops). */
  unchanged: Array<{ path: string; value: number }>;
  /** Paths that did not resolve to an editable numeric literal (hard failures). */
  unresolved: Array<{ path: string; reason: string }>;
  /** True iff at least one edit was spliced. */
  changed: boolean;
}

/** Where each known root export lives + how to descend into its literal. */
interface RootConfig {
  /** Repo-relative source file holding the declaration. */
  file: string;
  /** The top-level `const` whose initializer literal we edit. */
  decl: string;
  /** Object-literal map vs. array-of-objects. */
  kind: "object" | "array";
  /** For arrays: the property whose string value matches the first path segment. */
  idProp?: string;
  /**
   * Remap of the FIRST member segment (object roots only). ITEMS is a derived
   * const `{ ...ITEMS_DATA, iron_frame: ITEMS_DATA.ironframe, … }` — the real
   * literal is ITEMS_DATA, and three keys are spread aliases of canonical keys.
   */
  alias?: Record<string, string>;
}

export const CONSTANTS_FILE = "src/constants.ts";

const ROOTS: Record<string, RootConfig> = {
  // `ITEMS.<key>.value` edits land in the ITEMS_DATA literal (ITEMS spreads it).
  ITEMS: {
    file: CONSTANTS_FILE,
    decl: "ITEMS_DATA",
    kind: "object",
    alias: { iron_frame: "ironframe", gem_crown: "gemcrown", gold_ring: "goldring" },
  },
  // `RECIPES.<recId>.inputs.<key>` — keyed by canonical rec_* id.
  RECIPES: { file: CONSTANTS_FILE, decl: "RECIPES", kind: "object" },
  // `BUILDINGS.<id>.cost.<key>` — array of { id, cost }.
  BUILDINGS: { file: CONSTANTS_FILE, decl: "BUILDINGS", kind: "array", idProp: "id" },
  // M5-ready: `MARKET_PRICES.<key>.{buy,sell}`.
  MARKET_PRICES: { file: CONSTANTS_FILE, decl: "MARKET_PRICES", kind: "object" },
};

/** The source file a dotted path edits, or null if its root is unknown. */
export function targetFileForPath(path: string): string | null {
  const root = path.split(".")[0];
  return ROOTS[root]?.file ?? null;
}

/** All distinct files referenced by a patch (for the shell to read/write). */
export function filesForPatch(entries: PatchEntry[]): string[] {
  const files = new Set<string>();
  for (const e of entries) {
    const f = targetFileForPath(e.path);
    if (f) files.add(f);
  }
  return [...files];
}

// ── AST helpers ───────────────────────────────────────────────────────────────

/** Strip `as X` / `satisfies X` / parens so we reach the underlying literal. */
function unwrap(node: ts.Expression): ts.Expression {
  let n = node;
  while (
    ts.isAsExpression(n) ||
    ts.isSatisfiesExpression(n) ||
    ts.isParenthesizedExpression(n)
  ) {
    n = n.expression;
  }
  return n;
}

function propName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) return name.text;
  if (ts.isNumericLiteral(name)) return name.text;
  return undefined;
}

function objectProp(obj: ts.ObjectLiteralExpression, key: string): ts.Expression | undefined {
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p) && propName(p.name) === key) return unwrap(p.initializer);
  }
  return undefined;
}

function arrayElementById(
  arr: ts.ArrayLiteralExpression,
  idProp: string,
  idValue: string,
): ts.ObjectLiteralExpression | undefined {
  for (const el of arr.elements) {
    const e = unwrap(el);
    if (!ts.isObjectLiteralExpression(e)) continue;
    const idInit = objectProp(e, idProp);
    if (idInit && (ts.isStringLiteral(idInit) || ts.isNoSubstitutionTemplateLiteral(idInit)) && idInit.text === idValue) {
      return e;
    }
  }
  return undefined;
}

/** Map every top-level `const <name> = <literal>` to its (unwrapped) initializer. */
function topLevelDecls(sf: ts.SourceFile): Map<string, ts.Expression> {
  const out = new Map<string, ts.Expression>();
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const d of stmt.declarationList.declarations) {
      if (ts.isIdentifier(d.name) && d.initializer) out.set(d.name.text, unwrap(d.initializer));
    }
  }
  return out;
}

// ── Resolution ─────────────────────────────────────────────────────────────────

type Resolved =
  | { ok: true; node: ts.NumericLiteral }
  | { ok: false; reason: string };

/** Walk a dotted path down to its numeric literal node. */
function resolvePath(
  path: string,
  decls: Map<string, ts.Expression>,
  fileName: string,
): Resolved {
  const segs = path.split(".");
  const cfg = ROOTS[segs[0]];
  if (!cfg) return { ok: false, reason: `unknown root "${segs[0]}"` };
  if (cfg.file !== fileName) return { ok: false, reason: `root "${segs[0]}" belongs to ${cfg.file}` };

  const root = decls.get(cfg.decl);
  if (!root) return { ok: false, reason: `declaration ${cfg.decl} not found` };

  let node: ts.Expression = root;
  let members = segs.slice(1);

  if (cfg.kind === "array") {
    if (!ts.isArrayLiteralExpression(node)) return { ok: false, reason: `${cfg.decl} is not an array literal` };
    if (!members.length) return { ok: false, reason: `path has no element id` };
    const el = arrayElementById(node, cfg.idProp!, members[0]);
    if (!el) return { ok: false, reason: `no ${cfg.decl} element with ${cfg.idProp}="${members[0]}"` };
    node = el;
    members = members.slice(1);
  } else if (cfg.alias && members.length) {
    members = [cfg.alias[members[0]] ?? members[0], ...members.slice(1)];
  }

  for (const seg of members) {
    if (!ts.isObjectLiteralExpression(node)) return { ok: false, reason: `"${seg}" is not under an object literal` };
    const next = objectProp(node, seg);
    if (next === undefined) return { ok: false, reason: `property "${seg}" not found` };
    node = next;
  }

  if (!ts.isNumericLiteral(node)) return { ok: false, reason: `target is not a numeric literal` };
  return { ok: true, node };
}

/**
 * Rewrite every resolvable entry's numeric literal in `source`. Entries that
 * already match are reported as `unchanged`; entries that don't resolve to a
 * numeric literal are reported as `unresolved` (the caller fails loudly — a
 * silent miss is the one outcome this loop must never produce).
 */
export function applyPatchToSource(fileName: string, source: string, entries: PatchEntry[]): ApplyResult {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, /*setParentNodes*/ true);
  const decls = topLevelDecls(sf);

  const applied: ResolvedEdit[] = [];
  const unchanged: ApplyResult["unchanged"] = [];
  const unresolved: ApplyResult["unresolved"] = [];

  for (const entry of entries) {
    const r = resolvePath(entry.path, decls, fileName);
    if (!r.ok) {
      unresolved.push({ path: entry.path, reason: r.reason });
      continue;
    }
    const from = Number(r.node.text);
    if (from === entry.to) {
      unchanged.push({ path: entry.path, value: entry.to });
      continue;
    }
    applied.push({
      path: entry.path,
      from,
      to: entry.to,
      start: r.node.getStart(sf),
      end: r.node.getEnd(),
    });
  }

  // Splice descending by offset so earlier edits never invalidate later spans.
  let out = source;
  for (const e of [...applied].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, e.start) + String(e.to) + out.slice(e.end);
  }

  return { source: out, applied, unchanged, unresolved, changed: applied.length > 0 };
}
