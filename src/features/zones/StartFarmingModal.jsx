import { useState, useMemo } from "react";
import { ZONES, zoneCategories, DEFAULT_ZONE, ZONE_TO_TILE_CATEGORIES, turnBudgetAdditiveBonusForZone, turnBudgetForZone, zoneBaseTurns, settlementHazards } from "./data.js";
import { TILE_TYPES_BY_CATEGORY, TILE_TYPES_MAP } from "../tileCollection/data.js";
import { TileIcon } from "../tileCollection/index.jsx";

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

/** Tile-collection categories backing a zone-level category. Zone "trees"
 *  intentionally covers both the tile-collection `trees` and `wood` chains. */
function tileCategoriesForZoneCategory(zoneCat) {
  return ZONE_TO_TILE_CATEGORIES[zoneCat] ?? [zoneCat];
}

/** Returns the currently-active tile-type id for a zone category, or null. */
function activeTileForZoneCategory(state, zoneCat) {
  const tileCats = tileCategoriesForZoneCategory(zoneCat);
  const active = state?.tileCollection?.activeByCategory ?? {};
  for (const tc of tileCats) {
    const id = active[tc];
    if (id) return id;
  }
  return null;
}

/** All discovered (unlocked) tile-type rows for a zone category, grouped by
 *  their tile-collection category. */
function unlockedRowsForZoneCategory(state, zoneCat) {
  const discovered = state?.tileCollection?.discovered ?? {};
  const out = [];
  for (const tc of tileCategoriesForZoneCategory(zoneCat)) {
    const types = TILE_TYPES_BY_CATEGORY[tc] ?? [];
    for (const t of types) {
      if (!discovered[t.id]) continue;
      out.push({ tileCat: tc, tile: t });
    }
  }
  return out;
}

function TileSlot({ category, selected, locked, activeTileId, onToggle, onChoose }) {
  const label = CATEGORY_LABEL[category] ?? category;
  const fallbackGlyph = CATEGORY_GLYPH[category] ?? "•";
  const activeTile = activeTileId ? TILE_TYPES_MAP[activeTileId] : null;
  const baseStyle = {
    background: selected ? "#fffaf1" : "#dbcfb6",
    color: "#3a2715",
    border: selected ? "3px solid #91bf24" : "3px solid #8c7656",
    boxShadow: selected ? "0 2px 8px rgba(145,191,36,.25)" : "none",
    opacity: locked ? 0.85 : 1,
    cursor: "pointer",
  };
  // When mustPick is on, a single click toggles inclusion. A dedicated
  // "Change" affordance opens the picker so toggling the slot off doesn't
  // accidentally open it.
  const showChangeButton = selected;
  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={onToggle}
        className="flex flex-col items-center justify-center rounded-xl px-2 py-3 text-[12px] font-bold w-full transition-colors"
        style={baseStyle}
        aria-pressed={selected}
        aria-label={`${label}${selected ? " selected" : ""}${locked ? " locked" : ""}`}
      >
        <span className="grid place-items-center" style={{ width: 36, height: 36 }}>
          {activeTile ? (
            <TileIcon tileId={activeTile.id} size={36} />
          ) : (
            <span className="text-[24px] leading-none">{fallbackGlyph}</span>
          )}
        </span>
        <span className="mt-1 leading-tight text-center">
          {activeTile ? activeTile.displayName : label}
        </span>
        <span className="text-[10px] text-[#6a4b31] leading-tight mt-0.5 truncate max-w-full">
          {activeTile ? label : "Pick a tile"}
        </span>
      </button>
      {showChangeButton && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChoose(); }}
          className="absolute top-1 right-1 bg-[#744d2e] text-[#fffaf1] rounded-md text-[10px] font-bold px-1.5 py-0.5 hover:bg-[#8a6040]"
          title="Change tile"
        >
          ✎
        </button>
      )}
    </div>
  );
}

