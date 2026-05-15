// Story Tree Editor — Paths panel.
//
// Lists every reachable branch resolution from the currently-selected beat
// — same DFS the QA team would walk by hand if they were exhaustively
// trying every choice combination. For each path the panel renders:
//
//   - the choice sequence as a breadcrumb of A/B/C letters,
//   - the terminal beat title + termination reason badge,
//   - the aggregate outcome (sums of currency, bond deltas, flags set/cleared).
//
// Clicking a path opens its terminal beat in the editor; clicking a choice
// chip in a path jumps to the beat that fork lives on.

import { useMemo, useEffect } from "react";
import { C, NPCS, effectiveBeat } from "./shared.jsx";
import { enumerateStoryPaths, summarisePaths } from "./pathWalker.js";

const REASON_TONE = {
  "ends-here":      { label: "ENDS", fg: C.greenDeep, bg: "rgba(90,158,75,0.10)", bd: "rgba(90,158,75,0.45)" },
  "no-target":      { label: "OPEN", fg: "#7a5810",   bg: "rgba(226,178,74,0.14)", bd: "rgba(226,178,74,0.5)" },
  "loop":           { label: "LOOP", fg: "#7a3a82",   bg: "rgba(122,58,130,0.10)", bd: "rgba(122,58,130,0.45)" },
  "depth-cap":      { label: "DEEP", fg: C.inkLight,   bg: "rgba(43,34,24,0.08)", bd: C.border },
  "missing-target": { label: "BAD",  fg: C.redDeep,    bg: "rgba(194,59,34,0.10)", bd: "rgba(194,59,34,0.45)" },
};

function ReasonPill({ reason }) {
  const t = REASON_TONE[reason] || REASON_TONE["ends-here"];
  return (
    <span style={{ display: "inline-block", padding: "2px 6px", borderRadius: 999,
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
      font: "700 8px/1 system-ui", letterSpacing: "0.1em" }}>{t.label}</span>
  );
}

function EffectBadges({ effects }) {
  const bits = [];
  if (effects.coins) bits.push({ k: "coins", text: `¢ ${effects.coins > 0 ? "+" : ""}${effects.coins}`, fg: "#7a5810" });
  if (effects.embers) bits.push({ k: "embers", text: `✸ ${effects.embers > 0 ? "+" : ""}${effects.embers}`, fg: C.emberDeep });
  if (effects.coreIngots) bits.push({ k: "core", text: `◈ ${effects.coreIngots > 0 ? "+" : ""}${effects.coreIngots}`, fg: C.inkLight });
  if (effects.gems) bits.push({ k: "gems", text: `◆ ${effects.gems > 0 ? "+" : ""}${effects.gems}`, fg: "#5a3d83" });
  for (const [npc, delta] of Object.entries(effects.bondDeltas)) {
    if (!delta) continue;
    bits.push({ k: `bond-${npc}`, text: `♥ ${delta > 0 ? "+" : ""}${delta} ${NPCS[npc]?.name || npc}`, fg: delta > 0 ? C.greenDeep : C.redDeep });
  }
  for (const f of effects.flagsSet) bits.push({ k: `sf-${f}`, text: `⚐ ${f}`, fg: C.emberDeep });
  for (const f of effects.flagsCleared) bits.push({ k: `cf-${f}`, text: `⚑ ${f} off`, fg: C.inkSubtle });
  if (bits.length === 0) {
    return <span style={{ font: "italic 400 10px/1 system-ui", color: C.inkSubtle }}>no aggregated effects</span>;
  }
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
      {bits.slice(0, 12).map((b) => (
        <span key={b.k} style={{ font: "600 9px/1.2 ui-monospace,monospace", color: b.fg,
          padding: "2px 5px", borderRadius: 5, background: "rgba(43,34,24,0.04)",
          border: "1px solid rgba(43,34,24,0.12)" }}>{b.text}</span>
      ))}
      {bits.length > 12 && (
        <span style={{ font: "600 9px/1.2 system-ui", color: C.inkSubtle }}>+{bits.length - 12} more</span>
      )}
    </span>
  );
}

