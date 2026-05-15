// Shared biome-founding picker. Used from the cartography map view and from
// the Town view's "Found this settlement" CTA — same dispatch, same data.

import { biomesForType } from "./data.js";

const formatHazard = (h) =>
  String(h).split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

export default function BiomePicker({ node, type, cost, dispatch, onClose }) {
  const options = biomesForType(type);
  return (
    <div className="fixed inset-0 z-[60] bg-black/55 grid place-items-center p-3" onClick={onClose}>
      <div
        className="bg-[#f4ecd8] border-[4px] border-[#b28b62] rounded-[18px] px-5 py-4 w-[min(440px,94vw)] max-h-[88vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-1">
          <div className="font-bold text-[18px] text-[#744d2e]">Found {node.name}</div>
          <div className="text-[12px] text-[#6a4b31]">Pick a biome — it fixes this settlement's hazards and bonus for good. Costs <b>{cost}◉</b>.</div>
        </div>
        <div className="flex flex-col gap-2 mt-3">
          {options.map((b) => (
            <button
              key={b.id}
              onClick={() => { dispatch({ type: "FOUND_SETTLEMENT", payload: { zoneId: node.id, biome: b.id } }); onClose(); }}
              className="text-left bg-[#efe4cc] hover:bg-[#f3ead0] border-2 border-[#c5a87a] hover:border-[#a07840] rounded-xl px-3 py-2 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[22px] leading-none">{b.icon}</span>
                <span className="font-bold text-[14px] text-[#3a2715] flex-1">{b.name}</span>
                <span className="text-[10px] font-bold text-[#1f3a10] bg-[#cbe0b8] border border-[#6a9a3a] rounded-full px-2 py-0.5">+ {b.bonus}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {b.hazards.map((h) => (
                  <span key={h} className="inline-flex items-center gap-1 text-[9px] font-bold text-[#7a1a1a] bg-[#e8c4c4] border border-[#a05050] rounded-full px-1.5 py-0.5">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 3 L22 20 H2 Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
                      <path d="M12 10 V14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                      <circle cx="12" cy="17" r="1.2" fill="currentColor" />
                    </svg>
                    {formatHazard(h)}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="w-full mt-3 bg-[#9a724d] hover:bg-[#b8845a] text-white font-bold py-1.5 rounded-lg border border-[#e6c49a] text-[12px] transition-colors">Cancel</button>
      </div>
    </div>
  );
}
