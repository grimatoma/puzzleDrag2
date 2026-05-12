import { useEffect, useRef, useState } from "react";
import { RECIPES, BIOMES, ITEMS } from "../../constants.js";
import { DECORATIONS } from "../decorations/data.js";
import IconCanvas, { hasIcon } from "../../ui/IconCanvas.jsx";
import { locBuilt } from "../../locBuilt.js";
import Icon from "../../ui/Icon.jsx";

export const viewKey = "crafting";

const ALL_RESOURCES = [
  ...BIOMES.farm.resources,
  ...BIOMES.mine.resources,
];

function colorForKey(key) {
  const r = ALL_RESOURCES.find((x) => x.key === key);
  if (!r) return "#888";
  return "#" + r.color.toString(16).padStart(6, "0");
}

const STATION_META = {
  bakery:   { label: "Bakery",   iconKey: "station_bakery",   bg: "#8a4a26" },
  forge:    { label: "Forge",    iconKey: "station_forge",    bg: "#5a6973" },
  larder:   { label: "Larder",   iconKey: "station_larder",   bg: "#4f6b3a" },
  workshop: { label: "Workshop", iconKey: "station_workshop", bg: "#6a5a3a" },
  decor:    { label: "Decor",    iconKey: "station_decor",    bg: "#7a3a8a" },
};

// Ordered list of all stations (decor appended)
const STATION_ORDER = ["bakery", "larder", "forge", "workshop", "decor"];

function stationBuilt(built, station) {
  return !!(built && built[station]);
}

function canCraft(recipe, inventory, built, level) {
  if (recipe.tier === 2 && level < 3) return false;
  if (!stationBuilt(built, recipe.station)) return false;
  for (const [res, need] of Object.entries(recipe.inputs)) {
    if ((inventory[res] || 0) < need) return false;
  }
  return true;
}

