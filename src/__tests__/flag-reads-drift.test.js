import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FLAG_READS } from "../flagReads.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, "..");

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "__tests__") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(js|jsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function directFlagReads() {
  const files = walk(SRC).filter((p) => !/\/(balanceManager|storyEditor)\//.test(p) && !p.endsWith("/flags.js") && !p.endsWith("/flagReads.js"));
  const found = new Map();
  const patterns = [
    /\bstory\??\.flags\??\.([a-zA-Z_][a-zA-Z0-9_]*)/g,
    /\b(?:state|next)\.flags\.([a-zA-Z_][a-zA-Z0-9_]*)/g,
    /\bflags\.([a-zA-Z_][a-zA-Z0-9_]*)/g,
  ];
  for (const file of files) {
    const rel = path.relative(SRC, file).replaceAll(path.sep, "/");
    const text = fs.readFileSync(file, "utf8");
    for (const re of patterns) {
      for (const m of text.matchAll(re)) {
        const id = m[1];
        if (["length", "map", "filter", "find", "push", "some", "slice", "sort", "js"].includes(id)) continue;
        if (!found.has(id)) found.set(id, new Set());
        found.get(id).add(`src/${rel}`);
      }
    }
  }
  return found;
}

describe("FLAG_READS drift guard", () => {
  it("documents every direct non-editor story flag read", () => {
    const reads = directFlagReads();
    const missing = [];
    for (const [id, files] of reads) {
      if (!FLAG_READS[id]) missing.push(`${id} (${[...files].join(", ")})`);
    }
    expect(missing).toEqual([]);
  });
});
