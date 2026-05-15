import { CASTLE_NEEDS } from "./data.js";
import Icon from "../../ui/Icon.jsx";

// Note: this panel is embedded inside features/inventory/index.jsx (direct
// default-import) rather than mounted as its own top-level view. Don't add
// a `viewKey` export — it would cause this panel to render twice whenever
// state.view ever became "castle".

function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="h-2 rounded-full bg-[#3a2715]/25 overflow-hidden border border-[#b28b62]/50">
      <div
        className="h-full bg-gradient-to-r from-[#c8923a] to-[#f0c068]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function CastlePanel({ state, dispatch }) {
  const contributed = state?.castle?.contributed ?? {};
  const inventory = state?.inventory ?? {};

  return (
    <div className="bg-[#b28b62]/15 border border-[#b28b62]/50 rounded-xl p-3 flex flex-col gap-2">
      <div className="font-bold text-[12px] text-[#3a2715] tracking-wide">🏰 Castle Needs</div>
      {Object.entries(CASTLE_NEEDS).map(([key, need]) => {
        const value = contributed[key] ?? 0;
        const have = inventory[need.resource] ?? 0;
        const remaining = Math.max(0, need.target - value);
        // Wired contribute targets — all three needs point at real
        // farm/mine resources: soup (vegetables), meat (herd animals),
        // and coal (mine).
        const wired = true;
        const complete = value >= need.target;
        const canContribute1 = wired && have >= 1 && !complete;
        const canContributeAll = wired && have >= 1 && remaining > 0;
        const allAmount = Math.min(have, remaining);
        return (
          <div key={key} className="bg-[#f6efe0] border-2 border-[#c5a87a] rounded-lg p-2 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#3a2715] flex items-center gap-1">
                <Icon iconKey={need.resource} size={14} />
                {need.label}
              </span>
              <span className="text-[10px] text-[#8a785e]">{value} / {need.target}</span>
            </div>
            <ProgressBar value={value} max={need.target} />
            {wired && (
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span className="text-[10px] text-[#8a785e]">Have: {have}</span>
                <div className="flex gap-1">
                  <button
                    disabled={!canContribute1}
                    onClick={() => dispatch({ type: "CASTLE/CONTRIBUTE", payload: { key, amount: 1 } })}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border-2 ${
                      canContribute1
                        ? "bg-[#91bf24] border-[#6a9010] text-white hover:bg-[#a3d028]"
                        : "bg-[#ccc] border-[#aaa] text-[#666] cursor-not-allowed"
                    }`}
                  >
                    Contribute 1
                  </button>
                  {have >= 1 && (
                    <button
                      disabled={!canContributeAll}
                      onClick={() => dispatch({ type: "CASTLE/CONTRIBUTE", payload: { key, amount: allAmount } })}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border-2 ${
                        canContributeAll
                          ? "bg-[#c8923a] border-[#8a5e1e] text-white hover:bg-[#dba450]"
                          : "bg-[#ccc] border-[#aaa] text-[#666] cursor-not-allowed"
                      }`}
                    >
                      All ({allAmount})
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
