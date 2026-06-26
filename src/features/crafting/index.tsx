import { useState, type ReactNode } from "react";
import { RECIPES, ITEMS } from "../../constants.js";
import { isRecipeReachable } from "../../game/reachability.js";
import { DECORATIONS } from "../decorations/data.js";
import { effectiveRecipeInputs } from "./slice.js";
import IconCanvas, { hasIcon } from "../../ui/IconCanvas.jsx";
import { locBuilt } from "../../locBuilt.js";
import Icon from "../../ui/Icon.jsx";
import DesignIcon from "../../ui/primitives/Icon.jsx";
import Button from "../../ui/primitives/Button.jsx";
import { FeaturePanel } from "../_shared/uiTypes.js";
import {
  BrowserDetailLayout,
  BrowserGrid,
  BrowserItemButton,
  CostGrid,
  DetailActionButton,
  DetailPane,
} from "../../ui/primitives/BrowserDetail.jsx";
import type { GameState, Dispatch } from "../../types/state.js";
import { zoneInventory } from "../../state/zoneInventory.js";
import { settlementTier } from "../zones/data.js";

export const viewKey = "crafting";

// Tier-2 recipes unlock once the home settlement reaches Village (tier 2) —
// tied to zone progression, not player level.
const TIER2_HOME_TIER = 2;
const TIER2_GATE_LABEL = "Village";

interface RecipeDef {
  item: string;
  station: string;
  inputs: Record<string, number>;
  tier?: number;
  desc?: string;
  coins?: number;
}

interface ItemDef {
  label?: string;
  desc?: string;
  kind?: string;
}

interface DecorDef {
  id: string;
  name: string;
  influence: number;
  cost: Record<string, number>;
}

interface StationMeta {
  label: string;
  iconKey: string;
  bg: string;
  /** Evocative station name for the board header. */
  title: string;
  /** One-line in-world description of the station. */
  flavor: string;
}

function LockGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronGlyph({ size = 14, dir = "right" }: { size?: number; dir?: "left" | "right" }) {
  const d = dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const STATION_META: Record<string, StationMeta> = {
  bakery:   { label: "Bakery",   iconKey: "station_bakery",   bg: "#c08458", title: "Mira's Bakery",  flavor: "Where flour and patience become warm bread." },
  forge:    { label: "Forge",    iconKey: "station_forge",    bg: "#8898a4", title: "Bram's Forge",   flavor: "Iron, fire, and the steady ring of the hammer." },
  larder:   { label: "Larder",   iconKey: "station_larder",   bg: "#7a9658", title: "The Larder",     flavor: "Preserves and provisions, put by for the lean months." },
  workshop: { label: "Workshop", iconKey: "station_workshop", bg: "#a08c5e", title: "Wren's Workshop", flavor: "Planks, nails, and a carpenter's steady hands." },
  decor:    { label: "Decor",    iconKey: "station_decor",    bg: "#b07ac0", title: "The Craft Table", flavor: "Small comforts that make the vale feel like home." },
};

function StationHeader({ meta, pill }: { meta: StationMeta; pill?: string | null }) {
  return (
    <div className="hl-board-head mx-3 mt-2 flex-shrink-0">
      <span style={{ width: 32, height: 32 }} className="inline-grid place-items-center flex-shrink-0">
        <IconCanvas iconKey={meta.iconKey} size={32} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="hl-board-head__kicker">Hearthwood Vale</div>
        <div className="hl-board-head__title">{meta.title}</div>
        <div className="hl-board-head__sub">{meta.flavor}</div>
      </div>
      {pill != null && <span className="hl-board-pill">{pill}</span>}
    </div>
  );
}

// Ordered list of all stations (decor appended)
const STATION_ORDER = ["bakery", "larder", "forge", "workshop", "decor"];

function stationBuilt(built: Record<string, unknown> | null | undefined, station: string): boolean {
  return !!(built && built[station]);
}

// RECIPES contains each recipe under multiple keys (canonical `rec_*` plus
// legacy item-name aliases like `axe` for `rec_axe`). Insertion order puts
// canonical keys first, so deduping by recipe identity keeps the `rec_*` key.
// Orphaned/scoped-out recipes (no unlock path) are hidden.
function recipesForStation(station: string): Array<[string, RecipeDef]> {
  const seen = new Set<RecipeDef>();
  const entries = Object.entries(RECIPES) as Array<[string, RecipeDef | unknown]>;
  return entries.filter((entry): entry is [string, RecipeDef] => {
    const r = entry[1];
    if (!r || typeof r !== "object" || (r as RecipeDef).station !== station) return false;
    if (!isRecipeReachable(entry[0])) return false;
    const rDef = r as RecipeDef;
    if (seen.has(rDef)) return false;
    seen.add(rDef);
    return true;
  });
}

function canCraft(recipe: RecipeDef, inputs: Record<string, number>, inventory: Record<string, number>, built: Record<string, unknown>, tier2Unlocked: boolean): boolean {
  if (recipe.tier === 2 && !tier2Unlocked) return false;
  if (!stationBuilt(built, recipe.station)) return false;
  for (const [res, need] of Object.entries(inputs)) {
    if ((inventory[res] || 0) < need) return false;
  }
  return true;
}

interface RecipeBrowserItemProps {
  recipeKey: string;
  recipe: RecipeDef;
  selected: boolean;
  inventory: Record<string, number>;
  built: Record<string, unknown>;
  tier2Unlocked: boolean;
  craftedTotals: Record<string, number>;
  state: GameState;
  onSelect: () => void;
}

function RecipeBrowserItem({ recipeKey, recipe, selected, inventory, built, tier2Unlocked, craftedTotals, state, onSelect }: RecipeBrowserItemProps) {
  const inputs = effectiveRecipeInputs(state, recipeKey, recipe.inputs);
  const craftable = canCraft(recipe, inputs, inventory, built, tier2Unlocked);
  const stationOk = stationBuilt(built, recipe.station);
  const tierOk = !(recipe.tier === 2) || tier2Unlocked;
  const timesBuilt = (craftedTotals || {})[recipeKey] || 0;

  const itemMap = ITEMS as unknown as Record<string, ItemDef | undefined>;
  const itemDef = itemMap[recipe.item] || {};
  const itemName = itemDef.label || recipe.item;

  return (
    <BrowserItemButton
      selected={selected}
      muted={!craftable}
      icon={<Icon iconKey={recipe.item} size={36} />}
      title={itemName}
      subtitle={!tierOk ? TIER2_GATE_LABEL : !stationOk ? "No station" : craftable ? "Ready" : "Missing inputs"}
      count={timesBuilt > 0 ? `x${timesBuilt}` : null}
      onClick={onSelect}
      aria-label={`View recipe ${itemName}`}
    />
  );
}

interface RecipeDetailProps {
  recipeKey?: string;
  recipe?: RecipeDef;
  inventory: Record<string, number>;
  built: Record<string, unknown>;
  tier2Unlocked: boolean;
  state: GameState;
  dispatch: Dispatch;
}

function RecipeDetail({ recipeKey, recipe, inventory, built, tier2Unlocked, state, dispatch }: RecipeDetailProps) {
  if (!recipe || !recipeKey) return <DetailPane empty="Select a recipe to inspect it." />;
  const inputs = effectiveRecipeInputs(state, recipeKey, recipe.inputs);
  const craftable = canCraft(recipe, inputs, inventory, built, tier2Unlocked);
  const stationOk = stationBuilt(built, recipe.station);
  const tierOk = !(recipe.tier === 2) || tier2Unlocked;
  const itemMap = ITEMS as unknown as Record<string, ItemDef | undefined>;
  const itemDef = itemMap[recipe.item] || {};
  const itemName = itemDef.label || recipe.item;
  const entries = Object.entries(inputs).map(([res, need]: [string, number]) => ({
    key: res,
    label: itemMap[res]?.label || res,
    amount: need,
    icon: <Icon iconKey={res} size={18} />,
    have: (inventory || {})[res] || 0,
    showHave: true,
    check: true,
    ok: ((inventory || {})[res] || 0) >= need,
  }));
  const rawChanged = Object.entries(inputs).some(([res, need]) => need !== recipe.inputs[res]);

  return (
    <DetailPane
      eyebrow={STATION_META[recipe.station]?.label ?? recipe.station}
      title={itemName}
      status={!tierOk ? `Requires a ${TIER2_GATE_LABEL}` : !stationOk ? "Station not built" : craftable ? "Ready to craft" : "Missing inputs"}
      description={recipe.desc || itemDef.desc}
      icon={<Icon iconKey={recipe.item} size={64} />}
      actions={
        <DetailActionButton
          tone="moss"
          disabled={!craftable}
          onClick={() => dispatch({ type: "CRAFTING/CRAFT_RECIPE", payload: { key: recipeKey }, recipeKey })}
        >
          Craft
        </DetailActionButton>
      }
    >
      <CostGrid entries={entries} title={rawChanged ? "Inputs after worker bonuses" : "Inputs"} />
    </DetailPane>
  );
}

function canAffordDecor(decor: DecorDef, state: GameState): boolean {
  const { cost } = decor;
  if ((state.coins ?? 0) < (cost.coins ?? 0)) return false;
  const inv: Record<string, number> = zoneInventory(state);
  for (const [k, v] of Object.entries(cost)) {
    if (k === "coins") continue;
    if ((inv[k] ?? 0) < v) return false;
  }
  return true;
}

function DecorIcon({ decor, size = 42 }: { decor: DecorDef; size?: number }) {
  const decorIconKey = `decor_${decor.id}`;
  if (hasIcon(decorIconKey)) {
    return <IconCanvas iconKey={decorIconKey} size={size} />;
  }
  return (
    <span className="text-lg font-bold" aria-hidden="true">
      {decor.name.slice(0, 1)}
    </span>
  );
}

function decorCostEntries(decor: DecorDef, state: GameState) {
  const inv: Record<string, number> = zoneInventory(state);
  const itemMap = ITEMS as unknown as Record<string, ItemDef | undefined>;
  return Object.entries(decor.cost ?? {}).map(([key, amount]: [string, number]) => ({
    key,
    label: key === "coins" ? "Coins" : itemMap[key]?.label || key,
    amount,
    icon: key === "coins" ? <DesignIcon iconKey="design.currency.coin" size={18} /> : <Icon iconKey={key} size={18} />,
    have: key === "coins" ? (state.coins ?? 0) : (inv[key] ?? 0),
    showHave: true,
    check: true,
    ok: key === "coins" ? (state.coins ?? 0) >= amount : (inv[key] ?? 0) >= amount,
  }));
}

interface DecorBrowserItemProps {
  decor: DecorDef;
  state: GameState;
  selected: boolean;
  onSelect: () => void;
}

function DecorationBrowserItem({ decor, state, selected, onSelect }: DecorBrowserItemProps) {
  const affordable = canAffordDecor(decor, state);
  const builtAt = (locBuilt(state) as { decorations?: Record<string, number> }).decorations ?? {};
  const count: number = builtAt[decor.id] ?? 0;
  return (
    <BrowserItemButton
      selected={selected}
      muted={!affordable}
      icon={<DecorIcon decor={decor} size={38} />}
      title={decor.name}
      subtitle={affordable ? `+${decor.influence} influence` : "Missing cost"}
      count={count > 0 ? `x${count}` : null}
      onClick={onSelect}
      aria-label={`View decor ${decor.name}`}
    />
  );
}

interface DecorDetailProps {
  decor: DecorDef | null;
  state: GameState;
  dispatch: Dispatch;
}

function DecorationDetail({ decor, state, dispatch }: DecorDetailProps) {
  if (!decor) return <DetailPane empty="Select decor to inspect it." />;
  const affordable = canAffordDecor(decor, state);
  const builtAt = (locBuilt(state) as { decorations?: Record<string, number> }).decorations ?? {};
  const count: number = builtAt[decor.id] ?? 0;

  return (
    <DetailPane
      eyebrow="Decor"
      title={decor.name}
      status={affordable ? "Ready to build" : "Missing cost"}
      description="Build this decoration at the current settlement to raise influence."
      icon={<DecorIcon decor={decor} size={64} />}
      actions={
        <DetailActionButton
          tone="moss"
          disabled={!affordable}
          onClick={() => dispatch({ type: "BUILD_DECORATION", payload: { id: decor.id } })}
        >
          Build
        </DetailActionButton>
      }
    >
      <div className="hl-well">
        <div className="hl-section-label">Owned here</div>
        <div className="hl-heading tabular-nums">{count}</div>
      </div>
      <div className="hl-well">
        <div className="hl-section-label">Influence</div>
        <div className="hl-heading">+{decor.influence}</div>
      </div>
      <CostGrid entries={decorCostEntries(decor, state)} title="Cost" />
    </DetailPane>
  );
}

interface StationCardProps {
  station: string;
  state: GameState;
  built: Record<string, unknown>;
  inventory: Record<string, number>;
  tier2Unlocked: boolean;
  onOpen: () => void;
}

// Level-1 drill-down card: one per crafting building. Tapping it drills into
// that building's recipe (or decor) list.
function StationCard({ station, state, built, inventory, tier2Unlocked, onOpen }: StationCardProps) {
  const meta = STATION_META[station];
  const isDecor = station === "decor";
  const isBuilt = isDecor ? true : stationBuilt(built, station);

  let statusNode: ReactNode;
  if (isDecor) {
    const placed = Object.values(
      ((locBuilt(state) as { decorations?: Record<string, number> }).decorations) ?? {},
    ).reduce((sum, n) => sum + (Number(n) || 0), 0);
    statusNode = `${placed} placed`;
  } else if (!isBuilt) {
    statusNode = <span className="inline-flex items-center gap-1"><LockGlyph size={11} /> Locked</span>;
  } else {
    const recs = recipesForStation(station);
    const ready = recs.filter(([key, recipe]) =>
      canCraft(recipe, effectiveRecipeInputs(state, key, recipe.inputs), inventory, built, tier2Unlocked),
    ).length;
    statusNode = `${ready}/${recs.length} ready`;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`hl-card hl-card--interactive text-left gap-2 ${isBuilt ? "" : "opacity-70"}`}
      aria-label={`Open ${meta.label}`}
    >
      <div className="flex items-center gap-3">
        <span
          style={{ width: 44, height: 44, backgroundColor: meta.bg }}
          className="inline-grid place-items-center flex-shrink-0 rounded-lg"
        >
          <IconCanvas iconKey={meta.iconKey} size={30} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="hl-card-title truncate">{meta.title}</div>
          <div className="hl-card-meta">{meta.label}</div>
        </div>
        <span className="flex-shrink-0 text-ink-soft opacity-70"><ChevronGlyph size={16} /></span>
      </div>
      <p className="hl-card-faint leading-snug">{meta.flavor}</p>
      <div className="mt-auto"><span className="hl-board-pill">{statusNode}</span></div>
    </button>
  );
}

