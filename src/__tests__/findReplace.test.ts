import { describe, it, expect } from "vitest";
import {
  findInStory, applyReplacements, affectedBeatCount, isReplacementSafe,
} from "../storyEditor/findReplace.js";
import { effectiveBeat, emptyDraft } from "../storyEditor/shared.jsx";

const draftWith = (story) => ({ ...emptyDraft(), story });

describe("findInStory", () => {
  it("matches across title / line / choice fields case-insensitively", () => {
    const d = draftWith({
      newBeats: [{
        id: "x", title: "The HEARTH burns",
        lines: [
          { speaker: "wren", text: "Look at the hearth glow." },
          { speaker: null, text: "She tends the hearthstones." },
        ],
        choices: [{ id: "ok", label: "Visit the hearth keeper" }],
      }],
    });
    const out = findInStory(d, "hearth");
    expect(out.total).toBeGreaterThanOrEqual(4);
    const fields = new Set(out.matches.filter((m) => m.beatId === "x").map((m) => m.field));
    expect(fields.has("title")).toBe(true);
    expect(fields.has("line")).toBe(true);
    expect(fields.has("choice")).toBe(true);
  });

  it("returns no matches for an empty query", () => {
    const out = findInStory(emptyDraft(), "");
    expect(out.total).toBe(0);
  });

  it("supports case-sensitive matching", () => {
    const d = draftWith({
      newBeats: [{ id: "x", title: "Hearth", lines: [{ speaker: null, text: "hearth" }] }],
    });
    const out = findInStory(d, "Hearth", { caseSensitive: true });
    const matchedFields = out.matches.filter((m) => m.beatId === "x").map((m) => m.field);
    expect(matchedFields).toContain("title");
    expect(matchedFields).not.toContain("line");
  });

  it("supports regex queries", () => {
    const d = draftWith({
      newBeats: [{ id: "x", title: "Test", lines: [{ speaker: null, text: "ring1 ring2 ring3" }] }],
    });
    const out = findInStory(d, "ring\\d", { regex: true });
    const xLine = out.matches.find((m) => m.beatId === "x" && m.field === "line");
    expect(xLine.count).toBe(3);
  });

  it("returns zero matches for invalid regex (no throw)", () => {
    const out = findInStory(emptyDraft(), "(", { regex: true });
    expect(out.matches).toEqual([]);
  });

  it("snippet wraps the matched text with sentinel braces", () => {
    const d = draftWith({
      newBeats: [{ id: "x", title: "Phrase", lines: [{ speaker: null, text: "Look for the keyword right here." }] }],
    });
    const out = findInStory(d, "keyword");
    const snippet = out.matches.find((m) => m.beatId === "x" && m.field === "line").snippet;
    expect(snippet).toContain("«keyword»");
  });
});

describe("applyReplacements", () => {
  it("rewrites every match inside a draft beat (lives in story.newBeats)", () => {
    const d = draftWith({
      newBeats: [{
        id: "x", title: "Old name", lines: [{ speaker: null, text: "Old name was old." }],
        choices: [{ id: "ok", label: "Visit old name" }],
      }],
    });
    const next = applyReplacements(d, "old name", "new name");
    const beat = effectiveBeat("x", next);
    expect(beat.title).toBe("new name");
    expect(beat.lines[0].text).toBe("new name was old.");
    expect(beat.choices[0].label).toBe("Visit new name");
  });

  it("writes a patch into story.beats for built-in beats", () => {
    const d = emptyDraft();
    // act1_arrival's title is "A Cold Hearth" → "A Warm Hearth" after replace.
    const next = applyReplacements(d, "Cold Hearth", "Warm Hearth");
    expect(next.story.beats.act1_arrival.title).toBe("A Warm Hearth");
  });

  it("is a no-op when no beats match", () => {
    const d = emptyDraft();
    const next = applyReplacements(d, "this-string-doesnt-exist", "x");
    // Nothing should have been added under story.beats / story.newBeats.
    expect(Object.keys(next.story.beats || {})).toHaveLength(0);
  });

  it("respects the regex flag when applying", () => {
    const d = draftWith({
      newBeats: [{ id: "x", title: "Test", lines: [{ speaker: null, text: "a1 b2 c3" }] }],
    });
    const next = applyReplacements(d, "[abc]\\d", "X", { regex: true });
    const beat = effectiveBeat("x", next);
    expect(beat.lines[0].text).toBe("X X X");
  });

  it("preserves choice ids and speaker fields", () => {
    const d = draftWith({
      newBeats: [{
        id: "x", title: "x", lines: [{ speaker: "wren", text: "go away" }],
        choices: [{ id: "go", label: "go now" }],
      }],
    });
    const next = applyReplacements(d, "go", "leave");
    const beat = effectiveBeat("x", next);
    expect(beat.lines[0].speaker).toBe("wren");
    expect(beat.choices[0].id).toBe("go");
    expect(beat.choices[0].label).toBe("leave now");
  });
});

describe("affectedBeatCount / isReplacementSafe", () => {
  it("affectedBeatCount returns the unique-beat tally from a find result", () => {
    const d = draftWith({
      newBeats: [
        { id: "a", title: "phrase", lines: [{ speaker: null, text: "phrase" }] },
        { id: "b", title: "elsewhere", lines: [{ speaker: null, text: "phrase" }] },
      ],
    });
    expect(affectedBeatCount(findInStory(d, "phrase"))).toBe(2);
  });

  it("isReplacementSafe blocks empty queries", () => {
    expect(isReplacementSafe("", "x")).toBe(false);
  });

  it("isReplacementSafe blocks the no-op (replacement === query) for non-regex", () => {
    expect(isReplacementSafe("foo", "foo")).toBe(false);
  });

  it("isReplacementSafe blocks invalid regex", () => {
    expect(isReplacementSafe("(", "x", { regex: true })).toBe(false);
  });

  it("isReplacementSafe allows distinct query / replacement", () => {
    expect(isReplacementSafe("foo", "bar")).toBe(true);
  });
});
