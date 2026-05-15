// Compact, scannable view of the item-upgrade chain forest.
// Pulls the merged ITEMS + UPGRADE_THRESHOLDS from the live constants so the
// chains reflect the current draft (overrides applied at import-time by
// `applyOverrides`). Drawn inline on the Resources tab so designers can see
// the whole economy structure without leaving the editor.

import { useMemo } from "react";
import { ITEMS, UPGRADE_THRESHOLDS } from "../constants.js";
import { COLORS, TileSwatch } from "./shared.jsx";
import { computeItemChains, chainSourcesFor } from "./itemChains.js";

function ChainArrow() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, color: COLORS.inkSubtle, fontSize: 14 }}>→</span>
  );
}

function ChainStep({ member, mergesFrom }) {
  return (
    <div className="flex flex-col items-center gap-1" style={{ minWidth: 96 }}>
      <TileSwatch color={member.color} iconKey={member.id} size={36} />
      <div className="text-[11px] font-bold" style={{ color: COLORS.ink, maxWidth: 96, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis" }}>
        {member.label}
      </div>
      <div className="text-[9px] font-mono" style={{ color: COLORS.inkSubtle }}>{member.id}</div>
      <div className="flex items-center gap-1.5 text-[9px] font-bold" style={{ color: COLORS.inkLight }}>
        <span title="Threshold to promote">⤴ {member.threshold || "—"}</span>
        <span title="Sale value">◉ {member.value}</span>
      </div>
      {mergesFrom?.length > 1 && (
        <div className="text-[9px] italic" title={`Also fed by: ${mergesFrom.filter((x) => x !== member.id).join(", ")}`}
          style={{ color: COLORS.emberDeep }}>
          ⑂ {mergesFrom.length} feeders
        </div>
      )}
    </div>
  );
}

export default function ChainsView() {
  const result = useMemo(() => computeItemChains(ITEMS, UPGRADE_THRESHOLDS), []);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "Chains", value: result.chains.length, hint: `roots → terminals` },
          { label: "Terminals", value: result.terminalCount, hint: "no further .next" },
          { label: "Branched targets", value: result.branchedCount, hint: "≥2 sources merge" },
          { label: "Orphans", value: result.orphanCount, hint: "no chain at all" },
        ].map((cell) => (
          <div key={cell.label}
            className="flex flex-col items-center justify-center px-2 py-2 rounded-lg border-2"
            style={{ background: cell.value > 0 ? COLORS.parchmentDeep : "#fff", borderColor: COLORS.border }}>
            <div className="text-[18px] font-bold" style={{ color: cell.value > 0 ? COLORS.ember : COLORS.inkSubtle }}>{cell.value}</div>
            <div className="text-[10px] uppercase tracking-wide font-bold text-center" style={{ color: COLORS.inkSubtle }}>{cell.label}</div>
            <div className="text-[9px] italic text-center" style={{ color: COLORS.inkSubtle }}>{cell.hint}</div>
          </div>
        ))}
      </div>

      {result.chains.length === 0 ? (
        <div className="text-[12px] italic" style={{ color: COLORS.inkSubtle }}>
          No chains found — every item is either a terminal (no .next) or a self-loop.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {result.chains.map((chain) => (
            <div key={chain.rootId} className="rounded-xl border-2 p-3"
              style={{ background: "#fffaf3", borderColor: COLORS.border }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: COLORS.inkSubtle }}>
                  Chain · {chain.depth} tiers · Σ {chain.totalValue}◉
                </span>
                <span className="text-[10px] font-mono" style={{ color: COLORS.inkSubtle }}>{chain.rootId}</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {chain.members.map((m, i) => {
                  const feeders = i === 0 ? null : chainSourcesFor(m.id, ITEMS);
                  return (
                    <span key={m.id} className="flex items-center gap-1">
                      {i > 0 && <ChainArrow />}
                      <ChainStep member={m} mergesFrom={feeders} />
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
