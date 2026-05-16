// Localization length report — flags dialogue lines and choice labels
// that are long enough today that German / French / Russian translations
// may overflow the tooltip / dialog frame. The heuristics are simple:
//
//   - `lineLengthCap`        : 120 chars per dialogue line  → "long"
//                              160 chars per dialogue line  → "very long"
//   - `choiceLabelCap`       : 36 chars per choice label    → "long"
//                              52 chars per choice label    → "very long"
//   - estimated translation length = chars × 1.30 (a coarse German bloat
//     factor), shown for comparison against the cap.
//
// Pure module; no React.

import { effectiveBeat, allBeatIds, NPCS } from "./shared.jsx";

export const L10N_THRESHOLDS = Object.freeze({
  lineWarn: 120,
  lineErr:  160,
  choiceWarn: 36,
  choiceErr:  52,
  expansionFactor: 1.30,           // German averages ~30% more chars than English
});

function classifyLine(chars) {
  if (chars >= L10N_THRESHOLDS.lineErr) return "very long";
  if (chars >= L10N_THRESHOLDS.lineWarn) return "long";
  return null;
}

function classifyChoice(chars) {
  if (chars >= L10N_THRESHOLDS.choiceErr) return "very long";
  if (chars >= L10N_THRESHOLDS.choiceWarn) return "long";
  return null;
}

/**
 * Walk every beat and emit `[{ beatId, beatTitle, field, severity, chars,
 * translated, text, speaker?, choiceId? }]` for each flagged line / choice.
 * The list is sorted with very-long first, then by descending chars.
 */
export function computeLocalizationReport(draft) {
  const out = [];
  for (const id of allBeatIds(draft)) {
    const beat = effectiveBeat(id, draft);
    if (!beat) continue;
    const title = beat.title || id;
    if (Array.isArray(beat.lines)) {
      for (let i = 0; i < beat.lines.length; i += 1) {
        const line = beat.lines[i];
        const text = typeof line?.text === "string" ? line.text : "";
        const chars = text.length;
        const severity = classifyLine(chars);
        if (!severity) continue;
        out.push({
          beatId: id, beatTitle: title,
          field: "line", index: i,
          speaker: line.speaker || null,
          chars, translated: Math.round(chars * L10N_THRESHOLDS.expansionFactor),
          severity, text,
        });
      }
    }
    if (Array.isArray(beat.choices)) {
      for (let i = 0; i < beat.choices.length; i += 1) {
        const c = beat.choices[i];
        const text = typeof c?.label === "string" ? c.label : "";
        const chars = text.length;
        const severity = classifyChoice(chars);
        if (!severity) continue;
        out.push({
          beatId: id, beatTitle: title,
          field: "choice", index: i,
          choiceId: c.id || null,
          chars, translated: Math.round(chars * L10N_THRESHOLDS.expansionFactor),
          severity, text,
        });
      }
    }
  }
  out.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "very long" ? -1 : 1;
    return b.chars - a.chars;
  });
  return out;
}

/** Summary stats — useful for the panel header. */
export function summariseLocalization(report) {
  const long = report.filter((r) => r.severity === "long").length;
  const veryLong = report.filter((r) => r.severity === "very long").length;
  return { total: report.length, long, veryLong };
}

/** Re-export for callers that need it. */
export { NPCS };
