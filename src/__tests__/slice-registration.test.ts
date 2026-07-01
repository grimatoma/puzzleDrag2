import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ACTION_TYPES } from "../types/actions.js";
import { SLICE_PRIMARY_ACTIONS, ALWAYS_RUN_SLICES } from "../state.js";

// Automates the CLAUDE.md "#1 footgun" (the check-slice-action skill): a
// feature-slice-owned action that is NOT handled by coreReducer must be listed
// in SLICE_PRIMARY_ACTIONS (or ALWAYS_RUN_SLICES). Otherwise rawReducer
// short-circuits — when coreReducer returns the same state reference, slices are
// skipped and the action silently "does nothing". The old actionTypes.test.ts
// only spot-checked a hand-copied list; this drives off the live source, so a
// new unregistered pure-slice action fails the gate the moment it is added.
// See reference/docs/projects/24-test-suite-and-infra-review.html §1/§10.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, "..");
const CATALOG = new Set<string>(ACTION_TYPES);

function actionLiterals(text: string, patterns: RegExp[]): Set<string> {
  const out = new Set<string>();
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      // Intersect with the authoritative ACTION_TYPES catalog so switch cases on
      // NON-action values (e.g. a boss modifier `type`, a tool key) are ignored.
      if (CATALOG.has(m[1])) out.add(m[1]);
    }
  }
  return out;
}

// coreReducer dispatches via both `switch (action.type) { case "X" }` and
// `if (action.type === "X")` / `!==` forms, so scan both.
function coreHandledActions(): Set<string> {
  const text = fs.readFileSync(path.join(SRC, "state.ts"), "utf8");
  return actionLiterals(text, [/case\s+"([^"]+)"/g, /\.type\s*(?:===|!==)\s*"([^"]+)"/g]);
}

function sliceHandledActions(): Map<string, Set<string>> {
  const featuresDir = path.join(SRC, "features");
  const byAction = new Map<string, Set<string>>();
  for (const ent of fs.readdirSync(featuresDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const slicePath = path.join(featuresDir, ent.name, "slice.ts");
    if (!fs.existsSync(slicePath)) continue;
    const handled = actionLiterals(fs.readFileSync(slicePath, "utf8"), [
      /case\s+"([^"]+)"/g,
      /\.type\s*===\s*"([^"]+)"/g,
    ]);
    for (const t of handled) {
      if (!byAction.has(t)) byAction.set(t, new Set());
      byAction.get(t)!.add(ent.name);
    }
  }
  return byAction;
}

// Actions applied DIRECTLY to slice reducers, bypassing the gated rawReducer, so
// they are intentionally NOT in the routing sets. `recordBeat()` in
// src/state/storyEffects.ts applies STORY/BEAT_FIRED as
// `runSummarySlice.reduce(storySlice.reduce(state, action), action)` — never
// through the top-level chain — so the SLICE_PRIMARY_ACTIONS gate never applies.
const DIRECT_APPLIED = new Set<string>(["STORY/BEAT_FIRED"]);

describe("slice action registration (CLAUDE.md footgun guard)", () => {
  it("every pure-slice action is in SLICE_PRIMARY_ACTIONS or ALWAYS_RUN_SLICES", () => {
    const registered = new Set<string>([...SLICE_PRIMARY_ACTIONS, ...ALWAYS_RUN_SLICES]);
    const coreHandled = coreHandledActions();
    const sliceHandled = sliceHandledActions();

    const missing: string[] = [];
    for (const [action, slices] of sliceHandled) {
      if (coreHandled.has(action)) continue; // core+slice: core mutates, slices run
      if (registered.has(action)) continue; // properly registered pure-slice action
      if (DIRECT_APPLIED.has(action)) continue; // applied directly, not via rawReducer
      missing.push(`${action} (handled in ${[...slices].join(", ")}/slice.ts)`);
    }

    expect(
      missing,
      `Unregistered pure-slice action(s) — add to SLICE_PRIMARY_ACTIONS in src/state.ts ` +
        `(or ALWAYS_RUN_SLICES if coreReducer also handles it), else they silently no-op:\n  ` +
        missing.join("\n  "),
    ).toEqual([]);
  });
});
