import { useState, useRef, useMemo, useEffect } from "react";
import { BUILDINGS } from "../constants.js";
import { useTooltip, Tooltip } from "./Tooltip.jsx";
import { ZONES, displayZoneName, isSettlementFounded, settlementFoundingCost, settlementTypeForZone, completedSettlementCount, DEFAULT_ZONE } from "../features/zones/data.js";
import BiomePicker from "../features/zones/BiomePicker.jsx";
import StartFarmingModal from "../features/zones/StartFarmingModal.jsx";
import BiomeEntryModal from "../features/zones/BiomeEntryModal.jsx";
import { buildTownPlan } from "../townLayout.js";
import TownGround from "./TownGround.jsx";
import TownVillagers from "./TownVillagers.jsx";
import Icon from "./Icon.jsx";
import BuildingIllustration from "./buildings/index.jsx";
import { TOWN_THEMES, SMOKE_BUILDINGS, TOWN_BIOME_CONFIGS, LOCATION_TOWN_CONFIGS } from "./town/config.js";
import { FarmFieldArt, MineEntranceArt } from "./town/decor.jsx";
import { FarmTerrainDecor, MineTerrainDecor } from "./town/terrain.jsx";

export { BuildingIllustration };

const EMPTY_OBJECT = Object.freeze({});
const RESERVED_BUILDING_KEYS = new Set(["decorations", "_plots"]);
const BUILDING_IDS = new Set(BUILDINGS.map((b) => b.id));
const ALL_BUILDING_IDS = BUILDINGS.map((b) => b.id);
const CRAFTING_STATIONS = new Set(["bakery", "forge", "larder"]);
const THEME_CROSSFADE_MS = 600;

// Puzzle-board fixtures placed on lots in the town (see townLayout.js
// `boards`): label / nav icon / lot border / the art that fills the tile.
// `kind` matches the `setEntryBiome` argument.
const BOARD_META = {
  farm: { label: "Farm Field", icon: "grass_hay", border: "#2a5010", art: () => <FarmFieldArt /> },
  mine: { label: "Mine",       icon: "ui_build",  border: "#1a1e22", art: (locked) => <MineEntranceArt locked={locked} /> },
  fish: { label: "Harbor",     icon: "ui_enter",  border: "#1a3a5a", art: () => <div className="w-full h-full" style={{ background: "linear-gradient(180deg, #4a8aaa 0%, #2a5a7a 55%, #1a3a5a 100%)" }} /> },
};

// 600ms crossfade between gradient backgrounds. CSS `transition` can't
// interpolate linear-gradient stops, so each theme is its own stacked layer;
// new layers mount with opacity 0 (animated to 1), prior layers unmount once
// covered.
function ThemeBackdrop({ bg }) {
  const [layers, setLayers] = useState(() => [{ bg, id: 0 }]);
  const prevBg = useRef(bg);
  const nextId = useRef(1);
  useEffect(() => {
    if (bg === prevBg.current) return;
    prevBg.current = bg;
    const newId = nextId.current++;
    setLayers((prev) => [...prev, { bg, id: newId }]);
    const t = setTimeout(() => {
      setLayers((prev) => prev.filter((l) => l.id === newId));
    }, THEME_CROSSFADE_MS);
    return () => clearTimeout(t);
  }, [bg]);
  return (
    <>
      {layers.map((l, i) => (
        <div
          key={l.id}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: l.bg,
            opacity: 1,
            animation: i > 0
              ? `townThemeFade ${THEME_CROSSFADE_MS}ms ease-in-out forwards`
              : undefined,
          }}
        />
      ))}
    </>
  );
}

