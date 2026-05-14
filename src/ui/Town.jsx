import { useState, useMemo } from "react";
import { BUILDINGS } from "../constants.js";
import { displayZoneName } from "../features/zones/data.js";
import { buildTownPlan } from "../townLayout.js";
import TownGround from "./TownGround.jsx";
import TownVillagers from "./TownVillagers.jsx";
import Icon from "./Icon.jsx";
import { BuildingIllustration, FarmFieldArt, MineEntranceArt, Cloud, BuildingSmoke, HearthGlow } from "./BuildingIllustration.jsx";
import { BiomeEntryModal } from "./modals/BiomeEntryModal.jsx";
import { FoundSettlementBanner } from "./banners/FoundSettlementBanner.jsx";
import {
  ALL_BUILDING_IDS, SMOKE_BUILDINGS, TOWN_THEMES, TOWN_BIOME_CONFIGS, LOCATION_TOWN_CONFIGS
} from "./townData.js";

const BOARD_META = {
  farm: { label: "Hearthwood", icon: "biome_farm", border: "#5a8e20", art: () => <FarmFieldArt /> },
  mine: { label: "Ironridge",   icon: "biome_mine", border: "#5c5860", art: (locked) => <MineEntranceArt locked={locked} /> },
  fish: { label: "Deep Sea",    icon: "biome_fish", border: "#3a5a82", art: () => null }, // placeholder
};

