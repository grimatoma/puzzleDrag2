import { useEffect, useRef, useState } from "react";
import { RECIPES, ITEMS } from "../../constants.js";
import { DECORATIONS } from "../decorations/data.js";
import { effectiveRecipeInputs } from "./slice.js";
import IconCanvas, { hasIcon } from "../../ui/IconCanvas.jsx";
import { locBuilt } from "../../locBuilt.js";
import Icon from "../../ui/Icon.jsx";
import DesignIcon from "../../ui/primitives/Icon.jsx";
import { FeaturePanel } from "../_shared/uiTypes.js";
import {
  BrowserDetailLayout,
  BrowserGrid,
  BrowserItemButton,
  CostGrid,
  DetailActionButton,
  DetailPane,
} from "../../ui/primitives/BrowserDetail.jsx";
import type { CSSProperties } from "react";
import type { GameState, Dispatch } from "../../types/state.js";
import { zoneInventory } from "../../state/zoneInventory.js";

export const viewKey = "crafting";

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
}

function LockGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const STATION_META: Record<string, StationMeta> = {
  bakery:   { label: "Bakery",   iconKey: "station_bakery",   bg: "#c08458" },
  forge:    { label: "Forge",    iconKey: "station_forge",    bg: "#8898a4" },
  larder:   { label: "Larder",   iconKey: "station_larder",   bg: "#7a9658" },
  workshop: { label: "Workshop", iconKey: "station_workshop", bg: "#a08c5e" },
  decor:    { label: "Decor",    iconKey: "station_decor",    bg: "#b07ac0" },
};

// Ordered list of all stations (decor appended)
const STATION_ORDER = ["bakery", "larder", "forge", "workshop", "decor"];

function stationBuilt(built: Record<string, unknown> | null | undefined, station: string): boolean {
  return !!(built && built[station]);
}

function canCraft(recipe: RecipeDef, inputs: Record<string, number>, inventory: Record<string, number>, built: Record<string, unknown>, level: number): boolean {
  if (recipe.tier === 2 && level < 3) return false;
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
  level: number;
  craftedTotals: Record<string, number>;
  state: GameState;
  onSelect: () => void;
}

function RecipeBrowserItem({ recipeKey, recipe, selected, inventory, built, level, craftedTotals, state, onSelect }: RecipeBrowserItemProps) {
  const inputs = effectiveRecipeInputs(state, recipeKey, recipe.inputs);
  const craftable = canCraft(recipe, inputs, inventory, built, level);
  const stationOk = stationBuilt(built, recipe.station);
  const levelOk = !(recipe.tier === 2 && level < 3);
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
      subtitle={!levelOk ? "Level 3" : !stationOk ? "No station" : craftable ? "Ready" : "Missing inputs"}
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
  level: number;
  state: GameState;
  dispatch: Dispatch;
}

