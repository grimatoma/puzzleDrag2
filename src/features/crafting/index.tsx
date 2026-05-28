import { useEffect, useRef, useState } from "react";
import { RECIPES, ITEMS, recipeCraftMs } from "../../constants.js";
import { DECORATIONS } from "../decorations/data.js";
import { effectiveRecipeInputs, type CraftQueueEntry } from "./slice.js";
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
        <>
          <DetailActionButton
            tone="moss"
            disabled={!craftable}
            onClick={() => dispatch({ type: "CRAFTING/CRAFT_RECIPE", payload: { key: recipeKey }, recipeKey })}
          >
            Craft
          </DetailActionButton>
          <DetailActionButton
            tone="iron"
            variant="soft"
            disabled={!craftable}
            title={`Queue — ready in ${fmtDuration(recipeCraftMs(recipeKey))} (or skip with a gem)`}
            onClick={() => dispatch({ type: "CRAFTING/QUEUE_RECIPE", payload: { key: recipeKey }, recipeKey })}
          >
            <Icon iconKey="craft_queue" size={12} /> Queue {fmtDuration(recipeCraftMs(recipeKey))}
          </DetailActionButton>
        </>
      }
    >
      <CostGrid entries={entries} title={rawChanged ? "Inputs after worker bonuses" : "Inputs"} />
    </DetailPane>
  );
}

// Phase 5 — per-station crafting queue UI.
// • Each station tab gets a small badge (count + ready-dot) and a 2px progress
//   hair below it tracking the head's progress.
// • The active station's queue, if any, shows as a compact single-row strip
//   above the recipe browser: ring-progress icon, name + countdown, claim/skip,
//   and small icon chips for up-next.
// • Empty station ⇒ no strip, zero wasted real estate.
function fmtDuration(ms: number): string {
  if (ms <= 0) return "0s";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return s > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${m}m`;
  return `${s}s`;
}

interface EntryProgress { duration: number; remaining: number; pct: number; isReady: boolean }

function entryProgress(entry: CraftQueueEntry | undefined, now: number): EntryProgress {
  const start = entry?.startAt ?? entry?.queuedAt ?? now;
  const ready = entry?.readyAt ?? start;
  const duration = entry?.durationMs ?? Math.max(1, ready - start);
  const elapsed = Math.max(0, Math.min(duration, now - start));
  const remaining = Math.max(0, ready - now);
  const pct = duration > 0 ? Math.max(0, Math.min(1, elapsed / duration)) : 0;
  return { duration, remaining, pct, isReady: remaining <= 0 };
}

interface ProgressRingProps {
  iconKey: string;
  pct: number;
  ready: boolean;
  size?: number;
}

// Small ring-progress with the recipe icon centered. The ring fills as the
// head crafts; turns green and pulses when ready.
function ProgressRingIcon({ iconKey, pct, ready, size = 52 }: ProgressRingProps) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  return (
    <div className={`craft-ring ${ready ? "craft-ring--ready" : ""}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="craft-ring-svg" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.32)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ready ? "#8fc740" : "url(#craft-ring-grad)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
        />
        <defs>
          <linearGradient id="craft-ring-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#b8531f" />
            <stop offset="100%" stopColor="#e08a5a" />
          </linearGradient>
        </defs>
      </svg>
      <div className="craft-ring-icon">
        <Icon iconKey={iconKey} size={size - 18} />
      </div>
    </div>
  );
}

interface StationQueueStripProps {
  station: string;
  queue: CraftQueueEntry[] | undefined;
  gems: number | undefined;
  dispatch: Dispatch;
  now: number;
}

