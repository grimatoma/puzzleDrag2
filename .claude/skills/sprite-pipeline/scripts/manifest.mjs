#!/usr/bin/env node
// sprite-pipeline — the shared manifest seam (three-file model).
//
// The pixel pipeline used to live in ONE file, `godot/assets/tiles/v2/pipeline.json`, which mixed the
// SPEC (what to build) with a growing ATTEMPT LOG (`candidates[]` on every keyframe — every seed ever
// tried, failures and verbose `reason` strings included). That file is now split into THREE siblings
// that live side-by-side under `godot/assets/tiles/v2/`:
//
//   1. pipeline.json          — spec + current state. Each keyframe keeps `selected` + `selectedPath`
//                               and DROPS `candidates`. This is the file humans/agents edit.
//   2. pipeline.history.json  — the candidate/attempt log sidecar, keyed itemId -> keyframeId ->
//                               candidate[]. Optional: a missing sidecar reads as `{}`.
//   3. pipeline.schema.json   — the formal JSON Schema (the "definition") for BOTH data files, with
//                               two roots under `$defs`: `pipelineDoc` and `historyDoc`.
//
// This module is the single seam the other scripts (build_viewer, serve_viewer, integrate) import so
// they all agree on where the three files live, how to load/merge/write them atomically, and how to
// validate against the schema. `loadMerged()` reconstructs the PRE-SPLIT in-memory shape (candidates
// spliced back onto each keyframe) so downstream projection/plan code keeps working unchanged.
//
// Node built-ins only (node:fs, node:path) — no npm deps, no build step. ESM `.mjs`.

