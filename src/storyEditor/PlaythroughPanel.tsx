// Playthrough comparison — runs the selected beat through every
// playthrough strategy (first / kindest / cruelest / richest / bargain)
// and shows the resulting state side-by-side. Helpful when balancing the
// economy of a branch: "the kindest path ends at +18 bond but the
// cruelest ends at -2 — is that the right spread?"

import { useMemo, useEffect } from "react";
import { C, NPCS, Portrait, effectiveBeat } from "./shared.jsx";
import { simulateAllPlaythroughs } from "./playthroughs.js";

const STRATEGY_TONE = {
  first:    { fg: C.inkLight,   bg: C.parchmentDeep },
  kindest:  { fg: C.greenDeep,  bg: "rgba(90,158,75,0.10)" },
  cruelest: { fg: C.redDeep,    bg: "rgba(194,59,34,0.10)" },
  richest:  { fg: "#7a5810",    bg: "rgba(226,178,74,0.16)" },
  bargain:  { fg: C.emberDeep,  bg: "rgba(214,97,42,0.10)" },
};

const REASON_LABEL = {
  "ends-here": "ENDS", "no-target": "OPEN", "loop": "LOOP",
  "depth-cap": "DEEP", "missing-target": "BAD",
};

function StateRow({ label, value, accent }) {
  const v = value || 0;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "3px 8px", font: "500 11px/1.3 system-ui",
      color: v ? C.ink : C.inkSubtle, background: v ? "rgba(43,34,24,0.04)" : "transparent" }}>
      <span>{label}</span>
      <span style={{ font: "700 11px/1 ui-monospace,monospace",
        color: v ? accent : C.inkSubtle }}>
        {v > 0 ? `+${v}` : v}
      </span>
    </div>
  );
}

function StrategyColumn({ result }) {
  const tone = STRATEGY_TONE[result.strategy] || STRATEGY_TONE.first;
  const reason = REASON_LABEL[result.terminalReason] || result.terminalReason;
  return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 10, overflow: "hidden",
      display: "flex", flexDirection: "column", minHeight: 0 }}>
      <header style={{ padding: "8px 10px", background: tone.bg, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ font: "700 11px/1.2 system-ui", color: tone.fg }}>{result.label}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
          <span style={{ font: "700 8px/1 system-ui", letterSpacing: "0.1em",
            padding: "2px 6px", borderRadius: 999,
            background: tone.fg, color: "#fff" }}>{reason}</span>
          <span style={{ font: "500 9px/1 system-ui", color: C.inkSubtle }}>
            {result.steps.length} step{result.steps.length === 1 ? "" : "s"}
          </span>
        </div>
      </header>
      <div style={{ padding: "6px 0", borderBottom: `1px solid ${C.border}66`, maxHeight: 180, overflowY: "auto" }}>
        {result.steps.map((s, i) => (
          <div key={`${s.beatId}-${i}`} style={{ padding: "3px 10px",
            font: "500 10px/1.3 system-ui", color: C.inkLight,
            display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 18, height: 18, borderRadius: 4, background: C.parchmentDeep,
              color: C.inkSubtle, font: "700 9px/1 ui-monospace,monospace",
              display: "grid", placeItems: "center", flexShrink: 0 }}>{i + 1}</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.beatTitle}</span>
            {s.chosen && (
              <span style={{ marginLeft: "auto", font: "italic 400 10px/1.3 system-ui", color: C.inkSubtle,
                maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                → {s.chosen.label}
              </span>
            )}
          </div>
        ))}
      </div>
      <div style={{ padding: "4px 0" }}>
        <StateRow label="Embers ✸"   value={result.finalState.embers}     accent={C.emberDeep} />
        <StateRow label="Core ◈"     value={result.finalState.coreIngots} accent={C.inkLight} />
        <StateRow label="Gems ◆"     value={result.finalState.gems}       accent="#5a3d83" />
        <StateRow label="Coins ¢"    value={result.finalState.coins}      accent="#7a5810" />
        {Object.entries(result.finalState.bonds).map(([npc, amt]) => (
          <div key={npc} style={{ display: "flex", alignItems: "center", gap: 6,
            padding: "3px 8px", font: "500 11px/1.3 system-ui", color: C.ink }}>
            <Portrait npcKey={npc} size={14} />
            <span style={{ flex: 1, color: NPCS[npc]?.color || C.ink }}>{NPCS[npc]?.name || npc}</span>
            <span style={{ font: "700 11px/1 ui-monospace,monospace",
              color: amt > 0 ? C.greenDeep : (amt < 0 ? C.redDeep : C.inkSubtle) }}>
              {amt > 0 ? `+${amt}` : amt}
            </span>
          </div>
        ))}
      </div>
      <div style={{ padding: "5px 10px", background: C.parchmentDeep,
        font: "italic 400 9px/1.3 system-ui", color: C.inkSubtle }}>
        {result.finalState.flagsSet.length} flag{result.finalState.flagsSet.length === 1 ? "" : "s"} set
      </div>
    </div>
  );
}

