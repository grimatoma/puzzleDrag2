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
    <div className="hl-well">
      <div className="hl-section-label">🏰 Castle Needs</div>
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
          <div key={key} className="hl-card gap-1.5">
            <div className="flex items-center justify-between">
              <span className="hl-card-title flex items-center gap-1">
                <Icon iconKey={need.resource} size={14} />
                {need.label}
              </span>
              <span className="hl-card-meta tabular-nums">{value} / {need.target}</span>
            </div>
            <ProgressBar value={value} max={need.target} />
            {wired && (
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span className="hl-card-meta">Have: {have}</span>
                <div className="flex gap-1">
                  <button
                    disabled={!canContribute1}
                    onClick={() => dispatch({ type: "CASTLE/CONTRIBUTE", payload: { key, amount: 1 } })}
                    className="hl-btn hl-btn--sm hl-btn--go"
                  >
                    Contribute 1
                  </button>
                  {have >= 1 && (
                    <button
                      disabled={!canContributeAll}
                      onClick={() => dispatch({ type: "CASTLE/CONTRIBUTE", payload: { key, amount: allAmount } })}
                      className="hl-btn hl-btn--sm hl-btn--primary"
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