function RecipeDetail({ recipeKey, recipe, inventory, built, level, state, dispatch }: RecipeDetailProps) {
  if (!recipe || !recipeKey) return <DetailPane empty="Select a recipe to inspect it." />;
  const inputs = effectiveRecipeInputs(state, recipeKey, recipe.inputs);
  const craftable = canCraft(recipe, inputs, inventory, built, level);
  const stationOk = stationBuilt(built, recipe.station);
  const levelOk = !(recipe.tier === 2 && level < 3);
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
      status={!levelOk ? "Requires level 3" : !stationOk ? "Station not built" : craftable ? "Ready to craft" : "Missing inputs"}
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

interface CraftingScreenProps {
  state: GameState;
  dispatch: Dispatch;
}

export default function CraftingScreen({ state, dispatch }: CraftingScreenProps) {
  const inventory: Record<string, number> = zoneInventory(state);
  const level: number = state.level ?? 1;
  const craftedTotals: Record<string, number> = state.craftedTotals ?? {};
  const craftingTab = state.craftingTab;
  const built = locBuilt(state) as Record<string, unknown>;

  // Stations that exist (built or not) — always show all three tabs, but indicate built status
  const builtStations = STATION_ORDER.filter((s) => stationBuilt(built, s));

  // Active tab is URL-driven via state.craftingTab (the router projects it
  // onto `#/crafting/<station>`). When unset (first visit), default to the
  // first built station and back-fill craftingTab so the URL reflects it.
  const activeTab = (craftingTab && STATION_ORDER.includes(craftingTab))
    ? craftingTab
    : (builtStations[0] || STATION_ORDER[0]);

  const dispatchedDefaultRef = useRef<boolean>(false);
  useEffect(() => {
    if (dispatchedDefaultRef.current) return;
    if (craftingTab && STATION_ORDER.includes(craftingTab)) return;
    dispatchedDefaultRef.current = true;
    dispatch({ type: "SET_VIEW", view: "crafting", craftingTab: activeTab });
  }, [craftingTab, activeTab, dispatch]);

  const setActiveTab = (s: string) => dispatch({ type: "SET_VIEW", view: "crafting", craftingTab: s });
  // RECIPES contains each recipe under multiple keys (canonical `rec_*` plus
  // legacy item-name aliases like `axe` for `rec_axe`). Insertion order puts
  // canonical keys first, so deduping by recipe identity keeps the `rec_*` key.
  const seenRecipes = new Set<RecipeDef>();
  const recipeEntries = Object.entries(RECIPES) as Array<[string, RecipeDef | unknown]>;
  const stationRecipes: Array<[string, RecipeDef]> = recipeEntries.filter((entry): entry is [string, RecipeDef] => {
    const r = entry[1];
    if (!r || typeof r !== "object" || (r as RecipeDef).station !== activeTab) return false;
    const rDef = r as RecipeDef;
    if (seenRecipes.has(rDef)) return false;
    seenRecipes.add(rDef);
    return true;
  });
  const meta = STATION_META[activeTab];
  const [selectedRecipeKey, setSelectedRecipeKey] = useState<string | null>(null);
  const [selectedDecorId, setSelectedDecorId] = useState<string | null>(null);
  const selectedRecipeEntry = stationRecipes.find(([key]) => key === selectedRecipeKey) ?? stationRecipes[0] ?? null;
  const decorations = Object.values(DECORATIONS) as DecorDef[];
  const selectedDecor = decorations.find((decor: DecorDef) => decor.id === selectedDecorId) ?? decorations[0] ?? null;

  return (
    <FeaturePanel>
      <FeaturePanel.Tabs className="!flex-nowrap overflow-x-auto">
        {STATION_ORDER.map((s) => {
          const m = STATION_META[s];
          const isActive = activeTab === s;
          const isBuilt = s === "decor" ? true : stationBuilt(built, s);
          const styleObj: CSSProperties = isActive ? { backgroundColor: m.bg, borderColor: "rgba(255,255,255,0.2)" } : {};
          return (
            <FeaturePanel.Tab
              key={s}
              onClick={() => setActiveTab(s)}
              active={isActive}
              className="flex-shrink-0 relative"
              style={styleObj}
            >
              <span style={{ width: 22, height: 22, display: "inline-grid", placeItems: "center" }}>
                <IconCanvas iconKey={m.iconKey} size={22} />
              </span>
              <span>{m.label}</span>
              {!isBuilt && <span className="opacity-60"><LockGlyph size={10} /></span>}
            </FeaturePanel.Tab>
          );
        })}
        <button
          type="button"
          onClick={() => { window.location.hash = "#/wiki"; }}
          className="ml-auto flex-shrink-0 self-center mr-1 rounded-lg px-2 py-1 border border-iron bg-parchment-dim text-ink-soft text-[11px] hover:bg-parchment-soft transition-colors"
        >
          Recipe Graph →
        </button>
      </FeaturePanel.Tabs>

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
                      level={level}
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
                level={level}
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
