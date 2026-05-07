import { CASTLE_NEEDS } from "./data.js";

export const viewKey = "castle";

function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="h-2 rounded-full bg-[#3a2715]/40 overflow-hidden border border-[#c5a87a]/40">
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
    <div className="bg-[#3a2715]/60 border border-[#c5a87a]/50 rounded-xl p-3 flex flex-col gap-2">
      <div className="font-bold text-[12px] text-[#f8e7c6] tracking-wide">🏰 Castle Needs</div>
      {Object.entries(CASTLE_NEEDS).map(([key, need]) => {
        const value = contributed[key] ?? 0;
        const have = inventory[need.resource] ?? 0;
        const remaining = Math.max(0, need.target - value);
        // Wired contribute targets — must have a matching inventory resource
        // and a chain that produces it. Soup is from PR #189; Meat from the
        // herd-animals chain (this PR). Coal/Cocoa/Ink are scaffolded but
        // their chains aren't wired yet, so the buttons are hidden for them.
        const wired = key === "soup" || key === "meat";
        const complete = value >= need.target;
        const canContribute1 = wired && have >= 1 && !complete;
        const canContributeAll = wired && have >= 1 && remaining > 0;
        const allAmount = Math.min(have, remaining);
        return (
          <div key={key} className="bg-[#f6efe0] border-2 border-[#c5a87a] rounded-lg p-2 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#3a2715]">{need.label}</span>
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