interface StationMenuProps {
  state: GameState;
  built: Record<string, unknown>;
  inventory: Record<string, number>;
  tier2Unlocked: boolean;
  onOpen: (station: string) => void;
}

// Level-1 drill-down view: the grid of building cards.
function StationMenu({ state, built, inventory, tier2Unlocked, onOpen }: StationMenuProps) {
  return (
    <FeaturePanel>
      <FeaturePanel.Header
        title="Crafting"
        actions={
          <button
            type="button"
            onClick={() => { window.location.hash = "#/wiki"; }}
            className="flex-shrink-0 rounded-lg px-2 py-1 border border-iron bg-parchment-dim text-ink-soft text-[11px] hover:bg-parchment-soft transition-colors"
          >
            Recipe Graph →
          </button>
        }
      />
      <FeaturePanel.Body>
        <p className="mb-3 text-caption text-ink-soft">Choose a workshop to see what you can craft there.</p>
        <BrowserGrid min={220}>
          {STATION_ORDER.map((s) => (
            <StationCard
              key={s}
              station={s}
              state={state}
              built={built}
              inventory={inventory}
              tier2Unlocked={tier2Unlocked}
              onOpen={() => onOpen(s)}
            />
          ))}
        </BrowserGrid>
      </FeaturePanel.Body>
    </FeaturePanel>
  );
}