function RecipeCard({ recipeKey, recipe, inventory, built, level, craftedTotals, dispatch }) {
  const craftable = canCraft(recipe, inventory, built, level);
  const stationOk = stationBuilt(built, recipe.station);
  const levelOk = !(recipe.tier === 2 && level < 3);
  const timesBuilt = (craftedTotals || {})[recipeKey] || 0;

  const itemDef = ITEMS[recipe.item] || {};
  const itemName = itemDef.label || recipe.item;

  return (
    <div className="bg-[#f6efe0] border-2 border-[#c5a87a] rounded-xl p-2 flex items-center gap-2 relative" style={{ minHeight: 72 }}>
      {timesBuilt > 0 && (
        <div className="absolute top-1 right-1 text-[10px] text-[#8a785e] font-bold">×{timesBuilt}</div>
      )}

      <div
        className="flex-shrink-0 grid place-items-center rounded-lg overflow-hidden bg-[#e8d9bc] border border-[#c5a87a]/50 text-[24px]"
        style={{ width: 48, height: 48 }}
      >
        <Icon iconKey={recipe.item} size={40} />
      </div>

      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-[11px] text-[#3a2715] leading-tight">{itemName}</span>
          {recipe.tier === 2 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white bg-[#c8923a]">T2</span>
          )}
        </div>
        {recipe.desc && (
          <p className="text-xs text-stone-500 leading-tight">{recipe.desc}</p>
        )}

        <div className="flex flex-wrap gap-1 mt-0.5">
          {Object.entries(recipe.inputs).map(([res, need]) => {
            const have = (inventory || {})[res] || 0;
            const enough = have >= need;
            const bg = colorForKey(res);
            return (
              <span
                key={res}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                style={{
                  backgroundColor: bg,
                  opacity: enough ? 1 : 0.45,
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              >
                {res} ×{need}
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {itemDef.value != null && itemDef.kind !== "tool"
          ? <span className="text-[10px] font-bold text-[#c8923a]">+{itemDef.value}◉</span>
          : itemDef.kind === "tool"
            ? <span className="text-[10px] font-bold text-[#6a8a3a]">→ {itemName}</span>
            : null
        }
        <button
          disabled={!craftable}
          onClick={() => dispatch({ type: "CRAFTING/CRAFT_RECIPE", payload: { key: recipeKey }, recipeKey })}
          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border-2 transition-colors ${
            craftable
              ? "bg-[#91bf24] border-[#6a9010] text-white hover:bg-[#a3d028]"
              : "bg-[#ccc] border-[#aaa] text-[#666] cursor-not-allowed"
          }`}
        >
          {!levelOk ? "🔒 L3" : !stationOk ? "No station" : "CRAFT"}
        </button>
        {/* Phase 5 — queue this craft to finish in real time (frees the inputs now). */}
        <button
          disabled={!craftable}
          onClick={() => dispatch({ type: "CRAFTING/QUEUE_RECIPE", payload: { key: recipeKey }, recipeKey })}
          title="Queue — ready in 4h (or skip with a gem)"
          className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
            craftable
              ? "bg-[#e8d4a8] border-[#b08040] text-[#6a4a18] hover:bg-[#f0e0bc]"
              : "bg-[#ddd] border-[#bbb] text-[#888] cursor-not-allowed"
          }`}
        >
          ⏳ Queue 4h
        </button>
      </div>
    </div>
  );
}

// Phase 5 — the in-progress craft queue strip shown atop the crafting screen.
function CraftQueueStrip({ queue, gems, dispatch }) {
  // `now` lives in state (refreshed on a slow interval) so the countdown ticks
  // and we never call the impure Date.now() during render.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!queue || queue.length === 0) return null;
  const fmt = (ms) => {
    if (ms <= 0) return "Ready!";
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };
  return (
    <div className="bg-[#3a2715]/60 border-b border-[#e2c19b]/40 px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#e2c19b] mb-1">In the workshop · {queue.length}</div>
      <div className="flex flex-col gap-1">
        {queue.map((entry, i) => {
          const recipe = RECIPES[entry.key];
          const itemDef = ITEMS[recipe?.item] || {};
          const ready = (entry.readyAt ?? Infinity) <= now;
          return (
            <div key={`${entry.key}-${entry.queuedAt}-${i}`} className="flex items-center gap-2 bg-[#f6efe0] rounded-lg px-2 py-1">
              <Icon iconKey={recipe?.item || entry.key} size={20} />
              <span className="text-[11px] font-bold text-[#3a2715] flex-1 min-w-0 truncate">{itemDef.label ?? recipe?.item ?? entry.key}</span>
              <span className={`text-[10px] font-bold ${ready ? "text-[#3a7a3a]" : "text-[#8a785e]"}`}>{fmt((entry.readyAt ?? 0) - now)}</span>
              <button
                disabled={!ready}
                onClick={() => dispatch({ type: "CRAFTING/CLAIM_CRAFT", payload: { idx: i } })}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border-2 ${ready ? "bg-[#91bf24] border-[#6a9010] text-white" : "bg-[#ccc] border-[#aaa] text-[#666] cursor-not-allowed"}`}
              >Claim</button>
              {!ready && (
                <button
                  disabled={(gems ?? 0) < 1}
                  onClick={() => dispatch({ type: "CRAFTING/SKIP_CRAFT", payload: { idx: i } })}
                  title={(gems ?? 0) < 1 ? "Need a gem" : "Skip with a gem"}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${(gems ?? 0) >= 1 ? "bg-[#bfe0ff] border-[#5a8acc] text-[#1a3a5a]" : "bg-[#ddd] border-[#bbb] text-[#888] cursor-not-allowed"}`}
                >Skip 💎</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function canAffordDecor(decor, state) {
  const { cost } = decor;
  if ((state.coins ?? 0) < (cost.coins ?? 0)) return false;
  const inv = state.inventory ?? {};
  for (const [k, v] of Object.entries(cost)) {
    if (k === "coins") continue;
    if ((inv[k] ?? 0) < v) return false;
  }
  return true;
}

function DecorationCard({ decor, state, dispatch }) {
  const affordable = canAffordDecor(decor, state);
  const count = locBuilt(state).decorations?.[decor.id] ?? 0;
  const decorIconKey = `decor_${decor.id}`;
  return (
    <div className="bg-[#f6efe0] border-2 border-[#c5a87a] rounded-xl p-2 flex items-center gap-2 relative" style={{ minHeight: 72 }}>
      {count > 0 && (
        <div className="absolute top-1 right-1 text-[10px] text-[#8a785e] font-bold">×{count}</div>
      )}
      {hasIcon(decorIconKey) && (
        <div
          className="flex-shrink-0 grid place-items-center rounded-lg overflow-hidden"
          style={{ width: 48, height: 48, background: "rgba(122,58,168,0.12)", border: "1px solid rgba(122,58,168,0.35)" }}
        >
          <IconCanvas iconKey={decorIconKey} size={48} />
        </div>
      )}
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="font-bold text-[11px] text-[#3a2715] leading-tight">{decor.name}</span>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {Object.entries(decor.cost).map(([k, v]) => (
            <span key={k} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#3a2715]/60 text-[#f8e7c6] border border-[#e2c19b]/30">
              {v} {k === "coins" ? "◉" : k}
            </span>
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

export default function CraftingScreen({ state, dispatch }) {
  const { inventory = {}, level = 1, craftedTotals = {}, craftingTab } = state;
  const built = locBuilt(state);

  // Stations that exist (built or not) — always show all three tabs, but indicate built status
  const builtStations = STATION_ORDER.filter((s) => stationBuilt(built, s));

  // Active tab is URL-driven via state.craftingTab (the router projects it
  // onto `#/crafting/<station>`). When unset (first visit), default to the
  // first built station and back-fill craftingTab so the URL reflects it.
  const activeTab = (craftingTab && STATION_ORDER.includes(craftingTab))
    ? craftingTab
    : (builtStations[0] || STATION_ORDER[0]);

  const dispatchedDefaultRef = useRef(false);
  useEffect(() => {
    if (dispatchedDefaultRef.current) return;
    if (craftingTab && STATION_ORDER.includes(craftingTab)) return;
    dispatchedDefaultRef.current = true;
    dispatch({ type: "SET_VIEW", view: "crafting", craftingTab: activeTab });
  }, [craftingTab, activeTab, dispatch]);

  const setActiveTab = (s) => dispatch({ type: "SET_VIEW", view: "crafting", craftingTab: s });
  const stationRecipes = Object.entries(RECIPES).filter(([, r]) => r.station === activeTab);
  const meta = STATION_META[activeTab];

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#7c4f2c] to-[#6b4225] border-[3px] border-[#e2c19b] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0 border-b border-[#e2c19b]/40">
        <span className="font-bold text-[14px] text-[#f8e7c6]">🔨 Crafting</span>
        <button
          onClick={() => dispatch({ type: "SET_VIEW", view: "town" })}
          className="w-7 h-7 rounded-lg bg-[#f6efe0] border-2 border-[#b28b62] grid place-items-center text-[#6a4b31] font-bold text-[14px]"
        >
          ✕
        </button>
      </div>

      {/* Phase 5 — real-time craft queue */}
      <CraftQueueStrip queue={state.craftQueue} gems={state.gems} dispatch={dispatch} />

      {/* Station tabs */}
      <div className="flex gap-1 px-2 py-2 flex-shrink-0 overflow-x-auto">
        {STATION_ORDER.map((s) => {
          const m = STATION_META[s];
          const isActive = activeTab === s;
          const isBuilt = s === "decor" ? true : stationBuilt(built, s);
          return (
            <button
              key={s}
              onClick={() => setActiveTab(s)}
              className={`flex-shrink-0 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold border-2 transition-colors ${
                isActive
                  ? "text-white border-transparent"
                  : "bg-[#3a2715]/60 border-[#5a3a20] text-[#f8e7c6]/60 hover:bg-[#3a2715]/80"
              }`}
              style={isActive ? { backgroundColor: m.bg, borderColor: "rgba(255,255,255,0.2)" } : {}}
            >
              <span style={{ width: 22, height: 22, display: "inline-grid", placeItems: "center" }}>
                <IconCanvas iconKey={m.iconKey} size={22} />
              </span>
              <span>{m.label}</span>
              {!isBuilt && <span className="text-[9px] opacity-60">🔒</span>}
            </button>
          );
        })}
      </div>

      {/* Content for active tab */}
      {activeTab === "decor" ? (
        <div className="flex-1 overflow-y-auto p-2">
          <div className="grid grid-cols-2 portrait:grid-cols-1 gap-2">
            {Object.values(DECORATIONS).map((decor) => (
              <DecorationCard key={decor.id} decor={decor} state={state} dispatch={dispatch} />
            ))}
          </div>
        </div>
      ) : !stationBuilt(built, activeTab) ? (
        <div className="flex-1 grid place-items-center px-4">
          <p className="italic text-[#f8e7c6]/70 text-[12px] text-center">
            Build the {meta.label} in town to unlock these recipes.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2">
          <div className="grid grid-cols-2 portrait:grid-cols-1 gap-2">
            {stationRecipes.map(([key, recipe]) => (
              <RecipeCard
                key={key}
                recipeKey={key}
                recipe={recipe}
                inventory={inventory}
                built={built}
                level={level}
                craftedTotals={craftedTotals}
                dispatch={dispatch}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
