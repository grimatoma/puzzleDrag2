import { useState, useMemo } from "react";
import { BUILDINGS, getItem } from "../constants.js";
import { isBuildingReachable } from "../game/reachability.js";
import { useTooltip, Tooltip } from "./Tooltip.jsx";
import { ZONES, zoneHasBoard, displayZoneName, isSettlementFounded, settlementFoundingCost, canAffordFounding, foundingCostLabel, settlementTypeForZone, completedSettlementCount, DEFAULT_ZONE, settlementTier, plotsForTier, globallyUnlockedBuildings, currentTierDef, maxTier, zoneTierGateReason, houseCapForZone, houseCountAt, HOUSE_BUILDING_ID } from "../features/zones/data.js";
import { getTownMap } from "./town/townMaps.js";
import type { TownPlan } from "./town/TownScene.js";
import ZoneEntryCostInfo from "../features/zones/ZoneEntryCostInfo.jsx";
import BiomePicker from "../features/zones/BiomePicker.jsx";
import StartFarmingModal from "../features/zones/StartFarmingModal.jsx";
import BiomeEntryModal from "../features/zones/BiomeEntryModal.jsx";
import { isBiomeLocked, canEnterBiome } from "../state/biomeAccess.js";
import { buildTownPlan } from "../townLayout.js";
import TownPhaserCanvas from "./TownPhaserCanvas.jsx";
import Icon from "./Icon.jsx";
import DesignIcon from "./primitives/Icon.jsx";
import BuildingIllustration from "./buildings/index.jsx";
import { RequirementChip } from "./primitives/Chip.jsx";
import { LOCATION_TOWN_CONFIGS } from "./town/config.js";
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
  const cost = settlementFoundingCost(state).resources;
  const costLabel = foundingCostLabel(state);
  const canAfford = canAffordFounding(state);
  const needPriorComplete = completedSettlementCount(state) < 1;
  const tierGateReason = zoneTierGateReason(state, zoneId);
  const node = ZONES[zoneId];
  const name = displayZoneName(state, zoneId);
  const blocked = needPriorComplete || !!tierGateReason || !canAfford;
  const blockedReason: string | undefined = needPriorComplete
    ? "Complete your first settlement first"
    : tierGateReason
      ? tierGateReason
      : !canAfford
        ? `Need ${costLabel}`
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
          🏗 Found this settlement · {costLabel}
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



