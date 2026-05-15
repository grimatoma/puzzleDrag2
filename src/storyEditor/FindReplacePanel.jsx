// Global find/replace modal for story dialogue. Lets a writer search every
// beat's title / body / dialogue lines / choice labels for a substring (or
// regex), preview the matches with surrounding context, and apply the
// replacement across all of them in a single operation.

import { useMemo, useState, useEffect } from "react";
import { C, NPCS, Portrait } from "./shared.jsx";
import {
  findInStory, applyReplacements, affectedBeatCount, isReplacementSafe,
} from "./findReplace.js";

const FIELD_LABEL = { title: "Title", body: "Body", line: "Line", choice: "Choice" };

function HighlightedSnippet({ snippet }) {
  // The snippet uses « / » sentinels around the matched substring.
  const parts = String(snippet).split(/(«[^»]*»)/g);
  return (
    <span style={{ font: "italic 400 11px/1.45 Georgia,serif", color: C.inkLight }}>
      {parts.map((p, i) => {
        if (p.startsWith("«") && p.endsWith("»")) {
          return (
            <span key={i} style={{ background: "rgba(214,97,42,0.20)", color: C.ink,
              padding: "0 2px", borderRadius: 2, fontStyle: "normal", fontWeight: 600 }}>
              {p.slice(1, -1)}
            </span>
          );
        }
        return p;
      })}
    </span>
  );
}

function MatchRow({ match, onJump }) {
  return (
    <button onClick={() => onJump && onJump(match.beatId)}
      style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%",
        textAlign: "left", padding: "7px 10px", border: "none", background: "transparent",
        cursor: "pointer", borderTop: `1px solid ${C.border}33` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
        <span style={{ font: "600 11px/1.2 system-ui", color: C.ink, flex: 1,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {match.beatTitle}
        </span>
        <span style={{ font: "700 8px/1 system-ui", padding: "1px 6px",
          background: "rgba(214,97,42,0.10)", color: C.emberDeep, borderRadius: 999,
          letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {FIELD_LABEL[match.field] || match.field}
        </span>
        {match.speaker && <Portrait npcKey={match.speaker} size={14} />}
        <span style={{ font: "600 9px/1 ui-monospace,monospace", color: C.inkSubtle }}>
          {match.count > 1 ? `×${match.count}` : ""}
        </span>
      </div>
      <div style={{ marginTop: 3 }}>
        <HighlightedSnippet snippet={match.snippet} />
      </div>
      <div style={{ font: "500 9px/1 ui-monospace,monospace", color: C.inkSubtle, marginTop: 3 }}>
        {match.beatId}{match.choiceId ? ` · choice ${match.choiceId}` : ""}{match.speaker ? ` · ${NPCS[match.speaker]?.name || match.speaker}` : ""}
      </div>
    </button>
  );
}

export default function FindReplacePanel({ open, draft, onClose, onApply, onJumpToBeat }) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regex, setRegex] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const findResult = useMemo(() => findInStory(draft, query, { caseSensitive, regex }), [draft, query, caseSensitive, regex]);
  const beatCount = affectedBeatCount(findResult);
  const safe = isReplacementSafe(query, replacement, { caseSensitive, regex });

  if (!open) return null;

  const handleApply = () => {
    if (!safe) return;
    const next = applyReplacements(draft, query, replacement, { caseSensitive, regex });
    onApply(next);
    onClose();
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,12,6,0.55)", zIndex: 49 }} aria-hidden />
      <div role="dialog" aria-label="Find and replace"
        style={{ position: "fixed", top: "8vh", left: "50%", transform: "translateX(-50%)", zIndex: 50,
          width: "min(96vw, 720px)", maxHeight: "84vh", display: "flex", flexDirection: "column",
          background: "#fff", borderRadius: 12, border: `1.5px solid ${C.border}`,
          boxShadow: "0 24px 64px -16px rgba(28,18,8,0.55)" }}>
        <header style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`,
          background: C.parchmentDeep, borderRadius: "12px 12px 0 0",
          display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ font: "700 10px/1 system-ui", letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkLight }}>
            Find &amp; replace
          </span>
          <button onClick={onClose} aria-label="Close" title="Close"
            style={{ marginLeft: "auto", width: 22, height: 22, borderRadius: 6, border: `1px solid ${C.border}`,
              background: "#fff", color: C.inkSubtle, font: "700 12px/1 system-ui", cursor: "pointer" }}>✕</button>
        </header>
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}66`,
          display: "flex", flexDirection: "column", gap: 8 }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find…" autoFocus
            style={{ padding: "8px 10px", borderRadius: 6, border: `1.5px solid ${C.border}`, background: "#fff",
              font: "400 13px/1 system-ui", color: C.ink, outline: "none" }} />
          <input value={replacement} onChange={(e) => setReplacement(e.target.value)} placeholder="Replace with…"
            style={{ padding: "8px 10px", borderRadius: 6, border: `1.5px solid ${C.border}`, background: "#fff",
              font: "400 13px/1 system-ui", color: C.ink, outline: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 5, font: "500 11px/1 system-ui", color: C.inkLight }}>
              <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} />
              Case sensitive
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 5, font: "500 11px/1 system-ui", color: C.inkLight }}>
              <input type="checkbox" checked={regex} onChange={(e) => setRegex(e.target.checked)} />
              Regex
            </label>
            <span style={{ marginLeft: "auto", font: "600 11px/1 system-ui", color: C.inkSubtle }}>
              {findResult.total} match{findResult.total === 1 ? "" : "es"} in {beatCount} beat{beatCount === 1 ? "" : "s"}
            </span>
            <button onClick={handleApply} disabled={!safe || findResult.total === 0}
              style={{ padding: "6px 12px", borderRadius: 6,
                border: `1.5px solid ${(safe && findResult.total > 0) ? C.emberDeep : C.border}`,
                background: (safe && findResult.total > 0) ? C.ember : "rgba(0,0,0,0.05)",
                color: (safe && findResult.total > 0) ? "#fff" : C.inkSubtle,
                font: "700 11px/1 system-ui", cursor: (safe && findResult.total > 0) ? "pointer" : "not-allowed" }}>
              Apply
            </button>
          </div>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {!query && (
            <div style={{ padding: "20px 14px", font: "italic 400 12px/1.45 system-ui", color: C.inkSubtle, textAlign: "center" }}>
              Search every beat's title, body, dialogue lines, and choice labels. Apply rewrites in one click.
            </div>
          )}
          {query && findResult.total === 0 && (
            <div style={{ padding: "20px 14px", font: "italic 400 12px/1.45 system-ui", color: C.inkSubtle, textAlign: "center" }}>
              No matches for "{query}".
            </div>
          )}
          {findResult.matches.slice(0, 200).map((m, i) => (
            <MatchRow key={`${m.beatId}-${m.field}-${m.index}-${i}`} match={m} onJump={onJumpToBeat} />
          ))}
          {findResult.matches.length > 200 && (
            <div style={{ padding: "10px 14px", font: "italic 400 11px/1.4 system-ui", color: C.inkSubtle }}>
              +{findResult.matches.length - 200} more matches (apply also affects them).
            </div>
          )}
        </div>
      </div>
    </>
  );
}