export default function PlaythroughPanel({ open, draft, anchorBeatId, onClose, onJumpToBeat }) {
  const results = useMemo(() => {
    if (!anchorBeatId) return [];
    return simulateAllPlaythroughs(anchorBeatId, draft);
  }, [draft, anchorBeatId]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const beat = anchorBeatId ? effectiveBeat(anchorBeatId, draft) : null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,12,6,0.55)", zIndex: 49 }} aria-hidden />
      <div role="dialog" aria-label="Playthrough comparison"
        style={{ position: "fixed", top: "5vh", left: "50%", transform: "translateX(-50%)", zIndex: 50,
          width: "min(96vw, 1100px)", maxHeight: "90vh", display: "flex", flexDirection: "column",
          background: "#fff", borderRadius: 12, border: `1.5px solid ${C.border}`,
          boxShadow: "0 24px 64px -16px rgba(28,18,8,0.55)" }}>
        <header style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`,
          background: C.parchmentDeep, borderRadius: "12px 12px 0 0",
          display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ font: "700 10px/1 system-ui", letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkLight }}>
            Playthrough comparison
          </span>
          {beat && (
            <span style={{ font: "500 11px/1.2 system-ui", color: C.ink }}>
              from <span style={{ font: "600 11px/1 ui-monospace,monospace", color: C.emberDeep }}>{anchorBeatId}</span> · {beat.title}
            </span>
          )}
          <button onClick={onClose} aria-label="Close" title="Close"
            style={{ marginLeft: "auto", width: 22, height: 22, borderRadius: 6, border: `1px solid ${C.border}`,
              background: "#fff", color: C.inkSubtle, font: "700 12px/1 system-ui", cursor: "pointer" }}>✕</button>
        </header>
        <div style={{ overflowY: "auto", padding: "12px 14px",
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          {!anchorBeatId && (
            <div style={{ font: "italic 400 12px/1.4 system-ui", color: C.inkSubtle, gridColumn: "1 / -1" }}>
              Select a beat on the canvas, then open the playthrough comparison to walk every strategy from there.
            </div>
          )}
          {results.map((r) => <StrategyColumn key={r.strategy} result={r} />)}
        </div>
        <footer style={{ padding: "7px 14px", borderTop: `1px solid ${C.border}`,
          background: C.parchmentDeep, font: "italic 400 10px/1.4 system-ui", color: C.inkSubtle }}>
          Strategies: first (index 0), kindest (highest bondΔ), cruelest (lowest bondΔ),
          richest (largest currency reward — embers×5 + core×3 + gems×4 + coins),
          bargain (most flag set/clear ops).
          {anchorBeatId && onJumpToBeat && (
            <button onClick={() => { onJumpToBeat(anchorBeatId); onClose(); }}
              style={{ marginLeft: 8, font: "600 10px/1 system-ui", padding: "3px 8px", borderRadius: 5,
                border: `1px solid ${C.border}`, background: "#fff", color: C.inkLight, cursor: "pointer" }}>
              Edit start beat ▸
            </button>
          )}
        </footer>
      </div>
    </>
  );
}