// Phase 6a — Town-view "Found this settlement" CTA. Mirrors the map-side
// FoundSettlementControl: when the player is in the Town view of a settleable
// zone they haven't founded yet, show a top-center banner that opens the
// shared BiomePicker. Also surfaces the "complete one settlement first"
// progression gate (the reducer enforces it; this just explains why).
function FoundSettlementBanner({ state, dispatch }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const zoneId = state.mapCurrent;
  if (!zoneId || zoneId === DEFAULT_ZONE) return null;
  if (isSettlementFounded(state, zoneId)) return null;
  const type = settlementTypeForZone(zoneId);
  if (!type) return null;
  const cost = settlementFoundingCost(state).coins;
  const canAfford = (state?.coins ?? 0) >= cost;
  const needPriorComplete = completedSettlementCount(state) < 1;
  const node = ZONES[zoneId];
  const name = displayZoneName(state, zoneId);
  const blocked = needPriorComplete || !canAfford;
  const blockedReason = needPriorComplete
    ? "Complete your first settlement first"
    : !canAfford
      ? `Need ${cost}◉`
      : null;
  return (
    <>
      <div
        className="absolute top-12 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 pointer-events-none"
      >
        <div
          className="pointer-events-none rounded-full px-3 py-1 text-[11px] font-bold tracking-wide text-white"
          style={{ background: "rgba(15,14,20,.85)", border: "1px solid rgba(255,255,255,.18)" }}
        >
          {name} isn't yours yet
        </div>
        <button
          type="button"
          disabled={blocked}
          onClick={() => !blocked && setPickerOpen(true)}
          className="pointer-events-auto rounded-lg px-4 py-2 font-bold text-[13px] transition-colors disabled:cursor-not-allowed"
          style={{
            background: blocked ? "#7a6a4a" : "linear-gradient(to bottom, #c8923a, #a06a1a)",
            color: "white",
            border: blocked ? "2px solid #5a4a30" : "2px solid #7a4f10",
            opacity: blocked ? 0.85 : 1,
            boxShadow: blocked ? "none" : "0 3px 10px rgba(0,0,0,.45)",
          }}
          title={blocked ? blockedReason : `Found ${name}`}
        >
          🏗 Found this settlement · {cost}◉
        </button>
        {blocked && (
          <div
            className="pointer-events-none rounded px-2 py-0.5 text-[10px] font-semibold text-white"
            style={{ background: "rgba(120,30,30,.85)", border: "1px solid rgba(255,255,255,.2)" }}
          >
            {blockedReason}
          </div>
        )}
      </div>
      {pickerOpen && (
        <BiomePicker
          node={{ id: node?.id ?? zoneId, name }}
          type={type}
          cost={cost}
          dispatch={dispatch}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}

function Cloud({ top, w, h, color, anim, breatheDur }) {
  const s = { borderRadius: '50%', background: color, position: 'absolute' };
  const animation = breatheDur ? `${anim}, cloudBreathe ${breatheDur}s ease-in-out infinite` : anim;
  const bott = h * 0.2;
  return (
    <div style={{ position: 'absolute', top, width: w, height: h, animation }}>
      <div style={{ ...s, width: '100%', height: '100%' }} />
      <div style={{ ...s, width: w * 0.42, height: h * 1.6, bottom: bott, left: w * 0.05 }} />
      <div style={{ ...s, width: w * 0.50, height: h * 1.9, bottom: bott, left: w * 0.28 }} />
      <div style={{ ...s, width: w * 0.38, height: h * 1.5, bottom: bott, right: w * 0.05 }} />
    </div>
  );
}

export function TownView({ state, dispatch }) {
  const [entryBiome, setEntryBiome] = useState(null);
  const [purchaseBuilding, setPurchaseBuilding] = useState(null);
  // Build flow: when set, the player has chosen a building and is now picking
  // an empty plot to place it on. Cleared when they confirm or cancel.
  const [pendingBuilding, setPendingBuilding] = useState(null);
  const [buildPickerOpen, setBuildPickerOpen] = useState(false);
  const { tip: buildingTip, show: showBuildingTip, hide: hideBuildingTip, lastTouchTime } = useTooltip();
  const longPressTimer = useRef(null);
  const longPressActive = useRef(false);
  const locConfig = LOCATION_TOWN_CONFIGS[state.mapCurrent];
  const biomeVariant = locConfig?.biomeVariant ?? (state.biomeKey === 'mine' ? 'mine' : 'farm');
  const themeKey = locConfig?.themeKey ?? biomeVariant;
  const theme = TOWN_THEMES[themeKey] || TOWN_THEMES.farm;
  const townConfig = TOWN_BIOME_CONFIGS[biomeVariant];
  const locationName = displayZoneName(state, state.mapCurrent) || townConfig.name;
  const hill1Path = locConfig?.hill1Path ?? townConfig.hill1Path;
  const hill2Path = locConfig?.hill2Path ?? townConfig.hill2Path;
  const cc = (a) => biomeVariant === 'mine'
    ? `rgba(180,190,200,${(a * 0.55).toFixed(2)})`
    : `rgba(255,255,255,${a})`;
  // Zone config for this location controls which puzzle boards and buildings are available.
  const zoneConfig = ZONES[state.mapCurrent];
  const locationBuilt = state.built?.[state.mapCurrent] ?? EMPTY_OBJECT;
  // Town UX redesign — a procedural town *plan* (plaza + streets + a planned
  // grid of building lots) replaces the old hand-scattered plot positions. The
  // building-render below still consumes a flat `layoutPlots` of {x,y,w,h}, so
  // we just project the plan's lots into that shape.
  const requestedPlots = Math.max(1, zoneConfig?.plotCount ?? 12);
  const townPlan = useMemo(() => {
    const z = ZONES[state.mapCurrent];
    const boardKinds = [z?.hasFarm && "farm", z?.hasMine && "mine", z?.hasWater && "fish"].filter(Boolean);
    return buildTownPlan({ zoneId: state.mapCurrent, plotCount: requestedPlots, boardKinds });
  }, [state.mapCurrent, requestedPlots]);
  const layoutPlots = useMemo(
    () => townPlan.lots.map((l) => ({ x: l.cx - l.w / 2, y: l.cy - l.h / 2, w: l.w, h: l.h })),
    [townPlan],
  );
  const plotCount = layoutPlots.length;
  const storedPlots = locationBuilt._plots ?? EMPTY_OBJECT;
  // Build a normalised plot map { idx -> buildingId | null }, auto-assigning
  // any legacy buildings that lack an entry (e.g. saves predating the plot
  // system, or tests that set { hearth: true } without _plots).
  const { plotById, slotRows, occupiedPlots, builtLotIndices } = useMemo(() => {
    const builtIds = Object.keys(locationBuilt).filter(
      (k) => !RESERVED_BUILDING_KEYS.has(k) && locationBuilt[k] && BUILDING_IDS.has(k),
    );
    const nextPlotById = {};
    Object.entries(storedPlots).forEach(([idx, id]) => { nextPlotById[id] = Number(idx); });
    const nextPlotMap = {};
    for (let i = 0; i < plotCount; i++) nextPlotMap[i] = storedPlots[i] ?? null;
    // Auto-assign any built building that doesn't yet have a plot to the first
    // free index. Render-only — never written back to state.
    for (const id of builtIds) {
      if (nextPlotById[id] !== undefined) continue;
      for (let i = 0; i < plotCount; i++) {
        if (nextPlotMap[i] == null) { nextPlotMap[i] = id; nextPlotById[id] = i; break; }
      }
    }

    const rows = [];
    for (let i = 0; i < plotCount; i++) {
      const pos = layoutPlots[i];
      if (!pos) continue;
      rows.push({ idx: i, ...pos, buildingId: nextPlotMap[i] });
    }
    rows.sort((a, b) => (a.y + a.h) - (b.y + b.h));

    const occupied = Object.entries(nextPlotMap).filter(([, id]) => id != null).length;
    const lots = new Set(
      Object.entries(nextPlotMap).filter(([, id]) => id != null).map(([i]) => Number(i)),
    );

    return {
      plotById: nextPlotById,
      slotRows: rows,
      occupiedPlots: occupied,
      builtLotIndices: lots,
    };
  }, [layoutPlots, locationBuilt, plotCount, storedPlots]);

  // Filter buildings to those available at this location, then by biome.
  const allowedBuildings = zoneConfig?.buildings ?? ALL_BUILDING_IDS;
  const eligibleBuildings = useMemo(
    () => BUILDINGS.filter((b) => allowedBuildings.includes(b.id) && (!b.biome || b.biome === biomeVariant)),
    [allowedBuildings, biomeVariant],
  );
  const freePlots = plotCount - occupiedPlots;

  const builtTipHandlers = (b) => {
    const data = { label: b.name, desc: b.desc, color: b.color };
    return {
      onMouseEnter: (e) => { if (Date.now() - lastTouchTime.current > 600) showBuildingTip(data, e.currentTarget); },
      onMouseLeave: () => { if (Date.now() - lastTouchTime.current > 600) hideBuildingTip(); },
      onTouchStart: (e) => {
        lastTouchTime.current = Date.now();
        longPressActive.current = false;
        longPressTimer.current = setTimeout(() => {
          longPressActive.current = true;
          showBuildingTip(data, e.currentTarget);
        }, 500);
      },
      onTouchEnd: (e) => {
        clearTimeout(longPressTimer.current);
        if (longPressActive.current) {
          e.preventDefault();
          hideBuildingTip(2000);
        }
      },
      onTouchCancel: () => {
        clearTimeout(longPressTimer.current);
        if (longPressActive.current) hideBuildingTip(2000);
        longPressActive.current = false;
      },
    };
  };
  return (
    <div className="absolute inset-0 overflow-hidden">
      <ThemeBackdrop bg={theme.bg} />
      {/* Sun/light source */}
      <div className="absolute top-12 right-20 w-16 h-16 rounded-full" style={{ background: theme.sunColor, boxShadow: `0 0 60px ${theme.sunGlow}` }} />
      {/* Clouds */}
      <Cloud top={48}  w={64}  h={18} color={cc(0.38)} anim="townCloudC 180s linear -60s infinite"  breatheDur={12} />
      <Cloud top={64}  w={96}  h={26} color={cc(0.62)} anim="townCloudA 95s linear 0s infinite"     breatheDur={9}  />
      <Cloud top={96}  w={112} h={30} color={cc(0.55)} anim="townCloudB 130s linear -22s infinite"  breatheDur={14} />
      <Cloud top={40}  w={80}  h={22} color={cc(0.45)} anim="townCloudA 160s linear -40s infinite"  breatheDur={11} />
      <Cloud top={112} w={128} h={34} color={cc(0.40)} anim="townCloudB 210s linear -95s infinite"  breatheDur={16} />
      <Cloud top={76}  w={72}  h={20} color={cc(0.50)} anim="townCloudC 145s linear -115s infinite" breatheDur={10} />
      <Cloud top={52}  w={104} h={28} color={cc(0.42)} anim="townCloudA 240s linear -170s infinite" breatheDur={13} />

      {/* Biome-specific terrain */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1100 600" preserveAspectRatio="none">
        <path d={hill1Path} fill={theme.hill1} opacity="0.75" />
        <path d={hill2Path} fill={theme.hill2} opacity="0.6" />

        {biomeVariant === "farm" && <FarmTerrainDecor />}
        {biomeVariant === "mine" && <MineTerrainDecor />}

      </svg>

      {/* Town plan — paved plaza, street network, lot pads, street furniture.
          Sits over the hills/decor backdrop so the place reads as a planned
          settlement in a valley. Buildings (below) are positioned onto its lots. */}
      <TownGround plan={townPlan} theme={theme} biomeVariant={biomeVariant} builtLots={builtLotIndices} />

      {/* Header */}
      <div className="absolute top-3 left-4 landscape:max-[1024px]:top-2 landscape:max-[1024px]:left-3 font-bold text-[20px] landscape:max-[1024px]:text-[15px]" style={{ color: theme.textColor }}>{locationName}</div>
      <div className="absolute top-3 right-4 landscape:max-[1024px]:top-2 landscape:max-[1024px]:right-3 flex items-center gap-2 z-10">
        {/* Boons shortcut — only visible once the player has faced any keeper. */}
        {Object.keys(state.story?.flags ?? {}).some((k) => k.startsWith("keeper_") && (k.endsWith("_coexist") || k.endsWith("_driveout")) && state.story.flags[k]) && (
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_VIEW", view: "boons" })}
            className="bg-white/85 px-3 py-1.5 landscape:max-[1024px]:px-2 landscape:max-[1024px]:py-1 rounded-full font-bold text-[#3a2715] landscape:max-[1024px]:text-[13px] hover:bg-white transition-colors"
            title="Spend Embers / Core Ingots on per-path boons"
          >
            ✨ Boons
          </button>
        )}
        <div className="bg-white/85 px-3 py-1.5 landscape:max-[1024px]:px-2 landscape:max-[1024px]:py-1 rounded-full font-bold text-[#3a2715] landscape:max-[1024px]:text-[13px]">◉ {state.coins.toLocaleString()}</div>
      </div>

      {/* "Found this settlement" CTA — only renders for visited-but-unfounded settleable zones. */}
      <FoundSettlementBanner state={state} dispatch={dispatch} />

      {/* Puzzle-board fixtures — the farm field, mine entrance and harbor now
          sit on lots in the town's wings (from townPlan.boards) rather than
          floating in the corners. Same 1100×600 placement convention as the
          building illustrations below. */}
      <div className="absolute inset-0 pointer-events-none">
        {(townPlan.boards || []).map((b) => {
          const meta = BOARD_META[b.kind];
          if (!meta) return null;
          const locked = b.kind === "mine" && state.level < 2;
          return (
            <button
              key={b.kind}
              type="button"
              aria-label={locked ? `${meta.label} (locked until level 2)` : `Enter ${meta.label}`}
              disabled={locked}
              className="absolute cursor-pointer group pointer-events-auto flex flex-col items-center bg-transparent border-0 p-0 focus-visible:outline-2 focus-visible:outline-[#ffd248] focus-visible:rounded disabled:cursor-not-allowed"
              style={{
                left: `${((b.cx - b.w / 2) / 1100) * 100}%`,
                bottom: `${((600 - (b.cy + b.h / 2)) / 600) * 100}%`,
                width: `${(b.w / 1100) * 100}%`,
                aspectRatio: "1",
                opacity: locked ? 0.7 : 1,
              }}
              onClick={() => setEntryBiome(b.kind)}
            >
              <div
                className="relative w-full overflow-hidden transition-transform duration-150 group-hover:scale-[1.03]"
                style={{ aspectRatio: "1", borderRadius: "10px", border: `2.5px solid ${meta.border}`, boxShadow: "0 3px 12px rgba(0,0,0,.4)" }}
              >
                {meta.art(locked)}
                <div className="absolute inset-x-0 top-0 flex justify-center items-center gap-1 font-bold text-white py-0.5" style={{ background: "rgba(0,0,0,.5)", fontSize: "clamp(7px,0.85vw,11px)", borderRadius: "8px 8px 0 0" }}>
                  <Icon iconKey={locked ? "ui_lock" : meta.icon} size={11} /> {meta.label}
                </div>
                <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,.4)" }}>
                  <span className="font-bold text-white flex items-center gap-1" style={{ fontSize: "clamp(8px,0.95vw,12px)" }}><Icon iconKey={locked ? "ui_lock" : "ui_enter"} size={11} /> {locked ? "Level 2" : "Enter"}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Plots + buildings positioned in the 1100x600 design space, scaled to viewport */}
      {/* isolation:isolate creates a stacking context so per-building zIndex (derived from y, up to ~700) doesn't escape and cover modals/tooltips. */}
      <div className="absolute inset-0 pointer-events-none" style={{ isolation: "isolate" }}>
        <svg viewBox="0 0 1100 600" preserveAspectRatio="none" className="w-full h-full" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
        <div className="absolute pointer-events-none" style={{ left: 0, right: 0, top: 0, bottom: 0 }}>
          {/* Townsfolk walking the streets (depth-sorted with buildings via z-index) */}
          <TownVillagers key={state.mapCurrent} plan={townPlan} buildings={plotById} />
          {slotRows.map((slot) => {
            const b = slot.buildingId ? BUILDINGS.find((x) => x.id === slot.buildingId) : null;
            const isBuilt = !!b;
            const isPlacing = !!pendingBuilding && !isBuilt;
            // Empty plots are invisible until the player enters placement mode.
            if (!isBuilt && !isPlacing) return null;
            const onClick = () => {
              if (longPressActive.current) { longPressActive.current = false; return; }
              // Placement mode: clicking an empty plot confirms placement.
              if (isPlacing) {
                setPurchaseBuilding({ ...pendingBuilding, _plot: slot.idx });
                return;
              }
              if (!isBuilt) return;
              if (CRAFTING_STATIONS.has(b.id)) {
                dispatch({ type: "SET_VIEW", view: "crafting", craftingTab: b.id });
              }
            };

            return (
              <div
                key={slot.idx}
                className="absolute pointer-events-auto"
                style={{
                  left: `${(slot.x / 1100) * 100}%`,
                  bottom: `${((600 - slot.y - slot.h) / 600) * 100}%`,
                  width: `${(slot.w / 1100) * 100}%`,
                  aspectRatio: "1",
                  cursor: isBuilt && CRAFTING_STATIONS.has(b.id) ? "pointer" : isPlacing ? "pointer" : "default",
                  zIndex: Math.floor(slot.y + slot.h),
                }}
                onClick={onClick}
                {...(isBuilt ? builtTipHandlers(b) : {})}
              >
                {isBuilt ? (
                  <>
                    <BuildingIllustration id={b.id} isBuilt={true} />
                    {SMOKE_BUILDINGS.has(b.id) && <BuildingSmoke />}
                    {b.id === "hearth" && state.story?.flags?.hearth_lit && <HearthGlow />}
                    <div
                      className="absolute bottom-full left-0 right-0 text-center font-bold text-white truncate py-0.5 px-1"
                      style={{
                        background: "rgba(0,0,0,.55)",
                        fontSize: "clamp(7px,0.8vw,10px)",
                        textShadow: "0 1px 2px rgba(0,0,0,.8)",
                        marginBottom: 2,
                        borderRadius: "4px 4px 0 0",
                      }}
                    >
                      {b.name}
                    </div>
                  </>
                ) : (
                  <div
                    className={`absolute inset-0 rounded-sm grid place-items-center font-bold ${isPlacing ? "animate-pulse" : ""}`}
                    style={{
                      background: isPlacing ? "rgba(155,219,106,.18)" : "rgba(0,0,0,.22)",
                      border: `2px dashed ${isPlacing ? "#9bdb6a" : "rgba(255,255,255,.35)"}`,
                      color: isPlacing ? "#9bdb6a" : "rgba(255,255,255,.55)",
                      fontSize: "clamp(10px,1.1vw,14px)",
                    }}
                  >
                    {isPlacing ? "+ Place here" : "Empty plot"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Build button — opens the building picker. Hidden when zone has no plots. */}
      {plotCount > 0 && (
        <button
          type="button"
          onClick={() => {
            if (pendingBuilding) {
              setPendingBuilding(null);
            } else {
              setBuildPickerOpen(true);
            }
          }}
          className="absolute z-30 rounded-full font-bold shadow-lg border-[3px] border-white"
          style={{
            right: "1.5rem",
            bottom: "10%",
            padding: "0.65rem 1.1rem",
            background: pendingBuilding ? "#c8523a" : "#9bdb6a",
            color: pendingBuilding ? "#fff" : "#1a2a10",
            fontSize: "clamp(11px,1.2vw,14px)",
          }}
          aria-label={pendingBuilding ? "Cancel placement" : "Build"}
        >
          {pendingBuilding
            ? <><Icon iconKey="ui_cancel" size={12} className="inline align-text-top mr-1" />Cancel placement</>
            : <><Icon iconKey="ui_build" size={12} className="inline align-text-top mr-1" />Build  ·  {freePlots}/{plotCount} plots</>}
        </button>
      )}

      {/* Placement-mode hint banner */}
      {pendingBuilding && (
        <div
          className="absolute z-30 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full font-bold text-white pointer-events-none"
          style={{ top: "9%", background: "rgba(15,14,20,.85)", border: "1px solid rgba(155,219,106,.5)", fontSize: "clamp(11px,1.2vw,14px)" }}
        >
          <Icon iconKey="ui_pin" size={12} className="inline align-text-top mr-1" /> Choose an empty plot for <span style={{ color: "#9bdb6a" }}>{pendingBuilding.name}</span>
        </div>
      )}

      {/* Building picker modal — choose a building, then a plot */}
      {buildPickerOpen && (
        <BuildPicker
          buildings={eligibleBuildings}
          state={state}
          locationBuilt={locationBuilt}
          freePlots={freePlots}
          plotCount={plotCount}
          onPick={(b) => {
            setBuildPickerOpen(false);
            setPendingBuilding(b);
          }}
          onClose={() => setBuildPickerOpen(false)}
        />
      )}

      {entryBiome === "farm" && (
        <StartFarmingModal
          state={state}
          dispatch={dispatch}
          onClose={() => setEntryBiome(null)}
        />
      )}

      {entryBiome && entryBiome !== "farm" && (
        <BiomeEntryModal
          biomeKey={entryBiome}
          state={state}
          dispatch={dispatch}
          onClose={() => setEntryBiome(null)}
        />
      )}

      {buildingTip && (
        <Tooltip
          anchorX={buildingTip.x}
          anchorY={buildingTip.y}
          className="z-[9999] pointer-events-none px-3 py-2 rounded-lg border border-white/20"
          style={{
            background: "rgba(10,10,14,.92)",
            maxWidth: 240,
            minWidth: 150,
          }}
          arrowClassName="border-4 border-transparent border-t-[rgba(10,10,14,0.92)]"
        >
          <div className="font-bold" style={{ color: buildingTip.data.color, fontSize: "clamp(9px,1.1vw,13px)", whiteSpace: "nowrap" }}>{buildingTip.data.label}</div>
          {buildingTip.data.desc && <div className="mt-0.5 leading-snug text-white/75" style={{ fontSize: "clamp(8px,0.9vw,11px)", whiteSpace: "normal" }}>{buildingTip.data.desc}</div>}
        </Tooltip>
      )}

      {purchaseBuilding && (
        <div
          className="absolute inset-0 z-[10000] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,.6)" }}
          onClick={() => setPurchaseBuilding(null)}
        >
          <div
            className="rounded-xl border border-white/20 p-5 flex flex-col gap-3"
            style={{ background: "rgba(15,14,20,.96)", minWidth: 260, maxWidth: 340, boxShadow: "0 8px 40px rgba(0,0,0,.7)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-white font-bold" style={{ fontSize: "clamp(13px,1.5vw,18px)" }}>{purchaseBuilding.name}</div>
            {purchaseBuilding.desc && (
              <div className="text-white/70 leading-snug" style={{ fontSize: "clamp(10px,1.1vw,13px)" }}>{purchaseBuilding.desc}</div>
            )}
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.entries(purchaseBuilding.cost).map(([k, v]) => (
                <span
                  key={k}
                  className="rounded px-2 py-0.5 font-semibold"
                  style={{ background: "rgba(255,255,255,.08)", color: "#9bdb6a", fontSize: "clamp(10px,1.1vw,13px)" }}
                >
                  {k === "coins" ? `${v} ◉` : `${v} ${k}`}
                </span>
              ))}
            </div>
            <div className="flex gap-2 mt-1">
              <button
                className="flex-1 rounded-lg py-2 font-bold"
                style={{ background: "#9bdb6a", color: "#1a2a10", fontSize: "clamp(11px,1.2vw,14px)" }}
                onClick={() => {
                  dispatch({ type: "BUILD", building: purchaseBuilding, plot: purchaseBuilding._plot });
                  setPurchaseBuilding(null);
                  setPendingBuilding(null);
                }}
              >
                Buy
              </button>
              <button
                className="flex-1 rounded-lg py-2 font-bold"
                style={{ background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.7)", fontSize: "clamp(11px,1.2vw,14px)" }}
                onClick={() => setPurchaseBuilding(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BuildPicker({ buildings, state, locationBuilt, freePlots, plotCount, onPick, onClose }) {
  const rows = buildings.map((b) => {
    const isBuilt = !!locationBuilt[b.id];
    const prereqMet = !b.requires || !!locationBuilt[b.requires];
    const levelMet = state.level >= b.lv;
    const canCoin = state.coins >= (b.cost.coins || 0);
    const canRunes = (state.runes ?? 0) >= (b.cost.runes ?? 0);
    const canRes = Object.entries(b.cost).every(
      ([k, v]) => k === "coins" || k === "runes" || (state.inventory[k] || 0) >= v,
    );
    const canAfford = canCoin && canRes && canRunes;
    const reason = isBuilt
      ? "Already built"
      : !levelMet
        ? `Requires level ${b.lv}`
        : !prereqMet
          ? `Requires ${b.requires}`
          : freePlots <= 0
            ? "No free plots"
            : !canAfford
              ? "Not enough resources"
              : null;
    const pickable = !reason;
    return { b, isBuilt, levelMet, prereqMet, canAfford, reason, pickable };
  });

  return (
    <div
      className="absolute inset-0 z-[10000] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,.6)" }}
      onClick={onClose}
    >
      <div
        className="rounded-xl border border-white/20 p-4 flex flex-col gap-2"
        style={{ background: "rgba(15,14,20,.97)", width: "min(440px, 92vw)", maxHeight: "80vh", boxShadow: "0 8px 40px rgba(0,0,0,.7)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-white font-bold" style={{ fontSize: "clamp(13px,1.5vw,18px)" }}>Choose a building</div>
          <div className="text-white/55 font-semibold" style={{ fontSize: "clamp(10px,1.1vw,12px)" }}>
            {freePlots}/{plotCount} plots free
          </div>
        </div>
        <div className="overflow-y-auto pr-1 flex flex-col gap-2" style={{ maxHeight: "62vh" }}>
          {rows.map(({ b, isBuilt, reason, pickable }) => {
            const costStr = Object.entries(b.cost)
              .map(([k, v]) => k === "coins" ? `${v}◉` : k === "runes" ? `${v} runes` : `${v} ${k}`)
              .join(" · ");
            return (
              <button
                key={b.id}
                type="button"
                disabled={!pickable}
                onClick={() => pickable && onPick(b)}
                className="text-left rounded-lg border px-3 py-2 transition-colors flex items-stretch gap-3"
                style={{
                  borderColor: pickable ? "rgba(155,219,106,.55)" : "rgba(255,255,255,.1)",
                  background: pickable ? "rgba(155,219,106,.08)" : "rgba(255,255,255,.04)",
                  cursor: pickable ? "pointer" : "not-allowed",
                  opacity: pickable ? 1 : 0.55,
                }}
              >
                <div
                  className="relative flex-shrink-0 rounded overflow-hidden"
                  style={{
                    width: 56,
                    height: 56,
                    background: "rgba(255,255,255,.05)",
                    border: "1px solid rgba(255,255,255,.1)",
                  }}
                >
                  <BuildingIllustration id={b.id} isBuilt={true} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold truncate" style={{ color: pickable ? "#9bdb6a" : "#ddd", fontSize: "clamp(11px,1.2vw,14px)" }}>
                      {b.name}
                      {isBuilt && <span className="ml-2 text-white/50" style={{ fontSize: "10px" }}>· built</span>}
                    </div>
                    <div className="font-semibold text-white/65 flex-shrink-0" style={{ fontSize: "clamp(9px,1vw,11px)" }}>
                      Lv {b.lv}
                    </div>
                  </div>
                  {b.desc && (
                    <div className="text-white/65 leading-snug mt-0.5" style={{ fontSize: "clamp(9px,1vw,11px)" }}>
                      {b.desc}
                    </div>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-semibold" style={{ color: "#f7d572", fontSize: "clamp(9px,1vw,11px)" }}>{costStr}</span>
                    {reason && (
                      <span className="font-semibold" style={{ color: "#e08070", fontSize: "clamp(9px,1vw,11px)" }}>· {reason}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="self-end rounded-lg py-1.5 px-3 font-bold mt-1"
          style={{ background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.7)", fontSize: "clamp(11px,1.2vw,14px)" }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function BuildingSmoke() {
  return (
    <div className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none" style={{ width: 18, height: 36 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{
            bottom: 0,
            width: 8 + i * 2,
            height: 8 + i * 2,
            background: "rgba(240,235,220,.6)",
            animation: "townSmoke 3.4s ease-out infinite",
            animationDelay: `${i * 1.1}s`,
          }}
        />
      ))}
    </div>
  );
}
function HearthGlow() {
  return (
    <div className="absolute inset-0 pointer-events-none grid place-items-center">
      <div
        className="rounded-full blur-xl"
        style={{
          width: "120%",
          height: "120%",
          background: "radial-gradient(circle, rgba(255,160,0,0.22) 0%, rgba(255,100,0,0.08) 50%, transparent 100%)",
          animation: "hearthPulse 4s ease-in-out infinite",
        }}
      />
    </div>
  );
}
