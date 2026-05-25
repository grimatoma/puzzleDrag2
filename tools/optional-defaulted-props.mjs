#!/usr/bin/env node
// After fix-broken-destructuring.mjs, some files have signatures like:
//   ({ value, onChange, min = 0 }: { value: any; onChange: any; min: any })
// The defaulted prop `min` should be optional from the caller's perspective.
// Rewrite to:
//   ({ value, onChange, min = 0 }: { value: any; onChange: any; min?: any })

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname;

const filesRaw = execSync(`grep -rl ": { " src/ --include='*.ts' --include='*.tsx'`, {
  cwd: ROOT,
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(Boolean);

let totalFixes = 0;
let touched = 0;

for (const rel of filesRaw) {
  const abs = `${ROOT}${rel}`;
  const src = readFileSync(abs, "utf8");
  const { out, count } = transform(src);
  if (count > 0) {
    writeFileSync(abs, out);
    console.log(`  patched ${count} signature(s) in ${rel}`);
    touched++;
    totalFixes += count;
  }
}

console.log(`\nDone: ${totalFixes} signature(s) patched in ${touched} file(s).`);

// Match `({ DESTRUCTURE }: { TYPE })` where DESTRUCTURE has `key = default` entries.
// Convert matching `key: any` entries in TYPE to `key?: any`.
function transform(src) {
  let count = 0;
  const out = src.replace(
    /\(\{\s*([^{}]+?)\s*\}\s*:\s*\{\s*([^{}]+?)\s*\}/g,
    (whole, destructure, typeAnno) => {
      // Find keys in destructure that have defaults: `key = ...` (at top level — we already
      // know these are flat from the prior transform).
      const defaultedKeys = new Set();
      // Split top-level by commas
      const parts = splitTopLevel(destructure, ",");
      for (const part of parts) {
        const trimmed = part.trim();
        // Skip ...rest
        if (trimmed.startsWith("...")) continue;
        // Match `name = ...`
        const m = trimmed.match(/^([A-Za-z_$][\w$]*)\s*=/);
        if (m) defaultedKeys.add(m[1]);
      }
      if (defaultedKeys.size === 0) return whole;

      // Rewrite the type annotation: turn `name: any` into `name?: any` for defaulted keys.
      let changed = false;
      const newType = typeAnno.replace(
        /([A-Za-z_$][\w$]*)\s*:\s*([^;]+)(;|$)/g,
        (segWhole, key, typ, sep) => {
          if (defaultedKeys.has(key)) {
            changed = true;
            return `${key}?: ${typ.trim()}${sep}`;
          }
          return segWhole;
        }
      );
      if (changed) {
        count++;
        return `({ ${destructure} }: { ${newType} }`;
      }
      return whole;
    }
  );
  return { out, count };
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
