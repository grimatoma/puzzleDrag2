// Choice-outcome heatmap — at-a-glance grid showing how rewards distribute
// across Act / Side / Drafts. Helpful for catching uneven economy
// pacing ("every ember reward is in Act II"), narrative bottlenecks
// ("no flag-set choices in Act III"), or bond imbalances.

import { useMemo } from "react";
import { C, NPCS, Portrait } from "./shared.jsx";
import { computeOutcomeHeatmap, OUTCOME_BUCKETS } from "./outcomeHeatmap.js";

const BUCKET_LABEL = {
  act1: "Act I", act2: "Act II", act3: "Act III", side: "Side", draft: "Drafts",
};
const BUCKET_COLOR = {
  act1: "#7a8b5e", act2: "#c9863a", act3: "#a8431a", side: "#7e7aa6", draft: "#6b8e9e",
};

function RowHeader({ label, hint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "5px 8px", borderRight: `1px solid ${C.border}66` }}>
      <span style={{ font: "600 11px/1.2 system-ui", color: C.ink }}>{label}</span>
      {hint && <span style={{ font: "italic 400 9px/1 system-ui", color: C.inkSubtle }}>{hint}</span>}
    </div>
  );
}

function HeatCell({ value, scale, accent }) {
  const intensity = scale > 0 ? Math.min(1, Math.abs(value) / scale) : 0;
  const sign = value < 0 ? -1 : 1;
  const bg = value === 0
    ? "transparent"
    : (sign < 0
        ? `rgba(194,59,34,${0.05 + intensity * 0.4})`
        : `rgba(${hexToRgb(accent)},${0.05 + intensity * 0.4})`);
  return (
    <div style={{ display: "grid", placeItems: "center", padding: "5px 8px",
      borderRight: `1px solid ${C.border}33`, background: bg }}>
      <span style={{ font: "600 11px/1 ui-monospace,monospace",
        color: value === 0 ? C.inkSubtle : (sign < 0 ? C.redDeep : C.ink) }}>
        {value > 0 ? value : (value < 0 ? value : "·")}
      </span>
    </div>
  );
}

function hexToRgb(hex) {
  const h = (hex || "#000").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `${r},${g},${b}`;
}

function HeatRow({ row }) {
  const max = Math.max(...row.cells.map((c) => Math.abs(c.value)));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px repeat(5, 1fr)",
      borderTop: `1px solid ${C.border}` }}>
      <RowHeader label={row.label} hint={row.hint} />
      {row.cells.map((cell) => (
        <HeatCell key={cell.bucket} value={cell.value} scale={max} accent={BUCKET_COLOR[cell.bucket]} />
      ))}
    </div>
  );
}

export default function HeatmapPanel({ draft }) {
  const heat = useMemo(() => computeOutcomeHeatmap(draft), [draft]);

  const cellsFor = (counts) => OUTCOME_BUCKETS.map((b) => ({ bucket: b, value: counts[b] || 0 }));
  const rows = [
    { label: "Choices", cells: cellsFor(heat.choiceCounts) },
    { label: "Embers ✸", hint: "summed across choices", cells: cellsFor(heat.counts.embers) },
    { label: "Core ◈", cells: cellsFor(heat.counts.coreIngots) },
    { label: "Gems ◆", cells: cellsFor(heat.counts.gems) },
    { label: "Set flags ⚐", cells: cellsFor(heat.counts.setFlags) },
    { label: "Clear flags ⚑", cells: cellsFor(heat.counts.clearFlags) },
  ];
  const bondRows = Object.entries(heat.bondPerNpc).map(([npc, counts]) => ({
    npc, cells: cellsFor(counts),
  }));

  return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "140px repeat(5, 1fr)",
        background: C.parchmentDeep, font: "700 9px/1 system-ui", color: C.inkSubtle,
        letterSpacing: "0.08em", textTransform: "uppercase" }}>
        <div style={{ padding: "6px 8px", borderRight: `1px solid ${C.border}66` }}>Metric</div>
        {OUTCOME_BUCKETS.map((b) => (
          <div key={b} style={{ padding: "6px 8px", textAlign: "center",
            color: BUCKET_COLOR[b], borderRight: `1px solid ${C.border}33` }}>
            {BUCKET_LABEL[b]}
          </div>
        ))}
      </div>
      {rows.map((row) => <HeatRow key={row.label} row={row} />)}
      {bondRows.length > 0 && (
        <>
          <div style={{ padding: "6px 8px", borderTop: `1px solid ${C.border}`, background: C.parchmentDeep,
            font: "700 9px/1 system-ui", letterSpacing: "0.08em", textTransform: "uppercase", color: C.inkSubtle }}>
            Bond Δ — per NPC
          </div>
          {bondRows.map(({ npc, cells }) => {
            const max = Math.max(...cells.map((c) => Math.abs(c.value)));
            return (
              <div key={npc} style={{ display: "grid", gridTemplateColumns: "140px repeat(5, 1fr)",
                borderTop: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px",
                  borderRight: `1px solid ${C.border}66` }}>
                  <Portrait npcKey={npc} size={16} />
                  <span style={{ font: "600 11px/1.2 system-ui", color: NPCS[npc]?.color || C.ink }}>
                    {NPCS[npc]?.name || npc}
                  </span>
                </div>
                {cells.map((c) => (
                  <HeatCell key={c.bucket} value={c.value} scale={max} accent={BUCKET_COLOR[c.bucket]} />
                ))}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
