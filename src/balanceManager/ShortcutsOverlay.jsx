// Keyboard-shortcuts overlay — pops up on `?` (and a header button) to
// show every keystroke the Balance Manager and Story Tree Editor support.
// The list is intentionally short and curated; if a shortcut isn't here
// it isn't supposed to be discoverable, so design new features with the
// guideline that they should either earn a row here or live behind a
// visible button.

import { useEffect } from "react";
import { COLORS } from "./shared.jsx";

const SHORTCUTS = Object.freeze([
  {
    section: "Global",
    rows: [
      { keys: ["⌘", "/", "Ctrl", "+", "S"], label: "Save draft" },
      { keys: ["⌘", "/", "Ctrl", "+", "Z"], label: "Undo" },
      { keys: ["⌘", "/", "Ctrl", "+", "Shift", "+", "Z"], label: "Redo" },
      { keys: ["⌘", "/", "Ctrl", "+", "K"], label: "Open command palette" },
      { keys: ["?"], label: "This overlay" },
      { keys: ["Esc"], label: "Close any modal / overlay" },
    ],
  },
  {
    section: "Story Tree Editor",
    rows: [
      { keys: ["⌘", "/", "Ctrl", "+", "F"], label: "Find &amp; replace across all beats" },
      { keys: ["↑", "↓", "←", "→"], label: "Move beat selection on the canvas" },
      { keys: ["Enter"], label: "Preview the selected beat" },
      { keys: ["Drag handle"], label: "Drag a beat to reposition it on the canvas" },
    ],
  },
  {
    section: "Mouse / touch",
    rows: [
      { keys: ["Scroll"], label: "Zoom in/out (story canvas)" },
      { keys: ["Click+drag"], label: "Pan the canvas" },
      { keys: ["Pinch"], label: "Pinch-zoom (touch)" },
    ],
  },
]);

function KeyChip({ children }) {
  const isOperator = children === "/" || children === "+";
  return (
    <span style={{ display: "inline-flex", alignItems: "center",
      padding: isOperator ? "0 4px" : "2px 6px",
      borderRadius: isOperator ? 0 : 5,
      border: isOperator ? "none" : `1px solid ${COLORS.border}`,
      background: isOperator ? "transparent" : "#fff",
      color: COLORS.inkLight,
      font: isOperator ? "500 11px/1 system-ui" : "700 10px/1 ui-monospace,monospace" }}>
      {children}
    </span>
  );
}

export default function ShortcutsOverlay({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;

  return (
    <div onClick={onClose} role="dialog" aria-label="Keyboard shortcuts"
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex",
        justifyContent: "center", alignItems: "center", padding: 20,
        background: "rgba(20,12,6,0.55)", backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "min(92vw, 560px)", maxHeight: "85vh",
          display: "flex", flexDirection: "column",
          background: COLORS.parchment, borderRadius: 12,
          border: `1.5px solid ${COLORS.border}`,
          boxShadow: "0 24px 64px -16px rgba(28,18,8,0.55)", overflow: "hidden" }}>
        <header style={{ padding: "10px 14px", borderBottom: `1px solid ${COLORS.border}`,
          background: COLORS.parchmentDeep, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ font: "700 11px/1 system-ui", letterSpacing: "0.12em",
            textTransform: "uppercase", color: COLORS.inkLight }}>
            Keyboard shortcuts
          </span>
          <button onClick={onClose} aria-label="Close" title="Close"
            style={{ marginLeft: "auto", width: 22, height: 22, borderRadius: 6,
              border: `1px solid ${COLORS.border}`, background: "#fff", color: COLORS.inkSubtle,
              font: "700 12px/1 system-ui", cursor: "pointer" }}>✕</button>
        </header>
        <div style={{ overflowY: "auto", padding: "10px 14px 14px" }}>
          {SHORTCUTS.map((sec) => (
            <section key={sec.section} style={{ marginBottom: 14 }}>
              <h3 style={{ font: "700 9px/1 system-ui", letterSpacing: "0.12em",
                textTransform: "uppercase", color: COLORS.inkSubtle, margin: "0 0 6px" }}>
                {sec.section}
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0,
                display: "flex", flexDirection: "column", gap: 4 }}>
                {sec.rows.map((row, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: 6,
                    padding: "5px 8px", borderRadius: 6, background: "#fff",
                    border: `1px solid ${COLORS.border}33` }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 2,
                      flexShrink: 0, minWidth: 200 }}>
                      {row.keys.map((k, j) => <KeyChip key={j}>{k}</KeyChip>)}
                    </span>
                    <span style={{ font: "500 11px/1.3 system-ui", color: COLORS.ink,
                      whiteSpace: "normal" }}>
                      {row.label.includes("&amp;") ? row.label.replace("&amp;", "&") : row.label}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
