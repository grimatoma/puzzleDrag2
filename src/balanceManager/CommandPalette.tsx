// Cmd-K command palette modal for the Dev Panel.
//
// Opens with Cmd/Ctrl-K. Type to filter every known balance entity
// (tiles, resources, tools, recipes, buildings, zones, NPCs, workers, bosses,
// abilities, boons, hazards, achievements, daily rewards, seasons, systems);
// arrow keys cycle the highlighted result; Enter picks it (which navigates to
// the wiki article for that entity); Escape closes. With an empty query the
// palette shows recently-opened entries ("Jump back in").
//
// The ranking + index live in commandPalette.ts — this component is just the
// input box, results list, keyboard handling, and dialog focus management.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { COLORS } from "./shared.jsx";
import { buildCommandIndex, rankWithRecents, resolveRecents } from "./commandPalette.js";
import type { CommandEntry } from "./commandPalette.js";
import { getRecents } from "./wiki/recents.js";

interface KindTone { bg: string; fg: string; label: string; }
const KIND_TONE: Record<string, KindTone> = {
  tile:        { bg: "#fff5e6", fg: COLORS.ember,     label: "TILE" },
  resource:    { bg: "#eef6ea", fg: COLORS.greenDeep, label: "RESOURCE" },
  tool:        { bg: "#fbf6ea", fg: COLORS.inkLight,  label: "TOOL" },
  recipe:      { bg: "#fbf6ea", fg: COLORS.inkLight,  label: "RECIPE" },
  building:    { bg: COLORS.parchment, fg: COLORS.inkLight, label: "BUILDING" },
  zone:        { bg: "#eef6ea", fg: COLORS.greenDeep, label: "ZONE" },
  npc:         { bg: "#f7edff", fg: "#5a3d83",        label: "NPC" },
  worker:      { bg: "#e8f0f7", fg: "#2f5f7a",        label: "WORKER" },
  boss:        { bg: "#fff0eb", fg: COLORS.red,       label: "BOSS" },
  ability:     { bg: "#eef0ff", fg: "#3f4f9a",        label: "ABILITY" },
  boon:        { bg: "#fdf0e6", fg: COLORS.emberDeep, label: "BOON" },
  hazard:      { bg: "#fdeceb", fg: COLORS.red,       label: "HAZARD" },
  achievement: { bg: "#fbf3e2", fg: "#9a7a1f",        label: "TROPHY" },
  dailyReward: { bg: "#eef6ea", fg: COLORS.greenDeep, label: "DAILY" },
  season:      { bg: "#eaf3f7", fg: "#2f6f8a",        label: "SEASON" },
  system:      { bg: COLORS.parchmentDeep, fg: COLORS.inkLight, label: "SYSTEM" },
};
const DEFAULT_TONE: KindTone = { bg: COLORS.parchmentDeep, fg: COLORS.inkLight, label: "ENTRY" };

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelect: (entry: CommandEntry) => void;
}

export default function CommandPalette({ open, onClose, onSelect }: CommandPaletteProps) {
  // Mount the stateful inner component only while open — that way query /
  // cursor reset to their initial values on every open without needing a
  // setState-in-effect (forbidden by react-hooks/set-state-in-effect).
  if (!open) return null;
  return <PaletteImpl onClose={onClose} onSelect={onSelect} />;
}

