import { DECORATIONS } from "./data.js";

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
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#3a2715]/60 text-[#f8e7c6] border border-[#e2c19b]/30">
      {value} {label}
    </span>
  );
}

function DecorationCard({ decor, state, dispatch }) {
  const affordable = canAfford(decor, state);
  const count = state.built?.decorations?.[decor.id] ?? 0;

  return (
    <div className="bg-[#f6efe0] border-2 border-[#c5a87a] rounded-xl p-2 flex items-center gap-2 relative" style={{ minHeight: 72 }}>
      {count > 0 && (
        <div className="absolute top-1 right-1 text-[10px] text-[#8a785e] font-bold">×{count}</div>
      )}
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="font-bold text-[11px] text-[#3a2715] leading-tight">{decor.name}</span>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {Object.entries(decor.cost).map(([k, v]) => (
            <CostTag key={k} label={k === "coins" ? "◉" : k} value={v} />
          ))}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-[10px] font-bold text-[#9a6abf]">+{decor.influence} influence</span>
        <button
          disabled={!affordable}
          onClick={() => dispatch({ type: "BUILD_DECORATION", payload: { id: decor.id } })}
          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border-2 transition-colors ${
            affordable
              ? "bg-[#91bf24] border-[#6a9010] text-white hover:bg-[#a3d028]"
              : "bg-[#ccc] border-[#aaa] text-[#666] cursor-not-allowed"
          }`}
        >
          Build
        </button>
      </div>
    </div>
  );
}

export default function DecorationsScreen({ state, dispatch }) {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#7c4f2c] to-[#6b4225] border-[3px] border-[#e2c19b] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0 border-b border-[#e2c19b]/40">
        <span className="font-bold text-[14px] text-[#f8e7c6]">🌸 Decorations</span>
        <button
          onClick={() => dispatch({ type: "SET_VIEW", view: "town" })}
          className="w-7 h-7 rounded-lg bg-[#f6efe0] border-2 border-[#b28b62] grid place-items-center text-[#6a4b31] font-bold text-[14px]"
        >
          ✕
        </button>
      </div>

      {/* Decoration list */}
      <div className="flex-1 overflow-y-auto p-2">
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