interface CraftingScreenProps {
  state: GameState;
  dispatch: Dispatch;
}

export default function CraftingScreen({ state, dispatch }: CraftingScreenProps) {
  const inventory: Record<string, number> = zoneInventory(state);
  const tier2Unlocked: boolean = settlementTier(state, "home") >= TIER2_HOME_TIER;
  const craftedTotals: Record<string, number> = state.craftedTotals ?? {};
  const built = locBuilt(state) as Record<string, unknown>;

  // Drill-down: craftingTab unset → the building menu (level 1); a valid
  // station → that building's recipe/decor list (level 2). The station lives in
  // state.craftingTab, which the router projects onto `#/crafting/<station>`,
  // so each drill in/out is its own history entry (browser + button back both
  // work), and the station is preserved when switching to another tab and back.
  const activeTab = (state.craftingTab && STATION_ORDER.includes(state.craftingTab))
    ? state.craftingTab
    : null;
  const openStation = (s: string) => dispatch({ type: "SET_VIEW", view: "crafting", craftingTab: s });
  const backToMenu = () => dispatch({ type: "SET_VIEW", view: "crafting", craftingTab: null });

  // Selection within the active station. Declared unconditionally (before any
  // early return) so hook order stays stable across the menu/detail switch.
  const [selectedRecipeKey, setSelectedRecipeKey] = useState<string | null>(null);
  const [selectedDecorId, setSelectedDecorId] = useState<string | null>(null);

  if (!activeTab) {
    return (
      <StationMenu
        state={state}
        built={built}
        inventory={inventory}
        tier2Unlocked={tier2Unlocked}
        onOpen={openStation}
      />
    );
  }

  const meta = STATION_META[activeTab];
  const stationRecipes = recipesForStation(activeTab);
  const selectedRecipeEntry = stationRecipes.find(([key]) => key === selectedRecipeKey) ?? stationRecipes[0] ?? null;
  const decorations = Object.values(DECORATIONS) as DecorDef[];
  const selectedDecor = decorations.find((decor: DecorDef) => decor.id === selectedDecorId) ?? decorations[0] ?? null;

  // Header pill: how many recipes are craftable right now (or decor placed).
  const craftableCount = stationRecipes.filter(([key, recipe]) =>
    canCraft(recipe, effectiveRecipeInputs(state, key, recipe.inputs), inventory, built, tier2Unlocked),
  ).length;
  const decorPlaced = Object.values(
    ((locBuilt(state) as { decorations?: Record<string, number> }).decorations) ?? {},
  ).reduce((sum, n) => sum + (Number(n) || 0), 0);
  const headerPill = activeTab === "decor"
    ? `${decorPlaced} placed`
    : !stationBuilt(built, activeTab)
      ? "Locked"
      : `${craftableCount}/${stationRecipes.length} ready`;

  return (
    <FeaturePanel>
      <div className="flex items-center gap-2 px-3 pt-2 flex-shrink-0">
        <Button
          tone="iron"
          variant="soft"
          size="sm"
          onClick={backToMenu}
          leading={<ChevronGlyph size={14} dir="left" />}
        >
          Buildings
        </Button>
        <button
          type="button"
          onClick={() => { window.location.hash = "#/wiki"; }}
          className="ml-auto flex-shrink-0 rounded-lg px-2 py-1 border border-iron bg-parchment-dim text-ink-soft text-[11px] hover:bg-parchment-soft transition-colors"
        >
          Recipe Graph →
        </button>
      </div>

      <StationHeader meta={meta} pill={headerPill} />

      {activeTab === "decor" ? (
        <FeaturePanel.Body>
          <BrowserDetailLayout
            browser={
              <BrowserGrid min={170}>
                {decorations.map((decor: DecorDef) => (
                  <DecorationBrowserItem
                    key={decor.id}
                    decor={decor}
                    state={state}
                    selected={selectedDecor?.id === decor.id}
                    onSelect={() => setSelectedDecorId(decor.id)}
                  />
                ))}
              </BrowserGrid>
            }
            detail={<DecorationDetail decor={selectedDecor} state={state} dispatch={dispatch} />}
          />
        </FeaturePanel.Body>
      ) : !stationBuilt(built, activeTab) ? (
        <div className="flex-1 grid place-items-center px-4">
          <p className="hl-empty">
            Build the {meta.label} in town to unlock these recipes.
          </p>
        </div>
      ) : (
        <FeaturePanel.Body>
          <BrowserDetailLayout
            browser={
              stationRecipes.length === 0 ? (
                <div className="hl-empty">No recipes at this station.</div>
              ) : (
                <BrowserGrid min={170}>
                  {stationRecipes.map(([key, recipe]) => (
                    <RecipeBrowserItem
                      key={key}
                      recipeKey={key}
                      recipe={recipe}
                      selected={selectedRecipeEntry?.[0] === key}
                      inventory={inventory}
                      built={built}
                      tier2Unlocked={tier2Unlocked}
                      craftedTotals={craftedTotals}
                      state={state}
                      onSelect={() => setSelectedRecipeKey(key)}
                    />
                  ))}
                </BrowserGrid>
              )
            }
            detail={
              <RecipeDetail
                recipeKey={selectedRecipeEntry?.[0]}
                recipe={selectedRecipeEntry?.[1]}
                inventory={inventory}
                built={built}
                tier2Unlocked={tier2Unlocked}
                state={state}
                dispatch={dispatch}
              />
            }
          />
        </FeaturePanel.Body>
      )}
    </FeaturePanel>
  );
}
