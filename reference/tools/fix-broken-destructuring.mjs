#!/usr/bin/env node
// Convert broken pattern `({ a: any, b: any, c = default })`
// into proper TS `({ a, b, c = default }: { a: any; b: any; c: any })`.
//
// Detection: a brace-delimited destructure parameter that contains `: any`
// outside of a nested object/array. We only rewrite when the OUTER brace
// has at least one `: any` key — nested `{ width }: { width: number }`
// inline-typed bindings are left alone.

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("../..", import.meta.url).pathname;

const filesRaw = execSync(`grep -rl ": any" src/ --include='*.ts' --include='*.tsx'`, {
  cwd: ROOT,
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(Boolean);

let changed = 0;
let totalFixes = 0;

for (const rel of filesRaw) {
  const abs = `${ROOT}${rel}`;
  const src = readFileSync(abs, "utf8");
  const { out, count } = transform(src);
  if (count > 0) {
    writeFileSync(abs, out);
    console.log(`  fixed ${count} in ${rel}`);
    changed++;
    totalFixes += count;
  }
}

console.log(`\nDone: ${totalFixes} destructure(s) fixed in ${changed} file(s).`);

function transform(src) {
  // Walk the source. When we hit `(`, look ahead for `{` then scan to its matching `}`
  // followed by `)`, capture the params block, transform if needed.
  const out = [];
  let i = 0;
  let count = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "(") {
      // Skip whitespace
      let j = i + 1;
      while (j < src.length && /\s/.test(src[j])) j++;
      if (src[j] === "{") {
        // Find matching `}` (track brace depth)
        const braceStart = j;
        let depth = 0;
        let k = braceStart;
        let inString = null;
        while (k < src.length) {
          const c = src[k];
          if (inString) {
            if (c === "\\") {
              k += 2;
              continue;
            }
            if (c === inString) inString = null;
          } else if (c === '"' || c === "'" || c === "`") {
            inString = c;
          } else if (c === "{") {
            depth++;
          } else if (c === "}") {
            depth--;
            if (depth === 0) break;
          }
          k++;
        }
        if (k >= src.length || depth !== 0) {
          out.push(ch);
          i++;
          continue;
        }
        // k is at matching `}`. Look forward (skipping whitespace) for what follows.
        let m = k + 1;
        while (m < src.length && /\s/.test(src[m])) m++;
        const afterBraceChar = src[m];

        const innerOuter = src.slice(braceStart + 1, k);
        const hasAnyType = /:\s*any\b/.test(innerOuter);
        const alreadyTyped = afterBraceChar === ":";

        if (!hasAnyType || alreadyTyped) {
          // Either nothing to fix or already in correct shape (`}: TypeAnnotation`)
          out.push(ch);
          i++;
          continue;
        }

        // Parse top-level keys inside the destructure (split on commas at depth 0).
        const parts = splitTopLevel(innerOuter, ",");
        const keys = [];
        const bindings = [];
        let allRewriteable = true;
        for (const partRaw of parts) {
          const part = partRaw.trim();
          if (!part) continue;
          // Patterns we accept:
          //   key
          //   key = default
          //   key: any
          //   key: any = default
          //   ...rest
          //   key: rename            (we LEAVE the file alone if we see this -- can't safely rewrite)
          const restMatch = part.match(/^\.\.\.([A-Za-z_$][\w$]*)$/);
          if (restMatch) {
            bindings.push(`...${restMatch[1]}`);
            continue;
          }
          const m1 = part.match(/^([A-Za-z_$][\w$]*)\s*:\s*any\s*(=\s*([\s\S]+))?$/);
          if (m1) {
            keys.push(m1[1]);
            bindings.push(m1[3] !== undefined ? `${m1[1]} = ${m1[3].trim()}` : m1[1]);
            continue;
          }
          const m2 = part.match(/^([A-Za-z_$][\w$]*)\s*(=\s*([\s\S]+))?$/);
          if (m2) {
            // Untyped key — keep as-is, but also include in the type annotation as `any`.
            keys.push(m2[1]);
            bindings.push(m2[3] !== undefined ? `${m2[1]} = ${m2[3].trim()}` : m2[1]);
            continue;
          }
          // Anything more exotic (e.g. `key: rename`, nested destructure, computed keys) — bail.
          allRewriteable = false;
          break;
        }

        if (!allRewriteable || keys.length === 0) {
          out.push(ch);
          i++;
          continue;
        }

        const newInner = bindings.join(", ");
        const typeAnno = keys.map((k) => `${k}: any`).join("; ");
        const replacement = `({ ${newInner} }: { ${typeAnno} }`;
        out.push(replacement);
        // Continue right AFTER the original `}` (not including the `)`).
        i = k + 1;
        count++;
        continue;
      }
    }
    out.push(ch);
    i++;
  }
  return { out: out.join(""), count };
}

function splitTopLevel(str, sep) {
  const parts = [];
  let depth = 0;
  let inString = null;
  let cur = "";
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (inString) {
      cur += c;
      if (c === "\\") {
        cur += str[i + 1] ?? "";
        i++;
        continue;
      }
      if (c === inString) inString = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      inString = c;
      cur += c;
      continue;
    }
    if (c === "{" || c === "[" || c === "(") depth++;
    else if (c === "}" || c === "]" || c === ")") depth--;
    if (depth === 0 && c === sep) {
      parts.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  if (cur) parts.push(cur);
  return parts;
}
