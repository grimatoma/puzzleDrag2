import { useState, useRef, useMemo, useEffect } from "react";
import type { ReactNode } from "react";
import { BUILDINGS, getItem } from "../constants.js";
import { useTooltip, Tooltip } from "./Tooltip.jsx";
import { ZONES, zoneHasBoard, displayZoneName, isSettlementFounded, settlementFoundingCost, settlementTypeForZone, completedSettlementCount, DEFAULT_ZONE } from "../features/zones/data.js";
import ZoneEntryCostInfo from "../features/zones/ZoneEntryCostInfo.jsx";
import BiomePicker from "../features/zones/BiomePicker.jsx";
import StartFarmingModal from "../features/zones/StartFarmingModal.jsx";
import BiomeEntryModal from "../features/zones/BiomeEntryModal.jsx";
import { canEnterBiome } from "../state/biomeAccess.js";
import { buildTownPlan, STAGE_W, STAGE_H } from "../townLayout.js";
import TownPhaserCanvas from "./TownPhaserCanvas.jsx";
import Icon from "./Icon.jsx";
import BuildingIllustration from "./buildings/index.jsx";
import { TOWN_THEMES, SMOKE_BUILDINGS, TOWN_BIOME_CONFIGS, LOCATION_TOWN_CONFIGS, type TownBiomeConfig } from "./town/config.js";
import { FarmFieldArt, MineEntranceArt } from "./town/decor.jsx";
import {
  BrowserDetailLayout,
  BrowserGrid,
  BrowserItemButton,
  CostGrid,
  DetailActionButton,
  DetailPane,
} from "./primitives/BrowserDetail.jsx";
import FeaturePanel from "./primitives/FeaturePanel.jsx";
import type { GameState, Dispatch } from "../types/state.js";
import type { Building } from "../types/items.js";
import { inventoryQty } from "../types/inventory.js";
import { zoneInventory } from "../state/zoneInventory.js";

interface LocationBuiltState {
  _plots?: Record<string, string | null>;
  decorations?: unknown;
  [buildingId: string]: unknown;
}

interface BoardMetaEntry {
  label: string;
  icon: string;
  border: string;
  art: (locked?: boolean) => ReactNode;
}

interface BuildingTipData {
  label: string;
  desc?: string;
  color: string;
}

interface PendingBuilding extends Building {
  _plot?: number;
}

export { BuildingIllustration };

const EMPTY_OBJECT = Object.freeze({});
const RESERVED_BUILDING_KEYS = new Set(["decorations", "_plots"]);
const BUILDING_IDS = new Set(BUILDINGS.map((b) => b.id));
const ALL_BUILDING_IDS = BUILDINGS.map((b) => b.id);
const BUILDINGS_BY_ID = new Map(BUILDINGS.map((b) => [b.id, b]));
const CRAFTING_STATIONS = new Set(["bakery", "forge", "larder"]);
// Built buildings have intrinsic SVG padding, so scale the box up slightly to
// fill its (now block-sized) lot. Bottom-center anchored, so we widen and
// re-center; only applies to BUILT buildings (not board buttons or the
// placement overlay). Lots are large, so this stays modest to avoid spilling
// the building into the surrounding streets.
const BUILD_FILL = 1.06;

// Puzzle-board fixtures placed on lots in the town (see townLayout.js
// `boards`): label / nav icon / lot border / the art that fills the tile.
// `kind` matches the `setEntryBiome` argument.
const BOARD_META: Record<string, BoardMetaEntry> = {
  farm: { label: "Farm Field", icon: "tile_grass_grass", border: "#2a5010", art: () => <FarmFieldArt /> },
  mine: { label: "Mine",       icon: "ui_build",  border: "#1a1e22", art: (locked) => <MineEntranceArt locked={!!locked} /> },
  fish: { label: "Harbor",     icon: "ui_enter",  border: "#1a3a5a", art: () => <div className="w-full h-full" style={{ background: "linear-gradient(180deg, #4a8aaa 0%, #2a5a7a 55%, #1a3a5a 100%)" }} /> },
};

