// Extra coverage for the story-editor validation pipeline: orphan / empty /
// duplicate-choice / trigger-loop detection, and the `groupedStoryWarnings`
// helper used by the validation panel.

import { describe, it, expect } from "vitest";
import {
  collectStoryWarnings,
  groupedStoryWarnings,
  STORY_WARNING_TYPES,
  emptyDraft,
} from "../storyEditor/shared.jsx";

const draftWith = (story) => ({ ...emptyDraft(), story });

describe("storyWarnings — extended detectors", () => {
  it("flags an orphan draft beat (no trigger, no incoming choice)", () => {
    const d = draftWith({
      newBeats: [{ id: "branch_lost", title: "Lost Branch", lines: [{ speaker: null, text: "..." }] }],
    });
    const warnings = collectStoryWarnings(d).branch_lost || [];
    expect(warnings.some((w) => w.type === "orphanBeat")).toBe(true);
  });

  it("does not flag a draft beat as orphan if a built-in choice queues it", () => {
    const d = draftWith({
      newBeats: [{ id: "branch_queued", title: "Q", lines: [{ speaker: null, text: "hi" }] }],
      beats: { act1_arrival: { choices: [{ id: "go", label: "Go", outcome: { queueBeat: "branch_queued" } }] } },
    });
    const warnings = collectStoryWarnings(d).branch_queued || [];
    expect(warnings.some((w) => w.type === "orphanBeat")).toBe(false);
  });

  it("does not flag a draft beat as orphan if it has its own trigger", () => {
    const d = draftWith({
      newBeats: [{
        id: "branch_t", title: "T", lines: [{ speaker: null, text: "x" }],
        trigger: { type: "session_start" },
      }],
    });
    const warnings = collectStoryWarnings(d).branch_t || [];
    expect(warnings.some((w) => w.type === "orphanBeat")).toBe(false);
  });

  it("flags an empty beat — no lines, no body, no choices", () => {
    const d = draftWith({
      newBeats: [{ id: "branch_e", title: "Empty", trigger: { type: "session_start" } }],
    });
    const warnings = collectStoryWarnings(d).branch_e || [];
    expect(warnings.some((w) => w.type === "emptyBeat")).toBe(true);
  });

  it("an emptyBeat with only whitespace text is still considered empty", () => {
    const d = draftWith({
      newBeats: [{ id: "branch_ws", title: "WS", lines: [{ speaker: null, text: "   " }], trigger: { type: "session_start" } }],
    });
    const warnings = collectStoryWarnings(d).branch_ws || [];
    expect(warnings.some((w) => w.type === "emptyBeat")).toBe(true);
  });

  it("does not flag a beat with choices as empty (the choice list is content)", () => {
    const d = draftWith({
      newBeats: [{ id: "branch_c", title: "Choices", trigger: { type: "session_start" },
        choices: [{ id: "ok", label: "OK" }] }],
    });
    const warnings = collectStoryWarnings(d).branch_c || [];
    expect(warnings.some((w) => w.type === "emptyBeat")).toBe(false);
  });

  it("flags duplicate choice ids inside a beat", () => {
    const d = draftWith({
      newBeats: [{
        id: "branch_dup", title: "Dup", lines: [{ speaker: null, text: "..." }],
        trigger: { type: "session_start" },
        choices: [
          { id: "a", label: "First A" },
          { id: "a", label: "Second A" },
        ],
      }],
    });
    const warnings = collectStoryWarnings(d).branch_dup || [];
    expect(warnings.some((w) => w.type === "duplicateChoice" && w.choiceId === "a")).toBe(true);
  });

  it("flags a choice with an empty label", () => {
    const d = draftWith({
      newBeats: [{
        id: "branch_lbl", title: "Lbl", lines: [{ speaker: null, text: "..." }],
        trigger: { type: "session_start" },
        choices: [{ id: "go", label: "   " }],
      }],
    });
    const warnings = collectStoryWarnings(d).branch_lbl || [];
    expect(warnings.some((w) => w.type === "emptyChoiceLabel")).toBe(true);
  });

  it("detects a self-loop where a beat queues itself", () => {
    const d = draftWith({
      newBeats: [{
        id: "branch_loop", title: "Loop", lines: [{ speaker: null, text: "..." }],
        trigger: { type: "session_start" },
        choices: [{ id: "again", label: "Again", outcome: { queueBeat: "branch_loop" } }],
      }],
    });
    const warnings = collectStoryWarnings(d).branch_loop || [];
    expect(warnings.some((w) => w.type === "triggerLoop")).toBe(true);
  });

  it("detects an indirect loop (A → B → A)", () => {
    const d = draftWith({
      newBeats: [
        { id: "a", title: "A", lines: [{ speaker: null, text: "a" }],
          trigger: { type: "session_start" },
          choices: [{ id: "next", label: "→", outcome: { queueBeat: "b" } }] },
        { id: "b", title: "B", lines: [{ speaker: null, text: "b" }],
          choices: [{ id: "back", label: "↩", outcome: { queueBeat: "a" } }] },
      ],
    });
    const warnings = collectStoryWarnings(d);
    expect((warnings.a || []).some((w) => w.type === "triggerLoop")).toBe(true);
    expect((warnings.b || []).some((w) => w.type === "triggerLoop")).toBe(true);
  });

  it("does not flag a linear chain A → B → C as a loop", () => {
    const d = draftWith({
      newBeats: [
        { id: "a", title: "A", lines: [{ speaker: null, text: "a" }],
          trigger: { type: "session_start" },
          choices: [{ id: "next", label: "→", outcome: { queueBeat: "b" } }] },
        { id: "b", title: "B", lines: [{ speaker: null, text: "b" }],
          choices: [{ id: "next", label: "→", outcome: { queueBeat: "c" } }] },
        { id: "c", title: "C", lines: [{ speaker: null, text: "end" }] },
      ],
    });
    const warnings = collectStoryWarnings(d);
    for (const id of ["a", "b", "c"]) {
      expect((warnings[id] || []).some((w) => w.type === "triggerLoop")).toBe(false);
    }
  });
});

