import { useEffect, useRef, useState } from "react";
import { CATEGORIES, TILE_TYPES_MAP } from "./data.js";
import { getCategoryViewModel } from "./effects.js";
import { drawTileIcon } from "../../textures.js";
import { BIOMES } from "../../constants.js";
import { hex } from "../../utils.js";

export const viewKey = "tileCollection";

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

const ALL_FARM_RESOURCES = Object.fromEntries(
  BIOMES.farm.resources.map((r) => [r.key, r]),
);

function lighten(hexColor, amt) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const lr = Math.min(255, Math.round(r + (255 - r) * amt));
  const lg = Math.min(255, Math.round(g + (255 - g) * amt));
  const lb = Math.min(255, Math.round(b + (255 - b) * amt));
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

/**
 * Tiny tile-style portrait that re-uses the same procedural icons rendered
 * onto puzzle tiles, so the tile collection panel matches the in-board art exactly.
 */
function TileIcon({ tileId, size = 40, locked = false }) {
  const ref = useRef(null);
  const t = TILE_TYPES_MAP[tileId];
  const key = t?.baseResource;
  const res = key ? ALL_FARM_RESOURCES[key] : null;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !res) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);
    // Rounded background swatch in the resource's tile color
    const baseColor = hex(res.color);
    const grad = ctx.createRadialGradient(size * 0.4, size * 0.35, 2, size / 2, size / 2, size * 0.6);
    grad.addColorStop(0, lighten(baseColor, 0.25));
    grad.addColorStop(1, baseColor);
    ctx.fillStyle = grad;
    const r = 8;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(size, 0, size, size, r);
    ctx.arcTo(size, size, 0, size, r);
    ctx.arcTo(0, size, 0, 0, r);
    ctx.arcTo(0, 0, size, 0, r);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.32)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Draw the icon centered, scaled down so a 74-canvas icon fits in `size`
    const iconScale = (size / 74) * 0.92;
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.scale(iconScale, iconScale);
    drawTileIcon(ctx, key);
    ctx.restore();
  }, [size, key, res]);

  if (!res) {
    return (
      <div
        className={`flex items-center justify-center text-2xl rounded-lg ${locked ? "opacity-30 grayscale" : ""}`}
        style={{ width: size, height: size }}
      >
        ?
      </div>
    );
  }
  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size, borderRadius: 8, filter: locked ? "grayscale(1) brightness(0.55)" : "none" }}
      aria-hidden="true"
    />
  );
}

function TileRow({ row, category, dispatch }) {
  const handleAction = () => {
    if (row.action === "toggle") {
      dispatch({
        type: "SET_ACTIVE_TILE",
        payload: { category, tileId: row.id },
      });
    } else if (row.action === "buy") {
      dispatch({ type: "BUY_TILE", payload: { id: row.id } });
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
      {/* Portrait / silhouette — unique procedural tile art */}
      <div className="flex-shrink-0">
        <TileIcon tileId={row.id} size={40} locked={row.locked} />
      </div>

      {/* Name + status + description */}
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
        {row.description && !row.locked && (
          <div className="text-[10px] mt-0.5 text-[#a89070] italic leading-snug line-clamp-2">
            {row.description}
          </div>
        )}
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

export default function TileCollectionPanel({ state, dispatch }) {
  const [activeTab, setActiveTab] = useState("grass");

  const rows = getCategoryViewModel(state, activeTab);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#3a2510] to-[#2b1a0c] text-[#f7e2b6]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#5a3a1a]">
        <h2 className="text-lg font-bold text-[#ffd248]">Tiles Collection</h2>
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

      {/* Tile rows */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {rows.map((row) => (
          <TileRow
            key={row.id}
            row={row}
            category={activeTab}
            dispatch={dispatch}
          />
        ))}
        {rows.length === 0 && (
          <div className="text-center text-[#6a5040] text-sm py-8">
            No tiles in this category.
          </div>
        )}
      </div>

      {/* Free moves chip */}
      {(state.tileCollection?.freeMoves ?? 0) > 0 && (
        <div className="flex-shrink-0 mx-3 mb-3 px-3 py-2 rounded-xl bg-[#4f6b3a]/50 border border-[#a8d44a] text-center">
          <span className="text-[#a8d44a] font-bold">
            +{state.tileCollection.freeMoves} free move{state.tileCollection.freeMoves !== 1 ? "s" : ""}
          </span>
          <span className="text-[#8ab870] text-xs ml-2">from chained tiles</span>
        </div>
      )}
    </div>
  );
}
