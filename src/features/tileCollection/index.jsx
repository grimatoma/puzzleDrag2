import { useEffect, useMemo, useRef } from "react";
import {
  TILE_TYPES_MAP,
  SUB_CATEGORIES,
  SUB_CATEGORY_LABELS,
  SUB_CATEGORY_ICONS,
  categoriesForSubCategory,
} from "./data.js";
import { getCategoryViewModel } from "./effects.js";
import { drawTileIcon } from "../../textures.js";
import { BIOMES } from "../../constants.js";
import { hex } from "../../utils.js";
import { FARM_HAZARD_META } from "../farm/hazards.js";
import { HAZARDS } from "../mine/hazards.js";
import IconCanvas, { hasIcon } from "../../ui/IconCanvas.jsx";

export const viewKey = "tileCollection";

const CATEGORY_LABELS = {
  grass: "Grass",
  grain: "Grain",
  wood: "Wood",
  berry: "Berry",
  bird: "Bird",
  vegetables: "Veg",
  fruits: "Fruit",
  flowers: "Flower",
  trees: "Trees",
  herd_animals: "Herd",
  cattle: "Cattle",
  mounts: "Mounts",
  mine_stone: "Stone",
  mine_ore: "Ore",
  mine_coal: "Coal",
  mine_gem: "Gem",
  mine_gold: "Gold",
  mine_dirt: "Dirt",
  fish: "Fish",
};

const CATEGORY_ICONS = {
  grass: "🌾",
  grain: "🌽",
  wood: "🪵",
  berry: "🫐",
  bird: "🐣",
  vegetables: "🥕",
  fruits: "🍎",
  flowers: "🌸",
  trees: "🌳",
  herd_animals: "🐷",
  cattle: "🐄",
  mounts: "🐎",
  mine_stone: "🪨",
  mine_ore: "⛏",
  mine_coal: "🔥",
  mine_gem: "💎",
  mine_gold: "🪙",
  mine_dirt: "🟫",
  fish: "🐟",
};

// Look up resources across every biome — mine and fish tiles also need
// their colour/icon in the wiki, not just farm.
const ALL_RESOURCES = Object.fromEntries(
  Object.values(BIOMES).flatMap((b) => b.resources.map((r) => [r.key, r])),
);

const FARM_HAZARD_LIST = [
  { id: "rats",  ...FARM_HAZARD_META.rats, iconKey: "ui_star", biome: "Farm" },
  { id: "fire",  ...FARM_HAZARD_META.fire, iconKey: "ui_star", biome: "Farm" },
  { id: "wolf",  ...FARM_HAZARD_META.wolf, iconKey: "ui_star", biome: "Farm" },
];

const MINE_HAZARD_LIST = HAZARDS.map((h) => ({
  ...h,
  biome: "Mine",
  icon: { cave_in: "🪨", gas_vent: "💨", lava: "🌋", mole: "🐭" }[h.id] ?? "⚠️",
}));

const ALL_HAZARDS = [...FARM_HAZARD_LIST, ...MINE_HAZARD_LIST];

function lighten(hexColor, amt) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const lr = Math.min(255, Math.round(r + (255 - r) * amt));
  const lg = Math.min(255, Math.round(g + (255 - g) * amt));
  const lb = Math.min(255, Math.round(b + (255 - b) * amt));
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