// Compact single-row strip rendered above the active station's recipe browser
// when that station has a non-empty queue. `now` is owned by the parent so
// all per-station indicators share one ticker.
function StationQueueStrip({ station, queue, gems, dispatch, now }: StationQueueStripProps) {
  if (!queue || queue.length === 0) return null;

  const head = queue[0];
  const tail: CraftQueueEntry[] = queue.slice(1);
  const recipeMap = RECIPES as unknown as Record<string, RecipeDef | undefined>;
  const itemMap = ITEMS as unknown as Record<string, ItemDef | undefined>;
  const recipe = recipeMap[head.key];
  const itemDef = recipe ? (itemMap[recipe.item] || {}) : {};
  const itemName = itemDef.label ?? recipe?.item ?? head.key;
  const { duration, remaining, pct, isReady } = entryProgress(head, now);
  const visibleTail = tail.slice(0, 4);
  const tailOverflow = tail.length - visibleTail.length;

  return (
    <div
      className={`craft-strip ${isReady ? "craft-strip--ready" : "craft-strip--active"}`}
      aria-label={`${itemName} ${isReady ? "is ready to claim" : `crafting, ${fmtDuration(remaining)} remaining`}`}
    >
      <ProgressRingIcon iconKey={recipe?.item ?? head.key} pct={pct} ready={isReady} />
      <div className="craft-strip-meta">
        <div className="craft-strip-name">{itemName}</div>
        <div className="craft-strip-time">
          {isReady ? (
            <span className="craft-strip-ready">Ready to claim</span>
          ) : (
            <>
              <span className="craft-strip-time-remaining">{fmtDuration(remaining)}</span>
              <span className="craft-strip-time-total"> / {fmtDuration(duration)}</span>
            </>
          )}
        </div>
      </div>
      <div className="craft-strip-actions">
        <button
          disabled={!isReady}
          onClick={() => dispatch({ type: "CRAFTING/CLAIM_CRAFT", payload: { station } })}
          className="hl-btn hl-btn--sm hl-btn--go"
          aria-label={`Claim ${itemName}`}
        >Claim</button>
        {!isReady && (
          <button
            disabled={(gems ?? 0) < 1}
            onClick={() => dispatch({ type: "CRAFTING/SKIP_CRAFT", payload: { station } })}
            title={(gems ?? 0) < 1 ? "Need a gem to skip" : "Spend a gem to finish now"}
            className="hl-btn hl-btn--sm hl-btn--ghost"
            aria-label={`Skip ${itemName} with a gem`}
          >
            <span className="inline-flex items-center gap-1"><Icon iconKey="craft_queue_skip" size={12} /> Skip <DesignIcon iconKey="design.currency.gem" size={10} /></span>
          </button>
        )}
      </div>
      {tail.length > 0 && (
        <div className="craft-strip-upnext" aria-label={`${tail.length} more in queue`}>
          <span className="craft-strip-upnext-label">Next</span>
          {visibleTail.map((entry: CraftQueueEntry, i: number) => (
            <span
              key={`${entry.key}-${entry.queuedAt}-${i}`}
              className="craft-strip-upnext-chip"
              title={recipeMap[entry.key]?.item ? itemMap[recipeMap[entry.key]!.item]?.label : entry.key}
            >
              <Icon iconKey={recipeMap[entry.key]?.item ?? entry.key} size={20} />
            </span>
          ))}
          {tailOverflow > 0 && (
            <span className="craft-strip-upnext-more">+{tailOverflow}</span>
          )}
        </div>
      )}
    </div>
  );
}

interface StationTabIndicatorProps {
  queue: CraftQueueEntry[] | undefined;
  now: number;
}

// Per-tab queue indicator: a small badge (count + ready-dot) plus a 2px
// progress hair anchored to the bottom of the tab.
function StationTabIndicator({ queue, now }: StationTabIndicatorProps) {
  if (!queue || queue.length === 0) return null;
  const head = queue[0];
  const { pct, isReady } = entryProgress(head, now);
  return (
    <>
      <span
        className={`craft-tab-badge ${isReady ? "craft-tab-badge--ready" : ""}`}
        aria-label={`${queue.length} queued${isReady ? ", one ready" : ""}`}
      >
        <span className="craft-tab-badge-dot" />
        <span className="craft-tab-badge-count tabular-nums">{queue.length}</span>
      </span>
      <span className="craft-tab-hair" style={{ width: `${Math.round(pct * 100)}%` }} aria-hidden="true" />
    </>
  );
}

function canAffordDecor(decor: DecorDef, state: GameState): boolean {
  const { cost } = decor;
  if ((state.coins ?? 0) < (cost.coins ?? 0)) return false;
  const inv: Record<string, number> = state.inventory ?? {};
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
  const inv: Record<string, number> = state.inventory ?? {};
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
  const inventory: Record<string, number> = state.inventory ?? {};
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

  const craftQueues: Record<string, CraftQueueEntry[]> = state.craftQueues ?? {};
  const activeStationQueue = craftQueues[activeTab] ?? [];
  const hasAnyQueue = Object.values(craftQueues).some((q) => !!q && q.length > 0);

  // Single 1s ticker shared by the strip + every tab indicator. Paused
  // entirely when nothing is queued.
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (!hasAnyQueue) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [hasAnyQueue]);

  return (
    <FeaturePanel>
      {/* Station tabs with per-station queue indicator */}
      <FeaturePanel.Tabs className="!flex-nowrap overflow-x-auto">
        {STATION_ORDER.map((s) => {
          const m = STATION_META[s];
          const isActive = activeTab === s;
          const isBuilt = s === "decor" ? true : stationBuilt(built, s);
          const stationQueue = craftQueues[s] ?? [];
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
              <StationTabIndicator queue={stationQueue} now={now} />
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

      {/* Active station's queue strip (only when it has items) */}
      {activeTab !== "decor" && (
        <StationQueueStrip
          station={activeTab}
          queue={activeStationQueue}
          gems={state.gems}
          dispatch={dispatch}
          now={now}
        />
      )}

      {/* Content for active tab */}
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
