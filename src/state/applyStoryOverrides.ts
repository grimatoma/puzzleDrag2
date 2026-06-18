// Runtime counterpart to the editor's `effectiveBeat` (src/storyEditor/shared.tsx):
// apply a `draft.story` override doc onto the built-in STORY_BEATS / SIDE_BEATS so
// authored edits in the `/story/` editor reach the running game. The editor saves
// the draft to `localStorage["hearth.balance.draft"]`; src/story.ts re-derives its
// effective beat arrays from it via `setStoryOverrides`.
//
// This module is PURE and free of React / DOM / Phaser, so it is safe to import
// from src/story.ts (the game bundle), the Phaser-free editor bundle, and
// node-env tests. Every untrusted field flows through the shared sanitizers in
// src/config/storySanitizers.ts — the single trust boundary for hand-editable
// drafts. The merge MUST agree with the editor's `effectiveBeat`; keep the field
// list there and here identical.

import type { Beat } from "../story.js";
import {
  sanitizeBeatLines,
  sanitizeChoiceArray,
  sanitizeBeatOnComplete,
  sanitizeBeatRepeatCooldown,
  sanitizeBeatTrigger,
  sanitizeCond,
} from "../config/storySanitizers.js";

/** The `draft.story` slice shape (validated upstream by `storyOverridesSchema`). */
export interface StoryOverrides {
  /** Partial patches over a built-in beat, keyed by beat id. */
  beats?: Record<string, Record<string, unknown>>;
  /** Whole author-created beats (side / resolution branches, or extra main beats). */
  newBeats?: Array<Record<string, unknown>>;
  /** Built-in beat ids to hide / disable. */
  suppressedBeats?: string[];
  /** Authoring metadata only — not applied to the beat arrays (matches the editor). */
  repeatCooldowns?: Record<string, number>;
}

/** Which built-in lane these overrides target. newBeats route by their `act`. */
export type StoryLane = "main" | "side";

const has = (o: Record<string, unknown>, k: string): boolean =>
  Object.prototype.hasOwnProperty.call(o, k);

/**
 * Apply one `draft.story.beats[id]` patch onto a base beat. Ports the editor's
 * `effectiveBeat` patch logic field-for-field, PLUS the native `when:` condition
 * (which the editor's `effectiveBeat` historically dropped). The base is copied
 * verbatim and is never sanitized — only the untrusted `ov` patch is whitelisted.
 */
function applyBeatPatch(base: Beat, ov: Record<string, unknown>): Beat {
  const merged: Beat = { ...base };

  if (typeof ov.title === "string" && ov.title.length > 0) merged.title = ov.title;
  if (typeof ov.scene === "string") merged.scene = ov.scene.length > 0 ? ov.scene : undefined;
  if (typeof ov.body === "string") merged.body = ov.body.length > 0 ? ov.body : undefined;
  if (Array.isArray(ov.lines)) merged.lines = sanitizeBeatLines(ov.lines);
  if (Array.isArray(ov.choices)) {
    const arr = sanitizeChoiceArray(ov.choices);
    merged.choices = arr && arr.length > 0 ? (arr as Beat["choices"]) : undefined;
  } else if (ov.choices && typeof ov.choices === "object" && Array.isArray(base.choices)) {
    // Object-form choice patch: relabel existing choices by id (label only).
    const choiceOverrides = ov.choices as Record<string, { label?: string } | undefined>;
    merged.choices = base.choices.map((c) => ({ ...c, label: choiceOverrides[c.id]?.label ?? c.label }));
  }

  // Legacy `trigger:` path — kept for older editor-draft round-trips. Applied
  // before `when:` so the native condition always wins (see below).
  if (ov.trigger) { const t = sanitizeBeatTrigger(ov.trigger); if (t) merged.trigger = t as Beat["trigger"]; }
  // Native firing condition. The editor persists picked triggers as `when:` (a
  // Cond tree); honour it via sanitizeCond and clear any stale legacy `trigger:`.
  if (has(ov, "when")) {
    const c = sanitizeCond(ov.when);
    if (c) { merged.when = c; delete merged.trigger; } else delete merged.when;
  }

  if (has(ov, "repeat")) merged.repeat = ov.repeat === true ? true : undefined;
  if (has(ov, "repeatCooldown")) {
    const cd = sanitizeBeatRepeatCooldown(ov.repeatCooldown);
    if (cd) merged.repeatCooldown = cd; else delete merged.repeatCooldown;
  }
  if (has(ov, "onComplete")) {
    const oc = sanitizeBeatOnComplete(ov.onComplete);
    if (oc) merged.onComplete = { ...(base.onComplete || {}), ...oc };
  }
  return merged;
}