export function TileIcon({ tileId, size = 40, locked = false }) {
  const ref = useRef(null);
  const t = TILE_TYPES_MAP[tileId];
  const key = t?.baseResource;
  const res = key ? ALL_RESOURCES[key] : null;

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

function TileCard({ row, category, dispatch }) {
  const handleSelect = () => {
    if (row.action !== "toggle" || row.active) return;
    dispatch({ type: "SET_ACTIVE_TILE", payload: { category, tileId: row.id } });
  };
  const handleBuy = () => {
    dispatch({ type: "BUY_TILE", payload: { id: row.id } });
  };

  return (
    <div
      onClick={row.action === "toggle" && !row.active && !row.locked ? handleSelect : undefined}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
        row.action === "toggle" && !row.active && !row.locked
          ? "cursor-pointer hover:scale-[1.03] hover:shadow-lg"
          : ""
      } ${
        row.active
          ? "bg-[#dfeecd] border-[#6a9a3a] shadow-md shadow-[#a8d44a]/25"
          : row.locked
          ? "bg-[var(--well-bg)] border-[var(--well-border)] opacity-70"
          : "bg-[var(--card-bg)] border-[var(--card-border)] hover:border-[var(--card-border-strong)]"
      }`}
      style={{ minHeight: 130 }}
    >
      {/* Active indicator */}
      {row.active && (
        <div className="self-end -mt-1 -mr-1">
          <span
            className="w-5 h-5 rounded-full bg-[#a8d44a] border-2 border-[#a8d44a] text-[#1a2a0a] flex items-center justify-center"
            aria-label="Active"
          >
            <span className="text-[10px] font-bold">✓</span>
          </span>
        </div>
      )}

      {/* Tile icon */}
      <div className="flex-shrink-0">
        <TileIcon tileId={row.id} size={48} locked={row.locked} />
      </div>

      {/* Name */}
      <div className={`font-bold text-xs text-center leading-tight ${
        row.locked ? "text-on-panel-faint" : "text-on-panel"
      }`}>
        {row.name}
      </div>

      {/* Status */}
      <div className={`text-[10px] text-center leading-tight ${
        row.locked ? "text-on-panel-faint" : "text-on-panel-dim"
      }`}>
        {row.status}
      </div>

      {/* Description (only when unlocked) */}
      {row.description && !row.locked && (
        <div className="text-[9px] text-center text-on-panel-faint italic leading-snug line-clamp-2 mt-auto">
          {row.description}
        </div>
      )}

      {/* Buy button */}
      {row.action === "buy" && (
        <button
          onClick={(e) => { e.stopPropagation(); handleBuy(); }}
          className="mt-auto px-3 py-1 rounded-lg bg-[#8a6a1a] text-[#ffd248] text-[10px] font-bold hover:bg-[#9a7a2a] transition-colors"
        >
          Buy
        </button>
      )}
    </div>
  );
}

function HazardCard({ hazard }) {
  const hazKey = `hazard_${hazard.id}`;
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-[#b5503a] bg-[#f1ddc8]" style={{ minHeight: 130 }}>
      {/* Biome badge */}
      <div className="self-end -mt-1 -mr-1">
        <span className="text-[9px] font-bold text-white uppercase tracking-wide bg-[#9c3a2a] px-1.5 py-0.5 rounded">{hazard.biome}</span>
      </div>

      {/* Hazard icon */}
      <div
        className="flex items-center justify-center text-2xl rounded-lg bg-[#e7c8a8] border border-[#b5503a]/50 overflow-hidden"
        style={{ width: 48, height: 48 }}
      >
        {hasIcon(hazKey)
          ? <IconCanvas iconKey={hazKey} size={48} />
          : hazard.icon}
      </div>

      {/* Name */}
      <div className="font-bold text-xs text-center text-[#8a2a14] leading-tight">
        {hazard.name}
      </div>

      {/* Description */}
      <div className="text-[10px] text-center text-on-panel-dim leading-snug line-clamp-2">{hazard.description}</div>

      {/* Clear instruction */}
      {hazard.clearInstruction && (
        <div className="text-[9px] text-center text-on-panel-faint italic leading-snug mt-auto">
          <span className="text-[#8a4a26] not-italic font-semibold">Clear: </span>
          {hazard.clearInstruction}
        </div>
      )}
    </div>
  );
}

export default function TileCollectionPanel({ state, dispatch }) {
  // Sub-category and active category tab live on state.viewParams so the URL
  // (managed by src/router.js) is the single source of truth — back/forward
  // and deep links land on the same wiki page they were copied from.
  const subCategory = state?.viewParams?.sub ?? "farm";
  const visibleCategories = useMemo(
    () => categoriesForSubCategory(subCategory),
    [subCategory],
  );
  const tabBarRef = useRef(null);

  // Visible tab: use the URL value when valid for the current sub-category,
  // otherwise fall back to the first available tab. We never write a default
  // back into state — the URL stays terse until the user explicitly picks one.
  const requestedTab = state?.viewParams?.cat;
  const activeTab = visibleCategories.includes(requestedTab)
    ? requestedTab
    : (visibleCategories[0] ?? null);

  const setSubCategory = (sub) => {
    dispatch({ type: "SET_VIEW_PARAMS", params: { sub, cat: null } });
  };
  const setActiveTab = (cat) => {
    dispatch({ type: "SET_VIEW_PARAMS", params: { cat } });
  };

  const rows =
    subCategory !== "hazards" && activeTab
      ? getCategoryViewModel(state, activeTab)
      : [];

  return (
    <div className="hl-panel">
      {/* Header */}
      <div className="hl-panel-header">
        <h2 className="hl-panel-title">Tiles Wiki</h2>
        <button
          onClick={() => dispatch({ type: "SET_VIEW", view: "town" })}
          className="hl-panel-close"
        >
          ✕
        </button>
      </div>

      {/* Sub-category bar */}
      <div className="flex border-b border-[var(--panel-divider)] flex-shrink-0 bg-[var(--panel-toolbar)]">
        {SUB_CATEGORIES.map((sub) => {
          const selected = subCategory === sub;
          const isHaz = sub === "hazards";
          return (
            <button
              key={sub}
              onClick={() => setSubCategory(sub)}
              className={`flex-1 py-2 px-2 text-xs font-bold transition-colors flex flex-col items-center min-w-[60px] ${
                selected
                  ? isHaz
                    ? "bg-[#9c3a2a] text-white border-b-2 border-[#9c3a2a]"
                    : "bg-[var(--ember)] text-white border-b-2 border-[var(--ember-hot)]"
                  : isHaz
                    ? "text-[#9c3a2a] hover:text-[#8a2a14]"
                    : "text-on-panel-dim hover:text-on-panel"
              }`}
            >
              <span className="block text-base leading-none">{SUB_CATEGORY_ICONS[sub]}</span>
              <span className="block text-center leading-tight mt-0.5">{SUB_CATEGORY_LABELS[sub]}</span>
            </button>
          );
        })}
      </div>

      {/* Category tabs — scrollable row (hidden under Hazards) */}
      {subCategory !== "hazards" && visibleCategories.length > 0 && (
        <div
          ref={tabBarRef}
          className="flex border-b border-[var(--panel-divider)] flex-shrink-0 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {visibleCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`flex-shrink-0 py-2 px-2 text-xs font-bold transition-colors min-w-[52px] ${
                activeTab === cat
                  ? "bg-[var(--ember)] text-white border-b-2 border-[var(--ember-hot)]"
                  : "text-on-panel-dim hover:text-on-panel"
              }`}
            >
              <span className="grid place-items-center mx-auto" style={{ width: 22, height: 22 }}>
                {hasIcon(`cat_${cat}`)
                  ? <IconCanvas iconKey={`cat_${cat}`} size={22} />
                  : <span className="text-base">{CATEGORY_ICONS[cat]}</span>}
              </span>
              <span className="block text-center leading-tight">{CATEGORY_LABELS[cat]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="hl-panel-body">
        {subCategory === "hazards" ? (
          <>
            <div className="text-xs text-on-panel-dim text-center py-1 mb-2 italic">
              Hazards cannot be selected — they appear automatically and must be cleared.
            </div>
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}
            >
              {ALL_HAZARDS.map((h) => (
                <HazardCard key={h.id} hazard={h} />
              ))}
            </div>
          </>
        ) : visibleCategories.length === 0 ? (
          <div className="hl-empty text-sm py-8">
            No tile types in this section yet.
          </div>
        ) : (
          <>
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}
            >
              {rows.map((row) => (
                <TileCard
                  key={row.id}
                  row={row}
                  category={activeTab}
                  dispatch={dispatch}
                />
              ))}
            </div>
            {rows.length === 0 && (
              <div className="hl-empty text-sm py-8">
                No tiles in this category.
              </div>
            )}
          </>
        )}
      </div>

      {/* Free moves chip */}
      {(state.tileCollection?.freeMoves ?? 0) > 0 && subCategory !== "hazards" && (
        <div className="flex-shrink-0 mx-3 mb-3 px-3 py-2 rounded-xl bg-[#dfeecd] border-2 border-[#6a9a3a] text-center">
          <span className="text-[#2f5a14] font-bold">
            +{state.tileCollection.freeMoves} free move{state.tileCollection.freeMoves !== 1 ? "s" : ""}
          </span>
          <span className="text-[#4a6a20] text-xs ml-2">from chained tiles</span>
        </div>
      )}
    </div>
  );
}
