import { DECORATIONS } from "./data.js";
import { locBuilt } from "../../locBuilt.js";

function canAfford(decor, state) {
  const { cost } = decor;
  if ((state.coins ?? 0) < (cost.coins ?? 0)) return false;
  const inv = state.inventory ?? {};
  for (const [k, v] of Object.entries(cost)) {
    if (k === "coins") continue;
    if ((inv[k] ?? 0) < v) return false;
  }
  return true;
}

function CostTag({ label, value }) {
  return (
    <span className="hl-cost-tag">
      {value} {label}
    </span>
  );
}

function DecorationCard({ decor, state, dispatch }) {
  const affordable = canAfford(decor, state);
  const count = locBuilt(state).decorations?.[decor.id] ?? 0;

  return (
    <div className="hl-card !flex-row items-center gap-2 relative" style={{ minHeight: 72 }}>
      {count > 0 && (
        <div className="absolute top-1 right-1 text-[10px] text-on-panel-faint font-bold">×{count}</div>
      )}
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="hl-card-title leading-tight">{decor.name}</span>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {Object.entries(decor.cost).map(([k, v]) => (
            <CostTag key={k} label={k === "coins" ? "◉" : k} value={v} />
          ))}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-[10px] font-bold text-[#7a3a8a]">+{decor.influence} influence</span>
        <button
          disabled={!affordable}
          onClick={() => dispatch({ type: "BUILD_DECORATION", payload: { id: decor.id } })}
          className="hl-btn hl-btn--sm hl-btn--go"
        >
          Build
        </button>
      </div>
    </div>
  );
}

export default function DecorationsScreen({ state, dispatch }) {
  return (
    <div className="hl-panel">
      {/* Header */}
      <div className="hl-panel-header">
        <span className="hl-panel-title">🌸 Decorations</span>
        <button
          onClick={() => dispatch({ type: "SET_VIEW", view: "town" })}
          className="hl-panel-close"
        >
          ✕
        </button>
      </div>

      {/* Decoration list */}
      <div className="hl-panel-body !px-2">
        <div className="grid grid-cols-2 portrait:grid-cols-1 gap-2">
          {Object.values(DECORATIONS).map((decor) => (
            <DecorationCard
              key={decor.id}
              decor={decor}
              state={state}
              dispatch={dispatch}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
