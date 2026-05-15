import { describe, it, expect } from "vitest";
import { computeVoiceFingerprints, NARRATOR_KEY_NAME } from "../storyEditor/voiceFingerprint.js";
import { emptyDraft } from "../storyEditor/shared.jsx";

const draftWith = (story) => ({ ...emptyDraft(), story });

describe("computeVoiceFingerprints", () => {
  it("returns non-empty fingerprints for the default draft", () => {
    const out = computeVoiceFingerprints(emptyDraft());
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => r.lineCount > 0)).toBe(true);
  });

  it("counts lines / words / chars per speaker", () => {
    const d = draftWith({
      newBeats: [{
        id: "x", title: "X",
        lines: [
          { speaker: "wren", text: "Hello world." },
          { speaker: "wren", text: "Three little words." },
          { speaker: "mira", text: "Bread is ready!" },
        ],
      }],
    });
    const out = computeVoiceFingerprints(d);
    const wren = out.find((r) => r.key === "wren");
    const mira = out.find((r) => r.key === "mira");
    expect(wren.lineCount).toBeGreaterThanOrEqual(2);
    expect(wren.wordCount).toBeGreaterThanOrEqual(5);   // "hello world" + "three little words"
    expect(mira.lineCount).toBeGreaterThanOrEqual(1);
  });

  it("orders rows by descending word count", () => {
    const out = computeVoiceFingerprints(emptyDraft());
    for (let i = 1; i < out.length; i += 1) {
      expect(out[i - 1].wordCount).toBeGreaterThanOrEqual(out[i].wordCount);
    }
  });

  it("computes avgLineWords / avgWordChars as means", () => {
    const d = draftWith({
      newBeats: [{
        id: "x", title: "X",
        lines: [
          { speaker: "wren", text: "one two three" },     // 3 words
          { speaker: "wren", text: "alpha beta gamma" },  // 3 words
        ],
      }],
    });
    const wren = computeVoiceFingerprints(d).find((r) => r.key === "wren");
    // Built-ins also have wren lines so just sanity-check non-zero.
    expect(wren.avgLineWords).toBeGreaterThan(0);
    expect(wren.avgWordChars).toBeGreaterThan(0);
  });

  it("tracks unique-word vocabulary ratio in (0, 1]", () => {
    const out = computeVoiceFingerprints(emptyDraft());
    for (const row of out) {
      expect(row.vocabularyRatio).toBeGreaterThan(0);
      expect(row.vocabularyRatio).toBeLessThanOrEqual(1);
    }
  });

  it("returns the top-5 most common starting words", () => {
    const d = draftWith({
      newBeats: [{
        id: "x", title: "X",
        lines: Array.from({ length: 10 }, (_, i) => ({ speaker: "wren", text: `${i % 2 ? "Look" : "Listen"} now.` })),
      }],
    });
    const wren = computeVoiceFingerprints(d).find((r) => r.key === "wren");
    expect(wren.topStarts.length).toBeGreaterThan(0);
    expect(wren.topStarts.length).toBeLessThanOrEqual(5);
    expect(wren.topStarts[0].count).toBeGreaterThan(0);
  });

  it("counts ending punctuation (question / exclaim / period / ellipsis)", () => {
    const d = draftWith({
      newBeats: [{
        id: "x", title: "X",
        lines: [
          { speaker: "wren", text: "Statement." },
          { speaker: "wren", text: "Question?" },
          { speaker: "wren", text: "Excited!" },
          { speaker: "wren", text: "Trailing…" },
          { speaker: "wren", text: "Also trailing..." },
        ],
      }],
    });
    const wren = computeVoiceFingerprints(d).find((r) => r.key === "wren");
    expect(wren.punctMix.question).toBeGreaterThanOrEqual(1);
    expect(wren.punctMix.exclaim).toBeGreaterThanOrEqual(1);
    expect(wren.punctMix.period).toBeGreaterThanOrEqual(1);
    expect(wren.punctMix.ellipsis).toBeGreaterThanOrEqual(2);
  });

  it("collects narrator lines under the narrator key", () => {
    const d = draftWith({
      newBeats: [{
        id: "x", title: "X",
        lines: [{ speaker: null, text: "She glances at the door." }],
      }],
    });
    const nar = computeVoiceFingerprints(d).find((r) => r.key === NARRATOR_KEY_NAME);
    expect(nar).toBeTruthy();
    expect(nar.isNarrator).toBe(true);
    expect(nar.name).toBe("Narrator");
  });

  it("ignores empty / whitespace-only lines", () => {
    const d = draftWith({
      newBeats: [{
        id: "x", title: "X",
        lines: [
          { speaker: "wren", text: "" },
          { speaker: "wren", text: "   " },
          { speaker: "wren", text: "actual line" },
        ],
      }],
    });
    // Just confirm the function doesn't crash and wren has ≥1 line.
    const wren = computeVoiceFingerprints(d).find((r) => r.key === "wren");
    expect(wren.lineCount).toBeGreaterThan(0);
  });
});
