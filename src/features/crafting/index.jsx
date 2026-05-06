import { useState, useEffect, useRef } from "react";
import { RECIPES, BIOMES } from "../../constants.js";

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
  bakery: { label: "Bakery", icon: "🏠", bg: "#8a4a26" },
  forge:  { label: "Forge",  icon: "⚒",  bg: "#5a6973" },
  larder: { label: "Larder", icon: "🥫", bg: "#4f6b3a" },
};

// Ordered list of all stations
const STATION_ORDER = ["bakery", "larder", "forge"];

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

  return (
    <div className="bg-[#f6efe0] border-2 border-[#c5a87a] rounded-xl p-2 flex items-center gap-2 relative" style={{ minHeight: 72 }}>
      {timesBuilt > 0 && (
        <div className="absolute top-1 right-1 text-[10px] text-[#8a785e] font-bold">×{timesBuilt}</div>
      )}

      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-[11px] text-[#3a2715] leading-tight">{recipe.name}</span>
          {recipe.tier === 2 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white bg-[#c8923a]">T2</span>
          )}
        </div>

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
        <span className="text-[10px] font-bold text-[#c8923a]">+{recipe.coins}◉</span>
        <button
          disabled={!craftable}
          onClick={() => dispatch({ type: "CRAFTING/CRAFT_RECIPE", recipeKey })}
          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border-2 transition-colors ${
            craftable
              ? "bg-[#91bf24] border-[#6a9010] text-white hover:bg-[#a3d028]"
              : "bg-[#ccc] border-[#aaa] text-[#666] cursor-not-allowed"
          }`}
        >
          {!levelOk ? "🔒 L3" : !stationOk ? "No station" : "CRAFT"}
        </button>
      </div>
    </div>
  );
}

export default function CraftingScreen({ state, dispatch }) {
  const { inventory = {}, built = {}, level = 1, craftedTotals = {}, craftingTab } = state;

  // Stations that exist (built or not) — always show all three tabs, but indicate built status
  const builtStations = STATION_ORDER.filter((s) => stationBuilt(built, s));

  // Determine active tab: prefer state.craftingTab if valid, else first built station
  const [localTab, setLocalTab] = useState(() => {
    if (craftingTab && STATION_ORDER.includes(craftingTab)) return craftingTab;
    return builtStations[0] || STATION_ORDER[0];
  });

  // Sync when craftingTab changes (e.g. navigated from town)
  const prevCraftingTab = useRef(craftingTab);
  useEffect(() => {
    if (craftingTab && craftingTab !== prevCraftingTab.current && STATION_ORDER.includes(craftingTab)) {
      prevCraftingTab.current = craftingTab;
      setLocalTab(craftingTab);
    }
  }, [craftingTab]);

  const activeTab = localTab;
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

      {/* Station tabs */}
      <div className="flex gap-1.5 px-3 py-2 flex-shrink-0">
        {STATION_ORDER.map((s) => {
          const m = STATION_META[s];
          const isActive = activeTab === s;
          const isBuilt = stationBuilt(built, s);
          return (
            <button
              key={s}
              onClick={() => setLocalTab(s)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold border-2 transition-colors ${
                isActive
                  ? "text-white border-transparent"
                  : "bg-[#3a2715]/60 border-[#5a3a20] text-[#f8e7c6]/60 hover:bg-[#3a2715]/80"
              }`}
              style={isActive ? { backgroundColor: m.bg, borderColor: "rgba(255,255,255,0.2)" } : {}}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
              {!isBuilt && <span className="text-[9px] opacity-60">🔒</span>}
            </button>
          );
        })}
      </div>

      {/* Recipes for active station */}
      {!stationBuilt(built, activeTab) ? (
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