describe("groupedStoryWarnings", () => {
  it("groups every warning under a typed bucket (no warnings lost vs collectStoryWarnings)", () => {
    const d = emptyDraft();
    const flat = Object.values(collectStoryWarnings(d)).flat();
    const out = groupedStoryWarnings(d);
    expect(out.total).toBe(flat.length);
    const groupedItems = out.groups.flatMap((g) => g.items);
    expect(groupedItems).toHaveLength(flat.length);
  });

  it("groups warnings by type with metadata from STORY_WARNING_TYPES", () => {
    const d = draftWith({
      newBeats: [
        { id: "orph", title: "Orphan", lines: [{ speaker: null, text: "..." }] },
        { id: "ept", title: "Empty", trigger: { type: "session_start" } },
      ],
    });
    const out = groupedStoryWarnings(d);
    expect(out.total).toBeGreaterThan(0);
    const types = out.groups.map((g) => g.type);
    expect(types).toContain("orphanBeat");
    expect(types).toContain("emptyBeat");
    const orphan = out.groups.find((g) => g.type === "orphanBeat");
    expect(orphan.label).toBe(STORY_WARNING_TYPES.orphanBeat.label);
    expect(orphan.items.every((item) => item.beatId && item.warning)).toBe(true);
  });

  it("accepts a precomputed byBeat map to avoid recomputation", () => {
    const d = draftWith({
      newBeats: [{ id: "ept", title: "Empty", trigger: { type: "session_start" } }],
    });
    const byBeat = collectStoryWarnings(d);
    const out = groupedStoryWarnings(d, byBeat);
    const expected = Object.values(byBeat).reduce((s, arr) => s + arr.length, 0);
    expect(out.total).toBe(expected);
  });

  it("sorts items within a group by beatId for stable rendering", () => {
    const d = draftWith({
      newBeats: [
        { id: "z_first", title: "Z", trigger: { type: "session_start" } },
        { id: "a_first", title: "A", trigger: { type: "session_start" } },
      ],
    });
    const out = groupedStoryWarnings(d);
    const empty = out.groups.find((g) => g.type === "emptyBeat");
    expect(empty.items.map((i) => i.beatId)).toEqual(["a_first", "z_first"]);
  });
});