export default function PathsPanel({ open, draft, anchorBeatId, onClose, onJumpToBeat }) {
  const result = useMemo(() => {
    if (!anchorBeatId) return { paths: [], truncated: false };
    return enumerateStoryPaths(anchorBeatId, draft);
  }, [draft, anchorBeatId]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const startBeat = anchorBeatId ? effectiveBeat(anchorBeatId, draft) : null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,12,6,0.42)", zIndex: 49 }} aria-hidden />
      <div role="dialog" aria-label="Path walker"
        style={{ position: "fixed", top: "8vh", left: "50%", transform: "translateX(-50%)", zIndex: 50,
          width: "min(94vw, 720px)", maxHeight: "84vh", display: "flex", flexDirection: "column",
          background: "#fff", borderRadius: 12, border: `1.5px solid ${C.border}`,
          boxShadow: "0 24px 64px -16px rgba(28,18,8,0.55)" }}>
        <header style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`,
          background: C.parchmentDeep, borderRadius: "12px 12px 0 0",
          display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ font: "700 10px/1 system-ui", letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkLight }}>
            Path walker
          </span>
          {startBeat && (
            <span style={{ font: "500 11px/1.2 system-ui", color: C.ink, marginLeft: 4 }}>
              from <span style={{ font: "600 11px/1 ui-monospace,monospace", color: C.emberDeep }}>{anchorBeatId}</span> · {startBeat.title}
            </span>
          )}
          <span style={{ marginLeft: "auto", font: "600 10px/1 system-ui", color: C.inkSubtle }}>
            {summarisePaths(result)}
          </span>
          <button onClick={onClose} aria-label="Close path walker" title="Close"
            style={{ width: 22, height: 22, borderRadius: 6, border: `1px solid ${C.border}`,
              background: "#fff", color: C.inkSubtle, font: "700 12px/1 system-ui", cursor: "pointer" }}>✕</button>
        </header>
        <div style={{ overflowY: "auto", padding: "8px 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {!anchorBeatId && (
            <div style={{ font: "italic 400 12px/1.45 system-ui", color: C.inkSubtle }}>
              Select a beat on the canvas, then open the path walker to enumerate every reachable resolution from it.
            </div>
          )}
          {anchorBeatId && result.paths.length === 0 && (
            <div style={{ font: "italic 400 12px/1.45 system-ui", color: C.inkSubtle }}>
              No outgoing paths — this beat has no choices, or the start id doesn't exist.
            </div>
          )}
          {result.paths.map((p, i) => {
            const tb = effectiveBeat(p.terminalBeat, draft);
            return (
              <div key={i} style={{ borderRadius: 10, border: `1.5px solid ${C.border}`, background: "#fffaf3",
                padding: "9px 11px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                  <ReasonPill reason={p.terminalReason} />
                  <span style={{ font: "600 11px/1.3 system-ui", color: C.ink, flex: 1 }}>
                    {tb?.title || p.terminalBeat}
                    <span style={{ marginLeft: 6, font: "500 10px/1 ui-monospace,monospace", color: C.inkSubtle }}>{p.terminalBeat}</span>
                  </span>
                  <button onClick={() => { onJumpToBeat(p.terminalBeat); onClose(); }}
                    title="Open the terminal beat in the editor"
                    style={{ padding: "3px 8px", borderRadius: 5, border: `1px solid ${C.border}`,
                      background: "#fff", color: C.inkLight, font: "600 9px/1 system-ui", cursor: "pointer" }}>
                    Open ▸
                  </button>
                </div>
                {p.choices.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                    {p.choices.map((c, j) => (
                      <button key={`${c.beatId}-${c.choiceId}-${j}`}
                        onClick={() => { onJumpToBeat(c.beatId); onClose(); }}
                        title={`Jump to beat ${c.beatId}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px",
                          borderRadius: 999, border: `1px solid ${C.border}`, background: "#fff",
                          color: C.ink, font: "500 10px/1.2 system-ui", cursor: "pointer" }}>
                        <span style={{ width: 14, height: 14, borderRadius: "50%", background: C.ember, color: "#fff",
                          display: "grid", placeItems: "center", font: "700 8px/1 ui-monospace,monospace" }}>
                          {"ABCDEFGH"[j] || "•"}
                        </span>
                        <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.label || c.choiceId}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <EffectBadges effects={p.effects} />
              </div>
            );
          })}
          {result.truncated && (
            <div style={{ padding: "7px 9px", borderRadius: 8, background: "rgba(214,97,42,0.07)",
              border: "1px dashed rgba(214,97,42,0.3)", font: "italic 400 10.5px/1.4 system-ui", color: C.emberDeep }}>
              Truncated — only the first {result.paths.length} paths are shown. Set tighter choice fan-out or
              shorter chains to see them all.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