function TileChooserPopup({ zoneCategory, state, dispatch, onClose }) {
  const label = CATEGORY_LABEL[zoneCategory] ?? zoneCategory;
  const rows = useMemo(
    () => unlockedRowsForZoneCategory(state, zoneCategory),
    [state, zoneCategory],
  );
  const active = state?.tileCollection?.activeByCategory ?? {};

  function pick(row) {
    // Clear sibling tile-collection categories that share this zone slot, so
    // the active tile is unambiguous (e.g. picking a "wood_*" tile clears any
    // active "tree_*" entry from the trees slot).
    for (const tc of tileCategoriesForZoneCategory(zoneCategory)) {
      if (tc !== row.tileCat && active[tc]) {
        dispatch({ type: "SET_ACTIVE_TILE", payload: { category: tc, tileId: null } });
      }
    }
    dispatch({
      type: "SET_ACTIVE_TILE",
      payload: { category: row.tileCat, tileId: row.tile.id },
    });
    onClose();
  }

  return (
    <div
      className="absolute inset-0 bg-black/50 grid place-items-center z-[60]"
      onClick={onClose}
    >
      <div
        className="bg-[#f4ecd8] border-[4px] border-[#b28b62] rounded-[16px] px-4 py-3 max-w-[420px] w-[92vw] max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-[16px] text-[#744d2e]">
            Choose {label} tile
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#744d2e] text-xl leading-none hover:text-[#3a2715]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {rows.length === 0 ? (
          <p className="text-[#6a4b31] text-[13px] text-center py-6">
            No {label} tiles unlocked yet. Visit the Tiles Wiki to research or
            buy new variants.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {rows.map(({ tile, tileCat }) => {
              const isActive = active[tileCat] === tile.id;
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => pick({ tile, tileCat })}
                  className="flex flex-col items-center rounded-xl px-2 py-2 text-[12px] font-bold transition-colors"
                  style={{
                    background: isActive ? "#fffaf1" : "#dbcfb6",
                    color: "#3a2715",
                    border: isActive ? "3px solid #91bf24" : "3px solid #8c7656",
                  }}
                >
                  <span className="grid place-items-center" style={{ width: 40, height: 40 }}>
                    <TileIcon tileId={tile.id} size={40} />
                  </span>
                  <span className="mt-1 leading-tight text-center">
                    {tile.displayName}
                  </span>
                  {isActive && (
                    <span className="text-[10px] text-[#2a5010] mt-0.5">● Active</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
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
  const [chooserCat, setChooserCat] = useState(null);

  if (!zone) return null;

  const fertilizerStock = state.tools?.fertilizer ?? 0;
  const fertilizerAvailable = fertilizerStock > 0;
  const cost = zone.entryCost?.coins ?? 50;
  const canAfford = (state.coins ?? 0) >= cost;
  const baseTurns = zoneBaseTurns(zone);
  const buildingTurns = turnBudgetAdditiveBonusForZone(state, zoneId);
  const turns = turnBudgetForZone(state, zoneId, { useFertilizer });
  const okTileCount =
    !mustPick || selected.size === MAX_SLOTS;
  const canStart = canAfford && okTileCount;

  function toggleCategory(cat) {
    if (!mustPick) {
      // Locked slots — clicking the slot opens the chooser instead of
      // toggling.
      setChooserCat(cat);
      return;
    }
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
        className="bg-[#f4ecd8] border-[4px] border-[#b28b62] rounded-[20px] px-6 py-5 max-w-[460px] w-[94vw] shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-[20px] text-[#744d2e] text-center mb-1">
          Start Farming — {zone.name}
        </h2>
        <p className="text-[#6a4b31] text-[12px] text-center mb-3 leading-relaxed">
          {mustPick
            ? `Pick ${MAX_SLOTS} tile types to bring to the field. Tap ✎ to swap a tile variant.`
            : `These ${cats.length} tile types will be on the field. Tap a slot to pick a variant.`}
        </p>

        <div className="grid grid-cols-4 gap-2 mb-3">
          {cats.map((cat) => (
            <TileSlot
              key={cat}
              category={cat}
              selected={selected.has(cat)}
              locked={!mustPick}
              activeTileId={activeTileForZoneCategory(state, cat)}
              onToggle={() => toggleCategory(cat)}
              onChoose={() => setChooserCat(cat)}
            />
          ))}
        </div>

        {/* Hazards / Dangers list */}
        {(() => {
          const hazards = settlementHazards(state, zoneId);
          if (hazards.length === 0) return null;
          return (
            <div className="mb-3 flex flex-col gap-1">
              <div className="text-[10px] uppercase tracking-wider text-[#9a3a2a] font-bold flex items-center gap-1">
                ⚠️ Active Dangers
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hazards.map((h) => (
                  <span key={h} className="text-[10px] font-bold bg-[#9a3a2a]/10 text-[#9a3a2a] border border-[#9a3a2a]/30 rounded-lg px-2 py-0.5 capitalize">
                    {h.replace("_", " ")}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="bg-[#fffaf1]/70 border border-[#d8c8a8] rounded-xl px-3 py-2 mb-3">
          <div className="flex items-center justify-between text-[13px] text-[#3a2715]">
            <span className="font-bold">Turns this session</span>
            <span className="font-mono font-bold text-[16px]">{turns}</span>
          </div>
          <div className="mt-0.5 text-[11px] text-[#6a4b31]">
            Base {baseTurns}{buildingTurns > 0 ? ` + buildings ${buildingTurns}` : ""}{useFertilizer ? " × fertilizer" : ""}
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

        {chooserCat && (
          <TileChooserPopup
            zoneCategory={chooserCat}
            state={state}
            dispatch={dispatch}
            onClose={() => setChooserCat(null)}
          />
        )}
      </div>
    </div>
  );
}