export function TownView({ state, dispatch }) {
  const [entryBiome, setEntryBiome] = useState(null);
  const [purchaseBuilding, setPurchaseBuilding] = useState(null);
  const [activeTab, setActiveTab] = useState("built"); // "built" | "build" | "events"

  const level = state.level ?? 1;
  const zoneId = state.mapCurrent ?? "home";
  const built = state.built?.[zoneId] ?? {};
  const population = Object.values(built).reduce((sum, b) => sum + (b.population || 0), 0);
  const maxPopulation = Object.values(built).reduce((sum, b) => sum + (b.maxPopulation || 0), 0);

  const theme = LOCATION_TOWN_CONFIGS[zoneId] || LOCATION_TOWN_CONFIGS.home;
  const colors = TOWN_THEMES[theme.themeKey] || TOWN_THEMES.home;
  const biomeCfg = TOWN_BIOME_CONFIGS[theme.biomeVariant] || TOWN_BIOME_CONFIGS.farm;

  const buildings = ALL_BUILDING_IDS.map(id => {
    const b = BUILDINGS.find(x => x.id === id);
    const count = built[id] || 0;
    const isBuilt = count > 0;
    return { ...b, count, isBuilt };
  });

  const availableToBuild = BUILDINGS.filter(b => {
    if (built[b.id]) return false;
    if (b.requireBuilding && !built[b.requireBuilding]) return false;
    if (b.requireLevel && level < b.requireLevel) return false;
    return true;
  });

  const townPlan = useMemo(() => buildTownPlan({
    zoneId,
    plotCount: ALL_BUILDING_IDS.length,
    boardKinds: Object.keys(BOARD_META),
  }), [zoneId]);
  const buildingLots = useMemo(() => ALL_BUILDING_IDS.map((id, index) => {
    const lot = townPlan.lots[index] || townPlan.lots[townPlan.lots.length - 1];
    return {
      id,
      index,
      x: lot.cx - lot.w / 2,
      y: lot.cy - lot.h / 2,
      w: lot.w,
      h: lot.h,
      baseY: lot.cy + lot.h / 2,
    };
  }), [townPlan]);
  const builtLotIndexes = useMemo(() => new Set(
    buildingLots.filter((b) => built[b.id] > 0).map((b) => b.index),
  ), [buildingLots, built]);
  const villagerBuildings = useMemo(() => Object.fromEntries(
    buildingLots.filter((b) => built[b.id] > 0).map((b) => [b.id, b.index]),
  ), [buildingLots, built]);

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col" style={{ background: colors.bg }}>
      {/* Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[15%] w-32 h-32 rounded-full" style={{ background: colors.sunColor, boxShadow: `0 0 60px ${colors.sunGlow}` }} />
        <Cloud top="15%" w={180} h={60} color={colors.sunGlow} anim="cloudFloat 45s linear infinite" />
        <Cloud top="25%" w={140} h={50} color={colors.sunGlow} anim="cloudFloat 60s linear infinite reverse" />
        <Cloud top="10%" w={220} h={70} color={colors.sunGlow} anim="cloudFloat 80s linear infinite" />
      </div>

      <TownGround plan={townPlan} theme={colors} biomeVariant={theme.biomeVariant} builtLots={builtLotIndexes} />

      {/* Puzzle-board fixtures — the farm field, mine entrance and harbor sit
          on grounded lots in the town's wings (from townPlan.boards) and tie
          into the road network via short dirt paths drawn by TownGround. The
          interactive element is the scene itself — no boxed UI card — with a
          hanging wooden signpost above and a soft glow on hover. */}
      <div className="absolute inset-0 pointer-events-none">
        {(townPlan.boards || []).map((b) => {
          const meta = BOARD_META[b.kind];
          const locked = state.level < (b.kind === "mine" ? 2 : b.kind === "fish" ? 3 : 0);
          if (!meta) return null;
          return (
            <button
              key={b.kind}
              type="button"
              aria-label={locked ? `${meta.label} (locked until level 2)` : `Enter ${meta.label}`}
              disabled={locked}
              className="absolute cursor-pointer group pointer-events-auto bg-transparent border-0 p-0 focus-visible:outline-2 focus-visible:outline-[#ffd248] focus-visible:rounded disabled:cursor-not-allowed"
              style={{
                left: `${((b.cx - b.w / 2) / 1100) * 100}%`,
                top: `${(b.cy - b.h / 2) / 600 * 100}%`,
                width: `${(b.w / 1100) * 100}%`,
                height: `${(b.h / 600) * 100}%`,
                opacity: locked ? 0.78 : 1,
                zIndex: Math.floor(b.cy + b.h / 2),
              }}
              onClick={() => setEntryBiome(b.kind)}
            >
              <div
                className="relative w-full h-full transition-transform duration-150 group-hover:scale-[1.04]"
                style={{ filter: locked ? "saturate(0.55) brightness(0.78)" : "none", transformOrigin: "50% 80%" }}
              >
                {/* Glow halo */}
                <div className="absolute left-[6%] right-[6%] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-[8%]"
                  style={{ top: "30%", bottom: "4%", boxShadow: locked ? "0 0 0 2px rgba(180,180,180,.5) inset" : "0 0 30px 8px rgba(255,210,72,.55)" }} />
                {meta.art(locked)}
                
                {/* Hanging wooden signpost */}
                <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
                  style={{ top: "20%", width: "82%" }}>
                  <div
                    className="flex items-center justify-center gap-1 font-bold text-[#f6ecd4] px-2 py-0.5 rounded-sm whitespace-nowrap"
                    style={{
                      background: "linear-gradient(180deg, #8a5a2a 0%, #5a3a18 100%)",
                      border: "1.5px solid #3a2410",
                      boxShadow: "0 2px 4px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,220,160,.25)",
                      fontSize: "clamp(8px,0.85vw,11px)",
                      textShadow: "0 1px 1px rgba(0,0,0,.7)",
                    }}
                  >
                    <Icon iconKey={locked ? "ui_lock" : meta.icon} size={11} /> {meta.label}
                  </div>
                </div>
                {/* Enter hint */}
                <div className="absolute left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ top: "58%", filter: "drop-shadow(0 2px 4px rgba(0,0,0,.6))" }}>
                  <span className="font-bold text-white flex items-center gap-1 px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{ background: "rgba(0,0,0,.55)", fontSize: "clamp(8px,0.95vw,12px)" }}>
                    <Icon iconKey={locked ? "ui_lock" : "ui_enter"} size={11} /> {locked ? "Level 2" : "Enter"}
                  </span>
                </div>
              </div>
            </button>
          );
        })}

        {/* Regular Buildings Layer — only render built buildings as full
            illustrations; empty plots are shown as dashed markers by
            TownGround so the town reads as "planned but not yet built"
            rather than a row of grey silhouettes. */}
        {buildingLots.map((b) => {
          const isBuilt = built[b.id] > 0;
          return (
            <div
              key={b.id}
              className="absolute pointer-events-auto transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              style={{ left: b.x, top: b.y, width: b.w, height: b.h, zIndex: Math.floor(b.baseY) }}
              onClick={() => isBuilt ? null : setPurchaseBuilding(b.id)}
              aria-label={isBuilt ? BUILDINGS.find(x => x.id === b.id)?.name : `Empty plot — build ${BUILDINGS.find(x => x.id === b.id)?.name ?? ''}`}
            >
              {isBuilt && (
                <div className="relative w-full h-full pointer-events-none">
                  <BuildingIllustration id={b.id} isBuilt={true} />
                  {SMOKE_BUILDINGS.has(b.id) && <BuildingSmoke />}
                  {b.id === 'hearth' && <HearthGlow />}
                </div>
              )}
            </div>
          );
        })}
      </div>


      <TownVillagers key={zoneId} plan={townPlan} buildings={villagerBuildings} />

      {/* UI Overlays */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="bg-black/40 backdrop-blur-md rounded-2xl px-4 py-2 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Icon iconKey="ui_map" size={24} />
            </div>
            <div className="flex flex-col">
              <span className="text-white/60 text-[10px] font-bold uppercase tracking-wider">{biomeCfg.name}</span>
              <span className="text-white font-bold text-lg leading-none">{displayZoneName(state, zoneId)}</span>
            </div>
          </div>
          
          {maxPopulation > 0 && (
            <div className="flex gap-2">
              <div className="bg-black/40 backdrop-blur-md rounded-xl px-3 py-1.5 border border-white/10 flex items-center gap-2">
                <Icon iconKey="ui_population" size={16} />
                <span className="text-white font-bold">{population}/{maxPopulation}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 pointer-events-auto items-end">
          <button
            onClick={() => dispatch({ type: "UI/CLOSE_TOWN" })}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            aria-label="Close town view"
          >
            <Icon iconKey="ui_close" size={20} />
          </button>
        </div>
      </div>

      <FoundSettlementBanner state={state} dispatch={dispatch} />

      {/* Bottom Dock */}
      <div className="mt-auto pointer-events-none p-4 pb-6">
        <div className="max-w-2xl mx-auto w-full bg-black/40 backdrop-blur-xl rounded-[24px] border border-white/10 p-2 pointer-events-auto shadow-2xl">
          <div className="flex gap-1 mb-2">
            <button
              onClick={() => setActiveTab("built")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'built' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/60'}`}
            >
              Settlement
            </button>
            <button
              onClick={() => setActiveTab("build")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'build' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/60'}`}
            >
              Build
            </button>
            {state.activeEvents?.length > 0 && (
              <button
                onClick={() => setActiveTab("events")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'events' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/60'}`}
              >
                Events
              </button>
            )}
          </div>

          <div className="max-h-[160px] overflow-y-auto px-1 custom-scrollbar">
            {activeTab === 'built' && (
              <div className="grid grid-cols-4 gap-2">
                {buildings.filter(b => b.isBuilt).map(b => (
                  <div key={b.id} className="bg-white/5 rounded-xl p-2 border border-white/5 flex flex-col items-center gap-1 group">
                    <div className="w-10 h-10">
                      <BuildingIllustration id={b.id} isBuilt={true} />
                    </div>
                    <span className="text-[10px] text-white/80 font-medium truncate w-full text-center">{b.name}</span>
                  </div>
                ))}
              </div>
            )}
            
            {activeTab === 'build' && (
              <div className="flex flex-col gap-2">
                {availableToBuild.length === 0 ? (
                  <div className="text-white/40 text-[11px] text-center py-4 italic">No new buildings available at your current level.</div>
                ) : (
                  availableToBuild.map(b => (
                    <div key={b.id} className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-black/20 rounded-lg flex items-center justify-center p-1">
                          <BuildingIllustration id={b.id} isBuilt={true} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white font-bold text-sm">{b.name}</span>
                          <span className="text-white/40 text-[10px]">{b.description}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setPurchaseBuilding(b.id)}
                        disabled={state.coins < (b.cost || 0)}
                        className="bg-[#c8923a] hover:bg-[#a06a1a] disabled:opacity-30 disabled:grayscale transition-all text-white font-bold text-xs px-4 py-2 rounded-lg shadow-lg active:scale-95"
                      >
                        {b.cost || 0}◉
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {entryBiome && (
        <BiomeEntryModal
          biomeKey={entryBiome}
          state={state}
          dispatch={dispatch}
          onClose={() => setEntryBiome(null)}
        />
      )}

      {purchaseBuilding && (
        <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm grid place-items-center p-4 animate-fadein" onClick={() => setPurchaseBuilding(null)}>
          <div className="bg-[#f4ecd8] border-[4px] border-[#b28b62] rounded-[32px] p-8 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-6">
              <div className="w-32 h-32 bg-white/40 rounded-3xl p-4 shadow-inner">
                <BuildingIllustration id={purchaseBuilding} isBuilt={true} />
              </div>
              <div className="text-center">
                <h3 className="text-[#5a3a2a] text-2xl font-black mb-2">{BUILDINGS.find(b => b.id === purchaseBuilding)?.name}</h3>
                <p className="text-[#8a6a45] text-sm leading-relaxed">{BUILDINGS.find(b => b.id === purchaseBuilding)?.description}</p>
              </div>
              <div className="w-full flex gap-3">
                <button
                  onClick={() => setPurchaseBuilding(null)}
                  className="flex-1 h-12 rounded-2xl font-bold text-[#8a6a45] border-2 border-[#8a6a45]/20 hover:bg-[#8a6a45]/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    dispatch({ type: "TOWN/BUILD", payload: { buildingId: purchaseBuilding, zoneId } });
                    setPurchaseBuilding(null);
                  }}
                  disabled={state.coins < (BUILDINGS.find(b => b.id === purchaseBuilding)?.cost || 0)}
                  className="flex-1 h-12 rounded-2xl bg-[#5a7a20] text-white font-black shadow-lg shadow-[#5a7a20]/20 disabled:opacity-50 disabled:grayscale transition-all active:scale-95"
                >
                  Build for {BUILDINGS.find(b => b.id === purchaseBuilding)?.cost || 0}◉
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