/**
 * Sanitise an author-created beat from `draft.story.newBeats` for runtime use.
 * The editor authors these through sanitized inputs, but a draft lives in
 * hand-editable localStorage, so re-validate the firing condition (the field the
 * evaluator walks). Other content fields are defensive at render time
 * (beatLines / beatChoices) and pass through to match the editor preview.
 */
function sanitizeNewBeat(nb: Record<string, unknown>): Beat {
  const out = { ...nb } as Beat;
  if (has(nb, "when")) {
    const c = sanitizeCond(nb.when);
    if (c) out.when = c; else delete out.when;
  }
  if (nb.trigger) {
    const t = sanitizeBeatTrigger(nb.trigger);
    if (t) out.trigger = t as Beat["trigger"]; else delete out.trigger;
  }
  return out;
}

/**
 * Apply a `draft.story` override doc onto one built-in beat lane.
 *
 * @param builtins  the raw built-in beats (STORY_BEATS or SIDE_BEATS).
 * @param story     the draft.story override slice (null / empty → exact no-op).
 * @param lane      "main" includes only newBeats WITH a numeric `act`; "side"
 *                  only those WITHOUT (matches the editor's lane model — drafts
 *                  default to the side lane). `beats[]` patches and
 *                  `suppressedBeats[]` apply to whichever lane owns the id.
 *
 * Returns a NEW array; unpatched built-ins keep their original object identity
 * (so an empty override is a deep, reference-stable no-op). A newBeat whose id
 * collides with a built-in replaces it (matching editor `effectiveBeat`, which
 * checks draft beats first). Built-ins stay in their original order; newBeats are
 * appended at the end of the lane so the strict act-order scan is preserved. The
 * function is total: malformed entries are dropped, never thrown on.
 */
export function applyStoryOverrides(
  builtins: readonly Beat[],
  story: StoryOverrides | null | undefined,
  lane: StoryLane,
): Beat[] {
  if (!story || typeof story !== "object") return builtins.slice();

  const beatsMap = story.beats && typeof story.beats === "object" ? story.beats : {};
  const suppressed = new Set(
    Array.isArray(story.suppressedBeats)
      ? story.suppressedBeats.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : [],
  );
  const laneNewBeats = (Array.isArray(story.newBeats) ? story.newBeats : [])
    .filter((b): b is Record<string, unknown> => !!b && typeof b === "object" && typeof b.id === "string" && (b.id as string).length > 0)
    .filter((b) => (lane === "main" ? typeof b.act === "number" : typeof b.act !== "number"));
  const newBeatIds = new Set(laneNewBeats.map((b) => b.id as string));

  const out: Beat[] = [];
  for (const base of builtins) {
    if (suppressed.has(base.id)) continue;   // suppressedBeats removes a built-in
    if (newBeatIds.has(base.id)) continue;   // a newBeat of the same id replaces it (appended below)
    const ov = beatsMap[base.id];
    out.push(ov && typeof ov === "object" ? applyBeatPatch(base, ov) : base);
  }
  for (const nb of laneNewBeats) {
    let beat = sanitizeNewBeat(nb);
    const ov = beatsMap[nb.id as string];    // a newBeat may also carry a beats[] patch
    if (ov && typeof ov === "object") beat = applyBeatPatch(beat, ov);
    out.push(beat);
  }
  return out;
}
