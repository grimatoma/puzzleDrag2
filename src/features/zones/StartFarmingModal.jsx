import { useState, useMemo } from "react";
import { ZONES, zoneCategories, DEFAULT_ZONE } from "./data.js";

const CATEGORY_LABEL = {
  grass: "Grass",
  grain: "Grain",
  trees: "Trees",
  birds: "Birds",
  vegetables: "Vegetables",
  fruits: "Fruits",
  flowers: "Flowers",
  herd_animals: "Herd Animals",
  cattle: "Cattle",
  mounts: "Mounts",
};

const CATEGORY_GLYPH = {
  grass: "🌿",
  grain: "🌾",
  trees: "🌳",
  birds: "🐦",
  vegetables: "🥕",
  fruits: "🍎",
  flowers: "🌸",
  herd_animals: "🐖",
  cattle: "🐄",
  mounts: "🐎",
};

const MAX_SLOTS = 8;

function TileSlot({ category, selected, locked, onToggle }) {
  const label = CATEGORY_LABEL[category] ?? category;
  const glyph = CATEGORY_GLYPH[category] ?? "•";
  const baseStyle = {
    background: selected ? "#fffaf1" : "#dbcfb6",
    color: "#3a2715",
    border: selected ? "3px solid #91bf24" : "3px solid #8c7656",
    boxShadow: selected ? "0 2px 8px rgba(145,191,36,.25)" : "none",
    opacity: locked ? 0.85 : 1,
    cursor: locked ? "default" : "pointer",
  };
  return (
    <button
      type="button"
      disabled={locked}
      onClick={onToggle}
      className="flex flex-col items-center justify-center rounded-xl px-2 py-3 text-[12px] font-bold w-full transition-colors"
      style={baseStyle}
      aria-pressed={selected}
      aria-label={`${label}${selected ? " selected" : ""}${locked ? " locked" : ""}`}
    >
      <span className="text-[24px] leading-none">{glyph}</span>
      <span className="mt-1 leading-tight">{label}</span>
    </button>
  );
}

export default function StartFarmingModal({ state, dispatch, onClose }) {
  const zoneId = state.activeZone ?? DEFAULT_ZONE;
  const zone = ZONES[zoneId];
  const cats = useMemo(() => zoneCategories(zoneId), [zoneId]);

  // When zone exposes <= 8 categories every slot is auto-selected and
  // locked. When it exposes more, the player picks 8.
  const mustPick = cats.length > MAX_SLOTS;
  const [selected, setSelected] = useState(() =>
    mustPick ? new Set(cats.slice(0, MAX_SLOTS)) : new Set(cats),
  );

  const [useFertilizer, setUseFertilizer] = useState(false);

  if (!zone) return null;

  const fertilizerStock = state.farmFertilizer ?? 0;
  const fertilizerAvailable = fertilizerStock > 0;
  const cost = zone.entryCost?.coins ?? 50;
  const canAfford = (state.coins ?? 0) >= cost;
  const turns = zone.startingTurns * (useFertilizer ? 2 : 1);
  const okTileCount =
    !mustPick || selected.size === MAX_SLOTS;
  const canStart = canAfford && okTileCount;

  function toggleCategory(cat) {
    if (!mustPick) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        if (next.size >= MAX_SLOTS) return prev;
        next.add(cat);
      }
      return next;
    });
  }

  function handleStart() {
    if (!canStart) return;
    dispatch({
      type: "FARM/ENTER",
      payload: {
        selectedTiles: cats.filter((c) => selected.has(c)),
        useFertilizer,
      },
    });
    onClose?.();
  }

  return (
    <div
      className="absolute inset-0 bg-black/60 grid place-items-center z-50 animate-fadein"
      onClick={onClose}
    >
      <div
        className="bg-[#f4ecd8] border-[4px] border-[#b28b62] rounded-[20px] px-6 py-5 max-w-[460px] w-[94vw] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-[20px] text-[#744d2e] text-center mb-1">
          Start Farming — {zone.name}
        </h2>
        <p className="text-[#6a4b31] text-[12px] text-center mb-3 leading-relaxed">
          {mustPick
            ? `Pick ${MAX_SLOTS} tile types to bring to the field.`
            : `These ${cats.length} tile types will be on the field.`}
        </p>

        <div className="grid grid-cols-4 gap-2 mb-3">
          {cats.map((cat) => (
            <TileSlot
              key={cat}
              category={cat}
              selected={selected.has(cat)}
              locked={!mustPick}
              onToggle={() => toggleCategory(cat)}
            />
          ))}
        </div>

        <div className="bg-[#fffaf1]/70 border border-[#d8c8a8] rounded-xl px-3 py-2 mb-3">
          <div className="flex items-center justify-between text-[13px] text-[#3a2715]">
            <span className="font-bold">Turns this session</span>
            <span className="font-mono font-bold text-[16px]">{turns}</span>
          </div>
          <label className="flex items-center gap-2 mt-2 text-[12px] text-[#3a2715]">
            <input
              type="checkbox"
              checked={useFertilizer}
              disabled={!fertilizerAvailable}
              onChange={(e) => setUseFertilizer(e.target.checked)}
            />
            <span>
              Use Fertilizer {fertilizerAvailable ? `(${fertilizerStock} on hand)` : "(none on hand)"} — doubles turns
            </span>
          </label>
        </div>

        <div className="flex items-center justify-between mb-3 text-[13px]">
          <span className="text-[#3a2715] font-bold">Cost to start</span>
          <span
            className={`font-mono font-bold text-[15px] ${canAfford ? "text-[#2a5010]" : "text-[#a02020]"}`}
          >
            {cost}◉
          </span>
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={!canStart}
          className="w-full mb-2 bg-[#91bf24] hover:bg-[#a3d028] disabled:bg-[#9a9a8a] disabled:cursor-not-allowed text-white border-[3px] border-white rounded-2xl px-8 py-2.5 text-[16px] font-bold shadow-lg transition-colors"
        >
          {canAfford ? `Start (${cost}◉)` : "Not enough coin"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full bg-[#9a724d] hover:bg-[#b8845a] text-white font-bold py-2 rounded-lg border border-[#e6c49a] text-[13px] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
