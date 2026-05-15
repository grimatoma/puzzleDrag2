// Story Tree Editor — Validation Panel.
//
// A floating side-panel that aggregates every warning surfaced by
// `collectStoryWarnings` and groups them by type (missing beats, unregistered
// flags, orphan drafts, empty beats, duplicate choice ids, loop detection,
// empty choice labels). Each row is click-to-jump: it selects the offending
// beat in the editor, centers it on the canvas, and closes the panel.
//
// The panel is intentionally a sibling of the canvas (positioned absolutely)
// rather than slotted into the layout so toggling it doesn't reflow the
// editor — designers can open it briefly, dismiss it, and keep working.

import { useMemo, useEffect } from "react";
import { C, effectiveBeat, groupedStoryWarnings } from "./shared.jsx";

const TYPE_TONE = {
  missingBeat:      { fg: C.redDeep,    bg: "rgba(194,59,34,0.10)",  bd: "rgba(194,59,34,0.45)",  icon: "↯" },
  unknownFlag:      { fg: C.redDeep,    bg: "rgba(194,59,34,0.10)",  bd: "rgba(194,59,34,0.45)",  icon: "⚐" },
  orphanBeat:       { fg: "#7a5810",    bg: "rgba(226,178,74,0.14)", bd: "rgba(226,178,74,0.6)",  icon: "⌀" },
  emptyBeat:        { fg: C.inkSubtle,  bg: "rgba(43,34,24,0.07)",   bd: "rgba(43,34,24,0.22)",   icon: "∅" },
  duplicateChoice:  { fg: C.emberDeep,  bg: "rgba(214,97,42,0.10)",  bd: "rgba(214,97,42,0.4)",   icon: "⫶" },
  emptyChoiceLabel: { fg: C.emberDeep,  bg: "rgba(214,97,42,0.10)",  bd: "rgba(214,97,42,0.4)",   icon: "𝙏" },
  triggerLoop:      { fg: "#7a3a82",    bg: "rgba(122,58,130,0.10)", bd: "rgba(122,58,130,0.45)", icon: "↻" },
};
const DEFAULT_TONE = { fg: C.inkLight, bg: "rgba(43,34,24,0.06)", bd: C.border, icon: "•" };

export default function ValidationPanel({ open, draft, onClose, onJumpToBeat, anchorRect }) {
  const { groups, total } = useMemo(() => groupedStoryWarnings(draft), [draft]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const top = anchorRect ? Math.round(anchorRect.bottom + 8) : 56;
  const right = anchorRect ? Math.max(12, window.innerWidth - anchorRect.right) : 16;

  return (
    <>
      <div onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "transparent", zIndex: 49 }} aria-hidden />
      <div role="dialog" aria-label="Validation issues"
        style={{ position: "fixed", top, right, zIndex: 50, width: 360, maxHeight: "70vh",
          display: "flex", flexDirection: "column", background: "#fff",
          borderRadius: 10, border: `1.5px solid ${C.border}`,
          boxShadow: "0 18px 40px -10px rgba(28,18,8,0.32)", overflow: "hidden" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
          borderBottom: `1px solid ${C.border}`, background: C.parchmentDeep }}>
          <span style={{ font: "700 11px/1 system-ui", color: C.inkLight, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Validation
          </span>
          <span style={{ font: "700 9px/1 system-ui", padding: "2px 7px", borderRadius: 999,
            background: total > 0 ? "rgba(194,59,34,0.12)" : "rgba(90,158,75,0.14)",
            color: total > 0 ? C.redDeep : C.greenDeep, letterSpacing: "0.06em" }}>
            {total} issue{total === 1 ? "" : "s"}
          </span>
          <button onClick={onClose} aria-label="Close validation panel" title="Close"
            style={{ marginLeft: "auto", width: 22, height: 22, borderRadius: 6, border: `1px solid ${C.border}`,
              background: "#fff", color: C.inkSubtle, font: "700 12px/1 system-ui", cursor: "pointer" }}>
            ✕
          </button>
        </header>

        <div style={{ overflowY: "auto", flex: 1, padding: "8px 0 12px" }}>
          {total === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center" }}>
              <div style={{ font: "700 16px/1.2 system-ui", color: C.greenDeep, marginBottom: 6 }}>✓ All clean</div>
              <div style={{ font: "400 11px/1.45 system-ui", color: C.inkSubtle }}>
                No missing beats, unregistered flags, orphan drafts, empty beats, or choice loops detected.
              </div>
            </div>
          )}
          {groups.map((group) => {
            const tone = TYPE_TONE[group.type] || DEFAULT_TONE;
            return (
              <section key={group.type} style={{ padding: "6px 0" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 7, padding: "5px 14px" }}>
                  <span style={{ font: "700 9px/1 system-ui", color: tone.fg, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    {tone.icon} {group.label}
                  </span>
                  <span style={{ font: "600 9px/1 system-ui", color: C.inkSubtle, marginLeft: "auto", padding: "1px 6px",
                    borderRadius: 999, background: "rgba(43,34,24,0.06)" }}>{group.items.length}</span>
                </div>
                {group.hint && (
                  <div style={{ padding: "0 14px 4px", font: "italic 400 10px/1.4 system-ui", color: C.inkSubtle }}>
                    {group.hint}
                  </div>
                )}
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {group.items.map(({ beatId, warning }, idx) => {
                    const beat = effectiveBeat(beatId, draft);
                    return (
                      <li key={`${beatId}-${idx}`}>
                        <button onClick={() => { onJumpToBeat(beatId); onClose(); }}
                          title={`Open ${beatId} in the editor`}
                          style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%",
                            textAlign: "left", padding: "6px 14px", border: "none", background: "transparent",
                            cursor: "pointer", gap: 2 }}>
                          <span style={{ font: "600 11px/1.3 system-ui", color: C.ink }}>
                            {beat?.title || beatId}
                          </span>
                          <span style={{ font: "400 10px/1.4 system-ui", color: tone.fg,
                            padding: "2px 7px", borderRadius: 6, background: tone.bg, border: `1px solid ${tone.bd}`,
                            maxWidth: "100%" }}>
                            {warning.message}
                          </span>
                          <span style={{ font: "500 9px/1 ui-monospace,monospace", color: C.inkSubtle }}>
                            {beatId}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <footer style={{ flexShrink: 0, padding: "7px 12px", borderTop: `1px solid ${C.border}`,
          background: C.parchmentDeep, font: "italic 400 10px/1.35 system-ui", color: C.inkSubtle }}>
          Click any row to open that beat in the editor. Drafts you save here flow through
          <code style={{ fontFamily: "ui-monospace,monospace", padding: "0 2px" }}>applyStoryOverrides</code> on the next game load.
        </footer>
      </div>
    </>
  );
}
