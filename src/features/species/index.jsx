import { useState } from "react";
import { CATEGORIES } from "./data.js";
import { getCategoryViewModel } from "./effects.js";

export const viewKey = "species";

const CATEGORY_LABELS = {
  grass: "Grass",
  grain: "Grain",
  wood: "Wood",
  berry: "Berry",
  bird: "Bird",
};

const CATEGORY_ICONS = {
  grass: "🌾",
  grain: "🌽",
  wood: "🪵",
  berry: "🫐",
  bird: "🐣",
};

function SpeciesRow({ row, category, dispatch }) {
  const handleAction = () => {
    if (row.action === "toggle") {
      dispatch({
        type: "SET_ACTIVE_SPECIES",
        payload: { category, speciesId: row.id },
      });
    } else if (row.action === "buy") {
      dispatch({ type: "BUY_SPECIES", payload: { id: row.id } });
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-xl border transition-colors ${
        row.active
          ? "bg-[#4f6b3a]/40 border-[#a8d44a]"
          : row.locked
          ? "bg-[#1a1208]/30 border-[#5a4030]/50"
          : "bg-[#2b1e0f]/40 border-[#8a6040]/50"
      }`}
    >
      {/* Portrait / silhouette */}
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center text-2xl flex-shrink-0 ${
          row.locked ? "opacity-30 grayscale" : ""
        }`}
      >
        {CATEGORY_ICONS[category] ?? "?"}
      </div>

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <div
          className={`font-bold text-sm truncate ${
            row.locked ? "text-[#6a5040]" : "text-[#f7e2b6]"
          }`}
        >
          {row.name}
          {row.active && (
            <span className="ml-2 text-[#a8d44a] text-xs">● Active</span>
          )}
        </div>
        <div className={`text-xs mt-0.5 truncate ${row.locked ? "text-[#6a5040]" : "text-[#c8a87a]"}`}>
          {row.status}
        </div>
      </div>

      {/* Action button */}
      {row.action === "toggle" && !row.active && (
        <button
          onClick={handleAction}
          className="flex-shrink-0 px-2 py-1 rounded-lg bg-[#4f6b3a] text-[#d4f0a4] text-xs font-bold hover:bg-[#5f7b4a] transition-colors"
        >
          Activate
        </button>
      )}
      {row.action === "toggle" && row.active && (
        <div className="flex-shrink-0 w-3 h-3 rounded-full bg-[#a8d44a]" />
      )}
      {row.action === "buy" && (
        <button
          onClick={handleAction}
          className="flex-shrink-0 px-2 py-1 rounded-lg bg-[#8a6a1a] text-[#ffd248] text-xs font-bold hover:bg-[#9a7a2a] transition-colors"
        >
          Buy
        </button>
      )}
    </div>
  );
}

export default function SpeciesPanel({ state, dispatch }) {
  const [activeTab, setActiveTab] = useState("grass");

  const rows = getCategoryViewModel(state, activeTab);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#3a2510] to-[#2b1a0c] text-[#f7e2b6]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#5a3a1a]">
        <h2 className="text-lg font-bold text-[#ffd248]">Species</h2>
        <button
          onClick={() => dispatch({ type: "SET_VIEW", view: "town" })}
          className="text-[#c8a87a] hover:text-white text-xl leading-none"
        >
          ✕
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex border-b border-[#5a3a1a] flex-shrink-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`flex-1 py-2 text-xs font-bold transition-colors ${
              activeTab === cat
                ? "bg-[#4f3010] text-[#ffd248] border-b-2 border-[#ffd248]"
                : "text-[#8a6040] hover:text-[#c8a87a]"
            }`}
          >
            <span className="block text-base">{CATEGORY_ICONS[cat]}</span>
            <span>{CATEGORY_LABELS[cat]}</span>
          </button>
        ))}
      </div>

      {/* Species rows */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {rows.map((row) => (
          <SpeciesRow
            key={row.id}
            row={row}
            category={activeTab}
            dispatch={dispatch}
          />
        ))}
        {rows.length === 0 && (
          <div className="text-center text-[#6a5040] text-sm py-8">
            No species in this category.
          </div>
        )}
      </div>

      {/* Free moves chip */}
      {(state.species?.freeMoves ?? 0) > 0 && (
        <div className="flex-shrink-0 mx-3 mb-3 px-3 py-2 rounded-xl bg-[#4f6b3a]/50 border border-[#a8d44a] text-center">
          <span className="text-[#a8d44a] font-bold">
            +{state.species.freeMoves} free move{state.species.freeMoves !== 1 ? "s" : ""}
          </span>
          <span className="text-[#8ab870] text-xs ml-2">from chained species</span>
        </div>
      )}
    </div>
  );
}