import {
  existsSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

// ── sibling-path resolvers ───────────────────────────────────────────────────────────────────
// The three files always live in the same directory; derive the sidecars from pipeline.json's path.
export function historyPath(pipelinePath) {
  return path.join(path.dirname(pipelinePath), "pipeline.history.json");
}
export function schemaPath(pipelinePath) {
  return path.join(path.dirname(pipelinePath), "pipeline.schema.json");
}

// ── loaders ──────────────────────────────────────────────────────────────────────────────────
export function loadPipeline(pipelinePath) {
  return JSON.parse(readFileSync(pipelinePath, "utf8"));
}

// Tolerate a missing sidecar: an item that has never been attempted simply has no history yet.
export function loadHistory(pipelinePath) {
  const p = historyPath(pipelinePath);
  if (!existsSync(p)) return {};
  return JSON.parse(readFileSync(p, "utf8"));
}

export function loadSchema(pipelinePath) {
  return JSON.parse(readFileSync(schemaPath(pipelinePath), "utf8"));
}

// Splice each keyframe's candidate array back in from already-parsed history
// (itemId -> keyframeId -> candidate[]). Mutates `pipeline` in place and returns it.
//
// This is the single implementation of the spec+history merge; both loadMerged (here) and
// build_viewer's loadValidated reuse it so the splice semantics live in exactly one place.
export function mergeInto(pipeline, history) {
  for (const item of Array.isArray(pipeline.items) ? pipeline.items : []) {
    if (!item || typeof item !== "object") continue;
    const perItem = (history && typeof history === "object" && history[item.id]) || {};
    const splice = (kf) => {
      if (!kf || typeof kf !== "object") return;
      kf.candidates = Array.isArray(perItem[kf.id]) ? perItem[kf.id] : [];
    };
    splice(item.master);
    for (const child of Array.isArray(item.children) ? item.children : []) splice(child);
  }
  return pipeline;
}

// Reconstruct the pre-split shape: parse pipeline.json, then splice each keyframe's candidate array
// back in from history (itemId -> keyframeId -> candidate[]). Downstream projection/plan code reads
// `keyframe.candidates`, so this keeps it working unchanged. Mutates only the freshly-parsed object
// we return; never touches the on-disk files.
//
// NOTE: the merged object intentionally re-adds `candidates` to each keyframe, so it will NOT pass
// validateDoc(..., "pipelineDoc") (whose `keyframe` is additionalProperties:false). Always
// schema-validate the on-disk pipeline.json (via loadPipeline), never the merged result.
export function loadMerged(pipelinePath) {
  return mergeInto(loadPipeline(pipelinePath), loadHistory(pipelinePath));
}

// ── atomic writers ───────────────────────────────────────────────────────────────────────────
// Serialize, write to a temp file in the SAME directory, then rename over the target. Rename within a
// dir is atomic on every OS we run on, so a reader never sees a half-written file. (This temp-file +
// rename idiom is the canonical write path; serve_viewer/build_viewer call writePipeline/writeHistory.)
function writeAtomic(targetPath, obj) {
  const text = JSON.stringify(obj, null, 2) + "\n";
  const dir = path.dirname(targetPath);
  const base = path.basename(targetPath);
  const tmpDir = mkdtempSync(path.join(dir, ".manifest-tmp-"));
  const tmpFile = path.join(tmpDir, base);
  try {
    writeFileSync(tmpFile, text, "utf8");
    renameSync(tmpFile, targetPath);
  } finally {
    // Clean up the temp dir (the file moved out on success; on failure it may remain).
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

export function writePipeline(pipelinePath, obj) {
  writeAtomic(pipelinePath, obj);
}
export function writeHistory(pipelinePath, obj) {
  writeAtomic(historyPath(pipelinePath), obj);
}

// ── compact JSON-Schema-subset validator ───────────────────────────────────────────────────────
// Supports only the constructs the three-file model uses: type (string|array of strings), required,
// properties, additionalProperties (false | subschema), items, enum, oneOf, and local `$ref`
// ("#/$defs/<name>"). Returns an array of human-readable error strings (empty = valid); each carries a
// JSON-path-ish prefix (e.g. `items[0].master.selected`).
//
// Keywords on a node are evaluated ADDITIVELY: `oneOf` contributes its "must match exactly one
// branch" error (if any) into the accumulated errors, and the node's own type/required/properties/
// additionalProperties/items/enum are STILL evaluated on the same node. So a node may carry both a
// shared shape (type/required/properties) and a oneOf that selects among additive variants.
// Caveat: `$ref` must stand alone — sibling keywords placed beside a `$ref` are NOT evaluated (the
// ref resolves and returns). No schema in the three-file model puts siblings beside a `$ref`.
const TYPE_NAMES = ["object", "array", "string", "number", "integer", "boolean", "null"];

function typeOk(value, t) {
  switch (t) {
    case "object":
      return value !== null && typeof value === "object" && !Array.isArray(value);
    case "array":
      return Array.isArray(value);
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "null":
      return value === null;
    default:
      return false;
  }
}

function resolveRef(ref, rootSchema) {
  // Only local "#/$defs/<name>" pointers are supported.
  const m = /^#\/\$defs\/(.+)$/.exec(ref);
  const defs = rootSchema && rootSchema.$defs;
  if (!m || !defs || !(m[1] in defs)) return null;
  return defs[m[1]];
}

// Validate `value` against `schema`, collecting errors into `errors` with a path prefix `at`.
function checkNode(value, schema, rootSchema, at, errors) {
  if (!schema || typeof schema !== "object") return;

  if (typeof schema.$ref === "string") {
    const target = resolveRef(schema.$ref, rootSchema);
    if (!target) {
      errors.push(`${at}: unresolved $ref ${schema.$ref}`);
      return;
    }
    checkNode(value, target, rootSchema, at, errors);
    return;
  }

  if (Array.isArray(schema.oneOf)) {
    // Evaluate oneOf ADDITIVELY: push its mismatch (if any) and fall through so the node's own
    // sibling keywords (type/required/properties/…) below are still checked on the same value.
    let matches = 0;
    let closest = null; // branch with the FEWEST sub-errors, to explain a zero-match failure.
    for (const branch of schema.oneOf) {
      const sub = [];
      checkNode(value, branch, rootSchema, at, sub);
      if (sub.length === 0) {
        matches += 1;
      } else if (closest === null || sub.length < closest.length) {
        closest = sub;
      }
    }
    if (matches === 0) {
      // Append the closest branch's reasons so a hand-editor sees WHY nothing matched.
      const why = closest && closest.length ? ` (closest branch: ${closest.join("; ")})` : "";
      errors.push(`${at}: expected to match exactly one schema (oneOf), matched 0${why}`);
    } else if (matches > 1) {
      errors.push(`${at}: matched ${matches} (expected exactly 1) schema (oneOf)`);
    }
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const known = types.filter((t) => TYPE_NAMES.includes(t));
    if (known.length && !known.some((t) => typeOk(value, t))) {
      errors.push(`${at}: expected ${known.join("|")}`);
      return; // shape is wrong; deeper checks would just be noise.
    }
  }

  if (Array.isArray(schema.enum)) {
    const ok = schema.enum.some((e) => e === value);
    if (!ok) {
      errors.push(`${at}: expected one of enum [${schema.enum.map((e) => JSON.stringify(e)).join(", ")}]`);
    }
  }

  // Object-shaped checks.
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (!(key in value)) errors.push(`${at}: missing required property "${key}"`);
      }
    }
    const props = schema.properties && typeof schema.properties === "object" ? schema.properties : {};
    for (const [key, sub] of Object.entries(props)) {
      if (key in value) checkNode(value[key], sub, rootSchema, `${at}.${key}`, errors);
    }
    if (schema.additionalProperties !== undefined) {
      const named = new Set(Object.keys(props));
      for (const key of Object.keys(value)) {
        if (named.has(key)) continue;
        if (schema.additionalProperties === false) {
          errors.push(`${at}.${key}: unexpected property (additionalProperties: false)`);
        } else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
          checkNode(value[key], schema.additionalProperties, rootSchema, `${at}.${key}`, errors);
        }
      }
    }
  }

  // Array-shaped checks.
  if (Array.isArray(value) && schema.items && typeof schema.items === "object") {
    value.forEach((el, i) => checkNode(el, schema.items, rootSchema, `${at}[${i}]`, errors));
  }
}

// Validate `doc` against `subSchema`, resolving any `$ref` against `rootSchema.$defs`. Returns an
// array of error strings (empty = valid).
export function validate(doc, subSchema, rootSchema) {
  const errors = [];
  checkNode(doc, subSchema, rootSchema, "root", errors);
  return errors;
}

// Convenience: validate `doc` against `rootSchema.$defs[defName]`, using `rootSchema` for refs.
export function validateDoc(doc, rootSchema, defName) {
  const defs = rootSchema && rootSchema.$defs;
  if (!defs || !(defName in defs)) {
    return [`root: schema has no $defs.${defName}`];
  }
  return validate(doc, defs[defName], rootSchema);
}
