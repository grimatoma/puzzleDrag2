// Cmd-K command palette modal for the Balance Manager.
//
// Opens with Cmd/Ctrl-K. Type to filter every known balance entity
// (tiles, items, recipes, buildings, biomes, zones, NPCs, keepers,
// workers, bosses, achievements, story beats, flags); arrow keys cycle
// the highlighted result; Enter picks it (which navigates to the
// appropriate tab); Escape closes.
//
// The ranking + index live in commandPalette.js — this component is just
// the input box, results list, and keyboard handling.

import { useEffect, useMemo, useRef, useState } from "react";
import { COLORS } from "./shared.jsx";
import { buildCommandIndex, searchCommandIndex } from "./commandPalette.js";

const KIND_TONE = {
  tile:        { bg: "#fff5e6", fg: COLORS.ember,    label: "TILE" },
  item:        { bg: "#fff5e6", fg: COLORS.ember,    label: "ITEM" },
  recipe:      { bg: "#fbf6ea", fg: COLORS.inkLight, label: "RECIPE" },
  building:    { bg: "#f4ecd8", fg: COLORS.inkLight, label: "BUILDING" },
  biome:       { bg: "#eef6ea", fg: COLORS.greenDeep, label: "BIOME" },
  zone:        { bg: "#eef6ea", fg: COLORS.greenDeep, label: "ZONE" },
  npc:         { bg: "#f7edff", fg: "#5a3d83",       label: "NPC" },
  keeper:      { bg: "#f7edff", fg: "#5a3d83",       label: "KEEPER" },
  worker:      { bg: "#e8f0f7", fg: "#2f5f7a",       label: "WORKER" },
  boss:        { bg: "#fff0eb", fg: COLORS.red,      label: "BOSS" },
  achievement: { bg: "#fff7da", fg: "#7a5810",       label: "ACHIEV" },
  beat:        { bg: "#fbf6ea", fg: COLORS.inkLight, label: "BEAT" },
  flag:        { bg: "#fff0eb", fg: COLORS.red,      label: "FLAG" },
};
const DEFAULT_TONE = { bg: COLORS.parchmentDeep, fg: COLORS.inkLight, label: "ENTRY" };

export default function CommandPalette({ open, onClose, onSelect }) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const index = useMemo(() => buildCommandIndex(), []);
  const results = useMemo(() => searchCommandIndex(index, query, 12), [index, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      const id = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [open]);

  useEffect(() => { setCursor(0); }, [query]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-row-index="${cursor}"]`);
    if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "nearest" });
  }, [cursor, results.length]);

  if (!open) return null;

  const pick = (entry) => {
    if (!entry) return;
    onSelect(entry);
    onClose();
  };

  const onKey = (e) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (results.length === 0 ? 0 : (c + 1) % results.length));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (results.length === 0 ? 0 : (c - 1 + results.length) % results.length));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      pick(results[cursor]);
    }
  };

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: "12vh",
        background: "rgba(20,12,6,0.42)", backdropFilter: "blur(2px)" }}>
      <div role="dialog" aria-label="Command palette" onClick={(e) => e.stopPropagation()}
        style={{ width: "min(92vw, 560px)", maxHeight: "70vh", display: "flex", flexDirection: "column",
          background: "#fff", borderRadius: 12, border: `1.5px solid ${COLORS.border}`,
          boxShadow: "0 24px 64px -16px rgba(40,28,10,0.45)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
          borderBottom: `1px solid ${COLORS.border}`, background: COLORS.parchmentDeep, borderRadius: "12px 12px 0 0" }}>
          <span style={{ fontSize: 16 }}>🔎</span>
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKey}
            placeholder="Search tiles, recipes, buildings, NPCs, beats, flags…"
            style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: `1px solid ${COLORS.border}`, background: "#fff",
              font: "400 13px/1 system-ui", color: COLORS.ink, outline: "none" }} />
          <span style={{ font: "600 9px/1 ui-monospace,monospace", color: COLORS.inkSubtle, padding: "3px 6px",
            background: "#fff", borderRadius: 5, border: `1px solid ${COLORS.border}` }}>ESC</span>
        </div>
        <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          {results.length === 0 && (
            <div style={{ padding: "16px 14px", font: "italic 400 12px/1.4 system-ui", color: COLORS.inkSubtle }}>
              {query.trim() ? `No matches for “${query}”.` : "Start typing to search across every Balance Manager tab."}
            </div>
          )}
          {results.map((entry, idx) => {
            const tone = KIND_TONE[entry.kind] || DEFAULT_TONE;
            const active = idx === cursor;
            return (
              <button key={`${entry.kind}-${entry.id}-${idx}`} data-row-index={idx}
                onMouseEnter={() => setCursor(idx)} onClick={() => pick(entry)}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                  padding: "8px 14px", border: "none", cursor: "pointer",
                  background: active ? "rgba(214,97,42,0.10)" : "transparent" }}>
                <span style={{ display: "inline-block", padding: "2px 7px", borderRadius: 6,
                  background: tone.bg, color: tone.fg, font: "700 9px/1 ui-monospace,monospace", letterSpacing: "0.06em",
                  flexShrink: 0, minWidth: 56, textAlign: "center" }}>
                  {tone.label}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: "600 13px/1.2 system-ui", color: COLORS.ink,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {entry.label}
                  </div>
                  <div style={{ font: "400 10px/1.4 system-ui", color: COLORS.inkSubtle,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {entry.sublabel} <span style={{ fontFamily: "ui-monospace,monospace" }}>· {entry.id}</span>
                  </div>
                </div>
                <span style={{ font: "600 9px/1 system-ui", color: COLORS.inkSubtle, padding: "2px 6px",
                  background: COLORS.parchmentDeep, borderRadius: 5, flexShrink: 0 }}>
                  → {entry.tab}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{ padding: "7px 14px", borderTop: `1px solid ${COLORS.border}`,
          background: COLORS.parchmentDeep, borderRadius: "0 0 12px 12px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          font: "italic 400 10px/1 system-ui", color: COLORS.inkSubtle }}>
          <span>↑↓ to move · ↵ to open · Esc to close</span>
          <span>{results.length} result{results.length === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>
  );
}
