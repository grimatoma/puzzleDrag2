// Per-NPC voice fingerprint — side-by-side lexical comparison.
// Catches drift in character voice (avg line length, vocabulary
// richness, question/exclamation patterns, common openings) that's
// otherwise invisible until a writer compares two acts by hand.

import { useMemo } from "react";
import { C, Portrait } from "./shared.jsx";
import { computeVoiceFingerprints } from "./voiceFingerprint.js";

const PUNCT_LABEL = {
  question: "?",
  exclaim:  "!",
  period:   ".",
  ellipsis: "…",
};

function Stat({ label, value, hint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column",
      padding: "5px 8px", background: C.parchmentDeep, borderRadius: 6,
      border: `1px solid ${C.border}66` }}>
      <span style={{ font: "700 8px/1 system-ui", letterSpacing: "0.08em",
        textTransform: "uppercase", color: C.inkSubtle }}>{label}</span>
      <span style={{ font: "700 14px/1 system-ui", color: C.ink }}>{value}</span>
      {hint && <span style={{ font: "italic 400 9px/1.2 system-ui", color: C.inkSubtle }}>{hint}</span>}
    </div>
  );
}

function VoiceCard({ row }) {
  const totalPunct = Object.values(row.punctMix).reduce((s, n) => s + n, 0);
  return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 10, overflow: "hidden",
      display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "9px 11px", borderBottom: `1px solid ${C.border}`,
        background: C.parchmentDeep, display: "flex", alignItems: "center", gap: 8 }}>
        {row.isNarrator
          ? <span style={{ width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center",
              background: "linear-gradient(160deg,#6a5a40,#2a1e10)", color: "#fff",
              font: "700 11px/1 system-ui" }}>✎</span>
          : <Portrait npcKey={row.key} size={22} />}
        <span style={{ font: "700 12px/1.2 system-ui", color: row.color || C.ink, flex: 1 }}>
          {row.name}
        </span>
        <span style={{ font: "600 9px/1 system-ui", color: C.inkSubtle }}>
          {row.lineCount} line{row.lineCount === 1 ? "" : "s"}
        </span>
      </header>
      <div style={{ padding: "8px 10px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
        <Stat label="Words"        value={row.wordCount} hint={`${row.avgLineWords} per line`} />
        <Stat label="Avg word"     value={`${row.avgWordChars}c`} hint="chars per word" />
        <Stat label="Unique words" value={row.uniqueWords} hint={`${Math.round(row.vocabularyRatio * 100)}% vocab ratio`} />
        <Stat label="Chars total"  value={row.charCount.toLocaleString()} />
      </div>
      <div style={{ padding: "6px 11px", borderTop: `1px solid ${C.border}66` }}>
        <div style={{ font: "700 9px/1 system-ui", letterSpacing: "0.08em", textTransform: "uppercase",
          color: C.inkSubtle, marginBottom: 4 }}>Top line openers</div>
        {row.topStarts.length === 0
          ? <div style={{ font: "italic 400 10px/1 system-ui", color: C.inkSubtle }}>— none —</div>
          : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {row.topStarts.map(({ word, count }) => (
                <span key={word} style={{ font: "500 10px/1.3 ui-monospace,monospace",
                  padding: "2px 6px", borderRadius: 999, background: "rgba(214,97,42,0.10)",
                  color: C.emberDeep, border: "1px solid rgba(214,97,42,0.25)" }}>
                  {word} ×{count}
                </span>
              ))}
            </div>
          )}
      </div>
      <div style={{ padding: "6px 11px", borderTop: `1px solid ${C.border}66`, background: "rgba(43,34,24,0.03)" }}>
        <div style={{ font: "700 9px/1 system-ui", letterSpacing: "0.08em", textTransform: "uppercase",
          color: C.inkSubtle, marginBottom: 4 }}>Ending punctuation</div>
        {totalPunct === 0
          ? <div style={{ font: "italic 400 10px/1 system-ui", color: C.inkSubtle }}>— none counted —</div>
          : (
            <div style={{ display: "flex", gap: 4 }}>
              {Object.entries(PUNCT_LABEL).map(([key, glyph]) => {
                const n = row.punctMix[key] || 0;
                const pct = totalPunct > 0 ? Math.round((n / totalPunct) * 100) : 0;
                return (
                  <div key={key} style={{ flex: 1, padding: "3px 6px", background: "#fff", borderRadius: 6,
                    border: `1px solid ${C.border}66`, textAlign: "center" }}>
                    <div style={{ font: "700 13px/1 system-ui", color: C.ink }}>{glyph}</div>
                    <div style={{ font: "500 9px/1 ui-monospace,monospace", color: C.inkSubtle }}>{n}</div>
                    <div style={{ font: "italic 400 8px/1 system-ui", color: C.inkSubtle }}>{pct}%</div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}

export default function VoicePanel({ draft }) {
  const rows = useMemo(() => computeVoiceFingerprints(draft), [draft]);
  if (rows.length === 0) {
    return (
      <div style={{ padding: "14px", font: "italic 400 12px/1.4 system-ui", color: C.inkSubtle,
        background: "#fff", border: `1.5px dashed ${C.border}`, borderRadius: 10 }}>
        No dialogue lines in this draft. Add some lines to surface voice fingerprints.
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
      {rows.map((r) => <VoiceCard key={r.key} row={r} />)}
    </div>
  );
}
