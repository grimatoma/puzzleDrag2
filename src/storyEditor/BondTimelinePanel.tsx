// Per-NPC bond timeline — visual table summarising every choice that
// nudges an NPC's bond, with a running total. Useful for spotting cases
// where the narrative economy makes a relationship balloon (or never
// gives the player the chance to repair it). Read-only; click-through
// jumps to the source beat for editing.

import { useMemo } from "react";
import { C, NPCS, Portrait } from "./shared.jsx";
import { computeBondTimeline } from "./bondTimeline.js";

function ActLabel({ act }) {
  if (act === null) return <span style={{ font: "600 8px/1 system-ui", color: C.violet, letterSpacing: "0.08em", textTransform: "uppercase" }}>SIDE</span>;
  return <span style={{ font: "600 8px/1 system-ui", color: C.inkSubtle, letterSpacing: "0.08em", textTransform: "uppercase" }}>{["", "I", "II", "III"][act] || `Act ${act}`}</span>;
}

function NpcRow({ row, onJumpToBeat }) {
  const npc = NPCS[row.npc];
  const range = Math.max(1, Math.abs(row.max), Math.abs(row.min));
  return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "9px 12px", display: "flex", alignItems: "center", gap: 8,
        background: C.parchmentDeep, borderBottom: `1px solid ${C.border}` }}>
        <Portrait npcKey={row.npc} size={20} />
        <span style={{ font: "700 12px/1 system-ui", color: npc?.color || C.ink }}>
          {npc?.name || row.npc}
        </span>
        <span style={{ font: "600 10px/1 system-ui", color: C.inkSubtle, marginLeft: 4 }}>
          {row.stops.length} stop{row.stops.length === 1 ? "" : "s"}
        </span>
        <span style={{ marginLeft: "auto", font: "600 10px/1 ui-monospace,monospace",
          color: row.total > 0 ? C.greenDeep : (row.total < 0 ? C.redDeep : C.inkSubtle) }}>
          NET {row.total > 0 ? "+" : ""}{row.total}
        </span>
        <span style={{ font: "600 9px/1 ui-monospace,monospace", color: C.inkSubtle }}>
          MAX +{row.max} / MIN {row.min < 0 ? row.min : `+${row.min}`}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr 60px 60px",
        padding: "4px 12px", font: "700 8px/1 system-ui", color: C.inkSubtle, letterSpacing: "0.08em",
        textTransform: "uppercase", borderBottom: `1px solid ${C.border}66` }}>
        <span>Act</span><span>Beat</span><span>Choice</span>
        <span style={{ textAlign: "right" }}>Δ</span>
        <span style={{ textAlign: "right" }}>Total</span>
      </div>
      {row.stops.map((stop, i) => {
        const pos = stop.running >= 0;
        const pct = Math.round((Math.abs(stop.running) / range) * 100);
        return (
          <button key={`${stop.beatId}-${stop.choiceId}-${i}`}
            onClick={() => onJumpToBeat && onJumpToBeat(stop.beatId)}
            title={`Open ${stop.beatId} in the editor`}
            style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr 60px 60px",
              padding: "5px 12px", textAlign: "left", width: "100%", border: "none",
              borderTop: i > 0 ? `1px solid ${C.border}33` : "none", background: "transparent",
              cursor: "pointer", font: "500 11px/1.3 system-ui", color: C.ink, alignItems: "center" }}>
            <ActLabel act={stop.act} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stop.beatTitle}</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.inkLight }}>{stop.choiceLabel}</span>
            <span style={{ textAlign: "right", font: "700 11px/1 ui-monospace,monospace",
              color: stop.amount > 0 ? C.greenDeep : C.redDeep }}>
              {stop.amount > 0 ? "+" : ""}{stop.amount}
            </span>
            <span style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 4 }}>
              <span aria-hidden style={{ flex: 1, height: 4, borderRadius: 2,
                background: pos ? "rgba(90,158,75,0.18)" : "rgba(194,59,34,0.18)" }}>
                <span style={{ display: "block", height: "100%", width: `${pct}%`,
                  background: pos ? C.greenDeep : C.redDeep, borderRadius: 2 }} />
              </span>
              <span style={{ font: "600 10px/1 ui-monospace,monospace",
                color: pos ? C.greenDeep : C.redDeep, minWidth: 24, textAlign: "right" }}>
                {stop.running > 0 ? "+" : ""}{stop.running}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function BondTimelinePanel({ draft, onJumpToBeat }) {
  const timeline = useMemo(() => computeBondTimeline(draft), [draft]);
  if (timeline.length === 0) {
    return (
      <div style={{ padding: "12px 14px", font: "italic 400 12px/1.4 system-ui", color: C.inkSubtle,
        background: "#fff", border: `1.5px dashed ${C.border}`, borderRadius: 10 }}>
        No bond deltas in this draft yet. Add a <code style={{ fontFamily: "ui-monospace,monospace" }}>bondDelta</code> to any choice outcome to populate this view.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {timeline.map((row) => <NpcRow key={row.npc} row={row} onJumpToBeat={onJumpToBeat} />)}
    </div>
  );
}