function PaletteImpl({ onClose, onSelect }: { onClose: () => void; onSelect: (entry: CommandEntry) => void }) {
  const [query, setQueryRaw] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const index = useMemo(() => buildCommandIndex(), []);
  // Snapshot recents once per open so the empty-query list is stable while typing.
  const recentKeys = useMemo(() => getRecents(), []);
  const trimmed = query.trim();
  const results = useMemo(
    () => (trimmed ? rankWithRecents(index, query, recentKeys, 12) : resolveRecents(index, recentKeys, 8)),
    [index, query, trimmed, recentKeys],
  );
  // With no query we're showing recents (if any) rather than search hits.
  const showingRecents = !trimmed && results.length > 0;

  // setQuery + cursor reset live together so it's an event handler rather
  // than an effect — eliminates the react-hooks/set-state-in-effect violation.
  const setQuery = (next: string) => { setQueryRaw(next); setCursor(0); };

  useEffect(() => {
    // Remember whatever had focus when the palette opened (the Search button)
    // so focus returns there on close — a screen-reader / keyboard nicety.
    const opener = (typeof document !== "undefined" ? document.activeElement : null) as HTMLElement | null;
    const id = setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      clearTimeout(id);
      if (opener && typeof opener.focus === "function") opener.focus();
    };
  }, []);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-row-index="${cursor}"]`);
    if (el && "scrollIntoView" in el && typeof (el as Element).scrollIntoView === "function") {
      (el as Element).scrollIntoView({ block: "nearest" });
    }
  }, [cursor, results.length]);

  const pick = (entry: CommandEntry | undefined) => {
    if (!entry) return;
    onSelect(entry);
    onClose();
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    // Keep focus inside the dialog: navigation is arrow/mouse driven, so Tab
    // has nowhere useful to go — swallow it rather than letting focus escape to
    // the page behind the modal.
    if (e.key === "Tab") { e.preventDefault(); return; }
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

  const activeRowId = results[cursor] ? `palette-row-${cursor}` : undefined;

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: "12vh",
        background: "rgba(20,12,6,0.42)", backdropFilter: "blur(2px)" }}>
      <div role="dialog" aria-modal="true" aria-label="Command palette" onClick={(e) => e.stopPropagation()}
        style={{ width: "min(92vw, 560px)", maxHeight: "70vh", display: "flex", flexDirection: "column",
          background: "#fff", borderRadius: 12, border: `1.5px solid ${COLORS.border}`,
          boxShadow: "0 24px 64px -16px rgba(40,28,10,0.45)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
          borderBottom: `1px solid ${COLORS.border}`, background: COLORS.parchmentDeep, borderRadius: "12px 12px 0 0" }}>
          <span style={{ fontSize: 16 }} aria-hidden>🔎</span>
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKey}
            role="combobox" aria-expanded={results.length > 0} aria-controls="palette-results"
            aria-activedescendant={activeRowId} aria-autocomplete="list"
            placeholder="Search tiles, recipes, buildings, NPCs, bosses…"
            style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: `1px solid ${COLORS.border}`, background: "#fff",
              font: "400 13px/1 system-ui", color: COLORS.ink, outline: "none" }} />
          <span style={{ font: "600 9px/1 ui-monospace,monospace", color: COLORS.inkSubtle, padding: "3px 6px",
            background: "#fff", borderRadius: 5, border: `1px solid ${COLORS.border}` }}>ESC</span>
        </div>
        <div ref={listRef} id="palette-results" role="listbox" aria-label="Search results" style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          {showingRecents && (
            <div style={{ font: "700 9px/1 ui-monospace,monospace", letterSpacing: "0.08em", textTransform: "uppercase",
              color: COLORS.inkSubtle, padding: "8px 14px 4px" }}>
              Recent
            </div>
          )}
          {results.length === 0 && (
            <div style={{ padding: "16px 14px", font: "italic 400 12px/1.4 system-ui", color: COLORS.inkSubtle }}>
              {trimmed ? `No matches for “${query}”.` : "Start typing to search, or open something to see it here."}
            </div>
          )}
          {results.map((entry, idx) => {
            const tone = KIND_TONE[entry.kind] || DEFAULT_TONE;
            const active = idx === cursor;
            return (
              <button key={`${entry.kind}-${entry.id}-${idx}`} id={`palette-row-${idx}`} data-row-index={idx}
                role="option" aria-selected={active}
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
          <span>{results.length} {showingRecents ? "recent" : "result"}{results.length === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>
  );
}