// Zone Tier Ladder — the Hearth (town-centre) upgrade control. When the current
// zone has a tier ladder and isn't at its top rung, show a top-centre banner to
// grow the settlement to the next rung. Disabled-with-reason when the player
// can't pay the coins + zone-inventory resources; hidden at max rung / for
// un-tiered zones. Mirrors the FoundSettlementBanner pattern.
function TierUpgradeBanner({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const zoneId = String(state.mapCurrent ?? "");
  if (!zoneId) return null;
  if (!isSettlementFounded(state, zoneId)) return null;
  if (maxTier(zoneId) < 0) return null; // un-tiered zone
  const tier = settlementTier(state, zoneId);
  if (tier >= maxTier(zoneId)) return null; // already at top rung
  const next = currentTierDef(zoneId, tier + 1);
  if (!next) return null;
  const cost = next.upgradeCost ?? {};
  const coinCost = cost.coins ?? 0;
  const resCost = cost.resources ?? {};
  const inv = zoneInventory(state, zoneId);
  const canCoins = (state.coins ?? 0) >= coinCost;
  const missingRes = Object.entries(resCost).filter(([k, v]) => inventoryQty(inv, k) < v);
  const blocked = !canCoins || missingRes.length > 0;
  // Single have/needed (x/n) progress label — replaces the old duplicate of
  // a "total cost" button label plus a separate "shortfall" pill.
  const costLabel = [
    coinCost ? `${Math.min(state.coins ?? 0, coinCost)}/${coinCost}◉` : null,
    ...Object.entries(resCost).map(
      ([k, v]) => `${Math.min(inventoryQty(inv, k), v)}/${v} ${getItem(k)?.label ?? k}`,
    ),
  ].filter(Boolean).join("  ·  ");
  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 pointer-events-none">
      <button
        type="button"
        disabled={blocked}
        onClick={() => !blocked && dispatch({ type: "TIER_UP", payload: { zoneId } })}
        className="pointer-events-auto rounded-lg px-4 py-2 font-bold text-[13px] transition-colors disabled:cursor-not-allowed"
        style={{
          background: blocked ? "#7a6a4a" : "linear-gradient(to bottom, #5aa84a, #3f7a34)",
          color: "white",
          border: blocked ? "2px solid #5a4a30" : "2px solid #2c5a22",
          opacity: blocked ? 0.85 : 1,
          boxShadow: blocked ? "none" : "0 3px 10px rgba(0,0,0,.45)",
        }}
        title={blocked ? `Keep gathering to grow into a ${next.name}` : `Grow into a ${next.name}`}
      >
        ⬆ Upgrade to {next.name}  ·  {costLabel || "free"}
      </button>
    </div>
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

export function TownView({ state, dispatch, active = true, warm = false, onReady }: { state: GameState; dispatch: Dispatch; active?: boolean; warm?: boolean; onReady?: () => void }) {
  const [entryBiome, setEntryBiome] = useState<string | null>(null);
  const [purchaseBuilding, setPurchaseBuilding] = useState<PendingBuilding | null>(null);
  // Build flow: when set, the player has chosen a building and is now picking
  // an empty plot to place it on. Cleared when they confirm or cancel.
  const [pendingBuilding, setPendingBuilding] = useState<PendingBuilding | null>(null);
  const [buildPickerOpen, setBuildPickerOpen] = useState(false);
  const { tip: buildingTip } = useTooltip<BuildingTipData>();
  const mapCurrent = String(state.mapCurrent ?? DEFAULT_ZONE);
  const locConfig = LOCATION_TOWN_CONFIGS[mapCurrent];
  const biomeVariant = locConfig?.biomeVariant ?? (state.biomeKey === 'mine' ? 'mine' : 'farm');
  // The settlement name now lives in the HUD header (src/ui/Hud.tsx) rather than
  // as an on-map overlay, so there is no per-town theme title to resolve here.
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
  // Zone Tier Ladder — the settlement's current rung drives both the plot count
  // and which authored town map renders. Un-tiered zones report tier 0 and fall
  // back to the static plotCount + the procedural plan.
  const tier = settlementTier(state, mapCurrent);
  const requestedPlots = Math.max(1, plotsForTier(mapCurrent, tier) || (zoneConfig?.plotCount ?? 12));
  const townPlan = useMemo<TownPlan>(() => {
    const authored = getTownMap(mapCurrent, tier);
    if (authored) return authored;
    const z = ZONES[mapCurrent];
    const boardKinds = [z && zoneHasBoard(z, "farm") && "farm", z && zoneHasBoard(z, "mine") && "mine", z && zoneHasBoard(z, "fish") && "fish"].filter(Boolean) as string[];
    return buildTownPlan({ zoneId: mapCurrent, plotCount: requestedPlots, boardKinds: boardKinds as never[] }) as unknown as TownPlan;
  }, [mapCurrent, tier, requestedPlots]);
  const layoutPlots = useMemo(
    () => townPlan.lots.map((l: { cx: number; cy: number; w: number; h: number }) => ({ x: l.cx - l.w / 2, y: l.cy - l.h / 2, w: l.w, h: l.h })),
    [townPlan],
  );
  const plotCount = layoutPlots.length;
  const storedPlots: Record<string, string | null> = locationBuilt._plots ?? EMPTY_OBJECT;
  // Build a normalised plot map { idx -> buildingId | null }, auto-assigning
  // any legacy buildings that lack an entry (e.g. saves predating the plot
  // system, or tests that set { hearth: true } without _plots).
  const { occupiedPlots, builtLotIndices, buildingsMap } = useMemo(() => {
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

  // Global building unlock (Phase 2): a building unlocked at ANY founded zone's
  // current tier is buildable everywhere — so we union across founded zones
  // rather than reading only the current zone's roster. The biome +
  // reachability filters below still gate by the player's current zone.
  const allowedBuildings = zoneConfig ? globallyUnlockedBuildings(state) : ALL_BUILDING_IDS;
  const eligibleBuildings = useMemo(
    // `&& isBuildingReachable` = static reachability: never offer a building that no
    // zone ever unlocks (orphaned/scoped-out). The unlock+biome filters above still
    // gate by the player's current zone/tier.
    () => BUILDINGS.filter((b) => allowedBuildings.includes(b.id as import("../types/catalog/buildings.js").BuildingId) && (!b.biome || b.biome === biomeVariant) && isBuildingReachable(b.id)),
    [allowedBuildings, biomeVariant],
  );
  const freePlots = plotCount - occupiedPlots;

  // Accessible labels for the puzzle-board entry CTAs (also the source of the
  // "Enter Farm Field" / "Enter Mine" / "Enter Harbor" accessible names).
  const BOARD_ENTRY_LABEL: Record<string, string> = { farm: "Farm Field", mine: "Mine", fish: "Harbor" };

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: marginGrass }}>
      {/* Pan/zoom world — the top-down map (terrain, roads, fields, plaza, board
          fixtures, buildings and trees) scales uniformly together inside a
          fixed-aspect stage box. The grass margins above and the UI overlays
          below stay fixed. */}
      <TownPhaserCanvas
        active={active}
        warm={warm}
        onReady={onReady}
        zoneId={mapCurrent}
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

      {/* Header controls — fixed overlay, not part of the pan/zoom world. The
          settlement name itself is shown in the HUD header (src/ui/Hud.tsx). */}
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

      {/* Tier-ladder upgrade CTA — grows a founded, tiered settlement to its next rung. */}
      <TierUpgradeBanner state={state} dispatch={dispatch} />

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

      {/* Board-entry CTAs — accessible DOM buttons that open each puzzle board
          the zone exposes. The in-canvas board plates pan and zoom with the
          Phaser camera, so they carry no accessibility tree; these fixed
          screen-space buttons make board entry reachable by keyboard, screen
          reader and role-based tests (e.g. "Enter Farm Field"). Hidden while
          placing a building so they don't compete with plot selection. */}
      {!pendingBuilding && townPlan.boards.length > 0 && (
        <div className="absolute z-30 flex flex-col gap-2 items-start" style={{ left: "1.5rem", bottom: "10%" }}>
          {townPlan.boards.map((b: { kind: string }) => {
            const label = BOARD_ENTRY_LABEL[b.kind] ?? b.kind;
            const locked = isBiomeLocked(state, b.kind);
            return (
              <button
                key={b.kind}
                type="button"
                disabled={locked}
                onClick={() => { if (!locked) setEntryBiome(b.kind); }}
                aria-label={locked ? `${label} (locked)` : `Enter ${label}`}
                title={locked ? (canEnterBiome(state, b.kind).reason ?? "Locked") : undefined}
                className="rounded-full font-bold shadow-lg border-[3px] border-white disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  padding: "0.65rem 1.1rem",
                  background: locked ? "#cdbfa6" : "#f4e4c1",
                  color: "#2b2218",
                  fontSize: "clamp(11px,1.2vw,14px)",
                }}
              >
                <Icon iconKey="ui_enter" size={12} className="inline align-text-top mr-1" />
                {`Enter ${label}`}
              </button>
            );
          })}
        </div>
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
              icon={<BuildingPreview building={purchaseBuilding} size={68} />}
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

function BuildingPreview({ building, size = 56 }: { building: Building; size?: number }) {
  const iconKey = building.icon ?? `bld_${building.id}`;
  return (
    <div className="grid place-items-center w-full h-full">
      <Icon iconKey={iconKey} size={size} />
    </div>
  );
}

interface CostEntry {
  key: string;
  label: string;
  amount: number;
  have: number;
  ok: boolean;
  icon?: React.ReactNode;
  showHave: boolean;
  check: boolean;
}

function buildingCostEntries(building: Building | null | undefined, state: GameState): CostEntry[] {
  const locInv = zoneInventory(state);
  return Object.entries(building?.cost ?? {}).map(([key, amount]) => {
    const have = key === "coins" ? state.coins ?? 0 : key === "runes" ? state.runes ?? 0 : inventoryQty(locInv, key);
    return {
      key,
      label: key === "coins" ? "Coins" : key === "runes" ? "Runes" : getItem(key)?.label || key,
      amount: Number(amount),
      have,
      ok: have >= Number(amount),
      icon: key === "coins"
        ? <DesignIcon iconKey="design.currency.coin" size={18} />
        : key === "runes"
          ? undefined
          : <Icon iconKey={key} size={18} />,
      showHave: true,
      check: true,
    };
  });
}

interface BuildingRow {
  b: Building;
  isBuilt: boolean;
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
  const zoneId = String(state.mapCurrent ?? DEFAULT_ZONE);
  return buildings.map((b) => {
    // The House is repeatable up to a per-town cap, so for it "built" means
    // "at cap" (not "placed once") — keep offering it until the town is full.
    const isHouse = b.id === HOUSE_BUILDING_ID;
    const atHouseCap = isHouse && houseCountAt(state, zoneId) >= houseCapForZone(zoneId);
    const isBuilt = isHouse ? atHouseCap : !!locationBuilt[b.id];
    const prereqMet = !b.requires || !!locationBuilt[b.requires];
    const cost = b.cost as Record<string, number>;
    const canCoin = state.coins >= (cost.coins || 0);
    const canRunes = (state.runes ?? 0) >= (cost.runes ?? 0);
    const locInv = zoneInventory(state);
    const canRes = Object.entries(cost).every(
      ([k, v]) => k === "coins" || k === "runes" || inventoryQty(locInv, k) >= Number(v),
    );
    const canAfford = canCoin && canRes && canRunes;
    const reason = isBuilt
      ? (isHouse ? "Fully housed" : "Already built")
      : !prereqMet
        ? `Requires ${b.requires}`
        : freePlots <= 0
          ? "No free plots"
          : !canAfford
            ? "Not enough resources"
            : null;
    return { b, isBuilt, prereqMet, canAfford, reason, pickable: !reason };
  });
}

function BuildCostSummary({ building, state }: { building: Building; state: GameState }) {
  const entries = buildingCostEntries(building, state);
  if (!entries.length) return null;
  return (
    <div className="flex flex-wrap gap-0.5 mt-0.5">
      {entries.map(({ key, label, amount, have, ok }) => (
        <RequirementChip key={key} ok={ok}>
          <span className="truncate">{label}</span>
          <span className="tabular-nums">{have}/{amount}</span>
        </RequirementChip>
      ))}
    </div>
  );
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
        className="hl-panel hl-build-picker !relative !inset-auto rounded-xl"
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
                    icon={<BuildingPreview building={b} size={58} />}
                    title={b.name}
                    subtitle={isBuilt ? "Built" : reason || "Ready to place"}
                    onClick={() => setSelectedId(b.id)}
                  >
                    {!isBuilt && <BuildCostSummary building={b} state={state} />}
                  </BrowserItemButton>
                ))}
              </BrowserGrid>
            }
            detail={
              <DetailPane
                eyebrow="Building"
                title={selected?.b.name}
                description={selected?.b.desc}
                status={selected?.reason || "Ready to place"}
                icon={selected ? <BuildingPreview building={selected.b} size={104} /> : null}
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