// Phase 6a — Town-view "Found this settlement" CTA. Mirrors the map-side
// FoundSettlementControl: when the player is in the Town view of a settleable
// zone they haven't founded yet, show a top-center banner that opens the
// shared BiomePicker. Also surfaces the "complete one settlement first"
// progression gate (the reducer enforces it; this just explains why).
function FoundSettlementBanner({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const zoneId = String(state.mapCurrent ?? "");
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
  const blockedReason: string | undefined = needPriorComplete
    ? "Complete your first settlement first"
    : !canAfford
      ? `Need ${cost}◉`
      : undefined;
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



export function TownBuildingTooltipContent({ data }: { data: BuildingTipData }) {
  return (
    <>
      <div className="font-bold text-cream text-body leading-snug whitespace-nowrap">
        {data.label}
      </div>
      {data.desc && (
        <div className="mt-0.5 block text-cream/80 text-caption leading-snug whitespace-normal">
          {data.desc}
        </div>
      )}
    </>
  );
}

export function TownView({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const [entryBiome, setEntryBiome] = useState<string | null>(null);
  const [purchaseBuilding, setPurchaseBuilding] = useState<PendingBuilding | null>(null);
  // Build flow: when set, the player has chosen a building and is now picking
  // an empty plot to place it on. Cleared when they confirm or cancel.
  const [pendingBuilding, setPendingBuilding] = useState<PendingBuilding | null>(null);
  const [buildPickerOpen, setBuildPickerOpen] = useState(false);
  const { tip: buildingTip, show: showBuildingTip, hide: hideBuildingTip, lastTouchTime } = useTooltip<BuildingTipData>();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActive = useRef(false);
  const mapCurrent = String(state.mapCurrent ?? DEFAULT_ZONE);
  const locConfig = LOCATION_TOWN_CONFIGS[mapCurrent];
  const biomeVariant = locConfig?.biomeVariant ?? (state.biomeKey === 'mine' ? 'mine' : 'farm');
  const themeKey = locConfig?.themeKey ?? biomeVariant;
  const theme = TOWN_THEMES[themeKey] || TOWN_THEMES.farm;
  const townConfig: TownBiomeConfig = TOWN_BIOME_CONFIGS[biomeVariant] ?? TOWN_BIOME_CONFIGS.farm;
  const locationName = displayZoneName(state, mapCurrent) || townConfig.name;
  // Extended grass colour for the widescreen margins around the 4:3 map, so the
  // letterboxed area reads as terrain rather than a black box. Mine-family towns
  // get a cooler, greyer ground; farm-family a warmer green.
  const marginGrass = biomeVariant === "mine" ? "#565a48" : "#5a7f36";
  // Zone config for this location controls which puzzle boards and buildings are available.
  const zoneConfig = ZONES[mapCurrent];
  const locationBuilt = (state.built?.[mapCurrent] ?? EMPTY_OBJECT) as LocationBuiltState;
  // Town UX redesign — a procedural town *plan* (plaza + streets + a planned
  // grid of building lots) replaces the old hand-scattered plot positions. The
  // building-render below still consumes a flat `layoutPlots` of {x,y,w,h}, so
  // we just project the plan's lots into that shape.
  const requestedPlots = Math.max(1, zoneConfig?.plotCount ?? 12);
  const townPlan = useMemo(() => {
    const z = ZONES[mapCurrent];
    const boardKinds = [z && zoneHasBoard(z, "farm") && "farm", z && zoneHasBoard(z, "mine") && "mine", z && zoneHasBoard(z, "fish") && "fish"].filter(Boolean) as string[];
    return buildTownPlan({ zoneId: mapCurrent, plotCount: requestedPlots, boardKinds: boardKinds as never[] });
  }, [mapCurrent, requestedPlots]);
  const layoutPlots = useMemo(
    () => townPlan.lots.map((l: { cx: number; cy: number; w: number; h: number }) => ({ x: l.cx - l.w / 2, y: l.cy - l.h / 2, w: l.w, h: l.h })),
    [townPlan],
  );
  const plotCount = layoutPlots.length;
  const storedPlots: Record<string, string | null> = locationBuilt._plots ?? EMPTY_OBJECT;
  // Build a normalised plot map { idx -> buildingId | null }, auto-assigning
  // any legacy buildings that lack an entry (e.g. saves predating the plot
  // system, or tests that set { hearth: true } without _plots).
  const { plotById, slotRows, occupiedPlots, builtLotIndices, buildingsMap } = useMemo(() => {
    const builtIds = Object.keys(locationBuilt).filter(
      (k) => !RESERVED_BUILDING_KEYS.has(k) && locationBuilt[k] && BUILDING_IDS.has(k),
    );
    const nextPlotById: Record<string, number> = {};
    Object.entries(storedPlots).forEach(([idx, id]) => { if (id != null) nextPlotById[String(id)] = Number(idx); });
    const nextPlotMap: Record<number, string | null> = {};
    for (let i = 0; i < plotCount; i++) nextPlotMap[i] = storedPlots[i] ?? null;
    // Auto-assign any built building that doesn't yet have a plot to the first
    // free index. Render-only — never written back to state.
    for (const id of builtIds) {
      if (nextPlotById[id] !== undefined) continue;
      for (let i = 0; i < plotCount; i++) {
        if (nextPlotMap[i] == null) { nextPlotMap[i] = id; nextPlotById[id] = i; break; }
      }
    }

    interface SlotRow {
      idx: number;
      x: number;
      y: number;
      w: number;
      h: number;
      buildingId: string | null;
    }
    const rows: SlotRow[] = [];
    for (let i = 0; i < plotCount; i++) {
      const pos = layoutPlots[i];
      if (!pos) continue;
      rows.push({ idx: i, ...pos, buildingId: nextPlotMap[i] });
    }
    rows.sort((a, b) => (a.y + a.h) - (b.y + b.h));

    const occupied = Object.entries(nextPlotMap).filter(([, id]) => id != null).length;
    const lots = new Set<number>(
      Object.entries(nextPlotMap).filter(([, id]) => id != null).map(([i]) => Number(i)),
    );

    const buildingsMap: Record<number, string> = {};
    for (const [idx, id] of Object.entries(nextPlotMap)) {
      if (id != null) {
        buildingsMap[Number(idx)] = id;
      }
    }

    return {
      plotById: nextPlotById,
      slotRows: rows,
      occupiedPlots: occupied,
      builtLotIndices: lots,
      buildingsMap,
    };
  }, [layoutPlots, locationBuilt, plotCount, storedPlots]);

  // Filter buildings to those available at this location, then by biome.
  const allowedBuildings = zoneConfig?.buildings ?? ALL_BUILDING_IDS;
  const eligibleBuildings = useMemo(
    () => BUILDINGS.filter((b) => allowedBuildings.includes(b.id as import("../types/catalog/buildings.js").BuildingId) && (!b.biome || b.biome === biomeVariant)),
    [allowedBuildings, biomeVariant],
  );
  const freePlots = plotCount - occupiedPlots;

  const builtTipHandlers = (b: Building) => {
    const data: BuildingTipData = { label: b.name, desc: b.desc, color: b.look.color };
    return {
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => { if (Date.now() - lastTouchTime.current > 600) showBuildingTip(data, e.currentTarget); },
      onMouseLeave: () => { if (Date.now() - lastTouchTime.current > 600) hideBuildingTip(); },
      onTouchStart: (e: React.TouchEvent<HTMLElement>) => {
        lastTouchTime.current = Date.now();
        longPressActive.current = false;
        const target = e.currentTarget;
        longPressTimer.current = setTimeout(() => {
          longPressActive.current = true;
          showBuildingTip(data, target);
        }, 500);
      },
      onTouchEnd: (e: React.TouchEvent<HTMLElement>) => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        if (longPressActive.current) {
          e.preventDefault();
          hideBuildingTip(2000);
        }
      },
      onTouchCancel: () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        if (longPressActive.current) hideBuildingTip(2000);
        longPressActive.current = false;
      },
    };
  };
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: marginGrass }}>
      {/* Pan/zoom world — the top-down map (terrain, roads, fields, plaza, board
          fixtures, buildings and trees) scales uniformly together inside a
          fixed-aspect stage box. The grass margins above and the UI overlays
          below stay fixed. */}
      <TownPhaserCanvas
        plan={townPlan}
        builtLots={builtLotIndices}
        buildingsMap={buildingsMap}
        pendingBuilding={pendingBuilding}
        onPlaceBuilding={(lotIdx) => {
          if (pendingBuilding) {
            setPurchaseBuilding({ ...pendingBuilding, _plot: lotIdx });
          }
        }}
        onClickBuilding={(buildingId) => {
          const b = BUILDINGS_BY_ID.get(buildingId);
          if (b && CRAFTING_STATIONS.has(b.id)) {
            dispatch({ type: "SET_VIEW", view: "crafting", craftingTab: b.id });
          }
        }}
        onClickBoard={(kind) => setEntryBiome(kind)}
      />

      {/* Vignette — softly darkens the screen edges so the finite 4:3 map fades
          into the grass margins rather than ending in a hard box. Above the
          panning world, below the z-30 UI overlays; never eats pointer events. */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{ background: "radial-gradient(120% 120% at 50% 45%, transparent 55%, rgba(0,0,0,0.28) 100%)" }}
      />

      {/* Header — fixed overlay, not part of the pan/zoom world. */}
      <div className="absolute top-3 left-4 landscape:max-[1024px]:top-2 landscape:max-[1024px]:left-3 font-bold text-[20px] landscape:max-[1024px]:text-[15px] z-10" style={{ color: theme.textColor }}>{locationName}</div>
      <div className="absolute top-3 right-4 landscape:max-[1024px]:top-2 landscape:max-[1024px]:right-3 flex items-center gap-2 z-10">
        <ZoneEntryCostInfo zoneId={mapCurrent} state={state} />
        {/* Boons shortcut — only visible once the player has faced any keeper. */}
        {Object.keys(state.story?.flags ?? {}).some((k) => k.startsWith("keeper_") && (k.endsWith("_coexist") || k.endsWith("_driveout")) && (state.story.flags as Record<string, unknown>)[k]) && (
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_VIEW", view: "boons" })}
            className="bg-white/85 px-3 py-1.5 landscape:max-[1024px]:px-2 landscape:max-[1024px]:py-1 rounded-full font-bold text-[#2b2218] landscape:max-[1024px]:text-[13px] hover:bg-white transition-colors"
            title="Spend Embers / Core Ingots on per-path boons"
          >
            ✨ Boons
          </button>
        )}
      </div>

      {/* "Found this settlement" CTA — only renders for visited-but-unfounded settleable zones. */}
      <FoundSettlementBanner state={state} dispatch={dispatch} />

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
          buildings={eligibleBuildings as unknown as Building[]}
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
          className="z-[9999] pointer-events-none bg-ink text-cream text-caption rounded-md px-2 py-1.5 shadow-lg border border-iron/60"
          style={{
            maxWidth: 240,
            minWidth: 150,
          }}
          arrowClassName="border-4 border-transparent border-t-ink"
        >
          <TownBuildingTooltipContent data={buildingTip.data} />
        </Tooltip>
      )}

      {purchaseBuilding && (
        <div
          className="absolute inset-0 z-[10000] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,.6)" }}
          onClick={() => setPurchaseBuilding(null)}
        >
          <div
            className="w-[min(380px,92vw)]"
            onClick={e => e.stopPropagation()}
          >
            <DetailPane
              eyebrow={`Plot ${(purchaseBuilding._plot ?? 0) + 1}`}
              title={purchaseBuilding.name}
              description={purchaseBuilding.desc}
              icon={<BuildingPreview building={purchaseBuilding} />}
              actions={
                <>
                  <DetailActionButton
                    tone="moss"
                    onClick={() => {
                      dispatch({ type: "BUILD", building: purchaseBuilding, plot: purchaseBuilding._plot });
                      setPurchaseBuilding(null);
                      setPendingBuilding(null);
                    }}
                  >
                    Buy
                  </DetailActionButton>
                  <DetailActionButton tone="iron" variant="soft" onClick={() => setPurchaseBuilding(null)}>
                    Cancel
                  </DetailActionButton>
                </>
              }
            >
              <CostGrid entries={buildingCostEntries(purchaseBuilding, state)} title="Build cost" />
            </DetailPane>
          </div>
        </div>
      )}
    </div>
  );
}

