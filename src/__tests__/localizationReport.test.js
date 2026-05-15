import { describe, it, expect } from "vitest";
import {
  computeLocalizationReport, summariseLocalization, L10N_THRESHOLDS,
} from "../storyEditor/localizationReport.js";
import { emptyDraft } from "../storyEditor/shared.jsx";

const draftWith = (story) => ({ ...emptyDraft(), story });

describe("computeLocalizationReport", () => {
  it("flags lines that exceed the warn threshold", () => {
    const longLine = "x".repeat(L10N_THRESHOLDS.lineWarn + 5);
    const d = draftWith({
      newBeats: [{ id: "x", title: "X", lines: [{ speaker: null, text: longLine }] }],
    });
    const out = computeLocalizationReport(d);
    const flagged = out.find((r) => r.beatId === "x" && r.field === "line");
    expect(flagged?.severity).toBe("long");
    expect(flagged.chars).toBe(longLine.length);
    expect(flagged.translated).toBeGreaterThan(flagged.chars);
  });

  it("escalates to 'very long' past the err threshold", () => {
    const huge = "y".repeat(L10N_THRESHOLDS.lineErr + 10);
    const d = draftWith({
      newBeats: [{ id: "x", title: "X", lines: [{ speaker: null, text: huge }] }],
    });
    const out = computeLocalizationReport(d);
    const flagged = out.find((r) => r.beatId === "x" && r.field === "line");
    expect(flagged.severity).toBe("very long");
  });

  it("flags choice labels at their own cap", () => {
    const label = "z".repeat(L10N_THRESHOLDS.choiceWarn + 5);
    const d = draftWith({
      newBeats: [{
        id: "x", title: "X",
        lines: [{ speaker: null, text: "short" }],
        choices: [{ id: "wordy", label }],
      }],
    });
    const out = computeLocalizationReport(d);
    const flagged = out.find((r) => r.beatId === "x" && r.field === "choice");
    expect(flagged?.severity).toBe("long");
    expect(flagged.chars).toBe(label.length);
  });

  it("ignores short lines and labels", () => {
    const d = draftWith({
      newBeats: [{
        id: "x", title: "X",
        lines: [{ speaker: null, text: "fine" }],
        choices: [{ id: "ok", label: "short" }],
      }],
    });
    const out = computeLocalizationReport(d).filter((r) => r.beatId === "x");
    expect(out).toEqual([]);
  });

  it("sorts very-long first, then by descending char count", () => {
    const veryLong = "v".repeat(L10N_THRESHOLDS.lineErr + 5);
    const mediumLong = "m".repeat(L10N_THRESHOLDS.lineWarn + 5);
    const d = draftWith({
      newBeats: [
        { id: "med", title: "M", lines: [{ speaker: null, text: mediumLong }] },
        { id: "vv", title: "V", lines: [{ speaker: null, text: veryLong }] },
      ],
    });
    const out = computeLocalizationReport(d).filter((r) => r.beatId === "med" || r.beatId === "vv");
    expect(out[0].beatId).toBe("vv");
  });

  it("computes the translation-expansion estimate", () => {
    const text = "a".repeat(100);
    const d = draftWith({
      newBeats: [{ id: "x", title: "X", lines: [{ speaker: null, text: text + "more" }] }],
    });
    const out = computeLocalizationReport(d);
    if (out.length > 0) {
      const r = out[0];
      expect(r.translated).toBe(Math.round(r.chars * L10N_THRESHOLDS.expansionFactor));
    }
  });

  it("returns an empty list when no content exceeds the threshold", () => {
    const out = computeLocalizationReport(emptyDraft());
    expect(out.every((r) => r.chars >= L10N_THRESHOLDS.lineWarn || r.chars >= L10N_THRESHOLDS.choiceWarn)).toBe(true);
  });
});

describe("summariseLocalization", () => {
  it("counts long vs very-long entries", () => {
    const summary = summariseLocalization([
      { severity: "long" }, { severity: "very long" }, { severity: "long" },
    ]);
    expect(summary).toEqual({ total: 3, long: 2, veryLong: 1 });
  });
});