function BuildingPreview({ building }: { building: Building }) {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-md bg-[var(--well-bg)]">
      <BuildingIllustration id={building.id} isBuilt={true} />
    </div>
  );
}

interface CostEntry {
  key: string;
  label: string;
  amount: number;
  have: number;
  showHave: boolean;
  check: boolean;
}

function buildingCostEntries(building: Building | null | undefined, state: GameState): CostEntry[] {
  const locInv = zoneInventory(state);
  return Object.entries(building?.cost ?? {}).map(([key, amount]) => ({
    key,
    label: key === "coins" ? "Coins" : key === "runes" ? "Runes" : getItem(key)?.label || key,
    amount: Number(amount),
    have: key === "coins" ? state.coins ?? 0 : key === "runes" ? state.runes ?? 0 : inventoryQty(locInv, key),
    showHave: true,
    check: true,
  }));
}

interface BuildingRow {
  b: Building;
  isBuilt: boolean;
  levelMet: boolean;
  prereqMet: boolean;
  canAfford: boolean;
  reason: string | null;
  pickable: boolean;
}

function buildingRows(
  buildings: Building[],
  state: GameState,
  locationBuilt: LocationBuiltState,
  freePlots: number,
): BuildingRow[] {
  return buildings.map((b) => {
    const isBuilt = !!locationBuilt[b.id];
    const prereqMet = !b.requires || !!locationBuilt[b.requires];
    const levelMet = state.level >= b.lv;
    const cost = b.cost as Record<string, number>;
    const canCoin = state.coins >= (cost.coins || 0);
    const canRunes = (state.runes ?? 0) >= (cost.runes ?? 0);
    const locInv = zoneInventory(state);
    const canRes = Object.entries(cost).every(
      ([k, v]) => k === "coins" || k === "runes" || inventoryQty(locInv, k) >= Number(v),
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
    return { b, isBuilt, levelMet, prereqMet, canAfford, reason, pickable: !reason };
  });
}

interface BuildPickerProps {
  buildings: Building[];
  state: GameState;
  locationBuilt: LocationBuiltState;
  freePlots: number;
  plotCount: number;
  onPick: (b: Building) => void;
  onClose: () => void;
}

function BuildPicker({ buildings, state, locationBuilt, freePlots, plotCount, onPick, onClose }: BuildPickerProps) {
  const rows = buildingRows(buildings, state, locationBuilt, freePlots);
  const [selectedId, setSelectedId] = useState(rows[0]?.b.id ?? null);
  const selected = rows.find((r) => r.b.id === selectedId) ?? rows[0] ?? null;

  return (
    <div
      className="absolute inset-0 z-[10000] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,.6)" }}
      onClick={onClose}
    >
      <div
        className="hl-panel !relative !inset-auto rounded-xl"
        style={{ width: "min(880px, 94vw)", height: "min(620px, 86vh)", boxShadow: "0 8px 40px rgba(0,0,0,.7)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <FeaturePanel.Header
          title="Choose a building"
          onClose={onClose}
          actions={<span className="hl-card-meta tabular-nums">{freePlots}/{plotCount} plots free</span>}
        />
        <FeaturePanel.Body>
          <BrowserDetailLayout
            browser={
              <BrowserGrid min={170}>
                {rows.map(({ b, isBuilt, reason }) => (
                  <BrowserItemButton
                    key={b.id}
                    selected={selected?.b.id === b.id}
                    muted={!!reason}
                    icon={<BuildingPreview building={b} />}
                    title={b.name}
                    subtitle={isBuilt ? "Built" : reason || `Level ${b.lv}`}
                    onClick={() => setSelectedId(b.id)}
                  />
                ))}
              </BrowserGrid>
            }
            detail={
              <DetailPane
                eyebrow={`Level ${selected?.b.lv ?? 1}`}
                title={selected?.b.name}
                description={selected?.b.desc}
                status={selected?.reason || "Ready to place"}
                icon={selected ? <BuildingPreview building={selected.b} /> : null}
                actions={
                  <>
                    <DetailActionButton
                      tone="moss"
                      disabled={!selected?.pickable}
                      onClick={() => selected?.pickable && onPick(selected.b)}
                    >
                      Build
                    </DetailActionButton>
                    <DetailActionButton tone="iron" variant="soft" onClick={onClose}>
                      Close
                    </DetailActionButton>
                  </>
                }
              >
                {selected && <CostGrid entries={buildingCostEntries(selected.b, state)} title="Build cost" />}
              </DetailPane>
            }
          />
        </FeaturePanel.Body>
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
            animation: "townSmoke 3.4s cubic-bezier(0.4, 0, 0.2, 1) infinite",
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
          animation: "hearthPulse 4s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        }}
      />
    </div>
  );
}
